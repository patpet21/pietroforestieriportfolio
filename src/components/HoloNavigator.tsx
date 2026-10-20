import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Camera,CameraOff,Keyboard,Scan} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import AirKeyboard from './AirKeyboard';
import {AirTypingEngine} from '../lib/AirTypingEngine';
import type{AirFrame,AirSensitivity,AirTypingMode}from '../lib/AirTypingEngine';

type Landmark={x:number;y:number;z:number};
type Landmarker={detectForVideo:(video:HTMLVideoElement,time:number)=>{landmarks:Landmark[][]};close:()=>void};
type Status='off'|'loading'|'ready'|'preview'|'error';
type Cursor={x:number;y:number;progress:number;press:boolean};
type HandSample={landmarks:Landmark[];wrist:Landmark;palm:{x:number;y:number};open:boolean;pointing:boolean;spread:boolean};
type PalmScroll={armed:boolean;rawY:number;smoothedY:number;lastAt:number;velocity:number};
const newPalmScroll=():PalmScroll=>({armed:false,rawY:0,smoothedY:0,lastAt:0,velocity:0});
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const HAND_BONES:number[][]=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function paintHandSkeleton(canvas:HTMLCanvasElement|null,video:HTMLVideoElement,hands:Landmark[][]){
 if(!canvas)return;
 const w=canvas.clientWidth,h=canvas.clientHeight;
 if(!w||!h||!video.videoWidth||!video.videoHeight)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const scale=Math.max(w/video.videoWidth,h/video.videoHeight),ox=(w-video.videoWidth*scale)/2,oy=(h-video.videoHeight*scale)/2;
 const pos=(p:Landmark)=>({x:ox+(1-p.x)*video.videoWidth*scale,y:oy+p.y*video.videoHeight*scale});
 hands.forEach((hand,handIndex)=>{
  if(hand.length<21)return;
  const color=handIndex?'#ffce94':'#81f4d5';
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.5,w/150);ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=5;
  for(const [a,b] of HAND_BONES){const u=pos(hand[a]),v=pos(hand[b]);ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke();}
  ctx.shadowBlur=0;
  hand.forEach((p,i)=>{const u=pos(p),tip=[4,8,12,16,20].includes(i);ctx.beginPath();ctx.arc(u.x,u.y,tip?Math.max(3,w/75):Math.max(2,w/120),0,Math.PI*2);ctx.fillStyle=tip?'#fff':color;ctx.fill();});
 });
}
const CLICKABLE='a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[role="button"],[data-holo-key]';
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const dist=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const isEditable=(element:Element|null):element is HTMLInputElement|HTMLTextAreaElement=>
 (element instanceof HTMLInputElement&&['text','search','email','url','tel','number'].includes(element.type))||element instanceof HTMLTextAreaElement;
const nameOf=(el:HTMLElement)=>el.getAttribute('aria-label')||el.getAttribute('title')||el.getAttribute('placeholder')||el.getAttribute('name')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,33)||'SELECT';
/** Hit-target assistance for webcam pointing, where 10-25px of hand jitter is normal.
 * Direct hits always win; nearby hits are only a fallback and ignore blocked controls.
 */
function findGestureTarget(px:number,py:number,airKeyboard:boolean):HTMLElement|null{
 const valid=(el:Element|null):HTMLElement|null=>{
  const target=el?.closest<HTMLElement>(CLICKABLE)||null;
  if(!target||!target.isConnected||target.getAttribute('aria-disabled')==='true')return null;
  if(target.closest('.holo-natural-control')&&!target.closest('[data-holo-test]'))return null;
  if(airKeyboard&&!target.closest('[data-holo-key]'))return null;
  if(!airKeyboard&&target.closest('.holo-air-console'))return null;
  const rect=target.getBoundingClientRect();
  if(rect.width<4||rect.height<4)return null;
  return target;
 };
 const direct=valid(document.elementFromPoint(px,py));
 if(direct)return direct;
 const offsets=[[0,-18],[0,18],[-18,0],[18,0],[-26,-16],[26,-16],[-26,16],[26,16]];
 let nearest:HTMLElement|null=null,best=Infinity;
 for(const [dx,dy] of offsets){
  const x=clamp(px+dx,1,window.innerWidth-1),y=clamp(py+dy,1,window.innerHeight-1);
  const match=valid(document.elementFromPoint(x,y));
  if(!match)continue;
  const rect=match.getBoundingClientRect();
  const distPx=Math.hypot(Math.max(rect.left-px,0,px-rect.right),Math.max(rect.top-py,0,py-rect.bottom));
  if(distPx<best){best=distPx;nearest=match;}
 }
 return best<=30?nearest:null;
}
const extended=(points:Landmark[],tip:number,pip:number,mcp:number)=>{
 const a=points[tip],b=points[pip],c=points[mcp],w=points[0];
 return !!(a&&b&&c&&w&&dist(a,w)>dist(b,w)*1.11&&dist(a,c)>dist(b,c)*1.55);
};
function getHand(points:Landmark[]):HandSample|null{
 if(points.length<21||!points[0]||!points[8]||!points[9])return null;
 const n=[0,5,9,13,17].map(i=>points[i]);
 const palm={x:n.reduce((v,p)=>v+p.x,0)/n.length,y:n.reduce((v,p)=>v+p.y,0)/n.length};
 const fingers=[
  extended(points,8,6,5),
  extended(points,12,10,9),
  extended(points,16,14,13),
  extended(points,20,18,17)
 ];
 return {landmarks:points,wrist:points[0],palm,open:fingers.filter(Boolean).length>=3,pointing:fingers[0]&&!fingers[1]&&!fingers[2]&&!fingers[3],spread:fingers[0]&&fingers[1]&&!fingers[2]&&!fingers[3]};
}

export default function HoloNavigator(){
 const location=useLocation();
 const [status,setStatus]=useState<Status>('off');
 const [error,setError]=useState('');
 const [cameraPlaying,setCameraPlaying]=useState(false);
 const [cameraNeedsTap,setCameraNeedsTap]=useState(false);
 const mobileView=typeof window!=='undefined'&&window.matchMedia('(max-width:760px)').matches;
 const [cursor,setCursor]=useState<Cursor|null>(null);
 const [handCount,setHandCount]=useState(0);
 const [stateLabel,setStateLabel]=useState('SHOW YOUR HAND');
 const [pinchSignal,setPinchSignal]=useState('OPEN');
 const [targetName,setTargetName]=useState('');
 const [testClicks,setTestClicks]=useState(0);
 const [keyboard,setKeyboard]=useState(false);
 const [airFrame,setAirFrame]=useState<AirFrame>({fingers:[],presses:[],hands:0,calibrated:0,status:'ALIGN HANDS TO START'});
 const [airCalibrationMessage,setAirCalibrationMessage]=useState('Show both hands, relax your fingers, then press ALIGN HANDS.');
 const pendingAirCalibrationRef=useRef(false);
 const [airMode,setAirMode]=useState<AirTypingMode>('tap');
 const [airSensitivity,setAirSensitivity]=useState<AirSensitivity>('easy');
 const [airReach,setAirReach]=useState(1.3);
 const airModeRef=useRef<AirTypingMode>('tap');
 const airSensitivityRef=useRef<AirSensitivity>('easy');
 const airReachRef=useRef(1.3);
 const airEngineRef=useRef(new AirTypingEngine());
 const airKeysRef=useRef<HTMLDivElement|null>(null);
 const [scratch,setScratch]=useState('');
 const [backend,setBackend]=useState('');
 const [zoomLevel,setZoomLevel]=useState(1);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const pinchRef=useRef({down:false,candidate:false,frames:0});
 const clickLatchRef=useRef(false);
 const clickFeedbackRef=useRef({at:0,label:''});
 const palmScrollRef=useRef<PalmScroll>(newPalmScroll());
 const [scrollSpeed,setScrollSpeed]=useState(2);
 const scrollSpeedRef=useRef(2);
 const overlayRef=useRef<HTMLCanvasElement|null>(null);
 const [previewLarge,setPreviewLarge]=useState(false);
 const [mobilePanelExpanded,setMobilePanelExpanded]=useState(false);
 const streamRef=useRef<MediaStream|null>(null);
 const modelRef=useRef<Landmarker|null>(null);
 const rafRef=useRef(0);
 const tokenRef=useRef(0);
 const pointerRef=useRef({x:.5,y:.5,wristX:.5,wristY:.5,lastPoint:0});
 // Track both hands visually but use one persistent control hand to avoid
 // the second hand accidentally clicking, scrolling or typing.
 const controlHandRef=useRef<{x:number;y:number;at:number}|null>(null);
 const swipeRef=useRef({armed:false,active:false,anchorX:.5,anchorY:.5,lastY:.5,startFrames:0,stillFrames:0,direction:0,reverse:0});
 const zoomGestureRef=useRef({frames:0,active:false,baseGap:0,baseZoom:1,gap:0,missed:0});
 const zoomValueRef=useRef(1);
 const missedRef=useRef(0);
 const poseRef=useRef({kind:'idle',since:0});
 const scrollVelocityRef=useRef(0);
 const lastScrollAtRef=useRef(0);
 const pointerAimRef=useRef({x:.5,y:.5});
 const targetRef=useRef<HTMLElement|null>(null);
 const hoverRef=useRef({target:null as HTMLElement|null,since:0,fired:false});
 const tapRef=useRef({down:false,candidate:false,frames:0});
 const lastPressRef=useRef(0);
 const focusRef=useRef<HTMLInputElement|HTMLTextAreaElement|null>(null);
 const keyboardRef=useRef(false);
 const lastUiRef=useRef('');
 keyboardRef.current=keyboard;

 const setLabel=useCallback((value:string)=>{
  if(lastUiRef.current!==value){lastUiRef.current=value;setStateLabel(value);}
 },[]);
 const clearHover=useCallback(()=>{
  if(targetRef.current){targetRef.current.classList.remove('holo-focused-target');targetRef.current=null;}
  hoverRef.current={target:null,since:0,fired:false};
  setTargetName('');
 },[]);
 const stop=useCallback(()=>{
  tokenRef.current++;
  if(rafRef.current)cancelAnimationFrame(rafRef.current);
  rafRef.current=0;
  modelRef.current?.close();modelRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
  if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
  setCameraPlaying(false);setCameraNeedsTap(false);setMobilePanelExpanded(false);
  swipeRef.current={armed:false,active:false,anchorX:.5,anchorY:.5,lastY:.5,startFrames:0,stillFrames:0,direction:0,reverse:0};
  zoomGestureRef.current={frames:0,active:false,baseGap:0,baseZoom:1,gap:0,missed:0};
  zoomValueRef.current=1;setZoomLevel(1);
  document.documentElement.style.removeProperty('--spatial-site-zoom');
  tapRef.current={down:false,candidate:false,frames:0};
  pinchRef.current={down:false,candidate:false,frames:0};
  airEngineRef.current.clearCalibration();
  pendingAirCalibrationRef.current=false;
  setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'ALIGN HANDS TO START'});
  setAirCalibrationMessage('Show both hands, relax your fingers, then press ALIGN HANDS.');
  clickLatchRef.current=false;clickFeedbackRef.current={at:0,label:''};
  palmScrollRef.current=newPalmScroll();
  poseRef.current={kind:'idle',since:0};scrollVelocityRef.current=0;lastScrollAtRef.current=0;
  pointerAimRef.current={x:.5,y:.5};controlHandRef.current=null;
  clearHover();setCursor(null);setHandCount(0);setBackend('');setStatus('off');setPinchSignal('OPEN');
  setKeyboard(false);keyboardRef.current=false;setError('');setLabel('CAMERA OFF');
 },[clearHover,setLabel]);
 const stopRef=useRef(stop);stopRef.current=stop;
 useEffect(()=>{
  const competingCamera=()=>stopRef.current();
  window.addEventListener('pf-lab-camera-start',competingCamera);
  const onFocus=(event:Event)=>{
   const field=event.target as Element;
   if(isEditable(field)&&streamRef.current){
    // Focus alone must not open a floating gesture keyboard.
    focusRef.current=field;
   }
  };
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){
    if(keyboardRef.current){keyboardRef.current=false;setKeyboard(false);}
    else stopRef.current();
   }
  };
  document.addEventListener('focusin',onFocus);
  window.addEventListener('keydown',onKey);
  return()=>{
   window.removeEventListener('pf-lab-camera-start',competingCamera);
   document.removeEventListener('focusin',onFocus);
   window.removeEventListener('keydown',onKey);
   stopRef.current();
  };
 },[]);
 useEffect(()=>{
  clearHover();focusRef.current=null;
  keyboardRef.current=false;setKeyboard(false);
  airEngineRef.current.clearCalibration();pendingAirCalibrationRef.current=false;
  setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'ALIGN HANDS TO START'});
  swipeRef.current.armed=false;swipeRef.current.active=false;
  pinchRef.current={down:false,candidate:false,frames:0};
  clickLatchRef.current=false;
  palmScrollRef.current=newPalmScroll();
 },[location.pathname,clearHover]);

 const insertText=useCallback((value:string)=>{
  const field=focusRef.current;
  if(!field||!document.contains(field)){
   setScratch(old=>value==='CLEAR'?'':value==='BACK'?old.slice(0,-1):old+(value==='SPACE'?' ':value==='ENTER'?'\n':value));
   return;
  }
  // Never auto-submit forms with an air gesture.
  if(value==='ENTER'&&field instanceof HTMLInputElement)return;
  const old=field.value,start=field.selectionStart??old.length,end=field.selectionEnd??old.length;
  let next:string,at:number;
  if(value==='CLEAR'){next='';at=0;}
  else if(value==='BACK'){
   at=start===end?Math.max(0,start-1):start;
   next=old.slice(0,at)+old.slice(end);
  }else{
   const typed=value==='SPACE'?' ':value==='ENTER'?'\n':value;
   next=old.slice(0,start)+typed+old.slice(end);at=start+typed.length;
  }
  const proto=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(field,next);
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.focus({preventScroll:true});
  try{field.setSelectionRange(at,at);}catch{/* not every input type supports a caret */}
 },[]);
 const activate=useCallback((target:HTMLElement)=>{
  const key=target.closest<HTMLElement>('[data-holo-key]');
  if(key){insertText(key.dataset.holoKey||'');return;}
  if(target.closest('.holo-natural-control')&&!target.closest('[data-holo-test]'))return;
  if(isEditable(target)){
   focusRef.current=target;
   target.focus({preventScroll:true});
   // Keep native text input; enable air keyboard manually when wanted.
   return;
  }
  target.click();
 },[insertText]);
 const activateRef=useRef(activate);activateRef.current=activate;
 const resumeCamera=async()=>{
  const video=videoRef.current;
  if(!video?.srcObject)return;
  try{
   video.muted=true;video.playsInline=true;
   await video.play();
   setCameraPlaying(true);setCameraNeedsTap(false);
   setLabel('FRONT CAMERA READY');
  }catch{
   setCameraNeedsTap(true);setLabel('CAMERA BLOCKED · TRY MOBILE CHROME');
  }
 };
 const start=async()=>{
  if(status==='loading'||status==='ready')return;
  if(!navigator.mediaDevices?.getUserMedia){setError('Camera access requires HTTPS and a compatible browser.');setStatus('error');return;}
  window.dispatchEvent(new Event('pf-holo-enable'));
  const session=++tokenRef.current;
  setStatus('loading');setCameraPlaying(false);setCameraNeedsTap(false);setError('');setLabel('REQUESTING FRONT CAMERA');
  try{
   const mobile=window.matchMedia('(max-width: 760px)').matches;
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:mobile?480:960},height:{ideal:mobile?640:720},facingMode:'user'},audio:false});
   if(session!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   streamRef.current=stream;
   const video=videoRef.current;
   if(!video)throw Error('Camera preview unavailable');
   video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');
   video.srcObject=stream;
   setLabel('FRONT CAMERA CONNECTED · STARTING VIDEO');
   try{
    await video.play();
    if(session!==tokenRef.current)return;
    setCameraPlaying(true);
   }catch{
    if(session===tokenRef.current){
     setCameraNeedsTap(true);setLabel('TAP PLAY VIDEO TO CONTINUE');
    }
   }
   const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
   if(session!==tokenRef.current)return;
   const fileset=await FilesetResolver.forVisionTasks(WASM);
   if(session!==tokenRef.current)return;
   let landmarker:Landmarker,cpu=false;
   try{
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:mobile?1:2,minHandDetectionConfidence:.50,minHandPresenceConfidence:.50,minTrackingConfidence:.52}) as Landmarker;
   }catch{
    cpu=true;
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:mobile?1:2,minHandDetectionConfidence:.50,minHandPresenceConfidence:.50,minTrackingConfidence:.52}) as Landmarker;
   }
   if(session!==tokenRef.current){landmarker.close();return;}
   modelRef.current=landmarker;setBackend(cpu?'CPU':'GPU');
   if(mobile)setMobilePanelExpanded(false);
   setStatus('ready');
   swipeRef.current.armed=false;swipeRef.current.active=false;missedRef.current=0;
   setLabel('PALM: SCROLL · INDEX: AIM · PINCH: CLICK');
   let lastFrame=0,lastVideo=-1,lastCount=-1;
   const tick=(now:number)=>{
    if(session!==tokenRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden||now-lastFrame<(mobile?(cpu?150:105):(cpu?68:47))||!video.videoWidth||video.currentTime===lastVideo)return;
    lastFrame=now;lastVideo=video.currentTime;
    try{
     const landmarks=landmarker.detectForVideo(video,now).landmarks||[];
     paintHandSkeleton(overlayRef.current,video,landmarks);
     const samples=landmarks.map(getHand).filter((item):item is HandSample=>!!item);
     if(samples.length!==lastCount){lastCount=samples.length;setHandCount(samples.length);}
     if(!samples.length){
      missedRef.current++;
      if(keyboardRef.current&&missedRef.current>=3){
       airEngineRef.current.reset();
       setAirFrame({fingers:[],presses:[],hands:0,calibrated:airEngineRef.current.calibratedHands(),status:'SHOW YOUR HANDS'});
      }
      // Preserve pinch state through brief tracking gaps; reset after sustained loss.
      if(missedRef.current<3)return;
      pinchRef.current={down:false,candidate:false,frames:0};
      clickLatchRef.current=false;
      palmScrollRef.current=newPalmScroll();
      controlHandRef.current=null;
      swipeRef.current.armed=false;swipeRef.current.active=false;
      zoomGestureRef.current.active=false;zoomGestureRef.current.frames=0;
      tapRef.current={down:false,candidate:false,frames:0};
      if(targetRef.current)clearHover();
      setCursor(null);setPinchSignal('NO HAND');setLabel('SHOW YOUR INDEX FINGER');return;
     }
     missedRef.current=0;
     if(keyboardRef.current){
      // Exclusive keyboard mode: all fingertips from BOTH tracked hands.
      // The existing navigator is suspended while air typing is active.
      // Compute keyboard geometry ONCE per camera frame, not 10 times.
      // This avoids repeated layout work when all ten fingertips are tracked.
      const root=airKeysRef.current;
      const box=root?.getBoundingClientRect();
      const keyBoxes=root?Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-holo-key]')).map(button=>({
       key:button.dataset.holoKey||'',rect:button.getBoundingClientRect()
      })):[];
      const keyAt=(nx:number,ny:number):string|null=>{
       if(!box||!box.width||!box.height)return null;
       const px=box.left+nx*box.width,py=box.top+ny*box.height;
       if(px<box.left||px>box.right||py<box.top||py>box.bottom)return null;
       for(const item of keyBoxes){
        const rect=item.rect;
        if(px>=rect.left&&px<=rect.right&&py>=rect.top&&py<=rect.bottom)return item.key;
       }
       return null;
      };
      if(pendingAirCalibrationRef.current){
       pendingAirCalibrationRef.current=false;
       const homeAt=(key:string):{x:number;y:number}|null=>{
        if(!box||!box.width||!box.height)return null;
        const found=keyBoxes.find(item=>item.key===key);
        if(!found)return null;
        const r=found.rect;
        return {x:(r.left+r.width/2-box.left)/box.width,y:(r.top+r.height/2-box.top)/box.height};
       };
       const result=airEngineRef.current.calibrate(samples,homeAt);
       setAirCalibrationMessage(result.message);
       if(result.ok){
        clickLatchRef.current=false;
        setLabel('AIR TYPE · '+result.message);
       }
      }
      const frame=airEngineRef.current.process(samples,keyAt,now,{
       reach:airReachRef.current,mode:airModeRef.current,sensitivity:airSensitivityRef.current
      });
      setAirFrame(frame);
      if(frame.presses.length){
       for(const press of frame.presses)insertText(press.key);
       setLabel('AIR TYPED · '+frame.presses.map(p=>p.key).join(' '));
      }else setLabel(frame.status+' · '+airModeRef.current.toUpperCase());
      if(targetRef.current)clearHover();
      setCursor(null);
      return;
     }
     // One stable control hand; the webcam overlay still renders BOTH hands.
     // The same hand drives pointer, press, zoom and scroll.
     const lastControl=controlHandRef.current;
     const byDistance=samples.slice().sort((a,b)=>{
      const da=lastControl?Math.hypot(a.wrist.x-lastControl.x,a.wrist.y-lastControl.y):Math.hypot(a.wrist.x-.5,a.wrist.y-.5);
      const db=lastControl?Math.hypot(b.wrist.x-lastControl.x,b.wrist.y-lastControl.y):Math.hypot(b.wrist.x-.5,b.wrist.y-.5);
      return da-db;
     });
     const control=lastControl?byDistance[0]:(samples.find(hand=>hand.pointing)||byDistance[0]);
     if(lastControl&&now-lastControl.at<700&&Math.hypot(control.wrist.x-lastControl.x,control.wrist.y-lastControl.y)>.28){
      setLabel('CONTROL HAND LOST · KEEP ONE HAND IN VIEW');
      setCursor(null);return;
     }
     controlHandRef.current={x:control.wrist.x,y:control.wrist.y,at:now};
     const actionHands=[control];
     // Two-finger V gesture: spread index + middle to zoom the site's content.
     // A short pose debounce avoids resizing when passing through an intermediate hand shape.
     // Recognize explicit press gestures BEFORE palm/zoom classification.
     // Pinching or bending the index can otherwise appear as an open palm and block clicks.
     // Aimed controls stay eligible while fingers transition into a pinch.
     const pressHand=actionHands.find(item=>{
      const h=item.landmarks;
      const gap=dist(h[4],h[8])/Math.max(.065,dist(h[5],h[17]));
      return gap<(pinchRef.current.down ? .88 : .62);
     });
     const spread=pressHand?null:actionHands.find(item=>item.spread);
     const rawPose=pressHand?'press':spread?'zoom':actionHands.some(item=>item.open)?'scroll':actionHands.some(item=>item.pointing)?'point':'idle';
     if(poseRef.current.kind!==rawPose)poseRef.current={kind:rawPose,since:now};
     const poseStable=now-poseRef.current.since>=160;
     const zg=zoomGestureRef.current;
     if(spread&&!keyboardRef.current&&poseStable&&!mobile){
      const fingerGap=dist(spread.landmarks[8],spread.landmarks[12]);
      const width=Math.max(.04,dist(spread.landmarks[5],spread.landmarks[17]));
      const gap=clamp(fingerGap/width,.15,2.8);
      zg.missed=0;zg.frames++;
      if(zg.frames>=4){
       if(!zg.active){
        zg.active=true;zg.baseGap=gap;zg.gap=gap;zg.baseZoom=zoomValueRef.current;
        if(targetRef.current)clearHover();
       }
       zg.gap=zg.gap*.65+gap*.35;
       const scale=clamp(zg.baseZoom*(zg.gap/Math.max(.15,zg.baseGap)),.85,1.4);
       if(Math.abs(scale-zoomValueRef.current)>=.015){
        zoomValueRef.current=scale;
        document.documentElement.style.setProperty('--spatial-site-zoom',scale.toFixed(3));
        setZoomLevel(scale);
       }
       swipeRef.current.active=false;swipeRef.current.armed=false;
       tapRef.current={down:false,candidate:false,frames:0};
       setCursor(null);setLabel('TWO FINGERS · ZOOM '+Math.round(zoomValueRef.current*100)+'%');
       return;
      }
     }else if(zg.active&&zg.missed<2&&!pressHand){
      zg.missed++;return; // tolerate brief classification dropouts
     }else{
      zg.active=false;zg.frames=0;zg.missed=0;
     }
     // Separate the open-palm scroll state from index-based pointing and clicking.
     const palm=pressHand||actionHands.some(item=>item.pointing)?null:actionHands.find(item=>item.open&&!item.spread);
     if(palm&&rawPose==='scroll'&&!keyboardRef.current){
      const scroll=palmScrollRef.current,y=clamp(palm.palm.y,0,1);
      if(!poseStable){
       // A transient open pose is not yet scroll: preserve the focused click target.
       palmScrollRef.current=newPalmScroll();
       setLabel('OPEN PALM · HOLD TO SCROLL');return;
      }
      if(!scroll.armed){
       scroll.armed=true;scroll.rawY=y;scroll.smoothedY=y;scroll.lastAt=now;scroll.velocity=0;
      }else{
       const jump=Math.abs(y-scroll.rawY)>.16||now-scroll.lastAt>320;
       const previous=scroll.smoothedY;
       scroll.smoothedY=previous*.35+y*.65;scroll.rawY=y;
       const elapsed=clamp(now-scroll.lastAt,25,110);scroll.lastAt=now;
       if(jump){scroll.velocity=0;scroll.smoothedY=y;}
       else{
        const raw=-((scroll.smoothedY-previous)*window.innerHeight*2.8*scrollSpeedRef.current);
        const desired=Math.abs(raw)>1.6?clamp(raw,-120,120):0;
        scroll.velocity=scroll.velocity*.28+desired*.72;
        const amount=scroll.velocity*(elapsed/50);
        if(Math.abs(amount)>1.3)window.scrollBy({top:amount,left:0,behavior:'instant'});
       }
      }
      if(targetRef.current)clearHover();setCursor(null);
      tapRef.current={down:false,candidate:false,frames:0};
      pinchRef.current={down:false,candidate:false,frames:0};
      setLabel('OPEN PALM · SMOOTH SCROLL');return;
     }
     palmScrollRef.current=newPalmScroll();
     const candidates=pressHand?[pressHand]:actionHands.filter(item=>!item.open&&!item.spread);
     const pointer=candidates.sort((a,b)=>{
      const previous=pointerRef.current;
      const d1=Math.hypot(1-a.wrist.x-previous.wristX,a.wrist.y-previous.wristY);
      const d2=Math.hypot(1-b.wrist.x-previous.wristX,b.wrist.y-previous.wristY);
      return d1-d2;
     })[0];
     if(!pointer){
      swipeRef.current.armed=false;swipeRef.current.active=false;
      tapRef.current={down:false,candidate:false,frames:0};
      pinchRef.current={down:false,candidate:false,frames:0};
      clickLatchRef.current=false;
      // A different temporary pose should not discard the selected button.
      setCursor(null);setLabel('INDEX = AIM · PALM = SCROLL');
      return;
     }
     const tip=pointer.landmarks[8],thumb=pointer.landmarks[4];
     if(!tip||!thumb)return;
     const p=pointerRef.current;
     const wristJump=Math.hypot(1-pointer.wrist.x-p.wristX,pointer.wrist.y-p.wristY);
     if(wristJump>.32){
      swipeRef.current.armed=false;swipeRef.current.active=false;
      tapRef.current={down:false,candidate:false,frames:0};
      if(!pressHand&&now-p.lastPoint>750)clearHover();
     }
     const rawX=clamp((1-tip.x-.5)*1.48+.5,0,1);
     const rawY=clamp((tip.y-.5)*1.48+.5,0,1);
     // Temporal smoothing makes a slight hand tremor move the cursor only slightly.
     const motion=Math.hypot(rawX-p.x,rawY-p.y);
     const smoothing=motion<.015?.24:motion<.055?.47:.7;
     const x=p.x=p.x*(1-smoothing)+rawX*smoothing;
     const y=p.y=p.y*(1-smoothing)+rawY*smoothing;
     p.wristX=1-pointer.wrist.x;p.wristY=pointer.wrist.y;
     // Explicit pinch click: thumb and index touch, then separate.
     const pinch=pinchRef.current;
     const ratio=dist(tip,thumb)/Math.max(.065,dist(pointer.landmarks[5],pointer.landmarks[17]));
     const close=pinch.down?ratio<.88:ratio<.62;
     if(close!==pinch.candidate){pinch.candidate=close;pinch.frames=1;}else pinch.frames++;
     const pinching=pinch.frames>=2?close:pinch.down;
     const pinchStarted=pinching&&!pinch.down;pinch.down=pinching;
     const pressing=pinching;
     setPinchSignal(pinching?'CLOSED':close?'CLOSING':'OPEN');
     // Keep the last real target while the hand moves into a pinch/tap pose.
     // Crucially, this also applies to the FIRST press-candidate frame.
     const pendingPress=close||pressing;
     // Re-arm on release BEFORE any return. This was previously skipped when
     // the relaxed hand was not classified as a pointing index.
     if(!pendingPress)clickLatchRef.current=false;
     // The last aim must stay fresh even when the preliminary pinch detector
     // sees a near-closed thumb while the index is still pointing.
     if(pointer.pointing&&!pendingPress){p.lastPoint=now;pointerAimRef.current={x,y};}
     const aimFresh=now-p.lastPoint<3000&&!!targetRef.current;
     const eligible=pointer.pointing||(pendingPress&&aimFresh);
     if(!eligible){
      if(!pendingPress&&targetRef.current&&now-p.lastPoint>850)clearHover();
      setCursor(null);setLabel(pendingPress?'PINCH DETECTED · POINT AT A BUTTON':'EXTEND INDEX TO AIM · PALM TO SCROLL');return;
     }
     const pointX=pendingPress&&aimFresh?pointerAimRef.current.x:x;
     const pointY=pendingPress&&aimFresh?pointerAimRef.current.y:y;
     const px=pointX*window.innerWidth,py=pointY*window.innerHeight;
     let target=pendingPress&&aimFresh&&targetRef.current&&document.contains(targetRef.current)
      ?targetRef.current
      :findGestureTarget(px,py,keyboardRef.current);
     if(targetRef.current&&target!==targetRef.current){
      const rect=targetRef.current.getBoundingClientRect();
      if(px>=rect.left-12&&px<=rect.right+12&&py>=rect.top-12&&py<=rect.bottom+12)target=targetRef.current;
     }
     if(target!==targetRef.current){
      targetRef.current?.classList.remove('holo-focused-target');
      targetRef.current=target;
      if(target)target.classList.add('holo-focused-target');
      hoverRef.current={target,since:now,fired:false};
       setTargetName(target?nameOf(target):'');
     }
     const ready=!!target;
     // A click is an explicit pinch / index-tap edge, never a dwell countdown.
     // Both gestures share one latch, preventing double-click when a pinch also bends the index.
     // Pinch-only air typing on a stable key; finger bends were producing nonsense text.
     const allowedTarget=target;
     const clickedNow=pinchStarted&&!clickLatchRef.current;
     if(clickedNow){
      if(allowedTarget&&now-lastPressRef.current>260){
       clickLatchRef.current=true;
       lastPressRef.current=now;
       clickFeedbackRef.current={at:now,label:'CLICK ✓ '+nameOf(allowedTarget)};
       activateRef.current(allowedTarget);
      }else{
       clickFeedbackRef.current={
        at:now,
        label:target?'PINCH DETECTED · RELEASE AND TRY AGAIN':'PINCH DETECTED · AIM AT A BUTTON'
       };
      }
     }
     // Click latch release is handled above even if pointer eligibility fails.
     if(now-clickFeedbackRef.current.at<650&&clickFeedbackRef.current.label){
      setLabel(clickFeedbackRef.current.label);
     }else{
      setLabel(pendingPress?'PINCH · TOUCH THUMB AND INDEX':'INDEX · AIM AT A LINK OR BUTTON');
     }
     setCursor({x:pointX,y:pointY,progress:ready?1:0,press:pressing});
    }catch(e){console.warn('Gesture frame skipped:',e);}
   };
   rafRef.current=requestAnimationFrame(tick);
  }catch(e){
   if(session!==tokenRef.current)return;
   const hasStream=!!streamRef.current?.getVideoTracks().some(track=>track.readyState==='live');
   const name=e instanceof DOMException?e.name:'';
   if(hasStream){
    modelRef.current?.close();modelRef.current=null;
    setStatus('preview');
    setError('Front camera connected, but hand tracking failed to load. Stop the camera and retry in Chrome.');
    setLabel('CAMERA ON · TRACKER UNAVAILABLE');
   }else{
    stop();setStatus('error');
    setError(name==='NotAllowedError'?'Camera permission denied. Allow camera access in your browser.':name==='NotFoundError'?'No camera found.':name==='NotReadableError'?'Camera in use by another app. Close that app and retry.':e instanceof Error?e.message:'Unable to start camera.');
   }
  }
 };

 const mobileCompact=mobileView&&status==='ready'&&!mobilePanelExpanded;
 const mobileIdle=mobileView&&status==='off';
 return <>
  <aside className={"holo-natural-control "+(previewLarge?"holo-expanded":"")+(mobileCompact?" holo-mobile-compact":"")+(mobileIdle?" holo-mobile-idle":"")} aria-label="Natural gesture control">
   <div className="holo-natural-title">
    <Scan size={17}/><strong>{mobileCompact?('GESTURES ON · '+handCount+' HAND'):('SPATIAL CONTROL'+(mobileView?' · MOBILE':''))}</strong>
    {status==='ready'&&<i/>}
    {mobileView&&status==='ready'
      ?<button type="button" className="holo-preview-toggle" onClick={()=>setMobilePanelExpanded(v=>!v)} aria-label={mobilePanelExpanded?'Hide gesture camera and controls':'Show gesture camera and controls'}>{mobilePanelExpanded?'HIDE':'CAMERA'}</button>
      :(status==='ready'||status==='preview')&&<button type="button" className="holo-preview-toggle" onClick={()=>setPreviewLarge(v=>!v)} aria-label={previewLarge?'Reduce hand preview':'Enlarge hand preview'}>{previewLarge?'SMALL −':'ENLARGE +'}</button>}
    {mobileView&&(status==='ready'||status==='preview')&&<button type="button" className="holo-mobile-stop-title" onClick={stop} aria-label="Stop mobile camera"><CameraOff size={15}/></button>}
   </div>
   <div className={'holo-vision-preview '+(['ready','loading','preview'].includes(status)?'on ':'')+(cameraPlaying?'playing':'')}>
    <video ref={videoRef} muted playsInline autoPlay onPlaying={()=>{setCameraPlaying(true);setCameraNeedsTap(false);}} onPause={()=>setCameraPlaying(false)}
     className={'holo-natural-preview '+(['ready','loading','preview'].includes(status)?'on':'')} aria-label="Live front-camera preview"/>
    <canvas ref={overlayRef} className="holo-hand-overlay" aria-hidden="true"/>
    {!cameraPlaying&&<div className="holo-camera-placeholder" role="status">
      <Camera size={21}/>
      <strong>{status==='off'?'CAMERA OFF':status==='error'?'CAMERA UNAVAILABLE':status==='loading'?'CONNECTING FRONT CAMERA':'WAITING FOR VIDEO'}</strong>
      <small>{status==='loading'?'Allow camera access when asked.':status==='error'?'Check browser camera permission.':'Tap ENABLE GESTURES to start.'}</small>
    </div>}
    {(cameraNeedsTap||(!cameraPlaying&&(status==='ready'||status==='preview')))&&<button type="button" className="holo-camera-resume" onClick={resumeCamera}>▶ PLAY CAMERA VIDEO</button>}
    {cameraPlaying&&<span className="holo-vision-chip">{status==='ready'?'21 LANDMARKS · LIVE':'FRONT CAMERA · LIVE'}</span>}
   </div>
   {status==='loading'&&<p className="holo-camera-progress" role="status">Connecting camera and loading hand tracking…</p>}
   {status==='ready'?<>
    <div className="holo-natural-status"><span>{handCount} {handCount===1?'HAND':'HANDS'} · 1 CONTROL · {backend} · ZOOM {Math.round(zoomLevel*100)}%</span><span>{stateLabel}</span><span className="holo-target-readout">TARGET: {targetName||'— AIM AT A BUTTON'}</span><span className="holo-pinch-readout">PINCH: <b>{pinchSignal}</b></span></div>
    <button type="button" data-holo-test className="holo-gesture-test" onClick={()=>{setTestClicks(n=>n+1);setLabel('TEST CLICK ✓ · ACTIVATED');}}>TEST GESTURE CLICK <strong>{testClicks?('✓ '+testClicks):'↗'}</strong></button>
    {!mobileView?<button type="button" className={'holo-air-toggle '+(keyboard?'active':'')} onClick={()=>{
     keyboardRef.current=!keyboardRef.current;setKeyboard(keyboardRef.current);
     airEngineRef.current.reset();setAirFrame({fingers:[],presses:[],hands:0,calibrated:airEngineRef.current.calibratedHands(),status:'SHOW YOUR HANDS'});
     controlHandRef.current=null;poseRef.current={kind:'idle',since:0};
     clearHover();pinchRef.current={down:false,candidate:false,frames:0};
     tapRef.current={down:false,candidate:false,frames:0};clickLatchRef.current=false;
     setLabel(keyboardRef.current?'AIR KEYBOARD ON · AIM THEN PINCH':'AIR KEYBOARD OFF');
    }}><Keyboard size={15}/>{keyboard?'CLOSE AIR KEYBOARD':'OPEN AIR KEYBOARD'}</button>:<p className="holo-mobile-note">MOBILE MODE: one hand for scrolling and pointing. Ten-finger Air Type requires desktop.</p>}
    <button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA</button>
   </>:status==='preview'?<button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA · RETRY AFTER</button>
   :status==='loading'?<button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> CANCEL CAMERA START</button>
   :<button type="button" className="holo-natural-start" onClick={start}><Camera size={16}/> ENABLE GESTURES</button>}
   {(status==='error'||status==='preview')&&<p className="holo-natural-error" role="alert">{error}</p>}
   {status==='error'&&<p className="holo-mobile-note">If you are opening the site inside an app, try opening it directly in Chrome or Safari and allow camera permission.</p>}
   {status==='ready'&&<label className="holo-scroll-config"><span>SCROLL RESPONSE <strong>{scrollSpeed.toFixed(1)}×</strong></span><input type="range" aria-label="Gesture scroll speed" min=".7" max="4" step=".1" value={scrollSpeed} onChange={e=>{const v=Number(e.target.value);scrollSpeedRef.current=v;setScrollSpeed(v);}}/></label>}
   <p className="holo-natural-legend">{mobileView?'MOBILE · OPEN PALM: SCROLL · INDEX + THUMB: CLICK. HOLD PHONE STEADY.':'CLICK = AIM WITH INDEX → TOUCH THUMB + INDEX → RELEASE. OPEN PALM = SCROLL. V = ZOOM.'}</p>
   <p className="holo-natural-privacy">Camera runs only when enabled. Tracking runs on-device; external MediaPipe resources and SDK usage metrics may be requested.</p>
  </aside>
  {status==='ready'&&cursor&&<div className={'holo-gesture-pointer '+(cursor.press?'pressed':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%','--holo-progress':(cursor.progress*360)+'deg'} as CSSProperties} aria-hidden="true"><i/>{targetName&&<small>{targetName}</small>}</div>}
  {status==='ready'&&keyboard&&<AirKeyboard
   keysRef={airKeysRef}
   fingers={airFrame.fingers}
   hands={airFrame.hands}
   status={airFrame.status}
   calibrationMessage={airCalibrationMessage}
   text={focusRef.current&&document.contains(focusRef.current)?focusRef.current.value.slice(-110):scratch.slice(-110)}
   mode={airMode}
   sensitivity={airSensitivity}
   reach={airReach}
   onMode={v=>{airModeRef.current=v;setAirMode(v);airEngineRef.current.reset();}}
   onSensitivity={v=>{airSensitivityRef.current=v;setAirSensitivity(v);airEngineRef.current.reset();}}
   onReach={v=>{airReachRef.current=v;setAirReach(v);airEngineRef.current.reset();}}
   onCalibrate={()=>{pendingAirCalibrationRef.current=true;setAirCalibrationMessage('Hold hands steady in a relaxed typing position…');}}
   onClose={()=>{keyboardRef.current=false;setKeyboard(false);airEngineRef.current.reset();controlHandRef.current=null;clearHover();}}
   onKey={insertText}
  />}
 </>;
}

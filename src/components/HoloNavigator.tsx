import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Camera,CameraOff,Hand,Keyboard,Scan,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';

type Landmark={x:number;y:number;z:number};
type Landmarker={detectForVideo:(video:HTMLVideoElement,time:number)=>{landmarks:Landmark[][]};close:()=>void};
type Status='off'|'loading'|'ready'|'error';
type Cursor={x:number;y:number;progress:number;press:boolean};
type HandSample={landmarks:Landmark[];wrist:Landmark;palm:{x:number;y:number};open:boolean;pointing:boolean;spread:boolean};
type PalmScroll={armed:boolean;rawY:number;smoothedY:number;lastAt:number;velocity:number};
const newPalmScroll=():PalmScroll=>({armed:false,rawY:0,smoothedY:0,lastAt:0,velocity:0});
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const ROWS=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
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
const nameOf=(el:HTMLElement)=>el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,33)||'SELECT';
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
 const [cursor,setCursor]=useState<Cursor|null>(null);
 const [handCount,setHandCount]=useState(0);
 const [stateLabel,setStateLabel]=useState('SHOW YOUR HAND');
 const [targetName,setTargetName]=useState('');
 const [keyboard,setKeyboard]=useState(false);
 const [hoverKey,setHoverKey]=useState('');
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
 const streamRef=useRef<MediaStream|null>(null);
 const modelRef=useRef<Landmarker|null>(null);
 const rafRef=useRef(0);
 const tokenRef=useRef(0);
 const pointerRef=useRef({x:.5,y:.5,wristX:.5,wristY:.5,lastPoint:0});
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
  setHoverKey('');
  setTargetName('');
 },[]);
 const stop=useCallback(()=>{
  tokenRef.current++;
  if(rafRef.current)cancelAnimationFrame(rafRef.current);
  rafRef.current=0;
  modelRef.current?.close();modelRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
  if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
  swipeRef.current={armed:false,active:false,anchorX:.5,anchorY:.5,lastY:.5,startFrames:0,stillFrames:0,direction:0,reverse:0};
  zoomGestureRef.current={frames:0,active:false,baseGap:0,baseZoom:1,gap:0,missed:0};
  zoomValueRef.current=1;setZoomLevel(1);
  document.documentElement.style.removeProperty('--spatial-site-zoom');
  tapRef.current={down:false,candidate:false,frames:0};
  pinchRef.current={down:false,candidate:false,frames:0};
  clickLatchRef.current=false;clickFeedbackRef.current={at:0,label:''};
  palmScrollRef.current=newPalmScroll();
  poseRef.current={kind:'idle',since:0};scrollVelocityRef.current=0;lastScrollAtRef.current=0;
  pointerAimRef.current={x:.5,y:.5};
  clearHover();setCursor(null);setHandCount(0);setBackend('');setStatus('off');
  setKeyboard(false);keyboardRef.current=false;setError('');setLabel('CAMERA OFF');
 },[clearHover,setLabel]);
 const stopRef=useRef(stop);stopRef.current=stop;
 useEffect(()=>{
  const competingCamera=()=>stopRef.current();
  window.addEventListener('pf-lab-camera-start',competingCamera);
  const onFocus=(event:Event)=>{
   const field=event.target as Element;
   if(isEditable(field)&&streamRef.current){
    focusRef.current=field;keyboardRef.current=true;setKeyboard(true);
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
  swipeRef.current.armed=false;swipeRef.current.active=false;
  pinchRef.current={down:false,candidate:false,frames:0};
  clickLatchRef.current=false;
  palmScrollRef.current=newPalmScroll();
 },[location.pathname,clearHover]);

 const insertText=useCallback((value:string)=>{
  const field=focusRef.current;
  if(!field||!document.contains(field)){
   setScratch(old=>value==='CLEAR'?'':value==='BACK'?old.slice(0,-1):old+(value==='SPACE'?' ':value));
   return;
  }
  const old=field.value,start=field.selectionStart??old.length,end=field.selectionEnd??old.length;
  let next:string,at:number;
  if(value==='CLEAR'){next='';at=0;}
  else if(value==='BACK'){
   at=start===end?Math.max(0,start-1):start;
   next=old.slice(0,at)+old.slice(end);
  }else{
   const typed=value==='SPACE'?' ':value;
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
  if(target.closest('.holo-natural-control'))return;
  if(isEditable(target)){
   focusRef.current=target;
   target.focus({preventScroll:true});
   keyboardRef.current=true;setKeyboard(true);
   return;
  }
  target.click();
 },[insertText]);
 const activateRef=useRef(activate);activateRef.current=activate;
 const start=async()=>{
  if(status==='loading'||status==='ready')return;
  if(!navigator.mediaDevices?.getUserMedia){setError('Camera access requires HTTPS and a compatible browser.');setStatus('error');return;}
  window.dispatchEvent(new Event('pf-holo-enable'));
  const session=++tokenRef.current;
  setStatus('loading');setError('');setLabel('STARTING CAMERA');
  try{
   const mobile=window.matchMedia('(max-width: 760px)').matches;
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:mobile?480:640},height:{ideal:mobile?640:480},facingMode:'user'},audio:false});
   if(session!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   streamRef.current=stream;
   const video=videoRef.current;
   if(!video)throw Error('Camera preview unavailable');
   video.srcObject=stream;await video.play();
   const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
   if(session!==tokenRef.current)return;
   const fileset=await FilesetResolver.forVisionTasks(WASM);
   if(session!==tokenRef.current)return;
   let landmarker:Landmarker,cpu=false;
   try{
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:mobile?1:2,minHandDetectionConfidence:.58,minTrackingConfidence:.62}) as Landmarker;
   }catch{
    cpu=true;
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:mobile?1:2,minHandDetectionConfidence:.58,minTrackingConfidence:.62}) as Landmarker;
   }
   if(session!==tokenRef.current){landmarker.close();return;}
   modelRef.current=landmarker;setBackend(cpu?'CPU':'GPU');setStatus('ready');
   swipeRef.current.armed=false;swipeRef.current.active=false;missedRef.current=0;
   setLabel('PALM: SCROLL · INDEX: AIM · PINCH: CLICK');
   let lastFrame=0,lastVideo=-1,lastCount=-1;
   const tick=(now:number)=>{
    if(session!==tokenRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden||now-lastFrame<(cpu?68:47)||!video.videoWidth||video.currentTime===lastVideo)return;
    lastFrame=now;lastVideo=video.currentTime;
    try{
     const landmarks=landmarker.detectForVideo(video,now).landmarks||[];
     paintHandSkeleton(overlayRef.current,video,landmarks);
     const samples=landmarks.map(getHand).filter((item):item is HandSample=>!!item);
     if(samples.length!==lastCount){lastCount=samples.length;setHandCount(samples.length);}
     if(!samples.length){
      missedRef.current++;
      // Preserve pinch state through brief tracking gaps; reset after sustained loss.
      if(missedRef.current<3)return;
      pinchRef.current={down:false,candidate:false,frames:0};
      clickLatchRef.current=false;
      palmScrollRef.current=newPalmScroll();
      swipeRef.current.armed=false;swipeRef.current.active=false;
      zoomGestureRef.current.active=false;zoomGestureRef.current.frames=0;
      tapRef.current={down:false,candidate:false,frames:0};
      if(targetRef.current)clearHover();
      setCursor(null);setLabel('SHOW YOUR INDEX FINGER');return;
     }
     missedRef.current=0;
     // Two-finger V gesture: spread index + middle to zoom the site's content.
     // A short pose debounce avoids resizing when passing through an intermediate hand shape.
     // Recognize explicit press gestures BEFORE palm/zoom classification.
     // Pinching or bending the index can otherwise appear as an open palm and block clicks.
     // Aimed controls stay eligible while fingers transition into a pinch.
     const recentAim=now-pointerRef.current.lastPoint<3000&&!!targetRef.current;
     const pressHand=samples.find(item=>{
      const h=item.landmarks;
      const gap=dist(h[4],h[8])/Math.max(.065,dist(h[5],h[17]));
      const bend=dist(h[8],h[5])/Math.max(.045,dist(h[6],h[5]));
      return gap<(pinchRef.current.down ? .78 : .61)||(recentAim&&bend<(tapRef.current.down ? 2.36 : 2.08));
     });
     const spread=pressHand?null:samples.find(item=>item.spread);
     const rawPose=pressHand?'press':spread?'zoom':samples.some(item=>item.open)?'scroll':samples.some(item=>item.pointing)?'point':'idle';
     if(poseRef.current.kind!==rawPose)poseRef.current={kind:rawPose,since:now};
     const poseStable=now-poseRef.current.since>=160;
     const zg=zoomGestureRef.current;
     if(spread&&!keyboardRef.current&&poseStable){
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
     const palm=pressHand||samples.some(item=>item.pointing)?null:samples.find(item=>item.open&&!item.spread);
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
     const candidates=pressHand?[pressHand]:samples.filter(item=>!item.open&&!item.spread);
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
     const tip=pointer.landmarks[8],joint=pointer.landmarks[6],base=pointer.landmarks[5],thumb=pointer.landmarks[4];
     if(!tip||!joint||!base||!thumb)return;
     const p=pointerRef.current;
     const wristJump=Math.hypot(1-pointer.wrist.x-p.wristX,pointer.wrist.y-p.wristY);
     if(wristJump>.32){
      swipeRef.current.armed=false;swipeRef.current.active=false;
      tapRef.current={down:false,candidate:false,frames:0};
      if(!pressHand&&now-p.lastPoint>500)clearHover();
     }
     const rawX=clamp((1-tip.x-.5)*1.48+.5,0,1);
     const rawY=clamp((tip.y-.5)*1.48+.5,0,1);
     // Temporal smoothing makes a slight hand tremor move the cursor only slightly.
     const motion=Math.hypot(rawX-p.x,rawY-p.y);
     const smoothing=motion<.015?.24:motion<.055?.47:.7;
     const x=p.x=p.x*(1-smoothing)+rawX*smoothing;
     const y=p.y=p.y*(1-smoothing)+rawY*smoothing;
     p.wristX=1-pointer.wrist.x;p.wristY=pointer.wrist.y;
     const curledRatio=dist(tip,base)/Math.max(.045,dist(joint,base));
     const tap=tapRef.current;
     const tapCandidate=tap.down?curledRatio<2.36:curledRatio<2.08;
     if(tap.candidate!==tapCandidate){tap.candidate=tapCandidate;tap.frames=1;}else tap.frames++;
     const down=tap.frames>=2?tapCandidate:tap.down;
     const tapStarted=down&&!tap.down;tap.down=down;
     const pinch=pinchRef.current;
     const ratio=dist(tip,thumb)/Math.max(.065,dist(pointer.landmarks[5],pointer.landmarks[17]));
     const close=pinch.down?ratio<.78:ratio<.61;
     if(close!==pinch.candidate){pinch.candidate=close;pinch.frames=1;}else pinch.frames++;
     const pinching=pinch.frames>=2?close:pinch.down;
     const pinchStarted=pinching&&!pinch.down;pinch.down=pinching;
     const pressing=down||pinching;
     // Keep the last real target while the hand moves into a pinch/tap pose.
     // Crucially, this also applies to the FIRST press-candidate frame.
     const pendingPress=close||tapCandidate||pressing;
     // Re-arm on release BEFORE any return. This was previously skipped when
     // the relaxed hand was not classified as a pointing index.
     if(!pendingPress)clickLatchRef.current=false;
     // The last aim must stay fresh even when the preliminary pinch detector
     // sees a near-closed thumb while the index is still pointing.
     if(pointer.pointing&&!pressing){p.lastPoint=now;pointerAimRef.current={x,y};}
     const aimFresh=now-p.lastPoint<3000&&!!targetRef.current;
     const eligible=pointer.pointing||(pendingPress&&aimFresh);
     if(!eligible){
      if(!pendingPress&&targetRef.current)clearHover();
      setCursor(null);setLabel(pendingPress?'PINCH DETECTED · POINT AT A BUTTON':'EXTEND INDEX TO AIM · PALM TO SCROLL');return;
     }
     const pointX=pendingPress&&aimFresh?pointerAimRef.current.x:x;
     const pointY=pendingPress&&aimFresh?pointerAimRef.current.y:y;
     const px=pointX*window.innerWidth,py=pointY*window.innerHeight;
     const element=document.elementFromPoint(px,py) as HTMLElement|null;
     let target=pendingPress&&aimFresh&&targetRef.current&&document.contains(targetRef.current)?targetRef.current:element?.closest<HTMLElement>(CLICKABLE)||null;
     if(target?.closest('.holo-natural-control')&&!target.closest('[data-holo-key]'))target=null;
     if(targetRef.current&&target!==targetRef.current){
      const rect=targetRef.current.getBoundingClientRect();
      if(px>=rect.left-12&&px<=rect.right+12&&py>=rect.top-12&&py<=rect.bottom+12)target=targetRef.current;
     }
     if(target!==targetRef.current){
      targetRef.current?.classList.remove('holo-focused-target');
      targetRef.current=target;
      if(target)target.classList.add('holo-focused-target');
      hoverRef.current={target,since:now,fired:false};
      setHoverKey(target?.dataset.holoKey||'');
      setTargetName(target?nameOf(target):'');
     }
     const ready=!!target;
     // A click is an explicit pinch / index-tap edge, never a dwell countdown.
     // Both gestures share one latch, preventing double-click when a pinch also bends the index.
     const clickedNow=(tapStarted||pinchStarted)&&!clickLatchRef.current;
     if(clickedNow){
      clickLatchRef.current=true;
      if(target&&now-lastPressRef.current>270){
       lastPressRef.current=now;
       clickFeedbackRef.current={at:now,label:'CLICK ✓ '+nameOf(target)};
       activateRef.current(target);
      }else{
       clickFeedbackRef.current={
        at:now,
        label:target?'GESTURE DETECTED · RELEASE TO CLICK AGAIN':'GESTURE DETECTED · AIM AT A BUTTON'
       };
      }
     }
     // Click latch release is handled above even if pointer eligibility fails.
     if(now-clickFeedbackRef.current.at<650&&clickFeedbackRef.current.label){
      setLabel(clickFeedbackRef.current.label);
     }else{
      setLabel(pendingPress?'PINCH / AIR TAP · CLICK':'INDEX · AIM AT A LINK OR BUTTON');
     }
     setCursor({x:pointX,y:pointY,progress:ready?1:0,press:pressing});
    }catch(e){console.warn('Gesture frame skipped:',e);}
   };
   rafRef.current=requestAnimationFrame(tick);
  }catch(e){
   if(session!==tokenRef.current)return;
   stop();setStatus('error');
   const name=e instanceof DOMException?e.name:'';
   setError(name==='NotAllowedError'?'Camera permission denied. Site controls still work normally.':name==='NotFoundError'?'No camera found.':e instanceof Error?e.message:'Unable to start camera.');
  }
 };

 return <>
  <aside className={"holo-natural-control "+(previewLarge?"holo-expanded":"")} aria-label="Natural gesture control">
   <div className="holo-natural-title"><Scan size={17}/><strong>SPATIAL CONTROL</strong>{status==='ready'&&<i/>}{status==='ready'&&<button type="button" className="holo-preview-toggle" onClick={()=>setPreviewLarge(v=>!v)} aria-label={previewLarge?'Reduce hand preview':'Enlarge hand preview'}>{previewLarge?'SMALL −':'ENLARGE +'}</button>}</div>
   <div className={'holo-vision-preview '+(status==='ready'?'on':'')}>
    <video ref={videoRef} muted playsInline autoPlay className={'holo-natural-preview '+(status==='ready'?'on':'')} aria-hidden="true"/>
    <canvas ref={overlayRef} className="holo-hand-overlay" aria-hidden="true"/>
    {status==='ready'&&<span className="holo-vision-chip">21 LANDMARKS · LIVE</span>}
   </div>
   {status==='ready'?<>
    <div className="holo-natural-status"><span>{handCount} {handCount===1?'HAND':'HANDS'} · {backend} · ZOOM {Math.round(zoomLevel*100)}%</span><span>{stateLabel}</span><span className="holo-target-readout">TARGET: {targetName||'— AIM AT A BUTTON'}</span></div>
    <button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA</button>
   </>:<button type="button" className="holo-natural-start" onClick={start} disabled={status==='loading'}><Camera size={16}/>{status==='loading'?'LOADING CAMERA…':'ENABLE GESTURES'}</button>}
   {status==='error'&&<p className="holo-natural-error" role="alert">{error}</p>}
   {status==='ready'&&<label className="holo-scroll-config"><span>SCROLL RESPONSE <strong>{scrollSpeed.toFixed(1)}×</strong></span><input type="range" aria-label="Gesture scroll speed" min=".7" max="4" step=".1" value={scrollSpeed} onChange={e=>{const v=Number(e.target.value);scrollSpeedRef.current=v;setScrollSpeed(v);}}/></label>}
   <p className="holo-natural-legend">OPEN PALM: SCROLL · INDEX: AIM · PINCH / BEND: CLICK · V: ZOOM</p>
   <p className="holo-natural-privacy">Camera runs only when enabled. Tracking runs on-device; external MediaPipe resources and SDK usage metrics may be requested.</p>
  </aside>
  {status==='ready'&&cursor&&<div className={'holo-gesture-pointer '+(cursor.press?'pressed':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%','--holo-progress':(cursor.progress*360)+'deg'} as CSSProperties} aria-hidden="true"><i/>{targetName&&<small>{targetName}</small>}</div>}
  {status==='ready'&&keyboard&&<section className="holo-air-console holo-control" aria-label="Air keyboard for active text field">
   <div className="holo-air-head"><div><Keyboard size={18}/><strong>AIR KEYBOARD</strong></div><button type="button" onClick={()=>{keyboardRef.current=false;setKeyboard(false);clearHover();}}><X size={16}/> CLOSE</button></div>
   <div className="holo-air-input"><span>{focusRef.current&&document.contains(focusRef.current)?'TEXT FIELD · '+(focusRef.current.getAttribute('placeholder')||focusRef.current.getAttribute('name')||'MESSAGE'):'DEMO TEXT'}</span><output>{focusRef.current&&document.contains(focusRef.current)?focusRef.current.value.slice(-60):scratch.slice(-60)}</output></div>
   <div className="holo-air-keys">{ROWS.map((row,i)=><div className="holo-air-row" key={i}>{row.split('').map(letter=><button type="button" key={letter} data-holo-key={letter} className={hoverKey===letter?'selected':''} onClick={()=>insertText(letter)}>{letter}</button>)}</div>)}<div className="holo-air-row holo-air-utils"><button data-holo-key="BACK" className={hoverKey==='BACK'?'selected':''} onClick={()=>insertText('BACK')}>BACKSPACE</button><button data-holo-key="SPACE" className={hoverKey==='SPACE'?'selected':''} onClick={()=>insertText('SPACE')}>SPACE</button><button data-holo-key="CLEAR" className={hoverKey==='CLEAR'?'selected':''} onClick={()=>insertText('CLEAR')}>CLEAR</button></div></div>
   <p className="holo-air-foot">POINT AT A KEY · BEND INDEX TO TYPE · OPEN PALM TO SCROLL</p>
  </section>}
 </>;
}

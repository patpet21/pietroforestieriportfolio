import {Profiler,useCallback,useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,Keyboard,Scan} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import AirKeyboard from './AirKeyboard';
import {AirTypingEngine} from '../lib/AirTypingEngine';
import type{AirFrame,AirSensitivity,AirTypingMode}from '../lib/AirTypingEngine';

import {getHand} from '../lib/gesture/pose';
import type {Landmark} from '../lib/gesture/pose';
import {ForwardPushController} from '../lib/gesture/ForwardPushController';
import {measureForwardDepth} from '../lib/gesture/forwardDepth';
import {findGestureTarget,canActivateTarget} from '../lib/gesture/targets';
import {FrameBudget,GestureDiagnostics} from '../lib/gesture/diagnostics';
import {newPalmScroll,palmScrollDelta} from '../lib/gesture/palmScroll';
import type {PalmScroll} from '../lib/gesture/palmScroll';
type Landmarker={detectForVideo:(video:HTMLVideoElement,time:number)=>{landmarks:Landmark[][];handedness?:{categoryName:string;score:number}[][]};close:()=>void};
type Status='off'|'loading'|'ready'|'preview'|'error';
type Cursor={x:number;y:number;progress:number;press:boolean};
type KeyboardFrame=AirFrame&{sampleId?:number;sampledAt?:number};
type AutoCalibration={enabled:boolean;since:number;last:{x:number;y:number;fx:number;fy:number}[]|null;hint:string};
const freshAutoCalibration=():AutoCalibration=>({enabled:false,since:0,last:null,hint:''});
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
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const dist=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const isEditable=(element:Element|null):element is HTMLInputElement|HTMLTextAreaElement=>
 (element instanceof HTMLInputElement&&['text','search','email','url','tel','number'].includes(element.type))||element instanceof HTMLTextAreaElement;
const nameOf=(el:HTMLElement)=>el.getAttribute('aria-label')||el.getAttribute('title')||el.getAttribute('placeholder')||el.getAttribute('name')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,33)||'SELECT';
export default function HoloNavigator(){
 const location=useLocation();
 const [status,setStatus]=useState<Status>('off');
 const [error,setError]=useState('');
 const [cameraPlaying,setCameraPlaying]=useState(false);
 const [cameraNeedsTap,setCameraNeedsTap]=useState(false);
 const mobileView=typeof window!=='undefined'&&window.matchMedia('(max-width:760px)').matches;
 const cursorNode=useRef<HTMLDivElement|null>(null);
 const setCursor=useCallback((value:Cursor|null)=>{
  const node=cursorNode.current;if(!node)return;
  node.style.display=value?'':'none';
  if(value){node.style.left=(value.x*100)+'%';node.style.top=(value.y*100)+'%';
   node.style.setProperty('--holo-progress',(value.progress*360)+'deg');node.classList.toggle('pressed',value.press);}
 },[]);
 const controllerRef=useRef(new ForwardPushController<HTMLElement>());
 const debugEnabled=new URLSearchParams(location.search).get('gestureDebug')==='1';
 const diagnostics=useRef(new GestureDiagnostics(debugEnabled));
 diagnostics.current.enabled=debugEnabled;
 const [debug,setDebug]=useState<Record<string,unknown>>({});
 useEffect(()=>{
  if(!debugEnabled)return;
  let observer:PerformanceObserver|undefined;
  try{observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())diagnostics.current.record('longTaskMs',entry.duration);});observer.observe({entryTypes:['longtask']});}catch{/* unsupported in Safari */}
  const id=window.setInterval(()=>setDebug(diagnostics.current.snapshot()),250);
  return()=>{clearInterval(id);observer?.disconnect();};
 },[debugEnabled]);
 const [handCount,setHandCount]=useState(0);
 const [stateLabel,setStateLabel]=useState('SHOW YOUR HAND');
 const [pressSignal,setPressSignal]=useState('AIM');
 const [targetName,setTargetName]=useState('');
 const [testClicks,setTestClicks]=useState(0);
 const [keyboard,setKeyboard]=useState(false);
 const [airFrame,setAirFrame]=useState<KeyboardFrame>({fingers:[],presses:[],hands:0,calibrated:0,status:'ALIGN HANDS TO START'});
 const keyboardCommitted=useCallback((id:number,at:number)=>{
  const metrics=diagnostics.current;
  if(!metrics.enabled)return;
  metrics.values.keyboardPresentedSample=id;
  metrics.record('sampleToKeyboardCommitMs',performance.now()-at);
 },[]);
 const [airCalibrationMessage,setAirCalibrationMessage]=useState('HANDS-FREE: show both hands, relaxed and apart. Hold still and the keyboard aligns itself.');
 const autoCalibrationRef=useRef<AutoCalibration>(freshAutoCalibration());
 const [airMode,setAirMode]=useState<AirTypingMode>('push');
 const [airSensitivity,setAirSensitivity]=useState<AirSensitivity>('easy');
 const [airReach,setAirReach]=useState(1.3);
 const airModeRef=useRef<AirTypingMode>('push');
 const airSensitivityRef=useRef<AirSensitivity>('easy');
 const airReachRef=useRef(1.3);
 const airEngineRef=useRef(new AirTypingEngine());
 const airKeysRef=useRef<HTMLDivElement|null>(null);
 const [scratch,setScratch]=useState('');
 const [backend,setBackend]=useState('');
 const [zoomLevel,setZoomLevel]=useState(1);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const clickFeedbackRef=useRef({at:0,label:''});
 const palmScrollRef=useRef<PalmScroll>(newPalmScroll());
 const [scrollSpeed,setScrollSpeed]=useState(2);
 const scrollSpeedRef=useRef(2);
 const overlayRef=useRef<HTMLCanvasElement|null>(null);
 const [previewLarge,setPreviewLarge]=useState(false);
 const [mobilePanelExpanded,setMobilePanelExpanded]=useState(false);
 const mobilePanelExpandedRef=useRef(false);mobilePanelExpandedRef.current=mobilePanelExpanded;
 const streamRef=useRef<MediaStream|null>(null);
 const modelRef=useRef<Landmarker|null>(null);
 const rafRef=useRef(0);
 const tokenRef=useRef(0);
 const pointerRef=useRef({x:.5,y:.5});
 // Navigation uses one control hand. Air Type owns separate per-hand pointers.
 const controlHandRef=useRef<{x:number;y:number;at:number}|null>(null);
 const zoomGestureRef=useRef({frames:0,active:false,baseGap:0,baseZoom:1,gap:0,missed:0});
 const zoomValueRef=useRef(1);
 const missedRef=useRef(0);
 const poseRef=useRef({kind:'idle',since:0});
 const targetRef=useRef<HTMLElement|null>(null);
 const focusRef=useRef<HTMLInputElement|HTMLTextAreaElement|null>(null);
 const keyboardRef=useRef(false);
 const lastUiRef=useRef('');
 keyboardRef.current=keyboard;

 const setLabel=useCallback((value:string)=>{
  if(lastUiRef.current!==value){lastUiRef.current=value;setStateLabel(value);}
 },[]);
 const clearHover=useCallback(()=>{
  if(targetRef.current){targetRef.current.classList.remove('holo-focused-target');targetRef.current=null;}
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
  zoomGestureRef.current={frames:0,active:false,baseGap:0,baseZoom:1,gap:0,missed:0};
  zoomValueRef.current=1;setZoomLevel(1);
  document.documentElement.style.removeProperty('--spatial-site-zoom');
  controllerRef.current.reset();
  airEngineRef.current.clearCalibration();
  autoCalibrationRef.current=freshAutoCalibration();
  setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'WAITING FOR TWO HANDS'});
  setAirCalibrationMessage('HANDS-FREE: show both hands, relaxed and apart. Hold still and the keyboard aligns itself.');
  clickFeedbackRef.current={at:0,label:''};
  palmScrollRef.current=newPalmScroll();
  poseRef.current={kind:'idle',since:0};
  controlHandRef.current=null;pointerRef.current={x:.5,y:.5};
  clearHover();setCursor(null);setHandCount(0);setBackend('');setStatus('off');setPressSignal('OPEN');
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
    if(keyboardRef.current){keyboardRef.current=false;setKeyboard(false);controllerRef.current.reset();clearHover();}
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
  airEngineRef.current.clearCalibration();autoCalibrationRef.current=freshAutoCalibration();
  setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'WAITING FOR TWO HANDS'});
  controllerRef.current.reset();
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
   missedRef.current=0;controllerRef.current.reset();
   setLabel('PALM: SCROLL · INDEX: AIM · PUSH FORWARD: CLICK');
   const budget=new FrameBudget();
   const metrics=diagnostics.current;
   metrics.values={browser:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
    camera:{width:video.videoWidth,height:video.videoHeight,frameRate:stream.getVideoTracks()[0]?.getSettings().frameRate},backend:cpu?'CPU':'GPU',
    latencyNote:'sample-to-action excludes camera exposure/transport and display scanout'};
   let lastFrame=0,lastVideo=-1,lastCount=-1,rateAt=performance.now(),processed=0,videoFrames=0,lastDraw=0,hadHand=false,sampleId=0;
   const tick=(now:number)=>{
    if(session!==tokenRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden){controllerRef.current.reset();airEngineRef.current.reset();palmScrollRef.current=newPalmScroll();controlHandRef.current=null;clearHover();setCursor(null);return;}
    if(!video.videoWidth||video.currentTime===lastVideo)return;
    if(now-lastFrame<budget.interval)return;
    lastVideo=video.currentTime;
    const frameStart=performance.now();
    sampleId++;
    if(lastFrame)metrics.record('processedIntervalMs',now-lastFrame);
    lastFrame=now;
    try{
     const inferenceStart=performance.now();
     const result=landmarker.detectForVideo(video,now);
     const landmarks=result.landmarks||[];
     metrics.record('inferenceMs',performance.now()-inferenceStart);
     processed++;
     const quality=video.getVideoPlaybackQuality?.();
     if(now-rateAt>=1000){
      metrics.values.processedFps=processed*1000/(now-rateAt);
      metrics.values.decodedFps=quality?(quality.totalVideoFrames-videoFrames)*1000/(now-rateAt):'unavailable';
      videoFrames=quality?.totalVideoFrames||0;processed=0;rateAt=now;
     }
     metrics.values.handedness=result.handedness||[];
     const drawStart=performance.now();
     if((!mobile||mobilePanelExpandedRef.current)&&now-lastDraw>=1000/15){paintHandSkeleton(overlayRef.current,video,landmarks);lastDraw=now;}
     metrics.record('overlayMs',performance.now()-drawStart);
     const poseStart=performance.now();
     // Preserve per-detection identity evidence before filtering invalid hands.
     // Detection order itself is not a persistent hand identity.
     const samples=landmarks.flatMap((points,index)=>{
      const hand=getHand(points);
      return hand?[{...hand,handedness:result.handedness?.[index]?.[0]}]:[];
     });
     metrics.record('poseMs',performance.now()-poseStart);
     if(samples.length!==lastCount){lastCount=samples.length;setHandCount(samples.length);}
     metrics.values.detectedHands=samples.length;
     if(!samples.length){
      if(hadHand)metrics.count('handLoss');hadHand=false;
      controllerRef.current.reset();metrics.values.suppression='tracker-lost';
      clearHover();setCursor(null);
      missedRef.current++;
      if(keyboardRef.current){
       airEngineRef.current.reset();
       setAirFrame({fingers:[],presses:[],hands:0,calibrated:airEngineRef.current.calibratedHands(),status:'SHOW YOUR HANDS'});
      }
      // Never carry a clickable target or press across missing landmarks.
      if(missedRef.current<3)return;
      controllerRef.current.reset();
      palmScrollRef.current=newPalmScroll();
      controlHandRef.current=null;
      zoomGestureRef.current.active=false;zoomGestureRef.current.frames=0;
      if(targetRef.current)clearHover();
      setCursor(null);setPressSignal('NO HAND');setLabel('SHOW YOUR INDEX FINGER');return;
     }
     if(!hadHand)metrics.count('handAcquisition');hadHand=true;
     missedRef.current=0;
     if(keyboardRef.current){
      controllerRef.current.reset();metrics.values.suppression='mode-switch';
      // Keyboard is exclusive: forward index touch, or opt-in ten-finger research.
      // Full key geometry is only needed while calibrating the finger experiment.
      const root=airKeysRef.current;
      const box=root?.getBoundingClientRect();
      const keyBoxes=root&&airModeRef.current==='tap'&&autoCalibrationRef.current.enabled?Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-holo-key]')).map(button=>({
       key:button.dataset.holoKey||'',rect:button.getBoundingClientRect()
      })):[];
      const keyAt=(nx:number,ny:number):string|null=>{
       if(!box||!box.width||!box.height)return null;
       const px=box.left+(root?.clientLeft||0)+nx*(root?.clientWidth||0),py=box.top+(root?.clientTop||0)+ny*(root?.clientHeight||0);
       if(px<box.left||px>box.right||py<box.top||py>box.bottom)return null;
       const key=document.elementFromPoint(px,py)?.closest<HTMLButtonElement>('button[data-holo-key]');
       return key&&root?.contains(key)&&!key.matches(':disabled')&&!key.closest('[inert],[aria-disabled="true"]')?key.dataset.holoKey||null:null;
      };
      // Auto-calibrate without a mouse or a third hand:
      // once two hands remain reasonably steady in frame for ~2.4 seconds,
      // use their current relaxed posture as the reference.
      const calibration=autoCalibrationRef.current;
      if(calibration.enabled&&airModeRef.current==='tap'){
       const hint=(value:string)=>{
        if(calibration.hint!==value){calibration.hint=value;setAirCalibrationMessage(value);}
       };
       const pose=samples.map(hand=>({
        x:hand.wrist.x,y:hand.wrist.y,
        fx:hand.landmarks[8].x,fy:hand.landmarks[8].y
       })).sort((a,b)=>a.x-b.x);
       if(samples.length!==2){
        calibration.since=0;calibration.last=null;
        hint(samples.length===1
         ?'ONE HAND DETECTED. Move both hands apart into the frame; alignment will begin automatically.'
         :'SHOW BOTH HANDS. No buttons required; alignment is automatic.');
       }else if(!box||keyBoxes.length<29){
        calibration.since=0;calibration.last=null;
        hint('WAITING FOR THE VIRTUAL KEYBOARD TO APPEAR…');
       }else{
        const moving=!!calibration.last&&pose.some((p,i)=>
         Math.hypot(p.x-calibration.last![i].x,p.y-calibration.last![i].y)>.035
         ||Math.hypot(p.fx-calibration.last![i].fx,p.fy-calibration.last![i].fy)>.045);
        calibration.last=pose;
        if(moving||!calibration.since){calibration.since=now;}
        const seconds=Math.ceil(Math.max(0,2400-(now-calibration.since))/1000);
        if(seconds>0)hint('BOTH HANDS FOUND · HOLD STILL '+seconds+'…');
        else{
         const homeAt=(key:string):{x:number;y:number}|null=>{
          const found=keyBoxes.find(item=>item.key===key);
          if(!found||!box)return null;
          const r=found.rect;
          return {x:(r.left+r.width/2-box.left)/box.width,
           y:(r.top+r.height/2-box.top)/box.height};
         };
         const result=airEngineRef.current.calibrate(samples,homeAt);
         if(result.ok){
          calibration.enabled=false;calibration.since=0;calibration.last=null;
          hint('AUTO-ALIGNED ✓ · EXPERIMENTAL TYPING. Use PINCH FALLBACK if finger taps misfire.');
          setLabel('AUTO-ALIGNED · BOTH HANDS');
         }else{
          calibration.since=now;hint(result.message+' · RETRYING AUTOMATICALLY');
         }
        }
       }
      }
      const frame=airEngineRef.current.process(samples,keyAt,now,{
       reach:airReachRef.current,mode:airModeRef.current,sensitivity:airSensitivityRef.current,aspect:video.videoWidth/video.videoHeight
      });
      if(frame.controls){metrics.values.pose='keyboard-forward-touch';metrics.values.press=frame.controls;}
      if(metrics.enabled){
       metrics.values.keyboardProcessedSample=sampleId;
       metrics.values.keyboardPointers=frame.fingers.map(f=>({id:f.id,x:f.x,y:f.y,contact:f.contact,pending:f.pending,down:f.pressed,progress:f.progress}));
      }
      setAirFrame({...frame,sampleId,sampledAt:frameStart});
      if(frame.presses.length){
       for(const press of frame.presses){insertText(press.key);metrics.count('keyboardPresses');}
       metrics.record('sampleToKeyboardActionMs',performance.now()-frameStart);
       for(const control of frame.controls||[])if(control.confirmationMs!==undefined)metrics.record('keyboardConfirmationMs',control.confirmationMs);
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
     const handJump=!!lastControl&&Math.hypot(control.wrist.x-lastControl.x,control.wrist.y-lastControl.y)>.28;
     if(lastControl&&now-lastControl.at<700&&handJump){
      setLabel('CONTROL HAND LOST · KEEP ONE HAND IN VIEW');
      controllerRef.current.reset();clearHover();metrics.values.suppression='tracker-lost';
      setCursor(null);return;
     }
     if(handJump){controllerRef.current.reset();clearHover();pointerRef.current={x:.5,y:.5};metrics.count('controlHandSwitch');}
     controlHandRef.current={x:control.wrist.x,y:control.wrist.y,at:now};
     const actionHands=[control];
     // Two-finger V gesture: spread index + middle to zoom the site's content.
     // A short pose debounce avoids resizing when passing through an intermediate hand shape.
     // Advance the forward-touch controller before palm/zoom returns.
     // An advancing fingertip may shift screen position as it approaches the virtual surface.
     // Keep its aimed control during the forward stroke.
     const depth=measureForwardDepth(control.landmarks,video.videoWidth/video.videoHeight);
     const pressHand=controllerRef.current.pending?control:null;
     const spread=pressHand?null:actionHands.find(item=>item.spread);
     const rawPose=pressHand?'press':spread?'zoom':control.open?'scroll':control.pointing?'point':'idle';
     const p=pointerRef.current,tip=control.landmarks[8];
     const rawX=clamp((1-tip.x-.5)*1.48+.5,0,1),rawY=clamp((tip.y-.5)*1.48+.5,0,1);
     const motion=Math.hypot(rawX-p.x,rawY-p.y);
     const smoothing=motion<.015?.24:motion<.055?.47:.7;
     const point={x:p.x=p.x*(1-smoothing)+rawX*smoothing,y:p.y=p.y*(1-smoothing)+rawY*smoothing};
     const classifyStart=performance.now();
     // Acquire on OPEN aim only. Every frame advances release before mode returns.
     const hitStart=performance.now();
     const aimed=control.pointing&&!pressHand?findGestureTarget(point.x*innerWidth,point.y*innerHeight):null;
     metrics.record('hitTestMs',performance.now()-hitStart);
     const click=controllerRef.current.step({now,tracking:true,depth,pointing:control.pointing||!!pressHand,
      mode:rawPose==='scroll'?'scroll':rawPose==='zoom'?'zoom':'navigation',target:aimed,point});
     metrics.record('classifyMs',performance.now()-classifyStart);
     metrics.values.rawCursor={x:rawX,y:rawY};metrics.values.filteredCursor=click.point;
     metrics.values.pose=rawPose;metrics.values.press={depth,progress:click.progress,down:controllerRef.current.down,frames:controllerRef.current.frames,phase:click.phase};
     metrics.values.suppression=click.reason;
     metrics.values.targetAgeMs=click.targetAgeMs;
     if(click.reason!=='none')metrics.count('suppressed:'+click.reason);
     setPressSignal(click.reason==='stale-target'?'WITHDRAW TO RESET':controllerRef.current.down?'TOUCH · WITHDRAW':click.pending?('PUSH '+Math.round(click.progress*100)+'%'):controllerRef.current.ready?'READY · PUSH FORWARD':'AIM · POSITIONING PLANE');
     if(click.activation){
      const target=click.activation;
      if(canActivateTarget(target,click.point.x*innerWidth,click.point.y*innerHeight)){
       metrics.count('clicks');metrics.record('sampleToActionMs',performance.now()-frameStart);
       if(click.confirmationMs!==undefined)metrics.record('pushConfirmationMs',click.confirmationMs);
       clickFeedbackRef.current={at:now,label:'CLICK ✓ '+nameOf(target)};
       activateRef.current(target);
       if(metrics.enabled)requestAnimationFrame(()=>{
        if(session===tokenRef.current)metrics.record('sampleToNextRafMs',performance.now()-frameStart);
       });
      }else{metrics.count('suppressed:target-blocked');metrics.values.suppression='target-blocked';clearHover();}
     }
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
      const amount=palmScrollDelta(scroll,y,now,window.innerHeight,scrollSpeedRef.current);
      if(amount)window.scrollBy({top:amount,left:0,behavior:'instant'});
      if(targetRef.current)clearHover();setCursor(null);
      setLabel('OPEN PALM · SMOOTH SCROLL');return;
     }
     palmScrollRef.current=newPalmScroll();
     const px=click.point.x*innerWidth,py=click.point.y*innerHeight;
     const target=findGestureTarget(px,py);
     if(target!==targetRef.current){
      targetRef.current?.classList.remove('holo-focused-target');targetRef.current=target;
      target?.classList.add('holo-focused-target');setTargetName(target?nameOf(target):'');
     }
     if(metrics.enabled)metrics.values.target=target?{tag:target.tagName,rect:target.getBoundingClientRect().toJSON(),method:'direct'}:null;
     if(now-clickFeedbackRef.current.at<650&&clickFeedbackRef.current.label)setLabel(clickFeedbackRef.current.label);
     else setLabel(click.reason==='stale-target'?'WITHDRAW TO REPOSITION THE TOUCH PLANE':click.pending?'PUSH INDEX FORWARD · WITHDRAW TO RELEASE':controllerRef.current.ready?'TOUCH PLANE READY · PUSH FORWARD':'AIM BRIEFLY TO POSITION THE TOUCH PLANE');
     setCursor(control.pointing||click.pending?{...click.point,progress:click.progress,press:controllerRef.current.down}:null);
    }catch{
     controllerRef.current.reset();airEngineRef.current.reset();clearHover();setCursor(null);metrics.count('frameErrors');
     if(keyboardRef.current)setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'TRACKING INTERRUPTED · SHOW YOUR HANDS'});
    }finally{
     const work=performance.now()-frameStart;
     metrics.record('frameWorkMs',work);budget.observe(work);metrics.values.budgetMs=budget.interval;
    }
   };
   rafRef.current=requestAnimationFrame(tick);
  }catch(e){
   if(session!==tokenRef.current)return;
   const hasStream=!!streamRef.current?.getVideoTracks().some(track=>track.readyState==='live');
   const name=e instanceof DOMException?e.name:'';
   diagnostics.current.values.initializationFailure={stage:hasStream?'tracking':'camera',name:name||(e instanceof Error?e.name:'unknown')};
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

 const mobileCompact=mobileView&&!mobilePanelExpanded&&((status==='loading'&&!cameraNeedsTap)||(status==='ready'&&cameraPlaying));
 const mobileIdle=mobileView&&status==='off';
 return <Profiler id="gesture-ui" onRender={(_id,_phase,duration)=>diagnostics.current.record('reactCommitMs',duration)}>
  <aside className={"holo-natural-control "+(previewLarge?"holo-expanded":"")+(mobileCompact?" holo-mobile-compact":"")+(mobileIdle?" holo-mobile-idle":"")} aria-label="Natural gesture control">
   <div className="holo-natural-title">
    <Scan size={17}/><strong>{mobileCompact?(status==='loading'?'CONNECTING…':('GESTURES ON · '+handCount+' HAND')):('SPATIAL CONTROL'+(mobileView?' · MOBILE':''))}</strong>
    {status==='ready'&&<i/>}
    {mobileView&&(status==='ready'||status==='loading')
      ?<button type="button" className="holo-preview-toggle" onClick={()=>setMobilePanelExpanded(v=>!v)} aria-label={mobilePanelExpanded?'Hide gesture camera and controls':'Show gesture camera and controls'}>{mobilePanelExpanded?'HIDE':'CAMERA'}</button>
      :(status==='ready'||status==='preview')&&<button type="button" className="holo-preview-toggle" onClick={()=>setPreviewLarge(v=>!v)} aria-label={previewLarge?'Reduce hand preview':'Enlarge hand preview'}>{previewLarge?'SMALL −':'ENLARGE +'}</button>}
    {mobileView&&(status==='ready'||status==='preview'||status==='loading')&&<button type="button" className="holo-mobile-stop-title" onClick={stop} aria-label="Stop mobile camera"><CameraOff size={15}/></button>}
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
    <div className="holo-natural-status"><span>{handCount} {handCount===1?'HAND':'HANDS'} · {keyboard?airFrame.fingers.length+' POINTERS':'1 CONTROL'} · {backend} · ZOOM {Math.round(zoomLevel*100)}%</span><span>{stateLabel}</span><span className="holo-target-readout">TARGET: {targetName||'— AIM AT A BUTTON'}</span><span className="holo-pinch-readout">PUSH: <b>{pressSignal}</b></span></div>
    <button type="button" data-holo-test className="holo-gesture-test" onClick={()=>{setTestClicks(n=>n+1);setLabel('TEST CLICK ✓ · ACTIVATED');}}>TEST GESTURE CLICK <strong>{testClicks?('✓ '+testClicks):'↗'}</strong></button>
    {!mobileView&&location.pathname==='/gesture-lab'?<button type="button" className={'holo-air-toggle '+(keyboard?'active':'')} onClick={()=>{
     keyboardRef.current=!keyboardRef.current;setKeyboard(keyboardRef.current);
     airEngineRef.current.clearCalibration();
     autoCalibrationRef.current=keyboardRef.current&&airModeRef.current==='tap'?{enabled:true,since:0,last:null,hint:''}:freshAutoCalibration();
     if(keyboardRef.current)setAirCalibrationMessage(airModeRef.current==='push'?'AIM WITH INDEX, PUSH FORWARD TO TOUCH, WITHDRAW TO RELEASE. THE TOUCH PLANE ALIGNS AUTOMATICALLY.':'HANDS-FREE AUTO-ALIGN · SHOW BOTH HANDS, THEN HOLD STILL.');
     setAirFrame({fingers:[],presses:[],hands:0,calibrated:0,status:'WAITING FOR TWO HANDS'});
     controlHandRef.current=null;poseRef.current={kind:'idle',since:0};
     clearHover();controllerRef.current.reset();palmScrollRef.current=newPalmScroll();
     setLabel(keyboardRef.current?'AIR KEYBOARD ON · AIM THEN PUSH FORWARD':'AIR KEYBOARD OFF');
    }}><Keyboard size={15}/>{keyboard?'CLOSE AIR KEYBOARD':'EXPERIMENTAL AIR KEYBOARD'}</button>:<p className="holo-mobile-note">{mobileView?'MOBILE MODE: one hand for scrolling and pointing. Experimental Air Type requires desktop Gesture Lab.':'Experimental Air Type is available separately in Gesture Lab.'}</p>}
    <button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA</button>
   </>:status==='preview'?<button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA · RETRY AFTER</button>
   :status==='loading'?<button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> CANCEL CAMERA START</button>
   :<button type="button" className="holo-natural-start" onClick={start}><Camera size={16}/> ENABLE GESTURES</button>}
   {(status==='error'||status==='preview')&&<p className="holo-natural-error" role="alert">{error}</p>}
   {status==='error'&&<p className="holo-mobile-note">If you are opening the site inside an app, try opening it directly in Chrome or Safari and allow camera permission.</p>}
   {status==='ready'&&<label className="holo-scroll-config"><span>SCROLL RESPONSE <strong>{scrollSpeed.toFixed(1)}×</strong></span><input type="range" aria-label="Gesture scroll speed" min=".7" max="4" step=".1" value={scrollSpeed} onChange={e=>{const v=Number(e.target.value);scrollSpeedRef.current=v;setScrollSpeed(v);}}/></label>}
   <p className="holo-natural-legend">{mobileView?'MOBILE · PALM: SCROLL · PUSH INDEX FORWARD: TOUCH · WITHDRAW: RELEASE.':'TOUCH = AIM WITH INDEX → PUSH FORWARD → WITHDRAW. OPEN PALM = SCROLL. V = ZOOM.'}</p>
   <p className="holo-natural-privacy">Camera runs only when enabled. Tracking runs on-device; external MediaPipe resources and SDK usage metrics may be requested.</p>
  </aside>
  {status==='ready'&&<div ref={cursorNode} className="holo-gesture-pointer" style={{display:'none'}} aria-hidden="true"><i/>{targetName&&<small>{targetName}</small>}</div>}
  {debugEnabled&&<details className="gesture-debug" open><summary>Gesture diagnostics · local session only</summary><pre>{JSON.stringify(debug,null,2)}</pre></details>}
  {status==='ready'&&keyboard&&<AirKeyboard
   keysRef={airKeysRef}
   fingers={airFrame.fingers}
   hands={airFrame.hands}
   status={airFrame.status}
   sampleId={airFrame.sampleId}
   sampledAt={airFrame.sampledAt}
   onFrameCommit={keyboardCommitted}
   calibrationMessage={airCalibrationMessage}
   text={focusRef.current&&document.contains(focusRef.current)?focusRef.current.value.slice(-110):scratch.slice(-110)}
   mode={airMode}
   sensitivity={airSensitivity}
   reach={airReach}
   onMode={v=>{
    airModeRef.current=v;setAirMode(v);airEngineRef.current.reset();
    autoCalibrationRef.current=v==='tap'?{enabled:true,since:0,last:null,hint:''}:freshAutoCalibration();
    setAirCalibrationMessage(v==='push'?'AIM WITH INDEX, PUSH FORWARD TO TOUCH, WITHDRAW TO RELEASE. THE TOUCH PLANE ALIGNS AUTOMATICALLY.':'SHOW BOTH HANDS AND HOLD STILL TO ALIGN EXPERIMENTAL FINGER TAPS.');
   }}
   onSensitivity={v=>{airSensitivityRef.current=v;setAirSensitivity(v);airEngineRef.current.reset();}}
   onReach={v=>{airReachRef.current=v;setAirReach(v);airEngineRef.current.reset();}}
   onCalibrate={()=>{
    // This button merely RESTARTS hands-free alignment, before hands are positioned.
    airEngineRef.current.clearCalibration();
    autoCalibrationRef.current={enabled:true,since:0,last:null,hint:''};
    setAirCalibrationMessage('AUTO-ALIGN RESTARTED · SHOW BOTH HANDS. HOLD STILL FOR 3 SECONDS.');
   }}
   onClose={()=>{
    keyboardRef.current=false;setKeyboard(false);
    autoCalibrationRef.current=freshAutoCalibration();
    airEngineRef.current.clearCalibration();controlHandRef.current=null;controllerRef.current.reset();clearHover();
   }}
   onKey={insertText}
  />}
 </Profiler>;
}

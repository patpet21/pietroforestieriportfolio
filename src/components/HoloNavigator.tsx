import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Camera,CameraOff,Hand,Keyboard,Scan,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';

type Landmark={x:number;y:number;z:number};
type Landmarker={detectForVideo:(video:HTMLVideoElement,time:number)=>{landmarks:Landmark[][]};close:()=>void};
type Status='off'|'loading'|'ready'|'error';
type Cursor={x:number;y:number;progress:number;press:boolean};
type HandSample={landmarks:Landmark[];wrist:Landmark;palm:{x:number;y:number};open:boolean;pointing:boolean};
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const ROWS=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
const CLICKABLE='a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[role="button"],[data-holo-key]';
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const dist=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const isEditable=(element:Element|null):element is HTMLInputElement|HTMLTextAreaElement=>
 (element instanceof HTMLInputElement&&!['password','file','hidden','checkbox','radio','button','submit'].includes(element.type))||element instanceof HTMLTextAreaElement;
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
 return {landmarks:points,wrist:points[0],palm,open:fingers.filter(Boolean).length>=3,pointing:fingers[0]&&fingers.slice(1).filter(Boolean).length<2};
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
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const modelRef=useRef<Landmarker|null>(null);
 const rafRef=useRef(0);
 const tokenRef=useRef(0);
 const pointerRef=useRef({x:.5,y:.5,wristX:.5,wristY:.5,lastPoint:0});
 const palmRef=useRef<{x:number;y:number;last:number}|null>(null);
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
  palmRef.current=null;tapRef.current={down:false,candidate:false,frames:0};
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
  palmRef.current=null;
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
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
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
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.56,minTrackingConfidence:.55}) as Landmarker;
   }catch{
    cpu=true;
    landmarker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.56,minTrackingConfidence:.55}) as Landmarker;
   }
   if(session!==tokenRef.current){landmarker.close();return;}
   modelRef.current=landmarker;setBackend(cpu?'CPU':'GPU');setStatus('ready');
   setLabel('OPEN PALM = SCROLL · INDEX = POINT');
   let lastFrame=0,lastVideo=-1,lastCount=-1;
   const tick=(now:number)=>{
    if(session!==tokenRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden||now-lastFrame<(cpu?66:45)||!video.videoWidth||video.currentTime===lastVideo)return;
    lastFrame=now;lastVideo=video.currentTime;
    try{
     const samples=landmarker.detectForVideo(video,now).landmarks.map(getHand).filter((hand):hand is HandSample=>!!hand);
     if(samples.length!==lastCount){setHandCount(samples.length);lastCount=samples.length;}
     if(!samples.length){
      palmRef.current=null;tapRef.current={down:false,candidate:false,frames:0};
      clearHover();setCursor(null);setLabel('SHOW ONE OR TWO HANDS');
      return;
     }
     // A broad open palm moves the page in the same direction as a touch-swipe.
     // It has priority only for its own hand; another hand may point simultaneously.
     const openHands=samples.filter(item=>item.open);
     let scrollHand:HandSample|undefined;
     const prevPalm=palmRef.current;
     if(openHands.length){
      scrollHand=prevPalm?openHands.reduce((a,b)=>
       Math.hypot(a.palm.x-prevPalm.x,a.palm.y-prevPalm.y)
       <=Math.hypot(b.palm.x-prevPalm.x,b.palm.y-prevPalm.y)?a:b):openHands[0];
     }
     let scrolling=false;
     if(scrollHand){
      const point={x:1-scrollHand.palm.x,y:scrollHand.palm.y};
      if(prevPalm&&Math.hypot(prevPalm.x-point.x,prevPalm.y-point.y)<.35){
       const delta=point.y-prevPalm.y;
       if(Math.abs(delta)>=.008&&!keyboardRef.current){
        const px=clamp(-delta*window.innerHeight*1.6,-96,96);
        window.scrollBy(0,px);
        scrolling=Math.abs(px)>3;
        palmRef.current={...point,last:now};
       }
      }else palmRef.current={...point,last:now};
     }else palmRef.current=null;
     // With two hands, an open palm can scroll while the other index points.
     // With one hand, raising an open palm immediately suspends clicking.
     const candidates=samples.filter(item=>!item.open);
     const pointer=candidates.sort((a,b)=>{
      const prev=pointerRef.current;
      const d1=Math.hypot(1-a.wrist.x-prev.wristX,a.wrist.y-prev.wristY);
      const d2=Math.hypot(1-b.wrist.x-prev.wristX,b.wrist.y-prev.wristY);
      return d1-d2;
     })[0];
     if(!pointer){
      clearHover();setCursor(null);tapRef.current={down:false,candidate:false,frames:0};
      setLabel('OPEN PALM · MOVE UP OR DOWN');
      return;
     }
     const tip=pointer.landmarks[8],middle=pointer.landmarks[6],base=pointer.landmarks[5];
     if(!tip||!middle||!base)return;
     const prev=pointerRef.current;
     const xTarget=clamp((1-tip.x-.5)*1.55+.5,0,1);
     const yTarget=clamp((tip.y-.5)*1.55+.5,0,1);
     const x=prev.x=prev.x*.38+xTarget*.62;
     const y=prev.y=prev.y*.38+yTarget*.62;
     prev.wristX=1-pointer.wrist.x;prev.wristY=pointer.wrist.y;
     if(pointer.pointing)prev.lastPoint=now;
     const ratio=dist(tip,base)/Math.max(.04,dist(middle,base));
     const tap=tapRef.current;
     const next=tap.down?ratio<2.25:ratio<1.91;
     if(next!==tap.candidate){tap.candidate=next;tap.frames=1;}else tap.frames++;
     const down=tap.frames>=2?next:tap.down;
     const tapStarted=down&&!tap.down;tap.down=down;
     const validPointer=pointer.pointing||down&&now-prev.lastPoint<650;
     if(!validPointer){
      clearHover();setCursor(null);
      setLabel(scrolling?'OPEN PALM · SCROLLING':'POINT YOUR INDEX TO SELECT');
      return;
     }
     const px=(down&&targetRef.current?prev.x:x)*window.innerWidth;
     const py=(down&&targetRef.current?prev.y:y)*window.innerHeight;
     const element=document.elementFromPoint(px,py) as HTMLElement|null;
     let target=element?.closest<HTMLElement>(CLICKABLE)||null;
     if(target?.closest('.holo-natural-control')&&!target.closest('[data-holo-key]'))target=null;
     if(targetRef.current&&target!==targetRef.current){
      const r=targetRef.current.getBoundingClientRect();
      if(px>=r.left-12&&px<=r.right+12&&py>=r.top-12&&py<=r.bottom+12)target=targetRef.current;
     }
     if(target!==targetRef.current){
      targetRef.current?.classList.remove('holo-focused-target');
      targetRef.current=target;
      if(target)target.classList.add('holo-focused-target');
      hoverRef.current={target,since:now,fired:false};
      setHoverKey(target?.dataset.holoKey||'');
      setTargetName(target?nameOf(target):'');
     }
     const hovering=hoverRef.current;
     const dwellTime=keyboardRef.current&&target?.dataset.holoKey?1100:1450;
     const progress=target&&!hovering.fired?clamp((now-hovering.since)/dwellTime,0,1):0;
     if(target&&!hovering.fired&&!scrolling&&now-lastPressRef.current>420&&
       ((tapStarted&&now-prev.lastPoint<650)||(pointer.pointing&&progress>=1))){
      hovering.fired=true;lastPressRef.current=now;
      activateRef.current(target);
     }
     setCursor({x:px/window.innerWidth,y:py/window.innerHeight,progress,press:down});
     setLabel(target?'INDEX · TAP OR HOLD TO SELECT':scrolling?'PALM · SCROLLING':'INDEX · POINT TO AN ELEMENT');
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
  <aside className="holo-natural-control" aria-label="Natural gesture control">
   <div className="holo-natural-title"><Scan size={17}/><strong>SPATIAL CONTROL</strong>{status==='ready'&&<i/>}</div>
   <video ref={videoRef} muted playsInline autoPlay className={'holo-natural-preview '+(status==='ready'?'on':'')} aria-hidden="true"/>
   {status==='ready'?<>
    <div className="holo-natural-status"><span>{handCount} {handCount===1?'HAND':'HANDS'} · {backend}</span><span>{stateLabel}</span></div>
    <button type="button" className="holo-natural-stop" onClick={stop}><CameraOff size={15}/> STOP CAMERA</button>
   </>:<button type="button" className="holo-natural-start" onClick={start} disabled={status==='loading'}><Camera size={16}/>{status==='loading'?'LOADING CAMERA…':'ENABLE GESTURES'}</button>}
   {status==='error'&&<p className="holo-natural-error" role="alert">{error}</p>}
   <p className="holo-natural-privacy">Camera runs only when enabled. Tracking runs on-device; external MediaPipe resources and SDK usage metrics may be requested.</p>
  </aside>
  {status==='ready'&&cursor&&<div className={'holo-gesture-pointer '+(cursor.press?'pressed':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%','--holo-progress':(cursor.progress*360)+'deg'} as CSSProperties} aria-hidden="true"><i/>{targetName&&<small>{targetName}</small>}</div>}
  {status==='ready'&&keyboard&&<section className="holo-air-console holo-control" aria-label="Air keyboard for active text field">
   <div className="holo-air-head"><div><Keyboard size={18}/><strong>AIR KEYBOARD</strong></div><button type="button" onClick={()=>{keyboardRef.current=false;setKeyboard(false);clearHover();}}><X size={16}/> CLOSE</button></div>
   <div className="holo-air-input"><span>{focusRef.current&&document.contains(focusRef.current)?'TEXT FIELD · '+(focusRef.current.getAttribute('placeholder')||focusRef.current.getAttribute('name')||'MESSAGE'):'DEMO TEXT'}</span><output>{focusRef.current&&document.contains(focusRef.current)?focusRef.current.value.slice(-60):scratch.slice(-60)}</output></div>
   <div className="holo-air-keys">{ROWS.map((row,i)=><div className="holo-air-row" key={i}>{row.split('').map(letter=><button type="button" key={letter} data-holo-key={letter} className={hoverKey===letter?'selected':''} onClick={()=>insertText(letter)}>{letter}</button>)}</div>)}<div className="holo-air-row holo-air-utils"><button data-holo-key="BACK" className={hoverKey==='BACK'?'selected':''} onClick={()=>insertText('BACK')}>BACKSPACE</button><button data-holo-key="SPACE" className={hoverKey==='SPACE'?'selected':''} onClick={()=>insertText('SPACE')}>SPACE</button><button data-holo-key="CLEAR" className={hoverKey==='CLEAR'?'selected':''} onClick={()=>insertText('CLEAR')}>CLEAR</button></div></div>
   <p className="holo-air-foot">POINT AT A KEY · BEND INDEX OR HOLD · OPEN PALM SCROLLS THE SITE WHEN NOT TYPING</p>
  </section>}
 </>;
}

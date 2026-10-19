import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowDown,ArrowUp,CameraOff,ChevronDown,ChevronUp,Hand,Keyboard,MousePointer2,Scan,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';

type Landmark={x:number;y:number;z:number};
type Landmarker={detectForVideo:(video:HTMLVideoElement,time:number)=>{landmarks:Landmark[][]};close:()=>void};
type Status='off'|'loading'|'ready'|'error';
type Mode='point'|'scroll';
type Activation='dwell'|'pinch';
type Target=HTMLElement&{href?:string};
type Cursor={x:number;y:number;progress:number;pinch:boolean};
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const ROWS=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
const VALID='a[href],button:not(:disabled),[role="button"],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[data-air-key]';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const distance=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const describer=(element:HTMLElement)=>element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent?.trim().replace(/\s+/g,' ').slice(0,36)||'SELECT';
function editable(element:Element|null):element is HTMLInputElement|HTMLTextAreaElement{
 return (element instanceof HTMLInputElement&&!['button','checkbox','radio','submit','file','password','hidden'].includes(element.type))||element instanceof HTMLTextAreaElement;
}
export default function HoloNavigator(){
 const location=useLocation();
 const [status,setStatus]=useState<Status>('off');
 const [error,setError]=useState('');
 const [minimized,setMinimized]=useState(false);
 const [mode,setMode]=useState<Mode>('point');
 const [activation,setActivation]=useState<Activation>('dwell');
 const [keyboard,setKeyboard]=useState(false);
 const [note,setNote]=useState('');
 const [cursor,setCursor]=useState<Cursor|null>(null);
 const [targetName,setTargetName]=useState('LOOK AT YOUR HAND');
 const [backend,setBackend]=useState('');
 const [sensitivity,setSensitivity]=useState(1);
 const [hoverKey,setHoverKey]=useState('');
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const modelRef=useRef<Landmarker|null>(null);
 const rafRef=useRef<number>(0);
 const tokenRef=useRef(0);
 const targetRef=useRef<HTMLElement|null>(null);
 const dwellRef=useRef({target:null as HTMLElement|null,started:0,fired:false});
 const lastHoverRef=useRef(0);
 const smoothRef=useRef({x:.5,y:.5});
 const pinchedRef=useRef(false);
 const pinchPendingRef=useRef({state:false,frames:0});
 const lastClickRef=useRef(0);
 const focusRef=useRef<HTMLInputElement|HTMLTextAreaElement|null>(null);
 const modeRef=useRef(mode);
 const activationRef=useRef(activation);
 const keyboardRef=useRef(keyboard);
 const sensitivityRef=useRef(sensitivity);
 const noteRef=useRef(note);
 modeRef.current=mode;activationRef.current=activation;keyboardRef.current=keyboard;
 sensitivityRef.current=sensitivity;noteRef.current=note;
 const clearTarget=useCallback(()=>{
  targetRef.current?.classList.remove('holo-focused-target');
  targetRef.current=null;
  dwellRef.current={target:null,started:0,fired:false};
  setTargetName('LOOK AT YOUR HAND');
  setHoverKey('');
 },[]);
 const stop=useCallback(()=>{
  tokenRef.current++;
  cancelAnimationFrame(rafRef.current);rafRef.current=0;
  modelRef.current?.close();modelRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
  if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
  clearTarget();pinchedRef.current=false;pinchPendingRef.current={state:false,frames:0};
  setCursor(null);setStatus('off');setBackend('');setError('');
 },[clearTarget]);
 const stopRef=useRef(stop);stopRef.current=stop;
 useEffect(()=>{
  const close=()=>stopRef.current();
  window.addEventListener('pf-lab-camera-start',close);
  const onFocus=(event:Event)=>{
   if(editable(event.target as Element))focusRef.current=event.target as HTMLInputElement|HTMLTextAreaElement;
  };
  document.addEventListener('focusin',onFocus);
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){
    if(keyboardRef.current){setKeyboard(false);return;}
    stopRef.current();
   }
  };
  window.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('pf-lab-camera-start',close);document.removeEventListener('focusin',onFocus);window.removeEventListener('keydown',onKey);stopRef.current();};
 },[]);
 useEffect(()=>{clearTarget();focusRef.current=null;},[location.pathname,clearTarget]);
 const insertText=useCallback((value:string)=>{
  const field=focusRef.current;
  if(!field||!document.contains(field)){
   setNote(old=>value==='CLEAR'?'':value==='BACK'?old.slice(0,-1):old+(value==='SPACE'?' ':value==='ENTER'?'\n':value));
   return;
  }
  const prev=field.value,start=field.selectionStart??prev.length,end=field.selectionEnd??prev.length;
  let next='',pos=start;
  if(value==='CLEAR'){next='';pos=0;}
  else if(value==='BACK'){next=start===end?prev.slice(0,Math.max(0,start-1))+prev.slice(end):prev.slice(0,start)+prev.slice(end);pos=start===end?Math.max(0,start-1):start;}
  else {const input=value==='SPACE'?' ':value==='ENTER'?(field instanceof HTMLTextAreaElement?'\n':''):value;next=prev.slice(0,start)+input+prev.slice(end);pos=start+input.length;}
  const proto=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(field,next);
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.focus({preventScroll:true});
  try{field.setSelectionRange(pos,pos);}catch{/* email/number fields do not support text selection */}
 },[]);
 const activate=useCallback((target:Target)=>{
  if(target.closest('.holo-control'))return;
  const airKey=target.closest<HTMLElement>('[data-holo-key]');
  if(airKey){insertText(airKey.dataset.holoKey||'');return;}
  if(editable(target)){
   focusRef.current=target;
   target.focus({preventScroll:true});
   setKeyboard(true);keyboardRef.current=true;setMode('point');modeRef.current='point';setMinimized(true);
   setTargetName('TEXT FIELD · KEYBOARD OPEN');
   return;
  }
  target.click();
 },[insertText]);
 const activateRef=useRef(activate);activateRef.current=activate;
 const start=async()=>{
  if(status==='loading'||status==='ready')return;
  if(!navigator.mediaDevices?.getUserMedia){setStatus('error');setError('Webcam requires HTTPS and a compatible browser.');return;}
  window.dispatchEvent(new Event('pf-holo-enable'));
  const token=++tokenRef.current;
  setStatus('loading');setError('');setMinimized(false);
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
   if(token!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   streamRef.current=stream;
   const video=videoRef.current;if(!video)throw Error('Video preview unavailable.');
   video.srcObject=stream;await video.play();
   const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
   if(token!==tokenRef.current)return;
   const resources=await FilesetResolver.forVisionTasks(WASM);
   if(token!==tokenRef.current)return;
   let tracker:Landmarker;let cpu=false;
   try{
    tracker=await HandLandmarker.createFromOptions(resources,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minTrackingConfidence:.5}) as Landmarker;
   }catch{
    cpu=true;
    tracker=await HandLandmarker.createFromOptions(resources,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minTrackingConfidence:.5}) as Landmarker;
   }
   if(token!==tokenRef.current){tracker.close();return;}
   modelRef.current=tracker;setBackend(cpu?'CPU':'GPU');setStatus('ready');
   let lastFrame=0,lastVideoTime=-1;
   const tick=(now:number)=>{
    if(token!==tokenRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden||now-lastFrame<(cpu?63:45)||!video.videoWidth||lastVideoTime===video.currentTime)return;
    lastFrame=now;lastVideoTime=video.currentTime;
    try{
     const hand=tracker.detectForVideo(video,now).landmarks?.[0];
     if(!hand||!hand[8]){
      clearTarget();setCursor(null);pinchedRef.current=false;pinchPendingRef.current={state:false,frames:0};return;
     }
     const tip=hand[8],thumb=hand[4],indexKnuckle=hand[5],pinkyKnuckle=hand[17];
     const scaled=sensitivityRef.current;
     const xx=clamp((1-tip.x-.5)*scaled+.5,0,1);
     const yy=clamp((tip.y-.5)*scaled+.5,0,1);
     const previous=smoothRef.current;
     const x=previous.x=previous.x*.34+xx*.66;
     const y=previous.y=previous.y*.34+yy*.66;
     let pinching=false,started=false;
     if(thumb&&indexKnuckle&&pinkyKnuckle){
      const ratio=distance(tip,thumb)/Math.max(.065,distance(indexKnuckle,pinkyKnuckle));
      const old=pinchedRef.current;
      const candidate=old?ratio<.85:ratio<.61;
      const pending=pinchPendingRef.current;
      if(pending.state!==candidate){pending.state=candidate;pending.frames=1;}
      else pending.frames++;
      pinching=pending.frames>=2?candidate:old;
      started=pinching&&!old;
      pinchedRef.current=pinching;
     }
     if(modeRef.current==='scroll'&&!keyboardRef.current){
      clearTarget();
      const diff=y<.38?y-.38:y>.62?y-.62:0;
      if(Math.abs(diff)>.025)window.scrollBy(0,clamp(diff*125,-44,44));
      setCursor({x,y,progress:Math.abs(diff)*2,pinch:pinching});
      return;
     }
     const px=x*window.innerWidth,py=y*window.innerHeight;
     const hit=document.elementFromPoint(px,py) as HTMLElement|null;
     let candidate:HTMLElement|null=hit?.closest(VALID) as HTMLElement|null;
     if(candidate?.closest('.holo-control')&&!candidate.closest('[data-holo-key]'))candidate=null;
     // Only UI controls and links are activatable; never click random page content.
     // 14px target hysteresis prevents a shaky index fingertip from restarting dwell at edges.
     if(targetRef.current&&candidate!==targetRef.current){
      const rect=targetRef.current.getBoundingClientRect();
      if(px>=rect.left-14&&px<=rect.right+14&&py>=rect.top-14&&py<=rect.bottom+14)candidate=targetRef.current;
     }
     if(candidate!==targetRef.current){
      targetRef.current?.classList.remove('holo-focused-target');
      targetRef.current=candidate;
      if(candidate)candidate.classList.add('holo-focused-target');
      dwellRef.current={target:candidate,started:now,fired:false};
      setTargetName(candidate?describer(candidate):'MOVE TO A LINK OR BUTTON');
      setHoverKey(candidate?.dataset.holoKey||'');
      lastHoverRef.current=now;
     }
     const held=dwellRef.current;
     const duration=keyboardRef.current&&candidate?.dataset.holoKey?850:1100;
     const elapsed=clamp((now-held.started)/duration,0,1);
     const progressed=candidate&&!held.fired?elapsed:0;
     if(candidate&&!held.fired&&now-lastHoverRef.current>120&&((activationRef.current==='dwell'&&elapsed>=1)||(activationRef.current==='pinch'&&started))&&now-lastClickRef.current>350){
      held.fired=true;lastClickRef.current=now;
      activateRef.current(candidate as Target);
     }
     setCursor({x,y,progress:progressed||0,pinch:pinching});
    }catch(e){console.warn('Holo tracking frame skipped:',e);}
   };
   rafRef.current=requestAnimationFrame(tick);
  }catch(e){
   if(token!==tokenRef.current)return;
   stop();setStatus('error');
   const name=e instanceof DOMException?e.name:'';
   setError(name==='NotAllowedError'?'Camera permission denied. You can continue using the site normally.':name==='NotFoundError'?'No webcam was detected.':e instanceof Error?e.message:'Unable to start camera.');
  }
 };
 const switchMode=(next:Mode)=>{modeRef.current=next;setMode(next);if(next==='scroll'){keyboardRef.current=false;setKeyboard(false);}clearTarget();};
 const switchKeyboard=(next:boolean)=>{keyboardRef.current=next;setKeyboard(next);clearTarget();if(next){modeRef.current='point';setMode('point');setMinimized(true);}};
 return <>
  <div className="holo-launch holo-control">
   {status==='off'||status==='error'?<button type="button" className="holo-open" onClick={start}><Scan size={19}/> <span>HOLO CONTROL</span><i/></button>:minimized?<div className="holo-minimized"><span><i/> {status==='ready'?'HOLO ACTIVE':'CONNECTING…'}</span><button onClick={()=>setMinimized(false)} aria-label="Expand Holo Control"><ChevronUp size={16}/></button><button onClick={stop} aria-label="Stop webcam"><X size={16}/></button></div>:null}
  </div>
  <aside className={'holo-console holo-control '+((status==='off'||status==='error')?'holo-hidden':minimized?'holo-hidden':'')} aria-label="Holographic gesture navigation controller">
   <div className="holo-console-head"><div><i/><strong>HOLO / NAVIGATOR</strong><small>ONE-HAND CONTROL · V1</small></div><button onClick={()=>setMinimized(true)} aria-label="Minimize Holo controls"><ChevronDown size={19}/></button><button onClick={stop} aria-label="Stop camera"><X size={20}/></button></div>
   <div className="holo-preview"><video ref={videoRef} muted playsInline autoPlay className={status==='ready'?'visible':''}/><span>{status==='loading'?'LOADING HAND MODEL…':cursor?'HAND TRACKED':'SHOW YOUR HAND'}</span><b>{backend||'CAMERA'}</b></div>
   <div className="holo-console-modes" role="group" aria-label="Gesture navigation mode"><button aria-pressed={mode==='point'} className={mode==='point'?'active':''} onClick={()=>switchMode('point')}><MousePointer2 size={14}/> POINT / CLICK</button><button aria-pressed={mode==='scroll'} className={mode==='scroll'?'active':''} onClick={()=>switchMode('scroll')}><ArrowDown size={14}/> SCROLL</button></div>
   <button className={'holo-keyboard-toggle '+(keyboard?'active':'')} onClick={()=>switchKeyboard(!keyboard)}><Keyboard size={15}/> {keyboard?'CLOSE AIR KEYBOARD':'OPEN AIR KEYBOARD'}</button>
   <div className="holo-calibration"><label>REACH <span>{sensitivity.toFixed(1)}×</span><input aria-label="Pointer movement range" type="range" min="0.8" max="1.7" step="0.1" value={sensitivity} onChange={e=>{setSensitivity(Number(e.target.value));}}/></label></div>
   <div className="holo-console-info"><span><Hand size={14}/> ONE HAND ONLY</span><span>HOVER {activation==='dwell'?'1 SEC':'THEN PINCH'} TO CLICK</span></div>
   <div className="holo-method" role="group" aria-label="How to click"><button className={activation==='dwell'?'active':''} onClick={()=>setActivation('dwell')} aria-pressed={activation==='dwell'}>AUTO CLICK</button><button className={activation==='pinch'?'active':''} onClick={()=>setActivation('pinch')} aria-pressed={activation==='pinch'}>PINCH</button></div>
   <div className="holo-state"><span>TARGET</span><strong>{targetName}</strong></div>
   <button className="holo-power" onClick={stop}><CameraOff size={15}/> STOP CAMERA</button>
   <p>Webcam starts on demand. Video is processed on your device. The MediaPipe model downloads from third parties, and the SDK may transmit usage metrics.</p>
  </aside>
  {status==='error'&&<div className="holo-error holo-control" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
  {status==='ready'&&cursor&&<div className={'holo-hand-pointer '+(cursor.pinch?'pinch':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%','--holo-progress':(cursor.progress*360)+'deg'} as CSSProperties} aria-hidden="true"><i/><span>{mode==='scroll'?'SCROLL':keyboard?'TYPE':'HOLD'}</span></div>}
  {status==='ready'&&mode==='scroll'&&!keyboard&&<div className="holo-scroll-beacons" aria-hidden="true"><div><ArrowUp size={18}/> LIFT HAND TO SCROLL UP</div><div><ArrowDown size={18}/> LOWER HAND TO SCROLL DOWN</div></div>}
  {status==='ready'&&keyboard&&<div className="holo-air-console holo-control" aria-label="Holographic typing keyboard">
   <div className="holo-air-head"><div><Keyboard size={18}/><strong>AIR TYPE / HOLOGRAPHIC KEYBOARD</strong></div><button onClick={()=>switchKeyboard(false)}><X size={17}/> CLOSE</button></div>
   <div className="holo-air-input">{focusRef.current&&document.contains(focusRef.current)?<span>WRITING INTO: {focusRef.current.getAttribute('placeholder')||focusRef.current.getAttribute('name')||'SELECTED FIELD'}</span>:<span>DEMO PAD · CLICK A TEXT FIELD TO TYPE ON THE PAGE</span>}<output>{focusRef.current&&document.contains(focusRef.current)?focusRef.current.value.slice(-48):note.slice(-48)}</output></div>
   <div className="holo-air-keys">{ROWS.map((row,i)=><div className="holo-air-row" key={i}>{row.split('').map(letter=><button type="button" key={letter} data-holo-key={letter} className={hoverKey===letter?'selected':''} onClick={()=>insertText(letter)}>{letter}</button>)}</div>)}<div className="holo-air-row holo-air-utils"><button data-holo-key="BACK" className={hoverKey==='BACK'?'selected':''} onClick={()=>insertText('BACK')}>BACKSPACE</button><button data-holo-key="SPACE" className={hoverKey==='SPACE'?'selected':''} onClick={()=>insertText('SPACE')}>SPACE</button><button data-holo-key="CLEAR" className={hoverKey==='CLEAR'?'selected':''} onClick={()=>insertText('CLEAR')}>CLEAR</button></div></div>
   <div className="holo-air-foot">POINT TO A KEY · HOLD STILL UNTIL THE RING COMPLETES · NO PINCH REQUIRED</div>
  </div>}
 </>;
}

import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent as ReactPointerEvent} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Camera,CameraOff,Check,Copy,Hand,Keyboard,Layers3,Link2,MousePointer2,RotateCcw,ShieldCheck,Sparkles,Trash2,Video,Workflow,Zap} from 'lucide-react';

type Mode='keyboard'|'cube'|'workflow';
type CameraStatus='off'|'loading'|'ready'|'error';
type Point={x:number;y:number;z:number};
type Tracker={detectForVideo:(video:HTMLVideoElement,timestamp:number)=>{landmarks:Point[][]};close:()=>void};
type Cursor={x:number;y:number;pinching:boolean};
type Task={id:string;name:string;detail:string;x:number;y:number;done:boolean};
const wasmUrl='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const modelUrl='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const starterTasks:Task[]=[
 {id:'A',name:'Requirements',detail:'Scope & acceptance',x:22,y:30,done:true},
 {id:'B',name:'WBS design',detail:'Work packages',x:72,y:26,done:false},
 {id:'C',name:'Automation',detail:'Rules & triggers',x:28,y:71,done:false},
 {id:'D',name:'Quality review',detail:'Risks & controls',x:77,y:70,done:false}
];
const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const modes:{id:Mode;title:string;sub:string;Icon:typeof Keyboard}[]=[
 {id:'keyboard',title:'Air Keyboard',sub:'Type in the air',Icon:Keyboard},
 {id:'cube',title:'3D Control',sub:'Rotate an object',Icon:Layers3},
 {id:'workflow',title:'WBS Builder',sub:'Link work packages',Icon:Workflow}
];
export default function GestureLab(){
 const [mode,setMode]=useState<Mode>('keyboard');
 const [status,setStatus]=useState<CameraStatus>('off');
 const [error,setError]=useState('');
 const [tracking,setTracking]=useState(false);
 const [cursor,setCursor]=useState<Cursor|null>(null);
 const [typing,setTyping]=useState('HELLO AI PM LAB');
 const [hint,setHint]=useState('Start the camera or use your mouse to try the demo.');
 const [cubeAngles,setCubeAngles]=useState({x:-21,y:31});
 const [cubeExpanded,setCubeExpanded]=useState(false);
 const [tasks,setTasks]=useState<Task[]>(starterTasks);
 const [connections,setConnections]=useState<[string,string][]>([['A','B']]);
 const [linkFrom,setLinkFrom]=useState<string|null>(null);
 const [copied,setCopied]=useState(false);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const stageRef=useRef<HTMLDivElement|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const trackerRef=useRef<Tracker|null>(null);
 const rafRef=useRef(0);
 const sessionRef=useRef(0);
 const pinchRef=useRef(false);
 const lastActionRef=useRef(0);
 const smoothRef=useRef({x:.5,y:.5});
 const modeRef=useRef(mode);
 const tasksRef=useRef(tasks);
 const handGrabRef=useRef<string|null>(null);
 const pointerGrabRef=useRef<{id:string;moved:boolean}|null>(null);
 const [gpuStatus,setGpuStatus]=useState('');
 modeRef.current=mode;
 tasksRef.current=tasks;
 const keyAction=useCallback((value:string)=>{
  if(value==='CLEAR')setTyping('');
  else if(value==='BACK')setTyping(s=>s.slice(0,-1));
  else if(value==='SPACE')setTyping(s=>(s+' ').slice(0,220));
  else setTyping(s=>(s+value).slice(0,220));
  setHint(value==='BACK'?'Backspace':value==='SPACE'?'Space':value==='CLEAR'?'Text cleared':'Typed: '+value);
 },[]);
 const moveTask=useCallback((id:string,x:number,y:number)=>{
  setTasks(old=>{const updated=old.map(t=>t.id===id?{...t,x:clamp(x*100,12,88),y:clamp(y*100,16,85)}:t);tasksRef.current=updated;return updated;});
 },[]);
 const addLink=useCallback((from:string,to:string)=>{
  if(from===to)return;
  setConnections(old=>old.some(pair=>pair[0]===from&&pair[1]===to)?old:[...old,[from,to]]);
  setHint('Dependency connected: '+from+' → '+to);
 },[]);
 const nearestTask=useCallback((from:string,x:number,y:number)=>{
  const other=tasksRef.current.filter(t=>t.id!==from).map(t=>({id:t.id,d:Math.hypot(t.x/100-x,t.y/100-y)})).sort((a,b)=>a.d-b.d)[0];
  if(other&&other.d<.16)addLink(from,other.id);
 },[addLink]);
 const applyGesture=useCallback((x:number,y:number,isPinching:boolean,started:boolean,ended:boolean)=>{
  const activeMode=modeRef.current;
  if(activeMode==='keyboard'){
   if(!started)return;
   const rect=stageRef.current?.getBoundingClientRect();
   if(!rect)return;
   const el=document.elementFromPoint(rect.left+x*rect.width,rect.top+y*rect.height) as HTMLElement|null;
   const key=el?.closest('[data-air-key]') as HTMLElement|null;
   if(key?.dataset.airKey)keyAction(key.dataset.airKey);
   return;
  }
  if(activeMode==='cube'){
   if(started){setCubeExpanded(v=>!v);setHint('Pinch registered · size toggled');}
   if(!isPinching)setCubeAngles({x:clamp((.5-y)*74,-48,48),y:(x-.5)*170});
   return;
  }
  if(activeMode==='workflow'){
   if(started){
    const r=stageRef.current?.getBoundingClientRect();
    if(!r)return;
    const el=document.elementFromPoint(r.left+x*r.width,r.top+y*r.height) as HTMLElement|null;
    const task=el?.closest('[data-task-id]') as HTMLElement|null;
    handGrabRef.current=task?.dataset.taskId??null;
    if(handGrabRef.current)setLinkFrom(handGrabRef.current);
   }else if(isPinching&&handGrabRef.current){
    moveTask(handGrabRef.current,x,y);
   }else if(ended&&handGrabRef.current){
    nearestTask(handGrabRef.current,x,y);
    handGrabRef.current=null;
   }
  }
 },[keyAction,moveTask,nearestTask]);
 const gestureRef=useRef(applyGesture);
 gestureRef.current=applyGesture;
 const release=useCallback(()=>{
  cancelAnimationFrame(rafRef.current);
  rafRef.current=0;
  trackerRef.current?.close();
  trackerRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());
  streamRef.current=null;
  if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
  pinchRef.current=false;
  handGrabRef.current=null;
 },[]);
 useEffect(()=>()=>{sessionRef.current++;release();},[release]);
 const stop=()=>{
  sessionRef.current++;
  release();
  setStatus('off');setTracking(false);setCursor(null);setGpuStatus('');
  setHint('Camera stopped. Use mouse, touch or keyboard to continue.');
 };
 const start=async()=>{
  if(status==='loading'||status==='ready')return;
  if(!navigator.mediaDevices?.getUserMedia){
   setError('Camera access needs a modern browser on HTTPS or localhost.');
   setStatus('error');return;
  }
  const token=++sessionRef.current;
  setStatus('loading');setError('');setHint('Requesting webcam permission…');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
   if(token!==sessionRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   streamRef.current=stream;
   const video=videoRef.current;
   if(!video)throw new Error('Camera preview unavailable.');
   video.srcObject=stream;
   await video.play();
   setHint('Loading hand-tracking model. This may take a few seconds…');
   const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
   if(token!==sessionRef.current)return;
   const fileset=await FilesetResolver.forVisionTasks(wasmUrl);
   if(token!==sessionRef.current)return;
   let tracker:Tracker;
   try{
    tracker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:modelUrl,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minTrackingConfidence:.55}) as Tracker;
    setGpuStatus('GPU');
   }catch{
    tracker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:modelUrl,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minTrackingConfidence:.55}) as Tracker;
    setGpuStatus('CPU');
   }
   if(token!==sessionRef.current){tracker.close();return;}
   trackerRef.current=tracker;
   setStatus('ready');setHint('Show your hand. Move the index finger to aim; pinch to interact.');
   let lastFrame=0,lastVideoTime=-1;
   const tick=(time:number)=>{
    if(token!==sessionRef.current)return;
    rafRef.current=requestAnimationFrame(tick);
    if(document.hidden||time-lastFrame<67||!video.videoWidth||video.currentTime===lastVideoTime)return;
    lastFrame=time;lastVideoTime=video.currentTime;
    try{
     const result=tracker.detectForVideo(video,time);
     const hand=result.landmarks?.[0];
     if(!hand){
      setTracking(false);setCursor(null);pinchRef.current=false;handGrabRef.current=null;return;
     }
     setTracking(true);
     const finger=hand[8],thumb=hand[4],leftPalm=hand[5],rightPalm=hand[17];
     if(!finger||!thumb||!leftPalm||!rightPalm)return;
     const sm=smoothRef.current;
     const x=sm.x=sm.x*.61+clamp(1-finger.x,0,1)*.39;
     const y=sm.y=sm.y*.61+clamp(finger.y,0,1)*.39;
     const ratio=distance(finger,thumb)/Math.max(.065,distance(leftPalm,rightPalm));
     const was=pinchRef.current;
     const pinching=was?ratio<.66:ratio<.39;
     const started=pinching&&!was&&time-lastActionRef.current>340;
     const ended=was&&!pinching;
     pinchRef.current=pinching;
     if(started)lastActionRef.current=time;
     setCursor({x,y,pinching});
     gestureRef.current(x,y,pinching,started,ended);
    }catch(e){
     console.warn('Hand tracking paused:',e);
     setTracking(false);
    }
   };
   rafRef.current=requestAnimationFrame(tick);
  }catch(e){
   if(token!==sessionRef.current)return;
   release();
   const name=e instanceof DOMException?e.name:'';
   setError(name==='NotAllowedError'?'Camera permission was denied. You can still use mouse and touch.':name==='NotFoundError'?'No compatible webcam found.':e instanceof Error?e.message:'Could not start the camera.');
   setStatus('error');setTracking(false);setCursor(null);setHint('Camera unavailable; demo controls still work without it.');
  }
 };
 const chooseMode=(next:Mode)=>{
  modeRef.current=next;setMode(next);
  pinchRef.current=false;handGrabRef.current=null;
  setHint(next==='keyboard'?'Pinch over a letter to type.':next==='cube'?'Move your hand to rotate; pinch to change size.':'Pinch a WBS card, move it and release near another card to link them.');
 };
 const pointerCoords=(e:ReactPointerEvent<HTMLElement>)=>{
  const r=stageRef.current?.getBoundingClientRect();if(!r)return null;
  return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};
 };
 const downTask=(e:ReactPointerEvent<HTMLButtonElement>,id:string)=>{
  const selected=linkFrom;
  if(selected&&selected!==id){addLink(selected,id);setLinkFrom(null);}
  else setLinkFrom(id);
  pointerGrabRef.current={id,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const dragTask=(e:ReactPointerEvent<HTMLButtonElement>)=>{
  if(!pointerGrabRef.current)return;
  const xy=pointerCoords(e);if(!xy)return;
  pointerGrabRef.current.moved=true;
  moveTask(pointerGrabRef.current.id,xy.x,xy.y);
 };
 const endTask=(e:ReactPointerEvent<HTMLButtonElement>)=>{
  const grab=pointerGrabRef.current;pointerGrabRef.current=null;
  const xy=pointerCoords(e);
  if(grab?.moved&&xy)nearestTask(grab.id,xy.x,xy.y);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const downCube=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
 const cubeMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
  if(!downCube.current)return;
  const dx=e.clientX-downCube.current.x,dy=e.clientY-downCube.current.y;
  setCubeAngles({x:clamp(downCube.current.rx-dy*.42,-55,55),y:downCube.current.ry+dx*.62});
 };
 const copy=async()=>{
  try{await navigator.clipboard.writeText(typing);setCopied(true);setTimeout(()=>setCopied(false),1600);}
  catch{setHint('Clipboard unavailable. Select and copy the text manually.');}
 };
 return <section className="gsl-page">
  <div className="wrap">
   <div className="gsl-back"><Link to="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</Link><span><i/> EXPERIMENTAL INTERACTION LAB / 2026</span></div>
   <header className="gsl-heading"><div><div className="eyebrow"><i/> HUMAN × MACHINE INTERACTION</div><h1>Gesture <em>Lab.</em></h1><p>Move your hands. Control an interface. Explore how computer vision can connect people, projects and intelligent systems.</p></div><div className="gsl-heading-mark"><Hand size={54}/><span>CAMERA-POWERED<br/>INTERACTION STUDY</span></div></header>
   <div className="gsl-privacy"><ShieldCheck size={18}/><span>Your camera starts <strong>only when you press Enable Camera</strong>. Video frames are processed locally in the browser; this demo does not record or upload them. On first use, MediaPipe model/WASM files are downloaded from external hosts. The MediaPipe SDK may report usage metrics to Google. <strong>Stop Camera</strong> immediately closes the stream.</span></div>
   <div className="gsl-mode-tabs" role="group" aria-label="Choose an interactive experiment">{modes.map(({id,title,sub,Icon},i)=><button key={id} type="button" aria-pressed={mode===id} className={mode===id?'active':''} onClick={()=>chooseMode(id)}><span>0{i+1} / EXPERIENCE</span><Icon size={23}/><strong>{title}</strong><small>{sub}</small></button>)}</div>
   <div className="gsl-workspace">
    <div className="gsl-interactive">
     <div className="gsl-stage-top"><span><i/> {mode==='keyboard'?'AIR KEYBOARD':mode==='cube'?'SPATIAL CONTROL':'PROJECT FLOW CANVAS'}</span><b>{status==='ready'?(tracking?'HAND TRACKED':'WAITING FOR HAND'):'POINTER CONTROLS READY'}</b></div>
     <div className={'gsl-stage gsl-stage-'+mode} ref={stageRef}>
      {mode==='keyboard'&&<div className="gsl-keyboard-panel">
       <div className="gsl-typed"><div><span>LIVE INPUT / AIR TYPING</span><button type="button" onClick={copy} aria-label="Copy typed text">{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'COPIED':'COPY'}</button></div><textarea value={typing} onChange={e=>setTyping(e.target.value.slice(0,220))} aria-label="Text composed on virtual keyboard" placeholder="Your text appears here…" rows={3}/><small>{typing.length} / 220 CHARACTERS</small></div>
       <div className="gsl-keys">{rows.map((row,i)=><div className="gsl-key-row" key={i}>{row.split('').map(char=><button type="button" data-air-key={char} key={char} onClick={()=>keyAction(char)}>{char}</button>)}</div>)}
        <div className="gsl-key-row gsl-key-functions"><button type="button" data-air-key="CLEAR" onClick={()=>keyAction('CLEAR')}><Trash2 size={16}/> CLEAR</button><button type="button" data-air-key="SPACE" onClick={()=>keyAction('SPACE')}>SPACE</button><button type="button" data-air-key="BACK" onClick={()=>keyAction('BACK')}>⌫ BACKSPACE</button></div>
       </div><p className="gsl-stage-caption">Index finger moves the pointer · thumb + index pinch selects a key · mouse/touch also work.</p>
      </div>}
      {mode==='cube'&&<div className="gsl-cube-panel">
       <div className="gsl-cube-scene"><div className="gsl-cube-orbit"/><div className="gsl-3d-object" style={{transform:'rotateX('+cubeAngles.x+'deg) rotateY('+cubeAngles.y+'deg) scale('+(cubeExpanded?1.22:1)+')'}} onPointerDown={e=>{downCube.current={x:e.clientX,y:e.clientY,rx:cubeAngles.x,ry:cubeAngles.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={cubeMove} onPointerUp={e=>{downCube.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{downCube.current=null;}}>
        {['AI + PM','AUTOMATION','WORKFLOWS','WBS','COORDINATION','DELIVERY'].map((s,i)=><div key={s} className={'gsl-cube-face gsl-cube-face-'+i}><Zap size={26}/><strong>{s}</strong><small>GESTURE / SPATIAL UI</small></div>)}
       </div><span>3D INTERACTION FIELD / 01</span></div>
       <div className="gsl-cube-options"><button onClick={()=>setCubeAngles(v=>({...v,y:v.y-35}))} aria-label="Rotate cube left"><ArrowLeft size={18}/></button><button onClick={()=>setCubeAngles(v=>({...v,y:v.y+35}))} aria-label="Rotate cube right"><ArrowRight size={18}/></button><button onClick={()=>setCubeExpanded(v=>!v)}>{cubeExpanded?'SHRINK':'EXPAND'}</button><button onClick={()=>{setCubeAngles({x:-21,y:31});setCubeExpanded(false);}}><RotateCcw size={17}/> RESET</button></div>
       <p className="gsl-stage-caption">Move your index finger to rotate · pinch to expand/shrink · drag the cube with mouse/touch.</p>
      </div>}
      {mode==='workflow'&&<div className="gsl-wbs-panel">
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gsl-wbs-wires" aria-hidden="true">{connections.map(([a,b])=>{const x=tasks.find(t=>t.id===a),y=tasks.find(t=>t.id===b);if(!x||!y)return null;return <line key={a+'-'+b} x1={x.x} y1={x.y} x2={y.x} y2={y.y}/>;})}</svg>
       {tasks.map(t=><button key={t.id} type="button" data-task-id={t.id} className={'gsl-wbs-node '+(linkFrom===t.id?'selected':'')}
        style={{left:t.x+'%',top:t.y+'%'} as CSSProperties} onPointerDown={e=>downTask(e,t.id)} onPointerMove={dragTask} onPointerUp={endTask} onPointerCancel={()=>{pointerGrabRef.current=null;}}>
        <small>WBS / {t.id}</small><strong>{t.name}</strong><span>{t.detail}</span><i>{t.done?'REVIEWED':'PLANNED'}</i></button>)}
       <div className="gsl-wbs-corner">PROJECT CONTROL / DEPENDENCY MAP</div>
      </div>}
      {cursor&&status==='ready'&&<div className={'gsl-hand-cursor '+(cursor.pinching?'pinching':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%'}} aria-hidden="true"><span/></div>}
     </div>
     <div className="gsl-stage-footer"><span><MousePointer2 size={15}/> {hint}</span><span>PROTOTYPE · NOT A PRODUCTION AUTOMATION</span></div>
    </div>
    <aside className="gsl-side">
     <div className="gsl-camera-panel"><div className="gsl-camera-heading"><span><Video size={18}/> CAMERA INPUT</span><small>{status==='ready'?(tracking?'TRACKING':'READY'):status.toUpperCase()}</small></div>
      <div className="gsl-video-shell"><video ref={videoRef} playsInline muted autoPlay className={status==='ready'?'on':''}/>{status!=='ready'&&<div className="gsl-no-video"><CameraOff size={30}/><strong>Camera off</strong><span>Enable the webcam to track your hand. Manual controls work anytime.</span></div>}</div>
      {error&&<p role="alert" className="gsl-camera-error">{error}</p>}
      <button type="button" className={'gsl-camera-btn '+(status==='ready'?'gsl-camera-stop':'')} onClick={status==='ready'?stop:start} disabled={status==='loading'}>{status==='ready'?<><CameraOff size={18}/> STOP CAMERA</>:status==='loading'?<><Camera size={18}/> LOADING MODEL…</>:<><Camera size={18}/> ENABLE CAMERA</>}</button>
      <div className="gsl-camera-meta"><span>{status==='ready'?'MODEL READY'+(gpuStatus?' · '+gpuStatus:''):'MEDIAPIPE / LOCAL INFERENCE'}</span><span>{tracking?'● HAND DETECTED':'○ NO HAND DATA'}</span></div>
     </div>
     <div className="gsl-guide"><div><Sparkles size={18}/><strong>HOW TO INTERACT</strong></div>
      {mode==='keyboard'?<p>Hold your index finger toward the camera to aim. Touch your thumb and index finger together briefly to press a virtual key. Avoid keeping them together between letters.</p>:mode==='cube'?<p>Move your hand left, right, up or down to rotate. Pinch once to change size. You can also drag the 3D object with mouse or touch.</p>:<p>Pinch over a work package and move it. Release near another package to create a dependency. With a mouse, click one card then another to link them, or drag to reposition.</p>}
      <div className="gsl-guide-tags"><span>NO CAMERA REQUIRED FOR MANUAL MODE</span><span>{mode==='workflow'?connections.length+' DEPENDENCIES':'GESTURE + POINTER'}</span></div>
      {mode==='workflow'&&<button type="button" onClick={()=>{setTasks(starterTasks);tasksRef.current=starterTasks;setConnections([['A','B']]);setLinkFrom(null);setHint('WBS reset.');}}><RotateCcw size={16}/> RESET WBS</button>}
     </div>
    </aside>
   </div>
   <footer className="gsl-footer"><span>AN EXPERIMENT IN COMPUTER VISION, HUMAN INTERACTION AND PROJECT WORKFLOWS.</span><Link to="/projects">EXPLORE REAL PROJECTS <ArrowRight size={16}/></Link></footer>
  </div>
 </section>;
}

import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent as ReactPointerEvent} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Camera,CameraOff,Check,Copy,Hand,Keyboard,Layers3,Link2,MousePointer2,RotateCcw,ShieldCheck,Sparkles,Trash2,Video,Workflow,Zap} from 'lucide-react';

type Mode='keyboard'|'cube'|'workflow';
type CameraStatus='off'|'loading'|'ready'|'error';
type Point={x:number;y:number;z:number};
type Tracker={detectForVideo:(video:HTMLVideoElement,timestamp:number)=>{landmarks:Point[][]};close:()=>void};
type Cursor={x:number;y:number;pinching:boolean;dwell:number};
type InputMethod='pinch'|'dwell';
type Sensitivity='easy'|'balanced'|'precise';
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
 const [hoveredKey,setHoveredKey]=useState<string|null>(null);
 const [inputMethod,setInputMethod]=useState<InputMethod>('pinch');
 const [sensitivity,setSensitivity]=useState<Sensitivity>('easy');
 const [pinchMeter,setPinchMeter]=useState(0);
 const [rotationSpeed,setRotationSpeed]=useState(1.25);
 const keyboardKeysRef=useRef<HTMLDivElement|null>(null);
 const hoveredKeyRef=useRef<string|null>(null);
 const keyCandidateRef=useRef({key:'',since:0});
 const dwellRef=useRef({key:'',since:0,locked:false});
 const pinchCandidateRef=useRef({value:false,frames:0});
 const inputMethodRef=useRef(inputMethod);
 const sensitivityRef=useRef(sensitivity);
 const rotationSpeedRef=useRef(rotationSpeed);
 const cubeMotionRef=useRef<{x:number;y:number}|null>(null);
 inputMethodRef.current=inputMethod;
 sensitivityRef.current=sensitivity;
 rotationSpeedRef.current=rotationSpeed;
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
   if(!started||inputMethodRef.current!=='pinch')return;
   const key=hoveredKeyRef.current;
   if(key)keyAction(key);
   else setHint('Aim at a highlighted key before pinching.');
   return;
  }
  if(activeMode==='cube'){
   if(started){setCubeExpanded(v=>!v);setHint('Pinch detected · cube size changed');}
   const prev=cubeMotionRef.current;
   cubeMotionRef.current={x,y};
   if(prev&&!isPinching){
    const dx=clamp(x-prev.x,-.09,.09),dy=clamp(y-prev.y,-.09,.09);
    if(Math.abs(dx)+Math.abs(dy)>.0015){
     const speed=rotationSpeedRef.current;
     setCubeAngles(v=>({x:clamp(v.x-dy*330*speed,-84,84),y:v.y+dx*540*speed}));
    }
   }
   return;
  }
  if(activeMode==='workflow'){
   if(started){
    const nearest=tasksRef.current.map(t=>({id:t.id,d:Math.hypot(t.x/100-x,t.y/100-y)})).sort((a,b)=>a.d-b.d)[0];
    handGrabRef.current=nearest&&nearest.d<.17?nearest.id:null;
    if(handGrabRef.current){setLinkFrom(handGrabRef.current);setHint('Moving work package '+handGrabRef.current);}
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
  pinchCandidateRef.current={value:false,frames:0};
  cubeMotionRef.current=null;
  handGrabRef.current=null;
  hoveredKeyRef.current=null;
  keyCandidateRef.current={key:'',since:0};
  dwellRef.current={key:'',since:0,locked:false};
 },[]);
 useEffect(()=>()=>{sessionRef.current++;release();},[release]);
 const stop=()=>{
  sessionRef.current++;
  release();
  setStatus('off');setTracking(false);setCursor(null);setGpuStatus('');setPinchMeter(0);setHoveredKey(null);
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
   let useCpu=false;
   try{
    tracker=await HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:modelUrl,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minTrackingConfidence:.55}) as Tracker;
    setGpuStatus('GPU');
   }catch{
    useCpu=true;
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
    if(document.hidden||time-lastFrame<(useCpu?56:37)||!video.videoWidth||video.currentTime===lastVideoTime)return;
    lastFrame=time;lastVideoTime=video.currentTime;
    try{
     const result=tracker.detectForVideo(video,time);
     const hand=result.landmarks?.[0];
     if(!hand){
      setTracking(false);setCursor(null);setPinchMeter(0);
      pinchRef.current=false;pinchCandidateRef.current={value:false,frames:0};
      cubeMotionRef.current=null;handGrabRef.current=null;
      hoveredKeyRef.current=null;setHoveredKey(null);
      keyCandidateRef.current={key:'',since:0};dwellRef.current={key:'',since:0,locked:false};
      return;
     }
     setTracking(true);
     const finger=hand[8],thumb=hand[4],leftPalm=hand[5],rightPalm=hand[17];
     if(!finger||!thumb||!leftPalm||!rightPalm)return;
     const sm=smoothRef.current;
     const x=sm.x=sm.x*.36+clamp(1-finger.x,0,1)*.64;
     const y=sm.y=sm.y*.36+clamp(finger.y,0,1)*.64;
     const ratio=distance(finger,thumb)/Math.max(.065,distance(leftPalm,rightPalm));
     const limits=sensitivityRef.current==='easy'?[.68,.88]:sensitivityRef.current==='balanced'?[.54,.76]:[.42,.64];
     const was=pinchRef.current;
     const candidateClosed=was?ratio<limits[1]:ratio<limits[0];
     const candidate=pinchCandidateRef.current;
     if(candidate.value!==candidateClosed){candidate.value=candidateClosed;candidate.frames=1;}
     else candidate.frames++;
     const pinching=candidate.frames>=2?candidateClosed:was;
     const started=pinching&&!was&&time-lastActionRef.current>240;
     const ended=was&&!pinching;
     pinchRef.current=pinching;
     if(started)lastActionRef.current=time;
     setPinchMeter(Math.round(clamp(1-ratio/1.3,0,1)*100));
     let px=x,py=y,dwell=0;
     const activeMode=modeRef.current;
     if(activeMode==='keyboard'){
      const keys=keyboardKeysRef.current,stage=stageRef.current;
      if(keys&&stage){
       const kr=keys.getBoundingClientRect(),sr=stage.getBoundingClientRect();
       const targetX=kr.left+kr.width*clamp((x-.13)/.74,0,1);
       const targetY=kr.top+kr.height*clamp((y-.16)/.68,0,1);
       px=clamp((targetX-sr.left)/sr.width,0,1);
       py=clamp((targetY-sr.top)/sr.height,0,1);
       let key='';
       let nearest=Infinity;
       keys.querySelectorAll<HTMLButtonElement>('[data-air-key]').forEach(button=>{
        const r=button.getBoundingClientRect();
        const dx=clamp(targetX,r.left,r.right)-targetX;
        const dy=clamp(targetY,r.top,r.bottom)-targetY;
        const d=dx*dx+dy*dy;
        if(d<nearest){nearest=d;key=button.dataset.airKey||'';}
       });
       const candidateKey=keyCandidateRef.current;
       if(candidateKey.key!==key){candidateKey.key=key;candidateKey.since=time;}
       if(key&&time-candidateKey.since>=90&&hoveredKeyRef.current!==key){
        hoveredKeyRef.current=key;setHoveredKey(key);
        dwellRef.current={key,since:time,locked:false};
       }
       const activeKey=hoveredKeyRef.current;
       if(inputMethodRef.current==='dwell'&&activeKey){
        const state=dwellRef.current;
        if(state.key!==activeKey){state.key=activeKey;state.since=time;state.locked=false;}
        dwell=clamp((time-state.since)/1050,0,1);
        if(dwell>=1&&!state.locked){
         state.locked=true;keyAction(activeKey);
        }
       }
      }
     }else if(activeMode==='workflow'){
      px=clamp((x-.12)/.76,0,1);
      py=clamp((y-.12)/.76,0,1);
     }
     setCursor({x:px,y:py,pinching,dwell});
     gestureRef.current(px,py,pinching,started,ended);
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
  pinchRef.current=false;pinchCandidateRef.current={value:false,frames:0};
  handGrabRef.current=null;cubeMotionRef.current=null;
  hoveredKeyRef.current=null;setHoveredKey(null);
  keyCandidateRef.current={key:'',since:0};dwellRef.current={key:'',since:0,locked:false};
  setHint(next==='keyboard'?'Aim at a highlighted letter and pinch, or switch to dwell typing.':next==='cube'?'Move your hand to rotate continuously; pinch to change size.':'Pinch a WBS card, move it and release near another card to link them.');
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
       <div className="gsl-keyboard-hud"><span>{status==='ready'?(hoveredKey?'TARGET: '+(hoveredKey==='SPACE'?'SPACE':hoveredKey):'SHOW YOUR INDEX FINGER'):'CAMERA OPTIONAL'}</span><span>{inputMethod==='dwell'?'HOLD 1 SECOND TO TYPE':'PINCH TO TYPE'}</span></div>
       <div className="gsl-keys" ref={keyboardKeysRef}>{rows.map((row,i)=><div className="gsl-key-row" key={i}>{row.split('').map(char=><button type="button" data-air-key={char} key={char} className={hoveredKey===char&&status==='ready'?'gsl-key-target':''} onClick={()=>keyAction(char)}>{char}</button>)}</div>)}
        <div className="gsl-key-row gsl-key-functions"><button type="button" data-air-key="CLEAR" className={hoveredKey==='CLEAR'&&status==='ready'?'gsl-key-target':''} onClick={()=>keyAction('CLEAR')}><Trash2 size={16}/> CLEAR</button><button type="button" data-air-key="SPACE" className={hoveredKey==='SPACE'&&status==='ready'?'gsl-key-target':''} onClick={()=>keyAction('SPACE')}>SPACE</button><button type="button" data-air-key="BACK" className={hoveredKey==='BACK'&&status==='ready'?'gsl-key-target':''} onClick={()=>keyAction('BACK')}>⌫ BACKSPACE</button></div>
       </div><p className="gsl-stage-caption">Aim at the highlighted key · pinch to select, or choose Dwell to type by holding still.</p>
      </div>}
      {mode==='cube'&&<div className="gsl-cube-panel">
       <div className="gsl-cube-scene"><div className="gsl-cube-orbit"/><div className="gsl-3d-object" style={{transform:'rotateX('+cubeAngles.x+'deg) rotateY('+cubeAngles.y+'deg) scale('+(cubeExpanded?1.22:1)+')'}} onPointerDown={e=>{downCube.current={x:e.clientX,y:e.clientY,rx:cubeAngles.x,ry:cubeAngles.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={cubeMove} onPointerUp={e=>{downCube.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{downCube.current=null;}}>
        {['AI + PM','AUTOMATION','WORKFLOWS','WBS','COORDINATION','DELIVERY'].map((s,i)=><div key={s} className={'gsl-cube-face gsl-cube-face-'+i}><Zap size={26}/><strong>{s}</strong><small>GESTURE / SPATIAL UI</small></div>)}
       </div><span>3D INTERACTION FIELD / 01</span></div>
       <div className="gsl-cube-options"><button onClick={()=>setCubeAngles(v=>({...v,y:v.y-35}))} aria-label="Rotate cube left"><ArrowLeft size={18}/></button><button onClick={()=>setCubeAngles(v=>({...v,y:v.y+35}))} aria-label="Rotate cube right"><ArrowRight size={18}/></button><button onClick={()=>setCubeExpanded(v=>!v)}>{cubeExpanded?'SHRINK':'EXPAND'}</button><button onClick={()=>{setCubeAngles({x:-21,y:31});setCubeExpanded(false);}}><RotateCcw size={17}/> RESET</button></div>
       <p className="gsl-stage-caption">Move your hand to rotate continuously · pinch to resize · drag with mouse/touch.</p>
      </div>}
      {mode==='workflow'&&<div className="gsl-wbs-panel">
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gsl-wbs-wires" aria-hidden="true">{connections.map(([a,b])=>{const x=tasks.find(t=>t.id===a),y=tasks.find(t=>t.id===b);if(!x||!y)return null;return <line key={a+'-'+b} x1={x.x} y1={x.y} x2={y.x} y2={y.y}/>;})}</svg>
       {tasks.map(t=><button key={t.id} type="button" data-task-id={t.id} className={'gsl-wbs-node '+(linkFrom===t.id?'selected':'')}
        style={{left:t.x+'%',top:t.y+'%'} as CSSProperties} onPointerDown={e=>downTask(e,t.id)} onPointerMove={dragTask} onPointerUp={endTask} onPointerCancel={()=>{pointerGrabRef.current=null;}}>
        <small>WBS / {t.id}</small><strong>{t.name}</strong><span>{t.detail}</span><i>{t.done?'REVIEWED':'PLANNED'}</i></button>)}
       <div className="gsl-wbs-corner">PROJECT CONTROL / DEPENDENCY MAP</div>
      </div>}
      {cursor&&status==='ready'&&<div className={'gsl-hand-cursor '+(cursor.pinching?'pinching':'')+(inputMethod==='dwell'&&mode==='keyboard'?' gsl-dwell-cursor':'')} style={{left:(cursor.x*100)+'%',top:(cursor.y*100)+'%','--gsl-dwell-deg':(cursor.dwell*360)+'deg'} as CSSProperties} aria-hidden="true"><span/></div>}
     </div>
     <div className="gsl-stage-footer"><span><MousePointer2 size={15}/> {hint}</span><span>PROTOTYPE · NOT A PRODUCTION AUTOMATION</span></div>
    </div>
    <aside className="gsl-side">
     <div className="gsl-camera-panel"><div className="gsl-camera-heading"><span><Video size={18}/> CAMERA INPUT</span><small>{status==='ready'?(tracking?'TRACKING':'READY'):status.toUpperCase()}</small></div>
      <div className="gsl-video-shell"><video ref={videoRef} playsInline muted autoPlay className={status==='ready'?'on':''}/>{status!=='ready'&&<div className="gsl-no-video">{status==='loading'?<Camera size={30}/>:<CameraOff size={30}/>}<strong>{status==='loading'?'Preparing hand tracking…':'Camera off'}</strong><span>{status==='loading'?'Downloading the model. You can cancel camera setup at any time.':'Enable the webcam to track your hand. Manual controls work anytime.'}</span></div>}</div>
      {error&&<p role="alert" className="gsl-camera-error">{error}</p>}
      <button type="button" className={'gsl-camera-btn '+(status==='ready'?'gsl-camera-stop':'')} onClick={status==='ready'||status==='loading'?stop:start}>{status==='ready'?<><CameraOff size={18}/> STOP CAMERA</>:status==='loading'?<><CameraOff size={18}/> CANCEL CAMERA SETUP</>:<><Camera size={18}/> ENABLE CAMERA</>}</button>
      <div className="gsl-camera-meta"><span>{status==='ready'?'MODEL READY'+(gpuStatus?' · '+gpuStatus:''):'MEDIAPIPE / LOCAL INFERENCE'}</span><span>{tracking?'● HAND DETECTED':'○ NO HAND DATA'}</span></div>
      {status==='ready'&&<div className="gsl-pinch-feedback"><div><span>THUMB + INDEX / CLOSURE</span><strong>{tracking?(cursor?.pinching?'PINCH DETECTED':pinchMeter+'%'):'WAITING FOR HAND'}</strong></div><div className="gsl-pinch-track"><i style={{width:pinchMeter+'%'}}/></div></div>}
     </div>
     <div className="gsl-guide"><div><Sparkles size={18}/><strong>HOW TO INTERACT</strong></div>
      {mode==='keyboard'&&<div className="gsl-input-modes"><span>HOW TO TYPE</span><div><button type="button" className={inputMethod==='pinch'?'active':''} aria-pressed={inputMethod==='pinch'} onClick={()=>{setInputMethod('pinch');inputMethodRef.current='pinch';}}>PINCH</button><button type="button" className={inputMethod==='dwell'?'active':''} aria-pressed={inputMethod==='dwell'} onClick={()=>{setInputMethod('dwell');inputMethodRef.current='dwell';dwellRef.current={key:'',since:0,locked:false};}}>HOLD 1 SEC</button></div></div>}
      <div className="gsl-input-modes"><span>PINCH SENSITIVITY</span><div>{(['easy','balanced','precise'] as Sensitivity[]).map(level=><button key={level} type="button" className={sensitivity===level?'active':''} aria-pressed={sensitivity===level} onClick={()=>{setSensitivity(level);sensitivityRef.current=level;pinchRef.current=false;pinchCandidateRef.current={value:false,frames:0};}}>{level.toUpperCase()}</button>)}</div></div>
      {mode==='cube'&&<label className="gsl-rotation-speed">ROTATION RESPONSE <strong>{rotationSpeed.toFixed(1)}×</strong><input type="range" min=".65" max="2.5" step=".15" value={rotationSpeed} onChange={e=>setRotationSpeed(Number(e.target.value))}/></label>}
      {mode==='keyboard'?<p>The pointer now covers the keyboard area and highlights your target. Pinch briefly to type, or choose Hold 1 Sec for automatic selection. Move to another key before repeating a held letter.</p>:mode==='cube'?<p>Move your hand to rotate continuously in either direction; the angle accumulates, so you can turn through 360°. Pinch to change size. Adjust Rotation Response if needed.</p>:<p>Pinch over a work package and move it. Release near another package to create a dependency. With a mouse, click one card then another to link them, or drag to reposition.</p>}
      <div className="gsl-guide-tags"><span>NO CAMERA REQUIRED FOR MANUAL MODE</span><span>{mode==='workflow'?connections.length+' DEPENDENCIES':'GESTURE + POINTER'}</span></div>
      {mode==='workflow'&&<button type="button" onClick={()=>{setTasks(starterTasks);tasksRef.current=starterTasks;setConnections([['A','B']]);setLinkFrom(null);setHint('WBS reset.');}}><RotateCcw size={16}/> RESET WBS</button>}
     </div>
    </aside>
   </div>
   <footer className="gsl-footer"><span>AN EXPERIMENT IN COMPUTER VISION, HUMAN INTERACTION AND PROJECT WORKFLOWS.</span><Link to="/projects">EXPLORE REAL PROJECTS <ArrowRight size={16}/></Link></footer>
  </div>
 </section>;
}

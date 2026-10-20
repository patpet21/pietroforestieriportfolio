import {useEffect,useRef,useState} from 'react';
import '../gesture-settings.css';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,ArrowUpRight,Camera,Keyboard,MousePointer2,RotateCcw,Settings2,Hand,SlidersHorizontal,Workflow,Layers3,Zap} from 'lucide-react';
import {
 GESTURE_SETTINGS_EVENT,
 navigationTouchTravel,readGestureSettings,resetGestureSettings,saveGestureSettings
} from '../lib/gesture/userSettings';
import type {GestureSettings} from '../lib/gesture/userSettings';

type Task={id:string;name:string;detail:string;x:number;y:number;done:boolean};
const STARTER_TASKS:Task[]=[
 {id:'A',name:'Requirements',detail:'Scope & acceptance',x:22,y:29,done:true},
 {id:'B',name:'WBS design',detail:'Work packages',x:73,y:26,done:false},
 {id:'C',name:'Automation',detail:'Rules & triggers',x:28,y:71,done:false},
 {id:'D',name:'Quality review',detail:'Risks & controls',x:76,y:72,done:false}
];

/** One global camera and one keyboard: this page edits their actual settings.
 * No second webcam, MediaPipe tracker, or in-page QWERTY instance. */
export default function GestureLab(){
 const [settings,setSettings]=useState<GestureSettings>(readGestureSettings);
 const [saved,setSaved]=useState(false);
 const [cubeAngles,setCubeAngles]=useState({x:-21,y:31});
 const [cubeExpanded,setCubeExpanded]=useState(false);
 const dragging=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
 const [tasks,setTasks]=useState<Task[]>(STARTER_TASKS);
 const [connections,setConnections]=useState<[string,string][]>([['A','B']]);
 const [linkFrom,setLinkFrom]=useState<string|null>(null);
 const [wbsMessage,setWbsMessage]=useState('Select one task, then another to create a dependency.');
 const selectTask=(id:string)=>{
  if(!linkFrom){setLinkFrom(id);setWbsMessage('Selected '+id+' · choose a destination.');return;}
  if(linkFrom!==id){
   setConnections(old=>old.some(([a,b])=>a===linkFrom&&b===id)?old:[...old,[linkFrom,id]]);
   setWbsMessage('Dependency '+linkFrom+' → '+id+' added.');
  }else setWbsMessage('Selection cleared.');
  setLinkFrom(null);
 };
 const resetWbs=()=>{setTasks(STARTER_TASKS);setConnections([['A','B']]);setLinkFrom(null);setWbsMessage('WBS reset.');};
 useEffect(()=>{
  const sync=()=>setSettings(readGestureSettings());
  window.addEventListener(GESTURE_SETTINGS_EVENT,sync);
  window.addEventListener('storage',sync);
  return()=>{window.removeEventListener(GESTURE_SETTINGS_EVENT,sync);window.removeEventListener('storage',sync);};
 },[]);
 const change=(patch:Partial<GestureSettings>)=>{
  setSettings(saveGestureSettings(patch));setSaved(true);
 };
 const reset=()=>{setSettings(resetGestureSettings());setSaved(true);};
 const touchButton=(label:string,sub:string,selected:boolean,onClick:()=>void)=>(
  <button type="button" key={label} className={'gsl-setting-choice'+(selected?' active':'')}
   aria-pressed={selected} onClick={onClick}><strong>{label}</strong><small>{sub}</small></button>
 );
 return <main className="gsl-page gsl-settings-page">
  <div className="wrap">
   <div className="gsl-back">
    <Link to="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</Link>
    <span>GESTUREOS / ONE SYSTEM</span>
   </div>
   <header className="gsl-settings-intro">
    <span className="gsl-settings-overline"><Settings2 size={15}/> SPATIAL CONTROL CENTER</span>
    <h1>GestureOS <em>Settings.</em></h1>
    <p>Configure the camera controls and the single floating air keyboard. Changes take effect in GestureOS immediately and stay saved in this browser.</p>
   </header>
   <div className="gsl-single-system">
    <div><Camera size={22}/><span><strong>ONE CAMERA</strong><small>Start, stop and preview tracking from SPATIAL CONTROL on the left. No second camera is needed.</small></span></div>
    <div><Keyboard size={22}/><span><strong>ONE KEYBOARD</strong><small>Use EXPERIMENTAL AIR KEYBOARD in the same left panel. There is no additional keyboard on this page.</small></span></div>
   </div>
   <section className="gsl-settings-grid" aria-label="GestureOS adjustable settings">
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><MousePointer2 size={21}/><div><small>01 / SITE NAVIGATION</small><h2>Click sensitivity</h2></div></div>
     <p>How far your index finger needs to move before a site click is confirmed. Choose FIRM to reduce accidental clicks.</p>
     <div className="gsl-setting-choices" role="group" aria-label="Navigation touch sensitivity">
      {touchButton('LIGHT','Less movement',settings.navigationTouch==='light',()=>change({navigationTouch:'light'}))}
      {touchButton('BALANCED','Default',settings.navigationTouch==='balanced',()=>change({navigationTouch:'balanced'}))}
      {touchButton('FIRM','Fewer false clicks',settings.navigationTouch==='firm',()=>change({navigationTouch:'firm'}))}
     </div>
     <div className="gsl-setting-current"><span>Navigation touch threshold</span><strong>{navigationTouchTravel(settings.navigationTouch).toFixed(3)}</strong></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><Hand size={21}/><div><small>02 / OPEN PALM</small><h2>Scroll response</h2></div></div>
     <p>Adjust how quickly an open palm scrolls the portfolio. This controls the same gesture engine used across every page.</p>
     <label className="gsl-setting-range" htmlFor="gesture-scroll-settings"><span>SCROLL SPEED</span><strong>{settings.scrollSpeed.toFixed(1)}×</strong></label>
     <input id="gesture-scroll-settings" aria-label="GestureOS scroll response" type="range" min=".7" max="4" step=".1"
      value={settings.scrollSpeed} onChange={e=>change({scrollSpeed:Number(e.target.value)})}/>
     <div className="gsl-setting-range-ends"><span>SLOWER</span><span>FASTER</span></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><Keyboard size={21}/><div><small>03 / AIR TYPE</small><h2>Keyboard touch</h2></div></div>
     <p>Control how intentional each finger movement must be before it can type. The floating keyboard stays available from the left panel.</p>
     <div className="gsl-setting-choices" role="group" aria-label="Air keyboard touch sensitivity">
      {touchButton('LIGHT','More responsive',settings.keyboardTouch==='easy',()=>change({keyboardTouch:'easy'}))}
      {touchButton('BALANCED','Medium',settings.keyboardTouch==='balanced',()=>change({keyboardTouch:'balanced'}))}
      {touchButton('FIRM','Less accidental typing',settings.keyboardTouch==='precise',()=>change({keyboardTouch:'precise'}))}
     </div>
     <div className="gsl-setting-current"><span>Two-frame contact confirmation</span><strong>ACTIVE</strong></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><SlidersHorizontal size={21}/><div><small>04 / FINGERTIP MAPPING</small><h2>Keyboard range</h2></div></div>
     <p>Expand or narrow the fingertip movement mapped to the floating keyboard. Lower values make onscreen motion less sensitive.</p>
     <label className="gsl-setting-range" htmlFor="gesture-reach-settings"><span>MOVEMENT RANGE</span><strong>{settings.keyboardReach.toFixed(1)}×</strong></label>
     <input id="gesture-reach-settings" aria-label="GestureOS keyboard movement range" type="range" min=".8" max="2" step=".1"
      value={settings.keyboardReach} onChange={e=>change({keyboardReach:Number(e.target.value)})}/>
     <div className="gsl-setting-range-ends"><span>SMALLER</span><span>LARGER</span></div>
    </article>
   </section>
   <section className="gsl-experiments" aria-label="Other interactive GestureOS experiments">
    <header className="gsl-experiments-intro"><div><small>MORE INTERACTION STUDIES</small><h2>3D Control &amp; WBS Builder</h2></div>
     <p>No second camera. Use a mouse or touch, or use the same global GestureOS index click to activate the controls.</p></header>
    <div className="gsl-experiments-grid">
     <article className="gsl-interactive">
      <div className="gsl-stage-top"><span><Layers3 size={16}/> 3D CONTROL</span><b>ONE GLOBAL CAMERA</b></div>
      <div className="gsl-stage gsl-stage-cube">
       <div className="gsl-cube-panel">
        <div className="gsl-cube-scene">
         <div className="gsl-cube-orbit"/>
         <div className="gsl-3d-object" style={{transform:'rotateX('+cubeAngles.x+'deg) rotateY('+cubeAngles.y+'deg) scale('+(cubeExpanded?1.22:1)+')'}}
          onPointerDown={e=>{dragging.current={x:e.clientX,y:e.clientY,rx:cubeAngles.x,ry:cubeAngles.y};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(!dragging.current)return;const d=dragging.current;setCubeAngles({x:Math.max(-84,Math.min(84,d.rx-(e.clientY-d.y)*.42)),y:d.ry+(e.clientX-d.x)*.65});}}
          onPointerUp={e=>{dragging.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
          onPointerCancel={()=>{dragging.current=null;}}>
          {['AI + PM','AUTOMATION','WORKFLOWS','WBS','COORDINATION','DELIVERY'].map((name,i)=>
           <div className={'gsl-cube-face gsl-cube-face-'+i} key={name}><Zap size={25}/><strong>{name}</strong><small>SPATIAL UI</small></div>)}
         </div>
         <span>3D INTERACTION FIELD</span>
        </div>
        <div className="gsl-cube-options">
         <button type="button" aria-label="Rotate cube left" onClick={()=>setCubeAngles(v=>({...v,y:v.y-35}))}><ArrowLeft size={18}/></button>
         <button type="button" aria-label="Rotate cube right" onClick={()=>setCubeAngles(v=>({...v,y:v.y+35}))}><ArrowRight size={18}/></button>
         <button type="button" onClick={()=>setCubeExpanded(v=>!v)}>{cubeExpanded?'SHRINK':'EXPAND'}</button>
         <button type="button" onClick={()=>{setCubeAngles({x:-21,y:31});setCubeExpanded(false);}}><RotateCcw size={15}/> RESET</button>
        </div>
        <p className="gsl-stage-caption">Drag to rotate · use the arrows or global index click to interact.</p>
       </div>
      </div>
     </article>
     <article className="gsl-interactive">
      <div className="gsl-stage-top"><span><Workflow size={16}/> WBS BUILDER</span><b>{connections.length} DEPENDENCIES</b></div>
      <div className="gsl-stage gsl-stage-workflow">
       <div className="gsl-wbs-panel">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gsl-wbs-wires" aria-hidden="true">
         {connections.map(([a,b])=>{const from=tasks.find(t=>t.id===a),to=tasks.find(t=>t.id===b);
          return from&&to?<line key={a+'-'+b} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>:null;})}
        </svg>
        {tasks.map(t=><button type="button" key={t.id} data-task-id={t.id}
         className={'gsl-wbs-node'+(linkFrom===t.id?' selected':'')}
         style={{left:t.x+'%',top:t.y+'%'}} onClick={()=>selectTask(t.id)}>
         <small>WBS / {t.id}</small><strong>{t.name}</strong><span>{t.detail}</span><i>{t.done?'REVIEWED':'PLANNED'}</i>
        </button>)}
        <div className="gsl-wbs-corner">PROJECT CONTROL / DEPENDENCY MAP</div>
       </div>
      </div>
      <div className="gsl-experiment-status"><span role="status">{wbsMessage}</span>
       <button type="button" onClick={resetWbs}><RotateCcw size={14}/> RESET WBS</button></div>
     </article>
    </div>
   </section>
   <div className="gsl-settings-footer">
    <div><strong>{saved?'SETTINGS UPDATED':'LIVE SETTINGS'}</strong><span>Saved locally. The global GestureOS panel uses these values on this page and throughout the portfolio.</span></div>
    <button type="button" onClick={reset}><RotateCcw size={16}/> RESTORE DEFAULTS</button>
   </div>
   <div className="gsl-settings-help">
    <div><span>01</span><p><strong>Navigate</strong> — point your index and move forward deliberately to click. Open your palm to scroll.</p></div>
    <div><span>02</span><p><strong>Type</strong> — open the single floating keyboard from the left; each fingertip must settle before pressing.</p></div>
    <div><span>03</span><p><strong>Return to site</strong> — use ↗ SITE, hold two closed fists briefly, or press Esc. The camera remains on.</p></div>
   </div>
   <footer className="gsl-settings-bottom">
    <span><ArrowUpRight size={15}/> SPATIAL CONTROLS ARE EXPERIMENTAL · REAL CAMERA PERFORMANCE DEPENDS ON LIGHTING AND HARDWARE</span>
    <Link to="/">BACK TO PORTFOLIO <ArrowUpRight size={15}/></Link>
   </footer>
  </div>
 </main>;
}

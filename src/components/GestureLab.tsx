import {useRef,useState} from 'react';
import type {CSSProperties,PointerEvent as ReactPointerEvent} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Hand,Layers3,Link2,MousePointer2,RotateCcw,Scan,ShieldCheck,Workflow,Zap} from 'lucide-react';
import HoloNavigator from './HoloNavigator';

type Mode='cube'|'workflow';
type Task={id:string;name:string;detail:string;x:number;y:number;done:boolean};
type DragInfo={id:string;pointerId:number;startX:number;startY:number;originX:number;originY:number;moved:boolean};
const starterTasks:Task[]=[
 {id:'A',name:'Requirements',detail:'Scope & acceptance',x:22,y:30,done:true},
 {id:'B',name:'WBS design',detail:'Work packages',x:73,y:27,done:false},
 {id:'C',name:'Automation',detail:'Rules & triggers',x:29,y:72,done:false},
 {id:'D',name:'Quality review',detail:'Risks & controls',x:77,y:72,done:false}
];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const modes:{id:Mode;title:string;sub:string;Icon:typeof Layers3}[]=[
 {id:'cube',title:'3D Control',sub:'Manipulate a spatial object',Icon:Layers3},
 {id:'workflow',title:'WBS Builder',sub:'Connect project work packages',Icon:Workflow}
];

export default function GestureLab(){
 const [mode,setMode]=useState<Mode>('cube');
 const [angles,setAngles]=useState({x:-21,y:31});
 const [expanded,setExpanded]=useState(false);
 const [tasks,setTasks]=useState<Task[]>(starterTasks);
 const [connections,setConnections]=useState<[string,string][]>([['A','B']]);
 const [selected,setSelected]=useState<string|null>(null);
 const [notice,setNotice]=useState('Drag the 3D object with your mouse or touch. Use the same Spatial Control above to navigate this page by gestures.');
 const cubeGrab=useRef<{pointerId:number;x:number;y:number;rx:number;ry:number;moved:boolean}|null>(null);
 const stageRef=useRef<HTMLDivElement|null>(null);
 const dragRef=useRef<DragInfo|null>(null);
 const suppressClickRef=useRef<string|null>(null);

 const switchMode=(next:Mode)=>{
  setMode(next);setSelected(null);dragRef.current=null;cubeGrab.current=null;
  setNotice(next==='cube'?'Drag to rotate. Select the object or Expand to resize.':'Select two cards to connect them, or drag a card to reposition it.');
 };
 const onCubeDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  cubeGrab.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,rx:angles.x,ry:angles.y,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId);
 };
 const onCubeMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const g=cubeGrab.current;
  if(!g||g.pointerId!==event.pointerId)return;
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(Math.abs(dx)+Math.abs(dy)>5)g.moved=true;
  setAngles({x:clamp(g.rx-dy*.48,-360,360),y:g.ry+dx*.58});
 };
 const onCubeUp=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const g=cubeGrab.current;if(!g||g.pointerId!==event.pointerId)return;
  cubeGrab.current=null;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const onTaskDown=(event:ReactPointerEvent<HTMLButtonElement>,task:Task)=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.currentTarget.setPointerCapture(event.pointerId);
  dragRef.current={id:task.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:task.x,originY:task.y,moved:false};
 };
 const onTaskMove=(event:ReactPointerEvent<HTMLButtonElement>)=>{
  const g=dragRef.current,rect=stageRef.current?.getBoundingClientRect();
  if(!g||!rect||g.pointerId!==event.pointerId)return;
  const dx=event.clientX-g.startX,dy=event.clientY-g.startY;
  if(Math.hypot(dx,dy)<6&&!g.moved)return;
  g.moved=true;
  const x=clamp(g.originX+dx/rect.width*100,13,87);
  const y=clamp(g.originY+dy/rect.height*100,16,84);
  setTasks(items=>items.map(t=>t.id===g.id?{...t,x,y}:t));
 };
 const onTaskUp=(event:ReactPointerEvent<HTMLButtonElement>)=>{
  const g=dragRef.current;
  if(!g||g.pointerId!==event.pointerId)return;
  if(g.moved){suppressClickRef.current=g.id;setNotice('Card repositioned. Select two cards to link them.');}
  dragRef.current=null;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const onTaskClick=(id:string)=>{
  if(suppressClickRef.current===id){suppressClickRef.current=null;return;}
  if(!selected){setSelected(id);setNotice('Now select another work package to create a dependency.');return;}
  if(selected===id){setSelected(null);setNotice('Selection cleared.');return;}
  const from=selected;
  setConnections(items=>items.some(([a,b])=>a===from&&b===id||a===id&&b===from)?items:[...items,[from,id]]);
  setSelected(null);setNotice('Dependency connected: '+from+' → '+id+'.');
 };
 const reset=()=>{
  setTasks(starterTasks);setConnections([['A','B']]);setSelected(null);
  suppressClickRef.current=null;dragRef.current=null;
  setNotice('WBS reset to the original layout.');
 };
 return <section className="gsl-page gsl-unified-page">
  <div className="wrap">
   <div className="gsl-back"><Link to="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</Link><span><i/> EXPERIMENTAL INTERACTION LAB / 2026</span></div>
   <header className="gsl-heading">
    <div><div className="eyebrow"><i/> HUMAN × MACHINE INTERACTION</div><h1>Gesture <em>Lab.</em></h1><p>One spatial control system for navigating, interacting and experimenting with camera-powered interfaces. No duplicate camera or keyboard.</p></div>
    <div className="gsl-heading-mark"><Hand size={54}/><span>CAMERA-POWERED<br/>INTERACTION STUDY</span></div>
   </header>
   <div className="gsl-privacy"><ShieldCheck size={18}/><span>The camera starts <strong>only when you enable Spatial Control</strong>. Gesture recognition runs locally in the browser. This website does not record or upload webcam video; the MediaPipe model is downloaded externally and its SDK may report usage metrics. Stop Camera closes the stream.</span></div>
   <section className="gsl-spatial-section" aria-label="Spatial Control gesture navigation">
    <div className="gsl-spatial-heading"><div>
     <small className="eyebrow"><i/> 01 / SPATIAL CONTROL</small>
     <h2>One control. <em>Every gesture.</em></h2>
     <p>Start the front camera once. Use your hands to navigate the actual page and try the experimental Air Keyboard directly inside Spatial Control, without opening a second camera or separate typing stage.</p>
    </div><div className="gsl-spatial-live"><Scan size={19}/><span>ONE CAMERA · ONE SESSION</span></div></div>
    <HoloNavigator/>
   </section>
   <div className="gsl-experiments-heading">
    <small className="eyebrow"><i/> 02 / MORE INTERACTIVE EXPERIMENTS</small>
    <p>Explore a 3D object and a project dependency diagram. Both remain usable with mouse and touch; Spatial Control can select their normal buttons without a second camera.</p>
   </div>
   <div className="gsl-mode-tabs gsl-unified-tabs" role="group" aria-label="Choose a spatial experiment">
    {modes.map(({id,title,sub,Icon},i)=><button type="button" key={id} aria-pressed={mode===id} className={mode===id?'active':''} onClick={()=>switchMode(id)}><span>0{i+1} / EXPERIMENT</span><Icon size={23}/><strong>{title}</strong><small>{sub}</small></button>)}
   </div>
   <div className="gsl-workspace gsl-unified-workspace">
    <div className="gsl-interactive">
     <div className="gsl-stage-top"><span><i/> {mode==='cube'?'3D OBJECT CONTROL':'WBS / PROJECT FLOW'}</span><b>INTERACTIVE · NO EXTRA CAMERA</b></div>
     <div className={'gsl-stage gsl-stage-'+mode} ref={stageRef}>
      {mode==='cube'&&<div className="gsl-cube-panel">
       <div className="gsl-cube-scene"><div className="gsl-cube-orbit"/>
        <div className="gsl-3d-object" role="button" tabIndex={0} aria-label="3D cube: select to expand or shrink; drag to rotate"
         style={{transform:'rotateX('+angles.x+'deg) rotateY('+angles.y+'deg) scale('+(expanded?1.22:1)+')'}}
         onClick={()=>{if(!cubeGrab.current)setExpanded(v=>!v);}}
         onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setExpanded(v=>!v);}}}
         onPointerDown={onCubeDown} onPointerMove={onCubeMove} onPointerUp={onCubeUp} onPointerCancel={onCubeUp}>
         {['AI + PM','AUTOMATION','WORKFLOWS','WBS','COORDINATION','DELIVERY'].map((name,i)=><div key={name} className={'gsl-cube-face gsl-cube-face-'+i}><Zap size={26}/><strong>{name}</strong><small>SPATIAL / DIGITAL SYSTEMS</small></div>)}
        </div><span>3D INTERACTION FIELD / 01</span>
       </div>
       <div className="gsl-cube-options"><button type="button" onClick={()=>setAngles(v=>({...v,y:v.y-35}))}><ArrowLeft size={18}/> LEFT</button><button type="button" onClick={()=>setAngles(v=>({...v,y:v.y+35}))}>RIGHT <ArrowRight size={18}/></button><button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?'SHRINK':'EXPAND'}</button><button type="button" onClick={()=>{setAngles({x:-21,y:31});setExpanded(false);}}><RotateCcw size={16}/> RESET</button></div>
       <p className="gsl-stage-caption">Drag the cube to rotate. Select it to resize, or use the controls. The hand pointer can select these controls when Spatial Control is active.</p>
      </div>}
      {mode==='workflow'&&<div className="gsl-wbs-panel">
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gsl-wbs-wires" aria-hidden="true">{connections.map(([a,b])=>{
        const p=tasks.find(t=>t.id===a),q=tasks.find(t=>t.id===b);
        return p&&q?<line key={a+'-'+b} x1={p.x} y1={p.y} x2={q.x} y2={q.y}/>:null;
       })}</svg>
       {tasks.map(task=><button type="button" key={task.id} data-task-id={task.id} className={'gsl-wbs-node '+(selected===task.id?'selected':'')}
        style={{left:task.x+'%',top:task.y+'%'} as CSSProperties}
        onPointerDown={e=>onTaskDown(e,task)} onPointerMove={onTaskMove} onPointerUp={onTaskUp} onPointerCancel={onTaskUp} onClick={()=>onTaskClick(task.id)}>
        <small>WBS / {task.id}</small><strong>{task.name}</strong><span>{task.detail}</span><i>{task.done?'REVIEWED':'PLANNED'}</i>
       </button>)}
       <div className="gsl-wbs-corner">PROJECT CONTROL / DEPENDENCY MAP</div>
      </div>}
     </div>
     <div className="gsl-stage-footer"><span><MousePointer2 size={15}/> {notice}</span><span>{mode==='workflow'?connections.length+' DEPENDENCIES':'3D OBJECT'}</span></div>
    </div>
   </div>
   <div className="gsl-unified-footer-actions">
    {mode==='workflow'?<button type="button" onClick={reset}><RotateCcw size={16}/> RESET WBS</button>:null}
    <span><Link2 size={15}/> Spatial Control's camera is shared with its Air Keyboard. The two demos above never request another camera.</span>
   </div>
   <footer className="gsl-footer"><span>AN EXPERIMENT IN COMPUTER VISION, HUMAN INTERACTION AND PROJECT WORKFLOWS.</span><Link to="/projects">EXPLORE REAL PROJECTS <ArrowRight size={16}/></Link></footer>
  </div>
 </section>;
}

import {useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent,PointerEvent} from 'react';
import {ArrowUpRight,BrainCircuit,CheckCircle2,ChevronLeft,ChevronRight,Layers3,MousePointer2,Network,Orbit,Workflow,Zap} from 'lucide-react';
import {Link} from 'react-router-dom';

/**
 * Original lightweight CSS-3D primitives. Inspired by the interaction language
 * of Beautiful UI and the freely available 3D/component examples at ReactBits.
 * Real 3D transforms + pointer rotation, no third-party code or external requests.
 */
const heroModes=[
 {tag:'01 / EXPLORE',title:'Find the real problem.',detail:'Turn scattered requirements and operational friction into a clear project direction.',word:'DISCOVER'},
 {tag:'02 / ORCHESTRATE',title:'Connect tools and people.',detail:'Bring stakeholders, workflows and practical AI-enabled automation into one plan.',word:'AUTOMATE'},
 {tag:'03 / EXECUTE',title:'Make progress visible.',detail:'Coordinate work, track dependencies and keep execution grounded in actual results.',word:'DELIVER'}
];
const faces=[
 {label:'AI × PM',sub:'SYSTEM CORE',Icon:BrainCircuit},
 {label:'SYSTEMS',sub:'CONNECTED WORK',Icon:Network},
 {label:'AUTOMATE',sub:'PRACTICAL TOOLS',Icon:Zap},
 {label:'EXECUTE',sub:'DELIVERY FLOW',Icon:CheckCircle2},
 {label:'ANALYZE',sub:'DISCOVERY FIRST',Icon:Layers3},
 {label:'OPERATIONS',sub:'REAL-WORLD WORK',Icon:Workflow}
];

/** A volumetric six-face system cube. Drag to rotate, use keyboard arrows, or use the story chips. */
export function HeroSystems3D(){
 const [rx,setRx]=useState(-18),[ry,setRy]=useState(24),[active,setActive]=useState(0);
 const drag=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
 const [dragging,setDragging]=useState(false);
 const [interacted,setInteracted]=useState(false);
 const down=(e:PointerEvent<HTMLDivElement>)=>{
  if(e.button!==0)return;
  drag.current={x:e.clientX,y:e.clientY,rx,ry};
  setDragging(true);
  setInteracted(true);
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const move=(e:PointerEvent<HTMLDivElement>)=>{
  if(!drag.current)return;
  const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;
  setRy(drag.current.ry+dx*.42);
  setRx(Math.max(-68,Math.min(68,drag.current.rx-dy*.32)));
 };
 const up=(e:PointerEvent<HTMLDivElement>)=>{
  drag.current=null;
  setDragging(false);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const keys=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setInteracted(true);setRy(v=>v+(e.key==='ArrowLeft'?-18:18));}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setInteracted(true);setRx(v=>Math.max(-68,Math.min(68,v+(e.key==='ArrowUp'?12:-12))));}
 };
 const reset=()=>{setRx(-18);setRy(24);setDragging(false);setInteracted(false);drag.current=null;};
 const story=heroModes[active];
 const angle={transform:'rotateX('+rx+'deg) rotateY('+ry+'deg)'} as CSSProperties;
 return <aside className="pf3-hero-engine" aria-label="Interactive 3D project and operations system">
  <div className="pf3-hero-topline"><span><i/> PF / THREE-DIMENSIONAL SYSTEM</span><span>INTERACTIVE / 01</span></div>
  <div className="pf3-cube-perspective">
   <div className="pf3-orbit pf3-orbit-a" aria-hidden="true"/><div className="pf3-orbit pf3-orbit-b" aria-hidden="true"/>
   <div className="pf3-orbit pf3-orbit-c" aria-hidden="true"/>
   <div className="pf3-cube-glow" aria-hidden="true"/>
   <div className="pf3-cube-drag" role="img" tabIndex={0} aria-label="Rotatable 3D cube: AI project management, workflows, automation, execution, analysis and operations. Drag or use arrow keys to rotate."
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}>
    <div className={'pf3-auto-spin '+(dragging||interacted?'pf3-paused':'')}>
     <div className="pf3-geometry" style={angle}>
      {faces.map(({label,sub,Icon},i)=><div key={label} className={'pf3-face pf3-face-'+i}>
       <div className="pf3-face-frame">
        <span className="pf3-face-id">PF / 0{i+1}</span>
        <Icon size={28} strokeWidth={1.55}/>
        <strong>{label}</strong>
        <small>{sub}</small>
        <div className="pf3-face-grid" aria-hidden="true"/>
       </div>
      </div>)}
      <span className="pf3-cube-core" aria-hidden="true"/>
     </div>
    </div>
   </div>
   <span className="pf3-float-label pf3-float-a">PROJECT SYSTEMS <i/></span>
   <span className="pf3-float-label pf3-float-b"><i/> HUMAN + AI</span>
  </div>
  <div className="pf3-story-panel" aria-live="polite">
   <span>{story.tag}</span>
   <strong>{story.title}</strong>
   <p>{story.detail}</p>
  </div>
  <div className="pf3-hero-controls">
   <div role="group" aria-label="Choose a project management focus">
    {heroModes.map((m,i)=><button key={m.word} type="button" aria-pressed={i===active} onClick={()=>setActive(i)} className={i===active?'active':''}>{m.word}</button>)}
   </div>
   <button type="button" className="pf3-reset" onClick={reset} aria-label="Reset 3D cube rotation"><Orbit size={16}/> RESET VIEW</button>
  </div>
  <div className="pf3-hero-helper"><MousePointer2 size={13}/> DRAG THE OBJECT TO ROTATE · ARROW KEYS SUPPORTED</div>
 </aside>;
}

const phases=[
 {name:'Discover',detail:'Understand the real need, stakeholders and constraints before choosing a tool.',label:'START WITH THE PROBLEM',Icon:MousePointer2},
 {name:'Analyze',detail:'Map bottlenecks, dependencies, risks and information needed for a good decision.',label:'MAP THE COMPLEXITY',Icon:Layers3},
 {name:'Design',detail:'Define a practical future workflow, measurable scope and a prototype worth testing.',label:'MAKE THE PLAN VISIBLE',Icon:BrainCircuit},
 {name:'Coordinate',detail:'Align people, vendors and technology through clear responsibilities and communication.',label:'CONNECT THE MOVING PARTS',Icon:Network},
 {name:'Deliver',detail:'Put agreed changes into practice, track progress and resolve obstacles.',label:'STRUCTURED EXECUTION',Icon:CheckCircle2},
 {name:'Improve',detail:'Review lessons, refine weak points and prioritize the next iteration.',label:'CONTINUOUS REFINEMENT',Icon:Zap}
];

/** Perspective depth diagram: every physical layer corresponds to a project-management step. */
export function WorkflowDepth3D(){
 const [active,setActive]=useState(2);
 const item=phases[active];
 const Icon=item.Icon;
 return <section className="pf3-workflow-section" aria-label="Interactive 3D project delivery approach">
  <div className="wrap">
   <div className="pf3-workflow-head">
    <div><small className="eyebrow"><i/> 03 / HOW I WORK</small><h2>From complexity<br/>to <em>structured execution.</em></h2></div>
    <p>Six connected steps, one adaptable approach. Select a layer to see where planning, people and AI-assisted tools fit together.</p>
   </div>
   <div className="pf3-workflow-layout">
    <div className="pf3-depth-space">
     <div className="pf3-depth-ambient" aria-hidden="true"/>
     <div className="pf3-depth-object" aria-label="Perspective stack of project workflow layers">
      {phases.map((phase,i)=>{
       const depth=(i-active+phases.length)%phases.length;
       const PhaseIcon=phase.Icon;
       return <button type="button" key={phase.name} className={'pf3-depth-plate '+(i===active?'active':'')} aria-pressed={i===active}
        style={{'--pf3-depth':depth,'--pf3-accent':i===active?'#b9f8ff':'#a5a8ec'} as CSSProperties}
        onClick={()=>setActive(i)} tabIndex={depth>3?-1:0}>
        <span><PhaseIcon size={20}/><strong>{phase.name}</strong></span>
        <small>0{i+1} / {phase.label}</small>
        <i aria-hidden="true"/>
       </button>;
      })}
     </div>
     <div className="pf3-depth-floor" aria-hidden="true"/>
     <span className="pf3-depth-watermark">SIX LAYERS / ONE PROCESS</span>
    </div>
    <div className="pf3-workflow-detail">
     <span className="pf3-workflow-kicker"><i/> INTERACTIVE / PROCESS EXPLORER</span>
     <div className="pf3-workflow-symbol"><Icon size={28}/><span>0{active+1} / 06</span></div>
     <h3>{item.name}<span>.</span></h3>
     <small>{item.label}</small>
     <p key={active} aria-live="polite">{item.detail}</p>
     <div className="pf3-workflow-select" role="group" aria-label="Select a project management phase">
      {phases.map((p,i)=><button type="button" key={p.name} aria-pressed={active===i} className={active===i?'active':''} onClick={()=>setActive(i)}>{String(i+1).padStart(2,'0')}</button>)}
     </div>
     <div className="pf3-workflow-arrows">
      <button type="button" onClick={()=>setActive(i=>(i+phases.length-1)%phases.length)} aria-label="Previous stage"><ChevronLeft size={20}/></button>
      <button type="button" onClick={()=>setActive(i=>(i+1)%phases.length)} aria-label="Next stage"><ChevronRight size={20}/></button>
      <span>SELECT A LAYER TO EXPLORE</span>
     </div>
     <Link to="/services" className="pf3-workflow-link">EXPLORE HOW I CAN HELP <ArrowUpRight size={17}/></Link>
    </div>
   </div>
  </div>
 </section>;
}

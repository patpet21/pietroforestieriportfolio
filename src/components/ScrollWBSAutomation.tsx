import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowDownRight,ArrowRight,Blocks,CheckCheck,ClipboardList,GitBranch,Network,ShieldCheck,Sparkles,Workflow} from 'lucide-react';

/**
 * Original, scroll-driven CSS 3D simulation:
 * WBS hierarchy -> exploded work packages -> automation sequence -> output.
 * No fake client metrics, no 3D libraries and no external network calls.
 */
type Pose={x:number;y:number;z:number;tilt:number;scale:number;opacity:number};
const p=(x:number,y:number,z=0,tilt=0,scale=1,opacity=1):Pose=>({x,y,z,tilt,scale,opacity});
const nodeInfo=[
 {id:'0.0',name:'Project goal',hint:'Success criteria',Icon:ClipboardList},
 {id:'1.1',name:'Requirements',hint:'Define the scope',Icon:Blocks},
 {id:'1.2',name:'WBS',hint:'Split the work',Icon:GitBranch},
 {id:'1.3',name:'Stakeholders',hint:'Owners and vendors',Icon:Network},
 {id:'2.1',name:'Dependencies',hint:'Sequence tasks',Icon:ArrowDownRight},
 {id:'2.2',name:'Automation',hint:'Trigger and route',Icon:Workflow},
 {id:'2.3',name:'QA & risks',hint:'Check the outputs',Icon:ShieldCheck},
 {id:'3.0',name:'Delivery',hint:'Review milestones',Icon:CheckCheck}
];
const layouts:Pose[][]=[
 [p(50,15,50,0,1.08),p(13,43),p(38,43),p(63,43),p(87,43),p(26,72),p(50,72),p(76,72)],
 [p(48,10,125,-9,1.1),p(11,29,150,-19),p(39,24,195,13),p(74,26,180,-15),p(91,48,140,18),p(11,76,210,16),p(51,77,235,-11),p(86,77,160,17)],
 [p(50,12,15,0,1),p(12,42,35,0,.88),p(37,42,45,0,.88),p(62,42,45,0,.88),p(87,42,35,0,.88),p(24,72,80,0,.88),p(50,72,85,0,.88),p(77,72,80,0,.88)],
 [p(50,50,-120,0,.54,0),p(46,51,-160,0,.42,0),p(48,49,-140,0,.43,0),p(50,52,-130,0,.42,0),p(52,50,-160,0,.44,0),p(48,54,-120,0,.41,0),p(53,50,-120,0,.43,0),p(50,50,-125,0,.45,0)]
];
const steps=[
 {index:'01 / PLAN',title:'Start with a WBS.',subtitle:'Define what must be delivered.',body:'A project manager decomposes the objective into manageable work packages, owners and dependencies. The structure comes before the software.',metric:'PROJECT → WORK PACKAGES',Icon:GitBranch},
 {index:'02 / DECOMPOSE',title:'Watch the work break apart.',subtitle:'Every task becomes visible.',body:'Scroll to explode the WBS. Requirements, people, risks and technical tasks separate into independent but coordinated workstreams.',metric:'TASKS · OWNERS · DEPENDENCIES',Icon:Blocks},
 {index:'03 / ORCHESTRATE',title:'Connect the automation.',subtitle:'AI supports a controlled workflow.',body:'Once the work is understood, rules and AI-assisted checks can connect repetitive handoffs. A PM still coordinates owners, quality and exceptions.',metric:'TRIGGER → ACTION → REVIEW',Icon:Workflow},
 {index:'04 / DELIVER',title:'Turn activity into progress.',subtitle:'A structured output, not random tasks.',body:'Workstreams converge into a visible project view: milestone status, reviewed outputs, assigned ownership and next actions.',metric:'MONITOR · VALIDATE · IMPROVE',Icon:CheckCheck}
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function getPose(index:number,progress:number):Pose{
 const t=clamp(progress)*3;
 const a=Math.min(2,Math.floor(t)),b=Math.min(3,a+1);
 const fraction=t>=3?1:t-a;
 const u=fraction*fraction*(3-2*fraction);
 const x=layouts[a][index],y=layouts[b][index];
 return {x:mix(x.x,y.x,u),y:mix(x.y,y.y,u),z:mix(x.z,y.z,u),tilt:mix(x.tilt,y.tilt,u),scale:mix(x.scale,y.scale,u),opacity:mix(x.opacity,y.opacity,u)};
}
export default function ScrollWBSAutomation(){
 const sectionRef=useRef<HTMLElement|null>(null);
 const raf=useRef<number>(0);
 const reduced=useRef(false);
 const [progress,setProgress]=useState(0);
 const [reduceMotion,setReduceMotion]=useState(false);
 const active=Math.min(3,Math.floor(progress*3+.5));
 const current=steps[active];
 const StageIcon=current.Icon;
 useEffect(()=>{
  const section=sectionRef.current;
  if(!section)return;
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
  const onPreference=()=>{
   reduced.current=mq.matches;setReduceMotion(mq.matches);
   if(mq.matches)setProgress(0);
   else calculate();
  };
  const calculate=()=>{
   if(reduced.current)return;
   const rect=section.getBoundingClientRect();
   const distance=Math.max(1,section.offsetHeight-window.innerHeight);
   const next=clamp(-rect.top/distance);
   setProgress(old=>Math.abs(next-old)>.003?next:old);
  };
  const request=()=>{
   if(raf.current)return;
   raf.current=window.requestAnimationFrame(()=>{raf.current=0;calculate();});
  };
  onPreference();
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request);
  mq.addEventListener('change',onPreference);
  return()=>{
   window.removeEventListener('scroll',request);window.removeEventListener('resize',request);
   mq.removeEventListener('change',onPreference);
   window.cancelAnimationFrame(raf.current);
  };
 },[]);
 const goTo=useCallback((i:number)=>{
  if(reduced.current){setProgress(i/3);return;}
  const section=sectionRef.current;
  if(!section)return;
  const target=window.scrollY+section.getBoundingClientRect().top+
   Math.max(0,section.offsetHeight-window.innerHeight)*(i/3);
  window.scrollTo({top:target,behavior:'smooth'});
 },[]);
 const explode=clamp(1-Math.abs(progress*3-1))*1;
 const wiresWBS=clamp(1-progress*3*1.25);
 const wiresFlow=clamp(1-Math.abs(progress*3-2)*2.1);
 const result=clamp((progress*3-2.47)/.46);
 return <section className={'pf10-scroll-section '+(reduceMotion?'pf10-reduced':'')} ref={sectionRef} aria-label="Scroll interactive WBS to automation project simulation">
  <div className="pf10-scroll-sticky">
   <div className="wrap pf10-scroll-layout">
    <div className="pf10-scroll-title">
     <div><small className="eyebrow"><i/> 03 / PROJECT MANAGEMENT × AUTOMATION</small>
      <h2>Break it down.<br/><em>Connect it. Deliver.</em></h2></div>
     <p>A visual simulation of how a PM structures work before applying automation. <strong>Scroll to explode the WBS.</strong></p>
    </div>
    <div className="pf10-scroll-workspace">
     <div className="pf10-network-visual" style={{'--pf10-explosion':String(explode)} as CSSProperties}>
      <div className="pf10-grid" aria-hidden="true"/>
      <span className="pf10-corner pf10-corner-a" aria-hidden="true"/>
      <span className="pf10-corner pf10-corner-b" aria-hidden="true"/>
      <div className="pf10-scene-label"><span><i/> LIVE SCROLL SIMULATION</span><b>{current.index}</b></div>
      <svg className="pf10-edges" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
       <g style={{opacity:wiresWBS}}>
        <path d="M500 105 V151 H130 M500 151 H870 M380 151 V245 M630 151 V245 M130 151 V245 M870 151 V245" />
        <path d="M380 304 V363 H260 V417 M380 363 H500 V417 M630 304 V363 H760 V417" />
       </g>
       <g style={{opacity:wiresFlow}} className="pf10-flow-path">
        <path d="M225 253 H310 M475 253 H545 M713 253 H790 M240 349 V390 H500 V425 M500 349 V425 M770 349 V425"/>
       </g>
      </svg>
      <div className="pf10-sparks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--k':i} as CSSProperties}/>)}</div>
      {nodeInfo.map((n,i)=>{
       const pose=getPose(i,progress);
       const Icon=n.Icon;
       return <div key={n.id} className={'pf10-task-node '+(i===0?'pf10-task-root':'')+' '+(active===2&&i===5?'pf10-task-live':'')}
         style={{left:pose.x+'%',top:pose.y+'%',opacity:pose.opacity,
          transform:'translate(-50%,-50%) translateZ('+pose.z+'px) rotateZ('+pose.tilt+'deg) scale('+pose.scale+')'} as CSSProperties}>
        <span className="pf10-task-index">{n.id}</span><Icon size={18}/><strong>{n.name}</strong><small>{n.hint}</small>
       </div>;
      })}
      <div className="pf10-result" style={{opacity:result,transform:'translate(-50%,-50%) scale('+(0.82+result*.18)+')'}} aria-hidden={result<.75}>
       <div className="pf10-result-top"><CheckCheck size={23}/><div><small>SIMULATED PROJECT OUTPUT</small><strong>Delivery Control Center</strong></div></div>
       <div className="pf10-result-progress"><span>WORKSTREAM ALIGNMENT</span><b>VALIDATED IN DEMO</b><i/></div>
       <div className="pf10-result-tiles"><div><small>WBS</small><strong>Structured</strong></div><div><small>AUTOMATION</small><strong>Connected</strong></div><div><small>OWNERSHIP</small><strong>Assigned</strong></div><div><small>DELIVERY</small><strong>Reviewed</strong></div></div>
       <div className="pf10-result-foot"><span>PLAN</span><ArrowRight size={13}/><span>COORDINATE</span><ArrowRight size={13}/><span>DELIVER</span></div>
      </div>
      <div className="pf10-scene-foot"><span>WBS / AUTOMATION / DELIVERY</span><span>CONCEPT DEMONSTRATION · NOT LIVE DATA</span></div>
     </div>
     <aside className="pf10-scroll-story">
      <div className="pf10-story-top"><span>{current.index}</span><StageIcon size={24}/></div>
      <h3>{current.title}</h3>
      <h4>{current.subtitle}</h4>
      <p>{current.body}</p>
      <div className="pf10-story-output"><span>PM PRINCIPLE</span><strong>{current.metric}</strong></div>
      <div className="pf10-step-selector" role="group" aria-label="Jump to simulation stage">
       {steps.map((step,i)=><button type="button" key={step.index} aria-pressed={i===active} onClick={()=>goTo(i)} aria-label={'Show step '+(i+1)+': '+step.title}><span>{String(i+1).padStart(2,'0')}</span><i/></button>)}
      </div>
      <div className="pf10-scroll-hint"><span>{reduceMotion?'SELECT A STEP TO EXPLORE':'SCROLL DOWN TO ADVANCE THE PROJECT'}</span><ArrowRight size={17}/></div>
     </aside>
    </div>
    <div className="pf10-scroll-progress"><span style={{width:Math.max(2,progress*100)+'%'}}/></div>
   </div>
  </div>
 </section>;
}

import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {Activity,AlertTriangle,ArrowRight,CalendarDays,ChevronLeft,ChevronRight,ClipboardList,Flag,GitBranch,HardHat,KeyRound,Play,RotateCcw,Sparkles,Wallet} from 'lucide-react';
import './HeroRealEstatePipeline.css';

/** An original lightweight 3D-style project pipeline. No external scene library or live project data. */
const stages=[
 {label:'INITIATE',area:'PROJECT CHARTER',title:'Define the project.',detail:'Agree on scope, success criteria, stakeholders and approval boundaries for a three-apartment renovation.',Icon:Flag},
 {label:'REQUIREMENTS',area:'SCOPE REGISTER',title:'Capture requirements.',detail:'Document renovation specifications, acceptance criteria and owner priorities before scheduling the work.',Icon:ClipboardList},
 {label:'WBS',area:'WORK PACKAGES',title:'Structure the work.',detail:'Split the renovation into work packages, assign responsibility and connect dependent activities.',Icon:GitBranch},
 {label:'SCHEDULE',area:'MILESTONES',title:'Sequence the work.',detail:'Map contractors, task dependencies, inspections and the 45-day target delivery window.',Icon:CalendarDays},
 {label:'BUDGET',area:'COST BASELINE',title:'Control the budget.',detail:'Allocate the illustrative $90,000 budget across packages and track forecast versus baseline.',Icon:Wallet},
 {label:'EXECUTE',area:'CONTRACTORS',title:'Coordinate execution.',detail:'Manage contractor handoffs, site issues and corrective action when tasks slip.',Icon:HardHat},
 {label:'MONITOR',area:'PROJECT CONTROL',title:'Make progress visible.',detail:'Review milestone variance, open risks, quality checks and changes to the forecast.',Icon:Activity},
 {label:'HANDOVER',area:'FINAL DELIVERY',title:'Close with evidence.',detail:'Complete inspections, client sign-off and a documented handover of the renovated apartments.',Icon:KeyRound}
] as const;
type Scenario='baseline'|'delay'|'replanned';
const paths={
 desktop:'M62 68 H188 H313 H438 V204 H313 H188 H62',
 mobile:'M65 50 H195 V145 H65 V240 H195 V335 H65'
};
const gridPlace=(index:number):CSSProperties => ({
 '--pfpm-desktop-col':String(index<4?index+1:8-index),
 '--pfpm-desktop-row':String(index<4?1:2),
 '--pfpm-mobile-col':String(index%4===0||index%4===3?1:2),
 '--pfpm-mobile-row':String(Math.floor(index/2)+1)
} as CSSProperties);

export default function HeroRealEstatePipeline(){
 const [active,setActive]=useState(0);
 const [progress,setProgress]=useState(-1);
 const [playing,setPlaying]=useState(false);
 const [scenario,setScenario]=useState<Scenario>('baseline');
 const current=stages[active];
 const forecast=scenario==='baseline'?45:scenario==='delay'?50:47;
 const variance=forecast-45;
 useEffect(()=>{
  if(!playing)return;
  if(progress>=stages.length-1){setPlaying(false);return;}
  const timer=window.setTimeout(()=>{
   const next=progress+1;
   setProgress(next);
   setActive(next);
  },720);
  return()=>window.clearTimeout(timer);
 },[playing,progress]);
 const reset=()=>{
  setPlaying(false);setProgress(-1);setActive(0);setScenario('baseline');
 };
 const run=()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   setPlaying(false);setProgress(7);setActive(7);setScenario('baseline');return;
  }
  setPlaying(false);setProgress(-1);setActive(0);setScenario('baseline');setPlaying(true);
 };
 const choose=(index:number)=>{setPlaying(false);setActive(index);};
 const delay=()=>{setPlaying(false);setScenario('delay');setActive(5);};
 const replan=()=>{setPlaying(false);setScenario('replanned');setActive(6);};
 const move=(delta:number)=>choose((active+delta+stages.length)%stages.length);

 return <aside className="pf3-hero-engine pfpm-hero" aria-label="Interactive eight-stage real estate project management simulation">
  <div className="pfpm-topline"><span><i/> PF / REAL ESTATE PROJECT SYSTEM</span><span>INTERACTIVE / 08</span></div>
  <div className="pfpm-intro">
   <span>RENOVATION DELIVERY PIPELINE</span>
   <strong>From requirements to handover.</strong>
   <small>3 apartments · Queens, NYC · illustrative case</small>
  </div>
  <div className="pfpm-network" role="group" aria-label="Select a project stage to see its responsibilities">
   <div className="pfpm-network-glow" aria-hidden="true"/>
   <svg className="pfpm-wires pfpm-wires-desktop" viewBox="0 0 500 270" preserveAspectRatio="none" aria-hidden="true">
    <path className="pfpm-wire-base" d={paths.desktop}/>
    <path className="pfpm-wire-energy" d={paths.desktop}/>
    <path className="pfpm-wire-progress" d={paths.desktop} pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
   </svg>
   <svg className="pfpm-wires pfpm-wires-mobile" viewBox="0 0 260 380" preserveAspectRatio="none" aria-hidden="true">
    <path className="pfpm-wire-base" d={paths.mobile}/>
    <path className="pfpm-wire-energy" d={paths.mobile}/>
    <path className="pfpm-wire-progress" d={paths.mobile} pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
   </svg>
   {stages.map(({label,area,Icon},index)=>{
    const selected=index===active;
    const done=index<=progress;
    const warning=scenario==='delay'&&index===5;
    return <button type="button" key={label}
      className={'pfpm-stage'+(selected?' is-active':'')+(done?' is-complete':'')+(warning?' is-warning':'')}
      style={gridPlace(index)} aria-pressed={selected}
      aria-label={'Stage '+(index+1)+': '+label+'. '+area+'. '+(done?'Completed in demo. ':'')+'Select for details.'}
      onClick={()=>choose(index)}>
      <span className="pfpm-stage-top"><span>{String(index+1).padStart(2,'0')}</span>{warning?<AlertTriangle size={13}/>:<span className="pfpm-led"/>}</span>
      <Icon size={22} strokeWidth={1.65} className="pfpm-stage-icon" aria-hidden="true"/>
      <strong>{label}</strong>
      <small>{area}</small>
    </button>;
   })}
  </div>
  <div className="pfpm-readout" aria-live="polite" aria-atomic="true">
   <span>{String(active+1).padStart(2,'0')} / 08 · {current.area}</span>
   <strong>{current.title}</strong>
   <p>{current.detail}</p>
  </div>
  <div className="pfpm-case-metrics" aria-label="Illustrative project status">
   <span><small>BASELINE</small><strong>45 DAYS</strong></span>
   <span><small>BUDGET</small><strong>$90,000</strong></span>
   <span className={variance?'pfpm-variance':'pfpm-ontrack'}><small>FORECAST</small><strong>{forecast} DAYS {variance?'(+'+variance+')':''}</strong></span>
  </div>
  <div className="pfpm-actions">
   <button type="button" className="pfpm-start" onClick={run} disabled={playing}><Play size={12} fill="currentColor"/> {playing?'RUNNING…':'RUN PROJECT'}</button>
   <button type="button" className={scenario==='delay'?'pfpm-action-alert':''} onClick={delay}><AlertTriangle size={13}/> DELAY +5D</button>
   <button type="button" onClick={replan} disabled={scenario!=='delay'}><Sparkles size={14}/> REPLAN</button>
   <button type="button" className="pfpm-reset" onClick={reset} aria-label="Reset project simulator"><RotateCcw size={15}/></button>
  </div>
  <div className="pfpm-footer">
   <span>{scenario==='replanned'?'SIMULATED RECOVERY: 3 OF 5 DAYS':scenario==='delay'?'SIMULATED CONTRACTOR DELAY':'CONCEPT DEMO · NOT LIVE PROJECT DATA'}</span>
   <div><button type="button" onClick={()=>move(-1)} aria-label="Previous project stage"><ChevronLeft size={16}/></button><span>{String(active+1).padStart(2,'0')} / 08</span><button type="button" onClick={()=>move(1)} aria-label="Next project stage"><ChevronRight size={16}/></button></div>
  </div>
  <span className="pfpm-flow-hint" aria-hidden="true">PLAN <ArrowRight size={11}/> COORDINATE <ArrowRight size={11}/> DELIVER</span>
 </aside>;
}

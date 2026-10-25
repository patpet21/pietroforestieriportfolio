import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent} from 'react';
import {
 Activity,AlertTriangle,ArrowRight,BarChart3,CalendarDays,Check,ChevronLeft,ChevronRight,
 ClipboardList,Flag,GitBranch,HardHat,KeyRound,Layers3,Play,RotateCcw,Sparkles,Wallet,
 Workflow,ChartGantt
} from 'lucide-react';
import './HeroRealEstatePipeline.css';

/**
 * Portfolio-only interactive case simulation.
 * Fictional renovation project, illustrative budgets and dependencies.
 * Nothing here claims to track an actual client or connect to project software.
 */
const stages=[
 {label:'INITIATE',area:'PROJECT CHARTER',title:'Define the project.',detail:'Set project scope, objectives, three-unit boundaries, approval roles and acceptance criteria.',Icon:Flag},
 {label:'REQUIREMENTS',area:'SCOPE REGISTER',title:'Capture what matters.',detail:'Translate owner needs into traceable requirements, priorities and acceptance checks.',Icon:ClipboardList},
 {label:'WBS',area:'WORK PACKAGES',title:'Break down delivery.',detail:'Decompose the scope into costed work packages with ownership and dependencies.',Icon:GitBranch},
 {label:'SCHEDULE',area:'GANTT & MILESTONES',title:'Sequence dependent tasks.',detail:'Baseline dates, handoffs and key inspections on a 45-day project schedule.',Icon:CalendarDays},
 {label:'BUDGET',area:'COST CONTROL',title:'Set the cost baseline.',detail:'Distribute the illustrative $90,000 across measurable, accountable packages.',Icon:Wallet},
 {label:'EXECUTE',area:'VENDOR COORDINATION',title:'Coordinate execution.',detail:'Sequence contractors, site works and quality controls without losing visibility.',Icon:HardHat},
 {label:'MONITOR',area:'ISSUES & FORECAST',title:'Assess the variance.',detail:'Introduce a five-day contractor delay, then recover three days by replanning the critical path.',Icon:Activity},
 {label:'HANDOVER',area:'INSPECTION & CLOSEOUT',title:'Deliver with evidence.',detail:'Close inspections, secure approvals and assemble a documented final handover.',Icon:KeyRound}
] as const;
type Scenario='baseline'|'delay'|'replanned';
type View='gantt'|'wbs'|'milestones'|'budget';
type WorkPackage={id:string;label:string;owner:string;start:number;end:number;cost:number;milestone?:string};
const packages:WorkPackage[]=[
 {id:'1.0',label:'Scope & approvals',owner:'PM / Owner',start:1,end:4,cost:4000,milestone:'Charter approved'},
 {id:'2.0',label:'Design & permits',owner:'Design team',start:5,end:10,cost:8500},
 {id:'3.0',label:'Demolition',owner:'General contractor',start:11,end:15,cost:11500},
 {id:'4.0',label:'MEP rough-in',owner:'Trades',start:16,end:25,cost:21000,milestone:'Rough-in signed off'},
 {id:'5.0',label:'Interior finishes',owner:'Trades / GC',start:26,end:37,cost:26000},
 {id:'6.0',label:'QA & inspections',owner:'Inspector / PM',start:38,end:42,cost:11000,milestone:'Inspection approved'},
 {id:'7.0',label:'Handover',owner:'PM / Owner',start:43,end:45,cost:8000,milestone:'Keys & closeout'}
];
const formatUSD=(value:number)=>'$'+value.toLocaleString('en-US');
const tabs:[View,string,typeof ChartGantt][]=[
 ['gantt','GANTT',ChartGantt],
 ['wbs','WBS',GitBranch],
 ['milestones','MILESTONES',Flag],
 ['budget','BUDGET',BarChart3]
];
const cardPosition=(index:number):CSSProperties=>({
 '--pfpm-desktop-col':String(index<4?index+1:8-index),
 '--pfpm-desktop-row':String(index<4?1:2),
 '--pfpm-mobile-col':String(index%4===0||index%4===3?1:2),
 '--pfpm-mobile-row':String(Math.floor(index/2)+1)
} as CSSProperties);
const delayShift=(scenario:Scenario)=>scenario==='baseline'?0:scenario==='delay'?5:2;
const taskStart=(task:WorkPackage,offset:number)=>task.start+(task.start>25?offset:0);
const taskEnd=(task:WorkPackage,offset:number)=>task.end+(task.end>=25?offset:0);

export default function HeroRealEstatePipeline(){
 const [active,setActive]=useState(0);
 const [progress,setProgress]=useState(-1);
 const [playing,setPlaying]=useState(false);
 const [scenario,setScenario]=useState<Scenario>('baseline');
 const [view,setView]=useState<View>('gantt');
 const panel=useRef<HTMLDivElement|null>(null);
 const shift=delayShift(scenario);
 const forecast=45+shift;
 const forecastBudget=scenario==='baseline'?90000:scenario==='delay'?94500:92000;
 const current=stages[active];

 useEffect(()=>{
  if(!playing)return;
  if(progress>=stages.length-1){setPlaying(false);return;}
  const timer=window.setTimeout(()=>{
   const next=progress+1;
   setProgress(next);
   setActive(next);
   if(next===2)setView('wbs');
   if(next===3)setView('gantt');
   if(next===4)setView('budget');
   if(next===6)setView('milestones');
  },950);
  return()=>window.clearTimeout(timer);
 },[playing,progress]);

 const run=()=>{
  setPlaying(false);setActive(0);setProgress(-1);setScenario('baseline');setView('gantt');
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   setProgress(7);setActive(7);return;
  }
  setPlaying(true);
 };
 const choose=(index:number)=>{setPlaying(false);setActive(index);
  if(index===2)setView('wbs');
  if(index===3)setView('gantt');
  if(index===4)setView('budget');
  if(index===6||index===7)setView('milestones');
 };
 const reset=()=>{setPlaying(false);setProgress(-1);setActive(0);setScenario('baseline');setView('gantt');};
 const delay=()=>{setPlaying(false);setScenario('delay');setActive(6);setView('gantt');};
 const replan=()=>{setPlaying(false);setScenario('replanned');setActive(6);setView('gantt');};
 const tilt=(event:PointerEvent<HTMLDivElement>)=>{
  if(event.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width-.5;
  const y=(event.clientY-rect.top)/rect.height-.5;
  panel.current?.style.setProperty('--pfpm-tilt-y',(-x*7).toFixed(2)+'deg');
  panel.current?.style.setProperty('--pfpm-tilt-x',(y*6).toFixed(2)+'deg');
 };
 const untilt=()=>{
  panel.current?.style.setProperty('--pfpm-tilt-y','0deg');
  panel.current?.style.setProperty('--pfpm-tilt-x','0deg');
 };
 const move=(direction:number)=>choose((active+direction+stages.length)%stages.length);
 return <aside className="pf3-hero-engine pfpm-hero" aria-label="Interactive real estate project management case simulation">
  <div className="pfpm-topline"><span><i/> PF / PROJECT DELIVERY ENGINE</span><span><Layers3 size={12}/> 3D INTERACTIVE / 08</span></div>
  <div className="pfpm-intro"><span>ILLUSTRATIVE REAL ESTATE CASE · QUEENS, NYC</span>
   <strong>From requirements to handover.</strong>
   <small>Three-apartment renovation · select a phase, inspect the WBS or run the project</small>
  </div>
  <div className="pfpm-perspective" onPointerMove={tilt} onPointerLeave={untilt}>
   <div className="pfpm-orbit pfpm-orbit-one" aria-hidden="true"/>
   <div className="pfpm-orbit pfpm-orbit-two" aria-hidden="true"/>
   <div className="pfpm-stage-deck" ref={panel}>
    <div className="pfpm-stage-deck-title"><span><Workflow size={13}/> PROJECT SYSTEM / PROCESS MAP</span><span>08 CONNECTED PHASES</span></div>
    <div className="pfpm-network" role="group" aria-label="Project phase selector">
     <div className="pfpm-network-glow" aria-hidden="true"/>
     <svg className="pfpm-wires pfpm-wires-desktop" viewBox="0 0 500 255" preserveAspectRatio="none" aria-hidden="true">
      <path className="pfpm-wire-base" d="M62 68 H188 H313 H438 V190 H313 H188 H62"/>
      <path className="pfpm-wire-energy" d="M62 68 H188 H313 H438 V190 H313 H188 H62"/>
      <path className="pfpm-wire-progress" d="M62 68 H188 H313 H438 V190 H313 H188 H62" pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
     </svg>
     <svg className="pfpm-wires pfpm-wires-mobile" viewBox="0 0 260 370" preserveAspectRatio="none" aria-hidden="true">
      <path className="pfpm-wire-base" d="M64 44 H196 V140 H64 V230 H196 V323 H64"/>
      <path className="pfpm-wire-energy" d="M64 44 H196 V140 H64 V230 H196 V323 H64"/>
      <path className="pfpm-wire-progress" d="M64 44 H196 V140 H64 V230 H196 V323 H64" pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
     </svg>
     {stages.map(({label,area,Icon},index)=>{
      const selected=index===active,done=index<=progress;
      return <button type="button" key={label} style={cardPosition(index)}
       className={'pfpm-stage'+(selected?' is-active':'')+(done?' is-complete':'')+(scenario==='delay'&&index===5?' is-warning':'')}
       aria-pressed={selected} aria-label={label+' — '+area} onClick={()=>choose(index)}>
       <span className="pfpm-stage-top"><span>{String(index+1).padStart(2,'0')}</span>{done?<Check size={12}/>:<span className="pfpm-led"/>}</span>
       <Icon size={20} className="pfpm-stage-icon" strokeWidth={1.65} aria-hidden="true"/>
       <strong>{label}</strong><small>{area}</small>
      </button>;
     })}
    </div>
   </div>
  </div>
  <div className="pfpm-readout" aria-live="polite" aria-atomic="true">
   <span>{String(active+1).padStart(2,'0')} / 08 · {current.area}</span>
   <strong>{current.title}</strong><p>{current.detail}</p>
  </div>
  <div className="pfpm-data-card" aria-label="Project outputs">
   <div className="pfpm-data-head"><strong><span className="pfpm-data-led"/> DELIVERY INTELLIGENCE</strong><span>{scenario==='baseline'?'BASELINE / 45 DAYS':scenario==='delay'?'RISK SCENARIO / +5D':'REPLANNED / +2D'}</span></div>
   <div className="pfpm-tablist" role="tablist" aria-label="Explore project management artifacts">
    {tabs.map(([id,label,Icon])=><button type="button" role="tab" id={'pfpm-tab-'+id} aria-selected={view===id}
     aria-controls="pfpm-output-panel" key={id} onClick={()=>{setView(id);setPlaying(false);}}
     className={view===id?'is-selected':''}><Icon size={13}/>{label}</button>)}
   </div>
   <div className="pfpm-tabpanel" role="tabpanel" id="pfpm-output-panel" aria-labelledby={'pfpm-tab-'+view}>
    {view==='gantt'&&<div className="pfpm-gantt" aria-label={'Illustrative Gantt forecast '+forecast+' days'}>
     <div className="pfpm-gantt-scale"><span>WORK PACKAGE</span><span>DAY 01</span><span>DAY 15</span><span>DAY 30</span><span>DAY {forecast}</span></div>
     {packages.map((item,index)=>{
      const first=taskStart(item,shift),last=taskEnd(item,shift);
      const percent=(first-1)/forecast*100,length=(last-first+1)/forecast*100;
      return <div className="pfpm-gantt-row" key={item.id}>
       <span title={item.label}>{item.id} · {item.label}</span>
       <div className="pfpm-gantt-track"><span className={'pfpm-gantt-bar'+(index<=Math.min(6,progress-1)?' is-done':'')} style={{left:percent+'%',width:length+'%'}}/>
        {item.milestone&&<i className="pfpm-gantt-milestone" style={{left:Math.min(98,percent+length)+'%'}} aria-label={item.milestone}/>}
       </div>
      </div>;
     })}
    </div>}
    {view==='wbs'&&<div className="pfpm-wbs" aria-label="Work breakdown structure">
     <div className="pfpm-wbs-parent"><GitBranch size={14}/> 0.0 · THREE-APARTMENT RENOVATION <span>7 WORK PACKAGES</span></div>
     {packages.map((item,i)=><div className="pfpm-wbs-row" key={item.id}><span className="pfpm-wbs-branch">└</span><b>{item.id}</b><span>{item.label}</span><small>{item.owner}</small><i className={i<=progress-1?'is-done':''}/></div>)}
    </div>}
    {view==='milestones'&&<div className="pfpm-milestones">
     {packages.filter(p=>p.milestone).map((item,i)=><div className="pfpm-milestone" key={item.id}>
      <span className="pfpm-milestone-num">{String(i+1).padStart(2,'0')}</span>
      <span><strong>{item.milestone}</strong><small>DAY {taskEnd(item,shift)} · {i<progress/2?'SIMULATED COMPLETE':'PLANNED'}</small></span>
      <Flag size={15}/>
     </div>)}
    </div>}
    {view==='budget'&&<div className="pfpm-budget">
     {packages.map(item=><div className="pfpm-budget-row" key={item.id}>
      <span>{item.id} · {item.label}</span>
      <div className="pfpm-budget-bar"><i style={{width:item.cost/26000*100+'%'}}/></div><strong>{formatUSD(item.cost)}</strong>
     </div>)}
    </div>}
   </div>
  </div>
  <div className="pfpm-case-metrics" aria-label="Demo project KPIs">
   <span><small>BASELINE</small><strong>45 DAYS</strong></span>
   <span><small>COST FORECAST</small><strong>{formatUSD(forecastBudget)}</strong></span>
   <span className={shift?'pfpm-variance':'pfpm-ontrack'}><small>FINISH FORECAST</small><strong>{forecast} DAYS {shift?'(+'+shift+')':''}</strong></span>
  </div>
  <div className="pfpm-actions">
   <button type="button" className="pfpm-start" onClick={run} disabled={playing}><Play size={12} fill="currentColor"/> {playing?'SIMULATING…':'RUN PROJECT'}</button>
   <button type="button" onClick={delay} className={scenario==='delay'?'pfpm-action-alert':''}><AlertTriangle size={13}/> DELAY +5D</button>
   <button type="button" onClick={replan} disabled={scenario!=='delay'}><Sparkles size={14}/> REPLAN</button>
   <button type="button" className="pfpm-reset" onClick={reset} aria-label="Reset the project demo"><RotateCcw size={15}/></button>
  </div>
  <div className="pfpm-footer">
   <span>{scenario==='replanned'?'RECOVERY SCENARIO · 3 DAYS REGAINED':scenario==='delay'?'SIMULATED TRADE DELAY · CRITICAL PATH':'INTERACTIVE CONCEPT · ALL PROJECT DATA ILLUSTRATIVE'}</span>
   <div><button type="button" onClick={()=>move(-1)} aria-label="Previous phase"><ChevronLeft size={16}/></button><span>{String(active+1).padStart(2,'0')} / 08</span><button type="button" onClick={()=>move(1)} aria-label="Next phase"><ChevronRight size={16}/></button></div>
  </div>
  <span className="pfpm-flow-hint" aria-hidden="true">SCOPE <ArrowRight size={11}/> PLAN <ArrowRight size={11}/> EXECUTE</span>
 </aside>;
}

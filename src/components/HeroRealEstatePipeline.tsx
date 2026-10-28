import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent} from 'react';
import {
 Activity,AlertTriangle,ArrowRight,BarChart3,CalendarDays,Check,ChevronLeft,ChevronRight,
 ClipboardList,Flag,GitBranch,HardHat,KeyRound,Layers3,Play,RotateCcw,Sparkles,Wallet,BrainCircuit,
 Workflow,ChartGantt
} from 'lucide-react';
import './HeroRealEstatePipeline.css';
import './HeroRealEstatePipeline3D.css';
import './HeroRealEstatePipelineHolographic.css';

/**
 * Portfolio-only interactive case simulation.
 * Fictional renovation project, illustrative budgets and dependencies.
 * Nothing here claims to track an actual client or connect to project software.
 */
const stages=[
 {label:'BRIEF',area:'INPUT / PROJECT REQUEST',role:'INPUT',title:'A real request enters the project.',detail:'The owner shares the renovation brief, constraints and source documents. This is the starting point, not an AI-generated decision.',input:'Owner brief, plans and emails',output:'Captured project request',Icon:Flag},
 {label:'AI INTAKE',area:'AI / DRAFT ANALYSIS',role:'AI',title:'AI organizes the information.',detail:'AI can extract requirements, summarize documents and flag missing details. Every finding remains a draft for review.',input:'Unstructured project documents',output:'Draft requirements and open questions',Icon:Sparkles},
 {label:'PM REVIEW',area:'HUMAN / SCOPE APPROVAL',role:'HUMAN',title:'A project manager validates the scope.',detail:'The PM checks AI suggestions with the owner, confirms priorities and assigns accountable people. Nothing progresses on an unverified assumption.',input:'AI draft plus owner feedback',output:'Approved scope and responsibilities',Icon:Check},
 {label:'WBS',area:'PM / WORK BREAKDOWN',role:'PM',title:'Turn the scope into work packages.',detail:'The approved requirements become deliverables, owners and dependencies. Select WBS on the right to inspect the seven example work packages.',input:'Approved scope',output:'Work breakdown structure and owners',Icon:GitBranch},
 {label:'PLAN',area:'PM / SCHEDULE & COST',role:'PM',title:'Build a plan people can execute.',detail:'The team agrees on sequencing, milestones and a sample $90,000 cost baseline. Use the Gantt, Milestones and Budget tabs to inspect the outputs.',input:'WBS and dependencies',output:'45-day baseline, budget and milestones',Icon:CalendarDays},
 {label:'AI CHECK',area:'AI / PROPOSED RISK SIGNALS',role:'AI',title:'AI helps spot potential issues.',detail:'AI can summarize status updates and highlight possible cost or schedule variance. A flagged delay is a suggestion to investigate, not a confirmed fact.',input:'Updates, issues and planned dates',output:'Risk summary for PM review',Icon:Activity},
 {label:'PM DECIDE',area:'HUMAN / CHANGE CONTROL',role:'HUMAN',title:'The PM makes the change decision.',detail:'Try “Introduce +5d delay”, then “Review recovery”. The PM evaluates the proposed replan before changing the forecast.',input:'Risk signals and options',output:'Approved revised forecast',Icon:ClipboardList},
 {label:'HANDOVER',area:'OUTPUT / PROJECT CLOSEOUT',role:'OUTPUT',title:'Deliver a traceable closeout.',detail:'The example ends with inspections, decisions, approved documents and a handover record, not merely an AI-generated summary.',input:'Completed work and sign-offs',output:'Closeout pack and handover',Icon:KeyRound}
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
const desktopFlowPath='M62 68 C104 68 146 68 188 68 S272 68 313 68 S396 68 438 68 C486 68 486 190 438 190 C396 190 355 190 313 190 S230 190 188 190 S104 190 62 190';
const mobileFlowPath='M64 44 C108 44 152 44 196 44 C220 44 220 140 196 140 C152 140 108 140 64 140 C40 140 40 230 64 230 C108 230 152 230 196 230 C220 230 220 323 196 323 C152 323 108 323 64 323';
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
   if(next===3)setView('wbs');
   if(next===4)setView('gantt');
   if(next===5)setView('budget');
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
  if(index===3)setView('wbs');
  if(index===4)setView('gantt');
  if(index===5)setView('budget');
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
 return <aside className="pf3-hero-engine pfpm-hero pfpm-neural pfpm-holo" data-step={active} data-view={view} data-playing={playing?'true':'false'} data-scenario={scenario} aria-label="Interactive real estate project management case simulation">
  <div className="pfpm-topline"><span><i/> PF / AI-ASSISTED DELIVERY FLOW</span><span><Layers3 size={12}/> INTERACTIVE WORKFLOW / 08</span></div>
  <div className="pfpm-intro"><span>ILLUSTRATIVE REAL ESTATE CASE · QUEENS, NEW YORK</span>
   <strong>Watch how AI supports real project delivery.</strong>
   <small>Click any connected node to see the input, the action and the output. Then run the workflow or test a delay.</small>
   <div className="pfpm-guide" aria-label="How the simulated workflow works">
    <span><i className="is-input"/> <b>INPUT</b> real project information</span>
    <span><i className="is-ai"/> <b>AI</b> drafts and flags</span>
    <span><i className="is-person"/> <b>PM</b> validates and decides</span>
    <span><i className="is-result"/> <b>OUTPUT</b> tracked deliverables</span>
   </div>
  </div>
  <div className="pfpm-perspective" onPointerMove={tilt} onPointerLeave={untilt}>
   <div className="pfpm-orbit pfpm-orbit-one" aria-hidden="true"/>
   <div className="pfpm-orbit pfpm-orbit-two" aria-hidden="true"/>
   <div className="pfpm-stage-deck" ref={panel}>
    <div className="pfpm-stage-deck-title"><span><Workflow size={13}/> CONNECTED PROCESS / FROM INPUT TO OUTPUT</span><span className="pfpm-execution-pill" role="status">{playing?'● EXECUTING':scenario==='delay'?'● RISK FLAGGED':scenario==='replanned'?'✓ PM REVIEWED':'● READY · PM APPROVAL'}</span></div>
    <div className="pfpm-network" role="group" aria-label="Project phase selector">
     <div className="pfpm-network-glow" aria-hidden="true"/>
     <div className="pfpm-holo-circuit" aria-hidden="true"><span/><span/><span/></div>
     <svg className="pfpm-wires pfpm-wires-desktop" viewBox="0 0 500 255" preserveAspectRatio="none" aria-hidden="true">
      <path className="pfpm-wire-base" d="M62 68 C104 68 146 68 188 68 S272 68 313 68 S396 68 438 68 C486 68 486 190 438 190 C396 190 355 190 313 190 S230 190 188 190 S104 190 62 190"/>
      <path className="pfpm-wire-energy" d="M62 68 C104 68 146 68 188 68 S272 68 313 68 S396 68 438 68 C486 68 486 190 438 190 C396 190 355 190 313 190 S230 190 188 190 S104 190 62 190"/>
      <path className="pfpm-wire-progress" d="M62 68 C104 68 146 68 188 68 S272 68 313 68 S396 68 438 68 C486 68 486 190 438 190 C396 190 355 190 313 190 S230 190 188 190 S104 190 62 190" pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
      <g className="pfpm-neural-links">
       <path className="pfpm-neural-link" d="M250 128 C227 106 215 78 188 68"/>
       <path className="pfpm-neural-link" d="M250 128 C277 94 294 78 313 68"/>
       <path className="pfpm-neural-link" d="M250 128 C276 153 296 180 313 190"/>
       <path className="pfpm-neural-link" d="M250 128 C222 158 210 181 188 190"/>
      </g>
      <g className="pfpm-signal-packets" aria-hidden="true">
       <circle r="5" className="pfpm-signal-packet pfpm-packet-primary"><animateMotion dur={playing?'3s':'10s'} repeatCount="indefinite" path={desktopFlowPath}/></circle>
       <circle r="2.7" className="pfpm-signal-packet pfpm-packet-secondary"><animateMotion dur={playing?'3s':'10s'} begin="-1.5s" repeatCount="indefinite" path={desktopFlowPath}/></circle>
       <circle r="2" className="pfpm-signal-packet pfpm-packet-tertiary"><animateMotion dur={playing?'3s':'10s'} begin="-3s" repeatCount="indefinite" path={desktopFlowPath}/></circle>
      </g>
     </svg>
     <svg className="pfpm-wires pfpm-wires-mobile" viewBox="0 0 260 370" preserveAspectRatio="none" aria-hidden="true">
      <path className="pfpm-wire-base" d="M64 44 C108 44 152 44 196 44 C220 44 220 140 196 140 C152 140 108 140 64 140 C40 140 40 230 64 230 C108 230 152 230 196 230 C220 230 220 323 196 323 C152 323 108 323 64 323"/>
      <path className="pfpm-wire-energy" d="M64 44 C108 44 152 44 196 44 C220 44 220 140 196 140 C152 140 108 140 64 140 C40 140 40 230 64 230 C108 230 152 230 196 230 C220 230 220 323 196 323 C152 323 108 323 64 323"/>
      <path className="pfpm-wire-progress" d={mobileFlowPath} pathLength={7} strokeDasharray={7} strokeDashoffset={7-Math.max(0,progress)}/>
      <g className="pfpm-signal-packets" aria-hidden="true">
       <circle r="4" className="pfpm-signal-packet pfpm-packet-primary"><animateMotion dur={playing?'4s':'11s'} repeatCount="indefinite" path={mobileFlowPath}/></circle>
       <circle r="2.4" className="pfpm-signal-packet pfpm-packet-secondary"><animateMotion dur={playing?'4s':'11s'} begin="-2s" repeatCount="indefinite" path={mobileFlowPath}/></circle>
      </g>
     </svg>
     <div className="pfpm-neural-core" aria-hidden="true">
      <span className="pfpm-core-pulse"/>
      <span className="pfpm-core-shell"><BrainCircuit size={34} strokeWidth={1.35}/></span>
      <span className="pfpm-core-label">AI COPILOT<small>SIMULATED SIGNALS</small></span>
     </div>
     {stages.map(({label,area,role,Icon},index)=>{
      const selected=index===active,done=index<=progress;
      return <button type="button" key={label} style={cardPosition(index)}
       className={'pfpm-stage'+(selected?' is-active':'')+(done?' is-complete':'')+(scenario==='delay'&&index===5?' is-warning':'')}
       aria-pressed={selected} aria-label={label+' — '+area} onClick={()=>choose(index)} data-role={role}>
       <span className="pfpm-stage-top"><span>{String(index+1).padStart(2,'0')}</span>{done?<Check size={12}/>:<span className="pfpm-led"/>}</span>
       <Icon size={20} className="pfpm-stage-icon" strokeWidth={1.65} aria-hidden="true"/>
       <strong>{label}</strong><small>{role} · {area.split(' / ').pop()}</small><span className="pfpm-node-port pfpm-node-port-in" aria-hidden="true"/><span className="pfpm-node-port pfpm-node-port-out" aria-hidden="true"/>
      </button>;
     })}
    </div>
   </div>
  </div>
  <div className="pfpm-readout" aria-live="polite" aria-atomic="true">
   <span>{String(active+1).padStart(2,'0')} / 08 · {current.area}</span>
   <strong>{current.title}</strong><p>{current.detail}</p><div className="pfpm-io-strip"><div><b>INPUT</b><span>{current.input}</span></div><ArrowRight size={13} aria-hidden="true"/><div><b>OUTPUT</b><span>{current.output}</span></div></div>
  </div>
  <div className="pfpm-data-card" aria-label="Project outputs">
   <div className="pfpm-data-head"><strong><span className="pfpm-data-led"/> PROJECT OUTPUTS · INTERACTIVE DEMO</strong><span>{scenario==='baseline'?'BASELINE / 45 DAYS':scenario==='delay'?'RISK SCENARIO / +5D':'REPLANNED / +2D'}</span></div>
   <div className="pfpm-holo-status" aria-hidden="true"><span className="pfpm-holo-status-light"/> PROJECT CONTROL ROOM <span>AI ASSISTS <b>•</b> PM APPROVES</span></div>
   <div className="pfpm-tablist" role="tablist" aria-label="Explore project management artifacts">
    {tabs.map(([id,label,Icon])=><button type="button" role="tab" id={'pfpm-tab-'+id} aria-selected={view===id}
     aria-controls="pfpm-output-panel" key={id} onClick={()=>{setView(id);setPlaying(false);}}
     className={view===id?'is-selected':''}><Icon size={13}/>{label}</button>)}
   </div>
   <div className="pfpm-holo-progress" aria-hidden="true"><span style={{width:Math.round(Math.max(0,progress+1)/stages.length*100)+'%'}}/></div>
   <div className="pfpm-tabpanel" role="tabpanel" id="pfpm-output-panel" aria-labelledby={'pfpm-tab-'+view}>
    {view==='gantt'&&<div className="pfpm-gantt" aria-label={'Illustrative Gantt forecast '+forecast+' days'}>
     <div className="pfpm-gantt-scale"><span>WORK PACKAGE</span><span>DAY 01</span><span>DAY 15</span><span>DAY 30</span><span>DAY {forecast}</span></div>
     {packages.map((item,index)=>{
      const first=taskStart(item,shift),last=taskEnd(item,shift);
      const percent=(first-1)/forecast*100,length=(last-first+1)/forecast*100;
      return <div className="pfpm-gantt-row" key={item.id}>
       <span title={item.label}>{item.id} · {item.label}</span>
       <div className="pfpm-gantt-track"><span className={'pfpm-gantt-bar'+(index<=Math.min(6,progress-1)?' is-done':'')} style={{left:percent+'%',width:length+'%',animationDelay:(index*.15)+'s'}}/>
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
   <button type="button" className="pfpm-start" onClick={run} disabled={playing}><Play size={12} fill="currentColor"/> {playing?'SIMULATING…':'RUN WORKFLOW'}</button>
   <button type="button" onClick={delay} className={scenario==='delay'?'pfpm-action-alert':''}><AlertTriangle size={13}/> INTRODUCE +5D DELAY</button>
   <button type="button" onClick={replan} disabled={scenario!=='delay'}><Sparkles size={14}/> REVIEW RECOVERY</button>
   <button type="button" className="pfpm-reset" onClick={reset} aria-label="Reset the project demo"><RotateCcw size={15}/></button>
  </div>
  <div className="pfpm-footer">
   <span>{scenario==='replanned'?'SIMULATED PM REVIEW · 3 DAYS RECOVERED':scenario==='delay'?'SIMULATED TRADE DELAY · CRITICAL PATH':'INTERACTIVE CONCEPT · ALL PROJECT DATA ILLUSTRATIVE'}</span>
   <div><button type="button" onClick={()=>move(-1)} aria-label="Previous phase"><ChevronLeft size={16}/></button><span>{String(active+1).padStart(2,'0')} / 08</span><button type="button" onClick={()=>move(1)} aria-label="Next phase"><ChevronRight size={16}/></button></div>
  </div>
  <span className="pfpm-flow-hint" aria-hidden="true">CLIENT BRIEF <ArrowRight size={11}/> AI DRAFT <ArrowRight size={11}/> PM VALIDATION <ArrowRight size={11}/> HANDOVER</span>
 </aside>;
}

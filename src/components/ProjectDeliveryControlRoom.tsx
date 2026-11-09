import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import type {LucideIcon} from 'lucide-react';
import {
 ArrowRight,Check,CheckCircle2,ChevronLeft,ChevronRight,ClipboardCheck,
 CalendarDays,FileText,GitBranch,HardHat,Layers3,Play,RotateCcw,
 ShieldCheck,Sparkles,TrendingUp,Wallet,Clock3,AlertTriangle,
 Gauge,Settings2,UserRound,BarChart3,Send,Mail,Pause,Info,
 ListChecks,Target,BookOpen,Network,TimerReset,SlidersHorizontal
} from 'lucide-react';
import './ProjectDeliveryControlRoom.css';

/** Self-contained illustrative scenario, not live project or client performance data. */
type Mode='editor'|'execution'|'manager';
type Scenario='baseline'|'delay'|'recovery';
type Output='gantt'|'wbs'|'milestones'|'budget';
type Step={
 id:string;name:string;short:string;group:string;icon:LucideIcon;description:string;
 problem:string;solution:string;time:string;owner:string;inputs:string[];actions:string[];outputs:string[];
};
const steps:Step[]=[
 {id:'intake',name:'Client Request',short:'Request Intake',group:'AUTOMATION',icon:FileText,
 description:'Capture a business or project request in a single, traceable record.',
 problem:'Requests scattered across email, calls and attachments are easy to miss.',
 solution:'Consolidate the brief, identify missing information and assign an owner.',
 time:'Example: 10–20 minutes to log and classify a request',
 owner:'Project coordinator',inputs:['Client brief and email','Supporting plans and documents','Objectives, constraints and requested dates'],
 actions:['Create a central request record','Identify missing fields','Route the request for review'],
 outputs:['Structured intake record','Initial request owner','List of open questions']},
 {id:'summary',name:'AI Summary',short:'AI Summary',group:'AUTOMATION',icon:Sparkles,
 description:'Turn an unstructured request into an organized draft for human validation.',
 problem:'Reviewing long email chains and document sets creates repetitive work.',
 solution:'Prepare a draft summary of scope, dependencies and questions.',
 time:'Example: 5–15 minutes for initial AI-assisted review',
 owner:'Automation + coordinator',inputs:['Original request','Relevant attachments','Requirements template'],
 actions:['Extract proposed scope and deadlines','Identify missing facts','Mark uncertainty for review'],
 outputs:['Draft requirements','Open questions list','Human review queue']},
 {id:'approval',name:'PM Approval',short:'PM Review',group:'HUMAN CHECKPOINT',icon:UserRound,
 description:'Review assumptions and secure agreement on project scope and ownership.',
 problem:'Unapproved requirements cause rework, disagreements and scope drift.',
 solution:'Make the project manager responsible for confirming scope and decisions.',
 time:'Example: 20–40 minutes for an initial scope review',
 owner:'Project manager + client',inputs:['Draft scope and questions','Client feedback','Constraints and priorities'],
 actions:['Validate the AI draft','Confirm owners and boundaries','Approve or return for clarification'],
 outputs:['Approved project scope','Named decision-makers','Decision record']},
 {id:'risk',name:'Risk Check',short:'Risk Review',group:'HUMAN CHECKPOINT',icon:ShieldCheck,
 description:'Identify issues and constraints before committing to a delivery plan.',
 problem:'Late discovery of dependencies can affect timing, cost and quality.',
 solution:'Document likelihood, impact, response and accountable owners.',
 time:'Example: 15–30 minutes for initial risk triage',
 owner:'PM / responsible specialists',inputs:['Approved scope','Vendor and permitting constraints','Initial schedule assumptions'],
 actions:['Record potential risks','Flag critical dependencies','Assign mitigation owners'],
 outputs:['Risk register','Mitigation actions','Escalation thresholds']},
 {id:'wbs',name:'Work Breakdown',short:'Task Planning',group:'PROJECT CONTROL',icon:Layers3,
 description:'Translate the agreed scope into deliverables, tasks and clear ownership.',
 problem:'Large projects stall when work packages and responsibilities are unclear.',
 solution:'Break down deliverables into manageable tasks and dependencies.',
 time:'Example: 30–60 minutes to structure an initial small-project WBS',
 owner:'Project coordinator / PM',inputs:['Approved scope','Risk register','Work package assumptions'],
 actions:['Build WBS and dependencies','Identify responsible parties','Establish acceptance criteria'],
 outputs:['Work breakdown structure','Task ownership','Dependency map']},
 {id:'schedule',name:'Schedule & Cost',short:'Execution Plan',group:'PROJECT CONTROL',icon:CalendarDays,
 description:'Develop a baseline for timing, budget and milestones.',
 problem:'Without a baseline, delays and spending changes are hard to evaluate.',
 solution:'Connect WBS tasks to a schedule, cost plan and review checkpoints.',
 time:'Example: 30–60 minutes for an initial plan',
 owner:'Project manager / estimator',inputs:['WBS and dependencies','Resource availability','Cost assumptions'],
 actions:['Sequence activities','Estimate durations and costs','Set milestone checkpoints'],
 outputs:['Gantt and milestones','Budget baseline','Updated delivery forecast']},
 {id:'vendor',name:'Vendor Follow-up',short:'Execution',group:'DELIVERY',icon:HardHat,
 description:'Coordinate supplier commitments, status updates and issue escalation.',
 problem:'Important follow-ups get buried and procurement delays are noticed late.',
 solution:'Use shared task ownership and structured reminders to surface exceptions.',
 time:'Example: 10–20 minutes for a weekly status cycle',
 owner:'Project coordinator / vendors',inputs:['Confirmed vendor commitments','Open issues and due dates','Current project schedule'],
 actions:['Request and record updates','Flag deviations','Escalate blockers for decision'],
 outputs:['Vendor status log','Pending actions','Issue escalation record']},
 {id:'dashboard',name:'Dashboard Update',short:'Closeout',group:'DELIVERABLES',icon:BarChart3,
 description:'Give managers a clear view of progress, changes and next decisions.',
 problem:'Disconnected spreadsheets and messages obscure what happens next.',
 solution:'Present one consistent view of budget, schedule, risks and accountability.',
 time:'Example: 10–15 minutes to review an updated status view',
 owner:'Coordinator / PM / stakeholders',inputs:['Task and milestone updates','Cost and risk records','Approval decisions'],
 actions:['Consolidate status','Highlight exceptions','Prepare next-step decisions'],
 outputs:['Project status dashboard','Updated forecast','Traceable handover or follow-up']}
];
const phases=[{label:'Request Intake',step:0,icon:FileText},{label:'AI Summary',step:1,icon:Sparkles},{label:'PM Review',step:2,icon:UserRound},{label:'Task Planning',step:4,icon:Layers3},{label:'Execution',step:6,icon:Play},{label:'Closeout',step:7,icon:CheckCircle2}];
const tasks=[
 {id:'1.0',title:'Scope & approvals',owner:'Owner / PM',start:0,end:7,price:4500},
 {id:'2.0',title:'Design & permits',owner:'Design team',start:7,end:17,price:13000},
 {id:'3.0',title:'Procurement',owner:'Vendor / PM',start:17,end:26,price:14500},
 {id:'4.0',title:'Construction',owner:'Trades / GC',start:25,end:40,price:45500},
 {id:'5.0',title:'Testing & closeout',owner:'PM / client',start:40,end:45,price:12500}
];
const milestones=[{name:'Requirements agreed',day:7,owner:'Owner + PM'},{name:'Design approved',day:17,owner:'Design team'},{name:'Materials coordinated',day:26,owner:'Procurement'},{name:'Construction complete',day:40,owner:'GC / trades'},{name:'Final handover',day:45,owner:'PM + owner'}];
const currency=(value:number)=>'$'+value.toLocaleString('en-US');
const getOffset=(scenario:Scenario)=>scenario==='delay'?5:scenario==='recovery'?2:0;

function BuildingWireframe(){
 const levels=[0,1,2,3,4];
 return <div className="pdc-architecture" aria-hidden="true">
  <svg viewBox="0 0 620 285" role="presentation" focusable="false">
   <defs><linearGradient id="pdcBlueprint" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#81f4f5" stopOpacity=".42"/><stop offset="100%" stopColor="#56b3df" stopOpacity=".06"/></linearGradient></defs>
   <path d="M42 204 L273 104 L555 209 L312 276 Z" fill="url(#pdcBlueprint)" stroke="#5cdeed" strokeOpacity=".7"/>
   <path d="M76 207 L278 120 L516 207 L312 261 Z" fill="none" stroke="#73cddb" strokeOpacity=".55"/>
   {levels.map((n)=><g key={n} stroke="#8adce6" strokeWidth="1.2" opacity={.67-n*.04} fill="none" transform={'translate(0 '+(-n*27)+')'}>
     <path d="M186 158 L314 104 L461 157 L333 211 Z"/>
     <path d="M186 158 L186 185 M314 104 L314 131 M461 157 L461 184 M333 211 L333 238"/>
     <path d="M227 141 L373 195 M266 124 L413 178 M303 108 L450 161 M223 173 L349 121 M266 189 L392 136"/>
    </g>)}
   <path d="M186 158 V50 M314 104 V-4 M461 157 V49 M333 211 V103" stroke="#97eff2" strokeOpacity=".8" fill="none"/>
   <path d="M186 50 L314 -4 L461 49 L333 103 Z" fill="#8bfbff" fillOpacity=".065" stroke="#b5fbff" strokeOpacity=".75"/>
   <path d="M500 218 V12 M492 20 H599 M500 12 L564 -14 M500 40 L578 7 M537 20 L537 171" stroke="#80c9e2" strokeOpacity=".7" fill="none"/>
   <path d="M20 226 H596 M70 242 H550" stroke="#6fcad5" strokeOpacity=".35" strokeDasharray="3 8"/>
  </svg>
  <div className="pdc-architecture-caption">STRUCTURE · DEPENDENCIES · DELIVERY</div>
 </div>;
}

export function ProjectDeliveryTeaser(){
 return <a href="#project-control-room" className="pdc-teaser" aria-label="Explore the interactive Project Delivery Control Room demo">
  <BuildingWireframe/>
  <div className="pdc-teaser-caption"><span>PROJECT OPERATIONS / INTERACTIVE MODEL</span><strong>See how a request becomes an accountable delivery plan.</strong><small>8 connected steps · Human approval · Schedule and cost control</small><em>OPEN INTERACTIVE DEMO <ArrowRight size={15}/></em></div>
 </a>;
}

export default function ProjectDeliveryControlRoom(){
 const [active,setActive]=useState(0);
 const [mode,setMode]=useState<Mode>('editor');
 const [output,setOutput]=useState<Output>('gantt');
 const [scenario,setScenario]=useState<Scenario>('baseline');
 const [playing,setPlaying]=useState(false);
 const [progress,setProgress]=useState(0);
 const [weekly,setWeekly]=useState(12);
 const [manual,setManual]=useState(65);
 const [assisted,setAssisted]=useState(30);
 const current=steps[active],Icon=current.icon;
 const delay=getOffset(scenario),forecast=45+delay;
 const forecastBudget=scenario==='delay'?94500:scenario==='recovery'?92000:90000;
 const hoursSaved=Math.max(0,weekly*(manual-assisted)/60);
 const select=(index:number)=>{setPlaying(false);setActive(index);setProgress(index);if(index===4)setOutput('wbs');if(index===5)setOutput('gantt');if(index===7)setOutput('milestones');};
 const chooseScenario=(next:Scenario)=>{setPlaying(false);setScenario(next);setMode('manager');setOutput('gantt');setActive(5);};
 const reset=()=>{setPlaying(false);setActive(0);setProgress(0);setScenario('baseline');setMode('editor');setOutput('gantt');};
 const run=()=>{setActive(0);setProgress(0);setPlaying(true);setMode('execution');};
 useEffect(()=>{
  if(!playing)return;
  if(progress>=steps.length-1){setPlaying(false);return;}
  const handle=window.setTimeout(()=>{setProgress(n=>n+1);setActive(n=>Math.min(n+1,steps.length-1));},850);
  return()=>window.clearTimeout(handle);
 },[playing,progress]);
 const move=(delta:number)=>select((active+delta+steps.length)%steps.length);
 const outputTabs:[Output,string,LucideIcon][]=[['gantt','Gantt',CalendarDays],['wbs','WBS',GitBranch],['milestones','Milestones',Target],['budget','Budget',Wallet]];
 const costChange=forecastBudget-90000;
 return <section id="project-control-room" className="pdc-room" aria-labelledby="pdc-main-title">
  <div className="pdc-container">
   <header className="pdc-hero">
    <div className="pdc-hero-copy">
     <div className="pdc-kicker"><span/> AI + PM + OPERATIONS WORKFLOW <i/></div>
     <h2 id="pdc-main-title">From Request to <span>Accountable Delivery.</span></h2>
     <p>See how incoming requests can be structured, reviewed, planned and tracked — with automation supporting the work and people approving the important decisions.</p>
     <div className="pdc-hero-subnote"><Info size={15}/> Interactive concept · Fictional renovation example · No live system connected</div>
    </div>
    <BuildingWireframe/>
   </header>

   <nav className="pdc-phase-nav" aria-label="Project delivery phases">
    {phases.map(p=>{const PhaseIcon=p.icon;return <button type="button" key={p.label} onClick={()=>select(p.step)} className={active===p.step?'is-current':''} aria-pressed={active===p.step}><PhaseIcon size={18}/>{p.label}</button>;})}
   </nav>

   <div className="pdc-workspace">
    <div className="pdc-workspace-main">
     <div className="pdc-editor pdc-panel">
      <div className="pdc-editor-header">
       <div className="pdc-title-mark"><Layers3 size={24}/></div>
       <div><strong>Project Delivery Control Room</strong><small>INTERACTIVE AUTOMATION WORKFLOW</small></div>
       <div className="pdc-mode-switch" role="group" aria-label="Workflow display mode">{(['editor','execution','manager'] as const).map(m=><button type="button" key={m} onClick={()=>{setMode(m);setPlaying(false);}} className={mode===m?'selected':''} aria-pressed={mode===m}>{m==='editor'?'Editor':m==='execution'?'Execution':'Manager'}</button>)}</div>
      </div>
      {mode==='manager'&&<div className="pdc-mode-notice"><Gauge size={15}/> MANAGER VIEW <span>Schedule {forecast} days · Forecast {currency(forecastBudget)} · {scenario==='delay'?'Delay requires a decision':scenario==='recovery'?'Recovery under PM review':'Baseline on track'}</span></div>}
      {mode==='execution'&&<div className="pdc-mode-notice"><Play size={15}/> EXECUTION VIEW <span>{playing?'Simulating workflow progression':'Select a node or press Run Workflow to review the sequence'}</span></div>}
      <div className="pdc-flow-scroll" tabIndex={0} aria-label="Horizontally scrollable eight-node workflow">
       <div className="pdc-flow-canvas">
        <div className="pdc-groups" aria-hidden="true"><span>AUTOMATION</span><span>HUMAN CHECKPOINT</span><span>PROJECT CONTROL</span><span>DELIVERABLES</span></div>
        <div className="pdc-flow-line" aria-hidden="true"/>
        <div className="pdc-flow-nodes">
         {steps.map((s,i)=>{const NodeIcon=s.icon;return <button type="button" key={s.id} className={'pdc-flow-node '+(active===i?'is-selected ':'')+(i<=progress?'is-passed ':'')+(s.id==='approval'?'human ':'')} onClick={()=>select(i)} aria-pressed={active===i}>
          <NodeIcon size={25} strokeWidth={1.6}/><strong>{s.name}</strong><small>{String(i+1).padStart(2,'0')}</small><i/>
         </button>;})}
        </div>
       </div>
      </div>
      <div className="pdc-editor-footer">
       <span><i className="pdc-live-dot"/> {playing?'SIMULATION RUNNING':scenario==='delay'?'DELAY SCENARIO ACTIVE':scenario==='recovery'?'RECOVERY SCENARIO ACTIVE':'READY FOR EXPLORATION'}</span>
       <div><button onClick={()=>move(-1)} aria-label="Previous workflow step"><ChevronLeft size={17}/></button><b>{String(active+1).padStart(2,'0')} / 08</b><button onClick={()=>move(1)} aria-label="Next workflow step"><ChevronRight size={17}/></button></div>
      </div>
     </div>

     <div className="pdc-lower-grid">
      <div className="pdc-brief pdc-panel">
       <div className="pdc-panel-kicker"><BookOpen size={16}/> SELECTED STEP · {String(active+1).padStart(2,'0')} / 08</div>
       <h3>{current.description}</h3>
       <p>{current.solution}</p>
       <div className="pdc-io">
        <div><span><FileText size={16}/> INPUT</span><strong>{current.inputs[0]}</strong></div>
        <ArrowRight size={19}/>
        <div><span><Layers3 size={16}/> OUTPUT</span><strong>{current.outputs[0]}</strong></div>
       </div>
      </div>
      <div className="pdc-outputs pdc-panel">
       <div className="pdc-panel-top"><span className="pdc-panel-kicker"><BarChart3 size={16}/> PROJECT OUTPUTS</span><small>SIMULATED DELIVERY VIEW</small></div>
       <div className="pdc-output-tabs" role="group" aria-label="Project output views">{outputTabs.map(([id,label,OutputIcon])=><button key={id} type="button" className={output===id?'active':''} aria-pressed={output===id} onClick={()=>setOutput(id)}><OutputIcon size={15}/>{label}</button>)}</div>
       {output==='gantt'&&<div className="pdc-gantt"><div className="pdc-gantt-row pdc-gantt-head"><span>WORK PACKAGE</span><div> <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span><span>W8</span></div></div>{tasks.map(t=>{const later=t.start>=25;const start=t.start+(later?delay:0),end=t.end+(later?delay:0);return <div className="pdc-gantt-row" key={t.id}><span title={t.owner}>{t.id} {t.title}</span><div className="pdc-gantt-track"><i style={{left:(start/55*100)+'%',width:((end-start)/55*100)+'%'}}/></div></div>})}</div>}
       {output==='wbs'&&<div className="pdc-wbs">{tasks.map((t,i)=><div key={t.id}><span>{t.id}</span><strong>{t.title}</strong><small>{t.owner}</small><i style={{width:(18+i*17)+'%'}}/></div>)}</div>}
       {output==='milestones'&&<div className="pdc-milestones">{milestones.map(m=><div key={m.name}><CheckCircle2 size={15}/><strong>{m.name}</strong><span>DAY {m.day+(m.day>=40?delay:0)}</span></div>)}</div>}
       {output==='budget'&&<div className="pdc-budget">{tasks.map(t=><div key={t.id}><span>{t.title}</span><strong>{currency(t.price)}</strong><i style={{width:(t.price/45500*100)+'%'}}/></div>)}<div className="pdc-budget-total"><span>FORECAST TOTAL</span><strong>{currency(forecastBudget)}</strong></div></div>}
      </div>
     </div>
    </div>

    <aside className="pdc-detail pdc-panel" aria-live="polite">
     <div className="pdc-panel-kicker"><Settings2 size={17}/> NODE DETAIL / {current.group}</div>
     <div className="pdc-detail-heading"><span><Icon size={26}/></span><div><h3>{current.name}</h3><p>{current.description}</p></div></div>
     <div className="pdc-detail-block"><h4><AlertTriangle size={17}/> Business problem</h4><p>{current.problem}</p></div>
     <div className="pdc-detail-block"><h4><CheckCircle2 size={17}/> Practical solution</h4><p>{current.solution}</p></div>
     <div className="pdc-detail-block"><h4><FileText size={17}/> Inputs</h4><ul>{current.inputs.map(t=><li key={t}>{t}</li>)}</ul></div>
     <div className="pdc-detail-block"><h4><Network size={17}/> What happens</h4><ul>{current.actions.map(t=><li key={t}>{t}</li>)}</ul></div>
     <div className="pdc-detail-block"><h4><Layers3 size={17}/> Visible outputs</h4><ul>{current.outputs.map(t=><li key={t}>{t}</li>)}</ul></div>
     <div className="pdc-detail-responsibility"><div><UserRound size={17}/><span><small>RESPONSIBLE ROLE</small><strong>{current.owner}</strong></span></div><div><Clock3 size={17}/><span><small>ILLUSTRATIVE EFFORT</small><strong>{current.time}</strong></span></div></div>
    </aside>
   </div>

   <div className="pdc-kpis" aria-label="Fictional project forecast metrics">
    <div><Clock3 size={27}/><span><small>Delivery forecast</small><strong>{forecast} days</strong><em>{delay?('+'+delay+'d vs baseline'):'45-day baseline'}</em></span></div>
    <div><Wallet size={27}/><span><small>Cost forecast</small><strong>{currency(forecastBudget)}</strong><em>{costChange?'+'+currency(costChange)+' vs baseline':'Within baseline'}</em></span></div>
    <div><TrendingUp size={27}/><span><small>Current phase</small><strong>{scenario==='baseline'?'Design & Permits':scenario==='delay'?'Schedule exception':'Recovery review'}</strong><em>Illustrative project status</em></span></div>
    <div><AlertTriangle size={27}/><span><small>Open risks</small><strong>{scenario==='baseline'?3:scenario==='delay'?4:3}</strong><em>{scenario==='delay'?'One additional issue flagged':'Sample risk register'}</em></span></div>
   </div>

   <div className="pdc-actionbar">
    <div className="pdc-action-caption"><strong>TRY AN INTERACTIVE PROJECT SCENARIO</strong><span>Change a constraint and see the schedule and cost forecast respond.</span></div>
    <div className="pdc-action-buttons"><button type="button" className="pdc-run" onClick={playing?()=>setPlaying(false):run}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':'Run Workflow'}</button><button type="button" className={scenario==='delay'?'pdc-warn active':'pdc-warn'} onClick={()=>chooseScenario('delay')}><AlertTriangle size={17}/> Introduce +5-day delay</button><button type="button" disabled={scenario!=='delay'} onClick={()=>chooseScenario('recovery')}><TimerReset size={17}/> Review recovery</button><button type="button" className="pdc-reset" onClick={reset} aria-label="Reset demonstration"><RotateCcw size={17}/></button></div>
   </div>

   <div className="pdc-business">
    <div className="pdc-business-head"><div><div className="pdc-kicker"><span/> WHY THIS MATTERS TO A BUSINESS</div><h3>Less chasing. More predictable delivery.</h3><p>Automation is useful only when it helps people make better decisions and reduces the administrative burden of keeping work moving.</p></div><Link to="/services" className="pdc-business-link">Explore business services <ArrowRight size={18}/></Link></div>
    <div className="pdc-business-cards">
     <article><div><AlertTriangle size={21}/> WITHOUT A COORDINATED PROCESS</div><h4>Scattered requests and late surprises</h4><p>Emails, documents, vendors and task owners sit in separate places. Decisions are harder to trace and delays surface late.</p></article>
     <article><div><CheckCircle2 size={21}/> WITH A STRUCTURED WORKFLOW</div><h4>One visible path from request to action</h4><p>Information is captured, reviewed by a person, assigned to an owner and reflected in schedule, cost and risk views.</p></article>
     <article className="pdc-savings"><div><SlidersHorizontal size={21}/> ESTIMATE YOUR ADMINISTRATIVE EFFORT</div><h4>Explore a hypothetical time-saving scenario</h4>
      <div className="pdc-calc-row"><label htmlFor="pdc-frequency">Requests / week</label><output>{weekly}</output></div>
      <input id="pdc-frequency" type="range" min="4" max="40" step="1" value={weekly} onChange={event=>setWeekly(Number(event.target.value))}/>
      <div className="pdc-calc-row"><label htmlFor="pdc-manual">Manual minutes / request</label><output>{manual}</output></div>
      <input id="pdc-manual" type="range" min="30" max="120" step="5" value={manual} onChange={event=>setManual(Number(event.target.value))}/>
      <div className="pdc-calc-row"><label htmlFor="pdc-assisted">Assisted minutes / request</label><output>{assisted}</output></div>
      <input id="pdc-assisted" type="range" min="5" max="90" step="5" value={assisted} onChange={event=>setAssisted(Number(event.target.value))}/>
      <div className="pdc-savings-result"><strong>{hoursSaved.toFixed(1)} hours / week</strong><span>Illustrative administrative time difference</span></div>
      <small>Calculator assumptions are editable examples, not measured results or guaranteed savings. Implementation and review time are not included.</small>
     </article>
    </div>
    <div className="pdc-end-cta"><span><strong>Need a clearer operating process or a coordinated project plan?</strong><small>Start with the problem. We'll discuss the appropriate scope, people and tools.</small></span><Link to="/book">Discuss Your Project <ArrowRight size={17}/></Link></div>
   </div>
   <p className="pdc-disclaimer"><Info size={14}/> All schedules, costs, risks and efficiency figures here are simulated for demonstration. AI drafts do not approve or change project baselines; a responsible person does.</p>
  </div>
 </section>;
}

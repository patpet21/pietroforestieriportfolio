import {useCallback,useEffect,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent} from 'react';
import {
 ArrowRight,ArrowUpRight,BellRing,BrainCircuit,Check,ChevronRight,CircleCheck,
 Clock3,GitBranch,LayoutDashboard,ListTodo,Mail,Play,ShieldCheck,UserRoundCheck,Workflow
} from 'lucide-react';
import './AIWorkflowStory.css';

/**
 * Illustrated AI + PM operations workflow. This is a conceptual, interactive simulation;
 * it does not process real email, call LLMs, create live tasks, or send reminders.
 * AI drafts are reviewed by a human before a workflow produces outputs.
 */
const steps=[
 {role:'TRIGGER',number:'01',title:'The request arrives.',subtitle:'A real client question starts the process.',
  body:'A vendor emails about a delayed delivery. Instead of letting it get buried in an inbox, the request enters one visible workflow.',
  incoming:'“The kitchen delivery is delayed. Can we move the installation to Friday?”',
  action:'Capture the message and keep a link to the original request.',
  output:'A new change request, ready to classify.',
  value:'Nothing is lost between the inbox and the project.',Icon:Mail},
 {role:'AI DRAFT',number:'02',title:'AI reads and organizes.',subtitle:'Draft analysis — never an automatic decision.',
  body:'AI proposes a short summary, the affected work package, a suggested urgency and questions that still need an answer.',
  incoming:'Vendor email + project context.',
  action:'Extract proposed date, affected activity and missing information.',
  output:'Draft: delivery delay · kitchen work package · requires PM review.',
  value:'The PM spends less time sorting information, more time deciding.',Icon:BrainCircuit},
 {role:'HUMAN GATE',number:'03',title:'The PM verifies the impact.',subtitle:'A person decides what is safe to do.',
  body:'The PM checks dependencies, contractor availability and project commitments. AI does not approve a scope or date change.',
  incoming:'AI summary and linked source email.',
  action:'Confirm facts, approve next steps, or request clarification.',
  output:'Decision: validate a new installation date with the contractor.',
  value:'Accountability stays with the project team.',Icon:UserRoundCheck},
 {role:'PROJECT TASK',number:'04',title:'The approved task is created.',subtitle:'A clear owner, deadline and next action.',
  body:'The accepted decision becomes an example project task with an assignee, target date, WBS link and a reference to the decision.',
  incoming:'Human-approved action.',
  action:'Create a trackable task in the project workflow.',
  output:'Task: confirm installation · owner: PM · target: Friday.',
  value:'Every request becomes work someone can actually finish.',Icon:ListTodo},
 {role:'AUTOMATION',number:'05',title:'Follow-up stays on track.',subtitle:'Rules handle the repetition; humans handle exceptions.',
  body:'If the task remains open, a rule can prepare a reminder or alert the PM. Client-facing messages are reviewed before sending.',
  incoming:'Task status, owner and due date.',
  action:'Check the status; trigger a reminder or escalation when needed.',
  output:'Draft reminder to PM if no confirmation arrives.',
  value:'Fewer overlooked handoffs and chasing emails.',Icon:BellRing},
 {role:'OUTPUT',number:'06',title:'One clear project view.',subtitle:'The team sees what changed, who owns it and what comes next.',
  body:'The workflow ends in a reviewable project dashboard: request, AI draft, PM approval, task owner, deadline and current status.',
  incoming:'Validated request and updated task.',
  action:'Update the project record and show the next decision.',
  output:'Change request tracked · owner assigned · follow-up visible.',
  value:'Better visibility without surrendering human control.',Icon:LayoutDashboard}
] as const;
const nodes=[
 {x:16,y:32,step:0},
 {x:45,y:32,step:1},
 {x:74,y:32,step:2},
 {x:74,y:70,step:3},
 {x:45,y:70,step:4},
 {x:16,y:70,step:5}
] as const;
const edges=[
 'M246 189 C290 189 321 189 361 189',
 'M535 189 C575 189 611 189 651 189',
 'M832 189 C935 189 935 413 836 413',
 'M651 413 C610 413 575 413 535 413',
 'M361 413 C319 413 290 413 246 413'
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export default function ScrollWBSAutomation(){
 const section=useRef<HTMLElement|null>(null);
 const visual=useRef<HTMLDivElement|null>(null);
 const frame=useRef<number>(0);
 const reduce=useRef(false);
 const [progress,setProgress]=useState(0);
 const [reduced,setReduced]=useState(false);
 const active=Math.min(steps.length-1,Math.round(progress*(steps.length-1)));
 const current=steps[active];
 const CurrentIcon=current.Icon;
 useEffect(()=>{
  const el=section.current;
  if(!el)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const read=()=>{
   if(reduce.current)return;
   const rect=el.getBoundingClientRect();
   const range=Math.max(1,el.offsetHeight-window.innerHeight);
   const value=clamp(-rect.top/range);
   setProgress(last=>Math.abs(value-last)>.002?value:last);
  };
  const onMedia=()=>{reduce.current=media.matches;setReduced(media.matches);if(!media.matches)read();};
  const onScroll=()=>{if(frame.current)return;frame.current=window.requestAnimationFrame(()=>{frame.current=0;read();});};
  onMedia();window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll);media.addEventListener('change',onMedia);
  return()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);media.removeEventListener('change',onMedia);window.cancelAnimationFrame(frame.current);};
 },[]);
 const select=useCallback((index:number)=>{
  if(reduce.current){setProgress(index/(steps.length-1));return;}
  const el=section.current;if(!el)return;
  const start=window.scrollY+el.getBoundingClientRect().top;
  const range=Math.max(0,el.offsetHeight-window.innerHeight);
  window.scrollTo({top:start+range*index/(steps.length-1),behavior:'smooth'});
 },[]);
 const onMove=(event:PointerEvent<HTMLDivElement>)=>{
  if(event.pointerType==='touch'||reduce.current||!visual.current)return;
  const box=event.currentTarget.getBoundingClientRect();
  const px=(event.clientX-box.left)/box.width-.5;
  const py=(event.clientY-box.top)/box.height-.5;
  visual.current.style.setProperty('--pf26-rotate-y',(px*4).toFixed(2)+'deg');
  visual.current.style.setProperty('--pf26-rotate-x',(-py*3).toFixed(2)+'deg');
 };
 const onLeave=()=>{visual.current?.style.setProperty('--pf26-rotate-y','0deg');visual.current?.style.setProperty('--pf26-rotate-x','0deg');};
 return <section className={'pf10-scroll-section pf26-flow-demo'+(reduced?' pf26-reduced':'')} ref={section} aria-label="Six-stage AI and project management workflow simulation">
  <div className="pf10-scroll-sticky">
   <div className="wrap pf10-scroll-layout">
    <div className="pf10-scroll-title pf26-title">
     <div><small className="eyebrow"><i/> 03 / REAL BUSINESS WORKFLOW × AI + PROJECT MANAGEMENT</small>
      <h2>From one email.<br/><em>To accountable action.</em></h2></div>
     <p>See exactly how a request moves through AI analysis, a human approval gate, task creation and follow-up. <strong>Scroll or click a connected node.</strong></p>
    </div>
    <div className="pf10-scroll-workspace pf26-workspace">
     <div className="pf10-network-visual pf26-canvas" onPointerMove={onMove} onPointerLeave={onLeave} ref={visual}>
      <div className="pf10-grid pf26-grid" aria-hidden="true"/>
      <div className="pf26-canvas-caption"><span><i/> AI + PM / FLOW 01</span><b>EXAMPLE · NOT CONNECTED TO LIVE SYSTEMS</b></div>
      <div className="pf26-flow-layer">
       <svg className="pf26-connector-svg" viewBox="0 0 1000 590" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="pf26-arrowhead" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#7ccbd1"/></marker></defs>
        {edges.map((d,i)=><g key={d}><path className="pf26-wire-back" d={d}/><path className={'pf26-wire'+(active>i?' is-passed':'')+(active===i||active===i+1?' is-current':'')} d={d} markerEnd="url(#pf26-arrowhead)"/></g>)}
       </svg>
       {nodes.map(({x,y,step})=>{
        const item=steps[step];const Icon=item.Icon;
        const roleClass=item.role.toLowerCase().replace(' ','-');
        return <button type="button" key={item.number} onClick={()=>select(step)} aria-pressed={active===step} aria-label={'Open step '+item.number+' '+item.title}
         className={'pf26-node role-'+roleClass+(active===step?' is-active':'')+(active>step?' is-visited':'')}
         style={{left:x+'%',top:y+'%','--pf26-depth':active===step?'42px':active>step?'14px':'0px'} as CSSProperties}>
          <span className="pf26-node-port pf26-node-in" aria-hidden="true"/><span className="pf26-node-port pf26-node-out" aria-hidden="true"/>
          <span className="pf26-node-top"><span>{item.number} / {item.role}</span>{active>step?<Check size={13}/>:<span className="pf26-node-led"/>}</span>
          <span className="pf26-node-main"><span className="pf26-node-icon"><Icon size={19} strokeWidth={1.9}/></span><strong>{['Client email','AI extracts','PM approves','Create task','Follow-up rule','Project dashboard'][step]}</strong></span>
          <small>{['Incoming request','Structured draft','Human checkpoint','Owner + deadline','Reminder / escalation','Status + next step'][step]}</small>
         </button>;
       })}
      </div>
      <div className="pf26-canvas-footer">
       <div><span className="pf26-legend-dot is-ai"/> AI DRAFT <span className="pf26-legend-dot is-human"/> HUMAN APPROVAL <span className="pf26-legend-dot is-system"/> CONTROLLED AUTOMATION</div>
       <span>CLICK NODES TO INSPECT <ChevronRight size={12}/></span>
      </div>
     </div>
     <aside className="pf10-scroll-story pf26-story" aria-live="polite">
      <div className="pf26-story-top"><span>STEP {current.number} / 06</span><span className="pf26-story-role"><CurrentIcon size={15}/>{current.role}</span></div>
      <h3>{current.title}</h3><h4>{current.subtitle}</h4>
      <p>{current.body}</p>
      <div className="pf26-story-example"><span>WHAT COMES IN</span><strong>{current.incoming}</strong></div>
      <div className="pf26-story-transition"><div><span>WHAT HAPPENS</span><p>{current.action}</p></div><ArrowRight size={19}/></div>
      <div className="pf26-story-result"><CircleCheck size={19}/><div><span>VISIBLE OUTPUT</span><strong>{current.output}</strong></div></div>
      <div className="pf26-story-value"><ShieldCheck size={16}/><span>{current.value}</span></div>
      <div className="pf26-story-bottom"><div className="pf26-story-pager" role="group" aria-label="Choose a workflow step">
       {steps.map((step,i)=><button type="button" key={step.number} aria-pressed={active===i} title={step.title} onClick={()=>select(i)}>{step.number}</button>)}
      </div><span>{reduced?'SELECT A NODE OR STEP':'SCROLL TO ADVANCE'} <ArrowRight size={15}/></span></div>
     </aside>
    </div>
    <div className="pf10-scroll-progress pf26-scroll-progress" aria-label="Workflow progress"><span style={{width:Math.max(2,progress*100)+'%'}}/></div>
   </div>
  </div>
 </section>;
}

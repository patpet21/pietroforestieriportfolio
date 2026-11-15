import {useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {
  ArrowRight, Bot, BrainCircuit, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleCheck, ClipboardList, ListChecks, Mail, MessageCircleMore, Mic,
  ShieldCheck, Sparkles, UserRoundCheck, Workflow
} from 'lucide-react';
import './PersonalAIAssistant.css';

/**
 * Interactive, illustrative product-story section.
 * No accounts, AI model, calendar, email or tasks are connected in this demo.
 * Changes are visual state only; external actions require explicit authorization
 * in any real implementation.
 */
type AssistantStep = {
  number:string;
  role:string;
  nodeTitle:string;
  nodeDetail:string;
  panelTitle:string;
  subtitle:string;
  description:string;
  incoming:string;
  action:string;
  output:string;
  reassurance:string;
  icon:LucideIcon;
};

const exampleRequest = 'Schedule a meeting with Alex on Friday at 11, prepare a confirmation email and remind me to follow up on Thursday.';

const steps:AssistantStep[] = [
  {
    number:'01',role:'TALK OR TYPE',nodeTitle:'Ask naturally',nodeDetail:'Your words are the starting point',
    panelTitle:'Just ask in your own words.',subtitle:'No complicated commands to learn.',
    description:'Describe what you need as naturally as you would tell a colleague. A practical assistant can begin with a typed or spoken request.',
    incoming:exampleRequest,action:'Capture the request and identify the information needed to move forward.',
    output:'One request covering a meeting, an email and a reminder.',
    reassurance:'The assistant starts with your request, not unlimited access to your data.',icon:MessageCircleMore
  },
  {
    number:'02',role:'AI UNDERSTANDS',nodeTitle:'Intent + context',nodeDetail:'Understand what needs doing',
    panelTitle:'AI understands and organizes.',subtitle:'A practical assistant — not just a chatbot.',
    description:'It interprets your request, identifies the tasks, gathers the relevant context when permitted and prepares a suggested next step for your review.',
    incoming:exampleRequest,action:'Recognize the meeting, email and reminder actions, then prepare them inside a proposed workflow.',
    output:'Meeting draft · confirmation email · follow-up reminder',
    reassurance:'External actions happen only after approval.',icon:BrainCircuit
  },
  {
    number:'03',role:'YOUR TOOLS',nodeTitle:'Calendar · email · tasks',nodeDetail:'Connect the tools you already use',
    panelTitle:'Your tools work together.',subtitle:'Connect only what you choose.',
    description:'A configured assistant can work with authorized tools like calendars, email and task lists instead of making you copy information from app to app.',
    incoming:'A meeting request and access to the specific tools you authorize.',
    action:'Check permitted calendar information and prepare an email and reminder in the appropriate tools.',
    output:'Availability check · email draft · reminder proposal',
    reassurance:'Connections and permissions are agreed before any account access.',icon:CalendarDays
  },
  {
    number:'04',role:'ACTION PLAN',nodeTitle:'Drafts next steps',nodeDetail:'Review-ready actions',
    panelTitle:'A clear plan appears.',subtitle:'One request becomes organized next steps.',
    description:'The assistant separates proposed actions into clear items. You can see what it wants to create, change or send before anything happens.',
    incoming:'The interpreted request and available tool information.',
    action:'Prepare meeting details, a confirmation message and a dated follow-up action.',
    output:'Three proposed actions, each ready for your review.',
    reassurance:'Drafts are suggestions, not completed actions.',icon:ClipboardList
  },
  {
    number:'05',role:'YOUR APPROVAL',nodeTitle:'You stay in control',nodeDetail:'Review before execution',
    panelTitle:'You make the final call.',subtitle:'Useful AI keeps people in control.',
    description:'Review the proposed actions, correct details and explicitly approve the steps that should be carried out.',
    incoming:'A proposed meeting, email and reminder.',
    action:'Approve, edit or reject each proposed change before execution.',
    output:'Only your approved actions are eligible to run.',
    reassurance:'No automatic sending or calendar changes in this illustrative demo.',icon:UserRoundCheck
  },
  {
    number:'06',role:'WORK DONE',nodeTitle:'Tasks, reminders, updates',nodeDetail:'A clear record of what happened',
    panelTitle:'Work moves forward.',subtitle:'Less switching between tools, more clarity.',
    description:'In a connected implementation, approved actions can update your tools and create an easy-to-check record of the result.',
    incoming:'Approved actions and available connected services.',
    action:'Execute authorized steps and record success, errors or items needing further review.',
    output:'Meeting request · prepared email · scheduled follow-up',
    reassurance:'Illustrative outcome only — this page does not run live actions.',icon:CheckCircle2
  }
];

const wires = [
  'M292 420 L385 420',
  'M616 420 L710 420',
  'M878 420 C968 420 968 759 878 759',
  'M710 759 L616 759',
  'M385 759 L292 759'
];

function ToolIcons(){
  return <span className="pfa-tool-icons" aria-hidden="true">
    <span><Mail size={29} strokeWidth={1.8}/></span>
    <span><CalendarDays size={29} strokeWidth={1.8}/></span>
    <span><CheckCircle2 size={30} strokeWidth={1.8}/></span>
  </span>;
}

function Hologram({onActivate}:{onActivate:()=>void}){
  return <button type="button" className="pfa-hologram" onClick={onActivate} aria-label="Explore how the personal AI assistant understands requests">
    <span className="pfa-hologram-halo pfa-hologram-halo-a"/>
    <span className="pfa-hologram-halo pfa-hologram-halo-b"/>
    <span className="pfa-hologram-capsule">
      <span className="pfa-hologram-head"><span className="pfa-hologram-visor"><i/><i/></span></span>
      <span className="pfa-hologram-body"/>
    </span>
    <span className="pfa-hologram-base"><i/><i/></span>
  </button>;
}

export default function ScrollWBSAutomation(){
  const [active,setActive] = useState(1);
  const current=steps[active];
  const next=()=>setActive(index=>Math.min(5,index+1));
  const previous=()=>setActive(index=>Math.max(0,index-1));

  return <section className="pfa-section" id="personal-ai-assistant" aria-labelledby="pfa-heading">
    <div className="pfa-container">
      <header className="pfa-heading">
        <div className="pfa-heading-main">
          <span className="pfa-eyebrow"><i/> 03 / PERSONAL AI ASSISTANT + PROJECT MANAGEMENT</span>
          <h2 id="pfa-heading">Your own AI assistant.<br/><span>Built around your work.</span></h2>
        </div>
        <p>See how a personal AI assistant can understand a request, connect with your tools, prepare actions and help you stay in control. <strong>Click a connected node.</strong></p>
      </header>

      <div className="pfa-layout">
        <div className="pfa-stage" aria-label="Interactive six-step personal AI assistant workflow">
          <div className="pfa-stage-glow" aria-hidden="true"/>
          <div className="pfa-floor" aria-hidden="true"/>
          <div className="pfa-orbit-back" aria-hidden="true"/>
          <Hologram onActivate={()=>setActive(1)}/>
          <svg className="pfa-connections" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="pfa-wire-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="pfa-wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5ce4d8"/>
                <stop offset="55%" stopColor="#adf6ff"/>
                <stop offset="100%" stopColor="#5edfed"/>
              </linearGradient>
            </defs>
            {wires.map((wire,i)=><g key={wire}>
              <path className="pfa-wire-shadow" d={wire}/>
              <path className={'pfa-wire'+(i<active?' is-complete':'')+(i===active-1?' is-current':'')} d={wire}/>
            </g>)}
          </svg>
          <div className="pfa-nodes">
            {steps.map((step,i)=>{
              const Icon=step.icon;
              return <button type="button" key={step.number} className={'pfa-node pfa-node-'+step.number+(i===active?' is-active':'')} onClick={()=>setActive(i)} aria-pressed={i===active} aria-label={'Step '+step.number+': '+step.role+'. '+step.nodeTitle}>
                <span className="pfa-node-portal" aria-hidden="true"/>
                <span className="pfa-node-art" aria-hidden="true">{i===2?<ToolIcons/>:<Icon size={59} strokeWidth={1.6}/>}</span>
                <span className="pfa-node-label">{step.number} / {step.role}</span>
                <strong>{step.nodeTitle}</strong>
                <span className="pfa-node-connector pfa-connector-in" aria-hidden="true"/>
                <span className="pfa-node-connector pfa-connector-out" aria-hidden="true"/>
              </button>;
            })}
          </div>
          <footer className="pfa-stage-footer">
            <div className="pfa-legend">
              <span><i className="pfa-legend-purple"/> Natural language</span>
              <span><i className="pfa-legend-mint"/> Human approval</span>
              <span><i className="pfa-legend-cyan"/> Practical execution</span>
            </div>
            <span className="pfa-canvas-hint">CLICK NODES TO EXPLORE <ArrowRight size={16}/></span>
          </footer>
        </div>

        <aside className="pfa-panel" aria-label="Selected assistant workflow step">
          <div className="pfa-panel-top">
            <span>STEP {current.number} / 06</span>
            <span className="pfa-panel-badge"><Bot size={19}/> AI ASSISTANT</span>
          </div>
          <div className="pfa-panel-copy" aria-live="polite" aria-atomic="true">
            <h3>{current.panelTitle}</h3>
            <h4>{current.subtitle}</h4>
            <p>{current.description}</p>
            <div className="pfa-input">
              <span>WHAT YOU SAY / PROVIDE</span>
              <blockquote>“{current.incoming}”</blockquote>
            </div>
            <div className="pfa-action">
              <span>WHAT HAPPENS</span>
              <div><p>{current.action}</p><ArrowRight size={22}/></div>
            </div>
            <div className="pfa-output">
              <CircleCheck size={25}/>
              <div><span>VISIBLE OUTPUT</span><strong>{current.output}</strong></div>
            </div>
            <p className="pfa-assurance"><ShieldCheck size={18}/>{current.reassurance}</p>
          </div>
          <div className="pfa-panel-bottom">
            <div className="pfa-pager" role="group" aria-label="Choose the assistant workflow step">
              {steps.map((step,i)=><button key={step.number} type="button" onClick={()=>setActive(i)} aria-label={'Show step '+step.number+': '+step.role} aria-pressed={active===i}>{step.number}</button>)}
            </div>
            <div className="pfa-panel-controls">
              <button type="button" onClick={previous} disabled={active===0} aria-label="Previous step"><ChevronLeft size={17}/> PREVIOUS</button>
              <span>EXPLORE EACH STEP</span>
              <button type="button" onClick={next} disabled={active===5} aria-label="Next step">NEXT <ChevronRight size={17}/></button>
            </div>
          </div>
        </aside>
      </div>

      <div className="pfa-progress" role="progressbar" aria-label="Assistant workflow step" aria-valuemin={1} aria-valuemax={6} aria-valuenow={active+1}>
        <span style={{width:((active+1)/steps.length*100)+'%'}}/>
      </div>
      <div className="pfa-disclaimer"><Sparkles size={14}/><span>Interactive concept only — not connected to personal accounts or live AI services. Actual capabilities depend on the integrations and permissions configured for each client.</span></div>
    </div>
  </section>;
}

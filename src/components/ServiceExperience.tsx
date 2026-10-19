import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowRight,Workflow,Network,ClipboardCheck,Blocks,Globe2,CheckCircle2} from 'lucide-react';

type Service={title:string;tagline:string;problem:string;approach:string;output:string;focus:string;number:string};
const offers:Service[]=[
 {number:'01',title:'Business Process Review',tagline:'See where work slows down.',problem:'Unclear workflows, duplicated effort and manual handoffs consume time.',approach:'Observe the process, map dependencies, and prioritize practical improvements.',output:'Process map, friction points and an actionable improvement shortlist.',focus:'PROCESS DISCOVERY'},
 {number:'02',title:'Digital Project Coordination',tagline:'Bring order to moving parts.',problem:'Tasks, vendors and decisions can become fragmented across a project.',approach:'Clarify responsibilities, dependencies, milestones and stakeholder communication.',output:'Execution plan, visible task tracker and status reporting approach.',focus:'PROJECT DELIVERY'},
 {number:'03',title:'Digital Solutions Planning',tagline:'Understand the need before building.',problem:'Teams sometimes choose tools before defining their business requirements.',approach:'Turn needs into requirements, compare options and map a manageable pilot.',output:'Requirements brief, prioritized roadmap and prototype scope.',focus:'SOLUTION DESIGN'},
 {number:'04',title:'AI & Workflow Automation',tagline:'Make repeatable work easier.',problem:'Recurring follow-ups, file checks and reporting can become manual bottlenecks.',approach:'Identify suitable AI-assisted or rule-based steps, design guardrails and test an initial workflow.',output:'Automation opportunity map, proposed logic and a scoped pilot plan.',focus:'AI × OPERATIONS'},
 {number:'05',title:'Website & Booking Journeys',tagline:'Make the next action obvious.',problem:'Visitors may struggle to understand services or complete contact and booking requests.',approach:'Review the customer journey, define essential content and connect a focused contact or booking flow.',output:'Responsive concept, integration plan and clear visitor actions.',focus:'DIGITAL EXPERIENCE'}
];
const icons=[ClipboardCheck,Network,Blocks,Workflow,Globe2];

export default function ServiceExperience(){
 const [selected,setSelected]=useState(0);
 const offer=offers[selected];
 const Icon=icons[selected];
 return <>
  <section className="wrap svx-hero">
   <div className="svx-hero-copy">
    <small className="eyebrow"><i/> SERVICES / PROJECT MANAGEMENT × AI</small>
    <h1>Clarity first.<br/><em>Better execution.</em></h1>
    <p className="svx-opening">Project coordination, business process improvement and thoughtful AI-enabled automation — focused on problems worth solving, not technology for its own sake.</p>
    <div className="svx-value-row">
     <span><CheckCircle2 size={17}/> Define the problem</span>
     <span><CheckCircle2 size={17}/> Coordinate delivery</span>
     <span><CheckCircle2 size={17}/> Test useful solutions</span>
    </div>
    <Link to="/contact" className="svx-main-cta">DISCUSS A BUSINESS CHALLENGE <ArrowUpRight size={16}/></Link>
   </div>
   <div className="svx-brand-card">
    <div className="svx-brand-header"><span>AI PM LAB / TRIGOSAT CONSULTING</span><span>INDEPENDENT PRACTICE</span></div>
    <div className="svx-brand-image"><img src="/project-media/trigosat-consulting.webp" alt="Trigosat Consulting brand artwork" loading="lazy"/></div>
    <div className="svx-brand-bottom"><span>PROJECTS</span><b>×</b><span>PROCESS</span><b>×</b><span>AI TOOLS</span></div>
    <div className="svx-orbit svx-orbit-one" aria-hidden="true"/>
    <div className="svx-orbit svx-orbit-two" aria-hidden="true"/>
   </div>
  </section>
  <section className="svx-offers-section">
   <div className="wrap">
    <div className="svx-section-heading"><div><small className="eyebrow"><i/> HOW I CAN HELP</small><h2>Choose a challenge.<br/><em>Explore an approach.</em></h2></div><p>Five ways to structure work, reduce friction and move forward. Select a service to see what the engagement could look like.</p></div>
    <div className="svx-selector" aria-label="Explore services" role="group">{offers.map((item,i)=>{
     const Mark=icons[i];
     return <button type="button" key={item.title} className={i===selected?'active':''} aria-pressed={i===selected} onClick={()=>setSelected(i)}>
      <span className="svx-picker-top"><small>{item.number}</small><Mark size={21}/></span>
      <strong>{item.title}</strong><small>{item.focus}</small>
     </button>;
    })}</div>
    <div className="svx-detail" aria-live="polite" aria-atomic="true">
     <div className="svx-detail-intro">
      <div className="svx-detail-symbol"><Icon size={33}/></div>
      <small>SELECTED SERVICE / {offer.number}</small>
      <h3>{offer.title}</h3>
      <p>{offer.tagline}</p>
      <Link to="/contact" className="svx-detail-link">TALK ABOUT THIS SERVICE <ArrowUpRight size={16}/></Link>
     </div>
     <div className="svx-detail-flow">
      <div><span>01 / THE CHALLENGE</span><p>{offer.problem}</p></div>
      <div><span>02 / THE APPROACH</span><p>{offer.approach}</p></div>
      <div><span>03 / THE DELIVERABLE</span><p>{offer.output}</p></div>
     </div>
    </div>
   </div>
  </section>
  <section className="wrap svx-evidence">
   <div className="svx-evidence-head"><div><small className="eyebrow"><i/> SELECTED EXAMPLES</small><h2>Ideas translated<br/><em>into visible work.</em></h2></div><p>These examples are shown according to their real development stage. A prototype is not presented as a proven commercial outcome.</p></div>
   <div className="svx-evidence-grid">
    <Link className="svx-evidence-card" to="/projects/retail-it"><img src="/project-covers/retail-it.svg" alt="Illustrative retail network diagram"/><div><span>OPERATIONS / NEW YORK CITY</span><h3>Retail IT Coordination</h3><p>Coordinating vendors, infrastructure issues and improvements around store operations.</p><ArrowRight size={19}/></div></Link>
    <Link className="svx-evidence-card" to="/projects/privatestone"><img src="/project-covers/privatestone.svg" alt="PrivateStone concept illustration"/><div><span>PRODUCT & WORKFLOW DESIGN</span><h3>PrivateStone</h3><p>Structuring real-estate requests, responses and admin coordination in a prototype.</p><ArrowRight size={19}/></div></Link>
    <div className="svx-evidence-card"><img src="/project-media/n8n-workflow-detail.webp" alt="Real n8n workflow showing scheduled Drive cleanup steps"/><div><span>N8N / WORKFLOW EXAMPLE</span><h3>Automation in practice</h3><p>An actual visual workflow for scheduled Drive file checks and cleanup, shown as a technical example.</p><span className="svx-evidence-label">WORKFLOW SCREENSHOT</span></div></div>
   </div>
  </section>
  <section className="svx-last"><div className="wrap"><div><small className="eyebrow"><i/> START WITH THE WORKFLOW</small><h2>Have a process that<br/><em>could work better?</em></h2></div><Link to="/contact">LET'S DISCUSS IT <ArrowUpRight size={18}/></Link></div></section>
 </>;
}

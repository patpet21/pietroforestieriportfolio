import {Link} from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown,
  ClipboardCheck, Globe2, Network, Workflow, Store, Search,
  ListChecks, TrendingUp, MessageSquareText
} from 'lucide-react';
import './CommercialHome.css';

/**
 * Additive commercial content for the existing personal portfolio.
 * These modules deliberately do not change the original hero, About,
 * case studies, services, resource library, booking or site navigation.
 */
const challenges = [
  {title:'Processes that slow people down',description:'Manual handoffs, repeated tasks and information scattered across tools.'},
  {title:'Projects with too many moving parts',description:'Unclear owners, supplier follow-ups and decisions that are difficult to track.'},
  {title:'Digital tools that are not working together',description:'Systems that create extra work instead of supporting your daily operations.'},
  {title:'Retail and office support needs',description:'Practical coordination between daily business priorities and technical providers.'}
];

const serviceSummaries = [
  {number:'01',title:'Operations Improvement',description:'Review day-to-day processes, identify friction and develop practical ways of working.',icon:ClipboardCheck,theme:'operations'},
  {number:'02',title:'Project & Vendor Coordination',description:'Clarify priorities, track milestones and keep people, suppliers and deliverables aligned.',icon:Network,theme:'projects'},
  {number:'03',title:'Digital Solutions & Automation',description:'Plan or implement focused digital tools and automation around actual business needs.',icon:Workflow,theme:'digital'},
  {number:'04',title:'Business Support for Retail & Offices',description:'Coordinate everyday operational improvements and technology-related tasks.',icon:Store,theme:'retail'}
];

const steps = [
  {number:'01',title:'Understand',description:'Learn about the people, goals, constraints and everyday challenges behind the request.',icon:Search},
  {number:'02',title:'Plan & Organize',description:'Turn priorities into a realistic plan, with clear next steps and the right responsibilities.',icon:ListChecks},
  {number:'03',title:'Deliver & Improve',description:'Coordinate execution, review progress and refine what is needed to make the solution useful.',icon:TrendingUp}
];

const questions = [
  {q:'What types of businesses do you work with?',a:'My focus is on small businesses and lean teams, including retail stores, showrooms and office-based operations. We can discuss whether the project is a good fit during an introductory conversation.'},
  {q:'Do I need to have a specific project in mind?',a:'No. You can start with a recurring problem, a process that could run better or an idea you have not yet structured. The first step is to understand the situation before recommending an approach.'},
  {q:'Can you coordinate outside vendors or technical specialists?',a:'Depending on the scope, I can help organize requirements, communication, priorities and follow-ups with your existing providers. Specialist work stays with appropriately qualified professionals.'},
  {q:'Can we work remotely or on-site?',a:'Remote coordination can work well for many projects. On-site support in the New York City area can be discussed based on the activity, timing and availability.'},
  {q:'Is this consulting or hands-on implementation support?',a:'It can involve analysis, planning, practical setup and coordination, depending on what is needed. We agree on the scope and responsibilities before moving ahead.'}
];

export function CommercialIntro(){
  return <section className="tc-commercial" aria-labelledby="tc-commercial-heading">
    <div className="tc-intro">
      <div className="tc-container tc-intro-grid">
        <div className="tc-intro-copy">
          <span className="tc-eyebrow"><span className="tc-eyebrow-dot"/> TRIGOSAT CONSULTING / BUSINESS SUPPORT</span>
          <h2 id="tc-commercial-heading">Clarity for Operations,<br/>Projects, and <span>Digital Change.</span></h2>
          <p>I support small businesses with organization, project coordination and practical digital solutions that improve everyday operations. The goal is to understand what needs to work better — then help make it happen.</p>
          <div className="tc-actions">
            <Link className="tc-button tc-button-primary" to="/book"><CalendarDays size={17}/> Start a Conversation <ArrowRight size={18}/></Link>
            <Link className="tc-button tc-button-outline" to="/services">Explore Services <ArrowUpRight size={17}/></Link>
          </div>
          <span className="tc-intro-note"><CheckCircle2 size={15}/> First conversation: complimentary 30-minute consultation</span>
        </div>
        <div className="tc-visual" aria-label="Illustrative business workflow dashboard: understand, plan and coordinate">
          <div className="tc-visual-shape tc-visual-shape-one"/>
          <div className="tc-visual-shape tc-visual-shape-two"/>
          <div className="tc-visual-panel">
            <div className="tc-visual-top"><span className="tc-visual-mark"><Network size={18}/></span><span>OPERATIONS / OVERVIEW</span><i/><i/><i/></div>
            <div className="tc-visual-content">
              <div className="tc-visual-headline"><small>WORKFLOW CLARITY</small><strong>From challenge<br/>to action.</strong><span className="tc-visual-status">PRACTICAL APPROACH</span></div>
              <div className="tc-visual-flow">
                <div><span><CheckCircle2 size={17}/></span><p><strong>Understand</strong><small>Define the actual need</small></p></div>
                <div><span><ListChecks size={17}/></span><p><strong>Organize</strong><small>Agree on clear next steps</small></p></div>
                <div><span><Network size={17}/></span><p><strong>Coordinate</strong><small>Move the work forward</small></p></div>
              </div>
              <div className="tc-visual-bottom"><div className="tc-visual-bars"><b/><b/><b/><b/><b/></div><span>PEOPLE <em>×</em> PROCESS <em>×</em> TOOLS</span></div>
            </div>
          </div>
          <div className="tc-visual-floating"><Globe2 size={17}/> Built around your business</div>
        </div>
      </div>
    </div>

    <div className="tc-container tc-challenges">
      <div className="tc-challenges-title"><span className="tc-section-kicker">THE CHALLENGE</span><h3>Common Challenges<br/><span>I Help Solve</span></h3><div className="tc-heading-underline"/></div>
      <div className="tc-challenges-list">{challenges.map(item=><div className="tc-challenge" key={item.title}><CheckCircle2 size={21}/><div><strong>{item.title}</strong><p>{item.description}</p></div></div>)}</div>
    </div>

    <div className="tc-container tc-services">
      <div className="tc-section-heading"><span className="tc-section-kicker">WHAT I CAN HELP WITH</span><h3>Services</h3><p>Practical, tailored support to help your business run smoother, complete projects with confidence and make better use of digital tools.</p></div>
      <div className="tc-services-grid">{serviceSummaries.map(item=>{
        const Icon=item.icon;
        return <article className="tc-service" key={item.number}>
          <div className={'tc-service-art tc-service-art-'+item.theme} aria-hidden="true">
            <div className="tc-service-art-ring"/><Icon size={49} strokeWidth={1.2}/><span>{item.number} / TRIGOSAT</span>
          </div>
          <div className="tc-service-body"><span className="tc-service-icon"><Icon size={20}/></span><h4>{item.title}</h4><p>{item.description}</p><Link to="/services" aria-label={'Explore '+item.title+' services'}>Learn More <ArrowRight size={16}/></Link></div>
        </article>;
      })}</div>
      <p className="tc-services-note">Looking for more detail? The full interactive services page is available <Link to="/services">here <ArrowUpRight size={14}/></Link>.</p>
    </div>
  </section>;
}

export function CommercialApproach(){
  return <section className="tc-approach" aria-labelledby="tc-approach-title">
    <div className="tc-container">
      <div className="tc-section-heading"><span className="tc-section-kicker">HOW WE MOVE FORWARD</span><h2 id="tc-approach-title">My Approach</h2><p>A straightforward process that starts with the business problem, not a tool or a technology.</p></div>
      <div className="tc-approach-grid">{steps.map((step,index)=>{
        const Icon=step.icon;
        return <div className="tc-step" key={step.number}>
          <span className="tc-step-icon"><Icon size={29} strokeWidth={1.7}/></span>
          <div><small>STEP {step.number}</small><h3>{step.title}</h3><p>{step.description}</p></div>
          {index<steps.length-1&&<ArrowRight className="tc-step-arrow" size={20} aria-hidden="true"/>}
        </div>;
      })}</div>
    </div>
  </section>;
}

export function CommercialFAQ(){
  return <section className="tc-faq" aria-labelledby="tc-faq-title">
    <div className="tc-container">
      <div className="tc-section-heading"><span className="tc-section-kicker">BEFORE WE START</span><h2 id="tc-faq-title">Frequently Asked Questions</h2><p>Clear answers about the type of support available and how a project can begin.</p></div>
      <div className="tc-faq-list">{questions.map((item,index)=><details className="tc-faq-item" key={item.q} open={index===0}>
        <summary><strong>{item.q}</strong><ChevronDown size={20}/></summary>
        <p>{item.a}</p>
      </details>)}</div>
      <div className="tc-cta">
        <div className="tc-cta-text"><span>LET'S FIND A PRACTICAL NEXT STEP</span><h2>Ready to Improve<br/>Your Operations?</h2><p>Tell me what is slowing things down or what you want to improve. We can begin with a conversation.</p></div>
        <div className="tc-cta-actions">
          <Link className="tc-button tc-button-light" to="/book"><CalendarDays size={17}/> Start a Conversation <ArrowUpRight size={17}/></Link>
          <Link className="tc-cta-link" to="/contact"><MessageSquareText size={17}/> Prefer to send a message? <ArrowRight size={17}/></Link>
        </div>
      </div>
    </div>
  </section>;
}

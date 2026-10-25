import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,ArrowUpRight,CheckCircle2,Maximize2,X} from 'lucide-react';
import BrandImage from './BrandImage';
import {brandMedia} from '../data/brandMedia';
import {projectHighlights} from '../data/projectHighlights';
import type {Project} from '../data/projects';

type Step={title:string;description:string};
type CaseTheme={eyebrow:string;claim:string;steps:Step[];visualLabel:string};
const themes:Record<string,CaseTheme>={
 privatestone:{
  eyebrow:'PROFESSIONAL REAL ESTATE / PRODUCT CONCEPT',
  claim:'Private opportunities. Structured conversations.',
  visualLabel:'PLATFORM CONCEPT',
  steps:[
   {title:'Publish a request',description:'A verified professional describes an acquisition need'},
   {title:'Review proposals',description:'Relevant responses stay structured and discreet'},
   {title:'Coordinate next steps',description:'PrivateStone mediates the introduction workflow'}
  ]},
 'retail-it':{
  eyebrow:'NEW YORK CITY / OPERATIONS & TECHNOLOGY',
  claim:'Coordinate change without disrupting the store.',
  visualLabel:'ILLUSTRATIVE NETWORK DIAGRAM',
  steps:[
   {title:'Identify issues',description:'Map store technology and operational constraints'},
   {title:'Align vendors',description:'Organize priorities, dependencies and responsibilities'},
   {title:'Follow through',description:'Coordinate onsite work and document remaining items'}
  ]},
 websites:{
  eyebrow:'DIGITAL EXPERIENCES / BUSINESS SOLUTIONS',
  claim:'Clear digital journeys for local businesses.',
  visualLabel:'ILLUSTRATIVE WEBSITE CONCEPT',
  steps:[
   {title:'Understand needs',description:'Define the services, audience and booking path'},
   {title:'Shape the experience',description:'Design usable mobile-friendly screens'},
   {title:'Create a prototype',description:'Connect visitor journeys to clear next actions'}
  ]},
 'n8n-automation':{
  eyebrow:'AUTOMATION / N8N WORKFLOW EXPLORATION',
  claim:'Structure the checks before automating the handoff.',
  visualLabel:'WORKFLOW CAPTURE / EXPERIMENT',
  steps:[
   {title:'Define the trigger',description:'Set up the timing and workflow starting conditions'},
   {title:'Verify conditions',description:'Check file status and eligibility before any cleanup step'},
   {title:'Document outcomes',description:'Show every branch, exception and follow-up in the workflow map'}
  ]
 },
 'lead-rescue':{
  eyebrow:'AUTOMATION / EXPERIMENTAL PROTOTYPE',
  claim:'Make overlooked enquiries easier to spot.',
  visualLabel:'ILLUSTRATIVE WORKFLOW — NOT THE N8N SCREENSHOT',
  steps:[
   {title:'Capture signals',description:'Explore enquiry sources and response patterns'},
   {title:'Identify gaps',description:'Flag potential follow-up delays'},
   {title:'Review next actions',description:'Prototype alerts before testing with users'}
  ]},
 'e-learning':{
  eyebrow:'AI PM LAB / LEARNING & RESOURCE DESIGN',
  claim:'Useful guides. Clear learning pathways.',
  visualLabel:'ORIGINAL BRAND ASSET',
  steps:[
   {title:'Organize content',description:'Separate learning materials and course structures'},
   {title:'Design navigation',description:'Make guides and resources easier to discover'},
   {title:'Prototype delivery',description:'Test the experience without implying live usage metrics'}
  ]},
 propertydex:{
  eyebrow:'REAL ESTATE / BLOCKCHAIN RESEARCH',
  claim:'Investigate the model before the technology.',
  visualLabel:'ORIGINAL PROPERTYDEX BRAND',
  steps:[
   {title:'Research the asset',description:'Study property and ownership assumptions'},
   {title:'Explore structures',description:'Compare digital ownership and tokenization concepts'},
   {title:'Examine constraints',description:'Separate feasibility research from a live investment offer'}
  ]},
 'propertydex-framework':{
  eyebrow:'PROJECT STRUCTURING / DECISION SUPPORT',
  claim:'Turn complexity into structured execution.',
  visualLabel:'ORIGINAL PROPERTYDEX FRAMEWORK BRAND',
  steps:[
   {title:'Collect assumptions',description:'Capture inputs and documentation requirements'},
   {title:'Map dependencies',description:'Organize constraints, stakeholders and processes'},
   {title:'Evaluate options',description:'Compare alternatives before selecting next steps'}
  ]}
};

export function CompactCaseHero({project:p}:{project:Project}){
 const theme=themes[p.id];
 const highlight=projectHighlights[p.id];
 const brand=brandMedia[p.id];
 const pictures=brand.gallery.length?brand.gallery:[{src:brand.backup??'/project-covers/'+p.id+'.svg',title:'Illustrative project visual'}];
 const [mode,setMode]=useState<'visual'|'method'|'status'>('visual');
 const [mediaIndex,setMediaIndex]=useState(0);
 const [zoom,setZoom]=useState(false);
 useEffect(()=>{
  if(!zoom)return;
  const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')setZoom(false);};
  document.addEventListener('keydown',handler);
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow=old;};
 },[zoom]);
 const selected=pictures[mediaIndex];
 if(!theme||!highlight)return null;
 const label=p.id==='lead-rescue'?'CONCEPT VISUAL':theme.visualLabel;
 return <section className="wrap ccase-head" style={{'--cc-accent':p.accent} as CSSProperties}>
  <Link to="/projects" className="eyebrow ccase-back">← ALL PROJECTS</Link>
  <div className="ccase-split">
   <div className="ccase-copy">
    <div className="ccase-brand"><BrandImage project={p.id} kind="logo" alt="" /><div><small>{theme.eyebrow}</small><span>{highlight.stage}</span></div></div>
    <h1>{highlight.shortTitle}<span className="dot">.</span></h1>
    <p className="ccase-claim">{theme.claim}</p>
    <p className="ccase-intro">{highlight.what}</p>
    <div className="ccase-problem"><small>THE PROBLEM IT ADDRESSES</small><p>{highlight.solves}</p></div>
    <div className="ccase-role"><CheckCircle2 size={16}/><span><strong>MY CONTRIBUTION</strong>{p.role}</span></div>
    <div className="ccase-actions">
     {p.website&&<a href={p.website} target="_blank" rel="noopener noreferrer" className="ccase-primary">EXPLORE THE PROJECT <ArrowUpRight size={16}/></a>}
     <Link to="/contact" className={p.website?'ccase-secondary':'ccase-primary'}>DISCUSS SIMILAR WORK <ArrowUpRight size={16}/></Link>
    </div>
   </div>
   <div className="ccase-panel">
    <div className="ccase-panel-head"><div><small>PROJECT EXPLORER / {p.year}</small><h2>{highlight.shortTitle}</h2></div><span className="ccase-status-dot"><i/> {p.status}</span></div>
    <div className="ccase-tabs" role="group" aria-label={'Explore '+p.title}>
     {([['visual','Visual'],['method','Approach'],['status','Current stage']] as const).map(([id,title])=>
      <button key={id} type="button" className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{title}</button>)}
    </div>
    <div className="ccase-display" aria-live="polite">
     {mode==='visual'?<>
      <div className="ccase-image-wrap">
       <button type="button" className="ccase-zoom-target" aria-label={'Expand '+selected.title} onClick={()=>setZoom(true)}>
        <img key={selected.src} src={selected.src} alt={selected.title} loading="lazy" decoding="async" onError={e=>{if(!e.currentTarget.src.endsWith(brand.backup))e.currentTarget.src=brand.backup;}} />
        <span className="ccase-zoom-hint"><Maximize2 size={15}/> ENLARGE VISUAL</span>
       </button>
       <span className="ccase-picture-tag">{label}</span>
      </div>
      <div className="ccase-image-caption"><p>{selected.title}</p>{pictures.length>1&&<div><button type="button" onClick={()=>setMediaIndex(i=>(i+pictures.length-1)%pictures.length)} aria-label="Previous visual"><ArrowLeft size={17}/></button><span>{mediaIndex+1} / {pictures.length}</span><button type="button" onClick={()=>setMediaIndex(i=>(i+1)%pictures.length)} aria-label="Next visual"><ArrowRight size={17}/></button></div>}</div>
     </>:mode==='method'?<div className="ccase-method"><small>HOW THE WORK IS STRUCTURED</small><div className="ccase-method-steps">{theme.steps.map((step,i)=><div key={step.title}><span>{String(i+1).padStart(2,'0')}</span><strong>{step.title}</strong><p>{step.description}</p></div>)}</div></div>:
      <div className="ccase-stage"><small>PROJECT MATURITY</small><h3>{p.status}</h3><p>{p.outcome}</p><div><span>Project status is presented as documented, with no invented adoption or financial results.</span></div></div>}
    </div>
   </div>
  </div>
  {zoom&&<div className="ccase-lightbox" role="presentation" onClick={()=>setZoom(false)}>
   <div role="dialog" aria-modal="true" aria-label={'Enlarged visual: '+selected.title} className="ccase-lightbox-content" onClick={e=>e.stopPropagation()}>
    <div className="ccase-lightbox-header"><div><small>PROJECT VISUAL / {label}</small><strong>{selected.title}</strong></div><button type="button" aria-label="Close enlarged image" autoFocus onClick={()=>setZoom(false)}><X size={20}/></button></div>
    <img src={selected.src} alt={selected.title} onError={e=>{if(!e.currentTarget.src.endsWith(brand.backup))e.currentTarget.src=brand.backup;}}/>
    <p>ESC TO CLOSE · {mediaIndex+1} / {pictures.length}</p>
   </div>
  </div>}
  <div className="ccase-facts">{[['CATEGORY',p.category],['YEAR',p.year],['STATUS',p.status],['MY ROLE',p.role]].map(([title,value])=><div key={title}><small>{title}</small><strong>{value}</strong></div>)}</div>
 </section>;
}

export function CompactCasePath({project:p}:{project:Project}){
 const theme=themes[p.id];
 if(!theme)return null;
 return <section className="ccase-path"><div className="wrap">
  <div className="ccase-path-heading"><small className="eyebrow"><i/> PROJECT METHOD / {p.category.toUpperCase()}</small><h2>From problem <em>to next steps.</em></h2></div>
  <div className="ccase-path-grid">{theme.steps.map((step,i)=><div key={step.title}><span>{String(i+1).padStart(2,'0')}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
 </div></section>;
}

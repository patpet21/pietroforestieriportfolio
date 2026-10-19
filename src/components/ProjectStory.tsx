import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ChevronLeft,ChevronRight,ArrowRight,Layers3,CheckCircle2} from 'lucide-react';
import BrandImage from './BrandImage';
import type {Project} from '../data/projects';
import {projectHighlights} from '../data/projectHighlights';

type Chapter={label:string;title:string;body:string;caption:string};
function chapters(p:Project):Chapter[]{
 return [
  {label:'Challenge',title:'The problem behind the work.',body:p.challenge,caption:'01 / THE CONTEXT'},
  {label:'Approach',title:'Finding a direction.',body:p.approach,caption:'02 / THE PLAN'},
  {label:'Solution',title:'Making it tangible.',body:p.solution,caption:'03 / THE RESPONSE'},
  {label:'Current stage',title:'What is documented today.',body:p.outcome,caption:'04 / PROGRESS & STATUS'}
 ];
}
export function ProjectStory({project:p}:{project:Project}){
 const [active,setActive]=useState(0);
 const items=chapters(p),current=items[active];
 const next=(direction:number)=>setActive(i=>(i+direction+items.length)%items.length);
 return <section className="pf-story-section">
  <div className="wrap">
   <div className="pf-story-heading"><div><span className="eyebrow"><i/> THE PROJECT STORY / {p.year}</span><h2>Go beyond <em>the visuals.</em></h2></div><p>Explore the thinking, execution and current status behind this project. Select a chapter to see the details.</p></div>
   <div className="pf-story-frame" style={{'--pf-story-accent':p.accent} as React.CSSProperties}>
    <div className="pf-story-nav" role="group" aria-label={'Explore '+p.title+' chapters'}>
     {items.map((part,i)=><button type="button" key={part.label} aria-pressed={active===i} className={i===active?'selected':''} onClick={()=>setActive(i)}>
      <span>{String(i+1).padStart(2,'0')}</span><strong>{part.label}</strong><ArrowUpRight size={16}/></button>)}
    </div>
    <div className="pf-story-main">
     <div className="pf-story-meta"><span>{current.caption}</span><Layers3 size={21}/></div>
     <div className="pf-story-content" key={active} aria-live="polite" aria-atomic="true"><h3>{current.title}</h3><p>{current.body}</p></div>
     <div className="pf-story-control">
      <span>CHAPTER {String(active+1).padStart(2,'0')} / 04</span>
      <div className="pf-story-progress" aria-hidden="true"><span style={{width:(active+1)*25+'%'}}/></div>
      <div className="pf-story-buttons"><button type="button" aria-label="Previous chapter" onClick={()=>next(-1)}><ChevronLeft size={19}/></button><button type="button" aria-label="Next chapter" onClick={()=>next(1)}><ChevronRight size={19}/></button></div>
     </div>
    </div>
   </div>
   <div className="pf-story-after"><div><CheckCircle2 size={17}/><span><strong>ROLE</strong> {p.role}</span></div><div><CheckCircle2 size={17}/><span><strong>STATUS</strong> {p.status}</span></div></div>
  </div>
 </section>;
}

export function NextProjectSpotlight({current,projects}:{current:Project;projects:Project[]}){
 const index=projects.findIndex(p=>p.id===current.id);
 const next=projects[(index+1)%projects.length];
 if(!next)return null;
 const copy=projectHighlights[next.id];
 return <section className="wrap pf-next-section">
  <div className="pf-next-top"><span className="eyebrow"><i/> KEEP EXPLORING</span><Link to="/projects">ALL PROJECTS <ArrowUpRight size={14}/></Link></div>
  <Link to={'/projects/'+next.id} className="pf-next-card" style={{'--pf-next-accent':next.accent} as React.CSSProperties}>
   <div className="pf-next-image"><BrandImage project={next.id} alt={'Preview of '+next.title} loading="lazy"/><span>UP NEXT / {String((index+1)%projects.length+1).padStart(2,'0')}</span></div>
   <div className="pf-next-copy"><span>{next.category.toUpperCase()}</span><h2>{copy?.shortTitle??next.title}</h2><p>{copy?.teaser??next.summary}</p><small>DISCOVER THE CASE STUDY <ArrowRight size={15}/></small></div>
   <span className="pf-next-arrow"><ArrowUpRight size={25}/></span>
  </Link>
 </section>;
}

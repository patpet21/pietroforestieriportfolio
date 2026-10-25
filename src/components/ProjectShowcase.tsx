import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent,PointerEvent,MouseEvent} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ChevronLeft,ChevronRight} from 'lucide-react';
import {projects} from '../data/projects';
import {projectHighlights} from '../data/projectHighlights';
import BrandImage from './BrandImage';
import type {Project} from '../data/projects';

const order=['privacygate','privatestone','propertydex','propertydex-framework','websites','retail-it','n8n-automation','lead-rescue','e-learning'];
const slides:Project[]=order.map(id=>projects.find(p=>p.id===id)).filter((p):p is Project=>Boolean(p));
/**
 * The SELECTED WORK carousel is a visual project gallery (not the services grid).
 * Each artwork below comes from the supplied portfolio images already checked
 * into the repo. Positions correspond to the four panels of services-sprite.avif.
 * The legacy BrandImage remains behind artwork as a browser fallback.
 */
const featuredArtwork:Record<string,{src:string;fallback:string;label:string}>={
 'privacygate':{src:'https://i.ibb.co/rfmcfCF5/Privacy-Gate-workflow.png',fallback:'/project-media/privacygate-protect.webp',label:'PrivacyGate privacy-first AI product screens'},
 'propertydex':{src:'/portfolio-gallery/propertydex-poster.avif',fallback:'/project-media/propertydex-symbol.webp',label:'PropertyDEX real estate research'},
 'propertydex-framework':{src:'https://i.ibb.co/qLV28zzf/framework.png',fallback:'/portfolio-gallery/propertydex-framework-poster.avif',label:'PropertyDEX Framework property project analysis'},
 'e-learning':{src:'https://i.ibb.co/nqvcC4J6/workflow-pmlab.png',fallback:'/project-media/ai-pm-lab.webp',label:'AI PM Lab project-management learning resources'},
 'n8n-automation':{src:'https://i.ibb.co/rK4pdpvp/workflow-pm.png',fallback:'/project-media/n8n-workflow-detail.webp',label:'n8n workflow automation publishing and cleanup'}
};


export default function ProjectShowcase(){
 const [active,setActive]=useState(0);
 const [mobile,setMobile]=useState(false);
 const pointerStart=useRef<{x:number;y:number}|null>(null);
 const dragged=useRef(false);
 const count=slides.length;
 const focused=slides[active];
 const focusedCopy=focused?projectHighlights[focused.id]:null;
 useEffect(()=>{
  const media=window.matchMedia('(max-width:740px)');
  const update=()=>setMobile(media.matches);
  update();media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 const rotate=(step:number)=>setActive(current=>(current+step+count)%count);
 const offsetFor=(index:number)=>{const d=(index-active+count)%count;return d>Math.floor(count/2)?d-count:d;};
 const down=(e:PointerEvent<HTMLDivElement>)=>{if(e.button!==0)return;dragged.current=false;pointerStart.current={x:e.clientX,y:e.clientY};};
 const up=(e:PointerEvent<HTMLDivElement>)=>{
  if(!pointerStart.current)return;
  const dx=e.clientX-pointerStart.current.x,dy=e.clientY-pointerStart.current.y;
  pointerStart.current=null;
  if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.2)return;
  dragged.current=true;rotate(dx<0?1:-1);
 };
 const capture=(e:MouseEvent<HTMLDivElement>)=>{if(dragged.current){e.preventDefault();e.stopPropagation();dragged.current=false;}};
 const keys=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(e.key==='ArrowRight'){e.preventDefault();rotate(1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();rotate(-1);}
  else if(e.key==='Home'){e.preventDefault();setActive(0);}
  else if(e.key==='End'){e.preventDefault();setActive(count-1);}
 };
 if(!count)return null;
 return <div className="pf-stage-carousel">
  <div className="pf-stage-viewport" role="region" aria-roledescription="carousel" aria-label="Selected portfolio projects"
   tabIndex={0} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{pointerStart.current=null;}}
   onClickCapture={capture} onKeyDown={keys}>
   {slides.map((p,i)=>{
    const offset=offsetFor(i),far=Math.abs(offset)>(mobile?1:2),center=offset===0;
    const highlight=projectHighlights[p.id];
    const poster=featuredArtwork[p.id];
    const inside=<>
     <BrandImage key={p.id+'cover'} project={p.id} alt="" className="pf-stage-image" loading={center?'eager':'lazy'} decoding="async"/>
     {poster&&<img className="pf-stage-poster-media" src={poster.src} alt={poster.label} loading={center?'eager':'lazy'} decoding="async" onError={e=>{if(!e.currentTarget.src.endsWith(poster.fallback))e.currentTarget.src=poster.fallback;}}/>}
     <span className="pf-stage-gradient" aria-hidden="true"/>
     {!poster&&<span className="pf-stage-top">
      <span className="pf-stage-brand"><BrandImage key={p.id+'brand'} project={p.id} kind="logo" alt="" className="pf-stage-brand-mark" loading="lazy"/><span>{String(i+1).padStart(2,'0')} / SELECTED PROJECT</span></span>
      <span>↗</span>
     </span>}
     <span className="pf-stage-content">
      {!poster&&<small>{p.category.toUpperCase()} · {p.year}</small>}
      {!poster&&<strong>{highlight.shortTitle}</strong>}
      {!poster&&center&&<span className="pf-stage-teaser">{highlight.teaser}</span>}
      {center&&<span className="pf-stage-open">EXPLORE PROJECT <ArrowUpRight size={16}/></span>}
     </span>
    </>;
    return <div key={p.id} className={'pf-stage-slide'+(poster?' pf-stage-slide--poster':'')} data-offset={offset} aria-hidden={far}
      style={{'--slide-accent':p.accent} as CSSProperties}>
      {center?<Link className="pf-stage-card" to={'/projects/'+p.id} aria-label={'View '+p.title}>{inside}</Link>
       :<button type="button" className="pf-stage-card" onClick={()=>setActive(i)} tabIndex={far?-1:0}
         aria-label={'Select '+p.title}>{inside}</button>}
     </div>;
   })}
   <div className="pf-stage-edge-controls" aria-label="Browse projects">
    <button type="button" className="pf-stage-edge-arrow" aria-label="Previous project"
      title="Previous project" onPointerDown={e=>{dragged.current=false;e.stopPropagation();}}
      onPointerUp={e=>e.stopPropagation()} onClick={()=>rotate(-1)}>
      <ChevronLeft size={29} strokeWidth={2.8}/><span className="pf-stage-edge-text">PREV</span>
    </button>
    <button type="button" className="pf-stage-edge-arrow" aria-label="Next project"
      title="Next project" onPointerDown={e=>{dragged.current=false;e.stopPropagation();}}
      onPointerUp={e=>e.stopPropagation()} onClick={()=>rotate(1)}>
      <ChevronRight size={29} strokeWidth={2.8}/><span className="pf-stage-edge-text">NEXT</span>
    </button>
   </div>
  </div>
  <div className="pf-stage-footer">
   <div className="pf-stage-navigation"><button type="button" onClick={()=>rotate(-1)} aria-label="Previous project"><ChevronLeft size={22}/></button>
    <div className="pf-stage-progress" aria-hidden="true"><span style={{transform:'scaleX('+(active+1)/count+')'}}/></div>
    <button type="button" onClick={()=>rotate(1)} aria-label="Next project"><ChevronRight size={22}/></button></div>
   <div className="pf-stage-current" aria-live="polite"><b>{String(active+1).padStart(2,'0')} <small>/ {String(count).padStart(2,'0')}</small></b>
    <strong>{slides[active].title}</strong></div>
   <span className="pf-stage-instruction">USE THE ARROWS · DRAG OR SWIPE</span>
  </div>
  <div className="pf-stage-dots" aria-label="Choose a project">
   {slides.map((p,i)=><button type="button" key={p.id} className={i===active?'active':''} onClick={()=>setActive(i)}
    aria-label={'Show '+p.title} aria-current={i===active?'true':undefined}/>)}
  </div>
  {focused&&focusedCopy&&<div className="pf-stage-story" aria-live="polite" aria-atomic="true" key={focused.id}>
   <div className="pf-stage-story-head">
    <BrandImage key={focused.id+'story'} project={focused.id} kind="logo" alt="" className="pf-stage-story-mark"/>
    <div><small>IN FOCUS / {String(active+1).padStart(2,'0')}</small><h3>{focusedCopy.shortTitle}</h3><span>{focusedCopy.stage}</span></div>
   </div>
   <div className="pf-stage-story-detail"><span>WHAT IT IS</span><p>{focusedCopy.what}</p></div>
   <div className="pf-stage-story-detail"><span>THE PROBLEM IT ADDRESSES</span><p>{focusedCopy.solves}</p></div>
  </div>}
 </div>;
}

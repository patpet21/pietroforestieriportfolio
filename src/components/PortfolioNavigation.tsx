import {useCallback,useEffect,useRef,useState} from 'react';
import {NavLink,Link,useLocation} from 'react-router-dom';
import {
 ArrowRight,ArrowUpRight,Blocks,BriefcaseBusiness,Fingerprint,FolderKanban,
 Home,Mail,CalendarDays,Menu,PanelLeftClose,PanelLeftOpen,UserRound,Workflow,BookOpen
} from 'lucide-react';
import './PortfolioNavigation.css';

const primary=[
 {to:'/',label:'Home',Icon:Home},
 {to:'/about',label:'About',Icon:UserRound},
 {to:'/projects',label:'Selected work',Icon:FolderKanban},
 {to:'/services',label:'Services',Icon:BriefcaseBusiness},
 {to:'/resources',label:'Free resources',Icon:BookOpen},
 {to:'/gesture-lab',label:'Gesture Lab',Icon:Fingerprint},
 {to:'/contact',label:'Contact',Icon:Mail},
 {to:'/book',label:'Free consultation',Icon:CalendarDays},
];
const projects=[
 {to:'/projects/privatestone',label:'PrivateStone',Icon:Blocks},
 {to:'/projects/n8n-automation',label:'Workflow automation',Icon:Workflow},
 {to:'/projects/retail-it',label:'NYC Retail IT',Icon:BriefcaseBusiness}
];

/** Collapsed navigation rail on desktop, accessible slide-out drawer on all screens. */
export default function PortfolioNavigation(){
 const [expanded,setExpanded]=useState(false);
 const location=useLocation();
 const drawerRef=useRef<HTMLElement>(null);
 const toggleRef=useRef<HTMLButtonElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const previousFocus=useRef<HTMLElement|null>(null);
 const open=useCallback(()=>{
  previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setExpanded(true);
 },[]);
 const close=useCallback(()=>setExpanded(false),[]);
 useEffect(()=>{close();window.scrollTo({top:0,behavior:'instant'});},[location.pathname,close]);
 useEffect(()=>{
  if(!expanded)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();return;}
   if(event.key!=='Tab')return;
   const elements=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')||[])
    .filter(node=>node.getClientRects().length>0);
   if(!elements.length)return;
   const first=elements[0],last=elements[elements.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener('keydown',key);
   (previousFocus.current?.isConnected?previousFocus.current:toggleRef.current)?.focus();
  };
 },[expanded,close]);
 const isActive=(to:string)=>to==='/'?location.pathname==='/':location.pathname===to||location.pathname.startsWith(to+'/');
 return <>
  <header className="pf-shell-header" role="banner">
   <div className="pf-shell-brandline">
    <button type="button" ref={toggleRef} className="pf-shell-mobile-trigger" onClick={open} aria-expanded={expanded} aria-controls="pf-super-sidebar" aria-label="Open portfolio navigation"><Menu size={23}/></button>
    <Link className="pf-shell-brand" to="/" aria-label="Pietro Forestieri — Home">
     <img src="https://i.ibb.co/vvqkpWh8/trigosatconsulting.png" alt="" width={45} height={45} onError={e=>{e.currentTarget.style.display='none';}}/>
     <span><strong>PIETRO FORESTIERI</strong><small>PROJECTS · SYSTEMS · INNOVATION</small></span>
    </Link>
   </div>
   <span className="pf-shell-edition">INDEPENDENT DIGITAL PRACTICE <i/> NEW YORK · WORLDWIDE</span>
   <Link to="/book" className="pf-shell-contact">FREE CONSULTATION <ArrowUpRight size={17}/></Link>
  </header>

  <aside className="pf-nav-rail" aria-label="Quick navigation">
   <button type="button" onClick={open} aria-label="Expand the navigation sidebar" className="pf-rail-expand" title="Expand navigation"><PanelLeftOpen size={22}/></button>
   <div className="pf-rail-separator"/>
   <nav className="pf-rail-links" aria-label="Main navigation">
    {primary.map(({to,label,Icon})=><NavLink key={to} to={to} end={to==='/'} aria-label={label} title={label} className={({isActive})=>'pf-rail-link'+(to==='/book'?' pf-rail-book':'')+(isActive?' is-active':'')}><Icon size={21} strokeWidth={1.75}/><span className="pf-rail-tooltip">{label}</span></NavLink>)}
   </nav>
   <div className="pf-rail-bottom"><span>PF</span><small>26</small></div>
  </aside>

  {expanded&&<button type="button" className="pf-nav-backdrop" onClick={close} aria-label="Close navigation menu"/>}
  <aside id="pf-super-sidebar" ref={drawerRef} className={'pf-super-sidebar'+(expanded?' is-expanded':'')} role="dialog" aria-modal={expanded} aria-label="Portfolio navigation" aria-hidden={!expanded} inert={!expanded}>
   <div className="pf-sidebar-head">
    <div className="pf-sidebar-monogram">PF<span>.</span></div>
    <div><strong>THE WORKSPACE</strong><small>2026 · PORTFOLIO</small></div>
    <button type="button" ref={closeRef} className="pf-sidebar-close" onClick={close} aria-label="Collapse navigation" title="Collapse sidebar"><PanelLeftClose size={22}/></button>
   </div>
   <div className="pf-sidebar-scroll">
    <div className="pf-sidebar-intro"><small>THE PORTFOLIO</small><p>Ideas made tangible.<br/><em>Explore the work.</em></p></div>
    <nav aria-label="Portfolio pages" className="pf-sidebar-nav">
     <span className="pf-sidebar-section-label">01 / NAVIGATION</span>
     {primary.map(({to,label,Icon})=><NavLink key={to} to={to} end={to==='/'} className={'pf-sidebar-item'+(to==='/book'?' pf-sidebar-book-item':'')+(isActive(to)?' is-active':'')}><Icon size={19} strokeWidth={1.65}/><span>{label}</span><ArrowRight size={14} className="pf-sidebar-arrow"/></NavLink>)}
    </nav>
    <div className="pf-sidebar-projects">
     <span className="pf-sidebar-section-label">02 / FEATURED PROJECTS</span>
     {projects.map(({to,label,Icon},i)=><Link to={to} className="pf-sidebar-project" key={to}><span className="pf-sidebar-project-index">{String(i+1).padStart(2,'0')}</span><Icon size={17}/><span>{label}</span><ArrowUpRight size={14}/></Link>)}
    </div>
   </div>
   <div className="pf-sidebar-footer">
    <span>YOUR NEXT STEP / NO OBLIGATION</span>
    <Link to="/book" className="pf-sidebar-book-cta"><CalendarDays size={18}/> BOOK A FREE CONSULTATION <ArrowUpRight size={17}/></Link>
    <Link to="/contact" className="pf-sidebar-message-link">PREFER A MESSAGE? <ArrowRight size={14}/></Link>
    <small>30 MIN · ONLINE</small>
   </div>
  </aside>
 </>;
}

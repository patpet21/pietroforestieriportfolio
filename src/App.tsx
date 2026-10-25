import{useEffect,useState}from'react';
import ImmersiveCanvas from './components/ImmersiveCanvas';
import ProjectShowcase from './components/ProjectShowcase';
import HeroRealEstatePipeline from './components/HeroRealEstatePipeline';
import ScrollWBSAutomation from './components/ScrollWBSAutomation';
import PortfolioGuide from './components/PortfolioGuide';
import BrandImage from './components/BrandImage';
import {brandMedia} from './data/brandMedia';
import {CompactCaseHero,CompactCasePath} from './components/CaseExperience';
import {ProjectStory,NextProjectSpotlight} from './components/ProjectStory';
import ServiceExperience from './components/ServiceExperience';
import ServiceFolders from './components/ServiceFolders';
import PortfolioNavigation from './components/PortfolioNavigation';
import BookingCalendar from './components/BookingCalendar';
import GestureLab from './components/GestureLab';
import{Link,useLocation}from'react-router-dom';import{motion}from'motion/react';import{ArrowUpRight,ArrowRight,ArrowDown,MapPin,CheckCircle2,CalendarDays,Hand}from'lucide-react';import{projects,categories}from'./data/projects';
import{projectHighlights}from'./data/projectHighlights';import type{Project}from'./data/projects';
const appear={initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:true,amount:.14},transition:{duration:.65}};
function Foot(){return <footer><div className="wrap"><small className="eyebrow">THE NEXT STEP</small><h2>Good ideas deserve<br/><em>great execution.</em></h2><Link className="footer-arrow" to="/contact"><ArrowUpRight size={37}/></Link><div className="footer-bottom"><span>© {new Date().getFullYear()} PIETRO FORESTIERI</span><span>NEW YORK CITY · INDEPENDENT PROFESSIONAL</span><a href="https://github.com/patpet21" target="_blank" rel="noreferrer">GITHUB ↗</a></div></div></footer>}
function Heading({label,title,description}:{label:string;title:string;description?:string}){return <motion.div {...appear} className="section-head"><small className="eyebrow"><i/> {label}</small><div><h2>{title}</h2>{description&&<p>{description}</p>}</div></motion.div>}
function Artwork({p}:{p:Project}){
 return <div className="art pf-case-art" data-project={p.id} style={{'--color':p.accent} as React.CSSProperties}>
  <BrandImage key={p.id+'case'} project={p.id} alt={'Visual for '+p.title} loading="lazy"/>
  <span className="pf-case-identity"><BrandImage key={p.id+'logo'} project={p.id} kind="logo" alt="" loading="lazy"/></span>
  <div className="art-label">{p.category.toUpperCase()} <span>2026 / PF</span></div>
  <div className="art-center"><strong>{p.title.toUpperCase()}</strong><span>SELECTED WORK / CONCEPT VISUAL</span></div>
  <div className="art-foot">EXPLORE CASE STUDY <ArrowUpRight size={16}/></div>
 </div>;
}
function ProjectVisual({p}:{p:Project}){
 return <div className="pf-project-visual" data-project={p.id} style={{'--color':p.accent} as React.CSSProperties}>
  <div className="pf-project-glow"/>
  <BrandImage key={p.id+'mark'} className="pf-project-mark" project={p.id} kind="logo" alt="" loading="lazy"/>
  <div className="pf-project-image-frame"><BrandImage key={p.id+'thumbnail'} project={p.id} alt={'Project preview for '+p.title} loading="lazy" decoding="async"/></div>
  <div className="pf-project-glass"><span>CASE STUDY / {p.year}</span><strong>{p.title}</strong><span className="pf-project-visit">EXPLORE PROJECT <ArrowUpRight size={14}/></span></div>
  <div className="pf-project-corner" aria-hidden="true">↗</div>
 </div>;
}
function Card({p,i}:{p:Project;i:number}){
 const move=(event:React.PointerEvent<HTMLElement>)=>{
  if(event.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const el=event.currentTarget,rect=el.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
  el.style.setProperty('--pf-rx',((.5-y)*9).toFixed(2)+'deg');
  el.style.setProperty('--pf-ry',((x-.5)*11).toFixed(2)+'deg');
  el.style.setProperty('--pf-mx',(x*100).toFixed(1)+'%');
  el.style.setProperty('--pf-my',(y*100).toFixed(1)+'%');
 };
 const leave=(event:React.PointerEvent<HTMLElement>)=>{
  event.currentTarget.style.setProperty('--pf-rx','0deg');
  event.currentTarget.style.setProperty('--pf-ry','0deg');
 };
 return <motion.article {...appear} className="card pf-interactive-card" onPointerMove={move} onPointerLeave={leave}>
  <Link to={'/projects/'+p.id} className="pf-project-link"><ProjectVisual p={p}/></Link>
  <div className="card-meta"><span>{String(i+1).padStart(2,'0')} / {p.category}</span><span>{p.status}</span></div>
  <Link to={'/projects/'+p.id} className="card-title"><h3>{p.title}</h3><ArrowUpRight size={20}/></Link>
  <div className="pf-card-details"><small>WHAT IT IS</small><p>{projectHighlights[p.id]?.what??p.summary}</p><small>THE PROBLEM IT ADDRESSES</small><p>{projectHighlights[p.id]?.solves??p.challenge}</p></div>
 </motion.article>;
}
function Home(){return <><section className="hero pf10-home-hero"><ImmersiveCanvas/><div className="wrap hero-inner pf10-hero-grid"><div className="pf10-hero-copy"><small className="eyebrow"><i/> DIGITAL PRODUCTS · PROJECTS · SYSTEMS <span className="hero-ny">NEW YORK · WORLDWIDE</span></small><motion.h1 initial={{opacity:0,y:44}} animate={{opacity:1,y:0}} transition={{duration:.9}}>I BUILD<br/><span className="outlined">WHAT&apos;S</span><br/><span className="hero-gradient">NEXT.</span></motion.h1><div className="hero-bottom"><p>From privacy-first AI and real estate technology to automation and project delivery. Independent thinking. Tangible work.</p><div className="actions pf-hero-actions"><Link className="btn primary pf-hero-book-cta" to="/book"><CalendarDays size={18}/> BOOK YOUR FREE CONSULTATION <ArrowUpRight size={17}/></Link><Link className="btn secondary pf-hero-portfolio-cta" to="/projects">EXPLORE MY WORK <ArrowRight size={17}/></Link></div><span className="pf-hero-book-note"><CheckCircle2 size={14}/> Complimentary 30-minute intro call · No obligation</span></div><span className="scroll"><ArrowDown size={14}/> SCROLL TO EXPLORE</span></div><HeroRealEstatePipeline/></div></section><section className="section work pf-showcase-section"><div className="wrap"><Heading label="01 / SELECTED WORK" title="Explore the unusual." description="Use the arrows beside the images, drag with your mouse, or swipe on mobile."/><ProjectShowcase/><Link className="underlink" to="/projects">VIEW ALL PROJECTS <ArrowUpRight/></Link></div></section><div className="pf-marquee"><div className="pf-marquee-inner"><span>PRODUCT DESIGN</span><b>✳</b><span>PRIVACY & AI</span><b>✳</b><span>REAL ESTATE TECH</span><b>✳</b><span>PROJECT DELIVERY</span><b>✳</b><span>CREATIVE DEVELOPMENT</span></div></div><section className="gsl-home-promo"><div className="wrap gsl-home-promo-inner"><div><small className="eyebrow"><i/> SPATIAL INTERACTION / EXPERIMENTAL LAB</small><h2>Explore touchless control.<br/><em>In Gesture Lab.</em></h2><p>A hands-on experiment with camera-based gestures, spatial navigation, air typing, 3D interaction and WBS workflows. Activate Spatial Control inside the dedicated lab.</p><Link to="/gesture-lab">EXPLORE GESTURE LAB <ArrowUpRight size={18}/></Link></div><div className="gsl-home-promo-art" aria-hidden="true"><span className="gsl-home-orbit"/><span className="gsl-home-hand"><Hand size={83} strokeWidth={1.3}/></span><i className="gsl-home-star gsl-home-star-a"/><i className="gsl-home-star gsl-home-star-b"/><span className="gsl-home-tag gsl-home-tag-1">POINT / SELECT</span><span className="gsl-home-tag gsl-home-tag-2">SCROLL / EXPLORE</span></div></div></section><section className="section services"><div className="wrap"><Heading label="02 / WHAT I DO" title={'Less complexity.\nMore clarity.'} description="Practical support at the intersection of projects, processes, and technology."/><ServiceFolders/></div></section><section className="pf-founder-home-section" aria-label="Meet Pietro Forestieri"><div className="wrap pf-founder-home">
 <div className="pf-founder-portrait-frame"><img src="https://i.ibb.co/0gGPh6Z/Me-2.png" loading="lazy" alt="Pietro Forestieri at AI PM LAB in New York" onError={e=>{if(!e.currentTarget.src.endsWith('/portfolio-gallery/pietro-portrait.avif'))e.currentTarget.src='/portfolio-gallery/pietro-portrait.avif';}}/><span className="pf-founder-photo-mark">PIETRO FORESTIERI · NYC</span></div>
 <div className="pf-founder-home-copy"><small className="eyebrow"><i/> THE PERSON BEHIND THE WORK</small><h2>Precision.<br/><em>Perspective.</em><br/>Progress.</h2><p>I bring an engineering mindset to projects, operations and digital innovation — from structured coordination to practical AI-enabled solutions.</p><p className="pf-founder-note">Independent professional · New York City · M.S. Project Management candidate</p><Link className="pf-founder-link" to="/about">GET TO KNOW ME <ArrowUpRight size={18}/></Link></div>
 </div></section><ScrollWBSAutomation/><section className="section featured"><div className="wrap featured-grid"><div><small className="eyebrow"><i/> 04 / FEATURED INNOVATION</small><h2>Privacy first.<br/><em>By design.</em></h2><p>PrivacyGate explores a more considered way to work with AI: identify sensitive details, protect them locally, and remain in control of what gets shared.</p><Link className="btn primary" to="/projects/privacygate">EXPLORE PRIVACYGATE <ArrowUpRight/></Link></div><Link to="/projects/privacygate"><Artwork p={projects[0]}/></Link></div></section></>}
type Subcard={title:string;eyebrow:string;description:string;href?:string;icon:string;note?:string};
const privacyCards:Subcard[]=[
{title:'Official Website',eyebrow:'PRODUCT HOME',description:'Explore PrivacyGate, its purpose, workflow, and current product information.',href:'https://privacygate.propertydex.xyz/',icon:'PG',note:'Official site'},
{title:'Windows Desktop App',eyebrow:'MICROSOFT STORE',description:'The Windows desktop release for local-first sensitive-data protection.',href:'https://apps.microsoft.com/detail/9NMPZCVJLLZ3',icon:'⊞',note:'Published listing'},
{title:'Browser Protection',eyebrow:'MICROSOFT EDGE ADD-ONS',description:'The browser companion designed to work with the local PrivacyGate desktop environment.',href:'https://microsoftedge.microsoft.com/addons/detail/privacygate-browser-prote/lbdkbiflhmlalbcblmglmccmmajnhfbd',icon:'e',note:'Extension listing'},
{title:'Gmail Add-on',eyebrow:'GOOGLE WORKSPACE MARKETPLACE',description:'A Gmail-connected protection experience. Check its listing for current availability and compatibility.',href:'https://workspace.google.com/marketplace/app/privacygate/817932149819?flow_type=2',icon:'G',note:'Listing / status may vary'},
{title:'MCP & Local AI',eyebrow:'INTEGRATION EXPLORATIONS',description:'Read-only MCP connectivity and experiments with on-device models, with privacy controls under active refinement.',icon:'↔',note:'In testing'}
];
const learningCards:Subcard[]=[
{title:'Private Video Learning Platform',eyebrow:'E-LEARNING PROTOTYPE',description:'An independent course platform concept with private video lessons, course organization, and learner dashboards. Feature availability is not implied.',icon:'▶',note:'Prototype'},
{title:'AI PM Lab',eyebrow:'PROMPTS, PDF GUIDES & RESOURCES',description:'A separate knowledge and resource website featuring downloadable guides, prompt collections, and practical learning materials.',href:'https://aipmlab.propertydex.xyz/',icon:'AI',note:'Explore website'},
{title:'AI PM Lab Resources',eyebrow:'RESOURCE LIBRARY',description:'Browse the dedicated collection of available resources and PDF learning materials.',href:'https://aipmlab.propertydex.xyz/resources',icon:'PDF',note:'Visit resources'}
];
function BrandGlyph({icon}:{icon:string}){return <div className={'brand-glyph '+(icon==='⊞'?'windows-glyph':icon==='e'?'edge-glyph':icon==='G'?'gmail-glyph':'')} aria-hidden="true">{icon==='⊞'?<span className="window-tiles"><i/><i/><i/><i/></span>:icon==='G'?<span className="gmail-m">M</span>:icon}</div>}
function Ecosystem({title,tag,description,cards}:{title:string;tag:string;description:string;cards:Subcard[]}){return <section className="ecosystem-section"><div className="wrap"><motion.div {...appear} className="ecosystem-heading"><small className="eyebrow"><i/> {tag}</small><h2>{title}</h2><p>{description}</p></motion.div><div className="ecosystem-grid">{cards.map((card,i)=>{const content=<><div className="ecosystem-top"><BrandGlyph icon={card.icon}/>{card.href?<ArrowUpRight size={23}/>:<span className="ecosystem-progress">↗</span>}</div><small className="eyebrow">{String(i+1).padStart(2,'0')} / {card.eyebrow}</small><h3>{card.title}</h3><p>{card.description}</p><span className="ecosystem-cta">{card.href?'OPEN OFFICIAL LINK ↗':card.note?.toUpperCase()}</span><span className="ecosystem-status">{card.note}</span></>;return card.href?<motion.a {...appear} className="ecosystem-card" key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" aria-label={'Open '+card.title+' in new tab'}>{content}</motion.a>:<motion.div {...appear} className="ecosystem-card ecosystem-disabled" key={card.title}>{content}</motion.div>})}</div></div></section>}
const tokenizationCards:Subcard[]=[
{title:'PropertyDEX Website',eyebrow:'PROJECT OVERVIEW',description:'Explore the broader PropertyDEX direction and real-estate technology research.',href:'https://propertydex.xyz/',icon:'PD',note:'Project site'},
{title:'PropertyDEX Framework',eyebrow:'PROCESS & EVALUATION',description:'A separate framework resource for property-project structuring, research, and decision support.',href:'https://framework.propertydex.xyz/',icon:'FX',note:'Concept / reference'},
{title:'Tokenization Research',eyebrow:'BLOCKCHAIN & FRACTIONAL OWNERSHIP',description:'Research into digital ownership models, tokenization, and practical constraints. Not an investment product or token offering.',icon:'◈',note:'Research stage'}
];
const frameworkCards:Subcard[]=[
{title:'Explore the Framework',eyebrow:'FRAMEWORK WEBSITE',description:'Visit the dedicated online framework reference for its current structure and materials.',href:'https://framework.propertydex.xyz/',icon:'FX',note:'Online reference'},
{title:'Related Real Estate Research',eyebrow:'PROPERTYDEX',description:'See the broader research around property structuring, workflow design, and tokenization concepts.',href:'https://propertydex.xyz/',icon:'PD',note:'Related project'}
];
type Showcase={tag:string;title:string;description:string;url?:string;image?:string;style:'web'|'app'|'workflow'|'map'|'learn'};
const webShowcases:Showcase[]=[
{tag:'LIVE DEMO · RESIDENTIAL & COMMERCIAL',title:'Cleaning Crowned',description:'A service-first website concept with clear offers, geographic service coverage, and lead capture.',url:'https://cleaningcrowned.netlify.app/',style:'web'},
{tag:'BOOKING EXPERIENCE · PET CARE',title:'Astoria Holistic Pet Spa',description:'A mobile-first service showcase exploring integration with an existing online booking flow.',style:'app'},
{tag:'LOCAL BUSINESS · SALON',title:'Belli Capelli Hair Designers',description:'A concept website focused on service discovery, contact details, and appointment journeys.',style:'web'},
{tag:'PREMIUM HOSPITALITY · VILLAS',title:'SuperTuscany Luxury Villas',description:'An editorial luxury hospitality concept exploring premium visuals, browsing, and inquiry journeys.',url:'https://supertuscany.netlify.app/',style:'web'}
];
const nyShowcases:Showcase[]=[
{tag:'01 / CONNECTIVITY & COVERAGE',title:'Network & Wireless Improvements',description:'Coordinated access-point placement, connection checks, and follow-up on network configuration.',style:'workflow'},
{tag:'02 / VENDOR COLLABORATION',title:'Stakeholder & Technical Coordination',description:'Communicated across store staff and external IT providers to clarify priorities, issues, and next steps.',style:'app'},
{tag:'03 / RETAIL SYSTEMS',title:'Workstations & Retail Software',description:'Supported workstation, printer, and retail-software follow-up during infrastructure changes.',style:'workflow'}
];
const dexShowcases:Showcase[]=[
{tag:'01 / RESEARCH',title:'Blockchain & Tokenization',description:'A visual view of tokenization models, fractional ownership concepts, and real-estate workflow questions—not an investment offering.',style:'map'},
{tag:'02 / PROJECT DIRECTION',title:'PropertyDEX Digital Concept',description:'Product exploration combining property research, workflows, ownership models, and information architecture.',url:'https://propertydex.xyz/',style:'app'},
{tag:'03 / CONCEPTS & DOCUMENTATION',title:'Research & Concepts',description:'Structured exploration of operational considerations, architecture questions, and constraints before a production implementation.',style:'workflow'}
];
const frameworkShowcases:Showcase[]=[
{tag:'DISCOVER',title:'Define the opportunity',description:'Begin with the context, stakeholders, assumptions, and the business problem.',style:'workflow'},
{tag:'STRUCTURE',title:'Organize the information',description:'Map dependencies, relevant documents, decisions, and possible workflows.',style:'app'},
{tag:'EVALUATE',title:'Compare practical options',description:'Use structured criteria to assess tradeoffs and the next steps worth exploring.',style:'map'},
{tag:'ITERATE',title:'Refine the approach',description:'Improve clarity as new information emerges, rather than presenting an untested method as a validated standard.',style:'workflow'}
];
const learningShowcases:Showcase[]=[
{tag:'PRIVATE LEARNING · PROTOTYPE',title:'Video Course Platform',description:'An individual video-course environment concept for organizing lessons, modules, and access.',style:'learn'},
{tag:'RESOURCE WEBSITE · EXTERNAL',title:'AI PM Lab',description:'Practical prompts, PDF guides, and resource collections in a separate learning hub.',url:'https://aipmlab.propertydex.xyz/',style:'web'},
{tag:'DOWNLOADABLE GUIDES',title:'Prompt & PDF Library',description:'A dedicated route for learning materials and PDF resources.',url:'https://aipmlab.propertydex.xyz/resources',style:'learn'}
];
const privacyShowcases:Showcase[]=[
{tag:'DESKTOP EXPERIENCE',title:'Scan · Review · Protect · Restore',description:'An illustrative interface view of local-first privacy protection. The graphic is a concept preview, not a captured screenshot.',style:'app'},
{tag:'BROWSER WORKFLOW',title:'Protect Before Sharing',description:'The browser companion is designed around keeping sensitive details protected before sending content to AI assistants.',style:'workflow'},
{tag:'INTEGRATIONS',title:'Connected Protection',description:'Desktop, browser, Gmail, and read-only MCP integration work at different maturity levels.',style:'app'}
];
function Preview({item}:{item:Showcase}){return <div className={'preview preview-'+item.style} aria-label={'Illustrative concept preview of '+item.title}><div className="preview-chrome"><span/><span/><span/><em>CONCEPT VISUALIZATION</em></div>{item.style==='web'?<div className="preview-site"><div className="preview-navbar"><span>STUDIO / DIGITAL</span><span>HOME &nbsp; WORK &nbsp; CONTACT</span></div><div className="preview-site-body"><small>DESIGNED FOR WHAT MATTERS</small><strong>{item.title}</strong><span className="preview-cta">EXPLORE EXPERIENCE ↗</span></div></div>:item.style==='app'?<div className="preview-dashboard"><div className="preview-side"><b>pf.</b><span>OVERVIEW</span><span>PROJECTS</span><span>WORKFLOWS</span><span>SETTINGS</span></div><div className="preview-dash-main"><small>DIGITAL EXPERIENCE / CONCEPT</small><strong>{item.title}</strong><div className="preview-panes"><div><i/><i/><i/></div><div><i/><i/></div></div></div></div>:item.style==='workflow'?<div className="preview-flow"><div className="flow-pill">DISCOVER</div><div className="flow-link"/><div className="flow-pill flow-center">COORDINATE</div><div className="flow-link"/><div className="flow-pill">DELIVER</div></div>:item.style==='map'?<div className="preview-map"><div className="map-circle a"/><div className="map-circle b"/><div className="map-circle c"/><div className="map-point">◆</div><span>RESEARCH · SYSTEMS · ANALYSIS</span></div>:<div className="preview-learning"><div className="learn-screen"><span>▶</span></div><div className="learn-lessons"><strong>LEARNING LIBRARY</strong><i/><i/><i/><i/></div></div>}</div>}
function CaseShowcase({id}:{id:string}){const config:Record<string,{tag:string;title:string;description:string;items:Showcase[]}>={'privacygate':{tag:'07 / VISUAL PRODUCT EXPLORATION',title:'A closer look at the workflow.',description:'Illustrative interface compositions that explain the product concept; authentic screenshots and videos can replace these visuals later.',items:privacyShowcases},'websites':{tag:'07 / WEBSITES & EXPERIENCES',title:'Different businesses. Different needs.',description:'Explore individual website concepts. The visual previews are intentionally illustrative, not actual screenshots or proof of live client delivery.',items:webShowcases},'retail-it':{tag:'07 / NYC EXPERIENCE',title:'Coordination in a live retail environment.',description:'A visual walkthrough of the workstreams involved. The process visuals are illustrative and do not reproduce internal client systems.',items:nyShowcases},'propertydex':{tag:'07 / PROPERTYDEX EXPLORATION',title:'From asset ideas to digital systems.',description:'Three connected research directions, separated from claims of a commercially operating tokenization platform.',items:dexShowcases},'propertydex-framework':{tag:'07 / FRAMEWORK VISUALIZATION',title:'From complexity to structured execution.',description:'An illustrative process model. The live framework reference provides the authoritative current details.',items:frameworkShowcases},'e-learning':{tag:'07 / LEARNING EXPERIENCES',title:'Two ideas. Two distinct experiences.',description:'An independent private course prototype and the separate AI PM Lab resource website.',items:learningShowcases}};const value=config[id];if(!value)return null;return <section className="showcase-section"><div className="wrap"><div className="showcase-intro"><small className="eyebrow"><i/> {value.tag}</small><h2>{value.title}</h2><p>{value.description}</p></div><div className="showcase-grid">{value.items.map((item,i)=><motion.article {...appear} className="showcase-card" key={item.title}><Preview item={item}/><div className="showcase-copy"><small>{String(i+1).padStart(2,'0')} / {item.tag}</small><h3>{item.title}</h3><p>{item.description}</p>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer">EXPLORE PROJECT <ArrowUpRight size={17}/></a>}</div></motion.article>)}</div><p className="showcase-disclaimer">Visuals are conceptual illustrations created for this portfolio. They are not actual product screenshots or confidential client materials.</p></div></section>}
function ProjectExtras({id}:{id:string}){if(id==='privacygate')return <Ecosystem title="One product.\\nMultiple touchpoints." tag="07 / PRIVACYGATE ECOSYSTEM" description="Explore the published desktop app, official product website, browser extension, Gmail listing, and integration experiments. Each component has its own release stage." cards={privacyCards}/>;if(id==='propertydex')return <Ecosystem title="Exploring asset structure,\\nnot selling tokens." tag="07 / WEB3 & TOKENIZATION" description="Research-oriented exploration of potential blockchain use cases in real estate, with no claim of a live marketplace, investment offering, or regulated token issuance." cards={tokenizationCards}/>;if(id==='propertydex-framework')return <Ecosystem title="Structure before\\nsolutions." tag="07 / PROPERTYDEX FRAMEWORK" description="A complementary process and decision-support initiative, positioned separately from blockchain implementation." cards={frameworkCards}/>;if(id==='e-learning')return <Ecosystem title="Learning, tools\\n& practical resources." tag="07 / LEARNING ECOSYSTEM" description="Two distinct initiatives: a private video-course platform prototype and AI PM Lab, a resource hub for prompts, downloadable PDF guides, and applied learning." cards={learningCards}/>;return null}
function PageHead({tag,children,description}:{tag:string;children:React.ReactNode;description:string}){return <section className="wrap page-head"><small className="eyebrow">{tag}</small><h1>{children}</h1><p>{description}</p></section>}
function About(){const journey=[{year:'2015 — 2017',stage:'FIELD & INFRASTRUCTURE',title:'Engineering in the field',body:'Assistant Surveyor / Field Support with Impresa Pizzarotti in Italy and Switzerland. Supported measurements, site documentation, alignment checks, and coordination across infrastructure environments.'},{year:'2018 — 2022',stage:'TECHNICAL COORDINATION',title:'From technical detail to execution',body:'Civil Engineering Assistant / Surveying Support at Studio Tecnico Trigonometrico in Italy. Worked across field and office activities, AutoCAD drawings, technical documentation, contractor communication, and progress reporting.'},{year:'2025 — PRESENT',stage:'INDEPENDENT DIGITAL PROJECTS',title:'Exploring better digital systems',body:'Built and researched solutions spanning privacy-focused software, property workflows, process improvement, automation, and early-stage blockchain/tokenization concepts. Projects are presented according to their actual maturity.'},{year:'2026 — 2028 (EXPECTED)',stage:'PROJECT MANAGEMENT EDUCATION',title:'Strengthening the delivery mindset',body:'Currently pursuing a Master of Science in Project Management at Harrisburg University of Science and Technology, connecting hands-on technical experience with formal project planning and execution methods.'}];return <><PageHead tag="ABOUT / THE THINKING BEHIND THE WORK" description="From engineering fieldwork to practical digital solutions — an interdisciplinary approach grounded in structure, problem-solving, and continuous learning.">Engineering roots.<br/><em>A digital outlook.</em></PageHead><section className="section work"><div className="wrap about-grid"><figure className="portrait pf-about-portrait"><img src="https://i.ibb.co/0gGPh6Z/Me-2.png" alt="Pietro Forestieri standing in the AI PM LAB office" loading="eager" onError={e=>{if(!e.currentTarget.src.endsWith('/portfolio-gallery/pietro-portrait.avif'))e.currentTarget.src='/portfolio-gallery/pietro-portrait.avif';}}/><figcaption><span>PIETRO FORESTIERI</span><small>INDEPENDENT PROJECTS · NEW YORK CITY</small></figcaption></figure><div className="about-text"><small className="eyebrow">WHO I AM</small><h2>Curiosity with<br/>a practical purpose.</h2><p>I'm Pietro Forestieri, an independent professional based in New York City. My work brings together technical coordination, project thinking, business process improvement, and digital innovation.</p><p>I began in civil engineering and surveying environments, where practical work depends on precision, communication, and turning technical plans into coordinated action. Those experiences shaped the way I approach complex problems today.</p><p>Over time, my interests moved toward digital products, workflow design, automation, and AI-enabled tools. I explore ways to connect business needs with realistic, useful technology — from PrivacyGate to PropertyDEX and other prototypes.</p><p>I'm currently pursuing a Master of Science in Project Management at Harrisburg University of Science and Technology, with an expected completion in 2028. My focus is on building the skills to structure, coordinate, and improve multidisciplinary projects.</p><div className="about-facts"><div><small>LOCATION</small><strong>New York City</strong></div><div><small>CURRENT STUDIES</small><strong>M.S. Project Management · Harrisburg University · Expected 2028</strong></div><div><small>ACADEMIC BACKGROUND</small><strong>Civil & Environmental Engineering · Italy</strong></div><div><small>PROFESSIONAL FOCUS</small><strong>Projects · Processes · Digital Innovation</strong></div></div></div></div></section><section className="section timeline-section"><div className="wrap"><Heading label="THE PROFESSIONAL JOURNEY" title={'Different disciplines.\\nOne way of thinking.'} description="A chronological view of the experiences and studies that inform my approach today."/><div className="career-timeline">{journey.map((item,i)=><motion.article {...appear} className="career-step" key={item.year}><div className="career-year"><span className="career-marker"/><small>{item.year}</small></div><div className="career-description"><small className="eyebrow">{String(i+1).padStart(2,'0')} / {item.stage}</small><h3>{item.title}</h3><p>{item.body}</p></div></motion.article>)}</div></div></section><section className="section capabilities-section"><div className="wrap"><Heading label="THE WORK / SELECTED CAPABILITIES" title="Connecting strategy<br/>and delivery." description="Skills developed through technical environments, personal products, coordination work, and current studies."/><div className="capabilities-grid"><div><span>01</span><h3>Structured analysis</h3><p>Understanding requirements, organizing information, and identifying constraints before proposing a solution.</p></div><div><span>02</span><h3>Technical & operational coordination</h3><p>Documentation, planning support, stakeholder communication, and practical issue follow-up.</p></div><div><span>03</span><h3>Digital product experimentation</h3><p>Exploring prototypes, privacy-focused software, business platforms, and AI-assisted workflows with clear maturity labels.</p></div></div></div></section><section className="section quote"><div className="wrap"><small className="eyebrow">HOW I THINK</small><h2>“Technology should solve business problems, <em>not create unnecessary complexity.</em>”</h2><Link to="/contact" className="underlink">LET'S WORK TOGETHER <ArrowUpRight/></Link></div></section></>}function Projects(){const[category,setCategory]=useState('All Projects');const shown=category==='All Projects'?projects:projects.filter(p=>p.category===category);return <><PageHead tag="THE PORTFOLIO / SELECTED EXPLORATIONS" description="Published products, evolving prototypes, operational initiatives, and experiments — each clearly labeled by stage.">Work that moves<br/><em>things forward.</em></PageHead><section className="section work"><div className="wrap"><div className="filters">{categories.map(c=><button className={category===c?'active':''} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><div className="cards">{shown.length?shown.map((p,i)=><Card key={p.id} p={p} i={i}/>):<p className="muted">No documented projects in this category yet.</p>}</div></div></section></>}

/* Focused project case hero: actual product screenshots, not a huge text-over-image banner. */
function PrivacyGateCaseHero({p}:{p:Project}){
 const [preview,setPreview]=useState(0);
 const screens=[
  {name:'Protect',label:'01 / SCAN & PROTECT',src:'/project-media/privacygate-protect.webp',detail:'Preview an original document alongside its locally protected version.'},
  {name:'Restore',label:'02 / RESTORE',src:'/project-media/privacygate-restore.webp',detail:'Restore original values locally after the AI-assisted workflow.'},
  {name:'MCP & AI',label:'03 / CONNECTIONS',src:'/project-media/privacygate-mcp.webp',detail:'Explore protected-library access through compatible AI clients.'}
 ];
 const current=screens[preview];
 return <section className="wrap case-head pg-case-head">
  <Link className="eyebrow pg-back" to="/projects">← ALL PROJECTS</Link>
  <div className="pg-case-split">
   <div className="pg-case-intro">
    <div className="pg-brandline"><BrandImage project="privacygate" kind="logo" alt="PrivacyGate logo" /><span>PRIVACY-FIRST DIGITAL PRODUCT <small>DESKTOP PUBLISHED · INTEGRATIONS IN TESTING</small></span></div>
    <h1>PrivacyGate<span className="dot">.</span></h1>
    <p className="pg-case-lead">Protect sensitive data <em>before AI sees it.</em></p>
    <p className="pg-case-description">{p.summary}</p>
    <div className="pg-problem">
     <small>THE PROBLEM IT SOLVES</small>
     <p>Documents may contain personal or confidential details that should not be exposed to external AI services. PrivacyGate helps review and protect that information locally before sharing.</p>
    </div>
    <div className="pg-capabilities" aria-label="Core capabilities">
     <div><span>01</span><div><strong>Protect locally</strong><small>Scan and replace sensitive values with reversible placeholders</small></div></div>
     <div><span>02</span><div><strong>Restore safely</strong><small>Bring original values back on your own computer</small></div></div>
     <div><span>03</span><div><strong>Connect selectively</strong><small>Desktop, browser and MCP integrations at different release stages</small></div></div>
    </div>
    <div className="pg-actions">
     <a className="pg-action-primary" href="https://privacygate.propertydex.xyz/" target="_blank" rel="noopener noreferrer">EXPLORE PRIVACYGATE <ArrowUpRight size={17}/></a>
     <a className="pg-action-secondary" href="https://apps.microsoft.com/detail/9NMPZCVJLLZ3" target="_blank" rel="noopener noreferrer">WINDOWS APP <ArrowUpRight size={16}/></a>
    </div>
   </div>
   <div className="pg-preview-panel">
    <div className="pg-preview-header"><div><small>INSIDE PRIVACYGATE</small><strong>See how it works</strong></div><span className="pg-preview-status"><i/> REAL APP SCREENS</span></div>
    <div className="pg-preview-selector" role="group" aria-label="Select PrivacyGate screenshot">
     {screens.map((item,i)=><button key={item.name} type="button" aria-pressed={preview===i} className={preview===i?'active':''} onClick={()=>setPreview(i)}>{item.name}</button>)}
    </div>
    <a className="pg-preview-image" href={current.src} target="_blank" rel="noopener noreferrer" aria-label={'Open full '+current.name+' screenshot in new tab'}>
     <img key={current.src} src={current.src} alt={'PrivacyGate '+current.name+' application interface'} />
     <span>VIEW FULL SCREEN <ArrowUpRight size={14}/></span>
    </a>
    <div className="pg-preview-bottom"><small>{current.label}</small><p>{current.detail}</p></div>
   </div>
  </div>
  <div className="facts pg-case-facts">{[['CATEGORY',p.category],['YEAR',p.year],['STATUS',p.status],['MY ROLE',p.role]].map(([key,value])=><div key={key}><small>{key}</small><strong>{value}</strong></div>)}</div>
 </section>;
}
function PrivacyGateJourney(){
 const steps=[
  {id:'01',name:'Source',desc:'Choose a document or text'},
  {id:'02',name:'Scan',desc:'Detect sensitive information'},
  {id:'03',name:'Protect',desc:'Create a safe version to share'},
  {id:'04',name:'Restore',desc:'Recover originals locally'}
 ];
 return <section className="pg-journey"><div className="wrap"><div className="pg-journey-heading"><small className="eyebrow"><i/> PRIVACYGATE / THE WORKFLOW</small><h2>Four steps. <em>One safer workflow.</em></h2></div><div className="pg-journey-grid">{steps.map(step=><div key={step.id}><span>{step.id}</span><h3>{step.name}</h3><p>{step.desc}</p></div>)}</div></div></section>;
}
function RetailAutomationExploration(){return <section className="pf-retail-automation" aria-label="Related n8n workflow automation exploration"><div className="wrap">
 <div className="pf-retail-automation-heading"><small className="eyebrow"><i/> RELATED AUTOMATION EXPLORATION / N8N</small><h2>Visual workflows.<br/><em>Better operational clarity.</em></h2><p>A separate n8n publishing and Google Drive cleanup experiment, shown here as an example of the automation techniques that can complement operational coordination. This is <strong>not presented as a system deployed for the NYC retail client.</strong></p></div>
 <div className="pf-retail-automation-grid">
  <figure><a href="/project-media/n8n-workflow-detail.webp" target="_blank" rel="noopener noreferrer" aria-label="Open n8n verification and cleanup workflow image in a new tab"><img src="/project-media/n8n-workflow-detail.webp" alt="n8n workflow showing scheduling, verification and a conditional cleanup path" loading="lazy" decoding="async"/></a><figcaption><span>01 / AUTOMATION LOGIC</span><strong>Verify before cleanup</strong><p>Scheduled checks, conditions and safe-handling branches in a separate n8n experiment.</p><small>CLICK TO VIEW FULL IMAGE ↗</small></figcaption></figure>
  <figure><a href="/project-media/n8n-workflow-overview.webp" target="_blank" rel="noopener noreferrer" aria-label="Open full n8n workflow overview image in a new tab"><img src="/project-media/n8n-workflow-overview.webp" alt="Overview of multiple connected n8n publishing and cleanup workflow branches" loading="lazy" decoding="async"/></a><figcaption><span>02 / WORKFLOW MAP</span><strong>End-to-end orchestration</strong><p>Visual overview of linked nodes and decision routes, with the detailed map available at full size.</p><small>CLICK TO VIEW FULL IMAGE ↗</small></figcaption></figure>
 </div>
 </div></section>;}
function Case(){const {pathname}=useLocation();const id=pathname.split('/').filter(Boolean)[1];const p=projects.find(x=>x.id===id);if(!p)return <PageHead tag="ERROR" description="Return to the portfolio.">Project not found.</PageHead>;return <>{p.id==='privacygate'?<PrivacyGateCaseHero p={p}/>:<CompactCaseHero project={p}/>}
 {p.id==='privacygate'?<PrivacyGateJourney/>:<CompactCasePath project={p}/>}{p.id==='retail-it'&&<RetailAutomationExploration/>}
 <div className="ccase-rest">{p.id!=='privacygate'&&<CaseShowcase id={p.id}/>}<ProjectExtras id={p.id}/></div><ProjectStory project={p}/><section className="section services ccase-details"><div className="wrap"><div className="case-row"><small className="eyebrow">05 / TOOLS & TECHNOLOGIES</small><div className="tags">{p.tools.map(t=><span key={t}>{t}</span>)}</div></div>{Boolean(brandMedia[p.id]?.gallery.length||p.website||p.repository)&&<div className="case-row"><small className="eyebrow">06 / PROJECT MEDIA</small><div><h2>Project visuals & resources.</h2><p>Original brand assets and screenshots are shown only where available; prototype and research stages remain clearly identified.</p>{Boolean(brandMedia[p.id]?.gallery.length)&&<div className="pf-real-media-grid">{(brandMedia[p.id]?.gallery??[]).map(item=><div className="pf-real-media-item" key={item.src}><img src={item.src} loading="lazy" alt={item.title} onError={event=>{event.currentTarget.parentElement?.setAttribute("hidden","");}}/><span>{item.title}</span></div>)}</div>}{p.website&&<a href={p.website} target="_blank" rel="noopener noreferrer">VISIT PROJECT ↗</a>}{p.repository&&<a href={p.repository} target="_blank" rel="noopener noreferrer">VIEW REPOSITORY ↗</a>}</div></div>}</div></section><NextProjectSpotlight current={p} projects={projects}/></>}
function Services(){return <ServiceExperience/>}
function Contact(){
 const[status,setStatus]=useState<'idle'|'loading'|'success'|'error'>('idle');
 const[message,setMessage]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(status==='loading')return;
  const form=event.currentTarget;
  setStatus('loading');setMessage('');
  const formData=new FormData(form);
  try{
   const response=await fetch('https://formspree.io/f/mojboraw',{
    method:'POST',body:formData,headers:{'Accept':'application/json'}
   });
   let result:{errors?:{message?:string}[]}|null=null;
   try{result=await response.json()}catch{/* Response may not contain JSON. */}
   if(!response.ok){
    setMessage(result?.errors?.map(e=>e.message).filter(Boolean).join(' · ')||'The message could not be sent. Please try again.');
    setStatus('error');return;
   }
   form.reset();
   setStatus('success');setMessage('Thank you. Your message has been sent successfully.');
  }catch{
   setStatus('error');setMessage('Connection error. Please check your connection and try again.');
  }
 }
 return <><PageHead tag="CONTACT / START A CONVERSATION" description="Have a business challenge, project idea, or an opportunity to collaborate? Tell me what you have in mind.">Let's build something<br/><em>meaningful.</em></PageHead>
  <section className="section services"><div className="wrap contact-grid">
   <div><h2>Start with<br/>a conversation<span className="dot">.</span></h2>
    <p>Even a short description of your challenge is enough to get started.</p>
    <p className="contact-place"><MapPin size={19}/> New York City, NY</p>
    <a href="https://github.com/patpet21" target="_blank" rel="noreferrer">GITHUB ↗</a>
    <Link className="pf-contact-book-link" to="/book">OR SCHEDULE AN INTRO CALL <ArrowUpRight size={16}/></Link>
   </div>
   <form action="https://formspree.io/f/mojboraw" method="POST" onSubmit={submit} aria-label="Send Pietro a message">
    <input type="hidden" name="_subject" value="Portfolio inquiry — Pietro Forestieri"/>
    <div className="two"><label>YOUR NAME<input name="name" placeholder="Your name" autoComplete="name" required/></label><label>EMAIL ADDRESS<input type="email" name="email" placeholder="you@company.com" autoComplete="email" required/></label></div>
    <div className="two"><label>COMPANY<input name="company" placeholder="Optional" autoComplete="organization"/></label>
    <label>PROJECT TYPE<select name="project-type" required defaultValue=""><option value="" disabled>Select a topic</option><option>Project coordination</option><option>Process improvement</option><option>Digital solution</option><option>Website / Booking</option><option>Other collaboration</option></select></label></div>
    <label>YOUR MESSAGE<textarea name="message" rows={6} minLength={10} required placeholder="Tell me about your challenge..."/></label>
    <button className="btn primary" disabled={status==='loading'} type="submit">{status==='loading'?'SENDING...':'SEND YOUR MESSAGE'} <ArrowUpRight/></button>
    <p aria-live="polite" className={'form-note pf-form-message'+(status==='error'?' is-error':'')}>{status==='success'?<CheckCircle2 size={16}/>:null}{message||'Your details are used only to respond to your inquiry.'}</p>
   </form>
  </div></section></>;
}
export default function App(){const loc=useLocation();return <><PortfolioNavigation/><main key={loc.pathname}>{loc.pathname==='/'?<Home/>:loc.pathname==='/about'?<About/>:loc.pathname==='/projects'?<Projects/>:loc.pathname.startsWith('/projects/')?<Case/>:loc.pathname==='/services'?<Services/>:loc.pathname==='/gesture-lab'?<GestureLab/>:loc.pathname==='/contact'?<Contact/>:loc.pathname==='/book'?<BookingCalendar/>:<PageHead tag="404" description="Try the homepage.">Page not found.</PageHead>}</main><PortfolioGuide/><Foot/></>}
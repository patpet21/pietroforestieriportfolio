import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,BookOpen,Check,Download,ExternalLink,FileArchive,FileText,Filter,Search,ShieldCheck,X} from 'lucide-react';
import {libraryResources, type LibraryFile} from '../data/resources';
import './ResourcesLibrary.css';

type Preview = {title:string;file:LibraryFile};
const categories = ['All resources', ...Array.from(new Set(libraryResources.map(resource=>resource.category)))];
const totalFiles = libraryResources.reduce((sum,item)=>sum+item.files.length,0);

export default function ResourcesLibrary(){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('All resources');
 const [preview,setPreview]=useState<Preview|null>(null);
 const visible=useMemo(()=>libraryResources.filter(resource=>
  (category==='All resources'||resource.category===category)&&
  (resource.title+' '+resource.description+' '+resource.category+' '+resource.type).toLowerCase().includes(search.trim().toLowerCase())
 ),[category,search]);
 useEffect(()=>{
  if(!preview)return;
  const listener=(event:KeyboardEvent)=>{if(event.key==='Escape')setPreview(null);};
  document.addEventListener('keydown',listener);
  const original=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',listener);document.body.style.overflow=original;};
 },[preview]);
 return <div className="pf-library-page">
  <section className="pf-library-hero" aria-labelledby="pf-library-heading">
   <div className="wrap pf-library-hero-grid">
    <div>
     <div className="pf-library-kicker"><span className="pf-library-kicker-rule"/> PIETRO FORESTIERI / OPEN KNOWLEDGE</div>
     <h1 id="pf-library-heading">Resources to help<br/><em>ideas become action.</em></h1>
     <p>Practical AI guides, project coordination tools, communication templates, and workflows you can use today. Everything available here is free — no account or email required.</p>
     <div className="pf-library-hero-actions"><a className="pf-library-hero-button" href="#resource-collection">EXPLORE THE LIBRARY <ArrowRight size={17}/></a><Link className="pf-library-hero-secondary" to="/services">EXPLORE MY SERVICES <ArrowUpRight size={17}/></Link></div>
    </div>
    <div className="pf-library-hero-aside" aria-label="Library overview">
     <span className="pf-library-aside-top">THE OPEN LIBRARY / 2026</span>
     <div className="pf-library-aside-symbol"><BookOpen size={57} strokeWidth={1.15}/><span>PF.</span></div>
     <div className="pf-library-aside-grid">
      <div><strong>{libraryResources.length.toString().padStart(2,'0')}</strong><span>AVAILABLE RESOURCES</span></div>
      <div><strong>{totalFiles.toString().padStart(2,'0')}</strong><span>DOWNLOADABLE FILES</span></div>
     </div>
     <p><ShieldCheck size={15}/> Open access. Real working material. No sign-up.</p>
    </div>
   </div>
  </section>
  <section className="pf-library-content wrap" id="resource-collection">
   <div className="pf-library-heading-row"><div><span className="pf-library-label">01 / PRACTICAL MATERIAL</span><h2>Explore the collection<span>.</span></h2><p>Search by topic or browse a category. Choose English or Italian when both documents are available.</p></div><span className="pf-library-total">{visible.length} OF {libraryResources.length} RESOURCES</span></div>
   <div className="pf-library-controls">
    <label className="pf-library-search"><Search size={20}/><span className="pf-library-visually-hidden">Search resources</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search guides, prompts, workflows..." /></label>
    <div className="pf-library-filter-label"><Filter size={15}/> CATEGORIES</div>
    <div className="pf-library-filters" role="group" aria-label="Resource categories">{categories.map(item=><button key={item} type="button" className={category===item?'pf-library-filter is-selected':'pf-library-filter'} onClick={()=>setCategory(item)} aria-pressed={category===item}>{item}</button>)}</div>
   </div>
   {visible.length?<div className="pf-library-grid">{visible.map((resource,i)=><article className="pf-library-card" key={resource.slug}>
    <div className="pf-library-card-top"><span className="pf-library-card-num">{String(i+1).padStart(2,'0')}</span><span className="pf-library-free"><Check size={12}/> FREE</span></div>
    <div className="pf-library-card-icon">{resource.files.some(file=>file.format==='RAR')?<FileArchive size={26} strokeWidth={1.3}/>:<FileText size={26} strokeWidth={1.3}/>}</div>
    <div className="pf-library-card-meta"><span>{resource.category}</span><b>·</b><span>{resource.type}</span></div>
    <h3>{resource.title}</h3><p className="pf-library-card-description">{resource.description}</p>
    <div className="pf-library-card-bottom"><div className="pf-library-file-label">AVAILABLE DOWNLOADS</div>
     {resource.files.map(file=><div className="pf-library-file-row" key={file.filename}>
      <span className="pf-library-file-language">{file.language==='Italiano'?'IT':file.language==='English'?'EN':'FILES'} <b>{file.language}</b> <small>{file.format}</small></span>
      <span className="pf-library-file-actions">{file.previewUrl&&<button type="button" onClick={()=>setPreview({title:resource.title,file})} aria-label={'Preview '+resource.title+' in '+file.language}>PREVIEW <ExternalLink size={13}/></button>}
       <a href={file.downloadUrl} target="_blank" rel="noreferrer" download={file.filename} aria-label={'Download '+resource.title+' in '+file.language}>DOWNLOAD <Download size={14}/></a></span>
     </div>)}
    </div>
   </article>)}</div>:<div className="pf-library-empty"><Search size={27}/><h3>No matching resources</h3><p>Try a different search or category.</p><button type="button" onClick={()=>{setCategory('All resources');setSearch('');}}>SHOW ALL RESOURCES <ArrowRight size={15}/></button></div>}
   <div className="pf-library-note"><BookOpen size={20}/><p>Free to explore and download. Some larger documents are delivered directly from the original AI PM LAB GitHub archive. These materials are for practical learning, not tailored professional advice.</p></div>
  </section>
  <section className="pf-library-cta"><div className="wrap pf-library-cta-inner"><div><span>02 / FROM THEORY TO EXECUTION</span><h2>Need help applying these ideas<br/><em>to your business?</em></h2><p>I help teams improve project coordination, everyday operations and practical AI-supported workflows.</p></div><Link to="/book">BOOK A FREE CONSULTATION <ArrowUpRight size={19}/></Link></div></section>
  {preview&&<div className="pf-library-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}>
   <div role="dialog" aria-modal="true" aria-label={'Preview '+preview.title} className="pf-library-modal">
    <div className="pf-library-modal-header"><div><span>DOCUMENT PREVIEW / {preview.file.language.toUpperCase()}</span><strong>{preview.title}</strong></div><button onClick={()=>setPreview(null)} aria-label="Close PDF preview" type="button"><X size={23}/></button></div>
    <iframe src={preview.file.previewUrl||preview.file.downloadUrl} title={preview.title+' PDF Preview'} loading="lazy"/>
    <div className="pf-library-modal-footer"><span>If the PDF viewer is unavailable, open or download the original file.</span><a href={preview.file.downloadUrl} target="_blank" rel="noreferrer">OPEN / DOWNLOAD PDF <Download size={15}/></a></div>
   </div>
  </div>}
 </div>;
}

import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Link,useNavigate} from 'react-router-dom';
import GlassFolder from './GlassFolder';
import type {FolderFile} from './GlassFolder';
import './ServiceFolders.css';

const AI='https://i.ibb.co/nqvcC4J6/workflow-pmlab.png';
const N8N='https://i.ibb.co/rK4pdpvp/workflow-pm.png';
const FRAMEWORK='https://i.ibb.co/qLV28zzf/framework.png';

const cards:{
 id:string;number:string;category:string;title:string;description:string;folder:string;
 image:string;href:string;meta:string;files:FolderFile[];
}[]=[
 {id:'delivery',number:'01',category:'PROJECT & OPERATIONS',title:'Project coordination',description:'Plan the work. Connect owners, dependencies and milestones.',folder:'Project Delivery',image:AI,href:'/services',meta:'PLANNING · PM',
 files:[{name:'AI PM Lab',meta:'Learning & tools',image:AI,href:'/projects/e-learning'},{name:'Project delivery',meta:'Planning · WBS',href:'/services'},{name:'Discuss a project',meta:'Start here',href:'/contact'}]},
 {id:'automation',number:'02',category:'PROCESS & AUTOMATION',title:'Workflow automation',description:'Design useful automations for repetitive business processes.',folder:'Automations',image:N8N,href:'/projects/n8n-automation',meta:'N8N · WORKFLOWS',
 files:[{name:'n8n workflow',meta:'Publishing & cleanup',image:N8N,href:'/projects/n8n-automation'},{name:'Process map',meta:'Original workflow',image:'/project-media/n8n-workflow-overview.webp',href:'/projects/n8n-automation'}]},
 {id:'privacy',number:'03',category:'PRIVACY-FIRST SOFTWARE',title:'Thoughtful AI solutions',description:'Build privacy-aware tools that make AI safer to use.',folder:'Privacy & AI',image:'https://i.ibb.co/rfmcfCF5/Privacy-Gate-workflow.png',href:'/projects/privacygate',meta:'PRODUCT · SYSTEMS',
 files:[{name:'PrivacyGate',meta:'Privacy-first AI',image:'https://i.ibb.co/rfmcfCF5/Privacy-Gate-workflow.png',href:'/projects/privacygate'},{name:'Product journey',meta:'Protect · Restore',href:'/projects/privacygate'}]},
 {id:'realestate',number:'04',category:'PROPTECH RESEARCH',title:'Real estate innovation',description:'Explore practical digital frameworks for property and off-market work.',folder:'Real Estate Tech',image:FRAMEWORK,href:'/projects/propertydex-framework',meta:'PROPTECH · RESEARCH',
 files:[{name:'PropertyDEX',meta:'Framework',image:FRAMEWORK,href:'/projects/propertydex-framework'},{name:'PrivateStone',meta:'Off-market network',image:'/project-covers/privatestone.svg',href:'/projects/privatestone'}]}
];

export default function ServiceFolders(){
 const gridRef=useRef<HTMLDivElement>(null);
 const [available,setAvailable]=useState(()=>typeof window==='undefined'?1160:Math.max(280,window.innerWidth-44));
 const [openId,setOpenId]=useState<string|null>(null);
 const navigate=useNavigate();
 useEffect(()=>{
  const node=gridRef.current;if(!node)return;
  const observer=new ResizeObserver(entries=>setAvailable(entries[0]?.contentRect.width||node.clientWidth));
  observer.observe(node);
  return()=>observer.disconnect();
 },[]);
 const cols=available>=1050?4:available>=590?2:1;
 const gap=cols===4?17:cols===2?22:14;
 const dimension=Math.min(cols===1?368:340,Math.max(220,Math.floor((available-gap*(cols-1))/cols)));
 return <div className="pf-glass-service-grid" ref={gridRef} aria-label="Interactive service folders">
  {cards.map((item,i)=><article key={item.id} className={'pf-glass-service-card'+(openId===item.id?' is-open':'')}>
    <div className="pf-glass-service-folder">
     <GlassFolder width={dimension} tone="dark" label={item.folder} meta={item.meta}
      image={item.image} files={item.files} action="more" appearDelay={i*110}
      open={openId===item.id} onOpenChange={state=>setOpenId(state?item.id:null)}
      menu={[{label:'Explore project',onSelect:()=>navigate(item.href)}]}
      />
    </div>
    <div className="pf-glass-service-details">
     <small>{item.number} / {item.category}</small>
     <Link to={item.href} className="pf-glass-service-title"><h3>{item.title}</h3><ArrowUpRight size={19}/></Link>
     <p>{item.description}</p>
     <span className="pf-glass-service-hint">{openId===item.id?'CHOOSE A FILE TO EXPLORE':'TAP THE FOLDER TO OPEN'}</span>
    </div>
   </article>)}
 </div>;
}

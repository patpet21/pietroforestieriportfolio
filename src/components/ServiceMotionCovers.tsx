import {useEffect,useRef,useState} from 'react';
import './ServiceMotionCovers.css';

/**
 * These illustrations are original, animated DOM/SVG surfaces, not screenshots or
 * simulated live integrations. They remain decorative inside the existing
 * accessible GlassFolder open/close controls.
 */
export type MotionCoverKind='n8n'|'ai-pm';

function useOnScreen(){
 const ref=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const node=ref.current;
  if(!node)return;
  if(!('IntersectionObserver' in window)){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{
   setVisible(entries.some(entry=>entry.isIntersecting));
  },{rootMargin:'80px',threshold:0.05});
  observer.observe(node);
  return()=>observer.disconnect();
 },[]);
 return {ref,visible};
}

function FlowNode({x,y,w,label,sublabel,tone,icon}:{
 x:number;y:number;w:number;label:string;sublabel:string;tone:'pink'|'violet'|'teal'|'orange';icon:string;
}){
 return <g className={'sfm-node sfm-node-'+tone} transform={`translate(${x} ${y})`}>
  <rect className="sfm-node-box" width={w} height="47" rx="8"/>
  <rect className="sfm-node-accent" x="0" y="0" width={w} height="3" rx="1.5"/>
  <rect className="sfm-node-iconbox" x="8" y="8" width="22" height="22" rx="5"/>
  <text className="sfm-node-icon" x="19" y="23" textAnchor="middle">{icon}</text>
  <text className="sfm-node-title" x="35" y="20">{label}</text>
  <text className="sfm-node-small" x="8" y="39">{sublabel}</text>
  <circle className="sfm-port" cx="0" cy="24" r="3.2"/>
  <circle className="sfm-port" cx={w} cy="24" r="3.2"/>
 </g>;
}
function N8nScene(){
 return <div className="sfm-n8n-stage">
  <div className="sfm-chrome"><span className="sfm-breadcrumb"><i/> Personal / My workflow</span><span className="sfm-editor-status">● EDITOR</span></div>
  <svg className="sfm-flow-svg" viewBox="0 0 340 170" role="presentation" aria-hidden="true">
   <defs>
    <linearGradient id="sfm-n8n-wire" x1="0" x2="1"><stop stopColor="#ff698f"/><stop offset=".55" stopColor="#e5b6b0"/><stop offset="1" stopColor="#76d7c6"/></linearGradient>
   </defs>
   <g className="sfm-brand" transform="translate(88 7)">
    <path d="M5 19H32L45 8H67M32 19l13 13h22" fill="none" stroke="#ff6689" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="5" cy="19" r="6.5" fill="#ff698b"/><circle cx="32" cy="19" r="6.5" fill="#ff698b"/>
    <circle cx="67" cy="8" r="7" fill="#ff698b"/><circle cx="67" cy="32" r="7" fill="#ff698b"/>
    <text x="82" y="31" fill="#fff4f3" fontSize="38" fontWeight="800" letterSpacing="-2">n8n</text>
    <g transform="translate(183 7)"><circle cx="10" cy="7" r="7" fill="#7cca40"/><circle cx="25" cy="5" r="7" fill="#7cca40"/><circle cx="11" cy="21" r="8" fill="#fa4772"/><circle cx="27" cy="22" r="8" fill="#e93465"/><circle cx="18" cy="35" r="8" fill="#d62859"/></g>
   </g>
   <g className="sfm-flow-wiring" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path className="sfm-wire-back" d="M74 93 C89 93 89 93 99 93H159 C175 93 179 93 188 93H226 C242 93 248 75 263 75H280 M226 93 C245 93 247 130 263 130H280"/>
    <path className="sfm-wire-lit" d="M74 93 C89 93 89 93 99 93H159 C175 93 179 93 188 93H226 C242 93 248 75 263 75H280 M226 93 C245 93 247 130 263 130H280"/>
    <path className="sfm-wire-tools" d="M133 111V136H106 M133 136H161"/>
   </g>
   <g className="sfm-sparks"><circle className="sfm-spark sfm-spark-a" r="3.5"/><circle className="sfm-spark sfm-spark-b" r="3.5"/><circle className="sfm-spark sfm-spark-c" r="3.5"/></g>
   <FlowNode x={10} y={70} w={64} label="Form" sublabel="Create user" icon="↳" tone="teal"/>
   <FlowNode x={99} y={70} w={60} label="AI Agent" sublabel="Tools agent" icon="✳" tone="violet"/>
   <FlowNode x={188} y={70} w={38} label="IF" sublabel="Route" icon="⇄" tone="orange"/>
   <g className="sfm-outputs">
    <rect x="280" y="58" width="52" height="35" rx="7" fill="#24313a" stroke="#8ae4d2"/><text x="306" y="74" fontSize="10" textAnchor="middle" fill="#a9f7da">Slack</text><text x="306" y="86" fontSize="6.5" textAnchor="middle" fill="#b8c7d5">Invite</text>
    <rect x="280" y="112" width="52" height="35" rx="7" fill="#24313a" stroke="#8ae4d2"/><text x="306" y="128" fontSize="10" textAnchor="middle" fill="#a9f7da">Slack</text><text x="306" y="140" fontSize="6.5" textAnchor="middle" fill="#b8c7d5">Update</text>
   </g>
   <g className="sfm-tools"><circle cx="106" cy="141" r="11"/><text x="106" y="144" textAnchor="middle">AI</text><circle cx="161" cy="141" r="11"/><text x="161" y="144" textAnchor="middle">DB</text></g>
  </svg>
  <div className="sfm-flow-footer"><span><i/> AUTOMATION WORKFLOW</span><span>TRIGGER → LOGIC → ACTION</span></div>
 </div>;
}
const ganttBars=[{w:'64%',d:'1s'},{w:'45%',d:'2.1s'},{w:'78%',d:'2.8s'},{w:'53%',d:'3.4s'}];
const kanbanColumns=[
 {name:'TO DO',cards:['Scope','Specs'],tone:'violet'},
 {name:'DOING',cards:['Design','Review'],tone:'pink'},
 {name:'DONE',cards:['Launch','QA'],tone:'teal'}
] as const;
const heatLevels=[1,2,3,2,1,3,4,2,2,4,3,1,3,2,4,2,1,3,2,4];
function ProjectScene(){
 return <div className="sfm-project-stage">
  <div className="sfm-starfield"/>
  <div className="sfm-3d-scene">
   <div className="sfm-project-panel sfm-project-gantt">
    <div className="sfm-project-heading">GANTT <span>Q4 / PLAN</span></div>
    <div className="sfm-gantt-rows">{ganttBars.map((item,i)=><div className="sfm-gantt-row" key={i}>
     <span className="sfm-gantt-mark"/>
     <div className="sfm-gantt-track"><i style={{width:item.w,animationDelay:item.d}}/></div>
    </div>)}</div>
    <div className="sfm-panel-bottom">MILESTONES <b>● ● ●</b></div>
   </div>
   <div className="sfm-project-panel sfm-project-kanban">
    <div className="sfm-project-heading">KANBAN BOARD <span>LIVE DEMO</span></div>
    <div className="sfm-kanban-cols">{kanbanColumns.map(column=><div className={'sfm-kanban-col sfm-kanban-'+column.tone} key={column.name}>
     <div className="sfm-kanban-col-label">{column.name}</div>
     {column.cards.map((label,i)=><div className={'sfm-task sfm-task-'+i} key={label}><i/><span>{label}</span></div>)}
    </div>)}</div>
   </div>
   <div className="sfm-project-panel sfm-project-heat">
    <div className="sfm-project-heading">WORKLOAD <span>TEAM</span></div>
    <div className="sfm-heat-grid">{heatLevels.map((level,i)=><i key={i} className={'sfm-heat-l'+level} style={{animationDelay:(i*.19)+'s'}}/>)}</div>
    <div className="sfm-panel-bottom">CAPACITY <b>82%</b></div>
   </div>
  </div>
  <div className="sfm-project-floor"/>
  <div className="sfm-project-stats"><span>PROJECTS <b>08</b></span><span>ON TIME <b>87%</b></span><span>HEALTH <b>92%</b></span></div>
 </div>;
}
export default function ServiceMotionCover({kind}:{kind:MotionCoverKind}){
 const {ref,visible}=useOnScreen();
 return <div ref={ref} className={'sfm-cover sfm-'+kind} data-in-view={visible?'true':'false'} aria-hidden="true">
  {kind==='n8n'?<N8nScene/>:<ProjectScene/>}
 </div>;
}

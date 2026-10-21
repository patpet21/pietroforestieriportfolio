import type {AirPoint} from '../AirTypingEngine.ts';

export type HandSide='L'|'R';
export type FingerName='THUMB'|'INDEX'|'MIDDLE'|'RING'|'PINKY';
export type HomeLocator=(key:string)=>{x:number;y:number}|null;

export const FINGER_HOMES:Record<string,string>={
 'L-THUMB':'SPACE','L-INDEX':'F','L-MIDDLE':'D','L-RING':'S','L-PINKY':'A',
 'R-THUMB':'SPACE','R-INDEX':'J','R-MIDDLE':'K','R-RING':'L','R-PINKY':';'
};
const TIPS:{name:FingerName;tip:number}[]=[
 {name:'THUMB',tip:4},{name:'INDEX',tip:8},{name:'MIDDLE',tip:12},
 {name:'RING',tip:16},{name:'PINKY',tip:20}
];
type FingerHome={relativeX:number;relativeY:number;homeX:number;homeY:number};
type HandHome={wrist:{x:number;y:number};width:number;fingers:Record<string,FingerHome>};
type Candidate={since:number;lastAt:number;wrist:{x:number;y:number};tips:{x:number;y:number}[];samples:number};

const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

/**
 * Short, hands-free posture alignment. Fingers start at their QWERTY home
 * positions. Movement is measured relative to the palm, so camera jitter and
 * a small shared wrist drift no longer jump between neighboring characters.
 *
 * Alignment does not press keys and does not request a second camera.
 * A moving hand restarts the candidate; one steady hand can calibrate alone.
 */
export class HandKeyMapper{
 private aligned=new Map<HandSide,HandHome>();
 private candidates=new Map<HandSide,Candidate>();
 reset(){this.aligned.clear();this.candidates.clear();}
 clear(side:HandSide){this.aligned.delete(side);this.candidates.delete(side);}
 count(){return this.aligned.size;}
 ready(side:HandSide){return this.aligned.has(side);}
 update(side:HandSide,points:AirPoint[],now:number,homeAt:HomeLocator):boolean{
  if(this.ready(side))return true;
  if(points.length!==21||!Number.isFinite(now))return false;
  const wrist=points[0],tips=TIPS.map(f=>points[f.tip]);
  if(![wrist,...tips].every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))return false;
  const prev=this.candidates.get(side);
  const stable=prev&&now>prev.lastAt&&now-prev.lastAt<=320&&
   dist(wrist,prev.wrist)<.013&&tips.every((p,i)=>dist(p,prev.tips[i])<.018);
  const next:Candidate={since:stable?prev.since:now,lastAt:now,wrist:{x:wrist.x,y:wrist.y},
   tips:tips.map(p=>({x:p.x,y:p.y})),samples:stable?prev.samples+1:1};
  this.candidates.set(side,next);
  if(next.samples<5||now-next.since<360)return false;
  const width=dist(points[5],points[17]);
  if(width<.065)return false;
  const fingers:Record<string,FingerHome>={};
  for(const finger of TIPS){
   const home=homeAt(FINGER_HOMES[side+'-'+finger.name]);
   if(!home||![home.x,home.y].every(Number.isFinite))return false;
   const tip=points[finger.tip];
   fingers[finger.name]={relativeX:wrist.x-tip.x,relativeY:tip.y-wrist.y,
    homeX:home.x,homeY:home.y};
  }
  this.aligned.set(side,{wrist:{x:wrist.x,y:wrist.y},width,fingers});
  this.candidates.delete(side);
  return true;
 }
 project(side:HandSide,name:FingerName,points:AirPoint[],reach:number):{x:number;y:number}|null{
  const home=this.aligned.get(side)?.fingers[name];
  const calibration=this.aligned.get(side);
  if(!home||!calibration||points.length!==21)return null;
  const tip=points[TIPS.find(f=>f.name===name)!.tip],wrist=points[0];
  const width=calibration.width;
  // Relative fingertip travel does most of the work. A smaller common hand
  // translation still allows reaching distant keys without amplifying jitter.
  const dx=((wrist.x-tip.x)-home.relativeX)/width;
  const dy=((tip.y-wrist.y)-home.relativeY)/width;
  const wristX=(calibration.wrist.x-wrist.x)/width;
  const wristY=(wrist.y-calibration.wrist.y)/width;
  return {
   x:clamp(home.homeX+reach*(dx*.37+wristX*.15)),
   y:clamp(home.homeY+reach*(dy*.48+wristY*.14))
  };
 }
}

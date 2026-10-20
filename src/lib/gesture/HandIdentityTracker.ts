import type {AirHand} from '../AirTypingEngine.ts';

export type HandSide='L'|'R';
type Position={x:number;y:number};
type Track={wrist:Position;velocity:Position;at:number};
export type IdentifiedHand={side:HandSide;hand:AirHand;reset:boolean};
const SIDES:HandSide[]=['L','R'];
const MAX_JUMP=.28;
const IDENTITY_MEMORY_MS=700;
const MIN_HANDEDNESS_SCORE=.75;
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y);
const label=(hand:AirHand):HandSide|null=>{
 const value=hand.handedness;
 if(!value||!Number.isFinite(value.score)||value.score<MIN_HANDEDNESS_SCORE)return null;
 return value.categoryName.toLowerCase()==='left'?'L':value.categoryName.toLowerCase()==='right'?'R':null;
};
/** Associate at most two detections one-to-one. Detection order and screen side
 * are not identities. Handedness resolves close crossings; wrist prediction
 * carries identity through low-confidence labels. Ambiguous associations must
 * discard any armed contact instead of lending it to the other hand. */
export class HandIdentityTracker{
 private tracks=new Map<HandSide,Track>();
 private contradictions=new Map<HandSide,number>();
 private lastAt=-Infinity;
 reset(){this.tracks.clear();this.contradictions.clear();this.lastAt=-Infinity;}
 update(hands:AirHand[],now:number):IdentifiedHand[]{
  if(!Number.isFinite(now)||now<=this.lastAt)this.reset();
  this.lastAt=now;
  for(const [side,track] of this.tracks)if(now-track.at>IDENTITY_MEMORY_MS)this.tracks.delete(side);
  const detections=hands.filter(h=>h.landmarks.length>=21&&Number.isFinite(h.landmarks[0].x)&&Number.isFinite(h.landmarks[0].y)).slice(0,2);
  type Choice={sides:(HandSide|null)[];matched:number;cost:number};
  const choices:Choice[]=[];
  const enumerate=(index:number,sides:(HandSide|null)[],used:Set<HandSide>,matched:number,cost:number)=>{
   if(index===detections.length){choices.push({sides,matched,cost});return;}
   enumerate(index+1,[...sides,null],used,matched,cost);
   const hand=detections[index],wrist=hand.landmarks[0];
   for(const side of SIDES){
    const track=this.tracks.get(side);
    if(used.has(side)||!track||distance(wrist,track.wrist)>MAX_JUMP)continue;
    const elapsed=now-track.at;
    const horizon=elapsed<=320?Math.min(elapsed,160):0;
    const predicted={x:track.wrist.x+track.velocity.x*horizon,y:track.wrist.y+track.velocity.y*horizon};
    const handedness=label(hand);
    // A single bad label must not exchange spatially distinct hands. Near a
    // crossing, a confident label breaks the otherwise ambiguous assignment.
    const labelCost=handedness&&handedness!==side?.08:0;
    enumerate(index+1,[...sides,side],new Set([...used,side]),matched+1,cost+distance(wrist,predicted)+labelCost);
   }
  };
  enumerate(0,[],new Set(),0,0);
  choices.sort((a,b)=>b.matched-a.matched||a.cost-b.cost);
  const best=choices[0];
  const alternative=choices.find(c=>c.matched===best.matched&&c.sides.some((side,i)=>side!==best.sides[i]));
  const ambiguous=!!alternative&&alternative.cost-best.cost<.025;
  const fresh=new Set<number>();
  const semantic=detections.map(label);
  for(const side of SIDES){
   const index=best.sides.indexOf(side);
   const conflict=index>=0&&semantic[index]!==null&&semantic[index]!==side;
   this.contradictions.set(side,conflict&&!ambiguous?(this.contradictions.get(side)||0)+1:0);
  }
  // One contradictory classification only cancels contact. If the contradiction
  // persists and both semantic identities are unique, repair the assignment;
  // otherwise an abrupt crossing could leave the tracks permanently exchanged.
  if(semantic.every((side):side is HandSide=>side!==null)&&new Set(semantic).size===semantic.length
   &&SIDES.some(side=>(this.contradictions.get(side)||0)>=2)){
   best.sides=[...semantic];
   for(let i=0;i<detections.length;i++)fresh.add(i);
   this.contradictions.clear();
  }
  const used=new Set(best.sides.filter((side):side is HandSide=>side!==null));
  // Assign new/replacement detections globally as well: a low-confidence first
  // detection cannot take the slot required by a confidently labelled second.
  const missing=best.sides.flatMap((side,index)=>side===null?[index]:[]);
  let initial:{sides:HandSide[];cost:number}|null=null;
  const initialize=(index:number,sides:HandSide[],reserved:Set<HandSide>,cost:number)=>{
   if(index===missing.length){if(!initial||cost<initial.cost)initial={sides,cost};return;}
   const hand=detections[missing[index]],handedness=label(hand),wrist=hand.landmarks[0];
   for(const side of SIDES){
    if(reserved.has(side))continue;
    const screenSide:HandSide=wrist.x>=.5?'L':'R';
    const labelCost=handedness?(handedness===side?0:1):(screenSide===side?0:.05);
    const reservedCost=this.tracks.has(side)?.1:0;
    initialize(index+1,[...sides,side],new Set([...reserved,side]),cost+labelCost+reservedCost);
   }
  };
  initialize(0,[],used,0);
  // The explicit cast avoids TypeScript treating assignments inside the search
  // callback as unreachable; at most two detections always have enough slots.
  const initialized=initial as {sides:HandSide[];cost:number}|null;
  for(let i=0;i<missing.length;i++){
   best.sides[missing[i]]=initialized!.sides[i];fresh.add(missing[i]);
  }
  const result:IdentifiedHand[]=[];
  for(let index=0;index<detections.length;index++){
   const side=best.sides[index]!,hand=detections[index],wrist=hand.landmarks[0],previous=this.tracks.get(side);
   const elapsed=previous?now-previous.at:0;
   const handedness=label(hand);
   const reset=fresh.has(index)||ambiguous||!!(handedness&&handedness!==side)||elapsed>320;
   const velocity=previous&&!reset&&elapsed>0
    ?{x:(wrist.x-previous.wrist.x)/elapsed,y:(wrist.y-previous.wrist.y)/elapsed}:{x:0,y:0};
   this.tracks.set(side,{wrist:{x:wrist.x,y:wrist.y},velocity,at:now});
   result.push({side,hand,reset});
  }
  return result.sort((a,b)=>SIDES.indexOf(a.side)-SIDES.indexOf(b.side));
 }
}

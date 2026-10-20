export type PalmScroll={armed:boolean;rawY:number;smoothedY:number;lastAt:number;velocity:number};
export const newPalmScroll=():PalmScroll=>({armed:false,rawY:0,smoothedY:0,lastAt:0,velocity:0});
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
/** Extracted without changing baseline smoothing, dead zone, jump guard or speed. */
export function palmScrollDelta(scroll:PalmScroll,y:number,now:number,height:number,speed:number){
 if(!scroll.armed){
  scroll.armed=true;scroll.rawY=y;scroll.smoothedY=y;scroll.lastAt=now;scroll.velocity=0;return 0;
 }
 const jump=Math.abs(y-scroll.rawY)>.16||now-scroll.lastAt>320;
 const previous=scroll.smoothedY;
 scroll.smoothedY=previous*.35+y*.65;scroll.rawY=y;
 const elapsed=clamp(now-scroll.lastAt,25,110);scroll.lastAt=now;
 if(jump){scroll.velocity=0;scroll.smoothedY=y;return 0;}
 const raw=-((scroll.smoothedY-previous)*height*2.8*speed);
 const desired=Math.abs(raw)>1.6?clamp(raw,-120,120):0;
 scroll.velocity=scroll.velocity*.28+desired*.72;
 const amount=scroll.velocity*(elapsed/50);
 return Math.abs(amount)>1.3?amount:0;
}

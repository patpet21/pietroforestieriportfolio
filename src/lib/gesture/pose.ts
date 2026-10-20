export type Landmark={x:number;y:number;z:number};
export type HandSample={landmarks:Landmark[];wrist:Landmark;palm:{x:number;y:number};open:boolean;pointing:boolean;spread:boolean};
export const distance=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const extended=(p:Landmark[],tip:number,pip:number,mcp:number)=>
 distance(p[tip],p[0])>distance(p[pip],p[0])*1.11&&distance(p[tip],p[mcp])>distance(p[pip],p[mcp])*1.55;
export function getHand(points:Landmark[]):HandSample|null{
 if(points.length!==21||points.some(p=>!p||![p.x,p.y,p.z].every(Number.isFinite)))return null;
 const n=[0,5,9,13,17].map(i=>points[i]);
 const palm={x:n.reduce((v,p)=>v+p.x,0)/n.length,y:n.reduce((v,p)=>v+p.y,0)/n.length};
 const fingers=[extended(points,8,6,5),extended(points,12,10,9),extended(points,16,14,13),extended(points,20,18,17)];
 // Keep existing open-palm and explicit V predicates. Other partly open fingers
 // no longer disqualify an index aim; a pinch does not need an extended index.
 const open=fingers.filter(Boolean).length>=3;
 const spread=fingers[0]&&fingers[1]&&!fingers[2]&&!fingers[3];
 return {landmarks:points,wrist:points[0],palm,open,spread,pointing:(fingers[0]||!!measureForwardDepth(points)?.indexExtended)&&!open&&!spread};
}
export const pinchRatio=(hand:HandSample)=>distance(hand.landmarks[4],hand.landmarks[8])/Math.max(.065,distance(hand.landmarks[5],hand.landmarks[17]));
import {measureForwardDepth} from './forwardDepth.ts';

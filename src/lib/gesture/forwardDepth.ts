import type {Landmark} from './pose.ts';
export type ForwardDepth={scale:number;fingerDepth:number;jointDepth?:number;shape:number[];indexExtended:boolean};
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
/** Camera-relative cues, not metric contact sensing. Landmark Z is wrist-relative:
 * translation uses apparent palm size; finger motion uses relative fingertip Z.
 * Palm shape ratios let the controller reject obvious rotation. */
export function measureForwardDepth(points:Landmark[],aspect=1):ForwardDepth|null{
 if(points.length!==21||Array.from(points).some(p=>!p||![p.x,p.y,p.z].every(Number.isFinite)))return null;
 const distance=(a:number,b:number,depth=false)=>Math.hypot(points[a].x-points[b].x,
  (points[a].y-points[b].y)/aspect,depth?points[a].z-points[b].z:0);
 const lengths=[[0,5],[0,9],[0,17],[5,17]].map(([a,b])=>distance(a,b));
 const scale=median(lengths);
 if(scale<.025)return null;
 const path=distance(5,6,true)+distance(6,7,true)+distance(7,8,true);
 const straightness=path>0?distance(5,8,true)/path:0;
 const palmZ=[0,5,9,17].reduce((sum,i)=>sum+points[i].z,0)/4;
 return {scale,fingerDepth:(palmZ-points[8].z)/scale,jointDepth:(palmZ-points[7].z)/scale,shape:lengths.map(n=>n/scale),
  indexExtended:straightness>=.82&&distance(5,8,true)>distance(5,6,true)*1.4};
}

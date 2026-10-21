import type {Landmark} from './pose.ts';

type Track={points:Landmark[];at:number;id:number;spikes:Map<number,number>};
const FINGERTIPS:[number,number][]=[[4,3],[8,7],[12,11],[16,15],[20,19]];
const distance=(a:Landmark,b:Landmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const valid=(points:Landmark[])=>points.length===21&&points.every(p=>
 !!p&&[p.x,p.y,p.z].every(Number.isFinite));

/**
 * Keeps the live webcam preview, skeleton, index navigation and ten-finger
 * keyboard on ONE stabilized landmark frame. Never smooth a separately drawn
 * cursor: doing so would make the cursor drift away from its skeleton.
 *
 * A fingertip jump is considered suspicious only if both its proximal joint
 * and wrist remain nearly still. The first such discontinuity is discarded;
 * a persistent movement on the next frame is accepted. Real whole-hand
 * movement is not held or delayed.
 */
export class HandLandmarkStabilizer {
 private tracks:Track[]=[];
 private nextId=1;
 reset(){this.tracks=[];this.nextId=1;}
 update(hands:Landmark[][],now:number):Landmark[][]{
  if(!Number.isFinite(now)){this.reset();return [];}
  const incoming=hands.filter(valid).slice(0,2);
  if(!incoming.length){this.reset();return [];}
  this.tracks=this.tracks.filter(t=>now>t.at&&now-t.at<=320);
  const used=new Set<number>();
  const matched=incoming.map(points=>{
   const candidates=this.tracks
    .filter(t=>!used.has(t.id))
    .map(t=>({track:t,d:distance(points[0],t.points[0])}))
    .filter(entry=>entry.d<.22).sort((a,b)=>a.d-b.d);
   // If two tracks overlap, using either would transfer its smoothed tip to
   // another hand. Prefer fresh data over a visually incorrect association.
   const ambiguous=candidates.length>1&&candidates[1].d-candidates[0].d<.025;
   const previous=ambiguous?null:candidates[0]?.track||null;
   if(previous)used.add(previous.id);
   return {points,previous};
  });
  const result:Landmark[][]=[];
  const updated:Track[]=[];
  for(const {points,previous} of matched){
   if(!previous){const raw=points.map(p=>({...p}));result.push(raw);
    updated.push({id:this.nextId++,points:raw,at:now,spikes:new Map()});continue;}
   const elapsed=now-previous.at;
   const wristStep=distance(points[0],previous.points[0]);
   const palmWidth=distance(points[5],points[17]);
   const tipParents=new Map(FINGERTIPS);
   const stabilized=points.map((raw,index)=>{
    const old=previous.points[index];
    let x=raw.x,y=raw.y,z=raw.z;
    const parentId=tipParents.get(index);
    if(parentId!==undefined){
     const parent=points[parentId],oldParent=previous.points[parentId];
     const parentStep=distance(parent,oldParent);
     const isolated=distance(raw,old)>Math.max(.085,.8*palmWidth)&&
      parentStep<Math.max(.025,.18*palmWidth)&&wristStep<Math.max(.025,.18*palmWidth);
     const strikes=previous.spikes.get(index)||0;
     if(isolated&&strikes===0){
      // Move the last stable tip with its joint: do not let one bad model
      // detection draw an index pointer detached from its actual finger.
      x=old.x+(parent.x-oldParent.x);
      y=old.y+(parent.y-oldParent.y);
      z=old.z+(parent.z-oldParent.z);
      previous.spikes.set(index,1);
     }else previous.spikes.set(index,0);
    }
    const displacement=Math.hypot(x-old.x,y-old.y);
    // Adaptive low-pass: stationary micro jitter is damped, intentional moves
    // get almost the whole current sample, so the pointer stays responsive.
    const alpha=elapsed>=125?1:clamp(.32+.65*((displacement-.003)/.047),.32,.97);
    return {x:old.x+(x-old.x)*alpha,y:old.y+(y-old.y)*alpha,
     z:old.z+(z-old.z)*Math.max(.7,alpha)};
   });
   result.push(stabilized);
   updated.push({...previous,points:stabilized,at:now});
  }
  this.tracks=updated;
  return result;
 }
}

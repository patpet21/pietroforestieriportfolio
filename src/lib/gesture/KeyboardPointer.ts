import {ForwardPushController} from './ForwardPushController.ts';
import type {Point} from './ForwardPushController.ts';
import type {ForwardDepth} from './forwardDepth.ts';

/** Per-finger visual position and key targeting share the same lightly filtered
 * sample. Filtering tiny 2D jitter avoids keys switching under stationary hands;
 * substantial intentional motion remains responsive. */
export class KeyboardPointer{
 private controller:ForwardPushController<string>;
 private position:Point|null=null;
 private lastAt=-Infinity;
 constructor(travel?:number){this.controller=new ForwardPushController<string>(travel,'keyboard');}
 reset(){this.controller.reset();this.position=null;this.lastAt=-Infinity;}
 process(point:Point,depth:ForwardDepth|null,now:number,keyAt:(x:number,y:number)=>string|null){
  const elapsed=now-this.lastAt;
  if(elapsed>320||elapsed<0)this.reset();
  this.lastAt=now;
  const prior=this.position;
  const travel=prior?Math.hypot(point.x-prior.x,point.y-prior.y):Infinity;
  const rate=Math.max(16,Math.min(160,elapsed||40));
  const alpha=travel>.10?.85:Math.max(.28,Math.min(.72,1-Math.exp(-rate/70)));
  const livePoint:Point=prior?{
   x:prior.x+(point.x-prior.x)*alpha,y:prior.y+(point.y-prior.y)*alpha
  }:{...point};
  this.position=livePoint;
  const aimed=keyAt(livePoint.x,livePoint.y);
  const result=this.controller.step({now,tracking:true,depth,pointing:true,mode:'navigation',target:aimed,point:livePoint});
  const current=keyAt(result.point.x,result.point.y);
  const activation=result.activation&&current===result.activation?result.activation:null;
  return {...result,livePoint,activation,key:current,down:this.controller.down,
   armed:!result.pending&&this.controller.ready&&!!current};
 }
}

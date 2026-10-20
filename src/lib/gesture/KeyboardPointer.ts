import {ForwardPushController} from './ForwardPushController.ts';
import type {Point} from './ForwardPushController.ts';
import type {ForwardDepth} from './forwardDepth.ts';

/** Both keyboard views use the navigation forward-touch lifecycle. Keyboard coordinates
 * are supplied by the view, independent of experimental ten-finger calibration. */
export class KeyboardPointer{
 private controller=new ForwardPushController<string>();
 private position:Point|null=null;
 reset(){this.controller.reset();this.position=null;}
 process(point:Point,depth:ForwardDepth|null,now:number,keyAt:(x:number,y:number)=>string|null){
  const previous=this.position;
  this.position=previous?{x:previous.x*.36+point.x*.64,y:previous.y*.36+point.y*.64}:{...point};
  const aimed=keyAt(this.position.x,this.position.y);
  const result=this.controller.step({now,tracking:true,depth,pointing:true,mode:'navigation',target:aimed,point:this.position});
  // Geometry may change while pushing. Never acquire a new key during a push.
  const current=keyAt(result.point.x,result.point.y);
  const activation=result.activation&&current===result.activation?result.activation:null;
  return {...result,activation,key:current,down:this.controller.down,
   armed:!result.pending&&this.controller.ready&&!!current};
 }
}

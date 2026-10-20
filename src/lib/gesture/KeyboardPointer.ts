import {ForwardPushController} from './ForwardPushController.ts';
import type {Point} from './ForwardPushController.ts';
import type {ForwardDepth} from './forwardDepth.ts';

/** Both keyboard views use the navigation forward-touch lifecycle. Keyboard coordinates
 * are supplied by the view, independent of experimental ten-finger calibration. */
export class KeyboardPointer{
 private controller=new ForwardPushController<string>();
 reset(){this.controller.reset();}
 process(point:Point,depth:ForwardDepth|null,now:number,keyAt:(x:number,y:number)=>string|null){
  // Pointer feedback and targeting use this exact camera sample. A fixed
  // per-frame filter adds a variable delay as the inference rate changes.
  const livePoint:Point={...point};
  const aimed=keyAt(livePoint.x,livePoint.y);
  const result=this.controller.step({now,tracking:true,depth,pointing:true,mode:'navigation',target:aimed,point:livePoint});
  // Geometry may change while pushing. Never acquire a new key during a push.
  const current=keyAt(result.point.x,result.point.y);
  const activation=result.activation&&current===result.activation?result.activation:null;
  // The contact point remains locked during a stroke; expose the live tip
  // separately so views never draw the frozen contact as the moving finger.
  return {...result,livePoint,activation,key:current,down:this.controller.down,
   armed:!result.pending&&this.controller.ready&&!!current};
 }
}

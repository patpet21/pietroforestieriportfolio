import {PointerController} from './PointerController.ts';
import type {Point} from './PointerController.ts';

/** Both keyboard views use the navigation pinch lifecycle. Keyboard coordinates
 * are supplied by the view, independent of experimental ten-finger calibration. */
export class KeyboardPointer{
 private controller=new PointerController<string>();
 private position:Point|null=null;
 reset(){this.controller.reset();this.position=null;}
 process(point:Point,ratio:number,now:number,keyAt:(x:number,y:number)=>string|null){
  const previous=this.position;
  this.position=previous?{x:previous.x*.36+point.x*.64,y:previous.y*.36+point.y*.64}:{...point};
  const aimed=keyAt(this.position.x,this.position.y);
  const result=this.controller.step({now,tracking:true,ratio,pointing:true,mode:'navigation',target:aimed,point:this.position});
  // Geometry may change while pinching (resize/scroll). Never activate a key that
  // is no longer at the retained aim, or acquire another key during that pinch.
  const current=keyAt(result.point.x,result.point.y);
  const activation=result.activation&&current===result.activation?result.activation:null;
  return {...result,activation,key:current,down:this.controller.down,
   armed:!result.pending&&this.controller.ready&&!!current};
 }
}

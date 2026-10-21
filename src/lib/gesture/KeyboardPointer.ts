import {ForwardPushController} from './ForwardPushController.ts';
import type {Point} from './ForwardPushController.ts';
import type {ForwardDepth} from './forwardDepth.ts';

const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const KEY_SWITCH_MS=110;
const SMALL_DRIFT=.052;
const STROKE_ABORT_TRAVEL=.115;

/**
 * One independent target latch per fingertip.
 * Select BEFORE pushing; never hit-test a neighboring key half-way through a
 * forward stroke. Switching to another key requires clearly moving there and
 * briefly settling. No dwell-to-type timer: only a confirmed depth stroke types.
 *
 * Displayed fingertip position is still the same live sample as the preview;
 * only which KEY it selects receives hysteresis (not a second cursor filter).
 */
export class KeyboardPointer {
 private controller:ForwardPushController<string>;
 private lastAt=-Infinity;
 private selected:string|null=null;
 private anchor:Point|null=null;
 private switchCandidate:string|null=null;
 private switchAt=0;
 private lastDepth:number|null=null;
 private strokeLocked=false;
 constructor(travel?:number){this.controller=new ForwardPushController<string>(travel,'keyboard');}
 reset(){
  this.controller.reset();this.lastAt=-Infinity;this.selected=null;
  this.anchor=null;this.switchCandidate=null;this.switchAt=0;
  this.lastDepth=null;this.strokeLocked=false;
 }
 process(point:Point,depth:ForwardDepth|null,now:number,keyAt:(x:number,y:number)=>string|null){
  if(now-this.lastAt>320||now<=this.lastAt)this.reset();
  this.lastAt=now;
  const livePoint:Point={...point};
  const raw=keyAt(point.x,point.y);
  if(!depth){
   this.reset();
   return {activation:null,livePoint,key:null,down:false,armed:false,point:livePoint,
    phase:'IDLE',reason:'tracker-lost',pending:false,progress:0};
  }
  const delta=this.lastDepth===null?0:depth.fingerDepth-this.lastDepth;
  this.lastDepth=depth.fingerDepth;
  const distance=this.anchor?dist(livePoint,this.anchor):0;

  // Lock the chosen character as soon as a forward stroke starts, BEFORE
  // the contact frame when fingertip projection can wander sideways.
  if(this.selected&&delta>.025&&this.controller.ready)this.strokeLocked=true;
  if(this.controller.phase==='PRESSING'||this.controller.phase==='PRESSED')this.strokeLocked=true;

  // A real large sideways movement isn't a valid press on the old key.
  if(this.strokeLocked&&this.anchor&&distance>STROKE_ABORT_TRAVEL){
   this.reset();
   return {activation:null,livePoint,key:null,down:false,armed:false,point:livePoint,
    phase:'IDLE',reason:'target-missing',pending:false,progress:0};
  }

  if(this.selected!==raw&&!this.strokeLocked&&!this.controller.down){
   if(!this.selected){
    this.selected=raw;this.anchor=raw?{...point}:null;
    this.switchCandidate=null;this.switchAt=0;
   }else if(raw===null&&distance<SMALL_DRIFT){
    // Ignore tiny gaps between drawn keys.
    this.switchCandidate=null;this.switchAt=0;
   }else if(raw!==null&&distance<SMALL_DRIFT){
    // Tiny fingertip drift near a key border must not select a neighbor.
    this.switchCandidate=null;this.switchAt=0;
   }else{
    if(this.switchCandidate!==raw){this.switchCandidate=raw;this.switchAt=now;}
    if(now-this.switchAt>=KEY_SWITCH_MS){
     this.selected=raw;this.anchor=raw?{...point}:null;
     this.switchCandidate=null;this.switchAt=0;
     this.controller.reset();
    }
   }
  }else if(raw===this.selected){
   this.switchCandidate=null;this.switchAt=0;
  }

  const result=this.controller.step({now,tracking:true,depth,pointing:true,
   mode:'navigation',target:this.selected,point:livePoint});
  if(result.phase==='RELEASED'||result.reason==='tracker-lost'){
   this.strokeLocked=false;
  }
  // Never type a disabled/covered/deleted key; the selected key must still
  // exist at the point where aiming settled, even if the live finger drifted.
  const valid=this.anchor!==null&&this.selected!==null&&
   keyAt(this.anchor.x,this.anchor.y)===this.selected;
  const activation=valid&&result.activation===this.selected&&
   distance<=STROKE_ABORT_TRAVEL?result.activation:null;
  return {...result,livePoint,activation,key:valid?this.selected:null,
   down:this.controller.down,armed:valid&&!result.pending&&this.controller.ready};
 }
}

import type {ForwardDepth} from './forwardDepth.ts';
export type Point={x:number;y:number};
export type PointerPhase='IDLE'|'AIMING'|'ARMED'|'PRESSING'|'PRESSED'|'RELEASED';
export type Suppression='none'|'tracker-lost'|'mode-switch'|'not-pointing'|'target-missing'|'aligning-plane'|'hand-rotated'|'depth-jump'|'stale-target'|'latch-active';
type Input<T>={now:number;tracking:boolean;depth:ForwardDepth|null;pointing:boolean;mode:'navigation'|'scroll'|'zoom'|'keyboard';target:T|null;point:Point};
type Output<T>={activation:T|null;point:Point;pending:boolean;progress:number;phase:PointerPhase;reason:Suppression;confirmationMs?:number;targetAgeMs?:number};
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
export const FORWARD_TOUCH_POLICY={settleMs:200,windowMs:350,minSamples:4,palmScaleRatio:1.14,
 fingerTravel:.35,approach:.2,release:.1,confirmFrames:2,maxStrokeMs:850,maxFrameGapMs:320};
const travelFrom=(depth:ForwardDepth,rest:ForwardDepth)=>Math.max(
 Math.log(depth.scale/rest.scale)/Math.log(FORWARD_TOUCH_POLICY.palmScaleRatio),
 (depth.fingerDepth-rest.fingerDepth)/FORWARD_TOUCH_POLICY.fingerTravel);
/** Aim/settle, push across the virtual plane, withdraw to rearm. Units are
 * camera-relative; there is no pinch, finger-bend trigger, dwell click or repeat. */
export class ForwardPushController<T>{
 phase:PointerPhase='IDLE';down=false;pending=false;progress=0;frames=0;
 private rest:ForwardDepth|null=null;
 private target:T|null=null;
 private aim:Point={x:.5,y:.5};
 private held:T|null=null;
 private heldPoint:Point={x:.5,y:.5};
 private samples:{at:number;depth:ForwardDepth}[]=[];
 private lastAt=-Infinity;
 private startedAt=0;
 private releaseFrames=0;
 get ready(){return !!this.rest&&!this.pending;}
 reset(){
  this.phase='IDLE';this.down=false;this.pending=false;this.progress=0;this.frames=0;
  this.rest=null;this.target=null;this.held=null;this.samples=[];this.lastAt=-Infinity;this.releaseFrames=0;
 }
 step(input:Input<T>):Output<T>{
  const {now,depth,target,point}=input;
  const result=(reason:Suppression='none',activation:T|null=null):Output<T>=>({activation,
   point:this.pending?this.heldPoint:point,pending:this.pending,progress:this.progress,phase:this.phase,reason,
   confirmationMs:activation?now-this.startedAt:undefined,targetAgeMs:this.pending?now-this.startedAt:undefined});
  if(!input.tracking||!depth||now<=this.lastAt){this.reset();return result('tracker-lost');}
  if(input.mode!=='navigation'){this.reset();return result('mode-switch');}
  if(!input.pointing||!depth.indexExtended){this.reset();return result('not-pointing');}
  if(now-this.lastAt>FORWARD_TOUCH_POLICY.maxFrameGapMs)this.reset();
  this.lastAt=now;
  const approaching=!!this.rest&&travelFrom(depth,this.rest)>FORWARD_TOUCH_POLICY.approach;
  // Check depth onset before retargeting: a forward motion can shift screen XY.
  if(!this.pending&&!approaching&&target!==this.target){this.rest=null;this.samples=[];this.target=target;}
  if(!this.rest){
   if(!target){this.phase='AIMING';return result('target-missing');}
   this.samples.push({at:now,depth});this.samples=this.samples.filter(s=>now-s.at<=FORWARD_TOUCH_POLICY.windowMs);
   this.phase='AIMING';this.aim={...point};
   if(this.samples.length<FORWARD_TOUCH_POLICY.minSamples||now-this.samples[0].at<FORWARD_TOUCH_POLICY.settleMs)return result('aligning-plane');
   const scale=median(this.samples.map(s=>s.depth.scale));
   const fingerDepth=median(this.samples.map(s=>s.depth.fingerDepth));
   if(this.samples.some(s=>Math.abs(Math.log(s.depth.scale/scale))>.025||Math.abs(s.depth.fingerDepth-fingerDepth)>.06))return result('aligning-plane');
   this.rest={...depth,scale,fingerDepth};this.samples=[];this.phase='ARMED';return result();
  }
  if(depth.shape.some((value,i)=>Math.abs(Math.log(value/this.rest!.shape[i]))>.22)){
   this.reset();return result('hand-rotated');
  }
  // After reacquisition the first reference may be at the advanced position.
  // Follow withdrawal only; never let the plane chase an approaching finger.
  if(!this.pending&&((depth.scale<this.rest.scale*.975&&depth.fingerDepth<=this.rest.fingerDepth+.06)
   ||(depth.fingerDepth<this.rest.fingerDepth-.06&&depth.scale<=this.rest.scale*1.025))){
   this.rest={...depth};this.aim={...point};this.progress=0;this.phase='ARMED';return result();
  }
  const travel=travelFrom(depth,this.rest);
  if(!Number.isFinite(travel)||travel>3){this.reset();return result('depth-jump');}
  this.progress=Math.max(0,Math.min(1,travel));
  if(!this.pending){
   if(travel<=FORWARD_TOUCH_POLICY.approach){this.aim={...point};this.phase='ARMED';return result();}
   this.pending=true;this.held=this.target;this.heldPoint={...this.aim};this.startedAt=now;this.phase='PRESSING';
  }
  if(travel<=FORWARD_TOUCH_POLICY.release){
   if(++this.releaseFrames>=FORWARD_TOUCH_POLICY.confirmFrames){this.pending=false;this.down=false;this.frames=0;this.releaseFrames=0;this.held=null;this.phase='RELEASED';}
   return result();
  }
  this.releaseFrames=0;
  if(this.down)return result('latch-active');
  if(now-this.startedAt>FORWARD_TOUCH_POLICY.maxStrokeMs)return result('stale-target');
  this.frames=travel>=1?this.frames+1:0;
  if(this.frames<FORWARD_TOUCH_POLICY.confirmFrames)return result();
  this.down=true;this.phase='PRESSED';return result('none',this.held);
 }
}

import type {ForwardDepth} from './forwardDepth.ts';
export type Point={x:number;y:number};
export type PointerPhase='IDLE'|'AIMING'|'ARMED'|'PRESSING'|'PRESSED'|'RELEASED';
export type Suppression='none'|'tracker-lost'|'mode-switch'|'not-pointing'|'target-missing'|'aligning-plane'|'hand-rotated'|'depth-jump'|'stale-target'|'latch-active'|'incoherent-tip';
type Input<T>={now:number;tracking:boolean;depth:ForwardDepth|null;pointing:boolean;mode:'navigation'|'scroll'|'zoom'|'keyboard';target:T|null;point:Point};
type Output<T>={activation:T|null;point:Point;pending:boolean;progress:number;phase:PointerPhase;reason:Suppression;confirmationMs?:number;targetAgeMs?:number};
export const FORWARD_TOUCH_POLICY={fingerTravel:.045,palmGrowth:.012,noiseMultiplier:6,releaseFraction:.45,
 maxStrokeMs:240,maxFrameGapMs:320};
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]||0;
/** A short forward stroke, not occupation of a static depth plane. One sample
 * seeds the reference. A coherent stroke acts on its first qualifying sample. */
export class ForwardPushController<T>{
 phase:PointerPhase='IDLE';down=false;pending=false;progress=0;frames=0;
 private rest:ForwardDepth|null=null;private last:ForwardDepth|null=null;
 private noise:number[]=[];private lastAt=-Infinity;private startedAt:number|null=null;
 private target:T|null=null;private heldPoint:Point={x:.5,y:.5};
 private active:'finger'|'palm'='finger';private peak=0;
 private minTravel:number;
 constructor(minTravel=FORWARD_TOUCH_POLICY.fingerTravel){this.minTravel=minTravel;}
 get ready(){return !!this.rest&&this.target!==null&&!this.down;}
 reset(){this.phase='IDLE';this.down=false;this.pending=false;this.progress=0;this.frames=0;
  this.rest=null;this.last=null;this.noise=[];this.lastAt=-Infinity;this.startedAt=null;this.target=null;}
 step(input:Input<T>):Output<T>{
  const {now,depth,target,point}=input;
  const result=(reason:Suppression='none',activation:T|null=null):Output<T>=>({activation,
   point:this.down?this.heldPoint:point,pending:this.down,progress:this.down?1:0,phase:this.phase,reason,
   confirmationMs:activation!==null?now-(this.startedAt??now):undefined});
  if(!input.tracking||!depth||!Number.isFinite(now)||now<=this.lastAt){this.reset();return result('tracker-lost');}
  if(input.mode!=='navigation'){this.reset();return result('mode-switch');}
  if(!input.pointing||!depth.indexExtended){this.reset();return result('not-pointing');}
  if(now-this.lastAt>FORWARD_TOUCH_POLICY.maxFrameGapMs)this.reset();
  this.lastAt=now;
  const previous=this.last;this.last=depth;
  const seed=()=>{this.rest={...depth,shape:[...depth.shape]};this.target=target;this.startedAt=null;this.phase=target!==null?'ARMED':'AIMING';};
  if(!this.rest||!previous){seed();return result(target===null?'target-missing':'none');}
  if(depth.shape.some((value,i)=>Math.abs(Math.log(value/this.rest!.shape[i]))>.22)){
   this.reset();return result('hand-rotated');
  }
  const tipStep=depth.fingerDepth-previous.fingerDepth,palmStep=Math.log(depth.scale/previous.scale);
  if(!Number.isFinite(tipStep)||!Number.isFinite(palmStep)||Math.abs(tipStep)>.8||Math.abs(palmStep)>.18){
   this.reset();return result('depth-jump');
  }
  const travel=Math.max(this.minTravel,median(this.noise)*FORWARD_TOUCH_POLICY.noiseMultiplier);
  if(this.down){
   const position=this.active==='finger'?depth.fingerDepth:Math.log(depth.scale);
   this.peak=Math.max(this.peak,position);
   const release=(this.active==='finger'?travel:FORWARD_TOUCH_POLICY.palmGrowth)*FORWARD_TOUCH_POLICY.releaseFraction;
   // Leaving a key ends contact; a new key requires a new small stroke.
   if(target!==this.target||this.peak-position>=release){
    this.down=false;this.pending=false;this.progress=0;this.frames=0;seed();this.phase='RELEASED';return result();
   }
   return result('latch-active');
  }
  if(this.target===null||target===null){seed();return result(target===null?'target-missing':'none');}
  this.target=target;
  const fingerAdvance=depth.fingerDepth-this.rest.fingerDepth;
  const palmAdvance=Math.log(depth.scale/this.rest.scale);
  const amount=Math.max(fingerAdvance/travel,palmAdvance/FORWARD_TOUCH_POLICY.palmGrowth);
  const step=Math.max(tipStep/travel,palmStep/FORWARD_TOUCH_POLICY.palmGrowth);
  if(amount>.2&&step>.08&&this.startedAt===null)this.startedAt=now;
  if(this.startedAt!==null&&now-this.startedAt>FORWARD_TOUCH_POLICY.maxStrokeMs){seed();return result();}
  const fingerContact=fingerAdvance>=travel&&tipStep>0;
  const palmContact=palmAdvance>=FORWARD_TOUCH_POLICY.palmGrowth&&palmStep>0;
  // A real distal segment also advances. A lone bad tip-Z sample cannot type.
  const coherent=depth.jointDepth===undefined||this.rest.jointDepth===undefined||
   depth.jointDepth-this.rest.jointDepth>=fingerAdvance*.12;
  if((fingerContact&&coherent||palmContact)&&this.startedAt!==null){
   this.active=palmContact?'palm':'finger';this.peak=this.active==='finger'?depth.fingerDepth:Math.log(depth.scale);
   this.down=true;this.pending=true;this.progress=1;this.frames=1;this.phase='PRESSED';this.heldPoint={...point};
   return result('none',target);
  }
  // Learn idle jitter only. Follow retreat or slow drift, never a held plane.
  if(Math.abs(tipStep)<this.minTravel*.5){this.noise.push(Math.abs(tipStep));if(this.noise.length>24)this.noise.shift();}
  if(amount<.2||fingerAdvance<0&&palmAdvance<=0)seed();
  this.phase='ARMED';return result(fingerContact&&!coherent?'incoherent-tip':'none');
 }
}

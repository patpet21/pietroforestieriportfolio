import type {ForwardDepth} from './forwardDepth.ts';
export type Point={x:number;y:number};
export type PointerPhase='IDLE'|'AIMING'|'ARMED'|'PRESSING'|'PRESSED'|'RELEASED';
export type Suppression='none'|'tracker-lost'|'mode-switch'|'not-pointing'|'target-missing'|'aligning-plane'|'hand-rotated'|'depth-jump'|'stale-target'|'latch-active'|'incoherent-tip'|'aim-settling'|'confirming-touch'|'release-cooldown';
type Input<T>={now:number;tracking:boolean;depth:ForwardDepth|null;pointing:boolean;mode:'navigation'|'scroll'|'zoom'|'keyboard';target:T|null;point:Point};
type Output<T>={activation:T|null;point:Point;pending:boolean;progress:number;phase:PointerPhase;reason:Suppression;confirmationMs?:number;targetAgeMs?:number};
export const FORWARD_TOUCH_POLICY={
 fingerTravel:.08,palmGrowth:.04,noiseMultiplier:6,releaseFraction:.48,
 maxStrokeMs:380,maxFrameGapMs:320,aimMs:140,confirmMs:36,
 keyboardAimMs:145,keyboardCooldownMs:240,navigationCooldownMs:160
};
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]||0;
const copy=(depth:ForwardDepth):ForwardDepth=>({...depth,shape:[...depth.shape]});
/** Screen-space aiming must settle before a depth stroke. An actual press needs
 * two coherent camera samples; idle fluctuations and palm-wide movement cannot
 * immediately produce ten separate keystrokes. No dwell timer or progress ring. */
export class ForwardPushController<T>{
 phase:PointerPhase='IDLE';down=false;pending=false;progress=0;frames=0;
 private rest:ForwardDepth|null=null;private last:ForwardDepth|null=null;
 private noise:number[]=[];private lastAt=-Infinity;private targetSince=0;
 private target:T|null=null;private heldPoint:Point={x:.5,y:.5};
 private active:'finger'|'palm'='finger';private peak=0;
 private candidateAt:number|null=null;private candidate:'finger'|'palm'|null=null;
 private cooldownUntil=0;
 private minTravel:number;private profile:'navigation'|'keyboard';
 constructor(minTravel=FORWARD_TOUCH_POLICY.fingerTravel,profile:'navigation'|'keyboard'='navigation'){
  this.minTravel=minTravel;this.profile=profile;
 }
 get ready(){return !!this.rest&&this.target!==null&&!this.down&&
  this.lastAt-this.targetSince >= (this.profile==='keyboard'?FORWARD_TOUCH_POLICY.keyboardAimMs:FORWARD_TOUCH_POLICY.aimMs)&&this.lastAt>=this.cooldownUntil;}
 reset(){this.phase='IDLE';this.down=false;this.pending=false;this.progress=0;this.frames=0;
  this.rest=null;this.last=null;this.noise=[];this.lastAt=-Infinity;this.targetSince=0;
  this.target=null;this.candidateAt=null;this.candidate=null;this.cooldownUntil=0;}
 step(input:Input<T>):Output<T>{
  const {now,depth,target,point}=input;
  const result=(reason:Suppression='none',activation:T|null=null):Output<T>=>({
   activation,point:this.down?this.heldPoint:point,pending:this.down,progress:this.down?1:0,
   phase:this.phase,reason,targetAgeMs:this.target!==null?now-this.targetSince:undefined,
   confirmationMs:activation!==null&&this.candidateAt!==null?now-this.candidateAt:undefined
  });
  if(!input.tracking||!depth||!Number.isFinite(now)||now<=this.lastAt){this.reset();return result('tracker-lost');}
  if(input.mode!=='navigation'){this.reset();return result('mode-switch');}
  if(!input.pointing||!depth.indexExtended){this.reset();return result('not-pointing');}
  if(now-this.lastAt>FORWARD_TOUCH_POLICY.maxFrameGapMs)this.reset();
  const previous=this.last;this.last=copy(depth);this.lastAt=now;
  const seed=(nextTarget:T|null)=>{
   this.rest=copy(depth);this.target=nextTarget;this.targetSince=now;
   this.candidateAt=null;this.candidate=null;this.phase=nextTarget===null?'IDLE':'AIMING';
  };
  if(!this.rest){seed(target);return result(target===null?'target-missing':'aim-settling');}
  if(this.down){
   const position=this.active==='finger'?depth.fingerDepth:Math.log(depth.scale);
   this.peak=Math.max(this.peak,position);
   const threshold=this.active==='finger'?this.minTravel:Math.max(FORWARD_TOUCH_POLICY.palmGrowth,this.minTravel*.5);
   if(target!==this.target||this.peak-position>=threshold*FORWARD_TOUCH_POLICY.releaseFraction){
    this.down=false;this.pending=false;this.progress=0;this.frames=0;
    this.cooldownUntil=now+(this.profile==='keyboard'?FORWARD_TOUCH_POLICY.keyboardCooldownMs:FORWARD_TOUCH_POLICY.navigationCooldownMs);
    seed(target);this.phase='RELEASED';return result();
   }
   return result('latch-active');
  }
  if(target!==this.target){seed(target);return result(target===null?'target-missing':'aim-settling');}
  if(target===null){this.phase='IDLE';return result('target-missing');}
  if(depth.shape.length===this.rest.shape.length&&depth.shape.some((v,i)=>
   v<=0||this.rest!.shape[i]<=0||Math.abs(Math.log(v/this.rest!.shape[i]))>.22)){
   this.reset();return result('hand-rotated');
  }
  const tipStep=depth.fingerDepth-(previous?.fingerDepth??depth.fingerDepth);
  const palmStep=Math.log(depth.scale/(previous?.scale??depth.scale));
  if(!Number.isFinite(tipStep)||!Number.isFinite(palmStep)||Math.abs(tipStep)>.8||Math.abs(palmStep)>.18){
   this.reset();return result('depth-jump');
  }
  const wait=this.profile==='keyboard'?FORWARD_TOUCH_POLICY.keyboardAimMs:FORWARD_TOUCH_POLICY.aimMs;
  if(now<this.cooldownUntil){this.rest=copy(depth);this.candidateAt=null;this.phase='AIMING';return result('release-cooldown');}
  if(now-this.targetSince<wait){this.rest=copy(depth);this.candidateAt=null;this.phase='AIMING';return result('aim-settling');}
  const travel=Math.max(this.minTravel,median(this.noise)*FORWARD_TOUCH_POLICY.noiseMultiplier);
  const fingerAdvance=depth.fingerDepth-this.rest.fingerDepth;
  const palmAdvance=Math.log(depth.scale/this.rest.scale);
  const coherent=depth.jointDepth===undefined||this.rest.jointDepth===undefined||
   depth.jointDepth-this.rest.jointDepth>=fingerAdvance*.22;
  // Palm approach may click a page element, but never type on a virtual keyboard.
  const fingerContact=fingerAdvance>=travel&&coherent;
  const palmContact=this.profile==='navigation'&&palmAdvance>=Math.max(FORWARD_TOUCH_POLICY.palmGrowth,this.minTravel*.5);
  const kind:'finger'|'palm'|null=fingerContact?'finger':palmContact?'palm':null;
  if(kind!==null){
   if(this.candidate!==kind||this.candidateAt===null){
    // Only a new forward-moving stroke can start contact confirmation.
    if((kind==='finger'?tipStep:palmStep)<=0){this.phase='ARMED';return result();}
    this.candidate=kind;this.candidateAt=now;this.phase='PRESSING';return result('confirming-touch');
   }
   if(now-this.candidateAt>=FORWARD_TOUCH_POLICY.confirmMs){
    const confirmedAt=this.candidateAt;
    this.active=kind;this.peak=kind==='finger'?depth.fingerDepth:Math.log(depth.scale);
    this.down=true;this.pending=true;this.progress=1;this.frames=2;this.phase='PRESSED';this.heldPoint={...point};
    const output=result('none',target);output.confirmationMs=now-confirmedAt;return output;
   }
   this.phase='PRESSING';return result('confirming-touch');
  }
  // A spurious tip spike cannot become a deferred keystroke.
  if(this.candidateAt!==null&&now-this.candidateAt>FORWARD_TOUCH_POLICY.maxStrokeMs){seed(target);return result();}
  this.candidateAt=null;this.candidate=null;
  if(Math.abs(tipStep)<this.minTravel*.35){this.noise.push(Math.abs(tipStep));if(this.noise.length>24)this.noise.shift();}
  // Rebase only while genuinely idle; never chase an advancing fingertip.
  if(fingerAdvance<0||Math.abs(fingerAdvance)<this.minTravel*.15)this.rest=copy(depth);
  this.phase='ARMED';return result(fingerAdvance>=travel&&!coherent?'incoherent-tip':'none');
 }
}

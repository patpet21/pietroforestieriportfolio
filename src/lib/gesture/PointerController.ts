export type Point={x:number;y:number};
export type Suppression='none'|'tracker-lost'|'mode-switch'|'release-required'|'gesture-not-confirmed'|'latch-active'|'not-pointing'|'target-missing'|'stale-target'|'target-blocked';
export type PointerPhase='IDLE'|'AIMING'|'ARMED'|'PRESSED'|'RELEASED';
/** Session-local, deterministic controller. All frames, including scroll/zoom and
 * lost tracking, must pass here before any view-specific early return. */
export class PointerController<T>{
 phase:PointerPhase='IDLE';
 down=false;
 candidate=false;
 frames=0;
 private armed=false;
 private aim:{target:T;point:Point;at:number}|null=null;
 private held:typeof this.aim=null;
 private lastAt=-Infinity;
 private closeAt=0;
 get ready(){return this.armed;}
 reset(){
  this.phase='IDLE';this.down=false;this.candidate=false;this.frames=0;
  this.armed=false;this.aim=null;this.held=null;this.lastAt=-Infinity;this.closeAt=0;
 }
 step(input:{now:number;tracking:boolean;ratio:number;pointing:boolean;mode:'navigation'|'scroll'|'zoom'|'keyboard';target:T|null;point:Point}){
  const {now,tracking,ratio,pointing,mode,target,point}=input;
  let reason:Suppression='none';
  let activation:T|null=null;
  if(!tracking||!Number.isFinite(ratio)||now<=this.lastAt){
   this.reset();return {activation,point,pending:false,reason:'tracker-lost' as Suppression,phase:this.phase};
  }
  if(now-this.lastAt>320){this.reset();}
  this.lastAt=now;
  const close=ratio<(this.down?.88:.62);
  if(close!==this.candidate){this.candidate=close;this.frames=1;}else this.frames++;
  const wasDown=this.down;
  if(this.frames>=2)this.down=close;
  const started=this.down&&!wasDown;
  const released=!this.down&&wasDown;
  const pending=close||this.down;
  if(mode!=='navigation'){
   this.armed=false;this.aim=null;this.held=null;this.phase='IDLE';
   return {activation,point,pending,reason:'mode-switch' as Suppression,phase:this.phase};
  }
  if(!pending&&this.frames>=2){this.armed=true;this.held=null;}
  if(!pending&&pointing){
   this.aim=target?{target,point:{...point},at:now}:null;
   this.phase=target?'ARMED':'AIMING';
  }
  // Freeze the last OPEN aim at the first close candidate, before the fingertip
  // moves towards the thumb. Do not retarget during a held pinch.
  if(close&&this.frames===1){this.held=this.aim;this.closeAt=now;}
  if(started){
   this.phase='PRESSED';
   if(!this.armed)reason='release-required';
   else if(!this.held)reason='target-missing';
   else if(now-this.held.at>850)reason='stale-target';
   else activation=this.held.target;
   this.armed=false;
  }else if(pending)reason=this.down?'latch-active':'gesture-not-confirmed';
  else if(!pointing)reason='not-pointing';
  if(released)this.phase='RELEASED';
  return {activation,point:pending&&this.held?this.held.point:point,pending,reason,phase:this.phase,
   confirmationMs:started?now-this.closeAt:undefined,targetAgeMs:this.held?now-this.held.at:undefined};
 }
}

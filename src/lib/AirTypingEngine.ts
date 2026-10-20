import {measureForwardDepth} from './gesture/forwardDepth.ts';
import {KeyboardPointer} from './gesture/KeyboardPointer.ts';
/**
 * Forward index touch uses the shared virtual-plane lifecycle.
 * Ten-finger tap remains an independently calibrated research mode.
 */
export type AirPoint={x:number;y:number;z:number};
export type AirHand={landmarks:AirPoint[]};
export type AirFinger={id:string;hand:'L'|'R';name:string;x:number;y:number;key:string|null;pressed:boolean;armed:boolean;ratio:number;progress?:number};
export type AirKeyPress={key:string;fingerId:string};
export type AirFrame={fingers:AirFinger[];presses:AirKeyPress[];hands:number;calibrated:number;status:string;control?:{progress:number;phase:string;reason:string;confirmationMs?:number}};
export type AirTypingMode='tap'|'push';
export type AirSensitivity='easy'|'balanced'|'precise';
export type AirTypingSettings={reach:number;mode:AirTypingMode;sensitivity:AirSensitivity;aspect?:number};
export type KeyLocator=(x:number,y:number)=>string|null;
export type HomeLocator=(key:string)=>{x:number;y:number}|null;
type Side='L'|'R';
type FingerName='THUMB'|'INDEX'|'MIDDLE'|'RING'|'PINKY';
type Calibration={
 wrist:{x:number;y:number};width:number;
 fingers:Record<string,{relativeX:number;relativeY:number;baseline:number;homeX:number;homeY:number}>;
};
type FingerState={
 x:number;y:number;key:string|null;stableSince:number;
 downFrames:number;upFrames:number;down:boolean;armed:boolean;lastAt:number;lastPress:number;
};
const FINGERS:{name:FingerName;tip:number;pip:number;mcp:number}[]=[
 {name:'THUMB',tip:4,pip:3,mcp:2},{name:'INDEX',tip:8,pip:6,mcp:5},
 {name:'MIDDLE',tip:12,pip:10,mcp:9},{name:'RING',tip:16,pip:14,mcp:13},
 {name:'PINKY',tip:20,pip:18,mcp:17},
];
const HOME:Record<string,string>={
 'L-THUMB':'SPACE','L-INDEX':'F','L-MIDDLE':'D','L-RING':'S','L-PINKY':'A',
 'R-THUMB':'SPACE','R-INDEX':'J','R-MIDDLE':'K','R-RING':'L','R-PINKY':';',
};
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const pressFactors:Record<AirSensitivity,number>={easy:.83,balanced:.75,precise:.67};
export class AirTypingEngine{
 private states=new Map<string,FingerState>();
 private keyboardPointer=new KeyboardPointer();
 private control:{x:number;y:number;at:number}|null=null;
 private calibration=new Map<Side,Calibration>();
 private lastGlobalPress=0;
 private singleHandSide:Side|null=null;
 private statusMessage='';
 reset(){this.states.clear();this.keyboardPointer.reset();this.control=null;this.lastGlobalPress=0;this.singleHandSide=null;}
 clearCalibration(){this.reset();this.calibration.clear();this.statusMessage='';}
 calibratedHands(){return this.calibration.size;}
 private assignHands(hands:AirHand[]):{side:Side;hand:AirHand}[]{
  const sorted=hands.filter(h=>h.landmarks.length>=21).slice(0,2)
   .sort((a,b)=>(1-a.landmarks[0].x)-(1-b.landmarks[0].x));
  if(sorted.length===2){this.singleHandSide=null;return [{side:'L',hand:sorted[0]},{side:'R',hand:sorted[1]}];}
  if(!sorted.length)return [];
  const hand=sorted[0],x=1-hand.landmarks[0].x,y=hand.landmarks[0].y;
  let side:Side;
  if(this.calibration.size===2){
   const left=this.calibration.get('L')!,right=this.calibration.get('R')!;
   const ld=Math.hypot(x-left.wrist.x,y-left.wrist.y);
   const rd=Math.hypot(x-right.wrist.x,y-right.wrist.y);
   side=ld<=rd?'L':'R';
  }else if(this.calibration.size===1){side=this.calibration.has('L')?'L':'R';}
  else {
   if(!this.singleHandSide)this.singleHandSide=x<.5?'L':'R';
   side=this.singleHandSide;
  }
  return [{side,hand}];
 }
 /**
  * Capture a relaxed typing posture. Each finger is anchored to its physical
  * QWERTY home key; subsequent movement is measured relative to the wrist,
  * not the uncalibrated absolute webcam position.
  */
 calibrate(hands:AirHand[],homeAt:HomeLocator):{ok:boolean;hands:number;message:string}{
  const assigned=this.assignHands(hands);
  if(!assigned.length)return {ok:false,hands:0,message:'NO HAND DETECTED · SHOW YOUR HANDS'};
  const saved=new Map<Side,Calibration>();
  for(const {side,hand} of assigned){
   const points=hand.landmarks,wrist=points[0];
   const width=Math.max(.075,dist(points[5],points[17]));
   const fingers:Calibration['fingers']={};
   for(const f of FINGERS){
    const home=homeAt(HOME[side+'-'+f.name]);if(!home)continue;
    const tip=points[f.tip];
    const ratio=dist(tip,points[f.mcp])/Math.max(.025,dist(points[f.pip],points[f.mcp]));
    fingers[f.name]={
     relativeX:wrist.x-tip.x,relativeY:tip.y-wrist.y,
     baseline:ratio,homeX:home.x,homeY:home.y
    };
   }
   if(Object.keys(fingers).length===5){
    saved.set(side,{wrist:{x:1-wrist.x,y:wrist.y},width,fingers});
   }
  }
  if(!saved.size)return {ok:false,hands:assigned.length,message:'KEYBOARD NOT READY · TRY AGAIN'};
  this.calibration=saved;this.reset();
  const count=saved.size;
  this.statusMessage=count===2?'BOTH HANDS ALIGNED':'ONE HAND ALIGNED · SHOW SECOND HAND TO CALIBRATE BOTH';
  return {ok:true,hands:count,message:this.statusMessage};
 }
 private processPush(hands:AirHand[],keyAt:KeyLocator,now:number,reach:number,aspect=1):AirFrame{
  const valid=hands.filter(h=>h.landmarks.length===21&&h.landmarks.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
  if(!valid.length){this.keyboardPointer.reset();this.control=null;return {fingers:[],presses:[],hands:0,calibrated:0,status:'SHOW ONE HAND · INDEX TO AIM'};}
  const previous=this.control;
  const hand=valid.slice().sort((a,b)=>{
   const origin=previous||{x:.5,y:.5};
   return dist(a.landmarks[0],origin)-dist(b.landmarks[0],origin);
  })[0];
  const wrist=hand.landmarks[0],tip=hand.landmarks[8];
  if(previous&&(now-previous.at>320||Math.hypot(wrist.x-previous.x,wrist.y-previous.y)>.28))this.keyboardPointer.reset();
  this.control={x:wrist.x,y:wrist.y,at:now};
  const depth=measureForwardDepth(hand.landmarks,aspect);
  const result=this.keyboardPointer.process({x:clamp((1-tip.x-.5)*reach+.5,0,1),y:clamp((tip.y-.5)*reach+.5,0,1)},depth,now,keyAt);
  const side:Side=wrist.x>.5?'L':'R';
  const id=side+'-INDEX';
  return {fingers:[{id,hand:side,name:'INDEX',x:result.point.x,y:result.point.y,key:result.key,
    pressed:result.down,armed:result.armed,ratio:result.progress,progress:result.progress}],
   presses:result.activation?[{key:result.activation,fingerId:id}]:[],hands:valid.length,calibrated:0,
   control:{progress:result.progress,phase:result.phase,reason:result.reason,confirmationMs:result.confirmationMs},
   status:result.reason==='stale-target'?'WITHDRAW TO REPOSITION THE SURFACE':result.activation?'TOUCH ✓ · WITHDRAW TO RELEASE':result.pending?'PUSH · '+Math.round(result.progress*100)+'% · WITHDRAW TO RELEASE':result.armed?'PUSH INDEX FORWARD TO TOUCH':result.key?'HOLD AIM BRIEFLY · POSITIONING TOUCH PLANE':'MOVE INDEX OVER A KEY'};
 }
 process(hands:AirHand[],keyAt:KeyLocator,now:number,options:AirTypingSettings):AirFrame{
  const reach=clamp(options.reach,.8,2.0);
  if(options.mode==='push')return this.processPush(hands,keyAt,now,reach,options.aspect);
  const assigned=this.assignHands(hands);
  const fingers:AirFinger[]=[],presses:AirKeyPress[]=[],alive=new Set<string>();
  for(const {side,hand} of assigned){
   const points=hand.landmarks,wrist=points[0];
   const cal=this.calibration.get(side);
   for(const {name,tip,pip,mcp} of FINGERS){
    const id=side+'-'+name;alive.add(id);
    const p=points[tip],fingerCal=cal?.fingers[name];
    const ratio=dist(p,points[mcp])/Math.max(.025,dist(points[pip],points[mcp]));
    const mirroredX=1-p.x;
    const x0=fingerCal
     ?fingerCal.homeX+((wrist.x-p.x)-fingerCal.relativeX)/cal!.width*(.20*reach)
     :clamp((mirroredX-.5)*reach+.5,0,1);
    const y0=fingerCal
     ?fingerCal.homeY+((p.y-wrist.y)-fingerCal.relativeY)/cal!.width*(.38*reach)
     :clamp((p.y-.5)*reach+.5,0,1);
    const x=clamp(x0,0,1),y=clamp(y0,0,1);
    let st=this.states.get(id);
    if(!st||now-st.lastAt>550){
     st={x,y,key:null,stableSince:now,downFrames:0,upFrames:0,
      down:false,armed:false,lastAt:now,lastPress:0};
     this.states.set(id,st);
    }
    st.lastAt=now;
    const motion=Math.hypot(x-st.x,y-st.y);
    const alpha=motion>.07?.82:.64;
    st.x=st.x*(1-alpha)+x*alpha;st.y=st.y*(1-alpha)+y*alpha;
    const hover=keyAt(st.x,st.y);
    if(fingerCal){
     const baseline=Math.max(1.2,fingerCal.baseline);
     const pressAt=baseline*pressFactors[options.sensitivity];
     const releaseAt=baseline*.94;
     const extended=ratio>releaseAt;
     // Hover must be settled on the same key before the finger is armed.
     if(!st.down&&extended){
      if(hover!==st.key){st.key=hover;st.stableSince=now;st.armed=false;}
      if(hover&&now-st.stableSince>=180)st.armed=true;
     }
     if(options.mode==='tap'){
      if(st.down){
       if(extended){st.upFrames++;if(st.upFrames>=2){st.down=false;st.downFrames=0;st.upFrames=0;}}
       else st.upFrames=0;
      }else if(ratio<pressAt){
       st.downFrames++;
       if(st.downFrames>=2){
        if(st.armed&&st.key&&now-st.lastPress>330&&now-this.lastGlobalPress>160){
         presses.push({key:st.key,fingerId:id});
         st.lastPress=now;this.lastGlobalPress=now;
        }
        st.down=true;st.armed=false;st.upFrames=0;
       }
      }else st.downFrames=0;
     }else{st.down=false;st.downFrames=0;st.upFrames=0;}
    }else{
     st.key=hover;st.armed=false;st.down=false;st.downFrames=0;st.upFrames=0;
    }
    fingers.push({id,hand:side,name,x:st.x,y:st.y,key:st.key,pressed:st.down,armed:st.armed,ratio});
   }
  }
  for(const [id,st] of this.states){if(!alive.has(id)&&now-st.lastAt>350)this.states.delete(id);}
  const count=assigned.length,calibrated=this.calibration.size;
  const status=calibrated===0?'NOT ALIGNED · PRESS ALIGN HANDS':
   count===0?'SHOW YOUR HANDS IN THE CAMERA':
   count===1&&calibrated===2?'ONLY ONE HAND VISIBLE · SEPARATE BOTH HANDS':
   count===1?'1 HAND · CALIBRATED':
   calibrated===2?'2 HANDS · CALIBRATED':'2 HANDS VISIBLE · RECALIBRATE TO USE BOTH';
  return {fingers,presses,hands:count,calibrated,status};
 }
}

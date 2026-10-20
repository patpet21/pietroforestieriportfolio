/**
 * GestureOS Multi-Finger Air Typing Engine — original TypeScript implementation.
 * All 10 fingertip landmarks (five per detected hand) produce independent
 * hover and bend/press states. No external app, Python, or OS keyboard access.
 * Webcam-based depth is estimated: calibration/lighting are important.
 */
export type AirPoint={x:number;y:number;z:number};
export type AirHand={landmarks:AirPoint[]};
export type AirFinger={id:string;hand:'L'|'R';name:string;x:number;y:number;key:string|null;pressed:boolean;armed:boolean;ratio:number};
export type AirKeyPress={key:string;fingerId:string};
export type AirFrame={fingers:AirFinger[];presses:AirKeyPress[];hands:number;status:string};
export type AirTypingMode='tap'|'pinch';
export type AirSensitivity='easy'|'balanced'|'precise';
export type AirTypingSettings={reach:number;mode:AirTypingMode;sensitivity:AirSensitivity};
export type KeyLocator=(x:number,y:number)=>string|null;
type FingerState={
 x:number;y:number;key:string|null;stableSince:number;
 peak:number;downFrames:number;upFrames:number;down:boolean;armed:boolean;
 lastAt:number;lastPress:number;
};
type PinchState={down:boolean;lastPress:number};
const FINGERS=[
 {name:'THUMB',tip:4,pip:3,mcp:2},
 {name:'INDEX',tip:8,pip:6,mcp:5},
 {name:'MIDDLE',tip:12,pip:10,mcp:9},
 {name:'RING',tip:16,pip:14,mcp:13},
 {name:'PINKY',tip:20,pip:18,mcp:17},
] as const;
const d=(a:AirPoint,b:AirPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const sensitivityOffset:Record<AirSensitivity,number>={easy:.14,balanced:0,precise:-.15};
export class AirTypingEngine{
 private states=new Map<string,FingerState>();
 private pinches=new Map<string,PinchState>();
 private lastGlobalPress=0;
 private singleHandSide:'L'|'R'|null=null;
 reset(){this.states.clear();this.pinches.clear();this.lastGlobalPress=0;this.singleHandSide=null;}
 process(hands:AirHand[],keyAt:KeyLocator,now:number,options:AirTypingSettings):AirFrame{
  const reach=clamp(options.reach,.75,2.3);
  const shown:AirFinger[]=[],presses:AirKeyPress[]=[];
  // Sort by mirrored position. This keeps the keyboard's left and right halves intuitive.
  const sorted=hands.filter(h=>h.landmarks.length>=21).slice(0,2)
   .sort((a,b)=>(1-a.landmarks[0].x)-(1-b.landmarks[0].x));
  const alive=new Set<string>();
  if(sorted.length===1&&!this.singleHandSide){
   this.singleHandSide=1-sorted[0].landmarks[0].x<.5?'L':'R';
  }
  if(sorted.length===2)this.singleHandSide=null;
  sorted.forEach((hand,handIndex)=>{
   const handName:'L'|'R'=sorted.length===2?(handIndex===0?'L':'R'):
    (this.singleHandSide||'L');
   const index=hand.landmarks[8],thumb=hand.landmarks[4];
   const palmWidth=Math.max(.06,d(hand.landmarks[5],hand.landmarks[17]));
   const pinchRatio=d(index,thumb)/palmWidth;
   const pinch=this.pinches.get(handName)||{down:false,lastPress:0};
   const pinchThreshold=pinch.down ? .75 : .49;
   const currentPinch=pinchRatio<pinchThreshold;
   FINGERS.forEach(({name,tip,pip,mcp})=>{
    const id=handName+'-'+name;alive.add(id);
    const p=hand.landmarks[tip];
    const ratio=d(p,hand.landmarks[mcp])/Math.max(.025,d(hand.landmarks[pip],hand.landmarks[mcp]));
    const pointX=clamp((1-p.x-.5)*reach+.5,0,1);
    const pointY=clamp((p.y-.5)*reach+.5,0,1);
    let st=this.states.get(id);
    if(!st||now-st.lastAt>650){
     st={x:pointX,y:pointY,key:null,stableSince:now,peak:ratio,
      downFrames:0,upFrames:0,down:false,armed:false,lastAt:now,lastPress:0};
     this.states.set(id,st);
    }
    st.lastAt=now;
    const movement=Math.hypot(pointX-st.x,pointY-st.y);
    const alpha=movement>.055?.73:.43;
    st.x=st.x*(1-alpha)+pointX*alpha;
    st.y=st.y*(1-alpha)+pointY*alpha;
    const hover=keyAt(st.x,st.y);
    // Ratio relative to the finger's recent extended posture; tuning cannot
    // assume every person's fingers have identical dimensions.
    if(!st.down&&ratio>st.peak)st.peak=st.peak*.8+ratio*.2;
    const isThumb=name==='THUMB';
    const pressAt=clamp(st.peak*(isThumb?.64:.69)+(sensitivityOffset[options.sensitivity]),isThumb?1.15:1.3,isThumb?1.65:1.9);
    const releaseAt=pressAt+(isThumb?.34:.36);
    const isExtended=ratio>releaseAt;
    // Once a finger starts descending, freeze the hovered key. The fingertip
    // visibly moves while bending, but the intended key should not change.
    if(isExtended&&!st.down){
     if(hover!==st.key){st.key=hover;st.stableSince=now;st.armed=false;}
     if(hover&&now-st.stableSince>=115)st.armed=true;
    }
    if(options.mode==='tap'){
     if(st.down){
      if(isExtended){st.upFrames++;if(st.upFrames>=2){st.down=false;st.downFrames=0;st.upFrames=0;st.peak=ratio;}}
      else st.upFrames=0;
     }else if(ratio<pressAt){
      st.downFrames++;
      if(st.downFrames>=2){
       if(st.armed&&st.key&&now-st.lastPress>250&&now-this.lastGlobalPress>80){
        presses.push({key:st.key,fingerId:id});
        this.lastGlobalPress=now;st.lastPress=now;
       }
       st.down=true;st.armed=false;st.upFrames=0;
      }
     }else st.downFrames=0;
    }else{
     // Keep all ten fingertip cursors visible in fallback pinch mode.
     st.down=false;st.downFrames=0;st.upFrames=0;
    }
    shown.push({id,hand:handName,name,x:st.x,y:st.y,
     key:st.key,pressed:st.down,armed:st.armed,ratio});
   });
   if(options.mode==='pinch'){
    const idx=this.states.get(handName+'-INDEX');
    if(currentPinch&&!pinch.down&&idx?.key&&now-idx.stableSince>=115&&now-this.lastGlobalPress>100){
     presses.push({key:idx.key,fingerId:handName+'-INDEX'});
     idx.lastPress=now;this.lastGlobalPress=now;pinch.lastPress=now;
    }
    pinch.down=currentPinch;
   }else pinch.down=false;
   this.pinches.set(handName,pinch);
  });
  for(const [id,st] of this.states){if(!alive.has(id)&&now-st.lastAt>450)this.states.delete(id);}
  if(!sorted.length)this.pinches.clear();
  const count=sorted.length;
  return {fingers:shown,presses,hands:count,status:
   !count?'SHOW YOUR HANDS':count===1?'1 HAND · 5 FINGERS READY':'2 HANDS · 10 FINGERS READY'};
 }
}

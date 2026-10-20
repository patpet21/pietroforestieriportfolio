import{useLayoutEffect}from 'react';
import type{RefObject}from 'react';
import{Keyboard,ScanFace,RefreshCw,Hand,MousePointer2,X,RotateCcw}from 'lucide-react';
import type{AirFinger,AirSensitivity,AirTypingMode}from '../lib/AirTypingEngine';
const rows=['QWERTYUIOP','ASDFGHJKL;','ZXCVBNM'];
type Props={
 keysRef:RefObject<HTMLDivElement|null>;
 fingers:AirFinger[];hands:number;status:string;text:string;
 mode:AirTypingMode;sensitivity:AirSensitivity;reach:number;
 onMode:(mode:AirTypingMode)=>void;
 onSensitivity:(value:AirSensitivity)=>void;
 onReach:(value:number)=>void;
 onCalibrate:()=>void;onClose:()=>void;onKey:(key:string)=>void;
 calibrationMessage:string;
 sampleId?:number;sampledAt?:number;
 onFrameCommit?:(id:number,at:number)=>void;
};
const glyph=(name:string)=>name==='THUMB'?'T':name==='INDEX'?'I':name==='MIDDLE'?'M':name==='RING'?'R':'P';
export default function AirKeyboard({
 keysRef,fingers,hands,status,text,mode,sensitivity,reach,onMode,onSensitivity,onReach,onCalibrate,onClose,onKey,calibrationMessage,sampleId,sampledAt,onFrameCommit
}:Props){
 // Marker positions, contact feedback and text are committed together, with no
 // separate positional animation that would trail the hit-test coordinates.
 useLayoutEffect(()=>{if(sampleId!==undefined&&sampledAt!==undefined)onFrameCommit?.(sampleId,sampledAt);},[sampleId,sampledAt,onFrameCommit]);
 const hover=new Set(fingers.filter(f=>f.key&&(f.armed||f.pending)).map(f=>f.key));
 const pressed=new Set(fingers.filter(f=>f.key&&f.pressed).map(f=>f.key));
 const control=(value:string,text:string,extra='')=><button type="button" key={value}
  data-holo-key={value}
  className={(hover.has(value)?'air-key-hover ':'')+(pressed.has(value)?'air-key-pressed ':'')+extra}
  onClick={()=>onKey(value)}>{text}</button>;
 return <section className="holo-air-console holo-control air-desk" aria-label="Multi-finger air keyboard">
  <div className="air-desk-header">
   <div className="air-desk-brand"><ScanFace size={19}/><div><b>GESTUREOS / AIR TYPE LAB</b><small>{mode==='push'?'TEN-FINGER TOUCH · SMALL FORWARD TAPS':'FINGER BEND · EXPERIMENT'}</small></div></div>
   <button type="button" className="air-desk-close" aria-label="Close air keyboard" onClick={onClose}><X size={16}/> CLOSE</button>
  </div>
  <div className="air-desk-information">
   <div className="air-desk-status"><span className={'air-online '+((mode==='push'?hands>0:hands===2)?'on':'')}/><span>{status}</span></div>
   <div className="air-desk-finger-legend"><span className="left">L · LEFT HAND</span><span className="right">R · RIGHT HAND</span></div>
  </div>
  <p className="air-calibration-note" role="status">
   <strong>{mode==='push'?'Show both hands: all ten fingertips follow you. Tap a finger forward slightly, then relax. No waiting or progress ring.':calibrationMessage||'AUTO-ALIGN: show both hands and hold still. No button is needed.'}</strong>
   {mode==='tap'&&<span> No simultaneous clicking and hand positioning. This is only an approximate camera-based alignment, not a touch keyboard.</span>}
  </p>
  <div className="air-desk-output"><small>LIVE TYPING · SELECTED FIELD / DEMO BUFFER</small><output aria-live="off">{text||(mode==='push'?'Use small forward taps with any finger.':'Align both hands, then use experimental finger bends.')}</output></div>
  <div className="air-desk-settings">
   <div className="air-choice" role="group" aria-label="Air keyboard actuation mode">
    <button type="button" className={mode==='push'?'active':''} onClick={()=>onMode('push')}><MousePointer2 size={13}/> TEN-FINGER TOUCH</button>
    <button type="button" className={mode==='tap'?'active':''} onClick={()=>onMode('tap')}><Hand size={13}/> BEND · EXPERIMENT</button>
   </div>
   <div className="air-choice air-sensitivity" role="group" aria-label="Finger touch sensitivity">
    {(['easy','balanced','precise'] as AirSensitivity[]).map(v=><button type="button" key={v}
      className={sensitivity===v?'active':''} onClick={()=>onSensitivity(v)}>{({easy:'LIGHT',balanced:'BALANCED',precise:'FIRM'})[v]}</button>)}
   </div>
   <label className="air-reach" title="Expand your hand movements across the virtual keyboard">
    RANGE <strong>{reach.toFixed(1)}×</strong>
    <input type="range" aria-label="Typing hand movement range" min=".8" max="2" step=".1" value={reach} onChange={e=>onReach(Number(e.target.value))}/>
   </label>
   {mode==='tap'&&<button type="button" className="air-calibrate" onClick={onCalibrate} title="Restart automatic hands-free calibration"><RotateCcw size={13}/> RESTART AUTO-ALIGN</button>}
  </div>
  <div className="air-desk-plane" ref={keysRef} data-sample-id={sampleId} aria-label="Virtual QWERTY keyboard and ten tracked fingertip pointers">
   {rows.map((row,i)=><div className={'air-desk-keyrow air-desk-keyrow-'+i} key={row}>
    {row.split('').map(v=>control(v,v))}
   </div>)}
   <div className="air-desk-keyrow air-desk-actions">
    {control('CLEAR','CLEAR','utility')}{control('BACK','⌫ BACK','utility')}{control('SPACE','SPACE','wide')}
    {control('ENTER','↵ ENTER','utility')}
   </div>
   {fingers.filter(f=>f.pending&&f.contact).map(f=><div key={f.id+'-contact'} className={'air-contact-dot '+(f.hand==='L'?'left':'right')+(f.pressed?' down':'')}
    data-contact-for={f.id} style={{left:(f.contact!.x*100)+'%',top:(f.contact!.y*100)+'%'}} aria-hidden="true"/>)}
   {fingers.map(f=><div className={'air-finger-dot '+(f.hand==='L'?'left':'right')+(f.armed?' armed':'')+(f.pressed?' down':'')}
    key={f.id} data-finger-id={f.id} data-sample-id={sampleId} style={{left:(f.x*100)+'%',top:(f.y*100)+'%'}} title={f.hand+' '+f.name+(f.key?' · '+f.key:'')}>
     <span>{f.hand+glyph(f.name)}</span>
   </div>)}
  </div>
  <div className="air-desk-footer">
   {mode==='tap'
    ?<span><Keyboard size={14}/> Automatic alignment begins when two steady hands are visible. Finger TAP is experimental; press/release may be inaccurate.</span>
    :<span><Keyboard size={14}/> All ten fingers work independently. A short forward tap presses the highlighted key; relaxing releases it.</span>}
   {mode==='tap'&&<span><RefreshCw size={13}/> If alignment drifts, use RESTART before positioning your hands</span>}
  </div>
  <p className="air-desk-disclaimer">A webcam estimates finger movements; this experimental mode cannot replicate the reliability of physical keyboard contact. Mouse and normal keyboard remain available.</p>
 </section>;
}

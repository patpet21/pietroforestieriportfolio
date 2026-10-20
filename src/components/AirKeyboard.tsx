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
};
const glyph=(name:string)=>name==='THUMB'?'T':name==='INDEX'?'I':name==='MIDDLE'?'M':name==='RING'?'R':'P';
export default function AirKeyboard({
 keysRef,fingers,hands,status,text,mode,sensitivity,reach,onMode,onSensitivity,onReach,onCalibrate,onClose,onKey,calibrationMessage
}:Props){
 const hover=new Set(fingers.filter(f=>f.key&&f.armed).map(f=>f.key));
 const pressed=new Set(fingers.filter(f=>f.key&&f.pressed).map(f=>f.key));
 const control=(value:string,text:string,extra='')=><button type="button" key={value}
  data-holo-key={value}
  className={(hover.has(value)?'air-key-hover ':'')+(pressed.has(value)?'air-key-pressed ':'')+extra}
  onClick={()=>onKey(value)}>{text}</button>;
 return <section className="holo-air-console holo-control air-desk" aria-label="Multi-finger air keyboard">
  <div className="air-desk-header">
   <div className="air-desk-brand"><ScanFace size={19}/><div><b>GESTUREOS / AIR TYPE</b><small>TEN FINGERS · ONE WEBCAM · EXPERIMENTAL</small></div></div>
   <button type="button" className="air-desk-close" aria-label="Close air keyboard" onClick={onClose}><X size={16}/> CLOSE</button>
  </div>
  <div className="air-desk-information">
   <div className="air-desk-status"><span className={'air-online '+(hands===2?'on':'')}/><span>{status}</span></div>
   <div className="air-desk-finger-legend"><span className="left">L · LEFT HAND</span><span className="right">R · RIGHT HAND</span></div>
  </div>
  <p className="air-calibration-note"><strong>{calibrationMessage||'FIRST: show both hands with relaxed fingers, then press ALIGN HANDS.'}</strong> Home keys: left A S D F · right J K L ; · thumbs SPACE.</p>
  <div className="air-desk-output"><small>LIVE TYPING · SELECTED FIELD / DEMO BUFFER</small><output aria-live="off">{text||'Move both hands in view. Aim a fingertip at a key and bend it to press.'}</output></div>
  <div className="air-desk-settings">
   <div className="air-choice" role="group" aria-label="Air keyboard actuation mode">
    <button type="button" className={mode==='tap'?'active':''} onClick={()=>onMode('tap')}><Hand size={13}/> FINGER TAP</button>
    <button type="button" className={mode==='pinch'?'active':''} onClick={()=>onMode('pinch')}><MousePointer2 size={13}/> PINCH FALLBACK</button>
   </div>
   <div className="air-choice air-sensitivity" role="group" aria-label="Finger tap sensitivity">
    {(['easy','balanced','precise'] as AirSensitivity[]).map(v=><button type="button" key={v}
      className={sensitivity===v?'active':''} onClick={()=>onSensitivity(v)}>{v.toUpperCase()}</button>)}
   </div>
   <label className="air-reach" title="Expand your hand movements across the virtual keyboard">
    RANGE <strong>{reach.toFixed(1)}×</strong>
    <input type="range" aria-label="Typing hand movement range" min=".8" max="2" step=".1" value={reach} onChange={e=>onReach(Number(e.target.value))}/>
   </label>
   <button type="button" className="air-calibrate" onClick={onCalibrate} title="Align tracked fingertips with the home row"><RotateCcw size={13}/> ALIGN HANDS</button>
  </div>
  <div className="air-desk-plane" ref={keysRef} aria-label="Virtual QWERTY keyboard and ten tracked fingertip pointers">
   {rows.map((row,i)=><div className={'air-desk-keyrow air-desk-keyrow-'+i} key={row}>
    {row.split('').map(v=>control(v,v))}
   </div>)}
   <div className="air-desk-keyrow air-desk-actions">
    {control('CLEAR','CLEAR','utility')}{control('BACK','⌫ BACK','utility')}{control('SPACE','SPACE','wide')}
    {control('ENTER','↵ ENTER','utility')}
   </div>
   {fingers.map(f=><div className={'air-finger-dot '+(f.hand==='L'?'left':'right')+(f.armed?' armed':'')+(f.pressed?' down':'')}
    key={f.id} style={{left:(f.x*100)+'%',top:(f.y*100)+'%'}} title={f.hand+' '+f.name+(f.key?' · '+f.key:'')}>
     <span>{f.hand}{glyph(f.name)}</span>
   </div>)}
  </div>
  <div className="air-desk-footer">
   {mode==='tap'
    ?<span><Keyboard size={14}/> ALIGN HANDS first. Straighten a finger, move it toward a nearby key, bend it once to press, then release.</span>
    :<span><Keyboard size={14}/> PINCH MODE: move your index finger over a key, touch thumb + index once, then release.</span>}
   <span><RefreshCw size={13}/> ALIGN again if the key positions drift</span>
  </div>
  <p className="air-desk-disclaimer">A webcam estimates finger movements; this experimental mode cannot replicate the reliability of physical keyboard contact. Mouse and normal keyboard remain available.</p>
 </section>;
}

import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowUpRight,Camera,Keyboard,MousePointer2,RotateCcw,Settings2,Hand,SlidersHorizontal} from 'lucide-react';
import {
 DEFAULT_GESTURE_SETTINGS,GESTURE_SETTINGS_EVENT,
 navigationTouchTravel,readGestureSettings,resetGestureSettings,saveGestureSettings
} from '../lib/gesture/userSettings';
import type {GestureSettings} from '../lib/gesture/userSettings';

/** One global camera and one keyboard: this page edits their actual settings.
 * No second webcam, MediaPipe tracker, or in-page QWERTY instance. */
export default function GestureLab(){
 const [settings,setSettings]=useState<GestureSettings>(readGestureSettings);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{
  const sync=()=>setSettings(readGestureSettings());
  window.addEventListener(GESTURE_SETTINGS_EVENT,sync);
  window.addEventListener('storage',sync);
  return()=>{window.removeEventListener(GESTURE_SETTINGS_EVENT,sync);window.removeEventListener('storage',sync);};
 },[]);
 const change=(patch:Partial<GestureSettings>)=>{
  setSettings(saveGestureSettings(patch));setSaved(true);
 };
 const reset=()=>{setSettings(resetGestureSettings());setSaved(true);};
 const touchButton=(label:string,sub:string,selected:boolean,onClick:()=>void)=>(
  <button type="button" key={label} className={'gsl-setting-choice'+(selected?' active':'')}
   aria-pressed={selected} onClick={onClick}><strong>{label}</strong><small>{sub}</small></button>
 );
 return <main className="gsl-page gsl-settings-page">
  <div className="wrap">
   <div className="gsl-back">
    <Link to="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</Link>
    <span>GESTUREOS / ONE SYSTEM</span>
   </div>
   <header className="gsl-settings-intro">
    <span className="gsl-settings-overline"><Settings2 size={15}/> SPATIAL CONTROL CENTER</span>
    <h1>GestureOS <em>Settings.</em></h1>
    <p>Configure the camera controls and the single floating air keyboard. Changes take effect in GestureOS immediately and stay saved in this browser.</p>
   </header>
   <div className="gsl-single-system">
    <div><Camera size={22}/><span><strong>ONE CAMERA</strong><small>Start, stop and preview tracking from SPATIAL CONTROL on the left. No second camera is needed.</small></span></div>
    <div><Keyboard size={22}/><span><strong>ONE KEYBOARD</strong><small>Use EXPERIMENTAL AIR KEYBOARD in the same left panel. There is no additional keyboard on this page.</small></span></div>
   </div>
   <section className="gsl-settings-grid" aria-label="GestureOS adjustable settings">
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><MousePointer2 size={21}/><div><small>01 / SITE NAVIGATION</small><h2>Click sensitivity</h2></div></div>
     <p>How far your index finger needs to move before a site click is confirmed. Choose FIRM to reduce accidental clicks.</p>
     <div className="gsl-setting-choices" role="group" aria-label="Navigation touch sensitivity">
      {touchButton('LIGHT','Less movement',settings.navigationTouch==='light',()=>change({navigationTouch:'light'}))}
      {touchButton('BALANCED','Default',settings.navigationTouch==='balanced',()=>change({navigationTouch:'balanced'}))}
      {touchButton('FIRM','Fewer false clicks',settings.navigationTouch==='firm',()=>change({navigationTouch:'firm'}))}
     </div>
     <div className="gsl-setting-current"><span>Navigation touch threshold</span><strong>{navigationTouchTravel(settings.navigationTouch).toFixed(3)}</strong></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><Hand size={21}/><div><small>02 / OPEN PALM</small><h2>Scroll response</h2></div></div>
     <p>Adjust how quickly an open palm scrolls the portfolio. This controls the same gesture engine used across every page.</p>
     <label className="gsl-setting-range" htmlFor="gesture-scroll-settings"><span>SCROLL SPEED</span><strong>{settings.scrollSpeed.toFixed(1)}×</strong></label>
     <input id="gesture-scroll-settings" aria-label="GestureOS scroll response" type="range" min=".7" max="4" step=".1"
      value={settings.scrollSpeed} onChange={e=>change({scrollSpeed:Number(e.target.value)})}/>
     <div className="gsl-setting-range-ends"><span>SLOWER</span><span>FASTER</span></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><Keyboard size={21}/><div><small>03 / AIR TYPE</small><h2>Keyboard touch</h2></div></div>
     <p>Control how intentional each finger movement must be before it can type. The floating keyboard stays available from the left panel.</p>
     <div className="gsl-setting-choices" role="group" aria-label="Air keyboard touch sensitivity">
      {touchButton('LIGHT','More responsive',settings.keyboardTouch==='easy',()=>change({keyboardTouch:'easy'}))}
      {touchButton('BALANCED','Medium',settings.keyboardTouch==='balanced',()=>change({keyboardTouch:'balanced'}))}
      {touchButton('FIRM','Less accidental typing',settings.keyboardTouch==='precise',()=>change({keyboardTouch:'precise'}))}
     </div>
     <div className="gsl-setting-current"><span>Two-frame contact confirmation</span><strong>ACTIVE</strong></div>
    </article>
    <article className="gsl-setting-card">
     <div className="gsl-setting-heading"><SlidersHorizontal size={21}/><div><small>04 / FINGERTIP MAPPING</small><h2>Keyboard range</h2></div></div>
     <p>Expand or narrow the fingertip movement mapped to the floating keyboard. Lower values make onscreen motion less sensitive.</p>
     <label className="gsl-setting-range" htmlFor="gesture-reach-settings"><span>MOVEMENT RANGE</span><strong>{settings.keyboardReach.toFixed(1)}×</strong></label>
     <input id="gesture-reach-settings" aria-label="GestureOS keyboard movement range" type="range" min=".8" max="2" step=".1"
      value={settings.keyboardReach} onChange={e=>change({keyboardReach:Number(e.target.value)})}/>
     <div className="gsl-setting-range-ends"><span>SMALLER</span><span>LARGER</span></div>
    </article>
   </section>
   <div className="gsl-settings-footer">
    <div><strong>{saved?'SETTINGS UPDATED':'LIVE SETTINGS'}</strong><span>Saved locally. The global GestureOS panel uses these values on this page and throughout the portfolio.</span></div>
    <button type="button" onClick={reset}><RotateCcw size={16}/> RESTORE DEFAULTS</button>
   </div>
   <div className="gsl-settings-help">
    <div><span>01</span><p><strong>Navigate</strong> — point your index and move forward deliberately to click. Open your palm to scroll.</p></div>
    <div><span>02</span><p><strong>Type</strong> — open the single floating keyboard from the left; each fingertip must settle before pressing.</p></div>
    <div><span>03</span><p><strong>Return to site</strong> — use ↗ SITE, hold two closed fists briefly, or press Esc. The camera remains on.</p></div>
   </div>
   <footer className="gsl-settings-bottom">
    <span><ArrowUpRight size={15}/> SPATIAL CONTROLS ARE EXPERIMENTAL · REAL CAMERA PERFORMANCE DEPENDS ON LIGHTING AND HARDWARE</span>
    <Link to="/">BACK TO PORTFOLIO <ArrowUpRight size={15}/></Link>
   </footer>
  </div>
 </main>;
}

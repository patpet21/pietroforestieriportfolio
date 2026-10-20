/** User-adjustable settings for the single global GestureOS camera/keyboard.
 * The page and overlay share this one source of truth. All browser storage is
 * optional: tracking remains usable if storage is disabled. */
export type NavigationTouch='light'|'balanced'|'firm';
export type KeyboardTouch='easy'|'balanced'|'precise';
export type GestureSettings={
 navigationTouch:NavigationTouch;
 keyboardTouch:KeyboardTouch;
 keyboardReach:number;
 scrollSpeed:number;
};
export const GESTURE_SETTINGS_EVENT='pf-gesture-settings-changed';
export const DEFAULT_GESTURE_SETTINGS:GestureSettings={
 navigationTouch:'balanced',keyboardTouch:'precise',keyboardReach:1.3,scrollSpeed:2
};
const STORAGE='pf-gestureos-settings-v1';
const range=(v:unknown,low:number,high:number,fallback:number)=>{
 const n=typeof v==='number'?v:Number(v);
 return Number.isFinite(n)?Math.max(low,Math.min(high,n)):fallback;
};
export function normalizeGestureSettings(value:Partial<GestureSettings>|null|undefined):GestureSettings{
 const v=value||{};
 return {
  navigationTouch:['light','balanced','firm'].includes(v.navigationTouch||'')?v.navigationTouch!:DEFAULT_GESTURE_SETTINGS.navigationTouch,
  keyboardTouch:['easy','balanced','precise'].includes(v.keyboardTouch||'')?v.keyboardTouch!:DEFAULT_GESTURE_SETTINGS.keyboardTouch,
  keyboardReach:range(v.keyboardReach,.8,2,DEFAULT_GESTURE_SETTINGS.keyboardReach),
  scrollSpeed:range(v.scrollSpeed,.7,4,DEFAULT_GESTURE_SETTINGS.scrollSpeed)
 };
}
export function readGestureSettings():GestureSettings{
 if(typeof window==='undefined')return {...DEFAULT_GESTURE_SETTINGS};
 try{return normalizeGestureSettings(JSON.parse(window.localStorage.getItem(STORAGE)||'null') as Partial<GestureSettings>);}
 catch{return {...DEFAULT_GESTURE_SETTINGS};}
}
export function saveGestureSettings(patch:Partial<GestureSettings>):GestureSettings{
 const current=readGestureSettings();
 const next=normalizeGestureSettings({...current,...patch});
 if(typeof window!=='undefined'){
  try{window.localStorage.setItem(STORAGE,JSON.stringify(next));}catch{/* private mode */}
  window.dispatchEvent(new CustomEvent<GestureSettings>(GESTURE_SETTINGS_EVENT,{detail:next}));
 }
 return next;
}
export function resetGestureSettings(){return saveGestureSettings(DEFAULT_GESTURE_SETTINGS);}
export const navigationTouchTravel=(touch:NavigationTouch)=>({light:.065,balanced:.09,firm:.13})[touch];

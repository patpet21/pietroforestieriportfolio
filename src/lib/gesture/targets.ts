const CLICKABLE='a[href],button,input,textarea,select,[role="button"],[data-holo-key]';
export function findGestureTarget(x:number,y:number):HTMLElement|null{
 const hit=document.elementFromPoint(x,y);
 const target=hit?.closest<HTMLElement>(CLICKABLE);
 if(!target||!target.isConnected||target.matches(':disabled')||target.closest('[inert],[aria-disabled="true"],[hidden]'))return null;
 if(target.closest('.holo-natural-control')&&!target.closest('[data-holo-test],[data-holo-ui]'))return null;
 if(target.closest('.holo-air-console'))return null;
 const rect=target.getBoundingClientRect();
 if(rect.width<4||rect.height<4)return null;
 return target;
}
/** Recheck at dispatch, including covers, disabled fieldsets and route changes. */
export function canActivateTarget(target:HTMLElement,x:number,y:number){
 return target.isConnected&&findGestureTarget(x,y)===target;
}

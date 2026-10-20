import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
let server,browser,page,origin;
before(async()=>{
 server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();
 origin=server.resolvedUrls.local[0];
 browser=await chromium.launch({headless:true});page=await browser.newPage();
});
after(async()=>{await browser?.close();await server?.close();});
test('real DOM hit-testing rejects covers, disabled ancestors, neighboring links and stale nodes',async()=>{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.holo-natural-control');
 const result=await page.evaluate(async()=>{
  const {findGestureTarget,canActivateTarget}=await import('/src/lib/gesture/targets.ts');
  const {PointerController}=await import('/src/lib/gesture/PointerController.ts');
  document.body.innerHTML=`<style>body{margin:0}button,a,input,fieldset{position:absolute;left:100px;top:100px;width:100px;height:50px;margin:0}#cover{position:absolute;left:100px;top:100px;width:100px;height:50px;z-index:10}</style><button id="button"><svg width="80" height="35"><path d="M0 0 L80 35"/></svg></button>`;
  const button=document.getElementById('button');let clicks=0;button.onclick=()=>clicks++;
  const nested=findGestureTarget(150,125)===button;
  const c=new PointerController();let now=100;
  const frame=ratio=>c.step({now:now+=50,tracking:true,ratio,pointing:ratio>1,mode:'navigation',target:findGestureTarget(150,125),point:{x:150,y:125}});
  frame(1.2);frame(1.2);frame(.4);const click=frame(.4);
  if(click.activation&&canActivateTarget(click.activation,150,125))click.activation.click();
  for(let i=0;i<5;i++){const r=frame(.4);if(r.activation)r.activation.click();}
  const cover=document.createElement('div');cover.id='cover';document.body.append(cover);
  const covered=!canActivateTarget(button,150,125);cover.remove();
  button.disabled=true;const disabled=!findGestureTarget(150,125);button.disabled=false;
  button.setAttribute('aria-disabled','true');const ariaDisabled=!findGestureTarget(150,125);button.removeAttribute('aria-disabled');
  const adjacent=!findGestureTarget(95,125);button.remove();const removed=!canActivateTarget(button,150,125);
  document.body.innerHTML='<fieldset disabled><input id="input"/></fieldset>';
  const fieldset=!findGestureTarget(150,125);
  document.body.innerHTML='<div inert><button>Inert</button></div>';
  const inert=!findGestureTarget(150,125);
  return {nested,clicks,covered,disabled,ariaDisabled,adjacent,removed,fieldset,inert};
 });
 assert.deepEqual(result,{nested:true,clicks:1,covered:true,disabled:true,ariaDisabled:true,adjacent:true,removed:true,fieldset:true,inert:true});
});
test('portfolio native navigation, fields and experimental entry remain usable',async()=>{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.holo-natural-control');
 assert.equal(await page.locator('.gesture-debug').count(),0);
 assert.equal(await page.locator('.holo-air-toggle').count(),0);
 await page.locator('header nav a[href="/contact"]').click();
 await page.waitForURL('**/contact');
 const field=page.locator('input[name="name"]').first();await field.fill('Manual input');assert.equal(await field.inputValue(),'Manual input');
 await page.goto(origin+'?gestureDebug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('.gesture-debug');
 assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);
});
test('gesture activation follows React Router links and focuses native inputs',async()=>{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('header nav');
 await page.evaluate(async()=>{
  const {findGestureTarget,canActivateTarget}=await import('/src/lib/gesture/targets.ts');
  const link=document.querySelector('header nav a[href="/contact"]');const r=link.getBoundingClientRect();
  const x=r.left+r.width/2,y=r.top+r.height/2,t=findGestureTarget(x,y);
  if(t&&canActivateTarget(t,x,y))t.click();else throw Error('No router link target');
 });
 await page.waitForURL('**/contact');
 await page.locator('input[name="name"]').waitFor({state:'visible'});
 const focused=await page.evaluate(async()=>{
  const {findGestureTarget}=await import('/src/lib/gesture/targets.ts');
  const input=document.querySelector('input[name="name"]');input.scrollIntoView({block:'center'});const r=input.getBoundingClientRect();
  const t=findGestureTarget(r.left+r.width/2,r.top+r.height/2);t?.focus();return document.activeElement===input;
 });assert.equal(focused,true);
});

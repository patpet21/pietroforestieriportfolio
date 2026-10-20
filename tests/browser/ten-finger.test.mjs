import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mockRemoteFonts} from './environment.mjs';
let server,browser,origin;
before(async()=>{server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();origin=server.resolvedUrls.local[0];browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();await server?.close();});
async function keyboard(){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await mockRemoteFonts(page);
 await page.route(/@mediapipe_tasks-vision/,route=>route.fulfill({contentType:'text/javascript',body:`
  export const FilesetResolver={forVisionTasks:async()=>({})};
  export const HandLandmarker={createFromOptions:async(_files,options)=>{
   window.__modelOptions=options;
   return {detectForVideo:()=>{window.__inferences=(window.__inferences||0)+1;
    return {landmarks:(window.__tracked||[]).map(h=>h.landmarks),
     handedness:(window.__tracked||[]).map(h=>[{categoryName:h.side==='L'?'Left':'Right',score:.99}])};},close:()=>{}};
  }};`}));
 await page.addInitScript(()=>{
  window.__tracked=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=640;
   const ctx=canvas.getContext('2d');let n=0;
   const timer=setInterval(()=>{ctx.fillStyle='rgb('+(n++%255)+',0,0)';ctx.fillRect(0,0,480,640);},30);
   const stream=canvas.captureStream(30);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));return stream;
  }});
 });
 await page.goto(origin+'gesture-lab?gestureDebug=1',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).click();await page.waitForSelector('.holo-natural-status');
 await page.locator('.gesture-debug summary').click();
 await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();await page.waitForSelector('.air-desk-plane');
 assert.equal(await page.evaluate(()=>window.__modelOptions.numHands),2);return page;
}
const pair=(l=false,r=false)=>[{side:'L',key:'F',tap:l},{side:'R',key:'J',tap:r}];
async function hands(page,poses,{reverse=false,frames=6}={}){
 await page.evaluate(async({poses,reverse})=>{
  const plane=document.querySelector('.air-desk-plane').getBoundingClientRect();
  const reach=Number(document.querySelector('.air-desk-plane').dataset.keyboardReach);
  const {makeHand,tapFinger}=await import('/tests/fixtures/hand.mjs');
  const tracked=poses.map(({side,key,finger=8,tap=false})=>{
   const target=document.querySelector('[data-holo-key="'+key+'"]').getBoundingClientRect();
   const nx=(target.left+target.width/2-plane.left)/plane.width,ny=(target.top+target.height/2-plane.top)/plane.height;
   const x=1-(.5+(nx-.5)/reach),y=.5+(ny-.5)/reach;
   const base=makeHand({x,y,palm:true}),dx=x-base[finger].x,dy=y-base[finger].y;
   const landmarks=base.map(p=>({...p,x:p.x+dx,y:p.y+dy}));
   return {side,landmarks:tap?tapFinger(landmarks,finger,.23):landmarks};
  });
  window.__tracked=reverse?tracked.reverse():tracked;window.__poseStart=window.__inferences||0;
 },{poses,reverse});
 await page.waitForFunction(frames=>window.__inferences-window.__poseStart>=frames,frames);
}
const output=page=>page.locator('.air-desk-output output').textContent();
const marker=(page,id)=>page.locator('.air-finger-dot[data-finger-id="'+id+'"]');

test('two hands show ten live fingertips, with skeleton/count/markers committed together and no progress ring',async()=>{
 const page=await keyboard();try{
  await hands(page,pair());assert.equal(await page.locator('.air-finger-dot').count(),10);
  const state=await page.evaluate(()=>{
   const plane=document.querySelector('.air-desk-plane'),overlay=document.querySelector('.holo-hand-overlay');
   return {sample:plane.dataset.sampleId,overlaySample:overlay.dataset.sampleId,hands:overlay.dataset.hands,
    fingers:[...plane.querySelectorAll('.air-finger-dot')].map(el=>({id:el.dataset.fingerId,sample:el.dataset.sampleId,ring:getComputedStyle(el,'::after').content,transition:getComputedStyle(el).transitionDuration}))};
  });
  assert.equal(state.overlaySample,state.sample);assert.equal(state.hands,'2');assert.equal(new Set(state.fingers.map(f=>f.id)).size,10);
  for(const f of state.fingers){assert.equal(f.sample,state.sample);assert.ok(['none','normal'].includes(f.ring));assert.equal(f.transition,'0s');}
  const before=await page.locator('.air-finger-dot').evaluateAll(els=>els.map(el=>[el.dataset.fingerId,el.style.left,el.style.top]));
  await hands(page,pair(),{reverse:true});
  assert.deepEqual(await page.locator('.air-finger-dot').evaluateAll(els=>els.map(el=>[el.dataset.fingerId,el.style.left,el.style.top])),before);
  await page.screenshot({path:'test-results/ten-finger-keyboard.png'});
 }finally{await page.close();}
});

test('all ten fingers can type with short local strokes; other fingers and palm remain unchanged',async()=>{
 const page=await keyboard();try{
  const tips=[4,8,12,16,20],keys='QWERTYUIOP';let text='';
  for(let i=0;i<10;i++){
   const side=i<5?'L':'R',finger=tips[i%5],key=keys[i];
   const poses=[{side,key,finger},{side:side==='L'?'R':'L',key:side==='L'?'J':'F'}];
   await hands(page,poses);await hands(page,[{...poses[0],tap:true},poses[1]],{reverse:i%2===0});
   text+=key;assert.equal(await output(page),text);
  }
 }finally{await page.close();}
});

test('simultaneous contacts insert both characters once, including a selected native textarea',async()=>{
 const page=await keyboard();try{
  await hands(page,pair());await hands(page,pair(true,true),{reverse:true});assert.equal(await output(page),'FJ');
  await hands(page,pair(true,true));assert.equal(await output(page),'FJ');
  await page.getByRole('button',{name:'Close air keyboard',exact:true}).click();
  await page.evaluate(()=>{
   const el=document.createElement('textarea');
   el.setAttribute('aria-label','Test native gesture field');
   el.id='native-gesture-field';
   Object.assign(el.style,{position:'fixed',top:'80px',left:'40%',width:'250px',height:'60px',zIndex:'9999'});
   document.body.append(el);window.__nativeInputs=[];
   el.addEventListener('input',()=>window.__nativeInputs.push(el.value));el.focus();
  });
  const field=page.getByRole('textbox',{name:'Test native gesture field',exact:true});
  await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
  await hands(page,pair());await hands(page,pair(true,true),{reverse:true});
  assert.equal(await field.inputValue(),'FJ');assert.deepEqual(await page.evaluate(()=>window.__nativeInputs),['F','FJ']);
 }finally{await page.close();}
});

test('one-hand loss removes five markers and the matching skeleton immediately, without replay on return',async()=>{
 const page=await keyboard();try{
  await hands(page,pair());await hands(page,pair(true,true));assert.equal(await output(page),'FJ');
  await hands(page,[pair(true,true)[1]]);assert.equal(await page.locator('.air-finger-dot').count(),5);
  assert.equal(await page.locator('.holo-hand-overlay').getAttribute('data-hands'),'1');assert.equal(await output(page),'FJ');
  await hands(page,pair(true,true),{reverse:true});assert.equal(await page.locator('.air-finger-dot').count(),10);assert.equal(await output(page),'FJ');
  await hands(page,pair(false,true));await hands(page,pair(true,true));assert.equal(await output(page),'FJF');
 }finally{await page.close();}
});

test('a fresh target uses a new small tap without an old-plane lock; local pipeline timings remain observable',async()=>{
 const page=await keyboard();try{
  await hands(page,pair());await hands(page,pair(true,false));assert.equal(await output(page),'F');
  const atG=[{side:'L',key:'G'},{side:'R',key:'J'}];await hands(page,atG);
  await hands(page,[{...atG[0],tap:true},atG[1]]);assert.equal(await output(page),'FG');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('.gesture-debug pre').textContent).timings.sampleToKeyboardCommitMs?.samples>5);
  const metrics=JSON.parse(await page.locator('.gesture-debug pre').textContent());
  assert.equal(metrics.queueDepth,0);assert.equal(metrics.keyboardPointers.length,10);
  for(const stage of ['inferenceMs','keyboardHitTestMs','keyboardOverlayMs','sampleToKeyboardActionMs','sampleToKeyboardCommitMs']){
   assert.ok(metrics.timings[stage].samples>0);assert.ok(Number.isFinite(metrics.timings[stage].p99));
  }
  console.log('Synthetic pipeline timings (not real-camera latency): '+JSON.stringify(metrics.timings));
 }finally{await page.close();}
});

import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mockRemoteFonts} from './environment.mjs';
let server,browser,origin;
before(async()=>{
 server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();origin=server.resolvedUrls.local[0];
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await server?.close();});
async function fixture({mobile=false,cpu=false,denied=false,path=''}={}){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
 await mockRemoteFonts(page);
 await page.route(/@mediapipe_tasks-vision/,route=>route.fulfill({contentType:'text/javascript',body:`
  export const FilesetResolver={forVisionTasks:async()=>({})};
  export const HandLandmarker={createFromOptions:async(_files,options)=>{
   if(${cpu}&&options.baseOptions.delegate==='GPU')throw Error('Synthetic GPU failure');
   return {detectForVideo:()=>{window.__inferences=(window.__inferences||0)+1;return {landmarks:window.__hands||[],handedness:[[{categoryName:'Right',score:.99}]]};},close:()=>window.__closed=(window.__closed||0)+1};
  }};` }));
 await page.addInitScript(({denied})=>{
  window.__hands=[];window.__streams=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   if(denied)throw new DOMException('Synthetic denied permission','NotAllowedError');
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=640;
   const ctx=canvas.getContext('2d');let n=0;
   const timer=setInterval(()=>{ctx.fillStyle=`rgb(${n++%255},0,0)`;ctx.fillRect(0,0,480,640);},30);
   const stream=canvas.captureStream(30);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));
   window.__streams.push(stream);return stream;
  }});
 },{denied});
 await page.goto(origin+path+'?gestureDebug=1',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).click();
 if(!denied){
  await page.waitForFunction(()=>document.querySelector('.holo-natural-status'));
  await page.locator('.gesture-debug summary').click();
  await page.evaluate(()=>{
   const b=document.createElement('button');b.id='fixture-target';b.textContent='Synthetic target';
   Object.assign(b.style,{position:'fixed',left:'45%',top:'40%',width:'10%',height:'10%',zIndex:10000});
   b.onclick=()=>{window.__clicks=(window.__clicks||0)+1;};document.body.append(b);
  });
 }
 return page;
}
async function pose(page,kind){
 await page.evaluate(async kind=>{
  const rect=document.getElementById('fixture-target').getBoundingClientRect();
  const x=.5-((rect.left+rect.width/2)/innerWidth-.5)/1.48;
  const y=.5+((rect.top+rect.height/2)/innerHeight-.5)/1.48;
  const {makeHand}=await import('/tests/fixtures/hand.mjs');
  const p=makeHand({x,y,scale:kind==='push'?1.08:1,pinch:kind==='pinch',palm:kind==='palm'});
  window.__hands=kind==='lost'?[]:[p];window.__poseStart=window.__inferences||0;
 },kind);
 await page.waitForFunction(()=>window.__inferences-window.__poseStart>=9);
}
test('integrated camera → relaxed pointing → forward touch clicks once, loses tracking safely, then stops/restarts',async()=>{
 const page=await fixture();
 try{
  await pose(page,'aim');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks||0),0);await pose(page,'push');
  assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'lost');await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'aim');await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),2);
  await pose(page,'palm');await pose(page,'aim');await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),3);
  await page.getByRole('button',{name:'STOP CAMERA',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.equal(await page.evaluate(()=>window.__closed),1);
  await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).click();await page.waitForSelector('.holo-natural-status');
  await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),3);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__closed),2);
 }finally{await page.close();}
});
test('mobile CPU fallback processes synthetic frames with compact preview and opt-in diagnostics',async()=>{
 const page=await fixture({mobile:true,cpu:true});
 try{
  await pose(page,'aim');await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),1);
  assert.equal(await page.locator('.holo-mobile-compact').count(),1);
  assert.equal(await page.locator('.holo-air-toggle').count(),0);
  await page.waitForFunction(()=>document.querySelector('.gesture-debug pre').textContent.includes('processedFps'));
  const metrics=JSON.parse(await page.locator('.gesture-debug pre').textContent());
  assert.equal(metrics.backend,'CPU');assert.ok(metrics.counters.clicks>=1);assert.ok(metrics.timings.inferenceMs.samples>0);
  await page.getByRole('button',{name:'Stop mobile camera'}).click();
  assert.equal(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
 }finally{await page.close();}
});
test('permission denial exposes retry and leaves camera stopped',async()=>{
 const page=await fixture({denied:true});
 try{
  await page.waitForSelector('[role="alert"]');assert.match(await page.locator('[role="alert"]').textContent(),/permission denied/i);
  assert.equal(await page.evaluate(()=>window.__streams.length),0);
  assert.equal(await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).count(),1);
 }finally{await page.close();}
});
test('a covered target, route transition and competing camera never replay a held push',async()=>{
 const page=await fixture();
 try{
  await pose(page,'aim');
  await page.evaluate(()=>{
   const cover=document.createElement('div');cover.id='fixture-cover';
   Object.assign(cover.style,{position:'fixed',left:'45%',top:'40%',width:'10%',height:'10%',zIndex:10001});document.body.append(cover);
  });
  await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks||0),0);
  await page.evaluate(()=>document.getElementById('fixture-cover').remove());await pose(page,'push');
  assert.equal(await page.evaluate(()=>window.__clicks||0),0);
  await pose(page,'aim');await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await page.locator('header nav a[href="/contact"]').click();await page.waitForURL('**/contact*');
  await pose(page,'push');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pf-lab-camera-start')));
  await page.waitForSelector('.holo-natural-start');
  assert.equal(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.equal(await page.evaluate(()=>window.__closed),1);
 }finally{await page.close();}
});
async function keyboardPose(page,key,closed=false,frames=7){
 await page.evaluate(async ({key,closed})=>{
  const plane=document.querySelector('.air-desk-plane').getBoundingClientRect();
  const byKey=k=>[...document.querySelectorAll('[data-holo-key]')].find(el=>el.dataset.holoKey===k).getBoundingClientRect();
  const location=k=>{
   const r=byKey(k);
   return {x:(r.left+r.width/2-plane.left)/plane.width,y:(r.top+r.height/2-plane.top)/plane.height};
  };
  const home=location('J'),target=location(key);
  const reach=Number(document.querySelector('.air-desk-plane').dataset.keyboardReach);
  const {makeHand,tapFinger}=await import('/tests/fixtures/hand.mjs');
  const base=makeHand({x:.25,palm:true});
  const width=Math.hypot(base[5].x-base[17].x,base[5].y-base[17].y);
  const p=base.map(v=>({...v}));
  p[8].x-=(target.x-home.x)*width/(.37*reach);
  p[8].y+=(target.y-home.y)*width/(.48*reach);
  window.__hands=[closed?tapFinger(p,8,.23):p];
  window.__poseStart=window.__inferences||0;
 },{key,closed});
 await page.waitForFunction(n=>window.__inferences-window.__poseStart>=n,frames);
 if(!closed)await page.waitForFunction(key=>document.querySelector(`[data-holo-key="${key}"]`)?.classList.contains('air-key-hover'),key,{timeout:5500});
}
test('floating Air Type: one hand auto-aligns then types CIAO, repeated letters, space and backspace',async()=>{
 const page=await fixture({path:'gesture-lab'});
 try{
  await page.evaluate(()=>document.getElementById('fixture-target').remove());
  await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
  await page.waitForSelector('.air-desk-plane');
  assert.equal(await page.locator('.air-calibrate').count(),0);
  await keyboardPose(page,'J',false,17);
  assert.equal(await page.locator('.air-desk-status').textContent().then(s=>s.includes('HOME-ALIGNED')),true);
  const press=async key=>{await keyboardPose(page,key);await keyboardPose(page,key,true);};
  await keyboardPose(page,'C');assert.equal(await page.locator('[data-holo-key="C"]').evaluate(el=>el.classList.contains('air-key-hover')),true);
  await keyboardPose(page,'C',true);assert.equal(await page.locator('.air-desk-output output').textContent(),'C');
  await keyboardPose(page,'C',true);assert.equal(await page.locator('.air-desk-output output').textContent(),'C');
  for(const key of ['I','A','O','O','BACK','SPACE'])await press(key);
  assert.equal(await page.locator('.air-desk-output output').textContent(),'CIAO ');
  await page.evaluate(()=>{window.__hands=[];window.__poseStart=window.__inferences;});
  await page.waitForFunction(()=>window.__inferences-window.__poseStart>=3);
  await keyboardPose(page,'Q',true);assert.equal(await page.locator('.air-desk-output output').textContent(),'CIAO ');
  await keyboardPose(page,'J',false,17); // regain a relaxed home reference after tracking loss
  await press('Q');assert.equal(await page.locator('.air-desk-output output').textContent(),'CIAO Q');
  await keyboardPose(page,'K');
  await page.locator('[data-holo-key="K"]').evaluate(el=>{el.disabled=true;});
  await keyboardPose(page,'K',true);assert.equal(await page.locator('.air-desk-output output').textContent(),'CIAO Q');
  await page.locator('[data-holo-key="K"]').evaluate(el=>{el.disabled=false;});
  await keyboardPose(page,'K',true);assert.equal(await page.locator('.air-desk-output output').textContent(),'CIAO Q');
  await page.getByRole('button',{name:'Close air keyboard',exact:true}).click();
  assert.equal(await page.locator('.air-desk-plane').count(),0);
  await page.evaluate(()=>{
   const field=document.createElement('textarea');
   field.setAttribute('aria-label','Test native gesture input');
   field.id='native-gesture-input';
   Object.assign(field.style,{position:'fixed',top:'95px',left:'42%',width:'240px',height:'55px',zIndex:'9999'});
   document.body.append(field);field.focus();
  });
  const field=page.getByRole('textbox',{name:'Test native gesture input',exact:true});
  await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
  await keyboardPose(page,'J',false,17);
  await press('K');assert.equal(await field.inputValue(),'K');
  assert.equal(await page.locator('.air-desk-output output').textContent(),'K');
 }finally{await page.close();}
});
test('GestureOS settings are shared with the one global camera and floating keyboard',async()=>{
 const page=await fixture({path:'gesture-lab'});
 try{
  await page.evaluate(()=>document.getElementById('fixture-target').remove());
  assert.equal(await page.locator('.gsl-keyboard-panel,.gsl-camera-panel,.gsl-camera-btn').count(),0);
  assert.equal(await page.locator('.gsl-settings-grid').count(),1);
  assert.equal(await page.locator('.gsl-experiments-grid').count(),1);
  const cube=page.locator('.gsl-3d-object');
  const originalRotation=await cube.getAttribute('style');
  await page.getByRole('button',{name:'Rotate cube right'}).click();
  assert.notEqual(await cube.getAttribute('style'),originalRotation);
  await page.locator('[data-task-id="A"]').click();
  await page.locator('[data-task-id="C"]').click();
  assert.equal(await page.locator('.gsl-wbs-wires line').count(),2);
  assert.equal(await page.locator('.holo-natural-control video').count(),1);
  assert.equal(await page.locator('.air-desk-plane').count(),0);
  assert.equal(await page.locator('.gsl-settings-page video').count(),0);
  assert.equal(await page.locator('.holo-air-toggle').count(),1);
  await page.getByRole('group',{name:'Navigation touch sensitivity'}).getByRole('button',{name:/FIRM/}).click();
  await page.getByRole('group',{name:'Air keyboard touch sensitivity'}).getByRole('button',{name:/FIRM/}).click();
  await page.locator('#gesture-scroll-settings').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'3.1');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('.holo-scroll-config input')?.value==='3.1');
  await page.locator('#gesture-reach-settings').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1.0');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('pf-gestureos-settings-v1')));
  assert.equal(settings.navigationTouch,'firm');assert.equal(settings.keyboardTouch,'precise');
  assert.equal(settings.scrollSpeed,3.1);assert.equal(settings.keyboardReach,1);
  await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
  assert.equal(await page.locator('.air-desk-plane').count(),1);
  assert.equal(await page.locator('.air-desk-plane').getAttribute('data-keyboard-reach'),'1');
  await page.getByRole('button',{name:'Close air keyboard',exact:true}).click();
  assert.equal(await page.locator('.air-desk-plane').count(),0);
  assert.equal(await page.locator('.holo-natural-status').count(),1);
  await page.getByRole('button',{name:'RESTORE DEFAULTS',exact:true}).click();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('pf-gestureos-settings-v1')));
  assert.equal(restored.navigationTouch,'balanced');
  assert.equal(restored.scrollSpeed,2);assert.equal(restored.keyboardReach,1);
 }finally{await page.close();}
});

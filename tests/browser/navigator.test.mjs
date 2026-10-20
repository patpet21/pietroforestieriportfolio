import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
let server,browser,origin;
before(async()=>{
 server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();origin=server.resolvedUrls.local[0];
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await server?.close();});
async function fixture({mobile=false,cpu=false,denied=false}={}){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
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
 await page.goto(origin+'?gestureDebug=1');
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
 await page.evaluate(kind=>{
  const rect=document.getElementById('fixture-target').getBoundingClientRect();
  const x=.5-((rect.left+rect.width/2)/innerWidth-.5)/1.48;
  const y=.5+((rect.top+rect.height/2)/innerHeight-.5)/1.48;
  const p=Array.from({length:21},()=>({x,y:y+.15,z:0}));
  p[0]={x,y:y+.28,z:0};
  for(const [i,mcp] of [5,9,13,17].entries()){
   const fx=x+(i-1.5)*.04;p[mcp]={x:fx,y:y+.15,z:0};p[mcp+1]={x:fx,y:y+.09,z:0};
   p[mcp+3]={x:fx,y:kind==='palm'||i===0||i===2?y:y+.16,z:0};
  }
  p[8]={x,y,z:0};p[4]=kind==='pinch'?{x:x+.02,y,z:0}:{x:x+.15,y:y+.12,z:0};
  window.__hands=kind==='lost'?[]:[p];window.__poseStart=window.__inferences||0;
 },kind);
 await page.waitForFunction(()=>window.__inferences-window.__poseStart>=6);
}
test('integrated camera → relaxed pointing → pinch clicks once, loses tracking safely, then stops/restarts',async()=>{
 const page=await fixture();
 try{
  await pose(page,'aim');await pose(page,'pinch');
  assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'lost');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await pose(page,'aim');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),2);
  await pose(page,'palm');await pose(page,'aim');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),3);
  await page.getByRole('button',{name:'STOP CAMERA',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.equal(await page.evaluate(()=>window.__closed),1);
  await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).click();await page.waitForSelector('.holo-natural-status');
  await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),3);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__closed),2);
 }finally{await page.close();}
});
test('mobile CPU fallback processes synthetic frames with compact preview and opt-in diagnostics',async()=>{
 const page=await fixture({mobile:true,cpu:true});
 try{
  await pose(page,'aim');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),1);
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
test('a covered target, route transition and competing camera never replay a held pinch',async()=>{
 const page=await fixture();
 try{
  await pose(page,'aim');
  await page.evaluate(()=>{
   const cover=document.createElement('div');cover.id='fixture-cover';
   Object.assign(cover.style,{position:'fixed',left:'45%',top:'40%',width:'10%',height:'10%',zIndex:10001});document.body.append(cover);
  });
  await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks||0),0);
  await page.evaluate(()=>document.getElementById('fixture-cover').remove());await pose(page,'pinch');
  assert.equal(await page.evaluate(()=>window.__clicks||0),0);
  await pose(page,'aim');await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await page.locator('header nav a[href="/contact"]').click();await page.waitForURL('**/contact*');
  await pose(page,'pinch');assert.equal(await page.evaluate(()=>window.__clicks),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pf-lab-camera-start')));
  await page.waitForSelector('.holo-natural-start');
  assert.equal(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.equal(await page.evaluate(()=>window.__closed),1);
 }finally{await page.close();}
});

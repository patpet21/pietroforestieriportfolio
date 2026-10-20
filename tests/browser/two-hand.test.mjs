import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mockRemoteFonts} from './environment.mjs';

// These integration tests exercise the real camera loop, engine, keyboard and
// text insertion with synthetic landmarks. They do not measure webcam accuracy.
let server,browser,origin;
before(async()=>{
 server=await createServer({server:{port:0,host:'127.0.0.1'}});
 await server.listen();origin=server.resolvedUrls.local[0];
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await server?.close();});

async function keyboard(){
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await mockRemoteFonts(page);
 await page.route(/@mediapipe_tasks-vision/,route=>route.fulfill({contentType:'text/javascript',body:`
  export const FilesetResolver={forVisionTasks:async()=>({})};
  export const HandLandmarker={createFromOptions:async(_files,options)=>{
   window.__modelOptions=options;
   return {detectForVideo:()=>{
    window.__inferences=(window.__inferences||0)+1;
    return {landmarks:(window.__tracked||[]).map(h=>h.landmarks),
     handedness:(window.__tracked||[]).map(h=>[{categoryName:h.handedness,score:.99}])};
   },close:()=>{}};
  }};` }));
 await page.addInitScript(()=>{
  window.__tracked=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=640;
   const ctx=canvas.getContext('2d');let n=0;
   const timer=setInterval(()=>{ctx.fillStyle=`rgb(${n++%255},0,0)`;ctx.fillRect(0,0,480,640);},30);
   const stream=canvas.captureStream(30);
   stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));
   return stream;
  }});
 });
 await page.goto(origin+'gesture-lab',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'ENABLE GESTURES',exact:true}).click();
 await page.waitForSelector('.holo-natural-status');
 await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
 await page.waitForSelector('.air-desk-plane');
 assert.equal(await page.evaluate(()=>window.__modelOptions.numHands),2);
 return page;
}

async function hands(page,poses,{reverse=false,frames=6,ready=[]}={}){
 await page.evaluate(async({poses,reverse})=>{
  const plane=document.querySelector('.air-desk-plane').getBoundingClientRect();
  const reach=Number(document.querySelector('[aria-label="Typing hand movement range"]').value);
  const {makeHand}=await import('/tests/fixtures/hand.mjs');
  const tracked=poses.map(({side,key,scale=1})=>{
   const target=document.querySelector(`[data-holo-key="${key}"]`).getBoundingClientRect();
   const nx=(target.left+target.width/2-plane.left)/plane.width;
   const ny=(target.top+target.height/2-plane.top)/plane.height;
   const x=1-(.5+(nx-.5)/reach),y=.5+(ny-.5)/reach;
   return {handedness:side==='L'?'Left':'Right',landmarks:makeHand({x,y,scale})};
  });
  window.__tracked=reverse?tracked.reverse():tracked;
  window.__poseStart=window.__inferences||0;
 },{poses,reverse});
 await page.waitForFunction(frames=>window.__inferences-window.__poseStart>=frames,frames);
 for(const key of ready)await page.waitForFunction(key=>document.querySelector(`[data-holo-key="${key}"]`)?.classList.contains('air-key-hover'),key,{timeout:5000});
}

const marker=(page,side)=>page.locator(`.air-finger-dot[data-finger-id="${side}-INDEX"]`);
const output=page=>page.locator('.air-desk-output output').textContent();
const pair=(leftScale=1,rightScale=1)=>[{side:'L',key:'F',scale:leftScale},{side:'R',key:'J',scale:rightScale}];

test('floating keyboard shows both index pointers and preserves their identity when detector order changes',async()=>{
 const page=await keyboard();
 try{
  await hands(page,pair(),{ready:['F','J']});
  assert.equal(await page.locator('.air-finger-dot').count(),2);
  assert.equal(await marker(page,'L').textContent(),'LI');
  assert.equal(await marker(page,'R').textContent(),'RI');
  const synchronization=await page.evaluate(()=>{
   const plane=document.querySelector('.air-desk-plane');
   const fingers=[...plane.querySelectorAll('.air-finger-dot')];
   return {sample:plane.dataset.sampleId,fingers:fingers.map(el=>({sample:el.dataset.sampleId,
    transition:getComputedStyle(el).transitionProperty,duration:getComputedStyle(el).transitionDuration}))};
  });
  assert.ok(synchronization.sample,'the keyboard carries the processed camera sample ID');
  for(const finger of synchronization.fingers){
   assert.equal(finger.sample,synchronization.sample,'both fingers are committed from the same camera sample');
   assert.ok(finger.duration.split(',').every(value=>parseFloat(value)===0)||
    finger.transition.split(',').every(value=>!['left','top','all'].includes(value.trim())),
    'camera positions are not delayed by CSS interpolation');
  }
  const before=await Promise.all(['L','R'].map(side=>marker(page,side).evaluate(el=>({left:el.style.left,top:el.style.top}))));
  await hands(page,pair(),{reverse:true,ready:['F','J']});
  const after=await Promise.all(['L','R'].map(side=>marker(page,side).evaluate(el=>({left:el.style.left,top:el.style.top}))));
  assert.deepEqual(after,before);
  await hands(page,pair(1.2,1),{reverse:true});
  assert.equal(await output(page),'F');
  assert.equal(await marker(page,'L').evaluate(el=>el.classList.contains('down')),true);
  assert.equal(await marker(page,'R').evaluate(el=>el.classList.contains('down')),false);
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJ');
  await hands(page,pair(1.2,1.2),{reverse:true});
  assert.equal(await output(page),'FJ');
 }finally{await page.close();}
});

test('two forward contacts in the same camera frame insert both keys once in stable hand order',async()=>{
 const page=await keyboard();
 try{
  await hands(page,pair(),{reverse:true,ready:['F','J']});
  await hands(page,pair(1.2,1.2),{reverse:true});
  assert.equal(await output(page),'FJ');
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJ');
  await hands(page,pair(),{ready:['F','J']});
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJFJ');
  await page.getByRole('button',{name:'Close air keyboard',exact:true}).click();
  const field=page.getByRole('textbox',{name:'Text composed on virtual keyboard',exact:true});
  await field.fill('');
  await field.evaluate(el=>{
   window.__nativeGestureInputs=[];
   el.addEventListener('input',()=>window.__nativeGestureInputs.push(el.value));
  });
  await page.getByRole('button',{name:'EXPERIMENTAL AIR KEYBOARD',exact:true}).click();
  await page.waitForSelector('.air-desk-plane');
  await hands(page,pair(),{reverse:true,ready:['F','J']});
  await hands(page,pair(1.2,1.2),{reverse:true});
  assert.equal(await field.inputValue(),'FJ');
  assert.equal(await output(page),'FJ');
  assert.deepEqual(await page.evaluate(()=>window.__nativeGestureInputs),['F','FJ']);
 }finally{await page.close();}
});

test('losing one hand removes only its pointer and does not replay the other contact or a returning held push',async()=>{
 const page=await keyboard();
 try{
  await hands(page,pair(),{ready:['F','J']});
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJ');
  await hands(page,[{side:'R',key:'J',scale:1.2}]);
  assert.equal(await page.locator('.air-finger-dot').count(),1);
  assert.equal(await marker(page,'L').count(),0);
  assert.equal(await marker(page,'R').textContent(),'RI');
  assert.equal(await output(page),'FJ');
  await hands(page,pair(1.2,1.2),{reverse:true});
  assert.equal(await page.locator('.air-finger-dot').count(),2);
  assert.equal(await output(page),'FJ');
  await hands(page,pair(1,1.2),{ready:['F']});
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJF');
  await hands(page,pair(1.2,1),{ready:['J']});
  await hands(page,pair(1.2,1.2));
  assert.equal(await output(page),'FJFJ');
 }finally{await page.close();}
});

test('a moving fingertip stays live during a forward stroke while its contact remains on the original key',async()=>{
 const page=await keyboard();
 try{
  await hands(page,pair(),{ready:['F','J']});
  const original=await marker(page,'L').evaluate(el=>el.style.left);
  await hands(page,pair(1.07,1),{frames:3});
  await page.waitForSelector('.air-contact-dot[data-contact-for="L-INDEX"]');
  const moved=[{side:'L',key:'G',scale:1.07},{side:'R',key:'J',scale:1}];
  await hands(page,moved,{frames:3});
  const positions=await page.evaluate(()=>{
   const plane=document.querySelector('.air-desk-plane').getBoundingClientRect();
   const key=document.querySelector('[data-holo-key="G"]').getBoundingClientRect();
   const finger=document.querySelector('.air-finger-dot[data-finger-id="L-INDEX"]');
   const contact=document.querySelector('.air-contact-dot[data-contact-for="L-INDEX"]');
   return {finger:parseFloat(finger.style.left),contact:parseFloat(contact.style.left),
    expected:(key.left+key.width/2-plane.left)/plane.width*100};
  });
  assert.ok(Math.abs(positions.finger-positions.expected)<.1,'finger follows the current camera coordinate');
  assert.ok(Math.abs(positions.contact-parseFloat(original))<.1,'contact stays on the aimed key');
  assert.ok(Math.abs(positions.finger-positions.contact)>1,'live tip and locked contact remain distinct');
  await hands(page,[{side:'L',key:'G',scale:1.2},{side:'R',key:'J',scale:1}],{frames:4});
  assert.equal(await output(page),'F');
 }finally{await page.close();}
});

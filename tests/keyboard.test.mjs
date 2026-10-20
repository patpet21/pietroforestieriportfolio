import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardPointer} from '../src/lib/gesture/KeyboardPointer.ts';
import {measureForwardDepth} from '../src/lib/gesture/forwardDepth.ts';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
import {makeHand} from './fixtures/hand.mjs';
const settings={reach:1,mode:'push',sensitivity:'easy'};
const locate=(x,y)=>y<.1||y>.9||x<.1||x>.9?null:x<.5?'A':'B';
const sample=(x=.65,scale=1)=>({landmarks:makeHand({x,y:.4,scale})});
const left=(scale=1,x=.7)=>({...sample(x,scale),handedness:{categoryName:'Left',score:.98}});
const right=(scale=1,x=.3)=>({...sample(x,scale),handedness:{categoryName:'Right',score:.98}});
test('floating forward-touch keyboard: aim, push, withdraw; no two-hand typing calibration',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=(scale=1)=>e.process([sample(.65,scale)],locate,now+=50,settings);
 for(let i=0;i<8;i++)frame();assert.equal(frame().fingers[0].armed,true);
 frame(1.2);assert.deepEqual(frame(1.2).presses.map(p=>p.key),['A']);
 for(let i=0;i<20;i++)assert.deepEqual(frame(1.2).presses,[]);
 frame();frame();frame(1.2);assert.deepEqual(frame(1.2).presses.map(p=>p.key),['A']);
 assert.equal(e.calibratedHands(),0);
});
test('whole-hand movement aims at a new key, then a forward push writes it',()=>{
 const e=new AirTypingEngine();let now=100;
 const at=(x,scale=1)=>e.process([sample(x,scale)],locate,now+=50,settings);
 for(let i=0;i<8;i++)at(.65);at(.65,1.2);assert.equal(at(.65,1.2).presses[0].key,'A');
 for(let i=0;i<12;i++)at(.4);at(.4,1.2);assert.equal(at(.4,1.2).presses[0].key,'B');
});
test('both hands have independent index pointers; hovering and thumb pinches cannot type',()=>{
 const e=new AirTypingEngine();let now=100;
 for(let i=0;i<20;i++){
  const f=e.process([{landmarks:makeHand({x:.7,pinch:i%2===0}),handedness:{categoryName:'Left',score:.98}},right()],locate,now+=50,settings);
  assert.deepEqual(f.fingers.map(f=>f.id),['L-INDEX','R-INDEX']);
  assert.equal(f.controls.length,2);assert.deepEqual(f.presses,[]);
 }
});

test('either hand can press while the other stays down, with independent planes and release latches',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=(l=1,r=.8,reverse=false)=>e.process(reverse?[right(r),left(l)]:[left(l),right(r)],locate,now+=50,settings);
 for(let i=0;i<8;i++)frame();
 frame(1.2);assert.deepEqual(frame(1.2).presses,[{key:'A',fingerId:'L-INDEX'}]);
 frame(1.2,.96,true);assert.deepEqual(frame(1.2,.96).presses,[{key:'B',fingerId:'R-INDEX'}]);
 for(let i=0;i<8;i++)assert.deepEqual(frame(1.2,.96,i%2===0).presses,[]);
 frame(1,.96);frame(1,.96);frame(1.2,.96);
 assert.deepEqual(frame(1.2,.96).presses,[{key:'A',fingerId:'L-INDEX'}]);
});

test('simultaneous forward contacts produce one event per hand in a stable order',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=(scale=1)=>e.process([right(scale),left(scale)],locate,now+=50,settings);
 for(let i=0;i<8;i++)frame();frame(1.2);
 assert.deepEqual(frame(1.2).presses,[{key:'A',fingerId:'L-INDEX'},{key:'B',fingerId:'R-INDEX'}]);
 assert.deepEqual(frame(1.2).presses,[]);
});

test('losing one hand clears only its contact; reacquisition cannot replay it',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=hands=>e.process(hands,locate,now+=50,settings);
 for(let i=0;i<8;i++)frame([left(),right()]);
 frame([left(1.07),right()]);
 assert.deepEqual(frame([right()]).fingers.map(f=>f.id),['R-INDEX']);
 frame([right(1.2)]);
 assert.deepEqual(frame([right(1.2)]).presses,[{key:'B',fingerId:'R-INDEX'}]);
 for(let i=0;i<9;i++)assert.deepEqual(frame([left(1.2),right(1.2)]).presses,[]);
 // The returning hand aligns independently; the held right hand cannot repeat.
 frame([left(),right(1.2)]);frame([left(),right(1.2)]);frame([left(1.2),right(1.2)]);
 assert.deepEqual(frame([left(1.2),right(1.2)]).presses,[{key:'A',fingerId:'L-INDEX'}]);
});

test('identities survive detection reordering and hand crossings without moving controllers to the other hand',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=(lx,rx,reverse=false)=>e.process(reverse?[right(1,rx),left(1,lx)]:[left(1,lx),right(1,rx)],locate,now+=50,settings);
 for(let i=0;i<8;i++)frame(.7,.3,i%2===0);
 for(const [lx,rx] of [[.64,.36],[.56,.44],[.48,.52],[.4,.6]]){
  const f=frame(lx,rx,true);
  assert.equal(f.fingers.find(f=>f.id==='L-INDEX').x,1-lx);
  assert.equal(f.fingers.find(f=>f.id==='R-INDEX').x,1-rx);
  assert.deepEqual(f.presses,[]);
 }
});

test('abruptly crossing unequal palm sizes cannot borrow the other hand\'s touch plane',()=>{
 const e=new AirTypingEngine();let now=100;
 // Scale each hand around its wrist so these are different neutral hand sizes,
 // with no forward gesture hidden in the fixture's index-anchored scaling.
 const at=(categoryName,wristX,size)=>{
  const points=makeHand({x:wristX+.015,y:.35});
  const wrist=points[0];
  const landmarks=points.map(p=>({x:wristX+(p.x-wrist.x)*size,y:wrist.y+(p.y-wrist.y)*size,z:p.z*size}));
  return {landmarks,handedness:{categoryName,score:.98}};
 };
 const frame=(lx,rx)=>e.process([at('Left',lx,1),at('Right',rx,.8)],locate,now+=50,settings);
 for(let i=0;i<8;i++)frame(.6,.5);
 assert.ok(frame(.6,.5).fingers.every(f=>f.armed));
 for(let i=0;i<12;i++)assert.deepEqual(frame(.5,.6).presses,[],'crossing alone must never be a depth press');
 const final=frame(.5,.6);
 assert.equal(final.fingers.find(f=>f.id==='L-INDEX').x,1-at('Left',.5,1).landmarks[8].x);
 assert.equal(final.fingers.find(f=>f.id==='R-INDEX').x,1-at('Right',.6,.8).landmarks[8].x);
});
test('lost tracking clears the old touch plane',()=>{
 const e=new AirTypingEngine();let now=100;
 const at=hands=>e.process(hands,locate,now+=50,settings);
 for(let i=0;i<8;i++)at([sample()]);at([]);at([sample(.65,1.2)]);assert.deepEqual(at([sample(.65,1.2)]).presses,[]);
});
test('approach locks the key, and blocked/moved geometry suppresses activation',()=>{
 const p=new KeyboardPointer();let now=100;
 const at=(x,scale,keys=locate)=>p.process({x,y:.5},measureForwardDepth(makeHand({scale})),now+=50,keys);
 for(let i=0;i<8;i++)at(.4,1);at(.8,1.06);at(.8,1.2);assert.equal(at(.8,1.2).activation,'A');
 p.reset();for(let i=0;i<8;i++)at(.4,1);at(.4,1.06);at(.4,1.2);assert.equal(at(.4,1.2,()=>null).activation,null);
});

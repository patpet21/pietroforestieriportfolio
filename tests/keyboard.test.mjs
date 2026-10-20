import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardPointer} from '../src/lib/gesture/KeyboardPointer.ts';
import {measureForwardDepth} from '../src/lib/gesture/forwardDepth.ts';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
import {makeHand} from './fixtures/hand.mjs';
const settings={reach:1,mode:'push',sensitivity:'easy'};
const locate=(x,y)=>y<.1||y>.9||x<.1||x>.9?null:x<.5?'A':'B';
const sample=(x=.65,scale=1)=>({landmarks:makeHand({x,y:.4,scale})});
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
test('pinching a thumb, hovering, and a second hand cannot type',()=>{
 const e=new AirTypingEngine();let now=100;
 for(let i=0;i<20;i++){
  const f=e.process([{landmarks:makeHand({pinch:i%2===0})},{landmarks:makeHand({x:.1,scale:1.3})}],locate,now+=50,settings);
  assert.equal(f.fingers.length,1);assert.deepEqual(f.presses,[]);
 }
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

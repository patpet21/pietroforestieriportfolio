import test from 'node:test';
import assert from 'node:assert/strict';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
import {measureFingerDepth} from '../src/lib/gesture/fingerDepth.ts';
import {makeHand,tapFinger} from './fixtures/hand.mjs';
const settings={reach:1,mode:'push',sensitivity:'easy'};
const tips=[4,8,12,16,20],names=['THUMB','INDEX','MIDDLE','RING','PINKY'];
const hand=(side='Left',points=makeHand({x:side==='Left'?.7:.25,palm:true}))=>({landmarks:points,handedness:{categoryName:side,score:.98}});
test('both hands immediately show ten current fingertips without calibration or settling',()=>{
 const e=new AirTypingEngine(),hands=[hand(),hand('Right')];
 const f=e.process(hands,()=> 'A',100,settings);
 assert.equal(f.fingers.length,10);assert.equal(f.controls.length,10);
 assert.deepEqual(f.fingers.map(f=>f.id),['L','R'].flatMap(s=>names.map(n=>s+'-'+n)));
 for(let h=0;h<2;h++)for(let i=0;i<5;i++){
  const finger=f.fingers[h*5+i],p=hands[h].landmarks[tips[i]];
  assert.ok(Math.abs(finger.x-(1-p.x))<1e-10);assert.equal(finger.y,p.y);assert.equal(finger.armed,true);
 }
 assert.deepEqual(f.presses,[]);assert.equal(f.calibrated,0);
});
for(let index=0;index<5;index++)test(`${names[index]} on either hand acts on the first small forward sample, independently`,()=>{
 for(const side of ['Left','Right']){
  const e=new AirTypingEngine(),base=hand(side),other=hand(side==='Left'?'Right':'Left');
  e.process([base,other],()=> 'A',100,settings);
  const pressed={...base,landmarks:tapFinger(base.landmarks,tips[index],.23)};
  const f=e.process([pressed,other],()=> 'A',116,settings);
  assert.deepEqual(f.presses,[{key:'A',fingerId:(side==='Left'?'L':'R')+'-'+names[index]}]);
  assert.equal(f.controls.find(c=>c.id===f.presses[0].fingerId).confirmationMs,0);
  assert.deepEqual(e.process([pressed,other],()=> 'A',132,settings).presses,[]);
  e.process([base,other],()=> 'A',148,settings);
  assert.equal(e.process([pressed,other],()=> 'A',164,settings).presses.length,1);
 }
});
test('simultaneous index and middle contacts do not block each other',()=>{
 const e=new AirTypingEngine(),left=hand(),right=hand('Right');
 e.process([left,right],()=> 'A',100,settings);
 left.landmarks=tapFinger(tapFinger(left.landmarks,8,.23),12,.23);
 right.landmarks=tapFinger(right.landmarks,4,.23);
 assert.deepEqual(e.process([right,left],()=> 'A',140,settings).presses.map(p=>p.fingerId),['L-INDEX','L-MIDDLE','R-THUMB']);
});
test('whole-hand translation, scaling, wrist-Z offset and rigid palm tilt cannot press ten keys',()=>{
 const e=new AirTypingEngine(),base=makeHand({x:.5,palm:true});let now=100;
 e.process([hand('Left',base)],()=> 'A',now,settings);
 for(const amount of [.01,.02,.03,.02,0]){
  const points=base.map(p=>({x:(p.x-.5)*1.02+.5+amount,y:p.y*1.02,z:p.z*1.02+.2+amount*p.x}));
  assert.deepEqual(e.process([hand('Left',points)],()=> 'A',now+=40,settings).presses,[]);
 }
 const angle=.3;
 const a=measureFingerDepth(base,8),b=measureFingerDepth(base.map(p=>({x:p.x*Math.cos(angle)+p.z*Math.sin(angle),y:p.y,z:-p.x*Math.sin(angle)+p.z*Math.cos(angle)})),8);
 assert.ok(Math.abs(a.fingerDepth-b.fingerDepth)<1e-10);
});
test('isolated tip noise and a thumb/index pinch cannot masquerade as a coherent forward touch',()=>{
 const e=new AirTypingEngine(),base=hand();e.process([base],()=> 'A',100,settings);
 const bad=base.landmarks.map(p=>({...p}));bad[8].z-=.02;
 assert.deepEqual(e.process([hand('Left',bad)],()=> 'A',140,settings).presses,[]);
 const pinch=makeHand({x:.7,palm:true,pinch:true});
 assert.deepEqual(e.process([hand('Left',pinch)],()=> 'A',180,settings).presses,[]);
});
test('one missing hand removes its five markers; other held fingers keep their own state',()=>{
 const e=new AirTypingEngine(),l=hand(),r=hand('Right');let now=100;
 const at=hands=>e.process(hands,()=> 'A',now+=40,settings);
 at([l,r]);const down={...r,landmarks:tapFinger(r.landmarks,12,.23)};
 assert.equal(at([l,down]).presses[0].fingerId,'R-MIDDLE');
 assert.equal(at([down]).fingers.length,5);assert.deepEqual(at([down]).presses,[]);
 const returning={...l,landmarks:tapFinger(l.landmarks,8,.23)};
 assert.deepEqual(at([returning,down]).presses,[]);
 at([l,down]);assert.equal(at([returning,down]).presses[0].fingerId,'L-INDEX');
});
test('holding and moving to a different key does not stick or type until a new small stroke',()=>{
 const e=new AirTypingEngine(),base=hand();let now=100;
 const at=(h,key)=>e.process([h],()=>key,now+=40,settings);
 at(base,'A');const down={...base,landmarks:tapFinger(base.landmarks,8,.23)};
 assert.equal(at(down,'A').presses[0].key,'A');assert.deepEqual(at(down,'B').presses,[]);
 assert.deepEqual(at(down,'B').presses,[]);at(base,'B');assert.equal(at(down,'B').presses[0].key,'B');
});
test('loss, long gaps and disabled geometry cannot replay a contact',()=>{
 const e=new AirTypingEngine(),base=hand(),down={...hand(),landmarks:tapFinger(hand().landmarks,8,.23)};
 e.process([base],()=> 'A',100,settings);e.process([],()=> 'A',140,settings);
 assert.deepEqual(e.process([down],()=> 'A',180,settings).presses,[]);
 assert.deepEqual(e.process([down],()=> 'A',900,settings).presses,[]);
 e.process([base],()=> 'A',940,settings);assert.deepEqual(e.process([down],()=>null,980,settings).presses,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
import {measureFingerDepth} from '../src/lib/gesture/fingerDepth.ts';
import {makeHand,tapFinger} from './fixtures/hand.mjs';
const settings={reach:1,mode:'push',sensitivity:'easy'};
const tips=[4,8,12,16,20],names=['THUMB','INDEX','MIDDLE','RING','PINKY'];
const hand=(side='Left',points=makeHand({x:side==='Left'?.7:.25,palm:true}))=>({landmarks:points,handedness:{categoryName:side,score:.98}});
function fixture(hands=[hand(),hand('Right')]){
 const engine=new AirTypingEngine();let now=0;
 const at=(current=hands,key='A')=>engine.process(current,()=>key,now+=40,settings);
 const settle=(current=hands,key='A')=>{let result;for(let i=0;i<7;i++)result=at(current,key);return result;};
 const press=(current=hands,key='A')=>{const start=at(current,key),commit=at(current,key);assert.deepEqual(start.presses,[]);return commit;};
 return {engine,at,settle,press,hands};
}
test('both hands show ten stable pointers, but do not arm immediately upon detection',()=>{
 const f=fixture(),first=f.at();
 assert.equal(first.fingers.length,10);assert.equal(first.controls.length,10);
 assert.deepEqual(first.fingers.map(p=>p.id),['L','R'].flatMap(s=>names.map(n=>s+'-'+n)));
 assert.deepEqual(first.presses,[]);assert.ok(first.fingers.every(p=>!p.armed));
 const ready=f.settle();
 assert.ok(ready.fingers.every(p=>p.armed));
 for(let h=0;h<2;h++)for(let i=0;i<5;i++){
  const finger=ready.fingers[h*5+i],p=f.hands[h].landmarks[tips[i]];
  assert.ok(Math.abs(finger.x-(1-p.x))<1e-10);assert.equal(finger.y,p.y);
 }
});
for(let i=0;i<5;i++)test(`${names[i]} on either hand types once per coherent two-frame stroke`,()=>{
 for(const side of ['Left','Right']){
  const f=fixture(),base=side==='Left'?f.hands[0]:f.hands[1];
  f.settle();
  const changed={...base,landmarks:tapFinger(base.landmarks,tips[i],.23)};
  const frame=f.press(f.hands.map(h=>h===base?changed:h));
  assert.deepEqual(frame.presses,[{key:'A',fingerId:(side==='Left'?'L':'R')+'-'+names[i]}]);
  for(let k=0;k<8;k++)assert.deepEqual(f.at(f.hands.map(h=>h===base?changed:h)).presses,[]);
  f.at();f.settle();
  assert.equal(f.press(f.hands.map(h=>h===base?changed:h)).presses.length,1);
 }
});
test('two fingers per hand can intentionally commit together without a global throttle',()=>{
 const f=fixture();f.settle();
 const l=f.hands[0],r=f.hands[1];
 const changedL={...l,landmarks:tapFinger(tapFinger(l.landmarks,8,.23),12,.23)};
 const changedR={...r,landmarks:tapFinger(r.landmarks,4,.23)};
 const committed=f.press([changedR,changedL]);
 assert.deepEqual(committed.presses.map(p=>p.fingerId),['L-INDEX','L-MIDDLE','R-THUMB']);
});
test('rigid translation, palm scaling, wrist offset and rotation do not fire keys',()=>{
 const f=fixture(),base=makeHand({x:.5,palm:true});
 f.settle([hand('Left',base)]);
 for(const amount of [.01,.02,.03,.02,0]){
  const changed=base.map(p=>({x:(p.x-.5)*1.02+.5+amount,y:p.y*1.02,z:p.z*1.02+.2+amount*p.x}));
  assert.deepEqual(f.at([hand('Left',changed)]).presses,[]);
 }
 const angle=.3;
 const a=measureFingerDepth(base,8),b=measureFingerDepth(base.map(p=>({x:p.x*Math.cos(angle)+p.z*Math.sin(angle),y:p.y,z:-p.x*Math.sin(angle)+p.z*Math.cos(angle)})),8);
 assert.ok(Math.abs(a.fingerDepth-b.fingerDepth)<1e-10);
});
test('a single depth spike, unsupported pinch and unresolved noise do not type',()=>{
 const f=fixture(),base=f.hands[0];f.settle();
 const spiked=base.landmarks.map(p=>({...p}));spiked[8].z-=.02;
 assert.deepEqual(f.at([{...base,landmarks:spiked},f.hands[1]]).presses,[]);
 assert.deepEqual(f.at().presses,[]);
 const pinch=hand('Left',makeHand({x:.7,palm:true,pinch:true}));
 assert.deepEqual(f.at([pinch,f.hands[1]]).presses,[]);
});
test('losing one hand removes five pointers, without replaying a held or returning finger',()=>{
 const f=fixture(),l=f.hands[0],r=f.hands[1];f.settle();
 const down={...r,landmarks:tapFinger(r.landmarks,12,.23)};
 assert.equal(f.press([l,down]).presses[0].fingerId,'R-MIDDLE');
 assert.equal(f.at([down]).fingers.length,5);
 for(let i=0;i<3;i++)assert.deepEqual(f.at([down]).presses,[]);
 const returnDown={...l,landmarks:tapFinger(l.landmarks,8,.23)};
 assert.deepEqual(f.at([returnDown,down]).presses,[]);
 f.settle([l,down]);assert.equal(f.press([returnDown,down]).presses[0].fingerId,'L-INDEX');
});
test('moving to another key while held does not type there until retreat and a fresh stroke',()=>{
 const f=fixture(),base=f.hands[0];f.settle();
 const down={...base,landmarks:tapFinger(base.landmarks,8,.23)};
 assert.equal(f.press([down,f.hands[1]],'A').presses[0].key,'A');
 assert.deepEqual(f.at([down,f.hands[1]],'B').presses,[]);
 for(let i=0;i<8;i++)assert.deepEqual(f.at([down,f.hands[1]],'B').presses,[]);
 f.settle(f.hands,'B');
 assert.equal(f.press([down,f.hands[1]],'B').presses[0].key,'B');
});
test('tracking loss, large cadence gaps and disabled keys never replay contact',()=>{
 const f=fixture(),base=f.hands[0],down={...base,landmarks:tapFinger(base.landmarks,8,.23)};
 f.settle();f.at([]);assert.deepEqual(f.at([down]).presses,[]);
 for(let i=0;i<8;i++)f.at();
 assert.deepEqual(f.at([down],'').presses,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardPointer} from '../src/lib/gesture/KeyboardPointer.ts';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
const settings={reach:1,mode:'pinch',sensitivity:'easy'};
function hand(x=.5,y=.5,closed=false){
 const p=Array.from({length:21},()=>({x,y:y+.1,z:0}));
 p[0]={x,y:y+.25,z:0};p[5]={x:x-.06,y:y+.1,z:0};p[17]={x:x+.06,y:y+.1,z:0};
 p[8]={x,y,z:0};p[4]={x:x+(closed?.02:.2),y,z:0};
 return {landmarks:p};
}
const locate=(x,y)=>y<.1||y>.9||x<.1||x>.9?null:x<.5?'A':'B';
test('floating keyboard: highlighted index types without two-hand calibration, hold does not repeat',()=>{
 const e=new AirTypingEngine();let now=100;
 const frame=(closed=false)=>e.process([hand(.65,.5,closed)],locate,now+=50,settings);
 frame();const aimed=frame();assert.equal(aimed.fingers.length,1);assert.equal(aimed.fingers[0].key,'A');assert.equal(aimed.fingers[0].armed,true);
 frame(true);assert.deepEqual(frame(true).presses.map(p=>p.key),['A']);
 for(let i=0;i<20;i++)assert.deepEqual(frame(true).presses,[]);
 frame();frame();frame(true);assert.deepEqual(frame(true).presses.map(p=>p.key),['A']);
 assert.equal(e.calibratedHands(),0);
});
test('moving the whole hand moves the pointer to another key',()=>{
 const e=new AirTypingEngine();let now=100;
 const at=(x,closed=false)=>e.process([hand(x,.5,closed)],locate,now+=50,settings);
 at(.65);at(.65);at(.65,true);assert.equal(at(.65,true).presses[0].key,'A');
 for(let i=0;i<8;i++)at(.4);at(.4,true);assert.equal(at(.4,true).presses[0].key,'B');
});
test('one hand and a moving second hand cannot produce a second key stream',()=>{
 const e=new AirTypingEngine();let now=100;
 for(let i=0;i<8;i++)e.process([hand(.65),hand(.2)],locate,now+=50,settings);
 const frame=e.process([hand(.65),hand(.2,true)],locate,now+=50,settings);
 assert.equal(frame.fingers.length,1);assert.deepEqual(frame.presses,[]);
});
test('loss/reset with closed fingers never replays the highlighted key',()=>{
 const e=new AirTypingEngine();let now=100;
 const at=(hands)=>e.process(hands,locate,now+=50,settings);
 at([hand()]);at([hand()]);at([]);at([hand(.5,.5,true)]);assert.deepEqual(at([hand(.5,.5,true)]).presses,[]);
 at([hand()]);at([hand()]);e.reset();at([hand(.5,.5,true)]);assert.deepEqual(at([hand(.5,.5,true)]).presses,[]);
});
test('pinch freezes the last open aim even if closure moves the fingertip across a key boundary',()=>{
 const p=new KeyboardPointer();let now=100;
 const frame=(x,ratio)=>p.process({x,y:.5},ratio,now+=50,locate);
 frame(.4,1.2);frame(.4,1.2);frame(.8,.3);const pressed=frame(.8,.3);
 assert.equal(pressed.activation,'A');assert.ok(pressed.point.x<.5);
});
test('leaving a key and geometry changes cannot activate an old highlight',()=>{
 const p=new KeyboardPointer();let now=100;
 const at=(x,ratio,keyAt=locate)=>p.process({x,y:.5},ratio,now+=50,keyAt);
 at(.4,1.2);at(.4,1.2);for(let i=0;i<8;i++)at(0,1.2);
 at(0,.3);assert.equal(at(0,.3).activation,null);
 p.reset();at(.4,1.2);at(.4,1.2);at(.4,.3);
 assert.equal(at(.4,.3,()=>null).activation,null);
});

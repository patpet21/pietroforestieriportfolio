import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardPointer} from '../src/lib/gesture/KeyboardPointer.ts';
const depth=(finger=0,joint=finger*.6)=>({
 scale:1,fingerDepth:finger,jointDepth:joint,shape:[],indexExtended:true
});
const keys=(x)=>x<.5?'A':'B';
function run(){
 const pointer=new KeyboardPointer(.12);let time=0;
 const at=(x=.43,finger=0,lookup=keys)=>{
  time+=40;
  return pointer.process({x,y:.4},depth(finger),time,lookup);
 };
 const aim=(x=.43)=>{let p;for(let i=0;i<7;i++)p=at(x);return p;};
 return {pointer,at,aim};
}
test('a shallow edge tremor does not change the selected key',()=>{
 const f=run();assert.equal(f.aim(.48).key,'A');
 for(let i=0;i<5;i++){
  const p=f.at(.503);
  assert.equal(p.key,'A');
  assert.equal(p.activation,null);
 }
});
test('A remains selected when the fingertip drifts over B during the forward stroke',()=>{
 const f=run();assert.equal(f.aim().armed,true);
 const candidate=f.at(.51,.19);assert.equal(candidate.activation,null);
 const confirmed=f.at(.51,.19);
 assert.equal(confirmed.activation,'A');
 assert.equal(confirmed.key,'A');
 for(let i=0;i<5;i++)assert.equal(f.at(.51,.19).activation,null);
});
test('large intentional movement to B requires a fresh settled aim',()=>{
 const f=run();f.aim();let p;
 for(let i=0;i<8;i++)p=f.at(.69);
 assert.equal(p.key,'B');
 assert.equal(p.armed,true);
 assert.equal(f.at(.69,.19).activation,null);
 assert.equal(f.at(.69,.19).activation,'B');
});
test('a large sideways movement while pushing is cancelled, never guessed',()=>{
 const f=run();f.aim();
 assert.equal(f.at(.70,.19).activation,null);
 assert.equal(f.at(.70,.19).activation,null);
 assert.equal(f.at(.70,.19).activation,null);
});
test('removing a selected/disabled key prevents typing the old letter',()=>{
 const f=run();f.aim();
 const disabled=()=>null;
 assert.equal(f.at(.43,.19,disabled).activation,null);
 assert.equal(f.at(.43,.19,disabled).activation,null);
});
test('depth noise, missing tracking and late samples do not type characters',()=>{
 const f=run();f.aim();
 assert.equal(f.at(.43,.08).activation,null);
 assert.equal(f.at(.43,.08).activation,null);
 assert.equal(f.at(.43,0).activation,null);
 f.pointer.reset();
 assert.equal(f.at(.43,.19).activation,null);
});

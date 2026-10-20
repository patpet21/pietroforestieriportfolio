import test from 'node:test';
import assert from 'node:assert/strict';
import {getHand} from '../src/lib/gesture/pose.ts';
import {FrameBudget,GestureDiagnostics} from '../src/lib/gesture/diagnostics.ts';
import {AirTypingEngine} from '../src/lib/AirTypingEngine.ts';
import {newPalmScroll,palmScrollDelta} from '../src/lib/gesture/palmScroll.ts';
import {readFileSync} from 'node:fs';

function hand(extended){
 const p=Array.from({length:21},()=>({x:.5,y:.7,z:0}));p[0]={x:.5,y:.95,z:0};
 for(const [i,mcp] of [5,9,13,17].entries()){
  p[mcp]={x:.35+i*.1,y:.7,z:0};p[mcp+1]={x:p[mcp].x,y:.58,z:0};
  p[mcp+3]={x:p[mcp].x,y:extended.includes(i)? .25:.68,z:0};
 }
 return p;
}
test('index with relaxed ring finger aims; open palm and V retain priority',()=>{
 assert.equal(getHand(hand([0,2])).pointing,true);
 assert.equal(getHand(hand([0,1,2,3])).open,true);
 assert.equal(getHand(hand([0,1,2,3])).pointing,false);
 assert.equal(getHand(hand([0,1])).spread,true);
 assert.equal(getHand(hand([0,1])).pointing,false);
 assert.equal(getHand([]),null);const bad=hand([0]);bad[8].x=NaN;assert.equal(getHand(bad),null);
});
test('scheduler responds to measured work and recovers without a frame queue',()=>{
 const fast=new FrameBudget();fast.observe(8);assert.ok(fast.interval>=1000/24&&fast.interval<67);
 fast.observe(100);assert.ok(fast.interval>1000/24);
 for(let i=0;i<50;i++)fast.observe(8);assert.equal(fast.interval,1000/24);
 fast.observe(10000);assert.equal(fast.interval,250);
});
test('diagnostics disabled by default and bounded to 240 observations',()=>{
 const d=new GestureDiagnostics();d.record('inference',123);d.count('click');assert.deepEqual(d.snapshot().timings,{});
 d.enabled=true;for(let i=0;i<500;i++)d.record('inference',i);
 assert.equal(d.snapshot().timings.inference.samples,240);assert.equal(d.snapshot().timings.inference.p95,487);
});
test('experimental typing cannot emit characters before calibration',()=>{
 const engine=new AirTypingEngine();
 for(let now=100;now<2000;now+=50)assert.deepEqual(engine.process([{landmarks:hand([0,1,2,3])}],()=> 'A',now,{reach:1,mode:'tap',sensitivity:'easy'}).presses,[]);
});
test('20 palm traces match recorded baseline scroll, reversals, speeds and jump guards',()=>{
 const {rows}=JSON.parse(readFileSync(new URL('./fixtures/palm-baseline.json',import.meta.url)));
 for(const expected of rows){
  const {dt,speed,height}=expected,scroll=newPalmScroll();let sum=0,count=0,positive=0,negative=0;
  const ys=Array.from({length:24},(_,j)=>j<12?.6-j*.008:.512+(j-12)*.012);ys.push(.9,.9,.91);
  for(let j=0;j<ys.length;j++){
   const amount=palmScrollDelta(scroll,ys[j],100+j*dt,height,speed);
   if(amount){sum+=amount;count++;if(amount>0)positive++;else negative++;}
  }
  assert.deepEqual({dt,speed,height,sum:Number(sum.toFixed(6)),count,positive,negative},expected);
  assert.equal(palmScrollDelta(scroll,.5,99999,height,speed),0,'long tracking gap cannot scroll');
  assert.equal(palmScrollDelta(newPalmScroll(),.3,100,height,speed),0,'new palm starts at rest');
 }
});

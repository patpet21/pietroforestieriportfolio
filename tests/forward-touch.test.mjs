import test from 'node:test';
import assert from 'node:assert/strict';
import {ForwardPushController} from '../src/lib/gesture/ForwardPushController.ts';
const target={id:'button'};
const depth=(fingerDepth=0,jointDepth=fingerDepth*.6,scale=1)=>({scale,fingerDepth,jointDepth,shape:[1,1,1,1],indexExtended:true});
const setup=()=>{
 const c=new ForwardPushController();let now=100;
 const at=(d=depth(),extra={})=>{now=extra.now??now+40;return c.step({now,tracking:true,depth:d,pointing:true,mode:'navigation',target,point:{x:.4,y:.5},...extra});};
 return {c,at};
};
test('one neutral observation then a small coherent stroke acts immediately, without a dwell or ring',()=>{
 const {at}=setup();assert.equal(at().phase,'ARMED');
 const f=at(depth(.06));assert.equal(f.activation,target);assert.equal(f.confirmationMs,0);
});
test('a held contact never repeats; a small return releases and the next short stroke types',()=>{
 const {at}=setup();at();at(depth(.06));
 for(let i=0;i<20;i++)assert.equal(at(depth(.06)).activation,null);
 assert.equal(at().phase,'RELEASED');assert.equal(at(depth(.06)).activation,target);
});
test('a slight whole-hand approach is enough for a navigation click',()=>{
 const {at}=setup();at();assert.equal(at(depth(0,0,1.02)).activation,target);
});
test('hover, low amplitude jitter and slow drift do not click',()=>{
 const {at}=setup();at();
 for(let i=0;i<80;i++)assert.equal(at(depth(i*.0005+(i%2)*.002)).activation,null);
});
test('a lone fingertip depth spike without joint movement is rejected',()=>{
 const {at}=setup();at();assert.equal(at(depth(.08,0)).reason,'incoherent-tip');
});
test('latest key and live position are used at contact, without an early locked plane',()=>{
 const {at}=setup(),other={id:'next'};at();
 const f=at(depth(.06),{target:other,point:{x:.6,y:.5}});
 assert.equal(f.activation,other);assert.deepEqual(f.point,{x:.6,y:.5});
});
test('moving away while held releases immediately rather than asking to withdraw to a stale surface',()=>{
 const {at}=setup();at();at(depth(.06));
 const other={id:'other'};assert.equal(at(depth(.06),{target:other}).pending,false);
 assert.equal(at(depth(.06),{target:other}).activation,null);
});
for(const mode of ['scroll','zoom','keyboard'])test(`${mode} invalidates previous input`,()=>{
 const {at}=setup();at();at(depth(),{mode});assert.equal(at(depth(.06)).activation,null);
});
test('tracking loss, frame gaps, rotation and discontinuous depth reset instead of clicking',()=>{
 const {at}=setup();at();at(depth(),{tracking:false});assert.equal(at(depth(.06)).activation,null);
 assert.equal(at(depth(.12),{now:9999}).activation,null);
 assert.equal(at({...depth(.12),shape:[.3,1,1,1]}).reason,'hand-rotated');
 at();assert.equal(at(depth(1)).reason,'depth-jump');
});

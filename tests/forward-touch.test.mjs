import test from 'node:test';
import assert from 'node:assert/strict';
import {ForwardPushController} from '../src/lib/gesture/ForwardPushController.ts';
const target={id:'button'};
const depth=(fingerDepth=0,jointDepth=fingerDepth*.6,scale=1)=>({scale,fingerDepth,jointDepth,shape:[1,1,1,1],indexExtended:true});
const setup=(profile='navigation',travel)=> {
 const controller=new ForwardPushController(travel,profile);let now=100;
 const at=(d=depth(),extra={})=>{now=extra.now??now+40;return controller.step({
  now,tracking:true,depth:d,pointing:true,mode:'navigation',target,point:{x:.4,y:.5},...extra
 });};
 const aim=(d=depth())=>{for(let i=0;i<6;i++)at(d);};
 const press=(d=depth(.18))=>{const first=at(d);const second=at(d);return {first,second};};
 return {controller,at,aim,press};
};
test('a single depth spike never clicks; two stable observations confirm a deliberate touch',()=>{
 const {at,aim,press}=setup();aim();
 const {first,second}=press();
 assert.equal(first.activation,null);assert.equal(first.reason,'confirming-touch');
 assert.equal(second.activation,target);assert.equal(second.confirmationMs,40);
});
test('press must follow stable aim and cannot activate from a moving target',()=>{
 const {at,aim}=setup();const other={id:'other'};
 at();at(depth(.18));at(depth(.18));assert.equal(at(depth(.18)).activation,null);
 aim();const first=at(depth(.18),{target:other});
 assert.equal(first.activation,null);
 assert.equal(at(depth(.18),{target:other}).activation,null);
 for(let i=0;i<6;i++)at(depth(),{target:other});
 const renewed=at(depth(.18),{target:other});assert.equal(renewed.activation,null);
 let confirmed=null;
 for(let k=0;k<3;k++)confirmed=at(depth(.18),{target:other}).activation||confirmed;
 assert.equal(confirmed,other);
});
test('a held contact never repeats and requires retreat and a short cooldown',()=>{
 const {at,aim,press}=setup();aim();press();
 for(let i=0;i<12;i++)assert.equal(at(depth(.18)).activation,null);
 assert.equal(at().phase,'RELEASED');
 for(let i=0;i<5;i++)assert.equal(at(depth(.18)).activation,null);
 aim();const done=press();assert.equal(done.second.activation,target);
});
test('a slight whole-hand scale shift does not click; larger stable approach can',()=>{
 const {at,aim}=setup();aim();
 assert.equal(at(depth(0,0,1.02)).activation,null);
 for(let i=0;i<5;i++)at();
 assert.equal(at(depth(0,0,1.07)).activation,null);
 assert.equal(at(depth(0,0,1.07)).activation,target);
});
test('keyboard ignores whole-hand scaling and single fingertip noise',()=>{
 const {at,aim}=setup('keyboard',.12);aim();
 assert.equal(at(depth(0,0,1.12)).activation,null);
 assert.equal(at(depth(0,0,1.12)).activation,null);
 for(let i=0;i<6;i++)at();
 assert.equal(at(depth(.18)).activation,null);
 assert.equal(at(depth(0)).activation,null);
 assert.equal(at(depth(.18)).activation,null);
 assert.equal(at(depth(.18)).activation,target);
});
test('hover and small noisy movement do not click',()=>{
 const {at,aim}=setup();aim();
 for(let i=0;i<80;i++)assert.equal(at(depth(i*.0005+(i%2)*.002)).activation,null);
});
test('uncoordinated tip Z spike is rejected even when repeated',()=>{
 const {at,aim}=setup();aim();
 assert.equal(at(depth(.18,0)).reason,'incoherent-tip');
 assert.equal(at(depth(.18,0)).activation,null);
});
test('moving to another key while held releases instead of typing onto the new target',()=>{
 const {at,aim,press}=setup();aim();press();
 const other={id:'other'};
 assert.equal(at(depth(.18),{target:other}).pending,false);
 assert.equal(at(depth(.18),{target:other}).activation,null);
});
for(const mode of ['scroll','zoom','keyboard'])test(`${mode} invalidates a pending touch`,()=>{
 const {at,aim}=setup();aim();at(depth(.18));at(depth(),{mode});assert.equal(at(depth(.18)).activation,null);
});
test('tracking loss, large frame gaps, rotation and depth jumps reset safely',()=>{
 const {at,aim}=setup();aim();at(depth(),{tracking:false});assert.equal(at(depth(.18)).activation,null);
 assert.equal(at(depth(.18),{now:9999}).activation,null);
 assert.equal(at({...depth(.18),shape:[.3,1,1,1]}).reason,'hand-rotated');
 at();assert.equal(at(depth(1)).reason,'depth-jump');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {ForwardPushController} from '../src/lib/gesture/ForwardPushController.ts';
import {measureForwardDepth} from '../src/lib/gesture/forwardDepth.ts';
import {makeHand} from './fixtures/hand.mjs';
const target={id:'button'};
const setup=()=>{
 const controller=new ForwardPushController();let now=100;
 const frame=(overrides={})=>controller.step({now:now+=50,tracking:true,depth:measureForwardDepth(makeHand()),pointing:true,mode:'navigation',target,point:{x:.4,y:.5},...overrides});
 const aim=()=>{for(let i=0;i<7;i++)frame();};
 const push=()=>{frame({depth:measureForwardDepth(makeHand({scale:1.2}))});return frame({depth:measureForwardDepth(makeHand({scale:1.2}))});};
 return {controller,frame,aim,push};
};
test('aim and forward crossing activates once; holding or lateral movement cannot repeat',()=>{
 const {frame,aim,push}=setup();aim();assert.equal(push().activation,target);
 for(let i=0;i<30;i++)assert.equal(frame({depth:measureForwardDepth(makeHand({scale:1.2})),point:{x:.8,y:.8}}).activation,null);
 frame();frame();assert.equal(push().activation,target);
});
test('hover forever, thumb/index pinch and wrist-relative Z offset never click',()=>{
 const {frame,aim}=setup();aim();
 for(let i=0;i<40;i++)assert.equal(frame({depth:measureForwardDepth(makeHand({pinch:i%2===0,zOffset:i*.2}))}).activation,null);
});
test('touch plane progress is spatial; a partial push fills the ring without activating',()=>{
 const {frame,aim}=setup();aim();const partial=frame({depth:measureForwardDepth(makeHand({scale:1.07}))});
 assert.ok(partial.progress>.2&&partial.progress<1);assert.equal(partial.activation,null);
});
test('a noisy depth spike cannot click; crossing needs consecutive confirmation',()=>{
 const {frame,aim,push}=setup();aim();frame({depth:measureForwardDepth(makeHand({scale:1.2}))});frame();frame();assert.equal(push().activation,target);
});
test('finger-relative forward movement also crosses the plane without hand translation',()=>{
 const {frame,aim}=setup();aim();const depth=measureForwardDepth(makeHand());depth.fingerDepth+=.4;
 frame({depth});assert.equal(frame({depth}).activation,target);
});
for(const mode of ['scroll','zoom','keyboard'])test(`${mode} invalidates the old touch plane`,()=>{
 const {frame,aim,push}=setup();aim();frame({mode});assert.equal(push().activation,null);
});
test('missing target, loss, long frame gaps and reset cannot replay a touch',()=>{
 const {frame,aim,push,controller}=setup();aim();frame({tracking:false});assert.equal(push().activation,null);
 aim();controller.reset();assert.equal(push().activation,null);
 frame({now:9999});assert.equal(push().activation,null);
});
test('rotation, bending and discontinuous scale invalidate the plane',()=>{
 const {frame,aim}=setup();aim();assert.equal(frame({depth:measureForwardDepth(makeHand({yaw:.35}))}).reason,'hand-rotated');
 aim();const folded=makeHand();folded[8]={x:folded[5].x,y:folded[5].y+.04,z:-.13};
 assert.equal(frame({depth:measureForwardDepth(folded)}).reason,'not-pointing');
 aim();assert.equal(frame({depth:measureForwardDepth(makeHand({scale:2}))}).reason,'depth-jump');
});
test('target is locked at approach onset, not the sideways-shifted fingertip',()=>{
 const {frame,aim}=setup();aim();frame({depth:measureForwardDepth(makeHand({scale:1.06})),point:{x:.8,y:.8}});
 const depth=measureForwardDepth(makeHand({scale:1.2}));frame({depth,target:{id:'other'}});const pressed=frame({depth});
 assert.equal(pressed.activation,target);assert.deepEqual(pressed.point,{x:.4,y:.5});
});
test('withdrawal after reacquisition at the advanced position restores a usable reference',()=>{
 const {frame,push}=setup();
 for(let i=0;i<8;i++)frame({depth:measureForwardDepth(makeHand({scale:1.2}))});
 frame();frame();assert.equal(push().activation,target);
});
test('moving between keys shares the existing plane without another calibration wait',()=>{
 const {frame,aim}=setup();aim();const other={id:'next-letter'};
 frame({target:other,point:{x:.6,y:.5}});
 const depth=measureForwardDepth(makeHand({scale:1.2}));frame({target:other,depth});
 assert.equal(frame({target:other,depth}).activation,other);
});

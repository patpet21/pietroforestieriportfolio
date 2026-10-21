import test from 'node:test';
import assert from 'node:assert/strict';
import {HandLandmarkStabilizer} from '../src/lib/gesture/HandLandmarkStabilizer.ts';
import {makeHand} from './fixtures/hand.mjs';

const shift=(hand,dx,dy)=>hand.map(p=>({...p,x:p.x+dx,y:p.y+dy}));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('a single detached index-tip detection is held near its correct finger joint',()=>{
 const filter=new HandLandmarkStabilizer();
 const hand=makeHand();
 const first=filter.update([hand],100)[0];
 const corrupt=hand.map(p=>({...p}));corrupt[8].x+=.24;corrupt[8].y-=.16;
 const second=filter.update([corrupt],140)[0];
 assert.ok(distance(second[8],first[8])<.009,'one-frame tip flyaway cannot be displayed or used for click');
 assert.ok(distance(second[7],first[7])<.001,'valid distal joint stays in place');
 const recovered=filter.update([hand],180)[0];
 assert.ok(distance(recovered[8],first[8])<.009,'recover without persistent drift');
});
test('a real sustained fingertip movement is allowed after a single guarded sample',()=>{
 const filter=new HandLandmarkStabilizer(),hand=makeHand();
 filter.update([hand],100);
 const extended=hand.map(p=>({...p}));extended[8].x+=.19;
 const blocked=filter.update([extended],140)[0];
 assert.ok(distance(blocked[8],hand[8])<.01);
 const permitted=filter.update([extended],180)[0];
 assert.ok(distance(permitted[8],hand[8])>.12,'legitimate held finger movement must recover');
});
test('normal finger movement and whole-hand translation remain responsive',()=>{
 const filter=new HandLandmarkStabilizer(),hand=makeHand();
 filter.update([hand],100);
 const moved=shift(hand,.1,.045);
 const frame=filter.update([moved],140)[0];
 assert.ok(distance(frame[8],moved[8])<.014,'do not pin the index in place when the hand moves');
 assert.ok(distance(frame[0],moved[0])<.014);
});
test('small stationary jitter is damped while the baseline remains near the real index',()=>{
 const filter=new HandLandmarkStabilizer(),hand=makeHand();
 filter.update([hand],100);
 const noise=hand.map(p=>({...p}));noise[8].x+=.005;
 const stabilized=filter.update([noise],140)[0];
 assert.ok(stabilized[8].x>hand[8].x);
 assert.ok(stabilized[8].x<noise[8].x-.001);
});
test('a reversed two-hand detection order does not exchange the two index pointers',()=>{
 const filter=new HandLandmarkStabilizer();
 const left=makeHand({x:.28}),right=makeHand({x:.70});
 filter.update([left,right],100);
 const [outR,outL]=filter.update([shift(right,.008,0),shift(left,-.008,0)],140);
 assert.ok(distance(outR[8],right[8])<.025);
 assert.ok(distance(outL[8],left[8])<.025);
});
test('tracking loss, long gaps and invalid coordinates cannot replay old fingertips',()=>{
 const filter=new HandLandmarkStabilizer();
 const hand=makeHand();filter.update([hand],100);
 assert.deepEqual(filter.update([],140),[]);
 const far=shift(hand,.25,.1);
 const newFrame=filter.update([far],180)[0];
 assert.deepEqual(newFrame,far,'a newly acquired hand starts with fresh landmarks');
 const invalid=far.map(p=>({...p}));invalid[8].x=NaN;
 assert.deepEqual(filter.update([invalid],220),[]);
 const afterGap=filter.update([hand],1000)[0];
 assert.deepEqual(afterGap,hand,'stale tracking must not be interpolated');
});

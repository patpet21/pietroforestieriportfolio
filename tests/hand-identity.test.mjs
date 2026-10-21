import test from 'node:test';
import assert from 'node:assert/strict';
import {HandIdentityTracker} from '../src/lib/gesture/HandIdentityTracker.ts';
import {makeHand} from './fixtures/hand.mjs';
const hand=(tag,x,categoryName,score=.98)=>({tag,landmarks:makeHand({x,y:.35}),handedness:categoryName?{categoryName,score}:undefined});
const labels=frame=>Object.fromEntries(frame.map(f=>[f.side,f.hand.tag]));

test('confident handedness initializes identities even when detection order and screen sides disagree',()=>{
 const tracker=new HandIdentityTracker();
 assert.deepEqual(labels(tracker.update([hand('physical-right',.7,'Right'),hand('physical-left',.3,'Left')],100)),{L:'physical-left',R:'physical-right'});
});

test('detection reordering and one-frame incorrect handedness cannot swap distinct tracks',()=>{
 const tracker=new HandIdentityTracker();
 tracker.update([hand('left',.7,'Left'),hand('right',.3,'Right')],100);
 const jitter=tracker.update([hand('right',.31,'Left'),hand('left',.69,'Right')],150);
 assert.deepEqual(labels(jitter),{L:'left',R:'right'});
 assert.ok(jitter.every(h=>h.reset),'contradictory metadata must clear contact without immediately exchanging displayed identities');
 assert.deepEqual(labels(tracker.update([hand('right',.32,'Right'),hand('left',.68,'Left')],200)),{L:'left',R:'right'});
});

test('persistent confident contradiction repairs abruptly crossed identities and resets both contacts',()=>{
 const tracker=new HandIdentityTracker();
 tracker.update([hand('left',.6,'Left'),hand('right',.5,'Right')],100);
 const crossing=tracker.update([hand('left',.5,'Left'),hand('right',.6,'Right')],150);
 assert.ok(crossing.every(h=>h.reset),'the first conflicting frame cannot carry another hand\'s contact');
 const repaired=tracker.update([hand('right',.6,'Right'),hand('left',.5,'Left')],200);
 assert.deepEqual(labels(repaired),{L:'left',R:'right'});
 assert.ok(repaired.every(h=>h.reset));
 const settled=tracker.update([hand('left',.5,'Left'),hand('right',.6,'Right')],250);
 assert.deepEqual(labels(settled),{L:'left',R:'right'});
 assert.equal(settled.some(h=>h.reset),false);
});

test('wrist trajectories preserve identity through crossing with low-confidence labels',()=>{
 const tracker=new HandIdentityTracker();let now=100;
 const frame=(lx,rx)=>tracker.update([hand('right',rx,'Left',.4),hand('left',lx,'Right',.4)],now+=50);
 // Bootstrap fallback by mirrored screen side, then continue on measured paths.
 frame(.7,.3);
 for(const [lx,rx] of [[.62,.38],[.54,.46],[.46,.54],[.38,.62]]){
  assert.deepEqual(labels(frame(lx,rx)),{L:'left',R:'right'});
 }
});

test('ambiguous overlapping identities discard armed contact rather than transfer it',()=>{
 const tracker=new HandIdentityTracker();
 tracker.update([hand('left',.55),hand('right',.45)],100);
 const overlap=tracker.update([hand('right',.5),hand('left',.5)],150);
 assert.equal(overlap.length,2);
 assert.ok(overlap.every(h=>h.reset));
});

test('short disappearance preserves identity metadata, but returning after a long frame gap resets contact',()=>{
 const tracker=new HandIdentityTracker();
 tracker.update([hand('left',.7,'Left'),hand('right',.3,'Right')],100);
 assert.deepEqual(labels(tracker.update([hand('right',.3,'Right')],150)),{R:'right'});
 const returning=tracker.update([hand('right',.3,'Right'),hand('left',.7,'Left')],500);
 assert.deepEqual(labels(returning),{L:'left',R:'right'});
 assert.equal(returning.find(h=>h.side==='L').reset,true);
});

test('duplicate model handedness does not permanently reset a spatially stable second hand',()=>{
 const tracker=new HandIdentityTracker();
 tracker.update([hand('left',.7,'Left'),hand('right',.3,'Right')],100);
 for(let i=1;i<8;i++){
  const f=tracker.update([hand('right',.3,'Left'),hand('left',.7,'Left')],100+i*40);
  assert.deepEqual(labels(f),{L:'left',R:'right'});assert.equal(f.some(h=>h.reset),false);
 }
});

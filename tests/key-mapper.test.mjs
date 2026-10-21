import test from 'node:test';
import assert from 'node:assert/strict';
import {HandKeyMapper} from '../src/lib/gesture/HandKeyMapper.ts';
import {makeHand} from './fixtures/hand.mjs';

const home={A:{x:.10,y:.40},F:{x:.34,y:.40},J:{x:.57,y:.40},'SPACE':{x:.48,y:.84},
 D:{x:.25,y:.40},S:{x:.18,y:.40},K:{x:.65,y:.40},L:{x:.73,y:.40},';':{x:.80,y:.40}};
const homeAt=key=>home[key]||null;
function align(map,side,pose=makeHand({x:.5,palm:true}),start=0){
 let calibrated=false;
 for(let i=0;i<13;i++)calibrated=map.update(side,pose,start+i*40,homeAt);
 return calibrated;
}
test('short steady posture aligns all ten key homes, with no extra camera or manual button',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 assert.equal(mapper.update('L',p,0,homeAt),false);
 assert.equal(align(mapper,'L',p,40),true);
 assert.equal(mapper.count(),1);
 const fingers=[['INDEX','F'],['MIDDLE','D'],['RING','S'],['PINKY','A'],['THUMB','SPACE']];
 for(const [name,key] of fingers){
  const point=mapper.project('L',name,p,1);
  assert.ok(Math.abs(point.x-home[key].x)<1e-7);
  assert.ok(Math.abs(point.y-home[key].y)<1e-7);
 }
 assert.equal(align(mapper,'R',p,700),true);assert.equal(mapper.count(),2);
});
test('calibration waits for a genuinely still hand, never arms on wrist motion alone',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 for(let i=0;i<20;i++){
  const moved=p.map(a=>({...a,x:a.x+i*.019}));
  assert.equal(mapper.update('L',moved,i*40,homeAt),false);
 }
 assert.equal(mapper.count(),0);
});
test('wrist-relative keyboard projection suppresses minor common hand drift',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 align(mapper,'L',p);
 const original=mapper.project('L','INDEX',p,1);
 const drifting=p.map(a=>({...a,x:a.x+.01,y:a.y+.008}));
 const updated=mapper.project('L','INDEX',drifting,1);
 assert.ok(Math.hypot(original.x-updated.x,original.y-updated.y)<.025);
});
test('intentional relative index motion can reach a neighboring key',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 align(mapper,'L',p);
 const moved=p.map(a=>({...a}));
 const width=Math.hypot(p[5].x-p[17].x,p[5].y-p[17].y);
 moved[8].x-=width*(.075/.37);
 assert.ok(Math.abs(mapper.project('L','INDEX',moved,1).x-(home.F.x+.075))<.001);
});
test('new or missing hands cannot reuse an old calibration',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 align(mapper,'L',p);mapper.clear('L');
 assert.equal(mapper.ready('L'),false);assert.equal(mapper.project('L','INDEX',p,1),null);
 mapper.update('L',p,600,homeAt);
 assert.equal(mapper.count(),0);
 mapper.reset();assert.equal(mapper.count(),0);
});
test('a missing home key prevents an unsafe incomplete calibration',()=>{
 const mapper=new HandKeyMapper(),p=makeHand({x:.5,palm:true});
 for(let i=0;i<14;i++)mapper.update('L',p,i*40,key=>key==='A'?null:homeAt(key));
 assert.equal(mapper.count(),0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {monday,weekDates,localToUTC,freeSlot,newYorkDay,candidateSlots} from '../netlify/lib/google-calendar.mjs';

test('calendar weeks start on Monday and span seven real days',()=>{
 assert.equal(monday('2026-10-25'),'2026-10-19');
 assert.equal(monday('2026-10-26'),'2026-10-26');
 assert.deepEqual(weekDates('2026-10-26'),[
  '2026-10-26','2026-10-27','2026-10-28','2026-10-29',
  '2026-10-30','2026-10-31','2026-11-01'
 ]);
});
test('NY morning booking times respect DST transitions',()=>{
 assert.equal(new Date(localToUTC('2026-10-30',9,0)).toISOString(),'2026-10-30T13:00:00.000Z');
 assert.equal(new Date(localToUTC('2026-11-02',9,0)).toISOString(),'2026-11-02T14:00:00.000Z');
 assert.equal(newYorkDay(new Date('2026-11-02T14:00:00.000Z')),'2026-11-02');
});
test('a busy interval blocks all overlapping durations, not adjacent times',()=>{
 const busy=[{start:Date.parse('2026-11-02T15:00:00Z'),end:Date.parse('2026-11-02T15:30:00Z')}];
 assert.equal(freeSlot({start:'2026-11-02T14:45:00Z',end:'2026-11-02T15:15:00Z'},busy),false);
 assert.equal(freeSlot({start:'2026-11-02T15:30:00Z',end:'2026-11-02T16:00:00Z'},busy),true);
 assert.equal(freeSlot({start:'2026-11-02T14:30:00Z',end:'2026-11-02T15:00:00Z'},busy),true);
});
test('slots have permitted durations and are aligned to quarter-hour boundaries',()=>{
 const future=new Date(Date.now()+15*86400000).toISOString().slice(0,10);
 const candidates=candidateSlots(monday(future),30);
 assert.ok(candidates.length>0);
 for(const slot of candidates){
  assert.equal((Date.parse(slot.end)-Date.parse(slot.start))/60000,30);
  assert.equal(new Date(slot.start).getUTCMinutes()%15,0);
 }
});

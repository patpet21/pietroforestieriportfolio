import {configured,json,policy,monday,weekDates,candidateSlots,getToken,busyBetween,freeSlot,newYorkDay} from '../lib/google-calendar.mjs';

export default async function handler(request){
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 try{
  const url=new URL(request.url);
  const duration=Number(url.searchParams.get('duration')||30);
  const {window:windowDays,start,end,weekdays}=policy();
  const current=newYorkDay(new Date());
  const queryWeek=url.searchParams.get('week')||current;
  const week=monday(queryWeek);
  const dates=weekDates(week);
  const earliest=new Date();earliest.setUTCDate(earliest.getUTCDate()-7);
  const latest=new Date();latest.setUTCDate(latest.getUTCDate()+windowDays+8);
  if(new Date(week+'T00:00:00Z')<earliest||new Date(week+'T00:00:00Z')>latest)return json({error:'Requested week is outside the booking window'},400);
  if(![15,30,45].includes(duration))return json({error:'Choose a 15, 30 or 45-minute call'},400);
  const core={configured:configured(),week,days:dates,timezone:'America/New_York',duration,startHour:start,endHour:end,weekdays};
  if(!configured())return json({...core,slots:[],message:'Google Calendar connection is pending. Contact form is available meanwhile.'});
  const slots=candidateSlots(week,duration);
  if(!slots.length)return json({...core,slots:[]});
  const token=await getToken();
  const busy=await busyBetween(token,slots[0].start,slots[slots.length-1].end);
  return json({...core,slots:slots.map(slot=>({...slot,available:freeSlot(slot,busy)}))});
 }catch(error){
  console.error('Portfolio calendar availability:',error?.message||'Unavailable');
  return json({error:'Availability cannot be retrieved right now. Please use the contact form.'},503);
 }
}

export const config={path:'/api/calendar/availability'};

import {configured,json,monday,policy,candidateSlots,getToken,busyBetween,freeSlot,insertEvent,sameOrigin} from '../lib/google-calendar.mjs';

export default async function handler(request){
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!sameOrigin(request))return json({error:'Invalid request origin'},403);
 if(!configured())return json({error:'Google Calendar is not connected yet. Please use the contact form.'},503);
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request is too large'},413);
  const text=await request.text();
  if(text.length>4096)return json({error:'Request is too large'},413);
  const data=JSON.parse(text);
  if(data.website)return json({error:'Unable to complete request'},400); // Honeypot.
  const {start,end,duration}=data;
  const name=typeof data.name==='string'?data.name.trim():'';
  const email=typeof data.email==='string'?data.email.trim():'';
  const company=typeof data.company==='string'?data.company.trim():'';
  const notes=typeof data.notes==='string'?data.notes.trim():'';
  if(!name||name.length>100||!email||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||company.length>120||notes.length>800)return json({error:'Enter a valid name, email and a short message'},400);
  if(typeof start!=='string'||typeof end!=='string'||![15,30,45].includes(duration))return json({error:'Invalid appointment selection'},400);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(start)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(end))return json({error:'Invalid appointment time'},400);
  // Authoritative slot verification: clients cannot submit arbitrary dates/times.
  const isoDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(start));
  const slots=candidateSlots(monday(isoDay),duration);
  const exact=slots.find(slot=>slot.start===start&&slot.end===end);
  if(!exact)return json({error:'This time is no longer bookable. Choose another slot.'},409);
  const token=await getToken();
  const busy=await busyBetween(token,start,end);
  if(!freeSlot(exact,busy))return json({error:'That slot has become busy. Select another time.'},409);
  const created=await insertEvent(token,{start,end,name,email,company,notes});
  if(created.duplicate)return json({error:'This appointment is already reserved. Choose another time.'},409);
  return json({ok:true,eventId:created.id,start:created.start,end:created.end,meetingLink:null,message:'Your appointment is saved to the organizer’s Google Calendar. Video-call details will be arranged separately.'},201);
 }catch(error){
  console.error('Portfolio calendar booking:',error?.message||'Unavailable');
  return json({error:'The booking was not confirmed. Please try again or use the contact form.'},503);
 }
}

export const config={path:'/api/calendar/book'};

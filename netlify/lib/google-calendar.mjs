/**
 * Server-only Google Calendar integration for the public booking page.
 * Dedicated shared calendar: service account has "Make changes to events".
 * Never import this module from src/ or expose the private key to Vite.
 */
import {createSign,createHash} from 'node:crypto';

export const TZ='America/New_York';
export const DURATIONS=[15,30,45];
const ZONE_SCOPE='https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy';
const encode=(value)=>Buffer.from(JSON.stringify(value)).toString('base64url');
export const configured=()=>Boolean(process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
export const calendarId=()=>process.env.GOOGLE_CALENDAR_ID||'';
export const calendarIds=()=>[...new Set([calendarId(),...(process.env.GOOGLE_BUSY_CALENDAR_IDS||'').split(',').map(v=>v.trim()).filter(Boolean)])];
export const policy=()=>{
 const start=Number(process.env.BOOKING_START_HOUR||9),end=Number(process.env.BOOKING_END_HOUR||17);
 const lead=Number(process.env.BOOKING_MIN_NOTICE_HOURS||24),window=Number(process.env.BOOKING_WINDOW_DAYS||45);
 const weekdays=(process.env.BOOKING_WEEKDAYS||'1,2,3,4,5').split(',').map(v=>Number(v.trim())).filter(v=>Number.isInteger(v)&&v>=0&&v<=6);
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>24||end<=start||!weekdays.length)throw Error('Booking hours or weekdays are not configured correctly');
 return {start,end,lead:Math.max(1,Math.min(168,lead||24)),window:Math.max(7,Math.min(90,window||45)),weekdays};
};
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const formatter=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const localParts=(date)=>{
 const p=Object.fromEntries(formatter.formatToParts(date).filter(v=>v.type!=='literal').map(v=>[v.type,Number(v.value)]));
 return {year:p.year,month:p.month,day:p.day,hour:p.hour,minute:p.minute};
};
export const dateKey=(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
export const newYorkDay=(date)=>{const p=localParts(date);return dateKey(p.year,p.month,p.day);};
export function localToUTC(day,hour,minute){
 const [y,m,d]=day.split('-').map(Number);
 const target=Date.UTC(y,m-1,d,hour,minute,0,0);
 let ms=target;
 for(let i=0;i<3;i++){
  const p=localParts(new Date(ms));
  const actual=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
  ms+=target-actual;
 }
 return ms;
}
export const monday=(day)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid date');
 const [y,m,d]=day.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('Invalid date');
 const offset=(dt.getUTCDay()+6)%7;
 dt.setUTCDate(dt.getUTCDate()-offset);
 return dateKey(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
};
const addDays=(day,offset)=>{
 const [y,m,d]=day.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d+offset));
 return dateKey(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());
};
export function weekDates(week){
 const mon=monday(week);
 return Array.from({length:7},(_,i)=>addDays(mon,i));
}
export const validWindow=(day)=>{
 const now=new Date(),p=localParts(now),today=dateKey(p.year,p.month,p.day),max=addDays(today,policy().window);
 return day>=today&&day<=max;
};
export function candidateSlots(week,duration){
 if(!DURATIONS.includes(duration))throw Error('Invalid duration');
 const {start,end,lead,weekdays}=policy();
 const minStart=Date.now()+lead*3600000;
 return weekDates(week).filter(day=>weekdays.includes(new Date(day+'T12:00:00Z').getUTCDay())).flatMap(day=>{
  const slots=[];
  for(let minute=start*60;minute+duration<=end*60;minute+=15){
   const from=localToUTC(day,Math.floor(minute/60),minute%60);
   const to=from+duration*60000;
   if(from<minStart||!validWindow(day))continue;
   slots.push({date:day,start:new Date(from).toISOString(),end:new Date(to).toISOString()});
  }
  return slots;
 });
}
export async function getToken(){
 if(!configured())throw Error('Calendar not configured');
 const now=Math.floor(Date.now()/1000);
 const jwtHeader=encode({alg:'RS256',typ:'JWT'});
 const jwtBody=encode({iss:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,scope:ZONE_SCOPE,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3500});
 const unsigned=jwtHeader+'.'+jwtBody;
 const key=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g,'\n');
 const signer=createSign('RSA-SHA256');signer.update(unsigned);signer.end();
 const assertion=unsigned+'.'+signer.sign(key,'base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 const out=await response.json();
 if(!response.ok||!out.access_token)throw Error('Google authentication failed ('+response.status+')');
 return out.access_token;
}
export async function busyBetween(token,min,max){
 const response=await fetch('https://www.googleapis.com/calendar/v3/freeBusy',{
  method:'POST',headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({timeMin:min,timeMax:max,timeZone:TZ,items:calendarIds().map(id=>({id}))})
 });
 const data=await response.json();
 if(!response.ok)throw Error('Google availability request failed ('+response.status+')');
 const intervals=[];
 for(const id of calendarIds()){
  const entry=data.calendars?.[id];
  if(!entry||entry.errors?.length)throw Error('Calendar access not granted for '+id);
  for(const block of entry.busy||[])intervals.push({start:Date.parse(block.start),end:Date.parse(block.end)});
 }
 return intervals;
}
export function freeSlot(slot,busy){
 const start=Date.parse(slot.start),end=Date.parse(slot.end);
 return !busy.some(item=>start<item.end&&end>item.start);
}
export async function insertEvent(token,{start,end,name,email,company,notes}){
 const id=createHash('sha256').update(calendarId()+'|'+start+'|'+end).digest('hex').slice(0,32);
 const body={
  id,
  summary:'Portfolio intro call · '+name,
  description:['Booked via Pietro Forestieri portfolio','Visitor: '+name,'Email: '+email,company?'Company: '+company:'',notes?'Topic: '+notes:'','Meeting link: to be shared by the organizer.'].filter(Boolean).join('\n'),
  start:{dateTime:start,timeZone:TZ},
  end:{dateTime:end,timeZone:TZ},
  transparency:'opaque',
  reminders:{useDefault:false,overrides:[{method:'popup',minutes:15}]}
 };
 const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId())+'/events?sendUpdates=none',{
  method:'POST',headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)
 });
 const out=await response.json().catch(()=>({}));
 if(response.status===409)return {duplicate:true};
 if(!response.ok)throw Error('Google could not create the appointment ('+response.status+')');
 return {id:out.id,start:out.start?.dateTime||start,end:out.end?.dateTime||end,htmlLink:out.htmlLink||null};
}
export function sameOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 const allowed=[process.env.URL,process.env.DEPLOY_PRIME_URL,...(process.env.BOOKING_ALLOWED_ORIGINS||'').split(',')].filter(Boolean);
 if(!allowed.length)return true;
 return allowed.some(site=>{try{return new URL(site).origin===origin}catch{return false}});
}

/**
 * Pietro Portfolio — Cloudflare Worker + SQLite Durable Object
 * Google service account credentials are stored ONLY in Cloudflare Secrets.
 * This Worker requires a matching SQLite Durable Object binding BOOKING_LOCKS.
 */
import { DurableObject } from 'cloudflare:workers';

const ZONE = 'America/New_York';
const DURATIONS = [15, 30, 45];
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year:'numeric', month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' });
let tokenCache = { value: '', until: 0, signature: '' };

const parts = (date) => Object.fromEntries(MONTH_FORMAT.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
const dayString = (y,m,d) => [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
const newYorkDay = (date) => { const p=parts(date); return dayString(p.year,p.month,p.day); };
const advance = (day,count) => { const [y,m,d]=day.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+count)).toISOString().slice(0,10); };
function monday(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Invalid date');
 const [y,m,d]=value.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw new Error('Invalid date');
 return advance(value,-((date.getUTCDay()+6)%7));
}
function wallToUTC(day,hour,minute){
 const [y,m,d]=day.split('-').map(Number);
 const target=Date.UTC(y,m-1,d,hour,minute);
 let ms=target;
 for(let i=0;i<3;i++){
  const p=parts(new Date(ms));
  ms+=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
 }
 return ms;
}
function policy(env){
 const first=Number(env.BOOKING_START_HOUR||9),last=Number(env.BOOKING_END_HOUR||17);
 const lead=Number(env.BOOKING_MIN_NOTICE_HOURS||24),windowDays=Number(env.BOOKING_WINDOW_DAYS||45);
 const week=(env.BOOKING_WEEKDAYS||'1,2,3,4,5').split(',').map(Number);
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>24||first>=last)throw Error('Invalid booking business hours');
 return {first,last,lead:Math.max(1,Math.min(168,lead)),windowDays:Math.max(7,Math.min(90,windowDays)),week};
}
function slotsForWeek(env,week,duration){
 if(!DURATIONS.includes(duration))throw Error('Invalid duration');
 const {first,last,lead,windowDays,week:weekdays}=policy(env);
 const current=newYorkDay(new Date()),latest=advance(current,windowDays);
 const minTime=Date.now()+lead*3600000;
 const out=[];
 for(let i=0;i<7;i++){
  const day=advance(week,i);
  if(day<current||day>latest||!weekdays.includes(new Date(day+'T12:00:00Z').getUTCDay()))continue;
  for(let minutes=first*60;minutes+duration<=last*60;minutes+=15){
   const start=wallToUTC(day,Math.floor(minutes/60),minutes%60);
   if(start<minTime)continue;
   out.push({date:day,start:new Date(start).toISOString(),end:new Date(start+duration*60000).toISOString()});
  }
 }
 return out;
}
function calendarIds(env){
 return [...new Set([env.GOOGLE_CALENDAR_ID,...String(env.GOOGLE_BUSY_CALENDAR_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)])];
}
function ready(env){return !!(env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY&&env.GOOGLE_CALENDAR_ID&&env.BOOKING_LOCKS);}
function allowedOrigin(request,env){
 const origin=request.headers.get('Origin');
 if(!origin)return null;
 const list=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 return list.includes(origin)?origin:null;
}
function respond(payload,status=200,origin=null){
 const h=new Headers(JSON_HEADERS);
 if(origin){h.set('Access-Control-Allow-Origin',origin);h.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type');h.set('Access-Control-Max-Age','3600');}
 return new Response(JSON.stringify(payload),{status,headers:h});
}
function getLock(env,day){return env.BOOKING_LOCKS.getByName('portfolio:'+day);}
const encode = x => btoa(JSON.stringify(x)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const toBase64Url = bytes => {
 let s='';for(const b of bytes)s+=String.fromCharCode(b);
 return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
};
async function accessToken(env){
 const keyHint=env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 if(tokenCache.value&&tokenCache.signature===keyHint&&Date.now()<tokenCache.until)return tokenCache.value;
 const now=Math.floor(Date.now()/1000);
 const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({
  iss:env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
  aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
 });
 const pem=env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g,'\n');
 const raw=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 const keyData=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',keyData,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
 const assertion=unsigned+'.'+toBase64Url(new Uint8Array(signed));
 const resp=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})
 });
 const data=await resp.json();
 if(!resp.ok||!data.access_token)throw Error('Google authentication error '+resp.status);
 tokenCache={value:data.access_token,until:Date.now()+Math.max(60,Number(data.expires_in||3600)-120)*1000,signature:keyHint};
 return tokenCache.value;
}
async function calendarBusy(env,token,from,to){
 const list=calendarIds(env);
 const resp=await fetch('https://www.googleapis.com/calendar/v3/freeBusy',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({timeMin:from,timeMax:to,timeZone:ZONE,items:list.map(id=>({id}))})
 });
 const data=await resp.json();
 if(!resp.ok)throw Error('Google availability error '+resp.status);
 const result=[];
 for(const id of list){
  const entry=data.calendars?.[id];
  if(!entry||entry.errors?.length)throw Error('Google calendar sharing missing: '+id);
  for(const x of entry.busy||[])result.push({start:Date.parse(x.start),end:Date.parse(x.end)});
 }
 return result;
}
const notBusy=(slot,intervals)=>{
 const start=Date.parse(slot.start),end=Date.parse(slot.end);
 return intervals.every(interval=>end<=interval.start||start>=interval.end);
};
async function availability(request,env,origin){
 const url=new URL(request.url),duration=Number(url.searchParams.get('duration')||30);
 if(!DURATIONS.includes(duration))return respond({error:'Select 15, 30 or 45 minutes'},400,origin);
 const today=newYorkDay(new Date()),week=monday(url.searchParams.get('week')||today);
 const {first,last,windowDays}=policy(env);
 if(week<advance(monday(today),-7)||week>advance(monday(today),windowDays+7))return respond({error:'Week outside booking window'},400,origin);
 const days=Array.from({length:7},(_,i)=>advance(week,i));
 const enabled=ready(env)&&env.BOOKINGS_ENABLED==='true';
 const common={configured:enabled,week,days,timezone:ZONE,duration,startHour:first,endHour:last};
 if(!enabled)return respond({...common,slots:[],message:'Cloudflare booking backend is awaiting Google Calendar configuration.'},200,origin);
 const slots=slotsForWeek(env,week,duration);
 if(!slots.length)return respond({...common,slots:[]},200,origin);
 const token=await accessToken(env);
 const busy=await calendarBusy(env,token,slots[0].start,slots[slots.length-1].end);
 // Include in-flight and newly confirmed reservations, even before Google syncs.
 const locks=await Promise.all([...new Set(slots.map(s=>s.date))].map(async day=>getLock(env,day).active()));
 const allBusy=busy.concat(locks.flat());
 return respond({...common,slots:slots.map(s=>({...s,available:notBusy(s,allBusy)}))},200,origin);
}
async function createEvent(env,token,data){
 const bytes=new TextEncoder().encode(env.GOOGLE_CALENDAR_ID+'|'+data.start+'|'+data.end);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const id=Array.from(hash.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
 const event={
  id,summary:'Portfolio Intro Call · '+data.name,
  description:['Booking through Pietro Forestieri portfolio','Name: '+data.name,'Contact email: '+data.email,
   data.company?'Company: '+data.company:'',data.notes?'Discussion topic: '+data.notes:'',
   'Video call details to be arranged separately.'].filter(Boolean).join('\n'),
  start:{dateTime:data.start,timeZone:ZONE},end:{dateTime:data.end,timeZone:ZONE},transparency:'opaque',
  reminders:{useDefault:false,overrides:[{method:'popup',minutes:15}]}
 };
 const resp=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(env.GOOGLE_CALENDAR_ID)+'/events?sendUpdates=none',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(event)
 });
 if(resp.status===409)return {duplicate:true};
 if(!resp.ok)throw Error('Google event insert error '+resp.status);
 const result=await resp.json();
 return {id:result.id||id};
}
async function booking(request,env,origin){
 if(!ready(env)||env.BOOKINGS_ENABLED!=='true')return respond({error:'Online booking is not enabled yet. Please use the contact form.'},503,origin);
 if(Number(request.headers.get('Content-Length')||0)>4096)return respond({error:'Request too large'},413,origin);
 const raw=await request.text();
 if(raw.length>4096)return respond({error:'Request too large'},413,origin);
 let body;try{body=JSON.parse(raw)}catch{return respond({error:'Invalid request data'},400,origin);}
 if(body.website)return respond({error:'Request rejected'},400,origin);
 const name=String(body.name||'').trim(),email=String(body.email||'').trim(),company=String(body.company||'').trim(),notes=String(body.notes||'').trim();
 const {start,end,duration}=body;
 if(!name||name.length>100||!email||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||company.length>120||notes.length>800)return respond({error:'Enter valid contact details'},400,origin);
 if(!DURATIONS.includes(duration)||typeof start!=='string'||typeof end!=='string'||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end)))return respond({error:'Invalid appointment slot'},400,origin);
 const day=newYorkDay(new Date(start)),slots=slotsForWeek(env,monday(day),duration);
 const chosen=slots.find(s=>s.start===start&&s.end===end);
 if(!chosen)return respond({error:'Time no longer bookable. Select another slot.'},409,origin);
 // One Durable Object per New York calendar day serializes overlapping reservations.
 const lock=getLock(env,day),reservation=await lock.reserve(chosen);
 if(!reservation.ok)return respond({error:'That time was just reserved. Choose another slot.'},409,origin);
 try{
  const token=await accessToken(env);
  const conflicts=await calendarBusy(env,token,start,end);
  if(!notBusy(chosen,conflicts)){await lock.finish(reservation.id,false);return respond({error:'That time is already busy. Choose another slot.'},409,origin);}
  const event=await createEvent(env,token,{start,end,name,email,company,notes});
  if(event.duplicate){await lock.finish(reservation.id,true);return respond({error:'That slot is already booked.'},409,origin);}
  await lock.finish(reservation.id,true);
  return respond({ok:true,eventId:event.id,start,end,message:'Appointment saved to the organizer’s Google Calendar; video-call details are arranged separately.'},201,origin);
 }catch(error){
  console.error('Booking failed:',error?.message||'Unknown error');
  await lock.finish(reservation.id,false).catch(()=>{});
  return respond({error:'Booking not confirmed. Please try another time or contact us.'},503,origin);
 }
}
/**
 * Lock reservation rows never contain personal information.
 * Pending rows expire after 120 s if a process crashes; successful rows are
 * retained for 30 minutes to bridge Google Calendar availability propagation.
 */
export class BookingGate extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.ctx.storage.sql.exec(
   'CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY,start_ms INTEGER NOT NULL,end_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL)'
  );
 }
 async reserve(slot){
  const now=Date.now(),start=Date.parse(slot.start),end=Date.parse(slot.end);
  const sql=this.ctx.storage.sql;
  sql.exec('DELETE FROM reservations WHERE expires_ms < ?',now);
  const conflict=sql.exec(
   'SELECT id FROM reservations WHERE start_ms < ? AND end_ms > ? LIMIT 1',end,start
  ).toArray();
  if(conflict.length)return {ok:false};
  const id=crypto.randomUUID();
  sql.exec('INSERT INTO reservations (id,start_ms,end_ms,expires_ms) VALUES (?,?,?,?)',id,start,end,now+120000);
  return {ok:true,id};
 }
 async finish(id,success){
  if(success)this.ctx.storage.sql.exec('UPDATE reservations SET expires_ms = ? WHERE id = ?',Date.now()+30*60*1000,id);
  else this.ctx.storage.sql.exec('DELETE FROM reservations WHERE id = ?',id);
 }
 async active(){
  const now=Date.now();
  this.ctx.storage.sql.exec('DELETE FROM reservations WHERE expires_ms < ?',now);
  return this.ctx.storage.sql.exec('SELECT start_ms AS start,end_ms AS end FROM reservations').toArray();
 }
}
export default {
 async fetch(request,env){
  const origin=allowedOrigin(request,env);
  // CORS is not authentication, but it prevents third-party browser embedding.
  if(request.headers.has('Origin')&&!origin)return respond({error:'Origin not permitted'},403);
  if(request.method==='OPTIONS'){
   if(!origin)return respond({error:'Origin not permitted'},403);
   const headers=new Headers(JSON_HEADERS);headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');headers.set('Access-Control-Max-Age','3600');
   return new Response(null,{status:204,headers});
  }
  const path=new URL(request.url).pathname;
  // Read-only connection check, safe while BOOKINGS_ENABLED is false.
  // Respond with a status only: never return private events, calendar IDs, or credentials.
  if(path==='/api/calendar/check'&&request.method==='GET'){
   if(!ready(env))return respond({googleConnected:false,error:'Calendar credentials are not configured'},503,origin);
   try{
    const token=await accessToken(env);
    const now=new Date();
    const until=new Date(now.getTime()+86400000);
    await calendarBusy(env,token,now.toISOString(),until.toISOString());
    return respond({googleConnected:true,calendarsChecked:calendarIds(env).length,bookingsEnabled:env.BOOKINGS_ENABLED==='true'},200,origin);
   }catch(error){
    console.error('Calendar connection verification failed:',error?.message||'Unknown error');
    return respond({googleConnected:false,error:'Google Calendar access failed. Check Worker logs for the reason.'},503,origin);
   }
  }
  if(path==='/health'&&request.method==='GET')return respond({ok:true,service:'portfolio-booking',googleConfigured:ready(env),bookingsEnabled:env.BOOKINGS_ENABLED==='true'},200,origin);
  if(path==='/api/calendar/availability'&&request.method==='GET'){
   try{return await availability(request,env,origin)}
   catch(error){console.error('Availability failed:',error?.message||'Unknown');return respond({error:'Availability temporarily unavailable. Try the contact form.'},503,origin);}
  }
  if(path==='/api/calendar/book'&&request.method==='POST'){
   try{return await booking(request,env,origin)}
   catch(error){console.error('Booking request failed:',error?.message||'Unknown');return respond({error:'Booking service temporarily unavailable. Please use the contact form.'},503,origin);}
  }
  return respond({error:'Not found'},404,origin);
 }
};

/**
 * Pietro Portfolio — Cloudflare Worker + SQLite Durable Object
 * Google service account credentials are stored ONLY in Cloudflare Secrets.
 * This Worker requires a matching SQLite Durable Object binding BOOKING_LOCKS.
 */
import { DurableObject } from 'cloudflare:workers';
import {
 GoogleOAuthVault,googleOAuthReady,googleNotificationsReady,storedGoogleRefreshToken,googleAdminRoute
} from './google-oauth.js';
import {bookingEmail} from './booking-email.js';
export {GoogleOAuthVault};

const ZONE = 'America/New_York';
const DURATIONS = [30];
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
  for(let minutes=first*60;minutes+duration<=last*60;minutes+=30){
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

/**
 * Meet creation and Gmail notifications use a one-time USER OAuth consent.
 * This is distinct from the existing service-account free/busy authorization.
 * Never put Google OAuth secrets in repository or Netlify.
 */
let userTokenCache={token:'',expires:0,key:''};
const oauthReady=googleOAuthReady;
const notificationReady=googleNotificationsReady;
async function userAccessToken(env){
 if(!(await oauthReady(env)))throw Error('Google user OAuth has not been configured');
 const hint=env.GOOGLE_OAUTH_CLIENT_ID;
 if(userTokenCache.token&&userTokenCache.key===hint&&Date.now()<userTokenCache.expires)return userTokenCache.token;
 const response=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({
   client_id:env.GOOGLE_OAUTH_CLIENT_ID,
   client_secret:env.GOOGLE_OAUTH_CLIENT_SECRET,
   refresh_token:await storedGoogleRefreshToken(env),
   grant_type:'refresh_token'
  })
 });
 const data=await response.json();
 if(!response.ok||!data.access_token)throw Error('Google OAuth refresh failed: '+response.status);
 userTokenCache={token:data.access_token,key:hint,expires:Date.now()+(Math.max(60,Number(data.expires_in||3600)-120))*1000};
 return data.access_token;
}
async function googleRequest(url,token,method='GET',payload){
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error('Google API returned '+response.status);
 return data;
}
/** Gmail API: RFC 2046 multipart/alternative, UTF-8 text + accessible HTML. */
const mimeBase64=value=>{
 const raw=toBase64Url(new TextEncoder().encode(value)).replace(/-/g,'+').replace(/_/g,'/');
 const padded=raw+'='.repeat((4-raw.length%4)%4);
 return padded.match(/.{1,76}/g)?.join('\r\n')||'';
};
async function gmailSend(env,recipient,subject,message,reference){
 const token=await userAccessToken(env);
 if(!message?.html||!message?.text)throw Error('Missing booking email body');
 const boundary='pf_'+crypto.randomUUID().replace(/-/g,'');
 const headers=[
  'From: Pietro Forestieri <'+env.BOOKING_ORGANIZER_EMAIL+'>',
  'To: <'+recipient+'>',
  'Subject: '+subject,
  'MIME-Version: 1.0',
  'Content-Type: multipart/alternative; boundary="'+boundary+'"',
  '',
  'This is a multi-part message in MIME format.',
  '--'+boundary,
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  mimeBase64(message.text),
  '--'+boundary,
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  mimeBase64(message.html),
  '--'+boundary+'--',''
 ];
 await googleRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',token,'POST',{
  raw:toBase64Url(new TextEncoder().encode(headers.join('\r\n')))
 });
 console.log('Branded booking email accepted by Gmail',reference);
}
function emailCopy(data,isHost,reminder){
 return bookingEmail(data,isHost,reminder);
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
 if(!DURATIONS.includes(duration))return respond({error:'Consultations are 30 minutes only'},400,origin);
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
async function createEvent(env,serviceToken,data){
 const bytes=new TextEncoder().encode(env.GOOGLE_CALENDAR_ID+'|'+data.start+'|'+data.end);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const id=Array.from(hash.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
 const useUser=await oauthReady(env);
 const token=useUser?await userAccessToken(env):serviceToken;
 const base='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(env.GOOGLE_CALENDAR_ID)+'/events';
 const event={
  id,summary:'Portfolio Intro Call · '+data.name,
  description:['Booking through Pietro Forestieri portfolio','Name: '+data.name,'Contact email: '+data.email,
   data.company?'Company: '+data.company:'',data.notes?'Discussion topic: '+data.notes:'',
   '30-minute free consultation'].filter(Boolean).join('\n'),
  start:{dateTime:data.start,timeZone:ZONE},end:{dateTime:data.end,timeZone:ZONE},transparency:'opaque',
  reminders:{useDefault:false,overrides:[{method:'popup',minutes:15}]}
 };
 if(useUser){
  event.conferenceData={createRequest:{
   requestId:crypto.randomUUID().replace(/-/g,''),
   conferenceSolutionKey:{type:'hangoutsMeet'}
  }};
 }
 const url=base+'?sendUpdates=none'+(useUser?'&conferenceDataVersion=1':'');
 const resp=await fetch(url,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(event)
 });
 if(resp.status===409)return {duplicate:true};
 if(!resp.ok)throw Error('Google event insert error '+resp.status);
 let result=await resp.json();
 const meetLink=v=>v.hangoutLink||v.conferenceData?.entryPoints?.find(x=>x.entryPointType==='video')?.uri||'';
 if(useUser){
  // Calendar may generate the conference asynchronously. Do not invent a URL.
  for(let i=0;i<5&&!meetLink(result)&&result.conferenceData?.createRequest?.status?.statusCode==='pending';i++){
   await new Promise(resolve=>setTimeout(resolve,350*(i+1)));
   result=await googleRequest(base+'/'+encodeURIComponent(id)+'?conferenceDataVersion=1',token);
  }
  if(!meetLink(result)){
   // Never leave an appointment without a promised Meet URL when OAuth is enabled.
   await fetch(base+'/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+token}}).catch(()=>{});
   throw Error('Google Meet conference generation is unavailable');
  }
 }
 return {id:result.id||id,meetUrl:meetLink(result),mode:useUser?'google-user-oauth':'service-account'};
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
  let notificationQueued=false;
  if(await notificationReady(env)){
   try{
    await lock.enqueueNotice({id:event.id,start,email,name,meetUrl:event.meetUrl||''});
    notificationQueued=true;
   }catch(error){console.error('Notification scheduling failed:',error?.message||'Unknown');}
  }
  return respond({
   ok:true,eventId:event.id,start,end,
   meetUrl:event.meetUrl||null,notificationQueued,
   message:event.meetUrl
    ?(notificationQueued?'Appointment confirmed. Meet link available; email confirmations are queued.':'Appointment booked with Google Meet. Email notifications are not yet enabled.')
    :'Appointment saved to Google Calendar. Google Meet and automated email notifications still require Google OAuth setup.'
  },201,origin);
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
  this.env=env;
  this.ctx.storage.sql.exec(
   'CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY,start_ms INTEGER NOT NULL,end_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL)'
  );
  this.ctx.storage.sql.exec(
   'CREATE TABLE IF NOT EXISTS booking_messages (id TEXT PRIMARY KEY,start_iso TEXT NOT NULL, guest TEXT NOT NULL, name TEXT NOT NULL, meet_url TEXT NOT NULL, guest_confirm INTEGER NOT NULL DEFAULT 0,host_confirm INTEGER NOT NULL DEFAULT 0,guest_remind INTEGER NOT NULL DEFAULT 0,host_remind INTEGER NOT NULL DEFAULT 0, retry_at INTEGER NOT NULL DEFAULT 0, retries INTEGER NOT NULL DEFAULT 0)'
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
 async enqueueNotice(data){
  if(!(await notificationReady(this.env)))throw Error('Notification integration not ready');
  const sql=this.ctx.storage.sql;
  sql.exec('INSERT OR IGNORE INTO booking_messages (id,start_iso,guest,name,meet_url,retry_at) VALUES (?,?,?,?,?,?)',
   data.id,data.start,data.email,data.name,data.meetUrl||'',Date.now()+2000);
  await this.planAlarm();
 }
 async planAlarm(){
  const rows=this.ctx.storage.sql.exec('SELECT * FROM booking_messages').toArray();
  if(!rows.length)return;
  const now=Date.now(),options=[];
  for(const row of rows){
   const confirmNeeded=!row.guest_confirm||!row.host_confirm;
   const remindNeeded=!row.guest_remind||!row.host_remind;
   if(confirmNeeded)options.push(Math.max(now+1000,row.retry_at||now+1000));
   if(remindNeeded)options.push(Math.max(now+1000,Date.parse(row.start_iso)-15*60000,row.retry_at||0));
  }
  if(options.length)await this.ctx.storage.setAlarm(Math.min(...options));
 }
 async alarm(){
  const sql=this.ctx.storage.sql,now=Date.now();
  const rows=sql.exec('SELECT * FROM booking_messages').toArray();
  for(const row of rows){
   const start=Date.parse(row.start_iso);
   if(start+30*60000<now){sql.exec('DELETE FROM booking_messages WHERE id = ?',row.id);continue;}
   // A delayed alarm must never loop every second on a missed reminder.
   // Late reminders are skipped instead of sent after the meeting begins.
   if(now>=start){sql.exec('UPDATE booking_messages SET guest_remind=1,host_remind=1 WHERE id = ?',row.id);}
   if(now<row.retry_at)continue;
   const reminderDue=now>=start-15*60000&&now<start;
   let eventExists=true;
   if(reminderDue&&(!row.guest_remind||!row.host_remind)){
    try{
     const token=await userAccessToken(this.env);
     const url='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(this.env.GOOGLE_CALENDAR_ID)+'/events/'+encodeURIComponent(row.id);
     const response=await fetch(url,{headers:{Authorization:'Bearer '+token}});
     if(response.status===404||response.status===410)eventExists=false;
     else if(!response.ok)throw Error('Calendar reminder event check returned '+response.status);
     else{const event=await response.json();if(event.status==='cancelled')eventExists=false;}
    }catch(error){
     console.error('Reminder could not verify calendar event:',error?.message||'Unknown');
     sql.exec('UPDATE booking_messages SET retry_at = ?,retries = retries + 1 WHERE id = ?',now+60000,row.id);
     continue;
    }
   }
   if(!eventExists){sql.exec('DELETE FROM booking_messages WHERE id = ?',row.id);continue;}
   const data={id:row.id,start:row.start_iso,email:row.guest,name:row.name,meet_url:row.meet_url};
   let failed=false;
   for(const [column,to,host,reminder] of [
    ['guest_confirm',row.guest,false,false],['host_confirm',this.env.BOOKING_ORGANIZER_EMAIL,true,false],
    ['guest_remind',row.guest,false,true],['host_remind',this.env.BOOKING_ORGANIZER_EMAIL,true,true]
   ]){
    if(row[column]||(reminder&&!reminderDue))continue;
    if(reminder&&now>=start)continue;
    if(!reminder&&now>=start){sql.exec('UPDATE booking_messages SET '+column+' = 1 WHERE id = ?',row.id);continue;}
    try{
     const subject=reminder?'Your consultation starts in 15 minutes':host?'New portfolio consultation booking':'Your free consultation is confirmed';
     await gmailSend(this.env,to,subject,emailCopy(data,host,reminder),row.id+':'+column);
     sql.exec('UPDATE booking_messages SET '+column+' = 1,retry_at = 0,retries = 0 WHERE id = ?',row.id);
    }catch(error){
     failed=true;console.error('Gmail notification failed:',error?.message||'Unknown');
     break;
    }
   }
   if(failed){
    const retryDelay=Math.min(15,2**Math.min(row.retries,4))*60000;
    sql.exec('UPDATE booking_messages SET retry_at = ?,retries = retries + 1 WHERE id = ?',now+retryDelay,row.id);
   }else{
    const state=sql.exec('SELECT * FROM booking_messages WHERE id = ?',row.id).toArray()[0];
    if(state&&state.guest_confirm&&state.host_confirm&&state.guest_remind&&state.host_remind){
     sql.exec('DELETE FROM booking_messages WHERE id = ?',row.id);
    }
   }
  }
  await this.planAlarm();
 }
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  // The private Google OAuth flow is a navigation/redirect, NOT the public
  // cross-origin booking API. A Google consent callback may carry an Origin
  // different from the portfolio's allowed CORS origins; validate that flow
  // separately with admin password, PKCE, one-time state and HttpOnly cookie.
  if(path==='/admin/google'||path==='/admin/google/start'||path==='/api/oauth/callback'){
   return googleAdminRoute(request,env,path);
  }
  const origin=allowedOrigin(request,env);
  // CORS guards browser calls to the public booking API only.
  if(request.headers.has('Origin')&&!origin&&request.headers.get('Origin')!==new URL(request.url).origin)return respond({error:'Origin not permitted'},403);
  if(request.method==='OPTIONS'){
   if(!origin)return respond({error:'Origin not permitted'},403);
   const headers=new Headers(JSON_HEADERS);headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');headers.set('Access-Control-Max-Age','3600');
   return new Response(null,{status:204,headers});
  }
  // Human-friendly entry point: this host serves the API, not the booking UI.
  // Direct visitors to the actual Netlify-hosted calendar.
  if(path==='/'&&request.method==='GET'){
   return Response.redirect('https://pietroforestieri.propertydex.xyz/book',302);
  }
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
  if(path==='/api/calendar/oauth-check'&&request.method==='GET'){
   // Calendar metadata GET requires calendar.calendars(.readonly) or a broader
   // scope. Our intentionally narrow calendar.events scope permits events.list.
   // Distinguish token-refresh failure from Calendar access failure.
   if(!(await oauthReady(env)))return respond({
    oauthConnected:false,stage:'not_connected',error:'Google user OAuth is not configured'
   },503,origin);
   let token;
   try{
    token=await userAccessToken(env);
   }catch(error){
    console.error('Google OAuth token refresh check failed:',error?.message||'Unknown');
    return respond({
     oauthConnected:false,stage:'token_refresh',
     error:'Google authorization exists, but the access token could not be refreshed. Check Worker logs.'
    },503,origin);
   }
   const eventsUrl=new URL('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(env.GOOGLE_CALENDAR_ID)+'/events');
   eventsUrl.searchParams.set('maxResults','1');
   eventsUrl.searchParams.set('fields','kind,accessRole');
   try{
    const check=await fetch(eventsUrl.toString(),{headers:{Authorization:'Bearer '+token}});
    if(!check.ok){
     console.error('Google OAuth Calendar events.list check failed: HTTP '+check.status);
     return respond({
      oauthConnected:true,calendarAccess:false,stage:'calendar_events_access',googleStatus:check.status,
      error:'OAuth token refreshed successfully, but Calendar events access failed.'
     },503,origin);
    }
    return respond({
     oauthConnected:true,calendarAccess:true,calendarCheck:'events.list',
     gmailSendingNotYetTested:true,notificationsConfigured:await notificationReady(env)
    },200,origin);
   }catch(error){
    console.error('Google OAuth Calendar events.list network error:',error?.message||'Unknown');
    return respond({
     oauthConnected:true,calendarAccess:false,stage:'calendar_events_network',
     error:'OAuth token refreshed successfully, but the Calendar request could not complete.'
    },503,origin);
   }
  }
  if(path==='/health'&&request.method==='GET')return respond({ok:true,service:'portfolio-booking',googleConfigured:ready(env),bookingsEnabled:env.BOOKINGS_ENABLED==='true',meetCredentialsPresent:await oauthReady(env),notificationSettingsPresent:await notificationReady(env)},200,origin);
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

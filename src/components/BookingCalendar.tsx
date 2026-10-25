import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,ArrowUpRight,CalendarCheck,CalendarDays,Check,CheckCircle2,ChevronDown,Clock3,Globe2,Link2,LoaderCircle,RefreshCcw,ShieldCheck,Video} from 'lucide-react';
import './BookingCalendar.css';

type Slot={date:string;start:string;end:string;available:boolean};
type Reply={configured:boolean;week:string;days:string[];slots:Slot[];timezone:string;duration:number;startHour:number;endHour:number;message?:string;error?:string};
type Status='loading'|'ready'|'pending'|'error';
const calendarZone='America/New_York';
// Public Cloudflare Worker endpoint; Google credentials are NEVER sent to the browser.
const bookingAPI='https://booking.propertydex.xyz';
const zones=[{id:'America/New_York',label:'New York'},{id:'America/Los_Angeles',label:'Los Angeles'},{id:'Europe/London',label:'London'},{id:'Europe/Rome',label:'Rome'}];
const dayKey=(date:Date)=>{
 const pp=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:calendarZone}).formatToParts(date);
 const f=(name:string)=>pp.find(p=>p.type===name)?.value||'';
 return f('year')+'-'+f('month')+'-'+f('day');
};
const isoDate=(key:string)=>new Date(key+'T12:00:00Z');
const moveDays=(key:string,delta:number)=>{
 const date=isoDate(key);date.setUTCDate(date.getUTCDate()+delta);
 return date.toISOString().slice(0,10);
};
const monday=(key:string)=>{
 const day=isoDate(key),offset=(day.getUTCDay()+6)%7;
 return moveDays(key,-offset);
};
const initialWeek=()=>{const now=dayKey(new Date()),start=monday(now);return now>moveDays(start,4)?moveDays(start,7):start;};
const timeLabel=(iso:string,tz:string)=>new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));
const dateTitle=(day:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(isoDate(day));
const weekday=(day:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(isoDate(day));
const readable=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
const zoneLabel=(tz:string)=>{
 const part=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(new Date()).find(v=>v.type==='timeZoneName')?.value||'';
 return (zones.find(x=>x.id===tz)?.label||tz)+' ('+part+')';
};
const hourRows=(a:number,b:number)=>Array.from({length:Math.max(0,(b-a)*4)},(_,i)=>a*60+i*15);
const clock=(mins:number)=>String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');

export default function BookingCalendar(){
 const [duration,setDuration]=useState(30);
 const [zone,setZone]=useState<string>(calendarZone);
 const [week,setWeek]=useState(initialWeek);
 const [data,setData]=useState<Reply|null>(null);
 const [status,setStatus]=useState<Status>('loading');
 const [selected,setSelected]=useState<Slot|null>(null);
 const [sending,setSending]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [confirmed,setConfirmed]=useState<Slot|null>(null);
 const [refresh,setRefresh]=useState(0);
 const dates=useMemo(()=>Array.from({length:5},(_,i)=>moveDays(week,i)),[week]);
 const today=dayKey(new Date());
 useEffect(()=>{
  const controller=new AbortController();
  setStatus('loading');setSelected(null);setFeedback('');setConfirmed(null);
  fetch(bookingAPI+'/api/calendar/availability?week='+encodeURIComponent(week)+'&duration='+duration,{signal:controller.signal,cache:'no-store'})
   .then(async res=>{
    const json=await res.json() as Reply;
    if(!res.ok)throw Error(json.error||'Availability is temporarily unavailable.');
    setData(json);setStatus(json.configured?'ready':'pending');
   })
   .catch(err=>{if(!controller.signal.aborted){setData(null);setFeedback(err.message||'Cannot load the calendar.');setStatus('error');}});
  return()=>controller.abort();
 },[week,duration,refresh]);
 const cells=useMemo(()=>{
  const index=new Map<string,Slot>();
  for(const slot of data?.slots||[])index.set(slot.date+'|'+timeLabel(slot.start,calendarZone),slot);
  return index;
 },[data]);
 const rows=hourRows(data?.startHour||9,data?.endHour||17);
 const onConfirm=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!selected||sending)return;
  setSending(true);setFeedback('');
  const form=event.currentTarget;
  const values=new FormData(form);
  const body={name:String(values.get('name')||''),email:String(values.get('email')||''),company:String(values.get('company')||''),notes:String(values.get('notes')||''),website:String(values.get('website')||''),start:selected.start,end:selected.end,duration};
  try{
   const response=await fetch(bookingAPI+'/api/calendar/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok){
    setFeedback(result.error||'This time cannot be booked. Please choose another slot.');
    if(response.status===409){setSelected(null);setRefresh(v=>v+1);}
    return;
   }
   setConfirmed(selected);setSelected(null);form.reset();
   setFeedback('Appointment saved successfully to Google Calendar.');
   setRefreshAfterBooking(v=>v+1);
  }catch{setFeedback('Booking could not be confirmed. Please retry or use the contact form.');}
  finally{setSending(false);}
 };
 // Do not reset confirmation after the availability refresh.
 const [refreshAfterBooking,setRefreshAfterBooking]=useState(0);
 useEffect(()=>{
  if(!refreshAfterBooking)return;
  const controller=new AbortController();
  fetch(bookingAPI+'/api/calendar/availability?week='+encodeURIComponent(week)+'&duration='+duration,{signal:controller.signal,cache:'no-store'})
   .then(r=>r.ok?r.json():null).then(json=>{if(json?.configured)setData(json as Reply);}).catch(()=>{});
  return()=>controller.abort();
 },[refreshAfterBooking,week,duration]);
 const previousDisabled=week<=initialWeek();
 const nextDisabled=week>=monday(moveDays(today,45));
 return <div className="pfc-shell">
  <div className="pfc-topbar"><span className="pfc-booking-url"><Link2 size={14}/> PIETRO FORESTIERI / BOOK A CALL</span><span className="pfc-topbar-right"><ShieldCheck size={14}/> GOOGLE CALENDAR AVAILABILITY</span></div>
  <div className="pfc-layout">
   <aside className="pfc-info">
    <div className="pfc-identity"><img src="https://i.ibb.co/vvqkpWh8/trigosatconsulting.png" alt="Trigosat Consulting" onError={e=>{e.currentTarget.style.display='none';}}/><div><strong>Pietro Forestieri</strong><small>Project Management · AI · Real Estate</small><span><i/> Based in New York City</span></div></div>
    <div className="pfc-intro"><small>COMPLIMENTARY ONLINE CONSULTATION</small><h1>Your free consultation<span>.</span></h1><p>Tell me what you're building or where your business needs better systems. We'll explore practical next steps together — with no obligation.</p></div>
    <div className="pfc-config"><label id="pfc-duration-label">HOW LONG?</label><div className="pfc-duration" role="group" aria-labelledby="pfc-duration-label">{[15,30,45].map(min=><button type="button" key={min} aria-pressed={duration===min} className={duration===min?'is-active':''} onClick={()=>setDuration(min)}>{min} min</button>)}</div></div>
    <div className="pfc-config"><label htmlFor="pfc-timezone">SHOW TIMES IN</label><div className="pfc-zone-select"><Globe2 size={18}/><select id="pfc-timezone" value={zone} onChange={e=>setZone(e.target.value)}>{zones.map(item=><option value={item.id} key={item.id}>{zoneLabel(item.id)}</option>)}</select><ChevronDown size={17}/></div></div>
    <div className="pfc-footnotes"><span><Video size={18}/> Video-call details provided after confirmation</span><span><Clock3 size={18}/> Online · No commitment</span><span><ShieldCheck size={18}/> Only genuinely free calendar slots are bookable</span></div>
    <Link className="pfc-contact-alt" to="/contact">Prefer to write a message? <ArrowRight size={16}/></Link>
   </aside>
   <section className="pfc-schedule" aria-label="Appointment availability">
    <header className="pfc-schedule-heading">
     <div><small>PRIVATE BOOKING / LIVE AVAILABILITY</small><h2><CalendarDays size={25}/> Choose a time</h2><p>Times shown in <strong>{zoneLabel(zone)}</strong>. Date columns follow New York business days.</p></div>
     <div className="pfc-week-actions"><strong>{dateTitle(dates[0])} – {dateTitle(dates[4])}</strong><div><button type="button" onClick={()=>setWeek(initialWeek())}>Today</button><button type="button" disabled={previousDisabled} aria-label="Previous week" onClick={()=>setWeek(moveDays(week,-7))}><ArrowLeft size={17}/></button><button type="button" disabled={nextDisabled} aria-label="Next week" onClick={()=>setWeek(moveDays(week,7))}><ArrowRight size={17}/></button><button type="button" aria-label="Refresh availability" onClick={()=>setRefresh(v=>v+1)}><RefreshCcw size={16}/></button></div></div>
    </header>
    <div className="pfc-grid-wrap"><div className="pfc-timetable">
     <div className="pfc-table-head"><div className="pfc-corner">NY TIME</div>{dates.map(day=><div className={'pfc-table-day'+(today===day?' is-today':'')} key={day}><span>{weekday(day)}</span><strong>{isoDate(day).getUTCDate()}</strong></div>)}</div>
     <div className="pfc-table-scroll"><div className="pfc-table-body">
      {rows.map(min=> <div key={min} className="pfc-time-row">
       <span className="pfc-time-axis">{min%60===0?clock(min):''}</span>
       {dates.map(day=>{
        const slot=cells.get(day+'|'+clock(min));
        const active=selected?.start===slot?.start;
        const busy=slot&&!slot.available;
        const possible=slot?.available&&status==='ready';
        return <div className="pfc-slot-container" key={day+'-'+min}>
         <button type="button" disabled={!possible} title={possible?readable(slot.start,zone):busy?'Busy / unavailable':'Not available'} aria-label={(possible?'Book ':'Unavailable: ')+day+' '+clock(min)} aria-pressed={active} onClick={()=>{if(slot){setSelected(slot);setConfirmed(null);setFeedback('');}}} className={'pfc-time-slot'+(possible?' is-free':' is-unavailable')+(active?' is-selected':'')}>
          {status==='loading'?<span className="pfc-skeleton"/>:possible?<>{timeLabel(slot.start,zone)}</>:busy?<span className="pfc-busy">Busy</span>:<span className="pfc-dash">—</span>}
         </button>
        </div>;
       })}
      </div>)}
     </div></div>
    </div></div>
    {status==='pending'&&<div className="pfc-system-note" role="status"><CalendarDays size={19}/><div><strong>Calendar integration is ready for setup.</strong><p>Availability will appear here when the Google Calendar connection is configured in Cloudflare Workers. No unverified times can be selected.</p></div></div>}
    {status==='error'&&<div className="pfc-system-note is-error" role="alert"><div><strong>Calendar currently unavailable</strong><p>{feedback} <Link to="/contact">Send a message instead.</Link></p></div></div>}
    {status==='ready'&&!selected&&!confirmed&&<p className="pfc-calendar-hint"><CheckCircle2 size={16}/> Only available slots are selectable. Select a time to continue.</p>}
    {selected&&<div className="pfc-confirm-card" id="pfc-confirm-form"><div className="pfc-confirm-head"><div><small>STEP 02 / YOUR DETAILS</small><strong>{readable(selected.start,zone)} · {duration} min</strong></div><button onClick={()=>setSelected(null)} type="button" aria-label="Cancel selected time">Change time</button></div>
      <form onSubmit={onConfirm}><div className="pfc-fields"><label>YOUR NAME<input name="name" autoComplete="name" required maxLength={100}/></label><label>EMAIL ADDRESS<input name="email" type="email" autoComplete="email" required maxLength={200}/></label><label>COMPANY (OPTIONAL)<input name="company" autoComplete="organization" maxLength={120}/></label><label>TOPIC (OPTIONAL)<input name="notes" placeholder="What would you like to discuss?" maxLength={800}/></label></div><div className="pfc-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><p className="pfc-privacy">Your details are used to arrange this call and are stored with the calendar event.</p><button type="submit" className="pfc-book-cta" disabled={sending}>{sending?<><LoaderCircle className="pfc-spin" size={17}/> Confirming...</>:<>CONFIRM INTRO CALL <ArrowUpRight size={18}/></>}</button></form>
    </div>}
    {confirmed&&<div className="pfc-booking-success" role="status"><CalendarCheck size={29}/><div><strong>Appointment confirmed</strong><p>{readable(confirmed.start,zone)} · {duration} minutes. Saved to the organizer's Google Calendar. Video-call details will be arranged separately.</p></div></div>}
    {feedback&&!confirmed&&selected&&<p className="pfc-booking-error" role="alert">{feedback}</p>}
   </section>
  </div>
 </div>;
}

import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowUpRight,CalendarDays,FileText,LockKeyhole,ShieldCheck} from 'lucide-react';
import './PortfolioLegal.css';

type Kind='privacy'|'terms';
const updated='October 25, 2026';
function Heading({children}:{children:ReactNode}){return <h2>{children}</h2>}

export default function PortfolioLegal({kind}:{kind:Kind}){
 const privacy=kind==='privacy';
 return <div className="pfl-page">
  <div className="pfl-wrap">
   <div className="pfl-top"><Link to="/" className="pfl-back"><ArrowLeft size={16}/> BACK TO PORTFOLIO</Link><span><ShieldCheck size={15}/> PERSONAL PORTFOLIO / POLICY</span></div>
   <div className="pfl-hero">
    <span className="pfl-kicker">{privacy?'01 / PRIVACY & DATA':'02 / SERVICE CONDITIONS'}</span>
    <div className="pfl-hero-grid">
     <div><h1>{privacy?'Privacy Policy':'Terms of Use'}<em>.</em></h1><p>{privacy?'How personal information is handled when you contact me or book a consultation.':'Terms for exploring this independent professional portfolio and scheduling a complimentary introduction.'}</p></div>
     <div className="pfl-emblem">{privacy?<LockKeyhole size={47} strokeWidth={1.1}/>:<FileText size={47} strokeWidth={1.1}/>}<span>TRUST / CLARITY</span></div>
    </div>
    <span className="pfl-updated">Last updated: {updated}</span>
   </div>
   <article className="pfl-paper">
    {privacy?<>
     <Heading>1. Who operates this website</Heading>
     <p>This portfolio and its consultation-booking system are operated by Pietro Forestieri, an independent professional based in New York City, United States. To contact me about privacy or request information about your personal data, please use the <Link to="/contact">contact form</Link>.</p>
     <Heading>2. Information you choose to provide</Heading>
     <p>When you send an inquiry through the contact form, I may receive your name, email address, company, project category and message. When you request a consultation, I collect your name, email address, selected date and time, and any optional company or discussion details that you submit.</p>
     <p>Hosting and security providers may also process technical request information such as IP addresses, browser information and timestamps in their operational logs.</p>
     <Heading>3. Why the information is used</Heading>
     <p>Personal information is used to respond to inquiries, arrange and manage the requested consultation, prevent overlapping bookings, generate meeting details where configured, send relevant confirmations or reminders where enabled, and maintain the security and reliability of the website. It is not collected for sale or targeted advertising.</p>
     <Heading>4. Google Calendar, Meet and Gmail</Heading>
     <p>The booking system checks Google Calendar free/busy availability, creates events in the organizer's calendar and, where the organizer has authorized the required Google account permissions, can generate a Google Meet link and send Gmail confirmations and reminders to the organizer and booking guest.</p>
     <p>The visitor does not need to authorize their own Google account. The organizer's Google API access is used only for scheduling and directly related notifications, not for advertising, unrelated profiling or AI model training. Calendar event details may include the guest's submitted contact information and discussion topic.</p>
     <Heading>5. Service providers</Heading>
     <p>Services used to operate this website include Netlify (hosting), Cloudflare (DNS, booking processing and related storage), Google Calendar/Google Meet/Gmail (scheduling and communications), and Formspree (delivery of contact-form inquiries). Their services may process information needed for these functions in accordance with their respective terms and privacy notices.</p>
     <Heading>6. Retention and security</Heading>
     <p>Information is retained only for as long as reasonably needed for the inquiry, consultation, relevant records or applicable legal obligations. Booking notification records used to send reminders are removed by the booking system after completion or expiry; calendar events and messages may remain in the organizer's Google account until removed under applicable retention practices. Security measures include server-side processing and restricted secret credentials.</p>
     <Heading>7. Choices and requests</Heading>
     <p>You may contact me to request access, correction or deletion of information you provided, subject to applicable requirements and necessary records. You may also request that a consultation be canceled. For requests, use the <Link to="/contact">contact page</Link>. Any additional rights depend on your location and applicable law.</p>
     <Heading>8. Changes</Heading>
     <p>This policy may be updated as the website and its booking features evolve. The latest version and its date will be displayed on this page.</p>
    </>:<>
     <Heading>1. Website and purpose</Heading>
     <p>This site presents work, project case studies, digital experiments and professional services by Pietro Forestieri. Some project dashboards and interactive workflows are illustrative demonstrations and do not represent live client systems or guaranteed outcomes.</p>
     <Heading>2. Free introductory consultation</Heading>
     <p>The scheduling interface offers a complimentary 30-minute introductory call, subject to genuine calendar availability. Selecting an available time and submitting booking details requests an appointment; confirmation appears after the booking system successfully records it. No payment is required for the introduction.</p>
     <Heading>3. Meeting logistics</Heading>
     <p>Calls are arranged online. Where enabled, a Google Meet URL and reminder emails are provided after a booking is confirmed; otherwise meeting details may be coordinated separately. Please provide a valid email address so I can contact you. Delivery of third-party emails and availability of Google services cannot be guaranteed at an exact time.</p>
     <Heading>4. No service agreement by booking</Heading>
     <p>An introductory call does not create an employment, consulting, agency, property brokerage or other contractual engagement. Any subsequent professional services, scope, responsibilities and fees must be agreed separately in writing.</p>
     <Heading>5. Website content</Heading>
     <p>Portfolio designs, descriptions, demonstration scenarios and other materials are for informational purposes. They may change without advance notice. Third-party brands, screenshots and product names remain the property of their respective owners. Do not misrepresent the site's materials as your own work.</p>
     <Heading>6. Availability and cancellation</Heading>
     <p>If you can no longer attend a scheduled call, please contact me as soon as practical via the <Link to="/contact">contact page</Link>. I may contact you to reschedule or cancel when necessary. Please do not submit automated or abusive bookings.</p>
     <Heading>7. Privacy</Heading>
     <p>Details submitted through forms or booking are processed as described in the <Link to="/privacy">Privacy Policy</Link>.</p>
     <Heading>8. Contact and updates</Heading>
     <p>For questions about the site or appointments, use the <Link to="/contact">contact form</Link>. These terms may be revised; the current revision date appears above.</p>
    </>}
   </article>
   <div className="pfl-end">
    <div><CalendarDays size={20}/><span><strong>Have a project worth discussing?</strong><small>Schedule a complimentary 30-minute introduction.</small></span></div>
    <Link to="/book">BOOK A FREE CONSULTATION <ArrowUpRight size={16}/></Link>
   </div>
   <nav className="pfl-links" aria-label="Legal pages"><Link to="/privacy" aria-current={privacy?'page':undefined}>Privacy Policy</Link><Link to="/terms" aria-current={!privacy?'page':undefined}>Terms of Use</Link><Link to="/contact">Contact</Link></nav>
  </div>
 </div>;
}

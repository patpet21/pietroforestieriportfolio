/**
 * Email-safe portfolio branding. All visitor-provided fields are escaped.
 * Tables + inline styles are intentional for Gmail, Outlook and mobile email apps.
 * Images remain remote as supplied by the site owner; emails also work with images off.
 */
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const products=[
 {label:'PROPERTYDEX FRAMEWORK',img:'https://i.ibb.co/BVqjwjPR/Chat-GPT-Image-Sep-29-2026-04-14-19-PM.png',url:'https://framework.propertydex.xyz/?open=signup'},
 {label:'AI PM LAB',img:'https://i.ibb.co/GQ9DT4VT/Chat-GPT-Image-Sep-29-2026-04-13-05-PM.png',url:'https://aipmlab.propertydex.xyz/'},
 {label:'PRIVACYGATE',img:'https://i.ibb.co/KxpLWHVh/Chat-GPT-Image-Sep-29-2026-04-09-05-PM.png',url:'https://privacygate.propertydex.xyz/'}
];
const channels=[
 {label:'MICROSOFT STORE',img:'https://i.ibb.co/vCyFHYFx/Microsoft-Store.png',url:'https://apps.microsoft.com/detail/9nmpzcvjllz3?hl=it-IT&gl=US&ocid=pdpshare'},
 {label:'EDGE EXTENSION',img:'https://i.ibb.co/Cpqygzmt/edge-extension.png',url:'https://microsoftedge.microsoft.com/addons/detail/privacygate-browser-prote/lbdkbiflhmlalbcblmglmccmmajnhfbd'},
 {label:'GMAIL ADD-ON',img:'https://i.ibb.co/xtxNvqd2/gmail-addon.png',url:'https://workspace.google.com/marketplace/app/privacygate/817932149819?flow_type=2'}
];
const website='https://pietroforestieri.propertydex.xyz/';
const logo='https://pietroforestieri.propertydex.xyz/project-media/trigosat-logo.webp';
const card = (item,small) => `<td width="33.333%" valign="top" style="padding:3px"><a href="${esc(item.url)}" style="display:block;text-decoration:none;color:#d1ddda;background:#182722;border:1px solid #315647;border-radius:10px;padding:${small?'8px 4px':'12px 5px'};text-align:center;font:700 ${small?'9px':'10px'} Arial,sans-serif;letter-spacing:.45px" target="_blank"><img src="${esc(item.img)}" alt="${esc(item.label)}" width="${small?42:64}" height="${small?42:64}" style="display:block;margin:0 auto 7px;max-width:100%;height:${small?42:64}px;width:${small?42:64}px;object-fit:contain;border:0;border-radius:6px"><span style="font-size:${small?9:10}px">${esc(item.label)}</span></a></td>`;
const signature=()=>{
 return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #365445;margin-top:28px;padding-top:22px"><tr><td style="padding:8px 0 15px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="62" valign="middle" style="padding-right:13px"><a href="${website}"><img src="${logo}" width="52" height="52" alt="Trigosat Consulting" style="width:52px;height:52px;border-radius:9px;object-fit:contain;border:1px solid #846d48"></a></td><td valign="middle"><div style="font:700 18px Arial,sans-serif;color:#f9f6ef">Pietro Forestieri</div><div style="font:12px Arial,sans-serif;color:#a9cabb;padding-top:5px">Civil Engineer · Project Management &amp; AI</div><div style="font:11px Arial,sans-serif;color:#d6b77f;padding-top:5px">Founder &amp; CEO · Trigosat Consulting · PropertyDEX · PrivacyGate</div><a href="${website}" style="font:11px Arial,sans-serif;color:#a2e8c4;text-decoration:none">Explore my work ↗</a></td></tr></table></td></tr><tr><td style="color:#89ac9a;font:10px Arial,sans-serif;padding:0 0 10px;letter-spacing:1.4px">SELECTED DIGITAL PRODUCTS</td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${products.map(p=>card(p,false)).join('')}</tr></table></td></tr><tr><td style="color:#89ac9a;font:10px Arial,sans-serif;padding:15px 0 8px;letter-spacing:1.4px">PRIVACYGATE · OFFICIAL DISTRIBUTION</td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${channels.map(p=>card(p,true)).join('')}</tr></table></td></tr></table>`;
};
const fmt=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
const meetLink=url=>/^https:\/\/meet\.google\.com\/[a-zA-Z0-9-]+(?:[?][a-zA-Z0-9=&_-]+)?$/.test(String(url??''))?String(url):null;
const detailRow=(label,value)=>`<tr><td valign="top" style="padding:8px 0;color:#92bbaa;font:11px Arial,sans-serif;letter-spacing:.6px;width:100px">${label}</td><td style="padding:8px 0;color:#f1f8f2;font:600 14px Arial,sans-serif">${esc(value)}</td></tr>`;
const template=(data,host,reminder)=>{
 const date=fmt(data.start);
 const first=host?'Pietro':String(data.name||'there').trim().split(/\s+/)[0];
 const heading=reminder?'Your call starts in 15 minutes.':host?'A new consultation is booked.':'Your consultation is confirmed.';
 const intro=host
  ? reminder?'Your portfolio consultation is about to begin.':'A new visitor has reserved a free 30-minute consultation on your portfolio.'
  : reminder?'It is almost time for our conversation. Here is your private meeting link.':'Thank you for booking a complimentary consultation. Your meeting information is below.';
 const meet=meetLink(data.meet_url);
 const action=meet?`<a href="${esc(meet)}" style="display:inline-block;background:#8cf0b4;color:#082519;border-radius:9px;padding:17px 30px;font:800 14px Arial,sans-serif;text-decoration:none;text-align:center">JOIN GOOGLE MEET &nbsp; ↗</a>`:'<span style="color:#b1c4ba;font:13px Arial,sans-serif">Meeting details will follow separately.</span>';
 const detailRows=[
  detailRow('DATE &amp; TIME',date),
  detailRow('DURATION','30 minutes'),
  ...(host?[detailRow('GUEST',data.name),detailRow('EMAIL',data.email),
     ...(data.company?[detailRow('COMPANY',data.company)]:[]),
     ...(data.notes?[detailRow('TOPIC',data.notes)]:[])]:[])
 ].join('');
 const preheader=reminder?'Your Google Meet link for the call starting shortly.':'Your 30-minute online appointment and private Google Meet link.';
 const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head><body style="margin:0;padding:0;background:#edf1ed;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;color:transparent">${esc(preheader)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#edf1ed"><tr><td align="center" style="padding:34px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#101b17;border:1px solid #a88d61;border-radius:18px;overflow:hidden"><tr><td style="padding:25px 32px;border-bottom:1px solid #385142;background:#14231d"><table role="presentation" width="100%"><tr><td style="font:bold 13px Arial,sans-serif;color:#f9f6ef;letter-spacing:2px">PF<span style="color:#d7ba80"> / </span>PIETRO FORESTIERI</td><td align="right" style="font:10px Arial,sans-serif;color:#b3d9be;letter-spacing:1px">PRIVATE BOOKING</td></tr></table></td></tr><tr><td style="padding:35px 32px 28px"><div style="font:700 11px Arial,sans-serif;letter-spacing:2px;color:#9becbd;margin-bottom:16px">${reminder?'15 MINUTE REMINDER':'BOOKING CONFIRMATION'}</div><h1 style="font:700 30px/1.2 Arial,sans-serif;letter-spacing:-.8px;color:#fff;margin:0 0 18px">${esc(heading)}</h1><p style="font:15px/1.7 Arial,sans-serif;color:#c8d9ce;margin:0 0 26px">Hello ${esc(first)},<br>${esc(intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #37604d;border-radius:12px;background:#192c23;padding:15px 18px;margin:0 0 27px">${detailRows}</table><div style="text-align:center;margin:0 0 15px">${action}</div><p style="text-align:center;color:#adc3b5;font:12px/1.5 Arial,sans-serif;margin:0">${reminder?'This is your 15-minute reminder.':'Save this email. We will send another reminder about 15 minutes before your call.'}</p>${signature()}</td></tr><tr><td style="background:#0a130f;color:#8da89a;padding:21px 32px;font:11px/1.6 Arial,sans-serif;text-align:center">Complimentary 30-minute online consultation · New York City<br><a href="${website}" style="color:#a1d9b5">pietroforestieri.propertydex.xyz</a><br>This is an automated appointment message.</td></tr></table></td></tr></table></body></html>`;
 const lines=[
  host?(reminder?'Your portfolio consultation begins in 15 minutes.':'A guest has booked a portfolio consultation.'):(reminder?'Your free consultation begins in 15 minutes.':'Your free consultation is confirmed.'),
  '', 'Hello '+first+',','',intro,'',
  'When: '+date,'Duration: 30 minutes',
  ...(host?['Guest: '+data.name,'Guest email: '+data.email,...(data.company?['Company: '+data.company]:[]),...(data.notes?['Discussion topic: '+data.notes]:[])]:[]),
  meet?'Join Google Meet: '+meet:'Google Meet details will be provided separately.',
  '',reminder?'Please join using the link above.':'Keep this email. A reminder is scheduled around 15 minutes before the call.',
  '', 'Pietro Forestieri | Civil Engineer · Project Management & AI','Trigosat Consulting | PropertyDEX | PrivacyGate',
  website,'',
  'Products:',...products.map(v=>v.label+': '+v.url),
  'PrivacyGate distribution:',...channels.map(v=>v.label+': '+v.url)
 ];
 return {html,text:lines.join('\n')};
};
export const bookingEmail=template;

/**
 * One-time Google account authorization for Pietro Portfolio.
 * OAuth credentials and administrator password are Cloudflare Secrets only.
 * The refresh token is AES-GCM encrypted in a dedicated SQLite Durable Object.
 */
import {DurableObject} from 'cloudflare:workers';

const REDIRECT_URI='https://booking.propertydex.xyz/api/oauth/callback';
const ADMIN_ORIGIN='https://booking.propertydex.xyz';
const AUTH_SCOPES=[
 'openid','email',
 'https://www.googleapis.com/auth/calendar.events',
 'https://www.googleapis.com/auth/gmail.send'
];
const TTL=10*60*1000;
const textEncoder=new TextEncoder();
const sessionHeaders={
 'Cache-Control':'no-store, private',
 'Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};
const bytesToB64url=(buf)=>{
 let data='';for(const x of new Uint8Array(buf))data+=String.fromCharCode(x);
 return btoa(data).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
};
const b64urlToBytes=(v)=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4)),c=>c.charCodeAt(0));
const randomToken=()=>bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
const sha256=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode(text)));
const makeChallenge=async verifier=>bytesToB64url(await sha256(verifier));
const safeEqual=async(a,b)=>{
 if(!a||!b||typeof a!=='string'||typeof b!=='string')return false;
 const [da,db]=await Promise.all([sha256(a),sha256(b)]);
 let diff=0;
 for(let i=0;i<da.length;i++)diff|=da[i]^db[i];
 return diff===0;
};
const configured=env=>!!(env.GOOGLE_OAUTH_CLIENT_ID&&env.GOOGLE_OAUTH_CLIENT_SECRET&&env.BOOKING_ORGANIZER_EMAIL&&env.OAUTH_SETUP_TOKEN&&env.OAUTH_VAULT);
const vault=env=>env.OAUTH_VAULT.getByName('pietro-google-owner-v1');
const htmlResponse=(title,body,status=200,headers={})=>new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111b17;color:#f5eeda;font:16px/1.55 system-ui,sans-serif;padding:20px;box-sizing:border-box}main{width:min(540px,100%);background:#1a2921;border:1px solid #bfa16a;border-radius:18px;padding:clamp(22px,5vw,36px);box-shadow:0 20px 70px #0008}h1{font-size:clamp(24px,5vw,34px);margin:5px 0;color:#ecf9ee}p{color:#c4d0c3}label{display:block;margin:24px 0 8px;color:#e8d4a0;font-size:13px}input{width:100%;box-sizing:border-box;border:1px solid #6a9278;border-radius:8px;background:#0c1612;color:white;padding:14px;font:inherit}button{width:100%;background:#cead75;color:#18231b;border:0;border-radius:8px;padding:14px;font-weight:800;cursor:pointer;margin-top:14px}small{display:block;color:#a8bba9;margin-top:16px}a{color:#b8e4ba}</style><main>'+body+'</main></html>',{
 status,headers:{'Content-Type':'text/html; charset=utf-8',...sessionHeaders,...headers}
});
const notConfigured=()=>htmlResponse('Not configured','<h1>Google setup not ready</h1><p>First add your OAuth client ID, client secret, organizer email and a random OAuth setup password to Cloudflare Variables and Secrets.</p>',503);
const invalid=()=>htmlResponse('Not authorized','<h1>Authorization not available</h1><p>The setup request is invalid or expired. Return to the setup page and start again.</p><a href="/admin/google">Try again</a>',403);

export class GoogleOAuthVault extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.env=env;
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS oauth_pending (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, browser_nonce TEXT NOT NULL, expires INTEGER NOT NULL)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS oauth_tokens (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL, email TEXT NOT NULL)');
 }
 async key(){
  if(!this.env.OAUTH_SETUP_TOKEN)throw Error('OAuth vault encryption not configured');
  const digest=await sha256('pietro-portfolio-oauth-vault:v1:'+this.env.OAUTH_SETUP_TOKEN);
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
 }
 async begin(state,verifier,nonce){
  const now=Date.now();
  this.ctx.storage.sql.exec('DELETE FROM oauth_pending WHERE expires < ?',now);
  const recent=this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM oauth_pending').one();
  if(recent.n>=4)throw Error('Too many pending setup attempts');
  this.ctx.storage.sql.exec('INSERT INTO oauth_pending(state,verifier,browser_nonce,expires) VALUES (?,?,?,?)',state,verifier,nonce,now+TTL);
 }
 async consume(state,nonce){
  const result=this.ctx.storage.sql.exec('SELECT verifier,browser_nonce,expires FROM oauth_pending WHERE state = ?',state).one();
  if(result)this.ctx.storage.sql.exec('DELETE FROM oauth_pending WHERE state = ?',state);
  if(!result||Date.now()>result.expires||!(await safeEqual(nonce,result.browser_nonce)))return null;
  return result.verifier;
 }
 async saveToken(token,email){
  if(!token||!email)throw Error('Missing OAuth refresh token');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await this.key(),textEncoder.encode(token));
  const envelope=bytesToB64url(iv)+'.'+bytesToB64url(encrypted);
  this.ctx.storage.sql.exec('INSERT INTO oauth_tokens (id,encrypted,email) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted,email=excluded.email','owner',envelope,email);
 }
 async hasToken(){return !!this.ctx.storage.sql.exec("SELECT id FROM oauth_tokens WHERE id='owner'").one();}
 async readToken(){
  const row=this.ctx.storage.sql.exec("SELECT encrypted FROM oauth_tokens WHERE id='owner'").one();
  if(!row)return null;
  const [iv,ciphertext]=row.encrypted.split('.');
  const opened=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64urlToBytes(iv)},await this.key(),b64urlToBytes(ciphertext));
  return new TextDecoder().decode(opened);
 }
}

export const googleOAuthConfigured=configured;
export async function googleOAuthReady(env){
 if(!env.GOOGLE_OAUTH_CLIENT_ID||!env.GOOGLE_OAUTH_CLIENT_SECRET)return false;
 if(env.GOOGLE_OAUTH_REFRESH_TOKEN)return true; // Legacy secret, if present.
 if(!configured(env))return false;
 return vault(env).hasToken();
}
export async function googleNotificationsReady(env){
 return await googleOAuthReady(env) && env.EMAIL_NOTIFICATIONS_ENABLED==='true' && !!env.BOOKING_ORGANIZER_EMAIL;
}
export async function storedGoogleRefreshToken(env){
 if(env.GOOGLE_OAUTH_REFRESH_TOKEN)return env.GOOGLE_OAUTH_REFRESH_TOKEN;
 if(!configured(env))return null;
 return vault(env).readToken();
}
export async function googleAdminRoute(request,env,path){
 if(!['/admin/google','/admin/google/start','/api/oauth/callback'].includes(path))return null;
 if(path==='/admin/google'&&request.method==='GET'){
  if(!configured(env))return notConfigured();
  const status=new URL(request.url).searchParams.get('status');
  const message=status==='connected'?'<p style="color:#a4f3b8">Google authorization stored successfully. Your next step is to test Calendar and Gmail before enabling automated emails.</p>':status==='error'?'<p style="color:#ffcc9d">Authorization could not be completed. Check the Worker logs and retry.</p>':'<p>Authorize only your own Google account to generate Meet links and send appointment emails.</p>';
  return htmlResponse('Pietro · Authorize Google','<small>PIETRO FORESTIERI / ADMIN SETUP</small><h1>Connect Google</h1>'+message+'<form action="/admin/google/start" method="post"><label for="code">Your Cloudflare OAuth setup password</label><input id="code" type="password" name="setup_token" autocomplete="off" minlength="24" required><button type="submit">AUTHORIZE GOOGLE</button></form><small>Your setup password is never included in a URL or written to GitHub. Google authorization is restricted to the organizer account.</small>');
 }
 if(path==='/admin/google/start'&&request.method==='POST'){
  if(!configured(env))return notConfigured();
  if(request.headers.get('Origin')!==ADMIN_ORIGIN)return invalid();
  if(Number(request.headers.get('Content-Length')||0)>2048)return invalid();
  const raw=await request.text();
  if(raw.length>2048)return invalid();
  const form=new URLSearchParams(raw);
  if(!(await safeEqual(form.get('setup_token'),env.OAUTH_SETUP_TOKEN)))return invalid();
  const state=randomToken(),verifier=randomToken(),browserNonce=randomToken();
  try{await vault(env).begin(state,verifier,browserNonce)}
  catch(error){console.error('OAuth start failed:',error?.message||'Unknown');return invalid();}
  const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for(const [key,value] of Object.entries({
   response_type:'code',client_id:env.GOOGLE_OAUTH_CLIENT_ID,redirect_uri:REDIRECT_URI,
   scope:AUTH_SCOPES.join(' '),access_type:'offline',prompt:'consent',
   state,code_challenge:await makeChallenge(verifier),code_challenge_method:'S256',
   login_hint:env.BOOKING_ORGANIZER_EMAIL
  }))auth.searchParams.set(key,value);
  return new Response(null,{status:303,headers:{
   ...sessionHeaders,'Location':auth.toString(),
   'Set-Cookie':'pf_oauth_session='+browserNonce+'; HttpOnly; Secure; SameSite=Lax; Path=/api/oauth/callback; Max-Age=600'
  }});
 }
 if(path==='/api/oauth/callback'&&request.method==='GET'){
  const url=new URL(request.url);
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  const cookie=request.headers.get('Cookie')||'';
  const match=/(?:^|;\s*)pf_oauth_session=([A-Za-z0-9_-]+)/.exec(cookie);
  const nonce=match?.[1]||'';
  const clear='pf_oauth_session=; HttpOnly; Secure; SameSite=Lax; Path=/api/oauth/callback; Max-Age=0';
  const bounce=(result)=>new Response(null,{status:303,headers:{...sessionHeaders,Location:'/admin/google?status='+result,'Set-Cookie':clear}});
  if(!configured(env)||!state||!code||!nonce||url.searchParams.has('error'))return bounce('error');
  const verifier=await vault(env).consume(state,nonce);
  if(!verifier)return bounce('error');
  try{
   const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
     client_id:env.GOOGLE_OAUTH_CLIENT_ID,client_secret:env.GOOGLE_OAUTH_CLIENT_SECRET,
     code,code_verifier:verifier,redirect_uri:REDIRECT_URI,grant_type:'authorization_code'
    })
   });
   const tokens=await tokenResponse.json();
   if(!tokenResponse.ok||!tokens.access_token||!tokens.refresh_token)throw Error('Google OAuth exchange failed');
   const granted=String(tokens.scope||'').split(/\s+/);
   for(const needed of AUTH_SCOPES.slice(2))if(!granted.includes(needed))throw Error('Requested Google scopes were not granted');
   const identityResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
    headers:{Authorization:'Bearer '+tokens.access_token}
   });
   const identity=await identityResponse.json();
   if(!identityResponse.ok||identity.email_verified!==true||String(identity.email||'').toLowerCase()!==String(env.BOOKING_ORGANIZER_EMAIL).trim().toLowerCase()){
    throw Error('Authorized account does not match configured organizer');
   }
   // Store only refresh token ciphertext. Access/id tokens are not persisted.
   await vault(env).saveToken(tokens.refresh_token,identity.email);
   return bounce('connected');
  }catch(error){
   console.error('OAuth callback failed:',error?.message||'Unknown');
   return bounce('error');
  }
 }
 return new Response('Method not allowed',{status:405,headers:sessionHeaders});
}

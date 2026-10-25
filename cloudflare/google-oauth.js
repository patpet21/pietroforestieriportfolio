/**
 * One-time Google account authorization for Pietro Portfolio.
 * OAuth credentials and signing/encryption key are Cloudflare Secrets only.
 * The refresh token is AES-GCM encrypted in a dedicated SQLite Durable Object.
 */
import {DurableObject} from 'cloudflare:workers';

const REDIRECT_URI='https://booking.propertydex.xyz/api/oauth/callback';
// Cookie-free setup uses short-lived AES-GCM authenticated tokens.
// No form/session DB writes. Only the OAuth refresh token uses Durable Object
// SQLite storage, encrypted with a separate purpose-bound key.
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
/** Authenticated short-lived setup token. No browser cookies, DB or client-held secret. */
const authKey=async(secret,purpose)=>crypto.subtle.importKey(
 'raw',await sha256('pietro-portfolio-session:v2:'+purpose+':'+secret),
 {name:'AES-GCM'},false,['encrypt','decrypt']
);
const seal=async(secret,purpose,data)=>{
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt(
  {name:'AES-GCM',iv,additionalData:textEncoder.encode(purpose)},
  await authKey(secret,purpose),textEncoder.encode(JSON.stringify({...data,exp:Date.now()+TTL}))
 );
 return bytesToB64url(iv)+'.'+bytesToB64url(encrypted);
};
const unseal=async(secret,purpose,value)=>{
 if(typeof value!=='string'||!/^[-_A-Za-z0-9]{16}\.[-_A-Za-z0-9]{40,2048}$/.test(value))return null;
 const [ivText,bodyText]=value.split('.');
 try{
  const plain=await crypto.subtle.decrypt(
   {name:'AES-GCM',iv:b64urlToBytes(ivText),additionalData:textEncoder.encode(purpose)},
   await authKey(secret,purpose),b64urlToBytes(bodyText)
  );
  const obj=JSON.parse(new TextDecoder().decode(plain));
  return obj&&Number.isFinite(obj.exp)&&Date.now()<=obj.exp&&obj.exp-Date.now()<=TTL?obj:null;
 }catch{return null;}
};

const configured=env=>!!(env.GOOGLE_OAUTH_CLIENT_ID&&env.GOOGLE_OAUTH_CLIENT_SECRET&&env.BOOKING_ORGANIZER_EMAIL&&env.OAUTH_SETUP_TOKEN&&env.OAUTH_VAULT);
const vault=env=>env.OAUTH_VAULT.getByName('pietro-google-owner-v1');
const htmlResponse=(title,body,status=200,headers={})=>new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111b17;color:#f5eeda;font:16px/1.55 system-ui,sans-serif;padding:20px;box-sizing:border-box}main{width:min(540px,100%);background:#1a2921;border:1px solid #bfa16a;border-radius:18px;padding:clamp(22px,5vw,36px);box-shadow:0 20px 70px #0008}h1{font-size:clamp(24px,5vw,34px);margin:5px 0;color:#ecf9ee}p{color:#c4d0c3}label{display:block;margin:24px 0 8px;color:#e8d4a0;font-size:13px}input{width:100%;box-sizing:border-box;border:1px solid #6a9278;border-radius:8px;background:#0c1612;color:white;padding:14px;font:inherit}button,.connect-btn{display:block;box-sizing:border-box;width:100%;background:#cead75;color:#18231b;border:0;border-radius:8px;padding:14px;font-weight:800;cursor:pointer;margin-top:14px;text-align:center;text-decoration:none}small{display:block;color:#a8bba9;margin-top:16px}a{color:#b8e4ba}</style><main>'+body+'</main></html>',{
 status,headers:{'Content-Type':'text/html; charset=utf-8',...sessionHeaders,...headers}
});
const notConfigured=()=>htmlResponse('Not configured','<h1>Google setup not ready</h1><p>First add your OAuth client ID, client secret, organizer email and a random OAuth setup password to Cloudflare Variables and Secrets.</p>',503);
const invalid=(code='request')=>{
 const reasons={
  origin:'The browser did not pass the expected security check. Open the authorization page directly.',
  csrf:'The secure authorization form is invalid or has expired. Open Connect Google again.',
  large:'The submitted form was too large. Reload the setup page and try again.',
  password:'The setup password did not match the OAUTH_SETUP_TOKEN secret in Cloudflare. Check the exact saved value; do not paste it into chat.',
  vault:'The Cloudflare OAuth vault could not create a one-time authorization request. Check Worker Observability logs.',
  request:'This authorization request could not be accepted.'
 };
 return htmlResponse('Google setup error','<h1>Authorization could not start</h1><p>'+reasons[code]+'</p><a href="/admin/google">Return to Google setup</a>',403);
};

export class GoogleOAuthVault extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.env=env;
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS oauth_tokens (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL, email TEXT NOT NULL)');
 }
 async key(){
  if(!this.env.OAUTH_SETUP_TOKEN)throw Error('OAuth vault encryption not configured');
  const digest=await sha256('pietro-portfolio-oauth-vault:v1:'+this.env.OAUTH_SETUP_TOKEN);
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
 }
 async saveToken(token,email){
  if(!token||!email)throw Error('Missing OAuth refresh token');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await this.key(),textEncoder.encode(token));
  const envelope=bytesToB64url(iv)+'.'+bytesToB64url(encrypted);
  this.ctx.storage.sql.exec('INSERT INTO oauth_tokens (id,encrypted,email) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted,email=excluded.email','owner',envelope,email);
 }
 async hasToken(){return !!this.ctx.storage.sql.exec("SELECT id FROM oauth_tokens WHERE id='owner'").toArray()[0];}
 async readToken(){
  const row=this.ctx.storage.sql.exec("SELECT encrypted FROM oauth_tokens WHERE id='owner'").toArray()[0];
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
  // Account selection and consent are performed entirely by Google.
  // There are no password fields, cookies, setup forms or CSRF form tokens.
  return htmlResponse('Pietro · Connect Google','<small>PIETRO FORESTIERI / GOOGLE ACCOUNT</small><h1>Connect Google</h1>'+message+'<p>Click below, select your Google account and approve Calendar and Gmail access. Only the configured organizer account can complete the connection.</p><a class="connect-btn" href="/admin/google/start">CONNECT WITH GOOGLE</a><small>GOOGLE CONNECTION V4 · ONE CLICK · NO PASSWORD<br>Secure OAuth state, PKCE and Google account identity verification protect the connection.</small>'.replace('<br>',' — '));
 }
 if(path==='/admin/google/start'&&request.method==='GET'){
  if(!configured(env))return notConfigured();
  // Public entrypoint is safe: the callback will persist credentials ONLY
  // if Google's verified identity matches BOOKING_ORGANIZER_EMAIL.
  // OAuth 2.0 state is purpose-bound AES-GCM encrypted and expires in 10 min.
  const verifier=randomToken();
  // OAuth state stores the private PKCE verifier only as AES-GCM ciphertext.
  // Google's authorization code can be exchanged only once.
  const state=await seal(env.OAUTH_SETUP_TOKEN,'oauth-state',{verifier,nonce:randomToken()});
  const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for(const [key,value] of Object.entries({
   response_type:'code',client_id:env.GOOGLE_OAUTH_CLIENT_ID,redirect_uri:REDIRECT_URI,
   scope:AUTH_SCOPES.join(' '),access_type:'offline',prompt:'select_account consent',
   state,code_challenge:await makeChallenge(verifier),code_challenge_method:'S256'
  }))auth.searchParams.set(key,value);
  return new Response(null,{status:303,headers:{...sessionHeaders,'Location':auth.toString()}});
 }
 if(path==='/api/oauth/callback'&&request.method==='GET'){
  const url=new URL(request.url);
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  const bounce=(result)=>new Response(null,{status:303,headers:{...sessionHeaders,Location:'/admin/google?status='+result}});
  if(!configured(env)||!state||!code||url.searchParams.has('error'))return bounce('error');
  // Authenticated, time-limited encrypted OAuth state + PKCE.
  // No cookies or Durable Object session state. Google code is one-time.
  const sealedState=await unseal(env.OAUTH_SETUP_TOKEN,'oauth-state',state);
  const verifier=sealedState?.verifier;
  if(typeof verifier!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(verifier)||
     typeof sealedState.nonce!=='string'||sealedState.nonce.length!==43)return bounce('error');
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

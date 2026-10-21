import { Store } from '../snapshots/sites-adapter-0.1.0-sites.8/src/store.ts';
import { Feishu } from '../snapshots/sites-adapter-0.1.0-sites.8/src/feishu.ts';
import { Vault, aad, assert, hash, random, boundedText, type Env, type Principal } from '../snapshots/sites-adapter-0.1.0-sites.8/src/security.ts';
type DeviceEnv = Env & { STANDALONE_AUTH_FLOW?: string };
const headers = { 'Cache-Control':'no-store', 'Referrer-Policy':'same-origin', 'Content-Type':'text/html; charset=utf-8', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" };
const escape = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const page = (s:string,status=200) => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>飞书设备码授权</title>'+s,{status,headers});
async function form(request:Request) { assert(request.headers.get('content-type')?.split(';')[0] === 'application/x-www-form-urlencoded'); return new URLSearchParams(await boundedText(new Response(request.body),16000)); }
async function json(r:Response) { const d=JSON.parse(await boundedText(r,100000)); assert(d && typeof d==='object','provider_response_invalid',502);return d; }
export async function providerTransport(env:DeviceEnv,url:string,init?:RequestInit):Promise<Response> {
 if (env.STANDALONE_AUTH_FLOW==='device' && url==='https://open.feishu.cn/open-apis/authen/v2/oauth/token') {
  const args=JSON.parse(String(init?.body));assert(args.grant_type==='refresh_token','device_mode_requires_device_login');
  return fetch('https://accounts.feishu.cn/oauth/v3/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(args).toString(),redirect:'manual',signal:AbortSignal.timeout(10000)});
 }
 return fetch(url,init);
}
export async function deviceAuth(request:Request,env:DeviceEnv,p:Principal,browserProof:string):Promise<Response> {
 assert(env.STANDALONE_AUTH_FLOW==='device','device_mode_not_enabled',404);
 const path=new URL(request.url).pathname, vault=new Vault(env.APP_ENCRYPTION_KEY), store=new Store(env.DB);
 const binding=aad(p,'device-flow',await hash(browserProof));
 const scopes=env.FEISHU_OAUTH_SCOPES??['docx:document:readonly','offline_access'];
 assert(scopes.length>0&&scopes.includes('offline_access'));
 if(path==='/device-login' && request.method==='GET') {
  const csrf=await vault.seal({expires:Date.now()+600000},aad(p,'device-csrf',await hash(browserProof)));
  return page('<h1>连接自己的飞书</h1><p>使用飞书官方设备码授权，无需修改应用回调。请核对申请的权限：'+escape(scopes.join('、'))+'</p><form method="post" action="/api/device/start"><input type="hidden" name="csrf" value="'+escape(csrf)+'"><button>生成飞书授权入口</button></form>');
 }
 assert(request.method==='POST','method_not_allowed',405);assert(request.headers.get('origin')===env.APP_ORIGIN,'cross_origin_denied',403);
 const values=await form(request);await store.rate(await hash(aad(p,'device-rate')),Date.now(),20);
 if(path==='/api/device/start') {
  assert([...values.keys()].every(k=>k==='csrf')&&values.getAll('csrf').length===1);
  const csrf=await vault.open<{expires:number}>(values.get('csrf')!,aad(p,'device-csrf',await hash(browserProof)));
  assert(csrf.expires>Date.now()&&csrf.expires<=Date.now()+600000,'csrf_expired');
  await store.claimForm(p,await hash(values.get('csrf')!),csrf.expires,Date.now());
  const r=await fetch('https://accounts.feishu.cn/oauth/v1/device_authorization',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:'Basic '+btoa(env.FEISHU_APP_ID+':'+env.FEISHU_APP_SECRET)},body:new URLSearchParams({client_id:env.FEISHU_APP_ID!,scope:scopes.join(' ')}).toString(),redirect:'manual',signal:AbortSignal.timeout(10000)});
  const d=await json(r);assert(r.ok&&!d.error&&typeof d.device_code==='string'&&d.device_code.length<=8192,'device_authorization_unavailable',502);
  const uri=d.verification_uri_complete??d.verification_uri;const u=new URL(uri);assert(u.protocol==='https:'&&u.hostname==='accounts.feishu.cn','invalid_verification_url',502);
  assert(Number.isInteger(d.expires_in)&&d.expires_in>0&&d.expires_in<=3600,'invalid_device_expiry',502);
  const encrypted=await vault.seal({code:d.device_code,expires:Date.now()+d.expires_in*1000,epoch:await store.epoch(p),scope:scopes,nonce:random()},binding);
  return page('<h1>请在飞书页面确认</h1><p><a target="_blank" rel="noopener noreferrer" href="'+escape(uri)+'">打开飞书授权页</a></p><p>仅连接当前独立环境；完成授权后再点击下面按钮。</p><form method="post" action="/api/device/finish"><input type="hidden" name="flow" value="'+escape(encrypted)+'"><button>已授权，完成连接</button></form>');
 }
 assert(path==='/api/device/finish','not_found',404);
 assert([...values.keys()].every(k=>k==='flow')&&values.getAll('flow').length===1);
 const flow=await vault.open<{code:string;expires:number;epoch:string;scope:string[];nonce:string}>(values.get('flow')!,binding);
 assert(Number.isSafeInteger(flow.expires)&&flow.expires>Date.now()&&flow.epoch===await store.epoch(p),'device_flow_expired');
 assert(JSON.stringify(flow.scope)===JSON.stringify(scopes),'device_scope_changed');
 const r=await fetch('https://accounts.feishu.cn/oauth/v3/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:flow.code,scope:flow.scope.join(' '),client_id:env.FEISHU_APP_ID!,client_secret:env.FEISHU_APP_SECRET!}).toString(),redirect:'manual',signal:AbortSignal.timeout(10000)});
 const d=await json(r);
 console.info(JSON.stringify({event:'device_token_response_shape',status:r.status,error_present:!!d.error,access_present:typeof d.access_token==='string',refresh_present:typeof d.refresh_token==='string',expires_present:Number.isFinite(d.expires_in),refresh_expires_present:Number.isFinite(d.refresh_token_expires_in),scope_count:typeof d.scope==='string'?d.scope.split(/\s+/).filter(Boolean).length:null,requested_scope_count:flow.scope.length,token_type_supported:String(d.token_type).toLowerCase()==='bearer'}));
 if(d.error==='authorization_pending'||d.error==='slow_down')return page('<h1>尚未完成飞书授权</h1><p>请完成飞书页面操作后，再返回本页提交。</p><form method="post" action="/api/device/finish"><input type="hidden" name="flow" value="'+escape(values.get('flow')!)+'"><button>再次检查授权</button></form>',202);
 assert(r.ok&&!d.error&&(!('code'in d)||d.code===0),'device_token_rejected',401);
 for(const key of ['access_token','refresh_token'])assert(typeof d[key]==='string'&&d[key].length>0&&d[key].length<=65536,'invalid_device_token',401);
 assert(String(d.token_type).toLowerCase()==='bearer','unsupported_token_type',401);
 for(const key of ['expires_in','refresh_token_expires_in'])assert(Number.isFinite(d[key])&&d[key]>0&&d[key]<=31536000,'invalid_device_token_expiry',401);
 assert(typeof d.scope==='string','invalid_device_scopes',401);const granted=d.scope.split(/\s+/).filter(Boolean);
 assert(flow.scope.every(s=>granted.includes(s))&&granted.every((s:string)=>flow.scope.includes(s)),'device_scope_changed',401);
 await store.claimForm(p,await hash('device-complete:'+flow.nonce),flow.expires,Date.now());
 const profile=await new Feishu(env,(u,i)=>providerTransport(env,u,i)).profile(d.access_token), grantId=random();
 const tokens={access_token:d.access_token,refresh_token:d.refresh_token,access_expires:Date.now()+d.expires_in*1000,refresh_expires:Date.now()+d.refresh_token_expires_in*1000,scopes:granted};
 await store.save(p,{grant_id:grantId,tenant_key:profile.tenant_key,open_id:profile.open_id,union_id:profile.union_id??null,display_name:profile.name??'飞书账户',credentials:await vault.seal(tokens,aad(p,'credentials',grantId)),scopes:JSON.stringify(granted),expires:tokens.access_expires,refresh_expires:tokens.refresh_expires,status:'active'},flow.epoch);
 return page('<h1>飞书已连接</h1><p>授权凭据已加密保存在当前独立环境。</p><a href="/">返回工作台</a>');
}

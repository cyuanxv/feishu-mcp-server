import assert from 'node:assert/strict';
import{mkdtemp}from'node:fs/promises';import{resolve}from'node:path';import{randomBytes}from'node:crypto';
import{startService}from'./node_modules/@cyuanxv/feishu-mcp-standalone/runtime.mjs';
const base=resolve('node_modules/@cyuanxv/feishu-mcp-standalone');const secret=()=>randomBytes(32).toString('base64url');
const c={origin:'https://device.example.test',appId:'test-device-app',appSecret:'test-device-secret',encryptionKey:secret(),ownerLoginToken:secret(),mcpAccessToken:secret(),enableWrites:false,authFlow:'device',oauthScopes:['docx:document:readonly','offline_access'],dataDirectory:await mkdtemp(resolve('device-check-'))};
let pending=true,extra=false,calls=0;let svc;
const upstream=async req=>{
 calls++;const u=new URL(req.url);
 if(u.pathname==='/oauth/v1/device_authorization')return Response.json({device_code:'fixture-device-code',verification_uri_complete:'https://accounts.feishu.cn/oauth/v1/device/verify?user_code=TEST-ONLY',expires_in:600,interval:5});
 if(u.pathname==='/oauth/v3/token'){
  const b=new URLSearchParams(await req.text());assert.equal(b.get('client_secret'),c.appSecret);assert.equal(b.get('scope'),c.oauthScopes.join(' '));
  if(pending)return Response.json({error:'authorization_pending'},{status:400});
  return Response.json({access_token:'test-device-access',refresh_token:'test-device-refresh',expires_in:3600,refresh_token_expires_in:86400,token_type:'Bearer',scope:c.oauthScopes.join(' ')+(extra?' search:message':'')});
 }
 assert.equal(u.href,'https://open.feishu.cn/open-apis/authen/v1/user_info');assert.equal(req.headers.get('authorization'),'Bearer test-device-access');return Response.json({code:0,data:{open_id:'ou_device_test',tenant_key:'test-tenant',name:'Device Test'}});
};
const request=(path,{cookie,method='GET',form,origin=c.origin,auth}={})=>svc.mf.dispatchFetch(c.origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(auth?{Authorization:'Bearer '+auth}:{}),...(form?{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'}:{})},...(form?{body:new URLSearchParams(form).toString()}:{}),redirect:'manual'});
const hidden=(html,name)=>{const m=html.match(new RegExp('name="'+name+'" value="([^"]+)"'));assert(m);return m[1];};
try{
 svc=await startService(c,{bundle:base+'/worker.js',migrations:base+'/migrations',port:0,outboundService:upstream});
 const login=await request('/login',{method:'POST',form:{token:c.ownerLoginToken}});const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await request('/device-login')).status,401);assert.equal((await request('/api/device/start',{method:'POST',form:{csrf:'bad'},auth:c.mcpAccessToken})).status,401);
 const begin=async()=>{const page=await request('/device-login',{cookie});const csrf=hidden(await page.text(),'csrf');const started=await request('/api/device/start',{cookie,method:'POST',form:{csrf}});assert.equal(started.status,200);const text=await started.text();assert(!text.includes('fixture-device-code'));assert(!text.includes(c.appSecret));return{csrf,flow:hidden(text,'flow')};};
 const f=await begin();const before=calls;assert.equal((await request('/api/device/start',{cookie,method:'POST',form:{csrf:f.csrf}})).status,409);assert.equal(calls,before);
 assert.equal((await request('/api/device/finish',{cookie,method:'POST',origin:'https://other.example',form:{flow:f.flow}})).status,403);
 assert.equal((await request('/api/device/finish',{cookie,method:'POST',form:{flow:f.flow}})).status,202);
 pending=false;
 assert.equal((await request('/api/device/finish',{cookie,method:'POST',form:{flow:f.flow}})).status,200);
 const status=await(await request('/api/status',{cookie})).json();assert.equal(status.connected,true);
 const row=await svc.db.prepare('SELECT * FROM connections').first();assert(row.credentials.startsWith('v1.'));assert(!row.credentials.includes('test-device-access'));assert.deepEqual(JSON.parse(row.scopes),c.oauthScopes);
 assert.equal((await request('/api/device/finish',{cookie,method:'POST',form:{flow:f.flow}})).status,409);
 const version=(await svc.db.prepare('SELECT version FROM connections').first()).version;assert.equal(version,1);
 const f2=await begin();extra=true;assert.equal((await request('/api/device/finish',{cookie,method:'POST',form:{flow:f2.flow}})).status,401);assert.equal((await svc.db.prepare('SELECT version FROM connections').first()).version,1);extra=false;
 const f3=await begin();await svc.db.prepare('UPDATE owners SET epoch=?').bind('changed-epoch').run();const prior=calls;assert.equal((await request('/api/device/finish',{cookie,method:'POST',form:{flow:f3.flow}})).status,400);assert.equal(calls,prior);
 console.log('PASS device flow: browser-only access, Origin, one-time CSRF, encrypted device code, pending state, exact scopes, encrypted grant, replay rejection and disconnect epoch. Real Feishu requests: 0.');
}finally{await svc?.close();}

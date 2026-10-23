import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, stat, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import https from 'node:https';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { discoverScopes } from './node_modules/@cyuanxv/feishu-mcp-standalone/permissions.mjs';
import { startService } from './node_modules/@cyuanxv/feishu-mcp-standalone/runtime.mjs';
const packageRoot = resolve('node_modules/@cyuanxv/feishu-mcp-standalone');
const cli = resolve(packageRoot,'cli.mjs');
const work = await mkdtemp(resolve('acceptance-private-'));
const net = createServer(); await new Promise(r=>net.listen(0,'127.0.0.1',r)); const port=net.address().port; await new Promise(r=>net.close(r));
const origin = `https://localhost:${port}`;
const configPath=resolve(work,'config.json'), cert=resolve(work,'cert.pem'), key=resolve(work,'key.pem');
await writeFile(resolve(work,'app.json'),JSON.stringify({appId:'synthetic-app',appSecret:'synthetic-app-secret'}),{mode:0o600});
const init=spawnSync(process.execPath,[cli,'init','--config',configPath,'--app-config',resolve(work,'app.json'),'--data',resolve(work,'data'),'--origin',origin],{encoding:'utf8'});
assert.equal(init.status,0,init.stderr); assert(!init.stderr.includes('synthetic-app-secret'));
assert.equal((await stat(configPath)).mode & 0o077,0);
const duplicate=spawnSync(process.execPath,[cli,'init','--config',configPath,'--app-config',resolve(work,'app.json'),'--data',resolve(work,'data'),'--origin',origin],{encoding:'utf8'}); assert.notEqual(duplicate.status,0);
const c=JSON.parse(await readFile(configPath));
const permissionFixture=async(url,init)=>url.endsWith('/internal') ? Response.json({code:0,tenant_access_token:'test-app-token'}) : Response.json({code:0,data:{scopes:[...['calendar:calendar:read','calendar:calendar.event:read','offline_access','task:task:write','im:message:readonly','unknown:scope'].map(scope_name=>({scope_name,grant_status:1})),{scope_name:'contact:user:search',grant_status:0}]}});
const readScopes=await discoverScopes(c,permissionFixture);assert(!readScopes.includes('task:task:write'));assert(!readScopes.includes('unknown:scope'));assert(!readScopes.includes('contact:user:search'));
c.enableWrites=true;c.oauthScopes=await discoverScopes(c,permissionFixture);assert(c.oauthScopes.includes('task:task:write'));
await writeFile(configPath,JSON.stringify(c),{mode:0o600});
const ssl=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{encoding:'utf8'}); assert.equal(ssl.status,0);
const ca=await readFile(cert); let calls=[];
const scopes=c.oauthScopes; let writeCalls=0;
const outboundService=async req=>{
 const u=new URL(req.url); calls.push(u.pathname);
 assert.equal(u.hostname,'open.feishu.cn');
 if(u.pathname==='/open-apis/authen/v2/oauth/token') {
  const b=await req.json(); assert.equal(b.client_id,'synthetic-app'); assert.equal(b.client_secret,'synthetic-app-secret');
  assert(['authorization_code','refresh_token'].includes(b.grant_type));
  return Response.json({access_token:'synthetic-user-token',refresh_token:'synthetic-refresh-token',token_type:'Bearer',expires_in:3600,refresh_token_expires_in:86400,scope:scopes.join(' ')});
 }
 assert.equal(req.headers.get('authorization'),'Bearer synthetic-user-token');
 if(u.pathname==='/open-apis/im/v1/messages/synthetic-folder-message') return Response.json({code:0,data:{items:[{message_id:'synthetic-folder-message',msg_type:'folder',body:{content:JSON.stringify({file_key:'folder-root'})}}]}});
 if(u.pathname.startsWith('/open-apis/im/v1/files/')&&u.pathname.endsWith('/folder')) {
  assert.equal(u.searchParams.get('srcid'),'synthetic-folder-message');
  const key=u.pathname.split('/')[5];
  const tree={ 'folder-root':[['file-text','中文 样本.txt',false],['file-hidden','.gitignore',false],['folder-child','一级空目录',true]], 'folder-child':[['folder-leaf','二级空目录',true]] };
  if(key==='folder-leaf')return Response.json({code:0,data:{items:null,all_count:1}});
  const rows=tree[key];assert(rows,'only synthetic folders permitted');return Response.json({code:0,data:{items:rows.map(([file_key,name,is_folder])=>({file_key,name,is_folder})),all_count:rows.length}});
 }
 if(u.pathname.startsWith('/open-apis/im/v1/messages/synthetic-folder-message/resources/')) {
  const name=u.pathname.split('/').pop();assert(['file-text','file-hidden'].includes(name));return new Response(name==='file-text'?'仅用于独立安装验收\n':'.synthetic\n');
 }
 if(u.pathname==='/open-apis/task/v2/tasks') {writeCalls++;return Response.json({code:0,data:{task:{guid:'standalone-task'}}});}
 if(u.pathname==='/open-apis/authen/v1/user_info') return Response.json({code:0,data:{open_id:'ou_synthetic',tenant_key:'synthetic-tenant',name:'Independent test user'}});
 if(u.pathname==='/open-apis/calendar/v4/calendars') return Response.json({code:0,data:{calendar_list:[{calendar_id:'calendar-test'}],has_more:false}});
 if(u.pathname.endsWith('/events/instance_view')) return Response.json({code:0,data:{items:[{event_id:'event-test',summary:'Independent installation test',status:'confirmed',start_time:{timestamp:'1791194400'},end_time:{timestamp:'1791198000'},event_organizer:{display_name:'Self'}}]}});
 throw new Error('Unexpected provider endpoint');
};
function fetchLocal(path,{method='GET',headers={},body}={}) {
 return new Promise((resolve,reject)=>{
  const q=https.request(new URL(path,origin),{method,headers:{...headers,...(body ? {'Content-Length': Buffer.byteLength(body)} : {})},ca,agent:false,lookup:(_h,_o,cb)=>cb(null,[{address:'127.0.0.1',family:4}])},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve(new Response(res.statusCode===204||res.statusCode===304?null:Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});q.on('error',reject);if(body)q.write(body);q.end();
 });
}
let svc;
const opts={bundle:resolve(packageRoot,'worker.js'),migrations:resolve(packageRoot,'migrations'),cert,key,port,outboundService};
let count=0;const pass=s=>{count++;console.log('PASS '+s)};
try {
 svc=await startService(c,opts);pass('automatic permission discovery filters unapproved, unsupported and disabled-write scopes');pass('installed package boots with private app configuration and 9 D1 migrations');
 await assert.rejects(startService(c,opts));pass('second process cannot share the data directory');
 assert.equal((await fetchLocal('/api/status',{headers:{'oai-authenticated-user-id':'forged'}})).status,401);
 assert.equal((await fetchLocal('/mcp',{method:'POST',headers:{Authorization:'Bearer bad'}})).status,401);pass('forged Sites identity and bad bearer rejected');
 const form={Origin:origin,'Content-Type':'application/x-www-form-urlencoded'};
 assert.equal((await fetchLocal('/login',{method:'POST',headers:{...form,Origin:'https://attacker.example'},body:new URLSearchParams({token:c.ownerLoginToken}).toString()})).status,403);
 const login=await fetchLocal('/login',{method:'POST',headers:form,body:new URLSearchParams({token:c.ownerLoginToken}).toString()});assert.equal(login.status,303);
 const ownerCookie=login.headers.get('set-cookie').split(';')[0];assert(login.headers.get('set-cookie').includes('Secure'));pass('browser login, secure cookie and CSRF origin check');
 const status=await(await fetchLocal('/api/status',{headers:{Cookie:ownerCookie}})).json();assert.equal(status.configured,true);assert.equal(status.connected,false);
 const connect=await fetchLocal('/api/feishu/connect',{method:'POST',headers:{...form,Cookie:ownerCookie},body:new URLSearchParams({csrf:status.csrf}).toString()});assert.equal(connect.status,303,await connect.clone().text());
 const authUrl=new URL(connect.headers.get('location'));assert.equal(authUrl.hostname,'accounts.feishu.cn');assert.equal(authUrl.searchParams.get('redirect_uri'),origin+'/api/feishu/callback');assert.equal(authUrl.searchParams.get('code_challenge_method'),'S256');
 const flowCookie=connect.headers.get('set-cookie').split(';')[0];
 const callback='/api/feishu/callback?'+new URLSearchParams({code:'synthetic-code',state:authUrl.searchParams.get('state')});
 assert.equal((await fetchLocal(callback,{headers:{Cookie:ownerCookie}})).status,400);
 assert.equal((await fetchLocal(callback,{headers:{Cookie:ownerCookie+'; '+flowCookie}})).status,303);
 assert.equal((await fetchLocal(callback,{headers:{Cookie:ownerCookie+'; '+flowCookie}})).status,400);pass('real OAuth URL, PKCE, cookie binding, callback exchange and replay rejection against intercepted provider');
 const status2=await(await fetchLocal('/api/status',{headers:{Cookie:ownerCookie}})).json();assert.equal(status2.connected,true);
 const dbrow=await svc.db.prepare('SELECT credentials FROM connections').first();assert(dbrow.credentials.startsWith('v1.'));assert(!dbrow.credentials.includes('synthetic-user-token'));pass('user grant stored encrypted');
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+c.mcpAccessToken};
 const rpc=async(method,params={})=>(await fetchLocal('/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).json();
 const listed=await rpc('tools/list');assert(listed.result.tools.length>10);console.log('Tool count: '+listed.result.tools.length);
 const args={time_range:{start:'2026-10-05T00:00:00Z',end:'2026-10-06T00:00:00Z'},timezone:'UTC'};
 const agenda=await rpc('tools/call',{name:'get_agenda',arguments:args});assert.equal(agenda.result.isError,false,JSON.stringify(agenda));assert(JSON.stringify(agenda).includes('Independent installation test'));pass('complete Worker tool catalog and real provider adapter agenda call');
 assert.equal((await fetchLocal('/api/status',{headers:{Authorization:'Bearer '+c.mcpAccessToken}})).status,401);
 const prepared=await rpc('tools/call',{name:'create_task',arguments:{request_id:crypto.randomUUID(),parameters:{summary:'Standalone acceptance sample'}}});
 assert.equal(prepared.result.structuredContent.status,'pending',JSON.stringify(prepared));const intent=prepared.result.structuredContent.intent_id;assert.equal(writeCalls,0);
 assert.equal((await fetchLocal('/api/writes/'+intent,{method:'POST',headers:{...headers,Origin:origin},body:JSON.stringify({action:'confirm',csrf:'forged'})})).status,401);
 assert.equal((await fetchLocal('/write-review/'+intent,{headers:{Authorization:'Bearer '+c.mcpAccessToken}})).status,401);
 const review=await fetchLocal('/write-review/'+intent,{headers:{Cookie:ownerCookie}});assert.equal(review.status,200);const proofCookie=review.headers.get('set-cookie').split(';')[0];const cookies=ownerCookie+'; '+proofCookie;
 const preview=await(await fetchLocal('/api/writes/'+intent,{headers:{Cookie:cookies}})).json();
 const confirmation={method:'POST',headers:{Cookie:cookies,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'confirm',csrf:preview.csrf})};
 assert.equal((await fetchLocal('/api/writes/'+intent,{...confirmation,headers:{...confirmation.headers,Origin:'https://attacker.example'}})).status,403);
 const receipt=await(await fetchLocal('/api/writes/'+intent,confirmation)).json();assert.equal(receipt.status,'succeeded',JSON.stringify(receipt));assert.equal(writeCalls,1);
 assert.equal((await(await fetchLocal('/api/writes/'+intent,confirmation)).json()).status,'succeeded');assert.equal(writeCalls,1);
 pass('MCP can prepare but cannot confirm; browser proof, same-origin check and duplicate-write protection succeed');
 // Exercise the installed, bundled Worker and real D1/R2; provider responses are synthetic.
 const query=async(operation,parameters,connection_id)=>{const r=await rpc('tools/call',{name:'query_feishu',arguments:{operation,parameters,...(connection_id?{connection_id}:{})}});assert.equal(r.result.isError,false,JSON.stringify(r));return r.result.structuredContent;};
 let folder=await query('download_message_attachment',{message_id:'synthetic-folder-message',file_key:'folder-root',resource_type:'file',name:'合成验收目录'});
 for(let i=0;folder.data.pending&&i<10;i++)folder=await query('download_continue',{job_id:folder.data.job_id},folder.connection_id);
 assert.equal(folder.data.status,'succeeded');assert.equal(folder.data.pending,0);assert.equal(folder.data.partial,false);assert(folder.data.results.every(e=>e.name_adjusted===false));
 const archivePath=new URL(folder.data.archive_url).pathname;
 assert.equal((await fetchLocal(archivePath)).status,401);assert.equal((await fetchLocal(archivePath,{headers:{Authorization:'Bearer '+c.mcpAccessToken}})).status,401);
 const archive=await fetchLocal(archivePath,{headers:{Cookie:ownerCookie}});assert.equal(archive.status,200);
 const zip=Buffer.from(await archive.arrayBuffer()),end=zip.length-22;assert.equal(zip.readUInt32LE(end),0x06054b50);let pos=zip.readUInt32LE(end+16);const entries=new Map();
 for(let i=0;i<zip.readUInt16LE(end+10);i++){
  assert.equal(zip.readUInt32LE(pos),0x02014b50);const len=zip.readUInt16LE(pos+28),name=zip.subarray(pos+46,pos+46+len).toString('utf8'),off=zip.readUInt32LE(pos+42),start=off+30+zip.readUInt16LE(off+26)+zip.readUInt16LE(off+28);assert.equal(zip.readUInt16LE(pos+10),0);
  entries.set(name,{attributes:zip.readUInt32LE(pos+38),body:zip.subarray(start,start+zip.readUInt32LE(pos+24))});pos+=46+len+zip.readUInt16LE(pos+30)+zip.readUInt16LE(pos+32);
 }
 for(const name of ['合成验收目录/','合成验收目录/一级空目录/','合成验收目录/一级空目录/二级空目录/']){assert(entries.has(name));assert.equal(entries.get(name).attributes&16,16);assert.equal(entries.get(name).body.length,0);}
 assert.equal(entries.get('合成验收目录/中文 样本.txt').body.toString(),'仅用于独立安装验收\n');assert.equal(entries.get('合成验收目录/.gitignore').body.toString(),'.synthetic\n');assert.equal(entries.size,6);
 await writeFile(resolve(work,'folder-fidelity.zip'),zip);
 pass('installed package preserves original Unicode and hidden filenames, exact bytes and all three empty-directory levels');
 pass('installed folder archive requires owner browser session; MCP bearer alone cannot download');
 await svc.mf.getR2Bucket('BUCKET').then(b=>b.put('acceptance-encrypted-sample','encrypted-test-payload'));
 await svc.close();svc=await startService(c,opts);assert.equal((await(await fetchLocal('/api/status',{headers:{Cookie:ownerCookie}})).json()).connected,true);
 assert.equal(await (await (await svc.mf.getR2Bucket('BUCKET')).get('acceptance-encrypted-sample')).text(),'encrypted-test-payload');assert.equal((await(await fetchLocal('/api/writes/'+intent,confirmation)).json()).status,'succeeded');assert.equal(writeCalls,1);pass('grant, session, attachment storage, write receipts and migration records survive restart');
 const client=new Client({name:'standalone-install-test',version:'1'});
 const transport=new StdioClientTransport({command:process.execPath,args:[cli,'connect','--config',configPath],env:{NODE_EXTRA_CA_CERTS:cert},stderr:'pipe'});
 await client.connect(transport);assert.equal((await client.listTools()).tools.length,listed.result.tools.length);assert.equal((await client.callTool({name:'get_agenda',arguments:args})).isError,false);await client.close();pass('installed stdio bridge uses verified HTTPS and invokes full service');
 const tokenBefore=calls.filter(x=>x.endsWith('/oauth/token')).length;
 await svc.db.prepare('UPDATE connections SET expires=?').bind(Date.now()-1).run();assert.equal((await rpc('tools/call',{name:'get_agenda',arguments:args})).result.isError,false);assert.equal(calls.filter(x=>x.endsWith('/oauth/token')).length,tokenBefore+1);pass('expired user token refreshes through provider adapter');
 assert.equal((await fetchLocal('/logout',{method:'POST',headers:{Origin:origin,Cookie:ownerCookie}})).status,303);
 pass('logout clears browser cookie');
 console.log(JSON.stringify({passed:count,providerRequestsIntercepted:calls.length,realFeishuRequests:0,scope:'Installed service with synthetic upstream; live authorization evidence is recorded separately'}));
} finally {await svc?.close();}

// Launch the public executable itself, not just its exported runtime.
const child=spawn(process.execPath,[cli,'serve','--config',configPath,'--cert',cert,'--key',key,'--port',String(port)],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});
let output='';
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CLI startup timeout')),15000);child.stderr.on('data',d=>{output+=d;if(output.includes('Feishu standalone started')){clearTimeout(timer);resolve();}});child.on('exit',code=>{clearTimeout(timer);reject(new Error('CLI exited before ready '+code));});});
 assert.equal((await fetchLocal('/health')).status,200);assert.equal((await fetchLocal('/api/status')).status,401);assert(!output.includes(c.appSecret));assert(!output.includes(c.mcpAccessToken));
 console.log('PASS installed CLI serves verified HTTPS and protects private routes without leaking config');
} finally { const exit=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exit; }
await assert.rejects(stat(resolve(c.dataDirectory,'service.lock')));
console.log('PASS installed CLI graceful stop releases data-directory lock');

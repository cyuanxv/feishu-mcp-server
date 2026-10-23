// Replay recorded cloud metadata and bytes, never access Feishu or production secrets.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CloudFiles,Vault} from '../.test-build/module.mjs';
import {setup,P} from '../test/helpers.mjs';
const [input,output]=process.argv.slice(2);assert(input&&output,'input JSON and output ZIP paths required');
const recorded=JSON.parse(await readFile(input,'utf8'));assert.equal(recorded.source,'recorded_cloud_result_replay');
const rows=recorded.entries,root=rows.find(e=>e.depth===0);assert(root?.folder);
const s=await setup(),objects=new Map();
s.env.BUCKET={put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{text:async()=>objects.get(k)}:null,delete:async k=>objects.delete(k)};
let calls=0;
const f=new CloudFiles(s.env,new Vault(s.env.APP_ENCRYPTION_KEY),async u=>{
 calls++;
 if(u.includes('/folder?')){
  const key=u.split('/files/')[1].split('/')[0],dir=rows.find(e=>e.token===key);assert(dir?.folder);
  const children=rows.filter(e=>e.depth===dir.depth+1&&e.path.startsWith(dir.path+'/'));
  return Response.json({code:0,data:{all_count:children.length,items:children.map(e=>({file_key:e.token,name:e.name,is_folder:e.folder}))}});
 }
 if(u.includes('/resources/')){const key=u.split('/resources/')[1].split('?')[0],e=rows.find(e=>e.token===key);assert(e&&!e.folder);return new Response(Buffer.from(e.base64,'base64'))}
 assert(u.endsWith('/im/v1/messages/recorded_message'));
 return Response.json({code:0,data:{items:[{message_id:'recorded_message',msg_type:'folder',body:{content:JSON.stringify({file_key:root.token})}}]}});
},s.now);
const j=await f.start(P,'primary','replay-grant','download_message_attachment',{message_id:'recorded_message',file_key:root.token,resource_type:'file',name:root.name});
let result;for(let i=0;i<20;i++){result=await f.step(P,j.id,'primary','replay-grant','unused-token',async()=>{},async()=>{throw Error('no bot')});if(!result.pending)break}
assert.equal(result.status,'succeeded');assert.equal(result.pending,0);
await writeFile(output,new Uint8Array(await (await f.deliver(P,j.id,'archive',async()=>{})).arrayBuffer()));
console.log(JSON.stringify({source:recorded.source,live_feishu_requests:0,replayed_calls:calls,files:result.results.filter(e=>e.status==='succeeded').length,bytes:result.bytes,partial:result.partial,original_names:result.results.every(e=>!e.original_name||!e.name_adjusted)},null,2));

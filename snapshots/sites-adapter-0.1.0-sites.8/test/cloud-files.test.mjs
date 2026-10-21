import test from 'node:test';import assert from 'node:assert/strict';
import {CloudFiles,Vault,random,writeInput,WriteProvider,FILE_LIMIT,zipEntries} from '../.test-build/module.mjs';
import {setup,P} from './helpers.mjs';
const ok=data=>Response.json({code:0,data});const current=async()=>{};
async function files(fetcher){const s=await setup();const objects=new Map();s.env.BUCKET={put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{text:async()=>objects.get(k)}:null,delete:async k=>objects.delete(k)};return {s,f:new CloudFiles(s.env,new Vault(s.env.APP_ENCRYPTION_KEY),fetcher,s.now)}}
test('sheet write validation rejects mismatched rectangle and excessive batches',()=>{assert.throws(()=>writeInput('write_sheet_cells',{token:'sheet',value_ranges:[{range:'abc!A1:B2',values:[[1]]}]}));assert.deepEqual(writeInput('write_sheet_cells',{token:'sheet',value_ranges:[{range:'abc!A1:B1',values:[[1,'中文']]}]}).value_ranges[0].values,[[1,'中文']])});
test('sheet operations use correct upstream shapes and fail without receipt',async()=>{const calls=[];const w=new WriteProvider(async(u,i)=>{calls.push([u,JSON.parse(i.body)]);return ok(u.includes('sheets_batch_update')?{replies:[{addSheet:{properties:{sheetId:'abc',title:'测试'}}}]}:u.includes('values_batch_update')?{responses:[{updatedCells:2}]}:{spreadsheet:{spreadsheet_token:'new',url:'https://example.test'}})});for(const [op,a]of [['create_spreadsheet',{title:'测试'}],['add_worksheet',{token:'new',title:'测试'}],['write_sheet_cells',{token:'new',value_ranges:[{range:'abc!A1:B1',values:[[1,2]]}]}]])assert.equal((await w.execute('t',op,a,'request')).status,'succeeded');assert.equal(calls[2][1].valueRanges[0].range,'abc!A1:B1')});
test('recursive folder pagination produces byte exact private encrypted files with explicit failures',async()=>{
 const {s,f}=await files(async u=>u.includes('/files?')?ok(u.includes('folder_token=root')?(u.includes('page_token')?{files:[{token:'bad',name:'blocked',type:'file'}],has_more:false}:{files:[{token:'sub',name:'../nested',type:'folder'},{token:'one',name:'a.bin',type:'file'}],has_more:true,next_page_token:'next'}):{files:[{token:'two',name:'b.bin',type:'file'}],has_more:false}):u.includes('/bad/')?new Response(null,{status:403}):new Response(new Uint8Array([0,1,255,100])));
 const j=await f.start(P,'primary','g','download_folder',{folder_token:'root'});let r;for(let i=0;i<10;i++){r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');if(!r.pending)break}assert.equal(r.status,'partial');assert.equal(r.results.filter(e=>e.status==='succeeded').length,2);assert(r.results.some(e=>e.error==='resource_access_denied'));assert.equal(r.traversal_complete,true);
 const e=r.results.find(e=>e.status==='succeeded');const response=await f.deliver(P,j.id,e.artifact_id,current);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,1,255,100]));assert.equal(response.headers.get('Cache-Control'),'no-store');assert(!s.db.sql.prepare('SELECT payload FROM file_chunks LIMIT 1').get().payload.includes('AAH/ZA=='));await assert.rejects(()=>f.load({...P,user:'other'},j.id),{code:'download_not_found_or_expired'});await assert.rejects(()=>f.step(P,j.id,'other','g','t',current,async()=> 'bot'),{code:'download_connection_changed'});
 const zip=await f.deliver(P,j.id,'archive',current);const bytes=new Uint8Array(await zip.arrayBuffer());assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);assert(new TextDecoder().decode(bytes).includes('_download_manifest.json'));
});
test('messages require owner-visible resource association before bot download',async()=>{let bot=0;const {f}=await files(async()=>ok({items:[{message_id:'m',body:{content:JSON.stringify({file_key:'valid'})}}]}));const j=await f.start(P,'primary','g','download_message_attachment',{message_id:'m',file_key:'other',resource_type:'file',name:'sample'});const r=await f.step(P,j.id,'primary','g','t',current,async()=>{bot++;return 'bot'});assert.equal(bot,0);assert.equal(r.results[0].error,'file_not_in_message')});
test('message binary uses bot only after user check and rejects redirects',async()=>{let call=0;const {f}=await files(async(u,i)=>{call++;if(u.includes('/resources/')){assert.equal(i.headers.Authorization,'Bearer bot');return new Response(null,{status:302,headers:{location:'https://untrusted.test'}})}return ok({items:[{message_id:'m',body:{content:JSON.stringify({file_key:'f'})}}]})});const j=await f.start(P,'primary','g','download_message_attachment',{message_id:'m',file_key:'f',resource_type:'file',name:'sample'});const r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');assert.equal(call,2);assert.equal(r.results[0].status,'failed')});
test('oversized and incomplete streams cannot be reported as success',async()=>{for(const length of [FILE_LIMIT+1,10]){const {f}=await files(async()=>new Response('x',{headers:{'content-length':String(length)}}));const j=await f.start(P,'primary','g','download_file',{token:'f',name:'x',file_type:'file'});const r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');assert.equal(r.results[0].status,'failed')}});
test('export progresses through ticket polling and downloads native sheet bytes',async()=>{const {f}=await files(async(u,i)=>u.endsWith('/export_tasks')?ok({ticket:'ticket'}):u.includes('/ticket?')?ok({result:{job_status:0,file_token:'export'}}):new Response('xlsx'));const j=await f.start(P,'primary','g','download_file',{token:'s',name:'sheet',file_type:'sheet'});const r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');assert.equal(r.status,'succeeded');assert.equal(r.results[0].path,'sheet.xlsx')});
test('expired and disconnected grants block downloads',async()=>{const {s,f}=await files(async()=>new Response('x'));const j=await f.start(P,'primary','g','download_file',{token:'f',name:'x',file_type:'file'});await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');await assert.rejects(()=>f.deliver(P,j.id,'archive',async()=>{throw Error('revoked')}),/revoked/);s.db.sql.prepare('UPDATE file_jobs SET expires=0').run();await assert.rejects(()=>f.load(P,j.id),{code:'download_not_found_or_expired'})});

test('export format validation rejects unsupported combinations before creating jobs',async()=>{
 const {f}=await files(async()=>{throw Error('must not call provider')});
 for(const a of [{file_type:'docx',file_extension:'xlsx'},{file_type:'sheet',file_extension:'csv'},{file_type:'slides'},{file_type:'file',file_extension:'pdf'}])
 await assert.rejects(()=>f.start(P,'primary','g','download_file',{token:'x',name:'sample',...a}));
});
test('PDF and CSV exports pass explicit format and sub-resource and keep filename suffix once',async()=>{
 for(const [type,ext,sub] of [['docx','pdf',undefined],['sheet','csv','tab1'],['bitable','xlsx',undefined]]){
 let body;const {f}=await files(async(u,i)=>u.endsWith('/export_tasks')?(body=JSON.parse(i.body),ok({ticket:'ticket'})):u.includes('/ticket?')?ok({result:{job_status:0,file_token:'export'}}):new Response('export bytes'));
 const j=await f.start(P,'primary','g','download_file',{token:'s',name:'sample.'+ext,file_type:type,file_extension:ext,sub_id:sub});
 const r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot');assert.equal(r.status,'succeeded');assert.equal(r.results[0].path,'sample.'+ext);assert.equal(body.file_extension,ext);assert.equal(body.sub_id,sub);
 }
});
test('failed export retries obtain a fresh ticket and do not duplicate extension',async()=>{
 let tickets=0,downloads=0;const {f}=await files(async u=>u.endsWith('/export_tasks')?(tickets++,ok({ticket:'ticket'+tickets})):u.includes('/export_tasks/ticket')?ok({result:{job_status:0,file_token:'export'}}):++downloads===1?new Response(null,{status:410}):new Response('xlsx'));
 const j=await f.start(P,'primary','g','download_file',{token:'s',name:'sample',file_type:'sheet'});
 assert.equal((await f.step(P,j.id,'primary','g','t',current,async()=> 'bot')).status,'partial');
 const r=await f.step(P,j.id,'primary','g','t',current,async()=> 'bot',true);assert.equal(r.status,'succeeded');assert.equal(tickets,2);assert.equal(r.results[0].path,'sample.xlsx');
});
test('export permission selection is distinct from binary file download',async()=>{
 const {fileRequirements}=await import('../.test-build/module.mjs');
 assert(fileRequirements('download_file',{file_type:'docx'}).includes('drive:export:readonly'));
 assert(!fileRequirements('download_file',{file_type:'docx'}).includes('drive:file:download'));
 assert(fileRequirements('download_file',{file_type:'file'}).includes('drive:file:download'));
});

test('native chat folders recursively expand and download user-authorized children',async()=>{
 let binary=0,reads=0;const {f}=await files(async(u,i)=>{
  if(u.includes('/resources/')){binary++;assert.equal(i.headers.Authorization,'Bearer user');return new Response('native bytes')}
  if(u.includes('/folder?'))return ok(u.includes('/root/')?{all_count:2,items:[{file_key:'child',name:'../a.txt',is_folder:false},{file_key:'sub',name:'nested',is_folder:true}]}:{all_count:1,items:[{file_key:'deep',name:'b.txt',is_folder:false}]});
  reads++;return ok({items:[{message_id:'m',msg_type:'folder',body:{content:JSON.stringify({file_key:'root'})}}]});
 });
 const j=await f.start(P,'primary','g','download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'folder'});let r;
 for(let n=0;n<5;n++){r=await f.step(P,j.id,'primary','g','user',current,async()=>{throw Error('no bot needed')});if(!r.pending)break}
 assert.equal(r.status,'succeeded');assert.equal(binary,2);assert.equal(reads,4);assert.equal(r.results.filter(e=>e.status==='listed').length,2);assert(r.results.every(e=>!e.path.split('/').includes('..')));
 const b=await (await f.deliver(P,j.id,'archive',current)).arrayBuffer();assert(new TextDecoder().decode(b).includes('native bytes'));
});
test('native folder truncation and cycles stay explicit failures',async()=>{
 for(const truncate of [true,false]){
 const {f}=await files(async u=>u.includes('/folder?')?ok({all_count:truncate?2:1,items:[{file_key:'root',name:'loop',is_folder:true}]}):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const j=await f.start(P,'primary','g','download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'folder'});const r=await f.step(P,j.id,'primary','g','user',current,async()=> 'bot');assert.equal(r.status,'partial');assert(r.results.some(e=>e.error===(truncate?'folder_page_incomplete':'folder_cycle_or_duplicate')));
 }
});
test('native children cannot download after original message is deleted',async()=>{
 let deleted=false,downloads=0;const {f}=await files(async u=>u.includes('/folder?')?ok({all_count:3,items:['a','b','c'].map(file_key=>({file_key,name:file_key,is_folder:false}))}):u.includes('/resources/')?(downloads++,new Response('ok')):ok({items:[{message_id:'m',deleted,msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const j=await f.start(P,'primary','g','download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'folder'});await f.step(P,j.id,'primary','g','user',current,async()=> 'bot');deleted=true;const r=await f.step(P,j.id,'primary','g','user',current,async()=> 'bot');assert.equal(downloads,2);assert(r.results.some(e=>e.error==='message_not_readable'));
});

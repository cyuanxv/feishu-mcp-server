import test from 'node:test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CloudFiles,Vault,safeName} from '../.test-build/module.mjs';
import {setup,P} from './helpers.mjs';
const ok=data=>Response.json({code:0,data});
const current=async()=>{};
async function harness(fetcher){
 const s=await setup(),objects=new Map();
 s.env.BUCKET={put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{text:async()=>objects.get(k)}:null,delete:async k=>objects.delete(k)};
 return new CloudFiles(s.env,new Vault(s.env.APP_ENCRYPTION_KEY),fetcher,s.now);
}
function zipEntries(bytes){
 const b=Buffer.from(bytes),end=b.length-22;
 assert.equal(b.readUInt32LE(end),0x06054b50);
 let pos=b.readUInt32LE(end+16);const result=[];
 for(let i=0;i<b.readUInt16LE(end+10);i++){
  assert.equal(b.readUInt32LE(pos),0x02014b50);
  const len=b.readUInt16LE(pos+28),name=b.subarray(pos+46,pos+46+len).toString('utf8');
  const off=b.readUInt32LE(pos+42),start=off+30+b.readUInt16LE(off+26)+b.readUInt16LE(off+28);
  result.push({name,attributes:b.readUInt32LE(pos+38),body:b.subarray(start,start+b.readUInt32LE(pos+24))});
  pos+=46+len+b.readUInt16LE(pos+30)+b.readUInt16LE(pos+32);
 }
 return result;
}
async function run(f,op,args){const j=await f.start(P,'primary','grant',op,args);let r;for(let i=0;i<20;i++){r=await f.step(P,j.id,'primary','grant','user',current,async()=>{throw Error('bot must not be used')});if(!r.pending)break}assert.equal(r.status,'succeeded');return {j,r,entries:zipEntries(await (await f.deliver(P,j.id,'archive',current)).arrayBuffer())}}
test('chat folders keep exact Unicode, hidden-file names and listed nested empty directories',async()=>{
 const trees={root:[['a','简历 2026.txt',false],['hidden','.gitignore',false],['sub','一级目录',true]],sub:[['empty','空目录',true]],empty:[]};
 const f=await harness(async u=>{
  if(u.includes('/folder?')){const key=u.split('/files/')[1].split('/')[0];return ok({all_count:trees[key].length,items:trees[key].map(([file_key,name,is_folder])=>({file_key,name,is_folder}))})}
  if(u.includes('/resources/'))return new Response(new Uint8Array([0,255,1]));
  return ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]});
 });
 const {j,r,entries}=await run(f,'download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'测试文件夹'});
 assert.equal(r.partial,false);assert.equal(r.traversal_complete,true);assert.equal(r.directory_coverage,'provider_listed_only');
 if(process.env.FOLDER_FIDELITY_ZIP)await writeFile(process.env.FOLDER_FIDELITY_ZIP,new Uint8Array(await (await f.deliver(P,j.id,'archive',current)).arrayBuffer()));
 assert(entries.some(e=>e.name==='测试文件夹/简历 2026.txt'));
 assert(entries.some(e=>e.name==='测试文件夹/.gitignore'));
 const empty=entries.find(e=>e.name==='测试文件夹/一级目录/空目录/');assert(empty);assert.equal(empty.attributes&16,16);assert.equal(empty.body.length,0);
 assert(r.results.filter(e=>e.original_name).every(e=>e.name_adjusted===false));
 const file=r.results.find(e=>e.original_name==='简历 2026.txt');
 const response=await f.deliver(P,j.id,file.artifact_id,current);
 assert.equal(decodeURIComponent(response.headers.get('content-disposition').split("''")[1]),'简历 2026.txt');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,255,1]));
});
test('Drive pages preserve originals and disambiguate extraction collisions without overwriting',async()=>{
 const f=await harness(async u=>{
  if(u.includes('/files?')){
   if(u.includes('folder_token=empty'))return ok({files:[],has_more:false});
   return ok(u.includes('page_token=')?{files:[{token:'b',name:'same.txt',type:'file'},{token:'c',name:'SAME.TXT',type:'file'},{token:'empty',name:'空目录',type:'folder'}],has_more:false}:{files:[{token:'a',name:'same.txt',type:'file'},{token:'manifest',name:'_download_manifest.json',type:'file'}],has_more:true,next_page_token:'next'});
  }
  return new Response(u.split('/files/')[1].split('/')[0]);
 });
 const {r,entries}=await run(f,'download_folder',{folder_token:'root'});
 const names=entries.map(e=>e.name);assert.equal(new Set(names.map(n=>n.toLowerCase())).size,names.length);
 for(const name of ['same.txt','same (2).txt','SAME (3).TXT','_download_manifest (2).json','空目录/','_download_manifest.json'])assert(names.includes(name),name);
 assert.equal(entries.find(e=>e.name==='same.txt').body.toString(),'a');
 assert.equal(entries.find(e=>e.name==='same (2).txt').body.toString(),'b');
 assert(r.results.some(e=>e.original_name==='same.txt'&&e.name_adjusted));
});
test('an entirely empty source folder is a real directory in ZIP',async()=>{
 const f=await harness(async u=>u.includes('/folder?')?ok({items:[],all_count:0}):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const {entries}=await run(f,'download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'空目录'});
 assert(entries.some(e=>e.name==='空目录/'&&(e.attributes&16)===16));
});
test('upstream missing an empty folder is not fabricated as a successful item',async()=>{
 const f=await harness(async u=>u.includes('/folder?')?ok({items:[],all_count:0}):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const {entries}=await run(f,'download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'根目录'});
 assert(!entries.some(e=>e.name.includes('未返回的空目录')));
});
test('unsafe path names remain contained and reserved device names safe',()=>{
 for(const name of ['../a.txt','..','CON','a\\b','a/b','nul.txt','x\0y']){
  const actual=safeName(name);assert(!actual.includes('/'));assert(!actual.includes('\\'));assert(!actual.includes('\0'));assert(!['.','..','CON','nul.txt'].includes(actual));
 }
 assert.equal(safeName('简历 + 2026.pdf'),'简历 + 2026.pdf');assert.equal(safeName('.gitignore'),'.gitignore');
});

// Contract captured from the owner-only live pure-empty-folder acceptance.
test('real Feishu null-items self-count response keeps an entirely empty folder',async()=>{
 const f=await harness(async u=>u.includes('/folder?')?ok({items:null,all_count:1}):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const {r,entries}=await run(f,'download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'空目录'});
 assert.equal(r.partial,false);assert.equal(r.bytes,0);
 assert(entries.some(e=>e.name==='空目录/'&&(e.attributes&16)===16));
});
test('real Feishu null-items leaf retains all three directory levels',async()=>{
 const tree={root:{items:[{file_key:'one',name:'一级空目录',is_folder:true}],all_count:1},one:{items:[{file_key:'two',name:'二级空目录',is_folder:true}],all_count:1},two:{items:null,all_count:1}};
 const f=await harness(async u=>u.includes('/folder?')?ok(tree[u.split('/files/')[1].split('/')[0]]):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const {r,entries}=await run(f,'download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'纯空根目录'});
 assert.equal(r.partial,false);assert.equal(r.bytes,0);
 assert.deepEqual(entries.filter(e=>e.name.endsWith('/')).map(e=>e.name),['纯空根目录/','纯空根目录/一级空目录/','纯空根目录/一级空目录/二级空目录/']);
});
for(const [name,data] of [['null items with unexplained count',{items:null,all_count:2}],['missing items',{all_count:1}],['null items claiming more pages',{items:null,all_count:1,has_more:true}]])test(name+' stays incomplete',async()=>{
 const f=await harness(async u=>u.includes('/folder?')?ok(data):ok({items:[{message_id:'m',msg_type:'folder',body:{content:'{"file_key":"root"}'}}]}));
 const j=await f.start(P,'primary','grant','download_message_attachment',{message_id:'m',file_key:'root',resource_type:'file',name:'根目录'});
 const r=await f.step(P,j.id,'primary','grant','user',current,async()=>{throw Error('bot must not be used')});
 assert.equal(r.status,'partial');assert.equal(r.results[0].error,'folder_page_incomplete');
});

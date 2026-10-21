import { READ_CAPABILITIES, WRITE_CAPABILITIES } from './capabilities.mjs';
export async function discoverScopes(config, transport = fetch) {
 const request = async(path, options) => {
  const r = await transport('https://open.feishu.cn' + path, { ...options, redirect:'error', signal:AbortSignal.timeout(10000) });
  if(!r.ok) throw new Error('Permission query failed.');
  const body = await r.text(); if(body.length > 1000000) throw new Error('Permission response too large.');
  const data=JSON.parse(body); if(data.code !== 0) throw new Error('Permission query rejected.'); return data;
 };
 const auth=await request('/open-apis/auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:config.appId,app_secret:config.appSecret})});
 if(typeof auth.tenant_access_token !== 'string' || auth.tenant_access_token.length>8192) throw new Error('Invalid app token response.');
 const data=await request('/open-apis/application/v6/scopes',{headers:{Authorization:'Bearer '+auth.tenant_access_token}});
 if(!Array.isArray(data.data?.scopes) || data.data.scopes.length>3000) throw new Error('Invalid permission response.');
 const granted=new Set(data.data.scopes.filter(s=>s.grant_status===1 && typeof s.scope_name==='string').map(s=>s.scope_name));
 const allowed=[...new Set([...READ_CAPABILITIES,...(config.enableWrites?WRITE_CAPABILITIES:[])])];
 const scopes=allowed.filter(s=>granted.has(s));
 if(!scopes.includes('offline_access')) throw new Error('Application requires offline_access permission.');
 return scopes;
}

import { createWorker } from '../snapshots/sites-adapter-0.1.0-sites.8/src/worker.ts';
import { Vault, hash, boundedText, AppError, type Env } from '../snapshots/sites-adapter-0.1.0-sites.8/src/security.ts';
interface StandaloneEnv extends Env { OWNER_LOGIN_HASH: string; MCP_ACCESS_HASH: string; STANDALONE_AUTH_FLOW?: string }
import { deviceAuth, providerTransport } from './device-auth.ts';
const cookieName = '__Host-feishu-owner';
const security = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };
const reply = (body: string, status = 200, headers = {}) => new Response(body, { status, headers: { ...security, ...headers } });
const cookie = (value: string, age: number) => `${cookieName}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
export default {
 async fetch(request: Request, env: StandaloneEnv): Promise<Response> {
  try {
   const url = new URL(request.url);
   if (url.origin !== env.APP_ORIGIN || !env.APP_ORIGIN.startsWith('https://')) return reply('Invalid origin', 403);
   if (request.headers.get('origin') && request.headers.get('origin') !== env.APP_ORIGIN) return reply('Cross-origin request denied', 403);
   if (!/^[A-Za-z0-9_-]{43}$/.test(env.OWNER_LOGIN_HASH) || !/^[A-Za-z0-9_-]{43}$/.test(env.MCP_ACCESS_HASH)) return reply('Configuration required', 503);
   if (url.pathname === '/health' && request.method === 'GET') return reply(JSON.stringify({ status: 'ok', mode: 'standalone-feishu', synthetic: false }), 200, { 'Content-Type': 'application/json' });
   const vault = new Vault(env.APP_ENCRYPTION_KEY);
   const binding = JSON.stringify([env.APP_ORIGIN, 'standalone-owner-session', env.OWNER_LOGIN_HASH]);
   if (url.pathname === '/login' && !url.search) {
    if (request.method === 'GET') return reply('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>飞书独立工作台登录</title><h1>飞书独立工作台</h1><p>输入本机配置文件中的 ownerLoginToken。密钥不会放在网址里。</p><form method="post" action="/login"><label>登录密钥 <input name="token" type="password" autocomplete="current-password" required maxlength="100"></label><button>登录</button></form>', 200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (request.method !== 'POST') return reply('Method not allowed', 405);
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return reply('Invalid form origin', 403);
    const body = new URLSearchParams(await boundedText(new Response(request.body), 1024));
    if ([...body.keys()].some(k => k !== 'token') || body.getAll('token').length !== 1 || await hash(body.get('token')!) !== env.OWNER_LOGIN_HASH) return reply('Login denied', 401);
    const session = await vault.seal({ expires: Date.now() + 8 * 3600000 }, binding);
    return reply('', 303, { Location: '/', 'Set-Cookie': cookie(session, 8 * 3600) });
   }
   let browser = false;
   const cookies = (request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(cookieName + '='));
   if (cookies.length === 1) {
    try { const s = await vault.open<{expires:number}>(cookies[0]!.slice(cookieName.length + 1), binding); browser = Number.isSafeInteger(s.expires) && s.expires > Date.now() && s.expires <= Date.now() + 8 * 3600000; } catch {}
   }
   // The API token is deliberately accepted only for MCP, never for write-confirmation pages.
   const auth = request.headers.get('authorization') ?? '';
   const machine = url.pathname === '/mcp' && /^Bearer [A-Za-z0-9_-]{43}$/.test(auth) && await hash(auth.slice(7)) === env.MCP_ACCESS_HASH;
   if (!browser && !machine) {
    if (request.method === 'GET' && url.pathname === '/') return reply('', 303, { Location: '/login' });
    return reply('Authentication required', 401);
   }
   if (url.pathname === '/logout' && request.method === 'POST') {
    if (!browser || request.headers.get('origin') !== env.APP_ORIGIN) return reply('Cross-origin request denied', 403);
    return reply('', 303, { Location: '/login', 'Set-Cookie': cookie('', 0) });
   }
   if (url.pathname==='/device-login' || url.pathname.startsWith('/api/device/')) {
    if (!browser) return reply('Browser login required',401);
    return await deviceAuth(request,env,{site:env.APP_ORIGIN,user:'standalone-owner'},cookies[0]!);
   }
   if (env.STANDALONE_AUTH_FLOW==='device' && ['/api/feishu/connect','/api/feishu/connect-documents','/api/apps/connect'].includes(url.pathname)) return reply('Device mode: use /device-login for this installation.',409);
   const core = createWorker({fetcher:(u,i)=>providerTransport(env,u,i)});
   const h = new Headers(request.headers);
   h.delete('oai-authenticated-user-id'); h.delete('authorization');
   h.set('oai-authenticated-user-id', 'standalone-owner');
   const result=await core.fetch(new Request(request, { headers: h }), { ...env, FEISHU_DATA_MODE: 'feishu' });
   if(env.STANDALONE_AUTH_FLOW==='device'&&result.status===200&&request.method==='GET'&&url.pathname==='/')return new Response((await result.text()).replace('</h1>','</h1><p><a href="/device-login">通过飞书设备码连接（无需修改回调）</a></p>'),{status:200,headers:result.headers});
   if(env.STANDALONE_AUTH_FLOW==='device'&&result.status===200&&url.pathname==='/style.css')return new Response((await result.text())+'\n#connect-form,#app-add{display:none}',{status:200,headers:result.headers});
   return result;
  } catch (error) { const code=error instanceof AppError?error.code:'invalid_request'; console.warn(JSON.stringify({event:'standalone_failure',code})); return reply('Request rejected: '+code,error instanceof AppError?error.status:400); }
 }
};

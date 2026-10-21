#!/usr/bin/env node
import { readFile, writeFile, stat, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
process.umask(0o077);
const home = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const command = args.shift();
const options = {};
while (args.length) { const key = args.shift(); const value = args.shift(); if (!['--config','--app-config','--origin','--data','--cert','--key','--port','--auth-flow'].includes(key) || !value || options[key]) throw new Error('Invalid command options.'); options[key] = value; }
const secret = () => randomBytes(32).toString('base64url');
async function privateJson(path) {
 const s = await stat(path); if (!s.isFile() || (process.platform !== 'win32' && (s.mode & 0o077))) throw new Error('Config must be a private file (chmod 600).');
 return JSON.parse(await readFile(path, 'utf8'));
}
function validate(c) {
 if(c.authFlow !== undefined && !['pkce','device'].includes(c.authFlow)) throw new Error('Invalid authorization flow.');
 const u = new URL(c.origin); if (u.protocol !== 'https:' || u.origin !== c.origin) throw new Error('Origin must be an HTTPS origin without path.');
 if (typeof c.appId !== 'string' || typeof c.appSecret !== 'string' || !c.appId || !c.appSecret || !c.dataDirectory || typeof c.enableWrites !== 'boolean') throw new Error('Application configuration required.');
 if (c.oauthScopes !== undefined && (!Array.isArray(c.oauthScopes) || !c.oauthScopes.includes('offline_access') || c.oauthScopes.length > 150 || c.oauthScopes.some(s => typeof s !== 'string' || !/^[a-zA-Z0-9_:.]+$/.test(s)))) throw new Error('Invalid OAuth scopes.');
 for (const name of ['encryptionKey','ownerLoginToken','mcpAccessToken']) if (!/^[A-Za-z0-9_-]{43}$/.test(c[name])) throw new Error('Invalid security configuration.');
 if (new Set([c.encryptionKey,c.ownerLoginToken,c.mcpAccessToken]).size !== 3) throw new Error('Independent secrets required.');
}
try {
 if (command === 'init') {
  if (!options['--config'] || !options['--app-config'] || !options['--origin'] || !options['--data']) throw new Error('init requires --config, --app-config, --origin and --data.');
  const app = await privateJson(resolve(options['--app-config']));
  const c = { origin: options['--origin'], appId: app.appId, appSecret: app.appSecret, dataDirectory: resolve(options['--data']), enableWrites: false, authFlow: options['--auth-flow'] ?? 'pkce', encryptionKey: secret(), ownerLoginToken: secret(), mcpAccessToken: secret() };
  validate(c); const path = resolve(options['--config']); await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(c, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.error('Private config created. No secrets printed. Writes disabled until explicitly enabled in config.');
 } else if (command === 'sync-permissions') {
  const path = resolve(options['--config'] ?? ''); const c = await privateJson(path); validate(c);
  const { discoverScopes } = await import('./permissions.mjs'); c.oauthScopes = await discoverScopes(c); validate(c);
  const pending = path + '.pending'; await writeFile(pending, JSON.stringify(c,null,2)+'\n',{flag:'wx',mode:0o600}); await rename(pending,path);
  console.error('Application permissions synchronized. Restart service and authorize the updated scope list. No application permissions were changed.');
 } else if (command === 'serve') {
  const c = await privateJson(resolve(options['--config'] ?? '')); validate(c);
  const port = Number(options['--port'] ?? 8443); if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port.');
  if (!options['--cert'] || !options['--key']) throw new Error('Both TLS certificate and key are required.');
  const signalBaseline = new Map(['SIGINT','SIGTERM'].map(s => [s, new Set(process.listeners(s))]));
  const { startService } = await import('./runtime.mjs');
  const svc = await startService(c, { bundle: resolve(home, 'worker.js'), migrations: resolve(home, 'migrations'), port, cert: options['--cert'], key: options['--key'] });
  // Miniflare's pinned exit hook exits synchronously on signals. The CLI owns graceful
  // shutdown: remove only listeners installed during runtime startup; retain exit cleanup.
  for (const signal of ['SIGINT','SIGTERM']) for (const listener of process.listeners(signal)) if (!signalBaseline.get(signal).has(listener)) process.removeListener(signal, listener);
  console.error('Feishu standalone started on loopback. Open your configured HTTPS origin; log in then connect Feishu.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => void svc.close().finally(() => process.exit(0)));
 } else if (command === 'connect') {
  const c = await privateJson(resolve(options['--config'] ?? '')); validate(c);
  const { connect } = await import('./connect.mjs'); await connect(c);
 } else { console.error('Usage: feishu-mcp init|sync-permissions|serve|connect --config <private.json>. See README for HTTPS setup and Feishu OAuth.'); process.exitCode = 64; }
} catch (e) { console.error('Startup failed. Check private config permissions, HTTPS certificate, port, and data-directory lock; no secrets logged.'); process.exitCode = 1; }

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
const runtimeRequire = createRequire(createRequire(import.meta.url).resolve('miniflare'));
export function assertSafeRuntimeDependencies() {
 for (const [name,minimum] of [['undici',[7,29,1]],['sharp',[0,35,5]]]) {
  let directory=dirname(runtimeRequire.resolve(name));
  let version;
  for(let depth=0;depth<5;depth++) {
   const manifest=resolve(directory,'package.json');
   if(existsSync(manifest)) {
    const pkg=JSON.parse(readFileSync(manifest,'utf8'));
    if(pkg.name===name) {version=pkg.version;break;}
   }
   directory=dirname(directory);
  }
  if(typeof version!=='string') throw new Error('Cannot verify runtime dependency '+name+'.');
  const parts=version.split('.').map(Number);
  const valid=parts.length===3 && parts.every(Number.isInteger) && parts[0]===minimum[0] && (parts[1]>minimum[1] || (parts[1]===minimum[1] && parts[2]>=minimum[2]));
  if(!valid) throw new Error('Unsupported runtime dependency '+name+'. Follow standalone/README.md to install the reviewed root overrides before starting.');
 }
}
import { readFile, readdir, mkdir, open, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const digest = s => createHash('sha256').update(s).digest('base64url');
export async function startService(config, { bundle, migrations, cert, key, port = 8443, outboundService } = {}) {
 assertSafeRuntimeDependencies();
 const { Miniflare } = await import('miniflare');
 const data = resolve(config.dataDirectory);
 await mkdir(data, { recursive: true, mode: 0o700 });
 const dataStat = await stat(data); if (process.platform !== 'win32' && (dataStat.mode & 0o077)) throw new Error('Data directory must be private (chmod 700).');
 const lockPath = resolve(data, 'service.lock');
 const lock = await open(lockPath, 'wx', 0o600);
 await lock.writeFile(String(process.pid));
 let mf;
 try {
  mf = new Miniflare({ modules: true, scriptPath: bundle, compatibilityDate: '2026-07-30', host: '127.0.0.1', port, cf: false,
   ...(cert && key ? { https: true, httpsCertPath: cert, httpsKeyPath: key } : {}),
   d1Databases: { DB: 'feishu-standalone' }, d1Persist: resolve(data, 'd1'), r2Buckets: { BUCKET: 'feishu-attachments' }, r2Persist: resolve(data, 'r2'),
   bindings: { APP_ORIGIN: config.origin, APP_ENCRYPTION_KEY: config.encryptionKey, FEISHU_APP_ID: config.appId, FEISHU_APP_SECRET: config.appSecret,
    OWNER_LOGIN_HASH: digest(config.ownerLoginToken), MCP_ACCESS_HASH: digest(config.mcpAccessToken), FEISHU_READ_ENABLED: 'true', FEISHU_DOCX_ENABLED: 'true', FEISHU_WRITE_ENABLED: config.enableWrites ? 'true' : 'false', FEISHU_DATA_MODE: 'feishu', STANDALONE_AUTH_FLOW: config.authFlow ?? 'pkce', ...((config.oauthScopes || config.authFlow==='device') ? { FEISHU_OAUTH_SCOPES: config.oauthScopes ?? ['docx:document:readonly','offline_access'] } : {}) },
   ...(outboundService ? { outboundService } : {}) });
  const db = await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE IF NOT EXISTS standalone_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)').run();
  for (const name of (await readdir(migrations)).filter(n => n.endsWith('.sql')).sort()) {
   const sql = await readFile(resolve(migrations, name), 'utf8'); const checksum = digest(sql);
   const applied = await db.prepare('SELECT hash FROM standalone_migrations WHERE name = ?').bind(name).first();
   if (applied) { if (applied.hash !== checksum) throw new Error('Migration checksum mismatch; restore reviewed migration files.'); continue; }
   const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s));
   await db.batch([...statements, db.prepare('INSERT INTO standalone_migrations (name, hash) VALUES (?, ?)').bind(name, checksum)]);
  }
  await mf.ready;
  let closing;
  return { mf, db, close: () => closing ??= (async () => { await mf.dispose(); await lock.close(); await unlink(lockPath); })() };
 } catch (e) { await mf?.dispose(); await lock.close(); await unlink(lockPath); throw e; }
}

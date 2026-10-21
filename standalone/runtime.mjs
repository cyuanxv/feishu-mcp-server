import { Miniflare } from 'miniflare';
import { readFile, readdir, mkdir, open, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const digest = s => createHash('sha256').update(s).digest('base64url');
export async function startService(config, { bundle, migrations, cert, key, port = 8443, outboundService } = {}) {
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

import { createRequire } from 'node:module';
import { mkdir, cp, writeFile, chmod, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(new URL('../snapshots/sites-adapter-0.1.0-sites.8/package.json', import.meta.url));
const { build } = require('esbuild');
const output = resolve(process.argv[2] ?? 'standalone-stage');
try { await access(output); throw new Error('Fresh output directory required.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(output, { recursive: true });
await build({ entryPoints: ['standalone/worker.ts'], outfile: resolve(output,'worker.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
await build({ entryPoints: ['standalone/capabilities.ts'], outfile: resolve(output,'capabilities.mjs'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
for (const file of ['permissions.mjs','cli.mjs','runtime.mjs','connect.mjs','README.md','server.json']) await cp(`standalone/${file}`, resolve(output,file));
await cp('snapshots/sites-adapter-0.1.0-sites.8/drizzle', resolve(output,'migrations'), {recursive:true});
await cp('LICENSE',resolve(output,'LICENSE'));
const pkg = { name:'@cyuanxv/feishu-mcp-standalone', version:'0.1.0-local.4', private:true, type:'module', license:'MIT', author:{name:'cyuanxv',url:'https://x.com/cyuanxv'}, description:'Self-hosted single-owner Feishu MCP service using your own app and user OAuth.', mcpName:'io.github.cyuanxv/feishu-mcp-standalone', engines:{node:'>=22'}, bin:{'feishu-mcp':'cli.mjs'}, files:['capabilities.mjs','permissions.mjs','cli.mjs','runtime.mjs','connect.mjs','worker.js','migrations','README.md','LICENSE','server.json'], dependencies:{miniflare:'4.20260730.0','@modelcontextprotocol/sdk':'1.32.1'}, scripts:{prepublishOnly:`node -e "console.error('Local review only. Publication disabled.');process.exit(1)"`} };
await writeFile(resolve(output,'package.json'),JSON.stringify(pkg,null,2)+'\n'); await chmod(resolve(output,'cli.mjs'),0o755);
console.log('Standalone package built locally; no deployment or publication.');

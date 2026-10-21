import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
const target = resolve(process.argv[2] || 'release-stage');
if (existsSync(target)) throw new Error('Use a fresh release staging directory.');
const source = JSON.parse(readFileSync('package.json', 'utf8'));
const registry = JSON.parse(readFileSync('distribution/server.preview.json', 'utf8'));
mkdirSync(target, { recursive: true });
for (const name of ['dist', 'LICENSE']) cpSync(name, `${target}/${name}`, { recursive: true });
cpSync('distribution/server.preview.json', `${target}/server.json`);
cpSync('distribution/README.md', `${target}/README.md`);
const manifest = { name: registry.packages[0].identifier, version: registry.version, private: true,
  description: registry.description, mcpName: registry.name, type: 'module', license: 'MIT', engines: { node: '>=22' },
  bin: { 'feishu-mcp-preview': 'dist/apps/mcp-server/src/main-stdio.js' },
  files: ['dist', 'LICENSE', 'README.md', 'server.json'], dependencies: source.dependencies,
  scripts: { prepublishOnly: `node -e "console.error('Local preview: publication is disabled.');process.exit(1)"` } };
writeFileSync(`${target}/package.json`, JSON.stringify(manifest, null, 2) + '\n');
chmodSync(`${target}/dist/apps/mcp-server/src/main-stdio.js`, 0o755);
console.log('Local package staged. Publication disabled; no upload performed.');

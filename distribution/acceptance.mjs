import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const entry = resolve('node_modules/@cyuanxv/feishu-mcp-preview/dist/apps/mcp-server/src/main-stdio.js');
const env = { FEISHU_APP_SECRET: 'synthetic-unused-sentinel', FEISHU_ACCESS_TOKEN: 'synthetic-unused-sentinel', NODE_OPTIONS: `--import=${resolve('deny-network.mjs')}` };
const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: 'pipe' });
let logs = ''; transport.stderr?.on('data', data => { logs += data; });
const client = new Client({ name: 'isolated-install-check', version: '1.0.0' });
try {
 await client.connect(transport);
 assert.equal(client.getServerVersion().name, 'feishu-mcp-preview');
 const { tools } = await client.listTools();
 assert.equal(tools.length, 17);
 assert(tools.every(t => t.annotations.readOnlyHint === true));
 assert(!tools.some(t => /^(create|update|send|delete|complete)_/.test(t.name)));
 const profile = await client.callTool({ name: 'get_profile', arguments: {} });
 assert.equal(profile.structuredContent.meta.source, 'synthetic_mock');
 assert.equal(profile.structuredContent.ok, true);
 const search = await client.callTool({ name: 'search', arguments: { query: 'payment' } });
 assert.equal(search.structuredContent.ok, true);
 assert.equal(search.structuredContent.meta.source, 'synthetic_mock');
 assert(JSON.stringify(search).includes('Payment'));
 const tasks = await client.callTool({ name: 'list_tasks', arguments: { status: 'todo' } });
 assert.equal(tasks.structuredContent.ok, true);
 assert(JSON.stringify(tasks).includes('Review payment retries'));
 const invalid = await client.callTool({ name: 'search', arguments: { query: '' } });
 assert.equal(invalid.isError, true);
 const write = await client.callTool({ name: 'send_message', arguments: {} });
 assert.equal(write.isError, true);
 assert(!JSON.stringify([profile, search, tasks]).includes('synthetic-unused-sentinel'));
} finally { await client.close(); }
assert(logs.includes('synthetic read-only'));
assert(!logs.includes('NETWORK_BLOCKED'));
for (const args of [[], ['--live']]) {
 const result = spawnSync(process.execPath, [entry, ...args], { env: { ...env, FEISHU_MODE: 'live' }, encoding: 'utf8', timeout: 5000 });
 assert.equal(result.status, 78);
 assert.equal(result.stdout, '');
 assert(!result.stderr.includes('synthetic-unused-sentinel'));
}
console.log('PASS: isolated tgz install, stdio initialization, 17 read-only tools, profile/search/tasks, invalid input, unknown write tool, live-mode refusal, clean close, no network or credential leakage.');

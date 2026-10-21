import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { startService } from './node_modules/@cyuanxv/feishu-mcp-standalone/runtime.mjs';
const data=resolve('unsafe-dependency-must-not-create-data');
assert(!existsSync(data));
await assert.rejects(startService({dataDirectory:data}),/Unsupported runtime dependency/);
assert(!existsSync(data));
console.log('PASS unpatched runtime dependencies rejected before data creation or listener startup.');

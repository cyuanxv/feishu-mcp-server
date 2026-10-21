#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MockFeishuAdapter } from '../../../packages/feishu/src/adapter.js';
import { demoIdentity, demoWorkspaces } from '../../../packages/feishu/src/fixtures.js';
import { Handles } from '../../../packages/policy/src/core.js';
import { descriptions, inputSchemas, outputSchema, readToolNames } from '../../../packages/schemas/src/catalog.js';
import { ToolEngine } from '../../../packages/tools/src/engine.js';

// This entrypoint never reads credentials, loads .env, binds a port or creates a live adapter.
if (process.argv.slice(2).length || (process.env.FEISHU_MODE && process.env.FEISHU_MODE !== 'mock')) {
  console.error('Synthetic preview only. Live mode and command arguments are unsupported.');
  process.exit(78);
}
const engine = new ToolEngine(new MockFeishuAdapter(demoWorkspaces()), new Handles(randomBytes(32)));
const identity = demoIdentity();
const server = new McpServer({ name: 'feishu-mcp-preview', version: '0.1.0-preview.1' });
for (const name of readToolNames) {
  server.registerTool(name, {
    description: descriptions[name], inputSchema: inputSchemas[name], outputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  }, async (args: unknown) => {
    const result = await engine.call(name, args, identity);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok };
  });
}
console.error('Feishu MCP preview: synthetic read-only fixtures only; no live Feishu access.');
await server.connect(new StdioServerTransport());
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void server.close().finally(() => process.exit(0)); });

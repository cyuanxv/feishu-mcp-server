import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
export async function connect(config) {
 const remote = new Client({ name: 'feishu-standalone-bridge', version: '0.1.0-local.2' });
 await remote.connect(new StreamableHTTPClientTransport(new URL('/mcp', config.origin), { requestInit: { headers: { Authorization: `Bearer ${config.mcpAccessToken}` } } }));
 const local = new Server({ name: 'feishu-mcp-standalone', version: '0.1.0-local.2' }, { capabilities: { tools: {} } });
 local.setRequestHandler(ListToolsRequestSchema, r => remote.listTools(r.params));
 local.setRequestHandler(CallToolRequestSchema, r => remote.callTool(r.params));
 await local.connect(new StdioServerTransport());
 local.onclose = () => { void remote.close(); };
 for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { void Promise.all([local.close(),remote.close()]).finally(() => process.exit(0)); });
}

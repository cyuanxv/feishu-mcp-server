# Feishu MCP — 本地合成数据预览包

此发行包仅用于独立安装和 MCP 连接验收，不连接真实飞书，不提供私人服务入口。17 个只读工具使用虚构数据，工具响应标注 `synthetic_mock`。无需飞书账号、密钥或数据库。

## 本地安装

要求 Node.js 22+（本轮使用 Node.js 24 验证）。在新的空目录中安装交付的 tgz：

```sh
npm init -y
npm install --ignore-scripts /absolute/path/cyuanxv-feishu-mcp-preview-0.1.0-preview.1.tgz
./node_modules/.bin/feishu-mcp-preview
```

启动后等待 MCP 客户端通过标准输入输出通信，不是网页服务。日志输出到 stderr。MCP 客户端配置示例（将路径替换为自己的安装目录）：

```json
{"mcpServers":{"feishu-preview":{"command":"/absolute/path/node_modules/.bin/feishu-mcp-preview"}}}
```

可以调用 `get_profile`、`search`、`list_tasks` 等工具检查合成结果。不能用此预览入口读写真实飞书；设置 `FEISHU_MODE=live` 会被拒绝。

## 与完整源码的关系

完整源码包保留独立服务与云端适配器及其配置说明。它们需要使用者部署自己的身份验证、存储和飞书授权，并单独进行真实业务验收；不会由本命令自动启用。本包不是完整云端插件的一键替代品。

## 本合成演示包的状态

本目录仅保留本地合成演示，标识为 `io.github.cyuanxv/feishu-mcp-preview`，没有发布该演示包。`private: true` 与 `prepublishOnly` 保留误发布保护，无私人服务地址。

**已经公开的是完整服务独立安装版**：[npm 安装包](https://www.npmjs.com/package/@cyuanxv/feishu-mcp-standalone) · [MCP Registry 官方登记](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cyuanxv%2Ffeishu-mcp-standalone/versions/0.1.0-local.3)，包名为 `@cyuanxv/feishu-mcp-standalone`，版本 `0.1.0-local.3`。需要真实飞书功能时，请使用 [独立安装指南](../standalone/README.md)，不要将本目录的合成配置当作已发布服务。

作者：[Twitter / X @cyuanxv](https://x.com/cyuanxv)。MIT。

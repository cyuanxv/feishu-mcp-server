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

## Registry 状态

`server.json` 是符合官方 schema 的待发布配置，标识为 `io.github.cyuanxv/feishu-mcp-preview`。包名为拟定名称，未验证 npm 所有权或可用性，尚未发布、未登记。`private: true` 与 `prepublishOnly` 双重阻止误发布。无 `remotes` 配置，无生产地址。

公开前仍需：用户批准 → 确认包名及账户权限 → 审核并解除发布保护 → 公共 npm 包发布 → GitHub 命名空间身份验证 → Registry 提交与在线回读。本地 schema 检查不代表 Registry 已接受。

作者：[Twitter / X @cyuanxv](https://x.com/cyuanxv)。MIT。

# 本地发行与 Registry 配置验收

日期：2026-10-22。仅本地，未发布、未创建仓库、未推送、未部署，未使用私人生产服务。

## 交付范围

- 安装包：`cyuanxv-feishu-mcp-preview-0.1.0-preview.1.tgz`，118210 字节。
- 名称：`@cyuanxv/feishu-mcp-preview`；版本：`0.1.0-preview.1`。
- Registry 名称：`io.github.cyuanxv/feishu-mcp-preview`；stdio 传输，不含 remotes。
- 这是新增的合成数据只读预览入口，不是完整飞书云端服务的一键安装包。现有完整源码与自部署说明仍保留。
- 未配置 npm 远端或 Registry 身份验证；名称尚未注册、未确认可用。`private: true` 和 prepublishOnly 拒绝误发布。

## 本轮实测

| 检查 | 结果 |
|---|---|
| 类型检查、构建、源文件模式检查 | 通过 |
| Node 回归 | 807 通过，21 PostgreSQL 测试跳过 |
| 从 tgz 安装到独立空目录 | 通过；没有链接源码或复用源码 node_modules |
| SDK 初始化与工具发现 | 通过，17 个只读工具 |
| 合成 profile、search、list_tasks | 通过，响应为 synthetic_mock |
| 非法查询、未知写入工具 | 返回错误 |
| live 模式和命令参数 | 拒绝启动，退出码 78 |
| npm 安装后的 bin 可执行文件 | 启动门禁验证通过 |
| stdout 协议与 stderr 日志隔离、客户端关闭 | 通过 |
| 子进程网络拦截 | 未触发连接；真实飞书请求 0 |
| 合成凭据哨兵泄漏检查 | 响应未包含哨兵 |
| 既有生产入口未配置启动保护 | 通过 |
| 官方固定版本 JSON Schema | 通过 |
| 包名、版本、mcpName 对应关系 | 通过 |
| 发布保护脚本 | 按预期退出 1；未执行 npm publish |

Node.js 24.19.0。Worker 代码未修改，本轮未重复运行此前 306 项 Worker 和 21 项 workerd 检查；不把历史结果计为本轮执行。独立安装需要联网获取 npm 依赖，服务运行验收则禁止网络连接。安装依赖锁定结果单独保存在本地验收目录。

## 未完成的外部环节

公开 npm 包、GitHub namespace 验证、Registry 提交及在线可发现性均未执行。Schema 通过不能替代线上登记。本轮未验证使用者自己部署后的真实飞书授权与业务操作。

SHA-256：`b5d0da3f8102de8ead3eabeebd0431f6d40dd2b9103197222d4cbeb10c7e9324`。

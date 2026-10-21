# 本地构建与复验

这是给开发者的发行预览，不会上传任何内容。Node.js 22+，本轮 Node.js 24.19.0。

在源码根目录执行：

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
node scripts/build-release.mjs ../release-stage
node distribution/validate-registry.cjs ../release-stage distribution/server.preview.json
cd ../release-stage
npm pack --ignore-scripts
```

`build-release.mjs` 只允许使用尚不存在的目标目录，避免覆盖既有文件。校验脚本使用锁文件安装的 ajv 和 ajv-formats。`server.schema.json` 来自官方固定版本 schema，不使用“最新”漂移地址。

安装验收：在新的空目录运行 `npm init -y` 后安装 tgz（见 README），将本目录 `acceptance.mjs` 和 `deny-network.mjs` 复制过去，执行 `node acceptance.mjs`。测试通过标准 MCP SDK 建立连接，验证 17 个只读工具与合成查询，验证非法输入和未知写入调用返回错误，验证 live 模式拒绝启动。网络拦截在服务子进程内生效；安装依赖本身需要访问 npm，不属于离线安装包。

原有真实服务入口继续由显式配置门禁保护，不能将本预览入口作为生产服务。完整云端功能的自部署和真实业务验收不属于本次合成协议验收。

## 官方参考

- https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx
- https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md
- https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

尚未验证远端包名是否可用、npm scope 所有权、GitHub namespace 登录和 Registry 在线接受结果。以上须在批准发布后执行。

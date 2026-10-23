# Feishu MCP 独立安装版（开源预览版）

版权所有 © 2026 cyuanxv · [Twitter / X：@cyuanxv](https://x.com/cyuanxv) · MIT 许可证

这是完整 Worker 功能的单用户自托管入口，直接调用飞书 API，不是合成数据演示。包含独立登录、飞书 OAuth、多应用连接和权限路由、查询、写入预览确认、附件与持久化存储。实际可用功能取决于自己的应用权限、用户授权、资源访问范围及原有功能限制。不是飞书官方服务。

运行时用 workerd/Miniflare 在本机执行 Worker，D1/R2 数据分别保存在自己的数据目录中。适用于个人独立部署预览，未进行多人、多实例或公网大规模生产认证。Windows/Linux/macOS 的具体兼容性以 Miniflare/workerd 支持的平台为准；本轮验收 macOS、Node.js 24。

**公开版本：`0.1.0-local.4`（预览版）** · [npm 安装包](https://www.npmjs.com/package/@cyuanxv/feishu-mcp-standalone) · [MCP Registry 官方登记](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cyuanxv%2Ffeishu-mcp-standalone/versions/0.1.0-local.4)

Registry 标识为 `io.github.cyuanxv/feishu-mcp-standalone`，对应本安装包；其中 `--config` 应填写自己初始化的私有配置文件绝对路径。它不提供作者的私人服务入口。

## 1. 安装

需要 Node.js 22+（建议 24）、自己的飞书应用、自己控制的 HTTPS origin（域名、端口）及浏览器/Node 信任的 TLS 证书。应用与域名不由本程序代申请。

```sh
mkdir feishu-local && cd feishu-local
npm init -y
npm pkg set overrides.miniflare.undici=7.29.1 overrides.miniflare.sharp=0.35.5
npm install --ignore-scripts @cyuanxv/feishu-mcp-standalone@0.1.0-local.4
```

依赖安装需要互联网；不需要编译 TypeScript、Sites 账号或 Cloudflare 账号。将以下 app.json 写在源码包之外并设置 `chmod 600 app.json`（Windows 应使用仅本人的文件 ACL）：

```json
{"appId":"YOUR_FEISHU_APP_ID","appSecret":"YOUR_FEISHU_APP_SECRET"}
```

## 2. 初始化与启动

替换所有示例路径与域名。origin 必须与实际访问地址完全一致，不带末尾斜杠。端口默认 8443；服务只绑定 127.0.0.1，可在本机访问，也可由自己的 HTTPS 反向代理访问，代理须保留原 Host 并信任上游证书。服务本身要求 TLS，不信任转发身份头。

```sh
./node_modules/.bin/feishu-mcp init --app-config /private/app.json --config /private/feishu/config.json --data /private/feishu/data --origin https://localhost:8443
./node_modules/.bin/feishu-mcp sync-permissions --config /private/feishu/config.json
./node_modules/.bin/feishu-mcp serve --config /private/feishu/config.json --cert /private/tls/cert.pem --key /private/tls/key.pem --port 8443
```

本机可使用自己已信任的 localhost 证书；不能通过关闭浏览器或 Node 的 TLS 校验绕过。使用远端域名时，由自己配置证书和反向代理；不要复用任何他人的生产域名、密钥或数据库。

`sync-permissions` 只查询自己应用已获批准的权限，自动筛选本服务支持的权限并保存，不替你申请或开通权限。首次运行和权限变化后执行，然后在浏览器确认授权。这样无需逐项手填权限。尚未同步时只请求基础日程权限。

初始化生成独立的加密密钥、网页登录密钥和 MCP 访问密钥，写入权限 600 的配置文件，不输出密钥。配置已经存在时拒绝覆盖。第一次启动自动迁移数据库；重启不重复迁移；迁移文件被篡改会拒绝启动。不要同时启动两个进程操作同一数据目录。已有数据目录必须为权限 700（Windows 使用仅本人的 ACL），否则拒绝启动。

## 3. 登录并授权自己的飞书

1. 在自己飞书应用后台配置回调：`https://localhost:8443/api/feishu/callback`（或替换为自己的 HTTPS origin）。飞书应用后台若不接受本机回调，应使用自己的可访问 HTTPS 域名。
2. 申请所需功能权限并完成应用发布/审批。先授权日程读取，再在工作台追加其他功能权限；不保证不同企业的审核要求相同。
3. 打开自己的 HTTPS 地址，在登录页输入配置中的 `ownerLoginToken`。它是本站登录凭据，不是飞书 App Secret。
4. 点击工作台“连接飞书”，在飞书页面完成用户授权，再返回本站。可在应用管理里添加更多自己的应用。
5. 需要写入时将配置 `enableWrites` 改为 `true`，重新运行 `sync-permissions` 后重启并重新授权；每次业务写入仍须打开预览页，由网页登录用户确认。MCP 访问令牌不能代替网页登录确认。

如果回调时本站登录已过期，请重新登录后重新发起连接。配置/数据目录的 origin 与加密密钥不可随意更改，否则已有授权和密文不可解密；应备份后重新授权。

## 4. 接入 MCP 客户端

启动服务并授权后，在支持 stdio 的 MCP 客户端使用本地安装路径：

```json
{"mcpServers":{"feishu":{"command":"/absolute/path/node_modules/.bin/feishu-mcp","args":["connect","--config","/private/feishu/config.json"]}}}
```

桥接进程只连接配置中自己的 HTTPS origin，证书必须可信。远程 MCP 客户端也可以访问 `/mcp`，通过 `Authorization: Bearer <mcpAccessToken>` 认证；不要在 URL 中放令牌。该方式不是面向任意公众的 OAuth 注册服务，也不意味着所有 ChatGPT 客户端均支持此安装方式。

## 5. 数据、升级与停止

使用 Ctrl+C 停止，等待数据库进程关闭。备份时先停止服务，将配置、D1 与 R2 整个数据目录一起保存到自己的加密备份位置；不要提交到 git 或分享源码包。保留原 origin 与 encryptionKey 才能恢复授权密文。写入预览与附件均使用本地持久化存储。

升级前备份。意外掉电或 SIGKILL 可能留下 `data/service.lock`；先确认原进程已经停止，再手动移除该锁文件，不能在运行中删除。登录会话最长 8 小时；可 POST `/logout` 清除当前浏览器 Cookie。轮换 ownerLoginToken 可让原网页登录会话失效；轮换 mcpAccessToken 可使旧 MCP 令牌失效，重启生效。

在线文档导出、多层群聊文件夹等能力仍保留原源码的真实验收限制，不因能独立安装就宣称所有飞书业务已验收。

## 发布状态

这是公开自托管预览版，使用 npm 的 preview 标签。必须先按安装章节设置依赖修复；不支持跳过初始化、HTTPS、用户授权而直接运行。Registry 仅登记安装包，不提供作者的私人服务、凭据或数据。真实业务验收范围仍受本文所述限制。

## 官方设备码授权（无需修改应用回调）

飞书支持设备码授权的应用可在初始化时加 `--auth-flow device`。服务启动后，从首页“通过飞书设备码连接”进入，生成入口、在飞书页面核对权限并授权，然后返回点击“已授权，完成连接”。默认只请求 `docx:document:readonly` 和 `offline_access`；也可先运行 `sync-permissions` 同步自己明确需要的范围。

这个模式使用飞书官方 accounts.feishu.cn 设备授权端点与 v3 令牌端点，单次轮询由本人在浏览器点击触发；设备码只以加密的短期表单状态保留，授权绑定当前登录会话与断开连接版本，拒绝重复提交和意外扩权。令牌交换与刷新均明确携带选定 scope，避免继承应用历史授权的更大范围。

设备码模式当前只支持主应用，不支持从页面追加其他应用的网页回调授权；需要多应用连接时使用默认 PKCE 模式并配置各应用回调。企业或应用可能限制设备授权能力，以实际飞书响应为准。无论选择哪种模式，服务自身仍需 HTTPS 和本人登录，不能将作者的私有测试地址写入客户端配置。

参考：[飞书官方 CLI 的设备授权实现](https://github.com/larksuite/cli/blob/main/internal/auth/device_flow.go)。

## 运行依赖修复（0.1.0-local.3）

当前稳定版 Miniflare 固定了受安全公告影响的 undici / sharp 版本。安装前必须在**使用者自己的安装目录**设置上述两项 npm overrides；安装包内部的 overrides 不会向使用者生效。运行入口会检查实际解析的依赖版本，未修复时拒绝启动，不创建数据库或开放监听。

经测试的替换版本为 undici 7.29.1 与 sharp 0.35.5。安装后运行 `npm audit` 核对；不要直接执行 `npm audit fix --force` 或自行降级 Miniflare。本候选版不是对未来新增漏洞的保证。

0.1.0-local.2 的真实授权记录保留为历史证据；0.1.0-local.3 在相同业务源码上增加安装依赖修复与启动检查，按独立安装、存储和 CI 流程复验，不因此宣称重新完成真实飞书业务验收。

## 从源码构建本地包

在仓库根执行，目标目录必须尚不存在；不会发布或部署：

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix snapshots/sites-adapter-0.1.0-sites.8
node standalone/build.mjs ../feishu-standalone-stage
node distribution/validate-registry.cjs ../feishu-standalone-stage
cd ../feishu-standalone-stage
npm pack --ignore-scripts
```

随后在另一个全新目录按第 1 节设置 overrides 并安装生成的 tgz。完整发行检查见源码根 RELEASE-CHECKS.md。

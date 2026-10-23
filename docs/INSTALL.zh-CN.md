# 飞书 MCP 安装教程：用自己的应用，让 AI 读取文档和处理表格

作者：[cyuanxv · @cyuanxv](https://x.com/cyuanxv) · 2026-10-22

想让 AI 读取飞书文档、整理表格，首先需要让它通过你自己的应用获得授权。feishu-mcp-server 是一个 MIT 开源项目，提供文档、表格、日程和任务等工具，并把写入操作放在本人确认之后。

这篇教程先完成一个小目标：**在自己部署的服务中，让支持 MCP 的 AI 客户端读取一份自己创建的测试文档。** 表格写入放到最后单独开启。

当前针对 `0.1.0-local.4` 预览版。它需要配置 HTTPS、应用权限和用户授权，安装 npm 包只是第一步。本文整理自当前安装文档和代码，本轮没有重新操作飞书进行验收；不同客户端与企业权限策略可能有所不同。

## 先看 32 秒示意演示

![示意演示：合成数据展示需求、预览确认和模拟回执，非真实飞书操作录屏](media/workflow-demo.gif)

[播放 / 下载 32 秒 MP4](media/workflow-demo.mp4)

**示意演示：使用合成数据和模拟界面，未连接飞书、未执行真实写入。** 它说明操作流程，不能作为功能验收证明。实际运行结果取决于自己的应用、授权和部署环境。

## 1. 开始前准备什么

| 需要准备 | 用来做什么 |
|---|---|
| Node.js 22 或以上，建议 24，以及 npm | 安装和运行服务；已有 macOS、Node.js 24 验收记录，其他平台不能视为已实机验证 |
| 自己的飞书应用及 App ID、App Secret | 调用飞书 API；开发者后台和企业管理员的审批按自己的组织要求完成 |
| 自己控制的 HTTPS 地址与可信证书 | 工作台登录、授权回调和 MCP 连接；下面用本机 localhost:8443 作示例 |
| 支持 stdio 的 MCP 客户端 | 启动本地桥接进程；“支持 MCP”不等于所有客户端都接受本文配置 |
| 一份自己新建、无隐私的测试文档 | 第一次只读指定样本，不搜索私人资料或团队文档 |

MCP 是 AI 客户端调用外部工具的协议。这里的连接是“你的客户端 → 你的服务 → 你的飞书授权”，不是访问作者的飞书。

HTTPS 证书需要覆盖实际访问的主机名，且同时被浏览器和 Node.js 信任。使用已有可信本机证书，或由你管理的 HTTPS 域名及证书；证书签发和系统信任设置需事先完成。证书私钥不要上传或粘贴进聊天。不要通过关闭 TLS 校验解决连接问题。如果暂时没有可信 HTTPS 环境，先完成这个前置条件，再继续下面步骤。

## 2. 安装发布包

下面以 macOS / Linux 风格的 shell 为例，逐段在同一个终端运行。Windows 的路径、私有文件权限和平台支持需按自己的环境调整，本教程不把它视作已验收路径。

```sh
node --version
npm --version
mkdir "$HOME/feishu-local"
cd "$HOME/feishu-local"
npm init -y
npm pkg set overrides.miniflare.undici=7.29.1 overrides.miniflare.sharp=0.35.5
npm install --ignore-scripts @cyuanxv/feishu-mcp-standalone@0.1.0-local.4
npm audit
```

使用新的安装目录；若同名目录已经存在，先检查它的用途，不要覆盖旧服务。两项 overrides 是这个版本要求的依赖修复，必须设在使用者的安装目录中，不能省略。不要自动运行 `npm audit fix --force`；如果审计出现新问题，先核对项目更新和公告。

你会得到本地命令 `./node_modules/.bin/feishu-mcp`。此时服务还没启动，也还没获得飞书数据访问权限。

## 3. 把应用配置保存在自己电脑上

```sh
umask 077
FEISHU_PRIVATE_DIR="$HOME/.config/feishu-mcp-preview"
mkdir -p "$FEISHU_PRIVATE_DIR"
chmod 700 "$FEISHU_PRIVATE_DIR"
```

用本地编辑器在这个目录新建 `app.json`，填入自己的配置。下面只有占位符，不能直接拿它启动：

```json
{
  "appId": "YOUR_FEISHU_APP_ID",
  "appSecret": "YOUR_FEISHU_APP_SECRET"
}
```

保存后收紧权限：

```sh
chmod 600 "$FEISHU_PRIVATE_DIR/app.json"
```

不要把 app.json 放进源码仓库、提交 Issue 或截图。后面生成的 config.json 同样包含敏感凭据，只保存在本人可访问的位置。它们都不需要交给作者。

## 4. 初始化配置并同步权限

下面默认使用网页回调授权，适合以后接入多个自己的应用。

```sh
./node_modules/.bin/feishu-mcp init \
  --app-config "$FEISHU_PRIVATE_DIR/app.json" \
  --config "$FEISHU_PRIVATE_DIR/config.json" \
  --data "$FEISHU_PRIVATE_DIR/data" \
  --origin https://localhost:8443
```

生成的新配置默认关闭写入。已有 config.json 时命令会拒绝覆盖；需要排查时检查原文件，不要删除旧配置来强行重建。

在飞书开发者后台，为这个应用准备文档只读 `docx:document:readonly` 和续期 `offline_access`，并完成该企业要求的发布或审批。然后同步应用已经批准的权限：

```sh
./node_modules/.bin/feishu-mcp sync-permissions \
  --config "$FEISHU_PRIVATE_DIR/config.json"
```

这个命令只查询应用已经获批、且本服务支持的范围，不会替你申请权限。默认关闭写入时，它筛选读取能力及相应基础权限。如果复用权限很多的应用，同步结果可能比本教程需要的范围多；请在本机核对 config.json 的 oauthScopes 和实际授权页，范围不符合预期就先停下，调整应用配置。

本版本同步要求应用具备 `offline_access`。若同步报错，先查后台已生效的权限和应用信息，不要把报错当成授权已经完成。

## 5. 配回调并启动 HTTPS 服务

在飞书应用后台登记与自己服务地址一致的回调：

```text
https://localhost:8443/api/feishu/callback
```

如果后台不接受本机回调，改用自己控制且可访问的 HTTPS 域名，并在初始化时使用对应 origin。origin 是协议、域名和端口，不带路径及末尾斜杠；已有授权和数据时不要随意改它。

把下一条命令中的证书与私钥路径替换成自己实际文件的绝对路径：

```sh
./node_modules/.bin/feishu-mcp serve \
  --config "$FEISHU_PRIVATE_DIR/config.json" \
  --cert /absolute/path/to/cert.pem \
  --key /absolute/path/to/key.pem \
  --port 8443
```

保持这个终端运行。服务绑定 `127.0.0.1`，首次启动会创建独立存储。使用远端域名还需自行配置反向代理及证书，具体要求见[项目安装文档](https://github.com/cyuanxv/feishu-mcp-server/blob/main/standalone/README.md)。不能因为换了域名就假设本机服务已可远程访问。

浏览器打开 `https://localhost:8443`。若出现证书安全警告，先修复证书及信任链，不继续绕过警告。

## 6. 本人登录，再连接飞书

1. 用本地编辑器打开私有 config.json，找到 `ownerLoginToken`，只在自己的工作台登录页使用。它不是 App Secret，也不是要发给作者的注册码。
2. 登录后点击“连接飞书”，核对应用、账号和实际权限范围，由你完成飞书授权。
3. 返回自己的工作台，确认连接成功；失败时先查回调地址、会话和应用权限。

安装成功、网页登录成功、飞书授权成功是三件不同的事。必须完成连接，工具才可以按你的权限读取数据。

如果应用支持设备码授权，也可在**新初始化**时加 `--auth-flow device`，按工作台设备码入口授权，避免修改应用回调；服务本身仍需可信 HTTPS。该模式目前只支持主应用。初次安装请先选定一种方式，不要在已有数据上随意切换；具体限制见项目安装文档。

## 7. 接入你的 MCP 客户端

保持服务运行。在支持下面 stdio 配置格式的客户端中，加入一个 MCP 服务。把两处路径替换为本机真实的绝对路径，JSON 中的 `~` 或 `$HOME` 不会自动展开：

```json
{
  "mcpServers": {
    "feishu": {
      "command": "/absolute/path/feishu-local/node_modules/.bin/feishu-mcp",
      "args": [
        "connect",
        "--config",
        "/absolute/path/to/private/config.json"
      ]
    }
  }
}
```

客户端运行环境需要能找到 Node.js。不同客户端的配置入口和格式不同，以对应客户端说明为准；本文不承诺任意 ChatGPT、Claude、Cursor 或 Codex 界面都支持相同安装方式。

如果本机证书由自己的 CA 签发，而且浏览器已信任、Node 仍不信任，可在客户端支持的 env 配置中设置 `NODE_EXTRA_CA_CERTS` 为自己的 **CA 根证书文件**绝对路径，再重启客户端。它不是服务私钥，不能填 key.pem；不要用 `NODE_TLS_REJECT_UNAUTHORIZED=0` 代替正确配置。

## 8. 第一次只读一份测试文档

先手动在飞书新建普通在线文档，写一行不含隐私的文字，例如“飞书 MCP 安装测试：样本 A”，保存并复制链接。向已接入工具的客户端输入：

```text
只读取我下面指定的这份测试文档，返回正文里的测试标记。
不要搜索其他文档、聊天或日程，不要执行任何写入。
文档链接：[在自己的客户端中填入刚创建的测试文档链接]
```

客户端应调用读取工具，且返回你写的标记。代码中的通用读取工具名是 `query_feishu`，普通在线文档正文操作是 `docx_text`；模型需要从自己的链接取得文档标识。知识库链接可能需要先解析节点，不要假设所有 URL 都能直接当文档 token。

判断是否跑通：客户端能看到工具、飞书连接有效、指定文档读取返回正确标记。只看到服务启动日志，或者 AI 凭文字猜出内容，都不能算成功。权限不足时，不要换成读取更大范围的私人资料来尝试。

## 9. 之后需要表格写入时，再单独开启

确认读取链路正常后，再为实际需要的表格操作申请对应权限，并完成应用发布或审批。

1. 先停止服务，在本地 config.json 把 `enableWrites` 改为 `true`。
2. 重新执行 `sync-permissions`，再按原证书、端口和配置启动服务。
3. 在工作台重新核对授权范围并完成所需授权。
4. 先用一份新建的、无协作者测试表格操作，确认写入目标、单元格范围和数据。
5. 每次写入都打开预览页，由本人网页登录确认，之后核对回执和表格结果。

可以要求 AI “先生成创建测试表格的预览，等我确认”，创建成功后，再另行预览并确认单元格写入。开启写入开关不等于批准之后的所有修改；MCP 访问令牌也不能代替网页登录确认。

本节是功能启用路径，不表示本文已经替读者完成真实表格写入验收。初次安装不必开启写入。

## 10. 遇到问题先看这里

| 现象 | 先检查 |
|---|---|
| 找不到本地命令 | 当前目录是否为安装目录；npm 安装是否成功；客户端 command 是否为实际绝对路径 |
| 启动失败 | 配置权限、依赖修复版本、端口、证书路径、数据目录权限与运行锁；不要在运行中删锁 |
| 浏览器能开，客户端连不上 | Node 的证书信任、客户端 Node 环境、config 中 origin 是否与真实服务一致 |
| 飞书回调失败 | 后台完整回调 URL、origin、端口、应用发布状态；本站登录是否过期 |
| 权限不足或文档不可读 | 应用权限是否批准、是否同步并重新授权、当前用户能否访问该指定资源 |
| 没有写入能力 | enableWrites 是否开启、写权限是否生效、服务是否重启并重新授权 |
| 预览成功但内容没变 | 是否由本人在浏览器确认；执行回执是否成功；不要把“预览已生成”当成已写入 |

反馈 Issue 时只提供版本、系统、脱敏后的错误与复现步骤，不提交 app.json、config.json、真实文档链接、密钥或下载文件。需要停止服务时在服务终端按 Ctrl+C，等待退出；备份前停止服务，将配置与整个数据目录一起加密保存。

## 版本与验收范围

这是单用户自部署预览版，不是飞书官方服务。当前记录包含独立安装和协议检查，以及历史版本专用测试文档的真实授权、读取与续期验收；这些证据不能扩大为所有业务、客户端和系统的认证。在线文档导出仍待真实权限验收。原生文件夹原名与空目录已在本人专用样本验证，本包有独立安装回归；不同群权限仍以实际授权为准。

- [项目源码与首页](https://github.com/cyuanxv/feishu-mcp-server)
- [当前安装文档](https://github.com/cyuanxv/feishu-mcp-server/blob/main/standalone/README.md)
- [发行检查与限制](https://github.com/cyuanxv/feishu-mcp-server/blob/main/RELEASE-CHECKS.md)
- [真实授权历史记录](https://github.com/cyuanxv/feishu-mcp-server/blob/main/standalone/LIVE-ACCEPTANCE.md)
- [npm 安装包](https://www.npmjs.com/package/@cyuanxv/feishu-mcp-standalone)
- [MCP Registry 登记](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cyuanxv%2Ffeishu-mcp-standalone/versions/0.1.0-local.4)

版权所有 © 2026 cyuanxv · [Twitter / X：@cyuanxv](https://x.com/cyuanxv) · 项目使用 MIT 许可证

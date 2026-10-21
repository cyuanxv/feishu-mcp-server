# 发行检查与开源边界

日期：2026-10-22。当前独立安装候选：0.1.0-local.3。仓库以开源预览版发布；未向 npm 或 MCP Registry 发布，未部署或修改现有服务。

## 本次检查

| 项目 | 结果及证据范围 |
|---|---|
| macOS / Node.js 24 类型检查、构建和启动门禁 | 通过 |
| Node 回归 | 807 项通过；另 21 项 PostgreSQL 场景由独立 Linux CI 数据库执行 |
| Worker 回归 | 306 项通过 |
| workerd / D1 / R2 | 21 项通过；使用虚构上游，真实飞书请求 0 |
| 从最终包独立安装 | 15 个场景通过，另设备码授权安全检查通过 |
| 未修复依赖的启动拒绝 | 通过；在创建数据目录或开放监听前拒绝 |
| 按指南安装后的依赖审计 | 根源码、Worker、存储运行检查和独立安装目录均未报告已知漏洞 |
| 发布文件政策 | 审核封面精确哈希通过，未知图片/私密文件/敏感模式拒绝；CI 额外核对所有 Git 跟踪文件与审核清单完全一致 |
| Registry 配置 | 官方固定 schema、包名/版本/mcpName 对应关系通过；发布保护保留 |
| Docker | macOS 本地构建通过；四个未配置入口在禁网容器中均拒绝启动 |
| 首轮 Linux CI 原生数据库 | 21 项通过；[运行记录](https://github.com/cyuanxv/feishu-mcp-server/actions/runs/39653411091) |
| 首轮 Linux CI 浏览器确认 | 文档与任务两套浏览器流程通过，包含重复点击、取消、回执、移动端布局与无真实上游写入；同上运行记录 |

最终提交的 Node.js 22/24、Linux 独立安装、依赖审计、原生 PostgreSQL、浏览器、容器及 Worker 检查会在每次推送自动重跑；当前结果请查看 [GitHub Actions](https://github.com/cyuanxv/feishu-mcp-server/actions)。不把首轮记录冒充最终提交的检查结果。

## 依赖修复

- Node 测试工具 Vite 锁定到已修复版本。
- 迁移开发工具的间接 esbuild 依赖使用经复验的覆盖版本，工具版本命令和 Worker 测试通过。
- 稳定版 Miniflare 仍固定旧版 undici / sharp，因此独立安装必须按照指南在使用者项目根设置覆盖版本。包内 overrides 不会替使用者生效；运行入口核对实际解析的依赖，旧版本无法启动。
- 修复使用 undici 7.29.1、sharp 0.35.5，保持稳定版 Miniflare，不切换到测试发行版。没有运行 npm audit fix --force。
- 审计结论以本次公告数据库为准；默认未设置覆盖版本的原始依赖树仍会报告问题，并由启动门禁拒绝。

参考：[npm 根项目 overrides](https://docs.npmjs.com/cli/configuring-npm/package-json/#overrides)、[undici 公告](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3)、[sharp 公告](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)。

## 真实飞书验收与隐私

0.1.0-local.2 已在独立私有环境完成真实授权、专用测试文档读取和续期，共 12 项检查。该环境不作为公共入口，实际地址、密钥、授权、数据库和文档标识均未进入此仓库。详见 [真实验收记录](standalone/LIVE-ACCEPTANCE.md)。

0.1.0-local.3 增加依赖修复与启动门禁；本轮没有重新读取私人或团队资料，也不把模拟上游检查称为新的真实业务验收。

## 尚未认证的能力

在线文档/表格导出、真实多层群聊文件夹、新租户全部业务写入、Lark 国际版、Windows 实机、多用户和高负载部署仍有独立验收边界。适合按说明自托管试用的预览版，不宣称所有平台和业务场景已全面认证。

本轮仅公开仓库与 GitHub 预览版说明；发布 npm、提交 Registry 和任何公开服务部署仍需所有者另行批准。

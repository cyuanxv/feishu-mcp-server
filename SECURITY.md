# Security

This project is currently a synthetic development preview, not a production Feishu service.

Read [the security model](docs/security.md) before running or reviewing it. Do not expose the demo OAuth server publicly. Do not place credentials in chat, repository files, fixtures, test output or public issues.

A private vulnerability reporting destination must be configured before a production release. No support address or disclosure SLA is promised by this preview.

## 独立安装的依赖安全

0.1.0-local.3 在启动前校验 Miniflare 实际使用的 undici 和 sharp 版本。请严格按 standalone/README.md 在安装项目根设置 overrides，再安装本地包；npm 只在根 package.json 读取 overrides，依赖包内的同名字段不能替代这一步。

当前审核版本为 undici 7.29.1、sharp 0.35.5。未安装修复版本时拒绝启动。安装后运行 npm audit；新增公告可能改变审计结论。此措施不替代授权边界、HTTPS、私有配置目录和升级备份。

参考：[npm overrides](https://docs.npmjs.com/cli/configuring-npm/package-json/#overrides)、[undici 公告](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3)、[sharp 公告](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)。

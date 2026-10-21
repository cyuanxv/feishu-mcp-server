# 飞书云端适配器

独立的候选开源源码。目录名称保留以兼容测试与 CI；实际版本见 package.json。

执行 `npm ci --ignore-scripts`、`npm run typecheck`、`npm test`、`npm run check:source` 和 `npm run check:package`。运行 workerd 验证前执行 `npm ci --ignore-scripts --prefix runtime-check`，再执行 `npm run check:workerd`。

配置及身份边界见 [配置说明](docs/SETUP.md)。本包未绑定任何现有站点，不附带原服务的验收记录或授权。

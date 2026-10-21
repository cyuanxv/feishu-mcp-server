# 独立部署配置

先在本地完成合成数据测试，再在自己控制的独立测试环境部署。不要连接他人的应用、数据库、对象存储或站点。

## 需要准备

| 配置 | 用途 |
|---|---|
| APP_ORIGIN | 自己站点的 HTTPS origin，不带路径 |
| APP_ENCRYPTION_KEY | 独立生成的 32 字节随机密钥，以 base64url 编码，通过宿主秘密存储注入 |
| FEISHU_APP_ID / FEISHU_APP_SECRET | 自己注册应用的 ID 与秘密，通过秘密存储配置 |
| DB | 兼容 D1 的数据库绑定；迁移文件在 drizzle/ |
| BUCKET | 云端附件功能所需的对象存储绑定 |
| FEISHU_READ_ENABLED | 完成配置和授权后才设为 true |
| FEISHU_WRITE_ENABLED | 独立确认需要写入时再启用，仍须逐次预览确认 |
| FEISHU_DOCX_ENABLED | DOCX 候选能力开关，按源码及测试核对使用 |

`.openai/hosting.json` 只保留通用资源声明，不含任何项目 ID。它是宿主格式，不是通用 Cloudflare Wrangler 部署配置。宿主必须验证用户身份并阻止外部伪造身份头；部署前审阅 src/security.ts 和 src/worker.ts 的信任边界。

飞书 OAuth 回调在自己的应用后台配置为 `https://your-service.example/api/feishu/callback`，替换为自己的真实 HTTPS 域名。按实际功能申请最小必要权限；完成用户授权后才能读取数据。在线文件导出需要对应导出权限，不能把普通附件下载通过当作在线导出验收通过。

不要将密钥、OAuth token、个人文件或生产配置写入源码、日志和提交。根目录 `.env.example` 仅用于合成演示，程序不会自动加载它。不得把演示认证方式用于公网。

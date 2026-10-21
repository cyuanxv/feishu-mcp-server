# 独立安装版真实授权验收

日期：2026-10-22；版本：0.1.0-local.2。源码与发行包仍未公开，未向 npm 或 MCP Registry 发布。

## 结果

已复用用户既有应用，在新建的仅本人可访问测试环境中完成真实飞书用户授权、指定测试文档读取、令牌续期、续期后再次读取以及官方 MCP SDK 连接验收。没有新建飞书应用，没有改变既有应用的权限、回调白名单或正在进行的审核。

## 真实验收范围

- 授权只包含 `docx:document:readonly` 与 `offline_access`。从新环境数据库核对，两项完全一致，凭据为加密密文，续期后连接保持 active。
- 验收只读取新创建的一份测试文档；正文是固定测试标记与虚构项目，不包含私人或团队资料。OAuth 过程读取必要的本人账户标识以绑定授权。
- 测试站有独立数据库、对象存储、加密密钥、网页登录凭据及 MCP 访问凭据。平台访问名单只有所有者，外部访问者为 0。
- 除主服务认证外，私有验收层还同时限制工具调用和上游 HTTP 请求：只允许设备授权/续期、本人 OAuth 账户识别以及指定文档的 metadata/text/blocks。拒绝其他文档、搜索、消息、日程及业务写入。
- 官方 MCP SDK 能通过 HTTPS 连接并读取真实测试标记。托管平台保留 `/mcp` 路由，因此此私有验收环境经 `/test/mcp` 转发到安装包的同一个 MCP 处理器；标准 `/mcp` 和 stdio 桥接已在本地独立安装检查中通过。
- 原工作台在新环境授权后、续期后均仍可读取同一测试文档；没有查询原有私人文档。原私有源码工作区无改动，原服务未部署或重新配置。

## 12 项真实检查

1. anonymous_private_host_access_denied：通过。
2. service_credential_without_owner_token_denied：通过。
3. real_mcp_initialization：通过。
4. only_resource_limited_query_tool_exposed：通过。
5. real_test_document_read：通过。
6. non_fixture_document_denied_before_provider：通过。
7. business_write_denied_before_provider：通过。
8. messages_and_search_denied_before_provider：通过。
9. new_environment_grant_active：通过。
10. real_device_token_refresh：通过。
11. real_document_read_after_refresh：通过。
12. official_sdk_connects_and_reads_real_fixture：通过。

## 本轮修正

新增飞书官方设备码授权方式，适用于已有应用回调被审核锁定的情况。授权和续期都显式限定 scope，并拒绝返回范围扩大、无效令牌类型或过期状态。设备码保存在短期加密表单状态中，绑定本人浏览器会话及授权断开版本；CSRF、一次性提交、授权重放、超范围权限和断开连接竞态均有本地负面验收。

默认 PKCE 模式保留多应用连接；设备码模式当前只支持主应用。自托管用户需提供自己的应用、授权、存储与 HTTPS。此私有验收站点不是公开服务入口，地址、凭据、用户标识、文档真实 ID 和数据库均不进入开源包。

## 证据与限制

- 最终安装包从空目录安装；既有 15 项安装/集成验收、设备码安全验收、类型检查、构建及发布配置校验通过。
- 本轮没有重新运行未改动的旧 Node 807 项、Worker 306 项和 workerd 21 项；其最近通过记录见历史验收，不计为本轮真实飞书检查。
- 只验证一份测试文档及授权链路，不代表所有业务操作均完成真实数据验收。在线导出与真实多层群聊文件夹等既有限制仍保留。
- 未进行 Windows/Linux 实机与多人、多实例生产验收。私有测试托管适配层和安装包 Node/workerd 自托管入口是两个验证层，不混称完全相同的部署环境。

官方参考：
https://github.com/larksuite/cli/blob/main/internal/auth/device_flow.go

此记录已脱敏，仅保留验收结论和通用实现边界。实际测试环境定位及原始证据保存在忽略的本地私有验收目录，不进入本地开源源码包。

## 版权标注更新

版权归属 cyuanxv，紧邻提供 Twitter / X：https://x.com/cyuanxv。仅更新 LICENSE、说明文档与作者元数据；重新打包后逐文件比较，运行代码字节未改变，沿用上述功能验收结果，本次未重新访问飞书数据或部署服务。

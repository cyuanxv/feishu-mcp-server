## 发布入口同步 - 2026-10-22

- `0.1.0-local.3` 完整服务预览版已在 [npm](https://www.npmjs.com/package/@cyuanxv/feishu-mcp-standalone) 发布，完成 [MCP Registry 登记](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cyuanxv%2Ffeishu-mcp-standalone/versions/0.1.0-local.3)。
- 中文/英文首页和安装指南已补充公开安装命令、依赖修复与自托管边界；公开下载、全新安装及 15 项回验通过，具体范围见 [发行检查](RELEASE-CHECKS.md)。
- 无业务代码或私有服务变更；下方保留首次 GitHub 预览版发布时的历史说明。

## 0.1.0-local.3 - 2026-10-22

### 首个开源预览版 · 2026-10-22

Feishu MCP Server 将文档、表格、多维表格、日程、任务、会议室及附件工作流接入支持相应协议的 AI 客户端。采用 MIT 许可证，版权归属 **cyuanxv**；[Twitter / X：@cyuanxv](https://x.com/cyuanxv)。

这是需要自行部署的预览版。每位使用者提供自己的飞书应用、授权、HTTPS 地址和存储；仓库不提供作者的数据、密钥、用户授权或私人生产服务入口。

### 本版包含

- 完整服务的单用户独立安装入口，支持飞书授权、加密保存连接及令牌续期。
- 查询、来源回溯、多应用权限路由，以及业务写入的预览、明确确认和执行回执。
- 电子表格创建、工作表与单元格操作，字体颜色、合并拆分和列宽；附件下载与文件夹遍历代码。
- 安装依赖修复和启动检查；未按说明安装安全依赖时拒绝启动。

### 已完成的检查

- Node.js 22/24、Worker、workerd/D1/R2、Linux 独立安装、浏览器确认流程、原生 PostgreSQL、容器及依赖审计均有自动检查记录，见 [GitHub Actions](https://github.com/cyuanxv/feishu-mcp-server/actions)。
- macOS 本地回归含 807 项 Node 测试、306 项 Worker 测试、21 项运行与存储检查；21 项原生数据库场景在独立 Linux CI 中通过，不把重复执行相加成不同功能。
- 上一安装版本 0.1.0-local.2 已完成真实飞书授权、专用测试文档读取及续期等 12 项检查。0.1.0-local.3 增加依赖修复与启动检查；此项历史证据不等于本版所有业务操作均在真实租户验收。

### 尚未完成的验收范围

1. **在线文档和在线表格导出**：代码已包含，DOCX/PDF、XLSX/CSV 等流程仍需实际导出权限和真实样本的端到端验收。
2. **群聊中直接发送的整个文件夹**：真实原生文件夹、多层嵌套及全部内容下载仍缺少完整真实样本验收，不能视为已全面打通。
3. **新租户的全部业务操作**：并未逐项真实验收所有消息、文档、表格、任务、日程及会议室写入；仍受应用审批、用户授权和资源权限限制。
4. **平台和部署范围**：Lark 国际版、Windows 实机、多用户、多实例及高负载公网部署尚未完成兼容性或生产认证。
5. **AI 客户端兼容性**：已验证协议链路；不承诺任意 ChatGPT、Claude、Cursor 或其他客户端都能一键接入，须具备相应 MCP 传输和认证能力。

### 安装与发布范围

从源码构建独立包，按 [安装指南](https://github.com/cyuanxv/feishu-mcp-server/blob/main/standalone/README.md) 使用自己的应用和授权。必须先在自己的安装项目根设置指南中的 npm overrides，再安装生成的 tgz；包内部的 overrides 不会自动替使用者生效。

**首次 GitHub 预览版发布时仅公开源码与 Pre-release 说明；npm 与 Registry 已在后续步骤完成，见本页顶部。未开放或更改作者的现有私有服务。** GitHub 自动生成的 Source code 下载对应此标签；本次不额外上传二进制或私有验收附件。

完整边界见 [发行检查](https://github.com/cyuanxv/feishu-mcp-server/blob/main/RELEASE-CHECKS.md) 与 [真实授权记录](https://github.com/cyuanxv/feishu-mcp-server/blob/main/standalone/LIVE-ACCEPTANCE.md)。


# Changelog

## 0.1.0-dev.15

- Add default-off unfinished/unassigned task creation with full title/description preview and optional explicit timed or UTC all-day deadline.
- Use the official Task v2 SDK operation with user-token authorization, a stable server client_token and no recipient/list/reminder properties.
- Add a separate durable task ledger and task-specific confirmation handoff/session, reusing the reviewed browser safety behavior without allowing document/task proof or grant confusion.
- Preserve at-most-once execution beyond provider's five-minute dedupe window; surface known partial tasks and ambiguous results without corrective writes or automatic re-creation.
- Add provider, workflow, HTTP, shared-client, native PostgreSQL and sandboxed browser regressions while retaining document behavior.
- Keep actual task grants, host delivery, real provider validation and live deployment closed/unverified.

## 0.1.0-dev.14

- Add a separate default-off document confirmation UI with full title/Markdown/folder preview, verified account display, expiry and explicit confirm/cancel actions.
- Require an independent one-use Ed25519 host browser handoff in addition to existing MCP authorization; keep the host signer outside the review service.
- Add short-lived server-side cookie/CSRF sessions bound to account, site, intent and content, with current grant/generation checks before every action.
- Reuse durable at-most-once create/receipt semantics, serialize cross-window cancellation, and handle lost responses, repeated clicks, navigation, BFCache and expiry without automatic re-creation.
- Package UI assets into the build and test default-disabled compiled/container startup, HTTP/client behavior, native PostgreSQL race fences and sandboxed synthetic browser CI.
- Keep actual host delivery, docs.write issuance, live provider acceptance and production deployment explicitly unimplemented/unverified activation gates.

## 0.1.0-dev.13

- Add an unmounted, default-off create_doc workflow with typed text-only Markdown preview, trusted-host confirmation, durable idempotency and receipts.
- Verify separate docs.write and actual provider permission without expanding existing OAuth grants.
- Use fixed official-CLI-backed create/status endpoints through the official SDK; never automatically repeat a create POST.
- Persist hashes and bounded receipts, preserve uncertainty across restarts/storage failures, and prevent late polling responses from regressing success.
- Add synthetic provider/workflow regressions and six native PostgreSQL concurrency cases.
- Fix review findings: contradictory async success/failure is uncertain, warning evidence survives poll races, and authorization is rechecked after credential loading.
- Keep all existing live entrypoints and thirteen public writes disabled; actual provider/confirmation UI acceptance remains unverified.

## 0.1.0-dev.12

- Integrate the previously reviewed default-disabled agenda HTTP/OAuth candidates with the message-search filter branch while preserving both histories.
- Support sender, chat and whole-second time filters for explicit message-only unified searches; bind every filter to continuation.
- Reject malformed and oversized message pages, duplicate or invalid IDs and fractional-second bounds, including sub-millisecond fractions.
- Add 47 message-search contract tests and 12 retry-authorization regressions; retain native PostgreSQL/container CI.
- Revalidate current grant/request state and provider-token expiry before every retry; never reuse a cached authorization decision across backoff.
- Keep provider/issuer runtime gates disabled by default, all thirteen writes closed and real account/ChatGPT acceptance explicitly unverified.

## 0.1.0-dev.11

- Added a separate, default-disabled Feishu browser login and single-agenda OAuth issuer candidate using official v3 token and user_info contracts
- Added explicit same-origin consent, secure browser/state/CSRF binding, stable provider account mapping and encrypted short-lived pending credentials
- Added transactional authorization codes and hashed MCP access/refresh tokens, exact client/redirect/resource/S256 binding, rotation and committed family revocation on replay
- Reused official MCP SDK token/revocation handlers; pre-registered public clients only, with no DCR/CIMD or arbitrary callback fetching
- Added a full synthetic HTTP authorization-to-agenda test that does not seed connections/grants/tokens directly
- Added five native PostgreSQL concurrency cases for an isolated CI-only synthetic service; these are skipped locally and must pass CI before being claimed
- Real Feishu authorization, hosted PostgreSQL/TLS/roles, browser/ChatGPT acceptance and automatic Feishu refresh remain unverified or incomplete

## 0.1.0-dev.10

- Added a single-tool HTTP resource-server candidate for get_agenda with persisted opaque Bearer verification, audience/expiry/revocation and account-generation checks
- Stored actual provider scope grants separately and revalidated them plus encrypted user credentials before every provider read
- Used the official recurring-event instance_view contract, bounded local paging and content-version checks for the candidate agenda
- Added migration 003, default-disabled provider entrypoint, verified-TLS configuration, Docker recipe and production import/refusal smoke check
- 414 offline tests pass; real human login/consent/issuer, Feishu grants, native PostgreSQL, HTTPS hosting and ChatGPT installation remain unverified
- No real credentials, external authorization, deployment, PR merge or fee commitment was performed

## 0.1.0-dev.9

- Added an inert finite router for all seventeen provider reads, reusing shared input schemas, scope policy, rate limits, audit and envelope validation
- Kept synthetic and provider provenance/ref types separate; provider output always carries live_verified=false
- Added exact resource/session/expiry/context checks without claiming to authenticate bearer tokens or verify actual provider grants
- Added Base signed-reference/table-page input and matching safe mock behavior, plus capacity-only room metadata paging
- Rejected all thirteen writes, raw SDK operation names, unsupported filters, invalid budgets and model-supplied identity fields
- Added a real-SDK injected-transport route test covering every read; expanded to 369 offline tests
- No server import, production HTTP authentication, real credentials, deployment or live-mode change

## 0.1.0-dev.8

- Connected explicit Base search results to signed metadata-only fetch and table-page continuation
- Added explicit cross-calendar agenda traversal with window/scope-bound cursors, limited per-call work and persisted unavailable-calendar coverage
- Preserved all-day dates and calendar/provider order instead of claiming global chronological sorting
- Rejected thread cycles, missing/oversized pages, duplicate messages and unidentified root chats
- Corrected Base title-search identity evidence: the project forces user tokens; the complete provider identity matrix is unverified
- Expanded to 330 offline tests; no endpoint, background framework or live runtime was added

## 0.1.0-dev.7

- Added bounded Base title candidates, explicit Base/table selection, Wiki-to-Base resolution and the schema-to-record read path
- Restricted Base search to BITABLE at request and response boundaries without requiring unrelated logical document permission
- Kept Wiki node tokens separate from Base app tokens and rechecked resolved targets across table-page continuation
- Rejected unknown/duplicate/oversized field and record pages, malformed field IDs/types and inherited object properties
- Expanded to 303 offline tests; public tool count and live-mode gate remain unchanged

## 0.1.0-dev.6

- Added tasklist discovery and tasklist-bound task pages, preserving empty pages with provider continuation
- Added explicit-assignee search-to-detail reads, bounded to twenty detail checks and one at a time
- Rechecked task IDs, assignee roles and completion filters; inaccessible or unverified hits remain partial without exposing mismatched task content
- Bound task cursors to filters, identity, scopes and page size, with cycle/budget checks
- Preserved all-day due values and unknown completion/membership instead of guessing
- Expanded to 272 offline tests; no live identity, external write or public runtime is enabled

## 0.1.0-dev.5

- Completed explicit nested comment-reply paging through document-bound signed cursors, root labeling and cycle/budget checks
- Added file search-to-metadata-fetch with scoped signed references; no binary download or fabricated file text
- Preserved batch metadata failures and unknown responses, rejected unrequested/duplicate/mismatched resources and limited output projection
- Rejected mismatched DOCX metadata IDs and malformed comment/reply pages
- Expanded to 244 offline tests; live MCP routing and production configuration remain closed

## 0.1.0-dev.4

- Added fixed-endpoint, user-only name/email search from the official CLI contract, with ambiguous-candidate and query-refinement semantics
- Added capacity-aware room discovery plus individual-room busy checks; missing/failed information remains unknown
- Added cycle detection to room/calendar/Base provider continuation and enforced verified Drive search bounds
- Added traceable minimum-provider-permission evidence, explicitly separate from actual user grants
- Hardened source exports against editor/patch backups
- Required strictly numeric room capacities and offset-aware busy intervals; rejected missing/oversized room pages before availability fan-out
- Expanded to 214 passing tests including independent-review boundary regressions
- No live credentials, external writes, real invitations, public deployment or live MCP exposure

## 0.1.0-dev.3

- Added scoped, explicitly paginated unified DOCX/Wiki/message search with signed fetch references
- Added Wiki-node-to-DOCX resolution and content-version-bound fetch continuation
- Added authoritative message-to-thread resolution with validated reply identities and pagination
- Added comment reply completeness flags and safe meeting-slot suggestions from complete busy data
- Enforced explicit chat/sender constraints on returned message search results
- Rejected repeated/cyclic provider pagination and limited per-query continuation budgets
- Kept missing comment reply arrays partial and rejected unavailable message bodies
- Kept Base/file aggregate search, name resolver and live MCP/production authorization outside the completed surface
- All provider behavior remains tested offline; no live connection or public listener is enabled

## 0.1.0-dev.2

- Added 20 finite official Feishu SDK read bindings; no generic API tool
- Added targeted profile, document/message search, task, Base and calendar mappings using actual SDK contracts
- Added safe SDK client configuration with silent credential-sensitive logs, timeouts and redirect limits
- Added Feishu token exchange/refresh core, encrypted subject-bound one-time PKCE state and PostgreSQL account-link transactions
- Added embedded PostgreSQL migration/repository integration tests using PGlite
- Prevented late token writes from restoring revoked connections
- Expanded to 150 passing automated tests, including independent-review regressions
- Fixed disconnect/relink stale-refresh ABA with grant generation and token-revision CAS
- Treat missing/malformed busy intervals as unknown, reject unexpected search resource types and sanitize pool-acquisition failures
- Reject standalone dot-segment provider resource IDs
- Live mode remains closed; provider transport and OAuth calls are verified with injected synthetic responses only

## 0.1.0-dev.1

- Added a cloud-development, loopback-only synthetic MCP server
- Added 17 read tools and a complete 30-tool traceability catalog
- Added mock OAuth security checks, signed references, scope gates and encrypted token-storage interfaces
- Added PostgreSQL schema draft and parameterized storage adapter
- Added synthetic contract, OAuth, isolation, HTTP/MCP and adversarial tests
- No live Feishu connection, public deployment, directory submission or write actions

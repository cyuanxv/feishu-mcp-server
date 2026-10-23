# Feishu MCP — Documents, Sheets, Calendar & Tasks for AI Workflows

Copyright © 2026 cyuanxv · [Twitter / X: @cyuanxv](https://x.com/cyuanxv) · MIT License

**Published preview: `0.1.0-local.4`** · [npm package](https://www.npmjs.com/package/@cyuanxv/feishu-mcp-standalone) · [Official MCP Registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cyuanxv%2Ffeishu-mcp-standalone/versions/0.1.0-local.4)

**Self-hosted live-service package:** see [installation and your own Feishu OAuth](standalone/README.md). Root `server.json` describes this package; the synthetic preview draft is under `distribution/server.preview.json`.

**First-time setup?** Follow the [step-by-step Chinese installation tutorial](docs/INSTALL.zh-CN.md) for app setup, HTTPS, authorization and a first read.

![Feishu MCP — Connect AI to Feishu workflows](docs/media/social-preview.jpg)

**Give your AI a workspace worth working in.**

A TypeScript MCP server project that brings Feishu document search, spreadsheets, Bitable, calendars, tasks, meeting-room booking, and cloud attachment workflows into AI-assisted work. Reads retain sources. Writes require review and confirmation. Execution returns receipts.

[中文](README.md) · [Setup](snapshots/sites-adapter-0.1.0-sites.8/docs/SETUP.md) · [Validation](VALIDATION.md) · [Follow @cyuanxv on X](https://x.com/cyuanxv)

[Preview release notes and acceptance limits](https://github.com/cyuanxv/feishu-mcp-server/releases/tag/v0.1.0-local.4)

**MIT licensed · self-hosted preview · bring your own app and authorization**

This is an open-source preview, not a hosted service or a plug-and-play marketplace listing. Bring your own application, permissions, deployment, and compatible MCP/OAuth host.

## A 32-second workflow illustration

**Synthetic data, not a product recording.** Request → review the target and content → explicit confirmation → simulated receipt and readback. This Chinese-language animation does not connect to Feishu or perform real writes; it is not acceptance evidence.

![Synthetic spreadsheet write workflow; not a product recording](docs/media/workflow-demo.gif)

[Watch / download MP4](docs/media/workflow-demo.mp4) · [Install with your own app](standalone/README.md) · [Verified scope and remaining limits](RELEASE-CHECKS.md)

## What you can build

- Find authorized messages, documents and knowledge-base content with traceable sources.
- Create spreadsheets, add worksheets, write cells, and adjust font colors, merged cells and column widths.
- Read Bitable schemas and records, and prepare reviewed writes.
- Query calendars and availability; prepare meeting-room bookings for confirmation.
- Read, create, update and complete tasks through reviewed workflows.
- Download authorized attachments and traverse folders in the cloud, with per-file outcomes and ZIP output.

Multi-application routing selects connections by actual permissions. Confirmation and receipts make writes inspectable, and uncertain outcomes are not blindly replayed.

## Architecture

```mermaid
flowchart LR
    A[AI client / MCP] --> B[Permission-aware connection routing]
    B --> C[Source-backed reads]
    B --> D[Write preview]
    D --> E[User confirmation]
    E --> F[Execution receipt]
```

## Get started

Install the full self-hosted service with Node.js 22+ (24 recommended). The dependency overrides must be set in your own installation project before installing:

```sh
mkdir feishu-local && cd feishu-local
npm init -y
npm pkg set overrides.miniflare.undici=7.29.1 overrides.miniflare.sharp=0.35.5
npm install --ignore-scripts @cyuanxv/feishu-mcp-standalone@0.1.0-local.4
```

Continue with the [installation and authorization guide](standalone/README.md): configure your own Feishu app, trusted HTTPS origin and authorization before connecting an MCP client. The Registry entry describes this same package, not a public hosted endpoint. Initialization cannot be skipped. Source builds retain publication guards, and CI does not publish or deploy automatically.

### Source checks

Use Node.js 24 LTS. From the repository root:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm run smoke:production
npm run check:source
```

The root runtime is an early Node/PostgreSQL implementation with a loopback-only synthetic demo. For the current cloud adapter, see `snapshots/sites-adapter-0.1.0-sites.8/` and its [setup guide](snapshots/sites-adapter-0.1.0-sites.8/docs/SETUP.md). It requires trusted host identity and DB/BUCKET bindings; it is not a generic Worker deployment with authentication already solved.

## Evidence and limits

Local regression, installation tests and real authorization are recorded separately. Real authorization, refresh and reading one dedicated test document passed in an isolated private environment; this does not validate every business operation. Online exports still require real permission acceptance. Native folder names and empty directories passed dedicated owner-only samples; this package adds synthetic-upstream installation regression, not certification for every chat permission scenario. Lark international compatibility has not been verified. See [validation details](VALIDATION.md).

This project is independent of Feishu/Lark and OpenAI. It includes no original deployment credentials, private service binding or old Git history.

## Follow the build

Follow [@cyuanxv on Twitter / X](https://x.com/cyuanxv) for development notes and workflow demos. Useful issues, contributions and stars are welcome.

## Local distribution preview / 本地发行预览

See [distribution/README.md](distribution/README.md) for the synthetic-only stdio package and Registry publication boundaries. This is not a live Feishu connector.

## Self-hosted service

Start with the [installation guide](standalone/README.md). Use your own Feishu app, HTTPS origin, authorization and storage. No author credentials, private data or production endpoint are included. See [real authorization acceptance](standalone/LIVE-ACCEPTANCE.md) for the exact tested scope. The synthetic demo remains optional and is not the live-service entrypoint.

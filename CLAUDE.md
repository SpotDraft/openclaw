# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is OpenClaw

Multi-channel AI gateway with extensible messaging integrations. TypeScript (ESM), pnpm monorepo. Connects to WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Matrix, MS Teams, and many more via a plugin/extension system.

## Essential Commands

```bash
pnpm install                # Install dependencies (Node ≥22.12.0, pnpm 10.x)
pnpm build                  # Full build (tsdown → dist/)
pnpm check                  # Format check + tsgo + oxlint (run before commits)
pnpm test                   # Run all tests (parallel vitest)
pnpm test:fast              # Unit tests only (excludes gateway/extensions)
pnpm test:e2e               # E2E tests
pnpm test:coverage          # Unit tests with V8 coverage
pnpm test:watch             # Watch mode
pnpm lint                   # oxlint --type-aware
pnpm lint:fix               # oxlint fix + format
pnpm format                 # oxfmt --write
pnpm format:check           # oxfmt --check
pnpm tsgo                   # TypeScript type checking
```

### Running a Single Test

```bash
vitest run --config vitest.unit.config.ts src/path/to/file.test.ts
```

### Dev Mode

```bash
pnpm openclaw ...           # Run CLI in dev (via tsx)
pnpm dev                    # Start dev server
pnpm gateway:dev            # Gateway dev mode (skips channels)
pnpm ui:dev                 # Control UI dev (Vite)
pnpm tui:dev                # Terminal UI dev
```

### Commits

Use `scripts/committer "<msg>" <file...>` instead of manual `git add`/`git commit` to keep staging scoped. Follow concise action-oriented messages (e.g., `CLI: add verbose flag to send`).

## Architecture

### Monorepo Layout

- **`src/`** — Core TypeScript source (CLI, gateway, agents, channels, memory, media, plugins, providers, web)
- **`extensions/`** — Channel plugins as workspace packages (~38: discord, telegram, matrix, msteams, voice-call, etc.)
- **`packages/`** — Sub-packages (clawdbot, moltbot)
- **`ui/`** — Control UI (Vite + Lit with legacy decorators)
- **`apps/`** — Native apps (macOS/Swift, iOS/Swift, Android/Kotlin)
- **`docs/`** — Mintlify-hosted documentation (docs.openclaw.ai)
- **`dist/`** — Built output

### Key Source Directories (`src/`)

| Directory    | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| `agents/`    | Multi-agent routing, Pi agent integration, tools          |
| `channels/`  | Channel routing, group rules, allowlists                  |
| `commands/`  | CLI commands (gateway, agent, send, wizard, doctor, etc.) |
| `cli/`       | CLI wiring and command setup                              |
| `config/`    | Configuration loading, validation, state migrations       |
| `gateway/`   | WebSocket control plane, server, protocol                 |
| `memory/`    | Vector DB (SQLite-vec), RAG, memory core                  |
| `media/`     | Image/audio/video pipeline, transcription                 |
| `plugins/`   | Plugin runtime, registry, manifest discovery              |
| `providers/` | Model providers (Claude, GPT, Gemini, etc.)               |
| `routing/`   | Message routing logic                                     |
| `security/`  | Security checks, DM policies                              |
| `tui/`       | Terminal UI                                               |
| `web/`       | WebChat UI, websocket bridge                              |

### Extension System

Extensions live in `extensions/` as separate workspace packages. Plugin-only deps go in the extension's own `package.json`, not root. Runtime deps must be in `dependencies` (npm install runs `--omit=dev` in plugin dir). Avoid `workspace:*` in `dependencies`; put `openclaw` in `devDependencies` or `peerDependencies` instead.

### Entry Points

- CLI: `openclaw.mjs` → `dist/entry.js`
- Dev: `node scripts/run-node.mjs` (tsx)
- Gateway: WebSocket control plane started via `openclaw gateway run`
- Plugin SDK: exported via `openclaw/plugin-sdk`

## Coding Standards

- **TypeScript ESM only**, strict mode. Avoid `any` types.
- **Formatting/linting:** oxfmt + oxlint (not ESLint/Prettier). Run `pnpm check` before commits.
- **File size:** aim for ~500-700 LOC; split/refactor when it improves clarity.
- **Dependency injection:** use `createDefaultDeps` pattern.
- **Naming:** **OpenClaw** for product/docs headings; `openclaw` for CLI/package/config keys.
- **Comments:** brief comments for tricky/non-obvious logic only.
- **Tool schemas (google-antigravity):** no `Type.Union` in tool input schemas; no `anyOf`/`oneOf`/`allOf`. Use `stringEnum`/`optionalStringEnum` for string lists, `Type.Optional(...)` instead of `... | null`.
- **CLI progress:** use `src/cli/progress.ts`; don't hand-roll spinners.
- **Patched deps:** any dep with `pnpm.patchedDependencies` must use an exact version (no `^`/`~`). Patching deps requires explicit approval.
- **Never update the Carbon dependency.**
- **Control UI:** uses Lit with legacy decorators (`@state()`, `@property()`). Do not switch to standard decorators.

## Testing

- Framework: Vitest with V8 coverage (70% lines/branches/functions/statements thresholds).
- Tests colocated as `*.test.ts`; e2e as `*.e2e.test.ts`.
- Test setup: `test/setup.ts` (isolated home dirs, plugin registry mocking, channel stubs).
- Live tests (real API keys): `OPENCLAW_LIVE_TEST=1 pnpm test:live`
- Do not set test workers above 16.

## Pre-commit & CI

- Pre-commit hooks: `prek install` (trailing-whitespace, yaml, large-file detection, secret detection, shellcheck, oxlint, oxfmt, swiftlint).
- CI runs: format check → tsgo → oxlint → unit tests → e2e → Docker integration tests.
- Before pushing: `pnpm build && pnpm check && pnpm test`

## Multi-Agent Safety

When working alongside other agents:

- Do not create/apply/drop `git stash` entries unless explicitly requested.
- Do not switch branches or modify git worktrees unless explicitly requested.
- Scope commits to your changes only; avoid cross-cutting state changes.
- When you see unrecognized files, keep going; focus on your changes.

## Docs

- Hosted on Mintlify (docs.openclaw.ai). Internal links: root-relative, no `.md`/`.mdx` suffix.
- `docs/zh-CN/**` is generated; do not edit manually.
- Avoid em dashes and apostrophes in doc headings (breaks Mintlify anchors).

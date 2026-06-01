# AGENTS.md

## Cursor Cloud specific instructions

### Product

**AdventureForge** (`zork-unlimited-2`) is a single-package Node.js/TypeScript text-adventure engine: deterministic `step(state, action)`, YAML content packs (CYOA and parser modes), CLI tools, MCP stdio server, and optional mock/real LLM playtesting. There is no database, Docker Compose stack, or HTTP API server in this repo.

### Prerequisites

- **Node.js 22+** (matches README / CI expectations)
- **pnpm** (lockfile: `pnpm-lock.yaml`)

Dependency refresh on each cloud VM session is handled by the update script (`pnpm install`).

### Common commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Test | `pnpm test` |
| Typecheck build | `pnpm build` |
| Validate pack | `./bin/validate <pack.yaml>` |
| Interactive play | `./bin/play <pack.yaml>` |
| Mock AI playtest | `./bin/playtest <pack.yaml> <seed> --persona mainline` |
| MCP server (stdio) | `pnpm mcp` |

There is **no** dedicated ESLint/lint script in `package.json`; `pnpm build` + `pnpm test` are the primary quality gates.

### Services

Nothing must run as a long-lived daemon for core development. Optional:

- **MCP**: `pnpm mcp` — JSON-RPC over stdin/stdout (not a TCP port).
- **Real LLM playtests**: set `GEMINI_API_KEY` and/or `OPENAI_API_KEY` (mock playtest works without keys via `FallbackLlmClient`).
- **Browser demo**: open `index.html` locally (no documented dev server script).

### Gotchas

- **`./bin/replay`** only validates/replays **CYOA** packs (`validateCYOAPack`). Parser traces fail schema validation if passed a parser YAML path. Committed traces under `traces/` may show **hash mismatch** against current engine state even when `pnpm test` passes (in-test replay uses live-generated traces).
- **`mcp_playtest.ts`** expects adventure IDs like `chapel_pack_v1` to resolve to pack files on disk; if packs are missing from the MCP server's lookup path, sessions fail at `start_new_game` even though the MCP handshake succeeds.
- **Interactive CLI**: use numeric choices for CYOA; parser mode uses text commands (`look`, `go north`, `inventory`, `exit`). Game-over menus accept `3` to exit, not arbitrary strings.
- **`bin/*` wrappers** invoke `npx tsx`; first run may print npm notices — harmless.

### Hello-world verification

After `pnpm install`:

```bash
pnpm test
./bin/validate content/cyoa/pack/watchtower.yaml
printf '1\n1\n1\n' | ./bin/play content/cyoa/pack/watchtower.yaml
./bin/playtest content/parser/pack/heros_quest.yaml 42 --persona mainline
```

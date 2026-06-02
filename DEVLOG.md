# AdventureForge — Session Context & Memory
> Last updated: 2026-06-01T20:17 PDT | Author: Antigravity agent session `4f0dd58c`

---

## 🧠 What This Project Is

**AdventureForge** (`zork-unlimited-2`) is a **headless, deterministic text-adventure engine** written in TypeScript. It was built through ~2100 autonomous AI development cycles and then cleaned up in a manual overhaul session.

### Core Design Constraints
- **Pure functional core**: `step(state, action, pack)` is side-effect free
- **Deterministic PRNG**: Mulberry32 (`PureRand`) ensures byte-identical replays from the same seed
- **Zod schema validation**: All data structures validated at boundaries
- **Content-driven**: Game logic is encoded as a condition/effect DSL in YAML content packs, NOT in code
- **Headless-first**: UI is always a consumer of the structured API, never the engine

### Tech Stack
| Component | Version |
|---|---|
| TypeScript | 6.0.3 |
| Node.js | ≥ 20 (ESM modules) |
| Zod | 4.4.3 |
| Vitest | 4.1.7 |
| pnpm | Package manager |
| tsx | 4.22.4 (dev runner) |
| MCP SDK | 1.29.0 |

---

## 📁 Architecture Quick Reference

```
src/
├── core/           # THE ENGINE — pure functional, deterministic
│   ├── state.ts    # 910KB, 20K lines — GameState Zod schemas + reconcile functions
│   ├── sync.ts     # 2.0MB, 54K lines — multi-agent cooperative steps, CRDT, financial governance
│   ├── economy.ts  # 569KB, 11.5K lines — trade pricing, sovereign debt, derivatives
│   ├── engine.ts   # 206KB — step() reducer, the core game loop function
│   ├── gossip.ts   # 223KB — P2P gossip protocol, vector clocks, CRDT merge
│   ├── network.ts  # 53KB — mesh networking, link-state routing
│   ├── rng.ts      # Seeded Mulberry32 PRNG
│   ├── hash.ts     # SHA-256 canonical state hashing
│   ├── conditions.ts + effects.ts  # DSL evaluators for content packs
│   ├── events.ts   # Strongly typed game events
│   ├── security.ts # Simulated asymmetric crypto for transactions
│   ├── expedition.ts # Decentralized dungeon orchestration
│   └── anti_entropy.ts # Merkle tree recovery
├── api/            # AI-facing observation + action types
│   ├── types.ts    # Action union (300+ variants), Observation types
│   └── observation.ts # buildObservation() — sensory output compiler
├── cyoa/           # CYOA schema contracts
├── parser/         # Zork-style parser schemas + legal action generation
├── agents/         # LLM agent pipelines (writer, playtester, debugger, fixer, blind_evaluator)
│   └── llm/        # LLM client abstraction (Gemini, OpenAI, mock)
├── persist/        # Save/load with pack hash verification
├── trace/          # Deterministic replay recording + verification
├── validate/       # Graph validators + soft-lock detection
└── bin/            # CLI entrypoints (play, replay, validate, mcp-server, ai-autopilot)

tests/              # 195 test files, 882 tests (100% passing)
content/            # YAML game packs (cyoa/ and parser/)
traces/             # Recorded playthrough traces
bin/                # Shell wrappers + ai-autonomous-dev loop
```

---

## ⚡ Essential Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript → dist/
pnpm typecheck        # Type-check without emitting (fast)
pnpm test             # Run all 882 tests
pnpm test:watch       # Watch mode
pnpm clean            # Remove dist/
pnpm mcp              # Start MCP JSON-RPC server
pnpm autopilot        # Run AI autopilot validation
pnpm dev-loop         # Start autonomous AI dev loop (bin/ai-autonomous-dev)
bin/play <pack.yaml>  # Interactive CLI play session
bin/replay <trace> <pack>  # Replay a deterministic trace
```

---

## 🔧 What Was Just Done (Session Summary)

### Repo Quality Overhaul — June 1, 2026

Ran a full 7-phase repo cleanup (P1–P7) on a `chore/repo-quality-overhaul` branch, merged to `main`, pushed to GitHub.

#### Changes Made (9 commits):
1. **Git hygiene**: Expanded `.gitignore`, untracked 9 generated files (~5000 lines removed: `AFK_MEMORY.md`, `living_plan.md`, `*_log.json`, `cache/`, `scratch/`)
2. **Hardcoded paths fixed**: Replaced `/home/michael_crosato/projects/zork-unlimited-2` with dynamic `import.meta.url` resolution in `src/bin/mcp-server.ts` and `$(pwd)` in `bin/ai-autonomous-dev`
3. **Build config fixed**: `tsconfig.json` rootDir changed from `./` to `./src` (clean dist output), `package.json` main from `index.js` to `dist/index.js`
4. **Missing export fixed**: Added `BlackMarketSoldEvent` to barrel `src/index.ts`
5. **Code deduplication**: Extracted `WEATHER_EFFECTS` constant in `observation.ts`, removed `any` cast
6. **Dev loop hardened**: `git add .` → `git add -A`, fixed "Halthing" typo
7. **README rewritten**: Full rewrite with accurate architecture, scripts, env vars, design principles
8. **Dependency upgrade**: `tsx` 4.22.3 → 4.22.4
9. **Test expansion**: +18 new tests covering `normalizeCommandString`, `mapCommand`, `saveGame`/`loadGame`, `formatValidationReport`

#### Final State:
- **Build**: ✅ Clean
- **Typecheck**: ✅ Clean  
- **Tests**: ✅ 195 files, 882/882 passing
- **Security**: ✅ Zero vulnerabilities (`pnpm audit`)
- **Git**: `main` pushed to `origin/main` at commit `938d08b`
- **Branch**: `chore/repo-quality-overhaul` also pushed (for reference)

---

## ⚠️ Known Tech Debt (Not Fixed — Documented)

These are real issues but were out of scope for the cleanup:

1. **Monster files**: `sync.ts` (54K lines), `state.ts` (20K lines), `economy.ts` (11.5K lines) — functional but unmaintainable. Would need a major decomposition effort.
2. **100+ character identifiers**: Names like `reconcileSWFReinsuranceOptionVolatilityFloor...GovernanceCaps` — product of recursive AI feature stacking over 2100 cycles.
3. **Scattered `any` types**: In `economy.ts`, `effects.ts`, `expedition.ts` — pragmatic for CYOAPack|ParserPack unions.
4. **Duplicated pack-type detection**: `"scenes" in pack` pattern copied across 8 CLI files.
5. **`autopilot_detailed.log` and `autopilot_output.log`**: Still tracked in git. These are log files that should probably be gitignored but weren't caught in the cleanup.
6. **`index.html` (147KB)**: Large file at repo root — unclear if it's generated or hand-written. Needs investigation.
7. **`mcp_playtest.ts` at root**: Integration test script that should probably live in `tests/` or `src/bin/`.
8. **`loop.sh` at root**: Simple shell script that may overlap with `bin/ai-autonomous-dev`.
9. **No ESLint/Prettier**: Project relies solely on `tsc --strict` for static analysis.

---

## 🗺️ Key Files to Know

| File | Why It Matters |
|---|---|
| `src/core/engine.ts` | The `step()` function — the entire game loop |
| `src/core/state.ts` | All GameState schemas, `createInitialState()` |
| `src/bin/mcp-server.ts` | Primary AI interface (MCP JSON-RPC) |
| `src/index.ts` | Barrel export — the public API surface |
| `src/api/observation.ts` | `buildObservation()` — what AI players see |
| `src/api/types.ts` | `Action` union type (300+ variants) |
| `bin/ai-autonomous-dev` | The autonomous development loop script |
| `AFK_ROADMAP.md` | Prioritized backlog of features/tasks |
| `learnings.md` | Anti-patterns and proven strategies for AI agents |
| `AdventureForge_final_build_spec-c.md` | The original full build specification |

---

## 🔑 Environment Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API for live LLM agents |
| `GEMINI_MODEL` | Gemini model override (default: `gemini-1.5-flash`) |
| `OPENAI_API_KEY` | OpenAI API (alternative) |
| `OPENAI_MODEL` | OpenAI model override (default: `gpt-4o-mini`) |
| `AI_AGENT_CMD` | Override agent command in autonomous dev loop |

> No API keys needed for development or testing — `MockLlmClient` handles all tests deterministically.

---

## 📊 Repo Stats (as of 2026-06-01)

- **Source files**: 45 across 10 directories
- **Total LoC**: ~104,000+ (dominated by sync.ts, state.ts, economy.ts)
- **Test files**: 195 (882 tests, 100% passing)
- **Content packs**: YAML files in `content/cyoa/pack/` and `content/parser/pack/`
- **Autonomous cycles**: ~2100 AI development cycles ran before this cleanup
- **GitHub**: `michaelcrosato/zork-unlimited-2` — main is up to date

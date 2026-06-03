# AdventureForge — AI-Authored, Deterministic Text-Adventure Engine

AdventureForge is a strictly typed, headless, deterministic text-adventure engine designed for AI content-generation, automated playtesting, graph validation, and perfect replayability.

Built with TypeScript, Zod schemas, and a pure functional core — the game engine is side-effect free and cryptographically verifiable.

---

## 🚀 Quickstart

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** (recommended) — install via `corepack enable`

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build

Compile TypeScript to the `dist/` directory:

```bash
pnpm build
```

### 3. Run the Test Suite

AdventureForge relies on a robust suite of unit and property tests to enforce state transition purity and absolute determinism:

```bash
pnpm test
```

### 4. Start the MCP Server

Launch the [Model Context Protocol](https://modelcontextprotocol.io/) server for structured AI gameplay:

```bash
pnpm mcp
```

### 5. Play Interactively

Start an interactive CLI session with a content pack:

```bash
bin/play content/cyoa/pack/watchtower.yaml
```

### 6. Replay a Playthrough Trace

Replay a recorded game trace to verify byte-identical final state hashes:

```bash
bin/replay traces/escape_trace.json content/cyoa/pack/watchtower.yaml
```

---

## 🏗️ Repository Architecture

```
├── src/
│   ├── core/           # Deterministic engine core
│   │   ├── state.ts    # GameState schemas (Zod) and reconciliation
│   │   ├── engine.ts   # Pure state transition step(state, action) reducer
│   │   ├── sync.ts     # Multi-agent cooperative step logic
│   │   ├── economy.ts  # Trade pricing, merchant economy, financial instruments
│   │   ├── gossip.ts   # P2P gossip protocol, CRDT merge, vector clocks
│   │   ├── network.ts  # Mesh networking, link-state routing
│   │   ├── rng.ts      # Seeded Mulberry32 pseudo-random number generator
│   │   ├── hash.ts     # Stable canonical serializer and SHA-256 hashing
│   │   ├── conditions.ts & effects.ts  # Condition/effect DSL evaluators
│   │   ├── events.ts   # Strongly typed game event definitions
│   │   ├── security.ts # Transaction signing and verification
│   │   ├── expedition.ts # Decentralized dungeon expedition orchestrator
│   │   └── anti_entropy.ts # Merkle tree anti-entropy recovery
│   ├── api/            # AI-facing observation and structured command API
│   ├── cyoa/           # Stage 1 Choose-Your-Own-Adventure schema contracts
│   ├── parser/         # Stage 2 Zork-style parser adventure schemas
│   ├── agents/         # AI agent pipelines (writer, playtester, debugger, fixer)
│   │   └── llm/        # LLM client abstraction (Gemini, OpenAI, mock)
│   ├── persist/        # Cryptographically verified state save/load
│   ├── trace/          # Deterministic game trace recorders and replayers
│   ├── validate/       # Compile-time graph validators and soft-lock analyzers
│   └── bin/            # CLI entrypoints (play, replay, validate, mcp-server)
├── tests/              # Unit tests and determinism property validators (192 files)
├── content/            # Game content packs (YAML)
│   ├── cyoa/pack/      # CYOA adventures
│   └── parser/pack/    # Parser-style adventures
├── traces/             # Recorded playthrough traces for replay verification
└── bin/                # Shell wrappers for CLI commands
```

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `pnpm build` | Compile TypeScript → `dist/` |
| `pnpm test` | Run full test suite (vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | Verify type safety without emitting compiler output |
| `pnpm clean` | Delete build outputs (`dist/`) |
| `pnpm lint` | Run ESLint static analysis checks |
| `pnpm lint:fix` | Run ESLint and automatically fix auto-fixable warnings |
| `pnpm format` | Auto-format codebase styles with Prettier |
| `pnpm format:check` | Check code formatting compliance against Prettier rules |
| `pnpm replay` | Replay a recorded game trace |
| `pnpm mcp` | Start the MCP JSON-RPC server |
| `pnpm autopilot` | Run AI autopilot validation |
| `pnpm dev-loop` | Run autonomous AI development cycle |
| `pnpm playtest` | Run playtest session with LLM agent |
| `pnpm playtest:loop` | Run automated playtest loop |
| `pnpm synthesize` | Synthesize raw playtest feedback into markdown digest |
| `pnpm test:integration` | Run integration tests against MCP server |

---

## 🔧 Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for live LLM agents |
| `GEMINI_MODEL` | Gemini model override (default: `gemini-1.5-flash`) |
| `OPENAI_API_KEY` | OpenAI API key (alternative to Gemini) |
| `OPENAI_MODEL` | OpenAI model override (default: `gpt-4o-mini`) |

> **Note:** All CI and automated tests use a deterministic `MockLlmClient`. No API keys are required for development or testing.

---

## 🧪 Testing

The project includes **192 test files** with **864+ tests** covering:

- Core engine determinism and state transitions
- DSL condition/effect evaluation
- P2P gossip protocol convergence
- Multi-agent cooperative gameplay
- Trade economy, merchant systems, and financial instruments
- Syndicate governance, sovereign debt, and derivatives
- Content pack validation and soft-lock detection

---

## 📐 Design Principles

1. **Pure Functional Core**: `step(state, action, pack)` is a pure function — no side effects.
2. **Deterministic PRNG**: `PureRand` (Mulberry32) ensures byte-identical replays from the same seed.
3. **Zod Schema Validation**: All data structures validated at boundaries.
4. **Content-Driven Logic**: Game mechanics encoded as a condition/effect DSL in YAML packs.
5. **Cryptographic Verification**: State hashing with SHA-256 for replay integrity.
6. **Headless-First Architecture**: UI is a consumer of the structured API, never the engine.

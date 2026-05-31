# AdventureForge — AI-Authored, Deterministic Text-Adventure Engine

AdventureForge is a strictly typed, headless, deterministic text-adventure engine designed for AI content-generation, automated playtesting, graph validation, and perfect replayability.

This repository holds the **Stage 0 (Scaffolding)** and **Stage 1 (CYOA)** foundational core.

---

## 🚀 Quickstart

### 1. Installation
Install project dependencies using `pnpm`:
```bash
pnpm install
```

### 2. Run the Test Suite
AdventureForge relies on a robust suite of unit and property tests to enforce state transition purity and absolute determinism:
```bash
pnpm test
```

### 3. Replay a Playthrough Trace
Replay a recorded game trace to verify byte-identical final state hashes:
```bash
./bin/replay traces/escape_trace.json content/cyoa/pack/watchtower.yaml
```

---

## 🏗️ Repository Architecture

The codebase adheres strictly to the decoupled design specification:

*   **`src/core/`**: The core deterministic engine.
    *   `state.ts`: The unified `GameState` schemas (using Zod) and types.
    *   `engine.ts`: Pure state transition `step(state, action)` reducer.
    *   `rng.ts`: Seeded Mulberry32 pseudo-random number generator.
    *   `hash.ts`: Stable canonical state serializer and SHA-256 hashing.
    *   `conditions.ts` & `effects.ts`: Condition and effect DSL evaluators.
    *   `events.ts`: Strongly typed game event logger definitions.
*   **`src/cyoa/`**: Stage 1 Choose-Your-Own-Adventure schema contracts.
*   **`src/api/`**: AI-facing observation and structured command API layers.
*   **`src/persist/`**: Cryptographically verified state preservation (Save/Load).
*   **`src/trace/`**: Deterministic game trace recorders and replayers.
*   **`src/validate/`**: Compile-time graph validators and soft-lock analyzers.
*   **`tests/`**: Unit tests and determinism property validators.
*   **`bin/`**: Thin script wrappers for CLI automation.

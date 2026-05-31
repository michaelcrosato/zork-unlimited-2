# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #2 (Ready for Cycle #3)
* **Build/Test Status**: 🟢 PASS (All 35 Vitest tests passing, 0 errors/0 warnings on content validation)

---

## 🎯 Main Objective
Build, validate, and expand a strictly typed, headless, deterministic text-adventure engine. Use an autonomous playtest loop to ensure absolute replayability, solve soft-locks, and improve game feel without human intervention.

---

## 📊 Backlog & Roadmap

### Phase 1: Stability & Validation (Completed)
- [x] Establish deterministic state step transitions and mulberry32 PRNG.
- [x] Implement SHA-256 state hashing for perfect replayability.
- [x] Create Choose-Your-Own-Adventure (CYOA) schemas and validators.
- [x] Create Zork-style Parser schemas and validators.
- [x] Audit and resolve warnings in existing content packs:
  - `content/parser/pack/heros_quest.yaml` (Parser)
  - `content/parser/pack/chapel.yaml` (Parser)
  - `content/cyoa/pack/watchtower.yaml` (CYOA)
- [x] Add rigorous unit tests for deep edge cases in effect/condition DSL.

### Phase 2: Game Feel & Mechanics Expansion (Active)
- [x] Introduce "Sierra-Quest-style" score telemetry and puzzle trackers.
- [ ] Add advanced NPC dialog trees and multi-option dynamic choice routing.
- [ ] Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).

### Phase 3: Headless Playtest Automation (Active)
- [x] Implement the `ai-autopilot.ts` run harness using deterministic mock LLMs.
- [ ] Support real LLM execution using environment variables (Gemini / OpenAI).
- [ ] Connect the output of playtests directly to automatic code fixes.

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-03`
* **Objective**: Add advanced NPC dialogue trees and multi-option dynamic choice routing.
* **Why this matters**: Adding dynamic conversation choices and trees allows story packs to implement rich narrative interactions and complex quest-giving characters while maintaining absolute state determinism.
* **Planned Actions**:
  1. Inspect existing state representations and NPC dialogue structures in the schema files and engine.
  2. Implement schema/engine support for NPC dialogue state, dialogue routing, and conversation nodes.
  3. Expand content packs and write unit tests verifying dialogue transitions and deterministic outcomes.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |


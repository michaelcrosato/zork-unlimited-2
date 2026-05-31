# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #1 (Ready for Cycle #2)
* **Build/Test Status**: 🟢 PASS (All 18 Vitest tests passing, 0 errors/0 warnings on content validation)

---

## 🎯 Main Objective
Build, validate, and expand a strictly typed, headless, deterministic text-adventure engine. Use an autonomous playtest loop to ensure absolute replayability, solve soft-locks, and improve game feel without human intervention.

---

## 📊 Backlog & Roadmap

### Phase 1: Stability & Validation (Active)
- [x] Establish deterministic state step transitions and mulberry32 PRNG.
- [x] Implement SHA-256 state hashing for perfect replayability.
- [x] Create Choose-Your-Own-Adventure (CYOA) schemas and validators.
- [x] Create Zork-style Parser schemas and validators.
- [x] Audit and resolve warnings in existing content packs:
  - `content/parser/pack/heros_quest.yaml` (Parser)
  - `content/parser/pack/chapel.yaml` (Parser)
  - `content/cyoa/pack/watchtower.yaml` (CYOA)
- [ ] Add rigorous unit tests for deep edge cases in effect/condition DSL.

### Phase 2: Game Feel & Mechanics Expansion (Upcoming)
- [ ] Introduce "Sierra-Quest-style" score telemetry and puzzle trackers.
- [ ] Add advanced NPC dialog trees and multi-option dynamic choice routing.
- [ ] Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).

### Phase 3: Headless Playtest Automation (Active)
- [x] Implement the `ai-autopilot.ts` run harness using deterministic mock LLMs.
- [ ] Support real LLM execution using environment variables (Gemini / OpenAI).
- [ ] Connect the output of playtests directly to automatic code fixes.

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-02`
* **Objective**: Implement comprehensive, rigorous unit tests for deep edge cases in the effect/condition DSL (Domain Specific Language) interpreter.
* **Why this matters**: As the DSL is used to run complex game-state logic (e.g. state changes, flag setting, and condition matching), ensuring absolute correctness of all operators prevents hidden bugs in user-created content packs and playtests.
* **Planned Actions**:
  1. Inspect existing DSL parsing and execution files in `src/core/conditions.ts` and `src/core/effects.ts`.
  2. Identify edge cases (nested conditions, invalid operators, multiple conditions).
  3. Author unit tests under `tests/dsl.test.ts` to fully exercise all edge conditions.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

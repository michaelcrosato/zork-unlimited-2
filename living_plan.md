# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Initializing (Ready for Cycle #1)
* **Build/Test Status**: 🟢 PASS (All 18 Vitest tests passing)

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
- [ ] Audit and resolve warnings in existing content packs:
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
**Task ID**: `AF-01`
* **Objective**: Run and audit the baseline `pnpm autopilot` test to review all existing content pack validations and playtests, and fix any warning/error reported by the graph validators.
* **Why this matters**: Valid content packs are the absolute prerequisite for stable playtesting and gameplay. Ensuring zero warnings across all packs guarantees there are no dead-ends or malformed schemas.
* **Planned Actions**:
  1. Execute `pnpm autopilot` to check output.
  2. Inspect specific validator findings for `chapel.yaml`, `heros_quest.yaml`, and `watchtower.yaml`.
  3. Edit content pack YAMLs to resolve outstanding issues.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

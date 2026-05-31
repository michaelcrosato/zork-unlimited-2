# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #3 (Ready for Cycle #4)
* **Build/Test Status**: 🟢 PASS (All 39 Vitest tests passing, 0 errors/0 warnings on content validation)

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
- [x] Add advanced NPC dialogue trees and multi-option dynamic choice routing.
- [ ] Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).

### Phase 3: Headless Playtest Automation (Active)
- [x] Implement the `ai-autopilot.ts` run harness using deterministic mock LLMs.
- [ ] Support real LLM execution using environment variables (Gemini / OpenAI).
- [ ] Connect the output of playtests directly to automatic code fixes.

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-04`
* **Objective**: Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).
* **Why this matters**: A graph-based state pathfinder will automatically detect if there's any game state where the player is permanently locked out of winning (e.g. unreachable rooms, keys locked inside boxes they open, or broken transitions), ensuring design soundness before game launch.
* **Planned Actions**:
  1. Design a state-space traversal algorithm in `src/validate/parser_validator.ts` and `src/validate/cyoa_validator.ts` to explore reachable rooms and state changes.
  2. Implement detection of hard soft-locks by verifying that at least one sequence of legal actions leads from the starting room to a win condition.
  3. Write robust unit tests with simple mock story packs that simulate broken layouts to verify that the pathfinder correctly flags them.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |


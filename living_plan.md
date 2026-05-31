# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #5 (Ready for Cycle #6)
* **Build/Test Status**: 🟢 PASS (All 49 Vitest tests passing, 0 errors/0 warnings on content validation)

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

### Phase 2: Game Feel & Mechanics Expansion (Completed)
- [x] Introduce "Sierra-Quest-style" score telemetry and puzzle trackers.
- [x] Add advanced NPC dialogue trees and multi-option dynamic choice routing.
- [x] Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).

### Phase 3: Headless Playtest Automation (Active)
- [x] Implement the `ai-autopilot.ts` run harness using deterministic mock LLMs.
- [x] Support real LLM execution using environment variables (Gemini / OpenAI).
- [ ] Connect the output of playtests directly to automatic code fixes.

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-06`
* **Objective**: Connect the output of playtests directly to automatic code fixes.
* **Why this matters**: Automated self-healing flow allows the playtester agent to detect soft-locks, validation failures, or bugs, diagnose the problem using the AI Debugger agent, and invoke the AI Fixer agent to generate content patches or engine fixes autonomously.
* **Planned Actions**:
  1. Update `ai-autopilot.ts` and `playtest.ts` to capture playtest exceptions, soft-locks, or failures.
  2. Integrate the playtester outcome with `diagnosePlaytest` and `fixIdentifiedBug` to create a self-healing patch pipeline.
  3. Validate any generated content fixes by auto-compiling and re-running playtests to confirm the fix is correct.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. Exclude `DROP` actions to keep puzzle path traversal clean. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

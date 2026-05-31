# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #9 (Ready for Cycle #10)
* **Build/Test Status**: 🟢 PASS (All 66 Vitest tests passing, 0 errors/0 warnings on content validation)

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
- [x] Audit and resolve warnings in existing content packs.
- [x] Add rigorous unit tests for deep edge cases in effect/condition DSL.

### Phase 2: Game Feel & Mechanics Expansion (Completed)
- [x] Introduce "Sierra-Quest-style" score telemetry and puzzle trackers.
- [x] Add advanced NPC dialogue trees and multi-option dynamic choice routing.
- [x] Implement a full graph-based pathfinder validator to check for hard soft-locks (detect unreachable win states).

### Phase 3: Headless Playtest Automation & Procedural Dungeons (Completed)
- [x] Implement the `ai-autopilot.ts` run harness using deterministic mock LLMs.
- [x] Support real LLM execution using environment variables (Gemini / OpenAI).
- [x] Connect the output of playtests directly to automatic code fixes.
- [x] Design, implement, and validate advanced playtest personas (hoarder, explorer, dropper) to discover complex multi-step game design bugs.
- [x] Introduce and validate Stage 2 procedural rooms and dynamic template generators (`AF-08`).

### Phase 4: Weather Systems & Environmental Effects (Completed)
- [x] Add environmental weather/temperature state fields to the GameState Schema (`AF-09`).
- [x] Build stateless pure-hash deterministic weather ticking every 5 steps.
- [x] Support `weather_is` and `temperature_is` condition modifiers in the DSL.
- [x] Inject dynamic scenic atmospheric narration based on weather for outdoor locations.
- [x] Write comprehensive Vitest test coverage and pass all autopilot playtests.

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-10`
* **Objective**: Refine, optimize, and document the newly introduced Weather and Environmental system, including standardizing procedural generation hooks and preparing for Stage 5 multiplayer/multi-agent telemetry.
* **Why this matters**: Ensures the code remains impeccably documented and performant as we prepare the headless engine for highly scaleable multi-agent testing across millions of steps.
* **Planned Actions**:
  1. Add detailed architectural comments to `tickEnvironment` and `getWeatherForStep`.
  2. Implement an optional `weather_pool` property in rooms to restrict weather conditions on a per-room basis.
  3. Optimize the state-space pathfinder to ignore purely narrative environment states, preserving search efficiency.
  4. Write comprehensive tests and validate via playtest personas.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. Exclude `DROP` actions to keep puzzle path traversal clean. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

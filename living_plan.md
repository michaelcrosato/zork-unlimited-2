# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-05-31
* **Autonomous Cycle**: Completed Cycle #13 (Ready for Cycle #14)
* **Build/Test Status**: 🟢 PASS (All 80 Vitest tests passing, 0 errors/0 warnings on content validation)

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
- [x] Connect the output of playtests directly to automatic code tests.
- [x] Design, implement, and validate advanced playtest personas (hoarder, explorer, dropper) to discover complex multi-step game design bugs.
- [x] Introduce and validate Stage 2 procedural rooms and dynamic template generators (`AF-08`).

### Phase 4: Weather Systems & Environmental Effects (Completed)
- [x] Add environmental weather/temperature state fields to the GameState Schema (`AF-09`).
- [x] Build stateless pure-hash deterministic weather ticking every 5 steps.
- [x] Support `weather_is` and `temperature_is` condition modifiers in the DSL.
- [x] Inject dynamic scenic atmospheric narration based on weather for outdoor locations.
- [x] Write comprehensive Vitest test coverage and pass all autopilot playtests.

### Phase 5: Environmental Restraints & Pathfinder Optimization (Completed)
- [x] Add detailed architectural comments to `tickEnvironment` and `getWeatherForStep` explaining stateless pure-hash math (`AF-10`).
- [x] Implement an optional `weather_pool` property in rooms/scenes and templates to restrict local room climate.
- [x] Force immediate deterministic weather updates upon room entry when current weather is invalid for the new pool.
- [x] Optimize pathfinder to omit environment fields from state keys unless weather conditions are defined in the pack.
- [x] Add robust unit tests for climate restriction transitions and pathfinder key optimizations.

### Phase 6: Multi-Agent Synchronization & Telemetry (Completed)
- [x] Add a transaction journal to capture and serialize multi-agent interactions (`AF-11`).
- [x] Implement an optimistic lock mechanism and sequence number/hash validation for state sync (`AF-11`).
- [x] Expand content packs to include cooperative multi-agent scenarios (`multiplayer_forest.yaml`).
- [x] Write comprehensive Vitest tests verifying registration, synchronization, locking, and telemetry (`AF-11`).

### Phase 7: State Rollback & Conflict Resolution (Completed)
- [x] Design a state-rollback and re-apply mechanism that merges non-conflicting concurrent actions (`AF-12`).
- [x] Build a local buffer for agent actions (`AgentActionBuffer`) that handles laggy transport simulations (`AF-12`).
- [x] Expand unit test suites to simulate concurrent agent racing conditions (`AF-12`).

### Phase 8: Gossip Protocol & Delta-State Sync (Completed)
- [x] Build a light peer sync representation using Vector Clocks (`AF-13`).
- [x] Implement state reconciliation using commutative delta-state merges and deterministic transaction replay (`AF-13`).
- [x] Write comprehensive unit and integration tests simulating network partitions and convergence upon recovery (`AF-13`).

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-14`
* **Objective**: Build a Decentralized Cooperative Dungeon Expedition framework that utilizes the GossipNode P2P protocol to synchronize procedurally generated rooms and item loot drops dynamically across decoupled peers exploring a shared procedural dungeon world.
* **Why this matters**: Demonstrates that the P2P gossip layer can seamlessly scale to handle dynamic procedural content generation and shared world state (like dynamic room spawns and loot chests) without centralized authority.
* **Planned Actions**:
  1. Build a decentralized procedural room synchronizer that propagates dynamically generated rooms via GossipNode transactions.
  2. Implement P2P lock-free chest loot claiming (LWW or single-owner assignment using CRDT transaction merges).
  3. Write comprehensive unit and integration tests simulating peer explorations and resource races in P2P dungeons.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. Exclude `DROP` actions to keep puzzle path traversal clean. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

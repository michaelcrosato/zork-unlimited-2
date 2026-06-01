# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-06-01
* **Autonomous Cycle**: Completed Cycle #33 (Ready for Cycle #34)
* **Build/Test Status**: 🟢 PASS (All 147 Vitest tests passing, 0 errors/0 warnings on content validation)

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

### Phase 9: Decentralized Cooperative Dungeons (Completed)
- [x] Build a decentralized procedural room synchronizer propagating rooms via GossipNode transactions (`AF-14`).
- [x] Implement lock-free chest loot claiming using LWW CRDT transaction merges (`AF-14`).
- [x] Write comprehensive unit and integration tests simulating explorations, partitions, and races (`AF-14`).

### Phase 10: Local Network Discovery & Mesh Routing (Completed)
- [x] Design a decentralized `NetworkDiscovery` registry that simulates dynamic P2P node joining/leaving (`AF-15`).
- [x] Support automatic route calculation and multi-hop gossip forwarding through intermediary peers (`AF-15`).
- [x] Add rigorous test cases for mesh discovery, packet routing, and message forwarding convergence (`AF-15`).

### Phase 11: Immersive Peer Discovery & Cooperative Sync Narration (Completed)
- [x] Add support for triggering `NarrationEvent` announcements for P2P peer events (`AF-16`).
- [x] Implement customizable network narrative templates in the content pack schema (`AF-16`).
- [x] Add persistent `cooperativeSyncLog` field to GameState (`AF-16`).
- [x] Write rigorous Vitest tests for arrival, departure, and synchronization narration events (`AF-16`).

### Phase 12: Mesh Heartbeat & Active Route Repair (Completed)
- [x] Design and build a multi-hop mesh heartbeat mechanism that periodically validates route persistence (`AF-17`).
- [x] Implement an automated top-level network repair routine on route failure to calculate fallback paths dynamically (`AF-17`).
- [x] Broadcast updated topology presence on repair to resolve routing loops and propagate changes rapidly (`AF-17`).
- [x] Expand unit and integration tests to assert message delivery via fallback paths after physical partition of primary routes (`AF-17`).

### Phase 13: Congestion-Aware Priority Queue Routing (Completed)
- [x] Add routing priority fields to `RoutedPacket` and implement priority-based packet queue sorting in `MeshNetwork` (`AF-18`).
- [x] Design and implement bandwidth limiting via `maxPacketsPerTick` to simulate network congestion (`AF-18`).
- [x] Benchmark and assert state convergence speed under high packet queue depth comparing priority vs. non-priority routing (`AF-18`).
- [x] Write robust unit and integration tests to verify priority queue behavior and state convergence speed under congestion (`AF-18`).

### Phase 14: Topology Pruning & Garbage Collection (Completed)
- [x] Add a `lastSeen` timestamp to topology link-state records in `NetworkDiscovery` (`AF-19`).
- [x] Implement an automated periodic pruning check in `MeshNetwork` and `MeshNode` based on `topologyPruningThresholdMs` (`AF-19`).
- [x] Recalculate routing tables upon garbage collection and assert dynamic route adjustment under silent node failures (`AF-19`).
- [x] Write robust unit tests verifying stale node pruning, timestamp tracking, and duplicate/older sequence updates (`AF-19`).

### Phase 15: Gossip / Mesh Packet Deduplication & Loop Prevention (Completed)
- [x] Add a `processedPacketCache` to `MeshNode` with sliding window cleanup (`AF-20`).
- [x] Modify `receivePacket` to drop duplicate packets based on packet ID (`AF-20`).
- [x] Write comprehensive unit tests simulating redundant/circular network paths and sliding window expiration (`AF-20`).

### Phase 16: Gossip Differential Compression & RLE Delta Sync (Completed)
- [x] Design a lightweight column-wise serialization, delta-encoding, and RLE compression protocol (`compressStateDiff`) to minimize packet sizes (`AF-21`).
- [x] Implement local node caching of recently sent delta packets to avoid redundant updates (`AF-21`).
- [x] Write comprehensive unit tests for compression, decompression, redundancy caching, and converged sync (`AF-21`).

### Phase 17: Gossip Packet Fragmentation & Reassembly (Completed)
- [x] Design a serialization wrapper that splits compressed state diffs into small indexed chunks/fragments with a shared transmission ID and total fragment count header (`AF-22`).
- [x] Implement an out-of-order buffer at the receiver node to reassemble fragments, handling missing or delayed packets (`AF-22`).
- [x] Write comprehensive unit and integration tests asserting seamless reassembly, fragment drop tolerance, and state convergence (`AF-22`).

### Phase 18: Gossip Anti-Entropy Recovery (Completed)
- [x] Design a periodic low-overhead anti-entropy digest exchange containing a merkle tree root or condensed clock hash of local states (`AF-23`).
- [x] Implement a background recovery task triggered when state divergence or clock discrepancies are detected (`AF-23`).
- [x] Write comprehensive tests asserting complete convergence of partitioned nodes upon anti-entropy reconciliation (`AF-23`).

### Phase 19: Secure Multiplayer Mesh Transaction Verification (Completed)
- [x] Design and implement a secure transaction verification and signing protocol (`SecureCooperativeMesh`) using simulated asymmetric cryptography (`AF-24`).
- [x] Support deterministic public/private key pairs and dynamic transaction signing upon execution (`AF-24`).
- [x] Implement signature validation during state reconstruction (`reconstructState`) and P2P receiving (`receiveGossip`) (`AF-24`).
- [x] Add signature compression to delta state encoding to prevent hash/telemetry divergence (`AF-24`).
- [x] Write comprehensive unit tests for keypair generation, transaction signing, signature verification, spoofing/tampering detection, and secure mesh convergence (`AF-24`).

### Phase 20: Procedural Merchant & Economy System (Completed)
- [x] Add `NPC_TRADE` interaction effect type supporting stocking, buying, and selling mechanics (`AF-25`).
- [x] Implement custom game state variables (`gold`, `merchantInventories`, and `tradeHistory` transaction logs) (`AF-25`).
- [x] Support procedurally stocking merchant inventories deterministically using the mulberry32 PRNG seed (`AF-25`).
- [x] Integrate BUY/SELL parser command mapping and dynamic legal-actions generation (`AF-25`).
- [x] Write comprehensive Vitest unit and pathfinder reachability validation tests (`AF-25`).

### Phase 21: Enhanced Merchant Economy & Reputation (Completed)
- [x] Add support for weather-based price multipliers (`climate_pricing`) for dynamic price fluctuation in extreme climates (`AF-26`).
- [x] Implement merchant gold limits and automatic daily restocking timers with procedural item restock (`AF-26`).
- [x] Implement dynamic player-NPC reputation tracking (`npcRep` in state and `change_reputation` effect) (`AF-26`).
- [x] Wire dynamic price scaling and transaction success verification to NPC/effect reputation thresholds (`AF-26`).
- [x] Write comprehensive unit tests asserting all reputation, weather climate_pricing, gold limits, and restocking logic (`AF-26`).

### Phase 22: Cooperative Faction Alliances & Reputation Dynamics (Completed)
- [x] Define faction structures (`factions`) and player-faction reputation variables (`faction_rep`) (`AF-27`).
- [x] Support faction-gated room exits and item interaction conditions (`AF-27`).
- [x] Implement cooperative faction-reputation gossip synchronization across the P2P mesh (`AF-27`).
- [x] Write comprehensive unit and integration tests simulating P2P gossip mesh faction reputation convergence (`AF-27`).

### Phase 23: Decentralized Faction Territories & Conquest Goals (Completed)
- [x] Define faction territory schemas and track regional control in the decentralized state (`AF-28`).
- [x] Implement gossip-based dynamic territory claim resolution and conflict arbitration using LWW CRDT (`AF-28`).
- [x] Support territory-based exit traversal constraints and faction tax mechanics (`AF-28`).
- [x] Write comprehensive unit and integration tests simulating P2P gossip mesh territory conquest convergence (`AF-28`).

### Phase 24: Faction Conquest Rewards & Territory Pricing (Completed)
- [x] Design and implement faction conquest rewards, control dynamic pricing, and territory presence discounts/markups (`AF-29`).
- [x] Implement periodic passive tax gold generation in state for controlled faction territories (`AF-29`).
- [x] Write comprehensive unit and playtest tests asserting presence discounts, passive taxes, and control bonuses (`AF-29`).

### Phase 25: Faction Conquest Narration & Tax Telemetry (Completed)
- [x] Add customizable dynamic narration triggers for when a territory's controlling faction changes during mesh gossip convergence (`AF-30`).
- [x] Implement state-based telemetry tracking of the player's total accumulated taxes (`totalTaxesCollected` in state variables) (`AF-30`).
- [x] Write comprehensive unit and integration tests asserting faction claim narration and tax telemetry tracking (`AF-30`).

### Phase 26: Dynamic Faction Tax Adjustment & Vote Arbitration (Completed)
- [x] Add `taxPolicy` and `taxVotes` to faction state and support `VOTE_TAX_RATE` decentralized action (`AF-31`).
- [x] Implement a deterministic tie-breaking majority consensus arbitration rule using sorted unique rates and vector clocks (`AF-31`).
- [x] Scale travel tax and periodic passive tax collections dynamically by consensual taxPolicy rate (`AF-31`).
- [x] Write comprehensive unit tests for voting transactions, mesh convergence, and dynamic tax collection price scaling (`AF-31`).

### Phase 27: Dynamic Decentralized Faction Alliances & Vote Arbitration (Completed)
- [x] Add `alliances` state to track faction-faction relationships (neutral, allied, hostile) (`AF-32`).
- [x] Implement `PROPOSE_ALLIANCE` and `DISSOLVE_ALLIANCE` decentralized actions and consensus voting logic (`AF-32`).
- [x] Wire alliance state to scale tax policies (e.g. allied factions pay no travel tax or reduced tax, while hostile factions pay double tax!) (`AF-32`).
- [x] Write comprehensive unit and integration tests asserting presence alliances, proposals, consensus tie-breaking, P2P mesh sync convergence, and strategic pricing effects (`AF-32`).

### Phase 28: Alliance-Based Territory Conquest & Cooperative Defense (Completed)
- [x] Add assistants and allianceDefense to TerritoryClaim Schema (`AF-33`).
- [x] Implement ASSIST_CONQUEST action with allied faction requirements check (`AF-33`).
- [x] Enforce LWW conquest timestamp penalties and assistants bonuses (`AF-33`).
- [x] Detect and generate custom narration alerts for alliance battles (`AF-33`).
- [x] Write comprehensive integration tests verifying cooperative defense, conquest, and mesh gossip convergence (`AF-33`).

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-34`
* **Objective**: Implement decentralized faction-controlled trade route tax collection mesh.
* **Why this matters**: Allowing factions to establish trade routes and levy automated tolls on other players/agents that traverse their connected rooms creates a truly dynamic decentralized RPG economy.
* **Planned Actions**:
  1. Define faction-controlled route structures and register connected room sequences in state.
  2. Add transaction effects to lock or toll traversal when crossing hostile trade routes.
  3. Propagate trade route definitions and consensus tax shares across the Gossip mesh.
  4. Write comprehensive integration tests.

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. Exclude `DROP` actions to keep puzzle path traversal clean. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use efficient execution loops. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |

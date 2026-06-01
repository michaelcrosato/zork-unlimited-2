# 🌀 AdventureForge: Living Development Plan

* **Last Updated**: 2026-06-01
* **Autonomous Cycle**: Completed Cycle #130 (Ready for Cycle #131)
* **Build/Test Status**: 🟢 PASS (All 569 Vitest tests passing, 0 errors/0 warnings on content validation)


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
### Phase 29: Decentralized Trade Routes and Faction Tolls (Completed)
- [x] Define faction-controlled route structures and register connected room sequences in state (`AF-34`).
- [x] Add transaction effects to lock or toll traversal when crossing hostile trade routes (`AF-34`).
- [x] Propagate trade route definitions and consensus tax shares across the Gossip mesh (`AF-34`).
- [x] Write comprehensive integration tests and verify mesh convergence (`AF-34`).

### Phase 30: Decentralized Faction Merchant Licensing and Tariffs (Completed)
- [x] Define faction-controlled merchant licensing structures and purchase costs in state (`AF-35`).
- [x] Implement transaction effects to levy consensual tariffs on buy/sell actions in faction territories for unlicensed traders (`AF-35`).
- [x] Propagate merchant licensing definitions, license holdings, and consensus tariff rates across the P2P Gossip mesh (`AF-35`).
- [x] Write comprehensive integration tests asserting pricing, voting consensus, and mesh convergence (`AF-35`).

### Phase 31: Decentralized Faction Reputation-Based Tariff Waivers & Merchant Trade Caps (Completed)
- [x] Add faction reputation-based tariff discount thresholds and waivers to the tariff policy (`AF-36`).
- [x] Implement merchant trade transaction count and gold volume caps based on faction standing (`AF-36`).
- [x] Sync transaction caps and reputation alignments across the gossip mesh (`AF-36`).
- [x] Write comprehensive integration tests verifying caps and reputation-based waivers (`AF-36`).

### Phase 32: Decentralized Multi-Merchant Price Arbitrage & Local Inventory Balancing (Completed)
- [x] Add local inventory-based dynamic pricing multipliers (supply/demand curves) to the economy module (`AF-37`).
- [x] Implement multi-node merchant inventory gossip updates across the mesh using LWW CRDT rules (`AF-37`).
- [x] Add trade arbitrage pathfinding checks to identify and exploit cross-territory price gaps (`AF-37`).
- [x] Write comprehensive integration tests verifying supply-based price updates and mesh arbitrage loops (`AF-37`).

### Phase 33: Gossip-based Cooperative Merchant Trade Guilds and Territory Tariff Arbitrations (Completed)
- [x] Add trade guild affiliations, memberships, votes, policies, and collective bargaining agreements to state schemas (`AF-38`).
- [x] Implement decentralized action transitions and majority-consensus arbitration for guild tariff rates and export pricing policies (`AF-38`).
- [x] Support full P2P gossip mesh replication of guild standing, votes, memberships, and CBA parameters (`AF-38`).
- [x] Wire guild membership discounts, non-member guild tariffs, export policies, and CBA faction tariff overrides into the strategic trade pricing module (`AF-38`).
- [x] Write comprehensive integration tests verifying strategic pricing, voting consensus, CBA overrides, and mesh replication convergence (`AF-38`).

### Phase 33: Gossip-based Collective Merchant Cartels and Price Collusion (Completed)
- [x] Define merchant cartel coordination and embargo schemas in state variables (`AF-39`).
- [x] Implement local competition/density checks to trigger coordinated pricing hikes (`AF-39`).
- [x] Support P2P gossip mesh replication of active embargoes and cartel policies (`AF-39`).
- [x] Write comprehensive integration tests verifying embargoes and cartel-coordinated price hikes (`AF-39`).

### Phase 34: Decentralized Cartel Smuggling and Contraband Economy (Completed)
- [x] Add contraband flags to item schemas and state variables (`AF-40`).
- [x] Implement smuggling reducer effects for crossing hostile/embargoed borders (`AF-40`).
- [x] Support P2P gossip mesh synchronization of blacklisted contraband list and regional black-market smuggling payouts (`AF-40`).
- [x] Write comprehensive Vitest integration tests for smuggling border checks, caught penalties, and mesh-wide sync (`AF-40`).

---

### Phase 35: Smuggling Bounty Hunters & Dynamic Enforcement Agents (Completed)
- [x] Define Bounty Hunter and Enforcement Agent AI behavior and state schemas (`AF-41`).
- [x] Implement ambush narration events and pursuit mechanisms with BFS pathfinding (`AF-41`).
- [x] Support P2P mesh synchronization of bounty tracking lists and bounty payouts (`AF-41`).
- [x] Write comprehensive Vitest integration tests for hunters, ambushes, and mesh-wide bounty convergence (`AF-41`).

---

### Phase 36: Cartel Smuggling Insurance & Bribe Mechanics (Completed)
- [x] Define Bribe and Smuggling Insurance state schemas and properties (`AF-42`).
- [x] Implement bribe reducers and conditional checks in the movement border check (`AF-42`).
- [x] Support P2P mesh synchronization of active smuggling insurance policies and transaction bribes (`AF-42`).
- [x] Write comprehensive Vitest integration tests for bribes, cartel insurance, and mesh-wide convergence (`AF-42`).

---

### Phase 37: Decentralized Crime Syndicates and Contraband Labs (Completed)
- [x] Define Crime Syndicate and Contraband Production Lab state schemas and variables in GameState (`AF-43`).
- [x] Implement decentralized transaction action reducers to build, upgrade, defend labs, and claim contraband (`AF-43`).
- [x] Wire periodic passive contraband generation and Mulberry32-seeded enforcement raids inside standard ticks (`AF-43`).
- [x] Add P2P gossip sync and Merkle-LWW reconciliation convergence for syndicate and lab states (`AF-43`).
- [x] Write robust Vitest integration tests for syndicate creation, building, passive production, raids/defenses, claims, and mesh convergence (`AF-43`).

---

### Phase 38: Syndicate Turf Wars and Global Market Influences (Completed)
- [x] Add turf war mechanics where syndicates can wage battles over room/territory control, adjusting syndicate dominance (`AF-44`).
- [x] Implement global market price multipliers for contraband based on regional supply, syndicate dominance, and enforcement pressure (`AF-44`).
- [x] Wire gossip synchronization of global contraband price fluctuations and syndicate turf boundaries (`AF-44`).
- [x] Write comprehensive Vitest integration tests asserting turf wars, pricing spikes, and mesh convergence under pressure (`AF-44`).

---

### Phase 39: Crime Syndicate Extortion and Protection Rackets (Completed)
- [x] Define protection racket schemas (`protectionRackets` inside GameState) (`AF-45`).
- [x] Implement decentralized action reducer `DEMAND_PROTECTION` to extort merchants (`AF-45`).
- [x] Levy dynamic extortion tolls inside move traversals for non-allied turf entries (`AF-45`).
- [x] Distribute collected extortion and protection gold among syndicate members (`AF-45`).
- [x] Write comprehensive unit and integration tests verifying extortion, tolls, passive income, and gossip syncing (`AF-45`).

### Phase 40: Syndicate Bribery & Enforcer Raid Deflection (Completed)
- [x] Add a bribery and deflection state schema to GameState (`AF-46`).
- [x] Implement decentralized action reducers to bribe enforcers or purchase deflection policies (`AF-46`).
- [x] Wire logic to lower enforcement heat dynamically and deflect enforcer raids based on regional active policies (`AF-46`).
- [x] Write comprehensive integration tests verifying bribes, deflection mechanics, and gossip synchronization (`AF-46`).

---

### Phase 41: NPC Dialogue Tree Gating & Strategic Trade Incentives (Completed)
- [x] Add alliance and enforcer heat condition checks (`alliance_is`, `enforcer_heat_gte`, `enforcer_heat_lte`) to dialogue and engine DSL condition system (`AF-47`).
- [x] Wire faction reputation and area enforcer heat variables to merchant availability, blocking trades if heat exceeds the merchant's limit or if standing is poor (`AF-47`).
- [x] Provide strategic 20% discounts on buying and 20% premium bonuses on selling contraband items for allied syndicate members (`AF-47`).
- [x] Write comprehensive integration tests asserting dialogue gating, enforcer heat/reputation trade blocks, and syndicate pricing incentives (`AF-47`).

### Phase 42: Syndicate Safehouses & Stash Networks (Completed)
- [x] Define Syndicate Safehouse and Stash state schemas (`AF-48`).
- [x] Implement reducer actions to purchase and upgrade safehouse stash capacity (`AF-48`).
- [x] Wire stash item deposit and retrieval mechanics (`AF-48`).
- [x] Integrate enforcer raid and combat defeat fallback points relocating players and agents to active safehouses (`AF-48`).
- [x] Write comprehensive integration tests verifying safehouse management, stashing, and fallback mechanics (`AF-48`).

---

### Phase 43: Syndicate Black Markets & Dynamic Tariffs (Completed)
- [x] Define Syndicate Black Market trade structures and schemas in GameState (`AF-49`).
- [x] Implement reducer actions to sell items to black markets within safehouses (`AF-49`).
- [x] Wire logic to bypass regional tolls and tariffs when trading at a syndicate-registered safehouse (`AF-49`).
- [x] Write comprehensive integration tests verifying safehouse black markets, tariff/toll bypasses, and Gossip replication (`AF-49`).

---

### Phase 44: Crime Syndicate Laundering & Front Businesses (Completed)
- [x] Define Syndicate Front Business schemas and structures in GameState (`AF-50`).
- [x] Implement decentralized actions to BUY_FRONT_BUSINESS and LAUNDER_GOLD (`AF-50`).
- [x] Wire periodic passive laundering ticks within `tickEconomy` that clean dirty gold and reduce enforcer heat based on syndicate dominance (`AF-50`).
- [x] Write comprehensive integration tests verifying front business purchases, deposits, laundering, heat reduction, and gold distribution (`AF-50`).

---

### Phase 45: Front Business Upgrades & Strategic Market Manipulation (Completed)
- [x] Add `UPGRADE_FRONT_BUSINESS` decentralized action increasing capacity and rate (`AF-51`).
- [x] Implement laundering-volume-based enforcer sweep triggers when heat exceeds threshold (`AF-51`).
- [x] Write comprehensive integration tests (`AF-51`).
### Phase 46: Syndicate Turf Defence Buffs & Security Guards (Completed)
- [x] Define Turf Guard state schema and cost in state (`AF-52`).
- [x] Implement `HIRE_TURF_GUARD` action checking membership, room validity, and gold (`AF-52`).
- [x] Wire guard presence to lower enforcer raid success rate or provide turf defence combat bonuses (`AF-52`).
- [x] Write comprehensive integration tests verifying validations, lab/front sweep defenses, turf wars, and gossip sync (`AF-52`).

### Phase 47: Crime Syndicate Turf Tax & Automatic Collections (Completed)
- [x] Add `turfTaxRate` to CrimeSyndicate state schema (`AF-53`).
- [x] Implement `ADJUST_TURF_TAX` decentralized consensus vote action with descending tie-breaker majority consensus arbitration (`AF-53`).
- [x] Wire periodic passive tax generation inside `tickEconomy` collecting from front businesses in rooms controlled by a syndicate, scaling by local turf guard security presence, and automatically distributing shares to syndicate members (`AF-53`).
- [x] Write comprehensive Vitest integration tests asserting consensus tie-breaking, guard multipliers, member distributions, and gossip mesh convergence (`AF-53`).

---

### Phase 48: Crime Syndicate Turf Contraband Checkpoints & Automatic Bribe Extortions (Completed)
- [x] Define Turf Contraband Checkpoint and Bribe Cost schemas (`AF-54`).
- [x] Implement `ADJUST_TURF_BRIBE` and `ESTABLISH_CHECKPOINT` decentralized consensus vote and action transitions (`AF-54`).
- [x] Wire traversal checks to automatically intercept agents carrying contraband in hostile turf, levying consensus bribe tolls or triggering enforcer skirmishes (`AF-54`).
- [x] Write comprehensive integration tests verifying checkpoints, bribe scales, and mesh convergence (`AF-54`).

---

### Phase 50: Crime Syndicate Turf Guard Defense Outposts & Security Level (Completed)
- [x] Define Turf Guard Defense Outpost and Security Level schemas in GameState (`AF-56`).
- [x] Implement `ESTABLISH_OUTPOST` decentralized consensus action (`AF-56`).
- [x] Wire automatic defense outposts to automatically recruit local Turf Guards and dynamically intercept enforcer sweeps (`AF-56`).
- [x] Write comprehensive integration and P2P mesh convergence tests (`AF-56`).

### Phase 51: Tactical Defense Turrets (Completed)
- [x] Define Turf Guard Defense Outpost Turret schemas and tactical properties in GameState (`AF-57`).
- [x] Implement `CONSTRUCT_TURRET` decentralized consensus action with custom gold costs (`AF-57`).
- [x] Wire tactical turrets to automatically strike down enforcer forces during sweeps, lowering sweep damage, deflecting lab raids, and collecting dynamic security premiums (`AF-57`).
- [x] Write comprehensive integration and P2P mesh convergence tests (`AF-57`).

### Phase 52: Crime Syndicate Smuggling Cargo Fleets & Convoy Networks (Completed)
- [x] Define Crime Syndicate Smuggling Cargo Fleet / Convoy state schemas in GameState (`AF-58`).
- [x] Implement `ORGANIZE_CONVOY` decentralized consensus action costing gold and cargo resources (`AF-58`).
- [x] Wire smuggling convoy transport ticks across trade routes, calculating ambush risks, faction toll deductions, and payout distributions (`AF-58`).
- [x] Write comprehensive unit, integration, and P2P mesh convergence tests (`AF-58`).

### Phase 53: Crime Syndicate Contraband Insurance Claims & Dynamic Loss Compensation Policies (Completed)
- [x] Define smuggling convoy loss insurance schemas inside GameState (`AF-59`).
- [x] Implement `PURCHASE_CONVOY_INSURANCE` decentralized consensus action costing gold (`AF-59`).
- [x] Wire automatic insurance claim processing inside `tickSmugglingConvoys` on convoy ambush destruction, distributing compensation gold to members (`AF-59`).
- [x] Write comprehensive unit, integration, and P2P mesh convergence tests (`AF-59`).

### Phase 54: Crime Syndicate Contraband Insurance Underwriting & Dynamic Premium Adjustments (Completed)
- [x] Define dynamic insurance premium scaling formulas inside the economy/sync system (`AF-60`).
- [x] Implement route-risk evaluation based on room enforcement heat, active factions, and historical ambush occurrences (`AF-60`).
- [x] Validate premium calculations dynamically upon `PURCHASE_CONVOY_INSURANCE` transactions (`AF-60`).
- [x] Write comprehensive integration tests asserting underwriting scaling, hostile faction markups, heat scaling, and loss history maluses (`AF-60`).

### Phase 55: Crime Syndicate Money Laundering Audits & Regulatory Enforcer Sweeps (Completed)
- [x] Add money laundering audit triggers to the front business / economy tick systems (`AF-61`).
- [x] Implement enforcer raid penalties and asset confiscation based on active protection levels (`AF-61`).
- [x] Sync audit states across the Gossip mesh using LWW CRDT rules (`AF-61`).
- [x] Write comprehensive integration tests asserting triggers, defense calculations, failed audits, and gossip merges (`AF-61`).

### Phase 56: Crime Syndicate Counter-Intelligence Operations & Undercover Enforcer Infiltration (Completed)
- [x] Add an `undercoverAgents` tracking structure to `GameStateSchema` and syndicate properties (`AF-62`).
- [x] Implement periodic infiltration chances scaled by enforcer heat and front business laundering volume (`AF-62`).
- [x] Wire reducer actions to launch counter-intelligence background checks or execute mole exposes (`AF-62`).
- [x] Propagate undercover enforcer presence and counter-intelligence state across the Gossip mesh (`AF-62`).
- [x] Write comprehensive integration tests asserting all infiltration, background checks, exposes/rooting out, and gossip convergence (`AF-62`).

---

### Phase 57: Syndicate Informants & Undercover Agent Interrogation (Completed)
- [x] Add `informants` and `raidWarnings` tracking to `GameStateSchema` (`AF-63`).
- [x] Implement reducer actions to bribe, interrogate, or recruit defeated enforcers as informants (`AF-63`).
- [x] Wire periodic informant updates checking for upcoming regulator sweep schedules (`AF-63`).
- [x] Integrate automatic safehouse evacuation effects when pre-emptive warnings are active (`AF-63`).
### Phase 58: Syndicate Espionage Networks & Wiretapping (Completed)
- [x] Add `espionageNetworks` and `wiretaps` tracking to `GameStateSchema` (`AF-64`).
- [x] Implement decentralized action reducers to `ESTABLISH_ESPIONAGE_NETWORK` and `PLACE_WIRETAP` (`AF-64`).
- [x] Wire periodic espionage ticks within `tickEconomy` to intercept gold fees (faction taxes, rival turf taxes) and leak gossip transaction maps deterministically (`AF-64`).
- [x] Write comprehensive unit and integration tests (`AF-64`).

### Phase 59: Syndicate Black Market Informants & Intel Trading (Completed)
- [x] Add `intelStock` and `intelTransactions` schemas to syndicate state (`AF-65`).
- [x] Implement decentralized action reducers `SELL_INTEL_REPORT` and `BUY_INTEL_REPORT` (`AF-65`).
- [x] Wire transaction reducers to trigger strategic benefits upon intelligence trading (`AF-65`).
- [x] Write comprehensive integration tests (`AF-65`).

### Phase 60: Syndicate Sabotage & Undercover Enforcer Defection (Completed)
- [x] Add `SABOTAGE_NETWORK` decentralized action reducer (`AF-66`).
- [x] Add `FLIP_UNDERCOVER_AGENT` decentralized action reducer (`AF-66`).
- [x] Integrate with network Discovery/Mesh node gossip updates (`AF-66`).
- [x] Write comprehensive integration tests verifying validations, active overrides, and gossip reconciliation (`AF-66`).

### Phase 61: Smuggling Ringleaders & Global Cartel Taxes (Completed)
- [x] Add `APPOINT_RINGLEADER` decentralized action reducer (`AF-67`).
- [x] Add `VOTE_CARTEL_GLOBAL_TAX` decentralized action reducer (`AF-67`).
- [x] Integrate with economy ticks and mesh-wide gossip sync (`AF-67`).
- [x] Write comprehensive integration tests (`AF-67`).
### Phase 62: Smuggler Guilds, Traversal CBA Overrides & Cooperative Bounties (Completed)
- [x] Add `DEFINE_SMUGGLER_GUILD` decentralized action (`AF-68`).
- [x] Add `VOTE_SMUGGLER_GUILD_CBA` decentralized action (`AF-68`).
- [x] Add `POOL_BOUNTY_RESOURCES` decentralized action (`AF-68`).
- [x] Integrate with movement border toll checks and enforcer ticks (`AF-68`).
- [x] Write comprehensive integration tests verifying strategic overrides and mesh-wide sync (`AF-68`).

### Phase 63: Smuggler Syndicate Cartel Alliances, Dynamic Strategic Pricing, and Mutual Espionage Sharing (Completed)
- [x] Add `PROPOSE_SYNDICATE_ALLIANCE` decentralized action (`AF-69`).
- [x] Add `SHARE_ESPIONAGE_DATA` decentralized action (`AF-69`).
- [x] Wire allied syndicate status to safehouse black market strategic discount scaling (20% for owning member, 10% for allied syndicate member) (`AF-69`).
- [x] Write comprehensive integration tests verifying alliances, safehouse black market trading, and espionage sharing (`AF-69`).


### Phase 64: Cartel War Chests, Faction Bribes, and Cooperative Turf Guard Recruiting (Completed)
- [x] Add `CONTRIBUTE_WAR_CHEST` and `PAY_FACTION_BRIBE` decentralized actions (`AF-70`).
- [x] Implement cooperative recruitment of turf guards using cartel war chest gold and across allied syndicates (`AF-70`).
- [x] Wire cartel war chests and faction bribes to traversal border checks and enforcer heat calculations (`AF-70`).
- [x] Write comprehensive integration tests asserting all mechanics and convergence (`AF-70`).

### Phase 65: Smuggler Syndicate Cartel Conquest Campaigns, Faction War Declarations, and Territory Taxation (Completed)
- [x] Add `DECLARE_FACTION_WAR` and `LAUNCH_CAMPAIGN` decentralized actions (`AF-71`).
- [x] Implement faction war status modifying strategic pricing, toll scaling, and enforcer pursuit BFS paths (`AF-71`).
- [x] Wire campaign success probabilities to pooled cartel war chest investments (`AF-71`).
- [x] Support passive tax distribution and regional taxation rules over controlled territories (`AF-71`).
- [x] Write comprehensive integration tests asserting war declaration, campaigns, pricing/tolls, and gossip convergence (`AF-71`).

- [x] Add `BUILD_DEFENSE_FORTRESS` and `PROPOSE_PEACE_TREATY` decentralized consensus actions (`AF-72`).
- [x] Implement periodic faction counter-attacks ticking inside `tickEconomy`, triggering sieges against seized syndicate territories (`AF-72`).
- [x] Wire counter-attack defense success rates to built fortresses, outposts, and pooled cartel resources (`AF-72`).
- [x] Write comprehensive integration tests verifying P2P peace treaty consensus and territory defense resolution (`AF-72`).

### Phase 66: Smuggler Syndicate Cartel Special Operations, Sabotage Covert Cells, and Territory Conquest Propaganda (Completed)
- [x] Add `ESTABLISH_COVERT_CELL` and `BROADCAST_PROPAGANDA` decentralized actions (`AF-73`).
- [x] Implement periodic special operations ticking inside `tickEconomy`, triggering cell-based sabotage events (e.g. disabling local outposts or decreasing local enforcer presence) (`AF-73`).
- [x] Wire covert cell presence and propaganda levels to modify faction siege triggers, enforcer pursuit speeds, and trade tax rates (`AF-73`).
- [x] Write comprehensive integration tests verifying covert cell actions and strategic propaganda modifiers (`AF-73`).

### Phase 67: Cartel Saboteurs, Counter-Intelligence Sweeps, and Global Propaganda Networks (Completed)
- [x] Add `RECRUIT_SABOTEUR` and `LAUNCH_COUNTER_INTEL_SWEEP` decentralized actions (`AF-74`).
- [x] Implement periodic saboteur sabotage ticks inside `tickEconomy`, automatically locating and disabling rival outposts or deflecting sweeps (`AF-74`).
- [x] Wire global propaganda networks to scale cartel transaction price adjustments across all allied faction territories (`AF-74`).
- [x] Write comprehensive integration tests verifying saboteur actions, counter-intel sweeps, and global price adjustments (`AF-74`).

---

### Phase 68: Smuggler Syndicate Cartel Elite Enforcers, Regional Counter-Sabotage Operations, and Automated Cartel Bounty Hunting (Completed)
- [x] Add `RECRUIT_ELITE_ENFORCER` and `LAUNCH_COUNTER_SABOTAGE` decentralized actions (`AF-75`).
- [x] Implement periodic elite enforcer combat patrol ticks inside `tickEconomy`, automatically intercepting enforcer raids/sweeps or executing rival syndicate turf guards (`AF-75`).
- [x] Wire global bounty hunting networks to automatically track and target high-reputation player or NPC agents carrying contraband (`AF-75`).
- [x] Write comprehensive Vitest integration tests (`AF-75`).

---

### Phase 69: Smuggler Syndicate Cartel Legendary Hitmen, Regional Counter-Bounty Operations, and Automated Cartel Hit Networks (Completed)
- [x] Add `HIRE_LEGENDARY_HITMAN` and `LAUNCH_DECOY_CONVOY` decentralized actions (`AF-76`).
- [x] Implement hitmen combat ticking inside `tickEconomy` to track and preemptively ambush active enforcer bounty hunters (`AF-76`).
- [x] Support dynamic bribe thresholds and counter-intelligence decoy routes to automatically divert enforcer raids away from syndicate front businesses (`AF-76`).
- [x] Write comprehensive Vitest integration tests verifying hitmen ambushes, counter-bounties, decoy convoy route progression, enforcer distraction, and raid/sweep diversion (`AF-76`).

### Phase 70: Smuggler Syndicate Cartel Mastermind Contracts, Global Contraband Payout Arbitrage, and Dynamic Enforcer Agency Defunding (Completed)
- [x] Add `LAUNCH_MASTERMIND_CONTRACT` and `PROPOSE_ENFORCER_DEFUNDING` decentralized actions (`AF-77`).
- [x] Implement mastermind contract progression ticks inside `tickEconomy` to calculate and distribute global contraband arbitrage payouts (`AF-77`).
- [x] Wire enforcer defunding votes to automatically reduce enforcer hunt trigger thresholds and lower enforcer agency HP/attack stats dynamically during sweeps (`AF-77`).
- [x] Write comprehensive Vitest integration tests (`AF-77`).

### Phase 71: Smuggler Syndicate Cartel Shadow Markets, Cross-Territory Arbitrage Contracts, and Strategic Enforcer Underwriter Sabotage (Completed)
- [x] Add `ESTABLISH_SHADOW_MARKET`, `LAUNCH_ARBITRAGE_CONTRACT`, and `SABOTAGE_UNDERWRITER` decentralized actions (`AF-78`).
- [x] Implement Shadow Market trade ticks inside `tickEconomy` that automatically bypass all regional tolls/tariffs and buy/sell contraband at fixed premium cartels spreads (`AF-78`).
- [x] Wire Underwriter Sabotage to disable active regulatory sweeps/audits enforcer defense policies dynamically (`AF-78`).
- [x] Write comprehensive Vitest integration tests (`AF-78`).

### Phase 72: Smuggler Syndicate Cartel Black Ops Safehouses, Cross-Faction Shadow Alliances, and Enforcer Infiltration Sweeps (Completed)
- [x] Add `ESTABLISH_BLACK_OPS_SAFEHOUSE`, `PROPOSE_SHADOW_ALLIANCE`, and `INFILTRATE_ENFORCER_SWEEP` decentralized actions (`AF-79`).
- [x] Implement Black Ops Safehouse ticking inside `tickEconomy` that automatically recruits elite guards and deflections (`AF-79`).
- [x] Wire shadow alliances to double-tax hostile faction regions while waiving taxes in allied shadow territories (`AF-79`).
- [x] Write comprehensive Vitest integration tests (`AF-79`).

### Phase 75: Counterfeit Currency, Dynamic Exchange Rates, and Audit Mitigation (Completed)
- [x] Add `MINT_COUNTERFEIT_GOLD`, `TRADE_EXCHANGE_RATE`, and `ESTABLISH_AUDIT_MITIGATION` decentralized actions (`AF-82`).
- [x] Implement currency valuation and heat-based exchange rate equations in trade transactions (`AF-82`).
- [x] Wire audit mitigation to lower failed audit confiscation rates (`AF-82`).
- [x] Write comprehensive Vitest integration tests asserting all counterfeit and audit mitigation features (`AF-82`).

### Phase 77: Smuggler Syndicate Cartel Underground Railroads, Contraband Tunnels, and Automated Tunnel Transport (Completed)
- [x] Add `CONSTRUCT_CONTRABAND_TUNNEL`, `ESTABLISH_TUNNEL_TOLL`, and `DEPLOY_TUNNEL_DRONE` decentralized actions (`AF-84`).
- [x] Implement contraband tunnel movement safe paths that completely bypass surface border checkpoints, faction taxes/tolls, extortion tolls, and enforcer sweeps (`AF-84`).
- [x] Wire tunnel maintenance costs to deduct gold from the syndicate war chest and custom tolls to charge non-members (`AF-84`).
- [x] Deploy automated Tunnel Transport Drones that generate passive contraband smuggling profits for the owning syndicate (`AF-84`).
- [x] Write comprehensive Vitest integration tests for all railroad features (`AF-84`).

- [x] Add `UPGRADE_SAFEHOUSE_STORAGE`, `ESTABLISH_STORAGE_RENT`, and `VOTE_STORAGE_RENT_RATE` decentralized actions (`AF-85`).
- [x] Implement dynamic safehouse contraband storage capacity scaling based on upgrades and dynamic regional supply limits (`AF-85`).
- [x] Wire storage rent charges and voting arbitrations to distribute rent profits to the syndicate and penalize over-limit storage (`AF-85`).
- [x] Write comprehensive Vitest integration tests (`AF-85`).

- [x] Add `UPGRADE_BANK_VAULT`, `ESTABLISH_WITHDRAWAL_TARIFF`, and `VOTE_INTEREST_RATE` decentralized actions (`AF-86`).
- [x] Implement dynamic bank deposit capacities scaling based on upgrades and enforcer heat pressure (`AF-86`).
- [x] Wire interest rate payouts and consensus arbitrations to distribute passive income or charge non-members transaction fees (`AF-86`).
- [x] Write comprehensive Vitest integration tests (`AF-86`).
- [x] Add `BORROW_SYNDICATE_BANK`, `PAYBACK_SYNDICATE_BANK`, and `LIQUIDATE_COLLATERAL` decentralized actions (`AF-87`).
- [x] Implement dynamic borrowing capacities scaling based on dominance, standing, and collateral values (`AF-87`).
- [x] Wire periodic loan interest accruals and enforcer-led debt recovery sweeps on default inside economy ticks (`AF-87`).
- [x] Write comprehensive Vitest integration tests (`AF-87`).
- [x] Define deposit insurance states and agent credit rating scores in state schemas (`AF-88`).
- [x] Support `PURCHASE_DEPOSIT_INSURANCE` decentralized action decreasing sweep loss rates for insured members (`AF-88`).
- [x] Scale borrowing capacities by player credit rating score and broadcast debt default alerts across the Gossip mesh (`AF-88`).
- [x] Write comprehensive Vitest integration tests asserting insurance, ratings, and mesh convergence (`AF-88`).

### Phase 89: Smuggler Syndicate Cartel Bankruptcy Restructuring, Loan Refinancing, and Mesh-Wide Credit Recovery Gossip (Completed)
- [x] Add restructuring and refinancing proposal schemas inside state variables (`AF-89`).
- [x] Implement `PROPOSE_LOAN_REFINANCING` and `DECLARE_CARTEL_BANKRUPTCY` decentralized consensus actions (`AF-89`).
- [x] Wire dynamic credit recovery steps to gradually restore credit rating scores over step ticks and sync recovery states across the Gossip mesh (`AF-89`).
- [x] Write comprehensive Vitest integration tests asserting refinancing consensus, bankruptcy restructuring, credit rating recovery, and gossip mesh convergence (`AF-89`).

### Phase 90: Smuggler Syndicate Cartel Debt Settlement and Automated Collateral Release (Completed)
- [x] Add debt settlement schemas to state variables (`AF-90`).
- [x] Implement `PROPOSE_DEBT_SETTLEMENT` decentralized consensus action (`AF-90`).
- [x] Wire automated collateral release logic when a settlement is agreed and paid (`AF-90`).
- [x] Write comprehensive Vitest integration tests asserting consensus, automatic payment, default alert clearing, credit rating recovery, and Gossip mesh convergence (`AF-90`).

### Phase 91: Smuggler Syndicate Cartel Joint-Liability Loan Groups & Collective Collateral Pledges (Completed)
- [x] Add joint-liability loan group schemas to state variables (`AF-91`).
- [x] Implement `PROPOSE_JOINT_LOAN` decentralized consensus action with multi-agent approvals (`AF-91`).
- [x] Wire dynamic collective limit calculations (with a 1.2x group bonus) and proportional gold distribution and payback repayment liability (`AF-91`).
- [x] Implement automated collective default enforcer sweeps, credit rating drops, default alert broadcasts, and complete collateral liquidations in economy ticks (`AF-91`).
- [x] Integrate LWW Gossip mesh state reconciliation and sync replication (`AF-91`).
- [x] Write comprehensive Vitest integration tests asserting limit calculations, approvals, consensual funding, proportional payback/default, and Gossip mesh convergence (`AF-91`).

### Phase 92: Joint-Liability Loan Group Refinancing and Collective Debt Restructuring (Completed)
- [x] Add joint loan refinancing/restructuring proposal schemas (`AF-92`).
- [x] Implement `PROPOSE_JOINT_REFINANCING` decentralized consensus action (`AF-92`).
- [x] Wire restructured due dates and consensual rate modifications to active joint loans (`AF-92`).
- [x] Write comprehensive Vitest integration tests and merge support (`AF-92`).

### Phase 93: Joint-Liability Loan Collateral Substitution and Pro-Rata Collateral Releases (Completed)
- [x] Add schemas for joint loan collateral substitution proposals/votes in state variables (`AF-93`).
- [x] Implement `PROPOSE_COLLATERAL_SUBSTITUTION` decentralized action reducer with group and bank majority approval consensus (`AF-93`).
- [x] Wire pro-rata collateral release on partial loan paybacks when remaining balance is fully covered by remaining collateral (`AF-93`).
- [x] Write comprehensive Vitest integration tests asserting consensus, substitution, pro-rata release, and Gossip mesh convergence (`AF-93`).

### Phase 94: Syndicate Bank Loan Restructuring Proposals with Asset Swaps (Completed)
- [x] Define schemas for individual loan collateral swap proposals (`individualLoanCollateralSwapVotes` in GameState) (`AF-94`).
- [x] Implement `SWAP_INDIVIDUAL_COLLATERAL` action reducer and bank majority consensus reconciliation (`AF-94`).
- [x] Integrate with Gossip LWW merging and convergence (`AF-94`).
- [x] Write comprehensive integration tests asserting validations, consensus voting, and Gossip mesh convergence (`AF-94`).

### Phase 95: Syndicate Bank Joint-Liability Loan Debt Settlement Proposals (Completed)
- [x] Define schemas for joint-liability loan group debt settlement proposals (`jointLoanDebtSettlementVotes` in GameState) (`AF-95`).
- [x] Implement `PROPOSE_JOINT_DEBT_SETTLEMENT` action reducer and joint/bank double-majority voting consensus (`AF-95`).
- [x] Integrate with Gossip LWW merging and convergence (`AF-95`).
- [x] Write comprehensive integration and convergence tests (`AF-95`).

### Phase 96: Syndicate Bank Joint-Liability Loan Collateral Swap Proposals (Completed)
- [x] Define schemas for joint-liability loan group collateral swap proposals (`jointLoanCollateralSwapVotes` in GameState) (`AF-96`).
- [x] Implement `SWAP_JOINT_COLLATERAL` action reducer and joint/bank double-majority voting consensus (`AF-96`).
- [x] Integrate with Gossip LWW merging and convergence (`AF-96`).
- [x] Write comprehensive integration and convergence tests (`AF-96`).

### Phase 97: Syndicate Bank Joint-Liability Loan Default Grace Periods and Settlement Arbitration (Completed)
- [x] Define schemas for joint-liability loan group grace period proposals (`jointLoanGracePeriodVotes` in GameState) (`AF-97`).
- [x] Implement `PROPOSE_JOINT_LOAN_GRACE_PERIOD` action reducer and joint/bank double-majority consensus (`AF-97`).
- [x] Integrate with Gossip sync and state reconciliation (`AF-97`).
- [x] Write rigorous integration and convergence tests (`AF-97`).

---

### Phase 98: Syndicate Bank Joint-Liability Loan Refinancing and Penalty Waiver Arbitration (Completed)
- [x] Define schemas for joint-liability loan group penalty waiver proposals (`jointLoanPenaltyWaiverVotes` in GameState) (`AF-98`).
- [x] Implement `PROPOSE_JOINT_LOAN_PENALTY_WAIVER` action reducer and joint/bank double-majority consensus (`AF-98`).
- [x] Integrate with Gossip sync and state reconciliation (`AF-98`).
- [x] Write rigorous integration and convergence tests (`AF-98`).

### Phase 99: Syndicate Bank Joint-Liability Loan Credit Underwriting and Risk Premium Pricing (Completed)
- [x] Define schemas for joint-liability loan credit underwriting proposals (`jointLoanUnderwrites`, `jointLoanUnderwriteVotes`, `groupDefaults` in GameState) (`AF-99`).
- [x] Implement `PROPOSE_JOINT_LOAN_CREDIT_UNDERWRITE` action reducer and joint/bank double-majority consensus (`AF-99`).
- [x] Integrate underwritten terms to dynamically adjust base interest rates during economic ticks and collateral requirements during loan proposals (`AF-99`).
- [x] Track group default history to levy risk premiums and collateral multipliers on future loans (`AF-99`).
- [x] Integrate with Gossip synchronization and state reconciliation convergence (`AF-99`).
- [x] Write comprehensive unit and integration tests verifying consensus, underwriting pricing, dynamic interest, defaults tracking, and mesh convergence (`AF-99`).

### Phase 78: Syndicate Bank Joint-Liability Loan Insurance Pools & Risk Diversification (Completed)
- [x] Define schemas for joint loan insurance pools and agent premium policies in GameState (`AF-100`).
- [x] Implement `ESTABLISH_JOINT_LOAN_INSURANCE_POOL` and `PURCHASE_JOINT_LOAN_INSURANCE` actions and reducers (`AF-100`).
- [x] Integrate insurance payouts during enforcer defaults ticking in `tickEconomy` to mitigate collateral liquidations and spare default penalties for fully insured members (`AF-100`).
- [x] Write comprehensive integration and gossip mesh convergence tests (`AF-100`).

### Phase 79: Syndicate Bank Joint-Liability Loan Insurance Pool Reinsurance Mesh & Liquidity Sharing (Completed)
- [x] Define schemas for cross-syndicate reinsurance contracts and liquidity balances in GameState (`AF-101`).
- [x] Implement `PROPOSE_REINSURANCE_POOL` and `TRANSFER_REINSURANCE_LIQUIDITY` decentralized actions and voting (`AF-101`).
- [x] Wire dynamic fallback liquidity sourcing during enforcer default sweeps when a primary insurance pool is depleted (`AF-101`).
- [x] Write comprehensive integration and Gossip mesh convergence tests (`AF-101`).

---

### Phase 80: Reinsurance Dynamic Pricing & Contagion Shielding (Completed)
- [x] Define schemas for dynamic reinsurance pricing multipliers and contagion shield states in GameState (`AF-102`).
- [x] Implement `PROPOSE_CONTAGION_SHIELD` decentralized voting action and consensus (`AF-102`).
- [x] Integrate dynamic premium scaling and contagion check triggers in `tickEconomy` during fallback borrowing sweeps (`AF-102`).
- [x] Write robust unit, integration, and P2P mesh convergence tests (`AF-102`).

### Phase 81: Syndicate Bank Reinsurance Subsidy & Secondary Collateral Pools (Completed)
- [x] Define schemas for interest rate subsidies and secondary reinsurance collateral in GameState (`AF-103`).
- [x] Implement `PROPOSE_INTEREST_SUBSIDY` and `PLEDGE_REINSURANCE_COLLATERAL` decentralized consensus voting actions (`AF-103`).
- [x] Wire subsidized rate deductions to interest accrual steps and collateral claim resolution inside `tickEconomy` (`AF-103`).
- [x] Write robust unit, integration, and P2P mesh convergence tests (`AF-103`).

### Phase 82: Reinsurance Risk Ratings & Liquidity Audits (Completed)
- [x] Define schemas for reinsurance risk ratings and liquidity audits in GameState (`AF-104`).
- [x] Implement `PROPOSE_RISK_RATING` and `REQUEST_LIQUIDITY_AUDIT` decentralized consensus actions (`AF-104`).
- [x] Wire dynamic premium multipliers based on historical defaults and audit states inside `tickEconomy` (`AF-104`).
- [x] Write comprehensive unit and integration tests verifying all features (`AF-104`).

### Phase 83: Syndicate Bank Reinsurance Automated Liquidity Pool Bailouts & Secondary Reserve Ratios (Completed)
- [x] Define schemas for secondary reserves, reserve ratios, and automated bailouts in GameState (`AF-105`).
- [x] Implement `ADJUST_RESERVE_RATIO` and `EXECUTE_AUTOMATED_BAILOUT` decentralized actions (`AF-105`).
- [x] Wire secondary reserve deductions, ratio compliance checks, and automated bailout triggers inside `tickEconomy` fallback borrowing loops (`AF-105`).
- [x] Write comprehensive unit, integration, and P2P mesh convergence tests (`AF-105`).

### Phase 84: Syndicate Bank Secondary Reserve Yield-Bearing Vaults & Liquidity Investment Pools (Completed)
- [x] Define schemas for yield-bearing investment vaults, interest accruals, and risk profiles in GameState (`AF-106`).
- [x] Implement `INVEST_SECONDARY_RESERVE` and `WITHDRAW_SECONDARY_RESERVE` decentralized consensus actions (`AF-106`).
- [x] Wire periodic passive interest calculations and enforcer sweep yield liquidations inside `tickEconomy` ticks (`AF-106`).
- [x] Write comprehensive unit and P2P gossip mesh convergence tests (`AF-106`).

### Phase 85: Syndicate Bank Collateralized Debt Obligations (CDOs) & Secondary Liquidity Markets (Completed)
- [x] Define state schemas for Collateralized Debt Obligations (CDOs) and tranche ownership stakes in GameState (`AF-107`).
- [x] Implement `PACKAGE_LOAN_CDO` and `TRADE_CDO_TRANCHE` decentralized actions (`AF-107`).
- [x] Wire periodic tranche interest distributions and pro-rata default sweep write-downs inside `tickEconomy` (`AF-107`).
- [x] Write comprehensive P2P gossip mesh convergence and default liquidation tests (`AF-107`).

---

### Phase 86: CDO Credit Default Swaps (CDS) & Synthetic Leverage (Completed)
- [x] Define state schemas for Credit Default Swaps (CDS) and credit default swap votes in GameState (`AF-108`).
- [x] Implement `BUY_CREDIT_DEFAULT_SWAP` and `WRITE_CREDIT_DEFAULT_SWAP` decentralized consensus actions (`AF-108`).
- [x] Wire periodic premium deductions and automatic settlement resolution during `tickEconomy` defaults (`AF-108`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-108`).

---

### Phase 88: CDO & CDS Margin Accounts & Leverage Collateral Call Triggers (Completed)
- [x] Define margin account schemas, initial margins, and maintenance threshold variables in GameState (`AF-110`).
- [x] Implement `OPEN_CDS_MARGIN_ACCOUNT` and `DEPOSIT_MARGIN_COLLATERAL` decentralized consensus actions (`AF-110`).
- [x] Wire automatic margin health evaluation and collateral call liquidations inside `tickEconomy` (`AF-110`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-110`).

---

### Phase 89: Syndicate Bank Margin Account Collateral Rehypothecation & Multi-Vault Yield Aggregators (Completed)
- [x] Define rehypothecation authorization schemas and percentage variables in GameState (`AF-111`).
- [x] Implement `AUTHORIZE_MARGIN_REHYPOTHECATION` and `REVOKE_MARGIN_REHYPOTHECATION` decentralized consensus actions (`AF-111`).
- [x] Wire periodic rehypothecation sweeps to secondary vaults and yield accrual redistribution back to margin collateral inside `tickEconomy` (`AF-111`).
- [x] Adjust margin maintenance requirements based on rehypothecated amounts and vault risks (`AF-111`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-111`).

### Phase 90: Syndicate Bank Automated Rehypothecation Vault Rebalancing & Dynamic Liquidity Buffer Pools (Completed)
- [x] Define rebalancing policies and multi-vault targets in GameState schemas (`AF-112`).
- [x] Implement `SET_MARGIN_REBALANCING_POLICY` and `REBALANCE_MARGIN_COLLATERAL` decentralized consensus actions (`AF-112`).
- [x] Wire dynamic rebalancing and preemptive drawdown execution loops inside `tickEconomy` before margin calls trigger (`AF-112`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-112`).

---

### Phase 91: Syndicate Bank Multi-Vault Dynamic Yield-Risk Optimization & Automated Rebalancing Advisors (Completed)
- [x] Define rebalancing advisor structures and safety thresholds in GameState schemas (`AF-113`).
- [x] Implement `DEPLOY_REBALANCING_ADVISOR` and `SET_ADVISOR_SAFETY_THRESHOLD` decentralized consensus actions (`AF-113`).
- [x] Wire dynamic advisor-led reallocation suggestions and target updates inside `tickEconomy` before rebalancing ticks (`AF-113`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-113`).

---

### Phase 92: Syndicate Bank Leverage Liquidity Mining Incentives & Yield Boosting Campaigns (Completed)
- [x] Define locked liquidity epoch pools and yield boost multiplier schemas in GameState (`AF-114`).
- [x] Implement `LOCK_REHYPOTHECATED_COLLATERAL` and `CLAIM_LIQUIDITY_MINING_REWARDS` consensus actions (`AF-114`).
- [x] Wire passive yield boost scaling and reputation accrual inside `tickEconomy` under rehypothecation ticks (`AF-114`).
- [x] Write comprehensive Vitest integration and P2P mesh convergence tests (`AF-114`).

---


### Phase 93: Syndicate Bank Leverage Liquidity Mining Governance & Faction Sponsoring Votes (Completed)
- [x] Define faction sponsoring proposals and voting state schemas in GameState (`AF-115`).
- [x] Implement `PROPOSE_FACTION_SPONSOR` and `VOTE_FACTION_SPONSOR` decentralized actions (`AF-115`).
- [x] Wire majority-consensus faction sponsoring resolution and reward adjustments inside tickEconomy (`AF-115`).
- [x] Write comprehensive Vitest integration and P2P mesh convergence tests (`AF-115`).

### Phase 94: Syndicate Bank Leverage Liquidity Mining Governance Epoch Audits & Faction Sponsor Revocations (Completed)
- [x] Define audit and revocation proposals and states in GameState (`AF-116`).
- [x] Implement `PROPOSE_SPONSOR_AUDIT` and `PROPOSE_SPONSOR_REVOCATION` decentralized consensus actions (`AF-116`).
- [x] Wire periodic epoch audit checking, sponsor reserve verification, and automatic revocation/rate penalty reductions inside tickEconomy (`AF-116`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-116`).

### Phase 95: Syndicate Bank Leverage Liquidity Mining Governance Reward Slashing & Faction Sponsoring Penalties under Malicious Mesh Routing (Completed)
- [x] Define slashing proposals, malicious actor lists, and slashing rates in GameState (`AF-117`).
- [x] Implement `PROPOSE_REWARD_SLASH` and `VOTE_REWARD_SLASH` decentralized consensus actions (`AF-117`).
- [x] Wire reward slashing to dynamic liquidity mining reward claims inside `reconcileClaimLiquidityRewards`, reducing payouts by consensual slashing rate if target syndicate or members are flagged as malicious (`AF-117`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-117`).

### Phase 96: Syndicate Bank Reputation Rehab Campaigns & Slashing Recovery (Completed)
- [x] Define rehabilitation proposals and gold costs in GameState (`AF-118`).
- [x] Implement `PROPOSE_REHAB_CAMPAIGN` and `VOTE_REHAB_CAMPAIGN` decentralized actions (`AF-118`).
- [x] Wire successful rehabilitation consensus to remove target actors from `maliciousActors` list, clear slashing rates, and restore standard reward payouts (`AF-118`).
- [x] Write comprehensive Vitest integration, unit, and P2P gossip mesh convergence tests (`AF-118`).

### Phase 97: Syndicate Bank Leverage Liquidity Mining Governance Pro-Rata Rehab Subsidies & Faction Loyalty Bonds (Completed)
- [x] Define pro-rata rehab subsidy proposals and faction loyalty bonds in GameState (`AF-119`).
- [x] Implement `PROPOSE_REHAB_SUBSIDY` and `LOCK_LOYALTY_BOND` decentralized consensus actions (`AF-119`).
- [x] Wire successful subsidy consensus to dynamically reduce gold deduction during `reconcileRehabCampaign` based on standing, pulling the subsidized share from the faction reserve pool (`AF-119`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-119`).

### Phase 98: Syndicate Bank Multi-Tiered Dynamic Faction Loyalty Ranks & Standing-Gated Vault Access (Completed)
- [x] Define structured multi-tiered faction loyalty ranks (Bronze, Silver, Gold, Platinum) and vault thresholds in state (`AF-120`).
- [x] Implement `CLAIM_LOYALTY_RANK` and `VOTE_LOYALTY_RANK` decentralized consensus actions (`AF-120`).
- [x] Wire reached loyalty ranks to restrict access to premium bank vaults for borrowing, depositing, and withdrawing (`AF-120`).
- [x] Implement dynamic interest rate discounts (Bronze: 1%, Silver: 2%, Gold: 3%, Platinum: 5%) for individual and joint bank loans (`AF-120`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-120`).
### Phase 99: Faction-Sponsored CDO Insurance & Mining Boosters (Completed)
- [x] Define faction-sponsored loyalty-based CDO insurance pools and mining boosters in state (`AF-121`).
- [x] Implement decentralized consensus actions to establish cooperative yield campaigns and sponsor loyalties (`AF-121`).
- [x] Wire dynamic loyalty ranks to boost CDO interest yields and mitigate default collateral liquidations (`AF-121`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-121`).

### Phase 100: Multi-Faction Loyalty CDO Risk Ratings & Reinsurance Arbitration (Completed)
- [x] Define multi-faction loyalty-based CDO risk ratings in state (`AF-122`).
- [x] Implement decentralized actions to adjust risk rating policies (`AF-122`).
- [x] Wire loyalty ranks to automate reinsurance payouts and audit collections (`AF-122`).
- [x] Write comprehensive integration and convergence tests (`AF-122`).
### Phase 101: Syndicate Bank Sovereign Debt Issuance, Faction Reserve Bond Sales & Automatic Debt Monetization Ticks (Completed)
- [x] Define sovereign debt, faction bonds, and monetization schemas in state (`AF-123`).
- [x] Implement decentralized consensus actions to issue and trade bonds (`AF-123`).
- [x] Wire automatic bond amortization, yield payouts, and defaults to economy ticks (`AF-123`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-123`).

### Phase 102: Syndicate Sovereign Debt Restructuring & Cooperative Faction Bailouts (Completed)
- [x] Define sovereign debt restructuring proposals and bailout consensus schemas in state (`AF-124`).
- [x] Implement decentralized consensus actions to restructure bonds or request faction-sponsored debt bailouts (`AF-124`).
- [x] Wire successful restructuring to adjust remaining bond parameters, and bailouts to cover payments using faction reserve funds (`AF-124`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-124`).

### Phase 103: Syndicate Secondary Reserve Automated Sweeps & Dynamic Tariff Liquidation (Completed)
- [x] Define secondary reserve sweep and liquidation schemas in state (`AF-125`).
- [x] Implement decentralized actions to authorize, adjust, or contest sweep margins (`AF-125`).
- [x] Wire dynamic tick monetization to auto-sweep and liquidate assets when standing or chests drop below thresholds (`AF-125`).
- [x] Write comprehensive Vitest integration and mesh convergence tests (`AF-125`).

### Phase 105: Syndicate Decentralized Liquidity Bridge & Dynamic Cross-Mesh Borrowing (Completed)
- [x] Define cross-mesh liquidity bridging and borrowing state schemas in GameState (`AF-127`).
- [x] Implement decentralized consensus actions to propose inter-syndicate loans and authorize cross-mesh transfers (`AF-127`).
- [x] Wire dynamic tick economy logic to compute bridge loan interest and automatic reserve repayments (`AF-127`).
- [x] Write comprehensive integration and mesh convergence tests (`AF-127`).

### Phase 106: Syndicate Sovereign Wealth Fund & Faction-Wide Joint-Ventures (Completed)
- [x] Define cooperative sovereign wealth funds and joint-venture portfolio schemas in GameState (`AF-128`).
- [x] Implement decentralized consensus actions to propose investment allocations and authorize reserve pooling (`AF-128`).
- [x] Wire dynamic tick economy logic to calculate joint-venture yields and automate fractional dividend payouts (`AF-128`).
- [x] Write comprehensive integration and P2P mesh convergence tests (`AF-128`).

### Phase 107: Syndicate Sovereign Wealth Fund Yield-Optimizing Portfolio Swaps & Consent-Gated Liquidations (Completed)
- [x] Define portfolio swap and asset liquidation proposal schemas in GameState (`AF-129`).
- [x] Implement decentralized actions to propose asset swaps and vote on cooperative liquidations (`AF-129`).
- [x] Wire dynamic tick economy logic to reconcile and resolve active portfolio swap transactions and process liquidity distributions (`AF-129`).
- [x] Write comprehensive integration and mesh convergence tests (`AF-129`).

---

### Phase 108: SWF Yield Derivative Tokens & Multi-Fund Risk Pooling (Completed)
- [x] Define SWF yield derivative token and risk pool schemas in GameState (`AF-130`).
- [x] Implement decentralized actions to mint yield tokens, trade yield derivatives, and vote on multi-fund risk pool participation (`AF-130`).
- [x] Wire dynamic tick economy logic to calculate and auto-distribute derivative yield dividends to token holders and handle automated risk pool bails (`AF-130`).
- [x] Write comprehensive integration and mesh convergence tests (`AF-130`).

---

## ⚡ Active Task for Next Cycle
**Task ID**: `AF-131`
* **Objective**: Syndicate Sovereign Wealth Fund Yield Derivative CDOs & Tranche Secondary Markets.
* **Why this matters**: Introduce tranche-based yield derivative CDOs (`SWFYieldCDO`) for pooled SWF yield derivative tokens, enabling syndicates to pack diverse yield derivative tokens into structured CDOs, divide them into Senior, Mezzanine, and Equity tranches with custom yield allocations, default waterfall rules, and decentralized secondary trading consensus-arbitrated over the mesh.
* **Planned Actions**:
  1. Define SWF yield CDO and tranche schemas in GameState.
  2. Implement decentralized actions to package yield tokens into CDOs, trade yield CDO tranches, and vote on CDO packaging.
  3. Wire dynamic tick economy logic to calculate and auto-distribute tranche yield dividends based on the default waterfall rules.
  4. Write comprehensive integration and mesh convergence tests.

---


## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :---: | :--- |
| **State-space explosion during pathfinding** | High | Cap the maximum depth/steps of the state explorer and focus validation on critical gate variables and room reachability. Exclude `DROP` actions to keep puzzle path traversal clean. |
| **Timeout during playtest** | High | Keep playtest path lengths bounded (e.g. max 35 steps) and use negative filter checks. |
| **Nondeterminism in engine** | High | Standardized JSON serialization sorting keys before hashing. Property test action sequences to assert identical hashes. |
| **Infinite debugging loops** | Medium | Limit autonomous cycle runs to a single task per CLI session, preventing internal loops. |


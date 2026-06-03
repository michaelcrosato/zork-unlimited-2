# 🗺️ AdventureForge: AFK Development Roadmap

This roadmap lists the prioritized backlog of engineering, debugging, and narrative design tasks to continuously elevate the quality and depth of AdventureForge.

---

## 📋 Prioritized Backlog

### 1. 🛑 [CRITICAL BUGS]
*   *(None)* — The baseline Vitest suite (59/59 tests) and Autopilot validator are currently 100% green.

### 2. 📖 [NARRATIVE/PROMPT TWEAKS]
*   **Task-N1**: **Atmospheric Sensory Narratives** (Completed)
    *   *Description*: Enhance the game's observation narration to dynamically inject atmospheric/sensory flavor text based on the room's environment, state flags, and step count. [x] Done.

### 3. 🚀 [NEW FEATURES]
*   **Task-F1**: **Stage 2 Procedural Dungeons & Dynamic Content Hooks** (Completed)
    *   *Description*: Implement a new state effect `generate_procedural_room` inside the core transition reducer to generate dynamic room expansions on demand. Build a new test pack `content/parser/pack/unlimited_forest.yaml` utilizing this template. [x] Done.
*   **Task-F2**: **Subprocess MCP Playtesting Harness (`src/bin/mcp-playtest.ts`)** (Completed)
    *   *Description*: Write an automated script that programmatically launches the MCP server on stdio transport, executes a play session on `unlimited_forest.yaml` using a variety of logical and chaotic edge-case inputs, asserts state coherence, and terminates cleanly. [x] Done.
*   **Task-F3**: **Procedural Merchant & Inventory Trading Systems** (Completed)
    *   *Description*: Add an `NPC_TRADE` interaction effect and custom game state variables (`gold`, etc.) to support procedurally stocking merchant items, allowing dynamic buying/selling mechanics completely driven by the parser state engine. [x] Done.
*   **Task-F4**: **Procedural Weather & Real-Time Environmental Effects**
    *   *Description*: Add an environmental engine that ticks dynamic weather patterns (e.g. rain, fog, storms) based on steps and room locations, altering sensory observations and modifying room traversal conditions dynamically (e.g. climbing slick rocks is locked when raining unless wearing boots).



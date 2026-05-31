# AdventureForge — BUILD SPEC: AI-Authored, Deterministic Text-Adventure Engine

**Project name:** AdventureForge
**Document type:** Complete build specification + agent brief (single self-contained file).
**Intended reader:** A frontier coding agent (for example Claude Code, OpenAI Codex, Gemini agent tooling, GitHub Copilot coding agent, or equivalent) plus its human supervisor.
**Compiled:** 2026-05-31.
**Goal of the project:** Prove, end to end, that an AI can author a text adventure, compile it into a schema-valid game, run it on a deterministic headless engine, play it through a structured action API, test it, record its experience, find design/logic flaws, fix them, and lock the fix with a regression test.
**Instruction to the coding agent:** Read top to bottom, then build. Start at Stage 0, then Stage 1 (CYOA). Hold the line on determinism, strict schemas, full validation, and a headless core at every stage. Do not advance a stage until its acceptance criteria pass in CI.

**Verification note:** Capability/tooling details were rechecked on 2026-05-31. Use the architecture and acceptance criteria as stable instructions. Treat model names, prices, benchmark rankings, context limits, and vendor-specific features as configuration-time details that must be verified against official provider docs before use.

---

## 0. HOW TO USE THIS DOCUMENT

You are building a real software project from scratch. Treat this file as the source of truth for *what* to build and *in what order*. You decide the low-level implementation details, but you must honor:

1. **The architecture in §3** (the LLM is never the game engine).
2. **The data schemas in §7** (single source of truth for content).
3. **The determinism contract in §8.5**.
4. **The acceptance criteria** at the end of each stage in §13. Do not advance to the next stage until the current stage's criteria pass in CI.

Working rules for the build:

- **Typed everywhere. Tests mandatory.** No stage is "done" until its tests are green.
- **Build the smallest strict thing first.** A small engine the AI fully understands but cannot corrupt beats a large permissive one.
- **Mechanics live in deterministic code. Content lives in validated, AI-generated data.** Never blur this line.
- **Every generated content pack must pass the validator before it is playable.** Validation failure is a hard error, not a warning.
- **Every bug becomes a replayable artifact and a regression test.** (See §15.)
- Commit in small, reviewable increments. Each commit should leave the repo in a green state.

If a requirement here is ambiguous, prefer the interpretation that makes the engine *stricter* and the content *more validated*.

---

## 1. PROJECT THESIS

The proof path, in increasing order of mechanical complexity, is:

```
Choose-Your-Own-Adventure (CYOA)
  → Zork-style parser adventure (controlled verb/object model)
    → Sierra-Quest-style adventure (inventory + puzzles + score)
      → Hero's-Quest-style RPG/adventure hybrid (stats, skills, combat-lite)
        → graphical / web UI, and later a 3D renderer
```

The engine stays **headless and structured the entire time.** UI is the *last* concern, bolted onto a stable structured core. Stages 1 and 2 (CYOA, then Zork-style) are the minimum viable proof and the focus of this spec. Stages 3+ are specified at lower resolution because they reuse the same core.

**The order is deliberate:** story first → mechanics second → schema adaptation third → engine validation fourth → AI playtesting fifth → human UI last.

---

## 2. WHY THIS DESIGN (evidence base)

This architecture is intentionally conservative. Current frontier AI tools are strong enough to help build, test, and iterate the project, but they are not reliable enough to serve as the live rule engine or to remove deterministic tests, validation, replay, and human review gates.

**(a) The builder is capable, but not infallible.** Current public sources support using frontier coding agents for this class of typed, test-backed, repo-scale build:

- OpenAI describes GPT-5.5 as its strongest agentic coding model to date, with strong results on terminal/CLI workflows and issue-resolution benchmarks, and positions Codex for implementation, refactoring, debugging, testing, and validation.
  Source: https://openai.com/index/introducing-gpt-5-5/
- Anthropic describes Claude Opus 4.8 as an upgrade for Claude Code, with effort controls, dynamic workflows for large-scale Claude Code tasks, and evaluations indicating fewer unnoticed code flaws than its predecessor.
  Source: https://www.anthropic.com/news/claude-opus-4-8
- Google describes Gemini 3.5 Flash as generally available for scaled production use, optimized for agentic execution, coding, long-horizon workflows, tool use, 1M input context, and up to 65k output tokens.
  Source: https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5
- GitHub describes Copilot cloud agent as able to research a repository, create a plan, make code changes on a branch, and optionally open a pull request from a GitHub Actions-powered environment.
  Source: https://docs.github.com/copilot/concepts/agents/coding-agent/about-coding-agent

Do not hard-code benchmark rankings, prices, or model IDs into the project. Put provider/model configuration behind environment variables and verify current vendor docs before wiring live LLM calls. Normal CI must use deterministic mock agents.

**(b) The model must not be the engine.** Research on LLMs operating inside interactive environments converges on a practical conclusion: LLMs are useful content generators, planners, and playtesters, but mechanics must be enforced by deterministic code.

- **RPGBench** (arXiv 2502.00595, 2025) evaluates LLMs as text-based RPG engines across Game Creation and Game Simulation. It reports that state-of-the-art models can create engaging stories but often struggle to implement consistent, verifiable game mechanics in long or complex scenarios. Its structure—event-state representation plus objective validity checks—matches the architecture below.
  Source: https://arxiv.org/abs/2502.00595
- **TALES** (Text Adventure Learning Environment Suite, arXiv 2504.14128, 2025; Microsoft Research) evaluates synthetic and human-written text-adventure games and reports that even top LLM-driven agents perform poorly on games designed for human enjoyment. This supports structured state and legal actions rather than raw-parser guessing.
  Source: https://arxiv.org/abs/2504.14128
- **Jericho** shows why action-space control matters: template/legal-action generation makes interactive-fiction environments more tractable for agents by reducing the combinatorial command space.
  Source: https://www.microsoft.com/en-us/research/blog/by-making-text-based-games-more-accessible-to-rl-agents-jericho-framework-opens-up-exciting-natural-language-challenges/
- **TextWorld** is a sandbox for generating and simulating text games parameterized by map size, object count, quest length, complexity, and description richness.
  Source: https://textworld.readthedocs.io/en/1.5.4/notes/framework.html
- **TextQuests** uses classic Infocom-style games to test long-horizon, self-contained problem-solving. It reinforces the need to distinguish memorized classic-game behavior from genuine performance on fresh generated games.
  Source: https://arxiv.org/abs/2507.23701

**Net design rule:** keep mechanics in deterministic code that the AI cannot corrupt; let the AI generate content into a validated schema; expose to the AI only **structured state + legal actions + event logs + validation reports + replayable traces**, never a raw parser it must guess at.

---

## 3. CORE ARCHITECTURE — THREE LAYERS

```
┌──────────────────────────────────────────────────────────────┐
│ LAYER 1 — STORY (human/AI-readable narrative)                  │
│   chapters · scenes · characters · locations · themes · tone   │
│   canon · plot beats                                           │
│   → produced by the WRITER agent, drafted like prose           │
└──────────────────────────────────────────────────────────────┘
                         │  ADAPTER agent
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 2 — GAME DESIGN (structured, schema-valid content)       │
│   scenes/rooms · choices · items · puzzles · NPCs · dialogue   │
│   conditions · effects · flags · vars · quest stages · cutscenes│
│   → this is the "content pack" the engine consumes             │
└──────────────────────────────────────────────────────────────┘
                         │  COMPILER + VALIDATOR (deterministic code)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 3 — ENGINE (deterministic execution, headless)           │
│   state machine · action validator · event reducer · save/load │
│   trace record/replay · legal-action generator · test harness  │
│   content compiler · renderer API                              │
│   → pure code. No LLM in the loop. Same input ⇒ same output.   │
└──────────────────────────────────────────────────────────────┘
```

LLMs operate heavily in Layers 1 and 2. The engine **enforces** Layer 3. The boundary between Layer 2 (data) and Layer 3 (code) is the single most important invariant in the system.

---

## 4. RECOMMENDED TECH STACK

Pick **one** primary language and commit to it. Recommendation and rationale follow; a fully-supported alternative is documented so the supervisor can override.

### 4.1 Primary (recommended): TypeScript

Rationale: the arc terminates in a web/graphical UI, and a single language across engine + content tooling + UI removes an integration seam. Runtime schema validation (Zod) doubles as the content schema, giving one source of truth for "AI writes content → validator checks it."

| Concern | Choice |
|---|---|
| Language / runtime | TypeScript on Node.js 22+ (ESM) |
| Schema + runtime validation | **Zod** (schemas are the canonical content contract) |
| Unit tests | **Vitest** |
| Property-based tests | **fast-check** |
| Content format on disk | **YAML** (authoring) compiled to validated JSON (runtime) |
| CLI runner | a thin `bin/` entrypoint (commander or node `util.parseArgs`) |
| Determinism | seeded PRNG (e.g. a small xorshift/mulberry32), no `Math.random` in engine |
| Hashing (state hash) | stable canonical-JSON serialize → SHA-256 |
| LLM access | provider-agnostic adapter (see §12.7) |
| Web UI (Stage 5+) | React + Vite, talking only to the structured API |

### 4.2 Alternative: Python

Equivalently valid; preferable if you intend to benchmark against Jericho/TextWorld directly (mature Python IF tooling).

| Concern | Choice |
|---|---|
| Language | Python 3.12+ |
| Schema + validation | **Pydantic v2** |
| Unit tests | **pytest** |
| Property-based tests | **Hypothesis** |
| Content format | YAML → validated JSON |
| CLI runner | `argparse` / `typer` |
| Determinism | seeded `random.Random(seed)` instance; never the global RNG |
| Optional IF benchmarking | `jericho`, `textworld` (Linux, Python 3.12+, spaCy) |
| TUI (optional) | Textual |

**Everything in §5–§15 except this section is language-agnostic.** Schemas, interfaces, validation rules, agent roles, and acceptance criteria apply identically to both stacks.

---

## 5. REPOSITORY STRUCTURE

Target layout (TypeScript naming shown; mirror for Python):

```
/ (repo root)
├─ README.md                      # quickstart, how to run a game, how to validate
├─ AI_TEXT_ADVENTURE_BUILD_SPEC.md # this document
├─ package.json / pyproject.toml
├─ src/
│  ├─ core/
│  │  ├─ state.ts                  # GameState type + pure transitions
│  │  ├─ conditions.ts             # condition DSL evaluator (pure)
│  │  ├─ effects.ts                # effect reducer (pure)
│  │  ├─ events.ts                 # event types + event log
│  │  ├─ rng.ts                    # seeded PRNG (engine's only randomness source)
│  │  ├─ hash.ts                   # canonical serialize + state hash
│  │  └─ engine.ts                 # step(state, action) -> {state, events}
│  ├─ cyoa/                        # Stage 1 specifics
│  │  ├─ schema.ts                 # Scene/Choice schemas
│  │  └─ runner.ts                 # CYOA observation + step wiring
│  ├─ parser/                      # Stage 2 specifics
│  │  ├─ schema.ts                 # Room/Object/NPC/Dialogue schemas
│  │  ├─ legal_actions.ts          # legal-action generator
│  │  └─ command_map.ts            # controlled verb/object → structured action
│  ├─ api/
│  │  ├─ observation.ts            # build the AI-facing observation object
│  │  └─ types.ts                  # Observation / Action / StepResult types
│  ├─ validate/
│  │  ├─ cyoa_validator.ts
│  │  ├─ parser_validator.ts
│  │  └─ report.ts                 # ValidationReport type + formatter
│  ├─ trace/
│  │  ├─ record.ts                 # write a Trace
│  │  └─ replay.ts                 # deterministically replay a Trace
│  ├─ persist/
│  │  └─ save_load.ts              # serialize/deserialize a save
│  └─ index.ts
├─ agents/                         # AI roles (each is a thin LLM-driven script)
│  ├─ writer.ts
│  ├─ adapter.ts
│  ├─ playtester.ts
│  ├─ debugger.ts
│  ├─ fixer.ts
│  └─ llm/                         # provider-agnostic LLM client (§12.7)
├─ content/
│  ├─ engine_contract.yaml         # capabilities the writer is given (§11)
│  ├─ cyoa/
│  │  ├─ story/                    # Layer 1 narrative drafts
│  │  └─ pack/                     # Layer 2 schema-valid content packs
│  └─ parser/
│     ├─ story/
│     └─ pack/
├─ traces/                         # recorded playthroughs + bug artifacts
│  └─ bugs/
├─ tests/
│  ├─ unit/
│  ├─ property/                    # fast-check / Hypothesis
│  └─ regression/                  # one test per fixed bug (§15)
└─ bin/
   ├─ play          # interactive human play (CLI)
   ├─ validate      # run validator on a content pack
   ├─ replay        # replay a trace / bug artifact
   └─ playtest      # run an AI playtester against a pack
```

---

## 6. UNIFIED STATE MODEL (shared by all stages)

A single state shape carries the game from CYOA all the way to RPG. Stages add *fields*, never replace the model.

```ts
type GameState = {
  // identity / determinism
  seed: number;
  step: number;                    // monotonically increasing action counter

  // location
  current: string;                 // scene_id (CYOA) or room_id (parser)
  visited: Record<string, boolean>;

  // world state
  flags: Record<string, boolean>;  // boolean switches
  vars: Record<string, number>;    // numeric variables / stats (HP, gold, skills…)
  inventory: string[];             // object ids carried by the player
  objectState: Record<string, ObjectRuntime>; // open/locked/contents per object (parser+)

  // narrative
  journal: string[];               // append-only player-visible log
  questStage: Record<string, string>; // questId -> current stage id (Stage 3+)

  // termination
  ended: boolean;
  endingId: string | null;
};

type ObjectRuntime = {
  open?: boolean;
  locked?: boolean;
  contents?: string[];             // object ids inside a container
  takenBy?: "player" | "world";    // location bookkeeping
};
```

**Save = the full `GameState` plus the content-pack id and its content hash.** A save is only loadable against a matching content hash.

---

## 7. CONTENT SCHEMAS (Layer 2 — the single source of truth)

All content is authored in YAML and compiled to validated JSON. Define these as Zod/Pydantic schemas; the schema **is** the contract. Reject anything that does not parse.

### 7.1 Shared mini-DSLs

**Conditions** (all pure, evaluated against `GameState`):

```yaml
# any condition node is one of:
- has_flag: <flag>
- not_flag: <flag>
- has_item: <object_id>
- not_item: <object_id>
- visited: <node_id>
- not_visited: <node_id>
- var_gte: { name: <var>, value: <number> }
- var_lte: { name: <var>, value: <number> }
- var_eq:  { name: <var>, value: <number> }
- all_of: [ <condition>, ... ]   # AND
- any_of: [ <condition>, ... ]   # OR
- none_of: [ <condition>, ... ]  # NOR / NOT
```

**Effects** (all pure; applied by the reducer, each emits an event):

```yaml
- set_flag: <flag>
- clear_flag: <flag>
- add_item: <object_id>
- remove_item: <object_id>
- set_var:  { name: <var>, value: <number> }
- inc_var:  { name: <var>, by: <number> }
- dec_var:  { name: <var>, by: <number> }
- add_journal: <string>
- goto: <scene_id>               # CYOA scene transition
- unlock_exit: { from: <room_id>, to: <room_id> }   # parser
- open_object: <object_id>
- set_object_locked: { id: <object_id>, locked: <bool> }
- narrate: <string>              # pure flavor text event, no state change
- end_game: <ending_id>
```

The condition/effect vocabulary is intentionally small and closed. Content cannot introduce new verbs — only the engine can, and only with the gate in §14.

### 7.2 CYOA schema (Stage 1)

```yaml
# content/cyoa/pack/<name>.yaml
meta:
  id: forest_pack_v1
  title: "The Watchtower Road"
  start: forest_crossroads
  vars_init: { suspicion: 0 }     # optional initial numeric vars
  flags_init: []                  # optional initial flags

scenes:
  - id: forest_crossroads
    title: "The Forest Crossroads"
    text: >
      The road splits beneath the black pines. To the east, smoke rises from a
      ruined watchtower. To the west, a brook cuts through the moss.
    on_enter: []                  # effects fired when scene is entered
    is_ending: false
    choices:
      - id: go_east
        text: "Go toward the ruined watchtower."
        conditions: []
        effects: [ { set_flag: saw_watchtower } ]
        next: ruined_watchtower
      - id: go_west
        text: "Follow the brook."
        conditions: []
        effects: []
        next: mossy_brook
      - id: inspect_ground
        text: "Inspect the muddy ground."
        conditions: [ { not_flag: found_bootprints } ]
        effects:
          - set_flag: found_bootprints
          - add_journal: "Someone dragged a heavy object toward the watchtower."
        next: forest_crossroads     # self-loop: re-presents the scene with new state

endings:
  - id: ending_escape
    title: "You slipped away into the dark."
    text: "..."
```

**Scene rules the validator enforces:** every `next`/`goto` targets an existing scene or ending; an ending scene has `is_ending: true` and no outgoing choices; non-ending scenes have ≥1 choice that is reachable under some satisfiable condition.

### 7.3 Parser schema (Stage 2 — Zork-style)

```yaml
# content/parser/pack/<name>.yaml
meta:
  id: chapel_pack_v1
  title: "The Sealed Crypt"
  start_room: forest_path
  vars_init: {}
  flags_init: []

rooms:
  - id: old_well
    name: "Old Well"
    description: >
      A moss-covered well stands behind the ruined chapel. An iron ring is
      bolted to its rim.
    objects: [ old_well, rusted_bucket ]
    exits:
      - { direction: north, to: ruined_chapel }
      - { direction: south, to: forest_path }
      - direction: down
        to: well_bottom
        conditions: [ { has_flag: rope_attached_to_well } ]   # locked until satisfied
        locked_msg: "It's too far to climb down without a rope."

objects:
  - id: rope
    name: "coil of rope"
    aliases: [ rope, coil ]
    description: "A sturdy coil of hemp rope."
    takeable: true
    quest_critical: true            # validator guards against permanent loss
  - id: old_well
    name: "old well"
    aliases: [ well ]
    description: "Deep, dark, and quiet."
    takeable: false
    interactions:
      - verb: USE
        item: rope
        target: old_well
        conditions: [ { not_flag: rope_attached_to_well } ]
        effects:
          - set_flag: rope_attached_to_well
          - unlock_exit: { from: old_well, to: well_bottom }
          - narrate: "You tie the rope to the iron ring. It drops into the dark."
  - id: brass_key
    name: "brass key"
    aliases: [ key, brass ]
    description: "A small brass key, green with age."
    takeable: true
  - id: oak_chest
    name: "oak chest"
    aliases: [ chest ]
    description: "A banded oak chest."
    takeable: false
    container: true
    openable: true
    locked: true
    key_id: brass_key
    contents: [ silver_coin ]

npcs:
  - id: innkeeper
    name: "the innkeeper"
    description: "A broad woman polishing a tankard."
    dialogue:
      root: greet
      nodes:
        - id: greet
          npc_text: "You look lost, traveler."
          topics:
            - { id: crypt, prompt: "Ask about the sealed crypt", goto: about_crypt }
            - { id: bye,  prompt: "Say goodbye", end: true }
        - id: about_crypt
          npc_text: "The crypt? Only the bell rope opens it. Not a key in sight."
          effects: [ { set_flag: heard_crypt_rumor } ]
          topics:
            - { id: bye, prompt: "Say goodbye", end: true }

win_conditions:
  - id: reach_catacombs
    conditions: [ { visited: catacombs } ]
    ending: ending_victory

endings:
  - id: ending_victory
    title: "Into the Catacombs"
    text: "..."
```

**Object/room rules the validator enforces:** see §10.2.

---

## 8. ENGINE SPECIFICATION (Layer 3)

### 8.1 The one public engine function

```ts
function step(state: GameState, action: Action): StepResult;

type StepResult = {
  state: GameState;        // NEW state (engine is pure; input state unmutated)
  events: GameEvent[];     // ordered list of what happened
  ok: boolean;             // false if action was illegal/rejected
  rejectionReason?: string;// human-readable, for illegal actions
};
```

The engine is a **pure reducer**: `step` must not mutate its input, must not perform I/O, and must not read any clock or global RNG. All randomness flows through the seeded PRNG carried in/derived from `state.seed` and `state.step`.

### 8.2 Action types

```ts
type Action =
  // CYOA
  | { type: "CHOOSE"; choiceId: string }
  // Parser (Stage 2+)
  | { type: "LOOK"; target?: string }
  | { type: "MOVE"; direction: string }
  | { type: "TAKE"; item: string }
  | { type: "DROP"; item: string }
  | { type: "OPEN"; target: string }
  | { type: "CLOSE"; target: string }
  | { type: "UNLOCK"; target: string; with: string }
  | { type: "USE"; item: string; target: string }
  | { type: "TALK"; npc: string }
  | { type: "ASK"; npc: string; topic: string }
  | { type: "GIVE"; item: string; npc: string }
  | { type: "READ"; target: string }
  | { type: "INSPECT"; target: string }
  | { type: "INVENTORY" };
```

### 8.3 Event log

Every action produces an ordered event list. Events are the system's universal record — used for narration, the AI's experience log, testing, and debugging.

```jsonc
{
  "action": { "type": "USE", "item": "rope", "target": "old_well" },
  "ok": true,
  "events": [
    { "type": "state_change", "effect": "set_flag", "flag": "rope_attached_to_well" },
    { "type": "unlock_exit", "from": "old_well", "to": "well_bottom" },
    { "type": "narration", "text": "You tie the rope to the iron ring. It drops into the dark." }
  ],
  "new_state_hash": "8f3a19c4"
}
```

Event `type` values: `state_change`, `narration`, `unlock_exit`, `open_object`, `move`, `take`, `drop`, `dialogue`, `ending`, `rejected`.

### 8.4 Resolution order within a single `step`

1. Validate the action against the **legal-action set** for the current state (§9). If not legal → return `ok:false` with a `rejected` event and reason. **No state change.**
2. Evaluate the action's `conditions`. If unmet → `ok:false`, `rejected` event with the relevant `locked_msg`/reason. No state change.
3. Apply effects **in declared order** through the pure reducer, emitting one event per effect.
4. Apply any `on_enter` effects triggered by a resulting scene/room transition.
5. Check win/lose/ending conditions; if met, set `ended`, emit `ending` event.
6. Increment `step`, recompute `new_state_hash`.

### 8.5 DETERMINISM CONTRACT (non-negotiable)

> **Same seed + same initial state + same action sequence ⇒ identical final state, identical state-hash sequence, and identical event sequence — on any machine, any run.**

Enforced by a property test (§14 testing strategy): generate random valid action sequences, run twice, assert byte-identical traces. Any nondeterminism (clock, global RNG, map/set iteration order, JSON key order) is a bug.

### 8.6 State hash

Canonical-serialize `GameState` (keys sorted, sets serialized as sorted arrays) → SHA-256 → first 8 hex chars for logs, full hash for save integrity. Two states with identical hashes are identical games.

### 8.7 Save / load

`save(state, packId, contentHash) -> bytes`; `load(bytes) -> {state, packId, contentHash}`. Loading **must** verify `contentHash` matches the loaded pack; mismatch is a hard error (prevents replaying a save against edited content and silently corrupting it).

### 8.8 Trace record / replay

A **Trace** is a fully replayable artifact:

```jsonc
{
  "trace_id": "tr_0001",
  "pack_id": "chapel_pack_v1",
  "content_hash": "ab12...",
  "seed": 88123,
  "initial_state_ref": "start",          // or an embedded save
  "actions": [
    { "type": "MOVE", "direction": "north" },
    { "type": "TAKE", "item": "rope" }
  ],
  "expected_final_hash": "8f3a19c4"        // optional; asserted on replay
}
```

`replay(trace)` reconstructs the initial state and applies actions through `step`, asserting the final hash if present. This is the backbone of regression testing and bug reproduction.

---

## 9. THE AI-FACING ACTION API (the only way an LLM touches the game)

The LLM **never** sees raw engine internals and **never** invents parser syntax. On each turn it receives a structured **Observation** and returns an **Action** chosen from `available_actions`. This is the Jericho "legal-action" idea: collapse the action space to a small enumerated set.

### 9.1 Observation (CYOA)

```jsonc
{
  "mode": "cyoa",
  "scene_id": "forest_crossroads",
  "text": "The road splits beneath the black pines...",
  "state": { "flags": [], "vars": {}, "inventory": [], "journal": [] },
  "available_actions": [
    { "id": "go_east", "text": "Go toward the ruined watchtower." },
    { "id": "go_west", "text": "Follow the brook." },
    { "id": "inspect_ground", "text": "Inspect the muddy ground." }
  ]
}
```

The LLM returns: `{ "action_id": "inspect_ground" }` → mapped to `{ type: "CHOOSE", choiceId: "inspect_ground" }`.

### 9.2 Observation (parser)

The legal-action generator computes every currently-valid command and exposes both a stable `id` and a human-style `command` string (for the human CLI), plus the structured action.

```jsonc
{
  "mode": "parser",
  "room": "old_well",
  "description": "A moss-covered well stands behind the ruined chapel.",
  "visible_objects": [
    { "id": "old_well", "name": "Old Well" },
    { "id": "rusted_bucket", "name": "Rusted Bucket" }
  ],
  "exits": [
    { "direction": "north", "to": "ruined_chapel" },
    { "direction": "south", "to": "forest_path" }
  ],
  "inventory": ["rope", "flint"],
  "available_actions": [
    { "id": "look_old_well",     "command": "look at old well",       "action": { "type": "LOOK", "target": "old_well" } },
    { "id": "take_bucket",       "command": "take rusted bucket",     "action": { "type": "TAKE", "item": "rusted_bucket" } },
    { "id": "use_rope_on_well",  "command": "use rope on old well",   "action": { "type": "USE", "item": "rope", "target": "old_well" } },
    { "id": "go_north",          "command": "go north",               "action": { "type": "MOVE", "direction": "north" } },
    { "id": "go_south",          "command": "go south",               "action": { "type": "MOVE", "direction": "south" } }
  ]
}
```

The LLM returns `{ "action_id": "use_rope_on_well" }`. The runner looks up the structured action and calls `step`.

### 9.3 The human-facing parser (Stage 2)

Humans get the classic feel via a **controlled** verb/object parser (NOT open natural language in v1). It accepts commands like `look`, `go north`, `take lantern`, `open chest`, `unlock door with brass key`, `talk to innkeeper`, `use rope on well`, and maps them to the same structured `Action` type via `parser/command_map.ts`. Unrecognized commands return a friendly "I don't understand…" and, optionally, a hint listing example verbs. The legal-action set is the ground truth either way.

---

## 10. VALIDATION SPECIFICATION

The validator is deterministic code that runs over a compiled content pack and returns a `ValidationReport`. **A pack with any `error`-severity finding is unplayable.** Authoring agents iterate until the report is green.

### 10.1 CYOA validator (Stage 1) — the graph is fully analyzable

Run these checks:

- **Schema validity**: pack parses against the CYOA schema.
- **Reference integrity**: every `next`/`goto`/ending reference resolves.
- **Reachability**: BFS from `start` reaches every scene; report unreachable scenes.
- **Ending reachability**: every declared ending is reachable on some path; every terminal path ends in an ending or an intentional documented loop.
- **No dead ends**: every non-ending scene has ≥1 choice satisfiable under some reachable state.
- **Flag feasibility**: every flag referenced by a `has_flag`/`var_gte`/etc. condition can actually be set somewhere upstream (no impossible gates).
- **Item feasibility**: any item required by a condition can be obtained before it is required, on at least one path.
- **No soft-locks**: no reachable state where the player can take no progress-making action and no ending is reachable.
- **Contradictory conditions**: flag a choice whose conditions can never all be true.
- **Duplicate endings**: warn on endings that are structurally identical.

CYOA is the best first proof precisely because **the entire game is a graph** and these are exhaustively checkable.

### 10.2 Parser validator (Stage 2) — state space is larger; check invariants

Graph traversal is necessary but insufficient (inventory + object interactions multiply states). Add:

- All rooms reachable from `start_room`.
- All exits target existing rooms.
- Every locked exit has a satisfiable unlock condition reachable before it is needed.
- Every door/container with `locked: true` has a `key_id` that points to an obtainable key, **or** another satisfiable unlock path.
- Every takeable object is obtainable on some path.
- Every object required by an interaction/condition is obtainable **before** it is required.
- **`quest_critical` objects can never be permanently lost** (cannot be dropped into an irretrievable place, destroyed, or consumed) unless a replacement source exists. (This is the classic adventure soft-lock; guard it hard.)
- Every container that must be opened to win can be opened.
- Every NPC dialogue `topic` references an existing node; `goto` targets exist; trees terminate.
- Every puzzle's dependency chain is satisfiable.
- Every `win_condition` is reachable.
- No required item can be irreversibly destroyed unless replaceable.

### 10.3 Report shape

```jsonc
{
  "pack_id": "chapel_pack_v1",
  "ok": false,
  "findings": [
    { "severity": "error",   "code": "SOFTLOCK_QUEST_ITEM",
      "message": "bell_rope can be dropped into old_well before the crypt puzzle, making ending_victory unreachable.",
      "where": ["object:bell_rope", "room:old_well"] },
    { "severity": "warning", "code": "UNCLEAR_PUZZLE",
      "message": "crypt requires bell_rope but no in-world clue points to it.",
      "where": ["object:sealed_crypt"] }
  ]
}
```

---

## 11. THE ENGINE CONTRACT (what the WRITER agent is given before writing)

Before drafting, the writer receives a compact, machine-readable statement of what the engine can and cannot do. This keeps stories loosely inside the engine's reach without forcing prose into rigid schema form. Store at `content/engine_contract.yaml`.

```yaml
engine_capabilities:
  structure:
    - scenes
    - rooms
    - exits
    - choices
    - flags
    - numeric_vars
    - inventory
    - npc_dialogue
    - simple_puzzles
    - cutscenes

  supported_actions:
    - look
    - move
    - take
    - drop
    - use_item_on_target
    - talk
    - ask_about_topic
    - give_item_to_npc
    - open
    - close
    - unlock
    - read
    - inspect

  unsupported_in_v1:
    - real_time_combat
    - stealth_simulation
    - physics
    - companion_ai
    - complex_emotional_relationship_systems
    - arbitrary_crafting
    - free_form_spellcasting

  allowed_workarounds:
    - cutscene
    - narrative_summary
    - branching_choice
    - scripted_event
    - future_mechanic_flag      # mark a desired mechanic for a later stage
```

After drafting, the **adapter** agent classifies every scene/beat as exactly one of:

- `fully_supported`
- `supported_with_minor_rewrite`
- `requires_cutscene`
- `requires_engine_extension`   (triggers the gate in §14)
- `too_expensive_for_prototype` (deferred)

Worked example of the adaptation decision (from the design notes):

```
Story moment: "The hero hides under the bridge while soldiers pass overhead."
Engine cannot support stealth yet. Options:
  1. Add a stealth mechanic            (→ requires_engine_extension; gated)
  2. Convert to a cutscene             (→ requires_cutscene)
  3. Convert to a branching choice     (hide / confront / flee into reeds)
  4. Convert to a flag-based branch    (if wearing guard_cloak → pass; else capture)
```

That is exactly how game writing works under production constraints: draft like a writer, adapt like a designer.

---

## 12. AI AGENT ROLES

Each role is a thin, well-prompted LLM driver around the deterministic core. None of them *is* the engine; they read/write data and call engine functions.

### 12.1 Writer (Layer 1)
Input: premise, tone, target length, the engine contract.
Output: chaptered prose story + a beat list. Drafts freely; does not need schema fluency.

### 12.2 Adapter (Layer 1 → Layer 2)
Input: story + beats + engine contract + content schema.
Output: a schema-valid content pack, plus a per-beat classification (§11). Extracts scenes, locations, characters, props, conflicts, key decisions; maps them to scenes/rooms/objects/flags/puzzles/cutscenes/quests.

### 12.3 Validator-runner
Pure code (not an LLM). Compiles the pack and produces the `ValidationReport`. The adapter loops against it until green.

### 12.4 Playtester
Input each turn: current observation, current objective, inventory, known map, quest log, recent event history.
Output each turn (structured): `chosen_action`, `reason`, `expected_result`, plus per-step diagnostics. After the run it emits a **playtest record** (§12.6). Run a *roster* of playtester personas (§12.8) to stress different play orders.

### 12.5 Debugger + Fixer
Debugger: turns a failed/odd playthrough into a **bug artifact** (replayable trace + diagnosis). Fixer: patches exactly one of `{content, engine_rule, validator, test, hint_text, quest_structure}` and adds a regression test (§15). Engine-rule changes are gated (§14).

### 12.6 Playtest record formats

Good step (progress):

```yaml
step: 42
location: old_well
objective: find_entrance_to_catacombs
available_actions: [ look_old_well, use_rope_on_well, go_north, go_south ]
chosen_action: use_rope_on_well
expected: "unlock access to the lower area"
actual:
  - rope_attached_to_well flag set
  - exit to well_bottom unlocked
result: progress
notes: "Puzzle is understandable: rope found nearby; description mentions an iron ring."
```

Bad puzzle (design flaw, not a code bug):

```yaml
step: 71
location: chapel
objective: open_sealed_crypt
chosen_action: use_silver_key_on_crypt
actual: no effect
issue: "Player has no clue the crypt needs the bell rope, not the silver key."
severity: medium
recommendation:
  - add a hint to the chapel mural
  - add an NPC rumor
  - rename 'silver key' so it doesn't imply crypt access
```

The point: the AI does not just check *whether* the game works — it records *what it experienced* and pinpoints *where the design is unclear.*

### 12.7 LLM client (provider-agnostic)
Implement one interface, multiple backends. The build must not depend on one vendor or one model name.

```ts
interface LlmClient {
  completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T>;
}
```

Backends to support behind environment variables:

- `mock`: deterministic local mock client; required for CI and default tests.
- `openai`: useful for coding/debugging/tool-heavy workflows. Verify current GPT-5.5/Codex model IDs, context limits, and pricing in official OpenAI docs before use.
- `anthropic`: useful for long-horizon coding, code review, and large repository tasks. Verify current Claude Opus/Claude Code model IDs, limits, and pricing in official Anthropic docs before use.
- `google`: useful for high-throughput writer/playtester roles. Verify current Gemini IDs, limits, tools, and pricing in Google AI docs before use.
- `github_copilot`: optional workflow backend for repository issue/PR automation where GitHub Copilot cloud agent is enabled.

Suggested role split, subject to current availability and cost:

- Builder/debugger: strongest available coding model.
- Writer/adapter: high-context model with good style control and structured-output reliability.
- Playtester roster: cheaper, high-throughput model or deterministic scripted policies for CI.
- Security/regression reviewer: separate model or human review pass for engine-rule changes.

Hard rules:

- No live LLM call in normal CI.
- No committed API keys.
- No generated content may execute code, shell commands, or network calls.
- All live-agent output is untrusted until schema-validated.
- Every failed LLM output must be captured as a reproducible artifact if it affects code or content.

> Caveat backed by the research in §2: do not over-trust any model as the live rule engine. The whole point of the structured API + validator is that deterministic code, not the model, guarantees mechanics.

### 12.8 Playtester persona roster (Stage 2 stress test)
Run all of these against every parser pack:

- mainline player (does the obvious thing)
- curious explorer (visits everything)
- inventory hoarder (takes everything)
- inventory dropper (drops things in odd places — catches soft-locks)
- dialogue skipper
- wrong-order solver (does puzzles out of intended sequence)
- adversarial command user (probes edge cases of the controlled parser)
- speedrunner (shortest path to win)

Out-of-order and dropper personas matter most: classic adventures fail exactly when players act out of the designer's expected order.

---

## 13. STAGE-BY-STAGE BUILD PLAN + ACCEPTANCE CRITERIA

### STAGE 0 — Scaffolding
Build: repo (§5), tooling (§4), the unified `GameState` (§6), the condition/effect DSL evaluators (§7.1), `rng`, `hash`, `save_load`, `trace record/replay`, the pure `step` skeleton, CI that runs lint + tests.
**Done when:** `bin/replay` round-trips a hand-written trace; determinism property test passes; CI is green.

### STAGE 1 — CYOA engine (the minimum viable proof)
Build the CYOA schema, runner, observation builder, full CYOA validator, human CLI (`bin/play`), and the writer→adapter→validator→playtester→debugger→fixer loop for CYOA.

Target first content pack:
- 20 scenes, 3 endings, 2 inventory items, 5 flags, 1 NPC conversation, 1 condition-locked choice, 1 hidden scene, save/load, trace recording.

**Stage 1 acceptance — the end-to-end proof must demonstrate, in CI or a recorded run:**
1. AI writes a 20-scene branching story.
2. AI adapts it into a schema-valid pack.
3. Engine validates the pack (green report).
4. AI playtester plays every major route.
5. AI records its experience as playtest records + traces.
6. AI identifies at least one confusing or broken branch.
7. AI fixes it (content/hint/structure).
8. A regression test is added and passes.
9. Determinism holds: replaying every recorded trace reproduces identical hashes.

This single loop is the whole thesis in miniature. Do not move on until it passes.

### STAGE 2 — Zork-style parser adventure
Build the parser schema, legal-action generator, controlled command parser (human side), parser validator, and the structured action API for the AI. Reuse the entire Stage-0 core and the agent loop.

Target first content pack:
- 10 rooms, 8 objects, 2 containers, 2 locked doors, 1 NPC with a dialogue tree, 2 puzzles, 1 win condition, controlled parser, legal-action API, trace replay, full playtester roster.

**Stage 2 acceptance:**
1. Pack passes the full parser validator (§10.2), including the `quest_critical` soft-lock guard.
2. A human can complete the game through the controlled CLI parser.
3. The AI completes the game using only the structured legal-action API (no raw-parser guessing).
4. The full persona roster (§12.8) runs; the dropper/out-of-order personas surface at least one real soft-lock or ordering issue during development, which is then fixed and regression-tested.
5. Determinism holds across all recorded traces.
6. At least one bug becomes a `traces/bugs/` artifact and a regression test (§15).

### STAGE 3 — Sierra-Quest style (inventory + puzzles + score + death/restore)
Add: a score variable and scoring effects, "death" endings with restore, multi-step puzzle chains, more object interactions. Reuse all prior layers. Extend the validator to check score reachability and that death states are always recoverable via load.

### STAGE 4 — Hero's-Quest style (RPG/adventure hybrid)
Add via the gate (§14): character stats in `vars` (HP, skills, gold), deterministic skill checks (seeded), simple turn-based combat resolved in code, quest stages. The engine stays deterministic; combat randomness flows through the seeded PRNG so every fight is replayable.

### STAGE 5 — Human UI, then renderer
Only now add a UI. Web (React + Vite) for Stages 1–4 content, talking exclusively to the structured API and the same `step` function. A 3D renderer, if pursued, is a presentation layer over identical structured state. **The engine remains headless; the UI is a view.**

---

## 14. ENGINE-EXTENSION GATE (how the engine grows without rotting)

The AI *may* propose engine extensions (new mechanics/verbs). Every extension MUST ship with all of:

1. An explicit mechanic spec (states, transitions, edge cases).
2. A schema update (new condition/effect/object fields).
3. Unit tests for the new mechanic.
4. At least one scenario test exercising it in a real pack.
5. A backward-compatibility check (all existing packs still validate; all existing traces still replay to identical hashes).
6. A fresh playtest trace using the new mechanic.

Without the gate the engine bloats and loses determinism. With it, the engine becomes *more* robust over time.

**Testing strategy across all stages** — coverage is necessary but not sufficient; the determinism and purity *properties* below are what actually guarantee correctness, so do not treat a coverage percentage as the goal:
- **Unit tests**: each condition, each effect, each action type.
- **Property tests** (fast-check / Hypothesis): (a) determinism — random valid action sequences run twice produce identical traces; (b) purity — `step` never mutates input; (c) save/load round-trips to an identical state hash; (d) the legal-action set never contains an action that `step` then rejects as *illegal* (conditions may still fail, but legality must agree).
- **Regression tests**: one per fixed bug (§15).
- **AI playtests**: the persona roster, recorded as traces.

---

## 15. BUG ARTIFACT + REGRESSION FORMAT

Every failure becomes a replayable artifact in `traces/bugs/`, then a regression test. Example:

```yaml
bug_id: bug_0147
pack_id: chapel_pack_v1
content_hash: ab12cd34
seed: 88123
initial_state: save_before_chapel        # or "start"
trace:
  - { type: MOVE, direction: north }
  - { type: TAKE, item: bell_rope }
  - { type: MOVE, direction: south }
  - { type: USE, item: bell_rope, target: old_well }   # dropped into the well
  - { type: MOVE, direction: north }
  - { type: USE, item: silver_key, target: sealed_crypt }
failure:
  type: soft_lock
  description: >
    Player can sink the bell rope into the well before the crypt puzzle,
    making the main quest impossible.
expected:
  - prevent losing a quest_critical item irreversibly, OR
  - provide an alternate rope source, OR
  - make the rope recoverable from the well
fix:
  layer: validator        # one of: content | engine_rule | validator | test | hint_text | quest_structure
  summary: "Add SOFTLOCK_QUEST_ITEM check; mark bell_rope quest_critical; make well non-destination for it."
regression_test: tests/regression/bug_0147_quest_item_softlock.test.ts
```

The matching regression test asserts, e.g.: *"A player cannot permanently lose a quest-critical item before the crypt puzzle."* Run it forever.

---

## 16. DIRECT ANSWERS TO THE FEASIBILITY QUESTIONS (settled — build accordingly)

- **Can frontier coding agents build a robust Zork engine?** Yes. A modest, strict, typed, test-backed Zork-like engine is well within current frontier coding-agent capability. The hard part is not the first draft — it is making the engine strict enough that generated content cannot break it. This spec front-loads that strictness.
- **Can an LLM interface with the game, play it, test it, and record its experience?** Yes; adjacent systems (Jericho, TextWorld, TALES) already expose text games to agents. This project goes further by exposing **structured state + legal actions + traces + validation reports** instead of a raw parser.
- **Can the AI write content into the engine's parameters?** Yes — the cleanest production mode: AI receives schema + canon + engine contract → produces a content pack → validator checks it → AI revises until green.
- **Can the AI write a story first, then adapt it?** Yes, and this is the better creative workflow: prose first for coherence, then a designer-style adaptation pass into scenes/rooms/objects/flags/puzzles/cutscenes/quests.
- **Can the engine expand when the story needs something new?** Yes — but only through the gate in §14.

---

## 17. REFERENCES (verify before relying on version-specific details)

Research / tooling:
- RPGBench — *Evaluating LLMs as Role-Playing Game Engines*, arXiv:2502.00595 (2025).
- TALES — *Text Adventure Learning Environment Suite*, arXiv:2504.14128 (2025); https://microsoft.github.io/tale-suite/ ; https://github.com/microsoft/tale-suite
- Jericho — Microsoft Research IF agent environment; https://github.com/microsoft/jericho ; Hausknecht et al., *Interactive Fiction Games: A Colossal Adventure* (AAAI 2020), arXiv:1909.05398.
- TextWorld / TextWorld-Express — Microsoft Research.
- TextQuests — *How Good are LLMs at Text-Based Video Games?*, arXiv:2507.23701 (2025).
- ZorkGPT — community LLM-IF agent using the Jericho interface (illustrative architecture); https://github.com/stickystyle/ZorkGPT

Frontier model/tooling sources (verify current IDs/pricing/limits before wiring live calls):
- OpenAI — GPT-5.5 / Codex: https://openai.com/index/introducing-gpt-5-5/
- Anthropic — Claude Opus 4.8 / Claude Code dynamic workflows: https://www.anthropic.com/news/claude-opus-4-8
- Anthropic model docs: https://platform.claude.com/docs/en/about-claude/models/overview
- Google — Gemini 3.5 Flash: https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5
- GitHub Copilot cloud agent: https://docs.github.com/copilot/concepts/agents/coding-agent/about-coding-agent

---

## 18. ONE-PARAGRAPH SUMMARY FOR THE BUILDER

Build a deterministic, headless, strictly-typed text-adventure engine whose mechanics live entirely in pure code and whose content lives entirely in AI-generated, schema-validated data. Start with a fully-analyzable CYOA graph and prove the complete loop — AI writes a story, adapts it to a validated pack, the engine validates it, an AI plays every route through a structured legal-action API, records its experience, finds a flaw, fixes it, and locks the fix with a regression test — then graduate the same core to a Zork-style parser adventure with a controlled command model, then to Sierra-Quest puzzles, then to a Hero's-Quest stat/RPG hybrid, and only at the very end attach a human UI and (optionally) a renderer. The engine must satisfy the determinism contract at every stage, every content pack must pass the validator before it is playable, every engine extension must pass the §14 gate, and every bug must become a replayable artifact plus a regression test. Keep the engine small enough that the AI fully understands it, but strict enough that the AI cannot accidentally corrupt the game world.
# 🧠 AdventureForge: Autonomous Agent Learnings & Rules

* **Last Updated**: 2026-05-31
* **Memory Slots**: 4 / 50 Active

---

## 🚫 Critical Anti-Patterns (What to Avoid)

1. **Internal Loop Bug (Platform Timeout):**
   * *Pattern*: Instructing the agent to "loop indefinitely" or use `while true` scripts within its system prompt.
   * *Consequence*: The agent session times out after 5-10 minutes of continuous tool calling, losing all state.
   * *Resolution*: Do exactly ONE cycle (Plan, Build, Verify, Playtest, Evaluate), write status, and exit. Let the outer bash harness handle the loop.

2. **Workspace Wanderlust (Scratch Directories):**
   * *Pattern*: Searching/listing default global scratch folders (`~/.gemini/antigravity-cli/scratch`) without inspecting the current directory.
   * *Consequence*: The agent builds a new game from scratch inside temporary files, completely ignoring the primary repository.
   * *Resolution*: Always search `/home/michael_crosato/projects/zork-unlimited-2` first. Anchor all code edits in this directory.

3. **Hanging Dev Servers:**
   * *Pattern*: Starting long-running servers (`npm start`, `http-server`) in a synchronous command blocking the main process.
   * *Consequence*: The command never exits, causing the agent step to hang and time out.
   * *Resolution*: Execute headless, CLI-based validators and test suites (`pnpm test`, `pnpm autopilot`) that exit cleanly upon completion.

---

## 🟢 Proven Strategies (What Works)

1. **Verification-First Development:**
   * *Strategy*: Before declaring any task finished, always run `pnpm build && pnpm test && pnpm autopilot`.
   * *Value*: Confirms syntax, types, test assertions, and content pack graph validations are completely green.

2. **Stateful Persistence:**
   * *Strategy*: Keep `living_plan.md` updated as the single source of truth for the backlog.
   * *Value*: Allows stateless agents spawned in subsequent cycles to pick up exactly where the last cycle left off.

3. **Determinism Preservation:**
   * *Strategy*: Never use `Math.random()` or dynamic system times inside the game engine or content rules. Always use `PureRand` with seeds.
   * *Value*: Guarantees that replay traces yield byte-identical SHA-256 state hashes.

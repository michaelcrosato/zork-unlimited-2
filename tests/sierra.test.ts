import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { Action, ParserObservation } from "../src/api/types.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mapCommand } from "../src/parser/command_map.js";
import { saveGame, loadGame } from "../src/persist/save_load.js";

describe("Sierra-Quest Style Mechanics (Stage 3)", () => {
  const packPath = fileURLToPath(new URL("../content/parser/pack/chapel.yaml", import.meta.url));
  const pack = ParserPackSchema.parse(parseYaml(readFileSync(packPath, "utf-8")));

  it("should accumulate score and handle death-and-restore loops", () => {
    let state = createInitialState({
      seed: 42,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    const runAction = (cmd: string) => {
      const obs = buildObservation(state, pack) as ParserObservation;
      const match = mapCommand(cmd, obs.available_actions);
      if (!match.action) {
        throw new Error(`Command failed to map: '${cmd}'. ${match.error}`);
      }

      const res = step(state, match.action, pack);
      expect(res.ok).toBe(true);
      state = res.state;
    };

    // 1. Move to garden and collect rope
    runAction("go north"); // to chapel_entrance
    runAction("go north"); // to ruined_chapel
    runAction("go west");  // to chapel_garden
    runAction("take coil of rope");

    // 2. Attach rope to old well (score increases by 15)
    runAction("go east");  // to ruined_chapel
    expect(state.vars["score"]).toBe(0); // Score starts at 0

    runAction("use coil of rope on old well");
    expect(state.flags["rope_attached_to_well"]).toBe(true);
    expect(state.vars["score"]).toBe(15); // +15 points!

    // 3. Descend well and get brass key
    runAction("go down");  // to well_bottom
    runAction("take brass key");

    // --- SAVE STATE POINT ---
    // Save the game right before going up, so we can restore it after death
    const contentHash = "dummy_content_hash";
    const savedStr = saveGame(state, pack.meta.id, contentHash);

    // 4. Return and go to sacristy
    runAction("go up");
    runAction("go north"); // to altar_room
    runAction("go west");  // to sacristy

    // 5. Unlock oak chest and get iron key
    runAction("unlock banded oak chest with brass key");
    runAction("open banded oak chest");
    runAction("take iron key");

    // 6. Return, unlock crypt door (score increases by 25)
    runAction("go east");  // to altar_room
    runAction("use iron key on iron crypt door");
    expect(state.vars["score"]).toBe(40); // 15 + 25 = 40 points!

    // 7. Descend to Sealed Crypt
    runAction("go down");  // to sealed_crypt
    expect(state.flags["sarcophagus_trapped"]).toBe(true); // Sarcophagus is currently trapped

    // --- LETHAL DEATH STATE WALKTHROUGH ---
    // Try to open the granite sarcophagus directly (triggers poison trap and kills the player!)
    runAction("open granite sarcophagus");
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_poisoned"); // Player is DEAD!

    // --- SIERRA RESTORE LOOP ---
    // Restore state from our saved game before death!
    state = loadGame(savedStr, pack.meta.id, contentHash);
    expect(state.ended).toBe(false); // Player is ALIVE again!
    expect(state.current).toBe("well_bottom");

    // --- WALKTHROUGH RESUMED (OPTIMAL ROUTE) ---
    runAction("go up");
    runAction("go north");
    runAction("go west");
    runAction("unlock banded oak chest with brass key");
    runAction("open banded oak chest");
    runAction("take iron key");
    runAction("go east");
    runAction("use iron key on iron crypt door");
    runAction("go down");  // to sealed_crypt

    // Disarm the sarcophagus trap (score increases by 10)
    runAction("use brass key on granite sarcophagus");
    expect(state.flags["sarcophagus_trapped"]).toBe(false); // Disarmed!
    expect(state.vars["score"]).toBe(50); // 40 + 10 = 50 points!

    // Open the disarmed sarcophagus (score increases by 30)
    runAction("open granite sarcophagus");
    expect(state.vars["score"]).toBe(80); // 50 + 30 = 80 points!

    // Pull portcullis control lever (score increases by 20)
    runAction("use iron portcullis");
    expect(state.vars["score"]).toBe(100); // 80 + 20 = 100 points! (MAX SCORE!)

    // Descend into the catacombs (Victory!)
    runAction("go down");
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });
});

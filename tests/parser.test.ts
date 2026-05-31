import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { Action } from "../src/api/types.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { computeStateHash } from "../src/core/hash.js";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Adventure Engine (Stage 2 Zork-style)", () => {
  const packPath = fileURLToPath(new URL("../content/parser/pack/chapel.yaml", import.meta.url));
  const pack = ParserPackSchema.parse(parseYaml(readFileSync(packPath, "utf-8")));

  it("should play and complete the entire 10-room Zork adventure using controlled command mappings", () => {
    let state = createInitialState({
      seed: 42,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    const runAction = (cmd: string) => {
      const obs = buildObservation(state, pack);
      if (obs.mode !== "parser") {
        throw new Error("Expected parser observation mode");
      }

      const match = mapCommand(cmd, obs.available_actions);
      if (!match.action) {
        throw new Error(`Command failed to map: '${cmd}'. ${match.error}`);
      }

      const res = step(state, match.action, pack);
      expect(res.ok).toBe(true);
      state = res.state;
    };

    // --- GAMEPLAY PUZZLE WALKTHROUGH ---
    // 1. Walk from forest path into ruins
    runAction("go north"); // to chapel_entrance
    runAction("go north"); // to ruined_chapel

    // 2. Go to overgrown garden and collect rope
    runAction("go west");  // to chapel_garden
    runAction("take coil of rope");
    expect(state.inventory).toContain("rope");

    // 3. Attach rope to well and climb down
    runAction("go east");  // to ruined_chapel
    runAction("use coil of rope on old well");
    expect(state.flags["rope_attached_to_well"]).toBe(true);

    runAction("go down");  // to well_bottom
    runAction("take brass key");
    expect(state.inventory).toContain("brass_key");

    // 4. Return, go to altar room and sacristy
    runAction("go up");    // to ruined_chapel
    runAction("go north"); // to altar_room
    runAction("go west");  // to sacristy

    // 5. Unlock oak chest and take iron key
    runAction("unlock banded oak chest with brass key");
    runAction("open banded oak chest");
    runAction("take iron key");
    expect(state.inventory).toContain("iron_key");

    // 6. Return to altar room, unlock crypt door and enter crypt
    runAction("go east");  // to altar_room
    // Crypt door is locked before key use
    expect(state.flags["crypt_door_locked"]).toBeTruthy(); 

    runAction("use iron key on iron crypt door");
    expect(state.flags["crypt_door_locked"]).toBeFalsy(); 
    runAction("go down");  // to sealed_crypt

    // 7. Pull portcullis lever and descend into Catacombs (Victory!)
    runAction("use iron portcullis");
    expect(state.flags["portcullis_raised"]).toBe(true);

    runAction("go down");  // to catacombs

    // Verify win conditions successfully triggered
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });
});

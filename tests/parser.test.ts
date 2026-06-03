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
    runAction("go west"); // to chapel_garden
    runAction("take coil of rope");
    expect(state.inventory).toContain("rope");

    // 3. Attach rope to well and climb down
    runAction("go east"); // to ruined_chapel
    runAction("use coil of rope on old well");
    expect(state.flags["rope_attached_to_well"]).toBe(true);

    runAction("go down"); // to well_bottom
    runAction("take brass key");
    expect(state.inventory).toContain("brass_key");

    // 4. Return, go to altar room and sacristy
    runAction("go up"); // to ruined_chapel
    runAction("go north"); // to altar_room
    runAction("go west"); // to sacristy

    // 5. Unlock oak chest and take iron key
    runAction("unlock banded oak chest with brass key");
    runAction("open banded oak chest");
    runAction("take iron key");
    expect(state.inventory).toContain("iron_key");

    // 6. Return to altar room, unlock crypt door and enter crypt
    runAction("go east"); // to altar_room
    // Crypt door is locked before key use
    expect(state.flags["crypt_door_locked"]).toBeTruthy();

    runAction("use iron key on iron crypt door");
    expect(state.flags["crypt_door_locked"]).toBeFalsy();
    runAction("go down"); // to sealed_crypt

    // 7. Pull portcullis lever and descend into Catacombs (Victory!)
    runAction("use iron portcullis");
    expect(state.flags["portcullis_raised"]).toBe(true);

    runAction("go down"); // to catacombs

    // Verify win conditions successfully triggered
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });

  it("should successfully resolve new parser synonyms and compound phrases", () => {
    const available = [
      { command: "go north", action: { type: "MOVE", direction: "north" } },
      { command: "take key", action: { type: "TAKE", item: "key" } },
      { command: "drop rock", action: { type: "DROP", item: "rock" } },
      { command: "open door", action: { type: "OPEN", target: "door" } },
      { command: "close chest", action: { type: "CLOSE", target: "chest" } },
      { command: "unlock gate with golden key", action: { type: "UNLOCK", target: "gate", with: "golden key" } },
      { command: "use lever on wall", action: { type: "USE", item: "lever", target: "wall" } },
      { command: "talk to barman", action: { type: "TALK", npc: "barman" } },
      { command: "give coin to beggar", action: { type: "GIVE", item: "coin", npc: "beggar" } },
      { command: "inventory", action: { type: "INVENTORY" } },
      { command: "look", action: { type: "LOOK" } },
    ] as any[];

    // Move
    expect(mapCommand("walk towards north", available).action).toEqual({ type: "MOVE", direction: "north" });
    expect(mapCommand("wander north", available).action).toEqual({ type: "MOVE", direction: "north" });

    // Take
    expect(mapCommand("pickup key", available).action).toEqual({ type: "TAKE", item: "key" });
    expect(mapCommand("slip key into pocket", available).action).toEqual({ type: "TAKE", item: "key" });
    expect(mapCommand("add key to inventory", available).action).toEqual({ type: "TAKE", item: "key" });

    // Drop
    expect(mapCommand("toss away rock", available).action).toEqual({ type: "DROP", item: "rock" });
    expect(mapCommand("jettison rock", available).action).toEqual({ type: "DROP", item: "rock" });

    // Open/Close
    expect(mapCommand("unzip door", available).action).toEqual({ type: "OPEN", target: "door" });
    expect(mapCommand("expose door", available).action).toEqual({ type: "OPEN", target: "door" });
    expect(mapCommand("latch chest", available).action).toEqual({ type: "CLOSE", target: "chest" });

    // Unlock
    expect(mapCommand("unlock gate with golden key", available).action).toEqual({
      type: "UNLOCK",
      target: "gate",
      with: "golden key",
    });

    // Use
    expect(mapCommand("interact with lever on wall", available).action).toEqual({
      type: "USE",
      item: "lever",
      target: "wall",
    });
    expect(mapCommand("operate lever on wall", available).action).toEqual({
      type: "USE",
      item: "lever",
      target: "wall",
    });

    // Talk/Ask
    expect(mapCommand("negotiate with barman", available).action).toEqual({ type: "TALK", npc: "barman" });

    // Give
    expect(mapCommand("pay beggar coin", available).action).toEqual({ type: "GIVE", item: "coin", npc: "beggar" });
    expect(mapCommand("bribe npc beggar coin", available).action).toEqual({
      type: "GIVE",
      item: "coin",
      npc: "beggar",
    });

    // Inventory
    expect(mapCommand("check backpack", available).action).toEqual({ type: "INVENTORY" });
    expect(mapCommand("show items", available).action).toEqual({ type: "INVENTORY" });
    expect(mapCommand("backpack", available).action).toEqual({ type: "INVENTORY" });
  });

  it("should support room scenery objects and return helpful descriptive narratives on look/inspect", () => {
    const testPack: ParserPack = {
      meta: {
        id: "scenery_test",
        title: "Scenery Test",
        start_room: "room_a",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_a",
          name: "Room A",
          description: "A room with a dusty mirror and a fancy painting.",
          objects: [],
          npcs: [],
          exits: [],
          scenery: {
            mirror: "A dusty mirror showing your own reflection.",
            painting: "A portrait of an ancient king holding a staff.",
          },
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({
      seed: 42,
      start: testPack.meta.start_room,
      varsInit: testPack.meta.vars_init,
      flagsInit: testPack.meta.flags_init,
    });

    const obs = buildObservation(state, testPack);
    expect(obs.available_actions).toContainEqual({
      id: "look_scenery_room_a_mirror",
      command: "look at mirror",
      action: { type: "LOOK", target: "scenery:room_a:mirror" },
    });
    expect(obs.available_actions).toContainEqual({
      id: "inspect_scenery_room_a_painting",
      command: "inspect painting",
      action: { type: "INSPECT", target: "scenery:room_a:painting" },
    });

    // Test map command
    const lookMirrorAction = mapCommand("look mirror", obs.available_actions);
    expect(lookMirrorAction.action).toEqual({ type: "LOOK", target: "scenery:room_a:mirror" });

    const inspectPaintingAction = mapCommand("inspect painting", obs.available_actions);
    expect(inspectPaintingAction.action).toEqual({ type: "INSPECT", target: "scenery:room_a:painting" });

    // Test engine step execution
    const res1 = step(state, lookMirrorAction.action!, testPack);
    expect(res1.ok).toBe(true);
    expect(res1.events).toContainEqual({
      type: "narration",
      text: "A dusty mirror showing your own reflection.",
    });

    const res2 = step(state, inspectPaintingAction.action!, testPack);
    expect(res2.ok).toBe(true);
    expect(res2.events).toContainEqual({
      type: "narration",
      text: "A portrait of an ancient king holding a staff.",
    });
  });
});

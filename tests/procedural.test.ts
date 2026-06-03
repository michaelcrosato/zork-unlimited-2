import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { Action, ParserObservation } from "../src/api/types.js";
import { ParserPack } from "../src/parser/schema.js";
import { validateParserPack } from "../src/validate/parser_validator.js";

describe("Stage 2 Procedural Templates & Generators", () => {
  const proceduralPack: ParserPack = {
    meta: {
      id: "procedural_test_pack",
      title: "Procedural Test",
      start_room: "start",
      vars_init: {},
      flags_init: ["generate_room"],
    },
    rooms: [
      {
        id: "start",
        name: "Starting Point",
        description: "A simple start room.",
        objects: ["device"],
        npcs: [],
        exits: [],
      },
    ],
    objects: [
      {
        id: "device",
        name: "strange device",
        aliases: ["device"],
        description: "A mysterious metallic device.",
        takeable: false,
        quest_critical: false,
        container: false,
        openable: false,
        locked: false,
        contents: [],
        interactions: [
          {
            verb: "USE",
            conditions: [{ has_flag: "generate_room" }],
            effects: [
              { clear_flag: "generate_room" },
              {
                generate_procedural_room: {
                  direction: "north",
                  to_id: "proc_chamber",
                  template_id: "dungeon_room",
                },
              },
            ],
          },
        ],
      },
      {
        id: "rusty_sword",
        name: "rusty sword",
        aliases: ["sword"],
        description: "A rusty iron sword.",
        takeable: true,
        quest_critical: false,
        container: false,
        openable: false,
        locked: false,
        contents: [],
        interactions: [],
      },
    ],
    npcs: [
      {
        id: "friendly_ghost",
        name: "friendly ghost",
        description: "A transparent friendly ghost.",
        dialogue: {
          root: "greet",
          nodes: [
            {
              id: "greet",
              npc_text: "Boo! Hello.",
              effects: [],
              topics: [],
            },
          ],
        },
      },
    ],
    procedural_templates: [
      {
        id: "dungeon_room",
        name_pool: ["Dark Dungeon", "Gloomy Crypt", "Damp Cavern"],
        description_pool: [
          "A cold wind chills you to the bone here.",
          "Water droplets echo in the dark.",
          "Moss grows thick on the slimy walls.",
        ],
        possible_objects: ["rusty_sword"],
        possible_npcs: ["friendly_ghost"],
        exits: [],
      },
    ],
    win_conditions: [],
    endings: [],
  };

  it("should validate a valid pack with procedural templates successfully", () => {
    const report = validateParserPack(proceduralPack);
    expect(report.ok).toBe(true);
    expect(report.findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });

  it("should flag invalid possible_object and possible_npc references in templates", () => {
    const brokenPack: ParserPack = {
      ...proceduralPack,
      procedural_templates: [
        {
          id: "dungeon_room",
          name_pool: ["Dark Dungeon"],
          description_pool: ["Cold wind."],
          possible_objects: ["non_existent_item"],
          possible_npcs: ["non_existent_ghost"],
          exits: [],
        },
      ],
    };

    const report = validateParserPack(brokenPack);
    expect(report.ok).toBe(false);
    const errors = report.findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("possible_object 'non_existent_item'"))).toBe(true);
    expect(errors.some((f) => f.message.includes("possible_npc 'non_existent_ghost'"))).toBe(true);
  });

  it("should procedurally generate room from template and ensure perfect seed-based determinism", () => {
    // Run 1 with Seed 101
    let state1 = createInitialState({
      seed: 101,
      start: "start",
      flagsInit: ["generate_room"],
    });

    const action: Action = { type: "USE", target: "device", item: "device" };
    const res1 = step(state1, action, proceduralPack);
    expect(res1.ok).toBe(true);
    state1 = res1.state;

    // Check that proceduralRooms was populated
    expect(state1.proceduralRooms).toHaveLength(1);
    const generated1 = state1.proceduralRooms![0];
    expect(generated1.id).toBe("proc_chamber");
    expect(generated1.name).toBeDefined();
    expect(generated1.description).toBeDefined();
    expect(generated1.objects).toContain("rusty_sword");
    expect(generated1.npcs).toContain("friendly_ghost");

    // Run 2 with same Seed 101 - must be byte-identical name and description
    let state2 = createInitialState({
      seed: 101,
      start: "start",
      flagsInit: ["generate_room"],
    });
    const res2 = step(state2, action, proceduralPack);
    state2 = res2.state;
    const generated2 = state2.proceduralRooms![0];
    expect(generated2.name).toBe(generated1.name);
    expect(generated2.description).toBe(generated1.description);

    // Run 3 with Seed 999 - should select a different name/desc due to seed variance
    let state3 = createInitialState({
      seed: 999,
      start: "start",
      flagsInit: ["generate_room"],
    });
    const res3 = step(state3, action, proceduralPack);
    state3 = res3.state;
    const generated3 = state3.proceduralRooms![0];

    // Perfect determinism check: state1 and state2 must match exactly
    expect(state1).toEqual(state2);
    // state3 must be different from state1
    expect(state1.seed).not.toBe(state3.seed);
  });
});

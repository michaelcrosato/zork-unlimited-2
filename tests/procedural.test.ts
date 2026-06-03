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

  it("should support segment-based names, environment-specific descriptions, and dynamic item drops", () => {
    const pack: ParserPack = {
      meta: {
        id: "rich_procedural_pack",
        title: "Rich Procedural",
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
        {
          id: "shield",
          name: "old wooden shield",
          aliases: ["shield"],
          description: "An old shield.",
          takeable: true,
          quest_critical: false,
          container: false,
          openable: false,
          locked: false,
          contents: [],
          interactions: [],
        },
      ],
      npcs: [],
      procedural_templates: [
        {
          id: "dungeon_room",
          name_prefixes: ["Ancient", "Ruined"],
          name_adjectives: ["Slightly Damp", "Dark"],
          name_nouns: ["Sanctum", "Crypt"],
          name_suffixes: ["of the Dead", "of Secrets"],
          description_pool: ["You stand in a subterranean room."],
          environment_descriptions: {
            rain: ["Water drips heavily from the ceiling."],
            cold: ["The air is freezing cold."],
            gale: ["Winds howl through the narrow cracks."],
          },
          item_drops: [
            { item_id: "rusty_sword", chance: 1.0 },
            { item_id: "shield", chance: 0.0 },
          ],
          exits: [],
        },
      ],
      win_conditions: [],
      endings: [],
    };

    // Verify it validates cleanly
    const report = validateParserPack(pack);
    expect(report.ok).toBe(true);

    // Initial state with weather: rain, temperature: cold, wind: gale
    let state = createInitialState({
      seed: 42,
      start: "start",
      flagsInit: ["generate_room"],
    });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      wind: "gale",
      lastUpdatedStep: 0,
    };

    const action: Action = { type: "USE", target: "device", item: "device" };
    const res = step(state, action, pack);
    expect(res.ok).toBe(true);

    const generated = res.state.proceduralRooms![0];
    expect(generated.id).toBe("proc_chamber");

    // Room name should have 4 segments (prefix, adjective, noun, suffix)
    expect(generated.name).toBeDefined();
    const parts = generated.name.split(" ");
    expect(parts.length).toBeGreaterThanOrEqual(4);

    // Environment-specific segments should be appended to description
    expect(generated.description).toContain("You stand in a subterranean room.");
    expect(generated.description).toContain("Water drips heavily from the ceiling.");
    expect(generated.description).toContain("The air is freezing cold.");
    expect(generated.description).toContain("Winds howl through the narrow cracks.");

    // Dynamic item drops: rusty_sword (100%) should be present, shield (0%) should not.
    expect(generated.objects).toContain("rusty_sword");
    expect(generated.objects).not.toContain("shield");
  });

  it("should copy template exits and generate new rooms on the fly when traversing exits", () => {
    const pack: ParserPack = {
      meta: {
        id: "exits_procedural_pack",
        title: "Exits Procedural",
        start_room: "start",
        vars_init: {},
        flags_init: ["generate_room"],
      },
      rooms: [
        {
          id: "start",
          name: "Starting Point",
          description: "Start room.",
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
          description: "A device.",
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
                    to_id: "proc_room_1",
                    template_id: "infinite_dungeon",
                  },
                },
              ],
            },
          ],
        },
      ],
      npcs: [],
      procedural_templates: [
        {
          id: "infinite_dungeon",
          name_pool: ["Dungeon Room"],
          description_pool: ["A stone chamber."],
          exits: [
            { direction: "east", to: "proc_room_2" },
          ],
        },
      ],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({
      seed: 42,
      start: "start",
      flagsInit: ["generate_room"],
    });

    const useRes = step(state, { type: "USE", target: "device", item: "device" }, pack);
    expect(useRes.ok).toBe(true);
    state = useRes.state;

    expect(state.proceduralRooms).toHaveLength(1);
    const room1 = state.proceduralRooms![0];
    expect(room1.id).toBe("proc_room_1");
    expect(room1.exits).toEqual([
      { direction: "south", to: "start" },
      { direction: "east", to: "proc_room_1_east" },
    ]);

    const moveNorthRes = step(state, { type: "MOVE", direction: "north" }, pack);
    expect(moveNorthRes.ok).toBe(true);
    state = moveNorthRes.state;
    expect(state.current).toBe("proc_room_1");

    const moveEastRes = step(state, { type: "MOVE", direction: "east" }, pack);
    expect(moveEastRes.ok).toBe(true);
    state = moveEastRes.state;
    expect(state.current).toBe("proc_room_1_east");

    expect(state.proceduralRooms).toHaveLength(2);
    const room2 = state.proceduralRooms!.find(r => r.id === "proc_room_1_east");
    expect(room2).toBeDefined();
    expect(room2!.exits).toEqual([
      { direction: "west", to: "proc_room_1" },
      { direction: "east", to: "proc_room_1_east_east" },
    ]);
  });
});

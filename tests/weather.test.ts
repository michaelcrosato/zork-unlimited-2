import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { ParserPack } from "../src/parser/schema.js";
import { checkParserSoftlocks } from "../src/validate/parser_validator.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Procedural Weather & Environmental Engine", () => {
  it("should initialize with default clear/mild environment", () => {
    const state = createInitialState({ seed: 42, start: "Forest Clearing" });
    expect(state.environment).toBeDefined();
    expect(state.environment?.weather).toBe("clear");
    expect(state.environment?.temperature).toBe("mild");
    expect(state.environment?.lastUpdatedStep).toBe(0);
  });

  it("should evaluate weather_is and temperature_is conditions", () => {
    const state = createInitialState({ seed: 42, start: "Forest Clearing" });
    expect(evaluateCondition(state, { weather_is: "clear" })).toBe(true);
    expect(evaluateCondition(state, { weather_is: "rain" })).toBe(false);
    expect(evaluateCondition(state, { temperature_is: "mild" })).toBe(true);
    expect(evaluateCondition(state, { temperature_is: "cold" })).toBe(false);

    // Manually change environment and retest
    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 1,
    };

    expect(evaluateCondition(state, { weather_is: "rain" })).toBe(true);
    expect(evaluateCondition(state, { weather_is: "clear" })).toBe(false);
    expect(evaluateCondition(state, { temperature_is: "cold" })).toBe(true);
    expect(evaluateCondition(state, { temperature_is: "mild" })).toBe(false);
  });

  it("should deterministically tick environment weather/temperature every 5 steps", () => {
    const pack: ParserPack = {
      meta: {
        id: "test-pack",
        title: "Weather Test Pack",
        start_room: "room_forest",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_forest",
          name: "Damp Forest",
          description: "You are in a deep, damp forest.",
          objects: [],
          npcs: [],
          exits: [{ direction: "north", to: "room_clearing", conditions: [] }],
        },
        {
          id: "room_clearing",
          name: "Forest Clearing",
          description: "A beautiful forest clearing.",
          objects: [],
          npcs: [],
          exits: [{ direction: "south", to: "room_forest", conditions: [] }],
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 12345, start: "room_forest" });

    // Step 0: Weather is clear
    expect(state.environment?.weather).toBe("clear");
    expect(state.step).toBe(0);

    // Let's do 4 steps (moving back and forth)
    for (let i = 0; i < 4; i++) {
      const nextRoom = state.current === "room_forest" ? "room_clearing" : "room_forest";
      const result = step(state, { type: "MOVE", direction: nextRoom === "room_clearing" ? "north" : "south" }, pack);
      expect(result.ok).toBe(true);
      state = result.state;
      expect(state.environment?.weather).toBe("clear");
    }

    expect(state.step).toBe(4);

    // 5th Step: Weather should tick and change!
    const result = step(state, { type: "MOVE", direction: state.current === "room_forest" ? "north" : "south" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    expect(state.step).toBe(5);
    expect(state.environment?.lastUpdatedStep).toBe(5);
    expect(state.environment?.weather).toBeDefined();
    expect(state.environment?.temperature).toBeDefined();

    // Check if an environmental change event was generated
    const envEvent = result.events.find((e) => e.type === "narration" && e.text.startsWith("[Environment]"));
    if (state.environment?.weather !== "clear") {
      expect(envEvent).toBeDefined();
      expect(state.journal.some((j) => j.startsWith("[Environment]"))).toBe(true);
    }
  });

  it("should dynamically inject weather sensory flavor for outdoor rooms but not indoor ones", () => {
    const pack: ParserPack = {
      meta: {
        id: "test-pack",
        title: "Weather Test Pack",
        start_room: "room_forest",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_forest",
          name: "Damp Forest",
          description: "You are in a deep, damp forest.",
          objects: [],
          npcs: [],
          exits: [],
        },
        {
          id: "room_crypt",
          name: "Ruined Crypt",
          description: "Inside a dry, dark crypt.",
          objects: [],
          npcs: [],
          exits: [],
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 42, start: "room_forest" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    // Damp Forest is an outdoor room (contains "forest")
    const obsForest = buildObservation(state, pack);
    expect(obsForest.mode).toBe("parser");
    const descForest = (obsForest as any).description;
    expect(descForest).toMatch(/rain|drizzle/i);

    // Ruined Crypt is an indoor room (contains "crypt")
    state.current = "room_crypt";
    const obsCrypt = buildObservation(state, pack);
    const descCrypt = (obsCrypt as any).description;
    expect(descCrypt).not.toMatch(/rain|drizzle/i);
  });

  it("should restrict weather based on room weather_pool and force transitions on room change", () => {
    const pack: ParserPack = {
      meta: {
        id: "weather-pool-test",
        title: "Weather Pool Test Pack",
        start_room: "room_inside",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_inside",
          name: "Cozy Parlor",
          description: "Inside a cozy parlor.",
          objects: [],
          npcs: [],
          exits: [{ direction: "out", to: "room_outside", conditions: [] }],
          weather_pool: ["clear"],
        },
        {
          id: "room_outside",
          name: "Slick Garden",
          description: "Outside in a slick garden.",
          objects: [],
          npcs: [],
          exits: [{ direction: "in", to: "room_inside", conditions: [] }],
          weather_pool: ["rain", "storm"],
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 42, start: "room_inside" });
    // Initially weather is clear, which is allowed inside.
    expect(state.environment?.weather).toBe("clear");

    // Move to outside. The weather must immediately change to rain or storm because clear is not in outside's weather_pool.
    let result = step(state, { type: "MOVE", direction: "out" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(["rain", "storm"]).toContain(state.environment?.weather);
    expect(result.events.some((e) => e.type === "narration" && e.text.startsWith("[Environment]"))).toBe(true);

    // Move back inside. The weather must immediately change back to clear.
    result = step(state, { type: "MOVE", direction: "in" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.environment?.weather).toBe("clear");
  });

  it("should correctly optimize pathfinder state-space search by omitting environment from state keys unless weather conditions exist", () => {
    const packWithoutWeather: ParserPack = {
      meta: {
        id: "no-weather-pack",
        title: "No Weather Pack",
        start_room: "room_a",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_a",
          name: "Room A",
          description: "Room A",
          objects: [],
          npcs: [],
          exits: [{ direction: "east", to: "room_b", conditions: [] }],
        },
        {
          id: "room_b",
          name: "Room B",
          description: "Room B",
          objects: [],
          npcs: [],
          exits: [],
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [
        {
          id: "win_cond",
          conditions: [{ visited: "room_b" }],
          ending: "win",
        },
      ],
      endings: [{ id: "win", title: "Win", text: "You won!" }],
    };

    const findings = checkParserSoftlocks(packWithoutWeather);
    expect(findings.length).toBe(0);
  });

  it("should dynamically apply weather-specific descriptions to procedurally generated dungeon rooms", () => {
    const pack: ParserPack = {
      meta: {
        id: "weather_proc_pack",
        title: "Weather Procedural Test",
        start_room: "start",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "start",
          name: "Dungeon Entry",
          description: "You stand at the dungeon entry.",
          objects: ["trigger"],
          npcs: [],
          exits: [],
        },
      ],
      objects: [
        {
          id: "trigger",
          name: "trigger stone",
          aliases: ["trigger", "stone"],
          description: "A loose stone that triggers generation.",
          takeable: false,
          interactions: [
            {
              verb: "USE",
              effects: [
                {
                  generate_procedural_room: {
                    direction: "north",
                    to_id: "proc_room",
                    template_id: "dungeon_template",
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
          id: "dungeon_template",
          name_pool: ["Dungeon Vault"],
          description_pool: ["A vast stone chamber."],
          environment_descriptions: {
            rain: ["Water drips through the cracks in the ceiling from the storm outside."],
            fog: ["A thick mist rolls along the damp stone floor."],
            clear: ["Dust motes float peacefully in the dry air."],
          },
          exits: [],
        },
      ],
      win_conditions: [],
      endings: [],
    };

    // Test with weather set to rain
    let stateRain = createInitialState({ seed: 42, start: "start" });
    stateRain.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };
    let resultRain = step(stateRain, { type: "USE", target: "trigger" }, pack);
    expect(resultRain.ok).toBe(true);
    let procRoomRain = resultRain.state.proceduralRooms?.find((r) => r.id === "proc_room");
    expect(procRoomRain?.description).toContain("Water drips through the cracks");

    // Test with weather set to fog
    let stateFog = createInitialState({ seed: 42, start: "start" });
    stateFog.environment = {
      weather: "fog",
      temperature: "cold",
      lastUpdatedStep: 0,
    };
    let resultFog = step(stateFog, { type: "USE", target: "trigger" }, pack);
    expect(resultFog.ok).toBe(true);
    let procRoomFog = resultFog.state.proceduralRooms?.find((r) => r.id === "proc_room");
    expect(procRoomFog?.description).toContain("A thick mist rolls");

    // Test with weather set to clear
    let stateClear = createInitialState({ seed: 42, start: "start" });
    stateClear.environment = {
      weather: "clear",
      temperature: "mild",
      lastUpdatedStep: 0,
    };
    let resultClear = step(stateClear, { type: "USE", target: "trigger" }, pack);
    expect(resultClear.ok).toBe(true);
    let procRoomClear = resultClear.state.proceduralRooms?.find((r) => r.id === "proc_room");
    expect(procRoomClear?.description).toContain("Dust motes float");
  });

  it("should calculate dynamic trade prices incorporating weather climate_pricing factors", () => {
    let state = createInitialState({ seed: 42, start: "start" });
    state.environment = {
      weather: "rain",
      temperature: "mild",
      lastUpdatedStep: 0,
    };

    const npc = { id: "merchant", climate_pricing: { rain: 1.5, clear: 0.8 } };
    const item = { id: "boots", climate_pricing: { rain: 2.0, clear: 1.0 } };

    // Buy price under rain: base price 100 * 1.5 (npc multiplier) * 2.0 (item multiplier) = 300
    const priceRain = calculateTradePrice(state, npc, item, 100, true);
    expect(priceRain).toBe(300);

    // Buy price under clear: base price 100 * 0.8 (npc multiplier) * 1.0 (item multiplier) = 80
    state.environment.weather = "clear";
    const priceClear = calculateTradePrice(state, npc, item, 100, true);
    expect(priceClear).toBe(80);
  });
});

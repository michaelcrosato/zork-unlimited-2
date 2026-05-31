import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { ParserPack } from "../src/parser/schema.js";

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
      const result = step(
        state,
        { type: "MOVE", direction: nextRoom === "room_clearing" ? "north" : "south" },
        pack
      );
      expect(result.ok).toBe(true);
      state = result.state;
      expect(state.environment?.weather).toBe("clear");
    }

    expect(state.step).toBe(4);

    // 5th Step: Weather should tick and change!
    const result = step(
      state,
      { type: "MOVE", direction: state.current === "room_forest" ? "north" : "south" },
      pack
    );
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
    expect(descForest).toContain("Rain is falling steadily from the gray sky.");

    // Ruined Crypt is an indoor room (contains "crypt")
    state.current = "room_crypt";
    const obsCrypt = buildObservation(state, pack);
    const descCrypt = (obsCrypt as any).description;
    expect(descCrypt).not.toContain("Rain is falling steadily from the gray sky.");
  });
});

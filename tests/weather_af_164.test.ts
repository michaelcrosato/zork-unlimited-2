import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { step } from "../src/core/engine.js";
import { applyEffect } from "../src/core/effects.js";

describe("AF-164: Procedural Weather Wind & Real-Time Traversal Restrictions", () => {
  it("should initialize environmental state with a default wind of calm", () => {
    const state = createInitialState({ seed: 42, start: "room_start" });
    expect(state.environment).toBeDefined();
    expect(state.environment?.weather).toBe("clear");
    expect(state.environment?.temperature).toBe("mild");
    expect(state.environment?.wind).toBe("calm");
  });

  it("should evaluate wind_is condition modifier correctly", () => {
    const state = createInitialState({ seed: 42, start: "room_start" });

    // Default wind should be calm
    expect(evaluateCondition(state, { wind_is: "calm" })).toBe(true);
    expect(evaluateCondition(state, { wind_is: "gale" })).toBe(false);

    // Manually mutate wind and re-evaluate
    if (state.environment) {
      state.environment.wind = "gale";
    }
    expect(evaluateCondition(state, { wind_is: "gale" })).toBe(true);
    expect(evaluateCondition(state, { wind_is: "calm" })).toBe(false);
  });

  it("should support change_weather transition effects inside applyEffect", () => {
    const state = createInitialState({ seed: 42, start: "room_start" });

    const effect = {
      change_weather: {
        weather: "rain",
        temperature: "cold",
        wind: "tempest",
      },
    };

    const { state: updatedState, event } = applyEffect(state, effect);
    expect(updatedState.environment?.weather).toBe("rain");
    expect(updatedState.environment?.temperature).toBe("cold");
    expect(updatedState.environment?.wind).toBe("tempest");
    expect(event.type).toBe("narration");
    expect((event as any).text).toContain("weather is now rain");
    expect((event as any).text).toContain("wind is tempest");
  });

  it("should handle manual CHANGE_WEATHER parser actions", () => {
    const pack: any = {
      meta: {
        id: "test-weather-manual",
        title: "Manual Weather Test",
        start_room: "room_start",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_start",
          name: "Start Room",
          description: "You are here.",
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

    const state = createInitialState({ seed: 100, start: "room_start" });

    const result = step(
      state,
      {
        type: "CHANGE_WEATHER",
        weather: "storm",
        wind: "gale",
        temperature: "cold",
      },
      pack
    );

    expect(result.ok).toBe(true);
    expect(result.state.environment?.weather).toBe("storm");
    expect(result.state.environment?.wind).toBe("gale");
    expect(result.state.environment?.temperature).toBe("cold");
  });

  it("should lock outdoor traversal under extreme weather (storm + tempest) unless player has a heavy_cloak", () => {
    const pack: any = {
      meta: {
        id: "extreme-weather-pack",
        title: "Extreme Weather Test Pack",
        start_room: "room_start_clearing",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_start_clearing",
          name: "Outdoor Clearing",
          description: "You stand in a wide open clearing.",
          objects: [],
          npcs: [],
          exits: [{ direction: "north", to: "room_destination_cliff", conditions: [] }],
        },
        {
          id: "room_destination_cliff",
          name: "Outdoor Cliffside",
          description: "You stand on a windy cliffside.",
          objects: [],
          npcs: [],
          exits: [{ direction: "south", to: "room_start_clearing", conditions: [] }],
        },
      ],
      objects: [
        {
          id: "heavy_cloak",
          name: "Heavy Cloak",
          description: "A thick wool cloak.",
          takeable: true,
        },
      ],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 999, start: "room_start_clearing" });

    // Set environmental weather to storm & wind to tempest
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "tempest",
      lastUpdatedStep: 0,
    };

    // 1. Try to move to the destination without heavy_cloak: should be blocked
    const step1 = step(state, { type: "MOVE", direction: "north" }, pack);
    expect(step1.ok).toBe(false);
    expect(step1.rejectionReason).toContain("extreme storm weather conditions");

    // 2. Add heavy_cloak to inventory and try again: should succeed
    state.inventory.push("heavy_cloak");
    const step2 = step(state, { type: "MOVE", direction: "north" }, pack);
    expect(step2.ok).toBe(true);
    expect(step2.state.current).toBe("room_destination_cliff");
  });
});

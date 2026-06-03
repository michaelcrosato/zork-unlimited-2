import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Procedural Weather Traversal Restrictions (Engine Level)", () => {
  const testPack: ParserPack = {
    meta: {
      id: "procedural-weather-traversal-test",
      title: "Weather Traversal Test Pack",
      start_room: "room_forest_clearing",
      vars_init: {},
      flags_init: [],
    },
    rooms: [
      {
        id: "room_forest_clearing",
        name: "Forest Clearing",
        description: "A wide forest clearing.",
        objects: [],
        npcs: [],
        exits: [
          { direction: "up", to: "room_cliffside", conditions: [] },
          { direction: "north", to: "room_deep_forest", conditions: [] },
        ],
      },
      {
        id: "room_cliffside",
        name: "High Cliffside",
        description: "A cliffside with steep rocks.",
        objects: [],
        npcs: [],
        exits: [{ direction: "down", to: "room_forest_clearing", conditions: [] }],
      },
      {
        id: "room_deep_forest",
        name: "Deep Forest",
        description: "Dense trees everywhere.",
        objects: [],
        npcs: [],
        exits: [{ direction: "south", to: "room_forest_clearing", conditions: [] }],
      },
    ],
    objects: [
      {
        id: "leather_boots",
        name: "leather boots",
        description: "Sturdy boots.",
        takeable: true,
      },
      {
        id: "lantern",
        name: "brass lantern",
        description: "A brass lantern.",
        takeable: true,
      },
    ],
    npcs: [],
    win_conditions: [],
    endings: [],
  };

  it("should block climbing to cliffside in rain/storm without boots", () => {
    let state = createInitialState({ seed: 42, start: "room_forest_clearing" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      wind: "calm",
      lastUpdatedStep: 0,
    };

    // Should fail because room_cliffside is a slick surface, weather is rain, and player lacks boots
    let result = step(state, { type: "MOVE", direction: "up" }, testPack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("The rocks are too slick to climb in the rain");

    // Add boots, should succeed
    state.inventory.push("leather_boots");
    result = step(state, { type: "MOVE", direction: "up" }, testPack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("room_cliffside");
  });

  it("should block outdoor movement in fog without a light source", () => {
    let state = createInitialState({ seed: 42, start: "room_forest_clearing" });
    state.environment = {
      weather: "fog",
      temperature: "cold",
      wind: "calm",
      lastUpdatedStep: 0,
    };

    // Both forest_clearing and deep_forest are outdoor. Movement in fog should fail without lantern/torch
    let result = step(state, { type: "MOVE", direction: "north" }, testPack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("obscures all paths");

    // Add lantern to inventory, should succeed
    state.inventory.push("lantern");
    result = step(state, { type: "MOVE", direction: "north" }, testPack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("room_deep_forest");
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Weather Slick Rocks Traversal Restriction", () => {
  it("should block traversal to slick cliff when raining unless player has boots", () => {
    const pack: ParserPack = {
      meta: {
        id: "slick-rocks-test-pack",
        title: "Slick Rocks Test Pack",
        start_room: "room_clearing",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_clearing",
          name: "Sunlit Clearing",
          description: "A clearing at the base of the cliffs.",
          objects: [],
          npcs: [],
          exits: [
            {
              direction: "up",
              to: "room_cliff",
              locked_msg: "The rocks are too slick to climb in the rain. You need sturdy boots for traction.",
              conditions: [
                {
                  any_of: [
                    {
                      none_of: [{ weather_is: "rain" }, { weather_is: "storm" }],
                    },
                    { has_item: "leather_boots" },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "room_cliff",
          name: "Slick Cliffside",
          description: "You stand on a high, windy cliffside.",
          objects: [],
          npcs: [],
          exits: [{ direction: "down", to: "room_clearing", conditions: [] }],
        },
      ],
      objects: [
        {
          id: "leather_boots",
          name: "leather boots",
          aliases: ["boots", "leather boots"],
          description: "Sturdy boots.",
          takeable: true,
        },
      ],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 42, start: "room_clearing" });

    // 1. Initial weather is clear, traversal should succeed
    expect(state.environment?.weather).toBe("clear");
    let result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("room_cliff");

    // Reset state and change weather to rain
    state = createInitialState({ seed: 42, start: "room_clearing" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      wind: "breezy",
      lastUpdatedStep: 0,
    };

    // 2. Traversal should fail due to exit conditions (weather is rain and player lacks boots)
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain(
      "The rocks are too slick to climb in the rain. You need sturdy boots for traction."
    );

    // 3. Add leather boots to inventory, traversal should succeed
    state.inventory.push("leather_boots");
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("room_cliff");
  });
});

import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Climbing compound verbs synonym expansion (Cycle #426)", () => {
  const actions = [
    {
      id: "use-wall",
      command: "use stone wall",
      action: { type: "USE" as const, target: "stone wall" },
    },
  ];

  it("should map climb up wall and other variations to USE stone wall", () => {
    expect(mapCommand("climb up wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("climb down wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("climb up the stone wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("climb on wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
  });
});

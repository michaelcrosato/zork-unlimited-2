import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #417 / Direction Synonym Mapping)", () => {
  const actions = [
    { id: "move-up", command: "go up", action: { type: "MOVE" as const, direction: "up" } },
    { id: "move-west", command: "go west", action: { type: "MOVE" as const, direction: "west" } },
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
  ];

  it("should map climb cliff and scale rocks to go up", () => {
    expect(mapCommand("climb cliff", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("scale rocks", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("climb steep rocks", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("go up cliffside", actions).action).toEqual({ type: "MOVE", direction: "up" });
  });

  it("should map enter forest and walk to woods to go west", () => {
    expect(mapCommand("enter forest", actions).action).toEqual({ type: "MOVE", direction: "west" });
    expect(mapCommand("walk to deep forest", actions).action).toEqual({ type: "MOVE", direction: "west" });
    expect(mapCommand("go canopy", actions).action).toEqual({ type: "MOVE", direction: "west" });
  });

  it("should map enter glade and go to meadow to go east", () => {
    expect(mapCommand("enter glade", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("go to hidden glade", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("walk meadow", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });
});

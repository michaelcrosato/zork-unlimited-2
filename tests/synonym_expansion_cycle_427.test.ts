import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Expanded climbing, crossing, and through compound verbs (Cycle #427)", () => {
  const actions = [
    {
      id: "use-wall",
      command: "use stone wall",
      action: { type: "USE" as const, target: "stone wall" },
    },
    {
      id: "use-bridge",
      command: "use wooden bridge",
      action: { type: "USE" as const, target: "wooden bridge" },
    },
    {
      id: "use-pit",
      command: "use pit",
      action: { type: "USE" as const, target: "pit" },
    },
    {
      id: "use-chasm",
      command: "use chasm",
      action: { type: "USE" as const, target: "chasm" },
    },
    {
      id: "use-portal",
      command: "use portal",
      action: { type: "USE" as const, target: "portal" },
    },
    {
      id: "use-archway",
      command: "use archway",
      action: { type: "USE" as const, target: "archway" },
    },
    {
      id: "use-doorway",
      command: "use doorway",
      action: { type: "USE" as const, target: "doorway" },
    },
  ];

  it("should map clamber, scramble, and scale variations to USE stone wall", () => {
    expect(mapCommand("clamber up wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("scramble down wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("scale up the stone wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
    expect(mapCommand("clamber over the wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
  });

  it("should map cross variations to USE wooden bridge", () => {
    expect(mapCommand("cross bridge", actions).action).toEqual({
      type: "USE",
      target: "wooden bridge",
    });
    expect(mapCommand("cross over bridge", actions).action).toEqual({
      type: "USE",
      target: "wooden bridge",
    });
    expect(mapCommand("cross over the wooden bridge", actions).action).toEqual({
      type: "USE",
      target: "wooden bridge",
    });
  });

  it("should map jump, leap, hop, and vault variations to USE actions", () => {
    expect(mapCommand("jump over pit", actions).action).toEqual({
      type: "USE",
      target: "pit",
    });
    expect(mapCommand("leap across chasm", actions).action).toEqual({
      type: "USE",
      target: "chasm",
    });
    expect(mapCommand("hop over the pit", actions).action).toEqual({
      type: "USE",
      target: "pit",
    });
    expect(mapCommand("vault over wall", actions).action).toEqual({
      type: "USE",
      target: "stone wall",
    });
  });

  it("should map go/walk/step through variations to USE actions", () => {
    expect(mapCommand("go through portal", actions).action).toEqual({
      type: "USE",
      target: "portal",
    });
    expect(mapCommand("walk through the archway", actions).action).toEqual({
      type: "USE",
      target: "archway",
    });
    expect(mapCommand("step through doorway", actions).action).toEqual({
      type: "USE",
      target: "doorway",
    });
  });
});

import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #413 / Player Priority)", () => {
  const actions = [
    { id: "move-west", command: "go west", action: { type: "MOVE" as const, direction: "west" } },
    { id: "look-mound", command: "look earthen mound", action: { type: "LOOK" as const, target: "mound" } },
    { id: "take-shovel", command: "take rusty shovel", action: { type: "TAKE" as const, item: "shovel" } },
    { id: "use-shovel", command: "use rusty shovel on earthen mound", action: { type: "USE" as const, item: "shovel", target: "mound" } },
    { id: "talk-ranger", command: "talk to elven ranger", action: { type: "TALK" as const, npc: "ranger" } },
    { id: "fight-thief", command: "fight goblin thief", action: { type: "FIGHT" as const, npc: "thief" } },
  ];

  it("should map newly added dig/excavate/shovel synonyms to USE action", () => {
    expect(mapCommand("dig into earthen mound", actions).action).toEqual({ type: "USE", item: "shovel", target: "mound" });
    expect(mapCommand("excavate in earthen mound", actions).action).toEqual({ type: "USE", item: "shovel", target: "mound" });
    expect(mapCommand("shovel out earthen mound", actions).action).toEqual({ type: "USE", item: "shovel", target: "mound" });
  });

  it("should map new TAKE/LOOK/FIGHT/TALK synonyms", () => {
    expect(mapCommand("pocket rusty shovel", actions).action).toEqual({ type: "TAKE", item: "shovel" });
    expect(mapCommand("lift rusty shovel", actions).action).toEqual({ type: "TAKE", item: "shovel" });
    expect(mapCommand("gaze at earthen mound", actions).action).toEqual({ type: "LOOK", target: "mound" });
    expect(mapCommand("slay goblin thief", actions).action).toEqual({ type: "FIGHT", npc: "thief" });
    expect(mapCommand("speak with elven ranger", actions).action).toEqual({ type: "TALK", npc: "ranger" });
  });
});

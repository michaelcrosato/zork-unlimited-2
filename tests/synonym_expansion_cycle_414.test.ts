import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #414 / Player Priority)", () => {
  const actions = [
    { id: "talk-ranger", command: "talk to elven ranger", action: { type: "TALK" as const, npc: "ranger" } },
  ];

  it("should map talk to elf to talk to elven ranger", () => {
    expect(mapCommand("talk to elf", actions).action).toEqual({ type: "TALK", npc: "ranger" });
    expect(mapCommand("chat with ranger", actions).action).toEqual({ type: "TALK", npc: "ranger" });
  });
});

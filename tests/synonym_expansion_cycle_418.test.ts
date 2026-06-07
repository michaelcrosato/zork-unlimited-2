import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #418 / Combat Dialogue Synonym Mapping)", () => {
  const dialogueActions = [
    {
      id: "dialogue_attack",
      command: "ask about attack him",
      action: { type: "ASK" as const, npc: "goblin_thief", topic: "attack_thief" },
    },
  ];

  it("should map attack and fight during dialogue to the attack topic action", () => {
    expect(mapCommand("attack", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "goblin_thief",
      topic: "attack_thief",
    });
    expect(mapCommand("fight", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "goblin_thief",
      topic: "attack_thief",
    });
    expect(mapCommand("kill", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "goblin_thief",
      topic: "attack_thief",
    });
    expect(mapCommand("slay", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "goblin_thief",
      topic: "attack_thief",
    });
  });
});

import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #419 / Transaction-to-Talk Fallback)", () => {
  const actions = [
    { id: "talk-merchant", command: "talk to goblin merchant", action: { type: "TALK" as const, npc: "goblin_merchant" } },
    { id: "talk-ranger", command: "talk to elven ranger", action: { type: "TALK" as const, npc: "elven_ranger" } },
    { id: "talk-master", command: "talk to guild master", action: { type: "TALK" as const, npc: "guild_master" } },
  ];

  it("should map buy boots and purchase boots to talk to goblin merchant due to merchant name boost", () => {
    expect(mapCommand("buy boots", actions).action).toEqual({ type: "TALK", npc: "goblin_merchant" });
    expect(mapCommand("purchase boots", actions).action).toEqual({ type: "TALK", npc: "goblin_merchant" });
  });

  it("should map buy harness from ranger to talk to elven ranger due to noun match", () => {
    expect(mapCommand("buy harness from ranger", actions).action).toEqual({ type: "TALK", npc: "elven_ranger" });
  });

  it("should return disambiguation error for buy harness when multiple non-merchant NPCs exist", () => {
    const nonMerchantActions = [
      { id: "talk-ranger", command: "talk to elven ranger", action: { type: "TALK" as const, npc: "elven_ranger" } },
      { id: "talk-master", command: "talk to guild master", action: { type: "TALK" as const, npc: "guild_master" } },
    ];
    const res = mapCommand("buy harness", nonMerchantActions);
    expect(res.error).toBeDefined();
    expect(res.error).toContain("Did you mean");
    expect(res.error).toContain("talk to elven ranger");
    expect(res.error).toContain("talk to guild master");
  });
});

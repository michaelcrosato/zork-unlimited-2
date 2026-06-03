import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Spell and Weather Synonym Expansion (Cycle #67 / Task-F33)", () => {
  const actions = [
    {
      id: "cast-fireball",
      command: "cast fireball",
      action: { type: "CAST" as const, spell: "fireball", target: "goblin" },
    },
    { id: "cast-freeze", command: "cast freeze", action: { type: "CAST" as const, spell: "freeze", target: "bandit" } },
    {
      id: "cast-lightning",
      command: "cast lightning",
      action: { type: "CAST" as const, spell: "lightning", target: "ghoul" },
    },
    {
      id: "cast-poison",
      command: "cast poison",
      action: { type: "CAST" as const, spell: "poison", target: "monster" },
    },
    { id: "cast-heal", command: "cast heal", action: { type: "CAST" as const, spell: "heal", target: "player" } },
  ];

  it("should map direct spelling variations and target nouns for fireball", () => {
    expect(mapCommand("cast fireball on goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("hurl fireball at goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("cast flame on goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("shoot fireball at goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("use fireball on goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("burn goblin", actions).action).toEqual({ type: "CAST", spell: "fireball", target: "goblin" });
    expect(mapCommand("incinerate goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("ignite goblin", actions).action).toEqual({ type: "CAST", spell: "fireball", target: "goblin" });
    expect(mapCommand("scorch goblin", actions).action).toEqual({ type: "CAST", spell: "fireball", target: "goblin" });
    expect(mapCommand("singe the goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
  });

  it("should map direct spelling variations and target nouns for freeze", () => {
    expect(mapCommand("cast freeze on bandit", actions).action).toEqual({
      type: "CAST",
      spell: "freeze",
      target: "bandit",
    });
    expect(mapCommand("blast ice at bandit", actions).action).toEqual({
      type: "CAST",
      spell: "freeze",
      target: "bandit",
    });
    expect(mapCommand("cast frost at the bandit", actions).action).toEqual({
      type: "CAST",
      spell: "freeze",
      target: "bandit",
    });
    expect(mapCommand("freeze target bandit", actions).action).toEqual({
      type: "CAST",
      spell: "freeze",
      target: "bandit",
    });
    expect(mapCommand("glaciate bandit", actions).action).toEqual({ type: "CAST", spell: "freeze", target: "bandit" });
    expect(mapCommand("chill the bandit", actions).action).toEqual({ type: "CAST", spell: "freeze", target: "bandit" });
  });

  it("should map direct spelling variations and target nouns for lightning", () => {
    expect(mapCommand("cast lightning on ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
    expect(mapCommand("zap current at ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
    expect(mapCommand("electrocut ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
    expect(mapCommand("shock target ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
    expect(mapCommand("spark ghoul", actions).action).toEqual({ type: "CAST", spell: "lightning", target: "ghoul" });
    expect(mapCommand("volt the ghoul", actions).action).toEqual({ type: "CAST", spell: "lightning", target: "ghoul" });
    expect(mapCommand("charge ghoul", actions).action).toEqual({ type: "CAST", spell: "lightning", target: "ghoul" });
  });

  it("should map direct spelling variations and target nouns for poison", () => {
    expect(mapCommand("cast poison on monster", actions).action).toEqual({
      type: "CAST",
      spell: "poison",
      target: "monster",
    });
    expect(mapCommand("hurl toxin at monster", actions).action).toEqual({
      type: "CAST",
      spell: "poison",
      target: "monster",
    });
    expect(mapCommand("poison monster", actions).action).toEqual({ type: "CAST", spell: "poison", target: "monster" });
    expect(mapCommand("infect target monster", actions).action).toEqual({
      type: "CAST",
      spell: "poison",
      target: "monster",
    });
    expect(mapCommand("corrode the monster", actions).action).toEqual({
      type: "CAST",
      spell: "poison",
      target: "monster",
    });
  });

  it("should map direct spelling variations and target nouns for heal", () => {
    expect(mapCommand("cast heal on me", actions).action).toEqual({ type: "CAST", spell: "heal", target: "player" });
    expect(mapCommand("cure myself", actions).action).toEqual({ type: "CAST", spell: "heal", target: "player" });
    expect(mapCommand("restore self", actions).action).toEqual({ type: "CAST", spell: "heal", target: "player" });
    expect(mapCommand("use heal on player", actions).action).toEqual({ type: "CAST", spell: "heal", target: "player" });
    expect(mapCommand("mend self", actions).action).toEqual({ type: "CAST", spell: "heal", target: "player" });
  });

  it("should map environmental and weather synonym groupings correctly", () => {
    const weatherActions = [
      { id: "inspect-weather", command: "inspect weather", action: { type: "INSPECT" as const, target: "weather" } },
      { id: "check-temp", command: "check temperature", action: { type: "INSPECT" as const, target: "temperature" } },
      { id: "feel-wind", command: "feel wind", action: { type: "INSPECT" as const, target: "wind" } },
    ];

    expect(mapCommand("look at climate", weatherActions).action).toEqual({ type: "INSPECT", target: "weather" });
    expect(mapCommand("observe atmosphere", weatherActions).action).toEqual({ type: "INSPECT", target: "weather" });
    expect(mapCommand("check temp", weatherActions).action).toEqual({ type: "INSPECT", target: "temperature" });
    expect(mapCommand("feel breeze", weatherActions).action).toEqual({ type: "INSPECT", target: "wind" });
    expect(mapCommand("sense gale", weatherActions).action).toEqual({ type: "INSPECT", target: "wind" });
  });
});

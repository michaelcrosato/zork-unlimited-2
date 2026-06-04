import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 202 (Task-F240)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "use-lockpick", command: "use lockpick on chest", action: { type: "USE" as const, target: "chest" } },
    { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-door", command: "close heavy door", action: { type: "CLOSE" as const, target: "door" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
  ];

  it("should map newly added movement verbs to MOVE action", () => {
    expect(mapCommand("navigate one's vector of gynogenesis towards the location of east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(mapCommand("steer one's vector of gynogenesis in the direction of the coordinates of east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(mapCommand("direct ones vector of gynogenesis towards the coordinates of the location of east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("subject to a comprehensive visual introspection altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a thorough visual introspection the altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a detailed visual introspection altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume direct exclusive assignment of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume absolute exclusive assignment of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume immediate exclusive assignment of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of all exclusive assignment of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("relinquish all exclusive assignment of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("free oneself from all exclusive assignment of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force completely and magneto-optically wide open vault", actions).action).toEqual({
      type: "OPEN",
      target: "vault",
    });
    expect(mapCommand("fasten completely and magneto-optically closed door", actions).action).toEqual({
      type: "CLOSE",
      target: "door",
    });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    // socrates
    expect(mapCommand("deactivate all socrates security devices of chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass all socrates security devices on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    // plato
    expect(mapCommand("deactivate all plato security devices of chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass all plato security devices on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    // aristotle
    expect(mapCommand("deactivate all aristotle security devices of chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass all aristotle security devices on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    // kant
    expect(mapCommand("deactivate all kant security devices of chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass all kant security devices on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    // disengage primary
    expect(mapCommand("disengage the primary socrates security device on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full magnetotronic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("bring into active magnetotronic deployment lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("make complete magnetotronic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate an uncompromisingly aggressive confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("commence an uncompromisingly aggressive confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("engage in an uncompromisingly aggressive confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a sociological face to face discussion with capo", actions).action).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(mapCommand("engage in a sociological face to face discussion with capo", actions).action).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(mapCommand("strike up a sociological face to face discussion with capo", actions).action).toEqual({
      type: "TALK",
      npc: "capo",
    });
  });
});

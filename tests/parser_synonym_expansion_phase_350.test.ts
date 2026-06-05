import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 350 (Task-F388)", () => {
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
    expect(
      mapCommand("navigate one's vector of microgliocytoclastopoiesis towards the location of east", actions).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "steer one's vector of microgliocytoclastopoiesis in the direction of the coordinates of east",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "direct ones vector of microgliocytoclastopoiesis towards the coordinates of the location of east",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("subject to a comprehensive visual transdeglycosylation altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a thorough visual transdeglycosylation the altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a detailed visual transdeglycosylation altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume direct exclusive dotetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume absolute exclusive dotetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume direct exclusive vicedotetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume immediate exclusive vicedotetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of all exclusive dotetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("relinquish all exclusive dotetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("free oneself from all exclusive vicedotetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force completely and microgliocytoclastorheologically wide open vault", actions).action).toEqual(
      {
        type: "OPEN",
        target: "vault",
      }
    );
    expect(
      mapCommand("force completely and microgliocytoclasto-rheologically wide open vault", actions).action
    ).toEqual({
      type: "OPEN",
      target: "vault",
    });
    expect(
      mapCommand("force completely and microgliocytoclasto rheologically wide open vault", actions).action
    ).toEqual({
      type: "OPEN",
      target: "vault",
    });

    expect(mapCommand("fasten completely and microgliocytoclasto-rheologically closed door", actions).action).toEqual({
      type: "CLOSE",
      target: "door",
    });
    expect(mapCommand("fasten completely and microgliocytoclastorheologically closed door", actions).action).toEqual({
      type: "CLOSE",
      target: "door",
    });
    expect(mapCommand("fasten completely and microgliocytoclasto rheologically closed door", actions).action).toEqual({
      type: "CLOSE",
      target: "door",
    });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(
      mapCommand(
        "deactivate all microgliocytoclastologist and microglioblastoclastologist security devices of chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(
      mapCommand(
        "bypass all microgliocytoclastologists and microglioblastoclastologists security devices on chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(
      mapCommand(
        "disengage the primary microgliocytoclastologist and microglioblastoclastologist security device on chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full microgliocytoclastokinetic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("bring into active microgliocytoclastokinetic deployment lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("make complete microgliocytoclastokinetic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate a/an ferociously blood-shedding confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("commence a/an ferociously blood-shedding confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("engage in a/an ferociously bloodshedding confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(
      mapCommand("initiate a/an microgliocytoclastopathological face to face discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(
      mapCommand("engage in a/an microgliocytoclastopathological face-to-face discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(
      mapCommand("strike up an microgliocytoclastopathological facetoface discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
  });
});

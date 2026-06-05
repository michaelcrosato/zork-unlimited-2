import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 349 (Task-F387)", () => {
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
      mapCommand("navigate one's vector of oligodendrocytoclastopoiesis towards the location of east", actions).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "steer one's vector of oligodendrocytoclastopoiesis in the direction of the coordinates of east",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "direct ones vector of oligodendrocytoclastopoiesis towards the coordinates of the location of east",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("subject to a comprehensive visual transglycosylation altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a thorough visual transglycosylation the altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("subject to a detailed visual transglycosylation altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume direct exclusive hentetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume absolute exclusive hentetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume direct exclusive vicehentetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume immediate exclusive vicehentetracontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of all exclusive hentetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("relinquish all exclusive hentetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
    expect(mapCommand("free oneself from all exclusive vicehentetracontarchy of boots", actions).action).toEqual({
      type: "DROP",
      item: "boots",
    });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(
      mapCommand("force completely and oligodendrocytoclastorheologically wide open vault", actions).action
    ).toEqual({
      type: "OPEN",
      target: "vault",
    });
    expect(
      mapCommand("force completely and oligodendrocytoclasto-rheologically wide open vault", actions).action
    ).toEqual({
      type: "OPEN",
      target: "vault",
    });
    expect(
      mapCommand("force completely and oligodendrocytoclasto rheologically wide open vault", actions).action
    ).toEqual({
      type: "OPEN",
      target: "vault",
    });

    expect(mapCommand("fasten completely and oligodendrocytoclasto-rheologically closed door", actions).action).toEqual(
      {
        type: "CLOSE",
        target: "door",
      }
    );
    expect(mapCommand("fasten completely and oligodendrocytoclastorheologically closed door", actions).action).toEqual({
      type: "CLOSE",
      target: "door",
    });
    expect(mapCommand("fasten completely and oligodendrocytoclasto rheologically closed door", actions).action).toEqual(
      {
        type: "CLOSE",
        target: "door",
      }
    );
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(
      mapCommand(
        "deactivate all oligodendrocytoclastologist and oligodendroblastoclastologist security devices of chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(
      mapCommand(
        "bypass all oligodendrocytoclastologists and oligodendroblastoclastologists security devices on chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(
      mapCommand(
        "disengage the primary oligodendrocytoclastologist and oligodendroblastoclastologist security device on chest",
        actions
      ).action
    ).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full oligodendrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("bring into active oligodendrocytoclastokinetic deployment lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("make complete oligodendrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate a/an ferociously blood-letting confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("commence a/an ferociously blood-letting confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("engage in a/an ferociously bloodletting confrontation against ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(
      mapCommand("initiate a/an oligodendrocytoclastopathological face to face discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(
      mapCommand("engage in a/an oligodendrocytoclastopathological face-to-face discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
    expect(
      mapCommand("strike up an oligodendrocytoclastopathological facetoface discussion with capo", actions).action
    ).toEqual({
      type: "TALK",
      npc: "capo",
    });
  });
});

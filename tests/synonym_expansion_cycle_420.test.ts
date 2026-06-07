import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #420 / Phase 374 Automated & Compound Mappings)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "move-west", command: "go west", action: { type: "MOVE" as const, direction: "west" } },
    { id: "take-shovel", command: "take rusty shovel", action: { type: "TAKE" as const, item: "shovel" } },
    { id: "inspect-mound", command: "inspect earthen mound", action: { type: "INSPECT" as const, target: "mound" } },
    {
      id: "talk-merchant",
      command: "talk to goblin merchant",
      action: { type: "TALK" as const, npc: "goblin_merchant" },
    },
    {
      id: "use-shovel",
      command: "use rusty shovel on earthen mound",
      action: { type: "USE" as const, item: "shovel", target: "mound" },
    },
  ];

  it("should map Phase 374 movement synonyms to MOVE", () => {
    expect(
      mapCommand("navigate one's vector of ependymocytoidcytoclastopoiesis towards the location of east", actions)
        .action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "steer one's vector of ependymocytoidcytoclastopoiesis in the direction of the coordinates of west",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "west",
    });
  });

  it("should map Phase 374 take synonyms to TAKE", () => {
    expect(mapCommand("assume direct exclusive hexahexacontarchy of shovel", actions).action).toEqual({
      type: "TAKE",
      item: "shovel",
    });
    expect(mapCommand("assume absolute exclusive vicehexahexacontarchy of shovel", actions).action).toEqual({
      type: "TAKE",
      item: "shovel",
    });
  });

  it("should map Phase 374 inspect synonyms to INSPECT", () => {
    expect(mapCommand("subject to a comprehensive visual transcometiteation mound", actions).action).toEqual({
      type: "INSPECT",
      target: "mound",
    });
  });

  it("should map Phase 374 dialogue synonyms to TALK", () => {
    expect(
      mapCommand(
        "strike up an ependymocytoidblastocytoclastopathological face-to-face discussion with goblin merchant",
        actions
      ).action
    ).toEqual({
      type: "TALK",
      npc: "goblin_merchant",
    });
  });

  it("should map shorthand dig command 'dig with shovel' directly to USE shovel on mound", () => {
    expect(mapCommand("dig with shovel", actions).action).toEqual({
      type: "USE",
      item: "shovel",
      target: "mound",
    });
    expect(mapCommand("dig with rusty shovel", actions).action).toEqual({
      type: "USE",
      item: "shovel",
      target: "mound",
    });
  });
});

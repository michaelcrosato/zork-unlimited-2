import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #416 / Phase 374 Automated Synonyms)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
  ];

  it("should map Phase 374 movement synonyms to MOVE east", () => {
    expect(
      mapCommand("navigate one's vector of ependymocytoidcytoclastopoiesis towards the location of east", actions)
        .action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(
      mapCommand(
        "steer one's vector of ependymocytoidcytoclastopoiesis in the direction of the coordinates of east",
        actions
      ).action
    ).toEqual({
      type: "MOVE",
      direction: "east",
    });
  });

  it("should map Phase 374 take synonyms to TAKE katana", () => {
    expect(mapCommand("assume direct exclusive hexahexacontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("assume direct exclusive vicehexahexacontarchy of katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
  });
});

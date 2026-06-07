import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #415 / Mock client isolation & Synonyms)", () => {
  const actions = [
    { id: "take-shovel", command: "take rusty shovel", action: { type: "TAKE" as const, item: "shovel" } },
    {
      id: "use-shovel",
      command: "use rusty shovel on earthen mound",
      action: { type: "USE" as const, item: "shovel", target: "mound" },
    },
  ];

  it("should map dig mound with shovel to use rusty shovel on earthen mound", () => {
    expect(mapCommand("dig mound with shovel", actions).action).toEqual({
      type: "USE",
      item: "shovel",
      target: "mound",
    });
    expect(mapCommand("dig earth with shovel", actions).action).toEqual({
      type: "USE",
      item: "shovel",
      target: "mound",
    });
  });

  it("should map retrieve shovel to take rusty shovel", () => {
    expect(mapCommand("retrieve shovel", actions).action).toEqual({ type: "TAKE", item: "shovel" });
    expect(mapCommand("collect shovel", actions).action).toEqual({ type: "TAKE", item: "shovel" });
  });
});

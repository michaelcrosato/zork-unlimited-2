import { describe, it, expect } from "vitest";
import { PERSONAS, PERSONA_IDS, getPersona } from "../src/playtest/personas.js";

describe("PERSONAS", () => {
  it("should define exactly 8 personas", () => {
    expect(Object.keys(PERSONAS)).toHaveLength(8);
  });

  it("should have all required persona IDs", () => {
    const expectedIds = [
      "explorer",
      "speedrunner",
      "adversarial",
      "narrative_seeker",
      "new_player",
      "hoarder",
      "dialogue_skipper",
      "wrong_order",
    ];
    for (const id of expectedIds) {
      expect(PERSONAS[id]).toBeDefined();
      expect(PERSONAS[id].id).toBe(id);
    }
  });

  it("should have non-empty style, priority, and quitThreshold for each persona", () => {
    for (const persona of Object.values(PERSONAS)) {
      expect(persona.style.length).toBeGreaterThan(5);
      expect(persona.priority.length).toBeGreaterThan(5);
      expect(persona.quitThreshold.length).toBeGreaterThan(5);
    }
  });

  it("should have human-readable names", () => {
    expect(PERSONAS.explorer.name).toBe("Explorer");
    expect(PERSONAS.speedrunner.name).toBe("Speedrunner");
    expect(PERSONAS.new_player.name).toBe("New Player");
    expect(PERSONAS.wrong_order.name).toBe("Wrong Order Solver");
  });
});

describe("PERSONA_IDS", () => {
  it("should match PERSONAS keys", () => {
    expect(PERSONA_IDS.sort()).toEqual(Object.keys(PERSONAS).sort());
  });

  it("should have 8 entries", () => {
    expect(PERSONA_IDS).toHaveLength(8);
  });
});

describe("getPersona", () => {
  it("should return a valid persona for known IDs", () => {
    const explorer = getPersona("explorer");
    expect(explorer.id).toBe("explorer");
    expect(explorer.name).toBe("Explorer");

    const speedrunner = getPersona("speedrunner");
    expect(speedrunner.id).toBe("speedrunner");
  });

  it("should throw for unknown persona IDs", () => {
    expect(() => getPersona("unknown_persona")).toThrow("Unknown persona");
    expect(() => getPersona("")).toThrow("Unknown persona");
  });
});

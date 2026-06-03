import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { buildObservation } from "../src/api/observation.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Sensory Narration Variety & Custom Categories", () => {
  it("should categorize and select from larger pools for different room IDs", () => {
    const pack: ParserPack = {
      meta: {
        id: "sensory-variety-test",
        title: "Sensory Variety Test Pack",
        start_room: "room_forest",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "room_forest",
          name: "Deep Forest Path",
          description: "A leaf-covered trail.",
          objects: [],
          npcs: [],
          exits: [],
        },
        {
          id: "room_vault",
          name: "Iron Vault",
          description: "A dark steel chamber.",
          objects: [],
          npcs: [],
          exits: [],
        },
        {
          id: "room_tower",
          name: "Watchtower",
          description: "High stone tower.",
          objects: [],
          npcs: [],
          exits: [],
        },
        {
          id: "room_crossroads",
          name: "Crossroads",
          description: "A meeting of paths.",
          objects: [],
          npcs: [],
          exits: [],
        },
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    // 1. Forest category
    let state = createInitialState({ seed: 42, start: "room_forest" });
    let obs = buildObservation(state, pack);
    expect(obs.mode).toBe("parser");
    let desc = (obs as any).description;
    expect(desc).toContain("A leaf-covered trail.");
    // Forest-specific sensory flavors
    expect(desc).toMatch(/pine needles|owl|loam|watchfulness|leaves crunch|green shadows|cedar|mournful sigh|woodland creature|moss/i);

    // 2. Underground/Vault category
    state.current = "room_vault";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("A dark steel chamber.");
    expect(desc).toMatch(/condensation|hum of shifting earth|sulfur|crystalline|stale water|stone rolls|abyss|confinement|dripping water|scraping|darkness/i);

    // 3. Outpost/Tower category
    state.current = "room_tower";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("High stone tower.");
    expect(desc).toMatch(/battlements|weapons|smoke|arrow loops|oak beams|soot|banners|iron-banded|crest|sentries/i);

    // 4. Settlement/Crossroads category
    state.current = "room_crossroads";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("A meeting of paths.");
    expect(desc).toMatch(/woodsmoke|carriage ruts|signpost|civilization|tavern|rag|insects|lantern light|dust|safety/i);
  });
});

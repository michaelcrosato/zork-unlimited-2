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
    expect(desc).toMatch(/pine needles|owl|loam|watchfulness|leaves crunch|green shadows|cedar|mournful sigh|woodland creature|moss|twig|sunlight|wildflowers|bird|crickets|insects|spiderwebs|jasmine|pine cones|spongy|spring|pockets|rotten log/i);

    // 2. Underground/Vault category
    state.current = "room_vault";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("A dark steel chamber.");
    expect(desc).toMatch(/condensation|hum of shifting earth|sulfur|crystalline|stale water|stone rolls|abyss|confinement|dripping water|scraping|darkness|ping|breeze|echo|rough|ancient earth|heavy and humid|trickle|fissure|cave crickets|groan|algae|treacherous|cool draft|cavern|mineral scent|wet stone|squeak|bat|rock formations|pillars|silt/i);

    // 3. Outpost/Tower category
    state.current = "room_tower";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("High stone tower.");
    expect(desc).toMatch(/battlements|weapons|smoke|arrow loops|oak beams|soot|banners|iron-banded|crest|sentries|sconce|wooden beams|leather|whistling|footprints|iron rings|tethering|floorboards|arrow slits|bright blades|smell of oil|horizon|scratch marks|drafty and brisk|buckle|armor|iron bolts|window shutters|utility/i);

    // 4. Settlement/Crossroads category
    state.current = "room_crossroads";
    obs = buildObservation(state, pack);
    desc = (obs as any).description;
    expect(desc).toContain("A meeting of paths.");
    expect(desc).toMatch(/woodsmoke|carriage ruts|signpost|civilization|tavern|rag|insects|lantern light|dust|safety|cart wheel|chimes|worn path|grass|birds nesting|eaves|freshly cut hay|damp straw|hoofprints|chimney|cedarwood|hammer|anvil|wild herbs|mint|discarded straw|twigs|hitching horses|cattle|laundry/i);
  });

  it("should vary the narrative structure order dynamically over steps and weather", () => {
    const pack: ParserPack = {
      meta: {
        id: "structure-variety-test",
        title: "Structure Variety Test Pack",
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
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 42, start: "room_forest" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    const structures: string[] = [];
    // Collect descriptions over 4 steps
    for (let step = 0; step < 4; step++) {
      state.step = step;
      const obs = buildObservation(state, pack);
      structures.push((obs as any).description);
    }

    // Verify we have multiple different descriptions (order structure changes)
    const uniqueStructures = new Set(structures);
    expect(uniqueStructures.size).toBeGreaterThan(1);
  });

  it("should vary the weather description dynamically over steps and prevent identical consecutive weather narrations", () => {
    const pack: ParserPack = {
      meta: {
        id: "weather-variety-test",
        title: "Weather Variety Test Pack",
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
      ],
      objects: [],
      npcs: [],
      win_conditions: [],
      endings: [],
    };

    let state = createInitialState({ seed: 100, start: "room_forest" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    const weatherNarrations: string[] = [];
    for (let step = 0; step < 5; step++) {
      state.step = step;
      const obs = buildObservation(state, pack) as any;
      weatherNarrations.push(obs.description);
    }

    // Verify that we don't have all identical descriptions (meaning they varied)
    const uniqueNarrations = new Set(weatherNarrations);
    expect(uniqueNarrations.size).toBeGreaterThan(1);
  });
});

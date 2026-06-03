import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Smuggler Syndicate Cartel War Chests, Dynamic Faction Bribes, and Cooperative Turf Guard Recruiting (AF-70)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "warchest_test_pack",
      title: "War Chest Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: 0,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "hideout",
          },
        ],
      },
      {
        id: "hideout",
        name: "Remote Hideout",
        description: "A hidden cavern in the deep woods.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
        ],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support CONTRIBUTE_WAR_CHEST action and deduct personal gold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
    };

    // Contribute 200 gold to war chest
    const res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONTRIBUTE_WAR_CHEST",
          syndicateId: "shadow_cartel",
          amount: 200,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(300); // 500 - 200
    expect(res.state.syndicates?.["shadow_cartel"].warChest).toBe(300); // 100 + 200
  });

  it("should support PAY_FACTION_BRIBE from war chest and personal gold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 300,
      },
    };

    // Pay faction bribe using war chest
    const resChest = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PAY_FACTION_BRIBE",
          factionId: "rangers",
          syndicateId: "shadow_cartel",
          amount: 150,
          useWarChest: true,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(resChest.ok).toBe(true);
    expect(resChest.state.vars["gold"]).toBe(500); // unchanged
    expect(resChest.state.syndicates?.["shadow_cartel"].warChest).toBe(150); // 300 - 150
    expect(resChest.state.bribes?.["rangers"]).toBeDefined();
    expect(resChest.state.bribes?.["rangers"].amount).toBe(150);

    // Pay faction bribe using personal gold
    const resPersonal = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PAY_FACTION_BRIBE",
          factionId: "rangers",
          amount: 100,
          useWarChest: false,
          timestamp: 1006,
        },
      },
      mockPack
    );

    expect(resPersonal.ok).toBe(true);
    expect(resPersonal.state.vars["gold"]).toBe(400); // 500 - 100
    expect(resPersonal.state.bribes?.["rangers"].amount).toBe(100);
  });

  it("should support HIRE_TURF_GUARD using war chest gold and cooperative allied turf checks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 300,
      },
      allied_cartel: {
        id: "allied_cartel",
        name: "Allied Cartel",
        members: ["agent_b"],
        definedBy: "agent_b",
        timestamp: 1000,
        warChest: 50,
      },
    };

    // Establish alliance between shadow_cartel and allied_cartel
    state.syndicateAlliances = {
      shadow_cartel: {
        allied_cartel: "allied",
      },
      allied_cartel: {
        shadow_cartel: "allied",
      },
    };

    // Allied cartel controls market turf
    state.syndicateTurf = {
      market: "allied_cartel",
    };

    // player (member of shadow_cartel) hires a guard in market (controlled by allied_cartel) using shadow_cartel war chest
    const resHire = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 100,
          useWarChest: true,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(resHire.ok).toBe(true);
    expect(resHire.state.syndicates?.["shadow_cartel"].warChest).toBe(200); // 300 - 100
    expect(resHire.state.turfGuards?.["market"]).toBeDefined();
    expect(resHire.state.turfGuards?.["market"].count).toBe(1);
  });

  it("should wire faction bribes and war chests to enforcer heat decay and production heat increase", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 200,
      },
    };

    // Set territory control and enforcer heat
    state.territoryControl = {
      market: "rangers",
    };
    state.enforcementHeat = {
      market: { roomId: "market", heat: 50, timestamp: 10 },
    };

    // 1. Heat decay without active faction bribe or war chest: decays by 1
    let stateDecay1 = tickProductionLabs(state, [], mockPack);
    expect(stateDecay1.enforcementHeat?.["market"].heat).toBe(49); // 50 - 1

    // 2. Heat decay with active faction bribe: decays by 3 (1 base + 2 bonus)
    state.bribes = {
      rangers: { enforcerId: "rangers", amount: 100, timestamp: 10 },
    };
    let stateDecay3 = tickProductionLabs(state, [], mockPack);
    expect(stateDecay3.enforcementHeat?.["market"].heat).toBe(47); // 50 - 3

    // 3. Heat decay with turf syndicate having war chest: decays by 4 (3 + 1 bonus)
    state.syndicateTurf = {
      market: "shadow_cartel",
    };
    let stateDecay4 = tickProductionLabs(state, [], mockPack);
    expect(stateDecay4.enforcementHeat?.["market"].heat).toBe(46); // 50 - 4
  });
});

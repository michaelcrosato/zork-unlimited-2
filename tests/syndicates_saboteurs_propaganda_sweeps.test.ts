import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy, calculateTradePrice } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode, mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEnforcers } from "../src/core/engine.js";

describe("Smuggler Syndicate Cartel Saboteurs, Counter-Intelligence Sweeps, and Global Propaganda Networks (AF-74)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "saboteurs_pack",
      title: "Saboteurs, Sweeps and Propaganda Test Pack",
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
        faction: "rangers",
        objects: [],
        npcs: ["merchant_timmy"],
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
        description: "A hidden cavern in the woods.",
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
    objects: [
      {
        id: "royal_gem",
        name: "royal gem",
        description: "A sparkling contraband gem.",
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Trader",
        description: "A friendly merchant.",
        faction: "rangers",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hello there!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  describe("RECRUIT_SABOTEUR", () => {
    it("should reject recruiting a saboteur if the enforcer is not defeated", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.enforcers = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          currentRoom: "market",
          status: "idle",
          isBountyHunter: false,
          timestamp: 100,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "RECRUIT_SABOTEUR",
            enforcerId: "enforcer_jenkins",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("is not defeated");
    });

    it("should successfully recruit a defeated enforcer as a saboteur and deduct gold", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.enforcers = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          currentRoom: "market",
          status: "defeated",
          isBountyHunter: false,
          timestamp: 100,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "RECRUIT_SABOTEUR",
            enforcerId: "enforcer_jenkins",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(350); // 500 - 150 default cost
      expect(res.state.saboteurs?.["enforcer_jenkins"]).toBeDefined();
      expect(res.state.saboteurs?.["enforcer_jenkins"].status).toBe("active");
      expect(res.state.saboteurs?.["enforcer_jenkins"].syndicateId).toBe("shadow_cartel");
      expect(res.state.journal.some((j) => j.includes("recruited by agent player as a saboteur"))).toBe(true);
    });
  });

  describe("LAUNCH_COUNTER_INTEL_SWEEP", () => {
    it("should successfully pay sweep cost and neutralize active undercover agent moles", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.undercoverAgents = {
        spy_mulder: {
          id: "spy_mulder",
          syndicateId: "shadow_cartel",
          name: "Agent Mulder",
          intelAccumulated: 20,
          status: "active",
          timestamp: 100,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "LAUNCH_COUNTER_INTEL_SWEEP",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(300); // 500 - 200 sweep cost
      expect(res.state.undercoverAgents?.["spy_mulder"].status).toBe("rooted_out");
      expect(res.state.journal.some((j) => j.includes("neutralized undercover agent Agent Mulder"))).toBe(true);
    });

    it("should log clean sweep if no active undercover agents exist for syndicate", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "LAUNCH_COUNTER_INTEL_SWEEP",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.journal.some((j) => j.includes("found no active undercover agents"))).toBe(true);
    });
  });

  describe("Periodic Saboteur Ticking & Sweeps Deflection", () => {
    it("should automatically locate and disable a rival outpost during tickEconomy", () => {
      let state = createInitialState({
        seed: 12, // deterministic seed to force roll <= 0.25 (saboteur sabotage triggers)
        start: "market",
        varsInit: { gold: 500 },
        agentsInit: ["player"],
      });

      // Register outposts and syndicate turf
      state.syndicateTurf = {
        market: "rival_syndicate",
        hideout: "shadow_cartel",
      };

      state.turfGuardOutposts = {
        market: {
          roomId: "market",
          syndicateId: "rival_syndicate",
          securityLevel: 2,
          timestamp: 100,
          disabled: false,
        },
      };

      state.saboteurs = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          syndicateId: "shadow_cartel",
          status: "active",
          timestamp: 100,
        },
      };

      const updated = tickEconomy(state, mockPack);
      expect(updated.turfGuardOutposts?.["market"].disabled).toBe(true);
      expect(updated.journal.some((j) => j.includes("located and disabled rival outpost in room market"))).toBe(true);
    });

    it("should successfully deflect an enforcer sweep at a front business", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 500 },
        agentsInit: ["player"],
      });
      state.step = 5; // Allow front business ticked economy to run

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 100,
        },
      };

      // Set up highly active front business in market
      state.frontBusinesses = {
        front_one: {
          id: "front_one",
          merchantId: "merchant_timmy",
          roomId: "market",
          syndicateId: "shadow_cartel",
          level: 1,
          cleanGold: 200, // triggers enforcer sweep if cleanGold >= 150
          dirtyGold: 50,
          launderingCapacity: 500,
          launderingRate: 40,
          timestamp: 100,
        },
      };

      state.enforcementHeat = {
        market: {
          roomId: "market",
          heat: 30, // >= 25 triggers enforcer sweep
          timestamp: 100,
        },
      };

      // Add active saboteur for our syndicate
      state.saboteurs = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          syndicateId: "shadow_cartel",
          status: "active",
          timestamp: 100,
        },
      };

      const updated = tickEconomy(state, mockPack);

      // Sweep should be deflected, meaning front business gold is NOT confiscated!
      const front = updated.frontBusinesses?.["front_one"];
      expect(front?.cleanGold).toBe(240); // 200 + 40 laundered, not confiscated
      expect(front?.dirtyGold).toBe(10); // 50 - 40 laundered, not confiscated
      expect(
        updated.journal.some((j) => j.includes("successfully deflected the enforcer sweep at front business"))
      ).toBe(true);
    });
  });

  describe("Global Propaganda Network Price Scaling", () => {
    it("should scale cartel price multiplier in allied faction territories by total propaganda level", () => {
      let state = createInitialState({
        seed: 123,
        start: "market",
        varsInit: { gold: 500 },
        agentsInit: ["player"],
      });

      // 1. Establish cartel tied to faction rangers (price multiplier: 1.3)
      state.cartels = {
        rangers_cartel: {
          id: "rangers_cartel",
          name: "Rangers Cartel",
          members: ["merchant_timmy"],
          factionId: "rangers",
          priceMultiplier: 1.3,
          definedBy: "player",
          timestamp: 100,
        },
      };

      // 2. Control market room by rangers
      state.territoryControl = {
        market: "rangers",
      };

      // 3. Factions "rangers" allied with "shadow_cartel"
      state.alliances = {
        shadow_cartel: {
          rangers: "allied",
        },
      };

      // 4. Set up two active propaganda campaigns (total level: 3)
      state.propagandaCampaigns = {
        campaign_one: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          level: 2,
          timestamp: 100,
        },
        campaign_two: {
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          level: 1,
          timestamp: 100,
        },
      };

      const npc = mockPack.npcs?.find((n) => n.id === "merchant_timmy");
      const packObj = mockPack.objects?.find((o) => o.id === "royal_gem");

      // Calculate price when buying royal gem (base cost 100)
      const scaledPrice = calculateTradePrice(
        state,
        npc,
        packObj,
        100,
        true, // isBuy
        "player",
        mockPack
      );

      // Expected calculation:
      // Base cartel price adjustment multiplier is 1.3.
      // Total propaganda level is 2 + 1 = 3.
      // Scaled cartel multiplier: 1.0 + (1.3 - 1.0) * (1.0 + 3 * 0.15) = 1.0 + 0.3 * 1.45 = 1.435.
      // Base cost 100 * 1.435 = 143.5 -> Math.round(143.5) = 144 gold!
      expect(scaledPrice).toBe(144);
    });
  });

  describe("Gossip P2P Synchronization", () => {
    it("should merge saboteurs correctly using LWW", () => {
      const stateA = createInitialState({
        seed: 123,
        start: "market",
        agentsInit: ["player"],
      });
      stateA.saboteurs = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          syndicateId: "shadow_cartel",
          status: "active",
          timestamp: 100,
        },
      };

      const stateB = createInitialState({
        seed: 123,
        start: "market",
        agentsInit: ["player"],
      });
      stateB.saboteurs = {
        enforcer_jenkins: {
          id: "enforcer_jenkins",
          name: "Officer Jenkins",
          syndicateId: "shadow_cartel",
          status: "compromised",
          timestamp: 200, // newer write
        },
        enforcer_brady: {
          id: "enforcer_brady",
          name: "Officer Brady",
          syndicateId: "shadow_cartel",
          status: "active",
          timestamp: 150,
        },
      };

      const mergedState = mergeMonotonicStateFields(stateA, stateB);
      const merged = mergedState.saboteurs;

      expect(merged?.["enforcer_jenkins"]).toBeDefined();
      expect(merged?.["enforcer_jenkins"].status).toBe("compromised"); // LWW won
      expect(merged?.["enforcer_brady"]).toBeDefined();
      expect(merged?.["enforcer_brady"].status).toBe("active");
    });
  });

  describe("RECRUIT_ELITE_ENFORCER (AF-75)", () => {
    it("should successfully recruit an elite enforcer if faction rep >= 50 and agent has enough gold", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.factionRep = {
        rangers: 60, // >= 50
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "RECRUIT_ELITE_ENFORCER",
            npcId: "merchant_timmy",
            factionId: "rangers",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.eliteEnforcers?.["merchant_timmy"]).toBeDefined();
      expect(res.state.eliteEnforcers?.["merchant_timmy"].status).toBe("active");
      expect(res.state.vars["gold"]).toBe(250); // 500 - 250
    });

    it("should reject recruiting an elite enforcer if faction rep < 50", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.factionRep = {
        rangers: 40, // < 50
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "RECRUIT_ELITE_ENFORCER",
            npcId: "merchant_timmy",
            factionId: "rangers",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("is too low");
    });
  });

  describe("LAUNCH_COUNTER_SABOTAGE (AF-75)", () => {
    it("should successfully neutralize active rival saboteurs", () => {
      let state = createInitialState({
        seed: 123,
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
          timestamp: 100,
        },
      };

      state.saboteurs = {
        rival_saboteur: {
          id: "rival_saboteur",
          name: "Rival Saboteur",
          syndicateId: "other_syndicate",
          status: "active",
          timestamp: 100,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "LAUNCH_COUNTER_SABOTAGE",
            syndicateId: "shadow_cartel",
            timestamp: 105,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.saboteurs?.["rival_saboteur"].status).toBe("compromised");
      expect(res.state.vars["gold"]).toBe(300); // 500 - 200
    });
  });

  describe("Elite Enforcer & Bounty Ticking Ticks (AF-75)", () => {
    it("should allow elite enforcers to execute rival guards and reduce heat", () => {
      let state = createInitialState({
        seed: 123,
        start: "market",
        agentsInit: ["player"],
      });

      state.eliteEnforcers = {
        elite_ranger: {
          id: "elite_ranger",
          name: "Elite Ranger",
          factionId: "rangers",
          syndicateId: "shadow_cartel",
          status: "active",
          timestamp: 100,
        },
      };

      state.turfGuards = {
        market: {
          roomId: "market",
          syndicateId: "rival_syndicate",
          count: 3,
          cost: 100,
          timestamp: 100,
        },
      };

      // Perform tickEconomy
      let tickedState = tickEconomy(state, mockPack);
      expect(tickedState.turfGuards?.["market"].count).toBe(2);

      // Now with no rival guards, it should reduce heat
      tickedState.turfGuards = {}; // Clear rival turf guards so elite enforcer falls back to heat reduction
      tickedState.enforcementHeat = {
        market: {
          roomId: "market",
          heat: 50,
          timestamp: 100,
        },
      };
      tickedState.syndicateTurf = {
        market: "shadow_cartel",
      };

      tickedState = tickEconomy(tickedState, mockPack);
      expect(tickedState.enforcementHeat?.["market"].heat).toBe(10); // 50 - 40
    });

    it("should automatically track high-reputation players carrying contraband", () => {
      let state = createInitialState({
        seed: 123,
        start: "market",
        agentsInit: ["player"],
      });

      // Player carries contraband item 'royal_gem'
      state.inventory = ["royal_gem"];

      // Player has high reputation
      state.factionRep = {
        rangers: 60,
      };

      const events: any[] = [];
      let tickedState = tickEnforcers(state, events, mockPack);

      expect(tickedState.bounties?.["player"]).toBeDefined();
      expect(tickedState.bounties?.["player"].active).toBe(true);
      expect(tickedState.enforcers?.["bounty_hunter_player"]).toBeDefined();
      expect(tickedState.enforcers?.["bounty_hunter_player"].status).toBe("pursuing");
      expect(tickedState.enforcers?.["bounty_hunter_player"].targetId).toBe("player");
    });
  });
});

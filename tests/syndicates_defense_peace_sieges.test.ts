import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Territory Defense Networks, Faction Counter-Attacks, and P2P Peace Treaties (AF-72)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "defense_peace_pack",
      title: "Defense and Peace Test Pack",
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
        npcs: ["timmy"],
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

  describe("BUILD_DEFENSE_FORTRESS", () => {
    it("should successfully build a defense fortress if territory is controlled and cost is paid", () => {
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
        },
      };

      // Syndicate controls territory market
      state.territoryControl = {
        market: "shadow_cartel",
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "BUILD_DEFENSE_FORTRESS",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(300); // 500 - 200 cost
      expect(res.state.defenseFortresses?.["market"]).toBeDefined();
      expect(res.state.defenseFortresses?.["market"].fortressLevel).toBe(1);
      expect(res.state.defenseFortresses?.["market"].syndicateId).toBe("shadow_cartel");
    });

    it("should support upgrading an existing defense fortress to a higher level", () => {
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
        },
      };

      state.territoryControl = {
        market: "shadow_cartel",
      };

      // Pre-exist level 1 fortress
      state.defenseFortresses = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          fortressLevel: 1,
          timestamp: 1000,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "BUILD_DEFENSE_FORTRESS",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(300);
      expect(res.state.defenseFortresses?.["market"].fortressLevel).toBe(2);
    });

    it("should fail to build defense fortress if room is not controlled by the syndicate", () => {
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
        },
      };

      // Control belongs to Rangers, not syndicate!
      state.territoryControl = {
        market: "rangers",
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "BUILD_DEFENSE_FORTRESS",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("does not control territory");
    });

    it("should fail to build defense fortress if agent has insufficient gold", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 50 },
        agentsInit: ["player"],
      });

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 1000,
        },
      };

      state.territoryControl = {
        market: "shadow_cartel",
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "BUILD_DEFENSE_FORTRESS",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("Insufficient gold");
    });
  });

  describe("PROPOSE_PEACE_TREATY", () => {
    it("should successfully record a vote and ratify the peace treaty when majority of syndicate members vote true", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: {},
        agentsInit: ["player", "agent_b", "agent_c"],
      });

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player", "agent_b", "agent_c"],
          definedBy: "player",
          timestamp: 1000,
        },
      };

      // Set initial hot war
      state.factionWars = {
        shadow_cartel: {
          rangers: true,
        },
      };

      // 1. First member votes for peace. Yes votes = 1 (1 / 3 = 33% <= 50%).
      // War should still be active.
      let res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_PEACE_TREATY",
            syndicateId: "shadow_cartel",
            factionId: "rangers",
            vote: true,
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);

      // 2. Second member votes for peace. Yes votes = 2 (2 / 3 = 67% > 50%).
      // Consensus achieved! War status should end.
      res = multiAgentStep(
        res.state,
        {
          agentId: "agent_b",
          action: {
            type: "PROPOSE_PEACE_TREATY",
            syndicateId: "shadow_cartel",
            factionId: "rangers",
            vote: true,
            timestamp: 1010,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(false);
    });

    it("should fail to propose peace treaty if not at war with the faction", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: {},
        agentsInit: ["player"],
      });

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 1000,
        },
      };

      // Not at war!
      state.factionWars = {
        shadow_cartel: {
          rangers: false,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_PEACE_TREATY",
            syndicateId: "shadow_cartel",
            factionId: "rangers",
            vote: true,
            timestamp: 1005,
          },
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("is not at war with faction");
    });

    it("should converge peace treaty votes and war status over the Gossip mesh", () => {
      const nodeA = new GossipNode("player", mockPack, 12345);
      const nodeB = new GossipNode("agent_b", mockPack, 12345);

      nodeA.connect(nodeB);

      // Create syndicate on A
      nodeA.executeLocalAction({
        type: "CREATE_SYNDICATE",
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "agent_b"],
        timestamp: 1000,
      });

      // Declare war on A
      nodeA.executeLocalAction({
        type: "DECLARE_FACTION_WAR",
        syndicateId: "shadow_cartel",
        factionId: "rangers",
        timestamp: 1002,
      });

      // Sync A to B
      nodeB.receiveGossip(nodeA.generateGossipMessageFor("agent_b"));

      expect(nodeB.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);

      // Node A votes FOR peace
      nodeA.executeLocalAction({
        type: "PROPOSE_PEACE_TREATY",
        syndicateId: "shadow_cartel",
        factionId: "rangers",
        vote: true,
        timestamp: 1005,
      });

      // Node B votes FOR peace
      nodeB.executeLocalAction({
        type: "PROPOSE_PEACE_TREATY",
        syndicateId: "shadow_cartel",
        factionId: "rangers",
        vote: true,
        timestamp: 1010,
      });

      // Sync B to A
      nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

      // Sync A to B
      nodeB.receiveGossip(nodeA.generateGossipMessageFor("agent_b"));

      // Consensus of 2/2 votes reached! Both should have ended war
      expect(nodeA.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(false);
      expect(nodeB.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(false);
    });
  });

  describe("Faction Counter-Attacks and Sieges", () => {
    it("should successfully repel a counter-attack under step % 10 if success prob rolls favorably", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: {},
        agentsInit: ["player"],
      });

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 1000,
          warChest: 1000, // High war chest gives 30% bonus
        },
      };

      state.territoryControl = {
        market: "shadow_cartel",
      };

      state.factionWars = {
        shadow_cartel: {
          rangers: true, // rangers at war with syndicate
        },
      };

      // Outpost level 5 (50% bonus) + fortress level 2 (60% bonus) + warChest (30% bonus) + base 20% = 100% success rate!
      state.defenseFortresses = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          fortressLevel: 2,
          timestamp: 1000,
        },
      };

      state.turfGuardOutposts = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          securityLevel: 5,
          timestamp: 1000,
        },
      };

      state.step = 10; // Trigger step

      const ticked = tickEconomy(state, mockPack);

      // Should repel successfully (100% chance)
      expect(ticked.territoryControl?.["market"]).toBe("shadow_cartel");
      expect(ticked.defenseFortresses?.["market"]).toBeDefined();
      expect(ticked.turfGuardOutposts?.["market"]).toBeDefined();
      expect(ticked.journal.some((line) => line.includes("successfully repelled"))).toBe(true);
    });

    it("should lose territory and destroy defense networks upon a failed defense roll", () => {
      // Use seed 99999 which rolls high to ensure failure on a 20% base rate
      let state = createInitialState({
        seed: 99999,
        start: "market",
        varsInit: {},
        agentsInit: ["player"],
      });

      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 1000,
          warChest: 0, // No war chest bonus
        },
      };

      state.territoryControl = {
        market: "shadow_cartel",
      };

      state.factionWars = {
        shadow_cartel: {
          rangers: true,
        },
      };

      // No fortress, no outpost = 20% success rate.
      // Set up the outpost and fortress so we can assert their destruction on failure.
      state.defenseFortresses = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          fortressLevel: 0, // 0 bonus
          timestamp: 1000,
        },
      };

      state.turfGuardOutposts = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          securityLevel: 0, // 0 bonus
          timestamp: 1000,
        },
      };

      state.turfGuards = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          count: 3,
          cost: 0,
          timestamp: 1000,
        },
      };

      state.step = 10; // Trigger step

      const ticked = tickEconomy(state, mockPack);

      // Territory control reclaimed by faction (removed from syndicate control)
      expect(ticked.territoryControl?.["market"]).toBeUndefined();

      // All local defenses in that room destroyed!
      expect(ticked.defenseFortresses?.["market"]).toBeUndefined();
      expect(ticked.turfGuardOutposts?.["market"]).toBeUndefined();
      expect(ticked.turfGuards?.["market"]).toBeUndefined();

      expect(ticked.journal.some((line) => line.includes("successfully reclaimed"))).toBe(true);
    });
  });
});

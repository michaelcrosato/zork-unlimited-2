import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode } from "../src/core/gossip.js";
import { step } from "../src/core/engine.js";

describe("Smuggler Syndicate Cartel Special Operations, Sabotage Covert Cells, and Territory Conquest Propaganda (AF-73)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "special_ops_pack",
      title: "Special Operations and Propaganda Test Pack",
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

  describe("ESTABLISH_COVERT_CELL", () => {
    it("should successfully establish a covert cell if room has native faction and cost is paid", () => {
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

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "ESTABLISH_COVERT_CELL",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(350); // 500 - 150 cost
      expect(res.state.covertCells?.["market"]).toBeDefined();
      expect(res.state.covertCells?.["market"].cellLevel).toBe(1);
      expect(res.state.covertCells?.["market"].syndicateId).toBe("shadow_cartel");
    });

    it("should support upgrading an existing covert cell to a higher level", () => {
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

      // Pre-exist level 1 cell
      state.covertCells = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          cellLevel: 1,
          timestamp: 1000,
        },
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "ESTABLISH_COVERT_CELL",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(350);
      expect(res.state.covertCells?.["market"].cellLevel).toBe(2);
    });

    it("should fail if room does not have a native faction", () => {
      let state = createInitialState({
        seed: 12345,
        start: "hideout",
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

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "ESTABLISH_COVERT_CELL",
            roomId: "hideout", // Has no native faction in mockPack
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("must have a native faction");
    });

    it("should fail if territory is already controlled by this syndicate", () => {
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

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "ESTABLISH_COVERT_CELL",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(false);
      expect(res.rejectionReason).toContain("already controls this territory");
    });
  });

  describe("BROADCAST_PROPAGANDA", () => {
    it("should successfully broadcast propaganda, deducting gold and increasing dominance & faction rep", () => {
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
          dominance: 50,
        },
      };

      state.factionRep = {
        rangers: 10,
      };

      const res = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "BROADCAST_PROPAGANDA",
            roomId: "market",
            syndicateId: "shadow_cartel",
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(400); // 500 - 100 cost
      expect(res.state.propagandaCampaigns?.["market_shadow_cartel"]).toBeDefined();
      expect(res.state.propagandaCampaigns?.["market_shadow_cartel"].level).toBe(1);
      expect(res.state.syndicates?.["shadow_cartel"].dominance).toBe(55); // increased by 5
      expect(res.state.factionRep?.["rangers"]).toBe(15); // increased by 5
    });
  });

  describe("Covert Cell & Propaganda Siege bypass & Sabotage ticking", () => {
    it("should support bypassing faction counter-attacks deterministically if a cell/propaganda is present", () => {
      let state = createInitialState({
        seed: 100,
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

      state.factionWars = {
        shadow_cartel: {
          rangers: true,
        },
      };

      // Add high level cell to trigger a siege bypass (level 6 guarantees bypass as 6 * 20% = 120% > 100%)
      state.covertCells = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          cellLevel: 6,
          timestamp: 1000,
        },
      };

      state.step = 10; // economics ticks siege checks every 10 steps

      const tickedState = tickEconomy(state, mockPack);

      // Verify that counter-attack was bypassed (syndicate control remains intact!)
      expect(tickedState.territoryControl?.["market"]).toBe("shadow_cartel");
      expect(tickedState.journal.some(j => j.includes("successfully sabotaged the rangers siege plans"))).toBe(true);
    });

    it("should disable local hostile outposts during periodic sabotage checks", () => {
      let state = createInitialState({
        seed: 1,
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

      state.covertCells = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          cellLevel: 5,
          timestamp: 1000,
        },
      };

      // Outpost belonging to rival cartel
      state.turfGuardOutposts = {
        market: {
          roomId: "market",
          syndicateId: "rival_cartel",
          securityLevel: 3,
          timestamp: 1000,
        },
      };

      state.step = 1;

      // Deterministically find a seed that triggers outpost sabotage choice
      let tickedState;
      let found = false;
      for (let s = 1; s <= 100; s++) {
        let tempState = { ...state, seed: s };
        const res = tickEconomy(tempState, mockPack);
        if (res.turfGuardOutposts?.["market"].disabled === true) {
          tickedState = res;
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
      expect(tickedState!.turfGuardOutposts?.["market"].disabled).toBe(true);
      expect(tickedState!.journal.some(j => j.includes("sabotaged and disabled the local hostile outpost"))).toBe(true);
    });
  });

  describe("Enforcer pursuit slow-down & travel tax/toll discounts", () => {
    it("should slow enforcer movement ticks when pursuing through covert cells / propaganda", () => {
      let state = createInitialState({
        seed: 10, // Roll to slow
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

      // Covert cell in the enforcer's current room
      state.covertCells = {
        market: {
          roomId: "market",
          syndicateId: "shadow_cartel",
          cellLevel: 4,
          timestamp: 1000,
        },
      };

      // Add a bounty hunter pursuing the player
      state.enforcers = {
        hunter1: {
          id: "hunter1",
          name: "Bounty Hunter Bill",
          currentRoom: "market",
          targetId: "player",
          status: "pursuing",
          isBountyHunter: true,
          timestamp: 1000,
        },
      };

      // Trigger movement or step checking enforcer tick
      const res = step(state, { type: "MOVE", direction: "NORTH" }, mockPack, "player");

      // Verify enforcer did not catch up or was slowed
      expect(res.ok).toBe(true);
      expect(res.state.enforcers?.["hunter1"].currentRoom).toBe("market"); // Still in market, pursuit slowed!
    });

    it("should scale down travel taxes and extortion tolls upon entry to room with covert cells / propaganda", () => {
      let state = createInitialState({
        seed: 123,
        start: "market",
        varsInit: { gold: 500 },
        agentsInit: ["player"],
      });

      // Syndicate
      state.syndicates = {
        shadow_cartel: {
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player"],
          definedBy: "player",
          timestamp: 1000,
        },
      };

      // Covert Cell at level 2 (50% discount) in hideout
      state.covertCells = {
        hideout: {
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          cellLevel: 2,
          timestamp: 1000,
        },
      };

      // Territory belongs to Rangers, who are at war (4x travel tax)
      state.territoryControl = {
        hideout: "rangers",
      };

      state.factionRep = {
        rangers: -10, // Poor rep, base tax = 10
      };

      state.factionWars = {
        shadow_cartel: {
          rangers: true,
        },
      };

      // Normally: base tax 10 * war scaling 4 = 40 gold.
      // With level 2 cell (50% discount): 40 * 0.5 = 20 gold.
      
      const res = step(state, { type: "MOVE", direction: "NORTH" }, mockPack, "player");

      expect(res.ok).toBe(true);
      expect(res.state.vars["gold"]).toBe(480); // 500 - 20 tax (normally 40)
    });
  });
});

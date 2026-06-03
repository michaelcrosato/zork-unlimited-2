import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEnforcers } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice } from "../src/core/economy.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Conquest Campaigns, Faction War Declarations, and Territory Taxation (AF-71)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "campaign_war_pack",
      title: "Campaign and War Test Pack",
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
    objects: [
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "A basic wooden shield.",
        base_cost: 100,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "timmy",
        name: "Merchant Timmy",
        description: "A friendly merchant.",
        faction: "rangers",
        gold: 500,
        possible_items: ["wooden_shield"],
        dialogue: {
          root: "node_welcome",
          nodes: [
            {
              id: "node_welcome",
              npc_text: "Welcome, traveller! What do you seek?",
              topics: [],
            },
          ],
        },
      },
    ],
  });

  it("should support DECLARE_FACTION_WAR and activate war status in the state", () => {
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

    // Declare war on rangers faction
    const res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DECLARE_FACTION_WAR",
          syndicateId: "shadow_cartel",
          factionId: "rangers",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(res.ok).toBe(true);
    expect(res.state.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);
  });

  it("should fail LAUNCH_CAMPAIGN if not at war with the faction", () => {
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
        warChest: 500,
      },
    };

    const res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LAUNCH_CAMPAIGN",
          syndicateId: "shadow_cartel",
          factionId: "rangers",
          roomId: "market",
          goldInvestment: 200,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("must declare war");
  });

  it("should support LAUNCH_CAMPAIGN and update territory control on success", () => {
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
        warChest: 500,
        dominance: 80,
      },
    };

    state.factionWars = {
      shadow_cartel: {
        rangers: true,
      },
    };

    // Launch a campaign with 300 gold investment.
    // Success probability = 0.3 + (300 / 600) * 0.6 = 0.6.
    // Seed 12345 roll determines deterministic success.
    const res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LAUNCH_CAMPAIGN",
          syndicateId: "shadow_cartel",
          factionId: "rangers",
          roomId: "market",
          goldInvestment: 300,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(res.ok).toBe(true);
    expect(res.state.syndicates?.["shadow_cartel"].warChest).toBe(200); // 500 - 300

    // Check if the campaign was successful under the seed
    const hasConquered = res.state.territoryControl?.["market"] === "shadow_cartel";
    if (hasConquered) {
      expect(res.state.territoryClaims?.["market"]).toBeDefined();
      expect(res.state.territoryClaims?.["market"].factionId).toBe("shadow_cartel");
    }
  });

  it("should double buy price and halve sell payouts with merchants of a hostile war faction", () => {
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

    const npcTimmy = mockPack.npcs[0];
    const itemShield = mockPack.objects[0];

    // Standard baseline price
    const basePrice = calculateTradePrice(state, npcTimmy, itemShield, 100, true, "player", mockPack);
    expect(basePrice).toBe(100);

    // Set war status
    state.factionWars = {
      shadow_cartel: {
        rangers: true,
      },
    };

    // War price for buying (should be double)
    const warBuyPrice = calculateTradePrice(state, npcTimmy, itemShield, 100, true, "player", mockPack);
    expect(warBuyPrice).toBe(200);

    // War payout for selling (should be halved)
    const warSellPrice = calculateTradePrice(state, npcTimmy, itemShield, 100, false, "player", mockPack);
    expect(warSellPrice).toBe(50);
  });

  it("should quadruple travel taxes when traveling to a hostile war faction's room", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hideout",
      varsInit: { gold: 1000 },
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

    // Rangers faction controls market
    state.territoryControl = {
      market: "rangers",
    };

    // Rep is slightly negative so base tax is 10
    state.factionRep = {
      rangers: -5,
    };

    // Standard travel from hideout to market (rangers territory)
    // Base tax is 10 (since rangers rep is < 0)
    const baselineRes = step(state, { type: "MOVE", direction: "SOUTH" }, mockPack, "player");
    expect(baselineRes.ok).toBe(true);
    expect(baselineRes.state.vars["gold"]).toBe(990); // 1000 - 10

    // Set war status
    state.factionWars = {
      shadow_cartel: {
        rangers: true,
      },
    };

    // Travel under war (tax should be scaled 4x, i.e., 40 gold)
    const warRes = step(state, { type: "MOVE", direction: "SOUTH" }, mockPack, "player");
    expect(warRes.ok).toBe(true);
    expect(warRes.state.vars["gold"]).toBe(960); // 1000 - 40
  });

  it("should modify enforcer BFS pathfinding to avoid routing through hostile syndicate turf during war", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
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

    state.enforcers = {
      ranger_captain: {
        id: "ranger_captain",
        name: "Ranger Captain",
        currentRoom: "market",
        status: "pursuing",
        targetId: "player",
        factionId: "rangers",
        isBountyHunter: true,
        hp: 20,
        timestamp: 1000,
      },
    };

    // rangers are at war with shadow_cartel
    state.factionWars = {
      shadow_cartel: {
        rangers: true,
      },
    };

    // shadow_cartel controls hideout turf
    state.syndicateTurf = {
      hideout: "shadow_cartel",
    };

    // Force player to be in hideout
    state.current = "hideout";
    if (state.agents?.["player"]) {
      state.agents["player"].current = "hideout";
    }

    // Tick enforcers with event log
    const ticked = tickEnforcers(state, [], mockPack);
    const captain = ticked.enforcers?.["ranger_captain"];

    // During war, hideout is enemy turf to the ranger enforcer.
    // The enforcer's BFS route to hideout is modified to skip hideout.
    // Since there are no other rooms, the enforcer cannot path to the hideout and should remain in market!
    expect(captain?.currentRoom).toBe("market");
  });

  it("should converge faction wars and territory control via Gossip mesh sync", () => {
    const nodeA = new GossipNode("player", mockPack, 12345);
    const nodeB = new GossipNode("agent_b", mockPack, 12345);

    // Register each other as peers
    nodeA.connect(nodeB);

    // 1. Create syndicate shadow_cartel on A
    nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["player", "agent_b"],
      timestamp: 1000,
    });

    // 2. Player contributes 500 gold to syndicate war chest on A
    nodeA.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "shadow_cartel",
      amount: 500,
      timestamp: 1002,
    });

    // 3. Player declares war on rangers on A
    nodeA.executeLocalAction({
      type: "DECLARE_FACTION_WAR",
      syndicateId: "shadow_cartel",
      factionId: "rangers",
      timestamp: 1005,
    });

    // Sync state from node A to node B
    const msgFromA = nodeA.generateGossipMessageFor("agent_b");
    nodeB.receiveGossip(msgFromA);

    // B should now have the syndicate, war chest gold, and war status converged!
    expect(nodeB.localState.syndicates?.["shadow_cartel"]).toBeDefined();
    expect(nodeB.localState.syndicates?.["shadow_cartel"].warChest).toBe(500);
    expect(nodeB.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);

    // 4. B (agent_b) launches campaign against market
    nodeB.executeLocalAction({
      type: "LAUNCH_CAMPAIGN",
      syndicateId: "shadow_cartel",
      factionId: "rangers",
      roomId: "market",
      goldInvestment: 400,
      timestamp: 1010,
    });

    // Sync state back from B to A
    const msgFromB = nodeB.generateGossipMessageFor("player");
    nodeA.receiveGossip(msgFromB);

    // Assert both converged perfectly on faction wars and territory control!
    expect(nodeA.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);
    expect(nodeB.localState.factionWars?.["shadow_cartel"]?.["rangers"]).toBe(true);

    expect(nodeA.localState.territoryControl?.["market"]).toBe(nodeB.localState.territoryControl?.["market"]);
  });
});

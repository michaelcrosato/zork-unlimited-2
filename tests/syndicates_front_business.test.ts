import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Crime Syndicate Laundering & Front Businesses (AF-50)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_front_business_test_pack",
      title: "Front Business and Laundering Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Merchant",
        description: "A friendly local merchant.",
        hp: 30,
        max_hp: 30,
        attack: 1,
        defense: 1,
        gold: 100,
        xp: 15,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome to my store!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should successfully buy a front business and reject invalid purchases", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500, gold_agent_bob: 100 },
      agentsInit: ["player", "agent_bob"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 75,
      },
    };

    // 1. Unsuccessful Buy: Agent not member of syndicate
    const badAgentRes = multiAgentStep(
      state,
      {
        agentId: "agent_bob",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_timmy",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(badAgentRes.ok).toBe(false);
    expect(badAgentRes.rejectionReason).toContain("is not a member of syndicate");

    // 2. Unsuccessful Buy: Merchant does not exist
    const badMerchantRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_ghost",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(badMerchantRes.ok).toBe(false);
    expect(badMerchantRes.rejectionReason).toContain("does not exist in content pack");

    // 3. Unsuccessful Buy: Insufficient gold
    const poorRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_timmy",
          syndicateId: "shadow_cartel",
          cost: 1000,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(poorRes.ok).toBe(false);
    expect(poorRes.rejectionReason).toContain("Insufficient gold");

    // 4. Successful Buy
    const buyRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_timmy",
          syndicateId: "shadow_cartel",
          cost: 200,
          timestamp: 1004,
        } as any,
      },
      mockPack
    );
    expect(buyRes.ok).toBe(true);
    expect(buyRes.state.vars["gold"]).toBe(300);
    const front = buyRes.state.frontBusinesses?.["merchant_timmy"];
    expect(front).toBeDefined();
    expect(front?.id).toBe("front_merchant_timmy");
    expect(front?.roomId).toBe("market");
    expect(front?.syndicateId).toBe("shadow_cartel");
    expect(front?.dirtyGold).toBe(0);
    expect(front?.cleanGold).toBe(0);

    // 5. Unsuccessful Buy: Already purchased
    const doubleRes = multiAgentStep(
      buyRes.state,
      {
        agentId: "player",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_timmy",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(doubleRes.ok).toBe(false);
    expect(doubleRes.rejectionReason).toContain("already owned as a front business");
  });

  it("should successfully deposit gold for laundering and reject invalid deposits", () => {
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
        dominance: 80,
      },
    };

    // Buy front business
    const buyRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_FRONT_BUSINESS",
          merchantId: "merchant_timmy",
          syndicateId: "shadow_cartel",
          cost: 200,
          timestamp: 1004,
        } as any,
      },
      mockPack
    );
    expect(buyRes.ok).toBe(true);

    let stateWithFront = buyRes.state;

    // 1. Unsuccessful Launder: Front business does not exist for ghost merchant
    const badGhostRes = multiAgentStep(
      stateWithFront,
      {
        agentId: "player",
        action: {
          type: "LAUNDER_GOLD",
          merchantId: "merchant_ghost",
          amount: 50,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badGhostRes.ok).toBe(false);
    expect(badGhostRes.rejectionReason).toContain("No front business exists for merchant");

    // 2. Unsuccessful Launder: Insufficient gold
    const poorRes = multiAgentStep(
      stateWithFront,
      {
        agentId: "player",
        action: {
          type: "LAUNDER_GOLD",
          merchantId: "merchant_timmy",
          amount: 500,
          timestamp: 1006,
        } as any,
      },
      mockPack
    );
    expect(poorRes.ok).toBe(false);
    expect(poorRes.rejectionReason).toContain("Insufficient gold to launder");

    // 3. Successful Launder
    const launderRes = multiAgentStep(
      stateWithFront,
      {
        agentId: "player",
        action: {
          type: "LAUNDER_GOLD",
          merchantId: "merchant_timmy",
          amount: 150,
          timestamp: 1007,
        } as any,
      },
      mockPack
    );
    expect(launderRes.ok).toBe(true);
    expect(launderRes.state.vars["gold"]).toBe(150);
    expect(launderRes.state.frontBusinesses?.["merchant_timmy"].dirtyGold).toBe(150);

    // 4. Unsuccessful Launder: Exceed capacity (capacity: 500)
    const excessRes = multiAgentStep(
      launderRes.state,
      {
        agentId: "player",
        action: {
          type: "LAUNDER_GOLD",
          merchantId: "merchant_timmy",
          amount: 400,
          timestamp: 1008,
        } as any,
      },
      mockPack
    );
    expect(excessRes.ok).toBe(false);
    expect(excessRes.rejectionReason).toContain("would exceed laundering capacity");
  });

  it("should launder dirty gold and reduce enforcer heat periodically in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0, gold_agent_bob: 0 },
      agentsInit: ["player", "agent_bob"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "agent_bob"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 75,
      },
    };

    // Set up a front business with dirty gold
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 0,
        launderingCapacity: 500,
        launderingRate: 40,
        timestamp: 1000,
      },
    };

    // Set up some enforcement heat in the room
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 20,
        timestamp: 1000,
      },
    };

    // Set step to 5 to trigger the modulo check (step % 5 === 0)
    state.step = 5;

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Verify laundering occurred
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.dirtyGold).toBe(60); // 100 - 40
    expect(front?.cleanGold).toBe(40);

    // Verify gold was distributed to members (player and agent_bob get 20 each)
    expect(tickedState.vars["gold"]).toBe(20);
    expect(tickedState.vars["gold_agent_bob"]).toBe(20);
    expect(tickedState.vars["totalDirtyGoldLaundered"]).toBe(40);

    // Verify heat reduction based on dominance (dominance: 75, level: 1 -> heatReduction = floor(75/25)*1 = 3)
    // New heat: 20 - 3 = 17
    expect(tickedState.enforcementHeat?.["market"].heat).toBe(17);
  });
});

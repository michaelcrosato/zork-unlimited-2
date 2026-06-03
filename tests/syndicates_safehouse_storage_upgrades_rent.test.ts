import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { getSafehouseStorageCapacity } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Contraband Safehouse Storage Upgrades, Rent, & Arbitration (AF-85)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_storage_test_pack",
      title: "Storage and Rent Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, gold_alice: 500, gold_bob: 500, gold_charlie: 500, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "alley",
          },
        ],
      },
      {
        id: "alley",
        name: "Dark Alley",
        description: "A dark back alley.",
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
        id: "expensive_gem",
        name: "Expensive Gem",
        description: "A highly valuable gem.",
        cost: 100,
        takeable: true,
      },
    ],
    npcs: [],
  });

  it("should upgrade safehouse storage and scale dynamic capacity based on upgrades and enforcer heat", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
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

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // 1. Initial Capacity Check
    // baseCap = 5, upgradeBonus = 0, regionalSupplyCap = Math.max(2, 20 - 0) = 20. Total: 25.
    let cap = getSafehouseStorageCapacity(state, "alley");
    expect(cap).toBe(25);

    // 2. Perform UPGRADE_SAFEHOUSE_STORAGE
    const upgradeRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_SAFEHOUSE_STORAGE",
          roomId: "alley",
          cost: 150,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(upgradeRes.ok).toBe(true);
    expect(upgradeRes.state.vars["gold"]).toBe(350);
    expect(upgradeRes.state.safehouses?.["alley"].storageUpgradeLevel).toBe(1);

    // 3. Upgraded Capacity Check
    // baseCap = 5, upgradeBonus = 10, regionalSupplyCap = 20. Total: 35.
    cap = getSafehouseStorageCapacity(upgradeRes.state, "alley");
    expect(cap).toBe(35);

    // 4. Upgraded Capacity Check with Enforcer Heat
    // Set enforcer heat to 5 in room "alley"
    let stateWithHeat = { ...upgradeRes.state };
    stateWithHeat.enforcementHeat = {
      alley: {
        roomId: "alley",
        heat: 5,
        timestamp: 1010,
      },
    };

    // baseCap = 5, upgradeBonus = 10, regionalSupplyCap = Math.max(2, 20 - 5) = 15. Total: 30.
    cap = getSafehouseStorageCapacity(stateWithHeat, "alley");
    expect(cap).toBe(30);
  });

  it("should handle non-member deposits and secure withdrawals using stashItemOwners", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 500 },
      agentsInit: ["player", "alice", "bob"],
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

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Alice has item in inventory
    if (state.agents?.["alice"]) {
      state.agents["alice"].inventory = ["expensive_gem"];
    }

    // 1. Non-member (alice) deposits an item
    const depRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEPOSIT_STASH",
          roomId: "alley",
          itemId: "expensive_gem",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(depRes.ok).toBe(true);
    expect(depRes.state.safehouses?.["alley"].stashItems).toContain("expensive_gem");
    expect(depRes.state.stashItemOwners?.["expensive_gem"]).toBe("alice");

    // 2. Different non-member (bob) tries to withdraw alice's item and gets rejected
    const badWitRes = multiAgentStep(
      depRes.state,
      {
        agentId: "bob",
        action: {
          type: "WITHDRAW_STASH",
          roomId: "alley",
          itemId: "expensive_gem",
          timestamp: 1015,
        } as any,
      },
      mockPack
    );
    expect(badWitRes.ok).toBe(false);
    expect(badWitRes.rejectionReason).toContain("does not own item");

    // 3. Alice successfully withdraws her own item
    const goodWitRes = multiAgentStep(
      depRes.state,
      {
        agentId: "alice",
        action: {
          type: "WITHDRAW_STASH",
          roomId: "alley",
          itemId: "expensive_gem",
          timestamp: 1020,
        } as any,
      },
      mockPack
    );
    expect(goodWitRes.ok).toBe(true);
    expect(goodWitRes.state.safehouses?.["alley"].stashItems).not.toContain("expensive_gem");
    expect(goodWitRes.state.stashItemOwners?.["expensive_gem"]).toBeUndefined();
  });

  it("should charge storage rent to non-members and distribute profits to syndicate members", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 100, gold_alice: 50 },
      agentsInit: ["player", "alice"],
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

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: ["expensive_gem"],
        timestamp: 1000,
        storageRentRate: 15,
      },
    };

    // Track expensive_gem owner
    state.stashItemOwners = {
      expensive_gem: "alice",
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Alice gold: 50 - 15 = 35.
    expect(tickedState.vars["gold_alice"]).toBe(35);
    // Player (syndicate member) gold: 100 + 15 = 115.
    expect(tickedState.vars["gold"]).toBe(115);
    expect(tickedState.journal.some((log) => log.includes("Charged non-member agent alice"))).toBe(true);
  });

  it("should establish storage rent rate directly", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
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

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    const estRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_STORAGE_RENT",
          roomId: "alley",
          rentRate: 12,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(estRes.ok).toBe(true);
    expect(estRes.state.safehouses?.["alley"].storageRentRate).toBe(12);
    expect(estRes.state.safehouseRentPolicies?.["alley"]).toBe(12);
  });

  it("should consensual vote and arbitrate storage rent rates with tie-breaking and mesh convergence", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 500 },
      agentsInit: ["player", "bob", "charlie"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "bob", "charlie"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // 1. Player votes 10
    const step1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "VOTE_STORAGE_RENT_RATE",
          roomId: "alley",
          rate: 10,
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(step1.ok).toBe(true);
    expect(step1.state.safehouseRentPolicies?.["alley"]).toBe(10);

    // 2. Bob votes 20
    const step2 = multiAgentStep(
      step1.state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_STORAGE_RENT_RATE",
          roomId: "alley",
          rate: 20,
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(step2.ok).toBe(true);
    // Tie-breaker: 10 vs 20. Descending uniqueRates order sorting prefers higher rate: 20
    expect(step2.state.safehouseRentPolicies?.["alley"]).toBe(20);

    // 3. Charlie votes 10
    const step3 = multiAgentStep(
      step2.state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_STORAGE_RENT_RATE",
          roomId: "alley",
          rate: 10,
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(step3.ok).toBe(true);
    // Majority is two votes for 10, one for 20. Policy becomes 10.
    expect(step3.state.safehouseRentPolicies?.["alley"]).toBe(10);
  });

  it("should charge over-limit storage penalties to safehouse owner", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 100 },
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

    state.safehouses = {
      alley: {
        id: "safehouse_alley",
        roomId: "alley",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 2, // Low capacity to easily trigger over-limit
        stashItems: ["expensive_gem", "shield", "sword", "potion"], // 4 items (capacity is 2 + 20 from heat=0 -> total cap is 22)
        timestamp: 1000,
      },
    };

    // To make sure capacity is smaller than stashItems length:
    // Let's set enforcer heat to 20, which reduces regional cap to Math.max(2, 20-20) = 2.
    // Total cap = base (2) + 0 + 2 = 4. Let's make heat 25, which gives regional cap = 2.
    // Total cap = 4. Let's add 2 more items to stash items to make it 6 items.
    state.safehouses.alley.stashItems = ["1", "2", "3", "4", "5", "6"];
    state.enforcementHeat = {
      alley: {
        roomId: "alley",
        heat: 25,
        timestamp: 1000,
      },
    };

    // Capacity = 2 (base) + 2 (regional cap) = 4. Stored = 6. Over-limit = 2.
    // Penalty = 2 * 20 = 40.
    const tickedState = tickEconomy(state, mockPack);

    // Player gold: 100 - 40 = 60.
    expect(tickedState.vars["gold"]).toBe(60);
    expect(tickedState.journal.some((log) => log.includes("[Safehouse Penalty]"))).toBe(true);
  });
});

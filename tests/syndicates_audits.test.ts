import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { GossipNode, mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Crime Syndicate Money Laundering Audits & Regulatory Enforcer Sweeps (AF-61)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_audit_test_pack",
      title: "Laundering Audit and Sweep Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
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

  it("should trigger a money laundering audit based on high enforcer heat and laundering volume", () => {
    let state = createInitialState({
      seed: 54321,
      start: "market",
      varsInit: { gold: 0 },
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

    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 50,
        cleanGold: 50,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
      },
    };

    // Set high room heat to maximize the audit trigger probability
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 90,
        timestamp: 1000,
      },
    };

    state.step = 5;

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Verify enforcer audit was triggered
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front).toBeDefined();
    expect(front?.activeAudit).toBe(true);

    // Journal should contain audit trigger warning
    const hasAuditTriggeredJournal = tickedState.journal.some(j => j.includes("Money laundering audit triggered"));
    expect(hasAuditTriggeredJournal).toBe(true);
  });

  it("should successfully pass/deflect the audit when active protection levels are high", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 },
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

    // Setup front business already undergoing an active audit
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 200,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
        activeAudit: true, // Under active audit
      },
    };

    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 40,
        timestamp: 1000,
      },
    };

    // Setup extremely high active protection levels:
    // 1. Turf Guards
    state.turfGuards = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        count: 5, // 5 * 15 = 75 defense score
        cost: 10,
        timestamp: 1000,
      },
    };

    // 2. Defense Outpost with turrets
    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 2, // 2 * 25 = 50 defense score
        timestamp: 1000,
        turrets: {
          turret_1: {
            id: "turret_1",
            type: "cannon",
            firepower: 30, // 30 defense score
            armor: 20, // 20 defense score
            premiumRate: 0.05,
            timestamp: 1000,
          },
        },
      },
    };

    // 3. Active enforcer bribe
    state.syndicateBribes = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        amount: 100, // active bribe adds 50 defense score
        active: true,
        timestamp: 1000,
      },
    };

    // 4. Active deflection policy
    state.deflectionPolicies = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        cost: 200, // active deflection adds 75 defense score
        active: true,
        timestamp: 1000,
      },
    };

    // Defense score = 75 (guards) + 50 (outpost) + 50 (bribe) + 75 (deflection) + 50 (turret) = 300 defense!
    // Since audit strength is rolled between 20 and 100, this will easily pass/deflect the audit.

    state.step = 5;

    // Run tickEconomy to resolve audit
    const tickedState = tickEconomy(state, mockPack);

    // Verify audit is successfully resolved (activeAudit set to false)
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.activeAudit).toBe(false);

    // Verify that assets were NOT confiscated
    // Note: before the audit check, laundering also runs.
    // 50 dirty was laundered. Remaining dirty = 100 - 50 = 50. Clean = 200 + 50 = 250.
    expect(front?.dirtyGold).toBe(50);
    expect(front?.cleanGold).toBe(250);

    // Verify enforcer heat in the room is reduced by 10 (40 -> 30) AND then further reduced by 15 because the enforcer sweep (AF-51) also triggered and was successfully repelled!
    // 40 - 3 (dominance) - 10 (audit repelled) - 15 (sweep repelled) = 12
    expect(tickedState.enforcementHeat?.["market"]?.heat).toBe(12);

    // Journal should contain success message
    const hasSuccessJournal = tickedState.journal.some(j => j.includes("successfully passed money laundering audit"));
    expect(hasSuccessJournal).toBe(true);
  });

  it("should fail the audit and confiscate assets when protection levels are low", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 },
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

    // Setup front business with an active audit
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 200,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
        activeAudit: true, // Under active audit
      },
    };

    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 40,
        timestamp: 1000,
      },
    };

    // No guards, no outposts, no bribes, no deflection policies. Defense Score is 0.
    // Audit strength will be between 20 and 100, so it will fail.

    state.step = 5;

    // Run tickEconomy to resolve audit
    const tickedState = tickEconomy(state, mockPack);

    // Verify audit is resolved (activeAudit set to false)
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.activeAudit).toBe(false);

    // Verify all dirty gold was confiscated (0 remaining)
    expect(front?.dirtyGold).toBe(0);

    // Verify clean gold was partially confiscated
    // Clean gold after laundering was 250.
    // Confiscated clean should be Math.floor(250 * 1 * 0.75) = 187.
    // Remaining clean should be 250 - 187 = 63.
    expect(front?.cleanGold).toBe(63);

    // Verify enforcer heat in the room is reset to 0
    expect(tickedState.enforcementHeat?.["market"]?.heat).toBe(0);

    // Journal should contain failure and confiscation log
    const hasFailureJournal = tickedState.journal.some(j => j.includes("failed money laundering audit"));
    expect(hasFailureJournal).toBe(true);
  });

  it("should merge front business activeAudit state correctly using mergeMonotonicStateFields based on LWW", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: {},
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 200,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 2000, // Newer timestamp
        activeAudit: true, // Audit active!
      },
    };

    stateB.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 200,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000, // Older timestamp
        activeAudit: false,
      },
    };

    // Merge A (newer) into B (older)
    const merged1 = mergeMonotonicStateFields(stateB, stateA);
    expect(merged1.frontBusinesses?.["merchant_timmy"]?.activeAudit).toBe(true);
    expect(merged1.frontBusinesses?.["merchant_timmy"]?.timestamp).toBe(2000);

    // Merge B (older) into A (newer)
    const merged2 = mergeMonotonicStateFields(stateA, stateB);
    expect(merged2.frontBusinesses?.["merchant_timmy"]?.activeAudit).toBe(true);
    expect(merged2.frontBusinesses?.["merchant_timmy"]?.timestamp).toBe(2000);
  });
});

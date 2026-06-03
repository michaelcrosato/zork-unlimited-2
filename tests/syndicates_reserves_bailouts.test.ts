import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Reinsurance Automated Liquidity Pool Bailouts & Secondary Reserve Ratios (AF-105)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reserves_bailouts_test_pack",
      title: "Reserves & Bailouts Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000, gold_alice: 1000, gold_bob: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure meeting place for syndicate members.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle ADJUST_RESERVE_RATIO validations, majority consensus voting, and ratio updates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000, gold_alice: 1000, gold_bob: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Invalid syndicate ID validation
    const act1 = {
      type: "ADJUST_RESERVE_RATIO",
      syndicateId: "wrong_syndicate",
      reserveRatio: 0.35,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Proposing invalid reserve ratio (negative)
    const act2 = {
      type: "ADJUST_RESERVE_RATIO",
      syndicateId: "blood_fangs",
      reserveRatio: -0.1,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("Proposed reserve ratio must be a non-negative number");

    // 3. Proposing valid reserve ratio by non-member agent
    const act3 = {
      type: "ADJUST_RESERVE_RATIO",
      syndicateId: "blood_fangs",
      reserveRatio: 0.30,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "bob", action: act3 as any }, mockPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("is not a member of syndicate");

    // 4. Valid vote by member player
    let res4 = multiAgentStep(state, { agentId: "player", action: act3 as any }, mockPack);
    expect(res4.ok).toBe(true);
    // Consensus ratio should be 0.30 (first vote creates majority/consensus)
    expect(res4.state.secondaryReserves?.blood_fangs?.reserveRatio).toBe(0.30);

    // 5. Vote by other member (alice) proposing a different ratio (0.40)
    const act4 = {
      type: "ADJUST_RESERVE_RATIO",
      syndicateId: "blood_fangs",
      reserveRatio: 0.40,
      timestamp: 1050,
    };
    let res5 = multiAgentStep(res4.state, { agentId: "alice", action: act4 as any }, mockPack);
    expect(res5.ok).toBe(true);
    // There's a tie: 0.30 (1 vote) vs 0.40 (1 vote). Descending tie-breaker rules should prefer the higher ratio (0.40).
    expect(res5.state.secondaryReserves?.blood_fangs?.reserveRatio).toBe(0.40);
  });

  it("should enforce secondary reserve ratio compliance checks and automatic deductions in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000, gold_alice: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Establish primary insurance pool with 500 gold
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 500,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Register active insurance policy for player
    state.agentPremiumPolicies = {
      "player_group_1": {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group_1",
        premiumPaid: 50,
        active: true,
        timestamp: 1000,
      },
    };

    // Setup secondary reserve record (opt-in) with 0 reserve gold and 20% target reserve ratio
    state.secondaryReserves = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        reserveGold: 0,
        reserveRatio: 0.20,
        timestamp: 1000,
      },
    };

    // Create a mock joint loan default where player owes 100 gold + interest
    state.step = 10;
    state.jointLoans = {
      "group_1": {
        id: "group_1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "sh_player" },
          { agentId: "alice", collateralType: "safehouse", collateralId: "sh_alice" },
        ],
        amount: 200,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 5,
        timestamp: 1000,
      },
    };

    state.safehouses = {
      sh_player: {
        id: "sh_player",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1,
        storageUpgradeLevel: 0,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
      sh_alice: {
        id: "sh_alice",
        roomId: "safehouse_room",
        ownerId: "alice",
        syndicateId: "blood_fangs",
        level: 1,
        storageUpgradeLevel: 0,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Tick economy should trigger ratio compliance check:
    // Target reserve = Math.ceil(500 * 0.20) = 100 gold.
    // Deficit = 100 - 0 = 100 gold.
    // Deducts 100 gold from primary insurance pool (leaves 400 gold) and adds it to reserveGold (becomes 100).
    // Then player's insurance covers default + 5% interest (105 gold total) from the primary pool (leaves 295 gold in pool).
    const ticked = tickEconomy(state, mockPack);

    expect(ticked.secondaryReserves?.blood_fangs?.reserveGold).toBe(100);
    expect(ticked.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(295);
    expect(ticked.journal.some(j => j.includes("completed ratio compliance check: deducted 100 gold"))).toBe(true);
  });

  it("should handle EXECUTE_AUTOMATED_BAILOUT validations and manual execution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000, gold_bob: 1000 },
      agentsInit: ["player", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Setup active reinsurance contract
    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 500,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        active: true,
        timestamp: 1000,
      },
    };

    // Establish insurance pools
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 50, // low pool
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 500,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Establish secondary reserves for shadow_brokers
    state.secondaryReserves = {
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        reserveGold: 200,
        reserveRatio: 0.20,
        timestamp: 1000,
      },
    };

    // 1. Invalid execute bailout (insufficient reserves)
    const act1 = {
      type: "EXECUTE_AUTOMATED_BAILOUT",
      sourceSyndicateId: "shadow_brokers",
      targetSyndicateId: "blood_fangs",
      bailoutAmount: 300, // requested more than they have (200)
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("insufficient secondary reserves");

    // 2. Valid execution of bailout
    const act2 = {
      type: "EXECUTE_AUTOMATED_BAILOUT",
      sourceSyndicateId: "shadow_brokers",
      targetSyndicateId: "blood_fangs",
      bailoutAmount: 150,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(true);

    // Verify balances
    expect(res2.state.secondaryReserves?.shadow_brokers?.reserveGold).toBe(50); // 200 - 150
    expect(res2.state.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(200); // 50 + 150
    expect(res2.state.automatedBailouts?.["shadow_brokers:blood_fangs:1000"]?.bailoutAmount).toBe(150);
  });

  it("should trigger fallback automatic secondary reserve bailouts in tickEconomy when primary and reinsurance pools are both depleted", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000, gold_bob: 1000 },
      agentsInit: ["player", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Reinsurance contract exists between them but is depleted (borrowed limit reached)
    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 100,
        borrowedAfromB: 100, // limit reached! Cannot borrow more!
        borrowedBfromA: 0,
        active: true,
        timestamp: 1000,
      },
    };

    // Primary insurance pool has 0 gold
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 0,
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 100, // partner pool has gold, but maxLiquidityLimit is reached
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Partner shadow_brokers has secondary reserves!
    state.secondaryReserves = {
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        reserveGold: 150, // available secondary reserves!
        reserveRatio: 0.20,
        timestamp: 1000,
      },
    };

    // Player premium policy
    state.agentPremiumPolicies = {
      "player_group_1": {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group_1",
        premiumPaid: 50,
        active: true,
        timestamp: 1000,
      },
    };

    // Group loan default of 100 gold + 5% interest (105 gold total)
    state.step = 10;
    state.jointLoans = {
      "group_1": {
        id: "group_1",
        syndicateId: "blood_fangs",
        members: ["player"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "sh_player" },
        ],
        amount: 100,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 5,
        timestamp: 1000,
      },
    };

    state.safehouses = {
      sh_player: {
        id: "sh_player",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1,
        storageUpgradeLevel: 0,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Tick economy should trigger:
    // 1. Insurance pool coverage (has 0 gold, remainingDue = 105)
    // 2. Reinsurance contract check (borrowedAfromB = 100, maxLimit = 100, cannot borrow, remainingDue = 105)
    // 3. Fallback secondary reserve automated bailout!
    //    Sources 105 gold from shadow_brokers secondary reserves (removes 105 gold, leaves 45).
    //    Credits 105 gold to blood_fangs primary pool, which covers player's remainingDue (leaves blood_fangs poolGold at 0).
    //    Records the AutomatedBailout.
    //    Spares player from default sweeps!
    const ticked = tickEconomy(state, mockPack);

    expect(ticked.secondaryReserves?.shadow_brokers?.reserveGold).toBe(45);
    expect(ticked.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(0);
    expect(Object.values(ticked.automatedBailouts || {}).some(b => b.bailoutAmount === 105)).toBe(true);
    expect(ticked.journal.some(j => j.includes("Automated secondary reserve bailout triggered"))).toBe(true);
  });

  it("should merge secondaryReserves, reserveRatioVotes, and automatedBailouts via Gossip mergeMonotonicStateFields", () => {
    const stateA = createInitialState({
      seed: 1,
      start: "safehouse_room",
      varsInit: {},
    });
    const stateB = createInitialState({
      seed: 2,
      start: "safehouse_room",
      varsInit: {},
    });

    stateA.secondaryReserves = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        reserveGold: 100,
        reserveRatio: 0.20,
        timestamp: 1000,
      },
    };

    stateB.secondaryReserves = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        reserveGold: 150, // B is newer
        reserveRatio: 0.30,
        timestamp: 1050,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        reserveGold: 300,
        reserveRatio: 0.25,
        timestamp: 1020,
      },
    };

    stateA.reserveRatioVotes = {
      blood_fangs: {
        player: { reserveRatio: 0.20, timestamp: 1000 },
      },
    };

    stateB.reserveRatioVotes = {
      blood_fangs: {
        player: { reserveRatio: 0.30, timestamp: 1050 }, // B is newer
        alice: { reserveRatio: 0.25, timestamp: 1020 },
      },
    };

    stateA.automatedBailouts = {
      "shadow_brokers:blood_fangs:1000": {
        id: "shadow_brokers:blood_fangs:1000",
        sourceSyndicateId: "shadow_brokers",
        targetSyndicateId: "blood_fangs",
        bailoutAmount: 100,
        timestamp: 1000,
      },
    };

    stateB.automatedBailouts = {
      "shadow_brokers:blood_fangs:1020": {
        id: "shadow_brokers:blood_fangs:1020",
        sourceSyndicateId: "shadow_brokers",
        targetSyndicateId: "blood_fangs",
        bailoutAmount: 200,
        timestamp: 1020,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Verify secondaryReserves merged
    expect(merged.secondaryReserves?.blood_fangs?.reserveGold).toBe(150);
    expect(merged.secondaryReserves?.blood_fangs?.reserveRatio).toBe(0.30);
    expect(merged.secondaryReserves?.shadow_brokers?.reserveGold).toBe(300);

    // Verify reserveRatioVotes merged
    expect(merged.reserveRatioVotes?.blood_fangs?.player?.reserveRatio).toBe(0.30);
    expect(merged.reserveRatioVotes?.blood_fangs?.alice?.reserveRatio).toBe(0.25);

    // Verify automatedBailouts merged
    expect(merged.automatedBailouts?.["shadow_brokers:blood_fangs:1000"]?.bailoutAmount).toBe(100);
    expect(merged.automatedBailouts?.["shadow_brokers:blood_fangs:1020"]?.bailoutAmount).toBe(200);
  });
});

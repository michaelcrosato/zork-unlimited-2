import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Joint-Liability Loan Insurance Pool Reinsurance Mesh (AF-101)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reinsurance_test_pack",
      title: "Reinsurance Test Pack",
      start_room: "clearing",
      vars_init: { gold: 1000, gold_alice: 1000, gold_bob: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A secure clearing deep in the woods.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle PROPOSE_REINSURANCE_POOL validations, double-majority voting, and contract creation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
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
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Invalid syndicate Id
    const act1 = {
      type: "PROPOSE_REINSURANCE_POOL",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "wrong_syndicate",
      maxLiquidityLimit: 200,
      targetState: true,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Same syndicate
    const act2 = {
      type: "PROPOSE_REINSURANCE_POOL",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "blood_fangs",
      maxLiquidityLimit: 200,
      targetState: true,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("Cannot form reinsurance contract with the same syndicate");

    // 3. Invalid agent (not in either syndicate)
    const act3 = {
      type: "PROPOSE_REINSURANCE_POOL",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "shadow_brokers",
      maxLiquidityLimit: 200,
      targetState: true,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "charlie", action: act3 as any }, mockPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("is not a member of either syndicate");

    // 4. Valid proposal vote from Syndicate A member (player)
    let res4 = multiAgentStep(state, { agentId: "player", action: act3 as any }, mockPack);
    expect(res4.ok).toBe(true);
    // Contract should be proposed but NOT active yet since B hasn't voted (Double Majority required)
    const pairKey = "blood_fangs:shadow_brokers";
    expect(res4.state.reinsuranceContracts?.[pairKey]).toBeUndefined();

    // 5. Valid proposal vote from Syndicate B member (bob)
    let res5 = multiAgentStep(res4.state, { agentId: "bob", action: act3 as any }, mockPack);
    expect(res5.ok).toBe(true);
    // Now both approved, contract should be active!
    const contract = res5.state.reinsuranceContracts?.[pairKey];
    expect(contract).toBeDefined();
    expect(contract?.active).toBe(true);
    expect(contract?.maxLiquidityLimit).toBe(200);
    expect(contract?.borrowedAfromB).toBe(0);
    expect(contract?.borrowedBfromA).toBe(0);

    // 6. Test minimum limit selection under consensus
    // Alice votes with limit 150
    const act4 = {
      type: "PROPOSE_REINSURANCE_POOL",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "shadow_brokers",
      maxLiquidityLimit: 150,
      targetState: true,
      timestamp: 1010,
    };
    let res6 = multiAgentStep(res5.state, { agentId: "alice", action: act4 as any }, mockPack);
    expect(res6.ok).toBe(true);
    // Limits: player voted 200, alice voted 150, bob voted 200. Consensus limit should be min of YES voters = 150.
    expect(res6.state.reinsuranceContracts?.[pairKey]?.maxLiquidityLimit).toBe(150);
  });

  it("should handle TRANSFER_REINSURANCE_LIQUIDITY validations, voting, limit restrictions, and executions", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
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

    // Initialize Pools
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 500,
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 300,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Establish active contract
    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 200,
        active: true,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        timestamp: 1000,
      },
    };

    // 1. Invalid sender member
    const transferAct = {
      type: "TRANSFER_REINSURANCE_LIQUIDITY",
      proposalId: "prop1",
      fromSyndicateId: "blood_fangs",
      toSyndicateId: "shadow_brokers",
      amount: 100,
      targetState: true,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "bob", action: transferAct as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("is not a member of the sending syndicate");

    // 2. Amount exceeds pool gold
    const transferAct2 = {
      ...transferAct,
      amount: 600,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: transferAct2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("insufficient gold");

    // 3. Exceeds max liquidity limit
    const transferAct3 = {
      ...transferAct,
      amount: 250,
    };
    let res3 = multiAgentStep(state, { agentId: "player", action: transferAct3 as any }, mockPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("exceed max liquidity limit");

    // 4. Valid proposal and immediate execution (since player is the sole member of blood_fangs, yes >= no is satisfied immediately)
    let res4 = multiAgentStep(state, { agentId: "player", action: transferAct as any }, mockPack);
    expect(res4.ok).toBe(true);

    const contract = res4.state.reinsuranceContracts?.["blood_fangs:shadow_brokers"];
    expect(contract?.borrowedBfromA).toBe(100); // blood_fangs (A) transferred to shadow_brokers (B), so B borrowed 100 from A!
    expect(contract?.borrowedAfromB).toBe(0);

    expect(res4.state.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(400); // 500 - 100
    expect(res4.state.jointLoanInsurancePools?.shadow_brokers?.poolGold).toBe(400); // 300 + 100

    expect(res4.state.executedReinsuranceTransfers?.prop1).toBe(true);

    // 5. Prevent double execution of same proposalId
    let res5 = multiAgentStep(res4.state, { agentId: "player", action: transferAct as any }, mockPack);
    expect(res5.ok).toBe(true); // Should register vote but NOT execute again
    expect(res5.state.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(400); // remains 400
  });

  it("should dynamically source fallback reinsurance liquidity when primary insurance pool is depleted during enforcer defaults sweeps", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 0 },
      agentsInit: ["player"],
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

    state.safehouses = {
      sh_player: {
        id: "sh_player",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
    };

    state.jointLoans = {
      group1: {
        id: "group1",
        syndicateId: "blood_fangs",
        members: ["player"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "sh_player" }
        ],
        amount: 300,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    state.creditRatings = {
      player: 100,
    };

    // Primary pool (blood_fangs) has 50 gold (insufficient for 300 default + interest).
    // Partner pool (shadow_brokers) has 400 gold.
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 50,
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 400,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    state.agentPremiumPolicies = {
      player_group1: {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group1",
        premiumPaid: 30,
        active: true,
        timestamp: 1000,
      },
    };

    // Active reinsurance contract between blood_fangs (A) and shadow_brokers (B) with max limit 500
    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 500,
        active: true,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        timestamp: 1000,
      },
    };

    // Step 15 past due step 10 -> Triggers Default sweep!
    // Total due: 300 + 15 (5% default interest rate) = 315.
    // Primary pool has 50 gold, so remainingDue = 265.
    // Fallback: sources remainingDue 265 from shadow_brokers (partner).
    // shadow_brokers pool has 400 gold, limit 500. So we borrow 265.
    // blood_fangs borrowedAfromB = 265. shadow_brokers poolGold = 400 - 265 = 135.
    // player spared completely!
    state.step = 15;

    let ticked = tickEconomy(state, mockPack);

    // Assert primary pool fully covers the default via reinsurance fallback
    expect(ticked.creditRatings?.player).toBe(100); // intact!
    expect(ticked.safehouses?.sh_player).toBeDefined(); // spared!

    // Assert shadow_brokers pool deducted: 400 - 265 = 135
    expect(ticked.jointLoanInsurancePools?.shadow_brokers?.poolGold).toBe(135);

    // Assert primary pool depleted: 50 - 50 = 0
    expect(ticked.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(0);

    // Assert contract borrowed balances updated
    const contract = ticked.reinsuranceContracts?.["blood_fangs:shadow_brokers"];
    expect(contract?.borrowedAfromB).toBe(318);
    expect(contract?.borrowedBfromA).toBe(0);
  });

  it("should converge reinsuranceContracts and reinsuranceVotes via Gossip LWW merge", () => {
    let stateA = createInitialState({ seed: 1, start: "clearing" });
    let stateB = createInitialState({ seed: 1, start: "clearing" });

    stateA.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 300,
        active: true,
        borrowedAfromB: 50,
        borrowedBfromA: 0,
        timestamp: 1000,
      },
    };
    stateB.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 300,
        active: true,
        borrowedAfromB: 100, // B has a newer borrowed state
        borrowedBfromA: 0,
        timestamp: 1020,
      },
    };

    stateA.reinsuranceVotes = {
      "blood_fangs:shadow_brokers": {
        player: {
          targetState: true,
          maxLiquidityLimit: 300,
          timestamp: 1050, // A has newer vote
        },
      },
    };
    stateB.reinsuranceVotes = {
      "blood_fangs:shadow_brokers": {
        player: {
          targetState: true,
          maxLiquidityLimit: 250,
          timestamp: 1010,
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.reinsuranceContracts?.["blood_fangs:shadow_brokers"]?.borrowedAfromB).toBe(100);
    expect(merged.reinsuranceContracts?.["blood_fangs:shadow_brokers"]?.timestamp).toBe(1020);

    expect(merged.reinsuranceVotes?.["blood_fangs:shadow_brokers"]?.player?.maxLiquidityLimit).toBe(300);
    expect(merged.reinsuranceVotes?.["blood_fangs:shadow_brokers"]?.player?.timestamp).toBe(1050);
  });

  it("should handle PROPOSE_CONTAGION_SHIELD validations, double-majority voting, and shield activation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
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
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Validations
    // 1. Invalid syndicate Id
    const act1 = {
      type: "PROPOSE_CONTAGION_SHIELD",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "wrong_syndicate",
      targetState: true,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Same syndicate
    const act2 = {
      type: "PROPOSE_CONTAGION_SHIELD",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "blood_fangs",
      targetState: true,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("Cannot form contagion shield with the same syndicate");

    // 3. Non-member agent
    let res3 = multiAgentStep(state, { agentId: "charlie", action: act1 as any }, mockPack);
    expect(res3.ok).toBe(false);

    // Voting and consensus
    const actVote = {
      type: "PROPOSE_CONTAGION_SHIELD",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "shadow_brokers",
      targetState: true,
      timestamp: 1000,
    };

    // player (blood_fangs) votes YES
    let res4 = multiAgentStep(state, { agentId: "player", action: actVote as any }, mockPack);
    expect(res4.ok).toBe(true);
    const pairKey = "blood_fangs:shadow_brokers";
    expect(res4.state.contagionShields?.[pairKey]).toBeUndefined();

    // bob (shadow_brokers) votes YES
    let res5 = multiAgentStep(res4.state, { agentId: "bob", action: actVote as any }, mockPack);
    expect(res5.ok).toBe(true);
    // Double majority reached
    expect(res5.state.contagionShields?.[pairKey]?.active).toBe(true);

    // Vote false to deactivate
    const actFalse = {
      type: "PROPOSE_CONTAGION_SHIELD",
      syndicateIdA: "blood_fangs",
      syndicateIdB: "shadow_brokers",
      targetState: false,
      timestamp: 1010,
    };
    let res6 = multiAgentStep(res5.state, { agentId: "player", action: actFalse as any }, mockPack);
    let res7 = multiAgentStep(res6.state, { agentId: "bob", action: actFalse as any }, mockPack);
    expect(res7.state.contagionShields?.[pairKey]?.active).toBe(false);
  });

  it("should dynamically scale premium multipliers during fallback borrowing sweeps in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000, gold_alice: 0, gold_bob: 0 },
      agentsInit: ["alice"],
    });

    state.step = 10;
    state.journal = [];

    // Setup syndicates and active loan with default
    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
      },
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
      },
    };

    // Primary pool (blood_fangs) has 0 gold
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 0,
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 180, // Low liquidity (< 250) -> 1.5x multiplier
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Active policy for alice
    state.agentPremiumPolicies = {
      "alice_group_1": {
        agentId: "alice",
        syndicateId: "blood_fangs",
        groupId: "group_1",
        premiumPaid: 10,
        active: true,
        timestamp: 1000,
      },
    };

    // Reinsurance contract
    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 500,
        active: true,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        timestamp: 1000,
      },
    };

    // Active joint loan in default
    state.jointLoans = {
      "group_1": {
        id: "group_1",
        syndicateId: "blood_fangs",
        members: ["alice"],
        collaterals: [],
        amount: 100,
        interestAccrued: 0,
        borrowStep: 2,
        dueStep: 5,
        timestamp: 1000,
      },
    };

    // Default occurred (step 10 > dueStep 5)
    // Run tickEconomy
    const ticked = tickEconomy(state, mockPack);

    // Reinsurance fallback should borrow 100 gold from shadow_brokers + 5% interest = 105.
    // Since shadow_brokers gold is 180 (< 250), it is a low liquidity pool, triggering a 1.5x multiplier.
    // Charged owed should be Math.ceil(105 * 1.5) = 158 gold.
    const contract = ticked.reinsuranceContracts?.["blood_fangs:shadow_brokers"];
    expect(contract?.borrowedAfromB).toBe(158);
    expect(ticked.jointLoanInsurancePools?.shadow_brokers?.poolGold).toBe(75); // 180 - 105

    // Pricing multiplier saved
    expect(ticked.reinsurancePricingMultipliers?.["blood_fangs:shadow_brokers"]?.multiplier).toBe(1.5);
  });

  it("should check contagion shield and freeze reinsurance calls when active and partner pool is highly leveraged", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000, gold_alice: 0, gold_bob: 0 },
      agentsInit: ["alice"],
    });

    state.step = 10;
    state.journal = [];

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
      },
      shadow_brokers: {
        id: "shadow_brokers",
        name: "Shadow Brokers",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
      },
    };

    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 0,
        premiumRate: 10,
        timestamp: 1000,
      },
      shadow_brokers: {
        syndicateId: "shadow_brokers",
        poolGold: 100, // < 150 -> highly leveraged!
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    state.agentPremiumPolicies = {
      "alice_group_1": {
        agentId: "alice",
        syndicateId: "blood_fangs",
        groupId: "group_1",
        premiumPaid: 10,
        active: true,
        timestamp: 1000,
      },
    };

    state.reinsuranceContracts = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        maxLiquidityLimit: 500,
        active: true,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        timestamp: 1000,
      },
    };

    // Active contagion shield
    state.contagionShields = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        active: true,
        timestamp: 1000,
      },
    };

    state.jointLoans = {
      "group_1": {
        id: "group_1",
        syndicateId: "blood_fangs",
        members: ["alice"],
        collaterals: [],
        amount: 100,
        interestAccrued: 0,
        borrowStep: 2,
        dueStep: 5,
        timestamp: 1000,
      },
    };

    // Run tickEconomy
    const ticked = tickEconomy(state, mockPack);

    // Call should be frozen. borrowedAfromB remains 0, partner pool gold remains 100
    expect(ticked.reinsuranceContracts?.["blood_fangs:shadow_brokers"]?.borrowedAfromB).toBe(0);
    expect(ticked.jointLoanInsurancePools?.shadow_brokers?.poolGold).toBe(100);

    const logEntry = ticked.journal.find(j => j.includes("[Contagion Shield] Reinsurance call"));
    expect(logEntry).toBeDefined();
  });

  it("should converge contagionShields, contagionShieldVotes, and reinsurancePricingMultipliers via Gossip LWW merge", () => {
    let stateA = createInitialState({ seed: 1, start: "clearing" });
    let stateB = createInitialState({ seed: 1, start: "clearing" });

    stateA.contagionShields = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        active: false,
        timestamp: 1000,
      },
    };
    stateB.contagionShields = {
      "blood_fangs:shadow_brokers": {
        id: "blood_fangs:shadow_brokers",
        syndicateIdA: "blood_fangs",
        syndicateIdB: "shadow_brokers",
        active: true, // Newer status
        timestamp: 1020,
      },
    };

    stateA.contagionShieldVotes = {
      "blood_fangs:shadow_brokers": {
        player: {
          targetState: false,
          timestamp: 1050, // Newer vote
        },
      },
    };
    stateB.contagionShieldVotes = {
      "blood_fangs:shadow_brokers": {
        player: {
          targetState: true,
          timestamp: 1010,
        },
      },
    };

    stateA.reinsurancePricingMultipliers = {
      "blood_fangs:shadow_brokers": {
        contractId: "blood_fangs:shadow_brokers",
        multiplier: 1.2,
        timestamp: 1000,
      },
    };
    stateB.reinsurancePricingMultipliers = {
      "blood_fangs:shadow_brokers": {
        contractId: "blood_fangs:shadow_brokers",
        multiplier: 1.5, // Newer multiplier
        timestamp: 1030,
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.contagionShields?.["blood_fangs:shadow_brokers"]?.active).toBe(true);
    expect(merged.contagionShields?.["blood_fangs:shadow_brokers"]?.timestamp).toBe(1020);

    expect(merged.contagionShieldVotes?.["blood_fangs:shadow_brokers"]?.player?.targetState).toBe(false);
    expect(merged.contagionShieldVotes?.["blood_fangs:shadow_brokers"]?.player?.timestamp).toBe(1050);

    expect(merged.reinsurancePricingMultipliers?.["blood_fangs:shadow_brokers"]?.multiplier).toBe(1.5);
    expect(merged.reinsurancePricingMultipliers?.["blood_fangs:shadow_brokers"]?.timestamp).toBe(1030);
  });
});

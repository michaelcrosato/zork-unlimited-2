import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Joint-Liability Loan Insurance Pools & Risk Diversification (AF-100)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "joint_loan_insurance_test_pack",
      title: "Joint Loan Insurance Test Pack",
      start_room: "clearing",
      vars_init: { gold: 500, gold_alice: 500 },
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

  it("should handle ESTABLISH_JOINT_LOAN_INSURANCE_POOL validations, gold deductions, and pool creation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500, gold_alice: 100 },
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

    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {},
        timestamp: 1000,
      },
    };

    // 1. Invalid syndicateId
    const act1 = {
      type: "ESTABLISH_JOINT_LOAN_INSURANCE_POOL",
      syndicateId: "wrong_syndicate",
      initialDeposit: 200,
      premiumRate: 10,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Insufficient gold
    const act2 = {
      type: "ESTABLISH_JOINT_LOAN_INSURANCE_POOL",
      syndicateId: "blood_fangs",
      initialDeposit: 1000,
      premiumRate: 10,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("insufficient gold");

    // 3. Valid establish
    const act3 = {
      type: "ESTABLISH_JOINT_LOAN_INSURANCE_POOL",
      syndicateId: "blood_fangs",
      initialDeposit: 200,
      premiumRate: 8,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "player", action: act3 as any }, mockPack);
    expect(res3.ok).toBe(true);
    expect(res3.state.vars.gold).toBe(300); // 500 - 200

    const pool = res3.state.jointLoanInsurancePools?.blood_fangs;
    expect(pool).toBeDefined();
    expect(pool?.poolGold).toBe(200);
    expect(pool?.premiumRate).toBe(8);
    expect(pool?.timestamp).toBe(1000);
  });

  it("should handle PURCHASE_JOINT_LOAN_INSURANCE validations, premium calculation, and policy creation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 300, gold_alice: 100 },
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

    state.jointLoans = {
      group1: {
        id: "group1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [{ agentId: "player", collateralType: "safehouse", collateralId: "clearing" }],
        amount: 500,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    // Before establishing pool
    const act1 = {
      type: "PURCHASE_JOINT_LOAN_INSURANCE",
      syndicateId: "blood_fangs",
      groupId: "group1",
      timestamp: 1010,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("is not established");

    // Establish pool first
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 100,
        premiumRate: 10, // 10% premium rate
        timestamp: 1000,
      },
    };

    // Valid purchase
    // Premium cost: 500 amount * 10% rate = 50 gold.
    let res2 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.vars.gold).toBe(250); // 300 - 50

    // Pool gold should receive the premium paid: 100 + 50 = 150
    expect(res2.state.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(150);

    // Active policy exists
    const policy = res2.state.agentPremiumPolicies?.player_group1;
    expect(policy).toBeDefined();
    expect(policy?.active).toBe(true);
    expect(policy?.premiumPaid).toBe(50);
    expect(policy?.groupId).toBe("group1");
  });

  it("should mitigate collateral liquidation, spare credit rating penalty, and buffer defaults during enforcer sweep in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50, gold_alice: 0 },
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
      sh_alice: {
        id: "sh_alice",
        roomId: "clearing",
        ownerId: "alice",
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
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "sh_player" },
          { agentId: "alice", collateralType: "safehouse", collateralId: "sh_alice" },
        ],
        amount: 400,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    state.creditRatings = {
      player: 100,
      alice: 100,
    };

    // Establish Pool and insure Player but NOT Alice.
    // Pool Gold = 300.
    state.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 300,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    state.agentPremiumPolicies = {
      player_group1: {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group1",
        premiumPaid: 40,
        active: true,
        timestamp: 1000,
      },
    };

    // Step 15: Past due step 10 -> Triggers Default sweep!
    // Total due: 400 + 20 (interest accrued at default bank rate 5%) = 420.
    // Proportions: Player has sh_player (value 400), Alice sh_alice (value 400) -> 50% each.
    // Due Shares: Player = 210, Alice = 210.
    // Player is insured: Pool pays min(210, 300) = 210. Remaining Due = 0. Player spared!
    // Alice is not insured: Alice has 0 gold. Swept 0 gold, remaining due = 210. Alice defaulted!
    state.step = 15;

    let ticked = tickEconomy(state, mockPack);

    // 1. Insurance Pool gold should be: 300 - 210 = 90
    expect(ticked.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(90);

    // 2. Player should be spared:
    expect(ticked.creditRatings?.player).toBe(100); // kept intact
    expect(ticked.safehouses?.sh_player).toBeDefined(); // collateral spared!

    // 3. Alice should default:
    expect(ticked.creditRatings?.alice).toBe(50); // rating penalized by -50
    expect(ticked.safehouses?.sh_alice).toBeUndefined(); // collateral liquidated!
    expect(ticked.defaultAlerts?.alice_blood_fangs).toBeDefined(); // debt default alert filed
  });

  it("should converge jointLoanInsurancePools and agentPremiumPolicies via Gossip LWW mergeMonotonicStateFields", () => {
    let stateA = createInitialState({
      seed: 123,
      start: "clearing",
    });
    let stateB = createInitialState({
      seed: 123,
      start: "clearing",
    });

    stateA.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 100,
        premiumRate: 5,
        timestamp: 1000,
      },
    };
    stateB.jointLoanInsurancePools = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        poolGold: 150, // B has a newer state for pool
        premiumRate: 5,
        timestamp: 1020,
      },
    };

    stateA.agentPremiumPolicies = {
      player_group1: {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group1",
        premiumPaid: 25,
        active: true,
        timestamp: 1010, // A has a newer state for policy
      },
    };
    stateB.agentPremiumPolicies = {
      player_group1: {
        agentId: "player",
        syndicateId: "blood_fangs",
        groupId: "group1",
        premiumPaid: 20,
        active: true,
        timestamp: 1000,
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Pool should converge to B (newer timestamp 1020)
    expect(merged.jointLoanInsurancePools?.blood_fangs?.poolGold).toBe(150);
    expect(merged.jointLoanInsurancePools?.blood_fangs?.timestamp).toBe(1020);

    // Policy should converge to A (newer timestamp 1010)
    expect(merged.agentPremiumPolicies?.player_group1?.premiumPaid).toBe(25);
    expect(merged.agentPremiumPolicies?.player_group1?.timestamp).toBe(1010);
  });
});

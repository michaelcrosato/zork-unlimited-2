import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionStanding } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate Bank Sovereign Debt Issuance & Faction Reserve Bond Sales (AF-123)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "sovereign_debt_pack",
      title: "Sovereign Debt Test Pack",
      start_room: "market",
      vars_init: { gold: 2000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and resolving a PROPOSE_SOVEREIGN_BOND consensus action", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // We need faction standing >= 50 to propose a sovereign bond.
    // Verify it fails with standing < 50.
    const proposalAction = {
      type: "PROPOSE_SOVEREIGN_BOND",
      proposalId: "prop_1",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      faceValue: 3000,
      interestRate: 10,
      termEpochs: 3,
      timestamp: 1002,
    };

    let failRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("standing");

    // Set standing >= 50
    state.factionRep = { rangers: 50 };

    // Now try proposing - should succeed
    let propRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(propRes.ok).toBe(true);

    state = propRes.state;
    expect(state.sovereignDebtProposals?.["prop_1"]).toBeDefined();
    expect(state.sovereignDebtProposals?.["prop_1"].votes?.["player"].vote).toBe(true);
    expect(state.sovereignDebtProposals?.["prop_1"].resolved).toBe(false);

    // Vote FOR by alice
    const voteAction = {
      type: "VOTE_SOVEREIGN_BOND",
      syndicateId: "alpha_squad",
      proposalId: "prop_1",
      vote: true,
      timestamp: 1003,
    };

    let voteRes = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    // Should be resolved and active bond established
    const prop = state.sovereignDebtProposals?.["prop_1"];
    expect(prop?.resolved).toBe(true);

    const bond = state.factionReserveBonds?.["prop_1"];
    expect(bond).toBeDefined();
    expect(bond?.status).toBe("Active");
    expect(bond?.remainingEpochs).toBe(2);
    expect(bond?.couponPayout).toBe(1100); // (3000 + 10% = 3300) / 3 = 1100
    expect(bond?.remainingRepayment).toBe(2200);

    // Check funds transfer: faction reserve pool should decrease by 3000 (10000 - 3000 = 7000)
    // and then increase by 1100 coupon payout (7000 + 1100 = 8100)
    // and war chest should increase by 3000 (1000 + 3000 = 4000) and then decrease by 1100 coupon payout (4000 - 1100 = 2900)
    expect(state.factionReservePools?.["rangers"]).toBe(8100);
    expect(state.syndicates?.["alpha_squad"].warChest).toBe(2900);
  });

  it("should amortize sovereign bond coupon payout over periodic economy ticks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionRep = { rangers: 50 };
    state.factionReservePools = { rangers: 10000 };

    // Setup active bond directly
    state.factionReserveBonds = {
      bond_test: {
        id: "bond_test",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100,
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Active",
        timestamp: 1000,
      },
    };

    // First economy tick
    state = tickProductionLabs(state, []);
    expect(state.factionReserveBonds?.["bond_test"].remainingEpochs).toBe(3);
    expect(state.factionReserveBonds?.["bond_test"].remainingRepayment).toBe(3300);
    expect(state.factionReserveBonds?.["bond_test"].status).toBe("Defaulted");
    // global reputation standing heavily penalized (-20) from 50 to 30
    expect(state.factionRep?.["rangers"]).toBe(30);

    // Let's reset and give enough war chest to test successful amortization!
    state.factionReserveBonds!["bond_test"] = {
      id: "bond_test",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      faceValue: 3000,
      interestRate: 10,
      termEpochs: 3,
      remainingEpochs: 3,
      couponPayout: 1100,
      totalRepayment: 3300,
      remainingRepayment: 3300,
      status: "Active",
      timestamp: 1000,
    };
    state.syndicates!["alpha_squad"].warChest = 5000;
    state.factionReservePools!["rangers"] = 7000;
    state.factionRep!["rangers"] = 50;

    // Tick 1
    state = tickProductionLabs(state, []);
    expect(state.factionReserveBonds?.["bond_test"].remainingEpochs).toBe(2);
    expect(state.factionReserveBonds?.["bond_test"].remainingRepayment).toBe(2200);
    expect(state.factionReserveBonds?.["bond_test"].status).toBe("Active");
    expect(state.syndicates?.["alpha_squad"].warChest).toBe(3900); // 5000 - 1100
    expect(state.factionReservePools?.["rangers"]).toBe(8100); // 7000 + 1100

    // Tick 2
    state = tickProductionLabs(state, []);
    expect(state.factionReserveBonds?.["bond_test"].remainingEpochs).toBe(1);
    expect(state.factionReserveBonds?.["bond_test"].remainingRepayment).toBe(1100);
    expect(state.factionReserveBonds?.["bond_test"].status).toBe("Active");
    expect(state.syndicates?.["alpha_squad"].warChest).toBe(2800);
    expect(state.factionReservePools?.["rangers"]).toBe(9200);

    // Tick 3
    state = tickProductionLabs(state, []);
    expect(state.factionReserveBonds?.["bond_test"].remainingEpochs).toBe(0);
    expect(state.factionReserveBonds?.["bond_test"].remainingRepayment).toBe(0);
    expect(state.factionReserveBonds?.["bond_test"].status).toBe("Matured");
    expect(state.syndicates?.["alpha_squad"].warChest).toBe(1700);
    expect(state.factionReservePools?.["rangers"]).toBe(10300);
  });

  it("should converge sovereign bond and proposals state via Gossip LWW mergeMonotonicStateFields", () => {
    let stateA = createInitialState({
      seed: 111,
      start: "market",
      agentsInit: ["player"],
    });
    let stateB = createInitialState({
      seed: 222,
      start: "market",
      agentsInit: ["player"],
    });

    // Node A has proposal 1, active bond A
    stateA.sovereignDebtProposals = {
      prop_1: {
        id: "prop_1",
        syndicateId: "alpha",
        factionId: "rangers",
        faceValue: 1000,
        interestRate: 5,
        termEpochs: 2,
        timestamp: 100,
        resolved: true,
      },
    };
    stateA.factionReserveBonds = {
      bond_1: {
        id: "bond_1",
        syndicateId: "alpha",
        factionId: "rangers",
        faceValue: 1000,
        interestRate: 5,
        termEpochs: 2,
        remainingEpochs: 2,
        couponPayout: 525,
        totalRepayment: 1050,
        remainingRepayment: 1050,
        status: "Active",
        timestamp: 100,
      },
    };

    // Node B has proposal 2, active bond B
    stateB.sovereignDebtProposals = {
      prop_2: {
        id: "prop_2",
        syndicateId: "beta",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 10,
        termEpochs: 4,
        timestamp: 200,
        resolved: false,
      },
    };
    stateB.factionReserveBonds = {
      bond_1: {
        id: "bond_1",
        syndicateId: "alpha",
        factionId: "rangers",
        faceValue: 1000,
        interestRate: 5,
        termEpochs: 2,
        remainingEpochs: 1,
        couponPayout: 525,
        totalRepayment: 1050,
        remainingRepayment: 525,
        status: "Active",
        timestamp: 150, // more recent timestamp on Node B
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Verify proposals merged
    expect(merged.sovereignDebtProposals?.["prop_1"]).toBeDefined();
    expect(merged.sovereignDebtProposals?.["prop_2"]).toBeDefined();

    // Verify bonds merged, with bond_1 taking node B's newer state (remaining repayment 525)
    expect(merged.factionReserveBonds?.["bond_1"]).toBeDefined();
    expect(merged.factionReserveBonds?.["bond_1"].remainingRepayment).toBe(525);
    expect(merged.factionReserveBonds?.["bond_1"].remainingEpochs).toBe(1);
  });
});

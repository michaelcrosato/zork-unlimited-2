import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Sovereign Debt Restructuring & Faction Bailouts (AF-124)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "sovereign_debt_restructure_pack",
      title: "Sovereign Debt Restructure Test Pack",
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

  it("should support proposing, voting, and resolving a PROPOSE_SOVEREIGN_DEBT_RESTRUCTURE action", () => {
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

    // Setup an active bond directly
    state.factionReserveBonds = {
      bond_1: {
        id: "bond_1",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100, // (3000 + 10% = 3300) / 3 = 1100
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Active",
        timestamp: 1000,
      },
    };

    // Try proposing restructure with higher interest rate - should fail validation
    const invalidProposalAction = {
      type: "PROPOSE_SOVEREIGN_DEBT_RESTRUCTURE",
      proposalId: "restruct_1",
      bondId: "bond_1",
      syndicateId: "alpha_squad",
      extensionEpochs: 2,
      newInterestRate: 15, // original was 10
      timestamp: 1002,
    };

    let failRes = multiAgentStep(state, { agentId: "player", action: invalidProposalAction as any }, mockPack);
    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("cannot exceed");

    // Propose valid restructure (extend by 2 epochs, reduce interest rate to 5%)
    const proposalAction = {
      type: "PROPOSE_SOVEREIGN_DEBT_RESTRUCTURE",
      proposalId: "restruct_1",
      bondId: "bond_1",
      syndicateId: "alpha_squad",
      extensionEpochs: 2,
      newInterestRate: 5, // original was 10
      timestamp: 1002,
    };

    let propRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(propRes.ok).toBe(true);

    state = propRes.state;
    expect(state.sovereignDebtRestructureProposals?.["restruct_1"]).toBeDefined();
    expect(state.sovereignDebtRestructureProposals?.["restruct_1"].votes?.["player"].vote).toBe(true);
    expect(state.sovereignDebtRestructureProposals?.["restruct_1"].resolved).toBe(false);

    // Vote FOR restructure by Alice to reach majority consensus
    const voteAction = {
      type: "VOTE_SOVEREIGN_DEBT_RESTRUCTURE",
      syndicateId: "alpha_squad",
      proposalId: "restruct_1",
      vote: true,
      timestamp: 1003,
    };

    let voteRes = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    // Restructuring should be resolved and active bond parameters updated
    const prop = state.sovereignDebtRestructureProposals?.["restruct_1"];
    expect(prop?.resolved).toBe(true);

    const bond = state.factionReserveBonds?.["bond_1"];
    expect(bond).toBeDefined();
    expect(bond?.status).toBe("Active");
    expect(bond?.interestRate).toBe(5);
    expect(bond?.remainingEpochs).toBe(4); // 3 + 2 = 5, then ticked to 4
    expect(bond?.termEpochs).toBe(5); // 3 + 2 = 5

    // Math:
    // faceValue = 3000. newInterestRate = 5% => totalRepayment = 3000 + 150 = 3150.
    // amountPaid = 3300 - 3300 = 0.
    // remainingRepayment = 3150.
    // couponPayout = 3150 / 5 = 630.
    // Ticked once: remainingRepayment becomes 3150 - 630 = 2520.
    expect(bond?.totalRepayment).toBe(3150);
    expect(bond?.remainingRepayment).toBe(2520);
    expect(bond?.couponPayout).toBe(630);
  });

  it("should cure default on sovereign debt restructure", () => {
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

    // Setup a defaulted bond directly
    state.factionReserveBonds = {
      bond_2: {
        id: "bond_2",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100,
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Defaulted",
        timestamp: 1000,
      },
    };

    const proposalAction = {
      type: "PROPOSE_SOVEREIGN_DEBT_RESTRUCTURE",
      proposalId: "restruct_2",
      bondId: "bond_2",
      syndicateId: "alpha_squad",
      extensionEpochs: 3,
      newInterestRate: 0,
      timestamp: 1002,
    };

    let propRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(propRes.ok).toBe(true);
    state = propRes.state;

    const voteAction = {
      type: "VOTE_SOVEREIGN_DEBT_RESTRUCTURE",
      syndicateId: "alpha_squad",
      proposalId: "restruct_2",
      vote: true,
      timestamp: 1003,
    };

    let voteRes = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    const bond = state.factionReserveBonds?.["bond_2"];
    expect(bond?.status).toBe("Active"); // default cured!
    expect(bond?.remainingEpochs).toBe(5); // 3 + 3 = 6, ticked to 5
    expect(bond?.interestRate).toBe(0);
    expect(bond?.totalRepayment).toBe(3000); // 3000 + 0% = 3000
    // Math:
    // faceValue = 3000, interestRate = 0% => totalRepayment = 3000.
    // remainingEpochs = 6. couponPayout = 500.
    // Ticked once: remainingRepayment becomes 3000 - 500 = 2500.
    expect(bond?.remainingRepayment).toBe(2500);
    expect(bond?.couponPayout).toBe(500); // 3000 / 6 = 500
  });

  it("should support proposing, voting, and resolving a PROPOSE_FACTION_BAILOUT action", () => {
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

    // Setup a defaulted bond
    state.factionReserveBonds = {
      bond_3: {
        id: "bond_3",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100,
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Defaulted",
        timestamp: 1000,
      },
    };

    // Setup faction reserve pool
    state.factionReservePools = { rangers: 10000 };

    // Try proposing bailout with non-creditor faction - should fail validation
    const invalidProposalAction = {
      type: "PROPOSE_FACTION_BAILOUT",
      proposalId: "bailout_1",
      bondId: "bond_3",
      syndicateId: "alpha_squad",
      factionId: "mages", // actual was rangers
      timestamp: 1002,
    };

    let failRes = multiAgentStep(state, { agentId: "player", action: invalidProposalAction as any }, mockPack);
    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("was issued with faction rangers, not mages");

    // Propose valid bailout
    const proposalAction = {
      type: "PROPOSE_FACTION_BAILOUT",
      proposalId: "bailout_1",
      bondId: "bond_3",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      timestamp: 1002,
    };

    let propRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(propRes.ok).toBe(true);
    state = propRes.state;

    expect(state.factionBailoutProposals?.["bailout_1"]).toBeDefined();
    expect(state.factionBailoutProposals?.["bailout_1"].votes?.["player"].vote).toBe(true);

    // Vote FOR bailout by Alice
    const voteAction = {
      type: "VOTE_FACTION_BAILOUT",
      syndicateId: "alpha_squad",
      proposalId: "bailout_1",
      vote: true,
      timestamp: 1003,
    };

    let voteRes = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    // Bailout should be resolved
    const prop = state.factionBailoutProposals?.["bailout_1"];
    expect(prop?.resolved).toBe(true);

    // Verify faction reserve pool reduced by remaining debt (10000 - 3300 = 6700)
    expect(state.factionReservePools?.["rangers"]).toBe(6700);

    // Verify bond is fully covered and matured
    const bond = state.factionReserveBonds?.["bond_3"];
    expect(bond?.remainingRepayment).toBe(0);
    expect(bond?.status).toBe("Matured");
  });

  it("should converge sovereign debt restructure and bailout proposals via Gossip LWW", () => {
    let stateA = createInitialState({
      seed: 111,
      start: "market",
      agentsInit: ["player", "alice"],
    });
    let stateB = createInitialState({
      seed: 222,
      start: "market",
      agentsInit: ["player", "alice"],
    });

    stateA.sovereignDebtRestructureProposals = {
      restruct_test: {
        id: "restruct_test",
        bondId: "bond_test",
        syndicateId: "alpha",
        extensionEpochs: 2,
        newInterestRate: 5,
        timestamp: 100,
        resolved: false,
        votes: {
          player: { vote: true, timestamp: 100 },
        },
      },
    };

    stateB.sovereignDebtRestructureProposals = {
      restruct_test: {
        id: "restruct_test",
        bondId: "bond_test",
        syndicateId: "alpha",
        extensionEpochs: 2,
        newInterestRate: 5,
        timestamp: 100,
        resolved: false,
        votes: {
          alice: { vote: true, timestamp: 120 },
        },
      },
    };

    stateA.factionBailoutProposals = {
      bail_test: {
        id: "bail_test",
        bondId: "bond_test",
        syndicateId: "alpha",
        factionId: "rangers",
        timestamp: 150,
        resolved: false,
        votes: {
          player: { vote: true, timestamp: 150 },
        },
      },
    };

    stateB.factionBailoutProposals = {
      bail_test: {
        id: "bail_test",
        bondId: "bond_test",
        syndicateId: "alpha",
        factionId: "rangers",
        timestamp: 150,
        resolved: false,
        votes: {
          alice: { vote: true, timestamp: 160 },
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Assert restructure proposals merged and votes combined
    expect(merged.sovereignDebtRestructureProposals?.["restruct_test"]).toBeDefined();
    expect(merged.sovereignDebtRestructureProposals?.["restruct_test"].votes?.["player"]).toBeDefined();
    expect(merged.sovereignDebtRestructureProposals?.["restruct_test"].votes?.["alice"]).toBeDefined();

    // Assert bailout proposals merged and votes combined
    expect(merged.factionBailoutProposals?.["bail_test"]).toBeDefined();
    expect(merged.factionBailoutProposals?.["bail_test"].votes?.["player"]).toBeDefined();
    expect(merged.factionBailoutProposals?.["bail_test"].votes?.["alice"]).toBeDefined();
  });
});

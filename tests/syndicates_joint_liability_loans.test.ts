import { describe, it, expect } from "vitest";
import { createInitialState, getJointLoanLimit, isCollateralLocked } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Joint-Liability Loan Groups & Collective Collateral Pledges (AF-91)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "joint_loans_test_pack",
      title: "Joint Loans Test Pack",
      start_room: "clearing",
      vars_init: { gold: 500, gold_alice: 100 },
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

  it("should calculate correct joint borrowing limits and check collateral locking in proposals and active loans", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 100 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50, // 50 dominance -> scale multiplier 1x
      },
    };

    state.npcRep = {
      player: 100,
      alice: 100,
    };

    // Safehouse collateral value for player: (level 2 * 200) + (storageUpgradeLevel 1 * 100) = 500 gold limit
    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1,
      },
    };

    // Outpost collateral value for alice: (securityLevel 2 * 150) + (0 turrets * 100) = 300 gold limit
    state.turfGuardOutposts = {
      clearing: {
        roomId: "clearing",
        syndicateId: "blood_fangs",
        securityLevel: 2,
        turrets: {},
        timestamp: 1000,
      },
    };

    // Player limit = 500. Alice limit = 300.
    // Collective limit = floor((500 + 300) * 1.2) = floor(800 * 1.2) = 960 gold.
    const jointLimit = getJointLoanLimit(state, "blood_fangs", ["player", "alice"], [
      { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
    ]);
    expect(jointLimit).toBe(960);

    // Initial check: not locked
    expect(isCollateralLocked(state, "safehouse", "clearing")).toBe(false);
    expect(isCollateralLocked(state, "outpost", "clearing")).toBe(false);

    // 1. Lock in proposal
    state.jointLoanProposals = {
      group1: {
        id: "group1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" }
        ],
        amount: 400,
        timestamp: 1000,
        approvals: { player: true }
      }
    };
    expect(isCollateralLocked(state, "safehouse", "clearing")).toBe(true);

    // 2. Lock in active joint loan
    delete state.jointLoanProposals;
    state.jointLoans = {
      group1: {
        id: "group1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
        ],
        amount: 400,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 15,
        timestamp: 1000
      }
    };
    expect(isCollateralLocked(state, "outpost", "clearing")).toBe(true);
  });

  it("should handle the decentralized PROPOSE_JOINT_LOAN proposal, multi-agent approvals, and consensual funding", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 100 },
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

    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 500
      },
    };

    state.turfGuardOutposts = {
      clearing: {
        roomId: "clearing",
        syndicateId: "blood_fangs",
        securityLevel: 2,
        turrets: {},
        timestamp: 1000, // value 300
      },
    };

    // 1. Propose joint loan by Player
    const action1 = {
      type: "PROPOSE_JOINT_LOAN",
      groupId: "jgroup1",
      syndicateId: "blood_fangs",
      members: ["player", "alice"],
      collaterals: [
        { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
        { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
      ],
      amount: 600,
      timestamp: 1000
    };

    let result1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(result1.ok).toBe(true);
    expect(result1.state.jointLoanProposals?.jgroup1).toBeDefined();
    expect(result1.state.jointLoanProposals?.jgroup1.approvals.player).toBe(true);
    expect(result1.state.jointLoanProposals?.jgroup1.approvals.alice).toBeUndefined();
    // Pledged collaterals should now be locked
    expect(isCollateralLocked(result1.state, "safehouse", "clearing")).toBe(true);
    expect(isCollateralLocked(result1.state, "outpost", "clearing")).toBe(true);

    // 2. Approve/Propose by Alice
    const action2 = {
      type: "PROPOSE_JOINT_LOAN",
      groupId: "jgroup1",
      syndicateId: "blood_fangs",
      members: ["player", "alice"],
      collaterals: [
        { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
        { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
      ],
      amount: 600,
      timestamp: 1010
    };

    let result2 = multiAgentStep(result1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(result2.ok).toBe(true);
    // Once Alice approves, the proposal is fully approved and funded!
    expect(result2.state.jointLoanProposals?.jgroup1).toBeUndefined(); // removed
    expect(result2.state.jointLoans?.jgroup1).toBeDefined(); // now active

    // Proportions: player contributed 500, alice 300. Total = 800.
    // Player share: floor(600 * 500/800) = floor(375) = 375 gold.
    // Alice share: remainder = 600 - 375 = 225 gold.
    // Player gold should be: 100 + 375 = 475.
    // Alice gold should be: 100 + 225 = 325.
    expect(result2.state.vars.gold).toBe(475);
    expect(result2.state.vars.gold_alice).toBe(325);

    // Active loan fields
    const loan = result2.state.jointLoans?.jgroup1;
    expect(loan).toBeDefined();
    if (!loan) throw new Error("loan undefined");
    expect(loan.amount).toBe(600);
    expect(loan.interestAccrued).toBe(0);
    expect(loan.dueStep).toBe(16);
  });

  it("should handle proportional payback, credit rating increases, and full liquidation on loan resolution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 400 },
      agentsInit: ["player", "alice"],
    });

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
          { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
        ],
        amount: 600,
        interestAccrued: 50,
        borrowStep: 1,
        dueStep: 20,
        timestamp: 1000
      }
    };

    state.creditRatings = {
      player: 100,
      alice: 100
    };

    // 1. Alice partially pays back 200 gold
    const actionPay = {
      type: "PAYBACK_JOINT_LOAN",
      groupId: "jgroup1",
      amount: 200,
      timestamp: 1010
    };

    let res1 = multiAgentStep(state, { agentId: "alice", action: actionPay as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.vars.gold_alice).toBe(200); // 400 - 200 = 200
    
    // Remaining interest: 0. Remaining principal: 600 - (200 - 50) = 450.
    const l1 = res1.state.jointLoans?.jgroup1;
    expect(l1).toBeDefined();
    if (!l1) throw new Error("l1 undefined");
    expect(l1.amount).toBe(450);
    expect(l1.interestAccrued).toBe(0);

    // Alice credit rating increases by +5
    expect(res1.state.creditRatings?.alice).toBe(105);
    expect(res1.state.creditRatings?.player).toBe(100); // unchanged

    // 2. Alice pays off the rest of the loan (450 gold)
    res1.state.vars.gold_alice = 500; // give alice enough gold
    const actionPayAll = {
      type: "PAYBACK_JOINT_LOAN",
      groupId: "jgroup1",
      amount: 450,
      timestamp: 1020
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: actionPayAll as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.jointLoans?.jgroup1).toBeUndefined(); // dissolved

    // Both members' credit rating increases by +15 on full payback resolution
    expect(res2.state.creditRatings?.alice).toBe(120); // 105 + 15 = 120
    expect(res2.state.creditRatings?.player).toBe(115); // 100 + 15 = 115
  });

  it("should ticking interest and trigger automatic proportional default sweeps and asset liquidations on timeout", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 100 },
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
        interestRate: 10, // 10% interest rate
        timestamp: 1000,
      },
    };

    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 500
      },
    };

    state.turfGuardOutposts = {
      clearing: {
        roomId: "clearing",
        syndicateId: "blood_fangs",
        securityLevel: 2,
        turrets: {},
        timestamp: 1000, // value 300
      },
    };

    state.enforcementHeat = {
      clearing: {
        roomId: "clearing",
        heat: 0,
        timestamp: 1000
      }
    };

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
          { agentId: "alice", collateralType: "outpost", collateralId: "clearing" }
        ],
        amount: 500,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    state.creditRatings = {
      player: 100,
      alice: 100
    };

    // Step 5: Ticking economy should accrue interest: 10% of 500 = 50 gold.
    state.step = 5;
    let ticked1 = tickEconomy(state, mockPack);
    expect(ticked1.jointLoans?.jgroup1.interestAccrued).toBe(50);

    // Step 15: Ticking economy after dueStep (10) triggers default sweep!
    // Total due: 500 (principal) + 100 (interest) = 600.
    // Proportions: Player = 500/800 = 62.5%. Alice = 300/800 = 37.5%.
    // Player due: floor(600 * 0.625) = 375.
    // Alice due: remainder = 225.
    // Player has 100 gold -> swept to 0. Remaining player due: 275.
    // Alice has 100 gold -> swept to 0. Remaining alice due: 125.
    ticked1.step = 15;
    let ticked2 = tickEconomy(ticked1, mockPack);

    expect(ticked2.jointLoans?.jgroup1).toBeUndefined(); // dissolved due to default
    expect(ticked2.vars.gold).toBe(0);
    expect(ticked2.vars.gold_alice).toBe(0);

    // All collateral assets must be liquidated (deleted)
    expect(ticked2.safehouses?.clearing).toBeUndefined();
    expect(ticked2.turfGuardOutposts?.clearing).toBeUndefined();

    // Credit rating drops by -50
    expect(ticked2.creditRatings?.player).toBe(50);
    expect(ticked2.creditRatings?.alice).toBe(50);

    // Default alerts are published
    expect(ticked2.defaultAlerts?.player_blood_fangs).toBeDefined();
    expect(ticked2.defaultAlerts?.alice_blood_fangs).toBeDefined();

    // Enforcement heat in clearing room increases by +15 for each of the two liquidated collaterals -> 30 heat total
    expect(ticked2.enforcementHeat?.clearing.heat).toBe(30);
  });

  it("should merge joint loan proposals and active joint loans using Gossip LWW synchronization rules", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanProposals = {
      g1: {
        id: "g1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [],
        amount: 200,
        timestamp: 1000,
        approvals: { player: true }
      }
    };

    stateB.jointLoanProposals = {
      g1: {
        id: "g1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [],
        amount: 200,
        timestamp: 1050, // newer timestamp
        approvals: { player: true, alice: true }
      }
    };

    stateA.jointLoans = {
      loan1: {
        id: "loan1",
        syndicateId: "blood_fangs",
        members: ["player"],
        collaterals: [],
        amount: 300,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    stateB.jointLoans = {
      loan1: {
        id: "loan1",
        syndicateId: "blood_fangs",
        members: ["player"],
        collaterals: [],
        amount: 150, // paid back half
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1050 // newer timestamp
      }
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Proposal should converge to the newer stateB (fully approved)
    expect(merged.jointLoanProposals?.g1.approvals.alice).toBe(true);
    expect(merged.jointLoanProposals?.g1.timestamp).toBe(1050);

    // Active loan should converge to stateB (amount 150)
    expect(merged.jointLoans?.loan1.amount).toBe(150);
    expect(merged.jointLoans?.loan1.timestamp).toBe(1050);
  });

  it("should handle decentralized PROPOSE_JOINT_REFINANCING, require majority approval from group members and syndicate bank members, and update active loan terms", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 100 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice", "bob"],
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

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [],
        amount: 500,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    // 1. Group member 'player' proposes refinancing
    // Group members = ['player', 'alice'] (size 2). Group majority threshold is > 1.
    // Syndicate members = ['player', 'alice', 'bob'] (size 3). Bank majority threshold is > 1.5.
    const action1 = {
      type: "PROPOSE_JOINT_REFINANCING",
      groupId: "jgroup1",
      newDueStep: 30,
      newInterestRate: 2,
      timestamp: 1010
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    // Loan terms shouldn't be updated yet because we don't have a majority approval
    expect(res1.state.jointLoans?.jgroup1.dueStep).toBe(10);
    expect(res1.state.jointLoans?.jgroup1.refinancedInterestRate).toBeUndefined();
    expect(res1.state.jointLoanRefinancingVotes?.jgroup1?.player).toBeDefined();

    // 2. Non-member 'bob' tries to vote but bob is in syndicate (so he represents the bank).
    // Bob votes. Since Bob is not in the group, his vote counts towards the bank majority, but not group majority.
    const action2 = {
      type: "PROPOSE_JOINT_REFINANCING",
      groupId: "jgroup1",
      newDueStep: 30,
      newInterestRate: 2,
      timestamp: 1015
    };

    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.jointLoans?.jgroup1.dueStep).toBe(10); // still not approved

    // 3. Group member 'alice' votes. Alice is also in syndicate.
    // Group votes for (30, 2): ['player', 'alice'] (size 2 > group threshold of 1) -> Group approved!
    // Bank votes for (30, 2): ['player', 'bob', 'alice'] (size 3 > bank threshold of 1.5) -> Bank approved!
    // Now both approved! Restructured terms are applied.
    const action3 = {
      type: "PROPOSE_JOINT_REFINANCING",
      groupId: "jgroup1",
      newDueStep: 30,
      newInterestRate: 2,
      timestamp: 1020
    };

    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);
    // Loan terms must be updated now!
    expect(res3.state.jointLoans?.jgroup1.dueStep).toBe(30);
    expect(res3.state.jointLoans?.jgroup1.refinancedInterestRate).toBe(2);
    // Votes must be cleared on consensus resolution
    expect(res3.state.jointLoanRefinancingVotes?.jgroup1).toBeUndefined();
  });

  it("should merge jointLoanRefinancingVotes and reconcile terms across Gossip synchronization", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanRefinancingVotes = {
      jgroup1: {
        player: {
          newDueStep: 30,
          newInterestRate: 2,
          timestamp: 1050,
        }
      }
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateB.jointLoanRefinancingVotes = {
      jgroup1: {
        player: {
          newDueStep: 20,
          newInterestRate: 5,
          timestamp: 1020, // older vote
        }
      }
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.jointLoanRefinancingVotes?.jgroup1?.player.timestamp).toBe(1050);
    expect(merged.jointLoanRefinancingVotes?.jgroup1?.player.newDueStep).toBe(30);
    expect(merged.jointLoanRefinancingVotes?.jgroup1?.player.newInterestRate).toBe(2);
  });
});

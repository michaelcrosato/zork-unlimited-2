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

  it("should handle PROPOSE_COLLATERAL_SUBSTITUTION voting, consensus and executing collateral substitution", () => {
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
      clearing2: {
        id: "sh2",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 3,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 700
      },
    };

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" }
        ],
        amount: 400,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    // 1. Propose substitution: remove sh1 (clearing), add sh2 (clearing2)
    const action1 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      addCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing2" },
      timestamp: 1010
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.jointLoanCollateralSubstitutionVotes?.jgroup1?.player).toBeDefined();

    // 2. Bob (bank member) votes for the same substitution
    const action2 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      addCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing2" },
      timestamp: 1015
    };

    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);

    // 3. Alice (group member) votes
    const action3 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      addCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing2" },
      timestamp: 1020
    };

    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);

    // After consensus: collateral should be substituted!
    const loan = res3.state.jointLoans?.jgroup1;
    expect(loan?.collaterals.length).toBe(1);
    expect(loan?.collaterals[0].collateralId).toBe("clearing2");
    expect(res3.state.jointLoanCollateralSubstitutionVotes?.jgroup1).toBeUndefined(); // cleared
  });

  it("should handle early release collateral substitution when remaining limit covers outstanding balance", () => {
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
      clearing2: {
        id: "sh2",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 3,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 700
      },
    };

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing2" }
        ],
        // outstanding amount is 200. sh2 alone provides 700 limit, which is > 200, so we can release sh1!
        amount: 200,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    // Propose releasing sh1 (clearing) without adding any collateral
    const action1 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      timestamp: 1010
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);

    const action2 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      timestamp: 1015
    };
    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);

    const action3 = {
      type: "PROPOSE_COLLATERAL_SUBSTITUTION",
      groupId: "jgroup1",
      removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
      timestamp: 1020
    };
    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);

    // After consensus: sh1 should be released, leaving only sh2 (clearing2)
    const loan = res3.state.jointLoans?.jgroup1;
    expect(loan?.collaterals.length).toBe(1);
    expect(loan?.collaterals[0].collateralId).toBe("clearing2");
  });

  it("should automatically trigger pro-rata early collateral release on partial loan paybacks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 400 },
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
      clearing2: {
        id: "sh2",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 3,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 700 -> joint limit 700 * 1.2 = 840
      },
    };

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing2" }
        ],
        amount: 1000, // exceeds either limit individually
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 20,
        timestamp: 1000
      }
    };

    // Alice pays back 300 gold -> remaining balance is 700 gold.
    // Remaining collateral sh2 alone has value 700, limit = 700 * 1.2 = 840 gold, which is >= remaining balance of 700!
    // So sh1 should be automatically released!
    const actionPay = {
      type: "PAYBACK_JOINT_LOAN",
      groupId: "jgroup1",
      amount: 300,
      timestamp: 1010
    };

    let res = multiAgentStep(state, { agentId: "alice", action: actionPay as any }, mockPack);
    expect(res.ok).toBe(true);

    const loan = res.state.jointLoans?.jgroup1;
    expect(loan).toBeDefined();
    expect(loan?.amount).toBe(700);
    // sh1 must be released pro-rata!
    expect(loan?.collaterals.length).toBe(1);
    expect(loan?.collaterals[0].collateralId).toBe("clearing2");
  });

  it("should merge jointLoanCollateralSubstitutionVotes and reconcile terms across Gossip synchronization", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanCollateralSubstitutionVotes = {
      jgroup1: {
        player: {
          removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "sh1" },
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

    stateB.jointLoanCollateralSubstitutionVotes = {
      jgroup1: {
        player: {
          removeCollateral: { agentId: "player", collateralType: "safehouse", collateralId: "sh2" }, // different vote
          timestamp: 1020, // older
        }
      }
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.jointLoanCollateralSubstitutionVotes?.jgroup1?.player.timestamp).toBe(1050);
    expect(merged.jointLoanCollateralSubstitutionVotes?.jgroup1?.player.removeCollateral.collateralId).toBe("sh1");
  });

  it("should handle decentralized PROPOSE_JOINT_DEBT_SETTLEMENT, require double-majority, calculate pro-rata shares, deduct gold, restore credit ratings, and clear default alerts upon consensus execution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 200, gold_alice: 200 },
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

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" }, // 500 value
          { agentId: "alice", collateralType: "outpost", collateralId: "clearing" } // 300 value
        ],
        amount: 500,
        interestAccrued: 100,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000
      }
    };

    state.creditRatings = {
      player: 100,
      alice: 100
    };

    state.defaultAlerts = {
      player_blood_fangs: { agentId: "player", syndicateId: "blood_fangs", defaultStep: 10, timestamp: 1010 },
      alice_blood_fangs: { agentId: "alice", syndicateId: "blood_fangs", defaultStep: 10, timestamp: 1010 }
    };

    // 1. Group member 'player' proposes debt settlement of 240 gold (total for group)
    // Proportions: Player = 500/800 = 62.5%. Alice = 300/800 = 37.5%.
    // Player share: floor(240 * 0.625) = 150 gold.
    // Alice share: remainder = 90 gold.
    const action1 = {
      type: "PROPOSE_JOINT_DEBT_SETTLEMENT",
      groupId: "jgroup1",
      settlementAmount: 240,
      timestamp: 1020
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    // Loan shouldn't be settled yet (no double-majority consensus)
    expect(res1.state.jointLoans?.jgroup1).toBeDefined();
    expect(res1.state.jointLoanDebtSettlementVotes?.jgroup1?.player).toBeDefined();

    // 2. Syndicate bank member 'bob' votes for 240 gold
    const action2 = {
      type: "PROPOSE_JOINT_DEBT_SETTLEMENT",
      groupId: "jgroup1",
      settlementAmount: 240,
      timestamp: 1025
    };

    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.jointLoans?.jgroup1).toBeDefined(); // still not enough group votes

    // 3. Group member 'alice' votes for 240 gold
    // Group votes for 240: player, alice (2/2 = majority > 1) -> approved!
    // Bank votes for 240: player, bob, alice (3/3 = majority > 1.5) -> approved!
    // All members have enough gold: player has 200 >= 150, alice has 200 >= 90.
    // Settle!
    const action3 = {
      type: "PROPOSE_JOINT_DEBT_SETTLEMENT",
      groupId: "jgroup1",
      settlementAmount: 240,
      timestamp: 1030
    };

    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);

    // Loan must be dissolved/deleted
    expect(res3.state.jointLoans?.jgroup1).toBeUndefined();

    // Gold deducted pro-rata
    expect(res3.state.vars.gold).toBe(50); // 200 - 150 = 50
    expect(res3.state.vars.gold_alice).toBe(110); // 200 - 90 = 110

    // Credit rating increased by +15
    expect(res3.state.creditRatings?.player).toBe(115);
    expect(res3.state.creditRatings?.alice).toBe(115);

    // Default alerts cleared
    expect(res3.state.defaultAlerts?.player_blood_fangs).toBeUndefined();
    expect(res3.state.defaultAlerts?.alice_blood_fangs).toBeUndefined();

    // Votes cleared
    expect(res3.state.jointLoanDebtSettlementVotes?.jgroup1).toBeUndefined();
  });

  it("should merge jointLoanDebtSettlementVotes and reconcile terms across Gossip synchronization", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanDebtSettlementVotes = {
      jgroup1: {
        player: {
          settlementAmount: 240,
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

    stateB.jointLoanDebtSettlementVotes = {
      jgroup1: {
        player: {
          settlementAmount: 180,
          timestamp: 1020, // older
        }
      }
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.jointLoanDebtSettlementVotes?.jgroup1?.player.timestamp).toBe(1050);
    expect(merged.jointLoanDebtSettlementVotes?.jgroup1?.player.settlementAmount).toBe(240);
  });

  it("should handle SWAP_JOINT_COLLATERAL voting, consensus, value validation, and Gossip mesh convergence (AF-96)", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 200, gold_alice: 200 },
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

    state.safehouses = {
      clearing: {
        id: "clearing",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 1, // value 500
      },
      woods: {
        id: "woods",
        roomId: "woods",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 2, // value 600
      },
    };

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" }, // 500 value
        ],
        amount: 300,
        interestAccrued: 50,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    // 1. Group member 'player' proposes swapping 'clearing' (value 500) for 'woods' (value 600)
    const action1 = {
      type: "SWAP_JOINT_COLLATERAL",
      groupId: "jgroup1",
      removeCollateralType: "safehouse",
      removeCollateralId: "clearing",
      addCollateralType: "safehouse",
      addCollateralId: "woods",
      timestamp: 1020,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    // Should register the vote but NOT swap yet (no double-majority)
    expect(res1.state.jointLoans?.jgroup1?.collaterals[0].collateralId).toBe("clearing");
    expect(res1.state.jointLoanCollateralSwapVotes?.jgroup1?.player).toBeDefined();

    // 2. Syndicate bank member 'bob' votes for the swap
    const action2 = {
      type: "SWAP_JOINT_COLLATERAL",
      groupId: "jgroup1",
      removeCollateralType: "safehouse",
      removeCollateralId: "clearing",
      addCollateralType: "safehouse",
      addCollateralId: "woods",
      timestamp: 1025,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    // Still not enough group majority (only player voted in group, alice has not)
    expect(res2.state.jointLoans?.jgroup1?.collaterals[0].collateralId).toBe("clearing");

    // 3. Group member 'alice' votes for the swap
    const action3 = {
      type: "SWAP_JOINT_COLLATERAL",
      groupId: "jgroup1",
      removeCollateralType: "safehouse",
      removeCollateralId: "clearing",
      addCollateralType: "safehouse",
      addCollateralId: "woods",
      timestamp: 1030,
    };

    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);

    // Consensus reached! The collateral must be swapped to 'woods'
    expect(res3.state.jointLoans?.jgroup1?.collaterals[0].collateralId).toBe("woods");
    // Votes must be cleared
    expect(res3.state.jointLoanCollateralSwapVotes?.jgroup1).toBeUndefined();
  });

  it("should merge jointLoanCollateralSwapVotes and reconcile terms across Gossip synchronization", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanCollateralSwapVotes = {
      jgroup1: {
        player: {
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "woods",
          timestamp: 1050,
        },
      },
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateB.jointLoanCollateralSwapVotes = {
      jgroup1: {
        player: {
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "clearing",
          timestamp: 1020, // older
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.jointLoanCollateralSwapVotes?.jgroup1?.player.timestamp).toBe(1050);
    expect(merged.jointLoanCollateralSwapVotes?.jgroup1?.player.addCollateralId).toBe("woods");
  });

  it("should handle PROPOSE_JOINT_LOAN_GRACE_PERIOD voting, consensus, enforcer sweep delay, and Gossip mesh convergence (AF-97)", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {
        gold: 100,
        gold_alice: 100,
      },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["bob"],
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
        id: "clearing",
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

    state.jointLoans = {
      jgroup1: {
        id: "jgroup1",
        syndicateId: "blood_fangs",
        members: ["player", "alice"],
        collaterals: [
          { agentId: "player", collateralType: "safehouse", collateralId: "clearing" },
        ],
        amount: 300,
        interestAccrued: 50,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    // 1. Group member 'player' proposes grace period of 5 steps
    const action1 = {
      type: "PROPOSE_JOINT_LOAN_GRACE_PERIOD",
      groupId: "jgroup1",
      extensionSteps: 5,
      timestamp: 1020,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    // Grace period should NOT be set yet since there is no consensus
    expect(res1.state.jointLoans?.jgroup1?.gracePeriodSteps).toBeUndefined();
    expect(res1.state.jointLoanGracePeriodVotes?.jgroup1?.player).toBeDefined();

    // 2. Bank member 'bob' votes
    const action2 = {
      type: "PROPOSE_JOINT_LOAN_GRACE_PERIOD",
      groupId: "jgroup1",
      extensionSteps: 5,
      timestamp: 1025,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "bob", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    // Grace period should still not be set (needs alice to vote in the group too)
    expect(res2.state.jointLoans?.jgroup1?.gracePeriodSteps).toBeUndefined();

    // 3. Alice votes
    const action3 = {
      type: "PROPOSE_JOINT_LOAN_GRACE_PERIOD",
      groupId: "jgroup1",
      extensionSteps: 5,
      timestamp: 1030,
    };

    let res3 = multiAgentStep(res2.state, { agentId: "alice", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);

    // Consensus reached! gracePeriodSteps should be 5
    expect(res3.state.jointLoans?.jgroup1?.gracePeriodSteps).toBe(5);
    // Votes should be cleared
    expect(res3.state.jointLoanGracePeriodVotes?.jgroup1).toBeUndefined();

    // 4. Test enforcer sweep delay:
    // Let's manually tick the economy at step 11
    let tickedState = res3.state;
    tickedState.step = 11;
    tickedState = tickEconomy(tickedState, mockPack);

    // Should NOT default or liquidate collateral because dueStep is 10 and grace period is 5 (expires after step 15)
    expect(tickedState.jointLoans?.jgroup1).toBeDefined();
    expect(tickedState.safehouses?.clearing).toBeDefined();

    // Now let's manual tick economy at step 16
    tickedState.step = 16;
    tickedState = tickEconomy(tickedState, mockPack);

    // Should now default and liquidate collateral!
    expect(tickedState.jointLoans?.jgroup1).toBeUndefined();
    expect(tickedState.safehouses?.clearing).toBeUndefined();
  });

  it("should merge jointLoanGracePeriodVotes and reconcile terms across Gossip synchronization (AF-97)", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.jointLoanGracePeriodVotes = {
      jgroup1: {
        player: {
          extensionSteps: 5,
          timestamp: 1050,
        },
      },
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateB.jointLoanGracePeriodVotes = {
      jgroup1: {
        player: {
          extensionSteps: 3,
          timestamp: 1020, // older
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.jointLoanGracePeriodVotes?.jgroup1?.player.timestamp).toBe(1050);
    expect(merged.jointLoanGracePeriodVotes?.jgroup1?.player.extensionSteps).toBe(5);
  });
});


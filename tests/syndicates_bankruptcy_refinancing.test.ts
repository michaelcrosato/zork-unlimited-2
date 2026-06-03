import { describe, it, expect } from "vitest";
import { createInitialState, isCollateralLocked } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Bankruptcy Restructuring, Loan Refinancing, and Credit Recovery (AF-89)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_bankruptcy_test_pack",
      title: "Syndicate Bankruptcy Test Pack",
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

  it("should refinance active loans via consensus voting and apply new rates/steps correctly", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
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
        interestRate: 10,
      },
    };

    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };

    // 1. First establish a loan
    const borrowRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 100,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(borrowRes.ok).toBe(true);
    let stateWithLoan = borrowRes.state;

    // Check that default interest is 10% (10 gold interest)
    let initialTickState = tickEconomy(stateWithLoan, mockPack);
    expect(initialTickState.syndicateBanks?.["blood_fangs"]?.loans?.["player"]?.interestAccrued).toBe(10);

    // 2. Cast refinancing votes
    // Player proposes extending due date to step 30 and lowering interest rate to 2%
    const vote1 = multiAgentStep(
      stateWithLoan,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_LOAN_REFINANCING",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          newDueStep: 30,
          newInterestRate: 2,
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(vote1.ok).toBe(true);

    // Alice also votes for step 30 and interest rate 2%
    const vote2 = multiAgentStep(
      vote1.state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_LOAN_REFINANCING",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          newDueStep: 30,
          newInterestRate: 2,
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(vote2.ok).toBe(true);

    let stateWithRefinance = vote2.state;
    const loan = stateWithRefinance.syndicateBanks?.["blood_fangs"]?.loans?.["player"];
    expect(loan?.dueStep).toBe(30);
    expect(loan?.refinancedInterestRate).toBe(2);

    // 3. Tick economy to verify 2% interest rate accrual (2% of 100 = 2 gold per step/tick)
    // reset interest accrued first so we measure interest accrued under new rate
    if (loan) loan.interestAccrued = 0;

    let tickedState = tickEconomy(stateWithRefinance, mockPack);
    const updatedLoan = tickedState.syndicateBanks?.["blood_fangs"]?.loans?.["player"];
    expect(updatedLoan?.interestAccrued).toBe(2); // 2 gold accrued

    // Verify loan does not default at step 16 anymore since it's extended to step 30
    let lateState = tickedState;
    for (let step = 5; step <= 25; step++) {
      lateState.step = step;
      lateState = tickEconomy(lateState, mockPack);
    }
    // Loan remains active at step 25 (not defaulted)
    expect(lateState.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeDefined();
    expect(isCollateralLocked(lateState, "safehouse", "clearing")).toBe(true);
  });

  it("should declare bankruptcy, clear defaults/debt, and perform gradual credit recovery over ticks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100 },
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
    };

    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {},
        timestamp: 1000,
        interestRate: 10,
      },
    };

    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };

    state.enforcementHeat = {
      clearing: { roomId: "clearing", heat: 0, timestamp: 1000 },
    };

    // 1. Borrow and force default
    const borrowRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 100,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    let currState = borrowRes.state;
    // Default the loan
    for (let i = 1; i <= 16; i++) {
      currState.step = i;
      currState = tickEconomy(currState, mockPack);
    }

    // Agent has defaulted! Verify rating is 50, loan is gone, and alert is active.
    expect(currState.creditRatings?.["player"]).toBe(50);
    expect(currState.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeUndefined();
    expect(currState.defaultAlerts?.["player_blood_fangs"]).toBeDefined();

    // Verify blacklisted and cannot borrow again
    const borrowAgainFail = multiAgentStep(
      currState,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 50,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(borrowAgainFail.ok).toBe(false);

    // 2. Declare bankruptcy
    const bankruptcyRes = multiAgentStep(
      currState,
      {
        agentId: "player",
        action: {
          type: "DECLARE_CARTEL_BANKRUPTCY",
          syndicateId: "blood_fangs",
          timestamp: 1020,
        },
      },
      mockPack
    );

    expect(bankruptcyRes.ok).toBe(true);
    let stateInRecovery = bankruptcyRes.state;

    // Verify default alert is cleared, recovery is set up, rating is at least 50
    expect(stateInRecovery.defaultAlerts?.["player_blood_fangs"]).toBeUndefined();
    expect(stateInRecovery.creditRecoveries?.["player"]).toBeDefined();
    expect(stateInRecovery.creditRecoveries?.["player"]?.active).toBe(true);
    expect(stateInRecovery.creditRatings?.["player"]).toBeGreaterThanOrEqual(50);

    // Verify no longer blacklisted from borrowing (fails on lack of collateral now, not blacklist!)
    const borrowAgainCheck = multiAgentStep(
      stateInRecovery,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 50,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1025,
        },
      },
      mockPack
    );
    // Rejection reason should not contain "blacklisted"
    expect(borrowAgainCheck.rejectionReason).not.toContain("blacklisted");

    // 3. Step ticks for gradual credit recovery (+5 per step up to 100)
    let scoreRating = stateInRecovery.creditRatings?.["player"] ?? 50;

    // Ticking 5 step ticks should recover score by +25 points
    let tickedRecoveryState = stateInRecovery;
    for (let step = 17; step <= 21; step++) {
      tickedRecoveryState.step = step;
      tickedRecoveryState = tickEconomy(tickedRecoveryState, mockPack);
    }

    expect(tickedRecoveryState.creditRatings?.["player"]).toBe(scoreRating + 25);

    // Tick further to reach 100 (cap)
    for (let step = 23; step <= 30; step++) {
      tickedRecoveryState.step = step;
      tickedRecoveryState = tickEconomy(tickedRecoveryState, mockPack);
    }
    expect(tickedRecoveryState.creditRatings?.["player"]).toBe(100);
    // Deactivates after reaching target rating score
    expect(tickedRecoveryState.creditRecoveries?.["player"]?.active).toBe(false);
  });

  it("should merge loanRefinancingVotes and creditRecoveries in Gossip mesh", () => {
    let nodeA = createInitialState({ seed: 12345, start: "clearing" });
    nodeA.loanRefinancingVotes = {
      blood_fangs: {
        player: {
          alice: {
            newDueStep: 30,
            newInterestRate: 2,
            timestamp: 1050,
          },
        },
      },
    };
    nodeA.creditRecoveries = {
      player: {
        agentId: "player",
        startStep: 10,
        lastRecoveryStep: 15,
        targetScore: 100,
        active: true,
        timestamp: 1050,
      },
    };

    let nodeB = createInitialState({ seed: 12345, start: "clearing" });
    nodeB.loanRefinancingVotes = {
      blood_fangs: {
        player: {
          alice: {
            newDueStep: 20,
            newInterestRate: 5,
            timestamp: 1020, // older vote
          },
        },
      },
    };
    nodeB.creditRecoveries = {
      player: {
        agentId: "player",
        startStep: 10,
        lastRecoveryStep: 12,
        targetScore: 100,
        active: true,
        timestamp: 1020, // older recovery
      },
    };

    const merged = mergeMonotonicStateFields(nodeB, nodeA);
    expect(merged.loanRefinancingVotes?.["blood_fangs"]?.["player"]?.["alice"]?.timestamp).toBe(1050);
    expect(merged.loanRefinancingVotes?.["blood_fangs"]?.["player"]?.["alice"]?.newDueStep).toBe(30);
    expect(merged.creditRecoveries?.["player"]?.timestamp).toBe(1050);
    expect(merged.creditRecoveries?.["player"]?.lastRecoveryStep).toBe(15);
  });

  it("should propose debt settlements, achieve consensus majority, automatically deduct gold and release collateral, and clear default alerts", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 300, gold_alice: 100 },
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
        interestRate: 10,
      },
    };

    state.safehouses = {
      clearing: {
        id: "sh1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };

    // 1. Establish a loan of 100 gold
    const borrowRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 100,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(borrowRes.ok).toBe(true);
    let stateWithLoan = borrowRes.state;

    // Set player's rating and create default alert to simulate distressed defaulted borrower
    if (!stateWithLoan.creditRatings) stateWithLoan.creditRatings = {};
    stateWithLoan.creditRatings["player"] = 40;

    stateWithLoan.defaultAlerts = {
      player_blood_fangs: {
        agentId: "player",
        syndicateId: "blood_fangs",
        defaultStep: 10,
        timestamp: 1000,
      },
    };

    // Verify collateral is locked
    expect(isCollateralLocked(stateWithLoan, "safehouse", "clearing")).toBe(true);

    // 2. Propose debt settlements
    // Player proposes settling for 50 gold (not majority yet, just 1 vote)
    const vote1 = multiAgentStep(
      stateWithLoan,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEBT_SETTLEMENT",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          settlementAmount: 50,
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(vote1.ok).toBe(true);

    // Collateral is still locked, loan still active, default alert still present
    expect(vote1.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeDefined();
    expect(isCollateralLocked(vote1.state, "safehouse", "clearing")).toBe(true);
    expect(vote1.state.defaultAlerts?.["player_blood_fangs"]).toBeDefined();

    // Alice also votes for 50 gold settlement (constitutes majority: 2 out of 3 members)
    const vote2 = multiAgentStep(
      vote1.state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_DEBT_SETTLEMENT",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          settlementAmount: 50,
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(vote2.ok).toBe(true);

    const finalState = vote2.state;
    // Loan should be fully settled, deleted, gold deducted, and collateral unlocked/released!
    expect(finalState.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeUndefined();
    expect(isCollateralLocked(finalState, "safehouse", "clearing")).toBe(false);

    // Gold deducted from player: started with 300, borrowed 100 -> 400. Settle for 50 -> 350.
    expect(finalState.vars["gold"]).toBe(350);

    // Default alert cleared!
    expect(finalState.defaultAlerts?.["player_blood_fangs"]).toBeUndefined();

    // Credit rating recovered by +15: 40 + 15 = 55.
    expect(finalState.creditRatings?.["player"]).toBe(55);
  });

  it("should merge debtSettlementVotes in Gossip mesh", () => {
    let nodeA = createInitialState({ seed: 12345, start: "clearing" });
    nodeA.debtSettlementVotes = {
      blood_fangs: {
        player: {
          alice: {
            settlementAmount: 50,
            timestamp: 1050,
          },
        },
      },
    };

    let nodeB = createInitialState({ seed: 12345, start: "clearing" });
    nodeB.debtSettlementVotes = {
      blood_fangs: {
        player: {
          alice: {
            settlementAmount: 100,
            timestamp: 1020, // older vote
          },
        },
      },
    };

    const merged = mergeMonotonicStateFields(nodeB, nodeA);
    expect(merged.debtSettlementVotes?.["blood_fangs"]?.["player"]?.["alice"]?.timestamp).toBe(1050);
    expect(merged.debtSettlementVotes?.["blood_fangs"]?.["player"]?.["alice"]?.settlementAmount).toBe(50);
  });
});

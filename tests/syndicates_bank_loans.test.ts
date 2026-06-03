import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateLoanLimit, isCollateralLocked, cloneStateWithoutHistory, reconcileIndividualLoanCollateralSwaps } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Bank Loans, Collateral-Gated Borrowing, & Enforcer Debt-Recovery Ticks (AF-87)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_loans_test_pack",
      title: "Syndicate Loans Test Pack",
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

  it("should calculate correct borrowing limits and check collateral locking", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60, // 60 dominance
      },
    };

    state.npcRep = {
      player: 120, // 120 standing/reputation
    };

    // Create safehouse in clearing
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

    // Safehouse collateral value: (level * 200) + (storageUpgradeLevel * 100) = (2 * 200) + (1 * 100) = 500 gold.
    // scale: (dominance / 50) * (standing / 100) = (60 / 50) * (120 / 100) = 1.2 * 1.2 = 1.44.
    // limit: floor(500 * 1.44) = 720 gold.
    const limit = getSyndicateLoanLimit(state, "blood_fangs", "player", "safehouse", "clearing");
    expect(limit).toBe(720);

    // Collateral is initially unlocked
    expect(isCollateralLocked(state, "safehouse", "clearing")).toBe(false);
  });

  it("should borrow gold using safehouse collateral and enforce limits / double borrowing blocks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
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

    // Collateral value: 200 gold. Limit: 200 gold.
    // 1. Try to borrow 300 (exceeds limit 200)
    const failRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 300,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("exceeds the collateral loan limit");

    // 2. Borrow 150 successfully
    const successRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 150,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(successRes.ok).toBe(true);
    expect(successRes.state.vars["gold"]).toBe(650); // 500 + 150
    expect(isCollateralLocked(successRes.state, "safehouse", "clearing")).toBe(true);

    const activeLoan = successRes.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"];
    expect(activeLoan).toBeDefined();
    expect(activeLoan?.amount).toBe(150);
    expect(activeLoan?.collateralId).toBe("clearing");

    // 3. Try to borrow again while loan is active (violating active loan block)
    const doubleBorrowRes = multiAgentStep(
      successRes.state,
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

    expect(doubleBorrowRes.ok).toBe(false);
    expect(doubleBorrowRes.rejectionReason).toContain("already has an active loan");
  });

  it("should borrow gold using outpost collateral and handle payback transitions", () => {
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
        interestRate: 6,
      },
    };

    state.turfGuardOutposts = {
      clearing: {
        roomId: "clearing",
        syndicateId: "blood_fangs",
        securityLevel: 2,
        timestamp: 1000,
        turrets: {},
      },
    };

    // Outpost collateral value: 2 * 150 = 300 gold.
    // 1. Borrow 200 gold
    const borrowRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 200,
          collateralType: "outpost",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(borrowRes.ok).toBe(true);
    expect(borrowRes.state.vars["gold"]).toBe(300); // 100 + 200
    expect(isCollateralLocked(borrowRes.state, "outpost", "clearing")).toBe(true);

    // 2. Ticking loan to accrue interest (e.g. 6% of 200 = 12 gold per step/tick)
    let stateAfterTick = tickEconomy(borrowRes.state, mockPack);
    let loan = stateAfterTick.syndicateBanks?.["blood_fangs"]?.loans?.["player"];
    expect(loan?.interestAccrued).toBe(12);

    // 3. Partially pay back the loan (pay 50 gold)
    // Gold goes from 300 to 250.
    // Due was 200 principal + 12 interest = 212 gold.
    // Paying 50 gold reduces interest first (12 -> 0), remaining 38 gold reduces principal (200 -> 162).
    const paybackRes1 = multiAgentStep(
      stateAfterTick,
      {
        agentId: "player",
        action: {
          type: "PAYBACK_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 50,
          timestamp: 1010,
        },
      },
      mockPack
    );

    expect(paybackRes1.ok).toBe(true);
    expect(paybackRes1.state.vars["gold"]).toBe(250);
    
    let updatedLoan = paybackRes1.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"];
    expect(updatedLoan?.interestAccrued).toBe(0);
    expect(updatedLoan?.amount).toBe(162);

    // 4. Fully pay back the remaining loan (pay 162 gold)
    const paybackRes2 = multiAgentStep(
      paybackRes1.state,
      {
        agentId: "player",
        action: {
          type: "PAYBACK_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 162,
          timestamp: 1015,
        },
      },
      mockPack
    );

    expect(paybackRes2.ok).toBe(true);
    expect(paybackRes2.state.vars["gold"]).toBe(88); // 250 - 162 = 88
    expect(paybackRes2.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeUndefined();
    expect(isCollateralLocked(paybackRes2.state, "outpost", "clearing")).toBe(false);
  });

  it("should trigger auto-enforcer collections & collateral liquidation on default inside economy ticks", () => {
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

    // Borrow 100 gold. player gold becomes 200.
    // Loan will be due at state.step + 15 = 0 + 15 = step 15.
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
    let currState = borrowRes.state;

    // Tick the economy from step 1 to 16 to accrue interest and trigger default recovery
    for (let i = 1; i <= 16; i++) {
      currState.step = i;
      currState = tickEconomy(currState, mockPack);
    }

    // After step 16 tick, the loan should have defaulted, enforcers swept player's gold, and liquidated the safehouse collateral.
    expect(currState.vars["gold"]).toBe(0); // Gold swept/seized!
    expect(currState.safehouses?.["clearing"]).toBeUndefined(); // Liquidated!
    expect(currState.enforcementHeat?.["clearing"]?.heat).toBe(15); // Heat increased by 15!
    expect(currState.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeUndefined(); // Resolved/removed!
  });

  it("should support manual LIQUIDATE_COLLATERAL on defaulted loans", () => {
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
        interestRate: 5,
      },
    };

    state.turfGuardOutposts = {
      clearing: {
        roomId: "clearing",
        syndicateId: "blood_fangs",
        securityLevel: 1,
        timestamp: 1000,
        turrets: {},
      },
    };

    state.enforcementHeat = {
      clearing: { roomId: "clearing", heat: 5, timestamp: 1000 },
    };

    // Borrow 100 gold. player gold becomes 200. Due at step 15.
    const borrowRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 100,
          collateralType: "outpost",
          collateralId: "clearing",
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(borrowRes.ok).toBe(true);
    let currState = borrowRes.state;

    // Try manual liquidation early (should fail)
    const earlyLiq = multiAgentStep(
      currState,
      {
        agentId: "player",
        action: {
          type: "LIQUIDATE_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(earlyLiq.ok).toBe(false);
    expect(earlyLiq.rejectionReason).toContain("is not in default");

    // Fast-forward step to 20 (defaulted)
    currState.step = 20;

    const manualLiq = multiAgentStep(
      currState,
      {
        agentId: "player",
        action: {
          type: "LIQUIDATE_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          timestamp: 1015,
        },
      },
      mockPack
    );

    expect(manualLiq.ok).toBe(true);
    expect(manualLiq.state.vars["gold"]).toBe(100); // 200 total - 100 seized = 100 remaining
    expect(manualLiq.state.turfGuardOutposts?.["clearing"]).toBeUndefined(); // Outpost liquidated
    expect(manualLiq.state.enforcementHeat?.["clearing"]?.heat).toBe(18); // Heat 5 decayed to 3, then +15 = 18
    expect(manualLiq.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"]).toBeUndefined(); // Loan removed
  });

  it("should purchase deposit insurance and reduce sweep loss rates under failed money laundering audits (AF-88)", () => {
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
        balances: {
          player: 200,
          alice: 200,
        },
        timestamp: 1000,
      },
    };

    // 1. Purchase deposit insurance for player (Alice is uninsured)
    const insRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PURCHASE_DEPOSIT_INSURANCE",
          syndicateId: "blood_fangs",
          premiumPaid: 50,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(insRes.ok).toBe(true);
    expect(insRes.state.vars["gold"]).toBe(450); // 500 - 50 premium
    expect(insRes.state.depositInsurance?.["player"]?.["blood_fangs"]?.active).toBe(true);
    expect(insRes.state.depositInsurance?.["player"]?.["blood_fangs"]?.premiumPaid).toBe(50);
    expect(insRes.state.depositInsurance?.["alice"]?.["blood_fangs"]).toBeUndefined();

    // 2. Setup front business in clearing and force a failed money laundering audit
    let testState = insRes.state;
    testState.frontBusinesses = {
      fb1: {
        id: "fb1",
        merchantId: "merchant_timmy",
        roomId: "clearing",
        syndicateId: "blood_fangs",
        level: 1,
        dirtyGold: 100,
        cleanGold: 200,
        launderingCapacity: 300,
        launderingRate: 50,
        timestamp: 1010,
        activeAudit: true, // Force active audit to trigger failed audit
      },
    };

    testState.enforcementHeat = {
      clearing: { roomId: "clearing", heat: 40, timestamp: 1010 },
    };

    testState.step = 5;

    // Run tickEconomy: failed money laundering audit triggers
    // Player has insurance (5% loss), Alice does not (25% loss)
    const tickedState = tickEconomy(testState, mockPack);

    const playerBal = tickedState.syndicateBanks?.["blood_fangs"]?.balances?.["player"];
    const aliceBal = tickedState.syndicateBanks?.["blood_fangs"]?.balances?.["alice"];

    // Player lost 5% of 200 = 10 gold => 190 remaining
    expect(playerBal).toBe(190);
    // Alice lost 25% of 200 = 50 gold => 150 remaining
    expect(aliceBal).toBe(150);
  });

  it("should scale borrowing capacities by player credit rating score and track score adjustments (AF-88)", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
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

    // Base collateral value: 200 gold. Scale scale: 1.0. Base limit: 200 gold.
    // 1. Borrowing with high credit rating score (150 score => 1.5x capacity => 300 limit)
    state.creditRatings = { player: 150 };
    const limitHigh = getSyndicateLoanLimit(state, "blood_fangs", "player", "safehouse", "clearing");
    expect(limitHigh).toBe(300);

    // 2. Borrowing with low credit rating score (50 score => 0.5x capacity => 100 limit)
    state.creditRatings = { player: 50 };
    const limitLow = getSyndicateLoanLimit(state, "blood_fangs", "player", "safehouse", "clearing");
    expect(limitLow).toBe(100);

    // 3. Track score adjustments (+5 on partial payback, +15 on full payback)
    // First reset credit rating to default (100) and borrow 100 gold
    state.creditRatings = { player: 100 };
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

    // Partial payback: pay 40 gold. Rating should increase by +5 (100 -> 105)
    const partialRes = multiAgentStep(
      borrowRes.state,
      {
        agentId: "player",
        action: {
          type: "PAYBACK_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 40,
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(partialRes.ok).toBe(true);
    expect(partialRes.state.creditRatings?.["player"]).toBe(105);

    // Full payback: pay remaining 60 gold. Rating should increase by +15 (105 -> 120)
    const fullRes = multiAgentStep(
      partialRes.state,
      {
        agentId: "player",
        action: {
          type: "PAYBACK_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 60,
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(fullRes.ok).toBe(true);
    expect(fullRes.state.creditRatings?.["player"]).toBe(120);

    // 4. Default drops credit rating by 50 points (capped at 0)
    // Setup a loan and force a default
    const borrow2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 100,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1020,
        },
      },
      mockPack
    );
    expect(borrow2.ok).toBe(true);

    let defaultState = borrow2.state;
    defaultState.creditRatings = { player: 40 }; // set to 40 so it drops below 0
    // Trigger default periodically (step > loan.dueStep)
    for (let i = 1; i <= 16; i++) {
      defaultState.step = i;
      defaultState = tickEconomy(defaultState, mockPack);
    }
    // Loan defaulted, score drops by 50 capped at 0
    expect(defaultState.creditRatings?.["player"]).toBe(0);
  });

  it("should broadcast mesh-wide default alerts to blacklist defaulted agents from borrowing, and merge defaultAlerts in Gossip mesh (AF-88)", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
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

    // 1. Borrow gold
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

    // 2. Liquidate loan (manually) to trigger a default alert
    let liqState = borrowRes.state;
    liqState.step = 20; // past dueStep 15

    const liqRes = multiAgentStep(
      liqState,
      {
        agentId: "player",
        action: {
          type: "LIQUIDATE_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          timestamp: 1010,
        },
      },
      mockPack
    );

    expect(liqRes.ok).toBe(true);
    // Alert should be recorded in defaultAlerts
    const alert = liqRes.state.defaultAlerts?.["player_blood_fangs"];
    expect(alert).toBeDefined();
    expect(alert?.agentId).toBe("player");
    expect(alert?.syndicateId).toBe("blood_fangs");

    // 3. Try borrowing again - should be blacklisted!
    const failBorrow = multiAgentStep(
      liqRes.state,
      {
        agentId: "player",
        action: {
          type: "BORROW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          amount: 50,
          collateralType: "safehouse",
          collateralId: "clearing",
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(failBorrow.ok).toBe(false);
    expect(failBorrow.rejectionReason).toContain("is blacklisted due to a mesh-wide debt default alert");

    // 4. Test Gossip convergence: merge defaultAlerts using LWW
    let nodeA = createInitialState({ seed: 12345, start: "clearing" });
    nodeA.defaultAlerts = {
      player_blood_fangs: {
        agentId: "player",
        syndicateId: "blood_fangs",
        defaultStep: 15,
        timestamp: 1050,
      },
    };

    let nodeB = createInitialState({ seed: 12345, start: "clearing" });
    nodeB.defaultAlerts = {
      player_blood_fangs: {
        agentId: "player",
        syndicateId: "blood_fangs",
        defaultStep: 15,
        timestamp: 1020, // older alert
      },
    };

    // Merging A and B should keep B's alert overwritten by A's alert (timestamp 1050 > 1020)
    const merged = mergeMonotonicStateFields(nodeB, nodeA);
    expect(merged.defaultAlerts?.["player_blood_fangs"]?.timestamp).toBe(1050);
  });

  it("should handle SWAP_INDIVIDUAL_COLLATERAL voting, consensus, limits, and Gossip mesh convergence (AF-94)", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice", "bob"], // 3 members -> bank majority threshold = 3 / 2 = 1.5 -> requires 2 votes
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
        loans: {
          player: {
            agentId: "player",
            amount: 150,
            collateralType: "safehouse",
            collateralId: "clearing",
            interestAccrued: 0,
            borrowStep: 10,
            dueStep: 50,
            timestamp: 1000,
          },
        },
      },
    };

    // player's safehouses
    state.safehouses = {
      clearing: {
        id: "clearing",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 1, // value: 200
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
      hideout: {
        id: "hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "blood_fangs",
        level: 2, // value: 400
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
    };

    state.npcRep = {
      player: 100,
    };

    // 1. Try to swap collateral with hideout, but voter is not a member of the syndicate bank
    const failNonMember = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "SWAP_INDIVIDUAL_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "hideout",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(failNonMember.ok).toBe(false);
    expect(failNonMember.rejectionReason).toContain("is not a member of syndicate");

    // 2. Try to swap, but removeCollateral does not match loan's collateral
    const failWrongRemove = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "SWAP_INDIVIDUAL_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          removeCollateralType: "safehouse",
          removeCollateralId: "wrong_id",
          addCollateralType: "safehouse",
          addCollateralId: "hideout",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(failWrongRemove.ok).toBe(false);
    expect(failWrongRemove.rejectionReason).toContain("does not match the active loan collateral");

    // 3. First vote cast by player
    const vote1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "SWAP_INDIVIDUAL_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "hideout",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(vote1.ok).toBe(true);
    // Loan collateral shouldn't be swapped yet because we only have 1 out of 3 votes (requires 2 for majority)
    expect(vote1.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"]?.collateralId).toBe("clearing");
    expect(vote1.state.individualLoanCollateralSwapVotes?.["blood_fangs"]?.["player"]?.["player"]).toBeDefined();

    // 4. Second vote cast by alice (achieving majority consensus)
    const vote2 = multiAgentStep(
      vote1.state,
      {
        agentId: "alice",
        action: {
          type: "SWAP_INDIVIDUAL_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "hideout",
          timestamp: 1006,
        },
      },
      mockPack
    );
    expect(vote2.ok).toBe(true);
    // Loan collateral MUST now be swapped to hideout!
    expect(vote2.state.syndicateBanks?.["blood_fangs"]?.loans?.["player"]?.collateralId).toBe("hideout");
    // Votes should be cleared
    expect(vote2.state.individualLoanCollateralSwapVotes?.["blood_fangs"]?.["player"]?.["player"]).toBeUndefined();
    expect(vote2.state.journal).toContain("[Syndicate Bank] Individual loan collateral swap for agent player in syndicate blood_fangs bank approved! Swapped clearing (safehouse) with hideout (safehouse).");

    // 5. Test Gossip merge/convergence of the vote maps
    let nodeX = cloneStateWithoutHistory(vote1.state); // player voted
    let nodeY = cloneStateWithoutHistory(state);

    // alice votes on nodeY
    const voteY = multiAgentStep(
      nodeY,
      {
        agentId: "alice",
        action: {
          type: "SWAP_INDIVIDUAL_COLLATERAL",
          syndicateId: "blood_fangs",
          targetAgentId: "player",
          removeCollateralType: "safehouse",
          removeCollateralId: "clearing",
          addCollateralType: "safehouse",
          addCollateralId: "hideout",
          timestamp: 1006,
        },
      },
      mockPack
    );
    expect(voteY.ok).toBe(true);

    // Merge nodeX (player's vote) and voteY.state (alice's vote)
    const mergedState = mergeMonotonicStateFields(nodeX, voteY.state);
    // When merged, both votes are present, which triggers reconciliation and consensus!
    const reconciled = reconcileIndividualLoanCollateralSwaps(mergedState, mockPack);
    expect(reconciled.syndicateBanks?.["blood_fangs"]?.loans?.["player"]?.collateralId).toBe("hideout");
  });
});

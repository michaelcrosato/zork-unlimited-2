import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateLoanLimit, isCollateralLocked } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

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
});

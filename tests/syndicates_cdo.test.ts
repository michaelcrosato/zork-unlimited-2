import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Collateralized Debt Obligations (CDOs) & Secondary Liquidity Markets (AF-107)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cdo_test_pack",
      title: "CDO Test Pack",
      start_room: "market",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Underground Market",
        description: "The dark center of the syndicate's network.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should validate and execute PACKAGE_LOAN_CDO creating correct tranches", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
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
        warChest: 1000,
      },
    };

    // Setup an outstanding loan in the syndicate bank
    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {},
        timestamp: 1000,
        loans: {
          alice: {
            agentId: "alice",
            amount: 200,
            collateralType: "safehouse",
            collateralId: "market",
            interestAccrued: 10,
            borrowStep: 1,
            dueStep: 10,
            timestamp: 1000,
          },
        },
      },
    };

    // Setup a secondary reserve investment
    state.secondaryReserveInvestments = {
      blood_fangs: {
        high_yield: {
          syndicateId: "blood_fangs",
          vaultId: "high_yield",
          investedGold: 100,
          timestamp: 1000,
        },
      },
    };

    // Validations: Action fails for invalid creator syndicate ID
    const failAct1 = {
      type: "PACKAGE_LOAN_CDO",
      cdoId: "cdo_test",
      creatorSyndicateId: "wrong_synd",
      assets: [{ type: "loan", syndicateId: "wrong_synd", assetId: "alice" }],
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: failAct1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // Success packaging: loan (value = 210) + reserve investment (value = 100) = 310 total
    const validAct = {
      type: "PACKAGE_LOAN_CDO",
      cdoId: "cdo_test_1",
      creatorSyndicateId: "blood_fangs",
      assets: [
        { type: "loan", syndicateId: "blood_fangs", assetId: "alice" },
        { type: "investment", syndicateId: "blood_fangs", assetId: "high_yield" },
      ],
      timestamp: 1000,
    };

    let res2 = multiAgentStep(state, { agentId: "player", action: validAct as any }, mockPack);
    expect(res2.ok).toBe(true);

    const resultingState = res2.state;
    // Check that loan and reserve investment were removed from original state fields
    expect(resultingState.syndicateBanks?.blood_fangs?.loans?.alice).toBeUndefined();
    expect(resultingState.secondaryReserveInvestments?.blood_fangs?.high_yield).toBeUndefined();

    // Check CDO creation
    const cdo = resultingState.cdos?.cdo_test_1;
    expect(cdo).toBeDefined();
    expect(cdo?.totalValue).toBe(310);
    expect(cdo?.assets.length).toBe(2);

    // Tranches: Senior (50% = 155), Mezzanine (30% = 93), Equity (remainder = 62)
    const senior = cdo?.tranches.senior;
    const mezzanine = cdo?.tranches.mezzanine;
    const equity = cdo?.tranches.equity;

    expect(senior?.totalValue).toBe(155);
    expect(mezzanine?.totalValue).toBe(93);
    expect(equity?.totalValue).toBe(62);

    // Check tranche ownership
    expect(senior?.ownership.blood_fangs).toBe(155);
    expect(mezzanine?.ownership.blood_fangs).toBe(93);
    expect(equity?.ownership.blood_fangs).toBe(62);
  });

  it("should validate and execute TRADE_CDO_TRANCHE with correct warChest deductions and transfer", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      night_stalkers: {
        id: "night_stalkers",
        name: "Night Stalkers",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
      },
    };

    // Prepopulate a CDO
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "blood_fangs",
        totalValue: 300,
        timestamp: 1000,
        assets: [],
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 150,
            ownership: { blood_fangs: 150 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 90,
            ownership: { blood_fangs: 90 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 60,
            ownership: { blood_fangs: 60 },
            timestamp: 1000,
          },
        },
      },
    };

    // 1. Rejection: Insufficient owned tranche
    const failTrade1 = {
      type: "TRADE_CDO_TRANCHE",
      cdoId: "cdo_test_1",
      trancheId: "senior",
      sellerSyndicateId: "blood_fangs",
      buyerSyndicateId: "night_stalkers",
      amount: 200,
      goldPrice: 100,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: failTrade1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("insufficient owned stake");

    // 2. Rejection: Insufficient buyer warChest
    const failTrade2 = {
      type: "TRADE_CDO_TRANCHE",
      cdoId: "cdo_test_1",
      trancheId: "senior",
      sellerSyndicateId: "blood_fangs",
      buyerSyndicateId: "night_stalkers",
      amount: 50,
      goldPrice: 800, // exceeds night_stalkers' 500 gold warChest
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: failTrade2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("insufficient gold");

    // 3. Success Trade: Transfer 50 Senior stake for 200 gold
    const validTrade = {
      type: "TRADE_CDO_TRANCHE",
      cdoId: "cdo_test_1",
      trancheId: "senior",
      sellerSyndicateId: "blood_fangs",
      buyerSyndicateId: "night_stalkers",
      amount: 50,
      goldPrice: 200,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "player", action: validTrade as any }, mockPack);
    expect(res3.ok).toBe(true);

    const finalState = res3.state;
    // Check tranche stakes
    const seniorTranche = finalState.cdos?.cdo_test_1?.tranches.senior;
    expect(seniorTranche?.ownership.blood_fangs).toBe(100);
    expect(seniorTranche?.ownership.night_stalkers).toBe(50);

    // Check warChests
    expect(finalState.syndicates?.blood_fangs?.warChest).toBe(1200); // 1000 + 200
    expect(finalState.syndicates?.night_stalkers?.warChest).toBe(300); // 500 - 200
  });

  it("should process tranche interest yield sequentially and write off defaulted assets from the bottom up", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000, gold_alice: 100 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Prepopulate a CDO containing:
    // - Packaged loan (amount 200, interest rate refinancedInterestRate 10% = generates 20 gold/tick)
    // - Packaged investment (amount 100, high_yield interestRate 8% = generates 8 gold/tick)
    // Total value = 300
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "blood_fangs",
        totalValue: 300,
        timestamp: 1000,
        assets: [
          {
            type: "loan",
            syndicateId: "blood_fangs",
            assetId: "alice",
            value: 200,
            originalLoan: {
              agentId: "alice",
              amount: 200,
              collateralType: "safehouse",
              collateralId: "market",
              interestAccrued: 0,
              borrowStep: 1,
              dueStep: 10,
              timestamp: 1000,
              refinancedInterestRate: 10,
            },
          },
          {
            type: "investment",
            syndicateId: "blood_fangs",
            assetId: "high_yield",
            value: 100,
            originalInvestment: {
              syndicateId: "blood_fangs",
              vaultId: "high_yield",
              investedGold: 100,
              timestamp: 1000,
            },
          },
        ],
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 150,
            ownership: { blood_fangs: 150 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 90,
            ownership: { blood_fangs: 90 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 60,
            ownership: { blood_fangs: 60 },
            timestamp: 1000,
          },
        },
      },
    };

    // Set step to 5 (interest accumulates, no default yet)
    state.step = 5;
    let nextState = tickEconomy(state, mockPack);

    // Accumulated interest collected:
    // Loan interest: 200 * 10% = 20
    // Investment interest: 100 * 8% = 8
    // Total cashflow = 28 gold.
    // Target payouts:
    // Senior target: 150 * 5% = 7
    // Mezzanine target: 90 * 12% = 10
    // Equity target: 60 * 25% = 15
    // Waterfall Sequential distribution:
    // Senior receives: Math.min(28, 7) = 7
    // Remaining: 21
    // Mezzanine receives: Math.min(21, 10) = 10
    // Remaining: 11
    // Equity receives: 11
    // Total distributed: 7 + 10 + 11 = 28 gold.
    // Since blood_fangs owns 100% of all tranches, blood_fangs' warChest grows by 28 gold!
    expect(nextState.syndicates?.blood_fangs?.warChest).toBe(1028);

    // Now set step to 15 (packaged loan is due at step 10, so it defaults!)
    nextState.step = 15;

    // Setup safehouse collateral in state so we can verify liquidation
    nextState.safehouses = {
      market: {
        id: "market_safehouse",
        roomId: "market",
        syndicateId: "blood_fangs",
        ownerId: "alice",
        level: 1,
        stashCapacity: 100,
        stashItems: [],
        timestamp: 1000,
      },
    };

    let defaultedState = tickEconomy(nextState, mockPack);

    // Loan value at default time: 200 amount + 40 interest (2 ticks) = 240.
    // Alice's gold is swept: Alice has 100 gold.
    // Swept = 100 gold.
    // Remaining outstanding loss = 140 gold (Written off).
    // Collateral "safehouse" in "market" is liquidated/deleted.
    expect(defaultedState.safehouses?.market).toBeUndefined();

    // The loss of 140 gold must be absorbed bottom-up:
    // Equity (value = 60) absorbs 60. New Equity value = 0.
    // Remaining loss: 80.
    // Mezzanine (value = 90) absorbs 80. New Mezzanine value = 10.
    // Senior (value = 150) absorbs 0. New Senior value = 150.
    const finalCDO = defaultedState.cdos?.cdo_test_1;
    expect(finalCDO?.tranches.equity.totalValue).toBe(0);
    expect(finalCDO?.tranches.mezzanine.totalValue).toBe(10);
    expect(finalCDO?.tranches.senior.totalValue).toBe(150);

    // Check pro-rata ownership updates as well
    expect(finalCDO?.tranches.equity.ownership.blood_fangs).toBe(0);
    expect(finalCDO?.tranches.mezzanine.ownership.blood_fangs).toBe(10);
    expect(finalCDO?.tranches.senior.ownership.blood_fangs).toBe(150);
  });

  it("should synchronize CDO states across the P2P Gossip mesh under partitions", () => {
    let nodeA = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    nodeA.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Node A packages a CDO
    const packageAction = {
      type: "PACKAGE_LOAN_CDO",
      cdoId: "cdo_gossip",
      creatorSyndicateId: "blood_fangs",
      assets: [],
      timestamp: 2000,
    };
    nodeA.cdos = {
      cdo_gossip: {
        id: "cdo_gossip",
        creatorSyndicateId: "blood_fangs",
        totalValue: 100,
        timestamp: 2000,
        assets: [],
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 50,
            ownership: { blood_fangs: 50 },
            timestamp: 2000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 30,
            ownership: { blood_fangs: 30 },
            timestamp: 2000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 20,
            ownership: { blood_fangs: 20 },
            timestamp: 2000,
          },
        },
      },
    };

    let nodeB = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["alice"],
    });

    nodeB.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Node B performs a trade on a later step (timestamp 3000)
    nodeB.cdos = {
      cdo_gossip: {
        id: "cdo_gossip",
        creatorSyndicateId: "blood_fangs",
        totalValue: 100,
        timestamp: 3000,
        assets: [],
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 50,
            ownership: { blood_fangs: 30, night_stalkers: 20 },
            timestamp: 3000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 30,
            ownership: { blood_fangs: 30 },
            timestamp: 2000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 20,
            ownership: { blood_fangs: 20 },
            timestamp: 2000,
          },
        },
      },
    };

    // Merge Node A and Node B
    const merged = mergeMonotonicStateFields(nodeA, nodeB);

    // Verify CDO convergences using LWW (timestamp 3000 should win)
    const mergedCDO = merged.cdos?.cdo_gossip;
    expect(mergedCDO).toBeDefined();
    expect(mergedCDO?.timestamp).toBe(3000);
    expect(mergedCDO?.tranches.senior.ownership.night_stalkers).toBe(20);
    expect(mergedCDO?.tranches.senior.ownership.blood_fangs).toBe(30);
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Futures & Volatility-Hedged Premium Policy (AF-147)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_futures_pack",
      title: "Reinsurance Futures Test Pack",
      start_room: "market",
      vars_init: { gold: 10000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Grand Bazaar",
        description: "A buzzing marketplace.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support volatility-hedged premium policies, futures contract consensus, dynamic pricing, and auto-settlement", () => {
    // 1. Initial State
    let state = createInitialState({
      seed: 98765,
      start: "market",
      varsInit: { gold: 10000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      cartel: {
        id: "cartel",
        name: "Cartel Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "cartel",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Initialize dynamic risk ratings
    state.swfYieldCDOTrancheRiskRatings = {
      cdo_1_senior: {
        id: "cdo_1_senior",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        riskRating: "AAA",
        collateralizationRatio: 5.0,
        defaultCorrelation: 0.0,
        timestamp: 1000,
      },
    };

    // 2. Configure Volatility-Hedged Premium Policy via consensus
    const configureAction = {
      type: "CONFIGURE_VOLATILITY_HEDGED_PREMIUM_POLICY",
      syndicateId: "cartel",
      swfYieldCdoId: "cdo_1",
      basePremiumRate: 0.04,
      volatilityReserve: 500,
      volatilityHedgeMultiplier: 0.03,
      timestamp: 1001,
    };

    // Vote 1: player (1 out of 2 members, pending majority)
    let res = multiAgentStep(state, { agentId: "player", action: configureAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.volatilityHedgedPremiumPolicies?.["cdo_1"]).toBeUndefined();

    // Vote 2: alice (2 out of 2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: configureAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.volatilityHedgedPremiumPolicies?.["cdo_1"];
    expect(policy).toBeDefined();
    expect(policy?.basePremiumRate).toBe(0.04);
    expect(policy?.volatilityReserve).toBe(500);
    expect(policy?.volatilityHedgeMultiplier).toBe(0.03);

    // Cartel warChest should have deducted volatilityReserve of 500 (5000 - 500 = 4500)
    expect(state.syndicates?.["cartel"]?.warChest).toBe(4500);

    // 3. Dynamic Premium Rate Calculations
    // With 0 volatility index, spot rate should be calculated
    let spotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    // AAA risk rating multiplier is 0.5.
    // spotRate = basePremiumRate (0.04) * AAA ratingMult (0.5) * (1 + 15 * 0.03 / 5) = 0.02 * 1.09 = 0.0218
    expect(spotRate).toBeCloseTo(0.0218, 4);

    // Add active yield volatility index to simulate market volatility spike
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 50.0,
        timestamp: 1002,
      },
    };

    // spotRate with 50 volatility:
    // volMultiplier = 1 + (50 * 0.03) / 5 = 1 + 1.5/5 = 1.3
    // spotRate = 0.04 * 0.5 * 1.3 = 0.026
    spotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    expect(spotRate).toBeCloseTo(0.026, 4);

    // 4. Open Reinsurance Futures Contract via consensus
    const openFutAction = {
      type: "OPEN_REINSURANCE_FUTURES",
      id: "fut_1",
      syndicateId: "cartel",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      side: "long",
      lockPremiumRate: 0.022,
      size: 1000,
      marginCollateral: 200,
      timestamp: 1003,
    };

    // Vote 1: player (1 out of 2, pending)
    res = multiAgentStep(state, { agentId: "player", action: openFutAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceFuturesContracts?.["fut_1"]).toBeUndefined();

    // Vote 2: alice (2 out of 2, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: openFutAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const futContract = state.swfReinsuranceFuturesContracts?.["fut_1"];
    expect(futContract).toBeDefined();
    expect(futContract?.active).toBe(true);
    expect(futContract?.lockPremiumRate).toBe(0.022);
    expect(futContract?.marginCollateral).toBe(200);

    // Cartel warChest should deduct marginCollateral of 200 (4500 - 200 = 4300)
    expect(state.syndicates?.["cartel"]?.warChest).toBe(4300);

    // 5. Test Dynamic Premium Deduction inside economy tick
    state.swfYieldCDOTrancheReinsurancePolicies = {
      policy_1: {
        id: "policy_1",
        syndicateId: "cartel",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        coverageAmount: 10000,
        premiumRate: 0.026,
        timestamp: 1003,
        active: true,
      },
    };

    // Because cartel has active long futures position "fut_1", they lock in the premium rate at 0.022 instead of the dynamic spot rate of 0.026!
    // Premium paid should be: Math.floor(10000 * 0.022) = 220
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.syndicates?.["cartel"]?.warChest).toBe(4300 - 220); // 4080

    // 6. Test auto-settlement on epoch boundary (step becomes multiple of 5)
    // Currently, state.step is 1003. Let's force state.step to 1005 (epoch boundary multiple of 5)
    tickedState.step = 1005;

    // Spot rate at settlement is 0.026. Locked rate is 0.022.
    // Difference is 0.026 - 0.022 = 0.004.
    // Profit = Math.floor(0.004 * 1000 * 100) = 400 gold.
    // Returned net gold to cartel warChest = marginCollateral (200) + profit (400) = 600 gold.
    // WarChest before settlement: 4080
    // In step 1005, one more premium tick occurs (-220), then futures settle (+600).
    // Expected warChest after settlement: 4080 - 220 + 600 = 4460.
    const settledState = tickEconomy(tickedState, mockPack);

    const settledFut = settledState.swfReinsuranceFuturesContracts?.["fut_1"];
    expect(settledFut?.active).toBe(false);
    expect(settledState.syndicates?.["cartel"]?.warChest).toBe(4460);
    expect(settledState.journal?.some((log) => log.includes("[SWF Reinsurance Futures Settled]"))).toBe(true);
  });
});

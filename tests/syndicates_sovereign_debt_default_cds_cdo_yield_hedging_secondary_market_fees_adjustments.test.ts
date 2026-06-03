import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";

describe("Syndicate SWF Yield-Hedging Option Fee Adjustments & Volatility Thresholds (AF-244)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_fees_adjustments_test_pack",
      title: "Yield Hedging Fees Adjustments Test Pack",
      start_room: "vault",
      vars_init: { gold: 100000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "vault",
        name: "Security Vault",
        description: "A heavily guarded vault room.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  const setupState = () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: {
        gold: 1000,
        gold_alice: 1000,
      },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 20000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 20000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 5000,
        status: "active",
        cdoId: "cdo_pool_1",
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 5000,
        fractionalizedVault: {
          balance: 1000,
          timestamp: 1000,
        },
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 3000,
            marginCollateral: { alpha: 3000 },
            sharesOwned: { alpha: 3000 },
            autocallTriggerLevel: 200,
            autocallCoupon: 1000,
            autocallPaid: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 1500,
            marginCollateral: { alpha: 1500 },
            sharesOwned: { alpha: 1500 },
            autocallTriggerLevel: 100,
            autocallCoupon: 500,
            autocallPaid: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 500,
            marginCollateral: { alpha: 500 },
            sharesOwned: { alpha: 500 },
            autocallTriggerLevel: 50,
            autocallCoupon: 200,
            autocallPaid: {},
            timestamp: 1000,
          },
        },
        reserveFloor: 3000,
        timestamp: 1000,
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    return state;
  };

  it("should propose and authorize dynamic fee adjustment policy proposals", () => {
    let state = setupState();

    // 1. Propose fee adjustment policy
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_FEE_ADJUSTMENT_POLICY",
          proposalId: "fee_adjust_policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          baseFeePercent: 0.05,
          volatilityScale: 0.005,
          partitionScale: 0.2,
          volatilityThreshold: 10.0,
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionFeeAdjustmentPolicyProposals?.fee_adjust_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("proposed");
    expect(prop!.baseFeePercent).toBe(0.05);
    expect(prop!.volatilityScale).toBe(0.005);
    expect(prop!.partitionScale).toBe(0.2);
    expect(prop!.volatilityThreshold).toBe(10.0);

    // Alpha warChest has been charged proposal fee: base 200 * 0.5 (reserve and alliance scalars) = 100
    expect(state.syndicates?.alpha.warChest).toBe(19900);

    // 2. Alice votes YES to approve
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_FEE_ADJUSTMENT_POLICY",
          proposalId: "fee_adjust_policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionFeeAdjustmentPolicyProposals?.fee_adjust_policy_1.status).toBe("authorized");
    expect(state.cdsCdoYieldHedgingOptionFeeAdjustmentPolicyProposals?.fee_adjust_policy_1.resolved).toBe(true);

    // Alpha pool has updated dynamic fee adjustment properties
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionFeeBasePercent).toBe(0.05);
    expect(pool?.yieldHedgingOptionFeeVolatilityScale).toBe(0.005);
    expect(pool?.yieldHedgingOptionFeePartitionScale).toBe(0.2);
    expect(pool?.yieldHedgingOptionFeeVolatilityThreshold).toBe(10.0);
  });

  it("should calculate dynamically scaled secondary transaction fees based on partition and volatility", () => {
    let state = setupState();

    // Setup dynamic fee adjustment policy directly on the pool
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionFeeBasePercent = 0.05;
    pool.yieldHedgingOptionFeeVolatilityScale = 0.005;
    pool.yieldHedgingOptionFeePartitionScale = 0.2;
    pool.yieldHedgingOptionFeeVolatilityThreshold = 10.0;

    // Stakers setup
    state.vars.gold = 700;
    state.vars.gold_alice = 850;
    pool.yieldHedgingOptionStakingPool = 450;
    pool.yieldHedgingOptionStakingBalances = {
      player: 300,
      alice: 150,
    };

    // Setup option contract owned by Alpha
    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        premiumPaid: 200,
        coverageAmount: 2000,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    // -------------------------------------------------------------
    // Scenario A: Base Case (No partition, low volatility)
    // -------------------------------------------------------------
    // dropRate = 0
    // avgVolatility = 5.0 (<= threshold 10.0, so volDelta = 0)
    // Expected feePercent = 0.05 + 0 + 0 = 0.05 (5%)
    // Price = 1000 => fee = 50.
    // Seller Alpha receives 20000 + 1000 - 50 = 20950
    // Player share: 50 * (300/450) = 33.33 => 33
    // Alice share: 50 * (150/450) = 16.66 => 17
    // -------------------------------------------------------------
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1200,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1210,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1220,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(state.syndicates?.alpha.warChest).toBe(20950);
    expect(state.syndicates?.beta.warChest).toBe(19000);
    expect(state.vars.gold).toBe(734);
    expect(state.vars.gold_alice).toBe(866);

    // -------------------------------------------------------------
    // Scenario B: High Partition Stress Case (linkStateDropRate = 0.5)
    // -------------------------------------------------------------
    // Reset option back to Alpha, Reset war chests and gold
    // -------------------------------------------------------------
    state.cdsCdoYieldHedgingOptionContracts!.opt_1.syndicateId = "alpha";
    state.syndicates!.alpha.warChest = 20000;
    state.syndicates!.beta.warChest = 20000;
    state.vars.gold = 700;
    state.vars.gold_alice = 850;
    delete state.cdsCdoYieldHedgingOptionTransfers;

    // Inject partition rate via swfMultiFundReinsurancePools
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha"],
        capitalAllocated: {},
        volatilityHedgeRatio: 1.0,
        targetYieldRate: 0.05,
        historicalVolatility: 10.0,
        totalReserve: 1000,
        active: true,
        linkStateDropRate: 0.5,
        timestamp: 1000,
      },
    };

    // dropRate = 0.5
    // partitionScale = 0.2 => partitionPremium = 0.5 * 0.2 = 0.10
    // avgVolatility = 0 (<= 10.0) => volatilityPremium = 0
    // Expected feePercent = baseFee (0.05) + partitionPremium (0.10) = 0.15 (15%)
    // Price = 1000 => fee = 150.
    // Seller Alpha receives 20000 + 1000 - 150 = 20850
    // Player share: 150 * (300/450) = 100
    // Alice share: 150 * (150/450) = 50
    // -------------------------------------------------------------
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1300,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1310,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1320,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(state.syndicates?.alpha.warChest).toBe(20850);
    expect(state.syndicates?.beta.warChest).toBe(19000);
    expect(state.vars.gold).toBe(800);
    expect(state.vars.gold_alice).toBe(900);

    // -------------------------------------------------------------
    // Scenario C: High Volatility Shock Case (avgVolatility = 20.0, dropRate = 0.2)
    // -------------------------------------------------------------
    state.cdsCdoYieldHedgingOptionContracts!.opt_1.syndicateId = "alpha";
    state.syndicates!.alpha.warChest = 20000;
    state.syndicates!.beta.warChest = 20000;
    state.vars.gold = 700;
    state.vars.gold_alice = 850;
    delete state.cdsCdoYieldHedgingOptionTransfers;

    // Inject average volatility and drop rate
    state.yieldVolatilityIndexes = {
      index_1: {
        bondId: "index_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };
    state.swfMultiFundReinsurancePools!.pool_1.linkStateDropRate = 0.2;

    // dropRate = 0.2
    // avgVolatility = 20.0
    // volDelta = Math.max(0, 20.0 - 10.0) = 10.0
    // regionalStabilityIndex = Math.max(0, 1.0 - (20.0/100.0) - 0.2) = 0.6
    // partitionPremium = dropRate (0.2) * partitionScale (0.2) = 0.04
    // volatilityPremium = volDelta (10) * volScale (0.005) * (1.0 - stability (0.6)) = 10 * 0.005 * 0.4 = 0.02
    // Expected feePercent = baseFee (0.05) + partitionPremium (0.04) + volatilityPremium (0.02) = 0.11 (11%)
    // Price = 1000 => fee = 110.
    // Seller Alpha receives 20000 + 1000 - 110 = 20890
    // Player share: 110 * (300/450) = 73.33 => 73
    // Alice share: 110 * (150/450) = 36.66 => 37
    // -------------------------------------------------------------
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1400,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1410,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 1000,
          timestamp: 1420,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(state.syndicates?.alpha.warChest).toBe(20890);
    expect(state.syndicates?.beta.warChest).toBe(19000);
    expect(state.vars.gold).toBe(774);
    expect(state.vars.gold_alice).toBe(886);
  });
});

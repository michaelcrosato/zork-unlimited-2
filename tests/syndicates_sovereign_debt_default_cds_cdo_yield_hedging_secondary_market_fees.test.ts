import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Co-Investment Yield-Hedging Option Secondary Market Fees and Staking (AF-243)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_secondary_fees_test_pack",
      title: "Yield Hedging Secondary Fees Test Pack",
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
        gold: 1000, // Player's gold (agentId = "player")
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

  it("should propose and authorize yield-hedging option fee policy proposals", () => {
    let state = setupState();

    // 1. Propose fee policy of 10% (0.1) for CDO cdo_pool_1
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_FEE_POLICY",
          proposalId: "fee_policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          secondaryFeePercent: 0.1,
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionFeePolicyProposals?.fee_policy_1).toBeDefined();
    expect(state.cdsCdoYieldHedgingOptionFeePolicyProposals?.fee_policy_1.status).toBe("proposed");
    expect(state.cdsCdoYieldHedgingOptionFeePolicyProposals?.fee_policy_1.secondaryFeePercent).toBe(0.1);

    // Alpha warChest has been charged proposal fee: base 200 * 0.5 (reserve and alliance scalars) = 100
    expect(state.syndicates?.alpha.warChest).toBe(19900);

    // 2. Alice votes YES to approve
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_FEE_POLICY",
          proposalId: "fee_policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionFeePolicyProposals?.fee_policy_1.status).toBe("authorized");
    expect(state.cdsCdoYieldHedgingOptionFeePolicyProposals?.fee_policy_1.resolved).toBe(true);

    // Alpha pool has updated fee percent
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionSecondaryFeePercent).toBe(0.1);
  });

  it("should support staking and unstaking in the yield-hedging option staking pool", () => {
    let state = setupState();

    // 1. Player stakes 400 gold
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "STAKE_CDO_YIELD_HEDGING_OPTION",
          cdoId: "cdo_pool_1",
          amount: 400,
          timestamp: 1200,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Check player gold deducted (1000 - 400 = 600)
    expect(state.vars.gold).toBe(600);

    // Check pool staking
    let pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionStakingPool).toBe(400);
    expect(pool?.yieldHedgingOptionStakingBalances?.player).toBe(400);

    // 2. Alice stakes 200 gold
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "STAKE_CDO_YIELD_HEDGING_OPTION",
          cdoId: "cdo_pool_1",
          amount: 200,
          timestamp: 1210,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.vars.gold_alice).toBe(800);
    pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionStakingPool).toBe(600);
    expect(pool?.yieldHedgingOptionStakingBalances?.alice).toBe(200);

    // 3. Player unstakes 100 gold
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "UNSTAKE_CDO_YIELD_HEDGING_OPTION",
          cdoId: "cdo_pool_1",
          amount: 100,
          timestamp: 1220,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.vars.gold).toBe(700);
    pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionStakingPool).toBe(500);
    expect(pool?.yieldHedgingOptionStakingBalances?.player).toBe(300);
  });

  it("should levy secondary trade fee and distribute dividends to stakers proportionally", () => {
    let state = setupState();

    // 1. Authorize fee policy (10% fee)
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionSecondaryFeePercent = 0.1;

    // 2. Stakers: player stakes 300, alice stakes 150 (total = 450)
    state.vars.gold = 700;
    state.vars.gold_alice = 850;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionStakingPool = 450;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionStakingBalances = {
      player: 300,
      alice: 150,
    };

    // 3. Setup option contract owned by Alpha
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

    // 4. Perform a manual transfer from Alpha to Beta for 900 gold
    // Expect fee = 900 * 0.1 = 90 gold.
    // Seller Alpha receives: 20000 (starting) + 900 (price) - 90 (fee) = 20810 warChest gold.
    // Buyer Beta pays: 20000 - 900 = 19100.
    // Fee of 90 gold is split:
    //   player share: 90 * (300/450) = 60 gold.
    //   alice share: 90 * (150/450) = 30 gold.
    // New player gold: 700 + 60 = 760 gold.
    // New alice gold: 850 + 30 = 880 gold.

    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "beta",
          price: 900,
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
          price: 900,
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
          price: 900,
          timestamp: 1320,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify ownership is Beta
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");

    // Verify war chests
    expect(state.syndicates?.alpha.warChest).toBe(20810);
    expect(state.syndicates?.beta.warChest).toBe(19100);

    // Verify dividend payouts
    expect(state.vars.gold).toBe(760);
    expect(state.vars.gold_alice).toBe(880);

    // Verify journals
    const dividendJournals = state.journal?.filter((j) => j.includes("Yield-Hedging Option Fee Dividend Paid")) ?? [];
    expect(dividendJournals.length).toBe(2);
    expect(dividendJournals[0]).toContain("Staker player received a dividend of 60 gold");
    expect(dividendJournals[1]).toContain("Staker alice received a dividend of 30 gold");
  });
});

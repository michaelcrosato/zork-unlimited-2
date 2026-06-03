import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, getCDSCDOYieldHedgingPremium } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDO Tranche Yield-Hedging Option Pools (AF-241)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_test_pack",
      title: "Yield Hedging Test Pack",
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
      varsInit: { gold: 100000 },
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
        members: ["bob", "charlie"],
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

  it("should propose and authorize a yield-hedging option policy", () => {
    let state = setupState();

    // 1. Propose yield-hedging policy
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_POLICY",
          proposalId: "policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          premiumPricingSpread: 0.1,
          automatedHedgeEnabled: true,
          timestamp: 1100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionPolicyProposals?.policy_1).toBeDefined();
    expect(state.cdsCdoYieldHedgingOptionPolicyProposals?.policy_1.status).toBe("proposed");

    // Proposer war chest should decrease by proposal fee (base 200, dynamic multiplier 0.5 = 100)
    expect(state.syndicates?.alpha.warChest).toBe(19900);

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_POLICY",
          proposalId: "policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionPolicyProposals?.policy_1.status).toBe("authorized");

    // Pool policy settings should be updated
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.premiumPricingSpread).toBe(0.1);
    expect(pool?.automatedHedgeEnabled).toBe(true);
  });

  it("should purchase yield-hedging option with dynamic premium pricing", () => {
    let state = setupState();

    // Set pool policy values directly
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.premiumPricingSpread = 0.1;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.automatedHedgeEnabled = true;

    // Check dynamic premium baseline
    const premium = getCDSCDOYieldHedgingPremium(state, "cdo_pool_1", 2000);
    // coverageAmount (2000) * spread (0.1) = 200 gold premium
    expect(premium).toBe(200);

    // Purchase option contract
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PURCHASE_CDO_YIELD_HEDGING_OPTION",
          optionId: "opt_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          coverageAmount: 2000,
          timestamp: 1200,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1).toBeDefined();
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.premiumPaid).toBe(200);
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.coverageAmount).toBe(2000);
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.status).toBe("active");

    // Syndicate war chest paid the premium (20000 - 200)
    expect(state.syndicates?.alpha.warChest).toBe(19800);
  });

  it("should settle option and pay to war chest when default alert is broadcast (automatedHedgeEnabled = false)", () => {
    let state = setupState();

    state.sovereignDebtCDSCDOPools!.cdo_pool_1.premiumPricingSpread = 0.1;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.automatedHedgeEnabled = false;

    // Add active option contract
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

    // Add active default alert
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "authorized",
        resolved: false,
        proposerId: "bob",
        timestamp: 1100,
      },
    };

    // Tick economy to process option settlement
    const finalState = tickEconomy(state, mockPack);

    // Option should be settled
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.status).toBe("settled");
    // Payout should go to war chest (20000 + 2000 option payout + 5000 CDS payout = 27000)
    expect(finalState.syndicates?.alpha.warChest).toBe(27000);
  });

  it("should deflect margin liquidation by auto-hedging payout to tranche margin collateral (automatedHedgeEnabled = true)", () => {
    let state = setupState();

    state.sovereignDebtCDSCDOPools!.cdo_pool_1.premiumPricingSpread = 0.1;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.automatedHedgeEnabled = true;

    // Add active option contract
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

    // Initialize margin collateral for senior tranche
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.tranches.senior.marginCollateral = {
      alpha: 100, // Very low collateral
    };

    // Setup active default alert to trigger both option settlement and margin requirement stress
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "authorized",
        resolved: false,
        proposerId: "bob",
        timestamp: 1100,
      },
    };

    // Settle a CDS contract so defaults = 5000 to maximize margin requirements
    state.sovereignDebtCDSContracts!.cds_1.status = "settled";

    // Tick economy
    const finalState = tickEconomy(state, mockPack);

    // Option settled
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.status).toBe("settled");

    // Coverage deposited directly into senior tranche margin collateral (100 + 2000 = 2100).
    // The margin requirement is 3000. Since 2100 is below 3000,
    // the automated margin drawdown triggers and pulls the remaining 900 from warChest,
    // bringing final margin collateral to exactly 3000.
    const trancheMC = finalState.sovereignDebtCDSCDOPools?.cdo_pool_1.tranches.senior.marginCollateral?.alpha;
    expect(trancheMC).toBe(3000);

    // Reputation did not get penalised / margin Call did not lead to liquidation because collateral was high enough!
    expect(
      finalState.journal?.some(
        (j) => j.includes("[CDO Yield-Hedging Option Settled]") && j.includes("Auto-hedge deposited")
      )
    ).toBe(true);
  });
});

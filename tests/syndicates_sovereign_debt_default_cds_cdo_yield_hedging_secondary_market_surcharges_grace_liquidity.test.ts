import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("CDO Surcharge Grace Period Minimum Liquidity Threshold Enforcement (AF-259)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_surcharges_grace_liquidity_test_pack",
      title: "Yield Hedging Surcharges Grace Liquidity Test Pack",
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
      agentsInit: ["player", "alice", "bob"],
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
        timestamp: 1000,
      },
    };

    return state;
  };

  it("should validate and reconcile proposing and voting on a surcharge grace period minimum liquidity threshold", () => {
    let state = setupState();

    // 1. Propose and authorize a surcharge panic override proposal
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
        proposalId: "surcharge_panic_override_test",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        panicOverrideActive: true,
        cooldownDuration: 10,
        timestamp: 1200,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
        proposalId: "surcharge_panic_override_test",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1250,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Propose a cancellation proposal
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
        proposalId: "cancel_prop_1",
        targetProposalId: "surcharge_panic_override_test",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        timestamp: 1270,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Propose a grace period proposal targeting the cancellation proposal with graceDuration = 5 steps
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
        proposalId: "grace_prop_1",
        targetProposalId: "cancel_prop_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        graceDuration: 5,
        timestamp: 1280,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize the grace proposal
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
        proposalId: "grace_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1290,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 4. Propose a minimum liquidity threshold for that grace period
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
        proposalId: "liq_prop_1",
        targetProposalId: "grace_prop_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        minLiquidityThreshold: 500,
        timestamp: 1300,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify it is proposed
    const liqProposal = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals?.liq_prop_1;
    expect(liqProposal).toBeDefined();
    expect(liqProposal!.status).toBe("proposed");
    expect(liqProposal!.minLiquidityThreshold).toBe(500);

    // Try voting by bob (rejection since not a member of alpha)
    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
        proposalId: "liq_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1310,
      },
    }, mockPack);
    expect(res.ok).toBe(false);

    // Vote to authorize by alice
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
        proposalId: "liq_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1320,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify status is authorized and target grace proposal minLiquidityThreshold is updated
    const updatedLiqProposal = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals?.liq_prop_1;
    expect(updatedLiqProposal!.status).toBe("authorized");

    const graceProp = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceProposals?.grace_prop_1;
    expect(graceProp!.minLiquidityThreshold).toBe(500);
  });

  it("should instantly cancel grace period and deactivate panic override in tickEconomy if reserves drop below the threshold", () => {
    let state = setupState();

    // 1. Propose and authorize a surcharge panic override proposal
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
        proposalId: "surcharge_panic_override_test",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        panicOverrideActive: true,
        cooldownDuration: 10,
        timestamp: 1200,
      } as any,
    }, mockPack);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
        proposalId: "surcharge_panic_override_test",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1250,
      } as any,
    }, mockPack);
    state = res.state;

    // 2. Propose a cancellation proposal
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
        proposalId: "cancel_prop_1",
        targetProposalId: "surcharge_panic_override_test",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        timestamp: 1270,
      } as any,
    }, mockPack);
    state = res.state;

    // 3. Propose a grace period proposal targeting the cancellation proposal with graceDuration = 5 steps
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
        proposalId: "grace_prop_1",
        targetProposalId: "cancel_prop_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        graceDuration: 5,
        timestamp: 1280,
      } as any,
    }, mockPack);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
        proposalId: "grace_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1290,
      } as any,
    }, mockPack);
    state = res.state;

    // 4. Propose a minimum liquidity threshold for that grace period (minLiquidityThreshold = 800)
    res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
        proposalId: "liq_prop_1",
        targetProposalId: "grace_prop_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        minLiquidityThreshold: 800,
        timestamp: 1300,
      },
    }, mockPack);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
        proposalId: "liq_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1310,
      },
    }, mockPack);
    state = res.state;

    // Vote to authorize the cancellation proposal itself so grace ticks start running
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
        proposalId: "cancel_prop_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1320,
      } as any,
    }, mockPack);
    state = res.state;

    // Verify reserves start at 1000, which is >= 800 threshold.
    // Ticking once: grace period count down should proceed normally (remaining Grace steps 5 -> 4)
    let tickedState = tickEconomy(state, mockPack);
    let cancelProp = tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals?.cancel_prop_1;
    expect(cancelProp!.remainingGraceSteps).toBe(4);

    let overrideProp = tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(overrideProp!.panicOverrideActive).toBe(true);

    // Put CDO vault reserves into default stress: drop balance to 700 (which is < 800 threshold)
    tickedState.sovereignDebtCDSCDOPools!.cdo_pool_1.fractionalizedVault.balance = 700;

    // Tick the economy again: it should instantly cancel grace and deactivate the panic override!
    tickedState = tickEconomy(tickedState, mockPack);

    cancelProp = tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals?.cancel_prop_1;
    expect(cancelProp!.remainingGraceSteps).toBe(0);

    overrideProp = tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(overrideProp!.panicOverrideActive).toBe(false);
    expect(overrideProp!.cooldownEndStep).toBeUndefined();

    // Verify journal message is present
    expect(tickedState.journal.some(m => m.includes("due to liquidity depletion"))).toBe(true);
  });
});

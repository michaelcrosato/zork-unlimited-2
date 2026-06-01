import { describe, it, expect } from "vitest";
import { createInitialState, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjusts } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Minimum Liquidity Threshold Adjustment (AF-199)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_extension_cancellation_grace_liquidity_adjust_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Liquidity Adjust Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and authorizing grace period minimum liquidity threshold adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Initialize an authorized minimum liquidity threshold
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals = {
      liq_1: {
        proposalId: "liq_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        minLiquidityThreshold: 5000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // 1. Propose minimum liquidity adjustment
    const proposeAdjustAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "liq_1", // targets liquidity proposal
      newMinLiquidityThreshold: 8000,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAdjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    let adjustProp = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals?.["adjust_1"];
    expect(adjustProp).toBeDefined();
    expect(adjustProp?.status).toBe("proposed");
    expect(adjustProp?.newMinLiquidityThreshold).toBe(8000);

    // 2. Bob votes to authorize the minimum liquidity adjustment (majority reached)
    const voteAdjustBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteAdjustBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals?.["adjust_1"]?.status).toBe("authorized");

    // The targeted proposal should now have its minimum liquidity threshold adjusted to 8000!
    expect(state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"]?.minLiquidityThreshold).toBe(8000);
  });

  it("should instantly cancel the grace period if the active pool's reserves drop below the NEW threshold adjusted via successful consensus voting", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Setup an authorized cancellation and an active grace period
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = {
      cancel_1: {
        proposalId: "cancel_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
        remainingGraceSteps: 5,
      },
    };

    state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_1: {
        proposalId: "override_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 15,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
        cooldownEndStep: 25,
      },
    };

    // Initialize an authorized minimum liquidity threshold
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals = {
      liq_1: {
        proposalId: "liq_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        minLiquidityThreshold: 5000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Setup a volatility insurance pool with balance = 6000 (above original threshold of 5000, but below adjusted threshold of 8000)
    state.swfReinsuranceOptionVolatilityInsurancePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        balance: 6000,
        timestamp: 1000,
      },
    };

    // 1. Propose and authorize minimum liquidity adjustment to 8000
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals = {
      adjust_1: {
        proposalId: "adjust_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "liq_1",
        newMinLiquidityThreshold: 8000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Make sure we run reconcile to apply the adjust to the targeted threshold
    state = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjusts(state, mockPack);
    expect(state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"]?.minLiquidityThreshold).toBe(8000);

    // 2. Tick economy. Since reserves (6000) is below new threshold (8000), the grace period should instantly terminate!
    state.step = 10;
    let terminatedState = tickEconomy(state, mockPack);
    expect(terminatedState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"]?.remainingGraceSteps).toBe(0);
    expect(terminatedState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"]?.cooldownEndStep).toBeUndefined();

    // Verify journal logging
    expect(terminatedState.journal).toContain(
      `[SWF Reinsurance Option Volatility Floor Panic Override Extension Cancellation Grace Terminated] Grace period cancelled early for cancellation cancel_1 due to liquidity depletion (Reserves: 6000 < Threshold: 8000).`
    );
  });

  it("should support state synchronization of grace period minimum liquidity threshold adjustments in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    stateA.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    stateA.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals = {
      liq_1: {
        proposalId: "liq_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        minLiquidityThreshold: 5000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Node A: Proposer proposes adjust_1
    const proposeAdjustAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "liq_1",
      newMinLiquidityThreshold: 8000,
      timestamp: 1001,
    };

    let resA = multiAgentStep(stateA, { agentId: "player", action: proposeAdjustAction as any }, mockPack);
    stateA = resA.state;

    // Node B: Start with identical base state, but Bob votes to authorize
    let stateB = JSON.parse(JSON.stringify(stateA));
    const voteAdjustBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      vote: true,
      timestamp: 1002,
    };

    let resB = multiAgentStep(stateB, { agentId: "bob", action: voteAdjustBob as any }, mockPack);
    stateB = resB.state;

    // Perform gossip state merge
    let merged = mergeMonotonicStateFields(stateA, stateB);
    merged = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjusts(merged, mockPack);

    // After merge, both proposals and votes are synchronized, and the proposal should be authorized
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals?.["adjust_1"]?.status).toBe("authorized");
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes?.["adjust_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes?.["adjust_1"]?.["bob"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"]?.minLiquidityThreshold).toBe(8000);
  });
});

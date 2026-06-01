import { describe, it, expect } from "vitest";
import { createInitialState, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidities } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Minimum Liquidity Threshold (AF-198)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_extension_cancellation_grace_liquidity_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Liquidity Test Pack",
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

  it("should support proposing, voting, and authorizing grace period minimum liquidity thresholds", () => {
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

    // Initialize an authorized panic override ending at step 25
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

    // 1. Propose early cancellation cancel_1
    const proposeCancelAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_1",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeCancelAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Propose early cancellation grace period grace_1 targeting cancel_1
    const proposeGraceAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
      proposalId: "grace_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "cancel_1",
      graceDuration: 5,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeGraceAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Propose grace period minimum liquidity threshold
    const proposeLiqAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
      proposalId: "liq_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "grace_1", // targets grace proposal
      minLiquidityThreshold: 5000,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeLiqAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    let liqProp = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"];
    expect(liqProp).toBeDefined();
    expect(liqProp?.status).toBe("proposed");
    expect(liqProp?.minLiquidityThreshold).toBe(5000);

    // 4. Bob votes to authorize the minimum liquidity proposal (majority reached)
    const voteLiqBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
      proposalId: "liq_1",
      vote: true,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteLiqBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"]?.status).toBe("authorized");
  });

  it("should instantly cancel the grace period if the active pool's reserves drop below the consensus threshold", () => {
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

    // Setup a volatility insurance pool with balance = 6000 (above threshold of 5000)
    state.swfReinsuranceOptionVolatilityInsurancePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        balance: 6000,
        timestamp: 1000,
      },
    };

    // 1. First tick: reserves = 6000 >= 5000 threshold. Grace ticks down from 5 to 4.
    state.step = 10;
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"]?.remainingGraceSteps).toBe(4);
    expect(tickedState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"]?.cooldownEndStep).toBe(14); // 10 + 4

    // 2. Drop the balance below threshold: balance = 4000 < 5000 threshold.
    if (tickedState.swfReinsuranceOptionVolatilityInsurancePools) {
      tickedState.swfReinsuranceOptionVolatilityInsurancePools["pool_1"].balance = 4000;
    }
    tickedState.step = 11;

    // 3. Tick economy again. The grace period should instantly terminate!
    let terminatedState = tickEconomy(tickedState, mockPack);
    expect(terminatedState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"]?.remainingGraceSteps).toBe(0);
    expect(terminatedState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"]?.cooldownEndStep).toBeUndefined();

    // Verify journal logging
    expect(terminatedState.journal).toContain(
      `[SWF Reinsurance Option Volatility Floor Panic Override Extension Cancellation Grace Terminated] Grace period cancelled early for cancellation cancel_1 due to liquidity depletion (Reserves: 4000 < Threshold: 5000).`
    );
  });

  it("should support state synchronization of grace period minimum liquidity threshold proposals and votes in the gossip mesh", () => {
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

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals = {
      grace_1: {
        proposalId: "grace_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        graceDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Node A: Proposer proposes liq_1
    const proposeLiqAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
      proposalId: "liq_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "grace_1",
      minLiquidityThreshold: 5000,
      timestamp: 1001,
    };

    let resA = multiAgentStep(stateA, { agentId: "player", action: proposeLiqAction as any }, mockPack);
    stateA = resA.state;

    // Node B: Start with identical base state, but Bob votes to authorize
    let stateB = JSON.parse(JSON.stringify(stateA));
    const voteLiqBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY",
      proposalId: "liq_1",
      vote: true,
      timestamp: 1002,
    };

    let resB = multiAgentStep(stateB, { agentId: "bob", action: voteLiqBob as any }, mockPack);
    stateB = resB.state;

    // Perform gossip state merge
    let merged = mergeMonotonicStateFields(stateA, stateB);
    merged = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidities(merged, mockPack);

    // After merge, both proposals and votes are synchronized, and the proposal should be authorized
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals?.["liq_1"]?.status).toBe("authorized");
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes?.["liq_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes?.["liq_1"]?.["bob"]).toBeDefined();
  });
});

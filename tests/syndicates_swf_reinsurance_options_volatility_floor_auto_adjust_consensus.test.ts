import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { recalculateReinsuranceOptionOrderBookMetrics } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Auto-Adjustment Consensus Voting (AF-193)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_auto_adjust_consensus_pack",
      title: "Reinsurance Options Volatility Floor Auto-Adjust Consensus Test Pack",
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
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and authorizing auto-adjust parameters", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
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
            yieldRate: 0.1,
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

    // 1. Propose auto-adjust parameters
    const proposeAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_AUTO_ADJUST",
      proposalId: "auto_adjust_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidityDepletionThreshold: 0.9,
      floorScalingFactor: 3.0,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check proposal is registered with "proposed" status
    let proposal = state.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals?.["auto_adjust_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");
    expect(proposal?.liquidityDepletionThreshold).toBe(0.9);
    expect(proposal?.floorScalingFactor).toBe(3.0);

    // 2. Alice votes to authorize (majority reached: 2 of 2)
    const voteAction = {
      type: "VOTE_VOLATILITY_FLOOR_AUTO_ADJUST",
      proposalId: "auto_adjust_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    proposal = state.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals?.["auto_adjust_1"];
    expect(proposal?.status).toBe("authorized");
  });

  it("should dynamically boost volatility floor using consensus-voted parameters when pool is depleted", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
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
            yieldRate: 0.1,
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

    state.yieldVolatilityIndexes = {
      index_1: {
        bondId: "index_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };

    // Authorized volatility floor of 0.5 (Base min spread: 20 * 0.5 = 10 gold)
    state.swfReinsuranceOptionVolatilityFloorProposals = {
      floor_1: {
        proposalId: "floor_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        volatilityFloor: 0.5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Authorized consensus auto-adjust parameters (Threshold: 0.9, Scaling: 3.0)
    state.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals = {
      auto_adjust_1: {
        proposalId: "auto_adjust_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidityDepletionThreshold: 0.9,
        floorScalingFactor: 3.0,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Low margin policy defaults (Threshold: 0.2, Scaling: 1.0)
    state.swfReinsuranceOptionMarginPolicies = {
      policy_1: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.15,
        penaltyRate: 0.05,
        liquidityDepletionThreshold: 0.2,
        floorScalingFactor: 1.0,
        timestamp: 1000,
      },
    };

    // Pool reserves = 2000, liabilities = 4000, ratio = 0.5.
    // Since ratio is 0.5, it is NOT depleted under margin policy (0.5 >= 0.2).
    // But under consensus proposal (0.5 < 0.9), it is depleted!
    // gap = 0.9 - 0.5 = 0.4.
    // multiplier = 1.0 + 3.0 * 0.4 = 2.2.
    // Boosted floor = 0.5 * 2.2 = 1.1.
    // Boosted min spread = 20 * 1.1 = 22 gold.
    state.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 2000 },
        totalBalance: 2000,
        liabilities: 4000,
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "buy",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 12,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
      order_2: {
        id: "order_2",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "sell",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 14,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
    };

    let afterMetricsState = recalculateReinsuranceOptionOrderBookMetrics(state);
    let depth = afterMetricsState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth?.bidAskSpread).toBe(22); // boosted using consensus parameters!

    // Verify journal contains consensus parameter logs
    const hasLog = afterMetricsState.journal?.some(
      (j) =>
        j.includes("[SWF Reinsurance Option Volatility Floor Auto-Boosted]") &&
        j.includes("Ratio: 0.5000 < Threshold: 0.9") &&
        j.includes("scaling factor 3")
    );
    expect(hasLog).toBe(true);
  });

  it("should support state synchronization of auto-adjust proposals and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals = {
      auto_adjust_1: {
        proposalId: "auto_adjust_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidityDepletionThreshold: 0.9,
        floorScalingFactor: 3.0,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes = {
      auto_adjust_1: {
        player: {
          proposalId: "auto_adjust_1",
          vote: true,
          timestamp: 1000,
        },
      },
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals = {
      auto_adjust_1: {
        proposalId: "auto_adjust_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidityDepletionThreshold: 0.9,
        floorScalingFactor: 3.0,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes = {
      auto_adjust_1: {
        alice: {
          proposalId: "auto_adjust_1",
          vote: true,
          timestamp: 1005,
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals?.["auto_adjust_1"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes?.["auto_adjust_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes?.["auto_adjust_1"]?.["alice"]).toBeDefined();
  });
});

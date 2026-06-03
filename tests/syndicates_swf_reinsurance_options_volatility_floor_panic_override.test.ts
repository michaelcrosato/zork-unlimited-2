import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { recalculateReinsuranceOptionOrderBookMetrics } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override / Cooldown (AF-194)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Test Pack",
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

  it("should support proposing, voting, and authorizing panic overrides", () => {
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

    // 1. Propose panic override
    const proposeAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE",
      proposalId: "override_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      panicOverrideActive: true,
      cooldownDuration: 5,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check proposal is registered with "proposed" status
    let proposal = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");
    expect(proposal?.panicOverrideActive).toBe(true);
    expect(proposal?.cooldownDuration).toBe(5);

    // 2. Alice votes to authorize (majority reached: 2 of 2)
    const voteAction = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE",
      proposalId: "override_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    proposal = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(proposal?.status).toBe("authorized");
    expect(proposal?.cooldownEndStep).toBe(6);
  });

  it("should temporarily freeze dynamic auto-boost under panic override cooldown and resume auto-boost afterwards", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice"],
    });

    state.step = 10;

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

    // Pool reserves = 2000, liabilities = 4000, ratio = 0.5.
    // depleted under consensus proposal (0.5 < 0.9).
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

    // 1. Without Panic Override, it should be boosted (min spread: 22 gold)
    let depthState = recalculateReinsuranceOptionOrderBookMetrics(state);
    let depth = depthState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth?.bidAskSpread).toBe(22);

    // 2. Add authorized panic override ending at step 15
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_1: {
        proposalId: "override_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
        cooldownEndStep: 15,
      },
    };

    // Current step: 10 <= 15 (Panic override active!). Dynamic boost is skipped.
    // Min spread should be base min spread: 20 * 0.5 = 10 gold.
    depthState = recalculateReinsuranceOptionOrderBookMetrics(state);
    depth = depthState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth?.bidAskSpread).toBe(10);
    expect(
      depthState.journal?.some((j) => j.includes("[SWF Reinsurance Option Volatility Floor Panic Override Active]"))
    ).toBe(true);

    // 3. Move step past cooldown end step (step: 16 > 15)
    state.step = 16;
    // Panic override expired. Dynamic boost should be active again!
    // Boosted min spread = 22 gold.
    depthState = recalculateReinsuranceOptionOrderBookMetrics(state);
    depth = depthState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth?.bidAskSpread).toBe(22);
  });

  it("should support state synchronization of panic overrides and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_1: {
        proposalId: "override_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes = {
      override_1: {
        player: {
          proposalId: "override_1",
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

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_1: {
        proposalId: "override_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes = {
      override_1: {
        alice: {
          proposalId: "override_1",
          vote: true,
          timestamp: 1005,
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes?.["override_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes?.["override_1"]?.["alice"]).toBeDefined();
  });
});

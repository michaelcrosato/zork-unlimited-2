import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { recalculateReinsuranceOptionOrderBookMetrics } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Pools Dynamic Volatility-Hedged Options Bid-Ask Spread Dynamic Volatility Floor Controls (AF-191)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_pack",
      title: "Reinsurance Options Volatility Floor Test Pack",
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

  it("should support proposing, voting, and applying volatility floors to dynamic spreads", () => {
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

    // Initialize average volatility index to something like 20%
    state.yieldVolatilityIndexes = {
      index_1: {
        bondId: "index_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };

    // 1. Propose volatility floor
    const proposeAction = {
      type: "PROPOSE_VOLATILITY_FLOOR",
      proposalId: "floor_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      volatilityFloor: 0.5, // 0.5 * avgVolatility = 0.5 * 20 = 10 minimum spread
      timestamp: 1001,
    };

    // Propose by player (member of Alpha)
    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check proposal is proposed
    let proposal = state.swfReinsuranceOptionVolatilityFloorProposals?.["floor_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");
    expect(proposal?.volatilityFloor).toBe(0.5);

    // Vote by alice (member of Alpha) -> majority reached (2 of 2)
    const voteAction = {
      type: "VOTE_VOLATILITY_FLOOR",
      proposalId: "floor_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    proposal = state.swfReinsuranceOptionVolatilityFloorProposals?.["floor_1"];
    expect(proposal?.status).toBe("authorized");

    // 2. Set up some limit orders to generate a low base spread (e.g. 2 gold)
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

    // Recalculate metrics -> Base spread is 14 - 12 = 2 gold.
    // Average Volatility is 20%. Minimum floor is 20 * 0.5 = 10 gold.
    // Dynamic floor should enforce minimum spread to be 10 gold.
    let afterMetricsState = recalculateReinsuranceOptionOrderBookMetrics(state);

    const depth = afterMetricsState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth).toBeDefined();
    expect(depth?.bidAskSpread).toBe(10); // raised from 2 to 10 gold!

    // Verify journal contains applied volatility floor logs
    const hasFloorLog = afterMetricsState.journal?.some(
      (j) =>
        j.includes("[SWF Reinsurance Option Volatility Floor Enforced]") &&
        j.includes("Raised bid-ask spread from 2 to 10 gold")
    );
    expect(hasFloorLog).toBe(true);
  });

  it("should support state synchronization of volatility floor proposals and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorProposals = {
      floor_1: {
        proposalId: "floor_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        volatilityFloor: 0.5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorVotes = {
      floor_1: {
        player: {
          proposalId: "floor_1",
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

    stateB.swfReinsuranceOptionVolatilityFloorProposals = {
      floor_1: {
        proposalId: "floor_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        volatilityFloor: 0.5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorVotes = {
      floor_1: {
        alice: {
          proposalId: "floor_1",
          vote: true,
          timestamp: 1005, // newer vote
        },
      },
    };

    // Merge states
    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Verify proposals and votes are merged successfully
    expect(merged.swfReinsuranceOptionVolatilityFloorProposals?.["floor_1"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorVotes?.["floor_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorVotes?.["floor_1"]?.["alice"]).toBeDefined();
  });
});

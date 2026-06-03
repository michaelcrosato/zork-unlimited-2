import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { recalculateReinsuranceOptionOrderBookMetrics } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Pools Dynamic Volatility-Hedged Options Pricing Spread Adjustment Voting (AF-190)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_spread_pack",
      title: "Reinsurance Options Spread Test Pack",
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

  it("should support proposing, voting, and applying spread adjustment factors to dynamic spreads", () => {
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

    // 1. Propose spread adjustment
    const proposeAction = {
      type: "PROPOSE_OPTION_SPREAD_ADJUSTMENT",
      proposalId: "adj_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      spreadAdjustmentFactor: 1.5,
      timestamp: 1001,
    };

    // Propose by player (member of Alpha)
    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check proposal is proposed
    let proposal = state.swfReinsuranceOptionSpreadAdjustmentProposals?.["adj_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");
    expect(proposal?.spreadAdjustmentFactor).toBe(1.5);

    // Vote by alice (member of Alpha) -> majority reached (2 of 2)
    const voteAction = {
      type: "VOTE_OPTION_SPREAD_ADJUSTMENT",
      proposalId: "adj_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    proposal = state.swfReinsuranceOptionSpreadAdjustmentProposals?.["adj_1"];
    expect(proposal?.status).toBe("authorized");

    // 2. Set up some limit orders to generate a base spread
    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "buy",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 10,
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
        limitPrice: 20,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
    };

    // Recalculate metrics -> Base spread should be lowestSell (20) - highestBuy (10) = 10 gold.
    // With 1.5x authorized spreadAdjustmentFactor, dynamic spread should be adjusted to Math.round(10 * 1.5) = 15 gold.
    let afterMetricsState = recalculateReinsuranceOptionOrderBookMetrics(state);
    
    const depth = afterMetricsState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth).toBeDefined();
    expect(depth?.bidAskSpread).toBe(15);

    // Verify journal contains applied adjustment logs
    const hasAdjustmentLog = afterMetricsState.journal?.some(j =>
      j.includes("[SWF Reinsurance Option Spread Adjustment Applied]") &&
      j.includes("Consensual spread adjustment factor 1.5 applied")
    );
    expect(hasAdjustmentLog).toBe(true);
  });

  it("should support state synchronization of spread adjustment proposals and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionSpreadAdjustmentProposals = {
      adj_1: {
        proposalId: "adj_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        spreadAdjustmentFactor: 1.5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionSpreadAdjustmentVotes = {
      adj_1: {
        player: {
          proposalId: "adj_1",
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

    stateB.swfReinsuranceOptionSpreadAdjustmentProposals = {
      adj_1: {
        proposalId: "adj_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        spreadAdjustmentFactor: 1.5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionSpreadAdjustmentVotes = {
      adj_1: {
        alice: {
          proposalId: "adj_1",
          vote: true,
          timestamp: 1005, // newer vote
        },
      },
    };

    // Merge states
    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Verify proposals and votes are merged successfully
    expect(merged.swfReinsuranceOptionSpreadAdjustmentProposals?.["adj_1"]).toBeDefined();
    expect(merged.swfReinsuranceOptionSpreadAdjustmentVotes?.["adj_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionSpreadAdjustmentVotes?.["adj_1"]?.["alice"]).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Pools Dynamic Reinsurance Premium Penalty Waiver Pro-Rata Refund Distributions (AF-189)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_penalty_refund_pack",
      title: "Reinsurance Options Penalty Refund Test Pack",
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

  it("should support proposing, voting, tracking premium contributions, and refunding penalties pro-rata on margin liquidation", () => {
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
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

    // Initialize premium contributions
    state.swfReinsuranceOptionPremiumContributions = {
      alpha: 100,
      beta: 300,
    };

    // 1. Propose & vote on Penalty Refund
    const proposeAction = {
      type: "PROPOSE_PENALTY_REFUND",
      proposalId: "ref_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      refundPenalty: true,
      timestamp: 1001,
    };

    // Propose by player (member of Alpha)
    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote by alice (member of Alpha) -> majority reached
    const voteAction = {
      type: "VOTE_PENALTY_REFUND",
      proposalId: "ref_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const proposal = state.swfReinsuranceOptionPenaltyRefundProposals?.["ref_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("authorized");
    expect(proposal?.refundPenalty).toBe(true);

    // 2. Setup margin call and written option contract for Alpha to be liquidated
    state.cdos = {
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
            ownership: {
              alpha: 1000,
            },
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

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 500, // low collateral
        prunedRoutesCount: 0,
        timestamp: 1000,
        leveragedTranchePositions: {
          "cdo_1_senior": {
            cdoId: "cdo_1",
            trancheId: "senior",
            borrowedAmount: 5000,
            purchasedStake: 5000,
            timestamp: 1000,
          },
        },
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta", // holder
        writerSyndicateId: "alpha", // writer
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.05,
        size: 10,
        timestamp: 1000,
        active: true,
        premiumPaid: 100,
      },
    };

    // Setup market conditions to trigger liquidation in tickEconomy
    state.swfYieldCDOTrancheRiskRatings = {
      "cdo_1_senior": {
        trancheId: "senior",
        riskRating: "C", // high risk -> low value
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionMarginPolicies = {
      "cdo_1_senior": {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.8,
        penaltyRate: 0.2, // 20% penalty rate
        timestamp: 1000,
      },
    };

    // Perform economy tick to trigger margin call audit & liquidation
    // Spot rate for senior is 0.05. Effective size is 10.
    // Penalty = size * spotRate * penaltyRate * 100 = 10 * 0.05 * 0.2 * 100 = 10 gold.
    // Total contributions = 400 gold (Alpha: 100 -> 25%, Beta: 300 -> 75%)
    // Alpha gets Math.floor(10 * 0.25) = 2 gold refund.
    // Beta gets Math.floor(10 * 0.75) = 7 gold refund.
    let liquidatedState = tickEconomy(state, mockPack);
    // Verify option is deactivated
    expect(liquidatedState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);

    // Alpha syndicate warChest should receive 13 gold refund (accounting for margin call deficit sweep of 3552 gold)
    expect(liquidatedState.syndicates?.["alpha"]?.warChest).toBe(6461);

    // Beta syndicate warChest should receive 39 gold refund
    expect(liquidatedState.syndicates?.["beta"]?.warChest).toBe(10039);

    // Verify journal contains penalty refund logs
    const hasRefundLog = liquidatedState.journal?.some(j =>
      j.includes("[Option Penalty Refund] Distributed refund of")
    );
    expect(hasRefundLog).toBe(true);
  });

  it("should support state synchronization of penalty refund proposals, votes, and premium contributions in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionPenaltyRefundProposals = {
      ref_1: {
        proposalId: "ref_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        refundPenalty: true,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionPenaltyRefundVotes = {
      ref_1: {
        player: {
          proposalId: "ref_1",
          vote: true,
          timestamp: 1000,
        },
      },
    };

    stateA.swfReinsuranceOptionPremiumContributions = {
      alpha: 100,
      beta: 50,
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateB.swfReinsuranceOptionPenaltyRefundProposals = {
      ref_1: {
        proposalId: "ref_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        refundPenalty: true,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionPenaltyRefundVotes = {
      ref_1: {
        alice: {
          proposalId: "ref_1",
          vote: true,
          timestamp: 1005, // newer vote
        },
      },
    };

    stateB.swfReinsuranceOptionPremiumContributions = {
      alpha: 80, // lower
      beta: 200, // higher
    };

    // Merge states
    const merged = mergeMonotonicStateFields(stateA, stateB);

    // Verify refund proposals are merged
    expect(merged.swfReinsuranceOptionPenaltyRefundProposals?.["ref_1"]).toBeDefined();

    // Verify refund votes are merged
    expect(merged.swfReinsuranceOptionPenaltyRefundVotes?.["ref_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionPenaltyRefundVotes?.["ref_1"]?.["alice"]).toBeDefined();

    // Verify premium contributions are merged using LWW (taking highest)
    expect(merged.swfReinsuranceOptionPremiumContributions?.["alpha"]).toBe(100);
    expect(merged.swfReinsuranceOptionPremiumContributions?.["beta"]).toBe(200);
  });
});

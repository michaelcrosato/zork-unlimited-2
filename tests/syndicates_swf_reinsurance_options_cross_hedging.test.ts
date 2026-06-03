import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, matchSWFReinsuranceOptionLimitOrders } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Dynamic Cross-Hedging & Automated Liquidity Matching (AF-161)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_cross_hedging_pack",
      title: "Reinsurance Options Cross Hedging Test Pack",
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

  it("should vote and reach consensus on SWF Reinsurance Option Cross Hedging Policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
      cdo_2: {
        id: "cdo_2",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Vote 1 (Pending)
    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      correlatedAssetId: "cdo_2",
      correlatedTrancheId: "senior",
      correlationCoefficient: 0.8,
      hedgeWeight: 0.5,
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionCrossHedgingPolicies?.["alpha_cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionCrossHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionCrossHedgingPolicies?.["alpha_cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.correlatedAssetId).toBe("cdo_2");
    expect(policy?.correlatedTrancheId).toBe("senior");
    expect(policy?.correlationCoefficient).toBe(0.8);
    expect(policy?.hedgeWeight).toBe(0.5);
    expect(state.adjustSWFReinsuranceOptionCrossHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should cross-hedge options using correlated asset when policy is active", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 50000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
      cdo_2: {
        id: "cdo_2",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {
              alpha: 5,
            },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "bob",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 500,
        timestamp: 1000,
        active: true,
      },
    };

    // Correlation = 0.8, hedge weight = 0.5.
    // Call Option delta will be ~0.8 (estimated high spot premium).
    // Target holdings: delta * size * correlation * weight = 0.8 * 500 * 0.8 * 0.5 = 160 shares.
    state.swfReinsuranceOptionCrossHedgingPolicies = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        correlatedAssetId: "cdo_2",
        correlatedTrancheId: "senior",
        correlationCoefficient: 0.8,
        hedgeWeight: 0.5,
        timestamp: 1000,
      },
    };

    // Set margin account
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 5000,
        timestamp: 1000,
      },
    };

    // Configure volatility to push delta higher
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 35.0,
        timestamp: 1000,
      },
    };

    // Rebalance trigger
    const updatedState = tickEconomy(state, mockPack);

    const holding = updatedState.swfYieldCDOs?.["cdo_2"]?.tranches?.["senior"]?.ownership?.["alpha"] ?? 0;
    expect(holding).toBeGreaterThan(5); // Automatic purchase occurred
    expect(updatedState.journal?.some(j => j.includes("[Cross Hedging Rebalancing]"))).toBe(true);
  });

  it("should provide automated liquidity matching for unmatched options limit orders using cross-hedging policies", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 50000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 50000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
      cdo_2: {
        id: "cdo_2",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Active cross-hedging policy
    state.swfReinsuranceOptionCrossHedgingPolicies = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        correlatedAssetId: "cdo_2",
        correlatedTrancheId: "senior",
        correlationCoefficient: 0.8,
        hedgeWeight: 0.5,
        timestamp: 1000,
      },
    };

    // Insert open unmatched BUY order from Beta
    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "beta",
        orderType: "buy",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.05,
        size: 100,
        limitPrice: 200,
        status: "Open",
        timestamp: 1000,
      },
    };

    // Execute matching
    const updatedState = matchSWFReinsuranceOptionLimitOrders(state);

    const order = updatedState.swfReinsuranceOptionLimitOrders?.["order_1"];
    expect(order?.status).toBe("Filled");

    // Reinsurance option contracts should have a new written contract
    const contracts = Object.values(updatedState.swfReinsuranceOptionsContracts || {});
    expect(contracts.length).toBeGreaterThan(0);
    const writtenContract = contracts.find(c => c.writerSyndicateId === "alpha" && c.syndicateId === "beta");
    expect(writtenContract).toBeDefined();
    expect(writtenContract?.size).toBe(100);

    // Journal should document the automated matching
    expect(updatedState.journal?.some(j => j.includes("[Automated Liquidity Match]"))).toBe(true);
  });
});

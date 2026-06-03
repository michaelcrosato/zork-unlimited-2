import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Dynamic Delta Hedging & Automated Spot Rate Arbitrage Execution (AF-159)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_delta_hedging_pack",
      title: "Reinsurance Options Delta Hedging Test Pack",
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

  it("should vote and reach consensus on SWF Reinsurance Option Delta Hedging Policy", () => {
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
            yieldRate: 0.2,
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
      type: "ADJUST_SWF_REINSURANCE_OPTION_DELTA_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetDelta: 0.6,
      rebalancingPriceTolerance: 0.05,
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionDeltaHedgingPolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionDeltaHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionDeltaHedgingPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.targetDelta).toBe(0.6);
    expect(policy?.rebalancingPriceTolerance).toBe(0.05);
    expect(state.adjustSWFReinsuranceOptionDeltaHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should buy underlying CDO tranche tokens from the pool when option price delta is above target + tolerance", () => {
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
            ownership: {
              alpha: 50,
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
            yieldRate: 0.2,
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

    // Current policy: Target Delta = 0.2, Tolerance = 0.05
    // With high spotRate, delta will be high (e.g. call delta is ~0.83).
    // delta (0.83) > targetDelta (0.2) + tolerance (0.05).
    // Target holdings: delta * size = 0.83 * 500 = 415 shares.
    // Current holdings: 50.
    // Difference: 415 - 50 = 365 shares to BUY.
    state.swfReinsuranceOptionDeltaHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetDelta: 0.2,
        rebalancingPriceTolerance: 0.05,
        timestamp: 1000,
      },
    };

    // Configure high spotRate by having active volatility indexes
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 40.0,
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

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Verify rebalancing bought tranche tokens
    const ownedShares = tickedState.swfYieldCDOs?.["cdo_1"]?.tranches?.senior?.ownership?.["alpha"] ?? 0;

    expect(ownedShares).toBeGreaterThan(50);
    expect(tickedState.journal?.some((j) => j.includes("[Delta Hedging Rebalancing]"))).toBe(true);
    expect(tickedState.journal?.some((j) => j.includes("purchased"))).toBe(true);
  });

  it("should sell underlying CDO tranche tokens back to the pool when option price delta is below target - tolerance", () => {
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
            ownership: {
              alpha: 400,
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
            yieldRate: 0.2,
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
        strikePremiumRate: 0.15, // Very high strike premium rate so spotRate is below strike
        size: 500,
        timestamp: 1000,
        active: true,
      },
    };

    // Current policy: Target Delta = 0.8, Tolerance = 0.05
    // With high strike premium, delta will be low (e.g. call delta is ~0.08).
    // delta (0.08) < targetDelta (0.8) - tolerance (0.05).
    // Target holdings: delta * size = 0.08 * 500 = 40 shares.
    // Current holdings: 400.
    // Difference: 40 - 400 = -360 shares to SELL.
    state.swfReinsuranceOptionDeltaHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetDelta: 0.8,
        rebalancingPriceTolerance: 0.05,
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

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Verify rebalancing sold tranche tokens
    const ownedShares = tickedState.swfYieldCDOs?.["cdo_1"]?.tranches?.senior?.ownership?.["alpha"] ?? 0;
    expect(ownedShares).toBeLessThan(400);
    expect(tickedState.journal?.some((j) => j.includes("[Delta Hedging Rebalancing]"))).toBe(true);
    expect(tickedState.journal?.some((j) => j.includes("sold"))).toBe(true);
  });
});

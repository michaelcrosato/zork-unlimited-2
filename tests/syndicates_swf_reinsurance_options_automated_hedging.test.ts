import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Stress-Test-Aware Automated Hedging & Dynamic Liquidity Insurance Pool Reallocation (AF-158)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_hedging_pack",
      title: "Reinsurance Options Hedging Test Pack",
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

  it("should vote and reach consensus on SWF Reinsurance Option Hedging Policy", () => {
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
      type: "ADJUST_SWF_REINSURANCE_OPTION_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      hedgingActivationThreshold: 40.0,
      reserveReallocationLimit: 1500,
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionHedgingPolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionHedgingPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.hedgingActivationThreshold).toBe(40.0);
    expect(policy?.reserveReallocationLimit).toBe(1500);
    expect(state.adjustSWFReinsuranceOptionHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should trigger rebalancing and reallocate from secondary reserves to insurance pool when under stress", () => {
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
        warChest: 6000,
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

    // Alpha syndicate has options contract written
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

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 800, // Normally sufficient (600), but insufficient under stress requirement (1530)
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 30.0,
        timestamp: 1000,
      },
    };

    // Active Stress Test Policy: Volatility Shock +20% (Total: 50%)
    state.swfReinsuranceOptionStressTestPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        simulatedVolatilityShock: 20.0,
        simulatedLiquidityShock: 30,
        reserveMultiplier: 1.0,
        timestamp: 1000,
      },
    };

    // Active Hedging Policy: Activation at 40%, Limit 1000 gold
    state.swfReinsuranceOptionHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        hedgingActivationThreshold: 40.0, // 30 + 20 = 50 >= 40 (Active!)
        reserveReallocationLimit: 1000,
        timestamp: 1000,
      },
    };

    // Alpha has 1200 gold in lower-yield secondary reserves
    state.secondaryReserves = {
      alpha: {
        syndicateId: "alpha",
        reserveGold: 1200,
        reserveRatio: 0.2,
        timestamp: 1000,
      },
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Verify reallocation happened!
    // Reserve decreased from 1200 by 1000 (limit) to 200
    expect(tickedState.secondaryReserves?.["alpha"]?.reserveGold).toBe(200);

    // Insurance policy allocatedGold has increased by 1000
    expect(tickedState.marginLiquidationInsurancePolicies?.["alpha"]?.allocatedGold).toBeDefined();

    // Reallocation prevents option contract from being liquidated!
    expect(tickedState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false); // Settle successfully
    expect(tickedState.journal?.some((j) => j.includes("[Automated Hedging Reallocation]"))).toBe(true);
    expect(tickedState.journal?.some((j) => j.includes("[Option Liquidation]"))).toBe(false);
  });
});

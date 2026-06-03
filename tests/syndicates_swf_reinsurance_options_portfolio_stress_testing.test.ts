import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Portfolio Stress Testing & Dynamic Liquidity Reserve Buffer Scaling (AF-157)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_stress_pack",
      title: "Reinsurance Options Stress Test Pack",
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

  it("should settle normally without liquidation if no stress test policy is active and collateral is sufficient", () => {
    const state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob", "carol"],
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
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

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 800, // Sufficient for normal requirement (600)
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta",
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

    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 30.0,
        timestamp: 1000,
      },
    };

    const tickedState = tickEconomy(state, mockPack);

    // Verify option settled normally, and was not liquidated
    expect(tickedState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);
    expect(tickedState.journal?.some((j) => j.includes("[SWF Reinsurance Option Settled]"))).toBe(true);
    expect(tickedState.journal?.some((j) => j.includes("[Option Liquidation]"))).toBe(false);
  });

  it("should trigger margin call and automatic liquidation when stress test policy is active and collateral is insufficient", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob", "carol"],
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
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

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 800, // Insufficient for stress requirement (1530)
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
      beta: {
        syndicateId: "beta",
        collateral: 500,
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta",
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

    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 30.0,
        timestamp: 1000,
      },
    };

    // Propose & vote on option stress test policy
    const stressVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      simulatedVolatilityShock: 20.0, // volatility under stress = 30 + 20 = 50
      simulatedLiquidityShock: 150.0, // flat surcharge = 150
      reserveMultiplier: 1.6, // multiplier = 1.6
      timestamp: 1001,
    };

    // Member 1 votes
    let res = multiAgentStep(state, { agentId: "player", action: stressVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Member 2 votes (reaching consensus)
    res = multiAgentStep(state, { agentId: "alice", action: stressVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify stress policy is active
    const policy = state.swfReinsuranceOptionStressTestPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.simulatedVolatilityShock).toBe(20.0);
    expect(policy?.simulatedLiquidityShock).toBe(150.0);
    expect(policy?.reserveMultiplier).toBe(1.6);

    // Tick economy
    const tickedState = tickEconomy(state, mockPack);

    // Alpha's collateral (800) is less than stress-adjusted requirement (1530),
    // so option should be automatically liquidated before it can settle!
    expect(tickedState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);
    expect(
      tickedState.journal?.some((j) =>
        j.includes("[Option Liquidation] Written option contract opt_1 of Syndicate alpha has been liquidated")
      )
    ).toBe(true);
    expect(tickedState.journal?.some((j) => j.includes("[SWF Reinsurance Option Settled]"))).toBe(false);
  });
});

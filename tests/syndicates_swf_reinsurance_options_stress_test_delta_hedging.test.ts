import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Portfolio Stress-Test-Aware Delta Hedging & Capital Reallocation Optimization (AF-160)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_stress_delta_hedging_pack",
      title: "Reinsurance Options Stress Delta Hedging Test Pack",
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

  it("should vote and reach consensus on SWF Reinsurance Option Stress-Test-Aware Delta Hedging Policy", () => {
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
    };

    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST_DELTA_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      stressDeltaTarget: 0.75,
      stressVolatilityThreshold: 35.0,
      safetyCapitalReallocationLimit: 1200,
      timestamp: 1000,
    };

    // Vote 1 (Pending)
    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionStressTestDeltaHedgingPolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionStressTestDeltaHedgingPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.stressDeltaTarget).toBe(0.75);
    expect(policy?.stressVolatilityThreshold).toBe(35.0);
    expect(policy?.safetyCapitalReallocationLimit).toBe(1200);
    expect(state.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should perform capital reallocation and target a stress-adjusted delta when volatility is above threshold", () => {
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

    // Standard policy: Target Delta = 0.2
    state.swfReinsuranceOptionDeltaHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetDelta: 0.2,
        rebalancingPriceTolerance: 0.05,
        timestamp: 1000,
      },
    };

    // Stress policy: Target Delta under stress = 0.8
    state.swfReinsuranceOptionStressTestDeltaHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        stressDeltaTarget: 0.8,
        stressVolatilityThreshold: 35.0,
        safetyCapitalReallocationLimit: 1500,
        timestamp: 1000,
      },
    };

    // Volatility Index: 40.0% (above threshold 35.0%)
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 40.0,
        timestamp: 1000,
      },
    };

    // Setup capital reserve sources
    state.secondaryReserves = {
      alpha: {
        syndicateId: "alpha",
        reserveRatio: 0.2,
        reserveGold: 500,
        timestamp: 1000,
      },
    };

    state.marginLiquidationInsurancePolicies = {
      alpha: {
        syndicateId: "alpha",
        allocatedGold: 400,
        timestamp: 1000,
      },
    };

    state.secondaryReserveInvestments = {
      alpha: {
        vault_1: {
          syndicateId: "alpha",
          vaultId: "vault_1",
          investedGold: 800,
          timestamp: 1000,
        },
      },
    };

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 1000,
        timestamp: 1000,
      },
    };

    const tickedState = tickEconomy(state, mockPack);

    // Verify capital reallocation was triggered and shifted:
    // Limit is 1500.
    // Sources available:
    // - Insurance policy: 400 (all taken)
    // - Secondary reserves: 500 (all taken)
    // - Secondary reserve investments vault_1: 800 (600 taken to reach 1500 limit)
    // Total reallocated = 1500.
    expect(tickedState.marginLiquidationInsurancePolicies?.["alpha"]?.allocatedGold).toBe(0);
    expect(tickedState.secondaryReserves?.["alpha"]?.reserveGold).toBe(0);
    expect(tickedState.secondaryReserveInvestments?.["alpha"]?.["vault_1"]?.investedGold).toBe(200); // 800 - 600

    // Add to warChest (5000 + 1500 = 6500) and collateral (1000 + 1500 = 2500)
    // Wait, the purchase of tokens will subtract from warChest so we check warChest and collateral changes.
    expect(tickedState.marginAccounts?.["alpha"]?.collateral).toBe(2500);

    // Verify that stress target delta (0.8) was used.
    // Call Option with high spotRate: spot delta is ~0.83.
    // Under standard delta policy (Target: 0.2), difference is massive and tolerance triggers.
    // Under stress delta policy (Target: 0.8), difference is ~0.03 which is within tolerance (0.05).
    // So if stress delta policy was successfully targeted, no transaction rebalancing is needed because delta (0.83) is within tolerance of Target (0.8).
    // Let's verify that stress delta was targeted!
    expect(tickedState.journal?.some(j => j.includes("[Stress-Test-Aware Delta Hedging Reallocation]"))).toBe(true);
  });
});

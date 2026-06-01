import { describe, it, expect } from "vitest";
import { createInitialState, GameState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Pool Rebalancing & Yield Optimization (AF-184)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_volatility_rebalancing_pack",
      title: "Volatility Pools Automated Rebalancing Test Pack",
      start_room: "clearing",
      vars_init: { gold: 100000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A sunny clearing.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and establishing a volatility pool rebalancing policy via consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
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

    // Initialize cross-syndicate option volatility pool
    state.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 4000 },
        totalBalance: 4000,
        timestamp: 1000,
      },
    };

    const adjustAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_POOL_REBALANCING",
      syndicateId: "alpha",
      poolId: "pool_1",
      riskSharingLimit: 5000,
      autoBalancingThreshold: 40.0,
      yieldRebalancingMultiplier: 1.5,
      timestamp: 1000,
    };

    // Member 1 (player) votes
    let res = multiAgentStep(state, { agentId: "player", action: adjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify vote is pending and policy is not yet established
    expect(state.swfReinsuranceOptionVolatilityPoolRebalancingPolicies?.["pool_1"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Member 2 (alice) votes YES to reach majority
    res = multiAgentStep(state, { agentId: "alice", action: adjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify policy has been established and votes cleared
    const policy = state.swfReinsuranceOptionVolatilityPoolRebalancingPolicies?.["pool_1"];
    expect(policy).toBeDefined();
    expect(policy?.riskSharingLimit).toBe(5000);
    expect(policy?.autoBalancingThreshold).toBe(40.0);
    expect(policy?.yieldRebalancingMultiplier).toBe(1.5);
    expect(state.adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes?.["alpha"]).toBeUndefined();
  });

  it("should trigger automated auto-deposit when average volatility is above the auto-balancing threshold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 1000 },
        totalBalance: 1000,
        timestamp: 1000,
      },
    };

    // Pre-establish policy
    state.swfReinsuranceOptionVolatilityPoolRebalancingPolicies = {
      pool_1: {
        poolId: "pool_1",
        riskSharingLimit: 3000,
        autoBalancingThreshold: 35.0,
        yieldRebalancingMultiplier: 1.2,
        timestamp: 1000,
      },
    };

    // Mock highly volatile VIX-style indexes
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 45, timestamp: 1000 }
    };

    // Tick economy
    state = tickEconomy(state, mockPack);

    // Verify auto-deposit happened (3000 limit - 1000 current = 2000 gold auto-deposit)
    const pool = state.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"];
    expect(pool?.totalBalance).toBe(3000);
    expect(pool?.syndicateContributions?.alpha).toBe(3000);
    expect(state.syndicates?.alpha?.warChest).toBe(3000); // 5000 - 2000
    expect(state.journal?.some(line => line.includes("[SWF Volatility Pool Auto-Deposit]"))).toBe(true);
  });

  it("should automatically transfer fallback liquidity and reward yield optimization on volatility shocks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 4000 },
        totalBalance: 4000,
        timestamp: 1000,
      },
    };

    // Pre-establish policy with multiplier 2.0 and risk limit 2000
    state.swfReinsuranceOptionVolatilityPoolRebalancingPolicies = {
      pool_1: {
        poolId: "pool_1",
        riskSharingLimit: 2000,
        autoBalancingThreshold: 30.0,
        yieldRebalancingMultiplier: 2.0,
        timestamp: 1000,
      },
    };

    // Pre-establish active margin account for alpha
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 200,
        timestamp: 1000,
      },
    };

    // Trigger volatile shock
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 40, timestamp: 1000 }
    };

    // Tick economy
    state = tickEconomy(state, mockPack);

    // Verify fallback liquidity transfer:
    // Transfer amount: Math.min(pool.totalBalance, limit * multiplier) = Math.min(4000, 2000 * 2.0) = 4000 gold
    const pool = state.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"];
    expect(pool?.totalBalance).toBe(0);
    expect(pool?.syndicateContributions?.alpha).toBe(0);

    const marginAcc = state.marginAccounts?.["alpha"];
    expect(marginAcc?.collateral).toBe(4200); // 200 + 4000

    // Optimized yield reward = Math.round(4000 * 0.05 * 2.0) = 400 gold
    expect(state.syndicates?.alpha?.warChest).toBe(5400); // 5000 + 400
    expect(state.journal?.some(line => line.includes("[SWF Volatility Pool Auto-Rebalance]"))).toBe(true);
  });
});

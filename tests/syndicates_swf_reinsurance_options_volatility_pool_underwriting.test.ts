import { describe, it, expect } from "vitest";
import { createInitialState, GameState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Pool Underwriting & Risk Premium Calibration (AF-185)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_volatility_underwriting_pack",
      title: "Volatility Pools Underwriting Test Pack",
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

  it("should support proposing, voting, and establishing a volatility pool underwriting policy via consensus", () => {
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
      type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_POOL_UNDERWRITING",
      syndicateId: "alpha",
      poolId: "pool_1",
      baselinePremiumWeight: 1.5,
      volatilityScalingMultiplier: 0.8,
      historicalDefaultWeight: 0.3,
      meshPartitionWeight: 0.5,
      timestamp: 1000,
    };

    // Member 1 (player) votes
    let res = multiAgentStep(state, { agentId: "player", action: adjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify vote is pending and policy is not yet established
    expect(state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Member 2 (alice) votes YES to reach majority
    res = multiAgentStep(state, { agentId: "alice", action: adjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify policy has been established and votes cleared
    const policy = state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"];
    expect(policy).toBeDefined();
    expect(policy?.baselinePremiumWeight).toBe(1.5);
    expect(policy?.volatilityScalingMultiplier).toBe(0.8);
    expect(policy?.historicalDefaultWeight).toBe(0.3);
    expect(policy?.meshPartitionWeight).toBe(0.5);
    expect(state.adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes?.["alpha"]).toBeUndefined();
  });

  it("should dynamically calibrate premium rate and charge dynamic premiums under volatile market triggers", () => {
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

    // Pre-establish underwriting policy
    state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies = {
      pool_1: {
        poolId: "pool_1",
        baselinePremiumWeight: 0.1,
        volatilityScalingMultiplier: 1.2,
        historicalDefaultWeight: 0.5,
        meshPartitionWeight: 0.8,
        yieldRedistributionWeight: 0.0,
        vaultLockDuration: 10,
        timestamp: 1000,
      },
    };

    // Pre-populate syndicate defaults (historical defaults = 2)
    state.syndicateDefaults = {
      alpha: 2,
    };

    // Pre-populate mock multi-fund reinsurance pool to establish linkStateDropRate = 0.5 (mesh partition severity)
    state.swfMultiFundReinsurancePools = {
      mf_pool: {
        id: "mf_pool",
        syndicateIds: ["alpha"],
        capitalAllocated: { alpha: 1000 },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.06,
        historicalVolatility: 12,
        active: false,
        linkStateDropRate: 0.5,
        timestamp: 1000,
      },
    };

    // 1. Tick under calm conditions (avgVolatility = 10.0, below volatile trigger)
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 10, timestamp: 1000 }
    };

    state = tickEconomy(state, mockPack);

    // Calibrated rate calculation:
    // baselinePremiumWeight (0.1) * (1.0 + (10/100) * 1.2) * (1.0 + 2 * 0.5) * (1.0 + 0.5 * 0.8)
    // = 0.1 * 1.12 * 2.0 * 1.4 = 0.3136
    const policy = state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"];
    expect(policy?.calibratedPremiumRate).toBeCloseTo(0.3136, 4);

    // Dynamic premium was NOT charged because avgVolatility < 30.0
    expect(state.syndicates?.alpha?.warChest).toBe(5000);
    expect(state.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"]?.totalBalance).toBe(1000);

    // 2. Tick under high volatility trigger conditions (avgVolatility = 40.0)
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 40, timestamp: 1000 }
    };

    state = tickEconomy(state, mockPack);

    // New Calibrated rate calculation:
    // baselinePremiumWeight (0.1) * (1.0 + (40/100) * 1.2) * (1.0 + 2 * 0.5) * (1.0 + 0.5 * 0.8)
    // = 0.1 * 1.48 * 2.0 * 1.4 = 0.4144
    const updatedPolicy = state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"];
    expect(updatedPolicy?.calibratedPremiumRate).toBeCloseTo(0.4144, 4);

    // Under high volatility (>= 30.0), dynamic premium IS charged:
    // Charge = Math.round(100 * calibratedPremiumRate) = Math.round(100 * 0.4144) = 41 gold
    const pool = state.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"];
    expect(pool?.totalBalance).toBe(1041);
    expect(pool?.syndicateContributions?.alpha).toBe(1041);
    expect(state.syndicates?.alpha?.warChest).toBe(4959); // 5000 - 41

    // Verify journal logging
    expect(state.journal?.some(line => line.includes("[SWF Volatility Pool Premium Calibration]"))).toBe(true);
    expect(state.journal?.some(line => line.includes("[SWF Volatility Pool Premium Payment]"))).toBe(true);
  });

  it("should synchronize and converge underwriting policies and votes across gossip mesh nodes", () => {
    const nodeA = new GossipNode("nodeA", mockPack, 1111);
    const nodeB = new GossipNode("nodeB", mockPack, 2222);

    // Add nodes to a mesh
    nodeA.connect(nodeB);

    nodeA.localState.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["nodeA", "nodeB"],
        definedBy: "nodeA",
        timestamp: 1000,
        warChest: 10000,
      },
    };
    nodeB.localState.syndicates = JSON.parse(JSON.stringify(nodeA.localState.syndicates));

    nodeA.localState.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 4000 },
        totalBalance: 4000,
        timestamp: 1000,
      },
    };
    nodeB.localState.swfReinsuranceOptionCrossSyndicatePools = JSON.parse(JSON.stringify(nodeA.localState.swfReinsuranceOptionCrossSyndicatePools));

    const adjustAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_POOL_UNDERWRITING",
      syndicateId: "alpha",
      poolId: "pool_1",
      baselinePremiumWeight: 1.5,
      volatilityScalingMultiplier: 0.8,
      historicalDefaultWeight: 0.3,
      meshPartitionWeight: 0.5,
      timestamp: 2000,
    };

    // Node A executes action (vote 1)
    const resA = nodeA.executeLocalAction(adjustAction as any);
    expect(resA.ok).toBe(true);

    // Node B executes action (vote 2)
    const resB = nodeB.executeLocalAction(adjustAction as any);
    expect(resB.ok).toBe(true);

    // Assert that locally before gossip, neither has reached consensus because votes haven't been exchanged
    expect(nodeA.localState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"]).toBeUndefined();
    expect(nodeB.localState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"]).toBeUndefined();

    // Gossip once from A to B, and B to A
    nodeA.gossip();
    nodeB.gossip();

    // Now they should have exchanged votes and converged on the approved policy!
    const policyA = nodeA.localState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"];
    const policyB = nodeB.localState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.["pool_1"];

    expect(policyA).toBeDefined();
    expect(policyB).toBeDefined();
    expect(policyA?.baselinePremiumWeight).toBe(1.5);
    expect(policyB?.baselinePremiumWeight).toBe(1.5);
  });

  it("should automatically distribute underwriting premium revenues and compound the rest with lock durations, unlocking them after expiration (AF-186)", () => {
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

    state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies = {
      pool_1: {
        poolId: "pool_1",
        baselinePremiumWeight: 0.1,
        volatilityScalingMultiplier: 1.2,
        historicalDefaultWeight: 0.5,
        meshPartitionWeight: 0.8,
        yieldRedistributionWeight: 0.6, // 60% redistributed to warChest, 40% compounded/locked
        vaultLockDuration: 2, // Locked for 2 steps
        timestamp: 1000,
      },
    };

    state.syndicateDefaults = { alpha: 2 };

    state.swfMultiFundReinsurancePools = {
      mf_pool: {
        id: "mf_pool",
        syndicateIds: ["alpha"],
        capitalAllocated: { alpha: 1000 },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.06,
        historicalVolatility: 12,
        active: false,
        linkStateDropRate: 0.5,
        timestamp: 1000,
      },
    };

    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 40, timestamp: 1000 }
    };

    // First tick (step = 1000, which is an epoch boundary since 1000 % 5 === 0)
    // Dynamic premium is charged: 41 gold.
    // War chest drops: 5000 - 41 = 4959.
    // At the end of the tick, because step is 1000 (epoch boundary):
    // 41 gold collected is distributed:
    // redistributedAmount = Math.floor(41 * 0.6) = 24 gold distributed back to alpha war chest (4959 + 24 = 4983)
    // compoundedAmount = 41 - 24 = 17 gold locked in secondary vault until step 1002 (1000 + 2)
    state.step = 1000;
    state = tickEconomy(state, mockPack);

    expect(state.syndicates?.alpha?.warChest).toBe(4983);
    const margin = state.marginAccounts?.["alpha"];
    expect(margin).toBeDefined();
    expect(margin?.swfUnderwritingLockedVaults).toHaveLength(1);
    expect(margin?.swfUnderwritingLockedVaults?.[0]?.amount).toBe(17);
    expect(margin?.swfUnderwritingLockedVaults?.[0]?.unlockStep).toBe(1002);
    expect(margin?.swfReinsuranceOptionVault ?? 0).toBe(0);

    // Second tick (step = 1001, NOT an epoch boundary, not matured yet)
    state.step = 1001;
    // Clear volatility so no new premiums are charged
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 10, timestamp: 1001 }
    };
    state = tickEconomy(state, mockPack);
    expect(state.syndicates?.alpha?.warChest).toBe(4983);
    expect(state.marginAccounts?.["alpha"]?.swfUnderwritingLockedVaults).toHaveLength(1);
    expect(state.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault ?? 0).toBe(0);

    // Third tick (step = 1002, matured, should unlock 17 gold into reinsurance vault!)
    state.step = 1002;
    state = tickEconomy(state, mockPack);
    expect(state.syndicates?.alpha?.warChest).toBe(4983);
    expect(state.marginAccounts?.["alpha"]?.swfUnderwritingLockedVaults).toHaveLength(0);
    expect(state.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(17);
    expect(state.journal?.some(j => j.includes("[SWF Volatility Pool Premium Matured]") && j.includes("Unlocked 17 gold"))).toBe(true);
  });
});

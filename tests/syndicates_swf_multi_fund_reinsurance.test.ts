import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Multi-Fund Reinsurance Pools Dynamic Yield Arbitrage & Volatility-Hedged Capital Allocation (AF-166)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_multi_fund_reinsurance_pack",
      title: "SWF Multi-Fund Reinsurance Test Pack",
      start_room: "market",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "The core commercial hub of the district.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support P2P voting and consensus for establishing a multi-fund reinsurance pool", () => {
    let state = createInitialState({
      seed: 11111,
      start: "market",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_corp: {
        id: "alpha_corp",
        name: "Alpha Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 5000,
      },
      beta_corp: {
        id: "beta_corp",
        name: "Beta Corp",
        members: ["alice", "bob"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 5000,
      },
    };

    const action = {
      type: "ADJUST_SWF_MULTI_FUND_REINSURANCE_POOL",
      poolId: "pool_1",
      syndicateId: "alpha_corp",
      syndicateIds: ["alpha_corp", "beta_corp"],
      capitalAllocated: {
        alpha_corp: 1000,
        beta_corp: 1000,
      },
      volatilityHedgeRatio: 0.5,
      targetYieldRate: 0.05,
      historicalVolatility: 20.0,
      arbitrageRoutes: ["cdo_1"],
      timestamp: 1001,
    };

    // 1. Vote from Alpha member (player)
    let res = multiAgentStep(state, { agentId: "player", action: action as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check that pool is not active yet (Beta has not approved)
    expect(state.swfMultiFundReinsurancePools?.["pool_1"]).toBeUndefined();
    expect(state.adjustSWFMultiFundReinsuranceVotes?.["pool_1"]?.["player"]).toBeDefined();

    // 2. Vote from Beta member (alice)
    const betaAction = { ...action, syndicateId: "beta_corp" };
    res = multiAgentStep(state, { agentId: "alice", action: betaAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Beta has two members, so alice is 50%, which is not a majority (> 50%). Pool still not active.
    expect(state.swfMultiFundReinsurancePools?.["pool_1"]).toBeUndefined();

    // 3. Vote from Beta member (bob)
    res = multiAgentStep(state, { agentId: "bob", action: betaAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Now all syndicates have majority approvals. Pool established!
    const pool = state.swfMultiFundReinsurancePools?.["pool_1"];
    expect(pool).toBeDefined();
    expect(pool?.active).toBe(true);
    expect(pool?.volatilityHedgeRatio).toBe(0.5);
    expect(pool?.targetYieldRate).toBe(0.05);
    expect(pool?.historicalVolatility).toBe(20.0);
    expect(state.adjustSWFMultiFundReinsuranceVotes?.["pool_1"]).toBeUndefined(); // cleaned up
  });

  it("should perform automated rebalancing and dynamic yield arbitrage during economy ticks", () => {
    let state = createInitialState({
      seed: 22222,
      start: "market",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha_corp: {
        id: "alpha_corp",
        name: "Alpha Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 5000,
      },
      beta_corp: {
        id: "beta_corp",
        name: "Beta Corp",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 5000,
      },
    };

    // Pre-activate a pool
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha_corp", "beta_corp"],
        capitalAllocated: {
          alpha_corp: 1000,
          beta_corp: 1000,
        },
        totalReserve: 2000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.05,
        historicalVolatility: 20.0,
        timestamp: 1000,
        active: true,
        arbitrageRoutes: ["swf_cdo_arbitrage"],
      },
    };

    // Pre-setup a high-yield CDO target for arbitrage
    state.swfYieldCDOs = {
      swf_cdo_arbitrage: {
        id: "swf_cdo_arbitrage",
        creatorSyndicateId: "alpha_corp",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.15, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.25, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.35, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Step 0:
    // Fluctuation step % 6 = 0 -> spotVolatility = 20 + 0 = 20.
    // required multiplier = 1 + (20/100)*0.5 = 1.1x.
    // totalRequired = 2000 * 1.1 = 2200. Share per syndicate = 1100.
    // Syndicates currently have 1000 allocated. Each should deposit 100.
    // War chest should go from 5000 to 4900.
    state.step = 0;
    state = tickEconomy(state, mockPack);

    let pool = state.swfMultiFundReinsurancePools?.["pool_1"];
    expect(pool?.capitalAllocated.alpha_corp).toBe(1100);
    expect(pool?.capitalAllocated.beta_corp).toBe(1100);
    expect(pool?.totalReserve).toBe(2200);
    expect(state.syndicates?.alpha_corp?.warChest).toBe(4982);
    expect(state.syndicates?.beta_corp?.warChest).toBe(4982);

    // Step 1:
    // Fluctuation step % 6 = 1 -> spotVolatility = 20 + 10 = 30.
    // required multiplier = 1 + (30/100)*0.5 = 1.15x.
    // totalRequired = 2000 * 1.15 = 2300. Share per syndicate = 1150.
    // Syndicates currently have 1100 allocated. Each should deposit 50.
    // War chest before: 4982. After deposit: 4932.
    // Arbitrage routed: 25% of 2300 = 575. Arbitrage profit: 575 * 0.3 = 172. Pro-rata share: 86.
    // War chest after arbitrage reward: 4932 + 86 = 5018.
    state.step = 1;
    state = tickEconomy(state, mockPack);

    pool = state.swfMultiFundReinsurancePools?.["pool_1"];
    expect(pool?.capitalAllocated.alpha_corp).toBe(1150);
    expect(pool?.capitalAllocated.beta_corp).toBe(1150);
    expect(pool?.totalReserve).toBe(2300);
    expect(state.syndicates?.alpha_corp?.warChest).toBe(5018);
    expect(state.syndicates?.beta_corp?.warChest).toBe(5018);
  });

  it("should support fractional yield bridging, reserve recovery, and dynamic collateral sweeps", () => {
    let state = createInitialState({
      seed: 33333,
      start: "market",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha_corp: {
        id: "alpha_corp",
        name: "Alpha Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 0, // Depleted war chest to trigger recovery!
      },
      beta_corp: {
        id: "beta_corp",
        name: "Beta Corp",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 5000,
      },
    };

    // Pre-activate a pool with bridging enabled
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha_corp", "beta_corp"],
        capitalAllocated: {
          alpha_corp: 1000, // Distress: below the target share of 1100
          beta_corp: 1000,
        },
        totalReserve: 2000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.10, // 10% base yield
        historicalVolatility: 20.0,
        timestamp: 1000,
        active: true,
        fractionalYieldBridgingEnabled: true,
        fractionalBridgeRatio: 0.40, // 40% bridged
        poolCollateral: {
          collective: 200, // Pre-seeded collateral reserve
        },
        crossMeshReserveTarget: 150, // Set target to trigger collateral sweeps
        fractionalDividendPayouts: {},
      },
    };

    // Step 0:
    // Fluctuation step % 6 = 0 -> spotVolatility = 20 + 0 = 20.
    // required multiplier = 1 + (20/100)*0.5 = 1.1x.
    // totalRequired = 2000 * 1.1 = 2200. Share per syndicate = 1100.
    // alpha_corp needs 100 but has 0 warChest. It will draw 100 from collective collateral (200 -> 100).
    // beta_corp has plenty of warChest and will deposit 100 normally from 5000 -> 4900.
    //
    // Base Yield = 2200 * 0.10 = 220 gold.
    // Bridged Yield = 220 * 0.40 = 88 gold.
    // Remaining Direct Yield = 220 - 88 = 132 gold (66 gold each).
    // Bridged Yield adds to collective collateral: 100 + 88 = 188.
    // Dividends tracker gets 44 each.
    //
    // Collateral Sweep: 188 exceeds target 150 by 38. Capped at 150.
    // 38 gold is swept and distributed equally (19 gold each).
    // Final alpha_corp warChest: 0 (start) + 66 (direct yield) + 19 (sweep) = 85 gold.
    // Final beta_corp warChest: 5000 (start) - 100 (deposit) + 66 (direct yield) + 19 (sweep) = 4985 gold.
    state.step = 0;
    state = tickEconomy(state, mockPack);

    const pool = state.swfMultiFundReinsurancePools?.["pool_1"];
    expect(pool).toBeDefined();
    expect(pool?.capitalAllocated.alpha_corp).toBe(1100); // Fully recovered!
    expect(pool?.capitalAllocated.beta_corp).toBe(1100);
    expect(pool?.poolCollateral?.collective).toBe(150); // Capped at target by sweep
    expect(pool?.fractionalDividendPayouts?.alpha_corp).toBe(44);
    expect(pool?.fractionalDividendPayouts?.beta_corp).toBe(44);

    expect(state.syndicates?.alpha_corp?.warChest).toBe(85);
    expect(state.syndicates?.beta_corp?.warChest).toBe(4985);
  });
});

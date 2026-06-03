import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Shock Arbitrage Spread and Yield Target Balancing (AF-175)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_arbitrage_balancing_pack",
      title: "Reinsurance Options Arbitrage Balancing Test Pack",
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

  it("should vote and reach consensus on Hedging Policy with volatilityShockArbitrageSpreadThreshold and targetBalanceLimit", () => {
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

    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      hedgingActivationThreshold: 35.0,
      reserveReallocationLimit: 1200,
      volatilityShockArbitrageSpreadThreshold: 15.5,
      targetBalanceLimit: 1000,
      timestamp: 1000,
    };

    // Vote 1 (Pending)
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
    expect(policy?.hedgingActivationThreshold).toBe(35.0);
    expect(policy?.reserveReallocationLimit).toBe(1200);
    expect(policy?.volatilityShockArbitrageSpreadThreshold).toBe(15.5);
    expect(policy?.targetBalanceLimit).toBe(1000);
    expect(state.adjustSWFReinsuranceOptionHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should dynamically narrow bid-ask spread and route option premium payouts under volatile shocks and multi-fund yield target thresholds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
    });
    state.step = 1;

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

    // Active Reinsurance Option Hedging Policy
    state.swfReinsuranceOptionHedgingPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        hedgingActivationThreshold: 35.0,
        reserveReallocationLimit: 1000,
        volatilityShockArbitrageSpreadThreshold: 15.0,
        targetBalanceLimit: 400,
        timestamp: 1000,
      },
    };

    // Active Stress Test Policy: Volatility Shock +20% (Total volatility: avgVolatility 20 + shock 20 = 40%)
    state.swfReinsuranceOptionStressTestPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        simulatedVolatilityShock: 20.0,
        simulatedLiquidityShock: 100,
        reserveMultiplier: 1.2,
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
        premiumCompounded: true,
      },
    };

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 2000,
        leveragedTranchePositions: {},
        timestamp: 1000,
        swfReinsuranceOptionVault: 1000, // Vault contains 1000 gold of compounded option premiums
      },
    };

    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 20.0, // base volatility
        timestamp: 1000,
      },
    };

    // Set up an active SWF multi-fund reinsurance pool with high yield target rate (>= 0.05)
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha"],
        capitalAllocated: { alpha: 2000 },
        totalReserve: 2000,
        volatilityHedgeRatio: 0.8,
        targetYieldRate: 0.08, // Meets yield target threshold (>= 0.05)
        historicalVolatility: 15.0,
        timestamp: 1000,
        active: true,
      },
    };

    // Set up mock open buy and sell limit orders in state to result in a 30 gold bid-ask spread
    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "alpha",
        orderType: "buy",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 500,
        limitPrice: 70,
        status: "Open",
        timestamp: 1000,
      },
      order_2: {
        id: "order_2",
        syndicateId: "bob",
        orderType: "sell",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 500,
        limitPrice: 100,
        status: "Open",
        timestamp: 1000,
      },
    };

    // Tick the economy to trigger dynamic spread narrowing and automated secondary market premium vault reallocation
    let nextState = tickEconomy(state, mockPack);

    // 1. Verify dynamic spread shift (spread exceeded 15.0 spread threshold)
    // Excess = 30 - 15 = 15 gold. 50% narrowing = 7 gold reduction -> spread = 23 gold
    const finalDepth = nextState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(finalDepth).toBeDefined();
    expect(finalDepth?.bidAskSpread).toBeLessThan(30);
    expect(finalDepth?.bidAskSpread).toBe(23);

    // 2. Verify automated secondary market premium rebalancing
    // targetBalanceLimit is 400 gold, so we reallocate 400 gold from swfReinsuranceOptionVault to pool_1 totalReserve
    const finalMargin = nextState.marginAccounts?.["alpha"];
    expect(finalMargin?.swfReinsuranceOptionVault).toBe(600); // 1000 - 400 = 600

    const finalPool = nextState.swfMultiFundReinsurancePools?.["pool_1"];
    expect(finalPool?.totalReserve).toBe(2800); // 2000 + 400 (rebalance) + 400 (premium routing) = 2800

    // Ensure the journal registered the actions
    expect(nextState.journal).toContainEqual(
      expect.stringContaining(
        "[SWF Reinsurance Option Spread Rebalancing] Dynamically narrowed option spread by 7 gold"
      )
    );
    expect(nextState.journal).toContainEqual(
      expect.stringContaining(
        "[SWF Volatility Shock Arbitrage Spread Rebalancing] Routed 400 gold of option premium payouts"
      )
    );
  });
});

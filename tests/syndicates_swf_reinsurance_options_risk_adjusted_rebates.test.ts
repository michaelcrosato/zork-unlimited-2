import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Dynamic Risk-Adjusted MM Rebates & Spread Incentives (AF-169)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_risk_adjusted_pack",
      title: "Reinsurance Risk-Adjusted Rebate Test Pack",
      start_room: "clearing",
      vars_init: { gold: 30000 },
      flags_init: [],
    },
    factions: [
      { id: "rangers", name: "Rangers Faction", description: "Rangers description" },
      { id: "mages", name: "Mages Faction", description: "Mages description" }
    ],
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

  it("should support defining a cartel and voting on policies with reinsuranceOptionRebateMultiplier", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    // 1. Define Merchant Cartel with player and alice as members
    const defineCartelAction = {
      type: "DEFINE_MERCHANT_CARTEL",
      cartelId: "cartel_1",
      name: "Shadow Syndicate Cartel",
      members: ["player", "alice"],
      factionId: "rangers",
      priceMultiplier: 1.2,
      reinsuranceOptionRebateMultiplier: 1.5,
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: defineCartelAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cartels?.["cartel_1"]).toBeDefined();
    expect(state.cartels?.["cartel_1"]?.reinsuranceOptionRebateMultiplier).toBe(1.5);

    // Initial vote should have reinsuranceOptionRebateMultiplier
    expect(state.cartelVotes?.["cartel_1"]?.["player"]?.reinsuranceOptionRebateMultiplier).toBe(1.5);

    // 2. Vote on Cartel Policy
    const voteCartelAction = {
      type: "VOTE_CARTEL_POLICY",
      cartelId: "cartel_1",
      priceMultiplier: 1.3,
      embargoedFactions: ["mages"],
      reinsuranceOptionRebateMultiplier: 1.6,
      timestamp: 1001,
    };

    // Alice votes
    res = multiAgentStep(state, { agentId: "alice", action: voteCartelAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Consensus reached (player and alice members of cartel_1 / same syndicate)
    const policy = state.cartelPolicies?.["cartel_1"];
    expect(policy).toBeDefined();
    expect(policy?.priceMultiplier).toBe(1.3);
    expect(policy?.reinsuranceOptionRebateMultiplier).toBe(1.6);
  });

  it("should support proposing/voting on guild policies with reinsuranceOptionRebateMultiplier", () => {
    let state = createInitialState({
      seed: 23456,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice"],
    });

    state.merchantGuilds = {
      guild_1: {
        id: "guild_1",
        name: "Trade Guild",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.guildMemberships = {
      player: ["guild_1"],
      alice: ["guild_1"],
    };

    // Vote on Guild Policy with reinsuranceOptionRebateMultiplier
    const voteAction = {
      type: "VOTE_GUILD_POLICY",
      guildId: "guild_1",
      tariffRate: 5,
      exportPricingPolicy: "premium",
      reinsuranceOptionRebateMultiplier: 1.2,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Since player is the only voter so far, let's have Alice vote too to reach majority consensus
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildPolicies?.["guild_1"]?.reinsuranceOptionRebateMultiplier).toBe(1.2);
  });

  it("should scale the market maker rebates and spread incentives dynamically with active network partition risk and reinsurance spot volatility", () => {
    let state = createInitialState({
      seed: 98765,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    // 1. Establish syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 15000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 15000,
      },
    };

    // 2. Setup SWF Multi-Fund Reinsurance Pool with linkStateDropRate (network partition risk)
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha", "beta"],
        capitalAllocated: { alpha: 5000, beta: 5000 },
        totalReserve: 10000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.12,
        historicalVolatility: 15.0,
        timestamp: 1000,
        active: true,
        linkStateDropRate: 0.25, // 25% drop rate / partition risk!
      },
    };

    // 3. Setup Yield Volatility Indexes (spot volatility)
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 40.0, // high spot volatility!
        timestamp: 1000,
      },
    };

    // 4. Setup CDO
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

    // 5. Setup MM Rebate Policy
    state.swfReinsuranceOptionMarketMakerRebatePolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseRebateRate: 0.04,
        maxRebateRate: 0.25, // allow up to 25% max rebate
        timestamp: 1000,
      },
    };

    // 6. Setup Cartel and Guild policies to add multipliers
    state.cartels = {
      cartel_1: {
        id: "cartel_1",
        name: "Alpha Cartel",
        members: ["alpha"], // Alpha Syndicate member of cartel_1
        factionId: "rangers",
        priceMultiplier: 1.0,
        definedBy: "player",
        timestamp: 1000,
      },
    };
    state.cartelPolicies = {
      cartel_1: {
        priceMultiplier: 1.0,
        embargoedFactions: [],
        reinsuranceOptionRebateMultiplier: 1.5, // 1.5x cartel bonus!
      },
    };

    // Alpha (buyer) submits limit order FIRST -> MAKER (timestamp 1001)
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_1",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 400,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta (seller) submits limit order SECOND -> TAKER (timestamp 1002)
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_1",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 400,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Trigger match
    state = tickEconomy(state, mockPack);

    // Let's verify rebate and spread adjustments:
    // avgVolatility = 40
    // linkStateDropRate = 0.25
    // depth = 2000 (buy_1 size + sell_1 size)
    // volumeFactor = 1000 / (1000 + 2000) = 0.333333
    // volFactor = 1.0 + 40/50 = 1.8
    // dropFactor = 1.0 + 0.25 * 2.0 = 1.5
    // depthFactor = 1.0 + 0.333333 = 1.333333
    // closeness = 1.0
    // cartelMult = 1.5 (Alpha Syndicate belongs to Cartel 1)
    // baseRebateRate = 0.04
    // dynamicRebateRate = 0.04 * 1.0 * 1.8 * 1.5 * 1.333333 * 1.5 * 1.0 = 0.216 (21.6% rebate rate!)
    
    // Execution price (finalPrice) before transaction fee is 404 gold (scaled by volume/impact, standing is 0).
    // RebateAmount = round(404 * 0.216) = 87 gold.
    // Assert that syndicate alpha received a high rebate amount (around 87 gold)
    const rebateLog = state.journal.find(j => j.includes("[SWF Reinsurance Option Market Maker Rebate]"));
    expect(rebateLog).toBeDefined();
    expect(rebateLog).toContain("Syndicate alpha received 87 gold rebate as maker");
    
    // Check that Alpha's buy order is filled!
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_1"]?.status).toBe("Filled");
  });

  it("should dynamically scale the market maker rebates and spread adjustments based on cartel and guild risk-adjusted factors (AF-169)", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    // Setup syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 15000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 15000,
      },
    };

    // Setup SWF Multi-Fund Reinsurance Pool
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha", "beta"],
        capitalAllocated: { alpha: 5000, beta: 5000 },
        totalReserve: 10000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.12,
        historicalVolatility: 15.0,
        timestamp: 1000,
        active: true,
        linkStateDropRate: 0.25,
      },
    };

    // Setup Yield Volatility Indexes
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 40.0,
        timestamp: 1000,
      },
    };

    // Setup CDO
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

    // Setup MM Rebate Policy
    state.swfReinsuranceOptionMarketMakerRebatePolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseRebateRate: 0.04,
        maxRebateRate: 0.25,
        timestamp: 1000,
      },
    };

    // Define Cartel with Volatility Hedge and Partition Risk Factors
    const defineCartelAction = {
      type: "DEFINE_MERCHANT_CARTEL",
      cartelId: "cartel_1",
      name: "Alpha Cartel",
      members: ["player", "alice"],
      factionId: "rangers",
      priceMultiplier: 1.0,
      reinsuranceOptionRebateMultiplier: 1.0,
      reinsuranceOptionVolatilityHedgeFactor: 1.2,
      reinsuranceOptionPartitionRiskFactor: 1.3,
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: defineCartelAction as any }, mockPack);
    state = res.state;

    // Verify cartel policy was reconciled with the new factors
    expect(state.cartelPolicies?.["cartel_1"]?.reinsuranceOptionVolatilityHedgeFactor).toBe(1.2);
    expect(state.cartelPolicies?.["cartel_1"]?.reinsuranceOptionPartitionRiskFactor).toBe(1.3);

    // Alpha (buyer, maker) submits limit order
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_1",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 400,
      timestamp: 1001,
    };
    res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta (seller, taker) submits limit order
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_1",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 400,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Trigger match and economy tick
    state = tickEconomy(state, mockPack);

    // Let's verify that the rebate calculation applied the cartel's risk factors:
    // avgVolatility = 40.0, baseVolFactor = 1.0 + 40/50 = 1.8.
    // With cartelVolHedge (1.2): volFactor = 1.0 + 0.8 * 1.2 = 1.96.
    // linkStateDropRate = 0.25, baseDropFactor = 1.0 + 0.25 * 2.0 = 1.5.
    // With cartelPartitionRisk (1.3): dropFactor = 1.0 + 0.5 * 1.3 = 1.65.
    // depthFactor = 1.333333.
    // closeness = 1.0.
    // rebateRate = 0.04 * 1.0 * 1.96 * 1.65 * 1.333333 = 0.17248 (17.25% rebate rate!)
    // Execution price before transaction fee is 404.
    // RebateAmount = round(404 * 0.17248) = 70 gold.
    const rebateLog = state.journal.find(j => j.includes("[SWF Reinsurance Option Market Maker Rebate]"));
    expect(rebateLog).toBeDefined();
    expect(rebateLog).toContain("Syndicate alpha received 70 gold rebate as maker");
  });
});

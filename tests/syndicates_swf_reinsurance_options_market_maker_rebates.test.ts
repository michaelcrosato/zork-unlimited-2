import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Limit Order Book Market Maker Rebates & Spread Incentives (AF-155)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_rebate_pack",
      title: "Reinsurance MM Rebate Test Pack",
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

  it("should support proposing and consensus voting on rebate adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob"],
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

    // Vote 1: Player (syndicate alpha member) proposes/votes for policy
    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARKET_MAKER_REBATE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      baseRebateRate: 0.05,
      maxRebateRate: 0.15,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should still be empty since consensus (majority > 1 member) is not reached
    expect(state.swfReinsuranceOptionMarketMakerRebatePolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionMarketMakerRebateVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2: Alice votes for same policy (majority reached: 2 out of 2)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should be established and votes cleared
    const policy = state.swfReinsuranceOptionMarketMakerRebatePolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.baseRebateRate).toBe(0.05);
    expect(policy?.maxRebateRate).toBe(0.15);
    expect(state.adjustSWFReinsuranceOptionMarketMakerRebateVotes?.["alpha"]).toBeUndefined();

    // Verify journal log
    const log = state.journal.find((j) => j.includes("[SWF Reinsurance Option Market Maker Rebate Policy Adjusted]"));
    expect(log).toBeDefined();
    expect(log).toContain("Base Rebate Rate: 0.0500");
    expect(log).toContain("Max Rebate Rate: 0.1500");
  });

  it("should distribute rebates dynamically based on closeness to mid-market price when a buy limit order is the maker", () => {
    let state = createInitialState({
      seed: 23456,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
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

    // Voted policy: base rebate = 4%, max rebate = 10%
    state.swfReinsuranceOptionMarketMakerRebatePolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseRebateRate: 0.04,
        maxRebateRate: 0.1,
        timestamp: 1000,
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
      limitPrice: 300,
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
      limitPrice: 300,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Trigger match
    state = tickEconomy(state, mockPack);

    // Let's verify rebate amount:
    // midMarketPrice = (300/1000 + 300/1000) / 2 = 0.3
    // maker price = 300/1000 = 0.3
    // closeness = 1 / (1 + |0.3 - 0.3|) = 1.0
    // rebateRate = min(0.10, 0.04 * 1.0 * 1.3 * 1.3333333333333333) = 0.069333 (6.93% rebate)
    // Execution price (finalPrice) before transaction fee is 303 gold (scaled by volume/impact, standing is 0).
    // Rebate = round(303 * 0.069333) = 21 gold.
    // Buyer (Alpha, maker) pays: finalPrice (303) + transactionFee (0 since no cost policy exists) - rebate (21) = 282 gold.
    // Seller (Beta, taker) receives: finalPrice (303) - transactionFee (0) = 303 gold.
    expect(state.syndicates?.["alpha"]?.warChest).toBe(10000 - 282);
    expect(state.syndicates?.["beta"]?.warChest).toBe(10000 + 303);

    // Verify journal log contains the rebate entry
    const log = state.journal.find((j) => j.includes("[SWF Reinsurance Option Market Maker Rebate]"));
    expect(log).toBeDefined();
    expect(log).toContain("Syndicate alpha received 21 gold rebate as maker");
  });
});

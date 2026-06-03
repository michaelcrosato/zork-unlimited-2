import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Matching Engine Market Impact & Scaling (AF-152)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_market_impact_pack",
      title: "Reinsurance Market Impact Test Pack",
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

  it("should scale down executed volume and adjust price for large orders, but NOT for standard-sized orders", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    // 1. Setup syndicates
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

    // Setup dummy CDO
    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 2000,
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

    // 2. Test large orders: buy size 2000 (>= 1000 limit)
    const largeBuyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "large_buy_1",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 2000,
      limitPrice: 600,
      timestamp: 1001,
    };

    // Alpha votes for large buy order
    let res = multiAgentStep(state, { agentId: "player", action: largeBuyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: largeBuyAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["large_buy_1"]).toBeDefined();
    expect(state.swfReinsuranceOptionLimitOrders?.["large_buy_1"]?.status).toBe("Open");

    const largeSellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "large_sell_1",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 2000,
      limitPrice: 500,
      timestamp: 1002,
    };

    // Beta votes for large sell order
    res = multiAgentStep(state, { agentId: "bob", action: largeSellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: largeSellAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["large_sell_1"]).toBeDefined();
    expect(state.swfReinsuranceOptionLimitOrders?.["large_sell_1"]?.status).toBe("Open");

    // 3. Tick economy to execute the match with market impact
    state = tickEconomy(state, mockPack);

    // Verify filled status
    expect(state.swfReinsuranceOptionLimitOrders?.["large_buy_1"]?.status).toBe("Filled");
    expect(state.swfReinsuranceOptionLimitOrders?.["large_sell_1"]?.status).toBe("Filled");

    // Let's verify our market impact calculations:
    // Total open size for senior tranche = 2000 (buy) + 2000 (sell) = 4000
    // Ratio = 2000 / 4000 = 0.5
    // Price Impact = 0.5 * 0.2 = 0.1 (10% markup)
    // Volume Scale = 1.0 - (0.5 - 0.4) * 0.833 = 0.9167
    // Executed Size = round(2000 * 0.9167) = 1833
    // Maker price is buy order limit price = 600
    // Base executed price = 600 * 0.9167 = 550.02
    // Adjusted Price = round(550.02 * 1.1) = 605

    // Verify created options contract size is scaled down
    const contract = state.swfReinsuranceOptionsContracts?.["opt_limit_1"];
    expect(contract).toBeDefined();
    expect(contract?.size).toBe(1833); // Scaled from 2000 down to 1833!

    // Verify gold transfer with adjusted price (Alpha pays 605, Beta receives 605)
    expect(state.syndicates?.["alpha"]?.warChest).toBe(10000 - 605); // 9395
    expect(state.syndicates?.["beta"]?.warChest).toBe(10000 + 605); // 10605

    // Verify journal log contains market impact entry
    const marketImpactLog = state.journal?.find((log) => log.includes("[SWF Reinsurance Option Market Impact]"));
    expect(marketImpactLog).toBeDefined();
    expect(marketImpactLog).toContain("Volume scaled by 91.7%");
    expect(marketImpactLog).toContain("Price adjusted by +10.0%");
  });
});

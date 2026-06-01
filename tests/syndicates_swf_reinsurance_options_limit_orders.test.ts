import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Secondary Market Limit Order Matching (AF-149)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_limit_orders_pack",
      title: "Reinsurance Limit Orders Test Pack",
      start_room: "clearing",
      vars_init: { gold: 15000 },
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

  it("should support proposing, voting, submitting, matching (writing new), transferring existing, and canceling option limit orders", () => {
    let state = createInitialState({
      seed: 98765,
      start: "clearing",
      varsInit: { gold: 15000 },
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
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
      },
    };

    // Setup dummy CDO
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

    // 2. Submit Buy Limit Order (Alpha wants to BUY a Call Option, CDO: cdo_1, senior, strike: 0.03, size: 500, price: 150 gold)
    const buyOrderAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_order_1",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 150,
      timestamp: 1001,
    };

    // First vote: player (Alpha, 1/2 members, PENDING majority)
    let res = multiAgentStep(state, { agentId: "player", action: buyOrderAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_order_1"]).toBeUndefined();

    // Second vote: alice (Alpha, 2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: buyOrderAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const buyOrder = state.swfReinsuranceOptionLimitOrders?.["buy_order_1"];
    expect(buyOrder).toBeDefined();
    expect(buyOrder?.status).toBe("Open");
    expect(buyOrder?.orderType).toBe("buy");
    expect(buyOrder?.limitPrice).toBe(150);

    // 3. Submit Sell Limit Order (Beta wants to SELL/WRITE a Call Option, strike: 0.03, size: 500, price: 130 gold)
    const sellOrderAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_order_1",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 130,
      timestamp: 1002,
    };

    // First vote: bob (Beta, 1/2 members, PENDING majority)
    res = multiAgentStep(state, { agentId: "bob", action: sellOrderAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_order_1"]).toBeUndefined();

    // Second vote: carol (Beta, 2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "carol", action: sellOrderAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const sellOrder = state.swfReinsuranceOptionLimitOrders?.["sell_order_1"];
    expect(sellOrder).toBeDefined();
    expect(sellOrder?.status).toBe("Open");
    expect(sellOrder?.orderType).toBe("sell");
    expect(sellOrder?.limitPrice).toBe(130);

    // 4. Run economy tick to match the limit orders
    // The buy limit is 150 (placed at t=1001), sell limit is 130 (placed at t=1002).
    // Because Buy order was earlier, the execution price is the maker's price = 150 gold.
    // Buyer (Alpha) pays 150, Seller (Beta) receives 150.
    state = tickEconomy(state, mockPack);

    // Verify both orders are now Filled
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_order_1"]?.status).toBe("Filled");
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_order_1"]?.status).toBe("Filled");

    // Verify gold transferred
    // Alpha was at 5000, now 5000 - 150 = 4850
    expect(state.syndicates?.["alpha"]?.warChest).toBe(4850);
    // Beta was at 3000, now 3000 + 150 = 3150
    expect(state.syndicates?.["beta"]?.warChest).toBe(3150);

    // Verify option contract created (holder: alpha, writer: beta)
    const optContract = state.swfReinsuranceOptionsContracts?.["opt_limit_1"];
    expect(optContract).toBeDefined();
    expect(optContract?.active).toBe(true);
    expect(optContract?.syndicateId).toBe("alpha"); // holder/buyer
    expect(optContract?.writerSyndicateId).toBe("beta"); // writer/seller
    expect(optContract?.strikePremiumRate).toBe(0.03);
    expect(optContract?.size).toBe(500);

    // 5. Secondary sale: Alpha now wants to SELL their existing options contract "opt_limit_1" on secondary market
    // Alpha submits a Sell order for contract "opt_limit_1" at minimum 180 gold
    const sellContractAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_contract_order",
      syndicateId: "alpha",
      orderType: "sell",
      contractId: "opt_limit_1", // target existing contract
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 180,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "player", action: sellContractAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: sellContractAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["sell_contract_order"]?.status).toBe("Open");

    // Beta wants to BUY the contract, submits a Buy order at maximum 200 gold
    const buyContractAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_contract_order",
      syndicateId: "beta",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 200,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: buyContractAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: buyContractAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["buy_contract_order"]?.status).toBe("Open");

    // Match them via economy tick
    // Maker is Sell order (180 gold, t=1003), earlier than Buy order (200 gold, t=1004).
    // So execution price is 180 gold.
    // Buyer (Beta) pays 180, Seller (Alpha) receives 180.
    state = tickEconomy(state, mockPack);

    // Verify Filled statuses
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_contract_order"]?.status).toBe("Filled");
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_contract_order"]?.status).toBe("Filled");

    // Verify gold transfer
    // Alpha was at 4850, now 4850 + 180 = 5030
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5030);
    // Beta was at 3150, now 3150 - 180 = 2970
    expect(state.syndicates?.["beta"]?.warChest).toBe(2970);

    // Verify option contract ownership transfer!
    // Holder is now Beta, writer is still Beta.
    const optContractAfter = state.swfReinsuranceOptionsContracts?.["opt_limit_1"];
    expect(optContractAfter?.syndicateId).toBe("beta");
    expect(optContractAfter?.writerSyndicateId).toBe("beta");

    // 6. Test cancellation of limit order
    // Beta submits a new Buy order
    const cancelableBuyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "cancelable_order",
      syndicateId: "beta",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 100,
      timestamp: 1005,
    };

    res = multiAgentStep(state, { agentId: "bob", action: cancelableBuyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: cancelableBuyAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["cancelable_order"]?.status).toBe("Open");

    // Vote to cancel
    const cancelAction = {
      type: "CANCEL_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "cancelable_order",
      syndicateId: "beta",
      timestamp: 1006,
    };

    // First cancel vote (PENDING)
    res = multiAgentStep(state, { agentId: "bob", action: cancelAction as any }, mockPack);
    state = res.state;
    expect(state.swfReinsuranceOptionLimitOrders?.["cancelable_order"]?.status).toBe("Open");

    // Second cancel vote (consensus reached)
    res = multiAgentStep(state, { agentId: "carol", action: cancelAction as any }, mockPack);
    state = res.state;
    expect(state.swfReinsuranceOptionLimitOrders?.["cancelable_order"]?.status).toBe("Cancelled");

    // 7. Rejections
    // Non-existent syndicate
    const badActionSyndicate = {
      ...buyOrderAction,
      orderId: "bad_order_1",
      syndicateId: "fake_syndicate",
    };
    res = multiAgentStep(state, { agentId: "player", action: badActionSyndicate as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not exist");

    // Insufficient gold for buy order
    const hugeBuyAction = {
      ...buyOrderAction,
      orderId: "bad_order_2",
      limitPrice: 99999, // exceeds warChest (5030)
    };
    res = multiAgentStep(state, { agentId: "player", action: hugeBuyAction as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not have enough gold");
  });
});

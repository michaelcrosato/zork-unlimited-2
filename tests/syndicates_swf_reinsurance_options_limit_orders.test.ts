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

  it("should track SWF reinsurance options order book volumes and dynamically scale margin requirements or trigger margin calls on dynamic buffer breach (AF-150)", () => {
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
        warChest: 100, // very small warChest to trigger buffer breach later!
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

    // Setup a margin account for beta
    state.marginAccounts = {
      beta: {
        syndicateId: "beta",
        collateral: 1000,
        leveragedCDSIds: [],
        leveragedSWFYieldCDOCDSIds: ["cds_1"], // has a leveraged CDS position to liquidate!
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // Setup a dummy active SWF CDS for beta so they have a maintenance requirement
    state.swfYieldCDOCDSs = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "beta",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        notionalValue: 1000,
        premiumRate: 0.05,
        active: true,
        timestamp: 1000,
      },
    };

    // Verify initial volume is zero
    let initialTick = tickEconomy(state, mockPack);
    expect(initialTick.swfReinsuranceOptionOrderBookVolumes?.["cdo_1_senior"]).toBe(0);

    // Initial maintenance requirement for beta:
    // 20% of CDS notional (1000) / swfLeverage (1.0) = 200 gold.
    // collateral is 1000, netEquity is 1000. So no margin call.

    // 2. Submit Buy Limit Order for Beta (Beta wants to buy an option, CDO: cdo_1, senior, strike: 0.03, size: 500, price: 80 gold)
    const buyOrderAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_order_1",
      syndicateId: "beta",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 80,
      timestamp: 1001,
    };

    // Alpha votes too
    let res = multiAgentStep(state, { agentId: "bob", action: buyOrderAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: buyOrderAction as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["buy_order_1"]?.status).toBe("Open");

    // 3. Tick economy to compute order book volumes & test scaling
    // Volume should now be 80 gold for cdo_1_senior.
    // Beta's open orders sum to 80 gold. Beta's warChest is 100 gold.
    // Since aggregatePendingValue (80) <= warChest (100), no scaling is applied.
    // Required dynamic buffer is 20% of 80 = 16 gold. Since warChest (100) >= 16, no dynamic buffer margin call.
    let tick1 = tickEconomy(state, mockPack);
    expect(tick1.swfReinsuranceOptionOrderBookVolumes?.["cdo_1_senior"]).toBe(80);
    expect(tick1.marginAccounts?.["beta"]?.collateral).toBe(1000); // still healthy
    expect(tick1.swfYieldCDOCDSs?.["cds_1"]?.active).toBe(true);

    // 4. Submit another Buy Limit Order for Beta to push exposure above warChest!
    // Second order for 30 gold. Total pending exposure will be 80 + 30 = 110 gold.
    // 110 gold exceeds Beta's warChest of 100 gold!
    const buyOrderAction2 = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_order_2",
      syndicateId: "beta",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 30,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: buyOrderAction2 as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: buyOrderAction2 as any }, mockPack);
    state = res.state;

    expect(state.swfReinsuranceOptionLimitOrders?.["buy_order_2"]?.status).toBe("Open");

    // 5. Tick economy. Total pending is 110. warChest is 100.
    // pendingScale = 110 / 100 = 1.1x.
    // scaled maintenance requirement = 200 * 1.1 = 220 gold.
    // Since collateral (1000) is still well above 220, no standard margin call is triggered, but scaling is active!
    // Required dynamic buffer is 20% of 110 = 22 gold. Since warChest (100) >= 22, no dynamic buffer margin call yet.
    let tick2 = tickEconomy(state, mockPack);
    expect(tick2.swfReinsuranceOptionOrderBookVolumes?.["cdo_1_senior"]).toBe(110);
    expect(tick2.swfYieldCDOCDSs?.["cds_1"]?.active).toBe(true);

    // 6. Test dynamic buffer breach margin call:
    // Let's set Beta's warChest to 10 gold (which is below the required dynamic buffer of 22 gold).
    state.syndicates!.beta.warChest = 10;

    // Tick economy: warChest (10) < requiredDynamicBuffer (22).
    // This must trigger a margin call and liquidate Beta's leveraged CDS position!
    let tick3 = tickEconomy(state, mockPack);
    expect(tick3.swfYieldCDOCDSs?.["cds_1"]?.active).toBe(false); // successfully liquidated!
    const marginCallJournal = tick3.journal.find(j => j.includes("fell below required dynamic buffer of 22 gold"));
    expect(marginCallJournal).toBeDefined();
  });

  it("should calculate order book depth metrics and scale reinsurance premiums dynamically based on supply/demand imbalance (AF-151)", () => {
    let state = createInitialState({
      seed: 11111,
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

    // Verify initially depth metrics are clean
    let tickInit = tickEconomy(state, mockPack);
    const depthInit = tickInit.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthInit).toBeDefined();
    expect(depthInit?.buyVolume).toBe(0);
    expect(depthInit?.sellVolume).toBe(0);
    expect(depthInit?.imbalance).toBe(0);
    expect(depthInit?.spreadAdjustment).toBe(1.0);
    expect(depthInit?.bidAskSpread).toBe(0);

    // 2. Submit Buy Limit Order (Alpha wants to BUY Call Option, Strike: 0.03, Size: 500, Price: 150 gold) -> BUY Demand
    const buyOrderAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_depth_order",
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

    let res = multiAgentStep(state, { agentId: "player", action: buyOrderAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyOrderAction as any }, mockPack);
    state = res.state;

    // Verify Buy Order is Open
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_depth_order"]?.status).toBe("Open");

    // 3. Tick economy to evaluate sell scarcity:
    // buyVolume = 150, sellVolume = 0. imbalance = 150.
    // spreadAdjustment = 1.0 + (150 / 150) * 0.5 = 1.5.
    let tickScarcity = tickEconomy(state, mockPack);
    const depthScarcity = tickScarcity.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthScarcity?.buyVolume).toBe(150);
    expect(depthScarcity?.sellVolume).toBe(0);
    expect(depthScarcity?.imbalance).toBe(150);
    expect(depthScarcity?.spreadAdjustment).toBe(1.5);
    expect(depthScarcity?.bidAskSpread).toBe(0);

    // Verify journal notification logged
    const scarcityLog = tickScarcity.journal.find(j => j.includes("[SWF Reinsurance Option Pricing Adjustment]") && j.includes("1.5000x") && j.includes("sell volume scarcity"));
    expect(scarcityLog).toBeDefined();

    // 4. Submit Sell Limit Order (Beta wants to SELL Call Option, Strike: 0.03, Size: 500, Price: 250 gold) -> SELL Supply
    // High price so no match happens immediately
    const sellOrderAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_depth_order",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 250,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: sellOrderAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellOrderAction as any }, mockPack);
    state = res.state;

    // Tick economy to evaluate coexistence (both buy and sell orders are open, no match because buy limit < sell limit):
    // buyVolume = 150, sellVolume = 250. imbalance = 150 - 250 = -100.
    // spreadAdjustment = 1.0 + (-100 / 400) * 0.5 = 1.0 - 0.125 = 0.875.
    // bidAskSpread = lowestSellPrice (250) - highestBuyPrice (150) = 100 gold.
    let tickCoexist = tickEconomy(state, mockPack);
    const depthCoexist = tickCoexist.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthCoexist?.buyVolume).toBe(150);
    expect(depthCoexist?.sellVolume).toBe(250);
    expect(depthCoexist?.imbalance).toBe(-100);
    expect(depthCoexist?.spreadAdjustment).toBe(0.875);
    expect(depthCoexist?.bidAskSpread).toBe(100);

    const coexistLog = tickCoexist.journal.find(j => j.includes("[SWF Reinsurance Option Pricing Adjustment]") && j.includes("0.8750x") && j.includes("sell volume abundance"));
    expect(coexistLog).toBeDefined();

    // 5. Verify that cancel/fill updates recalculate depths correctly
    // Let's cancel the buy order
    const cancelBuyAction = {
      type: "CANCEL_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_depth_order",
      syndicateId: "alpha",
      timestamp: 1003,
    };
    res = multiAgentStep(state, { agentId: "player", action: cancelBuyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: cancelBuyAction as any }, mockPack);
    state = res.state;

    // buyVolume = 0, sellVolume = 250. imbalance = -250.
    // spreadAdjustment = 1.0 + (-250 / 250) * 0.5 = 0.5.
    let tickCancel = tickEconomy(state, mockPack);
    const depthCancel = tickCancel.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthCancel?.buyVolume).toBe(0);
    expect(depthCancel?.sellVolume).toBe(250);
    expect(depthCancel?.imbalance).toBe(-250);
    expect(depthCancel?.spreadAdjustment).toBe(0.5);
    expect(depthCancel?.bidAskSpread).toBe(0);
  });

  it("should support partial fills, multiple partial fills, dynamic liquidity mining rewards, and consensus reward claiming (AF-153)", () => {
    let state = createInitialState({
      seed: 55555,
      start: "clearing",
      varsInit: { gold: 20000 },
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

    // 1. Partial Fill: Alpha (Buy, size 1000, limitPrice 300) and Beta (Sell, size 400, limitPrice 100)
    // Buy price per unit: 0.3. Sell price per unit: 0.25. Overlap exists!
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_1000",
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

    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_400",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 400,
      limitPrice: 100,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Verify open order status
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_1000"]?.status).toBe("Open");
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_400"]?.status).toBe("Open");

    // Match them via economy tick
    // Maker is Buy (timestamp 1001), price per unit is 0.3.
    // Matched size: 400.
    // Gold paid: 0.3 * 400 = 120 gold.
    state = tickEconomy(state, mockPack);

    // Verify Sell order is fully Filled
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_400"]?.status).toBe("Filled");
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_400"]?.size).toBe(0);

    // Verify Buy order is partially Filled and remains Open
    const remainingBuy = state.swfReinsuranceOptionLimitOrders?.["buy_1000"];
    expect(remainingBuy?.status).toBe("Open");
    expect(remainingBuy?.size).toBe(600);
    expect(remainingBuy?.limitPrice).toBe(180); // 300 * 600 / 1000 = 180

    // Verify gold transfer: 120 gold
    // Alpha: 10000 - 120 = 9880
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9880);
    // Beta: 10000 + 120 = 10120
    expect(state.syndicates?.["beta"]?.warChest).toBe(10120);

    // Verify option contract created (size 400)
    const optContract = state.swfReinsuranceOptionsContracts?.["opt_limit_1"];
    expect(optContract).toBeDefined();
    expect(optContract?.size).toBe(400);

    // 2. Multiple Partial Fills: Submit another Sell order (Beta, size 600, limitPrice 150 -> 0.25 per unit)
    // Matches the remaining 600 of buy_1000!
    const sellAction2 = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_600",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 600,
      limitPrice: 150,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "bob", action: sellAction2 as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction2 as any }, mockPack);
    state = res.state;

    // Match them
    state = tickEconomy(state, mockPack);

    // Both orders are now fully Filled!
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_1000"]?.status).toBe("Filled");
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_600"]?.status).toBe("Filled");

    // Gold paid: 0.3 * 600 = 180 gold.
    // Alpha: 9880 - 180 = 9700
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9700);
    // Beta: 10120 + 180 = 10300
    expect(state.syndicates?.["beta"]?.warChest).toBe(10300);

    // 3. Dynamic Liquidity Mining Rewards Accrual
    // Let's setup a margin account and reputation multiplier for Alpha to boost their rewards
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 5000,
        leveragedCDSIds: [],
        leveragedSWFYieldCDOCDSIds: [],
        leveragedTranchePositions: {},
        swfLiquidityMiningMultiplier: 2.0, // 2x multiplier
        timestamp: 1004,
      },
    };

    // Alpha submits an order that remains open to accrue rewards
    const buyAction2 = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_reward",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      limitPrice: 150,
      timestamp: 1005,
    };

    res = multiAgentStep(state, { agentId: "player", action: buyAction2 as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction2 as any }, mockPack);
    state = res.state;

    // Tick economy to accrue reward
    state = tickEconomy(state, mockPack);

    // Verify pending rewards accrued for Alpha
    const alphaPending = state.swfLiquidityMiningRewards?.["alpha"] ?? 0;
    expect(alphaPending).toBeGreaterThan(0);

    // 4. Consensus Reward Claiming
    const claimAction = {
      type: "CLAIM_REINSURANCE_LIQUIDITY_MINING_REWARDS",
      syndicateId: "alpha",
      timestamp: 1006,
    };

    // First vote (PENDING majority)
    res = multiAgentStep(state, { agentId: "player", action: claimAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfLiquidityMiningRewards?.["alpha"]).toBe(alphaPending); // not claimed yet

    // Second vote (consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: claimAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Pending rewards reset to 0
    expect(state.swfLiquidityMiningRewards?.["alpha"]).toBe(0);

    // Gold added to Alpha's warChest
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9700 + alphaPending);
  });
});


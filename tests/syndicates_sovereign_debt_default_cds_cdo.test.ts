import { describe, it, expect } from "vitest";
import { createInitialState, cloneStateWithoutHistory } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default Credit Default Swap (CDS) CDO Tranching Pools & Fractionalized Vaults (AF-230)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_test_pack",
      title: "CDS CDO Test Pack",
      start_room: "vault",
      vars_init: { gold: 50000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "vault",
        name: "Security Vault",
        description: "A heavily guarded vault room.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should create a CDS CDO pool, allow fractional investments, and handle default payouts and losses sequentially in the waterfall", () => {
    let state = createInitialState({
      seed: 98765,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice", "bob"],
    });

    // Initialize syndicates
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
        name: "Beta Syndicate (Default Target)",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    // Pre-populate three active CDS contracts owned by Alpha Syndicate (buyer)
    // Total notional = 1000 + 2000 = 3000
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1000,
      },
      cds_2: {
        cdsId: "cds_2",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 2000,
        status: "active",
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSPortfolios = {
      alpha: {
        syndicateId: "alpha",
        purchasedCDSIds: ["cds_1", "cds_2"],
        writtenCDSIds: [],
      },
    };

    // 1. Create the CDS CDO pool
    // Total notional = 3000
    // Tranches: Senior = 1500 (50%), Mezzanine = 900 (30%), Equity = 600 (20%)
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CREATE_CDS_CDO_POOL",
          cdoId: "cdo_pool_1",
          creatorSyndicateId: "alpha",
          cdsIds: ["cds_1", "cds_2"],
          timestamp: 1001,
        },
      },
      mockPack
    );

    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Assert pool properties
    const pool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool).toBeDefined();
    expect(pool?.totalNotional).toBe(3000);
    expect(pool?.creatorSyndicateId).toBe("alpha");
    expect(pool?.cdsIds).toEqual(["cds_1", "cds_2"]);

    // Assert tranche baseline distributions and 100% initial ownership by creator syndicate
    expect(pool?.tranches.senior.totalValue).toBe(1500);
    expect(pool?.tranches.senior.sharesOwned["alpha"]).toBe(1500);

    expect(pool?.tranches.mezzanine.totalValue).toBe(900);
    expect(pool?.tranches.mezzanine.sharesOwned["alpha"]).toBe(900);

    expect(pool?.tranches.equity.totalValue).toBe(600);
    expect(pool?.tranches.equity.sharesOwned["alpha"]).toBe(600);

    expect(pool?.fractionalizedVault.balance).toBe(0);

    // Verify individual CDS contract cdoId references were set
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.cdoId).toBe("cdo_pool_1");
    expect(state.sovereignDebtCDSContracts?.["cds_2"]?.cdoId).toBe("cdo_pool_1");

    // Verify they were removed from the individual portfolio
    expect(state.sovereignDebtCDSPortfolios?.["alpha"]?.purchasedCDSIds).toEqual([]);

    // 2. Allow another syndicate member (Alice) to invest in Mezzanine tranche
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "INVEST_IN_CDO_TRANCHE",
          cdoId: "cdo_pool_1",
          investorSyndicateId: "alpha",
          trancheId: "mezzanine",
          amount: 500,
          timestamp: 1002,
        },
      },
      mockPack
    );

    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify investment changes
    const updatedPool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(updatedPool?.fractionalizedVault.balance).toBe(500);
    expect(updatedPool?.tranches.mezzanine.totalValue).toBe(1400); // 900 + 500
    expect(updatedPool?.tranches.mezzanine.sharesOwned["alpha"]).toBe(1400);
    expect(state.syndicates?.alpha.warChest).toBe(9500); // 10000 - 500

    // 3. Simulating economy tick where premium payments are paid from pool reserves
    // Outstanding deflection fees = 0, enforcer heat = 0, grace period = false
    // Base premium:
    // cds_1 notional = 1000 => base premium = 50
    // cds_2 notional = 2000 => base premium = 100
    // Total premium loss to absorb = 150 gold
    // Equity absorbs first! (Equity totalValue = 600)
    // After tick: Equity totalValue should decrease by 150 => 450
    state = tickEconomy(state, mockPack);

    const poolAfterTick = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(poolAfterTick?.tranches.equity.totalValue).toBe(450); // 600 - 150
    expect(poolAfterTick?.tranches.equity.sharesOwned["alpha"]).toBe(450);

    // 4. Simulate a target default, triggering sequential priority payouts
    // Authorized unresolved default alert against Beta
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 3000,
        status: "authorized",
        resolved: false,
        proposerId: "player",
        timestamp: 1003,
      },
    };

    // Trigger economy tick to settle defaults and distribute payouts
    // Total default payout = 3000 gold
    // Senior tranche gets 50% = 1500 gold
    // Mezzanine tranche gets 30% = 900 gold (out of 3000)
    // Equity tranche gets the remaining = 600 gold
    // Since Alpha owns 100% of these tranches, Alpha receives all the payout gold!
    // Let's verify Alpha's warChest increases by 3000 gold!
    const alphaWarChestBefore = state.syndicates?.alpha.warChest ?? 0; // 9500 (since 150 was paid from CDO equity, not warChest directly!)
    state = tickEconomy(state, mockPack);

    // Verify settled status of contracts
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.status).toBe("settled");
    expect(state.sovereignDebtCDSContracts?.["cds_2"]?.status).toBe("settled");

    // Verify warChest increase
    expect(state.syndicates?.alpha.warChest).toBe(alphaWarChestBefore + 3000);

    // 5. Test Gossip merge/convergence
    const stateA = cloneStateWithoutHistory(state);
    const stateB = cloneStateWithoutHistory(state);

    // Introduce a new pool in B
    stateB.sovereignDebtCDSCDOPools = {
      ...stateB.sovereignDebtCDSCDOPools,
      cdo_pool_2: {
        cdoId: "cdo_pool_2",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_3"],
        totalNotional: 500,
        tranches: {
          senior: { trancheId: "senior", totalValue: 250, sharesOwned: { alpha: 250 }, timestamp: 1005 },
          mezzanine: { trancheId: "mezzanine", totalValue: 150, sharesOwned: { alpha: 150 }, timestamp: 1005 },
          equity: { trancheId: "equity", totalValue: 100, sharesOwned: { alpha: 100 }, timestamp: 1005 },
        },
        fractionalizedVault: { balance: 0, timestamp: 1005 },
        timestamp: 1005,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.sovereignDebtCDSCDOPools?.["cdo_pool_1"]).toBeDefined();
    expect(merged.sovereignDebtCDSCDOPools?.["cdo_pool_2"]).toBeDefined();
  });

  it("should list, bid, and execute secondary trading of CDS CDO tranche shares, calculate spreads, run arbitrage bots, and merge gossip", () => {
    let state = createInitialState({
      seed: 98765,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    // Initialize syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 20000,
      },
    };

    // Initialize CDO Pool where Alpha owns 1500 senior, 900 mezzanine, 600 equity tranche shares
    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 3000,
        tranches: {
          senior: { trancheId: "senior", totalValue: 1500, sharesOwned: { alpha: 1500 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", totalValue: 900, sharesOwned: { alpha: 900 }, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 600, sharesOwned: { alpha: 600 }, timestamp: 1000 },
        },
        fractionalizedVault: {
          balance: 0,
          timestamp: 1000,
        },
        timestamp: 1000,
      },
    };

    // 1. List 500 senior shares for sale by Alpha Syndicate (proposed by player)
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LIST_CDS_CDO_TRANCHE_FOR_SALE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          sellerSyndicateId: "alpha",
          sharesAmount: 500,
          askPrice: 400,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let listing = state.cdsCdoTrancheListings?.["cdo_pool_1_senior_alpha_500"];
    expect(listing).toBeDefined();
    expect(listing?.status).toBe("proposed");

    // Alice votes to list, passing the majority threshold of 2 members
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "LIST_CDS_CDO_TRANCHE_FOR_SALE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          sellerSyndicateId: "alpha",
          sharesAmount: 500,
          askPrice: 400,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    listing = state.cdsCdoTrancheListings?.["cdo_pool_1_senior_alpha_500"];
    expect(listing?.status).toBe("active");

    // 2. Propose a bid of 400 gold for 500 senior shares by Gamma Syndicate (proposed by bob)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "BID_ON_CDS_CDO_TRANCHE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          bidderSyndicateId: "gamma",
          sharesAmount: 500,
          bidPrice: 400,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let bid = state.cdsCdoTrancheBids?.["cdo_pool_1_senior_gamma_500"];
    expect(bid).toBeDefined();
    expect(bid?.status).toBe("proposed");

    // Charlie votes to bid, passing majority threshold of 2 members in Gamma
    stepRes = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "BID_ON_CDS_CDO_TRANCHE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          bidderSyndicateId: "gamma",
          sharesAmount: 500,
          bidPrice: 400,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    bid = state.cdsCdoTrancheBids?.["cdo_pool_1_senior_gamma_500"];
    expect(bid?.status).toBe("active");

    // 3. Simulating tickEconomy should match listing and bid, execute the trade
    state = tickEconomy(state, mockPack);

    // Verify trade completion and share balance adjustments
    const updatedListing = state.cdsCdoTrancheListings?.["cdo_pool_1_senior_alpha_500"];
    const updatedBid = state.cdsCdoTrancheBids?.["cdo_pool_1_senior_gamma_500"];
    expect(updatedListing?.status).toBe("completed");
    expect(updatedBid?.status).toBe("accepted");

    // Gold transfers: Gamma paid 400 gold to Alpha
    expect(state.syndicates?.alpha.warChest).toBe(10400); // 10000 + 400
    expect(state.syndicates?.gamma.warChest).toBe(19600); // 20000 - 400

    // Share transfers: Alpha: 1500 - 500 = 1000; Gamma: 500
    const pool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool?.tranches.senior.sharesOwned["alpha"]).toBe(1000);
    expect(pool?.tranches.senior.sharesOwned["gamma"]).toBe(500);

    // 4. Verify CDO Tranche Arbitrage Bot logic
    // Let's create an undervalued active listing: Gamma lists 200 senior shares for 50 gold (Fair Value is around 200 * 0.9 = 180 gold)
    state.cdsCdoTrancheListings!["cdo_pool_1_senior_gamma_200"] = {
      listingId: "cdo_pool_1_senior_gamma_200",
      cdoId: "cdo_pool_1",
      trancheId: "senior",
      sellerSyndicateId: "gamma",
      sharesAmount: 200,
      askPrice: 50,
      status: "active",
      timestamp: 1005,
      votes: {},
    };

    // economy tick should trigger arbitrage bot from Alpha (buyer) to place matching bid
    state = tickEconomy(state, mockPack);

    // matching bid should be placed by the bot and immediately matched/accepted
    const arbBid = state.cdsCdoTrancheBids?.["cdo_pool_1_senior_alpha_200_arb"];
    expect(arbBid).toBeDefined();
    expect(arbBid?.status).toBe("accepted");
    expect(arbBid?.bidPrice).toBe(50);

    // Verify completed listing and share balances
    const arbListing = state.cdsCdoTrancheListings?.["cdo_pool_1_senior_gamma_200"];
    expect(arbListing?.status).toBe("completed");
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.sharesOwned["alpha"]).toBe(1200); // 1000 + 200

    // 5. Test Gossip merge/convergence
    const stateA = cloneStateWithoutHistory(state);
    const stateB = cloneStateWithoutHistory(state);

    // Add a listing to B
    stateB.cdsCdoTrancheListings!["cdo_pool_1_mezzanine_alpha_100"] = {
      listingId: "cdo_pool_1_mezzanine_alpha_100",
      cdoId: "cdo_pool_1",
      trancheId: "mezzanine",
      sellerSyndicateId: "alpha",
      sharesAmount: 100,
      askPrice: 70,
      status: "active",
      timestamp: 1008,
      votes: {},
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.cdsCdoTrancheListings?.["cdo_pool_1_mezzanine_alpha_100"]).toBeDefined();
    expect(merged.cdsCdoTrancheListings?.["cdo_pool_1_senior_gamma_200"]).toBeDefined();
  });
});

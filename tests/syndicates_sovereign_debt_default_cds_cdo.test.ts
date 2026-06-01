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
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Multi-Syndicate Liquidity Injection Co-Investment Pools (AF-237)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_coinvestment_test_pack",
      title: "CDS CDO Co-investment Test Pack",
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

  it("should propose, vote, approve, join, and lock co-investment actions across multiple syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 2000,
        tranches: {
          senior: { trancheId: "senior", totalValue: 1000, sharesOwned: { alpha: 500 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: { alpha: 300 }, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 400, sharesOwned: { alpha: 200 }, timestamp: 1000 },
        },
        fractionalizedVault: { balance: 100, timestamp: 1000 },
        reserveFloor: 500, // stressed: 100 < 500
        timestamp: 1000,
      },
    };

    // 1. Propose co-investment target of 400 gold
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          cdoId: "cdo_pool_1",
          creatorSyndicateId: "alpha",
          targetAmount: 400,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let proposal = state.cdsCdoCoinvestmentProposals?.["prop_coinvest_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");

    // 2. Alice votes to approve (majority of 2 members of alpha passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          cdoId: "cdo_pool_1",
          creatorSyndicateId: "alpha",
          targetAmount: 400,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify proposal is approved
    proposal = state.cdsCdoCoinvestmentProposals?.["prop_coinvest_1"];
    expect(proposal?.status).toBe("approved");

    // 3. Alpha joins and pledges 300 gold
    stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "JOIN_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          syndicateId: "alpha",
          amount: 300,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.cdsCdoCoinvestmentProposals?.["prop_coinvest_1"]?.contributions?.["alpha"]).toBe(300);

    // 4. Beta joins and pledges 100 gold
    stepRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "JOIN_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          syndicateId: "beta",
          amount: 100,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.cdsCdoCoinvestmentProposals?.["prop_coinvest_1"]?.contributions?.["beta"]).toBe(100);

    // 5. Alpha locks contribution (deducts 300 from alpha war chest, adds to vault balance)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LOCK_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          syndicateId: "alpha",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9700); // 10000 - 300
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.fractionalizedVault.balance).toBe(400); // 100 + 300

    // 6. Beta locks contribution (deducts 100 from beta war chest, adds to vault balance)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "LOCK_CDO_COINVESTMENT",
          proposalId: "prop_coinvest_1",
          syndicateId: "beta",
          timestamp: 1006,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.syndicates?.["beta"]?.warChest).toBe(4900); // 5000 - 100
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.fractionalizedVault.balance).toBe(500); // 400 + 100
  });

  it("should calculate and allocate proportional reputation increases and partial deflection fee waivers on tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
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
        warChest: 9700,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 4900,
      },
    };

    state.factionRep = {
      alpha: 10,
      beta: 20,
    };

    state.outstandingDeflectionFees = {
      alpha: 100,
      beta: 50,
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 2000,
        tranches: {
          senior: { trancheId: "senior", totalValue: 1000, sharesOwned: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: {}, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 400, sharesOwned: {}, timestamp: 1000 },
        },
        fractionalizedVault: { balance: 500, timestamp: 1000 }, // restored to 500 (>= floor 500)
        reserveFloor: 500,
        timestamp: 1000,
      },
    };

    state.cdsCdoCoinvestmentProposals = {
      prop_coinvest_1: {
        proposalId: "prop_coinvest_1",
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        targetAmount: 400,
        status: "approved",
        timestamp: 1000,
        contributions: {
          alpha: 300,
          beta: 100,
        },
        lockedContributions: {
          alpha: true,
          beta: true,
        },
      },
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // 1. Verify status updated to executed
    expect(tickedState.cdsCdoCoinvestmentProposals?.["prop_coinvest_1"]?.status).toBe("executed");

    // 2. Verify proportional reputation boosts
    // Total locked = 400
    // Alpha: 300 / 400 = 75%. Boost = round(20 * 0.75) = 15. New rep = 10 + 15 = 25.
    // Beta: 100 / 400 = 25%. Boost = round(20 * 0.25) = 5. New rep = 20 + 5 = 25.
    expect(tickedState.factionRep?.["alpha"]).toBe(25);
    expect(tickedState.factionRep?.["beta"]).toBe(25);

    // 3. Verify partial fee waiver rates set
    expect(tickedState.cdsCdoPartialFeeWaivers?.["alpha"]).toBe(0.75);
    expect(tickedState.cdsCdoPartialFeeWaivers?.["beta"]).toBe(0.25);

    // 4. Verify partial outstanding deflection fee reductions
    // Alpha: 100 - round(100 * 0.75) = 25
    // Beta: 50 - round(50 * 0.25) = 38 (50 - 12.5 rounded = 50 - 13 = 37? Let's check math: 50 * 0.25 = 12.5, round(12.5) = 13. 50 - 13 = 37. Let's assert 37 or 38 based on Math.round(50 * 0.25)).
    expect(tickedState.outstandingDeflectionFees?.["alpha"]).toBe(25);
    expect(tickedState.outstandingDeflectionFees?.["beta"]).toBe(37);
  });

  it("should scale enforcer reputation penalty based on active partial fee waivers", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
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
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    state.outstandingDeflectionFees = {
      alpha: 25,
      beta: 37,
    };

    state.cdsCdoPartialFeeWaivers = {
      alpha: 0.75,
      beta: 0.25,
    };

    // Active sovereign debt defaults targeting both alpha and beta
    state.sovereignDebtDefaultAlerts = {
      alert_alpha: {
        proposalId: "alert_alpha",
        syndicateId: "system",
        targetSyndicateId: "alpha",
        sovereignDebtAmount: 1000,
        proposerId: "system",
        status: "authorized",
        resolved: false,
        timestamp: 1000,
      },
      alert_beta: {
        proposalId: "alert_beta",
        syndicateId: "system",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 1000,
        proposerId: "system",
        status: "authorized",
        resolved: false,
        timestamp: 1000,
      },
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Alpha penalty: 15 * (1 - 0.75) = 15 * 0.25 = 3.75, rounded to 4. New rep = 100 - 4 = 96.
    // Beta penalty: 15 * (1 - 0.25) = 15 * 0.75 = 11.25, rounded to 11. New rep = 100 - 11 = 89.
    expect(tickedState.factionRep?.["alpha"]).toBe(96);
    expect(tickedState.factionRep?.["beta"]).toBe(89);

    expect(tickedState.journal).toContain(
      `[Sovereign Debt Default Alert Penalty Reduced] Syndicate alpha reputation penalty reduced to -4 due to active CDO co-investment partial fee waiver (75% waiver).`
    );
    expect(tickedState.journal).toContain(
      `[Sovereign Debt Default Alert Penalty Reduced] Syndicate beta reputation penalty reduced to -11 due to active CDO co-investment partial fee waiver (25% waiver).`
    );
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Reserve Floor Breach Liquidity Injections (AF-236)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_liquidity_injection_test_pack",
      title: "CDS CDO Liquidity Injection Test Pack",
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

  it("should propose, vote, and approve LIQUIDITY_INJECTION_PROPOSAL action", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice"],
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

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 2000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 500 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 600,
            sharesOwned: { alpha: 300 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 200 },
            timestamp: 1000,
          },
        },
        fractionalizedVault: { balance: 100, timestamp: 1000 },
        reserveFloor: 500, // stressed because 100 < 500
        timestamp: 1000,
      },
    };

    // 1. Propose injecting 400 gold
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LIQUIDITY_INJECTION_PROPOSAL",
          proposalId: "prop_inject_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          amount: 400,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let proposal = state.cdsCdoLiquidityInjectionProposals?.["prop_inject_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");

    // 2. Alice votes to approve (majority of 2 members passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "LIQUIDITY_INJECTION_PROPOSAL",
          proposalId: "prop_inject_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          amount: 400,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify proposal is approved and executed
    proposal = state.cdsCdoLiquidityInjectionProposals?.["prop_inject_1"];
    expect(proposal?.status).toBe("approved");

    // Verify gold transfer
    const syndicate = state.syndicates?.["alpha"];
    expect(syndicate?.warChest).toBe(9600); // 10000 - 400

    const pool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool?.fractionalizedVault.balance).toBe(500); // 100 + 400
  });

  it("should grant reputation boosts and fee waivers on tickEconomy when pool balance is restored above reserve floor", () => {
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
        warChest: 9600,
      },
    };

    state.factionRep = {
      alpha: 10,
    };

    state.outstandingDeflectionFees = {
      alpha: 100,
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

    // Pre-approved proposal
    state.cdsCdoLiquidityInjectionProposals = {
      prop_inject_1: {
        proposalId: "prop_inject_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        amount: 400,
        status: "approved",
        timestamp: 1000,
      },
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // 1. Verify proposal status updated to executed
    const proposal = tickedState.cdsCdoLiquidityInjectionProposals?.["prop_inject_1"];
    expect(proposal?.status).toBe("executed");

    // 2. Verify reputation boost: 10 + 20 = 30
    expect(tickedState.factionRep?.["alpha"]).toBe(30);

    // 3. Verify fee waiver: cdsCdoFeeExemptions set to true and outstanding deflection fee cleared to 0
    expect(tickedState.cdsCdoFeeExemptions?.["alpha"]).toBe(true);
    expect(tickedState.outstandingDeflectionFees?.["alpha"]).toBe(0);

    // Verify journal message
    expect(tickedState.journal).toContain(
      `[CDO Liquidity Injection Restored] Syndicate alpha restored CDO cdo_pool_1 liquidity above reserve floor of 500 with injection of 400 gold. Granted +20 reputation and deflection fee exemption.`
    );
  });

  it("should bypass default enforcer penalty on tickEconomy for fee-exempt syndicates", () => {
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
    };

    state.factionRep = {
      alpha: 100,
    };

    state.outstandingDeflectionFees = {
      alpha: 150,
    };

    // Active sovereign debt default alert targeting alpha
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "system",
        targetSyndicateId: "alpha",
        sovereignDebtAmount: 1000,
        proposerId: "system",
        status: "authorized",
        resolved: false,
        timestamp: 1000,
      },
    };

    // Set alpha as fee exempt
    state.cdsCdoFeeExemptions = {
      alpha: true,
    };

    // Run economy tick
    const tickedState = tickEconomy(state, mockPack);

    // Verify no reputation penalty was applied (reputation stays at 100 instead of dropping by 15)
    expect(tickedState.factionRep?.["alpha"]).toBe(100);

    // Verify journal logs the enforcer penalty deferral
    expect(tickedState.journal).toContain(
      `[Sovereign Debt Default Alert Penalty Deferred] Syndicate alpha bypasses reputation penalty due to active CDO liquidity injection fee exemption.`
    );
  });
});

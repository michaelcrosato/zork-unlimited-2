import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("CDS CDO Co-Investment Yield Reinvestment & Compound Boost (AF-239)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reinvest_test_pack",
      title: "Reinvest Test Pack",
      start_room: "vault",
      vars_init: { gold: 100000 },
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

  it("should propose a yield reinvestment share, pass voting, and correctly reinvest pro-rata to co-investing syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 100000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    // Setup syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 20000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 20000,
      },
    };

    // Mock active CDS contract
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 5000,
        status: "active",
        cdoId: "cdo_pool_1",
        timestamp: 1000,
      },
    };

    // Populate CDS CDO Pool
    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 5000,
        fractionalizedVault: {
          balance: 5000,
          timestamp: 1000,
        },
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 3000,
            marginCollateral: { alpha: 3000 },
            sharesOwned: { alpha: 3000 },
            autocallTriggerLevel: 200,
            autocallCoupon: 1000,
            autocallPaid: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 1500,
            marginCollateral: { alpha: 1500 },
            sharesOwned: { alpha: 1500 },
            autocallTriggerLevel: 100,
            autocallCoupon: 500,
            autocallPaid: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 500,
            marginCollateral: { alpha: 500 },
            sharesOwned: { alpha: 500 },
            autocallTriggerLevel: 50,
            autocallCoupon: 200,
            autocallPaid: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Pre-populate executed co-investment proposal with 40% yield share active
    state.cdsCdoCoinvestmentProposals = {
      coinvest_1: {
        proposalId: "coinvest_1",
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        targetAmount: 5000,
        status: "executed",
        votes: {},
        contributions: {
          alpha: 3000,
          beta: 2000,
        },
        lockedContributions: {
          alpha: true,
          beta: true,
        },
        yieldCompensationShare: 40,
        historicalYieldPayouts: {},
        timestamp: 1000,
      },
    };

    // 1. Propose yield reinvestment share of 50%
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_REINVESTMENT",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldReinvestmentShare: 50,
          timestamp: 1100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // First vote is recorded, proposal is "proposed"
    let proposalIdKey = "coinvest_1_reinvest_50";
    expect(state.cdsCdoCoinvestmentYieldReinvestmentProposals?.[proposalIdKey]).toBeDefined();
    expect(state.cdsCdoCoinvestmentYieldReinvestmentProposals?.[proposalIdKey].status).toBe("proposed");

    // 2. Second member of Alpha ("alice") votes to approve the reinvestment proposal
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_REINVESTMENT",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldReinvestmentShare: 50,
          timestamp: 1150,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal should now be "approved"
    expect(state.cdsCdoCoinvestmentYieldReinvestmentProposals?.[proposalIdKey].status).toBe("approved");

    // The main coinvestment proposal's yieldReinvestmentShare should be updated to 50%
    expect(state.cdsCdoCoinvestmentProposals?.coinvest_1.yieldReinvestmentShare).toBe(50);

    // 3. Tick economy to trigger the automatic autocallable yield payout and check compounding
    const finalState = tickEconomy(state, mockPack);

    // Initial warChests were 20000 for alpha and beta.
    // Total diverted: 40% of (1000 + 500 + 200) = 680 gold.
    // Remaining finalPayout to alpha warChest: 60% of 1700 = 1020 gold.
    // Diverted yield share is split pro-rata (60% to alpha, 40% to beta):
    //   Alpha: 60% of 680 = 408 gold yield compensation.
    //   Beta: 40% of 680 = 272 gold yield compensation.
    // Yield Reinvestment Share is 50%:
    //   Alpha reinvests: 50% of 408 = 204 gold. Paid out: 204 gold.
    //   Beta reinvests: 50% of 272 = 136 gold. Paid out: 136 gold.
    // Final warChests:
    //   Alpha: 20000 + 1020 + 204 = 21224 gold
    //   Beta: 20000 + 136 = 20136 gold
    expect(finalState.syndicates!.alpha.warChest).toBe(21224);
    expect(finalState.syndicates!.beta.warChest).toBe(20136);

    // Verify historical yield payouts recorded in the proposal matches the paid-out portion (204 for alpha, 136 for beta)
    const updatedCoinvest = finalState.cdsCdoCoinvestmentProposals?.coinvest_1;
    expect(updatedCoinvest?.historicalYieldPayouts?.alpha).toBe(204);
    expect(updatedCoinvest?.historicalYieldPayouts?.beta).toBe(136);

    // Verify global tracking record for payouts is populated with paid out portion
    expect(finalState.cdsCdoCoinvestmentYieldPayouts?.["coinvest_1_alpha"]).toBe(204);
    expect(finalState.cdsCdoCoinvestmentYieldPayouts?.["coinvest_1_beta"]).toBe(136);

    // Verify historical yield reinvestments recorded in the proposal (204 for alpha, 136 for beta)
    expect(updatedCoinvest?.historicalYieldReinvestments?.alpha).toBe(204);
    expect(updatedCoinvest?.historicalYieldReinvestments?.beta).toBe(136);

    // Verify global tracking record for reinvestments is populated
    expect(finalState.cdsCdoCoinvestmentYieldReinvestments?.["coinvest_1_alpha"]).toBe(204);
    expect(finalState.cdsCdoCoinvestmentYieldReinvestments?.["coinvest_1_beta"]).toBe(136);

    // Verify syndicate contributions are boosted/compounded
    // Alpha contribution: 3000 initial + 204 reinvested = 3204
    // Beta contribution: 2000 initial + 136 reinvested = 2136
    expect(updatedCoinvest?.contributions?.alpha).toBe(3204);
    expect(updatedCoinvest?.contributions?.beta).toBe(2136);

    // Verify CDO pool fractionalized vault balance has increased by the reinvested amounts (total 340 gold reinvested)
    const pool = finalState.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.fractionalizedVault.balance).toBe(5340);
  });
});

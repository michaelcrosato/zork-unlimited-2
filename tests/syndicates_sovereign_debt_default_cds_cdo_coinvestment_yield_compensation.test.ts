import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("CDS CDO Co-Investment Yield Compensation & Pro-Rata Distribution (AF-238)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_test_pack",
      title: "Yield Test Pack",
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

  it("should propose a yield share, pass voting, and correctly divert automatic autocall payouts pro-rata to co-investing syndicates", () => {
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

    // Pre-populate executed co-investment proposal
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
        historicalYieldPayouts: {},
        timestamp: 1000,
      },
    };

    // Verify initial warChests
    expect(state.syndicates!.alpha.warChest).toBe(20000);
    expect(state.syndicates!.beta.warChest).toBe(20000);

    // 1. Propose yield compensation share of 40% (needs voting by creator syndicate "alpha" members)
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_SHARE",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldCompensationShare: 40,
          timestamp: 1100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // First vote is recorded, proposal is "proposed" as it needs majority of members (needs 2/2 or >1/2 of 2 members, so both players)
    let proposalIdKey = "coinvest_1_yield_40";
    expect(state.cdsCdoCoinvestmentYieldShareProposals?.[proposalIdKey]).toBeDefined();
    expect(state.cdsCdoCoinvestmentYieldShareProposals?.[proposalIdKey].status).toBe("proposed");

    // 2. Second member of Alpha ("alice") votes to approve the yield share proposal
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_SHARE",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldCompensationShare: 40,
          timestamp: 1150,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal should now be "approved"
    expect(state.cdsCdoCoinvestmentYieldShareProposals?.[proposalIdKey].status).toBe("approved");

    // The main coinvestment proposal's yieldCompensationShare should be updated to 40%
    expect(state.cdsCdoCoinvestmentProposals?.coinvest_1.yieldCompensationShare).toBe(40);

    // 3. Tick economy to trigger the senior tranche automatic autocallable yield payout
    // totalDefaults (0) < triggerLevel (200) => should trigger autocall!
    // Tranche coupon is 1000 gold.
    // Diverted yield share = 40% => 400 gold is diverted.
    // Remaining payout = 600 gold goes to Senior tranche owner ("alpha").
    // Co-investment ratio:
    //   Total locked = 3000 + 2000 = 5000 gold.
    //   Alpha: 3000 / 5000 = 60% => receives 60% of 400 = 240 gold.
    //   Beta: 2000 / 5000 = 40% => receives 40% of 400 = 160 gold.
    // Expected final Alpha warChest = 20000 + 600 (remaining payout) + 240 (diverted yield) = 20840 gold.
    // Expected final Beta warChest = 20000 + 160 (diverted yield) = 20160 gold.

    const finalState = tickEconomy(state, mockPack);

    // Alpha warChest: 20000 + 840 (senior) + 420 (mezzanine) + 168 (equity) = 21428 gold
    expect(finalState.syndicates!.alpha.warChest).toBe(21428);
    // Beta warChest: 20000 + 160 (senior) + 80 (mezzanine) + 32 (equity) = 20272 gold
    expect(finalState.syndicates!.beta.warChest).toBe(20272);

    // Verify historical yield payouts recorded in the proposal (total diverted: 240 + 120 + 48 = 408 for alpha, 160 + 80 + 32 = 272 for beta)
    const updatedCoinvest = finalState.cdsCdoCoinvestmentProposals?.coinvest_1;
    expect(updatedCoinvest?.historicalYieldPayouts?.alpha).toBe(408);
    expect(updatedCoinvest?.historicalYieldPayouts?.beta).toBe(272);

    // Verify global tracking record is populated
    expect(finalState.cdsCdoCoinvestmentYieldPayouts?.["coinvest_1_alpha"]).toBe(408);
    expect(finalState.cdsCdoCoinvestmentYieldPayouts?.["coinvest_1_beta"]).toBe(272);
  });
});

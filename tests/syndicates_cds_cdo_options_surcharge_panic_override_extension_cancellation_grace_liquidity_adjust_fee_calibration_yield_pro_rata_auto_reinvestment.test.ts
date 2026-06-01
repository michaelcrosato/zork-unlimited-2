import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate CDO Options Panic Override Threshold Adjust Fee Calibration Yield Pro-Rata Auto-Reinvestment (AF-262)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_options_yield_pr_reinvestment_pack",
      title: "CDO Options Yield Pro-Rata Reinvestment Test Pack",
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
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and authorizing yield pro-rata auto-reinvestments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_1: {
        cdoId: "cdo_1",
        creatorSyndicateId: "alpha",
        cdsIds: [],
        totalNotional: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 5000,
            sharesOwned: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 3000,
            sharesOwned: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 2000,
            sharesOwned: {},
            timestamp: 1000,
          },
        },
        fractionalizedVault: {
          balance: 1000,
          timestamp: 1000,
        },
        timestamp: 1000,
      },
    };

    // 1. Propose auto-reinvestment configuration
    const proposeReinvest = {
      type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT",
      proposalId: "reinvest_prop_1",
      syndicateId: "alpha",
      cdoId: "cdo_1",
      autoReinvestThreshold: 300,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeReinvest as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals?.["reinvest_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.autoReinvestThreshold).toBe(300);

    // Active autoReinvestThreshold is still undefined because consensus is not yet reached
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.autoReinvestThreshold).toBeUndefined();

    // 2. Alice votes to authorize the auto-reinvestment proposal
    const voteAlice = {
      type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT",
      proposalId: "reinvest_prop_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAlice as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals?.["reinvest_prop_1"]?.status).toBe("authorized");

    // Active pool threshold is now updated successfully to 300!
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.autoReinvestThreshold).toBe(300);
  });

  it("should accumulate proposal and vote fees from grace liquidity adjustment and trigger epoch auto-reinvestment", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_1: {
        cdoId: "cdo_1",
        creatorSyndicateId: "alpha",
        cdsIds: [],
        totalNotional: 10000,
        tranches: {
          senior: { trancheId: "senior", totalValue: 5000, sharesOwned: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", totalValue: 3000, sharesOwned: {}, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 2000, sharesOwned: {}, timestamp: 1000 },
        },
        fractionalizedVault: {
          balance: 1000,
          timestamp: 1000,
        },
        reserveFloor: 500,
        autoReinvestThreshold: 600, // Authorized threshold
        timestamp: 1000,
      },
    };

    // Setup a mock cancel proposal to satisfy targetGraceLiquidityProposal exists check
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals = {
      target_grace_1: {
        proposalId: "target_grace_1",
        cdoId: "cdo_1",
        syndicateId: "alpha",
        targetProposalId: "canc_1",
        minLiquidityThreshold: 100,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      } as any
    };

    // Fees: ProposalFee = 500, VoteFee = 100
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee = 500;
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee = 100;

    // 1. Propose minimum liquidity threshold adjustment
    const proposeAdjust = {
      type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adj_1",
      syndicateId: "alpha",
      cdoId: "cdo_1",
      targetProposalId: "target_grace_1",
      newMinLiquidityThreshold: 120,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAdjust as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal fee is charged from the war chest: 10000 - 500 = 9500
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9500);

    // Dynamic fee routing: 500 gold is routed to accumulatedReinvestmentPool on cdo_1 pool
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.accumulatedReinvestmentPool).toBe(500);

    // 2. Bob votes on the minimum liquidity threshold adjustment
    const voteBob = {
      type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adj_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote fee is charged from the war chest: 9500 - 100 = 9400
    expect(state.syndicates?.["alpha"]?.warChest).toBe(9400);

    // Vote fee of 100 is accumulated: 500 + 100 = 600
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.accumulatedReinvestmentPool).toBe(600);

    // 3. Tick economy on epoch boundary (step % 5 === 0)
    // Current step in state: res.state.step is updated inside multiAgentStep. Let's force it to a % 5 boundary.
    state.step = 5;
    state = tickEconomy(state, mockPack);

    // Since accumulatedReinvestmentPool (600) >= autoReinvestThreshold (600), auto-reinvestment triggers!
    // CDO Fractionalized Vault balance grows: 1000 + 600 = 1600
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.fractionalizedVault.balance).toBe(1600);
    // accumulatedReinvestmentPool is reset to 0
    expect(state.sovereignDebtCDSCDOPools?.["cdo_1"]?.accumulatedReinvestmentPool).toBe(0);

    expect(state.journal).toContain(
      "[CDS CDO Yield-Pro-Rata Auto-Reinvestment] Automatically reinvested 600 gold of accumulated calibration fees into CDO cdo_1 stability pool to maintain liquidity buffers above the floor."
    );
  });
});

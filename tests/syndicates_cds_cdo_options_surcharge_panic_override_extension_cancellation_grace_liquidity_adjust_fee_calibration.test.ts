import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate CDO Options Panic Override Threshold Adjust Fee Calibration (AF-261)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_options_fee_calibration_pack",
      title: "CDO Options Fee Calibration Test Pack",
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

  it("should support proposing, voting, and authorizing dynamic fee calibrations", () => {
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
        },
        fractionalizedVault: {
          balance: 0,
          timestamp: 1000,
        },
        timestamp: 1000,
      },
    };

    // Assert baseline fees
    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee).toBe(500);
    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee).toBe(100);

    // 1. Propose fee calibration proposal
    const proposeCalibration = {
      type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION",
      proposalId: "cal_1",
      syndicateId: "alpha",
      cdoId: "cdo_1",
      newProposalFee: 800,
      newVoteFee: 250,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeCalibration as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals?.["cal_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.newProposalFee).toBe(800);
    expect(prop?.newVoteFee).toBe(250);

    // Proposer vote is registered automatically as true
    const voterRecord = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes?.["cal_1"]?.["player"];
    expect(voterRecord?.vote).toBe(true);

    // Active fees are still baseline because consensus is not yet reached
    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee).toBe(500);

    // 2. Alice votes to authorize the fee calibration (2/3 majority reached)
    const voteAlice = {
      type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION",
      proposalId: "cal_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAlice as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals?.["cal_1"]?.status).toBe("authorized");

    // Active fees are now successfully updated to the calibrated values!
    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee).toBe(800);
    expect(state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee).toBe(250);
  });

  it("should enforce and dynamically scale proposal/vote costs and deduct from the syndicate war chest", () => {
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
        warChest: 1000, // Small war chest
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
        },
        fractionalizedVault: {
          balance: 0,
          timestamp: 1000,
        },
        timestamp: 1000,
      },
    };

    // Setup an authorized cancellation grace liquidity target proposal
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals = {
      liq_1: {
        proposalId: "liq_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        targetProposalId: "cancel_1",
        minLiquidityThreshold: 5000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Calibrate the fees to high values: Proposal = 800, Vote = 250
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee = 800;
    state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee = 250;

    // 1. Propose threshold adjustment (costs 800 gold)
    const proposeAdjust = {
      type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      syndicateId: "alpha",
      cdoId: "cdo_1",
      targetProposalId: "liq_1",
      newMinLiquidityThreshold: 6000,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAdjust as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // War chest should be 1000 - 800 = 200 gold!
    expect(state.syndicates?.["alpha"]?.warChest).toBe(200);

    // 2. Bob tries to vote on the proposal (requires 250 gold, but war chest only has 200)
    const voteBob = {
      type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST",
      proposalId: "adjust_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteBob as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Insufficient gold in syndicate war chest to vote on liquidity adjustment");

    // Give syndicate more gold (e.g. 500 more)
    if (state.syndicates) {
      state.syndicates["alpha"].warChest = 700;
    }

    // Bob votes again
    res = multiAgentStep(state, { agentId: "bob", action: voteBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // War chest should be 700 - 250 = 450 gold!
    expect(state.syndicates?.["alpha"]?.warChest).toBe(450);
  });

  it("should merge fee calibration proposals and votes correctly via Gossip mesh node convergence", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    stateA.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    stateA.sovereignDebtCDSCDOPools = {
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
        },
        fractionalizedVault: {
          balance: 0,
          timestamp: 1000,
        },
        timestamp: 1000,
      },
    };

    let stateB = JSON.parse(JSON.stringify(stateA));

    // Propose on Node A
    const proposeCalibration = {
      type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION",
      proposalId: "cal_1",
      syndicateId: "alpha",
      cdoId: "cdo_1",
      newProposalFee: 650,
      newVoteFee: 150,
      timestamp: 1001,
    };

    let resA = multiAgentStep(stateA, { agentId: "player", action: proposeCalibration as any }, mockPack);
    expect(resA.ok).toBe(true);
    stateA = resA.state;

    // Vote on Node B
    // Copy the proposal structure manually to B before voting
    stateB.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals = {
      cal_1: {
        proposalId: "cal_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        newProposalFee: 650,
        newVoteFee: 150,
        status: "proposed",
        proposerId: "player",
        timestamp: 1001,
      }
    };
    stateB.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes = {
      cal_1: {
        player: {
          proposalId: "cal_1",
          vote: true,
          timestamp: 1001,
        }
      }
    };

    const voteAlice = {
      type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION",
      proposalId: "cal_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1002,
    };

    let resB = multiAgentStep(stateB, { agentId: "alice", action: voteAlice as any }, mockPack);
    expect(resB.ok).toBe(true);
    stateB = resB.state;

    // Merge Node A and Node B
    const mergedState = mergeMonotonicStateFields(stateA, stateB);

    // Active fees must converge to the authorized proposal values!
    expect(mergedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee).toBe(650);
    expect(mergedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee).toBe(150);
  });
});

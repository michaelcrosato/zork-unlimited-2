import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("SWF Reinsurance Option Grace Liquidity Adjust Fee Calibration Yield-Pro-Rata Auto-Reinvestment (AF-201)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinvestment_pack",
      title: "Reinvestment Test Pack",
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

  it("should propose and vote on auto-reinvestment threshold, authorising it and setting it in the margin policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
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

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: { alpha: 1000 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionMarginPolicies = {
      "cdo_1_senior": {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.1,
        penaltyRate: 0.05,
        timestamp: 1000,
      },
    };

    // Propose auto-reinvestment threshold of 1000
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT" as any,
          proposalId: "reinvest_prop_1",
          syndicateId: "alpha",
          swfYieldCdoId: "cdo_1",
          trancheId: "senior",
          autoReinvestThreshold: 1000,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    const prop = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals?.["reinvest_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.autoReinvestThreshold).toBe(1000);
    expect(prop?.status).toBe("proposed");

    // Let Alice vote to authorize the proposal to reach majority
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT" as any,
          proposalId: "reinvest_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    const propAfterVote = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals?.["reinvest_prop_1"];
    expect(propAfterVote?.status).toBe("authorized");

    // The threshold should be reflected in the margin policy
    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy?.autoReinvestThreshold).toBe(1000);
  });

  it("should pool gold fees from grace liquidity adjust proposals and votes into the margin policy's accumulated pool", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
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

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: { alpha: 1000 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals = {
      "any_prop": {
        proposalId: "any_prop",
        targetProposalId: "any_prop",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        minLiquidityThreshold: 2000,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Proposals fee: 500, Votes fee: 100
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee = 500;
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee = 100;

    // Player proposes grace liquidity adjust
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST" as any,
          proposalId: "grace_prop_1",
          syndicateId: "alpha",
          swfYieldCdoId: "cdo_1",
          trancheId: "senior",
          targetProposalId: "any_prop",
          newMinLiquidityThreshold: 5000,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    // Check pool increment: Proposal fee was 500, so pool is 500
    let policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy?.accumulatedFeeReinvestmentPool).toBe(500);

    // Alice votes on it
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST" as any,
          proposalId: "grace_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Check pool increment: Vote fee was 100, so pool is now 600
    policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy?.accumulatedFeeReinvestmentPool).toBe(600);
  });

  it("should trigger auto-reinvestment on epoch boundary step % 5 === 0 when accumulated pool reaches threshold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
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

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: { alpha: 1000 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Configure margin policy with autoReinvestThreshold = 500, accumulatedFeeReinvestmentPool = 600
    state.swfReinsuranceOptionMarginPolicies = {
      "cdo_1_senior": {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.1,
        penaltyRate: 0.05,
        timestamp: 1000,
        autoReinvestThreshold: 500,
        accumulatedFeeReinvestmentPool: 600,
      },
    };

    // Simulate epoch boundary (step % 5 === 0)
    state.step = 10;

    const afterState = tickEconomy(state, mockPack);

    // Verify CDO tranche shares increased by 600
    const tranche = afterState.swfYieldCDOs?.["cdo_1"]?.tranches?.senior;
    expect(tranche?.totalShares).toBe(1600);
    expect(tranche?.ownership?.alpha).toBe(1600);

    // Verify pool is reset to 0
    const policy = afterState.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy?.accumulatedFeeReinvestmentPool).toBe(0);

    // Verify journal logged the event
    expect(afterState.journal).toContain(
      "[SWF Option Margin Fee Reinvestment] Reinvested 600 accumulated gold fees back into SWF Yield CDO cdo_1 tranche senior yield pool on epoch boundary (increased total shares by 600)."
    );
  });
});

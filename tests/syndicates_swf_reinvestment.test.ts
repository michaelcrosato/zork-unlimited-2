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

  it("should propose and vote on auto-reinvestment governance cap, authorizing it and setting maxAutoReinvestYieldCap", () => {
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

    // Propose cap of 1000
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT_GOVERNANCE_CAP" as any,
          proposalId: "cap_prop_1",
          syndicateId: "alpha",
          maxAutoReinvestYieldCap: 1000,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    const prop = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals?.["cap_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.maxAutoReinvestYieldCap).toBe(1000);
    expect(prop?.status).toBe("proposed");

    // Vote to authorize
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT_GOVERNANCE_CAP" as any,
          proposalId: "cap_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    const propAfter = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals?.["cap_prop_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(state.maxAutoReinvestYieldCap).toBe(1000);
  });

  it("should clamp auto-reinvested amount to maxAutoReinvestYieldCap and trigger audit logging on breach", () => {
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

    // Configure cap = 400
    state.maxAutoReinvestYieldCap = 400;

    // Configure margin policy with accumulatedFeeReinvestmentPool = 600, autoReinvestThreshold = 500
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

    state.step = 10; // Epoch boundary

    const afterState = tickEconomy(state, mockPack);

    // Verify CDO tranche shares increased by 400 (clamped)
    const tranche = afterState.swfYieldCDOs?.["cdo_1"]?.tranches?.senior;
    expect(tranche?.totalShares).toBe(1400);
    expect(tranche?.ownership?.alpha).toBe(1400);

    // Verify pool reset to 0
    const policy = afterState.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy?.accumulatedFeeReinvestmentPool).toBe(0);

    // Verify audit logs and journal contain breach logging
    expect(afterState.auditLogs).toContain(
      "[REINVESTMENT_AUDIT_BREACH] Syndicate SWF Reinsurance auto-reinvestment breach detected. Attempted: 600 gold, Cap: 400 gold. Clamped to cap."
    );
    expect(afterState.journal).toContain(
      "[REINVESTMENT_AUDIT_BREACH] Audit triggered! Attempted reinvestment of 600 gold breached the authorized governance cap of 400 gold. Clamped to cap."
    );
  });

  it("should propose and vote on governance cap breach slashing rate, authorizing it and setting breachSlashingRates for a syndicate", () => {
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

    // Propose breach slashing rate of 15% (0.15)
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASHING" as any,
          proposalId: "slashing_prop_1",
          syndicateId: "alpha",
          slashingRate: 0.15,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    const prop = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals?.["slashing_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.slashingRate).toBe(0.15);
    expect(prop?.status).toBe("proposed");

    // Vote to authorize
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE_LIQUIDITY_ADJUST_FEE_CALIBRATION_YIELD_PRO_RATA_AUTO_REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASHING" as any,
          proposalId: "slashing_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    const propAfter = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals?.["slashing_prop_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(state.breachSlashingRates?.["alpha"]).toBe(0.15);
  });

  it("should slash CDO tranche shares proportionally based on breachSlashingRates and breachCount when a cap breach occurs", () => {
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

    // Configure cap = 400
    state.maxAutoReinvestYieldCap = 400;

    // Configure base slashing rate to 10% (0.10) for alpha
    if (!state.breachSlashingRates) state.breachSlashingRates = {};
    state.breachSlashingRates["alpha"] = 0.10;

    // Configure breach count to 2
    if (!state.reinvestmentBreachCount) state.reinvestmentBreachCount = {};
    state.reinvestmentBreachCount["alpha"] = 2; // Next breach will increment this to 3, so effective slashing rate = 3 * 10% = 30%!

    // Configure margin policy with accumulatedFeeReinvestmentPool = 600, autoReinvestThreshold = 500
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

    state.step = 10; // Epoch boundary

    const afterState = tickEconomy(state, mockPack);

    // Initial shares = 1000.
    // Effective slashing rate = 0.10 * (2 + 1) = 0.30 (30%).
    // Slashed shares = Math.floor(1000 * 0.30) = 300 shares.
    // Remaining shares before reinvestment = 1000 - 300 = 700 shares.
    // Reinvested amount clamped to cap = 400 shares.
    // Final total shares should be 700 + 400 = 1100 shares!
    const tranche = afterState.swfYieldCDOs?.["cdo_1"]?.tranches?.senior;
    expect(tranche?.totalShares).toBe(1100);
    expect(tranche?.ownership?.alpha).toBe(1100);

    // Verify breach count incremented to 3
    expect(afterState.reinvestmentBreachCount?.["alpha"]).toBe(3);

    // Verify audit logs and journal contain breach and slashing logging
    expect(afterState.auditLogs).toContain(
      "[REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASH] Syndicate alpha cap breach count: 3. Slashed 300 shares from CDO cdo_1 tranche senior (Slashing Rate: 30.0%)."
    );
    expect(afterState.journal).toContain(
      "[REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASH] Syndicate alpha has consistently breached the reinvestment cap (Breach Count: 3). Slashed 300 shares from CDO cdo_1 tranche senior at an effective slashing rate of 30.0%."
    );
  });

  it("should track slashed CDO tranche shares and perform rehabilitation and credit score recovery on successful consensus", () => {
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
            totalShares: 700,
            ownership: { alpha: 700 },
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

    // Configure initial slashed tracking
    state.slashedCDOTrancheShares = {
      alpha: {
        cdo_1: {
          senior: 300,
        },
      },
    };

    // Set initial credit ratings for syndicate
    state.creditRatings = {
      alpha: 80,
    };

    // Propose rehabilitation: contribution of 500 gold to restore 150 shares (exactly 50% of 300)
    // Proposal fee is 200 gold.
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_BREACH_REHAB",
          proposalId: "rehab_prop_1",
          syndicateId: "alpha",
          cdoId: "cdo_1",
          trancheId: "senior",
          goldContribution: 500,
          rehabSharesToRestore: 150,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    // Verify proposal exists
    const prop = state.reinvestmentBreachRehabProposals?.["rehab_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.goldContribution).toBe(500);
    expect(prop?.rehabSharesToRestore).toBe(150);
    expect(prop?.status).toBe("proposed");

    // Proposer auto-voted true
    expect(prop?.votes?.["player"]?.vote).toBe(true);

    // Verify proposal fee deducted: 10000 - 200 = 9800
    expect(state.syndicates?.alpha?.warChest).toBe(9800);

    // Try to propose a duplicate proposal, should fail
    const duplicateResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_BREACH_REHAB",
          proposalId: "rehab_prop_1",
          syndicateId: "alpha",
          cdoId: "cdo_1",
          trancheId: "senior",
          goldContribution: 500,
          rehabSharesToRestore: 150,
          timestamp: 1011,
        } as any,
      },
      mockPack
    );
    expect(duplicateResult.ok).toBe(false);

    // Vote to authorize by alice (costs 50 gold)
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_BREACH_REHAB",
          syndicateId: "alpha",
          proposalId: "rehab_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    const propAfter = state.reinvestmentBreachRehabProposals?.["rehab_prop_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(propAfter?.resolved).toBe(true);

    // Verify costs deducted: warChest had 9800.
    // Vote fee: 50 gold. Proposer goldContribution: 500 gold.
    // Total warChest after resolution = 9800 - 50 - 500 = 9250 gold!
    expect(state.syndicates?.alpha?.warChest).toBe(9250);

    // Verify swfStabilityPool balance = 500 gold
    expect(state.swfStabilityPool).toBe(500);

    // Verify slashed shares tracker decremented: 300 - 150 = 150
    expect(state.slashedCDOTrancheShares?.alpha?.cdo_1?.senior).toBe(150);

    // Verify CDO shares restored: 700 + 150 = 850
    const seniorTranche = state.swfYieldCDOs?.cdo_1?.tranches?.senior;
    expect(seniorTranche?.ownership?.alpha).toBe(850);
    expect(seniorTranche?.totalShares).toBe(850);

    // Verify credit score recovered: 80 + 25 = 105
    expect(state.creditRatings?.alpha).toBe(105);

    // Verify journal and audit logging
    expect(state.journal).toContain(
      "[Reinvestment Breach Rehab Resolved] Syndicate alpha successfully authorized rehab proposal rehab_prop_1. Restored 150 shares of CDO cdo_1 tranche senior and recovered credit rating to 105 (contributed 500 gold to stability pool)."
    );
    expect(state.auditLogs).toContain(
      "[Reinvestment Breach Rehab Resolved] Syndicate alpha restored 150 slashed CDO shares from cdo_1 tranche senior. SWF Stability Pool balance: 500 gold."
    );
  });

  it("should reject proposing to restore more than 50% of slashed shares", () => {
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
            totalShares: 700,
            ownership: { alpha: 700 },
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

    state.slashedCDOTrancheShares = {
      alpha: {
        cdo_1: {
          senior: 300,
        },
      },
    };

    // Propose restoring 200 shares (which is > 50% of 300 = 150)
    const stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_BREACH_REHAB",
          proposalId: "rehab_prop_too_high",
          syndicateId: "alpha",
          cdoId: "cdo_1",
          trancheId: "senior",
          goldContribution: 500,
          rehabSharesToRestore: 200,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(false);
    expect(stepResult.rejectionReason).toContain("Cannot restore more than 50% of slashed shares");
  });

  it("should support cooperative rehab campaign subsidies from allied syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "bob", "charlie", "alice"],
    });

    // Configure two allied syndicates
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
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Establish mutual alliance between alpha and beta
    state.syndicateAlliances = {
      alpha: {
        beta: "allied",
      },
      beta: {
        alpha: "allied",
      },
    };

    // Faction standing of beta/alpha with rangers is 80 (eligible for math.floor(80 * 0.5) = 40% maximum discount, capped by subsidyPercentage)
    state.factionRep = {
      rangers: 80,
    };

    // Initialize faction reserve pools
    state.factionReservePools = {
      rangers: 5000,
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
            totalShares: 700,
            ownership: { alpha: 700 },
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

    state.slashedCDOTrancheShares = {
      alpha: {
        cdo_1: {
          senior: 300,
        },
      },
    };

    state.creditRatings = {
      alpha: 80,
    };

    // Propose rehabilitation: contribution of 1000 gold to restore 150 shares
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_BREACH_REHAB",
          proposalId: "rehab_prop_1",
          syndicateId: "alpha",
          cdoId: "cdo_1",
          trancheId: "senior",
          goldContribution: 1000,
          rehabSharesToRestore: 150,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    // Try to propose cooperative rehab subsidy from non-member, should fail
    const invalidProposerResult = multiAgentStep(
      state,
      {
        agentId: "player", // not a member of beta
        action: {
          type: "PROPOSE_COOPERATIVE_REHAB_SUBSIDY",
          proposalId: "subsidy_prop_1",
          syndicateId: "beta",
          targetSyndicateId: "alpha",
          targetRehabProposalId: "rehab_prop_1",
          factionId: "rangers",
          subsidyPercentage: 50,
          timestamp: 1015,
        } as any,
      },
      mockPack
    );
    expect(invalidProposerResult.ok).toBe(false);

    // Propose cooperative rehab subsidy from bob (member of beta) to subsidize alpha's proposal
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_COOPERATIVE_REHAB_SUBSIDY",
          proposalId: "subsidy_prop_1",
          syndicateId: "beta",
          targetSyndicateId: "alpha",
          targetRehabProposalId: "rehab_prop_1",
          factionId: "rangers",
          subsidyPercentage: 50,
          timestamp: 1015,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify bob's proposal is created and has bob's auto-vote
    let subProp = state.cooperativeRehabSubsidyProposals?.["subsidy_prop_1"];
    expect(subProp).toBeDefined();
    expect(subProp?.status).toBe("proposed");
    expect(subProp?.votes?.["bob"]?.vote).toBe(true);
    // Proposal fee deducted: 10000 - 200 = 9800
    expect(state.syndicates?.beta?.warChest).toBe(9800);

    // Vote on cooperative rehab subsidy by charlie (member of beta, costs 50 gold, authorizes it)
    const stepResultSubsidyVote = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_COOPERATIVE_REHAB_SUBSIDY",
          syndicateId: "beta",
          proposalId: "subsidy_prop_1",
          vote: true,
          timestamp: 1018,
        } as any,
      },
      mockPack
    );

    expect(stepResultSubsidyVote.ok).toBe(true);
    state = stepResultSubsidyVote.state;

    // Verify cooperative subsidy is authorized now
    subProp = state.cooperativeRehabSubsidyProposals?.["subsidy_prop_1"];
    expect(subProp?.resolved).toBe(true);
    expect(subProp?.status).toBe("authorized");
    // Vote fee deducted from beta: 9800 - 50 = 9750
    expect(state.syndicates?.beta?.warChest).toBe(9750);

    // Vote to authorize the target rehab campaign in alpha (by alice, costs 50 gold and resolves it)
    // Standing is 80, so standing * 0.5 = 40%. SubsidyPercentage is 50%, so applied is min(50%, 40%) = 40% discount!
    // Gold contribution = 1000 gold. Discount = 40% of 1000 = 400 gold.
    // Actual cost paid by alpha = 1000 - 400 = 600 gold.
    // Alpha war chest: 9800 (after propose fee) - 50 (vote fee) - 600 (actual cost) = 9150 gold!
    const stepResult3 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_BREACH_REHAB",
          syndicateId: "alpha",
          proposalId: "rehab_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult3.ok).toBe(true);
    state = stepResult3.state;

    // Verify discount applied
    expect(state.syndicates?.alpha?.warChest).toBe(9150);
    // Verify faction reserve pool decreased: 5000 - 400 = 4600
    expect(state.factionReservePools?.rangers).toBe(4600);
    // Verify stability pool has the full contribution: 1000 gold
    expect(state.swfStabilityPool).toBe(1000);

    // Verify CDO ownership and rating recovered
    expect(state.creditRatings?.alpha).toBe(105);
    expect(state.slashedCDOTrancheShares?.alpha?.cdo_1?.senior).toBe(150);
    expect(state.swfYieldCDOs?.cdo_1?.tranches?.senior?.ownership?.alpha).toBe(850);
  });

  it("should support proposing and voting on cooperative yield sweep policies between allied syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    // Configure two allied syndicates
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
        warChest: 10000,
      },
    };

    // Establish mutual alliance between alpha and beta
    state.syndicateAlliances = {
      alpha: {
        beta: "allied",
      },
      beta: {
        alpha: "allied",
      },
    };

    // Propose cooperative yield sweep policy: alpha pools with beta, faction rangers, threshold 50, sweep 80%
    const stepResult1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_COOPERATIVE_STAKING_YIELD_SWEEP",
          proposalId: "sweep_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          factionId: "rangers",
          criticalThreshold: 50,
          sweepPercentage: 80,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult1.ok).toBe(true);
    state = stepResult1.state;

    // Check proposal exists
    const prop = state.cooperativeStakingYieldSweepProposals?.["sweep_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.votes?.["player"]?.vote).toBe(true);
    // Proposal fee deducted: 10000 - 200 = 9800
    expect(state.syndicates?.alpha?.warChest).toBe(9800);

    // Try to propose duplicate, should fail
    const dupResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_COOPERATIVE_STAKING_YIELD_SWEEP",
          proposalId: "sweep_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          factionId: "rangers",
          criticalThreshold: 50,
          sweepPercentage: 80,
          timestamp: 1011,
        } as any,
      },
      mockPack
    );
    expect(dupResult.ok).toBe(false);

    // Vote to authorize by alice (majority of alpha: members are player and alice, so 2 members, majority is > 1 which is 2)
    // Vote fee: 50 gold.
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_COOPERATIVE_STAKING_YIELD_SWEEP",
          syndicateId: "alpha",
          proposalId: "sweep_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify authorized and resolved
    const propAfter = state.cooperativeStakingYieldSweepProposals?.["sweep_prop_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(propAfter?.resolved).toBe(true);
    // Warchest deducted: 9800 - 50 = 9750
    expect(state.syndicates?.alpha?.warChest).toBe(9750);
  });

  it("should automatically sweep excess staking yields into the shared pool on economy tick when standing falls below critical threshold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
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
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Configure margin account with staking enabled for alpha
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 1000,
        timestamp: 1000,
        swfStakingEnabled: true,
        swfStakingTargets: {
          rangers: 100, // 100% of buffer = 600 gold
        },
        swfLiquidityBuffer: 600,
      },
    };

    // Set faction standing for rangers at 30 (which is below the threshold of 50)
    state.factionRep = {
      rangers: 30,
    };

    // Setup an authorized sweep policy between alpha and beta
    state.cooperativeStakingYieldSweepProposals = {
      "sweep_prop_1": {
        proposalId: "sweep_prop_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        factionId: "rangers",
        criticalThreshold: 50,
        sweepPercentage: 75,
        status: "authorized",
        resolved: true,
        timestamp: 1000,
      },
    };

    // Staked gold = 600
    // Rangers rep = 30 -> yieldRate = 0.04 + 30 * 0.002 = 0.10 (10%)
    // Gold earned = 600 * 0.10 = 60 gold.
    // Faction standing (30) < critical threshold (50) -> Sweep triggers!
    // Swept gold = Math.floor(60 * 0.75) = 45 gold.
    // Net gold earned = 60 - 45 = 15 gold.
    // Final collateral = 1000 + 15 = 1015 gold.
    // Final swfStakingSweepPool = 45 gold.

    const afterState = tickEconomy(state, mockPack);

    const ma = afterState.marginAccounts?.alpha;
    expect(ma?.collateral).toBe(1015);
    expect(afterState.swfStakingSweepPool).toBe(45);

    // Verify sweep journal
    expect(afterState.journal).toContain(
      "[SWF Staking Sweep] Swept 45 gold from Syndicate alpha yield into the shared stabilization pool due to standing 30 falling below threshold 50 with faction rangers."
    );
  });

  it("should support proposing and voting on sweep pool redistribution policies between allied syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Establish alliance
    state.syndicateAlliances = {
      alpha: { beta: "allied" },
      beta: { alpha: "allied" },
    };

    // Propose sweep pool redistribution
    const stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_SWEEP_POOL_REDISTRIBUTION",
          proposalId: "redist_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          redistributionThreshold: 300,
          autoCompound: true,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(true);
    state = stepResult.state;

    const prop = state.sweepPoolRedistributionProposals?.["redist_prop_1"];
    expect(prop?.status).toBe("proposed");
    expect(prop?.resolved).toBe(false);
    expect(prop?.votes?.["player"]?.vote).toBe(true);
    // Proposal fee deducted: 10000 - 90 = 9910
    expect(state.syndicates?.alpha?.warChest).toBe(9910);

    // Vote to authorize by alice (majority of alpha: members are player and alice, majority is > 1 which is 2)
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_SWEEP_POOL_REDISTRIBUTION",
          syndicateId: "alpha",
          proposalId: "redist_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify authorized and resolved
    const propAfter = state.sweepPoolRedistributionProposals?.["redist_prop_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(propAfter?.resolved).toBe(true);
    // GameState fields updated!
    expect(state.sweepPoolRedistributionThreshold).toBe(300);
    expect(state.sweepPoolAutoCompound).toBe(true);
    // Vote fee deducted: 9910 - 23 = 9887
    expect(state.syndicates?.alpha?.warChest).toBe(9887);
  });

  it("should automatically redistribute the sweep pool proportionally based on participation ranks on economy tick when standing recovers", () => {
    // 1. Test Auto-Compound (autoCompound: true)
    {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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
          members: [],
          definedBy: "player",
          timestamp: 1000,
          warChest: 10000,
        },
      };

      // Set alliance
      state.syndicateAlliances = {
        alpha: { beta: "allied" },
        beta: { alpha: "allied" },
      };

      // Set participation ranks: alpha = 3, beta = 2
      state.syndicateMeshParticipationRanks = {
        alpha: 3,
        beta: 2,
      };

      // Configure sweep pool and threshold
      state.swfStakingSweepPool = 500;
      state.sweepPoolRedistributionThreshold = 300;

      // Authorized redistribution policy with auto-compound
      state.sweepPoolRedistributionProposals = {
        "redist_prop_1": {
          proposalId: "redist_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          redistributionThreshold: 300,
          autoCompound: true,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      // Corresponding authorized sweep policy
      state.cooperativeStakingYieldSweepProposals = {
        "sweep_prop_1": {
          proposalId: "sweep_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          factionId: "rangers",
          criticalThreshold: 50,
          sweepPercentage: 75,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      // Staking targets configured inside margin accounts
      state.marginAccounts = {
        alpha: {
          syndicateId: "alpha",
          collateral: 1000,
          timestamp: 1000,
          swfStakingEnabled: true,
          swfStakingTargets: { rangers: 100 },
          swfLiquidityBuffer: 600,
        },
        beta: {
          syndicateId: "beta",
          collateral: 2000,
          timestamp: 1000,
          swfStakingEnabled: true,
          swfStakingTargets: { rangers: 100 },
          swfLiquidityBuffer: 800,
        },
      };

      // Recovered standing (60 >= critical threshold 50)
      state.factionRep = {
        rangers: 60,
      };

      // Tick economy
      const afterState = tickEconomy(state, mockPack);

      // Verify sweep pool is fully cleared
      expect(afterState.swfStakingSweepPool).toBe(0);

      // Proportional redistribution checks (Total = 500, alpha rank = 3, beta rank = 2 -> alpha gets 300, beta gets 200)
      const ma1 = afterState.marginAccounts?.alpha;
      const ma2 = afterState.marginAccounts?.beta;
      expect(ma1?.collateral).toBe(1396); // 1000 + 300 redistributed + 96 tick yield
      expect(ma1?.swfLiquidityBuffer).toBe(996); // 600 + 300 redistributed + 96 tick yield
      expect(ma2?.collateral).toBe(2347); // 2000 + 200 redistributed + 147 tick yield (with sequential 72 rep)
      expect(ma2?.swfLiquidityBuffer).toBe(1147); // 800 + 200 redistributed + 147 tick yield (with sequential 72 rep)

      expect(afterState.journal).toContain(
        "[SWF Staking Sweep Auto-Compound] Redistributed and auto-compounded 500 gold from sweep pool back to Syndicate alpha (300 gold) and Syndicate beta (200 gold) SWF staking targets."
      );
    }

    // 2. Test War Chest distribution (autoCompound: false)
    {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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
          members: [],
          definedBy: "player",
          timestamp: 1000,
          warChest: 10000,
        },
      };

      // Set alliance
      state.syndicateAlliances = {
        alpha: { beta: "allied" },
        beta: { alpha: "allied" },
      };

      // Set participation ranks: alpha = 1, beta = 3
      state.syndicateMeshParticipationRanks = {
        alpha: 1,
        beta: 3,
      };

      // Configure sweep pool and threshold
      state.swfStakingSweepPool = 400;
      state.sweepPoolRedistributionThreshold = 200;

      // Authorized redistribution policy without auto-compound
      state.sweepPoolRedistributionProposals = {
        "redist_prop_1": {
          proposalId: "redist_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          redistributionThreshold: 200,
          autoCompound: false,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      // Corresponding authorized sweep policy
      state.cooperativeStakingYieldSweepProposals = {
        "sweep_prop_1": {
          proposalId: "sweep_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          factionId: "rangers",
          criticalThreshold: 50,
          sweepPercentage: 75,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      // Recovered standing (60 >= critical threshold 50)
      state.factionRep = {
        rangers: 60,
      };

      // Tick economy
      const afterState = tickEconomy(state, mockPack);

      // Verify sweep pool is fully cleared
      expect(afterState.swfStakingSweepPool).toBe(0);

      // Proportional redistribution checks (Total = 400, alpha rank = 1, beta rank = 3 -> alpha gets 100, beta gets 300)
      expect(afterState.syndicates?.alpha?.warChest).toBe(10100); // 10000 + 100
      expect(afterState.syndicates?.beta?.warChest).toBe(10300); // 10000 + 300

      expect(afterState.journal).toContain(
        "[SWF Staking Sweep Redistribution] Redistributed 400 gold from sweep pool back to Syndicate alpha (100 gold) and Syndicate beta (300 gold) war chests."
      );
    }
  });

  it("should support proposing, voting, and authorizing sweep pool rank adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Establish alliance
    state.syndicateAlliances = {
      alpha: { beta: "allied" },
      beta: { alpha: "allied" },
    };

    // Propose rank adjustment for beta to rank 5
    const stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_SWEEP_POOL_RANK_ADJUST",
          proposalId: "rank_adjust_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          targetRank: 5,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(true);
    state = stepResult.state;

    const prop = state.sweepPoolRankAdjustProposals?.["rank_adjust_1"];
    expect(prop?.status).toBe("proposed");
    expect(prop?.resolved).toBe(false);
    expect(prop?.votes?.["player"]?.vote).toBe(true);
    // Proposal fee deducted: 10000 - 90 = 9910 (due to dynamic fee calibration)
    expect(state.syndicates?.alpha?.warChest).toBe(9910);

    // Vote to authorize by alice (majority of alpha: members are player and alice, majority is > 1 which is 2)
    const stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_SWEEP_POOL_RANK_ADJUST",
          syndicateId: "alpha",
          proposalId: "rank_adjust_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify authorized and resolved
    const propAfter = state.sweepPoolRankAdjustProposals?.["rank_adjust_1"];
    expect(propAfter?.status).toBe("authorized");
    expect(propAfter?.resolved).toBe(true);
    // GameState fields updated!
    expect(state.syndicateMeshParticipationRanks?.beta).toBe(5);
    // Vote fee deducted: 9910 - 23 = 9887 (due to dynamic fee calibration)
    expect(state.syndicates?.alpha?.warChest).toBe(9887);
  });

  it("should dynamically scale participation ranks based on faction standing during sweep pool redistribution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
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
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Set alliance
    state.syndicateAlliances = {
      alpha: { beta: "allied" },
      beta: { alpha: "allied" },
    };

    // Set participation ranks: alpha = 1, beta = 1 (equal base ranks)
    state.syndicateMeshParticipationRanks = {
      alpha: 1,
      beta: 1,
    };

    // Configure sweep pool and threshold
    state.swfStakingSweepPool = 600;
    state.sweepPoolRedistributionThreshold = 200;

    // Authorized redistribution policy without auto-compound
    state.sweepPoolRedistributionProposals = {
      "redist_prop_1": {
        proposalId: "redist_prop_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        redistributionThreshold: 200,
        autoCompound: false,
        status: "authorized",
        resolved: true,
        timestamp: 1000,
      },
    };

    // Corresponding authorized sweep policy
    state.cooperativeStakingYieldSweepProposals = {
      "sweep_prop_1": {
        proposalId: "sweep_prop_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        factionId: "rangers",
        criticalThreshold: 50,
        sweepPercentage: 75,
        status: "authorized",
        resolved: true,
        timestamp: 1000,
      },
    };

    // Faction reputation mesh-wide
    state.factionRep = {
      rangers: 50,
    };

    // Faction loyalty bonds to differentiate standings:
    // alpha has no bond, so standing = 50.
    // beta has bond with 10000 gold locked -> +100 standing -> standing = 150.
    state.factionLoyaltyBonds = {
      "beta-rangers": {
        id: "beta-rangers",
        syndicateId: "beta",
        factionId: "rangers",
        lockedGold: 10000,
        timestamp: 1000,
      },
    };

    // Standing calculations check:
    // standing1 (alpha) = 50 + 0 = 50. scaledRank1 = 1 * 50 = 50.
    // standing2 (beta) = 50 + 100 = 150. scaledRank2 = 1 * 150 = 150.
    // Total scaled rank = 50 + 150 = 200.
    // Proportional shares:
    // alpha gets: 600 * (50 / 200) = 150 gold.
    // beta gets: 600 * (150 / 200) = 450 gold.

    // Tick economy
    const afterState = tickEconomy(state, mockPack);

    // Verify sweep pool is fully cleared
    expect(afterState.swfStakingSweepPool).toBe(0);

    // Proportional redistribution checks:
    expect(afterState.syndicates?.alpha?.warChest).toBe(10150); // 10000 + 150
    expect(afterState.syndicates?.beta?.warChest).toBe(10450); // 10000 + 450

    expect(afterState.journal).toContain(
      "[SWF Staking Sweep Redistribution] Redistributed 600 gold from sweep pool back to Syndicate alpha (150 gold) and Syndicate beta (450 gold) war chests."
    );
  });

  describe("Syndicate SWF Sweep Pool Rank Adjust Fee Calibration (AF-209)", () => {
    it("should dynamically scale proposal and vote fees based on alliance count and total treasury reserves", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
        agentsInit: ["player", "alice"],
      });

      state.syndicates = {
        alpha: {
          id: "alpha",
          name: "Alpha Syndicate",
          members: ["player", "alice"],
          definedBy: "player",
          timestamp: 1000,
          warChest: 2000, // 2000 gold
        },
        beta: {
          id: "beta",
          name: "Beta Syndicate",
          members: [],
          definedBy: "player",
          timestamp: 1000,
          warChest: 1000, // 1000 gold
        },
        gamma: {
          id: "gamma",
          name: "Gamma Syndicate",
          members: [],
          definedBy: "player",
          timestamp: 1000,
          warChest: 1000, // 1000 gold
        },
      };

      // Establish alliances (alpha is allied to beta and gamma, count = 2)
      state.syndicateAlliances = {
        alpha: { beta: "allied", gamma: "allied" },
        beta: { alpha: "allied" },
        gamma: { alpha: "allied" },
      };

      // Alliance Count = 2 -> allianceScalar = Math.max(0.5, 1.0 - 2 * 0.1) = 0.8
      // Total Treasury Reserves = alpha(2000) + beta(1000) + gamma(1000) = 4000
      // reserveScalar = Math.max(0.5, 1.0 - Math.floor(4000 / 1000) * 0.05) = Math.max(0.5, 1.0 - 4 * 0.05) = 0.8
      // dynamicFeeMultiplier = 0.8 * 0.8 = 0.64
      // Proposal fee = Math.round(200 * 0.64) = 128
      // Vote fee = Math.round(50 * 0.64) = 32

      const stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_RANK_ADJUST",
            proposalId: "rank_adjust_calib",
            syndicateId: "alpha",
            targetSyndicateId: "beta",
            targetRank: 7,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;
      // Propose fee deducted: 2000 - 128 = 1872
      expect(state.syndicates?.alpha?.warChest).toBe(1872);

      const stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_SWEEP_POOL_RANK_ADJUST",
            syndicateId: "alpha",
            proposalId: "rank_adjust_calib",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;
      // Vote fee deducted: 1872 - 34 = 1838 (due to slightly lower total reserves after proposal deduction)
      expect(state.syndicates?.alpha?.warChest).toBe(1838);
    });

    it("should allow proposing and voting on sweep pool rank adjust fee calibrations", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
        agentsInit: ["player", "alice"],
      });

      state.syndicates = {
        alpha: {
          id: "alpha",
          name: "Alpha Syndicate",
          members: ["player", "alice"],
          definedBy: "player",
          timestamp: 1000,
          warChest: 2000,
        },
      };

      // Propose fee calibration
      const stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_RANK_ADJUST_FEE_CALIBRATION",
            proposalId: "calib_prop_1",
            syndicateId: "alpha",
            targetProposalFee: 150,
            targetVoteFee: 40,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      const prop = state.sweepPoolRankAdjustFeeCalibrationProposals?.["calib_prop_1"];
      expect(prop?.status).toBe("proposed");
      expect(prop?.resolved).toBe(false);

      // Vote to authorize by alice
      const stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_SWEEP_POOL_RANK_ADJUST_FEE_CALIBRATION",
            syndicateId: "alpha",
            proposalId: "calib_prop_1",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;

      const propAfter = state.sweepPoolRankAdjustFeeCalibrationProposals?.["calib_prop_1"];
      expect(propAfter?.status).toBe("authorized");
      expect(propAfter?.resolved).toBe(true);

      // Verify GameState fields are updated
      expect(state.sweepPoolRankAdjustBaseProposalFee).toBe(150);
      expect(state.sweepPoolRankAdjustBaseVoteFee).toBe(40);
    });
  });

  describe("Syndicate SWF Sweep Pool Fee Governance Caps and Surplus Routing (AF-210)", () => {
    it("should allow proposing and voting on sweep pool rank adjust fee governance caps", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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

      // Propose rank adjust fee governance cap
      const stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_RANK_ADJUST_FEE_GOVERNANCE_CAP",
            proposalId: "gov_cap_prop_1",
            syndicateId: "alpha",
            targetProposalFeeCap: 150,
            targetVoteFeeCap: 40,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      const prop = state.sweepPoolRankAdjustFeeGovernanceCapProposals?.["gov_cap_prop_1"];
      expect(prop?.status).toBe("proposed");
      expect(prop?.resolved).toBe(false);

      // Vote to authorize by alice
      const stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_SWEEP_POOL_RANK_ADJUST_FEE_GOVERNANCE_CAP",
            syndicateId: "alpha",
            proposalId: "gov_cap_prop_1",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;

      const propAfter = state.sweepPoolRankAdjustFeeGovernanceCapProposals?.["gov_cap_prop_1"];
      expect(propAfter?.status).toBe("authorized");
      expect(propAfter?.resolved).toBe(true);

      // Verify GameState fields are updated
      expect(state.sweepPoolRankAdjustProposalFeeCap).toBe(150);
      expect(state.sweepPoolRankAdjustVoteFeeCap).toBe(40);
    });

    it("should allow proposing and voting on sweep pool redistribution fee governance caps", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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

      // Propose redistribution fee governance cap
      const stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_REDISTRIBUTION_FEE_GOVERNANCE_CAP",
            proposalId: "gov_cap_prop_2",
            syndicateId: "alpha",
            targetProposalFeeCap: 160,
            targetVoteFeeCap: 45,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      const prop = state.sweepPoolRedistributionFeeGovernanceCapProposals?.["gov_cap_prop_2"];
      expect(prop?.status).toBe("proposed");
      expect(prop?.resolved).toBe(false);

      // Vote to authorize by alice
      const stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_SWEEP_POOL_REDISTRIBUTION_FEE_GOVERNANCE_CAP",
            syndicateId: "alpha",
            proposalId: "gov_cap_prop_2",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;

      const propAfter = state.sweepPoolRedistributionFeeGovernanceCapProposals?.["gov_cap_prop_2"];
      expect(propAfter?.status).toBe("authorized");
      expect(propAfter?.resolved).toBe(true);

      // Verify GameState fields are updated
      expect(state.sweepPoolRedistributionProposalFeeCap).toBe(160);
      expect(state.sweepPoolRedistributionVoteFeeCap).toBe(45);
    });

    it("should clamp dynamic proposal/vote fees at the authorized caps", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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
        beta: {
          id: "beta",
          name: "Beta Syndicate",
          members: [],
          definedBy: "player",
          timestamp: 1000,
          warChest: 10000,
        },
      };

      state.syndicateAlliances = {
        alpha: { beta: "allied" },
        beta: { alpha: "allied" },
      };

      // Set extremely low caps to test the clamping behavior
      state.sweepPoolRankAdjustProposalFeeCap = 50;
      state.sweepPoolRankAdjustVoteFeeCap = 15;
      state.sweepPoolRankAdjustBaseProposalFee = 200;
      state.sweepPoolRankAdjustBaseVoteFee = 50;
      state.swfStakingSweepPool = 100;

      // In this setup:
      // allies = [beta] -> count = 1
      // total reserves = 20000 -> allianceScalar = 0.9, reserveScalar = 0.5 -> dynamicFeeMultiplier = 0.45
      // rawProposalFee = Math.round(200 * 0.45) = 90
      // Since proposalFeeCap = 50, the actual proposal fee should be clamped to 50!

      const stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_RANK_ADJUST",
            proposalId: "rank_prop_1",
            syndicateId: "alpha",
            targetSyndicateId: "beta",
            targetRank: 5,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      // Alpha's war chest should have 10000 - 50 = 9950 gold.
      expect(state.syndicates?.alpha?.warChest).toBe(9950);
      expect(state.swfStakingSweepPool).toBe(100);
    });
  });

  describe("AF-211: Sweep Pool Volatility Hedging Policy", () => {
    it("should successfully propose, vote to authorize, and tick volatility hedging", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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

      // 1. Propose volatility hedging policy
      let stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_SWEEP_POOL_VOLATILITY_HEDGING_POLICY",
            proposalId: "hedge_prop_1",
            syndicateId: "alpha",
            volatilityThreshold: 60,
            hedgingRatio: 80,
            reserveFloor: 100,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      let prop = state.sweepPoolVolatilityHedgingProposals?.["hedge_prop_1"];
      expect(prop?.status).toBe("proposed");
      expect(prop?.resolved).toBe(false);

      // 2. Vote to authorize by Alice
      let stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_SWEEP_POOL_VOLATILITY_HEDGING_POLICY",
            syndicateId: "alpha",
            proposalId: "hedge_prop_1",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;

      let propAfter = state.sweepPoolVolatilityHedgingProposals?.["hedge_prop_1"];
      expect(propAfter?.status).toBe("authorized");
      expect(propAfter?.resolved).toBe(true);

      // Verify GameState fields are updated
      expect(state.sweepPoolVolatilityHedgingThreshold).toBe(60);
      expect(state.sweepPoolVolatilityHedgingRatio).toBe(80);
      expect(state.sweepPoolVolatilityHedgingReserveFloor).toBe(100);
      expect(state.sweepPoolVolatilityHedgingPolicyAuthorized).toBe(true);

      // 3. Test economy tick under normal weather (volatility does not spike)
      state.environment = {
        weather: "clear",
        temperature: "mild",
        wind: "calm",
        lastUpdatedStep: state.step,
      };
      state.swfStakingSweepPool = 500;

      let tickedState = tickEconomy(state, mockPack);
      // Sweep pool gold should remain untouched because clear weather is below threshold 60
      expect(tickedState.swfStakingSweepPool).toBe(500);

      // 4. Test economy tick under stormy weather (volatility spikes)
      tickedState.environment = {
        weather: "storm", // 50
        temperature: "cold",
        wind: "tempest", // 30 => total 80 >= 60 threshold!
        lastUpdatedStep: tickedState.step,
      };

      // Spiked!
      // Available gold = 500 - 100 (reserve floor) = 400
      // Hedge cost = 400 * 80% = 320
      // New sweep pool gold = 500 - 320 = 180
      let tickedState2 = tickEconomy(tickedState, mockPack);
      expect(tickedState2.swfStakingSweepPool).toBe(180);

      // Volatility insurance pool balance should have increased by 320
      const insurancePools = Object.values(tickedState2.swfReinsuranceOptionVolatilityInsurancePools || {});
      expect(insurancePools.length).toBeGreaterThan(0);
      expect(insurancePools[0].balance).toBe(320);
    });
  });

  describe("AF-212: Weather Forecast Oracle and Dynamic Volatility Hedging", () => {
    function getWeatherForStep(
      seed: number,
      step: number,
      weatherPool?: string[]
    ): { weather: string; temperature: string; wind: string } {
      const defaultWeathers = ["clear", "rain", "fog", "storm"];
      const weathers = (weatherPool && weatherPool.length > 0) ? weatherPool : defaultWeathers;
      const temperatures = ["cold", "mild", "hot"];
      const winds = ["calm", "breezy", "gale", "tempest"];

      const interval = Math.floor(step / 5);
      const h1 = Math.abs(Math.imul(seed ^ interval, 0x6D2B79F5)) | 0;
      const weatherIndex = h1 % weathers.length;

      const h2 = Math.abs(Math.imul(h1 ^ 0x6D2B79F5, 0x6D2B79F5)) | 0;
      const tempIndex = h2 % temperatures.length;

      const h3 = Math.abs(Math.imul(h2 ^ 0x6D2B79F5, 0x6D2B79F5)) | 0;
      const windIndex = h3 % winds.length;

      return {
        weather: weathers[weatherIndex],
        temperature: temperatures[tempIndex],
        wind: winds[windIndex],
      };
    }

    it("should successfully propose, vote to authorize weather forecast oracle, and dynamically adjust volatility hedging size in economy tick", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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

      // 1. Propose Weather Forecast Oracle
      let stepResult = multiAgentStep(
        state,
        {
          agentId: "player",
          action: {
            type: "PROPOSE_WEATHER_FORECAST_ORACLE",
            proposalId: "oracle_prop_1",
            syndicateId: "alpha",
            oracleReputationThreshold: 70,
            forecastAccuracyFloor: 90,
            timestamp: 1005,
          } as any,
        },
        mockPack
      );

      expect(stepResult.ok).toBe(true);
      state = stepResult.state;

      let prop = state.sweepPoolWeatherForecastOracleProposals?.["oracle_prop_1"];
      expect(prop?.status).toBe("proposed");
      expect(prop?.resolved).toBe(false);

      // 2. Vote to authorize by Alice
      let stepResult2 = multiAgentStep(
        state,
        {
          agentId: "alice",
          action: {
            type: "VOTE_WEATHER_FORECAST_ORACLE",
            syndicateId: "alpha",
            proposalId: "oracle_prop_1",
            vote: true,
            timestamp: 1020,
          } as any,
        },
        mockPack
      );

      expect(stepResult2.ok).toBe(true);
      state = stepResult2.state;

      let propAfter = state.sweepPoolWeatherForecastOracleProposals?.["oracle_prop_1"];
      expect(propAfter?.status).toBe("authorized");
      expect(propAfter?.resolved).toBe(true);

      // Verify GameState fields are updated
      expect(state.sweepPoolWeatherForecastOracleAuthorized).toBe(true);
      expect(state.sweepPoolWeatherForecastOracleReputationThreshold).toBe(70);
      expect(state.sweepPoolWeatherForecastOracleAccuracyFloor).toBe(90);

      // 3. Setup Volatility Hedging Policy
      state.sweepPoolVolatilityHedgingPolicyAuthorized = true;
      state.sweepPoolVolatilityHedgingThreshold = 60;
      state.sweepPoolVolatilityHedgingRatio = 80;
      state.sweepPoolVolatilityHedgingReserveFloor = 100;
      state.swfStakingSweepPool = 500;

      // Spiked current weather (to trigger hedging)
      state.environment = {
        weather: "storm", // 50
        temperature: "cold",
        wind: "tempest", // 30 => total 80 >= 60 threshold
        lastUpdatedStep: state.step,
      };

      // Get forecast at step + 5
      const forecastStep = (state.step ?? 0) + 5;
      const forecast = getWeatherForStep(state.seed ?? 12345, forecastStep);
      let fBaseVol = 0;
      if (forecast.weather === "storm") fBaseVol = 50;
      else if (forecast.weather === "rain") fBaseVol = 20;
      else if (forecast.weather === "fog") fBaseVol = 15;
      else if (forecast.weather === "clear") fBaseVol = 5;

      let fWindVol = 0;
      if (forecast.wind === "tempest") fWindVol = 30;
      else if (forecast.wind === "gale") fWindVol = 15;
      else if (forecast.wind === "breezy") fWindVol = 5;

      const predictedVol = fBaseVol + fWindVol;
      const baseRatio = state.sweepPoolVolatilityHedgingRatio;
      const threshold = state.sweepPoolVolatilityHedgingThreshold;
      const accuracy = state.sweepPoolWeatherForecastOracleAccuracyFloor ?? 100;

      let expectedRatio = baseRatio;
      if (predictedVol < threshold) {
        const stabilityFactor = predictedVol / threshold;
        const scaling = 1 - (1 - stabilityFactor) * (accuracy / 100);
        expectedRatio = Math.max(0, Math.round(baseRatio * scaling));
      } else {
        const volatilityFactor = predictedVol / threshold;
        const scaling = 1 + (volatilityFactor - 1) * (accuracy / 100);
        expectedRatio = Math.min(100, Math.round(baseRatio * scaling));
      }

      const availableGold = Math.max(0, state.swfStakingSweepPool - state.sweepPoolVolatilityHedgingReserveFloor);
      const expectedHedgeCost = Math.floor(availableGold * (expectedRatio / 100));
      const expectedNewSweep = state.swfStakingSweepPool - expectedHedgeCost;

      const tickedState = tickEconomy(state, mockPack);
      expect(tickedState.swfStakingSweepPool).toBe(expectedNewSweep);

      // Verify the insurance pool increased by the correct amount
      const insurancePools = Object.values(tickedState.swfReinsuranceOptionVolatilityInsurancePools || {});
      expect(insurancePools.length).toBeGreaterThan(0);
      expect(insurancePools[0].balance).toBe(expectedHedgeCost);
    });

    it("should successfully apply faction standing and loyalty rank discounts to weather volatility option premium calculations", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
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

      // Authorize policy and oracle proposed by alpha
      state.sweepPoolVolatilityHedgingPolicyAuthorized = true;
      state.sweepPoolVolatilityHedgingThreshold = 60;
      state.sweepPoolVolatilityHedgingRatio = 80;
      state.sweepPoolVolatilityHedgingReserveFloor = 100;
      state.swfStakingSweepPool = 500;

      state.sweepPoolVolatilityHedgingProposals = {
        "hedge_prop_1": {
          proposalId: "hedge_prop_1",
          syndicateId: "alpha",
          volatilityThreshold: 60,
          hedgingRatio: 80,
          reserveFloor: 100,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      state.cooperativeStakingYieldSweepProposals = {
        "sweep_prop_1": {
          proposalId: "sweep_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          factionId: "rangers",
          criticalThreshold: 50,
          sweepPercentage: 75,
          status: "authorized",
          resolved: true,
          timestamp: 1000,
        },
      };

      // Set environment to spiked (storm + tempest = 80 vol)
      state.environment = {
        weather: "storm",
        temperature: "cold",
        wind: "tempest",
        lastUpdatedStep: state.step,
      };

      // Configure standing = 40 (standing discount = 40 * 0.0025 = 10%)
      // Configure loyalty rank = Gold (rank discount = 20%)
      // Total discount = 30% -> multiplier = 0.70
      state.factionRep = {
        rangers: 40,
      };
      state.factionLoyaltyRanks = {
        "alpha-rangers": {
          syndicateId: "alpha",
          factionId: "rangers",
          rank: "Gold",
          timestamp: 1000,
        },
      };

      const availableGold = state.swfStakingSweepPool - state.sweepPoolVolatilityHedgingReserveFloor; // 400
      const baseHedgeCost = Math.floor(availableGold * 0.80); // 320
      const expectedHedgeCost = Math.floor(baseHedgeCost * 0.70); // 224

      const tickedState = tickEconomy(state, mockPack);

      // Verify sweep pool has remaining gold (500 - 224 = 276)
      expect(tickedState.swfStakingSweepPool).toBe(500 - expectedHedgeCost);

      const insurancePools = Object.values(tickedState.swfReinsuranceOptionVolatilityInsurancePools || {});
      expect(insurancePools.length).toBeGreaterThan(0);
      expect(insurancePools[0].balance).toBe(expectedHedgeCost);

      // Verify the journal contains discount logs
      const discountLog = tickedState.journal.find((log: string) => log.includes("Applied faction alliance loyalty discount of 30%"));
      expect(discountLog).toBeDefined();
    });

    it("should successfully award speculative profit payouts to the sweep pool when weather reverts to stable", () => {
      let state = createInitialState({
        seed: 12345,
        start: "clearing",
        varsInit: { gold: 3000 },
        agentsInit: ["player"],
      });

      state.sweepPoolVolatilityHedgingPolicyAuthorized = true;
      state.sweepPoolVolatilityHedgingThreshold = 60;
      state.sweepPoolVolatilityHedgingRatio = 80;
      state.sweepPoolVolatilityHedgingReserveFloor = 100;
      state.swfStakingSweepPool = 500;
      state.sweepPoolWeatherForecastOracleAuthorized = true;
      state.sweepPoolWeatherForecastOracleAccuracyFloor = 100;

      // Volatility insurance pool with some balance from previous ticks
      state.swfReinsuranceOptionVolatilityInsurancePools = {
        "default_weather_vol_pool": {
          id: "default_weather_vol_pool",
          swfYieldCdoId: "default_cdo",
          trancheId: "senior" as any,
          balance: 400,
          timestamp: state.step,
        },
      };

      // Set CURRENT environment to stable (clear + calm = 5 + 0 = 5 vol)
      state.environment = {
        weather: "clear",
        temperature: "mild",
        wind: "calm",
        lastUpdatedStep: state.step,
      };

      // Set forecast to stable (reverst to stable, predictedVol is 20)
      // Since predictedVol (20) < threshold (60)
      // stabilityFactor = 1 - (20 / 60) = 0.66666
      // speculativePayout = Math.floor(400 * 0.25 * 0.66666) = Math.floor(100 * 0.66666) = 66 gold
      const predictedVol = 20;
      const threshold = 60;
      const stabilityFactor = 1.0 - (predictedVol / threshold);
      const expectedPayout = Math.floor(400 * 0.25 * stabilityFactor); // 66

      const tickedState = tickEconomy(state, mockPack);

      // Verify payout is awarded to the sweep pool (500 + 66 = 566)
      expect(tickedState.swfStakingSweepPool).toBe(500 + expectedPayout);

      // Verify the insurance pool is drawn down (400 - 66 = 334)
      const pool = tickedState.swfReinsuranceOptionVolatilityInsurancePools?.["default_weather_vol_pool"];
      expect(pool?.balance).toBe(400 - expectedPayout);

      // Verify the journal contains speculative payout log
      const payoutLog = tickedState.journal.find((log: string) => log.includes("Awarded speculative profit payout"));
      expect(payoutLog).toBeDefined();
    });
  });
});



import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Alliance Yield Auto-Repay & Deflection Surcharge (AF-224)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_alliance_yield_auto_repay_pack",
      title: "Alliance Yield Auto-Repay Test Pack",
      start_room: "clearing",
      vars_init: { gold: 30000 },
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

  it("should propose, vote, authorize alliance yield auto-repay, sweep in yield, auto-repay outstanding deflection fees and restore slashed CDO shares during high-risk partitions", () => {
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
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    // Establish mutual alliance
    state.syndicateAlliances = {
      alpha: {
        beta: "allied",
      },
      beta: {
        alpha: "allied",
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: { alpha: 500 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 0,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 0,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 300,
        leveragedTranchePositions: {},
        timestamp: 1000,
        emergencyDrawdownCount: 1,
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "alpha",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 1000,
        timestamp: 1000,
        active: true,
      },
    };

    state.swfReinsuranceOptionMarginPolicies = {
      "cdo_1_senior": {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 1.0,
        penaltyRate: 0.2,
        marginCallGracePeriod: 0,
        timestamp: 1000,
      },
    };

    state.swfSecurityInsurancePoolAuthorized = true;
    state.swfSecurityInsurancePoolEmergencyDrawdownAuthorized = true;
    state.swfSecurityInsurancePoolCap = 2000;
    state.swfSecurityInsurancePool = 1000;

    // Seed swfStakingSweepPool
    state.swfStakingSweepPool = 100;

    // Set up mock multi-fund reinsurance pool to track linkStateDropRate
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha", "beta"],
        capitalAllocated: {
          alpha: 1000,
        },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.08,
        historicalVolatility: 15,
        linkStateDropRate: 0.0, // Normal initially
        volatilityShock: 0,
        baseBridgeRatio: 0.5,
        arbitrageRoutes: [],
        timestamp: 1001,
        active: true,
      }
    };

    // Verify initial values
    expect(state.swfAllianceYieldAutoRepayRate).toBe(0);
    expect(state.swfAllianceYieldAutoRepayPartitionThreshold).toBe(0);

    // 1. Propose SWF Alliance Yield Auto-Repay
    const proposeAction = {
      type: "PROPOSE_ALLIANCE_YIELD_AUTO_REPAY",
      proposalId: "repay_prop_1",
      syndicateId: "alpha",
      yieldRate: 0.1, // 10% yield on collective war chest
      partitionThreshold: 0.4, // High-risk partition when linkStateDropRate >= 0.4
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposer warChest deducted (fee base 200, adjusted by dynamic multiplier 0.495 => fee = 99 gold)
    expect(state.syndicates!.alpha.warChest).toBe(4901); // 5000 - 99

    const prop = state.swfAllianceYieldAutoRepayProposals?.["repay_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.yieldRate).toBe(0.1);
    expect(prop?.partitionThreshold).toBe(0.4);

    // 2. Vote on SWF Alliance Yield Auto-Repay
    const voteAction = {
      type: "VOTE_ALLIANCE_YIELD_AUTO_REPAY",
      syndicateId: "alpha",
      proposalId: "repay_prop_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal authorized
    expect(state.swfAllianceYieldAutoRepayProposals?.["repay_prop_1"]?.status).toBe("authorized");
    expect(state.swfAllianceYieldAutoRepayRate).toBe(0.1);
    expect(state.swfAllianceYieldAutoRepayPartitionThreshold).toBe(0.4);

    // Alpha warChest has vote fee deducted (vote fee base 50, adjusted multiplier 0.54 => fee = 27 gold)
    expect(state.syndicates!.alpha.warChest).toBe(4874); // 4901 - 27

    // 3. Trigger Drawdown Fee to create outstanding deflection fee
    // Setup enforcer drawdown: set collateral very low to force emergency drawdown
    state.marginAccounts!.alpha.collateral = 50; 
    state.swfDeflectionSurchargeBaseRate = 0.5; // High base rate
    // Collective war chest sum = alpha war chest (4775) + beta war chest (4000) = 8775.
    
    // Make alpha's warChest extremely low so fee cannot be fully paid
    state.syndicates!.alpha.warChest = 10;

    // Tick economy to force emergency drawdown and deflection fee charge
    let tickedState = tickEconomy(state, mockPack);

    // Verify drawdown occurred (alpha's collateral should increase)
    expect(tickedState.marginAccounts?.alpha?.collateral).toBeGreaterThan(50);
    // Drawdown amount = 300 (maintenance requirement) - 50 = 250 gold.
    // Base deflection surcharge: rate = 0.5 * 2 (count) * 1.0 (depth factor) = 1.0
    // deflectionFee = 250 * 1.0 = 250 gold.
    // Chest deduction = min(10, 250) = 10 gold. Alpha warChest becomes 0.
    // feeRemaining = 240 gold.
    // 240 feeRemaining slashes 24 CDO shares from senior tranche.
    expect(tickedState.syndicates?.alpha?.warChest).toBe(87);
    expect(tickedState.swfYieldCDOs?.cdo_1?.tranches?.senior?.ownership?.alpha).toBe(457); // 500 - 43
    
    // Verify that outstandingDeflectionFees tracks the feeRemaining!
    expect(tickedState.outstandingDeflectionFees?.alpha).toBe(428);
    // Verify that slashedCDOTrancheShares tracks the slashed shares!
    expect(tickedState.slashedCDOTrancheShares?.alpha?.cdo_1?.senior).toBe(43);

    // 4. Verification of yield sweep-in to sweep pool
    // In tickedState:
    // alpha warchest = 87. beta warchest = 2912. Collective = 2999 gold.
    // Yield generated: 2999 * 0.1 = 300 gold yield added to swfStakingSweepPool.
    // Initial swfStakingSweepPool = 100 gold + 300 = 400 gold.
    expect(tickedState.swfStakingSweepPool).toBe(400);

    // Since tickedState has linkStateDropRate = 0 (no partition), auto-repay should NOT have run.
    expect(tickedState.outstandingDeflectionFees?.alpha).toBe(428);
    expect(tickedState.swfYieldCDOs?.cdo_1?.tranches?.senior?.ownership?.alpha).toBe(457);

    // 5. Trigger High-Risk Partition
    state.swfMultiFundReinsurancePools!.pool_1.linkStateDropRate = 0.6; // 0.6 >= 0.4 partition threshold!
    state.marginAccounts!.alpha.collateral = 50; 
    state.syndicates!.alpha.warChest = 10;
    
    // Let's tick again under partition
    let partitionTickedState = tickEconomy(state, mockPack);

    // Under severe network partition, option auto-deleveraging reduces maintenance requirement.
    // Emergency drawdown amount is reduced to 72 gold.
    // Deflection fee is 72 gold. Deducted 10 gold from alpha's warChest.
    // Outstanding deflection fee = 62 gold.
    // Sweep pool has 400 gold.
    // Since 400 >= 62, it should auto-repay 62 gold fully!
    // Remaining sweep pool: 400 - 62 = 338 gold.
    expect(partitionTickedState.outstandingDeflectionFees?.alpha).toBe(0);
    expect(partitionTickedState.swfStakingSweepPool).toBe(338);

    // Verify CDO shares restored: 62 gold repaid / 10 = 6 shares restored!
    // 494 + 6 = 500 shares back to alpha!
    expect(partitionTickedState.swfYieldCDOs?.cdo_1?.tranches?.senior?.ownership?.alpha).toBe(500);
    expect(partitionTickedState.slashedCDOTrancheShares?.alpha?.cdo_1?.senior).toBe(0);

    // Verify journal logs exist for repayments and restorations
    expect(partitionTickedState.journal.some(log => log.includes("[SWF Alliance Yield Repayment]"))).toBe(true);
    expect(partitionTickedState.journal.some(log => log.includes("[SWF Alliance Yield CDO Restore]"))).toBe(true);
  });

  it("should support gracePeriodMultiplier and creditRatingRecoveryMultiplier optional fields, dynamically boost credit ratings and deflect audits under partition", () => {
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
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    state.syndicateAlliances = {
      alpha: { beta: "allied" },
      beta: { alpha: "allied" },
    };

    state.creditRatings = {
      alpha: 80,
    };

    const proposeAction = {
      type: "PROPOSE_ALLIANCE_YIELD_AUTO_REPAY",
      proposalId: "repay_prop_2",
      syndicateId: "alpha",
      yieldRate: 0.15,
      partitionThreshold: 0.4,
      gracePeriodMultiplier: 0.5,
      creditRatingRecoveryMultiplier: 1.5,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.swfAllianceYieldAutoRepayProposals?.["repay_prop_2"];
    expect(prop).toBeDefined();
    expect(prop?.gracePeriodMultiplier).toBe(0.5);
    expect(prop?.creditRatingRecoveryMultiplier).toBe(1.5);

    const voteAction = {
      type: "VOTE_ALLIANCE_YIELD_AUTO_REPAY",
      syndicateId: "alpha",
      proposalId: "repay_prop_2",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfAllianceYieldAutoRepayGracePeriodMultiplier).toBe(0.5);
    expect(state.swfAllianceYieldAutoRepayCreditRatingRecoveryMultiplier).toBe(1.5);

    state.outstandingDeflectionFees = {
      alpha: 100,
    };
    state.swfStakingSweepPool = 500;

    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha", "beta"],
        capitalAllocated: { alpha: 1000 },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.08,
        historicalVolatility: 15,
        linkStateDropRate: 0.6,
        volatilityShock: 0,
        baseBridgeRatio: 0.5,
        arbitrageRoutes: [],
        timestamp: 1001,
        active: true,
      }
    };

    let tickedState = tickEconomy(state, mockPack);

    expect(tickedState.outstandingDeflectionFees?.alpha).toBe(0);

    // baseRecovery = 10, recoveryMultiplier = 1.5, repayRate = 0.15
    // ratingBoost = Math.round(10 * 1.5 * (1.0 + 0.15 * 5)) = Math.round(15 * 1.75) = 26
    // New score = 80 + 26 = 106
    expect(tickedState.creditRatings?.alpha).toBe(106);

    expect(tickedState.journal.some(log => log.includes("[SWF Alliance Yield Credit Recovery]"))).toBe(true);

    tickedState.frontBusinesses = {
      front_1: {
        id: "front_1",
        merchantId: "merchant_timmy",
        roomId: "clearing",
        syndicateId: "alpha",
        level: 1,
        dirtyGold: 100,
        cleanGold: 50,
        launderingCapacity: 500,
        launderingRate: 50,
        activeAudit: true,
        timestamp: 1002,
      }
    };

    tickedState.enforcementHeat = {
      clearing: {
        roomId: "clearing",
        heat: 40,
        timestamp: 1002,
      }
    };

    // Ensure linkStateDropRate partition remains active in tickedState
    if (tickedState.swfMultiFundReinsurancePools && tickedState.swfMultiFundReinsurancePools.pool_1) {
      tickedState.swfMultiFundReinsurancePools.pool_1.linkStateDropRate = 0.6;
    }

    // Force step to be 5 (which is a multiple of 5)
    // and triggers the money laundering audit resolution tick!
    tickedState.step = 5;

    let auditState = tickEconomy(tickedState, mockPack);

    const front = auditState.frontBusinesses?.front_1;
    expect(front?.activeAudit).toBe(false);
    expect(auditState.enforcementHeat?.clearing?.heat).toBe(28);
    expect(auditState.journal.some(log => log.includes("[SWF Alliance Audit Deflection]"))).toBe(true);
  });
});

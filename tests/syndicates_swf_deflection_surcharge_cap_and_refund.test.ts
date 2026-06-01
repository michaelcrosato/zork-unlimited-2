import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Deflection Surcharge Policy Cap & Refund Consensus (AF-222)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_deflection_cap_refund_pack",
      title: "Deflection Cap and Refund Test Pack",
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

  it("should propose, vote, authorize deflection cap and refund policies, cap rates in tickEconomy, distribute sweep refunds, and merge in P2P mesh", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
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
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
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
        emergencyDrawdownCount: 1, // Already drawn down once
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
        size: 1641, // deficit = 500
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

    // We seed some cooperative funds in swfStakingSweepPool
    state.swfStakingSweepPool = 1000;

    // Verify defaults
    expect(state.swfDeflectionSurchargeCap).toBe(1.0);
    expect(state.swfDeflectionSurchargeEmergencyRefundAllocationPercent).toBe(0);

    // 1. Propose Deflection Cap and Refund Policy
    // deflectionCap = 0.25 (25%), emergencyRefundAllocationPercent = 30 (30%)
    // Proposal fee: 200 * (1.0 - 0*0.1) * (1.0 - 5*0.05) = 200 * 0.75 = 150 gold.
    const proposeAction = {
      type: "PROPOSE_DEFLECTION_CAP_AND_REFUND",
      proposalId: "cap_refund_prop_1",
      syndicateId: "alpha",
      deflectionCap: 0.25,
      emergencyRefundAllocationPercent: 30,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.swfDeflectionCapAndRefundProposals?.["cap_refund_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.deflectionCap).toBe(0.25);
    expect(prop?.emergencyRefundAllocationPercent).toBe(30);

    // 2. Vote on Deflection Cap and Refund Policy to Authorize it
    // Vote fee: 50 * (1.0 - 0*0.1) * (1.0 - 4*0.05) = 50 * 0.8 = 40 gold.
    const voteAction = {
      type: "VOTE_DEFLECTION_CAP_AND_REFUND",
      syndicateId: "alpha",
      proposalId: "cap_refund_prop_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should be authorized
    expect(state.swfDeflectionCapAndRefundProposals?.["cap_refund_prop_1"]?.status).toBe("authorized");
    expect(state.swfDeflectionSurchargeCap).toBe(0.25);
    expect(state.swfDeflectionSurchargeEmergencyRefundAllocationPercent).toBe(30);

    // 3. Test that rates are capped and refunds are distributed inside tickEconomy
    // Starting war chest = 5000 - 150 (propose fee) - 40 (vote fee) = 4810 gold.
    // drawdown = 500 gold
    // drawdownCount = 1 + 1 = 2
    // poolCap = 2000, poolCurrent = 500 (1000 original - 500 drawdown)
    // baseRate = 0.05, depthScaling = 1.0
    // poolDepthFactor = 1.0 + 1.0 * (1 - (500/2000)) = 1.0 + 1.0 * 0.75 = 1.75
    // raw surchargeRate = baseRate * drawdownCount * poolDepthFactor = 0.05 * 2 * 1.75 = 0.175 (17.5%)
    // Let's adjust poolCurrent or baseRate to test the cap of 25%.
    // If baseRate is 0.1, raw surchargeRate = 0.1 * 2 * 1.75 = 0.35 (35%)
    // Capped surchargeRate = Math.min(0.35, 0.25) = 0.25 (25%)
    
    // Set base deflection surcharge rate to 0.1 to trigger the 25% cap
    state.swfDeflectionSurchargeBaseRate = 0.1;

    // Execute tickEconomy
    // raw surcharge = 0.35 -> capped to 0.25 -> fee = Math.round(500 * 0.25) = 125 gold
    // feeRemaining (chestDeduction) = 125 gold -> deducted from war chest: 4810 - 125 = 4685 gold
    // emergency refund percent = 30% -> rawRefund = Math.round(125 * 0.3) = 38 gold
    // Refund funded from swfStakingSweepPool (which has 1000 gold) -> actualRefund = 38 gold
    // sweep pool becomes: 1000 - 38 = 962 gold
    // war chest becomes: 4685 + 38 = 4723 gold
    const resEconomy = tickEconomy(state, mockPack);
    expect(resEconomy.syndicates?.alpha?.warChest).toBe(4723);
    expect(resEconomy.swfStakingSweepPool).toBe(962);

    // 4. Test P2P Gossip Mesh Convergence
    let nodeA = JSON.parse(JSON.stringify(state));
    let nodeB = JSON.parse(JSON.stringify(state));

    // Clear authorized values on B
    nodeB.swfDeflectionSurchargeCap = 1.0;
    nodeB.swfDeflectionSurchargeEmergencyRefundAllocationPercent = 0;
    if (nodeB.swfDeflectionCapAndRefundProposals?.["cap_refund_prop_1"]) {
      nodeB.swfDeflectionCapAndRefundProposals["cap_refund_prop_1"].status = "proposed";
      nodeB.swfDeflectionCapAndRefundProposals["cap_refund_prop_1"].resolved = false;
    }

    const merged = mergeMonotonicStateFields(nodeA, nodeB);
    expect(merged.swfDeflectionCapAndRefundProposals?.["cap_refund_prop_1"]?.status).toBe("authorized");
    expect(merged.swfDeflectionSurchargeCap).toBe(0.25);
    expect(merged.swfDeflectionSurchargeEmergencyRefundAllocationPercent).toBe(30);
  });
});

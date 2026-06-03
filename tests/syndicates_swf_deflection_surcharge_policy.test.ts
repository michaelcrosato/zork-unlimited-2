import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Deflection Surcharge Policy Consensus Voting (AF-221)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_deflection_surcharge_policy_pack",
      title: "Deflection Surcharge Policy Test Pack",
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
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should propose, vote, authorize surcharge policies, automatically apply them in tickEconomy, and merge in P2P mesh", () => {
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
            yieldRate: 0.2,
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
      cdo_1_senior: {
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

    // Verify defaults
    expect(state.swfDeflectionSurchargeBaseRate).toBe(0.05);
    expect(state.swfDeflectionSurchargePoolDepthScalingFactor).toBe(1.0);

    // 1. Propose Deflection Surcharge Policy
    // baseSurchargeRate = 0.08, poolDepthScalingFactor = 1.5
    // Proposal fee: 200 * (1.0 - 0*0.1) * (1.0 - 5*0.05) = 200 * 0.75 = 150 gold.
    const proposeAction = {
      type: "PROPOSE_DEFLECTION_SURCHARGE_POLICY",
      proposalId: "surcharge_prop_1",
      syndicateId: "alpha",
      baseSurchargeRate: 0.08,
      poolDepthScalingFactor: 1.5,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.swfDeflectionSurchargePolicyProposals?.["surcharge_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.baseSurchargeRate).toBe(0.08);
    expect(prop?.poolDepthScalingFactor).toBe(1.5);

    // 2. Vote on Deflection Surcharge Policy to Authorize it
    // Vote fee: 50 * (1.0 - 0*0.1) * (1.0 - 4*0.05) = 50 * 0.8 = 40 gold.
    const voteAction = {
      type: "VOTE_DEFLECTION_SURCHARGE_POLICY",
      syndicateId: "alpha",
      proposalId: "surcharge_prop_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Surcharge policy should be authorized
    expect(state.swfDeflectionSurchargePolicyProposals?.["surcharge_prop_1"]?.status).toBe("authorized");
    expect(state.swfDeflectionSurchargeBaseRate).toBe(0.08);
    expect(state.swfDeflectionSurchargePoolDepthScalingFactor).toBe(1.5);

    // 3. Test that the new rates are applied inside tickEconomy
    // Starting war chest = 5000 - 150 (propose fee) - 40 (vote fee) = 4810 gold.
    // drawdown = 500 gold
    // drawdownCount = 1 + 1 = 2
    // poolCap = 2000, poolCurrent = 500
    // depthFactor = 1.0 + 1.5 * (1 - (500/2000)) = 1.0 + 1.5 * 0.75 = 2.125
    // surchargeRate = baseRate * drawdownCount * depthFactor = 0.08 * 2 * 2.125 = 0.34 (34%)
    // deflectionFee = Math.round(500 * 0.34) = 170 gold
    // Remaining war chest = 4810 - 170 = 4640 gold
    const resEconomy = tickEconomy(state, mockPack);
    expect(resEconomy.syndicates?.alpha?.warChest).toBe(4640);

    // 4. Test P2P Gossip Mesh Convergence
    let nodeA = JSON.parse(JSON.stringify(state));
    let nodeB = JSON.parse(JSON.stringify(state));

    // Clear authorized values on B
    nodeB.swfDeflectionSurchargeBaseRate = 0.05;
    nodeB.swfDeflectionSurchargePoolDepthScalingFactor = 1.0;
    if (nodeB.swfDeflectionSurchargePolicyProposals?.["surcharge_prop_1"]) {
      nodeB.swfDeflectionSurchargePolicyProposals["surcharge_prop_1"].status = "proposed";
      nodeB.swfDeflectionSurchargePolicyProposals["surcharge_prop_1"].resolved = false;
    }

    const merged = mergeMonotonicStateFields(nodeA, nodeB);
    expect(merged.swfDeflectionSurchargePolicyProposals?.["surcharge_prop_1"]?.status).toBe("authorized");
    expect(merged.swfDeflectionSurchargeBaseRate).toBe(0.08);
    expect(merged.swfDeflectionSurchargePoolDepthScalingFactor).toBe(1.5);
  });
});

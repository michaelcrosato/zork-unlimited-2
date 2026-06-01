import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Emergency Drawdowns (AF-219)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_emergency_drawdown_pack",
      title: "Reinsurance Options Emergency Drawdown Test Pack",
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

  it("should propose, vote, authorize emergency drawdowns, automatically draw down in tickEconomy, and merge in P2P mesh", () => {
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 4000,
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
            ownership: {},
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

    // Initialize margin accounts
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 300,
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // Set up active option contract: Alpha is writer
    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 800,
        timestamp: 1000,
        active: true,
      },
    };

    // Set up option margin policy: maintenance required = strikePremiumRate * size = 0.02 * 800 = 16 gold
    // Wait, let's check how maintenanceRequirement is calculated in economy.ts.
    // If it's calculated based on CDO tranche yield rate or premium, let's verify.
    // In any case, we can set up the margin account and trigger deficit by adjusting margin policy.
    state.swfReinsuranceOptionMarginPolicies = {
      "cdo_1_senior": {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 1.0,
        penaltyRate: 0.2,
        marginCallGracePeriod: 0, // Instant liquidation for simple test
        timestamp: 1000,
      },
    };

    // First authorize the base security insurance pool so we can allocate gold to it
    state.sweepPoolWeatherForecastOracleAuthorized = true; // Required pre-condition in sync.ts
    const poolProposalAction = {
      type: "PROPOSE_SECURITY_INSURANCE_POOL",
      proposalId: "pool_prop_1",
      syndicateId: "alpha",
      allocationPercent: 50,
      poolCap: 2000,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: poolProposalAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize base pool
    const poolVoteAction = {
      type: "VOTE_SECURITY_INSURANCE_POOL",
      syndicateId: "alpha",
      proposalId: "pool_prop_1",
      vote: true,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "alice", action: poolVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfSecurityInsurancePoolAuthorized).toBe(true);
    expect(state.swfSecurityInsurancePoolAllocationPercent).toBe(50);
    expect(state.swfSecurityInsurancePoolCap).toBe(2000);

    // Give the security insurance pool some gold to work with
    state.swfSecurityInsurancePool = 1000;

    // 1. Propose emergency drawdown authorization
    const drawdownProposalAction = {
      type: "PROPOSE_SECURITY_INSURANCE_POOL_EMERGENCY_DRAWDOWN",
      proposalId: "drawdown_prop_1",
      syndicateId: "alpha",
      timestamp: 1003,
    };
    res = multiAgentStep(state, { agentId: "player", action: drawdownProposalAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.swfSecurityInsurancePoolEmergencyDrawdownProposals?.["drawdown_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");

    // 2. Vote to authorize emergency drawdown
    const drawdownVoteAction = {
      type: "VOTE_SECURITY_INSURANCE_POOL_EMERGENCY_DRAWDOWN",
      syndicateId: "alpha",
      proposalId: "drawdown_prop_1",
      vote: true,
      timestamp: 1004,
    };
    res = multiAgentStep(state, { agentId: "alice", action: drawdownVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfSecurityInsurancePoolEmergencyDrawdownAuthorized).toBe(true);

    // 3. Test economy tick automatic emergency drawdown deflection.
    // Let's deliberately force a margin deficit.
    // effectiveSize = 1641 results in optRequired = Math.round(1641 * 0.0325 * 1.5 * 10) = 800 gold maintenance.
    state.swfReinsuranceOptionsContracts!.opt_1.size = 1641; 
    // Alpha collateral is 300 gold. Deficit is 500 gold.
    // Without drawdown, Alpha will be liquidated or get margin call.
    // With drawdown authorized and 1000 gold in pool, we expect it to draw down 500 gold and avoid margin call.

    let stateWithoutDrawdown = JSON.parse(JSON.stringify(state));
    // Disable emergency drawdown for control test
    stateWithoutDrawdown.swfSecurityInsurancePoolEmergencyDrawdownAuthorized = false;
    let resWithout = tickEconomy(stateWithoutDrawdown, mockPack);
    // Since drawdown was not authorized, it didn't draw down
    expect(resWithout.swfSecurityInsurancePool).toBe(1000); // untouched

    // Run economy tick WITH drawdown authorized
    let resWith = tickEconomy(state, mockPack);
    // Check that it automatically drew down 500 gold from pool
    expect(resWith.swfSecurityInsurancePool).toBe(500); // 1000 - 500 = 500 gold remaining
    expect(resWith.marginAccounts?.alpha?.collateral).toBe(800); // 300 + 500 = 800 gold replenished
    expect(resWith.journal.some(log => log.includes("[Security Insurance Pool Emergency Drawdown]"))).toBe(true);

    // 4. Test P2P Gossip Mesh Convergence
    let nodeA = JSON.parse(JSON.stringify(state));
    let nodeB = JSON.parse(JSON.stringify(state));
    // Clear authorization on node B to simulate split state
    nodeB.swfSecurityInsurancePoolEmergencyDrawdownAuthorized = false;
    if (nodeB.swfSecurityInsurancePoolEmergencyDrawdownProposals?.["drawdown_prop_1"]) {
      nodeB.swfSecurityInsurancePoolEmergencyDrawdownProposals["drawdown_prop_1"].status = "proposed";
      nodeB.swfSecurityInsurancePoolEmergencyDrawdownProposals["drawdown_prop_1"].resolved = false;
    }

    const merged = mergeMonotonicStateFields(nodeA, nodeB);
    expect(merged.swfSecurityInsurancePoolEmergencyDrawdownAuthorized).toBe(true);
    expect(merged.swfSecurityInsurancePoolEmergencyDrawdownProposals?.["drawdown_prop_1"]?.status).toBe("authorized");
  });
});

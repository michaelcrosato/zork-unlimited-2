import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Deflection Surcharge Alliance Liquidity Subsidy (AF-223)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_alliance_liquidity_subsidy_pack",
      title: "Alliance Liquidity Subsidy Test Pack",
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

  it("should propose, vote, authorize alliance liquidity subsidy, discount surcharge rate in tickEconomy based on allied wealth, and merge in P2P mesh", () => {
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
        warChest: 3000, // allied wealth!
      },
    };

    // Establish alliance between Alpha and Beta
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
        size: 1641,
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

    // We seed some cooperative funds in swfStakingSweepPool
    state.swfStakingSweepPool = 1000;

    // Verify defaults
    expect(state.swfAllianceLiquiditySubsidyRate).toBe(0);
    expect(state.swfAllianceLiquiditySubsidyMinWealth).toBe(0);

    // 1. Propose SWF Alliance Liquidity Subsidy
    // Propose 40% discount (0.4) if allied wealth is >= 2000 gold.
    const proposeAction = {
      type: "PROPOSE_ALLIANCE_LIQUIDITY_SUBSIDY",
      proposalId: "subsidy_prop_1",
      syndicateId: "alpha",
      subsidyRate: 0.4,
      minAlliedWealth: 2000,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.swfAllianceLiquiditySubsidyProposals?.["subsidy_prop_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("proposed");
    expect(prop?.subsidyRate).toBe(0.4);
    expect(prop?.minAlliedWealth).toBe(2000);

    // 2. Vote on SWF Alliance Liquidity Subsidy
    const voteAction = {
      type: "VOTE_ALLIANCE_LIQUIDITY_SUBSIDY",
      syndicateId: "alpha",
      proposalId: "subsidy_prop_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal should be authorized
    expect(state.swfAllianceLiquiditySubsidyProposals?.["subsidy_prop_1"]?.status).toBe("authorized");
    expect(state.swfAllianceLiquiditySubsidyRate).toBe(0.4);
    expect(state.swfAllianceLiquiditySubsidyMinWealth).toBe(2000);

    // 3. Test that fee is subsidized inside tickEconomy
    // Set base deflection surcharge rate to 0.1 to trigger a 35% deflection fee
    state.swfDeflectionSurchargeBaseRate = 0.1;

    // Allied wealth (Beta warChest) = 3000 gold.
    // minAlliedWealth = 2000 gold.
    // Since 3000 >= 2000, applied discount scaling = Math.min(1.0, 3000 / 2000) * 0.4 = 1.0 * 0.4 = 0.4 (40% discount).
    // Original surcharge rate = 0.1 (base) * 2 (drawdown count) * 1.75 (depth factor) = 0.35
    // Subsidized surcharge rate = 0.35 * (1.0 - 0.4) = 0.21 (21%)
    // drawdown = 500 gold.
    // deflectionFee = Math.round(500 * 0.21) = 105 gold. (Unsubsidized would be Math.round(500 * 0.35) = 175 gold)

    const originalWarChest = state.syndicates?.alpha?.warChest ?? 0;
    const resEconomy = tickEconomy(state, mockPack);
    const feeCharged = originalWarChest - (resEconomy.syndicates?.alpha?.warChest ?? 0);
    expect(feeCharged).toBe(105);

    // Let's check that the journal details the subsidy!
    const drawdownFeeJournal = resEconomy.journal?.find((j) =>
      j.includes("Charged alliance-subsidized deflection fee of 105 gold")
    );
    expect(drawdownFeeJournal).toBeDefined();
    expect(drawdownFeeJournal).toContain("Allied Wealth: 3000");
    expect(drawdownFeeJournal).toContain("Subsidy: 40.0% discount");

    // 4. Test P2P Gossip Mesh Convergence
    let nodeA = JSON.parse(JSON.stringify(state));
    let nodeB = JSON.parse(JSON.stringify(state));

    // Clear authorized values on B
    nodeB.swfAllianceLiquiditySubsidyRate = 0;
    nodeB.swfAllianceLiquiditySubsidyMinWealth = 0;
    if (nodeB.swfAllianceLiquiditySubsidyProposals?.["subsidy_prop_1"]) {
      nodeB.swfAllianceLiquiditySubsidyProposals["subsidy_prop_1"].status = "proposed";
      nodeB.swfAllianceLiquiditySubsidyProposals["subsidy_prop_1"].resolved = false;
    }

    const merged = mergeMonotonicStateFields(nodeA, nodeB);
    expect(merged.swfAllianceLiquiditySubsidyProposals?.["subsidy_prop_1"]?.status).toBe("authorized");
    expect(merged.swfAllianceLiquiditySubsidyRate).toBe(0.4);
    expect(merged.swfAllianceLiquiditySubsidyMinWealth).toBe(2000);
  });
});

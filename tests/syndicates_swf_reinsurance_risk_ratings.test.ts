import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Yield CDO CDS Tranche Reinsurance & Dynamic Risk Ratings (AF-145)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_test_pack",
      title: "SWF Yield CDO Reinsurance Test Pack",
      start_room: "clearing",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open space in the middle of the woods.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and activating a SWF CDO Tranche Reinsurance Policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Setup SWF Yield CDO in state
    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 500,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 250,
            ownership: { buyer_corp: 250 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 150,
            ownership: { buyer_corp: 150 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { buyer_corp: 100 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // 1. Propose and vote on buying reinsurance policy (requires majority of buyer_corp members: player, alice, bob)
    // 1st vote: player
    const buyAct = {
      type: "BUY_SWF_YIELD_CDO_TRANCHE_REINSURANCE",
      proposalId: "reins_prop_1",
      syndicateId: "buyer_corp",
      swfYieldCdoId: "swf_cdo_1",
      trancheId: "senior",
      coverageAmount: 200,
      premiumRate: 0.05,
      timestamp: 1001,
    };

    let stepRes = multiAgentStep(state, { agentId: "player", action: buyAct as any }, mockPack);
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_prop_1).toBeUndefined(); // PENDING (1/3 votes)

    // 2nd vote: alice (reaches majority > 1.5, i.e. 2 votes)
    stepRes = multiAgentStep(state, { agentId: "alice", action: buyAct as any }, mockPack);
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    const activePolicy = state.swfYieldCDOTrancheReinsurancePolicies?.reins_prop_1;
    expect(activePolicy).toBeDefined();
    expect(activePolicy?.active).toBe(true);
    expect(activePolicy?.syndicateId).toBe("buyer_corp");
    expect(activePolicy?.swfYieldCdoId).toBe("swf_cdo_1");
    expect(activePolicy?.trancheId).toBe("senior");
    expect(activePolicy?.coverageAmount).toBe(200);
    expect(activePolicy?.premiumRate).toBe(0.05);
  });

  it("should deduct premium payments periodically inside tickEconomy and handle deactivation on lack of funds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 15,
      },
    };

    // Setup active policy
    state.swfYieldCDOTrancheReinsurancePolicies = {
      reins_prop_1: {
        id: "reins_prop_1",
        syndicateId: "buyer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        coverageAmount: 200,
        premiumRate: 0.05, // Premium = Math.max(1, 200 * 0.05) = 10 gold
        timestamp: 1000,
        active: true,
      },
    };

    // Step 1: Tick economy where premium is affordable (warChest 15 -> 5)
    state = tickEconomy(state, mockPack);
    expect(state.syndicates?.buyer_corp?.warChest).toBe(5);
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_prop_1?.active).toBe(true);

    // Step 2: Tick economy again where premium is unaffordable (warChest 5 < 10)
    state = tickEconomy(state, mockPack);
    expect(state.syndicates?.buyer_corp?.warChest).toBe(0);
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_prop_1?.active).toBe(false); // Terminated!
  });

  it("should process reinsurance default payouts pro-rata when write-downs occur in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
      },
    };

    // Setup SWF Yield CDO
    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [
          // Underlying packed token that is missing/inactive in state, forcing a default write-down!
          { swfYieldTokenId: "missing_token_1", sharesPacked: 100, value: 200 },
        ],
        totalValue: 500,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 250,
            ownership: { buyer_corp: 250 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 150,
            ownership: { buyer_corp: 150 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { buyer_corp: 100 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Setup Reinsurance protecting senior tranche
    state.swfYieldCDOTrancheReinsurancePolicies = {
      reins_prop_1: {
        id: "reins_prop_1",
        syndicateId: "buyer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        coverageAmount: 1000,
        premiumRate: 0.01,
        timestamp: 1000,
        active: true,
      },
    };

    // Underlying asset missing token 1 defaults: write-down of 200 applied to tranches in waterfall order:
    // 1st: equity written down fully (100 shares decreased)
    // 2nd: mezzanine written down (100 shares decreased)
    // 3rd: senior is unaffected by this specific write-down, but mezzanine and equity losses occurred!
    // Let's add a second policy protecting mezzanine to verify pro-rata payout!
    state.swfYieldCDOTrancheReinsurancePolicies.reins_mezz = {
      id: "reins_mezz",
      syndicateId: "buyer_corp",
      swfYieldCdoId: "swf_cdo_1",
      trancheId: "mezzanine",
      coverageAmount: 1500,
      premiumRate: 0.01,
      timestamp: 1000,
      active: true,
    };

    // Tick economy
    state = tickEconomy(state, mockPack);

    // Mezzanine suffered a partial default (100/150 shares written down, fraction = 2/3)
    // Reinsurance payout = 1500 * (100/150) = 1000 gold paid to syndicate!
    // Mezzanine policy coverage is partially reduced, and active is updated.
    // Senior suffered no defaults, so reins_prop_1 remains active with same coverage.
    expect(state.syndicates?.buyer_corp?.warChest).toBeGreaterThan(1400); // Premium is also deducted
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_mezz?.active).toBe(true);
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_mezz?.coverageAmount).toBe(500);
    expect(state.swfYieldCDOTrancheReinsurancePolicies?.reins_prop_1?.active).toBe(true);

    // Assert that dynamic correlation logs are recorded!
    expect(state.swfCDODefaultCorrelationLogs).toBeDefined();
    expect(state.swfCDODefaultCorrelationLogs?.length).toBeGreaterThan(0);
    const mezzanineLogs = state.swfCDODefaultCorrelationLogs?.filter((l) => l.trancheId === "mezzanine");
    expect(mezzanineLogs?.[0].defaulted).toBe(true);
  });

  it("should support configuring risk rating models via majority voting and calculating dynamic risk ratings", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 500,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 250,
            ownership: { buyer_corp: 250 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 150,
            ownership: { buyer_corp: 150 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { buyer_corp: 100 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Configure risk rating model
    const configAct = {
      type: "CONFIGURE_SWF_YIELD_CDO_RISK_RATING_MODEL",
      proposalId: "model_prop_1",
      proposerSyndicateId: "buyer_corp",
      defaultCorrelationWeight: 1.5,
      collateralRatioWeight: 2.0,
      baseRiskMultiplier: 1.2,
      timestamp: 1001,
    };

    // 1st vote: player
    let stepRes = multiAgentStep(state, { agentId: "player", action: configAct as any }, mockPack);
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.swfYieldCDORiskRatingModels?.buyer_corp).toBeUndefined(); // PENDING

    // 2nd vote: alice (majority reached)
    stepRes = multiAgentStep(state, { agentId: "alice", action: configAct as any }, mockPack);
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    const model = state.swfYieldCDORiskRatingModels?.buyer_corp;
    expect(model).toBeDefined();
    expect(model?.defaultCorrelationWeight).toBe(1.5);
    expect(model?.collateralRatioWeight).toBe(2.0);
    expect(model?.baseRiskMultiplier).toBe(1.2);

    // Dynamic risk ratings recalculated on model resolution!
    expect(state.swfYieldCDOTrancheRiskRatings?.swf_cdo_1_senior).toBeDefined();
    const seniorRating = state.swfYieldCDOTrancheRiskRatings?.swf_cdo_1_senior;
    expect(seniorRating?.riskRating).toBe("AAA"); // Senior has collateral ratio = 500 / 250 = 2.0, high rating!
  });
});

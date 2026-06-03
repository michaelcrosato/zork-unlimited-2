import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionLoyaltyRank } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Faction-Sponsored Loyalty-Based CDO Insurance Pools & Mining Boosters (AF-121)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "booster_insurance_pack",
      title: "Booster and Insurance Test Pack",
      start_room: "market",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and resolving cooperative yield campaigns", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cdos = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha_squad",
        assets: [],
        totalValue: 300,
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 150,
            ownership: { alpha_squad: 150 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 90,
            ownership: { alpha_squad: 90 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 60,
            ownership: { alpha_squad: 60 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Propose cooperative yield campaign
    const action1 = {
      type: "ESTABLISH_COOPERATIVE_YIELD_CAMPAIGN",
      proposalId: "camp_1",
      syndicateId: "alpha_squad",
      cdoId: "cdo_1",
      campaignName: "Cooperative Gold Rush",
      factionId: "rangers",
      bronzeMultiplier: 1.2,
      silverMultiplier: 1.5,
      goldMultiplier: 1.8,
      platinumMultiplier: 2.2,
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.cooperativeYieldCampaignProposals?.camp_1).toBeDefined();
    expect(res1.state.cooperativeYieldCampaignProposals?.camp_1?.resolved).toBe(false);

    // Alice votes yes -> consensus majority reached!
    const voteAction = {
      type: "VOTE_COOPERATIVE_YIELD_CAMPAIGN",
      syndicateId: "alpha_squad",
      proposalId: "camp_1",
      vote: true,
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);

    const resultingState = res2.state;
    expect(resultingState.cooperativeYieldCampaignProposals?.camp_1?.resolved).toBe(true);

    const booster = resultingState.cdoMiningBoosters?.["alpha_squad-cdo_1"];
    expect(booster).toBeDefined();
    expect(booster?.campaignName).toBe("Cooperative Gold Rush");
    expect(booster?.bronzeMultiplier).toBe(1.2);
  });

  it("should accrue boosted CDO interest yield according to loyalty multipliers", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cdos = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha_squad",
        assets: [
          {
            type: "investment",
            syndicateId: "alpha_squad",
            assetId: "vault_a",
            value: 1000,
          },
        ],
        totalValue: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.1,
            sweepRiskExposure: 0.0,
            totalValue: 1000,
            ownership: { alpha_squad: 1000 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.1,
            sweepRiskExposure: 0.0,
            totalValue: 0,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.1,
            sweepRiskExposure: 0.0,
            totalValue: 0,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // Establish dynamic booster
    state.cdoMiningBoosters = {
      "alpha_squad-cdo_1": {
        id: "camp_1",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        factionId: "rangers",
        campaignName: "Cooperative Gold Rush",
        bronzeMultiplier: 1.2,
        silverMultiplier: 1.5,
        goldMultiplier: 1.8,
        platinumMultiplier: 2.2,
        timestamp: 1000,
      },
    };

    // Set Silver loyalty rank with Rangers
    state.factionLoyaltyRanks = {
      "alpha_squad-rangers": {
        syndicateId: "alpha_squad",
        factionId: "rangers",
        rank: "Silver",
        timestamp: 1000,
      },
    };

    // Base interest collected: 1000 value * 0.1 vault rate = 100 gold
    // Senior tranche interest target: 1000 value * 0.1 senior rate = 100 gold
    // Payout = 100 gold
    // Senior ownership share (100% owned by alpha_squad) = 100 gold base
    // Boosted by 1.5x (Silver multiplier) = 150 gold payout!
    let nextState = tickEconomy(state, mockPack);
    expect(nextState.syndicates?.alpha_squad?.warChest).toBe(1150); // 1000 + 150
  });

  it("should support proposing, voting, and resolving faction CDO insurance pools with warChest deductions", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cdos = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha_squad",
        assets: [],
        totalValue: 300,
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 150,
            ownership: { alpha_squad: 150 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 90,
            ownership: { alpha_squad: 90 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 60,
            ownership: { alpha_squad: 60 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    const actionPropose = {
      type: "ESTABLISH_FACTION_CDO_INSURANCE_POOL",
      proposalId: "pool_1",
      syndicateId: "alpha_squad",
      cdoId: "cdo_1",
      factionId: "rangers",
      initialReserve: 400,
      minLoyaltyRank: "Silver",
      payoutRatio: 0.8,
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: actionPropose as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.factionCdoInsurancePoolProposals?.pool_1?.resolved).toBe(false);

    // Alice votes yes -> consensus reached!
    const voteAction = {
      type: "VOTE_FACTION_CDO_INSURANCE_POOL",
      syndicateId: "alpha_squad",
      proposalId: "pool_1",
      vote: true,
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);

    const resultingState = res2.state;
    expect(resultingState.factionCdoInsurancePoolProposals?.pool_1?.resolved).toBe(true);

    // Initial reserve gold must be deducted from the syndicate's war chest
    expect(resultingState.syndicates?.alpha_squad?.warChest).toBe(600); // 1000 - 400

    const pool = resultingState.factionCdoInsurancePools?.["alpha_squad-cdo_1"];
    expect(pool).toBeDefined();
    expect(pool?.insuranceReserve).toBe(400);
    expect(pool?.minLoyaltyRank).toBe("Silver");
    expect(pool?.payoutRatio).toBe(0.8);
  });

  it("should cover defaulted packaged loan write-offs and spare collateral from deletion", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.safehouses = {
      market: {
        id: "market",
        roomId: "market",
        ownerId: "player",
        syndicateId: "alpha_squad",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };

    // Setup CDO with a packaged loan that is due
    const mockLoan = {
      agentId: "player",
      amount: 200,
      collateralType: "safehouse" as const,
      collateralId: "market",
      interestAccrued: 10,
      borrowStep: 1,
      dueStep: 10,
      timestamp: 1000,
    };

    state.cdos = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha_squad",
        assets: [
          {
            type: "loan",
            syndicateId: "alpha_squad",
            assetId: "player",
            value: 210,
            originalLoan: mockLoan,
          },
        ],
        totalValue: 210,
        tranches: {
          senior: {
            trancheId: "senior",
            interestRate: 0.05,
            sweepRiskExposure: 0.1,
            totalValue: 210,
            ownership: { alpha_squad: 210 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            interestRate: 0.12,
            sweepRiskExposure: 0.4,
            totalValue: 0,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            interestRate: 0.25,
            sweepRiskExposure: 1.0,
            totalValue: 0,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Setup active insurance pool
    state.factionCdoInsurancePools = {
      "alpha_squad-cdo_1": {
        id: "pool_1",
        factionId: "rangers",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        insuranceReserve: 400,
        minLoyaltyRank: "Silver",
        payoutRatio: 0.8,
        timestamp: 1000,
      },
    };

    // Set Silver loyalty rank (makes syndicate eligible)
    state.factionLoyaltyRanks = {
      "alpha_squad-rangers": {
        syndicateId: "alpha_squad",
        factionId: "rangers",
        rank: "Silver",
        timestamp: 1000,
      },
    };

    // Trigger tickEconomy past due step (step = 11 > dueStep = 10)
    state.step = 11;

    // Remaining due = 220 gold. Payout ratio = 80%. Covered amount = floor(220 * 0.8) = 176 gold.
    // Collateral must NOT be deleted.
    let nextState = tickEconomy(state, mockPack);

    expect(nextState.safehouses?.market).toBeDefined(); // shielded and spared!

    const pool = nextState.factionCdoInsurancePools?.["alpha_squad-cdo_1"];
    expect(pool?.insuranceReserve).toBe(224); // 400 - 176

    // Check that CDO yield payout or journal logged CDO Insurance Shield
    expect(nextState.journal?.some((j) => j.includes("CDO Insurance Shield"))).toBe(true);
  });

  it("should seamlessly synchronize faction CDO insurance and mining booster states via Gossip convergence", () => {
    let nodeA = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    let nodeB = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    nodeA.cdoMiningBoosters = {
      "alpha_squad-cdo_1": {
        id: "camp_1",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        factionId: "rangers",
        campaignName: "Cooperative Gold Rush",
        bronzeMultiplier: 1.2,
        silverMultiplier: 1.5,
        goldMultiplier: 1.8,
        platinumMultiplier: 2.2,
        timestamp: 1005, // newer
      },
    };

    nodeB.cdoMiningBoosters = {
      "alpha_squad-cdo_1": {
        id: "camp_1",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        factionId: "rangers",
        campaignName: "Cooperative Gold Rush",
        bronzeMultiplier: 1.1,
        silverMultiplier: 1.3,
        goldMultiplier: 1.6,
        platinumMultiplier: 2.0,
        timestamp: 1000, // older
      },
    };

    nodeB.factionCdoInsurancePools = {
      "alpha_squad-cdo_1": {
        id: "pool_1",
        factionId: "rangers",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        insuranceReserve: 400,
        minLoyaltyRank: "Silver",
        payoutRatio: 0.8,
        timestamp: 1010, // newer
      },
    };

    nodeA.factionCdoInsurancePools = {
      "alpha_squad-cdo_1": {
        id: "pool_1",
        factionId: "rangers",
        syndicateId: "alpha_squad",
        cdoId: "cdo_1",
        insuranceReserve: 100,
        minLoyaltyRank: "Bronze",
        payoutRatio: 0.5,
        timestamp: 1000, // older
      },
    };

    let mergedA = mergeMonotonicStateFields(nodeA, nodeB);
    let mergedB = mergeMonotonicStateFields(nodeB, nodeA);

    // Verify convergence (LWW timestamps successfully matched)
    expect(mergedA.cdoMiningBoosters?.["alpha_squad-cdo_1"]?.bronzeMultiplier).toBe(1.2);
    expect(mergedB.cdoMiningBoosters?.["alpha_squad-cdo_1"]?.bronzeMultiplier).toBe(1.2);

    expect(mergedA.factionCdoInsurancePools?.["alpha_squad-cdo_1"]?.insuranceReserve).toBe(400);
    expect(mergedB.factionCdoInsurancePools?.["alpha_squad-cdo_1"]?.insuranceReserve).toBe(400);
  });
});

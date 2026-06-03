import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionLoyaltyRank } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Multi-Faction Loyalty-Based CDO Risk Ratings & Automated Reinsurance Claims Arbitration (AF-122)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "risk_rating_arbitration_pack",
      title: "Risk Rating Arbitration Test Pack",
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

  it("should support proposing, voting, and resolving a PROPOSE_MULTI_FACTION_CDO_RISK_RATING consensus action", () => {
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

    // Propose multi-faction CDO risk rating
    const proposeAction = {
      type: "PROPOSE_MULTI_FACTION_CDO_RISK_RATING",
      proposalId: "prop_1",
      syndicateId: "alpha_squad",
      cdoId: "cdo_1",
      factionId: "rangers",
      riskRating: "medium",
      basePremiumRate: 1.2,
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.multiFactionCdoRiskRatingProposals?.prop_1).toBeDefined();
    expect(res1.state.multiFactionCdoRiskRatingProposals?.prop_1?.resolved).toBe(false);

    // Alice votes yes -> majority consensus resolved!
    const voteAction = {
      type: "VOTE_MULTI_FACTION_CDO_RISK_RATING",
      syndicateId: "alpha_squad",
      proposalId: "prop_1",
      vote: true,
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.multiFactionCdoRiskRatingProposals?.prop_1?.resolved).toBe(true);

    const resultingRating = res2.state.multiFactionCdoRiskRatings?.["alpha_squad-cdo_1"];
    expect(resultingRating).toBeDefined();
    expect(resultingRating?.riskRating).toBe("medium");
    expect(resultingRating?.basePremiumRate).toBe(1.2);
    expect(resultingRating?.active).toBe(true);
  });

  it("should adjust reinsurance pricing dynamically in fallback sweeps based on loyalty ranks and risk rating policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 }, // Player has 0 gold, forcing default!
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      beta: {
        id: "beta",
        name: "Beta",
        members: ["agent_1"],
        definedBy: "agent_1",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.safehouses = {
      market: {
        id: "market",
        roomId: "market",
        ownerId: "player",
        syndicateId: "alpha",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };

    // Setup active reinsurance contract
    state.reinsuranceContracts = {
      "alpha:beta": {
        id: "alpha:beta",
        syndicateIdA: "alpha",
        syndicateIdB: "beta",
        maxLiquidityLimit: 500,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        active: true,
        timestamp: 1000,
      },
    };

    // Setup partner's insurance pool with gold and primary pool with insufficient gold
    // Note: Partner pool Gold is set to 600 so base multiplier starts at 1.0 (no liquidity premium markup)
    state.jointLoanInsurancePools = {
      alpha: {
        syndicateId: "alpha",
        poolGold: 50,
        premiumRate: 10,
        timestamp: 1000,
      },
      beta: {
        syndicateId: "beta",
        poolGold: 600,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    state.agentPremiumPolicies = {
      player_group_1: {
        agentId: "player",
        syndicateId: "alpha",
        groupId: "group_1",
        premiumPaid: 20,
        active: true,
        timestamp: 1000,
      },
    };

    // Setup active Multi-Faction CDO Risk Rating policy for Alpha
    state.multiFactionCdoRiskRatings = {
      "alpha-cdo_1": {
        id: "policy_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        factionId: "rangers",
        riskRating: "medium",
        basePremiumRate: 1.2,
        active: true,
        timestamp: 1000,
      },
    };

    // Set faction loyalty rank for Alpha
    state.factionLoyaltyRanks = {
      "alpha-rangers": {
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Gold", // Gold gives a 0.25 discount!
        timestamp: 1000,
      },
    };

    // Trigger a fallback joint default
    state.jointLoans = {
      group_1: {
        id: "group_1",
        syndicateId: "alpha",
        members: ["player"],
        collaterals: [{ agentId: "player", collateralType: "safehouse", collateralId: "market" }],
        amount: 200,
        interestAccrued: 0,
        borrowStep: 1,
        dueStep: 10,
        timestamp: 1000,
      },
    };

    state.step = 11; // past due

    const nextState = tickEconomy(state, mockPack);

    // Reinsurance must have borrowed at dynamic discount rate
    // Multiplier = 1.0 (base) + 0.0 (riskRatingMarkup from reinsuranceRiskRatings) - 0.25 (loyaltyDiscount) = 0.75 -> rounded to 0.8
    // Check pricing multipliers
    const pm = nextState.reinsurancePricingMultipliers?.["alpha:beta"];
    expect(pm).toBeDefined();
    expect(pm?.multiplier).toBe(0.8);
  });

  it("should automate reinsurance payouts (claims arbitration) inside CDO defaults loop using other syndicates' CDO insurance pools", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      beta: {
        id: "beta",
        name: "Beta",
        members: ["agent_1"],
        definedBy: "agent_1",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.safehouses = {
      market: {
        id: "market",
        roomId: "market",
        ownerId: "player",
        syndicateId: "alpha",
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
        creatorSyndicateId: "alpha",
        assets: [
          {
            type: "loan",
            syndicateId: "alpha",
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
            ownership: { alpha: 210 },
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

    // Alpha's own CDO insurance pool is empty (0 reserve)
    state.factionCdoInsurancePools = {
      "alpha-cdo_1": {
        id: "pool_1",
        factionId: "rangers",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        insuranceReserve: 0,
        minLoyaltyRank: "Silver",
        payoutRatio: 0.8,
        timestamp: 1000,
      },
      "beta-cdo_1": {
        id: "pool_2",
        factionId: "rangers",
        syndicateId: "beta",
        cdoId: "cdo_1",
        insuranceReserve: 300, // Beta has reserve!
        minLoyaltyRank: "Silver",
        payoutRatio: 0.8,
        timestamp: 1000,
      },
    };

    // Setup reinsurance contract between Alpha and Beta
    state.reinsuranceContracts = {
      "alpha:beta": {
        id: "alpha:beta",
        syndicateIdA: "alpha",
        syndicateIdB: "beta",
        maxLiquidityLimit: 500,
        borrowedAfromB: 0,
        borrowedBfromA: 0,
        active: true,
        timestamp: 1000,
      },
    };

    // Setup active Multi-Faction CDO Risk Rating policy for Alpha
    state.multiFactionCdoRiskRatings = {
      "alpha-cdo_1": {
        id: "policy_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        factionId: "rangers",
        riskRating: "medium", // adds 0.2 markup
        basePremiumRate: 1.0,
        active: true,
        timestamp: 1000,
      },
    };

    // Set Silver loyalty rank for Alpha
    state.factionLoyaltyRanks = {
      "alpha-rangers": {
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Silver", // Gives 0.1 discount!
        timestamp: 1000,
      },
    };

    state.step = 11; // past due

    const nextState = tickEconomy(state, mockPack);

    // Collateral must be spared!
    expect(nextState.safehouses?.market).toBeDefined();

    // Beta's pool must be deducted by payout amount:
    // Payout amount = min(remainingDue 220, partner pool reserve 300, maxBorrowable 500) = 220 gold.
    const partnerPool = nextState.factionCdoInsurancePools?.["beta-cdo_1"];
    expect(partnerPool?.insuranceReserve).toBe(80); // 300 - 220

    // Reinsurance borrowed amount should be recorded:
    // Multiplier = 1.0 (base) + 0.2 (medium risk) - 0.1 (Silver loyalty discount) = 1.1x.
    // Scaled Owed = 220 * 1.1 = 243 gold due to precision.
    const contract = nextState.reinsuranceContracts?.["alpha:beta"];
    expect(contract?.borrowedAfromB).toBe(243);

    expect(nextState.journal?.some((j) => j.includes("Automated Reinsurance Claims Arbitration"))).toBe(true);
  });

  it("should periodically run automated reinsurance audit collections and apply loyalty rank standing discounts", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 500, // has some gold in war chest
      },
    };

    // CDO Insurance pool with low reserve (50 gold) -> causes audit violation!
    state.factionCdoInsurancePools = {
      "alpha-cdo_1": {
        id: "pool_1",
        factionId: "rangers",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        insuranceReserve: 50, // violation (requires >= 200)
        minLoyaltyRank: "Silver",
        payoutRatio: 0.8,
        timestamp: 1000,
      },
    };

    state.multiFactionCdoRiskRatings = {
      "alpha-cdo_1": {
        id: "policy_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        factionId: "rangers",
        riskRating: "medium",
        basePremiumRate: 1.0,
        active: true,
        timestamp: 1000,
      },
    };

    // Case 1: Gold Loyalty -> 80% discount on 100 fee = 20 gold audit fee!
    state.factionLoyaltyRanks = {
      "alpha-rangers": {
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Gold",
        timestamp: 1000,
      },
    };

    let nextState = tickEconomy(state, mockPack);
    expect(nextState.syndicates?.alpha?.warChest).toBe(480); // 500 - 20
    expect(nextState.factionReservePools?.rangers).toBe(10020); // 10000 base + 20

    // Case 2: Platinum Loyalty -> 100% discount = 0 gold audit fee!
    state.factionLoyaltyRanks["alpha-rangers"].rank = "Platinum";
    state.syndicates.alpha.warChest = 500;
    nextState = tickEconomy(state, mockPack);
    expect(nextState.syndicates?.alpha?.warChest).toBe(500); // no deduction!
  });

  it("should seamlessly synchronize multi-faction CDO risk ratings and proposals via Gossip convergence", () => {
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

    nodeA.multiFactionCdoRiskRatings = {
      "alpha-cdo_1": {
        id: "policy_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        factionId: "rangers",
        riskRating: "high",
        basePremiumRate: 1.5,
        active: true,
        timestamp: 2000,
      },
    };

    nodeB.multiFactionCdoRiskRatings = {
      "alpha-cdo_1": {
        id: "policy_1",
        syndicateId: "alpha",
        cdoId: "cdo_1",
        factionId: "rangers",
        riskRating: "medium", // rating changed at B
        basePremiumRate: 1.1,
        active: true,
        timestamp: 3000, // B is newer!
      },
    };

    // Merge A and B
    const mergedState = mergeMonotonicStateFields(nodeA, nodeB);
    const resolvedRating = mergedState.multiFactionCdoRiskRatings?.["alpha-cdo_1"];

    expect(resolvedRating).toBeDefined();
    expect(resolvedRating?.riskRating).toBe("medium"); // B wins
    expect(resolvedRating?.basePremiumRate).toBe(1.1);
  });
});

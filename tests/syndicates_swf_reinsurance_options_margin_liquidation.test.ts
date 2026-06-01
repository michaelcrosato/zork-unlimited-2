import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Margin Maintenance & Position Liquidation (AF-156)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_margin_pack",
      title: "Reinsurance Options Margin Test Pack",
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

  it("should calculate dynamic option margins, support margin policy voting, and execute automatic liquidations with custom penalty rates", () => {
    let state = createInitialState({
      seed: 98765,
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
      beta: {
        syndicateId: "beta",
        collateral: 500,
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // Set up active option contract: Beta is holder (buyer), Alpha is writer (seller/issuer)
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

    // Initialize high volatility index to increase spot premium rate
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 40.0,
        timestamp: 1000,
      },
    };

    // 1. Propose & vote on option margin policy for cdo_1 senior tranche by Alpha members (requires player and alice)
    const marginVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.90, // liquidate if netEquity < required * 0.90
      penaltyRate: 0.25, // 25% penalty charged on liquidation
      timestamp: 1001,
    };

    // First vote: player (Alpha, 1/2 members, PENDING majority)
    let res = multiAgentStep(state, { agentId: "player", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"]).toBeUndefined();

    // Second vote: alice (Alpha, 2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.liquidationThreshold).toBe(0.90);
    expect(policy?.penaltyRate).toBe(0.25);

    // 2. Trigger economy tick: verify that Alpha's option maintenance requirement is dynamic and is computed
    const spotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    const avgVol = 40;
    const expectedOptRequired = Math.round(800 * spotRate * (avgVol / 10.0) * 10);
    expect(expectedOptRequired).toBeGreaterThan(0);

    // Let's tick the economy
    let tickedState = tickEconomy(state, mockPack);

    // Check Alpha's marginAccount: collateral is 300.
    // Maintenance requirement is expectedOptRequired. Since expectedOptRequired will be large,
    // and Alpha's collateral (netEquity) is only 300, 300 is less than required * 0.90,
    // so Alpha's written option position should be automatically liquidated!
    const optContract = tickedState.swfReinsuranceOptionsContracts?.["opt_1"];
    expect(optContract?.active).toBe(false); // Liquidated!

    // Verify penalty was charged and transferred
    // Expected penalty: size (800) * spotRate * penaltyRate (0.25) * 100
    const expectedPenalty = Math.floor(800 * spotRate * 0.25 * 100);
    expect(expectedPenalty).toBeGreaterThan(0);

    // Alpha collateral should be decreased by the penalty, and Beta warChest should be increased by the penalty
    expect(tickedState.syndicates?.["beta"]?.warChest).toBe(4000 + expectedPenalty);

    // Alpha collateral is charged: collateral = collateral (300) - expectedPenalty = negative,
    // swept from warChest to cover the deficit!
    expect(tickedState.journal?.some(j => j.includes("[Option Liquidation] Written option contract opt_1 of Syndicate alpha has been liquidated"))).toBe(true);
  });
});

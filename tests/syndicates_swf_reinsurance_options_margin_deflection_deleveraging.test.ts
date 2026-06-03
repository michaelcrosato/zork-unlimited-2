import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Margin Deflection & Auto-Deleveraging (AF-170)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_margin_deflection_pack",
      title: "Reinsurance Options Margin Deflection Test Pack",
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

  it("should support voting on autoDeleveragingThreshold and marginDeflectionFactor, apply sizing markdown and requirement reduction under partition, and reduce liquidation penalties", () => {
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
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 5000,
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
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.1,
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

    // Initialize margin accounts
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 1500,
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
        size: 1000,
        timestamp: 1000,
        active: true,
      },
    };

    // Initialize volatility index
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };

    // 1. Propose & vote on option margin policy with auto-deleveraging parameters by Alpha members (requires player and alice)
    const marginVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.85,
      penaltyRate: 0.2,
      autoDeleveragingThreshold: 0.35,
      marginDeflectionFactor: 0.4,
      timestamp: 1001,
    };

    // First vote: player (1/2 members, PENDING)
    let res = multiAgentStep(state, { agentId: "player", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"]).toBeUndefined();

    // Second vote: alice (2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.liquidationThreshold).toBe(0.85);
    expect(policy?.penaltyRate).toBe(0.2);
    expect(policy?.autoDeleveragingThreshold).toBe(0.35);
    expect(policy?.marginDeflectionFactor).toBe(0.4);

    // 2. Scenario A: No Partition (linkStateDropRate = 0.0)
    // Ticking the economy should evaluate standard options maintenance requirement
    state.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha"],
        capitalAllocated: {
          alpha: 1000,
        },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.1,
        targetYieldRate: 0.08,
        historicalVolatility: 15.0,
        arbitrageRoutes: [],
        timestamp: 1001,
        active: true,
        linkStateDropRate: 0.0, // Standard network condition
      },
    };

    let tickedState = tickEconomy(state, mockPack);
    // Alpha syndicate has 1500 collateral. Standard requirement shouldn't trigger deleveraging.
    expect(tickedState.journal?.some((j) => j.includes("[SWF Reinsurance Option Auto-Deleveraging]"))).toBe(false);
    expect(tickedState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true); // Should still be active

    // 3. Scenario B: Severe Network Partition (linkStateDropRate = 0.50 >= 0.35)
    // Ticking the economy should trigger auto-deleveraging: position sizing markdown and margin requirement reduction
    state.swfMultiFundReinsurancePools["pool_1"].linkStateDropRate = 0.5; // Severe network partition

    tickedState = tickEconomy(state, mockPack);

    // Assert that the auto-deleveraging was triggered and logged in the journal
    const hasDeleveragedJournal = tickedState.journal?.some(
      (j) =>
        j.includes("[SWF Reinsurance Option Auto-Deleveraging]") &&
        j.includes("Size marked down from 1000 to 600") &&
        j.includes("margin requirement reduced by 40%")
    );
    expect(hasDeleveragedJournal).toBe(true);

    // 4. Scenario C: Deflect liquidation penalty under partition
    // Let's set Alpha's collateral to a very low value (e.g. 10 gold) so that even with marked-down size, it falls below threshold and gets liquidated
    state.marginAccounts!["alpha"].collateral = 10;

    tickedState = tickEconomy(state, mockPack);

    // Position should be liquidated
    const optContract = tickedState.swfReinsuranceOptionsContracts?.["opt_1"];
    expect(optContract?.active).toBe(false);

    // Verify penalty was charged using the marked-down size (600) instead of (1000)
    // Expected penalty: size (600) * spotRate * penaltyRate (0.20) * 100
    const spotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    const expectedPenalty = Math.floor(600 * spotRate * 0.2 * 100);
    expect(expectedPenalty).toBeGreaterThan(0);

    // Beta syndicate warChest should be increased by the reduced penalty
    expect(tickedState.syndicates?.["beta"]?.warChest).toBe(5000 + expectedPenalty);
  });
});

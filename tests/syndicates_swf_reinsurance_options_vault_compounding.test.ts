import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Vault Compounding & Interest (AF-171)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_vault_compounding_pack",
      title: "Reinsurance Options Vault Compounding Test Pack",
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

  it("should support voting on compoundingFactor and compoundingYieldRate, route a fraction of premium to secondary vault, earn interest in normal conditions, and instantly withdraw under margin calls", () => {
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
        collateral: 5000,
        leveragedTranchePositions: {},
        timestamp: 1000,
        swfReinsuranceOptionVault: 0,
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
        premiumPaid: 1000, // Premium paid to Alpha
      },
    };

    // 1. Propose & vote on option margin policy with auto-compounding parameters
    const marginVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.85,
      penaltyRate: 0.2,
      autoDeleveragingThreshold: 0.35,
      marginDeflectionFactor: 0.4,
      compoundingFactor: 0.25, // 25% auto-compounded
      compoundingYieldRate: 0.08, // 8% yield per tick
      timestamp: 1001,
    };

    // First vote: player (1/2 members, PENDING)
    let res = multiAgentStep(state, { agentId: "player", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Second vote: alice (2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.compoundingFactor).toBe(0.25);
    expect(policy?.compoundingYieldRate).toBe(0.08);

    // 2. Tick the economy under normal network operations (linkStateDropRate = 0.0)
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
        linkStateDropRate: 0.0, // Normal network condition
      },
    };

    // Initialize yield index
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 20.0,
        timestamp: 1001,
      },
    };

    // First tick should compound the premium:
    // 25% of 1000 = 250 gold routed from Alpha's warChest (10000 -> 9750) to swfReinsuranceOptionVault (0 -> 250)
    // Plus 20 gold interest earned on the 250 gold vault balance.
    // Also Alpha deposits 1070 gold to pool_1 and receives 166 gold yield.
    // Net warChest: 10000 - 250 - 1070 + 166 = 8846
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.syndicates?.["alpha"]?.warChest).toBe(8846);
    expect(tickedState.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(270);
    expect(tickedState.swfReinsuranceOptionsContracts?.["opt_1"]?.premiumCompounded).toBe(true);
    expect(
      tickedState.journal?.some(
        (j) => j.includes("[SWF Reinsurance Premium Auto-Compounding]") && j.includes("Routed 250 gold")
      )
    ).toBe(true);
    expect(
      tickedState.journal?.some(
        (j) => j.includes("[SWF Reinsurance Vault Interest]") && j.includes("earned 20 gold interest")
      )
    ).toBe(true);

    // Second tick: should accrue interest on the vault balance:
    // 8% of 270 = 21 gold interest. swfReinsuranceOptionVault becomes 291
    let tickedState2 = tickEconomy(tickedState, mockPack);
    expect(tickedState2.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(291);
    expect(
      tickedState2.journal?.some(
        (j) => j.includes("[SWF Reinsurance Vault Interest]") && j.includes("earned 21 gold interest")
      )
    ).toBe(true);

    // 3. Scenario: Severe Network Partition (linkStateDropRate = 0.50 >= 0.35 threshold)
    // Running tickEconomy should NOT accrue interest under severe partition
    tickedState2.swfMultiFundReinsurancePools!["pool_1"].linkStateDropRate = 0.5; // Severe network partition

    let tickedState3 = tickEconomy(tickedState2, mockPack);
    // Vault balance should remain 291 (no interest earned)
    expect(tickedState3.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(291);

    // 4. Scenario: Margin Call instant vault withdrawal
    // Let's set Alpha's collateral to a very low value (e.g. 100 gold) and make maintenance requirement high
    // so it falls below threshold, triggering margin call
    tickedState2.marginAccounts!["alpha"].swfReinsuranceOptionVault = 500;
    tickedState2.marginAccounts!["alpha"].collateral = 100;
    tickedState2.swfMultiFundReinsurancePools!["pool_1"].linkStateDropRate = 0.0; // Reset network to normal

    // Run tickEconomy: should instantly withdraw from vault to cover the margin deficit and prevent liquidation!
    let marginTickedState = tickEconomy(tickedState2, mockPack);

    // Since it had a margin call, it should draw from the vault (500 gold + 40 gold interest = 540 gold) and add it to collateral
    // swfReinsuranceOptionVault should be reduced to 0
    expect(marginTickedState.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(0);
    // collateral should increase from 100 to 640
    expect(marginTickedState.marginAccounts?.["alpha"]?.collateral).toBe(640);
    expect(
      marginTickedState.journal?.some(
        (j) => j.includes("[SWF Reinsurance Option Vault Margin Deficit Payback]") && j.includes("Withdrew 540 gold")
      )
    ).toBe(true);
  });
});

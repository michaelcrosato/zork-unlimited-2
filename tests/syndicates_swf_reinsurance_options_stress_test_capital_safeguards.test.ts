import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Stress-Test-Aware Dynamic Capital Safeguards (AF-174)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_stress_safeguards_pack",
      title: "Reinsurance Options Stress Safeguards Test Pack",
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

  it("should support voting on stress-test margin safeguard parameters, activate policy via consensus, and execute automated safety transfers under high volatility shock", () => {
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
        swfReinsuranceOptionVault: 500, // Collateral vault holds 500 gold
      },
    };

    // Set up active option contract: Alpha is the writer
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
        premiumPaid: 1000,
        premiumCompounded: true,
      },
    };

    // 1. Propose & vote on option margin policy with stress-test-aware safeguard parameters
    const marginVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.85,
      penaltyRate: 0.2,
      autoDeleveragingThreshold: 0.35,
      marginDeflectionFactor: 0.4,
      compoundingFactor: 0.25,
      compoundingYieldRate: 0.08,
      stressReserveScalingLimit: 25.0, // Trigger limit
      stressReserveBufferMultiplier: 2.0, // Target scale multiplier
      stressStabilizationTarget: 100, // Target base
      timestamp: 1001,
    };

    // First vote: player
    let res = multiAgentStep(state, { agentId: "player", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Second vote: alice (Consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.stressReserveScalingLimit).toBe(25.0);
    expect(policy?.stressReserveBufferMultiplier).toBe(2.0);
    expect(policy?.stressStabilizationTarget).toBe(100);

    // 2. Scenario A: Volatility shock is high (30.0 >= 25.0 limit)
    // Setup stress test policy triggering the shock
    state.swfReinsuranceOptionStressTestPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        simulatedVolatilityShock: 30.0,
        simulatedLiquidityShock: 0,
        reserveMultiplier: 1.0,
        timestamp: 1002,
      },
    };

    // Ticking the economy should trigger automated safety capital transfer!
    // targetBalance = 100 * 2.0 = 200 gold.
    // 200 gold should be transferred from swfReinsuranceOptionVault.
    // Note: Vault balance earns 8% interest on 500 gold (500 -> 540) before the transfer, so 540 - 200 = 340 gold.
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(340);
    expect(tickedState.swfReinsuranceOptionVolatilityInsurancePools?.["cdo_1_senior"]?.balance).toBe(200);

    // Assert transfer log is in the journal
    expect(
      tickedState.journal?.some(
        (j) => j.includes("[SWF Safety Capital Transfer]") && j.includes("Transferred 200 gold")
      )
    ).toBe(true);

    // 3. Scenario B: Volatility shock is normal/low (15.0 < 25.0 limit)
    // Set simulated volatility to 15.0
    tickedState.swfReinsuranceOptionStressTestPolicies!["cdo_1_senior"].simulatedVolatilityShock = 15.0;
    // Clear journal for easier lookup
    tickedState.journal = [];

    let tickedStateLow = tickEconomy(tickedState, mockPack);
    // Vault balance earns 8% interest on 340 gold (340 -> 367). Pool balance remains 200. No new transfer.
    expect(tickedStateLow.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(367);
    expect(tickedStateLow.swfReinsuranceOptionVolatilityInsurancePools?.["cdo_1_senior"]?.balance).toBe(200);
    expect(tickedStateLow.journal?.some((j) => j.includes("[SWF Safety Capital Transfer]"))).toBe(false);

    // 4. Scenario C: Insufficient vault funds
    // Reset volatility shock to high (30.0)
    tickedStateLow.swfReinsuranceOptionStressTestPolicies!["cdo_1_senior"].simulatedVolatilityShock = 30.0;
    // Reduce vault balance to 50 gold. Deficit to target is 200 - 50 = 150 gold.
    // Vault balance earns 8% interest on 50 gold (50 -> 54).
    // All 54 gold is transferred. Pool balance becomes 50 + 54 = 104 gold.
    tickedStateLow.marginAccounts!["alpha"].swfReinsuranceOptionVault = 50;
    tickedStateLow.swfReinsuranceOptionVolatilityInsurancePools!["cdo_1_senior"].balance = 50;
    tickedStateLow.journal = [];

    let tickedStateCap = tickEconomy(tickedStateLow, mockPack);
    // Vault becomes 0, pool balance becomes 50 + 54 = 104 gold
    expect(tickedStateCap.marginAccounts?.["alpha"]?.swfReinsuranceOptionVault).toBe(0);
    expect(tickedStateCap.swfReinsuranceOptionVolatilityInsurancePools?.["cdo_1_senior"]?.balance).toBe(104);
    expect(
      tickedStateCap.journal?.some(
        (j) => j.includes("[SWF Safety Capital Transfer]") && j.includes("Transferred 54 gold")
      )
    ).toBe(true);
  });
});

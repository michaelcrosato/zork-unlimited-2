import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Margin Grace Period & Volatility Extensions (AF-187)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_margin_grace_pack",
      title: "Reinsurance Options Margin Grace Period Test Pack",
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

  it("should configure option margin grace periods, defer liquidations, apply dynamic volatility extensions, and clear on recovery", () => {
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

    // Initialize normal volatility index
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 15.0,
        timestamp: 1000,
      },
    };

    // 1. Propose & vote on option margin policy
    const marginVoteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.90,
      penaltyRate: 0.25,
      marginCallGracePeriod: 2, // 2 step baseline grace period
      gracePeriodVolatilityThreshold: 30.0,
      gracePeriodExtension: 1, // +1 step extension
      timestamp: 1001,
    };

    // Vote 1: player
    let res = multiAgentStep(state, { agentId: "player", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote 2: alice
    res = multiAgentStep(state, { agentId: "alice", action: marginVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.marginCallGracePeriod).toBe(2);

    // 2. Tick economy at step 111 (not a multiple of 5).
    // Collateral (300) is below maintenance requirement, margin call triggers.
    // MarginCallGracePeriod is 2, so liquidation is deferred!
    state.step = 111;
    let ticked = tickEconomy(state, mockPack);

    let marginAccount = ticked.marginAccounts?.["alpha"];
    expect(marginAccount?.marginCallStartStep).toBe(111);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true); // Deferral works!
    expect(ticked.journal?.some(j => j.includes("Entered margin call grace period"))).toBe(true);
    expect(ticked.journal?.some(j => j.includes("liquidation is deferred due to active grace period"))).toBe(true);

    // 3. Tick step 112 (elapsed = 1 step < 2 grace steps): liquidation still deferred
    ticked.step = 112;
    ticked = tickEconomy(ticked, mockPack);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);
    expect(ticked.marginAccounts?.["alpha"]?.marginCallStartStep).toBe(111);

    // 4. Test Volatility Grace Period Extension!
    // Increase average volatility to 35.0 (which is >= threshold 30.0)
    // This should increase the total grace period to 2 + 1 = 3 steps!
    ticked.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 35.0,
        timestamp: 1000,
      },
    };

    // Tick step 113 (elapsed = 2 steps): normally 2 steps would expire the baseline,
    // but under 35.0 volatility, grace period is 3 steps, so elapsed 2 < 3. Liquidation is still deferred!
    ticked.step = 113;
    ticked = tickEconomy(ticked, mockPack);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);
    expect(ticked.marginAccounts?.["alpha"]?.marginCallStartStep).toBe(111);

    // 5. Recover!
    // Increase collateral to 5000 so they recover from the margin call
    ticked.marginAccounts!["alpha"].collateral = 5000;
    ticked.step = 114;
    ticked = tickEconomy(ticked, mockPack);
    
    expect(ticked.marginAccounts?.["alpha"]?.marginCallStartStep).toBeUndefined();
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);
    expect(ticked.journal?.some(j => j.includes("recovered from margin call"))).toBe(true);

    // 6. Test Expiration / Liquidation
    // Skip step 115 (epoch boundary) to avoid settlement deactivation, and start at 116.
    // Decrease collateral back to 300.
    ticked.marginAccounts!["alpha"].collateral = 300;
    ticked.step = 116;
    
    // Trigger margin call again (enters grace period at step 116)
    ticked = tickEconomy(ticked, mockPack);
    expect(ticked.marginAccounts?.["alpha"]?.marginCallStartStep).toBe(116);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);

    // Reset volatility to normal 15.0 so grace period is baseline 2 steps
    ticked.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 15.0,
        timestamp: 1000,
      },
    };

    // Tick step 117 (elapsed = 1 step)
    ticked.step = 117;
    ticked = tickEconomy(ticked, mockPack);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);

    // Tick step 118 (elapsed = 2 steps >= 2 grace steps): grace period expires, option gets liquidated!
    ticked.step = 118;
    ticked = tickEconomy(ticked, mockPack);
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false); // Liquidated!
    expect(ticked.journal?.some(j => j.includes("margin call grace period expired"))).toBe(true);
  });
});

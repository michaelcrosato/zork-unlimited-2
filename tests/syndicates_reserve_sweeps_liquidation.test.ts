import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate Secondary Reserve Automated Sweeps & Dynamic Tariff Liquidation (AF-125)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reserve_sweep_pack",
      title: "Reserve Sweep Test Pack",
      start_room: "market",
      vars_init: { gold: 2000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: ["merchant_tom"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "A simple wooden shield.",
        cost: 100,
        takeable: true,
      }
    ],
    npcs: [
      {
        id: "merchant_tom",
        name: "Tom",
        description: "A friendly merchant.",
        dialogue: {
          root: "root",
          nodes: [
            {
              id: "root",
              npc_text: "Hello",
              topics: [],
            }
          ]
        }
      }
    ],
  });

  it("should support proposing, voting, and adjusting a sweep policy via AUTHORIZE_RESERVE_SWEEP and ADJUST_RESERVE_SWEEP_MARGIN", () => {
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

    // 1. Authorize policy - player votes
    const authAction = {
      type: "AUTHORIZE_RESERVE_SWEEP",
      syndicateId: "alpha_squad",
      sweepMargin: 600,
      tariffLiquidationRate: 0.20,
      timestamp: 1002,
    };

    let res = multiAgentStep(state, { agentId: "player", action: authAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check vote registered, and policy updated immediately (mode of votes)
    expect(state.reserveSweepVotes?.["alpha_squad"]?.["player"]).toBeDefined();
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.sweepMargin).toBe(600);

    // 2. Alice votes for the same policy to reach majority consensus
    const aliceVoteAction = {
      type: "AUTHORIZE_RESERVE_SWEEP",
      syndicateId: "alpha_squad",
      sweepMargin: 600,
      tariffLiquidationRate: 0.20,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "alice", action: aliceVoteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Now policy is established
    const policy = state.reserveSweepPolicies?.["alpha_squad"];
    expect(policy).toBeDefined();
    expect(policy?.sweepMargin).toBe(600);
    expect(policy?.tariffLiquidationRate).toBe(0.20);
    expect(policy?.active).toBe(false);

    // 3. Adjust sweep margin - bob votes for a higher margin (700)
    const bobAdjustAction = {
      type: "ADJUST_RESERVE_SWEEP_MARGIN",
      syndicateId: "alpha_squad",
      sweepMargin: 700,
      tariffLiquidationRate: 0.30,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: bobAdjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Margin is still 600 because bob is 1/3.
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.sweepMargin).toBe(600);

    // Alice also adjusts to Bob's proposal to establish consensus
    const aliceAdjustAction = {
      type: "ADJUST_RESERVE_SWEEP_MARGIN",
      syndicateId: "alpha_squad",
      sweepMargin: 700,
      tariffLiquidationRate: 0.30,
      timestamp: 1005,
    };

    res = multiAgentStep(state, { agentId: "alice", action: aliceAdjustAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Consensus updated!
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.sweepMargin).toBe(700);
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.tariffLiquidationRate).toBe(0.30);
  });

  it("should auto-sweep secondary reserves and vault investments to pay coupons on periodic ticks", () => {
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
        warChest: 100, // Insufficient for payout of 1100
      },
    };

    // Authorize policy
    state.reserveSweepPolicies = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        sweepMargin: 700,
        tariffLiquidationRate: 0.20,
        active: false,
        accumulatedLiquidatedGold: 0,
        timestamp: 1000,
      }
    };

    // Set up active bond
    state.factionReserveBonds = {
      bond_test: {
        id: "bond_test",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100,
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Active",
        timestamp: 1000,
      },
    };

    // We have secondary reserves and investments
    state.secondaryReserves = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        reserveGold: 600, // Can sweep 600
        reserveRatio: 0.20,
        timestamp: 1000,
      }
    };

    state.secondaryReserveInvestments = {
      alpha_squad: {
        vault_1: {
          syndicateId: "alpha_squad",
          vaultId: "vault_1",
          investedGold: 500, // Can liquidate remaining 400 needed
          timestamp: 1000,
        }
      }
    };

    // Periodic econ tick triggers auto-sweep
    let events: any[] = [];
    state = tickProductionLabs(state, events);

    // Payout: 1100.
    // Initial war chest: 100. Needed: 1000.
    // Swept from secondary reserves: 600. War chest: 700. Needed: 400.
    // Swept from vault_1: 400. War chest: 1100. Needed: 0.
    // Coupon paid! War chest: 0. Remaining debt: 2200. status: Active.
    expect(state.secondaryReserves?.["alpha_squad"]?.reserveGold).toBe(0);
    expect(state.secondaryReserveInvestments?.["alpha_squad"]?.["vault_1"]?.investedGold).toBe(100);
    expect(state.syndicates?.["alpha_squad"]?.warChest).toBe(0);
    expect(state.factionReserveBonds?.["bond_test"]?.status).toBe("Active");
    expect(state.factionReserveBonds?.["bond_test"]?.remainingRepayment).toBe(2200);
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.active).toBe(false);
  });

  it("should activate sweep policy if reserves are insufficient, and apply tariff liquidation to trades", () => {
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
        warChest: 100, // Insufficient for payout of 1100
      },
    };

    state.reserveSweepPolicies = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        sweepMargin: 500,
        tariffLiquidationRate: 0.20,
        active: false,
        accumulatedLiquidatedGold: 0,
        timestamp: 1000,
      }
    };

    state.factionReserveBonds = {
      bond_test: {
        id: "bond_test",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        faceValue: 3000,
        interestRate: 10,
        termEpochs: 3,
        remainingEpochs: 3,
        couponPayout: 1100,
        totalRepayment: 3300,
        remainingRepayment: 3300,
        status: "Active",
        timestamp: 1000,
      },
    };

    // Ticking makes it default and activates sweep policy
    state = tickProductionLabs(state, []);
    expect(state.factionReserveBonds?.["bond_test"]?.status).toBe("Defaulted");
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.active).toBe(true);

    // Buy action. Base cost is 100.
    // Tariff liquidation is 20%. Multiplier = 1.0 + 0.20 = 1.20. Cost = 120.
    // Liquidation portion = floor(120 * 0.2 / 1.2) = 20 gold.
    state.vars["gold"] = 200;
    state.merchantInventories = {
      merchant_tom: ["wooden_shield"]
    };

    const buyAction = {
      type: "BUY",
      npc: "merchant_tom",
      item: "wooden_shield",
    };

    let buyRes = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    expect(buyRes.ok).toBe(true);
    state = buyRes.state;

    // Gold deducted: 120 (requires 200 - 120 = 80)
    expect(state.vars["gold"]).toBe(80);
    // Bond remainingRepayment reduced by 20 (3300 - 20 = 3280)
    expect(state.factionReserveBonds?.["bond_test"]?.remainingRepayment).toBe(3280);
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.accumulatedLiquidatedGold).toBe(20);

    // Sell action. Standard payout for wooden_shield is 100.
    // Multiplier = 1.0 - 0.20 = 0.80. Payout = 80.
    // Liquidation portion = floor(80 * 0.2 / 0.8) = 20 gold.
    state.vars["gold"] = 80;
    state.merchantGold = {
      merchant_tom: 1000
    };

    const sellAction = {
      type: "SELL",
      npc: "merchant_tom",
      item: "wooden_shield",
    };

    let sellRes = multiAgentStep(state, { agentId: "player", action: sellAction as any }, mockPack);
    expect(sellRes.ok).toBe(true);
    state = sellRes.state;

    // Gold received: 80 (requires 80 + 80 = 160)
    expect(state.vars["gold"]).toBe(160);
    // Bond remainingRepayment reduced by 20 (3280 - 20 = 3260)
    expect(state.factionReserveBonds?.["bond_test"]?.remainingRepayment).toBe(3260);
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.accumulatedLiquidatedGold).toBe(40);
  });

  it("should support contesting an active sweep via CONTEST_RESERVE_SWEEP", () => {
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
        warChest: 800, // Covers margin
      },
    };

    state.reserveSweepPolicies = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        sweepMargin: 500,
        tariffLiquidationRate: 0.20,
        active: true, // sweep active
        accumulatedLiquidatedGold: 0,
        timestamp: 1000,
      }
    };

    const contestAction = {
      type: "CONTEST_RESERVE_SWEEP",
      syndicateId: "alpha_squad",
      contest: true,
      timestamp: 1002,
    };

    let res = multiAgentStep(state, { agentId: "player", action: contestAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Cured!
    expect(state.reserveSweepPolicies?.["alpha_squad"]?.active).toBe(false);
  });

  it("should converge sweep states via mergeMonotonicStateFields", () => {
    let stateA = createInitialState({
      seed: 111,
      start: "market",
      agentsInit: ["player"],
    });
    let stateB = createInitialState({
      seed: 222,
      start: "market",
      agentsInit: ["player"],
    });

    stateA.reserveSweepPolicies = {
      alpha: {
        syndicateId: "alpha",
        sweepMargin: 500,
        tariffLiquidationRate: 0.15,
        active: true,
        accumulatedLiquidatedGold: 50,
        timestamp: 100,
      }
    };

    stateB.reserveSweepPolicies = {
      alpha: {
        syndicateId: "alpha",
        sweepMargin: 600,
        tariffLiquidationRate: 0.25,
        active: false,
        accumulatedLiquidatedGold: 100,
        timestamp: 150, // newer timestamp
      }
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.reserveSweepPolicies?.["alpha"]?.sweepMargin).toBe(600);
    expect(merged.reserveSweepPolicies?.["alpha"]?.tariffLiquidationRate).toBe(0.25);
    expect(merged.reserveSweepPolicies?.["alpha"]?.active).toBe(false);
    expect(merged.reserveSweepPolicies?.["alpha"]?.accumulatedLiquidatedGold).toBe(100);
  });
});

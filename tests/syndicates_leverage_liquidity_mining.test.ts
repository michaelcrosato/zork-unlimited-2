import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate Bank Leverage Liquidity Mining Incentives (AF-114)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "mining_test_pack",
      title: "Mining Test Pack",
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

  it("should support voting and locking rehypothecated collateral via consensus majority", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000,
        },
      },
    };

    // 1. Player votes to lock 500 gold for 5 epochs sponsored by "rangers"
    const action1 = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 500,
      durationEpochs: 5,
      factionId: "rangers",
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.lockedLiquidityPositions?.alpha_squad).toBeUndefined();
    expect(res1.state.lockedCollateralVotes?.alpha_squad?.player?.amount).toBe(500);

    // 2. Alice votes to lock 500 gold for 5 epochs - consensus majority!
    const action2 = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 500,
      durationEpochs: 5,
      factionId: "rangers",
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);

    // Position must be successfully locked and votes cleared
    expect(res2.state.lockedCollateralVotes?.alpha_squad).toBeUndefined();
    const pos = res2.state.lockedLiquidityPositions?.alpha_squad?.[0];
    expect(pos).toBeDefined();
    expect(pos?.amount).toBe(500);
    expect(pos?.durationEpochs).toBe(5);
    expect(pos?.factionId).toBe("rangers");
    expect(pos?.claimed).toBe(false);

    // Margin account lockedPositions should also contain this
    const maPos = res2.state.marginAccounts?.alpha_squad?.lockedPositions?.[0];
    expect(maPos).toBeDefined();
    expect(maPos?.amount).toBe(500);
  });

  it("should fail to lock if amount exceeds unlocked rehypothecated collateral in vault", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000, // Only 1000 rehypothecated total
        },
      },
    };

    // Vote to lock 1200 gold - exceeds 1000 total rehypothecated!
    const action = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 1200,
      durationEpochs: 5,
      factionId: "rangers",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: action as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.lockedLiquidityPositions?.alpha_squad).toBeUndefined();
    // Reconciler should have run but failed and cleared the votes
    expect(res.state.lockedCollateralVotes?.alpha_squad).toBeUndefined();
  });

  it("should accrue boosted yield and passive faction reputation over step ticks in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1, // 10% interest rate
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000,
        },
        lockedPositions: [
          {
            id: "lock_1",
            syndicateId: "alpha_squad",
            vaultId: "vault_a",
            amount: 500, // 500 gold locked
            startEpoch: 0,
            durationEpochs: 5, // boost = 1.0 + 5 * 0.1 = 1.5x interest rate!
            endEpoch: 5,
            factionId: "rangers",
            claimed: false,
            timestamp: 1000,
          },
        ],
      },
    };

    // Calculate yields
    // Locked portion: 500 gold * 10% rate * 1.5 multiplier = 75 gold interest
    // Unlocked portion: 500 gold * 10% rate = 50 gold interest
    // Total interest = 125 gold
    // Returned to margin collateral = 125 * 0.8 = 100 gold
    // Faction reputation accrued: 1 * 1.5 = 1.5 -> rounded/max'd to 2 reputation accrued!
    let nextState = tickEconomy(state, mockPack);

    expect(nextState.marginAccounts?.alpha_squad?.collateral).toBe(1100); // 1000 base + 100 yield
    expect(nextState.factionRep?.rangers).toBeGreaterThanOrEqual(1); // should accrue reputation passively
  });

  it("should support claiming mining rewards after maturity via consensus majority", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    const maturedPosition = {
      id: "lock_matured",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 1000,
      startEpoch: 0,
      durationEpochs: 2,
      endEpoch: 2, // ended at epoch 2
      factionId: "rangers",
      claimed: false,
      timestamp: 1000,
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000,
        },
        lockedPositions: [maturedPosition],
      },
    };

    state.lockedLiquidityPositions = {
      alpha_squad: [maturedPosition],
    };

    state.factionReservePools = {
      rangers: 10000,
    };

    // Increment step/epoch so we are past endEpoch (epoch 2 is step 10, let's set step to 11 so epoch is 2)
    state.step = 11; // epoch = floor(11 / 5) = 2 >= endEpoch (2)

    // Vote to claim rewards
    const action = {
      type: "CLAIM_LIQUIDITY_MINING_REWARDS",
      syndicateId: "alpha_squad",
      positionId: "lock_matured",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: action as any }, mockPack);
    expect(res.ok).toBe(true);

    // Reward = 1000 amount * 0.05 * 2 duration = 100 gold
    // Syndicate war chest = 1000 + 100 = 1100 gold
    // Faction reputation bonus = 5 * 2 duration = 10 rep
    expect(res.state.syndicates?.alpha_squad?.warChest).toBe(1100);
    expect(res.state.factionRep?.rangers).toBe(10);
    expect(res.state.factionReservePools?.rangers).toBe(9900); // 10000 - 100

    const updatedPos = res.state.lockedLiquidityPositions?.alpha_squad?.[0];
    expect(updatedPos?.claimed).toBe(true);

    const updatedMaPos = res.state.marginAccounts?.alpha_squad?.lockedPositions?.[0];
    expect(updatedMaPos?.claimed).toBe(true);
  });
});

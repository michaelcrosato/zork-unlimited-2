import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Yield Arbitrage & Dynamic Liquidity Buffer Auto-Withdrawals (AF-135)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "arbitrage_test_pack",
      title: "Arbitrage Test Pack",
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

  it("should support proposing and voting on SWF yield arbitrage policy via consensus majority", () => {
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
      vault_b: {
        vaultId: "vault_b",
        name: "Vault B",
        interestRate: 0.05,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
      },
    };

    // 1. Player votes to enable SWF yield arbitrage
    const action1 = {
      type: "SET_SWF_YIELD_ARBITRAGE_POLICY",
      syndicateId: "alpha_squad",
      enabled: true,
      yieldThresholds: {
        vault_a: 0.08,
        vault_b: 0.06,
      },
      autoWithdrawalEnabled: true,
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);

    // Rebalancing should not be resolved yet since we only have 1 out of 3 votes
    expect(res1.state.marginAccounts?.alpha_squad?.swfArbitrageEnabled).toBeUndefined();

    // 2. Alice votes for the policy - consensus majority! (2 out of 3 votes)
    const action2 = {
      type: "SET_SWF_YIELD_ARBITRAGE_POLICY",
      syndicateId: "alpha_squad",
      enabled: true,
      yieldThresholds: {
        vault_a: 0.08,
        vault_b: 0.06,
      },
      autoWithdrawalEnabled: true,
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);

    const ma = res2.state.marginAccounts?.alpha_squad;
    expect(ma).toBeDefined();
    expect(ma?.swfArbitrageEnabled).toBe(true);
    expect(ma?.swfYieldThresholds?.vault_a).toBe(0.08);
    expect(ma?.swfYieldThresholds?.vault_b).toBe(0.06);
    expect(ma?.swfAutoWithdrawalEnabled).toBe(true);
  });

  it("should execute automated yield arbitrage rebalancing during economy ticks", () => {
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
        interestRate: 0.1, // Yield is 10%, above threshold 8%
        sweepRisk: 0.0,
        timestamp: 1000,
      },
      vault_b: {
        vaultId: "vault_b",
        name: "Vault B",
        interestRate: 0.04, // Yield is 4%, below threshold 6%
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        swfRebalancingEnabled: true,
        swfVaultTargets: {
          vault_a: 50,
          vault_b: 50,
        },
        swfLiquidityBufferRatio: 10,
        swfArbitrageEnabled: true,
        swfYieldThresholds: {
          vault_a: 0.08,
          vault_b: 0.06,
        },
        swfAutoWithdrawalEnabled: false,
        swfVaultAllocations: {
          vault_a: 450,
          vault_b: 450,
        },
      },
    };

    // Tick the economy!
    let res = tickEconomy(state, mockPack);

    // Vault B yield (4%) is below threshold (6%), while Vault A (10%) is above threshold.
    // Vault B target percentage (50%) should be reallocated to Vault A (making Vault A's target 100%).
    const ma = res.marginAccounts?.alpha_squad;
    expect(ma?.swfVaultTargets?.vault_a).toBe(100);
    expect(ma?.swfVaultTargets?.vault_b).toBe(0);
  });

  it("should execute auto-withdrawal during economy ticks when enabled", () => {
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
      vault_b: {
        vaultId: "vault_b",
        name: "Vault B",
        interestRate: 0.04, // below threshold (6%)
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        swfRebalancingEnabled: true,
        swfVaultTargets: {
          vault_a: 50,
          vault_b: 50,
        },
        swfLiquidityBufferRatio: 10,
        swfArbitrageEnabled: true,
        swfYieldThresholds: {
          vault_a: 0.08,
          vault_b: 0.06,
        },
        swfAutoWithdrawalEnabled: true,
        swfVaultAllocations: {
          vault_a: 450,
          vault_b: 450,
        },
      },
    };

    let res = tickEconomy(state, mockPack);

    const ma = res.marginAccounts?.alpha_squad;
    // Vault B allocation should be set to 0 immediately due to auto-withdrawal
    expect(ma?.swfVaultAllocations?.vault_b).toBe(0);
    // Vault A allocation should be reallocated to 100% of target (collateral - 10% buffer = 900 gold)
    expect(ma?.swfVaultAllocations?.vault_a).toBe(900);
  });

  it("should merge SWF yield arbitrage policy votes correctly in Gossip mesh nodes", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      agentsInit: ["player"],
    });

    stateA.swfYieldArbitragePolicyVotes = {
      alpha_squad: {
        player: {
          enabled: true,
          yieldThresholds: { vault_a: 0.08 },
          autoWithdrawalEnabled: true,
          timestamp: 1001,
        },
      },
    };

    stateB.swfYieldArbitragePolicyVotes = {
      alpha_squad: {
        alice: {
          enabled: true,
          yieldThresholds: { vault_a: 0.08 },
          autoWithdrawalEnabled: true,
          timestamp: 1002,
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    const votes = merged.swfYieldArbitragePolicyVotes?.alpha_squad;
    expect(votes).toBeDefined();
    expect(votes?.player?.enabled).toBe(true);
    expect(votes?.alice?.enabled).toBe(true);
  });
});

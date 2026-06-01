import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate Bank Multi-Vault Dynamic Yield-Risk Optimization & Automated Rebalancing Advisors (AF-113)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "advisor_test_pack",
      title: "Advisor Test Pack",
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

  it("should support deploying the rebalancing advisor via consensus majority voting", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
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

    // Open margin account first
    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 500,
        timestamp: 1000,
        rebalancingEnabled: true,
      },
    };

    // 1. Player votes to deploy advisor (enabled: true). No majority yet (1/3).
    const action1 = {
      type: "DEPLOY_REBALANCING_ADVISOR",
      syndicateId: "alpha_squad",
      enabled: true,
      timestamp: 1001,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.marginAccounts?.alpha_squad?.advisorEnabled).toBeFalsy();
    expect(res1.state.rebalancingAdvisorVotes?.alpha_squad?.player?.enabled).toBe(true);

    // 2. Alice votes to deploy advisor (enabled: true). We now have majority (2/3).
    const action2 = {
      type: "DEPLOY_REBALANCING_ADVISOR",
      syndicateId: "alpha_squad",
      enabled: true,
      timestamp: 1002,
    };
    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    // Votes cleared and policy applied!
    expect(res2.state.marginAccounts?.alpha_squad?.advisorEnabled).toBe(true);
    expect(res2.state.rebalancingAdvisorVotes?.alpha_squad).toBeUndefined();

    // 3. Let's vote to undeploy it. Bob votes enabled: false. (1/3)
    const action3 = {
      type: "DEPLOY_REBALANCING_ADVISOR",
      syndicateId: "alpha_squad",
      enabled: false,
      timestamp: 1003,
    };
    let res3 = multiAgentStep(res2.state, { agentId: "bob", action: action3 as any }, mockPack);
    expect(res3.ok).toBe(true);
    expect(res3.state.marginAccounts?.alpha_squad?.advisorEnabled).toBe(true);

    // Alice votes enabled: false. (2/3 majority)
    const action4 = {
      type: "DEPLOY_REBALANCING_ADVISOR",
      syndicateId: "alpha_squad",
      enabled: false,
      timestamp: 1004,
    };
    let res4 = multiAgentStep(res3.state, { agentId: "alice", action: action4 as any }, mockPack);
    expect(res4.ok).toBe(true);
    expect(res4.state.marginAccounts?.alpha_squad?.advisorEnabled).toBe(false);
  });

  it("should support setting the advisor safety threshold via consensus majority voting", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
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

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 500,
        timestamp: 1000,
        rebalancingEnabled: true,
      },
    };

    // 1. Player votes safety threshold = 5 (5%). No majority yet.
    const action1 = {
      type: "SET_ADVISOR_SAFETY_THRESHOLD",
      syndicateId: "alpha_squad",
      threshold: 5,
      timestamp: 1001,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.marginAccounts?.alpha_squad?.advisorSafetyThreshold).toBeUndefined();
    expect(res1.state.advisorSafetyThresholdVotes?.alpha_squad?.player?.threshold).toBe(5);

    // 2. Alice votes safety threshold = 5 (5%). Majority reached!
    const action2 = {
      type: "SET_ADVISOR_SAFETY_THRESHOLD",
      syndicateId: "alpha_squad",
      threshold: 5,
      timestamp: 1002,
    };
    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.marginAccounts?.alpha_squad?.advisorSafetyThreshold).toBe(5);
    expect(res2.state.advisorSafetyThresholdVotes?.alpha_squad).toBeUndefined();
  });

  it("should execute dynamic advisor-led target reallocations during tickEconomy and auto-rebalance successfully", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    // Populate syndicates and vaults
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

    // We have three vaults with different interest yields and sweep risks:
    // - high_yield: 12% yield, 6% sweep risk
    // - mid_yield: 8% yield, 3% sweep risk
    // - low_yield: 4% yield, 1% sweep risk
    state.secondaryReserveVaults = {
      high_yield: {
        vaultId: "high_yield",
        name: "High Yield Vault",
        interestRate: 0.12,
        sweepRisk: 0.06,
        timestamp: 1000,
      },
      mid_yield: {
        vaultId: "mid_yield",
        name: "Mid Yield Vault",
        interestRate: 0.08,
        sweepRisk: 0.03,
        timestamp: 1000,
      },
      low_yield: {
        vaultId: "low_yield",
        name: "Low Yield Vault",
        interestRate: 0.04,
        sweepRisk: 0.01,
        timestamp: 1000,
      },
    };

    // Margin Account setup:
    // Deployed advisor, safety threshold = 3 (3% risk)
    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        advisorEnabled: true,
        advisorSafetyThreshold: 3, // Max acceptable average sweep risk is 3%
        liquidityBufferRatio: 20, // 20% buffer (200 gold), 80% rehypothecated (800 gold)
      },
    };

    // Tick the economy to trigger advisor rebalancing and target shifting!
    let nextState = tickEconomy(state, mockPack);

    // Let's check the shifted targets!
    // Since safety threshold is 3% (0.03), our optimizer should choose targets that maximize yield under 3% average sweep risk.
    // The mid_yield vault has exactly 3% sweep risk, yielding 8%.
    // If we blend high_yield (6% risk, 12% yield) and low_yield (1% risk, 4% yield):
    // Let's see if there is an allocation like:
    // 40% high_yield, 60% low_yield -> average risk = 0.4 * 0.06 + 0.6 * 0.01 = 0.024 + 0.006 = 0.03 (exactly 3%).
    // Yield = 0.4 * 0.12 + 0.6 * 0.04 = 0.048 + 0.024 = 0.072 (7.2%).
    // Mid yield (100% mid_yield) -> average risk = 3%, Yield = 8%.
    // So 100% mid_yield yields 8% at 3% risk, which is better than any other valid blend of high and low yield!
    // Therefore, our advisor should automatically allocate 100% to mid_yield (or select mid_yield as the optimal choice)!
    const ma = nextState.marginAccounts?.alpha_squad;
    expect(ma).toBeDefined();
    expect(ma?.vaultTargets).toBeDefined();

    // Verify targets sum to exactly 100%
    const sumTargets = Object.values(ma?.vaultTargets || {}).reduce((a, b) => a + b, 0);
    expect(sumTargets).toBe(100);

    // Verify weighted risk of optimal vault targets is below or equal to threshold (3%)
    let weightedRisk = 0;
    for (const [vaultId, pct] of Object.entries(ma?.vaultTargets || {})) {
      const vault = state.secondaryReserveVaults?.[vaultId];
      weightedRisk += (pct / 100) * (vault?.sweepRisk ?? 0);
    }
    expect(weightedRisk).toBeLessThanOrEqual(0.03 + 1e-9);

    // Also assert that auto-rebalance successfully set vaultAllocations using these targets
    expect(ma?.vaultAllocations).toEqual({
      high_yield: 0,
      mid_yield: 800,
      low_yield: 0,
    });
    expect(ma?.collateral).toBe(1051); // 1000 base + 51 yield
    expect(ma?.liquidityBuffer).toBe(251); // 200 base buffer + 51 yield
  });

  it("should fallback to 100% in the safest vault if the safety threshold is too low for any combination", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
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
      high_yield: {
        vaultId: "high_yield",
        name: "High Yield Vault",
        interestRate: 0.12,
        sweepRisk: 0.05,
        timestamp: 1000,
      },
      mid_yield: {
        vaultId: "mid_yield",
        name: "Mid Yield Vault",
        interestRate: 0.08,
        sweepRisk: 0.03,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        advisorEnabled: true,
        advisorSafetyThreshold: 1, // 1% threshold is too low! Mid yield has 3% risk, High yield has 5% risk.
        liquidityBufferRatio: 10,
      },
    };

    // Tick economy!
    let nextState = tickEconomy(state, mockPack);

    // Safest vault is mid_yield (3% risk vs 5% risk).
    // The advisor should fallback to allocating 100% to mid_yield.
    const ma = nextState.marginAccounts?.alpha_squad;
    expect(ma?.vaultTargets).toEqual({
      mid_yield: 100,
    });
    expect(ma?.vaultAllocations).toEqual({
      mid_yield: 900,
    });
  });
});

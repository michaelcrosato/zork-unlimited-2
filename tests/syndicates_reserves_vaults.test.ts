import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Secondary Reserve Yield-Bearing Vaults & Liquidity Investment Pools (AF-106)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reserves_vaults_test_pack",
      title: "Reserves & Vaults Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure meeting place for syndicate members.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle INVEST_SECONDARY_RESERVE validations, member checks, and reserve adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Give the syndicate 1000 gold of secondary reserves
    state.secondaryReserves = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        reserveGold: 1000,
        reserveRatio: 0.2,
        timestamp: 1000,
      },
    };

    // 1. Invalid syndicate ID validation
    const act1 = {
      type: "INVEST_SECONDARY_RESERVE",
      syndicateId: "wrong_syndicate",
      vaultId: "safe_savings",
      amount: 100,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Proposing invalid vault ID
    const act2 = {
      type: "INVEST_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "wrong_vault",
      amount: 100,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("does not exist");

    // 3. Proposing valid investment by non-member agent
    const act3 = {
      type: "INVEST_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "safe_savings",
      amount: 100,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "bob", action: act3 as any }, mockPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("is not a member of syndicate");

    // 4. Proposing investment exceeding secondary reserve balance
    const act4 = {
      type: "INVEST_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "safe_savings",
      amount: 2000,
      timestamp: 1000,
    };
    let res4 = multiAgentStep(state, { agentId: "player", action: act4 as any }, mockPack);
    expect(res4.ok).toBe(false);
    expect(res4.rejectionReason).toContain("insufficient secondary reserves");

    // 5. Valid investment by player
    let res5 = multiAgentStep(state, { agentId: "player", action: act3 as any }, mockPack);
    expect(res5.ok).toBe(true);
    expect(res5.state.secondaryReserves?.blood_fangs?.reserveGold).toBe(900);
    expect(res5.state.secondaryReserveInvestments?.blood_fangs?.safe_savings?.investedGold).toBe(100);
  });

  it("should handle WITHDRAW_SECONDARY_RESERVE validations, member checks, and adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Setup state with secondary reserve and an active investment
    state.secondaryReserves = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        reserveGold: 500,
        reserveRatio: 0.2,
        timestamp: 1000,
      },
    };

    state.secondaryReserveInvestments = {
      blood_fangs: {
        safe_savings: {
          syndicateId: "blood_fangs",
          vaultId: "safe_savings",
          investedGold: 500,
          timestamp: 1000,
        },
      },
    };

    // 1. Withdraw more than invested
    const act1 = {
      type: "WITHDRAW_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "safe_savings",
      amount: 600,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("insufficient invested gold");

    // 2. Withdraw from vault with no investment
    const act2 = {
      type: "WITHDRAW_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "high_yield",
      amount: 100,
      timestamp: 1000,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: act2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("insufficient invested gold");

    // 3. Valid withdrawal
    const act3 = {
      type: "WITHDRAW_SECONDARY_RESERVE",
      syndicateId: "blood_fangs",
      vaultId: "safe_savings",
      amount: 200,
      timestamp: 1000,
    };
    let res3 = multiAgentStep(state, { agentId: "player", action: act3 as any }, mockPack);
    expect(res3.ok).toBe(true);
    expect(res3.state.secondaryReserves?.blood_fangs?.reserveGold).toBe(700);
    expect(res3.state.secondaryReserveInvestments?.blood_fangs?.safe_savings?.investedGold).toBe(300);
  });

  it("should generate passive yield and support enforcer sweep risk calculations inside tickEconomy", () => {
    let state = createInitialState({
      seed: 54321, // Use a seed that won't sweep high-risk immediately
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Setup active investments in safe_savings (2% yield, 0% risk) and high_yield (8% yield, 5% risk)
    state.secondaryReserveInvestments = {
      blood_fangs: {
        safe_savings: {
          syndicateId: "blood_fangs",
          vaultId: "safe_savings",
          investedGold: 1000,
          timestamp: 1000,
        },
        high_yield: {
          syndicateId: "blood_fangs",
          vaultId: "high_yield",
          investedGold: 1000,
          timestamp: 1000,
        },
      },
    };

    // Tick the economy!
    let nextState = tickEconomy(state, mockPack);

    // Verify safe savings earned 2% interest (1000 * 0.02 = 20 gold)
    expect(nextState.secondaryReserveInvestments?.blood_fangs?.safe_savings?.investedGold).toBe(1020);

    // High yield earned 8% interest (1000 * 0.08 = 80 gold) if it was not swept
    const highYieldGold = nextState.secondaryReserveInvestments?.blood_fangs?.high_yield?.investedGold;
    expect([1080, 0]).toContain(highYieldGold); // Either gained interest or got swept (0)

    // Now, let's explicitly test a sweep by using a seed that triggers a sweep on high_yield or risk_venture.
    // Let's tick the economy multiple times until a sweep occurs!
    let activeState = { ...state };
    // Let's replace high_yield with risk_venture (20% risk) to speed it up.
    activeState.secondaryReserveInvestments = {
      blood_fangs: {
        risk_venture: {
          syndicateId: "blood_fangs",
          vaultId: "risk_venture",
          investedGold: 1000,
          timestamp: 1000,
        },
      },
    };

    let swept = false;
    for (let i = 0; i < 50; i++) {
      activeState = tickEconomy(activeState, mockPack);
      const gold = activeState.secondaryReserveInvestments?.blood_fangs?.risk_venture?.investedGold ?? 0;
      if (gold === 0) {
        swept = true;
        break;
      }
    }
    expect(swept).toBe(true); // Should eventually sweep under high risk
  });

  it("should merge secondary reserve vaults and investments correctly over Gossip P2P mesh using LWW", () => {
    let stateA = createInitialState({
      seed: 100,
      start: "safehouse_room",
    });
    let stateB = createInitialState({
      seed: 100,
      start: "safehouse_room",
    });

    stateA.step = 10;
    stateB.step = 20;

    // Define custom vaults
    stateA.secondaryReserveVaults = {
      custom_vault: {
        vaultId: "custom_vault",
        name: "A's Custom Vault",
        interestRate: 0.05,
        sweepRisk: 0.01,
        timestamp: 1000,
      },
    };

    stateB.secondaryReserveVaults = {
      custom_vault: {
        vaultId: "custom_vault",
        name: "B's Custom Vault (Newer)",
        interestRate: 0.06,
        sweepRisk: 0.02,
        timestamp: 2000, // Newer timestamp
      },
    };

    // Define investments
    stateA.secondaryReserveInvestments = {
      blood_fangs: {
        safe_savings: {
          syndicateId: "blood_fangs",
          vaultId: "safe_savings",
          investedGold: 500,
          timestamp: 1500, // Newer
        },
      },
    };

    stateB.secondaryReserveInvestments = {
      blood_fangs: {
        safe_savings: {
          syndicateId: "blood_fangs",
          vaultId: "safe_savings",
          investedGold: 200,
          timestamp: 1000, // Older
        },
      },
    };

    // Merge Gossip
    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Vault should converge to B's version because of newer timestamp
    expect(merged.secondaryReserveVaults?.custom_vault?.name).toBe("B's Custom Vault (Newer)");
    expect(merged.secondaryReserveVaults?.custom_vault?.interestRate).toBe(0.06);

    // Investment should converge to A's version because of newer timestamp
    expect(merged.secondaryReserveInvestments?.blood_fangs?.safe_savings?.investedGold).toBe(500);
  });
});

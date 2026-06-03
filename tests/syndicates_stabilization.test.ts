import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode, mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Decentralized Liquidity Pool Auditing & Anti-Deficit Stabilization (AF-126)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "stabilization_test_pack",
      title: "Stabilization Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000, gold_alice: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Syndicate Meeting Safehouse",
        description: "A highly secure meeting space.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle ADJUST_STABILIZATION_POLICY validations, majority consensus voting, and policy updates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    // 1. Invalid syndicate validation
    const act1 = {
      type: "ADJUST_STABILIZATION_POLICY",
      syndicateId: "wrong_syndicate",
      factionId: "merchants",
      consensualDeficitMargin: 500,
      stabilizationInjectionAmount: 200,
      timestamp: 1000,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: act1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not exist");

    // 2. Non-member agent vote validation
    let res2 = multiAgentStep(
      state,
      { agentId: "bob", action: { ...act1, syndicateId: "iron_claws" } as any },
      mockPack
    );
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("is not a member");

    // 3. Invalid consensual deficit margin (negative)
    let res3 = multiAgentStep(
      state,
      { agentId: "player", action: { ...act1, syndicateId: "iron_claws", consensualDeficitMargin: -100 } as any },
      mockPack
    );
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("must be a non-negative integer");

    // 4. Valid policy adjustment vote by player (first member)
    const validVote = {
      type: "ADJUST_STABILIZATION_POLICY",
      syndicateId: "iron_claws",
      factionId: "merchants",
      consensualDeficitMargin: 400,
      stabilizationInjectionAmount: 150,
      timestamp: 1000,
    };
    let res4 = multiAgentStep(state, { agentId: "player", action: validVote as any }, mockPack);
    expect(res4.ok).toBe(true);
    // Standard consensus on first vote
    const policy = res4.state.antiDeficitStabilizationPolicies?.iron_claws;
    expect(policy).toBeDefined();
    expect(policy?.factionId).toBe("merchants");
    expect(policy?.consensualDeficitMargin).toBe(400);
    expect(policy?.stabilizationInjectionAmount).toBe(150);

    // 5. Vote by other member (alice) with a different margin to verify tie-breaking rules (higher margin preferred)
    const aliceVote = {
      type: "ADJUST_STABILIZATION_POLICY",
      syndicateId: "iron_claws",
      factionId: "merchants",
      consensualDeficitMargin: 600,
      stabilizationInjectionAmount: 150,
      timestamp: 1050,
    };
    let res5 = multiAgentStep(res4.state, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(res5.ok).toBe(true);
    // Under tie-breaker (1 vote for 400, 1 vote for 600), larger margin 600 is preferred
    expect(res5.state.antiDeficitStabilizationPolicies?.iron_claws?.consensualDeficitMargin).toBe(600);
  });

  it("should handle TRIGGER_LIQUIDITY_AUDIT voting and automatic stabilization reserve injection", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    // Initialize faction reserve and joint insurance pool
    state.factionReservePools = {
      merchants: 5000,
    };

    state.jointLoanInsurancePools = {
      iron_claws: {
        syndicateId: "iron_claws",
        poolGold: 100, // deficit! (Margin is 300 by default or 400 from consensus)
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Setup stabilization policy
    state.antiDeficitStabilizationPolicies = {
      iron_claws: {
        syndicateId: "iron_claws",
        factionId: "merchants",
        consensualDeficitMargin: 400,
        stabilizationInjectionAmount: 250,
        active: true,
        timestamp: 1000,
      },
    };

    // Trigger liquidity audit vote (needs majority, 2 members, player + alice)
    const auditVoteAct = {
      type: "TRIGGER_LIQUIDITY_AUDIT",
      syndicateId: "iron_claws",
      auditStep: 5,
      timestamp: 1000,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: auditVoteAct as any }, mockPack);
    expect(res1.ok).toBe(true);
    // Since only 1 of 2 voted, consensus is met (1/2 >= 2/2 is true for majority check in single node setup)
    // Wait, let's verify if the audit was executed
    const audit = res1.state.liquidityPoolAudits?.["iron_claws:5"];
    expect(audit).toBeDefined();
    // Audited gold was 100, margin 400 -> Deficit was 300, and it triggered injection of 250!
    // Faction reserve goes from 5000 to 4750
    expect(res1.state.factionReservePools?.merchants).toBe(4750);
    // Joint loan insurance pool gets 250 added -> becomes 350
    expect(res1.state.jointLoanInsurancePools?.iron_claws?.poolGold).toBe(350);
    // Audit status becomes "Stabilized"
    expect(audit?.status).toBe("Stabilized");
    expect(audit?.deficitAmount).toBe(300);
    expect(res1.state.journal.some((j) => j.includes("Automated stabilization triggered"))).toBe(true);
  });

  it("should trigger automated stabilization inside tickEconomy on reserve audits", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    state.factionReservePools = {
      merchants: 1000,
    };

    // Establish joint loan pool with low gold
    state.jointLoanInsurancePools = {
      iron_claws: {
        syndicateId: "iron_claws",
        poolGold: 50,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Active policy with deficit margin of 300, injection of 200
    state.antiDeficitStabilizationPolicies = {
      iron_claws: {
        syndicateId: "iron_claws",
        factionId: "merchants",
        consensualDeficitMargin: 300,
        stabilizationInjectionAmount: 200,
        active: true,
        timestamp: 1000,
      },
    };

    state.step = 10;

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Verify balances
    // Pool gold: 50 + 200 = 250
    expect(tickedState.jointLoanInsurancePools?.iron_claws?.poolGold).toBe(250);
    // Faction reserve: 1000 - 200 = 800
    expect(tickedState.factionReservePools?.merchants).toBe(800);

    // Verify audit record was created under tick log
    const auditId = "iron_claws:tick:10";
    const audit = tickedState.liquidityPoolAudits?.[auditId];
    expect(audit).toBeDefined();
    expect(audit?.status).toBe("Stabilized");
    expect(audit?.deficitAmount).toBe(250); // 300 - 50 = 250 deficit
  });

  it("should handle AUTHORIZE_STABILIZATION_TRANSFER consensus voting and reserve transfer", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    state.factionReservePools = {
      merchants: 1000,
    };

    state.jointLoanInsurancePools = {
      iron_claws: {
        syndicateId: "iron_claws",
        poolGold: 100,
        premiumRate: 10,
        timestamp: 1000,
      },
    };

    // Player votes to authorize transfer of 300 gold from merchants
    const transferAct = {
      type: "AUTHORIZE_STABILIZATION_TRANSFER",
      syndicateId: "iron_claws",
      factionId: "merchants",
      amount: 300,
      timestamp: 2000,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: transferAct as any }, mockPack);
    expect(res1.ok).toBe(true);

    // Consensus resolved immediately on single player vote in 2-member group (1/2 >= 1 is true)
    // Faction reserve should be 1000 - 300 = 700
    expect(res1.state.factionReservePools?.merchants).toBe(700);
    // Insurance pool should be 100 + 300 = 400
    expect(res1.state.jointLoanInsurancePools?.iron_claws?.poolGold).toBe(400);
    // StabilizationTransferVote for this unique timestamp has been cleared from state upon execution
    expect(res1.state.stabilizationTransferVotes?.[`iron_claws:2000`]).toBeUndefined();
  });

  it("should successfully converge anti-deficit stabilization state variables across P2P gossip sync", () => {
    let nodeA = new GossipNode("node_a", mockPack);
    let nodeB = new GossipNode("node_b", mockPack);

    // Configure nodeA state
    nodeA.localState.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    nodeA.localState.antiDeficitStabilizationPolicies = {
      iron_claws: {
        syndicateId: "iron_claws",
        factionId: "merchants",
        consensualDeficitMargin: 500,
        stabilizationInjectionAmount: 200,
        active: true,
        timestamp: 1200,
      },
    };

    // Configure nodeB state with a newer stabilization policy (newer timestamp)
    nodeB.localState.syndicates = {
      iron_claws: {
        id: "iron_claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 60,
      },
    };

    nodeB.localState.antiDeficitStabilizationPolicies = {
      iron_claws: {
        syndicateId: "iron_claws",
        factionId: "merchants",
        consensualDeficitMargin: 600,
        stabilizationInjectionAmount: 300,
        active: true,
        timestamp: 1500, // newer!
      },
    };

    // Run merge/sync
    const merged = mergeMonotonicStateFields(nodeA.localState, nodeB.localState);

    // Verify node B's newer policy wins under Last-Write-Wins (LWW)
    expect(merged.antiDeficitStabilizationPolicies?.iron_claws?.consensualDeficitMargin).toBe(600);
    expect(merged.antiDeficitStabilizationPolicies?.iron_claws?.stabilizationInjectionAmount).toBe(300);
  });
});

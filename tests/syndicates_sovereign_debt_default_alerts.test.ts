import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, calculateTradePrice } from "../src/core/economy.js";
import { mergeMonotonicStateFields, reconstructState } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default Alerts & Faction Reputation Penalties (AF-226)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_default_alerts_pack",
      title: "Sovereign Debt Default Alerts Test Pack",
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
        npcs: ["merchant_1"],
        exits: [],
      }
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_1",
        name: "Defaulted Merchant",
        description: "A defaulted merchant.",
        faction: "beta",
        min_rep: 0,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome",
              topics: [],
            }
          ],
        },
      }
    ],
  });

  it("should propose, vote, authorize default alerts, penalize reputation, adjust strategic pricing, and resolve default alerts upon clearing outstanding fees", () => {
    let state = createInitialState({
      seed: 54321,
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
        warChest: 3000,
      },
    };

    // Faction reps
    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    // 1. Propose default alert should fail if beta has no outstanding deflection fees
    const proposeFailed = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_ALERT",
          proposalId: "prop_alert_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          sovereignDebtAmount: 500,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(proposeFailed.ok).toBe(false);
    expect(proposeFailed.rejectionReason).toContain("is not in default");

    // Give beta some outstanding deflection fees
    state.outstandingDeflectionFees = {
      beta: 500,
    };

    // Propose default alert again - should succeed
    const proposeSuccess = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_ALERT",
          proposalId: "prop_alert_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          sovereignDebtAmount: 500,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(proposeSuccess.ok).toBe(true);
    state = proposeSuccess.state;

    // Check status is proposed
    expect(state.sovereignDebtDefaultAlerts?.["prop_alert_1"]?.status).toBe("proposed");

    // 2. Vote to authorize the default alert
    const voteSuccess = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_DEFAULT_ALERT",
          syndicateId: "alpha",
          proposalId: "prop_alert_1",
          vote: true,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(voteSuccess.ok).toBe(true);
    state = voteSuccess.state;

    // Check default alert is authorized
    expect(state.sovereignDebtDefaultAlerts?.["prop_alert_1"]?.status).toBe("authorized");

    // 3. tickEconomy should apply reputation penalty
    expect(state.factionRep?.["beta"]).toBe(100);
    state = tickEconomy(state, mockPack);
    expect(state.factionRep?.["beta"]).toBe(85); // 100 - 15 = 85


    // 4. Strategic pricing multiplier should act as pricing penalty for target syndicate members (bob/carol)
    const normalPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "player", // player is not defaulted
      mockPack
    );

    const penalizedBuyPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "bob", // bob belongs to defaulted beta syndicate
      mockPack
    );
    expect(penalizedBuyPrice).toBeGreaterThan(normalPrice); // Markup for buying

    const penalizedSellPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      false,
      "bob", // bob belongs to defaulted beta syndicate
      mockPack
    );
    expect(penalizedSellPrice).toBeLessThan(normalPrice); // Markdown for selling

    // 5. Propose resolve default alert should fail because outstanding deflection fee is still 500
    const resolveFailed = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_RESOLVE_DEFAULT_ALERT",
          proposalId: "prop_resolve_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          alertProposalId: "prop_alert_1",
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(resolveFailed.ok).toBe(false);
    expect(resolveFailed.rejectionReason).toContain("has outstanding deflection fees");

    // Clear outstanding deflection fees
    state.outstandingDeflectionFees = {
      beta: 0,
    };

    // Propose resolve default alert again - should succeed
    const resolveSuccess = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_RESOLVE_DEFAULT_ALERT",
          proposalId: "prop_resolve_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          alertProposalId: "prop_alert_1",
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(resolveSuccess.ok).toBe(true);
    state = resolveSuccess.state;

    expect(state.sovereignDebtResolveAlerts?.["prop_resolve_1"]?.status).toBe("proposed");

    // 6. Vote resolve default alert - should succeed
    const voteResolveSuccess = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_RESOLVE_DEFAULT_ALERT",
          syndicateId: "alpha",
          proposalId: "prop_resolve_1",
          vote: true,
          timestamp: 1006,
        },
      },
      mockPack
    );
    expect(voteResolveSuccess.ok).toBe(true);
    state = voteResolveSuccess.state;

    // Default alert should now be resolved
    expect(state.sovereignDebtResolveAlerts?.["prop_resolve_1"]?.status).toBe("authorized");
    expect(state.sovereignDebtDefaultAlerts?.["prop_alert_1"]?.status).toBe("resolved");

    // Strategic pricing penalty should be removed
    const resolvedBuyPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "bob",
      mockPack
    );
    expect(resolvedBuyPrice).toBe(normalPrice);
  });

  it("should synchronize default alerts across partitioned nodes during P2P gossip convergence", () => {
    let nodeA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    nodeA.syndicates = {
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
        warChest: 3000,
      },
    };

    nodeA.outstandingDeflectionFees = {
      beta: 500,
    };

    // Propose default alert on node A
    const nodeAStep1 = multiAgentStep(
      nodeA,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_ALERT",
          proposalId: "prop_alert_2",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          sovereignDebtAmount: 500,
          timestamp: 1002,
        },
      },
      mockPack
    );
    nodeA = nodeAStep1.state;

    // Node B is created starting from node A's previous base
    let nodeB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });
    nodeB.syndicates = {
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
        warChest: 3000,
      },
    };
    nodeB.outstandingDeflectionFees = {
      beta: 500,
    };

    // Merge node A's state into node B (gossip merge)
    const convergedB = mergeMonotonicStateFields(nodeB, nodeA);

    // Node B should now have the proposed alert
    expect(convergedB.sovereignDebtDefaultAlerts?.["prop_alert_2"]).toBeDefined();
    expect(convergedB.sovereignDebtDefaultAlerts?.["prop_alert_2"]?.status).toBe("proposed");

  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, calculateTradePrice } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default Grace Periods & Default Penalty Waivers (AF-227)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_default_grace_waiver_pack",
      title: "Sovereign Debt Default Grace & Waiver Test Pack",
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

  it("should propose, vote, authorize default grace periods, and temporarily bypass reputation & pricing penalties", () => {
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

    // Give beta outstanding deflection fees
    state.outstandingDeflectionFees = {
      beta: 500,
    };

    // 1. Propose default alert
    let stepRes = multiAgentStep(
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
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // 2. Vote default alert to authorize
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_DEFAULT_ALERT",
          syndicateId: "alpha",
          proposalId: "prop_alert_1",
          vote: true,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.sovereignDebtDefaultAlerts?.["prop_alert_1"]?.status).toBe("authorized");

    // 3. Propose grace period extension
    stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_GRACE_PERIOD",
          proposalId: "grace_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          alertProposalId: "prop_alert_1",
          gracePeriodSteps: 3,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.status).toBe("proposed");

    // 4. Vote to authorize the grace period
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_DEFAULT_GRACE_PERIOD",
          syndicateId: "alpha",
          proposalId: "grace_prop_1",
          vote: true,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.status).toBe("authorized");
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.remainingSteps).toBe(3);

    // 5. Under active grace period, tickEconomy should defer reputation penalty (not deduct 15)
    expect(state.factionRep?.["beta"]).toBe(100);
    state = tickEconomy(state, mockPack);
    expect(state.factionRep?.["beta"]).toBe(100); // Deferred!
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.remainingSteps).toBe(2);

    // Check pricing penalty is deferred
    const normalPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "player",
      mockPack
    );
    const penalizedBuyPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "bob",
      mockPack
    );
    expect(penalizedBuyPrice).toBe(normalPrice); // No markup/penalty during active grace period!

    // Tick economy again twice so grace period expires
    state = tickEconomy(state, mockPack); // remaining steps goes to 1, penalty deferred
    expect(state.factionRep?.["beta"]).toBe(100);
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.remainingSteps).toBe(1);

    state = tickEconomy(state, mockPack); // remaining steps goes to 0, penalty deferred on this tick (when steps was 1 at beginning)
    expect(state.factionRep?.["beta"]).toBe(100);
    expect(state.sovereignDebtDefaultGracePeriods?.["grace_prop_1"]?.remainingSteps).toBe(0);

    // Now grace period is expired (remainingSteps = 0), so next tickEconomy will apply the reputation penalty!
    state = tickEconomy(state, mockPack);
    expect(state.factionRep?.["beta"]).toBe(85); // Penalty applied: 100 - 15 = 85!

    const expiredPenalizedBuyPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "bob",
      mockPack
    );
    expect(expiredPenalizedBuyPrice).toBeGreaterThan(normalPrice); // Penalty applied!
  });

  it("should propose, vote, authorize default penalty waivers, and temporarily bypass reputation & pricing penalties", () => {
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

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    state.outstandingDeflectionFees = {
      beta: 500,
    };

    // 1. Propose default alert
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_ALERT",
          proposalId: "prop_alert_2",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          sovereignDebtAmount: 500,
          timestamp: 1001,
        },
      },
      mockPack
    );
    state = stepRes.state;

    // 2. Vote default alert to authorize
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_DEFAULT_ALERT",
          syndicateId: "alpha",
          proposalId: "prop_alert_2",
          vote: true,
          timestamp: 1002,
        },
      },
      mockPack
    );
    state = stepRes.state;

    // 3. Propose penalty waiver
    stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_PENALTY_WAIVER",
          proposalId: "waiver_prop_1",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          alertProposalId: "prop_alert_2",
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.sovereignDebtDefaultPenaltyWaivers?.["waiver_prop_1"]?.status).toBe("proposed");

    // 4. Vote penalty waiver to authorize
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_DEFAULT_PENALTY_WAIVER",
          syndicateId: "alpha",
          proposalId: "waiver_prop_1",
          vote: true,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;
    expect(state.sovereignDebtDefaultPenaltyWaivers?.["waiver_prop_1"]?.status).toBe("authorized");

    // 5. Reputation penalty and pricing penalty should be deferred/bypassed
    expect(state.factionRep?.["beta"]).toBe(100);
    state = tickEconomy(state, mockPack);
    expect(state.factionRep?.["beta"]).toBe(100); // Deferred by active penalty waiver!

    const normalPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "player",
      mockPack
    );
    const penalizedBuyPrice = calculateTradePrice(
      state,
      { id: "merchant_1", faction: "beta" },
      undefined,
      100,
      true,
      "bob",
      mockPack
    );
    expect(penalizedBuyPrice).toBe(normalPrice); // Defer pricing penalty!
  });

  it("should synchronize grace periods and penalty waivers across partitioned nodes during P2P gossip convergence", () => {
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

    // Setup active default alert on node A
    nodeA.sovereignDebtDefaultAlerts = {
      "prop_alert_3": {
        proposalId: "prop_alert_3",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 500,
        status: "authorized",
        resolved: false,
        proposerId: "player",
        timestamp: 1002,
      }
    };

    // Propose grace period on node A
    const stepRes = multiAgentStep(
      nodeA,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_DEFAULT_GRACE_PERIOD",
          proposalId: "grace_prop_2",
          syndicateId: "alpha",
          targetSyndicateId: "beta",
          alertProposalId: "prop_alert_3",
          gracePeriodSteps: 5,
          timestamp: 1003,
        },
      },
      mockPack
    );
    nodeA = stepRes.state;

    // Node B starts with same baseline but partitioned
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
    nodeB.sovereignDebtDefaultAlerts = {
      "prop_alert_3": {
        proposalId: "prop_alert_3",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 500,
        status: "authorized",
        resolved: false,
        proposerId: "player",
        timestamp: 1002,
      }
    };

    // Gossip merge from Node A to Node B
    const convergedB = mergeMonotonicStateFields(nodeB, nodeA);

    // Node B should now have converged grace periods and waivers
    expect(convergedB.sovereignDebtDefaultGracePeriods?.["grace_prop_2"]).toBeDefined();
    expect(convergedB.sovereignDebtDefaultGracePeriods?.["grace_prop_2"]?.status).toBe("proposed");
  });
});

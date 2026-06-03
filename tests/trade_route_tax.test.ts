import { describe, it, expect } from "vitest";
import { createInitialState, reconcileTradeRoutes } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Decentralized Trade Route and Faction Toll Mesh Tests", () => {
  const mockPack: ParserPack = {
    meta: {
      id: "trade_route_test_pack",
      title: "Trade Route Test Adventure",
      start_room: "clearing",
      vars_init: { gold: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "merchants",
        name: "Merchant League",
        description: "Controllers of trade.",
        initial_rep: 10,
      },
      {
        id: "bandits",
        name: "Forest Bandits",
        description: "Outlaws.",
        initial_rep: -5,
      },
      {
        id: "town_guard",
        name: "Town Guard",
        description: "Law enforcement.",
        initial_rep: 15,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Sunlit Clearing",
        description: "A beautiful forest clearing.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "crossroads",
            conditions: [],
          },
        ],
      },
      {
        id: "crossroads",
        name: "Forest Crossroads",
        description: "A dusty intersection.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "south",
            to: "clearing",
            conditions: [],
          },
          {
            direction: "east",
            to: "market",
            conditions: [],
          },
        ],
      },
      {
        id: "market",
        name: "Busy Market",
        description: "A place of commerce.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "west",
            to: "crossroads",
            conditions: [],
          },
        ],
      },
      {
        id: "isolated_cave",
        name: "Isolated Cave",
        description: "An unconnected cave.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
    win_conditions: [],
    endings: [],
  };

  it("should validate and define trade routes with adjacency checking and LWW arbitration", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 20 },
      factionRepInit: { merchants: 10, bandits: -5 },
    });

    expect(state.tradeRoutes).toEqual({});

    // 1. Invalid faction
    const resFail1 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "silk_road",
          factionId: "unknown_faction",
          rooms: ["clearing", "crossroads"],
          taxShare: 5,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail1.ok).toBe(false);
    expect(resFail1.rejectionReason).toContain("is not a valid faction");

    // 2. Disconnected rooms
    const resFail2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "silk_road",
          factionId: "merchants",
          rooms: ["clearing", "market"], // no exit clearing -> market directly
          taxShare: 5,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail2.ok).toBe(false);
    expect(resFail2.rejectionReason).toContain("disconnected");

    // 3. Successful definition
    const resOk1 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "silk_road",
          factionId: "merchants",
          rooms: ["clearing", "crossroads", "market"],
          taxShare: 5,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resOk1.ok).toBe(true);
    expect(resOk1.state.tradeRoutes?.["silk_road"]).toEqual({
      id: "silk_road",
      factionId: "merchants",
      rooms: ["clearing", "crossroads", "market"],
      definedBy: "alice",
      taxShare: 5,
      timestamp: 100,
    });
    // The definer should have their initial tax share vote registered
    expect(resOk1.state.tradeRouteVotes?.["silk_road"]?.["alice"]).toEqual({
      taxShare: 5,
      timestamp: 100,
    });
    expect(resOk1.state.tradeRoutePolicies?.["silk_road"]).toBe(5);

    // 4. LWW overwrite with higher timestamp
    const resOk2 = multiAgentStep(
      resOk1.state,
      {
        agentId: "bob",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "silk_road",
          factionId: "bandits",
          rooms: ["clearing", "crossroads"],
          taxShare: 8,
          timestamp: 200, // Newer timestamp
        } as any,
      },
      mockPack
    );
    expect(resOk2.ok).toBe(true);
    expect(resOk2.state.tradeRoutes?.["silk_road"]?.factionId).toBe("bandits");
    expect(resOk2.state.tradeRoutes?.["silk_road"]?.definedBy).toBe("bob");
    expect(resOk2.state.tradeRoutes?.["silk_road"]?.taxShare).toBe(8);

    // 5. Outdated definition transaction should be ignored (retaining LWW state)
    const resOk3 = multiAgentStep(
      resOk2.state,
      {
        agentId: "charlie",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "silk_road",
          factionId: "merchants",
          rooms: ["clearing", "crossroads", "market"],
          taxShare: 10,
          timestamp: 150, // Outdated timestamp (150 < 200)
        } as any,
      },
      mockPack
    );
    expect(resOk3.ok).toBe(true);
    expect(resOk3.state.tradeRoutes?.["silk_road"]?.factionId).toBe("bandits"); // bandit wins
  });

  it("should handle trade route tax share voting and consensus tie-breaking", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 20 },
      factionRepInit: { merchants: 10 },
    });

    // Setup base route
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "gold_trail",
          factionId: "merchants",
          rooms: ["clearing", "crossroads", "market"],
          taxShare: 4,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    expect(state.tradeRoutePolicies?.["gold_trail"]).toBe(4);

    // Vote 1: Bob votes 8 gold
    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_TRADE_ROUTE_TAX",
          routeId: "gold_trail",
          taxShare: 8,
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;
    // Tie between 4 and 8. Sort descending means 8 (higher rate) wins consensus!
    expect(state.tradeRoutePolicies?.["gold_trail"]).toBe(8);

    // Vote 2: Charlie votes 4 gold
    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_TRADE_ROUTE_TAX",
          routeId: "gold_trail",
          taxShare: 4,
          timestamp: 120,
        } as any,
      },
      mockPack
    ).state;
    // Two votes for 4, one vote for 8. Majority is 4, so 4 wins consensus!
    expect(state.tradeRoutePolicies?.["gold_trail"]).toBe(4);
  });

  it("should toll or lock hostile trade routes based on reputation, gold, and alliances", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { bandits: -5, town_guard: 15 },
    });

    // Define bandit route crossing crossroads
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_TRADE_ROUTE",
          routeId: "bandit_pass",
          factionId: "bandits",
          rooms: ["clearing", "crossroads"],
          taxShare: 6,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // 1. Move to crossroads (hostile trade route). Rep is -5 (hostile), toll is 6 gold.
    // Player has 10 gold. Toll should be paid!
    const resMove1 = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMove1.ok).toBe(true);
    expect(resMove1.state.vars["gold"]).toBe(4); // 10 - 6 paid
    expect(resMove1.events.some((e) => e.type === "narration" && e.text.includes("Paid 6 gold toll"))).toBe(true);

    // 2. Insufficient gold lock
    // Player now has 4 gold. Moving to crossroads again should fail!
    state.vars["gold"] = 4;
    const resMoveFail = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveFail.ok).toBe(false);
    expect(resMoveFail.rejectionReason).toContain("cannot afford the trade route toll");

    // 3. Extreme hostility lock (rep <= -10)
    // Make player extremely hostile with bandits (rep = -12)
    state.factionRep = { bandits: -12 };
    state.vars["gold"] = 100; // ample gold
    const resMoveLock = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveLock.ok).toBe(false);
    expect(resMoveLock.rejectionReason).toContain("locked to you due to extreme hostility");

    // 4. Allied alliance exemption
    // Bandits are allied with town_guard, and player is allied with town_guard (rep = 15)
    state.factionRep = { bandits: -5, town_guard: 15 };
    state.alliances = {
      bandits: { town_guard: "allied" },
      town_guard: { bandits: "allied" },
    };
    state.vars["gold"] = 10;
    const resMoveExempt = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveExempt.ok).toBe(true);
    expect(resMoveExempt.state.vars["gold"]).toBe(10); // No toll paid!

    // 5. Hostile alliance scaling
    // Bandits are hostile to town_guard
    state.alliances = {
      bandits: { town_guard: "hostile" },
      town_guard: { bandits: "hostile" },
    };
    state.factionRep = { bandits: 0, town_guard: 15 }; // rep with bandits is 0, but hostile alliance exists!
    const resMoveAllianceHostile = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveAllianceHostile.ok).toBe(true);
    expect(resMoveAllianceHostile.state.vars["gold"]).toBe(4); // Toll paid because alliance is hostile!
  });

  it("should propagate trade route definitions and votes across a decentralized gossip mesh and reach consensus", () => {
    const nodeA = new GossipNode("nodeA", mockPack, 42);
    const nodeB = new GossipNode("nodeB", mockPack, 42);

    nodeA.connect(nodeB);

    // 1. nodeA defines silk_road route and votes taxShare 4
    const action1 = {
      type: "DEFINE_TRADE_ROUTE",
      routeId: "silk_road",
      factionId: "merchants",
      rooms: ["clearing", "crossroads", "market"],
      taxShare: 4,
      timestamp: 100,
    };
    const resA1 = nodeA.executeLocalAction(action1 as any);
    expect(resA1.ok).toBe(true);

    // 2. nodeB votes taxShare 8 for silk_road (needs to first know about the route, so we gossip from A to B first)
    nodeA.gossip();
    expect(nodeB.localState.tradeRoutes?.["silk_road"]).toBeDefined();
    expect(nodeB.localState.tradeRoutePolicies?.["silk_road"]).toBe(4);

    const action2 = {
      type: "VOTE_TRADE_ROUTE_TAX",
      routeId: "silk_road",
      taxShare: 8,
      timestamp: 110,
    };
    const resB1 = nodeB.executeLocalAction(action2 as any);
    expect(resB1.ok).toBe(true);

    // After nodeB votes, its local state resolves consensus rate to 8 (tie between 4 and 8, sort descending picks 8)
    expect(nodeB.localState.tradeRoutePolicies?.["silk_road"]).toBe(8);

    // 3. Gossip from B back to A to converge both clocks and consensus states
    nodeB.gossip();
    expect(nodeA.localState.tradeRoutePolicies?.["silk_road"]).toBe(8);

    // Verify vector clock synchronization
    expect(nodeA.vectorClock["nodeB"]).toBeGreaterThan(0);
    expect(nodeB.vectorClock["nodeA"]).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice, checkReputationTrade } from "../src/core/economy.js";

describe("Decentralized Merchant Cartels and Price Collusion Tests", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cartel_test_pack",
      title: "Merchant Cartels Test Pack",
      start_room: "market",
      vars_init: { gold: 200 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: 10,
      },
      {
        id: "goblins",
        name: "Cave Goblins",
        description: "Greedy cave dwellers.",
        initial_rep: 5,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: ["merchant_npc1", "merchant_npc2"],
        faction: "rangers",
        exits: [],
      },
    ],
    objects: [
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        aliases: ["shield"],
        description: "A sturdy shield.",
        cost: 100,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "merchant_npc1",
        name: "Garrick",
        description: "A local trader.",
        gold: 500,
        possible_items: ["wooden_shield"],
        faction: "rangers",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              topics: [],
            },
          ],
        },
      },
      {
        id: "merchant_npc2",
        name: "Loran",
        description: "Another trader.",
        gold: 500,
        possible_items: [],
        faction: "rangers",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hi!",
              topics: [],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should define, join, and vote on policies in a merchant cartel", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 200 },
    });

    expect(state.cartels).toEqual({});

    // 1. Define a merchant cartel
    const resDefine = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_CARTEL",
          cartelId: "syndicate",
          name: "Golden Syndicate",
          members: ["merchant_npc1"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          timestamp: 100,
        } as any,
      },
      mockPack
    );

    expect(resDefine.ok).toBe(true);
    state = resDefine.state;
    expect(state.cartels?.["syndicate"]).toEqual({
      id: "syndicate",
      name: "Golden Syndicate",
      members: ["merchant_npc1"],
      factionId: "rangers",
      priceMultiplier: 1.5,
      definedBy: "alice",
      timestamp: 100,
    });

    // 2. Join a merchant cartel
    const resJoin = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "JOIN_MERCHANT_CARTEL",
          cartelId: "syndicate",
          timestamp: 110,
        } as any,
      },
      mockPack
    );

    expect(resJoin.ok).toBe(true);
    state = resJoin.state;
    expect(state.cartelMemberships?.["bob"]).toContain("syndicate");

    // 3. Vote on policy (should succeed since bob is a member)
    const resVote = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 2.0,
          embargoedFactions: ["goblins"],
          timestamp: 120,
        } as any,
      },
      mockPack
    );

    expect(resVote.ok).toBe(true);
    state = resVote.state;
    expect(state.cartelVotes?.["syndicate"]?.["bob"]).toEqual({
      priceMultiplier: 2.0,
      embargoedFactions: ["goblins"],
      timestamp: 120,
    });
    expect(state.cartelPolicies?.["syndicate"]).toEqual({
      priceMultiplier: 2.0,
      embargoedFactions: ["goblins"],
    });
  });

  it("should fail when executing cartel actions that violate validation constraints", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
    });

    // Try joining a non-existent cartel
    const resJoinFail = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "JOIN_MERCHANT_CARTEL",
          cartelId: "non_existent",
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resJoinFail.ok).toBe(false);
    expect(resJoinFail.rejectionReason).toContain("does not exist");

    // Define cartel
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_CARTEL",
          cartelId: "syndicate",
          name: "Golden Syndicate",
          members: ["merchant_npc1"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // Try voting without being a member
    const resVoteFail = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 2.0,
          embargoedFactions: ["goblins"],
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resVoteFail.ok).toBe(false);
    expect(resVoteFail.rejectionReason).toContain("not a member");
  });

  it("should support majority consensus and tie-breaking for cartel policies", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
    });

    // Setup cartel and memberships
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_CARTEL",
          cartelId: "syndicate",
          name: "Golden Syndicate",
          members: ["merchant_npc1"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: { type: "JOIN_MERCHANT_CARTEL", cartelId: "syndicate", timestamp: 105 } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: { type: "JOIN_MERCHANT_CARTEL", cartelId: "syndicate", timestamp: 106 } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: { type: "JOIN_MERCHANT_CARTEL", cartelId: "syndicate", timestamp: 107 } as any,
      },
      mockPack
    ).state;

    // Alice votes: 1.5 multiplier, embargo goblins
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 1.5,
          embargoedFactions: ["goblins"],
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // Bob votes: 2.5 multiplier, embargo rangers
    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 2.5,
          embargoedFactions: ["rangers"],
          timestamp: 115,
        } as any,
      },
      mockPack
    ).state;

    // With 2 votes (1.5 vs 2.5), tie-breaks on highest priceMultiplier -> 2.5
    // Embargoes: goblins and rangers both have 1 vote (50% of 2 voters), so both are active!
    expect(state.cartelPolicies?.["syndicate"]).toEqual({
      priceMultiplier: 2.5,
      embargoedFactions: ["goblins", "rangers"],
    });

    // Charlie votes: 1.5 multiplier, embargo goblins
    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 1.5,
          embargoedFactions: ["goblins"],
          timestamp: 120,
        } as any,
      },
      mockPack
    ).state;

    // With 3 votes:
    // Multiplier: 1.5 wins by majority (2 votes)
    // Embargo: goblins wins by majority (2 votes >= 1.5 threshold), rangers loses (1 vote < 1.5 threshold)
    expect(state.cartelPolicies?.["syndicate"]).toEqual({
      priceMultiplier: 1.5,
      embargoedFactions: ["goblins"],
    });
  });

  it("should apply coordinated price hikes under low competition", () => {
    const packObj = mockPack.objects[0]; // wooden_shield cost = 100
    const npc1 = mockPack.npcs[0]; // merchant_npc1
    const npc2 = mockPack.npcs[1]; // merchant_npc2

    let state = createInitialState({
      seed: 42,
      start: "market",
    });

    // 1. Initial price check: no cartels exist
    // base price = 100
    let price = calculateTradePrice(state, npc1, packObj, 100, true, "player", mockPack);
    expect(price).toBe(100);

    // 2. Setup cartel where ONLY merchant_npc1 is a member (50% density in the room)
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_CARTEL",
          cartelId: "syndicate",
          name: "Golden Syndicate",
          members: ["merchant_npc1"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // With 1 of 2 merchants belonging to the cartel (50%), density threshold (>= 50%) is met!
    // Coordinated price hike is active: 100 * 1.5 = 150
    price = calculateTradePrice(state, npc1, packObj, 100, true, "player", mockPack);
    expect(price).toBe(150);

    // Merchant 2 is NOT in the cartel, so price is normal
    let price2 = calculateTradePrice(state, npc2, packObj, 100, true, "player", mockPack);
    expect(price2).toBe(100);

    // 3. Vote on policy to increase multiplier to 2.0
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "JOIN_MERCHANT_CARTEL",
          cartelId: "syndicate",
          timestamp: 105,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 2.0,
          embargoedFactions: [],
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // Price should hike to 200!
    price = calculateTradePrice(state, npc1, packObj, 100, true, "player", mockPack);
    expect(price).toBe(200);
  });

  it("should enforce active embargoes against target factions", () => {
    const npc1 = mockPack.npcs[0]; // merchant_npc1

    let state = createInitialState({
      seed: 42,
      start: "market",
      factionRepInit: { goblins: 5 }, // player is allied/friendly with goblins
    });

    // 1. Initial check: trading is allowed
    let repCheck = checkReputationTrade(state, npc1);
    expect(repCheck.allowed).toBe(true);

    // 2. Setup cartel and vote to embargo goblins
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_CARTEL",
          cartelId: "syndicate",
          name: "Golden Syndicate",
          members: ["merchant_npc1"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "JOIN_MERCHANT_CARTEL",
          cartelId: "syndicate",
          timestamp: 105,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CARTEL_POLICY",
          cartelId: "syndicate",
          priceMultiplier: 1.5,
          embargoedFactions: ["goblins"],
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // Since player has positive reputation with goblins, trading is blocked by the cartel!
    repCheck = checkReputationTrade(state, npc1);
    expect(repCheck.allowed).toBe(false);
    expect(repCheck.reason).toContain("active embargoes against faction goblins");
  });

  it("should replicate active embargoes and cartel policies across a P2P Gossip mesh", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.connect(nodeB);

    // Alice defines the cartel
    const resA1 = nodeA.executeLocalAction({
      type: "DEFINE_MERCHANT_CARTEL",
      cartelId: "syndicate",
      name: "Golden Syndicate",
      members: ["merchant_npc1"],
      factionId: "rangers",
      priceMultiplier: 1.5,
      timestamp: 100,
    } as any);
    expect(resA1.ok).toBe(true);

    // Alice joins the cartel
    const resA2 = nodeA.executeLocalAction({
      type: "JOIN_MERCHANT_CARTEL",
      cartelId: "syndicate",
      timestamp: 110,
    } as any);
    expect(resA2.ok).toBe(true);

    // Gossip to Bob
    nodeA.gossip();

    // Bob should have received the cartel definition and Alice's membership!
    expect(nodeB.localState.cartels?.["syndicate"]?.name).toBe("Golden Syndicate");
    expect(nodeB.localState.cartelMemberships?.["alice"]).toContain("syndicate");

    // Bob joins the cartel
    const resB = nodeB.executeLocalAction({
      type: "JOIN_MERCHANT_CARTEL",
      cartelId: "syndicate",
      timestamp: 120,
    } as any);
    expect(resB.ok).toBe(true);

    // Bob votes on a policy: 3.0 multiplier, embargo goblins
    const resB2 = nodeB.executeLocalAction({
      type: "VOTE_CARTEL_POLICY",
      cartelId: "syndicate",
      priceMultiplier: 3.0,
      embargoedFactions: ["goblins"],
      timestamp: 130,
    } as any);
    expect(resB2.ok).toBe(true);

    expect(nodeB.localState.cartelPolicies?.["syndicate"]?.priceMultiplier).toBe(3.0);
    expect(nodeA.localState.cartelPolicies?.["syndicate"]?.priceMultiplier).toBe(1.5);

    // Gossip back to Alice
    nodeB.gossip();

    // Alice should converge and now have the cartel policy and Bob's membership!
    expect(nodeA.localState.cartelMemberships?.["bob"]).toContain("syndicate");
    expect(nodeA.localState.cartelPolicies?.["syndicate"]?.priceMultiplier).toBe(3.0);
    expect(nodeA.localState.cartelPolicies?.["syndicate"]?.embargoedFactions).toContain("goblins");
  });
});

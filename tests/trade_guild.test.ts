import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Decentralized Merchant Trade Guilds and Territory Tariff Arbitrations", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "trade_guild_pack",
      title: "Merchant Trade Guilds Test Pack",
      start_room: "clearing",
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
        id: "shadow_guild",
        name: "Shadow Guild",
        description: "Silent controllers.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A sunny clearing.",
        objects: [],
        npcs: ["merchant_npc"],
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
        id: "merchant_npc",
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
    ],
    win_conditions: [],
    endings: [],
  });

  it("should define, join, and vote on policies in a merchant trade guild", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 200 },
    });

    expect(state.merchantGuilds).toEqual({});

    // 1. Define a merchant guild
    const resDefine = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_GUILD",
          guildId: "iron_ring",
          name: "Iron Ring Guild",
          members: ["merchant_npc"],
          timestamp: 100,
        } as any,
      },
      mockPack
    );

    expect(resDefine.ok).toBe(true);
    state = resDefine.state;
    expect(state.merchantGuilds?.["iron_ring"]).toEqual({
      id: "iron_ring",
      name: "Iron Ring Guild",
      members: ["merchant_npc"],
      definedBy: "alice",
      timestamp: 100,
    });

    // 2. Join a merchant guild
    const resJoin = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "JOIN_MERCHANT_GUILD",
          guildId: "iron_ring",
          timestamp: 110,
        } as any,
      },
      mockPack
    );

    expect(resJoin.ok).toBe(true);
    state = resJoin.state;
    expect(state.guildMemberships?.["alice"]).toContain("iron_ring");

    // 3. Vote on policy (should succeed since alice is a member)
    const resVote = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10,
          exportPricingPolicy: "premium",
          timestamp: 120,
        } as any,
      },
      mockPack
    );

    expect(resVote.ok).toBe(true);
    state = resVote.state;
    expect(state.guildVotes?.["iron_ring"]?.["alice"]).toEqual({
      tariffRate: 10,
      exportPricingPolicy: "premium",
      timestamp: 120,
    });
    expect(state.guildPolicies?.["iron_ring"]).toEqual({
      tariffRate: 10,
      exportPricingPolicy: "premium",
    });
  });

  it("should fail when executing actions that violate validation constraints", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // Try joining a non-existent guild
    const resJoinFail = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "JOIN_MERCHANT_GUILD",
          guildId: "non_existent",
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resJoinFail.ok).toBe(false);
    expect(resJoinFail.rejectionReason).toContain("does not exist");

    // Define guild
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_GUILD",
          guildId: "iron_ring",
          name: "Iron Ring Guild",
          members: ["merchant_npc"],
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // Try voting without being a member
    const resVoteFail = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10,
          exportPricingPolicy: "premium",
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resVoteFail.ok).toBe(false);
    expect(resVoteFail.rejectionReason).toContain("not a member");
  });

  it("should support majority consensus and tie-breaking for guild policies", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // Setup guild and memberships
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_GUILD",
          guildId: "iron_ring",
          name: "Iron Ring Guild",
          members: ["merchant_npc"],
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: { type: "JOIN_MERCHANT_GUILD", guildId: "iron_ring", timestamp: 105 } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: { type: "JOIN_MERCHANT_GUILD", guildId: "iron_ring", timestamp: 106 } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: { type: "JOIN_MERCHANT_GUILD", guildId: "iron_ring", timestamp: 107 } as any,
      },
      mockPack
    ).state;

    // Alice votes: 10%, premium
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10,
          exportPricingPolicy: "premium",
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // Bob votes: 20%, standard
    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 20,
          exportPricingPolicy: "standard",
          timestamp: 115,
        } as any,
      },
      mockPack
    ).state;

    // With 2 votes (10% vs 20%), tie-breaks on highest tariff rate -> 20%
    // Policy tie-breaks on premium > standard -> premium
    expect(state.guildPolicies?.["iron_ring"]).toEqual({
      tariffRate: 20,
      exportPricingPolicy: "premium",
    });

    // Charlie votes: 10%, standard
    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10,
          exportPricingPolicy: "standard",
          timestamp: 120,
        } as any,
      },
      mockPack
    ).state;

    // With 3 votes:
    // Tariff rates: 10 (2 votes), 20 (1 vote) -> 10% wins by majority
    // Policy rates: standard (2 votes), premium (1 vote) -> standard wins by majority
    expect(state.guildPolicies?.["iron_ring"]).toEqual({
      tariffRate: 10,
      exportPricingPolicy: "standard",
    });
  });

  it("should apply strategic trade price changes (member discounts, non-member guild tariffs, export policies)", () => {
    const packObj = mockPack.objects[0]; // cost = 100
    const npc = mockPack.npcs[0];

    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // Setup guild and policy
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_GUILD",
          guildId: "iron_ring",
          name: "Iron Ring",
          members: ["merchant_npc"],
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: { type: "JOIN_MERCHANT_GUILD", guildId: "iron_ring", timestamp: 105 } as any,
      },
      mockPack
    ).state;

    // Alice is a member, Bob is not
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10, // 10% guild tariff
          exportPricingPolicy: "standard",
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // 1. Calculate price for Alice (guild member: gets 15% discount on buying)
    // baseCost = 100 * 0.85 = 85
    const alicePrice = calculateTradePrice(state, npc, packObj, 100, true, "alice");
    expect(alicePrice).toBe(85);

    // 2. Calculate price for Bob (non-member: pays 10% guild tariff)
    // baseCost = 100 * 1.10 = 110
    const bobPrice = calculateTradePrice(state, npc, packObj, 100, true, "bob");
    expect(bobPrice).toBe(110);

    // 3. Update export policy to premium (affects non-members by extra 25% buy markup)
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_GUILD_POLICY",
          guildId: "iron_ring",
          tariffRate: 10,
          exportPricingPolicy: "premium",
          timestamp: 120,
        } as any,
      },
      mockPack
    ).state;

    // Bob pays both 10% guild tariff and 25% premium markup: 100 * 1.10 * 1.25 = 137.5 -> 138
    const bobPricePremium = calculateTradePrice(state, npc, packObj, 100, true, "bob");
    expect(bobPricePremium).toBe(138);
  });

  it("should negotiate collective bargaining agreements that override faction tariffs", () => {
    const packObj = mockPack.objects[0]; // cost = 100
    const npc = mockPack.npcs[0]; // faction = rangers

    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 0 },
      territoryControlInit: { clearing: "rangers" },
    });

    // 1. Setup standard faction licensing / tariff policy at 30% standard tariff
    state = multiAgentStep(
      state,
      {
        agentId: "fletcher",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: 30,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    expect(state.tariffPolicy?.["rangers"]).toBe(30);

    // Setup guild and membership
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_GUILD",
          guildId: "iron_ring",
          name: "Iron Ring",
          members: ["merchant_npc"],
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: { type: "JOIN_MERCHANT_GUILD", guildId: "iron_ring", timestamp: 105 } as any,
      },
      mockPack
    ).state;

    // Bob is a standard player, unlicensed. He pays the 30% faction tariff
    // price = 100 * 1.3 = 130
    const bobNormalPrice = calculateTradePrice(state, npc, packObj, 100, true, "bob");
    expect(bobNormalPrice).toBe(130);

    // 2. Alice (guild member) negotiates a collective bargaining agreement for 5% tariff instead of 30% standard
    const resBargain = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "NEGOTIATE_COLLECTIVE_BARGAINING",
          guildId: "iron_ring",
          factionId: "rangers",
          agreedTariff: 5,
          timestamp: 120,
        } as any,
      },
      mockPack
    );

    expect(resBargain.ok).toBe(true);
    state = resBargain.state;

    expect(state.collectiveBargainingAgreements?.["iron_ring:rangers"]).toBeDefined();
    expect(state.collectiveBargainingAgreements?.["iron_ring:rangers"]?.agreedTariff).toBe(5);

    // Bob (not a member of the guild) is still subject to standard rules?
    // Wait, let's verify: the CBA tariff applies to transactions with guild merchants where standard faction tariffs apply, for non-members of the guild who trade.
    // Yes! Let's check Bob's new price:
    // With CBA override, Bob pays CBA tariff of 5% instead of standard 30%!
    // price = 100 * 1.05 = 105
    const bobCbaPrice = calculateTradePrice(state, npc, packObj, 100, true, "bob");
    expect(bobCbaPrice).toBe(105);
  });

  it("should replicate guild standings, memberships, and CBA parameters across a P2P Gossip mesh", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.connect(nodeB);

    // Alice defines the guild
    const resA1 = nodeA.executeLocalAction({
      type: "DEFINE_MERCHANT_GUILD",
      guildId: "iron_ring",
      name: "Iron Ring Guild",
      members: ["merchant_npc"],
      timestamp: 100,
    } as any);
    expect(resA1.ok).toBe(true);

    // Alice joins the guild
    const resA2 = nodeA.executeLocalAction({
      type: "JOIN_MERCHANT_GUILD",
      guildId: "iron_ring",
      timestamp: 110,
    } as any);
    expect(resA2.ok).toBe(true);

    // Gossip to Bob
    nodeA.gossip();

    // Bob should have received the guild definition and Alice's membership!
    expect(nodeB.localState.merchantGuilds?.["iron_ring"]?.name).toBe("Iron Ring Guild");
    expect(nodeB.localState.guildMemberships?.["alice"]).toContain("iron_ring");

    // Bob joins the guild
    const resB = nodeB.executeLocalAction({
      type: "JOIN_MERCHANT_GUILD",
      guildId: "iron_ring",
      timestamp: 120,
    } as any);
    expect(resB.ok).toBe(true);

    // Bob votes on a policy: 10% tariff, premium policy
    const resB2 = nodeB.executeLocalAction({
      type: "VOTE_GUILD_POLICY",
      guildId: "iron_ring",
      tariffRate: 10,
      exportPricingPolicy: "premium",
      timestamp: 130,
    } as any);
    expect(resB2.ok).toBe(true);

    expect(nodeB.localState.guildPolicies?.["iron_ring"]?.tariffRate).toBe(10);
    expect(nodeA.localState.guildPolicies?.["iron_ring"]).toBeUndefined();

    // Gossip back to Alice
    nodeB.gossip();

    // Alice should converge and now have the guild policy and Bob's membership!
    expect(nodeA.localState.guildMemberships?.["bob"]).toContain("iron_ring");
    expect(nodeA.localState.guildPolicies?.["iron_ring"]?.tariffRate).toBe(10);
    expect(nodeA.localState.guildPolicies?.["iron_ring"]?.exportPricingPolicy).toBe("premium");
  });
});

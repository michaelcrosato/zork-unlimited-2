import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step, tickEnforcers, tickSmugglingConvoys } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { PureRand } from "../src/core/rng.js";

describe("Smuggler Guilds, CBA Traversal Overrides, and Cooperative Cartel Bounties (AF-68)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "smuggler_bounties_test_pack",
      title: "Smuggler Guilds and Bounties Test Adventure",
      start_room: "clearing",
      vars_init: { gold: 1000, gold_alice: 500, gold_bob: 500 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -15, // Hostile to trigger locks and tolls
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
        ],
      },
    ],
    objects: [
      {
        id: "spice",
        name: "Contraband Spice",
        description: "Illegal spices.",
        cost: 100,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
    win_conditions: [],
    endings: [],
  });

  (mockPack as any).start = "clearing";

  it("should define a smuggler guild, join, vote on CBA, and override crossing tolls", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 200 },
      agentsInit: ["player"],
      factionRepInit: { rangers: -15 }, // Extremely hostile to trigger locked route
    });

    // Setup a syndicate
    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 100,
      },
    };

    // Setup trade route
    state.tradeRoutes = {
      rangers_trail: {
        id: "rangers_trail",
        factionId: "rangers",
        rooms: ["clearing", "crossroads"],
        definedBy: "player",
        taxShare: 30,
        timestamp: 110,
      },
    };

    // Attempting to move north should fail due to extreme hostility lock
    const resMoveFail = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveFail.ok).toBe(false);
    expect(resMoveFail.rejectionReason).toContain("locked");

    // 1. Define a smuggler guild
    const resDefine = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEFINE_SMUGGLER_GUILD",
          guildId: "shadow_smugglers",
          name: "Shadow Smugglers Guild",
          syndicateId: "shadow_cartel",
          members: ["player"],
          timestamp: 120,
        },
      },
      mockPack
    );

    expect(resDefine.ok).toBe(true);
    state = resDefine.state;
    expect(state.smugglerGuilds?.["shadow_smugglers"]).toBeDefined();
    expect(state.smugglerGuilds?.["shadow_smugglers"]?.name).toBe("Shadow Smugglers Guild");

    // 2. Vote on CBA to set rangers_trail agreed toll to 0
    const resVote = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "VOTE_SMUGGLER_GUILD_CBA",
          guildId: "shadow_smugglers",
          routeId: "rangers_trail",
          agreedToll: 0,
          timestamp: 130,
        },
      },
      mockPack
    );

    expect(resVote.ok).toBe(true);
    state = resVote.state;
    expect(state.smugglerGuildCbas?.["shadow_smugglers:rangers_trail"]?.agreedToll).toBe(0);

    // 3. Move north again. Since we have a Smuggler Guild CBA at 0 toll, we bypass the extreme hostility lock and pay no toll!
    const resMoveSuccess = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resMoveSuccess.ok).toBe(true);
    expect(resMoveSuccess.state.vars["gold"]).toBe(200); // No toll paid
    expect(resMoveSuccess.state.current).toBe("crossroads");
  });

  it("should enforce validation constraints when defining smuggler guilds or voting", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // Try defining without a valid crime syndicate
    const resDefineFail = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEFINE_SMUGGLER_GUILD",
          guildId: "shadow_smugglers",
          name: "Shadow Smugglers",
          syndicateId: "non_existent",
          members: ["player"],
          timestamp: 100,
        },
      },
      mockPack
    );
    expect(resDefineFail.ok).toBe(false);
    expect(resDefineFail.rejectionReason).toContain("does not exist");

    // Create syndicate but exclude player
    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 100,
      },
    };

    // Try defining when not a member of syndicate
    const resDefineFail2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEFINE_SMUGGLER_GUILD",
          guildId: "shadow_smugglers",
          name: "Shadow Smugglers",
          syndicateId: "shadow_cartel",
          members: ["player"],
          timestamp: 110,
        },
      },
      mockPack
    );
    expect(resDefineFail2.ok).toBe(false);
    expect(resDefineFail2.rejectionReason).toContain("not a member");
  });

  it("should support majority consensus and tie-breaking for smuggler CBA tolls", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["alice", "bob", "charlie"],
        definedBy: "alice",
        timestamp: 100,
      },
    };

    state.smugglerGuilds = {
      shadow_smugglers: {
        id: "shadow_smugglers",
        name: "Shadow Smugglers",
        syndicateId: "shadow_cartel",
        members: ["alice", "bob", "charlie"],
        definedBy: "alice",
        timestamp: 110,
      },
    };

    state.smugglerGuildMemberships = {
      alice: ["shadow_smugglers"],
      bob: ["shadow_smugglers"],
      charlie: ["shadow_smugglers"],
    };

    // Alice votes agreed toll = 10
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_SMUGGLER_GUILD_CBA",
          guildId: "shadow_smugglers",
          routeId: "rangers_trail",
          agreedToll: 10,
          timestamp: 120,
        },
      },
      mockPack
    ).state;

    expect(state.smugglerGuildCbas?.["shadow_smugglers:rangers_trail"]?.agreedToll).toBe(10);

    // Bob votes agreed toll = 20
    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_SMUGGLER_GUILD_CBA",
          guildId: "shadow_smugglers",
          routeId: "rangers_trail",
          agreedToll: 20,
          timestamp: 130,
        },
      },
      mockPack
    ).state;

    // Tie-break sorts descending, so 20 wins!
    expect(state.smugglerGuildCbas?.["shadow_smugglers:rangers_trail"]?.agreedToll).toBe(20);

    // Charlie votes agreed toll = 10
    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_SMUGGLER_GUILD_CBA",
          guildId: "shadow_smugglers",
          routeId: "rangers_trail",
          agreedToll: 10,
          timestamp: 140,
        },
      },
      mockPack
    ).state;

    // Majority of 2 votes for 10 wins!
    expect(state.smugglerGuildCbas?.["shadow_smugglers:rangers_trail"]?.agreedToll).toBe(10);
  });

  it("should override smuggling convoy tolls if a guild CBA is active for the route", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 100,
      },
    };

    // Smuggler guild with a CBA for route_1 at 2 gold toll per cargo
    state.smugglerGuilds = {
      shadow_smugglers: {
        id: "shadow_smugglers",
        name: "Shadow Smugglers",
        syndicateId: "shadow_cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 110,
      },
    };

    state.smugglerGuildCbas = {
      "shadow_smugglers:route_1": {
        guildId: "shadow_smugglers",
        routeId: "route_1",
        agreedToll: 2,
      },
    };

    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        cargo: 5,
        currentRoomIndex: 0,
        status: "en_route",
        definedBy: "player",
        goldCost: 100,
        timestamp: 120,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["clearing", "crossroads"],
        definedBy: "player",
        taxShare: 30, // Normally 30 gold toll * cargo
        timestamp: 100,
      },
    };

    state.vars = { gold: 100 };
    state.territoryControl = { crossroads: "rangers" };

    const events: any[] = [];
    const newState = tickSmugglingConvoys(state, events, mockPack);

    // Standard toll would be 30 * 5 = 150 gold.
    // Overridden CBA toll is 2 * 5 = 10 gold!
    // Remaining gold should be 100 - 10 = 90 gold.
    expect(newState.vars["gold"]).toBe(90);
    expect(newState.journal?.some((j) => j.includes("paid 10 gold"))).toBe(true);
  });

  it("should pool bounty resources cooperatively and let syndicate agents hunt down enforcers", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 100,
      },
    };

    state.enforcers = {
      patrol_1: {
        id: "patrol_1",
        name: "Ranger Patrol 1",
        currentRoom: "crossroads",
        status: "idle",
        isBountyHunter: false,
        timestamp: 110,
      },
    };

    state.vars = { gold: 500 };

    // 1. Pool 150 gold on patrol_1
    const resPool = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "POOL_BOUNTY_RESOURCES",
          syndicateId: "shadow_cartel",
          targetId: "patrol_1",
          goldAmount: 150,
          timestamp: 120,
        },
      },
      mockPack
    );

    expect(resPool.ok).toBe(true);
    state = resPool.state;
    expect(state.vars["gold"]).toBe(350); // Gold deducted
    expect(state.bounties?.["patrol_1"]).toBeDefined();
    expect(state.bounties?.["patrol_1"]?.amount).toBe(150);
    expect(state.bounties?.["patrol_1"]?.active).toBe(true);

    // 2. Pool another 50 gold to verify accumulation
    const resPool2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "POOL_BOUNTY_RESOURCES",
          syndicateId: "shadow_cartel",
          targetId: "patrol_1",
          goldAmount: 50,
          timestamp: 130,
        },
      },
      mockPack
    );

    expect(resPool2.ok).toBe(true);
    state = resPool2.state;
    expect(state.vars["gold"]).toBe(300);
    expect(state.bounties?.["patrol_1"]?.amount).toBe(200);

    // 3. Tick enforcers to let syndicate agents hunt them down (mocking seed to get success)
    // We override seed to ensure 15% roll triggers defeat
    let winningSeed = 0;
    for (let s = 0; s < 100; s++) {
      const { value } = PureRand.nextInt(s, 1, 100);
      if (value <= 15) {
        winningSeed = s;
        break;
      }
    }
    state.seed = winningSeed;
    const events: any[] = [];
    const newState = tickEnforcers(state, events, mockPack);

    expect(newState.enforcers?.["patrol_1"]?.status).toBe("defeated");
    expect(newState.bounties?.["patrol_1"]?.active).toBe(false);
    // Awarded 200 gold bounty back to player (winning agent)
    expect(newState.vars["gold"]).toBe(500);
  });

  it("should replicate smuggler guilds, memberships, and CBA parameters across P2P mesh", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.connect(nodeB);

    // Alice creates the crime syndicate decentralized action first!
    const resA0 = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["alice", "bob"],
      timestamp: 100,
    } as any);
    expect(resA0.ok).toBe(true);

    // Alice defines the smuggler guild
    const resA1 = nodeA.executeLocalAction({
      type: "DEFINE_SMUGGLER_GUILD",
      guildId: "shadow_smugglers",
      name: "Shadow Smugglers Guild",
      syndicateId: "shadow_cartel",
      members: ["alice", "bob"],
      timestamp: 110,
    });
    expect(resA1.ok).toBe(true);

    // Gossip to Bob
    nodeA.gossip();

    // Bob should converge and see the defined guild
    expect(nodeB.localState.smugglerGuilds?.["shadow_smugglers"]).toBeDefined();
    expect(nodeB.localState.smugglerGuildMemberships?.["alice"]).toContain("shadow_smugglers");

    // Bob votes on CBA: Rangers trail agreed toll = 5
    const resB1 = nodeB.executeLocalAction({
      type: "VOTE_SMUGGLER_GUILD_CBA",
      guildId: "shadow_smugglers",
      routeId: "rangers_trail",
      agreedToll: 5,
      timestamp: 120,
    });
    expect(resB1.ok).toBe(true);

    // Gossip back to Alice
    nodeB.gossip();

    // Alice converges and sees the CBA!
    expect(nodeA.localState.smugglerGuildCbas?.["shadow_smugglers:rangers_trail"]?.agreedToll).toBe(5);
  });
});

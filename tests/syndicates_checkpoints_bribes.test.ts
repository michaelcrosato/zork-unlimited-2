import { describe, it, expect } from "vitest";
import { createInitialState, reconcileSyndicateBribes } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { step } from "../src/core/engine.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Crime Syndicate Turf Contraband Checkpoints & Automatic Bribe Extortions (AF-54)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_checkpoint_pack",
      title: "Syndicate Checkpoint Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "alley",
          },
        ],
      },
      {
        id: "alley",
        name: "Dark Alley",
        description: "A dark alleyway controlled by the syndicate.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
        ],
      },
    ],
    objects: [
      {
        id: "lockpick",
        name: "Lockpick",
        description: "A suspicious tool.",
        takeable: true,
        cost: 20,
      },
    ],
    npcs: [],
  });

  it("should support ESTABLISH_CHECKPOINT action and validation", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 5,
        turfBribeCost: 10,
      },
    };

    // 1. Rejected if syndicate does not control the turf in room
    const noControlRes = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ESTABLISH_CHECKPOINT",
          roomId: "alley",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(noControlRes.ok).toBe(false);
    expect(noControlRes.rejectionReason).toContain("does not control the turf");

    // 2. Control turf, then establish checkpoint successfully
    state.syndicateTurf = {
      alley: "syndicate_black",
    };

    const successRes = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ESTABLISH_CHECKPOINT",
          roomId: "alley",
          syndicateId: "syndicate_black",
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(successRes.ok).toBe(true);
    expect(successRes.state.turfCheckpoints?.["alley"]?.active).toBe(true);
    expect(successRes.state.turfCheckpoints?.["alley"]?.syndicateId).toBe("syndicate_black");
  });

  it("should support ADJUST_TURF_BRIBE vote action and consensus arbitration", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["agent_a", "agent_b", "agent_c"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["agent_a", "agent_b", "agent_c"],
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 5,
        turfBribeCost: 10,
      },
    };

    // 1. Rejected if non-member votes
    const nonMemberRes = multiAgentStep(
      state,
      {
        agentId: "agent_d",
        action: {
          type: "ADJUST_TURF_BRIBE",
          syndicateId: "syndicate_black",
          amount: 25,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberRes.ok).toBe(false);
    expect(nonMemberRes.rejectionReason).toContain("cannot vote");

    // 2. Member votes to adjust bribe amount to 50
    const vote1Res = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ADJUST_TURF_BRIBE",
          syndicateId: "syndicate_black",
          amount: 50,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(vote1Res.ok).toBe(true);
    expect(vote1Res.state.syndicateBribeVotes?.["syndicate_black"]?.["agent_a"]?.amount).toBe(50);
    expect(vote1Res.state.syndicates?.["syndicate_black"]?.turfBribeCost).toBe(50);

    // 3. Second member votes for 30 (tie-breaking, prefers higher amount 50)
    const vote2Res = multiAgentStep(
      vote1Res.state,
      {
        agentId: "agent_b",
        action: {
          type: "ADJUST_TURF_BRIBE",
          syndicateId: "syndicate_black",
          amount: 30,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(vote2Res.ok).toBe(true);
    expect(vote2Res.state.syndicates?.["syndicate_black"]?.turfBribeCost).toBe(50);

    // 4. Third member votes for 30 (majority 30 over 50)
    const vote3Res = multiAgentStep(
      vote2Res.state,
      {
        agentId: "agent_c",
        action: {
          type: "ADJUST_TURF_BRIBE",
          syndicateId: "syndicate_black",
          amount: 30,
          timestamp: 1004,
        } as any,
      },
      mockPack
    );
    expect(vote3Res.ok).toBe(true);
    expect(vote3Res.state.syndicates?.["syndicate_black"]?.turfBribeCost).toBe(30);
  });

  it("should wire traversal checks Carrying Contraband through checkpoints", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 100 },
      flagsInit: [],
    });

    // Make lockpick a contraband item
    state.contrabandBlacklist = {
      lockpick: {
        blacklisted: true,
        timestamp: 1000,
      },
    };

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["agent_a"], // player is NOT a member
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 5,
        turfBribeCost: 40,
      },
    };

    // Control alley and establish checkpoint
    state.syndicateTurf = {
      alley: "syndicate_black",
    };
    state.turfCheckpoints = {
      alley: {
        roomId: "alley",
        syndicateId: "syndicate_black",
        active: true,
        timestamp: 1001,
      },
    };

    // Player takes contraband lockpick in market
    state.inventory = ["lockpick"];

    // 1. Move North carrying contraband, has enough gold to pay 40 gold bribe toll
    const paidBribeRes = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(paidBribeRes.ok).toBe(true);
    expect(paidBribeRes.state.current).toBe("alley");
    expect(paidBribeRes.state.vars["gold"]).toBe(45); // 100 - 40 bribe - 15 extortion toll
    // distributed to members (agent_a)
    expect(paidBribeRes.state.vars["gold_agent_a"]).toBe(55);
    expect(paidBribeRes.events.some(e => e.type === "narration" && e.text.includes("bribe toll"))).toBe(true);

    // 2. Move North carrying contraband, does NOT have enough gold to pay 40 gold bribe toll
    state.vars["gold"] = 20;
    const fightRes = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(fightRes.ok).toBe(true); // movement allowed but combat starts immediately in dest room
    expect(fightRes.state.current).toBe("alley");
    expect(fightRes.state.flags["in_combat_with_turf_enforcer_syndicate_black"]).toBe(true);
    expect(fightRes.state.enforcers?.["turf_enforcer_syndicate_black"]).toBeDefined();
    expect(fightRes.state.vars["npc_hp_turf_enforcer_syndicate_black"]).toBe(30);
    expect(fightRes.events.some(e => e.type === "narration" && e.text.includes("Enforcer detects your contraband and attacks"))).toBe(true);
  });

  it("should reconcile checkpoints and bribe votes across the Gossip P2P mesh", () => {
    const nodeA = new GossipNode("node_a", mockPack, 12345);
    const nodeB = new GossipNode("node_b", mockPack, 12345);

    nodeA.connect(nodeB);

    // node_a creates syndicate black
    const createStep = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "sync_syndicate_black",
      name: "Sync Black Syndicate",
      members: ["node_a", "node_b"],
      timestamp: 1000,
    } as any);
    expect(createStep.ok).toBe(true);

    // Sync to node_b
    nodeA.gossip();
    expect(nodeB.localState.syndicates?.["sync_syndicate_black"]).toBeDefined();

    // node_a controls alley and establishes checkpoint
    nodeA.localState.vars = {
      gold: 1000,
    };

    const resWar = nodeA.executeLocalAction({
      type: "WAGE_TURF_WAR",
      roomId: "alley",
      syndicateId: "sync_syndicate_black",
      cost: 100,
      timestamp: 1005,
    } as any);
    expect(resWar.ok).toBe(true);

    const establishStep = nodeA.executeLocalAction({
      type: "ESTABLISH_CHECKPOINT",
      roomId: "alley",
      syndicateId: "sync_syndicate_black",
      timestamp: 1010,
    } as any);
    expect(establishStep.ok).toBe(true);
    expect(nodeA.localState.turfCheckpoints?.["alley"]?.active).toBe(true);

    // node_a votes for 60 bribe
    const voteAStep = nodeA.executeLocalAction({
      type: "ADJUST_TURF_BRIBE",
      syndicateId: "sync_syndicate_black",
      amount: 60,
      timestamp: 1020,
    } as any);
    expect(voteAStep.ok).toBe(true);

    // node_b votes for 40 bribe
    const voteBStep = nodeB.executeLocalAction({
      type: "ADJUST_TURF_BRIBE",
      syndicateId: "sync_syndicate_black",
      amount: 40,
      timestamp: 1021,
    } as any);
    expect(voteBStep.ok).toBe(true);

    // Sync gossip
    nodeB.gossip();
    nodeA.gossip();

    // Verify convergence on active checkpoint and consensus bribe (60)
    expect(nodeA.localState.turfCheckpoints?.["alley"]?.active).toBe(true);
    expect(nodeB.localState.turfCheckpoints?.["alley"]?.active).toBe(true);
    expect(nodeA.localState.syndicates?.["sync_syndicate_black"]?.turfBribeCost).toBe(60);
    expect(nodeB.localState.syndicates?.["sync_syndicate_black"]?.turfBribeCost).toBe(60);
  });
});

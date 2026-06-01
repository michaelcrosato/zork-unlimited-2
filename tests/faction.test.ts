import { describe, it, expect } from "vitest";
import { createInitialState, getFactionRepInit, getTerritoryControlInit } from "../src/core/state.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { applyEffect } from "../src/core/effects.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack } from "../src/parser/schema.js";
import { computeStateHash } from "../src/core/hash.js";
import { DecentralizedDungeonExpedition } from "../src/core/expedition.js";

describe("Cooperative Faction Alliances & Reputation Dynamics", () => {
  const mockPack: ParserPack = {
    meta: {
      id: "faction_test_pack",
      title: "Faction Test Adventure",
      start_room: "clearing",
      vars_init: {},
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Protectors of the green woods.",
        initial_rep: 10,
      },
      {
        id: "shadow_guild",
        name: "Shadow Guild",
        description: "Secret syndicate operating in the dark.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Sunlit Clearing",
        description: "A lovely open space. Paths lead north.",
        objects: ["altar", "rangers_badge"],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "ranger_outpost",
            conditions: [
              {
                faction_rep_gte: { faction: "rangers", value: 15 },
              },
            ],
            locked_msg: "The ranger outpost is closed to outsiders.",
          },
        ],
      },
      {
        id: "ranger_outpost",
        name: "Ranger Outpost",
        description: "A fortified shelter for the Forest Rangers.",
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
        id: "altar",
        name: "ancient altar",
        aliases: ["altar"],
        description: "An altar carved with strange runes. You can USE it to pray.",
        takeable: false,
        quest_critical: false,
        container: false,
        openable: false,
        locked: false,
        contents: [],
        interactions: [
          {
            verb: "USE",
            item: "altar",
            target: "altar",
            conditions: [],
            effects: [
              {
                change_faction_reputation: { faction_id: "rangers", by: 5 },
              },
              {
                narrate: "You feel a warm, green energy fill you. Your reputation with the Rangers has increased!",
              },
            ],
          },
        ],
      },
      {
        id: "rangers_badge",
        name: "rangers badge",
        aliases: ["badge"],
        description: "A shiny metallic leaf badge. Inspecting it requires Ranger trust.",
        takeable: true,
        quest_critical: false,
        container: false,
        openable: false,
        locked: false,
        contents: [],
        interactions: [
          {
            verb: "USE",
            item: "badge",
            target: "rangers_badge",
            conditions: [
              {
                faction_rep_gte: { faction: "rangers", value: 15 },
              },
            ],
            effects: [
              {
                narrate: "The leaf-badge glows brightly, recognizing you as a true ally of the forest.",
              },
            ],
          },
        ],
      },
    ],
    npcs: [],
    win_conditions: [],
    endings: [],
  };

  it("should initialize faction reputation from the pack's factions config", () => {
    const factionRepInit = getFactionRepInit(mockPack);
    expect(factionRepInit).toEqual({
      rangers: 10,
      shadow_guild: -5,
    });

    const state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit,
    });

    expect(state.factionRep).toEqual({
      rangers: 10,
      shadow_guild: -5,
    });
  });

  it("should evaluate faction_rep_gte and faction_rep_lte conditions correctly", () => {
    const state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 10, shadow_guild: -5 },
    });

    // Test faction_rep_gte
    expect(evaluateCondition(state, { faction_rep_gte: { faction: "rangers", value: 5 } })).toBe(true);
    expect(evaluateCondition(state, { faction_rep_gte: { faction: "rangers", value: 10 } })).toBe(true);
    expect(evaluateCondition(state, { faction_rep_gte: { faction: "rangers", value: 15 } })).toBe(false);
    expect(evaluateCondition(state, { faction_rep_gte: { faction: "unknown_faction", value: 0 } })).toBe(true);
    expect(evaluateCondition(state, { faction_rep_gte: { faction: "unknown_faction", value: 5 } })).toBe(false);

    // Test faction_rep_lte
    expect(evaluateCondition(state, { faction_rep_lte: { faction: "shadow_guild", value: 0 } })).toBe(true);
    expect(evaluateCondition(state, { faction_rep_lte: { faction: "shadow_guild", value: -5 } })).toBe(true);
    expect(evaluateCondition(state, { faction_rep_lte: { faction: "shadow_guild", value: -10 } })).toBe(false);
    expect(evaluateCondition(state, { faction_rep_lte: { faction: "unknown_faction", value: 0 } })).toBe(true);
  });

  it("should apply change_faction_reputation effect", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 10 },
    });

    const res1 = applyEffect(state, {
      change_faction_reputation: { faction_id: "rangers", by: 5 },
    });
    state = res1.state;
    expect(state.factionRep?.rangers).toBe(15);
    expect(res1.event).toEqual({
      type: "state_change",
      effect: "change_faction_reputation",
      variable: "rangers",
      value: 15,
    });

    const res2 = applyEffect(state, {
      change_faction_reputation: { faction_id: "shadow_guild", by: -2 },
    });
    state = res2.state;
    expect(state.factionRep?.shadow_guild).toBe(-2);
  });

  it("should gate exits and object interactions using faction reputation conditions in the engine step", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: getFactionRepInit(mockPack),
    });

    // 1. Try to go north. Rangers reputation is 10, but exit requires 15.
    const moveFail = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(moveFail.ok).toBe(false);
    expect(moveFail.rejectionReason).toContain("The ranger outpost is closed to outsiders.");

    // 2. Try to inspect rangers badge. Rangers reputation is 10, but interaction requires 15.
    const inspectFailCustom = step(state, { type: "USE", item: "badge", target: "rangers_badge" }, mockPack);
    expect(inspectFailCustom.ok).toBe(false);

    // 3. Pray at the altar to earn faction reputation (+5 rangers rep)
    const prayRes = step(state, { type: "USE", item: "altar", target: "altar" }, mockPack);
    expect(prayRes.ok).toBe(true);
    state = prayRes.state;
    expect(state.factionRep?.rangers).toBe(15);

    // 4. Now try to go north again. Rangers reputation is 15.
    const moveSuccess = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(moveSuccess.ok).toBe(true);
    expect(moveSuccess.state.current).toBe("ranger_outpost");

    // 5. Try to inspect the rangers badge now. Rangers reputation is 15.
    const inspectSuccess = step(state, { type: "USE", item: "badge", target: "rangers_badge" }, mockPack);
    expect(inspectSuccess.ok).toBe(true);
    expect(inspectSuccess.events.some(e => e.type === "narration" && e.text.includes("true ally"))).toBe(true);
  });

  it("should synchronize faction reputation across multiple nodes in P2P gossip mesh", () => {
    // Initialize connected Gossip nodes
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.connect(nodeB);

    // Initial reputation is 10 (rangers)
    expect(nodeA.localState.factionRep?.rangers).toBe(10);
    expect(nodeB.localState.factionRep?.rangers).toBe(10);

    // Alice executes a local action: PRAY at the altar
    const resA = nodeA.executeLocalAction({ type: "USE", item: "altar", target: "altar" });
    expect(resA.ok).toBe(true);
    expect(nodeA.localState.factionRep?.rangers).toBe(15);

    // Bob has not heard from Alice yet
    expect(nodeB.localState.factionRep?.rangers).toBe(10);

    // Alice gossips to Bob
    const syncCount = nodeA.gossip();
    expect(syncCount).toBe(1);

    // Bob now has synchronized and converged faction reputation
    expect(nodeB.localState.factionRep?.rangers).toBe(15);

    // Sync back to Alice so Alice also records Bob's clock
    nodeB.gossip();

    // Assert states and hashes are perfectly converged and deterministic
    const hashA = computeStateHash(nodeA.localState);
    const hashB = computeStateHash(nodeB.localState);
    expect(hashA).toBe(hashB);
  });

  it("should initialize room/territory control and apply traversal constraints/taxes", () => {
    // 1. Initial configuration
    const customPack: ParserPack = {
      ...mockPack,
      rooms: [
        {
          id: "clearing",
          name: "Sunlit Clearing",
          description: "A lovely open space.",
          objects: [],
          npcs: [],
          exits: [
            {
              direction: "north",
              to: "ranger_outpost",
              conditions: [],
            },
          ],
        },
        {
          id: "ranger_outpost",
          name: "Ranger Outpost",
          description: "A fortified shelter for the Forest Rangers.",
          objects: [],
          npcs: [],
          faction: "rangers", // Controlled by rangers!
          exits: [
            {
              direction: "south",
              to: "clearing",
              conditions: [],
            },
          ],
        },
      ],
    };

    const territoryControlInit = getTerritoryControlInit(customPack);
    expect(territoryControlInit).toEqual({
      ranger_outpost: "rangers",
    });

    // 2. Play with different reputation & gold levels
    // Case A: Neutral reputation (10 > rep >= 0), tax = 2. No gold.
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 0 },
      factionRepInit: { rangers: 0 }, // Neutral
      territoryControlInit,
    });

    expect(state.territoryControl?.ranger_outpost).toBe("rangers");

    // Traversal should fail due to insufficient gold for tax
    let res = step(state, { type: "MOVE", direction: "north" }, customPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("faction tax");

    // Case B: Neutral reputation, has 5 gold. Tax = 2.
    state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 5 },
      factionRepInit: { rangers: 0 }, // Neutral
      territoryControlInit,
    });

    res = step(state, { type: "MOVE", direction: "north" }, customPack);
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(3); // 5 - 2 = 3 gold left
    expect(res.events.some(e => e.type === "narration" && e.text.includes("Paid 2 gold"))).toBe(true);

    // Case C: Friendly reputation (rep >= 10), tax = 0. No gold needed.
    state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 0 },
      factionRepInit: { rangers: 10 }, // Friendly
      territoryControlInit,
    });

    res = step(state, { type: "MOVE", direction: "north" }, customPack);
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(0); // No tax paid

    // Case D: Hostile reputation (rep < 0), tax = 10. Has 5 gold => fails. Has 12 gold => succeeds.
    state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 5 },
      factionRepInit: { rangers: -5 }, // Hostile
      territoryControlInit,
    });

    res = step(state, { type: "MOVE", direction: "north" }, customPack);
    expect(res.ok).toBe(false); // Can't afford 10 gold tax

    state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 12 },
      factionRepInit: { rangers: -5 }, // Hostile
      territoryControlInit,
    });

    res = step(state, { type: "MOVE", direction: "north" }, customPack);
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(2); // 12 - 10 = 2 gold left
    expect(res.events.some(e => e.type === "narration" && e.text.includes("Paid 10 gold"))).toBe(true);
  });

  it("should resolve territory claims and arbitrate conflicts using LWW in P2P gossip mesh", () => {
    // 1. Set up connected nodes
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);
    nodeA.connect(nodeB);

    // 2. Alice claims clearing for Rangers at t = 100
    const resA = nodeA.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "clearing",
      factionId: "rangers",
      timestamp: 100,
    } as any);
    expect(resA.ok).toBe(true);
    expect(nodeA.localState.territoryControl?.clearing).toBe("rangers");

    // Bob has not heard yet
    expect(nodeB.localState.territoryControl?.clearing).toBeUndefined();

    // Bob claims clearing for Shadow Guild at t = 200 (later timestamp, should win)
    const resB = nodeB.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "clearing",
      factionId: "shadow_guild",
      timestamp: 200,
    } as any);
    expect(resB.ok).toBe(true);
    expect(nodeB.localState.territoryControl?.clearing).toBe("shadow_guild");

    // Alice gossips to Bob (Alice's earlier claim is received by Bob, but Bob's t=200 claim wins)
    nodeA.gossip();
    expect(nodeB.localState.territoryControl?.clearing).toBe("shadow_guild");

    // Bob gossips to Alice (Bob's t=200 claim is received by Alice and overwrites Alice's claim)
    nodeB.gossip();
    expect(nodeA.localState.territoryControl?.clearing).toBe("shadow_guild");

    // Assert convergence
    expect(computeStateHash(nodeA.localState)).toBe(computeStateHash(nodeB.localState));
  });

  it("should arbitrate tie-breaks by agent ID lexicographical comparison for identical claim timestamps", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);
    nodeA.connect(nodeB);

    // Identical timestamp = 100
    // Alice claims for rangers
    nodeA.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "clearing",
      factionId: "rangers",
      timestamp: 100,
    } as any);

    // Bob claims for shadow_guild
    nodeB.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "clearing",
      factionId: "shadow_guild",
      timestamp: 100,
    } as any);

    // Alice has name "alice", Bob has name "bob".
    // "alice" < "bob" lexicographically, so "alice"'s claim must win the tie-break!
    nodeA.gossip();
    nodeB.gossip();
    nodeA.gossip(); // Ensure full propagation

    expect(nodeA.localState.territoryControl?.clearing).toBe("rangers");
    expect(nodeB.localState.territoryControl?.clearing).toBe("rangers");
    expect(computeStateHash(nodeA.localState)).toBe(computeStateHash(nodeB.localState));
  });

  it("should simulate a mesh-wide territory conquest expedition with dynamic claims and convergence", () => {
    const expedition = new DecentralizedDungeonExpedition(mockPack, 42);
    const alice = expedition.spawnPeer("alice");
    const bob = expedition.spawnPeer("bob");
    const charlie = expedition.spawnPeer("charlie");

    // 1. Initial states of control are empty
    expect(alice.localState.territoryControl?.clearing).toBeUndefined();

    // 2. Charlie claims clearing for Rangers at t = 10
    expedition.claimTerritoryOn("charlie", "clearing", "rangers", 10);
    // 3. Bob claims clearing for Shadow Guild at t = 20 (wins)
    expedition.claimTerritoryOn("bob", "clearing", "shadow_guild", 20);

    // 4. Synchronize network
    expedition.synchronizeNetwork();

    // 5. Assert all nodes converged on Shadow Guild control for clearing room
    expedition.assertNetworkConvergence();
    expect(alice.localState.territoryControl?.clearing).toBe("shadow_guild");
    expect(bob.localState.territoryControl?.clearing).toBe("shadow_guild");
    expect(charlie.localState.territoryControl?.clearing).toBe("shadow_guild");
  });
});

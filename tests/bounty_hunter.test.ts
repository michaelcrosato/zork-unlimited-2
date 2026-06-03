import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Smuggling Bounty Hunters and Dynamic Enforcement Agents (AF-41)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "bounty_test_pack",
      title: "Bounty and Enforcement Test Pack",
      start_room: "safehouse",
      vars_init: { gold: 200 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: 0,
      },
    ],
    rooms: [
      {
        id: "safehouse",
        name: "Safe House",
        description: "A secure smuggling outpost.",
        objects: ["lockpick"],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "crossroads",
          },
        ],
      },
      {
        id: "crossroads",
        name: "Crossroads",
        description: "A busy crossroads checkpoint.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "safehouse",
          },
          {
            direction: "EAST",
            to: "outpost",
          },
        ],
      },
      {
        id: "outpost",
        name: "Outpost",
        description: "An isolated forest outpost.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "WEST",
            to: "crossroads",
          },
        ],
      },
    ],
    objects: [
      {
        id: "lockpick",
        name: "Illegal Lockpick",
        description: "Contraband burglary tool.",
        cost: 20,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
    win_conditions: [],
    endings: [],
  });

  it("should trigger static Enforcement Agent checks based on player reputation", () => {
    // 1. Allied reputation: lets the player pass with warning
    let stateAllied = createInitialState({
      seed: 42,
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: 10 },
    });

    stateAllied.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Captain Bob",
        factionId: "rangers",
        currentRoom: "crossroads",
        status: "idle",
        isBountyHunter: false,
        timestamp: 0,
      },
    };

    // Take contraband
    stateAllied = step(stateAllied, { type: "TAKE", item: "lockpick" }, mockPack).state;
    expect(stateAllied.inventory).toContain("lockpick");

    // Move to crossroads (Enforcer Bob room)
    let resMoveAllied = step(stateAllied, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMoveAllied.ok).toBe(true);
    expect(resMoveAllied.state.current).toBe("crossroads");
    expect(resMoveAllied.state.inventory).toContain("lockpick"); // not confiscated
    expect(
      resMoveAllied.events.some((e) => e.type === "narration" && (e as any).text.includes("allied standing"))
    ).toBe(true);

    // 2. Neutral reputation: confiscates contraband and fines gold
    let stateNeutral = createInitialState({
      seed: 42,
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: 0 },
    });

    stateNeutral.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Captain Bob",
        factionId: "rangers",
        currentRoom: "crossroads",
        status: "idle",
        isBountyHunter: false,
        timestamp: 0,
      },
    };

    // Take contraband
    stateNeutral = step(stateNeutral, { type: "TAKE", item: "lockpick" }, mockPack).state;

    // Move to crossroads
    let resMoveNeutral = step(stateNeutral, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMoveNeutral.ok).toBe(true);
    expect(resMoveNeutral.state.current).toBe("crossroads");
    expect(resMoveNeutral.state.inventory).not.toContain("lockpick"); // Confiscated!
    expect(resMoveNeutral.state.vars["gold"]).toBe(180); // Fined 20 gold
    expect(
      resMoveNeutral.events.some(
        (e) => e.type === "narration" && (e as any).text.includes("confiscates your contraband")
      )
    ).toBe(true);

    // 3. Hostile reputation: immediately initiates combat
    let stateHostile = createInitialState({
      seed: 42,
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: -10 },
    });

    stateHostile.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Captain Bob",
        factionId: "rangers",
        currentRoom: "crossroads",
        status: "idle",
        isBountyHunter: false,
        timestamp: 0,
        hp: 15,
        max_hp: 15,
        attack: 2,
        defense: 10,
        gold: 30,
        xp: 20,
      },
    };

    // Take contraband
    stateHostile = step(stateHostile, { type: "TAKE", item: "lockpick" }, mockPack).state;

    // Move to crossroads
    let resMoveHostile = step(stateHostile, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMoveHostile.ok).toBe(true);
    expect(resMoveHostile.state.current).toBe("crossroads");
    expect(resMoveHostile.state.flags["in_combat_with_enforcer_bob"]).toBe(true); // Combat started!
    expect(resMoveHostile.state.vars["npc_hp_enforcer_bob"]).toBe(15);
    expect(
      resMoveHostile.events.some(
        (e) => e.type === "narration" && (e as any).text.includes("attacks due to your hostile standing")
      )
    ).toBe(true);
  });

  it("should support Smuggling Bounty Hunter pursuit, ambush, combat resolution, and bounty payouts", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse",
      varsInit: { gold: 100 },
    });

    // 1. Declare bounty on player and setup Bounty Hunter Jack at Outpost
    const declareRes = multiAgentStep(
      state,
      {
        agentId: "agency",
        action: {
          type: "DECLARE_BOUNTY",
          targetId: "player",
          amount: 150,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(declareRes.ok).toBe(true);
    state = declareRes.state;
    expect(state.bounties?.["player"]).toEqual({
      targetId: "player",
      amount: 150,
      active: true,
      timestamp: 100,
    });

    const spawnRes = multiAgentStep(
      state,
      {
        agentId: "agency",
        action: {
          type: "UPDATE_ENFORCER",
          enforcerId: "hunter_jack",
          name: "Hunter Jack",
          currentRoom: "outpost",
          targetId: "player",
          status: "pursuing",
          isBountyHunter: true,
          timestamp: 100,
          hp: 30,
          max_hp: 30,
          attack: 4,
          defense: 12,
          gold: 50,
          xp: 40,
        } as any,
      },
      mockPack
    );
    expect(spawnRes.ok).toBe(true);
    state = spawnRes.state;
    expect(state.enforcers?.["hunter_jack"]).toBeDefined();
    expect(state.enforcers?.["hunter_jack"].currentRoom).toBe("outpost");
    expect(state.enforcers?.["hunter_jack"].status).toBe("pursuing");

    // 2. Take a step (e.g., MOVE to crossroads)
    // The hunter is at outpost, target (player) is moving to crossroads.
    // Outpost connects to crossroads, so hunter moves to crossroads.
    // Crossroads is also where the player moved! This triggers an immediate ambush!
    let moveRes = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(moveRes.ok).toBe(true);
    state = moveRes.state;

    expect(state.current).toBe("crossroads");
    expect(state.enforcers?.["hunter_jack"].currentRoom).toBe("crossroads"); // Moved to player's room!
    expect(state.flags["in_combat_with_hunter_jack"]).toBe(true); // Ambushed and combat started!
    expect(state.vars["npc_hp_hunter_jack"]).toBe(30);
    expect(
      moveRes.events.some(
        (e) => e.type === "narration" && (e as any).text.includes("Bounty Hunter Hunter Jack corners you")
      )
    ).toBe(true);

    // 3. Fight the bounty hunter!
    // Set strength high so player deals high damage, and enforcer HP low to resolve combat quickly
    state.vars["strength"] = 50;
    state.vars["npc_hp_hunter_jack"] = 2; // Almost dead

    let fightRes = step(state, { type: "FIGHT", npc: "hunter_jack" }, mockPack);
    expect(fightRes.ok).toBe(true);
    state = fightRes.state;

    expect(state.flags["in_combat_with_hunter_jack"]).toBe(false); // Combat ended
    expect(state.flags["npc_defeated_hunter_jack"]).toBe(true); // Hunter defeated
    expect(state.enforcers?.["hunter_jack"].status).toBe("defeated"); // Status set to defeated

    // Rewards earned:
    // Hunter Jack gold: 50
    // Bounty target player reward: 150
    // Total gold: start 100 + 50 (defeated) + 150 (bounty) = 300 gold!
    expect(state.vars["gold"]).toBe(300);
    expect(state.bounties?.["player"].active).toBe(false); // Bounty deactivated
  });

  it("should synchronize active bounties and enforcer lists across the gossip mesh", () => {
    const pack = mockPack;
    const nodeA = new GossipNode("alice", pack, 42);
    const nodeB = new GossipNode("bob", pack, 42);

    nodeA.connect(nodeB);

    // Node A declares bounty on Charlie
    const txA = nodeA.executeLocalAction({
      type: "DECLARE_BOUNTY",
      targetId: "charlie",
      amount: 500,
      timestamp: 1500,
    } as any);
    expect(txA.ok).toBe(true);

    // Node B updates enforcer Jack's status to defeated
    const txB = nodeB.executeLocalAction({
      type: "UPDATE_ENFORCER",
      enforcerId: "hunter_jack",
      currentRoom: "safehouse",
      status: "defeated",
      timestamp: 1600,
    } as any);
    expect(txB.ok).toBe(true);

    // Reconcile mesh states
    nodeA.gossip();
    nodeB.gossip();

    // Assert full LWW convergence!
    expect(nodeA.localState.bounties?.["charlie"]).toEqual({
      targetId: "charlie",
      amount: 500,
      active: true,
      timestamp: 1500,
    });
    expect(nodeB.localState.bounties?.["charlie"]).toEqual({
      targetId: "charlie",
      amount: 500,
      active: true,
      timestamp: 1500,
    });

    expect(nodeA.localState.enforcers?.["hunter_jack"].status).toBe("defeated");
    expect(nodeB.localState.enforcers?.["hunter_jack"].status).toBe("defeated");
  });
});

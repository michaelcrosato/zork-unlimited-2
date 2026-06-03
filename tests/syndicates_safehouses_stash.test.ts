import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { PureRand } from "../src/core/rng.js";

describe("Syndicate Safehouses & Stash Networks (AF-48)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_safehouse_test_pack",
      title: "Safehouse and Stash Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
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
        description: "A dark back alley.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
        ],
      },
      {
        id: "safehouse_room",
        name: "Safehouse Room",
        description: "A secure safehouse room.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [
      {
        id: "expensive_gem",
        name: "Expensive Gem",
        description: "A highly valuable gem.",
        cost: 100,
        takeable: true,
      },
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "A simple shield.",
        cost: 10,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "enforcer_jack",
        name: "Enforcer Jack",
        description: "A heavy enforcer.",
        hp: 30,
        max_hp: 30,
        attack: 10,
        defense: 5,
        gold: 20,
        xp: 15,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Move along, citizen.",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should buy and upgrade a safehouse successfully", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // 1. Unsuccessful: Room ID required
    const noRoom = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_SAFEHOUSE",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(noRoom.ok).toBe(false);

    // 2. Unsuccessful: Actor not member of syndicate
    const notMember = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "BUY_SAFEHOUSE",
          roomId: "alley",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(notMember.ok).toBe(false);

    // 3. Unsuccessful: Insufficient gold
    const poorCartel = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_SAFEHOUSE",
          roomId: "alley",
          syndicateId: "shadow_cartel",
          cost: 1000,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(poorCartel.ok).toBe(false);

    // 4. Successful Purchase
    const buyRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_SAFEHOUSE",
          roomId: "alley",
          syndicateId: "shadow_cartel",
          cost: 200,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(buyRes.ok).toBe(true);
    expect(buyRes.state.vars["gold"]).toBe(300);
    expect(buyRes.state.safehouses?.["alley"]).toBeDefined();
    expect(buyRes.state.safehouses?.["alley"].level).toBe(1);
    expect(buyRes.state.safehouses?.["alley"].stashCapacity).toBe(5);

    // 5. Unsuccessful: safehouse already exists in room
    const dupSafehouse = multiAgentStep(
      buyRes.state,
      {
        agentId: "player",
        action: {
          type: "BUY_SAFEHOUSE",
          roomId: "alley",
          syndicateId: "shadow_cartel",
          cost: 50,
          timestamp: 1006,
        } as any,
      },
      mockPack
    );
    expect(dupSafehouse.ok).toBe(false);

    // 6. Unsuccessful Upgrade: Insufficient gold
    const poorUpgrade = multiAgentStep(
      buyRes.state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_SAFEHOUSE",
          roomId: "alley",
          cost: 400,
          timestamp: 1007,
        } as any,
      },
      mockPack
    );
    expect(poorUpgrade.ok).toBe(false);

    // 7. Successful Upgrade
    const upgradeRes = multiAgentStep(
      buyRes.state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_SAFEHOUSE",
          roomId: "alley",
          cost: 100,
          timestamp: 1007,
        } as any,
      },
      mockPack
    );
    expect(upgradeRes.ok).toBe(true);
    expect(upgradeRes.state.vars["gold"]).toBe(200);
    expect(upgradeRes.state.safehouses?.["alley"].level).toBe(2);
    expect(upgradeRes.state.safehouses?.["alley"].stashCapacity).toBe(10);
  });

  it("should deposit and withdraw items to safehouse stash", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Buy safehouse in market
    const buyRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_SAFEHOUSE",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(buyRes.ok).toBe(true);

    let stateWithSafehouse = buyRes.state;
    // Set player inventory
    stateWithSafehouse.inventory = ["expensive_gem", "wooden_shield"];

    // 1. Unsuccessful Deposit: Item not in inventory
    const badDeposit = multiAgentStep(
      stateWithSafehouse,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_STASH",
          roomId: "market",
          itemId: "invalid_item",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(badDeposit.ok).toBe(false);

    // 2. Successful Deposit
    const depRes = multiAgentStep(
      stateWithSafehouse,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_STASH",
          roomId: "market",
          itemId: "expensive_gem",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(depRes.ok).toBe(true);
    expect(depRes.state.inventory).not.toContain("expensive_gem");
    expect(depRes.state.inventory).toContain("wooden_shield");
    expect(depRes.state.safehouses?.["market"].stashItems).toContain("expensive_gem");

    // 3. Unsuccessful Withdraw: Item not in stash
    const badWithdraw = multiAgentStep(
      depRes.state,
      {
        agentId: "player",
        action: {
          type: "WITHDRAW_STASH",
          roomId: "market",
          itemId: "wooden_shield",
          timestamp: 1012,
        } as any,
      },
      mockPack
    );
    expect(badWithdraw.ok).toBe(false);

    // 4. Successful Withdraw
    const witRes = multiAgentStep(
      depRes.state,
      {
        agentId: "player",
        action: {
          type: "WITHDRAW_STASH",
          roomId: "market",
          itemId: "expensive_gem",
          timestamp: 1012,
        } as any,
      },
      mockPack
    );
    expect(witRes.ok).toBe(true);
    expect(witRes.state.inventory).toContain("expensive_gem");
    expect(witRes.state.inventory).toContain("wooden_shield");
    expect(witRes.state.safehouses?.["market"].stashItems).not.toContain("expensive_gem");
  });

  it("should handle enforcer raid defeat fallback for players", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 100, hp: 5, max_hp: 20 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Buy safehouse in safehouse_room
    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Place player in combat with Enforcer Jack
    state.flags["in_combat_with_enforcer_jack"] = true;
    state.vars["npc_hp_enforcer_jack"] = 25;

    // Trigger step where player attacks and enforcer strikes back, bringing player HP down to <= 0
    // Enforcer has 10 attack and mock fight logic will deal damage to player
    // Let's manually trigger a step fight or set player HP directly and run combat resolution step
    // To test the exact defeat fallback branch, let's execute FIGHT parser command
    const res = step(state, { type: "FIGHT", npc: "enforcer_jack" }, mockPack, "player");

    // The enforcer Jack attacks and should easily reduce player's 5 HP to <= 0
    expect(res.ok).toBe(true);
    // Since player has safehouse, they should have escaped and fell back to safehouse_room
    expect(res.state.current).toBe("safehouse_room");
    expect(res.state.vars["hp"]).toBe(20); // HP fully restored!
    expect(res.state.flags["in_combat_with_enforcer_jack"]).toBe(false); // combat cleared!
    expect(res.state.ended).toBe(false); // No game over!
  });

  it("should handle enforcer raid defeat fallback for agent NPCs", () => {
    let state = createInitialState({
      seed: 12345,
      start: "alley",
      varsInit: { gold: 100 },
      agentsInit: ["alice"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["alice"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Register active enforcer pursuing alice
    state.enforcers = {
      hunter_jack: {
        id: "hunter_jack",
        name: "Bounty Hunter Jack",
        currentRoom: "alley",
        targetId: "alice",
        status: "pursuing",
        isBountyHunter: true,
        timestamp: 1000,
        hp: 30,
        max_hp: 30,
        attack: 10,
        defense: 5,
      },
    };

    // Make sure alice is in alley
    if (state.agents) {
      state.agents["alice"].current = "alley";
    }

    // Override PureRand.nextInt to return 10 (which is <= 50)
    const originalNextInt = PureRand.nextInt;
    PureRand.nextInt = (s, min, max) => {
      return { value: 10, nextSeed: s + 1 };
    };

    try {
      // Run engine tick / step that triggers bounty hunter attack and agent defeat
      const res = step(state, { type: "LOOK" }, mockPack, "player");
      expect(res.ok).toBe(true);

      // Let's check if alice fell back to safehouse_room
      expect(res.state.agents?.["alice"].current).toBe("safehouse_room");
    } finally {
      // Restore original nextInt
      PureRand.nextInt = originalNextInt;
    }
  });
});

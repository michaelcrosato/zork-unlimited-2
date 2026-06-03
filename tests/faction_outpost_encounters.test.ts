import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { evaluateCondition } from "../src/core/conditions.js";

describe("Task-F5: Faction Outpost Tax Generation & Hostile Guard Encounters", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "outpost_test_pack",
      title: "Outpost Test Pack",
      start_room: "clearing",
      vars_init: { gold: 100, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Protectors of the green woods.",
        initial_rep: 10,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Sunlit Clearing",
        description: "A lovely open space. An exit leads north.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "outpost_room",
          },
        ],
      },
      {
        id: "outpost_room",
        name: "Ranger Outpost Room",
        description: "A key outpost building in the forest.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "south",
            to: "clearing",
          },
        ],
      },
    ],
    objects: [],
    npcs: [],
    win_conditions: [],
    endings: [],
  });

  it("should generate extra passive taxes from active faction outposts", () => {
    // 1. Setup state with territoryControl and turfGuardOutposts
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { rangers: 20 }, // 20 rep gives Math.max(1, 20/10) = 2 base tax per tick
      territoryControlInit: { outpost_room: "rangers" },
    });

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 2,
        timestamp: 100,
        disabled: false,
      },
    };

    // Ticks every 5 steps
    state.step = 5;

    // Run tickEconomy
    state = tickEconomy(state, mockPack);

    // Expected tax: base (2) * multiplier (undefined/1) + outpost tax (15 * securityLevel (2) = 30) = 32 tax.
    // Gold goes from 10 to 42.
    expect(state.vars["gold"]).toBe(42);
    expect(state.vars["totalTaxesCollected"]).toBe(32);
    expect(state.journal.some((line) => line.includes("Collected 32 gold in taxes"))).toBe(true);

    // 2. Setup with disabled outpost
    state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { rangers: 20 },
      territoryControlInit: { outpost_room: "rangers" },
    });

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 2,
        timestamp: 100,
        disabled: true, // DISABLED!
      },
    };

    state.step = 5;
    state = tickEconomy(state, mockPack);

    // Outpost is disabled, so only base tax (2) is collected. Gold goes from 10 to 12.
    expect(state.vars["gold"]).toBe(12);
  });

  it("should trigger guard encounters when player enters room with hostile outpost", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100, hp: 20, max_hp: 20 },
      factionRepInit: { rangers: -20 }, // Hostile reputation!
    });

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 2,
        timestamp: 100,
        disabled: false,
      },
    };

    // Step north into the outpost room
    const result = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(result.ok).toBe(true);

    const nextState = result.state;
    const guardId = "outpost_guard_outpost_room";

    // Enforcer/guard should be spawned and player is in combat!
    expect(nextState.enforcers?.[guardId]).toBeDefined();
    expect(nextState.enforcers?.[guardId].hp).toBe(40); // 20 + 2 * 10 = 40
    expect(nextState.flags[`in_combat_with_${guardId}`]).toBe(true);
    expect(nextState.vars[`npc_hp_${guardId}`]).toBe(40);

    expect(nextState.journal.some((line) => line.includes("triggered guard encounter"))).toBe(true);
    expect(result.events.some((e) => e.type === "narration" && e.text.includes("Guard Encounter"))).toBe(true);
  });

  it("should disable the outpost once the corresponding outpost guard is defeated", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100, hp: 20, max_hp: 20 },
      factionRepInit: { rangers: -20 },
    });

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 1,
        timestamp: 100,
        disabled: false,
      },
    };

    // 1. Move to trigger combat
    let res = step(state, { type: "MOVE", direction: "north" }, mockPack);
    state = res.state;
    const guardId = "outpost_guard_outpost_room";
    expect(state.flags[`in_combat_with_${guardId}`]).toBe(true);
    expect(state.turfGuardOutposts?.["outpost_room"]?.disabled).toBeFalsy();

    // Set guard HP to low so we can defeat them in one hit
    state.vars[`npc_hp_${guardId}`] = 1;

    // 2. Perform attack/FIGHT to defeat the guard
    res = step(state, { type: "FIGHT" }, mockPack);
    state = res.state;

    // Verify combat has ended and the guard is defeated
    expect(state.flags[`in_combat_with_${guardId}`]).toBe(false);
    expect(state.flags[`npc_defeated_${guardId}`]).toBe(true);

    // Outpost should now be disabled!
    expect(state.turfGuardOutposts?.["outpost_room"]?.disabled).toBe(true);
    expect(
      state.journal.some((line) =>
        line.includes("Outpost guard defeated! Outpost in room outpost_room has been disabled.")
      )
    ).toBe(true);
  });

  it("should evaluate outpost_cleared condition correctly", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 2,
        timestamp: 100,
        disabled: false,
      },
    };

    // Case 1: Outpost is not cleared (disabled: false)
    expect(evaluateCondition(state, { outpost_cleared: "outpost_room" })).toBe(false);

    // Case 2: Outpost is cleared (disabled: true)
    state.turfGuardOutposts["outpost_room"].disabled = true;
    expect(evaluateCondition(state, { outpost_cleared: "outpost_room" })).toBe(true);

    // Case 3: Outpost does not exist
    expect(evaluateCondition(state, { outpost_cleared: "nonexistent_room" })).toBe(false);
  });
});

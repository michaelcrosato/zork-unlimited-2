import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Combat Narrative Variety & Status Transitions (Task-F30)", () => {
  const pack: ParserPack = {
    meta: {
      id: "combat-narrative-test-pack",
      title: "Combat Narrative Test Pack",
      start_room: "room_arena",
      vars_init: {
        hp: 20,
        max_hp: 20,
        mana: 10,
        max_mana: 10,
        dexterity: 12,
        strength: 12,
        intelligence: 12,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "room_arena",
        name: "Gladiator Arena",
        description: "A dusty battle arena.",
        objects: ["steel_broadsword"],
        npcs: ["dummy_enemy"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "steel_broadsword",
        name: "Steel Broadsword",
        description: "A heavy steel blade.",
        interactions: [],
      },
    ],
    npcs: [
      {
        id: "dummy_enemy",
        name: "Combat Dummy",
        hp: 30,
        max_hp: 30,
        attack: 4,
        defense: 5,
        gold: 10,
        xp: 20,
        dialogue: {
          root: "root",
          nodes: [
            {
              id: "root",
              npc_text: "Prepare to fight!",
              topics: [],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  };

  it("should output recovery transition messages when stun wears off", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Set player stunned to 1 (which will tick down to 0 this turn)
    state.vars["player_stunned"] = 1;

    const res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[0].text).toContain("cannot act this turn");
    expect(res.events[0].text).toMatch(/paralysis lifts|movement is restored|stun effect wears off|focus returns/i);
    expect(res.state.vars["player_stunned"]).toBe(0);
  });

  it("should output recovery transition messages when poison and burning tick down to 0", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    state.vars["player_poisoned"] = 1;
    state.vars["player_burning"] = 1;
    state.vars[`npc_poisoned_dummy_enemy`] = 1;
    state.vars[`npc_burning_dummy_enemy`] = 1;

    const res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(res.ok).toBe(true);

    // Verify player recovery messages
    expect(res.events[0].text).toMatch(
      /poison in your veins finally runs its course|poison has worn off|leaves your system|burning in your blood subsides/i
    );
    expect(res.events[0].text).toMatch(
      /flames engulfing you flicker out|dies down to a slow smolder|pat out the last|no longer ablaze/i
    );

    // Verify NPC recovery messages
    expect(res.events[0].text).toMatch(/green tint fades|gasps as the venom|fever breaks|sickly green color drains/i);
    expect(res.events[0].text).toMatch(
      /fire on the Combat Dummy dies down|flames engulfing the Combat Dummy|extinguishing the flames|scorched and smoldering/i
    );

    expect(res.state.vars["player_poisoned"]).toBe(0);
    expect(res.state.vars["player_burning"]).toBe(0);
    expect(res.state.vars[`npc_poisoned_dummy_enemy`]).toBe(0);
    expect(res.state.vars[`npc_burning_dummy_enemy`]).toBe(0);
  });

  it("should pick from expanded weapon templates when attacking with a sword", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Put a sword in the inventory to trigger sword template matching
    state.inventory.push("steel_broadsword");

    const res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(res.ok).toBe(true);

    // Verify that the combat log contains sword-related verbs
    const log = res.events[0].text;
    expect(log).toMatch(/slash|blade|strike|arc|thrust|riposte|ring|cleave/i);
  });

  it("should support expanded templates for spellcasting fireball, freeze, lightning and poison", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Ensure we have enough mana
    state.vars["mana"] = 20;

    // Test fireball casting
    const resFB = step(state, { type: "CAST", spell: "fireball", target: "dummy_enemy" }, pack);
    expect(resFB.ok).toBe(true);
    expect(resFB.events[0].text).toMatch(/fireball|flames|orb|heat|combustion|bonfire|fire/i);

    // Test freeze casting
    const resFR = step(state, { type: "CAST", spell: "freeze", target: "dummy_enemy" }, pack);
    expect(resFR.ok).toBe(true);
    expect(resFR.events[0].text).toMatch(/freeze|frost|blizzard|shards|sub-zero/i);
  });

  it("should output weapon-specific status details in combat log", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Mark enemy as stunned/frozen
    state.vars["npc_stunned_dummy_enemy"] = 1;
    // Unarmed (blunt) should smash/shatter ice
    const resBlunt = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(resBlunt.ok).toBe(true);
    expect(resBlunt.events[0].text).toMatch(
      /shattering the outer ice crust|smashing the frost encasing them|delivering a bone-shattering strike|punching the ice encasing them|shattering the frost layer on their shoulder/i
    );

    // Sharp weapon (steel broadsword) should chip/slice ice
    let stateSharp = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });
    stateSharp.inventory.push("steel_broadsword");
    stateSharp.vars["npc_stunned_dummy_enemy"] = 1;
    const resSharp = step(stateSharp, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(resSharp.ok).toBe(true);
    expect(resSharp.events[0].text).toMatch(
      /chipping away at the frozen shell|slicing through the icy crust|taking advantage of their paralyzed|shaving off frost shards/i
    );
  });
});

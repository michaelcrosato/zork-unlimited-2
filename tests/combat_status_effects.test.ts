import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Combat Status Effects & Weather Interactions", () => {
  const pack: ParserPack = {
    meta: {
      id: "combat-status-test-pack",
      title: "Combat Status Test Pack",
      start_room: "room_arena",
      vars_init: {
        hp: 20,
        max_hp: 20,
        mana: 10,
        max_mana: 10,
        dexterity: 10,
        strength: 10,
        intelligence: 10,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "room_arena",
        name: "Gladiator Arena",
        description: "A dusty battle arena.",
        objects: ["health_potion", "poison_potion"],
        npcs: ["dummy_enemy"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "health_potion",
        name: "health potion",
        aliases: ["potion", "health potion"],
        description: "Restores 10 HP when used.",
        takeable: true,
        interactions: [
          {
            verb: "USE",
            effects: [{ heal_player: { by: 10, msg: "You drink the potion and feel restored!" } }],
          },
        ],
      },
      {
        id: "poison_potion",
        name: "poison potion",
        aliases: ["poison potion"],
        description: "Poisons the player when drunk.",
        takeable: true,
        interactions: [
          {
            verb: "USE",
            effects: [
              {
                set_var: {
                  name: "player_poisoned",
                  value: 3,
                },
              },
              { narrate: "You drink poison!" },
            ],
          },
        ],
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
      {
        id: "fire_elemental",
        name: "Fire Elemental",
        hp: 30,
        max_hp: 30,
        attack: 4,
        defense: 5,
        gold: 10,
        xp: 20,
        resistances: ["fire"],
        weaknesses: ["cold"],
        dialogue: {
          root: "root",
          nodes: [{ id: "root", npc_text: "Burn!", topics: [] }],
        },
      },
      {
        id: "armored_golem",
        name: "Armored Golem",
        hp: 50,
        max_hp: 50,
        attack: 5,
        defense: 12,
        gold: 20,
        xp: 30,
        resistances: ["physical", "poison"],
        weaknesses: ["lightning"],
        dialogue: {
          root: "root",
          nodes: [{ id: "root", npc_text: "Clank!", topics: [] }],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  };

  it("should handle player and enemy turn stuns in combat", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Manually set player stunned for 1 turn
    state.vars["player_stunned"] = 1;

    // Player inputs FIGHT command.
    // Because player is stunned, the player's fight attempt is skipped.
    // The combat dummy, however, is not stunned and will attack.
    const res1 = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(res1.ok).toBe(true);
    state = res1.state;

    // Player stun should now be 0
    expect(state.vars["player_stunned"]).toBe(0);
    // The dummy should have attacked and done damage, or missed (but player skipped action)
    expect(res1.events[0].text).toContain("stunned and cannot act");

    // Manually set enemy stunned for 1 turn
    state.vars["npc_stunned_dummy_enemy"] = 1;
    const res2 = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    expect(res2.ok).toBe(true);
    state = res2.state;

    // Enemy stun should now be 0
    expect(state.vars["npc_stunned_dummy_enemy"]).toBe(0);
    expect(res2.events[0].text).toContain("stunned and cannot act");
  });

  it("should tick poison damage at the end of each combat turn", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    state.vars["player_poisoned"] = 2;
    state.vars["npc_poisoned_dummy_enemy"] = 2;

    const res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    state = res.state;

    // Poison duration should decrement by 1
    expect(state.vars["player_poisoned"]).toBe(1);
    expect(state.vars["npc_poisoned_dummy_enemy"]).toBe(1);

    // Logs should mention poison damage
    expect(res.events[0].text).toMatch(/Poison deals 2 damage to you|poison in your veins/);
    expect(res.events[0].text).toMatch(
      /Poison deals 2 damage to the Combat Dummy|poison continues to weaken the Combat Dummy/
    );
  });

  it("should tick burning damage and extinguish burning in rainy weather", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    state.vars["player_burning"] = 2;
    state.vars["npc_burning_dummy_enemy"] = 2;

    // Test normal burning tick first (environment is clear/mild)
    expect(state.environment?.weather).toBe("clear");
    let res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    state = res.state;

    expect(state.vars["player_burning"]).toBe(1);
    expect(state.vars["npc_burning_dummy_enemy"]).toBe(1);
    expect(res.events[0].text).toMatch(/Burning deals 3 damage to you|char your flesh, dealing 3 damage/);
    expect(res.events[0].text).toMatch(
      /Burning deals 3 damage to the Combat Dummy|consume the Combat Dummy, dealing 3 damage|flames flare up/
    );

    // Set weather to rain
    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: state.step,
    };

    // Ticking under rain should extinguish burning
    res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    state = res.state;

    expect(state.vars["player_burning"]).toBe(0);
    expect(state.vars["npc_burning_dummy_enemy"]).toBe(0);
    expect(res.events[0].text).toMatch(/extinguishes|douses|snuffs out/);
  });

  it("should support item usage during combat", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Give health potion to player and lower health to 5
    state.inventory.push("health_potion");
    state.vars["hp"] = 5;

    // Use health potion in combat
    const res = step(state, { type: "USE", item: "health_potion", target: "health_potion" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Player health should be restored by potion (5 + 10 = 15, then dummy enemy attacks player)
    expect(res.events[0].text).toContain("You drink the potion and feel restored!");
    expect(state.vars["hp"]).toBeLessThanOrEqual(15);
  });

  it("should initialize status effects via weather conditions during combat", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    // Set weather to acid rain (poisons players deterministically)
    state.environment = {
      weather: "acid_rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    let res = step(state, { type: "FIGHT", npc: "dummy_enemy" }, pack);
    state = res.state;

    expect(state.vars["player_poisoned"]).toBeDefined();
    expect(state.vars["npc_poisoned_dummy_enemy"]).toBeDefined();
    expect(res.events[0].text).toMatch(/acidic rain poisons you|poison your system/);
  });

  it("should handle physical resistances and weaknesses in combat", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_armored_golem"],
    });

    // Armored Golem has physical resistance.
    // The combat log should note the hit was resisted.
    const res = step(state, { type: "FIGHT", npc: "armored_golem" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[0].text).toContain("Resisted!");
  });

  it("should support freeze spell, handle cold weakness, and apply freeze stun status", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_fire_elemental"],
    });

    // Fire Elemental is weak to cold.
    const res = step(state, { type: "CAST", spell: "freeze", target: "fire_elemental" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[0].text).toMatch(/Freeze!|freezing the Fire Elemental/);
    expect(res.events[0].text).toContain("Vulnerable!");
    expect(res.state.vars["npc_stunned_fire_elemental"]).toBe(0);
    expect(res.events[0].text).toMatch(/stunning them|unable to move|immobilized|paralyzing them/);
  });

  it("should support lightning spell and stun/intensify in rain weather", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_dummy_enemy"],
    });

    state.environment = {
      weather: "rain",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    const res = step(state, { type: "CAST", spell: "lightning", target: "dummy_enemy" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[0].text).toMatch(
      /conducts electricity|channels the electric|conducts the electrical|conduct the static/i
    );
    expect(res.events[0].text).toMatch(/stuns the Combat Dummy|stunning them|shocks the Combat Dummy/);
    expect(res.state.vars["npc_stunned_dummy_enemy"]).toBe(0);
  });

  it("should support poison spell, apply poison status, and check poison resistance", () => {
    let state = createInitialState({
      seed: 42,
      start: "room_arena",
      varsInit: { ...pack.meta.vars_init },
      flagsInit: ["in_combat_with_armored_golem"],
    });

    // Armored Golem resists poison.
    const res = step(state, { type: "CAST", spell: "poison", target: "armored_golem" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[0].text).toContain("Resisted!");
    // Golem should not be poisoned since it resists poison.
    expect(res.state.vars["npc_poisoned_armored_golem"]).toBeUndefined();
  });
});

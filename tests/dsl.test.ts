import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition, evaluateConditions, Condition } from "../src/core/conditions.js";
import { applyEffect, applyEffects, Effect } from "../src/core/effects.js";

describe("DSL Condition Evaluator", () => {
  const state = createInitialState({ seed: 100, start: "intro" });
  state.flags["has_key"] = true;
  state.vars["gold"] = 10;
  state.inventory.push("lantern");
  state.visited["chapel"] = true;

  it("should evaluate flag conditions", () => {
    expect(evaluateCondition(state, { has_flag: "has_key" })).toBe(true);
    expect(evaluateCondition(state, { has_flag: "missing_flag" })).toBe(false);
    expect(evaluateCondition(state, { not_flag: "missing_flag" })).toBe(true);
    expect(evaluateCondition(state, { not_flag: "has_key" })).toBe(false);
  });

  it("should evaluate item conditions", () => {
    expect(evaluateCondition(state, { has_item: "lantern" })).toBe(true);
    expect(evaluateCondition(state, { has_item: "sword" })).toBe(false);
    expect(evaluateCondition(state, { not_item: "sword" })).toBe(true);
    expect(evaluateCondition(state, { not_item: "lantern" })).toBe(false);
  });

  it("should evaluate visited conditions", () => {
    expect(evaluateCondition(state, { visited: "chapel" })).toBe(true);
    expect(evaluateCondition(state, { visited: "well" })).toBe(false);
    expect(evaluateCondition(state, { not_visited: "well" })).toBe(true);
    expect(evaluateCondition(state, { not_visited: "chapel" })).toBe(false);
  });

  it("should evaluate numeric var conditions", () => {
    expect(evaluateCondition(state, { var_eq: { name: "gold", value: 10 } })).toBe(true);
    expect(evaluateCondition(state, { var_gte: { name: "gold", value: 5 } })).toBe(true);
    expect(evaluateCondition(state, { var_lte: { name: "gold", value: 15 } })).toBe(true);
    expect(evaluateCondition(state, { var_eq: { name: "missing_var", value: 0 } })).toBe(true);
  });

  it("should evaluate logical composition conditions", () => {
    const c1: Condition = { has_flag: "has_key" };
    const c2: Condition = { has_item: "lantern" };
    const c3: Condition = { has_item: "sword" };

    expect(evaluateCondition(state, { all_of: [c1, c2] })).toBe(true);
    expect(evaluateCondition(state, { all_of: [c1, c3] })).toBe(false);
    expect(evaluateCondition(state, { any_of: [c1, c3] })).toBe(true);
    expect(evaluateCondition(state, { none_of: [c3] })).toBe(true);
    expect(evaluateCondition(state, { none_of: [c1] })).toBe(false);
  });

  it("should evaluate deeply nested composition conditions", () => {
    const cond: Condition = {
      all_of: [
        { has_flag: "has_key" },
        {
          any_of: [
            { has_item: "sword" },
            {
              none_of: [{ visited: "well" }, { var_gte: { name: "gold", value: 20 } }],
            },
          ],
        },
      ],
    };
    expect(evaluateCondition(state, cond)).toBe(true);

    const cond2: Condition = {
      all_of: [
        { has_flag: "has_key" },
        {
          any_of: [
            { has_item: "sword" },
            {
              none_of: [{ visited: "chapel" }],
            },
          ],
        },
      ],
    };
    expect(evaluateCondition(state, cond2)).toBe(false);
  });

  it("should evaluate vacuum / empty composition conditions logically", () => {
    // all_of on empty array vacuously evaluates to true
    expect(evaluateCondition(state, { all_of: [] })).toBe(true);
    // any_of on empty array evaluates to false
    expect(evaluateCondition(state, { any_of: [] })).toBe(false);
    // none_of on empty array vacuously evaluates to true
    expect(evaluateCondition(state, { none_of: [] })).toBe(true);
  });

  it("should throw an error for unknown/invalid condition types", () => {
    // Use an invalid condition cast to any to test runtime error
    const invalidCond = { unknown_op: "something" } as any;
    expect(() => evaluateCondition(state, invalidCond)).toThrow("Unknown condition type");
  });

  it("should handle edge cases of evaluateConditions helper", () => {
    expect(evaluateConditions(state, undefined)).toBe(true);
    expect(evaluateConditions(state, [])).toBe(true);

    const c1: Condition = { has_flag: "has_key" };
    const c2: Condition = { var_eq: { name: "gold", value: 10 } };
    const c3: Condition = { has_item: "sword" };

    expect(evaluateConditions(state, [c1, c2])).toBe(true);
    expect(evaluateConditions(state, [c1, c2, c3])).toBe(false);
  });
});

describe("DSL Effect Reducer", () => {
  it("should set and clear flags purely", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { set_flag: "flag_a" });
    expect(r1.state.flags["flag_a"]).toBe(true);
    expect(state.flags["flag_a"]).toBeUndefined(); // Pure check

    const r2 = applyEffect(r1.state, { clear_flag: "flag_a" });
    expect(r2.state.flags["flag_a"]).toBe(false);
  });

  it("should mutate items and variables purely", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { add_item: "sword" });
    expect(r1.state.inventory).toContain("sword");
    expect(state.inventory).not.toContain("sword");

    const r2 = applyEffect(r1.state, { remove_item: "sword" });
    expect(r2.state.inventory).not.toContain("sword");

    const r3 = applyEffect(state, { set_var: { name: "hp", value: 50 } });
    expect(r3.state.vars["hp"]).toBe(50);

    const r4 = applyEffect(r3.state, { inc_var: { name: "hp", by: 10 } });
    expect(r4.state.vars["hp"]).toBe(60);

    const r5 = applyEffect(r4.state, { dec_var: { name: "hp", by: 20 } });
    expect(r5.state.vars["hp"]).toBe(40);
  });

  it("should handle adding duplicate items and modifying object state", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { add_item: "key" });
    expect(r1.state.inventory).toEqual(["key"]);
    expect(r1.state.objectState["key"]).toEqual({ takenBy: "player" });

    // Add duplicate
    const r2 = applyEffect(r1.state, { add_item: "key" });
    expect(r2.state.inventory).toEqual(["key"]); // Check no duplicates
    expect(r2.state.objectState["key"]).toEqual({ takenBy: "player" });
  });

  it("should handle removing items not in inventory and modifying object state", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { remove_item: "missing_item" });
    expect(r1.state.inventory).toEqual([]);
    expect(r1.state.objectState["missing_item"]).toEqual({ takenBy: "destroyed" });
  });

  it("should initialize and mutate variables that don't exist in state", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { inc_var: { name: "mana", by: 5 } });
    expect(r1.state.vars["mana"]).toBe(5);

    const r2 = applyEffect(state, { dec_var: { name: "rage", by: 3 } });
    expect(r2.state.vars["rage"]).toBe(-3);
  });

  it("should unlock exits by modifying flags correctly", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { unlock_exit: { from: "hall", to: "vault" } });
    expect(r1.state.flags["exit_unlocked_hall_to_vault"]).toBe(true);
  });

  it("should manipulate object lock and open states purely", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { open_object: "chest" });
    expect(r1.state.objectState["chest"]?.open).toBe(true);

    const r2 = applyEffect(r1.state, { set_object_locked: { id: "chest", locked: true } });
    expect(r2.state.objectState["chest"]?.open).toBe(true);
    expect(r2.state.objectState["chest"]?.locked).toBe(true);

    const r3 = applyEffect(r2.state, { set_object_locked: { id: "chest", locked: false } });
    expect(r3.state.objectState["chest"]?.locked).toBe(false);
  });

  it("should handle end_game and narrate effects correctly", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { narrate: "A strange wind blows." });
    expect(r1.state.ended).toBe(false);
    expect(r1.event.type).toBe("narration");

    const r2 = applyEffect(state, { end_game: "ending_victory" });
    expect(r2.state.ended).toBe(true);
    expect(r2.state.endingId).toBe("ending_victory");
  });

  it("should handle start_combat by adjusting flags", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const r1 = applyEffect(state, { start_combat: { npc_id: "goblin" } });
    expect(r1.state.flags["in_combat_with_goblin"]).toBe(true);
    expect(r1.state.flags["in_dialogue_with_goblin"]).toBe(false);
  });

  it("should roll skill checks deterministically and update flags", () => {
    const state = createInitialState({ seed: 42, start: "intro" });
    state.vars["strength"] = 3;

    // First check
    const r1 = applyEffect(state, {
      roll_skill_check: {
        skill: "strength",
        difficulty: 15,
        success_flag: "broke_door",
      },
    });

    expect(r1.state.seed).not.toBe(state.seed); // Seed must change
    expect(typeof r1.state.flags["broke_door"]).toBe("boolean");
    expect(r1.state.journal[r1.state.journal.length - 1]).toContain("[Skill Check] Rolling STRENGTH");

    // Second check using new seed should yield different deterministic outcomes
    const r2 = applyEffect(r1.state, {
      roll_skill_check: {
        skill: "strength",
        difficulty: 1,
        success_flag: "trivial_check",
      },
    });
    expect(r2.state.flags["trivial_check"]).toBe(true); // difficulty 1 should always pass since roll is 1-20 and skill is 3
  });

  it("should handle damage_player HP deduction, boundaries, and death", () => {
    const state = createInitialState({ seed: 100, start: "intro" });
    state.vars["hp"] = 15;
    state.vars["max_hp"] = 20;

    // Normal damage
    const r1 = applyEffect(state, { damage_player: { by: 5 } });
    expect(r1.state.vars["hp"]).toBe(10);
    expect(r1.state.ended).toBe(false);

    // Missing hp default test
    const stateNoHp = createInitialState({ seed: 100, start: "intro" });
    const r1NoHp = applyEffect(stateNoHp, { damage_player: { by: 5 } });
    expect(r1NoHp.state.vars["hp"]).toBe(15); // 20 (default) - 5

    // Over-lethal damage floor and game over trigger
    const r2 = applyEffect(r1.state, { damage_player: { by: 20 } });
    expect(r2.state.vars["hp"]).toBe(0);
    expect(r2.state.ended).toBe(true);
    expect(r2.state.endingId).toBe("ending_died_in_combat");
  });

  it("should handle heal_player restoration and ceiling boundary", () => {
    const state = createInitialState({ seed: 100, start: "intro" });
    state.vars["hp"] = 10;
    state.vars["max_hp"] = 20;

    // Normal heal
    const r1 = applyEffect(state, { heal_player: { by: 5 } });
    expect(r1.state.vars["hp"]).toBe(15);

    // Ceiling heal
    const r2 = applyEffect(r1.state, { heal_player: { by: 10 } });
    expect(r2.state.vars["hp"]).toBe(20); // capped at max_hp

    // Missing hp / max_hp default test
    const stateNoHp = createInitialState({ seed: 100, start: "intro" });
    // defaults: hp = 20, max_hp = 20
    const rNoHp = applyEffect(stateNoHp, { heal_player: { by: 5 } });
    expect(rNoHp.state.vars["hp"]).toBe(20); // capped at 20
  });

  it("should throw error for unknown/invalid effect types", () => {
    const state = createInitialState({ seed: 100, start: "intro" });
    const invalidEff = { unknown_action: "boom" } as any;
    expect(() => applyEffect(state, invalidEff)).toThrow("Unknown effect type");
  });

  it("should sequentially apply multiple effects with accumulate results in applyEffects", () => {
    const state = createInitialState({ seed: 100, start: "intro" });

    const effects: Effect[] = [
      { set_flag: "flag_1" },
      { inc_var: { name: "score", by: 10 } },
      { inc_var: { name: "score", by: 5 } },
      { add_item: "shield" },
    ];

    const { state: finalState, events } = applyEffects(state, effects);
    expect(finalState.flags["flag_1"]).toBe(true);
    expect(finalState.vars["score"]).toBe(15);
    expect(finalState.inventory).toContain("shield");
    expect(events.length).toBe(4);
  });

  it("should return identical state and empty events if no effects passed to applyEffects", () => {
    const state = createInitialState({ seed: 100, start: "intro" });
    const res1 = applyEffects(state, undefined);
    expect(res1.state).toBe(state);
    expect(res1.events).toEqual([]);

    const res2 = applyEffects(state, []);
    expect(res2.state).toBe(state);
    expect(res2.events).toEqual([]);
  });
});

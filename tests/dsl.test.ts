import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition, Condition } from "../src/core/conditions.js";
import { applyEffect, Effect } from "../src/core/effects.js";

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
});

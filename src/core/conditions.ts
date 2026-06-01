import { z } from "zod";
import { GameState } from "./state.js";

// Lazy type definition for recursive Zod schema
export const ConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({ has_flag: z.string() }),
    z.object({ not_flag: z.string() }),
    z.object({ has_item: z.string() }),
    z.object({ not_item: z.string() }),
    z.object({ visited: z.string() }),
    z.object({ not_visited: z.string() }),
    z.object({
      var_gte: z.object({
        name: z.string(),
        value: z.number(),
      }),
    }),
    z.object({
      var_lte: z.object({
        name: z.string(),
        value: z.number(),
      }),
    }),
    z.object({
      var_eq: z.object({
        name: z.string(),
        value: z.number(),
      }),
    }),
    z.object({ weather_is: z.string() }),
    z.object({ temperature_is: z.string() }),
    z.object({
      faction_rep_gte: z.object({
        faction: z.string(),
        value: z.number(),
      }),
    }),
    z.object({
      faction_rep_lte: z.object({
        faction: z.string(),
        value: z.number(),
      }),
    }),
    z.object({ all_of: z.array(ConditionSchema) }),
    z.object({ any_of: z.array(ConditionSchema) }),
    z.object({ none_of: z.array(ConditionSchema) }),
  ])
);

export type Condition =
  | { has_flag: string }
  | { not_flag: string }
  | { has_item: string }
  | { not_item: string }
  | { visited: string }
  | { not_visited: string }
  | { var_gte: { name: string; value: number } }
  | { var_lte: { name: string; value: number } }
  | { var_eq: { name: string; value: number } }
  | { weather_is: string }
  | { temperature_is: string }
  | { faction_rep_gte: { faction: string; value: number } }
  | { faction_rep_lte: { faction: string; value: number } }
  | { all_of: Condition[] }
  | { any_of: Condition[] }
  | { none_of: Condition[] };

/**
 * Pure function to evaluate a condition against a given GameState.
 */
export function evaluateCondition(state: GameState, cond: Condition): boolean {
  if ("has_flag" in cond) {
    return !!state.flags[cond.has_flag];
  }
  if ("not_flag" in cond) {
    return !state.flags[cond.not_flag];
  }
  if ("has_item" in cond) {
    return state.inventory.includes(cond.has_item);
  }
  if ("not_item" in cond) {
    return !state.inventory.includes(cond.not_item);
  }
  if ("visited" in cond) {
    return !!state.visited[cond.visited];
  }
  if ("not_visited" in cond) {
    return !state.visited[cond.not_visited];
  }
  if ("var_gte" in cond) {
    const { name, value } = cond.var_gte;
    const currentVal = state.vars[name] ?? 0;
    return currentVal >= value;
  }
  if ("var_lte" in cond) {
    const { name, value } = cond.var_lte;
    const currentVal = state.vars[name] ?? 0;
    return currentVal <= value;
  }
  if ("var_eq" in cond) {
    const { name, value } = cond.var_eq;
    const currentVal = state.vars[name] ?? 0;
    return currentVal === value;
  }
  if ("weather_is" in cond) {
    const expected = cond.weather_is;
    const current = state.environment?.weather ?? "clear";
    return current === expected;
  }
  if ("temperature_is" in cond) {
    const expected = cond.temperature_is;
    const current = state.environment?.temperature ?? "mild";
    return current === expected;
  }
  if ("faction_rep_gte" in cond) {
    const { faction, value } = cond.faction_rep_gte;
    const currentRep = state.factionRep?.[faction] ?? 0;
    return currentRep >= value;
  }
  if ("faction_rep_lte" in cond) {
    const { faction, value } = cond.faction_rep_lte;
    const currentRep = state.factionRep?.[faction] ?? 0;
    return currentRep <= value;
  }
  if ("all_of" in cond) {
    return cond.all_of.every((c) => evaluateCondition(state, c));
  }
  if ("any_of" in cond) {
    return cond.any_of.some((c) => evaluateCondition(state, c));
  }
  if ("none_of" in cond) {
    return cond.none_of.every((c) => !evaluateCondition(state, c));
  }

  throw new Error(`Unknown condition type: ${JSON.stringify(cond)}`);
}

/**
 * Evaluates a list of conditions (logical AND). Returns true if all conditions are met or if list is empty.
 */
export function evaluateConditions(state: GameState, conditions?: Condition[]): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((c) => evaluateCondition(state, c));
}

import { GameState } from "../core/state.js";
import { CYOAPack } from "../cyoa/schema.js";
import { CYOAObservation } from "./types.js";
import { evaluateConditions } from "../core/conditions.js";

/**
 * Compiles a structured, schema-valid Observation for the AI playtester based
 * on the current GameState and CYOAPack.
 *
 * Filters available choices dynamically based on their conditions.
 */
export function buildObservation(state: GameState, pack: CYOAPack): CYOAObservation {
  const currentScene = pack.scenes.find((s) => s.id === state.current);
  if (!currentScene) {
    throw new Error(`Current scene '${state.current}' not found in content pack.`);
  }

  // Filter choices: a choice is available if and only if its conditions evaluate to true
  const availableChoices = currentScene.choices.filter((choice) =>
    evaluateConditions(state, choice.conditions)
  );

  return {
    mode: "cyoa",
    scene_id: state.current,
    text: currentScene.text,
    state: {
      flags: Object.keys(state.flags).filter((f) => state.flags[f]),
      vars: { ...state.vars },
      inventory: [...state.inventory],
      journal: [...state.journal],
    },
    available_actions: availableChoices.map((c) => ({
      id: c.id,
      text: c.text,
    })),
  };
}

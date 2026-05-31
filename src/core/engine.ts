import { GameState } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { evaluateConditions } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { computeStateHashShort } from "./hash.js";
import { CYOAPack } from "../cyoa/schema.js";

/**
 * Pure engine step transition function.
 * Takes the current GameState, the Action, and the active CYOAPack context.
 * Returns the new state and the list of generated events.
 */
export function step(
  state: GameState,
  action: Action,
  pack: CYOAPack
): StepResult {
  // If the game has already ended, reject all actions
  if (state.ended) {
    return {
      state,
      events: [{ type: "rejected", reason: "Game has already ended." }],
      ok: false,
      rejectionReason: "Game has already ended.",
    };
  }

  // Clone state to ensure pure changes
  let newState: GameState = {
    ...state,
    flags: { ...state.flags },
    vars: { ...state.vars },
    inventory: [...state.inventory],
    objectState: { ...state.objectState },
    journal: [...state.journal],
    visited: { ...state.visited },
  };

  const events: GameEvent[] = [];

  // Handle CYOA action type
  if (action.type === "CHOOSE") {
    const choiceId = action.choiceId;

    // 1. Look up the current scene
    const currentScene = pack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      return {
        state,
        events: [{ type: "rejected", reason: `Current scene '${state.current}' not found in content pack.` }],
        ok: false,
        rejectionReason: `Current scene '${state.current}' not found.`,
      };
    }

    // 2. Verify we aren't in a terminal ending scene
    if (currentScene.is_ending) {
      return {
        state,
        events: [{ type: "rejected", reason: "Cannot make a choice in an ending scene." }],
        ok: false,
        rejectionReason: "Cannot make a choice in an ending scene.",
      };
    }

    // 3. Find the selected choice
    const choice = currentScene.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return {
        state,
        events: [{ type: "rejected", reason: `Choice '${choiceId}' is not valid in scene '${state.current}'.` }],
        ok: false,
        rejectionReason: `Choice '${choiceId}' is not valid in this scene.`,
      };
    }

    // 4. Evaluate conditions
    const conditionsPassed = evaluateConditions(newState, choice.conditions);
    if (!conditionsPassed) {
      return {
        state,
        events: [{ type: "rejected", reason: `Conditions for choice '${choiceId}' are not met.` }],
        ok: false,
        rejectionReason: "Conditions for this choice are not met.",
      };
    }

    // 5. Apply choice effects
    const effectResult = applyEffects(newState, choice.effects);
    newState = effectResult.state;
    events.push(...effectResult.events);

    // 6. Transition to next scene (if choice has one, otherwise it's a self-loop)
    const nextSceneId = choice.next || state.current;
    if (nextSceneId !== state.current) {
      newState.current = nextSceneId;
      newState.visited[nextSceneId] = true;
      events.push({
        type: "state_change",
        effect: "goto",
        value: nextSceneId,
      });

      // 7. Look up the new scene and apply on_enter effects
      const nextScene = pack.scenes.find((s) => s.id === nextSceneId);
      if (nextScene) {
        // Apply scene's on_enter effects
        const enterResult = applyEffects(newState, nextScene.on_enter);
        newState = enterResult.state;
        events.push(...enterResult.events);

        // Check if the new scene is an ending
        if (nextScene.is_ending) {
          newState.ended = true;
          newState.endingId = nextSceneId;

          // Find ending meta details if available
          const endingMeta = pack.endings?.find((e) => e.id === nextSceneId);
          events.push({
            type: "ending",
            endingId: nextSceneId,
            title: endingMeta?.title ?? nextScene.title,
            text: endingMeta?.text ?? nextScene.text,
          });
        }
      }
    }

    // 8. If an ending effect was triggered in choice/on_enter, verify newState.ended
    if (newState.ended && newState.endingId && !events.some((e) => e.type === "ending")) {
      const endingMeta = pack.endings?.find((e) => e.id === newState.endingId);
      events.push({
        type: "ending",
        endingId: newState.endingId!,
        title: endingMeta?.title ?? "Game Over",
        text: endingMeta?.text ?? "",
      });
    }

    // 9. Increment step counter
    newState.step += 1;

    return {
      state: newState,
      events,
      ok: true,
    };
  }

  // Fallback for unsupported parser actions in CYOA-only mode
  return {
    state,
    events: [{ type: "rejected", reason: `Action type '${action.type}' is not supported in CYOA mode.` }],
    ok: false,
    rejectionReason: `Action type '${action.type}' is not supported.`,
  };
}

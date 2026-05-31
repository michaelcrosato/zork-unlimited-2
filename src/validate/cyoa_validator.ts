import { CYOAPack, CYOAPackSchema } from "../cyoa/schema.js";
import { ValidationReport, ValidationFinding } from "./report.js";
import { Condition } from "../core/conditions.js";
import { Effect } from "../core/effects.js";
import { createInitialState, GameState } from "../core/state.js";
import { step } from "../core/engine.js";
import { Action } from "../api/types.js";
import { canonicalStringify } from "../core/hash.js";

/**
 * Explores the entire state space of a CYOA pack using BFS to identify
 * unsolvable games and soft-locks where no endings are reachable.
 */
export function checkCYOASoftlocks(pack: CYOAPack): ValidationFinding[] {
  const hasEndings = (pack.endings && pack.endings.length > 0) || pack.scenes.some(s => s.is_ending);
  if (!hasEndings) {
    return [];
  }

  const findings: ValidationFinding[] = [];
  const startRoom = pack.meta.start;

  const initialState = createInitialState({
    seed: 42,
    start: startRoom,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  // State-space search (BFS)
  const queue: GameState[] = [initialState];
  const visited = new Map<string, GameState>();
  const parentMap = new Map<string, string[]>();
  const transitionGraph = new Map<string, Set<string>>();

  const getStateKey = (state: GameState): string => {
    const clean = {
      current: state.current,
      flags: state.flags,
      vars: state.vars,
      inventory: state.inventory,
      objectState: state.objectState,
      questStage: state.questStage,
      ended: state.ended,
      endingId: state.endingId,
    };
    return canonicalStringify(clean);
  };

  const initialKey = getStateKey(initialState);
  visited.set(initialKey, initialState);
  transitionGraph.set(initialKey, new Set<string>());

  const maxStates = 2000;
  let statesExplored = 0;
  let limitReached = false;

  while (queue.length > 0) {
    const currState = queue.shift()!;
    const currKey = getStateKey(currState);
    statesExplored++;

    if (statesExplored > maxStates) {
      limitReached = true;
      break;
    }

    if (currState.ended) {
      continue;
    }

    const currentScene = pack.scenes.find((s) => s.id === currState.current);
    if (!currentScene) {
      continue;
    }

    for (const choice of currentScene.choices) {
      const action: Action = {
        type: "CHOOSE",
        choiceId: choice.id,
      };

      const result = step(currState, action, pack);
      if (result.ok) {
        const nextKey = getStateKey(result.state);
        
        if (!transitionGraph.has(currKey)) {
          transitionGraph.set(currKey, new Set());
        }
        transitionGraph.get(currKey)!.add(nextKey);

        if (!visited.has(nextKey)) {
          visited.set(nextKey, result.state);
          queue.push(result.state);
        }

        if (!parentMap.has(nextKey)) {
          parentMap.set(nextKey, []);
        }
        if (!parentMap.get(nextKey)!.includes(currKey)) {
          parentMap.get(nextKey)!.push(currKey);
        }
      }
    }
  }

  if (limitReached) {
    findings.push({
      severity: "info",
      code: "PATHFINDER_LIMIT_REACHED",
      message: `State-space pathfinder capped at ${maxStates} states explored to avoid timeout.`,
      where: ["pathfinder"],
    });
  }

  const endingKeys = new Set<string>();
  for (const [key, state] of visited.entries()) {
    if (state.ended) {
      endingKeys.add(key);
    }
  }

  const canReachEnding = new Set<string>(endingKeys);
  const backQueue = Array.from(endingKeys);

  while (backQueue.length > 0) {
    const currKey = backQueue.shift()!;
    const parents = parentMap.get(currKey) ?? [];
    for (const p of parents) {
      if (!canReachEnding.has(p)) {
        canReachEnding.add(p);
        backQueue.push(p);
      }
    }
  }

  let softLockCount = 0;
  for (const [key, state] of visited.entries()) {
    if (!state.ended && !canReachEnding.has(key)) {
      softLockCount++;
      if (softLockCount <= 5) {
        findings.push({
          severity: "warning",
          code: "SOFTLOCK_DETECTED",
          message: `Reachable state at scene '${state.current}' has no sequence of choices leading to any ending.`,
          where: [`scene:${state.current}`],
        });
      }
    }
  }

  if (softLockCount > 5) {
    findings.push({
      severity: "warning",
      code: "SOFTLOCK_DETECTED",
      message: `And ${softLockCount - 5} other reachable states are soft-locked.`,
      where: ["pathfinder"],
    });
  }

  const startKey = getStateKey(initialState);
  if (!canReachEnding.has(startKey)) {
    findings.push({
      severity: "error",
      code: "UNSOLVABLE_GAME",
      message: `The game is unsolvable: there is no sequence of choices from the starting scene '${startRoom}' that leads to any ending.`,
      where: [`scene:${startRoom}`],
    });
  }

  return findings;
}

/**
 * Validates a CYOAPack against all architectural and graph consistency checks.
 * Returns a detailed ValidationReport.
 */
export function validateCYOAPack(rawPack: unknown): ValidationReport {
  const findings: ValidationFinding[] = [];
  let packId = "unknown";

  // 1. Zod Schema Verification
  const parsed = CYOAPackSchema.safeParse(rawPack);
  if (!parsed.success) {
    const zodErrors = parsed.error.issues.map((issue) => ({
      severity: "error" as const,
      code: "SCHEMA_ERROR",
      message: `${issue.path.join(".")}: ${issue.message}`,
      where: ["schema"],
    }));
    return {
      pack_id: "unknown",
      ok: false,
      findings: zodErrors,
    };
  }

  const pack = parsed.data;
  packId = pack.meta.id;

  const sceneIds = new Set(pack.scenes.map((s) => s.id));
  const endingIds = new Set(pack.endings?.map((e) => e.id) ?? []);
  const allValidDestinations = new Set([...sceneIds, ...endingIds]);

  // 2. Metadata Start Scene Check
  if (!sceneIds.has(pack.meta.start)) {
    findings.push({
      severity: "error",
      code: "INVALID_START",
      message: `Metadata start scene '${pack.meta.start}' does not exist in scenes list.`,
      where: ["meta:start"],
    });
    return { pack_id: packId, ok: false, findings };
  }

  // Collect all flag/item producers across the entire game (choices and scenes)
  const setFlags = new Set<string>(pack.meta.flags_init ?? []);
  const addedItems = new Set<string>();

  const scanEffects = (effects: Effect[]) => {
    for (const eff of effects) {
      if ("set_flag" in eff) setFlags.add(eff.set_flag);
      if ("add_item" in eff) addedItems.add(eff.add_item);
    }
  };

  for (const scene of pack.scenes) {
    scanEffects(scene.on_enter);
    for (const choice of scene.choices) {
      scanEffects(choice.effects);
    }
  }

  // 3. BFS Traversal to verify reachability and reference integrity
  const queue: string[] = [pack.meta.start];
  const visitedScenes = new Set<string>([pack.meta.start]);
  const reachableEndings = new Set<string>();

  while (queue.length > 0) {
    const sceneId = queue.shift()!;
    const scene = pack.scenes.find((s) => s.id === sceneId)!;

    // Check scene's on_enter goto transitions
    for (const eff of scene.on_enter) {
      if ("goto" in eff) {
        const dest = eff.goto;
        if (!allValidDestinations.has(dest)) {
          findings.push({
            severity: "error",
            code: "REFERENCE_ERROR",
            message: `on_enter goto destination '${dest}' does not exist.`,
            where: [`scene:${sceneId}`, "on_enter"],
          });
        } else if (sceneIds.has(dest) && !visitedScenes.has(dest)) {
          visitedScenes.add(dest);
          queue.push(dest);
        } else if (endingIds.has(dest)) {
          reachableEndings.add(dest);
        }
      }
    }

    if (scene.is_ending) {
      reachableEndings.add(sceneId);
      if (scene.choices.length > 0) {
        findings.push({
          severity: "error",
          code: "CHOICES_IN_ENDING",
          message: `Ending scene '${sceneId}' cannot contain outgoing choices.`,
          where: [`scene:${sceneId}`],
        });
      }
      continue;
    }

    // Verify non-ending scene has choices
    if (scene.choices.length === 0) {
      findings.push({
        severity: "error",
        code: "DEAD_END",
        message: `Scene '${sceneId}' is a dead end (not marked is_ending, but has 0 choices).`,
        where: [`scene:${sceneId}`],
      });
    }

    // Traverse choice next nodes
    for (const choice of scene.choices) {
      const dest = choice.next;

      // Reference integrity
      if (!allValidDestinations.has(dest)) {
        findings.push({
          severity: "error",
          code: "REFERENCE_ERROR",
          message: `Choice '${choice.id}' leads to non-existent destination '${dest}'.`,
          where: [`scene:${sceneId}`, `choice:${choice.id}`],
        });
      } else {
        if (sceneIds.has(dest) && !visitedScenes.has(dest)) {
          visitedScenes.add(dest);
          queue.push(dest);
        } else if (endingIds.has(dest)) {
          reachableEndings.add(dest);
        }
      }

      // Check choice conditions for impossible flag/item requirements
      const checkConditionFeasibility = (cond: Condition) => {
        if ("has_flag" in cond && !setFlags.has(cond.has_flag)) {
          findings.push({
            severity: "error",
            code: "IMPOSSIBLE_FLAG_CONDITION",
            message: `Choice requires flag '${cond.has_flag}' which is never set anywhere in the content pack.`,
            where: [`scene:${sceneId}`, `choice:${choice.id}`],
          });
        }
        if ("has_item" in cond && !addedItems.has(cond.has_item)) {
          findings.push({
            severity: "error",
            code: "IMPOSSIBLE_ITEM_CONDITION",
            message: `Choice requires item '${cond.has_item}' which is never added anywhere in the content pack.`,
            where: [`scene:${sceneId}`, `choice:${choice.id}`],
          });
        }
        if ("all_of" in cond) cond.all_of.forEach(checkConditionFeasibility);
        if ("any_of" in cond) cond.any_of.forEach(checkConditionFeasibility);
        if ("none_of" in cond) cond.none_of.forEach(checkConditionFeasibility);
      };

      choice.conditions.forEach(checkConditionFeasibility);
    }
  }

  // 4. Reachability Reporting
  for (const scene of pack.scenes) {
    if (!visitedScenes.has(scene.id)) {
      findings.push({
        severity: "warning",
        code: "UNREACHABLE_SCENE",
        message: `Scene '${scene.id}' is unreachable from starting scene '${pack.meta.start}'.`,
        where: [`scene:${scene.id}`],
      });
    }
  }

  // 5. Ending Reachability Reporting
  if (pack.endings) {
    for (const ending of pack.endings) {
      if (!reachableEndings.has(ending.id)) {
        findings.push({
          severity: "warning",
          code: "UNREACHABLE_ENDING",
          message: `Ending '${ending.id}' is never reached by any transition.`,
          where: [`ending:${ending.id}`],
        });
      }
    }
  }

  // 6. Duplicate Endings Check
  if (pack.endings && pack.endings.length > 1) {
    const endingTexts = new Map<string, string[]>();
    for (const ending of pack.endings) {
      const normalized = ending.text.trim().toLowerCase();
      const existing = endingTexts.get(normalized) ?? [];
      existing.push(ending.id);
      endingTexts.set(normalized, existing);
    }

    for (const [text, ids] of endingTexts.entries()) {
      if (ids.length > 1) {
        findings.push({
          severity: "warning",
          code: "DUPLICATE_ENDING_TEXT",
          message: `Endings [${ids.join(", ")}] share identical structural content.`,
          where: ids.map((id) => `ending:${id}`),
        });
      }
    }
  }

  // 7. Graph-based state-space pathfinder
  const pathfinderFindings = checkCYOASoftlocks(pack);
  findings.push(...pathfinderFindings);

  // Complete validation status
  const ok = !findings.some((f) => f.severity === "error");

  return {
    pack_id: packId,
    ok,
    findings,
  };
}

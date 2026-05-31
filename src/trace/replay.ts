import { Trace } from "./record.js";
import { GameState, createInitialState } from "../core/state.js";
import { Action, StepResult } from "../api/types.js";
import { computeStateHash } from "../core/hash.js";
import { loadGame } from "../persist/save_load.js";

export type ReplayResult = {
  success: boolean;
  finalState: GameState;
  finalHash: string;
  stepsReplayed: number;
  error?: string;
};

/**
 * Deterministically replays a given Trace against the engine's step function.
 * Asserts the expected final state hash if it is defined in the trace.
 */
export function replayTrace(options: {
  trace: Trace;
  stepFn: (state: GameState, action: Action) => StepResult;
  getStartScene: (packId: string) => { start: string; varsInit?: Record<string, number>; flagsInit?: string[] };
}): ReplayResult {
  const { trace, stepFn, getStartScene } = options;

  let state: GameState;

  // 1. Reconstruct initial state
  try {
    if (trace.initial_state_ref === "start") {
      const config = getStartScene(trace.pack_id);
      state = createInitialState({
        seed: trace.seed,
        start: config.start,
        varsInit: config.varsInit,
        flagsInit: config.flagsInit,
      });
    } else {
      state = loadGame(trace.initial_state_ref, trace.pack_id, trace.content_hash);
    }
  } catch (err: any) {
    return {
      success: false,
      finalState: {} as GameState,
      finalHash: "",
      stepsReplayed: 0,
      error: `Failed to initialize state for replay: ${err.message}`,
    };
  }

  // 2. Replay actions sequentially
  let stepsReplayed = 0;
  for (const action of trace.actions) {
    const result = stepFn(state, action);
    if (!result.ok) {
      return {
        success: false,
        finalState: state,
        finalHash: computeStateHash(state),
        stepsReplayed,
        error: `Action failed at step ${stepsReplayed + 1} (${JSON.stringify(action)}): ${result.rejectionReason ?? "Unknown rejection"}`,
      };
    }
    state = result.state;
    stepsReplayed++;
  }

  // 3. Verify final hash
  const finalHash = computeStateHash(state);
  if (trace.expected_final_hash && finalHash !== trace.expected_final_hash) {
    return {
      success: false,
      finalState: state,
      finalHash,
      stepsReplayed,
      error: `Hash mismatch after replay! Expected ${trace.expected_final_hash}, got ${finalHash}`,
    };
  }

  return {
    success: true,
    finalState: state,
    finalHash,
    stepsReplayed,
  };
}

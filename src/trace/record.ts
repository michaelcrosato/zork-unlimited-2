import { Action } from "../api/types.js";

export type Trace = {
  trace_id: string;
  pack_id: string;
  content_hash: string;
  seed: number;
  initial_state_ref: "start" | string; // "start" or serialized save state
  actions: Action[];
  expected_final_hash?: string; // Asserted during replay to ensure determinism
};

/**
 * Creates a new Trace object.
 */
export function recordTrace(options: {
  traceId: string;
  packId: string;
  contentHash: string;
  seed: number;
  initialStateRef: "start" | string;
  actions: Action[];
  expectedFinalHash?: string;
}): Trace {
  return {
    trace_id: options.traceId,
    pack_id: options.packId,
    content_hash: options.contentHash,
    seed: options.seed,
    initial_state_ref: options.initialStateRef,
    actions: options.actions,
    expected_final_hash: options.expectedFinalHash,
  };
}

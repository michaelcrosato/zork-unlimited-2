import { GameState, createInitialState } from "../core/state.js";
import { step } from "../core/engine.js";
import { buildObservation } from "../api/observation.js";
import { LlmClient } from "./llm/client.js";
import { Action, AvailableAction } from "../api/types.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { computeStateHash } from "../core/hash.js";
import { Trace } from "../trace/record.js";

export type PlaytestLogEntry = {
  step: number;
  location: string;
  available_actions: string[];
  chosen_action_id: string;
  reason: string;
  expected: string;
  actual_effects: string[];
  result: "progress" | "dead_end" | "ending";
};

export type PlaytestResult = {
  success: boolean;
  trace: Trace;
  logs: PlaytestLogEntry[];
  finalState: GameState;
  error?: string;
};

/**
 * Runs a simulated playthrough of a CYOAPack using an AI Playtester persona
 * powered by the LlmClient.
 */
export async function runAiPlaytest(options: {
  pack: CYOAPack | ParserPack;
  client: LlmClient;
  seed: number;
  traceId: string;
  maxSteps?: number;
  persona?: string;
}): Promise<PlaytestResult> {
  const { pack, client, seed, traceId, maxSteps = 100, persona = "mainline" } = options;

  const startRoom = "scenes" in pack
    ? (pack as CYOAPack).meta.start
    : (pack as ParserPack).meta.start_room;

  let state = createInitialState({
    seed,
    start: startRoom,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  const actionsRecorded: Action[] = [];
  const logs: PlaytestLogEntry[] = [];
  let currentStep = 0;

  while (!state.ended && currentStep < maxSteps) {
    // 1. Build observation for current state
    const obs = buildObservation(state, pack);
    if (obs.available_actions.length === 0) {
      break; // No moves left
    }

    // 2. Query playtester LLM client to choose an action
    let choiceResponse: { chosen_action_id: string; reason: string; expected_result: string };
    try {
      choiceResponse = await client.completeJson<{
        chosen_action_id: string;
        reason: string;
        expected_result: string;
      }>({
        role: "playtester",
        system: `You are an AI playtester playing under the '${persona}' persona. You receive the current game scene and available choices. Choose one choice to play.`,
        input: { ...obs, persona, flags: state.flags, vars: state.vars },
        schema: {
          type: "object",
          properties: {
            chosen_action_id: { type: "string" },
            reason: { type: "string" },
            expected_result: { type: "string" },
          },
          required: ["chosen_action_id", "reason", "expected_result"],
        },
        seed: seed + currentStep, // Progressively advance seed for choices
      });
    } catch (err: any) {
      return {
        success: false,
        trace: {} as Trace,
        logs,
        finalState: state,
        error: `AI Playtester failed to select action at step ${currentStep}: ${err.message}`,
      };
    }

    const chosenActionId = choiceResponse.chosen_action_id;

    // Verify choice is indeed available
    const choiceExists = obs.available_actions.some((a) => a.id === chosenActionId);
    if (!choiceExists) {
      return {
        success: false,
        trace: {} as Trace,
        logs,
        finalState: state,
        error: `AI Playtester selected illegal choice '${chosenActionId}' in scene '${state.current}'`,
      };
    }

    const action: Action = obs.mode === "cyoa"
      ? { type: "CHOOSE", choiceId: chosenActionId }
      : (obs.available_actions as AvailableAction[]).find((a) => a.id === chosenActionId)!.action;
    actionsRecorded.push(action);

    // 3. Step the engine
    const stepResult = step(state, action, pack);
    if (!stepResult.ok) {
      logs.push({
        step: currentStep + 1,
        location: state.current,
        available_actions: obs.available_actions.map((a) => a.id),
        chosen_action_id: chosenActionId,
        reason: choiceResponse.reason,
        expected: choiceResponse.expected_result,
        actual_effects: [`[REJECTED] ${stepResult.rejectionReason}`],
        result: "dead_end",
      });
      currentStep++;
      continue;
    }

    // 4. Log playtest entry
    const effectsList = stepResult.events.map((e) => JSON.stringify(e));
    let resultType: "progress" | "dead_end" | "ending" = "progress";
    if (stepResult.state.ended) {
      resultType = "ending";
    }

    logs.push({
      step: currentStep + 1,
      location: state.current,
      available_actions: obs.available_actions.map((a) => a.id),
      chosen_action_id: chosenActionId,
      reason: choiceResponse.reason,
      expected: choiceResponse.expected_result,
      actual_effects: effectsList,
      result: resultType,
    });

    state = stepResult.state;
    currentStep++;
  }

  const finalHash = computeStateHash(state);

  const trace: Trace = {
    trace_id: traceId,
    pack_id: pack.meta.id,
    content_hash: "clockwork_pack_hash_v1",
    seed,
    initial_state_ref: "start",
    actions: actionsRecorded,
    expected_final_hash: finalHash,
  };

  const success = state.ended;
  return {
    success,
    trace,
    logs,
    finalState: state,
    error: success ? undefined : "Playtest ended without reaching a terminal game ending.",
  };
}

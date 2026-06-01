import { GameState, AgentState, Transaction, reconcileLootClaims } from "./state.js";
import { Action, StepResult, Observation } from "../api/types.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { step } from "./engine.js";
import { computeStateHash, canonicalStringify } from "./hash.js";
import { buildObservation } from "../api/observation.js";
import { signTransaction } from "./security.js";

export interface MultiAgentAction {
  agentId: string;
  action: Action;
  expectedSequenceNumber?: number;
  expectedStateHash?: string;
  signature?: string;
  signingKey?: string;
}

export interface BufferedAction {
  multiAction: MultiAgentAction;
  timestamp: number;
  receivedAt: number;
}

export class AgentActionBuffer {
  private queue: BufferedAction[] = [];

  /**
   * Adds an action to the buffer, simulating optional network latency.
   */
  public add(multiAction: MultiAgentAction, delayMs = 0): void {
    const now = Date.now();
    this.queue.push({
      multiAction,
      timestamp: now,
      receivedAt: now + delayMs,
    });
  }

  /**
   * Returns all actions that are ready to be processed at the given simulated time.
   */
  public getReadyActions(currentTime: number): BufferedAction[] {
    const ready = this.queue.filter((item) => item.receivedAt <= currentTime);
    // Sort by expectedSequenceNumber if available, then by original timestamp to ensure fairness
    return ready.sort((a, b) => {
      const seqA = a.multiAction.expectedSequenceNumber ?? Infinity;
      const seqB = b.multiAction.expectedSequenceNumber ?? Infinity;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Removes processed actions from the buffer.
   */
  public remove(actions: BufferedAction[]): void {
    const idsToRemove = new Set(actions.map((a) => a.multiAction.agentId + "-" + a.timestamp));
    this.queue = this.queue.filter(
      (item) => !idsToRemove.has(item.multiAction.agentId + "-" + item.timestamp)
    );
  }

  /**
   * Process all ready actions in the buffer against the given GameState.
   * Resolves conflicts dynamically using the state-rollback mechanism.
   */
  public processReady(
    state: GameState,
    pack: CYOAPack | ParserPack,
    currentTime: number
  ): { state: GameState; results: { agentId: string; result: StepResult }[] } {
    let currentState = state;
    const ready = this.getReadyActions(currentTime);
    const results: { agentId: string; result: StepResult }[] = [];

    for (const item of ready) {
      const res = multiAgentStep(currentState, item.multiAction, pack);
      results.push({ agentId: item.multiAction.agentId, result: res });
      if (res.ok) {
        currentState = res.state;
      }
    }

    this.remove(ready);
    return { state: currentState, results };
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * High-throughput multi-agent transition function with optimistic locking
 * and telemetry transaction logging. Supports state rollback and conflict resolution.
 */
export function multiAgentStep(
  state: GameState,
  multiAction: MultiAgentAction,
  pack: CYOAPack | ParserPack
): StepResult {
  const { agentId, action, expectedSequenceNumber, expectedStateHash } = multiAction;

  const stateHashBefore = computeStateHash(state);

  const hasSequenceConflict = expectedSequenceNumber !== undefined && state.step !== expectedSequenceNumber;
  const hasHashConflict = expectedStateHash !== undefined && stateHashBefore !== expectedStateHash;

  // If we have an optimistic locking conflict, try conflict resolution/rollback
  if (hasSequenceConflict || hasHashConflict) {
    let historicalState: GameState | undefined;
    if (state.stateHistory) {
      if (expectedSequenceNumber !== undefined) {
        historicalState = state.stateHistory.find((s) => s.step === expectedSequenceNumber);
      }
      if (!historicalState && expectedStateHash !== undefined) {
        historicalState = state.stateHistory.find((s) => computeStateHash(s) === expectedStateHash);
      }
    }

    if (historicalState) {
      // 1. Apply the late action to the historical state (omitting sequence/hash constraints to avoid recursive lock checks)
      const lateActionClean: MultiAgentAction = { agentId, action };
      const lateResult = multiAgentStep(historicalState, lateActionClean, pack);

      if (lateResult.ok) {
        let S_curr = lateResult.state;

        // 2. Identify all state changes made by the late action relative to historicalState
        const varsModifiedByLate = getChangedKeys(historicalState.vars, S_curr.vars);
        const flagsModifiedByLate = getChangedKeys(historicalState.flags, S_curr.flags);
        const objectsModifiedByLate = getChangedKeys(historicalState.objectState, S_curr.objectState);

        // 3. Find subsequent successful transactions in the current timeline
        const targetSeqNum = historicalState.step;
        const subsequentTx = (state.transactionJournal || []).filter(
          (t) => t.sequenceNumber >= targetSeqNum && t.ok
        );

        let conflictDetected = false;
        let finalState = S_curr;
        const eventsAccumulated = [...lateResult.events];

        // 4. Re-apply each subsequent transaction on top of our new state chain
        for (const tx of subsequentTx) {
          const subActionClean: MultiAgentAction = {
            agentId: tx.agentId,
            action: tx.action,
          };
          const subResult = multiAgentStep(finalState, subActionClean, pack);

          if (!subResult.ok) {
            conflictDetected = true;
            break;
          }

          // Check if this subsequent transaction conflicts with late action changes
          const varsModifiedBySub = getChangedKeys(finalState.vars, subResult.state.vars);
          const flagsModifiedBySub = getChangedKeys(finalState.flags, subResult.state.flags);
          const objectsModifiedBySub = getChangedKeys(finalState.objectState, subResult.state.objectState);

          if (
            hasOverlap(varsModifiedByLate, varsModifiedBySub) ||
            hasOverlap(flagsModifiedByLate, flagsModifiedBySub) ||
            hasOverlap(objectsModifiedByLate, objectsModifiedBySub)
          ) {
            conflictDetected = true;
            break;
          }

          finalState = subResult.state;
          eventsAccumulated.push(...subResult.events);
        }

        if (!conflictDetected) {
          // Successfully merged and re-applied all transactions!
          // Maintain history on finalState
          const history = state.stateHistory ? [...state.stateHistory] : [];
          const clonedPriorState = JSON.parse(JSON.stringify(state));
          delete clonedPriorState.stateHistory;
          history.push(clonedPriorState);
          if (history.length > 50) {
            history.shift();
          }
          finalState.stateHistory = history;

          return {
            state: finalState,
            events: eventsAccumulated,
            ok: true,
          };
        }
      }
    }

    // Rollback/resolution failed or not possible, so reject with appropriate message
    if (hasSequenceConflict) {
      const rejectionReason = `Optimistic locking conflict: state step is ${state.step}, expected ${expectedSequenceNumber}.`;
      return {
        state,
        events: [{ type: "rejected", reason: rejectionReason }],
        ok: false,
        rejectionReason,
      };
    } else {
      const rejectionReason = `Optimistic locking conflict: state hash mismatch.`;
      return {
        state,
        events: [{ type: "rejected", reason: rejectionReason }],
        ok: false,
        rejectionReason,
      };
    }
  }

  // If the game has already ended, reject all actions
  if (state.ended) {
    const rejectionReason = "Game has already ended.";
    return {
      state,
      events: [{ type: "rejected", reason: rejectionReason }],
      ok: false,
      rejectionReason,
    };
  }

  // Handle decentralized CLAIM_LOOT action
  if ((action as any).type === "CLAIM_LOOT") {
    const { chestId, itemId, timestamp } = action as any;
    const claimKey = `${chestId}:${itemId}`;

    const existingClaim = state.lootClaims?.[claimKey];
    let ok = false;
    let rejectionReason: string | undefined;

    if (
      !existingClaim ||
      timestamp > existingClaim.timestamp ||
      (timestamp === existingClaim.timestamp && agentId.localeCompare(existingClaim.claimedBy) < 0)
    ) {
      ok = true;
    } else {
      rejectionReason = `Item already claimed by ${existingClaim.claimedBy} with a newer/equal timestamp.`;
    }

    let newState = { ...state };
    if (ok) {
      const lootClaims = {
        ...(state.lootClaims || {}),
        [claimKey]: {
          claimedBy: agentId,
          timestamp,
        },
      };
      newState.lootClaims = lootClaims;
      newState = reconcileLootClaims(newState, pack);
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = JSON.parse(JSON.stringify(state));
      delete clonedPriorState.stateHistory;
      history.push(clonedPriorState);
      if (history.length > 50) {
        history.shift();
      }
      newState.stateHistory = history;
    }

    // Append transaction journal telemetry
    const stateHashAfter = computeStateHash(newState);
    const transaction: Transaction = {
      agentId,
      sequenceNumber: state.step,
      action,
      stateHashBefore,
      stateHashAfter,
      timestamp,
      ok,
      rejectionReason,
    };

    if (multiAction.signature) {
      transaction.signature = multiAction.signature;
    } else if (multiAction.signingKey) {
      transaction.signature = signTransaction(transaction, multiAction.signingKey);
    }

    newState.transactionJournal = [...(state.transactionJournal || []), transaction];

    return {
      state: newState,
      events: ok ? [{ type: "take", item: itemId }] : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Ensure the agent is registered in the game state
  const agents = state.agents ? { ...state.agents } : {};
  if (!agents[agentId]) {
    agents[agentId] = {
      id: agentId,
      current: state.current,
      inventory: [],
    };
  }

  const agentState = agents[agentId];

  // Prepare temporary local state representing the acting agent
  const localState: GameState = {
    ...state,
    current: agentState.current,
    inventory: [...agentState.inventory],
    agents,
  };

  // Delegate to the deterministic engine step transition
  const stepResult = step(localState, action, pack);

  let newState: GameState;
  if (stepResult.ok) {
    // Transition succeeded: update agent-specific state and merge globally
    const updatedAgents = {
      ...agents,
      [agentId]: {
        id: agentId,
        current: stepResult.state.current,
        inventory: [...stepResult.state.inventory],
      },
    };

    newState = {
      ...stepResult.state,
      agents: updatedAgents,
      current: stepResult.state.current,
      inventory: [...stepResult.state.inventory],
    };
  } else {
    // Transition failed: state does not change globally, but we register the agent
    newState = {
      ...state,
      agents,
    };
  }

  // Maintain history on successful steps
  if (stepResult.ok) {
    const history = state.stateHistory ? [...state.stateHistory] : [];
    const clonedPriorState = JSON.parse(JSON.stringify(state));
    delete clonedPriorState.stateHistory;
    history.push(clonedPriorState);
    if (history.length > 50) {
      history.shift();
    }
    newState.stateHistory = history;
  }

  // Append transaction journal telemetry
  const stateHashAfter = computeStateHash(newState);
  const transaction: Transaction = {
    agentId,
    sequenceNumber: state.step,
    action,
    stateHashBefore,
    stateHashAfter,
    timestamp: Date.now(),
    ok: stepResult.ok,
    rejectionReason: stepResult.rejectionReason,
  };

  if (multiAction.signature) {
    transaction.signature = multiAction.signature;
  } else if (multiAction.signingKey) {
    transaction.signature = signTransaction(transaction, multiAction.signingKey);
  }

  newState.transactionJournal = [...(state.transactionJournal || []), transaction];

  return {
    state: newState,
    events: stepResult.events,
    ok: stepResult.ok,
    rejectionReason: stepResult.rejectionReason,
  };
}

function getChangedKeys<T>(
  before: Record<string, T> | undefined,
  after: Record<string, T> | undefined
): Set<string> {
  const changed = new Set<string>();
  const beforeObj = before || {};
  const afterObj = after || {};
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  for (const key of allKeys) {
    if (canonicalStringify(beforeObj[key]) !== canonicalStringify(afterObj[key])) {
      changed.add(key);
    }
  }
  return changed;
}

function hasOverlap(setA: Set<string>, setB: Set<string>): boolean {
  for (const item of setA) {
    if (setB.has(item)) {
      return true;
    }
  }
  return false;
}


/**
 * Builds a structured sensory observation from a specific agent's perspective.
 */
export function buildObservationForAgent(
  state: GameState,
  pack: CYOAPack | ParserPack,
  agentId: string
): Observation {
  const agents = state.agents || {};
  const agentState = agents[agentId];
  if (!agentState) {
    throw new Error(`Agent with ID '${agentId}' is not registered in GameState.`);
  }

  // Construct a state view where the agent is the main character
  const localState: GameState = {
    ...state,
    current: agentState.current,
    inventory: [...agentState.inventory],
  };

  return buildObservation(localState, pack);
}

import { GameState, AgentState, Transaction, reconcileLootClaims, reconcileTerritories, reconcileTaxPolicies, reconcileAlliances, reconcileTradeRoutes, reconcileTariffPolicies, findRoom, getRoomExits, reconcileGuildPolicies, reconcileCartelPolicies } from "./state.js";
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

  // Handle decentralized CLAIM_TERRITORY action
  if ((action as any).type === "CLAIM_TERRITORY") {
    const { roomId, factionId, timestamp } = action as any;

    const existingClaim = state.territoryClaims?.[roomId];
    let ok = false;
    let rejectionReason: string | undefined;

    if (!existingClaim) {
      ok = true;
    } else if (existingClaim.factionId === factionId) {
      // Re-claiming by same faction (normal LWW)
      if (
        timestamp > existingClaim.timestamp ||
        (timestamp === existingClaim.timestamp && agentId.localeCompare(existingClaim.claimedBy) < 0)
      ) {
        ok = true;
      } else {
        rejectionReason = `Territory ${roomId} already claimed by ${existingClaim.claimedBy} for faction ${existingClaim.factionId} with a newer/equal timestamp.`;
      }
    } else {
      // Conquest: different faction. Calculate cooperative defense and assists
      const D_old = existingClaim.allianceDefense || 1;
      const numAssistants = state.territoryAssists?.[roomId]?.[factionId]?.length || 0;
      const effectiveTimestamp = timestamp - (D_old - 1) * 1000 + numAssistants * 1000;

      if (
        effectiveTimestamp > existingClaim.timestamp ||
        (effectiveTimestamp === existingClaim.timestamp && agentId.localeCompare(existingClaim.claimedBy) < 0)
      ) {
        ok = true;
      } else {
        rejectionReason = `Territory ${roomId} already claimed by ${existingClaim.claimedBy} for faction ${existingClaim.factionId} with a stronger defense/timestamp.`;
      }
    }

    let newState = { ...state };
    if (ok) {
      const assistants = newState.territoryAssists?.[roomId]?.[factionId] || [];
      const territoryClaims = {
        ...(state.territoryClaims || {}),
        [roomId]: {
          claimedBy: agentId,
          factionId,
          timestamp,
          assistants,
          allianceDefense: 1 + assistants.length,
        },
      };
      newState.territoryClaims = territoryClaims;
      newState = reconcileTerritories(newState, pack);
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
      events: ok 
        ? [{ type: "territory_claimed", roomId, factionId, claimedBy: agentId } as any] 
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ASSIST_CONQUEST action
  if ((action as any).type === "ASSIST_CONQUEST") {
    const { roomId, factionId, assistingFactionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === roomId);
    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);
    const isValidAssistingFaction = (pack as any).factions?.some((f: any) => f.id === assistingFactionId);

    if (!isValidRoom) {
      rejectionReason = `Room ${roomId} is not valid in the content pack.`;
    } else if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (!isValidAssistingFaction) {
      rejectionReason = `Assisting faction ${assistingFactionId} is not a valid faction in the content pack.`;
    } else {
      // Check if assistingFactionId is allied with factionId, or is the same faction
      const isAllied = factionId === assistingFactionId || 
        (state.alliances?.[factionId]?.[assistingFactionId] === "allied");
      if (!isAllied) {
        rejectionReason = `Faction ${assistingFactionId} is not allied with ${factionId}.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok) {
      const territoryAssists = { ...(state.territoryAssists || {}) };
      if (!territoryAssists[roomId]) {
        territoryAssists[roomId] = {};
      } else {
        territoryAssists[roomId] = { ...territoryAssists[roomId] };
      }

      const assistants = [...(territoryAssists[roomId][factionId] || [])];
      if (!assistants.includes(agentId)) {
        assistants.push(agentId);
      }
      territoryAssists[roomId][factionId] = assistants;
      newState.territoryAssists = territoryAssists;

      // Update the active claim if it currently belongs to factionId
      const existingClaim = newState.territoryClaims?.[roomId];
      if (existingClaim && existingClaim.factionId === factionId) {
        newState.territoryClaims = {
          ...(newState.territoryClaims || {}),
          [roomId]: {
            ...existingClaim,
            assistants,
            allianceDefense: 1 + assistants.length,
          },
        };
      }
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
      events: ok
        ? [{ type: "conquest_assisted", roomId, factionId, assistingFactionId, assistedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PROPOSE_ALLIANCE and DISSOLVE_ALLIANCE actions
  if ((action as any).type === "PROPOSE_ALLIANCE" || (action as any).type === "DISSOLVE_ALLIANCE") {
    const isPropose = (action as any).type === "PROPOSE_ALLIANCE";
    const { factionA, factionB, targetState, timestamp } = action as any;
    const pairKey = [factionA || "", factionB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidFactionA = (pack as any).factions?.some((f: any) => f.id === factionA);
    const isValidFactionB = (pack as any).factions?.some((f: any) => f.id === factionB);

    if (!isValidFactionA) {
      rejectionReason = `Faction ${factionA} is not a valid faction in the content pack.`;
    } else if (!isValidFactionB) {
      rejectionReason = `Faction ${factionB} is not a valid faction in the content pack.`;
    } else if (factionA === factionB) {
      rejectionReason = `Cannot form alliance with the same faction.`;
    } else if (isPropose && targetState && !["allied", "hostile", "neutral"].includes(targetState)) {
      rejectionReason = `Proposed alliance state ${targetState} must be allied, hostile, or neutral.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const allianceVotes = { ...(state.allianceVotes || {}) };
      if (!allianceVotes[pairKey]) {
        allianceVotes[pairKey] = {};
      } else {
        allianceVotes[pairKey] = { ...allianceVotes[pairKey] };
      }

      const votedState = isPropose ? (targetState ?? "allied") : "neutral";

      const existingVote = allianceVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        allianceVotes[pairKey][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.allianceVotes = allianceVotes;
        newState = reconcileAlliances(newState, pack);
      } else {
        ok = true;
      }
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

    // Update agent sequence vector clock
    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [
            {
              type: "state_change",
              effect: isPropose ? "propose_alliance" : "dissolve_alliance",
              variable: pairKey,
              value: isPropose ? (targetState ?? "allied") : "neutral",
            } as any,
          ]
        : [
            {
              type: "rejected",
              reason: rejectionReason || "Failed alliance vote.",
            } as any,
          ],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEFINE_TRADE_ROUTE action
  if ((action as any).type === "DEFINE_TRADE_ROUTE") {
    const { routeId, factionId, rooms, taxShare, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);
    if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (taxShare < 0 || !Number.isInteger(taxShare)) {
      rejectionReason = `Proposed tax share ${taxShare} must be a non-negative integer.`;
    } else if (!Array.isArray(rooms) || rooms.length === 0) {
      rejectionReason = `Rooms list must be a non-empty array of valid room IDs.`;
    } else {
      // Validate all rooms exist
      let allRoomsValid = true;
      for (const roomId of rooms) {
        if (!findRoom(state, pack, roomId)) {
          allRoomsValid = false;
          rejectionReason = `Room ${roomId} in trade route is not a valid room.`;
          break;
        }
      }

      if (allRoomsValid) {
        // Validate adjacency/connectedness of rooms
        let isConnected = true;
        for (let i = 0; i < rooms.length - 1; i++) {
          const room = findRoom(state, pack, rooms[i]);
          const exits = getRoomExits(state, room);
          if (!exits.some(e => e.to === rooms[i+1])) {
            isConnected = false;
            rejectionReason = `Trade route is disconnected: no path from ${rooms[i]} to ${rooms[i+1]}.`;
            break;
          }
        }
        if (isConnected) {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    if (ok) {
      const tradeRoutes = { ...(state.tradeRoutes || {}) };
      const existingRoute = tradeRoutes[routeId];

      if (!existingRoute || timestamp > existingRoute.timestamp ||
        (timestamp === existingRoute.timestamp && agentId.localeCompare(existingRoute.definedBy) < 0)
      ) {
        tradeRoutes[routeId] = {
          id: routeId,
          factionId,
          rooms,
          definedBy: agentId,
          taxShare,
          timestamp,
        };
        newState.tradeRoutes = tradeRoutes;

        // Also initialize/record the definer's vote on tax share
        const tradeRouteVotes = { ...(state.tradeRouteVotes || {}) };
        if (!tradeRouteVotes[routeId]) {
          tradeRouteVotes[routeId] = {};
        } else {
          tradeRouteVotes[routeId] = { ...tradeRouteVotes[routeId] };
        }
        tradeRouteVotes[routeId][agentId] = {
          taxShare,
          timestamp,
        };
        newState.tradeRouteVotes = tradeRouteVotes;

        newState = reconcileTradeRoutes(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "trade_route_defined", routeId, factionId, rooms, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_TRADE_ROUTE_TAX action
  if ((action as any).type === "VOTE_TRADE_ROUTE_TAX") {
    const { routeId, taxShare, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingRoute = state.tradeRoutes?.[routeId];
    if (!existingRoute) {
      rejectionReason = `Trade route ${routeId} does not exist in state.`;
    } else if (taxShare < 0 || !Number.isInteger(taxShare)) {
      rejectionReason = `Proposed tax share ${taxShare} must be a non-negative integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const tradeRouteVotes = { ...(state.tradeRouteVotes || {}) };
      if (!tradeRouteVotes[routeId]) {
        tradeRouteVotes[routeId] = {};
      } else {
        tradeRouteVotes[routeId] = { ...tradeRouteVotes[routeId] };
      }

      const existingVote = tradeRouteVotes[routeId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        tradeRouteVotes[routeId][agentId] = {
          taxShare,
          timestamp,
        };
        newState.tradeRouteVotes = tradeRouteVotes;
        newState = reconcileTradeRoutes(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "trade_route_tax_voted", routeId, taxShare, votedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_TAX_RATE action
  if ((action as any).type === "VOTE_TAX_RATE") {
    const { factionId, rate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);
    if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (rate < 0 || !Number.isInteger(rate)) {
      rejectionReason = `Proposed rate ${rate} must be a non-negative integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const taxVotes = { ...(state.taxVotes || {}) };
      if (!taxVotes[factionId]) {
        taxVotes[factionId] = {};
      } else {
        taxVotes[factionId] = { ...taxVotes[factionId] };
      }
      
      const existingVote = taxVotes[factionId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        taxVotes[factionId][agentId] = {
          rate,
          timestamp,
        };
        newState.taxVotes = taxVotes;
        newState = reconcileTaxPolicies(newState, pack);
      } else {
        ok = true;
      }
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
      events: ok
        ? [{ type: "tax_policy_voted", factionId, rate, votedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEFINE_MERCHANT_LICENSING action
  if ((action as any).type === "DEFINE_MERCHANT_LICENSING") {
    const { factionId, licenseCost, tariffRate, timestamp, tariffWaiverThreshold, tariffDiscountThreshold } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);
    if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (licenseCost < 0 || !Number.isInteger(licenseCost)) {
      rejectionReason = `Proposed license cost ${licenseCost} must be a non-negative integer.`;
    } else if (tariffRate < 0 || !Number.isInteger(tariffRate)) {
      rejectionReason = `Proposed tariff rate ${tariffRate} must be a non-negative integer.`;
    } else if (tariffWaiverThreshold !== undefined && !Number.isInteger(tariffWaiverThreshold)) {
      rejectionReason = `Proposed tariff waiver threshold must be an integer.`;
    } else if (tariffDiscountThreshold !== undefined && !Number.isInteger(tariffDiscountThreshold)) {
      rejectionReason = `Proposed tariff discount threshold must be an integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const merchantLicensings = { ...(state.merchantLicensings || {}) };
      const existingLicense = merchantLicensings[factionId];

      if (!existingLicense || timestamp > existingLicense.timestamp ||
        (timestamp === existingLicense.timestamp && agentId.localeCompare(existingLicense.definedBy) < 0)
      ) {
        merchantLicensings[factionId] = {
          factionId,
          licenseCost,
          tariffRate,
          definedBy: agentId,
          timestamp,
          ...(tariffWaiverThreshold !== undefined ? { tariffWaiverThreshold } : {}),
          ...(tariffDiscountThreshold !== undefined ? { tariffDiscountThreshold } : {}),
        };
        newState.merchantLicensings = merchantLicensings;

        // Initialize tariff votes
        const tariffVotes = { ...(state.tariffVotes || {}) };
        if (!tariffVotes[factionId]) {
          tariffVotes[factionId] = {};
        } else {
          tariffVotes[factionId] = { ...tariffVotes[factionId] };
        }
        tariffVotes[factionId][agentId] = {
          rate: tariffRate,
          timestamp,
        };
        newState.tariffVotes = tariffVotes;

        newState = reconcileTariffPolicies(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "merchant_licensing_defined", factionId, licenseCost, tariffRate, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_MERCHANT_TARIFF action
  if ((action as any).type === "VOTE_MERCHANT_TARIFF") {
    const { factionId, tariffRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingLicense = state.merchantLicensings?.[factionId];
    if (!existingLicense) {
      rejectionReason = `Merchant licensing for faction ${factionId} does not exist in state.`;
    } else if (tariffRate < 0 || !Number.isInteger(tariffRate)) {
      rejectionReason = `Proposed tariff rate ${tariffRate} must be a non-negative integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const tariffVotes = { ...(state.tariffVotes || {}) };
      if (!tariffVotes[factionId]) {
        tariffVotes[factionId] = {};
      } else {
        tariffVotes[factionId] = { ...tariffVotes[factionId] };
      }

      const existingVote = tariffVotes[factionId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        tariffVotes[factionId][agentId] = {
          rate: tariffRate,
          timestamp,
        };
        newState.tariffVotes = tariffVotes;
        newState = reconcileTariffPolicies(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "merchant_tariff_voted", factionId, tariffRate, voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUY_MERCHANT_LICENSE action
  if ((action as any).type === "BUY_MERCHANT_LICENSE") {
    const { factionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingLicenseDef = state.merchantLicensings?.[factionId];
    if (!existingLicenseDef) {
      rejectionReason = `Merchant licensing for faction ${factionId} does not exist in state.`;
    } else {
      const alreadyHasLicense = state.merchantLicenses?.[agentId]?.includes(factionId) || false;
      if (alreadyHasLicense) {
        rejectionReason = `Agent already has a license for faction ${factionId}.`;
      } else {
        // Check gold
        const licenseCost = existingLicenseDef.licenseCost;
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < licenseCost) {
          rejectionReason = `Insufficient gold to purchase merchant license (requires ${licenseCost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    if (ok && existingLicenseDef) {
      const licenseCost = existingLicenseDef.licenseCost;
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - licenseCost,
      };

      // Register license
      const merchantLicenses = { ...(state.merchantLicenses || {}) };
      if (!merchantLicenses[agentId]) {
        merchantLicenses[agentId] = [];
      } else {
        merchantLicenses[agentId] = [...merchantLicenses[agentId]];
      }
      if (!merchantLicenses[agentId].includes(factionId)) {
        merchantLicenses[agentId].push(factionId);
      }
      newState.merchantLicenses = merchantLicenses;
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "merchant_license_purchased", factionId, agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEFINE_MERCHANT_GUILD action
  if ((action as any).type === "DEFINE_MERCHANT_GUILD") {
    const { guildId, name, members, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    if (!guildId || typeof guildId !== "string") {
      rejectionReason = `Proposed guild ID must be a non-empty string.`;
    } else if (!name || typeof name !== "string") {
      rejectionReason = `Proposed guild name must be a non-empty string.`;
    } else if (!Array.isArray(members) || members.some(m => typeof m !== "string")) {
      rejectionReason = `Proposed guild members must be an array of NPC ID strings.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const merchantGuilds = { ...(state.merchantGuilds || {}) };
      const existingGuild = merchantGuilds[guildId];

      if (!existingGuild || timestamp > existingGuild.timestamp ||
        (timestamp === existingGuild.timestamp && agentId.localeCompare(existingGuild.definedBy) < 0)
      ) {
        merchantGuilds[guildId] = {
          id: guildId,
          name,
          members,
          definedBy: agentId,
          timestamp,
        };
        newState.merchantGuilds = merchantGuilds;
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "merchant_guild_defined", guildId, name, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized JOIN_MERCHANT_GUILD action
  if ((action as any).type === "JOIN_MERCHANT_GUILD") {
    const { guildId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const guild = state.merchantGuilds?.[guildId];
    if (!guild) {
      rejectionReason = `Merchant guild ${guildId} does not exist in state.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const guildMemberships = { ...(state.guildMemberships || {}) };
      if (!guildMemberships[agentId]) {
        guildMemberships[agentId] = [];
      } else {
        guildMemberships[agentId] = [...guildMemberships[agentId]];
      }

      if (!guildMemberships[agentId].includes(guildId)) {
        guildMemberships[agentId].push(guildId);
      }
      newState.guildMemberships = guildMemberships;
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "merchant_guild_joined", guildId, agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_GUILD_POLICY action
  if ((action as any).type === "VOTE_GUILD_POLICY") {
    const { guildId, tariffRate, exportPricingPolicy, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const guild = state.merchantGuilds?.[guildId];
    const isMember = state.guildMemberships?.[agentId]?.includes(guildId) || false;

    if (!guild) {
      rejectionReason = `Merchant guild ${guildId} does not exist in state.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of guild ${guildId} and cannot vote.`;
    } else if (tariffRate < 0 || !Number.isInteger(tariffRate)) {
      rejectionReason = `Proposed guild tariff rate ${tariffRate} must be a non-negative integer.`;
    } else if (!["premium", "discount", "standard"].includes(exportPricingPolicy)) {
      rejectionReason = `Proposed export pricing policy ${exportPricingPolicy} is invalid.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const guildVotes = { ...(state.guildVotes || {}) };
      if (!guildVotes[guildId]) {
        guildVotes[guildId] = {};
      } else {
        guildVotes[guildId] = { ...guildVotes[guildId] };
      }

      const existingVote = guildVotes[guildId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        guildVotes[guildId][agentId] = {
          tariffRate,
          exportPricingPolicy,
          timestamp,
        };
        newState.guildVotes = guildVotes;
        newState = reconcileGuildPolicies(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "guild_policy_voted", guildId, tariffRate, exportPricingPolicy, voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized NEGOTIATE_COLLECTIVE_BARGAINING action
  if ((action as any).type === "NEGOTIATE_COLLECTIVE_BARGAINING") {
    const { guildId, factionId, agreedTariff, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const guild = state.merchantGuilds?.[guildId];
    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);
    const isMember = state.guildMemberships?.[agentId]?.includes(guildId) || false;

    if (!guild) {
      rejectionReason = `Merchant guild ${guildId} does not exist in state.`;
    } else if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of guild ${guildId} and cannot negotiate collective bargaining.`;
    } else if (agreedTariff < 0 || !Number.isInteger(agreedTariff)) {
      rejectionReason = `Proposed agreed tariff rate ${agreedTariff} must be a non-negative integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const collectiveBargainingAgreements = { ...(state.collectiveBargainingAgreements || {}) };
      const cbaKey = `${guildId}:${factionId}`;
      const existingCba = collectiveBargainingAgreements[cbaKey];

      if (!existingCba || timestamp > existingCba.timestamp ||
        (timestamp === existingCba.timestamp && agentId.localeCompare(existingCba.definedBy) < 0)
      ) {
        collectiveBargainingAgreements[cbaKey] = {
          guildId,
          factionId,
          agreedTariff,
          definedBy: agentId,
          timestamp,
        };
        newState.collectiveBargainingAgreements = collectiveBargainingAgreements;
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "collective_bargaining_negotiated", guildId, factionId, agreedTariff, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEFINE_MERCHANT_CARTEL action
  if ((action as any).type === "DEFINE_MERCHANT_CARTEL") {
    const { cartelId, name, members, factionId, priceMultiplier, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const isValidFaction = (pack as any).factions?.some((f: any) => f.id === factionId);

    if (!cartelId || typeof cartelId !== "string") {
      rejectionReason = `Proposed cartel ID must be a non-empty string.`;
    } else if (!name || typeof name !== "string") {
      rejectionReason = `Proposed cartel name must be a non-empty string.`;
    } else if (!Array.isArray(members) || members.some(m => typeof m !== "string")) {
      rejectionReason = `Proposed cartel members must be an array of NPC ID strings.`;
    } else if (!isValidFaction) {
      rejectionReason = `Faction ${factionId} is not a valid faction in the content pack.`;
    } else if (priceMultiplier < 0) {
      rejectionReason = `Proposed price multiplier must be non-negative.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const cartels = { ...(state.cartels || {}) };
      const existingCartel = cartels[cartelId];

      if (!existingCartel || timestamp > existingCartel.timestamp ||
        (timestamp === existingCartel.timestamp && agentId.localeCompare(existingCartel.definedBy) < 0)
      ) {
        cartels[cartelId] = {
          id: cartelId,
          name,
          members,
          factionId,
          priceMultiplier,
          definedBy: agentId,
          timestamp,
        };
        newState.cartels = cartels;

        // Initialize memberships
        const cartelMemberships = { ...(state.cartelMemberships || {}) };
        for (const memberId of members) {
          if (!cartelMemberships[memberId]) {
            cartelMemberships[memberId] = [];
          } else {
            cartelMemberships[memberId] = [...cartelMemberships[memberId]];
          }
          if (!cartelMemberships[memberId].includes(cartelId)) {
            cartelMemberships[memberId].push(cartelId);
          }
        }
        newState.cartelMemberships = cartelMemberships;

        // Definer's initial vote
        const cartelVotes = { ...(state.cartelVotes || {}) };
        if (!cartelVotes[cartelId]) {
          cartelVotes[cartelId] = {};
        } else {
          cartelVotes[cartelId] = { ...cartelVotes[cartelId] };
        }
        cartelVotes[cartelId][agentId] = {
          priceMultiplier,
          embargoedFactions: [],
          timestamp,
        };
        newState.cartelVotes = cartelVotes;

        newState = reconcileCartelPolicies(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "cartel_defined", cartelId, name, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized JOIN_MERCHANT_CARTEL action
  if ((action as any).type === "JOIN_MERCHANT_CARTEL") {
    const { cartelId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const cartel = state.cartels?.[cartelId];
    if (!cartel) {
      rejectionReason = `Merchant cartel ${cartelId} does not exist in state.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok && cartel) {
      const cartelMemberships = { ...(state.cartelMemberships || {}) };
      if (!cartelMemberships[agentId]) {
        cartelMemberships[agentId] = [];
      } else {
        cartelMemberships[agentId] = [...cartelMemberships[agentId]];
      }

      if (!cartelMemberships[agentId].includes(cartelId)) {
        cartelMemberships[agentId].push(cartelId);
      }
      newState.cartelMemberships = cartelMemberships;

      // Update members in cartel object
      const cartels = { ...(state.cartels || {}) };
      if (cartels[cartelId]) {
        cartels[cartelId] = {
          ...cartels[cartelId],
          members: Array.from(new Set([...cartels[cartelId].members, agentId])),
        };
        newState.cartels = cartels;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "cartel_joined", cartelId, agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_CARTEL_POLICY action
  if ((action as any).type === "VOTE_CARTEL_POLICY") {
    const { cartelId, priceMultiplier, embargoedFactions, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const cartel = state.cartels?.[cartelId];
    const isMember = cartel?.members.includes(agentId) || state.cartelMemberships?.[agentId]?.includes(cartelId) || false;

    if (!cartel) {
      rejectionReason = `Merchant cartel ${cartelId} does not exist in state.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of cartel ${cartelId} and cannot vote.`;
    } else if (priceMultiplier < 0) {
      rejectionReason = `Proposed price multiplier must be non-negative.`;
    } else if (!Array.isArray(embargoedFactions) || embargoedFactions.some(f => typeof f !== "string")) {
      rejectionReason = `Proposed embargoed factions must be an array of faction ID strings.`;
    } else {
      // Validate factions exist
      let allFactionsValid = true;
      for (const factionId of embargoedFactions) {
        const isValid = (pack as any).factions?.some((f: any) => f.id === factionId);
        if (!isValid) {
          allFactionsValid = false;
          rejectionReason = `Faction ${factionId} in cartel embargo is not a valid faction.`;
          break;
        }
      }
      if (allFactionsValid) {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok) {
      const cartelVotes = { ...(state.cartelVotes || {}) };
      if (!cartelVotes[cartelId]) {
        cartelVotes[cartelId] = {};
      } else {
        cartelVotes[cartelId] = { ...cartelVotes[cartelId] };
      }

      const existingVote = cartelVotes[cartelId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        cartelVotes[cartelId][agentId] = {
          priceMultiplier,
          embargoedFactions,
          timestamp,
        };
        newState.cartelVotes = cartelVotes;
        newState = reconcileCartelPolicies(newState, pack);
      } else {
        ok = true;
      }
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "cartel_policy_voted", cartelId, priceMultiplier, embargoedFactions, voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
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

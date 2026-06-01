import { GameState, cloneStateWithoutHistory, AgentState, Transaction, reconcileLootClaims, reconcileTerritories, reconcileTaxPolicies, reconcileAlliances, reconcileTradeRoutes, reconcileTariffPolicies, findRoom, getRoomExits, reconcileGuildPolicies, reconcileCartelPolicies, reconcileSyndicateTurf, reconcileSyndicateTaxes, reconcileSyndicateBribes, reconcileSyndicateWaivers, reconcileEspionageNetworks, reconcileWiretaps, reconcileCartelGlobalTaxes, reconcileSmugglerGuildCbas, reconcileSyndicateAlliances, reconcileFactionWars, reconcileCovertCells, reconcilePropagandaCampaigns, reconcileEnforcerDefunding, reconcileShadowAlliances, reconcileTariffExemptions, reconcileSafehouseRentRates, getSafehouseStorageCapacity, getSyndicateBankCapacity, reconcileBankInterestRates } from "./state.js";
import { Action, StepResult, Observation } from "../api/types.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { step, tickProductionLabs } from "./engine.js";
import { computeStateHash, canonicalStringify } from "./hash.js";
import { buildObservation } from "../api/observation.js";
import { signTransaction } from "./security.js";
import { PureRand } from "./rng.js";
import { getMerchantGold, getContrabandInInventory, calculateConvoyInsurancePremium, tickEconomy } from "./economy.js";

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
          const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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
      const clonedPriorState = cloneStateWithoutHistory(state);
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

  // Handle decentralized SET_CONTRABAND_BLACKLIST action
  if ((action as any).type === "SET_CONTRABAND_BLACKLIST") {
    const { itemId, blacklisted, timestamp } = action as any;

    let ok = true;
    let rejectionReason: string | undefined;

    const isValidObject = (pack as any).objects?.some((o: any) => o.id === itemId);
    if (!isValidObject) {
      ok = false;
      rejectionReason = `Item ${itemId} is not a valid item in the content pack.`;
    }

    let newState = { ...state };
    if (ok) {
      const blacklist = { ...(state.contrabandBlacklist || {}) };
      const existing = blacklist[itemId];
      if (!existing || timestamp > existing.timestamp) {
        blacklist[itemId] = {
          blacklisted,
          timestamp,
        };
        newState.contrabandBlacklist = blacklist;
      }
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "contraband_blacklist_updated", itemId, blacklisted, updatedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized SET_BLACK_MARKET_PAYOUT action
  if ((action as any).type === "SET_BLACK_MARKET_PAYOUT") {
    const { roomId, payout, timestamp } = action as any;

    let ok = true;
    let rejectionReason: string | undefined;

    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === roomId);
    if (!isValidRoom) {
      ok = false;
      rejectionReason = `Room ${roomId} is not a valid room in the content pack.`;
    } else if (payout < 0 || !Number.isInteger(payout)) {
      ok = false;
      rejectionReason = `Payout ${payout} must be a non-negative integer.`;
    }

    let newState = { ...state };
    if (ok) {
      const payouts = { ...(state.blackMarketPayouts || {}) };
      const existing = payouts[roomId];
      if (!existing || timestamp > existing.timestamp) {
        payouts[roomId] = {
          payout,
          timestamp,
        };
        newState.blackMarketPayouts = payouts;
      }
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "black_market_payout_updated", roomId, payout, updatedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DECLARE_BOUNTY action
  if ((action as any).type === "DECLARE_BOUNTY") {
    const { targetId, amount, timestamp } = action as any;
    let ok = true;
    let rejectionReason: string | undefined;

    if (amount < 0 || !Number.isInteger(amount)) {
      ok = false;
      rejectionReason = `Bounty amount ${amount} must be a non-negative integer.`;
    }

    let newState = { ...state };
    if (ok) {
      const bounties = { ...(state.bounties || {}) };
      const existing = bounties[targetId];
      if (!existing || timestamp > existing.timestamp) {
        bounties[targetId] = {
          targetId,
          amount,
          active: true,
          timestamp,
        };
        newState.bounties = bounties;
      }
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "bounty_declared", targetId, amount, declaredBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CLAIM_BOUNTY_PAYOUT action
  if ((action as any).type === "CLAIM_BOUNTY_PAYOUT") {
    const { targetId, claimantId, timestamp } = action as any;
    let ok = true;
    let rejectionReason: string | undefined;

    const bounty = state.bounties?.[targetId];
    if (!bounty || !bounty.active) {
      ok = false;
      rejectionReason = `No active bounty found for target ${targetId}.`;
    }

    let newState = { ...state };
    if (ok && bounty) {
      const bounties = { ...(state.bounties || {}) };
      bounties[targetId] = {
        ...bounty,
        active: false,
        timestamp,
      };
      newState.bounties = bounties;

      const goldReward = bounty.amount;
      if (claimantId === "player") {
        newState.vars["gold"] = (newState.vars["gold"] ?? 0) + goldReward;
      } else if (newState.agents?.[claimantId]) {
        // Optionally update claimant agent's gold registry if ever modeled, but currently log in journal
      }
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "bounty_claimed", targetId, claimantId, reward: bounty!.amount } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPDATE_ENFORCER action
  if ((action as any).type === "UPDATE_ENFORCER") {
    const { enforcerId, currentRoom, targetId, status, timestamp, hp, max_hp, attack, defense, gold, xp } = action as any;
    let ok = true;
    let rejectionReason: string | undefined;

    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === currentRoom);
    if (!isValidRoom) {
      ok = false;
      rejectionReason = `Room ${currentRoom} is not a valid room.`;
    }

    let newState = { ...state };
    if (ok) {
      const enforcers = { ...(state.enforcers || {}) };
      const existing = enforcers[enforcerId];
      if (!existing || timestamp > existing.timestamp) {
        enforcers[enforcerId] = {
          id: enforcerId,
          name: existing?.name ?? (action as any).name ?? `Agent ${enforcerId}`,
          factionId: existing?.factionId ?? (action as any).factionId,
          currentRoom,
          targetId: targetId !== undefined ? targetId : existing?.targetId,
          status: status !== undefined ? status : (existing?.status ?? "idle"),
          isBountyHunter: existing?.isBountyHunter ?? ((action as any).isBountyHunter ?? false),
          timestamp,
          hp: hp !== undefined ? hp : existing?.hp,
          max_hp: max_hp !== undefined ? max_hp : existing?.max_hp,
          attack: attack !== undefined ? attack : existing?.attack,
          defense: defense !== undefined ? defense : existing?.defense,
          gold: gold !== undefined ? gold : existing?.gold,
          xp: xp !== undefined ? xp : existing?.xp,
        };
        newState.enforcers = enforcers;
      }
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "enforcer_updated", enforcerId, currentRoom, status } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUY_SMUGGLING_INSURANCE action
  if ((action as any).type === "BUY_SMUGGLING_INSURANCE") {
    const { timestamp } = action as any;
    const cost = (action as any).cost ?? 100;

    let ok = false;
    let rejectionReason: string | undefined;

    if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Insurance cost ${cost} must be a non-negative integer.`;
    } else {
      const existing = state.smugglingInsurance?.[agentId];
      if (existing && existing.active) {
        rejectionReason = `Agent ${agentId} already has an active smuggling insurance policy.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to purchase smuggling insurance (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Register insurance policy
      const smugglingInsurance = { ...(state.smugglingInsurance || {}) };
      smugglingInsurance[agentId] = {
        buyerId: agentId,
        active: true,
        timestamp,
      };
      newState.smugglingInsurance = smugglingInsurance;
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "smuggling_insurance_purchased", buyerId: agentId, cost } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PAY_BRIBE action
  if ((action as any).type === "PAY_BRIBE") {
    const { enforcerId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    if (amount < 0 || !Number.isInteger(amount)) {
      rejectionReason = `Bribe amount ${amount} must be a non-negative integer.`;
    } else if (!enforcerId) {
      rejectionReason = `Target enforcerId is required for bribe.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to pay bribe of ${amount} (has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      // Register bribe
      const bribes = { ...(state.bribes || {}) };
      bribes[enforcerId] = {
        enforcerId,
        amount,
        timestamp,
      };
      newState.bribes = bribes;
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "bribe_paid", agentId, enforcerId, amount } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CREATE_SYNDICATE action (AF-43)
  if ((action as any).type === "CREATE_SYNDICATE") {
    const { id, name, members, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    if (!id || !name || !members || !Array.isArray(members)) {
      rejectionReason = `Syndicate properties (id, name, members) are invalid or missing.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const syndicates = { ...(state.syndicates || {}) };
      syndicates[id] = {
        id,
        name,
        members,
        definedBy: agentId,
        timestamp,
      };
      newState.syndicates = syndicates;
    }

    newState.step += 1;
    let customEvents: any[] = [];
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "syndicate_created", agentId, id, name, members } as any, ...customEvents]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUILD_LAB action (AF-43)
  if ((action as any).type === "BUILD_LAB") {
    const { roomId, syndicateId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    if (!roomId) {
      rejectionReason = `Room ID is required to build a lab.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to build a lab.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Build cost ${cost} must be a non-negative integer.`;
    } else {
      const activeSyndicate = state.syndicates?.[syndicateId];
      if (!activeSyndicate) {
        rejectionReason = `Syndicate ${syndicateId} does not exist.`;
      } else if (!activeSyndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
      } else {
        const existingLab = state.productionLabs?.[roomId];
        if (existingLab) {
          rejectionReason = `A production lab already exists in room ${roomId}.`;
        } else {
          const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
          const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
          if (currentGold < cost) {
            rejectionReason = `Insufficient gold to build production lab (requires ${cost}, has ${currentGold}).`;
          } else {
            ok = true;
          }
        }
      }
    }

    let newState = { ...state };
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Build production lab
      const productionLabs = { ...(state.productionLabs || {}) };
      productionLabs[roomId] = {
        id: `lab_${roomId}`,
        roomId,
        ownerId: agentId,
        syndicateId,
        level: 1,
        capacity: 50,
        storedContraband: 0,
        lastProducedStep: state.step,
        cooldownSteps: 5,
        timestamp,
        defense: 0,
      };
      newState.productionLabs = productionLabs;
    }

    newState.step += 1;
    let customEvents: any[] = [];
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "lab_built", agentId, roomId, syndicateId, cost } as any, ...customEvents]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_LAB action (AF-43)
  if ((action as any).type === "UPGRADE_LAB") {
    const { roomId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingLab = state.productionLabs?.[roomId];
    if (!existingLab) {
      rejectionReason = `No production lab exists in room ${roomId}.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Upgrade cost ${cost} must be a non-negative integer.`;
    } else {
      const activeSyndicate = state.syndicates?.[existingLab.syndicateId];
      if (!activeSyndicate) {
        rejectionReason = `Associated syndicate ${existingLab.syndicateId} does not exist.`;
      } else if (!activeSyndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not authorized to upgrade the lab in room ${roomId}.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade production lab (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    if (ok && existingLab) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Upgrade lab
      const productionLabs = { ...(state.productionLabs || {}) };
      const lab = productionLabs[roomId];
      productionLabs[roomId] = {
        ...lab,
        level: lab.level + 1,
        capacity: lab.capacity + 50,
        cooldownSteps: Math.max(2, lab.cooldownSteps - 1),
        timestamp,
      };
      newState.productionLabs = productionLabs;
    }

    newState.step += 1;
    let customEvents: any[] = [];
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "lab_upgraded", agentId, roomId, level: existingLab!.level + 1, cost } as any, ...customEvents]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_LAB_DEFENSE action (AF-43)
  if ((action as any).type === "UPGRADE_LAB_DEFENSE") {
    const { roomId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingLab = state.productionLabs?.[roomId];
    if (!existingLab) {
      rejectionReason = `No production lab exists in room ${roomId}.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Upgrade cost ${cost} must be a non-negative integer.`;
    } else {
      const activeSyndicate = state.syndicates?.[existingLab.syndicateId];
      if (!activeSyndicate) {
        rejectionReason = `Associated syndicate ${existingLab.syndicateId} does not exist.`;
      } else if (!activeSyndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not authorized to upgrade defense for the lab in room ${roomId}.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade defense (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    if (ok && existingLab) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Upgrade defense
      const productionLabs = { ...(state.productionLabs || {}) };
      const lab = productionLabs[roomId];
      productionLabs[roomId] = {
        ...lab,
        defense: (lab.defense ?? 0) + 15,
        timestamp,
      };
      newState.productionLabs = productionLabs;
    }

    newState.step += 1;
    let customEvents: any[] = [];
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "lab_defense_upgraded", agentId, roomId, defense: (existingLab!.defense ?? 0) + 15, cost } as any, ...customEvents]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CLAIM_CONTRABAND action (AF-43)
  if ((action as any).type === "CLAIM_CONTRABAND") {
    const { roomId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const existingLab = state.productionLabs?.[roomId];
    if (!existingLab) {
      rejectionReason = `No production lab exists in room ${roomId}.`;
    } else {
      const activeSyndicate = state.syndicates?.[existingLab.syndicateId];
      if (!activeSyndicate) {
        rejectionReason = `Associated syndicate ${existingLab.syndicateId} does not exist.`;
      } else if (!activeSyndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not authorized to collect from the lab in room ${roomId}.`;
      } else if (existingLab.storedContraband <= 0) {
        rejectionReason = `No contraband is stored in the lab in room ${roomId}.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok && existingLab) {
      const claimedAmount = existingLab.storedContraband;
      const itemsToAdd = Array(claimedAmount).fill("spice");

      if (agentId === "player") {
        newState.inventory = [...newState.inventory, ...itemsToAdd];
      } else {
        const agents = newState.agents ? { ...newState.agents } : {};
        if (!agents[agentId]) {
          agents[agentId] = {
            id: agentId,
            current: state.current,
            inventory: [],
          };
        }
        const agentState = { ...agents[agentId] };
        agentState.inventory = [...agentState.inventory, ...itemsToAdd];
        agents[agentId] = agentState;
        newState.agents = agents;
      }

      // Reset stored contraband
      const productionLabs = { ...(state.productionLabs || {}) };
      productionLabs[roomId] = {
        ...existingLab,
        storedContraband: 0,
        timestamp,
      };
      newState.productionLabs = productionLabs;
    }

    newState.step += 1;
    let customEvents: any[] = [];
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "contraband_claimed", agentId, roomId, amount: existingLab!.storedContraband } as any, ...customEvents]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized WAGE_TURF_WAR action (AF-44)
  if ((action as any).type === "WAGE_TURF_WAR") {
    const { roomId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 100;

    let ok = false;
    let rejectionReason: string | undefined;
    let battleOutcome: "attacker_won" | "defender_won" | undefined;
    let attackerStrength = 0;
    let defenderStrength = 0;
    let targetSyndicateId: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to wage turf war (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      
      // Deduct cost
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Attacker strength
      const attackerDominance = syndicate.dominance ?? 50;
      attackerStrength = attackerDominance;

      // Lab bonus for attacker in the room if any
      const existingLab = state.productionLabs?.[roomId];
      if (existingLab && existingLab.syndicateId === syndicateId) {
        attackerStrength += (existingLab.level * 10) + (existingLab.defense ?? 0);
      }

      // Roll PRNG for attacker using PureRand.nextInt static method
      let currentSeed = state.seed + timestamp + state.step;
      const attackRes = PureRand.nextInt(currentSeed, 1, 20);
      const attackRoll = attackRes.value;
      currentSeed = attackRes.nextSeed;
      attackerStrength += attackRoll;

      // Determine defender
      targetSyndicateId = state.syndicateTurf?.[roomId];
      if (targetSyndicateId && targetSyndicateId !== syndicateId) {
        const defenderSyndicate = state.syndicates?.[targetSyndicateId];
        const defenderDominance = defenderSyndicate?.dominance ?? 50;
        defenderStrength = defenderDominance;

        if (existingLab && existingLab.syndicateId === targetSyndicateId) {
          defenderStrength += (existingLab.level * 10) + (existingLab.defense ?? 0);
        }

        const defenderGuards = state.turfGuards?.[roomId]?.count ?? 0;
        defenderStrength += defenderGuards * 10;
        
        const defenseRes = PureRand.nextInt(currentSeed, 1, 20);
        const defenseRoll = defenseRes.value;
        currentSeed = defenseRes.nextSeed;
        defenderStrength += defenseRoll;
      } else {
        // Neutral turf defense
        const neutralRes = PureRand.nextInt(currentSeed, 1, 20);
        defenderStrength = 30 + neutralRes.value;
        currentSeed = neutralRes.nextSeed;
      }

      // Battle resolution
      const syndicatesMap = { ...(newState.syndicates || {}) };
      const turfClaims = { ...(newState.syndicateTurfClaims || {}) };

      if (attackerStrength > defenderStrength) {
        battleOutcome = "attacker_won";
        
        // Attacker gains dominance
        const newAttackerDom = Math.min(150, (syndicate.dominance ?? 50) + 15);
        syndicatesMap[syndicateId] = {
          ...syndicate,
          dominance: newAttackerDom,
          timestamp,
        };

        // Defender loses dominance if any
        if (targetSyndicateId && targetSyndicateId !== syndicateId && state.syndicates?.[targetSyndicateId]) {
          const defSyndicate = state.syndicates[targetSyndicateId];
          const newDefDom = Math.max(0, (defSyndicate.dominance ?? 50) - 15);
          syndicatesMap[targetSyndicateId] = {
            ...defSyndicate,
            dominance: newDefDom,
            timestamp,
          };
        }

        // Claim turf
        turfClaims[roomId] = {
          roomId,
          syndicateId,
          timestamp,
          dominance: newAttackerDom,
        };

        newState.syndicates = syndicatesMap;
        newState.syndicateTurfClaims = turfClaims;
        newState.syndicateTurf = {
          ...(newState.syndicateTurf || {}),
          [roomId]: syndicateId,
        };

        // Add to journal and announce event
        newState.journal = [...(newState.journal || [])];
        newState.journal.push(`[Syndicate] Turf war in ${roomId} won by ${syndicateId} (Strength: ${attackerStrength} vs Defender Strength: ${defenderStrength})!`);

        customEvents.push({
          type: "turf_war_won",
          agentId,
          roomId,
          syndicateId,
          targetSyndicateId,
          attackerStrength,
          defenderStrength,
        });

      } else {
        battleOutcome = "defender_won";

        // Attacker loses dominance
        const newAttackerDom = Math.max(0, (syndicate.dominance ?? 50) - 10);
        syndicatesMap[syndicateId] = {
          ...syndicate,
          dominance: newAttackerDom,
          timestamp,
        };

        // Defender gains dominance if defender syndicate exists
        if (targetSyndicateId && targetSyndicateId !== syndicateId && state.syndicates?.[targetSyndicateId]) {
          const defSyndicate = state.syndicates[targetSyndicateId];
          const newDefDom = Math.min(150, (defSyndicate.dominance ?? 50) + 10);
          syndicatesMap[targetSyndicateId] = {
            ...defSyndicate,
            dominance: newDefDom,
            timestamp,
          };
        }

        newState.syndicates = syndicatesMap;

        // Add to journal and announce event
        newState.journal = [...(newState.journal || [])];
        newState.journal.push(`[Syndicate] Turf war in ${roomId} repelled by defender (Defender Strength: ${defenderStrength} vs Attacker Strength: ${attackerStrength})!`);

        customEvents.push({
          type: "turf_war_repelled",
          agentId,
          roomId,
          syndicateId,
          targetSyndicateId,
          attackerStrength,
          defenderStrength,
        });
      }

      // Also trigger a minor enforcement heat increase in the room due to the loud battle!
      const existingHeat = newState.enforcementHeat?.[roomId]?.heat ?? 0;
      const heatClaims = { ...(newState.enforcementHeat || {}) };
      heatClaims[roomId] = {
        roomId,
        heat: existingHeat + 15,
        timestamp,
      };
      newState.enforcementHeat = heatClaims;

      // Reconcile syndicate turf
      newState = reconcileSyndicateTurf(newState, pack);
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEMAND_PROTECTION action (AF-45)
  if ((action as any).type === "DEMAND_PROTECTION") {
    const { merchantId, syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    if (!("rooms" in pack) || !("npcs" in pack)) {
      rejectionReason = `Protection rackets are only supported in parser games.`;
    } else {
      const parserPack = pack as ParserPack;
      const syndicate = state.syndicates?.[syndicateId];
      const merchant = parserPack.npcs?.find((n: any) => n.id === merchantId);

      // Find where agent is currently located
      const agentCurrent = state.agents?.[agentId]?.current ?? state.current;

      if (!merchantId) {
        rejectionReason = `Merchant ID is required.`;
      } else if (!syndicateId) {
        rejectionReason = `Syndicate ID is required.`;
      } else if (!syndicate) {
        rejectionReason = `Syndicate ${syndicateId} does not exist.`;
      } else if (!syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
      } else if (!merchant) {
        rejectionReason = `Merchant NPC ${merchantId} does not exist.`;
      } else {
        // Check if merchant is in the same room as the agent
        const room = parserPack.rooms?.find((r: any) => r.id === agentCurrent);
        if (!room || !room.npcs?.includes(merchantId)) {
          rejectionReason = `Merchant ${merchantId} is not in room ${agentCurrent}.`;
        } else {
          const existingRacket = state.protectionRackets?.[merchantId];
          if (existingRacket && existingRacket.active && existingRacket.syndicateId === syndicateId) {
            rejectionReason = `Syndicate ${syndicateId} already has an active protection contract with merchant ${merchantId}.`;
          } else {
            ok = true;
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && "npcs" in pack) {
      const parserPack = pack as ParserPack;
      const merchant = parserPack.npcs?.find((n: any) => n.id === merchantId);
      if (merchant) {
        const syndicate = state.syndicates?.[syndicateId];
        const protectionRackets = { ...(state.protectionRackets || {}) };

        // Determine initial protection extortion fee
        // e.g. Extort 50 gold from the merchant. If the merchant has less, take what they have.
        const merchantGold = getMerchantGold(state, merchant);
        const extortedGold = Math.min(50, merchantGold);

        // Deduct from merchant's gold
        if (newState.merchantGold) {
          newState.merchantGold = {
            ...newState.merchantGold,
            [merchantId]: merchantGold - extortedGold,
          };
        } else {
          newState.merchantGold = { [merchantId]: merchantGold - extortedGold };
        }

        // Distribute extorted gold to syndicate members
        const members = syndicate?.members ?? [];
        const memberShare = members.length > 0 ? Math.floor(extortedGold / members.length) : 0;
        if (memberShare > 0) {
          newState.vars = { ...newState.vars };
          for (const member of members) {
            const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
            newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + memberShare;
          }
        }

        // Track total extortion telemetry
        newState.vars["totalExtortionGoldCollected"] = (newState.vars["totalExtortionGoldCollected"] ?? 0) + extortedGold;

        // Register / update the protection racket contract
        protectionRackets[merchantId] = {
          merchantId,
          syndicateId,
          cost: 15, // Recurring protection fee
          timestamp,
          active: true,
        };
        newState.protectionRackets = protectionRackets;

        newState.journal.push(`[Syndicate] Protection racket established with merchant ${merchantId} by ${agentId}. Extorted ${extortedGold} gold (Distributed ${memberShare} gold to each member).`);
        customEvents.push({
          type: "protection_established",
          agentId,
          merchantId,
          syndicateId,
          extortedGold,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BRIBE_SYNDICATE_ENFORCERS action (AF-46)
  if ((action as any).type === "BRIBE_SYNDICATE_ENFORCERS") {
    const { roomId, syndicateId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!roomId) {
      rejectionReason = `Room ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Bribe amount must be a positive integer.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to pay bribe of ${amount} (has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      // Lower regional enforcer heat
      const updatedHeat = { ...(newState.enforcementHeat || {}) };
      const oldHeat = updatedHeat[roomId]?.heat ?? 0;
      const heatReduction = Math.floor(amount / 5);
      updatedHeat[roomId] = {
        roomId,
        heat: Math.max(0, oldHeat - heatReduction),
        timestamp,
      };
      newState.enforcementHeat = updatedHeat;

      // Register bribe
      const syndicateBribes = { ...(state.syndicateBribes || {}) };
      syndicateBribes[roomId] = {
        roomId,
        syndicateId,
        amount,
        timestamp,
        active: true,
      };
      newState.syndicateBribes = syndicateBribes;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Paid ${amount} gold bribe to enforcers in ${roomId} by agent ${agentId} of syndicate ${syndicateId}.`);
      customEvents.push({
        type: "syndicate_bribe_paid",
        agentId,
        roomId,
        syndicateId,
        amount,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PURCHASE_DEFLECTION_POLICY action (AF-46)
  if ((action as any).type === "PURCHASE_DEFLECTION_POLICY") {
    const { roomId, syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cost = 100;

    if (!roomId) {
      rejectionReason = `Room ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!state.productionLabs?.[roomId]) {
      rejectionReason = `No contraband production lab exists in room ${roomId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to purchase deflection policy costing ${cost} (has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Register deflection policy
      const deflectionPolicies = { ...(state.deflectionPolicies || {}) };
      deflectionPolicies[roomId] = {
        roomId,
        syndicateId,
        cost,
        timestamp,
        active: true,
      };
      newState.deflectionPolicies = deflectionPolicies;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Purchased enforcer deflection policy in ${roomId} for ${cost} gold by agent ${agentId} of syndicate ${syndicateId}.`);
      customEvents.push({
        type: "deflection_policy_purchased",
        agentId,
        roomId,
        syndicateId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUY_SAFEHOUSE action (AF-48)
  if ((action as any).type === "BUY_SAFEHOUSE") {
    const { roomId, syndicateId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!roomId) {
      rejectionReason = `Room ID is required to buy a safehouse.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to buy a safehouse.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Safehouse cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.safehouses?.[roomId]) {
      rejectionReason = `A safehouse already exists in room ${roomId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to buy safehouse costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Register safehouse
      const safehouses = { ...(state.safehouses || {}) };
      safehouses[roomId] = {
        id: `safehouse_${roomId}`,
        roomId,
        ownerId: agentId,
        syndicateId,
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp,
      };
      newState.safehouses = safehouses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Purchased safehouse in ${roomId} for ${cost} gold by agent ${agentId} of syndicate ${syndicateId}.`);
      customEvents.push({
        type: "safehouse_purchased",
        agentId,
        roomId,
        syndicateId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_SAFEHOUSE action (AF-48)
  if ((action as any).type === "UPGRADE_SAFEHOUSE") {
    const { roomId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to upgrade safehouse.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Safehouse upgrade cost ${cost} must be a non-negative integer.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate || !syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of the syndicate ${safehouse.syndicateId} owning the safehouse in ${roomId}.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade safehouse (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Upgrade safehouse
      const safehouses = { ...(state.safehouses || {}) };
      const currentLevel = safehouse.level;
      safehouses[roomId] = {
        ...safehouse,
        level: currentLevel + 1,
        stashCapacity: safehouse.stashCapacity + 5,
        timestamp,
      };
      newState.safehouses = safehouses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Upgraded safehouse in ${roomId} to level ${currentLevel + 1} for ${cost} gold by agent ${agentId}.`);
      customEvents.push({
        type: "safehouse_upgraded",
        agentId,
        roomId,
        level: currentLevel + 1,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEPOSIT_STASH action (AF-48)
  if ((action as any).type === "DEPOSIT_STASH") {
    const { roomId, itemId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to deposit item.`;
    } else if (!itemId) {
      rejectionReason = `Item ID is required to deposit item.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate) {
        rejectionReason = `Syndicate ${safehouse.syndicateId} does not exist.`;
      } else {
        // Check if agent has item in inventory
        const agentInv = agentId === "player" ? state.inventory : state.agents?.[agentId]?.inventory ?? [];
        const dynamicCapacity = getSafehouseStorageCapacity(state, roomId);
        if (!agentInv.includes(itemId)) {
          rejectionReason = `Agent ${agentId} does not possess item ${itemId} to deposit.`;
        } else if (safehouse.stashItems.length >= dynamicCapacity) {
          rejectionReason = `Safehouse stash in ${roomId} is at capacity (${safehouse.stashItems.length}/${dynamicCapacity}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      // Remove from agent inventory and add to stash
      if (agentId === "player") {
        newState.inventory = newState.inventory.filter(item => item !== itemId);
      } else if (newState.agents?.[agentId]) {
        const agents = { ...newState.agents };
        agents[agentId] = {
          ...agents[agentId],
          inventory: agents[agentId].inventory.filter(item => item !== itemId),
        };
        newState.agents = agents;
      }

      // Add to stashItems
      const safehouses = { ...(state.safehouses || {}) };
      safehouses[roomId] = {
        ...safehouse,
        stashItems: [...safehouse.stashItems, itemId],
        timestamp,
      };
      newState.safehouses = safehouses;

      // Track item owner
      newState.stashItemOwners = {
        ...(newState.stashItemOwners || {}),
        [itemId]: agentId,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} deposited ${itemId} into safehouse stash in ${roomId}.`);
      customEvents.push({
        type: "stash_deposited",
        agentId,
        roomId,
        itemId,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized WITHDRAW_STASH action (AF-48)
  if ((action as any).type === "WITHDRAW_STASH") {
    const { roomId, itemId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to withdraw item.`;
    } else if (!itemId) {
      rejectionReason = `Item ID is required to withdraw item.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      const isMember = syndicate?.members.includes(agentId) ?? false;
      const itemOwner = state.stashItemOwners?.[itemId];
      if (!safehouse.stashItems.includes(itemId)) {
        rejectionReason = `Safehouse stash in ${roomId} does not contain item ${itemId}.`;
      } else if (!isMember && itemOwner !== agentId) {
        rejectionReason = `Agent ${agentId} is not a member of the syndicate owning the safehouse in ${roomId} and does not own item ${itemId}.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      // Remove from stashItems
      const safehouses = { ...(state.safehouses || {}) };
      safehouses[roomId] = {
        ...safehouse,
        stashItems: safehouse.stashItems.filter(item => item !== itemId),
        timestamp,
      };
      newState.safehouses = safehouses;

      // Add to agent inventory
      if (agentId === "player") {
        newState.inventory = [...newState.inventory, itemId];
      } else if (newState.agents?.[agentId]) {
        const agents = { ...newState.agents };
        agents[agentId] = {
          ...agents[agentId],
          inventory: [...agents[agentId].inventory, itemId],
        };
        newState.agents = agents;
      }

      // Remove from stashItemOwners
      if (newState.stashItemOwners) {
        const stashItemOwners = { ...newState.stashItemOwners };
        delete stashItemOwners[itemId];
        newState.stashItemOwners = stashItemOwners;
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} withdrew ${itemId} from safehouse stash in ${roomId}.`);
      customEvents.push({
        type: "stash_withdrawn",
        agentId,
        roomId,
        itemId,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUY_FRONT_BUSINESS action (AF-50)
  if ((action as any).type === "BUY_FRONT_BUSINESS") {
    const { merchantId, syndicateId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const p = pack as any;
    const merchantRoom = p.rooms?.find((r: any) => r.npcs?.includes(merchantId));
    const npcExists = p.npcs?.some((n: any) => n.id === merchantId);


    if (!merchantId) {
      rejectionReason = `Merchant ID is required to buy a front business.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to buy a front business.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Front business cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!npcExists) {
      rejectionReason = `Merchant ${merchantId} does not exist in content pack.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.frontBusinesses?.[merchantId]) {
      rejectionReason = `Merchant ${merchantId} is already owned as a front business.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to buy front business costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Register front business
      const frontBusinesses = { ...(state.frontBusinesses || {}) };
      frontBusinesses[merchantId] = {
        id: `front_${merchantId}`,
        merchantId,
        roomId: merchantRoom ? merchantRoom.id : state.current,
        syndicateId,
        level: 1,
        dirtyGold: 0,
        cleanGold: 0,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp,
      };
      newState.frontBusinesses = frontBusinesses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Purchased front business for merchant ${merchantId} in room ${merchantRoom ? merchantRoom.id : state.current} for ${cost} gold by agent ${agentId} of syndicate ${syndicateId}.`);
      customEvents.push({
        type: "front_business_purchased",
        agentId,
        merchantId,
        roomId: merchantRoom ? merchantRoom.id : state.current,
        syndicateId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNDER_GOLD action (AF-50)
  if ((action as any).type === "LAUNDER_GOLD") {
    const { merchantId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const front = state.frontBusinesses?.[merchantId];

    if (!merchantId) {
      rejectionReason = `Merchant ID is required to launder gold.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Laundering amount ${amount} must be a positive integer.`;
    } else if (!front) {
      rejectionReason = `No front business exists for merchant ${merchantId}.`;
    } else {
      const syndicate = state.syndicates?.[front.syndicateId];
      if (!syndicate) {
        rejectionReason = `Owner syndicate ${front.syndicateId} does not exist.`;
      } else if (!syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${front.syndicateId} owning the front business.`;
      } else if (front.dirtyGold + amount > front.launderingCapacity) {
        rejectionReason = `Cannot launder gold: amount ${amount} would exceed laundering capacity (${front.dirtyGold}/${front.launderingCapacity}).`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < amount) {
          rejectionReason = `Insufficient gold to launder (requires ${amount}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && front) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold from agent
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      // Add to front business dirty gold
      const frontBusinesses = { ...(state.frontBusinesses || {}) };
      frontBusinesses[merchantId] = {
        ...front,
        dirtyGold: front.dirtyGold + amount,
        timestamp,
      };
      newState.frontBusinesses = frontBusinesses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} deposited ${amount} gold for laundering at front business ${front.id}.`);
      customEvents.push({
        type: "gold_deposited_for_laundering",
        agentId,
        merchantId,
        amount,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_FRONT_BUSINESS action (AF-51)
  if ((action as any).type === "UPGRADE_FRONT_BUSINESS") {
    const { merchantId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const front = state.frontBusinesses?.[merchantId];

    if (!merchantId) {
      rejectionReason = `Merchant ID is required to upgrade a front business.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Upgrade cost ${cost} must be a non-negative integer.`;
    } else if (!front) {
      rejectionReason = `No front business exists for merchant ${merchantId}.`;
    } else {
      const syndicate = state.syndicates?.[front.syndicateId];
      if (!syndicate) {
        rejectionReason = `Owner syndicate ${front.syndicateId} does not exist.`;
      } else if (!syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${front.syndicateId} owning the front business.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade front business costing ${cost} (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && front) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const newLevel = front.level + 1;
      const frontBusinesses = { ...(state.frontBusinesses || {}) };
      frontBusinesses[merchantId] = {
        ...front,
        level: newLevel,
        launderingCapacity: front.launderingCapacity + 500,
        launderingRate: front.launderingRate + 50,
        timestamp,
      };
      newState.frontBusinesses = frontBusinesses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Upgraded front business for merchant ${merchantId} to level ${newLevel} for ${cost} gold by agent ${agentId}.`);
      customEvents.push({
        type: "front_business_upgraded",
        agentId,
        merchantId,
        level: newLevel,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized HIRE_TURF_GUARD action (AF-52, AF-70)
  if ((action as any).type === "HIRE_TURF_GUARD") {
    const { roomId, syndicateId, cost, timestamp, useWarChest } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    const agentSyndicates = Object.values(state.syndicates || {}).filter(s => s.members.includes(agentId));
    const isMemberOrAllied = syndicate && (
      syndicate.members.includes(agentId) ||
      agentSyndicates.some(s =>
        state.syndicateAlliances?.[s.id]?.[syndicateId] === "allied" ||
        state.syndicateAlliances?.[syndicateId]?.[s.id] === "allied"
      )
    );

    const controllingSyndId = state.syndicateTurf?.[roomId];
    const hasControlOrAlliedControl = controllingSyndId === syndicateId || (
      controllingSyndId && (
        state.syndicateAlliances?.[controllingSyndId]?.[syndicateId] === "allied" ||
        state.syndicateAlliances?.[syndicateId]?.[controllingSyndId] === "allied"
      )
    );

    if (!roomId) {
      rejectionReason = `Room ID is required to hire a turf guard.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to hire a turf guard.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Guard cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!isMemberOrAllied) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} or any allied syndicate.`;
    } else if (!hasControlOrAlliedControl) {
      rejectionReason = `Syndicate ${syndicateId} or its allies does not control the turf in room ${roomId}.`;
    } else {
      if (useWarChest) {
        const warChestGold = syndicate.warChest ?? 0;
        if (warChestGold < cost) {
          rejectionReason = `Insufficient gold in syndicate war chest to hire turf guard costing ${cost} (requires ${cost}, has ${warChestGold}).`;
        } else {
          ok = true;
        }
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to hire turf guard costing ${cost} (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      if (useWarChest) {
        const updatedSyndicate = {
          ...syndicate,
          warChest: (syndicate.warChest ?? 0) - cost,
        };
        newState.syndicates = {
          ...(newState.syndicates || {}),
          [syndicateId]: updatedSyndicate,
        };
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

        // Deduct gold
        newState.vars = {
          ...newState.vars,
          [goldKey]: currentGold - cost,
        };
      }

      const turfGuards = { ...(state.turfGuards || {}) };
      const existingGuard = turfGuards[roomId];
      const newCount = (existingGuard?.count ?? 0) + 1;

      turfGuards[roomId] = {
        roomId,
        syndicateId,
        count: newCount,
        cost: (existingGuard?.cost ?? 0) + cost,
        timestamp,
      };
      newState.turfGuards = turfGuards;

      if (!newState.journal) newState.journal = [];
      const paymentSource = useWarChest ? "syndicate war chest" : "personal gold";
      newState.journal.push(`[Syndicate] Hired turf guard for syndicate ${syndicateId} in room ${roomId} (Count: ${newCount}) for ${cost} gold using ${paymentSource} by agent ${agentId}.`);

      customEvents.push({
        type: "turf_guard_hired",
        agentId,
        roomId,
        syndicateId,
        count: newCount,
        cost,
        useWarChest,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_CHECKPOINT action (AF-54)
  if ((action as any).type === "ESTABLISH_CHECKPOINT") {
    const { roomId, syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    if (!roomId) {
      rejectionReason = `Room ID is required to establish a checkpoint.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish a checkpoint.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.syndicateTurf?.[roomId] !== syndicateId) {
      rejectionReason = `Syndicate ${syndicateId} does not control the turf in room ${roomId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const turfCheckpoints = { ...(state.turfCheckpoints || {}) };
      
      turfCheckpoints[roomId] = {
        roomId,
        syndicateId,
        active: true,
        timestamp,
      };
      newState.turfCheckpoints = turfCheckpoints;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Established turf contraband checkpoint for syndicate ${syndicateId} in room ${roomId} by agent ${agentId}.`);

      customEvents.push({
        type: "turf_checkpoint_established",
        agentId,
        roomId,
        syndicateId,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_OUTPOST action (AF-56)
  if ((action as any).type === "ESTABLISH_OUTPOST") {
    const { roomId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 100;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    if (!roomId) {
      rejectionReason = `Room ID is required to establish an outpost.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish an outpost.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Outpost cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.syndicateTurf?.[roomId] !== syndicateId) {
      rejectionReason = `Syndicate ${syndicateId} does not control the turf in room ${roomId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to establish outpost costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const turfGuardOutposts = { ...(state.turfGuardOutposts || {}) };
      const existingOutpost = turfGuardOutposts[roomId];
      const newLevel = existingOutpost ? existingOutpost.securityLevel + 1 : 1;

      turfGuardOutposts[roomId] = {
        roomId,
        syndicateId,
        securityLevel: newLevel,
        timestamp,
        turrets: existingOutpost ? existingOutpost.turrets : undefined,
      };
      newState.turfGuardOutposts = turfGuardOutposts;

      if (!newState.journal) newState.journal = [];
      if (existingOutpost) {
        newState.journal.push(`[Syndicate] Upgraded turf guard defense outpost in room ${roomId} to security level ${newLevel} for ${cost} gold by agent ${agentId}.`);
      } else {
        newState.journal.push(`[Syndicate] Established turf guard defense outpost in room ${roomId} at security level 1 for ${cost} gold by agent ${agentId}.`);
      }

      customEvents.push({
        type: "turf_outpost_established",
        agentId,
        roomId,
        syndicateId,
        securityLevel: newLevel,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CONSTRUCT_TURRET action (AF-57)
  if ((action as any).type === "CONSTRUCT_TURRET") {
    const { roomId, syndicateId, turretId, turretType, timestamp } = action as any;
    const defaultCost = turretType === "heavy_armored" ? 150 : (turretType === "tactical_defense" ? 200 : 100);
    const cost = (action as any).cost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];
    const outpost = state.turfGuardOutposts?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to construct a turret.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to construct a turret.`;
    } else if (!turretId) {
      rejectionReason = `Turret ID is required to construct a turret.`;
    } else if (!turretType) {
      rejectionReason = `Turret type is required to construct a turret.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Turret construction cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.syndicateTurf?.[roomId] !== syndicateId) {
      rejectionReason = `Syndicate ${syndicateId} does not control the turf in room ${roomId}.`;
    } else if (!outpost) {
      rejectionReason = `Room ${roomId} does not have an established turf guard outpost.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to construct turret costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate && outpost) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const turfGuardOutposts = { ...(state.turfGuardOutposts || {}) };
      const outpostEntry = { ...turfGuardOutposts[roomId] };
      const turrets = { ...(outpostEntry.turrets || {}) };

      const firepower = turretType === "heavy_armored" ? 20 : (turretType === "tactical_defense" ? 50 : 10);
      const armor = turretType === "heavy_armored" ? 40 : (turretType === "tactical_defense" ? 10 : 5);
      const premiumRate = turretType === "heavy_armored" ? 0.1 : (turretType === "tactical_defense" ? 0.2 : 0.05);

      turrets[turretId] = {
        id: turretId,
        type: turretType,
        firepower,
        armor,
        premiumRate,
        timestamp,
      };
      outpostEntry.turrets = turrets;
      turfGuardOutposts[roomId] = outpostEntry;
      newState.turfGuardOutposts = turfGuardOutposts;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Constructed ${turretType} turret ${turretId} in room ${roomId} outpost for ${cost} gold by agent ${agentId}.`);

      customEvents.push({
        type: "turf_turret_constructed",
        agentId,
        roomId,
        syndicateId,
        turretId,
        turretType,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ORGANIZE_CONVOY action (AF-58)
  if ((action as any).type === "ORGANIZE_CONVOY") {
    const { convoyId, syndicateId, routeId, cargo, timestamp } = action as any;
    const defaultCost = 100;
    const cost = (action as any).goldCost ?? (action as any).cost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const route = state.tradeRoutes?.[routeId];

    if (!convoyId) {
      rejectionReason = `Convoy ID is required to organize a convoy.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to organize a convoy.`;
    } else if (!routeId) {
      rejectionReason = `Route ID is required to organize a convoy.`;
    } else if (cargo <= 0 || !Number.isInteger(cargo)) {
      rejectionReason = `Convoy cargo amount ${cargo} must be a positive integer.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Convoy organization cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!route || !route.rooms || route.rooms.length === 0) {
      rejectionReason = `Trade route ${routeId} does not exist or has no rooms.`;
    } else if (state.smugglingConvoys?.[convoyId]) {
      rejectionReason = `Smuggling convoy ${convoyId} already exists.`;
    } else if (Object.values(state.smugglingConvoys || {}).filter(c => c.syndicateId === syndicateId && c.status === "en_route").length >= 1 && !syndicate.ringleader) {
      rejectionReason = `Syndicate ${syndicateId} can only run multiple active convoys if a smuggling ringleader has been appointed.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      
      // Calculate contraband count in agent's inventory
      const inventory = agentId === "player" ? state.inventory : (state.agents?.[agentId]?.inventory || []);
      const contrabandItems: string[] = [];
      const packAny = pack as any;
      if (packAny && packAny.objects && inventory) {
        for (const itemId of inventory) {
          const packObj = packAny.objects.find((o: any) => o.id === itemId);
          const isPackContraband = packObj?.contraband === true;
          const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
          if (isPackContraband || isBlacklisted) {
            contrabandItems.push(itemId);
          }
        }
      }

      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to organize convoy costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else if (contrabandItems.length < cargo) {
        rejectionReason = `Insufficient cargo resources to organize convoy (requires ${cargo}, has ${contrabandItems.length}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate && route) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Deduct cargo from inventory
      const inventory = agentId === "player" ? state.inventory : (state.agents?.[agentId]?.inventory || []);
      let remainingToDeduct = cargo;
      const newInventory: string[] = [];
      const packAny = pack as any;
      if (packAny && packAny.objects) {
        for (const itemId of inventory) {
          const packObj = packAny.objects.find((o: any) => o.id === itemId);
          const isPackContraband = packObj?.contraband === true;
          const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
          if ((isPackContraband || isBlacklisted) && remainingToDeduct > 0) {
            remainingToDeduct--;
          } else {
            newInventory.push(itemId);
          }
        }
      }

      if (agentId === "player") {
        newState.inventory = newInventory;
      } else {
        const agents = newState.agents ? { ...newState.agents } : {};
        if (agents[agentId]) {
          agents[agentId] = {
            ...agents[agentId],
            inventory: newInventory,
          };
          newState.agents = agents;
        }
      }

      // Add to convoys list
      const smugglingConvoys = { ...(state.smugglingConvoys || {}) };
      smugglingConvoys[convoyId] = {
        id: convoyId,
        syndicateId,
        routeId,
        currentRoomIndex: 0,
        cargo,
        goldCost: cost,
        status: "en_route",
        definedBy: agentId,
        timestamp,
      };
      newState.smugglingConvoys = smugglingConvoys;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Organized smuggling convoy ${convoyId} for syndicate ${syndicateId} along route ${routeId} carrying ${cargo} cargo for ${cost} gold.`);

      customEvents.push({
        type: "smuggling_convoy_organized",
        agentId,
        convoyId,
        syndicateId,
        routeId,
        cargo,
        goldCost: cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUILD_DREADNOUGHT_CONVOY action (AF-80)
  if ((action as any).type === "BUILD_DREADNOUGHT_CONVOY") {
    const { convoyId, syndicateId, routeId, cargo, timestamp } = action as any;
    const defaultCost = 250;
    const cost = (action as any).goldCost ?? (action as any).cost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const route = state.tradeRoutes?.[routeId];

    if (!convoyId) {
      rejectionReason = `Convoy ID is required to build a dreadnought convoy.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to build a dreadnought convoy.`;
    } else if (!routeId) {
      rejectionReason = `Route ID is required to build a dreadnought convoy.`;
    } else if (cargo <= 0 || !Number.isInteger(cargo)) {
      rejectionReason = `Convoy cargo amount ${cargo} must be a positive integer.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Convoy build cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!route || !route.rooms || route.rooms.length === 0) {
      rejectionReason = `Trade route ${routeId} does not exist or has no rooms.`;
    } else if (state.smugglingConvoys?.[convoyId]) {
      rejectionReason = `Smuggling convoy ${convoyId} already exists.`;
    } else if (Object.values(state.smugglingConvoys || {}).filter(c => c.syndicateId === syndicateId && c.status === "en_route").length >= 1 && !syndicate.ringleader) {
      rejectionReason = `Syndicate ${syndicateId} can only run multiple active convoys if a smuggling ringleader has been appointed.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      
      // Calculate contraband count in agent's inventory
      const inventory = agentId === "player" ? state.inventory : (state.agents?.[agentId]?.inventory || []);
      const contrabandItems: string[] = [];
      const packAny = pack as any;
      if (packAny && packAny.objects && inventory) {
        for (const itemId of inventory) {
          const packObj = packAny.objects.find((o: any) => o.id === itemId);
          const isPackContraband = packObj?.contraband === true;
          const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
          if (isPackContraband || isBlacklisted) {
            contrabandItems.push(itemId);
          }
        }
      }

      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to build dreadnought convoy costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else if (contrabandItems.length < cargo) {
        rejectionReason = `Insufficient cargo resources to build dreadnought convoy (requires ${cargo}, has ${contrabandItems.length}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate && route) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Deduct cargo from inventory
      const inventory = agentId === "player" ? state.inventory : (state.agents?.[agentId]?.inventory || []);
      let remainingToDeduct = cargo;
      const newInventory: string[] = [];
      const packAny = pack as any;
      if (packAny && packAny.objects) {
        for (const itemId of inventory) {
          const packObj = packAny.objects.find((o: any) => o.id === itemId);
          const isPackContraband = packObj?.contraband === true;
          const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
          if ((isPackContraband || isBlacklisted) && remainingToDeduct > 0) {
            remainingToDeduct--;
          } else {
            newInventory.push(itemId);
          }
        }
      }

      if (agentId === "player") {
        newState.inventory = newInventory;
      } else {
        const agents = newState.agents ? { ...newState.agents } : {};
        if (agents[agentId]) {
          agents[agentId] = {
            ...agents[agentId],
            inventory: newInventory,
          };
          newState.agents = agents;
        }
      }

      // Add to convoys list
      const smugglingConvoys = { ...(state.smugglingConvoys || {}) };
      smugglingConvoys[convoyId] = {
        id: convoyId,
        syndicateId,
        routeId,
        currentRoomIndex: 0,
        cargo,
        goldCost: cost,
        status: "en_route",
        definedBy: agentId,
        timestamp,
        isDreadnought: true,
      };
      newState.smugglingConvoys = smugglingConvoys;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Built dreadnought convoy ${convoyId} for syndicate ${syndicateId} along route ${routeId} carrying ${cargo} cargo for ${cost} gold.`);

      customEvents.push({
        type: "smuggling_convoy_organized",
        agentId,
        convoyId,
        syndicateId,
        routeId,
        cargo,
        goldCost: cost,
        isDreadnought: true,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_TREATY_INFILTRATOR action (AF-80)
  if ((action as any).type === "ESTABLISH_TREATY_INFILTRATOR") {
    const { infiltratorId, syndicateId, roomId, timestamp } = action as any;
    const defaultCost = 150;
    const cost = (action as any).cost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    if (!infiltratorId) {
      rejectionReason = `Infiltrator ID is required to establish a treaty infiltrator.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish a treaty infiltrator.`;
    } else if (!roomId) {
      rejectionReason = `Room ID is required to establish a treaty infiltrator.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Infiltrator cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.treatyInfiltrators?.[infiltratorId]) {
      rejectionReason = `Treaty infiltrator ${infiltratorId} already exists.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to establish treaty infiltrator costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const treatyInfiltrators = { ...(state.treatyInfiltrators || {}) };
      treatyInfiltrators[infiltratorId] = {
        id: infiltratorId,
        syndicateId,
        roomId,
        timestamp,
      };
      newState.treatyInfiltrators = treatyInfiltrators;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Established treaty infiltrator ${infiltratorId} for syndicate ${syndicateId} in room ${roomId}.`);

      customEvents.push({
        type: "treaty_infiltrator_established",
        infiltratorId,
        syndicateId,
        roomId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_TARIFF_EXEMPTION action (AF-80)
  if ((action as any).type === "VOTE_TARIFF_EXEMPTION") {
    const { factionId, syndicateId, timestamp } = action as any;
    const voteVal = (action as any).vote ?? true;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!factionId) {
      rejectionReason = `Faction ID is required to vote on tariff exemption.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to vote on tariff exemption.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const tariffExemptionVotes = { ...(state.tariffExemptionVotes || {}) };
      if (!tariffExemptionVotes[factionId]) {
        tariffExemptionVotes[factionId] = {};
      } else {
        tariffExemptionVotes[factionId] = { ...tariffExemptionVotes[factionId] };
      }
      if (!tariffExemptionVotes[factionId][syndicateId]) {
        tariffExemptionVotes[factionId][syndicateId] = {};
      } else {
        tariffExemptionVotes[factionId][syndicateId] = { ...tariffExemptionVotes[factionId][syndicateId] };
      }

      const existingVote = tariffExemptionVotes[factionId][syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        tariffExemptionVotes[factionId][syndicateId][agentId] = {
          vote: voteVal,
          timestamp,
        };
        newState.tariffExemptionVotes = tariffExemptionVotes;
        newState = reconcileTariffExemptions(newState, pack);

        const isExempt = newState.tariffExemptionPolicies?.[factionId]?.[syndicateId] === true;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate] Agent ${agentId} voted ${voteVal ? "YES" : "NO"} for tariff exemption in faction ${factionId} (Syndicate ${syndicateId}). Approved status: ${isExempt}.`);

        customEvents.push({
          type: "tariff_exemption_voted",
          agentId,
          syndicateId,
          factionId,
          vote: voteVal,
          isApproved: isExempt,
        });
      } else {
        ok = true;
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PURCHASE_CONVOY_INSURANCE action (AF-59)
  if ((action as any).type === "PURCHASE_CONVOY_INSURANCE") {
    const { convoyId, syndicateId, timestamp } = action as any;
    const expectedPremium = calculateConvoyInsurancePremium(state, convoyId);
    const cost = (action as any).cost ?? (action as any).goldCost ?? expectedPremium;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const convoy = state.smugglingConvoys?.[convoyId];

    if (!convoyId) {
      rejectionReason = `Convoy ID is required to purchase insurance.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to purchase insurance.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Convoy insurance cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!convoy) {
      rejectionReason = `Smuggling convoy ${convoyId} does not exist.`;
    } else if (convoy.syndicateId !== syndicateId) {
      rejectionReason = `Convoy ${convoyId} does not belong to syndicate ${syndicateId}.`;
    } else if (convoy.status !== "en_route") {
      rejectionReason = `Convoy ${convoyId} is not en_route (current status: ${convoy.status}).`;
    } else if (state.convoyInsurance?.[convoyId]?.active) {
      rejectionReason = `Smuggling convoy ${convoyId} already has an active insurance policy.`;
    } else if (cost < expectedPremium) {
      rejectionReason = `Insufficient insurance premium paid. Required at least ${expectedPremium}, got ${cost}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to purchase convoy insurance costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }


    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && convoy) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Coverage amount is dynamically set to cargo * 150 (lost value compensation)
      const coverageAmount = convoy.cargo * 150;

      // Add to convoyInsurance list
      const convoyInsurance = { ...(state.convoyInsurance || {}) };
      convoyInsurance[convoyId] = {
        convoyId,
        syndicateId,
        cost,
        coverageAmount,
        active: true,
        definedBy: agentId,
        timestamp,
      };
      newState.convoyInsurance = convoyInsurance;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Purchased convoy insurance for ${convoyId} costing ${cost} gold (coverage: ${coverageAmount} gold).`);

      customEvents.push({
        type: "smuggling_convoy_insurance_purchased",
        agentId,
        convoyId,
        syndicateId,
        cost,
        coverageAmount,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_BACKGROUND_CHECK action (AF-62)
  if ((action as any).type === "LAUNCH_BACKGROUND_CHECK") {
    const { syndicateId, targetAgentId, timestamp } = action as any;
    const cost = (action as any).cost ?? (action as any).goldCost ?? 50;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a background check.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target Agent ID is required to launch a background check.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Background check cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to launch background check costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Perform background check
      newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
      
      // Find if targetAgentId is an active undercover agent or match by name/id
      let foundAgent: any = undefined;
      for (const agent of Object.values(newState.undercoverAgents)) {
        if (agent.syndicateId === syndicateId && agent.status === "active") {
          if (agent.id === targetAgentId || agent.name === targetAgentId) {
            foundAgent = agent;
            break;
          }
        }
      }

      if (!newState.journal) newState.journal = [];

      if (foundAgent) {
        // Expose them!
        const updatedAgent = {
          ...foundAgent,
          status: "exposed" as const,
          timestamp,
        };
        newState.undercoverAgents[foundAgent.id] = updatedAgent;
        
        newState.journal.push(
          `[Syndicate] Background check on ${targetAgentId} by agent ${agentId} succeeded! Identified as undercover agent ${foundAgent.name}!`
        );
        customEvents.push({
          type: "undercover_agent_exposed",
          agentId,
          syndicateId,
          targetAgentId: foundAgent.id,
          name: foundAgent.name,
        });
      } else {
        newState.journal.push(
          `[Syndicate] Background check on ${targetAgentId} by agent ${agentId} concluded they are clean.`
        );
        customEvents.push({
          type: "background_check_clean",
          agentId,
          syndicateId,
          targetAgentId,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized EXPOSE_MOLE action (AF-62)
  if ((action as any).type === "EXPOSE_MOLE") {
    const { syndicateId, targetAgentId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    let targetAgent: any = undefined;
    if (state.undercoverAgents) {
      for (const agent of Object.values(state.undercoverAgents)) {
        if (agent.syndicateId === syndicateId) {
          if (agent.id === targetAgentId || agent.name === targetAgentId) {
            targetAgent = agent;
            break;
          }
        }
      }
    }

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to expose a mole.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target Agent ID is required to expose a mole.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!targetAgent) {
      rejectionReason = `Mole ${targetAgentId} does not exist in syndicate ${syndicateId}.`;
    } else if (targetAgent.status !== "exposed") {
      rejectionReason = `Mole ${targetAgent.name} has not been exposed yet. Launch a background check first!`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && targetAgent) {
      newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
      
      // Root out!
      const agentToUpdate = newState.undercoverAgents[targetAgent.id];
      if (agentToUpdate) {
        newState.undercoverAgents[targetAgent.id] = {
          ...agentToUpdate,
          status: "rooted_out" as const,
          timestamp,
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate] Exposed mole ${targetAgent.name} has been rooted out of syndicate ${syndicateId} by agent ${agentId}!`
      );

      customEvents.push({
        type: "mole_rooted_out",
        agentId,
        syndicateId,
        targetAgentId: targetAgent.id,
        name: targetAgent.name,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BRIBE_ENFORCER action (AF-63)
  if ((action as any).type === "BRIBE_ENFORCER") {
    const { enforcerId, syndicateId, timestamp } = action as any;
    const goldCost = (action as any).goldCost ?? 100;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const enforcer = state.enforcers?.[enforcerId];

    if (!enforcerId) {
      rejectionReason = `Enforcer ID is required to bribe an enforcer.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to bribe an enforcer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!enforcer) {
      rejectionReason = `Enforcer ${enforcerId} does not exist.`;
    } else if (enforcer.status !== "defeated") {
      rejectionReason = `Enforcer ${enforcer.name} is not defeated. Bribing requires a defeated enforcer.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < goldCost) {
        rejectionReason = `Insufficient gold to bribe enforcer (requires ${goldCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && enforcer) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - goldCost,
      };

      // Add to informants
      newState.informants = newState.informants ? { ...newState.informants } : {};
      newState.informants[enforcerId] = {
        id: enforcerId,
        name: enforcer.name,
        syndicateId,
        status: "active" as const,
        bribeCost: goldCost,
        timestamp,
      };

      if (newState.enforcers) {
        newState.enforcers = {
          ...newState.enforcers,
          [enforcerId]: {
            ...enforcer,
            status: "defeated" as const,
            timestamp,
          }
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate] Enforcer ${enforcer.name} was bribed by agent ${agentId} to become an active informant for syndicate ${syndicateId}.`
      );

      customEvents.push({
        type: "enforcer_bribed",
        agentId,
        syndicateId,
        enforcerId,
        name: enforcer.name,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized INTERROGATE_ENFORCER action (AF-63)
  if ((action as any).type === "INTERROGATE_ENFORCER") {
    const { enforcerId, syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const enforcer = state.enforcers?.[enforcerId];

    if (!enforcerId) {
      rejectionReason = `Enforcer ID is required to interrogate an enforcer.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to interrogate an enforcer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!enforcer) {
      rejectionReason = `Enforcer ${enforcerId} does not exist.`;
    } else if (enforcer.status !== "defeated") {
      rejectionReason = `Enforcer ${enforcer.name} is not defeated. Interrogation requires a defeated enforcer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && enforcer) {
      // Add to informants with status compromised
      newState.informants = newState.informants ? { ...newState.informants } : {};
      newState.informants[enforcerId] = {
        id: enforcerId,
        name: enforcer.name,
        syndicateId,
        status: "compromised" as const,
        timestamp,
      };

      // Pick a room with safehouse or production lab owned by this syndicate to warn about
      let warnedRoom = state.current;
      if (newState.safehouses) {
        const sh = Object.values(newState.safehouses).find(s => s.syndicateId === syndicateId);
        if (sh) warnedRoom = sh.roomId;
      }
      if (warnedRoom === state.current && newState.productionLabs) {
        const lab = Object.values(newState.productionLabs).find(l => l.syndicateId === syndicateId);
        if (lab) warnedRoom = lab.roomId;
      }

      // Schedule pre-emptive warning for step + 5
      const scheduledStep = newState.step + 5;
      const warningId = `warning_${enforcerId}_${warnedRoom}_${scheduledStep}`;
      
      newState.raidWarnings = newState.raidWarnings ? { ...newState.raidWarnings } : {};
      newState.raidWarnings[warningId] = {
        roomId: warnedRoom,
        syndicateId,
        scheduledStep,
        active: true,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate] Enforcer ${enforcer.name} was interrogated by agent ${agentId} and recruited as an informant, leaking a pre-emptive raid warning for room ${warnedRoom} at step ${scheduledStep}!`
      );

      customEvents.push({
        type: "enforcer_interrogated",
        agentId,
        syndicateId,
        enforcerId,
        name: enforcer.name,
        warnedRoom,
        scheduledStep,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized RECRUIT_ENFORCER action (AF-63)
  if ((action as any).type === "RECRUIT_ENFORCER") {
    const { enforcerId, syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const enforcer = state.enforcers?.[enforcerId];
    const dominance = syndicate?.dominance ?? 50;

    if (!enforcerId) {
      rejectionReason = `Enforcer ID is required to recruit an enforcer.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to recruit an enforcer.`;
    } else if (!syndicate) {
      rejectionReason = `Shadow Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!enforcer) {
      rejectionReason = `Enforcer ${enforcerId} does not exist.`;
    } else if (enforcer.status !== "defeated") {
      rejectionReason = `Enforcer ${enforcer.name} is not defeated. Recruitment requires a defeated enforcer.`;
    } else if (dominance < 50) {
      rejectionReason = `Recruiting a defeated enforcer requires syndicate dominance of at least 50 (current dominance is ${dominance}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && enforcer) {
      // Add to informants with status exposed
      newState.informants = newState.informants ? { ...newState.informants } : {};
      newState.informants[enforcerId] = {
        id: enforcerId,
        name: enforcer.name,
        syndicateId,
        status: "exposed" as const,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate] Enforcer ${enforcer.name} was recruited by agent ${agentId} as an informant for syndicate ${syndicateId} using syndicate dominance.`
      );

      customEvents.push({
        type: "enforcer_recruited",
        agentId,
        syndicateId,
        enforcerId,
        name: enforcer.name,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ADJUST_TURF_TAX action (AF-53)
  if ((action as any).type === "ADJUST_TURF_TAX") {
    const { syndicateId, rate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to adjust turf tax.`;
    } else if (rate < 0 || !Number.isInteger(rate)) {
      rejectionReason = `Proposed turf tax rate ${rate} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const syndicateTaxVotes = { ...(state.syndicateTaxVotes || {}) };
      if (!syndicateTaxVotes[syndicateId]) {
        syndicateTaxVotes[syndicateId] = {};
      } else {
        syndicateTaxVotes[syndicateId] = { ...syndicateTaxVotes[syndicateId] };
      }

      const existingVote = syndicateTaxVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        syndicateTaxVotes[syndicateId][agentId] = {
          rate,
          timestamp,
        };
        newState.syndicateTaxVotes = syndicateTaxVotes;
        newState = reconcileSyndicateTaxes(newState, pack);

        const newConsensusRate = newState.syndicates?.[syndicateId]?.turfTaxRate ?? 0;
        newState.journal.push(`[Syndicate] Agent ${agentId} voted for turf tax rate ${rate} in syndicate ${syndicateId} (New consensus rate: ${newConsensusRate}).`);

        customEvents.push({
          type: "turf_tax_adjusted",
          agentId,
          syndicateId,
          rate,
          consensusRate: newConsensusRate,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }


  // Handle decentralized ADJUST_TURF_BRIBE action (AF-54)
  if ((action as any).type === "ADJUST_TURF_BRIBE") {
    const { syndicateId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to adjust turf bribe.`;
    } else if (amount < 0 || !Number.isInteger(amount)) {
      rejectionReason = `Proposed turf bribe amount ${amount} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const syndicateBribeVotes = { ...(state.syndicateBribeVotes || {}) };
      if (!syndicateBribeVotes[syndicateId]) {
        syndicateBribeVotes[syndicateId] = {};
      } else {
        syndicateBribeVotes[syndicateId] = { ...syndicateBribeVotes[syndicateId] };
      }

      const existingVote = syndicateBribeVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        syndicateBribeVotes[syndicateId][agentId] = {
          amount,
          timestamp,
        };
        newState.syndicateBribeVotes = syndicateBribeVotes;
        newState = reconcileSyndicateBribes(newState, pack);

        const newConsensusAmount = newState.syndicates?.[syndicateId]?.turfBribeCost ?? 0;
        newState.journal.push(`[Syndicate] Agent ${agentId} voted for turf bribe amount ${amount} in syndicate ${syndicateId} (New consensus amount: ${newConsensusAmount}).`);

        customEvents.push({
          type: "turf_bribe_adjusted",
          agentId,
          syndicateId,
          amount,
          consensusAmount: newConsensusAmount,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }


  // Handle decentralized ADJUST_TURF_WAIVER action (AF-55)
  if ((action as any).type === "ADJUST_TURF_WAIVER") {
    const { syndicateId, threshold, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to adjust turf waiver threshold.`;
    } else if (!Number.isInteger(threshold)) {
      rejectionReason = `Proposed turf waiver threshold ${threshold} must be an integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const syndicateWaiverVotes = { ...(state.syndicateWaiverVotes || {}) };
      if (!syndicateWaiverVotes[syndicateId]) {
        syndicateWaiverVotes[syndicateId] = {};
      } else {
        syndicateWaiverVotes[syndicateId] = { ...syndicateWaiverVotes[syndicateId] };
      }

      const existingVote = syndicateWaiverVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        syndicateWaiverVotes[syndicateId][agentId] = {
          threshold,
          timestamp,
        };
        newState.syndicateWaiverVotes = syndicateWaiverVotes;
        newState = reconcileSyndicateWaivers(newState, pack);

        const newConsensusThreshold = newState.syndicates?.[syndicateId]?.turfWaiverThreshold ?? 50;
        newState.journal.push(`[Syndicate] Agent ${agentId} voted for turf waiver threshold ${threshold} in syndicate ${syndicateId} (New consensus threshold: ${newConsensusThreshold}).`);

        customEvents.push({
          type: "turf_waiver_adjusted",
          agentId,
          syndicateId,
          threshold,
          consensusThreshold: newConsensusThreshold,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_ESPIONAGE_NETWORK action (AF-64)
  if ((action as any).type === "ESTABLISH_ESPIONAGE_NETWORK") {
    const { roomId, syndicateId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];
    const isFactionControlled = state.territoryControl?.[roomId] !== undefined;

    if (!roomId) {
      rejectionReason = `Room ID is required to establish an espionage network.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish an espionage network.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Espionage network cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!isFactionControlled) {
      rejectionReason = `Room ${roomId} is not faction-controlled. Espionage networks require faction territory.`;
    } else if (state.espionageNetworks?.[roomId] && state.espionageNetworks[roomId].status !== "sabotaged") {
      rejectionReason = `Room ${roomId} already has an established espionage network.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to establish espionage network costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const espionageNetworks = { ...(state.espionageNetworks || {}) };
      espionageNetworks[roomId] = {
        roomId,
        syndicateId,
        cost,
        timestamp,
      };
      newState.espionageNetworks = espionageNetworks;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Established espionage network in room ${roomId} for syndicate ${syndicateId} for ${cost} gold by agent ${agentId}.`);

      customEvents.push({
        type: "espionage_network_established",
        agentId,
        roomId,
        syndicateId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PLACE_WIRETAP action (AF-64)
  if ((action as any).type === "PLACE_WIRETAP") {
    const { roomId, syndicateId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];
    
    let isMerchantHub = false;
    const p = pack as any;
    if (p) {
      if ("rooms" in p) {
        const room = p.rooms.find((r: any) => r.id === roomId);
        if (room && room.npcs && room.npcs.length > 0) {
          isMerchantHub = true;
        }
      } else {
        const scene = p.scenes.find((s: any) => s.id === roomId);
        if (scene && scene.npcs && scene.npcs.length > 0) {
          isMerchantHub = true;
        }
      }
    }
    if (!isMerchantHub && state.frontBusinesses) {
      if (Object.values(state.frontBusinesses).some(f => f.roomId === roomId)) {
        isMerchantHub = true;
      }
    }
    if (!isMerchantHub && state.merchantGold) {
      if (p && p.npcs) {
        for (const npc of p.npcs) {
          const npcRoom = p.rooms?.find((r: any) => r.npcs?.includes(npc.id)) || p.scenes?.find((s: any) => s.npcs?.includes(npc.id));
          if (npcRoom && npcRoom.id === roomId) {
            isMerchantHub = true;
            break;
          }
        }
      }
    }

    if (!roomId) {
      rejectionReason = `Room ID is required to place a wiretap.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to place a wiretap.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Wiretap cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!isMerchantHub) {
      rejectionReason = `Room ${roomId} is not a merchant transaction hub. Wiretaps require a merchant presence.`;
    } else if (state.wiretaps?.[roomId] && state.wiretaps[roomId].status !== "sabotaged") {
      rejectionReason = `Room ${roomId} already has an active wiretap.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to place wiretap costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const wiretaps = { ...(state.wiretaps || {}) };
      wiretaps[roomId] = {
        roomId,
        syndicateId,
        cost,
        timestamp,
      };
      newState.wiretaps = wiretaps;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Placed wiretap in room ${roomId} for syndicate ${syndicateId} for ${cost} gold by agent ${agentId}.`);

      customEvents.push({
        type: "wiretap_placed",
        agentId,
        roomId,
        syndicateId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized SELL_INTEL_REPORT action (AF-65)
  if ((action as any).type === "SELL_INTEL_REPORT") {
    const { syndicateId, reportId, gold, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const currentRoomId = agentId === "player" ? state.current : (state.agents?.[agentId]?.current ?? state.current);

    let hasBlackMarketMerchant = false;
    const p = pack as any;
    if (p) {
      if ("rooms" in p) {
        const room = p.rooms.find((r: any) => r.id === currentRoomId);
        if (room && room.npcs && room.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      } else {
        const scene = p.scenes.find((s: any) => s.id === currentRoomId);
        if (scene && scene.npcs && scene.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      }
    }
    if (!hasBlackMarketMerchant && state.blackMarkets) {
      if (Object.values(state.blackMarkets).some(b => b.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }
    if (!hasBlackMarketMerchant && state.safehouses) {
      if (Object.values(state.safehouses).some(s => s.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to sell an intelligence report.`;
    } else if (!reportId) {
      rejectionReason = `Report ID is required to sell an intelligence report.`;
    } else if (gold < 0 || !Number.isInteger(gold)) {
      rejectionReason = `Gold reward ${gold} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!syndicate.intelStock?.[reportId]) {
      rejectionReason = `Intel report ${reportId} does not exist in syndicate ${syndicateId} stock.`;
    } else if (!hasBlackMarketMerchant) {
      rejectionReason = `No black market merchant or safehouse/front business present in room ${currentRoomId}. Intel trading requires a black market presence.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Add gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold + gold,
      };

      const report = syndicate.intelStock![reportId];
      const intelStock = { ...(syndicate.intelStock || {}) };
      delete intelStock[reportId];

      const tx = {
        id: `tx_${timestamp}_${state.step}`,
        agentId,
        type: "sell" as const,
        reportId,
        gold,
        timestamp,
      };
      const intelTransactions = [...(syndicate.intelTransactions || []), tx];

      // strategic benefits!
      let reputationBoost = 0;
      let dominanceBoost = 0;
      let heatReduction = 0;
      if (report.type === "wiretap_log") {
        dominanceBoost = 5;
        reputationBoost = 10;
      } else if (report.type === "transaction_map") {
        dominanceBoost = 10;
      } else if (report.type === "raid_schedule") {
        heatReduction = 20;
        // Bribe deflection policy
        if (!newState.deflectionPolicies) newState.deflectionPolicies = {};
        newState.deflectionPolicies[currentRoomId] = {
          roomId: currentRoomId,
          syndicateId,
          active: true,
          cost: 0,
          timestamp,
        };
      }

      newState.syndicates = {
        ...newState.syndicates,
        [syndicateId]: {
          ...syndicate,
          intelStock,
          intelTransactions,
          dominance: (syndicate.dominance ?? 50) + dominanceBoost,
          timestamp,
        },
      };

      if (reputationBoost > 0) {
        if (!newState.npcRep) newState.npcRep = {};
        // Boost npcRep for npcs in current room
        const currentNpcs: string[] = [];
        if (p) {
          if ("rooms" in p) {
            const room = p.rooms.find((r: any) => r.id === currentRoomId);
            if (room && room.npcs) currentNpcs.push(...room.npcs);
          } else {
            const scene = p.scenes.find((s: any) => s.id === currentRoomId);
            if (scene && scene.npcs) currentNpcs.push(...scene.npcs);
          }
        }
        for (const npcId of currentNpcs) {
          newState.npcRep[npcId] = (newState.npcRep[npcId] ?? 0) + reputationBoost;
        }
      }

      if (heatReduction > 0 && newState.enforcementHeat?.[currentRoomId]) {
        newState.enforcementHeat = {
          ...newState.enforcementHeat,
          [currentRoomId]: {
            ...newState.enforcementHeat[currentRoomId],
            heat: Math.max(0, newState.enforcementHeat[currentRoomId].heat - heatReduction),
            timestamp,
          },
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Sold intel report ${reportId} (type: ${report.type}) for syndicate ${syndicateId} for ${gold} gold by agent ${agentId}.`);

      customEvents.push({
        type: "intel_report_sold",
        agentId,
        syndicateId,
        reportId,
        intelType: report.type,
        gold,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUY_INTEL_REPORT action (AF-65)
  if ((action as any).type === "BUY_INTEL_REPORT") {
    const { syndicateId, reportId, intelType, roomId, cost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const currentRoomId = agentId === "player" ? state.current : (state.agents?.[agentId]?.current ?? state.current);

    let hasBlackMarketMerchant = false;
    const p = pack as any;
    if (p) {
      if ("rooms" in p) {
        const room = p.rooms.find((r: any) => r.id === currentRoomId);
        if (room && room.npcs && room.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      } else {
        const scene = p.scenes.find((s: any) => s.id === currentRoomId);
        if (scene && scene.npcs && scene.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      }
    }
    if (!hasBlackMarketMerchant && state.blackMarkets) {
      if (Object.values(state.blackMarkets).some(b => b.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }
    if (!hasBlackMarketMerchant && state.safehouses) {
      if (Object.values(state.safehouses).some(s => s.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }

    const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
    const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to buy an intelligence report.`;
    } else if (!reportId) {
      rejectionReason = `Report ID is required to buy an intelligence report.`;
    } else if (!intelType || !["wiretap_log", "transaction_map", "raid_schedule"].includes(intelType)) {
      rejectionReason = `Intel type ${intelType} must be one of: wiretap_log, transaction_map, raid_schedule.`;
    } else if (!roomId) {
      rejectionReason = `Room ID is required to buy an intelligence report.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Intel report cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (syndicate.intelStock?.[reportId]) {
      rejectionReason = `Intel report ${reportId} already exists in syndicate stock.`;
    } else if (!hasBlackMarketMerchant) {
      rejectionReason = `No black market merchant or safehouse/front business present in room ${currentRoomId}. Intel trading requires a black market presence.`;
    } else if (currentGold < cost) {
      rejectionReason = `Insufficient gold to buy intel report costing ${cost} (requires ${cost}, has ${currentGold}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const report = {
        id: reportId,
        type: intelType,
        roomId,
        value: Math.floor(cost * 1.5),
        timestamp,
      };

      const intelStock = { ...(syndicate.intelStock || {}) };
      intelStock[reportId] = report;

      const tx = {
        id: `tx_${timestamp}_${state.step}`,
        agentId,
        type: "buy" as const,
        reportId,
        gold: cost,
        timestamp,
      };
      const intelTransactions = [...(syndicate.intelTransactions || []), tx];

      newState.syndicates = {
        ...newState.syndicates,
        [syndicateId]: {
          ...syndicate,
          intelStock,
          intelTransactions,
          timestamp,
        },
      };

      // strategic benefits!
      if (intelType === "raid_schedule") {
        const raidWarnings = { ...(state.raidWarnings || {}) };
        raidWarnings[roomId] = {
          roomId,
          syndicateId,
          scheduledStep: state.step + 5,
          active: true,
          timestamp,
        };
        newState.raidWarnings = raidWarnings;
      } else if (intelType === "wiretap_log") {
        if (!newState.wiretaps) newState.wiretaps = {};
        newState.wiretaps[roomId] = {
          roomId,
          syndicateId,
          cost: 0,
          timestamp,
        };
      } else if (intelType === "transaction_map") {
        if (!newState.espionageNetworks) newState.espionageNetworks = {};
        newState.espionageNetworks[roomId] = {
          roomId,
          syndicateId,
          cost: 0,
          timestamp,
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Purchased intel report ${reportId} (type: ${intelType}) for syndicate ${syndicateId} for ${cost} gold by agent ${agentId}.`);

      customEvents.push({
        type: "intel_report_purchased",
        agentId,
        syndicateId,
        reportId,
        intelType,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized SABOTAGE_NETWORK action (AF-66)
  if ((action as any).type === "SABOTAGE_NETWORK") {
    const { syndicateId, targetSyndicateId, roomId, targetType, reportId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const targetSyndicate = state.syndicates?.[targetSyndicateId];
    const currentRoomId = agentId === "player" ? state.current : (state.agents?.[agentId]?.current ?? state.current);

    let hasBlackMarketMerchant = false;
    const p = pack as any;
    if (p) {
      if ("rooms" in p) {
        const room = p.rooms.find((r: any) => r.id === currentRoomId);
        if (room && room.npcs && room.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      } else {
        const scene = p.scenes.find((s: any) => s.id === currentRoomId);
        if (scene && scene.npcs && scene.npcs.length > 0) {
          hasBlackMarketMerchant = true;
        }
      }
    }
    if (!hasBlackMarketMerchant && state.blackMarkets) {
      if (Object.values(state.blackMarkets).some(b => b.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }
    if (!hasBlackMarketMerchant && state.safehouses) {
      if (Object.values(state.safehouses).some(s => s.roomId === currentRoomId)) {
        hasBlackMarketMerchant = true;
      }
    }

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to sabotage a rival network.`;
    } else if (!targetSyndicateId) {
      rejectionReason = `Target syndicate ID is required to sabotage a rival network.`;
    } else if (!roomId) {
      rejectionReason = `Room ID is required to sabotage a rival network.`;
    } else if (!targetType || !["espionage_network", "wiretap"].includes(targetType)) {
      rejectionReason = `Target type ${targetType} must be one of: espionage_network, wiretap.`;
    } else if (!reportId) {
      rejectionReason = `Report ID is required to sabotage a rival network.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!targetSyndicate) {
      rejectionReason = `Target syndicate ${targetSyndicateId} does not exist.`;
    } else if (syndicateId === targetSyndicateId) {
      rejectionReason = `You cannot sabotage your own syndicate's espionage network or wiretap.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!syndicate.intelStock?.[reportId]) {
      rejectionReason = `Intel report ${reportId} does not exist in syndicate ${syndicateId} stock.`;
    } else if (!hasBlackMarketMerchant) {
      rejectionReason = `No black market merchant or safehouse/front business present in room ${currentRoomId}. Intel trading requires a black market presence.`;
    } else if (targetType === "espionage_network") {
      const net = state.espionageNetworks?.[roomId];
      if (!net) {
        rejectionReason = `No espionage network exists in room ${roomId}.`;
      } else if (net.syndicateId !== targetSyndicateId) {
        rejectionReason = `Espionage network in room ${roomId} does not belong to rival syndicate ${targetSyndicateId}.`;
      } else if (net.status === "sabotaged") {
        rejectionReason = `Espionage network in room ${roomId} is already sabotaged.`;
      } else {
        ok = true;
      }
    } else if (targetType === "wiretap") {
      const wt = state.wiretaps?.[roomId];
      if (!wt) {
        rejectionReason = `No wiretap exists in room ${roomId}.`;
      } else if (wt.syndicateId !== targetSyndicateId) {
        rejectionReason = `Wiretap in room ${roomId} does not belong to rival syndicate ${targetSyndicateId}.`;
      } else if (wt.status === "sabotaged") {
        rejectionReason = `Wiretap in room ${roomId} is already sabotaged.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      // 1. Consume the intel report
      const intelStock = { ...(syndicate.intelStock || {}) };
      delete intelStock[reportId];

      newState.syndicates = {
        ...newState.syndicates,
        [syndicateId]: {
          ...syndicate,
          intelStock,
          timestamp,
        },
      };

      // 2. Sabotage the target network
      if (targetType === "espionage_network") {
        const espionageNetworks = { ...(state.espionageNetworks || {}) };
        const entry = espionageNetworks[roomId];
        if (entry) {
          espionageNetworks[roomId] = {
            ...entry,
            status: "sabotaged" as const,
            timestamp,
          };
        }
        newState.espionageNetworks = espionageNetworks;
      } else {
        const wiretaps = { ...(state.wiretaps || {}) };
        const entry = wiretaps[roomId];
        if (entry) {
          wiretaps[roomId] = {
            ...entry,
            status: "sabotaged" as const,
            timestamp,
          };
        }
        newState.wiretaps = wiretaps;
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} sabotaged rival syndicate ${targetSyndicateId} ${targetType} in room ${roomId} using intel report ${reportId}.`);

      customEvents.push({
        type: "network_sabotaged",
        agentId,
        syndicateId,
        targetSyndicateId,
        roomId,
        targetType,
        reportId,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized FLIP_UNDERCOVER_AGENT action (AF-66)
  if ((action as any).type === "FLIP_UNDERCOVER_AGENT") {
    const { syndicateId, agentId: targetAgentId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const targetAgent = state.undercoverAgents?.[targetAgentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to flip an undercover agent.`;
    } else if (!targetAgentId) {
      rejectionReason = `Undercover agent ID is required to flip an undercover agent.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!targetAgent) {
      rejectionReason = `Undercover agent ${targetAgentId} does not exist.`;
    } else if (targetAgent.syndicateId !== syndicateId) {
      rejectionReason = `Undercover agent ${targetAgentId} is not infiltrating syndicate ${syndicateId}.`;
    } else if (targetAgent.status === "rooted_out") {
      rejectionReason = `Undercover agent ${targetAgentId} has already been rooted out.`;
    } else if (!syndicate.intelTransactions || syndicate.intelTransactions.length === 0) {
      rejectionReason = `Syndicate ${syndicateId} must have at least one intel transaction record to flip an undercover agent.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && targetAgent) {
      // 1. Update target agent status in undercoverAgents
      newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
      newState.undercoverAgents[targetAgentId] = {
        ...targetAgent,
        status: "rooted_out" as const,
        timestamp,
      };

      // 2. Create informant in informants
      newState.informants = newState.informants ? { ...newState.informants } : {};
      newState.informants[targetAgentId] = {
        id: targetAgentId,
        name: targetAgent.name,
        syndicateId,
        status: "active" as const,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Undercover agent ${targetAgent.name} was flipped to a syndicate informant by agent ${agentId} for syndicate ${syndicateId} using intel transaction records.`);

      customEvents.push({
        type: "undercover_agent_flipped",
        agentId,
        syndicateId,
        targetAgentId,
        name: targetAgent.name,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized APPOINT_RINGLEADER action (AF-67)
  if ((action as any).type === "APPOINT_RINGLEADER") {
    const { syndicateId, ringleaderId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to appoint a ringleader.`;
    } else if (!ringleaderId) {
      rejectionReason = `Ringleader ID is required to appoint a ringleader.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!syndicate.members.includes(ringleaderId)) {
      rejectionReason = `Proposed ringleader ${ringleaderId} is not a member of syndicate ${syndicateId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const existingRingleader = syndicate.ringleader;

      newState.syndicates = {
        ...newState.syndicates,
        [syndicateId]: {
          ...syndicate,
          ringleader: ringleaderId,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] ${agentId} appointed ${ringleaderId} as the smuggling ringleader of syndicate ${syndicateId}.`);

      customEvents.push({
        type: "narration",
        text: `👑 ${ringleaderId} has been appointed as the smuggling ringleader for syndicate ${syndicateId}! They can now coordinate multi-convoy networks.`,
      } as any);

      customEvents.push({
        type: "ringleader_appointed" as any,
        syndicateId,
        ringleaderId,
        previousRingleader: existingRingleader,
      } as any);
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_CARTEL_GLOBAL_TAX action (AF-67)
  if ((action as any).type === "VOTE_CARTEL_GLOBAL_TAX") {
    const { cartelId, taxRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const cartel = state.cartels?.[cartelId];
    const isMember = cartel?.members.includes(agentId) || state.cartelMemberships?.[agentId]?.includes(cartelId) || false;

    if (!cartelId) {
      rejectionReason = `Cartel ID is required to vote on global cartel tax.`;
    } else if (taxRate === undefined || taxRate < 0 || !Number.isInteger(taxRate)) {
      rejectionReason = `Proposed global cartel tax rate must be a non-negative integer.`;
    } else if (!cartel) {
      rejectionReason = `Merchant cartel ${cartelId} does not exist in state.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of cartel ${cartelId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && cartel) {
      const cartelGlobalTaxVotes = { ...(state.cartelGlobalTaxVotes || {}) };
      if (!cartelGlobalTaxVotes[cartelId]) {
        cartelGlobalTaxVotes[cartelId] = {};
      } else {
        cartelGlobalTaxVotes[cartelId] = { ...cartelGlobalTaxVotes[cartelId] };
      }

      const existingVote = cartelGlobalTaxVotes[cartelId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        cartelGlobalTaxVotes[cartelId][agentId] = {
          rate: taxRate,
          timestamp,
        };
        newState.cartelGlobalTaxVotes = cartelGlobalTaxVotes;
        newState = reconcileCartelGlobalTaxes(newState, pack);

        const newTaxRate = newState.cartelGlobalTaxPolicy?.[cartelId] ?? 0;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Cartel] ${agentId} voted for global cartel tax rate ${taxRate} in cartel ${cartelId}. Reconciled global tax is now ${newTaxRate}.`);

        customEvents.push({
          type: "cartel_global_tax_voted" as any,
          cartelId,
          agentId,
          taxRate,
          reconciledRate: newTaxRate,
        });
      } else {
        ok = true;
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEFINE_SMUGGLER_GUILD action (AF-68)
  if ((action as any).type === "DEFINE_SMUGGLER_GUILD") {
    const { guildId, name, syndicateId, members, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!guildId || typeof guildId !== "string") {
      rejectionReason = `Proposed guild ID must be a non-empty string.`;
    } else if (!name || typeof name !== "string") {
      rejectionReason = `Proposed guild name must be a non-empty string.`;
    } else if (!syndicateId || typeof syndicateId !== "string") {
      rejectionReason = `Syndicate ID must be a non-empty string.`;
    } else if (!syndicate) {
      rejectionReason = `Crime syndicate ${syndicateId} does not exist in state.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of crime syndicate ${syndicateId}.`;
    } else if (!Array.isArray(members) || members.some(m => typeof m !== "string")) {
      rejectionReason = `Proposed guild members must be an array of NPC ID strings.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const smugglerGuilds = { ...(state.smugglerGuilds || {}) };
      const existingGuild = smugglerGuilds[guildId];

      if (!existingGuild || timestamp > existingGuild.timestamp ||
        (timestamp === existingGuild.timestamp && agentId.localeCompare(existingGuild.definedBy) < 0)
      ) {
        smugglerGuilds[guildId] = {
          id: guildId,
          name,
          syndicateId,
          members,
          definedBy: agentId,
          timestamp,
        };
        newState.smugglerGuilds = smugglerGuilds;

        // Automatically register creator as a member in memberships
        const smugglerGuildMemberships = { ...(state.smugglerGuildMemberships || {}) };
        if (!smugglerGuildMemberships[agentId]) {
          smugglerGuildMemberships[agentId] = [];
        } else {
          smugglerGuildMemberships[agentId] = [...smugglerGuildMemberships[agentId]];
        }
        if (!smugglerGuildMemberships[agentId].includes(guildId)) {
          smugglerGuildMemberships[agentId].push(guildId);
        }
        newState.smugglerGuildMemberships = smugglerGuildMemberships;
      } else {
        ok = true;
      }
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "smuggler_guild_defined", guildId, name, syndicateId, definedBy: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_SMUGGLER_GUILD_CBA action (AF-68)
  if ((action as any).type === "VOTE_SMUGGLER_GUILD_CBA") {
    const { guildId, routeId, agreedToll, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const guild = state.smugglerGuilds?.[guildId];
    const isMember = guild?.members.includes(agentId) ||
      (state.smugglerGuildMemberships?.[agentId]?.includes(guildId)) ||
      guild?.definedBy === agentId || false;

    if (!guildId) {
      rejectionReason = `Smuggler guild ID is required.`;
    } else if (!guild) {
      rejectionReason = `Smuggler guild ${guildId} does not exist in state.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of smuggler guild ${guildId} and cannot vote on CBA.`;
    } else if (agreedToll === undefined || agreedToll < 0 || !Number.isInteger(agreedToll)) {
      rejectionReason = `Proposed agreed toll rate must be a non-negative integer.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const smugglerGuildCbaVotes = { ...(state.smugglerGuildCbaVotes || {}) };
      if (!smugglerGuildCbaVotes[guildId]) {
        smugglerGuildCbaVotes[guildId] = {};
      } else {
        smugglerGuildCbaVotes[guildId] = { ...smugglerGuildCbaVotes[guildId] };
      }
      if (!smugglerGuildCbaVotes[guildId][routeId]) {
        smugglerGuildCbaVotes[guildId][routeId] = {};
      } else {
        smugglerGuildCbaVotes[guildId][routeId] = { ...smugglerGuildCbaVotes[guildId][routeId] };
      }

      const existingVote = smugglerGuildCbaVotes[guildId][routeId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        smugglerGuildCbaVotes[guildId][routeId][agentId] = {
          agreedToll,
          timestamp,
        };
        newState.smugglerGuildCbaVotes = smugglerGuildCbaVotes;
        newState = reconcileSmugglerGuildCbas(newState, pack);
      } else {
        ok = true;
      }
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "smuggler_guild_cba_voted", guildId, routeId, agreedToll, voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized POOL_BOUNTY_RESOURCES action (AF-68)
  if ((action as any).type === "POOL_BOUNTY_RESOURCES") {
    const { syndicateId, targetId, goldAmount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isMember = syndicate?.members.includes(agentId) || false;

    const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
    const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist in state.`;
    } else if (!isMember) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot pool resources.`;
    } else if (!targetId || typeof targetId !== "string") {
      rejectionReason = `Target ID must be a non-empty string.`;
    } else if (goldAmount === undefined || goldAmount <= 0 || !Number.isInteger(goldAmount)) {
      rejectionReason = `Gold amount to pool must be a positive integer.`;
    } else if (currentGold < goldAmount) {
      rejectionReason = `Agent ${agentId} has insufficient gold (${currentGold}) to pool ${goldAmount} gold.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      // Deduct gold
      newState.vars[goldKey] = currentGold - goldAmount;

      const bounties = { ...(state.bounties || {}) };
      const existingBounty = bounties[targetId];

      if (existingBounty) {
        bounties[targetId] = {
          targetId,
          amount: existingBounty.amount + goldAmount,
          timestamp,
          active: true,
        };
      } else {
        bounties[targetId] = {
          targetId,
          amount: goldAmount,
          timestamp,
          active: true,
        };
      }
      newState.bounties = bounties;
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "bounty_resources_pooled", syndicateId, targetId, goldAmount, contributor: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PROPOSE_SYNDICATE_ALLIANCE action (AF-69)
  if ((action as any).type === "PROPOSE_SYNDICATE_ALLIANCE") {
    const { syndicateIdA, syndicateIdB, targetState, timestamp } = action as any;
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (syndicateIdA === syndicateIdB) {
      rejectionReason = `Cannot form alliance with the same syndicate.`;
    } else if (!syndA.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateIdA}.`;
    } else if (targetState && !["allied", "hostile", "neutral"].includes(targetState)) {
      rejectionReason = `Proposed alliance state ${targetState} must be allied, hostile, or neutral.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const syndicateAllianceVotes = { ...(state.syndicateAllianceVotes || {}) };
      if (!syndicateAllianceVotes[pairKey]) {
        syndicateAllianceVotes[pairKey] = {};
      } else {
        syndicateAllianceVotes[pairKey] = { ...syndicateAllianceVotes[pairKey] };
      }

      const votedState = targetState ?? "allied";

      const existingVote = syndicateAllianceVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        syndicateAllianceVotes[pairKey][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.syndicateAllianceVotes = syndicateAllianceVotes;
        newState = reconcileSyndicateAlliances(newState, pack);
      } else {
        ok = true;
      }
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "syndicate_alliance_proposed", syndicateIdA, syndicateIdB, targetState: targetState ?? "allied", voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized SHARE_ESPIONAGE_DATA action (AF-69)
  if ((action as any).type === "SHARE_ESPIONAGE_DATA") {
    const { syndicateId, targetSyndicateId, roomId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateId];
    const syndB = state.syndicates?.[targetSyndicateId];
    const isAllied = state.syndicateAlliances?.[syndicateId]?.[targetSyndicateId] === "allied" ||
                     state.syndicateAlliances?.[targetSyndicateId]?.[syndicateId] === "allied";

    const hasEspionage = state.espionageNetworks?.[roomId]?.syndicateId === syndicateId && state.espionageNetworks?.[roomId]?.status !== "sabotaged";
    const hasWiretap = state.wiretaps?.[roomId]?.syndicateId === syndicateId && state.wiretaps?.[roomId]?.status !== "sabotaged";

    if (!syndicateId || !targetSyndicateId || !roomId) {
      rejectionReason = `syndicateId, targetSyndicateId, and roomId are all required.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${targetSyndicateId} does not exist.`;
    } else if (!isAllied) {
      rejectionReason = `Syndicates ${syndicateId} and ${targetSyndicateId} are not allied. Espionage sharing requires an active alliance.`;
    } else if (!syndA.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!hasEspionage && !hasWiretap) {
      rejectionReason = `Syndicate ${syndicateId} does not have an active espionage network or wiretap in room ${roomId} to share.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok && syndA && syndB) {
      const targetSynd = { ...syndB };
      const targetStock = { ...(targetSynd.intelStock || {}) };

      // Copy any intelStock reports from source syndicate to target syndicate's stock
      const sourceStock = syndA.intelStock || {};
      for (const [reportId, report] of Object.entries(sourceStock)) {
        if (report.roomId === roomId) {
          targetStock[reportId] = {
            ...report,
            timestamp,
          };
        }
      }

      // Also ensure we generate at least one default shared report if they don't have one, to represent the shared data
      const defaultReportId = `shared_intel_${roomId}_${timestamp}`;
      if (!targetStock[defaultReportId]) {
        targetStock[defaultReportId] = {
          id: defaultReportId,
          type: hasWiretap ? "wiretap_log" : "transaction_map",
          roomId,
          value: 75,
          timestamp,
        };
      }

      targetSynd.intelStock = targetStock;
      newState.syndicates = {
        ...newState.syndicates,
        [targetSyndicateId]: targetSynd,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Syndicate ${syndicateId} shared espionage data in room ${roomId} with allied syndicate ${targetSyndicateId}.`);
    }

    newState.step += 1;

    // Maintain history on successful steps
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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
        ? [{ type: "espionage_data_shared", syndicateId, targetSyndicateId, roomId, sender: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CONTRIBUTE_WAR_CHEST action (AF-70)
  if ((action as any).type === "CONTRIBUTE_WAR_CHEST") {
    const { syndicateId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required for war chest contribution.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Contribution amount ${amount} must be a positive integer.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to contribute ${amount} (requires ${amount}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct agent's gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      // Add to syndicate war chest
      const updatedSyndicate = {
        ...syndicate,
        warChest: (syndicate.warChest ?? 0) + amount,
      };
      newState.syndicates = {
        ...(newState.syndicates || {}),
        [syndicateId]: updatedSyndicate,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} contributed ${amount} gold to syndicate ${syndicateId} war chest.`);
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "war_chest_contributed", agentId, syndicateId, amount } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PAY_FACTION_BRIBE action (AF-70)
  if ((action as any).type === "PAY_FACTION_BRIBE") {
    const { factionId, syndicateId, amount, timestamp, useWarChest } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = syndicateId ? state.syndicates?.[syndicateId] : undefined;

    if (!factionId) {
      rejectionReason = `Faction ID is required for faction bribe.`;
    } else if (amount < 0 || !Number.isInteger(amount)) {
      rejectionReason = `Bribe amount ${amount} must be a non-negative integer.`;
    } else if (useWarChest) {
      if (!syndicateId) {
        rejectionReason = `Syndicate ID is required when paying bribe from war chest.`;
      } else if (!syndicate) {
        rejectionReason = `Syndicate ${syndicateId} does not exist.`;
      } else if (!syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
      } else {
        const warChestGold = syndicate.warChest ?? 0;
        if (warChestGold < amount) {
          rejectionReason = `Insufficient gold in syndicate war chest to pay bribe of ${amount} (requires ${amount}, has ${warChestGold}).`;
        } else {
          ok = true;
        }
      }
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to pay bribe of ${amount} (has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    if (ok) {
      if (useWarChest && syndicateId && syndicate) {
        // Deduct from war chest
        const updatedSyndicate = {
          ...syndicate,
          warChest: (syndicate.warChest ?? 0) - amount,
        };
        newState.syndicates = {
          ...(newState.syndicates || {}),
          [syndicateId]: updatedSyndicate,
        };
      } else {
        // Deduct from agent's personal gold
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        newState.vars = {
          ...newState.vars,
          [goldKey]: currentGold - amount,
        };
      }

      // Register bribe in bribes under factionId
      const bribes = { ...(state.bribes || {}) };
      bribes[factionId] = {
        enforcerId: factionId,
        amount,
        timestamp,
      };
      newState.bribes = bribes;

      if (!newState.journal) newState.journal = [];
      const paymentSource = useWarChest ? `syndicate ${syndicateId} war chest` : "personal gold";
      newState.journal.push(`[Syndicate] Agent ${agentId} paid faction bribe of ${amount} gold to faction ${factionId} using ${paymentSource}.`);
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "faction_bribe_paid", agentId, factionId, amount, useWarChest, syndicateId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DECLARE_FACTION_WAR action (AF-71)
  if ((action as any).type === "DECLARE_FACTION_WAR") {
    const { syndicateId, factionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to declare faction war.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to declare war.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      // Initialize factionWars if not present
      if (!newState.factionWars) newState.factionWars = {};
      if (!newState.factionWars[syndicateId]) newState.factionWars[syndicateId] = {};
      
      newState.factionWars[syndicateId][factionId] = true;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[War] Syndicate ${syndicateId} declared a hot war against faction ${factionId}!`);
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "faction_war_declared", agentId, syndicateId, factionId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_CAMPAIGN action (AF-71)
  if ((action as any).type === "LAUNCH_CAMPAIGN") {
    const { syndicateId, factionId, roomId, goldInvestment, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isAtWar = syndicateId && factionId && state.factionWars?.[syndicateId]?.[factionId] === true;

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a campaign.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to launch a campaign.`;
    } else if (!roomId) {
      rejectionReason = `Target room ID is required to launch a campaign.`;
    } else if (!isAtWar) {
      rejectionReason = `Syndicate ${syndicateId} must declare war on faction ${factionId} before launching a campaign.`;
    } else if (goldInvestment < 0 || !Number.isInteger(goldInvestment)) {
      rejectionReason = `Campaign gold investment ${goldInvestment} must be a non-negative integer.`;
    } else {
      const warChestGold = syndicate.warChest ?? 0;
      if (warChestGold < goldInvestment) {
        rejectionReason = `Insufficient gold in syndicate war chest to launch campaign with investment ${goldInvestment} (requires ${goldInvestment}, has ${warChestGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let success = false;
    let successProb = 0;
    let rolledValue = 0;

    if (ok && syndicate) {
      // Deduct gold investment from syndicate war chest
      const updatedSyndicate = {
        ...syndicate,
        warChest: (syndicate.warChest ?? 0) - goldInvestment,
      };
      newState.syndicates = {
        ...(newState.syndicates || {}),
        [syndicateId]: updatedSyndicate,
      };

      // Calculate success probability based on war chest investment
      successProb = 0.3 + (goldInvestment / (goldInvestment + 300)) * 0.6;
      
      // mulberry32 seeded deterministic outcome
      const { value: roll, nextSeed } = PureRand.next(newState.seed);
      newState.seed = nextSeed;
      rolledValue = roll;

      if (roll <= successProb) {
        success = true;
        // Seize territory control
        if (!newState.territoryClaims) newState.territoryClaims = {};
        newState.territoryClaims[roomId] = {
          claimedBy: syndicateId,
          factionId: syndicateId, // Syndicate takes ownership
          timestamp,
        };
        if (!newState.territoryControl) newState.territoryControl = {};
        newState.territoryControl[roomId] = syndicateId;
      }

      if (!newState.journal) newState.journal = [];
      if (success) {
        newState.journal.push(`[Campaign] Syndicate ${syndicateId} successfully launched campaign against faction ${factionId} in room ${roomId} (Investment: ${goldInvestment}, Roll: ${roll.toFixed(3)} vs Prob: ${successProb.toFixed(3)})!`);
      } else {
        newState.journal.push(`[Campaign] Campaign launched by syndicate ${syndicateId} against faction ${factionId} in room ${roomId} FAILED (Investment: ${goldInvestment}, Roll: ${roll.toFixed(3)} vs Prob: ${successProb.toFixed(3)}).`);
      }
    }

    newState.step += 1;

    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "campaign_launched", agentId, syndicateId, factionId, roomId, success, successProb, roll: rolledValue } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BUILD_DEFENSE_FORTRESS action (AF-72)
  if ((action as any).type === "BUILD_DEFENSE_FORTRESS") {
    const { roomId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 200;

    let ok = false;
    let rejectionReason: string | undefined;

    const roomExists = "rooms" in pack
      ? (pack as ParserPack).rooms.some((r: any) => r.id === roomId)
      : (pack as CYOAPack).scenes.some((s: any) => s.id === roomId);
    const syndicate = state.syndicates?.[syndicateId];

    if (!roomId) {
      rejectionReason = `Room ID is required to build a defense fortress.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to build a defense fortress.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Defense fortress cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.territoryControl?.[roomId] !== syndicateId) {
      rejectionReason = `Syndicate ${syndicateId} does not control territory ${roomId} to build a fortress.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to build defense fortress costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const defenseFortresses = { ...(state.defenseFortresses || {}) };
      const existingFortress = defenseFortresses[roomId];
      const newLevel = existingFortress ? existingFortress.fortressLevel + 1 : 1;

      defenseFortresses[roomId] = {
        roomId,
        syndicateId,
        fortressLevel: newLevel,
        timestamp,
      };
      newState.defenseFortresses = defenseFortresses;

      if (!newState.journal) newState.journal = [];
      if (existingFortress) {
        newState.journal.push(`[Syndicate] Upgraded cartel defense fortress in room ${roomId} to level ${newLevel} for ${cost} gold by agent ${agentId}.`);
      } else {
        newState.journal.push(`[Syndicate] Established cartel defense fortress in room ${roomId} at level 1 for ${cost} gold by agent ${agentId}.`);
      }

      customEvents.push({
        type: "cartel_fortress_built",
        agentId,
        roomId,
        syndicateId,
        fortressLevel: newLevel,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PROPOSE_PEACE_TREATY action (AF-72)
  if ((action as any).type === "PROPOSE_PEACE_TREATY") {
    const { syndicateId, factionId, vote, timestamp } = action as any;
    const votedState = vote !== false; // Defaults to true if undefined

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isAtWar = syndicateId && factionId && state.factionWars?.[syndicateId]?.[factionId] === true;

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose a peace treaty.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to propose a peace treaty.`;
    } else if (!isAtWar) {
      rejectionReason = `Syndicate ${syndicateId} is not at war with faction ${factionId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const peaceTreatyVotes = { ...(state.peaceTreatyVotes || {}) };
      if (!peaceTreatyVotes[syndicateId]) {
        peaceTreatyVotes[syndicateId] = {};
      } else {
        peaceTreatyVotes[syndicateId] = { ...peaceTreatyVotes[syndicateId] };
      }
      if (!peaceTreatyVotes[syndicateId][factionId]) {
        peaceTreatyVotes[syndicateId][factionId] = {};
      } else {
        peaceTreatyVotes[syndicateId][factionId] = { ...peaceTreatyVotes[syndicateId][factionId] };
      }

      const existingVote = peaceTreatyVotes[syndicateId][factionId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        peaceTreatyVotes[syndicateId][factionId][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.peaceTreatyVotes = peaceTreatyVotes;
        newState = reconcileFactionWars(newState, pack);

        const activeWar = newState.factionWars?.[syndicateId]?.[factionId] ?? false;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[War] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} peace treaty with ${factionId} in syndicate ${syndicateId} (War Status: ${activeWar ? "ACTIVE" : "ENDED"}).`);

        customEvents.push({
          type: "peace_treaty_voted",
          agentId,
          syndicateId,
          factionId,
          vote: votedState,
          warActive: activeWar,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_COVERT_CELL action (AF-73)
  if ((action as any).type === "ESTABLISH_COVERT_CELL") {
    const { roomId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 150;

    let ok = false;
    let rejectionReason: string | undefined;

    const findPackRoom = (p: any, rid: string) => {
      if (p.rooms) {
        return p.rooms.find((r: any) => r.id === rid);
      }
      if (p.scenes) {
        return p.scenes.find((s: any) => s.id === rid);
      }
      return undefined;
    };

    const roomDef = findPackRoom(pack, roomId);
    const roomExists = !!roomDef;
    const syndicate = state.syndicates?.[syndicateId];
    const nativeFactionId = roomDef?.faction;

    if (!roomId) {
      rejectionReason = `Room ID is required to establish a covert cell.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish a covert cell.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Covert cell cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!nativeFactionId) {
      rejectionReason = `Room ${roomId} must have a native faction to establish a covert cell.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.territoryControl?.[roomId] === syndicateId) {
      rejectionReason = `Syndicate already controls this territory; cannot establish a covert cell.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to establish covert cell costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const covertCells = { ...(state.covertCells || {}) };
      const existingCell = covertCells[roomId];
      const newLevel = existingCell ? existingCell.cellLevel + 1 : 1;

      covertCells[roomId] = {
        roomId,
        syndicateId,
        cellLevel: newLevel,
        timestamp,
      };
      newState.covertCells = covertCells;

      if (!newState.journal) newState.journal = [];
      if (existingCell) {
        newState.journal.push(`[Syndicate] Upgraded covert cell in room ${roomId} to level ${newLevel} for ${cost} gold by agent ${agentId}.`);
      } else {
        newState.journal.push(`[Syndicate] Established covert cell in room ${roomId} at level 1 for ${cost} gold by agent ${agentId}.`);
      }

      customEvents.push({
        type: "cartel_covert_cell_established",
        agentId,
        roomId,
        syndicateId,
        cellLevel: newLevel,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized BROADCAST_PROPAGANDA action (AF-73)
  if ((action as any).type === "BROADCAST_PROPAGANDA") {
    const { roomId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 100;

    let ok = false;
    let rejectionReason: string | undefined;

    const findPackRoom = (p: any, rid: string) => {
      if (p.rooms) {
        return p.rooms.find((r: any) => r.id === rid);
      }
      if (p.scenes) {
        return p.scenes.find((s: any) => s.id === rid);
      }
      return undefined;
    };

    const roomDef = findPackRoom(pack, roomId);
    const roomExists = !!roomDef;
    const syndicate = state.syndicates?.[syndicateId];
    const nativeFactionId = roomDef?.faction;

    if (!roomId) {
      rejectionReason = `Room ID is required to broadcast propaganda.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to broadcast propaganda.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Propaganda cost ${cost} must be a non-negative integer.`;
    } else if (!roomExists) {
      rejectionReason = `Room ${roomId} does not exist in pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to broadcast propaganda costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const campaigns = { ...(state.propagandaCampaigns || {}) };
      const key = `${roomId}_${syndicateId}`;
      const existing = campaigns[key];
      const newLevel = existing ? existing.level + 1 : 1;

      campaigns[key] = {
        roomId,
        syndicateId,
        level: newLevel,
        timestamp,
      };
      newState.propagandaCampaigns = campaigns;

      // Increase syndicate dominance by 5 (up to max 150)
      const currentDom = syndicate.dominance ?? 50;
      const newDom = Math.min(150, currentDom + 5);
      newState.syndicates = {
        ...(newState.syndicates || {}),
        [syndicateId]: {
          ...syndicate,
          dominance: newDom,
        },
      };

      // Increase faction reputation with room's native faction by 5 if present
      if (nativeFactionId) {
        const currentRep = newState.factionRep?.[nativeFactionId] ?? 0;
        newState.factionRep = {
          ...(newState.factionRep || {}),
          [nativeFactionId]: currentRep + 5,
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Broadcasted conquest propaganda in room ${roomId} (Level: ${newLevel}) for ${cost} gold by agent ${agentId}. Syndicate dominance increased to ${newDom}.`);

      customEvents.push({
        type: "conquest_propaganda_broadcasted",
        agentId,
        roomId,
        syndicateId,
        level: newLevel,
        dominance: newDom,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized RECRUIT_SABOTEUR action (AF-74)
  if ((action as any).type === "RECRUIT_SABOTEUR") {
    const { enforcerId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 150;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const enforcer = state.enforcers?.[enforcerId];

    if (!enforcerId) {
      rejectionReason = `Enforcer ID is required to recruit a saboteur.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to recruit a saboteur.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Saboteur recruitment cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!enforcer) {
      rejectionReason = `Enforcer ${enforcerId} does not exist.`;
    } else if (enforcer.status !== "defeated") {
      rejectionReason = `Enforcer ${enforcer.name} is not defeated. Recruiting a saboteur requires a defeated enforcer.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to recruit saboteur costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && enforcer) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const saboteurs = { ...(state.saboteurs || {}) };
      saboteurs[enforcerId] = {
        id: enforcerId,
        name: enforcer.name,
        syndicateId,
        status: "active" as const,
        timestamp,
      };
      newState.saboteurs = saboteurs;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Enforcer ${enforcer.name} was recruited by agent ${agentId} as a saboteur for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "saboteur_recruited",
        agentId,
        syndicateId,
        enforcerId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_COUNTER_INTEL_SWEEP action (AF-74)
  if ((action as any).type === "LAUNCH_COUNTER_INTEL_SWEEP") {
    const { syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 200;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a counter-intelligence sweep.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Counter-intelligence sweep cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to launch counter-intelligence sweep costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Expose/neutralize active undercover agents in this syndicate
      newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
      const agentsToNeutralize = Object.values(newState.undercoverAgents).filter(
        a => a.syndicateId === syndicateId && a.status === "active"
      );

      if (!newState.journal) newState.journal = [];

      if (agentsToNeutralize.length > 0) {
        for (const agent of agentsToNeutralize) {
          newState.undercoverAgents[agent.id] = {
            ...agent,
            status: "rooted_out" as const,
            timestamp,
          };
          newState.journal.push(`[Syndicate] Counter-intelligence sweep by syndicate ${syndicateId} located and neutralized undercover agent ${agent.name}!`);
          customEvents.push({
            type: "undercover_agent_neutralized",
            agentId,
            syndicateId,
            targetAgentId: agent.id,
            name: agent.name,
            timestamp,
          });
        }
      } else {
        newState.journal.push(`[Syndicate] Counter-intelligence sweep by syndicate ${syndicateId} found no active undercover agents.`);
        customEvents.push({
          type: "counter_intel_sweep_clean",
          agentId,
          syndicateId,
          timestamp,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized RECRUIT_ELITE_ENFORCER action (AF-75)
  if ((action as any).type === "RECRUIT_ELITE_ENFORCER") {
    const { npcId, factionId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 250;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const factionRep = state.factionRep?.[factionId] ?? 0;

    if (!npcId) {
      rejectionReason = `NPC ID is required to recruit an elite enforcer.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to recruit an elite enforcer.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to recruit an elite enforcer.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Elite enforcer recruitment cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (factionRep < 50) {
      rejectionReason = `Faction reputation with ${factionId} is too low (${factionRep} < 50). Recruiting an elite enforcer requires at least 50 reputation.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to recruit elite enforcer costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const eliteEnforcers = { ...(state.eliteEnforcers || {}) };
      
      const p = pack as any;
      const npcObj = p.npcs?.find((n: any) => n.id === npcId);
      const npcName = npcObj?.name ?? `Elite Enforcer ${npcId}`;

      eliteEnforcers[npcId] = {
        id: npcId,
        name: npcName,
        factionId,
        syndicateId,
        status: "active" as const,
        timestamp,
      };
      newState.eliteEnforcers = eliteEnforcers;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] NPC ${npcName} was recruited from faction ${factionId} by agent ${agentId} as an elite enforcer for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "elite_enforcer_recruited",
        agentId,
        syndicateId,
        npcId,
        factionId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_COUNTER_SABOTAGE action (AF-75)
  if ((action as any).type === "LAUNCH_COUNTER_SABOTAGE") {
    const { syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 200;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a counter-sabotage sweep.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Counter-sabotage sweep cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to launch counter-sabotage sweep costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Neutralize active rival saboteurs
      newState.saboteurs = newState.saboteurs ? { ...newState.saboteurs } : {};
      const saboteursToNeutralize = Object.values(newState.saboteurs).filter(
        s => s.syndicateId !== syndicateId && s.status === "active"
      );

      if (!newState.journal) newState.journal = [];

      if (saboteursToNeutralize.length > 0) {
        for (const saboteur of saboteursToNeutralize) {
          newState.saboteurs[saboteur.id] = {
            ...saboteur,
            status: "compromised" as const,
            timestamp,
          };
          newState.journal.push(`[Syndicate] Counter-sabotage sweep by syndicate ${syndicateId} located and neutralized rival saboteur ${saboteur.name}!`);
          customEvents.push({
            type: "saboteur_neutralized",
            agentId,
            syndicateId,
            targetSaboteurId: saboteur.id,
            name: saboteur.name,
            timestamp,
          });
        }
      } else {
        newState.journal.push(`[Syndicate] Counter-sabotage sweep by syndicate ${syndicateId} found no active rival saboteurs.`);
        customEvents.push({
          type: "counter_sabotage_sweep_clean",
          agentId,
          syndicateId,
          timestamp,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized HIRE_LEGENDARY_HITMAN action (AF-76)
  if ((action as any).type === "HIRE_LEGENDARY_HITMAN") {
    const { hitmanId, syndicateId, timestamp } = action as any;
    const cost = (action as any).cost ?? 300;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!hitmanId) {
      rejectionReason = `Hitman ID is required to hire a legendary hitman.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to hire a legendary hitman.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Legendary hitman cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to hire legendary hitman costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const legendaryHitmen = { ...(state.legendaryHitmen || {}) };
      legendaryHitmen[hitmanId] = {
        id: hitmanId,
        name: `Hitman ${hitmanId}`,
        syndicateId,
        status: "active" as const,
        timestamp,
      };
      newState.legendaryHitmen = legendaryHitmen;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Legendary Hitman Hitman ${hitmanId} was hired by agent ${agentId} for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "legendary_hitman_hired",
        agentId,
        syndicateId,
        hitmanId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_DECOY_CONVOY action (AF-76)
  if ((action as any).type === "LAUNCH_DECOY_CONVOY") {
    const { decoyId, syndicateId, routeId, timestamp } = action as any;
    const cost = (action as any).cost ?? 150;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const route = state.tradeRoutes?.[routeId];

    if (!decoyId) {
      rejectionReason = `Decoy ID is required to launch a decoy convoy.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a decoy convoy.`;
    } else if (!routeId) {
      rejectionReason = `Route ID is required to launch a decoy convoy.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Decoy convoy cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!route) {
      rejectionReason = `Trade route ${routeId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to launch decoy convoy costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const decoyConvoys = { ...(state.decoyConvoys || {}) };
      decoyConvoys[decoyId] = {
        id: decoyId,
        syndicateId,
        routeId,
        currentRoomIndex: 0,
        status: "en_route" as const,
        timestamp,
      };
      newState.decoyConvoys = decoyConvoys;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Decoy convoy ${decoyId} was launched along route ${routeId} by agent ${agentId} for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "decoy_convoy_launched",
        agentId,
        syndicateId,
        decoyId,
        routeId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_MASTERMIND_CONTRACT action (AF-77)
  if ((action as any).type === "LAUNCH_MASTERMIND_CONTRACT") {
    const { contractId, syndicateId, payoutArbitrageMultiplier, cost, timestamp } = action as any;
    const actualCost = cost ?? 400;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!contractId) {
      rejectionReason = `Contract ID is required to launch a mastermind contract.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch a mastermind contract.`;
    } else if (payoutArbitrageMultiplier <= 0) {
      rejectionReason = `Payout arbitrage multiplier must be a positive number.`;
    } else if (actualCost < 0 || !Number.isInteger(actualCost)) {
      rejectionReason = `Mastermind contract cost ${actualCost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to launch mastermind contract costing ${actualCost} (requires ${actualCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      const mastermindContracts = { ...(state.mastermindContracts || {}) };
      mastermindContracts[contractId] = {
        id: contractId,
        syndicateId,
        payoutArbitrageMultiplier,
        status: "active" as const,
        progress: 0,
        duration: 5,
        timestamp,
      };
      newState.mastermindContracts = mastermindContracts;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Mastermind contract ${contractId} was launched by agent ${agentId} for syndicate ${syndicateId} with payout multiplier ${payoutArbitrageMultiplier}x.`);

      customEvents.push({
        type: "mastermind_contract_launched",
        agentId,
        syndicateId,
        contractId,
        payoutArbitrageMultiplier,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PROPOSE_ENFORCER_DEFUNDING action (AF-77)
  if ((action as any).type === "PROPOSE_ENFORCER_DEFUNDING") {
    const { syndicateId, targetReduction, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose enforcer defunding.`;
    } else if (targetReduction < 0 || targetReduction > 1) {
      rejectionReason = `Proposed target reduction ${targetReduction} must be between 0 and 1.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const enforcerDefundingVotes = { ...(state.enforcerDefundingVotes || {}) };
      if (!enforcerDefundingVotes[syndicateId]) {
        enforcerDefundingVotes[syndicateId] = {};
      } else {
        enforcerDefundingVotes[syndicateId] = { ...enforcerDefundingVotes[syndicateId] };
      }

      const existingVote = enforcerDefundingVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        enforcerDefundingVotes[syndicateId][agentId] = {
          targetReduction,
          timestamp,
        };
        newState.enforcerDefundingVotes = enforcerDefundingVotes;
        newState = reconcileEnforcerDefunding(newState, pack);

        const newConsensusRate = newState.syndicates?.[syndicateId]?.enforcerDefundingRate ?? 0;
        newState.journal.push(`[Syndicate] Agent ${agentId} voted for enforcer defunding target reduction ${targetReduction} in syndicate ${syndicateId} (New consensus rate: ${newConsensusRate}).`);

        customEvents.push({
          type: "enforcer_defunding_proposed",
          agentId,
          syndicateId,
          targetReduction,
          timestamp,
        });
      } else {
        ok = true;
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_SHADOW_MARKET action (AF-78)
  if ((action as any).type === "ESTABLISH_SHADOW_MARKET") {
    const { shadowMarketId, roomId, syndicateId, cost, timestamp } = action as any;
    const actualCost = cost ?? 500;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === roomId);

    if (!shadowMarketId) {
      rejectionReason = `Shadow market ID is required.`;
    } else if (!roomId) {
      rejectionReason = `Room ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!isValidRoom) {
      rejectionReason = `Room ${roomId} is not a valid room in the content pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to establish shadow market costing ${actualCost} (requires ${actualCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      const shadowMarkets = { ...(state.shadowMarkets || {}) };
      shadowMarkets[shadowMarketId] = {
        id: shadowMarketId,
        roomId,
        syndicateId,
        timestamp,
      };
      newState.shadowMarkets = shadowMarkets;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Shadow market ${shadowMarketId} was established in room ${roomId} by agent ${agentId} for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "shadow_market_established",
        agentId,
        syndicateId,
        shadowMarketId,
        roomId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized LAUNCH_ARBITRAGE_CONTRACT action (AF-78)
  if ((action as any).type === "LAUNCH_ARBITRAGE_CONTRACT") {
    const { contractId, syndicateId, startRoomId, endRoomId, profitSpread, cost, timestamp } = action as any;
    const actualCost = cost ?? 300;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isStartRoomValid = (pack as any).rooms?.some((r: any) => r.id === startRoomId);
    const isEndRoomValid = (pack as any).rooms?.some((r: any) => r.id === endRoomId);

    if (!contractId) {
      rejectionReason = `Contract ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!startRoomId || !endRoomId) {
      rejectionReason = `Start and End Room IDs are required.`;
    } else if (!isStartRoomValid || !isEndRoomValid) {
      rejectionReason = `Start or End Room is not valid in the content pack.`;
    } else if (profitSpread <= 0) {
      rejectionReason = `Profit spread must be a positive number.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to launch arbitrage contract costing ${actualCost} (requires ${actualCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      const arbitrageContracts = { ...(state.arbitrageContracts || {}) };
      arbitrageContracts[contractId] = {
        id: contractId,
        syndicateId,
        startRoomId,
        endRoomId,
        profitSpread,
        status: "active" as const,
        progress: 0,
        duration: 3,
        timestamp,
      };
      newState.arbitrageContracts = arbitrageContracts;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Arbitrage contract ${contractId} was launched between ${startRoomId} and ${endRoomId} by agent ${agentId} with spread ${profitSpread}.`);

      customEvents.push({
        type: "arbitrage_contract_launched",
        agentId,
        syndicateId,
        contractId,
        startRoomId,
        endRoomId,
        profitSpread,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized SABOTAGE_UNDERWRITER action (AF-78)
  if ((action as any).type === "SABOTAGE_UNDERWRITER") {
    const { roomId, targetSyndicateId, cost, timestamp } = action as any;
    const actualCost = cost ?? 300;

    let ok = false;
    let rejectionReason: string | undefined;

    const targetSyndicate = state.syndicates?.[targetSyndicateId];
    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === roomId);

    if (!roomId) {
      rejectionReason = `Room ID is required.`;
    } else if (!targetSyndicateId) {
      rejectionReason = `Target Syndicate ID is required.`;
    } else if (!isValidRoom) {
      rejectionReason = `Room ${roomId} is not valid in the content pack.`;
    } else if (!targetSyndicate) {
      rejectionReason = `Target Syndicate ${targetSyndicateId} does not exist.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to execute underwriter sabotage costing ${actualCost} (requires ${actualCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      // Set enforcer defense policies to active = false (disabled) dynamically
      if (newState.syndicateBribes?.[roomId]) {
        newState.syndicateBribes = {
          ...newState.syndicateBribes,
          [roomId]: {
            ...newState.syndicateBribes[roomId],
            active: false,
          },
        };
      }
      if (newState.deflectionPolicies?.[roomId]) {
        newState.deflectionPolicies = {
          ...newState.deflectionPolicies,
          [roomId]: {
            ...newState.deflectionPolicies[roomId],
            active: false,
          },
        };
      }

      // Also set any active smugglingInsurance or convoyInsurance to inactive/disabled
      if (newState.smugglingInsurance?.[roomId]) {
        newState.smugglingInsurance = {
          ...newState.smugglingInsurance,
          [roomId]: {
            ...newState.smugglingInsurance[roomId],
            active: false,
          } as any,
        };
      }

      // Record sabotage in underwriterSabotages
      const underwriterSabotages = { ...(state.underwriterSabotages || {}) };
      const sabotageId = `sabotage_${roomId}_${targetSyndicateId}`;
      underwriterSabotages[sabotageId] = {
        id: sabotageId,
        roomId,
        targetSyndicateId,
        timestamp,
        active: true,
      };
      newState.underwriterSabotages = underwriterSabotages;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Sabotage] Agent ${agentId} executed underwriter sabotage in room ${roomId} against syndicate ${targetSyndicateId}, disabling active sweeps/audits enforcer defense policies dynamically.`);

      customEvents.push({
        type: "underwriter_sabotaged",
        agentId,
        roomId,
        targetSyndicateId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_BLACK_OPS_SAFEHOUSE action (AF-79)
  if ((action as any).type === "ESTABLISH_BLACK_OPS_SAFEHOUSE") {
    const { safehouseId, roomId, syndicateId, cost, timestamp } = action as any;
    const actualCost = cost ?? 1000;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isValidRoom = (pack as any).rooms?.some((r: any) => r.id === roomId);

    if (!safehouseId) {
      rejectionReason = `Safehouse ID is required.`;
    } else if (!roomId) {
      rejectionReason = `Room ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!isValidRoom) {
      rejectionReason = `Room ${roomId} is not a valid room in the content pack.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to establish black ops safehouse costing ${actualCost} (requires ${actualCost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      const blackOpsSafehouses = { ...(state.blackOpsSafehouses || {}) };
      blackOpsSafehouses[safehouseId] = {
        id: safehouseId,
        roomId,
        syndicateId,
        timestamp,
        active: true,
      };
      newState.blackOpsSafehouses = blackOpsSafehouses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[BlackOps] Black Ops Safehouse ${safehouseId} was established in room ${roomId} by agent ${agentId} for syndicate ${syndicateId}.`);

      customEvents.push({
        type: "black_ops_safehouse_established",
        agentId,
        syndicateId,
        safehouseId,
        roomId,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickEconomy(newState, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized PROPOSE_SHADOW_ALLIANCE action (AF-79)
  if ((action as any).type === "PROPOSE_SHADOW_ALLIANCE") {
    const { syndicateId, factionId, targetState, timestamp } = action as any;
    const pairKey = `${syndicateId}:${factionId}`;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId || !factionId) {
      rejectionReason = `Both syndicateId and factionId are required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (targetState && !["allied", "hostile", "neutral"].includes(targetState)) {
      rejectionReason = `Proposed alliance state ${targetState} must be allied, hostile, or neutral.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    if (ok) {
      const shadowAllianceVotes = { ...(state.shadowAllianceVotes || {}) };
      if (!shadowAllianceVotes[pairKey]) {
        shadowAllianceVotes[pairKey] = {};
      } else {
        shadowAllianceVotes[pairKey] = { ...shadowAllianceVotes[pairKey] };
      }

      const votedState = targetState ?? "allied";

      const existingVote = shadowAllianceVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        shadowAllianceVotes[pairKey][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.shadowAllianceVotes = shadowAllianceVotes;
        newState = reconcileShadowAlliances(newState, pack);
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? [{ type: "shadow_alliance_proposed", syndicateId, factionId, targetState: targetState ?? "allied", voter: agentId } as any]
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized INFILTRATE_ENFORCER_SWEEP action (AF-79)
  if ((action as any).type === "INFILTRATE_ENFORCER_SWEEP") {
    const { syndicateId, cost, timestamp } = action as any;
    const actualCost = cost ?? 200;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to launch enforcer infiltration sweep.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < actualCost) {
        rejectionReason = `Insufficient gold to execute infiltration sweep costing ${actualCost} (has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - actualCost,
      };

      // Expose/neutralize active undercover agents in this syndicate
      newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
      const agentsToNeutralize = Object.values(newState.undercoverAgents).filter(
        a => a.syndicateId === syndicateId && a.status === "active"
      );

      if (!newState.journal) newState.journal = [];

      if (agentsToNeutralize.length > 0) {
        for (const agent of agentsToNeutralize) {
          newState.undercoverAgents[agent.id] = {
            ...agent,
            status: "rooted_out" as const,
            timestamp,
          };
          newState.journal.push(`[EnforcerSweep] Infiltration sweep by syndicate ${syndicateId} located and neutralized undercover agent ${agent.name}!`);
          customEvents.push({
            type: "undercover_agent_neutralized",
            agentId,
            syndicateId,
            targetAgentId: agent.id,
            name: agent.name,
            timestamp,
          });
        }
      } else {
        newState.journal.push(`[EnforcerSweep] Infiltration sweep by syndicate ${syndicateId} found no active undercover enforcer agents.`);
        customEvents.push({
          type: "enforcer_sweep_infiltrated_clean",
          agentId,
          syndicateId,
          timestamp,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CONSTRUCT_HIDDEN_PASSAGE action (AF-81)
  if ((action as any).type === "CONSTRUCT_HIDDEN_PASSAGE") {
    const { passageId, syndicateId, fromRoomId, toRoomId, timestamp } = action as any;
    const defaultCost = 200;
    const cost = (action as any).cost ?? (action as any).goldCost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!passageId) {
      rejectionReason = `Passage ID is required to construct a hidden passage.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to construct a hidden passage.`;
    } else if (!fromRoomId) {
      rejectionReason = `From Room ID is required to construct a hidden passage.`;
    } else if (!toRoomId) {
      rejectionReason = `To Room ID is required to construct a hidden passage.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Passage construction cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!findRoom(state, pack, fromRoomId)) {
      rejectionReason = `Room ${fromRoomId} does not exist.`;
    } else if (!findRoom(state, pack, toRoomId)) {
      rejectionReason = `Room ${toRoomId} does not exist.`;
    } else if (state.hiddenPassages?.[passageId]) {
      rejectionReason = `Hidden passage ${passageId} already exists.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to construct hidden passage costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Add hidden passage
      newState.hiddenPassages = {
        ...(state.hiddenPassages || {}),
        [passageId]: {
          id: passageId,
          syndicateId,
          fromRoomId,
          toRoomId,
          cost,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Constructed hidden passage ${passageId} for syndicate ${syndicateId} from ${fromRoomId} to ${toRoomId} costing ${cost} gold.`);

      customEvents.push({
        type: "hidden_passage_constructed",
        agentId,
        passageId,
        syndicateId,
        fromRoomId,
        toRoomId,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized INFILTRATE_FACTION_NETWORK action (AF-81)
  if ((action as any).type === "INFILTRATE_FACTION_NETWORK") {
    const { syndicateId, factionId, timestamp } = action as any;
    const defaultCost = 150;
    const cost = (action as any).cost ?? (action as any).goldCost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const infiltrationId = `${syndicateId}:${factionId}`;

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to infiltrate faction network.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to infiltrate faction network.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Infiltration cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (state.factionInfiltrations?.[infiltrationId]) {
      rejectionReason = `Faction network ${factionId} is already infiltrated by syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to infiltrate faction network costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Add infiltration
      newState.factionInfiltrations = {
        ...(state.factionInfiltrations || {}),
        [infiltrationId]: {
          id: infiltrationId,
          syndicateId,
          factionId,
          cost,
          dominanceBonus: 15,
          timestamp,
        },
      };

      // Increase dominance by 15
      if (newState.syndicates?.[syndicateId]) {
        const synd = newState.syndicates[syndicateId];
        newState.syndicates = {
          ...newState.syndicates,
          [syndicateId]: {
            ...synd,
            dominance: (synd.dominance ?? 50) + 15,
          },
        };
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Infiltrated faction network ${factionId} for syndicate ${syndicateId} costing ${cost} gold, increasing dominance by 15.`);

      customEvents.push({
        type: "faction_network_infiltrated",
        agentId,
        syndicateId,
        factionId,
        cost,
        dominanceBonus: 15,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEPOSIT_SYNDICATE_BANK action (AF-81)
  if ((action as any).type === "DEPOSIT_SYNDICATE_BANK") {
    const { syndicateId, agentId: actionAgentId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to deposit into syndicate bank.`;
    } else if (!actionAgentId) {
      rejectionReason = `Agent ID is required to deposit into syndicate bank.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Deposit amount ${amount} must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(actionAgentId)) {
      rejectionReason = `Agent ${actionAgentId} is not a member of syndicate ${syndicateId} and cannot deposit.`;
    } else if (agentId !== actionAgentId) {
      rejectionReason = `Agent ${agentId} cannot deposit on behalf of ${actionAgentId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      const bank = state.syndicateBanks?.[syndicateId];
      const bankCap = getSyndicateBankCapacity(state, syndicateId);
      const totalBalances = bank ? Object.values(bank.balances as Record<string, number>).reduce((a, b) => a + b, 0) : 0;
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to deposit ${amount} into syndicate bank (requires ${amount}, has ${currentGold}).`;
      } else if (totalBalances + amount > bankCap) {
        rejectionReason = `Syndicate bank deposit capacity exceeded (requires capacity for ${totalBalances + amount}, capacity is ${bankCap}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold from agent
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      // Deposit into bank
      const bank = {
        ...(state.syndicateBanks?.[syndicateId] || {
          syndicateId,
          balances: {} as Record<string, number>,
          timestamp,
        }),
      };
      const balances = { ...(bank.balances as Record<string, number>) };
      balances[agentId] = (balances[agentId] ?? 0) + amount;
      bank.balances = balances;
      bank.timestamp = timestamp;

      newState.syndicateBanks = {
        ...(state.syndicateBanks || {}),
        [syndicateId]: bank,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} deposited ${amount} gold into syndicate ${syndicateId} bank.`);

      customEvents.push({
        type: "syndicate_bank_deposited",
        agentId,
        syndicateId,
        amount,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized WITHDRAW_SYNDICATE_BANK action (AF-86)
  if ((action as any).type === "WITHDRAW_SYNDICATE_BANK") {
    const { syndicateId, agentId: actionAgentId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const balances = bank?.balances as Record<string, number> | undefined;
    const currentBalance = balances?.[actionAgentId] ?? 0;

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to withdraw from syndicate bank.`;
    } else if (!actionAgentId) {
      rejectionReason = `Agent ID is required to withdraw from syndicate bank.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Withdrawal amount ${amount} must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (agentId !== actionAgentId) {
      rejectionReason = `Agent ${agentId} cannot withdraw on behalf of ${actionAgentId}.`;
    } else if (currentBalance < amount) {
      rejectionReason = `Insufficient balance to withdraw ${amount} from syndicate bank (has ${currentBalance}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && syndicate) {
      const isMember = syndicate.members.includes(actionAgentId);
      const tariff = isMember ? 0 : (bank.withdrawalTariff ?? 0);
      const paidTariff = Math.min(amount, tariff);
      const netAmount = amount - paidTariff;

      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct full amount from bank balance
      const newBalances = { ...(bank.balances as Record<string, number>) };
      newBalances[actionAgentId] = currentBalance - amount;

      const updatedBank = {
        ...bank,
        balances: newBalances,
        timestamp,
      };
      newState.syndicateBanks = {
        ...(state.syndicateBanks || {}),
        [syndicateId]: updatedBank,
      };

      // Add net amount to agent's gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold + netAmount,
      };

      // If tariff paid, distribute to syndicate members!
      if (paidTariff > 0) {
        const members = syndicate.members ?? [];
        const share = members.length > 0 ? Math.floor(paidTariff / members.length) : 0;
        if (share > 0) {
          for (const member of members) {
            const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
            newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
          }
        }
      }

      if (!newState.journal) newState.journal = [];
      if (paidTariff > 0) {
        newState.journal.push(`[Syndicate Bank] Non-member Agent ${agentId} withdrew ${amount} gold from syndicate ${syndicateId} bank. Charged ${paidTariff} withdrawal tariff (distributed to members). Net gold received: ${netAmount}.`);
      } else {
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} withdrew ${amount} gold from syndicate ${syndicateId} bank.`);
      }

      customEvents.push({
        type: "syndicate_bank_withdrawn" as any,
        agentId,
        syndicateId,
        amount,
        netAmount,
        paidTariff,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_BANK_VAULT action (AF-86)
  if ((action as any).type === "UPGRADE_BANK_VAULT") {
    const { syndicateId, cost: costParam, timestamp } = action as any;
    const cost = costParam ?? 300;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to upgrade bank vault.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Bank vault upgrade cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot upgrade bank vault.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to upgrade bank vault (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const existingBank = (bank || {
        syndicateId,
        balances: {} as Record<string, number>,
        timestamp,
      }) as any;

      const nextUpgradeLevel = (existingBank.vaultUpgradeLevel ?? 0) + 1;
      const syndicateBanks = { ...(state.syndicateBanks || {}) };
      syndicateBanks[syndicateId] = {
        ...existingBank,
        vaultUpgradeLevel: nextUpgradeLevel,
        timestamp,
      };
      newState.syndicateBanks = syndicateBanks;

      // Recalculate dynamic capacity
      const newCap = getSyndicateBankCapacity(newState, syndicateId);

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate Bank] Agent ${agentId} upgraded Syndicate ${syndicateId} Bank Vault to level ${nextUpgradeLevel} for ${cost} gold. New capacity: ${newCap}.`);

      customEvents.push({
        type: "narration",
        text: `🏦 Syndicate bank vault upgraded to level ${nextUpgradeLevel}! Capacity expanded to ${newCap} gold.`,
      } as any);

      customEvents.push({
        type: "syndicate_bank_vault_upgraded" as any,
        syndicateId,
        vaultLevel: nextUpgradeLevel,
        newCapacity: newCap,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_WITHDRAWAL_TARIFF action (AF-86)
  if ((action as any).type === "ESTABLISH_WITHDRAWAL_TARIFF") {
    const { syndicateId, tariffAmount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish withdrawal tariff.`;
    } else if (tariffAmount === undefined || tariffAmount < 0 || !Number.isInteger(tariffAmount)) {
      rejectionReason = `Withdrawal tariff rate must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot establish withdrawal tariff.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const existingBank = (bank || {
        syndicateId,
        balances: {} as Record<string, number>,
        timestamp,
      }) as any;

      const syndicateBanks = { ...(state.syndicateBanks || {}) };
      syndicateBanks[syndicateId] = {
        ...existingBank,
        withdrawalTariff: tariffAmount,
        timestamp,
      };
      newState.syndicateBanks = syndicateBanks;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate Bank] Agent ${agentId} established withdrawal tariff of ${tariffAmount} gold for syndicate ${syndicateId} bank.`);

      customEvents.push({
        type: "narration",
        text: `💰 Withdrawal tariff of ${tariffAmount} gold has been established for syndicate ${syndicateId} bank for non-members.`,
      } as any);

      customEvents.push({
        type: "withdrawal_tariff_established" as any,
        syndicateId,
        tariffAmount,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_INTEREST_RATE action (AF-86)
  if ((action as any).type === "VOTE_INTEREST_RATE") {
    const { syndicateId, rate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to vote on interest rate.`;
    } else if (rate === undefined || rate < 0 || !Number.isInteger(rate)) {
      rejectionReason = `Proposed interest rate must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on interest rate.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const bankInterestVotes = { ...(state.bankInterestVotes || {}) };
      if (!bankInterestVotes[syndicateId]) {
        bankInterestVotes[syndicateId] = {};
      } else {
        bankInterestVotes[syndicateId] = { ...bankInterestVotes[syndicateId] };
      }

      const existingVote = bankInterestVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        bankInterestVotes[syndicateId][agentId] = {
          rate,
          timestamp,
        };
        newState.bankInterestVotes = bankInterestVotes;
        newState = reconcileBankInterestRates(newState, pack);

        const newInterestRate = newState.bankInterestPolicies?.[syndicateId] ?? 0;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} voted for interest rate ${rate}% in syndicate ${syndicateId}. Reconciled rate is now ${newInterestRate}%.`);

        customEvents.push({
          type: "narration",
          text: `🗳️ Interest rate vote cast by ${agentId} for ${rate}%. Reconciled rate is now ${newInterestRate}% per tick.`,
        } as any);

        customEvents.push({
          type: "bank_interest_voted" as any,
          syndicateId,
          agentId,
          rate,
          reconciledRate: newInterestRate,
          timestamp,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized MINT_COUNTERFEIT_GOLD action (AF-82)
  if ((action as any).type === "MINT_COUNTERFEIT_GOLD") {
    const { syndicateId, agentId: actionAgentId, amount, cost: actionCost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cost = actionCost ?? Math.ceil(amount * 0.3); // Default cost is 30% of minted amount

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to mint counterfeit gold.`;
    } else if (!actionAgentId) {
      rejectionReason = `Agent ID is required to mint counterfeit gold.`;
    } else if (amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Mint amount ${amount} must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(actionAgentId)) {
      rejectionReason = `Agent ${actionAgentId} is not a member of syndicate ${syndicateId} and cannot mint.`;
    } else if (agentId !== actionAgentId) {
      rejectionReason = `Agent ${agentId} cannot mint on behalf of ${actionAgentId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentRealGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentRealGold < cost) {
        rejectionReason = `Insufficient real gold to mint ${amount} counterfeit gold (requires ${cost} real gold, has ${currentRealGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const counterfeitGoldKey = agentId === "player" ? "counterfeit_gold" : `counterfeit_gold_${agentId}`;

      const currentRealGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      const currentCounterfeit = state.vars[counterfeitGoldKey] ?? 0;

      // Deduct real gold cost and add counterfeit gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentRealGold - cost,
        [counterfeitGoldKey]: currentCounterfeit + amount,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} minted ${amount} counterfeit gold at a cost of ${cost} real gold.`);

      customEvents.push({
        type: "counterfeit_gold_minted",
        agentId,
        syndicateId,
        amount,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized TRADE_EXCHANGE_RATE action (AF-82)
  if ((action as any).type === "TRADE_EXCHANGE_RATE") {
    const { syndicateId, baseRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to set trade exchange rate.`;
    } else if (baseRate <= 0) {
      rejectionReason = `Base rate ${baseRate} must be positive.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot set exchange rate.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      newState.tradeExchangeRates = {
        ...(state.tradeExchangeRates || {}),
        [syndicateId]: {
          syndicateId,
          baseRate,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} of syndicate ${syndicateId} established a base black-market exchange rate of ${baseRate}.`);

      customEvents.push({
        type: "trade_exchange_rate_established",
        agentId,
        syndicateId,
        baseRate,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_AUDIT_MITIGATION action (AF-82)
  if ((action as any).type === "ESTABLISH_AUDIT_MITIGATION") {
    const { roomId, syndicateId, cost: actionCost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cost = actionCost ?? 150; // Default cost is 150 gold

    if (!roomId) {
      rejectionReason = `Room ID is required to establish audit mitigation.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish audit mitigation.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot establish audit mitigation.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentRealGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentRealGold < cost) {
        rejectionReason = `Insufficient gold to establish audit mitigation policy costing ${cost} (requires ${cost}, has ${currentRealGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentRealGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold cost
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentRealGold - cost,
      };

      const existingMitigation = state.auditMitigations?.[roomId];
      const nextLevel = (existingMitigation?.mitigationLevel ?? 0) + 1;

      newState.auditMitigations = {
        ...(state.auditMitigations || {}),
        [roomId]: {
          roomId,
          syndicateId,
          mitigationLevel: nextLevel,
          timestamp,
          active: true,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} of syndicate ${syndicateId} established audit mitigation level ${nextLevel} in ${roomId} costing ${cost} gold.`);

      customEvents.push({
        type: "audit_mitigation_established",
        agentId,
        syndicateId,
        roomId,
        mitigationLevel: nextLevel,
        cost,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const clonedPriorState = cloneStateWithoutHistory(state);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized APPOINT_SMUGGLING_RINGLEADER action (AF-83)
  if ((action as any).type === "APPOINT_SMUGGLING_RINGLEADER") {
    const { syndicateId, ringleaderId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to appoint a smuggling ringleader.`;
    } else if (!ringleaderId) {
      rejectionReason = `Ringleader ID is required to appoint a smuggling ringleader.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!syndicate.members.includes(ringleaderId)) {
      rejectionReason = `Proposed smuggling ringleader ${ringleaderId} is not a member of syndicate ${syndicateId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const existingRingleader = syndicate.smugglingRingleader;

      newState.syndicates = {
        ...newState.syndicates,
        [syndicateId]: {
          ...syndicate,
          smugglingRingleader: ringleaderId,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] ${agentId} appointed ${ringleaderId} as the smuggling ringleader of syndicate ${syndicateId}.`);

      customEvents.push({
        type: "narration",
        text: `👑 ${ringleaderId} has been appointed as the smuggling ringleader for syndicate ${syndicateId}! They can now coordinate multi-convoy networks.`,
      } as any);

      customEvents.push({
        type: "smuggling_ringleader_appointed" as any,
        syndicateId,
        ringleaderId,
        previousRingleader: existingRingleader,
      } as any);
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_SAFEHOUSE_DEFENSES action (AF-83)
  if ((action as any).type === "UPGRADE_SAFEHOUSE_DEFENSES") {
    const { safehouseId, upgradeCost, timestamp } = action as any;
    const cost = upgradeCost ?? 500;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.blackOpsSafehouses?.[safehouseId];

    if (!safehouseId) {
      rejectionReason = `Safehouse ID is required to upgrade defenses.`;
    } else if (!safehouse) {
      rejectionReason = `Black Ops Safehouse ${safehouseId} does not exist.`;
    } else {
      const syndicateId = safehouse.syndicateId;
      const syndicate = state.syndicates?.[syndicateId];
      if (!syndicate) {
        rejectionReason = `Syndicate ${syndicateId} does not exist.`;
      } else if (!syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade safehouse defenses costing ${cost} (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const nextDefenses = (safehouse.defenses ?? 0) + 1;
      const blackOpsSafehouses = { ...(state.blackOpsSafehouses || {}) };
      blackOpsSafehouses[safehouseId] = {
        ...safehouse,
        defenses: nextDefenses,
        timestamp,
      };
      newState.blackOpsSafehouses = blackOpsSafehouses;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[BlackOps] Agent ${agentId} upgraded Black Ops Safehouse ${safehouseId} defenses to level ${nextDefenses} for ${cost} gold.`);

      customEvents.push({
        type: "narration",
        text: `🛡️ Black Ops Safehouse ${safehouseId} defenses upgraded to level ${nextDefenses}! Contraband is now safer from enforcer sweeps.`,
      } as any);

      customEvents.push({
        type: "safehouse_defenses_upgraded" as any,
        safehouseId,
        syndicateId: safehouse.syndicateId,
        defenses: nextDefenses,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized UPGRADE_SAFEHOUSE_STORAGE action (AF-85)
  if ((action as any).type === "UPGRADE_SAFEHOUSE_STORAGE") {
    const { roomId, cost: costParam, timestamp } = action as any;
    const cost = costParam ?? 150;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to upgrade safehouse storage.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Safehouse storage upgrade cost ${cost} must be a non-negative integer.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate || !syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of the syndicate owning the safehouse in ${roomId}.`;
      } else {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < cost) {
          rejectionReason = `Insufficient gold to upgrade safehouse storage (requires ${cost}, has ${currentGold}).`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const nextUpgradeLevel = (safehouse.storageUpgradeLevel ?? 0) + 1;
      const safehouses = { ...(state.safehouses || {}) };
      safehouses[roomId] = {
        ...safehouse,
        storageUpgradeLevel: nextUpgradeLevel,
        timestamp,
      };
      newState.safehouses = safehouses;

      // Recalculate dynamic capacity
      const newCap = getSafehouseStorageCapacity(newState, roomId);

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Safehouse] Agent ${agentId} upgraded Safehouse in room ${roomId} storage to level ${nextUpgradeLevel} for ${cost} gold. New capacity: ${newCap}.`);

      customEvents.push({
        type: "narration",
        text: `📦 Safehouse storage upgraded to level ${nextUpgradeLevel}! Capacity expanded to ${newCap} contraband items.`,
      } as any);

      customEvents.push({
        type: "safehouse_storage_upgraded" as any,
        roomId,
        syndicateId: safehouse.syndicateId,
        storageLevel: nextUpgradeLevel,
        newCapacity: newCap,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_STORAGE_RENT action (AF-85)
  if ((action as any).type === "ESTABLISH_STORAGE_RENT") {
    const { roomId, rentRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to establish storage rent.`;
    } else if (rentRate === undefined || rentRate < 0 || !Number.isInteger(rentRate)) {
      rejectionReason = `Storage rent rate must be a non-negative integer.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate || !syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of the syndicate owning the safehouse in ${roomId}.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      const safehouses = { ...(state.safehouses || {}) };
      safehouses[roomId] = {
        ...safehouse,
        storageRentRate: rentRate,
        timestamp,
      };
      newState.safehouses = safehouses;

      const safehouseRentPolicies = { ...(state.safehouseRentPolicies || {}) };
      safehouseRentPolicies[roomId] = rentRate;
      newState.safehouseRentPolicies = safehouseRentPolicies;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Safehouse] Agent ${agentId} established storage rent rate of ${rentRate} gold per tick in room ${roomId}.`);

      customEvents.push({
        type: "narration",
        text: `💰 Storage rent rate for safehouse in room ${roomId} has been established at ${rentRate} gold per tick for non-members.`,
      } as any);

      customEvents.push({
        type: "storage_rent_established" as any,
        roomId,
        rentRate,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized VOTE_STORAGE_RENT_RATE action (AF-85)
  if ((action as any).type === "VOTE_STORAGE_RENT_RATE") {
    const { roomId, rate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const safehouse = state.safehouses?.[roomId];

    if (!roomId) {
      rejectionReason = `Room ID is required to vote on storage rent rate.`;
    } else if (rate === undefined || rate < 0 || !Number.isInteger(rate)) {
      rejectionReason = `Proposed storage rent rate must be a non-negative integer.`;
    } else if (!safehouse) {
      rejectionReason = `No safehouse exists in room ${roomId}.`;
    } else {
      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate || !syndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of the syndicate owning the safehouse in ${roomId} and cannot vote.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && safehouse) {
      const safehouseRentVotes = { ...(state.safehouseRentVotes || {}) };
      if (!safehouseRentVotes[roomId]) {
        safehouseRentVotes[roomId] = {};
      } else {
        safehouseRentVotes[roomId] = { ...safehouseRentVotes[roomId] };
      }

      const existingVote = safehouseRentVotes[roomId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        safehouseRentVotes[roomId][agentId] = {
          rate,
          timestamp,
        };
        newState.safehouseRentVotes = safehouseRentVotes;
        newState = reconcileSafehouseRentRates(newState, pack);

        const newRentRate = newState.safehouseRentPolicies?.[roomId] ?? 0;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Safehouse] Agent ${agentId} voted for storage rent rate ${rate} in safehouse ${roomId}. Reconciled rate is now ${newRentRate}.`);

        customEvents.push({
          type: "narration",
          text: `🗳️ Storage rent rate vote cast by ${agentId} for ${rate} gold. Reconciled rate is now ${newRentRate} gold per tick.`,
        } as any);

        customEvents.push({
          type: "safehouse_rent_voted" as any,
          roomId,
          agentId,
          rate,
          reconciledRate: newRentRate,
          timestamp,
        });
      }
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEPLOY_INTERCEPTOR_DECOY action (AF-83)
  if ((action as any).type === "DEPLOY_INTERCEPTOR_DECOY") {
    const { decoyId, syndicateId, routeId, cost: actionCost, timestamp } = action as any;
    const cost = actionCost ?? 300;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const route = state.tradeRoutes?.[routeId];

    if (!decoyId) {
      rejectionReason = `Decoy ID is required to deploy an interceptor decoy.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to deploy an interceptor decoy.`;
    } else if (!routeId) {
      rejectionReason = `Route ID is required to deploy an interceptor decoy.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!route) {
      rejectionReason = `Trade Route ${routeId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to deploy interceptor decoy costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      const interceptorDecoys = { ...(state.interceptorDecoys || {}) };
      interceptorDecoys[decoyId] = {
        id: decoyId,
        syndicateId,
        routeId,
        active: true,
        timestamp,
      };
      newState.interceptorDecoys = interceptorDecoys;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[InterceptorDecoy] Agent ${agentId} deployed Interceptor Decoy ${decoyId} on route ${routeId} costing ${cost} gold.`);

      customEvents.push({
        type: "narration",
        text: `🤫 Interceptor Decoy ${decoyId} deployed on route ${routeId}! It will automatically mislead the next border patrol intercepting your smuggling activities.`,
      } as any);

      customEvents.push({
        type: "interceptor_decoy_deployed" as any,
        decoyId,
        syndicateId,
        routeId,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized CONSTRUCT_CONTRABAND_TUNNEL action (AF-84)
  if ((action as any).type === "CONSTRUCT_CONTRABAND_TUNNEL") {
    const { tunnelId, syndicateId, fromRoomId, toRoomId, timestamp } = action as any;
    const defaultCost = 200;
    const cost = (action as any).cost ?? (action as any).goldCost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!tunnelId) {
      rejectionReason = `Tunnel ID is required to construct a contraband tunnel.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to construct a contraband tunnel.`;
    } else if (!fromRoomId) {
      rejectionReason = `From Room ID is required to construct a contraband tunnel.`;
    } else if (!toRoomId) {
      rejectionReason = `To Room ID is required to construct a contraband tunnel.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Tunnel construction cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!findRoom(state, pack, fromRoomId)) {
      rejectionReason = `Room ${fromRoomId} does not exist.`;
    } else if (!findRoom(state, pack, toRoomId)) {
      rejectionReason = `Room ${toRoomId} does not exist.`;
    } else if (state.contrabandTunnels?.[tunnelId]) {
      rejectionReason = `Contraband tunnel ${tunnelId} already exists.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to construct contraband tunnel costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Add contraband tunnel
      newState.contrabandTunnels = {
        ...(state.contrabandTunnels || {}),
        [tunnelId]: {
          id: tunnelId,
          syndicateId,
          fromRoomId,
          toRoomId,
          cost,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Underground Railroad] Constructed contraband tunnel ${tunnelId} for syndicate ${syndicateId} from ${fromRoomId} to ${toRoomId} costing ${cost} gold.`);

      customEvents.push({
        type: "narration",
        text: `🚇 Contraband Tunnel ${tunnelId} constructed from ${fromRoomId} to ${toRoomId}! Smuggling activities can now bypass surface enforcer sweeps and surface border checkpoints.`,
      } as any);

      customEvents.push({
        type: "contraband_tunnel_constructed" as any,
        agentId,
        tunnelId,
        syndicateId,
        fromRoomId,
        toRoomId,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized ESTABLISH_TUNNEL_TOLL action (AF-84)
  if ((action as any).type === "ESTABLISH_TUNNEL_TOLL") {
    const { tunnelId, syndicateId, tollAmount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const tunnel = state.contrabandTunnels?.[tunnelId];

    if (!tunnelId) {
      rejectionReason = `Tunnel ID is required to establish a tunnel toll.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish a tunnel toll.`;
    } else if (tollAmount < 0 || !Number.isInteger(tollAmount)) {
      rejectionReason = `Tunnel toll amount ${tollAmount} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!tunnel) {
      rejectionReason = `Contraband tunnel ${tunnelId} does not exist.`;
    } else if (tunnel.syndicateId !== syndicateId) {
      rejectionReason = `Contraband tunnel ${tunnelId} is not owned by syndicate ${syndicateId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate && tunnel) {
      newState.tunnelTolls = {
        ...(state.tunnelTolls || {}),
        [tunnelId]: {
          tunnelId,
          syndicateId,
          tollAmount,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Underground Railroad] Established custom tunnel toll of ${tollAmount} gold for contraband tunnel ${tunnelId} owned by syndicate ${syndicateId}.`);

      customEvents.push({
        type: "narration",
        text: `🚇 Custom tunnel toll established for tunnel ${tunnelId}! Non-members will be charged ${tollAmount} gold to traverse this safe passage.`,
      } as any);

      customEvents.push({
        type: "tunnel_toll_established" as any,
        agentId,
        tunnelId,
        syndicateId,
        tollAmount,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
        : [{ type: "rejected", reason: rejectionReason! }],
      ok,
      rejectionReason,
    };
  }

  // Handle decentralized DEPLOY_TUNNEL_DRONE action (AF-84)
  if ((action as any).type === "DEPLOY_TUNNEL_DRONE") {
    const { droneId, syndicateId, tunnelId, cargoCapacity, timestamp } = action as any;
    const defaultCost = 150;
    const cost = (action as any).cost ?? (action as any).goldCost ?? defaultCost;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const tunnel = state.contrabandTunnels?.[tunnelId];

    if (!droneId) {
      rejectionReason = `Drone ID is required to deploy a tunnel drone.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to deploy a tunnel drone.`;
    } else if (!tunnelId) {
      rejectionReason = `Tunnel ID is required to deploy a tunnel drone.`;
    } else if (cargoCapacity < 0 || !Number.isInteger(cargoCapacity)) {
      rejectionReason = `Drone cargo capacity ${cargoCapacity} must be a non-negative integer.`;
    } else if (cost < 0 || !Number.isInteger(cost)) {
      rejectionReason = `Drone deployment cost ${cost} must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if (!tunnel) {
      rejectionReason = `Contraband tunnel ${tunnelId} does not exist.`;
    } else if (tunnel.syndicateId !== syndicateId) {
      rejectionReason = `Contraband tunnel ${tunnelId} is not owned by syndicate ${syndicateId}.`;
    } else if (state.tunnelDrones?.[droneId]) {
      rejectionReason = `Tunnel drone ${droneId} already exists.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < cost) {
        rejectionReason = `Insufficient gold to deploy tunnel drone costing ${cost} (requires ${cost}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate && tunnel) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - cost,
      };

      // Add tunnel drone
      newState.tunnelDrones = {
        ...(state.tunnelDrones || {}),
        [droneId]: {
          id: droneId,
          syndicateId,
          tunnelId,
          cargoCapacity,
          active: true,
          cost,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Underground Railroad] Deployed automated Tunnel Transport Drone ${droneId} in tunnel ${tunnelId} costing ${cost} gold.`);

      customEvents.push({
        type: "narration",
        text: `🛸 Tunnel Transport Drone ${droneId} deployed in tunnel ${tunnelId}! It will automatically transport contraband safely for passive profit.`,
      } as any);

      customEvents.push({
        type: "tunnel_drone_deployed" as any,
        agentId,
        droneId,
        syndicateId,
        tunnelId,
        cargoCapacity,
        cost,
        timestamp,
      });
    }

    newState.step += 1;
    if (ok) {
      newState = tickProductionLabs(newState, customEvents, pack);

      const history = state.stateHistory ? [...state.stateHistory] : [];
      const cloned = cloneStateWithoutHistory(state);
      history.push(cloned);
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

    if (newState.vectorClock) {
      newState.vectorClock = {
        ...newState.vectorClock,
        [agentId]: Math.max(newState.vectorClock[agentId] ?? 0, state.step),
      };
    }

    return {
      state: newState,
      events: ok
        ? customEvents
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
  const stepResult = step(localState, action, pack, agentId);

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
    const clonedPriorState = cloneStateWithoutHistory(state);
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

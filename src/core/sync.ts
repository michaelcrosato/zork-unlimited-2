import { GameState, cloneStateWithoutHistory, AgentState, Transaction, reconcileLootClaims, reconcileTerritories, reconcileTaxPolicies, reconcileAlliances, reconcileTradeRoutes, reconcileTariffPolicies, findRoom, getRoomExits, reconcileGuildPolicies, reconcileCartelPolicies, reconcileSyndicateTurf, reconcileSyndicateTaxes, reconcileSyndicateBribes, reconcileSyndicateWaivers, reconcileEspionageNetworks, reconcileWiretaps, reconcileCartelGlobalTaxes, reconcileSmugglerGuildCbas, reconcileSyndicateAlliances, reconcileFactionWars, reconcileCovertCells, reconcilePropagandaCampaigns, reconcileEnforcerDefunding, reconcileShadowAlliances, reconcileTariffExemptions, reconcileSafehouseRentRates, getSafehouseStorageCapacity, getSyndicateBankCapacity, reconcileBankInterestRates, getSyndicateLoanLimit, isCollateralLocked, reconcileLoanRefinancings, reconcileDebtSettlements, getJointLoanLimit, getCollateralValue, reconcileJointLoanRefinancings, reconcileJointLoanCollateralSubstitutions, reconcileIndividualLoanCollateralSwaps, reconcileJointLoanDebtSettlements, reconcileJointLoanCollateralSwaps, reconcileJointLoanGracePeriods, reconcileJointLoanPenaltyWaivers, reconcileJointLoanUnderwrites, reconcileReinsurancePools, reconcileReinsuranceTransfers, reconcileContagionShields, reconcileInterestSubsidies, reconcileReinsuranceCollateral, reconcileReinsuranceRiskRatings, reconcileReinsuranceLiquidityAudits, reconcileReserveRatios, getSecondaryReserveVaults, reconcileCreditDefaultSwaps, reconcileMarginRehypothecations, reconcileMarginRebalancingPolicies, reconcileRebalancingAdvisors, reconcileAdvisorSafetyThresholds, reconcileLockedCollateral, reconcileClaimLiquidityRewards, reconcileFactionSponsors, reconcileSponsorAuditsAndRevocations, reconcileRewardSlashing, reconcileRehabCampaign, reconcileRehabSubsidy, getSyndicateFactionStanding, isFactionAlliedToSyndicate, getSyndicateFactionLoyaltyRank, getRequiredRankForVaultLevel, isRankAtLeast, reconcileClaimLoyaltyRanks, reconcileCooperativeYieldCampaigns, reconcileFactionCdoInsurancePools, reconcileMultiFactionCdoRiskRatings } from "./state.js";
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

      // Access dynamic loyalty rank based on the controlling faction of current room
      const currentRoomId = state.agents?.[agentId]?.current;
      const factionId = currentRoomId ? state.territoryControl?.[currentRoomId] : undefined;
      const rank = factionId ? getSyndicateFactionLoyaltyRank(state, syndicateId, factionId) : "None";
      const requiredRank = getRequiredRankForVaultLevel(bank?.vaultUpgradeLevel ?? 0);

      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to deposit ${amount} into syndicate bank (requires ${amount}, has ${currentGold}).`;
      } else if (totalBalances + amount > bankCap) {
        rejectionReason = `Syndicate bank deposit capacity exceeded (requires capacity for ${totalBalances + amount}, capacity is ${bankCap}).`;
      } else if (!isRankAtLeast(rank, requiredRank)) {
        rejectionReason = `Syndicate's loyalty rank (${rank}) with faction (${factionId}) is too low to access the premium bank vault (requires ${requiredRank}).`;
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
      // Access dynamic loyalty rank based on the controlling faction of current room
      const currentRoomId = state.agents?.[agentId]?.current;
      const factionId = currentRoomId ? state.territoryControl?.[currentRoomId] : undefined;
      const rank = factionId ? getSyndicateFactionLoyaltyRank(state, syndicateId, factionId) : "None";
      const requiredRank = getRequiredRankForVaultLevel(bank?.vaultUpgradeLevel ?? 0);

      if (!isRankAtLeast(rank, requiredRank)) {
        rejectionReason = `Syndicate's loyalty rank (${rank}) with faction (${factionId}) is too low to access the premium bank vault (requires ${requiredRank}).`;
      } else {
        ok = true;
      }
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

  // Handle decentralized BORROW_SYNDICATE_BANK action (AF-87)
  if ((action as any).type === "BORROW_SYNDICATE_BANK") {
    const { syndicateId, amount, collateralType, collateralId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to borrow from bank.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Borrow amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot borrow from bank.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (bank.loans?.[agentId]) {
      rejectionReason = `Agent ${agentId} already has an active loan with syndicate ${syndicateId} bank.`;
    } else if (state.defaultAlerts && Object.values(state.defaultAlerts).some(a => a.agentId === agentId)) {
      rejectionReason = `Agent ${agentId} is blacklisted due to a mesh-wide debt default alert.`;
    } else if (collateralType !== "safehouse" && collateralType !== "outpost") {
      rejectionReason = `Invalid collateral type ${collateralType}. Must be safehouse or outpost.`;
    } else if (!collateralId) {
      rejectionReason = `Collateral ID is required.`;
    } else {
      // Validate collateral existence and ownership/control
      let collateralValid = false;
      if (collateralType === "safehouse") {
        const safehouse = state.safehouses?.[collateralId];
        if (safehouse && (safehouse.syndicateId === syndicateId || safehouse.ownerId === agentId)) {
          collateralValid = true;
        } else {
          rejectionReason = `Safehouse ${collateralId} does not exist or is not owned/controlled by syndicate ${syndicateId} or agent ${agentId}.`;
        }
      } else if (collateralType === "outpost") {
        const outpost = state.turfGuardOutposts?.[collateralId];
        if (outpost && outpost.syndicateId === syndicateId) {
          collateralValid = true;
        } else {
          rejectionReason = `Outpost ${collateralId} does not exist or is not controlled by syndicate ${syndicateId}.`;
        }
      }

      if (collateralValid) {
        if (isCollateralLocked(state, collateralType, collateralId)) {
          rejectionReason = `Collateral ${collateralId} is already locked in another active loan.`;
        } else {
          // Check borrowing limit
          const limit = getSyndicateLoanLimit(state, syndicateId, agentId, collateralType, collateralId);

          // Gate access to premium vaults based on faction loyalty rank of the collateral's room
          const factionId = state.territoryControl?.[collateralId];
          const rank = factionId ? getSyndicateFactionLoyaltyRank(state, syndicateId, factionId) : "None";
          const requiredRank = getRequiredRankForVaultLevel(bank?.vaultUpgradeLevel ?? 0);

          if (amount > limit) {
            rejectionReason = `Requested borrow amount ${amount} exceeds the collateral loan limit of ${limit} gold.`;
          } else if (!isRankAtLeast(rank, requiredRank)) {
            rejectionReason = `Syndicate's loyalty rank (${rank}) with faction (${factionId}) is too low to access the premium bank vault (requires ${requiredRank}).`;
          } else {
            ok = true;
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && syndicate) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Add borrowed gold to agent
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold + amount,
      };

      // Create loan record
      const loan = {
        agentId,
        amount,
        collateralType,
        collateralId,
        interestAccrued: 0,
        borrowStep: state.step,
        dueStep: state.step + 15,
        timestamp,
      };

      const syndicateBanks = { ...(state.syndicateBanks || {}) };
      const loans = { ...(bank.loans || {}) };
      loans[agentId] = loan;
      syndicateBanks[syndicateId] = {
        ...bank,
        loans,
        timestamp,
      };
      newState.syndicateBanks = syndicateBanks;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate Bank] Agent ${agentId} borrowed ${amount} gold from Syndicate ${syndicateId} bank. Collateral: ${collateralType} ${collateralId}. Due at step ${loan.dueStep}.`);

      customEvents.push({
        type: "narration",
        text: `🏦 Agent ${agentId} borrowed ${amount} gold from syndicate bank, locking ${collateralType} in ${collateralId} as collateral.`,
      } as any);

      customEvents.push({
        type: "syndicate_bank_borrowed" as any,
        syndicateId,
        agentId,
        amount,
        collateralType,
        collateralId,
        dueStep: loan.dueStep,
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

  // Handle decentralized PAYBACK_SYNDICATE_BANK action (AF-87)
  if ((action as any).type === "PAYBACK_SYNDICATE_BANK") {
    const { syndicateId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const loan = bank?.loans?.[agentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to pay back bank loan.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Payback amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} does not exist.`;
    } else if (!loan) {
      rejectionReason = `Agent ${agentId} has no active loan with syndicate ${syndicateId} bank.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to payback loan (requires ${amount}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && loan) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold from agent
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      const newLoan = { ...loan };
      let finalAmount = loan.amount;
      let finalInterest = loan.interestAccrued;

      if (amount >= finalInterest) {
        const left = amount - finalInterest;
        finalInterest = 0;
        finalAmount = Math.max(0, finalAmount - left);
      } else {
        finalInterest -= amount;
      }

      newLoan.amount = finalAmount;
      newLoan.interestAccrued = finalInterest;
      newLoan.timestamp = timestamp;

      const syndicateBanks = { ...(state.syndicateBanks || {}) };
      const loans = { ...(bank.loans || {}) };

      if (newLoan.amount === 0) {
        delete loans[agentId];
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} fully paid back loan to Syndicate ${syndicateId} bank. Collateral ${loan.collateralId} is unlocked.`);
        customEvents.push({
          type: "narration",
          text: `🏦 Agent ${agentId} fully paid back bank loan of ${amount} gold. Collateral ${loan.collateralId} has been unlocked.`,
        } as any);
      } else {
        loans[agentId] = newLoan;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} partially paid back ${amount} gold to Syndicate ${syndicateId} bank. Remaining principal: ${newLoan.amount}, interest: ${newLoan.interestAccrued}.`);
        customEvents.push({
          type: "narration",
          text: `🏦 Agent ${agentId} partially paid back bank loan. Paid ${amount} gold. Remaining due: ${newLoan.amount + newLoan.interestAccrued}.`,
        } as any);
      }

      // Increase credit rating
      if (!newState.creditRatings) newState.creditRatings = {};
      const currentRating = newState.creditRatings[agentId] ?? 100;
      const increase = newLoan.amount === 0 ? 15 : 5;
      newState.creditRatings[agentId] = Math.min(200, currentRating + increase);
      newState.journal.push(`[Credit Score] Agent ${agentId} credit rating increased by +${increase} (New Score: ${newState.creditRatings[agentId]}).`);

      syndicateBanks[syndicateId] = {
        ...bank,
        loans,
        timestamp,
      };
      newState.syndicateBanks = syndicateBanks;

      customEvents.push({
        type: "syndicate_bank_paid_back" as any,
        syndicateId,
        agentId,
        amount,
        remainingPrincipal: newLoan.amount,
        remainingInterest: newLoan.interestAccrued,
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

  // Handle decentralized PROPOSE_JOINT_LOAN action (AF-91)
  if ((action as any).type === "PROPOSE_JOINT_LOAN") {
    const { groupId, syndicateId, members, collaterals, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose joint loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!members || !Array.isArray(members) || members.length === 0) {
      rejectionReason = `Members list is required and must be a non-empty array.`;
    } else if (!members.includes(agentId)) {
      rejectionReason = `Sender agent ${agentId} must be a member of the proposed joint loan group.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Borrow amount must be a positive integer.`;
    } else if (state.jointLoans?.[groupId]) {
      rejectionReason = `Joint loan group ${groupId} already exists as an active loan.`;
    } else {
      // Validate members and collaterals if proposal doesn't exist
      const existingProposal = state.jointLoanProposals?.[groupId];
      if (!existingProposal) {
        if (!collaterals || !Array.isArray(collaterals) || collaterals.length === 0) {
          rejectionReason = `Collaterals list is required and must be a non-empty array to propose a new joint loan.`;
        } else {
          // Check that all members are in the syndicate and have no active default alerts
          let membersValid = true;
          for (const memberId of members) {
            if (!syndicate.members.includes(memberId)) {
              rejectionReason = `Member agent ${memberId} is not a member of syndicate ${syndicateId}.`;
              membersValid = false;
              break;
            }
            if (state.defaultAlerts && Object.values(state.defaultAlerts).some(a => a.agentId === memberId)) {
              rejectionReason = `Member agent ${memberId} is blacklisted due to a mesh-wide debt default alert.`;
              membersValid = false;
              break;
            }
            // Check if member already has an active loan (individual or joint)
            if (bank.loans?.[memberId]) {
              rejectionReason = `Member agent ${memberId} already has an active individual loan.`;
              membersValid = false;
              break;
            }
          }

          if (membersValid) {
            // Check collaterals
            let collateralsValid = true;
            for (const col of collaterals) {
              if (!col.agentId || !col.collateralType || !col.collateralId) {
                rejectionReason = `Invalid collateral entry: agentId, collateralType, and collateralId are required.`;
                collateralsValid = false;
                break;
              }
              if (!members.includes(col.agentId)) {
                rejectionReason = `Collateral owner ${col.agentId} is not a member of the joint loan group.`;
                collateralsValid = false;
                break;
              }
              if (col.collateralType === "safehouse") {
                const safehouse = state.safehouses?.[col.collateralId];
                if (!safehouse || (safehouse.syndicateId !== syndicateId && safehouse.ownerId !== col.agentId)) {
                  rejectionReason = `Safehouse ${col.collateralId} does not exist or is not owned/controlled by syndicate ${syndicateId} or agent ${col.agentId}.`;
                  collateralsValid = false;
                  break;
                }
              } else if (col.collateralType === "outpost") {
                const outpost = state.turfGuardOutposts?.[col.collateralId];
                if (!outpost || outpost.syndicateId !== syndicateId) {
                  rejectionReason = `Outpost ${col.collateralId} does not exist or is not controlled by syndicate ${syndicateId}.`;
                  collateralsValid = false;
                  break;
                }
              } else {
                rejectionReason = `Invalid collateral type ${col.collateralType}.`;
                collateralsValid = false;
                break;
              }

              if (isCollateralLocked(state, col.collateralType, col.collateralId)) {
                rejectionReason = `Collateral ${col.collateralId} is already locked in another active loan or proposal.`;
                collateralsValid = false;
                break;
              }
            }

            if (collateralsValid) {
              // Check joint loan limit
              const limit = getJointLoanLimit(state, syndicateId, members, collaterals, groupId);
              if (amount > limit) {
                rejectionReason = `Requested joint loan amount ${amount} exceeds the collective collateral loan limit of ${limit} gold (with 1.2x group bonus).`;
              } else {
                ok = true;
              }
            }
          }
        }
      } else {
        // Proposal already exists! Check if sender is in members and hasn't approved yet
        if (!existingProposal.members.includes(agentId)) {
          rejectionReason = `Sender agent ${agentId} is not a member of the existing joint loan proposal ${groupId}.`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      if (!newState.jointLoanProposals) newState.jointLoanProposals = {};
      const proposals = { ...newState.jointLoanProposals };

      let proposal = proposals[groupId];
      if (!proposal) {
        // Create new proposal
        proposal = {
          id: groupId,
          syndicateId,
          members,
          collaterals,
          amount,
          timestamp,
          approvals: { [agentId]: true },
        };
      } else {
        // Approve existing proposal
        proposal = {
          ...proposal,
          approvals: {
            ...proposal.approvals,
            [agentId]: true,
          },
          timestamp,
        };
      }

      // Check if all members have approved
      const allApproved = proposal.members.every((m: string) => proposal.approvals[m] === true);

      if (allApproved) {
        // Fund the loan!
        // Calculate collateral values for proportional distribution
        let totalCollateralValue = 0;
        const collateralValues: Record<string, number> = {};
        for (const col of proposal.collaterals) {
          const val = getCollateralValue(newState, col.collateralType, col.collateralId);
          collateralValues[`${col.agentId}_${col.collateralId}`] = val;
          totalCollateralValue += val;
        }

        // Calculate proportional liability / gold distribution
        const proportions: Record<string, number> = {};
        for (const mId of proposal.members) {
          let agentCollateralValue = 0;
          for (const col of proposal.collaterals) {
            if (col.agentId === mId) {
              agentCollateralValue += collateralValues[`${col.agentId}_${col.collateralId}`] ?? 0;
            }
          }
          proportions[mId] = totalCollateralValue > 0 ? (agentCollateralValue / totalCollateralValue) : (1 / proposal.members.length);
        }

        // Distribute gold to members
        let distributedSum = 0;
        if (!newState.vars) newState.vars = {};
        newState.vars = { ...newState.vars };

        for (let i = 0; i < proposal.members.length; i++) {
          const mId = proposal.members[i];
          const goldKey = mId === "player" ? "gold" : `gold_${mId}`;
          const currentGold = newState.vars[goldKey] ?? (mId === "player" ? 0 : 100);

          let share = 0;
          if (i === proposal.members.length - 1) {
            share = amount - distributedSum;
          } else {
            share = Math.floor(amount * proportions[mId]);
            distributedSum += share;
          }

          newState.vars[goldKey] = currentGold + share;
        }

        // Move to active joint loans
        if (!newState.jointLoans) newState.jointLoans = {};
        const jointLoans = { ...newState.jointLoans };

        jointLoans[groupId] = {
          id: groupId,
          syndicateId,
          members: proposal.members,
          collaterals: proposal.collaterals,
          amount,
          interestAccrued: 0,
          borrowStep: newState.step,
          dueStep: newState.step + 15,
          timestamp,
        };

        newState.jointLoans = jointLoans;
        delete proposals[groupId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Joint loan group ${groupId} has been fully approved by members [${proposal.members.join(", ")}] and funded with ${amount} gold. Pledged collaterals locked.`);

        customEvents.push({
          type: "narration",
          text: `🏦 Joint liability loan ${groupId} has been fully approved by all members and funded! ${amount} gold distributed.`,
        } as any);

        customEvents.push({
          type: "joint_loan_funded" as any,
          groupId,
          syndicateId,
          amount,
          members: proposal.members,
          timestamp,
        });
      } else {
        // Save proposal back
        proposals[groupId] = proposal;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} approved joint loan proposal ${groupId}. Approvals: ${Object.keys(proposal.approvals).length}/${proposal.members.length}.`);

        customEvents.push({
          type: "narration",
          text: `🏦 Agent ${agentId} approved joint liability loan proposal ${groupId}. Approvals: ${Object.keys(proposal.approvals).length}/${proposal.members.length}.`,
        } as any);
      }

      newState.jointLoanProposals = proposals;
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

  // Handle decentralized PAYBACK_JOINT_LOAN action (AF-91)
  if ((action as any).type === "PAYBACK_JOINT_LOAN") {
    const { groupId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];

    if (!groupId) {
      rejectionReason = `Group ID is required to payback joint loan.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Payback amount must be a positive integer.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < amount) {
        rejectionReason = `Insufficient gold to payback joint loan (requires ${amount}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct gold from agent
      if (!newState.vars) newState.vars = {};
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - amount,
      };

      const newJointLoan = { ...jointLoan };
      let finalAmount = jointLoan.amount;
      let finalInterest = jointLoan.interestAccrued;

      if (amount >= finalInterest) {
        const left = amount - finalInterest;
        finalInterest = 0;
        finalAmount = Math.max(0, finalAmount - left);
      } else {
        finalInterest -= amount;
      }

      newJointLoan.amount = finalAmount;
      newJointLoan.interestAccrued = finalInterest;
      newJointLoan.timestamp = timestamp;

      const jointLoans = { ...(state.jointLoans || {}) };

      if (newJointLoan.amount === 0) {
        delete jointLoans[groupId];
        if (newState.jointLoanUnderwrites) {
          newState.jointLoanUnderwrites = { ...newState.jointLoanUnderwrites };
          delete newState.jointLoanUnderwrites[groupId];
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Joint loan ${groupId} fully paid back! Pledged collaterals [${jointLoan.collaterals.map(c => c.collateralId).join(", ")}] are unlocked.`);
        customEvents.push({
          type: "narration",
          text: `🏦 Joint loan ${groupId} has been fully paid back. Pledged collaterals are unlocked!`,
        } as any);

        // Increase credit rating for ALL members
        if (!newState.creditRatings) newState.creditRatings = {};
        newState.creditRatings = { ...newState.creditRatings };
        for (const mId of jointLoan.members) {
          const currentRating = newState.creditRatings[mId] ?? 100;
          newState.creditRatings[mId] = Math.min(200, currentRating + 15);
          newState.journal.push(`[Credit Score] Agent ${mId} credit rating increased by +15 (New Score: ${newState.creditRatings[mId]}).`);
        }
      } else {
        // Wire pro-rata collateral release on partial loan paybacks when remaining balance is fully covered by remaining collateral.
        let collateralsChanged = false;
        let currentCollaterals = [...newJointLoan.collaterals];

        for (let i = 0; i < currentCollaterals.length; i++) {
          const candidate = currentCollaterals[i];
          const remaining = currentCollaterals.filter((_, idx) => idx !== i);
          
          if (remaining.length > 0) {
            const remainingLimit = getJointLoanLimit(newState, newJointLoan.syndicateId, newJointLoan.members, remaining, newJointLoan.id);
            const outstanding = newJointLoan.amount + newJointLoan.interestAccrued;
            
            if (remainingLimit >= outstanding) {
              if (!newState.journal) newState.journal = [];
              newState.journal.push(`[Syndicate Bank] Collateral ${candidate.collateralId} (${candidate.collateralType}) owned by ${candidate.agentId} has been released early from joint loan ${groupId} via pro-rata payback coverage.`);
              customEvents.push({
                type: "narration",
                text: `🏦 Collateral ${candidate.collateralId} (${candidate.collateralType}) has been released early from joint loan ${groupId} due to pro-rata payback coverage.`,
              } as any);
              currentCollaterals = remaining;
              i = -1; // reset loop to check other remaining collaterals
              collateralsChanged = true;
            }
          }
        }

        if (collateralsChanged) {
          newJointLoan.collaterals = currentCollaterals;
        }

        jointLoans[groupId] = newJointLoan;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} partially paid back ${amount} gold to joint loan ${groupId}. Remaining principal: ${newJointLoan.amount}, interest: ${newJointLoan.interestAccrued}.`);
        customEvents.push({
          type: "narration",
          text: `🏦 Agent ${agentId} partially paid back ${amount} gold to joint loan ${groupId}.`,
        } as any);

        // Increase credit rating for the payer
        if (!newState.creditRatings) newState.creditRatings = {};
        newState.creditRatings = { ...newState.creditRatings };
        const currentRating = newState.creditRatings[agentId] ?? 100;
        newState.creditRatings[agentId] = Math.min(200, currentRating + 5);
        newState.journal.push(`[Credit Score] Agent ${agentId} credit rating increased by +5 (New Score: ${newState.creditRatings[agentId]}).`);
      }

      newState.jointLoans = jointLoans;

      customEvents.push({
        type: "joint_loan_paid_back" as any,
        groupId,
        fullyPaid: newJointLoan.amount === 0,
        amount,
        remainingPrincipal: newJointLoan.amount,
        remainingInterest: newJointLoan.interestAccrued,
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

  // Handle decentralized PROPOSE_JOINT_REFINANCING action (AF-92)
  if ((action as any).type === "PROPOSE_JOINT_REFINANCING") {
    const { groupId, newDueStep, newInterestRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan refinancing.`;
    } else if (newDueStep === undefined || newDueStep <= 0 || !Number.isInteger(newDueStep)) {
      rejectionReason = `New due step must be a positive integer.`;
    } else if (newInterestRate === undefined || newInterestRate < 0 || !Number.isInteger(newInterestRate)) {
      rejectionReason = `New interest rate must be a non-negative integer.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${jointLoan.syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${jointLoan.syndicateId} is not established.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on refinancing.`;
    } else if (newDueStep <= jointLoan.borrowStep) {
      rejectionReason = `Proposed due step ${newDueStep} must be after joint loan borrow step ${jointLoan.borrowStep}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanRefinancingVotes = { ...(state.jointLoanRefinancingVotes || {}) };
      if (!jointLoanRefinancingVotes[groupId]) {
        jointLoanRefinancingVotes[groupId] = {};
      } else {
        jointLoanRefinancingVotes[groupId] = { ...jointLoanRefinancingVotes[groupId] };
      }

      const existingVote = jointLoanRefinancingVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanRefinancingVotes[groupId][agentId] = {
          newDueStep,
          newInterestRate,
          timestamp,
        };
        newState.jointLoanRefinancingVotes = jointLoanRefinancingVotes;
        newState = reconcileJointLoanRefinancings(newState, pack);

        const updatedLoan = newState.jointLoans?.[groupId];
        const currentDue = updatedLoan?.dueStep ?? newDueStep;
        const currentRate = updatedLoan?.refinancedInterestRate ?? newInterestRate;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for refinancing joint loan ${groupId} (New consensus due: ${currentDue}, rate: ${currentRate}%).`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan refinancing vote cast by ${agentId} for loan ${groupId} (Due step: ${newDueStep}, interest rate: ${newInterestRate}%).`,
        } as any);

        customEvents.push({
          type: "joint_loan_refinancing_proposed" as any,
          groupId,
          agentId,
          newDueStep,
          newInterestRate,
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

  // Handle decentralized PROPOSE_COLLATERAL_SUBSTITUTION action (AF-93)
  if ((action as any).type === "PROPOSE_COLLATERAL_SUBSTITUTION") {
    const { groupId, removeCollateral, addCollateral, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose collateral substitution.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!removeCollateral || !removeCollateral.agentId || !removeCollateral.collateralType || !removeCollateral.collateralId) {
      rejectionReason = `Valid removeCollateral structure is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate does not exist for the joint loan.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank does not exist for the joint loan.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on collateral substitution.`;
    } else {
      // Check if removeCollateral is actually part of the loan's current collaterals
      const hasRemove = jointLoan.collaterals.some(c => 
        c.agentId === removeCollateral.agentId && 
        c.collateralType === removeCollateral.collateralType && 
        c.collateralId === removeCollateral.collateralId
      );

      if (!hasRemove) {
        rejectionReason = `The collateral to be removed is not part of the active joint loan ${groupId}.`;
      } else if (addCollateral) {
        // Validate addCollateral
        if (!addCollateral.agentId || !addCollateral.collateralType || !addCollateral.collateralId) {
          rejectionReason = `Invalid addCollateral entry: agentId, collateralType, and collateralId are required.`;
        } else if (!jointLoan.members.includes(addCollateral.agentId)) {
          rejectionReason = `New collateral owner ${addCollateral.agentId} is not a member of the joint loan group.`;
        } else if (addCollateral.collateralType === "safehouse") {
          const safehouse = state.safehouses?.[addCollateral.collateralId];
          if (!safehouse || (safehouse.syndicateId !== jointLoan.syndicateId && safehouse.ownerId !== addCollateral.agentId)) {
            rejectionReason = `Safehouse ${addCollateral.collateralId} does not exist or is not owned/controlled by syndicate ${jointLoan.syndicateId} or agent ${addCollateral.agentId}.`;
          }
        } else if (addCollateral.collateralType === "outpost") {
          const outpost = state.turfGuardOutposts?.[addCollateral.collateralId];
          if (!outpost || outpost.syndicateId !== jointLoan.syndicateId) {
            rejectionReason = `Outpost ${addCollateral.collateralId} does not exist or is not controlled by syndicate ${jointLoan.syndicateId}.`;
          }
        } else {
          rejectionReason = `Invalid addCollateral type ${addCollateral.collateralType}.`;
        }

        if (!rejectionReason) {
          // Check if addCollateral is already locked
          if (isCollateralLocked(state, addCollateral.collateralType, addCollateral.collateralId)) {
            rejectionReason = `Proposed new collateral ${addCollateral.collateralId} is already locked.`;
          }
        }
      }

      if (!rejectionReason) {
        // Check loan security
        if (addCollateral) {
          // Check value comparison: "substitute them with other assets of equal or greater value"
          const removeVal = getCollateralValue(state, removeCollateral.collateralType, removeCollateral.collateralId);
          const addVal = getCollateralValue(state, addCollateral.collateralType, addCollateral.collateralId);
          if (addVal < removeVal) {
            rejectionReason = `New collateral value (${addVal}) must be equal to or greater than the removed collateral value (${removeVal}).`;
          } else {
            ok = true;
          }
        } else {
          // No addCollateral -> it's an early release. Check if the remaining collaterals cover the outstanding balance.
          const remaining = jointLoan.collaterals.filter(c => 
            !(c.agentId === removeCollateral.agentId && 
              c.collateralType === removeCollateral.collateralType && 
              c.collateralId === removeCollateral.collateralId)
          );
          if (remaining.length === 0) {
            rejectionReason = `Cannot release the only remaining collateral of an active loan.`;
          } else {
            const remainingLimit = getJointLoanLimit(state, jointLoan.syndicateId, jointLoan.members, remaining, jointLoan.id);
            const outstanding = jointLoan.amount + jointLoan.interestAccrued;
            if (remainingLimit < outstanding) {
              rejectionReason = `Remaining collaterals cover limit ${remainingLimit} which is less than outstanding loan balance ${outstanding}.`;
            } else {
              ok = true;
            }
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanCollateralSubstitutionVotes = { ...(state.jointLoanCollateralSubstitutionVotes || {}) };
      if (!jointLoanCollateralSubstitutionVotes[groupId]) {
        jointLoanCollateralSubstitutionVotes[groupId] = {};
      } else {
        jointLoanCollateralSubstitutionVotes[groupId] = { ...jointLoanCollateralSubstitutionVotes[groupId] };
      }

      const existingVote = jointLoanCollateralSubstitutionVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanCollateralSubstitutionVotes[groupId][agentId] = {
          removeCollateral,
          addCollateral,
          timestamp,
        };
        newState.jointLoanCollateralSubstitutionVotes = jointLoanCollateralSubstitutionVotes;
        newState = reconcileJointLoanCollateralSubstitutions(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for collateral substitution on joint loan ${groupId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan collateral substitution vote cast by ${agentId} for loan ${groupId} (Remove: ${removeCollateral.collateralId}, Add: ${addCollateral?.collateralId ?? "None"}).`,
        } as any);

        customEvents.push({
          type: "joint_loan_collateral_substitution_proposed" as any,
          groupId,
          agentId,
          removeCollateral,
          addCollateral,
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

  // Handle decentralized PURCHASE_DEPOSIT_INSURANCE action (AF-88)
  if ((action as any).type === "PURCHASE_DEPOSIT_INSURANCE") {
    const { syndicateId, premiumPaid, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const premium = premiumPaid ?? 50; // default premium 50 gold

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to purchase deposit insurance.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot purchase deposit insurance.`;
    } else {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
      if (currentGold < premium) {
        rejectionReason = `Insufficient gold to purchase deposit insurance costing ${premium} (requires ${premium}, has ${currentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank) {
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const currentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

      // Deduct premium
      newState.vars = {
        ...newState.vars,
        [goldKey]: currentGold - premium,
      };

      // Set deposit insurance to active
      if (!newState.depositInsurance) newState.depositInsurance = {};
      const agentIns = newState.depositInsurance[agentId] ? { ...newState.depositInsurance[agentId] } : {};
      agentIns[syndicateId] = {
        agentId,
        syndicateId,
        premiumPaid: premium,
        active: true,
        timestamp,
      };
      newState.depositInsurance = {
        ...newState.depositInsurance,
        [agentId]: agentIns,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Bank Insurance] Agent ${agentId} purchased deposit insurance for syndicate ${syndicateId} bank. Premium paid: ${premium} gold.`);

      customEvents.push({
        type: "narration",
        text: `🛡️ Agent ${agentId} purchased deposit insurance for syndicate ${syndicateId} bank.`,
      } as any);

      customEvents.push({
        type: "deposit_insurance_purchased" as any,
        syndicateId,
        agentId,
        premiumPaid: premium,
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

  // Handle decentralized LIQUIDATE_COLLATERAL action (AF-87)
  if ((action as any).type === "LIQUIDATE_COLLATERAL") {
    const { syndicateId, targetAgentId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const loan = bank?.loans?.[targetAgentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to liquidate collateral.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target agent ID is required to liquidate collateral.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} does not exist.`;
    } else if (!loan) {
      rejectionReason = `Target agent ${targetAgentId} has no active loan with syndicate ${syndicateId} bank.`;
    } else if (state.step <= loan.dueStep) {
      rejectionReason = `Loan is not in default (due at step ${loan.dueStep}, current step ${state.step}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && loan) {
      const syndicateBanks = { ...(state.syndicateBanks || {}) };
      const loans = { ...(bank.loans || {}) };

      delete loans[targetAgentId];

      syndicateBanks[syndicateId] = {
        ...bank,
        loans,
        timestamp,
      };
      newState.syndicateBanks = syndicateBanks;

      // Seize target agent's gold to cover the debt
      const targetGoldKey = targetAgentId === "player" ? "gold" : `gold_${targetAgentId}`;
      const targetGold = state.vars[targetGoldKey] ?? 0;
      const totalDue = loan.amount + loan.interestAccrued;
      let collected = 0;
      let remainingDue = totalDue;

      if (targetGold >= totalDue) {
        newState.vars = {
          ...newState.vars,
          [targetGoldKey]: targetGold - totalDue,
        };
        collected = totalDue;
        remainingDue = 0;
      } else {
        newState.vars = {
          ...newState.vars,
          [targetGoldKey]: 0,
        };
        collected = targetGold;
        remainingDue = totalDue - collected;
      }

      // Liquidate the collateral
      if (loan.collateralType === "safehouse") {
        if (newState.safehouses) {
          newState.safehouses = { ...newState.safehouses };
          delete newState.safehouses[loan.collateralId];
        }
      } else if (loan.collateralType === "outpost") {
        if (newState.turfGuardOutposts) {
          newState.turfGuardOutposts = { ...newState.turfGuardOutposts };
          delete newState.turfGuardOutposts[loan.collateralId];
        }
        if (newState.turfGuards) {
          newState.turfGuards = { ...newState.turfGuards };
          delete newState.turfGuards[loan.collateralId];
        }
      }

      // Increase enforcer heat in the collateral's room (collateralId is the roomId for safehouses and outposts)
      if (newState.enforcementHeat) {
        newState.enforcementHeat = { ...newState.enforcementHeat };
        const currentHeat = newState.enforcementHeat[loan.collateralId]?.heat ?? 0;
        newState.enforcementHeat[loan.collateralId] = {
          roomId: loan.collateralId,
          heat: currentHeat + 15,
          timestamp: newState.step,
        };
      }

      // Decrease credit rating
      if (!newState.creditRatings) newState.creditRatings = {};
      const currentRating = newState.creditRatings[targetAgentId] ?? 100;
      newState.creditRatings[targetAgentId] = Math.max(0, currentRating - 50);

      // Broadcast mesh-wide debt default alert
      if (!newState.defaultAlerts) newState.defaultAlerts = {};
      const alertKey = `${targetAgentId}_${syndicateId}`;
      newState.defaultAlerts[alertKey] = {
        agentId: targetAgentId,
        syndicateId,
        defaultStep: newState.step,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Credit Score] Agent ${targetAgentId} credit rating decreased by -50 due to default (New Score: ${newState.creditRatings[targetAgentId]}).`);
      newState.journal.push(`[Gossip Mesh Alert] Broadcasted debt default alert for agent ${targetAgentId} (Defaulted at bank ${syndicateId}). Blacklisted mesh-wide.`);
      newState.journal.push(`[Syndicate Bank] Agent ${agentId} triggered liquidation of defaulted loan for ${targetAgentId}. Seized ${collected} gold, remaining debt ${remainingDue}. Liquidated ${loan.collateralType} ${loan.collateralId}.`);

      customEvents.push({
        type: "narration",
        text: `⚖️ Enforcers and Syndicate liquidated collateral ${loan.collateralId} for defaulted loan of ${targetAgentId}.`,
      } as any);

      customEvents.push({
        type: "default_alert_gossip" as any,
        agentId: targetAgentId,
        syndicateId,
        defaultStep: newState.step,
        timestamp,
      });

      customEvents.push({
        type: "syndicate_collateral_liquidated" as any,
        syndicateId,
        targetAgentId,
        collateralType: loan.collateralType,
        collateralId: loan.collateralId,
        collectedGold: collected,
        remainingDue,
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

  // Handle decentralized PROPOSE_LOAN_REFINANCING action (AF-89)
  if ((action as any).type === "PROPOSE_LOAN_REFINANCING") {
    const { syndicateId, targetAgentId, newDueStep, newInterestRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const loan = bank?.loans?.[targetAgentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose loan refinancing.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target agent ID is required to propose loan refinancing.`;
    } else if (newDueStep === undefined || newDueStep <= 0 || !Number.isInteger(newDueStep)) {
      rejectionReason = `New due step must be a positive integer.`;
    } else if (newInterestRate === undefined || newInterestRate < 0 || !Number.isInteger(newInterestRate)) {
      rejectionReason = `New interest rate must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on refinancing.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!loan) {
      rejectionReason = `Target agent ${targetAgentId} has no active loan to refinance.`;
    } else if (newDueStep <= loan.borrowStep) {
      rejectionReason = `Proposed due step ${newDueStep} must be after loan borrow step ${loan.borrowStep}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && loan) {
      const loanRefinancingVotes = { ...(state.loanRefinancingVotes || {}) };
      if (!loanRefinancingVotes[syndicateId]) {
        loanRefinancingVotes[syndicateId] = {};
      } else {
        loanRefinancingVotes[syndicateId] = { ...loanRefinancingVotes[syndicateId] };
      }

      if (!loanRefinancingVotes[syndicateId][targetAgentId]) {
        loanRefinancingVotes[syndicateId][targetAgentId] = {};
      } else {
        loanRefinancingVotes[syndicateId][targetAgentId] = { ...loanRefinancingVotes[syndicateId][targetAgentId] };
      }

      const existingVote = loanRefinancingVotes[syndicateId][targetAgentId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        loanRefinancingVotes[syndicateId][targetAgentId][agentId] = {
          newDueStep,
          newInterestRate,
          timestamp,
        };
        newState.loanRefinancingVotes = loanRefinancingVotes;
        newState = reconcileLoanRefinancings(newState, pack);

        const updatedLoan = newState.syndicateBanks?.[syndicateId]?.loans?.[targetAgentId];
        const currentDue = updatedLoan?.dueStep ?? newDueStep;
        const currentRate = updatedLoan?.refinancedInterestRate ?? newInterestRate;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} voted for refinancing agent ${targetAgentId}'s loan in syndicate ${syndicateId} (New consensus due: ${currentDue}, rate: ${currentRate}%).`);

        customEvents.push({
          type: "loan_refinancing_proposed" as any,
          agentId,
          syndicateId,
          targetAgentId,
          newDueStep,
          newInterestRate,
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

  // Handle decentralized SWAP_INDIVIDUAL_COLLATERAL action (AF-94)
  if ((action as any).type === "SWAP_INDIVIDUAL_COLLATERAL") {
    const { syndicateId, targetAgentId, removeCollateralType, removeCollateralId, addCollateralType, addCollateralId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const loan = bank?.loans?.[targetAgentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose individual loan collateral swap.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target agent ID is required to propose individual loan collateral swap.`;
    } else if (!removeCollateralType || !removeCollateralId) {
      rejectionReason = `Valid removeCollateral structure is required.`;
    } else if (!addCollateralType || !addCollateralId) {
      rejectionReason = `Valid addCollateral structure is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on individual loan collateral swap.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!loan) {
      rejectionReason = `Target agent ${targetAgentId} has no active loan to swap collateral.`;
    } else if (loan.collateralType !== removeCollateralType || loan.collateralId !== removeCollateralId) {
      rejectionReason = `The collateral to be removed does not match the active loan collateral.`;
    } else {
      // Validate addCollateral
      let addCollateralValid = false;
      if (addCollateralType === "safehouse") {
        const safehouse = state.safehouses?.[addCollateralId];
        if (safehouse && (safehouse.syndicateId === syndicateId || safehouse.ownerId === targetAgentId)) {
          addCollateralValid = true;
        } else {
          rejectionReason = `Safehouse ${addCollateralId} does not exist or is not owned/controlled by syndicate ${syndicateId} or agent ${targetAgentId}.`;
        }
      } else if (addCollateralType === "outpost") {
        const outpost = state.turfGuardOutposts?.[addCollateralId];
        if (outpost && outpost.syndicateId === syndicateId) {
          addCollateralValid = true;
        } else {
          rejectionReason = `Outpost ${addCollateralId} does not exist or is not controlled by syndicate ${syndicateId}.`;
        }
      } else {
        rejectionReason = `Invalid addCollateral type ${addCollateralType}.`;
      }

      if (addCollateralValid) {
        if (isCollateralLocked(state, addCollateralType, addCollateralId)) {
          rejectionReason = `Proposed new collateral ${addCollateralId} is already locked.`;
        } else {
          // Check if borrowing limit is respected
          const limit = getSyndicateLoanLimit(state, syndicateId, targetAgentId, addCollateralType, addCollateralId);
          const outstanding = loan.amount + loan.interestAccrued;
          if (outstanding > limit) {
            rejectionReason = `Outstanding loan balance ${outstanding} exceeds the new collateral's loan limit of ${limit} gold.`;
          } else {
            // Also check value comparison: new collateral value must be equal or greater than the removed collateral value
            const removeVal = getCollateralValue(state, removeCollateralType, removeCollateralId);
            const addVal = getCollateralValue(state, addCollateralType, addCollateralId);
            if (addVal < removeVal) {
              rejectionReason = `New collateral value (${addVal}) must be equal to or greater than the removed collateral value (${removeVal}).`;
            } else {
              ok = true;
            }
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && loan) {
      const individualLoanCollateralSwapVotes = { ...(state.individualLoanCollateralSwapVotes || {}) };
      if (!individualLoanCollateralSwapVotes[syndicateId]) {
        individualLoanCollateralSwapVotes[syndicateId] = {};
      } else {
        individualLoanCollateralSwapVotes[syndicateId] = { ...individualLoanCollateralSwapVotes[syndicateId] };
      }

      if (!individualLoanCollateralSwapVotes[syndicateId][targetAgentId]) {
        individualLoanCollateralSwapVotes[syndicateId][targetAgentId] = {};
      } else {
        individualLoanCollateralSwapVotes[syndicateId][targetAgentId] = { ...individualLoanCollateralSwapVotes[syndicateId][targetAgentId] };
      }

      const existingVote = individualLoanCollateralSwapVotes[syndicateId][targetAgentId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        individualLoanCollateralSwapVotes[syndicateId][targetAgentId][agentId] = {
          removeCollateralType,
          removeCollateralId,
          addCollateralType,
          addCollateralId,
          timestamp,
        };
        newState.individualLoanCollateralSwapVotes = individualLoanCollateralSwapVotes;
        newState = reconcileIndividualLoanCollateralSwaps(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} voted for individual collateral swap for agent ${targetAgentId}'s loan in syndicate ${syndicateId} (Remove: ${removeCollateralId}, Add: ${addCollateralId}).`);

        customEvents.push({
          type: "narration",
          text: `🗳️ Individual loan collateral swap vote cast by ${agentId} for borrower ${targetAgentId} in syndicate ${syndicateId} (Remove: ${removeCollateralId}, Add: ${addCollateralId}).`,
        } as any);

        customEvents.push({
          type: "individual_loan_collateral_swap_proposed" as any,
          syndicateId,
          agentId,
          targetAgentId,
          removeCollateralType,
          removeCollateralId,
          addCollateralType,
          addCollateralId,
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

  // Handle decentralized PROPOSE_DEBT_SETTLEMENT action (AF-90)
  if ((action as any).type === "PROPOSE_DEBT_SETTLEMENT") {
    const { syndicateId, targetAgentId, settlementAmount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const loan = bank?.loans?.[targetAgentId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose debt settlement.`;
    } else if (!targetAgentId) {
      rejectionReason = `Target agent ID is required to propose debt settlement.`;
    } else if (settlementAmount === undefined || settlementAmount < 0 || !Number.isInteger(settlementAmount)) {
      rejectionReason = `Settlement amount must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on debt settlement.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!loan) {
      rejectionReason = `Target agent ${targetAgentId} has no active loan to settle.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && bank && loan) {
      const debtSettlementVotes = { ...(state.debtSettlementVotes || {}) };
      if (!debtSettlementVotes[syndicateId]) {
        debtSettlementVotes[syndicateId] = {};
      } else {
        debtSettlementVotes[syndicateId] = { ...debtSettlementVotes[syndicateId] };
      }

      if (!debtSettlementVotes[syndicateId][targetAgentId]) {
        debtSettlementVotes[syndicateId][targetAgentId] = {};
      } else {
        debtSettlementVotes[syndicateId][targetAgentId] = { ...debtSettlementVotes[syndicateId][targetAgentId] };
      }

      const existingVote = debtSettlementVotes[syndicateId][targetAgentId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        debtSettlementVotes[syndicateId][targetAgentId][agentId] = {
          settlementAmount,
          timestamp,
        };
        newState.debtSettlementVotes = debtSettlementVotes;
        newState = reconcileDebtSettlements(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate Bank] Agent ${agentId} voted for debt settlement of agent ${targetAgentId}'s loan in syndicate ${syndicateId} (Amount: ${settlementAmount} gold).`);

        customEvents.push({
          type: "debt_settlement_proposed" as any,
          agentId,
          syndicateId,
          targetAgentId,
          settlementAmount,
          timestamp,
        });

        // Add a narration event if the settlement was successfully agreed and paid
        const loanRemaining = newState.syndicateBanks?.[syndicateId]?.loans?.[targetAgentId];
        if (!loanRemaining) {
          customEvents.push({
            type: "narration",
            text: `🤝 Debt settlement agreed and paid! Agent ${targetAgentId}'s loan in syndicate ${syndicateId} has been settled for ${settlementAmount} gold. Collateral has been released.`,
          } as any);
        }
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

  // Handle decentralized PROPOSE_JOINT_DEBT_SETTLEMENT action (AF-95)
  if ((action as any).type === "PROPOSE_JOINT_DEBT_SETTLEMENT") {
    const { groupId, settlementAmount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan debt settlement.`;
    } else if (settlementAmount === undefined || settlementAmount < 0 || !Number.isInteger(settlementAmount)) {
      rejectionReason = `Settlement amount must be a non-negative integer.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${jointLoan.syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${jointLoan.syndicateId} is not established.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on debt settlement.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanDebtSettlementVotes = { ...(state.jointLoanDebtSettlementVotes || {}) };
      if (!jointLoanDebtSettlementVotes[groupId]) {
        jointLoanDebtSettlementVotes[groupId] = {};
      } else {
        jointLoanDebtSettlementVotes[groupId] = { ...jointLoanDebtSettlementVotes[groupId] };
      }

      const existingVote = jointLoanDebtSettlementVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanDebtSettlementVotes[groupId][agentId] = {
          settlementAmount,
          timestamp,
        };
        newState.jointLoanDebtSettlementVotes = jointLoanDebtSettlementVotes;
        newState = reconcileJointLoanDebtSettlements(newState, pack);

        const updatedLoan = newState.jointLoans?.[groupId];
        if (!updatedLoan) {
          // settled!
          customEvents.push({
            type: "narration",
            text: `🤝 Joint debt settlement agreed and paid! Joint loan group ${groupId} has been settled for ${settlementAmount} gold. Pledged collaterals are unlocked!`,
          } as any);
        } else {
          // vote registered
          customEvents.push({
            type: "narration",
            text: `🗳️ Joint loan debt settlement vote cast by ${agentId} for loan ${groupId} (Amount: ${settlementAmount} gold).`,
          } as any);
        }

        customEvents.push({
          type: "joint_debt_settlement_proposed" as any,
          groupId,
          agentId,
          settlementAmount,
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

  // Handle decentralized SWAP_JOINT_COLLATERAL action (AF-96)
  if ((action as any).type === "SWAP_JOINT_COLLATERAL") {
    const { groupId, removeCollateralType, removeCollateralId, addCollateralType, addCollateralId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan collateral swap.`;
    } else if (!removeCollateralType || !removeCollateralId) {
      rejectionReason = `Valid removeCollateral structure is required.`;
    } else if (!addCollateralType || !addCollateralId) {
      rejectionReason = `Valid addCollateral structure is required.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate does not exist for the joint loan.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank does not exist for the joint loan.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on joint loan collateral swap.`;
    } else {
      // Check if removeCollateral is actually part of the loan's current collaterals
      const existingCollateral = jointLoan.collaterals.find(c => 
        c.collateralType === removeCollateralType && 
        c.collateralId === removeCollateralId
      );

      if (!existingCollateral) {
        rejectionReason = `The collateral to be removed is not part of the active joint loan ${groupId}.`;
      } else {
        const ownerId = existingCollateral.agentId;

        // Validate addCollateral
        let addCollateralValid = false;
        if (addCollateralType === "safehouse") {
          const safehouse = state.safehouses?.[addCollateralId];
          if (safehouse && (safehouse.syndicateId === jointLoan.syndicateId || safehouse.ownerId === ownerId)) {
            addCollateralValid = true;
          } else {
            rejectionReason = `Safehouse ${addCollateralId} does not exist or is not owned/controlled by syndicate ${jointLoan.syndicateId} or agent ${ownerId}.`;
          }
        } else if (addCollateralType === "outpost") {
          const outpost = state.turfGuardOutposts?.[addCollateralId];
          if (outpost && outpost.syndicateId === jointLoan.syndicateId) {
            addCollateralValid = true;
          } else {
            rejectionReason = `Outpost ${addCollateralId} does not exist or is not controlled by syndicate ${jointLoan.syndicateId}.`;
          }
        } else {
          rejectionReason = `Invalid addCollateral type ${addCollateralType}.`;
        }

        if (addCollateralValid) {
          if (isCollateralLocked(state, addCollateralType, addCollateralId)) {
            rejectionReason = `Proposed new collateral ${addCollateralId} is already locked.`;
          } else {
            // Check value comparison: "substitute them with other assets of equal or greater value"
            const removeVal = getCollateralValue(state, removeCollateralType, removeCollateralId);
            const addVal = getCollateralValue(state, addCollateralType, addCollateralId);
            if (addVal < removeVal) {
              rejectionReason = `New collateral value (${addVal}) must be equal to or greater than the removed collateral value (${removeVal}).`;
            } else {
              ok = true;
            }
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanCollateralSwapVotes = { ...(state.jointLoanCollateralSwapVotes || {}) };
      if (!jointLoanCollateralSwapVotes[groupId]) {
        jointLoanCollateralSwapVotes[groupId] = {};
      } else {
        jointLoanCollateralSwapVotes[groupId] = { ...jointLoanCollateralSwapVotes[groupId] };
      }

      const existingVote = jointLoanCollateralSwapVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanCollateralSwapVotes[groupId][agentId] = {
          removeCollateralType,
          removeCollateralId,
          addCollateralType,
          addCollateralId,
          timestamp,
        };
        newState.jointLoanCollateralSwapVotes = jointLoanCollateralSwapVotes;
        newState = reconcileJointLoanCollateralSwaps(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for collateral swap on joint loan ${groupId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan collateral swap vote cast by ${agentId} for loan ${groupId} (Remove: ${removeCollateralId}, Add: ${addCollateralId}).`,
        } as any);

        customEvents.push({
          type: "joint_loan_collateral_swap_proposed" as any,
          groupId,
          agentId,
          removeCollateralType,
          removeCollateralId,
          addCollateralType,
          addCollateralId,
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

  // Handle decentralized PROPOSE_JOINT_LOAN_GRACE_PERIOD action (AF-97)
  if ((action as any).type === "PROPOSE_JOINT_LOAN_GRACE_PERIOD") {
    const { groupId, extensionSteps, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan grace period.`;
    } else if (extensionSteps === undefined || extensionSteps <= 0 || !Number.isInteger(extensionSteps)) {
      rejectionReason = `Extension steps must be a positive integer.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate does not exist for the joint loan.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank does not exist for the joint loan.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on grace period.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanGracePeriodVotes = { ...(state.jointLoanGracePeriodVotes || {}) };
      if (!jointLoanGracePeriodVotes[groupId]) {
        jointLoanGracePeriodVotes[groupId] = {};
      } else {
        jointLoanGracePeriodVotes[groupId] = { ...jointLoanGracePeriodVotes[groupId] };
      }

      const existingVote = jointLoanGracePeriodVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanGracePeriodVotes[groupId][agentId] = {
          extensionSteps,
          timestamp,
        };
        newState.jointLoanGracePeriodVotes = jointLoanGracePeriodVotes;
        newState = reconcileJointLoanGracePeriods(newState, pack);

        const updatedLoan = newState.jointLoans?.[groupId];
        const currentGrace = updatedLoan?.gracePeriodSteps ?? extensionSteps;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for grace period on joint loan ${groupId} (New consensus grace: ${currentGrace} steps).`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan grace period vote cast by ${agentId} for loan ${groupId} (Extension steps: ${extensionSteps}).`,
        } as any);

        customEvents.push({
          type: "joint_loan_grace_period_proposed" as any,
          groupId,
          agentId,
          extensionSteps,
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
  // Handle decentralized PROPOSE_JOINT_LOAN_CREDIT_UNDERWRITE action (AF-99)
  if ((action as any).type === "PROPOSE_JOINT_LOAN_CREDIT_UNDERWRITE") {
    const { groupId, syndicateId, members, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan credit underwriting.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to propose joint loan credit underwriting.`;
    } else if (!members || !Array.isArray(members) || members.length === 0) {
      rejectionReason = `Members list is required and must be a non-empty array.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on credit underwriting.`;
    } else if (state.jointLoans?.[groupId]) {
      rejectionReason = `Joint loan group ${groupId} already exists as an active loan.`;
    } else if (state.jointLoanUnderwrites?.[groupId]) {
      rejectionReason = `Underwriting terms for group ${groupId} have already been finalized and approved.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const jointLoanUnderwriteVotes = { ...(state.jointLoanUnderwriteVotes || {}) };
      if (!jointLoanUnderwriteVotes[groupId]) {
        jointLoanUnderwriteVotes[groupId] = {};
      } else {
        jointLoanUnderwriteVotes[groupId] = { ...jointLoanUnderwriteVotes[groupId] };
      }

      const existingVote = jointLoanUnderwriteVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanUnderwriteVotes[groupId][agentId] = {
          syndicateId,
          members,
          timestamp,
        };
        newState.jointLoanUnderwriteVotes = jointLoanUnderwriteVotes;
        newState = reconcileJointLoanUnderwrites(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for credit underwriting on joint loan group ${groupId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan credit underwriting vote cast by ${agentId} for group ${groupId}.`,
        } as any);

        customEvents.push({
          type: "joint_loan_credit_underwrite_proposed" as any,
          groupId,
          agentId,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized ESTABLISH_JOINT_LOAN_INSURANCE_POOL action (AF-100)
  if ((action as any).type === "ESTABLISH_JOINT_LOAN_INSURANCE_POOL") {
    const { syndicateId, initialDeposit, premiumRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bank = state.syndicateBanks?.[syndicateId];
    const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
    const agentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to establish a joint loan insurance pool.`;
    } else if (initialDeposit === undefined || initialDeposit <= 0 || !Number.isInteger(initialDeposit)) {
      rejectionReason = `Initial deposit must be a positive integer.`;
    } else if (premiumRate === undefined || premiumRate <= 0 || !Number.isInteger(premiumRate)) {
      rejectionReason = `Premium rate must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank for ${syndicateId} is not established.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot establish a pool.`;
    } else if (agentGold < initialDeposit) {
      rejectionReason = `Agent ${agentId} has insufficient gold to deposit ${initialDeposit} (has ${agentGold}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: agentGold - initialDeposit,
      };

      // Establish or update insurance pool
      const currentPool = state.jointLoanInsurancePools?.[syndicateId];
      newState.jointLoanInsurancePools = {
        ...(state.jointLoanInsurancePools || {}),
        [syndicateId]: {
          syndicateId,
          poolGold: (currentPool?.poolGold ?? 0) + initialDeposit,
          premiumRate,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Agent ${agentId} established/funded joint loan insurance pool for ${syndicateId} with ${initialDeposit} gold at ${premiumRate}% premium rate.`
      );

      customEvents.push({
        type: "narration",
        text: `🛡️ Joint loan insurance pool established/funded for ${syndicateId} by ${agentId} with ${initialDeposit} gold.`,
      } as any);

      customEvents.push({
        type: "joint_loan_insurance_pool_established" as any,
        syndicateId,
        agentId,
        initialDeposit,
        premiumRate,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PURCHASE_JOINT_LOAN_INSURANCE action (AF-100)
  if ((action as any).type === "PURCHASE_JOINT_LOAN_INSURANCE") {
    const { syndicateId, groupId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const jointLoan = state.jointLoans?.[groupId];
    const pool = state.jointLoanInsurancePools?.[syndicateId];
    const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
    const agentGold = state.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

    const policyKey = `${agentId}_${groupId}`;
    const existingPolicy = state.agentPremiumPolicies?.[policyKey];
    let premiumCost = 0;

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to purchase joint loan insurance.`;
    } else if (!groupId) {
      rejectionReason = `Group ID is required to purchase joint loan insurance.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or is not active.`;
    } else if (!pool) {
      rejectionReason = `Joint loan insurance pool for syndicate ${syndicateId} is not established.`;
    } else if (!jointLoan.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of joint loan group ${groupId}.`;
    } else if (existingPolicy && existingPolicy.active) {
      rejectionReason = `Agent ${agentId} already has an active premium policy for group ${groupId}.`;
    } else {
      premiumCost = Math.ceil(jointLoan.amount * (pool.premiumRate / 100));
      if (agentGold < premiumCost) {
        rejectionReason = `Agent ${agentId} has insufficient gold to pay premium cost of ${premiumCost} (has ${agentGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && pool && jointLoan) {
      // Deduct gold
      newState.vars = {
        ...newState.vars,
        [goldKey]: agentGold - premiumCost,
      };

      // Add premium to pool
      const updatedPool = {
        ...pool,
        poolGold: pool.poolGold + premiumCost,
        timestamp,
      };
      newState.jointLoanInsurancePools = {
        ...(state.jointLoanInsurancePools || {}),
        [syndicateId]: updatedPool,
      };

      // Create premium policy
      newState.agentPremiumPolicies = {
        ...(state.agentPremiumPolicies || {}),
        [policyKey]: {
          agentId,
          syndicateId,
          groupId,
          premiumPaid: premiumCost,
          active: true,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Agent ${agentId} purchased joint loan insurance for group ${groupId} at a premium cost of ${premiumCost} gold.`
      );

      customEvents.push({
        type: "narration",
        text: `🛡️ Agent ${agentId} purchased joint loan insurance for ${groupId} (Premium: ${premiumCost} gold).`,
      } as any);

      customEvents.push({
        type: "joint_loan_insurance_purchased" as any,
        groupId,
        agentId,
        premiumCost,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PROPOSE_REINSURANCE_POOL action (AF-101)
  if ((action as any).type === "PROPOSE_REINSURANCE_POOL") {
    const { syndicateIdA, syndicateIdB, maxLiquidityLimit, targetState, timestamp } = action as any;
    const votedState = targetState !== false; // Defaults to true if undefined
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required to propose a reinsurance pool.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (syndicateIdA === syndicateIdB) {
      rejectionReason = `Cannot form reinsurance contract with the same syndicate.`;
    } else if (maxLiquidityLimit === undefined || maxLiquidityLimit <= 0 || !Number.isInteger(maxLiquidityLimit)) {
      rejectionReason = `Max liquidity limit must be a positive integer.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const reinsuranceVotes = { ...(state.reinsuranceVotes || {}) };
      if (!reinsuranceVotes[pairKey]) {
        reinsuranceVotes[pairKey] = {};
      } else {
        reinsuranceVotes[pairKey] = { ...reinsuranceVotes[pairKey] };
      }

      const existingVote = reinsuranceVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reinsuranceVotes[pairKey][agentId] = {
          targetState: votedState,
          maxLiquidityLimit,
          timestamp,
        };
        newState.reinsuranceVotes = reinsuranceVotes;
        newState = reconcileReinsurancePools(newState, pack);

        const activeContract = newState.reinsuranceContracts?.[pairKey]?.active ?? false;
        const currentLimit = newState.reinsuranceContracts?.[pairKey]?.maxLiquidityLimit ?? maxLiquidityLimit;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reinsurance] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} reinsurance contract between ${syndicateIdA} and ${syndicateIdB} with limit ${maxLiquidityLimit} (Status: ${activeContract ? "ACTIVE" : "PENDING/INACTIVE"}, Consensual Limit: ${currentLimit}).`
        );

        customEvents.push({
          type: "narration",
          text: `🛡️ Reinsurance vote cast by ${agentId} for ${syndicateIdA} & ${syndicateIdB} (Limit: ${maxLiquidityLimit}, Active: ${activeContract}).`,
        } as any);

        customEvents.push({
          type: "reinsurance_pool_proposed" as any,
          syndicateIdA,
          syndicateIdB,
          agentId,
          maxLiquidityLimit,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PROPOSE_CONTAGION_SHIELD action (AF-102)
  if ((action as any).type === "PROPOSE_CONTAGION_SHIELD") {
    const { syndicateIdA, syndicateIdB, targetState, timestamp } = action as any;
    const votedState = targetState !== false; // Defaults to true if undefined
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required to propose a contagion shield.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (syndicateIdA === syndicateIdB) {
      rejectionReason = `Cannot form contagion shield with the same syndicate.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const contagionShieldVotes = { ...(state.contagionShieldVotes || {}) };
      if (!contagionShieldVotes[pairKey]) {
        contagionShieldVotes[pairKey] = {};
      } else {
        contagionShieldVotes[pairKey] = { ...contagionShieldVotes[pairKey] };
      }

      const existingVote = contagionShieldVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        contagionShieldVotes[pairKey][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.contagionShieldVotes = contagionShieldVotes;
        newState = reconcileContagionShields(newState, pack);

        const activeShield = newState.contagionShields?.[pairKey]?.active ?? false;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Contagion Shield] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} contagion shield between ${syndicateIdA} and ${syndicateIdB} (Status: ${activeShield ? "ACTIVE" : "PENDING/INACTIVE"}).`
        );

        customEvents.push({
          type: "narration",
          text: `🛡️ Contagion shield vote cast by ${agentId} for ${syndicateIdA} & ${syndicateIdB} (Active: ${activeShield}).`,
        } as any);

        customEvents.push({
          type: "contagion_shield_proposed" as any,
          syndicateIdA,
          syndicateIdB,
          agentId,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PROPOSE_INTEREST_SUBSIDY action (AF-103)
  if ((action as any).type === "PROPOSE_INTEREST_SUBSIDY") {
    const { syndicateIdA, syndicateIdB, subsidyRate, targetState, timestamp } = action as any;
    const votedState = targetState !== false; // Defaults to true if undefined
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required to propose an interest subsidy.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (syndicateIdA === syndicateIdB) {
      rejectionReason = `Cannot form interest subsidy with the same syndicate.`;
    } else if (subsidyRate === undefined || subsidyRate < 0 || !Number.isInteger(subsidyRate)) {
      rejectionReason = `Subsidy rate must be a non-negative integer.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      const allied = state.syndicateAlliances?.[syndicateIdA]?.[syndicateIdB] === "allied" || 
                    state.syndicateAlliances?.[syndicateIdB]?.[syndicateIdA] === "allied";
      if (!allied) {
        rejectionReason = `Syndicates ${syndicateIdA} and ${syndicateIdB} are not allied.`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const interestSubsidyVotes = { ...(state.interestSubsidyVotes || {}) };
      if (!interestSubsidyVotes[pairKey]) {
        interestSubsidyVotes[pairKey] = {};
      } else {
        interestSubsidyVotes[pairKey] = { ...interestSubsidyVotes[pairKey] };
      }

      const existingVote = interestSubsidyVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        interestSubsidyVotes[pairKey][agentId] = {
          targetState: votedState,
          subsidyRate,
          timestamp,
        };
        newState.interestSubsidyVotes = interestSubsidyVotes;
        newState = reconcileInterestSubsidies(newState, pack);

        const activeSubsidy = newState.interestSubsidies?.[pairKey]?.active ?? false;
        const currentSubsidy = newState.interestSubsidies?.[pairKey]?.subsidyRate ?? subsidyRate;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Interest Subsidy] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} interest subsidy between ${syndicateIdA} and ${syndicateIdB} with rate ${subsidyRate}% (Status: ${activeSubsidy ? "ACTIVE" : "PENDING/INACTIVE"}, Consensual Subsidy: ${currentSubsidy}%).`
        );

        customEvents.push({
          type: "narration",
          text: `📈 Interest subsidy vote cast by ${agentId} for ${syndicateIdA} & ${syndicateIdB} (Rate: ${subsidyRate}%, Active: ${activeSubsidy}).`,
        } as any);

        customEvents.push({
          type: "interest_subsidy_proposed" as any,
          syndicateIdA,
          syndicateIdB,
          agentId,
          subsidyRate,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PLEDGE_REINSURANCE_COLLATERAL action (AF-103)
  if ((action as any).type === "PLEDGE_REINSURANCE_COLLATERAL") {
    const { syndicateIdA, syndicateIdB, collateralType, collateralId, targetState, timestamp } = action as any;
    const votedState = targetState !== false;
    const voteKey = `${syndicateIdA}:${syndicateIdB}:${collateralType}:${collateralId}`;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];

    if (!syndicateIdA || !syndicateIdB || !collateralType || !collateralId) {
      rejectionReason = `syndicateIdA, syndicateIdB, collateralType, and collateralId are all required.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (syndicateIdA === syndicateIdB) {
      rejectionReason = `Cannot pledge secondary reinsurance collateral to the same syndicate.`;
    } else if (collateralType !== "safehouse" && collateralType !== "outpost") {
      rejectionReason = `Collateral type must be safehouse or outpost.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      let belongsToB = false;
      if (collateralType === "safehouse") {
        belongsToB = state.safehouses?.[collateralId]?.syndicateId === syndicateIdB;
      } else if (collateralType === "outpost") {
        belongsToB = state.turfGuardOutposts?.[collateralId]?.syndicateId === syndicateIdB;
      }

      if (!belongsToB) {
        rejectionReason = `Collateral ${collateralType} ${collateralId} does not belong to pledging syndicate ${syndicateIdB}.`;
      } else {
        const pairKey = [syndicateIdA, syndicateIdB].sort().join(":");
        const contract = state.reinsuranceContracts?.[pairKey];
        if (!contract || !contract.active) {
          rejectionReason = `Active reinsurance contract does not exist between ${syndicateIdA} and ${syndicateIdB}.`;
        } else if (votedState && isCollateralLocked(state, collateralType, collateralId)) {
          rejectionReason = `Collateral ${collateralType} ${collateralId} is already locked by another loan or active reinsurance pledge.`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const reinsuranceCollateralVotes = { ...(state.reinsuranceCollateralVotes || {}) };
      if (!reinsuranceCollateralVotes[voteKey]) {
        reinsuranceCollateralVotes[voteKey] = {};
      } else {
        reinsuranceCollateralVotes[voteKey] = { ...reinsuranceCollateralVotes[voteKey] };
      }

      const existingVote = reinsuranceCollateralVotes[voteKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reinsuranceCollateralVotes[voteKey][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.reinsuranceCollateralVotes = reinsuranceCollateralVotes;
        newState = reconcileReinsuranceCollateral(newState, pack);

        const activePledge = newState.reinsuranceCollateralPledges?.[voteKey]?.active ?? false;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reinsurance Collateral] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} pledging ${collateralType} ${collateralId} from ${syndicateIdB} as secondary reinsurance collateral for ${syndicateIdA} (Status: ${activePledge ? "ACTIVE" : "PENDING/INACTIVE"}).`
        );

        customEvents.push({
          type: "narration",
          text: `🛡️ Reinsurance collateral vote cast by ${agentId} to ${votedState ? "pledge" : "unpledge"} ${collateralType} ${collateralId} (Active: ${activePledge}).`,
        } as any);

        customEvents.push({
          type: "reinsurance_collateral_pledged" as any,
          syndicateIdA,
          syndicateIdB,
          collateralType,
          collateralId,
          agentId,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PROPOSE_RISK_RATING action (AF-104)
  if ((action as any).type === "PROPOSE_RISK_RATING") {
    const { syndicateIdA, syndicateIdB, riskRating, targetState, timestamp } = action as any;
    const votedState = targetState !== false;
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];
    const contract = state.reinsuranceContracts?.[pairKey];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required to propose a reinsurance risk rating.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (!contract || !contract.active) {
      rejectionReason = `Active reinsurance contract does not exist between ${syndicateIdA} and ${syndicateIdB}.`;
    } else if (riskRating !== "low" && riskRating !== "medium" && riskRating !== "high") {
      rejectionReason = `Risk rating must be 'low', 'medium', or 'high'.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      // Validate that the proposed risk rating matches the borrowing syndicate's actual historical default count.
      // We assume syndicateIdA is the borrowing syndicate whose risk rating is being proposed under this contract relationship.
      const defaults = state.syndicateDefaults?.[syndicateIdA] ?? 0;
      let expectedRating: "low" | "medium" | "high" = "low";
      if (defaults >= 3) {
        expectedRating = "high";
      } else if (defaults >= 1) {
        expectedRating = "medium";
      }

      if (riskRating !== expectedRating) {
        rejectionReason = `Proposed risk rating ${riskRating} does not match the borrowing syndicate's historic default count of ${defaults} (expected: ${expectedRating}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const reinsuranceRiskRatingVotes = { ...(state.reinsuranceRiskRatingVotes || {}) };
      if (!reinsuranceRiskRatingVotes[pairKey]) {
        reinsuranceRiskRatingVotes[pairKey] = {};
      } else {
        reinsuranceRiskRatingVotes[pairKey] = { ...reinsuranceRiskRatingVotes[pairKey] };
      }

      const existingVote = reinsuranceRiskRatingVotes[pairKey][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reinsuranceRiskRatingVotes[pairKey][agentId] = {
          targetState: votedState,
          riskRating,
          timestamp,
        };
        newState.reinsuranceRiskRatingVotes = reinsuranceRiskRatingVotes;
        newState = reconcileReinsuranceRiskRatings(newState, pack);

        const activeRating = newState.reinsuranceRiskRatings?.[pairKey]?.active ?? false;
        const currentRating = newState.reinsuranceRiskRatings?.[pairKey]?.riskRating ?? riskRating;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reinsurance Risk Rating] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} risk rating ${riskRating} for contract between ${syndicateIdA} and ${syndicateIdB} (Status: ${activeRating ? "ACTIVE" : "PENDING/INACTIVE"}, Consensual Rating: ${currentRating}).`
        );

        customEvents.push({
          type: "narration",
          text: `📊 Reinsurance risk rating vote cast by ${agentId} for ${syndicateIdA} & ${syndicateIdB} (Rating: ${riskRating}, Active: ${activeRating}).`,
        } as any);

        customEvents.push({
          type: "reinsurance_risk_rating_proposed" as any,
          syndicateIdA,
          syndicateIdB,
          agentId,
          riskRating,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized REQUEST_LIQUIDITY_AUDIT action (AF-104)
  if ((action as any).type === "REQUEST_LIQUIDITY_AUDIT") {
    const { syndicateIdA, syndicateIdB, auditStep, targetState, timestamp } = action as any;
    const votedState = targetState !== false;
    const stepVal = auditStep !== undefined ? auditStep : state.step;
    const auditId = `${syndicateIdA}:${syndicateIdB}:${stepVal}`;
    const pairKey = [syndicateIdA || "", syndicateIdB || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndA = state.syndicates?.[syndicateIdA];
    const syndB = state.syndicates?.[syndicateIdB];
    const contract = state.reinsuranceContracts?.[pairKey];

    if (!syndicateIdA || !syndicateIdB) {
      rejectionReason = `Both syndicateIdA and syndicateIdB are required to request a reinsurance liquidity audit.`;
    } else if (!syndA) {
      rejectionReason = `Syndicate ${syndicateIdA} does not exist.`;
    } else if (!syndB) {
      rejectionReason = `Syndicate ${syndicateIdB} does not exist.`;
    } else if (!contract || !contract.active) {
      rejectionReason = `Active reinsurance contract does not exist between ${syndicateIdA} and ${syndicateIdB}.`;
    } else if (!Number.isInteger(stepVal) || stepVal < 0) {
      rejectionReason = `Audit step must be a non-negative integer.`;
    } else if (!syndA.members.includes(agentId) && !syndB.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate A or B.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const reinsuranceLiquidityAuditVotes = { ...(state.reinsuranceLiquidityAuditVotes || {}) };
      if (!reinsuranceLiquidityAuditVotes[auditId]) {
        reinsuranceLiquidityAuditVotes[auditId] = {};
      } else {
        reinsuranceLiquidityAuditVotes[auditId] = { ...reinsuranceLiquidityAuditVotes[auditId] };
      }

      const existingVote = reinsuranceLiquidityAuditVotes[auditId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reinsuranceLiquidityAuditVotes[auditId][agentId] = {
          targetState: votedState,
          timestamp,
        };
        newState.reinsuranceLiquidityAuditVotes = reinsuranceLiquidityAuditVotes;
        newState = reconcileReinsuranceLiquidityAudits(newState, pack);

        const activeAudit = newState.reinsuranceLiquidityAudits?.[auditId]?.active ?? false;
        const auditStatus = newState.reinsuranceLiquidityAudits?.[auditId]?.status ?? "pending";
        const verifiedLiq = newState.reinsuranceLiquidityAudits?.[auditId]?.verifiedLiquidity ?? 0;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reinsurance Audit] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} liquidity audit ${auditId} (Status: ${activeAudit ? "ACTIVE" : "PENDING/INACTIVE"}, Verified Gold: ${verifiedLiq}, Result: ${auditStatus.toUpperCase()}).`
        );

        customEvents.push({
          type: "narration",
          text: `🔍 Reinsurance liquidity audit vote cast by ${agentId} (Audit: ${auditId}, Active: ${activeAudit}, Status: ${auditStatus}).`,
        } as any);

        customEvents.push({
          type: "reinsurance_liquidity_audit_proposed" as any,
          syndicateIdA,
          syndicateIdB,
          auditStep: stepVal,
          agentId,
          targetState: votedState,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized TRANSFER_REINSURANCE_LIQUIDITY action (AF-101)
  if ((action as any).type === "TRANSFER_REINSURANCE_LIQUIDITY") {
    const { proposalId, fromSyndicateId, toSyndicateId, amount, targetState, timestamp } = action as any;
    const votedState = targetState !== false;
    const pairKey = [fromSyndicateId || "", toSyndicateId || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndFrom = state.syndicates?.[fromSyndicateId];
    const syndTo = state.syndicates?.[toSyndicateId];
    const contract = state.reinsuranceContracts?.[pairKey];
    const sourcePool = state.jointLoanInsurancePools?.[fromSyndicateId];
    const destPool = state.jointLoanInsurancePools?.[toSyndicateId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required to transfer reinsurance liquidity.`;
    } else if (!fromSyndicateId || !toSyndicateId) {
      rejectionReason = `Both fromSyndicateId and toSyndicateId are required.`;
    } else if (!syndFrom) {
      rejectionReason = `Source syndicate ${fromSyndicateId} does not exist.`;
    } else if (!syndTo) {
      rejectionReason = `Destination syndicate ${toSyndicateId} does not exist.`;
    } else if (fromSyndicateId === toSyndicateId) {
      rejectionReason = `Cannot transfer liquidity to the same syndicate.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Transfer amount must be a positive integer.`;
    } else if (!syndFrom.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the sending syndicate ${fromSyndicateId} and cannot vote on transfer.`;
    } else if (!contract || !contract.active) {
      rejectionReason = `Active reinsurance contract does not exist between ${fromSyndicateId} and ${toSyndicateId}.`;
    } else if (!sourcePool) {
      rejectionReason = `Insurance pool for source syndicate ${fromSyndicateId} is not established.`;
    } else if (!destPool) {
      rejectionReason = `Insurance pool for destination syndicate ${toSyndicateId} is not established.`;
    } else if (sourcePool.poolGold < amount) {
      rejectionReason = `Source pool has insufficient gold (${sourcePool.poolGold}) to transfer ${amount}.`;
    } else {
      // Validate liquidity limit
      const isAtoB = (fromSyndicateId === contract.syndicateIdA);
      let allowed = false;
      if (isAtoB) {
        const repay = Math.min(amount, contract.borrowedAfromB);
        const excess = amount - repay;
        if (contract.borrowedBfromA + excess <= contract.maxLiquidityLimit) {
          allowed = true;
        } else {
          rejectionReason = `Transfer would exceed max liquidity limit of ${contract.maxLiquidityLimit} (excess of ${contract.borrowedBfromA + excess - contract.maxLiquidityLimit}).`;
        }
      } else {
        const repay = Math.min(amount, contract.borrowedBfromA);
        const excess = amount - repay;
        if (contract.borrowedAfromB + excess <= contract.maxLiquidityLimit) {
          allowed = true;
        } else {
          rejectionReason = `Transfer would exceed max liquidity limit of ${contract.maxLiquidityLimit} (excess of ${contract.borrowedAfromB + excess - contract.maxLiquidityLimit}).`;
        }
      }

      if (allowed) {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok) {
      const reinsuranceTransferVotes = { ...(state.reinsuranceTransferVotes || {}) };
      if (!reinsuranceTransferVotes[proposalId]) {
        reinsuranceTransferVotes[proposalId] = {};
      } else {
        reinsuranceTransferVotes[proposalId] = { ...reinsuranceTransferVotes[proposalId] };
      }

      const existingVote = reinsuranceTransferVotes[proposalId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reinsuranceTransferVotes[proposalId][agentId] = {
          fromSyndicateId,
          toSyndicateId,
          amount,
          targetState: votedState,
          timestamp,
        };
        newState.reinsuranceTransferVotes = reinsuranceTransferVotes;
        
        const priorExecuted = newState.executedReinsuranceTransfers?.[proposalId] ?? false;
        newState = reconcileReinsuranceTransfers(newState, pack);
        const newlyExecuted = newState.executedReinsuranceTransfers?.[proposalId] ?? false;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reinsurance] Agent ${agentId} voted ${votedState ? "FOR" : "AGAINST"} liquidity transfer proposal ${proposalId} of ${amount} gold from ${fromSyndicateId} to ${toSyndicateId} (Executed: ${newlyExecuted}).`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Liquidity transfer vote cast by ${agentId} for proposal ${proposalId} (Amount: ${amount}, Approved: ${newlyExecuted}).`,
        } as any);

        customEvents.push({
          type: "reinsurance_liquidity_transfer_proposed" as any,
          proposalId,
          fromSyndicateId,
          toSyndicateId,
          amount,
          agentId,
          targetState: votedState,
          timestamp,
          executed: newlyExecuted,
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
      newState.vectorClock = { ...newState.vectorClock };
      newState.vectorClock[agentId] = (newState.vectorClock[agentId] ?? 0) + 1;
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

  // Handle decentralized PROPOSE_JOINT_LOAN_PENALTY_WAIVER action (AF-98)
  if ((action as any).type === "PROPOSE_JOINT_LOAN_PENALTY_WAIVER") {
    const { groupId, reducedInterestRate, waivePenalty, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const jointLoan = state.jointLoans?.[groupId];
    const syndicate = jointLoan ? state.syndicates?.[jointLoan.syndicateId] : undefined;
    const bank = jointLoan ? state.syndicateBanks?.[jointLoan.syndicateId] : undefined;

    if (!groupId) {
      rejectionReason = `Group ID is required to propose joint loan penalty waiver.`;
    } else if (reducedInterestRate === undefined || reducedInterestRate < 0 || !Number.isInteger(reducedInterestRate)) {
      rejectionReason = `Reduced interest rate must be a non-negative integer.`;
    } else if (waivePenalty === undefined || typeof waivePenalty !== "boolean") {
      rejectionReason = `Waive penalty flag must be a boolean.`;
    } else if (!jointLoan) {
      rejectionReason = `Joint loan group ${groupId} does not exist or has no active loan.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate does not exist for the joint loan.`;
    } else if (!bank) {
      rejectionReason = `Syndicate bank does not exist for the joint loan.`;
    } else if (!jointLoan.members.includes(agentId) && !syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of the joint loan group or the syndicate bank, and cannot vote on penalty waiver.`;
    } else {
      const isDuringGracePeriod = state.step > jointLoan.dueStep && state.step <= jointLoan.dueStep + (jointLoan.gracePeriodSteps ?? 0);
      if (!isDuringGracePeriod) {
        rejectionReason = `Joint loan penalty waiver can only be proposed during the grace period (current step: ${state.step}, due step: ${jointLoan.dueStep}, grace period steps: ${jointLoan.gracePeriodSteps ?? 0}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && jointLoan) {
      const jointLoanPenaltyWaiverVotes = { ...(state.jointLoanPenaltyWaiverVotes || {}) };
      if (!jointLoanPenaltyWaiverVotes[groupId]) {
        jointLoanPenaltyWaiverVotes[groupId] = {};
      } else {
        jointLoanPenaltyWaiverVotes[groupId] = { ...jointLoanPenaltyWaiverVotes[groupId] };
      }

      const existingVote = jointLoanPenaltyWaiverVotes[groupId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        jointLoanPenaltyWaiverVotes[groupId][agentId] = {
          reducedInterestRate,
          waivePenalty,
          timestamp,
        };
        newState.jointLoanPenaltyWaiverVotes = jointLoanPenaltyWaiverVotes;
        newState = reconcileJointLoanPenaltyWaivers(newState, pack);

        const updatedLoan = newState.jointLoans?.[groupId];
        const currentRate = updatedLoan?.reducedInterestRate ?? reducedInterestRate;
        const currentWaive = updatedLoan?.waivePenalty ?? waivePenalty;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Agent ${agentId} voted for penalty waiver on joint loan ${groupId} (Reduced rate: ${reducedInterestRate}%, waive penalty: ${waivePenalty}).`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Joint loan penalty waiver vote cast by ${agentId} for loan ${groupId} (Reduced rate: ${reducedInterestRate}%, waive: ${waivePenalty}).`,
        } as any);

        customEvents.push({
          type: "joint_loan_penalty_waiver_proposed" as any,
          groupId,
          agentId,
          reducedInterestRate,
          waivePenalty,
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

  // Handle decentralized DECLARE_CARTEL_BANKRUPTCY action (AF-89)
  if ((action as any).type === "DECLARE_CARTEL_BANKRUPTCY") {
    const { syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to declare bankruptcy.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot declare bankruptcy.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndicate) {
      if (newState.syndicateBanks?.[syndicateId]?.loans) {
        const bank = newState.syndicateBanks[syndicateId];
        const loans = { ...bank.loans };
        delete loans[agentId];
        newState.syndicateBanks = {
          ...newState.syndicateBanks,
          [syndicateId]: {
            ...bank,
            loans,
            timestamp,
          },
        };
      }

      if (newState.defaultAlerts) {
        newState.defaultAlerts = { ...newState.defaultAlerts };
        delete newState.defaultAlerts[`${agentId}_${syndicateId}`];
      }

      if (!newState.creditRatings) newState.creditRatings = {};
      const currentRating = state.creditRatings?.[agentId] ?? 100;
      newState.creditRatings[agentId] = Math.max(50, currentRating);

      if (!newState.creditRecoveries) {
        newState.creditRecoveries = {};
      }
      newState.creditRecoveries = {
        ...newState.creditRecoveries,
        [agentId]: {
          agentId,
          startStep: state.step,
          lastRecoveryStep: state.step,
          targetScore: 100,
          active: true,
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Cartel Bankruptcy] Agent ${agentId} declared cartel bankruptcy. Restructured defaulted loan with syndicate ${syndicateId}, default alerts cleared, and set up credit recovery.`);

      customEvents.push({
        type: "narration",
        text: `⚖️ Agent ${agentId} declared cartel bankruptcy! Debts restructured and credit rating recovery initialized.`,
      } as any);

      customEvents.push({
        type: "cartel_bankruptcy_declared" as any,
        agentId,
        syndicateId,
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

  // Handle decentralized ADJUST_RESERVE_RATIO action (AF-105)
  if ((action as any).type === "ADJUST_RESERVE_RATIO") {
    const { syndicateId, reserveRatio, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to adjust reserve ratio.`;
    } else if (reserveRatio === undefined || reserveRatio < 0 || typeof reserveRatio !== "number") {
      rejectionReason = `Proposed reserve ratio must be a non-negative number.`;
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
      const reserveRatioVotes = { ...(state.reserveRatioVotes || {}) };
      if (!reserveRatioVotes[syndicateId]) {
        reserveRatioVotes[syndicateId] = {};
      } else {
        reserveRatioVotes[syndicateId] = { ...reserveRatioVotes[syndicateId] };
      }

      const existingVote = reserveRatioVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        reserveRatioVotes[syndicateId][agentId] = {
          reserveRatio,
          timestamp,
        };
        newState.reserveRatioVotes = reserveRatioVotes;
        newState = reconcileReserveRatios(newState, pack);

        const newConsensusRatio = newState.secondaryReserves?.[syndicateId]?.reserveRatio ?? 0.20;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate] Agent ${agentId} voted for secondary reserve ratio ${reserveRatio} in syndicate ${syndicateId} (New consensus ratio: ${newConsensusRatio}).`
        );

        customEvents.push({
          type: "reserve_ratio_adjusted" as any,
          agentId,
          syndicateId,
          reserveRatio,
          consensusRatio: newConsensusRatio,
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

  // Handle decentralized EXECUTE_AUTOMATED_BAILOUT action (AF-105)
  if ((action as any).type === "EXECUTE_AUTOMATED_BAILOUT") {
    const { sourceSyndicateId, targetSyndicateId, bailoutAmount, timestamp } = action as any;
    const pairKey = [sourceSyndicateId || "", targetSyndicateId || ""].sort().join(":");

    let ok = false;
    let rejectionReason: string | undefined;

    const syndSrc = state.syndicates?.[sourceSyndicateId];
    const syndDst = state.syndicates?.[targetSyndicateId];
    const contract = state.reinsuranceContracts?.[pairKey];
    const srcReserve = state.secondaryReserves?.[sourceSyndicateId];
    const dstPool = state.jointLoanInsurancePools?.[targetSyndicateId];

    if (!sourceSyndicateId || !targetSyndicateId) {
      rejectionReason = `Both sourceSyndicateId and targetSyndicateId are required to execute a bailout.`;
    } else if (!syndSrc) {
      rejectionReason = `Source syndicate ${sourceSyndicateId} does not exist.`;
    } else if (!syndDst) {
      rejectionReason = `Target syndicate ${targetSyndicateId} does not exist.`;
    } else if (sourceSyndicateId === targetSyndicateId) {
      rejectionReason = `Cannot execute a bailout to the same syndicate.`;
    } else if (bailoutAmount === undefined || bailoutAmount <= 0 || !Number.isInteger(bailoutAmount)) {
      rejectionReason = `Bailout amount must be a positive integer.`;
    } else if (!syndSrc.members.includes(agentId) && !syndDst.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of either syndicate and cannot execute a bailout.`;
    } else if (!contract || !contract.active) {
      rejectionReason = `Active reinsurance contract does not exist between ${sourceSyndicateId} and ${targetSyndicateId}.`;
    } else if (!srcReserve || srcReserve.reserveGold < bailoutAmount) {
      rejectionReason = `Source syndicate ${sourceSyndicateId} has insufficient secondary reserves (has ${srcReserve?.reserveGold ?? 0}, requested ${bailoutAmount}).`;
    } else if (!dstPool) {
      rejectionReason = `Target syndicate ${targetSyndicateId}'s insurance pool is not established.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && syndSrc && syndDst && dstPool && srcReserve) {
      // Deduct from source secondary reserve
      const updatedSrcReserve = {
        ...srcReserve,
        reserveGold: srcReserve.reserveGold - bailoutAmount,
        timestamp,
      };
      newState.secondaryReserves = {
        ...(state.secondaryReserves || {}),
        [sourceSyndicateId]: updatedSrcReserve,
      };

      // Add to target primary insurance pool
      const updatedDstPool = {
        ...dstPool,
        poolGold: dstPool.poolGold + bailoutAmount,
        timestamp,
      };
      newState.jointLoanInsurancePools = {
        ...(state.jointLoanInsurancePools || {}),
        [targetSyndicateId]: updatedDstPool,
      };

      // Record bailout
      const bailoutId = `${sourceSyndicateId}:${targetSyndicateId}:${timestamp}`;
      const newBailout = {
        id: bailoutId,
        sourceSyndicateId,
        targetSyndicateId,
        bailoutAmount,
        timestamp,
      };
      newState.automatedBailouts = {
        ...(state.automatedBailouts || {}),
        [bailoutId]: newBailout,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Automated Bailout] Agent ${agentId} manually executed automated bailout of ${bailoutAmount} gold from ${sourceSyndicateId} secondary reserves to ${targetSyndicateId} insurance pool.`
      );

      customEvents.push({
        type: "narration",
        text: `💰 Automated bailout executed! ${sourceSyndicateId} transferred ${bailoutAmount} gold of secondary reserves to ${targetSyndicateId} insurance pool.`,
      } as any);

      customEvents.push({
        type: "automated_bailout_executed" as any,
        sourceSyndicateId,
        targetSyndicateId,
        bailoutAmount,
        agentId,
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

  // Handle decentralized INVEST_SECONDARY_RESERVE action (AF-106)
  if ((action as any).type === "INVEST_SECONDARY_RESERVE") {
    const { syndicateId, vaultId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const reserve = state.secondaryReserves?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);
    const vault = vaults[vaultId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to invest secondary reserves.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required to invest secondary reserves.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Investment amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!vault) {
      rejectionReason = `Investment vault ${vaultId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot invest.`;
    } else if (!reserve || reserve.reserveGold < amount) {
      rejectionReason = `Syndicate ${syndicateId} has insufficient secondary reserves (has ${reserve?.reserveGold ?? 0}, requested ${amount}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && reserve) {
      // Deduct from secondary reserves
      newState.secondaryReserves = {
        ...(state.secondaryReserves || {}),
        [syndicateId]: {
          ...reserve,
          reserveGold: reserve.reserveGold - amount,
          timestamp,
        },
      };

      // Add to investments
      const groupInvestments = { ...(state.secondaryReserveInvestments?.[syndicateId] || {}) };
      const currentInvestment = groupInvestments[vaultId];
      groupInvestments[vaultId] = {
        syndicateId,
        vaultId,
        investedGold: (currentInvestment?.investedGold ?? 0) + amount,
        timestamp,
      };

      newState.secondaryReserveInvestments = {
        ...(state.secondaryReserveInvestments || {}),
        [syndicateId]: groupInvestments,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Reserve Investment] Agent ${agentId} invested ${amount} gold of secondary reserves of syndicate ${syndicateId} into vault ${vault.name} (${vaultId}).`
      );

      customEvents.push({
        type: "narration",
        text: `📈 Secondary reserves investment! ${syndicateId} invested ${amount} gold into yield-bearing vault ${vault.name}.`,
      } as any);

      customEvents.push({
        type: "secondary_reserve_invested" as any,
        syndicateId,
        vaultId,
        amount,
        agentId,
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

  // Handle decentralized WITHDRAW_SECONDARY_RESERVE action (AF-106)
  if ((action as any).type === "WITHDRAW_SECONDARY_RESERVE") {
    const { syndicateId, vaultId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const reserve = state.secondaryReserves?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);
    const vault = vaults[vaultId];
    const currentInvestment = state.secondaryReserveInvestments?.[syndicateId]?.[vaultId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to withdraw secondary reserves.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required to withdraw secondary reserves.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Withdrawal amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!vault) {
      rejectionReason = `Investment vault ${vaultId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot withdraw.`;
    } else if (!currentInvestment || currentInvestment.investedGold < amount) {
      rejectionReason = `Syndicate ${syndicateId} has insufficient invested gold in vault ${vaultId} (has ${currentInvestment?.investedGold ?? 0}, requested ${amount}).`;
    } else if (!reserve) {
      rejectionReason = `Secondary reserve for syndicate ${syndicateId} does not exist.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];
    if (ok && reserve && currentInvestment) {
      // Add back to secondary reserves
      newState.secondaryReserves = {
        ...(state.secondaryReserves || {}),
        [syndicateId]: {
          ...reserve,
          reserveGold: reserve.reserveGold + amount,
          timestamp,
        },
      };

      // Deduct from investments
      const groupInvestments = { ...(state.secondaryReserveInvestments?.[syndicateId] || {}) };
      groupInvestments[vaultId] = {
        ...currentInvestment,
        investedGold: currentInvestment.investedGold - amount,
        timestamp,
      };

      newState.secondaryReserveInvestments = {
        ...(state.secondaryReserveInvestments || {}),
        [syndicateId]: groupInvestments,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Reserve Withdrawal] Agent ${agentId} withdrew ${amount} gold of secondary reserves of syndicate ${syndicateId} from vault ${vault.name} (${vaultId}).`
      );

      customEvents.push({
        type: "narration",
        text: `📉 Secondary reserves withdrawal! ${syndicateId} withdrew ${amount} gold from vault ${vault.name}.`,
      } as any);

      customEvents.push({
        type: "secondary_reserve_withdrawn" as any,
        syndicateId,
        vaultId,
        amount,
        agentId,
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

  // Handle decentralized PACKAGE_LOAN_CDO action (AF-107)
  if ((action as any).type === "PACKAGE_LOAN_CDO") {
    const { cdoId, creatorSyndicateId, assets, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const creatorSyndicate = state.syndicates?.[creatorSyndicateId];

    if (!cdoId) {
      rejectionReason = `CDO ID is required to package loans into CDO.`;
    } else if (!creatorSyndicateId) {
      rejectionReason = `Creator Syndicate ID is required.`;
    } else if (!creatorSyndicate) {
      rejectionReason = `Syndicate ${creatorSyndicateId} does not exist.`;
    } else if (!creatorSyndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${creatorSyndicateId} and cannot package CDO.`;
    } else if (!assets || !Array.isArray(assets) || assets.length === 0) {
      rejectionReason = `Asset pool list is required and cannot be empty.`;
    } else if (state.cdos?.[cdoId]) {
      rejectionReason = `CDO with ID ${cdoId} already exists.`;
    } else {
      // Validate all assets
      let assetsValid = true;
      for (const asset of assets) {
        if (!asset.type || !asset.syndicateId || !asset.assetId) {
          rejectionReason = `Invalid asset schema. Each asset must contain type, syndicateId, and assetId.`;
          assetsValid = false;
          break;
        }

        if (asset.syndicateId !== creatorSyndicateId) {
          rejectionReason = `Syndicate ${creatorSyndicateId} cannot package asset owned by syndicate ${asset.syndicateId}.`;
          assetsValid = false;
          break;
        }

        if (asset.type === "loan") {
          const bank = state.syndicateBanks?.[creatorSyndicateId];
          const loan = bank?.loans?.[asset.assetId];
          if (!loan) {
            rejectionReason = `Loan for agent ${asset.assetId} does not exist in syndicate bank ${creatorSyndicateId}.`;
            assetsValid = false;
            break;
          }
        } else if (asset.type === "investment") {
          const investment = state.secondaryReserveInvestments?.[creatorSyndicateId]?.[asset.assetId];
          if (!investment || investment.investedGold <= 0) {
            rejectionReason = `Reserve investment in vault ${asset.assetId} does not exist or has no gold for syndicate ${creatorSyndicateId}.`;
            assetsValid = false;
            break;
          }
        } else {
          rejectionReason = `Invalid asset type ${asset.type}. Must be loan or investment.`;
          assetsValid = false;
          break;
        }
      }

      if (assetsValid) {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && creatorSyndicate) {
      const validatedAssets: any[] = [];
      let totalValue = 0;

      newState.syndicateBanks = state.syndicateBanks ? { ...state.syndicateBanks } : {};
      newState.secondaryReserveInvestments = state.secondaryReserveInvestments ? { ...state.secondaryReserveInvestments } : {};

      if (newState.syndicateBanks[creatorSyndicateId]) {
        newState.syndicateBanks[creatorSyndicateId] = {
          ...newState.syndicateBanks[creatorSyndicateId],
          loans: newState.syndicateBanks[creatorSyndicateId].loans ? { ...newState.syndicateBanks[creatorSyndicateId].loans } : {},
        };
      }
      if (newState.secondaryReserveInvestments[creatorSyndicateId]) {
        newState.secondaryReserveInvestments[creatorSyndicateId] = {
          ...newState.secondaryReserveInvestments[creatorSyndicateId],
        };
      }

      for (const asset of assets) {
        if (asset.type === "loan") {
          const loan = state.syndicateBanks![creatorSyndicateId].loans![asset.assetId];
          const loanVal = loan.amount + loan.interestAccrued;
          totalValue += loanVal;

          validatedAssets.push({
            type: "loan",
            syndicateId: creatorSyndicateId,
            assetId: asset.assetId,
            value: loanVal,
            originalLoan: { ...loan },
          });

          delete newState.syndicateBanks[creatorSyndicateId].loans![asset.assetId];
        } else if (asset.type === "investment") {
          const investment = state.secondaryReserveInvestments![creatorSyndicateId][asset.assetId];
          const investVal = investment.investedGold;
          totalValue += investVal;

          validatedAssets.push({
            type: "investment",
            syndicateId: creatorSyndicateId,
            assetId: asset.assetId,
            value: investVal,
            originalInvestment: { ...investment },
          });

          delete newState.secondaryReserveInvestments[creatorSyndicateId][asset.assetId];
        }
      }

      const S = Math.floor(totalValue * 0.50);
      const M = Math.floor(totalValue * 0.30);
      const E = totalValue - S - M;

      newState.cdos = {
        ...(state.cdos || {}),
        [cdoId]: {
          id: cdoId,
          creatorSyndicateId,
          assets: validatedAssets,
          totalValue,
          tranches: {
            senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: S, ownership: { [creatorSyndicateId]: S }, timestamp },
            mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: M, ownership: { [creatorSyndicateId]: M }, timestamp },
            equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: E, ownership: { [creatorSyndicateId]: E }, timestamp },
          },
          timestamp,
        },
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[CDO Package] Syndicate ${creatorSyndicateId} packaged ${assets.length} assets into CDO ${cdoId} with total value ${totalValue} gold (Senior: ${S}, Mezzanine: ${M}, Equity: ${E}).`
      );

      customEvents.push({
        type: "narration",
        text: `📦 CDO packaged! Syndicate ${creatorSyndicateId} created Collateralized Debt Obligation ${cdoId} valuing ${totalValue} gold.`,
      } as any);

      customEvents.push({
        type: "cdo_packaged" as any,
        cdoId,
        creatorSyndicateId,
        totalValue,
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

  // Handle decentralized TRADE_CDO_TRANCHE action (AF-107)
  if ((action as any).type === "TRADE_CDO_TRANCHE") {
    const { cdoId, trancheId, sellerSyndicateId, buyerSyndicateId, amount, goldPrice, timestamp, marginEnabled, borrowedAmount } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const cdo = state.cdos?.[cdoId];
    const sellerSyndicate = state.syndicates?.[sellerSyndicateId];
    const buyerSyndicate = state.syndicates?.[buyerSyndicateId];
    const tranche = cdo?.tranches?.[trancheId as "senior" | "mezzanine" | "equity"];
    const sellerOwnership = tranche?.ownership?.[sellerSyndicateId] ?? 0;

    if (!cdoId) {
      rejectionReason = `CDO ID is required to trade CDO tranche.`;
    } else if (!trancheId) {
      rejectionReason = `Tranche ID (senior, mezzanine, equity) is required.`;
    } else if (!sellerSyndicateId) {
      rejectionReason = `Seller Syndicate ID is required.`;
    } else if (!buyerSyndicateId) {
      rejectionReason = `Buyer Syndicate ID is required.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Trade stake amount must be a positive integer.`;
    } else if (goldPrice === undefined || goldPrice < 0 || !Number.isInteger(goldPrice)) {
      rejectionReason = `Gold price must be a non-negative integer.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!sellerSyndicate) {
      rejectionReason = `Seller syndicate ${sellerSyndicateId} does not exist.`;
    } else if (!buyerSyndicate) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} does not exist.`;
    } else if (!sellerSyndicate.members.includes(agentId) && !buyerSyndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} must be a member of the buyer or seller syndicate to trade.`;
    } else if (!tranche) {
      rejectionReason = `Tranche ${trancheId} does not exist in CDO ${cdoId}.`;
    } else if (sellerOwnership < amount) {
      rejectionReason = `Seller syndicate ${sellerSyndicateId} has insufficient owned stake in CDO ${cdoId} tranche ${trancheId} (has ${sellerOwnership}, requested ${amount}).`;
    } else if (marginEnabled && (!state.marginAccounts || !state.marginAccounts[buyerSyndicateId])) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} does not have a margin account.`;
    } else if (marginEnabled && (borrowedAmount === undefined || borrowedAmount <= 0 || borrowedAmount > goldPrice || !Number.isInteger(borrowedAmount))) {
      rejectionReason = `Borrowed amount must be a positive integer less than or equal to gold price.`;
    } else if (marginEnabled && (buyerSyndicate.warChest ?? 0) < (goldPrice - borrowedAmount)) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} has insufficient gold in its war chest to cover down payment of ${goldPrice - borrowedAmount} (has ${buyerSyndicate.warChest ?? 0}).`;
    } else if (!marginEnabled && goldPrice > 0 && (buyerSyndicate.warChest ?? 0) < goldPrice) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} has insufficient gold in its war chest to pay price of ${goldPrice} (has ${buyerSyndicate.warChest ?? 0}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && cdo && tranche) {
      const seller = state.syndicates![sellerSyndicateId];
      const buyer = state.syndicates![buyerSyndicateId];

      newState.cdos = { ...state.cdos };
      const updatedCdo = {
        ...cdo,
        tranches: {
          ...cdo.tranches,
          [trancheId as "senior" | "mezzanine" | "equity"]: {
            ...tranche,
            ownership: {
              ...tranche.ownership,
              [sellerSyndicateId]: sellerOwnership - amount,
              [buyerSyndicateId]: (tranche.ownership?.[buyerSyndicateId] ?? 0) + amount,
            },
            timestamp,
          },
        },
        timestamp,
      };
      newState.cdos[cdoId] = updatedCdo;

      if (goldPrice > 0) {
        newState.syndicates = state.syndicates ? { ...state.syndicates } : {};
        if (marginEnabled && borrowedAmount !== undefined) {
          const downPayment = goldPrice - borrowedAmount;
          newState.syndicates[buyerSyndicateId] = {
            ...buyer,
            warChest: (buyer.warChest ?? 0) - downPayment,
          } as any;

          newState.marginAccounts = { ...state.marginAccounts };
          const marginAccount = { ...newState.marginAccounts[buyerSyndicateId]! };
          const leveragedTranches = { ...(marginAccount.leveragedTranchePositions || {}) };
          const posKey = `${cdoId}_${trancheId}`;
          const existingPos = leveragedTranches[posKey];

          leveragedTranches[posKey] = {
            cdoId,
            trancheId,
            borrowedAmount: (existingPos?.borrowedAmount ?? 0) + borrowedAmount,
            purchasedStake: (existingPos?.purchasedStake ?? 0) + amount,
            timestamp,
          };
          marginAccount.leveragedTranchePositions = leveragedTranches;
          marginAccount.timestamp = timestamp;
          newState.marginAccounts[buyerSyndicateId] = marginAccount;
        } else {
          newState.syndicates[buyerSyndicateId] = {
            ...buyer,
            warChest: (buyer.warChest ?? 0) - goldPrice,
          } as any;
        }

        newState.syndicates[sellerSyndicateId] = {
          ...seller,
          warChest: (seller.warChest ?? 0) + goldPrice,
        } as any;
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[CDO Tranche Trade] Syndicate ${sellerSyndicateId} traded ${amount} stake of CDO ${cdoId} tranche ${trancheId} to Syndicate ${buyerSyndicateId} for ${goldPrice} gold.`
      );

      customEvents.push({
        type: "narration",
        text: `🤝 CDO tranche traded! ${sellerSyndicateId} sold ${amount} stake of ${cdoId} (${trancheId}) to ${buyerSyndicateId} for ${goldPrice} gold.`,
      } as any);

      customEvents.push({
        type: "cdo_tranche_traded" as any,
        cdoId,
        trancheId,
        sellerSyndicateId,
        buyerSyndicateId,
        amount,
        goldPrice,
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

  // Handle decentralized BUY_CREDIT_DEFAULT_SWAP action (AF-108)
  if ((action as any).type === "BUY_CREDIT_DEFAULT_SWAP") {
    const { cdsId, buyerSyndicateId, writerSyndicateId, cdoId, trancheId, notionalValue, premiumRate, timestamp, marginEnabled } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const buyerSyndicate = state.syndicates?.[buyerSyndicateId];
    const writerSyndicate = state.syndicates?.[writerSyndicateId];
    const cdo = state.cdos?.[cdoId];
    const tranche = cdo?.tranches?.[trancheId as "senior" | "mezzanine" | "equity"];

    if (!cdsId) {
      rejectionReason = `CDS ID is required to buy Credit Default Swap.`;
    } else if (!buyerSyndicateId) {
      rejectionReason = `Buyer Syndicate ID is required.`;
    } else if (!writerSyndicateId) {
      rejectionReason = `Writer Syndicate ID is required.`;
    } else if (!cdoId) {
      rejectionReason = `CDO ID is required.`;
    } else if (!trancheId) {
      rejectionReason = `Tranche ID is required.`;
    } else if (notionalValue === undefined || notionalValue <= 0 || !Number.isInteger(notionalValue)) {
      rejectionReason = `Notional value must be a positive integer.`;
    } else if (premiumRate === undefined || premiumRate <= 0) {
      rejectionReason = `Premium rate must be a positive number.`;
    } else if (!buyerSyndicate) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} does not exist.`;
    } else if (!writerSyndicate) {
      rejectionReason = `Writer syndicate ${writerSyndicateId} does not exist.`;
    } else if (buyerSyndicateId === writerSyndicateId) {
      rejectionReason = `Buyer and writer syndicates must be different.`;
    } else if (!buyerSyndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of buyer syndicate ${buyerSyndicateId}.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!tranche) {
      rejectionReason = `Tranche ${trancheId} does not exist in CDO ${cdoId}.`;
    } else if (marginEnabled && (!state.marginAccounts || !state.marginAccounts[writerSyndicateId])) {
      rejectionReason = `Writer syndicate ${writerSyndicateId} does not have a margin account opened.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok) {
      const creditDefaultSwapVotes = { ...(state.creditDefaultSwapVotes || {}) };
      if (!creditDefaultSwapVotes[cdsId]) {
        creditDefaultSwapVotes[cdsId] = {};
      } else {
        creditDefaultSwapVotes[cdsId] = { ...creditDefaultSwapVotes[cdsId] };
      }

      const existingVote = creditDefaultSwapVotes[cdsId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        creditDefaultSwapVotes[cdsId][agentId] = {
          cdsId,
          buyerSyndicateId,
          writerSyndicateId,
          cdoId,
          trancheId,
          notionalValue,
          premiumRate,
          side: "buyer",
          timestamp,
          marginEnabled: marginEnabled || false,
        };
        newState.creditDefaultSwapVotes = creditDefaultSwapVotes;
        newState = reconcileCreditDefaultSwaps(newState, pack);

        const activeCds = newState.creditDefaultSwaps?.[cdsId]?.active ?? false;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[CDS Buy Vote] Agent ${agentId} voted to BUY CDS ${cdsId} from Syndicate ${writerSyndicateId} on CDO ${cdoId} tranche ${trancheId} with notional ${notionalValue} (Status: ${activeCds ? "ACTIVE" : "PENDING"}).`
        );

        customEvents.push({
          type: "narration",
          text: `🛡️ CDS buy vote cast by ${agentId} for ${cdsId} (Notional: ${notionalValue}, Active: ${activeCds}).`,
        } as any);

        customEvents.push({
          type: "cds_bought" as any,
          cdsId,
          buyerSyndicateId,
          writerSyndicateId,
          cdoId,
          trancheId,
          notionalValue,
          premiumRate,
          active: activeCds,
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

  // Handle decentralized WRITE_CREDIT_DEFAULT_SWAP action (AF-108)
  if ((action as any).type === "WRITE_CREDIT_DEFAULT_SWAP") {
    const { cdsId, writerSyndicateId, buyerSyndicateId, cdoId, trancheId, notionalValue, premiumRate, timestamp, marginEnabled } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const buyerSyndicate = state.syndicates?.[buyerSyndicateId];
    const writerSyndicate = state.syndicates?.[writerSyndicateId];
    const cdo = state.cdos?.[cdoId];
    const tranche = cdo?.tranches?.[trancheId as "senior" | "mezzanine" | "equity"];

    if (!cdsId) {
      rejectionReason = `CDS ID is required to write Credit Default Swap.`;
    } else if (!buyerSyndicateId) {
      rejectionReason = `Buyer Syndicate ID is required.`;
    } else if (!writerSyndicateId) {
      rejectionReason = `Writer Syndicate ID is required.`;
    } else if (!cdoId) {
      rejectionReason = `CDO ID is required.`;
    } else if (!trancheId) {
      rejectionReason = `Tranche ID is required.`;
    } else if (notionalValue === undefined || notionalValue <= 0 || !Number.isInteger(notionalValue)) {
      rejectionReason = `Notional value must be a positive integer.`;
    } else if (premiumRate === undefined || premiumRate <= 0) {
      rejectionReason = `Premium rate must be a positive number.`;
    } else if (!buyerSyndicate) {
      rejectionReason = `Buyer syndicate ${buyerSyndicateId} does not exist.`;
    } else if (!writerSyndicate) {
      rejectionReason = `Writer syndicate ${writerSyndicateId} does not exist.`;
    } else if (buyerSyndicateId === writerSyndicateId) {
      rejectionReason = `Buyer and writer syndicates must be different.`;
    } else if (!writerSyndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of writer syndicate ${writerSyndicateId}.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!tranche) {
      rejectionReason = `Tranche ${trancheId} does not exist in CDO ${cdoId}.`;
    } else if (marginEnabled && (!state.marginAccounts || !state.marginAccounts[writerSyndicateId])) {
      rejectionReason = `Writer syndicate ${writerSyndicateId} does not have a margin account opened.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok) {
      const creditDefaultSwapVotes = { ...(state.creditDefaultSwapVotes || {}) };
      if (!creditDefaultSwapVotes[cdsId]) {
        creditDefaultSwapVotes[cdsId] = {};
      } else {
        creditDefaultSwapVotes[cdsId] = { ...creditDefaultSwapVotes[cdsId] };
      }

      const existingVote = creditDefaultSwapVotes[cdsId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        creditDefaultSwapVotes[cdsId][agentId] = {
          cdsId,
          buyerSyndicateId,
          writerSyndicateId,
          cdoId,
          trancheId,
          notionalValue,
          premiumRate,
          side: "writer",
          timestamp,
          marginEnabled: marginEnabled || false,
        };
        newState.creditDefaultSwapVotes = creditDefaultSwapVotes;
        newState = reconcileCreditDefaultSwaps(newState, pack);

        const activeCds = newState.creditDefaultSwaps?.[cdsId]?.active ?? false;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[CDS Write Vote] Agent ${agentId} voted to WRITE CDS ${cdsId} to Syndicate ${buyerSyndicateId} on CDO ${cdoId} tranche ${trancheId} with notional ${notionalValue} (Status: ${activeCds ? "ACTIVE" : "PENDING"}).`
        );

        customEvents.push({
          type: "narration",
          text: `🛡️ CDS write vote cast by ${agentId} for ${cdsId} (Notional: ${notionalValue}, Active: ${activeCds}).`,
        } as any);

        customEvents.push({
          type: "cds_written" as any,
          cdsId,
          buyerSyndicateId,
          writerSyndicateId,
          cdoId,
          trancheId,
          notionalValue,
          premiumRate,
          active: activeCds,
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

  // Handle decentralized OPEN_CDS_MARGIN_ACCOUNT action
  if ((action as any).type === "OPEN_CDS_MARGIN_ACCOUNT") {
    const { syndicateId, initialDeposit, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to open margin account.`;
    } else if (initialDeposit === undefined || initialDeposit < 0 || !Number.isInteger(initialDeposit)) {
      rejectionReason = `Initial deposit must be a non-negative integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if ((syndicate.warChest ?? 0) < initialDeposit) {
      rejectionReason = `Syndicate ${syndicateId} has insufficient gold in its war chest to open margin account with deposit of ${initialDeposit} (has ${syndicate.warChest ?? 0}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      newState.syndicates = { ...state.syndicates };
      newState.syndicates[syndicateId] = {
        ...syndicate,
        warChest: (syndicate.warChest ?? 0) - initialDeposit,
      } as any;

      newState.marginAccounts = { ...(state.marginAccounts || {}) };
      newState.marginAccounts[syndicateId] = {
        syndicateId,
        collateral: initialDeposit,
        leveragedCDSIds: [],
        leveragedTranchePositions: {},
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Account Open] Syndicate ${syndicateId} opened a margin account with initial deposit of ${initialDeposit} gold.`
      );

      customEvents.push({
        type: "narration",
        text: `💰 Margin account opened for Syndicate ${syndicateId} (Deposit: ${initialDeposit} gold).`,
      } as any);

      customEvents.push({
        type: "margin_account_opened" as any,
        syndicateId,
        initialDeposit,
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

  // Handle decentralized DEPOSIT_MARGIN_COLLATERAL action
  if ((action as any).type === "DEPOSIT_MARGIN_COLLATERAL") {
    const { syndicateId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to deposit margin collateral.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Collateral amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId}.`;
    } else if ((syndicate.warChest ?? 0) < amount) {
      rejectionReason = `Syndicate ${syndicateId} has insufficient gold in its war chest to deposit collateral of ${amount} (has ${syndicate.warChest ?? 0}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      newState.syndicates = { ...state.syndicates };
      newState.syndicates[syndicateId] = {
        ...syndicate,
        warChest: (syndicate.warChest ?? 0) - amount,
      } as any;

      newState.marginAccounts = { ...state.marginAccounts };
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        collateral: marginAccount.collateral + amount,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Collateral Deposit] Syndicate ${syndicateId} deposited ${amount} gold as margin collateral.`
      );

      customEvents.push({
        type: "narration",
        text: `💰 Collateral of ${amount} gold deposited to margin account of Syndicate ${syndicateId}.`,
      } as any);

      customEvents.push({
        type: "margin_collateral_deposited" as any,
        syndicateId,
        amount,
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

  // Handle decentralized AUTHORIZE_MARGIN_REHYPOTHECATION action (AF-111)
  if ((action as any).type === "AUTHORIZE_MARGIN_REHYPOTHECATION") {
    const { syndicateId, vaultId, percentage, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);
    const vault = vaults[vaultId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to authorize margin rehypothecation.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required to authorize margin rehypothecation.`;
    } else if (percentage === undefined || percentage < 0 || percentage > 100 || !Number.isInteger(percentage)) {
      rejectionReason = `Rehypothecation percentage must be an integer between 0 and 100.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on rehypothecation.`;
    } else if (!vault) {
      rejectionReason = `Vault ${vaultId} does not exist.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const marginRehypothecationVotes = { ...(state.marginRehypothecationVotes || {}) };
      if (!marginRehypothecationVotes[syndicateId]) {
        marginRehypothecationVotes[syndicateId] = {};
      } else {
        marginRehypothecationVotes[syndicateId] = { ...marginRehypothecationVotes[syndicateId] };
      }

      const existingVote = marginRehypothecationVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        marginRehypothecationVotes[syndicateId][agentId] = {
          vaultId,
          percentage,
          timestamp,
        };
        newState.marginRehypothecationVotes = marginRehypothecationVotes;
        newState = reconcileMarginRehypothecations(newState, pack);

        const currentRehypo = newState.marginAccounts?.[syndicateId];
        const isAuthorized = currentRehypo?.rehypothecationAuthorized || false;
        const currentPercentage = currentRehypo?.rehypothecationPercentage ?? 0;
        const currentVaultId = currentRehypo?.rehypothecationVaultId ?? "";

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Margin Rehypothecation Vote] Agent ${agentId} voted to authorize rehypothecation for Syndicate ${syndicateId} (Vault: ${vaultId}, Percentage: ${percentage}%). Consensus authorized: ${isAuthorized} (Vault: ${currentVaultId}, Percentage: ${currentPercentage}%).`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Margin rehypothecation vote cast by ${agentId} for Syndicate ${syndicateId} (${percentage}% to ${vaultId}).`,
        } as any);

        customEvents.push({
          type: "margin_rehypothecation_voted" as any,
          syndicateId,
          agentId,
          vaultId,
          percentage,
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

  // Handle decentralized REVOKE_MARGIN_REHYPOTHECATION action (AF-111)
  if ((action as any).type === "REVOKE_MARGIN_REHYPOTHECATION") {
    const { syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to revoke margin rehypothecation.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote to revoke rehypothecation.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const marginRehypothecationRevokeVotes = { ...(state.marginRehypothecationRevokeVotes || {}) };
      if (!marginRehypothecationRevokeVotes[syndicateId]) {
        marginRehypothecationRevokeVotes[syndicateId] = {};
      } else {
        marginRehypothecationRevokeVotes[syndicateId] = { ...marginRehypothecationRevokeVotes[syndicateId] };
      }

      const existingVote = marginRehypothecationRevokeVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        marginRehypothecationRevokeVotes[syndicateId][agentId] = {
          timestamp,
        };
        newState.marginRehypothecationRevokeVotes = marginRehypothecationRevokeVotes;
        newState = reconcileMarginRehypothecations(newState, pack);

        const currentRehypo = newState.marginAccounts?.[syndicateId];
        const isAuthorized = currentRehypo?.rehypothecationAuthorized || false;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Margin Rehypothecation Revoke Vote] Agent ${agentId} voted to revoke rehypothecation for Syndicate ${syndicateId}. Consensus authorized: ${isAuthorized}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Margin rehypothecation revoke vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "margin_rehypothecation_revoke_voted" as any,
          syndicateId,
          agentId,
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

  // Handle decentralized SET_MARGIN_REBALANCING_POLICY action (AF-112)
  if ((action as any).type === "SET_MARGIN_REBALANCING_POLICY") {
    const { syndicateId, enabled, vaultTargets, liquidityBufferRatio, bufferTriggerRatio, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to set margin rebalancing policy.`;
    } else if (enabled === undefined) {
      rejectionReason = `Enabled status is required to set margin rebalancing policy.`;
    } else if (enabled && (!vaultTargets || Object.keys(vaultTargets).length === 0)) {
      rejectionReason = `Vault targets are required when rebalancing is enabled.`;
    } else if (liquidityBufferRatio === undefined || liquidityBufferRatio < 0 || liquidityBufferRatio > 100 || !Number.isInteger(liquidityBufferRatio)) {
      rejectionReason = `Liquidity buffer ratio must be an integer between 0 and 100.`;
    } else if (bufferTriggerRatio === undefined || bufferTriggerRatio <= 0) {
      rejectionReason = `Buffer trigger ratio must be greater than 0.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on rebalancing policy.`;
    } else {
      // Validate all vaults in vaultTargets exist
      let allVaultsExist = true;
      let sumTargets = 0;
      for (const [vaultId, pct] of Object.entries(vaultTargets || {})) {
        if (!vaults[vaultId]) {
          allVaultsExist = false;
          rejectionReason = `Vault ${vaultId} does not exist.`;
          break;
        }
        if (typeof pct !== "number" || pct < 0 || pct > 100 || !Number.isInteger(pct)) {
          allVaultsExist = false;
          rejectionReason = `Target percentage for vault ${vaultId} must be an integer between 0 and 100.`;
          break;
        }
        sumTargets += pct;
      }
      if (allVaultsExist) {
        if (enabled && sumTargets !== 100) {
          rejectionReason = `Sum of vault target percentages must equal exactly 100 when rebalancing is enabled.`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const marginRebalancingPolicyVotes = { ...(state.marginRebalancingPolicyVotes || {}) };
      if (!marginRebalancingPolicyVotes[syndicateId]) {
        marginRebalancingPolicyVotes[syndicateId] = {};
      } else {
        marginRebalancingPolicyVotes[syndicateId] = { ...marginRebalancingPolicyVotes[syndicateId] };
      }

      const existingVote = marginRebalancingPolicyVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        marginRebalancingPolicyVotes[syndicateId][agentId] = {
          enabled,
          vaultTargets,
          liquidityBufferRatio,
          bufferTriggerRatio,
          timestamp,
        };
        newState.marginRebalancingPolicyVotes = marginRebalancingPolicyVotes;
        newState = reconcileMarginRebalancingPolicies(newState, pack);

        const currentMA = newState.marginAccounts?.[syndicateId];
        const isEnabled = currentMA?.rebalancingEnabled || false;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Margin Rebalancing Policy Vote] Agent ${agentId} voted on rebalancing policy for Syndicate ${syndicateId}. Consensus enabled: ${isEnabled}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Margin rebalancing policy vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "margin_rebalancing_policy_voted" as any,
          syndicateId,
          agentId,
          enabled,
          vaultTargets,
          liquidityBufferRatio,
          bufferTriggerRatio,
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

  // Handle decentralized REBALANCE_MARGIN_COLLATERAL action (AF-112)
  if ((action as any).type === "REBALANCE_MARGIN_COLLATERAL") {
    const { syndicateId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to rebalance margin collateral.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot trigger manual rebalancing.`;
    } else if (!marginAccount.rebalancingEnabled) {
      rejectionReason = `Rebalancing policy is not enabled for Syndicate ${syndicateId}.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const ma = { ...marginAccount };
      const collateral = ma.collateral;
      const targetBuffer = Math.floor(collateral * ((ma.liquidityBufferRatio ?? 0) / 100));
      const targetRehypothecated = collateral - targetBuffer;
      const vaultAllocations: Record<string, number> = {};

      for (const [vaultId, pct] of Object.entries(ma.vaultTargets || {})) {
        vaultAllocations[vaultId] = Math.floor(targetRehypothecated * (pct / 100));
      }
      const sumAllocated = Object.values(vaultAllocations).reduce((a, b) => a + b, 0);
      ma.liquidityBuffer = collateral - sumAllocated;
      ma.vaultAllocations = vaultAllocations;
      ma.timestamp = Math.max(timestamp, state.step);

      newState.marginAccounts = {
        ...(newState.marginAccounts || {}),
        [syndicateId]: ma,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Rebalance] Manually rebalanced collateral for Syndicate ${syndicateId}. Local buffer: ${ma.liquidityBuffer}, vault allocations: ${JSON.stringify(vaultAllocations)}.`
      );

      customEvents.push({
        type: "narration",
        text: `⚖️ Margin collateral rebalanced for Syndicate ${syndicateId}.`,
      } as any);

      customEvents.push({
        type: "margin_collateral_rebalanced" as any,
        syndicateId,
        agentId,
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

  // Handle decentralized DEPLOY_REBALANCING_ADVISOR action (AF-113)
  if ((action as any).type === "DEPLOY_REBALANCING_ADVISOR") {
    const { syndicateId, enabled, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to deploy rebalancing advisor.`;
    } else if (enabled === undefined) {
      rejectionReason = `Enabled status is required to deploy rebalancing advisor.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on rebalancing advisor.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const rebalancingAdvisorVotes = { ...(state.rebalancingAdvisorVotes || {}) };
      if (!rebalancingAdvisorVotes[syndicateId]) {
        rebalancingAdvisorVotes[syndicateId] = {};
      } else {
        rebalancingAdvisorVotes[syndicateId] = { ...rebalancingAdvisorVotes[syndicateId] };
      }

      const existingVote = rebalancingAdvisorVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        rebalancingAdvisorVotes[syndicateId][agentId] = {
          enabled,
          timestamp,
        };
        newState.rebalancingAdvisorVotes = rebalancingAdvisorVotes;
        newState = reconcileRebalancingAdvisors(newState, pack);

        const currentMA = newState.marginAccounts?.[syndicateId];
        const isEnabled = currentMA?.advisorEnabled || false;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Rebalancing Advisor Vote] Agent ${agentId} voted on deploying advisor for Syndicate ${syndicateId}. Consensus enabled: ${isEnabled}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Rebalancing advisor vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "rebalancing_advisor_voted" as any,
          syndicateId,
          agentId,
          enabled,
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

  // Handle decentralized SET_ADVISOR_SAFETY_THRESHOLD action (AF-113)
  if ((action as any).type === "SET_ADVISOR_SAFETY_THRESHOLD") {
    const { syndicateId, threshold, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to set advisor safety threshold.`;
    } else if (threshold === undefined || threshold < 0) {
      rejectionReason = `Valid threshold is required to set advisor safety threshold.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on advisor safety threshold.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const advisorSafetyThresholdVotes = { ...(state.advisorSafetyThresholdVotes || {}) };
      if (!advisorSafetyThresholdVotes[syndicateId]) {
        advisorSafetyThresholdVotes[syndicateId] = {};
      } else {
        advisorSafetyThresholdVotes[syndicateId] = { ...advisorSafetyThresholdVotes[syndicateId] };
      }

      const existingVote = advisorSafetyThresholdVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        advisorSafetyThresholdVotes[syndicateId][agentId] = {
          threshold,
          timestamp,
        };
        newState.advisorSafetyThresholdVotes = advisorSafetyThresholdVotes;
        newState = reconcileAdvisorSafetyThresholds(newState, pack);

        const currentMA = newState.marginAccounts?.[syndicateId];
        const isThreshold = currentMA?.advisorSafetyThreshold ?? 0;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Advisor Safety Threshold Vote] Agent ${agentId} voted on advisor safety threshold for Syndicate ${syndicateId}. Consensus threshold: ${isThreshold}%.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Advisor safety threshold vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "advisor_safety_threshold_voted" as any,
          syndicateId,
          agentId,
          threshold,
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

  // Handle decentralized LOCK_REHYPOTHECATED_COLLATERAL action (AF-114)
  if ((action as any).type === "LOCK_REHYPOTHECATED_COLLATERAL") {
    const { syndicateId, vaultId, amount, durationEpochs, factionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);
    const vault = vaults[vaultId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to lock rehypothecated collateral.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required to lock rehypothecated collateral.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Lock amount must be a positive integer.`;
    } else if (durationEpochs === undefined || durationEpochs <= 0 || !Number.isInteger(durationEpochs)) {
      rejectionReason = `Lock duration must be a positive integer of epochs.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required to lock rehypothecated collateral.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on locking collateral.`;
    } else if (!vault) {
      rejectionReason = `Vault ${vaultId} does not exist.`;
    } else {
      const sponsorPolicy = state.factionSponsorPolicies?.[syndicateId]?.[vaultId];
      if (sponsorPolicy) {
        if (factionId !== sponsorPolicy.factionId) {
          rejectionReason = `Cannot lock rehypothecated collateral with faction ${factionId}. Vault ${vaultId} is sponsored by faction ${sponsorPolicy.factionId} for Syndicate ${syndicateId}.`;
        } else if (durationEpochs < sponsorPolicy.minLockTerms) {
          rejectionReason = `Lock duration ${durationEpochs} epochs is less than the required minimum of ${sponsorPolicy.minLockTerms} epochs for vault ${vaultId} under Syndicate ${syndicateId}'s sponsoring policy.`;
        } else {
          ok = true;
        }
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const lockedCollateralVotes = { ...(state.lockedCollateralVotes || {}) };
      if (!lockedCollateralVotes[syndicateId]) {
        lockedCollateralVotes[syndicateId] = {};
      } else {
        lockedCollateralVotes[syndicateId] = { ...lockedCollateralVotes[syndicateId] };
      }

      const existingVote = lockedCollateralVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        lockedCollateralVotes[syndicateId][agentId] = {
          vaultId,
          amount,
          durationEpochs,
          factionId,
          timestamp,
        };
        newState.lockedCollateralVotes = lockedCollateralVotes;
        newState = reconcileLockedCollateral(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Locked Collateral Vote] Agent ${agentId} voted to lock ${amount} gold in vault ${vaultId} for ${durationEpochs} epochs with faction ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Locked collateral vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "locked_collateral_voted" as any,
          syndicateId,
          agentId,
          vaultId,
          amount,
          durationEpochs,
          factionId,
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

  // Handle decentralized CLAIM_LIQUIDITY_MINING_REWARDS action (AF-114)
  if ((action as any).type === "CLAIM_LIQUIDITY_MINING_REWARDS") {
    const { syndicateId, positionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const marginAccount = state.marginAccounts?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required to claim liquidity mining rewards.`;
    } else if (!positionId) {
      rejectionReason = `Position ID is required to claim rewards.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!marginAccount) {
      rejectionReason = `Syndicate ${syndicateId} does not have a margin account.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on claiming rewards.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && marginAccount) {
      const claimLiquidityRewardsVotes = { ...(state.claimLiquidityRewardsVotes || {}) };
      if (!claimLiquidityRewardsVotes[syndicateId]) {
        claimLiquidityRewardsVotes[syndicateId] = {};
      } else {
        claimLiquidityRewardsVotes[syndicateId] = { ...claimLiquidityRewardsVotes[syndicateId] };
      }

      const existingVote = claimLiquidityRewardsVotes[syndicateId][agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        claimLiquidityRewardsVotes[syndicateId][agentId] = {
          positionId,
          timestamp,
        };
        newState.claimLiquidityRewardsVotes = claimLiquidityRewardsVotes;
        newState = reconcileClaimLiquidityRewards(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Claim Rewards Vote] Agent ${agentId} voted to claim rewards for position ${positionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Claim rewards vote cast by ${agentId} for Syndicate ${syndicateId}.`,
        } as any);

        customEvents.push({
          type: "claim_rewards_voted" as any,
          syndicateId,
          agentId,
          positionId,
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

  // Handle decentralized PROPOSE_FACTION_SPONSOR action (AF-115)
  if ((action as any).type === "PROPOSE_FACTION_SPONSOR") {
    const { proposalId, syndicateId, vaultId, factionId, rewardRate, minLockTerms, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const vaults = getSecondaryReserveVaults(state);
    const vault = vaults[vaultId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (rewardRate === undefined || rewardRate <= 0) {
      rejectionReason = `Reward rate must be positive.`;
    } else if (minLockTerms === undefined || minLockTerms <= 0 || !Number.isInteger(minLockTerms)) {
      rejectionReason = `Minimum lock terms must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!vault) {
      rejectionReason = `Vault ${vaultId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose faction sponsor.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.factionSponsorProposals || {}) };
      
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          vaultId,
          factionId,
          rewardRate,
          minLockTerms,
          timestamp,
          votes,
        };

        newState.factionSponsorProposals = proposals;
        newState = reconcileFactionSponsors(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Sponsor Proposed] Agent ${agentId} proposed faction sponsor for vault ${vaultId}: sponsored by ${factionId} with reward rate ${rewardRate} and min lock of ${minLockTerms} epochs.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction sponsor proposal created by ${agentId} for vault ${vaultId}.`,
        } as any);

        customEvents.push({
          type: "faction_sponsor_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          vaultId,
          factionId,
          rewardRate,
          minLockTerms,
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

  // Handle decentralized VOTE_FACTION_SPONSOR action (AF-115)
  if ((action as any).type === "VOTE_FACTION_SPONSOR") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.factionSponsorProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on faction sponsor proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.factionSponsorProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.factionSponsorProposals = proposalsCopy;
        newState = reconcileFactionSponsors(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Sponsor Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction sponsor vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "faction_sponsor_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_SPONSOR_AUDIT action (AF-116)
  if ((action as any).type === "PROPOSE_SPONSOR_AUDIT") {
    const { auditId, syndicateId, vaultId, factionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const sponsorPolicy = state.factionSponsorPolicies?.[syndicateId]?.[vaultId];

    if (!auditId) {
      rejectionReason = `Audit ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!sponsorPolicy) {
      rejectionReason = `Sponsor policy for syndicate ${syndicateId} vault ${vaultId} does not exist.`;
    } else if (sponsorPolicy.factionId !== factionId) {
      rejectionReason = `Sponsor policy faction ${sponsorPolicy.factionId} does not match specified faction ${factionId}.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose sponsor audit.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.sponsorAuditProposals || {}) };
      const existingProposal = proposals[auditId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[auditId] = {
          id: auditId,
          syndicateId,
          vaultId,
          factionId,
          timestamp,
          votes,
        };

        newState.sponsorAuditProposals = proposals;
        newState = reconcileSponsorAuditsAndRevocations(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sponsor Audit Proposed] Agent ${agentId} proposed sponsor audit for vault ${vaultId} sponsored by ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Sponsor audit proposal created by ${agentId} for vault ${vaultId}.`,
        } as any);

        customEvents.push({
          type: "sponsor_audit_proposed" as any,
          auditId,
          syndicateId,
          agentId,
          vaultId,
          factionId,
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

  // Handle decentralized VOTE_SPONSOR_AUDIT action (AF-116)
  if ((action as any).type === "VOTE_SPONSOR_AUDIT") {
    const { syndicateId, auditId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.sponsorAuditProposals || {};
    const proposal = proposals[auditId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!auditId) {
      rejectionReason = `Audit ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Audit proposal ${auditId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on sponsor audit proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.sponsorAuditProposals || {}) };
      const currentProp = { ...proposalsCopy[auditId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[auditId] = currentProp;

        newState.sponsorAuditProposals = proposalsCopy;
        newState = reconcileSponsorAuditsAndRevocations(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sponsor Audit Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} audit proposal ${auditId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Sponsor audit vote cast by ${agentId} for proposal ${auditId}.`,
        } as any);

        customEvents.push({
          type: "sponsor_audit_voted" as any,
          syndicateId,
          auditId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_SPONSOR_REVOCATION action (AF-116)
  if ((action as any).type === "PROPOSE_SPONSOR_REVOCATION") {
    const { revocationId, syndicateId, vaultId, factionId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const sponsorPolicy = state.factionSponsorPolicies?.[syndicateId]?.[vaultId];

    if (!revocationId) {
      rejectionReason = `Revocation ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!vaultId) {
      rejectionReason = `Vault ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!sponsorPolicy) {
      rejectionReason = `Sponsor policy for syndicate ${syndicateId} vault ${vaultId} does not exist.`;
    } else if (sponsorPolicy.factionId !== factionId) {
      rejectionReason = `Sponsor policy faction ${sponsorPolicy.factionId} does not match specified faction ${factionId}.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose sponsor revocation.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.sponsorRevocationProposals || {}) };
      const existingProposal = proposals[revocationId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[revocationId] = {
          id: revocationId,
          syndicateId,
          vaultId,
          factionId,
          timestamp,
          votes,
        };

        newState.sponsorRevocationProposals = proposals;
        newState = reconcileSponsorAuditsAndRevocations(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sponsor Revocation Proposed] Agent ${agentId} proposed sponsor revocation for vault ${vaultId} sponsored by ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Sponsor revocation proposal created by ${agentId} for vault ${vaultId}.`,
        } as any);

        customEvents.push({
          type: "sponsor_revocation_proposed" as any,
          revocationId,
          syndicateId,
          agentId,
          vaultId,
          factionId,
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

  // Handle decentralized VOTE_SPONSOR_REVOCATION action (AF-116)
  if ((action as any).type === "VOTE_SPONSOR_REVOCATION") {
    const { syndicateId, revocationId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.sponsorRevocationProposals || {};
    const proposal = proposals[revocationId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!revocationId) {
      rejectionReason = `Revocation ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Revocation proposal ${revocationId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on sponsor revocation proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.sponsorRevocationProposals || {}) };
      const currentProp = { ...proposalsCopy[revocationId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[revocationId] = currentProp;

        newState.sponsorRevocationProposals = proposalsCopy;
        newState = reconcileSponsorAuditsAndRevocations(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sponsor Revocation Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} revocation proposal ${revocationId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Sponsor revocation vote cast by ${agentId} for proposal ${revocationId}.`,
        } as any);

        customEvents.push({
          type: "sponsor_revocation_voted" as any,
          syndicateId,
          revocationId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_REWARD_SLASH action (AF-117)
  if ((action as any).type === "PROPOSE_REWARD_SLASH") {
    const { proposalId, syndicateId, targetSyndicateId, slashingRate, maliciousActor, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!targetSyndicateId) {
      rejectionReason = `Target Syndicate ID is required.`;
    } else if (slashingRate === undefined || slashingRate <= 0 || slashingRate > 1) {
      rejectionReason = `Slashing rate must be between 0 and 1.`;
    } else if (!maliciousActor) {
      rejectionReason = `Malicious actor is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose reward slash.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.rewardSlashingProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          targetSyndicateId,
          slashingRate,
          maliciousActor,
          timestamp,
          votes,
        };

        newState.rewardSlashingProposals = proposals;
        newState = reconcileRewardSlashing(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reward Slash Proposed] Agent ${agentId} proposed reward slash for target syndicate ${targetSyndicateId} (Actor: ${maliciousActor}) at rate ${slashingRate}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reward slash proposal created by ${agentId} for target ${targetSyndicateId}.`,
        } as any);

        customEvents.push({
          type: "reward_slash_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          targetSyndicateId,
          slashingRate,
          maliciousActor,
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

  // Handle decentralized VOTE_REWARD_SLASH action (AF-117)
  if ((action as any).type === "VOTE_REWARD_SLASH") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.rewardSlashingProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Reward slash proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on reward slash proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.rewardSlashingProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.rewardSlashingProposals = proposalsCopy;
        newState = reconcileRewardSlashing(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reward Slash Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} slash proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reward slash vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "reward_slash_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_REHAB_CAMPAIGN action (AF-118)
  if ((action as any).type === "PROPOSE_REHAB_CAMPAIGN") {
    const { proposalId, syndicateId, targetActor, factionId, goldCost, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const isTargetMalicious = !!(
      state.maliciousActors?.[targetActor] ||
      (syndicateId === targetActor && state.maliciousActors?.[syndicateId])
    );

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!targetActor) {
      rejectionReason = `Target actor is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (goldCost === undefined || goldCost < 0) {
      rejectionReason = `Gold cost must be non-negative.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose reputation rehab.`;
    } else if ((syndicate.warChest ?? 0) < goldCost) {
      rejectionReason = `Syndicate ${syndicateId} does not have enough gold in war chest.`;
    } else if (!isTargetMalicious) {
      rejectionReason = `Target actor ${targetActor} is not flagged as malicious.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.rehabCampaignProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          targetActor,
          factionId,
          goldCost,
          timestamp,
          votes,
        };

        newState.rehabCampaignProposals = proposals;
        newState = reconcileRehabCampaign(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reputation Rehab Proposed] Agent ${agentId} proposed reputation rehab campaign ${proposalId} for target ${targetActor} costing ${goldCost} gold to faction ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reputation rehab proposal created by ${agentId} for target ${targetActor}.`,
        } as any);

        customEvents.push({
          type: "rehab_campaign_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          targetActor,
          factionId,
          goldCost,
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

  // Handle decentralized VOTE_REHAB_CAMPAIGN action (AF-118)
  if ((action as any).type === "VOTE_REHAB_CAMPAIGN") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.rehabCampaignProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Rehabilitation campaign proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on rehab campaign proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.rehabCampaignProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.rehabCampaignProposals = proposalsCopy;
        newState = reconcileRehabCampaign(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reputation Rehab Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} rehab proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reputation rehab vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "rehab_campaign_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_REHAB_SUBSIDY action (AF-119)
  if ((action as any).type === "PROPOSE_REHAB_SUBSIDY") {
    const { proposalId, syndicateId, factionId, subsidyPercentage, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (subsidyPercentage === undefined || subsidyPercentage < 0 || subsidyPercentage > 50) {
      rejectionReason = `Subsidy percentage must be between 0 and 50.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose reputation rehab subsidy.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.rehabSubsidyProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          factionId,
          subsidyPercentage,
          timestamp,
          votes,
        };

        newState.rehabSubsidyProposals = proposals;
        newState = reconcileRehabSubsidy(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reputation Rehab Subsidy Proposed] Agent ${agentId} proposed reputation rehab subsidy ${proposalId} of ${subsidyPercentage}% with faction ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reputation rehab subsidy proposal created by ${agentId} for faction ${factionId}.`,
        } as any);

        customEvents.push({
          type: "rehab_subsidy_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          factionId,
          subsidyPercentage,
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

  // Handle decentralized VOTE_REHAB_SUBSIDY action (AF-119)
  if ((action as any).type === "VOTE_REHAB_SUBSIDY") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.rehabSubsidyProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Rehabilitation campaign subsidy proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on rehab subsidy proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.rehabSubsidyProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.rehabSubsidyProposals = proposalsCopy;
        newState = reconcileRehabSubsidy(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Reputation Rehab Subsidy Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} rehab subsidy proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Reputation rehab subsidy vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "rehab_subsidy_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized LOCK_LOYALTY_BOND action (AF-119)
  if ((action as any).type === "LOCK_LOYALTY_BOND") {
    const { syndicateId, factionId, amount, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      rejectionReason = `Lock amount must be a positive integer.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot lock loyalty bond.`;
    } else if ((syndicate.warChest ?? 0) < amount) {
      rejectionReason = `Syndicate war chest has insufficient gold (has ${syndicate.warChest ?? 0}, needs ${amount}).`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const bonds = { ...(state.factionLoyaltyBonds || {}) };
      const bondId = `${syndicateId}-${factionId}`;
      const existingBond = bonds[bondId];

      const newLocked = (existingBond?.lockedGold ?? 0) + amount;
      bonds[bondId] = {
        id: bondId,
        syndicateId,
        factionId,
        lockedGold: newLocked,
        timestamp,
      };

      const syndicateCopy = { ...syndicate };
      syndicateCopy.warChest = Math.max(0, (syndicateCopy.warChest ?? 0) - amount);

      if (!newState.syndicates) newState.syndicates = {};
      newState.syndicates[syndicateId] = syndicateCopy;
      newState.factionLoyaltyBonds = bonds;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Faction Loyalty Bond Locked] Syndicate ${syndicateId} locked ${amount} gold in a loyalty bond for faction ${factionId} (total locked: ${newLocked} gold).`
      );

      customEvents.push({
        type: "narration",
        text: `🔒 Syndicate ${syndicateId} locked ${amount} gold in a loyalty bond for faction ${factionId}.`,
      } as any);

      customEvents.push({
        type: "loyalty_bond_locked" as any,
        syndicateId,
        factionId,
        amount,
        totalLocked: newLocked,
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

  // Handle decentralized CLAIM_LOYALTY_RANK action (AF-120)
  if ((action as any).type === "CLAIM_LOYALTY_RANK") {
    const { proposalId, syndicateId, factionId, rank, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const bondId = `${syndicateId}-${factionId}`;
    const bond = state.factionLoyaltyBonds?.[bondId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required to claim loyalty rank.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (!rank || !["None", "Bronze", "Silver", "Gold", "Platinum"].includes(rank)) {
      rejectionReason = `Invalid loyalty rank ${rank}.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot claim loyalty rank.`;
    } else if (!bond) {
      rejectionReason = `Syndicate ${syndicateId} does not have a loyalty bond for faction ${factionId}.`;
    } else {
      // Validate gold locked for rank
      const lockedGold = bond.lockedGold;
      let requiredGold = 0;
      if (rank === "Bronze") requiredGold = 1000;
      else if (rank === "Silver") requiredGold = 3000;
      else if (rank === "Gold") requiredGold = 5000;
      else if (rank === "Platinum") requiredGold = 10000;

      if (lockedGold < requiredGold) {
        rejectionReason = `Locked gold in loyalty bond is insufficient for rank ${rank} (requires ${requiredGold}, has ${lockedGold}).`;
      } else {
        ok = true;
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.claimLoyaltyRankProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          factionId,
          rank,
          timestamp,
          resolved: false,
          votes,
        };

        newState.claimLoyaltyRankProposals = proposals;
        newState = reconcileClaimLoyaltyRanks(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Loyalty Rank Proposed] Agent ${agentId} proposed claim loyalty rank ${proposalId} of ${rank} with faction ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction loyalty rank proposal created by ${agentId} for faction ${factionId} to rank ${rank}.`,
        } as any);

        customEvents.push({
          type: "loyalty_rank_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          factionId,
          rank,
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

  // Handle decentralized VOTE_LOYALTY_RANK action (AF-120)
  if ((action as any).type === "VOTE_LOYALTY_RANK") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.claimLoyaltyRankProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Claim loyalty rank proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on loyalty rank proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.claimLoyaltyRankProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.claimLoyaltyRankProposals = proposalsCopy;
        newState = reconcileClaimLoyaltyRanks(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Loyalty Rank Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} claim loyalty rank proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction loyalty rank vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "loyalty_rank_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized ESTABLISH_COOPERATIVE_YIELD_CAMPAIGN action (AF-121)
  if ((action as any).type === "ESTABLISH_COOPERATIVE_YIELD_CAMPAIGN") {
    const { proposalId, syndicateId, cdoId, campaignName, factionId, bronzeMultiplier, silverMultiplier, goldMultiplier, platinumMultiplier, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cdo = state.cdos?.[cdoId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!cdoId) {
      rejectionReason = `CDO ID is required.`;
    } else if (!campaignName) {
      rejectionReason = `Campaign name is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (bronzeMultiplier === undefined || bronzeMultiplier <= 0) {
      rejectionReason = `Bronze multiplier must be positive.`;
    } else if (silverMultiplier === undefined || silverMultiplier <= 0) {
      rejectionReason = `Silver multiplier must be positive.`;
    } else if (goldMultiplier === undefined || goldMultiplier <= 0) {
      rejectionReason = `Gold multiplier must be positive.`;
    } else if (platinumMultiplier === undefined || platinumMultiplier <= 0) {
      rejectionReason = `Platinum multiplier must be positive.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose yield campaign.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.cooperativeYieldCampaignProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          cdoId,
          campaignName,
          factionId,
          bronzeMultiplier,
          silverMultiplier,
          goldMultiplier,
          platinumMultiplier,
          timestamp,
          resolved: false,
          votes,
        };

        newState.cooperativeYieldCampaignProposals = proposals;
        newState = reconcileCooperativeYieldCampaigns(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Cooperative Yield Campaign Proposed] Agent ${agentId} proposed yield campaign ${campaignName} for CDO ${cdoId} sponsored by ${factionId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Cooperative yield campaign proposal created by ${agentId} for CDO ${cdoId}.`,
        } as any);

        customEvents.push({
          type: "cooperative_yield_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          cdoId,
          campaignName,
          factionId,
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

  // Handle decentralized VOTE_COOPERATIVE_YIELD_CAMPAIGN action (AF-121)
  if ((action as any).type === "VOTE_COOPERATIVE_YIELD_CAMPAIGN") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.cooperativeYieldCampaignProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Cooperative yield campaign proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on yield campaign proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.cooperativeYieldCampaignProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.cooperativeYieldCampaignProposals = proposalsCopy;
        newState = reconcileCooperativeYieldCampaigns(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Cooperative Yield Campaign Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} yield campaign proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Cooperative yield campaign vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "cooperative_yield_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized ESTABLISH_FACTION_CDO_INSURANCE_POOL action (AF-121)
  if ((action as any).type === "ESTABLISH_FACTION_CDO_INSURANCE_POOL") {
    const { proposalId, syndicateId, cdoId, factionId, initialReserve, minLoyaltyRank, payoutRatio, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cdo = state.cdos?.[cdoId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!cdoId) {
      rejectionReason = `CDO ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (initialReserve === undefined || initialReserve < 0 || !Number.isInteger(initialReserve)) {
      rejectionReason = `Initial reserve must be a non-negative integer.`;
    } else if (!minLoyaltyRank || !["None", "Bronze", "Silver", "Gold", "Platinum"].includes(minLoyaltyRank)) {
      rejectionReason = `Invalid loyalty rank ${minLoyaltyRank}.`;
    } else if (payoutRatio === undefined || payoutRatio < 0 || payoutRatio > 1) {
      rejectionReason = `Payout ratio must be between 0 and 1.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose insurance pool.`;
    } else if ((syndicate.warChest ?? 0) < initialReserve) {
      rejectionReason = `Syndicate has insufficient funds in war chest (${syndicate.warChest ?? 0} < ${initialReserve}) to establish insurance pool.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.factionCdoInsurancePoolProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          cdoId,
          factionId,
          initialReserve,
          minLoyaltyRank,
          payoutRatio,
          timestamp,
          resolved: false,
          votes,
        };

        newState.factionCdoInsurancePoolProposals = proposals;
        newState = reconcileFactionCdoInsurancePools(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction CDO Insurance Pool Proposed] Agent ${agentId} proposed insurance pool for CDO ${cdoId} with initial reserve of ${initialReserve} gold.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction CDO insurance pool proposal created by ${agentId} for CDO ${cdoId}.`,
        } as any);

        customEvents.push({
          type: "faction_cdo_insurance_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          cdoId,
          factionId,
          initialReserve,
          minLoyaltyRank,
          payoutRatio,
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

  // Handle decentralized VOTE_FACTION_CDO_INSURANCE_POOL action (AF-121)
  if ((action as any).type === "VOTE_FACTION_CDO_INSURANCE_POOL") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.factionCdoInsurancePoolProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Faction CDO insurance pool proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on insurance pool proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.factionCdoInsurancePoolProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.factionCdoInsurancePoolProposals = proposalsCopy;
        newState = reconcileFactionCdoInsurancePools(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction CDO Insurance Pool Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} insurance pool proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Faction CDO insurance pool vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "faction_cdo_insurance_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_MULTI_FACTION_CDO_RISK_RATING action (AF-122)
  if ((action as any).type === "PROPOSE_MULTI_FACTION_CDO_RISK_RATING") {
    const { proposalId, syndicateId, cdoId, factionId, riskRating, basePremiumRate, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const cdo = state.cdos?.[cdoId];

    if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!cdoId) {
      rejectionReason = `CDO ID is required.`;
    } else if (!factionId) {
      rejectionReason = `Faction ID is required.`;
    } else if (!riskRating || !["low", "medium", "high"].includes(riskRating)) {
      rejectionReason = `Invalid risk rating ${riskRating}.`;
    } else if (basePremiumRate === undefined || basePremiumRate < 0) {
      rejectionReason = `Base premium rate must be a non-negative number.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!cdo) {
      rejectionReason = `CDO ${cdoId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot propose risk rating.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate) {
      const proposals = { ...(state.multiFactionCdoRiskRatingProposals || {}) };
      const existingProposal = proposals[proposalId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        const votes = existingProposal?.votes ? { ...existingProposal.votes } : {};
        votes[agentId] = { vote: true, timestamp };

        proposals[proposalId] = {
          id: proposalId,
          syndicateId,
          cdoId,
          factionId,
          riskRating,
          basePremiumRate,
          timestamp,
          resolved: false,
          votes,
        };

        newState.multiFactionCdoRiskRatingProposals = proposals;
        newState = reconcileMultiFactionCdoRiskRatings(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Multi-Faction CDO Risk Rating Proposed] Agent ${agentId} proposed risk rating for CDO ${cdoId} with rating ${riskRating} and base premium ${basePremiumRate}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Multi-faction CDO risk rating proposal created by ${agentId} for CDO ${cdoId}.`,
        } as any);

        customEvents.push({
          type: "multi_faction_cdo_risk_rating_proposed" as any,
          proposalId,
          syndicateId,
          agentId,
          cdoId,
          factionId,
          riskRating,
          basePremiumRate,
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

  // Handle decentralized VOTE_MULTI_FACTION_CDO_RISK_RATING action (AF-122)
  if ((action as any).type === "VOTE_MULTI_FACTION_CDO_RISK_RATING") {
    const { syndicateId, proposalId, vote, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const syndicate = state.syndicates?.[syndicateId];
    const proposals = state.multiFactionCdoRiskRatingProposals || {};
    const proposal = proposals[proposalId];

    if (!syndicateId) {
      rejectionReason = `Syndicate ID is required.`;
    } else if (!proposalId) {
      rejectionReason = `Proposal ID is required.`;
    } else if (vote === undefined) {
      rejectionReason = `Vote value is required.`;
    } else if (!syndicate) {
      rejectionReason = `Syndicate ${syndicateId} does not exist.`;
    } else if (!proposal) {
      rejectionReason = `Multi-faction CDO risk rating proposal ${proposalId} does not exist.`;
    } else if (!syndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of syndicate ${syndicateId} and cannot vote on risk rating proposal.`;
    } else {
      ok = true;
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && syndicate && proposal) {
      const proposalsCopy = { ...(state.multiFactionCdoRiskRatingProposals || {}) };
      const currentProp = { ...proposalsCopy[proposalId] };
      const votes = currentProp.votes ? { ...currentProp.votes } : {};

      const existingVote = votes[agentId];
      if (!existingVote || timestamp > existingVote.timestamp) {
        votes[agentId] = { vote, timestamp };
        currentProp.votes = votes;
        proposalsCopy[proposalId] = currentProp;

        newState.multiFactionCdoRiskRatingProposals = proposalsCopy;
        newState = reconcileMultiFactionCdoRiskRatings(newState, pack);

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Multi-Faction CDO Risk Rating Voted] Agent ${agentId} voted ${vote ? "FOR" : "AGAINST"} risk rating proposal ${proposalId}.`
        );

        customEvents.push({
          type: "narration",
          text: `🗳️ Multi-faction CDO risk rating vote cast by ${agentId} for proposal ${proposalId}.`,
        } as any);

        customEvents.push({
          type: "multi_faction_cdo_risk_rating_voted" as any,
          syndicateId,
          proposalId,
          agentId,
          vote,
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

  // Handle decentralized PROPOSE_CDS_TRADE action (AF-109)
  if ((action as any).type === "PROPOSE_CDS_TRADE") {
    const { tradeId, cdsId, proposerSyndicateId, counterpartySyndicateId, role, goldPrice, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const proposerSyndicate = state.syndicates?.[proposerSyndicateId];
    const counterpartySyndicate = state.syndicates?.[counterpartySyndicateId];
    const cds = state.creditDefaultSwaps?.[cdsId];

    if (!tradeId) {
      rejectionReason = `Trade ID is required to propose CDS trade.`;
    } else if (!cdsId) {
      rejectionReason = `CDS ID is required.`;
    } else if (!proposerSyndicateId) {
      rejectionReason = `Proposer Syndicate ID is required.`;
    } else if (!counterpartySyndicateId) {
      rejectionReason = `Counterparty Syndicate ID is required.`;
    } else if (role !== "buyer" && role !== "writer") {
      rejectionReason = `Role must be either 'buyer' or 'writer'.`;
    } else if (goldPrice === undefined || goldPrice < 0 || !Number.isInteger(goldPrice)) {
      rejectionReason = `Gold price must be a non-negative integer.`;
    } else if (!proposerSyndicate) {
      rejectionReason = `Proposer syndicate ${proposerSyndicateId} does not exist.`;
    } else if (!counterpartySyndicate) {
      rejectionReason = `Counterparty syndicate ${counterpartySyndicateId} does not exist.`;
    } else if (proposerSyndicateId === counterpartySyndicateId) {
      rejectionReason = `Proposer and counterparty syndicates must be different.`;
    } else if (!proposerSyndicate.members.includes(agentId)) {
      rejectionReason = `Agent ${agentId} is not a member of proposer syndicate ${proposerSyndicateId}.`;
    } else if (!cds) {
      rejectionReason = `Credit Default Swap ${cdsId} does not exist.`;
    } else if (!cds.active) {
      rejectionReason = `Credit Default Swap ${cdsId} is not active.`;
    } else {
      // Validate that either proposer or counterparty holds the role in the CDS
      if (role === "buyer") {
        if (cds.buyerSyndicateId !== proposerSyndicateId && cds.buyerSyndicateId !== counterpartySyndicateId) {
          rejectionReason = `Neither proposer ${proposerSyndicateId} nor counterparty ${counterpartySyndicateId} is the current buyer of CDS ${cdsId}.`;
        } else {
          ok = true;
        }
      } else { // role === "writer"
        if (cds.writerSyndicateId !== proposerSyndicateId && cds.writerSyndicateId !== counterpartySyndicateId) {
          rejectionReason = `Neither proposer ${proposerSyndicateId} nor counterparty ${counterpartySyndicateId} is the current writer of CDS ${cdsId}.`;
        } else {
          ok = true;
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok) {
      const creditDefaultSwapTrades = { ...(state.creditDefaultSwapTrades || {}) };
      
      const existingProposal = creditDefaultSwapTrades[tradeId];
      if (!existingProposal || timestamp > existingProposal.timestamp) {
        creditDefaultSwapTrades[tradeId] = {
          id: tradeId,
          cdsId,
          proposerSyndicateId,
          counterpartySyndicateId,
          role,
          goldPrice,
          timestamp,
          active: true,
        };
        newState.creditDefaultSwapTrades = creditDefaultSwapTrades;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[CDS Trade Proposal] Agent ${agentId} proposed CDS trade ${tradeId} for CDS ${cdsId} (${role} role) from Syndicate ${proposerSyndicateId} to Syndicate ${counterpartySyndicateId} for ${goldPrice} gold.`
        );

        customEvents.push({
          type: "narration",
          text: `📈 CDS trade proposal ${tradeId} created by ${agentId} (CDS: ${cdsId}, Role: ${role}, Price: ${goldPrice} gold).`,
        } as any);

        customEvents.push({
          type: "cds_trade_proposed" as any,
          tradeId,
          cdsId,
          proposerSyndicateId,
          counterpartySyndicateId,
          role,
          goldPrice,
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

  // Handle decentralized ACCEPT_CDS_TRADE action (AF-109)
  if ((action as any).type === "ACCEPT_CDS_TRADE") {
    const { tradeId, timestamp } = action as any;

    let ok = false;
    let rejectionReason: string | undefined;

    const proposal = state.creditDefaultSwapTrades?.[tradeId];
    
    let cds: any;
    let proposerSyndicate: any;
    let counterpartySyndicate: any;
    let acquirerSyndicateId = "";
    let relinquisherSyndicateId = "";

    if (!tradeId) {
      rejectionReason = `Trade ID is required to accept CDS trade.`;
    } else if (!proposal) {
      rejectionReason = `CDS trade proposal ${tradeId} does not exist.`;
    } else if (!proposal.active) {
      rejectionReason = `CDS trade proposal ${tradeId} is no longer active.`;
    } else {
      cds = state.creditDefaultSwaps?.[proposal.cdsId];
      proposerSyndicate = state.syndicates?.[proposal.proposerSyndicateId];
      counterpartySyndicate = state.syndicates?.[proposal.counterpartySyndicateId];

      if (!cds) {
        rejectionReason = `Credit Default Swap ${proposal.cdsId} does not exist.`;
      } else if (!cds.active) {
        rejectionReason = `Credit Default Swap ${proposal.cdsId} is no longer active.`;
      } else if (!proposerSyndicate) {
        rejectionReason = `Proposer syndicate ${proposal.proposerSyndicateId} does not exist.`;
      } else if (!counterpartySyndicate) {
        rejectionReason = `Counterparty syndicate ${proposal.counterpartySyndicateId} does not exist.`;
      } else if (!counterpartySyndicate.members.includes(agentId)) {
        rejectionReason = `Agent ${agentId} is not a member of counterparty syndicate ${proposal.counterpartySyndicateId} and cannot accept this trade.`;
      } else {
        // Resolve acquirer and relinquisher depending on the role and current owner
        const { role, proposerSyndicateId, counterpartySyndicateId } = proposal;
        if (role === "buyer") {
          if (cds.buyerSyndicateId === proposerSyndicateId) {
            acquirerSyndicateId = counterpartySyndicateId;
            relinquisherSyndicateId = proposerSyndicateId;
          } else if (cds.buyerSyndicateId === counterpartySyndicateId) {
            acquirerSyndicateId = proposerSyndicateId;
            relinquisherSyndicateId = counterpartySyndicateId;
          }
        } else if (role === "writer") {
          if (cds.writerSyndicateId === proposerSyndicateId) {
            acquirerSyndicateId = counterpartySyndicateId;
            relinquisherSyndicateId = proposerSyndicateId;
          } else if (cds.writerSyndicateId === counterpartySyndicateId) {
            acquirerSyndicateId = proposerSyndicateId;
            relinquisherSyndicateId = counterpartySyndicateId;
          }
        }

        if (!acquirerSyndicateId || !relinquisherSyndicateId) {
          rejectionReason = `Ownership of role ${role} in CDS ${proposal.cdsId} has shifted since the proposal was made.`;
        } else {
          const acquirer = state.syndicates?.[acquirerSyndicateId];
          const relinquisher = state.syndicates?.[relinquisherSyndicateId];
          if (!acquirer || !relinquisher) {
            rejectionReason = `One or both of the participating syndicates do not exist.`;
          } else if ((acquirer.warChest ?? 0) < proposal.goldPrice) {
            rejectionReason = `Acquirer syndicate ${acquirerSyndicateId} has insufficient gold in its war chest (${acquirer.warChest ?? 0}) to pay the trade price of ${proposal.goldPrice}.`;
          } else {
            ok = true;
          }
        }
      }
    }

    let newState = { ...state };
    let customEvents: any[] = [];

    if (ok && proposal && cds) {
      const { cdsId, role, goldPrice, proposerSyndicateId, counterpartySyndicateId } = proposal;
      
      // Update proposal state to inactive
      const creditDefaultSwapTrades = { ...(newState.creditDefaultSwapTrades || {}) };
      creditDefaultSwapTrades[tradeId] = {
        ...proposal,
        active: false,
        timestamp,
      };
      newState.creditDefaultSwapTrades = creditDefaultSwapTrades;

      // Transfer gold
      const acquirer = { ...newState.syndicates![acquirerSyndicateId] };
      const relinquisher = { ...newState.syndicates![relinquisherSyndicateId] };

      acquirer.warChest = (acquirer.warChest ?? 0) - goldPrice;
      relinquisher.warChest = (relinquisher.warChest ?? 0) + goldPrice;

      newState.syndicates = {
        ...newState.syndicates,
        [acquirerSyndicateId]: acquirer as any,
        [relinquisherSyndicateId]: relinquisher as any,
      };

      // Update CDS contract ownership
      const updatedCds = {
        ...newState.creditDefaultSwaps![cdsId],
        timestamp,
      };

      if (role === "buyer") {
        updatedCds.buyerSyndicateId = acquirerSyndicateId;
      } else {
        updatedCds.writerSyndicateId = acquirerSyndicateId;
      }
      newState.creditDefaultSwaps = {
        ...newState.creditDefaultSwaps,
        [cdsId]: updatedCds,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[CDS Trade Accepted] Agent ${agentId} accepted CDS trade ${tradeId}. Ownership of ${role} role for CDS ${cdsId} transferred from Syndicate ${relinquisherSyndicateId} to Syndicate ${acquirerSyndicateId} for ${goldPrice} gold.`
      );

      customEvents.push({
        type: "narration",
        text: `🤝 CDS trade accepted! ${acquirerSyndicateId} acquired ${role} position of CDS ${cdsId} from ${relinquisherSyndicateId} for ${goldPrice} gold.`,
      } as any);

      customEvents.push({
        type: "cds_trade_accepted" as any,
        tradeId,
        cdsId,
        acquirerSyndicateId,
        relinquisherSyndicateId,
        role,
        goldPrice,
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

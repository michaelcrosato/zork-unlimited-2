import { GameState, Transaction, createInitialState, reconcileLootClaims, getFactionRepInit, reconcileTerritories, getTerritoryControlInit, reconcileTaxPolicies, reconcileAlliances, reconcileTradeRoutes, reconcileTariffPolicies, reconcileGuildPolicies, reconcileCartelPolicies, reconcileSyndicateTurf, reconcileSyndicateTaxes, reconcileSyndicateBribes, reconcileSyndicateWaivers, reconcileEspionageNetworks, reconcileWiretaps, reconcileCartelGlobalTaxes, reconcileSmugglerGuildCbas, reconcileSyndicateAlliances, reconcileFactionWars, reconcileCovertCells, reconcilePropagandaCampaigns, reconcileSafehouseRentRates, reconcileBankInterestRates, getSyndicateBankCapacity, reconcileJointLoanRefinancings, reconcileJointLoanCollateralSubstitutions, reconcileJointLoanDebtSettlements, reconcileJointLoanCollateralSwaps, reconcileJointLoanGracePeriods, reconcileJointLoanPenaltyWaivers, reconcileJointLoanUnderwrites, reconcileCooperativeRehabSubsidy, reconcileRehabCampaign, reconcileClaimLoyaltyRanks, getSyndicateFactionLoyaltyRank, reconcileAntiDeficitStabilizationPolicies, reconcileSWFStakingPolicies } from "./state.js";
import { reconcileSWFReinsuranceOptionCrossMeshArbitrage, reconcileSWFReinsuranceOptionArbitrageFeeSurcharge, reconcileSWFReinsuranceOptionPeerLending, reconcileSWFReinsuranceOptionVolatilityPoolRebalancing, reconcileSWFReinsuranceOptionVolatilityPoolUnderwriting, reconcileSWFReinsuranceOptionPenaltyWaivers, reconcileSWFReinsuranceOptionPenaltyRefunds, reconcileSWFReinsuranceOptionSpreadAdjustments, reconcileSWFReinsuranceOptionVolatilityFloors, reconcileSWFReinsuranceOptionVolatilityFloorAutoAdjusts, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrides, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraces, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidities, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjusts, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrations, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestments, reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCaps } from "./state.js";
import { reconcileSweepPoolRankAdjustFeeCalibrations, reconcileSWFDeflectionSurchargePolicyProposals, reconcileSWFDeflectionCapAndRefundProposals, reconcileSWFAllianceLiquiditySubsidyProposals, reconcileSWFAllianceYieldAutoRepayProposals, reconcileSovereignDebtDefaultAlerts, reconcileSovereignDebtResolveAlerts, reconcileSovereignDebtDefaultGracePeriods, reconcileSovereignDebtDefaultPenaltyWaivers, reconcileSovereignDebtCDSContracts, reconcileSovereignDebtCDSCDOTranches } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { multiAgentStep } from "./sync.js";
import { SecureCooperativeMesh, verifyTransactionSignature } from "./security.js";

export interface VectorClock {
  [nodeId: string]: number;
}

/**
 * A message sent between nodes in the P2P network.
 */
export interface GossipMessage {
  senderId: string;
  vectorClock: VectorClock;
  transactions: Transaction[];
  compressedDiff?: any;
}

/**
 * RLE compresses any array of values.
 * Compares objects using JSON stringification for safety.
 */
export function compressRLE(arr: any[]): any[] {
  if (arr.length === 0) return [];
  const result: any[] = [];
  let current = arr[0];
  let currentStr = typeof current === "object" && current !== null ? JSON.stringify(current) : String(current);
  let count = 1;

  for (let i = 1; i < arr.length; i++) {
    const item = arr[i];
    const itemStr = typeof item === "object" && item !== null ? JSON.stringify(item) : String(item);
    
    if (itemStr === currentStr) {
      count++;
    } else {
      if (count > 1) {
        result.push({ rle: true, val: current, count });
      } else {
        result.push(current);
      }
      current = item;
      currentStr = itemStr;
      count = 1;
    }
  }
  if (count > 1) {
    result.push({ rle: true, val: current, count });
  } else {
    result.push(current);
  }
  return result;
}

/**
 * Decompresses an RLE compressed array.
 */
export function decompressRLE(arr: any[]): any[] {
  const result: any[] = [];
  for (const item of arr) {
    if (item && typeof item === "object" && item.rle === true) {
      for (let i = 0; i < item.count; i++) {
        result.push(typeof item.val === "object" && item.val !== null ? JSON.parse(JSON.stringify(item.val)) : item.val);
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * Delta encodes an array of numbers.
 */
export function deltaEncode(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const result: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    result.push(arr[i] - arr[i - 1]);
  }
  return result;
}

/**
 * Delta decodes an array of numbers.
 */
export function deltaDecode(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const result: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    result.push(result[i - 1] + arr[i]);
  }
  return result;
}

/**
 * Compresses an array of transactions starting from sequenceNumber >= baseSequence.
 */
export function compressStateDiff(transactions: Transaction[], baseSequence: number): any {
  const filtered = transactions.filter(tx => tx.sequenceNumber >= baseSequence);
  if (filtered.length === 0) {
    return {
      baseSequence,
      count: 0,
      agentIds: [],
      sequenceNumbers: [],
      actions: [],
      stateHashesBefore: [],
      stateHashesAfter: [],
      timestamps: [],
      oks: [],
      rejectionReasons: [],
      signatures: []
    };
  }

  const agentIds = filtered.map(tx => tx.agentId);
  const seqs = filtered.map(tx => tx.sequenceNumber);
  const actions = filtered.map(tx => tx.action);
  const hashesBefore = filtered.map(tx => tx.stateHashBefore);
  const hashesAfter = filtered.map(tx => tx.stateHashAfter);
  const timestamps = filtered.map(tx => tx.timestamp);
  const oks = filtered.map(tx => tx.ok);
  const rejectionReasons = filtered.map(tx => tx.rejectionReason ?? "");
  const signatures = filtered.map(tx => tx.signature ?? "");

  const compressedAgentIds = compressRLE(agentIds);
  const compressedSeqs = compressRLE(deltaEncode(seqs));
  const compressedActions = compressRLE(actions);
  const compressedTimestamps = compressRLE(deltaEncode(timestamps));
  const compressedOks = compressRLE(oks);
  const compressedRejectionReasons = compressRLE(rejectionReasons);
  const compressedSignatures = compressRLE(signatures);

  return {
    baseSequence,
    count: filtered.length,
    agentIds: compressedAgentIds,
    sequenceNumbers: compressedSeqs,
    actions: compressedActions,
    stateHashesBefore: hashesBefore,
    stateHashesAfter: hashesAfter,
    timestamps: compressedTimestamps,
    oks: compressedOks,
    rejectionReasons: compressedRejectionReasons,
    signatures: compressedSignatures
  };
}

/**
 * Decompresses a compressed state diff object back into an array of transactions.
 */
export function decompressStateDiff(compressed: any): Transaction[] {
  if (!compressed || compressed.count === 0) {
    return [];
  }

  const count = compressed.count;
  const agentIds = decompressRLE(compressed.agentIds);
  const seqs = deltaDecode(decompressRLE(compressed.sequenceNumbers));
  const actions = decompressRLE(compressed.actions);
  const hashesBefore = compressed.stateHashesBefore;
  const hashesAfter = compressed.stateHashesAfter;
  const timestamps = deltaDecode(decompressRLE(compressed.timestamps));
  const oks = decompressRLE(compressed.oks);
  const rejectionReasons = decompressRLE(compressed.rejectionReasons);
  const signatures = compressed.signatures ? decompressRLE(compressed.signatures) : [];

  const transactions: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const tx: Transaction = {
      agentId: agentIds[i],
      sequenceNumber: seqs[i],
      action: actions[i],
      stateHashBefore: hashesBefore[i],
      stateHashAfter: hashesAfter[i],
      timestamp: timestamps[i],
      ok: oks[i]
    };
    if (rejectionReasons[i] !== undefined && rejectionReasons[i] !== "") {
      tx.rejectionReason = rejectionReasons[i];
    }
    if (signatures[i] !== undefined && signatures[i] !== "") {
      tx.signature = signatures[i];
    }
    transactions.push(tx);
  }

  return transactions;
}

/**
 * Compares two vector clocks to see if clockB has updates clockA is missing.
 * Returns true if clockB is strictly ahead of clockA in at least one entry,
 * or if clockB contains peer node IDs that clockA is completely unaware of.
 */
export function isClockBehind(clockA: VectorClock, clockB: VectorClock): boolean {
  for (const nodeId of Object.keys(clockB)) {
    if (clockA[nodeId] === undefined) {
      return true;
    }
    const valA = clockA[nodeId] ?? 0;
    const valB = clockB[nodeId];
    if (valB > valA) {
      return true;
    }
  }
  return false;
}

/**
 * Merges two vector clocks component-wise by taking the maximum value.
 */
export function mergeVectorClocks(clockA: VectorClock, clockB: VectorClock): VectorClock {
  const merged: VectorClock = { ...clockA };
  for (const [nodeId, valB] of Object.entries(clockB)) {
    const valA = merged[nodeId] ?? 0;
    merged[nodeId] = Math.max(valA, valB);
  }
  return merged;
}

/**
 * Computes a unique, deterministic ID for a transaction.
 */
export function getTransactionId(tx: Transaction): string {
  const actionStr = typeof tx.action === "string" ? tx.action : JSON.stringify(tx.action);
  return `${tx.agentId}-${tx.sequenceNumber}-${tx.timestamp}-${tx.stateHashBefore}-${actionStr}`;
}

/**
 * Merges two transaction lists, removing duplicates, and sorting them in a deterministic total order:
 * 1. sequenceNumber (logical step) ascending
 * 2. timestamp ascending
 * 3. agentId alphabetically
 */
export function mergeAndSortTransactions(txsA: Transaction[], txsB: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const merged: Transaction[] = [];

  const addUnique = (txs: Transaction[]) => {
    for (const tx of txs) {
      const id = getTransactionId(tx);
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(tx);
      }
    }
  };

  addUnique(txsA);
  addUnique(txsB);

  return merged.sort((a, b) => {
    if (a.sequenceNumber !== b.sequenceNumber) {
      return a.sequenceNumber - b.sequenceNumber;
    }
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.agentId.localeCompare(b.agentId);
  });
}

/**
 * Merges monotonic fields directly between two states as a pure CRDT-style merge.
 * - 'visited': Union/OR merge.
 * - 'journal': Ordered union merge (preserving unique events in stable order).
 */
export function mergeMonotonicStateFields(stateA: GameState, stateB: GameState): GameState {
  const visited = { ...stateA.visited, ...stateB.visited };

  const journalSet = new Set<string>();
  const journal: string[] = [];
  const addJournal = (items: string[]) => {
    for (const item of items) {
      if (!journalSet.has(item)) {
        journalSet.add(item);
        journal.push(item);
      }
    }
  };
  addJournal(stateA.journal || []);
  addJournal(stateB.journal || []);

  // Merge loot claims using LWW (Last-Write-Wins)
  const lootClaims = { ...stateA.lootClaims };
  if (stateB.lootClaims) {
    for (const [key, claimB] of Object.entries(stateB.lootClaims)) {
      const claimA = lootClaims[key];
      if (!claimA) {
        lootClaims[key] = claimB;
      } else {
        if (claimB.timestamp > claimA.timestamp) {
          lootClaims[key] = claimB;
        } else if (claimB.timestamp === claimA.timestamp) {
          if (claimB.claimedBy.localeCompare(claimA.claimedBy) < 0) {
            lootClaims[key] = claimB;
          }
        }
      }
    }
  }

  // Merge territory claims using LWW (Last-Write-Wins)
  const territoryClaims = { ...stateA.territoryClaims };
  if (stateB.territoryClaims) {
    for (const [roomId, claimB] of Object.entries(stateB.territoryClaims)) {
      const claimA = territoryClaims[roomId];
      if (!claimA) {
        territoryClaims[roomId] = claimB;
      } else {
        if (claimB.timestamp > claimA.timestamp) {
          territoryClaims[roomId] = claimB;
        } else if (claimB.timestamp === claimA.timestamp) {
          if (claimB.claimedBy.localeCompare(claimA.claimedBy) < 0) {
            territoryClaims[roomId] = claimB;
          } else if (claimB.claimedBy === claimA.claimedBy && claimB.factionId === claimA.factionId) {
            const assistants = Array.from(new Set([
              ...(claimA.assistants || []),
              ...(claimB.assistants || []),
            ]));
            territoryClaims[roomId] = {
              ...claimA,
              assistants,
              allianceDefense: 1 + assistants.length,
            };
          }
        }
      }
    }
  }

  // Merge tax votes using LWW (Last-Write-Wins)
  const taxVotes = { ...stateA.taxVotes };
  if (stateB.taxVotes) {
    for (const [factionId, bVotes] of Object.entries(stateB.taxVotes)) {
      if (!taxVotes[factionId]) {
        taxVotes[factionId] = { ...bVotes };
      } else {
        taxVotes[factionId] = { ...taxVotes[factionId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = taxVotes[factionId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            taxVotes[factionId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge alliance votes using LWW (Last-Write-Wins)
  const allianceVotes = { ...stateA.allianceVotes };
  if (stateB.allianceVotes) {
    for (const [pairKey, bVotes] of Object.entries(stateB.allianceVotes)) {
      if (!allianceVotes[pairKey]) {
        allianceVotes[pairKey] = { ...bVotes };
      } else {
        allianceVotes[pairKey] = { ...allianceVotes[pairKey] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = allianceVotes[pairKey][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            allianceVotes[pairKey][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge syndicate alliance votes using LWW (Last-Write-Wins)
  const syndicateAllianceVotes = { ...stateA.syndicateAllianceVotes };
  if (stateB.syndicateAllianceVotes) {
    for (const [pairKey, bVotes] of Object.entries(stateB.syndicateAllianceVotes)) {
      if (!syndicateAllianceVotes[pairKey]) {
        syndicateAllianceVotes[pairKey] = { ...bVotes };
      } else {
        syndicateAllianceVotes[pairKey] = { ...syndicateAllianceVotes[pairKey] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = syndicateAllianceVotes[pairKey][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            syndicateAllianceVotes[pairKey][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge territory assists (union of assistant lists for each room & faction)
  const territoryAssists = { ...stateA.territoryAssists };
  if (stateB.territoryAssists) {
    for (const [roomId, bFactions] of Object.entries(stateB.territoryAssists)) {
      if (!territoryAssists[roomId]) {
        territoryAssists[roomId] = { ...bFactions };
      } else {
        territoryAssists[roomId] = { ...territoryAssists[roomId] };
        for (const [factionId, assistantsB] of Object.entries(bFactions)) {
          const assistantsA = territoryAssists[roomId][factionId] || [];
          const mergedAssistants = Array.from(new Set([...assistantsA, ...assistantsB]));
          territoryAssists[roomId][factionId] = mergedAssistants;
        }
      }
    }
  }

  // Merge tradeRoutes using LWW (Last-Write-Wins)
  const tradeRoutes = { ...stateA.tradeRoutes };
  if (stateB.tradeRoutes) {
    for (const [routeId, routeB] of Object.entries(stateB.tradeRoutes)) {
      const routeA = tradeRoutes[routeId];
      if (!routeA) {
        tradeRoutes[routeId] = routeB;
      } else {
        if (routeB.timestamp > routeA.timestamp) {
          tradeRoutes[routeId] = routeB;
        } else if (routeB.timestamp === routeA.timestamp) {
          if (routeB.definedBy.localeCompare(routeA.definedBy) < 0) {
            tradeRoutes[routeId] = routeB;
          }
        }
      }
    }
  }

  // Merge tradeRouteVotes using LWW (Last-Write-Wins)
  const tradeRouteVotes = { ...stateA.tradeRouteVotes };
  if (stateB.tradeRouteVotes) {
    for (const [routeId, bVotes] of Object.entries(stateB.tradeRouteVotes)) {
      if (!tradeRouteVotes[routeId]) {
        tradeRouteVotes[routeId] = { ...bVotes };
      } else {
        tradeRouteVotes[routeId] = { ...tradeRouteVotes[routeId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = tradeRouteVotes[routeId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            tradeRouteVotes[routeId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge merchant licenses monotonically
  const merchantLicenses = { ...stateA.merchantLicenses };
  if (stateB.merchantLicenses) {
    for (const [agentId, bLicenses] of Object.entries(stateB.merchantLicenses)) {
      const aLicenses = merchantLicenses[agentId] || [];
      merchantLicenses[agentId] = Array.from(new Set([...aLicenses, ...bLicenses]));
    }
  }

  // Merge merchantLicensings using LWW (Last-Write-Wins)
  const merchantLicensings = { ...stateA.merchantLicensings };
  if (stateB.merchantLicensings) {
    for (const [factionId, licB] of Object.entries(stateB.merchantLicensings)) {
      const licA = merchantLicensings[factionId];
      if (!licA) {
        merchantLicensings[factionId] = licB;
      } else {
        if (licB.timestamp > licA.timestamp) {
          merchantLicensings[factionId] = licB;
        } else if (licB.timestamp === licA.timestamp) {
          if (licB.definedBy.localeCompare(licA.definedBy) < 0) {
            merchantLicensings[factionId] = licB;
          }
        }
      }
    }
  }

  // Merge tariff votes using LWW (Last-Write-Wins)
  const tariffVotes = { ...stateA.tariffVotes };
  if (stateB.tariffVotes) {
    for (const [factionId, bVotes] of Object.entries(stateB.tariffVotes)) {
      if (!tariffVotes[factionId]) {
        tariffVotes[factionId] = { ...bVotes };
      } else {
        tariffVotes[factionId] = { ...tariffVotes[factionId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = tariffVotes[factionId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            tariffVotes[factionId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge merchantGuilds using LWW (Last-Write-Wins)
  const merchantGuilds = { ...stateA.merchantGuilds };
  if (stateB.merchantGuilds) {
    for (const [guildId, guildB] of Object.entries(stateB.merchantGuilds)) {
      const guildA = merchantGuilds[guildId];
      if (!guildA) {
        merchantGuilds[guildId] = guildB;
      } else {
        if (guildB.timestamp > guildA.timestamp) {
          merchantGuilds[guildId] = guildB;
        } else if (guildB.timestamp === guildA.timestamp) {
          if (guildB.definedBy.localeCompare(guildA.definedBy) < 0) {
            merchantGuilds[guildId] = guildB;
          }
        }
      }
    }
  }

  // Merge guildMemberships monotonically
  const guildMemberships = { ...stateA.guildMemberships };
  if (stateB.guildMemberships) {
    for (const [agentId, bGuilds] of Object.entries(stateB.guildMemberships)) {
      const aGuilds = guildMemberships[agentId] || [];
      guildMemberships[agentId] = Array.from(new Set([...aGuilds, ...bGuilds]));
    }
  }

  // Merge guildVotes using LWW (Last-Write-Wins)
  const guildVotes = { ...stateA.guildVotes };
  if (stateB.guildVotes) {
    for (const [guildId, bVotes] of Object.entries(stateB.guildVotes)) {
      if (!guildVotes[guildId]) {
        guildVotes[guildId] = { ...bVotes };
      } else {
        guildVotes[guildId] = { ...guildVotes[guildId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = guildVotes[guildId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            guildVotes[guildId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge collectiveBargainingAgreements using LWW (Last-Write-Wins)
  const collectiveBargainingAgreements = { ...stateA.collectiveBargainingAgreements };
  if (stateB.collectiveBargainingAgreements) {
    for (const [key, agreementB] of Object.entries(stateB.collectiveBargainingAgreements)) {
      const agreementA = collectiveBargainingAgreements[key];
      if (!agreementA) {
        collectiveBargainingAgreements[key] = agreementB;
      } else {
        if (agreementB.timestamp > agreementA.timestamp) {
          collectiveBargainingAgreements[key] = agreementB;
        } else if (agreementB.timestamp === agreementA.timestamp) {
          if (agreementB.definedBy.localeCompare(agreementA.definedBy) < 0) {
            collectiveBargainingAgreements[key] = agreementB;
          }
        }
      }
    }
  }

  // Merge smugglerGuilds using LWW (Last-Write-Wins)
  const smugglerGuilds = { ...stateA.smugglerGuilds };
  if (stateB.smugglerGuilds) {
    for (const [guildId, guildB] of Object.entries(stateB.smugglerGuilds)) {
      const guildA = smugglerGuilds[guildId];
      if (!guildA) {
        smugglerGuilds[guildId] = guildB;
      } else {
        if (guildB.timestamp > guildA.timestamp) {
          smugglerGuilds[guildId] = guildB;
        } else if (guildB.timestamp === guildA.timestamp) {
          if (guildB.definedBy.localeCompare(guildA.definedBy) < 0) {
            smugglerGuilds[guildId] = guildB;
          }
        }
      }
    }
  }

  // Merge smugglerGuildMemberships monotonically
  const smugglerGuildMemberships = { ...stateA.smugglerGuildMemberships };
  if (stateB.smugglerGuildMemberships) {
    for (const [agentId, bGuilds] of Object.entries(stateB.smugglerGuildMemberships)) {
      const aGuilds = smugglerGuildMemberships[agentId] || [];
      smugglerGuildMemberships[agentId] = Array.from(new Set([...aGuilds, ...bGuilds]));
    }
  }

  // Merge smugglerGuildCbaVotes using LWW (Last-Write-Wins)
  const smugglerGuildCbaVotes = { ...stateA.smugglerGuildCbaVotes };
  if (stateB.smugglerGuildCbaVotes) {
    for (const [guildId, routeVotes] of Object.entries(stateB.smugglerGuildCbaVotes)) {
      if (!smugglerGuildCbaVotes[guildId]) {
        smugglerGuildCbaVotes[guildId] = { ...routeVotes };
      } else {
        smugglerGuildCbaVotes[guildId] = { ...smugglerGuildCbaVotes[guildId] };
        for (const [routeId, bVotes] of Object.entries(routeVotes)) {
          if (!smugglerGuildCbaVotes[guildId][routeId]) {
            smugglerGuildCbaVotes[guildId][routeId] = { ...bVotes };
          } else {
            smugglerGuildCbaVotes[guildId][routeId] = { ...smugglerGuildCbaVotes[guildId][routeId] };
            for (const [agentId, voteB] of Object.entries(bVotes)) {
              const voteA = smugglerGuildCbaVotes[guildId][routeId][agentId];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                smugglerGuildCbaVotes[guildId][routeId][agentId] = voteB;
              }
            }
          }
        }
      }
    }
  }

  const smugglerGuildCbas = stateA.smugglerGuildCbas ? { ...stateA.smugglerGuildCbas } : {};

  // Merge merchantInventories and merchantGold using LWW (Last-Write-Wins)
  const merchantInventories = stateA.merchantInventories ? { ...stateA.merchantInventories } : {};
  const merchantGold = stateA.merchantGold ? { ...stateA.merchantGold } : {};
  const merchantLastRestock = stateA.merchantLastRestock ? { ...stateA.merchantLastRestock } : {};
  const merchantLastUpdated = stateA.merchantLastUpdated ? { ...stateA.merchantLastUpdated } : {};

  if (stateB.merchantInventories) {
    for (const npcId of Object.keys(stateB.merchantInventories)) {
      const stepA = merchantLastUpdated[npcId] ?? 0;
      const stepB = stateB.merchantLastUpdated?.[npcId] ?? 0;

      if (!stateA.merchantInventories?.[npcId] || stepB > stepA) {
        merchantInventories[npcId] = [...stateB.merchantInventories[npcId]];
        if (stateB.merchantGold?.[npcId] !== undefined) {
          merchantGold[npcId] = stateB.merchantGold[npcId];
        }
        if (stateB.merchantLastRestock?.[npcId] !== undefined) {
          merchantLastRestock[npcId] = stateB.merchantLastRestock[npcId];
        }
        if (stateB.merchantLastUpdated?.[npcId] !== undefined) {
          merchantLastUpdated[npcId] = stateB.merchantLastUpdated[npcId];
        }
      } else if (stepB === stepA) {
        // Tie break deterministically by comparing alphabetical contents of inventories
        const invAStr = JSON.stringify(merchantInventories[npcId] ?? []);
        const invBStr = JSON.stringify(stateB.merchantInventories[npcId] ?? []);
        if (invBStr.localeCompare(invAStr) < 0) {
          merchantInventories[npcId] = [...stateB.merchantInventories[npcId]];
          if (stateB.merchantGold?.[npcId] !== undefined) {
            merchantGold[npcId] = stateB.merchantGold[npcId];
          }
          if (stateB.merchantLastRestock?.[npcId] !== undefined) {
            merchantLastRestock[npcId] = stateB.merchantLastRestock[npcId];
          }
          if (stateB.merchantLastUpdated?.[npcId] !== undefined) {
            merchantLastUpdated[npcId] = stateB.merchantLastUpdated[npcId];
          }
        }
      }
    }
  }

  // Merge cartels using LWW (Last-Write-Wins)
  const cartels = { ...stateA.cartels };
  if (stateB.cartels) {
    for (const [cartelId, cartelB] of Object.entries(stateB.cartels)) {
      const cartelA = cartels[cartelId];
      if (!cartelA) {
        cartels[cartelId] = cartelB;
      } else {
        if (cartelB.timestamp > cartelA.timestamp) {
          cartels[cartelId] = cartelB;
        } else if (cartelB.timestamp === cartelA.timestamp) {
          if (cartelB.definedBy.localeCompare(cartelA.definedBy) < 0) {
            cartels[cartelId] = cartelB;
          }
        }
      }
    }
  }

  // Merge cartelMemberships monotonically
  const cartelMemberships = { ...stateA.cartelMemberships };
  if (stateB.cartelMemberships) {
    for (const [agentId, bCartels] of Object.entries(stateB.cartelMemberships)) {
      const aCartels = cartelMemberships[agentId] || [];
      cartelMemberships[agentId] = Array.from(new Set([...aCartels, ...bCartels]));
    }
  }

  // Merge cartelVotes using LWW (Last-Write-Wins)
  const cartelVotes = { ...stateA.cartelVotes };
  if (stateB.cartelVotes) {
    for (const [cartelId, bVotes] of Object.entries(stateB.cartelVotes)) {
      if (!cartelVotes[cartelId]) {
        cartelVotes[cartelId] = { ...bVotes };
      } else {
        cartelVotes[cartelId] = { ...cartelVotes[cartelId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = cartelVotes[cartelId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            cartelVotes[cartelId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge cartelGlobalTaxVotes using LWW (Last-Write-Wins)
  const cartelGlobalTaxVotes = { ...stateA.cartelGlobalTaxVotes };
  if (stateB.cartelGlobalTaxVotes) {
    for (const [cartelId, bVotes] of Object.entries(stateB.cartelGlobalTaxVotes)) {
      if (!cartelGlobalTaxVotes[cartelId]) {
        cartelGlobalTaxVotes[cartelId] = { ...bVotes };
      } else {
        cartelGlobalTaxVotes[cartelId] = { ...cartelGlobalTaxVotes[cartelId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = cartelGlobalTaxVotes[cartelId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            cartelGlobalTaxVotes[cartelId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge cartelGlobalTaxPolicy
  const cartelGlobalTaxPolicy = {
    ...(stateA.cartelGlobalTaxPolicy || {}),
    ...(stateB.cartelGlobalTaxPolicy || {}),
  };

  // Merge safehouseRentVotes using LWW (Last-Write-Wins)
  const safehouseRentVotes = { ...stateA.safehouseRentVotes };
  if (stateB.safehouseRentVotes) {
    for (const [roomId, bVotes] of Object.entries(stateB.safehouseRentVotes)) {
      if (!safehouseRentVotes[roomId]) {
        safehouseRentVotes[roomId] = { ...bVotes };
      } else {
        safehouseRentVotes[roomId] = { ...safehouseRentVotes[roomId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = safehouseRentVotes[roomId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            safehouseRentVotes[roomId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge safehouseRentPolicies
  const safehouseRentPolicies = {
    ...(stateA.safehouseRentPolicies || {}),
    ...(stateB.safehouseRentPolicies || {}),
  };

  // Merge syndicateBanks using LWW (Last-Write-Wins)
  const syndicateBanks = { ...stateA.syndicateBanks };
  if (stateB.syndicateBanks) {
    for (const [syndicateId, entryB] of Object.entries(stateB.syndicateBanks)) {
      const entryA = syndicateBanks[syndicateId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        syndicateBanks[syndicateId] = entryB;
      }
    }
  }

  // Merge bankInterestVotes using LWW (Last-Write-Wins)
  const bankInterestVotes = { ...stateA.bankInterestVotes };
  if (stateB.bankInterestVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.bankInterestVotes)) {
      if (!bankInterestVotes[syndicateId]) {
        bankInterestVotes[syndicateId] = { ...bVotes };
      } else {
        bankInterestVotes[syndicateId] = { ...bankInterestVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = bankInterestVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            bankInterestVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge bankInterestPolicies
  const bankInterestPolicies = {
    ...(stateA.bankInterestPolicies || {}),
    ...(stateB.bankInterestPolicies || {}),
  };

  // Merge stashItemOwners
  const stashItemOwners = {
    ...(stateA.stashItemOwners || {}),
    ...(stateB.stashItemOwners || {}),
  };

  // Merge contrabandBlacklist using LWW (Last-Write-Wins)
  const contrabandBlacklist = { ...stateA.contrabandBlacklist };
  if (stateB.contrabandBlacklist) {
    for (const [itemId, entryB] of Object.entries(stateB.contrabandBlacklist)) {
      const entryA = contrabandBlacklist[itemId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        contrabandBlacklist[itemId] = entryB;
      }
    }
  }

  // Merge blackMarketPayouts using LWW (Last-Write-Wins)
  const blackMarketPayouts = { ...stateA.blackMarketPayouts };
  if (stateB.blackMarketPayouts) {
    for (const [roomId, entryB] of Object.entries(stateB.blackMarketPayouts)) {
      const entryA = blackMarketPayouts[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        blackMarketPayouts[roomId] = entryB;
      }
    }
  }

  // Merge bounties using LWW (Last-Write-Wins)
  const bounties = { ...stateA.bounties };
  if (stateB.bounties) {
    for (const [targetId, entryB] of Object.entries(stateB.bounties)) {
      const entryA = bounties[targetId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        bounties[targetId] = entryB;
      }
    }
  }

  // Merge enforcers using LWW (Last-Write-Wins)
  const enforcers = { ...stateA.enforcers };
  if (stateB.enforcers) {
    for (const [enforcerId, entryB] of Object.entries(stateB.enforcers)) {
      const entryA = enforcers[enforcerId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        enforcers[enforcerId] = entryB;
      }
    }
  }

  // Merge smugglingInsurance using LWW (Last-Write-Wins)
  const smugglingInsurance = { ...stateA.smugglingInsurance };
  if (stateB.smugglingInsurance) {
    for (const [buyerId, entryB] of Object.entries(stateB.smugglingInsurance)) {
      const entryA = smugglingInsurance[buyerId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        smugglingInsurance[buyerId] = entryB;
      }
    }
  }

  // Merge bribes using LWW (Last-Write-Wins)
  const bribes = { ...stateA.bribes };
  if (stateB.bribes) {
    for (const [enforcerId, entryB] of Object.entries(stateB.bribes)) {
      const entryA = bribes[enforcerId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        bribes[enforcerId] = entryB;
      }
    }
  }

  // Merge syndicates using LWW (Last-Write-Wins)
  const syndicates = { ...stateA.syndicates };
  if (stateB.syndicates) {
    for (const [id, entryB] of Object.entries(stateB.syndicates)) {
      const entryA = syndicates[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        syndicates[id] = entryB;
      }
    }
  }

  // Merge undercoverAgents using LWW (Last-Write-Wins)
  const undercoverAgents = { ...stateA.undercoverAgents };
  if (stateB.undercoverAgents) {
    for (const [id, entryB] of Object.entries(stateB.undercoverAgents)) {
      const entryA = undercoverAgents[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        undercoverAgents[id] = entryB;
      }
    }
  }

  // Merge informants using LWW (Last-Write-Wins)
  const informants = { ...stateA.informants };
  if (stateB.informants) {
    for (const [id, entryB] of Object.entries(stateB.informants)) {
      const entryA = informants[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        informants[id] = entryB;
      }
    }
  }

  // Merge raidWarnings using LWW (Last-Write-Wins)
  const raidWarnings = { ...stateA.raidWarnings };
  if (stateB.raidWarnings) {
    for (const [id, entryB] of Object.entries(stateB.raidWarnings)) {
      const entryA = raidWarnings[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        raidWarnings[id] = entryB;
      }
    }
  }

  // Merge productionLabs using LWW (Last-Write-Wins)
  const productionLabs = { ...stateA.productionLabs };
  if (stateB.productionLabs) {
    for (const [roomId, entryB] of Object.entries(stateB.productionLabs)) {
      const entryA = productionLabs[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        productionLabs[roomId] = entryB;
      }
    }
  }

  // Merge espionageNetworks using LWW (Last-Write-Wins)
  const espionageNetworks = { ...stateA.espionageNetworks };
  if (stateB.espionageNetworks) {
    for (const [roomId, entryB] of Object.entries(stateB.espionageNetworks)) {
      const entryA = espionageNetworks[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        espionageNetworks[roomId] = entryB;
      }
    }
  }

  // Merge wiretaps using LWW (Last-Write-Wins)
  const wiretaps = { ...stateA.wiretaps };
  if (stateB.wiretaps) {
    for (const [roomId, entryB] of Object.entries(stateB.wiretaps)) {
      const entryA = wiretaps[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        wiretaps[roomId] = entryB;
      }
    }
  }

  // Merge safehouses using LWW (Last-Write-Wins)
  const safehouses = { ...stateA.safehouses };
  if (stateB.safehouses) {
    for (const [roomId, entryB] of Object.entries(stateB.safehouses)) {
      const entryA = safehouses[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        safehouses[roomId] = entryB;
      }
    }
  }

  // Merge blackMarkets using LWW (Last-Write-Wins)
  const blackMarkets = { ...stateA.blackMarkets };
  if (stateB.blackMarkets) {
    for (const [roomId, entryB] of Object.entries(stateB.blackMarkets)) {
      const entryA = blackMarkets[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        blackMarkets[roomId] = entryB;
      }
    }
  }


  // Merge frontBusinesses using LWW (Last-Write-Wins)
  const frontBusinesses = { ...stateA.frontBusinesses };
  if (stateB.frontBusinesses) {
    for (const [merchantId, entryB] of Object.entries(stateB.frontBusinesses)) {
      const entryA = frontBusinesses[merchantId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        frontBusinesses[merchantId] = entryB;
      }
    }
  }

  // Merge turfGuards using LWW (Last-Write-Wins)
  const turfGuards = { ...stateA.turfGuards };
  if (stateB.turfGuards) {
    for (const [roomId, entryB] of Object.entries(stateB.turfGuards)) {
      const entryA = turfGuards[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        turfGuards[roomId] = entryB;
      }
    }
  }

  // Merge syndicateTurfClaims using LWW (Last-Write-Wins)
  const syndicateTurfClaims = { ...stateA.syndicateTurfClaims };
  if (stateB.syndicateTurfClaims) {
    for (const [roomId, entryB] of Object.entries(stateB.syndicateTurfClaims)) {
      const entryA = syndicateTurfClaims[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        syndicateTurfClaims[roomId] = entryB;
      }
    }
  }

  // Merge enforcementHeat using LWW (Last-Write-Wins)
  const enforcementHeat = { ...stateA.enforcementHeat };
  if (stateB.enforcementHeat) {
    for (const [roomId, entryB] of Object.entries(stateB.enforcementHeat)) {
      const entryA = enforcementHeat[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        enforcementHeat[roomId] = entryB;
      }
    }
  }

  // Merge protectionRackets using LWW (Last-Write-Wins) (AF-45)
  const protectionRackets = { ...stateA.protectionRackets };
  if (stateB.protectionRackets) {
    for (const [merchantId, entryB] of Object.entries(stateB.protectionRackets)) {
      const entryA = protectionRackets[merchantId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        protectionRackets[merchantId] = entryB;
      }
    }
  }

  // Merge syndicateBribes using LWW
  const syndicateBribes = { ...stateA.syndicateBribes };
  if (stateB.syndicateBribes) {
    for (const [roomId, entryB] of Object.entries(stateB.syndicateBribes)) {
      const entryA = syndicateBribes[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        syndicateBribes[roomId] = entryB;
      }
    }
  }

  // Merge deflectionPolicies using LWW
  const deflectionPolicies = { ...stateA.deflectionPolicies };
  if (stateB.deflectionPolicies) {
    for (const [roomId, entryB] of Object.entries(stateB.deflectionPolicies)) {
      const entryA = deflectionPolicies[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        deflectionPolicies[roomId] = entryB;
      }
    }
  }

  // Merge tradeExchangeRates using LWW
  const tradeExchangeRates = { ...stateA.tradeExchangeRates };
  if (stateB.tradeExchangeRates) {
    for (const [syndicateId, entryB] of Object.entries(stateB.tradeExchangeRates)) {
      const entryA = tradeExchangeRates[syndicateId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        tradeExchangeRates[syndicateId] = entryB;
      }
    }
  }

  // Merge auditMitigations using LWW
  const auditMitigations = { ...stateA.auditMitigations };
  if (stateB.auditMitigations) {
    for (const [roomId, entryB] of Object.entries(stateB.auditMitigations)) {
      const entryA = auditMitigations[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        auditMitigations[roomId] = entryB;
      }
    }
  }

  // Merge depositInsurance using LWW
  const depositInsurance = { ...stateA.depositInsurance };
  if (stateB.depositInsurance) {
    for (const [agentId, innerB] of Object.entries(stateB.depositInsurance)) {
      if (!depositInsurance[agentId]) {
        depositInsurance[agentId] = { ...innerB };
      } else {
        const innerA = { ...depositInsurance[agentId] };
        for (const [syndicateId, entryB] of Object.entries(innerB)) {
          const entryA = innerA[syndicateId];
          if (!entryA || entryB.timestamp > entryA.timestamp) {
            innerA[syndicateId] = entryB;
          }
        }
        depositInsurance[agentId] = innerA;
      }
    }
  }

  // Merge creditRatings using conservative Math.min
  const creditRatings = { ...stateA.creditRatings };
  if (stateB.creditRatings) {
    for (const [agentId, ratingB] of Object.entries(stateB.creditRatings)) {
      const ratingA = creditRatings[agentId];
      creditRatings[agentId] = ratingA === undefined ? ratingB : Math.min(ratingA, ratingB);
    }
  }

  // Merge defaultAlerts using LWW
  const defaultAlerts = { ...stateA.defaultAlerts };
  if (stateB.defaultAlerts) {
    for (const [key, entryB] of Object.entries(stateB.defaultAlerts)) {
      const entryA = defaultAlerts[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        defaultAlerts[key] = entryB;
      }
    }
  }

  // Merge loanRefinancingVotes using LWW
  const loanRefinancingVotes = { ...stateA.loanRefinancingVotes };
  if (stateB.loanRefinancingVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.loanRefinancingVotes)) {
      if (!loanRefinancingVotes[syndicateId]) {
        loanRefinancingVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...loanRefinancingVotes[syndicateId] };
        for (const [borrowerId, bVotes] of Object.entries(bInner)) {
          if (!aInner[borrowerId]) {
            aInner[borrowerId] = { ...bVotes };
          } else {
            const aVotes = { ...aInner[borrowerId] };
            for (const [voterId, voteB] of Object.entries(bVotes)) {
              const voteA = aVotes[voterId];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                aVotes[voterId] = voteB;
              }
            }
            aInner[borrowerId] = aVotes;
          }
        }
        loanRefinancingVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge individualLoanCollateralSwapVotes using LWW
  const individualLoanCollateralSwapVotes = { ...stateA.individualLoanCollateralSwapVotes };
  if (stateB.individualLoanCollateralSwapVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.individualLoanCollateralSwapVotes)) {
      if (!individualLoanCollateralSwapVotes[syndicateId]) {
        individualLoanCollateralSwapVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...individualLoanCollateralSwapVotes[syndicateId] };
        for (const [borrowerId, bVotes] of Object.entries(bInner)) {
          if (!aInner[borrowerId]) {
            aInner[borrowerId] = { ...bVotes };
          } else {
            const aVotes = { ...aInner[borrowerId] };
            for (const [voterId, voteB] of Object.entries(bVotes)) {
              const voteA = aVotes[voterId];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                aVotes[voterId] = voteB;
              }
            }
            aInner[borrowerId] = aVotes;
          }
        }
        individualLoanCollateralSwapVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge debtSettlementVotes using LWW
  const debtSettlementVotes = { ...stateA.debtSettlementVotes };
  if (stateB.debtSettlementVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.debtSettlementVotes)) {
      if (!debtSettlementVotes[syndicateId]) {
        debtSettlementVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...debtSettlementVotes[syndicateId] };
        for (const [borrowerId, bVotes] of Object.entries(bInner)) {
          if (!aInner[borrowerId]) {
            aInner[borrowerId] = { ...bVotes };
          } else {
            const aVotes = { ...aInner[borrowerId] };
            for (const [voterId, voteB] of Object.entries(bVotes)) {
              const voteA = aVotes[voterId];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                aVotes[voterId] = voteB;
              }
            }
            aInner[borrowerId] = aVotes;
          }
        }
        debtSettlementVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge creditRecoveries using LWW
  const creditRecoveries = { ...stateA.creditRecoveries };
  if (stateB.creditRecoveries) {
    for (const [agentId, entryB] of Object.entries(stateB.creditRecoveries)) {
      const entryA = creditRecoveries[agentId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        creditRecoveries[agentId] = entryB;
      }
    }
  }

  // Merge jointLoanProposals using LWW
  const jointLoanProposals = { ...stateA.jointLoanProposals };
  if (stateB.jointLoanProposals) {
    for (const [key, entryB] of Object.entries(stateB.jointLoanProposals)) {
      const entryA = jointLoanProposals[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        jointLoanProposals[key] = entryB;
      }
    }
  }

  // Merge jointLoans using LWW
  const jointLoans = { ...stateA.jointLoans };
  if (stateB.jointLoans) {
    for (const [key, entryB] of Object.entries(stateB.jointLoans)) {
      const entryA = jointLoans[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        jointLoans[key] = entryB;
      }
    }
  }

  // Merge jointLoanRefinancingVotes using LWW
  const jointLoanRefinancingVotes = { ...stateA.jointLoanRefinancingVotes };
  if (stateB.jointLoanRefinancingVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanRefinancingVotes)) {
      if (!jointLoanRefinancingVotes[groupId]) {
        jointLoanRefinancingVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanRefinancingVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanRefinancingVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanCollateralSubstitutionVotes using LWW
  const jointLoanCollateralSubstitutionVotes = { ...stateA.jointLoanCollateralSubstitutionVotes };
  if (stateB.jointLoanCollateralSubstitutionVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanCollateralSubstitutionVotes)) {
      if (!jointLoanCollateralSubstitutionVotes[groupId]) {
        jointLoanCollateralSubstitutionVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanCollateralSubstitutionVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanCollateralSubstitutionVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanDebtSettlementVotes using LWW
  const jointLoanDebtSettlementVotes = { ...stateA.jointLoanDebtSettlementVotes };
  if (stateB.jointLoanDebtSettlementVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanDebtSettlementVotes)) {
      if (!jointLoanDebtSettlementVotes[groupId]) {
        jointLoanDebtSettlementVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanDebtSettlementVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanDebtSettlementVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanCollateralSwapVotes using LWW
  const jointLoanCollateralSwapVotes = { ...stateA.jointLoanCollateralSwapVotes };
  if (stateB.jointLoanCollateralSwapVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanCollateralSwapVotes)) {
      if (!jointLoanCollateralSwapVotes[groupId]) {
        jointLoanCollateralSwapVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanCollateralSwapVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanCollateralSwapVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanGracePeriodVotes using LWW
  const jointLoanGracePeriodVotes = { ...stateA.jointLoanGracePeriodVotes };
  if (stateB.jointLoanGracePeriodVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanGracePeriodVotes)) {
      if (!jointLoanGracePeriodVotes[groupId]) {
        jointLoanGracePeriodVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanGracePeriodVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanGracePeriodVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanPenaltyWaiverVotes using LWW
  const jointLoanPenaltyWaiverVotes = { ...stateA.jointLoanPenaltyWaiverVotes };
  if (stateB.jointLoanPenaltyWaiverVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanPenaltyWaiverVotes)) {
      if (!jointLoanPenaltyWaiverVotes[groupId]) {
        jointLoanPenaltyWaiverVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanPenaltyWaiverVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanPenaltyWaiverVotes[groupId] = aInner;
      }
    }
  }

  // Merge jointLoanUnderwrites using LWW
  const jointLoanUnderwrites = { ...stateA.jointLoanUnderwrites };
  if (stateB.jointLoanUnderwrites) {
    for (const [key, entryB] of Object.entries(stateB.jointLoanUnderwrites)) {
      const entryA = jointLoanUnderwrites[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        jointLoanUnderwrites[key] = entryB;
      }
    }
  }

  // Merge jointLoanUnderwriteVotes using LWW
  const jointLoanUnderwriteVotes = { ...stateA.jointLoanUnderwriteVotes };
  if (stateB.jointLoanUnderwriteVotes) {
    for (const [groupId, bInner] of Object.entries(stateB.jointLoanUnderwriteVotes)) {
      if (!jointLoanUnderwriteVotes[groupId]) {
        jointLoanUnderwriteVotes[groupId] = { ...bInner };
      } else {
        const aInner = { ...jointLoanUnderwriteVotes[groupId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        jointLoanUnderwriteVotes[groupId] = aInner;
      }
    }
  }

  // Merge groupDefaults taking the max value (or LWW)
  const groupDefaults = { ...stateA.groupDefaults };
  if (stateB.groupDefaults) {
    for (const [key, valB] of Object.entries(stateB.groupDefaults)) {
      const valA = groupDefaults[key];
      if (valA === undefined || valB > valA) {
        groupDefaults[key] = valB;
      }
    }
  }

  // Merge jointLoanInsurancePools using LWW
  const jointLoanInsurancePools = { ...stateA.jointLoanInsurancePools };
  if (stateB.jointLoanInsurancePools) {
    for (const [key, entryB] of Object.entries(stateB.jointLoanInsurancePools)) {
      const entryA = jointLoanInsurancePools[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        jointLoanInsurancePools[key] = entryB;
      }
    }
  }

  // Merge agentPremiumPolicies using LWW
  const agentPremiumPolicies = { ...stateA.agentPremiumPolicies };
  if (stateB.agentPremiumPolicies) {
    for (const [key, entryB] of Object.entries(stateB.agentPremiumPolicies)) {
      const entryA = agentPremiumPolicies[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        agentPremiumPolicies[key] = entryB;
      }
    }
  }

  // Merge contagionShields using LWW
  const contagionShields = { ...stateA.contagionShields };
  if (stateB.contagionShields) {
    for (const [key, entryB] of Object.entries(stateB.contagionShields)) {
      const entryA = contagionShields[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        contagionShields[key] = entryB;
      }
    }
  }

  // Merge contagionShieldVotes using LWW
  const contagionShieldVotes = { ...stateA.contagionShieldVotes };
  if (stateB.contagionShieldVotes) {
    for (const [pairKey, bInner] of Object.entries(stateB.contagionShieldVotes)) {
      if (!contagionShieldVotes[pairKey]) {
        contagionShieldVotes[pairKey] = { ...bInner };
      } else {
        const aInner = { ...contagionShieldVotes[pairKey] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        contagionShieldVotes[pairKey] = aInner;
      }
    }
  }

  // Merge reinsurancePricingMultipliers using LWW
  const reinsurancePricingMultipliers = { ...stateA.reinsurancePricingMultipliers };
  if (stateB.reinsurancePricingMultipliers) {
    for (const [key, entryB] of Object.entries(stateB.reinsurancePricingMultipliers)) {
      const entryA = reinsurancePricingMultipliers[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        reinsurancePricingMultipliers[key] = entryB;
      }
    }
  }

  // Merge reinsuranceContracts using LWW
  const reinsuranceContracts = { ...stateA.reinsuranceContracts };
  if (stateB.reinsuranceContracts) {
    for (const [key, entryB] of Object.entries(stateB.reinsuranceContracts)) {
      const entryA = reinsuranceContracts[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        reinsuranceContracts[key] = entryB;
      }
    }
  }

  // Merge reinsuranceVotes using LWW
  const reinsuranceVotes = { ...stateA.reinsuranceVotes };
  if (stateB.reinsuranceVotes) {
    for (const [pairKey, bInner] of Object.entries(stateB.reinsuranceVotes)) {
      if (!reinsuranceVotes[pairKey]) {
        reinsuranceVotes[pairKey] = { ...bInner };
      } else {
        const aInner = { ...reinsuranceVotes[pairKey] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reinsuranceVotes[pairKey] = aInner;
      }
    }
  }

  // Merge reinsuranceTransferVotes using LWW
  const reinsuranceTransferVotes = { ...stateA.reinsuranceTransferVotes };
  if (stateB.reinsuranceTransferVotes) {
    for (const [propId, bInner] of Object.entries(stateB.reinsuranceTransferVotes)) {
      if (!reinsuranceTransferVotes[propId]) {
        reinsuranceTransferVotes[propId] = { ...bInner };
      } else {
        const aInner = { ...reinsuranceTransferVotes[propId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reinsuranceTransferVotes[propId] = aInner;
      }
    }
  }

  // Merge executedReinsuranceTransfers taking union (true takes priority)
  const executedReinsuranceTransfers = { ...stateA.executedReinsuranceTransfers };
  if (stateB.executedReinsuranceTransfers) {
    for (const [key, valB] of Object.entries(stateB.executedReinsuranceTransfers)) {
      if (valB) {
        executedReinsuranceTransfers[key] = true;
      }
    }
  }

  // Merge interestSubsidies using LWW
  const interestSubsidies = { ...stateA.interestSubsidies };
  if (stateB.interestSubsidies) {
    for (const [key, entryB] of Object.entries(stateB.interestSubsidies)) {
      const entryA = interestSubsidies[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        interestSubsidies[key] = entryB;
      }
    }
  }

  // Merge interestSubsidyVotes using LWW
  const interestSubsidyVotes = { ...stateA.interestSubsidyVotes };
  if (stateB.interestSubsidyVotes) {
    for (const [pairKey, bInner] of Object.entries(stateB.interestSubsidyVotes)) {
      if (!interestSubsidyVotes[pairKey]) {
        interestSubsidyVotes[pairKey] = { ...bInner };
      } else {
        const aInner = { ...interestSubsidyVotes[pairKey] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        interestSubsidyVotes[pairKey] = aInner;
      }
    }
  }

  // Merge reinsuranceCollateralPledges using LWW
  const reinsuranceCollateralPledges = { ...stateA.reinsuranceCollateralPledges };
  if (stateB.reinsuranceCollateralPledges) {
    for (const [key, entryB] of Object.entries(stateB.reinsuranceCollateralPledges)) {
      const entryA = reinsuranceCollateralPledges[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        reinsuranceCollateralPledges[key] = entryB;
      }
    }
  }

  // Merge reinsuranceCollateralVotes using LWW
  const reinsuranceCollateralVotes = { ...stateA.reinsuranceCollateralVotes };
  if (stateB.reinsuranceCollateralVotes) {
    for (const [pairKey, bInner] of Object.entries(stateB.reinsuranceCollateralVotes)) {
      if (!reinsuranceCollateralVotes[pairKey]) {
        reinsuranceCollateralVotes[pairKey] = { ...bInner };
      } else {
        const aInner = { ...reinsuranceCollateralVotes[pairKey] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reinsuranceCollateralVotes[pairKey] = aInner;
      }
    }
  }

  // Merge turfCheckpoints using LWW
  const turfCheckpoints = { ...stateA.turfCheckpoints };
  if (stateB.turfCheckpoints) {
    for (const [roomId, entryB] of Object.entries(stateB.turfCheckpoints)) {
      const entryA = turfCheckpoints[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        turfCheckpoints[roomId] = entryB;
      }
    }
  }

  // Merge turfGuardOutposts using LWW
  const turfGuardOutposts = { ...stateA.turfGuardOutposts };
  if (stateB.turfGuardOutposts) {
    for (const [roomId, entryB] of Object.entries(stateB.turfGuardOutposts)) {
      const entryA = turfGuardOutposts[roomId];
      if (!entryA) {
        turfGuardOutposts[roomId] = entryB;
      } else if (entryB.timestamp > entryA.timestamp) {
        turfGuardOutposts[roomId] = entryB;
      } else if (entryB.timestamp === entryA.timestamp) {
        const mergedTurrets = { ...(entryA.turrets || {}) };
        if (entryB.turrets) {
          for (const [turretId, turretB] of Object.entries(entryB.turrets)) {
            const turretA = mergedTurrets[turretId];
            if (!turretA || turretB.timestamp > turretA.timestamp) {
              mergedTurrets[turretId] = turretB;
            }
          }
        }
        turfGuardOutposts[roomId] = {
          ...entryA,
          securityLevel: Math.max(entryA.securityLevel, entryB.securityLevel),
          turrets: mergedTurrets,
        };
      }
    }
  }

  // Merge smugglingConvoys using LWW
  const smugglingConvoys = { ...stateA.smugglingConvoys };
  if (stateB.smugglingConvoys) {
    for (const [convoyId, entryB] of Object.entries(stateB.smugglingConvoys)) {
      const entryA = smugglingConvoys[convoyId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        smugglingConvoys[convoyId] = entryB;
      }
    }
  }

  // Merge convoyInsurance using LWW
  const convoyInsurance = { ...stateA.convoyInsurance };
  if (stateB.convoyInsurance) {
    for (const [convoyId, entryB] of Object.entries(stateB.convoyInsurance)) {
      const entryA = convoyInsurance[convoyId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        convoyInsurance[convoyId] = entryB;
      }
    }
  }


  // Merge syndicateBribeVotes using LWW (Last-Write-Wins)
  const syndicateBribeVotes = { ...stateA.syndicateBribeVotes };
  if (stateB.syndicateBribeVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.syndicateBribeVotes)) {
      if (!syndicateBribeVotes[syndicateId]) {
        syndicateBribeVotes[syndicateId] = { ...bVotes };
      } else {
        syndicateBribeVotes[syndicateId] = { ...syndicateBribeVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = syndicateBribeVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            syndicateBribeVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge syndicateWaiverVotes using LWW (Last-Write-Wins)
  const syndicateWaiverVotes = { ...stateA.syndicateWaiverVotes };
  if (stateB.syndicateWaiverVotes) {
    for (const [syndicateId, wVotes] of Object.entries(stateB.syndicateWaiverVotes)) {
      if (!syndicateWaiverVotes[syndicateId]) {
        syndicateWaiverVotes[syndicateId] = { ...wVotes };
      } else {
        syndicateWaiverVotes[syndicateId] = { ...syndicateWaiverVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(wVotes)) {
          const voteA = syndicateWaiverVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            syndicateWaiverVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge syndicateTaxVotes using LWW (Last-Write-Wins)
  const syndicateTaxVotes = { ...stateA.syndicateTaxVotes };
  if (stateB.syndicateTaxVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.syndicateTaxVotes)) {
      if (!syndicateTaxVotes[syndicateId]) {
        syndicateTaxVotes[syndicateId] = { ...bVotes };
      } else {
        syndicateTaxVotes[syndicateId] = { ...syndicateTaxVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = syndicateTaxVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            syndicateTaxVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge covertCells using LWW (Last-Write-Wins)
  const covertCells = { ...stateA.covertCells };
  if (stateB.covertCells) {
    for (const [roomId, entryB] of Object.entries(stateB.covertCells)) {
      const entryA = covertCells[roomId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        covertCells[roomId] = entryB;
      }
    }
  }

  // Merge propagandaCampaigns using LWW (Last-Write-Wins)
  const propagandaCampaigns = { ...stateA.propagandaCampaigns };
  if (stateB.propagandaCampaigns) {
    for (const [key, entryB] of Object.entries(stateB.propagandaCampaigns)) {
      const entryA = propagandaCampaigns[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        propagandaCampaigns[key] = entryB;
      }
    }
  }

  // Merge saboteurs using LWW (Last-Write-Wins)
  const saboteurs = { ...stateA.saboteurs };
  if (stateB.saboteurs) {
    for (const [enforcerId, entryB] of Object.entries(stateB.saboteurs)) {
      const entryA = saboteurs[enforcerId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        saboteurs[enforcerId] = entryB;
      }
    }
  }

  // Merge eliteEnforcers using LWW (Last-Write-Wins)
  const eliteEnforcers = { ...stateA.eliteEnforcers };
  if (stateB.eliteEnforcers) {
    for (const [id, entryB] of Object.entries(stateB.eliteEnforcers)) {
      const entryA = eliteEnforcers[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        eliteEnforcers[id] = entryB;
      }
    }
  }

  // Merge legendaryHitmen using LWW (Last-Write-Wins)
  const legendaryHitmen = { ...stateA.legendaryHitmen };
  if (stateB.legendaryHitmen) {
    for (const [id, entryB] of Object.entries(stateB.legendaryHitmen)) {
      const entryA = legendaryHitmen[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        legendaryHitmen[id] = entryB;
      }
    }
  }

  // Merge decoyConvoys using LWW (Last-Write-Wins)
  const decoyConvoys = { ...stateA.decoyConvoys };
  if (stateB.decoyConvoys) {
    for (const [id, entryB] of Object.entries(stateB.decoyConvoys)) {
      const entryA = decoyConvoys[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        decoyConvoys[id] = entryB;
      }
    }
  }

  // Merge blackOpsSafehouses using LWW (Last-Write-Wins)
  const blackOpsSafehouses = { ...stateA.blackOpsSafehouses };
  if (stateB.blackOpsSafehouses) {
    for (const [id, entryB] of Object.entries(stateB.blackOpsSafehouses)) {
      const entryA = blackOpsSafehouses[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        blackOpsSafehouses[id] = entryB;
      }
    }
  }

  // Merge interceptorDecoys using LWW (Last-Write-Wins)
  const interceptorDecoys = { ...stateA.interceptorDecoys };
  if (stateB.interceptorDecoys) {
    for (const [id, entryB] of Object.entries(stateB.interceptorDecoys)) {
      const entryA = interceptorDecoys[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        interceptorDecoys[id] = entryB;
      }
    }
  }

  // Merge contrabandTunnels using LWW (Last-Write-Wins)
  const contrabandTunnels = { ...stateA.contrabandTunnels };
  if (stateB.contrabandTunnels) {
    for (const [id, entryB] of Object.entries(stateB.contrabandTunnels)) {
      const entryA = contrabandTunnels[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        contrabandTunnels[id] = entryB;
      }
    }
  }

  // Merge tunnelTolls using LWW (Last-Write-Wins)
  const tunnelTolls = { ...stateA.tunnelTolls };
  if (stateB.tunnelTolls) {
    for (const [id, entryB] of Object.entries(stateB.tunnelTolls)) {
      const entryA = tunnelTolls[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        tunnelTolls[id] = entryB;
      }
    }
  }

  // Merge tunnelDrones using LWW (Last-Write-Wins)
  const tunnelDrones = { ...stateA.tunnelDrones };
  if (stateB.tunnelDrones) {
    for (const [id, entryB] of Object.entries(stateB.tunnelDrones)) {
      const entryA = tunnelDrones[id];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        tunnelDrones[id] = entryB;
      }
    }
  }

  // Merge syndicateDefaults taking maximum (since defaults are monotonic)
  const syndicateDefaults = { ...stateA.syndicateDefaults };
  if (stateB.syndicateDefaults) {
    for (const [syndId, countB] of Object.entries(stateB.syndicateDefaults)) {
      const countA = syndicateDefaults[syndId] ?? 0;
      syndicateDefaults[syndId] = Math.max(countA, countB);
    }
  }

  // Merge reinsuranceRiskRatings using LWW
  const reinsuranceRiskRatings = { ...stateA.reinsuranceRiskRatings };
  if (stateB.reinsuranceRiskRatings) {
    for (const [key, ratingB] of Object.entries(stateB.reinsuranceRiskRatings)) {
      const ratingA = reinsuranceRiskRatings[key];
      if (!ratingA || ratingB.timestamp > ratingA.timestamp) {
        reinsuranceRiskRatings[key] = ratingB;
      }
    }
  }

  // Merge reinsuranceRiskRatingVotes using LWW
  const reinsuranceRiskRatingVotes = { ...stateA.reinsuranceRiskRatingVotes };
  if (stateB.reinsuranceRiskRatingVotes) {
    for (const [pairKey, bInner] of Object.entries(stateB.reinsuranceRiskRatingVotes)) {
      if (!reinsuranceRiskRatingVotes[pairKey]) {
        reinsuranceRiskRatingVotes[pairKey] = { ...bInner };
      } else {
        const aInner = { ...reinsuranceRiskRatingVotes[pairKey] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reinsuranceRiskRatingVotes[pairKey] = aInner;
      }
    }
  }

  // Merge reinsuranceLiquidityAudits using LWW
  const reinsuranceLiquidityAudits = { ...stateA.reinsuranceLiquidityAudits };
  if (stateB.reinsuranceLiquidityAudits) {
    for (const [key, auditB] of Object.entries(stateB.reinsuranceLiquidityAudits)) {
      const auditA = reinsuranceLiquidityAudits[key];
      if (!auditA || auditB.timestamp > auditA.timestamp) {
        reinsuranceLiquidityAudits[key] = auditB;
      }
    }
  }

  // Merge reinsuranceLiquidityAuditVotes using LWW
  const reinsuranceLiquidityAuditVotes = { ...stateA.reinsuranceLiquidityAuditVotes };
  if (stateB.reinsuranceLiquidityAuditVotes) {
    for (const [auditId, bInner] of Object.entries(stateB.reinsuranceLiquidityAuditVotes)) {
      if (!reinsuranceLiquidityAuditVotes[auditId]) {
        reinsuranceLiquidityAuditVotes[auditId] = { ...bInner };
      } else {
        const aInner = { ...reinsuranceLiquidityAuditVotes[auditId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reinsuranceLiquidityAuditVotes[auditId] = aInner;
      }
    }
  }

  // Merge secondaryReserves using LWW (Last-Write-Wins)
  const secondaryReserves = { ...stateA.secondaryReserves };
  if (stateB.secondaryReserves) {
    for (const [key, reserveB] of Object.entries(stateB.secondaryReserves)) {
      const reserveA = secondaryReserves[key];
      if (!reserveA || reserveB.timestamp > reserveA.timestamp) {
        secondaryReserves[key] = reserveB;
      }
    }
  }

  // Merge secondaryReserveVaults using LWW (Last-Write-Wins)
  const secondaryReserveVaults = { ...stateA.secondaryReserveVaults };
  if (stateB.secondaryReserveVaults) {
    for (const [key, vaultB] of Object.entries(stateB.secondaryReserveVaults)) {
      const vaultA = secondaryReserveVaults[key];
      if (!vaultA || vaultB.timestamp > vaultA.timestamp) {
        secondaryReserveVaults[key] = vaultB;
      }
    }
  }

  // Merge secondaryReserveInvestments using LWW (Last-Write-Wins)
  const secondaryReserveInvestments = { ...stateA.secondaryReserveInvestments };
  if (stateB.secondaryReserveInvestments) {
    for (const [syndicateId, bInner] of Object.entries(stateB.secondaryReserveInvestments)) {
      if (!secondaryReserveInvestments[syndicateId]) {
        secondaryReserveInvestments[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...secondaryReserveInvestments[syndicateId] };
        for (const [vaultId, investB] of Object.entries(bInner)) {
          const investA = aInner[vaultId];
          if (!investA || investB.timestamp > investA.timestamp) {
            aInner[vaultId] = investB;
          }
        }
        secondaryReserveInvestments[syndicateId] = aInner;
      }
    }
  }

  // Merge cdos using LWW (Last-Write-Wins)
  const cdos = { ...stateA.cdos };
  if (stateB.cdos) {
    for (const [key, cdoB] of Object.entries(stateB.cdos)) {
      const cdoA = cdos[key];
      if (!cdoA || cdoB.timestamp > cdoA.timestamp) {
        cdos[key] = cdoB;
      }
    }
  }

  // Merge creditDefaultSwaps using LWW (Last-Write-Wins)
  const creditDefaultSwaps = { ...stateA.creditDefaultSwaps };
  if (stateB.creditDefaultSwaps) {
    for (const [key, cdsB] of Object.entries(stateB.creditDefaultSwaps)) {
      const cdsA = creditDefaultSwaps[key];
      if (!cdsA || cdsB.timestamp > cdsA.timestamp) {
        creditDefaultSwaps[key] = cdsB;
      }
    }
  }

  // Merge swfYieldCDOCDSs using LWW (Last-Write-Wins)
  const swfYieldCDOCDSs = { ...stateA.swfYieldCDOCDSs };
  if (stateB.swfYieldCDOCDSs) {
    for (const [key, cdsB] of Object.entries(stateB.swfYieldCDOCDSs)) {
      const cdsA = swfYieldCDOCDSs[key];
      if (!cdsA || cdsB.timestamp > cdsA.timestamp) {
        swfYieldCDOCDSs[key] = cdsB;
      }
    }
  }

  // Merge marginAccounts using LWW (Last-Write-Wins)
  const marginAccounts = { ...stateA.marginAccounts };
  if (stateB.marginAccounts) {
    for (const [key, maB] of Object.entries(stateB.marginAccounts)) {
      const maA = marginAccounts[key];
      if (!maA || maB.timestamp > maA.timestamp) {
        marginAccounts[key] = maB;
      }
    }
  }

  // Merge marginRehypothecationVotes using LWW (Last-Write-Wins)
  const marginRehypothecationVotes = { ...stateA.marginRehypothecationVotes };
  if (stateB.marginRehypothecationVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.marginRehypothecationVotes)) {
      if (!marginRehypothecationVotes[syndicateId]) {
        marginRehypothecationVotes[syndicateId] = { ...bVotes };
      } else {
        marginRehypothecationVotes[syndicateId] = { ...marginRehypothecationVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = marginRehypothecationVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            marginRehypothecationVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge marginRehypothecationRevokeVotes using LWW (Last-Write-Wins)
  const marginRehypothecationRevokeVotes = { ...stateA.marginRehypothecationRevokeVotes };
  if (stateB.marginRehypothecationRevokeVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.marginRehypothecationRevokeVotes)) {
      if (!marginRehypothecationRevokeVotes[syndicateId]) {
        marginRehypothecationRevokeVotes[syndicateId] = { ...bVotes };
      } else {
        marginRehypothecationRevokeVotes[syndicateId] = { ...marginRehypothecationRevokeVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = marginRehypothecationRevokeVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            marginRehypothecationRevokeVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge marginRebalancingPolicyVotes using LWW (Last-Write-Wins)
  const marginRebalancingPolicyVotes = { ...stateA.marginRebalancingPolicyVotes };
  if (stateB.marginRebalancingPolicyVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.marginRebalancingPolicyVotes)) {
      if (!marginRebalancingPolicyVotes[syndicateId]) {
        marginRebalancingPolicyVotes[syndicateId] = { ...bVotes };
      } else {
        marginRebalancingPolicyVotes[syndicateId] = { ...marginRebalancingPolicyVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = marginRebalancingPolicyVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            marginRebalancingPolicyVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfMarginRehypothecationVotes using LWW
  const swfMarginRehypothecationVotes = { ...stateA.swfMarginRehypothecationVotes };
  if (stateB.swfMarginRehypothecationVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfMarginRehypothecationVotes)) {
      if (!swfMarginRehypothecationVotes[syndicateId]) {
        swfMarginRehypothecationVotes[syndicateId] = { ...bVotes };
      } else {
        swfMarginRehypothecationVotes[syndicateId] = { ...swfMarginRehypothecationVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfMarginRehypothecationVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfMarginRehypothecationVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfMarginRehypothecationRevokeVotes using LWW
  const swfMarginRehypothecationRevokeVotes = { ...stateA.swfMarginRehypothecationRevokeVotes };
  if (stateB.swfMarginRehypothecationRevokeVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfMarginRehypothecationRevokeVotes)) {
      if (!swfMarginRehypothecationRevokeVotes[syndicateId]) {
        swfMarginRehypothecationRevokeVotes[syndicateId] = { ...bVotes };
      } else {
        swfMarginRehypothecationRevokeVotes[syndicateId] = { ...swfMarginRehypothecationRevokeVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfMarginRehypothecationRevokeVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfMarginRehypothecationRevokeVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfMarginRebalancingPolicyVotes using LWW
  const swfMarginRebalancingPolicyVotes = { ...stateA.swfMarginRebalancingPolicyVotes };
  if (stateB.swfMarginRebalancingPolicyVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfMarginRebalancingPolicyVotes)) {
      if (!swfMarginRebalancingPolicyVotes[syndicateId]) {
        swfMarginRebalancingPolicyVotes[syndicateId] = { ...bVotes };
      } else {
        swfMarginRebalancingPolicyVotes[syndicateId] = { ...swfMarginRebalancingPolicyVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfMarginRebalancingPolicyVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfMarginRebalancingPolicyVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfYieldArbitragePolicyVotes using LWW
  const swfYieldArbitragePolicyVotes = { ...stateA.swfYieldArbitragePolicyVotes };
  if (stateB.swfYieldArbitragePolicyVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfYieldArbitragePolicyVotes)) {
      if (!swfYieldArbitragePolicyVotes[syndicateId]) {
        swfYieldArbitragePolicyVotes[syndicateId] = { ...bVotes };
      } else {
        swfYieldArbitragePolicyVotes[syndicateId] = { ...swfYieldArbitragePolicyVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfYieldArbitragePolicyVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfYieldArbitragePolicyVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfStakingPolicyVotes using LWW
  const swfStakingPolicyVotes = { ...stateA.swfStakingPolicyVotes };
  if (stateB.swfStakingPolicyVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfStakingPolicyVotes)) {
      if (!swfStakingPolicyVotes[syndicateId]) {
        swfStakingPolicyVotes[syndicateId] = { ...bVotes };
      } else {
        swfStakingPolicyVotes[syndicateId] = { ...swfStakingPolicyVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfStakingPolicyVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfStakingPolicyVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfRebalancingAdvisorVotes using LWW
  const swfRebalancingAdvisorVotes = { ...stateA.swfRebalancingAdvisorVotes };
  if (stateB.swfRebalancingAdvisorVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfRebalancingAdvisorVotes)) {
      if (!swfRebalancingAdvisorVotes[syndicateId]) {
        swfRebalancingAdvisorVotes[syndicateId] = { ...bVotes };
      } else {
        swfRebalancingAdvisorVotes[syndicateId] = { ...swfRebalancingAdvisorVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfRebalancingAdvisorVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfRebalancingAdvisorVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfAdvisorSafetyThresholdVotes using LWW
  const swfAdvisorSafetyThresholdVotes = { ...stateA.swfAdvisorSafetyThresholdVotes };
  if (stateB.swfAdvisorSafetyThresholdVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfAdvisorSafetyThresholdVotes)) {
      if (!swfAdvisorSafetyThresholdVotes[syndicateId]) {
        swfAdvisorSafetyThresholdVotes[syndicateId] = { ...bVotes };
      } else {
        swfAdvisorSafetyThresholdVotes[syndicateId] = { ...swfAdvisorSafetyThresholdVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfAdvisorSafetyThresholdVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfAdvisorSafetyThresholdVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfLeverageTargetVotes using LWW
  const swfLeverageTargetVotes = { ...stateA.swfLeverageTargetVotes };
  if (stateB.swfLeverageTargetVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfLeverageTargetVotes)) {
      if (!swfLeverageTargetVotes[syndicateId]) {
        swfLeverageTargetVotes[syndicateId] = { ...bVotes };
      } else {
        swfLeverageTargetVotes[syndicateId] = { ...swfLeverageTargetVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfLeverageTargetVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfLeverageTargetVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfTrancheLeverageTargetVotes using LWW
  const swfTrancheLeverageTargetVotes = { ...stateA.swfTrancheLeverageTargetVotes };
  if (stateB.swfTrancheLeverageTargetVotes) {
    for (const [syndicateId, bAgentVotes] of Object.entries(stateB.swfTrancheLeverageTargetVotes)) {
      if (!swfTrancheLeverageTargetVotes[syndicateId]) {
        swfTrancheLeverageTargetVotes[syndicateId] = { ...bAgentVotes };
      } else {
        swfTrancheLeverageTargetVotes[syndicateId] = { ...swfTrancheLeverageTargetVotes[syndicateId] };
        for (const [agentId, bTrancheVotes] of Object.entries(bAgentVotes)) {
          if (!swfTrancheLeverageTargetVotes[syndicateId][agentId]) {
            swfTrancheLeverageTargetVotes[syndicateId][agentId] = { ...bTrancheVotes };
          } else {
            swfTrancheLeverageTargetVotes[syndicateId][agentId] = { ...swfTrancheLeverageTargetVotes[syndicateId][agentId] };
            for (const [trancheId, voteB] of Object.entries(bTrancheVotes)) {
              const tid = trancheId as "senior" | "mezzanine" | "equity";
              const voteA = swfTrancheLeverageTargetVotes[syndicateId][agentId][tid];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                swfTrancheLeverageTargetVotes[syndicateId][agentId][tid] = voteB;
              }
            }
          }
        }
      }
    }
  }

  // Merge swfFractionalReserveRatioVotes using LWW
  const swfFractionalReserveRatioVotes = { ...stateA.swfFractionalReserveRatioVotes };
  if (stateB.swfFractionalReserveRatioVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.swfFractionalReserveRatioVotes)) {
      if (!swfFractionalReserveRatioVotes[syndicateId]) {
        swfFractionalReserveRatioVotes[syndicateId] = { ...bVotes };
      } else {
        swfFractionalReserveRatioVotes[syndicateId] = { ...swfFractionalReserveRatioVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = swfFractionalReserveRatioVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            swfFractionalReserveRatioVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge claimSWFLiquidityRewardsVotes using LWW
  const claimSWFLiquidityRewardsVotes = { ...stateA.claimSWFLiquidityRewardsVotes };
  if (stateB.claimSWFLiquidityRewardsVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.claimSWFLiquidityRewardsVotes)) {
      if (!claimSWFLiquidityRewardsVotes[syndicateId]) {
        claimSWFLiquidityRewardsVotes[syndicateId] = { ...bVotes };
      } else {
        claimSWFLiquidityRewardsVotes[syndicateId] = { ...claimSWFLiquidityRewardsVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = claimSWFLiquidityRewardsVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            claimSWFLiquidityRewardsVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge lockedSWFCollateralVotes using LWW
  const lockedSWFCollateralVotes = { ...stateA.lockedSWFCollateralVotes };
  if (stateB.lockedSWFCollateralVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.lockedSWFCollateralVotes)) {
      if (!lockedSWFCollateralVotes[syndicateId]) {
        lockedSWFCollateralVotes[syndicateId] = { ...bVotes };
      } else {
        lockedSWFCollateralVotes[syndicateId] = { ...lockedSWFCollateralVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = lockedSWFCollateralVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            lockedSWFCollateralVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge cooperativeSWFStakingCampaigns using LWW with union of participants
  const cooperativeSWFStakingCampaigns = { ...stateA.cooperativeSWFStakingCampaigns };
  if (stateB.cooperativeSWFStakingCampaigns) {
    for (const [campId, campB] of Object.entries(stateB.cooperativeSWFStakingCampaigns)) {
      const campA = cooperativeSWFStakingCampaigns[campId];
      if (!campA) {
        cooperativeSWFStakingCampaigns[campId] = { ...campB };
      } else {
        if (campB.timestamp > campA.timestamp) {
          cooperativeSWFStakingCampaigns[campId] = { ...campB };
        } else if (campB.timestamp === campA.timestamp) {
          const participants = Array.from(new Set([...campA.participants, ...campB.participants]));
          cooperativeSWFStakingCampaigns[campId] = {
            ...campA,
            participants,
          };
        }
      }
    }
  }

  // Merge cooperativeSWFStakingCampaignProposals using LWW
  const cooperativeSWFStakingCampaignProposals = { ...stateA.cooperativeSWFStakingCampaignProposals };
  if (stateB.cooperativeSWFStakingCampaignProposals) {
    for (const [propId, propB] of Object.entries(stateB.cooperativeSWFStakingCampaignProposals)) {
      const propA = cooperativeSWFStakingCampaignProposals[propId];
      if (!propA) {
        cooperativeSWFStakingCampaignProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        cooperativeSWFStakingCampaignProposals[propId] = {
          ...propA,
          resolved: propA.resolved || propB.resolved,
          timestamp: Math.max(propA.timestamp, propB.timestamp),
          votes: mergedVotes,
        };
      }
    }
  }

  // Merge cooperativeSWFStakingCampaignJoinVotes using LWW
  const cooperativeSWFStakingCampaignJoinVotes = { ...stateA.cooperativeSWFStakingCampaignJoinVotes };
  if (stateB.cooperativeSWFStakingCampaignJoinVotes) {
    for (const [syndicateId, bCampaigns] of Object.entries(stateB.cooperativeSWFStakingCampaignJoinVotes)) {
      if (!cooperativeSWFStakingCampaignJoinVotes[syndicateId]) {
        cooperativeSWFStakingCampaignJoinVotes[syndicateId] = { ...bCampaigns };
      } else {
        cooperativeSWFStakingCampaignJoinVotes[syndicateId] = { ...cooperativeSWFStakingCampaignJoinVotes[syndicateId] };
        for (const [campId, bVotes] of Object.entries(bCampaigns)) {
          if (!cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId]) {
            cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId] = { ...bVotes };
          } else {
            cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId] = { ...cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId] };
            for (const [agentId, voteB] of Object.entries(bVotes)) {
              const voteA = cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId][agentId];
              if (!voteA || voteB.timestamp > voteA.timestamp) {
                cooperativeSWFStakingCampaignJoinVotes[syndicateId][campId][agentId] = voteB;
              }
            }
          }
        }
      }
    }
  }

  // Merge factionSponsorProposals using LWW (Last-Write-Wins)
  const factionSponsorProposals = { ...stateA.factionSponsorProposals };
  if (stateB.factionSponsorProposals) {
    for (const [propId, propB] of Object.entries(stateB.factionSponsorProposals)) {
      const propA = factionSponsorProposals[propId];
      if (!propA) {
        factionSponsorProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          factionSponsorProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          factionSponsorProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge factionSponsorPolicies using LWW (Last-Write-Wins)
  const factionSponsorPolicies = { ...stateA.factionSponsorPolicies };
  if (stateB.factionSponsorPolicies) {
    for (const [syndId, bInner] of Object.entries(stateB.factionSponsorPolicies)) {
      if (!factionSponsorPolicies[syndId]) {
        factionSponsorPolicies[syndId] = { ...bInner };
      } else {
        const aInner = { ...factionSponsorPolicies[syndId] };
        for (const [vaultId, policyB] of Object.entries(bInner)) {
          const policyA = aInner[vaultId];
          if (!policyA || policyB.timestamp > policyA.timestamp) {
            aInner[vaultId] = policyB;
          }
        }
        factionSponsorPolicies[syndId] = aInner;
      }
    }
  }

  // Merge sponsorAuditProposals using LWW (Last-Write-Wins)
  const sponsorAuditProposals = { ...stateA.sponsorAuditProposals };
  if (stateB.sponsorAuditProposals) {
    for (const [propId, propB] of Object.entries(stateB.sponsorAuditProposals)) {
      const propA = sponsorAuditProposals[propId];
      if (!propA) {
        sponsorAuditProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          sponsorAuditProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          sponsorAuditProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge sponsorRevocationProposals using LWW (Last-Write-Wins)
  const sponsorRevocationProposals = { ...stateA.sponsorRevocationProposals };
  if (stateB.sponsorRevocationProposals) {
    for (const [propId, propB] of Object.entries(stateB.sponsorRevocationProposals)) {
      const propA = sponsorRevocationProposals[propId];
      if (!propA) {
        sponsorRevocationProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          sponsorRevocationProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          sponsorRevocationProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge rewardSlashingProposals using LWW (Last-Write-Wins)
  const rewardSlashingProposals = { ...stateA.rewardSlashingProposals };
  if (stateB.rewardSlashingProposals) {
    for (const [propId, propB] of Object.entries(stateB.rewardSlashingProposals)) {
      const propA = rewardSlashingProposals[propId];
      if (!propA) {
        rewardSlashingProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          rewardSlashingProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          rewardSlashingProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge rehabCampaignProposals using LWW (Last-Write-Wins)
  const rehabCampaignProposals = { ...stateA.rehabCampaignProposals };
  if (stateB.rehabCampaignProposals) {
    for (const [propId, propB] of Object.entries(stateB.rehabCampaignProposals)) {
      const propA = rehabCampaignProposals[propId];
      if (!propA) {
        rehabCampaignProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          rehabCampaignProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          rehabCampaignProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge reinvestmentBreachRehabProposals using LWW (Last-Write-Wins)
  const reinvestmentBreachRehabProposals = { ...stateA.reinvestmentBreachRehabProposals };
  if (stateB.reinvestmentBreachRehabProposals) {
    for (const [propId, propB] of Object.entries(stateB.reinvestmentBreachRehabProposals)) {
      const propA = reinvestmentBreachRehabProposals[propId];
      if (!propA) {
        reinvestmentBreachRehabProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          reinvestmentBreachRehabProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          reinvestmentBreachRehabProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge cooperativeRehabSubsidyProposals using LWW (Last-Write-Wins)
  const cooperativeRehabSubsidyProposals = { ...stateA.cooperativeRehabSubsidyProposals };
  if (stateB.cooperativeRehabSubsidyProposals) {
    for (const [propId, propB] of Object.entries(stateB.cooperativeRehabSubsidyProposals)) {
      const propA = cooperativeRehabSubsidyProposals[propId];
      if (!propA) {
        cooperativeRehabSubsidyProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          cooperativeRehabSubsidyProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          cooperativeRehabSubsidyProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge cooperativeStakingYieldSweepProposals using LWW (Last-Write-Wins) (AF-206)
  const cooperativeStakingYieldSweepProposals = { ...stateA.cooperativeStakingYieldSweepProposals };
  if (stateB.cooperativeStakingYieldSweepProposals) {
    for (const [propId, propB] of Object.entries(stateB.cooperativeStakingYieldSweepProposals)) {
      const propA = cooperativeStakingYieldSweepProposals[propId];
      if (!propA) {
        cooperativeStakingYieldSweepProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          cooperativeStakingYieldSweepProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          cooperativeStakingYieldSweepProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge rehabSubsidyProposals using LWW (Last-Write-Wins)

  const rehabSubsidyProposals = { ...stateA.rehabSubsidyProposals };
  if (stateB.rehabSubsidyProposals) {
    for (const [propId, propB] of Object.entries(stateB.rehabSubsidyProposals)) {
      const propA = rehabSubsidyProposals[propId];
      if (!propA) {
        rehabSubsidyProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          rehabSubsidyProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          rehabSubsidyProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge factionLoyaltyBonds using LWW (Last-Write-Wins)
  const factionLoyaltyBonds = { ...stateA.factionLoyaltyBonds };
  if (stateB.factionLoyaltyBonds) {
    for (const [bondId, bondB] of Object.entries(stateB.factionLoyaltyBonds)) {
      const bondA = factionLoyaltyBonds[bondId];
      if (!bondA || bondB.timestamp > bondA.timestamp) {
        factionLoyaltyBonds[bondId] = { ...bondB };
      }
    }
  }

  // Merge claimLoyaltyRankProposals using LWW (Last-Write-Wins)
  const claimLoyaltyRankProposals = { ...stateA.claimLoyaltyRankProposals };
  if (stateB.claimLoyaltyRankProposals) {
    for (const [propId, propB] of Object.entries(stateB.claimLoyaltyRankProposals)) {
      const propA = claimLoyaltyRankProposals[propId];
      if (!propA) {
        claimLoyaltyRankProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...propA.votes };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          claimLoyaltyRankProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          claimLoyaltyRankProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge factionLoyaltyRanks using LWW (Last-Write-Wins)
  const factionLoyaltyRanks = { ...stateA.factionLoyaltyRanks };
  if (stateB.factionLoyaltyRanks) {
    for (const [rankId, rankB] of Object.entries(stateB.factionLoyaltyRanks)) {
      const rankA = factionLoyaltyRanks[rankId];
      if (!rankA || rankB.timestamp > rankA.timestamp) {
        factionLoyaltyRanks[rankId] = { ...rankB };
      }
    }
  }

  // Merge factionCdoInsurancePools using LWW (Last-Write-Wins)
  const factionCdoInsurancePools = { ...stateA.factionCdoInsurancePools };
  if (stateB.factionCdoInsurancePools) {
    for (const [poolId, poolB] of Object.entries(stateB.factionCdoInsurancePools)) {
      const poolA = factionCdoInsurancePools[poolId];
      if (!poolA || poolB.timestamp > poolA.timestamp) {
        factionCdoInsurancePools[poolId] = { ...poolB };
      }
    }
  }

  // Merge cdoMiningBoosters using LWW (Last-Write-Wins)
  const cdoMiningBoosters = { ...stateA.cdoMiningBoosters };
  if (stateB.cdoMiningBoosters) {
    for (const [boosterId, boosterB] of Object.entries(stateB.cdoMiningBoosters)) {
      const boosterA = cdoMiningBoosters[boosterId];
      if (!boosterA || boosterB.timestamp > boosterA.timestamp) {
        cdoMiningBoosters[boosterId] = { ...boosterB };
      }
    }
  }

  // Merge cooperativeYieldCampaignProposals using LWW (Last-Write-Wins)
  const cooperativeYieldCampaignProposals = { ...stateA.cooperativeYieldCampaignProposals };
  if (stateB.cooperativeYieldCampaignProposals) {
    for (const [propId, propB] of Object.entries(stateB.cooperativeYieldCampaignProposals)) {
      const propA = cooperativeYieldCampaignProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        cooperativeYieldCampaignProposals[propId] = { ...propB };
      }
    }
  }

  // Merge cooperativeSovereigntyBondProposals using LWW (Last-Write-Wins)
  const cooperativeSovereigntyBondProposals = { ...stateA.cooperativeSovereigntyBondProposals };
  if (stateB.cooperativeSovereigntyBondProposals) {
    for (const [propId, propB] of Object.entries(stateB.cooperativeSovereigntyBondProposals)) {
      const propA = cooperativeSovereigntyBondProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        cooperativeSovereigntyBondProposals[propId] = { ...propB };
      }
    }
  }

  // Merge sovereignBondBorrowPositions using LWW (Last-Write-Wins)
  const sovereignBondBorrowPositions = { ...stateA.sovereignBondBorrowPositions };
  if (stateB.sovereignBondBorrowPositions) {
    for (const [posId, posB] of Object.entries(stateB.sovereignBondBorrowPositions)) {
      const posA = sovereignBondBorrowPositions[posId];
      if (!posA || posB.timestamp > posA.timestamp) {
        sovereignBondBorrowPositions[posId] = { ...posB };
      }
    }
  }

  // Merge sovereignBondLendingPools using LWW (Last-Write-Wins)
  const sovereignBondLendingPools = { ...stateA.sovereignBondLendingPools };
  if (stateB.sovereignBondLendingPools) {
    for (const [poolId, poolB] of Object.entries(stateB.sovereignBondLendingPools)) {
      const poolA = sovereignBondLendingPools[poolId];
      if (!poolA || poolB.timestamp > poolA.timestamp) {
        sovereignBondLendingPools[poolId] = { ...poolB };
      }
    }
  }

  // Merge secondaryBondListings using LWW (Last-Write-Wins)
  const secondaryBondListings = { ...stateA.secondaryBondListings };
  if (stateB.secondaryBondListings) {
    for (const [listingId, listingB] of Object.entries(stateB.secondaryBondListings)) {
      const listingA = secondaryBondListings[listingId];
      if (!listingA || listingB.timestamp > listingA.timestamp) {
        secondaryBondListings[listingId] = { ...listingB };
      }
    }
  }

  // Merge factionCdoInsurancePoolProposals using LWW (Last-Write-Wins)
  const factionCdoInsurancePoolProposals = { ...stateA.factionCdoInsurancePoolProposals };
  if (stateB.factionCdoInsurancePoolProposals) {
    for (const [propId, propB] of Object.entries(stateB.factionCdoInsurancePoolProposals)) {
      const propA = factionCdoInsurancePoolProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        factionCdoInsurancePoolProposals[propId] = { ...propB };
      }
    }
  }

  // Merge multiFactionCdoRiskRatings using LWW (Last-Write-Wins)
  const multiFactionCdoRiskRatings = { ...stateA.multiFactionCdoRiskRatings };
  if (stateB.multiFactionCdoRiskRatings) {
    for (const [key, ratingB] of Object.entries(stateB.multiFactionCdoRiskRatings)) {
      const ratingA = multiFactionCdoRiskRatings[key];
      if (!ratingA || ratingB.timestamp > ratingA.timestamp) {
        multiFactionCdoRiskRatings[key] = { ...ratingB };
      }
    }
  }

  // Merge multiFactionCdoRiskRatingProposals using LWW (Last-Write-Wins)
  const multiFactionCdoRiskRatingProposals = { ...stateA.multiFactionCdoRiskRatingProposals };
  if (stateB.multiFactionCdoRiskRatingProposals) {
    for (const [propId, propB] of Object.entries(stateB.multiFactionCdoRiskRatingProposals)) {
      const propA = multiFactionCdoRiskRatingProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        multiFactionCdoRiskRatingProposals[propId] = { ...propB };
      }
    }
  }

  // Merge sovereignDebtProposals using LWW (Last-Write-Wins)
  const sovereignDebtProposals = { ...stateA.sovereignDebtProposals };
  if (stateB.sovereignDebtProposals) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtProposals)) {
      const propA = sovereignDebtProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        sovereignDebtProposals[propId] = { ...propB };
      }
    }
  }

  // Merge liquidityPoolAudits using LWW (Last-Write-Wins)
  const liquidityPoolAudits = { ...stateA.liquidityPoolAudits };
  if (stateB.liquidityPoolAudits) {
    for (const [auditId, auditB] of Object.entries(stateB.liquidityPoolAudits)) {
      const auditA = liquidityPoolAudits[auditId];
      if (!auditA || auditB.timestamp > auditA.timestamp) {
        liquidityPoolAudits[auditId] = { ...auditB };
      }
    }
  }

  // Merge antiDeficitStabilizationPolicies using LWW (Last-Write-Wins)
  const antiDeficitStabilizationPolicies = { ...stateA.antiDeficitStabilizationPolicies };
  if (stateB.antiDeficitStabilizationPolicies) {
    for (const [syndicateId, policyB] of Object.entries(stateB.antiDeficitStabilizationPolicies)) {
      const policyA = antiDeficitStabilizationPolicies[syndicateId];
      if (!policyA || policyB.timestamp > policyA.timestamp) {
        antiDeficitStabilizationPolicies[syndicateId] = { ...policyB };
      }
    }
  }

  // Merge antiDeficitStabilizationVotes using LWW (Last-Write-Wins)
  const antiDeficitStabilizationVotes = { ...stateA.antiDeficitStabilizationVotes };
  if (stateB.antiDeficitStabilizationVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.antiDeficitStabilizationVotes)) {
      if (!antiDeficitStabilizationVotes[syndicateId]) {
        antiDeficitStabilizationVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...antiDeficitStabilizationVotes[syndicateId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = { ...voteB };
          }
        }
        antiDeficitStabilizationVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge liquidityPoolAuditVotes using LWW (Last-Write-Wins)
  const liquidityPoolAuditVotes = { ...stateA.liquidityPoolAuditVotes };
  if (stateB.liquidityPoolAuditVotes) {
    for (const [auditId, bInner] of Object.entries(stateB.liquidityPoolAuditVotes)) {
      if (!liquidityPoolAuditVotes[auditId]) {
        liquidityPoolAuditVotes[auditId] = { ...bInner };
      } else {
        const aInner = { ...liquidityPoolAuditVotes[auditId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = { ...voteB };
          }
        }
        liquidityPoolAuditVotes[auditId] = aInner;
      }
    }
  }

  // Merge stabilizationTransferVotes using LWW (Last-Write-Wins)
  const stabilizationTransferVotes = { ...stateA.stabilizationTransferVotes };
  if (stateB.stabilizationTransferVotes) {
    for (const [transferId, bInner] of Object.entries(stateB.stabilizationTransferVotes)) {
      if (!stabilizationTransferVotes[transferId]) {
        stabilizationTransferVotes[transferId] = { ...bInner };
      } else {
        const aInner = { ...stabilizationTransferVotes[transferId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = { ...voteB };
          }
        }
        stabilizationTransferVotes[transferId] = aInner;
      }
    }
  }

  // Merge crossMeshBridgeProposals using LWW (Last-Write-Wins)
  const crossMeshBridgeProposals = { ...stateA.crossMeshBridgeProposals };
  if (stateB.crossMeshBridgeProposals) {
    for (const [propId, propB] of Object.entries(stateB.crossMeshBridgeProposals)) {
      const propA = crossMeshBridgeProposals[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        crossMeshBridgeProposals[propId] = { ...propB };
      }
    }
  }

  // Merge crossMeshBridgeLoans using LWW (Last-Write-Wins)
  const crossMeshBridgeLoans = { ...stateA.crossMeshBridgeLoans };
  if (stateB.crossMeshBridgeLoans) {
    for (const [loanId, loanB] of Object.entries(stateB.crossMeshBridgeLoans)) {
      const loanA = crossMeshBridgeLoans[loanId];
      if (!loanA || loanB.timestamp > loanA.timestamp) {
        crossMeshBridgeLoans[loanId] = { ...loanB };
      }
    }
  }

  // Merge reserveSweepPolicies using LWW (Last-Write-Wins)
  const reserveSweepPolicies = { ...stateA.reserveSweepPolicies };
  if (stateB.reserveSweepPolicies) {
    for (const [syndicateId, policyB] of Object.entries(stateB.reserveSweepPolicies)) {
      const policyA = reserveSweepPolicies[syndicateId];
      if (!policyA || policyB.timestamp > policyA.timestamp) {
        reserveSweepPolicies[syndicateId] = { ...policyB };
      }
    }
  }

  // Merge reserveSweepVotes using LWW (Last-Write-Wins)
  const reserveSweepVotes = { ...stateA.reserveSweepVotes };
  if (stateB.reserveSweepVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.reserveSweepVotes)) {
      if (!reserveSweepVotes[syndicateId]) {
        reserveSweepVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...reserveSweepVotes[syndicateId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = { ...voteB };
          }
        }
        reserveSweepVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge reserveSweepContestVotes using LWW (Last-Write-Wins)
  const reserveSweepContestVotes = { ...stateA.reserveSweepContestVotes };
  if (stateB.reserveSweepContestVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.reserveSweepContestVotes)) {
      if (!reserveSweepContestVotes[syndicateId]) {
        reserveSweepContestVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...reserveSweepContestVotes[syndicateId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = { ...voteB };
          }
        }
        reserveSweepContestVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge sovereignDebtRestructureProposals using LWW (Last-Write-Wins)
  const sovereignDebtRestructureProposals = { ...stateA.sovereignDebtRestructureProposals };
  if (stateB.sovereignDebtRestructureProposals) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtRestructureProposals)) {
      const propA = sovereignDebtRestructureProposals[propId];
      if (!propA) {
        sovereignDebtRestructureProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          sovereignDebtRestructureProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          sovereignDebtRestructureProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge factionBailoutProposals using LWW (Last-Write-Wins)
  const factionBailoutProposals = { ...stateA.factionBailoutProposals };
  if (stateB.factionBailoutProposals) {
    for (const [propId, propB] of Object.entries(stateB.factionBailoutProposals)) {
      const propA = factionBailoutProposals[propId];
      if (!propA) {
        factionBailoutProposals[propId] = { ...propB };
      } else {
        const mergedVotes = { ...(propA.votes || {}) };
        if (propB.votes) {
          for (const [voterId, voteB] of Object.entries(propB.votes)) {
            const voteA = mergedVotes[voterId];
            if (!voteA || voteB.timestamp > voteA.timestamp) {
              mergedVotes[voterId] = voteB;
            }
          }
        }
        if (propB.timestamp > propA.timestamp) {
          factionBailoutProposals[propId] = {
            ...propB,
            votes: mergedVotes,
          };
        } else {
          factionBailoutProposals[propId] = {
            ...propA,
            votes: mergedVotes,
          };
        }
      }
    }
  }

  // Merge factionReserveBonds using LWW (Last-Write-Wins)
  const factionReserveBonds = { ...stateA.factionReserveBonds };
  if (stateB.factionReserveBonds) {
    for (const [bondId, bondB] of Object.entries(stateB.factionReserveBonds)) {
      const bondA = factionReserveBonds[bondId];
      if (!bondA || bondB.timestamp > bondA.timestamp) {
        factionReserveBonds[bondId] = { ...bondB };
      }
    }
  }

  // Merge maliciousActors using boolean OR union
  const maliciousActors = { ...stateA.maliciousActors };
  if (stateB.maliciousActors) {
    for (const [actorId, isMalicious] of Object.entries(stateB.maliciousActors)) {
      if (isMalicious) {
        maliciousActors[actorId] = true;
      }
    }
  }

  // Merge slashingRates using Max rate value
  const slashingRates = { ...stateA.slashingRates };
  if (stateB.slashingRates) {
    for (const [syndId, rate] of Object.entries(stateB.slashingRates)) {
      slashingRates[syndId] = Math.max(slashingRates[syndId] ?? 0, rate);
    }
  }

  // Merge creditDefaultSwapVotes using LWW (Last-Write-Wins)
  const creditDefaultSwapVotes = { ...stateA.creditDefaultSwapVotes };
  if (stateB.creditDefaultSwapVotes) {
    for (const [cdsId, bInner] of Object.entries(stateB.creditDefaultSwapVotes)) {
      if (!creditDefaultSwapVotes[cdsId]) {
        creditDefaultSwapVotes[cdsId] = { ...bInner };
      } else {
        const aInner = { ...creditDefaultSwapVotes[cdsId] };
        for (const [agentId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[agentId] = voteB;
          }
        }
        creditDefaultSwapVotes[cdsId] = aInner;
      }
    }
  }

  // Merge swfYieldCDOCDSVotes using LWW (Last-Write-Wins)
  const swfYieldCDOCDSVotes = { ...stateA.swfYieldCDOCDSVotes };
  if (stateB.swfYieldCDOCDSVotes) {
    for (const [cdsId, bInner] of Object.entries(stateB.swfYieldCDOCDSVotes)) {
      if (!swfYieldCDOCDSVotes[cdsId]) {
        swfYieldCDOCDSVotes[cdsId] = { ...bInner };
      } else {
        const aInner = { ...swfYieldCDOCDSVotes[cdsId] };
        for (const [agentId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[agentId] = voteB;
          }
        }
        swfYieldCDOCDSVotes[cdsId] = aInner;
      }
    }
  }

  // Merge swfYieldCDOCDSTrades using LWW (Last-Write-Wins)
  const swfYieldCDOCDSTrades = { ...stateA.swfYieldCDOCDSTrades };
  if (stateB.swfYieldCDOCDSTrades) {
    for (const [key, tradeB] of Object.entries(stateB.swfYieldCDOCDSTrades)) {
      const tradeA = swfYieldCDOCDSTrades[key];
      if (!tradeA || tradeB.timestamp > tradeA.timestamp) {
        swfYieldCDOCDSTrades[key] = tradeB;
      }
    }
  }

  // Merge reserveRatioVotes using LWW (Last-Write-Wins)
  const reserveRatioVotes = { ...stateA.reserveRatioVotes };
  if (stateB.reserveRatioVotes) {
    for (const [syndicateId, bInner] of Object.entries(stateB.reserveRatioVotes)) {
      if (!reserveRatioVotes[syndicateId]) {
        reserveRatioVotes[syndicateId] = { ...bInner };
      } else {
        const aInner = { ...reserveRatioVotes[syndicateId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        reserveRatioVotes[syndicateId] = aInner;
      }
    }
  }

  // Merge automatedBailouts using LWW (Last-Write-Wins)
  const automatedBailouts = { ...stateA.automatedBailouts };
  if (stateB.automatedBailouts) {
    for (const [key, bailoutB] of Object.entries(stateB.automatedBailouts)) {
      const bailoutA = automatedBailouts[key];
      if (!bailoutA || bailoutB.timestamp > bailoutA.timestamp) {
        automatedBailouts[key] = bailoutB;
      }
    }
  }

  // Merge creditDefaultSwapTrades using LWW (Last-Write-Wins)
  const creditDefaultSwapTrades = { ...stateA.creditDefaultSwapTrades };
  if (stateB.creditDefaultSwapTrades) {
    for (const [key, tradeB] of Object.entries(stateB.creditDefaultSwapTrades)) {
      const tradeA = creditDefaultSwapTrades[key];
      if (!tradeA || tradeB.timestamp > tradeA.timestamp) {
        creditDefaultSwapTrades[key] = tradeB;
      }
    }
  }

  const sovereignWealthFunds = { ...stateA.sovereignWealthFunds };
  if (stateB.sovereignWealthFunds) {
    for (const [key, valB] of Object.entries(stateB.sovereignWealthFunds)) {
      const valA = sovereignWealthFunds[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        sovereignWealthFunds[key] = valB;
      }
    }
  }

  const sovereignWealthFundProposals = { ...stateA.sovereignWealthFundProposals };
  if (stateB.sovereignWealthFundProposals) {
    for (const [key, valB] of Object.entries(stateB.sovereignWealthFundProposals)) {
      const valA = sovereignWealthFundProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        sovereignWealthFundProposals[key] = valB;
      }
    }
  }

  const jointVenturePortfolios = { ...stateA.jointVenturePortfolios };
  if (stateB.jointVenturePortfolios) {
    for (const [key, valB] of Object.entries(stateB.jointVenturePortfolios)) {
      const valA = jointVenturePortfolios[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        jointVenturePortfolios[key] = valB;
      }
    }
  }

  const jointVentureInvestmentProposals = { ...stateA.jointVentureInvestmentProposals };
  if (stateB.jointVentureInvestmentProposals) {
    for (const [key, valB] of Object.entries(stateB.jointVentureInvestmentProposals)) {
      const valA = jointVentureInvestmentProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        jointVentureInvestmentProposals[key] = valB;
      }
    }
  }

  const jointVenturePortfolioSwapProposals = { ...stateA.jointVenturePortfolioSwapProposals };
  if (stateB.jointVenturePortfolioSwapProposals) {
    for (const [key, valB] of Object.entries(stateB.jointVenturePortfolioSwapProposals)) {
      const valA = jointVenturePortfolioSwapProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        jointVenturePortfolioSwapProposals[key] = valB;
      }
    }
  }

  const jointVentureAssetLiquidationProposals = { ...stateA.jointVentureAssetLiquidationProposals };
  if (stateB.jointVentureAssetLiquidationProposals) {
    for (const [key, valB] of Object.entries(stateB.jointVentureAssetLiquidationProposals)) {
      const valA = jointVentureAssetLiquidationProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        jointVentureAssetLiquidationProposals[key] = valB;
      }
    }
  }

  const swfYieldTokens = { ...stateA.swfYieldTokens };
  if (stateB.swfYieldTokens) {
    for (const [key, valB] of Object.entries(stateB.swfYieldTokens)) {
      const valA = swfYieldTokens[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfYieldTokens[key] = valB;
      }
    }
  }

  const swfYieldTokenProposals = { ...stateA.swfYieldTokenProposals };
  if (stateB.swfYieldTokenProposals) {
    for (const [key, valB] of Object.entries(stateB.swfYieldTokenProposals)) {
      const valA = swfYieldTokenProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfYieldTokenProposals[key] = valB;
      }
    }
  }

  const swfRiskPools = { ...stateA.swfRiskPools };
  if (stateB.swfRiskPools) {
    for (const [key, valB] of Object.entries(stateB.swfRiskPools)) {
      const valA = swfRiskPools[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfRiskPools[key] = valB;
      }
    }
  }

  const swfRiskPoolProposals = { ...stateA.swfRiskPoolProposals };
  if (stateB.swfRiskPoolProposals) {
    for (const [key, valB] of Object.entries(stateB.swfRiskPoolProposals)) {
      const valA = swfRiskPoolProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfRiskPoolProposals[key] = valB;
      }
    }
  }

  const swfYieldCDOs = { ...stateA.swfYieldCDOs };
  if (stateB.swfYieldCDOs) {
    for (const [key, valB] of Object.entries(stateB.swfYieldCDOs)) {
      const valA = swfYieldCDOs[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfYieldCDOs[key] = valB;
      }
    }
  }

  const swfYieldCDOProposals = { ...stateA.swfYieldCDOProposals };
  if (stateB.swfYieldCDOProposals) {
    for (const [key, valB] of Object.entries(stateB.swfYieldCDOProposals)) {
      const valA = swfYieldCDOProposals[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfYieldCDOProposals[key] = valB;
      }
    }
  }

  const swfReinsuranceOptionOrderBookDepths = { ...stateA.swfReinsuranceOptionOrderBookDepths };
  if (stateB.swfReinsuranceOptionOrderBookDepths) {
    for (const [key, valB] of Object.entries(stateB.swfReinsuranceOptionOrderBookDepths)) {
      const valA = swfReinsuranceOptionOrderBookDepths[key];
      if (!valA) {
        swfReinsuranceOptionOrderBookDepths[key] = valB;
      } else {
        swfReinsuranceOptionOrderBookDepths[key] = {
          ...valA,
          ...valB,
          bidAskSpread: valB.bidAskSpread < valA.bidAskSpread ? valB.bidAskSpread : valA.bidAskSpread,
        };
      }
    }
  }

  const swfReinsuranceOptionCrossMeshArbitrageRoutes = { ...stateA.swfReinsuranceOptionCrossMeshArbitrageRoutes };
  if (stateB.swfReinsuranceOptionCrossMeshArbitrageRoutes) {
    for (const [key, valB] of Object.entries(stateB.swfReinsuranceOptionCrossMeshArbitrageRoutes)) {
      const valA = swfReinsuranceOptionCrossMeshArbitrageRoutes[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfReinsuranceOptionCrossMeshArbitrageRoutes[key] = valB;
      }
    }
  }

  const swfReinsuranceOptionCrossSyndicatePools = { ...stateA.swfReinsuranceOptionCrossSyndicatePools };
  if (stateB.swfReinsuranceOptionCrossSyndicatePools) {
    for (const [key, valB] of Object.entries(stateB.swfReinsuranceOptionCrossSyndicatePools)) {
      const valA = swfReinsuranceOptionCrossSyndicatePools[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfReinsuranceOptionCrossSyndicatePools[key] = valB;
      }
    }
  }

  const swfReinsuranceOptionPeerLendingRequests = { ...stateA.swfReinsuranceOptionPeerLendingRequests };
  if (stateB.swfReinsuranceOptionPeerLendingRequests) {
    for (const [key, valB] of Object.entries(stateB.swfReinsuranceOptionPeerLendingRequests)) {
      const valA = swfReinsuranceOptionPeerLendingRequests[key];
      if (!valA || valB.timestamp > valA.timestamp) {
        swfReinsuranceOptionPeerLendingRequests[key] = valB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityPoolRebalancingPolicies using LWW
  const swfReinsuranceOptionVolatilityPoolRebalancingPolicies = { ...stateA.swfReinsuranceOptionVolatilityPoolRebalancingPolicies };
  if (stateB.swfReinsuranceOptionVolatilityPoolRebalancingPolicies) {
    for (const [key, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityPoolRebalancingPolicies)) {
      const entryA = swfReinsuranceOptionVolatilityPoolRebalancingPolicies[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityPoolRebalancingPolicies[key] = entryB;
      }
    }
  }

  // Merge adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes using LWW
  const adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes = { ...stateA.adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes };
  if (stateB.adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes)) {
      if (!adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId]) {
        adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId] = { ...bVotes };
      } else {
        adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId] = { ...adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityPoolUnderwritingPolicies using LWW
  const swfReinsuranceOptionVolatilityPoolUnderwritingPolicies = { ...stateA.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies };
  if (stateB.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies) {
    for (const [key, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies)) {
      const entryA = swfReinsuranceOptionVolatilityPoolUnderwritingPolicies[key];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityPoolUnderwritingPolicies[key] = entryB;
      }
    }
  }

  // Merge adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes using LWW
  const adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes = { ...stateA.adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes };
  if (stateB.adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes) {
    for (const [syndicateId, bVotes] of Object.entries(stateB.adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes)) {
      if (!adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId]) {
        adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId] = { ...bVotes };
      } else {
        adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId] = { ...adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId] };
        for (const [agentId, voteB] of Object.entries(bVotes)) {
          const voteA = adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId][agentId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes[syndicateId][agentId] = voteB;
          }
        }
      }
    }
  }

  // Merge swfReinsuranceOptionPenaltyWaiverProposals using LWW
  const swfReinsuranceOptionPenaltyWaiverProposals = { ...stateA.swfReinsuranceOptionPenaltyWaiverProposals };
  if (stateB.swfReinsuranceOptionPenaltyWaiverProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionPenaltyWaiverProposals)) {
      const entryA = swfReinsuranceOptionPenaltyWaiverProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionPenaltyWaiverProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionPenaltyWaiverVotes using LWW
  const swfReinsuranceOptionPenaltyWaiverVotes = { ...stateA.swfReinsuranceOptionPenaltyWaiverVotes };
  if (stateB.swfReinsuranceOptionPenaltyWaiverVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionPenaltyWaiverVotes)) {
      if (!swfReinsuranceOptionPenaltyWaiverVotes[proposalId]) {
        swfReinsuranceOptionPenaltyWaiverVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionPenaltyWaiverVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionPenaltyWaiverVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionPenaltyRefundProposals using LWW
  const swfReinsuranceOptionPenaltyRefundProposals = { ...stateA.swfReinsuranceOptionPenaltyRefundProposals };
  if (stateB.swfReinsuranceOptionPenaltyRefundProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionPenaltyRefundProposals)) {
      const entryA = swfReinsuranceOptionPenaltyRefundProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionPenaltyRefundProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionPenaltyRefundVotes using LWW
  const swfReinsuranceOptionPenaltyRefundVotes = { ...stateA.swfReinsuranceOptionPenaltyRefundVotes };
  if (stateB.swfReinsuranceOptionPenaltyRefundVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionPenaltyRefundVotes)) {
      if (!swfReinsuranceOptionPenaltyRefundVotes[proposalId]) {
        swfReinsuranceOptionPenaltyRefundVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionPenaltyRefundVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionPenaltyRefundVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionSpreadAdjustmentProposals using LWW
  const swfReinsuranceOptionSpreadAdjustmentProposals = { ...stateA.swfReinsuranceOptionSpreadAdjustmentProposals };
  if (stateB.swfReinsuranceOptionSpreadAdjustmentProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionSpreadAdjustmentProposals)) {
      const entryA = swfReinsuranceOptionSpreadAdjustmentProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionSpreadAdjustmentProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionSpreadAdjustmentVotes using LWW
  const swfReinsuranceOptionSpreadAdjustmentVotes = { ...stateA.swfReinsuranceOptionSpreadAdjustmentVotes };
  if (stateB.swfReinsuranceOptionSpreadAdjustmentVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionSpreadAdjustmentVotes)) {
      if (!swfReinsuranceOptionSpreadAdjustmentVotes[proposalId]) {
        swfReinsuranceOptionSpreadAdjustmentVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionSpreadAdjustmentVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionSpreadAdjustmentVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorProposals using LWW
  const swfReinsuranceOptionVolatilityFloorProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorVotes using LWW
  const swfReinsuranceOptionVolatilityFloorVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorAutoAdjustProposals using LWW
  const swfReinsuranceOptionVolatilityFloorAutoAdjustProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorAutoAdjustProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorAutoAdjustProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorAutoAdjustVotes using LWW
  const swfReinsuranceOptionVolatilityFloorAutoAdjustVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorAutoAdjustVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorAutoAdjustVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorAutoAdjustVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorAutoAdjustVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorAutoAdjustVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideProposals using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideVotes using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes using LWW
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals using LWW (AF-198)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes using LWW (AF-198)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals using LWW (AF-199)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes using LWW (AF-199)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals using LWW (AF-200)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes using LWW (AF-200)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals using LWW (AF-201)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes using LWW (AF-201)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals using LWW (AF-202)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes using LWW (AF-202)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes[proposalId] = aInner;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals using LWW (AF-203)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals)) {
      const entryA = swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes using LWW (AF-203)
  const swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes = { ...stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes };
  if (stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes) {
    for (const [proposalId, bInner] of Object.entries(stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes)) {
      if (!swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes[proposalId]) {
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes[proposalId] = { ...bInner };
      } else {
        const aInner = { ...swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes[proposalId] };
        for (const [voterId, voteB] of Object.entries(bInner)) {
          const voteA = aInner[voterId];
          if (!voteA || voteB.timestamp > voteA.timestamp) {
            aInner[voterId] = voteB;
          }
        }
        swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes[proposalId] = aInner;
      }
    }
  }

  // Merge breachSlashingRates using Max rate value (AF-203)
  const breachSlashingRates = { ...stateA.breachSlashingRates };
  if (stateB.breachSlashingRates) {
    for (const [syndId, rate] of Object.entries(stateB.breachSlashingRates)) {
      breachSlashingRates[syndId] = Math.max(breachSlashingRates[syndId] ?? 0, rate);
    }
  }

  // Merge reinvestmentBreachCount using Max (AF-203)
  const reinvestmentBreachCount = { ...stateA.reinvestmentBreachCount };
  if (stateB.reinvestmentBreachCount) {
    for (const [syndId, count] of Object.entries(stateB.reinvestmentBreachCount)) {
      reinvestmentBreachCount[syndId] = Math.max(reinvestmentBreachCount[syndId] ?? 0, count);
    }
  }

  // Merge slashedCDOTrancheShares using Max (AF-204)
  const slashedCDOTrancheShares = { ...stateA.slashedCDOTrancheShares };
  if (stateB.slashedCDOTrancheShares) {
    for (const [syndId, cdoRecordB] of Object.entries(stateB.slashedCDOTrancheShares)) {
      if (!slashedCDOTrancheShares[syndId]) {
        slashedCDOTrancheShares[syndId] = {};
      }
      slashedCDOTrancheShares[syndId] = { ...slashedCDOTrancheShares[syndId] };
      for (const [cdoId, trancheRecordB] of Object.entries(cdoRecordB)) {
        if (!slashedCDOTrancheShares[syndId][cdoId]) {
          slashedCDOTrancheShares[syndId][cdoId] = {};
        }
        slashedCDOTrancheShares[syndId][cdoId] = { ...slashedCDOTrancheShares[syndId][cdoId] };
        for (const [trancheId, countB] of Object.entries(trancheRecordB)) {
          const countA = slashedCDOTrancheShares[syndId][cdoId][trancheId] ?? 0;
          slashedCDOTrancheShares[syndId][cdoId][trancheId] = Math.max(countA, countB);
        }
      }
    }
  }

  // Merge swfStabilityPool using Max (AF-204)
  const swfStabilityPool = Math.max(stateA.swfStabilityPool ?? 0, stateB.swfStabilityPool ?? 0);

  // Merge swfStakingSweepPool using Max (AF-206)
  const swfStakingSweepPool = Math.max(stateA.swfStakingSweepPool ?? 0, stateB.swfStakingSweepPool ?? 0);

  // Merge swfSecurityInsurancePool and authorized flags using Max and OR (AF-219)
  const swfSecurityInsurancePool = Math.max(stateA.swfSecurityInsurancePool ?? 0, stateB.swfSecurityInsurancePool ?? 0);
  const swfSecurityInsurancePoolAuthorized = stateA.swfSecurityInsurancePoolAuthorized || stateB.swfSecurityInsurancePoolAuthorized;
  const swfSecurityInsurancePoolAllocationPercent = Math.max(stateA.swfSecurityInsurancePoolAllocationPercent ?? 0, stateB.swfSecurityInsurancePoolAllocationPercent ?? 0);
  const swfSecurityInsurancePoolCap = Math.max(stateA.swfSecurityInsurancePoolCap ?? 0, stateB.swfSecurityInsurancePoolCap ?? 0);
  const swfSecurityInsurancePoolEmergencyDrawdownAuthorized = stateA.swfSecurityInsurancePoolEmergencyDrawdownAuthorized || stateB.swfSecurityInsurancePoolEmergencyDrawdownAuthorized;

  // Merge swfSecurityInsurancePoolProposals using LWW (AF-219)
  const swfSecurityInsurancePoolProposals = { ...stateA.swfSecurityInsurancePoolProposals };
  if (stateB.swfSecurityInsurancePoolProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfSecurityInsurancePoolProposals)) {
      const entryA = swfSecurityInsurancePoolProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfSecurityInsurancePoolProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfSecurityInsurancePoolEmergencyDrawdownProposals using LWW (AF-219)
  const swfSecurityInsurancePoolEmergencyDrawdownProposals = { ...stateA.swfSecurityInsurancePoolEmergencyDrawdownProposals };
  if (stateB.swfSecurityInsurancePoolEmergencyDrawdownProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfSecurityInsurancePoolEmergencyDrawdownProposals)) {
      const entryA = swfSecurityInsurancePoolEmergencyDrawdownProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfSecurityInsurancePoolEmergencyDrawdownProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfDeflectionSurchargePolicyProposals using LWW (AF-221)
  const swfDeflectionSurchargePolicyProposals = { ...stateA.swfDeflectionSurchargePolicyProposals };
  if (stateB.swfDeflectionSurchargePolicyProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfDeflectionSurchargePolicyProposals)) {
      const entryA = swfDeflectionSurchargePolicyProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfDeflectionSurchargePolicyProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfDeflectionCapAndRefundProposals using LWW (AF-222)
  const swfDeflectionCapAndRefundProposals = { ...stateA.swfDeflectionCapAndRefundProposals };
  if (stateB.swfDeflectionCapAndRefundProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfDeflectionCapAndRefundProposals)) {
      const entryA = swfDeflectionCapAndRefundProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfDeflectionCapAndRefundProposals[proposalId] = entryB;
      }
    }
  }

  // Merge swfAllianceLiquiditySubsidyProposals using LWW (AF-223)
  const swfAllianceLiquiditySubsidyProposals = { ...stateA.swfAllianceLiquiditySubsidyProposals };
  if (stateB.swfAllianceLiquiditySubsidyProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.swfAllianceLiquiditySubsidyProposals)) {
      const entryA = swfAllianceLiquiditySubsidyProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        swfAllianceLiquiditySubsidyProposals[proposalId] = entryB;
      }
    }
  }



  // Merge sweepPoolRankAdjustFeeCalibrationProposals using LWW (AF-209)
  const sweepPoolRankAdjustFeeCalibrationProposals = { ...stateA.sweepPoolRankAdjustFeeCalibrationProposals };
  if (stateB.sweepPoolRankAdjustFeeCalibrationProposals) {
    for (const [proposalId, entryB] of Object.entries(stateB.sweepPoolRankAdjustFeeCalibrationProposals)) {
      const entryA = sweepPoolRankAdjustFeeCalibrationProposals[proposalId];
      if (!entryA || entryB.timestamp > entryA.timestamp) {
        sweepPoolRankAdjustFeeCalibrationProposals[proposalId] = entryB;
      }
    }
  }

  // Merge auditLogs
  const auditLogs = [...(stateA.auditLogs || [])];
  if (stateB.auditLogs) {
    for (const log of stateB.auditLogs) {
      if (!auditLogs.includes(log)) {
        auditLogs.push(log);
      }
    }
  }

  // Merge swfReinsuranceOptionPremiumContributions using LWW
  const swfReinsuranceOptionPremiumContributions = { ...stateA.swfReinsuranceOptionPremiumContributions };
  if (stateB.swfReinsuranceOptionPremiumContributions) {
    for (const [syndicateId, valB] of Object.entries(stateB.swfReinsuranceOptionPremiumContributions)) {
      const valA = swfReinsuranceOptionPremiumContributions[syndicateId];
      if (valA === undefined || valB > valA) {
        swfReinsuranceOptionPremiumContributions[syndicateId] = valB;
      }
    }
  }

  // Merge sovereignDebtDefaultAlerts using LWW (Last-Write-Wins)
  const sovereignDebtDefaultAlerts = { ...stateA.sovereignDebtDefaultAlerts };
  if (stateB.sovereignDebtDefaultAlerts) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtDefaultAlerts)) {
      const propA = sovereignDebtDefaultAlerts[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        sovereignDebtDefaultAlerts[propId] = propB;
      }
    }
  }

  // Merge sovereignDebtResolveAlerts using LWW (Last-Write-Wins)
  const sovereignDebtResolveAlerts = { ...stateA.sovereignDebtResolveAlerts };
  if (stateB.sovereignDebtResolveAlerts) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtResolveAlerts)) {
      const propA = sovereignDebtResolveAlerts[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        sovereignDebtResolveAlerts[propId] = propB;
      }
    }
  }

  // Merge sovereignDebtDefaultGracePeriods using LWW
  const sovereignDebtDefaultGracePeriods = { ...stateA.sovereignDebtDefaultGracePeriods };
  if (stateB.sovereignDebtDefaultGracePeriods) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtDefaultGracePeriods)) {
      const propA = sovereignDebtDefaultGracePeriods[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        sovereignDebtDefaultGracePeriods[propId] = propB;
      }
    }
  }

  // Merge sovereignDebtDefaultPenaltyWaivers using LWW
  const sovereignDebtDefaultPenaltyWaivers = { ...stateA.sovereignDebtDefaultPenaltyWaivers };
  if (stateB.sovereignDebtDefaultPenaltyWaivers) {
    for (const [propId, propB] of Object.entries(stateB.sovereignDebtDefaultPenaltyWaivers)) {
      const propA = sovereignDebtDefaultPenaltyWaivers[propId];
      if (!propA || propB.timestamp > propA.timestamp) {
        sovereignDebtDefaultPenaltyWaivers[propId] = propB;
      }
    }
  }

  // Merge sovereignDebtCDSContracts using LWW
  const sovereignDebtCDSContracts = { ...stateA.sovereignDebtCDSContracts };
  if (stateB.sovereignDebtCDSContracts) {
    for (const [cdsId, contractB] of Object.entries(stateB.sovereignDebtCDSContracts)) {
      const contractA = sovereignDebtCDSContracts[cdsId];
      if (!contractA || contractB.timestamp > contractA.timestamp) {
        sovereignDebtCDSContracts[cdsId] = contractB;
      }
    }
  }

  // Merge sovereignDebtCDSPortfolios using LWW/Union
  const sovereignDebtCDSPortfolios = { ...stateA.sovereignDebtCDSPortfolios };
  if (stateB.sovereignDebtCDSPortfolios) {
    for (const [syndicateId, portB] of Object.entries(stateB.sovereignDebtCDSPortfolios)) {
      const portA = sovereignDebtCDSPortfolios[syndicateId];
      if (!portA) {
        sovereignDebtCDSPortfolios[syndicateId] = portB;
      } else {
        sovereignDebtCDSPortfolios[syndicateId] = {
          syndicateId,
          purchasedCDSIds: Array.from(new Set([...portA.purchasedCDSIds, ...portB.purchasedCDSIds])),
          writtenCDSIds: Array.from(new Set([...portA.writtenCDSIds, ...portB.writtenCDSIds])),
        };
      }
    }
  }

  // Merge cdsListings using LWW
  const cdsListings = { ...stateA.cdsListings };
  if (stateB.cdsListings) {
    for (const [id, valB] of Object.entries(stateB.cdsListings)) {
      const valA = cdsListings[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsListings[id] = valB;
      }
    }
  }

  // Merge cdsBids using LWW
  const cdsBids = { ...stateA.cdsBids };
  if (stateB.cdsBids) {
    for (const [id, valB] of Object.entries(stateB.cdsBids)) {
      const valA = cdsBids[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsBids[id] = valB;
      }
    }
  }

  // Merge cdsTransfers using LWW
  const cdsTransfers = { ...stateA.cdsTransfers };
  if (stateB.cdsTransfers) {
    for (const [id, valB] of Object.entries(stateB.cdsTransfers)) {
      const valA = cdsTransfers[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsTransfers[id] = valB;
      }
    }
  }

  // Merge cdsMarketSpreads using LWW
  const cdsMarketSpreads = { ...stateA.cdsMarketSpreads };
  if (stateB.cdsMarketSpreads) {
    for (const [id, valB] of Object.entries(stateB.cdsMarketSpreads)) {
      const valA = cdsMarketSpreads[id];
      if (!valA || (valB as any).timestamp > (valA as any).timestamp) {
        cdsMarketSpreads[id] = valB;
      }
    }
  }

  // Merge sovereignDebtCDSCDOPools using LWW
  const sovereignDebtCDSCDOPools = { ...stateA.sovereignDebtCDSCDOPools };
  if (stateB.sovereignDebtCDSCDOPools) {
    for (const [id, valB] of Object.entries(stateB.sovereignDebtCDSCDOPools)) {
      const valA = sovereignDebtCDSCDOPools[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        sovereignDebtCDSCDOPools[id] = valB;
      }
    }
  }

  // Merge cdsCdoTrancheListings using LWW
  const cdsCdoTrancheListings = { ...stateA.cdsCdoTrancheListings };
  if (stateB.cdsCdoTrancheListings) {
    for (const [id, valB] of Object.entries(stateB.cdsCdoTrancheListings)) {
      const valA = cdsCdoTrancheListings[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsCdoTrancheListings[id] = valB;
      }
    }
  }

  // Merge cdsCdoTrancheBids using LWW
  const cdsCdoTrancheBids = { ...stateA.cdsCdoTrancheBids };
  if (stateB.cdsCdoTrancheBids) {
    for (const [id, valB] of Object.entries(stateB.cdsCdoTrancheBids)) {
      const valA = cdsCdoTrancheBids[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsCdoTrancheBids[id] = valB;
      }
    }
  }

  // Merge cdsCdoTrancheMarketSpreads using LWW
  const cdsCdoTrancheMarketSpreads = { ...stateA.cdsCdoTrancheMarketSpreads };
  if (stateB.cdsCdoTrancheMarketSpreads) {
    for (const [id, valB] of Object.entries(stateB.cdsCdoTrancheMarketSpreads)) {
      const valA = cdsCdoTrancheMarketSpreads[id];
      if (!valA || (valB as any).timestamp > (valA as any).timestamp) {
        cdsCdoTrancheMarketSpreads[id] = valB;
      }
    }
  }

  // Merge cdsCdoTrancheMarginAdjustments using LWW
  const cdsCdoTrancheMarginAdjustments = { ...stateA.cdsCdoTrancheMarginAdjustments };
  if (stateB.cdsCdoTrancheMarginAdjustments) {
    for (const [id, valB] of Object.entries(stateB.cdsCdoTrancheMarginAdjustments)) {
      const valA = cdsCdoTrancheMarginAdjustments[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsCdoTrancheMarginAdjustments[id] = valB;
      }
    }
  }

  // Merge cdsCdoAutocallTriggers using LWW
  const cdsCdoAutocallTriggers = { ...stateA.cdsCdoAutocallTriggers };
  if (stateB.cdsCdoAutocallTriggers) {
    for (const [id, valB] of Object.entries(stateB.cdsCdoAutocallTriggers)) {
      const valA = cdsCdoAutocallTriggers[id];
      if (!valA || valB.timestamp > valA.timestamp) {
        cdsCdoAutocallTriggers[id] = valB;
      }
    }
  }

  return {
    ...stateA,
    visited,
    sovereignDebtDefaultAlerts,
    sovereignDebtResolveAlerts,
    sovereignDebtDefaultGracePeriods,
    sovereignDebtDefaultPenaltyWaivers,
    sovereignDebtCDSContracts,
    sovereignDebtCDSPortfolios,
    sovereignDebtCDSCDOPools,
    cdsListings,
    cdsBids,
    cdsTransfers,
    cdsMarketSpreads,
    cdsCdoTrancheListings,
    cdsCdoTrancheBids,
    cdsCdoTrancheMarketSpreads,
    cdsCdoTrancheMarginAdjustments,
    cdsCdoAutocallTriggers,
    swfReinsuranceOptionOrderBookDepths,
    swfReinsuranceOptionPenaltyWaiverProposals,
    swfReinsuranceOptionPenaltyWaiverVotes,
    swfReinsuranceOptionPenaltyRefundProposals,
    swfReinsuranceOptionPenaltyRefundVotes,
    swfReinsuranceOptionSpreadAdjustmentProposals,
    swfReinsuranceOptionSpreadAdjustmentVotes,
    swfReinsuranceOptionVolatilityFloorProposals,
    swfReinsuranceOptionVolatilityFloorVotes,
    swfReinsuranceOptionVolatilityFloorAutoAdjustProposals,
    swfReinsuranceOptionVolatilityFloorAutoAdjustVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentVotes,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee: Math.max(stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee ?? 500, stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee ?? 500),
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee: Math.max(stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee ?? 100, stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee ?? 100),
    maxAutoReinvestYieldCap: stateA.maxAutoReinvestYieldCap !== undefined && stateB.maxAutoReinvestYieldCap !== undefined ? Math.max(stateA.maxAutoReinvestYieldCap, stateB.maxAutoReinvestYieldCap) : (stateA.maxAutoReinvestYieldCap ?? stateB.maxAutoReinvestYieldCap),
    auditLogs,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapVotes,
    reinvestmentBreachCount,
    breachSlashingRates,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingProposals,
    swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCapBreachSlashingVotes,
    reinvestmentBreachRehabProposals,
    cooperativeRehabSubsidyProposals,
    slashedCDOTrancheShares,
    swfStabilityPool,
    cooperativeStakingYieldSweepProposals,
    swfStakingSweepPool,
    swfSecurityInsurancePool,
    swfSecurityInsurancePoolAuthorized,
    swfSecurityInsurancePoolAllocationPercent,
    swfSecurityInsurancePoolCap,
    swfSecurityInsurancePoolProposals,
    swfSecurityInsurancePoolEmergencyDrawdownAuthorized,
    swfSecurityInsurancePoolEmergencyDrawdownProposals,
    swfDeflectionSurchargeBaseRate: stateA.swfDeflectionSurchargeBaseRate !== undefined && stateB.swfDeflectionSurchargeBaseRate !== undefined ? (stateA.swfDeflectionSurchargeBaseRate > stateB.swfDeflectionSurchargeBaseRate ? stateA.swfDeflectionSurchargeBaseRate : stateB.swfDeflectionSurchargeBaseRate) : (stateA.swfDeflectionSurchargeBaseRate ?? stateB.swfDeflectionSurchargeBaseRate ?? 0.05),
    swfDeflectionSurchargePoolDepthScalingFactor: stateA.swfDeflectionSurchargePoolDepthScalingFactor !== undefined && stateB.swfDeflectionSurchargePoolDepthScalingFactor !== undefined ? (stateA.swfDeflectionSurchargePoolDepthScalingFactor > stateB.swfDeflectionSurchargePoolDepthScalingFactor ? stateA.swfDeflectionSurchargePoolDepthScalingFactor : stateB.swfDeflectionSurchargePoolDepthScalingFactor) : (stateA.swfDeflectionSurchargePoolDepthScalingFactor ?? stateB.swfDeflectionSurchargePoolDepthScalingFactor ?? 1.0),
    swfDeflectionSurchargePolicyProposals,
    swfDeflectionSurchargeCap: stateA.swfDeflectionSurchargeCap !== undefined && stateB.swfDeflectionSurchargeCap !== undefined ? (stateA.swfDeflectionSurchargeCap < stateB.swfDeflectionSurchargeCap ? stateA.swfDeflectionSurchargeCap : stateB.swfDeflectionSurchargeCap) : (stateA.swfDeflectionSurchargeCap ?? stateB.swfDeflectionSurchargeCap ?? 1.0),
    swfDeflectionSurchargeEmergencyRefundAllocationPercent: stateA.swfDeflectionSurchargeEmergencyRefundAllocationPercent !== undefined && stateB.swfDeflectionSurchargeEmergencyRefundAllocationPercent !== undefined ? (stateA.swfDeflectionSurchargeEmergencyRefundAllocationPercent > stateB.swfDeflectionSurchargeEmergencyRefundAllocationPercent ? stateA.swfDeflectionSurchargeEmergencyRefundAllocationPercent : stateB.swfDeflectionSurchargeEmergencyRefundAllocationPercent) : (stateA.swfDeflectionSurchargeEmergencyRefundAllocationPercent ?? stateB.swfDeflectionSurchargeEmergencyRefundAllocationPercent ?? 0),
    swfDeflectionCapAndRefundProposals,
    swfAllianceLiquiditySubsidyRate: stateA.swfAllianceLiquiditySubsidyRate !== undefined && stateB.swfAllianceLiquiditySubsidyRate !== undefined ? (stateA.swfAllianceLiquiditySubsidyRate > stateB.swfAllianceLiquiditySubsidyRate ? stateA.swfAllianceLiquiditySubsidyRate : stateB.swfAllianceLiquiditySubsidyRate) : (stateA.swfAllianceLiquiditySubsidyRate ?? stateB.swfAllianceLiquiditySubsidyRate ?? 0),
    swfAllianceLiquiditySubsidyMinWealth: stateA.swfAllianceLiquiditySubsidyMinWealth !== undefined && stateB.swfAllianceLiquiditySubsidyMinWealth !== undefined ? (stateA.swfAllianceLiquiditySubsidyMinWealth > stateB.swfAllianceLiquiditySubsidyMinWealth ? stateA.swfAllianceLiquiditySubsidyMinWealth : stateB.swfAllianceLiquiditySubsidyMinWealth) : (stateA.swfAllianceLiquiditySubsidyMinWealth ?? stateB.swfAllianceLiquiditySubsidyMinWealth ?? 0),
    swfAllianceLiquiditySubsidyProposals,
    sweepPoolRankAdjustBaseProposalFee: Math.max(stateA.sweepPoolRankAdjustBaseProposalFee ?? 200, stateB.sweepPoolRankAdjustBaseProposalFee ?? 200),
    sweepPoolRankAdjustBaseVoteFee: Math.max(stateA.sweepPoolRankAdjustBaseVoteFee ?? 50, stateB.sweepPoolRankAdjustBaseVoteFee ?? 50),
    sweepPoolRankAdjustFeeCalibrationProposals,


    swfReinsuranceOptionPremiumContributions,
    swfReinsuranceOptionCrossMeshArbitrageRoutes,

    swfReinsuranceOptionCrossSyndicatePools,
    swfReinsuranceOptionPeerLendingRequests,
    journal,
    blackOpsSafehouses,
    interceptorDecoys,
    contrabandTunnels,
    tunnelTolls,
    tunnelDrones,
    lootClaims,
    territoryClaims,
    territoryAssists,
    taxVotes,
    allianceVotes,
    tradeRoutes,
    tradeRouteVotes,
    merchantLicenses,
    merchantLicensings,
    tariffVotes,
    merchantInventories,
    merchantGold,
    merchantLastRestock,
    merchantLastUpdated,
    merchantGuilds,
    guildMemberships,
    guildVotes,
    collectiveBargainingAgreements,
    cartels,
    cartelMemberships,
    cartelVotes,
    contrabandBlacklist,
    blackMarketPayouts,
    bounties,
    enforcers,
    smugglingInsurance,
    bribes,
    syndicates,
    productionLabs,
    safehouses,
    blackMarkets,
    syndicateTurfClaims,
    enforcementHeat,
    protectionRackets,
    syndicateBribes,
    deflectionPolicies,
    frontBusinesses,
    turfGuards,
    turfCheckpoints,
    turfGuardOutposts,
    syndicateBribeVotes,
    syndicateWaiverVotes,
    syndicateTaxVotes,
    smugglingConvoys,
    undercoverAgents,
    informants,
    raidWarnings,
    espionageNetworks,
    wiretaps,
    cartelGlobalTaxVotes,
    cartelGlobalTaxPolicy,
    smugglerGuilds,
    smugglerGuildMemberships,
    smugglerGuildCbaVotes,
    smugglerGuildCbas,
    syndicateAllianceVotes,
    covertCells,
    propagandaCampaigns,
    saboteurs,
    eliteEnforcers,
    legendaryHitmen,
    decoyConvoys,
    tradeExchangeRates,
    auditMitigations,
    safehouseRentVotes,
    safehouseRentPolicies,
    stashItemOwners,
    syndicateBanks,
    bankInterestVotes,
    bankInterestPolicies,
    depositInsurance,
    creditRatings,
    defaultAlerts,
    loanRefinancingVotes,
    individualLoanCollateralSwapVotes,
    creditRecoveries,
    debtSettlementVotes,
    jointLoanProposals,
    jointLoans,
    jointLoanRefinancingVotes,
    jointLoanCollateralSubstitutionVotes,
    jointLoanDebtSettlementVotes,
    jointLoanCollateralSwapVotes,
    jointLoanGracePeriodVotes,
    jointLoanPenaltyWaiverVotes,
    jointLoanUnderwrites,
    jointLoanUnderwriteVotes,
    groupDefaults,
    jointLoanInsurancePools,
    agentPremiumPolicies,
    reinsuranceContracts,
    reinsuranceVotes,
    reinsuranceTransferVotes,
    executedReinsuranceTransfers,
    contagionShields,
    contagionShieldVotes,
    reinsurancePricingMultipliers,
    interestSubsidies,
    interestSubsidyVotes,
    reinsuranceCollateralPledges,
    reinsuranceCollateralVotes,
    syndicateDefaults,
    reinsuranceRiskRatings,
    reinsuranceRiskRatingVotes,
    reinsuranceLiquidityAudits,
    reinsuranceLiquidityAuditVotes,
    secondaryReserves,
    reserveRatioVotes,
    automatedBailouts,
    secondaryReserveVaults,
    secondaryReserveInvestments,
    cdos,
    creditDefaultSwaps,
    creditDefaultSwapVotes,
    creditDefaultSwapTrades,
    swfYieldCDOCDSs,
    swfYieldCDOCDSVotes,
    swfYieldCDOCDSTrades,
    marginAccounts,
    marginRehypothecationVotes,
    marginRehypothecationRevokeVotes,
    marginRebalancingPolicyVotes,
    swfMarginRehypothecationVotes,
    swfMarginRehypothecationRevokeVotes,
    swfMarginRebalancingPolicyVotes,
    swfYieldArbitragePolicyVotes,
    swfStakingPolicyVotes,
    swfRebalancingAdvisorVotes,
    swfAdvisorSafetyThresholdVotes,
    swfLeverageTargetVotes,
    swfTrancheLeverageTargetVotes,
    swfFractionalReserveRatioVotes,
    claimSWFLiquidityRewardsVotes,
    lockedSWFCollateralVotes,
    factionSponsorProposals,
    factionSponsorPolicies,
    sponsorAuditProposals,
    sponsorRevocationProposals,
    rewardSlashingProposals,
    rehabCampaignProposals,
    rehabSubsidyProposals,
    factionLoyaltyBonds,
    claimLoyaltyRankProposals,
    factionLoyaltyRanks,
    factionCdoInsurancePools,
    cdoMiningBoosters,
    cooperativeYieldCampaignProposals,
    cooperativeSovereigntyBondProposals,
    secondaryBondListings,
    sovereignBondBorrowPositions,
    sovereignBondLendingPools,
    factionCdoInsurancePoolProposals,
    multiFactionCdoRiskRatings,
    multiFactionCdoRiskRatingProposals,
    sovereignDebtProposals,
    sovereignDebtRestructureProposals,
    factionBailoutProposals,
    factionReserveBonds,
    reserveSweepPolicies,
    reserveSweepVotes,
    reserveSweepContestVotes,
    maliciousActors,
    slashingRates,
    liquidityPoolAudits,
    antiDeficitStabilizationPolicies,
    antiDeficitStabilizationVotes,
    liquidityPoolAuditVotes,
    stabilizationTransferVotes,
    crossMeshBridgeProposals,
    crossMeshBridgeLoans,
    sovereignWealthFunds,
    sovereignWealthFundProposals,
    jointVenturePortfolios,
    jointVentureInvestmentProposals,
    jointVenturePortfolioSwapProposals,
    jointVentureAssetLiquidationProposals,
    swfYieldTokens,
    swfYieldTokenProposals,
    swfRiskPools,
    swfRiskPoolProposals,
    swfYieldCDOs,
    swfYieldCDOProposals,
    cooperativeSWFStakingCampaigns,
    cooperativeSWFStakingCampaignProposals,
    cooperativeSWFStakingCampaignJoinVotes,
    swfReinsuranceOptionVolatilityPoolRebalancingPolicies,
    adjustSWFReinsuranceOptionVolatilityPoolRebalancingVotes,
    swfReinsuranceOptionVolatilityPoolUnderwritingPolicies,
    adjustSWFReinsuranceOptionVolatilityPoolUnderwritingVotes,
  };
}

/**
 * Reconstructs a converged GameState by replaying a deterministically sorted list of transactions
 * starting from the original initial state parameters of the pack.
 */
export function reconstructState(
  seed: number,
  pack: any,
  transactions: Transaction[],
  allAgentIds: string[],
  initialCDOs?: any,
  initialSyndicates?: any,
  initialPools?: any
): GameState {
  // Deterministically sort the agents alphabetically to ensure identical hash generation across nodes
  const sortedAgentIds = Array.from(new Set(allAgentIds)).sort();

  let state = createInitialState({
    seed,
    start: pack.meta?.start || pack.start || "clearing",
    flagsInit: pack.meta?.flags_init || [],
    varsInit: pack.meta?.vars_init || {},
    agentsInit: sortedAgentIds.length > 0 ? sortedAgentIds : undefined,
    factionRepInit: getFactionRepInit(pack),
    territoryControlInit: getTerritoryControlInit(pack),
  });

  if (initialCDOs) {
    state.swfYieldCDOs = JSON.parse(JSON.stringify(initialCDOs));
  }
  if (initialSyndicates) {
    state.syndicates = JSON.parse(JSON.stringify(initialSyndicates));
  }
  if (initialPools) {
    state.swfReinsuranceOptionCrossSyndicatePools = JSON.parse(JSON.stringify(initialPools));
  }

  // Replay all transactions in order (omitting sequence/hash constraints to allow resolution)
  for (const tx of transactions) {
    if (tx.signature) {
      const pubKey = SecureCooperativeMesh.getPublicKey(tx.agentId);
      if (!verifyTransactionSignature(tx, pubKey)) {
        continue; // Skip invalid transaction
      }
    }

    const res = multiAgentStep(
      state,
      {
        agentId: tx.agentId,
        action: tx.action,
        signature: tx.signature,
      },
      pack
    );
    if (res.ok) {
      state = res.state;
    }
  }

  return state;
}

/**
 * Decoupled, local engine runtime node executing a vector clock and gossip sync protocol.
 */
export class GossipNode {
  public nodeId: string;
  public localState: GameState;
  public vectorClock: VectorClock;
  public pack: any;
  public peers: Map<string, GossipNode> = new Map();
  public peerClocks: Map<string, VectorClock> = new Map();
  public seed: number;
  public lastSentGossipCache: Map<string, { vectorClock: VectorClock; transactionIds: string[]; timestamp: number }> = new Map();
  public privateKey: string;
  public publicKey: string;
  public enforceSignatures = false;

  constructor(nodeId: string, pack: any, seed = 42) {
    this.nodeId = nodeId;
    this.pack = pack;
    this.seed = seed;
    this.privateKey = `privkey:${nodeId}`;
    this.publicKey = `pubkey:${nodeId}`;
    SecureCooperativeMesh.registerPublicKey(nodeId, this.publicKey);

    this.localState = createInitialState({
      seed,
      start: pack.meta?.start || pack.start || "clearing",
      flagsInit: pack.meta?.flags_init || [],
      varsInit: pack.meta?.vars_init || {},
      agentsInit: [nodeId],
      factionRepInit: getFactionRepInit(pack),
    });
    this.vectorClock = {
      [nodeId]: 0,
    };
    this.localState.vectorClock = { ...this.vectorClock };
  }

  /**
   * Checks if a gossip message is redundant based on the local cache.
   * If it is not redundant, updates the cache and returns false.
   * If it is redundant, returns true.
   */
  public isRedundantGossip(peerId: string, msg: GossipMessage, maxAgeMs = 5000): boolean {
    const cached = this.lastSentGossipCache.get(peerId);
    const currentTime = (this as any).network ? (this as any).network.currentTimeMs : Date.now();

    if (cached && (currentTime - cached.timestamp < maxAgeMs)) {
      const clockKeysMatch = Object.keys(msg.vectorClock).length === Object.keys(cached.vectorClock).length;
      let clockValuesMatch = true;
      if (clockKeysMatch) {
        for (const [k, v] of Object.entries(msg.vectorClock)) {
          if (cached.vectorClock[k] !== v) {
            clockValuesMatch = false;
            break;
          }
        }
      }

      const txs = msg.transactions && msg.transactions.length > 0
        ? msg.transactions
        : (msg.compressedDiff ? decompressStateDiff(msg.compressedDiff) : []);

      const newTxIds = txs.map(getTransactionId);
      const txIdsMatch = newTxIds.length === cached.transactionIds.length &&
        newTxIds.every((id, idx) => id === cached.transactionIds[idx]);

      if (clockKeysMatch && clockValuesMatch && txIdsMatch) {
        return true;
      }
    }

    const txs = msg.transactions && msg.transactions.length > 0
      ? msg.transactions
      : (msg.compressedDiff ? decompressStateDiff(msg.compressedDiff) : []);

    const txIds = txs.map(getTransactionId);
    this.lastSentGossipCache.set(peerId, {
      vectorClock: { ...msg.vectorClock },
      transactionIds: txIds,
      timestamp: currentTime,
    });
    return false;
  }

  /**
   * Connects this node to another peer in the decentralized network.
   */
  public connect(peer: GossipNode): void {
    this.peers.set(peer.nodeId, peer);
    peer.peers.set(this.nodeId, this);
  }

  /**
   * Disconnects this node from a peer (simulates network partition/disconnect).
   */
  public disconnect(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.peers.delete(peerId);
      peer.peers.delete(this.nodeId);
    }
  }

  /**
   * Executes an action locally on this engine instance.
   * Increments the node's local component of the vector clock on success.
   */
  public executeLocalAction(action: Action): StepResult {
    const res = multiAgentStep(
      this.localState,
      {
        agentId: this.nodeId,
        action,
        signingKey: this.privateKey,
      },
      this.pack
    );

    if (res.ok) {
      this.localState = res.state;
      this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] ?? 0) + 1;
      this.localState.vectorClock = { ...this.vectorClock };
    }
    return res;
  }

  /**
   * Generates a gossip message to send to a specific peer.
   * Based on the peer's known vector clock, sends only the missing delta transactions.
   */
  public generateGossipMessageFor(peerId: string): GossipMessage {
    const peerNode = this.peers.get(peerId);
    const peerClock = peerNode ? peerNode.vectorClock : (this.peerClocks.get(peerId) ?? {});

    const agentTxCounts: Record<string, number> = {};
    const deltaTransactions: Transaction[] = [];

    for (const tx of this.localState.transactionJournal || []) {
      const agentId = tx.agentId;
      const currentCount = agentTxCounts[agentId] ?? 0;
      agentTxCounts[agentId] = currentCount + 1;

      // If the peer's clock indicates they have processed fewer transactions for this agent
      // than the current transaction index, they are missing it.
      const peerSeq = peerClock[agentId] ?? 0;
      if (currentCount >= peerSeq) {
        deltaTransactions.push(tx);
      }
    }

    const minSeq = deltaTransactions.length > 0 
      ? Math.min(...deltaTransactions.map(tx => tx.sequenceNumber)) 
      : 0;

    const compressedDiff = compressStateDiff(deltaTransactions, minSeq);

    return {
      senderId: this.nodeId,
      vectorClock: { ...this.vectorClock },
      transactions: [], // Clear uncompressed payload to reduce network packets size
      compressedDiff,
    };
  }

  /**
   * Receives a gossip message from a peer.
   * Merges delta transactions, resolves conflicts, and reconstructs converged state.
   */
  public receiveGossip(message: GossipMessage): boolean {
    if (message.compressedDiff) {
      message.transactions = decompressStateDiff(message.compressedDiff);
    }

    // Verify signatures of all incoming transactions
    for (const tx of message.transactions) {
      if (tx.signature) {
        const pubKey = SecureCooperativeMesh.getPublicKey(tx.agentId);
        if (!verifyTransactionSignature(tx, pubKey)) {
          return false; // Reject gossip with invalid signature
        }
      } else if (this.enforceSignatures) {
        return false; // Reject gossip with missing signature when enforced
      }
    }

    // 1. Check if the message contains any updates or clock advancements we don't have
    const isBehind = isClockBehind(this.vectorClock, message.vectorClock);
    const hasNewTransactions = message.transactions.some(tx => {
      const id = getTransactionId(tx);
      const ourIds = (this.localState.transactionJournal || []).map(getTransactionId);
      return !ourIds.includes(id);
    });

    const knownAgents = Object.keys(this.localState.agents || {});
    const messageAgents = Object.keys(message.vectorClock);
    const hasNewAgents = messageAgents.some(agentId => !knownAgents.includes(agentId));

    if (!isBehind && !hasNewTransactions && !hasNewAgents) {
      return false; // No new information, abort gossip to avoid infinite storm
    }

    // 2. Merge vector clocks component-wise
    this.vectorClock = mergeVectorClocks(this.vectorClock, message.vectorClock);

    // 3. Merge transaction histories and sort deterministically
    const mergedTxs = mergeAndSortTransactions(
      this.localState.transactionJournal || [],
      message.transactions
    );

    // 4. Gather all unique agent/peer IDs known from transactions and vector clock
    const allAgentIds = Array.from(new Set([
      ...mergedTxs.map(tx => tx.agentId),
      ...Object.keys(this.vectorClock),
      this.nodeId
    ]));

    // 5. Reconstruct converged GameState from transactions and the full list of agents
    let convergedState = reconstructState(
      this.seed,
      this.pack,
      mergedTxs,
      allAgentIds,
      this.localState.swfYieldCDOs,
      this.localState.syndicates,
      this.localState.swfReinsuranceOptionCrossSyndicatePools
    );

    // Overwrite the transaction journal with the original canonical merged transactions to preserve timestamps/hashes
    convergedState.transactionJournal = mergedTxs;

    // 6. Merge independent monotonic fields (visited, journal) using CRDT rules
    convergedState = mergeMonotonicStateFields(convergedState, this.localState);

    // Reconcile loot claims to ensure chest contents and inventories align perfectly with merged claims
    convergedState = reconcileLootClaims(convergedState, this.pack);

    // Reconcile territory claims to ensure regional control aligns perfectly with merged claims
    convergedState = reconcileTerritories(convergedState, this.pack);

    // Reconcile tax policies to ensure consensual tax rates align perfectly across the mesh
    convergedState = reconcileTaxPolicies(convergedState, this.pack);

    // Reconcile alliances to ensure dynamic mutual alliances/dissolutions converge perfectly across the mesh
    convergedState = reconcileAlliances(convergedState, this.pack);
    convergedState = reconcileSyndicateAlliances(convergedState, this.pack);
    convergedState = reconcileFactionWars(convergedState, this.pack);

    // Reconcile trade routes to ensure consensual trade routes and taxes converge perfectly across the mesh
    convergedState = reconcileTradeRoutes(convergedState, this.pack);

    // Reconcile tariff policies to ensure consensual tariff rates align perfectly across the mesh
    convergedState = reconcileTariffPolicies(convergedState, this.pack);

    // Reconcile merchant guild policies to ensure consensual guild policies align perfectly across the mesh
    convergedState = reconcileGuildPolicies(convergedState, this.pack);

    // Reconcile merchant cartel policies to ensure consensual cartel policies align perfectly across the mesh
    convergedState = reconcileCartelPolicies(convergedState, this.pack);

    // Reconcile syndicate turf claims to ensure regional control aligns perfectly across the mesh
    convergedState = reconcileSyndicateTurf(convergedState, this.pack);

    // Reconcile syndicate taxes to ensure consensual tax rates align perfectly across the mesh
    convergedState = reconcileSyndicateTaxes(convergedState, this.pack);

    // Reconcile syndicate bribes to ensure consensual bribe costs align perfectly across the mesh
    convergedState = reconcileSyndicateBribes(convergedState, this.pack);

    // Reconcile syndicate waivers to ensure consensual waiver thresholds align perfectly across the mesh
    convergedState = reconcileSyndicateWaivers(convergedState, this.pack);

    // Reconcile espionage networks and wiretaps
    convergedState = reconcileEspionageNetworks(convergedState, this.pack);
    convergedState = reconcileWiretaps(convergedState, this.pack);
    convergedState = reconcileCartelGlobalTaxes(convergedState, this.pack);
    convergedState = reconcileSafehouseRentRates(convergedState, this.pack);
    convergedState = reconcileBankInterestRates(convergedState, this.pack);
    convergedState = reconcileSmugglerGuildCbas(convergedState, this.pack);
    convergedState = reconcileCovertCells(convergedState, this.pack);
    convergedState = reconcilePropagandaCampaigns(convergedState, this.pack);
    convergedState = reconcileJointLoanRefinancings(convergedState, this.pack);
    convergedState = reconcileJointLoanCollateralSubstitutions(convergedState, this.pack);
    convergedState = reconcileJointLoanDebtSettlements(convergedState, this.pack);
    convergedState = reconcileJointLoanCollateralSwaps(convergedState, this.pack);
    convergedState = reconcileJointLoanGracePeriods(convergedState, this.pack);
    convergedState = reconcileSWFStakingPolicies(convergedState, this.pack);
    convergedState = reconcileJointLoanPenaltyWaivers(convergedState, this.pack);
    convergedState = reconcileJointLoanUnderwrites(convergedState, this.pack);
    convergedState = reconcileCooperativeRehabSubsidy(convergedState, this.pack);
    convergedState = reconcileRehabCampaign(convergedState, this.pack);
    convergedState = reconcileClaimLoyaltyRanks(convergedState, this.pack);
    convergedState = reconcileAntiDeficitStabilizationPolicies(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionCrossMeshArbitrage(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionArbitrageFeeSurcharge(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionPeerLending(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityPoolRebalancing(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityPoolUnderwriting(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionPenaltyWaivers(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionPenaltyRefunds(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionSpreadAdjustments(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloors(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorAutoAdjusts(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrides(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraces(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidities(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjusts(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrations(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestments(convergedState, this.pack);
    convergedState = reconcileSWFReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityAdjustFeeCalibrationYieldProRataAutoReinvestmentGovernanceCaps(convergedState, this.pack);
    convergedState = reconcileSweepPoolRankAdjustFeeCalibrations(convergedState, this.pack);
    convergedState = reconcileSWFDeflectionSurchargePolicyProposals(convergedState, this.pack);
    convergedState = reconcileSWFDeflectionCapAndRefundProposals(convergedState, this.pack);
    convergedState = reconcileSWFAllianceLiquiditySubsidyProposals(convergedState, this.pack);
    convergedState = reconcileSWFAllianceYieldAutoRepayProposals(convergedState, this.pack);
    convergedState = reconcileSovereignDebtDefaultAlerts(convergedState, this.pack);
    convergedState = reconcileSovereignDebtResolveAlerts(convergedState, this.pack);
    convergedState = reconcileSovereignDebtDefaultGracePeriods(convergedState, this.pack);
    convergedState = reconcileSovereignDebtDefaultPenaltyWaivers(convergedState, this.pack);
    convergedState = reconcileSovereignDebtCDSContracts(convergedState, this.pack);
    convergedState = reconcileSovereignDebtCDSCDOTranches(convergedState, this.pack);


    // Detect territory control changes during gossip convergence
    const oldControl = this.localState.territoryControl || {};
    const newControl = convergedState.territoryControl || {};
    for (const [roomId, newFactionId] of Object.entries(newControl)) {
      const oldFactionId = oldControl[roomId];
      if (newFactionId !== oldFactionId) {
        const oldClaim = this.localState.territoryClaims?.[roomId];
        const newClaim = convergedState.territoryClaims?.[roomId];
        
        const oldAssistants = oldClaim?.assistants || [];
        const newAssistants = newClaim?.assistants || [];
        const isAllianceBattle = oldFactionId && (oldAssistants.length > 0 || newAssistants.length > 0);

        let formattedText = "";
        if (isAllianceBattle) {
          let template = "";
          if (this.pack && this.pack.network_templates) {
            template = this.pack.network_templates.alliance_battle || "";
          }
          if (!template) {
            template = "[ALLIANCE BATTLE] {roomId} has been captured by the allied forces of {newFaction}! (Defended by: {oldFaction})";
          }
          const oldFactionStr = oldFactionId || "none";
          const newAssistantsStr = newAssistants.length > 0 ? newAssistants.join(", ") : "none";
          const oldAssistantsStr = oldAssistants.length > 0 ? oldAssistants.join(", ") : "none";
          formattedText = template
            .replace(/{roomId}/g, roomId)
            .replace(/{newFaction}/g, newFactionId)
            .replace(/{oldFaction}/g, oldFactionStr)
            .replace(/{newAssistants}/g, newAssistantsStr)
            .replace(/{oldAssistants}/g, oldAssistantsStr);
        } else {
          let template = "";
          if (this.pack && this.pack.network_templates) {
            template = this.pack.network_templates.territory_conquest || "";
          }
          if (!template) {
            template = "Control of territory {roomId} has shifted from {oldFactionId} to {factionId}!";
          }
          const oldFactionStr = oldFactionId || "none";
          formattedText = template
            .replace(/{roomId}/g, roomId)
            .replace(/{factionId}/g, newFactionId)
            .replace(/{oldFactionId}/g, oldFactionStr)
            .replace(/{oldFaction}/g, oldFactionStr)
            .replace(/{newFaction}/g, newFactionId);
        }

        if (!convergedState.journal) {
          convergedState.journal = [];
        }
        if (!convergedState.journal.includes(formattedText)) {
          convergedState.journal.push(formattedText);
        }

        if (!convergedState.cooperativeSyncLog) {
          convergedState.cooperativeSyncLog = [];
        }
        if (!convergedState.cooperativeSyncLog.includes(formattedText)) {
          convergedState.cooperativeSyncLog.push(formattedText);
        }
      }
    }

    // 7. Recalculate transaction counts to update vector clocks self-healingly
    const agentCounts: Record<string, number> = {};
    for (const tx of mergedTxs) {
      if (tx.ok) {
        agentCounts[tx.agentId] = (agentCounts[tx.agentId] ?? 0) + 1;
      }
    }
    for (const [agentId, count] of Object.entries(agentCounts)) {
      this.vectorClock[agentId] = Math.max(this.vectorClock[agentId] ?? 0, count);
    }

    convergedState.vectorClock = { ...this.vectorClock };
    this.localState = convergedState;

    return true;
  }

  /**
   * Triggers a round of gossip synchronization with all connected peers.
   * Returns the number of peers that successfully updated their state.
   */
  public gossip(): number {
    let updatedCount = 0;
    for (const peerId of this.peers.keys()) {
      const msg = this.generateGossipMessageFor(peerId);
      if (this.isRedundantGossip(peerId, msg)) {
        continue;
      }
      const peerNode = this.peers.get(peerId);
      if (peerNode) {
        const updated = peerNode.receiveGossip(msg);
        if (updated) {
          updatedCount++;
        }
      }
    }
    return updatedCount;
  }
}

/**
 * A fragment of a serialized and split GossipMessage payload.
 */
export interface GossipFragment {
  transmissionId: string;
  fragmentIndex: number;
  totalFragments: number;
  senderId: string;
  vectorClock: VectorClock;
  chunk: string;
}

/**
 * A serialization wrapper that splits compressed state diffs into small indexed chunks
 * and reassembles them back into a unified GossipMessage.
 */
export class GossipPacketFragmenter {
  /**
   * Serializes the compressedDiff, splits it into chunks of maxFragmentSize,
   * and wraps them in GossipFragment structures.
   */
  public static fragment(
    message: GossipMessage,
    maxFragmentSize: number
  ): GossipFragment[] {
    const serializedDiff = JSON.stringify(message.compressedDiff ?? {});
    const totalLength = serializedDiff.length;
    const totalFragments = Math.max(1, Math.ceil(totalLength / maxFragmentSize));
    const transmissionId = `${message.senderId}-${Date.now()}-${Math.random()}`;

    const fragments: GossipFragment[] = [];
    for (let i = 0; i < totalFragments; i++) {
      const start = i * maxFragmentSize;
      const end = Math.min(start + maxFragmentSize, totalLength);
      const chunk = serializedDiff.substring(start, end);
      fragments.push({
        transmissionId,
        fragmentIndex: i,
        totalFragments,
        senderId: message.senderId,
        vectorClock: { ...message.vectorClock },
        chunk,
      });
    }
    return fragments;
  }

  /**
   * Reassembles a list of GossipFragments into a reconstructed GossipMessage.
   * Sorts the fragments in order of fragmentIndex before joining.
   */
  public static reassemble(fragments: GossipFragment[]): GossipMessage {
    if (fragments.length === 0) {
      throw new Error("Cannot reassemble empty fragments list");
    }

    const sorted = [...fragments].sort((a, b) => a.fragmentIndex - b.fragmentIndex);
    const fullSerialized = sorted.map((f) => f.chunk).join("");
    const compressedDiff = JSON.parse(fullSerialized);

    const first = sorted[0];
    return {
      senderId: first.senderId,
      vectorClock: { ...first.vectorClock },
      transactions: [],
      compressedDiff,
    };
  }
}


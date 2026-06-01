import { GameState, Transaction, createInitialState, reconcileLootClaims, getFactionRepInit, reconcileTerritories, getTerritoryControlInit, reconcileTaxPolicies, reconcileAlliances, reconcileTradeRoutes, reconcileTariffPolicies, reconcileGuildPolicies, reconcileCartelPolicies } from "./state.js";
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

  return {
    ...stateA,
    visited,
    journal,
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
  allAgentIds: string[]
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
    let convergedState = reconstructState(this.seed, this.pack, mergedTxs, allAgentIds);

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

    // Reconcile trade routes to ensure consensual trade routes and taxes converge perfectly across the mesh
    convergedState = reconcileTradeRoutes(convergedState, this.pack);

    // Reconcile tariff policies to ensure consensual tariff rates align perfectly across the mesh
    convergedState = reconcileTariffPolicies(convergedState, this.pack);

    // Reconcile merchant guild policies to ensure consensual guild policies align perfectly across the mesh
    convergedState = reconcileGuildPolicies(convergedState, this.pack);

    // Reconcile merchant cartel policies to ensure consensual cartel policies align perfectly across the mesh
    convergedState = reconcileCartelPolicies(convergedState, this.pack);

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


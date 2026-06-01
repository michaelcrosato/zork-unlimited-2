import { GossipNode, getTransactionId } from "./gossip.js";
import { GameState, Transaction, reconcileLootClaims, reconcileTerritories } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { computeStateHash, canonicalStringify } from "./hash.js";

/**
 * Orchestrator representing a decentralized group of peers exploring a shared procedural dungeon.
 * Manages the topology, synchronizations, network partitions, and cooperative looting conflicts.
 */
export class DecentralizedDungeonExpedition {
  public peers: Map<string, GossipNode> = new Map();
  public pack: any;
  public seed: number;

  constructor(pack: any, seed = 42) {
    this.pack = pack;
    this.seed = seed;
  }

  /**
   * Spawns and registers a new peer into the expedition, connecting them in a full-mesh topology.
   */
  public spawnPeer(nodeId: string): GossipNode {
    if (this.peers.has(nodeId)) {
      throw new Error(`Peer '${nodeId}' is already registered in the expedition.`);
    }

    const node = new GossipNode(nodeId, this.pack, this.seed);

    // Form a full mesh connection with all existing active peers
    for (const peer of this.peers.values()) {
      node.connect(peer);
    }

    this.peers.set(nodeId, node);
    return node;
  }

  /**
   * Simulates a network partition by breaking the bidirectional P2P connection between two peers.
   */
  public partition(peerIdA: string, peerIdB: string): void {
    const nodeA = this.peers.get(peerIdA);
    const nodeB = this.peers.get(peerIdB);
    if (nodeA && nodeB) {
      nodeA.disconnect(peerIdB);
    }
  }

  /**
   * Recovers connection and reconnects the bidirectional P2P connection between two partitioned peers.
   */
  public healPartition(peerIdA: string, peerIdB: string): void {
    const nodeA = this.peers.get(peerIdA);
    const nodeB = this.peers.get(peerIdB);
    if (nodeA && nodeB) {
      nodeA.connect(nodeB);
    }
  }

  /**
   * Executes a standard action locally on a specific peer node.
   */
  public executeActionOn(peerId: string, action: Action): StepResult {
    const node = this.peers.get(peerId);
    if (!node) {
      throw new Error(`Peer '${peerId}' not found in the expedition.`);
    }
    return node.executeLocalAction(action);
  }

  /**
   * Issues a lock-free chest loot claim transaction on a specific peer node.
   * Leverages Last-Write-Wins (LWW) CRDT logic to ensure absolute, deterministic convergence.
   */
  public claimLootOn(
    peerId: string,
    chestId: string,
    itemId: string,
    timestamp = Date.now()
  ): StepResult {
    const node = this.peers.get(peerId);
    if (!node) {
      throw new Error(`Peer '${peerId}' not found in the expedition.`);
    }

    // 1. Build a custom CLAIM_LOOT action
    const claimAction = {
      type: "CLAIM_LOOT",
      chestId,
      itemId,
      timestamp,
    } as any as Action;

    // 2. Execute local action using the GossipNode's standard pipeline
    return node.executeLocalAction(claimAction);
  }

  /**
   * Issues a lock-free territory claim transaction on a specific peer node.
   * Leverages Last-Write-Wins (LWW) CRDT logic to ensure absolute, deterministic convergence.
   */
  public claimTerritoryOn(
    peerId: string,
    roomId: string,
    factionId: string,
    timestamp = Date.now()
  ): StepResult {
    const node = this.peers.get(peerId);
    if (!node) {
      throw new Error(`Peer '${peerId}' not found in the expedition.`);
    }

    const claimAction = {
      type: "CLAIM_TERRITORY",
      roomId,
      factionId,
      timestamp,
    } as any as Action;

    return node.executeLocalAction(claimAction);
  }

  /**
   * Dispatches rounds of Gossip sync across all connected active peers.
   * Continues until network state completely stabilizes (eventual convergence).
   * Returns the total count of state synchronization steps performed.
   */
  public synchronizeNetwork(maxRounds = 10): number {
    let totalSyncSteps = 0;
    let anyChanges = true;
    let round = 0;

    while (anyChanges && round < maxRounds) {
      anyChanges = false;
      
      // Perform a gossip sweep for every peer node
      for (const node of this.peers.values()) {
        const syncCount = node.gossip();
        if (syncCount > 0) {
          anyChanges = true;
          totalSyncSteps += syncCount;
        }
      }

      round++;
    }

    return totalSyncSteps;
  }

  /**
   * Verifies that all non-partitioned peers have converged to an identical global game state.
   */
  public assertNetworkConvergence(expectedStateHashesCount = 1): void {
    const hashes = new Set<string>();
    for (const node of this.peers.values()) {
      const hash = computeStateHash(node.localState);
      hashes.add(hash);
    }

    if (hashes.size > expectedStateHashesCount) {
      throw new Error(
        `Network has not fully converged! Found ${hashes.size} distinct state hashes across peers.`
      );
    }
  }
}

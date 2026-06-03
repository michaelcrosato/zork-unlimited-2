import { VectorClock, isClockBehind, GossipMessage } from "./gossip.js";
import { Transaction } from "./state.js";
import { computeStateHash, computeSha256 } from "./hash.js";
import { MeshNode, MeshNetwork } from "./network.js";

export interface AntiEntropyDigest {
  nodeId: string;
  vectorClock: VectorClock;
  clockHash: string;
  merkleRoot: string;
  stateHash: string;
}

export class GossipAntiEntropyRecovery {
  /**
   * Computes a deterministic Merkle tree root hash from a list of transactions.
   */
  public static computeMerkleRoot(transactions: Transaction[]): string {
    const txIds = transactions.map(tx => {
      const actionStr = typeof tx.action === "string" ? tx.action : JSON.stringify(tx.action);
      return `${tx.agentId}-${tx.sequenceNumber}-${tx.timestamp}-${tx.stateHashBefore}-${actionStr}`;
    });

    if (txIds.length === 0) {
      return computeSha256("empty");
    }

    let level = txIds.map(id => computeSha256(id));
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          nextLevel.push(computeSha256(level[i] + level[i + 1]));
        } else {
          nextLevel.push(level[i]);
        }
      }
      level = nextLevel;
    }
    return level[0];
  }

  /**
   * Generates a stable condensed clock hash of the vector clock.
   */
  public static computeCondensedClockHash(clock: VectorClock): string {
    const sortedKeys = Object.keys(clock).sort();
    const serialized = sortedKeys.map(k => `${k}:${clock[k]}`).join(",");
    return computeSha256(serialized);
  }

  /**
   * Creates an anti-entropy digest for a given node.
   */
  public static createDigest(node: MeshNode): AntiEntropyDigest {
    const vectorClock = { ...node.vectorClock };
    const clockHash = this.computeCondensedClockHash(vectorClock);
    const merkleRoot = this.computeMerkleRoot(node.localState.transactionJournal || []);
    const stateHash = computeStateHash(node.localState);

    return {
      nodeId: node.nodeId,
      vectorClock,
      clockHash,
      merkleRoot,
      stateHash
    };
  }

  /**
   * Triggers an anti-entropy digest exchange round for all nodes in the network.
   */
  public static triggerAntiEntropy(network: MeshNetwork): void {
    const nodeIds = Array.from(network.nodes.keys());
    for (const sourceId of nodeIds) {
      const sourceNode = network.nodes.get(sourceId);
      if (!sourceNode) continue;

      const digest = this.createDigest(sourceNode);

      // Exchange with all other known nodes in the mesh topology
      const targetIds = sourceNode.discovery.getKnownNodes();
      for (const targetId of targetIds) {
        if (targetId === sourceId) continue;
        network.sendRoutedPacket({
          sourceId,
          destinationId: targetId,
          type: "anti_entropy_digest",
          payload: digest
        });
      }
    }
  }

  /**
   * Processes a received digest and handles discrepancy detection / recovery task initiation.
   */
  public static handleDigest(recipient: MeshNode, digest: AntiEntropyDigest): void {
    // 1. Update recipient's knowledge of the peer's clock in peerClocks map
    if (!recipient.peerClocks) {
      recipient.peerClocks = new Map();
    }
    recipient.peerClocks.set(digest.nodeId, digest.vectorClock);

    // 2. Perform discrepancy/divergence checks
    const recipientDigest = this.createDigest(recipient);

    const clocksDifferent = recipientDigest.clockHash !== digest.clockHash;
    const merkleRootsDifferent = recipientDigest.merkleRoot !== digest.merkleRoot;
    const stateHashesDifferent = recipientDigest.stateHash !== digest.stateHash;

    // Check if there is any clock discrepancy or state divergence
    if (clocksDifferent || merkleRootsDifferent || stateHashesDifferent) {
      this.initiateRecovery(recipient, digest);
    }
  }

  /**
   * Initiates the background recovery/sync task.
   */
  private static initiateRecovery(recipient: MeshNode, digest: AntiEntropyDigest): void {
    const peerId = digest.nodeId;
    const peerClock = digest.vectorClock;
    const ourClock = recipient.vectorClock;

    const weAreBehind = isClockBehind(ourClock, peerClock);
    const peerIsBehind = isClockBehind(peerClock, ourClock);

    if (weAreBehind && peerIsBehind) {
      // Incomparable / divergent clocks (physical partition recovery / race condition)
      // Trigger full bidirectional recovery sync:
      // Send our updates to them, and request their updates
      const gossip = recipient.generateGossipMessageFor(peerId);
      recipient.sendGossipOrFragments(peerId, gossip);

      if (recipient.network) {
        recipient.network.sendRoutedPacket({
          sourceId: recipient.nodeId,
          destinationId: peerId,
          type: "anti_entropy_request",
          payload: {}
        });
      }
    } else if (weAreBehind) {
      // We are behind the peer! Send anti_entropy_request to get their transactions.
      if (recipient.network) {
        recipient.network.sendRoutedPacket({
          sourceId: recipient.nodeId,
          destinationId: peerId,
          type: "anti_entropy_request",
          payload: {}
        });
      }
    } else if (peerIsBehind) {
      // Peer is behind us! Send our delta transactions immediately.
      const gossip = recipient.generateGossipMessageFor(peerId);
      recipient.sendGossipOrFragments(peerId, gossip);
    } else {
      // Clocks are identical but Merkle root or state hash differs (silent failure / divergence).
      // Trigger full bidirectional recovery sync.
      const gossip = recipient.generateGossipMessageFor(peerId);
      recipient.sendGossipOrFragments(peerId, gossip);

      if (recipient.network) {
        recipient.network.sendRoutedPacket({
          sourceId: recipient.nodeId,
          destinationId: peerId,
          type: "anti_entropy_request",
          payload: {}
        });
      }
    }
  }

  /**
   * Handles an anti-entropy sync request, replying with a delta GossipMessage.
   */
  public static handleRequest(node: MeshNode, requesterId: string): void {
    const gossip = node.generateGossipMessageFor(requesterId);
    node.sendGossipOrFragments(requesterId, gossip);
  }
}

import { GossipNode, GossipMessage, GossipFragment, GossipPacketFragmenter } from "./gossip.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { GossipAntiEntropyRecovery } from "./anti_entropy.js";

/**
 * A presence announcement representing node existence, its current sequence number,
 * and its direct, physical neighbor nodes in the mesh.
 */
export interface PresenceAnnouncement {
  nodeId: string;
  sequenceNumber: number;
  neighbors: string[];
  timestamp: number;
}

/**
 * A packet wrapped with routing headers to be routed multi-hop through the P2P mesh.
 */
export interface RoutedPacket {
  packetId: string;
  sourceId: string;
  destinationId: string;
  ttl: number;
  type: "presence" | "gossip" | "heartbeat" | "heartbeat_ack" | "gossip_fragment" | "anti_entropy_digest" | "anti_entropy_request";
  payload: any;
  route: string[];
  priority?: number;
}

export function getPriorityForType(type: "presence" | "gossip" | "heartbeat" | "heartbeat_ack" | "gossip_fragment" | "anti_entropy_digest" | "anti_entropy_request"): number {
  switch (type) {
    case "gossip":
    case "gossip_fragment":
      return 3;
    case "presence":
    case "anti_entropy_digest":
    case "anti_entropy_request":
      return 2;
    case "heartbeat_ack":
      return 1;
    case "heartbeat":
      return 0;
    default:
      return 0;
  }
}

/**
 * A local registry maintained by each node to map the known mesh topology
 * and automatically compute the optimal routing path (next hop) to any target node.
 */
export class NetworkDiscovery {
  public nodeId: string;
  // Maps nodeId -> presence data (neighbors, sequence, timestamp, lastSeen)
  public topology: Map<string, { neighbors: string[]; seq: number; timestamp: number; lastSeen: number }> = new Map();
  // Maps destinationNodeId -> nextHopNodeId
  public routingTable: Map<string, string> = new Map();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Updates the local link-state database with a presence announcement.
   * Returns true if the announcement was fresh and updated the topology, false otherwise.
   */
  public updateTopology(announcement: PresenceAnnouncement, lastSeen?: number): boolean {
    const current = this.topology.get(announcement.nodeId);
    const resolvedLastSeen = lastSeen !== undefined ? lastSeen : announcement.timestamp;

    if (current && current.seq >= announcement.sequenceNumber) {
      if (resolvedLastSeen > current.lastSeen) {
        current.lastSeen = resolvedLastSeen;
      }
      return false; // Outdated or duplicate announcement
    }

    if (announcement.neighbors.length === 0) {
      this.removeNode(announcement.nodeId);
      return true;
    }

    this.topology.set(announcement.nodeId, {
      neighbors: [...announcement.neighbors],
      seq: announcement.sequenceNumber,
      timestamp: announcement.timestamp,
      lastSeen: resolvedLastSeen,
    });

    this.recalculateRoutingTable();
    return true;
  }

  /**
   * Prunes a node completely from the local routing topology.
   */
  public removeNode(offlineNodeId: string): void {
    let changed = false;
    if (this.topology.has(offlineNodeId)) {
      this.topology.delete(offlineNodeId);
      changed = true;
    }

    // Also prune this node from other nodes' adjacency lists
    for (const [nodeId, record] of this.topology.entries()) {
      if (record.neighbors.includes(offlineNodeId)) {
        record.neighbors = record.neighbors.filter((n) => n !== offlineNodeId);
        changed = true;
      }
    }

    if (changed) {
      this.recalculateRoutingTable();
    }
  }

  /**
   * Runs a Breadth-First Search (BFS) over the registered topology
   * to calculate the shortest path next hop for every reachable node.
   */
  public recalculateRoutingTable(): void {
    this.routingTable.clear();
    const queue: Array<[string, string[]]> = [[this.nodeId, []]];
    const visited = new Set<string>([this.nodeId]);

    while (queue.length > 0) {
      const [current, path] = queue.shift()!;
      const record = this.topology.get(current);
      const neighbors = record ? record.neighbors : [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          const nextHop = newPath[0];
          this.routingTable.set(neighbor, nextHop);
          queue.push([neighbor, newPath]);
        }
      }
    }
  }

  /**
   * Resolves the next physical hop to route a packet toward its destination.
   */
  public getNextHop(destinationId: string): string | null {
    return this.routingTable.get(destinationId) ?? null;
  }

  /**
   * Exposes a list of all active nodes known in the mesh topology.
   */
  public getKnownNodes(): string[] {
    return Array.from(this.topology.keys());
  }
}

/**
 * A highly capable network-aware GossipNode executing peer routing, 
 * presence announcement, and multi-hop delta synchronizations.
 */
export class MeshNode extends GossipNode {
  public discovery: NetworkDiscovery;
  public network: MeshNetwork | null = null;
  public directNeighbors: Set<string> = new Set();
  public presenceSeq = 0;

  // Fragmentation and Reassembly layer properties
  public maxFragmentSize = 0; // 0 means fragmentation is disabled
  public fragmentBuffers: Map<string, Map<number, GossipFragment>> = new Map();

  // Packet statistics for telemetry/testing
  public packetsSentCount = 0;
  public packetsReceivedCount = 0;
  public packetsForwardedCount = 0;

  // Heartbeat tracking properties
  public heartbeatsSent: Map<string, number> = new Map();
  public heartbeatsReceived: Map<string, number> = new Map();
  public heartbeatAcksReceived: Map<string, number> = new Map();
  public lastHeartbeatLatency: Map<string, number> = new Map();
  public pendingHeartbeats: Map<string, { sentAt: number; nextHop: string; destinationId: string }> = new Map();
  public heartbeatTimeoutsCount = 0;
  
  // Route repair tracking properties
  public routeRepairsTriggered = 0;
  public routeRepairsSucceeded = 0;
  public packetsDroppedCount = 0;

  // Sliding-window history tracker for packet deduplication
  public processedPacketCache: Map<string, number> = new Map();
  public deduplicationWindowMs = 5000;
  public duplicatePacketsDroppedCount = 0;

  public pendingEvents: GameEvent[] = [];

  public flushPendingEvents(): GameEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  public reconcileCrossMeshOptionArbitrage(): void {
    const state = this.localState;
    if (!state.swfReinsuranceOptionCrossMeshArbitrageRoutes) return;

    let changed = false;

    for (const [routeId, route] of Object.entries(state.swfReinsuranceOptionCrossMeshArbitrageRoutes)) {
      const { sourceNodeId, targetNodeId, swfYieldCdoId, trancheId } = route;
      const policyKey = `${swfYieldCdoId}_${trancheId}`;
      const policy = state.swfReinsuranceOptionCrossMeshArbitragePolicies?.[policyKey];
      if (!policy) continue;

      // Find the nodes in the network
      const sourceNode = this.network?.nodes.get(sourceNodeId);
      const targetNode = this.network?.nodes.get(targetNodeId);
      if (!sourceNode || !targetNode) continue;

      // Calculate spread difference between different gossip mesh nodes
      const key = `${swfYieldCdoId}_${trancheId}`;
      const spreadSource = sourceNode.localState.swfReinsuranceOptionOrderBookDepths?.[key]?.bidAskSpread ?? 0;
      const spreadTarget = targetNode.localState.swfReinsuranceOptionOrderBookDepths?.[key]?.bidAskSpread ?? 0;
      
      const spreadDiff = Math.abs(spreadSource - spreadTarget);
      
      // Update spread differences in state schemas
      if (route.spreadDifference !== spreadDiff) {
        route.spreadDifference = spreadDiff;
        route.timestamp = state.step;
        changed = true;
      }

      const threshold = policy.arbitrageSpreadThreshold;
      if (spreadDiff > threshold) {
        // Price imbalance exceeds threshold! Automatic options purchase/sale and spread alignment reconciliation
        const arbitrageProfit = Math.min(Math.floor((spreadDiff - threshold) * 0.5), policy.maxArbitrageVolume);
        
        if (arbitrageProfit > 0) {
          // Execute automated buy/sell transactions on the nodes to balance options liquidity
          const creatorSyndicateId = state.swfYieldCDOs?.[swfYieldCdoId]?.creatorSyndicateId;
          if (creatorSyndicateId) {
            const sourceSyndicate = sourceNode.localState.syndicates?.[creatorSyndicateId];
            const targetSyndicate = targetNode.localState.syndicates?.[creatorSyndicateId];
            
            if (sourceSyndicate && targetSyndicate) {
              sourceNode.localState.syndicates = { ...sourceNode.localState.syndicates };
              sourceNode.localState.syndicates[creatorSyndicateId] = {
                ...sourceSyndicate,
                warChest: (sourceSyndicate.warChest ?? 0) + arbitrageProfit,
              };
              
              targetNode.localState.syndicates = { ...targetNode.localState.syndicates };
              targetNode.localState.syndicates[creatorSyndicateId] = {
                ...targetSyndicate,
                warChest: (targetSyndicate.warChest ?? 0) + arbitrageProfit,
              };
              
              // Converge option spreads
              const targetSpread = Math.floor((spreadSource + spreadTarget) / 2);
              
              if (sourceNode.localState.swfReinsuranceOptionOrderBookDepths?.[key]) {
                sourceNode.localState.swfReinsuranceOptionOrderBookDepths = { ...sourceNode.localState.swfReinsuranceOptionOrderBookDepths };
                sourceNode.localState.swfReinsuranceOptionOrderBookDepths[key] = {
                  ...sourceNode.localState.swfReinsuranceOptionOrderBookDepths[key],
                  bidAskSpread: targetSpread,
                };
              }
              if (targetNode.localState.swfReinsuranceOptionOrderBookDepths?.[key]) {
                targetNode.localState.swfReinsuranceOptionOrderBookDepths = { ...targetNode.localState.swfReinsuranceOptionOrderBookDepths };
                targetNode.localState.swfReinsuranceOptionOrderBookDepths[key] = {
                  ...targetNode.localState.swfReinsuranceOptionOrderBookDepths[key],
                  bidAskSpread: targetSpread,
                };
              }

              if (!sourceNode.localState.journal) sourceNode.localState.journal = [];
              sourceNode.localState.journal.push(
                `[SWF Reinsurance Option Cross-Mesh Arbitrage] Executed automatic options purchase/sale along route ${routeId} (Spread Difference: ${spreadDiff} gold > Threshold: ${threshold} gold). Reconciled and converged spreads on nodes ${sourceNodeId} and ${targetNodeId} to ${targetSpread} gold.`
              );
              
              if (!targetNode.localState.journal) targetNode.localState.journal = [];
              targetNode.localState.journal.push(
                `[SWF Reinsurance Option Cross-Mesh Arbitrage] Executed automatic options purchase/sale along route ${routeId} (Spread Difference: ${spreadDiff} gold > Threshold: ${threshold} gold). Reconciled and converged spreads on nodes ${sourceNodeId} and ${targetNodeId} to ${targetSpread} gold.`
              );
            }
          }
        }
      }
    }
  }

  private triggerPeerEvent(eventType: "arrival" | "departure" | "sync", peerId: string): void {
    let template = "";
    if (this.pack && (this.pack as any).network_templates) {
      template = (this.pack as any).network_templates[eventType] || "";
    }
    if (!template) {
      const defaults = {
        arrival: "A shimmering rift opens as {peerId} steps into the realm.",
        departure: "{peerId} fades like morning mist, disconnecting from the mesh.",
        sync: "A pulse of blue light rippling through the air indicates state synchronization with {peerId}.",
      };
      template = defaults[eventType];
    }

    const formattedText = template.replace(/{peerId}/g, peerId);

    if (!this.localState.journal) {
      this.localState.journal = [];
    }
    this.localState.journal.push(formattedText);

    if (!this.localState.cooperativeSyncLog) {
      this.localState.cooperativeSyncLog = [];
    }
    this.localState.cooperativeSyncLog.push(formattedText);

    this.pendingEvents.push({
      type: "narration",
      text: formattedText,
    });
  }

  constructor(nodeId: string, pack: any, seed = 42) {
    super(nodeId, pack, seed);
    this.discovery = new NetworkDiscovery(nodeId);

    // Seed local topology with ourselves
    this.discovery.updateTopology({
      nodeId: this.nodeId,
      sequenceNumber: 0,
      neighbors: [],
      timestamp: Date.now(),
    });
  }

  /**
   * Establishes a direct peer connection and announces neighbors to the network.
   */
  public override connect(peer: GossipNode): void {
    super.connect(peer);
    this.directNeighbors.add(peer.nodeId);

    if (peer instanceof MeshNode) {
      const alreadyConnected = peer.directNeighbors.has(this.nodeId);
      peer.directNeighbors.add(this.nodeId);
      if (!alreadyConnected) {
        peer.announcePresence();
      }
    }

    this.announcePresence();
  }

  /**
   * Drops a direct peer connection and announces neighbors to the network.
   */
  public override disconnect(peerId: string): void {
    const peer = this.peers.get(peerId);

    super.disconnect(peerId);
    this.directNeighbors.delete(peerId);

    if (peer instanceof MeshNode) {
      const alreadyDisconnected = !peer.directNeighbors.has(this.nodeId);
      peer.directNeighbors.delete(this.nodeId);
      if (!alreadyDisconnected) {
        peer.announcePresence();
      }
    }

    this.announcePresence();
  }

  /**
   * Increments the link sequence number and floods a presence announcement
   * representing the node's updated direct neighbor topology.
   */
  public announcePresence(): void {
    this.presenceSeq++;
    const currentTime = this.network ? this.network.currentTimeMs : Date.now();
    const announcement: PresenceAnnouncement = {
      nodeId: this.nodeId,
      sequenceNumber: this.presenceSeq,
      neighbors: Array.from(this.directNeighbors),
      timestamp: currentTime,
    };

    // Update own topology
    this.discovery.updateTopology(announcement, currentTime);

    // Flood announcement to the active network mesh
    if (this.network) {
      this.network.floodPresence(this.nodeId, announcement);
    }
  }

  /**
   * Gracefully shuts down and announces departure from the P2P network.
   */
  public leave(): void {
    this.presenceSeq++;
    const announcement: PresenceAnnouncement = {
      nodeId: this.nodeId,
      sequenceNumber: this.presenceSeq,
      neighbors: [], // Empty neighbor set signals departure
      timestamp: Date.now(),
    };

    if (this.network) {
      this.network.floodPresence(this.nodeId, announcement);
      this.network.removeNode(this.nodeId);
    }

    for (const peerId of Array.from(this.directNeighbors)) {
      this.disconnect(peerId);
    }
  }

  /**
   * Receives a RoutedPacket, processing it if this node is the destination,
   * or forwarding it along the computed shortest path next hop if it's intermediate.
   */
  public receivePacket(packet: RoutedPacket): void {
    const currentTime = this.network ? this.network.currentTimeMs : Date.now();

    // Sliding-window cache pruning of expired entries
    for (const [cachedId, ts] of this.processedPacketCache.entries()) {
      if (currentTime - ts > this.deduplicationWindowMs) {
        this.processedPacketCache.delete(cachedId);
      }
    }

    // Consult the cache: silently drop duplicate packets
    if (this.processedPacketCache.has(packet.packetId)) {
      this.duplicatePacketsDroppedCount++;
      return;
    }

    // Cache the packet ID
    this.processedPacketCache.set(packet.packetId, currentTime);

    this.packetsReceivedCount++;
    packet.route.push(this.nodeId);

    if (packet.destinationId === this.nodeId) {
      // Packet reached its destination
      if (packet.type === "presence") {
        const announcement = packet.payload as PresenceAnnouncement;
        const peerId = announcement.nodeId;

        if (peerId !== this.nodeId) {
          const wasKnown = this.discovery.topology.has(peerId);
          const isDeparture = announcement.neighbors.length === 0;

          const fresh = this.discovery.updateTopology(announcement, this.network ? this.network.currentTimeMs : Date.now());
          if (fresh) {
            if (!wasKnown && !isDeparture) {
              this.triggerPeerEvent("arrival", peerId);
            } else if (wasKnown && isDeparture) {
              this.triggerPeerEvent("departure", peerId);
            }

            if (this.network) {
              // Relaying the fresh presence announcement to other physical links
              const incomingFrom = packet.route[packet.route.length - 2] ?? null;
              this.network.floodPresence(this.nodeId, packet.payload, incomingFrom);
            }
          }
        } else {
          this.discovery.updateTopology(packet.payload, this.network ? this.network.currentTimeMs : Date.now());
        }
      } else if (packet.type === "gossip") {
        const originalMessage = packet.payload as GossipMessage;
        const updated = this.receiveGossip(originalMessage);

        // If gossip succeeded in merging state updates, automatically trigger
        // a reciprocal reply to ensure complete, convergent synchronization
        if (updated) {
          this.reconcileCrossMeshOptionArbitrage();
          this.triggerPeerEvent("sync", packet.sourceId);

          if (this.network) {
            const reply = this.generateGossipMessageFor(packet.sourceId);
            this.sendGossipOrFragments(packet.sourceId, reply);
          }
        }
      } else if (packet.type === "gossip_fragment") {
        const fragment = packet.payload as GossipFragment;
        const reassembled = this.bufferAndReassemble(fragment);
        if (reassembled) {
          const updated = this.receiveGossip(reassembled);
          if (updated) {
            this.reconcileCrossMeshOptionArbitrage();
            this.triggerPeerEvent("sync", packet.sourceId);

            if (this.network) {
              const reply = this.generateGossipMessageFor(packet.sourceId);
              this.sendGossipOrFragments(packet.sourceId, reply);
            }
          }
        }
      } else if (packet.type === "heartbeat") {
        this.heartbeatsReceived.set(packet.sourceId, (this.heartbeatsReceived.get(packet.sourceId) ?? 0) + 1);
        
        // Respond with a heartbeat acknowledgement
        if (this.network) {
          this.network.sendRoutedPacket({
            sourceId: this.nodeId,
            destinationId: packet.sourceId,
            type: "heartbeat_ack",
            payload: {
              originalPacketId: packet.packetId,
              timestamp: packet.payload.timestamp,
            },
          });
        }
      } else if (packet.type === "heartbeat_ack") {
        this.heartbeatAcksReceived.set(packet.sourceId, (this.heartbeatAcksReceived.get(packet.sourceId) ?? 0) + 1);
        
        const origId = packet.payload.originalPacketId;
        if (origId) {
          this.pendingHeartbeats.delete(origId);
        }

        const sendTime = packet.payload.timestamp;
        const currentSimTime = this.network ? this.network.currentTimeMs : Date.now();
        const latency = currentSimTime - sendTime;
        this.lastHeartbeatLatency.set(packet.sourceId, latency);
      } else if (packet.type === "anti_entropy_digest") {
        GossipAntiEntropyRecovery.handleDigest(this, packet.payload);
      } else if (packet.type === "anti_entropy_request") {
        GossipAntiEntropyRecovery.handleRequest(this, packet.sourceId);
      }
    } else {
      // Forwarding to destination
      this.packetsForwardedCount++;
      if (packet.ttl <= 1) {
        this.packetsDroppedCount++;
        return; // TTL expired to prevent infinite routing loops
      }

      let nextHop = this.discovery.getNextHop(packet.destinationId);
      if (!nextHop || !this.directNeighbors.has(nextHop)) {
        // Route failure detected during forwarding! Attempt repair
        const repaired = this.repairRoute(packet.destinationId, nextHop);
        if (repaired) {
          nextHop = this.discovery.getNextHop(packet.destinationId);
        } else {
          this.packetsDroppedCount++;
          return; // Drop packet if repair failed
        }
      }

      if (nextHop && this.network) {
        const nextPacket: RoutedPacket = {
          ...packet,
          ttl: packet.ttl - 1,
          route: [...packet.route],
        };
        this.network.forwardPacket(nextHop, nextPacket);
      } else {
        this.packetsDroppedCount++;
      }
    }
  }

  public repairRoute(destinationId: string, failedNextHop: string | null): boolean {
    this.routeRepairsTriggered++;

    if (failedNextHop) {
      // Remove failed next hop from our own topology neighbors
      const ownTopology = this.discovery.topology.get(this.nodeId);
      if (ownTopology) {
        ownTopology.neighbors = ownTopology.neighbors.filter((n) => n !== failedNextHop);
      }

      // Also prune this link in the other direction from the failed node's topology entry locally
      const failedTopology = this.discovery.topology.get(failedNextHop);
      if (failedTopology) {
        failedTopology.neighbors = failedTopology.neighbors.filter((n) => n !== this.nodeId);
      }
    }

    // Recalculate local routing table
    this.discovery.recalculateRoutingTable();

    // Broadcast our updated topology presence so peers know the link is broken
    this.announcePresence();

    // Check if we can reach the destination via a new next hop that is a direct neighbor
    const newNextHop = this.discovery.getNextHop(destinationId);
    if (newNextHop && this.directNeighbors.has(newNextHop)) {
      this.routeRepairsSucceeded++;
      return true;
    }

    return false;
  }

  /**
   * Sends a heartbeat packet to a specific known destination node.
   */
  public sendHeartbeat(destinationId: string): void {
    if (!this.network) return;

    let nextHop = this.discovery.getNextHop(destinationId);
    if (!nextHop || !this.directNeighbors.has(nextHop)) {
      // Trigger immediate repair
      const repaired = this.repairRoute(destinationId, nextHop);
      if (repaired) {
        nextHop = this.discovery.getNextHop(destinationId);
      } else {
        this.packetsDroppedCount++;
        return;
      }
    }

    if (!nextHop) return;

    const packetId = `${this.nodeId}-heartbeat-${destinationId}-${this.network.currentTimeMs}-${Math.random()}`;
    const packet: RoutedPacket = {
      packetId,
      sourceId: this.nodeId,
      destinationId,
      ttl: 15,
      type: "heartbeat",
      payload: {
        timestamp: this.network.currentTimeMs,
      },
      route: [this.nodeId],
      priority: 0,
    };

    this.pendingHeartbeats.set(packetId, {
      sentAt: this.network.currentTimeMs,
      nextHop,
      destinationId,
    });

    this.heartbeatsSent.set(destinationId, (this.heartbeatsSent.get(destinationId) ?? 0) + 1);
    this.packetsSentCount++;
    this.network.forwardPacket(nextHop, packet);
  }

  /**
   * Scans all known topology nodes and routes periodic Link-State Heartbeats to them.
   */
  public performHeartbeatCheck(): void {
    if (!this.network) return;

    const knownNodes = this.discovery.getKnownNodes();
    for (const targetId of knownNodes) {
      if (targetId === this.nodeId) continue;
      this.sendHeartbeat(targetId);
    }
  }

  /**
   * Identifies pending heartbeats that have timed out and triggers route repair.
   */
  public checkHeartbeatTimeouts(timeoutMs = 300): void {
    if (!this.network) return;

    const currentTime = this.network.currentTimeMs;
    for (const [packetId, info] of this.pendingHeartbeats.entries()) {
      if (currentTime - info.sentAt > timeoutMs) {
        this.pendingHeartbeats.delete(packetId);
        this.heartbeatTimeoutsCount++;
        
        // Trigger route repair for the timed out route
        this.repairRoute(info.destinationId, info.nextHop);
      }
    }
  }

  /**
   * Scans the local topology and prunes any nodes whose lastSeen timestamp
   * is older than the inactivity threshold.
   */
  public pruneStaleTopology(inactivityThresholdMs: number, currentTimeMs: number): void {
    const cutoffTime = currentTimeMs - inactivityThresholdMs;
    const staleNodeIds: string[] = [];

    for (const [nodeId, record] of this.discovery.topology.entries()) {
      // Never prune ourselves
      if (nodeId === this.nodeId) continue;
      
      if (record.lastSeen < cutoffTime) {
        staleNodeIds.push(nodeId);
      }
    }

    if (staleNodeIds.length > 0) {
      for (const nodeId of staleNodeIds) {
        this.discovery.removeNode(nodeId);
      }
      this.discovery.recalculateRoutingTable();
    }
  }

  /**
   * Synthesizes and routes a multi-hop Gossip delta synchronizer packet to a distant peer node.
   */
  public syncWithPeer(targetNodeId: string): boolean {
    if (!this.network) return false;

    let nextHop = this.discovery.getNextHop(targetNodeId);
    if (!nextHop || !this.directNeighbors.has(nextHop)) {
      const repaired = this.repairRoute(targetNodeId, nextHop);
      if (repaired) {
        nextHop = this.discovery.getNextHop(targetNodeId);
      } else {
        return false; // Target node is currently unreachable
      }
    }

    if (!nextHop) return false;

    const gossipMsg = this.generateGossipMessageFor(targetNodeId);
    if (this.isRedundantGossip(targetNodeId, gossipMsg)) {
      return false;
    }
    
    this.sendGossipOrFragments(targetNodeId, gossipMsg);
    return true;
  }

  /**
   * Helper that either fragments and sends a GossipMessage as multiple packets,
   * or sends it directly as a single gossip packet depending on maxFragmentSize.
   */
  public sendGossipOrFragments(destinationId: string, gossipMsg: GossipMessage): void {
    if (!this.network) return;

    if (this.maxFragmentSize > 0 && gossipMsg.compressedDiff) {
      const fragments = GossipPacketFragmenter.fragment(gossipMsg, this.maxFragmentSize);
      if (fragments.length > 1) {
        for (const fragment of fragments) {
          this.network.sendRoutedPacket({
            sourceId: this.nodeId,
            destinationId: destinationId,
            type: "gossip_fragment",
            payload: fragment,
          });
        }
        return;
      }
    }

    this.network.sendRoutedPacket({
      sourceId: this.nodeId,
      destinationId,
      type: "gossip",
      payload: gossipMsg,
    });
  }

  /**
   * Buffers out-of-order/jittered incoming gossip fragments for a transmission
   * and returns the reassembled GossipMessage once all fragments have arrived.
   */
  public bufferAndReassemble(fragment: GossipFragment): GossipMessage | null {
    const { transmissionId, fragmentIndex, totalFragments } = fragment;

    let buffer = this.fragmentBuffers.get(transmissionId);
    if (!buffer) {
      buffer = new Map<number, GossipFragment>();
      this.fragmentBuffers.set(transmissionId, buffer);
    }

    buffer.set(fragmentIndex, fragment);

    if (buffer.size === totalFragments) {
      const sortedFragments: GossipFragment[] = [];
      for (let i = 0; i < totalFragments; i++) {
        const f = buffer.get(i);
        if (!f) {
          return null;
        }
        sortedFragments.push(f);
      }

      const reassembled = GossipPacketFragmenter.reassemble(sortedFragments);
      this.fragmentBuffers.delete(transmissionId);
      return reassembled;
    }

    return null;
  }
}

interface PacketDelivery {
  deliverAt: number;
  packet: RoutedPacket;
  nextHopId: string;
}

/**
 * A simulated physical transport layer for mesh networks, supporting
 * arbitrary topologies, dynamic link changes, packet loss, and high latency.
 */
export class MeshNetwork {
  public nodes: Map<string, MeshNode> = new Map();
  public packetQueue: PacketDelivery[] = [];
  public currentTimeMs = 0;

  // Latency simulator properties
  public minLatencyMs = 20;
  public maxLatencyMs = 80;
  public packetLossRate = 0.0;

  // Bandwidth limit: max packets processed/delivered per tick (undefined/0 means unlimited)
  public maxPacketsPerTick?: number;
  // Controls if priority sorting is disabled (for benchmark/control comparisons)
  public disablePriorityRouting = false;

  // Configurable inactivity threshold for topology pruning (0 or undefined means disabled)
  public topologyPruningThresholdMs = 0;

  // Configurable anti-entropy recovery interval (0 or undefined means disabled)
  public antiEntropyIntervalMs = 0;
  private lastAntiEntropyTick = 0;

  constructor() {}

  /**
   * Registers a node into this network.
   */
  public registerNode(node: MeshNode): void {
    node.network = this;
    this.nodes.set(node.nodeId, node);
    node.announcePresence();
  }

  /**
   * Removes a node entirely from the network.
   */
  public removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    // Remove only packets that are destined for the removed node or whose nextHop is that node
    this.packetQueue = this.packetQueue.filter(
      (pd) => pd.packet.destinationId !== nodeId && pd.nextHopId !== nodeId
    );
  }

  /**
   * Connects two nodes physically.
   */
  public connectNodes(nodeIdA: string, nodeIdB: string): void {
    const nodeA = this.nodes.get(nodeIdA);
    const nodeB = this.nodes.get(nodeIdB);
    if (nodeA && nodeB) {
      nodeA.connect(nodeB);
    }
  }

  /**
   * Disconnects two nodes physically.
   */
  public disconnectNodes(nodeIdA: string, nodeIdB: string): void {
    const nodeA = this.nodes.get(nodeIdA);
    const nodeB = this.nodes.get(nodeIdB);
    if (nodeA && nodeB) {
      nodeA.disconnect(nodeIdB);
    }
  }

  /**
   * Floods a presence announcement to neighbors.
   */
  public floodPresence(senderNodeId: string, announcement: PresenceAnnouncement, incomingFrom: string | null = null): void {
    const senderNode = this.nodes.get(senderNodeId);
    if (!senderNode) return;

    for (const neighborId of senderNode.directNeighbors) {
      if (neighborId === incomingFrom) continue;

      const packet: RoutedPacket = {
        packetId: `${senderNodeId}-presence-${announcement.sequenceNumber}-${neighborId}-${Math.random()}`,
        sourceId: senderNodeId,
        destinationId: neighborId,
        ttl: 10,
        type: "presence",
        payload: announcement,
        route: [senderNodeId],
        priority: 2,
      };

      this.sendDirectPacket(neighborId, packet);
    }
  }

  /**
   * Routes a packet from its source to its destination node multi-hop.
   */
  // Periodic heartbeat interval (0 means disabled by default)
  public heartbeatIntervalMs = 0;
  private lastHeartbeatTick = 0;

  public sendRoutedPacket(params: {
    sourceId: string;
    destinationId: string;
    type: "presence" | "gossip" | "heartbeat" | "heartbeat_ack" | "gossip_fragment" | "anti_entropy_digest" | "anti_entropy_request";
    payload: any;
    priority?: number;
  }): void {
    const sourceNode = this.nodes.get(params.sourceId);
    if (!sourceNode) return;

    let nextHop = sourceNode.discovery.getNextHop(params.destinationId);
    if (!nextHop || !sourceNode.directNeighbors.has(nextHop)) {
      const repaired = sourceNode.repairRoute(params.destinationId, nextHop);
      if (repaired) {
        nextHop = sourceNode.discovery.getNextHop(params.destinationId);
      } else {
        sourceNode.packetsDroppedCount++;
        return; // Unreachable destination
      }
    }

    if (!nextHop) return;

    const packet: RoutedPacket = {
      packetId: `${params.sourceId}-${params.type}-${this.currentTimeMs}-${Math.random()}`,
      sourceId: params.sourceId,
      destinationId: params.destinationId,
      ttl: 20,
      type: params.type,
      payload: params.payload,
      route: [params.sourceId],
      priority: params.priority !== undefined ? params.priority : getPriorityForType(params.type),
    };

    sourceNode.packetsSentCount++;
    this.forwardPacket(nextHop, packet);
  }

  /**
   * Forwards a packet to the next hop.
   */
  public forwardPacket(nextHopId: string, packet: RoutedPacket): void {
    this.sendDirectPacket(nextHopId, packet);
  }

  /**
   * Enqueues a packet to be delivered after a simulated physical latency delay.
   */
  private sendDirectPacket(neighborId: string, packet: RoutedPacket): void {
    if (this.packetLossRate > 0 && Math.random() < this.packetLossRate) {
      return; // Simulate packet loss
    }

    const latency = this.minLatencyMs + Math.floor(Math.random() * (this.maxLatencyMs - this.minLatencyMs));
    this.packetQueue.push({
      deliverAt: this.currentTimeMs + latency,
      packet,
      nextHopId: neighborId,
    });
  }

  /**
   * Advances the network simulation clock, delivering all pending packets.
   */
  public tick(advanceTimeMs: number): number {
    this.currentTimeMs += advanceTimeMs;

    // Check heartbeat timeouts on all registered nodes
    for (const node of this.nodes.values()) {
      node.checkHeartbeatTimeouts();
    }

    // Run automated periodic pruning of stale topology nodes if threshold is configured
    if (this.topologyPruningThresholdMs !== undefined && this.topologyPruningThresholdMs > 0) {
      for (const node of this.nodes.values()) {
        node.pruneStaleTopology(this.topologyPruningThresholdMs, this.currentTimeMs);
      }
    }

    // Trigger periodic heartbeats if enabled
    if (this.heartbeatIntervalMs > 0 && this.currentTimeMs - this.lastHeartbeatTick >= this.heartbeatIntervalMs) {
      this.lastHeartbeatTick = this.currentTimeMs;
      for (const node of this.nodes.values()) {
        node.performHeartbeatCheck();
      }
    }

    // Trigger periodic anti-entropy recovery if enabled
    if (this.antiEntropyIntervalMs > 0 && this.currentTimeMs - this.lastAntiEntropyTick >= this.antiEntropyIntervalMs) {
      this.lastAntiEntropyTick = this.currentTimeMs;
      GossipAntiEntropyRecovery.triggerAntiEntropy(this);
    }

    let deliveredCount = 0;

    // Sort queue first by deliverAt ascending, then by priority descending
    this.packetQueue.sort((a, b) => {
      if (a.deliverAt !== b.deliverAt) {
        return a.deliverAt - b.deliverAt;
      }
      if (this.disablePriorityRouting) {
        return 0;
      }
      const aPriority = a.packet.priority ?? 0;
      const bPriority = b.packet.priority ?? 0;
      return bPriority - aPriority;
    });

    const pending = this.packetQueue.filter((pd) => pd.deliverAt <= this.currentTimeMs);
    const nonPending = this.packetQueue.filter((pd) => pd.deliverAt > this.currentTimeMs);

    let toDeliver: PacketDelivery[] = [];
    let toDefer: PacketDelivery[] = [];

    if (this.maxPacketsPerTick !== undefined && this.maxPacketsPerTick > 0) {
      toDeliver = pending.slice(0, this.maxPacketsPerTick);
      toDefer = pending.slice(this.maxPacketsPerTick);
    } else {
      toDeliver = pending;
    }

    // Reconstruct the remaining queue (deferred pending packets + future packets)
    this.packetQueue = [...toDefer, ...nonPending];

    for (const pd of toDeliver) {
      const targetNode = this.nodes.get(pd.nextHopId);
      if (targetNode) {
        targetNode.receivePacket(pd.packet);
        deliveredCount++;
      }
    }

    // Call reconcileCrossMeshOptionArbitrage on all nodes to converge options spreads and balance liquidity
    for (const node of this.nodes.values()) {
      node.reconcileCrossMeshOptionArbitrage();
    }

    return deliveredCount;
  }
}

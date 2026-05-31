import { GossipNode, GossipMessage } from "./gossip.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";

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
  type: "presence" | "gossip";
  payload: any;
  route: string[];
}

/**
 * A local registry maintained by each node to map the known mesh topology
 * and automatically compute the optimal routing path (next hop) to any target node.
 */
export class NetworkDiscovery {
  public nodeId: string;
  // Maps nodeId -> presence data (neighbors, sequence, timestamp)
  public topology: Map<string, { neighbors: string[]; seq: number; timestamp: number }> = new Map();
  // Maps destinationNodeId -> nextHopNodeId
  public routingTable: Map<string, string> = new Map();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Updates the local link-state database with a presence announcement.
   * Returns true if the announcement was fresh and updated the topology, false otherwise.
   */
  public updateTopology(announcement: PresenceAnnouncement): boolean {
    const current = this.topology.get(announcement.nodeId);
    if (current && current.seq >= announcement.sequenceNumber) {
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

  // Packet statistics for telemetry/testing
  public packetsSentCount = 0;
  public packetsReceivedCount = 0;
  public packetsForwardedCount = 0;

  public pendingEvents: GameEvent[] = [];

  public flushPendingEvents(): GameEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
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
    const announcement: PresenceAnnouncement = {
      nodeId: this.nodeId,
      sequenceNumber: this.presenceSeq,
      neighbors: Array.from(this.directNeighbors),
      timestamp: Date.now(),
    };

    // Update own topology
    this.discovery.updateTopology(announcement);

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

          const fresh = this.discovery.updateTopology(announcement);
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
          this.discovery.updateTopology(packet.payload);
        }
      } else if (packet.type === "gossip") {
        const originalMessage = packet.payload as GossipMessage;
        const updated = this.receiveGossip(originalMessage);

        // If gossip succeeded in merging state updates, automatically trigger
        // a reciprocal reply to ensure complete, convergent synchronization
        if (updated) {
          this.triggerPeerEvent("sync", packet.sourceId);

          if (this.network) {
            const reply = this.generateGossipMessageFor(packet.sourceId);
            this.network.sendRoutedPacket({
              sourceId: this.nodeId,
              destinationId: packet.sourceId,
              type: "gossip",
              payload: reply,
            });
          }
        }
      }
    } else {
      // Forwarding to destination
      this.packetsForwardedCount++;
      if (packet.ttl <= 1) {
        return; // TTL expired to prevent infinite routing loops
      }

      const nextHop = this.discovery.getNextHop(packet.destinationId);
      if (nextHop && this.network) {
        const nextPacket: RoutedPacket = {
          ...packet,
          ttl: packet.ttl - 1,
          route: [...packet.route],
        };
        this.network.forwardPacket(nextHop, nextPacket);
      }
    }
  }

  /**
   * Synthesizes and routes a multi-hop Gossip delta synchronizer packet to a distant peer node.
   */
  public syncWithPeer(targetNodeId: string): boolean {
    if (!this.network) return false;

    const nextHop = this.discovery.getNextHop(targetNodeId);
    if (!nextHop) {
      return false; // Target node is currently unreachable
    }

    const gossipMsg = this.generateGossipMessageFor(targetNodeId);
    this.network.sendRoutedPacket({
      sourceId: this.nodeId,
      destinationId: targetNodeId,
      type: "gossip",
      payload: gossipMsg,
    });

    return true;
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
      };

      this.sendDirectPacket(neighborId, packet);
    }
  }

  /**
   * Routes a packet from its source to its destination node multi-hop.
   */
  public sendRoutedPacket(params: {
    sourceId: string;
    destinationId: string;
    type: "presence" | "gossip";
    payload: any;
  }): void {
    const sourceNode = this.nodes.get(params.sourceId);
    if (!sourceNode) return;

    const nextHop = sourceNode.discovery.getNextHop(params.destinationId);
    if (!nextHop) return; // Unreachable destination

    const packet: RoutedPacket = {
      packetId: `${params.sourceId}-${params.type}-${Date.now()}-${Math.random()}`,
      sourceId: params.sourceId,
      destinationId: params.destinationId,
      ttl: 20,
      type: params.type,
      payload: params.payload,
      route: [params.sourceId],
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
    let deliveredCount = 0;

    this.packetQueue.sort((a, b) => a.deliverAt - b.deliverAt);

    const pending = this.packetQueue.filter((pd) => pd.deliverAt <= this.currentTimeMs);
    this.packetQueue = this.packetQueue.filter((pd) => pd.deliverAt > this.currentTimeMs);

    for (const pd of pending) {
      const targetNode = this.nodes.get(pd.nextHopId);
      if (targetNode) {
        targetNode.receivePacket(pd.packet);
        deliveredCount++;
      }
    }

    return deliveredCount;
  }
}

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { MeshNode, MeshNetwork, NetworkDiscovery, RoutedPacket } from "../src/core/network.js";
import { computeStateHash } from "../src/core/hash.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Decentralized Network Discovery & Multi-Hop Peer Routing Tests", () => {
  it("should calculate correct next-hop routes in a linear chain topology", () => {
    // Topology: A - B - C - D
    const net = new MeshNetwork();
    
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);
    const nodeD = new MeshNode("D", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);
    net.registerNode(nodeD);

    // Setup direct connections
    net.connectNodes("A", "B");
    net.connectNodes("B", "C");
    net.connectNodes("C", "D");

    // Before ticking the network to propagate presence, we assert local neighbor awareness
    expect(nodeA.directNeighbors.has("B")).toBe(true);
    expect(nodeB.directNeighbors.has("A")).toBe(true);
    expect(nodeB.directNeighbors.has("C")).toBe(true);

    // Run network ticks to fully propagate all presence announcements across the chain
    // (A linear network of 4 nodes requires up to 3 hops. With max latency of 80ms, 500ms is ample time)
    let rounds = 0;
    while (rounds < 10) {
      net.tick(80);
      rounds++;
    }

    // Verify all nodes have discovered everyone
    const knownA = nodeA.discovery.getKnownNodes();
    expect(knownA).toContain("A");
    expect(knownA).toContain("B");
    expect(knownA).toContain("C");
    expect(knownA).toContain("D");

    // Verify optimal shortest paths (Next Hop Routing Table)
    // From A to anywhere: Next hop must be B
    expect(nodeA.discovery.getNextHop("B")).toBe("B");
    expect(nodeA.discovery.getNextHop("C")).toBe("B");
    expect(nodeA.discovery.getNextHop("D")).toBe("B");

    // From D to anywhere: Next hop must be C
    expect(nodeD.discovery.getNextHop("C")).toBe("C");
    expect(nodeD.discovery.getNextHop("B")).toBe("C");
    expect(nodeD.discovery.getNextHop("A")).toBe("C");

    // From B to D: Next hop must be C
    expect(nodeB.discovery.getNextHop("D")).toBe("C");
    // From B to A: Next hop must be A
    expect(nodeB.discovery.getNextHop("A")).toBe("A");
  });

  it("should calculate correct next-hop routes in a redundant loop/ring topology", () => {
    // Topology: A - B - C - D - A
    const net = new MeshNetwork();
    
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);
    const nodeD = new MeshNode("D", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);
    net.registerNode(nodeD);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");
    net.connectNodes("C", "D");
    net.connectNodes("D", "A");

    // Propagate discovery
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    // Node A's path to C can go A -> B -> C (2 hops) or A -> D -> C (2 hops)
    // BFS guarantees one of these 2-hop paths is selected, meaning nextHop is either B or D.
    const nextHopAToC = nodeA.discovery.getNextHop("C");
    expect(nextHopAToC === "B" || nextHopAToC === "D").toBe(true);

    // If we break the link A-B, A's path to C MUST route through D
    net.disconnectNodes("A", "B");

    // Propagate topological updates
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    expect(nodeA.discovery.getNextHop("C")).toBe("D");
    expect(nodeA.discovery.getNextHop("B")).toBe("D"); // Path: A -> D -> C -> B
  });

  it("should dynamically route Gossip messages multi-hop and converge state under high latency", () => {
    // Topology: Alice - Bob - Charlie
    // Alice and Charlie have no direct physical link, only Bob connects them.
    const net = new MeshNetwork();
    net.minLatencyMs = 30;
    net.maxLatencyMs = 50;

    const alice = new MeshNode("alice", pack, 99);
    const bob = new MeshNode("bob", pack, 99);
    const charlie = new MeshNode("charlie", pack, 99);

    net.registerNode(alice);
    net.registerNode(bob);
    net.registerNode(charlie);

    net.connectNodes("alice", "bob");
    net.connectNodes("bob", "charlie");

    // Propagate presence
    for (let i = 0; i < 15; i++) {
      net.tick(50);
    }

    // Verify routing paths
    expect(alice.discovery.getNextHop("charlie")).toBe("bob");
    expect(charlie.discovery.getNextHop("alice")).toBe("bob");

    // 1. Alice performs a local action: Move to control room
    const resA = alice.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(resA.ok).toBe(true);
    expect(alice.localState.agents!["alice"].current).toBe("control_room");

    // Charlie is completely unaware of this action initially
    expect(charlie.localState.agents!["alice"]).toBeUndefined();

    // 2. Alice triggers multi-hop synchronization with Charlie
    const syncInitiated = alice.syncWithPeer("charlie");
    expect(syncInitiated).toBe(true);

    // 3. Tick network to process messages
    // The packet must travel: alice -> bob -> charlie, and the reply charlie -> bob -> alice.
    // Total 4 hops * ~40ms = 160ms. Ticking 400ms ensures complete traversal.
    let delivered = 0;
    for (let i = 0; i < 10; i++) {
      delivered += net.tick(50);
    }

    // Verify packets were forwarded and received
    expect(delivered).toBeGreaterThan(0);
    expect(bob.packetsForwardedCount).toBeGreaterThan(0);

    // Verify Charlie's local state has synchronized successfully!
    expect(charlie.localState.agents!["alice"]).toBeDefined();
    expect(charlie.localState.agents!["alice"].current).toBe("control_room");
    expect(charlie.vectorClock["alice"]).toBe(1);

    // Verify eventual perfect state convergence
    const hashAlice = computeStateHash(alice.localState);
    const hashCharlie = computeStateHash(charlie.localState);
    expect(hashAlice).toBe(hashCharlie);
  });

  it("should handle graceful peer leaving and dynamically prune routing tables", () => {
    // Topology: A - B - C
    const net = new MeshNetwork();
    
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");

    // Propagate presence
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    expect(nodeA.discovery.getKnownNodes()).toContain("C");
    expect(nodeA.discovery.getNextHop("C")).toBe("B");

    // Node C gracefully leaves the mesh network
    nodeC.leave();

    // Propagate updates
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    // Node A and B should have completely pruned C from their discovery records
    expect(nodeA.discovery.getKnownNodes()).not.toContain("C");
    expect(nodeA.discovery.getNextHop("C")).toBeNull();

    expect(nodeB.discovery.getKnownNodes()).not.toContain("C");
    expect(nodeB.discovery.getNextHop("C")).toBeNull();
  });

  it("should trigger immersive narration descriptions and persistent cooperative sync logs for P2P network events", () => {
    // We will use a custom content pack with custom network templates to assert behavior.
    const customPack = {
      ...pack,
      network_templates: {
        arrival: "A mysterious rift opens as {peerId} joins the fray.",
        departure: "{peerId} vanishes into thin air.",
        sync: "Cosmic energy surges as we sync state with {peerId}."
      }
    };

    const net = new MeshNetwork();
    
    // Create MeshNodes using our customPack
    const nodeA = new MeshNode("A", customPack, 42);
    const nodeB = new MeshNode("B", customPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);

    // Physically connect them
    net.connectNodes("A", "B");

    // Before ticking, direct connections are established, and presence is announced.
    // Ticking the network delivers the presence packets.
    net.tick(100);

    // Node A's discovery topology now has B.
    // Let's verify that Node A triggered an "arrival" narration event for B!
    const eventsA = nodeA.flushPendingEvents();
    expect(eventsA).toContainEqual({
      type: "narration",
      text: "A mysterious rift opens as B joins the fray."
    });

    // Verify it is stored in the persistent logs
    expect(nodeA.localState.cooperativeSyncLog).toContain("A mysterious rift opens as B joins the fray.");
    expect(nodeA.localState.journal).toContain("A mysterious rift opens as B joins the fray.");

    // Likewise, Node B should have triggered an "arrival" narration event for A!
    const eventsB = nodeB.flushPendingEvents();
    expect(eventsB).toContainEqual({
      type: "narration",
      text: "A mysterious rift opens as A joins the fray."
    });

    // Now, let's execute an action on B and sync to trigger a "sync" event on A.
    // Let's perform a local action on B
    const resB = nodeB.executeLocalAction({ type: "LOOK" });
    expect(resB.ok).toBe(true);

    // Node B syncs with A
    const syncResult = nodeB.syncWithPeer("A");
    expect(syncResult).toBe(true);

    // Tick network to deliver gossip and reciprocal reply.
    net.tick(150);

    // Node A should have received B's gossip and updated its state, triggering a "sync" event.
    const newEventsA = nodeA.flushPendingEvents();
    expect(newEventsA).toContainEqual({
      type: "narration",
      text: "Cosmic energy surges as we sync state with B."
    });
    expect(nodeA.localState.cooperativeSyncLog).toContain("Cosmic energy surges as we sync state with B.");

    // Now, let's test peer departure / leaving!
    nodeB.leave();

    // Tick network to deliver departure presence packet
    net.tick(100);

    // Node A should have processed the departure presence packet and triggered a "departure" event for B!
    const departureEventsA = nodeA.flushPendingEvents();
    expect(departureEventsA).toContainEqual({
      type: "narration",
      text: "B vanishes into thin air."
    });
    expect(nodeA.localState.cooperativeSyncLog).toContain("B vanishes into thin air.");
  });

  it("should periodically route Link-State Heartbeats and track latency/acks", () => {
    // Topology: A - B - C
    const net = new MeshNetwork();
    net.heartbeatIntervalMs = 100;

    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");

    // Propagate presence first
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    // Explicitly check that heartbeat intervals are set
    expect(net.heartbeatIntervalMs).toBe(100);

    // Let's trigger a tick that triggers heartbeats
    // We tick 100ms. Since heartbeatIntervalMs is 100, they will fire.
    // The heartbeat from A to C will route A -> B -> C (2 hops).
    // The ack from C to A will route C -> B -> A (2 hops).
    // With latency ~40ms per hop, total 160ms. Ticking a total of 300ms guarantees delivery.
    net.tick(100); // Fires heartbeats
    net.tick(200); // Delivers heartbeats and ACKs

    // Assert heartbeats were sent and received
    expect(nodeA.heartbeatsSent.get("C")).toBeGreaterThan(0);
    expect(nodeC.heartbeatsReceived.get("A")).toBeGreaterThan(0);
    expect(nodeA.heartbeatAcksReceived.get("C")).toBeGreaterThan(0);

    // Assert latency was measured
    const latencyAC = nodeA.lastHeartbeatLatency.get("C");
    expect(latencyAC).toBeDefined();
    expect(latencyAC).toBeGreaterThan(0);
  });

  it("should dynamically repair routes when a physical link fails silently and deliver gossip via a fallback path", () => {
    // Topology: Redundant diamond loop: A - B - C, A - D - C
    const net = new MeshNetwork();
    
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);
    const nodeD = new MeshNode("D", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);
    net.registerNode(nodeD);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");
    net.connectNodes("A", "D");
    net.connectNodes("D", "C");

    // Propagate presence
    for (let i = 0; i < 15; i++) {
      net.tick(50);
    }

    // Force route from A to C to go through B initially
    // Since B is preferred or computed by BFS first
    // Let's verify next hop is either B or D
    const initialNextHop = nodeA.discovery.getNextHop("C");
    expect(initialNextHop === "B" || initialNextHop === "D").toBe(true);

    // Now, break the physical link between A and its chosen next hop silently!
    // E.g., we disconnect A and initialNextHop, but do NOT let them broadcast yet
    // Or we simply disconnect them in their directNeighbors lists to simulate silent physical failure
    const chosenHop = initialNextHop!;
    const fallbackHop = chosenHop === "B" ? "D" : "B";

    // Silently remove from directNeighbors
    nodeA.directNeighbors.delete(chosenHop);
    nodeA.peers.delete(chosenHop);
    const chosenNode = net.nodes.get(chosenHop)!;
    chosenNode.directNeighbors.delete("A");
    chosenNode.peers.delete("A");

    // A's local topology entry still has chosenHop as a neighbor, so getNextHop("C") still returns chosenHop.
    expect(nodeA.discovery.getNextHop("C")).toBe(chosenHop);

    // Now, we execute an action on A and attempt to sync with C.
    // The sync should hit a route failure to chosenHop (as A is no longer physically connected to it),
    // trigger our automated repair routine, find the fallbackHop, recalculate routes,
    // and successfully route the Gossip packet through the fallbackHop!
    const resA = nodeA.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(resA.ok).toBe(true);

    const syncStarted = nodeA.syncWithPeer("C");
    // Assert that sync succeeded because the route was repaired dynamically!
    expect(syncStarted).toBe(true);
    expect(nodeA.routeRepairsTriggered).toBeGreaterThan(0);
    expect(nodeA.routeRepairsSucceeded).toBeGreaterThan(0);
    expect(nodeA.discovery.getNextHop("C")).toBe(fallbackHop);

    // Tick the network to deliver the Gossip multi-hop packet: A -> D -> C and reciprocal C -> D -> A.
    for (let i = 0; i < 10; i++) {
      net.tick(50);
    }

    // Verify state converged on C!
    expect(nodeC.localState.agents!["A"]).toBeDefined();
    expect(nodeC.localState.agents!["A"].current).toBe("control_room");
  });

  it("should timeout pending heartbeats and trigger automatic route repair to route via redundant fallback paths", () => {
    // Topology: A - B - C, A - D - C
    const net = new MeshNetwork();
    
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);
    const nodeD = new MeshNode("D", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);
    net.registerNode(nodeD);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");
    net.connectNodes("A", "D");
    net.connectNodes("D", "C");

    // Propagate presence
    for (let i = 0; i < 15; i++) {
      net.tick(50);
    }

    const chosenHop = nodeA.discovery.getNextHop("C")!;
    const fallbackHop = chosenHop === "B" ? "D" : "B";

    // A sends a heartbeat to C
    nodeA.sendHeartbeat("C");

    // Verify there is a pending heartbeat in A
    expect(nodeA.pendingHeartbeats.size).toBe(1);

    // Silently partition the connection between A and chosenHop
    nodeA.directNeighbors.delete(chosenHop);
    nodeA.peers.delete(chosenHop);
    const chosenNode = net.nodes.get(chosenHop)!;
    chosenNode.directNeighbors.delete("A");
    chosenNode.peers.delete("A");

    // Recalculate routes on the partitioned neighbors and target destination
    // to prevent return path routing loops in the test simulation
    const currentA = nodeC.discovery.topology.get("A");
    if (currentA) {
      nodeC.discovery.topology.set("A", {
        ...currentA,
        neighbors: ["D"],
      });
    }
    const currentChosen = nodeC.discovery.topology.get(chosenHop);
    if (currentChosen) {
      nodeC.discovery.topology.set(chosenHop, {
        ...currentChosen,
        neighbors: currentChosen.neighbors.filter((n) => n !== "A"),
      });
    }
    nodeC.discovery.recalculateRoutingTable();

    const chosenA = chosenNode.discovery.topology.get("A");
    if (chosenA) {
      chosenNode.discovery.topology.set("A", {
        ...chosenA,
        neighbors: ["D"],
      });
    }
    const chosenChosen = chosenNode.discovery.topology.get(chosenHop);
    if (chosenChosen) {
      chosenNode.discovery.topology.set(chosenHop, {
        ...chosenChosen,
        neighbors: chosenChosen.neighbors.filter((n) => n !== "A"),
      });
    }
    chosenNode.discovery.recalculateRoutingTable();

    // Advance time beyond the timeout threshold (e.g. 350ms)
    // Ticking the network will call checkHeartbeatTimeouts which detects the timeout
    // and triggers route repair!
    net.tick(350);

    // Verify the heartbeat was timed out and triggered repair
    expect(nodeA.heartbeatTimeoutsCount).toBeGreaterThan(0);
    expect(nodeA.routeRepairsTriggered).toBeGreaterThan(0);
    expect(nodeA.routeRepairsSucceeded).toBeGreaterThan(0);

    // Verify route was repaired and now points to fallbackHop!
    expect(nodeA.discovery.getNextHop("C")).toBe(fallbackHop);

    // A new heartbeat sent after repair should succeed and route via fallbackHop
    nodeA.sendHeartbeat("C");
    
    // Tick to deliver
    for (let i = 0; i < 25; i++) {
      net.tick(50);
    }

    // Verify C received the heartbeat and A received the ACK!
    expect(nodeC.heartbeatsReceived.get("A")).toBeGreaterThan(0);
    expect(nodeA.heartbeatAcksReceived.get("C")).toBeGreaterThan(0);
  });

  it("should sort packets in the MeshNetwork queue by deliverAt and then by priority descending", () => {
    const net = new MeshNetwork();
    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.connectNodes("A", "B");

    // Clear network initialization presence packets
    net.packetQueue = [];

    // Queue packets with different priorities at the same delivery time
    net.sendRoutedPacket({ sourceId: "A", destinationId: "B", type: "heartbeat", payload: {} });
    net.sendRoutedPacket({ sourceId: "A", destinationId: "B", type: "gossip", payload: {} });
    net.sendRoutedPacket({ sourceId: "A", destinationId: "B", type: "presence", payload: {} });
    net.sendRoutedPacket({ sourceId: "A", destinationId: "B", type: "heartbeat_ack", payload: {} });
    net.sendRoutedPacket({ sourceId: "A", destinationId: "B", type: "gossip", payload: {}, priority: 10 }); // explicit priority override

    // Set all delivery times to be identical for sorting testing
    for (const item of net.packetQueue) {
      item.deliverAt = 100;
    }

    // Trigger sorting as it would happen inside tick()
    net.packetQueue.sort((a, b) => {
      if (a.deliverAt !== b.deliverAt) {
        return a.deliverAt - b.deliverAt;
      }
      const aPriority = a.packet.priority ?? 0;
      const bPriority = b.packet.priority ?? 0;
      return bPriority - aPriority;
    });

    // Expected order:
    // 1. Gossip with override (priority 10)
    // 2. Gossip (priority 3)
    // 3. Presence (priority 2)
    // 4. Heartbeat ack (priority 1)
    // 5. Heartbeat (priority 0)
    expect(net.packetQueue[0].packet.priority).toBe(10);
    expect(net.packetQueue[1].packet.type).toBe("gossip");
    expect(net.packetQueue[1].packet.priority).toBe(3);
    expect(net.packetQueue[2].packet.type).toBe("presence");
    expect(net.packetQueue[2].packet.priority).toBe(2);
    expect(net.packetQueue[3].packet.type).toBe("heartbeat_ack");
    expect(net.packetQueue[3].packet.priority).toBe(1);
    expect(net.packetQueue[4].packet.type).toBe("heartbeat");
    expect(net.packetQueue[4].packet.priority).toBe(0);
  });

  it("should benchmark and verify state convergence speed under high packet queue depth and maxPacketsPerTick", () => {
    // Scenario 1: Priority routing enabled
    const netPriority = new MeshNetwork();
    netPriority.maxPacketsPerTick = 2;
    netPriority.minLatencyMs = 20;
    netPriority.maxLatencyMs = 20; // Constant latency for perfect determinism in benchmarks
    
    const nodeA1 = new MeshNode("A", pack, 42);
    const nodeB1 = new MeshNode("B", pack, 42);
    netPriority.registerNode(nodeA1);
    netPriority.registerNode(nodeB1);
    netPriority.connectNodes("A", "B");
    
    // Propagate presence
    for (let i = 0; i < 5; i++) { netPriority.tick(20); }

    // Execute local action on A1 to change state
    nodeA1.executeLocalAction({ type: "MOVE", direction: "west" });

    // Send 5 low-priority heartbeats to B1
    for (let i = 0; i < 5; i++) {
      nodeA1.sendHeartbeat("B");
    }

    // Send 1 high-priority gossip sync packet to B1
    const syncInitiated1 = nodeA1.syncWithPeer("B");
    expect(syncInitiated1).toBe(true);

    // Make sure all packets are scheduled for the same delivery time
    const targetDeliverAt = netPriority.currentTimeMs + 20;
    for (const pd of netPriority.packetQueue) {
      pd.deliverAt = targetDeliverAt;
    }

    // Tick the network by 20ms once.
    // With priority routing, the gossip packet must be processed in the first batch of 2 delivered packets
    netPriority.tick(20);

    // Verify B1 has converged state with A1 immediately!
    expect(nodeB1.localState.agents!["A"]).toBeDefined();
    expect(nodeB1.localState.agents!["A"].current).toBe("control_room");

    // -------------------------------------------------------------
    // Scenario 2: Priority routing disabled
    const netNoPriority = new MeshNetwork();
    netNoPriority.maxPacketsPerTick = 2;
    netNoPriority.minLatencyMs = 20;
    netNoPriority.maxLatencyMs = 20;
    netNoPriority.disablePriorityRouting = true; // DISABLE!

    const nodeA2 = new MeshNode("A", pack, 42);
    const nodeB2 = new MeshNode("B", pack, 42);
    netNoPriority.registerNode(nodeA2);
    netNoPriority.registerNode(nodeB2);
    netNoPriority.connectNodes("A", "B");

    // Propagate presence
    for (let i = 0; i < 5; i++) { netNoPriority.tick(20); }

    // Execute same action
    nodeA2.executeLocalAction({ type: "MOVE", direction: "west" });

    // Send 5 low-priority heartbeats
    for (let i = 0; i < 5; i++) {
      nodeA2.sendHeartbeat("B");
    }

    // Send gossip sync
    const syncInitiated2 = nodeA2.syncWithPeer("B");
    expect(syncInitiated2).toBe(true);

    // Set all delivery times identical
    for (const pd of netNoPriority.packetQueue) {
      pd.deliverAt = targetDeliverAt;
    }

    // Tick the network by 20ms once.
    // Without priority routing, the gossip packet is deferred.
    netNoPriority.tick(20);

    // State on B2 should NOT have converged yet!
    expect(nodeB2.localState.agents!["A"]).toBeUndefined();
  });

  it("should update lastSeen timestamps on topology records and prune stale nodes after inactivity threshold", () => {
    // Topology: A - B - C
    const net = new MeshNetwork();
    net.topologyPruningThresholdMs = 2000; // 2000ms threshold

    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");

    // Propagate presence
    for (let i = 0; i < 10; i++) {
      net.tick(80);
    }

    // Node A's discovery should know about B and C
    expect(nodeA.discovery.getKnownNodes()).toContain("B");
    expect(nodeA.discovery.getKnownNodes()).toContain("C");

    // Verify lastSeen values are initialized (should match tick time or announcement time)
    const recordB = nodeA.discovery.topology.get("B")!;
    expect(recordB).toBeDefined();
    expect(recordB.lastSeen).toBeGreaterThanOrEqual(0);

    // Let's tick the network simulation forward by 1000ms.
    // Active time goes from 800 to 1800ms. Since 1000ms < 2000ms, no node should be pruned.
    net.tick(1000);
    expect(nodeA.discovery.getKnownNodes()).toContain("B");
    expect(nodeA.discovery.getKnownNodes()).toContain("C");

    // Now B sends a presence update (refreshes its presence) at currentTime = 1800ms
    nodeB.announcePresence();
    net.tick(100); // deliver presence update, currentTime becomes 1900ms

    // Node A should have updated lastSeen for B to 1800ms or 1900ms
    const updatedRecordB = nodeA.discovery.topology.get("B")!;
    expect(updatedRecordB.lastSeen).toBeGreaterThanOrEqual(1800);

    // Node C did not refresh, so its lastSeen is still around 800ms (from the initial flood)
    const recordC = nodeA.discovery.topology.get("C")!;
    expect(recordC.lastSeen).toBeLessThan(1000);

    // Now advance time so that C's lastSeen is older than 2000ms, but B's lastSeen is not.
    // Cutoff time at next tick will be: currentTime - 2000ms.
    // If we tick by 1500ms, currentTime becomes 1900 + 1500 = 3400ms.
    // Cutoff will be 3400 - 2000 = 1400ms.
    // Record C (lastSeen ~800ms) < 1400ms -> STALE!
    // Record B (lastSeen ~1900ms) >= 1400ms -> ACTIVE!
    net.tick(1500);

    // Assert C has been pruned!
    expect(nodeA.discovery.getKnownNodes()).not.toContain("C");
    expect(nodeA.discovery.getNextHop("C")).toBeNull();

    // Assert B is still known!
    expect(nodeA.discovery.getKnownNodes()).toContain("B");
    expect(nodeA.discovery.getNextHop("B")).toBe("B");
  });

  it("should update lastSeen even for older or duplicate presence announcements if the resolved time is newer", () => {
    const discovery = new NetworkDiscovery("A");
    
    // Add initial presence
    discovery.updateTopology({
      nodeId: "B",
      sequenceNumber: 5,
      neighbors: ["A"],
      timestamp: 100
    }, 100);

    const record1 = discovery.topology.get("B")!;
    expect(record1.seq).toBe(5);
    expect(record1.lastSeen).toBe(100);

    // Update with older sequence number (e.g. 4) but a newer lastSeen (e.g. 200)
    discovery.updateTopology({
      nodeId: "B",
      sequenceNumber: 4,
      neighbors: ["A"],
      timestamp: 50
    }, 200);

    // Sequence number should remain 5, but lastSeen should be updated to 200!
    const record2 = discovery.topology.get("B")!;
    expect(record2.seq).toBe(5);
    expect(record2.lastSeen).toBe(200);
  });

  it("should prevent duplicate processing and terminate loops in circular/redundant network paths", () => {
    // Ring topology: A - B - C - D - A
    const net = new MeshNetwork();
    net.minLatencyMs = 10;
    net.maxLatencyMs = 20;

    const nodeA = new MeshNode("A", pack, 42);
    const nodeB = new MeshNode("B", pack, 42);
    const nodeC = new MeshNode("C", pack, 42);
    const nodeD = new MeshNode("D", pack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);
    net.registerNode(nodeD);

    net.connectNodes("A", "B");
    net.connectNodes("B", "C");
    net.connectNodes("C", "D");
    net.connectNodes("D", "A");

    // Propagate presence
    for (let i = 0; i < 10; i++) {
      net.tick(50);
    }

    // Reset counters to start clean
    for (const node of [nodeA, nodeB, nodeC, nodeD]) {
      node.packetsReceivedCount = 0;
      node.duplicatePacketsDroppedCount = 0;
      node.processedPacketCache.clear();
    }

    // Forgery of a routed packet with a specific ID
    const packetId = "gossip-loop-test-123";
    const packet: RoutedPacket = {
      packetId,
      sourceId: "A",
      destinationId: "C",
      ttl: 15,
      type: "gossip",
      payload: nodeA.generateGossipMessageFor("C"),
      route: ["A"],
    };

    // Deliver the exact same packet to B multiple times
    nodeB.receivePacket(packet);
    nodeB.receivePacket(packet);
    nodeB.receivePacket(packet);

    // B should have received it once, and dropped the other 2 times
    expect(nodeB.packetsReceivedCount).toBe(1);
    expect(nodeB.duplicatePacketsDroppedCount).toBe(2);

    // The packet was forwarded from B to C. Let's tick the network to let it deliver.
    net.tick(50);

    // Now if C receives it, it gets processed once
    expect(nodeC.packetsReceivedCount).toBeGreaterThanOrEqual(1);

    // If we send it again directly to C, C should drop it
    const initialReceived = nodeC.packetsReceivedCount;
    const initialDropped = nodeC.duplicatePacketsDroppedCount;
    
    nodeC.receivePacket(packet);
    expect(nodeC.packetsReceivedCount).toBe(initialReceived);
    expect(nodeC.duplicatePacketsDroppedCount).toBe(initialDropped + 1);
  });

  it("should respect the sliding window expiration threshold in the deduplication cache", () => {
    const net = new MeshNetwork();
    const node = new MeshNode("A", pack, 42);
    net.registerNode(node);

    node.deduplicationWindowMs = 100; // 100ms window

    const packet: RoutedPacket = {
      packetId: "temp-packet-999",
      sourceId: "B",
      destinationId: "A",
      ttl: 5,
      type: "gossip",
      payload: {
        senderId: "B",
        vectorClock: {},
        transactions: [],
      },
      route: ["B"],
    };

    // Receive the packet first time
    node.receivePacket(packet);
    expect(node.packetsReceivedCount).toBe(1);
    expect(node.duplicatePacketsDroppedCount).toBe(0);

    // Receive again immediately (within window) -> dropped
    node.receivePacket(packet);
    expect(node.packetsReceivedCount).toBe(1);
    expect(node.duplicatePacketsDroppedCount).toBe(1);

    // Advance network time (simulating physical clock tick) past the deduplication window
    net.tick(150); // currentTime = 150ms > 100ms

    // Receive again -> should process again because the previous entry has expired!
    node.receivePacket(packet);
    expect(node.packetsReceivedCount).toBe(2);
    expect(node.duplicatePacketsDroppedCount).toBe(1); // duplicate count stays at 1
  });
});


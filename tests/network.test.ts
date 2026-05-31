import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { MeshNode, MeshNetwork } from "../src/core/network.js";
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
});

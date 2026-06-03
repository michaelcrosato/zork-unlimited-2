import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { GossipAntiEntropyRecovery } from "../src/core/anti_entropy.js";
import { GossipNode, isClockBehind } from "../src/core/gossip.js";
import { MeshNode, MeshNetwork } from "../src/core/network.js";
import { computeStateHash } from "../src/core/hash.js";
import { Transaction } from "../src/core/state.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Gossip Anti-Entropy Recovery Mechanism Tests", () => {
  it("should compute stable deterministic Merkle Tree roots for transactions", () => {
    const emptyRoot = GossipAntiEntropyRecovery.computeMerkleRoot([]);
    expect(emptyRoot).toBeDefined();
    expect(emptyRoot.length).toBe(64);

    const tx1: Transaction = {
      agentId: "alice",
      sequenceNumber: 1,
      action: { type: "MOVE", direction: "west" },
      stateHashBefore: "hash1",
      stateHashAfter: "hash2",
      timestamp: 1000,
      ok: true,
    };

    const tx2: Transaction = {
      agentId: "bob",
      sequenceNumber: 1,
      action: { type: "LOOK" },
      stateHashBefore: "hash2",
      stateHashAfter: "hash3",
      timestamp: 1001,
      ok: true,
    };

    const rootA = GossipAntiEntropyRecovery.computeMerkleRoot([tx1, tx2]);
    const rootB = GossipAntiEntropyRecovery.computeMerkleRoot([tx1, tx2]);
    expect(rootA).toBe(rootB);

    // Rearranging transactions must produce a different root
    const rootC = GossipAntiEntropyRecovery.computeMerkleRoot([tx2, tx1]);
    expect(rootA).not.toBe(rootC);

    // Modifying a single field in a transaction must produce a different root
    const tx1Modified = { ...tx1, timestamp: 9999 };
    const rootD = GossipAntiEntropyRecovery.computeMerkleRoot([tx1Modified, tx2]);
    expect(rootA).not.toBe(rootD);
  });

  it("should compute stable, sorted, deterministic condensed clock hashes", () => {
    const clock1 = { alice: 3, bob: 2, charlie: 5 };
    const clock2 = { charlie: 5, bob: 2, alice: 3 }; // Different insertion order

    const hash1 = GossipAntiEntropyRecovery.computeCondensedClockHash(clock1);
    const hash2 = GossipAntiEntropyRecovery.computeCondensedClockHash(clock2);

    expect(hash1).toBe(hash2);

    const clock3 = { alice: 3, bob: 3, charlie: 5 }; // Bob advanced
    const hash3 = GossipAntiEntropyRecovery.computeCondensedClockHash(clock3);

    expect(hash1).not.toBe(hash3);
  });

  it("should successfully trigger background recovery and converge nodes after a long network partition", () => {
    const net = new MeshNetwork();
    net.minLatencyMs = 10;
    net.maxLatencyMs = 20;

    const alice = new MeshNode("alice", pack, 42);
    const bob = new MeshNode("bob", pack, 42);
    const charlie = new MeshNode("charlie", pack, 42);

    net.registerNode(alice);
    net.registerNode(bob);
    net.registerNode(charlie);

    net.connectNodes("alice", "bob");
    net.connectNodes("bob", "charlie");

    // Let presence propagate fully
    for (let i = 0; i < 10; i++) {
      net.tick(30);
    }

    // Assert initial topology awareness
    expect(alice.discovery.getNextHop("charlie")).toBe("bob");
    expect(charlie.discovery.getNextHop("alice")).toBe("bob");

    // Partition charlie from bob (entirely separating charlie from alice and bob)
    net.disconnectNodes("bob", "charlie");

    // Let the partition settle topology-wise
    for (let i = 0; i < 10; i++) {
      net.tick(30);
    }

    // Now, perform concurrent decoupled local actions
    // Alice moves west (control room)
    const actA1 = alice.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(actA1.ok).toBe(true);
    // Alice unlocks the cage
    const actA2 = alice.executeLocalAction({ type: "USE", item: "lever", target: "lever" });
    expect(actA2.ok).toBe(true);

    // Charlie looks in the forest (keeping him in the clearing but advancing clock)
    const actC1 = charlie.executeLocalAction({ type: "LOOK" });
    expect(actC1.ok).toBe(true);

    // Verify clocks/states have diverged
    expect(alice.vectorClock["alice"]).toBe(2);
    expect(alice.vectorClock["charlie"] ?? 0).toBe(0);
    expect(charlie.vectorClock["charlie"]).toBe(1);
    expect(charlie.vectorClock["alice"] ?? 0).toBe(0);

    const hashAlicePre = computeStateHash(alice.localState);
    const hashCharliePre = computeStateHash(charlie.localState);
    expect(hashAlicePre).not.toBe(hashCharliePre);

    // Reconnect charlie
    net.connectNodes("bob", "charlie");

    // Let presence propagate so routing tables heal
    for (let i = 0; i < 10; i++) {
      net.tick(30);
    }

    // Trigger Anti-Entropy background recovery
    net.antiEntropyIntervalMs = 100;

    // Tick the network to fire the anti-entropy check and deliver all packets
    // Anti-entropy will exchange digests, identify that alice/bob/charlie are out of sync,
    // generate anti_entropy_requests, send delta GossipMessages, and merge them.
    for (let i = 0; i < 20; i++) {
      net.tick(50);
    }

    // Assert complete convergence
    const hashAlicePost = computeStateHash(alice.localState);
    const hashBobPost = computeStateHash(bob.localState);
    const hashCharliePost = computeStateHash(charlie.localState);

    expect(hashAlicePost).toBe(hashCharliePost);
    expect(hashAlicePost).toBe(hashBobPost);

    // Clocks must be fully synced
    expect(alice.vectorClock).toEqual({ alice: 2, bob: 0, charlie: 1 });
    expect(charlie.vectorClock).toEqual({ alice: 2, bob: 0, charlie: 1 });
    expect(bob.vectorClock).toEqual({ alice: 2, bob: 0, charlie: 1 });

    // MONOTONIC flags / chests should be fully synchronized
    expect(charlie.localState.flags["cage_locked"]).toBe(false);
  });
});

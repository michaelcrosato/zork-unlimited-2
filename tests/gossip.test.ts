import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { GossipNode, isClockBehind, mergeVectorClocks } from "../src/core/gossip.js";
import { computeStateHash } from "../src/core/hash.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Distributed Gossip Protocol & Peer Synchronization Tests", () => {
  it("should correctly identify out-of-sync vector clocks", () => {
    const vcA = { alice: 3, bob: 1 };
    const vcB = { alice: 2, bob: 2 };
    const vcC = { alice: 3, bob: 1, charlie: 1 };

    // B is ahead of A on bob (2 > 1)
    expect(isClockBehind(vcA, vcB)).toBe(true);

    // A is ahead of B on alice (3 > 2)
    expect(isClockBehind(vcB, vcA)).toBe(true);

    // C is ahead of A on charlie (1 > 0)
    expect(isClockBehind(vcA, vcC)).toBe(true);

    // A is NOT ahead of C on any component
    expect(isClockBehind(vcC, vcA)).toBe(false);
  });

  it("should merge vector clocks taking component-wise maximums", () => {
    const vcA = { alice: 3, bob: 1 };
    const vcB = { alice: 2, bob: 2, charlie: 5 };

    const merged = mergeVectorClocks(vcA, vcB);
    expect(merged).toEqual({
      alice: 3,
      bob: 2,
      charlie: 5,
    });
  });

  it("should synchronize two connected nodes on local actions", () => {
    const nodeA = new GossipNode("alice", pack, 42);
    const nodeB = new GossipNode("bob", pack, 42);

    nodeA.connect(nodeB);

    // Alice executes a local move to the west (control room)
    const resA = nodeA.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(resA.ok).toBe(true);
    expect(nodeA.localState.agents!["alice"].current).toBe("control_room");

    // Before gossip, Bob does not know about Alice's move
    expect(nodeB.localState.agents!["alice"]).toBeUndefined();
    expect(nodeB.vectorClock["alice"] ?? 0).toBe(0);

    // Trigger gossip sync round
    const syncCount = nodeA.gossip();
    expect(syncCount).toBe(1); // 1 peer (Bob) got updated

    // After gossip, Bob has synchronized Alice's state and transaction
    expect(nodeB.localState.agents!["alice"]).toBeDefined();
    expect(nodeB.localState.agents!["alice"].current).toBe("control_room");
    expect(nodeB.vectorClock["alice"]).toBe(1);

    // Sync back so Alice also learns of Bob's existence and clock status
    nodeB.gossip();

    // Assert both nodes have identical states and hashes
    const hashA = computeStateHash(nodeA.localState);
    const hashB = computeStateHash(nodeB.localState);
    expect(hashA).toBe(hashB);
  });

  it("should simulate a temporary network partition, concurrent decoupled modifications, and eventual convergence upon recovery", () => {
    const nodeA = new GossipNode("alice", pack, 99);
    const nodeB = new GossipNode("bob", pack, 99);

    // 1. Initial connection and sync of their existence
    nodeA.connect(nodeB);
    nodeA.gossip();
    nodeB.gossip();

    expect(nodeA.localState.agents!["bob"]).toBeDefined();
    expect(nodeB.localState.agents!["alice"]).toBeDefined();

    // 2. Network Partition: disconnect the nodes
    nodeA.disconnect("bob");
    // Verify they are disconnected
    expect(nodeA.peers.has("bob")).toBe(false);
    expect(nodeB.peers.has("alice")).toBe(false);

    // 3. Alice performs local actions in partition
    // Alice moves west (control room)
    const moveRes = nodeA.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(moveRes.ok).toBe(true);
    // Alice pulls the lever to unlock the cage
    const useRes = nodeA.executeLocalAction({ type: "USE", item: "lever", target: "lever" });
    expect(useRes.ok).toBe(true);

    // Assert Alice's local state changes
    expect(nodeA.localState.agents!["alice"].current).toBe("control_room");
    expect(nodeA.localState.flags["cage_locked"]).toBe(false);
    expect(nodeA.vectorClock["alice"]).toBe(2);

    // 4. Bob performs local actions in partition concurrently
    // Bob looks in the clearing
    const lookRes = nodeB.executeLocalAction({ type: "LOOK" });
    expect(lookRes.ok).toBe(true);
    expect(nodeB.vectorClock["bob"]).toBe(1);

    // Assert Bob has no knowledge of Alice's actions, and cage is still locked for Bob
    expect(nodeB.localState.agents!["alice"].current).toBe("clearing");
    expect(nodeB.localState.flags["cage_locked"]).toBe(true);

    // Attempting gossip during partition has no effect
    nodeA.gossip();
    nodeB.gossip();
    expect(nodeB.localState.flags["cage_locked"]).toBe(true);

    // 5. Network Recovery: reconnect the nodes
    nodeA.connect(nodeB);
    expect(nodeA.peers.has("bob")).toBe(true);
    expect(nodeB.peers.has("alice")).toBe(true);

    // 6. Synchronize / Gossip to merge states
    // Trigger gossip from A -> B and B -> A until no more updates occur
    let rounds = 0;
    while (rounds < 5) {
      const updatedA = nodeA.gossip();
      const updatedB = nodeB.gossip();
      if (updatedA === 0 && updatedB === 0) {
        break;
      }
      rounds++;
    }

    // 7. Verify eventual convergence
    const hashFinalA = computeStateHash(nodeA.localState);
    const hashFinalB = computeStateHash(nodeB.localState);
    expect(hashFinalA).toBe(hashFinalB);

    // Verify both nodes processed all actions:
    // - Alice is in control_room
    // - Bob is in clearing
    // - Cage is unlocked
    // - Vector clocks are identical and fully updated
    expect(nodeA.localState.agents!["alice"].current).toBe("control_room");
    expect(nodeB.localState.agents!["alice"].current).toBe("control_room");

    expect(nodeA.localState.agents!["bob"].current).toBe("clearing");
    expect(nodeB.localState.agents!["bob"].current).toBe("clearing");

    expect(nodeA.localState.flags["cage_locked"]).toBe(false);
    expect(nodeB.localState.flags["cage_locked"]).toBe(false);

    expect(nodeA.vectorClock).toEqual({ alice: 2, bob: 1 });
    expect(nodeB.vectorClock).toEqual({ alice: 2, bob: 1 });

    // Both should have successfully merged their narrative journals using CRDT union
    expect(nodeA.localState.transactionJournal!.length).toBeGreaterThan(0);
    expect(nodeA.localState.journal).toEqual(nodeB.localState.journal);
  });
});

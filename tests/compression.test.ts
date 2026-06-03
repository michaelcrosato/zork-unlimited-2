import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import {
  compressRLE,
  decompressRLE,
  deltaEncode,
  deltaDecode,
  compressStateDiff,
  decompressStateDiff,
  GossipNode
} from "../src/core/gossip.js";
import { MeshNode, MeshNetwork } from "../src/core/network.js";
import { computeStateHash } from "../src/core/hash.js";
import { Transaction } from "../src/core/state.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Differential Compression, RLE, and Redundancy Caching Tests", () => {
  it("should compress and decompress repeating values via RLE losslessly", () => {
    const stringArray = ["alice", "alice", "alice", "bob", "bob", "charlie"];
    const compressedStrings = compressRLE(stringArray);
    
    // Assert RLE structure
    expect(compressedStrings).toContainEqual({ rle: true, val: "alice", count: 3 });
    expect(compressedStrings).toContainEqual({ rle: true, val: "bob", count: 2 });
    expect(compressedStrings).toContain("charlie");
    
    const decompressedStrings = decompressRLE(compressedStrings);
    expect(decompressedStrings).toEqual(stringArray);

    const objArray = [
      { action: "MOVE", dir: "west" },
      { action: "MOVE", dir: "west" },
      { action: "LOOK" }
    ];
    const compressedObjs = compressRLE(objArray);
    expect(compressedObjs).toContainEqual({ rle: true, val: { action: "MOVE", dir: "west" }, count: 2 });
    
    const decompressedObjs = decompressRLE(compressedObjs);
    expect(decompressedObjs).toEqual(objArray);

    const booleans = [true, true, true, false, true, true];
    expect(decompressRLE(compressRLE(booleans))).toEqual(booleans);
  });

  it("should delta encode and decode monotonically increasing sequences", () => {
    const seq = [100, 101, 102, 105, 110];
    const encoded = deltaEncode(seq);
    expect(encoded).toEqual([100, 1, 1, 3, 5]);

    const decoded = deltaDecode(encoded);
    expect(decoded).toEqual(seq);
  });

  it("should compress and decompress transaction delta logs losslessly and assert payload reduction", () => {
    const transactions: Transaction[] = [
      {
        agentId: "alice",
        sequenceNumber: 10,
        action: { type: "MOVE", direction: "west" },
        stateHashBefore: "abc123before",
        stateHashAfter: "def456after",
        timestamp: 1700000000,
        ok: true
      },
      {
        agentId: "alice",
        sequenceNumber: 11,
        action: { type: "MOVE", direction: "west" },
        stateHashBefore: "def456after",
        stateHashAfter: "ghi789after",
        timestamp: 1700000050,
        ok: true
      },
      {
        agentId: "bob",
        sequenceNumber: 12,
        action: { type: "LOOK" },
        stateHashBefore: "ghi789after",
        stateHashAfter: "jkl012after",
        timestamp: 1700000100,
        ok: true
      },
      {
        agentId: "bob",
        sequenceNumber: 13,
        action: { type: "LOOK" },
        stateHashBefore: "jkl012after",
        stateHashAfter: "mno345after",
        timestamp: 1700000150,
        ok: false,
        rejectionReason: "Blocked exit"
      }
    ];

    const compressed = compressStateDiff(transactions, 10);
    expect(compressed.count).toBe(4);
    
    const decompressed = decompressStateDiff(compressed);
    expect(decompressed).toEqual(transactions);

    // Verify size reduction (comparing JSON string sizes)
    const rawJsonStr = JSON.stringify(transactions);
    const compressedJsonStr = JSON.stringify(compressed);
    
    // Print stats
    console.log(`Original transaction payload size: ${rawJsonStr.length} bytes`);
    console.log(`Compressed transaction payload size: ${compressedJsonStr.length} bytes`);
    
    expect(compressedJsonStr.length).toBeLessThan(rawJsonStr.length);
  });

  it("should properly synchronize states between peers using compressed diffs", () => {
    const nodeA = new GossipNode("alice", pack, 42);
    const nodeB = new GossipNode("bob", pack, 42);

    nodeA.connect(nodeB);

    // Alice moves west and pulls the lever
    nodeA.executeLocalAction({ type: "MOVE", direction: "west" });
    nodeA.executeLocalAction({ type: "USE", item: "lever", target: "lever" });

    // Generate a compressed gossip message from Alice to Bob
    const msg = nodeA.generateGossipMessageFor("bob");
    expect(msg.compressedDiff).toBeDefined();
    expect(msg.transactions.length).toBe(0); // transactions is cleared for saving packet size

    // Bob receives it, which decompresses and merges
    const updated = nodeB.receiveGossip(msg);
    expect(updated).toBe(true);

    // Assert state convergence
    expect(nodeB.localState.agents!["alice"].current).toBe("control_room");
    expect(nodeB.localState.flags["cage_locked"]).toBe(false);
    expect(nodeB.vectorClock["alice"]).toBe(2);

    // Sync back so Alice gets Bob's updates (clock details)
    const msgB = nodeB.generateGossipMessageFor("alice");
    nodeA.receiveGossip(msgB);

    const hashA = computeStateHash(nodeA.localState);
    const hashB = computeStateHash(nodeB.localState);
    expect(hashA).toBe(hashB);
  });

  it("should avoid sending redundant gossip messages using local sending cache", () => {
    const nodeA = new GossipNode("alice", pack, 42);
    const nodeB = new GossipNode("bob", pack, 42);

    nodeA.connect(nodeB);

    nodeA.executeLocalAction({ type: "MOVE", direction: "west" });

    // First gossip round should sync and update
    const updated1 = nodeA.gossip();
    expect(updated1).toBe(1);

    // Second immediate gossip round should be redundant and skipped!
    const updated2 = nodeA.gossip();
    expect(updated2).toBe(0); // Node A skipped generating/sending redundant updates

    // Alice does another action
    nodeA.executeLocalAction({ type: "USE", item: "lever", target: "lever" });

    // Third gossip round is no longer redundant and should sync successfully
    const updated3 = nodeA.gossip();
    expect(updated3).toBe(1);
  });

  it("should avoid redundant routed packets in MeshNode using local redundancy cache", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", pack, 100);
    const nodeB = new MeshNode("B", pack, 100);

    net.registerNode(nodeA);
    net.registerNode(nodeB);

    net.connectNodes("A", "B");

    // Propagate presence
    for (let i = 0; i < 5; i++) {
      net.tick(50);
    }

    // A makes a move
    nodeA.executeLocalAction({ type: "MOVE", direction: "west" });

    // Sync from A to B: should succeed
    const synced1 = nodeA.syncWithPeer("B");
    expect(synced1).toBe(true);

    // Immediate consecutive sync: should be redundant and skipped (returns false)
    const synced2 = nodeA.syncWithPeer("B");
    expect(synced2).toBe(false);

    // Advance time and check that B eventually convergence-ticks and updates
    net.tick(100);
    expect(nodeB.localState.agents!["A"].current).toBe("control_room");
  });
});

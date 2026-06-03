import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { GossipPacketFragmenter, GossipMessage } from "../src/core/gossip.js";
import { MeshNetwork, MeshNode } from "../src/core/network.js";
import { computeStateHash } from "../src/core/hash.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Gossip Packet Fragmentation & Reassembly Layer (AF-22)", () => {
  it("should fragment and reassemble a GossipMessage losslessly", () => {
    const mockDiff = {
      baseSequence: 1,
      count: 2,
      agentIds: ["alice", "bob"],
      sequenceNumbers: [1, 2],
      actions: ["MOVE west", "LOOK"],
      stateHashesBefore: ["hash1", "hash2"],
      stateHashesAfter: ["hash3", "hash4"],
      timestamps: [1000, 1050],
      oks: [true, true],
      rejectionReasons: ["", ""],
    };

    const originalMessage: GossipMessage = {
      senderId: "alice",
      vectorClock: { alice: 2, bob: 1 },
      transactions: [],
      compressedDiff: mockDiff,
    };

    // Serialized diff is about ~300 chars, so maxFragmentSize of 50 will produce ~6 fragments
    const maxFragmentSize = 50;
    const fragments = GossipPacketFragmenter.fragment(originalMessage, maxFragmentSize);

    expect(fragments.length).toBeGreaterThan(1);

    // Assert all fragments have identical transmissionId, totalFragments and correct index
    const transId = fragments[0].transmissionId;
    expect(transId).toBeDefined();

    for (let i = 0; i < fragments.length; i++) {
      expect(fragments[i].transmissionId).toBe(transId);
      expect(fragments[i].fragmentIndex).toBe(i);
      expect(fragments[i].totalFragments).toBe(fragments.length);
      expect(fragments[i].senderId).toBe("alice");
      expect(fragments[i].vectorClock).toEqual({ alice: 2, bob: 1 });
      expect(fragments[i].chunk.length).toBeLessThanOrEqual(maxFragmentSize);
    }

    // Reassemble and assert
    const reassembled = GossipPacketFragmenter.reassemble(fragments);
    expect(reassembled.senderId).toBe(originalMessage.senderId);
    expect(reassembled.vectorClock).toEqual(originalMessage.vectorClock);
    expect(reassembled.compressedDiff).toEqual(mockDiff);
  });

  it("should handle out-of-order fragment reassembly perfectly", () => {
    const mockDiff = { someLargeStatePayload: "A".repeat(120) };
    const originalMessage: GossipMessage = {
      senderId: "bob",
      vectorClock: { bob: 10 },
      transactions: [],
      compressedDiff: mockDiff,
    };

    const fragments = GossipPacketFragmenter.fragment(originalMessage, 30);
    expect(fragments.length).toBe(5); // 120 + 26 chars stringified, roughly 146 chars / 30 = 5 fragments

    // Scramble the order of fragments: e.g. 2, 4, 0, 3, 1
    const scrambled = [fragments[2], fragments[4], fragments[0], fragments[3], fragments[1]];

    const reassembled = GossipPacketFragmenter.reassemble(scrambled);
    expect(reassembled.compressedDiff).toEqual(mockDiff);
    expect(reassembled.vectorClock).toEqual({ bob: 10 });
  });

  it("should tolerate packet/fragment drop and only reassemble once all fragments arrive", () => {
    const node = new MeshNode("receiver", pack, 42);
    const mockDiff = { data: "x".repeat(100) };
    const originalMessage: GossipMessage = {
      senderId: "sender",
      vectorClock: { sender: 5 },
      transactions: [],
      compressedDiff: mockDiff,
    };

    const fragments = GossipPacketFragmenter.fragment(originalMessage, 40);
    expect(fragments.length).toBeGreaterThan(2);

    // Buffer only the first fragment
    let reassembled = node.bufferAndReassemble(fragments[0]);
    expect(reassembled).toBeNull(); // Missing other fragments
    expect(node.fragmentBuffers.get(fragments[0].transmissionId)?.size).toBe(1);

    // Buffer all fragments EXCEPT index 1 (simulate packet drop)
    for (let i = 2; i < fragments.length; i++) {
      reassembled = node.bufferAndReassemble(fragments[i]);
      expect(reassembled).toBeNull();
    }

    // Now arrive the dropped packet (index 1)
    reassembled = node.bufferAndReassemble(fragments[1]);
    expect(reassembled).not.toBeNull();
    expect(reassembled?.compressedDiff).toEqual(mockDiff);

    // The buffer should be garbage collected and empty now
    expect(node.fragmentBuffers.has(fragments[0].transmissionId)).toBe(false);
  });

  it("should synchronize nodes and converge states over MeshNetwork using fragmented packets", () => {
    const net = new MeshNetwork();
    net.minLatencyMs = 10;
    net.maxLatencyMs = 20;

    const nodeA = new MeshNode("alice", pack, 100);
    const nodeB = new MeshNode("bob", pack, 100);

    // Enable small fragmentation size on both nodes
    nodeA.maxFragmentSize = 40;
    nodeB.maxFragmentSize = 40;

    net.registerNode(nodeA);
    net.registerNode(nodeB);

    net.connectNodes("alice", "bob");

    // Let presence announcements propagate
    for (let i = 0; i < 5; i++) {
      net.tick(50);
    }

    // 1. Initial State assertions
    expect(nodeA.discovery.getKnownNodes()).toContain("bob");
    expect(nodeB.discovery.getKnownNodes()).toContain("alice");

    // 2. Alice performs some local actions to generate rich delta state history
    const res1 = nodeA.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(res1.ok).toBe(true);

    const res2 = nodeA.executeLocalAction({ type: "USE", item: "lever", target: "lever" });
    expect(res2.ok).toBe(true);

    const res3 = nodeA.executeLocalAction({ type: "LOOK" });
    expect(res3.ok).toBe(true);

    // 3. Initiate Gossip Synchronization
    const syncInitiated = nodeA.syncWithPeer("bob");
    expect(syncInitiated).toBe(true);

    // Assert that the packet queue contains gossip fragments instead of a single gossip packet
    const fragmentPackets = net.packetQueue.filter((pd) => pd.packet.type === "gossip_fragment");
    expect(fragmentPackets.length).toBeGreaterThan(1);

    const normalGossipPackets = net.packetQueue.filter((pd) => pd.packet.type === "gossip");
    expect(normalGossipPackets.length).toBe(0);

    // 4. Tick network until packets are delivered and reassembled
    for (let i = 0; i < 10; i++) {
      net.tick(50);
    }

    // Assert states have converged
    const hashA = computeStateHash(nodeA.localState);
    const hashB = computeStateHash(nodeB.localState);
    expect(hashA).toBe(hashB);

    expect(nodeB.localState.flags["cage_locked"]).toBe(false);
    expect(nodeB.localState.agents!["alice"].current).toBe("control_room");
  });
});

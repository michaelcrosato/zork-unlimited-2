import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { GossipNode, reconstructState } from "../src/core/gossip.js";
import { computeStateHash } from "../src/core/hash.js";
import {
  SecureCooperativeMesh,
  signTransaction,
  verifyTransactionSignature,
  getTransactionSigningData,
} from "../src/core/security.js";
import { Transaction } from "../src/core/state.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Secure Cooperative Mesh (AF-24) Security Tests", () => {
  beforeEach(() => {
    SecureCooperativeMesh.clearRegistry();
  });

  it("should generate deterministic keypairs for nodes", () => {
    const kp1 = SecureCooperativeMesh.generateKeyPair("alice");
    const kp2 = SecureCooperativeMesh.generateKeyPair("alice");
    const kpBob = SecureCooperativeMesh.generateKeyPair("bob");

    // Keys must be identical for identical inputs (deterministic)
    expect(kp1.privateKey).toBe(kp2.privateKey);
    expect(kp1.publicKey).toBe(kp2.publicKey);

    // Keys must be different for different nodes
    expect(kp1.privateKey).not.toBe(kpBob.privateKey);
    expect(kp1.publicKey).not.toBe(kpBob.publicKey);
  });

  it("should sign transactions upon execution and verify them using public keys", () => {
    const aliceNode = new GossipNode("alice", pack, 42);

    // Execute local action
    const res = aliceNode.executeLocalAction({ type: "MOVE", direction: "west" });
    expect(res.ok).toBe(true);

    const journal = aliceNode.localState.transactionJournal || [];
    expect(journal.length).toBe(1);

    const tx = journal[0];
    expect(tx.signature).toBeDefined();

    // Verify signature with Alice's public key
    const pubKey = SecureCooperativeMesh.getPublicKey("alice");
    const isValid = verifyTransactionSignature(tx, pubKey);
    expect(isValid).toBe(true);
  });

  it("should detect transaction tampering (invalid signature on modification)", () => {
    const aliceNode = new GossipNode("alice", pack, 42);
    aliceNode.executeLocalAction({ type: "MOVE", direction: "west" });

    const tx = { ...aliceNode.localState.transactionJournal![0] };
    const pubKey = SecureCooperativeMesh.getPublicKey("alice");

    // 1. Unmodified transaction verifies successfully
    expect(verifyTransactionSignature(tx, pubKey)).toBe(true);

    // 2. Tampering with action field
    const tamperedTxAction = { ...tx, action: { type: "MOVE", direction: "east" } };
    expect(verifyTransactionSignature(tamperedTxAction, pubKey)).toBe(false);

    // 3. Tampering with sequenceNumber
    const tamperedTxSeq = { ...tx, sequenceNumber: 99 };
    expect(verifyTransactionSignature(tamperedTxSeq, pubKey)).toBe(false);

    // 4. Tampering with stateHashAfter
    const tamperedTxHash = { ...tx, stateHashAfter: "corrupted_hash" };
    expect(verifyTransactionSignature(tamperedTxHash, pubKey)).toBe(false);
  });

  it("should detect and reject spoofed/unauthorized transactions signed with incorrect keys", () => {
    const tx: Transaction = {
      agentId: "alice",
      sequenceNumber: 0,
      action: { type: "MOVE", direction: "west" },
      stateHashBefore: "initial_hash",
      stateHashAfter: "next_hash",
      timestamp: Date.now(),
      ok: true,
    };

    // Alice signs her own transaction
    const aliceKeyPair = SecureCooperativeMesh.generateKeyPair("alice");
    tx.signature = signTransaction(tx, aliceKeyPair.privateKey);

    // Verify with Alice's public key -> Valid!
    expect(verifyTransactionSignature(tx, aliceKeyPair.publicKey)).toBe(true);

    // Malicious node signs Alice's transaction pretending to be Alice
    const maliciousKeyPair = SecureCooperativeMesh.generateKeyPair("malicious");
    const spoofedTx = { ...tx };
    spoofedTx.signature = signTransaction(spoofedTx, maliciousKeyPair.privateKey);

    // Verification with Alice's public key must fail
    expect(verifyTransactionSignature(spoofedTx, aliceKeyPair.publicKey)).toBe(false);
  });

  it("should reject unsigned or tampered gossip messages when enforceSignatures is active", () => {
    const aliceNode = new GossipNode("alice", pack, 42);
    const bobNode = new GossipNode("bob", pack, 42);

    // Enable signature enforcement on Bob
    bobNode.enforceSignatures = true;

    // Alice performs a local action, generating a signed transaction
    aliceNode.executeLocalAction({ type: "MOVE", direction: "west" });

    // Generate valid gossip message
    const msg = aliceNode.generateGossipMessageFor("bob");

    // Bob should accept validly signed gossip
    const accepted = bobNode.receiveGossip(msg);
    expect(accepted).toBe(true);

    // Reset Bob's state
    const bobSecuredNode = new GossipNode("bob", pack, 42);
    bobSecuredNode.enforceSignatures = true;

    // Create an unsigned transaction
    const unsignedTx: Transaction = {
      agentId: "alice",
      sequenceNumber: 0,
      action: { type: "MOVE", direction: "west" },
      stateHashBefore: "hash1",
      stateHashAfter: "hash2",
      timestamp: Date.now(),
      ok: true,
    };

    // Bob should reject gossip with unsigned transactions
    const rejectedUnsigned = bobSecuredNode.receiveGossip({
      senderId: "alice",
      vectorClock: { alice: 1 },
      transactions: [unsignedTx],
    });
    expect(rejectedUnsigned).toBe(false);

    // Bob should reject gossip with tampered transactions
    const tamperedTx = { ...aliceNode.localState.transactionJournal![0], action: "TAMPERED" };
    const rejectedTampered = bobSecuredNode.receiveGossip({
      senderId: "alice",
      vectorClock: { alice: 1 },
      transactions: [tamperedTx],
    });
    expect(rejectedTampered).toBe(false);
  });

  it("should ensure honest nodes converge perfectly on valid signed transactions and skip tampered ones", () => {
    const aliceNode = new GossipNode("alice", pack, 99);
    const bobNode = new GossipNode("bob", pack, 99);

    aliceNode.connect(bobNode);
    aliceNode.gossip();
    bobNode.gossip();

    // Alice moves west
    aliceNode.executeLocalAction({ type: "MOVE", direction: "west" });
    const aliceTx = aliceNode.localState.transactionJournal![0];

    // Let's create a tampered transaction list for Bob to process
    const tamperedTx = { ...aliceTx, action: { type: "USE", item: "lever", target: "lever" } };

    // Reconstructing state using tampered transaction should skip the tampered transaction
    const convergedState = reconstructState(
      aliceNode.seed,
      aliceNode.pack,
      [aliceTx, tamperedTx], // aliceTx is valid, tamperedTx has invalid signature for its action
      ["alice"]
    );

    // The reconstructed state should have processed only aliceTx
    expect(convergedState.step).toBe(1);
    expect(convergedState.agents!["alice"].current).toBe("control_room");
  });
});

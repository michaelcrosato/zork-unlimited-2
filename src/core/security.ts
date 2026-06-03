import { createHash } from "crypto";
import { canonicalStringify } from "./hash.js";
import { Transaction } from "./state.js";

/**
 * Generates the canonical string of transaction data to be signed or verified.
 * This covers all critical state transition fields to prevent tampering.
 */
export function getTransactionSigningData(tx: {
  agentId: string;
  sequenceNumber: number;
  action: any;
  stateHashBefore: string;
  stateHashAfter: string;
  timestamp: number;
  ok: boolean;
}): string {
  const actionStr = canonicalStringify(tx.action);
  return `${tx.agentId}:${tx.sequenceNumber}:${actionStr}:${tx.stateHashBefore}:${tx.stateHashAfter}:${tx.timestamp}:${tx.ok}`;
}

/**
 * Signs a transaction using a private key and simulated asymmetric cryptography.
 * The signature is a SHA-256 hash of the transaction data combined with the private key.
 */
export function signTransaction(tx: Omit<Transaction, "signature">, privateKey: string): string {
  const data = getTransactionSigningData(tx);
  return createHash("sha256").update(`${data}:${privateKey}`).digest("hex");
}

/**
 * Verifies a transaction's signature against the agent's public key.
 * In this simulated asymmetric cryptography system, the expected private key
 * is derived deterministically from the public key to perform the verification.
 */
export function verifyTransactionSignature(tx: Transaction, publicKey: string): boolean {
  if (!tx.signature) {
    return false;
  }
  // Extract the agent ID from the public key prefix (e.g. "pubkey:alice" -> "alice")
  const agentId = publicKey.replace(/^pubkey:/, "");
  const expectedPrivateKey = `privkey:${agentId}`;

  const expectedSignature = signTransaction(tx, expectedPrivateKey);
  return tx.signature === expectedSignature;
}

/**
 * SecureCooperativeMesh provides key management and a public key registry
 * to authenticate transaction entries in cooperative/multiplayer content packs.
 */
export class SecureCooperativeMesh {
  private static publicKeyRegistry: Map<string, string> = new Map();

  /**
   * Generates a deterministic keypair for an agent/node based on its ID.
   */
  public static generateKeyPair(nodeId: string): { publicKey: string; privateKey: string } {
    return {
      publicKey: `pubkey:${nodeId}`,
      privateKey: `privkey:${nodeId}`,
    };
  }

  /**
   * Registers a public key for a given agent in the network.
   */
  public static registerPublicKey(agentId: string, publicKey: string): void {
    this.publicKeyRegistry.set(agentId, publicKey);
  }

  /**
   * Resolves the public key for an agent. Defaults to the canonical pubkey
   * derived from the agent ID if not explicitly registered.
   */
  public static getPublicKey(agentId: string): string {
    return this.publicKeyRegistry.get(agentId) ?? `pubkey:${agentId}`;
  }

  /**
   * Clears all registered public keys (useful for test isolation).
   */
  public static clearRegistry(): void {
    this.publicKeyRegistry.clear();
  }
}

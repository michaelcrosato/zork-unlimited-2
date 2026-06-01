import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Leverage Liquidity Mining Governance Epoch Audits & Faction Sponsor Revocations (AF-116)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "governance_audit_test_pack",
      title: "Governance Audit Test Pack",
      start_room: "clearing",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open space in the middle of the woods.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, and resolving a sponsor audit proposal via majority consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08,
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // 1. Player proposes sponsor audit for vault_a
    const proposeAction = {
      type: "PROPOSE_SPONSOR_AUDIT",
      auditId: "audit_1",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      factionId: "rangers",
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    // Proposer auto votes true
    const prop = res1.state.sponsorAuditProposals?.audit_1;
    expect(prop).toBeDefined();
    expect(prop?.resolved).toBeFalsy();
    expect(prop?.votes?.player?.vote).toBe(true);

    // 2. Alice votes true - majority consensus reached! (2 out of 3 votes)
    const voteAction = {
      type: "VOTE_SPONSOR_AUDIT",
      syndicateId: "alpha_squad",
      auditId: "audit_1",
      vote: true,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.sponsorAuditProposals?.audit_1?.resolved).toBe(true);
  });

  it("should support proposing, voting, and resolving a sponsor revocation proposal to immediately delete the policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08,
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // 1. Propose revocation
    const proposeAction = {
      type: "PROPOSE_SPONSOR_REVOCATION",
      revocationId: "revoke_1",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      factionId: "rangers",
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    // 2. Alice votes true - majority consensus reached! Policy should be immediately deleted.
    const voteAction = {
      type: "VOTE_SPONSOR_REVOCATION",
      syndicateId: "alpha_squad",
      revocationId: "revoke_1",
      vote: true,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.sponsorRevocationProposals?.revoke_1?.resolved).toBe(true);
    expect(res2.state.factionSponsorPolicies?.alpha_squad?.vault_a).toBeUndefined();
  });

  it("should execute resolved sponsor audit at epoch end - Scenario A: depleted reserves triggers revocation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08,
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // Setup approved audit proposal
    state.sponsorAuditProposals = {
      audit_1: {
        id: "audit_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1002,
        resolved: true,
        executed: false,
        votes: { player: { vote: true, timestamp: 1002 } },
      },
    };

    // Setup depleted faction reserves (<= 0)
    state.factionReservePools = {
      rangers: 0,
    };

    // Set step to 5 (epoch end)
    state.step = 5;

    let ticked = tickEconomy(state, mockPack);

    // Policy should be revoked (deleted)
    expect(ticked.factionSponsorPolicies?.alpha_squad?.vault_a).toBeUndefined();
    expect(ticked.sponsorAuditProposals?.audit_1?.executed).toBe(true);
    expect(ticked.journal.some(j => j.includes("depleted"))).toBe(true);
  });

  it("should execute resolved sponsor audit at epoch end - Scenario B: low reputation triggers 50% rate penalty", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08,
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // Setup approved audit proposal
    state.sponsorAuditProposals = {
      audit_1: {
        id: "audit_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1002,
        resolved: true,
        executed: false,
        votes: { player: { vote: true, timestamp: 1002 } },
      },
    };

    // Setup positive reserves but low reputation (< 10)
    state.factionReservePools = { rangers: 10000 };
    state.factionRep = { rangers: 5 }; // Low reputation

    // Set step to 5 (epoch end)
    state.step = 5;

    let ticked = tickEconomy(state, mockPack);

    // Reward rate should be halved
    expect(ticked.factionSponsorPolicies?.alpha_squad?.vault_a?.rewardRate).toBe(0.04);
    expect(ticked.sponsorAuditProposals?.audit_1?.executed).toBe(true);
    expect(ticked.journal.some(j => j.includes("reduced by 50%"))).toBe(true);
  });

  it("should execute resolved sponsor audit at epoch end - Scenario C: healthy sponsor passes audit checks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08,
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // Setup approved audit proposal
    state.sponsorAuditProposals = {
      audit_1: {
        id: "audit_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1002,
        resolved: true,
        executed: false,
        votes: { player: { vote: true, timestamp: 1002 } },
      },
    };

    // Setup positive reserves and good reputation (>= 10)
    state.factionReservePools = { rangers: 10000 };
    state.factionRep = { rangers: 20 }; // Good reputation

    // Set step to 5 (epoch end)
    state.step = 5;

    let ticked = tickEconomy(state, mockPack);

    // Reward rate should remain unchanged
    expect(ticked.factionSponsorPolicies?.alpha_squad?.vault_a?.rewardRate).toBe(0.08);
    expect(ticked.sponsorAuditProposals?.audit_1?.executed).toBe(true);
    expect(ticked.journal.some(j => j.includes("passed audit checks"))).toBe(true);
  });

  it("should merge sponsor audit and sponsor revocation proposals correctly during Gossip node reconciliation", () => {
    let stateA = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });
    let stateB = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });

    stateA.sponsorAuditProposals = {
      audit_1: {
        id: "audit_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1000,
        resolved: false,
        votes: { player: { vote: true, timestamp: 1000 } },
      },
    };

    stateB.sponsorAuditProposals = {
      audit_1: {
        id: "audit_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1000,
        resolved: false,
        votes: { alice: { vote: true, timestamp: 1001 } },
      },
    };

    stateA.sponsorRevocationProposals = {
      rev_1: {
        id: "rev_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1000,
        resolved: false,
        votes: { player: { vote: true, timestamp: 1000 } },
      },
    };

    stateB.sponsorRevocationProposals = {
      rev_1: {
        id: "rev_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        timestamp: 1002, // Newer proposal
        resolved: true,
        votes: { alice: { vote: true, timestamp: 1002 } },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Votes for audit_1 should converge
    expect(merged.sponsorAuditProposals?.audit_1?.votes?.player?.vote).toBe(true);
    expect(merged.sponsorAuditProposals?.audit_1?.votes?.alice?.vote).toBe(true);

    // Revocation proposal rev_1 should converge to newer stateB version (resolved: true)
    expect(merged.sponsorRevocationProposals?.rev_1?.resolved).toBe(true);
  });
});

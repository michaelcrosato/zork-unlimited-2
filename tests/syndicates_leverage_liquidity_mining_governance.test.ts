import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Leverage Liquidity Mining Governance & Faction Sponsoring Votes (AF-115)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "governance_test_pack",
      title: "Governance Test Pack",
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

  it("should support proposing and voting on faction sponsor policy via consensus majority", () => {
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // 1. Propose faction sponsor rangers with 8% reward rate and 3 epoch min lock
    const proposeAction = {
      type: "PROPOSE_FACTION_SPONSOR",
      proposalId: "prop_1",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      factionId: "rangers",
      rewardRate: 0.08,
      minLockTerms: 3,
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    // Proposer auto votes true
    const prop = res1.state.factionSponsorProposals?.prop_1;
    expect(prop).toBeDefined();
    expect(prop?.vaultId).toBe("vault_a");
    expect(prop?.factionId).toBe("rangers");
    expect(prop?.votes?.player?.vote).toBe(true);

    // Policy should not be resolved yet since we only have 1 out of 3 votes
    expect(res1.state.factionSponsorPolicies?.alpha_squad?.vault_a).toBeUndefined();

    // 2. Alice votes for the proposal - consensus majority! (2 out of 3 votes)
    const voteAction = {
      type: "VOTE_FACTION_SPONSOR",
      syndicateId: "alpha_squad",
      proposalId: "prop_1",
      vote: true,
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);

    // Proposal votes should reflect alice
    expect(res2.state.factionSponsorProposals?.prop_1?.votes?.alice?.vote).toBe(true);

    // Active policy must be resolved successfully!
    const policy = res2.state.factionSponsorPolicies?.alpha_squad?.vault_a;
    expect(policy).toBeDefined();
    expect(policy?.factionId).toBe("rangers");
    expect(policy?.rewardRate).toBe(0.08);
    expect(policy?.minLockTerms).toBe(3);
  });

  it("should enforce resolved sponsoring policy rules when locking rehypothecated collateral", () => {
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000,
        },
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

    // 1. Locking with wrong faction should fail
    const actionFailFaction = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 500,
      durationEpochs: 4,
      factionId: "shadow_guild",
      timestamp: 1002,
    };
    let res1 = multiAgentStep(state, { agentId: "player", action: actionFailFaction as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("Vault vault_a is sponsored by faction rangers");

    // 2. Locking with too short duration should fail
    const actionFailDuration = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 500,
      durationEpochs: 2,
      factionId: "rangers",
      timestamp: 1003,
    };
    let res2 = multiAgentStep(state, { agentId: "player", action: actionFailDuration as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("is less than the required minimum of 3 epochs");

    // 3. Proper lock matching policy should succeed
    const actionSucceed = {
      type: "LOCK_REHYPOTHECATED_COLLATERAL",
      syndicateId: "alpha_squad",
      vaultId: "vault_a",
      amount: 500,
      durationEpochs: 3,
      factionId: "rangers",
      timestamp: 1004,
    };
    let res3 = multiAgentStep(state, { agentId: "player", action: actionSucceed as any }, mockPack);
    expect(res3.ok).toBe(true);
    expect(res3.state.lockedLiquidityPositions?.alpha_squad?.[0]).toBeDefined();
  });

  it("should apply dynamic interest rate boosts, reputation scaling, and claim reward multipliers", () => {
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

    state.secondaryReserveVaults = {
      vault_a: {
        vaultId: "vault_a",
        name: "Vault A",
        interestRate: 0.1, // 10% base rate
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // Initialize high rangers reputation to test interest boost
    state.factionRep = {
      rangers: 50, // Should boost interest dynamically
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        rebalancingEnabled: true,
        vaultTargets: {
          vault_a: 100,
        },
        liquidityBufferRatio: 0,
        vaultAllocations: {
          vault_a: 1000,
        },
        lockedPositions: [
          {
            id: "lock_1",
            syndicateId: "alpha_squad",
            vaultId: "vault_a",
            amount: 500,
            startEpoch: 0,
            durationEpochs: 3,
            endEpoch: 3,
            factionId: "rangers",
            claimed: false,
            timestamp: 1002,
          },
        ],
      },
    };

    state.lockedLiquidityPositions = {
      alpha_squad: [
        {
          id: "lock_1",
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          amount: 500,
          startEpoch: 0,
          durationEpochs: 3,
          endEpoch: 3,
          factionId: "rangers",
          claimed: false,
          timestamp: 1002,
        },
      ],
    };

    state.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.08, // 8% per epoch instead of 5%
          minLockTerms: 3,
          timestamp: 1001,
        },
      },
    };

    // 1. Tick economy to accrue dynamic interest rate boost & reputation
    let tickedState = tickEconomy(state, mockPack);

    // Base rate is 0.1, rep ranges is 50 -> repBoost = 50 * 0.005 = 0.25
    // rewardRate is 0.08 -> effective rate = 0.1 * (1.0 + 0.25 + 0.08 * 0.2) = 0.1 * 1.266 = 0.1266
    // Allocated rehypothecated amount in vault_a = 1000, locked amount = 500
    // Lock interest: Math.floor(500 * 0.1266 * yieldMultiplier(1.3)) = Math.floor(63.3 * 1.3) = 82
    // Unlocked interest: Math.floor(500 * 0.1266) = 63
    // Total interest = 82 + 63 = 145. Yield returned is 80% = 116 gold.
    expect(tickedState.marginAccounts?.alpha_squad?.collateral).toBeGreaterThan(1000);

    // 2. Claim rewards at epoch 3 (step 15)
    tickedState.step = 15;

    const claimAction = {
      type: "CLAIM_LIQUIDITY_MINING_REWARDS",
      syndicateId: "alpha_squad",
      positionId: "lock_1",
      timestamp: 1100,
    };

    let claimRes = multiAgentStep(tickedState, { agentId: "player", action: claimAction as any }, mockPack);
    expect(claimRes.ok).toBe(true);

    // Reward with 8% rate: 500 * 0.08 * 3 = 120 gold.
    // Default 5% rate would have been 500 * 0.05 * 3 = 75 gold.
    const pos = claimRes.state.lockedLiquidityPositions?.alpha_squad?.[0];
    expect(pos?.claimed).toBe(true);
    expect(claimRes.state.syndicates?.alpha_squad?.warChest).toBeGreaterThan(1000 + 75); // Greater than standard 75 chest due to 120 reward!
  });

  it("should merge faction sponsor proposals and resolved policies correctly in Gossip mesh nodes", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      agentsInit: ["player"],
    });

    stateA.factionSponsorProposals = {
      prop_1: {
        id: "prop_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        rewardRate: 0.08,
        minLockTerms: 3,
        timestamp: 1001,
        votes: {
          player: { vote: true, timestamp: 1001 },
        },
      },
    };

    stateB.factionSponsorProposals = {
      prop_1: {
        id: "prop_1",
        syndicateId: "alpha_squad",
        vaultId: "vault_a",
        factionId: "rangers",
        rewardRate: 0.08,
        minLockTerms: 3,
        timestamp: 1001,
        votes: {
          alice: { vote: true, timestamp: 1002 },
        },
      },
    };

    stateA.factionSponsorPolicies = {
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

    stateB.factionSponsorPolicies = {
      alpha_squad: {
        vault_a: {
          syndicateId: "alpha_squad",
          vaultId: "vault_a",
          factionId: "rangers",
          rewardRate: 0.1, // Newer resolved policy
          minLockTerms: 4,
          timestamp: 1005,
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Assert proposals votes converged (both player and alice)
    const prop = merged.factionSponsorProposals?.prop_1;
    expect(prop).toBeDefined();
    expect(prop?.votes?.player?.vote).toBe(true);
    expect(prop?.votes?.alice?.vote).toBe(true);

    // Assert policies converged to the newer timestamp one (r reward rate 0.10 and min lock 4)
    const policy = merged.factionSponsorPolicies?.alpha_squad?.vault_a;
    expect(policy).toBeDefined();
    expect(policy?.rewardRate).toBe(0.1);
    expect(policy?.minLockTerms).toBe(4);
  });
});

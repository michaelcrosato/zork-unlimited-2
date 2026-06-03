import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Leverage Liquidity Mining Governance Reward Slashing (AF-117)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "slashing_test_pack",
      title: "Reward Slashing Test Pack",
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

  it("should support proposing, voting, and resolving a reward slash proposal via majority consensus", () => {
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

    // 1. Player proposes a reward slash for target syndicate "beta_squad" with malicious actor "malicious_node"
    const proposeAction = {
      type: "PROPOSE_REWARD_SLASH",
      proposalId: "slash_1",
      syndicateId: "alpha_squad",
      targetSyndicateId: "beta_squad",
      slashingRate: 0.3, // 30% slash
      maliciousActor: "malicious_node",
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    // Proposer auto votes true
    const prop = res1.state.rewardSlashingProposals?.slash_1;
    expect(prop).toBeDefined();
    expect(prop?.resolved).toBeFalsy();
    expect(prop?.votes?.player?.vote).toBe(true);

    // 2. Alice votes true - majority consensus reached! (2 out of 3 votes)
    const voteAction = {
      type: "VOTE_REWARD_SLASH",
      syndicateId: "alpha_squad",
      proposalId: "slash_1",
      vote: true,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.rewardSlashingProposals?.slash_1?.resolved).toBe(true);

    // The target and actor should be flagged as malicious, and slashing rate registered
    expect(res2.state.maliciousActors?.malicious_node).toBe(true);
    expect(res2.state.maliciousActors?.beta_squad).toBe(true);
    expect(res2.state.slashingRates?.beta_squad).toBe(0.3);
  });

  it("should reduce liquidity mining reward claims if the target syndicate is flagged as malicious", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      beta_squad: {
        id: "beta_squad",
        name: "Beta Squad",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // Initialize margin account and positions
    state.marginAccounts = {
      beta_squad: {
        syndicateId: "beta_squad",
        collateral: 500,
        timestamp: 1000,
        lockedPositions: [
          {
            id: "pos_1",
            syndicateId: "beta_squad",
            vaultId: "vault_x",
            amount: 1000,
            durationEpochs: 4,
            factionId: "rangers",
            startEpoch: 0,
            endEpoch: 4,
            timestamp: 1000,
            claimed: false,
          },
        ],
      },
    };

    state.lockedLiquidityPositions = {
      beta_squad: [
        {
          id: "pos_1",
          syndicateId: "beta_squad",
          vaultId: "vault_x",
          amount: 1000,
          durationEpochs: 4,
          factionId: "rangers",
          startEpoch: 0,
          endEpoch: 4,
          timestamp: 1000,
          claimed: false,
        },
      ],
    };

    // Flag beta_squad as malicious with a 30% slash rate
    state.maliciousActors = {
      beta_squad: true,
    };
    state.slashingRates = {
      beta_squad: 0.3,
    };

    // Base reward would be amount * 5% per epoch * 4 epochs = 1000 * 0.05 * 4 = 200 gold.
    // Slashed by 30% = 200 * (1 - 0.30) = 140 gold.

    // Set step to 20 (currentEpoch 4, mature)
    state.step = 20;

    const claimAction = {
      type: "CLAIM_LIQUIDITY_MINING_REWARDS",
      syndicateId: "beta_squad",
      positionId: "pos_1",
      timestamp: 1004,
    };

    let res = multiAgentStep(state, { agentId: "player", action: claimAction as any }, mockPack);
    expect(res.ok).toBe(true);

    // Verify warChest got 140 gold instead of 200 gold
    const betaSyndicate = res.state.syndicates?.beta_squad;
    expect(betaSyndicate?.warChest).toBe(1140); // 1000 + 140
  });

  it("should merge reward slashing proposals and malicious status correctly during Gossip node convergence", () => {
    let stateA = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });
    let stateB = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });

    stateA.rewardSlashingProposals = {
      slash_1: {
        id: "slash_1",
        syndicateId: "alpha_squad",
        targetSyndicateId: "beta_squad",
        slashingRate: 0.25,
        maliciousActor: "malicious_node",
        timestamp: 1000,
        resolved: false,
        votes: { player: { vote: true, timestamp: 1000 } },
      },
    };

    stateB.rewardSlashingProposals = {
      slash_1: {
        id: "slash_1",
        syndicateId: "alpha_squad",
        targetSyndicateId: "beta_squad",
        slashingRate: 0.25,
        maliciousActor: "malicious_node",
        timestamp: 1000,
        resolved: false,
        votes: { alice: { vote: true, timestamp: 1001 } },
      },
    };

    stateA.maliciousActors = {
      rival_node: true,
    };
    stateA.slashingRates = {
      rival_syndicate: 0.1,
    };

    stateB.maliciousActors = {
      other_node: true,
    };
    stateB.slashingRates = {
      rival_syndicate: 0.4, // higher rate / newer update
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Votes for slash_1 should converge
    expect(merged.rewardSlashingProposals?.slash_1?.votes?.player?.vote).toBe(true);
    expect(merged.rewardSlashingProposals?.slash_1?.votes?.alice?.vote).toBe(true);

    // Malicious actor statuses should union
    expect(merged.maliciousActors?.rival_node).toBe(true);
    expect(merged.maliciousActors?.other_node).toBe(true);

    // Slashing rates should merge with Max
    expect(merged.slashingRates?.rival_syndicate).toBe(0.4);
  });
});

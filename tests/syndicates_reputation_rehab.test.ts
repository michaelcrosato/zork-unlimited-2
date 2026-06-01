import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank Leverage Liquidity Mining Governance Slashing Recovery & Reputation Rehab Campaigns (AF-118)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "rehab_test_pack",
      title: "Reputation Rehab Test Pack",
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

  it("should support proposing, voting, and resolving a rehab campaign proposal via majority consensus", () => {
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

    // Flag alpha_squad as malicious
    state.maliciousActors = {
      alpha_squad: true,
    };
    state.slashingRates = {
      alpha_squad: 0.30,
    };
    state.factionReservePools = {
      rangers: 500,
    };

    // 1. Propose rehabilitation campaign
    const proposeAction = {
      type: "PROPOSE_REHAB_CAMPAIGN",
      proposalId: "rehab_1",
      syndicateId: "alpha_squad",
      targetActor: "alpha_squad",
      factionId: "rangers",
      goldCost: 400,
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    const prop = res1.state.rehabCampaignProposals?.rehab_1;
    expect(prop).toBeDefined();
    expect(prop?.resolved).toBeFalsy();
    expect(prop?.votes?.player?.vote).toBe(true);

    // 2. Alice votes true - majority consensus reached! (2 out of 3 votes)
    const voteAction = {
      type: "VOTE_REHAB_CAMPAIGN",
      syndicateId: "alpha_squad",
      proposalId: "rehab_1",
      vote: true,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.rehabCampaignProposals?.rehab_1?.resolved).toBe(true);

    // Verify alpha_squad is no longer flagged as malicious, and slashing rate is removed
    expect(res2.state.maliciousActors?.alpha_squad).toBeFalsy();
    expect(res2.state.slashingRates?.alpha_squad).toBeFalsy();

    // Gold cost (400) should be deducted from syndicate warChest and added to faction reserve pool
    expect(res2.state.syndicates?.alpha_squad?.warChest).toBe(600); // 1000 - 400
    expect(res2.state.factionReservePools?.rangers).toBe(900); // 500 + 400
  });

  it("should enforce validation and rejection rules for rehabilitation proposals", () => {
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
        warChest: 300, // low gold
      },
    };

    state.maliciousActors = {
      alpha_squad: true,
    };

    // Cannot propose if warChest is less than goldCost
    const proposeAction1 = {
      type: "PROPOSE_REHAB_CAMPAIGN",
      proposalId: "rehab_fail_1",
      syndicateId: "alpha_squad",
      targetActor: "alpha_squad",
      factionId: "rangers",
      goldCost: 500, // cost 500 > 300
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction1 as any }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("does not have enough gold");

    // Cannot propose if target actor is not malicious
    const proposeAction2 = {
      type: "PROPOSE_REHAB_CAMPAIGN",
      proposalId: "rehab_fail_2",
      syndicateId: "alpha_squad",
      targetActor: "clean_node", // not malicious
      factionId: "rangers",
      goldCost: 100,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(state, { agentId: "player", action: proposeAction2 as any }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("is not flagged as malicious");
  });

  it("should restore full standard liquidity mining rewards after successful rehabilitation", () => {
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

    // 1. Propose and resolve rehabilitation campaign (sole member player auto-reconciles to true!)
    state.maliciousActors = {
      beta_squad: true,
    };
    state.slashingRates = {
      beta_squad: 0.30,
    };

    const proposeAction = {
      type: "PROPOSE_REHAB_CAMPAIGN",
      proposalId: "rehab_1",
      syndicateId: "beta_squad",
      targetActor: "beta_squad",
      factionId: "rangers",
      goldCost: 200,
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.rehabCampaignProposals?.rehab_1?.resolved).toBe(true);
    expect(res1.state.maliciousActors?.beta_squad).toBeFalsy();

    // 2. Claim rewards at step 20 (epoch 4, mature)
    res1.state.step = 20;

    const claimAction = {
      type: "CLAIM_LIQUIDITY_MINING_REWARDS",
      syndicateId: "beta_squad",
      positionId: "pos_1",
      timestamp: 1004,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "player", action: claimAction as any }, mockPack);
    expect(res2.ok).toBe(true);

    // Base reward: amount * 5% per epoch * 4 epochs = 1000 * 0.05 * 4 = 200 gold.
    // Proposer warChest: 1000 (init) - 200 (rehab cost) + 200 (full reward) = 1000 gold.
    const betaSyndicate = res2.state.syndicates?.beta_squad;
    expect(betaSyndicate?.warChest).toBe(1000);
  });

  it("should merge rehabilitation proposals and clear malicious status correctly during Gossip node convergence", () => {
    let stateA = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });
    let stateB = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });

    stateA.rehabCampaignProposals = {
      rehab_1: {
        id: "rehab_1",
        syndicateId: "alpha_squad",
        targetActor: "alpha_squad",
        factionId: "rangers",
        goldCost: 300,
        timestamp: 1000,
        resolved: false,
        votes: { player: { vote: true, timestamp: 1000 } },
      },
    };

    stateB.rehabCampaignProposals = {
      rehab_1: {
        id: "rehab_1",
        syndicateId: "alpha_squad",
        targetActor: "alpha_squad",
        factionId: "rangers",
        goldCost: 300,
        timestamp: 1000,
        resolved: false,
        votes: { alice: { vote: true, timestamp: 1001 } },
      },
    };

    stateA.maliciousActors = {
      alpha_squad: true,
      other_rival: true,
    };

    stateB.maliciousActors = {
      alpha_squad: true,
      another_rival: true,
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Votes for rehab_1 should converge
    expect(merged.rehabCampaignProposals?.rehab_1?.votes?.player?.vote).toBe(true);
    expect(merged.rehabCampaignProposals?.rehab_1?.votes?.alice?.vote).toBe(true);

    // Other malicious statuses should merge correctly
    expect(merged.maliciousActors?.other_rival).toBe(true);
    expect(merged.maliciousActors?.another_rival).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Staking Pools & Faction-Wide Grace Period Extensions (AF-136)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "staking_test_pack",
      title: "Staking Test Pack",
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

  it("should support proposing and voting on SWF staking policy via consensus majority", () => {
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

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
      },
    };

    // 1. Player votes to enable SWF staking policy
    const action1 = {
      type: "SET_SWF_STAKING_POLICY",
      syndicateId: "alpha_squad",
      enabled: true,
      stakedFactions: {
        rangers: 50,
        shadow_guild: 30,
      },
      timestamp: 1001,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: action1 as any }, mockPack);
    expect(res1.ok).toBe(true);

    // No consensus yet (1 of 3)
    expect(res1.state.marginAccounts?.alpha_squad?.swfStakingEnabled).toBeUndefined();

    // 2. Alice votes for the same policy -> Consensus majority!
    const action2 = {
      type: "SET_SWF_STAKING_POLICY",
      syndicateId: "alpha_squad",
      enabled: true,
      stakedFactions: {
        rangers: 50,
        shadow_guild: 30,
      },
      timestamp: 1002,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: action2 as any }, mockPack);
    expect(res2.ok).toBe(true);

    const ma = res2.state.marginAccounts?.alpha_squad;
    expect(ma).toBeDefined();
    expect(ma?.swfStakingEnabled).toBe(true);
    expect(ma?.swfStakingTargets?.rangers).toBe(50);
    expect(ma?.swfStakingTargets?.shadow_guild).toBe(30);
  });

  it("should process SWF staking yields, reputation gains, and calculate grace extensions in economy ticks", () => {
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

    state.factionRep = {
      rangers: 10,
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        swfStakingEnabled: true,
        swfStakingTargets: {
          rangers: 50, // 50% of 600 buffer = 300 gold
          shadow_guild: 20, // 20% of 600 buffer = 120 gold
        },
        swfLiquidityBuffer: 600,
      },
    };

    // Tick the economy
    let res = tickEconomy(state, mockPack);

    const ma = res.marginAccounts?.alpha_squad;
    expect(ma).toBeDefined();

    // Staked amounts should be tracked
    expect(ma?.swfStakedFactions?.rangers).toBe(300);
    expect(ma?.swfStakedFactions?.shadow_guild).toBe(120);

    // Yield rates:
    // rangers: base 0.04 + rep (10) * 0.002 = 0.06 (6%)
    // shadow_guild: base 0.04 + rep (0) * 0.002 = 0.04 (4%)
    expect(ma?.swfStakingYields?.rangers).toBeCloseTo(0.06);
    expect(ma?.swfStakingYields?.shadow_guild).toBeCloseTo(0.04);

    // Yields returned to collateral:
    // rangers: 300 * 0.06 = 18 gold
    // shadow_guild: 120 * 0.04 = 4 gold
    // Total return = 22 gold
    // Initial collateral 1000 + 22 = 1022
    expect(ma?.collateral).toBe(1022);

    // Reputation accrued:
    // rangers: Math.max(1, 300 / 50) = 6 points
    // shadow_guild: Math.max(1, 120 / 50) = 2 points
    // Initial rangers rep: 10 + 6 = 16
    // Initial shadow_guild rep: 0 + 2 = 2
    expect(res.factionRep?.rangers).toBe(16);
    expect(res.factionRep?.shadow_guild).toBe(2);

    // Grace step extensions (1 per 100 gold staked):
    // rangers: 300 / 100 = 3 steps
    // shadow_guild: 120 / 100 = 1 step
    expect(ma?.swfGracePeriodExtensions?.rangers).toBe(3);
    expect(ma?.swfGracePeriodExtensions?.shadow_guild).toBe(1);
  });

  it("should extend loan grace periods dynamically using faction grace extensions", () => {
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

    // Set active grace extensions: rangers +3, shadow_guild +1 -> Total +4 grace steps
    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        swfGracePeriodExtensions: {
          rangers: 3,
          shadow_guild: 1,
        },
      },
    };

    // Add a joint loan due at step 100, no base grace steps
    state.jointLoans = {
      loan1: {
        id: "loan1",
        syndicateId: "alpha_squad",
        members: ["player"],
        collaterals: [],
        amount: 500,
        interestAccrued: 50,
        borrowStep: 85,
        dueStep: 100,
        timestamp: 1000,
      },
    };

    // Add a syndicate bank with an individual loan due at step 100
    state.syndicateBanks = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        interestRate: 5,
        balances: {},
        loans: {
          player: {
            agentId: "player",
            amount: 200,
            interestAccrued: 20,
            borrowStep: 85,
            dueStep: 100,
            collateralType: "safehouse",
            collateralId: "sh_1",
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.safehouses = {
      sh_1: {
        id: "sh_1",
        roomId: "clearing",
        ownerId: "player",
        syndicateId: "alpha_squad",
        level: 1,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Current step is 102. Without extensions, both loans are defaulted since 102 > 100
    // With dynamic +4 grace extensions, the effective due step is 104, so they are not defaulted!
    state.step = 102;

    let res = tickEconomy(state, mockPack);

    // Loans should not have defaulted
    expect(res.jointLoans?.loan1?.timestamp).toBe(102);
    expect(res.syndicateBanks?.alpha_squad?.loans?.player?.timestamp).toBe(102);
    expect(res.safehouses?.sh_1).toBeDefined(); // Collateral not liquidated

    // Set step to 105. 105 > 104, so defaults should now trigger
    res.step = 105;
    let resDefault = tickEconomy(res, mockPack);

    // Now defaults should trigger (safehouse sh_1 will be liquidated)
    expect(resDefault.safehouses?.sh_1).toBeUndefined();
  });

  it("should merge SWF staking policy votes correctly in Gossip nodes", () => {
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

    stateA.swfStakingPolicyVotes = {
      alpha_squad: {
        player: {
          enabled: true,
          stakedFactions: { rangers: 50 },
          timestamp: 1001,
        },
      },
    };

    stateB.swfStakingPolicyVotes = {
      alpha_squad: {
        alice: {
          enabled: true,
          stakedFactions: { rangers: 50 },
          timestamp: 1002,
        },
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    const votes = merged.swfStakingPolicyVotes?.alpha_squad;
    expect(votes).toBeDefined();
    expect(votes?.player?.enabled).toBe(true);
    expect(votes?.alice?.enabled).toBe(true);
  });

  it("should support proposing, voting on, and joining cooperative SWF staking campaigns", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
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
      beta_squad: {
        id: "beta_squad",
        name: "Beta Squad",
        members: ["charlie"],
        definedBy: "charlie",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
      },
      beta_squad: {
        syndicateId: "beta_squad",
        collateral: 1000,
        timestamp: 1000,
      },
    };

    // 1. Propose campaign
    const proposeAction = {
      type: "PROPOSE_COOPERATIVE_SWF_STAKING_CAMPAIGN",
      proposalId: "camp_1",
      syndicateId: "alpha_squad",
      campaignName: "Ranger Coalition Staking",
      factionId: "rangers",
      milestones: [
        { targetAmount: 500, yieldMultiplier: 1.2, repMultiplier: 1.5 },
        { targetAmount: 1000, yieldMultiplier: 1.5, repMultiplier: 2.0 },
      ],
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.cooperativeSWFStakingCampaigns?.camp_1).toBeUndefined(); // no consensus yet (1 of 3)

    // 2. Vote to approve campaign
    const voteAction = {
      type: "VOTE_COOPERATIVE_SWF_STAKING_CAMPAIGN",
      syndicateId: "alpha_squad",
      proposalId: "camp_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(res.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);

    // Campaign is established and creator syndicate is automatically participant!
    const camp = res.state.cooperativeSWFStakingCampaigns?.camp_1;
    expect(camp).toBeDefined();
    expect(camp?.creatorSyndicateId).toBe("alpha_squad");
    expect(camp?.participants).toContain("alpha_squad");

    // 3. Beta squad joins the campaign
    const joinAction = {
      type: "VOTE_JOIN_COOPERATIVE_SWF_STAKING_CAMPAIGN",
      syndicateId: "beta_squad",
      campaignId: "camp_1",
      vote: true,
      timestamp: 1003,
    };

    res = multiAgentStep(res.state, { agentId: "charlie", action: joinAction as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.cooperativeSWFStakingCampaigns?.camp_1?.participants).toContain("beta_squad");
  });

  it("should dynamically scale staking yields and reputation boosts based on achieved campaign milestones in economy ticks", () => {
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
      beta_squad: {
        id: "beta_squad",
        name: "Beta Squad",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // Pre-seed an active campaign with milestones:
    // target 500 -> yieldMultiplier 1.2, repMultiplier 1.5
    // target 1000 -> yieldMultiplier 1.5, repMultiplier 2.0
    state.cooperativeSWFStakingCampaigns = {
      camp_1: {
        id: "camp_1",
        factionId: "rangers",
        creatorSyndicateId: "alpha_squad",
        campaignName: "Ranger Coalition Staking",
        milestones: [
          { targetAmount: 500, yieldMultiplier: 1.2, repMultiplier: 1.5 },
          { targetAmount: 1000, yieldMultiplier: 1.5, repMultiplier: 2.0 },
        ],
        participants: ["alpha_squad", "beta_squad"],
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha_squad: {
        syndicateId: "alpha_squad",
        collateral: 1000,
        timestamp: 1000,
        swfStakingEnabled: true,
        swfStakingTargets: { rangers: 50 }, // 50% of 600 buffer = 300 staked
        swfLiquidityBuffer: 600,
      },
      beta_squad: {
        syndicateId: "beta_squad",
        collateral: 1000,
        timestamp: 1000,
        swfStakingEnabled: true,
        swfStakingTargets: { rangers: 40 }, // 40% of 1000 buffer = 400 staked
        swfLiquidityBuffer: 1000,
      },
    };

    // Total staked = 300 + 400 = 700. This achieves Milestone 1 (700 >= 500) but not Milestone 2 (700 < 1000).
    // Yield multiplier = 1.2x. Reputation multiplier = 1.5x.
    let res = tickEconomy(state, mockPack);

    const maAlpha = res.marginAccounts?.alpha_squad;
    const maBeta = res.marginAccounts?.beta_squad;

    // Yield Rates:
    // alpha_squad rangers: base 0.04 * 1.2 = 0.048 (4.8%)
    // beta_squad rangers: base 0.04 + (9 * 0.002) = 0.058 * 1.2 = 0.0696 (6.96%)
    expect(maAlpha?.swfStakingYields?.rangers).toBeCloseTo(0.048);
    expect(maBeta?.swfStakingYields?.rangers).toBeCloseTo(0.0696);

    // Yields returned to collateral:
    // alpha_squad: 300 * 0.048 = 14 gold
    // beta_squad: 400 * 0.0696 = 27.84 -> 27 gold
    // alpha initial collateral 1000 + 14 = 1014
    // beta initial collateral 1000 + 27 = 1027
    expect(maAlpha?.collateral).toBe(1014);
    expect(maBeta?.collateral).toBe(1027);

    // Reputation Accrued:
    // rangers base rep:
    // alpha_squad: Math.max(1, Math.floor(300 / 50 * 1.5)) = 9 points
    // beta_squad: Math.max(1, Math.floor(400 / 50 * 1.5)) = 12 points
    // Total Rangers rep = 9 + 12 = 21 points
    expect(res.factionRep?.rangers).toBe(21);

    // Let's adjust staking targets so totalStaked >= 1000:
    // alpha_squad stakes 100% of 600 buffer = 600
    // beta_squad stakes 50% of 1000 buffer = 500
    // Total staked = 1100. This achieves Milestone 2 (1100 >= 1000).
    // Yield multiplier = 1.5x. Reputation multiplier = 2.0x.
    state.marginAccounts.alpha_squad.swfStakingTargets = { rangers: 100 };
    state.marginAccounts.beta_squad.swfStakingTargets = { rangers: 50 };

    let res2 = tickEconomy(state, mockPack);

    const maAlpha2 = res2.marginAccounts?.alpha_squad;
    const maBeta2 = res2.marginAccounts?.beta_squad;

    // Yield Rates:
    // alpha_squad: rangers base (0.04 + 21 * 0.002) * 1.5 = 0.082 * 1.5 = 0.123 (12.3%)
    // beta_squad: rangers base (0.04 + 45 * 0.002) * 1.5 = 0.13 * 1.5 = 0.195 (19.5%)
    expect(maAlpha2?.swfStakingYields?.rangers).toBeCloseTo(0.123);
    expect(maBeta2?.swfStakingYields?.rangers).toBeCloseTo(0.195);

    // Yields returned:
    // alpha_squad: 614 * 0.123 = 75 gold (returned to collateral -> 1014 + 75 = 1089)
    // beta_squad: 513 * 0.195 = 100 gold (returned to collateral -> 1027 + 100 = 1127)
    expect(maAlpha2?.collateral).toBe(1089);
    expect(maBeta2?.collateral).toBe(1127);

    // Reputation Accrued:
    // rangers base rep:
    // alpha_squad: Math.max(1, Math.floor(600 / 50 * 2.0)) = 24 points
    // beta_squad: Math.max(1, Math.floor(500 / 50 * 2.0)) = 20 points
    // Total = 21 (initial) + 24 + 20 = 65 points
    expect(res2.factionRep?.rangers).toBe(65);
  });

  it("should merge SWF cooperative staking campaign states correctly in Gossip nodes", () => {
    let stateA = createInitialState({ seed: 12345, start: "clearing", agentsInit: ["player"] });
    let stateB = createInitialState({ seed: 12345, start: "clearing", agentsInit: ["player"] });

    stateA.cooperativeSWFStakingCampaigns = {
      camp_1: {
        id: "camp_1",
        factionId: "rangers",
        creatorSyndicateId: "alpha_squad",
        campaignName: "Ranger Coalition Staking",
        milestones: [{ targetAmount: 500, yieldMultiplier: 1.2, repMultiplier: 1.5 }],
        participants: ["alpha_squad"],
        timestamp: 1001,
      },
    };

    stateB.cooperativeSWFStakingCampaigns = {
      camp_1: {
        id: "camp_1",
        factionId: "rangers",
        creatorSyndicateId: "alpha_squad",
        campaignName: "Ranger Coalition Staking",
        milestones: [{ targetAmount: 500, yieldMultiplier: 1.2, repMultiplier: 1.5 }],
        participants: ["beta_squad"],
        timestamp: 1001,
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    const camp = merged.cooperativeSWFStakingCampaigns?.camp_1;
    expect(camp).toBeDefined();
    // Since timestamp is identical, participants should be unioned:
    expect(camp?.participants).toContain("alpha_squad");
    expect(camp?.participants).toContain("beta_squad");
  });
});

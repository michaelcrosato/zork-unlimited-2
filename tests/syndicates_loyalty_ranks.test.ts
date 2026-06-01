import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionLoyaltyRank, getRequiredRankForVaultLevel, isRankAtLeast, reconcileClaimLoyaltyRanks } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate Bank Multi-Tiered Dynamic Faction Loyalty Ranks & Standing-Gated Vault Access (AF-120)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "loyalty_ranks_pack",
      title: "Loyalty Ranks Test Pack",
      start_room: "market",
      vars_init: { gold: 2000, gold_alice: 1000, gold_bob: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should compute loyalty ranks dynamically based on the faction loyalty bonds locked gold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    // 1. None
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("None");

    // 2. Setup loyalty bond
    state.factionLoyaltyBonds = {
      "alpha-rangers": {
        id: "alpha-rangers",
        syndicateId: "alpha",
        factionId: "rangers",
        lockedGold: 500,
        timestamp: 1000,
      },
    };
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("None");

    // Bronze (>= 1000)
    state.factionLoyaltyBonds["alpha-rangers"].lockedGold = 1200;
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("Bronze");

    // Silver (>= 3000)
    state.factionLoyaltyBonds["alpha-rangers"].lockedGold = 3200;
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("Silver");

    // Gold (>= 5000)
    state.factionLoyaltyBonds["alpha-rangers"].lockedGold = 5200;
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("Gold");

    // Platinum (>= 10000)
    state.factionLoyaltyBonds["alpha-rangers"].lockedGold = 10200;
    expect(getSyndicateFactionLoyaltyRank(state, "alpha", "rangers")).toBe("Platinum");
  });

  it("should support proposing, voting, and resolving a CLAIM_LOYALTY_RANK consensus action", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
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

    // Attempting to claim Silver rank without a loyalty bond should fail
    const failClaimAction = {
      type: "CLAIM_LOYALTY_RANK",
      proposalId: "claim_1",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      rank: "Silver",
      timestamp: 1002,
    };
    let failRes = multiAgentStep(state, { agentId: "player", action: failClaimAction as any }, mockPack);
    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("does not have a loyalty bond");

    // Create a loyalty bond with 3000 gold (qualifies for Silver)
    state.factionLoyaltyBonds = {
      "alpha_squad-rangers": {
        id: "alpha_squad-rangers",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        lockedGold: 3000,
        timestamp: 1001,
      },
    };

    // Propose Claiming Silver (succeeds, votes recorded)
    let res1 = multiAgentStep(state, { agentId: "player", action: failClaimAction as any }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.claimLoyaltyRankProposals?.claim_1?.resolved).toBe(false);

    // Alice votes yes -> consensus reached! (2 out of 3 members)
    const voteAction = {
      type: "VOTE_LOYALTY_RANK",
      syndicateId: "alpha_squad",
      proposalId: "claim_1",
      vote: true,
      timestamp: 1003,
    };
    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.claimLoyaltyRankProposals?.claim_1?.resolved).toBe(true);
    expect(res2.state.factionLoyaltyRanks?.["alpha_squad-rangers"]?.rank).toBe("Silver");

    // Check that rank helper uses the resolved rank
    expect(getSyndicateFactionLoyaltyRank(res2.state, "alpha_squad", "rangers")).toBe("Silver");
  });

  it("should restrict premium syndicate bank vault access based on reached loyalty rank", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.syndicateBanks = {
      alpha: {
        syndicateId: "alpha",
        balances: {
          player: 500,
        },
        vaultUpgradeLevel: 2, // Requires Silver!
        timestamp: 1000,
      },
    };

    // Safehouse and current room setup in market
    state.safehouses = {
      market: {
        id: "sh1",
        roomId: "market",
        ownerId: "player",
        syndicateId: "alpha",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
      },
    };
    state.territoryControl = {
      market: "rangers",
    };

    // Currently unranked Rangers loyalty (lockedGold = 0 / no bond)
    // Deposit should fail due to vault upgrade level 2 (requires Silver, has None)
    const depositAction = {
      type: "DEPOSIT_SYNDICATE_BANK",
      syndicateId: "alpha",
      agentId: "player",
      amount: 100,
      timestamp: 1002,
    };
    let depositFail = multiAgentStep(state, { agentId: "player", action: depositAction as any }, mockPack);
    expect(depositFail.ok).toBe(false);
    expect(depositFail.rejectionReason).toContain("is too low to access the premium bank vault");

    // Borrow should fail
    const borrowAction = {
      type: "BORROW_SYNDICATE_BANK",
      syndicateId: "alpha",
      amount: 100,
      collateralType: "safehouse",
      collateralId: "market",
      timestamp: 1002,
    };
    let borrowFail = multiAgentStep(state, { agentId: "player", action: borrowAction as any }, mockPack);
    expect(borrowFail.ok).toBe(false);
    expect(borrowFail.rejectionReason).toContain("is too low to access the premium bank vault");

    // Withdraw should fail
    const withdrawAction = {
      type: "WITHDRAW_SYNDICATE_BANK",
      syndicateId: "alpha",
      agentId: "player",
      amount: 100,
      timestamp: 1002,
    };
    let withdrawFail = multiAgentStep(state, { agentId: "player", action: withdrawAction as any }, mockPack);
    expect(withdrawFail.ok).toBe(false);
    expect(withdrawFail.rejectionReason).toContain("is too low to access the premium bank vault");

    // Establish Silver loyalty rank via locked gold (3000 gold)
    state.factionLoyaltyBonds = {
      "alpha-rangers": {
        id: "alpha-rangers",
        syndicateId: "alpha",
        factionId: "rangers",
        lockedGold: 3000,
        timestamp: 1001,
      },
    };

    // Now deposit should succeed
    let depositOk = multiAgentStep(state, { agentId: "player", action: depositAction as any }, mockPack);
    expect(depositOk.ok).toBe(true);

    // Now borrow should succeed
    let borrowOk = multiAgentStep(state, { agentId: "player", action: borrowAction as any }, mockPack);
    expect(borrowOk.ok).toBe(true);

    // Now withdraw should succeed
    let withdrawOk = multiAgentStep(state, { agentId: "player", action: withdrawAction as any }, mockPack);
    expect(withdrawOk.ok).toBe(true);
  });

  it("should dynamically lower loan interest rates based on reached faction loyalty ranks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Active loan of 500 gold with 10% base interest rate
    state.syndicateBanks = {
      alpha: {
        syndicateId: "alpha",
        balances: {},
        interestRate: 10,
        loans: {
          player: {
            agentId: "player",
            amount: 500,
            collateralType: "safehouse",
            collateralId: "market",
            interestAccrued: 0,
            borrowStep: 0,
            dueStep: 100,
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.territoryControl = {
      market: "rangers",
    };

    // Case 1: Unranked loyalty -> full 10% interest rate applied (10% of 500 = 50 gold)
    let tickedUnranked = tickEconomy(state, mockPack);
    expect(tickedUnranked.syndicateBanks?.["alpha"]?.loans?.["player"]?.interestAccrued).toBe(50);

    // Case 2: Silver loyalty rank (+3000 gold locked) -> 2% discount applied (8% rate -> 40 gold interest)
    let stateSilver = { ...state };
    stateSilver.factionLoyaltyBonds = {
      "alpha-rangers": {
        id: "alpha-rangers",
        syndicateId: "alpha",
        factionId: "rangers",
        lockedGold: 3000,
        timestamp: 1001,
      },
    };
    let tickedSilver = tickEconomy(stateSilver, mockPack);
    expect(tickedSilver.syndicateBanks?.["alpha"]?.loans?.["player"]?.interestAccrued).toBe(40);

    // Case 3: Platinum loyalty rank (+10000 gold locked) -> 5% discount applied (5% rate -> 25 gold interest)
    let statePlatinum = { ...state };
    statePlatinum.factionLoyaltyBonds = {
      "alpha-rangers": {
        id: "alpha-rangers",
        syndicateId: "alpha",
        factionId: "rangers",
        lockedGold: 10000,
        timestamp: 1001,
      },
    };
    let tickedPlatinum = tickEconomy(statePlatinum, mockPack);
    expect(tickedPlatinum.syndicateBanks?.["alpha"]?.loans?.["player"]?.interestAccrued).toBe(25);
  });

  it("should merge loyalty proposals and resolved ranks correctly during Gossip mesh synchronization", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "market",
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "market",
      agentsInit: ["player"],
    });

    stateA.claimLoyaltyRankProposals = {
      claim_1: {
        id: "claim_1",
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Gold",
        timestamp: 1001,
        resolved: false,
        votes: {
          player: { vote: true, timestamp: 1001 },
        },
      },
    };

    stateB.claimLoyaltyRankProposals = {
      claim_1: {
        id: "claim_1",
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Gold",
        timestamp: 1001,
        resolved: false,
        votes: {
          alice: { vote: true, timestamp: 1002 },
        },
      },
    };

    stateA.factionLoyaltyRanks = {
      "alpha-rangers": {
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Silver",
        timestamp: 1001,
      },
    };

    stateB.factionLoyaltyRanks = {
      "alpha-rangers": {
        syndicateId: "alpha",
        factionId: "rangers",
        rank: "Gold", // Newer resolved rank
        timestamp: 1005,
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Assert proposal votes merged correctly
    const prop = merged.claimLoyaltyRankProposals?.claim_1;
    expect(prop).toBeDefined();
    expect(prop?.votes?.player?.vote).toBe(true);
    expect(prop?.votes?.alice?.vote).toBe(true);

    // Assert resolved ranks converged to the newer timestamp
    const rankObj = merged.factionLoyaltyRanks?.["alpha-rangers"];
    expect(rankObj).toBeDefined();
    expect(rankObj?.rank).toBe("Gold");
  });
});

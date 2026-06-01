import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionStanding, isFactionAlliedToSyndicate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Syndicate Bank Leverage Liquidity Mining Governance Pro-Rata Rehab Subsidies & Faction Loyalty Bonds (AF-119)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "rehab_subsidy_pack",
      title: "Reputation Rehab Subsidy Test Pack",
      start_room: "market",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Merchant Timmy",
        description: "A local trader.",
        faction: "rangers",
        gold: 100,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              topics: [],
            },
          ],
        },
      }
    ],
  });

  it("should support locking Faction Loyalty Bonds, scaling standing dynamically, and waiving tariffs", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha_squad: {
        id: "alpha_squad",
        name: "Alpha Squad",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    // Set up territory control and merchant licensing
    state.territoryControl = {
      market: "rangers",
    };
    state.merchantLicensings = {
      rangers: {
        factionId: "rangers",
        licenseCost: 500,
        tariffRate: 10,
        tariffWaiverThreshold: 20,
        tariffDiscountThreshold: 10,
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Verify initial reputation and tariff multiplier
    expect(state.factionRep?.rangers).toBeFalsy();
    const initialPrice = calculateTradePrice(state, mockPack.npcs[0], { id: "item_gem", base_value: 100 }, 100, true, "player", mockPack);
    expect(initialPrice).toBeGreaterThan(100); // tariff applied since player has no standing or license

    // 1. Lock 3000 gold in a loyalty bond for Rangers
    const lockAction = {
      type: "LOCK_LOYALTY_BOND",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      amount: 3000,
      timestamp: 1002,
    };

    let res = multiAgentStep(state, { agentId: "player", action: lockAction as any }, mockPack);
    expect(res.ok).toBe(true);

    // Verify warChest deducted and loyalty bond created
    expect(res.state.syndicates?.alpha_squad?.warChest).toBe(2000);
    expect(res.state.factionLoyaltyBonds?.["alpha_squad-rangers"]?.lockedGold).toBe(3000);

    // Verify dynamic standing scaling (+30 boost from 3000 gold locked)
    const standing = getSyndicateFactionStanding(res.state, "alpha_squad", "rangers");
    expect(standing).toBe(30);

    // Verify automatic tariff waiver is active
    const waivedPrice = calculateTradePrice(res.state, mockPack.npcs[0], { id: "item_gem", base_value: 100 }, 100, true, "player", mockPack);
    expect(waivedPrice).toBe(100); // base price with 0% tariff (waived!)
  });

  it("should support proposing, voting, and resolving a pro-rata rehab subsidy proposal", () => {
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

    // 1. Propose rehabilitation subsidy
    const proposeAction = {
      type: "PROPOSE_REHAB_SUBSIDY",
      proposalId: "subsidy_1",
      syndicateId: "alpha_squad",
      factionId: "rangers",
      subsidyPercentage: 40,
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    const prop = res1.state.rehabSubsidyProposals?.subsidy_1;
    expect(prop).toBeDefined();
    expect(prop?.resolved).toBeFalsy();
    expect(prop?.votes?.player?.vote).toBe(true);

    // 2. Alice votes true - majority consensus reached!
    const voteAction = {
      type: "VOTE_REHAB_SUBSIDY",
      syndicateId: "alpha_squad",
      proposalId: "subsidy_1",
      vote: true,
      timestamp: 1003,
    };

    let res2 = multiAgentStep(res1.state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.rehabSubsidyProposals?.subsidy_1?.resolved).toBe(true);
  });

  it("should dynamically apply the subsidy percentage during reputation rehab based on standing", () => {
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
        warChest: 2000,
      },
    };

    state.maliciousActors = {
      alpha_squad: true,
    };

    // Faction reserve pool starts with 1000 gold
    state.factionReservePools = {
      rangers: 1000,
    };

    // Establish a resolved pro-rata rehab subsidy of 50%
    state.rehabSubsidyProposals = {
      subsidy_1: {
        id: "subsidy_1",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        subsidyPercentage: 50,
        timestamp: 1001,
        resolved: true,
      },
    };

    // Lock 6000 gold in a loyalty bond for Rangers, giving us +60 standing
    state.factionLoyaltyBonds = {
      "alpha_squad-rangers": {
        id: "alpha_squad-rangers",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        lockedGold: 6000,
        timestamp: 1000,
      },
    };

    // 1. Propose rehab campaign costing 1000 gold
    const proposeAction = {
      type: "PROPOSE_REHAB_CAMPAIGN",
      proposalId: "rehab_1",
      syndicateId: "alpha_squad",
      targetActor: "alpha_squad",
      factionId: "rangers",
      goldCost: 1000,
      timestamp: 1002,
    };

    let res1 = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res1.ok).toBe(true);

    // 2. Alice votes true to resolve it
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

    // Verify dynamic cost reduction:
    // Standing is 60. Max subsidy is 50%, scaled dynamically by min(50, Math.floor(standing * 0.5)) -> standing * 0.5 = 30%.
    // So 30% of 1000 gold (300 gold) is subsidized!
    // Syndicate warChest should pay actual cost: 1000 - 300 = 700 gold.
    // 2000 - 700 = 1300 gold remaining.
    expect(res2.state.syndicates?.alpha_squad?.warChest).toBe(1300);

    // Faction reserve pool:
    // Started at 1000.
    // Subsidized share of 300 gold is pulled from reserve pool: 1000 - 300 = 700.
    // Actual cost paid of 700 is added: 700 + 700 = 1400.
    expect(res2.state.factionReservePools?.rangers).toBe(1400);
  });

  it("should support Gossip state merging convergence for subsidies and loyalty bonds", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    stateA.factionLoyaltyBonds = {
      "alpha_squad-rangers": {
        id: "alpha_squad-rangers",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        lockedGold: 2000,
        timestamp: 1000,
      },
    };

    stateB.factionLoyaltyBonds = {
      "alpha_squad-rangers": {
        id: "alpha_squad-rangers",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        lockedGold: 4000,
        timestamp: 1002, // newer LWW
      },
    };

    stateA.rehabSubsidyProposals = {
      subsidy_1: {
        id: "subsidy_1",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        subsidyPercentage: 30,
        timestamp: 1000,
        resolved: false,
      },
    };

    stateB.rehabSubsidyProposals = {
      subsidy_1: {
        id: "subsidy_1",
        syndicateId: "alpha_squad",
        factionId: "rangers",
        subsidyPercentage: 30,
        timestamp: 1002, // newer LWW resolution
        resolved: true, // newer LWW resolution
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.factionLoyaltyBonds?.["alpha_squad-rangers"]?.lockedGold).toBe(4000);
    expect(merged.rehabSubsidyProposals?.subsidy_1?.resolved).toBe(true);
  });
});

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
          rangers: 50,       // 50% of 600 buffer = 300 gold
          shadow_guild: 20,  // 20% of 600 buffer = 120 gold
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
});

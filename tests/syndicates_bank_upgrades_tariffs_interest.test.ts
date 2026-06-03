import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { getSyndicateBankCapacity } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Bank Vault Upgrades, Tariffs, & Interest (AF-86)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_banking_test_pack",
      title: "Syndicate Banking Test Pack",
      start_room: "clearing",
      vars_init: { gold: 2000, gold_alice: 1000, gold_bob: 1000, gold_charlie: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A secure clearing deep in the woods.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should upgrade bank vault and dynamically scale deposit capacity with enforcer heat", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // 1. Check default bank capacity (baseCap = 1000, upgradeBonus = 0, heat = 0)
    let cap = getSyndicateBankCapacity(state, "blood_fangs");
    expect(cap).toBe(1000);

    // 2. Perform UPGRADE_BANK_VAULT
    const upgradeRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_BANK_VAULT",
          syndicateId: "blood_fangs",
          cost: 300,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(upgradeRes.ok).toBe(true);
    expect(upgradeRes.state.vars["gold"]).toBe(700);
    expect(upgradeRes.state.syndicateBanks?.["blood_fangs"].vaultUpgradeLevel).toBe(1);

    // 3. Upgraded capacity check (baseCap = 1000, upgradeBonus = 500)
    cap = getSyndicateBankCapacity(upgradeRes.state, "blood_fangs");
    expect(cap).toBe(1500);

    // 4. Test capacity reduction via enforcer heat pressure in syndicate turf
    let stateWithHeat = { ...upgradeRes.state };
    stateWithHeat.syndicateTurf = {
      clearing: "blood_fangs",
    };
    stateWithHeat.enforcementHeat = {
      clearing: { roomId: "clearing", heat: 10, timestamp: 1010 },
    };

    // 10 heat reduces capacity by 10 * 50 = 500 gold. Total cap: 1500 - 500 = 1000.
    cap = getSyndicateBankCapacity(stateWithHeat, "blood_fangs");
    expect(cap).toBe(1000);

    // Extreme heat (say, 50 heat reduces by 2500, capped at 100 minimum)
    stateWithHeat.enforcementHeat = {
      clearing: { roomId: "clearing", heat: 50, timestamp: 1010 },
    };
    cap = getSyndicateBankCapacity(stateWithHeat, "blood_fangs");
    expect(cap).toBe(100);
  });

  it("should enforce deposit capacity limits on DEPOSIT_SYNDICATE_BANK", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1200 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Capacity is default 1000. Player tries to deposit 1100.
    const failRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          agentId: "player",
          amount: 1100,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(failRes.ok).toBe(false);
    expect(failRes.rejectionReason).toContain("deposit capacity exceeded");

    // Player deposits 900 successfully
    const successRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          agentId: "player",
          amount: 900,
          timestamp: 1005,
        },
      },
      mockPack
    );

    expect(successRes.ok).toBe(true);
    expect(successRes.state.syndicateBanks?.["blood_fangs"].balances["player"]).toBe(900);

    // Player tries to deposit another 200 (violating 1000 limit)
    const failRes2 = multiAgentStep(
      successRes.state,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          agentId: "player",
          amount: 200,
          timestamp: 1010,
        },
      },
      mockPack
    );

    expect(failRes2.ok).toBe(false);
    expect(failRes2.rejectionReason).toContain("deposit capacity exceeded");
  });

  it("should establish withdrawal tariffs and apply them on non-members with distribution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100, gold_alice: 0, gold_bob: 1000 },
      agentsInit: ["alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
      },
    };

    // Setup: alice has 500 gold in the bank. bob (non-member) somehow has 500 in the bank (e.g. from prior membership)
    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {
          alice: 500,
          bob: 500,
        },
        timestamp: 1000,
      },
    };

    // Bob tries to establish tariff and gets rejected
    const bobTariffRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "ESTABLISH_WITHDRAWAL_TARIFF",
          syndicateId: "blood_fangs",
          tariffAmount: 50,
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(bobTariffRes.ok).toBe(false);

    // Alice establishes 50 gold withdrawal tariff
    const aliceTariffRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "ESTABLISH_WITHDRAWAL_TARIFF",
          syndicateId: "blood_fangs",
          tariffAmount: 50,
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(aliceTariffRes.ok).toBe(true);
    expect(aliceTariffRes.state.syndicateBanks?.["blood_fangs"].withdrawalTariff).toBe(50);

    // Member alice withdraws 100 gold. Pays 0 tariff.
    const aliceWithdrawRes = multiAgentStep(
      aliceTariffRes.state,
      {
        agentId: "alice",
        action: {
          type: "WITHDRAW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          agentId: "alice",
          amount: 100,
          timestamp: 1010,
        },
      },
      mockPack
    );
    expect(aliceWithdrawRes.ok).toBe(true);
    expect(aliceWithdrawRes.state.vars["gold_alice"]).toBe(100); // gets full 100 gold
    expect(aliceWithdrawRes.state.syndicateBanks?.["blood_fangs"].balances["alice"]).toBe(400);

    // Non-member bob withdraws 100 gold. Pays 50 tariff, gets net 50 gold.
    // The 50 tariff is distributed to syndicate members (alice is the sole member, so she gets 50 gold).
    const bobWithdrawRes = multiAgentStep(
      aliceWithdrawRes.state,
      {
        agentId: "bob",
        action: {
          type: "WITHDRAW_SYNDICATE_BANK",
          syndicateId: "blood_fangs",
          agentId: "bob",
          amount: 100,
          timestamp: 1015,
        },
      },
      mockPack
    );
    expect(bobWithdrawRes.ok).toBe(true);
    expect(bobWithdrawRes.state.vars["gold_bob"]).toBe(1050); // net 50 gold received (1000 + 50)
    expect(bobWithdrawRes.state.vars["gold_alice"]).toBe(150); // 100 + 50 tariff reward!
    expect(bobWithdrawRes.state.syndicateBanks?.["blood_fangs"].balances["bob"]).toBe(400);
  });

  it("should cast interest rate votes and arbitrate consensual rates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100 },
      agentsInit: ["alice", "bob", "charlie"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["alice", "bob", "charlie"],
        definedBy: "alice",
        timestamp: 1000,
      },
    };

    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {},
        timestamp: 1000,
      },
    };

    // Alice votes 5% interest rate
    let res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_INTEREST_RATE",
          syndicateId: "blood_fangs",
          rate: 5,
          timestamp: 1005,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.bankInterestPolicies?.["blood_fangs"]).toBe(5);

    // Bob votes 10%
    res = multiAgentStep(
      res.state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_INTEREST_RATE",
          syndicateId: "blood_fangs",
          rate: 10,
          timestamp: 1010,
        },
      },
      mockPack
    );
    // 10% has 1 vote, 5% has 1 vote. Tie-breaker descending rate prefers 10%
    expect(res.state.bankInterestPolicies?.["blood_fangs"]).toBe(10);

    // Charlie votes 5%
    res = multiAgentStep(
      res.state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_INTEREST_RATE",
          syndicateId: "blood_fangs",
          rate: 5,
          timestamp: 1015,
        },
      },
      mockPack
    );
    // 5% has 2 votes, 10% has 1 vote. Majority consensually wins 5%
    expect(res.state.bankInterestPolicies?.["blood_fangs"]).toBe(5);
  });

  it("should pay periodic bank interest to syndicate members in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 100 },
      agentsInit: ["alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
      },
    };

    // Alice is a member, bob is a non-member. Both have 400 gold in the bank.
    state.syndicateBanks = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        balances: {
          alice: 400,
          bob: 400,
        },
        interestRate: 10, // 10% interest rate per tick
        timestamp: 1000,
      },
    };

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Member alice gets credited 10% of 400 = 40 gold interest. New balance: 440.
    expect(tickedState.syndicateBanks?.["blood_fangs"].balances["alice"]).toBe(440);

    // Non-member bob gets 0 interest. Balance remains 400.
    expect(tickedState.syndicateBanks?.["blood_fangs"].balances["bob"]).toBe(400);

    // Check capacity cap on interest payments. Set capacity limit close to total balance.
    // Capacity with 9 heat is 550. Total balances: 440 + 400 = 840. Since 840 > 550, remainingCap = 0.
    tickedState.syndicateBanks!["blood_fangs"].vaultUpgradeLevel = 0; // Cap remains default 1000
    tickedState.syndicateTurf = { clearing: "blood_fangs" };
    tickedState.enforcementHeat = { clearing: { roomId: "clearing", heat: 9, timestamp: 1000 } };
    const heatTicked = tickEconomy(tickedState, mockPack);
    // Interest payout capped at 0. Alice's balance remains 440.
    expect(heatTicked.syndicateBanks?.["blood_fangs"].balances["alice"]).toBe(440);
  });
});

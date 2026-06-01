import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank CDO & CDS Margin Accounts & Collateral Call Liquidations (AF-110)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "margin_test_pack",
      title: "Margin Test Pack",
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

  it("should support opening a margin account and depositing collateral", () => {
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
        warChest: 1000,
      },
    };

    // 1. Validation: Fail to open with non-existent syndicate
    const failOpen1 = {
      type: "OPEN_CDS_MARGIN_ACCOUNT",
      syndicateId: "wrong_synd",
      initialDeposit: 300,
      timestamp: 1000,
    };
    let resOpen1 = multiAgentStep(state, { agentId: "player", action: failOpen1 as any }, mockPack);
    expect(resOpen1.ok).toBe(false);
    expect(resOpen1.rejectionReason).toContain("does not exist");

    // 2. Validation: Fail to open with insufficient war chest gold
    const failOpen2 = {
      type: "OPEN_CDS_MARGIN_ACCOUNT",
      syndicateId: "blood_fangs",
      initialDeposit: 1500, // exceeds 1000 war chest gold
      timestamp: 1000,
    };
    let resOpen2 = multiAgentStep(state, { agentId: "player", action: failOpen2 as any }, mockPack);
    expect(resOpen2.ok).toBe(false);
    expect(resOpen2.rejectionReason).toContain("insufficient gold");

    // 3. Success: Open margin account with 300 gold initial deposit
    const validOpen = {
      type: "OPEN_CDS_MARGIN_ACCOUNT",
      syndicateId: "blood_fangs",
      initialDeposit: 300,
      timestamp: 1001,
    };
    let resOpenSuccess = multiAgentStep(state, { agentId: "player", action: validOpen as any }, mockPack);
    expect(resOpenSuccess.ok).toBe(true);

    let nextState = resOpenSuccess.state;
    expect(nextState.syndicates?.blood_fangs?.warChest).toBe(700); // 1000 - 300
    expect(nextState.marginAccounts?.blood_fangs).toBeDefined();
    expect(nextState.marginAccounts?.blood_fangs?.collateral).toBe(300);

    // 4. Validation: Fail to deposit to non-existent margin account
    const failDeposit1 = {
      type: "DEPOSIT_MARGIN_COLLATERAL",
      syndicateId: "wrong_synd",
      amount: 200,
      timestamp: 1002,
    };
    let resDep1 = multiAgentStep(nextState, { agentId: "player", action: failDeposit1 as any }, mockPack);
    expect(resDep1.ok).toBe(false);

    // 5. Success: Deposit 200 gold collateral to existing margin account
    const validDeposit = {
      type: "DEPOSIT_MARGIN_COLLATERAL",
      syndicateId: "blood_fangs",
      amount: 200,
      timestamp: 1003,
    };
    let resDepSuccess = multiAgentStep(nextState, { agentId: "player", action: validDeposit as any }, mockPack);
    expect(resDepSuccess.ok).toBe(true);

    let finalState = resDepSuccess.state;
    expect(finalState.syndicates?.blood_fangs?.warChest).toBe(500); // 700 - 200
    expect(finalState.marginAccounts?.blood_fangs?.collateral).toBe(500); // 300 + 200
  });

  it("should support writing a CDS on margin with double-consent activation and adding it to the margin account", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corp",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 300,
        tranches: {
          senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: 150, ownership: { buyer_corp: 150 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: 90, ownership: { buyer_corp: 90 }, timestamp: 1000 },
          equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: 60, ownership: { buyer_corp: 60 }, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // 1. Validation: Try to write CDS on margin when writer has no margin account
    const failWriteAct = {
      type: "WRITE_CREDIT_DEFAULT_SWAP",
      cdsId: "cds_margin_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      cdoId: "cdo_test_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      marginEnabled: true,
      timestamp: 1001,
    };
    let resFailWrite = multiAgentStep(state, { agentId: "alice", action: failWriteAct as any }, mockPack);
    expect(resFailWrite.ok).toBe(false);
    expect(resFailWrite.rejectionReason).toContain("does not have a margin account");

    // Open margin account for writer_corp
    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 200,
        leveragedCDSIds: [],
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // 2. Buy vote cast
    const buyAct = {
      type: "BUY_CREDIT_DEFAULT_SWAP",
      cdsId: "cds_margin_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      cdoId: "cdo_test_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      marginEnabled: true,
      timestamp: 1002,
    };
    let resBuy = multiAgentStep(state, { agentId: "player", action: buyAct as any }, mockPack);
    expect(resBuy.ok).toBe(true);

    // 3. Write vote cast by writer_corp representative (alice)
    const writeAct = {
      type: "WRITE_CREDIT_DEFAULT_SWAP",
      cdsId: "cds_margin_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      cdoId: "cdo_test_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      marginEnabled: true,
      timestamp: 1003,
    };
    let resWrite = multiAgentStep(resBuy.state, { agentId: "alice", action: writeAct as any }, mockPack);
    expect(resWrite.ok).toBe(true);

    // 4. Verify CDS is activated and writer's margin account links the CDS Id
    const finalState = resWrite.state;
    expect(finalState.creditDefaultSwaps?.cds_margin_1?.active).toBe(true);
    expect(finalState.creditDefaultSwaps?.cds_margin_1?.marginEnabled).toBe(true);
    expect(finalState.marginAccounts?.writer_corp?.leveragedCDSIds).toContain("cds_margin_1");
  });

  it("should support trading a CDO tranche on margin, tracking leveraged positions and down payments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      night_stalkers: {
        id: "night_stalkers",
        name: "Night Stalkers",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 500,
      },
    };

    // Prepopulate a CDO owned by night_stalkers
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "night_stalkers",
        totalValue: 200,
        timestamp: 1000,
        assets: [],
        tranches: {
          senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: 200, ownership: { night_stalkers: 200 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: 0, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: 0, ownership: {}, timestamp: 1000 },
        },
      },
    };

    // Open margin account for blood_fangs
    state.marginAccounts = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        collateral: 300,
        leveragedCDSIds: [],
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // blood_fangs buys 100 Senior stake on margin: Price is 100 gold, marginEnabled = true, borrowedAmount = 70.
    // Down payment = 100 - 70 = 30 gold.
    const marginTradeAct = {
      type: "TRADE_CDO_TRANCHE",
      cdoId: "cdo_test_1",
      trancheId: "senior",
      sellerSyndicateId: "night_stalkers",
      buyerSyndicateId: "blood_fangs",
      amount: 100,
      goldPrice: 100,
      marginEnabled: true,
      borrowedAmount: 70,
      timestamp: 1005,
    };

    let tradeRes = multiAgentStep(state, { agentId: "player", action: marginTradeAct as any }, mockPack);
    expect(tradeRes.ok).toBe(true);

    const finalState = tradeRes.state;
    // Check tranche ownership
    expect(finalState.cdos?.cdo_test_1?.tranches.senior.ownership.night_stalkers).toBe(100);
    expect(finalState.cdos?.cdo_test_1?.tranches.senior.ownership.blood_fangs).toBe(100);

    // Check war chests:
    // Buyer (blood_fangs) paid down payment of 30 gold => 1000 - 30 = 970
    expect(finalState.syndicates?.blood_fangs?.warChest).toBe(970);
    // Seller (night_stalkers) received full 100 gold price => 500 + 100 = 600
    expect(finalState.syndicates?.night_stalkers?.warChest).toBe(600);

    // Check leveraged position in buyer's margin account
    const pos = finalState.marginAccounts?.blood_fangs?.leveragedTranchePositions?.["cdo_test_1_senior"];
    expect(pos).toBeDefined();
    expect(pos?.borrowedAmount).toBe(70);
    expect(pos?.purchasedStake).toBe(100);
  });

  it("should trigger automatic margin call liquidation when net equity falls below maintenance threshold", () => {
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
        warChest: 100, // Has 100 gold
      },
    };

    // Set up a CDO where blood_fangs owns 100 Senior stake
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "blood_fangs",
        totalValue: 100,
        timestamp: 1000,
        assets: [],
        tranches: {
          senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: 100, ownership: { blood_fangs: 100 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: 0, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: 0, ownership: {}, timestamp: 1000 },
        },
      },
    };

    // Prepopulate active CDS contract written on margin by blood_fangs (Notional: 100)
    state.creditDefaultSwaps = {
      cds_margin: {
        id: "cds_margin",
        buyerSyndicateId: "some_buyer",
        writerSyndicateId: "blood_fangs",
        cdoId: "cdo_test_1",
        trancheId: "senior",
        notionalValue: 100,
        premiumRate: 0.0, // 0 premium for test focus
        timestamp: 1000,
        active: true,
        marginEnabled: true,
      },
    };

    // Open margin account for blood_fangs with 50 collateral and the leveraged senior position (borrowed 70) and written CDS
    state.marginAccounts = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        collateral: 50,
        leveragedCDSIds: ["cds_margin"],
        leveragedTranchePositions: {
          "cdo_test_1_senior": {
            cdoId: "cdo_test_1",
            trancheId: "senior",
            borrowedAmount: 70,
            purchasedStake: 100,
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // At this point:
    // currentStakeValue = 100.
    // Net Equity = collateral (50) + (currentStakeValue (100) - borrowed (70)) = 50 + 30 = 80.
    // Maintenance requirement = 0.20 * CDS (100) + 0.10 * CDO borrowed (70) = 20 + 7 = 27.
    // 80 >= 27 => No margin call. Let's verify by ticking economy.
    let tick1 = tickEconomy(state, mockPack);
    expect(tick1.marginAccounts?.blood_fangs?.leveragedTranchePositions?.["cdo_test_1_senior"]).toBeDefined();
    expect(tick1.creditDefaultSwaps?.cds_margin?.active).toBe(true);
    expect(tick1.syndicates?.blood_fangs?.warChest).toBe(100);

    // Now, write down the CDO tranche. The total value drops from 100 to 10 (due to some simulated asset write-downs).
    tick1.cdos!.cdo_test_1!.tranches.senior.totalValue = 10;
    tick1.cdos!.cdo_test_1!.tranches.senior.ownership.blood_fangs = 10;

    // At this point:
    // currentStakeValue = 10.
    // Net Equity = 50 + (10 - 70) = -10.
    // Maintenance requirement = 27.
    // Net Equity (-10) < 27 => MARGIN CALL!
    // Automatic liquidation should deactivate CDS (cds_margin), zero out blood_fangs senior ownership,
    // and cover the margin deficit (-10) by sweeping 10 gold from blood_fangs' war chest (reducing it to 90).
    let tick2 = tickEconomy(tick1, mockPack);

    // 1. Verify CDS deactivation
    expect(tick2.creditDefaultSwaps?.cds_margin?.active).toBe(false);

    // 2. Verify tranche ownership zeroed
    expect(tick2.cdos?.cdo_test_1?.tranches.senior.ownership.blood_fangs).toBe(0);

    // 3. Verify margin positions and CDS links cleared
    expect(tick2.marginAccounts?.blood_fangs?.leveragedTranchePositions?.["cdo_test_1_senior"]).toBeUndefined();
    expect(tick2.marginAccounts?.blood_fangs?.leveragedCDSIds?.length).toBe(0);
    expect(tick2.marginAccounts?.blood_fangs?.collateral).toBe(0);

    // 4. Verify war chest sweep: blood_fangs warChest goes from 100 to 90 to cover -10 deficit
    expect(tick2.syndicates?.blood_fangs?.warChest).toBe(90);

    // 5. Verify journal entries were appended
    const journalStr = JSON.stringify(tick2.journal);
    expect(journalStr).toContain("margin balance fell below maintenance threshold");
    expect(journalStr).toContain("Swept 10 gold from Syndicate blood_fangs war chest to cover margin deficit of 10 gold");
  });

  it("should successfully merge margin accounts across Gossip mesh using LWW", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
    });
    stateA.marginAccounts = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        collateral: 300,
        timestamp: 1050,
      },
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
    });
    stateB.marginAccounts = {
      blood_fangs: {
        syndicateId: "blood_fangs",
        collateral: 500,
        timestamp: 1100, // Newer wins
      },
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.marginAccounts?.blood_fangs?.collateral).toBe(500);
    expect(merged.marginAccounts?.blood_fangs?.timestamp).toBe(1100);
  });

  it("should support authorizing and revoking margin rehypothecation by consensus, generating yield, sweeping under enforcer pressure, adjusting maintenance thresholds, and merging via Gossip", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // Open margin account first
    const openAction = {
      type: "OPEN_CDS_MARGIN_ACCOUNT",
      syndicateId: "blood_fangs",
      initialDeposit: 500,
      timestamp: 1001,
    };
    let resOpen = multiAgentStep(state, { agentId: "player", action: openAction as any }, mockPack);
    expect(resOpen.ok).toBe(true);
    state = resOpen.state;

    // 1. Authorize: Vote 1 (Player) - No consensus yet (needs 2 out of 3 votes)
    const auth1 = {
      type: "AUTHORIZE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      vaultId: "high_yield",
      percentage: 50,
      timestamp: 1002,
    };
    let resAuth1 = multiAgentStep(state, { agentId: "player", action: auth1 as any }, mockPack);
    expect(resAuth1.ok).toBe(true);
    state = resAuth1.state;
    expect(state.marginAccounts?.blood_fangs?.rehypothecationAuthorized).toBeUndefined();

    // 2. Authorize: Vote 2 (Alice) - Achieving majority consensus!
    const auth2 = {
      type: "AUTHORIZE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      vaultId: "high_yield",
      percentage: 50,
      timestamp: 1003,
    };
    let resAuth2 = multiAgentStep(state, { agentId: "alice", action: auth2 as any }, mockPack);
    expect(resAuth2.ok).toBe(true);
    state = resAuth2.state;
    
    // Check that rehypothecation is authorized!
    const marginAccount = state.marginAccounts?.blood_fangs;
    expect(marginAccount?.rehypothecationAuthorized).toBe(true);
    expect(marginAccount?.rehypothecationVaultId).toBe("high_yield");
    expect(marginAccount?.rehypothecationPercentage).toBe(50);

    // 3. Maintenance margin adjustment
    // Vault: high_yield (sweepRisk: 0.05, interestRate: 0.08)
    // Collateral: 500. RehypothecatedAmount: 500 * 50% = 250.
    // Premium: Math.round(250 * (0.10 + 0.05)) = Math.round(250 * 0.15) = 38.
    // We have no other CDS / CDO positions, so base is 0.
    // Required maintenance should be 38.
    // Let's call tickEconomy directly and inspect.
    let tickState = tickEconomy(state, mockPack);
    // Let's assert rehypothecation yield was earned!
    // Rehypothecated: 250. Yield at 8% interest: 250 * 0.08 = 20 gold.
    // Returned to margin (80%): 20 * 0.8 = 16 gold.
    // Total collateral: 500 + 16 = 516.
    expect(tickState.marginAccounts?.blood_fangs?.collateral).toBeGreaterThan(500);

    // Let's verify the journal log has yield info
    const journalStr = JSON.stringify(tickState.journal);
    expect(journalStr).toContain("earned");
    expect(journalStr).toContain("passive interest");

    // 4. Test Enforcer Sweep Risk
    // Let's seed the state so that the sweep risk roll triggers a sweep.
    // Since we have getSecondaryReserveVaults, let's inject a custom vault into state.secondaryReserveVaults.
    state.secondaryReserveVaults = {
      ruinous_pool: {
        vaultId: "ruinous_pool",
        name: "Ruinous Vault",
        interestRate: 0.50,
        sweepRisk: 1.0, // 100% risk!
        timestamp: 1000,
      }
    };
    
    // Vote to authorize ruinous_pool
    const authRuinous1 = {
      type: "AUTHORIZE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      vaultId: "ruinous_pool",
      percentage: 60,
      timestamp: 1005,
    };
    state = multiAgentStep(state, { agentId: "player", action: authRuinous1 as any }, mockPack).state;
    const authRuinous2 = {
      type: "AUTHORIZE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      vaultId: "ruinous_pool",
      percentage: 60,
      timestamp: 1006,
    };
    state = multiAgentStep(state, { agentId: "alice", action: authRuinous2 as any }, mockPack).state;
    
    expect(state.marginAccounts?.blood_fangs?.rehypothecationVaultId).toBe("ruinous_pool");
    expect(state.marginAccounts?.blood_fangs?.rehypothecationPercentage).toBe(60);

    // Let's tick economy. Since sweepRisk is 1.0, the sweep roll (<= 100) will definitely trigger a sweep!
    // Collateral was 517 due to earned yield from the previous tick.
    // RehypothecatedAmount: Math.floor(517 * 60%) = 310.
    // Swept: 310 gold. Remaining: 207 gold.
    let sweepState = tickEconomy(state, mockPack);
    expect(sweepState.marginAccounts?.blood_fangs?.collateral).toBe(207);
    expect(JSON.stringify(sweepState.journal)).toContain("swept vault");

    // 5. Test Revoking Rehypothecation by Consensus majority
    // Bob and Alice vote to revoke
    const revoke1 = {
      type: "REVOKE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      timestamp: 1010,
    };
    state = multiAgentStep(state, { agentId: "bob", action: revoke1 as any }, mockPack).state;
    expect(state.marginAccounts?.blood_fangs?.rehypothecationAuthorized).toBe(true); // Still true, needs 2 out of 3

    const revoke2 = {
      type: "REVOKE_MARGIN_REHYPOTHECATION",
      syndicateId: "blood_fangs",
      timestamp: 1011,
    };
    state = multiAgentStep(state, { agentId: "alice", action: revoke2 as any }, mockPack).state;
    expect(state.marginAccounts?.blood_fangs?.rehypothecationAuthorized).toBe(false);

    // 6. Test Gossip Merging of Rehypothecation Votes
    let stateA = createInitialState({ seed: 12345, start: "clearing" });
    stateA.marginRehypothecationVotes = {
      blood_fangs: {
        player: { vaultId: "high_yield", percentage: 50, timestamp: 1200 },
      }
    };
    let stateB = createInitialState({ seed: 12345, start: "clearing" });
    stateB.marginRehypothecationVotes = {
      blood_fangs: {
        player: { vaultId: "risk_venture", percentage: 70, timestamp: 1300 }, // newer
        alice: { vaultId: "high_yield", percentage: 50, timestamp: 1100 },
      }
    };

    let merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.marginRehypothecationVotes?.blood_fangs?.player?.percentage).toBe(70);
    expect(merged.marginRehypothecationVotes?.blood_fangs?.alice?.percentage).toBe(50);
  });
});


import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default Credit Default Swaps (CDS) & Hedging (AF-228)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_default_cds_pack",
      title: "Sovereign Debt Default CDS Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: ["merchant_1"],
        exits: [],
      }
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_1",
        name: "Defaulted Merchant",
        description: "A defaulted merchant.",
        faction: "beta",
        min_rep: 0,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome",
              topics: [],
            }
          ],
        },
      }
    ],
  });

  it("should propose, sign, activate, accrue dynamic premiums, and settle CDS contracts on default", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol", "dan", "eva"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Buyer)",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Default target)",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate (Writer)",
        members: ["dan", "eva"],
        definedBy: "dan",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    // Faction reps
    state.factionRep = {
      alpha: 100,
      beta: 100,
      gamma: 100,
    };

    // Give beta outstanding deflection fees
    state.outstandingDeflectionFees = {
      beta: 500,
    };

    // 1. Propose CDS contract by Alpha member (Player)
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PURCHASE_CDS_CONTRACT",
          cdsId: "cds_1",
          buyerSyndicateId: "alpha",
          writerSyndicateId: "gamma",
          targetSyndicateId: "beta",
          notionalValue: 1000,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Check proposed state
    let contract = state.sovereignDebtCDSContracts?.["cds_1"];
    expect(contract).toBeDefined();
    expect(contract?.status).toBe("proposed");
    expect(contract?.votes?.["player"]?.vote).toBe(true);

    // 2. Alice (Alpha member) votes to sign
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "PURCHASE_CDS_CONTRACT",
          cdsId: "cds_1",
          buyerSyndicateId: "alpha",
          writerSyndicateId: "gamma",
          targetSyndicateId: "beta",
          notionalValue: 1000,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Still proposed because writer hasn't voted yet
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.status).toBe("proposed");

    // 3. Dan (Gamma member, writer) votes to sign/write
    stepRes = multiAgentStep(
      state,
      {
        agentId: "dan",
        action: {
          type: "PURCHASE_CDS_CONTRACT",
          cdsId: "cds_1",
          buyerSyndicateId: "alpha",
          writerSyndicateId: "gamma",
          targetSyndicateId: "beta",
          notionalValue: 1000,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Still proposed because writer needs majority (need dan and eva or at least > half, members = 2 so need > 1 which is 2!)
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.status).toBe("proposed");

    // 4. Eva (Gamma member, writer) votes to sign/write
    stepRes = multiAgentStep(
      state,
      {
        agentId: "eva",
        action: {
          type: "PURCHASE_CDS_CONTRACT",
          cdsId: "cds_1",
          buyerSyndicateId: "alpha",
          writerSyndicateId: "gamma",
          targetSyndicateId: "beta",
          notionalValue: 1000,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Now it should be ACTIVE!
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.status).toBe("active");

    // 5. Test Dynamic Premium Pricing during tickEconomy
    // Before tick, check war chests: Alpha = 5000, Gamma = 4000
    // Outstanding fees on beta = 500. Heat = 0, Grace = false
    // basePremium = Math.max(10, Math.round(1000 * 0.05)) = 50
    // outstandingFeeMultiplier = 1.0 + 500 / 500 = 2.0
    // heatMultiplier = 1.0
    // graceMultiplier = 1.0
    // expected premium = 50 * 2.0 = 100 gold
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5000);
    expect(state.syndicates?.["gamma"]?.warChest).toBe(4000);

    state = tickEconomy(state, mockPack);

    expect(state.syndicates?.["alpha"]?.warChest).toBe(4900); // deducted 100
    expect(state.syndicates?.["gamma"]?.warChest).toBe(4100); // paid to writer!

    // 6. Test premium scaling with enforcer heat and grace periods
    // Set outstanding deflection fees of beta = 0 (multiplier = 1.0)
    state.outstandingDeflectionFees = { beta: 0 };
    // Set enforcement heat in rooms containing beta assets (beta has a safehouse in "clearing")
    state.safehouses = {
      clearing: {
        id: "safehouse_beta",
        roomId: "clearing",
        ownerId: "bob",
        syndicateId: "beta",
        level: 1,
        stashCapacity: 100,
        stashItems: [],
        timestamp: 1000,
        storageUpgradeLevel: 0,
        storageRentRate: 0,
      }
    };
    state.enforcementHeat = {
      clearing: {
        roomId: "clearing",
        heat: 50, // multiplier = 1.0 + 50/50 = 2.0
        timestamp: 1000,
      }
    };
    // Expected premium without grace: base(50) * fee(1.0) * heat(2.0) * grace(1.0) = 100 gold
    // Let's add an active default grace period for beta!
    state.sovereignDebtDefaultGracePeriods = {
      grace_1: {
        proposalId: "grace_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        alertProposalId: "alert_1",
        gracePeriodSteps: 5,
        remainingSteps: 5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      }
    };
    // Expected premium with grace: base(50) * fee(1.0) * heat(2.0) * grace(0.5) = 50 gold

    state = tickEconomy(state, mockPack);
    expect(state.syndicates?.["alpha"]?.warChest).toBe(4850); // deducted 50
    expect(state.syndicates?.["gamma"]?.warChest).toBe(4150); // paid to writer

    // 7. Settle CDS Contract upon Default
    // Authorize default alert on beta
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 500,
        status: "authorized",
        resolved: false,
        proposerId: "player",
        timestamp: 1000,
      }
    };

    // Next tick economy should automatically trigger CDS settlement!
    state = tickEconomy(state, mockPack);

    // Alpha should get payout of 1000 gold
    // Gamma (writer) should lose 1000 gold
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.status).toBe("settled");
    expect(state.syndicates?.["alpha"]?.warChest).toBe(4850 + 1000); // 5850
    expect(state.syndicates?.["gamma"]?.warChest).toBe(4150 - 1000); // 3150
  });

  it("should support manual SETTLE_CDS_CLAIMS and system-written CDS", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Buyer)",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Default target)",
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 0,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_system: {
        cdsId: "cds_system",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system", // written by system
        targetSyndicateId: "beta",
        notionalValue: 1500,
        status: "active",
        timestamp: 1000,
      }
    };

    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 500,
        status: "authorized",
        resolved: false,
        proposerId: "player",
        timestamp: 1000,
      }
    };

    state.swfStakingSweepPool = 3000;

    // Call manual SETTLE_CDS_CLAIMS
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "SETTLE_CDS_CLAIMS",
          cdsId: "cds_system",
          buyerSyndicateId: "alpha",
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    expect(state.sovereignDebtCDSContracts?.["cds_system"]?.status).toBe("settled");
    expect(state.syndicates?.["alpha"]?.warChest).toBe(6500); // 5000 + 1500
    expect(state.swfStakingSweepPool).toBe(1500); // 3000 - 1500
  });

  it("should terminate CDS contracts when premium is unpaid", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Buyer)",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5, // Extremely poor! Premium is 50.
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: [],
        definedBy: "player",
        timestamp: 1000,
        warChest: 0,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_poor: {
        cdsId: "cds_poor",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1000,
      }
    };

    state = tickEconomy(state, mockPack);

    // Should be terminated!
    expect(state.sovereignDebtCDSContracts?.["cds_poor"]?.status).toBe("terminated");
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5); // unaltered
  });

  it("should reconcile CDS contracts and portfolios via Gossip LWW/Union", () => {
    let stateA = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });

    stateA.sovereignDebtCDSContracts = {
      cds_gossip: {
        cdsId: "cds_gossip",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "proposed",
        timestamp: 1000,
      }
    };

    stateB.sovereignDebtCDSContracts = {
      cds_gossip: {
        cdsId: "cds_gossip",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1005, // newer update
      }
    };

    stateA.sovereignDebtCDSPortfolios = {
      alpha: {
        syndicateId: "alpha",
        purchasedCDSIds: ["cds_gossip"],
        writtenCDSIds: [],
      }
    };

    stateB.sovereignDebtCDSPortfolios = {
      alpha: {
        syndicateId: "alpha",
        purchasedCDSIds: ["cds_gossip", "cds_other"],
        writtenCDSIds: ["cds_written"],
      }
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.sovereignDebtCDSContracts?.["cds_gossip"]?.status).toBe("active");
    expect(merged.sovereignDebtCDSPortfolios?.["alpha"]?.purchasedCDSIds).toContain("cds_other");
    expect(merged.sovereignDebtCDSPortfolios?.["alpha"]?.writtenCDSIds).toContain("cds_written");
  });
});

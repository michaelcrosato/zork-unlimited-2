import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Sovereign Wealth Fund Yield CDO CDS & Synthetic Tranche Markets (AF-132)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_cdo_cds_test_pack",
      title: "SWF Yield CDO CDS Test Pack",
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

  it("should support buying, writing, and reconciling a SWF Yield CDO CDS with double-consent activation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Setup SWF Yield CDO in state
    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 500,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 250,
            ownership: { buyer_corp: 250 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 150,
            ownership: { buyer_corp: 150 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.25,
            totalShares: 100,
            ownership: { buyer_corp: 100 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // 1. Propose BUY SWF Yield CDO CDS
    const buyAct = {
      type: "BUY_SWF_YIELD_CDO_CDS",
      cdsId: "swf_cds_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      swfYieldCdoId: "swf_cdo_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      timestamp: 1001,
      marginEnabled: false,
    };

    let buyRes = multiAgentStep(state, { agentId: "player", action: buyAct as any }, mockPack);
    expect(buyRes.ok).toBe(true);
    state = buyRes.state;
    expect(state.swfYieldCDOCDSs?.swf_cds_1).toBeUndefined(); // Needs writer consent to activate!

    // 2. Propose WRITE SWF Yield CDO CDS
    const writeAct = {
      type: "WRITE_SWF_YIELD_CDO_CDS",
      cdsId: "swf_cds_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      swfYieldCdoId: "swf_cdo_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      timestamp: 1002,
      marginEnabled: false,
    };

    let writeRes = multiAgentStep(state, { agentId: "alice", action: writeAct as any }, mockPack);
    expect(writeRes.ok).toBe(true);
    state = writeRes.state;

    // Consent matched, so the CDS must be active!
    const activeCds = state.swfYieldCDOCDSs?.swf_cds_1;
    expect(activeCds).toBeDefined();
    expect(activeCds?.active).toBe(true);
    expect(activeCds?.buyerSyndicateId).toBe("buyer_corp");
    expect(activeCds?.writerSyndicateId).toBe("writer_corp");
    expect(activeCds?.swfYieldCdoId).toBe("swf_cdo_1");
    expect(activeCds?.trancheId).toBe("mezzanine");
    expect(activeCds?.notionalValue).toBe(100);
    expect(activeCds?.premiumRate).toBe(0.05);
  });

  it("should deduct premium payments periodically inside tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 300,
      },
    };

    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "mezzanine",
        notionalValue: 200,
        premiumRate: 0.1, // 200 * 0.10 = 20 gold premium
        timestamp: 1000,
        active: true,
      },
    };

    // Process tickEconomy
    state = tickEconomy(state, mockPack);

    // Assert premium gold was transferred
    expect(state.syndicates?.buyer_corp?.warChest).toBe(480); // 500 - 20 = 480
    expect(state.syndicates?.writer_corp?.warChest).toBe(320); // 300 + 20 = 320
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(true);
  });

  it("should terminate CDS if buyer has insufficient war chest gold for premium", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 5, // < 20 gold needed
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 300,
      },
    };

    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "mezzanine",
        notionalValue: 200,
        premiumRate: 0.1, // 20 gold premium
        timestamp: 1000,
        active: true,
      },
    };

    state = tickEconomy(state, mockPack);

    // Buyer paid whatever they had, but CDS is deactivated due to shortfall!
    expect(state.syndicates?.buyer_corp?.warChest).toBe(0);
    expect(state.syndicates?.writer_corp?.warChest).toBe(305);
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(false);
  });

  it("should trigger automatic payout on tranche write-down", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 100,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
      },
    };

    // SWF Yield CDO
    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [{ swfYieldTokenId: "token_defaulted", sharesPacked: 50, value: 500 }],
        totalValue: 500,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 250,
            ownership: { buyer_corp: 250 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 150,
            ownership: { buyer_corp: 150 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.25,
            totalShares: 100,
            ownership: { buyer_corp: 100 },
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Packed token portfolio is inactive/missing, which triggers asset default during tickEconomy!
    // Asset value of 500 defaulted. Since totalValue is 500, waterfall wipes out:
    // Equity (100 shares), Mezzanine (150 shares), Senior (250 shares) - total 500!
    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "mezzanine",
        notionalValue: 150, // Insured up to 150 shares
        premiumRate: 0.01,
        timestamp: 1000,
        active: true,
      },
    };

    state = tickEconomy(state, mockPack);

    // Mezzanine loss was 150 shares out of 150 total shares.
    // Payout should be: notionalValue * (loss / oldTotal) = 150 * (150 / 150) = 150 gold!
    // Since CDS is settled and deactivated during default waterfalls, no premium is deducted.
    expect(state.syndicates?.buyer_corp?.warChest).toBe(250); // 100 (initial) + 150 (payout) = 250
    expect(state.syndicates?.writer_corp?.warChest).toBe(350); // 500 (initial) - 150 (payout) = 350
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.notionalValue).toBe(0);
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(false); // Fully settled
  });

  it("should integrate with margin account maintenance requirement and handle liquidations", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Create margin account for writer_corp
    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 30, // Collateral of 30 gold
        timestamp: 1000,
      },
    };

    // SWF CDO CDS is written by writer_corp (marginEnabled = true)
    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        notionalValue: 200, // Notional 200, 20% maintenance = 40 required gold
        premiumRate: 0.01,
        timestamp: 1000,
        active: true,
        marginEnabled: true,
      },
    };

    state.marginAccounts.writer_corp.leveragedSWFYieldCDOCDSIds = ["swf_cds_1"];

    // With 30 collateral, and 40 required (20% of 200 notional), this should trigger a MARGIN CALL!
    state = tickEconomy(state, mockPack);

    // Margin call triggered, deactivating the leveraged written CDO CDS!
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(false);
    expect(state.marginAccounts?.writer_corp?.leveragedSWFYieldCDOCDSIds?.length).toBe(0);
  });

  it("should support margin adjustment action", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        timestamp: 1000,
      },
    };

    // Deposit 150 gold into margin collateral
    const depositAct = {
      type: "ADJUST_SWF_YIELD_CDO_CDS_MARGIN",
      syndicateId: "writer_corp",
      amount: 150,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: depositAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.marginAccounts?.writer_corp?.collateral).toBe(250); // 100 + 150 = 250
    expect(state.syndicates?.writer_corp?.warChest).toBe(850); // 1000 - 150 = 850

    // Withdraw 50 gold from margin collateral
    const withdrawAct = {
      type: "ADJUST_SWF_YIELD_CDO_CDS_MARGIN",
      syndicateId: "writer_corp",
      amount: -50,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "player", action: withdrawAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.marginAccounts?.writer_corp?.collateral).toBe(200); // 250 - 50 = 200
    expect(state.syndicates?.writer_corp?.warChest).toBe(900); // 850 + 50 = 900
  });

  it("should merge monotonic state fields during Gossip convergence", () => {
    const stateA = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });
    const stateB = createInitialState({ seed: 2, start: "clearing", agentsInit: ["player"] });

    stateA.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        notionalValue: 200,
        premiumRate: 0.01,
        timestamp: 1005,
        active: true,
      },
    };

    stateB.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        notionalValue: 200,
        premiumRate: 0.01,
        timestamp: 1010, // Newer timestamp
        active: false, // Terminated
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.swfYieldCDOCDSs?.swf_cds_1?.timestamp).toBe(1010);
    expect(merged.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(false);
  });

  it("should support SWF margin rehypothecation authorization and revoke via consensus majority", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 200,
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // 1. Player votes to authorize rehypothecation
    const authAct1 = {
      type: "AUTHORIZE_SWF_MARGIN_REHYPOTHECATION",
      syndicateId: "writer_corp",
      vaultId: "iron_vault",
      percentage: 50,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: authAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 1 vote out of 3 members is not majority
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationAuthorized).toBeUndefined();

    // 2. Alice votes to authorize rehypothecation
    const authAct2 = {
      type: "AUTHORIZE_SWF_MARGIN_REHYPOTHECATION",
      syndicateId: "writer_corp",
      vaultId: "iron_vault",
      percentage: 50,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "alice", action: authAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 2 votes out of 3 is a strict majority (> 1.5)
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationAuthorized).toBe(true);
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationVaultId).toBe("iron_vault");
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationPercentage).toBe(50);

    // 3. Bob votes to revoke rehypothecation
    const revokeAct1 = {
      type: "REVOKE_SWF_MARGIN_REHYPOTHECATION",
      syndicateId: "writer_corp",
      timestamp: 1003,
    };
    res = multiAgentStep(state, { agentId: "bob", action: revokeAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 1 vote out of 3 is not majority to revoke
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationAuthorized).toBe(true);

    // 4. Player votes to revoke rehypothecation
    const revokeAct2 = {
      type: "REVOKE_SWF_MARGIN_REHYPOTHECATION",
      syndicateId: "writer_corp",
      timestamp: 1004,
    };
    res = multiAgentStep(state, { agentId: "player", action: revokeAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 2 votes to revoke is majority
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationAuthorized).toBe(false);
    expect(state.marginAccounts?.writer_corp?.swfRehypothecationVaultId).toBeUndefined();
  });

  it("should support SWF margin rebalancing policy, targets, buffer, and manual rebalance", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 200,
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // Both players vote to enable rebalancing policy
    const policyAct = {
      type: "SET_SWF_MARGIN_REBALANCING_POLICY",
      syndicateId: "writer_corp",
      enabled: true,
      vaultTargets: { iron_vault: 100 },
      liquidityBufferRatio: 20,
      bufferTriggerRatio: 1.15,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: policyAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(state, { agentId: "alice", action: policyAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should be enabled, and auto-rebalanced immediately!
    // Buffer = 20% of 200 = 40. Allocated = 160.
    const ma = state.marginAccounts?.writer_corp;
    expect(ma?.swfRebalancingEnabled).toBe(true);
    expect(ma?.swfLiquidityBufferRatio).toBe(20);
    expect(ma?.swfLiquidityBuffer).toBe(40);
    expect(ma?.swfVaultAllocations?.iron_vault).toBe(160);

    // Increase collateral to 300, and trigger manual SWF rebalance
    ma!.collateral = 300;
    const rebalanceAct = {
      type: "REBALANCE_SWF_MARGIN_COLLATERAL",
      syndicateId: "writer_corp",
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "player", action: rebalanceAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Buffer = 20% of 300 = 60. Allocated = 240.
    const updatedMa = state.marginAccounts?.writer_corp;
    expect(updatedMa?.swfLiquidityBuffer).toBe(60);
    expect(updatedMa?.swfVaultAllocations?.iron_vault).toBe(240);
  });

  it("should support SWF rebalancing advisor deployment and safety thresholds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 200,
        timestamp: 1000,
      },
    };

    // Vote to deploy SWF advisor
    const deployAct = {
      type: "DEPLOY_SWF_REBALANCING_ADVISOR",
      syndicateId: "writer_corp",
      enabled: true,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: deployAct as any }, mockPack);
    res = multiAgentStep(res.state, { agentId: "alice", action: deployAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.marginAccounts?.writer_corp?.swfAdvisorEnabled).toBe(true);

    // Vote to set safety threshold
    const threshAct = {
      type: "SET_SWF_ADVISOR_SAFETY_THRESHOLD",
      syndicateId: "writer_corp",
      threshold: 0.15,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "player", action: threshAct as any }, mockPack);
    res = multiAgentStep(res.state, { agentId: "alice", action: threshAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.marginAccounts?.writer_corp?.swfAdvisorSafetyThreshold).toBe(0.15);
  });

  it("should process SWF rehypothecation yields and sweep risks inside tickEconomy", () => {
    let state = createInitialState({
      seed: 99999, // Specific seed that avoids sweep triggers
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        swfRebalancingEnabled: true,
        swfVaultTargets: { iron_vault: 100 },
        swfLiquidityBufferRatio: 10,
        swfLiquidityBuffer: 10,
        swfVaultAllocations: { iron_vault: 90 },
        timestamp: 1000,
      },
    };

    // Ensure iron_vault exists and has yield/risk
    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.1, // 10% interest rate
        sweepRisk: 0.0, // No sweep risk for this test
        timestamp: 1000,
      },
    };

    // Run tickEconomy
    state = tickEconomy(state, mockPack);

    // Yield = Math.floor(allocated * interestRate) = Math.floor(90 * 0.10) = 9
    // Yield returned = Math.floor(9 * 0.80) = 7 gold!
    // Collateral = 100 + 7 = 107
    expect(state.marginAccounts?.writer_corp?.collateral).toBe(107);
  });

  it("should perform preemptive drawdown on SWF margins under risk of margin calls", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100, // Net equity = 100
        swfRebalancingEnabled: true,
        swfVaultTargets: { iron_vault: 100 },
        swfLiquidityBufferRatio: 0,
        swfLiquidityBuffer: 0,
        swfVaultAllocations: { iron_vault: 100 }, // Premium = 100 * (0.10 + 0.05) = 15
        swfBufferTriggerRatio: 1.25,
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.0,
        sweepRisk: 0.05, // 5% sweep risk
        timestamp: 1000,
      },
    };

    // Leverage SWF CDS of 400 notional (20% maintenance = 80 required)
    // Premium = 15. Total required = 80 + 15 = 95.
    // Trigger ratio = 1.25. Trigger limit = 1.25 * 95 = 118.75.
    // Net Equity (100) <= Trigger Limit (118.75), so a preemptive drawdown triggers!
    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        notionalValue: 400,
        premiumRate: 0.01,
        timestamp: 1000,
        active: true,
        marginEnabled: true,
      },
    };
    state.marginAccounts.writer_corp.leveragedSWFYieldCDOCDSIds = ["swf_cds_1"];

    state = tickEconomy(state, mockPack);

    // Preemptive drawback occurred, drawing back the 100 gold allocation to buffer,
    // reducing premium to 0 and preventing a margin call liquidation!
    expect(state.marginAccounts?.writer_corp?.swfVaultAllocations?.iron_vault).toBe(0);
    expect(state.marginAccounts?.writer_corp?.swfLiquidityBuffer).toBe(100);
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(true); // Still active!
  });

  it("should converge SWF margin votes correctly during Gossip merging", () => {
    const stateA = createInitialState({ seed: 1, start: "clearing", agentsInit: ["player"] });
    const stateB = createInitialState({ seed: 2, start: "clearing", agentsInit: ["player"] });

    stateA.swfMarginRehypothecationVotes = {
      writer_corp: {
        player: { vaultId: "iron_vault", percentage: 40, timestamp: 1010 },
      },
    };

    stateB.swfMarginRehypothecationVotes = {
      writer_corp: {
        player: { vaultId: "gold_vault", percentage: 60, timestamp: 1020 }, // Newer!
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.swfMarginRehypothecationVotes?.writer_corp?.player?.vaultId).toBe("gold_vault");
    expect(merged.swfMarginRehypothecationVotes?.writer_corp?.player?.percentage).toBe(60);
  });

  it("should support dynamic leverage targets and fractional reserve ratios adjust actions with majority consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        timestamp: 1000,
      },
    };

    // 1. Vote to adjust SWF leverage target to 3.0
    const leverageAct1 = {
      type: "ADJUST_SWF_LEVERAGE_TARGET",
      syndicateId: "writer_corp",
      target: 3.0,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: leverageAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 1 vote out of 3 is not majority
    expect(state.marginAccounts?.writer_corp?.swfLeverageTarget).toBeUndefined();

    const leverageAct2 = {
      type: "ADJUST_SWF_LEVERAGE_TARGET",
      syndicateId: "writer_corp",
      target: 3.0,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "alice", action: leverageAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 2 votes out of 3 is majority
    expect(state.marginAccounts?.writer_corp?.swfLeverageTarget).toBe(3.0);
    expect(state.marginAccounts?.writer_corp?.swfLeverageFactor).toBe(3.0);

    // 2. Vote to adjust SWF fractional reserve ratio to 20%
    const reserveAct1 = {
      type: "ADJUST_SWF_FRACTIONAL_RESERVE_RATIO",
      syndicateId: "writer_corp",
      ratio: 20,
      timestamp: 1003,
    };
    res = multiAgentStep(state, { agentId: "player", action: reserveAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 1 vote is not majority
    expect(state.marginAccounts?.writer_corp?.swfFractionalReserveRatio).toBeUndefined();

    const reserveAct2 = {
      type: "ADJUST_SWF_FRACTIONAL_RESERVE_RATIO",
      syndicateId: "writer_corp",
      ratio: 20,
      timestamp: 1004,
    };
    res = multiAgentStep(state, { agentId: "bob", action: reserveAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 2 votes is majority
    expect(state.marginAccounts?.writer_corp?.swfFractionalReserveRatio).toBe(20);
    expect(state.marginAccounts?.writer_corp?.swfFractionalReserveHeld).toBe(20); // 100 * 20%
  });

  it("should respect fractional reserve ratios during rebalancing and manual rehypothecations in tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        swfRehypothecationAuthorized: true,
        swfRehypothecationVaultId: "iron_vault",
        swfRehypothecationPercentage: 100, // Wants 100% rehypothecated
        swfFractionalReserveRatio: 30, // But requires 30% reserve
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // Process tick
    state = tickEconomy(state, mockPack);

    // Reserved amount = 30%. Max rehypothecatable = 70%.
    // So actual rehypothecatedAmount = 70.
    // Yield earned: 70 * 10% = 7 interest. Returned to collateral: Math.floor(7 * 0.8) = 5 gold.
    expect(state.marginAccounts?.writer_corp?.swfFractionalReserveHeld).toBe(30);
    expect(state.marginAccounts?.writer_corp?.collateral).toBe(105);
  });

  it("should support locking SWF rehypothecated collateral and claiming rewards with leverage scaling", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        swfRehypothecationAuthorized: true,
        swfRehypothecationVaultId: "iron_vault",
        swfRehypothecationPercentage: 100,
        swfFractionalReserveRatio: 10, // 10% reserve (10 gold), leaving 90 rehypothecatable
        swfLeverageTarget: 2.0,
        swfLeverageFactor: 2.0,
        timestamp: 1000,
      },
    };

    state.secondaryReserveVaults = {
      iron_vault: {
        vaultId: "iron_vault",
        name: "Iron Vault",
        interestRate: 0.1,
        sweepRisk: 0.0,
        timestamp: 1000,
      },
    };

    // 1. Vote to lock SWF collateral (50 gold, 2 epochs)
    const lockAct1 = {
      type: "LOCK_SWF_REHYPOTHECATED_COLLATERAL",
      syndicateId: "writer_corp",
      vaultId: "iron_vault",
      amount: 50,
      durationEpochs: 2,
      factionId: "rangers",
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: lockAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const lockAct2 = {
      type: "LOCK_SWF_REHYPOTHECATED_COLLATERAL",
      syndicateId: "writer_corp",
      vaultId: "iron_vault",
      amount: 50,
      durationEpochs: 2,
      factionId: "rangers",
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "alice", action: lockAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Confirms locked positions are registered
    const lockedPos = state.marginAccounts?.writer_corp?.swfLockedPositions?.[0];
    expect(lockedPos).toBeDefined();
    expect(lockedPos?.amount).toBe(50);
    expect(lockedPos?.factionId).toBe("rangers");

    // 2. Advance epochs so the lock matures
    state.step += 15; // 3 epochs

    // 3. Claim rewards by majority
    const claimAct1 = {
      type: "CLAIM_SWF_LIQUIDITY_MINING_REWARDS",
      syndicateId: "writer_corp",
      positionId: lockedPos!.id,
      timestamp: 1020,
    };
    res = multiAgentStep(state, { agentId: "player", action: claimAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const claimAct2 = {
      type: "CLAIM_SWF_LIQUIDITY_MINING_REWARDS",
      syndicateId: "writer_corp",
      positionId: lockedPos!.id,
      timestamp: 1021,
    };
    res = multiAgentStep(state, { agentId: "alice", action: claimAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify claim succeeded and marked as claimed
    const finalPos = state.marginAccounts?.writer_corp?.swfLockedPositions?.[0];
    expect(finalPos?.claimed).toBe(true);

    // Initial war chest was 1000.
    // Reward formula: amount (50) * rewardRate (0.05) * duration (2) * leverageFactor (2.0) = 10 gold.
    expect(state.syndicates?.writer_corp?.warChest).toBe(1010);
  });

  it("should merge new SWF votes correctly during Gossip state merging", () => {
    const stateA = createInitialState({ seed: 1, start: "clearing" });
    const stateB = createInitialState({ seed: 2, start: "clearing" });

    stateA.swfLeverageTargetVotes = {
      writer_corp: {
        player: { target: 2.5, timestamp: 100 },
      },
    };
    stateB.swfLeverageTargetVotes = {
      writer_corp: {
        player: { target: 3.5, timestamp: 200 }, // Newer!
      },
    };

    stateA.swfFractionalReserveRatioVotes = {
      writer_corp: {
        player: { ratio: 15, timestamp: 300 },
      },
    };
    stateB.swfFractionalReserveRatioVotes = {
      writer_corp: {
        player: { ratio: 25, timestamp: 400 }, // Newer!
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.swfLeverageTargetVotes?.writer_corp?.player?.target).toBe(3.5);
    expect(merged.swfFractionalReserveRatioVotes?.writer_corp?.player?.ratio).toBe(25);
  });

  it("should support adjusting SWF tranche leverage target action with majority consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player", "alice", "bob"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        timestamp: 1000,
      },
    };

    // 1. Vote to adjust SWF senior tranche leverage target to 4.0
    const trancheLeverageAct1 = {
      type: "ADJUST_SWF_TRANCHE_LEVERAGE_TARGET",
      syndicateId: "writer_corp",
      trancheId: "senior",
      target: 4.0,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: trancheLeverageAct1 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 1 vote out of 3 is not majority
    expect(state.marginAccounts?.writer_corp?.swfTrancheLeverageTargets?.senior).toBeUndefined();

    const trancheLeverageAct2 = {
      type: "ADJUST_SWF_TRANCHE_LEVERAGE_TARGET",
      syndicateId: "writer_corp",
      trancheId: "senior",
      target: 4.0,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "alice", action: trancheLeverageAct2 as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    // 2 votes out of 3 is majority
    expect(state.marginAccounts?.writer_corp?.swfTrancheLeverageTargets?.senior).toBe(4.0);
    expect(state.marginAccounts?.writer_corp?.swfTrancheLeverageFactors?.senior).toBe(4.0);
  });

  it("should apply tranche-specific leverage factors to maintenance requirements inside tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        swfTrancheLeverageTargets: { senior: 4.0, mezzanine: 2.0, equity: 1.0 },
        swfTrancheLeverageFactors: { senior: 4.0, mezzanine: 2.0, equity: 1.0 },
        timestamp: 1000,
      },
    };

    // SWF CDO CDS on mezzanine tranche
    state.swfYieldCDOCDSs = {
      swf_cds_1: {
        id: "swf_cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "mezzanine",
        notionalValue: 200, // 20% maintenance = 40. Leveraged at mezzanine = 2.0x, so actual maintenance component = 40 / 2 = 20.
        premiumRate: 0.01,
        timestamp: 1000,
        active: true,
        marginEnabled: true,
      },
    };
    state.marginAccounts.writer_corp.leveragedSWFYieldCDOCDSIds = ["swf_cds_1"];

    state = tickEconomy(state, mockPack);

    // Maintenance requirement is 20, collateral is 100 (well above maintenance), so CDS stays active.
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(true);
  });

  it("should support automated SWF CDS liquidity matching inside tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 100,
        swfCDSLiquidityMatchingEnabled: true,
        timestamp: 1000,
      },
    };

    // Buyer corp casts a BUY vote
    state.swfYieldCDOCDSVotes = {
      swf_cds_1: {
        player: {
          cdsId: "swf_cds_1",
          buyerSyndicateId: "buyer_corp",
          writerSyndicateId: "writer_corp",
          swfYieldCdoId: "swf_cdo_1",
          trancheId: "senior",
          notionalValue: 100,
          premiumRate: 0.05,
          side: "buyer",
          timestamp: 1001,
          marginEnabled: false,
        },
      },
    };

    // Tick economy should automatically match unmatched buy vote with writer_corp
    state = tickEconomy(state, mockPack);

    // It should be successfully matched and reconciled to active CDS!
    expect(state.swfYieldCDOCDSs?.swf_cds_1).toBeDefined();
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.active).toBe(true);
    expect(state.swfYieldCDOCDSs?.swf_cds_1?.writerSyndicateId).toBe("writer_corp");
  });

  it("should merge swfTrancheLeverageTargetVotes correctly during Gossip merging", () => {
    const stateA = createInitialState({ seed: 1, start: "clearing" });
    const stateB = createInitialState({ seed: 2, start: "clearing" });

    stateA.swfTrancheLeverageTargetVotes = {
      writer_corp: {
        player: {
          senior: { target: 2.5, timestamp: 100 },
        } as any,
      },
    };
    stateB.swfTrancheLeverageTargetVotes = {
      writer_corp: {
        player: {
          senior: { target: 4.5, timestamp: 200 },
        } as any,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.swfTrancheLeverageTargetVotes?.writer_corp?.player?.senior?.target).toBe(4.5);
  });
});

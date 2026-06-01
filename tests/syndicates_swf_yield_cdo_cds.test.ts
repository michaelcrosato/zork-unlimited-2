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
          senior: { trancheId: "senior", yieldRate: 0.05, totalShares: 250, ownership: { buyer_corp: 250 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 150, ownership: { buyer_corp: 150 }, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.25, totalShares: 100, ownership: { buyer_corp: 100 }, timestamp: 1000 },
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
        premiumRate: 0.10, // 200 * 0.10 = 20 gold premium
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
        premiumRate: 0.10, // 20 gold premium
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
        assets: [
          { swfYieldTokenId: "token_defaulted", sharesPacked: 50, value: 500 },
        ],
        totalValue: 500,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.05, totalShares: 250, ownership: { buyer_corp: 250 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 150, ownership: { buyer_corp: 150 }, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.25, totalShares: 100, ownership: { buyer_corp: 100 }, timestamp: 1000 },
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
});

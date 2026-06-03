import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Yield CDOs & Tranche Secondary Markets (AF-131)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_yield_cdo_test_pack",
      title: "SWF Yield CDO Test Pack",
      start_room: "market",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Underground Market",
        description: "The dark center of the syndicate's network.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should propose, vote, and package SWF yield tokens into a CDO upon consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      blood_fangs: {
        id: "blood_fangs",
        name: "Blood Fangs",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Setup SWF Yield Token
    state.swfYieldTokens = {
      token_1: {
        id: "token_1",
        portfolioId: "portfolio_1",
        issuerFundId: "fund_1",
        totalShares: 100,
        syndicateShares: {
          blood_fangs: 80,
        },
        pricePerShare: 10,
        timestamp: 1000,
      },
    };

    // Propose packaging SWF Yield CDO
    const proposeAct = {
      type: "PROPOSE_SWF_YIELD_CDO",
      proposalId: "yield_cdo_1",
      proposerSyndicateId: "blood_fangs",
      assets: [
        { swfYieldTokenId: "token_1", sharesPacked: 50, value: 500 }, // value = 50 * pricePerShare(10) = 500
      ],
      trancheYieldRates: {
        senior: 0.05,
        mezzanine: 0.12,
        equity: 0.25,
      },
      trancheTotalShares: {
        senior: 250,
        mezzanine: 150,
        equity: 100,
      },
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposal is created but not resolved since only player voted (need alice to also vote for majority in blood_fangs of 2 members)
    const proposal = state.swfYieldCDOProposals?.yield_cdo_1;
    expect(proposal).toBeDefined();
    expect(proposal?.resolved).toBe(false);

    // Vote from Alice to reach consensus
    const voteAct = {
      type: "VOTE_SWF_YIELD_CDO",
      proposalId: "yield_cdo_1",
      syndicateId: "blood_fangs",
      vote: true,
      timestamp: 1001,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check that consensus was met and CDO was packaged!
    expect(state.swfYieldCDOProposals?.yield_cdo_1?.resolved).toBe(true);
    const cdo = state.swfYieldCDOs?.yield_cdo_1;
    expect(cdo).toBeDefined();
    expect(cdo?.creatorSyndicateId).toBe("blood_fangs");
    expect(cdo?.totalValue).toBe(500);
    expect(cdo?.assets[0].swfYieldTokenId).toBe("token_1");
    expect(cdo?.assets[0].sharesPacked).toBe(50);

    // Assert that packed shares were deducted from syndicate owned shares
    expect(state.swfYieldTokens?.token_1?.syndicateShares.blood_fangs).toBe(30); // 80 - 50 = 30

    // Assert that tranches are setup correctly
    expect(cdo?.tranches.senior.totalShares).toBe(250);
    expect(cdo?.tranches.senior.yieldRate).toBe(0.05);
    expect(cdo?.tranches.senior.ownership.blood_fangs).toBe(250);

    expect(cdo?.tranches.mezzanine.totalShares).toBe(150);
    expect(cdo?.tranches.mezzanine.yieldRate).toBe(0.12);
    expect(cdo?.tranches.mezzanine.ownership.blood_fangs).toBe(150);

    expect(cdo?.tranches.equity.totalShares).toBe(100);
    expect(cdo?.tranches.equity.yieldRate).toBe(0.25);
    expect(cdo?.tranches.equity.ownership.blood_fangs).toBe(100);
  });

  it("should fail proposal if packing more shares than owned", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
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
        dominance: 50,
        warChest: 1000,
      },
    };

    state.swfYieldTokens = {
      token_1: {
        id: "token_1",
        portfolioId: "portfolio_1",
        issuerFundId: "fund_1",
        totalShares: 100,
        syndicateShares: {
          blood_fangs: 30, // only has 30
        },
        pricePerShare: 10,
        timestamp: 1000,
      },
    };

    const proposeAct = {
      type: "PROPOSE_SWF_YIELD_CDO",
      proposalId: "yield_cdo_fail",
      proposerSyndicateId: "blood_fangs",
      assets: [
        { swfYieldTokenId: "token_1", sharesPacked: 40, value: 400 }, // requests 40
      ],
      trancheYieldRates: { senior: 0.05, mezzanine: 0.1, equity: 0.2 },
      trancheTotalShares: { senior: 100, mezzanine: 100, equity: 100 },
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("insufficient shares");
  });

  it("should trade SWF Yield CDO tranche shares between syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
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
        dominance: 50,
        warChest: 1000,
      },
      night_stalkers: {
        id: "night_stalkers",
        name: "Night Stalkers",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
      },
    };

    state.swfYieldCDOs = {
      yield_cdo_1: {
        id: "yield_cdo_1",
        creatorSyndicateId: "blood_fangs",
        assets: [],
        totalValue: 500,
        timestamp: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 100,
            ownership: {
              blood_fangs: 100,
            },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: {
              blood_fangs: 100,
            },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 100,
            ownership: {
              blood_fangs: 100,
            },
            timestamp: 1000,
          },
        },
      },
    };

    // Alice (Night Stalkers) trades to buy 40 Senior shares from blood_fangs for 200 gold
    const tradeAct = {
      type: "TRADE_SWF_YIELD_CDO_TRANCHE",
      cdoId: "yield_cdo_1",
      trancheId: "senior",
      sellerSyndicateId: "blood_fangs",
      buyerSyndicateId: "night_stalkers",
      amount: 40,
      goldPrice: 200,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "alice", action: tradeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check tranche ownership updates
    const senior = state.swfYieldCDOs?.yield_cdo_1?.tranches.senior;
    expect(senior?.ownership.blood_fangs).toBe(60);
    expect(senior?.ownership.night_stalkers).toBe(40);

    // Check warChest balances
    expect(state.syndicates?.blood_fangs?.warChest).toBe(1200); // 1000 + 200 = 1200
    expect(state.syndicates?.night_stalkers?.warChest).toBe(300); // 500 - 200 = 300
  });

  it("should pay out yields through economy ticks and handle default waterfalls", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
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
        dominance: 50,
        warChest: 1000,
      },
    };

    // Setup active portfolio that returns 10% yield on 1000 gold
    state.jointVenturePortfolios = {
      portfolio_1: {
        id: "portfolio_1",
        fundId: "fund_1",
        targetType: "FactionBond",
        targetId: "rangers",
        investedAmount: 1000,
        yieldRate: 10,
        status: "Active",
        timestamp: 1000,
      },
    };

    state.swfYieldTokens = {
      token_1: {
        id: "token_1",
        portfolioId: "portfolio_1",
        issuerFundId: "fund_1",
        totalShares: 100,
        syndicateShares: {
          blood_fangs: 100,
        },
        pricePerShare: 10,
        timestamp: 1000,
      },
    };

    // Create a SWF Yield CDO packing 50 shares of token_1
    state.swfYieldCDOs = {
      yield_cdo_1: {
        id: "yield_cdo_1",
        creatorSyndicateId: "blood_fangs",
        assets: [{ swfYieldTokenId: "token_1", sharesPacked: 50, value: 500 }],
        totalValue: 500,
        timestamp: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 200,
            ownership: { blood_fangs: 200 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { blood_fangs: 100 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 200,
            ownership: { blood_fangs: 200 },
            timestamp: 1000,
          },
        },
      },
    };

    // 1. Tick Economy with Active Assets
    // Total Token Yield = 1000 * 0.10 = 100 gold
    // CDO owns 50% (50/100 shares), so it collects 50 gold.
    // Senior target = 200 * 0.05 = 10 gold. Senior gets 10 gold. Remaining = 40.
    // Mezzanine target = 100 * 0.10 = 10 gold. Mezzanine gets 10 gold. Remaining = 30.
    // Equity gets the remaining 30 gold.
    // Total blood_fangs payout = 10 (Senior) + 10 (Mezzanine) + 30 (Equity) = 50 gold!
    state.seed = 99999; // Ensure no default triggers in enforcer roll
    let stateTick1 = tickEconomy(state, mockPack);

    expect(stateTick1.syndicates?.blood_fangs?.warChest).toBe(1050); // 1000 + 50 = 1050

    // 2. Default Waterfall Scenario (Underlying portfolio closes)
    state.jointVenturePortfolios.portfolio_1.status = "Closed";

    // Tick Economy again. Since asset portfolio is closed, token_1 is fully defaulted.
    // Asset value of 500 is written down completely.
    // Waterfall defaults:
    // First, Equity totalShares (200) is reduced by loss up to 200. Remaining loss = 300. Equity shares becomes 0.
    // Next, Mezzanine totalShares (100) is reduced by loss up to 100. Remaining loss = 200. Mezzanine shares becomes 0.
    // Finally, Senior totalShares (200) is reduced by remaining loss of 200. Senior shares becomes 0.
    let stateTick2 = tickEconomy(state, mockPack);

    const resultingCDO = stateTick2.swfYieldCDOs?.yield_cdo_1;
    expect(resultingCDO?.totalValue).toBe(0);
    expect(resultingCDO?.tranches.senior.totalShares).toBe(0);
    expect(resultingCDO?.tranches.mezzanine.totalShares).toBe(0);
    expect(resultingCDO?.tranches.equity.totalShares).toBe(0);

    expect(resultingCDO?.tranches.senior.ownership.blood_fangs).toBe(0);
    expect(resultingCDO?.tranches.mezzanine.ownership.blood_fangs).toBe(0);
    expect(resultingCDO?.tranches.equity.ownership.blood_fangs).toBe(0);
  });

  it("should merge SWF Yield CDO states and proposals in Gossip Node merging", () => {
    let nodeA = createInitialState({ seed: 111, start: "market", varsInit: {}, agentsInit: [] });
    let nodeB = createInitialState({ seed: 222, start: "market", varsInit: {}, agentsInit: [] });

    nodeA.swfYieldCDOs = {
      yield_cdo_gossip: {
        id: "yield_cdo_gossip",
        creatorSyndicateId: "blood_fangs",
        assets: [],
        totalValue: 500,
        timestamp: 2000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 100,
            ownership: { blood_fangs: 30 },
            timestamp: 2000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { blood_fangs: 30 },
            timestamp: 2000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 100,
            ownership: { blood_fangs: 30 },
            timestamp: 2000,
          },
        },
      },
    };

    nodeB.swfYieldCDOs = {
      yield_cdo_gossip: {
        id: "yield_cdo_gossip",
        creatorSyndicateId: "blood_fangs",
        assets: [],
        totalValue: 500,
        timestamp: 3000, // Newer timestamp
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 100,
            ownership: { blood_fangs: 80 },
            timestamp: 3000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.1,
            totalShares: 100,
            ownership: { blood_fangs: 80 },
            timestamp: 3000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 100,
            ownership: { blood_fangs: 80 },
            timestamp: 3000,
          },
        },
      },
    };

    // Merge Node A and Node B
    const merged = mergeMonotonicStateFields(nodeA, nodeB);

    const mergedCDO = merged.swfYieldCDOs?.yield_cdo_gossip;
    expect(mergedCDO).toBeDefined();
    expect(mergedCDO?.timestamp).toBe(3000);
    expect(mergedCDO?.tranches.senior.ownership.blood_fangs).toBe(80);
  });
});

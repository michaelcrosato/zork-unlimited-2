import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";

describe("SWF Yield Derivative Tokens & Multi-Fund Risk Pooling (AF-130)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "derivatives_test_pack",
      title: "SWF Derivatives Test Pack",
      start_room: "hq_room",
      vars_init: { gold: 2000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "hq_room",
        name: "HQ Room",
        description: "Syndicate Headquarters.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle SWF yield token proposals, votes, and proportional minting", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 60, fangs: 40 },
        totalReserves: 500,
        timestamp: 1000,
      },
    };

    state.jointVenturePortfolios = {
      jv1: {
        id: "jv1",
        fundId: "swf1",
        targetType: "ArbitrageRoute",
        targetId: "route1",
        investedAmount: 300,
        yieldRate: 10,
        status: "Active",
        timestamp: 1000,
      },
    };

    // 1. Propose Minting SWF Yield Token
    const proposeAct = {
      type: "PROPOSE_MINT_SWF_YIELD_TOKEN",
      proposalId: "ytp1",
      portfolioId: "jv1",
      fundId: "swf1",
      proposerSyndicateId: "claws",
      totalShares: 100,
      pricePerShare: 5,
      timestamp: 1010,
    };

    // Sender not a member of proposer syndicate should fail
    let resWrongSender = multiAgentStep(state, { agentId: "bob", action: proposeAct as any }, mockPack);
    expect(resWrongSender.ok).toBe(false);
    expect(resWrongSender.rejectionReason).toContain("is not a member of proposer syndicate");

    // Propose successfully
    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.swfYieldTokenProposals?.ytp1?.resolved).toBe(false);
    expect(res.state.swfYieldTokenProposals?.ytp1?.votes?.player?.vote).toBe(true);

    // 2. Vote from claws members (player already YES, need Alice)
    const aliceVote = {
      type: "VOTE_MINT_SWF_YIELD_TOKEN",
      proposalId: "ytp1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1020,
    };
    res = multiAgentStep(res.state, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.swfYieldTokenProposals?.ytp1?.resolved).toBe(false); // Still needs fangs votes

    // 3. Vote from fangs member bob (bob YES)
    const bobVote = {
      type: "VOTE_MINT_SWF_YIELD_TOKEN",
      proposalId: "ytp1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1030,
    };
    res = multiAgentStep(res.state, { agentId: "bob", action: bobVote as any }, mockPack);
    expect(res.ok).toBe(true);
    // 2 claws votes (2/2 members = 100%) and 1 fangs vote (1/2 members = 50%) -> fangs does not have majority (>50%) yet
    expect(res.state.swfYieldTokenProposals?.ytp1?.resolved).toBe(false);

    // 4. Vote from fangs member charlie (charlie YES) -> majority approved!
    const charlieVote = {
      type: "VOTE_MINT_SWF_YIELD_TOKEN",
      proposalId: "ytp1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1040,
    };
    res = multiAgentStep(res.state, { agentId: "charlie", action: charlieVote as any }, mockPack);
    expect(res.ok).toBe(true);

    // Verified resolution and minting
    const proposal = res.state.swfYieldTokenProposals?.ytp1;
    expect(proposal?.resolved).toBe(true);

    const token = res.state.swfYieldTokens?.ytp1;
    expect(token).toBeDefined();
    expect(token?.portfolioId).toBe("jv1");
    expect(token?.issuerFundId).toBe("swf1");
    expect(token?.totalShares).toBe(100);
    expect(token?.pricePerShare).toBe(5);

    // Proportion check:
    // Claws contributed 60%, Fangs contributed 40%.
    // Claws gets 60 shares, Fangs gets 40 shares.
    expect(token?.syndicateShares?.claws).toBe(60);
    expect(token?.syndicateShares?.fangs).toBe(40);
  });

  it("should support trading SWF yield token derivatives on secondary market", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "bob"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 500,
      },
    };

    state.swfYieldTokens = {
      yt1: {
        id: "yt1",
        portfolioId: "jv1",
        issuerFundId: "swf1",
        totalShares: 100,
        syndicateShares: { claws: 60, fangs: 40 },
        pricePerShare: 5,
        timestamp: 1000,
      },
    };

    // Trade 10 shares from claws to fangs for 50 gold
    const tradeAct = {
      type: "TRADE_SWF_YIELD_DERIVATIVE",
      tokenId: "yt1",
      sellerSyndicateId: "claws",
      buyerSyndicateId: "fangs",
      shares: 10,
      goldPrice: 50,
      timestamp: 1010,
    };

    // Buyer fangs has 500 gold (enough)
    let res = multiAgentStep(state, { agentId: "player", action: tradeAct as any }, mockPack);
    expect(res.ok).toBe(true);

    const token = res.state.swfYieldTokens?.yt1;
    expect(token?.syndicateShares?.claws).toBe(50); // 60 - 10
    expect(token?.syndicateShares?.fangs).toBe(50); // 40 + 10

    // Check gold transferred
    expect(res.state.syndicates?.claws?.warChest).toBe(150); // 100 + 50
    expect(res.state.syndicates?.fangs?.warChest).toBe(450); // 500 - 50
  });

  it("should auto-distribute derivative yield dividends to token holders during economy ticks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: [],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 200,
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 100 }, // Claws owns 100% of the SWF
        totalReserves: 500,
        timestamp: 1000,
      },
    };

    // Portfolio generates yield on ticks
    state.jointVenturePortfolios = {
      jv1: {
        id: "jv1",
        fundId: "swf1",
        targetType: "ArbitrageRoute",
        targetId: "route1",
        investedAmount: 1000, // 1000 invested
        yieldRate: 10,        // 10% yield per tick = 100 gold
        status: "Active",
        timestamp: 1000,
      },
    };

    // Claws sold 40% (40 shares) of the yield derivative to Fangs
    state.swfYieldTokens = {
      yt1: {
        id: "yt1",
        portfolioId: "jv1",
        issuerFundId: "swf1",
        totalShares: 100,
        syndicateShares: { claws: 60, fangs: 40 },
        pricePerShare: 5,
        timestamp: 1000,
      },
    };

    // Run step which ticks production labs and ticks the economy/portfolio yields
    const dummyAct = { type: "LOOK" };
    let res = step(state, dummyAct as any, mockPack, "player");
    expect(res.ok).toBe(true);

    // Yield is 100 gold.
    // 40% (40 gold) distributed to fangs as derivative token holders.
    // 60% (60 gold) distributed to claws (60% from derivative token holders).
    // Remaining yield is 100 - 40 - 60 = 0.
    expect(res.state.syndicates?.fangs?.warChest).toBe(240); // 200 + 40
    expect(res.state.syndicates?.claws?.warChest).toBe(160); // 100 + 60
  });

  it("should handle SWF risk pool establishment and voting", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 2000 },
      agentsInit: ["player", "bob"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 200,
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 100 },
        totalReserves: 200,
        timestamp: 1000,
      },
      swf2: {
        id: "swf2",
        syndicates: { fangs: 100 },
        totalReserves: 300,
        timestamp: 1000,
      },
    };

    // 1. Propose SWF Risk Pool
    const proposePoolAct = {
      type: "PROPOSE_SWF_RISK_POOL",
      proposalId: "rp1",
      name: "Sovereign Shield Pool",
      fundIds: ["swf1", "swf2"],
      contributions: { swf1: 100, swf2: 150 },
      proposerSyndicateId: "claws",
      timestamp: 1010,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposePoolAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.swfRiskPoolProposals?.rp1?.resolved).toBe(false);

    // 2. Vote from fangs member bob (bob YES) -> resolves double-majority!
    const bobVote = {
      type: "VOTE_SWF_RISK_POOL",
      proposalId: "rp1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1020,
    };
    res = multiAgentStep(res.state, { agentId: "bob", action: bobVote as any }, mockPack);
    expect(res.ok).toBe(true);

    const proposal = res.state.swfRiskPoolProposals?.rp1;
    expect(proposal?.resolved).toBe(true);

    const pool = res.state.swfRiskPools?.rp1;
    expect(pool).toBeDefined();
    expect(pool?.name).toBe("Sovereign Shield Pool");
    expect(pool?.totalPooledReserves).toBe(250); // 100 + 150
    expect(pool?.fundContributions?.swf1).toBe(100);
    expect(pool?.fundContributions?.swf2).toBe(150);

    // Deducted from SWF totalReserves
    expect(res.state.sovereignWealthFunds?.swf1?.totalReserves).toBe(100); // 200 - 100
    expect(res.state.sovereignWealthFunds?.swf2?.totalReserves).toBe(150); // 300 - 150
  });

  it("should trigger automated risk pool bailouts when SWF reserves fall below threshold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 100 },
        totalReserves: 40, // Below safety threshold of 50!
        timestamp: 1000,
      },
      swf2: {
        id: "swf2",
        syndicates: { fangs: 100 },
        totalReserves: 150,
        timestamp: 1000,
      },
    };

    state.swfRiskPools = {
      rp1: {
        id: "rp1",
        name: "Sovereign Shield Pool",
        fundIds: ["swf1", "swf2"],
        totalPooledReserves: 250,
        fundContributions: { swf1: 100, swf2: 150 },
        status: "Active",
        timestamp: 1000,
      },
    };

    // Run economy tick via a step transition
    const dummyAct = { type: "LOOK" };
    let res = step(state, dummyAct as any, mockPack, "player");
    expect(res.ok).toBe(true);

    // Safety threshold is 50. swf1 had 40 reserves. Deficit is 10.
    // Risk pool rp1 bails out swf1 by transferring 10 gold from pooled reserves.
    const pool = res.state.swfRiskPools?.rp1;
    expect(pool?.totalPooledReserves).toBe(240); // 250 - 10

    const fund1 = res.state.sovereignWealthFunds?.swf1;
    expect(fund1?.totalReserves).toBe(50); // 40 + 10 (Restored to safety threshold!)

    // Proportional deduction from pool contributions:
    // swf1 contribution: 100/250 = 40% of 10 = 4
    // swf2 contribution: 150/250 = 60% of 10 = 6
    expect(pool?.fundContributions?.swf1).toBe(96);  // 100 - 4
    expect(pool?.fundContributions?.swf2).toBe(144); // 150 - 6
  });

  it("should synchronize SWF yield token and risk pool states across gossip nodes perfectly", () => {
    // Setup two nodes
    const nodeA = new GossipNode("player", mockPack, 12345);
    const nodeB = new GossipNode("bob", mockPack, 12345);

    nodeA.connect(nodeB);

    // 1. Create claws syndicate on Node A
    const createClaws = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "claws",
      name: "Iron Claws",
      members: ["player", "bob"],
      timestamp: 1000,
    } as any);
    expect(createClaws.ok).toBe(true);

    // Contribute to claws warChest
    const contribute = nodeA.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "claws",
      amount: 1000,
      timestamp: 1005,
    } as any);
    expect(contribute.ok).toBe(true);

    // Sync Node A to Node B
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    // 2. Propose SWF on Node A
    const proposeSWF = nodeA.executeLocalAction({
      type: "PROPOSE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      fundId: "swf1",
      syndicateId: "claws",
      amount: 400,
      timestamp: 1010,
    } as any);
    expect(proposeSWF.ok).toBe(true);

    // Sync to Node B
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));

    // Vote YES on Node B -> resolves SWF swf1!
    const voteSWF = nodeB.executeLocalAction({
      type: "VOTE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1015,
    } as any);
    expect(voteSWF.ok).toBe(true);
    expect(nodeB.localState.sovereignWealthFunds?.swf1).toBeDefined();

    // Sync Node B to Node A
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    // 3. Propose JV Investment on Node A
    const proposeJV = nodeA.executeLocalAction({
      type: "PROPOSE_JOINT_VENTURE_INVESTMENT",
      proposalId: "jv1",
      fundId: "swf1",
      proposerSyndicateId: "claws",
      targetType: "ArbitrageRoute",
      targetId: "route1",
      amount: 300,
      yieldRate: 10,
      timestamp: 1020,
    } as any);
    expect(proposeJV.ok).toBe(true);

    // Sync to Node B
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));

    // Vote YES on Node B -> resolves JV jv1!
    const voteJV = nodeB.executeLocalAction({
      type: "VOTE_JOINT_VENTURE_INVESTMENT",
      proposalId: "jv1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1025,
    } as any);
    expect(voteJV.ok).toBe(true);
    expect(nodeB.localState.jointVenturePortfolios?.jv1).toBeDefined();

    // Sync Node B to Node A
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    // 4. Propose Minting SWF Yield Token on Node A
    const proposeMint = nodeA.executeLocalAction({
      type: "PROPOSE_MINT_SWF_YIELD_TOKEN",
      proposalId: "yt1",
      portfolioId: "jv1",
      fundId: "swf1",
      proposerSyndicateId: "claws",
      totalShares: 100,
      pricePerShare: 5,
      timestamp: 1030,
    } as any);
    expect(proposeMint.ok).toBe(true);

    // Sync to Node B
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));

    // Vote YES on Node B -> resolves and mints yield token!
    const voteMint = nodeB.executeLocalAction({
      type: "VOTE_MINT_SWF_YIELD_TOKEN",
      proposalId: "yt1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1035,
    } as any);
    expect(voteMint.ok).toBe(true);
    expect(nodeB.localState.swfYieldTokens?.yt1).toBeDefined();

    // Sync Node B to Node A
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    // Verify convergence!
    expect(nodeA.localState.swfYieldTokens?.yt1).toBeDefined();
    expect(nodeA.localState.swfYieldTokens?.yt1?.totalShares).toBe(100);
    expect(nodeA.localState.swfYieldTokens?.yt1?.syndicateShares?.claws).toBe(100);
  });
});

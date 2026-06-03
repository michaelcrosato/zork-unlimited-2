import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Syndicate Sovereign Wealth Fund & Faction-Wide Joint-Ventures (AF-128)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_test_pack",
      title: "SWF Test Pack",
      start_room: "hq_room",
      vars_init: { gold: 1000 },
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

  it("should handle PROPOSE_SOVEREIGN_WEALTH_FUND validations and checks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 40,
        warChest: 500,
      },
    };

    // 1. Missing proposalId
    const actNoId = {
      type: "PROPOSE_SOVEREIGN_WEALTH_FUND",
      fundId: "swf1",
      syndicateId: "claws",
      amount: 50,
      timestamp: 1000,
    };
    let resNoId = multiAgentStep(state, { agentId: "player", action: actNoId as any }, mockPack);
    expect(resNoId.ok).toBe(false);
    expect(resNoId.rejectionReason).toContain("Proposal ID is required");

    // 2. Non-positive amount
    const actNeg = { ...actNoId, proposalId: "p1", amount: -10 };
    let resNeg = multiAgentStep(state, { agentId: "player", action: actNeg as any }, mockPack);
    expect(resNeg.ok).toBe(false);
    expect(resNeg.rejectionReason).toContain("Amount must be a positive integer");

    // 3. Sender not a member of the syndicate
    const actWrongSender = { ...actNoId, proposalId: "p1", amount: 50 };
    let resWrongSender = multiAgentStep(state, { agentId: "bob", action: actWrongSender as any }, mockPack);
    expect(resWrongSender.ok).toBe(false);
    expect(resWrongSender.rejectionReason).toContain("is not a member of syndicate claws and cannot propose");

    // 4. Insufficient syndicate warChest reserves
    const actInsRes = { ...actNoId, proposalId: "p1", amount: 200 };
    let resInsRes = multiAgentStep(state, { agentId: "player", action: actInsRes as any }, mockPack);
    expect(resInsRes.ok).toBe(false);
    expect(resInsRes.rejectionReason).toContain("insufficient reserves in its warChest");

    // 5. Successful proposal
    const validAct = { ...actNoId, proposalId: "p1", amount: 60 };
    let resValid = multiAgentStep(state, { agentId: "player", action: validAct as any }, mockPack);
    expect(resValid.ok).toBe(true);

    const prop = resValid.state.sovereignWealthFundProposals?.p1;
    expect(prop).toBeDefined();
    expect(prop?.fundId).toBe("swf1");
    expect(prop?.syndicateId).toBe("claws");
    expect(prop?.amount).toBe(60);
    expect(prop?.resolved).toBe(false);
    expect(prop?.votes?.player?.vote).toBe(true);
  });

  it("should resolve SWF reserve pooling upon VOTE_SOVEREIGN_WEALTH_FUND majority approval", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 100,
      },
    };

    // 1. Propose SWF pooling
    const proposeAct = {
      type: "PROPOSE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      fundId: "swf1",
      syndicateId: "claws",
      amount: 60,
      timestamp: 1000,
    };
    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.sovereignWealthFundProposals?.p1?.resolved).toBe(false);
    expect(res.state.syndicates?.claws?.warChest).toBe(100); // Not deducted yet

    // 2. Alice votes YES -> 2/2 YES votes (majority YES > 50%) -> should resolve!
    const voteAct = {
      type: "VOTE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1010,
    };
    let resVote = multiAgentStep(res.state, { agentId: "alice", action: voteAct as any }, mockPack);
    expect(resVote.ok).toBe(true);

    const resolvedProp = resVote.state.sovereignWealthFundProposals?.p1;
    expect(resolvedProp?.resolved).toBe(true);
    expect(resVote.state.syndicates?.claws?.warChest).toBe(40); // 100 - 60 deducted!

    const swf = resVote.state.sovereignWealthFunds?.swf1;
    expect(swf).toBeDefined();
    expect(swf?.totalReserves).toBe(60);
    expect(swf?.syndicates?.claws).toBe(60);
  });

  it("should handle PROPOSE_JOINT_VENTURE_INVESTMENT validations and reserve checks", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
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

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 60, fangs: 40 },
        totalReserves: 100,
        timestamp: 1000,
      },
    };

    // 1. Proposer syndicate not in SWF
    const actWrongSynd = {
      type: "PROPOSE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      fundId: "swf1",
      proposerSyndicateId: "nonexistent", // nonexistent syndicate
      targetType: "FactionBond",
      targetId: "rangers",
      amount: 40,
      yieldRate: 10,
      timestamp: 1010,
    };
    let resWrongSynd = multiAgentStep(state, { agentId: "player", action: actWrongSynd as any }, mockPack);
    expect(resWrongSynd.ok).toBe(false);
    expect(resWrongSynd.rejectionReason).toContain("does not exist");

    // 2. Proposing more than SWF reserves
    const actTooHigh = {
      type: "PROPOSE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      fundId: "swf1",
      proposerSyndicateId: "claws",
      targetType: "FactionBond",
      targetId: "rangers",
      amount: 150, // SWF only has 100
      yieldRate: 10,
      timestamp: 1010,
    };
    let resTooHigh = multiAgentStep(state, { agentId: "player", action: actTooHigh as any }, mockPack);
    expect(resTooHigh.ok).toBe(false);
    expect(resTooHigh.rejectionReason).toContain("insufficient reserves");

    // 3. Successful proposal
    const validAct = { ...actTooHigh, amount: 40 };
    let resValid = multiAgentStep(state, { agentId: "player", action: validAct as any }, mockPack);
    expect(resValid.ok).toBe(true);

    const prop = resValid.state.jointVentureInvestmentProposals?.j1;
    expect(prop).toBeDefined();
    expect(prop?.fundId).toBe("swf1");
    expect(prop?.targetType).toBe("FactionBond");
    expect(prop?.targetId).toBe("rangers");
    expect(prop?.amount).toBe(40);
    expect(prop?.yieldRate).toBe(10);
    expect(prop?.resolved).toBe(false);
    expect(prop?.votes?.player?.vote).toBe(true);
  });

  it("should enforce multi-syndicate majority consensus for joint-venture investment resolution", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 200,
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 60, fangs: 120 },
        totalReserves: 180,
        timestamp: 1000,
      },
    };

    // 1. Propose joint venture investment from claws
    const proposeAct = {
      type: "PROPOSE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      fundId: "swf1",
      proposerSyndicateId: "claws",
      targetType: "ArbitrageRoute",
      targetId: "route_alpha",
      amount: 100,
      yieldRate: 15,
      timestamp: 1010,
    };
    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.jointVentureInvestmentProposals?.j1?.resolved).toBe(false);

    // 2. Alice (claws member) votes YES -> Claws has majority YES (2/2 YES > 50%)
    const aliceVote = {
      type: "VOTE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1020,
    };
    let resAlice = multiAgentStep(res.state, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(resAlice.ok).toBe(true);
    // Claws alone has approved, but Fangs has not approved yet
    expect(resAlice.state.jointVentureInvestmentProposals?.j1?.resolved).toBe(false);

    // 3. Bob (fangs member) votes YES -> Fangs has 1/2 YES (not majority yet)
    const bobVote = {
      type: "VOTE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1030,
    };
    let resBob = multiAgentStep(resAlice.state, { agentId: "bob", action: bobVote as any }, mockPack);
    expect(resBob.ok).toBe(true);
    expect(resBob.state.jointVentureInvestmentProposals?.j1?.resolved).toBe(false);

    // 4. Charlie (fangs member) votes YES -> Fangs reaches majority YES (2/2 YES > 50%) -> should resolve!
    const charlieVote = {
      type: "VOTE_JOINT_VENTURE_INVESTMENT",
      proposalId: "j1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1040,
    };
    let resCharlie = multiAgentStep(resBob.state, { agentId: "charlie", action: charlieVote as any }, mockPack);
    expect(resCharlie.ok).toBe(true);

    const resolvedProp = resCharlie.state.jointVentureInvestmentProposals?.j1;
    expect(resolvedProp?.resolved).toBe(true);

    // Fund reserves should be deducted: 180 - 100 = 80
    const swf = resCharlie.state.sovereignWealthFunds?.swf1;
    expect(swf?.totalReserves).toBe(80);

    // Active joint venture portfolio should be created
    const jv = resCharlie.state.jointVenturePortfolios?.j1;
    expect(jv).toBeDefined();
    expect(jv?.status).toBe("Active");
    expect(jv?.investedAmount).toBe(100);
    expect(jv?.yieldRate).toBe(15);
  });

  it("should process periodic ticks, calculate yields, and distribute fractional dividends to participating syndicates", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 50, // Starts at 50
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 200, // Starts at 200
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 100, fangs: 300 }, // 1:3 ratio
        totalReserves: 400,
        timestamp: 1000,
      },
    };

    state.jointVenturePortfolios = {
      j1: {
        id: "j1",
        fundId: "swf1",
        targetType: "ArbitrageRoute",
        targetId: "route_beta",
        investedAmount: 100,
        yieldRate: 20, // 20% yield rate = 20 gold per tick
        status: "Active",
        timestamp: 1010,
      },
    };

    // Step/tick the engine to trigger periodic economic/JV yields
    let ticked = step(state, { type: "LOOK" }, mockPack);

    // Check dividends: 20 gold yield.
    // Claws contribution fraction: 100/400 = 25% -> 5 gold dividend
    // Fangs contribution fraction: 300/400 = 75% -> 15 gold dividend
    expect(ticked.state.syndicates?.claws?.warChest).toBe(55); // 50 + 5
    expect(ticked.state.syndicates?.fangs?.warChest).toBe(215); // 200 + 15
    expect(
      ticked.events.some((e: any) => e.type === "narration" && e.text.includes("Joint-venture portfolio j1"))
    ).toBe(true);
  });

  it("should synchronize SWF and JV states across P2P Gossip nodes and converge perfectly", () => {
    // Instantiate nodes
    const nodeA = new GossipNode("player", mockPack, 12345);
    const nodeB = new GossipNode("bob", mockPack, 12345);

    // Connect them
    nodeA.connect(nodeB);

    // 1. Create a syndicate first
    const createClawsA = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "claws",
      name: "Iron Claws",
      members: ["player", "bob"],
      timestamp: 1000,
    } as any);
    expect(createClawsA.ok).toBe(true);

    const contributeA = nodeA.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "claws",
      amount: 200,
      timestamp: 1005,
    } as any);
    expect(contributeA.ok).toBe(true);

    // Synchronize nodes
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    expect(nodeB.localState.syndicates?.claws?.warChest).toBe(200);

    // Agent 'player' proposes SWF reserve pooling on Node A
    const actionA = {
      type: "PROPOSE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      fundId: "swf1",
      syndicateId: "claws",
      amount: 100,
      timestamp: 1010,
    };

    const stepResA = nodeA.executeLocalAction(actionA as any);
    expect(stepResA.ok).toBe(true);

    // Exchange gossip packets to propagate the transaction Node A -> Node B
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("bob"));

    // Node B should now have the proposed SWF reserve pooling
    expect(nodeB.localState.sovereignWealthFundProposals?.p1).toBeDefined();

    // Now, on Node B, agent 'bob' votes YES on the SWF proposal
    const actionB = {
      type: "VOTE_SOVEREIGN_WEALTH_FUND",
      proposalId: "p1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1020,
    };

    const stepResB = nodeB.executeLocalAction(actionB as any);
    expect(stepResB.ok).toBe(true);

    // Since bob's vote is YES, and player was already YES (2/2 YES > 50% majority), it resolves on Node B!
    expect(nodeB.localState.sovereignWealthFundProposals?.p1?.resolved).toBe(true);
    expect(nodeB.localState.syndicates?.claws?.warChest).toBe(100);
    expect(nodeB.localState.sovereignWealthFunds?.swf1?.totalReserves).toBe(100);

    // Propagate Node B gossip back to Node A
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("player"));

    // Now both nodes must fully converge!
    expect(nodeA.localState.sovereignWealthFundProposals?.p1?.resolved).toBe(true);
    expect(nodeA.localState.syndicates?.claws?.warChest).toBe(100);
    expect(nodeA.localState.sovereignWealthFunds?.swf1?.totalReserves).toBe(100);
  });

  it("should handle joint-venture portfolio swaps across SWFs under consent-gated double-majority consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob", "charlie"],
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
        syndicates: { fangs: 200 },
        totalReserves: 300,
        timestamp: 1000,
      },
    };

    state.jointVenturePortfolios = {
      jv1: {
        id: "jv1",
        fundId: "swf1",
        targetType: "ArbitrageRoute",
        targetId: "route_omega",
        investedAmount: 100,
        yieldRate: 15,
        status: "Active",
        timestamp: 1010,
      },
    };

    // 1. Propose portfolio swap: claws (member of swf1) proposes swapping jv1 to swf2 for 150 gold
    const proposeAct = {
      type: "PROPOSE_JOINT_VENTURE_PORTFOLIO_SWAP",
      proposalId: "ps1",
      portfolioId: "jv1",
      sourceFundId: "swf1",
      targetFundId: "swf2",
      proposerSyndicateId: "claws",
      goldPrice: 150,
      timestamp: 1020,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.jointVenturePortfolioSwapProposals?.ps1?.resolved).toBe(false);

    // 2. Alice (claws member) votes YES -> Claws (source SWF) has approved
    const aliceVote = {
      type: "VOTE_JOINT_VENTURE_PORTFOLIO_SWAP",
      proposalId: "ps1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1030,
    };
    let resAlice = multiAgentStep(res.state, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(resAlice.ok).toBe(true);
    expect(resAlice.state.jointVenturePortfolioSwapProposals?.ps1?.resolved).toBe(false); // Target SWF syndicates haven't approved

    // 3. Bob (fangs member) votes YES -> Fangs has 1/2 YES (not majority yet)
    const bobVote = {
      type: "VOTE_JOINT_VENTURE_PORTFOLIO_SWAP",
      proposalId: "ps1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1040,
    };
    let resBob = multiAgentStep(resAlice.state, { agentId: "bob", action: bobVote as any }, mockPack);
    expect(resBob.ok).toBe(true);
    expect(resBob.state.jointVenturePortfolioSwapProposals?.ps1?.resolved).toBe(false);

    // 4. Charlie (fangs member) votes YES -> Fangs reaches majority YES -> should resolve!
    const charlieVote = {
      type: "VOTE_JOINT_VENTURE_PORTFOLIO_SWAP",
      proposalId: "ps1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1050,
    };
    let resCharlie = multiAgentStep(resBob.state, { agentId: "charlie", action: charlieVote as any }, mockPack);
    expect(resCharlie.ok).toBe(true);

    const resolvedProp = resCharlie.state.jointVenturePortfolioSwapProposals?.ps1;
    expect(resolvedProp?.resolved).toBe(true);

    // Check SWF reserves:
    // swf2 (target) should pay 150: 300 - 150 = 150
    // swf1 (source) should receive 150: 200 + 150 = 350
    expect(resCharlie.state.sovereignWealthFunds?.swf2?.totalReserves).toBe(150);
    expect(resCharlie.state.sovereignWealthFunds?.swf1?.totalReserves).toBe(350);

    // Check portfolio ownership
    expect(resCharlie.state.jointVenturePortfolios?.jv1?.fundId).toBe("swf2");
  });

  it("should handle partial and full joint-venture asset liquidations and return gold to SWF reserves", () => {
    let state = createInitialState({
      seed: 12345,
      start: "hq_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100,
      },
    };

    state.sovereignWealthFunds = {
      swf1: {
        id: "swf1",
        syndicates: { claws: 100 },
        totalReserves: 50,
        timestamp: 1000,
      },
    };

    state.jointVenturePortfolios = {
      jv1: {
        id: "jv1",
        fundId: "swf1",
        targetType: "ArbitrageRoute",
        targetId: "route_omega",
        investedAmount: 100,
        yieldRate: 15,
        status: "Active",
        timestamp: 1010,
      },
    };

    // 1. Propose partial asset liquidation: claws proposes liquidating 40 gold from jv1
    const proposeAct = {
      type: "PROPOSE_JOINT_VENTURE_ASSET_LIQUIDATION",
      proposalId: "al1",
      portfolioId: "jv1",
      proposerSyndicateId: "claws",
      liquidateAmount: 40,
      timestamp: 1020,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.jointVentureAssetLiquidationProposals?.al1?.resolved).toBe(false);

    // 2. Alice votes YES -> claws has majority -> should resolve!
    const aliceVote = {
      type: "VOTE_JOINT_VENTURE_ASSET_LIQUIDATION",
      proposalId: "al1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1030,
    };
    let resVote = multiAgentStep(res.state, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(resVote.ok).toBe(true);
    expect(resVote.state.jointVentureAssetLiquidationProposals?.al1?.resolved).toBe(true);

    // Check portfolio investedAmount: 100 - 40 = 60
    // Check SWF reserves: 50 + 40 = 90
    expect(resVote.state.jointVenturePortfolios?.jv1?.investedAmount).toBe(60);
    expect(resVote.state.jointVenturePortfolios?.jv1?.status).toBe("Active");
    expect(resVote.state.sovereignWealthFunds?.swf1?.totalReserves).toBe(90);

    // 3. Now fully liquidate the remaining 60
    const proposeAct2 = {
      type: "PROPOSE_JOINT_VENTURE_ASSET_LIQUIDATION",
      proposalId: "al2",
      portfolioId: "jv1",
      proposerSyndicateId: "claws",
      liquidateAmount: 60,
      timestamp: 1040,
    };
    let res2 = multiAgentStep(resVote.state, { agentId: "player", action: proposeAct2 as any }, mockPack);
    const aliceVote2 = {
      type: "VOTE_JOINT_VENTURE_ASSET_LIQUIDATION",
      proposalId: "al2",
      syndicateId: "claws",
      vote: true,
      timestamp: 1050,
    };
    let resVote2 = multiAgentStep(res2.state, { agentId: "alice", action: aliceVote2 as any }, mockPack);
    expect(resVote2.ok).toBe(true);
    expect(resVote2.state.jointVentureAssetLiquidationProposals?.al2?.resolved).toBe(true);

    // Portfolio investedAmount: 60 - 60 = 0 -> status Closed
    // SWF reserves: 90 + 60 = 150
    expect(resVote2.state.jointVenturePortfolios?.jv1?.investedAmount).toBe(0);
    expect(resVote2.state.jointVenturePortfolios?.jv1?.status).toBe("Closed");
    expect(resVote2.state.sovereignWealthFunds?.swf1?.totalReserves).toBe(150);
  });
});

import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Syndicate Decentralized Liquidity Bridge & Dynamic Cross-Mesh Borrowing (AF-127)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "bridge_test_pack",
      title: "Bridge Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000, gold_alice: 1000, gold_bob: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Meeting Area",
        description: "A secure location.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle PROPOSE_CROSS_MESH_BRIDGE validations, checks, and initialization", () => {
    let state = createInitialState({
      seed: 54321,
      start: "safehouse_room",
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

    // 1. Borrower and Lender cannot be the same
    const actSame = {
      type: "PROPOSE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      borrowerSyndicateId: "claws",
      lenderSyndicateId: "claws",
      amount: 200,
      interestRate: 10,
      termSteps: 10,
      timestamp: 1000,
    };
    let resSame = multiAgentStep(state, { agentId: "player", action: actSame as any }, mockPack);
    expect(resSame.ok).toBe(false);
    expect(resSame.rejectionReason).toContain("cannot be the same");

    // 2. Non-positive amount validation
    const actNeg = { ...actSame, lenderSyndicateId: "fangs", amount: -50 };
    let resNeg = multiAgentStep(state, { agentId: "player", action: actNeg as any }, mockPack);
    expect(resNeg.ok).toBe(false);
    expect(resNeg.rejectionReason).toContain("must be a positive integer");

    // 3. Sender must be a member of the borrower syndicate
    const actWrongSender = { ...actSame, lenderSyndicateId: "fangs", amount: 200 };
    let resWrongSender = multiAgentStep(state, { agentId: "bob", action: actWrongSender as any }, mockPack);
    expect(resWrongSender.ok).toBe(false);
    expect(resWrongSender.rejectionReason).toContain("is not a member of borrower syndicate");

    // 4. Lender has insufficient warChest reserves
    const actInsRes = { ...actSame, lenderSyndicateId: "fangs", amount: 1000 };
    let resInsRes = multiAgentStep(state, { agentId: "player", action: actInsRes as any }, mockPack);
    expect(resInsRes.ok).toBe(false);
    expect(resInsRes.rejectionReason).toContain("insufficient reserves");

    // 5. Successful proposal
    const validAct = { ...actSame, lenderSyndicateId: "fangs", amount: 200 };
    let resValid = multiAgentStep(state, { agentId: "player", action: validAct as any }, mockPack);
    expect(resValid.ok).toBe(true);

    const prop = resValid.state.crossMeshBridgeProposals?.prop1;
    expect(prop).toBeDefined();
    expect(prop?.borrowerSyndicateId).toBe("claws");
    expect(prop?.lenderSyndicateId).toBe("fangs");
    expect(prop?.amount).toBe(200);
    expect(prop?.interestRate).toBe(10);
    expect(prop?.termSteps).toBe(10);
    expect(prop?.resolved).toBe(false);
    expect(prop?.votes?.player?.vote).toBe(true);
  });

  it("should enforce double-majority consensus and fund transfers upon VOTE_CROSS_MESH_BRIDGE resolution", () => {
    let state = createInitialState({
      seed: 54321,
      start: "safehouse_room",
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
        dominance: 50,
        warChest: 100,
      },
      fangs: {
        id: "fangs",
        name: "Blood Fangs",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        dominance: 40,
        warChest: 500,
      },
    };

    // 1. Propose bridge loan
    const proposeAct = {
      type: "PROPOSE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      borrowerSyndicateId: "claws",
      lenderSyndicateId: "fangs",
      amount: 200,
      interestRate: 10,
      termSteps: 10,
      timestamp: 1000,
    };
    let res = multiAgentStep(state, { agentId: "player", action: proposeAct as any }, mockPack);
    expect(res.ok).toBe(true);

    // 2. Voting by non-involved syndicate member should fail
    res.state.syndicates = res.state.syndicates ? { ...res.state.syndicates } : {};
    res.state.syndicates.unaligned_synd = {
      id: "unaligned_synd",
      name: "Unaligned",
      members: ["charlie"],
      definedBy: "charlie",
      timestamp: 1000,
    };
    const voteAct = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      syndicateId: "unaligned_synd",
      vote: true,
      timestamp: 1010,
    };
    let resNonInvolved = multiAgentStep(res.state, { agentId: "charlie", action: voteAct as any }, mockPack);
    expect(resNonInvolved.ok).toBe(false);
    expect(resNonInvolved.rejectionReason).toContain("is not involved in proposal");

    // Remove unaligned_synd for clean double-majority testing
    let cleanState = { ...res.state };
    if (cleanState.syndicates) {
      cleanState.syndicates = { ...cleanState.syndicates };
      delete cleanState.syndicates.unaligned_synd;
    }

    // 3. Voter alice (borrower member) votes YES -> borrower reaches majority (2/2 members YES, which is > 50%)
    const aliceVote = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      syndicateId: "claws",
      vote: true,
      timestamp: 1020,
    };
    let resAlice = multiAgentStep(cleanState, { agentId: "alice", action: aliceVote as any }, mockPack);
    expect(resAlice.ok).toBe(true);
    // Not resolved yet, lender has not voted
    expect(resAlice.state.crossMeshBridgeProposals?.prop1?.resolved).toBe(false);

    // 4. Lender member bob votes YES -> lender has 1/2 YES (not majority yet)
    const bobVote = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1030,
    };
    let resBob = multiAgentStep(resAlice.state, { agentId: "bob", action: bobVote as any }, mockPack);
    expect(resBob.ok).toBe(true);
    // 1/2 is not > 50%, so lender majority not reached yet
    expect(resBob.state.crossMeshBridgeProposals?.prop1?.resolved).toBe(false);

    // 5. Lender member charlie votes YES -> lender has 2/2 YES (> 50%). Double majority achieved!
    const charlieVote = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "prop1",
      syndicateId: "fangs",
      vote: true,
      timestamp: 1040,
    };
    let resCharlie = multiAgentStep(resBob.state, { agentId: "charlie", action: charlieVote as any }, mockPack);
    expect(resCharlie.ok).toBe(true);

    const propResolved = resCharlie.state.crossMeshBridgeProposals?.prop1;
    expect(propResolved?.resolved).toBe(true);

    // Gold transfer: fangs (500 - 200 = 300), claws (100 + 200 = 300)
    expect(resCharlie.state.syndicates?.fangs?.warChest).toBe(300);
    expect(resCharlie.state.syndicates?.claws?.warChest).toBe(300);

    // Verify CrossMeshBridgeLoan created in state
    const loan = resCharlie.state.crossMeshBridgeLoans?.prop1;
    expect(loan).toBeDefined();
    expect(loan?.principal).toBe(200);
    expect(loan?.interestRate).toBe(10);
    expect(loan?.termSteps).toBe(10);
    expect(loan?.dueStep).toBe(13);
    expect(loan?.remainingRepayment).toBe(220); // 200 + 10% interest (20)
    expect(loan?.status).toBe("Active");
  });

  it("should handle dynamic economic ticks, interest accrual, automatic repayments from reserves, repayment completion, and default penalties", () => {
    let state = createInitialState({
      seed: 54321,
      start: "safehouse_room",
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
        warChest: 50, // Starts with some gold, but will automatically pay back
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

    // 1. Manually insert an active bridge loan in the state
    state.crossMeshBridgeLoans = {
      bridge1: {
        id: "bridge1",
        borrowerSyndicateId: "claws",
        lenderSyndicateId: "fangs",
        principal: 200,
        interestRate: 10, // 10% interest rate
        termSteps: 3,
        startStep: 1,
        dueStep: 4,
        remainingRepayment: 220, // 200 principal + 20 initial interest
        status: "Active",
        timestamp: 1000,
      },
    };

    // First tick:
    // Interest accrued: 200 * 10% = 20 gold.
    // remainingRepayment goes 220 + 20 = 240.
    // Borrower automatically repays 50 gold from warChest (reducing warChest to 0).
    // Lender warChest increases by 50 to 550.
    // remainingRepayment becomes 240 - 50 = 190.
    let tick1State = tickEconomy(state, mockPack);
    expect(tick1State.crossMeshBridgeLoans?.bridge1?.remainingRepayment).toBe(190);
    expect(tick1State.syndicates?.claws?.warChest).toBe(0);
    expect(tick1State.syndicates?.fangs?.warChest).toBe(550);
    expect(tick1State.crossMeshBridgeLoans?.bridge1?.status).toBe("Active");

    // Give borrower warChest more gold to simulate business income
    tick1State.syndicates!.claws!.warChest = 300;

    // Second tick:
    // Interest accrued: 20 gold.
    // remainingRepayment goes 190 + 20 = 210.
    // Borrower automatically repays 210 gold from warChest (reducing warChest to 90).
    // Lender warChest increases by 210 to 760.
    // remainingRepayment becomes 0. Loan gets Repaid!
    let tick2State = tickEconomy(tick1State, mockPack);
    expect(tick2State.crossMeshBridgeLoans?.bridge1?.remainingRepayment).toBe(0);
    expect(tick2State.crossMeshBridgeLoans?.bridge1?.status).toBe("Repaid");
    expect(tick2State.syndicates?.claws?.warChest).toBe(90);
    expect(tick2State.syndicates?.fangs?.warChest).toBe(760);

    // 2. Test Default condition
    let defaultState = createInitialState({
      seed: 54321,
      start: "safehouse_room",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    defaultState.syndicates = {
      claws: {
        id: "claws",
        name: "Iron Claws",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 0, // No gold to repay
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

    defaultState.step = 5; // Step 5 is past the due step 4
    defaultState.crossMeshBridgeLoans = {
      bridge2: {
        id: "bridge2",
        borrowerSyndicateId: "claws",
        lenderSyndicateId: "fangs",
        principal: 100,
        interestRate: 5,
        termSteps: 3,
        startStep: 1,
        dueStep: 4,
        remainingRepayment: 100,
        status: "Active",
        timestamp: 1000,
      },
    };

    let tickDefault = tickEconomy(defaultState, mockPack);
    const defaultedLoan = tickDefault.crossMeshBridgeLoans?.bridge2;
    expect(defaultedLoan?.status).toBe("Defaulted");
    // Dominance penalty applied
    expect(tickDefault.syndicates?.claws?.dominance).toBe(40); // 50 - 10 = 40
  });

  it("should converge bridge proposals and loans seamlessly across gossip mesh nodes", () => {
    // Simulate mesh networking with three independent nodes player, alice, and bob
    const nodePlayer = new GossipNode("player", mockPack, 12345);
    const nodeAlice = new GossipNode("alice", mockPack, 12345);
    const nodeBob = new GossipNode("bob", mockPack, 12345);

    // Set up peer connections
    nodePlayer.connect(nodeAlice);
    nodeAlice.connect(nodeBob);

    // 1. Player creates "claws" syndicate via transaction
    const createClaws = nodePlayer.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "claws",
      name: "Iron Claws",
      members: ["player", "alice"],
      timestamp: 1000,
    } as any);
    expect(createClaws.ok).toBe(true);

    // 2. Player contributes 100 gold to claws warChest
    const contributeClaws = nodePlayer.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "claws",
      amount: 100,
      timestamp: 1010,
    } as any);
    expect(contributeClaws.ok).toBe(true);

    // 3. Bob creates "fangs" syndicate via transaction
    const createFangs = nodeBob.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "fangs",
      name: "Blood Fangs",
      members: ["bob"],
      timestamp: 1000,
    } as any);
    expect(createFangs.ok).toBe(true);

    // 4. Bob contributes 500 gold to fangs warChest
    const contributeFangs = nodeBob.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "fangs",
      amount: 500,
      timestamp: 1010,
    } as any);
    expect(contributeFangs.ok).toBe(true);

    // Perform initial synchronization so all nodes are aware of the syndicates and their funds
    nodeAlice.receiveGossip(nodePlayer.generateGossipMessageFor("alice"));
    nodePlayer.receiveGossip(nodeAlice.generateGossipMessageFor("player"));
    nodeBob.receiveGossip(nodeAlice.generateGossipMessageFor("bob"));
    nodeAlice.receiveGossip(nodeBob.generateGossipMessageFor("alice"));
    nodeAlice.receiveGossip(nodePlayer.generateGossipMessageFor("alice"));
    nodePlayer.receiveGossip(nodeAlice.generateGossipMessageFor("player"));

    // Check that claws has 100 gold and fangs has 500 gold across all nodes
    expect(nodePlayer.localState.syndicates?.claws?.warChest).toBe(100);
    expect(nodeAlice.localState.syndicates?.claws?.warChest).toBe(100);
    expect(nodeBob.localState.syndicates?.fangs?.warChest).toBe(500);

    // 5. Player proposes a cross-mesh bridge loan
    const proposeAct = {
      type: "PROPOSE_CROSS_MESH_BRIDGE",
      proposalId: "bridge_prop",
      borrowerSyndicateId: "claws",
      lenderSyndicateId: "fangs",
      amount: 150,
      interestRate: 8,
      termSteps: 5,
      timestamp: 2000,
    };

    nodePlayer.executeLocalAction(proposeAct as any);

    // Sync Player -> Alice
    nodeAlice.receiveGossip(nodePlayer.generateGossipMessageFor("alice"));

    // Sync Alice -> Bob so Bob is aware of the proposal
    nodeBob.receiveGossip(nodeAlice.generateGossipMessageFor("bob"));

    // Verify Alice received the proposal
    expect(nodeAlice.localState.crossMeshBridgeProposals?.bridge_prop).toBeDefined();
    expect(nodeAlice.localState.crossMeshBridgeProposals?.bridge_prop?.amount).toBe(150);

    // 6. Bob (lender member) votes YES
    const bobVote = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "bridge_prop",
      syndicateId: "fangs",
      vote: true,
      timestamp: 2010,
    };
    nodeBob.executeLocalAction(bobVote as any);

    // 7. Alice (borrower member) votes YES
    const aliceVote = {
      type: "VOTE_CROSS_MESH_BRIDGE",
      proposalId: "bridge_prop",
      syndicateId: "claws",
      vote: true,
      timestamp: 2020,
    };
    nodeAlice.executeLocalAction(aliceVote as any);

    // Perform final sync to converge all nodes (bidirectional mesh sync)
    nodeAlice.receiveGossip(nodePlayer.generateGossipMessageFor("alice"));
    nodePlayer.receiveGossip(nodeAlice.generateGossipMessageFor("player"));

    nodeBob.receiveGossip(nodeAlice.generateGossipMessageFor("bob"));
    nodeAlice.receiveGossip(nodeBob.generateGossipMessageFor("alice"));

    nodeAlice.receiveGossip(nodePlayer.generateGossipMessageFor("alice"));
    nodePlayer.receiveGossip(nodeAlice.generateGossipMessageFor("player"));

    // Both Player, Alice, and Bob should now have resolved the proposal, performed gold transfers, and established the bridge loan!
    const statePlayer = nodePlayer.localState;
    const stateAlice = nodeAlice.localState;
    const stateBob = nodeBob.localState;

    expect(statePlayer.crossMeshBridgeProposals?.bridge_prop?.resolved).toBe(true);
    expect(stateAlice.crossMeshBridgeProposals?.bridge_prop?.resolved).toBe(true);
    expect(stateBob.crossMeshBridgeProposals?.bridge_prop?.resolved).toBe(true);

    expect(stateAlice.syndicates?.fangs?.warChest).toBe(350); // 500 - 150
    expect(stateBob.syndicates?.fangs?.warChest).toBe(350);

    expect(stateAlice.syndicates?.claws?.warChest).toBe(250); // 100 + 150
    expect(stateBob.syndicates?.claws?.warChest).toBe(250);

    const loanAlice = stateAlice.crossMeshBridgeLoans?.bridge_prop;
    const loanBob = stateBob.crossMeshBridgeLoans?.bridge_prop;

    expect(loanAlice).toBeDefined();
    expect(loanBob).toBeDefined();
    expect(loanAlice?.remainingRepayment).toBe(loanBob?.remainingRepayment);
    expect(loanAlice?.principal).toBe(150);
  });
});

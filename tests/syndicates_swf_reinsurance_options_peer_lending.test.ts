import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { GossipNode, mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Peer Lending & Pooling (AF-183)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_peer_lending_pack",
      title: "Cross-Mesh Reinsurance Options Peer Lending Test Pack",
      start_room: "clearing",
      vars_init: { gold: 100000, gold_alice: 50000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A sunny clearing.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support contributing to a cross-syndicate option volatility pool", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    const contributeAction = {
      type: "CONTRIBUTE_SWF_REINSURANCE_OPTION_CROSS_SYNDICATE_POOL",
      poolId: "pool_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      amount: 4000,
      timestamp: 1000,
    };

    const res = multiAgentStep(state, { agentId: "player", action: contributeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify war chest was deducted and pool was funded
    expect(state.syndicates?.alpha?.warChest).toBe(6000);
    const pool = state.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"];
    expect(pool).toBeDefined();
    expect(pool?.totalBalance).toBe(4000);
    expect(pool?.syndicateContributions?.alpha).toBe(4000);
  });

  it("should propose, vote, and establish a peer margin lending request from lender syndicate", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["alice", "bob"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 20000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Force a high-risk trigger: low headroom or pruned routes count or high volatility index
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 500, // low headroom
        prunedRoutesCount: 2,
        timestamp: 1000,
      },
    };

    const requestAction = {
      type: "REQUEST_SWF_REINSURANCE_OPTION_PEER_LENDING",
      requestId: "req_1",
      borrowerSyndicateId: "alpha",
      lenderSyndicateId: "beta",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      amount: 5000,
      interestRate: 10,
      termSteps: 10,
      timestamp: 1000,
    };

    // Borrower proposes the lending request
    let res = multiAgentStep(state, { agentId: "player", action: requestAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const request = state.swfReinsuranceOptionPeerLendingRequests?.["req_1"];
    expect(request).toBeDefined();
    expect(request?.status).toBe("Pending");

    // Alice (from Beta) votes YES
    const voteAction = {
      type: "VOTE_SWF_REINSURANCE_OPTION_PEER_LENDING",
      requestId: "req_1",
      syndicateId: "beta",
      vote: true,
      timestamp: 1010,
    };

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Bob (from Beta) votes YES to reach majority
    res = multiAgentStep(state, { agentId: "bob", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify request is now Active and funds were transferred
    const updatedRequest = state.swfReinsuranceOptionPeerLendingRequests?.["req_1"];
    expect(updatedRequest?.status).toBe("Active");
    expect(updatedRequest?.remainingRepayment).toBe(5500); // 5000 * 1.1

    expect(state.syndicates?.beta?.warChest).toBe(15000); // 20000 - 5000
    expect(state.marginAccounts?.alpha?.collateral).toBe(5500); // 500 + 5000
  });

  it("should support payback of the peer margin lending request", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 15000,
      },
    };

    state.swfReinsuranceOptionPeerLendingRequests = {
      req_1: {
        id: "req_1",
        borrowerSyndicateId: "alpha",
        lenderSyndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        amount: 5000,
        interestRate: 10,
        termSteps: 10,
        approved: true,
        resolved: true,
        startStep: 10,
        dueStep: 20,
        remainingRepayment: 5500,
        status: "Active",
        timestamp: 1000,
      },
    };

    const paybackAction = {
      type: "PAYBACK_SWF_REINSURANCE_OPTION_PEER_LENDING",
      requestId: "req_1",
      amount: 5500,
      timestamp: 1020,
    };

    const res = multiAgentStep(state, { agentId: "player", action: paybackAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const request = state.swfReinsuranceOptionPeerLendingRequests?.["req_1"];
    expect(request?.status).toBe("Repaid");
    expect(request?.remainingRepayment).toBe(0);

    expect(state.syndicates?.alpha?.warChest).toBe(4500); // 10000 - 5500
    expect(state.syndicates?.beta?.warChest).toBe(20500); // 15000 + 5500
  });

  it("should trigger defaults and decrement credit rating during economy ticks if unpaid", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.creditRatings = {
      alpha: 10,
    };

    state.swfReinsuranceOptionPeerLendingRequests = {
      req_1: {
        id: "req_1",
        borrowerSyndicateId: "alpha",
        lenderSyndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        amount: 5000,
        interestRate: 10,
        termSteps: 5,
        approved: true,
        resolved: true,
        startStep: 0,
        dueStep: 5,
        remainingRepayment: 5500,
        status: "Active",
        timestamp: 1000,
      },
    };

    // Advance state step to the dueStep (5)
    state.step = 5;

    // Run economy tick
    state = tickEconomy(state, mockPack);

    // Verify it is defaulted and credit rating is dropped
    const request = state.swfReinsuranceOptionPeerLendingRequests?.["req_1"];
    expect(request?.status).toBe("Defaulted");
    expect(state.creditRatings?.alpha).toBe(8); // 10 - 2
    expect(state.journal).toContainEqual(expect.stringContaining("[SWF Reinsurance Option Peer Lending Default]"));
  });

  it("should converge peer lending and pooling states across gossip mesh", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.connect(nodeB);

    nodeA.localState.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };
    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(nodeA.localState.swfYieldCDOs));

    // Alice executes CREATE_SYNDICATE locally on nodeA
    const createSyndicateAction = {
      type: "CREATE_SYNDICATE",
      id: "alpha",
      name: "Alpha Syndicate",
      members: ["alice"],
      timestamp: 1000,
    };
    const resCreate = nodeA.executeLocalAction(createSyndicateAction as any);
    expect(resCreate.ok).toBe(true);

    // Alice contributes gold to warChest
    const contributeWarChestAction = {
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "alpha",
      amount: 10000,
      timestamp: 1005,
    };
    const resWarChest = nodeA.executeLocalAction(contributeWarChestAction as any);
    expect(resWarChest.ok).toBe(true);

    const contributeAction = {
      type: "CONTRIBUTE_SWF_REINSURANCE_OPTION_CROSS_SYNDICATE_POOL",
      poolId: "pool_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      amount: 4000,
      timestamp: 1010,
    };

    // Execute contribution locally on nodeA
    const res = nodeA.executeLocalAction(contributeAction as any);
    expect(res.ok).toBe(true);

    // Verify node B has not heard from node A yet
    expect(nodeB.localState.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"]).toBeUndefined();

    // Alice gossips to Bob
    nodeA.gossip();

    // Verify convergence on node B
    expect(nodeB.localState.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"]).toBeDefined();
    expect(nodeB.localState.swfReinsuranceOptionCrossSyndicatePools?.["pool_1"]?.totalBalance).toBe(4000);
  });
});

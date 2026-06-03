import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { MeshNode, MeshNetwork } from "../src/core/network.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Cross-Mesh Safeguards & Pruning (AF-182)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_cross_mesh_safeguards_pack",
      title: "Cross-Mesh Reinsurance Options Safeguards Test Pack",
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
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should vote and reach majority consensus on Option Margin Policy with prunedRoutesRiskThreshold and protectivePoolAllocation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.2,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      liquidationThreshold: 0.1,
      penaltyRate: 0.15,
      prunedRoutesRiskThreshold: 2,
      protectivePoolAllocation: 250,
      timestamp: 1000,
    };

    // Vote 1 (Pending)
    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionMarginVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionMarginPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.prunedRoutesRiskThreshold).toBe(2);
    expect(policy?.protectivePoolAllocation).toBe(250);
    expect(state.adjustSWFReinsuranceOptionMarginVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should trigger margin top-up and position deleveraging when pruned routes threshold is met", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);
    const nodeC = new MeshNode("C", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    // Connect nodes in a triangle
    net.connectNodes("A", "B");
    net.connectNodes("A", "C");

    // Initialize syndicates
    const alphaSyndicate = {
      id: "alpha",
      name: "Alpha Syndicate",
      members: ["A", "B", "C"],
      definedBy: "A",
      timestamp: 1000,
      warChest: 1000,
    };

    nodeA.localState.syndicates = { alpha: { ...alphaSyndicate } };
    nodeB.localState.syndicates = { alpha: { ...alphaSyndicate } };
    nodeC.localState.syndicates = { alpha: { ...alphaSyndicate } };

    // Initialize CDO
    const cdo1 = {
      id: "cdo_1",
      creatorSyndicateId: "alpha",
      assets: [],
      totalValue: 5000,
      tranches: {
        senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
        mezzanine: {
          trancheId: "mezzanine" as const,
          yieldRate: 0.12,
          totalShares: 500,
          ownership: {},
          timestamp: 1000,
        },
        equity: { trancheId: "equity" as const, yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
      },
      timestamp: 1000,
    };

    nodeA.localState.swfYieldCDOs = { cdo_1: JSON.parse(JSON.stringify(cdo1)) };
    nodeB.localState.swfYieldCDOs = { cdo_1: JSON.parse(JSON.stringify(cdo1)) };
    nodeC.localState.swfYieldCDOs = { cdo_1: JSON.parse(JSON.stringify(cdo1)) };

    // Setup active margin policy specifying safety limits
    const marginPolicy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      liquidationThreshold: 0.1,
      penaltyRate: 0.15,
      autoDeleveragingThreshold: 0.3,
      marginDeflectionFactor: 0.5,
      prunedRoutesRiskThreshold: 2,
      protectivePoolAllocation: 250,
      timestamp: 1000,
    };

    nodeA.localState.swfReinsuranceOptionMarginPolicies = { cdo_1_senior: { ...marginPolicy } };
    nodeB.localState.swfReinsuranceOptionMarginPolicies = { cdo_1_senior: { ...marginPolicy } };
    nodeC.localState.swfReinsuranceOptionMarginPolicies = { cdo_1_senior: { ...marginPolicy } };

    // Setup active cross-mesh arbitrage policy so arbitrage routes are ticked
    const arbitragePolicy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      arbitrageSpreadThreshold: 5.0,
      maxArbitrageVolume: 100,
      timestamp: 1000,
    };

    nodeA.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: { ...arbitragePolicy } };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: { ...arbitragePolicy } };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: { ...arbitragePolicy } };

    // Setup routes
    const routeAB = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      enableRoutePruning: true,
      maxPruningLatencyMs: 100,
      timestamp: 1000,
    };

    const routeAC = {
      routeId: "route_A_C",
      sourceNodeId: "A",
      targetNodeId: "C",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      enableRoutePruning: true,
      maxPruningLatencyMs: 100,
      timestamp: 1000,
    };

    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = {
      route_A_B: { ...routeAB },
      route_A_C: { ...routeAC },
    };

    // Configure spreads
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 40 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 40 },
    };
    nodeC.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 40 },
    };

    // Setup active options contracts on node A's state (written options of alpha syndicate)
    nodeA.localState.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "alice_syndicate", // holder
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.05,
        size: 100,
        timestamp: 1000,
        active: true,
      },
    };

    // Setup margin account on node A's state
    nodeA.localState.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 1000,
        timestamp: 1000,
        prunedRoutesCount: 0,
      },
    };

    // Verify initial state
    expect(nodeA.localState.marginAccounts.alpha.prunedRoutesCount).toBe(0);
    expect(nodeA.localState.marginAccounts.alpha.collateral).toBe(1000);
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1000);

    // Make node B and node C high latency so routes will be pruned during arbitrage tick
    // InMeshNode lastHeartbeatLatency is used to fetch latency. Let's set it to 150ms for both connections
    nodeA.lastHeartbeatLatency.set("B", 150);
    nodeA.lastHeartbeatLatency.set("C", 150);

    // Tick the network. This should:
    // 1. Reconcile arbitrage routes, finding latency = 150ms > maxPruningLatencyMs = 100ms
    // 2. Prune both route_A_B and route_A_C
    // 3. Increment prunedRoutesCount to 2
    // 4. Trigger margin top-up because prunedRoutesCount (2) >= prunedRoutesRiskThreshold (2)
    // 5. Transfer 250 gold from warChest (1000 -> 750) to collateral (1000 -> 1250)
    net.tick(50);

    // Verify route pruning and top-up
    const marginAccount = nodeA.localState.marginAccounts?.alpha;
    expect(marginAccount).toBeDefined();
    expect(marginAccount?.prunedRoutesCount).toBe(2);
    expect(marginAccount?.collateral).toBe(1250);
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(750);

    // Verify journal logs on A
    expect(nodeA.localState.journal).toContainEqual(
      expect.stringContaining("[SWF Reinsurance Options Cross-Mesh Route Pruned]")
    );
    expect(nodeA.localState.journal).toContainEqual(
      expect.stringContaining(
        "[SWF Reinsurance Options Margin Top-up] Automatically topped up option margin collateral by 250 gold for Syndicate alpha from war chest"
      )
    );

    // Now, run economy ticks (tickEconomy) to verify position deleveraging
    // Because prunedRoutesCount = 2 >= threshold = 2, it should auto-delever
    // The option's size is 100, marginDeflectionFactor = 0.5.
    // So effective size becomes 50, and margin requirement is deflated by 50%.
    const stateWithEconomy = tickEconomy(nodeA.localState, mockPack);

    // Assert auto-deleveraging was logged to the journal
    expect(stateWithEconomy.journal).toContainEqual(
      expect.stringContaining(
        "[SWF Reinsurance Option Auto-Deleveraging] Syndicate alpha option on CDO cdo_1 tranche senior auto-deleveraged"
      )
    );
    expect(stateWithEconomy.journal).toContainEqual(
      expect.stringContaining("multiple route prunings (Pruned count: 2 >= Threshold: 2)")
    );
  });
});

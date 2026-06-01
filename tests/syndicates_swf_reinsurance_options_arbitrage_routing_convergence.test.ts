import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { MeshNode, MeshNetwork } from "../src/core/network.js";
import { GossipNode } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Cross-Mesh Arbitrage Routing & Spread Convergence (AF-176)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_cross_mesh_arbitrage_pack",
      title: "Cross-Mesh Reinsurance Options Arbitrage Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000, gold_A: 5000, gold_B: 5000 },
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
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should vote and reach majority consensus on Cross-Mesh Arbitrage Policy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 25000 },
      agentsInit: ["player", "alice", "bob"],
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
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 500,
      timestamp: 1000,
    };

    // Vote 1 (Pending)
    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionCrossMeshArbitragePolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionCrossMeshArbitrageVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionCrossMeshArbitragePolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.arbitrageSpreadThreshold).toBe(10.0);
    expect(policy?.maxArbitrageVolume).toBe(500);
    expect(state.adjustSWFReinsuranceOptionCrossMeshArbitrageVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should trigger automatic option arbitrage spread convergence and buy/sell transaction rewards upon price imbalance exceeding threshold", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.connectNodes("A", "B");

    // Initialize syndicates
    nodeA.localState.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["A", "B"],
        definedBy: "A",
        timestamp: 1000,
        warChest: 1000,
      },
    };
    nodeB.localState.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["A", "B"],
        definedBy: "A",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // Initialize CDO (use deep-cloned structures per node so no shared reference memory)
    nodeA.localState.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine" as const, yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity" as const, yieldRate: 0.20, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };
    nodeB.localState.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine" as const, yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity" as const, yieldRate: 0.20, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Set up active cross-mesh arbitrage policy
    const policyA = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1000,
    };
    const policyB = { ...policyA };
    
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = {
      cdo_1_senior: policyA,
    };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = {
      cdo_1_senior: policyB,
    };

    // Set up cross-mesh route in state (cloned per node)
    const routeA = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
    };
    const routeB = { ...routeA };

    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = {
      route_A_B: routeA,
    };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = {
      route_A_B: routeB,
    };

    // Configure different spreads on A and B (spread difference = 30 gold)
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 40 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Tick the network simulation
    net.tick(50);

    // Verify spreadDifference is calculated and updated in both state schemas
    const finalRouteA = nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B;
    expect(finalRouteA).toBeDefined();
    expect(finalRouteA?.spreadDifference).toBe(30);

    // Verify option spreads have converged to the mid spread (40 + 10) / 2 = 25 gold
    const spreadA = nodeA.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread;
    const spreadB = nodeB.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread;
    expect(spreadA).toBe(25);
    expect(spreadB).toBe(25);

    // Verify automatic options purchase/sale gold rewards distributed to the syndicate's war chest
    // Profit = min(floor((30 - 10) * 0.5), 100) = 10 gold.
    // Warchest increases from 1000 to 1010 on both nodes
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1010);
    expect(nodeB.localState.syndicates?.alpha?.warChest).toBe(1010);

    // Verify journal logs
    expect(nodeA.localState.journal).toContainEqual(expect.stringContaining("[SWF Reinsurance Option Cross-Mesh Arbitrage] Executed automatic options purchase/sale along route route_A_B"));
  });

  it("should converge policies and route spread convergence across connected nodes in network partitions and reconnection", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    
    // Nodes start disconnected (simulating a network partition)
    // Configure CDO & Syndicate on A

    nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "alpha",
      name: "Alpha Syndicate",
      members: ["A", "B"],
      timestamp: 1000,
    });

    nodeA.executeLocalAction({
      type: "CONTRIBUTE_WAR_CHEST",
      syndicateId: "alpha",
      amount: 1000,
      timestamp: 1010,
    });

    nodeA.localState.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine" as const, yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity" as const, yieldRate: 0.20, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(nodeA.localState.swfYieldCDOs));

    // Sync syndicate and CDO from A to B so B has them
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("B"));

    // A votes to adjust policy
    nodeA.executeLocalAction({
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      arbitrageSpreadThreshold: 5.0,
      maxArbitrageVolume: 100,
      timestamp: 2000,
    });

    // Spreads are set different on both sides of partition
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Route setup (cloned per node)
    const routeA = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
    };
    const routeB = { ...routeA };

    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: routeA };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: routeB };

    // Ticks do not converge because there is a partition (nodes not connected in MeshNetwork)
    net.tick(50);
    expect(nodeA.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread).toBe(50);
    expect(nodeB.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread).toBe(10);

    // Reconnection and consensus vote from B
    net.connectNodes("A", "B");
    
    nodeB.executeLocalAction({
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      arbitrageSpreadThreshold: 5.0,
      maxArbitrageVolume: 100,
      timestamp: 2010,
    });

    // Run manual bidirectional gossip sync to propagate the votes and merge states
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("A"));
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("B"));
    nodeA.receiveGossip(nodeB.generateGossipMessageFor("A"));
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("B"));

    // Run network tick to synchronize gossip state and convergence
    for (let i = 0; i < 5; i++) {
      net.tick(80);
    }

    // Spreads should now be converged to the mid value: (50 + 10) / 2 = 30

    const finalA = nodeA.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread;
    const finalB = nodeB.localState.swfReinsuranceOptionOrderBookDepths?.cdo_1_senior?.bidAskSpread;
    expect(finalA).toBe(30);
    expect(finalB).toBe(30);

    // Profit is min(floor((40 - 5) * 0.5), 100) = 17 gold.
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1017);
    expect(nodeB.localState.syndicates?.alpha?.warChest).toBe(1017);
  });
});

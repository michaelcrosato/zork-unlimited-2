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
      },
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
    expect(nodeA.localState.journal).toContainEqual(
      expect.stringContaining(
        "[SWF Reinsurance Option Cross-Mesh Arbitrage] Executed automatic options purchase/sale along route route_A_B"
      )
    );
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

  it("should vote on ADJUST_ARBITRAGE_FEE_SURCHARGE and halt/scale back arbitrage rebalancing based on latency and dynamic tolls", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.connectNodes("A", "B");

    // Initialize syndicates via transactions
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

    // Initialize CDO
    nodeA.localState.swfYieldCDOs = {
      cdo_1: {
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
      },
    };

    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(nodeA.localState.swfYieldCDOs));

    // Sync syndicate and CDO from A to B so B has them in its local state and journal
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("B"));

    // Set up active cross-mesh arbitrage policy via consensus transactions
    nodeA.executeLocalAction({
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1200,
    });
    nodeB.executeLocalAction({
      type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1200,
    });

    // Consensus vote on ADJUST_ARBITRAGE_FEE_SURCHARGE
    nodeA.executeLocalAction({
      type: "ADJUST_ARBITRAGE_FEE_SURCHARGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      maxLatencyHedgedOverhead: 120.0,
      timestamp: 1500,
    });

    nodeB.executeLocalAction({
      type: "ADJUST_ARBITRAGE_FEE_SURCHARGE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      maxLatencyHedgedOverhead: 120.0,
      timestamp: 1500,
    });

    nodeA.receiveGossip(nodeB.generateGossipMessageFor("A"));
    nodeB.receiveGossip(nodeA.generateGossipMessageFor("B"));

    const consensusPolicy = nodeA.localState.swfReinsuranceOptionArbitrageFeeSurchargePolicies?.cdo_1_senior;
    expect(consensusPolicy).toBeDefined();
    expect(consensusPolicy?.maxLatencyHedgedOverhead).toBe(120.0);

    // Route setup
    const routeA = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: routeA };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...routeA } };

    // Test Case 1: Low Latency, Profitable Arbitrage
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Run network ticks to propagate presence, calculate routing tables, and measure latency
    for (let i = 0; i < 5; i++) {
      net.tick(100);
    }

    nodeA.lastHeartbeatLatency.set("B", 100);

    // Run reconciliation (should be a no-op because spreads already converged during the tick)
    nodeA.reconcileCrossMeshOptionArbitrage();

    // Spread Difference = 40, Spread Threshold = 10, Base Profit = floor((40 - 10) * 0.5) = 15 gold
    // Tick used natural link latency (50ms). Toll = floor(50 * 0.1) = 5 gold. Adjusted Profit = 15 - 5 = 10 gold.
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1010);
    // Latency and toll are updated to the latest values set before reconcile (100ms and 10 gold)
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B?.linkStateLatencyMs).toBe(100);
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B?.dynamicTollRate).toBe(10);

    // Reset warChest and spreads for the next cases
    nodeA.localState.syndicates!.alpha!.warChest = 1000;
    nodeB.localState.syndicates!.alpha!.warChest = 1000;
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Test Case 2: High Latency Exceeding maxLatencyHedgedOverhead -> HALT rebalancing
    nodeA.lastHeartbeatLatency.set("B", 130); // 130ms > 120ms limit

    nodeA.reconcileCrossMeshOptionArbitrage();

    // Rebalancing should be halted, warChest remains 1000
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1000);
    expect(nodeA.localState.journal).toContainEqual(
      expect.stringContaining(
        "Arbitrage rebalancing halted along route route_A_B: Latency 260ms exceeds max allowed overhead of 120ms"
      )
    );

    // Test Case 3: Dynamic routing cost exceeds potential spread difference -> HALT rebalancing
    nodeA.lastHeartbeatLatency.set("B", 100); // 100ms (10 gold toll)
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 18 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    }; // Spread Difference = 8 gold, dynamic toll = 10 gold. Toll (10) >= Spread Difference (8)

    nodeA.reconcileCrossMeshOptionArbitrage();

    expect(nodeA.localState.syndicates?.alpha?.warChest).toBe(1000);
    expect(nodeA.localState.journal).toContainEqual(
      expect.stringContaining(
        "Arbitrage rebalancing halted along route route_A_B: Network routing costs (10 gold) exceed potential spread difference"
      )
    );
  });

  it("should dynamically apply route penalty weights and trigger automatic route repair or bypass degraded routes via pathfinder", () => {
    const net = new MeshNetwork();

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);
    const nodeC = new MeshNode("C", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    // Connect them in a triangle: A <-> B, A <-> C, C <-> B
    net.connectNodes("A", "B");
    net.connectNodes("A", "C");
    net.connectNodes("C", "B");

    // Initialize syndicates on all nodes
    const syndicateObj = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["A", "B", "C"],
        definedBy: "A",
        timestamp: 1000,
        warChest: 1000,
      },
    };
    nodeA.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeB.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeC.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));

    // Initialize CDO
    const cdoObj = {
      cdo_1: {
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
      },
    };
    nodeA.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeC.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));

    // Set up active cross-mesh arbitrage policy
    const policy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };

    // Surcharge policy
    const surchargePolicy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      maxLatencyHedgedOverhead: 120.0,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionArbitrageFeeSurchargePolicies = { cdo_1_senior: surchargePolicy };
    nodeB.localState.swfReinsuranceOptionArbitrageFeeSurchargePolicies = { cdo_1_senior: surchargePolicy };
    nodeC.localState.swfReinsuranceOptionArbitrageFeeSurchargePolicies = { cdo_1_senior: surchargePolicy };

    // Route setup
    const route = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: route };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };

    // Setup order books
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Run network ticks to propagate presence, calculate routing tables, and discover topology
    for (let i = 0; i < 5; i++) {
      net.tick(100);
    }

    // Low latency initially on direct link (50ms)
    nodeA.lastHeartbeatLatency.set("B", 50);

    // Reconcile once (should work fine)
    nodeA.reconcileCrossMeshOptionArbitrage();
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B?.routePenaltyMultiplier).toBe(1.0);
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B?.linkStateLatencyMs).toBe(50);

    // Let's reset spreads for testing degraded route
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };
    nodeA.localState.syndicates!.alpha!.warChest = 1000;
    nodeB.localState.syndicates!.alpha!.warChest = 1000;

    // Now, set high physical latency on link between A and B (110ms > 100ms)
    // This should trigger routePenaltyMultiplier = 2.0, so perceived latency = 220ms > 120ms (maxLatencyHedgedOverhead)
    nodeA.lastHeartbeatLatency.set("B", 110);

    // Reconcile - this should detect degradation, apply penalty, and trigger automatic route repair!
    nodeA.reconcileCrossMeshOptionArbitrage();

    // Verify routePenaltyMultiplier is reset to 1.0 on the route because the repaired route is healthy (100ms)
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B?.routePenaltyMultiplier).toBe(1.0);

    // Since the path was repaired, the direct link A -> B was pruned from A's topology!
    // Pathfinder should now route via C (A -> C -> B), which has hops = 2.
    // Since we don't have heartbeat latency for B via the multi-hop path, it defaults to hops * 50 = 100ms, which is healthy (< 120ms max)
    // The spreads should successfully converge and rewards are distributed!
    const finalRoute = nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B;
    expect(finalRoute?.linkStateLatencyMs).toBe(100); // 2 hops * 50 = 100ms
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBeGreaterThan(1000);
  });

  it("should successfully execute multi-path split options arbitrage routing under split path configurations", () => {
    const net = new MeshNetwork();
    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);
    const nodeC = new MeshNode("C", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    // Form topology: A - B, A - C, C - B
    nodeA.directNeighbors.add("B");
    nodeA.directNeighbors.add("C");
    nodeB.directNeighbors.add("A");
    nodeB.directNeighbors.add("C");
    nodeC.directNeighbors.add("A");
    nodeC.directNeighbors.add("B");

    // Initialize syndicates
    const syndicateObj = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["A", "B", "C"],
        definedBy: "A",
        timestamp: 1000,
        warChest: 1000,
      },
    };
    nodeA.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeB.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeC.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));

    // Initialize CDO
    const cdoObj = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };
    nodeA.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeC.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));

    // Set up cross-mesh arbitrage policy
    const policy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };

    // Set up active cross-mesh arbitrage route with pathSplitWeights
    // Path split weights: 60% on direct path (B) and 40% on alternative path (C)
    const route = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
      pathSplitWeights: {
        B: 0.6,
        C: 0.4,
      },
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: route };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };

    // Propagate presence and calculate routing tables
    for (let i = 0; i < 5; i++) {
      net.tick(100);
    }

    // Setup order books AFTER network has finished ticking/propagating
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // Set specific heartbeats and latency
    nodeA.lastHeartbeatLatency.set("B", 50);
    nodeA.lastHeartbeatLatency.set("C", 40);

    // Reconcile
    nodeA.reconcileCrossMeshOptionArbitrage();

    // Verification
    const finalRoute = nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B;
    expect(finalRoute).toBeDefined();
    expect(finalRoute?.spreadDifference).toBe(40);

    // Verify multi-path split log is added to journal
    const journals = nodeA.localState.journal || [];
    const hasSplitLog = journals.some((j) =>
      j.includes("Executed multi-path split options purchase/sale along route route_A_B")
    );
    expect(hasSplitLog).toBe(true);

    // Verify syndicate warchest grew
    expect(nodeA.localState.syndicates?.alpha?.warChest).toBeGreaterThan(1000);
  });

  it("should dynamically recalculate and adapt split weights based on relative inverse latency under network congestion", () => {
    const net = new MeshNetwork();
    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);
    const nodeC = new MeshNode("C", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    nodeA.directNeighbors.add("B");
    nodeA.directNeighbors.add("C");
    nodeB.directNeighbors.add("A");
    nodeB.directNeighbors.add("C");
    nodeC.directNeighbors.add("A");
    nodeC.directNeighbors.add("B");

    nodeA.announcePresence();
    nodeB.announcePresence();
    nodeC.announcePresence();

    // Initialize state

    const syndicateObj = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["A", "B", "C"],
        definedBy: "A",
        timestamp: 1000,
        warChest: 1000,
      },
    };
    nodeA.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeB.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));
    nodeC.localState.syndicates = JSON.parse(JSON.stringify(syndicateObj));

    // Initialize CDO
    const cdoObj = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior" as const, yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };
    nodeA.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeB.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));
    nodeC.localState.swfYieldCDOs = JSON.parse(JSON.stringify(cdoObj));

    // Set up cross-mesh arbitrage policy
    const policy = {
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      arbitrageSpreadThreshold: 10.0,
      maxArbitrageVolume: 100,
      timestamp: 1000,
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitragePolicies = { cdo_1_senior: policy };

    // Set up active cross-mesh arbitrage route with pathSplitWeights
    const route = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
      pathSplitWeights: {
        B: 0.5,
        C: 0.5,
      },
    };
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: route };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };

    // Propagate presence and calculate routing tables
    for (let i = 0; i < 5; i++) {
      net.tick(100);
    }

    // Now enable dynamic weight recalculation on node A
    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes.route_A_B.enableDynamicWeightRecalculation = true;

    // Setup order books AFTER network has finished ticking
    nodeA.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 50 },
    };
    nodeB.localState.swfReinsuranceOptionOrderBookDepths = {
      cdo_1_senior: { buyVolume: 10, sellVolume: 10, imbalance: 0, spreadAdjustment: 1.0, bidAskSpread: 10 },
    };

    // First Scenario:
    // B has low latency (50ms) and C uses default multihop (2 hops * 50 = 100ms)
    // Inverse B = 1/50 = 0.02, Inverse C = 1/100 = 0.01
    // Sum = 0.03. B weight = 0.02/0.03 = 0.667, C weight = 0.01/0.03 = 0.333
    nodeA.lastHeartbeatLatency.set("B", 50);

    // Reconcile
    nodeA.reconcileCrossMeshOptionArbitrage();

    const routeAfterFirst = nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B;
    expect(routeAfterFirst).toBeDefined();
    expect(routeAfterFirst?.pathSplitWeights).toBeDefined();
    expect(routeAfterFirst?.pathSplitWeights?.B).toBeCloseTo(0.667, 2);
    expect(routeAfterFirst?.pathSplitWeights?.C).toBeCloseTo(0.333, 2);
    expect(routeAfterFirst?.lastRecalculationStep).toBe(nodeA.localState.step);

    // Second Scenario: Heavy network congestion on B
    // Raise B's latency to 300ms, keep C at default 100ms
    // Since 300ms > 100ms, it incurs a 2.0x penalty multiplier, making the perceived latency 600ms.
    // Inverse B = 1/600 = 0.00167, Inverse C = 1/100 = 0.01
    // Sum = 0.01167. B weight = 0.00167 / 0.01167 = 0.143, C weight = 0.01 / 0.01167 = 0.857
    nodeA.localState.step = 43; // Advance step
    nodeA.lastHeartbeatLatency.set("B", 300);

    // Reconcile again
    nodeA.reconcileCrossMeshOptionArbitrage();

    const routeAfterSecond = nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B;
    expect(routeAfterSecond?.pathSplitWeights?.B).toBeCloseTo(0.143, 2);
    expect(routeAfterSecond?.pathSplitWeights?.C).toBeCloseTo(0.857, 2);
    expect(routeAfterSecond?.lastRecalculationStep).toBe(43);
  });

  it("should prune degraded options arbitrage routes dynamically when latency exceeds maxPruningLatencyMs (AF-181)", () => {
    const net = new MeshNetwork();
    net.topologyPruningThresholdMs = 10000;

    const nodeA = new MeshNode("A", mockPack, 42);
    const nodeB = new MeshNode("B", mockPack, 42);
    const nodeC = new MeshNode("C", mockPack, 42);

    net.registerNode(nodeA);
    net.registerNode(nodeB);
    net.registerNode(nodeC);

    nodeA.directNeighbors.add("B");
    nodeB.directNeighbors.add("A");
    nodeB.directNeighbors.add("C");
    nodeC.directNeighbors.add("B");

    nodeA.announcePresence();
    nodeB.announcePresence();
    nodeC.announcePresence();

    // Initialize state
    const baseState = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });

    baseState.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    baseState.swfYieldCDOs = {
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

    // Arbitrage policies
    baseState.swfReinsuranceOptionCrossMeshArbitragePolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        arbitrageSpreadThreshold: 5.0,
        maxArbitrageVolume: 100,
        timestamp: 1000,
      },
    };

    nodeA.localState = { ...baseState };
    nodeB.localState = { ...baseState };
    nodeC.localState = { ...baseState };

    // Setup a route with enableRoutePruning and maxPruningLatencyMs = 80ms
    const route = {
      routeId: "route_A_B",
      sourceNodeId: "A",
      targetNodeId: "B",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior" as const,
      spreadDifference: 0,
      timestamp: 1000,
      enableRoutePruning: true,
      maxPruningLatencyMs: 80,
    };

    nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: route };
    nodeB.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };
    nodeC.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes = { route_A_B: { ...route } };

    // Propagate presence and calculate routing tables
    for (let i = 0; i < 5; i++) {
      net.tick(100);
    }

    // Set a latency that is safe (e.g. 30ms)
    nodeA.lastHeartbeatLatency.set("B", 30);

    // Reconcile and check that the route is NOT pruned
    nodeA.reconcileCrossMeshOptionArbitrage();
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B).toBeDefined();

    // Now degrade/congest the link so latency becomes 90ms (> 80ms threshold)
    nodeA.lastHeartbeatLatency.set("B", 90);

    // Reconcile again
    nodeA.reconcileCrossMeshOptionArbitrage();

    // The route should be pruned (deleted) from node A's state!
    expect(nodeA.localState.swfReinsuranceOptionCrossMeshArbitrageRoutes?.route_A_B).toBeUndefined();

    // Verify journal logging of pruning
    const journal = nodeA.localState.journal || [];
    const pruningLog = journal.find((msg) => msg.includes("[SWF Reinsurance Options Cross-Mesh Route Pruned]"));
    expect(pruningLog).toBeDefined();
    expect(pruningLog).toContain("Pruned options arbitrage route route_A_B");
    expect(pruningLog).toContain("exceeding the threshold of 80ms");
  });
});

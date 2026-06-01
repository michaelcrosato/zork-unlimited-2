import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Multi-Tranche Yield CDO CDS Dynamic Leverage Optimization & Automated Liquidity Matching (AF-165)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_multi_tranche_arbitrage_pack",
      title: "SWF Multi-Tranche Arbitrage Test Pack",
      start_room: "market",
      vars_init: { gold: 5000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "The core commercial hub of the district.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support dynamic leverage factors, yield rebalancing multipliers, arbitrage liquidity allocation and profit distributions", () => {
    let state = createInitialState({
      seed: 54321,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "alice"],
    });

    // 1. Setup syndicates
    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corporation",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 2000,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corporation",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 3000,
      },
    };

    // 2. Setup SWF Yield CDO
    state.swfYieldCDOs = {
      swf_cdo_1: {
        id: "swf_cdo_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 1000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.05, totalShares: 500, ownership: { buyer_corp: 500 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 300, ownership: { buyer_corp: 300 }, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.25, totalShares: 200, ownership: { buyer_corp: 200 }, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // 3. Setup Faction Standing and Sponsor Policies
    state.factionRep = {
      rangers: 10, // 10 standing gives 1.0 + 10 * 0.05 = 1.5 reputationMultiplier!
    };
    
    state.factionSponsorPolicies = {
      writer_corp: {
        vault_1: {
          syndicateId: "writer_corp",
          vaultId: "vault_1",
          factionId: "rangers",
          rewardRate: 0.1,
          minLockTerms: 1,
          timestamp: 1000,
        },
      },
    };

    // 4. Setup Margin Account for the Writer
    state.marginAccounts = {
      writer_corp: {
        syndicateId: "writer_corp",
        collateral: 1500,
        swfCDSLiquidityMatchingEnabled: true,
        swfRehypothecationVaultId: "vault_1",
        swfTrancheLeverageTargets: {
          senior: 2.0,
          mezzanine: 1.2,
          equity: 1.0,
        },
        swfTrancheLeverageFactors: {
          senior: 1.5,
          mezzanine: 1.2,
          equity: 0.8,
        },
        swfLiquidityBuffer: 1000,
        timestamp: 1000,
      },
    };

    // 4. Propose SWF Yield CDO CDS buy vote from Buyer
    const cdsId = "swf_cds_multi_tranche_1";
    const buyAct = {
      type: "BUY_SWF_YIELD_CDO_CDS",
      cdsId: cdsId,
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      swfYieldCdoId: "swf_cdo_1",
      trancheId: "mezzanine",
      notionalValue: 500,
      premiumRate: 0.10,
      timestamp: 1001,
      marginEnabled: true,
    };

    let stepRes = multiAgentStep(state, { agentId: "player", action: buyAct as any }, mockPack);
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Check that vote is stored but not active yet
    expect(state.swfYieldCDOCDSVotes?.[cdsId]).toBeDefined();
    expect(state.swfYieldCDOCDSs?.[cdsId]).toBeUndefined();

    // 5. Run economy tick to trigger Automated SWF CDS Liquidity Matching & Arbitrage Allocation
    state = tickEconomy(state, mockPack);

    // Verify that it matched automatically!
    const cds = state.swfYieldCDOCDSs?.[cdsId];
    expect(cds).toBeDefined();
    expect(cds?.active).toBe(true);
    expect(cds?.writerSyndicateId).toBe("writer_corp");
    
    // Check that arbitrage liquidity was allocated during matching
    expect(cds?.arbitrageLiquidityAllocated).toBeGreaterThan(0);
    // Mezzanine notional is 500. Writer had swfLiquidityBuffer 1000, so it matches min(500, 1000) = 500.
    expect(cds?.arbitrageLiquidityAllocated).toBe(500);

    // Check that the writer's war chest was reduced by the allocated arbitrage liquidity
    // writer warChest was 3000. 3000 - 500 = 2500.
    expect(state.syndicates?.writer_corp.warChest).toBe(2500);

    // 6. Verify that the dynamic leverage factor and yield rebalancing multiplier are processed
    // writer reputation multiplier is 1.0 (no sponsor/faction standing).
    // Mezzanine target leverage is 1.5, leverage factor is 1.2.
    // Math.min(1.5, 1.0 * 1.2) = 1.2.
    expect(cds?.dynamicLeverageFactor).toBeCloseTo(1.2, 5);

    // Risk rating defaults to AA (risk factor 0.9) because collateralization ratio is 1.67.
    // Yield rebalancing multiplier = 0.9 * 1.2 = 1.08.
    expect(cds?.yieldRebalancingMultiplier).toBeCloseTo(1.08, 5);

    // 7. Verify premium payment and arbitrage profit in next economy tick
    const buyerInitialGold = state.syndicates?.buyer_corp.warChest ?? 0; // 2000
    const writerInitialGold = state.syndicates?.writer_corp.warChest ?? 0; // 2500

    state = tickEconomy(state, mockPack);

    // Expected premium = Math.max(1, Math.floor(500 * 0.10 * 1.08)) = Math.floor(54) = 54 gold.
    // Buyer pays 54. warChest becomes 2000 - 54 = 1946.
    expect(state.syndicates?.buyer_corp.warChest).toBe(buyerInitialGold - 54);

    // Writer receives 54 gold premium, plus earns arbitrage profit on allocated arbitrage liquidity!
    // Arbitrage Profit = Math.floor(500 * 0.05 * 1.5) = 37 gold.
    // Total writer gold change = +54 premium +37 profit = +91 gold.
    // warChest becomes 2500 + 91 = 2591.
    expect(state.syndicates?.writer_corp.warChest).toBe(writerInitialGold + 54 + 37);
  });
});

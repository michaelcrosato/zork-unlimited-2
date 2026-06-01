import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Bank CDO Credit Default Swaps (CDS) & Synthetic Leverage (AF-108)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_test_pack",
      title: "CDS Test Pack",
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

  it("should support buying and writing a CDS with double-consent activation", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
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

    // Setup CDO in state
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "buyer_corp",
        assets: [],
        totalValue: 300,
        tranches: {
          senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: 150, ownership: { buyer_corp: 150 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: 90, ownership: { buyer_corp: 90 }, timestamp: 1000 },
          equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: 60, ownership: { buyer_corp: 60 }, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // 1. Buy vote (buyer_corp representative)
    const buyAct = {
      type: "BUY_CREDIT_DEFAULT_SWAP",
      cdsId: "cds_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      cdoId: "cdo_test_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      timestamp: 1001,
    };

    let buyRes = multiAgentStep(state, { agentId: "player", action: buyAct as any }, mockPack);
    expect(buyRes.ok).toBe(true);
    expect(buyRes.state.creditDefaultSwaps?.cds_1).toBeUndefined(); // Pending (needs writer vote)

    // 2. Write vote (writer_corp representative)
    const writeAct = {
      type: "WRITE_CREDIT_DEFAULT_SWAP",
      cdsId: "cds_1",
      buyerSyndicateId: "buyer_corp",
      writerSyndicateId: "writer_corp",
      cdoId: "cdo_test_1",
      trancheId: "mezzanine",
      notionalValue: 100,
      premiumRate: 0.05,
      timestamp: 1002,
    };

    let writeRes = multiAgentStep(buyRes.state, { agentId: "alice", action: writeAct as any }, mockPack);
    expect(writeRes.ok).toBe(true);

    const activeCds = writeRes.state.creditDefaultSwaps?.cds_1;
    expect(activeCds).toBeDefined();
    expect(activeCds?.active).toBe(true);
    expect(activeCds?.buyerSyndicateId).toBe("buyer_corp");
    expect(activeCds?.writerSyndicateId).toBe("writer_corp");
    expect(activeCds?.notionalValue).toBe(100);
    expect(activeCds?.premiumRate).toBe(0.05);
  });

  it("should process periodic premium payment and deactive on insufficient funds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 10, // Only has 10 gold
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corp",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Active CDS with 100 notional, premium rate 0.05 => 5 premium per tick
    state.creditDefaultSwaps = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        cdoId: "cdo_test_1",
        trancheId: "mezzanine",
        notionalValue: 100,
        premiumRate: 0.05,
        timestamp: 1000,
        active: true,
      },
    };

    // Tick 1: has 10 gold, pays 5 premium successfully
    let tick1 = tickEconomy(state, mockPack);
    expect(tick1.syndicates?.buyer_corp?.warChest).toBe(5);
    expect(tick1.syndicates?.writer_corp?.warChest).toBe(1005);
    expect(tick1.creditDefaultSwaps?.cds_1?.active).toBe(true);

    // Tick 2: has 5 gold, pays 5 premium successfully
    let tick2 = tickEconomy(tick1, mockPack);
    expect(tick2.syndicates?.buyer_corp?.warChest).toBe(0);
    expect(tick2.syndicates?.writer_corp?.warChest).toBe(1010);
    expect(tick2.creditDefaultSwaps?.cds_1?.active).toBe(true);

    // Tick 3: has 0 gold, cannot pay 5 premium => terminates CDS!
    let tick3 = tickEconomy(tick2, mockPack);
    expect(tick3.syndicates?.buyer_corp?.warChest).toBe(0);
    expect(tick3.syndicates?.writer_corp?.warChest).toBe(1010); // remains unchanged
    expect(tick3.creditDefaultSwaps?.cds_1?.active).toBe(false);
  });

  it("should compensate the buyer upon CDO tranche write-down, reduce notional, and deactivate on full settlement", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      buyer_corp: {
        id: "buyer_corp",
        name: "Buyer Corp",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
      writer_corp: {
        id: "writer_corp",
        name: "Writer Corp",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
        warChest: 1000,
      },
    };

    // Packaged CDO with senior, mezzanine, equity
    state.cdos = {
      cdo_test_1: {
        id: "cdo_test_1",
        creatorSyndicateId: "buyer_corp",
        assets: [
          {
            type: "loan",
            syndicateId: "buyer_corp",
            assetId: "bob",
            value: 200,
            originalLoan: {
              agentId: "bob",
              amount: 200,
              collateralType: "safehouse",
              collateralId: "clearing",
              interestAccrued: 0,
              borrowStep: 1,
              dueStep: 10,
              timestamp: 1000,
            },
          },
        ],
        totalValue: 300,
        tranches: {
          senior: { trancheId: "senior", interestRate: 0.05, sweepRiskExposure: 0.1, totalValue: 150, ownership: { buyer_corp: 150 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", interestRate: 0.12, sweepRiskExposure: 0.4, totalValue: 90, ownership: { buyer_corp: 90 }, timestamp: 1000 },
          equity: { trancheId: "equity", interestRate: 0.25, sweepRiskExposure: 1.0, totalValue: 60, ownership: { buyer_corp: 60 }, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Active CDS protection on mezzanine tranche for 45 gold
    state.creditDefaultSwaps = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        cdoId: "cdo_test_1",
        trancheId: "mezzanine",
        notionalValue: 45, // 45 notional (exactly half of mezzanine value 90)
        premiumRate: 0.0,  // set to 0.0 to focus on default settlement only
        timestamp: 1000,
        active: true,
      },
    };

    // Trigger a default: bob fails to pay. Total loss = 200
    // Absorbed:
    // Equity (value 60) -> 0 (60 loss)
    // Mezzanine (value 90) -> 0 (90 loss)
    // Senior (value 150) -> 100 (50 loss)
    state.step = 15; // Past dueStep 10
    state.vars.gold_bob = 0; // bob has no gold

    let nextState = tickEconomy(state, mockPack);

    // Mezzanine tranche totalValue went from 90 to 0 (90 loss).
    // Our CDS notional is 45. Proportional payout should be:
    // payout = Math.round(90 * (45 / 90)) = 45.
    // The writer syndicate (writer_corp) must pay 45 gold to buyer_corp.
    expect(nextState.syndicates?.writer_corp?.warChest).toBe(955); // 1000 - 45
    expect(nextState.syndicates?.buyer_corp?.warChest).toBe(1055); // 1000 + 45 + 10 CDO yield payout

    // The CDS should be fully settled since payout (45) matched notionalValue (45)
    expect(nextState.creditDefaultSwaps?.cds_1?.notionalValue).toBe(0);
    expect(nextState.creditDefaultSwaps?.cds_1?.active).toBe(false);
  });

  it("should successfully converge states across Gossip merge", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
    });

    stateA.creditDefaultSwaps = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        cdoId: "cdo_test_1",
        trancheId: "mezzanine",
        notionalValue: 100,
        premiumRate: 0.05,
        timestamp: 1050,
        active: true,
      },
    };

    stateB.creditDefaultSwaps = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "buyer_corp",
        writerSyndicateId: "writer_corp",
        cdoId: "cdo_test_1",
        trancheId: "mezzanine",
        notionalValue: 100,
        premiumRate: 0.05,
        timestamp: 1100, // Newer write-wins
        active: false,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.creditDefaultSwaps?.cds_1?.active).toBe(false); // timestamp 1100 won
    expect(merged.creditDefaultSwaps?.cds_1?.timestamp).toBe(1100);
  });
});

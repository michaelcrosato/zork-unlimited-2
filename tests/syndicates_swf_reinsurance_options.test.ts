import { describe, it, expect } from "vitest";
import { createInitialState, getCDOTrancheReinsurancePremiumRate } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate SWF Reinsurance Options & Volatility-Hedged Premium Rate Hedges (AF-148)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_pack",
      title: "Reinsurance Options Test Pack",
      start_room: "clearing",
      vars_init: { gold: 10000 },
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
  it("should support proposing, voting, listing, bidding, executing, premium capping, manual exercise, and auto-settlement of reinsurance options", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 10000 },
      agentsInit: ["player", "alice", "bob", "carol"],
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
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

    // 2. Propose & vote to list reinsurance option for sale by Alpha members
    // Alpha acts as the seller/writer of the option
    const listAction = {
      type: "LIST_REINSURANCE_OPTION",
      listingId: "opt_list_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 500,
      askPrice: 150,
      timestamp: 1001,
    };

    // First vote: player (Alpha, 1/2 members, PENDING majority)
    let res = multiAgentStep(state, { agentId: "player", action: listAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionsListings?.["opt_list_1"]).toBeUndefined();

    // Second vote: alice (Alpha, 2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: listAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const listing = state.swfReinsuranceOptionsListings?.["opt_list_1"];
    expect(listing).toBeDefined();
    expect(listing?.status).toBe("Open");
    expect(listing?.sellerSyndicateId).toBe("alpha");
    expect(listing?.optionType).toBe("call");
    expect(listing?.strikePremiumRate).toBe(0.03);
    expect(listing?.size).toBe(500);
    expect(listing?.askPrice).toBe(150);

    // 3. Place a bid from Beta members (requires bob and carol)
    const bidAction = {
      type: "PLACE_REINSURANCE_OPTION_BID",
      listingId: "opt_list_1",
      syndicateId: "beta",
      bidAmount: 120,
      timestamp: 1002,
    };

    // First vote: bob (Beta, 1/2 members, PENDING)
    res = multiAgentStep(state, { agentId: "bob", action: bidAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionsListings?.["opt_list_1"]?.bids?.["beta"]).toBeUndefined();

    // Second vote: carol (Beta, 2/2 members, consensus reached)
    res = multiAgentStep(state, { agentId: "carol", action: bidAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionsListings?.["opt_list_1"]?.bids?.["beta"]?.bidAmount).toBe(120);

    // 4. Automated Market Maker Bid generation
    state = tickProductionLabs(state, []);
    const mmBid = state.swfReinsuranceOptionsListings?.["opt_list_1"]?.bids?.["market_maker"];
    expect(mmBid).toBeDefined();
    expect(mmBid?.bidderSyndicateId).toBe("market_maker");
    expect(mmBid?.bidAmount).toBeGreaterThan(0);

    // 5. Execute sale: Alpha accepts Beta's bid of 120
    const executeAction = {
      type: "EXECUTE_REINSURANCE_OPTION_SALE",
      listingId: "opt_list_1",
      syndicateId: "alpha",
      buyerSyndicateId: "beta",
      timestamp: 1003,
    };

    // First vote: player (Alpha, 1/2, PENDING)
    res = multiAgentStep(state, { agentId: "player", action: executeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionsListings?.["opt_list_1"]?.status).toBe("Open");

    // Second vote: alice (Alpha, 2/2, consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: executeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check completed listing
    expect(state.swfReinsuranceOptionsListings?.["opt_list_1"]?.status).toBe("Completed");

    // Check gold transferred
    // Alpha warChest = 5000 + 120 = 5120
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5120);
    // Beta warChest = 3000 - 120 = 2880
    expect(state.syndicates?.["beta"]?.warChest).toBe(2880);

    // Check option contract created
    const optContract = state.swfReinsuranceOptionsContracts?.["opt_1"];
    expect(optContract).toBeDefined();
    expect(optContract?.active).toBe(true);
    expect(optContract?.syndicateId).toBe("beta"); // buyer
    expect(optContract?.writerSyndicateId).toBe("alpha"); // writer
    expect(optContract?.strikePremiumRate).toBe(0.03);
    expect(optContract?.optionType).toBe("call");

    // 6. Test premium fee adjustment capping in economy tick
    // Establish active reinsurance policy for Beta
    state.swfYieldCDOTrancheReinsurancePolicies = {
      policy_1: {
        id: "policy_1",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        coverageAmount: 10000,
        premiumRate: 0.05, // spot is high
        timestamp: 1004,
        active: true,
      },
    };

    // Initialize high volatility index to spike spot premium rate
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 80.0,
        timestamp: 1004,
      },
    };

    // Spot rate is indeed above 0.03 strike premium rate
    const spotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    expect(spotRate).toBeGreaterThan(0.03);

    // Dynamic premium tick: Beta has active call option with strike rate 0.03.
    // Premium paid should be capped at strike rate 0.03: Math.floor(10000 * 0.03) = 300
    // Expected Beta warChest: 2880 - 300 = 2580
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.syndicates?.["beta"]?.warChest).toBe(2580);

    // 7. Manual Option Exercise
    // Spot rate is high (around 0.05+). Strike is 0.03.
    // Let's manually exercise the option!
    const exerciseAction = {
      type: "EXERCISE_REINSURANCE_OPTION",
      contractId: "opt_1",
      syndicateId: "beta",
      timestamp: 1004,
    };

    // First vote: bob (Beta, 1/2, PENDING)
    res = multiAgentStep(state, { agentId: "bob", action: exerciseAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(true);

    // Second vote: carol (Beta, 2/2, consensus reached)
    res = multiAgentStep(state, { agentId: "carol", action: exerciseAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check option contract is now deactivated
    expect(state.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);

    // Gold checks
    const finalSpotRate = getCDOTrancheReinsurancePremiumRate(state, "cdo_1", "senior");
    const payout = Math.floor((finalSpotRate - 0.03) * 500 * 100);
    // Alpha paid the payout (deducted from Alpha warChest), Beta received payout.
    // Since we ran tickEconomy before, let's verify warChests
    // Alpha was at 5120. Beta was at 2580 (from tickedState, wait! In "state", we didn't run tickEconomy permanently,
    // "state" was before tickEconomy, so Beta warChest in "state" was 2880, Alpha was 5120).
    // Let's verify final values:
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5120 - payout);
    expect(state.syndicates?.["beta"]?.warChest).toBe(2880 + payout);

    // 8. Auto-settlement on epoch boundary multiple of 5
    // Let's reactivate opt_1 and set step to 1005 (multiple of 5)
    state.swfReinsuranceOptionsContracts!["opt_1"].active = true;
    state.step = 1005;

    // Trigger auto-settlement tick
    const autoSettledState = tickEconomy(state, mockPack);
    expect(autoSettledState.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);
    expect(autoSettledState.journal?.some((j) => j.includes("[SWF Reinsurance Option Settled]"))).toBe(true);
  });
});

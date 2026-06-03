import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { step } from "../src/core/engine.js";

describe("Syndicate SWF Sovereignty Bond Sponsorship & Cooperative Yield Redistribution (AF-138)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "coop_bond_pack",
      title: "Cooperative Sovereignty Bond Test Pack",
      start_room: "market",
      vars_init: { gold: 5000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "east",
            to: "forest",
            conditions: [],
          }
        ],
      },
      {
        id: "forest",
        name: "Dark Forest",
        description: "An overgrown, spooky forest.",
        objects: [],
        npcs: [],
        exits: [],
        faction: "rangers", // Faction controls this room
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing, voting, funding, ticking, and tax exemptions for cooperative sovereign bonds", () => {
    let state = createInitialState({
      seed: 54321,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    // 1. Establish two syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    // Initialize margin accounts with SWF staked faction gold
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 2000,
        swfLiquidityBuffer: 2000,
        swfStakedFactions: { rangers: 1500 },
        timestamp: 1000,
      },
      beta: {
        syndicateId: "beta",
        collateral: 2000,
        swfLiquidityBuffer: 2000,
        swfStakedFactions: { rangers: 1000 },
        timestamp: 1000,
      },
    };

    state.territoryControl = { forest: "rangers" };
    state.taxPolicy = { rangers: 50 };

    state.factionReservePools = { rangers: 10000 };

    // 2. Propose a cooperative sovereign bond sponsorship
    const proposalAction = {
      type: "PROPOSE_COOPERATIVE_SOVEREIGN_BOND",
      proposalId: "coop_bond_1",
      syndicateId: "alpha",
      factionId: "rangers",
      faceValue: 2000,
      interestRate: 15, // 15% dividend yield
      termEpochs: 2,
      timestamp: 1002,
    };

    // Must fail if proposed by non-member of alpha
    let failProp = multiAgentStep(state, { agentId: "bob", action: proposalAction as any }, mockPack);
    expect(failProp.ok).toBe(false);
    expect(failProp.rejectionReason).toContain("member");

    // Propose successfully by player (member of alpha)
    let propRes = multiAgentStep(state, { agentId: "player", action: proposalAction as any }, mockPack);
    expect(propRes.ok).toBe(true);
    state = propRes.state;

    const prop = state.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(prop).toBeDefined();
    expect(prop?.status).toBe("Proposed");
    expect(prop?.approved).toBe(false); // only 1 of 2 alpha members voted FOR so far

    // 3. Vote to approve
    const voteAction = {
      type: "APPROVE_COOPERATIVE_SOVEREIGN_BOND",
      proposalId: "coop_bond_1",
      syndicateId: "alpha",
      vote: true,
      timestamp: 1003,
    };

    // Vote FOR by alice (achieving majority 2/2 in alpha)
    let voteRes = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;
    expect(state.cooperativeSovereigntyBondProposals?.["coop_bond_1"]?.approved).toBe(true);

    // 4. Fund the bond
    // Syndicate Beta tries to fund 1200 gold but only has 1000 staked rangers gold - must fail
    const fundActionBetaFail = {
      type: "FUND_COOPERATIVE_SOVEREIGN_BOND",
      proposalId: "coop_bond_1",
      syndicateId: "beta",
      amount: 1200,
      timestamp: 1004,
    };
    let failFundRes = multiAgentStep(state, { agentId: "bob", action: fundActionBetaFail as any }, mockPack);
    expect(failFundRes.ok).toBe(false);
    expect(failFundRes.rejectionReason).toContain("insufficient");

    // Syndicate Alpha funds 1200 gold (out of 1500 staked)
    const fundActionAlpha = {
      type: "FUND_COOPERATIVE_SOVEREIGN_BOND",
      proposalId: "coop_bond_1",
      syndicateId: "alpha",
      amount: 1200,
      timestamp: 1005,
    };
    let fundAlphaRes = multiAgentStep(state, { agentId: "player", action: fundActionAlpha as any }, mockPack);
    expect(fundAlphaRes.ok).toBe(true);
    state = fundAlphaRes.state;

    // Syndicate Beta funds remaining 800 gold (out of 1000 staked)
    const fundActionBeta = {
      type: "FUND_COOPERATIVE_SOVEREIGN_BOND",
      proposalId: "coop_bond_1",
      syndicateId: "beta",
      amount: 800,
      timestamp: 1006,
    };
    let fundBetaRes = multiAgentStep(state, { agentId: "bob", action: fundActionBeta as any }, mockPack);
    expect(fundBetaRes.ok).toBe(true);
    state = fundBetaRes.state;

    // Check that it automatically reconciled and resolved to "Active" since it's approved and fully funded
    const activeBond = state.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(activeBond?.status).toBe("Active");
    expect(activeBond?.resolved).toBe(true);
    expect(activeBond?.contributions["alpha"]).toBe(1200);
    expect(activeBond?.contributions["beta"]).toBe(800);

    // Check that staked gold was deducted from margin accounts
    expect(state.marginAccounts?.["alpha"].swfStakedFactions?.["rangers"]).toBe(300); // 1500 - 1200
    expect(state.marginAccounts?.["beta"].swfStakedFactions?.["rangers"]).toBe(200); // 1000 - 800

    // Check that faction reserve pool increased by 2000 faceValue (10000 + 2000 = 12000)
    expect(state.factionReservePools?.["rangers"]).toBe(12000);

    // 5. Test Faction Travel Tax Exemption (Alpha ratio: 60%, Beta ratio: 40%)
    // Base travel tax in standard rules when moving east is 100 gold
    // Wait, let's verify what the travel tax calculation results in.
    // Syndicate Alpha member has 60% discount -> 100 * 0.4 = 40 tax.
    // Let's perform a step moving player (Alpha) east.
    // player has 5000 gold initially.
    let moveAlphaRes = step(state, { type: "MOVE", direction: "east" }, mockPack, "player");
    expect(moveAlphaRes.ok).toBe(true);
    // Since player moves to forest, travel tax is calculated and deducted.
    // Let's assert that the gold is deducted with the correct discount!
    // Base tax is 100. Alpha has 60% exemption. Tax paid should be 40 gold.
    expect(moveAlphaRes.state.vars.gold).toBe(4960); // 5000 - 40

    // The move step automatically triggered the first tick!
    // Alpha should receive 60% of (2000 * 15%) = 300 * 0.6 = 180 gold.
    // Beta should receive 40% of (2000 * 15%) = 300 * 0.4 = 120 gold.
    // Issuing faction pool: 12000 - 300 = 11700 gold.
    expect(moveAlphaRes.state.syndicates?.["alpha"].warChest).toBe(1180);
    expect(moveAlphaRes.state.syndicates?.["beta"].warChest).toBe(1120);
    expect(moveAlphaRes.state.factionReservePools?.["rangers"]).toBe(11700);

    const bondTick1 = moveAlphaRes.state.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(bondTick1?.remainingEpochs).toBe(1);
    expect(bondTick1?.status).toBe("Active");

    // 6. Tick final epoch manually to test Maturation principal payout
    // Total final payout: dividend (300) + faceValue (2000) = 2300.
    // Alpha receives 60% of 2300 = 1380 gold. Total alpha war chest: 1180 + 1380 = 2560 gold.
    // Beta receives 40% of 2300 = 920 gold. Total beta war chest: 1120 + 920 = 2040 gold.
    // Faction pool: 11700 - 2300 = 9400.
    let tick2 = tickProductionLabs(moveAlphaRes.state, []);
    expect(tick2.syndicates?.["alpha"].warChest).toBe(2560);
    expect(tick2.syndicates?.["beta"].warChest).toBe(2040);
    expect(tick2.factionReservePools?.["rangers"]).toBe(9400);

    const bondTick2 = tick2.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(bondTick2?.remainingEpochs).toBe(0);
    expect(bondTick2?.status).toBe("Matured");
  });

  it("should default if faction reserve pool has insufficient reserves", () => {
    let state = createInitialState({
      seed: 54321,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cooperativeSovereigntyBondProposals = {
      coop_bond_1: {
        id: "coop_bond_1",
        creatorSyndicateId: "alpha",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 15,
        termEpochs: 2,
        remainingEpochs: 2,
        status: "Active",
        contributions: { alpha: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // Set faction reserve pool to only 100 gold
    state.factionReservePools = { rangers: 100 };

    // Tick economy - total dividend required is 300 gold, which exceeds pool (100) -> default!
    let tickRes = tickProductionLabs(state, []);
    expect(tickRes.cooperativeSovereigntyBondProposals?.["coop_bond_1"].status).toBe("Defaulted");
    expect(tickRes.factionReservePools?.["rangers"]).toBe(0);
    expect(tickRes.syndicates?.["alpha"].warChest).toBe(1100); // gets the remaining 100 gold in the pool
  });
});

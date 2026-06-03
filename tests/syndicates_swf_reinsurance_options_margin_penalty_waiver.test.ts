import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Margin Penalty Waiver Consensus Arbitration (AF-188)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_margin_penalty_waiver_pack",
      title: "Reinsurance Options Margin Penalty Waiver Test Pack",
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
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should propose, dispute, authorize, and dynamically waive option liquidation penalties upon margin call liquidation", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
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
        warChest: 4000,
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

    // Initialize margin accounts
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 300,
        leveragedTranchePositions: {},
        timestamp: 1000,
      },
    };

    // Set up active option contract: Alpha is writer
    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 800,
        timestamp: 1000,
        active: true,
      },
    };

    // Set up option margin policy: 25% penalty rate
    state.swfReinsuranceOptionMarginPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.90,
        penaltyRate: 0.25,
        timestamp: 1000,
      },
    };

    // Initialize normal volatility index
    state.yieldVolatilityIndexes = {
      bond_1: {
        bondId: "bond_1",
        volatility: 15.0,
        timestamp: 1000,
      },
    };

    // 1. Propose SWF Penalty Waiver
    const proposeAction = {
      type: "PROPOSE_SWF_PENALTY_WAIVER",
      proposalId: "waiver_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      waivePenalty: true,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const proposal = state.swfReinsuranceOptionPenaltyWaiverProposals?.["waiver_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed"); // 1 vote out of 2 total is not a strict majority (> 1)

    // 2. Dispute SWF Penalty Waiver
    const disputeAction = {
      type: "DISPUTE_SWF_PENALTY_WAIVER",
      proposalId: "waiver_1",
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "alice", action: disputeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionPenaltyWaiverProposals?.["waiver_1"]?.status).toBe("disputed");

    // 3. Authorize SWF Penalty Waiver
    const authorizeAction = {
      type: "AUTHORIZE_SWF_PENALTY_WAIVER",
      proposalId: "waiver_1",
      vote: true,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "alice", action: authorizeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionPenaltyWaiverProposals?.["waiver_1"]?.status).toBe("authorized"); // 2 authorize votes out of 2 total is a majority

    // 4. Trigger margin call liquidation
    // Collateral (300) is below maintenance requirement, margin call triggers.
    // Since there is no grace period, it liquidates immediately.
    // The penalty waiver is authorized, so penalty should be 0!
    state.step = 110;
    const ticked = tickEconomy(state, mockPack);

    // Option contract should be deactivated
    expect(ticked.swfReinsuranceOptionsContracts?.["opt_1"]?.active).toBe(false);

    // Final collateral (Alpha margin account) should be 0 because excess collateral (300) is returned to warChest
    const marginAccount = ticked.marginAccounts?.["alpha"];
    expect(marginAccount?.collateral).toBe(0);

    // Alpha syndicate warChest should increase by returned excess collateral (5000 + 300 = 5300)
    const alphaSyndicate = ticked.syndicates?.["alpha"];
    expect(alphaSyndicate?.warChest).toBe(5300);

    // Holder syndicate warChest should remain 4000 (no penalty gold paid!)
    const holderSyndicate = ticked.syndicates?.["beta"];
    expect(holderSyndicate?.warChest).toBe(4000);

    // Narration contains WAIVED log
    expect(ticked.journal?.some(j => j.includes("Penalty WAIVED due to authorized penalty waiver"))).toBe(true);
  });
});

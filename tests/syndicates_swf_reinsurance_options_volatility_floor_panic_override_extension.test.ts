import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override Extension Voting (AF-195)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_extension_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Extension Test Pack",
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

  it("should support proposing, voting, and authorizing panic override extensions, extending the original cooldownEndStep", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice", "bob"],
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
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Initialize an authorized panic override ending at step 15
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_1: {
        proposalId: "override_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
        cooldownEndStep: 15,
      },
    };

    // 1. Propose extension
    const proposeAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION",
      proposalId: "ext_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_1",
      extensionDuration: 10,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check extension proposal registered with "proposed" status
    let extProposal = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals?.["ext_1"];
    expect(extProposal).toBeDefined();
    expect(extProposal?.status).toBe("proposed");
    expect(extProposal?.extensionDuration).toBe(10);
    expect(extProposal?.targetProposalId).toBe("override_1");

    // Proposer vote is auto-registered
    expect(state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes?.["ext_1"]?.["player"]).toBeDefined();

    // 2. Bob votes to authorize (not majority yet: 2 of 3)
    const voteActionBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION",
      proposalId: "ext_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    extProposal = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals?.["ext_1"];
    expect(extProposal?.status).toBe("authorized");

    // Check that target proposal's cooldownEndStep was extended from 15 to 25!
    let target = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(target?.cooldownEndStep).toBe(25);
  });

  it("should reject proposing extensions for non-existent or unauthorized targets", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
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

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // 1. Propose extension for non-existent target
    const proposeActionInvalid = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION",
      proposalId: "ext_invalid",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "non_existent_override",
      extensionDuration: 5,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeActionInvalid as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not exist");

    // Initialize an unauthorized (proposed) target override
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
      override_proposed: {
        proposalId: "override_proposed",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        panicOverrideActive: true,
        cooldownDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // 2. Propose extension for proposed (unauthorized) target
    const proposeActionProposed = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION",
      proposalId: "ext_proposed",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_proposed",
      extensionDuration: 5,
      timestamp: 1001,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeActionProposed as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("is not authorized");
  });

  it("should support state synchronization of panic override extensions and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals = {
      ext_1: {
        proposalId: "ext_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        extensionDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes = {
      ext_1: {
        player: {
          proposalId: "ext_1",
          vote: true,
          timestamp: 1000,
        },
      },
    };

    let stateB = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals = {
      ext_1: {
        proposalId: "ext_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        extensionDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes = {
      ext_1: {
        alice: {
          proposalId: "ext_1",
          vote: true,
          timestamp: 1005,
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionProposals?.["ext_1"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes?.["ext_1"]?.["player"]).toBeDefined();
    expect(merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionVotes?.["ext_1"]?.["alice"]).toBeDefined();
  });
});

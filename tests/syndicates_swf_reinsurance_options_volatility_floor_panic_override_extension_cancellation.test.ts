import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override Extension Cancellation Voting (AF-196)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_extension_cancellation_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Extension Cancellation Test Pack",
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

  it("should support proposing, voting, and authorizing panic override extension cancellations, clearing the target cooldownEndStep", () => {
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
            yieldRate: 0.1,
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

    // Initialize an authorized panic override ending at step 25
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
        cooldownEndStep: 25,
      },
    };

    // 1. Propose extension cancellation
    const proposeAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_1",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check cancellation proposal registered with "proposed" status
    let cancelProposal =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelProposal).toBeDefined();
    expect(cancelProposal?.status).toBe("proposed");
    expect(cancelProposal?.targetProposalId).toBe("override_1");

    // Proposer vote is auto-registered
    expect(
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes?.["cancel_1"]?.["player"]
    ).toBeDefined();

    // 2. Bob votes to authorize (majority reached: 2 of 3)
    const voteActionBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_1",
      vote: true,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    cancelProposal = state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelProposal?.status).toBe("authorized");

    // Check that target proposal's cooldownEndStep was cleared!
    let target = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(target?.cooldownEndStep).toBeUndefined();
  });

  it("should reject proposing cancellation for non-existent or unauthorized targets", () => {
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
            yieldRate: 0.1,
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

    // 1. Propose cancellation for non-existent target
    const proposeActionInvalid = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_invalid",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "non_existent_override",
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

    // 2. Propose cancellation for proposed (unauthorized) target
    const proposeActionProposed = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_proposed",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_proposed",
      timestamp: 1001,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeActionProposed as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("is not authorized");
  });

  it("should support state synchronization of panic override extension cancellations and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = {
      cancel_1: {
        proposalId: "cancel_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes = {
      cancel_1: {
        player: {
          proposalId: "cancel_1",
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

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = {
      cancel_1: {
        proposalId: "cancel_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes = {
      cancel_1: {
        alice: {
          proposalId: "cancel_1",
          vote: true,
          timestamp: 1005,
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"]
    ).toBeDefined();
    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes?.["cancel_1"]?.["player"]
    ).toBeDefined();
    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationVotes?.["cancel_1"]?.["alice"]
    ).toBeDefined();
  });
});

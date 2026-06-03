import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Voting (AF-197)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_panic_override_extension_cancellation_grace_pack",
      title: "Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Test Pack",
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

  it("should support proposing, voting, and authorizing early cancellation grace periods, delaying early termination", () => {
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
        cooldownDuration: 15,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
        cooldownEndStep: 25,
      },
    };

    // 1. Propose early cancellation cancel_1
    const proposeCancelAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "override_1",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeCancelAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Propose early cancellation grace period grace_1 targeting cancel_1
    const proposeGraceAction = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
      proposalId: "grace_1",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "cancel_1",
      graceDuration: 3,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeGraceAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    let graceProp =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals?.["grace_1"];
    expect(graceProp).toBeDefined();
    expect(graceProp?.status).toBe("proposed");
    expect(graceProp?.graceDuration).toBe(3);

    // 3. Bob votes to authorize the grace proposal grace_1 (majority reached)
    const voteGraceBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
      proposalId: "grace_1",
      vote: true,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteGraceBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals?.["grace_1"]?.status
    ).toBe("authorized");

    // 4. Bob votes to authorize the cancellation proposal cancel_1
    const voteCancelBob = {
      type: "VOTE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
      proposalId: "cancel_1",
      vote: true,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteCancelBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Cancellation authorized, and since grace duration of 3 was authorized, cooldownEndStep is scheduled to step + 3 (which was calculated when step was 3, so 3+3=6. Since step is now 4, it is 6)
    const cancelProp =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelProp?.status).toBe("authorized");
    expect(cancelProp?.remainingGraceSteps).toBe(3);

    let targetOverride = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(targetOverride?.cooldownEndStep).toBe(6);

    // 5. Test ticking inside the economy step
    expect(targetOverride?.cooldownEndStep).toBe(6);

    // Economy Tick 1
    state = tickEconomy(state, mockPack);
    let cancelPropTick1 =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelPropTick1?.remainingGraceSteps).toBe(2);
    let targetOverrideTick1 = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(targetOverrideTick1?.cooldownEndStep).toBe(6); // step + remaining = 4 + 2 = 6

    // Economy Tick 2
    state = tickEconomy(state, mockPack);
    let cancelPropTick2 =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelPropTick2?.remainingGraceSteps).toBe(1);
    let targetOverrideTick2 = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(targetOverrideTick2?.cooldownEndStep).toBe(5); // step + remaining = 4 + 1 = 5

    // Economy Tick 3 - Grace Period ends, cooldownEndStep cleared
    state = tickEconomy(state, mockPack);
    let cancelPropTick3 =
      state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals?.["cancel_1"];
    expect(cancelPropTick3?.remainingGraceSteps).toBe(0);
    let targetOverrideTick3 = state.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.["override_1"];
    expect(targetOverrideTick3?.cooldownEndStep).toBeUndefined(); // Cooldown ends, override terminated early!
  });

  it("should reject proposing grace periods for non-existent cancellations or invalid params", () => {
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

    // Propose grace for non-existent cancellation
    const proposeGraceActionInvalid = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
      proposalId: "grace_invalid",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "non_existent_cancel",
      graceDuration: 3,
      timestamp: 1002,
    };

    let res = multiAgentStep(state, { agentId: "player", action: proposeGraceActionInvalid as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not exist");

    // Propose grace with negative duration
    // First setup the target cancellation so we don't fail on that
    state.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = {
      cancel_existent: {
        proposalId: "cancel_existent",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "override_1",
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    const proposeGraceActionNegative = {
      type: "PROPOSE_VOLATILITY_FLOOR_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
      proposalId: "grace_negative",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      targetProposalId: "cancel_existent",
      graceDuration: -5,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "player", action: proposeGraceActionNegative as any }, mockPack);
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("grace duration");
  });

  it("should support state synchronization of cancellation grace proposals and votes in the gossip mesh", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: {},
      agentsInit: ["player", "alice"],
    });

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals = {
      grace_1: {
        proposalId: "grace_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        graceDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateA.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes = {
      grace_1: {
        player: {
          proposalId: "grace_1",
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

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals = {
      grace_1: {
        proposalId: "grace_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        targetProposalId: "cancel_1",
        graceDuration: 5,
        status: "proposed",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    stateB.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes = {
      grace_1: {
        alice: {
          proposalId: "grace_1",
          vote: true,
          timestamp: 1005,
        },
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals?.["grace_1"]
    ).toBeDefined();
    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes?.["grace_1"]?.["player"]
    ).toBeDefined();
    expect(
      merged.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceVotes?.["grace_1"]?.["alice"]
    ).toBeDefined();
  });
});

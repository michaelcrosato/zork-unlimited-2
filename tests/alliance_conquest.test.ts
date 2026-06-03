import { describe, it, expect } from "vitest";
import { createInitialState, reconcileAlliances } from "../src/core/state.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack } from "../src/parser/schema.js";
import { computeStateHash } from "../src/core/hash.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("AF-33: Dynamic Decentralized Alliance-Based Cooperative Defense and Conquest", () => {
  const mockPack: ParserPack = {
    meta: {
      id: "alliance_conquest_pack",
      title: "Alliance Conquest Adventure",
      start_room: "clearing",
      vars_init: {},
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Protectors of the green woods.",
        initial_rep: 10,
      },
      {
        id: "merchant_union",
        name: "Merchant Union",
        description: "Guild of traders.",
        initial_rep: 15,
      },
      {
        id: "shadow_guild",
        name: "Shadow Guild",
        description: "Secret syndicate.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Sunlit Clearing",
        description: "A lovely open space.",
        objects: [],
        npcs: [],
        exits: [],
      },
      {
        id: "outpost",
        name: "Fortified Outpost",
        description: "A key checkpoint.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
    win_conditions: [],
    endings: [],
    network_templates: {
      alliance_battle: "[ALLIANCE BATTLE] {roomId} has been captured by the allied forces of {newFaction}! (Defended by: {oldFaction})",
    },
  };

  it("should validate ASSIST_CONQUEST action requirements", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // 1. Factions are not allied yet. Bob tries to assist Rangers on behalf of Merchant Union
    const resFail1 = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "ASSIST_CONQUEST",
        roomId: "clearing",
        factionId: "rangers",
        assistingFactionId: "merchant_union",
        timestamp: 100,
      } as any,
    }, mockPack);
    expect(resFail1.ok).toBe(false);
    expect(resFail1.rejectionReason).toContain("is not allied with");

    // 2. Propose Rangers <-> Merchant Union alliance
    state.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "allied", timestamp: 100 },
      },
    };
    state = reconcileAlliances(state, mockPack);

    // 3. Now assist should be valid!
    const resOk = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "ASSIST_CONQUEST",
        roomId: "clearing",
        factionId: "rangers",
        assistingFactionId: "merchant_union",
        timestamp: 120,
      } as any,
    }, mockPack);
    expect(resOk.ok).toBe(true);
    expect(resOk.state.territoryAssists?.["clearing"]?.["rangers"]).toContain("bob");
  });

  it("should enforce conquest timestamp penalties and assistants bonuses", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // Establish Rangers <-> Merchant Union alliance
    state.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "allied", timestamp: 100 },
      },
    };
    state = reconcileAlliances(state, mockPack);

    // 1. Rangers (alice) claim outpost at t=100
    const claimRes = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "CLAIM_TERRITORY",
        roomId: "outpost",
        factionId: "rangers",
        timestamp: 100,
      } as any,
    }, mockPack);
    expect(claimRes.ok).toBe(true);
    state = claimRes.state;
    expect(state.territoryClaims?.["outpost"]?.factionId).toBe("rangers");
    expect(state.territoryClaims?.["outpost"]?.allianceDefense).toBe(1);

    // 2. Bob assists Rangers (alliance defense) at t=120
    const assistRes = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "ASSIST_CONQUEST",
        roomId: "outpost",
        factionId: "rangers",
        assistingFactionId: "merchant_union",
        timestamp: 120,
      } as any,
    }, mockPack);
    expect(assistRes.ok).toBe(true);
    state = assistRes.state;
    // Defense strength should now be 2 (1 base + 1 assistant)
    expect(state.territoryClaims?.["outpost"]?.allianceDefense).toBe(2);
    expect(state.territoryClaims?.["outpost"]?.assistants).toContain("bob");

    // 3. Shadow Guild (charlie) tries to conquer outpost at t=1050
    // With 2 defense points, defense penalty = (2 - 1) * 1000 = 1000ms.
    // Attacker effectiveTimestamp = 1050 - 1000 = 50ms.
    // 50ms <= defender's 100ms claim => conquest should fail!
    const conquerFail = multiAgentStep(state, {
      agentId: "charlie",
      action: {
        type: "CLAIM_TERRITORY",
        roomId: "outpost",
        factionId: "shadow_guild",
        timestamp: 1050,
      } as any,
    }, mockPack);
    expect(conquerFail.ok).toBe(false);
    expect(conquerFail.rejectionReason).toContain("stronger defense/timestamp");

    // 4. Shadow Guild (charlie) tries to conquer outpost at t=1150
    // Attacker effectiveTimestamp = 1150 - 1000 = 150ms.
    // 150ms > defender's 100ms claim => conquest should succeed!
    const conquerOk = multiAgentStep(state, {
      agentId: "charlie",
      action: {
        type: "CLAIM_TERRITORY",
        roomId: "outpost",
        factionId: "shadow_guild",
        timestamp: 1150,
      } as any,
    }, mockPack);
    expect(conquerOk.ok).toBe(true);
    expect(conquerOk.state.territoryClaims?.["outpost"]?.factionId).toBe("shadow_guild");
  });

  it("should synchronize assists and trigger alliance battle alerts during gossip convergence", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);
    nodeA.connect(nodeB);

    // Make rangers and merchant_union allied
    nodeA.executeLocalAction({
      type: "PROPOSE_ALLIANCE",
      factionA: "rangers",
      factionB: "merchant_union",
      timestamp: 100,
    } as any);

    // Sync the alliance proposal so Bob's node knows they are allied
    nodeA.gossip();
    nodeB.gossip();
    nodeA.gossip();

    // Alice claims outpost for rangers
    nodeA.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "outpost",
      factionId: "rangers",
      timestamp: 100,
    } as any);

    // Bob assists rangers
    nodeB.executeLocalAction({
      type: "ASSIST_CONQUEST",
      roomId: "outpost",
      factionId: "rangers",
      assistingFactionId: "merchant_union",
      timestamp: 200,
    } as any);

    // Sync gossip
    nodeA.gossip();
    nodeB.gossip();
    nodeA.gossip();

    // Verify converged assists and defense strength
    expect(nodeA.localState.territoryClaims?.["outpost"]?.allianceDefense).toBe(2);
    expect(nodeA.localState.territoryClaims?.["outpost"]?.assistants).toContain("bob");
    expect(nodeB.localState.territoryClaims?.["outpost"]?.allianceDefense).toBe(2);

    // Node A also has shadow guild node charlie assisting shadow guild
    const nodeC = new GossipNode("charlie", mockPack, 42);
    nodeA.connect(nodeC);
    nodeB.connect(nodeC);

    // Charlie claims outpost for shadow_guild with a high timestamp
    nodeC.executeLocalAction({
      type: "CLAIM_TERRITORY",
      roomId: "outpost",
      factionId: "shadow_guild",
      timestamp: 5000,
    } as any);

    // Gossip to propagate charlie's claim
    nodeC.gossip();
    nodeA.gossip();
    nodeB.gossip();
    nodeC.gossip();
    nodeA.gossip();

    // Verify both nodes have converged on the conquest
    expect(nodeA.localState.territoryClaims?.["outpost"]?.factionId).toBe("shadow_guild");
    expect(nodeB.localState.territoryClaims?.["outpost"]?.factionId).toBe("shadow_guild");

    // The shift in control from rangers (which was defended by bob) to shadow_guild
    // is detected as an ALLIANCE BATTLE!
    const journalStr = JSON.stringify(nodeA.localState.journal);
    expect(journalStr).toContain("[ALLIANCE BATTLE] outpost has been captured by the allied forces of shadow_guild! (Defended by: rangers)");
  });
});

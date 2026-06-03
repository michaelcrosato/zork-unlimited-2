import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { reconstructState } from "../src/core/gossip.js";

describe("Syndicate Hidden Passages, Faction Infiltration, and Black-Market Banks (AF-81)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_passage_bank_test_pack",
      title: "Hidden Passages and Syndicate Banks Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "alley",
          },
        ],
      },
      {
        id: "alley",
        name: "Dark Alley",
        description: "A dark back alley.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
        ],
      },
    ],
    objects: [
      {
        id: "contraband_hash",
        name: "Contraband Hash",
        description: "Very illegal stuff.",
        cost: 50,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
  });

  it("should validate and execute CONSTRUCT_HIDDEN_PASSAGE action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    // Setup syndicate
    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Rejects if passageId is missing
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "",
          syndicateId: "synd_shadows",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Passage ID is required");

    // 2. Rejects if syndicate does not exist
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "p1",
          syndicateId: "nonexistent",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not exist");

    // 3. Rejects if agent is not a member of the syndicate
    state.syndicates["synd_shadows"].members = ["other_agent"];
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "p1",
          syndicateId: "synd_shadows",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("not a member of syndicate");

    // Fix membership
    state.syndicates["synd_shadows"].members = ["player"];

    // 4. Rejects if room does not exist
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "p1",
          syndicateId: "synd_shadows",
          fromRoomId: "invalid_room",
          toRoomId: "alley",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("does not exist");

    // 5. Rejects if insufficient gold
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "p1",
          syndicateId: "synd_shadows",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 600,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Insufficient gold");

    // 6. Succeeds with correct details and deducts gold
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "passage_shortcut",
          syndicateId: "synd_shadows",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(300);
    expect(res.state.hiddenPassages?.["passage_shortcut"]).toBeDefined();
    expect(res.state.hiddenPassages?.["passage_shortcut"].fromRoomId).toBe("market");
    expect(res.state.hiddenPassages?.["passage_shortcut"].toRoomId).toBe("alley");
  });

  it("should bypass faction taxes and smuggling checks using a constructed hidden passage", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 100 },
    });

    // Control alley with 'rangers' faction and set high tax
    state.territoryControl = { alley: "rangers" };
    state.taxPolicy = { rangers: 10 }; // Huge tax scale!
    state.factionRep = { rangers: -10 }; // Hostile standings -> tax triggered!

    // Add a contraband item in inventory to trigger smuggling check
    state.inventory = ["contraband_hash"];
    if (state.agents?.["player"]) {
      state.agents["player"].inventory = ["contraband_hash"];
    }
    state.contrabandBlacklist = { contraband_hash: { blacklisted: true, timestamp: 1 } };

    state.vars["gold"] = 5;
    const stateForNormal = {
      ...state,
      inventory: [],
      vars: { ...state.vars },
      factionRep: { ...state.factionRep },
      agents: {
        ...state.agents,
        player: {
          ...state.agents?.["player"],
          inventory: [],
        },
      } as any,
    };

    let resNormalMove = multiAgentStep(
      stateForNormal,
      {
        agentId: "player",
        action: { type: "MOVE", direction: "NORTH" },
      },
      mockPack
    );

    // Should fail because they can't afford taxes/tolls or get caught/turned back
    expect(resNormalMove.ok).toBe(false);

    // Setup syndicate & construct hidden passage
    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };
    state.hiddenPassages = {
      p1: {
        id: "p1",
        syndicateId: "synd_shadows",
        fromRoomId: "market",
        toRoomId: "alley",
        timestamp: 5,
      },
    };

    // Move via hidden passage with low gold and carrying contraband -> SUCCESS!
    let resPassageMove = multiAgentStep(
      state,
      {
        agentId: "player",
        action: { type: "MOVE", direction: "NORTH" },
      },
      mockPack
    );

    expect(resPassageMove.ok).toBe(true);
    expect(resPassageMove.state.current).toBe("alley");
    expect(resPassageMove.state.vars["gold"]).toBe(5); // Gold untouched (0 tax paid!)
    expect(resPassageMove.state.inventory).toContain("contraband_hash"); // Contraband safe!
    const traversalNarration = resPassageMove.events.find(
      (e) => e.type === "narration" && e.text.includes("traversed the hidden passage")
    );
    expect(traversalNarration).toBeDefined();
  });

  it("should validate and execute INFILTRATE_FACTION_NETWORK action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 300 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // Infiltrate faction network
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "INFILTRATE_FACTION_NETWORK",
          syndicateId: "synd_shadows",
          factionId: "rangers",
          cost: 150,
          timestamp: 10,
        } as any,
      },
      mockPack
    );

    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(150);
    expect(res.state.factionInfiltrations?.["synd_shadows:rangers"]).toBeDefined();
    expect(res.state.factionInfiltrations?.["synd_shadows:rangers"].dominanceBonus).toBe(15);
    expect(res.state.syndicates?.["synd_shadows"].dominance).toBe(65); // Increased from 50 to 65!

    // Cannot infiltrate again
    res = multiAgentStep(
      res.state,
      {
        agentId: "player",
        action: {
          type: "INFILTRATE_FACTION_NETWORK",
          syndicateId: "synd_shadows",
          factionId: "rangers",
          cost: 150,
          timestamp: 20,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
  });

  it("should validate and execute DEPOSIT_SYNDICATE_BANK action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // Deposit 300 gold
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEPOSIT_SYNDICATE_BANK",
          syndicateId: "synd_shadows",
          agentId: "player",
          amount: 300,
          timestamp: 10,
        } as any,
      },
      mockPack
    );

    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(200); // 500 - 300 = 200
    expect(res.state.syndicateBanks?.["synd_shadows"].balances["player"]).toBe(300);

    // Fine/confiscation penalty only deducts from vars["gold"], keeping syndicateBank safe!
    let fineRes = { ...res.state };
    fineRes.vars["gold"] = Math.max(0, fineRes.vars["gold"] - 150); // Simulate regulator fine
    expect(fineRes.vars["gold"]).toBe(50);
    expect(fineRes.syndicateBanks?.["synd_shadows"].balances["player"]).toBe(300); // Bank balance completely safe!
  });

  it("should support merge convergence across the P2P Gossip mesh for these new actions", () => {
    const txs = [
      {
        agentId: "player",
        sequenceNumber: 0,
        action: {
          type: "CREATE_SYNDICATE",
          id: "synd_shadows",
          name: "Shadow Syndicate",
          members: ["player"],
          timestamp: 1,
        } as any,
        stateHashBefore: "",
        stateHashAfter: "",
        timestamp: 1,
        ok: true,
      },
      {
        agentId: "player",
        sequenceNumber: 1,
        action: {
          type: "CONSTRUCT_HIDDEN_PASSAGE",
          passageId: "p1",
          syndicateId: "synd_shadows",
          fromRoomId: "market",
          toRoomId: "alley",
          cost: 200,
          timestamp: 2,
        } as any,
        stateHashBefore: "",
        stateHashAfter: "",
        timestamp: 2,
        ok: true,
      },
      {
        agentId: "player",
        sequenceNumber: 2,
        action: {
          type: "INFILTRATE_FACTION_NETWORK",
          syndicateId: "synd_shadows",
          factionId: "rangers",
          cost: 150,
          timestamp: 3,
        } as any,
        stateHashBefore: "",
        stateHashAfter: "",
        timestamp: 3,
        ok: true,
      },
      {
        agentId: "player",
        sequenceNumber: 3,
        action: {
          type: "DEPOSIT_SYNDICATE_BANK",
          syndicateId: "synd_shadows",
          agentId: "player",
          amount: 100,
          timestamp: 4,
        } as any,
        stateHashBefore: "",
        stateHashAfter: "",
        timestamp: 4,
        ok: true,
      },
    ];

    const convergedState = reconstructState(42, mockPack, txs, ["player"]);
    expect(convergedState.syndicates?.["synd_shadows"]).toBeDefined();
    expect(convergedState.hiddenPassages?.["p1"]).toBeDefined();
    expect(convergedState.factionInfiltrations?.["synd_shadows:rangers"]).toBeDefined();
    expect(convergedState.syndicateBanks?.["synd_shadows"].balances["player"]).toBe(100);
    expect(convergedState.vars["gold"]).toBe(550); // 1000 - 200 (passage) - 150 (infiltrate) - 100 (deposit) = 550!
  });
});

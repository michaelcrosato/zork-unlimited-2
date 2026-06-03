import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step, tickSmugglingConvoys } from "../src/core/engine.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { applyEffect } from "../src/core/effects.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { calculateTradePrice, checkReputationTrade, calculateConvoyInsurancePremium } from "../src/core/economy.js";
import { GameEvent } from "../src/core/events.js";

describe("Task-F20: Advanced Faction Alliances, War Declarations, and Sector Control", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "alliances_test_pack",
      title: "Alliances and Sector Control Test Pack",
      start_room: "clearing",
      vars_init: { gold: 100, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A simple clearing.",
        exits: [
          {
            direction: "north",
            to: "outpost_room",
          },
        ],
      },
      {
        id: "outpost_room",
        name: "Outpost Room",
        description: "The outpost room.",
        exits: [
          {
            direction: "south",
            to: "clearing",
          },
        ],
      },
    ],
    objects: [],
    npcs: [],
    win_conditions: [],
    endings: [],
  });

  it("should evaluate faction_war_active and territory_controlled_by conditions correctly", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // 1. faction_war_active
    expect(evaluateCondition(state, { faction_war_active: { faction_a: "rangers", faction_b: "shadow" } })).toBe(false);

    state.factionWars = {
      rangers: { shadow: true },
      shadow: { rangers: true },
    };
    expect(evaluateCondition(state, { faction_war_active: { faction_a: "rangers", faction_b: "shadow" } })).toBe(true);
    expect(evaluateCondition(state, { faction_war_active: { faction_a: "shadow", faction_b: "rangers" } })).toBe(true);

    // 2. territory_controlled_by
    expect(
      evaluateCondition(state, { territory_controlled_by: { room_id: "outpost_room", faction_id: "rangers" } })
    ).toBe(false);

    state.territoryControl = {
      outpost_room: "rangers",
    };
    expect(
      evaluateCondition(state, { territory_controlled_by: { room_id: "outpost_room", faction_id: "rangers" } })
    ).toBe(true);
    expect(
      evaluateCondition(state, { territory_controlled_by: { room_id: "outpost_room", faction_id: "shadow" } })
    ).toBe(false);
  });

  it("should apply declare_alliance, declare_war, and claim_territory effects correctly", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    // 1. Apply declare_alliance
    let res = applyEffect(state, {
      declare_alliance: {
        faction_a: "rangers",
        faction_b: "shadow",
        relationship: "allied",
      },
    });
    expect(res.state.alliances?.["rangers"]?.["shadow"]).toBe("allied");
    expect(res.state.alliances?.["shadow"]?.["rangers"]).toBe("allied");
    expect(res.state.journal).toContain("[Diplomacy] Alliance between rangers and shadow set to allied.");

    // 2. Apply declare_war
    let res2 = applyEffect(state, {
      declare_war: {
        faction_a: "rangers",
        faction_b: "shadow",
        war: true,
      },
    });
    expect(res2.state.factionWars?.["rangers"]?.["shadow"]).toBe(true);
    expect(res2.state.alliances?.["rangers"]?.["shadow"]).toBe("hostile");
    expect(res2.state.journal).toContain("[War] War declared between rangers and shadow!");

    // 3. Apply claim_territory
    let res3 = applyEffect(state, {
      claim_territory: {
        room_id: "outpost_room",
        faction_id: "shadow",
      },
    });
    expect(res3.state.territoryControl?.["outpost_room"]).toBe("shadow");
    expect(res3.state.journal).toContain("[Sector Control] Room outpost_room has been claimed by faction shadow.");
  });

  it("should trigger reputation degradation, alliance shifts, and war declarations when defeating an outpost guard", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100, hp: 20, max_hp: 20 },
      factionRepInit: { rangers: -20 },
    });

    state.guildPrestige = {
      "player-shadow": 100, // Player is aligned with shadow guild (prestige >= 50)
    };

    state.turfGuardOutposts = {
      outpost_room: {
        roomId: "outpost_room",
        syndicateId: "rangers",
        securityLevel: 1,
        timestamp: 100,
        disabled: false,
      },
    };

    // 1. Move to outpost room to spawn guard and start combat
    let stepRes = step(state, { type: "MOVE", direction: "north" }, mockPack);
    state = stepRes.state;
    const guardId = "outpost_guard_outpost_room";
    expect(state.flags[`in_combat_with_${guardId}`]).toBe(true);

    // Set guard HP to 1 so they are defeated in one attack
    state.vars[`npc_hp_${guardId}`] = 1;

    // 2. Perform fight to defeat the guard
    stepRes = step(state, { type: "FIGHT" }, mockPack);
    state = stepRes.state;

    // Verify combat has ended and guard is dead/defeated
    expect(state.flags[`in_combat_with_${guardId}`]).toBe(false);
    expect(state.flags[`npc_defeated_${guardId}`]).toBe(true);
    expect(state.turfGuardOutposts?.["outpost_room"]?.disabled).toBe(true);

    // Verify reputation was degraded
    expect(state.factionRep?.["rangers"]).toBe(-50);

    // Verify that war was declared between rangers (outpost owner) and shadow (player's guild)
    expect(state.factionWars?.["rangers"]?.["shadow"]).toBe(true);
    expect(state.factionWars?.["shadow"]?.["rangers"]).toBe(true);

    // Verify that their alliance relationship became hostile
    expect(state.alliances?.["rangers"]?.["shadow"]).toBe("hostile");
    expect(state.alliances?.["shadow"]?.["rangers"]).toBe("hostile");

    // Check journal entries
    expect(state.journal).toContain(
      "[Reputation] Your reputation with rangers decreased by 30 to -50 due to outpost attack."
    );
    expect(state.journal).toContain(
      "[War] War declared between rangers and shadow due to outpost attack in room outpost_room!"
    );
  });
});

describe("Task-F21: Faction-based Trade Routes, Embargoes, and Commercial Warfare", () => {
  it("should enforce commercial embargoes on rival factions unless bypassed by smuggling", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.guildPrestige = {
      "player-shadow": 100,
    };

    state.factionWars = {
      rangers: { shadow: true },
      shadow: { rangers: true },
    };
    state.alliances = {
      rangers: { shadow: "hostile" },
      shadow: { rangers: "hostile" },
    };

    const rangersNpc = {
      id: "ranger_merchant",
      faction: "rangers",
    };

    const check1 = checkReputationTrade(state, rangersNpc);
    expect(check1.allowed).toBe(false);
    expect(check1.reason).toContain("commercial embargoes");

    state.vars["smuggling"] = 10;
    state.inventory = ["smuggled_spice"];
    const mockPackObj = {
      npcs: [{ id: "ranger_merchant", name: "Ranger Merchant", faction: "rangers" }],
      objects: [{ id: "smuggled_spice", cost: 100, contraband: true }],
    };

    const res = applyEffect(
      state,
      {
        npc_trade: {
          npc_id: "ranger_merchant",
          action: "stock",
        },
      },
      mockPackObj as any
    );

    expect(res.state.journal).toContain(
      "Successfully smuggled trade past the cartel embargo with merchant Ranger Merchant."
    );
  });

  it("should enforce dynamic trade tariffs on rival factions", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.current = "outpost_room";
    state.territoryControl = {
      outpost_room: "rangers",
    };

    state.merchantLicensings = {
      rangers: {
        factionId: "rangers",
        licenseCost: 50,
        tariffRate: 10,
        definedBy: "system",
        timestamp: 0,
      },
    };

    const rangersNpc = {
      id: "ranger_merchant",
      faction: "rangers",
    };

    const itemObj = {
      id: "iron_sword",
    };

    let priceNeutral = calculateTradePrice(state, rangersNpc, itemObj, 100, true);
    expect(priceNeutral).toBe(110);

    state.guildPrestige = {
      "player-shadow": 100,
    };
    state.factionWars = {
      rangers: { shadow: true },
      shadow: { rangers: true },
    };
    state.alliances = {
      rangers: { shadow: "hostile" },
      shadow: { rangers: "hostile" },
    };

    let priceRival = calculateTradePrice(state, rangersNpc, itemObj, 100, true);
    expect(priceRival).toBe(135);
  });

  it("should apply commercial warfare rules to trade routes passing through rival territories", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
    });

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "shadow",
        rooms: ["clearing", "outpost_room"],
        definedBy: "player",
        taxShare: 10,
        timestamp: 0,
      },
    };

    state.territoryControl = {
      outpost_room: "rangers",
    };

    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow",
        routeId: "route_1",
        cargo: 5,
        definedBy: "player",
        currentRoomIndex: 0,
        status: "en_route",
        timestamp: 0,
      },
    };

    const premiumBefore = calculateConvoyInsurancePremium(state, "convoy_1");

    state.factionWars = {
      rangers: { shadow: true },
      shadow: { rangers: true },
    };
    state.alliances = {
      rangers: { shadow: "hostile" },
      shadow: { rangers: "hostile" },
    };

    const premiumAfter = calculateConvoyInsurancePremium(state, "convoy_1");
    expect(premiumAfter).toBeGreaterThan(premiumBefore);

    const events: GameEvent[] = [];
    const tickedState = tickSmugglingConvoys(state, events);

    const journalEntry = tickedState.journal.find((log) => log.includes("paid") && log.includes("tolls"));
    expect(journalEntry).toBeDefined();
  });
});

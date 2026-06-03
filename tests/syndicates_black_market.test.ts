import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Syndicate Black Markets & Dynamic Tariffs (AF-49)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_black_market_test_pack",
      title: "Black Market Test Pack",
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
        faction: "rangers",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "safehouse_room",
          },
        ],
      },
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure sanctuary.",
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
        id: "contraband_spice",
        name: "Spice",
        description: "A pinch of illegal spice.",
        cost: 100,
        takeable: true,
        contraband: true,
      },
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "A simple shield.",
        cost: 50,
        takeable: true,
      },
    ],
    npcs: [],
  });

  it("should sell contraband to syndicate black market in safehouse successfully", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Set up safehouse in the room
    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    state.inventory = ["contraband_spice", "wooden_shield"];

    // 1. Unsuccessful: Reject non-contraband items
    const nonContrabandRes = step(
      state,
      {
        type: "SELL_BLACK_MARKET",
        itemId: "wooden_shield",
        roomId: "safehouse_room",
        timestamp: 1005,
      } as any,
      mockPack
    );
    expect(nonContrabandRes.ok).toBe(false);
    expect(nonContrabandRes.rejectionReason).toContain("Only contraband items");

    // 2. Unsuccessful: Reject if agent is not member of the owning syndicate
    const nonMemberState = { ...state };
    const badAgentRes = step(
      nonMemberState,
      {
        type: "SELL_BLACK_MARKET",
        itemId: "contraband_spice",
        roomId: "safehouse_room",
        timestamp: 1005,
      } as any,
      mockPack,
      "bob"
    );
    expect(badAgentRes.ok).toBe(false);
    expect(badAgentRes.rejectionReason).toContain("Unauthorized to trade");

    // 3. Successful: Sell contraband to black market
    const sellRes = step(
      state,
      {
        type: "SELL_BLACK_MARKET",
        itemId: "contraband_spice",
        roomId: "safehouse_room",
        timestamp: 1005,
      } as any,
      mockPack
    );
    expect(sellRes.ok).toBe(true);

    // Contraband base cost is 100.
    // Inside safehouse:
    // Faction control tariff/modifier is bypassed.
    // 20% strategic sell premium is applied along with 20% contraband premium (100 * 1.20 * 1.20 = 144).
    expect(sellRes.state.vars["gold"]).toBe(244); // 100 + 144
    expect(sellRes.state.inventory).not.toContain("contraband_spice");
    expect(sellRes.state.blackMarkets?.["safehouse_room"]).toBeDefined();
    expect(sellRes.state.blackMarkets?.["safehouse_room"].inventory).toContain("contraband_spice");
  });

  it("should bypass regional tolls and tariffs when trading in a safehouse room", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Place a 30% tariff on the rangers faction territory
    state.territoryControl = { safehouse_room: "rangers" };
    state.tariffPolicy = { rangers: 30 };
    state.factionRep = { rangers: -20 }; // Very poor rep, normally heavy tariff / penalties apply!

    // Setup safehouse
    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    const itemObj = mockPack.objects.find(o => o.id === "contraband_spice");
    const mockNpc = { id: "player" };

    // With safehouse bypass, price should be exactly 100 * 1.20 * 1.20 = 144 (tariffs and faction control penalties bypassed)
    const price = calculateTradePrice(state, mockNpc, itemObj, 100, false, "player", mockPack);
    expect(price).toBe(144);
  });

  it("should bypass border taxes and local tolls when entering a registered safehouse", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Setup rangers faction tax toll (e.g. 50 gold tax)
    state.territoryControl = { safehouse_room: "rangers" };
    state.factionRep = { rangers: -30 }; // Hostile rangers

    // Setup trade route toll (e.g. 25 gold toll)
    state.tradeRoutes = {
      route_rangers: {
        id: "route_rangers",
        factionId: "rangers",
        rooms: ["safehouse_room"],
        definedBy: "player",
        taxShare: 25,
        timestamp: 1000,
      },
    };
    state.tradeRoutePolicies = {
      route_rangers: 25,
    };

    // Set up safehouse in destination room
    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        stashCapacity: 5,
        stashItems: [],
        timestamp: 1000,
      },
    };

    // Normally, player moving to a hostile rangers route room with -30 rep would be locked or charged heavy tolls.
    // Because safehouse exists in destination, they slip in cleanly without paying tolls or getting blocked!
    const moveRes = step(
      state,
      {
        type: "MOVE",
        direction: "NORTH",
      },
      mockPack
    );

    expect(moveRes.ok).toBe(true);
    expect(moveRes.state.current).toBe("safehouse_room");
    expect(moveRes.state.vars["gold"]).toBe(100); // 0 tolls paid!
  });

  it("should reconcile blackMarkets state correctly using Gossip mergeState", () => {
    let stateA = createInitialState({ seed: 12345, start: "safehouse_room" });
    let stateB = createInitialState({ seed: 12345, start: "safehouse_room" });

    stateA.blackMarkets = {
      safehouse_room: {
        id: "black_market_safehouse_room",
        roomId: "safehouse_room",
        syndicateId: "shadow_cartel",
        inventory: ["contraband_spice"],
        timestamp: 1010,
      },
    };

    stateB.blackMarkets = {
      safehouse_room: {
        id: "black_market_safehouse_room",
        roomId: "safehouse_room",
        syndicateId: "shadow_cartel",
        inventory: ["contraband_spice", "blaster"],
        timestamp: 1020, // Later timestamp wins
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.blackMarkets?.["safehouse_room"]).toBeDefined();
    expect(merged.blackMarkets?.["safehouse_room"].inventory).toContain("blaster");
    expect(merged.blackMarkets?.["safehouse_room"].timestamp).toBe(1020);
  });
});

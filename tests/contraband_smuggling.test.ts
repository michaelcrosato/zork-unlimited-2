import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice, checkReputationTrade } from "../src/core/economy.js";

describe("Decentralized Cartel Smuggling and Contraband Economy Tests (AF-40)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "smuggling_test_pack",
      title: "Smuggling and Contraband Test Pack",
      start_room: "safehouse",
      vars_init: { gold: 200 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5, // Hostile enough to tax
      },
      {
        id: "cartel_faction",
        name: "Smuggler Cartel Faction",
        description: "Outlaws of the border.",
        initial_rep: 10,
      },
    ],
    rooms: [
      {
        id: "safehouse",
        name: "Safe House",
        description: "A secure smuggling outpost.",
        objects: ["whiskey", "lockpick", "spice"],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "border_post",
          },
        ],
      },
      {
        id: "border_post",
        name: "Border Patrol Post",
        description: "A heavily guarded checkpoint.",
        objects: [],
        npcs: ["merchant_npc"],
        faction: "rangers", // Rangers control the border post
        exits: [],
      },
    ],
    objects: [
      {
        id: "whiskey",
        name: "Fine Whiskey",
        description: "Highly taxed alcohol.",
        cost: 40,
        takeable: true,
      },
      {
        id: "lockpick",
        name: "Illegal Lockpick",
        description: "Contraband burglary tool.",
        cost: 20,
        takeable: true,
        contraband: true, // Marked as contraband in schema
      },
      {
        id: "spice",
        name: "Rare Spice",
        description: "Exotic smuggled goods.",
        cost: 60,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "merchant_npc",
        name: "Sly Jack",
        description: "A black-market merchant.",
        gold: 500,
        possible_items: [],
        faction: "cartel_faction",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Need something off the books?",
              topics: [],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should successfully smuggle marked contraband across a taxed border on good rolls", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: -5 },
      territoryControlInit: { border_post: "rangers" },
    });

    // Take the illegal lockpick (contraband)
    let res = step(state, { type: "TAKE", item: "lockpick" }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.inventory).toContain("lockpick");

    // Move to border_post. With seed 42, the roll will be deterministic.
    // Let's force high smuggling variables to make success guaranteed (detection chance becomes minimum 5%)
    state.vars["smuggling"] = 10; // Smuggling skill level 10 -> reduces detection chance by 50%

    let resMove = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMove.ok).toBe(true);
    expect(resMove.state.current).toBe("border_post");
    expect(resMove.state.inventory).toContain("lockpick");
    expect(resMove.events.some(e => e.type === "narration" && (e as any).text?.includes("successfully smuggled"))).toBe(true);
  });

  it("should catch the player and apply confiscation/fines/reputation penalties on failed smuggling check", () => {
    let state = createInitialState({
      seed: 8, // Set a seed that leads to caught detection roll
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: -5 },
      territoryControlInit: { border_post: "rangers" },
    });

    // Take the contraband lockpick
    state = step(state, { type: "TAKE", item: "lockpick" }, mockPack).state;
    expect(state.inventory).toContain("lockpick");

    // Set smuggling skill to negative or 0 to guarantee high detection chance (40%)
    state.vars["smuggling"] = -10; 

    const resMove = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMove.ok).toBe(false);
    expect(resMove.rejectionReason).toContain("Caught smuggling contraband");
    
    // Penalties applied: lockpick confiscated
    expect(resMove.state.inventory).not.toContain("lockpick");
    
    // Fined gold (contraband lockpick value: 20 -> fine 30)
    expect(resMove.state.vars["gold"]).toBe(170);

    // Faction reputation with rangers decreased by 15 (-5 -> -20)
    expect(resMove.state.factionRep?.["rangers"]).toBe(-20);
  });

  it("should dynamically blacklist items via gossip SET_CONTRABAND_BLACKLIST and apply smuggling checks", () => {
    let state = createInitialState({
      seed: 8,
      start: "safehouse",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: -5 },
      territoryControlInit: { border_post: "rangers" },
    });

    // Fine whiskey is not contraband initially
    state = step(state, { type: "TAKE", item: "whiskey" }, mockPack).state;
    expect(state.inventory).toContain("whiskey");

    // We can cross the border post without smuggling (just pay standard faction tax or standard entry)
    // rangers rep is -5 -> tax is 10
    let resMoveTax = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMoveTax.ok).toBe(true);
    expect(resMoveTax.state.vars["gold"]).toBe(190); // standard tax deducted

    // Now, blacklist whiskey!
    const resBlacklist = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "SET_CONTRABAND_BLACKLIST",
        itemId: "whiskey",
        blacklisted: true,
        timestamp: 1000,
      } as any,
    }, mockPack);
    expect(resBlacklist.ok).toBe(true);
    state = resBlacklist.state;
    expect(state.contrabandBlacklist?.["whiskey"]).toEqual({
      blacklisted: true,
      timestamp: 1000,
    });

    // Attempting to move with blacklisted whiskey triggers smuggling border check!
    state.vars["smuggling"] = -5; // fail check
    let resMoveBlacklist = step(state, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(resMoveBlacklist.ok).toBe(false);
    expect(resMoveBlacklist.rejectionReason).toContain("Caught smuggling");
    expect(resMoveBlacklist.state.inventory).not.toContain("whiskey");
  });

  it("should apply regional black market smuggling payouts to contraband sells", () => {
    let state = createInitialState({
      seed: 42,
      start: "border_post",
      varsInit: { gold: 200 },
    });

    // Make jack stock whiskey
    state.merchantInventories = { merchant_npc: [] };
    state.inventory = ["spice"]; // Spice base cost: 60

    // Set regional black market payout multiplier for border_post to 200% (2x)
    const resPayout = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "SET_BLACK_MARKET_PAYOUT",
        roomId: "border_post",
        payout: 200, // 2x multiplier
        timestamp: 1000,
      } as any,
    }, mockPack);
    expect(resPayout.ok).toBe(true);
    state = resPayout.state;
    expect(state.blackMarketPayouts?.["border_post"]).toEqual({
      payout: 200,
      timestamp: 1000,
    });

    // If spice is normal item, sell payout is calculated normally
    const npcPack = mockPack.npcs[0];
    const packObj = mockPack.objects[2]; // spice
    let normalPrice = calculateTradePrice(state, npcPack, packObj, 60, false);
    expect(normalPrice).toBe(60);

    // Blacklist spice!
    state = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "SET_CONTRABAND_BLACKLIST",
        itemId: "spice",
        blacklisted: true,
        timestamp: 1010,
      } as any,
    }, mockPack).state;

    // Sell price of contraband spice in border_post gets the 2x black market premium!
    let blackMarketPrice = calculateTradePrice(state, npcPack, packObj, 60, false);
    expect(blackMarketPrice).toBe(120); // 60 * 2x
  });

  it("should sync contraband blacklists and regional black-market payouts via gossip mesh", () => {
    const pack = mockPack;
    const nodeA = new GossipNode("alice", pack, 42);
    const nodeB = new GossipNode("bob", pack, 42);

    nodeA.connect(nodeB);

    // Node A blacklists spice
    const txA = nodeA.executeLocalAction({
      type: "SET_CONTRABAND_BLACKLIST",
      itemId: "spice",
      blacklisted: true,
      timestamp: 1500,
    } as any);
    expect(txA.ok).toBe(true);

    // Node B sets regional payout for safehouse to 175%
    const txB = nodeB.executeLocalAction({
      type: "SET_BLACK_MARKET_PAYOUT",
      roomId: "safehouse",
      payout: 175,
      timestamp: 1600,
    } as any);
    expect(txB.ok).toBe(true);

    // Run gossip state reconciliation
    nodeA.gossip();
    nodeB.gossip();

    // Assert convergence!
    expect(nodeA.localState.contrabandBlacklist?.["spice"]).toEqual({
      blacklisted: true,
      timestamp: 1500,
    });
    expect(nodeB.localState.contrabandBlacklist?.["spice"]).toEqual({
      blacklisted: true,
      timestamp: 1500,
    });

    expect(nodeA.localState.blackMarketPayouts?.["safehouse"]).toEqual({
      payout: 175,
      timestamp: 1600,
    });
    expect(nodeB.localState.blackMarketPayouts?.["safehouse"]).toEqual({
      payout: 175,
      timestamp: 1600,
    });
  });

  it("should support bypassing active cartel embargoes via smuggling", () => {
    let state = createInitialState({
      seed: 42, // success seed for smuggling trade
      start: "border_post",
      varsInit: { gold: 200 },
      factionRepInit: { rangers: 10 }, // rangers rep is positive -> triggers cartel embargo!
    });

    // Setup cartel embargo against rangers (merchant is in cartel_faction which is allied, but rangers are embargoed)
    state.cartels = {
      cartel1: {
        id: "cartel1",
        name: "Red Cartel",
        members: ["merchant_npc"],
        factionId: "cartel_faction",
        priceMultiplier: 1.0,
        definedBy: "alice",
        timestamp: 100,
      }
    };
    state.cartelPolicies = {
      cartel1: {
        priceMultiplier: 1.0,
        embargoedFactions: ["rangers"],
      }
    };

    // Verify reputation check blocks normal trade due to active cartel embargo
    const npcPack = mockPack.npcs[0];
    const repCheck = checkReputationTrade(state, npcPack);
    expect(repCheck.allowed).toBe(false);
    expect(repCheck.reason).toContain("cartel");

    // Carry contraband whiskey to bypass it
    state.inventory = ["whiskey"];
    state.contrabandBlacklist = {
      whiskey: { blacklisted: true, timestamp: 200 }
    };
    state.vars["smuggling"] = 10; // guarantee success

    // Attempt trade effect bypass
    const resTrade = step(state, {
      type: "BUY",
      npc: "merchant_npc",
      item: "whiskey", // not in stock, but let's test applyEffect npc_trade bypass
    }, mockPack);
    
    // The repCheck is bypassed, and it instead complains about stock!
    expect((resTrade.events[0] as any).reason).not.toContain("embargo");
    expect((resTrade.events[0] as any).reason).toContain("stock");
  });
});

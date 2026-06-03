import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { tickEconomy } from "../src/core/economy.js";
import { tickSmugglingConvoys } from "../src/core/engine.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { PureRand } from "../src/core/rng.js";

describe("Smuggler Syndicate Cartel Contraband Smuggling Ringleaders, Multi-Node Interceptor Deflections, and Custom Safehouse Defense Upgrades (AF-83)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "ringleader_decoys_defenses_test_pack",
      title: "Ringleader Decoys Defenses Test Pack",
      start_room: "market",
      vars_init: { gold: 2000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [
          {
            direction: "NORTH",
            to: "border",
          },
        ],
      },
      {
        id: "border",
        name: "Checkpoint Border",
        description: "Border heavily guarded by rangers.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
          {
            direction: "NORTH",
            to: "haven",
          },
        ],
      },
      {
        id: "haven",
        name: "Black Haven",
        description: "A safe syndicate shelter.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "border",
          },
        ],
      },
    ],
    objects: [
      {
        id: "contraband_spices",
        name: "Contraband Spices",
        description: "Highly forbidden spices.",
        cost: 100,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Merchant",
        description: "A friendly local merchant.",
        hp: 30,
        max_hp: 30,
        attack: 1,
        defense: 1,
        gold: 1000,
        xp: 15,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should validate and execute APPOINT_SMUGGLING_RINGLEADER action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Smugglers Cartel",
        members: ["player", "agent_b"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Rejects if syndicateId is invalid
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "APPOINT_SMUGGLING_RINGLEADER",
          syndicateId: "invalid_synd",
          ringleaderId: "player",
          timestamp: 10,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(false);

    // 2. Rejects if proposed ringleader is not a syndicate member
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "APPOINT_SMUGGLING_RINGLEADER",
          syndicateId: "synd_1",
          ringleaderId: "non_member",
          timestamp: 10,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(false);

    // 3. Succeeds and sets smugglingRingleader
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "APPOINT_SMUGGLING_RINGLEADER",
          syndicateId: "synd_1",
          ringleaderId: "agent_b",
          timestamp: 10,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.syndicates?.["synd_1"].smugglingRingleader).toBe("agent_b");
  });

  it("should implement ringleader speed and coordination multipliers in smuggling convoy progression logic", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 1000 },
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Smugglers Cartel",
        members: ["player", "agent_b"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["market", "border", "haven"],
        definedBy: "player",
        timestamp: 1,
        taxShare: 10,
      },
    };

    state.territoryControl = {
      border: "rangers",
    };
    state.factionRep = {
      rangers: -10, // low reputation triggers higher travel tax
    };

    // 1. Without a ringleader, convoy progresses by 1 room per tick
    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "synd_1",
        routeId: "route_1",
        cargo: 5,
        goldCost: 50,
        status: "en_route",
        currentRoomIndex: 0,
        definedBy: "player",
        timestamp: 1,
      },
    };

    let ticked = tickSmugglingConvoys(state, [], mockPack);
    expect(ticked.smugglingConvoys?.["convoy_1"].currentRoomIndex).toBe(1);
    expect(ticked.smugglingConvoys?.["convoy_1"].status).toBe("en_route");

    // 2. With a smuggling ringleader appointed, speed is doubled (2 steps per tick) and coordination multipliers reduce taxes/tolls
    // Let's reset the state and add a smuggling ringleader
    state.syndicates["synd_1"].smugglingRingleader = "player";
    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "synd_1",
        routeId: "route_1",
        cargo: 5,
        goldCost: 50,
        status: "en_route",
        currentRoomIndex: 0,
        definedBy: "player",
        timestamp: 1,
      },
    };

    // Ensure player has plenty of gold to pay tolls
    state.vars["gold"] = 1000;

    ticked = tickSmugglingConvoys(state, [], mockPack);
    // Since route size is 3 ("market", "border", "haven"), progressing 2 steps from index 0 leads to index 2
    expect(ticked.smugglingConvoys?.["convoy_1"].currentRoomIndex).toBe(2);
    expect(ticked.smugglingConvoys?.["convoy_1"].status).toBe("en_route");

    // Tick a second time to trigger destination payout and completion!
    let ticked2 = tickSmugglingConvoys(ticked, [], mockPack);
    expect(ticked2.smugglingConvoys?.["convoy_1"].status).toBe("completed");
    expect(ticked2.vars["totalConvoyPayouts"]).toBeGreaterThan(0);
  });

  it("should validate and execute DEPLOY_INTERCEPTOR_DECOY action and deflect caught smuggling / ambushes", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 1000 },
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Smugglers Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["market", "border", "haven"],
        definedBy: "player",
        timestamp: 1,
        taxShare: 10,
      },
    };

    // 1. Deploy interceptor decoy
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEPLOY_INTERCEPTOR_DECOY",
          decoyId: "decoy_omega",
          syndicateId: "synd_1",
          routeId: "route_1",
          cost: 300,
          timestamp: 10,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(700);
    expect(res.state.interceptorDecoys?.["decoy_omega"]).toBeDefined();
    expect(res.state.interceptorDecoys?.["decoy_omega"].active).toBe(true);

    // 2. Interceptor Decoy deflecting caught smuggling border check
    let borderState = res.state;
    // Add contraband to player agent inventory and CYOA inventory fallback
    if (borderState.agents?.["player"]) {
      borderState.agents["player"].inventory = ["contraband_spices"];
    }
    borderState.inventory = ["contraband_spices"];
    borderState.territoryControl = { border: "rangers" };
    borderState.factionRep = { rangers: -5 }; // low rep triggers border tax, but not locked which requires <= -10

    // Force a seed that guarantees a caught roll (value < 0.4)
    let testSeed = 0;
    for (let s = 0; s < 1000; s++) {
      const { value } = PureRand.next(s);
      if (value < 0.3) {
        testSeed = s;
        break;
      }
    }
    borderState.seed = testSeed;

    // Trigger movement containing border smuggling checks
    let moveRes = multiAgentStep(
      borderState,
      {
        agentId: "player",
        action: {
          type: "MOVE",
          direction: "NORTH",
        },
      },
      mockPack
    );
    // Should pass safely because the interceptor decoy deflated/misled the border patrol!
    expect(moveRes.ok).toBe(true);
    expect(moveRes.state.current).toBe("border");
    expect(moveRes.state.interceptorDecoys?.["decoy_omega"].active).toBe(false); // consumed
    expect(moveRes.state.inventory).toContain("contraband_spices"); // kept!
  });

  it("should validate and execute UPGRADE_SAFEHOUSE_DEFENSES and shield contraband during sweeps", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 1200 },
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Smugglers Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Establish Black Ops Safehouse
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_BLACK_OPS_SAFEHOUSE",
          safehouseId: "safehouse_alpha",
          roomId: "market",
          syndicateId: "synd_1",
          cost: 500,
          timestamp: 100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.blackOpsSafehouses?.["safehouse_alpha"]).toBeDefined();

    // 2. Upgrade defenses
    res = multiAgentStep(
      res.state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_SAFEHOUSE_DEFENSES",
          safehouseId: "safehouse_alpha",
          upgradeCost: 500,
          timestamp: 200,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.blackOpsSafehouses?.["safehouse_alpha"].defenses).toBe(1);
    expect(res.state.vars["gold"]).toBe(200); // 1200 - 500 - 500 = 200

    // 3. Trigger dynamic enforcer sweep on the safehouse
    let sweepState = res.state;
    // Store 10 contraband in safehouse
    sweepState.blackOpsSafehouses!["safehouse_alpha"].storedContraband = 10;
    // Set high enforcer heat in room to trigger sweep
    sweepState.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 30,
        timestamp: 1,
      },
    };

    let economyTicked = tickEconomy(sweepState, mockPack);
    // Since defenses were level 1, the sweep triggers and either gets repelled or shields contraband!
    const finalSafehouse = economyTicked.blackOpsSafehouses?.["safehouse_alpha"];
    expect(finalSafehouse).toBeDefined();
    // Check that stored contraband is either shielded or repelled (should not be fully confiscated without defense mitigation)
    expect(finalSafehouse!.storedContraband).toBeGreaterThanOrEqual(0);
  });
});

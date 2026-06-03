import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Underground Railroads, Cross-Border Contraband Tunnels, and Automated Tunnel Transport Systems (AF-84)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "underground_railroad_test_pack",
      title: "Underground Railroad Test Pack",
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
        npcs: [],
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
    npcs: [],
  });

  it("should validate and execute CONSTRUCT_CONTRABAND_TUNNEL action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    // Setup syndicate
    state.syndicates = {
      syndicate_1: {
        id: "syndicate_1",
        name: "Black Cartel",
        members: ["player", "ally_bob"],
        definedBy: "player",
        timestamp: 1,
        warChest: 500,
      },
    };

    // Try constructing without tunnelId
    let result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_CONTRABAND_TUNNEL",
          tunnelId: "",
          syndicateId: "syndicate_1",
          fromRoomId: "market",
          toRoomId: "border",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("Tunnel ID is required");

    // Try constructing with non-existent syndicate
    result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_CONTRABAND_TUNNEL",
          tunnelId: "tunnel_1",
          syndicateId: "fake_syndicate",
          fromRoomId: "market",
          toRoomId: "border",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("does not exist");

    // Try constructing as a non-member
    result = multiAgentStep(
      state,
      {
        agentId: "other_agent",
        action: {
          type: "CONSTRUCT_CONTRABAND_TUNNEL",
          tunnelId: "tunnel_1",
          syndicateId: "syndicate_1",
          fromRoomId: "market",
          toRoomId: "border",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("is not a member of syndicate");

    // Try constructing with insufficient gold
    result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_CONTRABAND_TUNNEL",
          tunnelId: "tunnel_1",
          syndicateId: "syndicate_1",
          fromRoomId: "market",
          toRoomId: "border",
          cost: 2000,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("Insufficient gold");

    // Construct successfully
    result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_CONTRABAND_TUNNEL",
          tunnelId: "tunnel_1",
          syndicateId: "syndicate_1",
          fromRoomId: "market",
          toRoomId: "border",
          cost: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(true);
    expect(result.state.vars.gold).toBe(800);
    expect(result.state.contrabandTunnels?.["tunnel_1"]).toBeDefined();
    expect(result.state.contrabandTunnels?.["tunnel_1"].fromRoomId).toBe("market");
    expect(result.state.contrabandTunnels?.["tunnel_1"].toRoomId).toBe("border");
  });

  it("should bypass surface border checkpoints and sweeps when traversing contraband tunnel", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    if (state.agents?.["player"]) {
      state.agents["player"].inventory = ["contraband_spices"];
    }

    // Setup syndicate and contraband tunnel
    state.syndicates = {
      syndicate_1: {
        id: "syndicate_1",
        name: "Black Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
      },
    };
    state.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 10,
      },
    };

    // Set border room to be controlled by Rangers who charge tax (reputation < 0 triggers tax & border check)
    state.territoryControl = { border: "rangers" };
    state.factionRep = { rangers: -20 };

    // Move to border using tunnel (bypasses border checks and tax!)
    let result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MOVE",
          direction: "NORTH",
        } as any,
      },
      mockPack
    );

    // Should succeed, current should be border
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("border");
    // Gold should not be deducted for faction tax
    expect(result.state.vars.gold).toBe(1000);
    // Contraband spices should still be in player's agent inventory
    expect(result.state.agents?.["player"]?.inventory).toContain("contraband_spices");

    // Check if the narration event was correctly emitted in the result
    const narrationEvent = result.events.find(
      (e: any) => e.type === "narration" && e.text.includes("traversed the contraband tunnel safely")
    );
    expect(narrationEvent).toBeDefined();
  });

  it("should charge custom tunnel tolls to non-members and distribute gold to syndicate members", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000, gold_other_agent: 500 },
      agentsInit: ["player", "other_agent"],
    });

    // Setup syndicate
    state.syndicates = {
      syndicate_1: {
        id: "syndicate_1",
        name: "Black Cartel",
        members: ["player", "ally_bob"],
        definedBy: "player",
        timestamp: 1,
      },
    };
    state.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 10,
      },
    };

    // Establish custom tunnel toll of 50 gold
    let result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_TUNNEL_TOLL",
          tunnelId: "tunnel_1",
          syndicateId: "syndicate_1",
          tollAmount: 50,
          timestamp: 15,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(true);
    expect(result.state.tunnelTolls?.["tunnel_1"]).toBeDefined();
    expect(result.state.tunnelTolls?.["tunnel_1"].tollAmount).toBe(50);

    // Traverse tunnel as a member (should pay 0 toll)
    let moveResultMember = multiAgentStep(
      result.state,
      {
        agentId: "player",
        action: {
          type: "MOVE",
          direction: "NORTH",
        } as any,
      },
      mockPack
    );
    expect(moveResultMember.ok).toBe(true);
    expect(moveResultMember.state.vars.gold).toBe(1000);

    // Traverse tunnel as a non-member (should pay 50 toll distributed to player and ally_bob)
    let moveResultNonMember = multiAgentStep(
      result.state,
      {
        agentId: "other_agent",
        action: {
          type: "MOVE",
          direction: "NORTH",
        } as any,
      },
      mockPack
    );
    expect(moveResultNonMember.ok).toBe(true);
    // Toll payer loses 50 gold
    expect(moveResultNonMember.state.vars.gold_other_agent).toBe(450);
    // Syndicate members (player and ally_bob) receive 25 gold each
    expect(moveResultNonMember.state.vars.gold).toBe(1025);
    expect(moveResultNonMember.state.vars.gold_ally_bob).toBe(25);
  });

  it("should block non-members from traversing the tunnel if they cannot afford the toll", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000, gold_other_agent: 10 },
      agentsInit: ["player", "other_agent"],
    });

    // Setup syndicate
    state.syndicates = {
      syndicate_1: {
        id: "syndicate_1",
        name: "Black Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
      },
    };
    state.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 10,
      },
    };
    state.tunnelTolls = {
      tunnel_1: {
        tunnelId: "tunnel_1",
        syndicateId: "syndicate_1",
        tollAmount: 50,
        timestamp: 15,
      },
    };

    // Traverse tunnel as a non-member who cannot afford toll (should be rejected)
    let moveResult = multiAgentStep(
      state,
      {
        agentId: "other_agent",
        action: {
          type: "MOVE",
          direction: "NORTH",
        } as any,
      },
      mockPack
    );
    expect(moveResult.ok).toBe(false);
    expect(moveResult.rejectionReason).toContain("cannot afford the tunnel toll");
  });

  it("should tick contraband tunnel maintenance costs and automated tunnel transport drone profits", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_1: {
        id: "syndicate_1",
        name: "Black Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        warChest: 100,
      },
    };
    state.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 10,
      },
    };

    // Deploy drone successfully
    let result = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEPLOY_TUNNEL_DRONE",
          droneId: "drone_1",
          syndicateId: "syndicate_1",
          tunnelId: "tunnel_1",
          cargoCapacity: 50,
          cost: 150,
          timestamp: 20,
        } as any,
      },
      mockPack
    );
    expect(result.ok).toBe(true);
    expect(result.state.vars.gold).toBe(850);
    expect(result.state.tunnelDrones?.["drone_1"]).toBeDefined();
    expect(result.state.tunnelDrones?.["drone_1"].cargoCapacity).toBe(50);
    expect(result.state.tunnelDrones?.["drone_1"].active).toBe(true);

    // Tick economy: tunnel maintenance (-15 from warChest) & drone contraband profit (+40 to syndicate members)
    let economyState = tickEconomy(result.state, mockPack);

    // War chest drops by 15 (100 -> 85)
    expect(economyState.syndicates?.["syndicate_1"].warChest).toBe(85);
    // Player (only member of syndicate_1) receives +40 gold (850 -> 890)
    expect(economyState.vars.gold).toBe(890);
    // Journal contains messages for maintenance and drone profits
    const journalText = economyState.journal.join(" ");
    expect(journalText).toContain("incurred maintenance cost of 15 gold");
    expect(journalText).toContain("automated contraband transport safely");
  });

  it("should replicate and merge contraband tunnels, tolls, and drones correctly via gossip", () => {
    let stateA = createInitialState({ seed: 1, start: "market" });
    let stateB = createInitialState({ seed: 2, start: "market" });

    stateA.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 10,
      },
    };

    stateB.contrabandTunnels = {
      tunnel_1: {
        id: "tunnel_1",
        syndicateId: "syndicate_1",
        fromRoomId: "market",
        toRoomId: "border",
        cost: 200,
        timestamp: 20, // State B has newer tunnel modification
      },
      tunnel_2: {
        id: "tunnel_2",
        syndicateId: "syndicate_2",
        fromRoomId: "border",
        toRoomId: "haven",
        cost: 300,
        timestamp: 5,
      },
    };

    stateA.tunnelTolls = {
      tunnel_1: {
        tunnelId: "tunnel_1",
        syndicateId: "syndicate_1",
        tollAmount: 50,
        timestamp: 10,
      },
    };

    stateB.tunnelTolls = {
      tunnel_1: {
        tunnelId: "tunnel_1",
        syndicateId: "syndicate_1",
        tollAmount: 100,
        timestamp: 25, // State B has newer toll
      },
    };

    stateA.tunnelDrones = {
      drone_1: {
        id: "drone_1",
        syndicateId: "syndicate_1",
        tunnelId: "tunnel_1",
        cargoCapacity: 50,
        active: true,
        cost: 150,
        timestamp: 10,
      },
    };

    stateB.tunnelDrones = {
      drone_1: {
        id: "drone_1",
        syndicateId: "syndicate_1",
        tunnelId: "tunnel_1",
        cargoCapacity: 100,
        active: true,
        cost: 150,
        timestamp: 30, // State B has newer drone capacity
      },
    };

    // Merge State A and State B
    let merged = mergeMonotonicStateFields(stateA, stateB);

    // Contraband Tunnels merged
    expect(merged.contrabandTunnels?.["tunnel_1"].timestamp).toBe(20);
    expect(merged.contrabandTunnels?.["tunnel_2"]).toBeDefined();

    // Tunnel Tolls merged
    expect(merged.tunnelTolls?.["tunnel_1"].tollAmount).toBe(100);

    // Tunnel Drones merged
    expect(merged.tunnelDrones?.["drone_1"].cargoCapacity).toBe(100);
  });
});

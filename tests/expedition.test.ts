import { describe, it, expect } from "vitest";
import { DecentralizedDungeonExpedition } from "../src/core/expedition.js";
import { computeStateHash } from "../src/core/hash.js";

const testPack = {
  meta: {
    id: "dungeon_expedition_pack",
    title: "Cooperative Dungeon Expedition",
    start_room: "clearing",
    flags_init: ["can_generate"],
  },
  rooms: [
    {
      id: "clearing",
      name: "Expedition Camp",
      description: "A secure camp at the entrance of a mysterious procedural cavern. A wooden chest sits here.",
      objects: ["chest", "generator_device"],
      npcs: [],
      exits: [],
    },
  ],
  objects: [
    {
      id: "chest",
      name: "wooden chest",
      aliases: ["chest"],
      description: "A sturdy wooden chest holding valuable explorer gear.",
      takeable: false,
      container: true,
      openable: false,
      locked: false,
      contents: ["map", "compass"],
    },
    {
      id: "map",
      name: "dungeon map",
      aliases: ["map"],
      description: "A detailed map of the surrounding region.",
      takeable: true,
    },
    {
      id: "compass",
      name: "brass compass",
      aliases: ["compass"],
      description: "A reliable magnetic compass.",
      takeable: true,
    },
    {
      id: "generator_device",
      name: "strange crystal",
      aliases: ["crystal", "device"],
      description: "A glowing crystal. Using it spawns a dungeon chamber to the north.",
      takeable: false,
      interactions: [
        {
          verb: "USE",
          conditions: [{ has_flag: "can_generate" }],
          effects: [
            { clear_flag: "can_generate" },
            {
              generate_procedural_room: {
                direction: "north",
                to_id: "proc_chamber_1",
                template_id: "dungeon_room",
              },
            },
          ],
        },
      ],
    },
    {
      id: "rusty_sword",
      name: "rusty sword",
      aliases: ["sword"],
      description: "A rusty iron sword.",
      takeable: true,
    },
  ],
  npcs: [],
  procedural_templates: [
    {
      id: "dungeon_room",
      name_pool: ["Dark Dungeon", "Gloomy Crypt", "Damp Cavern"],
      description_pool: [
        "A cold wind chills you to the bone here.",
        "Water droplets echo in the dark.",
        "Moss grows thick on the slimy walls.",
      ],
      possible_objects: ["rusty_sword"],
      possible_npcs: [],
      exits: [],
    },
  ],
  win_conditions: [],
  endings: [],
};

describe("Decentralized Cooperative Dungeon Expedition Framework", () => {
  it("should initialize a mesh network of explorer nodes successfully", () => {
    const expedition = new DecentralizedDungeonExpedition(testPack, 101);

    const alice = expedition.spawnPeer("alice");
    const bob = expedition.spawnPeer("bob");
    const charlie = expedition.spawnPeer("charlie");

    expect(expedition.peers.size).toBe(3);

    // Verify full mesh connections
    expect(alice.peers.has("bob")).toBe(true);
    expect(alice.peers.has("charlie")).toBe(true);
    expect(bob.peers.has("alice")).toBe(true);
    expect(bob.peers.has("charlie")).toBe(true);
    expect(charlie.peers.has("alice")).toBe(true);
    expect(charlie.peers.has("bob")).toBe(true);
  });

  it("should synchronize dynamically generated rooms across P2P peers", () => {
    const expedition = new DecentralizedDungeonExpedition(testPack, 101);
    const alice = expedition.spawnPeer("alice");
    const bob = expedition.spawnPeer("bob");

    // Alice uses the strange crystal device to procedurally spawn the room
    const stepRes = expedition.executeActionOn("alice", {
      type: "USE",
      item: "generator_device",
      target: "generator_device",
    });
    expect(stepRes.ok).toBe(true);
    expect(alice.localState.proceduralRooms).toHaveLength(1);
    expect(alice.localState.proceduralRooms![0].id).toBe("proc_chamber_1");

    // Verify Bob is unaware of the new room before gossip sync
    expect(bob.localState.proceduralRooms).toHaveLength(0);

    // Sync network
    const syncSteps = expedition.synchronizeNetwork();
    expect(syncSteps).toBeGreaterThan(0);

    // Bob must now have synchronized the room perfectly and deterministically
    expect(bob.localState.proceduralRooms).toHaveLength(1);
    expect(bob.localState.proceduralRooms![0].id).toBe("proc_chamber_1");

    // Verify that the generated room has identical name and description due to deterministic PRNG replaying
    expect(bob.localState.proceduralRooms![0].name).toBe(alice.localState.proceduralRooms![0].name);
    expect(bob.localState.proceduralRooms![0].description).toBe(alice.localState.proceduralRooms![0].description);

    // State hashes must perfectly match/converge
    expedition.assertNetworkConvergence();
  });

  it("should handle lock-free chest claim transitions using LWW CRDT rules", () => {
    const expedition = new DecentralizedDungeonExpedition(testPack, 101);
    const alice = expedition.spawnPeer("alice");
    const bob = expedition.spawnPeer("bob");

    // Sync their starting presence
    expedition.synchronizeNetwork();

    // Alice claims the map at timestamp 100
    const claimAlice = expedition.claimLootOn("alice", "chest", "map", 100);
    expect(claimAlice.ok).toBe(true);
    expect(alice.localState.lootClaims?.["chest:map"]).toEqual({
      claimedBy: "alice",
      timestamp: 100,
    });
    expect(alice.localState.agents?.["alice"]?.inventory).toContain("map");

    // Bob is unaware of the claim yet
    expect(bob.localState.lootClaims?.["chest:map"]).toBeUndefined();

    // Sync claims
    expedition.synchronizeNetwork();

    // Bob now sees the claim and his local state has removed map from chest and registered Alice as the owner
    expect(bob.localState.lootClaims?.["chest:map"]).toEqual({
      claimedBy: "alice",
      timestamp: 100,
    });
    expect(bob.localState.agents?.["alice"]?.inventory).toContain("map");
    expect(bob.localState.objectState["chest"]?.contents).not.toContain("map");

    expedition.assertNetworkConvergence();
  });

  it("should simulate a network partition, concurrent claims, and converge using LWW", () => {
    const expedition = new DecentralizedDungeonExpedition(testPack, 101);
    const alice = expedition.spawnPeer("alice");
    const bob = expedition.spawnPeer("bob");

    // Sync presence
    expedition.synchronizeNetwork();

    // 1. Partition the network
    expedition.partition("alice", "bob");

    // 2. Concurrently claim the compass
    // Alice claims at timestamp 150
    const claimAlice = expedition.claimLootOn("alice", "chest", "compass", 150);
    expect(claimAlice.ok).toBe(true);

    // Bob claims at timestamp 250 (wins LWW claim)
    const claimBob = expedition.claimLootOn("bob", "chest", "compass", 250);
    expect(claimBob.ok).toBe(true);

    // Assert their isolated, divergent states
    expect(alice.localState.agents?.["alice"]?.inventory).toContain("compass");
    expect(bob.localState.agents?.["bob"]?.inventory).toContain("compass");
    expect(alice.localState.agents?.["bob"]?.inventory).not.toContain("compass");
    expect(bob.localState.agents?.["alice"]?.inventory).not.toContain("compass");

    // Verification of divergence: distinct state hashes
    const hashAlice = computeStateHash(alice.localState);
    const hashBob = computeStateHash(bob.localState);
    expect(hashAlice).not.toBe(hashBob);

    // 3. Heal the partition
    expedition.healPartition("alice", "bob");

    // 4. Synchronize states
    expedition.synchronizeNetwork();

    // 5. Verify perfect eventual convergence
    expedition.assertNetworkConvergence();

    // Assert LWW winner (Bob) got the compass, and Alice's inventory was corrected/cleared of it
    expect(bob.localState.lootClaims?.["chest:compass"]).toEqual({
      claimedBy: "bob",
      timestamp: 250,
    });
    expect(alice.localState.lootClaims?.["chest:compass"]).toEqual({
      claimedBy: "bob",
      timestamp: 250,
    });

    expect(alice.localState.agents?.["bob"]?.inventory).toContain("compass");
    expect(bob.localState.agents?.["bob"]?.inventory).toContain("compass");

    expect(alice.localState.agents?.["alice"]?.inventory).not.toContain("compass");
    expect(bob.localState.agents?.["alice"]?.inventory).not.toContain("compass");
  });
});

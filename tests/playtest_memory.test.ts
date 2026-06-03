import { describe, it, expect } from "vitest";
import { PlaytestMemoryManager } from "../src/playtest/memory.js";

describe("PlaytestMemoryManager", () => {
  it("should initialize with default structure and values", () => {
    const manager = new PlaytestMemoryManager();
    const memory = manager.getMemory();

    expect(memory.visitedRooms).toEqual([]);
    expect(memory.possessedItems).toEqual([]);
    expect(memory.observedObjects).toEqual([]);
    expect(memory.inferredObjective).toBe("Explore the environment and identify items/exits.");
    expect(memory.unresolvedPuzzles).toEqual([]);
  });

  it("should record locations from room and scene headers", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("--- ROOM: Sunlit Clearing | Score: 0 ---\nYou see a forest path.");
    expect(manager.getMemory().visitedRooms).toEqual(["Sunlit Clearing"]);

    manager.update("--- SCENE: watchtower_inside | suspicion: 0 ---\nYou are inside.");
    expect(manager.getMemory().visitedRooms).toEqual(["Sunlit Clearing", "watchtower_inside"]);
  });

  it("should record inventory items correctly", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("--- ROOM: Sunlit Clearing ---\nInventory: shovel, gold_ring");
    expect(manager.getMemory().possessedItems).toEqual(["shovel", "gold_ring"]);

    // Handle empty inventory cases
    manager.update("--- ROOM: Sunlit Clearing ---\nInventory: [none]");
    expect(manager.getMemory().possessedItems).toEqual([]);

    manager.update("--- ROOM: Sunlit Clearing ---\nInventory: empty");
    expect(manager.getMemory().possessedItems).toEqual([]);
  });

  it("should record objects visible in the room", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("--- ROOM: Sunlit Clearing ---\nYou see here: shovel, earthen mound");
    expect(manager.getMemory().observedObjects).toEqual(["shovel", "earthen mound"]);

    manager.update("--- ROOM: Sunlit Clearing ---\nYou see here: goblin merchant");
    expect(manager.getMemory().observedObjects).toEqual(["shovel", "earthen mound", "goblin merchant"]);
  });

  it("should record and prune locks/obstacles", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("--- ROOM: Sunlit Clearing ---\nThere is a locked door here.");
    expect(manager.getMemory().unresolvedPuzzles).toEqual(["locked door"]);

    manager.update("--- ROOM: Sunlit Clearing ---\nThe door has been unlocked.");
    expect(manager.getMemory().unresolvedPuzzles).toEqual([]);
  });

  it("should update objective goals from action reasons", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("Observation", "go north", "I need to find shelter.");
    expect(manager.getMemory().inferredObjective).toBe("I need to find shelter.");
  });

  it("should format memory prompt correctly", () => {
    const manager = new PlaytestMemoryManager();

    manager.update("--- ROOM: Sunlit Clearing ---\nInventory: key\nYou see here: chest\nThere is a locked grate.");
    manager.update("Observation", "use key on chest", "Open the chest for loot.");

    const formatted = manager.formatMemoryPrompt();

    expect(formatted).toContain("Visited Locations: [ Sunlit Clearing ]");
    expect(formatted).toContain("Carried Items: [ key ]");
    expect(formatted).toContain("Known Objects in World: [ chest ]");
    expect(formatted).toContain("Pending Obstacles: [ locked grate ]");
    expect(formatted).toContain("Current Goal: Open the chest for loot.");
  });
});

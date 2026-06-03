/**
 * @module playtest/memory
 *
 * Playtest Memory Manager
 *
 * Implements a structured memory map that aggregates play history (visited locations,
 * possessed items, observed objects, unresolved puzzles, and inferred goals)
 * from turn-by-turn text observations. This helps compress long-horizon context for LLM agents.
 */

export interface PlaytestMemory {
  visitedRooms: string[];
  possessedItems: string[];
  observedObjects: string[];
  inferredObjective: string;
  unresolvedPuzzles: string[];
}

export class PlaytestMemoryManager {
  private memory: PlaytestMemory = {
    visitedRooms: [],
    possessedItems: [],
    observedObjects: [],
    inferredObjective: "Explore the environment and identify items/exits.",
    unresolvedPuzzles: [],
  };

  constructor() {}

  /**
   * Returns a copy of the current structured memory.
   */
  getMemory(): PlaytestMemory {
    return {
      visitedRooms: [...this.memory.visitedRooms],
      possessedItems: [...this.memory.possessedItems],
      observedObjects: [...this.memory.observedObjects],
      inferredObjective: this.memory.inferredObjective,
      unresolvedPuzzles: [...this.memory.unresolvedPuzzles],
    };
  }

  /**
   * Updates the memory map based on a new game observation text and the last action details.
   *
   * @param observationText The sensory narration text returned by the game engine.
   * @param lastAction The command text executed in the last turn.
   * @param lastActionReason The reasoning text associated with the chosen action.
   */
  update(observationText: string, lastAction?: string, lastActionReason?: string) {
    if (!observationText) return;

    // 1. Record location (ROOM or SCENE), stopping at newlines, pipes, or hyphens
    const roomMatch =
      observationText.match(/--- ROOM:\s*([^\n\r|-]+)/) || observationText.match(/--- SCENE:\s*([^\n\r|-]+)/);
    if (roomMatch) {
      const room = roomMatch[1].trim();
      if (!this.memory.visitedRooms.includes(room)) {
        this.memory.visitedRooms.push(room);
      }
    }

    // 2. Record possessed items
    const inventoryMatch = observationText.match(/Inventory:\s*([^\n\r]+)/i);
    if (inventoryMatch) {
      const itemsStr = inventoryMatch[1].trim();
      if (
        itemsStr.toLowerCase() !== "empty" &&
        itemsStr.toLowerCase() !== "[none]" &&
        itemsStr !== "" &&
        !itemsStr.includes("[none]")
      ) {
        const items = itemsStr.split(",").map((i) => i.trim().toLowerCase());
        this.memory.possessedItems = items;
      } else {
        this.memory.possessedItems = [];
      }
    }

    // 3. Record objects observed in the room
    const objectsMatch = observationText.match(/You see here:\s*([^\n\r]+)/i);
    if (objectsMatch) {
      const objsStr = objectsMatch[1].trim();
      const objs = objsStr.split(",").map((o) => o.trim().toLowerCase());
      for (const obj of objs) {
        const cleanedObj = obj.replace(/[.\s]+$/, "").trim();
        if (cleanedObj && !this.memory.observedObjects.includes(cleanedObj)) {
          this.memory.observedObjects.push(cleanedObj);
        }
      }
    }

    // 4. Record locked obstacles
    if (observationText.toLowerCase().includes("locked") || observationText.toLowerCase().includes("closed")) {
      const puzzleMatch = observationText.match(/(?:locked|closed)\s+([\w_]+)/i);
      if (puzzleMatch) {
        const puzzle = puzzleMatch[0].trim().toLowerCase();
        if (!this.memory.unresolvedPuzzles.includes(puzzle)) {
          this.memory.unresolvedPuzzles.push(puzzle);
        }
      }
    }

    // Remove resolved puzzles from pending obstacles if we see unlocked/opened in proximity with target object
    if (observationText.toLowerCase().includes("unlocked") || observationText.toLowerCase().includes("opened")) {
      this.memory.unresolvedPuzzles = this.memory.unresolvedPuzzles.filter((p) => {
        const objName = p.replace("locked", "").replace("closed", "").trim();
        const hasUnlocked = observationText.toLowerCase().includes("unlocked");
        const hasOpened = observationText.toLowerCase().includes("opened");
        const containsObj = observationText.toLowerCase().includes(objName);
        return !((hasUnlocked || hasOpened) && containsObj);
      });
    }

    // 5. Update inferred objective
    if (lastActionReason) {
      this.memory.inferredObjective = lastActionReason;
    }
  }

  /**
   * Formats the structured memory into a string representation to append to prompts.
   */
  formatMemoryPrompt(): string {
    const rooms = this.memory.visitedRooms.join(", ") || "None";
    const items = this.memory.possessedItems.join(", ") || "None";
    const objs = this.memory.observedObjects.join(", ") || "None";
    const obstacles = this.memory.unresolvedPuzzles.join(", ") || "None";
    const objective = this.memory.inferredObjective;

    return `\n=== YOUR PERSISTENT MENTAL MAP ===
Visited Locations: [ ${rooms} ]
Carried Items: [ ${items} ]
Known Objects in World: [ ${objs} ]
Pending Obstacles: [ ${obstacles} ]
Current Goal: ${objective}
==================================`;
  }
}

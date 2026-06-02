import { describe, it, expect } from "vitest";
import { McpGameClient } from "../src/playtest/mcp_client.js";

describe("McpGameClient", () => {
  it("should construct with default session ID", () => {
    const client = new McpGameClient();
    expect(client).toBeDefined();
  });

  it("should construct with custom session ID", () => {
    const client = new McpGameClient("test-session");
    expect(client).toBeDefined();
  });

  it("should detect game over from observation text", () => {
    const client = new McpGameClient();

    // Game over text
    expect(client.isGameOver("💀☠️ GAME OVER: good_ending ☠️💀\nYou win!")).toBe(true);
    expect(client.isGameOver("Some text\n💀☠️ GAME OVER: death ☠️💀")).toBe(true);

    // Not game over
    expect(client.isGameOver("--- ROOM: Forest Path ---\nYou see a door.")).toBe(false);
    expect(client.isGameOver("")).toBe(false);
    expect(client.isGameOver("Game is still going")).toBe(false);
  });

  it("should return empty stderr log before connection", () => {
    const client = new McpGameClient();
    expect(client.getStderrLog()).toEqual([]);
  });

  // Integration test: connect → play → disconnect
  // This test requires the MCP server to be runnable (dependencies installed)
  it("should connect, start a game, take actions, and disconnect", async () => {
    const client = new McpGameClient("integration-test");

    try {
      // Connect to MCP server
      await client.connect();

      // List available adventures
      const adventures = await client.listAdventures();
      expect(adventures.length).toBeGreaterThan(0);
      expect(adventures.some((a) => a.id === "chapel_pack_v1")).toBe(true);

      // Start a game
      const startObs = await client.startGame("chapel_pack_v1", 42);
      expect(startObs.length).toBeGreaterThan(0);
      expect(startObs).toContain("ROOM:");

      // Get observation
      const obs = await client.getObservation();
      expect(obs.length).toBeGreaterThan(0);

      // Execute an action
      const actionResult = await client.executeAction("look");
      expect(actionResult.text.length).toBeGreaterThan(0);
      expect(actionResult.isError).toBe(false);

      // Execute a movement
      const moveResult = await client.executeAction("go north");
      expect(moveResult.text.length).toBeGreaterThan(0);

      // Try an invalid action
      const invalidResult = await client.executeAction("eat the locked door");
      // This may or may not be an error depending on the parser
      expect(invalidResult.text.length).toBeGreaterThan(0);
    } finally {
      // Always disconnect
      await client.disconnect();
    }
  }, 30000); // 30s timeout for integration test
});

import { describe, it, expect } from "vitest";
import { normalizeCommandString, mapCommand } from "../src/parser/command_map.js";

describe("normalizeCommandString", () => {
  it("normalizes single-letter directional shortcuts", () => {
    expect(normalizeCommandString("n")).toBe("go north");
    expect(normalizeCommandString("s")).toBe("go south");
    expect(normalizeCommandString("e")).toBe("go east");
    expect(normalizeCommandString("w")).toBe("go west");
    expect(normalizeCommandString("u")).toBe("go up");
    expect(normalizeCommandString("d")).toBe("go down");
  });

  it("normalizes inventory and look shortcuts", () => {
    expect(normalizeCommandString("i")).toBe("inventory");
    expect(normalizeCommandString("l")).toBe("look");
  });

  it("trims whitespace and lowercases input", () => {
    expect(normalizeCommandString("  GO NORTH  ")).toBe("go north");
    expect(normalizeCommandString("LOOK")).toBe("look");
    expect(normalizeCommandString("  Take Lamp  ")).toBe("take lamp");
  });

  it("passes through multi-word commands unchanged (after trim + lower)", () => {
    expect(normalizeCommandString("open chest")).toBe("open chest");
    expect(normalizeCommandString("talk to guard")).toBe("talk to guard");
  });
});

describe("mapCommand", () => {
  const sampleActions = [
    { id: "go-north", command: "go north", action: { type: "GO" as const, direction: "north" } },
    { id: "take-lamp", command: "take lamp", action: { type: "TAKE" as const, item: "lamp" } },
    { id: "look", command: "look", action: { type: "LOOK" as const } },
  ];

  it("matches exact command strings case-insensitively", () => {
    const result = mapCommand("go north", sampleActions);
    expect(result.action).toEqual({ type: "GO", direction: "north" });
    expect(result.error).toBeUndefined();
  });

  it("matches after normalization of shortcuts", () => {
    const result = mapCommand("n", sampleActions);
    expect(result.action).toEqual({ type: "GO", direction: "north" });
  });

  it("returns an error for unrecognized commands", () => {
    const result = mapCommand("fly to the moon", sampleActions);
    expect(result.action).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error).toContain("don't understand");
  });

  it("error message lists valid verbs", () => {
    const result = mapCommand("xyz", sampleActions);
    expect(result.error).toContain("go");
    expect(result.error).toContain("take");
    expect(result.error).toContain("look");
  });
});

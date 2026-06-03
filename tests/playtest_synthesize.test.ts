import { describe, it, expect } from "vitest";
import {
  readRawFeedback,
  synthesizeFeedback,
  writeFeedbackDigest,
} from "../src/playtest/synthesize.js";
import type { PlaytestSessionResult } from "../src/playtest/types.js";
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Helper: create a mock PlaytestSessionResult */
function mockSession(overrides: Partial<PlaytestSessionResult> = {}): PlaytestSessionResult {
  return {
    sessionId: `test-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    packId: "chapel_pack_v1",
    persona: "explorer",
    modelUsed: "mock",
    totalSteps: 50,
    playtimeSeconds: 120,
    outcome: "completed",
    endingReached: "good_ending",
    deaths: 0,
    progressPct: 80,
    uniqueRoomsVisited: 8,
    totalRoomsAvailable: 10,
    uniqueItemsUsed: 5,
    npcDialoguesCompleted: 2,
    puzzlesSolved: 3,
    puzzlesEncountered: 4,
    actionsRejected: 1,
    turnsStuck: 2,
    backtrackCount: 1,
    helpRequested: 0,
    traceFile: "traces/test.json",
    interview: {
      q01_fun: "Yes, it was engaging",
      q02_best: "The atmospheric descriptions",
      q03_worst: "Getting stuck at the locked door",
      q04_one_change: "More verb synonyms",
      q05_confused: "Yes, at the crypt door for 5 turns",
      q06_commands: "UNLOCK was rejected but should have worked",
      q07_story: "Clear medieval crypt exploration",
      q08_ending: "A bit abrupt after the boss fight",
      q09_difficulty: "Fair overall, one unfair puzzle",
      q10_recommend: "Yes, with improvements",
    },
    ...overrides,
  };
}

const TEST_DIR = join(import.meta.dirname ?? ".", ".test-output");

describe("readRawFeedback", () => {
  it("should parse valid JSONL files", () => {
    const filePath = join(TEST_DIR, "test_feedback.jsonl");
    mkdirSync(TEST_DIR, { recursive: true });

    const sessions = [mockSession(), mockSession({ packId: "forest_pack_v1" })];
    const content = sessions.map((s) => JSON.stringify(s)).join("\n");
    writeFileSync(filePath, content);

    const result = readRawFeedback(filePath);
    expect(result).toHaveLength(2);
    expect(result[0].packId).toBe("chapel_pack_v1");
    expect(result[1].packId).toBe("forest_pack_v1");

    unlinkSync(filePath);
  });

  it("should skip empty lines and invalid JSON", () => {
    const filePath = join(TEST_DIR, "test_feedback_bad.jsonl");
    mkdirSync(TEST_DIR, { recursive: true });

    const validSession = mockSession();
    const content = [
      JSON.stringify(validSession),
      "",
      "not valid json",
      "",
      JSON.stringify(mockSession()),
    ].join("\n");
    writeFileSync(filePath, content);

    const result = readRawFeedback(filePath);
    expect(result).toHaveLength(2);

    unlinkSync(filePath);
  });
});

describe("synthesizeFeedback", () => {
  it("should produce valid markdown with all sections", () => {
    const sessions = [
      mockSession({ persona: "explorer" }),
      mockSession({ persona: "speedrunner", outcome: "stuck", actionsRejected: 8 }),
      mockSession({ persona: "adversarial", outcome: "died", deaths: 2 }),
      mockSession({ persona: "new_player", outcome: "quit_confused" }),
    ];

    const digest = synthesizeFeedback(sessions);

    // Should have all major sections
    expect(digest).toContain("# Playtest Digest");
    expect(digest).toContain("## 📊 Quick Stats");
    expect(digest).toContain("## 🔴 BLOCKING");
    expect(digest).toContain("## 🟡 RECURRING FRICTION");
    expect(digest).toContain("## 🟢 WORKING WELL");
    expect(digest).toContain("## 📋 Interview Highlights");
    expect(digest).toContain("## 🎯 SUGGESTED PRIORITIES");
  });

  it("should include session count in header", () => {
    const sessions = [mockSession(), mockSession(), mockSession()];
    const digest = synthesizeFeedback(sessions);
    expect(digest).toContain("3 sessions");
  });

  it("should detect blocking issues when >50% stuck or died", () => {
    const sessions = [
      mockSession({ outcome: "stuck" }),
      mockSession({ outcome: "stuck" }),
      mockSession({ outcome: "died" }),
      mockSession({ outcome: "completed" }),
    ];

    const digest = synthesizeFeedback(sessions);
    expect(digest).toContain("BLOCKING");
    expect(digest).toContain("stuck/death");
  });

  it("should detect verb/parser issues with high rejection rates", () => {
    const sessions = [
      mockSession({ actionsRejected: 10 }),
      mockSession({ actionsRejected: 8 }),
    ];

    const digest = synthesizeFeedback(sessions);
    expect(digest).toContain("rejected");
  });

  it("should group stats by pack", () => {
    const sessions = [
      mockSession({ packId: "chapel_pack_v1" }),
      mockSession({ packId: "chapel_pack_v1" }),
      mockSession({ packId: "forest_pack_v1" }),
    ];

    const digest = synthesizeFeedback(sessions);
    expect(digest).toContain("chapel_pack_v1");
    expect(digest).toContain("forest_pack_v1");
  });

  it("should handle empty sessions array", () => {
    const digest = synthesizeFeedback([]);
    expect(digest).toContain("# Playtest Digest");
    expect(digest).toContain("0 sessions");
  });

  it("should extract positive themes from q02_best answers", () => {
    const sessions = [
      mockSession({
        interview: {
          ...mockSession().interview,
          q02_best: "The atmospheric descriptions were amazing",
        },
      }),
      mockSession({
        interview: {
          ...mockSession().interview,
          q02_best: "Atmospheric descriptions really pulled me in",
        },
      }),
    ];

    const digest = synthesizeFeedback(sessions);
    expect(digest).toContain("WORKING WELL");
  });
});

describe("writeFeedbackDigest", () => {
  it("should write digest to file", () => {
    const filePath = join(TEST_DIR, "test_digest.md");
    mkdirSync(TEST_DIR, { recursive: true });

    const sessions = [mockSession()];
    writeFeedbackDigest(sessions, filePath);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("# Playtest Digest");
    expect(content).toContain("chapel_pack_v1");

    unlinkSync(filePath);
  });
});

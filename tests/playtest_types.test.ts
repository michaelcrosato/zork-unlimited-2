import { describe, it, expect } from "vitest";
import { INTERVIEW_QUESTIONS } from "../src/playtest/types.js";
import type {
  PlaytestPersona,
  PlaytestMetrics,
  PlaytestInterview,
  PlaytestSessionResult,
  PlaytestTurnLog,
} from "../src/playtest/types.js";

describe("PlaytestPersona type", () => {
  it("should accept a valid persona object", () => {
    const persona: PlaytestPersona = {
      id: "explorer",
      name: "Explorer",
      style: "Visit every room",
      priority: "Coverage",
      quitThreshold: "Never quit",
    };
    expect(persona.id).toBe("explorer");
    expect(persona.name).toBe("Explorer");
  });
});

describe("PlaytestMetrics type", () => {
  it("should accept valid metrics with all outcome types", () => {
    const outcomes: PlaytestMetrics["outcome"][] = [
      "completed",
      "stuck",
      "died",
      "quit_confused",
      "quit_bored",
      "max_steps",
    ];

    for (const outcome of outcomes) {
      const metrics: PlaytestMetrics = {
        sessionId: "test-123",
        timestamp: new Date().toISOString(),
        packId: "chapel_pack_v1",
        persona: "explorer",
        modelUsed: "mock",
        totalSteps: 50,
        playtimeSeconds: 120,
        outcome,
        endingReached: null,
        deaths: 0,
        progressPct: 50,
        uniqueRoomsVisited: 5,
        totalRoomsAvailable: 10,
        uniqueItemsUsed: 3,
        npcDialoguesCompleted: 1,
        puzzlesSolved: 2,
        puzzlesEncountered: 3,
        actionsRejected: 1,
        turnsStuck: 2,
        backtrackCount: 1,
        helpRequested: 0,
        traceFile: "traces/test.json",
      };
      expect(metrics.outcome).toBe(outcome);
    }
  });
});

describe("PlaytestInterview type", () => {
  it("should have exactly 10 question fields", () => {
    const interview: PlaytestInterview = {
      q01_fun: "Yes, it was fun",
      q02_best: "The trap was great",
      q03_worst: "Getting stuck at the door",
      q04_one_change: "More verb synonyms",
      q05_confused: "Yes, at the crypt door",
      q06_commands: "UNLOCK was rejected",
      q07_story: "Medieval crypt adventure",
      q08_ending: "A bit abrupt",
      q09_difficulty: "Just right mostly",
      q10_recommend: "Yes, with fixes",
    };
    const keys = Object.keys(interview);
    expect(keys).toHaveLength(10);
    expect(keys[0]).toBe("q01_fun");
    expect(keys[9]).toBe("q10_recommend");
  });
});

describe("INTERVIEW_QUESTIONS", () => {
  it("should have exactly 10 questions", () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(10);
  });

  it("should have unique keys matching PlaytestInterview fields", () => {
    const keys = INTERVIEW_QUESTIONS.map((q) => q.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(10);
    expect(keys).toContain("q01_fun");
    expect(keys).toContain("q10_recommend");
  });

  it("should have non-empty questions", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      expect(q.question.length).toBeGreaterThan(10);
    }
  });
});

describe("PlaytestSessionResult type", () => {
  it("should combine metrics and interview", () => {
    const result: PlaytestSessionResult = {
      sessionId: "test-456",
      timestamp: new Date().toISOString(),
      packId: "chapel_pack_v1",
      persona: "speedrunner",
      modelUsed: "gemini-flash",
      totalSteps: 30,
      playtimeSeconds: 60,
      outcome: "completed",
      endingReached: "good_ending",
      deaths: 0,
      progressPct: 100,
      uniqueRoomsVisited: 10,
      totalRoomsAvailable: 10,
      uniqueItemsUsed: 5,
      npcDialoguesCompleted: 2,
      puzzlesSolved: 4,
      puzzlesEncountered: 4,
      actionsRejected: 0,
      turnsStuck: 0,
      backtrackCount: 0,
      helpRequested: 0,
      traceFile: "traces/test.json",
      interview: {
        q01_fun: "Yes",
        q02_best: "Speed",
        q03_worst: "Nothing",
        q04_one_change: "More paths",
        q05_confused: "No",
        q06_commands: "All worked",
        q07_story: "Clear",
        q08_ending: "Satisfying",
        q09_difficulty: "Easy",
        q10_recommend: "Yes",
      },
    };
    expect(result.interview.q01_fun).toBe("Yes");
    expect(result.outcome).toBe("completed");
    expect(result.endingReached).toBe("good_ending");
  });
});

describe("PlaytestTurnLog type", () => {
  it("should track per-turn data", () => {
    const log: PlaytestTurnLog = {
      step: 1,
      roomId: "forest_path",
      action: "go north",
      observation: "You walk north into a dark chapel...",
      wasRejected: false,
      reasonForChoice: "Exploring the only visible exit",
    };
    expect(log.step).toBe(1);
    expect(log.wasRejected).toBe(false);
  });
});

/**
 * Blind Playtester Agent
 *
 * Plays the game via MCP (zero code knowledge) using an LLM for decision-making.
 * Records hard metrics and conducts a post-game interview.
 *
 * This is the core of Layer 2 (volume blind playtesting).
 */
import { randomUUID } from "node:crypto";
import { McpGameClient } from "./mcp_client.js";
import { LlmClient } from "../agents/llm/client.js";
import { getPersona } from "./personas.js";
import { INTERVIEW_QUESTIONS } from "./types.js";
import type {
  PlaytestPersona,
  PlaytestMetrics,
  PlaytestInterview,
  PlaytestSessionResult,
  PlaytestTurnLog,
} from "./types.js";

/** Options for running a blind playtest session */
export type BlindPlaytestOptions = {
  /** The adventure pack ID to play (e.g., 'chapel_pack_v1') */
  packId: string;
  /** The persona ID to use (e.g., 'explorer', 'speedrunner') */
  personaId: string;
  /** The LLM client to use for decision-making */
  llmClient: LlmClient;
  /** Max steps before the session is terminated (default: 100) */
  maxSteps?: number;
  /** RNG seed for the game (default: random) */
  seed?: number;
  /** Model name string for recording (default: 'unknown') */
  modelName?: string;
};

/** Result of a blind playtest session including turn logs */
export type BlindPlaytestResult = {
  session: PlaytestSessionResult;
  turnLogs: PlaytestTurnLog[];
  error?: string;
};

/**
 * Build the system prompt for the blind playtester LLM.
 * The LLM receives ONLY: persona instructions + game genre hint.
 * NO code knowledge, NO puzzle solutions, NO internal state.
 */
function buildPlaytesterSystemPrompt(persona: PlaytestPersona): string {
  return `You are a player playing a text adventure game. You have NEVER played this game before and know NOTHING about its puzzles, story, or layout.

YOUR PERSONA: ${persona.name}
PLAY STYLE: ${persona.style}
PRIORITY: ${persona.priority}
QUIT THRESHOLD: ${persona.quitThreshold}

RULES:
1. You can only see what the game tells you (room descriptions, items, exits, available actions).
2. Choose your next action based ONLY on what you observe.
3. Stay in character as your persona at all times.
4. If stuck, try different approaches before giving up.
5. Pay attention to descriptions — they contain clues.

You will receive the current game observation and must respond with your chosen action and reasoning.`;
}

/**
 * Build the system prompt for the post-game interview.
 */
function buildInterviewSystemPrompt(persona: PlaytestPersona): string {
  return `You just finished playing a text adventure game as a "${persona.name}" player.
You are now being interviewed about your experience. Answer honestly and specifically based on what actually happened during your playthrough.
Keep answers concise (1-3 sentences each). Use specific examples from the game.
If a question doesn't apply to your experience, say so briefly.`;
}

/**
 * Run a single blind playtest session.
 *
 * Flow:
 * 1. Connect to MCP server (spawn subprocess)
 * 2. Start the game
 * 3. Play turn-by-turn using LLM for decisions
 * 4. Record metrics throughout
 * 5. Run post-game interview
 * 6. Disconnect and return results
 */
export async function runBlindPlaytest(
  options: BlindPlaytestOptions
): Promise<BlindPlaytestResult> {
  const {
    packId,
    personaId,
    llmClient,
    maxSteps = 100,
    seed,
    modelName = "unknown",
  } = options;

  const sessionId = randomUUID();
  const persona = getPersona(personaId);
  const mcpSessionId = `blind-${sessionId.slice(0, 8)}`;
  const client = new McpGameClient(mcpSessionId);

  // Initialize metrics
  const startTime = Date.now();
  const turnLogs: PlaytestTurnLog[] = [];
  let deaths = 0;
  let actionsRejected = 0;
  let turnsStuck = 0;
  let backtrackCount = 0;
  let helpRequested = 0;
  let puzzlesSolved = 0;
  let puzzlesEncountered = 0;
  let npcDialoguesCompleted = 0;
  const roomsVisited = new Set<string>();
  const itemsUsed = new Set<string>();
  let lastRoomId = "";
  let consecutiveStuckTurns = 0;
  let outcome: PlaytestMetrics["outcome"] = "max_steps";
  let endingReached: string | null = null;
  let currentStep = 0;

  try {
    // 1. Connect to MCP server
    await client.connect();

    // 2. Start the game
    const startObservation = await client.startGame(packId, seed);
    let currentObservation = startObservation;

    // Extract initial room from observation
    let currentRoomId = extractRoomId(currentObservation);
    roomsVisited.add(currentRoomId);

    // 3. Play turn-by-turn
    const systemPrompt = buildPlaytesterSystemPrompt(persona);
    let shouldQuit = false;

    while (currentStep < maxSteps && !shouldQuit) {
      // Check if game ended
      if (client.isGameOver(currentObservation)) {
        // Determine if it was a death or completion
        if (
          currentObservation.includes("died") ||
          currentObservation.includes("killed") ||
          currentObservation.includes("dead")
        ) {
          deaths++;
          outcome = "died";
        } else {
          outcome = "completed";
        }
        endingReached = extractEndingId(currentObservation);
        break;
      }

      // 4. Ask LLM to choose an action
      let actionChoice: {
        action: string;
        reason: string;
        want_to_quit: boolean;
      };

      try {
        actionChoice = await llmClient.completeJson<{
          action: string;
          reason: string;
          want_to_quit: boolean;
        }>({
          role: "playtester",
          system: systemPrompt,
          input: {
            observation: currentObservation,
            step: currentStep + 1,
            total_steps_remaining: maxSteps - currentStep,
            persona: persona.id,
            rooms_visited: Array.from(roomsVisited),
            inventory_context: "Check the observation for your current inventory.",
          },
          schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                description:
                  "The exact command to type in the game (e.g., 'go north', 'take key', 'talk to hermit')",
              },
              reason: {
                type: "string",
                description:
                  "Brief explanation of why you chose this action (1 sentence)",
              },
              want_to_quit: {
                type: "boolean",
                description:
                  "Set to true if you want to stop playing based on your persona's quit threshold",
              },
            },
            required: ["action", "reason", "want_to_quit"],
          },
          seed: seed !== undefined ? seed + currentStep : undefined,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          session: buildSessionResult({
            sessionId,
            packId,
            personaId,
            modelName,
            startTime,
            currentStep,
            outcome: "stuck",
            endingReached: null,
            deaths,
            roomsVisited,
            itemsUsed,
            npcDialoguesCompleted,
            puzzlesSolved,
            puzzlesEncountered,
            actionsRejected,
            turnsStuck,
            backtrackCount,
            helpRequested,
            totalRoomsAvailable: 0,
          }),
          turnLogs,
          error: `LLM failed at step ${currentStep}: ${errMsg}`,
        };
      }

      // Check if persona wants to quit
      if (actionChoice.want_to_quit) {
        shouldQuit = true;
        // Determine quit reason based on persona
        if (
          persona.id === "new_player" ||
          persona.id === "narrative_seeker"
        ) {
          outcome =
            consecutiveStuckTurns > 5 ? "quit_confused" : "quit_bored";
        } else {
          outcome = "quit_confused";
        }
        break;
      }

      const action = actionChoice.action;

      // Track help requests
      if (
        action.toLowerCase().includes("help") ||
        action.toLowerCase().includes("hint")
      ) {
        helpRequested++;
      }

      // Track item usage
      const itemMatch = action.match(
        /(?:use|take|drop|give|unlock|open)\s+(.+?)(?:\s+(?:on|with|to)\s+|$)/i
      );
      if (itemMatch) {
        itemsUsed.add(itemMatch[1].toLowerCase());
      }

      // 5. Execute the action via MCP
      const result = await client.executeAction(action);

      // Log the turn
      turnLogs.push({
        step: currentStep + 1,
        roomId: currentRoomId,
        action,
        observation: result.text.slice(0, 500), // truncate for storage
        wasRejected: result.isError,
        reasonForChoice: actionChoice.reason,
      });

      if (result.isError) {
        actionsRejected++;
        consecutiveStuckTurns++;
        // Don't update observation on error — stay in same state
      } else {
        currentObservation = result.text;
        consecutiveStuckTurns = 0;

        // Track room changes
        const newRoomId = extractRoomId(currentObservation);
        if (newRoomId !== currentRoomId) {
          if (roomsVisited.has(newRoomId)) {
            backtrackCount++;
          }
          roomsVisited.add(newRoomId);
          lastRoomId = currentRoomId;
          currentRoomId = newRoomId;
        }

        // Track NPC dialogue
        if (
          action.toLowerCase().startsWith("talk") ||
          action.toLowerCase().startsWith("ask")
        ) {
          npcDialoguesCompleted++;
        }

        // Track puzzle-related events
        if (
          currentObservation.includes("unlocked") ||
          currentObservation.includes("solved") ||
          currentObservation.includes("opened") ||
          currentObservation.includes("discovered")
        ) {
          puzzlesSolved++;
        }
      }

      // Track stuck turns
      if (consecutiveStuckTurns > 0) {
        turnsStuck++;
      }

      currentStep++;
    }

    // If we hit max steps
    if (currentStep >= maxSteps && outcome === "max_steps") {
      outcome = "stuck"; // Ran out of steps = effectively stuck
    }

    // 6. Run post-game interview
    const interview = await runPostGameInterview({
      llmClient,
      persona,
      turnLogs,
      outcome,
      currentStep,
      seed,
    });

    // 7. Build final result
    const session = buildSessionResult({
      sessionId,
      packId,
      personaId,
      modelName,
      startTime,
      currentStep,
      outcome,
      endingReached,
      deaths,
      roomsVisited,
      itemsUsed,
      npcDialoguesCompleted,
      puzzlesSolved,
      puzzlesEncountered,
      actionsRejected,
      turnsStuck,
      backtrackCount,
      helpRequested,
      totalRoomsAvailable: 0, // We don't know this from MCP (blind!)
    });
    session.interview = interview;

    return { session, turnLogs };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      session: buildSessionResult({
        sessionId,
        packId,
        personaId,
        modelName,
        startTime,
        currentStep,
        outcome: "stuck",
        endingReached: null,
        deaths,
        roomsVisited,
        itemsUsed,
        npcDialoguesCompleted,
        puzzlesSolved,
        puzzlesEncountered,
        actionsRejected,
        turnsStuck,
        backtrackCount,
        helpRequested,
        totalRoomsAvailable: 0,
      }),
      turnLogs,
      error: `Session crashed: ${errMsg}`,
    };
  } finally {
    // Always clean up
    await client.disconnect();
  }
}

/**
 * Run the post-game interview with the playtester LLM.
 */
async function runPostGameInterview(options: {
  llmClient: LlmClient;
  persona: PlaytestPersona;
  turnLogs: PlaytestTurnLog[];
  outcome: string;
  currentStep: number;
  seed?: number;
}): Promise<PlaytestInterview> {
  const { llmClient, persona, turnLogs, outcome, currentStep, seed } = options;

  // Build a summary of the playthrough for context
  const playSummary = buildPlaySummary(turnLogs, outcome, currentStep);

  const interviewSystemPrompt = buildInterviewSystemPrompt(persona);

  const questionBlock = INTERVIEW_QUESTIONS.map(
    (q) => `${q.key}: ${q.question}`
  ).join("\n");

  try {
    const interviewResult = await llmClient.completeJson<PlaytestInterview>({
      role: "playtester",
      system: interviewSystemPrompt,
      input: {
        playthrough_summary: playSummary,
        outcome,
        total_steps: currentStep,
        questions: questionBlock,
        instruction:
          "Answer each question in 1-3 sentences based on your actual playthrough experience. Be honest and specific.",
      },
      schema: {
        type: "object",
        properties: {
          q01_fun: { type: "string" },
          q02_best: { type: "string" },
          q03_worst: { type: "string" },
          q04_one_change: { type: "string" },
          q05_confused: { type: "string" },
          q06_commands: { type: "string" },
          q07_story: { type: "string" },
          q08_ending: { type: "string" },
          q09_difficulty: { type: "string" },
          q10_recommend: { type: "string" },
        },
        required: [
          "q01_fun",
          "q02_best",
          "q03_worst",
          "q04_one_change",
          "q05_confused",
          "q06_commands",
          "q07_story",
          "q08_ending",
          "q09_difficulty",
          "q10_recommend",
        ],
      },
      seed: seed !== undefined ? seed + 9999 : undefined,
    });

    return interviewResult;
  } catch {
    // If interview fails, return placeholder answers
    return {
      q01_fun: "[Interview failed — LLM error]",
      q02_best: "[Interview failed — LLM error]",
      q03_worst: "[Interview failed — LLM error]",
      q04_one_change: "[Interview failed — LLM error]",
      q05_confused: "[Interview failed — LLM error]",
      q06_commands: "[Interview failed — LLM error]",
      q07_story: "[Interview failed — LLM error]",
      q08_ending: "[Interview failed — LLM error]",
      q09_difficulty: "[Interview failed — LLM error]",
      q10_recommend: "[Interview failed — LLM error]",
    };
  }
}

/**
 * Build a concise play summary for the interview context.
 */
function buildPlaySummary(
  turnLogs: PlaytestTurnLog[],
  outcome: string,
  totalSteps: number
): string {
  if (turnLogs.length === 0) {
    return "You did not play any turns.";
  }

  const roomsVisited = new Set(turnLogs.map((t) => t.roomId));
  const rejectedActions = turnLogs.filter((t) => t.wasRejected);
  const lastFewTurns = turnLogs
    .slice(-5)
    .map(
      (t) =>
        `Step ${t.step}: [${t.roomId}] ${t.action}${t.wasRejected ? " (REJECTED)" : ""}`
    )
    .join("\n");

  return `Playthrough summary:
- Total steps: ${totalSteps}
- Outcome: ${outcome}
- Rooms visited: ${roomsVisited.size} (${Array.from(roomsVisited).join(", ")})
- Actions rejected: ${rejectedActions.length}
- Last few turns:
${lastFewTurns}`;
}

/**
 * Extract room ID from MCP observation text.
 * Looks for "--- ROOM: {name}" or "--- SCENE: {id}" pattern.
 */
function extractRoomId(observationText: string): string {
  const roomMatch = observationText.match(/--- ROOM:\s*([^|]+)/);
  if (roomMatch) return roomMatch[1].trim();

  const sceneMatch = observationText.match(/--- SCENE:\s*([^|]+)/);
  if (sceneMatch) return sceneMatch[1].trim();

  return "unknown";
}

/**
 * Extract ending ID from game-over observation text.
 * Looks for "GAME OVER: {id}" pattern.
 */
function extractEndingId(observationText: string): string | null {
  const match = observationText.match(/GAME OVER:\s*(\S+)/);
  return match ? match[1] : null;
}

/**
 * Build the final session result with metrics.
 */
function buildSessionResult(params: {
  sessionId: string;
  packId: string;
  personaId: string;
  modelName: string;
  startTime: number;
  currentStep: number;
  outcome: PlaytestMetrics["outcome"];
  endingReached: string | null;
  deaths: number;
  roomsVisited: Set<string>;
  itemsUsed: Set<string>;
  npcDialoguesCompleted: number;
  puzzlesSolved: number;
  puzzlesEncountered: number;
  actionsRejected: number;
  turnsStuck: number;
  backtrackCount: number;
  helpRequested: number;
  totalRoomsAvailable: number;
}): PlaytestSessionResult {
  const playtimeSeconds = Math.round((Date.now() - params.startTime) / 1000);

  // Estimate progress: rooms visited as % of total (or 0 if unknown)
  const progressPct =
    params.totalRoomsAvailable > 0
      ? Math.round(
          (params.roomsVisited.size / params.totalRoomsAvailable) * 100
        )
      : 0;

  return {
    sessionId: params.sessionId,
    timestamp: new Date().toISOString(),
    packId: params.packId,
    persona: params.personaId,
    modelUsed: params.modelName,
    totalSteps: params.currentStep,
    playtimeSeconds,
    outcome: params.outcome,
    endingReached: params.endingReached,
    deaths: params.deaths,
    progressPct,
    uniqueRoomsVisited: params.roomsVisited.size,
    totalRoomsAvailable: params.totalRoomsAvailable,
    uniqueItemsUsed: params.itemsUsed.size,
    npcDialoguesCompleted: params.npcDialoguesCompleted,
    puzzlesSolved: params.puzzlesSolved,
    puzzlesEncountered: params.puzzlesEncountered,
    actionsRejected: params.actionsRejected,
    turnsStuck: params.turnsStuck,
    backtrackCount: params.backtrackCount,
    helpRequested: params.helpRequested,
    traceFile: `traces/playtest_${params.sessionId}.json`,
    // Interview will be set by the caller after running the interview
    interview: {
      q01_fun: "",
      q02_best: "",
      q03_worst: "",
      q04_one_change: "",
      q05_confused: "",
      q06_commands: "",
      q07_story: "",
      q08_ending: "",
      q09_difficulty: "",
      q10_recommend: "",
    },
  };
}

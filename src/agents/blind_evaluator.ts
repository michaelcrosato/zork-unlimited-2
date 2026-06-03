import { LlmClient } from "./llm/client.js";
import { PlaytestLogEntry } from "./playtester.js";
import { Trace } from "../trace/record.js";
import { PureRand } from "../core/rng.js";

export type AnonymizedCandidate = {
  candidateId: string;
  logs: PlaytestLogEntry[];
  trace: Trace;
};

export type RubricScore = {
  effectiveness: number; // 0-10 (Goal completion)
  efficiency: number;    // 0-10 (Turn/step count optimization and zero rejections)
  exploration: number;   // 0-10 (Interactions, dialogues, and item coverage)
  reasoning: string;     // Qualitative rationale
};

export type BlindEvalResult = {
  success: boolean;
  blindedWinnerKey: "alpha" | "beta" | "tie";
  winnerId: string;
  candidateAlphaId: string;
  candidateBetaId: string;
  alphaScore: RubricScore;
  betaScore: RubricScore;
  decryptionLog: string;
};

/**
 * Conducts a double-blind playtest evaluation comparing two playthrough candidates.
 * Uses randomized assignment and swap-balancing order to combat positional judge bias,
 * and scores both candidates against a strict multi-dimensional playtest rubric.
 */
export async function runBlindEvaluation(options: {
  candidateA: AnonymizedCandidate;
  candidateB: AnonymizedCandidate;
  client: LlmClient;
  seed: number;
}): Promise<BlindEvalResult> {
  const { candidateA, candidateB, client, seed } = options;

  // 1. Assign "Alpha" and "Beta" randomly to anonymize the sources
  const { value: randVal, nextSeed: seedAfterRandomizer } = PureRand.next(seed);
  const assignAToAlpha = randVal >= 0.5;

  const candidateAlpha = assignAToAlpha ? candidateA : candidateB;
  const candidateBeta = assignAToAlpha ? candidateB : candidateA;

  // 2. Anonymize trajectories: strip actual IDs or explicit version markers from logs/traces
  const stripIdentity = (cand: AnonymizedCandidate): any => {
    return {
      stepsCount: cand.logs.length,
      finalResult: cand.logs[cand.logs.length - 1]?.result ?? "unknown",
      trajectory: cand.logs.map((entry) => ({
        step: entry.step,
        location: entry.location,
        chosenActionId: entry.chosen_action_id,
        effects: entry.actual_effects,
        result: entry.result,
      })),
    };
  };

  const anonAlpha = stripIdentity(candidateAlpha);
  const anonBeta = stripIdentity(candidateBeta);

  // 3. Sweep #1: Option 1 = Alpha, Option 2 = Beta
  let scoreSweep1: {
    option_1_scores: Omit<RubricScore, "reasoning">;
    option_2_scores: Omit<RubricScore, "reasoning">;
    rationale: string;
  };

  try {
    scoreSweep1 = await client.completeJson<{
      option_1_scores: Omit<RubricScore, "reasoning">;
      option_2_scores: Omit<RubricScore, "reasoning">;
      rationale: string;
    }>({
      role: "debugger",
      system: `You are an elite QA Double-Blind Playtest Evaluator. Your goal is to grade two anonymized game playtest trajectories strictly and objectively.
Analyze their goal completion, exploration curiosity, and pathway efficiency (preferring fewer turns and zero rejected/failed moves).
Assign integer scores from 0 to 10 for both options across all categories.`,
      input: {
        option_1: anonAlpha,
        option_2: anonBeta,
        rubric: {
          effectiveness: "Goal completion rate. Reaching a win ending is 10/10; getting stuck or dying is < 5/10.",
          efficiency: "Minimizing step counts and avoiding rejected/invalid commands.",
          exploration: "Exhausting dialogue trees, inspecting items, and visiting distinct rooms."
        }
      },
      schema: {
        type: "object",
        properties: {
          option_1_scores: {
            type: "object",
            properties: {
              effectiveness: { type: "number" },
              efficiency: { type: "number" },
              exploration: { type: "number" },
            },
            required: ["effectiveness", "efficiency", "exploration"],
          },
          option_2_scores: {
            type: "object",
            properties: {
              effectiveness: { type: "number" },
              efficiency: { type: "number" },
              exploration: { type: "number" },
            },
            required: ["effectiveness", "efficiency", "exploration"],
          },
          rationale: { type: "string" },
        },
        required: ["option_1_scores", "option_2_scores", "rationale"],
      },
      seed: seedAfterRandomizer,
    });
  } catch (err: any) {
    throw new Error(`LLM Blind Evaluator Sweep 1 failed: ${err.message}`);
  }

  // 4. Sweep #2: Swap-balancing order to combat positional judge bias (Option 1 = Beta, Option 2 = Alpha)
  let scoreSweep2: {
    option_1_scores: Omit<RubricScore, "reasoning">;
    option_2_scores: Omit<RubricScore, "reasoning">;
    rationale: string;
  };

  try {
    scoreSweep2 = await client.completeJson<{
      option_1_scores: Omit<RubricScore, "reasoning">;
      option_2_scores: Omit<RubricScore, "reasoning">;
      rationale: string;
    }>({
      role: "debugger",
      system: `You are an elite QA Double-Blind Playtest Evaluator. Your goal is to grade two anonymized game playtest trajectories strictly and objectively.
This is a swapped order validation sweep to verify consistency and combat positional bias. Grade both trajectories strictly on the rubric.`,
      input: {
        option_1: anonBeta,
        option_2: anonAlpha,
        rubric: {
          effectiveness: "Goal completion rate. Reaching a win ending is 10/10; getting stuck or dying is < 5/10.",
          efficiency: "Minimizing step counts and avoiding rejected/invalid commands.",
          exploration: "Exhausting dialogue trees, inspecting items, and visiting distinct rooms."
        }
      },
      schema: {
        type: "object",
        properties: {
          option_1_scores: {
            type: "object",
            properties: {
              effectiveness: { type: "number" },
              efficiency: { type: "number" },
              exploration: { type: "number" },
            },
            required: ["effectiveness", "efficiency", "exploration"],
          },
          option_2_scores: {
            type: "object",
            properties: {
              effectiveness: { type: "number" },
              efficiency: { type: "number" },
              exploration: { type: "number" },
            },
            required: ["effectiveness", "efficiency", "exploration"],
          },
          rationale: { type: "string" },
        },
        required: ["option_1_scores", "option_2_scores", "rationale"],
      },
      seed: seedAfterRandomizer + 1,
    });
  } catch (err: any) {
    throw new Error(`LLM Blind Evaluator Sweep 2 failed: ${err.message}`);
  }

  // 5. Aggregate scores mathematically across both sweeps to derive swap-balanced average scores
  const alphaEffectiveness = (scoreSweep1.option_1_scores.effectiveness + scoreSweep2.option_2_scores.effectiveness) / 2;
  const alphaEfficiency = (scoreSweep1.option_1_scores.efficiency + scoreSweep2.option_2_scores.efficiency) / 2;
  const alphaExploration = (scoreSweep1.option_1_scores.exploration + scoreSweep2.option_2_scores.exploration) / 2;

  const betaEffectiveness = (scoreSweep1.option_2_scores.effectiveness + scoreSweep2.option_1_scores.effectiveness) / 2;
  const betaEfficiency = (scoreSweep1.option_2_scores.efficiency + scoreSweep2.option_1_scores.efficiency) / 2;
  const betaExploration = (scoreSweep1.option_2_scores.exploration + scoreSweep2.option_1_scores.exploration) / 2;

  const alphaTotal = alphaEffectiveness + alphaEfficiency + alphaExploration;
  const betaTotal = betaEffectiveness + betaEfficiency + betaExploration;

  const blindedWinnerKey = alphaTotal > betaTotal ? "alpha" : betaTotal > alphaTotal ? "beta" : "tie";

  // 6. Decryption of candidate identities
  const winnerId = blindedWinnerKey === "alpha"
    ? candidateAlpha.candidateId
    : blindedWinnerKey === "beta"
    ? candidateBeta.candidateId
    : "Tie Game";

  const decryptionLog = `Blind Decryption: Candidate Alpha was resolved to '${candidateAlpha.candidateId}'. Candidate Beta was resolved to '${candidateBeta.candidateId}'. Winner resolved to '${winnerId}'.`;

  return {
    success: true,
    blindedWinnerKey,
    winnerId,
    candidateAlphaId: candidateAlpha.candidateId,
    candidateBetaId: candidateBeta.candidateId,
    alphaScore: {
      effectiveness: alphaEffectiveness,
      efficiency: alphaEfficiency,
      exploration: alphaExploration,
      reasoning: scoreSweep1.rationale,
    },
    betaScore: {
      effectiveness: betaEffectiveness,
      efficiency: betaEfficiency,
      exploration: betaExploration,
      reasoning: scoreSweep2.rationale,
    },
    decryptionLog,
  };
}

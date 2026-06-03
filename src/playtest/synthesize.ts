/**
 * Playtest Feedback Synthesis Module
 *
 * Reads raw playtest feedback from a JSONL file (`feedback_raw.jsonl`) and
 * produces a consolidated markdown digest. Designed to run periodically
 * (every 24h or after N sessions) as part of the playtest feedback pipeline.
 *
 * @module playtest/synthesize
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PlaytestSessionResult } from "./types.js";

// ─── Internal aggregate type ────────────────────────────────────────────────

/**
 * Computed aggregate statistics for a group of sessions (typically one pack).
 * This is distinct from {@link PlaytestMetrics}, which captures raw per-session data.
 */
interface PackAggregateStats {
  readonly sessionCount: number;
  readonly avgProgress: number;
  readonly avgPlaytime: number;
  readonly deathRate: number;
  readonly stuckRate: number;
  readonly completedCount: number;
  readonly avgActionsRejected: number;
  readonly avgRoomsVisited: number;
}

// ─── Stop words for theme extraction ────────────────────────────────────────

/** Common English stop words to exclude from keyword frequency analysis. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "its",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "they",
  "them",
  "their",
  "his",
  "her",
  "not",
  "no",
  "nor",
  "so",
  "if",
  "then",
  "than",
  "too",
  "very",
  "just",
  "about",
  "up",
  "out",
  "all",
  "also",
  "as",
  "are",
  "am",
  "what",
  "which",
  "who",
  "when",
  "where",
  "how",
  "there",
  "here",
  "more",
  "some",
  "any",
  "each",
  "every",
  "both",
  "few",
  "many",
  "much",
  "other",
  "into",
  "over",
  "after",
  "before",
  "between",
  "under",
  "again",
  "further",
  "once",
  "only",
  "own",
  "same",
  "such",
  "like",
  "get",
  "got",
  "really",
  "thing",
  "things",
  "game",
  "dont",
  "don't",
  "didnt",
  "didn't",
  "went",
  "going",
  "make",
  "made",
]);

/** Negative-sentiment keywords used to identify recurring friction in interview answers. */
const FRICTION_KEYWORDS = [
  "confused",
  "confusing",
  "stuck",
  "rejected",
  "broken",
  "frustrating",
  "frustration",
  "annoying",
  "annoyed",
  "unclear",
  "bug",
  "buggy",
  "impossible",
  "unfair",
  "tedious",
  "boring",
  "lost",
  "error",
];

// ─── JSONL Reading ──────────────────────────────────────────────────────────

/**
 * Read a JSONL file containing playtest session results.
 *
 * Each line is expected to be a JSON object matching {@link PlaytestSessionResult}.
 * Empty lines and lines that fail to parse are silently skipped (with a
 * warning logged to stderr).
 *
 * @param filePath - Absolute or relative path to the `.jsonl` file.
 * @returns Array of parsed session results.
 */
export function readRawFeedback(filePath: string): PlaytestSessionResult[] {
  const resolvedPath = path.resolve(filePath);
  const content = readFileSync(resolvedPath, "utf-8");
  const lines = content.split("\n");
  const results: PlaytestSessionResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(line) as PlaytestSessionResult;
      results.push(parsed);
    } catch {
      console.warn(`[synthesize] Skipping malformed line ${i + 1} in ${resolvedPath}`);
    }
  }

  return results;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Group an array of sessions by their `packId`.
 *
 * @param sessions - Array of session results to group.
 * @returns Map from packId to array of sessions for that pack.
 */
function groupByPack(sessions: PlaytestSessionResult[]): Map<string, PlaytestSessionResult[]> {
  const groups = new Map<string, PlaytestSessionResult[]>();
  for (const session of sessions) {
    const existing = groups.get(session.packId);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(session.packId, [session]);
    }
  }
  return groups;
}

/**
 * Compute aggregate statistics for a group of sessions.
 *
 * Uses {@link PlaytestMetrics} fields (`progressPct`, `playtimeSeconds`,
 * `uniqueRoomsVisited`, `actionsRejected`, `outcome`) to derive averages
 * and rates.
 *
 * @param sessions - Sessions to compute stats over (typically all from one pack).
 * @returns Computed aggregate statistics.
 */
function computePackStats(sessions: PlaytestSessionResult[]): PackAggregateStats {
  const n = sessions.length;
  if (n === 0) {
    return {
      sessionCount: 0,
      avgProgress: 0,
      avgPlaytime: 0,
      deathRate: 0,
      stuckRate: 0,
      completedCount: 0,
      avgActionsRejected: 0,
      avgRoomsVisited: 0,
    };
  }

  const totalProgress = sessions.reduce((sum, s) => sum + s.progressPct, 0);
  const totalPlaytime = sessions.reduce((sum, s) => sum + s.playtimeSeconds, 0);
  const totalRejected = sessions.reduce((sum, s) => sum + s.actionsRejected, 0);
  const totalRooms = sessions.reduce((sum, s) => sum + s.uniqueRoomsVisited, 0);
  const deathCount = sessions.filter((s) => s.outcome === "died").length;
  const stuckCount = sessions.filter((s) => s.outcome === "stuck").length;
  const completedCount = sessions.filter((s) => s.outcome === "completed").length;

  return {
    sessionCount: n,
    avgProgress: Math.round((totalProgress / n) * 10) / 10,
    avgPlaytime: Math.round((totalPlaytime / n) * 10) / 10,
    deathRate: Math.round((deathCount / n) * 1000) / 10,
    stuckRate: Math.round((stuckCount / n) * 1000) / 10,
    completedCount,
    avgActionsRejected: Math.round((totalRejected / n) * 10) / 10,
    avgRoomsVisited: Math.round((totalRooms / n) * 10) / 10,
  };
}

/**
 * Simple keyword frequency analysis for clustering interview answers.
 *
 * Tokenizes each answer, removes stop words, and returns the top N
 * most-frequent words/phrases. This is a v1 approach — no NLP libraries.
 *
 * @param answers - Array of free-text answers to analyse.
 * @param topN - Number of top themes to return (default 5).
 * @returns Array of `[word, count]` pairs sorted by frequency descending.
 */
function extractThemes(answers: string[], topN: number = 5): Array<[string, number]> {
  const freq = new Map<string, number>();

  for (const answer of answers) {
    // Normalise: lowercase, strip punctuation, split on whitespace
    const words = answer
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Count unique words per answer to avoid one verbose answer dominating
    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/**
 * Identify blocking issues that need immediate fixing.
 *
 * Heuristics:
 * - >50% of sessions for a pack have outcome 'stuck' or 'died'
 * - Average actionsRejected >5 per session for a pack (verb/parser issue)
 * - Any interview answer mentions 'crash' or 'broke'
 *
 * @param sessions - All sessions to analyse.
 * @returns Array of human-readable issue descriptions.
 */
function identifyBlockingIssues(sessions: PlaytestSessionResult[]): string[] {
  const issues: string[] = [];
  const byPack = groupByPack(sessions);

  for (const [packId, packSessions] of byPack) {
    const n = packSessions.length;
    const stuckOrDied = packSessions.filter((s) => s.outcome === "stuck" || s.outcome === "died").length;
    const stuckOrDiedRate = stuckOrDied / n;

    if (stuckOrDiedRate > 0.5) {
      const pct = Math.round(stuckOrDiedRate * 100);
      issues.push(
        `**Pack \`${packId}\`**: ${pct}% of sessions ended in stuck/death ` +
          `(${stuckOrDied}/${n} sessions). Likely a progression blocker or fatal path.`
      );
    }

    const avgRejected = packSessions.reduce((sum, s) => sum + s.actionsRejected, 0) / n;
    if (avgRejected > 5) {
      issues.push(
        `**Pack \`${packId}\`**: Average ${avgRejected.toFixed(1)} actions rejected per session. ` +
          `Likely a verb/parser coverage issue.`
      );
    }
  }

  // Check all interview answers for crash/broke mentions
  const crashKeywords = ["crash", "crashed", "broke", "broken"];
  for (const session of sessions) {
    const allAnswers = [
      session.interview.q01_fun,
      session.interview.q02_best,
      session.interview.q03_worst,
      session.interview.q04_one_change,
      session.interview.q05_confused,
      session.interview.q06_commands,
      session.interview.q07_story,
      session.interview.q08_ending,
      session.interview.q09_difficulty,
      session.interview.q10_recommend,
    ]
      .join(" ")
      .toLowerCase();

    for (const keyword of crashKeywords) {
      if (allAnswers.includes(keyword)) {
        issues.push(
          `**Session \`${session.sessionId}\`** (pack \`${session.packId}\`, ` +
            `persona \`${session.persona}\`): Interview mentions "${keyword}" — ` +
            `investigate for crash/breakage.`
        );
        break; // One mention per session is enough
      }
    }
  }

  return issues;
}

/**
 * Identify recurring friction patterns from negative feedback.
 *
 * Looks for friction keywords that appear in >30% of session interview
 * answers (across q03_worst, q05_confused, and q04_one_change).
 *
 * @param sessions - All sessions to analyse.
 * @returns Array of human-readable friction descriptions.
 */
function identifyRecurringFriction(sessions: PlaytestSessionResult[]): string[] {
  const frictions: string[] = [];
  if (sessions.length === 0) return frictions;

  const n = sessions.length;
  const keywordCounts = new Map<string, number>();

  for (const session of sessions) {
    const negativeText = [session.interview.q03_worst, session.interview.q05_confused, session.interview.q04_one_change]
      .join(" ")
      .toLowerCase();

    // Count each keyword at most once per session
    for (const keyword of FRICTION_KEYWORDS) {
      if (negativeText.includes(keyword)) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
      }
    }
  }

  for (const [keyword, count] of keywordCounts) {
    const rate = count / n;
    if (rate > 0.3) {
      const pct = Math.round(rate * 100);
      frictions.push(`"${keyword}" mentioned in ${pct}% of sessions (${count}/${n})`);
    }
  }

  // Sort by frequency descending
  frictions.sort((a, b) => {
    const extractPct = (s: string): number => {
      const match = s.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return extractPct(b) - extractPct(a);
  });

  return frictions;
}

/**
 * Identify positive patterns from q02_best answers.
 *
 * Uses theme extraction to cluster similar positive feedback.
 *
 * @param sessions - All sessions to analyse.
 * @returns Array of human-readable positive theme descriptions.
 */
function identifyPositives(sessions: PlaytestSessionResult[]): string[] {
  if (sessions.length === 0) return [];

  const bestAnswers = sessions.map((s) => s.interview.q02_best);
  const themes = extractThemes(bestAnswers, 8);

  return themes.map(([word, count]) => {
    const pct = Math.round((count / sessions.length) * 100);
    return `"${word}" — mentioned in ${count} sessions (${pct}%)`;
  });
}

/**
 * Cluster free-text answers and return the top groups as formatted strings.
 *
 * @param answers - Array of free-text answers to cluster.
 * @param topN - Number of top clusters to return (default 3).
 * @returns Array of formatted cluster descriptions.
 */
function clusterAnswers(answers: string[], topN: number = 3): string[] {
  if (answers.length === 0) return ["No responses collected."];

  const themes = extractThemes(answers, topN);
  if (themes.length === 0) return ["Responses too varied to cluster."];

  // For each top theme word, collect a representative answer snippet
  const clusters: string[] = [];
  for (const [word, count] of themes) {
    const matching = answers.filter((a) => a.toLowerCase().includes(word));
    const representative = matching[0] ?? "";
    const snippet = representative.length > 120 ? representative.slice(0, 117) + "..." : representative;
    clusters.push(`**"${word}"** (${count} mentions): _"${snippet}"_`);
  }

  return clusters;
}

/**
 * Summarise fun-factor responses from Q1.
 *
 * Checks for yes/no-ish indicators and reports the split plus common reasons.
 *
 * @param answers - Array of q01_fun answers.
 * @returns Formatted summary string.
 */
function summarizeFunFactor(answers: string[]): string {
  if (answers.length === 0) return "No responses collected.";

  const yesIndicators = ["yes", "yeah", "yep", "fun", "enjoyed", "loved", "great", "amazing", "awesome"];
  const noIndicators = ["no", "nah", "not fun", "boring", "tedious", "frustrating", "bad"];

  let yesCount = 0;
  let noCount = 0;
  let neutralCount = 0;

  for (const answer of answers) {
    const lower = answer.toLowerCase();
    const hasYes = yesIndicators.some((w) => lower.includes(w));
    const hasNo = noIndicators.some((w) => lower.includes(w));

    if (hasYes && !hasNo) {
      yesCount++;
    } else if (hasNo && !hasYes) {
      noCount++;
    } else {
      neutralCount++;
    }
  }

  const total = answers.length;
  const yesPct = Math.round((yesCount / total) * 100);
  const noPct = Math.round((noCount / total) * 100);
  const neutralPct = Math.round((neutralCount / total) * 100);

  const lines = [
    `- **Yes/Positive**: ${yesCount} (${yesPct}%)`,
    `- **No/Negative**: ${noCount} (${noPct}%)`,
    `- **Mixed/Neutral**: ${neutralCount} (${neutralPct}%)`,
  ];

  // Add common reasons via theme extraction
  const themes = extractThemes(answers, 3);
  if (themes.length > 0) {
    lines.push("");
    lines.push("Common themes: " + themes.map(([w, c]) => `"${w}" (×${c})`).join(", "));
  }

  return lines.join("\n");
}

// ─── Digest Synthesis ───────────────────────────────────────────────────────

/**
 * Synthesize an array of playtest session results into a consolidated
 * markdown digest.
 *
 * The digest includes quick stats, blocking issues, recurring friction,
 * positive themes, interview highlights, and suggested priorities.
 *
 * @param sessions - Array of session results to synthesize.
 * @returns Markdown-formatted digest string.
 */
export function synthesizeFeedback(sessions: PlaytestSessionResult[]): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString();

  const uniquePacks = new Set(sessions.map((s) => s.packId));
  const uniquePersonas = new Set(sessions.map((s) => s.persona));

  const byPack = groupByPack(sessions);

  // ── Quick Stats Table ─────────────────────────────────────────────────
  const statsRows: string[] = [];
  for (const [packId, packSessions] of byPack) {
    const stats = computePackStats(packSessions);
    statsRows.push(
      `| ${packId} | ${stats.sessionCount} | ${stats.avgProgress}% ` +
        `| ${stats.avgPlaytime}s | ${stats.deathRate}% | ${stats.stuckRate}% ` +
        `| ${stats.completedCount}/${stats.sessionCount} |`
    );
  }

  // ── Blocking Issues ───────────────────────────────────────────────────
  const blockingIssues = identifyBlockingIssues(sessions);
  const blockingSection =
    blockingIssues.length > 0
      ? blockingIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")
      : "_No blocking issues detected._";

  // ── Recurring Friction ────────────────────────────────────────────────
  const frictionIssues = identifyRecurringFriction(sessions);
  const frictionSection =
    frictionIssues.length > 0
      ? frictionIssues.map((f) => `- ${f}`).join("\n")
      : "_No recurring friction patterns detected._";

  // ── Working Well ──────────────────────────────────────────────────────
  const positives = identifyPositives(sessions);
  const positiveSection =
    positives.length > 0
      ? positives.map((p) => `- ${p}`).join("\n")
      : "_Not enough data to identify positive patterns._";

  // ── Interview Highlights ──────────────────────────────────────────────
  const oneChangeAnswers = sessions.map((s) => s.interview.q04_one_change);
  const oneChangeClusters = clusterAnswers(oneChangeAnswers, 3);

  const funAnswers = sessions.map((s) => s.interview.q01_fun);
  const funSummary = summarizeFunFactor(funAnswers);

  // ── Suggested Priorities ──────────────────────────────────────────────
  const priorities = generatePriorities(sessions, blockingIssues, frictionIssues);

  // ── Assemble Digest ───────────────────────────────────────────────────
  const lines = [
    `# Playtest Digest — ${dateStr}`,
    "",
    `> ${sessions.length} sessions | ${uniquePacks.size} packs | ${uniquePersonas.size} personas | generated ${timestamp}`,
    "",
    "## 📊 Quick Stats",
    "| Pack | Sessions | Avg Progress | Avg Playtime | Death Rate | Stuck Rate | Completion |",
    "|---|---|---|---|---|---|---|",
    ...statsRows,
    "",
    "## 🔴 BLOCKING (fix immediately)",
    blockingSection,
    "",
    "## 🟡 RECURRING FRICTION",
    frictionSection,
    "",
    "## 🟢 WORKING WELL",
    positiveSection,
    "",
    "## 📋 Interview Highlights",
    '### Most Common "One Change" (Q4)',
    ...oneChangeClusters.map((c) => `- ${c}`),
    "",
    "### Fun Factor",
    funSummary,
    "",
    "## 🎯 SUGGESTED PRIORITIES",
    ...priorities.map((p, i) => `${i + 1}. ${p}`),
    "",
  ];

  return lines.join("\n");
}

/**
 * Generate a prioritised list of actionable items based on analysis results.
 *
 * @param sessions - All sessions.
 * @param blockingIssues - Already-identified blocking issues.
 * @param frictionIssues - Already-identified friction patterns.
 * @returns Array of priority strings ordered by impact.
 */
function generatePriorities(
  sessions: PlaytestSessionResult[],
  blockingIssues: string[],
  frictionIssues: string[]
): string[] {
  const priorities: string[] = [];

  // Blocking issues are always highest priority
  if (blockingIssues.length > 0) {
    priorities.push(`**Fix ${blockingIssues.length} blocking issue(s)** — these prevent players from progressing.`);
  }

  // Check for high rejection rates across all sessions
  const totalRejected = sessions.reduce((sum, s) => sum + s.actionsRejected, 0);
  const avgRejected = sessions.length > 0 ? totalRejected / sessions.length : 0;
  if (avgRejected > 3) {
    priorities.push(`**Improve verb/parser coverage** — average ${avgRejected.toFixed(1)} rejections per session.`);
  }

  // Friction items
  if (frictionIssues.length > 0) {
    priorities.push(`**Address recurring friction** — ${frictionIssues.length} pattern(s) affecting >30% of sessions.`);
  }

  // Low completion rate
  const completedCount = sessions.filter((s) => s.outcome === "completed").length;
  const completionRate = sessions.length > 0 ? completedCount / sessions.length : 0;
  if (completionRate < 0.5 && sessions.length > 0) {
    const pct = Math.round(completionRate * 100);
    priorities.push(`**Investigate low completion rate** — only ${pct}% of sessions reached completion.`);
  }

  // Low progress
  const avgProgress = sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.progressPct, 0) / sessions.length : 0;
  if (avgProgress < 50 && sessions.length > 0) {
    priorities.push(
      `**Review early-game flow** — average progress is only ${avgProgress.toFixed(0)}%, ` +
        `suggesting players get stuck early.`
    );
  }

  // One-change interview themes
  const oneChangeAnswers = sessions.map((s) => s.interview.q04_one_change);
  const topChange = extractThemes(oneChangeAnswers, 1);
  if (topChange.length > 0) {
    const [word, count] = topChange[0];
    const pct = Math.round((count / sessions.length) * 100);
    priorities.push(`**Player-requested change** — "${word}" mentioned by ${pct}% of playtesters as their #1 change.`);
  }

  if (priorities.length === 0) {
    priorities.push("No urgent issues detected. Continue monitoring with more sessions.");
  }

  return priorities;
}

// ─── Digest Writer ──────────────────────────────────────────────────────────

/**
 * Synthesize feedback from an array of session results and write the
 * resulting markdown digest to a file.
 *
 * @param sessions - Array of session results to synthesize.
 * @param outputPath - File path to write the digest to.
 */
export function writeFeedbackDigest(sessions: PlaytestSessionResult[], outputPath: string): void {
  const digest = synthesizeFeedback(sessions);
  const resolvedPath = path.resolve(outputPath);
  writeFileSync(resolvedPath, digest, "utf-8");
  console.log(`[synthesize] Digest written to ${resolvedPath}`);
}

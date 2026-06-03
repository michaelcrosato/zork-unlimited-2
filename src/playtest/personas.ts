/**
 * @module playtest/personas
 *
 * Predefined playtesting personas for the blind playtesting system.
 *
 * Each persona represents a distinct player archetype with different goals,
 * play styles, and frustration tolerances. Running all 8 personas against an
 * adventure pack provides broad coverage of potential player experiences —
 * from completionists to griefers, from story lovers to button mashers.
 */

import type { PlaytestPersona } from "./types.js";

/**
 * Registry of all available playtesting personas, keyed by their unique
 * identifier. Each persona defines a behavioural archetype that guides how
 * the LLM player agent interacts with the game.
 */
export const PERSONAS: Record<string, PlaytestPersona> = {
  explorer: {
    id: "explorer",
    name: "Explorer",
    style: "Visit every room, examine everything, talk to every NPC. Be thorough and curious.",
    priority: "Coverage over speed. Visit every room, try every object.",
    quitThreshold: "Never quit voluntarily. Exhaust all options.",
  },
  speedrunner: {
    id: "speedrunner",
    name: "Speedrunner",
    style: "Beeline for objectives. Skip optional content and flavor text.",
    priority: "Minimize steps. Ignore non-essential interactions.",
    quitThreshold: "Quit if stuck >10 turns on same obstacle.",
  },
  adversarial: {
    id: "adversarial",
    name: "Adversarial",
    style: "Try to break things. Nonsense commands, edge cases, try impossible actions.",
    priority: "Find parser gaps, crash states, impossible actions.",
    quitThreshold: "Never quit. Keep probing for weaknesses.",
  },
  narrative_seeker: {
    id: "narrative_seeker",
    name: "Narrative Seeker",
    style: "Read everything. Pursue all dialogue trees fully. Savor descriptions.",
    priority: "Story coherence, NPC depth, atmospheric quality.",
    quitThreshold: "Quit if bored (no new story content for >15 turns).",
  },
  new_player: {
    id: "new_player",
    name: "New Player",
    style: "Confused. Type natural language, not parser commands. You do NOT know text adventure conventions.",
    priority: "Tests onboarding, help systems, error message quality.",
    quitThreshold: "Quit if confused for >8 turns with no guidance.",
  },
  hoarder: {
    id: "hoarder",
    name: "Hoarder",
    style: "Pick up everything. Try to use every item on every object.",
    priority: "Item interaction coverage, inventory edge cases.",
    quitThreshold: "Quit when item experiments exhausted.",
  },
  dialogue_skipper: {
    id: "dialogue_skipper",
    name: "Dialogue Skipper",
    style: "Skip all dialogue, refuse NPC interactions. Only use action verbs.",
    priority: "Tests if game is completable without engaging NPCs.",
    quitThreshold: "Quit if hard-locked behind mandatory dialogue.",
  },
  wrong_order: {
    id: "wrong_order",
    name: "Wrong Order Solver",
    style: "Deliberately try to solve puzzles out of intended sequence. Go backwards.",
    priority: "Sequence-breaking, flag dependency bugs, alternate paths.",
    quitThreshold: "Quit if hard-locked with no alternative paths.",
  },
};

/**
 * Array of all valid persona identifier strings.
 *
 * Useful for iteration, CLI validation, and random selection.
 */
export const PERSONA_IDS: string[] = Object.keys(PERSONAS);

/**
 * Retrieve a persona by its identifier, throwing if the ID is unknown.
 *
 * @param id - The persona identifier to look up (e.g. `"explorer"`).
 * @returns The matching {@link PlaytestPersona}.
 * @throws {Error} If the given `id` does not match any known persona.
 *
 * @example
 * ```typescript
 * const persona = getPersona("speedrunner");
 * console.log(persona.name); // "Speedrunner"
 * ```
 */
export function getPersona(id: string): PlaytestPersona {
  const persona = PERSONAS[id];
  if (!persona) {
    throw new Error(`Unknown persona: ${id}. Valid: ${PERSONA_IDS.join(", ")}`);
  }
  return persona;
}

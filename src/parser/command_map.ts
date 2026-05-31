import { AvailableAction, Action } from "../api/types.js";

/**
 * Normalizes common human shortcut aliases to standard command strings.
 */
export function normalizeCommandString(input: string): string {
  const str = input.trim().toLowerCase();
  if (str === "n") return "go north";
  if (str === "s") return "go south";
  if (str === "e") return "go east";
  if (str === "w") return "go west";
  if (str === "u") return "go up";
  if (str === "d") return "go down";
  if (str === "i") return "inventory";
  if (str === "l") return "look";
  return str;
}

/**
 * Controlled command parser matches a human text command against the set of
 * currently legal available actions.
 *
 * Exposes a classic adventure game interface backed by absolute determinism.
 */
export function mapCommand(
  rawInput: string,
  availableActions: AvailableAction[]
): { action?: Action; error?: string } {
  const normalized = normalizeCommandString(rawInput);

  // 1. Attempt exact match on standard command string
  const matched = availableActions.find(
    (a) => a.command.toLowerCase() === normalized
  );

  if (matched) {
    return { action: matched.action };
  }

  // 2. Friendly error reporting with valid verbs/commands list
  const uniqueVerbs = new Set<string>();
  availableActions.forEach((a) => {
    const verb = a.command.split(" ")[0];
    uniqueVerbs.add(verb);
  });

  const validVerbs = Array.from(uniqueVerbs).join(", ");
  const errorMsg = `I don't understand that command. Try using one of these actions: ${validVerbs}. (Or type 'look' to see your surroundings).`;

  return { error: errorMsg };
}

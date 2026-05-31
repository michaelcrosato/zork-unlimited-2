import { GameState, GameStateSchema } from "../core/state.js";

export type SaveData = {
  state: GameState;
  packId: string;
  contentHash: string;
  timestamp: string;
  engineVersion: string;
};

/**
 * Serializes the current GameState along with pack metadata into a JSON string.
 */
export function saveGame(state: GameState, packId: string, contentHash: string): string {
  const saveData: SaveData = {
    state,
    packId,
    contentHash,
    timestamp: new Date().toISOString(),
    engineVersion: "1.0.0",
  };
  return JSON.stringify(saveData);
}

/**
 * Deserializes a save game JSON string, validates the state schema, and asserts
 * that the contentHash matches the expected active pack hash.
 */
export function loadGame(
  saveStr: string,
  expectedPackId: string,
  expectedContentHash: string
): GameState {
  let rawData: unknown;
  try {
    rawData = JSON.parse(saveStr);
  } catch (err: any) {
    throw new Error(`Failed to parse save game JSON: ${err.message}`);
  }

  if (typeof rawData !== "object" || rawData === null) {
    throw new Error("Invalid save game format");
  }

  const data = rawData as Partial<SaveData>;

  if (!data.state || !data.packId || !data.contentHash) {
    throw new Error("Missing required save game fields");
  }

  // 1. Assert pack ID matches
  if (data.packId !== expectedPackId) {
    throw new Error(
      `Save game belongs to pack '${data.packId}', but expected current pack to be '${expectedPackId}'`
    );
  }

  // 2. Assert content hash matches
  if (data.contentHash !== expectedContentHash) {
    throw new Error(
      `Content hash mismatch! Save: ${data.contentHash}, Current Pack: ${expectedContentHash}. Silently loading would corrupt game state.`
    );
  }

  // 3. Validate game state against Zod schema
  const parsed = GameStateSchema.safeParse(data.state);
  if (!parsed.success) {
    throw new Error(`Loaded GameState failed validation: ${parsed.error.message}`);
  }

  return parsed.data;
}

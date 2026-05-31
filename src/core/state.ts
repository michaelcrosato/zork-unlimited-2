import { z } from "zod";

export const ObjectRuntimeSchema = z.object({
  open: z.boolean().optional(),
  locked: z.boolean().optional(),
  contents: z.array(z.string()).optional(),
  takenBy: z.enum(["player", "world"]).optional(),
});

export type ObjectRuntime = z.infer<typeof ObjectRuntimeSchema>;

export const GameStateSchema = z.object({
  // identity / determinism
  seed: z.number().int(),
  step: z.number().int().nonnegative(),

  // location
  current: z.string(), // scene_id (CYOA) or room_id (parser)
  visited: z.record(z.string(), z.boolean()),

  // world state
  flags: z.record(z.string(), z.boolean()),
  vars: z.record(z.string(), z.number()),
  inventory: z.array(z.string()),
  objectState: z.record(z.string(), ObjectRuntimeSchema),

  // narrative
  journal: z.array(z.string()),
  questStage: z.record(z.string(), z.string()), // questId -> current stage id (Stage 3+)

  // termination
  ended: z.boolean(),
  endingId: z.string().nullable(),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const createInitialState = (options: {
  seed: number;
  start: string;
  varsInit?: Record<string, number>;
  flagsInit?: string[];
}): GameState => {
  const flags: Record<string, boolean> = {};
  if (options.flagsInit) {
    for (const flag of options.flagsInit) {
      flags[flag] = true;
    }
  }

  return {
    seed: options.seed,
    step: 0,
    current: options.start,
    visited: { [options.start]: true },
    flags,
    vars: options.varsInit ?? {},
    inventory: [],
    objectState: {},
    journal: [],
    questStage: {},
    ended: false,
    endingId: null,
  };
};

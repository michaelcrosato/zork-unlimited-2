import { z } from "zod";
import { ConditionSchema } from "../core/conditions.js";
import { EffectSchema } from "../core/effects.js";

export const CYOAChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  next: z.string(),
});

export type CYOAChoice = z.infer<typeof CYOAChoiceSchema>;

export const CYOASceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  on_enter: z.array(EffectSchema).default([]),
  is_ending: z.boolean().default(false),
  choices: z.array(CYOAChoiceSchema).default([]),
});

export type CYOAScene = z.infer<typeof CYOASceneSchema>;

export const CYOAEndingSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
});

export type CYOAEnding = z.infer<typeof CYOAEndingSchema>;

export const CYOAPackSchema = z.object({
  meta: z.object({
    id: z.string(),
    title: z.string(),
    start: z.string(),
    vars_init: z.record(z.string(), z.number()).optional(),
    flags_init: z.array(z.string()).optional(),
  }),
  scenes: z.array(CYOASceneSchema),
  endings: z.array(CYOAEndingSchema).optional().default([]),
});

export type CYOAPack = z.infer<typeof CYOAPackSchema>;

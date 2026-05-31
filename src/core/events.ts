import { Action } from "../api/types.js";

export type StateChangeEvent = {
  type: "state_change";
  effect: string;
  flag?: string;
  variable?: string;
  value?: number | boolean | string;
};

export type NarrationEvent = {
  type: "narration";
  text: string;
};

export type UnlockExitEvent = {
  type: "unlock_exit";
  from: string;
  to: string;
};

export type OpenObjectEvent = {
  type: "open_object";
  objectId: string;
};

export type MoveEvent = {
  type: "move";
  from: string;
  to: string;
  direction: string;
};

export type TakeEvent = {
  type: "take";
  item: string;
};

export type DropEvent = {
  type: "drop";
  item: string;
};

export type DialogueEvent = {
  type: "dialogue";
  npcId: string;
  nodeId: string;
  text: string;
};

export type EndingEvent = {
  type: "ending";
  endingId: string;
  title: string;
  text: string;
};

export type RejectedEvent = {
  type: "rejected";
  reason: string;
};

export type GameEvent =
  | StateChangeEvent
  | NarrationEvent
  | UnlockExitEvent
  | OpenObjectEvent
  | MoveEvent
  | TakeEvent
  | DropEvent
  | DialogueEvent
  | EndingEvent
  | RejectedEvent;

export type StepLogEntry = {
  action: Action;
  ok: boolean;
  events: GameEvent[];
  new_state_hash: string;
};

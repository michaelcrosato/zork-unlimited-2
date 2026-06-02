// Core State & Logic
export { GameStateSchema, ObjectRuntimeSchema, createInitialState, getFactionRepInit, getTerritoryControlInit, reconcileTerritories, reconcileAlliances, reconcileTariffPolicies, reconcileTariffExemptions, reconcileCooperativeSWFStakingCampaigns, reconcileSovereignDebtDefaultAlerts, reconcileSovereignDebtResolveAlerts, reconcileSovereignDebtDefaultGracePeriods, reconcileSovereignDebtDefaultPenaltyWaivers, reconcileSovereignDebtCDSContracts, reconcileSovereignDebtCDSCDOTranches, SovereignDebtCDSCDOTrancheListingSchema, SovereignDebtCDSCDOTrancheBidSchema, SovereignDebtCDSCDOTrancheMarketSpreadSchema, reconcileSovereignDebtCDSCDOCrossTrancheHedging, SovereignDebtCDSCDOCrossTrancheHedgingSchema, reconcileCDSCDOLiquidityInjections, SovereignDebtCDSCDOLiquidityInjectionProposalSchema, reconcileCDSCDOCoinvestments, SovereignDebtCDSCDOCoinvestmentProposalSchema, reconcileCDSCDOCoinvestmentYieldShares, SovereignDebtCDSCDOCoinvestmentYieldShareProposalSchema, reconcileCDSCDOCoinvestmentYieldReinvestments, SovereignDebtCDSCDOCoinvestmentYieldReinvestmentProposalSchema, reconcileCDSCDOCoinvestmentReinvestmentPolicyProposals, SovereignDebtCDSCDOCoinvestmentReinvestmentPolicyProposalSchema, reconcileCDSCDOYieldHedgingOptionPolicyProposals, SovereignDebtCDSCDOYieldHedgingPolicyProposalSchema, SovereignDebtCDSCDOYieldHedgingOptionContractSchema } from "./core/state.js";
export type { GameState, ObjectRuntime } from "./core/state.js";

export { step } from "./core/engine.js";
export { multiAgentStep, buildObservationForAgent } from "./core/sync.js";
export type { MultiAgentAction } from "./core/sync.js";

// Gossip & P2P Sync
export {
  GossipNode,
  isClockBehind,
  mergeVectorClocks,
  getTransactionId,
  mergeAndSortTransactions,
  mergeMonotonicStateFields,
  reconstructState,
  compressRLE,
  decompressRLE,
  deltaEncode,
  deltaDecode,
  compressStateDiff,
  decompressStateDiff,
  GossipPacketFragmenter
} from "./core/gossip.js";
export type { VectorClock, GossipMessage, GossipFragment } from "./core/gossip.js";
export { DecentralizedDungeonExpedition } from "./core/expedition.js";

// Network & Mesh Discovery
export { NetworkDiscovery, MeshNode, MeshNetwork } from "./core/network.js";
export type { PresenceAnnouncement, RoutedPacket } from "./core/network.js";

// Hashing & Seeded PRNG
export { PureRand } from "./core/rng.js";
export { canonicalStringify, computeSha256, computeStateHash, computeStateHashShort } from "./core/hash.js";

// DSL Evaluators & Schemas
export { ConditionSchema, evaluateCondition, evaluateConditions } from "./core/conditions.js";
export type { Condition } from "./core/conditions.js";

export { EffectSchema, applyEffect, applyEffects } from "./core/effects.js";
export type { Effect } from "./core/effects.js";

export { StateChangeEvent, NarrationEvent, UnlockExitEvent, OpenObjectEvent, MoveEvent, TakeEvent, DropEvent, DialogueEvent, EndingEvent, RejectedEvent, BlackMarketSoldEvent, GameEvent, StepLogEntry } from "./core/events.js";

// Save & Load Serialization
export { saveGame, loadGame } from "./persist/save_load.js";
export type { SaveData } from "./persist/save_load.js";

// Trace & Replay
export { recordTrace } from "./trace/record.js";
export type { Trace } from "./trace/record.js";

export { replayTrace } from "./trace/replay.js";
export type { ReplayResult } from "./trace/replay.js";

// CYOA Content Schema
export { CYOAChoiceSchema, CYOASceneSchema, CYOAEndingSchema, CYOAPackSchema } from "./cyoa/schema.js";
export type { CYOAChoice, CYOAScene, CYOAEnding, CYOAPack } from "./cyoa/schema.js";

// AI API Observability & Commands
export { buildObservation } from "./api/observation.js";
export type { Action, StepResult, AvailableAction, CYOAObservation, ParserObservation, Observation } from "./api/types.js";

// Content Validators
export { validateCYOAPack } from "./validate/cyoa_validator.js";
export { formatValidationReport } from "./validate/report.js";
export type { ValidationFinding, ValidationReport } from "./validate/report.js";

// AI Agents & LLM Clients
export type { LlmClient } from "./agents/llm/client.js";
export { MockLlmClient } from "./agents/llm/mock_client.js";
export { ApiLlmClient, FallbackLlmClient } from "./agents/llm/api_client.js";
export { runAiPlaytest } from "./agents/playtester.js";
export type { PlaytestLogEntry, PlaytestResult } from "./agents/playtester.js";
export { draftStory } from "./agents/writer.js";
export type { RawStoryBeat, RawStoryDraft } from "./agents/writer.js";
export { adaptStoryToPack } from "./agents/adapter.js";
export type { AdaptationResult } from "./agents/adapter.js";
export { diagnosePlaytest } from "./agents/debugger.js";
export type { BugDiagnosis } from "./agents/debugger.js";
export { fixIdentifiedBug } from "./agents/fixer.js";
export type { ContentFixResult } from "./agents/fixer.js";
export { runBlindEvaluation } from "./agents/blind_evaluator.js";
export type { AnonymizedCandidate, RubricScore, BlindEvalResult } from "./agents/blind_evaluator.js";

// Parser (Stage 2) Modules
export { ParserExitSchema, ObjectInteractionSchema, ParserObjectSchema, DialogueTopicSchema, DialogueNodeSchema, ParserNPCSchema, ParserRoomSchema, ParserWinConditionSchema, ParserEndingSchema, ParserPackSchema } from "./parser/schema.js";
export type { ParserExit, ObjectInteraction, ParserObject, DialogueTopic, DialogueNode, ParserNPC, ParserRoom, ParserWinCondition, ParserEnding, ParserPack } from "./parser/schema.js";
export { generateLegalActions } from "./parser/legal_actions.js";
export { normalizeCommandString, mapCommand } from "./parser/command_map.js";
export { validateParserPack } from "./validate/parser_validator.js";

// Playtest — Blind Playtesting Infrastructure
export type { PlaytestPersona, PlaytestMetrics, PlaytestInterview, PlaytestSessionResult, PlaytestTurnLog } from "./playtest/types.js";
export { INTERVIEW_QUESTIONS } from "./playtest/types.js";
export { PERSONAS, PERSONA_IDS, getPersona } from "./playtest/personas.js";
export { McpGameClient } from "./playtest/mcp_client.js";
export type { AdventurePack, ActionResult } from "./playtest/mcp_client.js";
export { runBlindPlaytest } from "./playtest/blind_playtester.js";
export type { BlindPlaytestOptions, BlindPlaytestResult } from "./playtest/blind_playtester.js";
export { readRawFeedback, synthesizeFeedback, writeFeedbackDigest } from "./playtest/synthesize.js";


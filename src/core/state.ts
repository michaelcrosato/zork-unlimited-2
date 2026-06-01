import { z } from "zod";

export const ObjectRuntimeSchema = z.object({
  open: z.boolean().optional(),
  locked: z.boolean().optional(),
  contents: z.array(z.string()).optional(),
  takenBy: z.enum(["player", "world", "destroyed"]).optional(),
});

export type ObjectRuntime = z.infer<typeof ObjectRuntimeSchema>;

export const EnvironmentalStateSchema = z.object({
  weather: z.string(),
  temperature: z.string(),
  lastUpdatedStep: z.number().int().nonnegative(),
});

export type EnvironmentalState = z.infer<typeof EnvironmentalStateSchema>;

export const AgentStateSchema = z.object({
  id: z.string(),
  current: z.string(),
  inventory: z.array(z.string()),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const TransactionSchema = z.object({
  agentId: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  action: z.any(),
  stateHashBefore: z.string(),
  stateHashAfter: z.string(),
  timestamp: z.number().int(),
  ok: z.boolean(),
  rejectionReason: z.string().optional(),
  signature: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const LootClaimSchema = z.object({
  claimedBy: z.string(),
  timestamp: z.number().int(),
});

export type LootClaim = z.infer<typeof LootClaimSchema>;

export const TerritoryClaimSchema = z.object({
  claimedBy: z.string(),
  factionId: z.string(),
  timestamp: z.number().int(),
  assistants: z.array(z.string()).optional(),
  allianceDefense: z.number().int().optional(),
});

export type TerritoryClaim = z.infer<typeof TerritoryClaimSchema>;

export const TaxVoteSchema = z.object({
  rate: z.number(),
  timestamp: z.number().int(),
});

export type TaxVote = z.infer<typeof TaxVoteSchema>;

export const AllianceRelationshipSchema = z.enum(["allied", "hostile", "neutral"]);
export type AllianceRelationship = z.infer<typeof AllianceRelationshipSchema>;

export const AllianceVoteSchema = z.object({
  targetState: AllianceRelationshipSchema,
  timestamp: z.number().int(),
});
export type AllianceVote = z.infer<typeof AllianceVoteSchema>;

export const TradeTransactionSchema = z.object({
  step: z.number().int().nonnegative(),
  npcId: z.string(),
  action: z.enum(["buy", "sell", "stock"]),
  item: z.string(),
  gold: z.number().int(),
});

export type TradeTransaction = z.infer<typeof TradeTransactionSchema>;

export const TradeRouteSchema = z.object({
  id: z.string(),
  factionId: z.string(),
  rooms: z.array(z.string()),
  definedBy: z.string(),
  taxShare: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TradeRoute = z.infer<typeof TradeRouteSchema>;

export const TradeRouteVoteSchema = z.object({
  taxShare: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TradeRouteVote = z.infer<typeof TradeRouteVoteSchema>;

export const TariffVoteSchema = z.object({
  rate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TariffVote = z.infer<typeof TariffVoteSchema>;

export const MerchantLicensingSchema = z.object({
  factionId: z.string(),
  licenseCost: z.number().int().nonnegative(),
  tariffRate: z.number().int().nonnegative(),
  definedBy: z.string(),
  timestamp: z.number().int(),
  tariffWaiverThreshold: z.number().int().optional(),
  tariffDiscountThreshold: z.number().int().optional(),
});
export type MerchantLicensing = z.infer<typeof MerchantLicensingSchema>;

export const GuildVoteSchema = z.object({
  tariffRate: z.number().int().nonnegative(),
  exportPricingPolicy: z.enum(["premium", "discount", "standard"]),
  timestamp: z.number().int(),
});
export type GuildVote = z.infer<typeof GuildVoteSchema>;

export const MerchantGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type MerchantGuild = z.infer<typeof MerchantGuildSchema>;

export const GuildPolicySchema = z.object({
  tariffRate: z.number().int().nonnegative(),
  exportPricingPolicy: z.enum(["premium", "discount", "standard"]),
});
export type GuildPolicy = z.infer<typeof GuildPolicySchema>;

export const CollectiveBargainingSchema = z.object({
  guildId: z.string(),
  factionId: z.string(),
  agreedTariff: z.number().int().nonnegative(),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type CollectiveBargaining = z.infer<typeof CollectiveBargainingSchema>;

export const CartelVoteSchema = z.object({
  priceMultiplier: z.number().nonnegative(),
  embargoedFactions: z.array(z.string()),
  timestamp: z.number().int(),
});
export type CartelVote = z.infer<typeof CartelVoteSchema>;

export const MerchantCartelSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()),
  factionId: z.string(),
  priceMultiplier: z.number().nonnegative(),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type MerchantCartel = z.infer<typeof MerchantCartelSchema>;

export const CartelPolicySchema = z.object({
  priceMultiplier: z.number().nonnegative(),
  embargoedFactions: z.array(z.string()),
});
export const ContrabandBlacklistEntrySchema = z.object({
  blacklisted: z.boolean(),
  timestamp: z.number().int(),
});
export type ContrabandBlacklistEntry = z.infer<typeof ContrabandBlacklistEntrySchema>;

export const BlackMarketPayoutEntrySchema = z.object({
  payout: z.number().int(),
  timestamp: z.number().int(),
});
export type BlackMarketPayoutEntry = z.infer<typeof BlackMarketPayoutEntrySchema>;

export const BountySchema = z.object({
  targetId: z.string(),
  amount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type Bounty = z.infer<typeof BountySchema>;

export const EnforcerSchema = z.object({
  id: z.string(),
  name: z.string(),
  factionId: z.string().optional(),
  currentRoom: z.string(),
  targetId: z.string().optional(),
  status: z.enum(["idle", "pursuing", "defeated"]),
  isBountyHunter: z.boolean(),
  timestamp: z.number().int(),
  hp: z.number().optional(),
  max_hp: z.number().optional(),
  attack: z.number().optional(),
  defense: z.number().optional(),
  gold: z.number().optional(),
  xp: z.number().optional(),
});
export type Enforcer = z.infer<typeof EnforcerSchema>;

export const SmugglingInsuranceSchema = z.object({
  buyerId: z.string(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type SmugglingInsurance = z.infer<typeof SmugglingInsuranceSchema>;

export const SmugglerGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  syndicateId: z.string(),
  members: z.array(z.string()),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type SmugglerGuild = z.infer<typeof SmugglerGuildSchema>;

export const SmugglerGuildCbaVoteSchema = z.object({
  agreedToll: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SmugglerGuildCbaVote = z.infer<typeof SmugglerGuildCbaVoteSchema>;

export const SmugglerGuildCbaSchema = z.object({
  guildId: z.string(),
  routeId: z.string(),
  agreedToll: z.number().int().nonnegative(),
});
export type SmugglerGuildCba = z.infer<typeof SmugglerGuildCbaSchema>;

export const ConvoyInsuranceSchema = z.object({
  convoyId: z.string(),
  syndicateId: z.string(),
  cost: z.number().int().nonnegative(),
  coverageAmount: z.number().int().nonnegative(),
  active: z.boolean(),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type ConvoyInsurance = z.infer<typeof ConvoyInsuranceSchema>;


export const BribeSchema = z.object({
  enforcerId: z.string(),
  amount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type Bribe = z.infer<typeof BribeSchema>;

export const SyndicateBribeSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  amount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SyndicateBribe = z.infer<typeof SyndicateBribeSchema>;

export const DeflectionPolicySchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  cost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type DeflectionPolicy = z.infer<typeof DeflectionPolicySchema>;

export const SyndicateSafehouseSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  ownerId: z.string(),
  syndicateId: z.string(),
  level: z.number().int().positive(),
  stashCapacity: z.number().int().nonnegative(),
  stashItems: z.array(z.string()),
  timestamp: z.number().int(),
});
export type SyndicateSafehouse = z.infer<typeof SyndicateSafehouseSchema>;

export const SyndicateBlackMarketSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  syndicateId: z.string(),
  inventory: z.array(z.string()),
  timestamp: z.number().int(),
});
export type SyndicateBlackMarket = z.infer<typeof SyndicateBlackMarketSchema>;

export const SyndicateFrontBusinessSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  roomId: z.string(),
  syndicateId: z.string(),
  level: z.number().int().positive(),
  dirtyGold: z.number().int().nonnegative(),
  cleanGold: z.number().int().nonnegative(),
  launderingCapacity: z.number().int().nonnegative(),
  launderingRate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  activeAudit: z.boolean().optional(),
});
export type SyndicateFrontBusiness = z.infer<typeof SyndicateFrontBusinessSchema>;

export const TurfGuardSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  count: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TurfGuard = z.infer<typeof TurfGuardSchema>;




export const SyndicateTaxVoteSchema = z.object({
  rate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SyndicateTaxVote = z.infer<typeof SyndicateTaxVoteSchema>;

export const SyndicateBribeVoteSchema = z.object({
  amount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SyndicateBribeVote = z.infer<typeof SyndicateBribeVoteSchema>;

export const SyndicateWaiverVoteSchema = z.object({
  threshold: z.number().int(),
  timestamp: z.number().int(),
});
export type SyndicateWaiverVote = z.infer<typeof SyndicateWaiverVoteSchema>;

export const TurfCheckpointSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type TurfCheckpoint = z.infer<typeof TurfCheckpointSchema>;

export const OutpostTurretSchema = z.object({
  id: z.string(),
  type: z.string(),
  firepower: z.number().int().nonnegative(),
  armor: z.number().int().nonnegative(),
  premiumRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type OutpostTurret = z.infer<typeof OutpostTurretSchema>;

export const TurfGuardOutpostSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  securityLevel: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  turrets: z.record(z.string(), OutpostTurretSchema).optional(),
  disabled: z.boolean().optional(),
});
export type TurfGuardOutpost = z.infer<typeof TurfGuardOutpostSchema>;

export const SmugglingConvoySchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  routeId: z.string(),
  currentRoomIndex: z.number().int().nonnegative(),
  cargo: z.number().int().nonnegative(),
  goldCost: z.number().int().nonnegative(),
  status: z.enum(["en_route", "completed", "ambushed"]),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type SmugglingConvoy = z.infer<typeof SmugglingConvoySchema>;

export const UndercoverAgentSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  name: z.string(),
  intelAccumulated: z.number().int().nonnegative(),
  status: z.enum(["active", "exposed", "rooted_out"]),
  timestamp: z.number().int(),
});
export type UndercoverAgent = z.infer<typeof UndercoverAgentSchema>;

export const InformantSchema = z.object({
  id: z.string(),
  name: z.string(),
  syndicateId: z.string(),
  status: z.enum(["active", "exposed", "compromised"]),
  bribeCost: z.number().int().nonnegative().optional(),
  timestamp: z.number().int(),
});
export type Informant = z.infer<typeof InformantSchema>;

export const RaidWarningSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  scheduledStep: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type RaidWarning = z.infer<typeof RaidWarningSchema>;

export const EspionageNetworkSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  cost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  status: z.enum(["active", "sabotaged"]).optional(),
});
export type EspionageNetwork = z.infer<typeof EspionageNetworkSchema>;

export const WiretapSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  cost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  status: z.enum(["active", "sabotaged"]).optional(),
});
export type Wiretap = z.infer<typeof WiretapSchema>;


export const IntelReportSchema = z.object({
  id: z.string(),
  type: z.enum(["wiretap_log", "transaction_map", "raid_schedule"]),
  roomId: z.string(),
  value: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type IntelReport = z.infer<typeof IntelReportSchema>;

export const IntelTransactionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  type: z.enum(["buy", "sell"]),
  reportId: z.string(),
  gold: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type IntelTransaction = z.infer<typeof IntelTransactionSchema>;


export const CrimeSyndicateSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()),
  definedBy: z.string(),
  timestamp: z.number().int(),
  dominance: z.number().int().nonnegative().optional(),
  turfTaxRate: z.number().int().nonnegative().optional(),
  turfBribeCost: z.number().int().nonnegative().optional(),
  turfWaiverThreshold: z.number().int().optional(),
  undercoverAgents: z.array(z.string()).optional(),
  intelStock: z.record(z.string(), IntelReportSchema).optional(),
  intelTransactions: z.array(IntelTransactionSchema).optional(),
  ringleader: z.string().optional(),
  warChest: z.number().int().nonnegative().optional(),
});
export type CrimeSyndicate = z.infer<typeof CrimeSyndicateSchema>;

export const SyndicateTurfClaimSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  timestamp: z.number().int(),
  dominance: z.number().int(),
});
export type SyndicateTurfClaim = z.infer<typeof SyndicateTurfClaimSchema>;

export const EnforcementHeatEntrySchema = z.object({
  roomId: z.string(),
  heat: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type EnforcementHeatEntry = z.infer<typeof EnforcementHeatEntrySchema>;

export const ProductionLabSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  ownerId: z.string(),
  syndicateId: z.string(),
  level: z.number().int().positive(),
  capacity: z.number().int().nonnegative(),
  storedContraband: z.number().int().nonnegative(),
  lastProducedStep: z.number().int().nonnegative(),
  cooldownSteps: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  defense: z.number().int().nonnegative().optional(),
});
export type ProductionLab = z.infer<typeof ProductionLabSchema>;

export const ProtectionRacketSchema = z.object({
  merchantId: z.string(),
  syndicateId: z.string(),
  cost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type ProtectionRacket = z.infer<typeof ProtectionRacketSchema>;

export const DefenseFortressSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  fortressLevel: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type DefenseFortress = z.infer<typeof DefenseFortressSchema>;

export const PeaceTreatyVoteSchema = z.object({
  targetState: z.boolean(),
  timestamp: z.number().int(),
});
export type PeaceTreatyVote = z.infer<typeof PeaceTreatyVoteSchema>;

export const CovertCellSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  cellLevel: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type CovertCell = z.infer<typeof CovertCellSchema>;

export const PropagandaCampaignSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  level: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type PropagandaCampaign = z.infer<typeof PropagandaCampaignSchema>;

export const SaboteurSchema = z.object({
  id: z.string(),
  name: z.string(),
  syndicateId: z.string(),
  status: z.enum(["active", "exposed", "compromised"]),
  timestamp: z.number().int(),
});
export type Saboteur = z.infer<typeof SaboteurSchema>;

export const EliteEnforcerSchema = z.object({
  id: z.string(),
  name: z.string(),
  factionId: z.string(),
  syndicateId: z.string(),
  status: z.enum(["active", "defeated"]),
  timestamp: z.number().int(),
});
export type EliteEnforcer = z.infer<typeof EliteEnforcerSchema>;

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
  proceduralRooms: z.array(z.any()).optional(),

  // narrative
  journal: z.array(z.string()),
  questStage: z.record(z.string(), z.string()), // questId -> current stage id (Stage 3+)

  // termination
  ended: z.boolean(),
  endingId: z.string().nullable(),

  // environmental state fields
  environment: EnvironmentalStateSchema.optional(),

  // multi-agent synchronization and telemetry
  agents: z.record(z.string(), AgentStateSchema).optional(),
  transactionJournal: z.array(TransactionSchema).optional(),
  stateHistory: z.array(z.any()).optional(),
  vectorClock: z.record(z.string(), z.number()).optional(),
  lootClaims: z.record(z.string(), LootClaimSchema).optional(),
  cooperativeSyncLog: z.array(z.string()).optional(),

  // merchant and economy system
  merchantInventories: z.record(z.string(), z.array(z.string())).optional(),
  tradeHistory: z.array(TradeTransactionSchema).optional(),
  merchantGold: z.record(z.string(), z.number()).optional(),
  merchantLastRestock: z.record(z.string(), z.number()).optional(),
  merchantLastUpdated: z.record(z.string(), z.number()).optional(),
  npcRep: z.record(z.string(), z.number()).optional(),
  factionRep: z.record(z.string(), z.number()).optional(),
  territoryClaims: z.record(z.string(), TerritoryClaimSchema).optional(),
  territoryControl: z.record(z.string(), z.string()).optional(),
  territoryAssists: z.record(z.string(), z.record(z.string(), z.array(z.string()))).optional(),
  taxPolicy: z.record(z.string(), z.number()).optional(),
  taxVotes: z.record(z.string(), z.record(z.string(), TaxVoteSchema)).optional(),
  alliances: z.record(z.string(), z.record(z.string(), AllianceRelationshipSchema)).optional(),
  allianceVotes: z.record(z.string(), z.record(z.string(), AllianceVoteSchema)).optional(),
  
  // decentralized trade routes and tolls
  tradeRoutes: z.record(z.string(), TradeRouteSchema).optional(),
  tradeRouteVotes: z.record(z.string(), z.record(z.string(), TradeRouteVoteSchema)).optional(),
  tradeRoutePolicies: z.record(z.string(), z.number()).optional(),

  // decentralized merchant trade licensing and tariffs
  merchantLicenses: z.record(z.string(), z.array(z.string())).optional(),
  merchantLicensings: z.record(z.string(), MerchantLicensingSchema).optional(),
  tariffVotes: z.record(z.string(), z.record(z.string(), TariffVoteSchema)).optional(),
  tariffPolicy: z.record(z.string(), z.number()).optional(),

  merchantGuilds: z.record(z.string(), MerchantGuildSchema).optional(),
  guildMemberships: z.record(z.string(), z.array(z.string())).optional(),
  guildVotes: z.record(z.string(), z.record(z.string(), GuildVoteSchema)).optional(),
  guildPolicies: z.record(z.string(), GuildPolicySchema).optional(),
  collectiveBargainingAgreements: z.record(z.string(), CollectiveBargainingSchema).optional(),

  smugglerGuilds: z.record(z.string(), SmugglerGuildSchema).optional(),
  smugglerGuildMemberships: z.record(z.string(), z.array(z.string())).optional(),
  smugglerGuildCbaVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), SmugglerGuildCbaVoteSchema))).optional(),
  smugglerGuildCbas: z.record(z.string(), SmugglerGuildCbaSchema).optional(),

  // decentralized merchant cartels and price collusion (AF-39)
  cartels: z.record(z.string(), MerchantCartelSchema).optional(),
  cartelMemberships: z.record(z.string(), z.array(z.string())).optional(),
  cartelVotes: z.record(z.string(), z.record(z.string(), CartelVoteSchema)).optional(),
  cartelPolicies: z.record(z.string(), CartelPolicySchema).optional(),

  // contraband smuggling economy (AF-40)
  contrabandBlacklist: z.record(z.string(), ContrabandBlacklistEntrySchema).optional(),
  blackMarketPayouts: z.record(z.string(), BlackMarketPayoutEntrySchema).optional(),

  // Smuggling Bounty Hunters & Enforcement Agents (AF-41)
  bounties: z.record(z.string(), BountySchema).optional(),
  enforcers: z.record(z.string(), EnforcerSchema).optional(),

  // Cartel Smuggling Insurance and Bribe Mechanics (AF-42)
  smugglingInsurance: z.record(z.string(), SmugglingInsuranceSchema).optional(),
  bribes: z.record(z.string(), BribeSchema).optional(),

  // Decentralized Crime Syndicates and Contraband Production Labs (AF-43)
  syndicates: z.record(z.string(), CrimeSyndicateSchema).optional(),
  productionLabs: z.record(z.string(), ProductionLabSchema).optional(),

  // Syndicate Turf Wars and Global Market Influences (AF-44)
  syndicateTurfClaims: z.record(z.string(), SyndicateTurfClaimSchema).optional(),
  syndicateTurf: z.record(z.string(), z.string()).optional(),
  enforcementHeat: z.record(z.string(), EnforcementHeatEntrySchema).optional(),
  protectionRackets: z.record(z.string(), ProtectionRacketSchema).optional(),
  syndicateBribes: z.record(z.string(), SyndicateBribeSchema).optional(),
  deflectionPolicies: z.record(z.string(), DeflectionPolicySchema).optional(),
  safehouses: z.record(z.string(), SyndicateSafehouseSchema).optional(),
  blackMarkets: z.record(z.string(), SyndicateBlackMarketSchema).optional(),
  frontBusinesses: z.record(z.string(), SyndicateFrontBusinessSchema).optional(),
  turfGuards: z.record(z.string(), TurfGuardSchema).optional(),
  syndicateTaxVotes: z.record(z.string(), z.record(z.string(), SyndicateTaxVoteSchema)).optional(),
  turfCheckpoints: z.record(z.string(), TurfCheckpointSchema).optional(),
  syndicateBribeVotes: z.record(z.string(), z.record(z.string(), SyndicateBribeVoteSchema)).optional(),
  syndicateWaiverVotes: z.record(z.string(), z.record(z.string(), SyndicateWaiverVoteSchema)).optional(),
  turfGuardOutposts: z.record(z.string(), TurfGuardOutpostSchema).optional(),
  smugglingConvoys: z.record(z.string(), SmugglingConvoySchema).optional(),
  convoyInsurance: z.record(z.string(), ConvoyInsuranceSchema).optional(),
  undercoverAgents: z.record(z.string(), UndercoverAgentSchema).optional(),
  informants: z.record(z.string(), InformantSchema).optional(),
  raidWarnings: z.record(z.string(), RaidWarningSchema).optional(),
  espionageNetworks: z.record(z.string(), EspionageNetworkSchema).optional(),
  wiretaps: z.record(z.string(), WiretapSchema).optional(),
  cartelGlobalTaxVotes: z.record(z.string(), z.record(z.string(), TaxVoteSchema)).optional(),
  cartelGlobalTaxPolicy: z.record(z.string(), z.number()).optional(),
  syndicateAlliances: z.record(z.string(), z.record(z.string(), AllianceRelationshipSchema)).optional(),
  syndicateAllianceVotes: z.record(z.string(), z.record(z.string(), AllianceVoteSchema)).optional(),
  factionWars: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  defenseFortresses: z.record(z.string(), DefenseFortressSchema).optional(),
  peaceTreatyVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), PeaceTreatyVoteSchema))).optional(),
  covertCells: z.record(z.string(), CovertCellSchema).optional(),
  propagandaCampaigns: z.record(z.string(), PropagandaCampaignSchema).optional(),
  saboteurs: z.record(z.string(), SaboteurSchema).optional(),
  eliteEnforcers: z.record(z.string(), EliteEnforcerSchema).optional(),
});


export type GameState = z.infer<typeof GameStateSchema>;

export const createInitialState = (options: {
  seed: number;
  start: string;
  varsInit?: Record<string, number>;
  flagsInit?: string[];
  agentsInit?: string[];
  factionRepInit?: Record<string, number>;
  territoryControlInit?: Record<string, string>;
}): GameState => {
  const flags: Record<string, boolean> = {};
  if (options.flagsInit) {
    for (const flag of options.flagsInit) {
      flags[flag] = true;
    }
  }

  const agents: Record<string, AgentState> = {};
  if (options.agentsInit) {
    for (const agentId of options.agentsInit) {
      agents[agentId] = {
        id: agentId,
        current: options.start,
        inventory: [],
      };
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
    proceduralRooms: [],
    journal: [],
    questStage: {},
    ended: false,
    endingId: null,
    environment: {
      weather: "clear",
      temperature: "mild",
      lastUpdatedStep: 0,
    },
    agents: options.agentsInit ? agents : undefined,
    transactionJournal: [],
    stateHistory: [],
    vectorClock: options.agentsInit ? Object.fromEntries(options.agentsInit.map((id) => [id, 0])) : {},
    lootClaims: {},
    cooperativeSyncLog: [],
    merchantInventories: {},
    tradeHistory: [],
    merchantGold: {},
    merchantLastRestock: {},
    merchantLastUpdated: {},
    npcRep: {},
    factionRep: options.factionRepInit ?? {},
    territoryClaims: {},
    territoryControl: options.territoryControlInit ?? {},
    territoryAssists: {},
    taxPolicy: {},
    taxVotes: {},
    alliances: {},
    allianceVotes: {},
    tradeRoutes: {},
    tradeRouteVotes: {},
    tradeRoutePolicies: {},
    merchantGuilds: {},
    guildMemberships: {},
    guildVotes: {},
    guildPolicies: {},
    collectiveBargainingAgreements: {},
    smugglerGuilds: {},
    smugglerGuildMemberships: {},
    smugglerGuildCbaVotes: {},
    smugglerGuildCbas: {},
    cartels: {},
    cartelMemberships: {},
    cartelVotes: {},
    cartelPolicies: {},
    contrabandBlacklist: {},
    blackMarketPayouts: {},
    bounties: {},
    enforcers: {},
    smugglingInsurance: {},
    bribes: {},
    syndicates: {},
    productionLabs: {},
    syndicateTurfClaims: {},
    syndicateTurf: {},
    enforcementHeat: {},
    protectionRackets: {},
    syndicateBribes: {},
    deflectionPolicies: {},
    safehouses: {},
    blackMarkets: {},
    frontBusinesses: {},
    turfGuards: {},
    syndicateTaxVotes: {},
    turfCheckpoints: {},
    syndicateBribeVotes: {},
    syndicateWaiverVotes: {},
    turfGuardOutposts: {},
    smugglingConvoys: {},
    convoyInsurance: {},
    undercoverAgents: {},
    informants: {},
    raidWarnings: {},
    cartelGlobalTaxVotes: {},
    cartelGlobalTaxPolicy: {},
    syndicateAlliances: {},
    syndicateAllianceVotes: {},
    factionWars: {},
    covertCells: {},
    propagandaCampaigns: {},
    saboteurs: {},
    eliteEnforcers: {},
  };
};


export function getFactionRepInit(pack: any): Record<string, number> | undefined {
  if (!pack || !pack.factions) return undefined;
  const init: Record<string, number> = {};
  for (const f of pack.factions) {
    init[f.id] = f.initial_rep ?? 0;
  }
  return init;
}

export function getTerritoryControlInit(pack: any): Record<string, string> | undefined {
  if (!pack || !pack.rooms) return undefined;
  const init: Record<string, string> = {};
  for (const r of pack.rooms) {
    if (r.faction) {
      init[r.id] = r.faction;
    }
  }
  return init;
}

export function reconcileTerritories(state: GameState, pack: any): GameState {
  if (!state.territoryClaims) return state;

  const newState = {
    ...state,
    territoryControl: { ...(state.territoryControl || {}) },
  };

  for (const [roomId, claim] of Object.entries(newState.territoryClaims || {})) {
    newState.territoryControl[roomId] = claim.factionId;
  }

  return newState;
}

export function reconcileSyndicateTurf(state: GameState, pack: any): GameState {
  if (!state.syndicateTurfClaims) return state;

  const newState = {
    ...state,
    syndicateTurf: { ...(state.syndicateTurf || {}) },
  };

  for (const [roomId, claim] of Object.entries(newState.syndicateTurfClaims || {})) {
    newState.syndicateTurf[roomId] = claim.syndicateId;
  }

  return newState;
}

export function reconcileTaxPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    taxPolicy: { ...(state.taxPolicy || {}) },
  };

  if (!newState.taxVotes) {
    newState.taxVotes = {};
  }

  for (const [factionId, votes] of Object.entries(newState.taxVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.taxPolicy[factionId] = consensusRate;
  }

  return newState;
}

export function reconcileLootClaims(state: GameState, pack: any): GameState {
  if (!state.lootClaims) return state;

  const newState = {
    ...state,
    inventory: [...state.inventory],
    objectState: cloneObjectState(state.objectState),
    agents: cloneAgents(state.agents),
  };

  for (const [key, claim] of Object.entries(newState.lootClaims || {})) {
    const [chestId, itemId] = key.split(":");
    const winnerId = claim.claimedBy;

    // 1. Initialize chest in objectState from pack if not yet present
    if (!newState.objectState[chestId] && pack && pack.objects) {
      const packObj = pack.objects.find((o: any) => o.id === chestId);
      if (packObj) {
        newState.objectState[chestId] = {
          open: packObj.open,
          locked: packObj.locked,
          contents: packObj.contents ? [...packObj.contents] : [],
        };
      }
    }

    // 2. Remove from chest contents if chest exists
    const chestRuntime = newState.objectState[chestId];
    if (chestRuntime && chestRuntime.contents) {
      chestRuntime.contents = chestRuntime.contents.filter((item: string) => item !== itemId);
    }

    // 3. Update agents' inventories
    if (newState.agents) {
      for (const agentId of Object.keys(newState.agents)) {
        const agent = newState.agents[agentId];
        if (agentId === winnerId) {
          if (!agent.inventory.includes(itemId)) {
            agent.inventory.push(itemId);
          }
        } else {
          agent.inventory = agent.inventory.filter((item: string) => item !== itemId);
        }
      }
    }

    // Also update the global player inventory if the winner is the current player
    if (winnerId === newState.current) {
      if (!newState.inventory.includes(itemId)) {
        newState.inventory.push(itemId);
      }
    } else {
      newState.inventory = newState.inventory.filter((item: string) => item !== itemId);
    }

    // Mark the item's runtime takenBy status
    const itemRuntime = newState.objectState[itemId] ?? {};
    itemRuntime.takenBy = "player";
    newState.objectState[itemId] = itemRuntime;
  }

  return newState;
}

export function findRoom(state: GameState, pack: any, roomId: string): any | undefined {
  if (state.proceduralRooms) {
    const procRoom = state.proceduralRooms.find((r: any) => r.id === roomId);
    if (procRoom) return procRoom;
  }
  if (pack && pack.rooms) {
    return pack.rooms.find((r: any) => r.id === roomId);
  }
  return undefined;
}

export function getRoomExits(state: GameState, currentRoom: any): any[] {
  const exits = [...(currentRoom.exits || [])];
  const prefix = `procedural_exit_${currentRoom.id}_`;
  Object.keys(state.flags).forEach((flag) => {
    if (flag.startsWith(prefix) && state.flags[flag]) {
      const rest = flag.substring(prefix.length);
      const parts = rest.split("_to_");
      if (parts.length === 2) {
        const direction = parts[0];
        const to = parts[1];
        if (!exits.some((e) => e.direction === direction)) {
          exits.push({
            direction,
            to,
            conditions: []
          });
        }
      }
    }
  });
  return exits;
}

export function reconcileAlliances(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    alliances: { ...(state.alliances || {}) },
  };

  if (!newState.allianceVotes) {
    newState.allianceVotes = {};
  }

  // Clear and rebuild alliances from scratch to ensure consistency
  newState.alliances = {};

  for (const [pairKey, votes] of Object.entries(newState.allianceVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [factionA, factionB] = parts;

    const counts: Record<string, number> = { allied: 0, hostile: 0, neutral: 0 };
    for (const vote of Object.values(votes)) {
      counts[vote.targetState] = (counts[vote.targetState] ?? 0) + 1;
    }

    let maxCount = -1;
    let consensusState: "allied" | "hostile" | "neutral" = "neutral";

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort states priority: "allied" > "hostile" > "neutral"
    const statesPriority: ("allied" | "hostile" | "neutral")[] = ["allied", "hostile", "neutral"];
    for (const s of statesPriority) {
      const count = counts[s] ?? 0;
      if (count > maxCount) {
        maxCount = count;
        consensusState = s;
      }
    }

    // Set symmetrically
    if (!newState.alliances[factionA]) {
      newState.alliances[factionA] = {};
    }
    newState.alliances[factionA][factionB] = consensusState;

    if (!newState.alliances[factionB]) {
      newState.alliances[factionB] = {};
    }
    newState.alliances[factionB][factionA] = consensusState;
  }

  return newState;
}

export function reconcileSyndicateAlliances(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicateAlliances: { ...(state.syndicateAlliances || {}) },
  };

  if (!newState.syndicateAllianceVotes) {
    newState.syndicateAllianceVotes = {};
  }

  // Clear and rebuild alliances from scratch to ensure consistency
  newState.syndicateAlliances = {};

  for (const [pairKey, votes] of Object.entries(newState.syndicateAllianceVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateIdA, syndicateIdB] = parts;

    const counts: Record<string, number> = { allied: 0, hostile: 0, neutral: 0 };
    for (const vote of Object.values(votes)) {
      counts[vote.targetState] = (counts[vote.targetState] ?? 0) + 1;
    }

    let maxCount = -1;
    let consensusState: "allied" | "hostile" | "neutral" = "neutral";

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort states priority: "allied" > "hostile" > "neutral"
    const statesPriority: ("allied" | "hostile" | "neutral")[] = ["allied", "hostile", "neutral"];
    for (const s of statesPriority) {
      const count = counts[s] ?? 0;
      if (count > maxCount) {
        maxCount = count;
        consensusState = s;
      }
    }

    // Set symmetrically
    if (!newState.syndicateAlliances[syndicateIdA]) {
      newState.syndicateAlliances[syndicateIdA] = {};
    }
    newState.syndicateAlliances[syndicateIdA][syndicateIdB] = consensusState;

    if (!newState.syndicateAlliances[syndicateIdB]) {
      newState.syndicateAlliances[syndicateIdB] = {};
    }
    newState.syndicateAlliances[syndicateIdB][syndicateIdA] = consensusState;
  }

  return newState;
}

export function reconcileFactionWars(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    factionWars: state.factionWars ? { ...state.factionWars } : {},
    peaceTreatyVotes: state.peaceTreatyVotes ? { ...state.peaceTreatyVotes } : {},
  };

  // Reconcile wars first
  for (const [syndicateId, wars] of Object.entries(newState.factionWars)) {
    newState.factionWars[syndicateId] = {
      ...(newState.factionWars[syndicateId] || {}),
      ...wars,
    };
  }

  // Reconcile peace treaty votes
  if (newState.peaceTreatyVotes) {
    for (const [syndicateId, factionVotes] of Object.entries(newState.peaceTreatyVotes)) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) continue;

      if (!newState.factionWars[syndicateId]) {
        newState.factionWars[syndicateId] = {};
      }

      for (const [factionId, votes] of Object.entries(factionVotes)) {
        const totalMembers = syndicate.members.length;
        let yesVotes = 0;
        let noVotes = 0;

        for (const vote of Object.values(votes)) {
          if (vote.targetState === true) {
            yesVotes++;
          } else {
            noVotes++;
          }
        }

        // Decisive deterministic majority-consensus arbitration rule:
        // If majority of syndicate members vote true, war ends!
        if (yesVotes > totalMembers / 2) {
          newState.factionWars[syndicateId][factionId] = false;
        }
      }
    }
  }

  return newState;
}

export function reconcileTradeRoutes(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    tradeRoutePolicies: { ...(state.tradeRoutePolicies || {}) },
  };

  if (!newState.tradeRouteVotes) {
    newState.tradeRouteVotes = {};
  }

  for (const [routeId, votes] of Object.entries(newState.tradeRouteVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.taxShare] = (counts[vote.taxShare] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.tradeRoutePolicies[routeId] = consensusRate;
  }

  return newState;
}

export function reconcileTariffPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    tariffPolicy: { ...(state.tariffPolicy || {}) },
  };

  if (!newState.tariffVotes) {
    newState.tariffVotes = {};
  }

  for (const [factionId, votes] of Object.entries(newState.tariffVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.tariffPolicy[factionId] = consensusRate;
  }

  return newState;
}

export function reconcileGuildPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    guildPolicies: { ...(state.guildPolicies || {}) },
  };

  if (!newState.guildVotes) {
    newState.guildVotes = {};
  }

  for (const [guildId, votes] of Object.entries(newState.guildVotes)) {
    const tariffCounts: Record<number, number> = {};
    const policyCounts: Record<string, number> = { premium: 0, standard: 0, discount: 0 };

    for (const vote of Object.values(votes)) {
      tariffCounts[vote.tariffRate] = (tariffCounts[vote.tariffRate] ?? 0) + 1;
      policyCounts[vote.exportPricingPolicy] = (policyCounts[vote.exportPricingPolicy] ?? 0) + 1;
    }

    // 1. Reconcile tariffRate (highest rate wins on ties)
    let maxTariffCount = 0;
    let consensusTariff = 0;
    const uniqueTariffs = Object.keys(tariffCounts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueTariffs) {
      const count = tariffCounts[rate];
      if (count > maxTariffCount) {
        maxTariffCount = count;
        consensusTariff = rate;
      }
    }

    // 2. Reconcile exportPricingPolicy (premium > standard > discount priority on ties)
    let maxPolicyCount = -1;
    let consensusPolicy: "premium" | "standard" | "discount" = "standard";
    const policyPriority: ("premium" | "standard" | "discount")[] = ["premium", "standard", "discount"];
    for (const p of policyPriority) {
      const count = policyCounts[p] ?? 0;
      if (count > maxPolicyCount) {
        maxPolicyCount = count;
        consensusPolicy = p;
      }
    }

    newState.guildPolicies[guildId] = {
      tariffRate: consensusTariff,
      exportPricingPolicy: consensusPolicy,
    };
  }

  return newState;
}

export function reconcileCartelPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cartelPolicies: { ...(state.cartelPolicies || {}) },
  };

  if (!newState.cartelVotes) {
    newState.cartelVotes = {};
  }

  for (const [cartelId, votes] of Object.entries(newState.cartelVotes)) {
    const multiplierCounts: Record<number, number> = {};
    const factionEmbargoVotes: Record<string, number> = {};
    const totalVotes = Object.keys(votes).length;

    for (const vote of Object.values(votes)) {
      multiplierCounts[vote.priceMultiplier] = (multiplierCounts[vote.priceMultiplier] ?? 0) + 1;
      for (const factionId of vote.embargoedFactions) {
        factionEmbargoVotes[factionId] = (factionEmbargoVotes[factionId] ?? 0) + 1;
      }
    }

    // 1. Reconcile priceMultiplier (highest rate wins on ties)
    let maxMultiplierCount = 0;
    let consensusMultiplier = 1.0;
    const uniqueMultipliers = Object.keys(multiplierCounts).map(Number).sort((a, b) => b - a);
    for (const mult of uniqueMultipliers) {
      const count = multiplierCounts[mult];
      if (count > maxMultiplierCount) {
        maxMultiplierCount = count;
        consensusMultiplier = mult;
      }
    }

    // 2. Reconcile embargoedFactions (majority consensus: voted by >= 50% of the active cartel voters)
    const consensusEmbargoes: string[] = [];
    const threshold = totalVotes / 2;
    // Sort faction IDs alphabetically to ensure perfect determinism
    const uniqueFactions = Object.keys(factionEmbargoVotes).sort();
    for (const factionId of uniqueFactions) {
      const count = factionEmbargoVotes[factionId];
      if (count >= threshold) {
        consensusEmbargoes.push(factionId);
      }
    }

    newState.cartelPolicies[cartelId] = {
      priceMultiplier: consensusMultiplier,
      embargoedFactions: consensusEmbargoes,
    };
  }

  return newState;
}

export function reconcileSyndicateTaxes(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  if (!newState.syndicateTaxVotes) {
    newState.syndicateTaxVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.syndicateTaxVotes)) {
    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = syndicate.turfTaxRate ?? 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.syndicates[syndicateId] = {
      ...syndicate,
      turfTaxRate: consensusRate,
    };
  }

  return newState;
}

export function cloneMerchantInventories(inventories?: Record<string, string[]>): Record<string, string[]> | undefined {
  if (!inventories) return undefined;
  const clone: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(inventories)) {
    clone[key] = [...value];
  }
  return clone;
}

export function cloneObjectState(objectState: Record<string, ObjectRuntime> | undefined): Record<string, ObjectRuntime> {
  if (!objectState) return {};
  const clone: Record<string, ObjectRuntime> = {};
  for (const [key, value] of Object.entries(objectState)) {
    clone[key] = {
      ...value,
      contents: value.contents ? [...value.contents] : undefined,
    };
  }
  return clone;
}

export function cloneAgents(agents?: Record<string, AgentState>): Record<string, AgentState> | undefined {
  if (!agents) return undefined;
  const clone: Record<string, AgentState> = {};
  for (const [key, value] of Object.entries(agents)) {
    clone[key] = {
      ...value,
      inventory: [...value.inventory],
    };
  }
  return clone;
}

export function cloneStateWithoutHistory(state: GameState): GameState {
  const { stateHistory, ...rest } = state;
  const clone: GameState = {
    ...rest,
    visited: { ...rest.visited },
    flags: { ...rest.flags },
    vars: { ...rest.vars },
    inventory: [...rest.inventory],
    objectState: cloneObjectState(rest.objectState),
    proceduralRooms: rest.proceduralRooms ? rest.proceduralRooms.map(r => ({ ...r })) : undefined,
    journal: [...rest.journal],
    questStage: { ...rest.questStage },
    environment: rest.environment ? { ...rest.environment } : undefined,
    agents: cloneAgents(rest.agents),
    transactionJournal: rest.transactionJournal ? rest.transactionJournal.map(t => ({ ...t })) : undefined,
    vectorClock: rest.vectorClock ? { ...rest.vectorClock } : undefined,
    lootClaims: rest.lootClaims ? { ...rest.lootClaims } : undefined,
    cooperativeSyncLog: rest.cooperativeSyncLog ? [...rest.cooperativeSyncLog] : undefined,
    merchantInventories: cloneMerchantInventories(rest.merchantInventories),
    tradeHistory: rest.tradeHistory ? rest.tradeHistory.map(t => ({ ...t })) : undefined,
    merchantGold: rest.merchantGold ? { ...rest.merchantGold } : undefined,
    merchantLastRestock: rest.merchantLastRestock ? { ...rest.merchantLastRestock } : undefined,
    merchantLastUpdated: rest.merchantLastUpdated ? { ...rest.merchantLastUpdated } : undefined,
    npcRep: rest.npcRep ? { ...rest.npcRep } : undefined,
    factionRep: rest.factionRep ? { ...rest.factionRep } : undefined,
    territoryClaims: rest.territoryClaims ? { ...rest.territoryClaims } : undefined,
    territoryControl: rest.territoryControl ? { ...rest.territoryControl } : undefined,
    territoryAssists: rest.territoryAssists ? JSON.parse(JSON.stringify(rest.territoryAssists)) : undefined,
    taxPolicy: rest.taxPolicy ? { ...rest.taxPolicy } : undefined,
    taxVotes: rest.taxVotes ? JSON.parse(JSON.stringify(rest.taxVotes)) : undefined,
    alliances: rest.alliances ? JSON.parse(JSON.stringify(rest.alliances)) : undefined,
    allianceVotes: rest.allianceVotes ? JSON.parse(JSON.stringify(rest.allianceVotes)) : undefined,
    tradeRoutes: rest.tradeRoutes ? JSON.parse(JSON.stringify(rest.tradeRoutes)) : undefined,
    tradeRouteVotes: rest.tradeRouteVotes ? JSON.parse(JSON.stringify(rest.tradeRouteVotes)) : undefined,
    tradeRoutePolicies: rest.tradeRoutePolicies ? { ...rest.tradeRoutePolicies } : undefined,
    merchantLicenses: rest.merchantLicenses ? JSON.parse(JSON.stringify(rest.merchantLicenses)) : undefined,
    merchantLicensings: rest.merchantLicensings ? JSON.parse(JSON.stringify(rest.merchantLicensings)) : undefined,
    tariffVotes: rest.tariffVotes ? JSON.parse(JSON.stringify(rest.tariffVotes)) : undefined,
    tariffPolicy: rest.tariffPolicy ? { ...rest.tariffPolicy } : undefined,
    merchantGuilds: rest.merchantGuilds ? JSON.parse(JSON.stringify(rest.merchantGuilds)) : undefined,
    guildMemberships: rest.guildMemberships ? JSON.parse(JSON.stringify(rest.guildMemberships)) : undefined,
    guildVotes: rest.guildVotes ? JSON.parse(JSON.stringify(rest.guildVotes)) : undefined,
    guildPolicies: rest.guildPolicies ? JSON.parse(JSON.stringify(rest.guildPolicies)) : undefined,
    collectiveBargainingAgreements: rest.collectiveBargainingAgreements ? JSON.parse(JSON.stringify(rest.collectiveBargainingAgreements)) : undefined,
    smugglerGuilds: rest.smugglerGuilds ? JSON.parse(JSON.stringify(rest.smugglerGuilds)) : undefined,
    smugglerGuildMemberships: rest.smugglerGuildMemberships ? JSON.parse(JSON.stringify(rest.smugglerGuildMemberships)) : undefined,
    smugglerGuildCbaVotes: rest.smugglerGuildCbaVotes ? JSON.parse(JSON.stringify(rest.smugglerGuildCbaVotes)) : undefined,
    smugglerGuildCbas: rest.smugglerGuildCbas ? JSON.parse(JSON.stringify(rest.smugglerGuildCbas)) : undefined,
    cartels: rest.cartels ? JSON.parse(JSON.stringify(rest.cartels)) : undefined,
    cartelMemberships: rest.cartelMemberships ? JSON.parse(JSON.stringify(rest.cartelMemberships)) : undefined,
    cartelVotes: rest.cartelVotes ? JSON.parse(JSON.stringify(rest.cartelVotes)) : undefined,
    cartelPolicies: rest.cartelPolicies ? JSON.parse(JSON.stringify(rest.cartelPolicies)) : undefined,
    contrabandBlacklist: rest.contrabandBlacklist ? JSON.parse(JSON.stringify(rest.contrabandBlacklist)) : undefined,
    blackMarketPayouts: rest.blackMarketPayouts ? JSON.parse(JSON.stringify(rest.blackMarketPayouts)) : undefined,
    bounties: rest.bounties ? JSON.parse(JSON.stringify(rest.bounties)) : undefined,
    enforcers: rest.enforcers ? JSON.parse(JSON.stringify(rest.enforcers)) : undefined,
    smugglingInsurance: rest.smugglingInsurance ? JSON.parse(JSON.stringify(rest.smugglingInsurance)) : undefined,
    bribes: rest.bribes ? JSON.parse(JSON.stringify(rest.bribes)) : undefined,
    syndicates: rest.syndicates ? JSON.parse(JSON.stringify(rest.syndicates)) : undefined,
    productionLabs: rest.productionLabs ? JSON.parse(JSON.stringify(rest.productionLabs)) : undefined,
    syndicateTurfClaims: rest.syndicateTurfClaims ? JSON.parse(JSON.stringify(rest.syndicateTurfClaims)) : undefined,
    syndicateTurf: rest.syndicateTurf ? { ...rest.syndicateTurf } : undefined,
    enforcementHeat: rest.enforcementHeat ? JSON.parse(JSON.stringify(rest.enforcementHeat)) : undefined,
    protectionRackets: rest.protectionRackets ? JSON.parse(JSON.stringify(rest.protectionRackets)) : undefined,
    syndicateBribes: rest.syndicateBribes ? JSON.parse(JSON.stringify(rest.syndicateBribes)) : undefined,
    deflectionPolicies: rest.deflectionPolicies ? JSON.parse(JSON.stringify(rest.deflectionPolicies)) : undefined,
    safehouses: rest.safehouses ? JSON.parse(JSON.stringify(rest.safehouses)) : undefined,
    blackMarkets: rest.blackMarkets ? JSON.parse(JSON.stringify(rest.blackMarkets)) : undefined,
    frontBusinesses: rest.frontBusinesses ? JSON.parse(JSON.stringify(rest.frontBusinesses)) : undefined,
    turfGuards: rest.turfGuards ? JSON.parse(JSON.stringify(rest.turfGuards)) : undefined,
    syndicateTaxVotes: rest.syndicateTaxVotes ? JSON.parse(JSON.stringify(rest.syndicateTaxVotes)) : undefined,
    turfCheckpoints: rest.turfCheckpoints ? JSON.parse(JSON.stringify(rest.turfCheckpoints)) : undefined,
    syndicateBribeVotes: rest.syndicateBribeVotes ? JSON.parse(JSON.stringify(rest.syndicateBribeVotes)) : undefined,
    syndicateWaiverVotes: rest.syndicateWaiverVotes ? JSON.parse(JSON.stringify(rest.syndicateWaiverVotes)) : undefined,
    turfGuardOutposts: rest.turfGuardOutposts ? JSON.parse(JSON.stringify(rest.turfGuardOutposts)) : undefined,
    smugglingConvoys: rest.smugglingConvoys ? JSON.parse(JSON.stringify(rest.smugglingConvoys)) : undefined,
    convoyInsurance: rest.convoyInsurance ? JSON.parse(JSON.stringify(rest.convoyInsurance)) : undefined,
    undercoverAgents: rest.undercoverAgents ? JSON.parse(JSON.stringify(rest.undercoverAgents)) : undefined,
    informants: rest.informants ? JSON.parse(JSON.stringify(rest.informants)) : undefined,
    raidWarnings: rest.raidWarnings ? JSON.parse(JSON.stringify(rest.raidWarnings)) : undefined,
    cartelGlobalTaxVotes: rest.cartelGlobalTaxVotes ? JSON.parse(JSON.stringify(rest.cartelGlobalTaxVotes)) : undefined,
    cartelGlobalTaxPolicy: rest.cartelGlobalTaxPolicy ? { ...rest.cartelGlobalTaxPolicy } : undefined,
    syndicateAlliances: rest.syndicateAlliances ? JSON.parse(JSON.stringify(rest.syndicateAlliances)) : undefined,
    syndicateAllianceVotes: rest.syndicateAllianceVotes ? JSON.parse(JSON.stringify(rest.syndicateAllianceVotes)) : undefined,
    factionWars: rest.factionWars ? JSON.parse(JSON.stringify(rest.factionWars)) : undefined,
    defenseFortresses: rest.defenseFortresses ? JSON.parse(JSON.stringify(rest.defenseFortresses)) : undefined,
    peaceTreatyVotes: rest.peaceTreatyVotes ? JSON.parse(JSON.stringify(rest.peaceTreatyVotes)) : undefined,
    covertCells: rest.covertCells ? JSON.parse(JSON.stringify(rest.covertCells)) : undefined,
    propagandaCampaigns: rest.propagandaCampaigns ? JSON.parse(JSON.stringify(rest.propagandaCampaigns)) : undefined,
    saboteurs: rest.saboteurs ? JSON.parse(JSON.stringify(rest.saboteurs)) : undefined,
    eliteEnforcers: rest.eliteEnforcers ? JSON.parse(JSON.stringify(rest.eliteEnforcers)) : undefined,
  };
  return clone;
}

export function reconcileSyndicateBribes(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  if (!newState.syndicateBribeVotes) {
    newState.syndicateBribeVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.syndicateBribeVotes)) {
    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.amount] = (counts[vote.amount] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusAmount = syndicate.turfBribeCost ?? 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort amounts descending to prefer higher bribe amounts in case of ties.
    const uniqueAmounts = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const amount of uniqueAmounts) {
      const count = counts[amount];
      if (count > maxCount) {
        maxCount = count;
        consensusAmount = amount;
      }
    }

    newState.syndicates[syndicateId] = {
      ...syndicate,
      turfBribeCost: consensusAmount,
    };
  }

  return newState;
}

export function reconcileSyndicateWaivers(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  if (!newState.syndicateWaiverVotes) {
    newState.syndicateWaiverVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.syndicateWaiverVotes)) {
    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.threshold] = (counts[vote.threshold] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusThreshold = syndicate.turfWaiverThreshold ?? 50;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort thresholds descending to prefer higher thresholds.
    const uniqueThresholds = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const threshold of uniqueThresholds) {
      const count = counts[threshold];
      if (count > maxCount) {
        maxCount = count;
        consensusThreshold = threshold;
      }
    }

    newState.syndicates[syndicateId] = {
      ...syndicate,
      turfWaiverThreshold: consensusThreshold,
    };
  }

  return newState;
}

export function reconcileEspionageNetworks(state: GameState, pack: any): GameState {
  return state;
}

export function reconcileWiretaps(state: GameState, pack: any): GameState {
  return state;
}

export function reconcileCovertCells(state: GameState, pack: any): GameState {
  return state;
}

export function reconcilePropagandaCampaigns(state: GameState, pack: any): GameState {
  return state;
}

export function reconcileCartelGlobalTaxes(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cartelGlobalTaxPolicy: state.cartelGlobalTaxPolicy ? { ...state.cartelGlobalTaxPolicy } : {},
  };

  if (!newState.cartelGlobalTaxVotes) {
    newState.cartelGlobalTaxVotes = {};
  }

  for (const [cartelId, votes] of Object.entries(newState.cartelGlobalTaxVotes)) {
    const cartel = newState.cartels?.[cartelId];
    if (!cartel) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = newState.cartelGlobalTaxPolicy[cartelId] ?? 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.cartelGlobalTaxPolicy[cartelId] = consensusRate;
  }

  return newState;
}

export function reconcileSmugglerGuildCbas(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    smugglerGuildCbas: { ...(state.smugglerGuildCbas || {}) },
  };

  if (!newState.smugglerGuildCbaVotes) {
    newState.smugglerGuildCbaVotes = {};
  }

  for (const [guildId, routeVotes] of Object.entries(newState.smugglerGuildCbaVotes)) {
    const guild = newState.smugglerGuilds?.[guildId];
    if (!guild) continue;

    for (const [routeId, votes] of Object.entries(routeVotes)) {
      const counts: Record<number, number> = {};
      for (const vote of Object.values(votes)) {
        counts[vote.agreedToll] = (counts[vote.agreedToll] ?? 0) + 1;
      }

      let maxCount = 0;
      let consensusToll = 0;

      // Tie-breaker: sort descending to keep it uniform with other voting systems
      const uniqueTolls = Object.keys(counts).map(Number).sort((a, b) => b - a);
      for (const toll of uniqueTolls) {
        const count = counts[toll];
        if (count > maxCount) {
          maxCount = count;
          consensusToll = toll;
        }
      }

      const cbaKey = `${guildId}:${routeId}`;
      newState.smugglerGuildCbas[cbaKey] = {
        guildId,
        routeId,
        agreedToll: consensusToll,
      };
    }
  }

  return newState;
}

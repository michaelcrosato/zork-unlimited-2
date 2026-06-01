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

export const SafehouseRentVoteSchema = z.object({
  rate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SafehouseRentVote = z.infer<typeof SafehouseRentVoteSchema>;

export const BankInterestVoteSchema = z.object({
  rate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type BankInterestVote = z.infer<typeof BankInterestVoteSchema>;

export const SyndicateSafehouseSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  ownerId: z.string(),
  syndicateId: z.string(),
  level: z.number().int().positive(),
  stashCapacity: z.number().int().nonnegative(),
  stashItems: z.array(z.string()),
  timestamp: z.number().int(),
  storageUpgradeLevel: z.number().int().nonnegative().optional(),
  storageRentRate: z.number().int().nonnegative().optional(),
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
  isDreadnought: z.boolean().optional(),
});
export type SmugglingConvoy = z.infer<typeof SmugglingConvoySchema>;

export const TreatyInfiltratorSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  roomId: z.string(),
  timestamp: z.number().int(),
});
export type TreatyInfiltrator = z.infer<typeof TreatyInfiltratorSchema>;

export const TariffExemptionVoteSchema = z.object({
  vote: z.boolean(),
  timestamp: z.number().int(),
});
export type TariffExemptionVote = z.infer<typeof TariffExemptionVoteSchema>;

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
  smugglingRingleader: z.string().optional(),
  warChest: z.number().int().nonnegative().optional(),
  enforcerDefundingRate: z.number().optional(),
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

export const HiddenPassageSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  fromRoomId: z.string(),
  toRoomId: z.string(),
  cost: z.number().int().nonnegative().optional(),
  timestamp: z.number().int(),
});
export type HiddenPassage = z.infer<typeof HiddenPassageSchema>;

export const ContrabandTunnelSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  fromRoomId: z.string(),
  toRoomId: z.string(),
  cost: z.number().int().nonnegative().optional(),
  timestamp: z.number().int(),
});
export type ContrabandTunnel = z.infer<typeof ContrabandTunnelSchema>;

export const TunnelTollPolicySchema = z.object({
  tunnelId: z.string(),
  syndicateId: z.string(),
  tollAmount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TunnelTollPolicy = z.infer<typeof TunnelTollPolicySchema>;

export const TunnelDroneSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  tunnelId: z.string(),
  cargoCapacity: z.number().int().nonnegative(),
  active: z.boolean(),
  cost: z.number().int().nonnegative().optional(),
  timestamp: z.number().int(),
});
export type TunnelDrone = z.infer<typeof TunnelDroneSchema>;


export const FactionInfiltrationSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  cost: z.number().int().nonnegative().optional(),
  dominanceBonus: z.number().int(),
  timestamp: z.number().int(),
});
export type FactionInfiltration = z.infer<typeof FactionInfiltrationSchema>;

export const SyndicateLoanSchema = z.object({
  agentId: z.string(),
  amount: z.number().int().nonnegative(),
  collateralType: z.enum(["safehouse", "outpost"]),
  collateralId: z.string(),
  interestAccrued: z.number().int().nonnegative(),
  borrowStep: z.number().int().nonnegative(),
  dueStep: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  refinancedInterestRate: z.number().int().nonnegative().optional(),
});
export type SyndicateLoan = z.infer<typeof SyndicateLoanSchema>;

export const SyndicateBankSchema = z.object({
  syndicateId: z.string(),
  balances: z.record(z.string(), z.number().int().nonnegative()),
  timestamp: z.number().int(),
  vaultUpgradeLevel: z.number().int().nonnegative().optional(),
  withdrawalTariff: z.number().int().nonnegative().optional(),
  interestRate: z.number().int().nonnegative().optional(),
  loans: z.record(z.string(), SyndicateLoanSchema).optional(),
});
export type SyndicateBank = z.infer<typeof SyndicateBankSchema>;

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

export const LegendaryHitmanSchema = z.object({
  id: z.string(),
  name: z.string(),
  syndicateId: z.string(),
  status: z.enum(["active", "retired", "dispatched"]),
  timestamp: z.number().int(),
});
export type LegendaryHitman = z.infer<typeof LegendaryHitmanSchema>;

export const DecoyConvoySchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  routeId: z.string(),
  currentRoomIndex: z.number().int().nonnegative(),
  status: z.enum(["en_route", "completed", "diverted"]),
  timestamp: z.number().int(),
});
export type DecoyConvoy = z.infer<typeof DecoyConvoySchema>;

export const EnforcerDefundingVoteSchema = z.object({
  targetReduction: z.number(),
  timestamp: z.number().int(),
});
export type EnforcerDefundingVote = z.infer<typeof EnforcerDefundingVoteSchema>;

export const MastermindContractSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  payoutArbitrageMultiplier: z.number(),
  status: z.enum(["active", "completed", "failed"]),
  progress: z.number().int().nonnegative(),
  duration: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type MastermindContract = z.infer<typeof MastermindContractSchema>;

export const ShadowMarketSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  syndicateId: z.string(),
  timestamp: z.number().int(),
});
export type ShadowMarket = z.infer<typeof ShadowMarketSchema>;

export const ArbitrageContractSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  startRoomId: z.string(),
  endRoomId: z.string(),
  profitSpread: z.number(),
  status: z.enum(["active", "completed", "failed"]),
  progress: z.number().int().nonnegative(),
  duration: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type ArbitrageContract = z.infer<typeof ArbitrageContractSchema>;

export const UnderwriterSabotageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  targetSyndicateId: z.string(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type UnderwriterSabotage = z.infer<typeof UnderwriterSabotageSchema>;

export const BlackOpsSafehouseSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  syndicateId: z.string(),
  timestamp: z.number().int(),
  active: z.boolean(),
  defenses: z.number().int().nonnegative().optional(),
  storedContraband: z.number().int().nonnegative().optional(),
});
export type BlackOpsSafehouse = z.infer<typeof BlackOpsSafehouseSchema>;

export const InterceptorDecoySchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  routeId: z.string(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type InterceptorDecoy = z.infer<typeof InterceptorDecoySchema>;
export const TradeExchangeRateSchema = z.object({
  syndicateId: z.string(),
  baseRate: z.number(),
  timestamp: z.number().int(),
});
export type TradeExchangeRate = z.infer<typeof TradeExchangeRateSchema>;

export const AuditMitigationSchema = z.object({
  roomId: z.string(),
  syndicateId: z.string(),
  mitigationLevel: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type AuditMitigation = z.infer<typeof AuditMitigationSchema>;

export const DepositInsuranceSchema = z.object({
  agentId: z.string(),
  syndicateId: z.string(),
  premiumPaid: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type DepositInsurance = z.infer<typeof DepositInsuranceSchema>;

export const DefaultAlertSchema = z.object({
  agentId: z.string(),
  syndicateId: z.string(),
  defaultStep: z.number().int(),
  timestamp: z.number().int(),
});
export type DefaultAlert = z.infer<typeof DefaultAlertSchema>;

export const LoanRefinancingVoteSchema = z.object({
  newDueStep: z.number().int().nonnegative(),
  newInterestRate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type LoanRefinancingVote = z.infer<typeof LoanRefinancingVoteSchema>;

export const IndividualLoanCollateralSwapVoteSchema = z.object({
  removeCollateralType: z.enum(["safehouse", "outpost"]),
  removeCollateralId: z.string(),
  addCollateralType: z.enum(["safehouse", "outpost"]),
  addCollateralId: z.string(),
  timestamp: z.number().int(),
});
export type IndividualLoanCollateralSwapVote = z.infer<typeof IndividualLoanCollateralSwapVoteSchema>;


export const DebtSettlementVoteSchema = z.object({
  settlementAmount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type DebtSettlementVote = z.infer<typeof DebtSettlementVoteSchema>;

export const JointLoanDebtSettlementVoteSchema = z.object({
  settlementAmount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type JointLoanDebtSettlementVote = z.infer<typeof JointLoanDebtSettlementVoteSchema>;

export const JointLoanCollateralSwapVoteSchema = z.object({
  removeCollateralType: z.enum(["safehouse", "outpost"]),
  removeCollateralId: z.string(),
  addCollateralType: z.enum(["safehouse", "outpost"]),
  addCollateralId: z.string(),
  timestamp: z.number().int(),
});
export type JointLoanCollateralSwapVote = z.infer<typeof JointLoanCollateralSwapVoteSchema>;

export const JointLoanGracePeriodVoteSchema = z.object({
  extensionSteps: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type JointLoanGracePeriodVote = z.infer<typeof JointLoanGracePeriodVoteSchema>;

export const JointLoanPenaltyWaiverVoteSchema = z.object({
  reducedInterestRate: z.number().int().nonnegative(),
  waivePenalty: z.boolean(),
  timestamp: z.number().int(),
});
export type JointLoanPenaltyWaiverVote = z.infer<typeof JointLoanPenaltyWaiverVoteSchema>;

export const JointLoanUnderwriteSchema = z.object({
  groupId: z.string(),
  syndicateId: z.string(),
  baseInterestRate: z.number().int().nonnegative(),
  collateralMultiplier: z.number(),
  timestamp: z.number().int(),
});
export type JointLoanUnderwrite = z.infer<typeof JointLoanUnderwriteSchema>;

export const JointLoanUnderwriteVoteSchema = z.object({
  syndicateId: z.string(),
  members: z.array(z.string()),
  timestamp: z.number().int(),
});
export type JointLoanUnderwriteVote = z.infer<typeof JointLoanUnderwriteVoteSchema>;

export const JointLoanInsurancePoolSchema = z.object({
  syndicateId: z.string(),
  poolGold: z.number().int().nonnegative(),
  premiumRate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type JointLoanInsurancePool = z.infer<typeof JointLoanInsurancePoolSchema>;

export const AgentPremiumPolicySchema = z.object({
  agentId: z.string(),
  syndicateId: z.string(),
  groupId: z.string(),
  premiumPaid: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type AgentPremiumPolicy = z.infer<typeof AgentPremiumPolicySchema>;

export const ReinsuranceVoteSchema = z.object({
  targetState: z.boolean(),
  maxLiquidityLimit: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type ReinsuranceVote = z.infer<typeof ReinsuranceVoteSchema>;

export const ReinsuranceContractSchema = z.object({
  id: z.string(),
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  maxLiquidityLimit: z.number().int().nonnegative(),
  active: z.boolean(),
  borrowedAfromB: z.number().int().nonnegative(),
  borrowedBfromA: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type ReinsuranceContract = z.infer<typeof ReinsuranceContractSchema>;

export const ReinsuranceTransferVoteSchema = z.object({
  fromSyndicateId: z.string(),
  toSyndicateId: z.string(),
  amount: z.number().int().nonnegative(),
  targetState: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceTransferVote = z.infer<typeof ReinsuranceTransferVoteSchema>;

export const ContagionShieldVoteSchema = z.object({
  targetState: z.boolean(),
  timestamp: z.number().int(),
});
export type ContagionShieldVote = z.infer<typeof ContagionShieldVoteSchema>;

export const ContagionShieldSchema = z.object({
  id: z.string(),
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type ContagionShield = z.infer<typeof ContagionShieldSchema>;

export const ReinsurancePricingMultiplierSchema = z.object({
  contractId: z.string(),
  multiplier: z.number(),
  timestamp: z.number().int(),
});
export type ReinsurancePricingMultiplier = z.infer<typeof ReinsurancePricingMultiplierSchema>;

export const InterestSubsidyVoteSchema = z.object({
  targetState: z.boolean(),
  subsidyRate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type InterestSubsidyVote = z.infer<typeof InterestSubsidyVoteSchema>;

export const InterestSubsidySchema = z.object({
  id: z.string(),
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  subsidyRate: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type InterestSubsidy = z.infer<typeof InterestSubsidySchema>;

export const ReinsuranceCollateralVoteSchema = z.object({
  targetState: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceCollateralVote = z.infer<typeof ReinsuranceCollateralVoteSchema>;

export const ReinsuranceCollateralPledgeSchema = z.object({
  id: z.string(),
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  collateralType: z.enum(["safehouse", "outpost"]),
  collateralId: z.string(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceCollateralPledge = z.infer<typeof ReinsuranceCollateralPledgeSchema>;

export const ReinsuranceRiskRatingVoteSchema = z.object({
  targetState: z.boolean(),
  riskRating: z.enum(["low", "medium", "high"]),
  timestamp: z.number().int(),
});
export type ReinsuranceRiskRatingVote = z.infer<typeof ReinsuranceRiskRatingVoteSchema>;

export const ReinsuranceRiskRatingSchema = z.object({
  id: z.string(), // contractId / pairKey (syndicateIdA:syndicateIdB)
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  riskRating: z.enum(["low", "medium", "high"]),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceRiskRating = z.infer<typeof ReinsuranceRiskRatingSchema>;

export const ReinsuranceLiquidityAuditVoteSchema = z.object({
  targetState: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceLiquidityAuditVote = z.infer<typeof ReinsuranceLiquidityAuditVoteSchema>;

export const ReinsuranceLiquidityAuditSchema = z.object({
  id: z.string(), // syndicateIdA:syndicateIdB:auditStep
  syndicateIdA: z.string(),
  syndicateIdB: z.string(),
  auditStep: z.number().int().nonnegative(),
  verifiedLiquidity: z.number().int().nonnegative(),
  status: z.enum(["pending", "passed", "failed"]),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type ReinsuranceLiquidityAudit = z.infer<typeof ReinsuranceLiquidityAuditSchema>;

export const SecondaryReserveSchema = z.object({
  syndicateId: z.string(),
  reserveGold: z.number().int().nonnegative(),
  reserveRatio: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SecondaryReserve = z.infer<typeof SecondaryReserveSchema>;

export const ReserveRatioVoteSchema = z.object({
  reserveRatio: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type ReserveRatioVote = z.infer<typeof ReserveRatioVoteSchema>;

export const AutomatedBailoutSchema = z.object({
  id: z.string(),
  sourceSyndicateId: z.string(),
  targetSyndicateId: z.string(),
  bailoutAmount: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type AutomatedBailout = z.infer<typeof AutomatedBailoutSchema>;

export const SecondaryReserveVaultSchema = z.object({
  vaultId: z.string(),
  name: z.string(),
  interestRate: z.number(),
  sweepRisk: z.number(),
  timestamp: z.number().int(),
});
export type SecondaryReserveVault = z.infer<typeof SecondaryReserveVaultSchema>;

export const SecondaryReserveInvestmentSchema = z.object({
  syndicateId: z.string(),
  vaultId: z.string(),
  investedGold: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SecondaryReserveInvestment = z.infer<typeof SecondaryReserveInvestmentSchema>;

export const CDOTrancheSchema = z.object({
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  interestRate: z.number(),
  sweepRiskExposure: z.number(),
  totalValue: z.number().int().nonnegative(),
  ownership: z.record(z.string(), z.number().int().nonnegative()),
  timestamp: z.number().int(),
});
export type CDOTranche = z.infer<typeof CDOTrancheSchema>;

export const CDOAssetSchema = z.object({
  type: z.enum(["loan", "investment"]),
  syndicateId: z.string(),
  assetId: z.string(),
  value: z.number().int().positive(),
  originalLoan: SyndicateLoanSchema.optional(),
  originalInvestment: SecondaryReserveInvestmentSchema.optional(),
});
export type CDOAsset = z.infer<typeof CDOAssetSchema>;

export const CDOSchema = z.object({
  id: z.string(),
  creatorSyndicateId: z.string(),
  assets: z.array(CDOAssetSchema),
  totalValue: z.number().int().positive(),
  tranches: z.record(z.enum(["senior", "mezzanine", "equity"]), CDOTrancheSchema),
  timestamp: z.number().int(),
});
export type CDO = z.infer<typeof CDOSchema>;

export const CreditDefaultSwapSchema = z.object({
  id: z.string(),
  buyerSyndicateId: z.string(),
  writerSyndicateId: z.string(),
  cdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  notionalValue: z.number().int().positive(),
  premiumRate: z.number(),
  timestamp: z.number().int(),
  active: z.boolean(),
  marginEnabled: z.boolean().optional(),
});
export type CreditDefaultSwap = z.infer<typeof CreditDefaultSwapSchema>;

export const LeveragedTranchePositionSchema = z.object({
  cdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  borrowedAmount: z.number().int().nonnegative(),
  purchasedStake: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type LeveragedTranchePosition = z.infer<typeof LeveragedTranchePositionSchema>;

export const LockedLiquidityPositionSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  vaultId: z.string(),
  amount: z.number().int().positive(),
  startEpoch: z.number().int().nonnegative(),
  durationEpochs: z.number().int().positive(),
  endEpoch: z.number().int().positive(),
  factionId: z.string(),
  claimed: z.boolean().optional(),
  timestamp: z.number().int(),
});
export type LockedLiquidityPosition = z.infer<typeof LockedLiquidityPositionSchema>;

export const FactionSponsorProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  vaultId: z.string(),
  factionId: z.string(),
  rewardRate: z.number(),
  minLockTerms: z.number().int().positive(),
  timestamp: z.number().int(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type FactionSponsorProposal = z.infer<typeof FactionSponsorProposalSchema>;

export const FactionSponsorPolicySchema = z.object({
  syndicateId: z.string(),
  vaultId: z.string(),
  factionId: z.string(),
  rewardRate: z.number(),
  minLockTerms: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type FactionSponsorPolicy = z.infer<typeof FactionSponsorPolicySchema>;

export const SponsorAuditProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  vaultId: z.string(),
  factionId: z.string(),
  timestamp: z.number().int(),
  resolved: z.boolean().optional(),
  executed: z.boolean().optional(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SponsorAuditProposal = z.infer<typeof SponsorAuditProposalSchema>;

export const SponsorRevocationProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  vaultId: z.string(),
  factionId: z.string(),
  timestamp: z.number().int(),
  resolved: z.boolean().optional(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SponsorRevocationProposal = z.infer<typeof SponsorRevocationProposalSchema>;
 
 
export const RewardSlashingProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  targetSyndicateId: z.string(),
  slashingRate: z.number(),
  maliciousActor: z.string(),
  timestamp: z.number().int(),
  resolved: z.boolean().optional(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type RewardSlashingProposal = z.infer<typeof RewardSlashingProposalSchema>;

export const RehabCampaignProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  targetActor: z.string(),
  factionId: z.string(),
  goldCost: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  resolved: z.boolean().optional(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type RehabCampaignProposal = z.infer<typeof RehabCampaignProposalSchema>;

export const RehabSubsidyProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  subsidyPercentage: z.number().int().min(0).max(50),
  timestamp: z.number().int(),
  resolved: z.boolean().optional(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type RehabSubsidyProposal = z.infer<typeof RehabSubsidyProposalSchema>;

export const FactionLoyaltyBondSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  lockedGold: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type FactionLoyaltyBond = z.infer<typeof FactionLoyaltyBondSchema>;

export const ClaimLoyaltyRankProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  rank: z.enum(["None", "Bronze", "Silver", "Gold", "Platinum"]),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type ClaimLoyaltyRankProposal = z.infer<typeof ClaimLoyaltyRankProposalSchema>;

export const FactionLoyaltyRankSchema = z.object({
  syndicateId: z.string(),
  factionId: z.string(),
  rank: z.enum(["None", "Bronze", "Silver", "Gold", "Platinum"]),
  timestamp: z.number().int(),
});
export type FactionLoyaltyRank = z.infer<typeof FactionLoyaltyRankSchema>;

export const FactionCdoInsurancePoolSchema = z.object({
  id: z.string(),
  factionId: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  insuranceReserve: z.number().int().nonnegative(),
  minLoyaltyRank: z.enum(["None", "Bronze", "Silver", "Gold", "Platinum"]),
  payoutRatio: z.number().min(0).max(1),
  timestamp: z.number().int(),
});
export type FactionCdoInsurancePool = z.infer<typeof FactionCdoInsurancePoolSchema>;

export const CdoMiningBoosterSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  factionId: z.string(),
  campaignName: z.string(),
  bronzeMultiplier: z.number().positive(),
  silverMultiplier: z.number().positive(),
  goldMultiplier: z.number().positive(),
  platinumMultiplier: z.number().positive(),
  timestamp: z.number().int(),
});
export type CdoMiningBooster = z.infer<typeof CdoMiningBoosterSchema>;

export const CooperativeYieldCampaignProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  campaignName: z.string(),
  factionId: z.string(),
  bronzeMultiplier: z.number().positive(),
  silverMultiplier: z.number().positive(),
  goldMultiplier: z.number().positive(),
  platinumMultiplier: z.number().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type CooperativeYieldCampaignProposal = z.infer<typeof CooperativeYieldCampaignProposalSchema>;

export const FactionCdoInsurancePoolProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  factionId: z.string(),
  initialReserve: z.number().int().nonnegative(),
  minLoyaltyRank: z.enum(["None", "Bronze", "Silver", "Gold", "Platinum"]),
  payoutRatio: z.number().min(0).max(1),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type FactionCdoInsurancePoolProposal = z.infer<typeof FactionCdoInsurancePoolProposalSchema>;

export const MultiFactionCdoRiskRatingSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  factionId: z.string(),
  riskRating: z.enum(["low", "medium", "high"]),
  basePremiumRate: z.number(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type MultiFactionCdoRiskRating = z.infer<typeof MultiFactionCdoRiskRatingSchema>;

export const MultiFactionCdoRiskRatingProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  cdoId: z.string(),
  factionId: z.string(),
  riskRating: z.enum(["low", "medium", "high"]),
  basePremiumRate: z.number(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type MultiFactionCdoRiskRatingProposal = z.infer<typeof MultiFactionCdoRiskRatingProposalSchema>;

export const SovereignDebtProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  faceValue: z.number().int().positive(),
  interestRate: z.number().nonnegative(),
  termEpochs: z.number().int().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SovereignDebtProposal = z.infer<typeof SovereignDebtProposalSchema>;

export const SovereignDebtRestructureProposalSchema = z.object({
  id: z.string(),
  bondId: z.string(),
  syndicateId: z.string(),
  extensionEpochs: z.number().int().positive(),
  newInterestRate: z.number().nonnegative(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SovereignDebtRestructureProposal = z.infer<typeof SovereignDebtRestructureProposalSchema>;

export const FactionBailoutProposalSchema = z.object({
  id: z.string(),
  bondId: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type FactionBailoutProposal = z.infer<typeof FactionBailoutProposalSchema>;

export const FactionReserveBondSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  factionId: z.string(),
  faceValue: z.number().int().nonnegative(),
  interestRate: z.number().nonnegative(),
  termEpochs: z.number().int().positive(),
  remainingEpochs: z.number().int().nonnegative(),
  couponPayout: z.number().int().nonnegative(),
  totalRepayment: z.number().int().nonnegative(),
  remainingRepayment: z.number().int().nonnegative(),
  status: z.enum(["Active", "Matured", "Defaulted"]),
  timestamp: z.number().int(),
});
export type FactionReserveBond = z.infer<typeof FactionReserveBondSchema>;

export const ReserveSweepPolicySchema = z.object({
  syndicateId: z.string(),
  sweepMargin: z.number().int().nonnegative(),
  tariffLiquidationRate: z.number().nonnegative(),
  active: z.boolean(),
  accumulatedLiquidatedGold: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type ReserveSweepPolicy = z.infer<typeof ReserveSweepPolicySchema>;

export const ReserveSweepVoteSchema = z.object({
  sweepMargin: z.number().int().nonnegative(),
  tariffLiquidationRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type ReserveSweepVote = z.infer<typeof ReserveSweepVoteSchema>;

export const ReserveSweepContestVoteSchema = z.object({
  contest: z.boolean(),
  timestamp: z.number().int(),
});
export type ReserveSweepContestVote = z.infer<typeof ReserveSweepContestVoteSchema>;

export const LockedLiquidityEpochPoolSchema = z.object({
  epoch: z.number().int().nonnegative(),
  totalLocked: z.number().int().nonnegative(),
  rewardPool: z.number().int().nonnegative(),
  factionId: z.string(),
  claimedSyndicates: z.array(z.string()).optional(),
});
export type LockedLiquidityEpochPool = z.infer<typeof LockedLiquidityEpochPoolSchema>;

export const MarginAccountSchema = z.object({
  syndicateId: z.string(),
  collateral: z.number().int().nonnegative(),
  leveragedCDSIds: z.array(z.string()).optional(),
  leveragedTranchePositions: z.record(z.string(), LeveragedTranchePositionSchema).optional(),
  timestamp: z.number().int(),
  rehypothecationAuthorized: z.boolean().optional(),
  rehypothecationVaultId: z.string().optional(),
  rehypothecationPercentage: z.number().int().nonnegative().max(100).optional(),
  rebalancingEnabled: z.boolean().optional(),
  vaultTargets: z.record(z.string(), z.number().int().nonnegative().max(100)).optional(),
  liquidityBufferRatio: z.number().int().nonnegative().max(100).optional(),
  bufferTriggerRatio: z.number().optional(),
  liquidityBuffer: z.number().int().nonnegative().optional(),
  vaultAllocations: z.record(z.string(), z.number().int().nonnegative()).optional(),
  advisorEnabled: z.boolean().optional(),
  advisorSafetyThreshold: z.number().nonnegative().optional(),
  lockedPositions: z.array(LockedLiquidityPositionSchema).optional(),
});
export type MarginAccount = z.infer<typeof MarginAccountSchema>;

export const CDSTradeProposalSchema = z.object({
  id: z.string(),
  cdsId: z.string(),
  proposerSyndicateId: z.string(),
  counterpartySyndicateId: z.string(),
  role: z.enum(["buyer", "writer"]),
  goldPrice: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type CDSTradeProposal = z.infer<typeof CDSTradeProposalSchema>;

export const CDSVoteSchema = z.object({
  cdsId: z.string(),
  buyerSyndicateId: z.string(),
  writerSyndicateId: z.string(),
  cdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  notionalValue: z.number().int().positive(),
  premiumRate: z.number(),
  side: z.enum(["buyer", "writer"]),
  timestamp: z.number().int(),
  marginEnabled: z.boolean().optional(),
});
export type CDSVote = z.infer<typeof CDSVoteSchema>;

export const DEFAULT_SECONDARY_RESERVE_VAULTS: Record<string, { name: string; interestRate: number; sweepRisk: number }> = {
  safe_savings: {
    name: "Safe Savings Vault",
    interestRate: 0.02,
    sweepRisk: 0.0,
  },
  high_yield: {
    name: "High-Yield Investment Fund",
    interestRate: 0.08,
    sweepRisk: 0.05,
  },
  risk_venture: {
    name: "High-Risk Venture Pool",
    interestRate: 0.20,
    sweepRisk: 0.15,
  },
};

export const CreditRecoverySchema = z.object({
  agentId: z.string(),
  startStep: z.number().int().nonnegative(),
  lastRecoveryStep: z.number().int().nonnegative(),
  targetScore: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type CreditRecovery = z.infer<typeof CreditRecoverySchema>;

export const JointLoanCollateralSchema = z.object({
  agentId: z.string(),
  collateralType: z.enum(["safehouse", "outpost"]),
  collateralId: z.string(),
});
export type JointLoanCollateral = z.infer<typeof JointLoanCollateralSchema>;

export const JointLoanProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  members: z.array(z.string()),
  collaterals: z.array(JointLoanCollateralSchema),
  amount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  approvals: z.record(z.string(), z.boolean()),
});
export type JointLoanProposal = z.infer<typeof JointLoanProposalSchema>;

export const JointLoanSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  members: z.array(z.string()),
  collaterals: z.array(JointLoanCollateralSchema),
  amount: z.number().int().nonnegative(),
  interestAccrued: z.number().int().nonnegative(),
  borrowStep: z.number().int().nonnegative(),
  dueStep: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  refinancedInterestRate: z.number().int().nonnegative().optional(),
  gracePeriodSteps: z.number().int().nonnegative().optional(),
  reducedInterestRate: z.number().int().nonnegative().optional(),
  waivePenalty: z.boolean().optional(),
});
export type JointLoan = z.infer<typeof JointLoanSchema>;

export const JointLoanCollateralSubstitutionVoteSchema = z.object({
  removeCollateral: JointLoanCollateralSchema,
  addCollateral: JointLoanCollateralSchema.optional(),
  timestamp: z.number().int(),
});
export type JointLoanCollateralSubstitutionVote = z.infer<typeof JointLoanCollateralSubstitutionVoteSchema>;

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
  legendaryHitmen: z.record(z.string(), LegendaryHitmanSchema).optional(),
  decoyConvoys: z.record(z.string(), DecoyConvoySchema).optional(),
  enforcerDefundingVotes: z.record(z.string(), z.record(z.string(), EnforcerDefundingVoteSchema)).optional(),
  mastermindContracts: z.record(z.string(), MastermindContractSchema).optional(),
  shadowMarkets: z.record(z.string(), ShadowMarketSchema).optional(),
  arbitrageContracts: z.record(z.string(), ArbitrageContractSchema).optional(),
  underwriterSabotages: z.record(z.string(), UnderwriterSabotageSchema).optional(),
  blackOpsSafehouses: z.record(z.string(), BlackOpsSafehouseSchema).optional(),
  interceptorDecoys: z.record(z.string(), InterceptorDecoySchema).optional(),
  shadowAlliances: z.record(z.string(), z.record(z.string(), AllianceRelationshipSchema)).optional(),
  shadowAllianceVotes: z.record(z.string(), z.record(z.string(), AllianceVoteSchema)).optional(),
  treatyInfiltrators: z.record(z.string(), TreatyInfiltratorSchema).optional(),
  tariffExemptionVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), TariffExemptionVoteSchema))).optional(),
  tariffExemptionPolicies: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  hiddenPassages: z.record(z.string(), HiddenPassageSchema).optional(),
  contrabandTunnels: z.record(z.string(), ContrabandTunnelSchema).optional(),
  tunnelTolls: z.record(z.string(), TunnelTollPolicySchema).optional(),
  tunnelDrones: z.record(z.string(), TunnelDroneSchema).optional(),
  factionInfiltrations: z.record(z.string(), FactionInfiltrationSchema).optional(),
  syndicateBanks: z.record(z.string(), SyndicateBankSchema).optional(),
  tradeExchangeRates: z.record(z.string(), TradeExchangeRateSchema).optional(),
  auditMitigations: z.record(z.string(), AuditMitigationSchema).optional(),
  stashItemOwners: z.record(z.string(), z.string()).optional(),
  safehouseRentVotes: z.record(z.string(), z.record(z.string(), SafehouseRentVoteSchema)).optional(),
  safehouseRentPolicies: z.record(z.string(), z.number()).optional(),
  bankInterestVotes: z.record(z.string(), z.record(z.string(), BankInterestVoteSchema)).optional(),
  bankInterestPolicies: z.record(z.string(), z.number()).optional(),
  depositInsurance: z.record(z.string(), z.record(z.string(), DepositInsuranceSchema)).optional(),
  creditRatings: z.record(z.string(), z.number().int()).optional(),
  defaultAlerts: z.record(z.string(), DefaultAlertSchema).optional(),
  loanRefinancingVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), LoanRefinancingVoteSchema))).optional(),
  individualLoanCollateralSwapVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), IndividualLoanCollateralSwapVoteSchema))).optional(),
  creditRecoveries: z.record(z.string(), CreditRecoverySchema).optional(),
  debtSettlementVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), DebtSettlementVoteSchema))).optional(),
  jointLoanProposals: z.record(z.string(), JointLoanProposalSchema).optional(),
  jointLoans: z.record(z.string(), JointLoanSchema).optional(),
  jointLoanRefinancingVotes: z.record(z.string(), z.record(z.string(), LoanRefinancingVoteSchema)).optional(),
  jointLoanCollateralSubstitutionVotes: z.record(z.string(), z.record(z.string(), JointLoanCollateralSubstitutionVoteSchema)).optional(),
  jointLoanDebtSettlementVotes: z.record(z.string(), z.record(z.string(), JointLoanDebtSettlementVoteSchema)).optional(),
  jointLoanCollateralSwapVotes: z.record(z.string(), z.record(z.string(), JointLoanCollateralSwapVoteSchema)).optional(),
  jointLoanGracePeriodVotes: z.record(z.string(), z.record(z.string(), JointLoanGracePeriodVoteSchema)).optional(),
  jointLoanPenaltyWaiverVotes: z.record(z.string(), z.record(z.string(), JointLoanPenaltyWaiverVoteSchema)).optional(),
  jointLoanUnderwrites: z.record(z.string(), JointLoanUnderwriteSchema).optional(),
  jointLoanUnderwriteVotes: z.record(z.string(), z.record(z.string(), JointLoanUnderwriteVoteSchema)).optional(),
  groupDefaults: z.record(z.string(), z.number().int()).optional(),
  jointLoanInsurancePools: z.record(z.string(), JointLoanInsurancePoolSchema).optional(),
  agentPremiumPolicies: z.record(z.string(), AgentPremiumPolicySchema).optional(),
  reinsuranceContracts: z.record(z.string(), ReinsuranceContractSchema).optional(),
  reinsuranceVotes: z.record(z.string(), z.record(z.string(), ReinsuranceVoteSchema)).optional(),
  reinsuranceTransferVotes: z.record(z.string(), z.record(z.string(), ReinsuranceTransferVoteSchema)).optional(),
  executedReinsuranceTransfers: z.record(z.string(), z.boolean()).optional(),
  contagionShields: z.record(z.string(), ContagionShieldSchema).optional(),
  contagionShieldVotes: z.record(z.string(), z.record(z.string(), ContagionShieldVoteSchema)).optional(),
  reinsurancePricingMultipliers: z.record(z.string(), ReinsurancePricingMultiplierSchema).optional(),
  interestSubsidies: z.record(z.string(), InterestSubsidySchema).optional(),
  interestSubsidyVotes: z.record(z.string(), z.record(z.string(), InterestSubsidyVoteSchema)).optional(),
  reinsuranceCollateralPledges: z.record(z.string(), ReinsuranceCollateralPledgeSchema).optional(),
  reinsuranceCollateralVotes: z.record(z.string(), z.record(z.string(), ReinsuranceCollateralVoteSchema)).optional(),
  syndicateDefaults: z.record(z.string(), z.number().int()).optional(),
  reinsuranceRiskRatings: z.record(z.string(), ReinsuranceRiskRatingSchema).optional(),
  reinsuranceRiskRatingVotes: z.record(z.string(), z.record(z.string(), ReinsuranceRiskRatingVoteSchema)).optional(),
  reinsuranceLiquidityAudits: z.record(z.string(), ReinsuranceLiquidityAuditSchema).optional(),
  reinsuranceLiquidityAuditVotes: z.record(z.string(), z.record(z.string(), ReinsuranceLiquidityAuditVoteSchema)).optional(),
  secondaryReserves: z.record(z.string(), SecondaryReserveSchema).optional(),
  reserveRatioVotes: z.record(z.string(), z.record(z.string(), ReserveRatioVoteSchema)).optional(),
  automatedBailouts: z.record(z.string(), AutomatedBailoutSchema).optional(),
  secondaryReserveVaults: z.record(z.string(), SecondaryReserveVaultSchema).optional(),
  secondaryReserveInvestments: z.record(z.string(), z.record(z.string(), SecondaryReserveInvestmentSchema)).optional(),
  cdos: z.record(z.string(), CDOSchema).optional(),
  creditDefaultSwaps: z.record(z.string(), CreditDefaultSwapSchema).optional(),
  creditDefaultSwapVotes: z.record(z.string(), z.record(z.string(), CDSVoteSchema)).optional(),
  creditDefaultSwapTrades: z.record(z.string(), CDSTradeProposalSchema).optional(),
  marginAccounts: z.record(z.string(), MarginAccountSchema).optional(),
  marginRehypothecationVotes: z.record(z.string(), z.record(z.string(), z.object({
    vaultId: z.string(),
    percentage: z.number().int().nonnegative().max(100),
    timestamp: z.number().int(),
  }))).optional(),
  marginRehypothecationRevokeVotes: z.record(z.string(), z.record(z.string(), z.object({
    timestamp: z.number().int(),
  }))).optional(),
  marginRebalancingPolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    vaultTargets: z.record(z.string(), z.number().int().nonnegative().max(100)),
    liquidityBufferRatio: z.number().int().nonnegative().max(100),
    bufferTriggerRatio: z.number(),
    timestamp: z.number().int(),
  }))).optional(),
  rebalancingAdvisorVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    timestamp: z.number().int(),
  }))).optional(),
  advisorSafetyThresholdVotes: z.record(z.string(), z.record(z.string(), z.object({
    threshold: z.number().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  lockedLiquidityPositions: z.record(z.string(), z.array(LockedLiquidityPositionSchema)).optional(),
  lockedLiquidityEpochPools: z.record(z.string(), LockedLiquidityEpochPoolSchema).optional(),
  factionReservePools: z.record(z.string(), z.number().int().nonnegative()).optional(),
  yieldBoostMultipliers: z.record(z.string(), z.number()).optional(),
  lockedCollateralVotes: z.record(z.string(), z.record(z.string(), z.object({
    vaultId: z.string(),
    amount: z.number().int().positive(),
    durationEpochs: z.number().int().positive(),
    factionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  claimLiquidityRewardsVotes: z.record(z.string(), z.record(z.string(), z.object({
    positionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  factionSponsorProposals: z.record(z.string(), FactionSponsorProposalSchema).optional(),
  factionSponsorPolicies: z.record(z.string(), z.record(z.string(), FactionSponsorPolicySchema)).optional(),
  sponsorAuditProposals: z.record(z.string(), SponsorAuditProposalSchema).optional(),
  sponsorRevocationProposals: z.record(z.string(), SponsorRevocationProposalSchema).optional(),
  rewardSlashingProposals: z.record(z.string(), RewardSlashingProposalSchema).optional(),
  rehabCampaignProposals: z.record(z.string(), RehabCampaignProposalSchema).optional(),
  rehabSubsidyProposals: z.record(z.string(), RehabSubsidyProposalSchema).optional(),
  factionLoyaltyBonds: z.record(z.string(), FactionLoyaltyBondSchema).optional(),
  claimLoyaltyRankProposals: z.record(z.string(), ClaimLoyaltyRankProposalSchema).optional(),
  factionLoyaltyRanks: z.record(z.string(), FactionLoyaltyRankSchema).optional(),
  factionCdoInsurancePools: z.record(z.string(), FactionCdoInsurancePoolSchema).optional(),
  cdoMiningBoosters: z.record(z.string(), CdoMiningBoosterSchema).optional(),
  cooperativeYieldCampaignProposals: z.record(z.string(), CooperativeYieldCampaignProposalSchema).optional(),
  factionCdoInsurancePoolProposals: z.record(z.string(), FactionCdoInsurancePoolProposalSchema).optional(),
  multiFactionCdoRiskRatings: z.record(z.string(), MultiFactionCdoRiskRatingSchema).optional(),
  multiFactionCdoRiskRatingProposals: z.record(z.string(), MultiFactionCdoRiskRatingProposalSchema).optional(),
  sovereignDebtProposals: z.record(z.string(), SovereignDebtProposalSchema).optional(),
  sovereignDebtRestructureProposals: z.record(z.string(), SovereignDebtRestructureProposalSchema).optional(),
  factionBailoutProposals: z.record(z.string(), FactionBailoutProposalSchema).optional(),
  factionReserveBonds: z.record(z.string(), FactionReserveBondSchema).optional(),
  reserveSweepPolicies: z.record(z.string(), ReserveSweepPolicySchema).optional(),
  reserveSweepVotes: z.record(z.string(), z.record(z.string(), ReserveSweepVoteSchema)).optional(),
  reserveSweepContestVotes: z.record(z.string(), z.record(z.string(), ReserveSweepContestVoteSchema)).optional(),
  maliciousActors: z.record(z.string(), z.boolean()).optional(),
  slashingRates: z.record(z.string(), z.number()).optional(),
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
    legendaryHitmen: {},
    decoyConvoys: {},
    enforcerDefundingVotes: {},
    mastermindContracts: {},
    shadowMarkets: {},
    arbitrageContracts: {},
    underwriterSabotages: {},
    blackOpsSafehouses: {},
    interceptorDecoys: {},
    shadowAlliances: {},
    shadowAllianceVotes: {},
    treatyInfiltrators: {},
    tariffExemptionVotes: {},
    tariffExemptionPolicies: {},
    tradeExchangeRates: {},
    auditMitigations: {},
    contrabandTunnels: {},
    tunnelTolls: {},
    tunnelDrones: {},
    stashItemOwners: {},
    safehouseRentVotes: {},
    safehouseRentPolicies: {},
    depositInsurance: {},
    creditRatings: {},
    defaultAlerts: {},
    jointLoanUnderwrites: {},
    jointLoanUnderwriteVotes: {},
    groupDefaults: {},
    jointLoanInsurancePools: {},
    agentPremiumPolicies: {},
    reinsuranceContracts: {},
    reinsuranceVotes: {},
    reinsuranceTransferVotes: {},
    executedReinsuranceTransfers: {},
    contagionShields: {},
    contagionShieldVotes: {},
    reinsurancePricingMultipliers: {},
    interestSubsidies: {},
    interestSubsidyVotes: {},
    reinsuranceCollateralPledges: {},
    reinsuranceCollateralVotes: {},
    syndicateDefaults: {},
    reinsuranceRiskRatings: {},
    reinsuranceRiskRatingVotes: {},
    reinsuranceLiquidityAudits: {},
    reinsuranceLiquidityAuditVotes: {},
    secondaryReserves: {},
    reserveRatioVotes: {},
    automatedBailouts: {},
    secondaryReserveVaults: {},
    secondaryReserveInvestments: {},
    creditDefaultSwaps: {},
    creditDefaultSwapVotes: {},
    creditDefaultSwapTrades: {},
    marginAccounts: {},
    marginRehypothecationVotes: {},
    marginRehypothecationRevokeVotes: {},
    marginRebalancingPolicyVotes: {},
    rebalancingAdvisorVotes: {},
    advisorSafetyThresholdVotes: {},
    lockedLiquidityPositions: {},
    lockedLiquidityEpochPools: {},
    factionReservePools: {
      rangers: 10000,
      shadow_guild: 10000,
    },
    yieldBoostMultipliers: {
      "2": 1.2,
      "5": 1.5,
      "10": 2.0,
    },
    lockedCollateralVotes: {},
    claimLiquidityRewardsVotes: {},
    factionSponsorProposals: {},
    factionSponsorPolicies: {},
    sponsorAuditProposals: {},
    sponsorRevocationProposals: {},
    factionCdoInsurancePools: {},
    cdoMiningBoosters: {},
    cooperativeYieldCampaignProposals: {},
    factionCdoInsurancePoolProposals: {},
    multiFactionCdoRiskRatings: {},
    multiFactionCdoRiskRatingProposals: {},
    sovereignDebtProposals: {},
    sovereignDebtRestructureProposals: {},
    factionBailoutProposals: {},
    factionReserveBonds: {},
    reserveSweepPolicies: {},
    reserveSweepVotes: {},
    reserveSweepContestVotes: {},
  };
};

export function getSecondaryReserveVaults(state: GameState): Record<string, SecondaryReserveVault> {
  const vaults = state.secondaryReserveVaults || {};
  if (Object.keys(vaults).length === 0) {
    const defaultVaults: Record<string, SecondaryReserveVault> = {};
    const timestamp = state.step;
    for (const [vaultId, def] of Object.entries(DEFAULT_SECONDARY_RESERVE_VAULTS)) {
      defaultVaults[vaultId] = {
        vaultId,
        name: def.name,
        interestRate: def.interestRate,
        sweepRisk: def.sweepRisk,
        timestamp,
      };
    }
    return defaultVaults;
  }
  return vaults;
}


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
    legendaryHitmen: rest.legendaryHitmen ? JSON.parse(JSON.stringify(rest.legendaryHitmen)) : undefined,
    decoyConvoys: rest.decoyConvoys ? JSON.parse(JSON.stringify(rest.decoyConvoys)) : undefined,
    enforcerDefundingVotes: rest.enforcerDefundingVotes ? JSON.parse(JSON.stringify(rest.enforcerDefundingVotes)) : undefined,
    mastermindContracts: rest.mastermindContracts ? JSON.parse(JSON.stringify(rest.mastermindContracts)) : undefined,
    shadowMarkets: rest.shadowMarkets ? JSON.parse(JSON.stringify(rest.shadowMarkets)) : undefined,
    arbitrageContracts: rest.arbitrageContracts ? JSON.parse(JSON.stringify(rest.arbitrageContracts)) : undefined,
    underwriterSabotages: rest.underwriterSabotages ? JSON.parse(JSON.stringify(rest.underwriterSabotages)) : undefined,
    blackOpsSafehouses: rest.blackOpsSafehouses ? JSON.parse(JSON.stringify(rest.blackOpsSafehouses)) : undefined,
    interceptorDecoys: rest.interceptorDecoys ? JSON.parse(JSON.stringify(rest.interceptorDecoys)) : undefined,
    shadowAlliances: rest.shadowAlliances ? JSON.parse(JSON.stringify(rest.shadowAlliances)) : undefined,
    shadowAllianceVotes: rest.shadowAllianceVotes ? JSON.parse(JSON.stringify(rest.shadowAllianceVotes)) : undefined,
    tariffExemptionVotes: rest.tariffExemptionVotes ? JSON.parse(JSON.stringify(rest.tariffExemptionVotes)) : undefined,
    tariffExemptionPolicies: rest.tariffExemptionPolicies ? JSON.parse(JSON.stringify(rest.tariffExemptionPolicies)) : undefined,
    tradeExchangeRates: rest.tradeExchangeRates ? JSON.parse(JSON.stringify(rest.tradeExchangeRates)) : undefined,
    auditMitigations: rest.auditMitigations ? JSON.parse(JSON.stringify(rest.auditMitigations)) : undefined,
    contrabandTunnels: rest.contrabandTunnels ? JSON.parse(JSON.stringify(rest.contrabandTunnels)) : undefined,
    tunnelTolls: rest.tunnelTolls ? JSON.parse(JSON.stringify(rest.tunnelTolls)) : undefined,
    tunnelDrones: rest.tunnelDrones ? JSON.parse(JSON.stringify(rest.tunnelDrones)) : undefined,
    stashItemOwners: rest.stashItemOwners ? { ...rest.stashItemOwners } : undefined,
    safehouseRentVotes: rest.safehouseRentVotes ? JSON.parse(JSON.stringify(rest.safehouseRentVotes)) : undefined,
    safehouseRentPolicies: rest.safehouseRentPolicies ? { ...rest.safehouseRentPolicies } : undefined,
    syndicateBanks: rest.syndicateBanks ? JSON.parse(JSON.stringify(rest.syndicateBanks)) : undefined,
    depositInsurance: rest.depositInsurance ? JSON.parse(JSON.stringify(rest.depositInsurance)) : undefined,
    creditRatings: rest.creditRatings ? { ...rest.creditRatings } : undefined,
    defaultAlerts: rest.defaultAlerts ? JSON.parse(JSON.stringify(rest.defaultAlerts)) : undefined,
    loanRefinancingVotes: rest.loanRefinancingVotes ? JSON.parse(JSON.stringify(rest.loanRefinancingVotes)) : undefined,
    individualLoanCollateralSwapVotes: rest.individualLoanCollateralSwapVotes ? JSON.parse(JSON.stringify(rest.individualLoanCollateralSwapVotes)) : undefined,
    debtSettlementVotes: rest.debtSettlementVotes ? JSON.parse(JSON.stringify(rest.debtSettlementVotes)) : undefined,
    jointLoanProposals: rest.jointLoanProposals ? JSON.parse(JSON.stringify(rest.jointLoanProposals)) : undefined,
    jointLoans: rest.jointLoans ? JSON.parse(JSON.stringify(rest.jointLoans)) : undefined,
    jointLoanRefinancingVotes: rest.jointLoanRefinancingVotes ? JSON.parse(JSON.stringify(rest.jointLoanRefinancingVotes)) : undefined,
    jointLoanCollateralSubstitutionVotes: rest.jointLoanCollateralSubstitutionVotes ? JSON.parse(JSON.stringify(rest.jointLoanCollateralSubstitutionVotes)) : undefined,
    jointLoanDebtSettlementVotes: rest.jointLoanDebtSettlementVotes ? JSON.parse(JSON.stringify(rest.jointLoanDebtSettlementVotes)) : undefined,
    jointLoanCollateralSwapVotes: rest.jointLoanCollateralSwapVotes ? JSON.parse(JSON.stringify(rest.jointLoanCollateralSwapVotes)) : undefined,
    jointLoanGracePeriodVotes: rest.jointLoanGracePeriodVotes ? JSON.parse(JSON.stringify(rest.jointLoanGracePeriodVotes)) : undefined,
    jointLoanPenaltyWaiverVotes: rest.jointLoanPenaltyWaiverVotes ? JSON.parse(JSON.stringify(rest.jointLoanPenaltyWaiverVotes)) : undefined,
    jointLoanUnderwrites: rest.jointLoanUnderwrites ? JSON.parse(JSON.stringify(rest.jointLoanUnderwrites)) : undefined,
    jointLoanUnderwriteVotes: rest.jointLoanUnderwriteVotes ? JSON.parse(JSON.stringify(rest.jointLoanUnderwriteVotes)) : undefined,
    groupDefaults: rest.groupDefaults ? { ...rest.groupDefaults } : undefined,
    creditRecoveries: rest.creditRecoveries ? JSON.parse(JSON.stringify(rest.creditRecoveries)) : undefined,
    jointLoanInsurancePools: rest.jointLoanInsurancePools ? JSON.parse(JSON.stringify(rest.jointLoanInsurancePools)) : undefined,
    agentPremiumPolicies: rest.agentPremiumPolicies ? JSON.parse(JSON.stringify(rest.agentPremiumPolicies)) : undefined,
    reinsuranceContracts: rest.reinsuranceContracts ? JSON.parse(JSON.stringify(rest.reinsuranceContracts)) : undefined,
    reinsuranceVotes: rest.reinsuranceVotes ? JSON.parse(JSON.stringify(rest.reinsuranceVotes)) : undefined,
    reinsuranceTransferVotes: rest.reinsuranceTransferVotes ? JSON.parse(JSON.stringify(rest.reinsuranceTransferVotes)) : undefined,
    executedReinsuranceTransfers: rest.executedReinsuranceTransfers ? { ...rest.executedReinsuranceTransfers } : undefined,
    contagionShields: rest.contagionShields ? JSON.parse(JSON.stringify(rest.contagionShields)) : undefined,
    contagionShieldVotes: rest.contagionShieldVotes ? JSON.parse(JSON.stringify(rest.contagionShieldVotes)) : undefined,
    reinsurancePricingMultipliers: rest.reinsurancePricingMultipliers ? JSON.parse(JSON.stringify(rest.reinsurancePricingMultipliers)) : undefined,
    interestSubsidies: rest.interestSubsidies ? JSON.parse(JSON.stringify(rest.interestSubsidies)) : undefined,
    interestSubsidyVotes: rest.interestSubsidyVotes ? JSON.parse(JSON.stringify(rest.interestSubsidyVotes)) : undefined,
    reinsuranceCollateralPledges: rest.reinsuranceCollateralPledges ? JSON.parse(JSON.stringify(rest.reinsuranceCollateralPledges)) : undefined,
    reinsuranceCollateralVotes: rest.reinsuranceCollateralVotes ? JSON.parse(JSON.stringify(rest.reinsuranceCollateralVotes)) : undefined,
    syndicateDefaults: rest.syndicateDefaults ? { ...rest.syndicateDefaults } : undefined,
    reinsuranceRiskRatings: rest.reinsuranceRiskRatings ? JSON.parse(JSON.stringify(rest.reinsuranceRiskRatings)) : undefined,
    reinsuranceRiskRatingVotes: rest.reinsuranceRiskRatingVotes ? JSON.parse(JSON.stringify(rest.reinsuranceRiskRatingVotes)) : undefined,
    reinsuranceLiquidityAudits: rest.reinsuranceLiquidityAudits ? JSON.parse(JSON.stringify(rest.reinsuranceLiquidityAudits)) : undefined,
    reinsuranceLiquidityAuditVotes: rest.reinsuranceLiquidityAuditVotes ? JSON.parse(JSON.stringify(rest.reinsuranceLiquidityAuditVotes)) : undefined,
    secondaryReserves: rest.secondaryReserves ? JSON.parse(JSON.stringify(rest.secondaryReserves)) : undefined,
    reserveRatioVotes: rest.reserveRatioVotes ? JSON.parse(JSON.stringify(rest.reserveRatioVotes)) : undefined,
    automatedBailouts: rest.automatedBailouts ? JSON.parse(JSON.stringify(rest.automatedBailouts)) : undefined,
    secondaryReserveVaults: rest.secondaryReserveVaults ? JSON.parse(JSON.stringify(rest.secondaryReserveVaults)) : undefined,
    secondaryReserveInvestments: rest.secondaryReserveInvestments ? JSON.parse(JSON.stringify(rest.secondaryReserveInvestments)) : undefined,
    cdos: rest.cdos ? JSON.parse(JSON.stringify(rest.cdos)) : undefined,
    creditDefaultSwaps: rest.creditDefaultSwaps ? JSON.parse(JSON.stringify(rest.creditDefaultSwaps)) : undefined,
    creditDefaultSwapVotes: rest.creditDefaultSwapVotes ? JSON.parse(JSON.stringify(rest.creditDefaultSwapVotes)) : undefined,
    creditDefaultSwapTrades: rest.creditDefaultSwapTrades ? JSON.parse(JSON.stringify(rest.creditDefaultSwapTrades)) : undefined,
    marginAccounts: rest.marginAccounts ? JSON.parse(JSON.stringify(rest.marginAccounts)) : undefined,
    marginRehypothecationVotes: rest.marginRehypothecationVotes ? JSON.parse(JSON.stringify(rest.marginRehypothecationVotes)) : undefined,
    marginRehypothecationRevokeVotes: rest.marginRehypothecationRevokeVotes ? JSON.parse(JSON.stringify(rest.marginRehypothecationRevokeVotes)) : undefined,
    marginRebalancingPolicyVotes: rest.marginRebalancingPolicyVotes ? JSON.parse(JSON.stringify(rest.marginRebalancingPolicyVotes)) : undefined,
    rebalancingAdvisorVotes: rest.rebalancingAdvisorVotes ? JSON.parse(JSON.stringify(rest.rebalancingAdvisorVotes)) : undefined,
    advisorSafetyThresholdVotes: rest.advisorSafetyThresholdVotes ? JSON.parse(JSON.stringify(rest.advisorSafetyThresholdVotes)) : undefined,
    lockedLiquidityPositions: rest.lockedLiquidityPositions ? JSON.parse(JSON.stringify(rest.lockedLiquidityPositions)) : undefined,
    lockedLiquidityEpochPools: rest.lockedLiquidityEpochPools ? JSON.parse(JSON.stringify(rest.lockedLiquidityEpochPools)) : undefined,
    factionReservePools: rest.factionReservePools ? JSON.parse(JSON.stringify(rest.factionReservePools)) : undefined,
    yieldBoostMultipliers: rest.yieldBoostMultipliers ? JSON.parse(JSON.stringify(rest.yieldBoostMultipliers)) : undefined,
    lockedCollateralVotes: rest.lockedCollateralVotes ? JSON.parse(JSON.stringify(rest.lockedCollateralVotes)) : undefined,
    claimLiquidityRewardsVotes: rest.claimLiquidityRewardsVotes ? JSON.parse(JSON.stringify(rest.claimLiquidityRewardsVotes)) : undefined,
    factionSponsorProposals: rest.factionSponsorProposals ? JSON.parse(JSON.stringify(rest.factionSponsorProposals)) : undefined,
    factionSponsorPolicies: rest.factionSponsorPolicies ? JSON.parse(JSON.stringify(rest.factionSponsorPolicies)) : undefined,
    sponsorAuditProposals: rest.sponsorAuditProposals ? JSON.parse(JSON.stringify(rest.sponsorAuditProposals)) : undefined,
    sponsorRevocationProposals: rest.sponsorRevocationProposals ? JSON.parse(JSON.stringify(rest.sponsorRevocationProposals)) : undefined,
    rewardSlashingProposals: rest.rewardSlashingProposals ? JSON.parse(JSON.stringify(rest.rewardSlashingProposals)) : undefined,
    rehabCampaignProposals: rest.rehabCampaignProposals ? JSON.parse(JSON.stringify(rest.rehabCampaignProposals)) : undefined,
    rehabSubsidyProposals: rest.rehabSubsidyProposals ? JSON.parse(JSON.stringify(rest.rehabSubsidyProposals)) : undefined,
    factionLoyaltyBonds: rest.factionLoyaltyBonds ? JSON.parse(JSON.stringify(rest.factionLoyaltyBonds)) : undefined,
    claimLoyaltyRankProposals: rest.claimLoyaltyRankProposals ? JSON.parse(JSON.stringify(rest.claimLoyaltyRankProposals)) : undefined,
    factionLoyaltyRanks: rest.factionLoyaltyRanks ? JSON.parse(JSON.stringify(rest.factionLoyaltyRanks)) : undefined,
    factionCdoInsurancePools: rest.factionCdoInsurancePools ? JSON.parse(JSON.stringify(rest.factionCdoInsurancePools)) : undefined,
    cdoMiningBoosters: rest.cdoMiningBoosters ? JSON.parse(JSON.stringify(rest.cdoMiningBoosters)) : undefined,
    cooperativeYieldCampaignProposals: rest.cooperativeYieldCampaignProposals ? JSON.parse(JSON.stringify(rest.cooperativeYieldCampaignProposals)) : undefined,
    factionCdoInsurancePoolProposals: rest.factionCdoInsurancePoolProposals ? JSON.parse(JSON.stringify(rest.factionCdoInsurancePoolProposals)) : undefined,
    multiFactionCdoRiskRatings: rest.multiFactionCdoRiskRatings ? JSON.parse(JSON.stringify(rest.multiFactionCdoRiskRatings)) : undefined,
    multiFactionCdoRiskRatingProposals: rest.multiFactionCdoRiskRatingProposals ? JSON.parse(JSON.stringify(rest.multiFactionCdoRiskRatingProposals)) : undefined,
    sovereignDebtProposals: rest.sovereignDebtProposals ? JSON.parse(JSON.stringify(rest.sovereignDebtProposals)) : undefined,
    sovereignDebtRestructureProposals: rest.sovereignDebtRestructureProposals ? JSON.parse(JSON.stringify(rest.sovereignDebtRestructureProposals)) : undefined,
    factionBailoutProposals: rest.factionBailoutProposals ? JSON.parse(JSON.stringify(rest.factionBailoutProposals)) : undefined,
    factionReserveBonds: rest.factionReserveBonds ? JSON.parse(JSON.stringify(rest.factionReserveBonds)) : undefined,
    reserveSweepPolicies: rest.reserveSweepPolicies ? JSON.parse(JSON.stringify(rest.reserveSweepPolicies)) : undefined,
    reserveSweepVotes: rest.reserveSweepVotes ? JSON.parse(JSON.stringify(rest.reserveSweepVotes)) : undefined,
    reserveSweepContestVotes: rest.reserveSweepContestVotes ? JSON.parse(JSON.stringify(rest.reserveSweepContestVotes)) : undefined,
    maliciousActors: rest.maliciousActors ? { ...rest.maliciousActors } : undefined,
    slashingRates: rest.slashingRates ? { ...rest.slashingRates } : undefined,
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

export function reconcileEnforcerDefunding(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  if (!newState.enforcerDefundingVotes) {
    newState.enforcerDefundingVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.enforcerDefundingVotes)) {
    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.targetReduction] = (counts[vote.targetReduction] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = syndicate.enforcerDefundingRate ?? 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort descending to prefer higher reduction (more aggressive defunding) on tie
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
      enforcerDefundingRate: consensusRate,
    };
  }

  return newState;
}

export function reconcileLoanRefinancings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    syndicateBanks: state.syndicateBanks ? { ...state.syndicateBanks } : {},
  };

  if (!newState.loanRefinancingVotes) {
    newState.loanRefinancingVotes = {};
  }

  for (const [syndicateId, borrowerVotes] of Object.entries(newState.loanRefinancingVotes)) {
    const bank = newState.syndicateBanks[syndicateId];
    if (!bank || !bank.loans) continue;

    const updatedLoans = { ...bank.loans };
    let loansChanged = false;

    for (const [borrowerId, votes] of Object.entries(borrowerVotes)) {
      const loan = updatedLoans[borrowerId];
      if (!loan) continue;

      const dueStepCounts: Record<number, number> = {};
      const rateCounts: Record<number, number> = {};

      for (const vote of Object.values(votes)) {
        dueStepCounts[vote.newDueStep] = (dueStepCounts[vote.newDueStep] ?? 0) + 1;
        rateCounts[vote.newInterestRate] = (rateCounts[vote.newInterestRate] ?? 0) + 1;
      }

      let maxDueCount = 0;
      let consensusDueStep = loan.dueStep;
      const uniqueDueSteps = Object.keys(dueStepCounts).map(Number).sort((a, b) => b - a);
      for (const step of uniqueDueSteps) {
        const count = dueStepCounts[step];
        if (count > maxDueCount) {
          maxDueCount = count;
          consensusDueStep = step;
        }
      }

      let maxRateCount = 0;
      let consensusInterestRate = loan.refinancedInterestRate ?? 5;
      const uniqueRates = Object.keys(rateCounts).map(Number).sort((a, b) => b - a);
      for (const rate of uniqueRates) {
        const count = rateCounts[rate];
        if (count > maxRateCount) {
          maxRateCount = count;
          consensusInterestRate = rate;
        }
      }

      if (Object.keys(votes).length > 0) {
        updatedLoans[borrowerId] = {
          ...loan,
          dueStep: consensusDueStep,
          refinancedInterestRate: consensusInterestRate,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
        };
        loansChanged = true;
      }
    }

    if (loansChanged) {
      newState.syndicateBanks[syndicateId] = {
        ...bank,
        loans: updatedLoans,
        timestamp: newState.step,
      };
    }
  }

  return newState;
}

export function reconcileIndividualLoanCollateralSwaps(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    syndicateBanks: state.syndicateBanks ? { ...state.syndicateBanks } : {},
  };

  if (!newState.individualLoanCollateralSwapVotes) {
    newState.individualLoanCollateralSwapVotes = {};
    return newState;
  }

  for (const [syndicateId, borrowerVotes] of Object.entries(newState.individualLoanCollateralSwapVotes)) {
    const bank = newState.syndicateBanks[syndicateId];
    if (!bank || !bank.loans) continue;

    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const updatedLoans = { ...bank.loans };
    let loansChanged = false;

    for (const [borrowerId, votes] of Object.entries(borrowerVotes)) {
      const loan = updatedLoans[borrowerId];
      if (!loan) continue;

      // Count votes for each unique combination of remove/add collateral
      const combinationCounts: Record<string, {
        removeCollateralType: "safehouse" | "outpost";
        removeCollateralId: string;
        addCollateralType: "safehouse" | "outpost";
        addCollateralId: string;
        votes: Set<string>;
        timestamps: number[];
      }> = {};

      for (const [voterId, vote] of Object.entries(votes)) {
        if (syndicate.members.includes(voterId)) {
          const key = `${vote.removeCollateralType}_${vote.removeCollateralId}::${vote.addCollateralType}_${vote.addCollateralId}`;
          if (!combinationCounts[key]) {
            combinationCounts[key] = {
              removeCollateralType: vote.removeCollateralType,
              removeCollateralId: vote.removeCollateralId,
              addCollateralType: vote.addCollateralType,
              addCollateralId: vote.addCollateralId,
              votes: new Set<string>(),
              timestamps: [],
            };
          }
          combinationCounts[key].votes.add(voterId);
          combinationCounts[key].timestamps.push(vote.timestamp);
        }
      }

      const totalMembers = syndicate.members.length;
      let fullyApprovedCombination: any = undefined;

      for (const combo of Object.values(combinationCounts)) {
        if (combo.votes.size > totalMembers / 2) {
          fullyApprovedCombination = combo;
          break; // At most one combination can satisfy strict majority
        }
      }

      if (fullyApprovedCombination) {
        // Swap! Update the loan.
        updatedLoans[borrowerId] = {
          ...loan,
          collateralType: fullyApprovedCombination.addCollateralType,
          collateralId: fullyApprovedCombination.addCollateralId,
          timestamp: Math.max(...fullyApprovedCombination.timestamps),
        };
        loansChanged = true;

        // Clear the votes for this borrower so they don't apply again
        delete borrowerVotes[borrowerId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Individual loan collateral swap for agent ${borrowerId} in syndicate ${syndicateId} bank approved! Swapped ${fullyApprovedCombination.removeCollateralId} (${fullyApprovedCombination.removeCollateralType}) with ${fullyApprovedCombination.addCollateralId} (${fullyApprovedCombination.addCollateralType}).`
        );
      }
    }

    if (loansChanged) {
      newState.syndicateBanks[syndicateId] = {
        ...bank,
        loans: updatedLoans,
        timestamp: newState.step,
      };
    }
  }

  return newState;
}

export function reconcileMarginRehypothecations(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    marginRehypothecationVotes: state.marginRehypothecationVotes ? { ...state.marginRehypothecationVotes } : {},
    marginRehypothecationRevokeVotes: state.marginRehypothecationRevokeVotes ? { ...state.marginRehypothecationRevokeVotes } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;

    // Check if there is a consensus to revoke
    const revokeVotes = newState.marginRehypothecationRevokeVotes?.[syndicateId] || {};
    const validRevokeVoters = Object.keys(revokeVotes).filter(voterId => syndicate.members.includes(voterId));
    const revokeCount = validRevokeVoters.length;

    if (revokeCount > totalMembers / 2) {
      // Revoke!
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        rehypothecationAuthorized: false,
        rehypothecationVaultId: undefined,
        rehypothecationPercentage: undefined,
        timestamp: Math.max(...validRevokeVoters.map(v => revokeVotes[v].timestamp), newState.step),
      };

      // Clear votes for this syndicate so they don't apply repeatedly
      if (newState.marginRehypothecationVotes) {
        delete newState.marginRehypothecationVotes[syndicateId];
      }
      if (newState.marginRehypothecationRevokeVotes) {
        delete newState.marginRehypothecationRevokeVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Rehypothecation] Rehypothecation for Syndicate ${syndicateId} has been REVOKED by consensus majority.`
      );
      continue;
    }

    // Check if there is a consensus to authorize
    const authVotes = newState.marginRehypothecationVotes?.[syndicateId] || {};
    const combinationCounts: Record<string, {
      vaultId: string;
      percentage: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.vaultId}::${vote.percentage}`;
        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            vaultId: vote.vaultId,
            percentage: vote.percentage,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break; // At most one combination can satisfy strict majority
      }
    }

    if (fullyApprovedCombination) {
      // Authorize!
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        rehypothecationAuthorized: true,
        rehypothecationVaultId: fullyApprovedCombination.vaultId,
        rehypothecationPercentage: fullyApprovedCombination.percentage,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      // Clear votes
      if (newState.marginRehypothecationVotes) {
        delete newState.marginRehypothecationVotes[syndicateId];
      }
      if (newState.marginRehypothecationRevokeVotes) {
        delete newState.marginRehypothecationRevokeVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Rehypothecation] Rehypothecation for Syndicate ${syndicateId} authorized by consensus majority (Vault: ${fullyApprovedCombination.vaultId}, Percentage: ${fullyApprovedCombination.percentage}%).`
      );
    }
  }

  return newState;
}

export function reconcileMarginRebalancingPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    marginRebalancingPolicyVotes: state.marginRebalancingPolicyVotes ? { ...state.marginRebalancingPolicyVotes } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.marginRebalancingPolicyVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      enabled: boolean;
      vaultTargets: Record<string, number>;
      liquidityBufferRatio: number;
      bufferTriggerRatio: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        // Deterministic serialization of vaultTargets
        const sortedTargets = Object.entries(vote.vaultTargets || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => `${k}:${v}`)
          .join(",");
        const key = `${vote.enabled}::${sortedTargets}::${vote.liquidityBufferRatio}::${vote.bufferTriggerRatio}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            enabled: vote.enabled,
            vaultTargets: vote.vaultTargets,
            liquidityBufferRatio: vote.liquidityBufferRatio,
            bufferTriggerRatio: vote.bufferTriggerRatio,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break; // At most one combination can satisfy strict majority
      }
    }

    if (fullyApprovedCombination) {
      // Rebalance immediately upon policy activation if enabled is true!
      const collateral = marginAccount.collateral;
      const targetBuffer = Math.floor(collateral * (fullyApprovedCombination.liquidityBufferRatio / 100));
      const targetRehypothecated = collateral - targetBuffer;
      const vaultAllocations: Record<string, number> = {};

      for (const [vaultId, pct] of Object.entries(fullyApprovedCombination.vaultTargets || {})) {
        vaultAllocations[vaultId] = Math.floor(targetRehypothecated * ((pct as number) / 100));
      }
      const sumAllocated = Object.values(vaultAllocations).reduce((a, b) => a + b, 0);
      const liquidityBuffer = collateral - sumAllocated;

      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        rebalancingEnabled: fullyApprovedCombination.enabled,
        vaultTargets: fullyApprovedCombination.vaultTargets,
        liquidityBufferRatio: fullyApprovedCombination.liquidityBufferRatio,
        bufferTriggerRatio: fullyApprovedCombination.bufferTriggerRatio,
        liquidityBuffer,
        vaultAllocations,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      // Clear votes
      if (newState.marginRebalancingPolicyVotes) {
        delete newState.marginRebalancingPolicyVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Margin Rebalancing Policy] Rebalancing policy for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}, Buffer Ratio: ${fullyApprovedCombination.liquidityBufferRatio}%, Buffer Trigger: ${fullyApprovedCombination.bufferTriggerRatio}%).`
      );
    }
  }

  return newState;
}

export function reconcileRebalancingAdvisors(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    rebalancingAdvisorVotes: state.rebalancingAdvisorVotes ? { ...state.rebalancingAdvisorVotes } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.rebalancingAdvisorVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      enabled: boolean;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.enabled}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            enabled: vote.enabled,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break;
      }
    }

    if (fullyApprovedCombination) {
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        advisorEnabled: fullyApprovedCombination.enabled,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      // Clear votes
      if (newState.rebalancingAdvisorVotes) {
        delete newState.rebalancingAdvisorVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Rebalancing Advisor Policy] Rebalancing advisor for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}).`
      );
    }
  }

  return newState;
}

export function reconcileAdvisorSafetyThresholds(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    advisorSafetyThresholdVotes: state.advisorSafetyThresholdVotes ? { ...state.advisorSafetyThresholdVotes } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.advisorSafetyThresholdVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      threshold: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.threshold}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            threshold: vote.threshold,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break;
      }
    }

    if (fullyApprovedCombination) {
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        advisorSafetyThreshold: fullyApprovedCombination.threshold,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      // Clear votes
      if (newState.advisorSafetyThresholdVotes) {
        delete newState.advisorSafetyThresholdVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Advisor Safety Threshold Policy] Advisor safety threshold for Syndicate ${syndicateId} set by consensus majority (Threshold: ${fullyApprovedCombination.threshold}%).`
      );
    }
  }

  return newState;
}

export function reconcileLockedCollateral(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    lockedCollateralVotes: state.lockedCollateralVotes ? { ...state.lockedCollateralVotes } : {},
    lockedLiquidityPositions: state.lockedLiquidityPositions ? { ...state.lockedLiquidityPositions } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.lockedCollateralVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      vaultId: string;
      amount: number;
      durationEpochs: number;
      factionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.vaultId}::${vote.amount}::${vote.durationEpochs}::${vote.factionId}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            vaultId: vote.vaultId,
            amount: vote.amount,
            durationEpochs: vote.durationEpochs,
            factionId: vote.factionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break;
      }
    }

    if (fullyApprovedCombination) {
      const { vaultId, amount, durationEpochs, factionId } = fullyApprovedCombination;
      
      // Calculate current rehypothecated amount in this vault
      let totalRehypothecated = 0;
      if (marginAccount.rebalancingEnabled) {
        totalRehypothecated = marginAccount.vaultAllocations?.[vaultId] ?? 0;
      } else if (marginAccount.rehypothecationAuthorized && marginAccount.rehypothecationVaultId === vaultId) {
        totalRehypothecated = Math.floor(marginAccount.collateral * ((marginAccount.rehypothecationPercentage ?? 0) / 100));
      }

      // Calculate already locked amount in this vault
      const currentEpoch = Math.floor(newState.step / 5);
      const existingPositions = newState.lockedLiquidityPositions?.[syndicateId] ?? [];
      const activeLocked = existingPositions
        .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed)
        .reduce((sum, p) => sum + p.amount, 0);

      const unlockedRehypothecated = totalRehypothecated - activeLocked;

      if (amount <= unlockedRehypothecated) {
        // Success! Create new position
        const startEpoch = currentEpoch;
        const endEpoch = startEpoch + durationEpochs;
        const positionId = `lock_${syndicateId}_${vaultId}_${newState.step}`;

        const newPosition: LockedLiquidityPosition = {
          id: positionId,
          syndicateId,
          vaultId,
          amount,
          startEpoch,
          durationEpochs,
          endEpoch,
          factionId,
          claimed: false,
          timestamp: newState.step,
        };

        // Add to global positions
        if (!newState.lockedLiquidityPositions) newState.lockedLiquidityPositions = {};
        newState.lockedLiquidityPositions[syndicateId] = [
          ...existingPositions,
          newPosition,
        ];

        // Also add to marginAccount.lockedPositions
        newState.marginAccounts[syndicateId] = {
          ...marginAccount,
          lockedPositions: [
            ...(marginAccount.lockedPositions ?? []),
            newPosition,
          ],
          timestamp: newState.step,
        };

        // Initialize faction reserve pool if not already
        if (!newState.factionReservePools) newState.factionReservePools = {};
        if (newState.factionReservePools[factionId] === undefined) {
          newState.factionReservePools[factionId] = 10000; // default 10k reserve
        }

        // Clear votes
        if (newState.lockedCollateralVotes) {
          delete newState.lockedCollateralVotes[syndicateId];
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Locked Liquidity] Syndicate ${syndicateId} locked ${amount} gold of rehypothecated collateral in vault ${vaultId} for ${durationEpochs} epochs with faction ${factionId}.`
        );
      } else {
        // Failed due to insufficient unlocked rehypothecated collateral
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Locked Liquidity Failed] Syndicate ${syndicateId} failed to lock ${amount} gold in vault ${vaultId} (Insufficient unlocked rehypothecated collateral: ${unlockedRehypothecated} < ${amount}).`
        );
        // Clear votes anyway to prevent spamming
        if (newState.lockedCollateralVotes) {
          delete newState.lockedCollateralVotes[syndicateId];
        }
      }
    }
  }

  return newState;
}

export function reconcileClaimLiquidityRewards(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    claimLiquidityRewardsVotes: state.claimLiquidityRewardsVotes ? { ...state.claimLiquidityRewardsVotes } : {},
    lockedLiquidityPositions: state.lockedLiquidityPositions ? { ...state.lockedLiquidityPositions } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
    factionRep: state.factionRep ? { ...state.factionRep } : {},
    maliciousActors: state.maliciousActors ? { ...state.maliciousActors } : {},
    slashingRates: state.slashingRates ? { ...state.slashingRates } : {},
  };

  if (!newState.marginAccounts) {
    return newState;
  }

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.claimLiquidityRewardsVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      positionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.positionId;
        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            positionId: vote.positionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        combinationCounts[key].voters.add(voterId);
        combinationCounts[key].timestamps.push(vote.timestamp);
      }
    }

    let fullyApprovedCombination: any = undefined;
    for (const combo of Object.values(combinationCounts)) {
      if (combo.voters.size > totalMembers / 2) {
        fullyApprovedCombination = combo;
        break;
      }
    }

    if (fullyApprovedCombination) {
      const { positionId } = fullyApprovedCombination;

      // Find the position
      const positions = newState.lockedLiquidityPositions?.[syndicateId] || [];
      const posIndex = positions.findIndex(p => p.id === positionId);
      const position = posIndex !== -1 ? positions[posIndex] : undefined;

      const currentEpoch = Math.floor(newState.step / 5);

      if (position && !position.claimed && currentEpoch >= position.endEpoch) {
        // Calculate reward
        const duration = position.durationEpochs;
        const amount = position.amount;
        const factionId = position.factionId;

        // Reward formula: use policy rate if exists, otherwise default 5% (0.05) per epoch
        const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[position.vaultId];
        const rewardRate = sponsorPolicy ? sponsorPolicy.rewardRate : 0.05;
        const rewardBase = Math.floor(amount * rewardRate * duration);

        // Apply reward slashing if target syndicate or any member is flagged as malicious
        let finalRewardBase = rewardBase;
        const isMalicious = !!(
          newState.maliciousActors?.[syndicateId] ||
          (syndicate.members && syndicate.members.some(memberId => newState.maliciousActors?.[memberId]))
        );
        if (isMalicious) {
          const slashRate = newState.slashingRates?.[syndicateId] ?? 0.5; // default 50%
          finalRewardBase = Math.floor(rewardBase * (1 - slashRate));
        }

        const factionReserves = newState.factionReservePools?.[factionId] ?? 10000;
        const rewardPaid = Math.min(factionReserves, finalRewardBase);

        // Deduct from faction reserves
        if (!newState.factionReservePools) newState.factionReservePools = {};
        newState.factionReservePools[factionId] = factionReserves - rewardPaid;

        // Pay to syndicate war chest
        syndicate.warChest = (syndicate.warChest ?? 0) + rewardPaid;

        // Faction reputation multiplier reward
        const reputationBonus = 5 * duration;
        if (!newState.factionRep) newState.factionRep = {};
        newState.factionRep[factionId] = (newState.factionRep[factionId] ?? 0) + reputationBonus;

        // Mark position as claimed in both GameState and marginAccount
        const updatedPosition = {
          ...position,
          claimed: true,
          timestamp: newState.step,
        };

        // Update in global positions
        positions[posIndex] = updatedPosition;
        newState.lockedLiquidityPositions[syndicateId] = [...positions];

        // Update in marginAccount.lockedPositions
        if (marginAccount.lockedPositions) {
          const maPosIndex = marginAccount.lockedPositions.findIndex(p => p.id === positionId);
          if (maPosIndex !== -1) {
            marginAccount.lockedPositions[maPosIndex] = updatedPosition;
          }
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Claim Liquidity Rewards] Syndicate ${syndicateId} claimed rewards for position ${positionId}. Earned ${rewardPaid} gold and +${reputationBonus} reputation with ${factionId}.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        if (!position) {
          newState.journal.push(`[Claim Liquidity Rewards Failed] Position ${positionId} not found.`);
        } else if (position.claimed) {
          newState.journal.push(`[Claim Liquidity Rewards Failed] Position ${positionId} already claimed.`);
        } else {
          newState.journal.push(`[Claim Liquidity Rewards Failed] Position ${positionId} has not matured yet (Current epoch: ${currentEpoch} < End epoch: ${position.endEpoch}).`);
        }
      }

      // Clear votes
      if (newState.claimLiquidityRewardsVotes) {
        delete newState.claimLiquidityRewardsVotes[syndicateId];
      }
    }
  }

  return newState;
}

export function reconcileDebtSettlements(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    syndicateBanks: state.syndicateBanks ? { ...state.syndicateBanks } : {},
    defaultAlerts: state.defaultAlerts ? { ...state.defaultAlerts } : {},
    creditRatings: state.creditRatings ? { ...state.creditRatings } : {},
    vars: state.vars ? { ...state.vars } : {},
  };

  if (!newState.debtSettlementVotes) {
    newState.debtSettlementVotes = {};
  }

  for (const [syndicateId, borrowerVotes] of Object.entries(newState.debtSettlementVotes)) {
    const bank = newState.syndicateBanks[syndicateId];
    if (!bank || !bank.loans) continue;

    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    const updatedLoans = { ...bank.loans };
    let loansChanged = false;

    for (const [borrowerId, votes] of Object.entries(borrowerVotes)) {
      const loan = updatedLoans[borrowerId];
      if (!loan) continue;

      // Only count votes from current members of the syndicate
      const amountCounts: Record<number, number> = {};
      for (const [voterId, vote] of Object.entries(votes)) {
        if (syndicate.members.includes(voterId)) {
          amountCounts[vote.settlementAmount] = (amountCounts[vote.settlementAmount] ?? 0) + 1;
        }
      }

      const totalMembers = syndicate.members.length;
      let maxCount = 0;
      let consensusAmount = 0;

      // Sort descending to prefer higher settlement amount (more favorable to the bank) on tie
      const uniqueAmounts = Object.keys(amountCounts).map(Number).sort((a, b) => b - a);
      for (const amt of uniqueAmounts) {
        const count = amountCounts[amt];
        if (count > maxCount) {
          maxCount = count;
          consensusAmount = amt;
        }
      }

      // Check for majority approval: votes for the consensus amount > total members / 2
      const isApproved = maxCount > totalMembers / 2;

      if (isApproved) {
        // Agreed! Check if the borrower has enough gold to pay the consensus amount
        const goldKey = borrowerId === "player" ? "gold" : `gold_${borrowerId}`;
        const currentGold = newState.vars[goldKey] ?? (borrowerId === "player" ? 0 : 100);

        if (currentGold >= consensusAmount) {
          // Paid! Deduct gold, delete the loan, clear default alert, restore credit score.
          newState.vars = {
            ...newState.vars,
            [goldKey]: currentGold - consensusAmount,
          };

          delete updatedLoans[borrowerId];
          loansChanged = true;

          // Clear default alert
          const alertKey = `${borrowerId}_${syndicateId}`;
          delete newState.defaultAlerts[alertKey];

          // Restore credit score: increase rating by 15 (just like fully paying back, or maybe more since they settled)
          const currentRating = newState.creditRatings[borrowerId] ?? 100;
          newState.creditRatings[borrowerId] = Math.min(200, currentRating + 15);

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Syndicate Bank] Debt settlement agreed and paid for agent ${borrowerId} in syndicate ${syndicateId} bank. Paid ${consensusAmount} gold. Collateral ${loan.collateralId} is released/unlocked.`
          );

          // Clear the settlement votes for this borrower so they don't apply again
          delete borrowerVotes[borrowerId];
        }
      }
    }

    if (loansChanged) {
      newState.syndicateBanks[syndicateId] = {
        ...bank,
        loans: updatedLoans,
        timestamp: newState.step,
      };
    }
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

export function getEnforcerDefundingRate(state: GameState, targetId?: string): number {
  if (!state.syndicates) return 0;
  if (targetId) {
    const synd = Object.values(state.syndicates).find(s => s.members.includes(targetId));
    if (synd && synd.enforcerDefundingRate !== undefined) {
      return synd.enforcerDefundingRate;
    }
  }
  const playerSynd = Object.values(state.syndicates).find(s => s.members.includes("player"));
  if (playerSynd && playerSynd.enforcerDefundingRate !== undefined) {
    return playerSynd.enforcerDefundingRate;
  }
  let maxRate = 0;
  for (const synd of Object.values(state.syndicates)) {
    if (synd.enforcerDefundingRate !== undefined && synd.enforcerDefundingRate > maxRate) {
      maxRate = synd.enforcerDefundingRate;
    }
  }
  return maxRate;
}

export function reconcileShadowAlliances(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    shadowAlliances: { ...(state.shadowAlliances || {}) },
  };

  if (!newState.shadowAllianceVotes) {
    newState.shadowAllianceVotes = {};
  }

  // Clear and rebuild alliances from scratch to ensure consistency
  newState.shadowAlliances = {};

  for (const [pairKey, votes] of Object.entries(newState.shadowAllianceVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateId, factionId] = parts;

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

    if (!newState.shadowAlliances[syndicateId]) {
      newState.shadowAlliances[syndicateId] = {};
    }
    newState.shadowAlliances[syndicateId][factionId] = consensusState;
  }

  return newState;
}

export function reconcileTariffExemptions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    tariffExemptionPolicies: { ...(state.tariffExemptionPolicies || {}) },
  };

  if (!newState.tariffExemptionVotes) {
    newState.tariffExemptionVotes = {};
  }

  // Clear and rebuild exemptions
  newState.tariffExemptionPolicies = {};

  for (const [factionId, synds] of Object.entries(newState.tariffExemptionVotes)) {
    for (const [syndicateId, votes] of Object.entries(synds)) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) continue;

      let yesVotes = 0;
      for (const voteInfo of Object.values(votes)) {
        if (voteInfo.vote) {
          yesVotes++;
        }
      }

      // Majority consensus: yesVotes > members.length / 2
      const isApproved = yesVotes > syndicate.members.length / 2;

      if (isApproved) {
        if (!newState.tariffExemptionPolicies[factionId]) {
          newState.tariffExemptionPolicies[factionId] = {};
        }
        newState.tariffExemptionPolicies[factionId][syndicateId] = true;
      }
    }
  }

  return newState;
}

export function reconcileSafehouseRentRates(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    safehouses: state.safehouses ? { ...state.safehouses } : {},
    safehouseRentPolicies: state.safehouseRentPolicies ? { ...state.safehouseRentPolicies } : {},
  };

  if (!newState.safehouseRentVotes) {
    newState.safehouseRentVotes = {};
  }

  for (const [roomId, votes] of Object.entries(newState.safehouseRentVotes)) {
    const safehouse = newState.safehouses?.[roomId];
    if (!safehouse) continue;

    const syndicate = newState.syndicates?.[safehouse.syndicateId];
    if (!syndicate) continue;

    // Only count votes from current members of the syndicate
    const counts: Record<number, number> = {};
    for (const [agentId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(agentId)) {
        counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
      }
    }

    let maxCount = 0;
    let consensusRate = newState.safehouseRentPolicies[roomId] ?? 0;

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

    newState.safehouseRentPolicies[roomId] = consensusRate;
    // Mutate the cloned safehouse to keep it in sync
    newState.safehouses[roomId] = {
      ...safehouse,
      storageRentRate: consensusRate,
    };
  }

  return newState;
}

export function getSafehouseStorageCapacity(state: GameState, roomId: string): number {
  const safehouse = state.safehouses?.[roomId];
  if (!safehouse) return 0;
  const baseCap = safehouse.stashCapacity ?? (safehouse.level * 5);
  const upgradeBonus = (safehouse.storageUpgradeLevel ?? 0) * 10;
  const regionalSupplyCap = Math.max(2, 20 - (state.enforcementHeat?.[roomId]?.heat ?? 0));
  return baseCap + upgradeBonus + regionalSupplyCap;
}

export function getSyndicateBankCapacity(state: GameState, syndicateId: string): number {
  const bank = state.syndicateBanks?.[syndicateId];
  const baseCap = 1000;
  const upgradeBonus = (bank?.vaultUpgradeLevel ?? 0) * 500;
  
  // Find controlling rooms heat
  let maxHeat = 0;
  if (state.syndicateTurf) {
    for (const [roomId, ownerId] of Object.entries(state.syndicateTurf)) {
      if (ownerId === syndicateId) {
        const heat = state.enforcementHeat?.[roomId]?.heat ?? 0;
        if (heat > maxHeat) {
          maxHeat = heat;
        }
      }
    }
  }
  const heatReduction = maxHeat * 50;
  const capacity = Math.max(100, baseCap + upgradeBonus - heatReduction);
  return capacity;
}

export function reconcileBankInterestRates(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicateBanks: state.syndicateBanks ? { ...state.syndicateBanks } : {},
    bankInterestPolicies: state.bankInterestPolicies ? { ...state.bankInterestPolicies } : {},
  };

  if (!newState.bankInterestVotes) {
    newState.bankInterestVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.bankInterestVotes)) {
    const bank = newState.syndicateBanks?.[syndicateId];
    if (!bank) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    // Only count votes from current members of the syndicate
    const counts: Record<number, number> = {};
    for (const [agentId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(agentId)) {
        counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
      }
    }

    let maxCount = 0;
    let consensusRate = newState.bankInterestPolicies[syndicateId] ?? 0;

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

    newState.bankInterestPolicies[syndicateId] = consensusRate;
    newState.syndicateBanks[syndicateId] = {
      ...bank,
      interestRate: consensusRate,
    };
  }

  return newState;
}

export function isCollateralLocked(state: GameState, collateralType: "safehouse" | "outpost", collateralId: string): boolean {
  if (state.syndicateBanks) {
    for (const bank of Object.values(state.syndicateBanks)) {
      if (bank.loans) {
        for (const loan of Object.values(bank.loans)) {
          if (loan.collateralType === collateralType && loan.collateralId === collateralId) {
            return true;
          }
        }
      }
    }
  }
  if (state.jointLoans) {
    for (const loan of Object.values(state.jointLoans)) {
      for (const col of loan.collaterals) {
        if (col.collateralType === collateralType && col.collateralId === collateralId) {
          return true;
        }
      }
    }
  }
  if (state.jointLoanProposals) {
    for (const proposal of Object.values(state.jointLoanProposals)) {
      for (const col of proposal.collaterals) {
        if (col.collateralType === collateralType && col.collateralId === collateralId) {
          return true;
        }
      }
    }
  }
  if (state.reinsuranceCollateralPledges) {
    for (const pledge of Object.values(state.reinsuranceCollateralPledges)) {
      if (pledge.active && pledge.collateralType === collateralType && pledge.collateralId === collateralId) {
        return true;
      }
    }
  }
  return false;
}

export function getCollateralValue(state: GameState, collateralType: "safehouse" | "outpost", collateralId: string): number {
  if (collateralType === "safehouse") {
    const safehouse = state.safehouses?.[collateralId];
    if (safehouse) {
      return (safehouse.level * 200) + ((safehouse.storageUpgradeLevel ?? 0) * 100);
    }
  } else if (collateralType === "outpost") {
    const outpost = state.turfGuardOutposts?.[collateralId];
    if (outpost) {
      return (outpost.securityLevel * 150) + (Object.keys(outpost.turrets || {}).length * 100);
    }
  }
  return 0;
}

export function getJointLoanLimit(
  state: GameState,
  syndicateId: string,
  members: string[],
  collaterals: { agentId: string; collateralType: "safehouse" | "outpost"; collateralId: string }[],
  groupId?: string
): number {
  let sumLimits = 0;
  for (const col of collaterals) {
    const colLimit = getSyndicateLoanLimit(state, syndicateId, col.agentId, col.collateralType, col.collateralId);
    sumLimits += colLimit;
  }
  const multiplier = (groupId && state.jointLoanUnderwrites?.[groupId])
    ? state.jointLoanUnderwrites[groupId].collateralMultiplier
    : 1.2;
  return Math.floor(sumLimits * multiplier);
}

export function getSyndicateLoanLimit(
  state: GameState,
  syndicateId: string,
  agentId: string,
  collateralType: "safehouse" | "outpost",
  collateralId: string
): number {
  const syndicate = state.syndicates?.[syndicateId];
  if (!syndicate) return 0;

  const dominance = syndicate.dominance ?? 50;
  const standing = state.npcRep?.[agentId] ?? 100;

  let collateralValue = 0;
  if (collateralType === "safehouse") {
    const safehouse = state.safehouses?.[collateralId];
    if (safehouse) {
      collateralValue = (safehouse.level * 200) + ((safehouse.storageUpgradeLevel ?? 0) * 100);
    }
  } else if (collateralType === "outpost") {
    const outpost = state.turfGuardOutposts?.[collateralId];
    if (outpost) {
      collateralValue = (outpost.securityLevel * 150) + (Object.keys(outpost.turrets || {}).length * 100);
    }
  }

  const scale = (dominance / 50) * (standing / 100);
  const rawLimit = collateralValue * Math.max(0.5, scale);
  const creditRating = Math.max(0, state.creditRatings?.[agentId] ?? 100);
  return Math.floor(rawLimit * (creditRating / 100));
}

export function reconcileJointLoanRefinancings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
  };

  if (!newState.jointLoanRefinancingVotes) {
    newState.jointLoanRefinancingVotes = {};
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanRefinancingVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each (newDueStep, newInterestRate) combination
    const combinationCounts: Record<string, { newDueStep: number; newInterestRate: number; groupVotes: Set<string>; bankVotes: Set<string> }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const key = `${vote.newDueStep}_${vote.newInterestRate}`;
      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          newDueStep: vote.newDueStep,
          newInterestRate: vote.newInterestRate,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[key].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[key].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedCombination: { newDueStep: number; newInterestRate: number; maxTimestamp: number } | undefined;

    for (const combo of Object.values(combinationCounts)) {
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

        fullyApprovedCombination = {
          newDueStep: combo.newDueStep,
          newInterestRate: combo.newInterestRate,
          maxTimestamp,
        };
        break; // Standard majority consensus implies at most one combo can satisfy strict majority of both
      }
    }

    if (fullyApprovedCombination) {
      updatedJointLoans[groupId] = {
        ...jointLoan,
        dueStep: fullyApprovedCombination.newDueStep,
        refinancedInterestRate: fullyApprovedCombination.newInterestRate,
        timestamp: fullyApprovedCombination.maxTimestamp,
      };
      loansChanged = true;

      // Clear the votes so they don't apply again
      delete newState.jointLoanRefinancingVotes[groupId];

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Joint loan ${groupId} has been restructured by consensual majority! New due step: ${fullyApprovedCombination.newDueStep}, new interest rate: ${fullyApprovedCombination.newInterestRate}%.`
      );
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanCollateralSubstitutions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
  };

  if (!newState.jointLoanCollateralSubstitutionVotes) {
    newState.jointLoanCollateralSubstitutionVotes = {};
    return newState;
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanCollateralSubstitutionVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each unique combination of removeCollateral and addCollateral
    const combinationCounts: Record<string, { 
      removeCollateral: any; 
      addCollateral: any; 
      groupVotes: Set<string>; 
      bankVotes: Set<string>; 
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const removeKey = `${vote.removeCollateral.agentId}_${vote.removeCollateral.collateralType}_${vote.removeCollateral.collateralId}`;
      const addKey = vote.addCollateral 
        ? `${vote.addCollateral.agentId}_${vote.addCollateral.collateralType}_${vote.addCollateral.collateralId}`
        : "none";
      const key = `${removeKey}::${addKey}`;

      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          removeCollateral: vote.removeCollateral,
          addCollateral: vote.addCollateral,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[key].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[key].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedCombination: { removeCollateral: any; addCollateral: any; maxTimestamp: number } | undefined;

    for (const combo of Object.values(combinationCounts)) {
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

        fullyApprovedCombination = {
          removeCollateral: combo.removeCollateral,
          addCollateral: combo.addCollateral,
          maxTimestamp,
        };
        break; // Strict majority consensus implies at most one combo can satisfy both
      }
    }

    if (fullyApprovedCombination) {
      // Apply the substitution!
      const currentCollaterals = jointLoan.collaterals.filter(c => 
        !(c.agentId === fullyApprovedCombination!.removeCollateral.agentId && 
          c.collateralType === fullyApprovedCombination!.removeCollateral.collateralType && 
          c.collateralId === fullyApprovedCombination!.removeCollateral.collateralId)
      );

      if (fullyApprovedCombination.addCollateral) {
        currentCollaterals.push(fullyApprovedCombination.addCollateral);
      }

      updatedJointLoans[groupId] = {
        ...jointLoan,
        collaterals: currentCollaterals,
        timestamp: fullyApprovedCombination.maxTimestamp,
      };
      loansChanged = true;

      // Clear the votes so they don't apply again
      delete newState.jointLoanCollateralSubstitutionVotes[groupId];

      if (!newState.journal) newState.journal = [];
      const logMsg = fullyApprovedCombination.addCollateral
        ? `[Syndicate Bank] Joint loan ${groupId} collateral substitution consensual majority! Removed ${fullyApprovedCombination.removeCollateral.collateralId} (${fullyApprovedCombination.removeCollateral.collateralType}), added ${fullyApprovedCombination.addCollateral.collateralId} (${fullyApprovedCombination.addCollateral.collateralType}).`
        : `[Syndicate Bank] Joint loan ${groupId} collateral early release consensual majority! Released ${fullyApprovedCombination.removeCollateral.collateralId} (${fullyApprovedCombination.removeCollateral.collateralType}).`;
      
      newState.journal.push(logMsg);
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanDebtSettlements(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
    defaultAlerts: state.defaultAlerts ? { ...state.defaultAlerts } : {},
    creditRatings: state.creditRatings ? { ...state.creditRatings } : {},
    vars: state.vars ? { ...state.vars } : {},
  };

  if (!newState.jointLoanDebtSettlementVotes) {
    newState.jointLoanDebtSettlementVotes = {};
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanDebtSettlementVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each proposed settlementAmount
    const combinationCounts: Record<number, { settlementAmount: number; groupVotes: Set<string>; bankVotes: Set<string> }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const amt = vote.settlementAmount;
      if (!combinationCounts[amt]) {
        combinationCounts[amt] = {
          settlementAmount: amt,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[amt].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[amt].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedAmount: number | undefined;
    let maxTimestamp = state.step;

    // Sort descending to prefer higher settlement amount (more favorable to the bank) on tie, though strict majority should be unique
    const uniqueAmounts = Object.keys(combinationCounts).map(Number).sort((a, b) => b - a);

    for (const amt of uniqueAmounts) {
      const combo = combinationCounts[amt];
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;
        fullyApprovedAmount = amt;
        break; 
      }
    }

    if (fullyApprovedAmount !== undefined) {
      // Consensus reached! Now check if all group members can afford their pro-rata share.
      // Proportional liability distribution (based on collateral value)
      let totalCollateralValue = 0;
      const collateralValues: Record<string, number> = {};
      for (const col of jointLoan.collaterals) {
        const val = getCollateralValue(newState, col.collateralType, col.collateralId);
        collateralValues[`${col.agentId}_${col.collateralId}`] = val;
        totalCollateralValue += val;
      }

      const members = jointLoan.members;
      const proportions: Record<string, number> = {};
      for (const agentId of members) {
        let agentCollateralValue = 0;
        for (const col of jointLoan.collaterals) {
          if (col.agentId === agentId) {
            agentCollateralValue += collateralValues[`${col.agentId}_${col.collateralId}`] ?? 0;
          }
        }
        proportions[agentId] = totalCollateralValue > 0 ? (agentCollateralValue / totalCollateralValue) : (1 / members.length);
      }

      // Distribute total settlement amount pro-rata
      const dueShares: Record<string, number> = {};
      let distributedSum = 0;
      for (let i = 0; i < members.length; i++) {
        const agentId = members[i];
        if (i === members.length - 1) {
          dueShares[agentId] = fullyApprovedAmount - distributedSum;
        } else {
          const share = Math.floor(fullyApprovedAmount * proportions[agentId]);
          dueShares[agentId] = share;
          distributedSum += share;
        }
      }

      // Check if ALL members have enough gold
      let allCanAfford = true;
      for (const agentId of members) {
        const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
        const currentGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
        if (currentGold < dueShares[agentId]) {
          allCanAfford = false;
          break;
        }
      }

      if (allCanAfford) {
        // Deduct gold from all members
        for (const agentId of members) {
          const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
          const currentGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
          newState.vars[goldKey] = currentGold - dueShares[agentId];
        }

        // Delete the joint loan
        delete updatedJointLoans[groupId];
        loansChanged = true;

        // Clear default alerts for all members of the group
        for (const agentId of members) {
          const alertKey = `${agentId}_${jointLoan.syndicateId}`;
          delete newState.defaultAlerts[alertKey];
        }

        // Increase credit rating for ALL members by +15
        for (const agentId of members) {
          const currentRating = newState.creditRatings[agentId] ?? 100;
          newState.creditRatings[agentId] = Math.min(200, currentRating + 15);
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Joint debt settlement agreed and paid for group ${groupId} in syndicate ${jointLoan.syndicateId} bank. Paid total ${fullyApprovedAmount} gold. Pledged collaterals [${jointLoan.collaterals.map(c => c.collateralId).join(", ")}] are released/unlocked.`
        );

        // Clear the settlement votes for this group so they don't apply again
        delete newState.jointLoanDebtSettlementVotes[groupId];
      }
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanCollateralSwaps(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
  };

  if (!newState.jointLoanCollateralSwapVotes) {
    newState.jointLoanCollateralSwapVotes = {};
    return newState;
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanCollateralSwapVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each unique combination of remove/add collateral
    const combinationCounts: Record<string, { 
      removeCollateralType: "safehouse" | "outpost";
      removeCollateralId: string;
      addCollateralType: "safehouse" | "outpost";
      addCollateralId: string;
      groupVotes: Set<string>; 
      bankVotes: Set<string>; 
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const key = `${vote.removeCollateralType}_${vote.removeCollateralId}::${vote.addCollateralType}_${vote.addCollateralId}`;

      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          removeCollateralType: vote.removeCollateralType,
          removeCollateralId: vote.removeCollateralId,
          addCollateralType: vote.addCollateralType,
          addCollateralId: vote.addCollateralId,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[key].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[key].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedCombination: {
      removeCollateralType: "safehouse" | "outpost";
      removeCollateralId: string;
      addCollateralType: "safehouse" | "outpost";
      addCollateralId: string;
      maxTimestamp: number;
    } | undefined;

    for (const combo of Object.values(combinationCounts)) {
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

        fullyApprovedCombination = {
          removeCollateralType: combo.removeCollateralType,
          removeCollateralId: combo.removeCollateralId,
          addCollateralType: combo.addCollateralType,
          addCollateralId: combo.addCollateralId,
          maxTimestamp,
        };
        break; // Strict majority consensus implies at most one combo can satisfy both
      }
    }

    if (fullyApprovedCombination) {
      // Find the collateral being removed to get its agentId (pledger)
      const existingCollateral = jointLoan.collaterals.find(c => 
        c.collateralType === fullyApprovedCombination!.removeCollateralType && 
        c.collateralId === fullyApprovedCombination!.removeCollateralId
      );

      if (existingCollateral) {
        const pledgerId = existingCollateral.agentId;

        // Apply the swap!
        const currentCollaterals = jointLoan.collaterals.filter(c => 
          !(c.collateralType === fullyApprovedCombination!.removeCollateralType && 
            c.collateralId === fullyApprovedCombination!.removeCollateralId)
        );

        // Add the new collateral with the same pledgerId
        currentCollaterals.push({
          agentId: pledgerId,
          collateralType: fullyApprovedCombination.addCollateralType,
          collateralId: fullyApprovedCombination.addCollateralId,
        });

        updatedJointLoans[groupId] = {
          ...jointLoan,
          collaterals: currentCollaterals,
          timestamp: fullyApprovedCombination.maxTimestamp,
        };
        loansChanged = true;

        // Clear the votes so they don't apply again
        delete newState.jointLoanCollateralSwapVotes[groupId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate Bank] Joint loan collateral swap for group ${groupId} approved! Swapped ${fullyApprovedCombination.removeCollateralId} (${fullyApprovedCombination.removeCollateralType}) with ${fullyApprovedCombination.addCollateralId} (${fullyApprovedCombination.addCollateralType}).`
        );
      }
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanGracePeriods(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
  };

  if (!newState.jointLoanGracePeriodVotes) {
    newState.jointLoanGracePeriodVotes = {};
    return newState;
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanGracePeriodVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each unique combination of extensionSteps
    const combinationCounts: Record<string, { 
      extensionSteps: number;
      groupVotes: Set<string>; 
      bankVotes: Set<string>; 
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const key = `${vote.extensionSteps}`;

      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          extensionSteps: vote.extensionSteps,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[key].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[key].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedCombination: {
      extensionSteps: number;
      maxTimestamp: number;
    } | undefined;

    for (const combo of Object.values(combinationCounts)) {
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

        fullyApprovedCombination = {
          extensionSteps: combo.extensionSteps,
          maxTimestamp,
        };
        break; // Strict majority consensus implies at most one combo can satisfy both
      }
    }

    if (fullyApprovedCombination) {
      updatedJointLoans[groupId] = {
        ...jointLoan,
        gracePeriodSteps: fullyApprovedCombination.extensionSteps,
        timestamp: fullyApprovedCombination.maxTimestamp,
      };
      loansChanged = true;

      // Clear the votes so they don't apply again
      delete newState.jointLoanGracePeriodVotes[groupId];

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Joint loan grace period for group ${groupId} approved! Grace period of ${fullyApprovedCombination.extensionSteps} steps established.`
      );
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanPenaltyWaivers(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoans: state.jointLoans ? { ...state.jointLoans } : {},
  };

  if (!newState.jointLoanPenaltyWaiverVotes) {
    newState.jointLoanPenaltyWaiverVotes = {};
    return newState;
  }

  const updatedJointLoans = { ...newState.jointLoans };
  let loansChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanPenaltyWaiverVotes)) {
    const jointLoan = updatedJointLoans[groupId];
    if (!jointLoan) continue;

    const syndicate = newState.syndicates[jointLoan.syndicateId];
    if (!syndicate) continue;

    // Count votes for each unique combination of reducedInterestRate and waivePenalty
    const combinationCounts: Record<string, { 
      reducedInterestRate: number;
      waivePenalty: boolean;
      groupVotes: Set<string>; 
      bankVotes: Set<string>; 
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      const key = `${vote.reducedInterestRate}_${vote.waivePenalty}`;

      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          reducedInterestRate: vote.reducedInterestRate,
          waivePenalty: vote.waivePenalty,
          groupVotes: new Set<string>(),
          bankVotes: new Set<string>(),
        };
      }

      // If voter is in group, count as group vote
      if (jointLoan.members.includes(voterId)) {
        combinationCounts[key].groupVotes.add(voterId);
      }

      // If voter is in syndicate, count as bank vote
      if (syndicate.members.includes(voterId)) {
        combinationCounts[key].bankVotes.add(voterId);
      }
    }

    // Check if any combination has a majority of group members AND syndicate bank members
    const groupMajorityThreshold = jointLoan.members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    let fullyApprovedCombination: {
      reducedInterestRate: number;
      waivePenalty: boolean;
      maxTimestamp: number;
    } | undefined;

    for (const combo of Object.values(combinationCounts)) {
      if (combo.groupVotes.size > groupMajorityThreshold && combo.bankVotes.size > bankMajorityThreshold) {
        const votersForCombo = [...combo.groupVotes, ...combo.bankVotes];
        const timestamps = votersForCombo.map(vid => votes[vid]?.timestamp ?? 0);
        const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

        fullyApprovedCombination = {
          reducedInterestRate: combo.reducedInterestRate,
          waivePenalty: combo.waivePenalty,
          maxTimestamp,
        };
        break; // Strict majority consensus implies at most one combo can satisfy both
      }
    }

    if (fullyApprovedCombination) {
      updatedJointLoans[groupId] = {
        ...jointLoan,
        reducedInterestRate: fullyApprovedCombination.reducedInterestRate,
        waivePenalty: fullyApprovedCombination.waivePenalty,
        timestamp: fullyApprovedCombination.maxTimestamp,
      };
      loansChanged = true;

      // Clear the votes so they don't apply again
      delete newState.jointLoanPenaltyWaiverVotes[groupId];

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Joint loan penalty waiver for group ${groupId} approved! Reduced interest rate: ${fullyApprovedCombination.reducedInterestRate}%, enforcer penalty waiving set to ${fullyApprovedCombination.waivePenalty}.`
      );
    }
  }

  if (loansChanged) {
    newState.jointLoans = updatedJointLoans;
  }

  return newState;
}

export function reconcileJointLoanUnderwrites(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointLoanUnderwrites: state.jointLoanUnderwrites ? { ...state.jointLoanUnderwrites } : {},
  };

  if (!newState.jointLoanUnderwriteVotes) {
    newState.jointLoanUnderwriteVotes = {};
    return newState;
  }

  const updatedUnderwrites = { ...newState.jointLoanUnderwrites };
  let underwritesChanged = false;

  for (const [groupId, votes] of Object.entries(newState.jointLoanUnderwriteVotes)) {
    const firstVote = Object.values(votes)[0];
    if (!firstVote) continue;
    const { syndicateId, members } = firstVote;

    const syndicate = newState.syndicates[syndicateId];
    if (!syndicate) continue;

    // Count votes
    const groupVotes = new Set<string>();
    const bankVotes = new Set<string>();

    for (const [voterId, vote] of Object.entries(votes)) {
      if (members.includes(voterId)) {
        groupVotes.add(voterId);
      }
      if (syndicate.members.includes(voterId)) {
        bankVotes.add(voterId);
      }
    }

    const groupMajorityThreshold = members.length / 2;
    const bankMajorityThreshold = syndicate.members.length / 2;

    if (groupVotes.size > groupMajorityThreshold && bankVotes.size > bankMajorityThreshold) {
      // Consensus reached!
      const avgCreditRating = members.reduce((sum, mId) => sum + (state.creditRatings?.[mId] ?? 100), 0) / members.length;
      const bank = state.syndicateBanks?.[syndicateId];
      const baseBankRate = bank?.interestRate ?? 5;

      let interestRateDiscount = 0;
      let interestRateMarkup = 0;
      let multiplierBonus = 0;
      let multiplierPenalty = 0;

      if (avgCreditRating > 100) {
        interestRateDiscount = Math.floor((avgCreditRating - 100) / 10);
        multiplierBonus = (avgCreditRating - 100) / 500;
      } else if (avgCreditRating < 100) {
        interestRateMarkup = Math.floor((100 - avgCreditRating) / 10);
        multiplierPenalty = (100 - avgCreditRating) / 200;
      }

      const groupDefaultCount = state.groupDefaults?.[groupId] ?? 0;
      const interestRateDefaultMarkup = groupDefaultCount * 2;
      const multiplierDefaultPenalty = groupDefaultCount * 0.1;

      const baseInterestRate = Math.max(1, baseBankRate - interestRateDiscount + interestRateMarkup + interestRateDefaultMarkup);
      const collateralMultiplier = Math.max(0.5, 1.2 + multiplierBonus - multiplierPenalty - multiplierDefaultPenalty);

      // Find the latest timestamp among all voters
      const timestamps = Object.values(votes).map(v => v.timestamp);
      const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : state.step;

      updatedUnderwrites[groupId] = {
        groupId,
        syndicateId,
        baseInterestRate,
        collateralMultiplier,
        timestamp: maxTimestamp,
      };
      underwritesChanged = true;

      // Clear the votes
      delete newState.jointLoanUnderwriteVotes[groupId];

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Syndicate Bank] Credit underwriting for joint loan group ${groupId} reached consensus. Base Rate: ${baseInterestRate}%, Collateral Multiplier: ${collateralMultiplier.toFixed(2)}x.`
      );
    }
  }

  if (underwritesChanged) {
    newState.jointLoanUnderwrites = updatedUnderwrites;
  }

  return newState;
}

export function reconcileReinsurancePools(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    reinsuranceContracts: { ...(state.reinsuranceContracts || {}) },
  };

  if (!newState.reinsuranceVotes) {
    newState.reinsuranceVotes = {};
  }

  for (const [pairKey, votes] of Object.entries(newState.reinsuranceVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateIdA, syndicateIdB] = parts;

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    // Count votes for syndicate A
    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    // Count votes for syndicate B
    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    // Double majority approval
    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      // Find the minimum maxLiquidityLimit among all yes voters
      let minLimit = Infinity;
      for (const v of Object.values(votes)) {
        if (v.targetState && v.maxLiquidityLimit < minLimit) {
          minLimit = v.maxLiquidityLimit;
        }
      }
      if (minLimit === Infinity) minLimit = 100; // fallback

      const existingContract = newState.reinsuranceContracts[pairKey];
      newState.reinsuranceContracts[pairKey] = {
        id: pairKey,
        syndicateIdA,
        syndicateIdB,
        maxLiquidityLimit: minLimit,
        active: true,
        borrowedAfromB: existingContract?.borrowedAfromB ?? 0,
        borrowedBfromA: existingContract?.borrowedBfromA ?? 0,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existingContract = newState.reinsuranceContracts[pairKey];
      if (existingContract) {
        newState.reinsuranceContracts[pairKey] = {
          ...existingContract,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existingContract.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileContagionShields(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    contagionShields: { ...(state.contagionShields || {}) },
  };

  if (!newState.contagionShieldVotes) {
    newState.contagionShieldVotes = {};
  }

  for (const [pairKey, votes] of Object.entries(newState.contagionShieldVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateIdA, syndicateIdB] = parts;

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    // Count votes for syndicate A
    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    // Count votes for syndicate B
    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    // Double majority approval
    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      newState.contagionShields[pairKey] = {
        id: pairKey,
        syndicateIdA,
        syndicateIdB,
        active: true,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existingShield = newState.contagionShields[pairKey];
      if (existingShield) {
        newState.contagionShields[pairKey] = {
          ...existingShield,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existingShield.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileReinsuranceTransfers(state: GameState, pack: any): GameState {
  let newState = {
    ...state,
    jointLoanInsurancePools: state.jointLoanInsurancePools ? { ...state.jointLoanInsurancePools } : {},
    reinsuranceContracts: state.reinsuranceContracts ? { ...state.reinsuranceContracts } : {},
    executedReinsuranceTransfers: state.executedReinsuranceTransfers ? { ...state.executedReinsuranceTransfers } : {},
  };

  if (!newState.reinsuranceTransferVotes) {
    newState.reinsuranceTransferVotes = {};
  }

  for (const [proposalId, votes] of Object.entries(newState.reinsuranceTransferVotes)) {
    if (newState.executedReinsuranceTransfers[proposalId]) continue;

    // Get any vote to find fromSyndicateId, toSyndicateId, amount
    const firstVote = Object.values(votes)[0];
    if (!firstVote) continue;

    const { fromSyndicateId, toSyndicateId, amount } = firstVote;
    const syndFrom = newState.syndicates?.[fromSyndicateId];
    if (!syndFrom) continue;

    // Count votes from sending syndicate
    let yes = 0;
    let no = 0;
    for (const member of syndFrom.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yes++;
        else no++;
      }
    }

    const isApproved = yes > 0 && yes >= no;
    if (isApproved) {
      // Execute the transfer!
      const sourcePool = newState.jointLoanInsurancePools[fromSyndicateId];
      const destPool = newState.jointLoanInsurancePools[toSyndicateId];
      const pairKey = [fromSyndicateId, toSyndicateId].sort().join(":");
      const contract = newState.reinsuranceContracts[pairKey];

      if (sourcePool && destPool && contract && contract.active) {
        if (sourcePool.poolGold >= amount) {
          // Perform transfer calculation
          const isAtoB = (fromSyndicateId === contract.syndicateIdA);
          let allowed = false;
          let newBorrowedAfromB = contract.borrowedAfromB;
          let newBorrowedBfromA = contract.borrowedBfromA;

          if (isAtoB) {
            const repay = Math.min(amount, contract.borrowedAfromB);
            const excess = amount - repay;
            if (contract.borrowedBfromA + excess <= contract.maxLiquidityLimit) {
              newBorrowedAfromB -= repay;
              newBorrowedBfromA += excess;
              allowed = true;
            }
          } else {
            const repay = Math.min(amount, contract.borrowedBfromA);
            const excess = amount - repay;
            if (contract.borrowedAfromB + excess <= contract.maxLiquidityLimit) {
              newBorrowedBfromA -= repay;
              newBorrowedAfromB += excess;
              allowed = true;
            }
          }

          if (allowed) {
            // Modify state
            sourcePool.poolGold -= amount;
            sourcePool.timestamp = Math.max(...Object.values(votes).map(v => v.timestamp));

            destPool.poolGold += amount;
            destPool.timestamp = Math.max(...Object.values(votes).map(v => v.timestamp));

            newState.reinsuranceContracts[pairKey] = {
              ...contract,
              borrowedAfromB: newBorrowedAfromB,
              borrowedBfromA: newBorrowedBfromA,
              timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
            };

            newState.executedReinsuranceTransfers[proposalId] = true;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Reinsurance] Transfer of ${amount} gold from pool ${fromSyndicateId} to ${toSyndicateId} executed successfully via proposal ${proposalId}.`
            );
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileInterestSubsidies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    interestSubsidies: { ...(state.interestSubsidies || {}) },
  };

  if (!newState.interestSubsidyVotes) {
    newState.interestSubsidyVotes = {};
  }

  for (const [pairKey, votes] of Object.entries(newState.interestSubsidyVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateIdA, syndicateIdB] = parts;

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      let minSubsidy = Infinity;
      for (const v of Object.values(votes)) {
        if (v.targetState && v.subsidyRate < minSubsidy) {
          minSubsidy = v.subsidyRate;
        }
      }
      if (minSubsidy === Infinity) minSubsidy = 0;

      newState.interestSubsidies[pairKey] = {
        id: pairKey,
        syndicateIdA,
        syndicateIdB,
        subsidyRate: minSubsidy,
        active: true,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existingSubsidy = newState.interestSubsidies[pairKey];
      if (existingSubsidy) {
        newState.interestSubsidies[pairKey] = {
          ...existingSubsidy,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existingSubsidy.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileReinsuranceCollateral(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    reinsuranceCollateralPledges: { ...(state.reinsuranceCollateralPledges || {}) },
  };

  if (!newState.reinsuranceCollateralVotes) {
    newState.reinsuranceCollateralVotes = {};
  }

  for (const [voteKey, votes] of Object.entries(newState.reinsuranceCollateralVotes)) {
    const parts = voteKey.split(":");
    if (parts.length !== 4) continue;
    const [syndicateIdA, syndicateIdB, collateralType, collateralId] = parts;

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    let belongsToB = false;
    if (collateralType === "safehouse") {
      belongsToB = newState.safehouses?.[collateralId]?.syndicateId === syndicateIdB;
    } else if (collateralType === "outpost") {
      belongsToB = newState.turfGuardOutposts?.[collateralId]?.syndicateId === syndicateIdB;
    }
    if (!belongsToB) continue;

    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      newState.reinsuranceCollateralPledges[voteKey] = {
        id: voteKey,
        syndicateIdA,
        syndicateIdB,
        collateralType: collateralType as "safehouse" | "outpost",
        collateralId,
        active: true,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existingPledge = newState.reinsuranceCollateralPledges[voteKey];
      if (existingPledge) {
        newState.reinsuranceCollateralPledges[voteKey] = {
          ...existingPledge,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existingPledge.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileReinsuranceRiskRatings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    reinsuranceRiskRatings: { ...(state.reinsuranceRiskRatings || {}) },
  };

  if (!newState.reinsuranceRiskRatingVotes) {
    newState.reinsuranceRiskRatingVotes = {};
  }

  for (const [pairKey, votes] of Object.entries(newState.reinsuranceRiskRatingVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [syndicateIdA, syndicateIdB] = parts;

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      let maxRatingVal = 0;
      let consensusRating: "low" | "medium" | "high" = "medium";
      for (const v of Object.values(votes)) {
        if (v.targetState) {
          const val = v.riskRating === "high" ? 3 : v.riskRating === "medium" ? 2 : 1;
          if (val > maxRatingVal) {
            maxRatingVal = val;
            consensusRating = v.riskRating;
          }
        }
      }

      newState.reinsuranceRiskRatings[pairKey] = {
        id: pairKey,
        syndicateIdA,
        syndicateIdB,
        riskRating: consensusRating,
        active: true,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existing = newState.reinsuranceRiskRatings[pairKey];
      if (existing) {
        newState.reinsuranceRiskRatings[pairKey] = {
          ...existing,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existing.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileReinsuranceLiquidityAudits(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    reinsuranceLiquidityAudits: { ...(state.reinsuranceLiquidityAudits || {}) },
  };

  if (!newState.reinsuranceLiquidityAuditVotes) {
    newState.reinsuranceLiquidityAuditVotes = {};
  }

  for (const [auditId, votes] of Object.entries(newState.reinsuranceLiquidityAuditVotes)) {
    const parts = auditId.split(":");
    if (parts.length !== 3) continue;
    const [syndicateIdA, syndicateIdB, auditStepStr] = parts;
    const auditStep = parseInt(auditStepStr, 10);

    const syndA = newState.syndicates?.[syndicateIdA];
    const syndB = newState.syndicates?.[syndicateIdB];
    if (!syndA || !syndB) continue;

    let yesA = 0;
    let noA = 0;
    for (const member of syndA.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesA++;
        else noA++;
      }
    }

    let yesB = 0;
    let noB = 0;
    for (const member of syndB.members) {
      const v = votes[member];
      if (v) {
        if (v.targetState) yesB++;
        else noB++;
      }
    }

    const approvedA = yesA > 0 && yesA >= noA;
    const approvedB = yesB > 0 && yesB >= noB;
    const isApproved = approvedA && approvedB;

    if (isApproved) {
      const pool = newState.jointLoanInsurancePools?.[syndicateIdB];
      const poolGold = pool ? pool.poolGold : 0;
      const status = poolGold >= 150 ? "passed" : "failed";

      newState.reinsuranceLiquidityAudits[auditId] = {
        id: auditId,
        syndicateIdA,
        syndicateIdB,
        auditStep,
        verifiedLiquidity: poolGold,
        status,
        active: true,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };
    } else {
      const existing = newState.reinsuranceLiquidityAudits[auditId];
      if (existing) {
        newState.reinsuranceLiquidityAudits[auditId] = {
          ...existing,
          active: false,
          timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), existing.timestamp),
        };
      }
    }
  }

  return newState;
}

export function reconcileReserveRatios(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    secondaryReserves: state.secondaryReserves ? { ...state.secondaryReserves } : {},
  };

  if (!newState.reserveRatioVotes) {
    newState.reserveRatioVotes = {};
  }

  for (const [syndicateId, votes] of Object.entries(newState.reserveRatioVotes)) {
    const syndicate = state.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.reserveRatio] = (counts[vote.reserveRatio] ?? 0) + 1;
    }

    let maxCount = 0;
    // Default ratio is 0.20 if no consensus or existing
    let consensusRatio = newState.secondaryReserves[syndicateId]?.reserveRatio ?? 0.20;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort ratios descending to prefer higher ratios.
    const uniqueRatios = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const ratio of uniqueRatios) {
      const count = counts[ratio];
      if (count > maxCount) {
        maxCount = count;
        consensusRatio = ratio;
      }
    }

    const currentReserve = newState.secondaryReserves[syndicateId];
    newState.secondaryReserves[syndicateId] = {
      syndicateId,
      reserveGold: currentReserve?.reserveGold ?? 0,
      reserveRatio: consensusRatio,
      timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), currentReserve?.timestamp ?? 0),
    };
  }

  return newState;
}

export function reconcileCreditDefaultSwaps(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    creditDefaultSwaps: state.creditDefaultSwaps ? { ...state.creditDefaultSwaps } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
  };

  if (!newState.creditDefaultSwapVotes) {
    newState.creditDefaultSwapVotes = {};
  }

  for (const [cdsId, votes] of Object.entries(newState.creditDefaultSwapVotes)) {
    const buyerVotes = Object.values(votes).filter(v => v.side === "buyer");
    const writerVotes = Object.values(votes).filter(v => v.side === "writer");

    if (buyerVotes.length > 0 && writerVotes.length > 0) {
      const latestBuyerVote = buyerVotes.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest, buyerVotes[0]);
      const latestWriterVote = writerVotes.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest, writerVotes[0]);

      if (
        latestBuyerVote.buyerSyndicateId === latestWriterVote.buyerSyndicateId &&
        latestBuyerVote.writerSyndicateId === latestWriterVote.writerSyndicateId &&
        latestBuyerVote.cdoId === latestWriterVote.cdoId &&
        latestBuyerVote.trancheId === latestWriterVote.trancheId &&
        latestBuyerVote.notionalValue === latestWriterVote.notionalValue &&
        latestBuyerVote.premiumRate === latestWriterVote.premiumRate &&
        (latestBuyerVote.marginEnabled || false) === (latestWriterVote.marginEnabled || false)
      ) {
        const latestTimestamp = Math.max(latestBuyerVote.timestamp, latestWriterVote.timestamp);
        const existingCds = newState.creditDefaultSwaps[cdsId];
        const marginEnabled = latestBuyerVote.marginEnabled || false;

        if (!existingCds || latestTimestamp > existingCds.timestamp) {
          newState.creditDefaultSwaps[cdsId] = {
            id: cdsId,
            buyerSyndicateId: latestBuyerVote.buyerSyndicateId,
            writerSyndicateId: latestBuyerVote.writerSyndicateId,
            cdoId: latestBuyerVote.cdoId,
            trancheId: latestBuyerVote.trancheId,
            notionalValue: latestBuyerVote.notionalValue,
            premiumRate: latestBuyerVote.premiumRate,
            timestamp: latestTimestamp,
            active: true,
            marginEnabled: marginEnabled,
          };

          if (marginEnabled) {
            const marginAccount = newState.marginAccounts[latestWriterVote.writerSyndicateId];
            if (marginAccount) {
              newState.marginAccounts[latestWriterVote.writerSyndicateId] = {
                ...marginAccount,
                leveragedCDSIds: Array.from(new Set([...(marginAccount.leveragedCDSIds || []), cdsId])),
                timestamp: latestTimestamp,
              };
            }
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileFactionSponsors(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    factionSponsorProposals: state.factionSponsorProposals ? { ...state.factionSponsorProposals } : {},
    factionSponsorPolicies: state.factionSponsorPolicies ? { ...state.factionSponsorPolicies } : {},
  };

  for (const proposalId of Object.keys(newState.factionSponsorProposals || {})) {
    const proposal = newState.factionSponsorProposals?.[proposalId];
    if (!proposal) continue;

    const { syndicateId, vaultId, factionId, rewardRate, minLockTerms, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      if (!newState.factionSponsorPolicies) newState.factionSponsorPolicies = {};
      if (!newState.factionSponsorPolicies[syndicateId]) newState.factionSponsorPolicies[syndicateId] = {};

      const existingPolicy = newState.factionSponsorPolicies[syndicateId][vaultId];
      if (!existingPolicy || timestamp > existingPolicy.timestamp) {
        newState.factionSponsorPolicies[syndicateId][vaultId] = {
          syndicateId,
          vaultId,
          factionId,
          rewardRate,
          minLockTerms,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Sponsor Resolved] Syndicate ${syndicateId} resolved sponsoring policy for vault ${vaultId}: sponsored by ${factionId} with reward rate ${rewardRate} and min lock of ${minLockTerms} epochs.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSponsorAuditsAndRevocations(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sponsorAuditProposals: state.sponsorAuditProposals ? { ...state.sponsorAuditProposals } : {},
    sponsorRevocationProposals: state.sponsorRevocationProposals ? { ...state.sponsorRevocationProposals } : {},
    factionSponsorPolicies: state.factionSponsorPolicies ? { ...state.factionSponsorPolicies } : {},
  };

  // Reconcile Audit Proposals
  for (const auditId of Object.keys(newState.sponsorAuditProposals || {})) {
    const proposal = newState.sponsorAuditProposals?.[auditId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, vaultId, factionId, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.sponsorAuditProposals[auditId] = {
        ...proposal,
        resolved: true,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Sponsor Audit Approved] Syndicate ${syndicateId} resolved to audit sponsor policy for vault ${vaultId} sponsored by ${factionId}.`
      );
    }
  }

  // Reconcile Revocation Proposals
  for (const revocationId of Object.keys(newState.sponsorRevocationProposals || {})) {
    const proposal = newState.sponsorRevocationProposals?.[revocationId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, vaultId, factionId, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.sponsorRevocationProposals[revocationId] = {
        ...proposal,
        resolved: true,
      };

      // Perform immediate revocation! (Delete from policies)
      if (newState.factionSponsorPolicies[syndicateId] && newState.factionSponsorPolicies[syndicateId][vaultId]) {
        delete newState.factionSponsorPolicies[syndicateId][vaultId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Sponsor Revocation Resolved] Syndicate ${syndicateId} resolved sponsor revocation policy for vault ${vaultId}: sponsored by ${factionId} has been revoked.`
      );
    }
  }

  return newState;
}

export function getSyndicateFactionStanding(state: GameState, syndicateId: string, factionId: string): number {
  const baseRep = state.factionRep?.[factionId] ?? 0;
  let bondBonus = 0;
  if (state.factionLoyaltyBonds) {
    const bondId = `${syndicateId}-${factionId}`;
    const bond = state.factionLoyaltyBonds[bondId];
    if (bond) {
      bondBonus += Math.floor(bond.lockedGold * 0.01);
    }
  }
  return baseRep + bondBonus;
}

export function isFactionAlliedToSyndicate(state: GameState, syndicateId: string, factionId: string): boolean {
  if (!state.alliances) return false;
  return state.alliances[syndicateId]?.[factionId] === "allied" ||
         state.alliances[factionId]?.[syndicateId] === "allied";
}

export function reconcileRehabSubsidy(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    rehabSubsidyProposals: state.rehabSubsidyProposals ? { ...state.rehabSubsidyProposals } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.rehabSubsidyProposals || {})) {
    const proposal = newState.rehabSubsidyProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, factionId, subsidyPercentage } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.rehabSubsidyProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Reputation Rehab Subsidy Resolved] Syndicate ${syndicateId} resolved pro-rata reputation rehab subsidy proposal ${proposalId} with faction ${factionId} at ${subsidyPercentage}%.`
      );
    }
  }

  return newState;
}

export function reconcileRehabCampaign(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    rehabCampaignProposals: state.rehabCampaignProposals ? { ...state.rehabCampaignProposals } : {},
    rehabSubsidyProposals: state.rehabSubsidyProposals ? { ...state.rehabSubsidyProposals } : {},
    maliciousActors: state.maliciousActors ? { ...state.maliciousActors } : {},
    slashingRates: state.slashingRates ? { ...state.slashingRates } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
    factionLoyaltyBonds: state.factionLoyaltyBonds ? { ...state.factionLoyaltyBonds } : {},
  };

  // For any already resolved proposals, ensure targetActor is cleared from maliciousActors!
  for (const proposal of Object.values(newState.rehabCampaignProposals || {})) {
    if (proposal && proposal.resolved) {
      if (newState.maliciousActors) {
        delete newState.maliciousActors[proposal.targetActor];
      }
      if (newState.slashingRates) {
        delete newState.slashingRates[proposal.targetActor];
      }
    }
  }

  for (const proposalId of Object.keys(newState.rehabCampaignProposals || {})) {
    const proposal = newState.rehabCampaignProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, targetActor, factionId, goldCost } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.rehabCampaignProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      if (newState.maliciousActors) {
        delete newState.maliciousActors[targetActor];
      }
      if (newState.slashingRates) {
        delete newState.slashingRates[targetActor];
      }

      const proposingSyndicate = newState.syndicates?.[syndicateId];
      let appliedSubsidyPercentage = 0;
      let activeSubsidy = 0;
      if (newState.rehabSubsidyProposals) {
        for (const subProp of Object.values(newState.rehabSubsidyProposals)) {
          if (subProp.resolved && subProp.syndicateId === syndicateId && subProp.factionId === factionId) {
            activeSubsidy = Math.max(activeSubsidy, subProp.subsidyPercentage);
          }
        }
      }

      const standing = getSyndicateFactionStanding(newState, syndicateId, factionId);
      const isAllied = isFactionAlliedToSyndicate(newState, syndicateId, factionId) || standing >= 50;

      if (activeSubsidy > 0 && isAllied && standing >= 50) {
        appliedSubsidyPercentage = Math.min(50, Math.min(activeSubsidy, Math.floor(standing * 0.5)));
      }

      const subsidizedShare = Math.floor(goldCost * (appliedSubsidyPercentage / 100));
      const actualGoldCost = goldCost - subsidizedShare;

      if (proposingSyndicate) {
        proposingSyndicate.warChest = Math.max(0, (proposingSyndicate.warChest ?? 0) - actualGoldCost);
      }

      if (!newState.factionReservePools) newState.factionReservePools = {};
      if (subsidizedShare > 0) {
        newState.factionReservePools[factionId] = Math.max(0, (newState.factionReservePools[factionId] ?? 0) - subsidizedShare);
      }
      newState.factionReservePools[factionId] = (newState.factionReservePools[factionId] ?? 0) + actualGoldCost;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Reputation Rehab Resolved] Syndicate ${syndicateId} resolved rehabilitation campaign proposal ${proposalId} for target ${targetActor}, paying ${actualGoldCost} gold (subsidized by ${subsidizedShare} gold) to faction ${factionId}.`
      );
    }
  }

  return newState;
}

export function reconcileRewardSlashing(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    rewardSlashingProposals: state.rewardSlashingProposals ? { ...state.rewardSlashingProposals } : {},
    maliciousActors: state.maliciousActors ? { ...state.maliciousActors } : {},
    slashingRates: state.slashingRates ? { ...state.slashingRates } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.rewardSlashingProposals || {})) {
    const proposal = newState.rewardSlashingProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, targetSyndicateId, slashingRate, maliciousActor, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.rewardSlashingProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      if (!newState.maliciousActors) newState.maliciousActors = {};
      newState.maliciousActors[maliciousActor] = true;

      if (targetSyndicateId) {
        newState.maliciousActors[targetSyndicateId] = true;
        if (!newState.slashingRates) newState.slashingRates = {};
        newState.slashingRates[targetSyndicateId] = slashingRate;
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Reward Slashing Resolved] Syndicate ${syndicateId} resolved reward slashing proposal ${proposalId} against target ${targetSyndicateId} (Actor: ${maliciousActor}) at rate ${slashingRate}.`
      );
    }
  }

  return newState;
}

export function getSyndicateFactionLoyaltyRank(state: GameState, syndicateId: string, factionId: string): "None" | "Bronze" | "Silver" | "Gold" | "Platinum" {
  if (state.factionLoyaltyRanks) {
    const rankId = `${syndicateId}-${factionId}`;
    const rankObj = state.factionLoyaltyRanks[rankId];
    if (rankObj) {
      return rankObj.rank;
    }
  }

  if (state.factionLoyaltyBonds) {
    const bondId = `${syndicateId}-${factionId}`;
    const bond = state.factionLoyaltyBonds[bondId];
    if (bond) {
      const gold = bond.lockedGold;
      if (gold >= 10000) return "Platinum";
      if (gold >= 5000) return "Gold";
      if (gold >= 3000) return "Silver";
      if (gold >= 1000) return "Bronze";
    }
  }

  return "None";
}

export function getRequiredRankForVaultLevel(level: number): "None" | "Bronze" | "Silver" | "Gold" | "Platinum" {
  if (level <= 0) return "None";
  if (level === 1) return "Bronze";
  if (level === 2) return "Silver";
  if (level === 3) return "Gold";
  return "Platinum";
}

const RANK_ORDER = ["None", "Bronze", "Silver", "Gold", "Platinum"];
export function isRankAtLeast(rank: string, requiredRank: string): boolean {
  const index = RANK_ORDER.indexOf(rank);
  const reqIndex = RANK_ORDER.indexOf(requiredRank);
  return index >= reqIndex;
}

export function reconcileClaimLoyaltyRanks(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    claimLoyaltyRankProposals: state.claimLoyaltyRankProposals ? { ...state.claimLoyaltyRankProposals } : {},
    factionLoyaltyRanks: state.factionLoyaltyRanks ? { ...state.factionLoyaltyRanks } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.claimLoyaltyRankProposals || {})) {
    const proposal = newState.claimLoyaltyRankProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, factionId, rank } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.claimLoyaltyRankProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      newState.factionLoyaltyRanks[`${syndicateId}-${factionId}`] = {
        syndicateId,
        factionId,
        rank,
        timestamp: proposal.timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Faction Loyalty Rank Resolved] Syndicate ${syndicateId} resolved claim loyalty rank proposal ${proposalId} for faction ${factionId} to rank ${rank}.`
      );
    }
  }

  return newState;
}

export function reconcileCooperativeYieldCampaigns(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cooperativeYieldCampaignProposals: state.cooperativeYieldCampaignProposals ? { ...state.cooperativeYieldCampaignProposals } : {},
    cdoMiningBoosters: state.cdoMiningBoosters ? { ...state.cdoMiningBoosters } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.cooperativeYieldCampaignProposals || {})) {
    const proposal = newState.cooperativeYieldCampaignProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, cdoId, campaignName, factionId, bronzeMultiplier, silverMultiplier, goldMultiplier, platinumMultiplier, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.cooperativeYieldCampaignProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      newState.cdoMiningBoosters[`${syndicateId}-${cdoId}`] = {
        id: proposalId,
        syndicateId,
        cdoId,
        factionId,
        campaignName,
        bronzeMultiplier,
        silverMultiplier,
        goldMultiplier,
        platinumMultiplier,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Cooperative Yield Campaign Resolved] Syndicate ${syndicateId} established yield campaign ${campaignName} for CDO ${cdoId} sponsored by ${factionId}.`
      );
    }
  }

  return newState;
}

export function reconcileFactionCdoInsurancePools(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    factionCdoInsurancePoolProposals: state.factionCdoInsurancePoolProposals ? { ...state.factionCdoInsurancePoolProposals } : {},
    factionCdoInsurancePools: state.factionCdoInsurancePools ? { ...state.factionCdoInsurancePools } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.factionCdoInsurancePoolProposals || {})) {
    const proposal = newState.factionCdoInsurancePoolProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, cdoId, factionId, initialReserve, minLoyaltyRank, payoutRatio, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      if ((syndicate.warChest ?? 0) >= initialReserve) {
        syndicate.warChest = (syndicate.warChest ?? 0) - initialReserve;

        newState.factionCdoInsurancePoolProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        newState.factionCdoInsurancePools[`${syndicateId}-${cdoId}`] = {
          id: proposalId,
          factionId,
          syndicateId,
          cdoId,
          insuranceReserve: initialReserve,
          minLoyaltyRank,
          payoutRatio,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction CDO Insurance Pool Resolved] Syndicate ${syndicateId} established insurance pool for CDO ${cdoId} with initial reserve of ${initialReserve} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction CDO Insurance Pool Resolution Failed] Syndicate ${syndicateId} has insufficient funds in war chest (${syndicate.warChest} < ${initialReserve}) to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileMultiFactionCdoRiskRatings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    multiFactionCdoRiskRatingProposals: state.multiFactionCdoRiskRatingProposals ? { ...state.multiFactionCdoRiskRatingProposals } : {},
    multiFactionCdoRiskRatings: state.multiFactionCdoRiskRatings ? { ...state.multiFactionCdoRiskRatings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.multiFactionCdoRiskRatingProposals || {})) {
    const proposal = newState.multiFactionCdoRiskRatingProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, cdoId, factionId, riskRating, basePremiumRate, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.multiFactionCdoRiskRatingProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      newState.multiFactionCdoRiskRatings[`${syndicateId}-${cdoId}`] = {
        id: proposalId,
        syndicateId,
        cdoId,
        factionId,
        riskRating,
        basePremiumRate,
        active: true,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Multi-Faction CDO Risk Rating Resolved] Syndicate ${syndicateId} established risk rating policy for CDO ${cdoId} sponsored by ${factionId} with rating ${riskRating} and base premium ${basePremiumRate}.`
      );
    }
  }

  return newState;
}

export function reconcileSovereignBonds(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignDebtProposals: state.sovereignDebtProposals ? { ...state.sovereignDebtProposals } : {},
    factionReserveBonds: state.factionReserveBonds ? { ...state.factionReserveBonds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
  };

  for (const proposalId of Object.keys(newState.sovereignDebtProposals || {})) {
    const proposal = newState.sovereignDebtProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, factionId, faceValue, interestRate, termEpochs, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      // Consensus reached! Check faction reserves one more time
      const factionReserve = newState.factionReservePools?.[factionId] ?? 10000;
      if (factionReserve >= faceValue) {
        // Resolve proposal
        newState.sovereignDebtProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Transfer funds: faction reserves -> syndicate war chest
        if (!newState.factionReservePools) newState.factionReservePools = {};
        newState.factionReservePools[factionId] = factionReserve - faceValue;
        
        syndicate.warChest = (syndicate.warChest ?? 0) + faceValue;

        // Establish the active bond
        const totalRepayment = faceValue + Math.floor(faceValue * (interestRate / 100));
        const couponPayout = Math.floor(totalRepayment / termEpochs);
        
        if (!newState.factionReserveBonds) newState.factionReserveBonds = {};
        newState.factionReserveBonds[proposalId] = {
          id: proposalId,
          syndicateId,
          factionId,
          faceValue,
          interestRate,
          termEpochs,
          remainingEpochs: termEpochs,
          couponPayout,
          totalRepayment,
          remainingRepayment: totalRepayment,
          status: "Active" as const,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sovereign Bond Resolved] Syndicate ${syndicateId} issued sovereign bond ${proposalId} to faction ${factionId} for ${faceValue} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sovereign Bond Resolution Failed] Faction ${factionId} has insufficient reserves (${factionReserve} < ${faceValue}) to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSovereignDebtRestructure(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignDebtRestructureProposals: state.sovereignDebtRestructureProposals ? { ...state.sovereignDebtRestructureProposals } : {},
    factionReserveBonds: state.factionReserveBonds ? { ...state.factionReserveBonds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.sovereignDebtRestructureProposals || {})) {
    const proposal = newState.sovereignDebtRestructureProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { bondId, syndicateId, extensionEpochs, newInterestRate, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    const bond = newState.factionReserveBonds?.[bondId];
    if (!syndicate || !bond) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      // Consensus reached! Let's restructure the bond.
      // Resolve proposal
      newState.sovereignDebtRestructureProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      // Wire restructuring to adjust remaining bond parameters
      const amountAlreadyRepaid = bond.totalRepayment - bond.remainingRepayment;
      const newTotalRepayment = bond.faceValue + Math.floor(bond.faceValue * (newInterestRate / 100));
      
      bond.remainingRepayment = Math.max(0, newTotalRepayment - amountAlreadyRepaid);
      bond.totalRepayment = newTotalRepayment;
      bond.remainingEpochs += extensionEpochs;
      bond.termEpochs += extensionEpochs;
      bond.interestRate = newInterestRate;
      
      // Cures default and makes bond Active again
      bond.status = "Active";
      bond.couponPayout = Math.floor(bond.remainingRepayment / bond.remainingEpochs);
      bond.timestamp = timestamp; // update timestamp to show active update

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Sovereign Debt Restructure Resolved] Syndicate ${syndicateId} restructured bond ${bondId}: maturity extended by ${extensionEpochs} epochs, interest rate reduced to ${newInterestRate}%.`
      );
    }
  }

  return newState;
}

export function reconcileFactionBailouts(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    factionBailoutProposals: state.factionBailoutProposals ? { ...state.factionBailoutProposals } : {},
    factionReserveBonds: state.factionReserveBonds ? { ...state.factionReserveBonds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
  };

  for (const proposalId of Object.keys(newState.factionBailoutProposals || {})) {
    const proposal = newState.factionBailoutProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { bondId, syndicateId, factionId, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    const bond = newState.factionReserveBonds?.[bondId];
    if (!syndicate || !bond) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      // Consensus reached! Check if the faction reserve pool has enough gold
      const factionReserve = newState.factionReservePools?.[factionId] ?? 10000;
      if (factionReserve >= bond.remainingRepayment) {
        // Resolve proposal
        newState.factionBailoutProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Wire bailout to cover remaining payments using faction reserve funds
        newState.factionReservePools[factionId] = factionReserve - bond.remainingRepayment;
        
        bond.remainingRepayment = 0;
        bond.status = "Matured";
        bond.timestamp = timestamp;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Bailout Resolved] Faction ${factionId} bailed out syndicate ${syndicateId} for bond ${bondId} covering ${bond.remainingRepayment} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Faction Bailout Resolution Failed] Faction ${factionId} has insufficient reserves (${factionReserve} < ${bond.remainingRepayment}) to resolve bailout proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileReserveSweeps(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    reserveSweepPolicies: state.reserveSweepPolicies ? { ...state.reserveSweepPolicies } : {},
    reserveSweepVotes: state.reserveSweepVotes ? { ...state.reserveSweepVotes } : {},
    reserveSweepContestVotes: state.reserveSweepContestVotes ? { ...state.reserveSweepContestVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  // Reconcile sweep policy parameters from votes
  for (const [syndicateId, votes] of Object.entries(newState.reserveSweepVotes || {})) {
    const syndicate = state.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const marginCounts: Record<number, number> = {};
    const rateCounts: Record<number, number> = {};

    for (const vote of Object.values(votes)) {
      marginCounts[vote.sweepMargin] = (marginCounts[vote.sweepMargin] ?? 0) + 1;
      rateCounts[vote.tariffLiquidationRate] = (rateCounts[vote.tariffLiquidationRate] ?? 0) + 1;
    }

    let maxMarginCount = 0;
    let consensusMargin = newState.reserveSweepPolicies[syndicateId]?.sweepMargin ?? 500;
    const uniqueMargins = Object.keys(marginCounts).map(Number).sort((a, b) => b - a);
    for (const margin of uniqueMargins) {
      const count = marginCounts[margin];
      if (count > maxMarginCount) {
        maxMarginCount = count;
        consensusMargin = margin;
      }
    }

    let maxRateCount = 0;
    let consensusRate = newState.reserveSweepPolicies[syndicateId]?.tariffLiquidationRate ?? 0.15;
    const uniqueRates = Object.keys(rateCounts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = rateCounts[rate];
      if (count > maxRateCount) {
        maxRateCount = count;
        consensusRate = rate;
      }
    }

    const currentPolicy = newState.reserveSweepPolicies[syndicateId];
    newState.reserveSweepPolicies[syndicateId] = {
      syndicateId,
      sweepMargin: consensusMargin,
      tariffLiquidationRate: consensusRate,
      active: currentPolicy?.active ?? false,
      accumulatedLiquidatedGold: currentPolicy?.accumulatedLiquidatedGold ?? 0,
      timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), currentPolicy?.timestamp ?? 0),
    };
  }

  // Reconcile contest votes
  for (const [syndicateId, votes] of Object.entries(newState.reserveSweepContestVotes || {})) {
    const syndicate = state.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.contest === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      const policy = newState.reserveSweepPolicies[syndicateId];
      if (policy && policy.active) {
        const secondaryReserve = state.secondaryReserves?.[syndicateId]?.reserveGold ?? 0;
        const totalFunds = (syndicate.warChest ?? 0) + secondaryReserve;
        if (totalFunds >= policy.sweepMargin) {
          policy.active = false;
          policy.timestamp = Math.max(...Object.values(votes).map(v => v.timestamp), policy.timestamp);

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Reserve Sweep Contested] Syndicate ${syndicateId} successfully contested and deactivated the active sweep (Total funds ${totalFunds} >= margin ${policy.sweepMargin}).`
          );
        }
      }
    }
  }

  return newState;
}









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

export const CooperativeSWFStakingCampaignMilestoneSchema = z.object({
  targetAmount: z.number().int().positive(),
  yieldMultiplier: z.number().positive(),
  repMultiplier: z.number().positive(),
});
export type CooperativeSWFStakingCampaignMilestone = z.infer<typeof CooperativeSWFStakingCampaignMilestoneSchema>;

export const CooperativeSWFStakingCampaignSchema = z.object({
  id: z.string(),
  factionId: z.string(),
  creatorSyndicateId: z.string(),
  campaignName: z.string(),
  milestones: z.array(CooperativeSWFStakingCampaignMilestoneSchema),
  participants: z.array(z.string()),
  stakedAmounts: z.record(z.string(), z.number().int().nonnegative()).optional(),
  timestamp: z.number().int(),
});
export type CooperativeSWFStakingCampaign = z.infer<typeof CooperativeSWFStakingCampaignSchema>;

export const CooperativeSWFStakingCampaignProposalSchema = z.object({
  id: z.string(),
  factionId: z.string(),
  creatorSyndicateId: z.string(),
  campaignName: z.string(),
  milestones: z.array(CooperativeSWFStakingCampaignMilestoneSchema),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type CooperativeSWFStakingCampaignProposal = z.infer<typeof CooperativeSWFStakingCampaignProposalSchema>;

export const CooperativeSovereigntyBondProposalSchema = z.object({
  id: z.string(),
  creatorSyndicateId: z.string(),
  factionId: z.string(),
  faceValue: z.number().int().nonnegative(),
  interestRate: z.number().nonnegative(),
  termEpochs: z.number().int().positive(),
  remainingEpochs: z.number().int().nonnegative(),
  status: z.enum(["Proposed", "Active", "Matured", "Defaulted"]),
  contributions: z.record(z.string(), z.number().int().nonnegative()),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
  approved: z.boolean().optional(),
  resolved: z.boolean(),
  timestamp: z.number().int(),
});
export type CooperativeSovereigntyBondProposal = z.infer<typeof CooperativeSovereigntyBondProposalSchema>;

export const SecondaryBondListingSchema = z.object({
  id: z.string(),
  bondId: z.string(),
  sellerSyndicateId: z.string(),
  amount: z.number().int().positive(),
  askPrice: z.number().int().positive(),
  status: z.enum(["Open", "Completed", "Cancelled"]),
  timestamp: z.number().int(),
  bids: z.record(z.string(), z.object({
    bidderSyndicateId: z.string(),
    bidAmount: z.number().int().positive(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SecondaryBondListing = z.infer<typeof SecondaryBondListingSchema>;

export const SovereignBondLendingPoolSchema = z.object({
  id: z.string(),
  creatorSyndicateId: z.string(),
  bondId: z.string(),
  deposits: z.record(z.string(), z.number().int().nonnegative()),
  totalDeposited: z.number().int().nonnegative(),
  totalBorrowed: z.number().int().nonnegative(),
  borrowFeeRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SovereignBondLendingPool = z.infer<typeof SovereignBondLendingPoolSchema>;

export const SovereignBondBorrowPositionSchema = z.object({
  id: z.string(),
  borrowerSyndicateId: z.string(),
  lenderSyndicateId: z.string(),
  bondId: z.string(),
  amount: z.number().int().positive(),
  collateralGold: z.number().int().nonnegative(),
  borrowFeeRate: z.number().nonnegative(),
  status: z.enum(["Proposed", "Active", "ShortSold", "Covered", "Liquidated"]),
  timestamp: z.number().int(),
  accumulatedBorrowFees: z.number().int().nonnegative().default(0),
  lendingPoolId: z.string().optional(),
});
export type SovereignBondBorrowPosition = z.infer<typeof SovereignBondBorrowPositionSchema>;

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

export const LiquidityPoolAuditSchema = z.object({
  auditId: z.string(),
  syndicateId: z.string(),
  auditedGold: z.number().int().nonnegative(),
  deficitAmount: z.number().int().nonnegative(),
  status: z.enum(["Healthy", "Deficit", "Stabilized"]),
  timestamp: z.number().int(),
});
export type LiquidityPoolAudit = z.infer<typeof LiquidityPoolAuditSchema>;

export const AntiDeficitStabilizationPolicySchema = z.object({
  syndicateId: z.string(),
  factionId: z.string(),
  consensualDeficitMargin: z.number().int().nonnegative(),
  stabilizationInjectionAmount: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type AntiDeficitStabilizationPolicy = z.infer<typeof AntiDeficitStabilizationPolicySchema>;

export const AntiDeficitStabilizationVoteSchema = z.object({
  factionId: z.string(),
  consensualDeficitMargin: z.number().int().nonnegative(),
  stabilizationInjectionAmount: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type AntiDeficitStabilizationVote = z.infer<typeof AntiDeficitStabilizationVoteSchema>;

export const LiquidityPoolAuditVoteSchema = z.object({
  auditStep: z.number().int(),
  timestamp: z.number().int(),
});
export type LiquidityPoolAuditVote = z.infer<typeof LiquidityPoolAuditVoteSchema>;

export const StabilizationTransferVoteSchema = z.object({
  factionId: z.string(),
  amount: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type StabilizationTransferVote = z.infer<typeof StabilizationTransferVoteSchema>;

export const CrossMeshBridgeProposalSchema = z.object({
  id: z.string(),
  borrowerSyndicateId: z.string(),
  lenderSyndicateId: z.string(),
  amount: z.number().int().positive(),
  interestRate: z.number().nonnegative(),
  termSteps: z.number().int().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type CrossMeshBridgeProposal = z.infer<typeof CrossMeshBridgeProposalSchema>;

export const CrossMeshBridgeLoanSchema = z.object({
  id: z.string(),
  borrowerSyndicateId: z.string(),
  lenderSyndicateId: z.string(),
  principal: z.number().int().positive(),
  interestRate: z.number().nonnegative(),
  termSteps: z.number().int().positive(),
  startStep: z.number().int().nonnegative(),
  dueStep: z.number().int().nonnegative(),
  remainingRepayment: z.number().int().nonnegative(),
  status: z.enum(["Active", "Repaid", "Defaulted"]),
  timestamp: z.number().int(),
});
export type CrossMeshBridgeLoan = z.infer<typeof CrossMeshBridgeLoanSchema>;

export const SovereignWealthFundSchema = z.object({
  id: z.string(),
  syndicates: z.record(z.string(), z.number().int().nonnegative()),
  totalReserves: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SovereignWealthFund = z.infer<typeof SovereignWealthFundSchema>;

export const JointVenturePortfolioSchema = z.object({
  id: z.string(),
  fundId: z.string(),
  targetType: z.enum(["FactionBond", "ArbitrageRoute"]),
  targetId: z.string(),
  investedAmount: z.number().int().nonnegative(),
  yieldRate: z.number(),
  status: z.enum(["Active", "Closed"]),
  timestamp: z.number().int(),
});
export type JointVenturePortfolio = z.infer<typeof JointVenturePortfolioSchema>;

export const SovereignWealthFundProposalSchema = z.object({
  id: z.string(),
  fundId: z.string(),
  syndicateId: z.string(),
  amount: z.number().int().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SovereignWealthFundProposal = z.infer<typeof SovereignWealthFundProposalSchema>;

export const JointVentureInvestmentProposalSchema = z.object({
  id: z.string(),
  fundId: z.string(),
  proposerSyndicateId: z.string(),
  targetType: z.enum(["FactionBond", "ArbitrageRoute"]),
  targetId: z.string(),
  amount: z.number().int().positive(),
  yieldRate: z.number().nonnegative(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type JointVentureInvestmentProposal = z.infer<typeof JointVentureInvestmentProposalSchema>;

export const JointVenturePortfolioSwapProposalSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  sourceFundId: z.string(),
  targetFundId: z.string(),
  proposerSyndicateId: z.string(),
  goldPrice: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type JointVenturePortfolioSwapProposal = z.infer<typeof JointVenturePortfolioSwapProposalSchema>;

export const JointVentureAssetLiquidationProposalSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  proposerSyndicateId: z.string(),
  liquidateAmount: z.number().int().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type JointVentureAssetLiquidationProposal = z.infer<typeof JointVentureAssetLiquidationProposalSchema>;

export const SWFYieldTokenSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  issuerFundId: z.string(),
  totalShares: z.number().int().positive(),
  syndicateShares: z.record(z.string(), z.number().int().nonnegative()),
  pricePerShare: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type SWFYieldToken = z.infer<typeof SWFYieldTokenSchema>;

export const SWFYieldTokenProposalSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  fundId: z.string(),
  proposerSyndicateId: z.string(),
  totalShares: z.number().int().positive(),
  pricePerShare: z.number().int().positive(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFYieldTokenProposal = z.infer<typeof SWFYieldTokenProposalSchema>;

export const SWFRiskPoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  fundIds: z.array(z.string()),
  totalPooledReserves: z.number().int().nonnegative(),
  fundContributions: z.record(z.string(), z.number().int().nonnegative()),
  status: z.enum(["Active", "Closed"]),
  timestamp: z.number().int(),
});
export type SWFRiskPool = z.infer<typeof SWFRiskPoolSchema>;

export const SWFRiskPoolProposalSchema = z.object({
  id: z.string(),
  name: z.string(),
  fundIds: z.array(z.string()),
  contributions: z.record(z.string(), z.number().int().nonnegative()),
  proposerSyndicateId: z.string(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFRiskPoolProposal = z.infer<typeof SWFRiskPoolProposalSchema>;

export const SWFYieldCDOAssetSchema = z.object({
  swfYieldTokenId: z.string(),
  sharesPacked: z.number().int().positive(),
  value: z.number().int().positive(),
});
export type SWFYieldCDOAsset = z.infer<typeof SWFYieldCDOAssetSchema>;

export const SWFYieldCDOTrancheSchema = z.object({
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  yieldRate: z.number(),
  totalShares: z.number().int().nonnegative(),
  ownership: z.record(z.string(), z.number().int().nonnegative()),
  timestamp: z.number().int(),
});
export type SWFYieldCDOTranche = z.infer<typeof SWFYieldCDOTrancheSchema>;

export const SWFYieldCDOSchema = z.object({
  id: z.string(),
  creatorSyndicateId: z.string(),
  assets: z.array(SWFYieldCDOAssetSchema),
  totalValue: z.number().int().positive(),
  tranches: z.record(z.enum(["senior", "mezzanine", "equity"]), SWFYieldCDOTrancheSchema),
  timestamp: z.number().int(),
});
export type SWFYieldCDO = z.infer<typeof SWFYieldCDOSchema>;

export const SWFYieldCDOPackageProposalSchema = z.object({
  id: z.string(),
  proposerSyndicateId: z.string(),
  assets: z.array(SWFYieldCDOAssetSchema),
  trancheYieldRates: z.record(z.enum(["senior", "mezzanine", "equity"]), z.number()),
  trancheTotalShares: z.record(z.enum(["senior", "mezzanine", "equity"]), z.number().int().positive()),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFYieldCDOPackageProposal = z.infer<typeof SWFYieldCDOPackageProposalSchema>;

export const SWFYieldCDOCDSSchema = z.object({
  id: z.string(),
  buyerSyndicateId: z.string(),
  writerSyndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  notionalValue: z.number().int().positive(),
  premiumRate: z.number(),
  timestamp: z.number().int(),
  active: z.boolean(),
  marginEnabled: z.boolean().optional(),
});
export type SWFYieldCDOCDS = z.infer<typeof SWFYieldCDOCDSSchema>;

export const SWFYieldCDOCDSTradeProposalSchema = z.object({
  id: z.string(),
  cdsId: z.string(),
  proposerSyndicateId: z.string(),
  counterpartySyndicateId: z.string(),
  role: z.enum(["buyer", "writer"]),
  goldPrice: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SWFYieldCDOCDSTradeProposal = z.infer<typeof SWFYieldCDOCDSTradeProposalSchema>;

export const SWFYieldCDOCDSVoteSchema = z.object({
  cdsId: z.string(),
  buyerSyndicateId: z.string(),
  writerSyndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  notionalValue: z.number().int().positive(),
  premiumRate: z.number(),
  side: z.enum(["buyer", "writer"]),
  timestamp: z.number().int(),
  marginEnabled: z.boolean().optional(),
});
export type SWFYieldCDOCDSVote = z.infer<typeof SWFYieldCDOCDSVoteSchema>;


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
  leveragedSWFYieldCDOCDSIds: z.array(z.string()).optional(),
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
  swfRehypothecationAuthorized: z.boolean().optional(),
  swfRehypothecationVaultId: z.string().optional(),
  swfRehypothecationPercentage: z.number().int().nonnegative().max(100).optional(),
  swfRebalancingEnabled: z.boolean().optional(),
  swfVaultTargets: z.record(z.string(), z.number().int().nonnegative().max(100)).optional(),
  swfLiquidityBufferRatio: z.number().int().nonnegative().max(100).optional(),
  swfBufferTriggerRatio: z.number().optional(),
  swfLiquidityBuffer: z.number().int().nonnegative().optional(),
  swfVaultAllocations: z.record(z.string(), z.number().int().nonnegative()).optional(),
  swfAdvisorEnabled: z.boolean().optional(),
  swfAdvisorSafetyThreshold: z.number().nonnegative().optional(),
  swfLeverageFactor: z.number().positive().optional(),
  swfLeverageTarget: z.number().positive().optional(),
  swfFractionalReserveRatio: z.number().int().nonnegative().max(100).optional(),
  swfFractionalReserveHeld: z.number().int().nonnegative().optional(),
  swfLiquidityMiningMultiplier: z.number().positive().optional(),
  swfLockedPositions: z.array(LockedLiquidityPositionSchema).optional(),
  swfArbitrageEnabled: z.boolean().optional(),
  swfYieldThresholds: z.record(z.string(), z.number()).optional(),
  swfAutoWithdrawalEnabled: z.boolean().optional(),
  swfStakingEnabled: z.boolean().optional(),
  swfStakingTargets: z.record(z.string(), z.number().int().nonnegative().max(100)).optional(),
  swfStakedFactions: z.record(z.string(), z.number().int().nonnegative()).optional(),
  swfStakingYields: z.record(z.string(), z.number().nonnegative()).optional(),
  swfGracePeriodExtensions: z.record(z.string(), z.number().int().nonnegative()).optional(),
  swfBondArbitrageEnabled: z.boolean().optional(),
  swfBondArbitrageTargetPools: z.array(z.string()).optional(),
  swfBondArbitrageMaxCapital: z.number().int().nonnegative().optional(),
  swfBondArbitrageMinYieldSpread: z.number().nonnegative().optional(),
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

export const SovereignBondFuturesPositionSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  bondId: z.string(),
  side: z.enum(["long", "short"]),
  entryPrice: z.number(),
  size: z.number().int().positive(),
  leverage: z.number().positive(),
  marginCollateral: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SovereignBondFuturesPosition = z.infer<typeof SovereignBondFuturesPositionSchema>;

export const MarginLiquidationInsurancePolicySchema = z.object({
  syndicateId: z.string(),
  allocatedGold: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type MarginLiquidationInsurancePolicy = z.infer<typeof MarginLiquidationInsurancePolicySchema>;

export const SovereignBondOptionSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  bondId: z.string(),
  optionType: z.enum(["call", "put"]),
  strikePrice: z.number(),
  premium: z.number(),
  size: z.number().int().positive(),
  expirationEpoch: z.number().int().positive(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type SovereignBondOption = z.infer<typeof SovereignBondOptionSchema>;

export const YieldVolatilityIndexSchema = z.object({
  bondId: z.string(),
  volatility: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type YieldVolatilityIndex = z.infer<typeof YieldVolatilityIndexSchema>;

export const VolatilityHedgedReserveBufferSchema = z.object({
  syndicateId: z.string(),
  reserveTarget: z.number().nonnegative(),
  hedgedRatio: z.number().nonnegative().max(100),
  timestamp: z.number().int(),
});
export type VolatilityHedgedReserveBuffer = z.infer<typeof VolatilityHedgedReserveBufferSchema>;

export const SovereignBondVolatilityPositionSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  bondId: z.string(),
  side: z.enum(["long", "short"]),
  entryVolatility: z.number().nonnegative(),
  size: z.number().int().positive(),
  marginCollateral: z.number().int().nonnegative(),
  active: z.boolean(),
  timestamp: z.number().int(),
});
export type SovereignBondVolatilityPosition = z.infer<typeof SovereignBondVolatilityPositionSchema>;


export const SWFYieldCDOTrancheReinsurancePolicySchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  coverageAmount: z.number().int().nonnegative(),
  premiumRate: z.number().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SWFYieldCDOTrancheReinsurancePolicy = z.infer<typeof SWFYieldCDOTrancheReinsurancePolicySchema>;

export const SWFYieldCDOTrancheReinsuranceListingSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  sellerSyndicateId: z.string(),
  askPrice: z.number().int().positive(),
  status: z.enum(["Open", "Completed", "Cancelled"]),
  timestamp: z.number().int(),
  bids: z.record(z.string(), z.object({
    bidderSyndicateId: z.string(),
    bidAmount: z.number().int().positive(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFYieldCDOTrancheReinsuranceListing = z.infer<typeof SWFYieldCDOTrancheReinsuranceListingSchema>;

export const SWFYieldCDOTrancheReinsuranceProposalSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  coverageAmount: z.number().int().nonnegative(),
  premiumRate: z.number().nonnegative(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFYieldCDOTrancheReinsuranceProposal = z.infer<typeof SWFYieldCDOTrancheReinsuranceProposalSchema>;

export const SWFReinsuranceFuturesContractSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  side: z.enum(["long", "short"]),
  lockPremiumRate: z.number().nonnegative(),
  size: z.number().int().positive(),
  marginCollateral: z.number().int().nonnegative(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SWFReinsuranceFuturesContract = z.infer<typeof SWFReinsuranceFuturesContractSchema>;

export const SWFReinsuranceOptionContractSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  writerSyndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  optionType: z.enum(["call", "put"]),
  strikePremiumRate: z.number().nonnegative(),
  size: z.number().int().positive(),
  timestamp: z.number().int(),
  active: z.boolean(),
});
export type SWFReinsuranceOptionContract = z.infer<typeof SWFReinsuranceOptionContractSchema>;

export const SWFReinsuranceOptionsListingSchema = z.object({
  id: z.string(),
  sellerSyndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  optionType: z.enum(["call", "put"]),
  strikePremiumRate: z.number().nonnegative(),
  size: z.number().int().positive(),
  askPrice: z.number().int().positive(),
  status: z.enum(["Open", "Completed", "Cancelled"]),
  timestamp: z.number().int(),
  bids: z.record(z.string(), z.object({
    bidderSyndicateId: z.string(),
    bidAmount: z.number().int().positive(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFReinsuranceOptionsListing = z.infer<typeof SWFReinsuranceOptionsListingSchema>;

export const SWFReinsuranceOptionLimitOrderSchema = z.object({
  id: z.string(),
  syndicateId: z.string(),
  orderType: z.enum(["buy", "sell"]),
  contractId: z.string().optional(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  optionType: z.enum(["call", "put"]),
  strikePremiumRate: z.number().nonnegative(),
  size: z.number().int().positive(),
  limitPrice: z.number().int().positive(),
  status: z.enum(["Open", "Filled", "Cancelled"]),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionLimitOrder = z.infer<typeof SWFReinsuranceOptionLimitOrderSchema>;

export const SWFReinsuranceOptionTransactionCostPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  baseTransactionCost: z.number().int().nonnegative(),
  subsidyPerReputationPoint: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionTransactionCostPolicy = z.infer<typeof SWFReinsuranceOptionTransactionCostPolicySchema>;

export const SWFReinsuranceOptionTransactionCostVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  baseTransactionCost: z.number().int().nonnegative(),
  subsidyPerReputationPoint: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionTransactionCostVote = z.infer<typeof SWFReinsuranceOptionTransactionCostVoteSchema>;

export const SWFReinsuranceOptionMarketMakerRebatePolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  baseRebateRate: z.number().nonnegative(),
  maxRebateRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMarketMakerRebatePolicy = z.infer<typeof SWFReinsuranceOptionMarketMakerRebatePolicySchema>;

export const SWFReinsuranceOptionMarketMakerRebateVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  baseRebateRate: z.number().nonnegative(),
  maxRebateRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMarketMakerRebateVote = z.infer<typeof SWFReinsuranceOptionMarketMakerRebateVoteSchema>;

export const SWFReinsuranceOptionOrderBookDepthSchema = z.object({
  buyVolume: z.number().int().nonnegative(),
  sellVolume: z.number().int().nonnegative(),
  imbalance: z.number(),
  spreadAdjustment: z.number(),
  bidAskSpread: z.number().int().nonnegative(),
});
export type SWFReinsuranceOptionOrderBookDepth = z.infer<typeof SWFReinsuranceOptionOrderBookDepthSchema>;

export const SWFReinsuranceOptionMarginPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  liquidationThreshold: z.number().nonnegative(),
  penaltyRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMarginPolicy = z.infer<typeof SWFReinsuranceOptionMarginPolicySchema>;

export const SWFReinsuranceOptionMarginVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  liquidationThreshold: z.number().nonnegative(),
  penaltyRate: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMarginVote = z.infer<typeof SWFReinsuranceOptionMarginVoteSchema>;

export const SWFReinsuranceOptionStressTestPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  simulatedVolatilityShock: z.number().nonnegative(),
  simulatedLiquidityShock: z.number().nonnegative(),
  reserveMultiplier: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionStressTestPolicy = z.infer<typeof SWFReinsuranceOptionStressTestPolicySchema>;

export const SWFReinsuranceOptionStressTestVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  simulatedVolatilityShock: z.number().nonnegative(),
  simulatedLiquidityShock: z.number().nonnegative(),
  reserveMultiplier: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionStressTestVote = z.infer<typeof SWFReinsuranceOptionStressTestVoteSchema>;

export const SWFReinsuranceOptionHedgingPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  hedgingActivationThreshold: z.number().nonnegative(),
  reserveReallocationLimit: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionHedgingPolicy = z.infer<typeof SWFReinsuranceOptionHedgingPolicySchema>;

export const SWFReinsuranceOptionHedgingVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  hedgingActivationThreshold: z.number().nonnegative(),
  reserveReallocationLimit: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionHedgingVote = z.infer<typeof SWFReinsuranceOptionHedgingVoteSchema>;

export const SWFReinsuranceOptionDeltaHedgingPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  targetDelta: z.number().nonnegative(),
  rebalancingPriceTolerance: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionDeltaHedgingPolicy = z.infer<typeof SWFReinsuranceOptionDeltaHedgingPolicySchema>;

export const SWFReinsuranceOptionDeltaHedgingVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  targetDelta: z.number().nonnegative(),
  rebalancingPriceTolerance: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionDeltaHedgingVote = z.infer<typeof SWFReinsuranceOptionDeltaHedgingVoteSchema>;

export const SWFReinsuranceOptionStressTestDeltaHedgingPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  stressDeltaTarget: z.number().nonnegative(),
  stressVolatilityThreshold: z.number().nonnegative(),
  safetyCapitalReallocationLimit: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionStressTestDeltaHedgingPolicy = z.infer<typeof SWFReinsuranceOptionStressTestDeltaHedgingPolicySchema>;

export const SWFReinsuranceOptionStressTestDeltaHedgingVoteSchema = z.object({
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  stressDeltaTarget: z.number().nonnegative(),
  stressVolatilityThreshold: z.number().nonnegative(),
  safetyCapitalReallocationLimit: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionStressTestDeltaHedgingVote = z.infer<typeof SWFReinsuranceOptionStressTestDeltaHedgingVoteSchema>;

export const SWFReinsuranceOptionCrossHedgingPolicySchema = z.object({
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  correlatedAssetId: z.string(),
  correlatedTrancheId: z.enum(["senior", "mezzanine", "equity"]),
  correlationCoefficient: z.number(),
  hedgeWeight: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionCrossHedgingPolicy = z.infer<typeof SWFReinsuranceOptionCrossHedgingPolicySchema>;

export const SWFReinsuranceOptionCrossHedgingVoteSchema = z.object({
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  correlatedAssetId: z.string(),
  correlatedTrancheId: z.enum(["senior", "mezzanine", "equity"]),
  correlationCoefficient: z.number(),
  hedgeWeight: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionCrossHedgingVote = z.infer<typeof SWFReinsuranceOptionCrossHedgingVoteSchema>;

export const MultiAssetCrossHedgingAssetSchema = z.object({
  correlatedAssetId: z.string(),
  correlatedTrancheId: z.enum(["senior", "mezzanine", "equity"]),
  correlationCoefficient: z.number(),
  hedgeWeight: z.number().nonnegative(),
});
export type MultiAssetCrossHedgingAsset = z.infer<typeof MultiAssetCrossHedgingAssetSchema>;

export const SWFReinsuranceOptionMultiAssetCrossHedgingPortfolioSchema = z.object({
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  assets: z.array(MultiAssetCrossHedgingAssetSchema),
  riskDiversificationCoefficient: z.number(),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMultiAssetCrossHedgingPortfolio = z.infer<typeof SWFReinsuranceOptionMultiAssetCrossHedgingPortfolioSchema>;

export const SWFReinsuranceOptionMultiAssetCrossHedgingVoteSchema = z.object({
  syndicateId: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  assets: z.array(MultiAssetCrossHedgingAssetSchema),
  timestamp: z.number().int(),
});
export type SWFReinsuranceOptionMultiAssetCrossHedgingVote = z.infer<typeof SWFReinsuranceOptionMultiAssetCrossHedgingVoteSchema>;

export const VolatilityHedgedPremiumPolicySchema = z.object({
  swfYieldCdoId: z.string(),
  volatilityReserve: z.number().int().nonnegative(),
  basePremiumRate: z.number().nonnegative(),
  volatilityHedgeMultiplier: z.number().nonnegative(),
  timestamp: z.number().int(),
});
export type VolatilityHedgedPremiumPolicy = z.infer<typeof VolatilityHedgedPremiumPolicySchema>;


export const SWFYieldCDOTrancheRiskRatingSchema = z.object({
  id: z.string(),
  swfYieldCdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  riskRating: z.enum(["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "CC", "C", "D"]),
  collateralizationRatio: z.number(),
  defaultCorrelation: z.number(),
  timestamp: z.number().int(),
});
export type SWFYieldCDOTrancheRiskRating = z.infer<typeof SWFYieldCDOTrancheRiskRatingSchema>;

export const SWFYieldCDORiskRatingModelSchema = z.object({
  id: z.string(),
  defaultCorrelationWeight: z.number(),
  collateralRatioWeight: z.number(),
  baseRiskMultiplier: z.number(),
  timestamp: z.number().int(),
});
export type SWFYieldCDORiskRatingModel = z.infer<typeof SWFYieldCDORiskRatingModelSchema>;

export const SWFYieldCDORiskRatingModelProposalSchema = z.object({
  id: z.string(),
  proposerSyndicateId: z.string(),
  defaultCorrelationWeight: z.number(),
  collateralRatioWeight: z.number(),
  baseRiskMultiplier: z.number(),
  timestamp: z.number().int(),
  resolved: z.boolean(),
  votes: z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })).optional(),
});
export type SWFYieldCDORiskRatingModelProposal = z.infer<typeof SWFYieldCDORiskRatingModelProposalSchema>;

export const SWFCDODefaultCorrelationLogSchema = z.object({
  cdoId: z.string(),
  trancheId: z.enum(["senior", "mezzanine", "equity"]),
  defaulted: z.boolean(),
  timestamp: z.number().int(),
});
export type SWFCDODefaultCorrelationLog = z.infer<typeof SWFCDODefaultCorrelationLogSchema>;


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
  swfYieldCDOCDSs: z.record(z.string(), SWFYieldCDOCDSSchema).optional(),
  swfYieldCDOCDSVotes: z.record(z.string(), z.record(z.string(), SWFYieldCDOCDSVoteSchema)).optional(),
  swfYieldCDOCDSTrades: z.record(z.string(), SWFYieldCDOCDSTradeProposalSchema).optional(),
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
  swfMarginRehypothecationVotes: z.record(z.string(), z.record(z.string(), z.object({
    vaultId: z.string(),
    percentage: z.number().int().nonnegative().max(100),
    timestamp: z.number().int(),
  }))).optional(),
  swfMarginRehypothecationRevokeVotes: z.record(z.string(), z.record(z.string(), z.object({
    timestamp: z.number().int(),
  }))).optional(),
  swfMarginRebalancingPolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    vaultTargets: z.record(z.string(), z.number().int().nonnegative().max(100)),
    liquidityBufferRatio: z.number().int().nonnegative().max(100),
    bufferTriggerRatio: z.number(),
    timestamp: z.number().int(),
  }))).optional(),
  swfYieldArbitragePolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    yieldThresholds: z.record(z.string(), z.number()),
    autoWithdrawalEnabled: z.boolean(),
    timestamp: z.number().int(),
  }))).optional(),
  swfSovereignBondArbitragePolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    targetPoolIds: z.array(z.string()),
    maxCapitalAllocated: z.number().int().nonnegative(),
    minYieldSpread: z.number().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  swfStakingPolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    stakedFactions: z.record(z.string(), z.number().int().nonnegative().max(100)),
    timestamp: z.number().int(),
  }))).optional(),
  cooperativeSWFStakingCampaigns: z.record(z.string(), CooperativeSWFStakingCampaignSchema).optional(),
  cooperativeSWFStakingCampaignProposals: z.record(z.string(), CooperativeSWFStakingCampaignProposalSchema).optional(),
  cooperativeSWFStakingCampaignJoinVotes: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.object({
    vote: z.boolean(),
    timestamp: z.number().int(),
  })))).optional(),
  swfRebalancingAdvisorVotes: z.record(z.string(), z.record(z.string(), z.object({
    enabled: z.boolean(),
    timestamp: z.number().int(),
  }))).optional(),
  swfAdvisorSafetyThresholdVotes: z.record(z.string(), z.record(z.string(), z.object({
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
  cooperativeSovereigntyBondProposals: z.record(z.string(), CooperativeSovereigntyBondProposalSchema).optional(),
  secondaryBondListings: z.record(z.string(), SecondaryBondListingSchema).optional(),
  sovereignBondBorrowPositions: z.record(z.string(), SovereignBondBorrowPositionSchema).optional(),
  sovereignBondLendingPools: z.record(z.string(), SovereignBondLendingPoolSchema).optional(),
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
  liquidityPoolAudits: z.record(z.string(), LiquidityPoolAuditSchema).optional(),
  antiDeficitStabilizationPolicies: z.record(z.string(), AntiDeficitStabilizationPolicySchema).optional(),
  antiDeficitStabilizationVotes: z.record(z.string(), z.record(z.string(), AntiDeficitStabilizationVoteSchema)).optional(),
  liquidityPoolAuditVotes: z.record(z.string(), z.record(z.string(), LiquidityPoolAuditVoteSchema)).optional(),
  stabilizationTransferVotes: z.record(z.string(), z.record(z.string(), StabilizationTransferVoteSchema)).optional(),
  crossMeshBridgeProposals: z.record(z.string(), CrossMeshBridgeProposalSchema).optional(),
  crossMeshBridgeLoans: z.record(z.string(), CrossMeshBridgeLoanSchema).optional(),
  sovereignWealthFunds: z.record(z.string(), SovereignWealthFundSchema).optional(),
  sovereignBondFuturesPositions: z.record(z.string(), SovereignBondFuturesPositionSchema).optional(),
  marginLiquidationInsurancePolicies: z.record(z.string(), MarginLiquidationInsurancePolicySchema).optional(),
  openSovereignBondFuturesVotes: z.record(z.string(), z.record(z.string(), z.object({
    bondId: z.string(),
    side: z.enum(["long", "short"]),
    size: z.number().int().positive(),
    leverage: z.number().positive(),
    marginCollateral: z.number().int().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  closeSovereignBondFuturesVotes: z.record(z.string(), z.record(z.string(), z.object({
    positionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  marginLiquidationInsuranceVotes: z.record(z.string(), z.record(z.string(), z.object({
    allocatedGold: z.number().int().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  jointVenturePortfolios: z.record(z.string(), JointVenturePortfolioSchema).optional(),
  sovereignWealthFundProposals: z.record(z.string(), SovereignWealthFundProposalSchema).optional(),
  jointVentureInvestmentProposals: z.record(z.string(), JointVentureInvestmentProposalSchema).optional(),
  jointVenturePortfolioSwapProposals: z.record(z.string(), JointVenturePortfolioSwapProposalSchema).optional(),
  jointVentureAssetLiquidationProposals: z.record(z.string(), JointVentureAssetLiquidationProposalSchema).optional(),
  swfYieldTokens: z.record(z.string(), SWFYieldTokenSchema).optional(),
  swfYieldTokenProposals: z.record(z.string(), SWFYieldTokenProposalSchema).optional(),
  swfRiskPools: z.record(z.string(), SWFRiskPoolSchema).optional(),
  swfRiskPoolProposals: z.record(z.string(), SWFRiskPoolProposalSchema).optional(),
  swfYieldCDOs: z.record(z.string(), SWFYieldCDOSchema).optional(),
  swfYieldCDOProposals: z.record(z.string(), SWFYieldCDOPackageProposalSchema).optional(),
  swfLeverageTargetVotes: z.record(z.string(), z.record(z.string(), z.object({
    target: z.number().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  swfFractionalReserveRatioVotes: z.record(z.string(), z.record(z.string(), z.object({
    ratio: z.number().int().nonnegative().max(100),
    timestamp: z.number().int(),
  }))).optional(),
  claimSWFLiquidityRewardsVotes: z.record(z.string(), z.record(z.string(), z.object({
    positionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  lockedSWFCollateralVotes: z.record(z.string(), z.record(z.string(), z.object({
    vaultId: z.string(),
    amount: z.number().int().positive(),
    durationEpochs: z.number().int().positive(),
    factionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  sovereignBondOptions: z.record(z.string(), SovereignBondOptionSchema).optional(),
  yieldVolatilityIndexes: z.record(z.string(), YieldVolatilityIndexSchema).optional(),
  volatilityHedgedReserveBuffers: z.record(z.string(), VolatilityHedgedReserveBufferSchema).optional(),
  sovereignBondVolatilityPositions: z.record(z.string(), SovereignBondVolatilityPositionSchema).optional(),
  bondYieldHistories: z.record(z.string(), z.array(z.number())).optional(),

  // Options votes
  buySovereignBondOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    bondId: z.string(),
    optionType: z.enum(["call", "put"]),
    strikePrice: z.number(),
    premium: z.number(),
    size: z.number().int().positive(),
    expirationEpoch: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  sellSovereignBondOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    optionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  exerciseSovereignBondOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    optionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),

  // Volatility votes
  openSovereignBondVolatilityVotes: z.record(z.string(), z.record(z.string(), z.object({
    bondId: z.string(),
    side: z.enum(["long", "short"]),
    size: z.number().int().positive(),
    marginCollateral: z.number().int().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  closeSovereignBondVolatilityVotes: z.record(z.string(), z.record(z.string(), z.object({
    positionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),

  // Volatility hedged reserve buffer votes
  configureVolatilityHedgedBufferVotes: z.record(z.string(), z.record(z.string(), z.object({
    reserveTarget: z.number().nonnegative(),
    hedgedRatio: z.number().nonnegative().max(100),
    timestamp: z.number().int(),
  }))).optional(),

  swfYieldCDOTrancheReinsurancePolicies: z.record(z.string(), SWFYieldCDOTrancheReinsurancePolicySchema).optional(),
  swfYieldCDOTrancheReinsuranceProposals: z.record(z.string(), SWFYieldCDOTrancheReinsuranceProposalSchema).optional(),
  swfYieldCDOTrancheReinsuranceListings: z.record(z.string(), SWFYieldCDOTrancheReinsuranceListingSchema).optional(),
  listSWFYieldCDOTrancheReinsuranceVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    policyId: z.string(),
    askPrice: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  placeSWFYieldCDOTrancheReinsuranceBidVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    bidAmount: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  executeSWFYieldCDOTrancheReinsuranceSaleVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    buyerSyndicateId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  cancelSWFYieldCDOTrancheReinsuranceListingVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  swfYieldCDOTrancheRiskRatings: z.record(z.string(), SWFYieldCDOTrancheRiskRatingSchema).optional(),
  swfYieldCDORiskRatingModels: z.record(z.string(), SWFYieldCDORiskRatingModelSchema).optional(),
  swfYieldCDORiskRatingModelProposals: z.record(z.string(), SWFYieldCDORiskRatingModelProposalSchema).optional(),
  swfCDODefaultCorrelationLogs: z.array(SWFCDODefaultCorrelationLogSchema).optional(),
  swfReinsuranceFuturesContracts: z.record(z.string(), SWFReinsuranceFuturesContractSchema).optional(),
  openSWFReinsuranceFuturesVotes: z.record(z.string(), z.record(z.string(), z.object({
    id: z.string(),
    swfYieldCdoId: z.string(),
    trancheId: z.enum(["senior", "mezzanine", "equity"]),
    side: z.enum(["long", "short"]),
    lockPremiumRate: z.number(),
    size: z.number().int().positive(),
    marginCollateral: z.number().int().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  closeSWFReinsuranceFuturesVotes: z.record(z.string(), z.record(z.string(), z.object({
    positionId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  volatilityHedgedPremiumPolicies: z.record(z.string(), VolatilityHedgedPremiumPolicySchema).optional(),
  configureVolatilityHedgedPremiumPolicyVotes: z.record(z.string(), z.record(z.string(), z.object({
    swfYieldCdoId: z.string(),
    basePremiumRate: z.number().nonnegative(),
    volatilityReserve: z.number().int().nonnegative(),
    volatilityHedgeMultiplier: z.number().nonnegative(),
    timestamp: z.number().int(),
  }))).optional(),
  swfReinsuranceOptionsContracts: z.record(z.string(), SWFReinsuranceOptionContractSchema).optional(),
  swfReinsuranceOptionsListings: z.record(z.string(), SWFReinsuranceOptionsListingSchema).optional(),
  listSWFReinsuranceOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    swfYieldCdoId: z.string(),
    trancheId: z.enum(["senior", "mezzanine", "equity"]),
    optionType: z.enum(["call", "put"]),
    strikePremiumRate: z.number(),
    size: z.number().int().positive(),
    askPrice: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  bidSWFReinsuranceOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    bidAmount: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  executeSWFReinsuranceOptionSaleVotes: z.record(z.string(), z.record(z.string(), z.object({
    listingId: z.string(),
    buyerSyndicateId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  exerciseSWFReinsuranceOptionVotes: z.record(z.string(), z.record(z.string(), z.object({
    contractId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  swfReinsuranceOptionLimitOrders: z.record(z.string(), SWFReinsuranceOptionLimitOrderSchema).optional(),
  swfReinsuranceOptionOrderBookVolumes: z.record(z.string(), z.number().int().nonnegative()).optional(),
  swfReinsuranceOptionOrderBookDepths: z.record(z.string(), SWFReinsuranceOptionOrderBookDepthSchema).optional(),
  swfReinsuranceOptionTransactionCostPolicies: z.record(z.string(), SWFReinsuranceOptionTransactionCostPolicySchema).optional(),
  adjustSWFReinsuranceOptionTransactionCostVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionTransactionCostVoteSchema)).optional(),
  swfReinsuranceOptionMarketMakerRebatePolicies: z.record(z.string(), SWFReinsuranceOptionMarketMakerRebatePolicySchema).optional(),
  adjustSWFReinsuranceOptionMarketMakerRebateVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionMarketMakerRebateVoteSchema)).optional(),
  swfReinsuranceOptionMarginPolicies: z.record(z.string(), SWFReinsuranceOptionMarginPolicySchema).optional(),
  adjustSWFReinsuranceOptionMarginVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionMarginVoteSchema)).optional(),
  swfReinsuranceOptionStressTestPolicies: z.record(z.string(), SWFReinsuranceOptionStressTestPolicySchema).optional(),
  adjustSWFReinsuranceOptionStressTestVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionStressTestVoteSchema)).optional(),
  swfReinsuranceOptionHedgingPolicies: z.record(z.string(), SWFReinsuranceOptionHedgingPolicySchema).optional(),
  adjustSWFReinsuranceOptionHedgingVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionHedgingVoteSchema)).optional(),
  swfReinsuranceOptionDeltaHedgingPolicies: z.record(z.string(), SWFReinsuranceOptionDeltaHedgingPolicySchema).optional(),
  adjustSWFReinsuranceOptionDeltaHedgingVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionDeltaHedgingVoteSchema)).optional(),
  swfReinsuranceOptionStressTestDeltaHedgingPolicies: z.record(z.string(), SWFReinsuranceOptionStressTestDeltaHedgingPolicySchema).optional(),
  adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionStressTestDeltaHedgingVoteSchema)).optional(),
  swfReinsuranceOptionCrossHedgingPolicies: z.record(z.string(), SWFReinsuranceOptionCrossHedgingPolicySchema).optional(),
  adjustSWFReinsuranceOptionCrossHedgingVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionCrossHedgingVoteSchema)).optional(),
  swfReinsuranceOptionMultiAssetCrossHedgingPortfolios: z.record(z.string(), SWFReinsuranceOptionMultiAssetCrossHedgingPortfolioSchema).optional(),
  adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes: z.record(z.string(), z.record(z.string(), SWFReinsuranceOptionMultiAssetCrossHedgingVoteSchema)).optional(),
  submitSWFReinsuranceOptionLimitOrderVotes: z.record(z.string(), z.record(z.string(), z.object({
    orderId: z.string(),
    orderType: z.enum(["buy", "sell"]),
    contractId: z.string().optional(),
    swfYieldCdoId: z.string(),
    trancheId: z.enum(["senior", "mezzanine", "equity"]),
    optionType: z.enum(["call", "put"]),
    strikePremiumRate: z.number(),
    size: z.number().int().positive(),
    limitPrice: z.number().int().positive(),
    timestamp: z.number().int(),
  }))).optional(),
  cancelSWFReinsuranceOptionLimitOrderVotes: z.record(z.string(), z.record(z.string(), z.object({
    orderId: z.string(),
    timestamp: z.number().int(),
  }))).optional(),
  swfLiquidityMiningRewards: z.record(z.string(), z.number().int().nonnegative()).optional(),
  claimReinsuranceLiquidityMiningRewardsVotes: z.record(z.string(), z.record(z.string(), z.object({
    timestamp: z.number().int(),
  }))).optional(),
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
    swfYieldCDOCDSs: {},
    swfYieldCDOCDSVotes: {},
    swfYieldCDOCDSTrades: {},
    marginAccounts: {},
    marginRehypothecationVotes: {},
    marginRehypothecationRevokeVotes: {},
    marginRebalancingPolicyVotes: {},
    rebalancingAdvisorVotes: {},
    advisorSafetyThresholdVotes: {},
    swfMarginRehypothecationVotes: {},
    swfMarginRehypothecationRevokeVotes: {},
    swfMarginRebalancingPolicyVotes: {},
    swfYieldArbitragePolicyVotes: {},
    swfSovereignBondArbitragePolicyVotes: {},
    swfStakingPolicyVotes: {},
    swfRebalancingAdvisorVotes: {},
    swfAdvisorSafetyThresholdVotes: {},
    swfLeverageTargetVotes: {},
    swfFractionalReserveRatioVotes: {},
    claimSWFLiquidityRewardsVotes: {},
    lockedSWFCollateralVotes: {},
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
    cooperativeSovereigntyBondProposals: {},
    secondaryBondListings: {},
    sovereignBondBorrowPositions: {},
    sovereignBondLendingPools: {},
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
    liquidityPoolAudits: {},
    antiDeficitStabilizationPolicies: {},
    antiDeficitStabilizationVotes: {},
    liquidityPoolAuditVotes: {},
    stabilizationTransferVotes: {},
    crossMeshBridgeProposals: {},
    crossMeshBridgeLoans: {},
    sovereignWealthFunds: {},
    sovereignBondFuturesPositions: {},
    marginLiquidationInsurancePolicies: {},
    openSovereignBondFuturesVotes: {},
    closeSovereignBondFuturesVotes: {},
    marginLiquidationInsuranceVotes: {},
    jointVenturePortfolios: {},
    sovereignWealthFundProposals: {},
    jointVentureInvestmentProposals: {},
    jointVenturePortfolioSwapProposals: {},
    jointVentureAssetLiquidationProposals: {},
    swfYieldTokens: {},
    swfYieldTokenProposals: {},
    swfRiskPools: {},
    swfRiskPoolProposals: {},
    swfYieldCDOs: {},
    swfYieldCDOProposals: {},
    sovereignBondOptions: {},
    yieldVolatilityIndexes: {},
    volatilityHedgedReserveBuffers: {},
    sovereignBondVolatilityPositions: {},
    bondYieldHistories: {},
    buySovereignBondOptionVotes: {},
    sellSovereignBondOptionVotes: {},
    exerciseSovereignBondOptionVotes: {},
    openSovereignBondVolatilityVotes: {},
    closeSovereignBondVolatilityVotes: {},
    configureVolatilityHedgedBufferVotes: {},
    swfYieldCDOTrancheReinsurancePolicies: {},
    swfYieldCDOTrancheReinsuranceProposals: {},
    swfYieldCDOTrancheReinsuranceListings: {},
    listSWFYieldCDOTrancheReinsuranceVotes: {},
    placeSWFYieldCDOTrancheReinsuranceBidVotes: {},
    executeSWFYieldCDOTrancheReinsuranceSaleVotes: {},
    cancelSWFYieldCDOTrancheReinsuranceListingVotes: {},
    swfYieldCDOTrancheRiskRatings: {},
    swfYieldCDORiskRatingModels: {},
    swfYieldCDORiskRatingModelProposals: {},
    swfCDODefaultCorrelationLogs: [],
    swfReinsuranceFuturesContracts: {},
    openSWFReinsuranceFuturesVotes: {},
    closeSWFReinsuranceFuturesVotes: {},
    volatilityHedgedPremiumPolicies: {},
    configureVolatilityHedgedPremiumPolicyVotes: {},
    swfReinsuranceOptionsContracts: {},
    swfReinsuranceOptionsListings: {},
    listSWFReinsuranceOptionVotes: {},
    bidSWFReinsuranceOptionVotes: {},
    executeSWFReinsuranceOptionSaleVotes: {},
    exerciseSWFReinsuranceOptionVotes: {},
    swfReinsuranceOptionLimitOrders: {},
    swfReinsuranceOptionOrderBookVolumes: {},
    swfReinsuranceOptionOrderBookDepths: {},
    swfReinsuranceOptionTransactionCostPolicies: {},
    adjustSWFReinsuranceOptionTransactionCostVotes: {},
    swfReinsuranceOptionMarketMakerRebatePolicies: {},
    adjustSWFReinsuranceOptionMarketMakerRebateVotes: {},
    swfReinsuranceOptionMarginPolicies: {},
    adjustSWFReinsuranceOptionMarginVotes: {},
    swfReinsuranceOptionStressTestPolicies: {},
    adjustSWFReinsuranceOptionStressTestVotes: {},
    swfReinsuranceOptionHedgingPolicies: {},
    adjustSWFReinsuranceOptionHedgingVotes: {},
    swfReinsuranceOptionDeltaHedgingPolicies: {},
    adjustSWFReinsuranceOptionDeltaHedgingVotes: {},
    swfReinsuranceOptionStressTestDeltaHedgingPolicies: {},
    adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes: {},
    swfReinsuranceOptionCrossHedgingPolicies: {},
    adjustSWFReinsuranceOptionCrossHedgingVotes: {},
    swfReinsuranceOptionMultiAssetCrossHedgingPortfolios: {},
    adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes: {},
    submitSWFReinsuranceOptionLimitOrderVotes: {},
    cancelSWFReinsuranceOptionLimitOrderVotes: {},
    swfLiquidityMiningRewards: {},
    claimReinsuranceLiquidityMiningRewardsVotes: {},
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
    swfYieldCDOCDSs: rest.swfYieldCDOCDSs ? JSON.parse(JSON.stringify(rest.swfYieldCDOCDSs)) : undefined,
    swfYieldCDOCDSVotes: rest.swfYieldCDOCDSVotes ? JSON.parse(JSON.stringify(rest.swfYieldCDOCDSVotes)) : undefined,
    swfYieldCDOCDSTrades: rest.swfYieldCDOCDSTrades ? JSON.parse(JSON.stringify(rest.swfYieldCDOCDSTrades)) : undefined,
    marginAccounts: rest.marginAccounts ? JSON.parse(JSON.stringify(rest.marginAccounts)) : undefined,
    marginRehypothecationVotes: rest.marginRehypothecationVotes ? JSON.parse(JSON.stringify(rest.marginRehypothecationVotes)) : undefined,
    marginRehypothecationRevokeVotes: rest.marginRehypothecationRevokeVotes ? JSON.parse(JSON.stringify(rest.marginRehypothecationRevokeVotes)) : undefined,
    marginRebalancingPolicyVotes: rest.marginRebalancingPolicyVotes ? JSON.parse(JSON.stringify(rest.marginRebalancingPolicyVotes)) : undefined,
    rebalancingAdvisorVotes: rest.rebalancingAdvisorVotes ? JSON.parse(JSON.stringify(rest.rebalancingAdvisorVotes)) : undefined,
    advisorSafetyThresholdVotes: rest.advisorSafetyThresholdVotes ? JSON.parse(JSON.stringify(rest.advisorSafetyThresholdVotes)) : undefined,
    swfMarginRehypothecationVotes: rest.swfMarginRehypothecationVotes ? JSON.parse(JSON.stringify(rest.swfMarginRehypothecationVotes)) : undefined,
    swfMarginRehypothecationRevokeVotes: rest.swfMarginRehypothecationRevokeVotes ? JSON.parse(JSON.stringify(rest.swfMarginRehypothecationRevokeVotes)) : undefined,
    swfMarginRebalancingPolicyVotes: rest.swfMarginRebalancingPolicyVotes ? JSON.parse(JSON.stringify(rest.swfMarginRebalancingPolicyVotes)) : undefined,
    swfYieldArbitragePolicyVotes: rest.swfYieldArbitragePolicyVotes ? JSON.parse(JSON.stringify(rest.swfYieldArbitragePolicyVotes)) : undefined,
    swfSovereignBondArbitragePolicyVotes: rest.swfSovereignBondArbitragePolicyVotes ? JSON.parse(JSON.stringify(rest.swfSovereignBondArbitragePolicyVotes)) : undefined,
    swfStakingPolicyVotes: rest.swfStakingPolicyVotes ? JSON.parse(JSON.stringify(rest.swfStakingPolicyVotes)) : undefined,
    swfRebalancingAdvisorVotes: rest.swfRebalancingAdvisorVotes ? JSON.parse(JSON.stringify(rest.swfRebalancingAdvisorVotes)) : undefined,
    swfAdvisorSafetyThresholdVotes: rest.swfAdvisorSafetyThresholdVotes ? JSON.parse(JSON.stringify(rest.swfAdvisorSafetyThresholdVotes)) : undefined,
    swfLeverageTargetVotes: rest.swfLeverageTargetVotes ? JSON.parse(JSON.stringify(rest.swfLeverageTargetVotes)) : undefined,
    swfFractionalReserveRatioVotes: rest.swfFractionalReserveRatioVotes ? JSON.parse(JSON.stringify(rest.swfFractionalReserveRatioVotes)) : undefined,
    claimSWFLiquidityRewardsVotes: rest.claimSWFLiquidityRewardsVotes ? JSON.parse(JSON.stringify(rest.claimSWFLiquidityRewardsVotes)) : undefined,
    lockedSWFCollateralVotes: rest.lockedSWFCollateralVotes ? JSON.parse(JSON.stringify(rest.lockedSWFCollateralVotes)) : undefined,
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
    cooperativeSovereigntyBondProposals: rest.cooperativeSovereigntyBondProposals ? JSON.parse(JSON.stringify(rest.cooperativeSovereigntyBondProposals)) : undefined,
    secondaryBondListings: rest.secondaryBondListings ? JSON.parse(JSON.stringify(rest.secondaryBondListings)) : undefined,
    sovereignBondBorrowPositions: rest.sovereignBondBorrowPositions ? JSON.parse(JSON.stringify(rest.sovereignBondBorrowPositions)) : undefined,
    sovereignBondLendingPools: rest.sovereignBondLendingPools ? JSON.parse(JSON.stringify(rest.sovereignBondLendingPools)) : undefined,
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
    liquidityPoolAudits: rest.liquidityPoolAudits ? JSON.parse(JSON.stringify(rest.liquidityPoolAudits)) : undefined,
    antiDeficitStabilizationPolicies: rest.antiDeficitStabilizationPolicies ? JSON.parse(JSON.stringify(rest.antiDeficitStabilizationPolicies)) : undefined,
    antiDeficitStabilizationVotes: rest.antiDeficitStabilizationVotes ? JSON.parse(JSON.stringify(rest.antiDeficitStabilizationVotes)) : undefined,
    liquidityPoolAuditVotes: rest.liquidityPoolAuditVotes ? JSON.parse(JSON.stringify(rest.liquidityPoolAuditVotes)) : undefined,
    stabilizationTransferVotes: rest.stabilizationTransferVotes ? JSON.parse(JSON.stringify(rest.stabilizationTransferVotes)) : undefined,
    crossMeshBridgeProposals: rest.crossMeshBridgeProposals ? JSON.parse(JSON.stringify(rest.crossMeshBridgeProposals)) : undefined,
    crossMeshBridgeLoans: rest.crossMeshBridgeLoans ? JSON.parse(JSON.stringify(rest.crossMeshBridgeLoans)) : undefined,
    sovereignWealthFunds: rest.sovereignWealthFunds ? JSON.parse(JSON.stringify(rest.sovereignWealthFunds)) : undefined,
    sovereignBondFuturesPositions: rest.sovereignBondFuturesPositions ? JSON.parse(JSON.stringify(rest.sovereignBondFuturesPositions)) : undefined,
    marginLiquidationInsurancePolicies: rest.marginLiquidationInsurancePolicies ? JSON.parse(JSON.stringify(rest.marginLiquidationInsurancePolicies)) : undefined,
    openSovereignBondFuturesVotes: rest.openSovereignBondFuturesVotes ? JSON.parse(JSON.stringify(rest.openSovereignBondFuturesVotes)) : undefined,
    closeSovereignBondFuturesVotes: rest.closeSovereignBondFuturesVotes ? JSON.parse(JSON.stringify(rest.closeSovereignBondFuturesVotes)) : undefined,
    marginLiquidationInsuranceVotes: rest.marginLiquidationInsuranceVotes ? JSON.parse(JSON.stringify(rest.marginLiquidationInsuranceVotes)) : undefined,
    jointVenturePortfolios: rest.jointVenturePortfolios ? JSON.parse(JSON.stringify(rest.jointVenturePortfolios)) : undefined,
    sovereignWealthFundProposals: rest.sovereignWealthFundProposals ? JSON.parse(JSON.stringify(rest.sovereignWealthFundProposals)) : undefined,
    jointVentureInvestmentProposals: rest.jointVentureInvestmentProposals ? JSON.parse(JSON.stringify(rest.jointVentureInvestmentProposals)) : undefined,
    jointVenturePortfolioSwapProposals: rest.jointVenturePortfolioSwapProposals ? JSON.parse(JSON.stringify(rest.jointVenturePortfolioSwapProposals)) : undefined,
    jointVentureAssetLiquidationProposals: rest.jointVentureAssetLiquidationProposals ? JSON.parse(JSON.stringify(rest.jointVentureAssetLiquidationProposals)) : undefined,
    swfYieldTokens: rest.swfYieldTokens ? JSON.parse(JSON.stringify(rest.swfYieldTokens)) : undefined,
    swfYieldTokenProposals: rest.swfYieldTokenProposals ? JSON.parse(JSON.stringify(rest.swfYieldTokenProposals)) : undefined,
    swfRiskPools: rest.swfRiskPools ? JSON.parse(JSON.stringify(rest.swfRiskPools)) : undefined,
    swfRiskPoolProposals: rest.swfRiskPoolProposals ? JSON.parse(JSON.stringify(rest.swfRiskPoolProposals)) : undefined,
    swfYieldCDOs: rest.swfYieldCDOs ? JSON.parse(JSON.stringify(rest.swfYieldCDOs)) : undefined,
    swfYieldCDOProposals: rest.swfYieldCDOProposals ? JSON.parse(JSON.stringify(rest.swfYieldCDOProposals)) : undefined,
    swfYieldCDOTrancheReinsurancePolicies: rest.swfYieldCDOTrancheReinsurancePolicies ? JSON.parse(JSON.stringify(rest.swfYieldCDOTrancheReinsurancePolicies)) : undefined,
    swfYieldCDOTrancheReinsuranceProposals: rest.swfYieldCDOTrancheReinsuranceProposals ? JSON.parse(JSON.stringify(rest.swfYieldCDOTrancheReinsuranceProposals)) : undefined,
    swfYieldCDOTrancheReinsuranceListings: rest.swfYieldCDOTrancheReinsuranceListings ? JSON.parse(JSON.stringify(rest.swfYieldCDOTrancheReinsuranceListings)) : undefined,
    listSWFYieldCDOTrancheReinsuranceVotes: rest.listSWFYieldCDOTrancheReinsuranceVotes ? JSON.parse(JSON.stringify(rest.listSWFYieldCDOTrancheReinsuranceVotes)) : undefined,
    placeSWFYieldCDOTrancheReinsuranceBidVotes: rest.placeSWFYieldCDOTrancheReinsuranceBidVotes ? JSON.parse(JSON.stringify(rest.placeSWFYieldCDOTrancheReinsuranceBidVotes)) : undefined,
    executeSWFYieldCDOTrancheReinsuranceSaleVotes: rest.executeSWFYieldCDOTrancheReinsuranceSaleVotes ? JSON.parse(JSON.stringify(rest.executeSWFYieldCDOTrancheReinsuranceSaleVotes)) : undefined,
    cancelSWFYieldCDOTrancheReinsuranceListingVotes: rest.cancelSWFYieldCDOTrancheReinsuranceListingVotes ? JSON.parse(JSON.stringify(rest.cancelSWFYieldCDOTrancheReinsuranceListingVotes)) : undefined,
    swfYieldCDOTrancheRiskRatings: rest.swfYieldCDOTrancheRiskRatings ? JSON.parse(JSON.stringify(rest.swfYieldCDOTrancheRiskRatings)) : undefined,
    swfYieldCDORiskRatingModels: rest.swfYieldCDORiskRatingModels ? JSON.parse(JSON.stringify(rest.swfYieldCDORiskRatingModels)) : undefined,
    swfYieldCDORiskRatingModelProposals: rest.swfYieldCDORiskRatingModelProposals ? JSON.parse(JSON.stringify(rest.swfYieldCDORiskRatingModelProposals)) : undefined,
    swfCDODefaultCorrelationLogs: rest.swfCDODefaultCorrelationLogs ? JSON.parse(JSON.stringify(rest.swfCDODefaultCorrelationLogs)) : undefined,
    swfReinsuranceFuturesContracts: rest.swfReinsuranceFuturesContracts ? JSON.parse(JSON.stringify(rest.swfReinsuranceFuturesContracts)) : undefined,
    openSWFReinsuranceFuturesVotes: rest.openSWFReinsuranceFuturesVotes ? JSON.parse(JSON.stringify(rest.openSWFReinsuranceFuturesVotes)) : undefined,
    closeSWFReinsuranceFuturesVotes: rest.closeSWFReinsuranceFuturesVotes ? JSON.parse(JSON.stringify(rest.closeSWFReinsuranceFuturesVotes)) : undefined,
    volatilityHedgedPremiumPolicies: rest.volatilityHedgedPremiumPolicies ? JSON.parse(JSON.stringify(rest.volatilityHedgedPremiumPolicies)) : undefined,
    configureVolatilityHedgedPremiumPolicyVotes: rest.configureVolatilityHedgedPremiumPolicyVotes ? JSON.parse(JSON.stringify(rest.configureVolatilityHedgedPremiumPolicyVotes)) : undefined,
    swfReinsuranceOptionsContracts: rest.swfReinsuranceOptionsContracts ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionsContracts)) : undefined,
    swfReinsuranceOptionsListings: rest.swfReinsuranceOptionsListings ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionsListings)) : undefined,
    listSWFReinsuranceOptionVotes: rest.listSWFReinsuranceOptionVotes ? JSON.parse(JSON.stringify(rest.listSWFReinsuranceOptionVotes)) : undefined,
    bidSWFReinsuranceOptionVotes: rest.bidSWFReinsuranceOptionVotes ? JSON.parse(JSON.stringify(rest.bidSWFReinsuranceOptionVotes)) : undefined,
    executeSWFReinsuranceOptionSaleVotes: rest.executeSWFReinsuranceOptionSaleVotes ? JSON.parse(JSON.stringify(rest.executeSWFReinsuranceOptionSaleVotes)) : undefined,
    exerciseSWFReinsuranceOptionVotes: rest.exerciseSWFReinsuranceOptionVotes ? JSON.parse(JSON.stringify(rest.exerciseSWFReinsuranceOptionVotes)) : undefined,
    swfReinsuranceOptionLimitOrders: rest.swfReinsuranceOptionLimitOrders ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionLimitOrders)) : undefined,
    swfReinsuranceOptionOrderBookVolumes: rest.swfReinsuranceOptionOrderBookVolumes ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionOrderBookVolumes)) : undefined,
    swfReinsuranceOptionOrderBookDepths: rest.swfReinsuranceOptionOrderBookDepths ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionOrderBookDepths)) : undefined,
    swfReinsuranceOptionTransactionCostPolicies: rest.swfReinsuranceOptionTransactionCostPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionTransactionCostPolicies)) : undefined,
    adjustSWFReinsuranceOptionTransactionCostVotes: rest.adjustSWFReinsuranceOptionTransactionCostVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionTransactionCostVotes)) : undefined,
    swfReinsuranceOptionMarketMakerRebatePolicies: rest.swfReinsuranceOptionMarketMakerRebatePolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionMarketMakerRebatePolicies)) : undefined,
    adjustSWFReinsuranceOptionMarketMakerRebateVotes: rest.adjustSWFReinsuranceOptionMarketMakerRebateVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionMarketMakerRebateVotes)) : undefined,
    swfReinsuranceOptionMarginPolicies: rest.swfReinsuranceOptionMarginPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionMarginPolicies)) : undefined,
    adjustSWFReinsuranceOptionMarginVotes: rest.adjustSWFReinsuranceOptionMarginVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionMarginVotes)) : undefined,
    swfReinsuranceOptionStressTestPolicies: rest.swfReinsuranceOptionStressTestPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionStressTestPolicies)) : undefined,
    adjustSWFReinsuranceOptionStressTestVotes: rest.adjustSWFReinsuranceOptionStressTestVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionStressTestVotes)) : undefined,
    swfReinsuranceOptionHedgingPolicies: rest.swfReinsuranceOptionHedgingPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionHedgingPolicies)) : undefined,
    adjustSWFReinsuranceOptionHedgingVotes: rest.adjustSWFReinsuranceOptionHedgingVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionHedgingVotes)) : undefined,
    swfReinsuranceOptionDeltaHedgingPolicies: rest.swfReinsuranceOptionDeltaHedgingPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionDeltaHedgingPolicies)) : undefined,
    adjustSWFReinsuranceOptionDeltaHedgingVotes: rest.adjustSWFReinsuranceOptionDeltaHedgingVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionDeltaHedgingVotes)) : undefined,
    swfReinsuranceOptionStressTestDeltaHedgingPolicies: rest.swfReinsuranceOptionStressTestDeltaHedgingPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionStressTestDeltaHedgingPolicies)) : undefined,
    adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes: rest.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes)) : undefined,
    swfReinsuranceOptionCrossHedgingPolicies: rest.swfReinsuranceOptionCrossHedgingPolicies ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionCrossHedgingPolicies)) : undefined,
    adjustSWFReinsuranceOptionCrossHedgingVotes: rest.adjustSWFReinsuranceOptionCrossHedgingVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionCrossHedgingVotes)) : undefined,
    swfReinsuranceOptionMultiAssetCrossHedgingPortfolios: rest.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios ? JSON.parse(JSON.stringify(rest.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios)) : undefined,
    adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes: rest.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes ? JSON.parse(JSON.stringify(rest.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes)) : undefined,
    submitSWFReinsuranceOptionLimitOrderVotes: rest.submitSWFReinsuranceOptionLimitOrderVotes ? JSON.parse(JSON.stringify(rest.submitSWFReinsuranceOptionLimitOrderVotes)) : undefined,
    cancelSWFReinsuranceOptionLimitOrderVotes: rest.cancelSWFReinsuranceOptionLimitOrderVotes ? JSON.parse(JSON.stringify(rest.cancelSWFReinsuranceOptionLimitOrderVotes)) : undefined,
    swfLiquidityMiningRewards: rest.swfLiquidityMiningRewards ? JSON.parse(JSON.stringify(rest.swfLiquidityMiningRewards)) : undefined,
    claimReinsuranceLiquidityMiningRewardsVotes: rest.claimReinsuranceLiquidityMiningRewardsVotes ? JSON.parse(JSON.stringify(rest.claimReinsuranceLiquidityMiningRewardsVotes)) : undefined,
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

export function reconcileSWFMarginRehypothecations(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfMarginRehypothecationVotes: state.swfMarginRehypothecationVotes ? { ...state.swfMarginRehypothecationVotes } : {},
    swfMarginRehypothecationRevokeVotes: state.swfMarginRehypothecationRevokeVotes ? { ...state.swfMarginRehypothecationRevokeVotes } : {},
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
    const revokeVotes = newState.swfMarginRehypothecationRevokeVotes?.[syndicateId] || {};
    const validRevokeVoters = Object.keys(revokeVotes).filter(voterId => syndicate.members.includes(voterId));
    const revokeCount = validRevokeVoters.length;

    if (revokeCount > totalMembers / 2) {
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        swfRehypothecationAuthorized: false,
        swfRehypothecationVaultId: undefined,
        swfRehypothecationPercentage: undefined,
        timestamp: Math.max(...validRevokeVoters.map(v => revokeVotes[v].timestamp), newState.step),
      };

      if (newState.swfMarginRehypothecationVotes) {
        delete newState.swfMarginRehypothecationVotes[syndicateId];
      }
      if (newState.swfMarginRehypothecationRevokeVotes) {
        delete newState.swfMarginRehypothecationRevokeVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Margin Rehypothecation] SWF Rehypothecation for Syndicate ${syndicateId} has been REVOKED by consensus majority.`
      );
      continue;
    }

    // Check if there is a consensus to authorize
    const authVotes = newState.swfMarginRehypothecationVotes?.[syndicateId] || {};
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
        break;
      }
    }

    if (fullyApprovedCombination) {
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        swfRehypothecationAuthorized: true,
        swfRehypothecationVaultId: fullyApprovedCombination.vaultId,
        swfRehypothecationPercentage: fullyApprovedCombination.percentage,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfMarginRehypothecationVotes) {
        delete newState.swfMarginRehypothecationVotes[syndicateId];
      }
      if (newState.swfMarginRehypothecationRevokeVotes) {
        delete newState.swfMarginRehypothecationRevokeVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Margin Rehypothecation] SWF Rehypothecation for Syndicate ${syndicateId} authorized by consensus majority (Vault: ${fullyApprovedCombination.vaultId}, Percentage: ${fullyApprovedCombination.percentage}%).`
      );
    }
  }

  return newState;
}

export function reconcileSWFMarginRebalancingPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfMarginRebalancingPolicyVotes: state.swfMarginRebalancingPolicyVotes ? { ...state.swfMarginRebalancingPolicyVotes } : {},
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
    const authVotes = newState.swfMarginRebalancingPolicyVotes?.[syndicateId] || {};

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
        break;
      }
    }

    if (fullyApprovedCombination) {
      const collateral = marginAccount.collateral;
      const targetBuffer = Math.floor(collateral * (fullyApprovedCombination.liquidityBufferRatio / 100));
      const targetRehypothecated = collateral - targetBuffer;
      const swfVaultAllocations: Record<string, number> = {};

      for (const [vaultId, pct] of Object.entries(fullyApprovedCombination.vaultTargets || {})) {
        swfVaultAllocations[vaultId] = Math.floor(targetRehypothecated * ((pct as number) / 100));
      }
      const sumAllocated = Object.values(swfVaultAllocations).reduce((a, b) => a + b, 0);
      const swfLiquidityBuffer = collateral - sumAllocated;

      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        swfRebalancingEnabled: fullyApprovedCombination.enabled,
        swfVaultTargets: fullyApprovedCombination.vaultTargets,
        swfLiquidityBufferRatio: fullyApprovedCombination.liquidityBufferRatio,
        swfBufferTriggerRatio: fullyApprovedCombination.bufferTriggerRatio,
        swfLiquidityBuffer,
        swfVaultAllocations,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfMarginRebalancingPolicyVotes) {
        delete newState.swfMarginRebalancingPolicyVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Margin Rebalancing Policy] SWF Rebalancing policy for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}, Buffer Ratio: ${fullyApprovedCombination.liquidityBufferRatio}%, Buffer Trigger: ${fullyApprovedCombination.bufferTriggerRatio}%).`
      );
    }
  }

  return newState;
}

export function reconcileSWFRebalancingAdvisors(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfRebalancingAdvisorVotes: state.swfRebalancingAdvisorVotes ? { ...state.swfRebalancingAdvisorVotes } : {},
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
    const authVotes = newState.swfRebalancingAdvisorVotes?.[syndicateId] || {};

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
        swfAdvisorEnabled: fullyApprovedCombination.enabled,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfRebalancingAdvisorVotes) {
        delete newState.swfRebalancingAdvisorVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Rebalancing Advisor Policy] SWF Rebalancing advisor for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}).`
      );
    }
  }

  return newState;
}

export function reconcileSWFAdvisorSafetyThresholds(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfAdvisorSafetyThresholdVotes: state.swfAdvisorSafetyThresholdVotes ? { ...state.swfAdvisorSafetyThresholdVotes } : {},
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
    const authVotes = newState.swfAdvisorSafetyThresholdVotes?.[syndicateId] || {};

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
        swfAdvisorSafetyThreshold: fullyApprovedCombination.threshold,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfAdvisorSafetyThresholdVotes) {
        delete newState.swfAdvisorSafetyThresholdVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Advisor Safety Threshold Policy] SWF Advisor safety threshold for Syndicate ${syndicateId} set by consensus majority (Threshold: ${fullyApprovedCombination.threshold}%).`
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

export function reconcileSWFYieldCDOCDSs(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfYieldCDOCDSs: state.swfYieldCDOCDSs ? { ...state.swfYieldCDOCDSs } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
  };

  if (!newState.swfYieldCDOCDSVotes) {
    newState.swfYieldCDOCDSVotes = {};
  }

  for (const [cdsId, votes] of Object.entries(newState.swfYieldCDOCDSVotes)) {
    const buyerVotes = Object.values(votes).filter(v => v.side === "buyer");
    const writerVotes = Object.values(votes).filter(v => v.side === "writer");

    if (buyerVotes.length > 0 && writerVotes.length > 0) {
      const latestBuyerVote = buyerVotes.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest, buyerVotes[0]);
      const latestWriterVote = writerVotes.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest, writerVotes[0]);

      if (
        latestBuyerVote.buyerSyndicateId === latestWriterVote.buyerSyndicateId &&
        latestBuyerVote.writerSyndicateId === latestWriterVote.writerSyndicateId &&
        latestBuyerVote.swfYieldCdoId === latestWriterVote.swfYieldCdoId &&
        latestBuyerVote.trancheId === latestWriterVote.trancheId &&
        latestBuyerVote.notionalValue === latestWriterVote.notionalValue &&
        latestBuyerVote.premiumRate === latestWriterVote.premiumRate &&
        (latestBuyerVote.marginEnabled || false) === (latestWriterVote.marginEnabled || false)
      ) {
        const latestTimestamp = Math.max(latestBuyerVote.timestamp, latestWriterVote.timestamp);
        const existingCds = newState.swfYieldCDOCDSs[cdsId];
        const marginEnabled = latestBuyerVote.marginEnabled || false;

        if (!existingCds || latestTimestamp > existingCds.timestamp) {
          newState.swfYieldCDOCDSs[cdsId] = {
            id: cdsId,
            buyerSyndicateId: latestBuyerVote.buyerSyndicateId,
            writerSyndicateId: latestWriterVote.writerSyndicateId,
            swfYieldCdoId: latestBuyerVote.swfYieldCdoId,
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
                leveragedSWFYieldCDOCDSIds: Array.from(new Set([...(marginAccount.leveragedSWFYieldCDOCDSIds || []), cdsId])),
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

export function reconcileCooperativeSWFStakingCampaigns(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cooperativeSWFStakingCampaignProposals: state.cooperativeSWFStakingCampaignProposals ? { ...state.cooperativeSWFStakingCampaignProposals } : {},
    cooperativeSWFStakingCampaigns: state.cooperativeSWFStakingCampaigns ? { ...state.cooperativeSWFStakingCampaigns } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    cooperativeSWFStakingCampaignJoinVotes: state.cooperativeSWFStakingCampaignJoinVotes ? { ...state.cooperativeSWFStakingCampaignJoinVotes } : {},
  };

  for (const proposalId of Object.keys(newState.cooperativeSWFStakingCampaignProposals || {})) {
    const proposal = newState.cooperativeSWFStakingCampaignProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { creatorSyndicateId, factionId, campaignName, milestones, timestamp } = proposal;
    const syndicate = newState.syndicates?.[creatorSyndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = proposal.votes || {};

    const trueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (trueVotes.length > totalMembers / 2) {
      newState.cooperativeSWFStakingCampaignProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      newState.cooperativeSWFStakingCampaigns[proposalId] = {
        id: proposalId,
        factionId,
        creatorSyndicateId,
        campaignName,
        milestones,
        participants: [creatorSyndicateId],
        stakedAmounts: {},
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Cooperative SWF Staking Campaign Resolved] Syndicate ${creatorSyndicateId} established staking campaign ${campaignName} for faction ${factionId}.`
      );
    }
  }

  for (const [syndicateId, campaignsObj] of Object.entries(newState.cooperativeSWFStakingCampaignJoinVotes || {})) {
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;

    for (const [campaignId, votes] of Object.entries(campaignsObj)) {
      const campaign = newState.cooperativeSWFStakingCampaigns?.[campaignId];
      if (!campaign) continue;

      if (campaign.participants.includes(syndicateId)) continue;

      const trueVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (trueVotes.length > totalMembers / 2) {
        campaign.participants = [...campaign.participants, syndicateId];
        newState.cooperativeSWFStakingCampaigns[campaignId] = { ...campaign };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Cooperative SWF Staking Campaign Joined] Syndicate ${syndicateId} joined staking campaign ${campaign.campaignName} by majority vote.`
        );

        if (newState.cooperativeSWFStakingCampaignJoinVotes[syndicateId]) {
          const updatedJoinVotes = { ...newState.cooperativeSWFStakingCampaignJoinVotes[syndicateId] };
          delete updatedJoinVotes[campaignId];
          newState.cooperativeSWFStakingCampaignJoinVotes[syndicateId] = updatedJoinVotes;
        }
      }
    }
  }

  return newState;
}

export function reconcileCooperativeSovereigntyBonds(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cooperativeSovereigntyBondProposals: state.cooperativeSovereigntyBondProposals ? { ...state.cooperativeSovereigntyBondProposals } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
  };

  for (const proposalId of Object.keys(newState.cooperativeSovereigntyBondProposals || {})) {
    const proposal = newState.cooperativeSovereigntyBondProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { creatorSyndicateId, factionId, faceValue, votes } = proposal;
    const syndicate = newState.syndicates?.[creatorSyndicateId];
    if (!syndicate) continue;

    // Calculate majority vote in creator syndicate
    const totalMembers = syndicate.members.length;
    const trueVotes = Object.entries(votes || {})
      .filter(([voterId, voteObj]) => syndicate.members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    const isApproved = trueVotes.length > totalMembers / 2;
    if (isApproved && !proposal.approved) {
      proposal.approved = true;
    }

    // Calculate total contributions
    const totalContributed = Object.values(proposal.contributions).reduce((sum, val) => sum + val, 0);

    // If approved and fully funded, resolve the proposal to Active bond!
    if (proposal.approved && totalContributed >= faceValue) {
      proposal.resolved = true;
      proposal.status = "Active";
      proposal.remainingEpochs = proposal.termEpochs;

      // Pay the pooled faceValue into the faction reserve pool
      const currentPool = newState.factionReservePools[factionId] ?? 10000;
      newState.factionReservePools[factionId] = currentPool + faceValue;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[Cooperative Sovereignty Bond Active] Cooperative bond ${proposalId} for faction ${factionId} is now Active with total funding of ${totalContributed} gold.`
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

export function reconcileAntiDeficitStabilizationPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    antiDeficitStabilizationPolicies: state.antiDeficitStabilizationPolicies ? { ...state.antiDeficitStabilizationPolicies } : {},
    antiDeficitStabilizationVotes: state.antiDeficitStabilizationVotes ? { ...state.antiDeficitStabilizationVotes } : {},
    liquidityPoolAudits: state.liquidityPoolAudits ? { ...state.liquidityPoolAudits } : {},
    liquidityPoolAuditVotes: state.liquidityPoolAuditVotes ? { ...state.liquidityPoolAuditVotes } : {},
    stabilizationTransferVotes: state.stabilizationTransferVotes ? { ...state.stabilizationTransferVotes } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
    jointLoanInsurancePools: state.jointLoanInsurancePools ? { ...state.jointLoanInsurancePools } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  // Reconcile stabilization policy parameters from votes
  for (const [syndicateId, votes] of Object.entries(newState.antiDeficitStabilizationVotes || {})) {
    const syndicate = state.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const factionCounts: Record<string, number> = {};
    const marginCounts: Record<number, number> = {};
    const injectionCounts: Record<number, number> = {};

    for (const vote of Object.values(votes)) {
      factionCounts[vote.factionId] = (factionCounts[vote.factionId] ?? 0) + 1;
      marginCounts[vote.consensualDeficitMargin] = (marginCounts[vote.consensualDeficitMargin] ?? 0) + 1;
      injectionCounts[vote.stabilizationInjectionAmount] = (injectionCounts[vote.stabilizationInjectionAmount] ?? 0) + 1;
    }

    let maxFactionCount = 0;
    let consensusFactionId = newState.antiDeficitStabilizationPolicies[syndicateId]?.factionId ?? "unaligned";
    const uniqueFactionIds = Object.keys(factionCounts).sort((a, b) => b.localeCompare(a));
    for (const fId of uniqueFactionIds) {
      const count = factionCounts[fId];
      if (count > maxFactionCount) {
        maxFactionCount = count;
        consensusFactionId = fId;
      }
    }

    let maxMarginCount = 0;
    let consensusMargin = newState.antiDeficitStabilizationPolicies[syndicateId]?.consensualDeficitMargin ?? 300;
    const uniqueMargins = Object.keys(marginCounts).map(Number).sort((a, b) => b - a);
    for (const margin of uniqueMargins) {
      const count = marginCounts[margin];
      if (count > maxMarginCount) {
        maxMarginCount = count;
        consensusMargin = margin;
      }
    }

    let maxInjectionCount = 0;
    let consensusInjection = newState.antiDeficitStabilizationPolicies[syndicateId]?.stabilizationInjectionAmount ?? 100;
    const uniqueInjections = Object.keys(injectionCounts).map(Number).sort((a, b) => b - a);
    for (const injection of uniqueInjections) {
      const count = injectionCounts[injection];
      if (count > maxInjectionCount) {
        maxInjectionCount = count;
        consensusInjection = injection;
      }
    }

    const currentPolicy = newState.antiDeficitStabilizationPolicies[syndicateId];
    newState.antiDeficitStabilizationPolicies[syndicateId] = {
      syndicateId,
      factionId: consensusFactionId,
      consensualDeficitMargin: consensusMargin,
      stabilizationInjectionAmount: consensusInjection,
      active: currentPolicy?.active ?? true,
      timestamp: Math.max(...Object.values(votes).map(v => v.timestamp), currentPolicy?.timestamp ?? 0),
    };
  }

  // Reconcile liquidity pool audit votes
  for (const [auditId, votes] of Object.entries(newState.liquidityPoolAuditVotes || {})) {
    const parts = auditId.split(":");
    if (parts.length !== 2) continue;
    const [syndicateId, auditStepStr] = parts;
    const auditStep = parseInt(auditStepStr, 10);

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votingMembers = Object.keys(votes).filter(voterId => syndicate.members.includes(voterId));
    
    if (votingMembers.length >= totalMembers / 2) {
      const pool = newState.jointLoanInsurancePools?.[syndicateId];
      const poolGold = pool ? pool.poolGold : 0;
      const policy = newState.antiDeficitStabilizationPolicies?.[syndicateId];
      const margin = policy?.consensualDeficitMargin ?? 300;
      const deficit = Math.max(0, margin - poolGold);
      const status = deficit > 0 ? "Deficit" : "Healthy";

      newState.liquidityPoolAudits[auditId] = {
        auditId,
        syndicateId,
        auditedGold: poolGold,
        deficitAmount: deficit,
        status,
        timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
      };

      // Automatically trigger mutual faction stabilization injection if Deficit
      if (status === "Deficit" && policy && policy.active && policy.factionId !== "unaligned") {
        const factionId = policy.factionId;
        const factionReserves = newState.factionReservePools?.[factionId] ?? 10000;
        const targetInjection = policy.stabilizationInjectionAmount;
        const actualInjection = Math.min(factionReserves, targetInjection);

        if (actualInjection > 0) {
          newState.factionReservePools[factionId] = factionReserves - actualInjection;
          if (!pool) {
            newState.jointLoanInsurancePools[syndicateId] = {
              syndicateId,
              poolGold: actualInjection,
              premiumRate: 10,
              timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
            };
          } else {
            pool.poolGold += actualInjection;
          }

          newState.liquidityPoolAudits[auditId].status = "Stabilized";
          
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Anti-Deficit Stabilization] Automated stabilization triggered for syndicate ${syndicateId} using faction ${factionId} reserves. Injected ${actualInjection} gold (Pool gold went from ${poolGold} to ${(pool?.poolGold ?? actualInjection)}).`
          );
        }
      }
    }
  }

  // Reconcile one-off stabilization transfer votes
  for (const [transferId, votes] of Object.entries(newState.stabilizationTransferVotes || {})) {
    const parts = transferId.split(":");
    if (parts.length !== 2) continue;
    const [syndicateId, voteTimestampStr] = parts;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votingMembers = Object.keys(votes).filter(voterId => syndicate.members.includes(voterId));

    if (votingMembers.length >= totalMembers / 2) {
      const amountCounts: Record<number, number> = {};
      const factionCounts: Record<string, number> = {};
      for (const vote of Object.values(votes)) {
        amountCounts[vote.amount] = (amountCounts[vote.amount] ?? 0) + 1;
        factionCounts[vote.factionId] = (factionCounts[vote.factionId] ?? 0) + 1;
      }

      let maxAmountCount = 0;
      let consensusAmount = 0;
      const uniqueAmounts = Object.keys(amountCounts).map(Number).sort((a, b) => b - a);
      for (const amount of uniqueAmounts) {
        const count = amountCounts[amount];
        if (count > maxAmountCount) {
          maxAmountCount = count;
          consensusAmount = amount;
        }
      }

      let maxFactionCount = 0;
      let consensusFactionId = "";
      const uniqueFactionIds = Object.keys(factionCounts).sort((a, b) => b.localeCompare(a));
      for (const fId of uniqueFactionIds) {
        const count = factionCounts[fId];
        if (count > maxFactionCount) {
          maxFactionCount = count;
          consensusFactionId = fId;
        }
      }

      if (consensusAmount > 0 && consensusFactionId) {
        const factionReserves = newState.factionReservePools?.[consensusFactionId] ?? 10000;
        const actualInjection = Math.min(factionReserves, consensusAmount);

        if (actualInjection > 0) {
          newState.factionReservePools[consensusFactionId] = factionReserves - actualInjection;
          const pool = newState.jointLoanInsurancePools?.[syndicateId];

          if (!pool) {
            newState.jointLoanInsurancePools[syndicateId] = {
              syndicateId,
              poolGold: actualInjection,
              premiumRate: 10,
              timestamp: Math.max(...Object.values(votes).map(v => v.timestamp)),
            };
          } else {
            pool.poolGold += actualInjection;
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Stabilization Transfer] Consensual stabilization transfer of ${actualInjection} gold executed from faction ${consensusFactionId} reserves to syndicate ${syndicateId} insurance pool.`
          );
        }

        delete newState.stabilizationTransferVotes[transferId];
      }
    }
  }

  return newState;
}

export function reconcileCrossMeshBridges(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    crossMeshBridgeProposals: state.crossMeshBridgeProposals ? { ...state.crossMeshBridgeProposals } : {},
    crossMeshBridgeLoans: state.crossMeshBridgeLoans ? { ...state.crossMeshBridgeLoans } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.crossMeshBridgeProposals || {})) {
    const proposal = newState.crossMeshBridgeProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { borrowerSyndicateId, lenderSyndicateId, amount, interestRate, termSteps, timestamp } = proposal;
    const borrower = newState.syndicates?.[borrowerSyndicateId];
    const lender = newState.syndicates?.[lenderSyndicateId];
    if (!borrower || !lender) continue;

    const borrowerMembers = borrower.members;
    const lenderMembers = lender.members;
    const votes = proposal.votes || {};

    const borrowerTrueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => borrowerMembers.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    const lenderTrueVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => lenderMembers.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    // Double majority approval check
    if (borrowerTrueVotes.length > borrowerMembers.length / 2 && lenderTrueVotes.length > lenderMembers.length / 2) {
      const lenderGold = lender.warChest ?? 0;
      if (lenderGold >= amount) {
        // Resolve proposal
        newState.crossMeshBridgeProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Transfer funds lender -> borrower
        lender.warChest = lenderGold - amount;
        borrower.warChest = (borrower.warChest ?? 0) + amount;

        // Establish active bridge loan
        const totalRepayment = amount + Math.floor(amount * (interestRate / 100));
        
        if (!newState.crossMeshBridgeLoans) newState.crossMeshBridgeLoans = {};
        newState.crossMeshBridgeLoans[proposalId] = {
          id: proposalId,
          borrowerSyndicateId,
          lenderSyndicateId,
          principal: amount,
          interestRate,
          termSteps,
          startStep: newState.step,
          dueStep: newState.step + termSteps,
          remainingRepayment: totalRepayment,
          status: "Active" as const,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Bridge Loan Resolved] Cross-mesh bridge loan ${proposalId} has been successfully established. Transferred ${amount} gold from Syndicate ${lenderSyndicateId} warChest to Syndicate ${borrowerSyndicateId} warChest.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Bridge Loan Resolution Failed] Lender Syndicate ${lenderSyndicateId} has insufficient reserves (${lenderGold} < ${amount}) to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSovereignWealthFunds(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignWealthFundProposals: state.sovereignWealthFundProposals ? { ...state.sovereignWealthFundProposals } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.sovereignWealthFundProposals || {})) {
    const proposal = newState.sovereignWealthFundProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { fundId, syndicateId, amount, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    const votes = proposal.votes || {};

    const yesVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    // Majority check of the proposing syndicate members
    if (yesVotes.length > members.length / 2) {
      const syndicateGold = syndicate.warChest ?? 0;
      if (syndicateGold >= amount) {
        // Resolve proposal
        newState.sovereignWealthFundProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Deduct from syndicate warChest
        syndicate.warChest = syndicateGold - amount;

        // Establish or update SWF
        if (!newState.sovereignWealthFunds[fundId]) {
          newState.sovereignWealthFunds[fundId] = {
            id: fundId,
            syndicates: {},
            totalReserves: 0,
            timestamp,
          };
        } else {
          newState.sovereignWealthFunds[fundId] = {
            ...newState.sovereignWealthFunds[fundId],
            syndicates: { ...newState.sovereignWealthFunds[fundId].syndicates },
          };
        }

        const fund = newState.sovereignWealthFunds[fundId];
        fund.syndicates[syndicateId] = (fund.syndicates[syndicateId] || 0) + amount;
        fund.totalReserves += amount;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reserve Pooled] Sovereign wealth fund ${fundId} received contribution of ${amount} gold from syndicate ${syndicateId}. Total reserves: ${fund.totalReserves} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Pooling Failed] Syndicate ${syndicateId} has insufficient reserves (${syndicateGold} < ${amount}) to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileJointVentureInvestments(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    jointVentureInvestmentProposals: state.jointVentureInvestmentProposals ? { ...state.jointVentureInvestmentProposals } : {},
    jointVenturePortfolios: state.jointVenturePortfolios ? { ...state.jointVenturePortfolios } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.jointVentureInvestmentProposals || {})) {
    const proposal = newState.jointVentureInvestmentProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { fundId, targetType, targetId, amount, yieldRate, timestamp } = proposal;
    const fund = newState.sovereignWealthFunds?.[fundId];
    if (!fund) continue;

    // Check consensus: requires majority approval from each participating syndicate in the SWF!
    const participatingSyndicateIds = Object.keys(fund.syndicates);
    if (participatingSyndicateIds.length === 0) continue;

    let allSyndicatesApproved = true;
    const votes = proposal.votes || {};

    for (const syndicateId of participatingSyndicateIds) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) {
        allSyndicatesApproved = false;
        break;
      }
      const members = syndicate.members;
      const yesVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (yesVotes.length <= members.length / 2) {
        allSyndicatesApproved = false;
        break;
      }
    }

    if (allSyndicatesApproved) {
      const fundReserves = fund.totalReserves;
      if (fundReserves >= amount) {
        // Resolve proposal
        newState.jointVentureInvestmentProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Deduct from fund reserves
        fund.totalReserves = fundReserves - amount;

        // Establish joint venture portfolio investment
        newState.jointVenturePortfolios[proposalId] = {
          id: proposalId,
          fundId,
          targetType,
          targetId,
          investedAmount: amount,
          yieldRate,
          status: "Active" as const,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[JV Investment Active] Established joint-venture investment ${proposalId} from fund ${fundId} in ${targetType} on ${targetId} for ${amount} gold at yield rate ${yieldRate}%.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[JV Investment Failed] SWF ${fundId} has insufficient reserves (${fundReserves} < ${amount}) to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileJointVenturePortfolioSwaps(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    jointVenturePortfolioSwapProposals: state.jointVenturePortfolioSwapProposals ? { ...state.jointVenturePortfolioSwapProposals } : {},
    jointVenturePortfolios: state.jointVenturePortfolios ? { ...state.jointVenturePortfolios } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.jointVenturePortfolioSwapProposals || {})) {
    const proposal = newState.jointVenturePortfolioSwapProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { portfolioId, sourceFundId, targetFundId, goldPrice, timestamp } = proposal;
    const sourceFund = newState.sovereignWealthFunds?.[sourceFundId];
    const targetFund = newState.sovereignWealthFunds?.[targetFundId];
    const portfolio = newState.jointVenturePortfolios?.[portfolioId];

    if (!sourceFund || !targetFund || !portfolio || portfolio.status !== "Active" || portfolio.fundId !== sourceFundId) continue;

    // Both funds' participating syndicates must approve by majority
    const sourceSyndicateIds = Object.keys(sourceFund.syndicates);
    const targetSyndicateIds = Object.keys(targetFund.syndicates);
    if (sourceSyndicateIds.length === 0 || targetSyndicateIds.length === 0) continue;

    const votes = proposal.votes || {};
    let allSyndicatesApproved = true;

    // Check source fund syndicates
    for (const syndicateId of sourceSyndicateIds) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) {
        allSyndicatesApproved = false;
        break;
      }
      const members = syndicate.members;
      const yesVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (yesVotes.length <= members.length / 2) {
        allSyndicatesApproved = false;
        break;
      }
    }

    if (!allSyndicatesApproved) continue;

    // Check target fund syndicates
    for (const syndicateId of targetSyndicateIds) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) {
        allSyndicatesApproved = false;
        break;
      }
      const members = syndicate.members;
      const yesVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (yesVotes.length <= members.length / 2) {
        allSyndicatesApproved = false;
        break;
      }
    }

    if (allSyndicatesApproved) {
      const targetReserves = targetFund.totalReserves;
      if (targetReserves >= goldPrice) {
        // Resolve proposal
        newState.jointVenturePortfolioSwapProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Transfer funds between SWFs
        targetFund.totalReserves = targetReserves - goldPrice;
        sourceFund.totalReserves = (sourceFund.totalReserves ?? 0) + goldPrice;

        // Update portfolio ownership
        newState.jointVenturePortfolios[portfolioId] = {
          ...portfolio,
          fundId: targetFundId,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[JV Portfolio Swapped] Swapped joint-venture portfolio ${portfolioId} from SWF ${sourceFundId} to SWF ${targetFundId} for ${goldPrice} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[JV Portfolio Swap Failed] SWF ${targetFundId} has insufficient reserves (${targetReserves} < ${goldPrice}) to resolve swap proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileJointVentureAssetLiquidations(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    jointVentureAssetLiquidationProposals: state.jointVentureAssetLiquidationProposals ? { ...state.jointVentureAssetLiquidationProposals } : {},
    jointVenturePortfolios: state.jointVenturePortfolios ? { ...state.jointVenturePortfolios } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.jointVentureAssetLiquidationProposals || {})) {
    const proposal = newState.jointVentureAssetLiquidationProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { portfolioId, liquidateAmount, timestamp } = proposal;
    const portfolio = newState.jointVenturePortfolios?.[portfolioId];
    if (!portfolio || portfolio.status !== "Active" || portfolio.investedAmount < liquidateAmount) continue;

    const fund = newState.sovereignWealthFunds?.[portfolio.fundId];
    if (!fund) continue;

    // Check consensus: requires majority approval from each participating syndicate in the SWF owning the portfolio!
    const participatingSyndicateIds = Object.keys(fund.syndicates);
    if (participatingSyndicateIds.length === 0) continue;

    const votes = proposal.votes || {};
    let allSyndicatesApproved = true;

    for (const syndicateId of participatingSyndicateIds) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) {
        allSyndicatesApproved = false;
        break;
      }
      const members = syndicate.members;
      const yesVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (yesVotes.length <= members.length / 2) {
        allSyndicatesApproved = false;
        break;
      }
    }

    if (allSyndicatesApproved) {
      // Resolve proposal
      newState.jointVentureAssetLiquidationProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      // Perform partial or full asset liquidation
      portfolio.investedAmount -= liquidateAmount;
      if (portfolio.investedAmount === 0) {
        portfolio.status = "Closed";
      }

      // Add liquidated amount back to fund reserves
      fund.totalReserves += liquidateAmount;

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[JV Asset Liquidated] Joint-venture portfolio ${portfolioId} partially liquidated ${liquidateAmount} gold returned to SWF ${portfolio.fundId} reserves.`
      );
    }
  }

  return newState;
}

export function reconcileMintSWFYieldTokens(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfYieldTokenProposals: state.swfYieldTokenProposals ? { ...state.swfYieldTokenProposals } : {},
    swfYieldTokens: state.swfYieldTokens ? { ...state.swfYieldTokens } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    jointVenturePortfolios: state.jointVenturePortfolios ? { ...state.jointVenturePortfolios } : {},
  };

  for (const proposalId of Object.keys(newState.swfYieldTokenProposals || {})) {
    const proposal = newState.swfYieldTokenProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { fundId, portfolioId, totalShares, pricePerShare, timestamp } = proposal;
    const fund = newState.sovereignWealthFunds?.[fundId];
    const portfolio = newState.jointVenturePortfolios?.[portfolioId];
    if (!fund || !portfolio || portfolio.status !== "Active") continue;

    // Check consensus: requires majority approval from each participating syndicate in the SWF!
    const participatingSyndicateIds = Object.keys(fund.syndicates);
    if (participatingSyndicateIds.length === 0) continue;

    let allSyndicatesApproved = true;
    const votes = proposal.votes || {};

    for (const syndicateId of participatingSyndicateIds) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) {
        allSyndicatesApproved = false;
        break;
      }
      const members = syndicate.members;
      const yesVotes = Object.entries(votes)
        .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
        .map(([voterId]) => voterId);

      if (yesVotes.length <= members.length / 2) {
        allSyndicatesApproved = false;
        break;
      }
    }

    if (allSyndicatesApproved) {
      // Proportional distribution of minted yield shares
      let totalContributed = 0;
      for (const amt of Object.values(fund.syndicates)) {
        totalContributed += amt;
      }

      const syndicateShares: Record<string, number> = {};
      if (totalContributed > 0) {
        let remainingShares = totalShares;
        const sortedSyndicates = Object.keys(fund.syndicates).sort(
          (a, b) => fund.syndicates[b] - fund.syndicates[a]
        );

        for (const syndicateId of sortedSyndicates) {
          const contribution = fund.syndicates[syndicateId];
          const shares = Math.floor(totalShares * (contribution / totalContributed));
          const actualShares = Math.min(shares, remainingShares);
          syndicateShares[syndicateId] = actualShares;
          remainingShares -= actualShares;
        }

        // Remainder to the highest contributor
        if (remainingShares > 0 && sortedSyndicates.length > 0) {
          const highestSyndicate = sortedSyndicates[0];
          syndicateShares[highestSyndicate] = (syndicateShares[highestSyndicate] ?? 0) + remainingShares;
        }
      }

      // Resolve proposal
      newState.swfYieldTokenProposals[proposalId] = {
        ...proposal,
        resolved: true,
      };

      // Mint token
      newState.swfYieldTokens[proposalId] = {
        id: proposalId,
        portfolioId,
        issuerFundId: fundId,
        totalShares,
        syndicateShares,
        pricePerShare,
        timestamp,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Yield Token Minted] Sovereign wealth fund ${fundId} minted ${totalShares} yield-sharing derivative shares for portfolio ${portfolioId} under token ID ${proposalId}.`
      );
    }
  }

  return newState;
}

export function reconcileSWFRiskPools(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfRiskPoolProposals: state.swfRiskPoolProposals ? { ...state.swfRiskPoolProposals } : {},
    swfRiskPools: state.swfRiskPools ? { ...state.swfRiskPools } : {},
    sovereignWealthFunds: state.sovereignWealthFunds ? { ...state.sovereignWealthFunds } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.swfRiskPoolProposals || {})) {
    const proposal = newState.swfRiskPoolProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { name, fundIds, contributions, timestamp } = proposal;

    // Check consensus: requires majority approval from each participating syndicate across all involved SWFs!
    let allSyndicatesApproved = true;
    const votes = proposal.votes || {};

    for (const fundId of fundIds) {
      const fund = newState.sovereignWealthFunds?.[fundId];
      if (!fund) {
        allSyndicatesApproved = false;
        break;
      }

      const participatingSyndicateIds = Object.keys(fund.syndicates);
      for (const syndicateId of participatingSyndicateIds) {
        const syndicate = newState.syndicates?.[syndicateId];
        if (!syndicate) {
          allSyndicatesApproved = false;
          break;
        }
        const members = syndicate.members;
        const yesVotes = Object.entries(votes)
          .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
          .map(([voterId]) => voterId);

        if (yesVotes.length <= members.length / 2) {
          allSyndicatesApproved = false;
          break;
        }
      }
      if (!allSyndicatesApproved) break;
    }

    if (allSyndicatesApproved) {
      // Validate that all funds have enough reserves
      let allFundsHaveReserves = true;
      for (const fundId of fundIds) {
        const contribution = contributions[fundId] ?? 0;
        const fund = newState.sovereignWealthFunds?.[fundId];
        if (!fund || fund.totalReserves < contribution) {
          allFundsHaveReserves = false;
          break;
        }
      }

      if (allFundsHaveReserves) {
        let totalPooledReserves = 0;

        // Deduct contributions from each SWF
        for (const fundId of fundIds) {
          const contribution = contributions[fundId] ?? 0;
          const fund = newState.sovereignWealthFunds?.[fundId];
          if (fund) {
            fund.totalReserves -= contribution;
            totalPooledReserves += contribution;
          }
        }

        // Resolve proposal
        newState.swfRiskPoolProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        // Create Risk Pool
        newState.swfRiskPools[proposalId] = {
          id: proposalId,
          name,
          fundIds,
          totalPooledReserves,
          fundContributions: { ...contributions },
          status: "Active" as const,
          timestamp,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Risk Pool Established] Established SWF multi-fund risk pool ${proposalId} with funds ${fundIds.join(", ")} holding a combined total of ${totalPooledReserves} gold.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Risk Pool Resolution Failed] SWFs have insufficient reserves to establish risk pool ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFYieldCDOs(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfYieldCDOProposals: state.swfYieldCDOProposals ? { ...state.swfYieldCDOProposals } : {},
    swfYieldCDOs: state.swfYieldCDOs ? { ...state.swfYieldCDOs } : {},
    swfYieldTokens: state.swfYieldTokens ? { ...state.swfYieldTokens } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.swfYieldCDOProposals || {})) {
    const proposal = newState.swfYieldCDOProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { proposerSyndicateId, assets, trancheYieldRates, trancheTotalShares, timestamp } = proposal;
    const proposerSyndicate = newState.syndicates?.[proposerSyndicateId];
    if (!proposerSyndicate) continue;

    // Check consensus: requires majority approval from members of the proposing syndicate!
    const members = proposerSyndicate.members;
    const votes = proposal.votes || {};
    const yesVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (yesVotes.length > members.length / 2) {
      // Validate that proposer syndicate has enough shares of each packed yield token!
      let allAssetsValid = true;
      for (const asset of assets) {
        const token = newState.swfYieldTokens?.[asset.swfYieldTokenId];
        const ownedShares = token?.syndicateShares?.[proposerSyndicateId] ?? 0;
        if (!token || ownedShares < asset.sharesPacked) {
          allAssetsValid = false;
          break;
        }
      }

      if (allAssetsValid) {
        // Deduct packed yield tokens from proposer syndicate's owned shares
        for (const asset of assets) {
          const token = newState.swfYieldTokens[asset.swfYieldTokenId];
          token.syndicateShares[proposerSyndicateId] = (token.syndicateShares[proposerSyndicateId] ?? 0) - asset.sharesPacked;
        }

        // Calculate total packaged value
        let totalValue = 0;
        for (const asset of assets) {
          totalValue += asset.value;
        }

        // Create SWF Yield CDO
        const S_shares = trancheTotalShares.senior;
        const M_shares = trancheTotalShares.mezzanine;
        const E_shares = trancheTotalShares.equity;

        const tranches: Record<"senior" | "mezzanine" | "equity", SWFYieldCDOTranche> = {
          senior: {
            trancheId: "senior",
            yieldRate: trancheYieldRates.senior,
            totalShares: S_shares,
            ownership: { [proposerSyndicateId]: S_shares },
            timestamp,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: trancheYieldRates.mezzanine,
            totalShares: M_shares,
            ownership: { [proposerSyndicateId]: M_shares },
            timestamp,
          },
          equity: {
            trancheId: "equity",
            yieldRate: trancheYieldRates.equity,
            totalShares: E_shares,
            ownership: { [proposerSyndicateId]: E_shares },
            timestamp,
          },
        };

        newState.swfYieldCDOs[proposalId] = {
          id: proposalId,
          creatorSyndicateId: proposerSyndicateId,
          assets: [...assets],
          totalValue,
          tranches,
          timestamp,
        };

        // Resolve proposal
        newState.swfYieldCDOProposals[proposalId] = {
          ...proposal,
          resolved: true,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Yield CDO Packaged] Proposer Syndicate ${proposerSyndicateId} successfully packaged ${assets.length} SWF yield derivative tokens into SWF Yield CDO ${proposalId} (Total Value: ${totalValue} gold).`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Yield CDO Packaging Failed] Proposer Syndicate ${proposerSyndicateId} has insufficient owned shares of packed yield tokens to resolve proposal ${proposalId}.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFLeverageTargets(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfLeverageTargetVotes: state.swfLeverageTargetVotes ? { ...state.swfLeverageTargetVotes } : {},
  };

  if (!newState.marginAccounts) return newState;

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = newState.swfLeverageTargetVotes?.[syndicateId] || {};

    const targetCounts: Record<number, {
      target: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const t = vote.target;
        if (!targetCounts[t]) {
          targetCounts[t] = { target: t, voters: new Set<string>(), timestamps: [] };
        }
        targetCounts[t].voters.add(voterId);
        targetCounts[t].timestamps.push(vote.timestamp);
      }
    }

    let approvedTarget: any = undefined;
    for (const info of Object.values(targetCounts)) {
      if (info.voters.size > totalMembers / 2) {
        approvedTarget = info;
        break;
      }
    }

    if (approvedTarget) {
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        swfLeverageTarget: approvedTarget.target,
        swfLeverageFactor: approvedTarget.target,
        timestamp: Math.max(...approvedTarget.timestamps, newState.step),
      };

      if (newState.swfLeverageTargetVotes) {
        delete newState.swfLeverageTargetVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Leverage Target] Syndicate ${syndicateId} adjusted SWF Leverage Target to ${approvedTarget.target} by consensus majority.`
      );
    }
  }

  return newState;
}

export function reconcileSWFFractionalReserveRatios(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfFractionalReserveRatioVotes: state.swfFractionalReserveRatioVotes ? { ...state.swfFractionalReserveRatioVotes } : {},
  };

  if (!newState.marginAccounts) return newState;

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = newState.swfFractionalReserveRatioVotes?.[syndicateId] || {};

    const ratioCounts: Record<number, {
      ratio: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const r = vote.ratio;
        if (!ratioCounts[r]) {
          ratioCounts[r] = { ratio: r, voters: new Set<string>(), timestamps: [] };
        }
        ratioCounts[r].voters.add(voterId);
        ratioCounts[r].timestamps.push(vote.timestamp);
      }
    }

    let approvedRatio: any = undefined;
    for (const info of Object.values(ratioCounts)) {
      if (info.voters.size > totalMembers / 2) {
        approvedRatio = info;
        break;
      }
    }

    if (approvedRatio) {
      const reserveHeld = Math.floor(marginAccount.collateral * (approvedRatio.ratio / 100));
      newState.marginAccounts[syndicateId] = {
        ...marginAccount,
        swfFractionalReserveRatio: approvedRatio.ratio,
        swfFractionalReserveHeld: reserveHeld,
        timestamp: Math.max(...approvedRatio.timestamps, newState.step),
      };

      if (newState.swfFractionalReserveRatioVotes) {
        delete newState.swfFractionalReserveRatioVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Fractional Reserve Ratio] Syndicate ${syndicateId} adjusted SWF Fractional Reserve Ratio to ${approvedRatio.ratio}% by consensus majority.`
      );
    }
  }

  return newState;
}

export function reconcileSWFLockedCollateral(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    lockedSWFCollateralVotes: state.lockedSWFCollateralVotes ? { ...state.lockedSWFCollateralVotes } : {},
    lockedLiquidityPositions: state.lockedLiquidityPositions ? { ...state.lockedLiquidityPositions } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
  };

  if (!newState.marginAccounts) return newState;

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.lockedSWFCollateralVotes?.[syndicateId] || {};

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

      const reserveRatio = marginAccount.swfFractionalReserveRatio ?? 10;
      const reserveAmount = Math.floor(marginAccount.collateral * (reserveRatio / 100));
      const maxRehypothecatable = Math.max(0, marginAccount.collateral - reserveAmount);

      let totalRehypothecated = 0;
      if (marginAccount.swfRebalancingEnabled) {
        totalRehypothecated = marginAccount.swfVaultAllocations?.[vaultId] ?? 0;
      } else if (marginAccount.swfRehypothecationAuthorized && marginAccount.swfRehypothecationVaultId === vaultId) {
        totalRehypothecated = Math.floor(marginAccount.collateral * ((marginAccount.swfRehypothecationPercentage ?? 0) / 100));
      }
      totalRehypothecated = Math.min(totalRehypothecated, maxRehypothecatable);

      const currentEpoch = Math.floor(newState.step / 5);
      const existingPositions = marginAccount.swfLockedPositions ?? [];
      const activeLocked = existingPositions
        .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed)
        .reduce((sum, p) => sum + p.amount, 0);

      const unlockedRehypothecated = totalRehypothecated - activeLocked;

      if (amount <= unlockedRehypothecated) {
        const startEpoch = currentEpoch;
        const endEpoch = startEpoch + durationEpochs;
        const positionId = `swf_lock_${syndicateId}_${vaultId}_${newState.step}`;

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

        const updatedPositions = [...existingPositions, newPosition];

        newState.marginAccounts[syndicateId] = {
          ...marginAccount,
          swfLockedPositions: updatedPositions,
          timestamp: newState.step,
        };

        if (!newState.lockedLiquidityPositions) newState.lockedLiquidityPositions = {};
        const globalPositions = newState.lockedLiquidityPositions[syndicateId] ?? [];
        newState.lockedLiquidityPositions[syndicateId] = [...globalPositions, newPosition];

        if (!newState.factionReservePools) newState.factionReservePools = {};
        if (newState.factionReservePools[factionId] === undefined) {
          newState.factionReservePools[factionId] = 10000;
        }

        if (newState.lockedSWFCollateralVotes) {
          delete newState.lockedSWFCollateralVotes[syndicateId];
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Locked Liquidity] Syndicate ${syndicateId} locked ${amount} gold of SWF rehypothecated collateral in vault ${vaultId} for ${durationEpochs} epochs with faction ${factionId}.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Locked Liquidity Failed] Syndicate ${syndicateId} failed to lock ${amount} gold in SWF vault ${vaultId} (Insufficient unlocked SWF rehypothecated collateral: ${unlockedRehypothecated} < ${amount}).`
        );
        if (newState.lockedSWFCollateralVotes) {
          delete newState.lockedSWFCollateralVotes[syndicateId];
        }
      }
    }
  }

  return newState;
}

export function reconcileSWFClaimLiquidityRewards(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    claimSWFLiquidityRewardsVotes: state.claimSWFLiquidityRewardsVotes ? { ...state.claimSWFLiquidityRewardsVotes } : {},
    lockedLiquidityPositions: state.lockedLiquidityPositions ? { ...state.lockedLiquidityPositions } : {},
    factionReservePools: state.factionReservePools ? { ...state.factionReservePools } : {},
    factionRep: state.factionRep ? { ...state.factionRep } : {},
    maliciousActors: state.maliciousActors ? { ...state.maliciousActors } : {},
    slashingRates: state.slashingRates ? { ...state.slashingRates } : {},
  };

  if (!newState.marginAccounts) return newState;

  for (const syndicateId of Object.keys(newState.marginAccounts)) {
    const marginAccount = newState.marginAccounts[syndicateId];
    if (!marginAccount) continue;

    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const authVotes = newState.claimSWFLiquidityRewardsVotes?.[syndicateId] || {};

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
      const positions = marginAccount.swfLockedPositions || [];
      const posIndex = positions.findIndex(p => p.id === positionId);
      const position = posIndex !== -1 ? positions[posIndex] : undefined;

      const currentEpoch = Math.floor(newState.step / 5);

      if (position && !position.claimed && currentEpoch >= position.endEpoch) {
        const duration = position.durationEpochs;
        const amount = position.amount;
        const factionId = position.factionId;

        const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[position.vaultId];
        const rewardRate = sponsorPolicy ? sponsorPolicy.rewardRate : 0.05;

        const standingRep = newState.factionRep?.[factionId] ?? 0;
        const standingMultiplier = 1.0 + Math.max(0, standingRep * 0.01);
        const leverageMultiplier = marginAccount.swfLeverageFactor ?? 1.0;

        const rewardBase = Math.floor(amount * rewardRate * duration * leverageMultiplier * standingMultiplier);

        let finalRewardBase = rewardBase;
        const isMalicious = !!(
          newState.maliciousActors?.[syndicateId] ||
          (syndicate.members && syndicate.members.some(memberId => newState.maliciousActors?.[memberId]))
        );
        if (isMalicious) {
          const slashRate = newState.slashingRates?.[syndicateId] ?? 0.5;
          finalRewardBase = Math.floor(rewardBase * (1 - slashRate));
        }

        const factionReserves = newState.factionReservePools?.[factionId] ?? 10000;
        const rewardPaid = Math.min(factionReserves, finalRewardBase);

        if (!newState.factionReservePools) newState.factionReservePools = {};
        newState.factionReservePools[factionId] = factionReserves - rewardPaid;

        syndicate.warChest = (syndicate.warChest ?? 0) + rewardPaid;

        const reputationBonus = Math.round(5 * duration * leverageMultiplier);
        if (!newState.factionRep) newState.factionRep = {};
        newState.factionRep[factionId] = (newState.factionRep[factionId] ?? 0) + reputationBonus;

        const updatedPosition = {
          ...position,
          claimed: true,
          timestamp: newState.step,
        };

        positions[posIndex] = updatedPosition;
        marginAccount.swfLockedPositions = [...positions];

        if (newState.lockedLiquidityPositions?.[syndicateId]) {
          const gPosIndex = newState.lockedLiquidityPositions[syndicateId].findIndex(p => p.id === positionId);
          if (gPosIndex !== -1) {
            newState.lockedLiquidityPositions[syndicateId][gPosIndex] = updatedPosition;
          }
        }

        if (newState.claimSWFLiquidityRewardsVotes) {
          delete newState.claimSWFLiquidityRewardsVotes[syndicateId];
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Claim Liquidity Rewards] Syndicate ${syndicateId} claimed SWF rewards for position ${positionId}. Earned ${rewardPaid} gold and +${reputationBonus} reputation with ${factionId}.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        if (!position) {
          newState.journal.push(`[SWF Claim Liquidity Rewards Failed] Position ${positionId} not found.`);
        } else if (position.claimed) {
          newState.journal.push(`[SWF Claim Liquidity Rewards Failed] Position ${positionId} already claimed.`);
        } else {
          newState.journal.push(`[SWF Claim Liquidity Rewards Failed] Position ${positionId} has not matured yet (Current epoch: ${currentEpoch} < End epoch: ${position.endEpoch}).`);
        }
        if (newState.claimSWFLiquidityRewardsVotes) {
          delete newState.claimSWFLiquidityRewardsVotes[syndicateId];
        }
      }
    }
  }

  return newState;
}

export function reconcileSWFYieldArbitragePolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfYieldArbitragePolicyVotes: state.swfYieldArbitragePolicyVotes ? { ...state.swfYieldArbitragePolicyVotes } : {},
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
    const authVotes = newState.swfYieldArbitragePolicyVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      enabled: boolean;
      yieldThresholds: Record<string, number>;
      autoWithdrawalEnabled: boolean;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const sortedThresholds = Object.entries(vote.yieldThresholds || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => `${k}:${v}`)
          .join(",");
        const key = `${vote.enabled}::${sortedThresholds}::${vote.autoWithdrawalEnabled}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            enabled: vote.enabled,
            yieldThresholds: vote.yieldThresholds,
            autoWithdrawalEnabled: vote.autoWithdrawalEnabled,
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
        swfArbitrageEnabled: fullyApprovedCombination.enabled,
        swfYieldThresholds: fullyApprovedCombination.yieldThresholds,
        swfAutoWithdrawalEnabled: fullyApprovedCombination.autoWithdrawalEnabled,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfYieldArbitragePolicyVotes) {
        delete newState.swfYieldArbitragePolicyVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Yield Arbitrage Policy] SWF Yield Arbitrage policy for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}, Auto-Withdrawal: ${fullyApprovedCombination.autoWithdrawalEnabled}, Yield Thresholds: ${JSON.stringify(fullyApprovedCombination.yieldThresholds)}).`
      );
    }
  }

  return newState;
}

export function reconcileSWFSovereignBondArbitragePolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfSovereignBondArbitragePolicyVotes: state.swfSovereignBondArbitragePolicyVotes ? { ...state.swfSovereignBondArbitragePolicyVotes } : {},
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
    const authVotes = newState.swfSovereignBondArbitragePolicyVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      enabled: boolean;
      targetPoolIds: string[];
      maxCapitalAllocated: number;
      minYieldSpread: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const sortedTargetPools = [...(vote.targetPoolIds || [])].sort().join(",");
        const key = `${vote.enabled}::${sortedTargetPools}::${vote.maxCapitalAllocated}::${vote.minYieldSpread}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            enabled: vote.enabled,
            targetPoolIds: vote.targetPoolIds,
            maxCapitalAllocated: vote.maxCapitalAllocated,
            minYieldSpread: vote.minYieldSpread,
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
        swfBondArbitrageEnabled: fullyApprovedCombination.enabled,
        swfBondArbitrageTargetPools: fullyApprovedCombination.targetPoolIds,
        swfBondArbitrageMaxCapital: fullyApprovedCombination.maxCapitalAllocated,
        swfBondArbitrageMinYieldSpread: fullyApprovedCombination.minYieldSpread,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfSovereignBondArbitragePolicyVotes) {
        delete newState.swfSovereignBondArbitragePolicyVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Sovereign Bond Arbitrage Policy] SWF Sovereign Bond Arbitrage policy for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}, Target Pools: ${JSON.stringify(fullyApprovedCombination.targetPoolIds)}, Max Capital: ${fullyApprovedCombination.maxCapitalAllocated}, Min Spread: ${fullyApprovedCombination.minYieldSpread}).`
      );
    }
  }
  return newState;
}

export function reconcileSWFStakingPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    swfStakingPolicyVotes: state.swfStakingPolicyVotes ? { ...state.swfStakingPolicyVotes } : {},
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
    const authVotes = newState.swfStakingPolicyVotes?.[syndicateId] || {};

    const combinationCounts: Record<string, {
      enabled: boolean;
      stakedFactions: Record<string, number>;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(authVotes)) {
      if (syndicate.members.includes(voterId)) {
        const sortedFactions = Object.entries(vote.stakedFactions || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => `${k}:${v}`)
          .join(",");
        const key = `${vote.enabled}::${sortedFactions}`;

        if (!combinationCounts[key]) {
          combinationCounts[key] = {
            enabled: vote.enabled,
            stakedFactions: vote.stakedFactions,
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
        swfStakingEnabled: fullyApprovedCombination.enabled,
        swfStakingTargets: fullyApprovedCombination.stakedFactions,
        timestamp: Math.max(...fullyApprovedCombination.timestamps, newState.step),
      };

      if (newState.swfStakingPolicyVotes) {
        delete newState.swfStakingPolicyVotes[syndicateId];
      }

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Staking Policy] SWF Staking policy for Syndicate ${syndicateId} set by consensus majority (Enabled: ${fullyApprovedCombination.enabled}, Staked Factions Targets: ${JSON.stringify(fullyApprovedCombination.stakedFactions)}).`
      );
    }
  }

  return newState;
}

export function getBondPricePerShare(state: GameState, bondId: string): number {
  let latestListing: any = null;
  for (const listing of Object.values(state.secondaryBondListings || {})) {
    if (listing.bondId === bondId && listing.status === "Completed") {
      if (!latestListing || listing.timestamp > latestListing.timestamp) {
        latestListing = listing;
      }
    }
  }
  if (latestListing) {
    const bidsList = Object.values(latestListing.bids || {});
    const finalPrice = bidsList.length > 0 
      ? bidsList.reduce((max: number, b: any) => Math.max(max, b.bidAmount), latestListing.askPrice) 
      : latestListing.askPrice;
    return finalPrice / latestListing.amount;
  }
  return 1.0;
}

export function getSyndicateAvailableBondShares(state: GameState, bondId: string, syndicateId: string): number {
  const bond = state.cooperativeSovereigntyBondProposals?.[bondId];
  if (!bond || bond.status !== "Active") return 0;

  const totalContribution = bond.contributions[syndicateId] || 0;

  // Subtract amount listed in Open secondary listings
  let totalActiveListed = 0;
  for (const listing of Object.values(state.secondaryBondListings || {})) {
    if (listing.bondId === bondId && listing.sellerSyndicateId === syndicateId && listing.status === "Open") {
      totalActiveListed += listing.amount;
    }
  }

  // Subtract amount lent individually in Active or ShortSold borrow positions
  let totalLent = 0;
  for (const pos of Object.values(state.sovereignBondBorrowPositions || {})) {
    if (pos.bondId === bondId && pos.lenderSyndicateId === syndicateId && (pos.status === "Active" || pos.status === "ShortSold")) {
      totalLent += pos.amount;
    }
  }

  // Subtract amount deposited in all lending pools for this bond
  let totalDepositedInPools = 0;
  for (const pool of Object.values(state.sovereignBondLendingPools || {})) {
    if (pool.bondId === bondId) {
      totalDepositedInPools += pool.deposits[syndicateId] || 0;
    }
  }

  return Math.max(0, totalContribution - totalActiveListed - totalLent - totalDepositedInPools);
}

export function getBondCurrentYield(state: GameState, bondId: string): number {
  if (state.sovereignBondLendingPools) {
    for (const pool of Object.values(state.sovereignBondLendingPools)) {
      if (pool.bondId === bondId) {
        return pool.borrowFeeRate;
      }
    }
  }
  const coopBond = state.cooperativeSovereigntyBondProposals?.[bondId];
  if (coopBond) {
    return coopBond.interestRate;
  }
  const debtBond = state.sovereignDebtProposals?.[bondId];
  if (debtBond) {
    return debtBond.interestRate ?? 5;
  }
  return 5;
}

export function reconcileSovereignBondFuturesPositions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignBondFuturesPositions: state.sovereignBondFuturesPositions ? { ...state.sovereignBondFuturesPositions } : {},
    openSovereignBondFuturesVotes: state.openSovereignBondFuturesVotes ? { ...state.openSovereignBondFuturesVotes } : {},
    closeSovereignBondFuturesVotes: state.closeSovereignBondFuturesVotes ? { ...state.closeSovereignBondFuturesVotes } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
  };

  // Reconcile OPEN votes
  for (const syndicateId of Object.keys(newState.openSovereignBondFuturesVotes || {})) {
    const votes = newState.openSovereignBondFuturesVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      bondId: string;
      side: "long" | "short";
      size: number;
      leverage: number;
      marginCollateral: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.bondId}::${vote.side}::${vote.size}::${vote.leverage}::${vote.marginCollateral}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            bondId: vote.bondId,
            side: vote.side,
            size: vote.size,
            leverage: vote.leverage,
            marginCollateral: vote.marginCollateral,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        // Consensus achieved to open position!
        // Validate margin account exists and has enough collateral
        const marginAccount = newState.marginAccounts?.[syndicateId];
        if (marginAccount && marginAccount.collateral >= group.marginCollateral) {
          // Deduct from margin account
          marginAccount.collateral -= group.marginCollateral;
          marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

          // Find current yield
          const currentYield = getBondCurrentYield(newState, group.bondId);

          // Create position
          const id = `fut_${Object.keys(newState.sovereignBondFuturesPositions || {}).length + 1}`;
          newState.sovereignBondFuturesPositions![id] = {
            id,
            syndicateId,
            bondId: group.bondId,
            side: group.side,
            entryPrice: currentYield,
            size: group.size,
            leverage: group.leverage,
            marginCollateral: group.marginCollateral,
            timestamp: Math.max(...group.timestamps, newState.step),
            active: true,
          };

          // Clean up votes
          if (newState.openSovereignBondFuturesVotes) {
            delete newState.openSovereignBondFuturesVotes[syndicateId];
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Bond Futures Position Opened] Syndicate ${syndicateId} opened a leveraged ${group.side} futures position on bond ${group.bondId} with size ${group.size}, leverage ${group.leverage}x, and collateral of ${group.marginCollateral} gold at entry yield ${currentYield.toFixed(2)}%.`
          );
        }
        break; // Process one open per tick for this syndicate
      }
    }
  }

  // Reconcile CLOSE votes
  for (const syndicateId of Object.keys(newState.closeSovereignBondFuturesVotes || {})) {
    const votes = newState.closeSovereignBondFuturesVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      positionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.positionId;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            positionId: vote.positionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const position = newState.sovereignBondFuturesPositions?.[group.positionId];
        if (position && position.active && position.syndicateId === syndicateId) {
          // Final mark-to-market
          const currentYield = getBondCurrentYield(newState, position.bondId);
          const diff = currentYield - position.entryPrice;
          const profit = Math.round((position.side === "long" ? 1 : -1) * diff * position.size * position.leverage);

          const marginAccount = newState.marginAccounts?.[syndicateId];
          if (marginAccount) {
            // Return remaining margin collateral + final MTM profit
            marginAccount.collateral = Math.max(0, marginAccount.collateral + position.marginCollateral + profit);
            marginAccount.timestamp = Math.max(...group.timestamps, newState.step);
          }

          position.active = false;
          position.entryPrice = currentYield;
          position.timestamp = Math.max(...group.timestamps, newState.step);

          // Clean up votes
          if (newState.closeSovereignBondFuturesVotes) {
            delete newState.closeSovereignBondFuturesVotes[syndicateId];
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Bond Futures Position Closed] Syndicate ${syndicateId} closed futures position ${group.positionId} on bond ${position.bondId} at settlement yield ${currentYield.toFixed(2)}% (Final settlement profit/loss: ${profit} gold).`
          );
        }
        break; // Process one close per tick for this syndicate
      }
    }
  }

  return newState;
}

export function reconcileMarginLiquidationInsurancePolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    marginLiquidationInsurancePolicies: state.marginLiquidationInsurancePolicies ? { ...state.marginLiquidationInsurancePolicies } : {},
    marginLiquidationInsuranceVotes: state.marginLiquidationInsuranceVotes ? { ...state.marginLiquidationInsuranceVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.marginLiquidationInsuranceVotes || {})) {
    const votes = newState.marginLiquidationInsuranceVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      allocatedGold: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.allocatedGold}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            allocatedGold: vote.allocatedGold,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const currentPolicy = newState.marginLiquidationInsurancePolicies?.[syndicateId];
        const currentAllocated = currentPolicy?.allocatedGold ?? 0;
        const diff = group.allocatedGold - currentAllocated;

        if (diff > 0) {
          // Need to allocate more from warChest
          if ((syndicate.warChest ?? 0) >= diff) {
            syndicate.warChest = (syndicate.warChest ?? 0) - diff;
            newState.marginLiquidationInsurancePolicies![syndicateId] = {
              syndicateId,
              allocatedGold: group.allocatedGold,
              timestamp: Math.max(...group.timestamps, newState.step),
            };

            if (newState.marginLiquidationInsuranceVotes) {
              delete newState.marginLiquidationInsuranceVotes[syndicateId];
            }

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Margin Liquidation Insurance Policy Updated] Syndicate ${syndicateId} allocated additional ${diff} gold (Total: ${group.allocatedGold} gold) to margin liquidation insurance.`
            );
          }
        } else if (diff < 0) {
          // Return difference back to warChest
          const refund = -diff;
          syndicate.warChest = (syndicate.warChest ?? 0) + refund;
          newState.marginLiquidationInsurancePolicies![syndicateId] = {
            syndicateId,
            allocatedGold: group.allocatedGold,
            timestamp: Math.max(...group.timestamps, newState.step),
          };

          if (newState.marginLiquidationInsuranceVotes) {
            delete newState.marginLiquidationInsuranceVotes[syndicateId];
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Margin Liquidation Insurance Policy Updated] Syndicate ${syndicateId} refunded ${refund} gold (Total: ${group.allocatedGold} gold) from margin liquidation insurance back to war chest.`
          );
        } else {
          // Same value, just accept vote and clean up
          if (newState.marginLiquidationInsuranceVotes) {
            delete newState.marginLiquidationInsuranceVotes[syndicateId];
          }
        }
        break;
      }
    }
  }

  return newState;
}

export function getBondVolatility(state: GameState, bondId: string): number {
  if (state.yieldVolatilityIndexes?.[bondId]) {
    return state.yieldVolatilityIndexes[bondId].volatility;
  }
  return 20.0;
}

export function calculateOptionPremium(
  state: GameState,
  bondId: string,
  optionType: "call" | "put",
  strikePrice: number,
  expirationEpoch: number
): number {
  const currentYield = getBondCurrentYield(state, bondId);
  const volatility = getBondVolatility(state, bondId);
  const intrinsic = optionType === "call"
    ? Math.max(0, currentYield - strikePrice)
    : Math.max(0, strikePrice - currentYield);
  const remainingTime = Math.max(0, expirationEpoch - state.step);
  const timeValue = (volatility / 100) * Math.sqrt(remainingTime);
  return Math.max(0.5, intrinsic + timeValue);
}

export function reconcileSovereignBondOptions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignBondOptions: state.sovereignBondOptions ? { ...state.sovereignBondOptions } : {},
    buySovereignBondOptionVotes: state.buySovereignBondOptionVotes ? { ...state.buySovereignBondOptionVotes } : {},
    sellSovereignBondOptionVotes: state.sellSovereignBondOptionVotes ? { ...state.sellSovereignBondOptionVotes } : {},
    exerciseSovereignBondOptionVotes: state.exerciseSovereignBondOptionVotes ? { ...state.exerciseSovereignBondOptionVotes } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
  };

  // Reconcile BUY Option votes
  for (const syndicateId of Object.keys(newState.buySovereignBondOptionVotes || {})) {
    const votes = newState.buySovereignBondOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      bondId: string;
      optionType: "call" | "put";
      strikePrice: number;
      premium: number;
      size: number;
      expirationEpoch: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.bondId}::${vote.optionType}::${vote.strikePrice}::${vote.premium}::${vote.size}::${vote.expirationEpoch}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            bondId: vote.bondId,
            optionType: vote.optionType,
            strikePrice: vote.strikePrice,
            premium: vote.premium,
            size: vote.size,
            expirationEpoch: vote.expirationEpoch,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const marginAccount = newState.marginAccounts?.[syndicateId];
        const cost = Math.round(group.premium * group.size);
        if (marginAccount && marginAccount.collateral >= cost) {
          // Deduct premium cost
          marginAccount.collateral -= cost;
          marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

          const id = `opt_${Object.keys(newState.sovereignBondOptions || {}).length + 1}`;
          newState.sovereignBondOptions![id] = {
            id,
            syndicateId,
            bondId: group.bondId,
            optionType: group.optionType,
            strikePrice: group.strikePrice,
            premium: group.premium,
            size: group.size,
            expirationEpoch: group.expirationEpoch,
            active: true,
            timestamp: Math.max(...group.timestamps, newState.step),
          };

          if (newState.buySovereignBondOptionVotes) {
            delete newState.buySovereignBondOptionVotes[syndicateId];
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Bond Option Purchased] Syndicate ${syndicateId} purchased ${group.size}x ${group.optionType} option on bond ${group.bondId} with strike ${group.strikePrice}% at premium ${group.premium} gold/unit (Total Cost: ${cost} gold, Expires Epoch: ${group.expirationEpoch}).`
          );
        }
        break;
      }
    }
  }

  // Reconcile SELL/CLOSE Option votes
  for (const syndicateId of Object.keys(newState.sellSovereignBondOptionVotes || {})) {
    const votes = newState.sellSovereignBondOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      optionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.optionId;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            optionId: vote.optionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const option = newState.sovereignBondOptions?.[group.optionId];
        if (option && option.active && option.syndicateId === syndicateId) {
          const marginAccount = newState.marginAccounts?.[syndicateId];
          if (marginAccount) {
            const currentPremium = calculateOptionPremium(newState, option.bondId, option.optionType, option.strikePrice, option.expirationEpoch);
            const payout = Math.round(currentPremium * option.size);

            marginAccount.collateral += payout;
            marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

            option.active = false;
            option.timestamp = Math.max(...group.timestamps, newState.step);

            if (newState.sellSovereignBondOptionVotes) {
              delete newState.sellSovereignBondOptionVotes[syndicateId];
            }

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Sovereign Bond Option Closed] Syndicate ${syndicateId} sold option ${option.id} back to market at current premium ${currentPremium.toFixed(2)} gold/unit (Payout: ${payout} gold).`
            );
          }
        }
        break;
      }
    }
  }

  // Reconcile EXERCISE Option votes
  for (const syndicateId of Object.keys(newState.exerciseSovereignBondOptionVotes || {})) {
    const votes = newState.exerciseSovereignBondOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      optionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.optionId;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            optionId: vote.optionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const option = newState.sovereignBondOptions?.[group.optionId];
        if (option && option.active && option.syndicateId === syndicateId) {
          const marginAccount = newState.marginAccounts?.[syndicateId];
          if (marginAccount) {
            const currentYield = getBondCurrentYield(newState, option.bondId);
            const intrinsic = option.optionType === "call"
              ? Math.max(0, currentYield - option.strikePrice)
              : Math.max(0, option.strikePrice - currentYield);
            const payout = Math.round(intrinsic * option.size * 1000);

            marginAccount.collateral += payout;
            marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

            option.active = false;
            option.timestamp = Math.max(...group.timestamps, newState.step);

            if (newState.exerciseSovereignBondOptionVotes) {
              delete newState.exerciseSovereignBondOptionVotes[syndicateId];
            }

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Sovereign Bond Option Exercised] Syndicate ${syndicateId} exercised option ${option.id} at yield ${currentYield.toFixed(2)}% (Strike: ${option.strikePrice}%, Payoff: ${payout} gold).`
            );
          }
        }
        break;
      }
    }
  }

  return newState;
}

export function reconcileSovereignBondVolatilityPositions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    sovereignBondVolatilityPositions: state.sovereignBondVolatilityPositions ? { ...state.sovereignBondVolatilityPositions } : {},
    openSovereignBondVolatilityVotes: state.openSovereignBondVolatilityVotes ? { ...state.openSovereignBondVolatilityVotes } : {},
    closeSovereignBondVolatilityVotes: state.closeSovereignBondVolatilityVotes ? { ...state.closeSovereignBondVolatilityVotes } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
  };

  // Reconcile OPEN Volatility votes
  for (const syndicateId of Object.keys(newState.openSovereignBondVolatilityVotes || {})) {
    const votes = newState.openSovereignBondVolatilityVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      bondId: string;
      side: "long" | "short";
      size: number;
      marginCollateral: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.bondId}::${vote.side}::${vote.size}::${vote.marginCollateral}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            bondId: vote.bondId,
            side: vote.side,
            size: vote.size,
            marginCollateral: vote.marginCollateral,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const marginAccount = newState.marginAccounts?.[syndicateId];
        if (marginAccount && marginAccount.collateral >= group.marginCollateral) {
          marginAccount.collateral -= group.marginCollateral;
          marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

          const entryVix = getBondVolatility(newState, group.bondId);
          const id = `vol_${Object.keys(newState.sovereignBondVolatilityPositions || {}).length + 1}`;
          newState.sovereignBondVolatilityPositions![id] = {
            id,
            syndicateId,
            bondId: group.bondId,
            side: group.side,
            entryVolatility: entryVix,
            size: group.size,
            marginCollateral: group.marginCollateral,
            active: true,
            timestamp: Math.max(...group.timestamps, newState.step),
          };

          if (newState.openSovereignBondVolatilityVotes) {
            delete newState.openSovereignBondVolatilityVotes[syndicateId];
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Bond Volatility Position Opened] Syndicate ${syndicateId} opened a volatility ${group.side} position on bond ${group.bondId} with size ${group.size} and collateral ${group.marginCollateral} gold at entry volatility ${entryVix.toFixed(2)}%.`
          );
        }
        break;
      }
    }
  }

  // Reconcile CLOSE Volatility votes
  for (const syndicateId of Object.keys(newState.closeSovereignBondVolatilityVotes || {})) {
    const votes = newState.closeSovereignBondVolatilityVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      positionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.positionId;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            positionId: vote.positionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const position = newState.sovereignBondVolatilityPositions?.[group.positionId];
        if (position && position.active && position.syndicateId === syndicateId) {
          const marginAccount = newState.marginAccounts?.[syndicateId];
          if (marginAccount) {
            const currentVix = getBondVolatility(newState, position.bondId);
            const diff = currentVix - position.entryVolatility;
            const profit = Math.round((position.side === "long" ? 1 : -1) * diff * position.size * 10);
            
            marginAccount.collateral = Math.max(0, marginAccount.collateral + position.marginCollateral + profit);
            marginAccount.timestamp = Math.max(...group.timestamps, newState.step);

            position.active = false;
            position.entryVolatility = currentVix;
            position.timestamp = Math.max(...group.timestamps, newState.step);

            if (newState.closeSovereignBondVolatilityVotes) {
              delete newState.closeSovereignBondVolatilityVotes[syndicateId];
            }

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Sovereign Bond Volatility Position Closed] Syndicate ${syndicateId} closed volatility position ${position.id}. End Volatility: ${currentVix.toFixed(2)}%, profit/loss: ${profit} gold.`
            );
          }
        }
        break;
      }
    }
  }

  return newState;
}

export function reconcileVolatilityHedgedReserveBuffers(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    volatilityHedgedReserveBuffers: state.volatilityHedgedReserveBuffers ? { ...state.volatilityHedgedReserveBuffers } : {},
    configureVolatilityHedgedBufferVotes: state.configureVolatilityHedgedBufferVotes ? { ...state.configureVolatilityHedgedBufferVotes } : {},
  };

  for (const syndicateId of Object.keys(newState.configureVolatilityHedgedBufferVotes || {})) {
    const votes = newState.configureVolatilityHedgedBufferVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      reserveTarget: number;
      hedgedRatio: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.reserveTarget}::${vote.hedgedRatio}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            reserveTarget: vote.reserveTarget,
            hedgedRatio: vote.hedgedRatio,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        newState.volatilityHedgedReserveBuffers![syndicateId] = {
          syndicateId,
          reserveTarget: group.reserveTarget,
          hedgedRatio: group.hedgedRatio,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        if (newState.configureVolatilityHedgedBufferVotes) {
          delete newState.configureVolatilityHedgedBufferVotes[syndicateId];
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Volatility Hedged Buffer Configured] Syndicate ${syndicateId} configured reserve target of ${group.reserveTarget} gold with a hedged ratio of ${group.hedgedRatio}%.`
        );
        break;
      }
    }
  }

  return newState;
}

export function reconcileSWFYieldCDOTrancheReinsurance(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfYieldCDOTrancheReinsuranceProposals: state.swfYieldCDOTrancheReinsuranceProposals ? { ...state.swfYieldCDOTrancheReinsuranceProposals } : {},
    swfYieldCDOTrancheReinsurancePolicies: state.swfYieldCDOTrancheReinsurancePolicies ? { ...state.swfYieldCDOTrancheReinsurancePolicies } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.swfYieldCDOTrancheReinsuranceProposals || {})) {
    const proposal = newState.swfYieldCDOTrancheReinsuranceProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { syndicateId, swfYieldCdoId, trancheId, coverageAmount, premiumRate, timestamp } = proposal;
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    const votes = proposal.votes || {};
    const yesVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (yesVotes.length > members.length / 2) {
      // Majority consensus reached! Purchase the reinsurance policy.
      newState.swfYieldCDOTrancheReinsurancePolicies![proposalId] = {
        id: proposalId,
        syndicateId,
        swfYieldCdoId,
        trancheId,
        coverageAmount,
        premiumRate,
        timestamp,
        active: true,
      };

      newState.swfYieldCDOTrancheReinsuranceProposals![proposalId] = {
        ...proposal,
        resolved: true,
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Reinsurance Purchased] Syndicate ${syndicateId} successfully purchased SWF CDO Reinsurance policy ${proposalId} protecting tranche ${trancheId} holdings of CDO ${swfYieldCdoId} (Coverage: ${coverageAmount}).`
      );
    }
  }

  return newState;
}

export function reconcileSWFYieldCDORiskRatingModels(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfYieldCDORiskRatingModelProposals: state.swfYieldCDORiskRatingModelProposals ? { ...state.swfYieldCDORiskRatingModelProposals } : {},
    swfYieldCDORiskRatingModels: state.swfYieldCDORiskRatingModels ? { ...state.swfYieldCDORiskRatingModels } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const proposalId of Object.keys(newState.swfYieldCDORiskRatingModelProposals || {})) {
    const proposal = newState.swfYieldCDORiskRatingModelProposals?.[proposalId];
    if (!proposal || proposal.resolved) continue;

    const { proposerSyndicateId, defaultCorrelationWeight, collateralRatioWeight, baseRiskMultiplier, timestamp } = proposal;
    const syndicate = newState.syndicates?.[proposerSyndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    const votes = proposal.votes || {};
    const yesVotes = Object.entries(votes)
      .filter(([voterId, voteObj]) => members.includes(voterId) && voteObj.vote === true)
      .map(([voterId]) => voterId);

    if (yesVotes.length > members.length / 2) {
      // Majority consensus reached! Configure the risk rating model for this syndicate.
      newState.swfYieldCDORiskRatingModels![proposerSyndicateId] = {
        id: proposerSyndicateId,
        defaultCorrelationWeight,
        collateralRatioWeight,
        baseRiskMultiplier,
        timestamp,
      };

      newState.swfYieldCDORiskRatingModelProposals![proposalId] = {
        ...proposal,
        resolved: true,
      };

      newState.swfYieldCDORiskRatingModels = { ...newState.swfYieldCDORiskRatingModels };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[SWF Risk Model Configured] Syndicate ${proposerSyndicateId} successfully configured risk rating model (Correlation Weight: ${defaultCorrelationWeight}, Collateral Weight: ${collateralRatioWeight}, Multiplier: ${baseRiskMultiplier}).`
      );
      
      // Recalculate dynamic risk ratings
      return recalculateSWFYieldCDORiskRatings(newState);
    }
  }

  return newState;
}

export function recalculateSWFYieldCDORiskRatings(state: GameState): GameState {
  const newState = {
    ...state,
    swfYieldCDOTrancheRiskRatings: state.swfYieldCDOTrancheRiskRatings ? { ...state.swfYieldCDOTrancheRiskRatings } : {},
  };

  if (!newState.swfYieldCDOs || Object.keys(newState.swfYieldCDOs).length === 0) {
    return newState;
  }

  const defaultModel = {
    defaultCorrelationWeight: 1.0,
    collateralRatioWeight: 1.0,
    baseRiskMultiplier: 1.0,
  };

  for (const [cdoId, cdo] of Object.entries(newState.swfYieldCDOs)) {
    // Get the model for the CDO's creator syndicate, or default
    const model = newState.swfYieldCDORiskRatingModels?.[cdo.creatorSyndicateId] ?? defaultModel;

    const tranchesList: ("senior" | "mezzanine" | "equity")[] = ["senior", "mezzanine", "equity"];
    for (const trancheId of tranchesList) {
      const tranche = cdo.tranches[trancheId];
      if (!tranche) continue;

      // 1. Structural Collateralization Ratio
      let collateralRatio = 0;
      if (trancheId === "senior") {
        collateralRatio = cdo.totalValue / Math.max(1, tranche.totalShares);
      } else if (trancheId === "mezzanine") {
        collateralRatio = Math.max(0, cdo.totalValue - (cdo.tranches.senior?.totalShares ?? 0)) / Math.max(1, tranche.totalShares);
      } else {
        collateralRatio = Math.max(0, cdo.totalValue - (cdo.tranches.senior?.totalShares ?? 0) - (cdo.tranches.mezzanine?.totalShares ?? 0)) / Math.max(1, tranche.totalShares);
      }

      // 2. Historical Default Correlation
      const cdoLogs = (newState.swfCDODefaultCorrelationLogs || []).filter(l => l.cdoId === cdoId && l.trancheId === trancheId);
      const totalLogs = cdoLogs.length;
      const defaultedLogs = cdoLogs.filter(l => l.defaulted === true).length;
      const defaultCorrelation = totalLogs > 0 ? defaultedLogs / totalLogs : 0.0;

      // 3. Combined Rating Score
      const ratingScore = (collateralRatio * model.collateralRatioWeight) - (defaultCorrelation * model.defaultCorrelationWeight * model.baseRiskMultiplier);

      // Map rating score to standard AAA-D ratings
      let riskRating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "CC" | "C" | "D" = "D";
      if (tranche.totalShares <= 0) {
        riskRating = "D";
      } else if (ratingScore >= 2.0) {
        riskRating = "AAA";
      } else if (ratingScore >= 1.5) {
        riskRating = "AA";
      } else if (ratingScore >= 1.2) {
        riskRating = "A";
      } else if (ratingScore >= 1.0) {
        riskRating = "BBB";
      } else if (ratingScore >= 0.8) {
        riskRating = "BB";
      } else if (ratingScore >= 0.5) {
        riskRating = "B";
      } else if (ratingScore >= 0.3) {
        riskRating = "CCC";
      } else if (ratingScore >= 0.1) {
        riskRating = "CC";
      } else if (ratingScore > 0.0) {
        riskRating = "C";
      } else {
        riskRating = "D";
      }

      const ratingId = `${cdoId}_${trancheId}`;
      newState.swfYieldCDOTrancheRiskRatings[ratingId] = {
        id: ratingId,
        swfYieldCdoId: cdoId,
        trancheId,
        riskRating,
        collateralizationRatio: collateralRatio,
        defaultCorrelation,
        timestamp: newState.step,
      };
    }
  }

  return newState;
}

export function reconcileSWFYieldCDOTrancheReinsuranceListings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    listSWFYieldCDOTrancheReinsuranceVotes: state.listSWFYieldCDOTrancheReinsuranceVotes ? { ...state.listSWFYieldCDOTrancheReinsuranceVotes } : {},
    swfYieldCDOTrancheReinsuranceListings: state.swfYieldCDOTrancheReinsuranceListings ? { ...state.swfYieldCDOTrancheReinsuranceListings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.listSWFYieldCDOTrancheReinsuranceVotes || {})) {
    const votes = newState.listSWFYieldCDOTrancheReinsuranceVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      // Find the vote parameter details from any of the votes (they should be identical for a given listingId)
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { policyId, askPrice, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId, voteObj]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        // Majority reached! Open the listing.
        newState.swfYieldCDOTrancheReinsuranceListings![listingId] = {
          id: listingId,
          policyId,
          sellerSyndicateId: syndicateId,
          askPrice,
          status: "Open" as const,
          timestamp,
          bids: {},
        };

        // Clear votes
        if (newState.listSWFYieldCDOTrancheReinsuranceVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.listSWFYieldCDOTrancheReinsuranceVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.listSWFYieldCDOTrancheReinsuranceVotes[syndicateId]).length === 0) {
            delete newState.listSWFYieldCDOTrancheReinsuranceVotes[syndicateId];
          }
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Listed] Syndicate ${syndicateId} successfully listed reinsurance policy ${policyId} for sale at ask price ${askPrice} gold.`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFYieldCDOTrancheReinsuranceBids(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    placeSWFYieldCDOTrancheReinsuranceBidVotes: state.placeSWFYieldCDOTrancheReinsuranceBidVotes ? { ...state.placeSWFYieldCDOTrancheReinsuranceBidVotes } : {},
    swfYieldCDOTrancheReinsuranceListings: state.swfYieldCDOTrancheReinsuranceListings ? { ...state.swfYieldCDOTrancheReinsuranceListings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.placeSWFYieldCDOTrancheReinsuranceBidVotes || {})) {
    const votes = newState.placeSWFYieldCDOTrancheReinsuranceBidVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { bidAmount, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId, voteObj]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        // Majority reached! Place the bid.
        const listing = newState.swfYieldCDOTrancheReinsuranceListings![listingId];
        if (listing && listing.status === "Open") {
          const bids = listing.bids ? { ...listing.bids } : {};
          bids[syndicateId] = {
            bidderSyndicateId: syndicateId,
            bidAmount,
            timestamp,
          };
          listing.bids = bids;
          newState.swfYieldCDOTrancheReinsuranceListings![listingId] = listing;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Bid Placed] Syndicate ${syndicateId} placed a bid of ${bidAmount} gold on listing ${listingId}.`
          );
        }

        // Clear votes
        if (newState.placeSWFYieldCDOTrancheReinsuranceBidVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.placeSWFYieldCDOTrancheReinsuranceBidVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.placeSWFYieldCDOTrancheReinsuranceBidVotes[syndicateId]).length === 0) {
            delete newState.placeSWFYieldCDOTrancheReinsuranceBidVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileSWFYieldCDOTrancheReinsuranceSales(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    executeSWFYieldCDOTrancheReinsuranceSaleVotes: state.executeSWFYieldCDOTrancheReinsuranceSaleVotes ? { ...state.executeSWFYieldCDOTrancheReinsuranceSaleVotes } : {},
    swfYieldCDOTrancheReinsuranceListings: state.swfYieldCDOTrancheReinsuranceListings ? { ...state.swfYieldCDOTrancheReinsuranceListings } : {},
    swfYieldCDOTrancheReinsurancePolicies: state.swfYieldCDOTrancheReinsurancePolicies ? { ...state.swfYieldCDOTrancheReinsurancePolicies } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes || {})) {
    const votes = newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { buyerSyndicateId, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId, voteObj]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        // Majority reached! Execute the sale.
        const listing = newState.swfYieldCDOTrancheReinsuranceListings![listingId];
        if (listing && listing.status === "Open") {
          const bid = buyerSyndicateId === "market_maker"
            ? (listing.bids?.["market_maker"] || { bidderSyndicateId: "market_maker", bidAmount: listing.askPrice })
            : listing.bids?.[buyerSyndicateId];

          if (bid) {
            const finalPrice = bid.bidAmount;
            const policy = newState.swfYieldCDOTrancheReinsurancePolicies![listing.policyId];

            if (policy && policy.active && policy.syndicateId === syndicateId) {
              const buyerSyndicate = buyerSyndicateId === "market_maker"
                ? { id: "market_maker", warChest: 99999999 }
                : newState.syndicates[buyerSyndicateId];

              if (buyerSyndicate && (buyerSyndicateId === "market_maker" || (buyerSyndicate.warChest ?? 0) >= finalPrice)) {
                // Execute policy owner transfer
                newState.swfYieldCDOTrancheReinsurancePolicies![listing.policyId] = {
                  ...policy,
                  syndicateId: buyerSyndicateId,
                  timestamp,
                };

                // Transfer gold
                syndicate.warChest = (syndicate.warChest ?? 0) + finalPrice;
                if (buyerSyndicateId !== "market_maker" && newState.syndicates[buyerSyndicateId]) {
                  newState.syndicates[buyerSyndicateId].warChest = (newState.syndicates[buyerSyndicateId].warChest ?? 0) - finalPrice;
                }

                // Close listing
                listing.status = "Completed";
                listing.timestamp = timestamp;
                newState.swfYieldCDOTrancheReinsuranceListings![listingId] = listing;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Reinsurance Sale Executed] Syndicate ${syndicateId} sold reinsurance policy ${listing.policyId} to syndicate ${buyerSyndicateId} for ${finalPrice} gold.`
                );
              }
            }
          }
        }

        // Clear votes
        if (newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes[syndicateId]).length === 0) {
            delete newState.executeSWFYieldCDOTrancheReinsuranceSaleVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileCancelSWFYieldCDOTrancheReinsuranceListings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cancelSWFYieldCDOTrancheReinsuranceListingVotes: state.cancelSWFYieldCDOTrancheReinsuranceListingVotes ? { ...state.cancelSWFYieldCDOTrancheReinsuranceListingVotes } : {},
    swfYieldCDOTrancheReinsuranceListings: state.swfYieldCDOTrancheReinsuranceListings ? { ...state.swfYieldCDOTrancheReinsuranceListings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes || {})) {
    const votes = newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId, voteObj]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        // Majority reached! Cancel listing.
        const listing = newState.swfYieldCDOTrancheReinsuranceListings![listingId];
        if (listing && listing.status === "Open" && listing.sellerSyndicateId === syndicateId) {
          listing.status = "Cancelled";
          listing.timestamp = timestamp;
          newState.swfYieldCDOTrancheReinsuranceListings![listingId] = listing;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Listing Cancelled] Syndicate ${syndicateId} cancelled reinsurance listing ${listingId}.`
          );
        }

        // Clear votes
        if (newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes[syndicateId]).length === 0) {
            delete newState.cancelSWFYieldCDOTrancheReinsuranceListingVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function getCDOTrancheReinsurancePremiumRate(state: GameState, cdoId: string, trancheId: "senior" | "mezzanine" | "equity"): number {
  let basePremiumRate = 0.05;
  let volatilityReserve = 0;
  let volatilityHedgeMultiplier = 0.02;

  if (state.volatilityHedgedPremiumPolicies?.[cdoId]) {
    const policy = state.volatilityHedgedPremiumPolicies[cdoId];
    basePremiumRate = policy.basePremiumRate;
    volatilityReserve = policy.volatilityReserve;
    volatilityHedgeMultiplier = policy.volatilityHedgeMultiplier;
  }

  const ratingId = `${cdoId}_${trancheId}`;
  const ratingRecord = state.swfYieldCDOTrancheRiskRatings?.[ratingId];
  const riskRating = ratingRecord ? ratingRecord.riskRating : "AAA";

  const ratingMultipliers: Record<string, number> = {
    "AAA": 0.5,
    "AA": 0.7,
    "A": 0.9,
    "BBB": 1.1,
    "BB": 1.4,
    "B": 1.8,
    "CCC": 2.3,
    "CC": 3.0,
    "C": 4.0,
    "D": 5.0,
  };
  const ratingMult = ratingMultipliers[riskRating] ?? 1.0;

  const activeBonds = Object.values(state.yieldVolatilityIndexes || {});
  const avgVolatility = activeBonds.length > 0
    ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
    : 15.0;

  const volMultiplier = 1.0 + (avgVolatility * volatilityHedgeMultiplier) / Math.max(1.0, volatilityReserve / 100);
  let rate = basePremiumRate * ratingMult * volMultiplier;
  if (state.swfReinsuranceOptionOrderBookDepths?.[ratingId]) {
    rate *= state.swfReinsuranceOptionOrderBookDepths[ratingId].spreadAdjustment;
  }
  return rate;
}

export function reconcileSWFReinsuranceFuturesContracts(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceFuturesContracts: state.swfReinsuranceFuturesContracts ? { ...state.swfReinsuranceFuturesContracts } : {},
    openSWFReinsuranceFuturesVotes: state.openSWFReinsuranceFuturesVotes ? { ...state.openSWFReinsuranceFuturesVotes } : {},
    closeSWFReinsuranceFuturesVotes: state.closeSWFReinsuranceFuturesVotes ? { ...state.closeSWFReinsuranceFuturesVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  // Reconcile OPEN futures votes
  for (const syndicateId of Object.keys(newState.openSWFReinsuranceFuturesVotes || {})) {
    const votes = newState.openSWFReinsuranceFuturesVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      id: string;
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      side: "long" | "short";
      lockPremiumRate: number;
      size: number;
      marginCollateral: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.side}::${vote.lockPremiumRate}::${vote.size}::${vote.marginCollateral}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            id: vote.id,
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            side: vote.side,
            lockPremiumRate: vote.lockPremiumRate,
            size: vote.size,
            marginCollateral: vote.marginCollateral,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        if ((syndicate.warChest ?? 0) >= group.marginCollateral) {
          syndicate.warChest = (syndicate.warChest ?? 0) - group.marginCollateral;
          
          const id = group.id || `reins_fut_${Object.keys(newState.swfReinsuranceFuturesContracts || {}).length + 1}`;
          newState.swfReinsuranceFuturesContracts![id] = {
            id,
            syndicateId,
            swfYieldCdoId: group.swfYieldCdoId,
            trancheId: group.trancheId,
            side: group.side,
            lockPremiumRate: group.lockPremiumRate,
            size: group.size,
            marginCollateral: group.marginCollateral,
            timestamp: Math.max(...group.timestamps, newState.step),
            active: true,
          };

          delete newState.openSWFReinsuranceFuturesVotes[syndicateId];

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Futures Opened] Syndicate ${syndicateId} opened a ${group.side} futures contract on CDO ${group.swfYieldCdoId} tranche ${group.trancheId} (Size: ${group.size}, Lock Rate: ${group.lockPremiumRate.toFixed(4)}, Collateral: ${group.marginCollateral} gold).`
          );
        }
        break;
      }
    }
  }

  // Reconcile CLOSE futures votes
  for (const syndicateId of Object.keys(newState.closeSWFReinsuranceFuturesVotes || {})) {
    const votes = newState.closeSWFReinsuranceFuturesVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      positionId: string;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = vote.positionId;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            positionId: vote.positionId,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const position = newState.swfReinsuranceFuturesContracts?.[group.positionId];
        if (position && position.active && position.syndicateId === syndicateId) {
          const spotRate = getCDOTrancheReinsurancePremiumRate(newState, position.swfYieldCdoId, position.trancheId);
          const diff = spotRate - position.lockPremiumRate;
          const profit = Math.floor((position.side === "long" ? 1 : -1) * diff * position.size * 100);

          syndicate.warChest = Math.max(0, (syndicate.warChest ?? 0) + position.marginCollateral + profit);

          position.active = false;
          position.timestamp = Math.max(...group.timestamps, newState.step);

          delete newState.closeSWFReinsuranceFuturesVotes[syndicateId];

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Futures Closed] Syndicate ${syndicateId} closed futures contract ${group.positionId} at spot rate ${spotRate.toFixed(4)} (Final profit/loss: ${profit} gold).`
          );
        }
        break;
      }
    }
  }

  return newState;
}

export function reconcileVolatilityHedgedPremiumPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    volatilityHedgedPremiumPolicies: state.volatilityHedgedPremiumPolicies ? { ...state.volatilityHedgedPremiumPolicies } : {},
    configureVolatilityHedgedPremiumPolicyVotes: state.configureVolatilityHedgedPremiumPolicyVotes ? { ...state.configureVolatilityHedgedPremiumPolicyVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.configureVolatilityHedgedPremiumPolicyVotes || {})) {
    const votes = newState.configureVolatilityHedgedPremiumPolicyVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      basePremiumRate: number;
      volatilityReserve: number;
      volatilityHedgeMultiplier: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.basePremiumRate}::${vote.volatilityReserve}::${vote.volatilityHedgeMultiplier}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            basePremiumRate: vote.basePremiumRate,
            volatilityReserve: vote.volatilityReserve,
            volatilityHedgeMultiplier: vote.volatilityHedgeMultiplier,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        if ((syndicate.warChest ?? 0) >= group.volatilityReserve) {
          syndicate.warChest = (syndicate.warChest ?? 0) - group.volatilityReserve;

          const existingPolicy = newState.volatilityHedgedPremiumPolicies![group.swfYieldCdoId];
          const newReserve = (existingPolicy?.volatilityReserve ?? 0) + group.volatilityReserve;

          newState.volatilityHedgedPremiumPolicies![group.swfYieldCdoId] = {
            swfYieldCdoId: group.swfYieldCdoId,
            basePremiumRate: group.basePremiumRate,
            volatilityReserve: newReserve,
            volatilityHedgeMultiplier: group.volatilityHedgeMultiplier,
            timestamp: Math.max(...group.timestamps, newState.step),
          };

          delete newState.configureVolatilityHedgedPremiumPolicyVotes[syndicateId];

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Volatility Hedged Premium Policy Configured] Syndicate ${syndicateId} configured premium policy on CDO ${group.swfYieldCdoId}: Base Rate ${group.basePremiumRate.toFixed(4)}, Total Reserve: ${newReserve} gold, Hedge Mult: ${group.volatilityHedgeMultiplier.toFixed(4)}.`
          );
        }
        break;
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionsListings(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    listSWFReinsuranceOptionVotes: state.listSWFReinsuranceOptionVotes ? { ...state.listSWFReinsuranceOptionVotes } : {},
    swfReinsuranceOptionsListings: state.swfReinsuranceOptionsListings ? { ...state.swfReinsuranceOptionsListings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.listSWFReinsuranceOptionVotes || {})) {
    const votes = newState.listSWFReinsuranceOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { swfYieldCdoId, trancheId, optionType, strikePremiumRate, size, askPrice, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        newState.swfReinsuranceOptionsListings![listingId] = {
          id: listingId,
          sellerSyndicateId: syndicateId,
          swfYieldCdoId,
          trancheId,
          optionType,
          strikePremiumRate,
          size,
          askPrice,
          status: "Open" as const,
          timestamp,
          bids: {},
        };

        if (newState.listSWFReinsuranceOptionVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.listSWFReinsuranceOptionVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.listSWFReinsuranceOptionVotes[syndicateId]).length === 0) {
            delete newState.listSWFReinsuranceOptionVotes[syndicateId];
          }
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Listed] Syndicate ${syndicateId} successfully listed a ${optionType} option on CDO ${swfYieldCdoId} tranche ${trancheId} at ask price ${askPrice} gold (Strike: ${strikePremiumRate.toFixed(4)}, Size: ${size}).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionsBids(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    bidSWFReinsuranceOptionVotes: state.bidSWFReinsuranceOptionVotes ? { ...state.bidSWFReinsuranceOptionVotes } : {},
    swfReinsuranceOptionsListings: state.swfReinsuranceOptionsListings ? { ...state.swfReinsuranceOptionsListings } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.bidSWFReinsuranceOptionVotes || {})) {
    const votes = newState.bidSWFReinsuranceOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { bidAmount, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        const listing = newState.swfReinsuranceOptionsListings![listingId];
        if (listing && listing.status === "Open") {
          const bids = listing.bids ? { ...listing.bids } : {};
          bids[syndicateId] = {
            bidderSyndicateId: syndicateId,
            bidAmount,
            timestamp,
          };
          listing.bids = bids;
          newState.swfReinsuranceOptionsListings![listingId] = listing;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Option Bid Placed] Syndicate ${syndicateId} placed a bid of ${bidAmount} gold on options listing ${listingId}.`
          );
        }

        if (newState.bidSWFReinsuranceOptionVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.bidSWFReinsuranceOptionVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.bidSWFReinsuranceOptionVotes[syndicateId]).length === 0) {
            delete newState.bidSWFReinsuranceOptionVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionsSales(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    executeSWFReinsuranceOptionSaleVotes: state.executeSWFReinsuranceOptionSaleVotes ? { ...state.executeSWFReinsuranceOptionSaleVotes } : {},
    swfReinsuranceOptionsListings: state.swfReinsuranceOptionsListings ? { ...state.swfReinsuranceOptionsListings } : {},
    swfReinsuranceOptionsContracts: state.swfReinsuranceOptionsContracts ? { ...state.swfReinsuranceOptionsContracts } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.executeSWFReinsuranceOptionSaleVotes || {})) {
    const votes = newState.executeSWFReinsuranceOptionSaleVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by listingId
    const votesByListing: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByListing[voteObj.listingId]) {
        votesByListing[voteObj.listingId] = {};
      }
      votesByListing[voteObj.listingId][voterId] = voteObj;
    }

    for (const [listingId, listingVotes] of Object.entries(votesByListing)) {
      const firstVote = Object.values(listingVotes)[0];
      if (!firstVote) continue;

      const { buyerSyndicateId, timestamp } = firstVote;
      const yesVotes = Object.entries(listingVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        const listing = newState.swfReinsuranceOptionsListings![listingId];
        if (listing && listing.status === "Open") {
          const bid = buyerSyndicateId === "market_maker"
            ? (listing.bids?.["market_maker"] || { bidderSyndicateId: "market_maker", bidAmount: listing.askPrice })
            : listing.bids?.[buyerSyndicateId];

          if (bid) {
            const finalPrice = bid.bidAmount;
            const buyerSyndicate = buyerSyndicateId === "market_maker"
              ? { id: "market_maker", warChest: 99999999 }
              : newState.syndicates[buyerSyndicateId];

            if (buyerSyndicate && (buyerSyndicateId === "market_maker" || (buyerSyndicate.warChest ?? 0) >= finalPrice)) {
              // Create the active option contract
              const optionId = `opt_${Object.keys(newState.swfReinsuranceOptionsContracts || {}).length + 1}`;
              newState.swfReinsuranceOptionsContracts![optionId] = {
                id: optionId,
                syndicateId: buyerSyndicateId,
                writerSyndicateId: syndicateId,
                swfYieldCdoId: listing.swfYieldCdoId,
                trancheId: listing.trancheId,
                optionType: listing.optionType,
                strikePremiumRate: listing.strikePremiumRate,
                size: listing.size,
                timestamp,
                active: true,
              };

              // Transfer gold
              syndicate.warChest = (syndicate.warChest ?? 0) + finalPrice;
              if (buyerSyndicateId !== "market_maker" && newState.syndicates[buyerSyndicateId]) {
                newState.syndicates[buyerSyndicateId].warChest = (newState.syndicates[buyerSyndicateId].warChest ?? 0) - finalPrice;
              }

              // Close listing
              listing.status = "Completed";
              listing.timestamp = timestamp;
              newState.swfReinsuranceOptionsListings![listingId] = listing;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Reinsurance Option Sale Executed] Syndicate ${syndicateId} sold a ${listing.optionType} option on CDO ${listing.swfYieldCdoId} tranche ${listing.trancheId} (Strike: ${listing.strikePremiumRate.toFixed(4)}, Size: ${listing.size}) to syndicate ${buyerSyndicateId} for ${finalPrice} gold.`
              );
            }
          }
        }

        if (newState.executeSWFReinsuranceOptionSaleVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.executeSWFReinsuranceOptionSaleVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.executeSWFReinsuranceOptionSaleVotes[syndicateId]).length === 0) {
            delete newState.executeSWFReinsuranceOptionSaleVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileExerciseSWFReinsuranceOptions(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    exerciseSWFReinsuranceOptionVotes: state.exerciseSWFReinsuranceOptionVotes ? { ...state.exerciseSWFReinsuranceOptionVotes } : {},
    swfReinsuranceOptionsContracts: state.swfReinsuranceOptionsContracts ? { ...state.swfReinsuranceOptionsContracts } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.exerciseSWFReinsuranceOptionVotes || {})) {
    const votes = newState.exerciseSWFReinsuranceOptionVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by contractId
    const votesByContract: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByContract[voteObj.contractId]) {
        votesByContract[voteObj.contractId] = {};
      }
      votesByContract[voteObj.contractId][voterId] = voteObj;
    }

    for (const [contractId, contractVotes] of Object.entries(votesByContract)) {
      const firstVote = Object.values(contractVotes)[0];
      if (!firstVote) continue;

      const { timestamp } = firstVote;
      const yesVotes = Object.entries(contractVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        const contract = newState.swfReinsuranceOptionsContracts![contractId];
        if (contract && contract.active && contract.syndicateId === syndicateId) {
          const spotRate = getCDOTrancheReinsurancePremiumRate(newState, contract.swfYieldCdoId, contract.trancheId);
          let payout = 0;
          if (contract.optionType === "call") {
            payout = Math.max(0, spotRate - contract.strikePremiumRate) * contract.size * 100;
          } else {
            payout = Math.max(0, contract.strikePremiumRate - spotRate) * contract.size * 100;
          }
          payout = Math.floor(payout);

          const writer = newState.syndicates[contract.writerSyndicateId];
          const holder = newState.syndicates[contract.syndicateId];
          let actualPaid = payout;

          if (writer && holder) {
            actualPaid = Math.min(payout, writer.warChest ?? 0);
            writer.warChest = Math.max(0, (writer.warChest ?? 0) - actualPaid);
            holder.warChest = (holder.warChest ?? 0) + actualPaid;
          }

          contract.active = false;
          contract.timestamp = timestamp;
          newState.swfReinsuranceOptionsContracts![contractId] = contract;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Option Exercised] Contract ${contractId} exercised. Spot rate: ${spotRate.toFixed(4)}, Strike: ${contract.strikePremiumRate.toFixed(4)}, Payout: ${payout} gold (Actual Paid: ${actualPaid} gold).`
          );
        }

        if (newState.exerciseSWFReinsuranceOptionVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.exerciseSWFReinsuranceOptionVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.exerciseSWFReinsuranceOptionVotes[syndicateId]).length === 0) {
            delete newState.exerciseSWFReinsuranceOptionVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileSubmitSWFReinsuranceOptionLimitOrders(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    submitSWFReinsuranceOptionLimitOrderVotes: state.submitSWFReinsuranceOptionLimitOrderVotes ? { ...state.submitSWFReinsuranceOptionLimitOrderVotes } : {},
    swfReinsuranceOptionLimitOrders: state.swfReinsuranceOptionLimitOrders ? { ...state.swfReinsuranceOptionLimitOrders } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.submitSWFReinsuranceOptionLimitOrderVotes || {})) {
    const votes = newState.submitSWFReinsuranceOptionLimitOrderVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by orderId
    const votesByOrder: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByOrder[voteObj.orderId]) {
        votesByOrder[voteObj.orderId] = {};
      }
      votesByOrder[voteObj.orderId][voterId] = voteObj;
    }

    for (const [orderId, orderVotes] of Object.entries(votesByOrder)) {
      const firstVote = Object.values(orderVotes)[0];
      if (!firstVote) continue;

      const { orderType, contractId, swfYieldCdoId, trancheId, optionType, strikePremiumRate, size, limitPrice, timestamp } = firstVote;
      const yesVotes = Object.entries(orderVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        newState.swfReinsuranceOptionLimitOrders![orderId] = {
          id: orderId,
          syndicateId,
          orderType,
          contractId,
          swfYieldCdoId,
          trancheId,
          optionType,
          strikePremiumRate,
          size,
          limitPrice,
          status: "Open" as const,
          timestamp,
        };

        if (newState.submitSWFReinsuranceOptionLimitOrderVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.submitSWFReinsuranceOptionLimitOrderVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.submitSWFReinsuranceOptionLimitOrderVotes[syndicateId]).length === 0) {
            delete newState.submitSWFReinsuranceOptionLimitOrderVotes[syndicateId];
          }
        }

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Limit Order Submitted] Syndicate ${syndicateId} successfully submitted a ${orderType} limit order ${orderId} on CDO ${swfYieldCdoId} tranche ${trancheId} (Strike: ${strikePremiumRate.toFixed(4)}, Size: ${size}, Limit Price: ${limitPrice} gold).`
        );
      }
    }
  }

  return newState;
}

export function reconcileCancelSWFReinsuranceOptionLimitOrders(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    cancelSWFReinsuranceOptionLimitOrderVotes: state.cancelSWFReinsuranceOptionLimitOrderVotes ? { ...state.cancelSWFReinsuranceOptionLimitOrderVotes } : {},
    swfReinsuranceOptionLimitOrders: state.swfReinsuranceOptionLimitOrders ? { ...state.swfReinsuranceOptionLimitOrders } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.cancelSWFReinsuranceOptionLimitOrderVotes || {})) {
    const votes = newState.cancelSWFReinsuranceOptionLimitOrderVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const members = syndicate.members;
    // Group votes by orderId
    const votesByOrder: Record<string, typeof votes> = {};
    for (const [voterId, voteObj] of Object.entries(votes)) {
      if (!votesByOrder[voteObj.orderId]) {
        votesByOrder[voteObj.orderId] = {};
      }
      votesByOrder[voteObj.orderId][voterId] = voteObj;
    }

    for (const [orderId, orderVotes] of Object.entries(votesByOrder)) {
      const firstVote = Object.values(orderVotes)[0];
      if (!firstVote) continue;

      const { timestamp } = firstVote;
      const yesVotes = Object.entries(orderVotes)
        .filter(([voterId]) => members.includes(voterId))
        .map(([voterId]) => voterId);

      if (yesVotes.length > members.length / 2) {
        const order = newState.swfReinsuranceOptionLimitOrders![orderId];
        if (order && order.status === "Open" && order.syndicateId === syndicateId) {
          order.status = "Cancelled" as const;
          order.timestamp = timestamp;
          newState.swfReinsuranceOptionLimitOrders![orderId] = order;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Option Limit Order Cancelled] Limit order ${orderId} cancelled by Syndicate ${syndicateId}.`
          );
        }

        if (newState.cancelSWFReinsuranceOptionLimitOrderVotes?.[syndicateId]) {
          for (const voterId of yesVotes) {
            delete newState.cancelSWFReinsuranceOptionLimitOrderVotes[syndicateId][voterId];
          }
          if (Object.keys(newState.cancelSWFReinsuranceOptionLimitOrderVotes[syndicateId]).length === 0) {
            delete newState.cancelSWFReinsuranceOptionLimitOrderVotes[syndicateId];
          }
        }
      }
    }
  }

  return newState;
}

export function reconcileClaimReinsuranceLiquidityMiningRewards(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    claimReinsuranceLiquidityMiningRewardsVotes: state.claimReinsuranceLiquidityMiningRewardsVotes ? { ...state.claimReinsuranceLiquidityMiningRewardsVotes } : {},
    swfLiquidityMiningRewards: state.swfLiquidityMiningRewards ? { ...state.swfLiquidityMiningRewards } : {},
  };

  if (!newState.claimReinsuranceLiquidityMiningRewardsVotes) return newState;

  for (const syndicateId of Object.keys(newState.claimReinsuranceLiquidityMiningRewardsVotes)) {
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const votes = newState.claimReinsuranceLiquidityMiningRewardsVotes[syndicateId] || {};

    const yesVotes = Object.keys(votes).filter(memberId => syndicate.members.includes(memberId));

    if (yesVotes.length > totalMembers / 2) {
      // Majority consensus reached!
      const rewards = newState.swfLiquidityMiningRewards?.[syndicateId] ?? 0;
      if (rewards > 0) {
        syndicate.warChest = (syndicate.warChest ?? 0) + rewards;
        newState.swfLiquidityMiningRewards![syndicateId] = 0;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Liquidity Mining Rewards Claimed] Syndicate ${syndicateId} successfully claimed ${rewards} gold of accrued limit order book liquidity mining rewards.`
        );
      } else {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Liquidity Mining Rewards Claimed Failed] Syndicate ${syndicateId} has no pending rewards to claim.`
        );
      }

      // Clear votes
      delete newState.claimReinsuranceLiquidityMiningRewardsVotes[syndicateId];
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionTransactionCosts(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionTransactionCostPolicies: state.swfReinsuranceOptionTransactionCostPolicies ? { ...state.swfReinsuranceOptionTransactionCostPolicies } : {},
    adjustSWFReinsuranceOptionTransactionCostVotes: state.adjustSWFReinsuranceOptionTransactionCostVotes ? { ...state.adjustSWFReinsuranceOptionTransactionCostVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionTransactionCostVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionTransactionCostVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      baseTransactionCost: number;
      subsidyPerReputationPoint: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.baseTransactionCost}::${vote.subsidyPerReputationPoint}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            baseTransactionCost: vote.baseTransactionCost,
            subsidyPerReputationPoint: vote.subsidyPerReputationPoint,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionTransactionCostPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          baseTransactionCost: group.baseTransactionCost,
          subsidyPerReputationPoint: group.subsidyPerReputationPoint,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionTransactionCostVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Transaction Cost Policy Adjusted] Syndicate ${syndicateId} adjusted policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Base Cost: ${group.baseTransactionCost} gold, Subsidy per Rep: ${group.subsidyPerReputationPoint.toFixed(4)}).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionMarketMakerRebates(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionMarketMakerRebatePolicies: state.swfReinsuranceOptionMarketMakerRebatePolicies ? { ...state.swfReinsuranceOptionMarketMakerRebatePolicies } : {},
    adjustSWFReinsuranceOptionMarketMakerRebateVotes: state.adjustSWFReinsuranceOptionMarketMakerRebateVotes ? { ...state.adjustSWFReinsuranceOptionMarketMakerRebateVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionMarketMakerRebateVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionMarketMakerRebateVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      baseRebateRate: number;
      maxRebateRate: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.baseRebateRate}::${vote.maxRebateRate}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            baseRebateRate: vote.baseRebateRate,
            maxRebateRate: vote.maxRebateRate,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionMarketMakerRebatePolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          baseRebateRate: group.baseRebateRate,
          maxRebateRate: group.maxRebateRate,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionMarketMakerRebateVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Market Maker Rebate Policy Adjusted] Syndicate ${syndicateId} adjusted rebate policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Base Rebate Rate: ${group.baseRebateRate.toFixed(4)}, Max Rebate Rate: ${group.maxRebateRate.toFixed(4)}).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionMargins(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionMarginPolicies: state.swfReinsuranceOptionMarginPolicies ? { ...state.swfReinsuranceOptionMarginPolicies } : {},
    adjustSWFReinsuranceOptionMarginVotes: state.adjustSWFReinsuranceOptionMarginVotes ? { ...state.adjustSWFReinsuranceOptionMarginVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionMarginVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionMarginVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      liquidationThreshold: number;
      penaltyRate: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.liquidationThreshold}::${vote.penaltyRate}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            liquidationThreshold: vote.liquidationThreshold,
            penaltyRate: vote.penaltyRate,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionMarginPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          liquidationThreshold: group.liquidationThreshold,
          penaltyRate: group.penaltyRate,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionMarginVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Margin Policy Adjusted] Syndicate ${syndicateId} adjusted margin policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Liquidation Threshold: ${group.liquidationThreshold.toFixed(4)}, Penalty Rate: ${group.penaltyRate.toFixed(4)}).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionStressTests(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionStressTestPolicies: state.swfReinsuranceOptionStressTestPolicies ? { ...state.swfReinsuranceOptionStressTestPolicies } : {},
    adjustSWFReinsuranceOptionStressTestVotes: state.adjustSWFReinsuranceOptionStressTestVotes ? { ...state.adjustSWFReinsuranceOptionStressTestVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionStressTestVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionStressTestVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      simulatedVolatilityShock: number;
      simulatedLiquidityShock: number;
      reserveMultiplier: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.simulatedVolatilityShock}::${vote.simulatedLiquidityShock}::${vote.reserveMultiplier}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            simulatedVolatilityShock: vote.simulatedVolatilityShock,
            simulatedLiquidityShock: vote.simulatedLiquidityShock,
            reserveMultiplier: vote.reserveMultiplier,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionStressTestPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          simulatedVolatilityShock: group.simulatedVolatilityShock,
          simulatedLiquidityShock: group.simulatedLiquidityShock,
          reserveMultiplier: group.reserveMultiplier,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionStressTestVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Stress Test Adjusted] Syndicate ${syndicateId} adjusted stress test policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Volatility Shock: +${group.simulatedVolatilityShock.toFixed(2)}%, Liquidity Shock: ${group.simulatedLiquidityShock.toFixed(2)} gold, Reserve Multiplier: ${group.reserveMultiplier.toFixed(4)}x).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionHedging(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionHedgingPolicies: state.swfReinsuranceOptionHedgingPolicies ? { ...state.swfReinsuranceOptionHedgingPolicies } : {},
    adjustSWFReinsuranceOptionHedgingVotes: state.adjustSWFReinsuranceOptionHedgingVotes ? { ...state.adjustSWFReinsuranceOptionHedgingVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionHedgingVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionHedgingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      hedgingActivationThreshold: number;
      reserveReallocationLimit: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.hedgingActivationThreshold}::${vote.reserveReallocationLimit}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            hedgingActivationThreshold: vote.hedgingActivationThreshold,
            reserveReallocationLimit: vote.reserveReallocationLimit,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionHedgingPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          hedgingActivationThreshold: group.hedgingActivationThreshold,
          reserveReallocationLimit: group.reserveReallocationLimit,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionHedgingVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Hedging Adjusted] Syndicate ${syndicateId} adjusted hedging policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Hedging Activation Threshold: ${group.hedgingActivationThreshold.toFixed(2)}%, Reserve Reallocation Limit: ${group.reserveReallocationLimit} gold).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionDeltaHedging(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionDeltaHedgingPolicies: state.swfReinsuranceOptionDeltaHedgingPolicies ? { ...state.swfReinsuranceOptionDeltaHedgingPolicies } : {},
    adjustSWFReinsuranceOptionDeltaHedgingVotes: state.adjustSWFReinsuranceOptionDeltaHedgingVotes ? { ...state.adjustSWFReinsuranceOptionDeltaHedgingVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionDeltaHedgingVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionDeltaHedgingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      targetDelta: number;
      rebalancingPriceTolerance: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.targetDelta}::${vote.rebalancingPriceTolerance}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            targetDelta: vote.targetDelta,
            rebalancingPriceTolerance: vote.rebalancingPriceTolerance,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionDeltaHedgingPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          targetDelta: group.targetDelta,
          rebalancingPriceTolerance: group.rebalancingPriceTolerance,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionDeltaHedgingVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Delta Hedging Adjusted] Syndicate ${syndicateId} adjusted delta hedging policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Target Delta: ${group.targetDelta.toFixed(2)}, Rebalancing Price Tolerance: ${group.rebalancingPriceTolerance.toFixed(4)}).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionStressTestDeltaHedging(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionStressTestDeltaHedgingPolicies: state.swfReinsuranceOptionStressTestDeltaHedgingPolicies ? { ...state.swfReinsuranceOptionStressTestDeltaHedgingPolicies } : {},
    adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes: state.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes ? { ...state.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      stressDeltaTarget: number;
      stressVolatilityThreshold: number;
      safetyCapitalReallocationLimit: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.swfYieldCdoId}::${vote.trancheId}::${vote.stressDeltaTarget}::${vote.stressVolatilityThreshold}::${vote.safetyCapitalReallocationLimit}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            stressDeltaTarget: vote.stressDeltaTarget,
            stressVolatilityThreshold: vote.stressVolatilityThreshold,
            safetyCapitalReallocationLimit: vote.safetyCapitalReallocationLimit,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionStressTestDeltaHedgingPolicies![policyKey] = {
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          stressDeltaTarget: group.stressDeltaTarget,
          stressVolatilityThreshold: group.stressVolatilityThreshold,
          safetyCapitalReallocationLimit: group.safetyCapitalReallocationLimit,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionStressTestDeltaHedgingVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Stress Test Delta Hedging Adjusted] Syndicate ${syndicateId} adjusted stress-test-aware delta hedging policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Stress Delta Target: ${group.stressDeltaTarget.toFixed(2)}, Stress Volatility Threshold: ${group.stressVolatilityThreshold.toFixed(2)}%, Safety Capital Limit: ${group.safetyCapitalReallocationLimit} gold).`
        );
      }
    }
  }

  return newState;
}

export function reconcileSWFReinsuranceOptionCrossHedging(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionCrossHedgingPolicies: state.swfReinsuranceOptionCrossHedgingPolicies ? { ...state.swfReinsuranceOptionCrossHedgingPolicies } : {},
    adjustSWFReinsuranceOptionCrossHedgingVotes: state.adjustSWFReinsuranceOptionCrossHedgingVotes ? { ...state.adjustSWFReinsuranceOptionCrossHedgingVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionCrossHedgingVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionCrossHedgingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      syndicateId: string;
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      correlatedAssetId: string;
      correlatedTrancheId: "senior" | "mezzanine" | "equity";
      correlationCoefficient: number;
      hedgeWeight: number;
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        const key = `${vote.syndicateId}::${vote.swfYieldCdoId}::${vote.trancheId}::${vote.correlatedAssetId}::${vote.correlatedTrancheId}::${vote.correlationCoefficient}::${vote.hedgeWeight}`;
        if (!voteGroups[key]) {
          voteGroups[key] = {
            syndicateId: vote.syndicateId,
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            correlatedAssetId: vote.correlatedAssetId,
            correlatedTrancheId: vote.correlatedTrancheId,
            correlationCoefficient: vote.correlationCoefficient,
            hedgeWeight: vote.hedgeWeight,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.syndicateId}_${group.swfYieldCdoId}_${group.trancheId}`;
        newState.swfReinsuranceOptionCrossHedgingPolicies![policyKey] = {
          syndicateId: group.syndicateId,
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          correlatedAssetId: group.correlatedAssetId,
          correlatedTrancheId: group.correlatedTrancheId,
          correlationCoefficient: group.correlationCoefficient,
          hedgeWeight: group.hedgeWeight,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionCrossHedgingVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Cross Hedging Adjusted] Syndicate ${syndicateId} adjusted cross-hedging policy for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} using correlated asset ${group.correlatedAssetId} tranche ${group.correlatedTrancheId} via majority consensus (Correlation: ${group.correlationCoefficient.toFixed(2)}, Hedge Weight: ${group.hedgeWeight.toFixed(2)}).`
        );
      }
    }
  }

  return newState;
}

export function calculateRiskDiversificationCoefficient(assets: MultiAssetCrossHedgingAsset[]): number {
  if (assets.length === 0) return 1.0;
  
  let totalWeight = 0;
  let weightedCorrelationSum = 0;
  
  for (const asset of assets) {
    totalWeight += asset.hedgeWeight;
    weightedCorrelationSum += asset.hedgeWeight * Math.abs(asset.correlationCoefficient);
  }
  
  if (totalWeight === 0) return 1.0;
  
  // Risk diversification coefficient D = 1.0 - (weightedCorrelationSum / totalWeight)
  // Ensures value stays bounded between 0.0 and 1.0.
  return Math.max(0.0, Math.min(1.0, 1.0 - (weightedCorrelationSum / totalWeight)));
}

export function reconcileSWFReinsuranceOptionMultiAssetCrossHedging(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionMultiAssetCrossHedgingPortfolios: state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios ? { ...state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios } : {},
    adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes: state.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes ? { ...state.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  for (const syndicateId of Object.keys(newState.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes || {})) {
    const votes = newState.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes?.[syndicateId] || {};
    const syndicate = newState.syndicates?.[syndicateId];
    if (!syndicate) continue;

    const totalMembers = syndicate.members.length;
    const voteGroups: Record<string, {
      syndicateId: string;
      swfYieldCdoId: string;
      trancheId: "senior" | "mezzanine" | "equity";
      assets: MultiAssetCrossHedgingAsset[];
      voters: Set<string>;
      timestamps: number[];
    }> = {};

    for (const [voterId, vote] of Object.entries(votes)) {
      if (syndicate.members.includes(voterId)) {
        // Create a unique key based on assets, syndicateId, swfYieldCdoId, trancheId
        const sortedAssets = [...vote.assets].sort((a, b) => {
          const keyA = `${a.correlatedAssetId}::${a.correlatedTrancheId}`;
          const keyB = `${b.correlatedAssetId}::${b.correlatedTrancheId}`;
          return keyA.localeCompare(keyB);
        });
        const assetStr = sortedAssets.map(a => `${a.correlatedAssetId}::${a.correlatedTrancheId}::${a.correlationCoefficient}::${a.hedgeWeight}`).join("||");
        const key = `${vote.syndicateId}::${vote.swfYieldCdoId}::${vote.trancheId}::${assetStr}`;
        
        if (!voteGroups[key]) {
          voteGroups[key] = {
            syndicateId: vote.syndicateId,
            swfYieldCdoId: vote.swfYieldCdoId,
            trancheId: vote.trancheId,
            assets: vote.assets,
            voters: new Set<string>(),
            timestamps: [],
          };
        }
        voteGroups[key].voters.add(voterId);
        voteGroups[key].timestamps.push(vote.timestamp);
      }
    }

    for (const group of Object.values(voteGroups)) {
      if (group.voters.size > totalMembers / 2) {
        const policyKey = `${group.syndicateId}_${group.swfYieldCdoId}_${group.trancheId}`;
        const riskDiversificationCoefficient = calculateRiskDiversificationCoefficient(group.assets);
        
        newState.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios![policyKey] = {
          syndicateId: group.syndicateId,
          swfYieldCdoId: group.swfYieldCdoId,
          trancheId: group.trancheId,
          assets: group.assets,
          riskDiversificationCoefficient,
          timestamp: Math.max(...group.timestamps, newState.step),
        };

        delete newState.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes[syndicateId];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Multi-Asset Cross Hedging Adjusted] Syndicate ${syndicateId} adjusted multi-asset cross-hedging portfolio for CDO ${group.swfYieldCdoId} tranche ${group.trancheId} via majority consensus (Diversification Coefficient: ${riskDiversificationCoefficient.toFixed(4)}, Assets Count: ${group.assets.length}).`
        );
      }
    }
  }

  return newState;
}









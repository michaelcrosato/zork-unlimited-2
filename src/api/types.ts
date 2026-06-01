import { GameState } from "../core/state.js";
import { GameEvent } from "../core/events.js";

export type Action =
  // CYOA
  | { type: "CHOOSE"; choiceId: string }
  // Parser (Stage 2+)
  | { type: "LOOK"; target?: string }
  | { type: "MOVE"; direction: string }
  | { type: "TAKE"; item: string }
  | { type: "DROP"; item: string }
  | { type: "OPEN"; target: string }
  | { type: "CLOSE"; target: string }
  | { type: "UNLOCK"; target: string; with: string }
  | { type: "USE"; item: string; target: string }
  | { type: "TALK"; npc: string }
  | { type: "ASK"; npc: string; topic: string }
  | { type: "GIVE"; item: string; npc: string }
  | { type: "READ"; target: string }
  | { type: "INSPECT"; target: string }
  | { type: "INVENTORY" }
  | { type: "BUY"; item: string; npc: string }
  | { type: "SELL"; item: string; npc: string }
  // Hero's Quest RPG (Stage 4)
  | { type: "FIGHT"; npc: string }
  | { type: "CAST"; spell: string; target: string }
  | { type: "FLEE" }
  | { type: "VOTE_TAX_RATE"; factionId: string; rate: number; timestamp: number }
  | { type: "PROPOSE_ALLIANCE"; factionA: string; factionB: string; targetState?: "allied" | "hostile" | "neutral"; timestamp: number }
  | { type: "DISSOLVE_ALLIANCE"; factionA: string; factionB: string; timestamp: number }
  | { type: "CLAIM_TERRITORY"; roomId: string; factionId: string; timestamp: number }
  | { type: "ASSIST_CONQUEST"; roomId: string; factionId: string; assistingFactionId: string; timestamp: number }
  | { type: "DEFINE_TRADE_ROUTE"; routeId: string; factionId: string; rooms: string[]; taxShare: number; timestamp: number }
  | { type: "VOTE_TRADE_ROUTE_TAX"; routeId: string; taxShare: number; timestamp: number }
  | { type: "DEFINE_MERCHANT_LICENSING"; factionId: string; licenseCost: number; tariffRate: number; timestamp: number; tariffWaiverThreshold?: number; tariffDiscountThreshold?: number }
  | { type: "VOTE_MERCHANT_TARIFF"; factionId: string; tariffRate: number; timestamp: number }
  | { type: "BUY_MERCHANT_LICENSE"; factionId: string; timestamp: number }
  | { type: "DEFINE_MERCHANT_GUILD"; guildId: string; name: string; members: string[]; timestamp: number }
  | { type: "JOIN_MERCHANT_GUILD"; guildId: string; timestamp: number }
  | { type: "VOTE_GUILD_POLICY"; guildId: string; tariffRate: number; exportPricingPolicy: "premium" | "discount" | "standard"; timestamp: number }
  | { type: "SELL_BLACK_MARKET"; itemId: string; roomId: string; timestamp: number }
  | { type: "ADJUST_TURF_BRIBE"; syndicateId: string; amount: number; timestamp: number }
  | { type: "ADJUST_TURF_WAIVER"; syndicateId: string; threshold: number; timestamp: number }
  | { type: "ESTABLISH_CHECKPOINT"; roomId: string; syndicateId: string; timestamp: number }
  | { type: "ESTABLISH_OUTPOST"; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "CONSTRUCT_TURRET"; roomId: string; syndicateId: string; turretId: string; turretType: string; cost?: number; timestamp: number }
  | { type: "ORGANIZE_CONVOY"; convoyId: string; syndicateId: string; routeId: string; cargo: number; goldCost?: number; timestamp: number }
  | { type: "PURCHASE_CONVOY_INSURANCE"; convoyId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_BACKGROUND_CHECK"; syndicateId: string; targetAgentId: string; cost?: number; timestamp: number }
  | { type: "EXPOSE_MOLE"; syndicateId: string; targetAgentId: string; timestamp: number }
  | { type: "BRIBE_ENFORCER"; enforcerId: string; syndicateId: string; goldCost?: number; timestamp: number }
  | { type: "INTERROGATE_ENFORCER"; enforcerId: string; syndicateId: string; timestamp: number }
  | { type: "RECRUIT_ENFORCER"; enforcerId: string; syndicateId: string; timestamp: number }
  | { type: "ESTABLISH_ESPIONAGE_NETWORK"; roomId: string; syndicateId: string; cost: number; timestamp: number }
  | { type: "PLACE_WIRETAP"; roomId: string; syndicateId: string; cost: number; timestamp: number }
  | { type: "SELL_INTEL_REPORT"; syndicateId: string; reportId: string; gold: number; timestamp: number }
  | { type: "BUY_INTEL_REPORT"; syndicateId: string; reportId: string; intelType: "wiretap_log" | "transaction_map" | "raid_schedule"; roomId: string; cost: number; timestamp: number }
  | { type: "SABOTAGE_NETWORK"; syndicateId: string; targetSyndicateId: string; roomId: string; targetType: "espionage_network" | "wiretap"; reportId: string; timestamp: number }
  | { type: "FLIP_UNDERCOVER_AGENT"; syndicateId: string; agentId: string; timestamp: number }
  | { type: "APPOINT_RINGLEADER"; syndicateId: string; ringleaderId: string; timestamp: number }
  | { type: "VOTE_CARTEL_GLOBAL_TAX"; cartelId: string; taxRate: number; timestamp: number }
  | { type: "DEFINE_SMUGGLER_GUILD"; guildId: string; name: string; syndicateId: string; members: string[]; timestamp: number }
  | { type: "VOTE_SMUGGLER_GUILD_CBA"; guildId: string; routeId: string; agreedToll: number; timestamp: number }
  | { type: "POOL_BOUNTY_RESOURCES"; syndicateId: string; targetId: string; goldAmount: number; timestamp: number }
  | { type: "PROPOSE_SYNDICATE_ALLIANCE"; syndicateIdA: string; syndicateIdB: string; targetState?: "allied" | "hostile" | "neutral"; timestamp: number }
  | { type: "SHARE_ESPIONAGE_DATA"; syndicateId: string; targetSyndicateId: string; roomId: string; timestamp: number }
  | { type: "HIRE_TURF_GUARD"; roomId: string; syndicateId: string; cost: number; timestamp: number; useWarChest?: boolean }
  | { type: "CONTRIBUTE_WAR_CHEST"; syndicateId: string; amount: number; timestamp: number }
  | { type: "PAY_FACTION_BRIBE"; factionId: string; syndicateId?: string; amount: number; timestamp: number; useWarChest?: boolean }
  | { type: "DECLARE_FACTION_WAR"; syndicateId: string; factionId: string; timestamp: number }
  | { type: "LAUNCH_CAMPAIGN"; syndicateId: string; factionId: string; roomId: string; goldInvestment: number; timestamp: number }
  | { type: "BUILD_DEFENSE_FORTRESS"; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "PROPOSE_PEACE_TREATY"; syndicateId: string; factionId: string; vote?: boolean; timestamp: number }
  | { type: "ESTABLISH_COVERT_CELL"; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "BROADCAST_PROPAGANDA"; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "RECRUIT_SABOTEUR"; enforcerId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_COUNTER_INTEL_SWEEP"; syndicateId: string; cost?: number; timestamp: number }
  | { type: "RECRUIT_ELITE_ENFORCER"; npcId: string; factionId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_COUNTER_SABOTAGE"; syndicateId: string; cost?: number; timestamp: number }
  | { type: "HIRE_LEGENDARY_HITMAN"; hitmanId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_DECOY_CONVOY"; decoyId: string; syndicateId: string; routeId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_MASTERMIND_CONTRACT"; contractId: string; syndicateId: string; payoutArbitrageMultiplier: number; cost?: number; timestamp: number }
  | { type: "PROPOSE_ENFORCER_DEFUNDING"; syndicateId: string; targetReduction: number; vote?: boolean; timestamp: number }
  | { type: "ESTABLISH_SHADOW_MARKET"; shadowMarketId: string; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "LAUNCH_ARBITRAGE_CONTRACT"; contractId: string; syndicateId: string; startRoomId: string; endRoomId: string; profitSpread: number; cost?: number; timestamp: number }
  | { type: "SABOTAGE_UNDERWRITER"; roomId: string; targetSyndicateId: string; cost?: number; timestamp: number }
  | { type: "ESTABLISH_BLACK_OPS_SAFEHOUSE"; safehouseId: string; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "PROPOSE_SHADOW_ALLIANCE"; syndicateId: string; factionId: string; targetState?: "allied" | "hostile" | "neutral"; timestamp: number }
  | { type: "INFILTRATE_ENFORCER_SWEEP"; syndicateId: string; cost?: number; timestamp: number }
  | { type: "BUILD_DREADNOUGHT_CONVOY"; convoyId: string; syndicateId: string; routeId: string; cargo: number; goldCost?: number; timestamp: number }
  | { type: "ESTABLISH_TREATY_INFILTRATOR"; infiltratorId: string; syndicateId: string; roomId: string; cost?: number; timestamp: number }
  | { type: "VOTE_TARIFF_EXEMPTION"; factionId: string; syndicateId: string; vote?: boolean; timestamp: number }
  | { type: "CREATE_SYNDICATE"; id: string; name: string; members: string[]; timestamp: number }
  | { type: "CONSTRUCT_HIDDEN_PASSAGE"; passageId: string; syndicateId: string; fromRoomId: string; toRoomId: string; cost?: number; timestamp: number }
  | { type: "INFILTRATE_FACTION_NETWORK"; syndicateId: string; factionId: string; cost?: number; timestamp: number }
  | { type: "DEPOSIT_SYNDICATE_BANK"; syndicateId: string; agentId: string; amount: number; timestamp: number }
  | { type: "WITHDRAW_SYNDICATE_BANK"; syndicateId: string; agentId: string; amount: number; timestamp: number }
  | { type: "UPGRADE_BANK_VAULT"; syndicateId: string; cost?: number; timestamp: number }
  | { type: "ESTABLISH_WITHDRAWAL_TARIFF"; syndicateId: string; tariffAmount: number; timestamp: number }
  | { type: "VOTE_INTEREST_RATE"; syndicateId: string; rate: number; timestamp: number }
  | { type: "BORROW_SYNDICATE_BANK"; syndicateId: string; amount: number; collateralType: "safehouse" | "outpost"; collateralId: string; timestamp: number }
  | { type: "PAYBACK_SYNDICATE_BANK"; syndicateId: string; amount: number; timestamp: number }
  | { type: "LIQUIDATE_COLLATERAL"; syndicateId: string; targetAgentId: string; timestamp: number }
  | { type: "PURCHASE_DEPOSIT_INSURANCE"; syndicateId: string; premiumPaid?: number; timestamp: number }
  | { type: "MINT_COUNTERFEIT_GOLD"; syndicateId: string; agentId: string; amount: number; cost?: number; timestamp: number }
  | { type: "ESTABLISH_AUDIT_MITIGATION"; roomId: string; syndicateId: string; cost?: number; timestamp: number }
  | { type: "APPOINT_SMUGGLING_RINGLEADER"; syndicateId: string; ringleaderId: string; timestamp: number }
  | { type: "UPGRADE_SAFEHOUSE_DEFENSES"; safehouseId: string; upgradeCost?: number; timestamp: number }
  | { type: "DEPLOY_INTERCEPTOR_DECOY"; decoyId: string; syndicateId: string; routeId: string; cost?: number; timestamp: number }
  | { type: "CONSTRUCT_CONTRABAND_TUNNEL"; tunnelId: string; syndicateId: string; fromRoomId: string; toRoomId: string; cost?: number; timestamp: number }
  | { type: "ESTABLISH_TUNNEL_TOLL"; tunnelId: string; syndicateId: string; tollAmount: number; timestamp: number }
  | { type: "DEPLOY_TUNNEL_DRONE"; droneId: string; syndicateId: string; tunnelId: string; cargoCapacity: number; cost?: number; timestamp: number }
  | { type: "UPGRADE_SAFEHOUSE_STORAGE"; roomId: string; cost?: number; timestamp: number }
  | { type: "ESTABLISH_STORAGE_RENT"; roomId: string; rentRate: number; timestamp: number }
  | { type: "VOTE_STORAGE_RENT_RATE"; roomId: string; rate: number; timestamp: number }
  | { type: "PROPOSE_LOAN_REFINANCING"; syndicateId: string; targetAgentId: string; newDueStep: number; newInterestRate: number; vote?: boolean; timestamp: number }
  | { type: "DECLARE_CARTEL_BANKRUPTCY"; syndicateId: string; timestamp: number }
  | { type: "PROPOSE_DEBT_SETTLEMENT"; syndicateId: string; targetAgentId: string; settlementAmount: number; timestamp: number }
  | { type: "PROPOSE_JOINT_LOAN"; groupId: string; syndicateId: string; members: string[]; collaterals: { agentId: string; collateralType: "safehouse" | "outpost"; collateralId: string }[]; amount: number; timestamp: number }
  | { type: "PAYBACK_JOINT_LOAN"; groupId: string; amount: number; timestamp: number }
  | { type: "PROPOSE_JOINT_REFINANCING"; groupId: string; newDueStep: number; newInterestRate: number; timestamp: number }
  | { type: "PROPOSE_COLLATERAL_SUBSTITUTION"; groupId: string; removeCollateral: { agentId: string; collateralType: "safehouse" | "outpost"; collateralId: string }; addCollateral?: { agentId: string; collateralType: "safehouse" | "outpost"; collateralId: string }; timestamp: number }
  | { type: "SWAP_INDIVIDUAL_COLLATERAL"; syndicateId: string; targetAgentId: string; removeCollateralType: "safehouse" | "outpost"; removeCollateralId: string; addCollateralType: "safehouse" | "outpost"; addCollateralId: string; timestamp: number };





export type StepResult = {
  state: GameState;
  events: GameEvent[];
  ok: boolean;
  rejectionReason?: string;
};

export type AvailableAction = {
  id: string;
  command: string;
  action: Action;
  text?: string; // Optional human choice text (mainly for CYOA)
};

export type CYOAObservation = {
  mode: "cyoa";
  scene_id: string;
  text: string;
  state: {
    flags: string[];
    vars: Record<string, number>;
    inventory: string[];
    journal: string[];
  };
  available_actions: {
    id: string;
    text: string;
  }[];
};

export type ParserObservation = {
  mode: "parser";
  room: string;
  description: string;
  visible_objects: {
    id: string;
    name: string;
  }[];
  exits: {
    direction: string;
    to: string;
  }[];
  inventory: string[];
  available_actions: AvailableAction[];
};

export type Observation = CYOAObservation | ParserObservation;

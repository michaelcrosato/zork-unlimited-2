import { GameState } from "../core/state.js";
import { GameEvent } from "../core/events.js";

export type Action =
  // CYOA
  | { type: "CHOOSE"; choiceId: string }
  // Parser (Stage 2+)
  | { type: "CHANGE_WEATHER"; weather?: string; temperature?: string; wind?: string }
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
  | { type: "SWAP_INDIVIDUAL_COLLATERAL"; syndicateId: string; targetAgentId: string; removeCollateralType: "safehouse" | "outpost"; removeCollateralId: string; addCollateralType: "safehouse" | "outpost"; addCollateralId: string; timestamp: number }
  | { type: "PROPOSE_JOINT_DEBT_SETTLEMENT"; groupId: string; settlementAmount: number; timestamp: number }
  | { type: "SWAP_JOINT_COLLATERAL"; groupId: string; removeCollateralType: "safehouse" | "outpost"; removeCollateralId: string; addCollateralType: "safehouse" | "outpost"; addCollateralId: string; timestamp: number }
  | { type: "PROPOSE_JOINT_LOAN_GRACE_PERIOD"; groupId: string; extensionSteps: number; timestamp: number }
  | { type: "PROPOSE_JOINT_LOAN_PENALTY_WAIVER"; groupId: string; reducedInterestRate: number; waivePenalty: boolean; timestamp: number }
  | { type: "PROPOSE_JOINT_LOAN_CREDIT_UNDERWRITE"; groupId: string; syndicateId: string; members: string[]; timestamp: number }
  | { type: "PACKAGE_LOAN_CDO"; cdoId: string; creatorSyndicateId: string; assets: Array<{ type: "loan" | "investment"; syndicateId: string; assetId: string }>; timestamp: number }
  | { type: "TRADE_CDO_TRANCHE"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; sellerSyndicateId: string; buyerSyndicateId: string; amount: number; goldPrice: number; timestamp: number; marginEnabled?: boolean; borrowedAmount?: number }
  | { type: "BUY_CREDIT_DEFAULT_SWAP"; cdsId: string; buyerSyndicateId: string; writerSyndicateId: string; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; notionalValue: number; premiumRate: number; timestamp: number; marginEnabled?: boolean }
  | { type: "WRITE_CREDIT_DEFAULT_SWAP"; cdsId: string; writerSyndicateId: string; buyerSyndicateId: string; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; notionalValue: number; premiumRate: number; timestamp: number; marginEnabled?: boolean }
  | { type: "BUY_SWF_YIELD_CDO_CDS"; cdsId: string; buyerSyndicateId: string; writerSyndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; notionalValue: number; premiumRate: number; timestamp: number; marginEnabled?: boolean }
  | { type: "WRITE_SWF_YIELD_CDO_CDS"; cdsId: string; writerSyndicateId: string; buyerSyndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; notionalValue: number; premiumRate: number; timestamp: number; marginEnabled?: boolean }
  | { type: "ADJUST_SWF_YIELD_CDO_CDS_MARGIN"; syndicateId: string; amount: number; timestamp: number }
  | { type: "OPEN_CDS_MARGIN_ACCOUNT"; syndicateId: string; initialDeposit: number; timestamp: number }
  | { type: "DEPOSIT_MARGIN_COLLATERAL"; syndicateId: string; amount: number; timestamp: number }
  | { type: "AUTHORIZE_MARGIN_REHYPOTHECATION"; syndicateId: string; vaultId: string; percentage: number; timestamp: number }
  | { type: "REVOKE_MARGIN_REHYPOTHECATION"; syndicateId: string; timestamp: number }
  | { type: "SET_MARGIN_REBALANCING_POLICY"; syndicateId: string; enabled: boolean; vaultTargets: Record<string, number>; liquidityBufferRatio: number; bufferTriggerRatio: number; timestamp: number }
  | { type: "REBALANCE_MARGIN_COLLATERAL"; syndicateId: string; timestamp: number }
  | { type: "DEPLOY_REBALANCING_ADVISOR"; syndicateId: string; enabled: boolean; timestamp: number }
  | { type: "SET_ADVISOR_SAFETY_THRESHOLD"; syndicateId: string; threshold: number; timestamp: number }
  | { type: "AUTHORIZE_SWF_MARGIN_REHYPOTHECATION"; syndicateId: string; vaultId: string; percentage: number; timestamp: number }
  | { type: "REVOKE_SWF_MARGIN_REHYPOTHECATION"; syndicateId: string; timestamp: number }
  | { type: "SET_SWF_MARGIN_REBALANCING_POLICY"; syndicateId: string; enabled: boolean; vaultTargets: Record<string, number>; liquidityBufferRatio: number; bufferTriggerRatio: number; timestamp: number }
  | { type: "SET_SWF_YIELD_ARBITRAGE_POLICY"; syndicateId: string; enabled: boolean; yieldThresholds: Record<string, number>; autoWithdrawalEnabled: boolean; timestamp: number }
  | { type: "SET_SWF_STAKING_POLICY"; syndicateId: string; enabled: boolean; stakedFactions: Record<string, number>; timestamp: number }
  | { type: "REBALANCE_SWF_MARGIN_COLLATERAL"; syndicateId: string; timestamp: number }
  | { type: "DEPLOY_SWF_REBALANCING_ADVISOR"; syndicateId: string; enabled: boolean; timestamp: number }
  | { type: "SET_SWF_ADVISOR_SAFETY_THRESHOLD"; syndicateId: string; threshold: number; timestamp: number }
  | { type: "PROPOSE_CDS_TRADE"; tradeId: string; cdsId: string; proposerSyndicateId: string; counterpartySyndicateId: string; role: "buyer" | "writer"; goldPrice: number; timestamp: number }
  | { type: "ACCEPT_CDS_TRADE"; tradeId: string; timestamp: number }
  | { type: "LOCK_REHYPOTHECATED_COLLATERAL"; syndicateId: string; vaultId: string; amount: number; durationEpochs: number; factionId: string; timestamp: number }
  | { type: "CLAIM_LIQUIDITY_MINING_REWARDS"; syndicateId: string; positionId: string; timestamp: number }
  | { type: "PROPOSE_FACTION_SPONSOR"; proposalId: string; syndicateId: string; vaultId: string; factionId: string; rewardRate: number; minLockTerms: number; timestamp: number }
  | { type: "VOTE_FACTION_SPONSOR"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SPONSOR_AUDIT"; auditId: string; syndicateId: string; vaultId: string; factionId: string; timestamp: number }
  | { type: "PROPOSE_SPONSOR_REVOCATION"; revocationId: string; syndicateId: string; vaultId: string; factionId: string; timestamp: number }
  | { type: "VOTE_SPONSOR_AUDIT"; syndicateId: string; auditId: string; vote: boolean; timestamp: number }
  | { type: "VOTE_SPONSOR_REVOCATION"; syndicateId: string; revocationId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_REWARD_SLASH"; proposalId: string; syndicateId: string; targetSyndicateId: string; slashingRate: number; maliciousActor: string; timestamp: number }
  | { type: "VOTE_REWARD_SLASH"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_REHAB_CAMPAIGN"; proposalId: string; syndicateId: string; targetActor: string; factionId: string; goldCost: number; timestamp: number }
  | { type: "VOTE_REHAB_CAMPAIGN"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_REHAB_SUBSIDY"; proposalId: string; syndicateId: string; factionId: string; subsidyPercentage: number; timestamp: number }
  | { type: "VOTE_REHAB_SUBSIDY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "LOCK_LOYALTY_BOND"; syndicateId: string; factionId: string; amount: number; timestamp: number }
  | { type: "CLAIM_LOYALTY_RANK"; proposalId: string; syndicateId: string; factionId: string; rank: "Bronze" | "Silver" | "Gold" | "Platinum"; timestamp: number }
  | { type: "VOTE_LOYALTY_RANK"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "ESTABLISH_COOPERATIVE_YIELD_CAMPAIGN"; proposalId: string; syndicateId: string; cdoId: string; campaignName: string; factionId: string; bronzeMultiplier: number; silverMultiplier: number; goldMultiplier: number; platinumMultiplier: number; timestamp: number }
  | { type: "VOTE_COOPERATIVE_YIELD_CAMPAIGN"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "ESTABLISH_FACTION_CDO_INSURANCE_POOL"; proposalId: string; syndicateId: string; cdoId: string; factionId: string; initialReserve: number; minLoyaltyRank: "None" | "Bronze" | "Silver" | "Gold" | "Platinum"; payoutRatio: number; timestamp: number }
  | { type: "VOTE_FACTION_CDO_INSURANCE_POOL"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "VOTE_MULTI_FACTION_CDO_RISK_RATING"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SOVEREIGN_BOND"; proposalId: string; syndicateId: string; factionId: string; faceValue: number; interestRate: number; termEpochs: number; timestamp: number }
  | { type: "VOTE_SOVEREIGN_BOND"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_CROSS_MESH_BRIDGE"; proposalId: string; borrowerSyndicateId: string; lenderSyndicateId: string; amount: number; interestRate: number; termSteps: number; timestamp: number }
  | { type: "VOTE_CROSS_MESH_BRIDGE"; proposalId: string; syndicateId: string; vote: boolean; timestamp: number }
  | { type: "LIST_BOND_FOR_SALE"; listingId: string; bondId: string; syndicateId: string; amount: number; askPrice: number; timestamp: number }
  | { type: "PLACE_BOND_BID"; listingId: string; syndicateId: string; bidAmount: number; timestamp: number }
  | { type: "EXECUTE_BOND_SALE"; listingId: string; syndicateId: string; buyerSyndicateId: string; timestamp: number }
  | { type: "PROPOSE_BOND_BORROW"; borrowId: string; borrowerSyndicateId: string; lenderSyndicateId: string; bondId: string; amount: number; collateralGold: number; borrowFeeRate: number; timestamp: number }
  | { type: "APPROVE_BOND_LEND"; borrowId: string; timestamp: number }
  | { type: "SHORT_SELL_BOND"; borrowId: string; buyerSyndicateId: string; salePrice: number; timestamp: number }
  | { type: "COVER_SHORT_POSITION"; borrowId: string; sellerSyndicateId: string; buybackPrice: number; timestamp: number }
  | { type: "OPEN_SOVEREIGN_BOND_FUTURES_POSITION"; syndicateId: string; bondId: string; side: "long" | "short"; size: number; leverage: number; marginCollateral: number; timestamp: number }
  | { type: "CLOSE_SOVEREIGN_BOND_FUTURES_POSITION"; syndicateId: string; positionId: string; timestamp: number }
  | { type: "VOTE_MARGIN_LIQUIDATION_INSURANCE"; syndicateId: string; allocatedGold: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_TRANSACTION_COST"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; baseTransactionCost: number; subsidyPerReputationPoint: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_MARKET_MAKER_REBATE"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; baseRebateRate: number; maxRebateRate: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_MARGIN"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; liquidationThreshold: number; penaltyRate: number; autoDeleveragingThreshold?: number; marginDeflectionFactor?: number; compoundingFactor?: number; compoundingYieldRate?: number; stressReserveScalingLimit?: number; stressReserveBufferMultiplier?: number; stressStabilizationTarget?: number; timestamp: number }
  | { type: "PROPOSE_SWF_PENALTY_WAIVER"; proposalId: string; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; waivePenalty: boolean; timestamp: number }
  | { type: "DISPUTE_SWF_PENALTY_WAIVER"; proposalId: string; timestamp: number }
  | { type: "AUTHORIZE_SWF_PENALTY_WAIVER"; proposalId: string; vote: boolean; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_INSURANCE"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; deflectionRate: number; stabilizationThreshold: number; drawdownMultiplier: number; stressVolatilityThreshold?: number; stressDeflectionMultiplier?: number; reallocationThreshold?: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; simulatedVolatilityShock: number; simulatedLiquidityShock: number; reserveMultiplier: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_HEDGING"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; hedgingActivationThreshold: number; reserveReallocationLimit: number; volatilityShockArbitrageSpreadThreshold?: number; targetBalanceLimit?: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_DELTA_HEDGING"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; targetDelta: number; rebalancingPriceTolerance: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST_DELTA_HEDGING"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; stressDeltaTarget: number; stressVolatilityThreshold: number; safetyCapitalReallocationLimit: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST_DELTA_CROSS_HEDGING"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; stressVolatilityThreshold: number; stressHedgeWeightMultiplier: number; safeguardCapitalReserveLimit: number; timestamp: number }
  | { type: "ADJUST_SWF_TRANCHE_LEVERAGE_TARGET"; syndicateId: string; trancheId: "senior" | "mezzanine" | "equity"; target: number; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_CROSS_MESH_ARBITRAGE"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; arbitrageSpreadThreshold: number; maxArbitrageVolume: number; timestamp: number }
  | { type: "ADJUST_ARBITRAGE_FEE_SURCHARGE"; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; maxLatencyHedgedOverhead: number; timestamp: number }
  | { type: "CONTRIBUTE_SWF_REINSURANCE_OPTION_CROSS_SYNDICATE_POOL"; poolId: string; syndicateId: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; amount: number; timestamp: number }
  | { type: "REQUEST_SWF_REINSURANCE_OPTION_PEER_LENDING"; requestId: string; borrowerSyndicateId: string; lenderSyndicateId?: string; poolId?: string; swfYieldCdoId: string; trancheId: "senior" | "mezzanine" | "equity"; amount: number; interestRate: number; termSteps: number; timestamp: number }
  | { type: "VOTE_SWF_REINSURANCE_OPTION_PEER_LENDING"; requestId: string; syndicateId: string; vote: boolean; timestamp: number }
  | { type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_POOL_REBALANCING"; syndicateId: string; poolId: string; riskSharingLimit: number; autoBalancingThreshold: number; yieldRebalancingMultiplier: number; timestamp: number }
  | { type: "PROPOSE_BREACH_REHAB"; proposalId: string; syndicateId: string; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; goldContribution: number; rehabSharesToRestore: number; timestamp: number }
  | { type: "VOTE_BREACH_REHAB"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_COOPERATIVE_REHAB_SUBSIDY"; proposalId: string; syndicateId: string; targetSyndicateId: string; targetRehabProposalId: string; factionId: string; subsidyPercentage: number; timestamp: number }
  | { type: "VOTE_COOPERATIVE_REHAB_SUBSIDY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_REDISTRIBUTION"; proposalId: string; syndicateId: string; targetSyndicateId: string; redistributionThreshold: number; autoCompound: boolean; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_REDISTRIBUTION"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_RANK_ADJUST"; proposalId: string; syndicateId: string; targetSyndicateId: string; targetRank: number; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_RANK_ADJUST"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_RANK_ADJUST_FEE_CALIBRATION"; proposalId: string; syndicateId: string; targetProposalFee: number; targetVoteFee: number; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_RANK_ADJUST_FEE_CALIBRATION"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_RANK_ADJUST_FEE_GOVERNANCE_CAP"; proposalId: string; syndicateId: string; targetProposalFeeCap: number; targetVoteFeeCap: number; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_RANK_ADJUST_FEE_GOVERNANCE_CAP"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_REDISTRIBUTION_FEE_GOVERNANCE_CAP"; proposalId: string; syndicateId: string; targetProposalFeeCap: number; targetVoteFeeCap: number; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_REDISTRIBUTION_FEE_GOVERNANCE_CAP"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SWEEP_POOL_VOLATILITY_HEDGING_POLICY"; proposalId: string; syndicateId: string; volatilityThreshold: number; hedgingRatio: number; reserveFloor: number; timestamp: number }
  | { type: "VOTE_SWEEP_POOL_VOLATILITY_HEDGING_POLICY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_WEATHER_FORECAST_ORACLE"; proposalId: string; syndicateId: string; oracleReputationThreshold: number; forecastAccuracyFloor: number; oracleStake?: number; timestamp: number }
  | { type: "VOTE_WEATHER_FORECAST_ORACLE"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_ORACLE_DISPUTE"; disputeId: string; syndicateId: string; anomalyStep: number; disputeStake: number; timestamp: number }
  | { type: "VOTE_ORACLE_DISPUTE"; syndicateId: string; disputeId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_MULTI_ORACLE_PENALTY_WAIVER"; proposalId: string; syndicateId: string; disputeId: string; waivePenalty: boolean; gracePeriodSteps?: number; timestamp: number }
  | { type: "VOTE_MULTI_ORACLE_PENALTY_WAIVER"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_MULTI_ORACLE_REFUND_ESCALATION"; proposalId: string; syndicateId: string; disputeId: string; refundSurchargePercent: number; timestamp: number }
  | { type: "VOTE_MULTI_ORACLE_REFUND_ESCALATION"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SECURITY_INSURANCE_POOL"; proposalId: string; syndicateId: string; allocationPercent: number; poolCap: number; timestamp: number }
  | { type: "VOTE_SECURITY_INSURANCE_POOL"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_SECURITY_INSURANCE_POOL_EMERGENCY_DRAWDOWN"; proposalId: string; syndicateId: string; timestamp: number }
  | { type: "VOTE_SECURITY_INSURANCE_POOL_EMERGENCY_DRAWDOWN"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_DEFLECTION_SURCHARGE_POLICY"; proposalId: string; syndicateId: string; baseSurchargeRate: number; poolDepthScalingFactor: number; timestamp: number }
  | { type: "VOTE_DEFLECTION_SURCHARGE_POLICY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_DEFLECTION_CAP_AND_REFUND"; proposalId: string; syndicateId: string; deflectionCap: number; emergencyRefundAllocationPercent: number; timestamp: number }
  | { type: "VOTE_DEFLECTION_CAP_AND_REFUND"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_ALLIANCE_LIQUIDITY_SUBSIDY"; proposalId: string; syndicateId: string; subsidyRate: number; minAlliedWealth: number; timestamp: number }
  | { type: "VOTE_ALLIANCE_LIQUIDITY_SUBSIDY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_ALLIANCE_YIELD_AUTO_REPAY"; proposalId: string; syndicateId: string; yieldRate: number; partitionThreshold: number; gracePeriodMultiplier?: number; creditRatingRecoveryMultiplier?: number; timestamp: number }
  | { type: "VOTE_ALLIANCE_YIELD_AUTO_REPAY"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_DEFAULT_ALERT"; proposalId: string; syndicateId: string; targetSyndicateId: string; sovereignDebtAmount: number; timestamp: number }
  | { type: "VOTE_DEFAULT_ALERT"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_RESOLVE_DEFAULT_ALERT"; proposalId: string; syndicateId: string; targetSyndicateId: string; alertProposalId: string; timestamp: number }
  | { type: "VOTE_RESOLVE_DEFAULT_ALERT"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_DEFAULT_GRACE_PERIOD"; proposalId: string; syndicateId: string; targetSyndicateId: string; alertProposalId: string; gracePeriodSteps: number; timestamp: number }
  | { type: "VOTE_DEFAULT_GRACE_PERIOD"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_DEFAULT_PENALTY_WAIVER"; proposalId: string; syndicateId: string; targetSyndicateId: string; alertProposalId: string; timestamp: number }
  | { type: "VOTE_DEFAULT_PENALTY_WAIVER"; syndicateId: string; proposalId: string; vote: boolean; timestamp: number }
  | { type: "PURCHASE_CDS_CONTRACT"; cdsId: string; buyerSyndicateId: string; writerSyndicateId: string; targetSyndicateId: string; notionalValue: number; timestamp: number }
  | { type: "SETTLE_CDS_CLAIMS"; cdsId: string; buyerSyndicateId: string; timestamp: number }
  | { type: "LIST_CDS_FOR_SALE"; cdsId: string; sellerSyndicateId: string; askPrice: number; timestamp: number }
  | { type: "BID_ON_CDS_CONTRACT"; cdsId: string; bidderSyndicateId: string; bidPrice: number; timestamp: number }
  | { type: "TRANSFER_CDS_OWNERSHIP"; cdsId: string; sellerSyndicateId: string; buyerSyndicateId: string; price: number; timestamp: number }
  | { type: "CREATE_CDS_CDO_POOL"; cdoId: string; creatorSyndicateId: string; cdsIds: string[]; timestamp: number }
  | { type: "INVEST_IN_CDO_TRANCHE"; cdoId: string; investorSyndicateId: string; trancheId: string; amount: number; timestamp: number }
  | { type: "LIST_CDS_CDO_TRANCHE_FOR_SALE"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; sellerSyndicateId: string; sharesAmount: number; askPrice: number; timestamp: number }
  | { type: "BID_ON_CDS_CDO_TRANCHE"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; bidderSyndicateId: string; sharesAmount: number; bidPrice: number; timestamp: number }
  | { type: "ADJUST_CDS_CDO_TRANCHE_MARGIN"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; syndicateId: string; amount: number; timestamp: number }
  | { type: "TRIGGER_CDO_AUTOCALL"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; syndicateId: string; timestamp: number }
  | { type: "ADJUST_CDS_CDO_TRANCHE_LEVERAGE"; cdoId: string; trancheId: "senior" | "mezzanine" | "equity"; syndicateId: string; leverageRatio: number; deleveragingThreshold: number; timestamp: number }
  | { type: "SET_CDS_CDO_CROSS_TRANCHE_HEDGING"; proposalId: string; cdoId: string; syndicateId: string; targetTrancheId: "senior" | "mezzanine"; allocationPercent: number; timestamp: number }
  | { type: "SET_CDS_CDO_HEDGING_RESERVE_FLOOR_AND_CAP"; proposalId: string; cdoId: string; syndicateId: string; reserveFloor: number; governanceCap: number; timestamp: number }
  | { type: "LIQUIDITY_INJECTION_PROPOSAL"; proposalId: string; cdoId: string; syndicateId: string; amount: number; timestamp: number }
  | { type: "PROPOSE_CDO_COINVESTMENT"; proposalId: string; cdoId: string; creatorSyndicateId: string; targetAmount: number; timestamp: number }
  | { type: "JOIN_CDO_COINVESTMENT"; proposalId: string; syndicateId: string; amount: number; timestamp: number }
  | { type: "LOCK_CDO_COINVESTMENT"; proposalId: string; syndicateId: string; timestamp: number }
  | { type: "PROPOSE_CDO_COINVESTMENT_YIELD_SHARE"; proposalId: string; cdoId: string; syndicateId: string; yieldCompensationShare: number; timestamp: number }
  | { type: "PROPOSE_CDO_COINVESTMENT_YIELD_REINVESTMENT"; proposalId: string; cdoId: string; syndicateId: string; yieldReinvestmentShare: number; timestamp: number }
  | { type: "PROPOSE_CDO_COINVESTMENT_REINVESTMENT_POLICY"; proposalId: string; cdoId: string; syndicateId: string; tier1Threshold: number; tier1Multiplier: number; tier2Threshold: number; tier2Multiplier: number; slashingThreshold: number; slashingPenalty: number; timestamp: number }
  | { type: "VOTE_CDO_COINVESTMENT_REINVESTMENT_POLICY"; proposalId: string; syndicateId: string; vote: boolean; timestamp: number }
  | { type: "PROPOSE_CDO_YIELD_HEDGING_POLICY"; proposalId: string; cdoId: string; syndicateId: string; premiumPricingSpread: number; automatedHedgeEnabled: boolean; dynamicMatchingEnabled?: boolean; dynamicLiquidityFloor?: number; timestamp: number }
  | { type: "VOTE_CDO_YIELD_HEDGING_POLICY"; proposalId: string; syndicateId: string; vote: boolean; timestamp: number }
  | { type: "PURCHASE_CDO_YIELD_HEDGING_OPTION"; optionId: string; cdoId: string; syndicateId: string; coverageAmount: number; timestamp: number }
  | { type: "LIST_CDO_YIELD_HEDGING_OPTION"; optionId: string; sellerSyndicateId: string; askPrice: number; timestamp: number }
  | { type: "BID_ON_CDO_YIELD_HEDGING_OPTION"; bidId: string; optionId: string; bidderSyndicateId: string; bidPrice: number; timestamp: number }
  | { type: "PROPOSE_CDO_YIELD_HEDGING_FEE_POLICY"; proposalId: string; cdoId: string; syndicateId: string; secondaryFeePercent: number; timestamp: number }
  | { type: "VOTE_CDO_YIELD_HEDGING_FEE_POLICY"; proposalId: string; syndicateId: string; vote: boolean; timestamp: number }
  | { type: "STAKE_CDO_YIELD_HEDGING_OPTION"; cdoId: string; amount: number; timestamp: number }
  | { type: "UNSTAKE_CDO_YIELD_HEDGING_OPTION"; cdoId: string; amount: number; timestamp: number }
  | { type: "TRANSFER_CDO_YIELD_HEDGING_OPTION"; optionId: string; sellerSyndicateId: string; buyerSyndicateId: string; price: number; timestamp: number };










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

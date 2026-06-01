import { GameState, cloneMerchantInventories, getSafehouseStorageCapacity, getSyndicateBankCapacity, getCollateralValue, getSecondaryReserveVaults, getSyndicateFactionLoyaltyRank, isRankAtLeast, getBondCurrentYield, getBondVolatility, calculateOptionPremium, recalculateSWFYieldCDORiskRatings, getCDOTrancheReinsurancePremiumRate, SWFReinsuranceOptionOrderBookDepth, reconcileSWFYieldCDOCDSs, SWFReinsuranceOptionVolatilityInsurancePool, SWFMultiFundReinsurancePool, SWFReinsuranceOptionCrossSyndicatePool, getSyndicateFactionStanding, distributeOptionFeeDividends, isFactionAlliedToSyndicate } from "./state.js";
import { PureRand } from "./rng.js";

/**
 * Calculates dynamic trade cost or payout based on base price, weather climate_pricing, and NPC reputation.
 */
export function calculateTradePrice(
  state: GameState,
  npc: any,
  packObj: any,
  baseCost: number,
  isBuy: boolean,
  traderId: string = "player",
  pack?: any
): number {
  let multiplier = 1.0;
  const isSafehouse = state.safehouses && state.safehouses[state.current] !== undefined;
  const traderSyndicates = Object.values(state.syndicates || {}).filter(s => s.members.includes(traderId));

  // Check for active Reserve Sweep dynamic tariff liquidation (AF-125)
  let activeSweepPolicy: any = undefined;
  for (const synd of traderSyndicates) {
    const policy = state.reserveSweepPolicies?.[synd.id];
    if (policy && policy.active) {
      activeSweepPolicy = policy;
      break;
    }
  }

  if (activeSweepPolicy) {
    if (isBuy) {
      multiplier *= (1.0 + activeSweepPolicy.tariffLiquidationRate);
    } else {
      multiplier *= Math.max(0.1, 1.0 - activeSweepPolicy.tariffLiquidationRate);
    }
  }

  // 1. Weather/Climate Multiplier
  if (state.environment?.weather) {
    const weather = state.environment.weather;
    if (npc?.climate_pricing && npc.climate_pricing[weather] !== undefined) {
      multiplier *= npc.climate_pricing[weather];
    }
    if (packObj?.climate_pricing && packObj.climate_pricing[weather] !== undefined) {
      multiplier *= packObj.climate_pricing[weather];
    }
  }

  // 2. Reputation Modifier (NPC specific)
  const rep = state.npcRep?.[npc.id] ?? 0;
  if (isBuy) {
    // Higher reputation means lower buy prices (discount)
    const repBuyFactor = Math.max(0.5, Math.min(1.5, 1.0 - rep * 0.02));
    multiplier *= repBuyFactor;
  } else {
    // Higher reputation means higher sell payouts (bonus)
    const repSellFactor = Math.max(0.5, Math.min(1.5, 1.0 + rep * 0.02));
    multiplier *= repSellFactor;
  }

  // 3. Faction Territory Control Modifier (AF-29)
  const controllingFactionId = state.territoryControl?.[state.current];
  if (controllingFactionId && !isSafehouse) {
    const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
    if (isBuy) {
      // Positive faction reputation gives a discount; negative reputation acts as a price penalty (markup)
      const factionBuyFactor = Math.max(0.5, Math.min(1.5, 1.0 - factionRep * 0.02));
      multiplier *= factionBuyFactor;
    } else {
      // Positive faction reputation gives a higher sell payout; negative reputation acts as a sell penalty (lower payout)
      const factionSellFactor = Math.max(0.5, Math.min(1.5, 1.0 + factionRep * 0.02));
      multiplier *= factionSellFactor;
    }
  }

  // 3c. Faction War Strategic Pricing Modifier (AF-71)
  const npcFactionId = npc?.faction || controllingFactionId;
  const isAtWarWithFaction = npcFactionId && traderSyndicates.some(s => state.factionWars?.[s.id]?.[npcFactionId] === true);
  if (isAtWarWithFaction) {
    if (isBuy) {
      multiplier *= 2.0; // Double price for buying from hostile faction
    } else {
      multiplier *= 0.5; // Halve payout for selling to hostile faction
    }
  }

  // 3b. Crime Syndicate Turf Reputation Modifier (AF-55)
  const controllingSyndicateId = state.syndicateTurf?.[state.current];
  if (controllingSyndicateId && !isSafehouse) {
    const syndicateRep = state.factionRep?.[controllingSyndicateId] ?? 0;
    if (isBuy) {
      // Positive reputation gives a discount; negative reputation acts as a price penalty (markup)
      const syndicateBuyFactor = Math.max(0.5, Math.min(1.5, 1.0 - syndicateRep * 0.02));
      multiplier *= syndicateBuyFactor;
    } else {
      // Positive reputation gives a higher sell payout; negative reputation acts as a sell penalty (lower payout)
      const syndicateSellFactor = Math.max(0.5, Math.min(1.5, 1.0 + syndicateRep * 0.02));
      multiplier *= syndicateSellFactor;
    }
  }

  // 4. Faction Territory Merchant Tariff (AF-35)
  if (controllingFactionId && !isSafehouse) {
    const hasLicense = state.merchantLicenses?.[traderId]?.includes(controllingFactionId) || false;
    if (!hasLicense) {
      const licensing = state.merchantLicensings?.[controllingFactionId];
      const tariffRate = state.tariffPolicy?.[controllingFactionId] ?? licensing?.tariffRate ?? 0;
      if (tariffRate > 0) {
        const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
        const waiverThreshold = licensing?.tariffWaiverThreshold ?? 20;
        const discountThreshold = licensing?.tariffDiscountThreshold ?? 10;

        let effectiveTariffRate = tariffRate;
        if (factionRep >= waiverThreshold) {
          effectiveTariffRate = 0;
        } else if (factionRep >= discountThreshold) {
          effectiveTariffRate = tariffRate / 2;
        }

        // High-Reputation Tariff Exemption Acts (AF-80)
        let isTariffExempt = false;
        if (state.tariffExemptionPolicies?.[controllingFactionId]) {
          const approvedSyndicates = state.tariffExemptionPolicies[controllingFactionId];
          const hasApprovedSyndicate = traderSyndicates.some(s => approvedSyndicates[s.id] === true);
          if (hasApprovedSyndicate && factionRep >= 30) {
            isTariffExempt = true;
          }
        }
        if (isTariffExempt) {
          effectiveTariffRate = 0;
        }

        // Faction Loyalty Bond Automatic Tariff Waiver (AF-119)
        let hasLoyaltyWaiver = false;
        if (state.factionLoyaltyBonds) {
          for (const synd of traderSyndicates) {
            const bondId = `${synd.id}-${controllingFactionId}`;
            const bond = state.factionLoyaltyBonds[bondId];
            if (bond && bond.lockedGold > 0) {
              hasLoyaltyWaiver = true;
              break;
            }
          }
        }
        if (hasLoyaltyWaiver) {
          effectiveTariffRate = 0;
        }

        // Mastermind Contract allied faction tariff override (AF-77)
        let mastermindOverride = false;
        if (state.mastermindContracts) {
          const activeContracts = Object.values(state.mastermindContracts).filter(c => c.status === "active");
          for (const contract of activeContracts) {
            const synd = state.syndicates?.[contract.syndicateId];
            if (synd && synd.members.includes(traderId)) {
              if (state.alliances && (
                state.alliances[controllingFactionId]?.[contract.syndicateId] === "allied" ||
                state.alliances[contract.syndicateId]?.[controllingFactionId] === "allied"
              )) {
                mastermindOverride = true;
                break;
              }
            }
          }
        }
        if (mastermindOverride) {
          effectiveTariffRate = 0;
        }

        if (effectiveTariffRate > 0) {
          if (isBuy) {
            multiplier *= (1.0 + effectiveTariffRate / 100.0);
          } else {
            multiplier *= Math.max(0.1, 1.0 - effectiveTariffRate / 100.0);
          }
        }
      }
    }
  }

  // 5. Local Inventory-Based Dynamic Pricing (AF-37)
  if ((npc?.dynamic_pricing || state.vars["dynamic_pricing"] || state.flags["dynamic_pricing"]) && npc?.id && packObj?.id) {
    const stock = state.merchantInventories?.[npc.id] ?? [];
    const count = stock.filter((itemId: string) => itemId === packObj.id).length;

    if (isBuy) {
      // Player buys from merchant: high supply -> cheap, low supply -> expensive
      if (count === 0) {
        multiplier *= 1.5;
      } else if (count === 1) {
        multiplier *= 1.2;
      } else if (count === 2) {
        multiplier *= 1.0;
      } else {
        multiplier *= Math.max(0.5, 1.0 - (count - 2) * 0.15);
      }
    } else {
      // Player sells to merchant: low supply -> premium payout, high supply -> lower payout
      if (count === 0) {
        multiplier *= 1.5;
      } else if (count === 1) {
        multiplier *= 1.0;
      } else {
        multiplier *= Math.max(0.4, 1.0 - (count - 1) * 0.2);
      }
    }
  }

  // 6. Guild Memberships, Policies, and Collective Bargaining (AF-38)
  if (state.merchantGuilds && npc?.id) {
    for (const [guildId, guild] of Object.entries(state.merchantGuilds)) {
      if (guild.members.includes(npc.id)) {
        // Check if the trader is a member of this guild
        const isTraderMember = state.guildMemberships?.[traderId]?.includes(guildId) || false;
        const guildPolicy = state.guildPolicies?.[guildId];

        // Collective Bargaining Agreements override standard faction territory tariffs
        if (controllingFactionId && !isSafehouse) {
          const cbaKey = `${guildId}:${controllingFactionId}`;
          const agreement = state.collectiveBargainingAgreements?.[cbaKey];
          if (agreement && !isTraderMember) {
            const licensing = state.merchantLicensings?.[controllingFactionId];
            const standardTariff = state.tariffPolicy?.[controllingFactionId] ?? licensing?.tariffRate ?? 0;
            if (standardTariff > 0) {
              const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
              const waiverThreshold = licensing?.tariffWaiverThreshold ?? 20;
              const discountThreshold = licensing?.tariffDiscountThreshold ?? 10;

              let standardEffectiveRate = standardTariff;
              if (factionRep >= waiverThreshold) {
                standardEffectiveRate = 0;
              } else if (factionRep >= discountThreshold) {
                standardEffectiveRate = standardTariff / 2;
              }

              // Faction Loyalty Bond Automatic Tariff Waiver (AF-119)
              let hasLoyaltyWaiver = false;
              if (state.factionLoyaltyBonds) {
                for (const synd of traderSyndicates) {
                  const bondId = `${synd.id}-${controllingFactionId}`;
                  const bond = state.factionLoyaltyBonds[bondId];
                  if (bond && bond.lockedGold > 0) {
                    hasLoyaltyWaiver = true;
                    break;
                  }
                }
              }
              if (hasLoyaltyWaiver) {
                standardEffectiveRate = 0;
              }

              if (standardEffectiveRate > 0) {
                // De-apply standard effective tariff rate
                if (isBuy) {
                  multiplier /= (1.0 + standardEffectiveRate / 100.0);
                } else {
                  multiplier /= Math.max(0.1, 1.0 - standardEffectiveRate / 100.0);
                }
              }
            }

            // Apply CBA agreed tariff rate
            const appliedTariffRate = agreement.agreedTariff;
            if (appliedTariffRate > 0) {
              if (isBuy) {
                multiplier *= (1.0 + appliedTariffRate / 100.0);
              } else {
                multiplier *= Math.max(0.1, 1.0 - appliedTariffRate / 100.0);
              }
            }
          }
        }

        // Apply member discount / markup
        if (isTraderMember) {
          if (isBuy) {
            multiplier *= 0.85; // 15% discount for buying from own guild
          } else {
            multiplier *= 1.15; // 15% bonus for selling to own guild
          }
        } else if (!isSafehouse) {
          // Non-member guild tariff markup/markdown
          if (guildPolicy) {
            const guildTariff = guildPolicy.tariffRate;
            if (guildTariff > 0) {
              if (isBuy) {
                multiplier *= (1.0 + guildTariff / 100.0);
              } else {
                multiplier *= Math.max(0.1, 1.0 - guildTariff / 100.0);
              }
            }
          }
        }

        // Export pricing policy modifier
        if (guildPolicy) {
          const policy = guildPolicy.exportPricingPolicy;
          if (policy === "premium") {
            if (isBuy) {
              multiplier *= 1.25;
            } else {
              multiplier *= 1.15;
            }
          } else if (policy === "discount") {
            if (isBuy) {
              multiplier *= 0.85;
            } else {
              multiplier *= 0.80;
            }
          }
        }
      }
    }
  }

  // 7. Cartel Price Collusion & Coordinated Pricing Hikes (AF-39) & Global Propaganda Network (AF-74)
  if (state.cartels && npc?.id) {
    let cartelPriceMultiplier = 1.0;
    
    // Sum up the global propaganda campaign levels
    let totalPropagandaLevel = 0;
    if (state.propagandaCampaigns) {
      for (const campaign of Object.values(state.propagandaCampaigns)) {
        totalPropagandaLevel += campaign.level;
      }
    }

    for (const [cartelId, cartel] of Object.entries(state.cartels)) {
      if (cartel.members.includes(npc.id)) {
        const policy = state.cartelPolicies?.[cartelId];
        const baseMultiplierVal = policy?.priceMultiplier ?? cartel.priceMultiplier ?? 1.0;

        // Check standard room competition: cartel merchants represent >= 50% in the room
        let localCartelActive = false;
        if (pack?.rooms) {
          const room = pack.rooms.find((r: any) => r.npcs?.includes(npc.id));
          if (room && room.npcs) {
            const localMerchants = room.npcs.filter((nid: string) => 
              pack.npcs?.some((n: any) => n.id === nid)
            );
            const cartelMerchants = localMerchants.filter((nid: string) => 
              cartel.members.includes(nid)
            );
            const totalCount = localMerchants.length;
            const cartelCount = cartelMerchants.length;
            if (totalCount > 0 && (cartelCount / totalCount >= 0.5)) {
              localCartelActive = true;
            }
          }
        }

        // Check if we are in an allied faction territory and global propaganda network is active
        let globalPropagandaActive = false;
        const controllingFactionId = state.territoryControl?.[state.current];
        if (controllingFactionId && cartel.factionId && totalPropagandaLevel > 0) {
          const isAlliedFaction = controllingFactionId === cartel.factionId || 
            (state.alliances && (
              state.alliances[controllingFactionId]?.[cartel.factionId] === "allied" ||
              state.alliances[cartel.factionId]?.[controllingFactionId] === "allied"
            ));
          if (isAlliedFaction) {
            globalPropagandaActive = true;
          }
        }

        if (localCartelActive || globalPropagandaActive) {
          let currentMultiplierVal = baseMultiplierVal;
          if (globalPropagandaActive) {
            // Scale cartel price adjustments across all allied faction territories using global propaganda level
            currentMultiplierVal = 1.0 + (baseMultiplierVal - 1.0) * (1.0 + totalPropagandaLevel * 0.15);
          }
          cartelPriceMultiplier = Math.max(cartelPriceMultiplier, currentMultiplierVal);
        }
      }
    }
    
    if (isBuy) {
      multiplier *= cartelPriceMultiplier;
    }
  }

  // 8. Regional Black Market Smuggling Payouts for Contraband (AF-40)
  if (packObj) {
    const isPackContraband = packObj.contraband === true;
    const isBlacklisted = state.contrabandBlacklist?.[packObj.id]?.blacklisted === true;
    if (isPackContraband || isBlacklisted) {
      if (!isBuy) {
        let contrabandMultiplier = 1.2; // Default premium
        const payoutEntry = state.blackMarketPayouts?.[state.current];
        if (payoutEntry && payoutEntry.payout > 0) {
          contrabandMultiplier = payoutEntry.payout / 100.0;
        }
        multiplier *= contrabandMultiplier;

        // Mastermind Contract global contraband payout arbitrage (AF-77)
        if (state.mastermindContracts) {
          const activeContracts = Object.values(state.mastermindContracts).filter(c => c.status === "active");
          for (const contract of activeContracts) {
            const synd = state.syndicates?.[contract.syndicateId];
            if (synd && synd.members.includes(traderId)) {
              multiplier *= contract.payoutArbitrageMultiplier;
              break;
            }
          }
        }
      }

      // Apply global market price multipliers for contraband based on regional supply, syndicate dominance, and enforcement pressure (AF-44)
      const existingLab = state.productionLabs?.[state.current];
      let supplyFactor = 1.0;
      if (existingLab) {
        const supply = existingLab.storedContraband;
        if (supply === 0) {
          supplyFactor = 1.5;
        } else if (supply <= 5) {
          supplyFactor = 1.2;
        } else if (supply <= 10) {
          supplyFactor = 1.0;
        } else {
          supplyFactor = Math.max(0.4, 1.0 - (supply - 10) * 0.03);
        }
      }
      multiplier *= supplyFactor;

      const controllingSyndicateId = state.syndicateTurf?.[state.current];
      if (controllingSyndicateId) {
        const dominance = state.syndicates?.[controllingSyndicateId]?.dominance ?? 50;
        const dominanceMultiplier = 1.0 + (dominance - 50) * 0.01;
        multiplier *= dominanceMultiplier;
      }

      const heatEntry = state.enforcementHeat?.[state.current];
      const heatVal = heatEntry ? heatEntry.heat : 0;
      const activeEnforcers = Object.values(state.enforcers || {}).filter(e => e.currentRoom === state.current && (e as any).status !== "defeated").length;
      const pressure = heatVal + (activeEnforcers * 20);
      const pressureMultiplier = 1.0 + (pressure * 0.02);
      multiplier *= pressureMultiplier;

      // Allied Syndicate Member contraband pricing discount/bonus or Safehouse Black Market Strategic scaling
      if (isSafehouse && state.safehouses && state.syndicates) {
        const safehouse = state.safehouses[state.current];
        if (safehouse) {
          const ownerSyndicateId = safehouse.syndicateId;
          const traderSyndicates = Object.values(state.syndicates).filter(s => s.members.includes(traderId));
          
          let isOwnerMember = traderSyndicates.some(s => s.id === ownerSyndicateId);
          let isAlliedSyndicate = false;
          
          if (!isOwnerMember) {
            for (const ts of traderSyndicates) {
              if (state.syndicateAlliances?.[ts.id]?.[ownerSyndicateId] === "allied" ||
                  state.syndicateAlliances?.[ownerSyndicateId]?.[ts.id] === "allied") {
                isAlliedSyndicate = true;
                break;
              }
            }
          }
          
          if (isOwnerMember) {
            if (isBuy) {
              multiplier *= 0.80; // 20% strategic discount
            } else {
              multiplier *= 1.20; // 20% strategic premium
            }
          } else if (isAlliedSyndicate) {
            if (isBuy) {
              multiplier *= 0.90; // 10% strategic discount (scaled)
            } else {
              multiplier *= 1.10; // 10% strategic premium (scaled)
            }
          }
        }
      } else {
        // Default contraband pricing logic
        let isAlliedSyndicateMember = false;
        if (state.syndicates && npc?.id) {
          // 1. Check if they belong to the same syndicate
          for (const syndicate of Object.values(state.syndicates)) {
            if (syndicate.members.includes(traderId) && syndicate.members.includes(npc.id)) {
              isAlliedSyndicateMember = true;
              break;
            }
          }
          // 2. Check if player belongs to a syndicate allied with NPC's faction/syndicate
          if (!isAlliedSyndicateMember) {
            const npcFaction = npc.faction;
            if (npcFaction) {
              const playerSyndicates = Object.values(state.syndicates).filter(s => s.members.includes(traderId));
              for (const playerSynd of playerSyndicates) {
                if (state.alliances?.[playerSynd.id]?.[npcFaction] === "allied" || 
                    state.alliances?.[npcFaction]?.[playerSynd.id] === "allied") {
                  isAlliedSyndicateMember = true;
                  break;
                }
              }
            }
          }
          // 3. Check direct faction alliances
          if (!isAlliedSyndicateMember && npc.faction && state.alliances) {
            for (const [otherFaction, rep] of Object.entries(state.factionRep || {})) {
              if (rep > 0 && state.alliances[npc.faction]?.[otherFaction] === "allied") {
                isAlliedSyndicateMember = true;
                break;
              }
            }
          }
        }

        if (isAlliedSyndicateMember) {
          if (isBuy) {
            multiplier *= 0.80; // 20% strategic discount for purchase
          } else {
            multiplier *= 1.20; // 20% strategic premium for selling
          }
        }
      }
    }
  }

  // AF-226: Dynamic Strategic Pricing under default alert
  const hasActiveDefaultAlert = traderSyndicates.some(s => {
    return Object.values(state.sovereignDebtDefaultAlerts || {}).some(alert => {
      if (alert.targetSyndicateId !== s.id || alert.status !== "authorized" || alert.resolved) {
        return false;
      }

      // AF-227: Defer pricing penalty if active grace period or authorized waiver is in effect
      const isGracePeriodActive = Object.values(state.sovereignDebtDefaultGracePeriods || {}).some(
        (gp: any) => gp.alertProposalId === alert.proposalId && gp.status === "authorized" && gp.remainingSteps !== undefined && gp.remainingSteps > 0
      );

      const isWaiverActive = Object.values(state.sovereignDebtDefaultPenaltyWaivers || {}).some(
        (pw: any) => pw.alertProposalId === alert.proposalId && pw.status === "authorized" && !pw.resolved
      );

      if (isGracePeriodActive || isWaiverActive) {
        return false;
      }

      return true;
    });
  });
  if (hasActiveDefaultAlert) {
    if (isBuy) {
      multiplier *= 1.5; // default alert pricing penalty (50% markup)
    } else {
      multiplier *= 0.5; // default alert payout penalty (50% markdown)
    }
  }

  const finalCost = Math.round(baseCost * multiplier);
  return Math.max(1, finalCost); // price never drops below 1 gold
}

/**
 * Checks if the player has sufficient reputation to trade with the NPC.
 */
export function checkReputationTrade(
  state: GameState,
  npc: any,
  minRep?: number
): { allowed: boolean; reason?: string } {
  // 1. NPC Reputation Check
  const rep = state.npcRep?.[npc.id] ?? 0;
  const threshold = minRep !== undefined ? minRep : (npc?.min_rep !== undefined ? npc.min_rep : undefined);
  
  if (threshold !== undefined && rep < threshold) {
    return {
      allowed: false,
      reason: `The merchant refuses to trade with you due to your poor reputation (requires ${threshold}, you have ${rep}).`,
    };
  }

  // 2. Faction Reputation Check
  if (npc?.faction && (minRep !== undefined || npc?.min_rep !== undefined)) {
    const factionRep = state.factionRep?.[npc.faction] ?? 0;
    const minFactionRep = minRep !== undefined ? minRep : npc.min_rep;
    if (factionRep < minFactionRep) {
      return {
        allowed: false,
        reason: `The merchant refuses to trade with you due to your poor standing with their faction, ${npc.faction} (requires ${minFactionRep}, you have ${factionRep}).`,
      };
    }
  }

  // 3. Enforcer Heat Check
  const currentRoomId = state.current;
  const currentHeat = state.enforcementHeat?.[currentRoomId]?.heat ?? 0;
  const maxHeat = npc?.max_heat !== undefined ? npc.max_heat : 50; // default limit is 50
  if (currentHeat > maxHeat) {
    return {
      allowed: false,
      reason: `The merchant is too spooked to trade due to high enforcement heat in the area (heat: ${currentHeat}, limit: ${maxHeat}).`,
    };
  }

  // Enforce Cartel Embargoes!
  if (state.cartels && npc?.id) {
    for (const [cartelId, cartel] of Object.entries(state.cartels)) {
      if (cartel.members.includes(npc.id)) {
        const cartelPolicy = state.cartelPolicies?.[cartelId];
        const embargoedFactions = cartelPolicy?.embargoedFactions ?? [];
        for (const factionId of embargoedFactions) {
          const factionRep = state.factionRep?.[factionId] ?? 0;
          if (factionRep > 0) {
            return {
              allowed: false,
              reason: `The merchant is part of the ${cartel.name} cartel, which has active embargoes against faction ${factionId} (reputation: ${factionRep}).`,
            };
          }
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * Gets the merchant's current gold, initializing it from the pack if needed.
 */
export function getMerchantGold(state: GameState, npc: any): number {
  if (state.merchantGold && state.merchantGold[npc.id] !== undefined) {
    return state.merchantGold[npc.id];
  }
  const startingGold = npc?.gold ?? npc?.gold_limit ?? 100;
  if (!state.merchantGold) {
    state.merchantGold = {};
  }
  state.merchantGold[npc.id] = startingGold;
  return startingGold;
}

function findOptimalAdvisorAllocations(
  vaults: any[],
  safetyThreshold: number
): Record<string, number> {
  const maxRisk = safetyThreshold / 100;
  let bestYield = -1;
  let bestAllocations: Record<string, number> = {};

  if (vaults.length === 0) return {};

  if (vaults.length === 1) {
    return { [vaults[0].vaultId]: 100 };
  }

  const n = vaults.length;
  
  function search(index: number, remaining: number, currentAlloc: Record<string, number>) {
    if (index === n - 1) {
      currentAlloc[vaults[index].vaultId] = remaining;
      
      let weightedRisk = 0;
      let weightedYield = 0;
      for (let i = 0; i < n; i++) {
        const v = vaults[i];
        const w = currentAlloc[v.vaultId];
        weightedRisk += (w / 100) * v.sweepRisk;
        weightedYield += (w / 100) * v.interestRate;
      }

      if (weightedRisk <= maxRisk) {
        if (weightedYield > bestYield || (Math.abs(weightedYield - bestYield) < 1e-9 && Object.keys(bestAllocations).length === 0)) {
          bestYield = weightedYield;
          bestAllocations = { ...currentAlloc };
        }
      }
      return;
    }

    for (let w = 0; w <= remaining; w++) {
      currentAlloc[vaults[index].vaultId] = w;
      search(index + 1, remaining - w, currentAlloc);
    }
  }

  search(0, 100, {});

  if (Object.keys(bestAllocations).length === 0) {
    let safestVault = vaults[0];
    for (const v of vaults) {
      if (v.sweepRisk < safestVault.sweepRisk) {
        safestVault = v;
      }
    }
    bestAllocations = { [safestVault.vaultId]: 100 };
  }

  return bestAllocations;
}

/**
 * Recalculates SWF Reinsurance Option Order Book Volumes and Depths (AF-151).
 */
export function recalculateReinsuranceOptionOrderBookMetrics(state: GameState): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionOrderBookVolumes: state.swfReinsuranceOptionOrderBookVolumes ? { ...state.swfReinsuranceOptionOrderBookVolumes } : {},
    swfReinsuranceOptionOrderBookDepths: state.swfReinsuranceOptionOrderBookDepths ? { ...state.swfReinsuranceOptionOrderBookDepths } : {},
    swfReinsuranceOptionVolatilityInsurancePools: state.swfReinsuranceOptionVolatilityInsurancePools ? JSON.parse(JSON.stringify(state.swfReinsuranceOptionVolatilityInsurancePools)) : {},
    journal: state.journal ? [...state.journal] : [],
  };

  if (newState.swfYieldCDOs) {
    for (const cdoId of Object.keys(newState.swfYieldCDOs)) {
      for (const trancheId of ["senior", "mezzanine", "equity"]) {
        const key = `${cdoId}_${trancheId}`;
        newState.swfReinsuranceOptionOrderBookVolumes![key] = 0;
        if (!newState.swfReinsuranceOptionOrderBookDepths![key]) {
          newState.swfReinsuranceOptionOrderBookDepths![key] = {
            buyVolume: 0,
            sellVolume: 0,
            imbalance: 0,
            spreadAdjustment: 1.0,
            bidAskSpread: 0,
          };
        }
      }
    }
  }

  const allOpenOrders = Object.values(newState.swfReinsuranceOptionLimitOrders || {}).filter(
    (o) => o.status === "Open"
  );

  // Group by CDO/tranche key
  const groupedOrders: Record<string, typeof allOpenOrders> = {};
  if (newState.swfYieldCDOs) {
    for (const cdoId of Object.keys(newState.swfYieldCDOs)) {
      for (const trancheId of ["senior", "mezzanine", "equity"]) {
        groupedOrders[`${cdoId}_${trancheId}`] = [];
      }
    }
  }

  for (const order of allOpenOrders) {
    const key = `${order.swfYieldCdoId}_${order.trancheId}`;
    if (!groupedOrders[key]) groupedOrders[key] = [];
    groupedOrders[key].push(order);
  }

  for (const [key, orders] of Object.entries(groupedOrders)) {
    const totalVolume = orders.reduce((sum, o) => sum + o.limitPrice, 0);
    newState.swfReinsuranceOptionOrderBookVolumes![key] = totalVolume;

    const buyOrders = orders.filter((o) => o.orderType === "buy");
    const sellOrders = orders.filter((o) => o.orderType === "sell");

    const buyVolume = buyOrders.reduce((sum, o) => sum + o.limitPrice, 0);
    const sellVolume = sellOrders.reduce((sum, o) => sum + o.limitPrice, 0);
    const imbalance = buyVolume - sellVolume;

    const highestBuyPrice = buyOrders.length > 0 ? Math.max(...buyOrders.map((o) => o.limitPrice)) : 0;
    const lowestSellPrice = sellOrders.length > 0 ? Math.min(...sellOrders.map((o) => o.limitPrice)) : 0;
    let bidAskSpread = (highestBuyPrice > 0 && lowestSellPrice > 0) ? Math.max(0, lowestSellPrice - highestBuyPrice) : 0;

    let optionCdoId = "";
    let trancheId = "";
    if (key.includes("_")) {
      const idx = key.lastIndexOf("_");
      optionCdoId = key.substring(0, idx);
      trancheId = key.substring(idx + 1);
    }

    // Apply consensual spread adjustment factor (AF-190)
    let spreadAdjustmentFactor = 1.0;
    if (newState.swfReinsuranceOptionSpreadAdjustmentProposals) {
      for (const prop of Object.values(newState.swfReinsuranceOptionSpreadAdjustmentProposals)) {
        if (prop.swfYieldCdoId === optionCdoId &&
            prop.trancheId === trancheId &&
            prop.status === "authorized") {
          spreadAdjustmentFactor = prop.spreadAdjustmentFactor;
          break;
        }
      }
    }
    if (spreadAdjustmentFactor !== 1.0 && bidAskSpread > 0) {
      const originalSpread = bidAskSpread;
      bidAskSpread = Math.round(bidAskSpread * spreadAdjustmentFactor);
      newState.journal.push(
        `[SWF Reinsurance Option Spread Adjustment Applied] Consensual spread adjustment factor ${spreadAdjustmentFactor} applied on ${key}. Adjusted bid-ask spread from ${originalSpread} to ${bidAskSpread} gold.`
      );
    }

    // Enforce consensus-voted dynamic volatility floor (AF-191) with AF-192 auto-adjustment under liquidity depletion
    let volatilityFloor = 0.0;
    if (newState.swfReinsuranceOptionVolatilityFloorProposals) {
      for (const prop of Object.values(newState.swfReinsuranceOptionVolatilityFloorProposals)) {
        if (prop.swfYieldCdoId === optionCdoId &&
            prop.trancheId === trancheId &&
            prop.status === "authorized") {
          volatilityFloor = prop.volatilityFloor;
          break;
        }
      }
    }

    let originalVolatilityFloor = volatilityFloor;
    let autoAdjusted = false;
    let boostLogMsg = "";

    if (volatilityFloor > 0.0) {
      // Find a matching margin policy to check for depletion thresholds and scaling factors
      const marginPolicyKey = Object.keys(newState.swfReinsuranceOptionMarginPolicies || {}).find(policyKey => {
        const p = newState.swfReinsuranceOptionMarginPolicies![policyKey];
        return p.swfYieldCdoId === optionCdoId && p.trancheId === trancheId;
      });
      const marginPolicy = marginPolicyKey ? newState.swfReinsuranceOptionMarginPolicies![marginPolicyKey] : undefined;

      let depletionThreshold = marginPolicy?.liquidityDepletionThreshold;
      let scalingFactor = marginPolicy?.floorScalingFactor;

      // Check if there is an authorized auto-adjust proposal for this CDO and tranche
      if (newState.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals) {
        for (const prop of Object.values(newState.swfReinsuranceOptionVolatilityFloorAutoAdjustProposals)) {
          if (prop.swfYieldCdoId === optionCdoId &&
              prop.trancheId === trancheId &&
              prop.status === "authorized") {
            depletionThreshold = prop.liquidityDepletionThreshold;
            scalingFactor = prop.floorScalingFactor;
            break;
          }
        }
      }

      // Check if there is an authorized active panic override for this CDO and tranche
      let overrideActive = false;
      let overrideLogMsg = "";
      if (newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals) {
        for (const prop of Object.values(newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals)) {
          if (prop.swfYieldCdoId === optionCdoId &&
              prop.trancheId === trancheId &&
              prop.status === "authorized" &&
              prop.panicOverrideActive &&
              prop.cooldownEndStep !== undefined &&
              newState.step <= prop.cooldownEndStep) {
            overrideActive = true;
            overrideLogMsg = `[SWF Reinsurance Option Volatility Floor Panic Override Active] Volatility floor auto-boost is frozen under cooldown (Current Step: ${newState.step}, Cooldown End Step: ${prop.cooldownEndStep}).`;
            break;
          }
        }
      }

      if (overrideActive) {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(overrideLogMsg);
      } else if (depletionThreshold !== undefined && scalingFactor !== undefined) {
        // Find the cross-syndicate pool or volatility insurance pool
        const crossPool = Object.values(newState.swfReinsuranceOptionCrossSyndicatePools || {}).find((p: any) =>
          p.swfYieldCdoId === optionCdoId && p.trancheId === trancheId
        ) as any;
        const volPool = Object.values(newState.swfReinsuranceOptionVolatilityInsurancePools || {}).find((vp: any) =>
          vp.swfYieldCdoId === optionCdoId && vp.trancheId === trancheId
        ) as any;

        let reserves = 0;
        let liabilities = 0;

        if (crossPool) {
          reserves = crossPool.totalBalance;
          liabilities = crossPool.liabilities ?? 0;
        } else if (volPool) {
          reserves = volPool.balance;
          liabilities = volPool.liabilities ?? 0;
        }

        if (liabilities > 0) {
          const ratio = reserves / liabilities;
          if (ratio < depletionThreshold) {
            const depletionGap = depletionThreshold - ratio;
            const multiplier = 1.0 + scalingFactor * depletionGap;
            volatilityFloor = volatilityFloor * multiplier;
            autoAdjusted = true;
            boostLogMsg = `[SWF Reinsurance Option Volatility Floor Auto-Boosted] Pool liquidity is depleted (Reserves: ${reserves}, Liabilities: ${liabilities}, Ratio: ${ratio.toFixed(4)} < Threshold: ${depletionThreshold}). Dynamically boosted volatility floor from ${originalVolatilityFloor.toFixed(2)} to ${volatilityFloor.toFixed(2)} using scaling factor ${scalingFactor}.`;
          }
        }
      }
    }

    if (volatilityFloor > 0.0) {
      const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
      const avgVolatility = activeBonds.length > 0
        ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
        : 15.0;
      const minSpread = Math.round(avgVolatility * volatilityFloor);
      if (bidAskSpread < minSpread) {
        const originalSpread = bidAskSpread;
        bidAskSpread = minSpread;
        if (!newState.journal) newState.journal = [];
        if (autoAdjusted && boostLogMsg) {
          newState.journal.push(boostLogMsg);
        }
        newState.journal.push(
          `[SWF Reinsurance Option Volatility Floor Enforced] Dynamic volatility floor enforced on ${key}. Raised bid-ask spread from ${originalSpread} to ${bidAskSpread} gold based on average volatility ${avgVolatility.toFixed(2)}% and floor parameter ${volatilityFloor.toFixed(2)}.`
        );
      }
    }

    // Volatility Insurance spread stabilization (AF-172)
    const volPolicy = newState.swfReinsuranceOptionVolatilityInsurancePolicies?.[key];
    const volPool = newState.swfReinsuranceOptionVolatilityInsurancePools?.[key];
    if (volPolicy && volPool && volPool.balance > 0 && bidAskSpread > volPolicy.stabilizationThreshold) {
      const originalSpread = bidAskSpread;
      const spreadExcess = bidAskSpread - volPolicy.stabilizationThreshold;
      const maxDrawdown = volPool.balance;
      const spreadReduction = Math.min(spreadExcess, Math.floor(maxDrawdown / (volPolicy.drawdownMultiplier || 1)));
      const drawdown = Math.round(spreadReduction * (volPolicy.drawdownMultiplier || 1));

      if (drawdown > 0) {
        if (!newState.swfReinsuranceOptionVolatilityInsurancePools) {
          newState.swfReinsuranceOptionVolatilityInsurancePools = {};
        }
        newState.swfReinsuranceOptionVolatilityInsurancePools[key] = {
          ...volPool,
          balance: volPool.balance - drawdown,
          timestamp: newState.step,
        };
        bidAskSpread = Math.max(volPolicy.stabilizationThreshold, bidAskSpread - spreadReduction);
        
        newState.journal.push(
          `[SWF Reinsurance Option Spread Stabilization] Severe market volatility detected on ${key}. Narrowed bid-ask spread by ${spreadReduction} gold (from ${originalSpread} to ${bidAskSpread}) by drawing down ${drawdown} gold from Volatility Insurance Pool (New Pool Balance: ${newState.swfReinsuranceOptionVolatilityInsurancePools[key].balance} gold).`
        );
      }
    }

    let poolLinkStateDropRate = 0.0;
    let poolTargetYieldRate = 0.0;
    let cdoId = "";
    let creatorSyndicateId = "";
    if (key.includes("_")) {
      const idx = key.lastIndexOf("_");
      cdoId = key.substring(0, idx);
    }
    if (newState.swfMultiFundReinsurancePools && cdoId) {
      const cdo = newState.swfYieldCDOs?.[cdoId];
      creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
      for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
        if (creatorSyndicateId && pool.syndicateIds.includes(creatorSyndicateId)) {
          if (pool.linkStateDropRate !== undefined) {
            poolLinkStateDropRate = Math.max(poolLinkStateDropRate, pool.linkStateDropRate);
          }
          if (pool.active) {
            poolTargetYieldRate = Math.max(poolTargetYieldRate, pool.targetYieldRate);
          }
        }
      }
    }

    let linkStateDropRate = poolLinkStateDropRate;
    if (linkStateDropRate === 0.0 && newState.swfMultiFundReinsurancePools) {
      for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
        if (pool.linkStateDropRate !== undefined) {
          linkStateDropRate = Math.max(linkStateDropRate, pool.linkStateDropRate);
        }
        if (pool.active) {
          poolTargetYieldRate = Math.max(poolTargetYieldRate, pool.targetYieldRate);
        }
      }
    }

    const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
    const avgVolatility = activeBonds.length > 0
      ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
      : 15.0;

    // AF-175: Volatility Shock Arbitrage Spread and Yield Target Balancing
    const hedgingPolicy = newState.swfReinsuranceOptionHedgingPolicies?.[key];
    if (hedgingPolicy) {
      const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[key];
      const stressShock = stressPolicy ? stressPolicy.simulatedVolatilityShock : 0.0;
      const stressVolatility = avgVolatility + stressShock;

      const activationThreshold = hedgingPolicy.hedgingActivationThreshold ?? 20.0;
      const isVolatileShock = stressVolatility >= activationThreshold;

      if (isVolatileShock && poolTargetYieldRate >= 0.05) {
        const spreadThreshold = hedgingPolicy.volatilityShockArbitrageSpreadThreshold ?? 10.0;
        if (bidAskSpread > spreadThreshold) {
          const originalSpread = bidAskSpread;
          const spreadExcess = bidAskSpread - spreadThreshold;
          // Dynamically narrow spread by 50% of the excess to balance liquidity
          const spreadReduction = Math.floor(spreadExcess * 0.5);
          if (spreadReduction > 0) {
            bidAskSpread = Math.max(spreadThreshold, bidAskSpread - spreadReduction);
            
            newState.journal.push(
              `[SWF Reinsurance Option Spread Rebalancing] Dynamically narrowed option spread by ${spreadReduction} gold (from ${originalSpread} to ${bidAskSpread} gold) under volatile shock (Volatility: ${avgVolatility.toFixed(2)}%) and multi-fund target yield threshold (${(poolTargetYieldRate * 100).toFixed(1)}%) to prevent arbitrage depletion.`
            );
          }
        }
      }
    }

    let volHedgeMult = 1.0;
    let partitionRiskMult = 1.0;
    if (creatorSyndicateId) {
      const cartelPolicy = getSyndicateCartelPolicy(newState, creatorSyndicateId);
      const guildPolicy = getSyndicateGuildPolicy(newState, creatorSyndicateId);
      if (cartelPolicy) {
        if (cartelPolicy.reinsuranceOptionVolatilityHedgeFactor !== undefined) {
          volHedgeMult *= cartelPolicy.reinsuranceOptionVolatilityHedgeFactor;
        }
        if (cartelPolicy.reinsuranceOptionPartitionRiskFactor !== undefined) {
          partitionRiskMult *= cartelPolicy.reinsuranceOptionPartitionRiskFactor;
        }
      }
      if (guildPolicy) {
        if (guildPolicy.reinsuranceOptionVolatilityHedgeFactor !== undefined) {
          volHedgeMult *= guildPolicy.reinsuranceOptionVolatilityHedgeFactor;
        }
        if (guildPolicy.reinsuranceOptionPartitionRiskFactor !== undefined) {
          partitionRiskMult *= guildPolicy.reinsuranceOptionPartitionRiskFactor;
        }
      }
    }

    const spreadMultiplier = (1.0 + linkStateDropRate * partitionRiskMult) * (1.0 + (avgVolatility / 100.0) * volHedgeMult);

    let spreadAdjustment = 1.0;
    if (buyVolume + sellVolume > 0) {
      const baseDeviation = (imbalance / (buyVolume + sellVolume)) * 0.5;
      spreadAdjustment = 1.0 + baseDeviation * spreadMultiplier;
    }
    spreadAdjustment = Math.round(spreadAdjustment * 10000) / 10000;

    const oldDepth = state.swfReinsuranceOptionOrderBookDepths?.[key];
    const oldAdjustment = oldDepth ? oldDepth.spreadAdjustment : 1.0;

    newState.swfReinsuranceOptionOrderBookDepths![key] = {
      buyVolume,
      sellVolume,
      imbalance,
      spreadAdjustment,
      bidAskSpread,
    };

    if (spreadAdjustment !== oldAdjustment) {
      const reason = spreadAdjustment > 1.0 
        ? "sell volume scarcity" 
        : (spreadAdjustment < 1.0 ? "sell volume abundance" : "balanced volume");
      
      newState.journal.push(
        `[SWF Reinsurance Option Pricing Adjustment] CDO Tranche ${key} premium rate adjusted by multiplier ${spreadAdjustment.toFixed(4)}x due to ${reason} (Buy Vol: ${buyVolume}, Sell Vol: ${sellVolume}, Spread: ${bidAskSpread} gold).`
      );
    }
  }

  return newState;
}

/**
 * Handles merchant restocking logic on every step.
 */
export function tickEconomy(state: GameState, pack: any): GameState {
  let newState = {
    ...state,
    seed: state.seed,
    merchantGold: state.merchantGold ? { ...state.merchantGold } : {},
    merchantLastRestock: state.merchantLastRestock ? { ...state.merchantLastRestock } : {},
    merchantInventories: cloneMerchantInventories(state.merchantInventories) ?? {},
    merchantLastUpdated: state.merchantLastUpdated ? { ...state.merchantLastUpdated } : {},
    objectState: { ...state.objectState },
    vars: { ...state.vars },
    journal: [...state.journal],
  };

  // Wire grace ticks for volatility floor panic override early cancellation grace period (AF-197/AF-198)
  if (newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals) {
    newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals = { ...newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals };
    for (const [cancelId, cancelProp] of Object.entries(newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals)) {
      if (cancelProp.status === "authorized" && cancelProp.remainingGraceSteps !== undefined) {
        if (cancelProp.remainingGraceSteps > 0) {
          // Fetch pool reserves
          const optionCdoId = cancelProp.swfYieldCdoId;
          const trancheId = cancelProp.trancheId;

          const crossPool = Object.values(newState.swfReinsuranceOptionCrossSyndicatePools || {}).find((p: any) =>
            p.swfYieldCdoId === optionCdoId && p.trancheId === trancheId
          ) as any;
          const volPool = Object.values(newState.swfReinsuranceOptionVolatilityInsurancePools || {}).find((vp: any) =>
            vp.swfYieldCdoId === optionCdoId && vp.trancheId === trancheId
          ) as any;

          let reserves = 0;
          if (crossPool) {
            reserves = crossPool.totalBalance;
          } else if (volPool) {
            reserves = volPool.balance;
          }

          // Check for active minimum liquidity threshold
          let activeThreshold: number | undefined;
          if (newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals) {
            for (const liqProp of Object.values(newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceLiquidityProposals)) {
              if (liqProp.status === "authorized") {
                if (liqProp.targetProposalId === cancelId) {
                  activeThreshold = liqProp.minLiquidityThreshold;
                  break;
                }
                const graceProp = newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationGraceProposals?.[liqProp.targetProposalId];
                if (graceProp && graceProp.targetProposalId === cancelId) {
                  activeThreshold = liqProp.minLiquidityThreshold;
                  break;
                }
              }
            }
          }

          if (activeThreshold !== undefined && reserves < activeThreshold) {
            // Instantly cancel/terminate grace period!
            newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals[cancelId] = {
              ...cancelProp,
              remainingGraceSteps: 0,
            };
            const targetOverride = newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.[cancelProp.targetProposalId];
            if (targetOverride) {
              newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
                ...newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals,
                [cancelProp.targetProposalId]: {
                  ...targetOverride,
                  cooldownEndStep: undefined,
                  timestamp: newState.step,
                }
              };
            }
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Reinsurance Option Volatility Floor Panic Override Extension Cancellation Grace Terminated] Grace period cancelled early for cancellation ${cancelId} due to liquidity depletion (Reserves: ${reserves} < Threshold: ${activeThreshold}).`
            );
          } else {
            const newRemaining = cancelProp.remainingGraceSteps - 1;
            newState.swfReinsuranceOptionVolatilityFloorPanicOverrideExtensionCancellationProposals[cancelId] = {
              ...cancelProp,
              remainingGraceSteps: newRemaining,
            };
            
            const targetOverride = newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals?.[cancelProp.targetProposalId];
            if (targetOverride) {
              newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals = {
                ...newState.swfReinsuranceOptionVolatilityFloorPanicOverrideProposals,
                [cancelProp.targetProposalId]: {
                  ...targetOverride,
                  cooldownEndStep: newRemaining > 0 ? newState.step + newRemaining : undefined,
                  timestamp: newState.step,
                }
              };
              if (newRemaining === 0) {
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Reinsurance Option Volatility Floor Panic Override Extension Cancellation Grace Ended] Grace period ended for cancellation ${cancelId}. Panic override ${cancelProp.targetProposalId} has been terminated early.`
                );
              }
            }
          }
        }
      }
    }
  }

  // AF-261: Syndicate SWF Sovereign Debt CDO Tranche Surcharge Grace Period Minimum Liquidity Threshold Adjustment Fee Dynamic Calibration
  // Scale proposal and voting fees based on enforcer heat and active proposed count to prevent spamming.
  {
    let maxEnforcerHeat = 0;
    if (newState.enforcementHeat) {
      for (const entry of Object.values(newState.enforcementHeat)) {
        if ((entry as any).heat > maxEnforcerHeat) {
          maxEnforcerHeat = (entry as any).heat;
        }
      }
    }

    let activeProposedCount = 0;
    if (newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposals) {
      for (const prop of Object.values(newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposals)) {
        if (prop.status === "proposed") {
          activeProposedCount++;
        }
      }
    }

    // Dynamic scale: 1.0 + 25% per active proposed + maxEnforcerHeat%
    const spamMultiplier = 1.0 + activeProposedCount * 0.25;
    const heatMultiplier = 1.0 + (maxEnforcerHeat / 100);
    const dynamicScale = spamMultiplier * heatMultiplier;

    if (newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseProposalFee === undefined) {
      newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseProposalFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee ?? 500;
    }
    if (newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseVoteFee === undefined) {
      newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseVoteFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee ?? 100;
    }

    const baseProposalFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseProposalFee;
    const baseVoteFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustBaseVoteFee;

    const originalProposalFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee;
    const originalVoteFee = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee;

    newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee = Math.round(baseProposalFee * dynamicScale);
    newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee = Math.round(baseVoteFee * dynamicScale);

    if (
      newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee !== originalProposalFee ||
      newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee !== originalVoteFee
    ) {
      if (!newState.journal) newState.journal = [];
      newState.journal.push(
        `[CDO Surcharge Grace Liquidity Adjust Fee Calibration] Calibrated fees dynamically (Proposal Fee: ${newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustProposalFee}, Vote Fee: ${newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityAdjustVoteFee}) (Indicators - Active Proposals: ${activeProposedCount}, Max Heat: ${maxEnforcerHeat}).`
      );
    }
  }

  // AF-262: CDO Tranche Co-Investment Yield-Hedging Option Secondary Market Market Maker Liquidity Buffer Dynamic Interest Surcharges Auto-Restock and Compound Faction Standing-Gated Discount Scaling Cooldown & Panic Override Extension Cancellation Grace Period Minimum Liquidity Threshold Adjustment Fee Calibration Yield-Pro-Rata Auto-Reinvestment
  if (newState.step % 5 === 0 && newState.sovereignDebtCDSCDOPools) {
    newState.sovereignDebtCDSCDOPools = { ...newState.sovereignDebtCDSCDOPools };
    for (const [cdoId, pool] of Object.entries(newState.sovereignDebtCDSCDOPools)) {
      const originalAmount = pool.accumulatedReinvestmentPool ?? 0;
      const threshold = pool.autoReinvestThreshold ?? 0;
      if (originalAmount > 0 && threshold > 0 && originalAmount >= threshold) {
        let reinvestedAmount = originalAmount;
        const cap = pool.maxAutoReinvestYieldCap;
        if (cap !== undefined && originalAmount > cap) {
          reinvestedAmount = cap;
          if (!newState.auditLogs) {
            newState.auditLogs = [];
          }
          newState.auditLogs.push(
            `[CDS_CDO_REINVESTMENT_AUDIT_BREACH] Syndicate CDS CDO auto-reinvestment breach detected for pool ${cdoId}. Attempted: ${originalAmount} gold, Cap: ${cap} gold. Clamped to cap.`
          );
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[CDS_CDO_REINVESTMENT_AUDIT_BREACH] Audit triggered! Attempted reinvestment of ${originalAmount} gold for CDO ${cdoId} breached the authorized governance cap of ${cap} gold. Clamped to cap.`
          );
        }

        newState.sovereignDebtCDSCDOPools[cdoId] = {
          ...pool,
          accumulatedReinvestmentPool: 0,
          fractionalizedVault: {
            ...pool.fractionalizedVault,
            balance: pool.fractionalizedVault.balance + reinvestedAmount,
            timestamp: newState.step,
          }
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[CDS CDO Yield-Pro-Rata Auto-Reinvestment] Automatically reinvested ${reinvestedAmount} gold of accumulated calibration fees into CDO ${cdoId} stability pool to maintain liquidity buffers above the floor.`
        );
      }
    }
  }

  // Wire grace ticks for surcharge panic override early cancellation grace period (AF-258/AF-259)
  if (newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals) {
    newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals = { ...newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals };
    for (const [cancelId, cancelProp] of Object.entries(newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals)) {
      if (cancelProp.status === "authorized" && cancelProp.remainingGraceSteps !== undefined) {
        if (cancelProp.remainingGraceSteps > 0) {
          // Fetch pool reserves (CDO fractionalized vault balance)
          const optionCdoId = cancelProp.cdoId;
          const pool = newState.sovereignDebtCDSCDOPools?.[optionCdoId];
          const reserves = pool ? pool.fractionalizedVault.balance : 0;

          // Check for active minimum liquidity threshold
          let activeThreshold: number | undefined;
          if (newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals) {
            for (const liqProp of Object.values(newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceLiquidityProposals)) {
              if (liqProp.status === "authorized") {
                if (liqProp.targetProposalId === cancelId) {
                  activeThreshold = liqProp.minLiquidityThreshold;
                  break;
                }
                const graceProp = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationGraceProposals?.[liqProp.targetProposalId];
                if (graceProp && graceProp.targetProposalId === cancelId) {
                  activeThreshold = liqProp.minLiquidityThreshold;
                  break;
                }
              }
            }
          }

          if (activeThreshold !== undefined && reserves < activeThreshold) {
            // Instantly cancel/terminate grace period!
            newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals[cancelId] = {
              ...cancelProp,
              remainingGraceSteps: 0,
            };
            const targetOverride = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.[cancelProp.targetProposalId];
            if (targetOverride) {
              newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals = {
                ...newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals,
                [cancelProp.targetProposalId]: {
                  ...targetOverride,
                  cooldownEndStep: undefined,
                  panicOverrideActive: false,
                  timestamp: newState.step,
                }
              };
            }
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDO Yield-Hedging Option Surcharge Panic Override Extension Cancellation Grace Terminated] Grace period cancelled early for cancellation ${cancelId} due to liquidity depletion (Reserves: ${reserves} < Threshold: ${activeThreshold}).`
            );
          } else {
            const newRemaining = cancelProp.remainingGraceSteps - 1;
            newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals[cancelId] = {
              ...cancelProp,
              remainingGraceSteps: newRemaining,
            };
            
            const targetOverride = newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.[cancelProp.targetProposalId];
            if (targetOverride) {
              newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals = {
                ...newState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals,
                [cancelProp.targetProposalId]: {
                  ...targetOverride,
                  cooldownEndStep: newRemaining > 0 ? newState.step + newRemaining : undefined,
                  panicOverrideActive: newRemaining > 0 ? targetOverride.panicOverrideActive : false,
                  timestamp: newState.step,
                }
              };
              if (newRemaining === 0) {
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[CDO Yield-Hedging Option Surcharge Panic Override Extension Cancellation Grace Ended] Grace period ended for cancellation ${cancelId}. Panic override ${cancelProp.targetProposalId} has been terminated early.`
                );
              }
            }
          }
        }
      }
    }
  }


  // SWF Reinsurance Option Order Book Volume Tracking (AF-150) & Depths (AF-151)
  let afterMetrics = recalculateReinsuranceOptionOrderBookMetrics(newState);
  afterMetrics = tickVolatilityInsuranceRebalancing(afterMetrics);
  newState.swfReinsuranceOptionOrderBookVolumes = afterMetrics.swfReinsuranceOptionOrderBookVolumes;
  newState.swfReinsuranceOptionOrderBookDepths = afterMetrics.swfReinsuranceOptionOrderBookDepths;
  newState.swfReinsuranceOptionVolatilityInsurancePools = afterMetrics.swfReinsuranceOptionVolatilityInsurancePools;
  newState.swfMultiFundReinsurancePools = afterMetrics.swfMultiFundReinsurancePools;
  newState.journal = afterMetrics.journal;

  // Dynamic Volatility Index (VIX-style) calculation (AF-144)
  const activeBonds = new Set<string>();
  if (newState.cooperativeSovereigntyBondProposals) {
    for (const bondId of Object.keys(newState.cooperativeSovereigntyBondProposals)) {
      activeBonds.add(bondId);
    }
  }
  if (newState.sovereignDebtProposals) {
    for (const bondId of Object.keys(newState.sovereignDebtProposals)) {
      activeBonds.add(bondId);
    }
  }
  if (newState.sovereignBondLendingPools) {
    for (const pool of Object.values(newState.sovereignBondLendingPools)) {
      activeBonds.add(pool.bondId);
    }
  }

  newState.bondYieldHistories = newState.bondYieldHistories ? { ...newState.bondYieldHistories } : {};
  newState.yieldVolatilityIndexes = newState.yieldVolatilityIndexes ? { ...newState.yieldVolatilityIndexes } : {};

  for (const bondId of activeBonds) {
    const currentYield = getBondCurrentYield(newState, bondId);
    const history = [...(newState.bondYieldHistories[bondId] || [])];
    history.push(currentYield);
    if (history.length > 5) {
      history.shift();
    }
    newState.bondYieldHistories[bondId] = history;

    let variance = 0;
    if (history.length >= 2) {
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const sqDiffSum = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
      variance = sqDiffSum / history.length;
    }

    // Bid-ask option spread term (Theoretical call option strike=yield, expires step+5)
    const basePrem = calculateOptionPremium(newState, bondId, "call", currentYield, newState.step + 5);
    const spread = basePrem * 0.10;

    const volatility = Math.max(10.0, Math.round(Math.sqrt(variance) * 50 + (spread * 20) + (currentYield * 0.5)));
    newState.yieldVolatilityIndexes[bondId] = {
      bondId,
      volatility,
      timestamp: newState.step,
    };
  }

  // Active Option Expiries/Settlements (AF-144)
  if (newState.sovereignBondOptions) {
    newState.sovereignBondOptions = { ...newState.sovereignBondOptions };
    newState.marginAccounts = newState.marginAccounts ? { ...newState.marginAccounts } : {};
    for (const optId of Object.keys(newState.sovereignBondOptions)) {
      const option = newState.sovereignBondOptions[optId];
      if (option && option.active && newState.step >= option.expirationEpoch) {
        const currentYield = getBondCurrentYield(newState, option.bondId);
        const intrinsic = option.optionType === "call"
          ? Math.max(0, currentYield - option.strikePrice)
          : Math.max(0, option.strikePrice - currentYield);
        const payoff = Math.round(intrinsic * option.size * 1000);

        const marginAccount = newState.marginAccounts[option.syndicateId];
        if (marginAccount && payoff > 0) {
          marginAccount.collateral += payoff;
          marginAccount.timestamp = newState.step;
        }

        newState.sovereignBondOptions[optId] = {
          ...option,
          active: false,
          timestamp: newState.step,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sovereign Bond Option Expired] Option ${option.id} (${option.optionType}) on bond ${option.bondId} expired at yield ${currentYield.toFixed(2)}% (Strike: ${option.strikePrice}%, Payoff: ${payoff} gold).`
        );
      }
    }
  }

  // Epoch audits & faction sponsor revocations (AF-116)
  const isEpochEnd = newState.step > 0 && newState.step % 5 === 0;
  if (isEpochEnd && newState.sponsorAuditProposals) {
    newState.sponsorAuditProposals = { ...newState.sponsorAuditProposals };
    newState.factionSponsorPolicies = newState.factionSponsorPolicies ? { ...newState.factionSponsorPolicies } : {};

    for (const [auditId, audit] of Object.entries(newState.sponsorAuditProposals)) {
      if (audit.resolved && !audit.executed) {
        const { syndicateId, vaultId, factionId } = audit;
        const reserves = newState.factionReservePools?.[factionId] ?? 10000;
        const reputation = newState.factionRep?.[factionId] ?? 0;

        const sponsorPolicy = newState.factionSponsorPolicies[syndicateId]?.[vaultId];
        if (sponsorPolicy) {
          if (reserves <= 0) {
            // Revoke!
            if (newState.factionSponsorPolicies[syndicateId]) {
              newState.factionSponsorPolicies[syndicateId] = { ...newState.factionSponsorPolicies[syndicateId] };
              delete newState.factionSponsorPolicies[syndicateId][vaultId];
              if (Object.keys(newState.factionSponsorPolicies[syndicateId]).length === 0) {
                delete newState.factionSponsorPolicies[syndicateId];
              }
            }
            newState.journal.push(
              `[Sponsor Audit Revoked] Sponsoring policy for vault ${vaultId} sponsored by ${factionId} has been revoked (Faction reserves depleted: ${reserves} <= 0).`
            );
          } else if (reputation < 10) {
            // Rate penalty: halve the reward rate!
            if (newState.factionSponsorPolicies[syndicateId]) {
              newState.factionSponsorPolicies[syndicateId] = {
                ...newState.factionSponsorPolicies[syndicateId],
                [vaultId]: {
                  ...sponsorPolicy,
                  rewardRate: sponsorPolicy.rewardRate * 0.5,
                },
              };
            }
            newState.journal.push(
              `[Sponsor Audit Penalty] Sponsoring policy reward rate for vault ${vaultId} sponsored by ${factionId} has been reduced by 50% due to low reputation (${reputation} < 10). New rate: ${sponsorPolicy.rewardRate * 0.5}.`
            );
          } else {
            newState.journal.push(
              `[Sponsor Audit Passed] Sponsoring policy for vault ${vaultId} sponsored by ${factionId} passed audit checks (Reserves: ${reserves}, Reputation: ${reputation}).`
            );
          }
        }
        newState.sponsorAuditProposals[auditId] = {
          ...audit,
          executed: true,
        };
      }
    }
  }

  // Automatic Turf Guard Recruitment from Outposts (AF-56)
  if (newState.turfGuardOutposts) {
    const turfGuards = newState.turfGuards ? { ...newState.turfGuards } : {};
    let guardsChanged = false;
    for (const [roomId, outpost] of Object.entries(newState.turfGuardOutposts)) {
      // Check if the syndicate still controls this turf
      const controllingSyndicateId = newState.syndicateTurf?.[roomId];
      if (controllingSyndicateId === outpost.syndicateId) {
        if (outpost.disabled) continue; // Skip if disabled
        const existingGuard = turfGuards[roomId];
        const currentCount = existingGuard?.count ?? 0;
        const targetCount = outpost.securityLevel; // Recruit up to securityLevel
        if (currentCount < targetCount) {
          const newCount = currentCount + 1; // Recruit 1 guard per tick/step
          turfGuards[roomId] = {
            roomId,
            syndicateId: outpost.syndicateId,
            count: newCount,
            cost: existingGuard?.cost ?? 0, // Automated recruitment is free / passive
            timestamp: newState.step,
          };
          guardsChanged = true;
          newState.journal.push(`[Syndicate] Outpost in room ${roomId} automatically recruited local Turf Guard (Count: ${newCount}/${targetCount}).`);
        }
      }
    }
    if (guardsChanged) {
      newState.turfGuards = turfGuards;
    }
  }

  // Mastermind Contracts Ticking (AF-77)
  if (newState.mastermindContracts) {
    newState.mastermindContracts = { ...newState.mastermindContracts };
    for (const [contractId, contract] of Object.entries(newState.mastermindContracts)) {
      if (contract.status === "active") {
        const nextProgress = contract.progress + 1;
        const syndicate = newState.syndicates?.[contract.syndicateId];
        
        if (nextProgress >= contract.duration) {
          // Mastermind Contract completed!
          newState.mastermindContracts[contractId] = {
            ...contract,
            progress: contract.duration,
            status: "completed",
            timestamp: newState.step,
          };
          
          // Completion bonus payout
          const completionPayout = Math.round(250 * contract.payoutArbitrageMultiplier);
          if (syndicate) {
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(completionPayout / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
              newState.journal.push(`[Mastermind] Mastermind Contract ${contractId} has been successfully completed! Distributed a completion bonus of ${completionPayout} gold (${share} gold to each member of syndicate ${contract.syndicateId}).`);
            }
          }
        } else {
          // Progress contract and distribute a tick payout
          newState.mastermindContracts[contractId] = {
            ...contract,
            progress: nextProgress,
            timestamp: newState.step,
          };
          
          const tickPayout = Math.round(50 * contract.payoutArbitrageMultiplier);
          if (syndicate) {
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(tickPayout / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
              newState.journal.push(`[Mastermind] Mastermind Contract ${contractId} progressed (${nextProgress}/${contract.duration}). Distributed passive arbitrage payout of ${tickPayout} gold (${share} gold to each member).`);
            }
          }
        }
      }
    }
  }

  // Shadow Market Contraband Trade Ticking (AF-78)
  if (newState.shadowMarkets) {
    for (const [marketId, market] of Object.entries(newState.shadowMarkets)) {
      const syndicate = newState.syndicates?.[market.syndicateId];
      if (syndicate) {
        // Automatically bypass all regional tolls/tariffs (by trading virtually directly)
        // Buy spread = 85, Sell spread = 125, Net profit = 40 gold
        const profit = 40;
        const members = syndicate.members ?? [];
        const share = members.length > 0 ? Math.floor(profit / members.length) : 0;
        if (share > 0) {
          if (!newState.vars) newState.vars = {};
          for (const member of members) {
            const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
            newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
          }
          newState.journal.push(`[Shadow Market] Shadow market ${marketId} in room ${market.roomId} executed an automatic contraband trade bypassing all tariffs/tolls. Distributed fixed cartel premium spread profit of ${profit} gold (${share} gold per member) to syndicate ${market.syndicateId}.`);
        }
      }
    }
  }

  // Black Ops Safehouse Ticking (AF-79)
  if (newState.blackOpsSafehouses) {
    const turfGuards = newState.turfGuards ? { ...newState.turfGuards } : {};
    const deflectionPolicies = newState.deflectionPolicies ? { ...newState.deflectionPolicies } : {};
    let guardsChanged = false;
    let deflectionsChanged = false;

    for (const [safehouseId, safehouse] of Object.entries(newState.blackOpsSafehouses)) {
      if (!safehouse.active) continue;
      const roomId = safehouse.roomId;
      const syndicateId = safehouse.syndicateId;

      // 1. Automatically recruit elite guards (up to count 5)
      const existingGuard = turfGuards[roomId];
      const currentCount = existingGuard?.count ?? 0;
      const targetCount = 5;
      if (currentCount < targetCount) {
        const newCount = currentCount + 1;
        turfGuards[roomId] = {
          roomId,
          syndicateId,
          count: newCount,
          cost: existingGuard?.cost ?? 0,
          timestamp: newState.step,
        };
        guardsChanged = true;
        newState.journal.push(`[BlackOps] Black Ops Safehouse ${safehouseId} in room ${roomId} automatically recruited elite Turf Guard (Count: ${newCount}/${targetCount}).`);
      }

      // 2. Automatically establish deflection policies
      const existingPolicy = deflectionPolicies[roomId];
      if (!existingPolicy || !existingPolicy.active) {
        deflectionPolicies[roomId] = {
          roomId,
          syndicateId,
          cost: 0,
          timestamp: newState.step,
          active: true,
        };
        deflectionsChanged = true;
        newState.journal.push(`[BlackOps] Black Ops Safehouse ${safehouseId} in room ${roomId} automatically established enforcer deflection policy.`);
      }

      // 3. Dynamic enforcer sweep on black ops safehouses containing contraband! (AF-83)
      const currentHeat = newState.enforcementHeat?.[roomId]?.heat ?? 0;
      const storedContraband = safehouse.storedContraband ?? 0;
      if (storedContraband > 0 && currentHeat >= 25) {
        // Enforcer Sweep triggers!
        const { value: sweepStrength, nextSeed } = PureRand.nextInt(newState.seed, 1, 50);
        newState.seed = nextSeed;

        const currentGuards = turfGuards[roomId]?.count ?? 0;
        const defenses = safehouse.defenses ?? 0;
        const defenseScore = defenses * 30 + currentGuards * 10;

        if (defenseScore >= sweepStrength) {
          // Repelled!
          newState.journal.push(
            `[BlackOps] Black Ops Safehouse ${safehouseId} successfully repelled dynamic enforcer sweep (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})!`
          );
        } else {
          // Sweep succeeded! Apply custom defenses damage reduction and capture chance
          const captureChance = Math.max(0.1, 0.9 - defenses * 0.25);
          const damageReductionFactor = Math.max(0.2, 1.0 - defenses * 0.2);

          const { value: rolledCapture, nextSeed: nextSeed2 } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed2;

          let confiscated = 0;
          if (rolledCapture <= captureChance * 100) {
            confiscated = Math.round(storedContraband * damageReductionFactor);
          }

          const remainingContraband = Math.max(0, storedContraband - confiscated);

          // Update safehouse contraband
          newState.blackOpsSafehouses = {
            ...(newState.blackOpsSafehouses || {}),
            [safehouseId]: {
              ...safehouse,
              storedContraband: remainingContraband,
              timestamp: newState.step,
            }
          };

          // Reset room heat since enforcers successfully swept/raided the safehouse
          if (newState.enforcementHeat?.[roomId]) {
            newState.enforcementHeat[roomId] = {
              ...newState.enforcementHeat[roomId],
              heat: 0,
            };
          }

          newState.journal.push(
            `[BlackOps] Dynamic enforcer sweep raided Black Ops Safehouse ${safehouseId} in room ${roomId}! Confiscated ${confiscated} contraband (defenses shielded ${storedContraband - confiscated} units).`
          );
        }
      }
    }

    if (guardsChanged) {
      newState.turfGuards = turfGuards;
    }
    if (deflectionsChanged) {
      newState.deflectionPolicies = deflectionPolicies;
    }
  }

  // Arbitrage Contracts Ticking (AF-78)
  if (newState.arbitrageContracts) {
    newState.arbitrageContracts = { ...newState.arbitrageContracts };
    for (const [contractId, contract] of Object.entries(newState.arbitrageContracts)) {
      if (contract.status === "active") {
        const nextProgress = contract.progress + 1;
        const syndicate = newState.syndicates?.[contract.syndicateId];
        
        if (nextProgress >= contract.duration) {
          // Arbitrage Contract completed!
          newState.arbitrageContracts[contractId] = {
            ...contract,
            progress: contract.duration,
            status: "completed",
            timestamp: newState.step,
          };
          
          // Completion bonus payout
          const completionPayout = Math.round(150 * contract.profitSpread);
          if (syndicate) {
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(completionPayout / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
              newState.journal.push(`[Arbitrage] Arbitrage Contract ${contractId} completed! Distributed locked-in completion bonus of ${completionPayout} gold (${share} gold to each member of syndicate ${contract.syndicateId}).`);
            }
          }
        } else {
          // Progress contract and distribute a tick payout
          newState.arbitrageContracts[contractId] = {
            ...contract,
            progress: nextProgress,
            timestamp: newState.step,
          };
          
          const tickPayout = Math.round(30 * contract.profitSpread);
          if (syndicate) {
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(tickPayout / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
              newState.journal.push(`[Arbitrage] Arbitrage Contract ${contractId} progressed (${nextProgress}/${contract.duration}). Distributed passive locked-in arbitrage payout of ${tickPayout} gold (${share} gold to each member).`);
            }
          }
        }
      }
    }
  }

  // Covert Cells Special Operations Sabotage Ticking (AF-73)
  if (newState.covertCells) {
    for (const [roomId, cell] of Object.entries(newState.covertCells)) {
      // Periodic check: 15% * cellLevel chance of sabotage per economic tick
      const sabotageChance = Math.min(0.8, 0.15 * cell.cellLevel);
      const { value: roll, nextSeed } = PureRand.next(newState.seed);
      newState.seed = nextSeed;

      if (roll <= sabotageChance) {
        // Sabotage triggered! Choose between disabling outpost or reducing heat
        const choiceVal = Math.floor(roll * 1000);
        const outpost = newState.turfGuardOutposts?.[roomId];
        
        if (outpost && outpost.syndicateId !== cell.syndicateId && choiceVal % 2 === 0) {
          // Disable outpost!
          newState.turfGuardOutposts = {
            ...(newState.turfGuardOutposts || {}),
            [roomId]: {
              ...outpost,
              disabled: true,
            },
          };
          newState.journal.push(`[SpecialOps] Covert cell in room ${roomId} sabotaged and disabled the local hostile outpost!`);
        } else {
          // Reduce enforcer heat in this room
          const currentHeatEntry = newState.enforcementHeat?.[roomId];
          if (currentHeatEntry) {
            const heatReduction = 20 * cell.cellLevel;
            const newHeat = Math.max(0, currentHeatEntry.heat - heatReduction);
            newState.enforcementHeat = {
              ...(newState.enforcementHeat || {}),
              [roomId]: {
                ...currentHeatEntry,
                heat: newHeat,
                timestamp: newState.step,
              },
            };
            newState.journal.push(`[SpecialOps] Covert cell in room ${roomId} triggered sabotage event, reducing local enforcer heat by ${heatReduction} (New heat: ${newHeat}).`);
          }
        }
      }
    }
  }

  // Saboteurs Special Operations Sabotage Ticking (AF-74)
  if (newState.saboteurs) {
    for (const [enforcerId, saboteur] of Object.entries(newState.saboteurs)) {
      if (saboteur.status !== "active") continue;

      // 100% chance of sabotage per economic tick
      const sabotageChance = 1.0;
      const { value: roll, nextSeed } = PureRand.next(newState.seed);
      newState.seed = nextSeed;

      if (roll <= sabotageChance) {
        // Find rival outposts to disable
        const rivalOutposts = Object.entries(newState.turfGuardOutposts || {}).filter(([roomId, outpost]) => {
          return outpost.syndicateId !== saboteur.syndicateId && !outpost.disabled;
        });

        if (rivalOutposts.length > 0) {
          const { value: index, nextSeed: s2 } = PureRand.nextInt(newState.seed, 0, rivalOutposts.length - 1);
          newState.seed = s2;
          const [roomId, outpost] = rivalOutposts[index];
          
          newState.turfGuardOutposts = {
            ...(newState.turfGuardOutposts || {}),
            [roomId]: {
              ...outpost,
              disabled: true,
            },
          };
          newState.journal.push(`[Saboteur] Saboteur ${saboteur.name} located and disabled rival outpost in room ${roomId}!`);
        } else {
          // Fallback: reduce enforcer heat in one of our syndicate's controlled rooms
          const ourTurfRooms = Object.entries(newState.syndicateTurf || {})
            .filter(([_, syndicateId]) => syndicateId === saboteur.syndicateId)
            .map(([roomId, _]) => roomId);

          if (ourTurfRooms.length > 0) {
            const { value: index, nextSeed: s2 } = PureRand.nextInt(newState.seed, 0, ourTurfRooms.length - 1);
            newState.seed = s2;
            const roomId = ourTurfRooms[index];
            const currentHeatEntry = newState.enforcementHeat?.[roomId];
            if (currentHeatEntry) {
              const heatReduction = 30;
              const newHeat = Math.max(0, currentHeatEntry.heat - heatReduction);
              newState.enforcementHeat = {
                ...(newState.enforcementHeat || {}),
                [roomId]: {
                  ...currentHeatEntry,
                  heat: newHeat,
                  timestamp: newState.step,
                },
              };
              newState.journal.push(`[Saboteur] Saboteur ${saboteur.name} reduced local enforcer heat in room ${roomId} by ${heatReduction} (New heat: ${newHeat}).`);
            }
          }
        }
      }
    }
  }

  // Elite Enforcers Combat Patrol Ticking (AF-75)
  if (newState.eliteEnforcers) {
    for (const [eliteId, elite] of Object.entries(newState.eliteEnforcers)) {
      if (elite.status !== "active") continue;

      // 100% chance of combat patrol per economic tick
      const patrolChance = 1.0;
      const { value: roll, nextSeed } = PureRand.next(newState.seed);
      newState.seed = nextSeed;

      if (roll <= patrolChance) {
        // Find rival turf guards to execute
        const rivalGuards = Object.entries(newState.turfGuards || {}).filter(([roomId, guards]) => {
          return guards.syndicateId !== elite.syndicateId && guards.count > 0;
        });

        if (rivalGuards.length > 0) {
          const { value: index, nextSeed: s2 } = PureRand.nextInt(newState.seed, 0, rivalGuards.length - 1);
          newState.seed = s2;
          const [roomId, guards] = rivalGuards[index];

          newState.turfGuards = {
            ...(newState.turfGuards || {}),
            [roomId]: {
              ...guards,
              count: Math.max(0, guards.count - 1),
            },
          };
          newState.journal.push(`[EliteEnforcer] Elite enforcer ${elite.name} executed a rival turf guard in room ${roomId}!`);
        } else {
          // Fallback: reduce enforcer heat in one of our syndicate's controlled rooms
          const ourTurfRooms = Object.entries(newState.syndicateTurf || {})
            .filter(([_, syndicateId]) => syndicateId === elite.syndicateId)
            .map(([roomId, _]) => roomId);

          if (ourTurfRooms.length > 0) {
            const { value: index, nextSeed: s2 } = PureRand.nextInt(newState.seed, 0, ourTurfRooms.length - 1);
            newState.seed = s2;
            const roomId = ourTurfRooms[index];
            const currentHeatEntry = newState.enforcementHeat?.[roomId];
            if (currentHeatEntry) {
              const heatReduction = 40;
              const newHeat = Math.max(0, currentHeatEntry.heat - heatReduction);
              newState.enforcementHeat = {
                ...(newState.enforcementHeat || {}),
                [roomId]: {
                  ...currentHeatEntry,
                  heat: newHeat,
                  timestamp: newState.step,
                },
              };
              newState.journal.push(`[EliteEnforcer] Elite enforcer ${elite.name} reduced local enforcer heat in room ${roomId} by ${heatReduction} (New heat: ${newHeat}).`);
            }
          }
        }
      }
    }
  }

  // 4b. Legendary Hitmen Combat Ticking (AF-76)
  if (newState.legendaryHitmen) {
    for (const [hitmanId, hitman] of Object.entries(newState.legendaryHitmen)) {
      if (hitman.status !== "active") continue;

      // Track and preemptively ambush active enforcer bounty hunters
      if (newState.enforcers) {
        const activeBountyHunters = Object.values(newState.enforcers).filter(
          e => e.isBountyHunter && e.status !== "defeated"
        );

        if (activeBountyHunters.length > 0) {
          const targetEnforcer = activeBountyHunters[0];
          targetEnforcer.status = "defeated";
          targetEnforcer.timestamp = newState.step;

          // Deactivate their bounty
          if (newState.bounties && newState.bounties[targetEnforcer.targetId || ""]) {
            newState.bounties[targetEnforcer.targetId || ""] = {
              ...newState.bounties[targetEnforcer.targetId || ""],
              active: false,
              timestamp: newState.step,
            };
          }

          newState.journal.push(`[Hitman] Legendary Hitman ${hitman.name} ambushed and neutralized active bounty hunter ${targetEnforcer.name}!`);
        } else {
          // Set counter-bounties on active rival enforcers
          const activeEnforcers = Object.values(newState.enforcers).filter(
            e => !e.isBountyHunter && e.status !== "defeated"
          );
          if (activeEnforcers.length > 0) {
            const enf = activeEnforcers[0];
            if (!newState.bounties) newState.bounties = {};
            if (!newState.bounties[enf.id] || !newState.bounties[enf.id].active) {
              newState.bounties[enf.id] = {
                targetId: enf.id,
                amount: 200,
                active: true,
                timestamp: newState.step,
              };
              newState.journal.push(`[Hitman] Legendary Hitman ${hitman.name} placed a 200 gold counter-bounty on active enforcer agency agent ${enf.name}!`);
            }
          }
        }
      }
    }
  }

  // 5. Faction Counter-Attacks and Sieges (AF-72)
  if (newState.step > 0 && newState.step % 10 === 0 && newState.territoryControl) {
    const activeControl = { ...newState.territoryControl };
    const activeClaims = newState.territoryClaims ? { ...newState.territoryClaims } : {};
    let controlChanged = false;

    const findPackRoom = (p: any, rid: string) => {
      if (p.rooms) {
        return p.rooms.find((r: any) => r.id === rid);
      }
      if (p.scenes) {
        return p.scenes.find((s: any) => s.id === rid);
      }
      return undefined;
    };

    for (const [roomId, syndicateId] of Object.entries(activeControl)) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) continue; // Only syndicates can be counter-attacked by native factions

      const roomDef = findPackRoom(pack, roomId);
      const nativeFactionId = roomDef?.faction;
      if (!nativeFactionId) continue;

      const isAtWar = newState.factionWars?.[syndicateId]?.[nativeFactionId] === true;
      if (!isAtWar) continue;

      // Check if covert cell or propaganda in the room cancels/bypasses the counter-attack trigger
      const localCell = newState.covertCells?.[roomId];
      const propKey = `${roomId}_${syndicateId}`;
      const localPropaganda = newState.propagandaCampaigns?.[propKey];

      let bypassSiege = false;
      if (localCell && localCell.syndicateId === syndicateId) {
        const cellBypassProb = 0.2 * localCell.cellLevel;
        const { value: bypassRoll, nextSeed: s1 } = PureRand.next(newState.seed);
        newState.seed = s1;
        if (bypassRoll <= cellBypassProb) {
          bypassSiege = true;
        }
      }
      if (localPropaganda && !bypassSiege) {
        const propBypassProb = 0.1 * localPropaganda.level;
        const { value: bypassRoll, nextSeed: s2 } = PureRand.next(newState.seed);
        newState.seed = s2;
        if (bypassRoll <= propBypassProb) {
          bypassSiege = true;
        }
      }

      if (bypassSiege) {
        newState.journal.push(`[Siege] Covert cell / propaganda in room ${roomId} successfully sabotaged the ${nativeFactionId} siege plans! Counter-attack bypassed.`);
        continue;
      }

      // Base defense success rate: 20%
      const baseRate = 0.2;

      // Fortresses
      const fortress = newState.defenseFortresses?.[roomId];
      const fortressBonus = fortress ? 0.3 * fortress.fortressLevel : 0;

      // Outposts
      const outpost = newState.turfGuardOutposts?.[roomId];
      const outpostBonus = outpost && !outpost.disabled ? 0.1 * outpost.securityLevel : 0;

      // Syndicate pooled resources (warChest)
      const warChestBonus = Math.min(0.3, (syndicate.warChest ?? 0) / 1000);

      const successProb = Math.min(1.0, baseRate + fortressBonus + outpostBonus + warChestBonus);

      // Roll deterministic outcome
      const { value: roll, nextSeed } = PureRand.next(newState.seed);
      newState.seed = nextSeed;

      if (roll <= successProb) {
        // Syndicate successfully repelled the counter-attack!
        newState.journal.push(`[Siege] Syndicate ${syndicateId} successfully repelled the ${nativeFactionId} counter-attack in room ${roomId} (Defense Success Prob: ${successProb.toFixed(3)}, Roll: ${roll.toFixed(3)})!`);
      } else {
        // Counter-attack succeeded! Faction reclaims the territory
        delete activeControl[roomId];
        delete activeClaims[roomId];
        controlChanged = true;

        if (newState.defenseFortresses) {
          const updatedFortresses = { ...newState.defenseFortresses };
          delete updatedFortresses[roomId];
          newState.defenseFortresses = updatedFortresses;
        }
        if (newState.turfGuardOutposts) {
          const updatedOutposts = { ...newState.turfGuardOutposts };
          delete updatedOutposts[roomId];
          newState.turfGuardOutposts = updatedOutposts;
        }
        if (newState.turfGuards) {
          const updatedGuards = { ...newState.turfGuards };
          delete updatedGuards[roomId];
          newState.turfGuards = updatedGuards;
        }

        newState.journal.push(`[Siege] Faction ${nativeFactionId} successfully reclaimed room ${roomId} from syndicate ${syndicateId} (Defense Success Prob: ${successProb.toFixed(3)}, Roll: ${roll.toFixed(3)})!`);
      }
    }

    if (controlChanged) {
      newState.territoryControl = activeControl;
      newState.territoryClaims = activeClaims;
    }
  }

  if (!pack || !pack.npcs) {
    // Still run periodic tax ticking even if there are no npcs
    if (newState.step > 0 && newState.step % 5 === 0 && newState.territoryControl) {
      let totalTaxGold = 0;
      for (const [roomId, factionId] of Object.entries(newState.territoryControl)) {
        const rep = newState.factionRep?.[factionId] ?? 0;
        if (rep > 0) {
          let roomTax = Math.max(1, Math.floor(rep / 10));
          const rateMultiplier = newState.taxPolicy?.[factionId];
          if (rateMultiplier !== undefined) {
            roomTax = roomTax * rateMultiplier;
          }
          totalTaxGold += roomTax;
        }
      }
      if (totalTaxGold > 0) {
        const currentGold = newState.vars["gold"] ?? 0;
        newState.vars["gold"] = currentGold + totalTaxGold;
        newState.vars["totalTaxesCollected"] = (newState.vars["totalTaxesCollected"] ?? 0) + totalTaxGold;
        newState.journal.push(`Collected ${totalTaxGold} gold in taxes from allied faction territories.`);
      }
    }
    return newState;
  }

  for (const npc of pack.npcs) {
    // Only restock if restock_interval is defined
    if (npc.restock_interval !== undefined) {
      const lastRestock = newState.merchantLastRestock[npc.id] ?? 0;
      const interval = npc.restock_interval;

      if (newState.step > 0 && newState.step - lastRestock >= interval) {
        // 1. Reset gold back to the merchant's limit / starting gold
        const startingGold = npc.gold ?? npc.gold_limit ?? 100;
        newState.merchantGold[npc.id] = startingGold;

        // 2. Procedurally restock one item from possible_items
        if (npc.possible_items && npc.possible_items.length > 0) {
          const { value, nextSeed } = PureRand.choose(newState.seed, npc.possible_items as string[]);
          newState.seed = nextSeed;
          if (value) {
            const itemKey = value as string;
            newState.merchantInventories[npc.id] = [...(newState.merchantInventories[npc.id] || []), itemKey];
            
            // Mark the restocked item as takeable in the world
            const currentObj = newState.objectState[itemKey] ?? {};
            newState.objectState[itemKey] = {
              ...currentObj,
              takenBy: "world",
            };
          }
        }

        // 3. Record the restock step
        newState.merchantLastRestock[npc.id] = newState.step;
        newState.merchantLastUpdated[npc.id] = newState.step;
      }
    }
  }

  // 4. Periodic passive tax gold generation for controlled faction territories (AF-29)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.territoryControl) {
    let totalTaxGold = 0;
    for (const [roomId, factionId] of Object.entries(newState.territoryControl)) {
      const syndicate = newState.syndicates?.[factionId];
      if (syndicate) {
        // Seized syndicate territory: collect regional taxes!
        const dominance = syndicate.dominance ?? 50;
        let roomTax = Math.max(1, Math.floor(dominance / 10));
        const rateMultiplier = newState.taxPolicy?.[factionId] ?? syndicate.turfTaxRate;
        if (rateMultiplier !== undefined) {
          roomTax = roomTax * rateMultiplier;
        }

        if (roomTax > 0) {
          // Distribute to syndicate members
          const members = syndicate.members ?? [];
          const share = members.length > 0 ? Math.floor(roomTax / members.length) : 0;
          if (share > 0) {
            if (!newState.vars) newState.vars = {};
            for (const member of members) {
              const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
              newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
            }
          }
          newState.journal.push(`[Syndicate] Syndicate ${factionId} collected ${roomTax} gold in regional taxes from controlled territory ${roomId} (Distributed ${share} gold to each member).`);
        }
      } else {
        const rep = newState.factionRep?.[factionId] ?? 0;
        if (rep > 0) {
          // Gain 1 gold per positive rep faction territory, plus bonus for higher rep
          let roomTax = Math.max(1, Math.floor(rep / 10));
          const rateMultiplier = newState.taxPolicy?.[factionId];
          if (rateMultiplier !== undefined) {
            roomTax = roomTax * rateMultiplier;
          }

          const espionage = newState.espionageNetworks?.[roomId];
          if (espionage && espionage.status !== "sabotaged") {
            const syndicate = newState.syndicates?.[espionage.syndicateId];
            if (syndicate) {
              const intercepted = Math.max(1, Math.floor(roomTax * 0.2));
              roomTax = Math.max(0, roomTax - intercepted);

              // Distribute the intercepted gold to the syndicate members
              const members = syndicate.members ?? [];
              const share = members.length > 0 ? Math.floor(intercepted / members.length) : 0;
              if (share > 0) {
                if (!newState.vars) newState.vars = {};
                for (const member of members) {
                  const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                  newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                }
              }
              newState.journal.push(`[Espionage] Espionage Network in room ${roomId} intercepted ${intercepted} gold of faction taxes from faction ${factionId} (Distributed ${share} gold to each member of syndicate ${espionage.syndicateId}).`);
            }
          }

          totalTaxGold += roomTax;
        }
      }
    }
    if (totalTaxGold > 0) {
      const currentGold = newState.vars["gold"] ?? 0;
      newState.vars["gold"] = currentGold + totalTaxGold;
      newState.vars["totalTaxesCollected"] = (newState.vars["totalTaxesCollected"] ?? 0) + totalTaxGold;
      newState.journal.push(`Collected ${totalTaxGold} gold in taxes from allied faction territories.`);
    }
  }

  // 5. Periodic passive protection racket collections (AF-45)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.protectionRackets) {
    for (const [merchantId, racket] of Object.entries(newState.protectionRackets)) {
      if (racket.active) {
        const syndicate = newState.syndicates?.[racket.syndicateId];
        if (syndicate) {
          // Find which room the merchant NPC is currently in
          const merchantRoom = pack.rooms.find((r: any) => r.npcs?.includes(merchantId));
          if (merchantRoom) {
            const turfSyndicateId = newState.syndicateTurf?.[merchantRoom.id];
            // Only collect if the syndicate currently controls the merchant's room turf!
            if (turfSyndicateId === racket.syndicateId) {
              const currentGold = newState.merchantGold?.[merchantId] ?? 100;
              const protectionFee = Math.min(racket.cost, currentGold);
              if (protectionFee > 0) {
                // Deduct from merchant
                if (!newState.merchantGold) newState.merchantGold = {};
                newState.merchantGold[merchantId] = currentGold - protectionFee;

                // Distribute among syndicate members
                const members = syndicate.members ?? [];
                const share = members.length > 0 ? Math.floor(protectionFee / members.length) : 0;
                if (share > 0) {
                  if (!newState.vars) newState.vars = {};
                  for (const member of members) {
                    const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                    newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                  }
                }

                newState.vars["totalExtortionGoldCollected"] = (newState.vars["totalExtortionGoldCollected"] ?? 0) + protectionFee;
                newState.journal.push(`[Syndicate] Collected passive protection fee of ${protectionFee} gold from merchant ${merchantId} on turf ${merchantRoom.id} (Distributed ${share} gold to each member).`);
              }
            }
          }
        }
      }
    }
  }

  // 6. Periodic passive front business laundering (AF-50)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.frontBusinesses) {
    const updatedFronts = { ...newState.frontBusinesses };
    let frontsChanged = false;

    for (const [merchantId, front] of Object.entries(updatedFronts)) {
      const syndicate = newState.syndicates?.[front.syndicateId];
      if (syndicate) {
        let frontUpdated = false;
        let dirty = front.dirtyGold;
        let clean = front.cleanGold;

        if (dirty > 0) {
          const launderRate = front.launderingRate * front.level;
          const launderedAmount = Math.min(dirty, launderRate);

          if (launderedAmount > 0) {
            dirty -= launderedAmount;
            clean += launderedAmount;

            // Distribute among syndicate members
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(launderedAmount / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
            }

            newState.vars["totalDirtyGoldLaundered"] = (newState.vars["totalDirtyGoldLaundered"] ?? 0) + launderedAmount;
            newState.journal.push(`[Syndicate] Front business ${front.id} laundered ${launderedAmount} gold (Distributed ${share} gold to each member).`);

            frontUpdated = true;
          }
        }

        // Reduce enforcer heat in the merchant's room based on syndicate dominance
        let currentHeat = 0;
        if (newState.enforcementHeat?.[front.roomId]) {
          const dominance = syndicate.dominance ?? 50;
          const heatReduction = Math.max(1, Math.floor((dominance / 25) * front.level));
          const entry = newState.enforcementHeat[front.roomId];
          const newHeat = Math.max(0, entry.heat - heatReduction);

          newState.enforcementHeat = {
            ...newState.enforcementHeat,
            [front.roomId]: {
              ...entry,
              heat: newHeat,
            },
          };
          newState.journal.push(`[Syndicate] Front business ${front.id} reduced enforcer heat in ${front.roomId} by ${heatReduction} (New heat: ${newHeat}).`);
          currentHeat = newHeat;
        }

        // Money Laundering Audit (AF-61)
        let activeAudit = front.activeAudit ?? false;
        if (activeAudit) {
          // AF-225: Partition grace period check
          let dropRate = 0;
          if (newState.swfMultiFundReinsurancePools) {
            for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
              if (pool.linkStateDropRate !== undefined) {
                dropRate = Math.max(dropRate, pool.linkStateDropRate);
              }
            }
          }
          const partitionThreshold = newState.swfAllianceYieldAutoRepayPartitionThreshold ?? 0.5;
          const underPartition = dropRate >= partitionThreshold;

          if (newState.swfAllianceYieldAutoRepayRate && underPartition) {
            const gracePeriodMultiplier = newState.swfAllianceYieldAutoRepayGracePeriodMultiplier ?? 1.0;
            const creditRating = newState.creditRatings?.[front.syndicateId] ?? 100;
            
            // ratingMultiplier: higher credit rating => smaller multiplier (reduces requirements)
            const ratingMultiplier = creditRating >= 100 
              ? Math.max(0.1, 1.0 - (creditRating - 100) / 200) 
              : 1.0 + (100 - creditRating) / 100;
            
            const baseGraceRequirement = 50;
            const effectiveGraceRequirement = Math.round(baseGraceRequirement * gracePeriodMultiplier * ratingMultiplier);
            
            if (creditRating >= effectiveGraceRequirement) {
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Alliance Audit Deflection] Enforcer audit deflected at front business ${front.id} under partition due to high credit rating and active yield repayment grace period (Credit Rating: ${creditRating} >= Effective Grace Requirement: ${effectiveGraceRequirement}, Grace Multiplier: ${gracePeriodMultiplier.toFixed(2)}, Rating Multiplier: ${ratingMultiplier.toFixed(2)}).`
              );
              activeAudit = false;
              if (newState.enforcementHeat?.[front.roomId]) {
                newState.enforcementHeat[front.roomId] = {
                  ...newState.enforcementHeat[front.roomId],
                  heat: Math.max(0, newState.enforcementHeat[front.roomId].heat - 10),
                };
              }
            }
          }
        }

        if (activeAudit) {
          // Resolve the audit!
          const outpost = newState.turfGuardOutposts?.[front.roomId];
          const guardsCount = newState.turfGuards?.[front.roomId]?.count ?? 0;
          const activeBribe = newState.syndicateBribes?.[front.roomId]?.active ?? false;
          const activeDeflection = newState.deflectionPolicies?.[front.roomId]?.active ?? false;

          let totalFirepower = 0;
          let totalArmor = 0;
          if (outpost && outpost.turrets) {
            for (const turret of Object.values(outpost.turrets)) {
              totalFirepower += (turret as any).firepower ?? 0;
              totalArmor += (turret as any).armor ?? 0;
            }
          }

          let defenseScore = guardsCount * 15 +
                             (outpost ? outpost.securityLevel * 25 : 0) +
                             (activeBribe ? 50 : 0) +
                             (activeDeflection ? 75 : 0) +
                             totalFirepower +
                             totalArmor;

          const { value: rawAuditStrength, nextSeed } = PureRand.nextInt(newState.seed, 20, 100);
          newState.seed = nextSeed;

          const synd = newState.syndicates?.[front.syndicateId];
          const defundingRate = synd?.enforcerDefundingRate ?? 0;
          const auditStrength = defundingRate > 0
            ? Math.max(1, Math.round(rawAuditStrength * (1 - defundingRate)))
            : rawAuditStrength;

          let eliteAuditDeflection = false;
          let deflectingEliteName = "";
          if (newState.eliteEnforcers) {
            const matchingElite = Object.values(newState.eliteEnforcers).find(
              e => e.syndicateId === front.syndicateId && e.status === "active"
            );
            if (matchingElite) {
              eliteAuditDeflection = true;
              deflectingEliteName = matchingElite.name;
            }
          }

          if (eliteAuditDeflection || defenseScore >= auditStrength) {
            // Defended!
            if (eliteAuditDeflection) {
              newState.journal.push(`[EliteEnforcer] Elite enforcer ${deflectingEliteName} intercepted and deflected the enforcer audit raid at front business ${front.id} in room ${front.roomId}!`);
            } else {
              newState.journal.push(`[Syndicate] Front business ${front.id} successfully passed money laundering audit in room ${front.roomId}! Active protection systems repelled regulators (Defense: ${defenseScore} vs Audit Strength: ${auditStrength}).`);
            }
            activeAudit = false;
            if (newState.enforcementHeat?.[front.roomId]) {
              newState.enforcementHeat[front.roomId] = {
                ...newState.enforcementHeat[front.roomId],
                heat: Math.max(0, newState.enforcementHeat[front.roomId].heat - 10),
              };
            }
          } else {
            // Failed audit!
            let confiscatedDirty = dirty;
            const damageReductionFactor = Math.max(0.1, 1 - (totalArmor / 100));
            let confiscationFactor = Math.max(0.1, 1 - (defenseScore / 200)) * damageReductionFactor;

            // Apply audit mitigation if active in this room (AF-82)
            const mitigation = newState.auditMitigations?.[front.roomId];
            if (mitigation && mitigation.active) {
              // Reduce confiscation rate by 25% per level, up to a maximum of 80% (0.8) mitigation
              const mitigationDiscount = Math.min(0.8, mitigation.mitigationLevel * 0.25);
              confiscatedDirty = Math.floor(dirty * (1 - mitigationDiscount));
              confiscationFactor *= (1 - mitigationDiscount);
            }

            const confiscatedClean = Math.floor(clean * confiscationFactor * 0.75);

            dirty -= confiscatedDirty;
            clean -= confiscatedClean;

            // Reset room heat since enforcers fully audited the business
            if (newState.enforcementHeat?.[front.roomId]) {
              newState.enforcementHeat[front.roomId] = {
                ...newState.enforcementHeat[front.roomId],
                heat: 0,
              };
            }

            newState.journal.push(`[Syndicate] Front business ${front.id} failed money laundering audit in room ${front.roomId}! Enforcers raided the premises, confiscating ${confiscatedDirty} dirty gold and ${confiscatedClean} clean gold (Defense: ${defenseScore} vs Audit Strength: ${auditStrength}).`);
            
            // Sweep syndicate bank balances on failed audit (AF-88)
            const syndicateId = front.syndicateId;
            const bank = newState.syndicateBanks?.[syndicateId];
            if (bank && bank.balances) {
              const newBalances = { ...bank.balances };
              let balancesChanged = false;
              for (const memberId of Object.keys(newBalances)) {
                const balance = newBalances[memberId] ?? 0;
                if (balance > 0) {
                  const hasInsurance = newState.depositInsurance?.[memberId]?.[syndicateId]?.active === true;
                  const lossRate = hasInsurance ? 0.05 : 0.25;
                  const seized = Math.floor(balance * lossRate);
                  if (seized > 0) {
                    newBalances[memberId] = balance - seized;
                    balancesChanged = true;
                    newState.journal.push(`[Bank Sweep] Failed Audit! Enforcers swept member ${memberId} bank deposit at syndicate ${syndicateId} bank, confiscating ${seized} gold (Insurance: ${hasInsurance ? "Active" : "None"}).`);
                  }
                }
              }
              if (balancesChanged && newState.syndicateBanks) {
                newState.syndicateBanks[syndicateId] = {
                  ...bank,
                  balances: newBalances,
                  timestamp: newState.step,
                };
              }
            }

            activeAudit = false;
          }
          frontUpdated = true;
        } else {
          // Check if an audit triggers
          const launderingVolume = dirty + clean;
          const heat = newState.enforcementHeat?.[front.roomId]?.heat ?? 0;
          if (heat > 0 || launderingVolume > 0) {
            const auditChance = Math.min(95, Math.floor(heat * 0.5 + launderingVolume * 0.1));
            const { value: rolled, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
            newState.seed = nextSeed;
            if (rolled <= auditChance) {
              activeAudit = true;
              newState.journal.push(`[Syndicate] Money laundering audit triggered at front business ${front.id} in room ${front.roomId}! Overall enforcer heat is ${heat} and laundering volume is ${launderingVolume}. Regulators will audit the business next tick.`);
              frontUpdated = true;
            }
          }
        }

        // Check for laundering-volume-based dynamic events (AF-51)
        // If the front business is highly active (cleanGold >= 150)
        if (clean >= 150) {
          if (currentHeat >= 25) {
            // Trigger Enforcer Sweep!
            const outpost = newState.turfGuardOutposts?.[front.roomId];
            const guards = newState.turfGuards?.[front.roomId]?.count ?? 0;
            let sweepDefended = false;
            let sweepStrength = 0;

            let totalFirepower = 0;
            let totalArmor = 0;
            if (outpost && outpost.turrets) {
              for (const turret of Object.values(outpost.turrets)) {
                totalFirepower += turret.firepower;
                totalArmor += turret.armor;
              }
            }

            let defenseScore = guards * 15 + (outpost ? outpost.securityLevel * 25 : 0) + totalFirepower + totalArmor;

            if (guards > 0 || outpost) {
              const { value: rolledStrength, nextSeed } = PureRand.nextInt(newState.seed, 1, 50);
              newState.seed = nextSeed;
              const synd = newState.syndicates?.[front.syndicateId];
              const defundingRate = synd?.enforcerDefundingRate ?? 0;
              sweepStrength = defundingRate > 0
                ? Math.max(1, Math.round(rolledStrength * (1 - defundingRate)))
                : rolledStrength;
              if (defenseScore >= sweepStrength) {
                sweepDefended = true;
              }
            }

            // Saboteur Sweep Deflection (AF-74)
            let saboteurDeflection = false;
            let deflectingSaboteurName = "";
            if (newState.saboteurs) {
              const matchingSaboteur = Object.values(newState.saboteurs).find(
                s => s.syndicateId === front.syndicateId && s.status === "active"
              );
              if (matchingSaboteur) {
                saboteurDeflection = true;
                deflectingSaboteurName = matchingSaboteur.name;
              }
            }

            // Elite Enforcer Sweep Interception (AF-75)
            let eliteDeflection = false;
            let deflectingEliteName = "";
            if (newState.eliteEnforcers) {
              const matchingElite = Object.values(newState.eliteEnforcers).find(
                e => e.syndicateId === front.syndicateId && e.status === "active"
              );
              if (matchingElite) {
                eliteDeflection = true;
                deflectingEliteName = matchingElite.name;
              }
            }

            // Decoy Convoy Diversion (AF-76)
            let decoyDiverted = false;
            let divertedDecoyId = "";
            const activeDecoys = Object.values(newState.decoyConvoys || {}).filter(
              d => d.syndicateId === front.syndicateId && d.status === "en_route"
            );
            if (activeDecoys.length > 0) {
              const decoy = activeDecoys[0];
              decoyDiverted = true;
              divertedDecoyId = decoy.id;
              
              newState.decoyConvoys = {
                ...(newState.decoyConvoys || {}),
                [decoy.id]: {
                  ...decoy,
                  status: "diverted" as const,
                  timestamp: newState.step,
                }
              };
              sweepDefended = true;
            }

            // Turf Bribe Diversion (AF-76)
            let bribeDiverted = false;
            let paidBribeAmount = 0;
            const synd = newState.syndicates?.[front.syndicateId];
            const turfBribeCost = synd?.turfBribeCost ?? 0;
            if (!sweepDefended && synd && turfBribeCost > 0 && (synd.warChest ?? 0) >= turfBribeCost) {
              synd.warChest = (synd.warChest ?? 0) - turfBribeCost;
              bribeDiverted = true;
              paidBribeAmount = turfBribeCost;
              sweepDefended = true;
            }

            if (saboteurDeflection || eliteDeflection) {
              sweepDefended = true;
            }

            if (sweepDefended) {
              if (decoyDiverted) {
                newState.journal.push(`[Syndicate] Enforcer sweep at front business ${front.id} in room ${front.roomId} was successfully diverted by decoy convoy ${divertedDecoyId}!`);
              } else if (bribeDiverted && synd) {
                newState.journal.push(`[Syndicate] Enforcer sweep at front business ${front.id} in room ${front.roomId} was successfully diverted by paying a turf bribe of ${paidBribeAmount} gold from syndicate ${synd.name} war chest!`);
              } else if (eliteDeflection) {
                newState.journal.push(`[EliteEnforcer] Elite enforcer ${deflectingEliteName} intercepted and repelled the enforcer sweep at front business ${front.id} in room ${front.roomId}!`);
              } else if (saboteurDeflection) {
                newState.journal.push(`[Saboteur] Saboteur ${deflectingSaboteurName} successfully deflected the enforcer sweep at front business ${front.id} in room ${front.roomId}!`);
              } else if (outpost) {
                let msg = `[Syndicate] Enforcer sweep at front business ${front.id} in room ${front.roomId} was successfully repelled by ${guards} hired turf guards and Defense Outpost (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})!`;
                if (totalFirepower > 0) {
                  msg = `[Syndicate] Enforcer sweep at front business ${front.id} in room ${front.roomId} was successfully repelled! Tactical turrets struck down enforcer forces with high firepower (Firepower: ${totalFirepower}, Armor: ${totalArmor}, Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})!`;
                }
                newState.journal.push(msg);
              } else {
                newState.journal.push(`[Syndicate] Enforcer sweep at front business ${front.id} in room ${front.roomId} was successfully repelled by ${guards} hired turf guards (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})!`);
              }
              if (newState.enforcementHeat?.[front.roomId]) {
                newState.enforcementHeat[front.roomId] = {
                  ...newState.enforcementHeat[front.roomId],
                  heat: Math.max(0, newState.enforcementHeat[front.roomId].heat - 15),
                };
              }
            } else {
              const damageReductionFactor = Math.max(0.1, 1 - (totalArmor / 100));
              const confiscatedDirty = Math.floor(dirty * damageReductionFactor);
              const confiscatedClean = Math.floor(Math.floor(clean / 2) * damageReductionFactor);
              dirty -= confiscatedDirty;
              clean -= confiscatedClean;

              // Reset room heat
              if (newState.enforcementHeat?.[front.roomId]) {
                newState.enforcementHeat[front.roomId] = {
                  ...newState.enforcementHeat[front.roomId],
                  heat: 0,
                };
              }

              if (totalFirepower > 0 || totalArmor > 0) {
                newState.journal.push(`[Syndicate] Tactical turrets fired upon enforcers, striking down enforcer forces and mitigating sweep losses by ${Math.round((1 - damageReductionFactor) * 100)}% using heavy armor (Firepower: ${totalFirepower}, Armor: ${totalArmor}).`);
              }

              if (guards > 0) {
                newState.journal.push(`[Syndicate] Enforcer sweep triggered at front business ${front.id} in room ${front.roomId}! Hired turf guards failed to defend the business (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength}). Confiscated ${confiscatedDirty} dirty gold and ${confiscatedClean} clean gold.`);
              } else {
                newState.journal.push(`[Syndicate] Enforcer sweep triggered at front business ${front.id} in room ${front.roomId} due to high laundering volume and heat! Confiscated ${confiscatedDirty} dirty gold and ${confiscatedClean} clean gold.`);
              }

              // Sweep syndicate bank balances on failed enforcer sweep (AF-88)
              const syndicateId = front.syndicateId;
              const bank = newState.syndicateBanks?.[syndicateId];
              if (bank && bank.balances) {
                const newBalances = { ...bank.balances };
                let balancesChanged = false;
                for (const memberId of Object.keys(newBalances)) {
                  const balance = newBalances[memberId] ?? 0;
                  if (balance > 0) {
                    const hasInsurance = newState.depositInsurance?.[memberId]?.[syndicateId]?.active === true;
                    const lossRate = hasInsurance ? 0.05 : 0.25;
                    const seized = Math.floor(balance * lossRate);
                    if (seized > 0) {
                      newBalances[memberId] = balance - seized;
                      balancesChanged = true;
                      newState.journal.push(`[Bank Sweep] Enforcer Sweep! Enforcers swept member ${memberId} bank deposit at syndicate ${syndicateId} bank, confiscating ${seized} gold (Insurance: ${hasInsurance ? "Active" : "None"}).`);
                    }
                  }
                }
                if (balancesChanged && newState.syndicateBanks) {
                  newState.syndicateBanks[syndicateId] = {
                    ...bank,
                    balances: newBalances,
                    timestamp: newState.step,
                  };
                }
              }
            }
            frontUpdated = true;
          } else {
            // Trigger Regional Market Boost!
            const p = pack as any;
            const npc = p.npcs?.find((n: any) => n.id === merchantId);
            let mGold = 100;
            if (newState.merchantGold?.[merchantId] !== undefined) {
              mGold = newState.merchantGold[merchantId];
            } else if (npc) {
              mGold = npc.gold ?? npc.gold_limit ?? 100;
            }

            if (!newState.merchantGold) newState.merchantGold = {};
            newState.merchantGold[merchantId] = mGold + 100;

            // Increase syndicate dominance by 5 (up to max 100)
            if (newState.syndicates?.[front.syndicateId]) {
              const dominance = newState.syndicates[front.syndicateId].dominance ?? 50;
              const newDominance = Math.min(100, dominance + 5);
              
              // Deep copy / update dominance
              newState.syndicates = {
                ...newState.syndicates,
                [front.syndicateId]: {
                  ...newState.syndicates[front.syndicateId],
                  dominance: newDominance,
                }
              };
              newState.journal.push(`[Syndicate] Regional market boost triggered at front business ${front.id} in room ${front.roomId}! Local syndicate dominance increased to ${newDominance} and merchant gold increased by 100.`);
            }

            frontUpdated = true;
          }
        }

        // Find which syndicate currently controls the room turf where this front business operates
        const controllingSyndicateId = newState.syndicateTurf?.[front.roomId];
        if (controllingSyndicateId) {
          const controllingSyndicate = newState.syndicates?.[controllingSyndicateId];
          if (controllingSyndicate) {
            const taxRate = controllingSyndicate.turfTaxRate ?? 0;
            if (taxRate > 0) {
              const guardsCount = newState.turfGuards?.[front.roomId]?.count ?? 0;
              const outpost = newState.turfGuardOutposts?.[front.roomId];
              // Enhanced tax passive bonus: extra tax multiplier/bonus based on outpost securityLevel
              const outpostBonus = outpost ? outpost.securityLevel * 2 : 0;
              // Tax scales by local turf guard security presence: taxRate * (1 + guardsCount + outpostBonus)
              const taxAmount = taxRate * (1 + guardsCount + outpostBonus);
              const fullTaxAmount = Math.min(taxAmount, clean);
              if (fullTaxAmount > 0) {
                clean -= fullTaxAmount;
                frontUpdated = true;

                let actualPayout = fullTaxAmount;
                const wiretap = newState.wiretaps?.[front.roomId];
                if (wiretap && wiretap.syndicateId !== controllingSyndicateId && wiretap.status !== "sabotaged") {
                  const wiretapSyndicate = newState.syndicates?.[wiretap.syndicateId];
                  if (wiretapSyndicate) {
                    const intercepted = Math.max(1, Math.floor(fullTaxAmount * 0.2));
                    actualPayout = Math.max(0, actualPayout - intercepted);

                    const wMembers = wiretapSyndicate.members ?? [];
                    const wShare = wMembers.length > 0 ? Math.floor(intercepted / wMembers.length) : 0;
                    if (wShare > 0) {
                      if (!newState.vars) newState.vars = {};
                      for (const member of wMembers) {
                        const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                        newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + wShare;
                      }
                    }
                    newState.journal.push(`[Espionage] Wiretap in room ${front.roomId} intercepted ${intercepted} gold of turf taxes from rival syndicate ${controllingSyndicateId} (Distributed ${wShare} gold to each member of syndicate ${wiretap.syndicateId}).`);
                  }
                }

                // Distribute collected gold among syndicate members
                const members = controllingSyndicate.members ?? [];
                const share = members.length > 0 ? Math.floor(actualPayout / members.length) : 0;
                if (share > 0) {
                  if (!newState.vars) newState.vars = {};
                  for (const member of members) {
                    const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                    newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                  }
                }

                newState.vars["totalTurfTaxesCollected"] = (newState.vars["totalTurfTaxesCollected"] ?? 0) + actualPayout;
                newState.journal.push(`[Syndicate] Syndicate ${controllingSyndicateId} collected ${actualPayout} gold in turf taxes from front business ${front.id} in room ${front.roomId} (Guards: ${guardsCount}, Distributed ${share} gold to each member).`);
              }
            }

            // Collect dynamic security premiums via tactical turrets
            const localOutpost = newState.turfGuardOutposts?.[front.roomId];
            let totalPremiumRate = 0;
            if (localOutpost && localOutpost.turrets) {
              for (const turret of Object.values(localOutpost.turrets)) {
                totalPremiumRate += (turret as any).premiumRate;
              }
            }

            if (totalPremiumRate > 0 && clean > 0) {
              const securityPremium = Math.floor(clean * totalPremiumRate);
              if (securityPremium > 0) {
                clean -= securityPremium;
                frontUpdated = true;

                // Distribute collected premium among syndicate members
                const members = controllingSyndicate.members ?? [];
                const premiumShare = members.length > 0 ? Math.floor(securityPremium / members.length) : 0;
                if (premiumShare > 0) {
                  if (!newState.vars) newState.vars = {};
                  for (const member of members) {
                    const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                    newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + premiumShare;
                  }
                }

                newState.vars["totalSecurityPremiumsCollected"] = (newState.vars["totalSecurityPremiumsCollected"] ?? 0) + securityPremium;
                newState.journal.push(`[Syndicate] Syndicate ${controllingSyndicateId} collected ${securityPremium} gold in dynamic security premiums from front business ${front.id} in room ${front.roomId} via tactical turrets (Premium Rate: ${totalPremiumRate * 100}%, Distributed ${premiumShare} gold to each member).`);
              }
            }
          }
        }

        if (frontUpdated) {
          updatedFronts[merchantId] = {
            ...front,
            dirtyGold: dirty,
            cleanGold: clean,
            activeAudit: activeAudit,
            timestamp: newState.step,
          };
          frontsChanged = true;
        }
      }
    }

    if (frontsChanged) {
      newState.frontBusinesses = updatedFronts;
    }
  }

  // 7. Periodic wiretap intelligence leakage (AF-64)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.wiretaps) {
    for (const [roomId, wiretap] of Object.entries(newState.wiretaps)) {
      if (wiretap.status === "sabotaged") continue;
      const txJournal = newState.transactionJournal || [];
      const rivalTxs = txJournal.filter(tx => {
        const syndicate = newState.syndicates?.[wiretap.syndicateId];
        const isRival = syndicate ? !syndicate.members.includes(tx.agentId) : true;
        return isRival;
      }).slice(-3);

      if (rivalTxs.length > 0) {
        if (!newState.cooperativeSyncLog) newState.cooperativeSyncLog = [];
        for (const tx of rivalTxs) {
          const logEntry = `[Wiretap Leak] Room ${roomId} intercepted transaction: Agent ${tx.agentId}, Step ${tx.sequenceNumber}, Action ${tx.action.type}, Timestamp ${tx.timestamp}`;
          if (!newState.cooperativeSyncLog.includes(logEntry)) {
            newState.cooperativeSyncLog.push(logEntry);
            newState.journal.push(logEntry);
          }
        }
      }
    }
  }

  // 8. Contraband Tunnel Maintenance Ticking (AF-84)
  if (newState.contrabandTunnels && newState.syndicates) {
    const syndicates = { ...newState.syndicates } as Record<string, any>;
    for (const [tunnelId, tunnel] of Object.entries(newState.contrabandTunnels)) {
      const syndicate = syndicates[tunnel.syndicateId];
      if (syndicate) {
        const maintenanceCost = 15; // 15 gold per step maintenance cost
        const currentWarChest = syndicate.warChest ?? 0;
        const newWarChest = Math.max(0, currentWarChest - maintenanceCost);
        syndicates[tunnel.syndicateId] = {
          ...syndicate,
          warChest: newWarChest,
        };
        newState.journal.push(`[Underground Railroad] Contraband tunnel ${tunnelId} incurred maintenance cost of ${maintenanceCost} gold deducted from syndicate ${tunnel.syndicateId} war chest (New war chest balance: ${newWarChest}).`);
      }
    }
    newState.syndicates = syndicates;
  }

  // 9. Automated Tunnel Transport Drone Contraband Profits Ticking (AF-84)
  if (newState.tunnelDrones && newState.contrabandTunnels && newState.syndicates) {
    const syndicates = newState.syndicates as Record<string, any>;
    for (const [droneId, drone] of Object.entries(newState.tunnelDrones)) {
      if (drone.active) {
        const tunnel = newState.contrabandTunnels[drone.tunnelId];
        if (tunnel) {
          const syndicate = syndicates[drone.syndicateId];
          if (syndicate) {
            const profit = 40; // 40 gold passive profit
            const members = syndicate.members ?? [];
            const share = members.length > 0 ? Math.floor(profit / members.length) : 0;
            if (share > 0) {
              if (!newState.vars) newState.vars = {};
              for (const member of members) {
                const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
              }
              newState.journal.push(`[Underground Railroad] Tunnel transport drone ${droneId} in tunnel ${drone.tunnelId} automated contraband transport safely, bypassing surface sweeps. Distributed profit of ${profit} gold (${share} gold per member) to syndicate ${drone.syndicateId}.`);
            }
          }
        }
      }
    }
  }

  // Periodic Safehouse Storage Rent & Over-limit Penalties Ticking (AF-85)
  if (newState.safehouses) {
    for (const [roomId, safehouse] of Object.entries(newState.safehouses)) {
      const syndicate = newState.syndicates?.[safehouse.syndicateId];
      if (!syndicate) continue;

      // 1. Non-member storage rent
      const rentRate = safehouse.storageRentRate ?? newState.safehouseRentPolicies?.[roomId] ?? 0;
      if (rentRate > 0) {
        for (const itemId of safehouse.stashItems) {
          const itemOwner = newState.stashItemOwners?.[itemId];
          // If owner is known and is not in the syndicate members, charge rent!
          if (itemOwner && !syndicate.members.includes(itemOwner)) {
            const ownerGoldKey = itemOwner === "player" ? "gold" : `gold_${itemOwner}`;
            const currentGold = newState.vars[ownerGoldKey] ?? 0;
            const paidRent = Math.min(currentGold, rentRate);
            if (paidRent > 0) {
              newState.vars[ownerGoldKey] = currentGold - paidRent;

              // Distribute profits to syndicate members
              const members = syndicate.members ?? [];
              const share = members.length > 0 ? Math.floor(paidRent / members.length) : 0;
              if (share > 0) {
                for (const member of members) {
                  const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                  newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                }
              }
              newState.journal.push(`[Safehouse Rent] Charged non-member agent ${itemOwner} ${paidRent} gold rent for storing item ${itemId} in room ${roomId}. Distributed to syndicate ${safehouse.syndicateId} members.`);
            }
          }
        }
      }

      // 2. Over-limit penalty
      const dynamicCap = getSafehouseStorageCapacity(newState, roomId);
      if (safehouse.stashItems.length > dynamicCap) {
        const overLimitCount = safehouse.stashItems.length - dynamicCap;
        const penaltyRate = 20; // 20 gold per over-limit item per tick
        const totalPenalty = overLimitCount * penaltyRate;

        // Charge safehouse owner
        const ownerGoldKey = safehouse.ownerId === "player" ? "gold" : `gold_${safehouse.ownerId}`;
        const currentGold = newState.vars[ownerGoldKey] ?? 0;
        const paidPenalty = Math.min(currentGold, totalPenalty);
        if (paidPenalty > 0) {
          newState.vars[ownerGoldKey] = currentGold - paidPenalty;
          newState.journal.push(`[Safehouse Penalty] Safehouse in room ${roomId} is over capacity (${safehouse.stashItems.length}/${dynamicCap}). Charged owner ${safehouse.ownerId} a penalty of ${paidPenalty} gold for over-limit storage.`);
        }
      }
    }
  }

  // Periodic Syndicate Bank Interest Ticking (AF-86)
  if (newState.syndicateBanks) {
    newState.syndicateBanks = { ...newState.syndicateBanks };
    for (const [syndicateId, bank] of Object.entries(newState.syndicateBanks)) {
      const syndicate = newState.syndicates?.[syndicateId];
      if (!syndicate) continue;

      const interestRate = bank.interestRate ?? newState.bankInterestPolicies?.[syndicateId] ?? 0;
      if (interestRate > 0) {
        const balances = { ...(bank.balances as Record<string, number>) };
        let balancesChanged = false;
        const cap = getSyndicateBankCapacity(newState, syndicateId);

        for (const [agentId, balance] of Object.entries(balances)) {
          // Interest is paid to members!
          if (syndicate.members.includes(agentId) && balance > 0) {
            const totalBalances = Object.values(balances).reduce((a, b) => a + b, 0);
            const remainingCap = Math.max(0, cap - totalBalances);
            if (remainingCap > 0) {
              const interest = Math.min(remainingCap, Math.floor((balance * interestRate) / 100));
              if (interest > 0) {
                balances[agentId] = balance + interest;
                balancesChanged = true;
                newState.journal.push(`[Bank Interest] Credited ${interest} gold interest to member ${agentId} in syndicate ${syndicateId} bank. New balance: ${balances[agentId]} (Capacity: ${cap}).`);
              }
            }
          }
        }

        if (balancesChanged) {
          newState.syndicateBanks[syndicateId] = {
            ...bank,
            balances,
            timestamp: newState.step,
          };
        }
      }
    }
  }

  // Periodic Syndicate Bank Loan Ticking & Debt-Recovery (AF-87)
  if (newState.syndicateBanks) {
    newState.syndicateBanks = { ...newState.syndicateBanks };
    for (const [syndicateId, bank] of Object.entries(newState.syndicateBanks)) {
      if (bank.loans && Object.keys(bank.loans).length > 0) {
        const loans = { ...bank.loans };
        let loansChanged = false;

        for (const [agentId, loan] of Object.entries(loans)) {
          // 1. Accrue loan interest
          const factionId = newState.territoryControl?.[loan.collateralId];
          let discount = 0;
          if (factionId) {
            const loyaltyRank = getSyndicateFactionLoyaltyRank(newState, syndicateId, factionId);
            if (loyaltyRank === "Bronze") discount = 1;
            else if (loyaltyRank === "Silver") discount = 2;
            else if (loyaltyRank === "Gold") discount = 3;
            else if (loyaltyRank === "Platinum") discount = 5;
          }
          const baseRate = loan.refinancedInterestRate !== undefined ? loan.refinancedInterestRate : (bank.interestRate ?? 5);
          const loanRate = Math.max(0, baseRate - discount);
          const interest = Math.floor((loan.amount * loanRate) / 100);

          let updatedLoan = {
            ...loan,
            interestAccrued: loan.interestAccrued + interest,
            timestamp: newState.step,
          };
          loans[agentId] = updatedLoan;
          loansChanged = true;

          // 2. Check for default / enforcer debt-recovery sweep
          let factionGraceExtension = 0;
          const agentSyndicateId = Object.keys(newState.syndicates ?? {}).find(sid => newState.syndicates?.[sid]?.members.includes(agentId));
          if (agentSyndicateId) {
            const mAcc = newState.marginAccounts?.[agentSyndicateId];
            if (mAcc && mAcc.swfGracePeriodExtensions) {
              for (const steps of Object.values(mAcc.swfGracePeriodExtensions)) {
                factionGraceExtension += steps;
              }
            }
          }
          if (newState.step > updatedLoan.dueStep + factionGraceExtension) {
            // Debt-recovery sweep!
            const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
            const agentGold = newState.vars[goldKey] ?? 0;
            const totalDue = updatedLoan.amount + updatedLoan.interestAccrued;

            let collected = 0;
            let remainingDue = totalDue;

            if (agentGold >= totalDue) {
              newState.vars[goldKey] = agentGold - totalDue;
              collected = totalDue;
              remainingDue = 0;
            } else {
              newState.vars[goldKey] = 0;
              collected = agentGold;
              remainingDue = totalDue - collected;
            }

            // Asset liquidation
            if (updatedLoan.collateralType === "safehouse") {
              if (newState.safehouses) {
                newState.safehouses = { ...newState.safehouses };
                delete newState.safehouses[updatedLoan.collateralId];
              }
            } else if (updatedLoan.collateralType === "outpost") {
              if (newState.turfGuardOutposts) {
                newState.turfGuardOutposts = { ...newState.turfGuardOutposts };
                delete newState.turfGuardOutposts[updatedLoan.collateralId];
              }
              if (newState.turfGuards) {
                newState.turfGuards = { ...newState.turfGuards };
                delete newState.turfGuards[updatedLoan.collateralId];
              }
            }

            // Increase enforcer heat in the collateral's room (collateralId is the roomId for safehouses and outposts)
            if (newState.enforcementHeat) {
              newState.enforcementHeat = { ...newState.enforcementHeat };
              const currentHeat = newState.enforcementHeat[updatedLoan.collateralId]?.heat ?? 0;
              newState.enforcementHeat[updatedLoan.collateralId] = {
                roomId: updatedLoan.collateralId,
                heat: currentHeat + 15,
                timestamp: newState.step,
              };
            }

            // Decrease credit rating
            if (!newState.creditRatings) newState.creditRatings = {};
            const currentRating = newState.creditRatings[agentId] ?? 100;
            newState.creditRatings[agentId] = Math.max(0, currentRating - 50);

            // Add default alert
            if (!newState.defaultAlerts) newState.defaultAlerts = {};
            const alertKey = `${agentId}_${syndicateId}`;
            newState.defaultAlerts[alertKey] = {
              agentId,
              syndicateId,
              defaultStep: newState.step,
              timestamp: newState.step,
            };

            newState.journal.push(`[Credit Score] Agent ${agentId} credit rating decreased by -50 due to default (New Score: ${newState.creditRatings[agentId]}).`);
            newState.journal.push(`[Gossip Mesh Alert] Broadcasted debt default alert for agent ${agentId} (Defaulted at bank ${syndicateId}). Blacklisted mesh-wide.`);

            newState.journal.push(
              `[Debt Recovery] Loan for agent ${agentId} is in default! Enforcers swept agent's gold, collecting ${collected} gold (Remaining due: ${remainingDue}). Liquidated collateral ${updatedLoan.collateralType} ${updatedLoan.collateralId}.`
            );

            delete loans[agentId];
          }
        }

        if (loansChanged) {
          newState.syndicateBanks[syndicateId] = {
            ...bank,
            loans,
            timestamp: newState.step,
          };
        }
      }
    }
  }

  // Periodic Joint-Liability Loan Groups Ticking & Debt-Recovery (AF-91)
  if (newState.jointLoans && Object.keys(newState.jointLoans).length > 0) {
    newState.jointLoans = { ...newState.jointLoans };
    const jointLoans = { ...newState.jointLoans };
    let jointLoansChanged = false;

    for (const [groupId, jointLoan] of Object.entries(jointLoans)) {
      const bank = newState.syndicateBanks?.[jointLoan.syndicateId];
      // 1. Accrue loan interest
      const underwrittenRate = newState.jointLoanUnderwrites?.[groupId]?.baseInterestRate;
      const baseRate = jointLoan.reducedInterestRate !== undefined 
        ? jointLoan.reducedInterestRate 
        : (jointLoan.refinancedInterestRate !== undefined 
          ? jointLoan.refinancedInterestRate 
          : (underwrittenRate !== undefined ? underwrittenRate : (bank?.interestRate ?? 5)));
      let jointFactionId: string | undefined;
      if (jointLoan.collaterals && jointLoan.collaterals.length > 0) {
        for (const col of jointLoan.collaterals) {
          const fId = newState.territoryControl?.[col.collateralId];
          if (fId) {
            jointFactionId = fId;
            break;
          }
        }
      }
      let jointDiscount = 0;
      if (jointFactionId) {
        const loyaltyRank = getSyndicateFactionLoyaltyRank(newState, jointLoan.syndicateId, jointFactionId);
        if (loyaltyRank === "Bronze") jointDiscount = 1;
        else if (loyaltyRank === "Silver") jointDiscount = 2;
        else if (loyaltyRank === "Gold") jointDiscount = 3;
        else if (loyaltyRank === "Platinum") jointDiscount = 5;
      }
      const loanRate = Math.max(0, baseRate - jointDiscount);
      
      let subsidyRate = 0;
      if (newState.interestSubsidies && newState.syndicateAlliances) {
        for (const [subId, subsidy] of Object.entries(newState.interestSubsidies)) {
          if (subsidy.active && (subsidy.syndicateIdA === jointLoan.syndicateId || subsidy.syndicateIdB === jointLoan.syndicateId)) {
            const partnerSyndId = subsidy.syndicateIdA === jointLoan.syndicateId ? subsidy.syndicateIdB : subsidy.syndicateIdA;
            const allied = newState.syndicateAlliances[jointLoan.syndicateId]?.[partnerSyndId] === "allied" || 
                           newState.syndicateAlliances[partnerSyndId]?.[jointLoan.syndicateId] === "allied";
            if (allied) {
              const defaults = newState.groupDefaults?.[groupId] ?? 0;
              if (defaults === 0) {
                subsidyRate += subsidy.subsidyRate;
              }
            }
          }
        }
      }
      const finalRate = Math.max(0, loanRate - subsidyRate);
      const interest = Math.floor((jointLoan.amount * finalRate) / 100);

      if (subsidyRate > 0) {
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Interest Subsidy] Applied cooperative subsidy of -${subsidyRate}% from allied partner to group ${groupId}'s loan interest rate (Final Rate: ${finalRate}%, Base Rate: ${loanRate}%).`
        );
      }

      let updatedJointLoan = {
        ...jointLoan,
        interestAccrued: jointLoan.interestAccrued + interest,
        timestamp: newState.step,
      };
      jointLoans[groupId] = updatedJointLoan;
      jointLoansChanged = true;

      // 2. Check for default / enforcer debt-recovery sweep
      let factionGraceExtension = 0;
      const mAcc = newState.marginAccounts?.[updatedJointLoan.syndicateId];
      if (mAcc && mAcc.swfGracePeriodExtensions) {
        for (const steps of Object.values(mAcc.swfGracePeriodExtensions)) {
          factionGraceExtension += steps;
        }
      }
      if (newState.step > updatedJointLoan.dueStep + (updatedJointLoan.gracePeriodSteps ?? 0) + factionGraceExtension) {
        // Increment group defaults counter
        if (!newState.groupDefaults) {
          newState.groupDefaults = {};
        } else {
          newState.groupDefaults = { ...newState.groupDefaults };
        }
        newState.groupDefaults[groupId] = (newState.groupDefaults[groupId] ?? 0) + 1;

        // Increment syndicate defaults counter (AF-104)
        if (!newState.syndicateDefaults) {
          newState.syndicateDefaults = {};
        } else {
          newState.syndicateDefaults = { ...newState.syndicateDefaults };
        }
        const syndId = updatedJointLoan.syndicateId;
        newState.syndicateDefaults[syndId] = (newState.syndicateDefaults[syndId] ?? 0) + 1;

        // Debt-recovery sweep!
        const totalDue = updatedJointLoan.amount + updatedJointLoan.interestAccrued;

        // Calculate total collateral value
        let totalCollateralValue = 0;
        const collateralValues: Record<string, number> = {};
        for (const col of updatedJointLoan.collaterals) {
          const val = getCollateralValue(newState, col.collateralType, col.collateralId);
          collateralValues[`${col.agentId}_${col.collateralId}`] = val;
          totalCollateralValue += val;
        }

        // Proportional liability distribution
        const members = updatedJointLoan.members;
        const proportions: Record<string, number> = {};
        for (const agentId of members) {
          // Find collateral pledged by this agent
          let agentCollateralValue = 0;
          for (const col of updatedJointLoan.collaterals) {
            if (col.agentId === agentId) {
              agentCollateralValue += collateralValues[`${col.agentId}_${col.collateralId}`] ?? 0;
            }
          }
          proportions[agentId] = totalCollateralValue > 0 ? (agentCollateralValue / totalCollateralValue) : (1 / members.length);
        }

        // Distribute total due
        const dueShares: Record<string, number> = {};
        let distributedSum = 0;
        for (let i = 0; i < members.length; i++) {
          const agentId = members[i];
          if (i === members.length - 1) {
            dueShares[agentId] = totalDue - distributedSum;
          } else {
            const share = Math.floor(totalDue * proportions[agentId]);
            dueShares[agentId] = share;
            distributedSum += share;
          }
        }

        if (!newState.vars) newState.vars = {};
        if (!newState.journal) newState.journal = [];

        // Collect from each member
        let totalCollected = 0;
        const sparedAgents = new Set<string>();

        if (newState.jointLoanInsurancePools) {
          newState.jointLoanInsurancePools = { ...newState.jointLoanInsurancePools };
        }

        for (const agentId of members) {
          const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
          const agentGold = newState.vars[goldKey] ?? 0;
          const shareDue = dueShares[agentId];

          let collected = 0;
          let remainingDue = shareDue;

          // Apply insurance coverage first
          const policyKey = `${agentId}_${groupId}`;
          const policy = newState.agentPremiumPolicies?.[policyKey];
          let coveragePaid = 0;

          if (policy && policy.active) {
            const primarySyndId = updatedJointLoan.syndicateId;
            let pool = newState.jointLoanInsurancePools?.[primarySyndId];

            // Perform Secondary Reserve Ratio Compliance Checks and Deductions first!
            const reserve = newState.secondaryReserves?.[primarySyndId];
            if (reserve && pool && pool.poolGold > 0) {
              const reserveRatio = reserve.reserveRatio;
              const targetReserve = Math.ceil(pool.poolGold * reserveRatio);
              const currentReserveGold = reserve.reserveGold;
              if (currentReserveGold < targetReserve) {
                const deficit = targetReserve - currentReserveGold;
                const deduction = Math.min(pool.poolGold, deficit);
                if (deduction > 0) {
                  // Deduct from primary pool
                  const updatedPool = { ...pool };
                  updatedPool.poolGold -= deduction;
                  updatedPool.timestamp = newState.step;
                  newState.jointLoanInsurancePools![primarySyndId] = updatedPool;

                  // Add to secondary reserve
                  const updatedReserve = {
                    ...reserve,
                    reserveGold: currentReserveGold + deduction,
                    timestamp: newState.step,
                  };
                  if (!newState.secondaryReserves) {
                    newState.secondaryReserves = {};
                  }
                  newState.secondaryReserves[primarySyndId] = updatedReserve;

                  newState.journal.push(
                    `[Secondary Reserve] Syndicate ${primarySyndId} completed ratio compliance check: deducted ${deduction} gold from primary pool to secondary reserve (Target: ${targetReserve}, New Reserve: ${updatedReserve.reserveGold}, Pool Gold: ${updatedPool.poolGold}).`
                  );
                }
              }
            }

            // Get a fresh copy of the primary pool after potential compliance deductions!
            pool = newState.jointLoanInsurancePools?.[primarySyndId];
            if (pool && pool.poolGold > 0) {
              const updatedPool = { ...pool };
              coveragePaid = Math.min(remainingDue, updatedPool.poolGold);
              updatedPool.poolGold -= coveragePaid;
              updatedPool.timestamp = newState.step;
              newState.jointLoanInsurancePools![primarySyndId] = updatedPool;
              
              remainingDue -= coveragePaid;
              collected += coveragePaid;
              newState.journal.push(`[Insurance Pool] Joint loan insurance pool covered ${coveragePaid} gold of agent ${agentId}'s share of group ${groupId} default.`);
            }

            // Fallback: Sourcing from reinsurance contracts if primary pool is depleted and we still owe gold!
            if (remainingDue > 0 && newState.reinsuranceContracts) {
              for (const [contractId, contract] of Object.entries(newState.reinsuranceContracts)) {
                if (contract.active && (contract.syndicateIdA === primarySyndId || contract.syndicateIdB === primarySyndId)) {
                  const partnerSyndId = contract.syndicateIdA === primarySyndId ? contract.syndicateIdB : contract.syndicateIdA;
                  const partnerPool = newState.jointLoanInsurancePools?.[partnerSyndId];

                  if (partnerPool && partnerPool.poolGold > 0) {
                    // Contagion Shield Check
                    const pairKey = [primarySyndId, partnerSyndId].sort().join(":");
                    const shield = newState.contagionShields?.[pairKey];
                    if (shield && shield.active) {
                      const hasActiveLoans = Object.values(newState.jointLoans || {}).some(
                        loan => loan.syndicateId === partnerSyndId && loan.amount > 0
                      );
                      const isHighlyLeveraged = partnerPool.poolGold < 150 || hasActiveLoans;

                      if (isHighlyLeveraged) {
                        newState.journal.push(
                          `[Contagion Shield] Reinsurance call from primary pool ${primarySyndId} to partner pool ${partnerSyndId} frozen via active shield (Partner Pool Gold: ${partnerPool.poolGold}, Active Loans: ${hasActiveLoans}).`
                        );
                        continue; // Skip borrowing from this partner pool!
                      }
                    }

                    const isAtoB = (primarySyndId === contract.syndicateIdA);
                    const currentBorrowed = isAtoB ? contract.borrowedAfromB : contract.borrowedBfromA;
                    const maxBorrowable = Math.max(0, contract.maxLiquidityLimit - currentBorrowed);

                    if (maxBorrowable > 0) {
                      const borrowAmount = Math.min(remainingDue, partnerPool.poolGold, maxBorrowable);
                      if (borrowAmount > 0) {
                        // Deduct from partner pool
                        const updatedPartnerPool = { ...partnerPool };
                        updatedPartnerPool.poolGold -= borrowAmount;
                        updatedPartnerPool.timestamp = newState.step;
                        newState.jointLoanInsurancePools![partnerSyndId] = updatedPartnerPool;

                        // Calculate dynamic premium multiplier based on partner pool liquidity depth
                        let multiplier = 1.0;
                        if (partnerPool.poolGold < 250) {
                          multiplier = 1.5;
                        } else if (partnerPool.poolGold < 500) {
                          multiplier = 1.2;
                        }

                        // Apply risk rating markup (AF-104)
                        const pairKey = [primarySyndId, partnerSyndId].sort().join(":");
                        const activeRiskRating = newState.reinsuranceRiskRatings?.[pairKey];
                        let riskRatingMarkup = 0.0;
                        if (activeRiskRating && activeRiskRating.active) {
                          if (activeRiskRating.riskRating === "high") {
                            riskRatingMarkup = 0.4;
                          } else if (activeRiskRating.riskRating === "medium") {
                            riskRatingMarkup = 0.2;
                          }
                        }

                        // Apply historical defaults markup (AF-104)
                        const borrowDefaults = state.syndicateDefaults?.[primarySyndId] ?? 0;
                        const defaultsMarkup = borrowDefaults * 0.1;

                        // Apply liquidity audit adjustment (AF-104)
                        let auditAdjustment = 0.0;
                        if (newState.reinsuranceLiquidityAudits) {
                          for (const audit of Object.values(newState.reinsuranceLiquidityAudits)) {
                            if (audit.active && audit.syndicateIdB === primarySyndId) {
                              if (audit.status === "failed") {
                                auditAdjustment = 0.5;
                              } else if (audit.status === "passed") {
                                auditAdjustment = -0.1;
                              }
                            }
                          }
                        }

                        multiplier += riskRatingMarkup + defaultsMarkup + auditAdjustment;

                        // Apply Multi-Faction Loyalty CDO Risk Rating adjustments in fallback sweeps
                        let loyaltyDiscount = 0.0;
                        if (newState.multiFactionCdoRiskRatings) {
                          for (const policy of Object.values(newState.multiFactionCdoRiskRatings)) {
                            if (policy.active && policy.syndicateId === primarySyndId) {
                              const rank = getSyndicateFactionLoyaltyRank(newState, primarySyndId, policy.factionId);
                              let discount = 0.0;
                              if (rank === "Platinum") discount = 0.35;
                              else if (rank === "Gold") discount = 0.25;
                              else if (rank === "Silver") discount = 0.15;
                              else if (rank === "Bronze") discount = 0.05;

                              loyaltyDiscount += discount;
                            }
                          }
                        }

                        multiplier = Math.max(0.5, multiplier - loyaltyDiscount);
                        multiplier = Math.round(multiplier * 10) / 10;

                        const scaledOwed = Math.ceil(borrowAmount * multiplier);

                        // Save the pricing multiplier in GameState
                        if (!newState.reinsurancePricingMultipliers) {
                          newState.reinsurancePricingMultipliers = {};
                        }
                        newState.reinsurancePricingMultipliers[contractId] = {
                          contractId,
                          multiplier,
                          timestamp: newState.step,
                        };

                        // Record on contract (adds scaledOwed containing the premium)
                        const updatedContract = { ...contract };
                        if (isAtoB) {
                          updatedContract.borrowedAfromB += scaledOwed;
                        } else {
                          updatedContract.borrowedBfromA += scaledOwed;
                        }
                        updatedContract.timestamp = newState.step;
                        newState.reinsuranceContracts[contractId] = updatedContract;

                        // Primary pool records receiving it (update primary pool timestamp)
                        if (newState.jointLoanInsurancePools?.[primarySyndId]) {
                          newState.jointLoanInsurancePools[primarySyndId] = {
                            ...newState.jointLoanInsurancePools[primarySyndId],
                            timestamp: newState.step,
                          };
                        }

                        remainingDue -= borrowAmount;
                        collected += borrowAmount;
                        coveragePaid += borrowAmount;

                        newState.journal.push(
                          `[Reinsurance Fallback] Primary pool ${primarySyndId} borrowed ${borrowAmount} gold from partner pool ${partnerSyndId} via contract ${contractId} at dynamic premium multiplier ${multiplier}x (Charged: ${scaledOwed} gold, Borrowed so far: ${isAtoB ? updatedContract.borrowedAfromB : updatedContract.borrowedBfromA}/${contract.maxLiquidityLimit}).`
                        );
                      }
                    }
                  }
                }
                if (remainingDue <= 0) break;
              }
            }

            // Fallback Secondary Reinsurance Collateral Pledges (AF-103)
            if (remainingDue > 0 && newState.reinsuranceCollateralPledges) {
              newState.reinsuranceCollateralPledges = { ...newState.reinsuranceCollateralPledges };
              for (const [pledgeId, pledge] of Object.entries(newState.reinsuranceCollateralPledges)) {
                if (pledge.active && pledge.syndicateIdA === primarySyndId) {
                  const partnerSyndId = pledge.syndicateIdB;
                  const pairKey = [primarySyndId, partnerSyndId].sort().join(":");
                  const contract = newState.reinsuranceContracts?.[pairKey];
                  if (contract && contract.active) {
                    const colVal = getCollateralValue(newState, pledge.collateralType, pledge.collateralId);
                    if (colVal > 0) {
                      const coverageVal = Math.min(remainingDue, colVal);
                      
                      if (pledge.collateralType === "safehouse") {
                        if (newState.safehouses) {
                          newState.safehouses = { ...newState.safehouses };
                          delete newState.safehouses[pledge.collateralId];
                        }
                      } else if (pledge.collateralType === "outpost") {
                        if (newState.turfGuardOutposts) {
                          newState.turfGuardOutposts = { ...newState.turfGuardOutposts };
                          delete newState.turfGuardOutposts[pledge.collateralId];
                        }
                        if (newState.turfGuards) {
                          newState.turfGuards = { ...newState.turfGuards };
                          delete newState.turfGuards[pledge.collateralId];
                        }
                      }

                      if (newState.enforcementHeat) {
                        newState.enforcementHeat = { ...newState.enforcementHeat };
                        const currentHeat = newState.enforcementHeat[pledge.collateralId]?.heat ?? 0;
                        newState.enforcementHeat[pledge.collateralId] = {
                          roomId: pledge.collateralId,
                          heat: currentHeat + 15,
                          timestamp: newState.step,
                        };
                      }

                      const updatedPledge = {
                        ...pledge,
                        active: false,
                        timestamp: newState.step,
                      };
                      newState.reinsuranceCollateralPledges[pledgeId] = updatedPledge;

                      remainingDue -= coverageVal;
                      collected += coverageVal;
                      coveragePaid += coverageVal;

                      newState.journal.push(
                        `[Reinsurance Collateral Claim] Claimed and liquidated partner syndicate ${partnerSyndId}'s secondary reinsurance collateral ${pledge.collateralType} ${pledge.collateralId} for ${colVal} gold (Covered: ${coverageVal} gold, Remaining due: ${remainingDue}).`
                      );
                    }
                  }
                }
                if (remainingDue <= 0) break;
              }
            }

            // Fallback Secondary Reserve Automated Bailout (AF-105)
            if (remainingDue > 0 && newState.reinsuranceContracts) {
              for (const [contractId, contract] of Object.entries(newState.reinsuranceContracts)) {
                if (contract.active && (contract.syndicateIdA === primarySyndId || contract.syndicateIdB === primarySyndId)) {
                  const partnerSyndId = contract.syndicateIdA === primarySyndId ? contract.syndicateIdB : contract.syndicateIdA;
                  const partnerReserve = newState.secondaryReserves?.[partnerSyndId];

                  if (partnerReserve && partnerReserve.reserveGold > 0) {
                    const bailoutAmt = Math.min(remainingDue, partnerReserve.reserveGold);
                    if (bailoutAmt > 0) {
                      // Deduct from partner's secondary reserve
                      const updatedPartnerReserve = {
                        ...partnerReserve,
                        reserveGold: partnerReserve.reserveGold - bailoutAmt,
                        timestamp: newState.step,
                      };
                      if (!newState.secondaryReserves) {
                        newState.secondaryReserves = {};
                      }
                      newState.secondaryReserves[partnerSyndId] = updatedPartnerReserve;

                      // Add to primary syndicate's primary insurance pool and immediately spend to cover default
                      const primaryPool = newState.jointLoanInsurancePools?.[primarySyndId];
                      if (primaryPool) {
                        const updatedPrimaryPool = {
                          ...primaryPool,
                          poolGold: primaryPool.poolGold + bailoutAmt - bailoutAmt,
                          timestamp: newState.step,
                        };
                        newState.jointLoanInsurancePools![primarySyndId] = updatedPrimaryPool;
                      }

                      // Record the automated bailout
                      const bailoutId = `${partnerSyndId}:${primarySyndId}:${newState.step}`;
                      const newBailout = {
                        id: bailoutId,
                        sourceSyndicateId: partnerSyndId,
                        targetSyndicateId: primarySyndId,
                        bailoutAmount: bailoutAmt,
                        timestamp: newState.step,
                      };
                      if (!newState.automatedBailouts) {
                        newState.automatedBailouts = {};
                      }
                      newState.automatedBailouts[bailoutId] = newBailout;

                      remainingDue -= bailoutAmt;
                      collected += bailoutAmt;
                      coveragePaid += bailoutAmt;

                      newState.journal.push(
                        `[Secondary Reserve Bailout] Automated secondary reserve bailout triggered: partner syndicate ${partnerSyndId} bailed out primary syndicate ${primarySyndId} with ${bailoutAmt} gold of secondary reserves (Target remaining due: ${remainingDue}).`
                      );
                    }
                  }
                }
                if (remainingDue <= 0) break;
              }
            }
          }

          // Spared from enforcer sweep penalties only if fully covered by the insurance pool!
          const fullyInsured = policy && policy.active && remainingDue === 0;

          if (fullyInsured) {
            sparedAgents.add(agentId);
            newState.journal.push(`[Debt Recovery] Agent ${agentId} share of default was fully covered by the joint loan insurance pool. Collateral is spared and credit score is intact!`);
          } else {
            // Sweep agent's gold for the remaining due
            if (agentGold >= remainingDue) {
              newState.vars[goldKey] = agentGold - remainingDue;
              collected += remainingDue;
              remainingDue = 0;
            } else {
              newState.vars[goldKey] = 0;
              collected += agentGold;
              remainingDue -= agentGold;
            }
            totalCollected += collected;

            // Decrease credit rating & Add default alert
            if (!updatedJointLoan.waivePenalty) {
              // Decrease credit rating
              if (!newState.creditRatings) newState.creditRatings = {};
              const currentRating = newState.creditRatings[agentId] ?? 100;
              newState.creditRatings[agentId] = Math.max(0, currentRating - 50);

              // Add default alert
              if (!newState.defaultAlerts) newState.defaultAlerts = {};
              const alertKey = `${agentId}_${updatedJointLoan.syndicateId}`;
              newState.defaultAlerts[alertKey] = {
                agentId,
                syndicateId: updatedJointLoan.syndicateId,
                defaultStep: newState.step,
                timestamp: newState.step,
              };

              newState.journal.push(`[Credit Score] Agent ${agentId} credit rating decreased by -50 due to joint loan default (New Score: ${newState.creditRatings[agentId]}).`);
              newState.journal.push(`[Gossip Mesh Alert] Broadcasted debt default alert for agent ${agentId} (Defaulted in joint loan ${groupId} at bank ${updatedJointLoan.syndicateId}). Blacklisted mesh-wide.`);
            } else {
              newState.journal.push(`[Credit Score] Enforcer credit score penalty waived for agent ${agentId} on default of joint loan ${groupId}.`);
              newState.journal.push(`[Gossip Mesh Alert] Debt default alert blacklisting waived for agent ${agentId} on default of joint loan ${groupId}.`);
            }

            newState.journal.push(`[Debt Recovery] Joint Loan default: Enforcers swept agent ${agentId}'s gold, collecting ${collected - coveragePaid} gold (Remaining due: ${remainingDue}).`);
          }
        }

        // Liquidate ALL collaterals (unless spared)
        for (const col of updatedJointLoan.collaterals) {
          if (sparedAgents.has(col.agentId)) {
            newState.journal.push(`[Debt Recovery] Spared collateral ${col.collateralType} ${col.collateralId} for agent ${col.agentId} due to full insurance/gold coverage.`);
            continue;
          }

          if (col.collateralType === "safehouse") {
            if (newState.safehouses) {
              newState.safehouses = { ...newState.safehouses };
              delete newState.safehouses[col.collateralId];
            }
          } else if (col.collateralType === "outpost") {
            if (newState.turfGuardOutposts) {
              newState.turfGuardOutposts = { ...newState.turfGuardOutposts };
              delete newState.turfGuardOutposts[col.collateralId];
            }
            if (newState.turfGuards) {
              newState.turfGuards = { ...newState.turfGuards };
              delete newState.turfGuards[col.collateralId];
            }
          }

          // Increase enforcement heat in the collateral's room
          if (newState.enforcementHeat) {
            newState.enforcementHeat = { ...newState.enforcementHeat };
            const currentHeat = newState.enforcementHeat[col.collateralId]?.heat ?? 0;
            newState.enforcementHeat[col.collateralId] = {
              roomId: col.collateralId,
              heat: currentHeat + 15,
              timestamp: newState.step,
            };
          }
          newState.journal.push(`[Debt Recovery] Liquidated collateral ${col.collateralType} ${col.collateralId} for agent ${col.agentId}.`);
        }

        // Delete joint loan
        delete jointLoans[groupId];
        if (newState.jointLoanUnderwrites) {
          newState.jointLoanUnderwrites = { ...newState.jointLoanUnderwrites };
          delete newState.jointLoanUnderwrites[groupId];
        }
      }
    }

    if (jointLoansChanged) {
      newState.jointLoans = jointLoans;
    }
  }

  // 3. Gradual credit rating recovery over step ticks (AF-89)
  if (newState.creditRecoveries) {
    newState.creditRecoveries = { ...newState.creditRecoveries };
    for (const [agentId, recovery] of Object.entries(newState.creditRecoveries)) {
      if (recovery.active) {
        const stepsPassed = newState.step - recovery.lastRecoveryStep;
        if (stepsPassed > 0) {
          if (!newState.creditRatings) {
            newState.creditRatings = {};
          } else {
            newState.creditRatings = { ...newState.creditRatings };
          }
          const currentRating = newState.creditRatings[agentId] ?? 100;
          if (currentRating < recovery.targetScore) {
            const newRating = Math.min(recovery.targetScore, currentRating + stepsPassed * 5);
            newState.creditRatings[agentId] = newRating;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(`[Credit Recovery] Agent ${agentId} credit rating recovered to ${newRating} (+${stepsPassed * 5} points).`);
          }

          const stillActive = (newState.creditRatings[agentId] ?? 100) < recovery.targetScore;
          newState.creditRecoveries[agentId] = {
            ...recovery,
            lastRecoveryStep: newState.step,
            active: stillActive,
            timestamp: newState.step,
          };
        }
      }
    }
  }

  // AF-106: Secondary Reserve Yield-Bearing Vaults & Liquidity Investment Pools
  const investments = newState.secondaryReserveInvestments;
  if (investments) {
    const updatedInvestments = JSON.parse(JSON.stringify(investments));
    for (const [syndicateId, vaultInvestments] of Object.entries(updatedInvestments)) {
      for (const [vaultId, investment] of Object.entries(vaultInvestments as Record<string, any>)) {
        if (investment.investedGold > 0) {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[vaultId];
          if (!vault) continue;

          // 1. Calculate passive interest yield
          let interest = 0;
          if (vault.interestRate > 0) {
            interest = Math.max(1, Math.floor(investment.investedGold * vault.interestRate));
          }

          // 2. Roll for enforcer sweep risk
          const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          const riskPercentage = Math.round(vault.sweepRisk * 100);
          if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
            // Liquidated!
            const lostGold = investment.investedGold;
            investment.investedGold = 0;
            investment.timestamp = newState.step;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Enforcer Sweep] Regulators swept yield-bearing vault ${vault.name} (${vaultId}) of syndicate ${syndicateId}! Liquidated all ${lostGold} gold invested (Sweep Roll: ${sweepRoll} <= Risk: ${riskPercentage}%).`
            );
          } else {
            // Earn yield!
            if (interest > 0) {
              investment.investedGold += interest;
              investment.timestamp = newState.step;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Vault Yield] Syndicate ${syndicateId} earned ${interest} gold passive interest from ${vault.name} (${vaultId}) (New balance: ${investment.investedGold} gold).`
              );
            }
          }
        }
      }
    }
    newState.secondaryReserveInvestments = updatedInvestments;
  }

  // Periodic CDO Tranche Interest Distributions & Pro-Rata Default Write-Downs (AF-107)
  if (newState.cdos && Object.keys(newState.cdos).length > 0) {
    newState.cdos = { ...newState.cdos };
    for (const [cdoId, cdo] of Object.entries(newState.cdos)) {
      const updatedCdo = {
        ...cdo,
        assets: [...cdo.assets],
        tranches: {
          senior: { ...cdo.tranches.senior, ownership: { ...cdo.tranches.senior.ownership } },
          mezzanine: { ...cdo.tranches.mezzanine, ownership: { ...cdo.tranches.mezzanine.ownership } },
          equity: { ...cdo.tranches.equity, ownership: { ...cdo.tranches.equity.ownership } },
        },
        timestamp: newState.step,
      };

      let cashflowCollected = 0;
      let totalWriteDown = 0;
      const remainingAssets: any[] = [];

      for (const asset of updatedCdo.assets) {
        if (asset.type === "loan") {
          const loan = asset.originalLoan;
          if (loan) {
            const loanRate = loan.refinancedInterestRate !== undefined ? loan.refinancedInterestRate : 5;
            const interest = Math.floor((loan.amount * loanRate) / 100);

            const updatedLoan = {
              ...loan,
              interestAccrued: loan.interestAccrued + interest,
              timestamp: newState.step,
            };
            asset.originalLoan = updatedLoan;
            asset.value = updatedLoan.amount + updatedLoan.interestAccrued;
            cashflowCollected += interest;

            let factionGraceExtension = 0;
            const agentSyndicateId = Object.keys(newState.syndicates ?? {}).find(sid => newState.syndicates?.[sid]?.members.includes(updatedLoan.agentId));
            if (agentSyndicateId) {
              const mAcc = newState.marginAccounts?.[agentSyndicateId];
              if (mAcc && mAcc.swfGracePeriodExtensions) {
                for (const steps of Object.values(mAcc.swfGracePeriodExtensions)) {
                  factionGraceExtension += steps;
                }
              }
            }
            if (newState.step > updatedLoan.dueStep + factionGraceExtension) {
              const agentId = updatedLoan.agentId;
              const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
              const agentGold = newState.vars[goldKey] ?? 0;
              const totalDue = updatedLoan.amount + updatedLoan.interestAccrued;

              let collected = 0;
              let remainingDue = totalDue;

              if (agentGold >= totalDue) {
                newState.vars[goldKey] = agentGold - totalDue;
                collected = totalDue;
                remainingDue = 0;
              } else {
                newState.vars[goldKey] = 0;
                collected = agentGold;
                remainingDue = totalDue - collected;
              }

              let skipLiquidation = false;
              if (remainingDue > 0) {
                const syndicateId = cdo.creatorSyndicateId;
                const pool = newState.factionCdoInsurancePools?.[`${syndicateId}-${cdoId}`];
                if (pool) {
                  const rank = getSyndicateFactionLoyaltyRank(newState, syndicateId, pool.factionId);
                  if (isRankAtLeast(rank, pool.minLoyaltyRank)) {
                    const coveredAmount = Math.min(pool.insuranceReserve, Math.floor(remainingDue * pool.payoutRatio));
                    if (coveredAmount > 0) {
                      pool.insuranceReserve -= coveredAmount;
                      collected += coveredAmount;
                      remainingDue -= coveredAmount;
                      skipLiquidation = true;
                      newState.journal.push(`[CDO Insurance Shield] Faction CDO Insurance pool for CDO ${cdoId} covered ${coveredAmount} gold of defaulted loan for agent ${agentId}, sparing collateral.`);
                    }
                  }
                }

                // Fallback: Sourcing from reinsurance contracts if primary pool is depleted / insufficient and we have an active Multi-Faction CDO Risk Rating!
                if (remainingDue > 0 && newState.factionCdoInsurancePools) {
                  const policyKey = `${syndicateId}-${cdoId}`;
                  const policy = newState.multiFactionCdoRiskRatings?.[policyKey];
                  if (policy && policy.active) {
                    const factionId = policy.factionId;
                    if (newState.reinsuranceContracts) {
                      newState.reinsuranceContracts = { ...newState.reinsuranceContracts };
                      for (const [contractId, contract] of Object.entries(newState.reinsuranceContracts)) {
                        if (contract.active && (contract.syndicateIdA === syndicateId || contract.syndicateIdB === syndicateId)) {
                          const partnerSyndId = contract.syndicateIdA === syndicateId ? contract.syndicateIdB : contract.syndicateIdA;
                          const partnerPool = newState.factionCdoInsurancePools[`${partnerSyndId}-${cdoId}`];
                          if (partnerPool && partnerPool.insuranceReserve > 0) {
                            const isAtoB = (syndicateId === contract.syndicateIdA);
                            const currentBorrowed = isAtoB ? contract.borrowedAfromB : contract.borrowedBfromA;
                            const maxBorrowable = Math.max(0, contract.maxLiquidityLimit - currentBorrowed);

                            if (maxBorrowable > 0) {
                              const payoutAmount = Math.min(remainingDue, partnerPool.insuranceReserve, maxBorrowable);
                              if (payoutAmount > 0) {
                                const primaryRank = getSyndicateFactionLoyaltyRank(newState, syndicateId, factionId);
                                const partnerRank = getSyndicateFactionLoyaltyRank(newState, partnerSyndId, factionId);

                                let multiplier = policy.basePremiumRate;
                                if (policy.riskRating === "high") {
                                  multiplier += 0.4;
                                } else if (policy.riskRating === "medium") {
                                  multiplier += 0.2;
                                }

                                let discount = 0;
                                if (primaryRank === "Platinum") discount = 0.3;
                                else if (primaryRank === "Gold") discount = 0.2;
                                else if (primaryRank === "Silver") discount = 0.1;
                                else if (primaryRank === "Bronze") discount = 0.05;

                                multiplier = Math.max(0.5, multiplier - discount);
                                multiplier = Math.round(multiplier * 100) / 100;

                                const scaledOwed = Math.ceil(payoutAmount * multiplier);

                                // Deduct from partner pool
                                const updatedPartnerPool = { ...partnerPool };
                                updatedPartnerPool.insuranceReserve -= payoutAmount;
                                updatedPartnerPool.timestamp = newState.step;
                                newState.factionCdoInsurancePools[`${partnerSyndId}-${cdoId}`] = updatedPartnerPool;

                                // Record on contract
                                const updatedContract = { ...contract };
                                if (isAtoB) {
                                  updatedContract.borrowedAfromB += scaledOwed;
                                } else {
                                  updatedContract.borrowedBfromA += scaledOwed;
                                }
                                updatedContract.timestamp = newState.step;
                                newState.reinsuranceContracts[contractId] = updatedContract;

                                // Save pricing multiplier
                                if (!newState.reinsurancePricingMultipliers) {
                                  newState.reinsurancePricingMultipliers = {};
                                }
                                newState.reinsurancePricingMultipliers[contractId] = {
                                  contractId,
                                  multiplier,
                                  timestamp: newState.step,
                                };

                                remainingDue -= payoutAmount;
                                collected += payoutAmount;
                                skipLiquidation = true;

                                if (!newState.journal) newState.journal = [];
                                newState.journal.push(
                                  `[Automated Reinsurance Claims Arbitration] Reinsurance contract ${contractId} automatically arbitrated payout of ${payoutAmount} gold from partner pool ${partnerSyndId} to cover CDO ${cdoId} default (Primary Loyalty: ${primaryRank}, Partner Loyalty: ${partnerRank}, Multiplier: ${multiplier}x, Scaled Debt: ${scaledOwed} gold).`
                                );
                              }
                            }
                          }
                        }
                        if (remainingDue <= 0) break;
                      }
                    }
                  }
                }
              }

              if (!skipLiquidation) {
                if (updatedLoan.collateralType === "safehouse") {
                  if (newState.safehouses) {
                    newState.safehouses = { ...newState.safehouses };
                    delete newState.safehouses[updatedLoan.collateralId];
                  }
                } else if (updatedLoan.collateralType === "outpost") {
                  if (newState.turfGuardOutposts) {
                    newState.turfGuardOutposts = { ...newState.turfGuardOutposts };
                    delete newState.turfGuardOutposts[updatedLoan.collateralId];
                  }
                  if (newState.turfGuards) {
                    newState.turfGuards = { ...newState.turfGuards };
                    delete newState.turfGuards[updatedLoan.collateralId];
                  }
                }
              }

              if (newState.enforcementHeat) {
                newState.enforcementHeat = { ...newState.enforcementHeat };
                const currentHeat = newState.enforcementHeat[updatedLoan.collateralId]?.heat ?? 0;
                newState.enforcementHeat[updatedLoan.collateralId] = {
                  roomId: updatedLoan.collateralId,
                  heat: currentHeat + 15,
                  timestamp: newState.step,
                };
              }

              if (!newState.creditRatings) newState.creditRatings = {};
              const currentRating = newState.creditRatings[agentId] ?? 100;
              newState.creditRatings[agentId] = Math.max(0, currentRating - 50);

              if (!newState.defaultAlerts) newState.defaultAlerts = {};
              const alertKey = `${agentId}_${cdo.creatorSyndicateId}`;
              newState.defaultAlerts[alertKey] = {
                agentId,
                syndicateId: cdo.creatorSyndicateId,
                defaultStep: newState.step,
                timestamp: newState.step,
              };

              newState.journal.push(`[CDO Asset Default] Packaged loan for agent ${agentId} inside CDO ${cdoId} defaulted. Collected ${collected} gold, remaining due ${remainingDue} written off.`);

              cashflowCollected += collected;
              totalWriteDown += remainingDue;
            } else {
              remainingAssets.push(asset);
            }
          }
        } else if (asset.type === "investment") {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[asset.assetId];
          if (vault) {
            let interest = 0;
            if (vault.interestRate > 0) {
              interest = Math.max(1, Math.floor(asset.value * vault.interestRate));
            }

            const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
            newState.seed = nextSeed;

            const riskPercentage = Math.round(vault.sweepRisk * 100);
            if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
              const lostGold = asset.value;
              totalWriteDown += lostGold;
              newState.journal.push(`[CDO Asset Sweep] Regulators swept vault ${vault.name} inside CDO ${cdoId}! Liquidated ${lostGold} gold investment.`);
            } else {
              asset.value += interest;
              cashflowCollected += interest;
              if (asset.originalInvestment) {
                asset.originalInvestment.investedGold += interest;
                asset.originalInvestment.timestamp = newState.step;
              }
              remainingAssets.push(asset);
            }
          } else {
            remainingAssets.push(asset);
          }
        }
      }

      updatedCdo.assets = remainingAssets;

      const S_target = Math.max(1, Math.floor(updatedCdo.tranches.senior.totalValue * updatedCdo.tranches.senior.interestRate));
      const M_target = Math.max(1, Math.floor(updatedCdo.tranches.mezzanine.totalValue * updatedCdo.tranches.mezzanine.interestRate));
      const E_target = Math.max(1, Math.floor(updatedCdo.tranches.equity.totalValue * updatedCdo.tranches.equity.interestRate));

      let remainingCashflow = cashflowCollected;
      const S_payout = updatedCdo.tranches.senior.totalValue > 0 ? Math.min(remainingCashflow, S_target) : 0;
      remainingCashflow -= S_payout;

      const M_payout = updatedCdo.tranches.mezzanine.totalValue > 0 ? Math.min(remainingCashflow, M_target) : 0;
      remainingCashflow -= M_payout;

      const E_payout = updatedCdo.tranches.equity.totalValue > 0 ? remainingCashflow : 0;

      const payouts = [
        { tranche: updatedCdo.tranches.senior, payout: S_payout },
        { tranche: updatedCdo.tranches.mezzanine, payout: M_payout },
        { tranche: updatedCdo.tranches.equity, payout: E_payout },
      ];

      for (const { tranche, payout } of payouts) {
        if (payout > 0 && tranche.totalValue > 0) {
          if (!newState.syndicates) newState.syndicates = {};
          for (const [syndicateId, ownedValue] of Object.entries(tranche.ownership)) {
            if (ownedValue > 0) {
              const syndicate = newState.syndicates[syndicateId];
              if (syndicate) {
                const baseShare = Math.floor(payout * (ownedValue / tranche.totalValue));
                if (baseShare > 0) {
                  let multiplier = 1.0;
                  const booster = newState.cdoMiningBoosters?.[`${syndicateId}-${cdoId}`];
                  if (booster) {
                    const rank = getSyndicateFactionLoyaltyRank(newState, syndicateId, booster.factionId);
                    if (rank === "Bronze") multiplier = booster.bronzeMultiplier;
                    else if (rank === "Silver") multiplier = booster.silverMultiplier;
                    else if (rank === "Gold") multiplier = booster.goldMultiplier;
                    else if (rank === "Platinum") multiplier = booster.platinumMultiplier;
                  }

                  const share = Math.floor(baseShare * multiplier);
                  if (share > 0) {
                    newState.syndicates[syndicateId] = {
                      ...syndicate,
                      warChest: (syndicate.warChest ?? 0) + share,
                    };
                    if (multiplier > 1.0) {
                      newState.journal.push(`[CDO Yield Payout] Syndicate ${syndicateId} earned ${share} gold payout (boosted ${multiplier}x by campaign ${booster?.campaignName}) from CDO ${cdoId} tranche ${tranche.trancheId}.`);
                    } else {
                      newState.journal.push(`[CDO Yield Payout] Syndicate ${syndicateId} earned ${share} gold payout from CDO ${cdoId} tranche ${tranche.trancheId}.`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (totalWriteDown > 0) {
        let remainingLoss = totalWriteDown;

        const E_loss = Math.min(remainingLoss, updatedCdo.tranches.equity.totalValue);
        remainingLoss -= E_loss;

        const M_loss = Math.min(remainingLoss, updatedCdo.tranches.mezzanine.totalValue);
        remainingLoss -= M_loss;

        const S_loss = Math.min(remainingLoss, updatedCdo.tranches.senior.totalValue);
        remainingLoss -= S_loss;

        const losses = [
          { tranche: updatedCdo.tranches.senior, loss: S_loss },
          { tranche: updatedCdo.tranches.mezzanine, loss: M_loss },
          { tranche: updatedCdo.tranches.equity, loss: E_loss },
        ];

        for (const { tranche, loss } of losses) {
          if (loss > 0) {
            const oldTotal = tranche.totalValue;
            const newTotal = Math.max(0, oldTotal - loss);
            tranche.totalValue = newTotal;

            for (const [syndicateId, ownedValue] of Object.entries(tranche.ownership)) {
              if (oldTotal > 0) {
                tranche.ownership[syndicateId] = Math.max(0, Math.round(ownedValue * (newTotal / oldTotal)));
              } else {
                tranche.ownership[syndicateId] = 0;
              }
            }
            newState.journal.push(`[CDO Write-Down] CDO ${cdoId} tranche ${tranche.trancheId} written down by -${loss} gold due to defaults (New value: ${newTotal}).`);

            // Automatic CDS settlement resolution
            if (newState.creditDefaultSwaps) {
              newState.creditDefaultSwaps = { ...newState.creditDefaultSwaps };
              for (const [cdsId, cds] of Object.entries(newState.creditDefaultSwaps)) {
                if (cds.active && cds.cdoId === cdoId && cds.trancheId === tranche.trancheId) {
                  const updatedCds = { ...cds };
                  const payout = Math.min(updatedCds.notionalValue, oldTotal > 0 ? Math.round(loss * (updatedCds.notionalValue / oldTotal)) : 0);
                  if (payout > 0) {
                    if (!newState.syndicates) newState.syndicates = {};
                    const writerSyndicate = newState.syndicates[updatedCds.writerSyndicateId];
                    const buyerSyndicate = newState.syndicates[updatedCds.buyerSyndicateId];
                    if (writerSyndicate && buyerSyndicate) {
                      const actualPaid = Math.min(payout, writerSyndicate.warChest ?? 0);
                      
                      newState.syndicates[updatedCds.writerSyndicateId] = {
                        ...writerSyndicate,
                        warChest: Math.max(0, (writerSyndicate.warChest ?? 0) - actualPaid),
                      };
                      newState.syndicates[updatedCds.buyerSyndicateId] = {
                        ...buyerSyndicate,
                        warChest: (buyerSyndicate.warChest ?? 0) + actualPaid,
                      };

                      newState.journal.push(`[CDS Payout] CDS ${cdsId} triggered: writer Syndicate ${updatedCds.writerSyndicateId} paid ${actualPaid} gold to buyer Syndicate ${updatedCds.buyerSyndicateId} compensating for tranche ${updatedCds.trancheId} write-down of -${loss} gold.`);
                      
                      updatedCds.notionalValue = Math.max(0, updatedCds.notionalValue - payout);
                      if (updatedCds.notionalValue <= 0) {
                        updatedCds.active = false;
                        newState.journal.push(`[CDS Settled] CDS ${cdsId} fully settled and deactivated.`);
                      }
                      updatedCds.timestamp = newState.step;
                      newState.creditDefaultSwaps[cdsId] = updatedCds;
                    }
                  }
                }
              }
            }
          }
        }
      }

      updatedCdo.totalValue = updatedCdo.tranches.senior.totalValue + updatedCdo.tranches.mezzanine.totalValue + updatedCdo.tranches.equity.totalValue;
      newState.cdos[cdoId] = updatedCdo;
    }
  }

  // Periodic SWF Yield CDO Tranche Dividend Distributions & Default waterfalls (AF-131)
  if (newState.swfYieldCDOs && Object.keys(newState.swfYieldCDOs).length > 0) {
    newState.swfYieldCDOs = { ...newState.swfYieldCDOs };
    for (const [cdoId, cdo] of Object.entries(newState.swfYieldCDOs)) {
      const updatedCdo = {
        ...cdo,
        assets: [...cdo.assets],
        tranches: {
          senior: { ...cdo.tranches.senior, ownership: { ...cdo.tranches.senior.ownership } },
          mezzanine: { ...cdo.tranches.mezzanine, ownership: { ...cdo.tranches.mezzanine.ownership } },
          equity: { ...cdo.tranches.equity, ownership: { ...cdo.tranches.equity.ownership } },
        },
        timestamp: newState.step,
      };

      let cashflowCollected = 0;
      let totalWriteDown = 0;
      const remainingAssets: any[] = [];

      for (const asset of updatedCdo.assets) {
        const token = newState.swfYieldTokens?.[asset.swfYieldTokenId];
        const portfolio = token ? newState.jointVenturePortfolios?.[token.portfolioId] : undefined;

        if (!token || !portfolio || portfolio.status !== "Active") {
          // Underlying asset defaulted or portfolio is no longer active!
          totalWriteDown += asset.value;
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Yield CDO Asset Default] Packed SWF Yield Token ${asset.swfYieldTokenId} inside CDO ${cdoId} defaulted due to inactive underlying portfolio.`
          );
        } else {
          // Perform deterministic default roll check using Mulberry32 PRNG seed!
          const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          // Arbitrage route has 10% risk, Faction bond has 5% risk!
          const riskLimit = portfolio.targetType === "ArbitrageRoute" ? 10 : 5;

          if (sweepRoll <= riskLimit) {
            // Regulators or market crash liquidated the underlying asset!
            totalWriteDown += asset.value;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Yield CDO Asset Default] Packed SWF Yield Token ${asset.swfYieldTokenId} inside CDO ${cdoId} defaulted during enforcer sweep roll (Roll: ${sweepRoll} <= Risk: ${riskLimit}%).`
            );
          } else {
            // Earn yield!
            const totalTokenYield = Math.floor(portfolio.investedAmount * (portfolio.yieldRate / 100));
            const assetYield = Math.floor(totalTokenYield * (asset.sharesPacked / token.totalShares));
            cashflowCollected += assetYield;
            remainingAssets.push(asset);
          }
        }
      }

      updatedCdo.assets = remainingAssets;

      // Calculate tranche targets
      const S_target = Math.max(1, Math.floor(updatedCdo.tranches.senior.totalShares * updatedCdo.tranches.senior.yieldRate));
      const M_target = Math.max(1, Math.floor(updatedCdo.tranches.mezzanine.totalShares * updatedCdo.tranches.mezzanine.yieldRate));

      let remainingCashflow = cashflowCollected;
      const S_payout = updatedCdo.tranches.senior.totalShares > 0 ? Math.min(remainingCashflow, S_target) : 0;
      remainingCashflow -= S_payout;

      const M_payout = updatedCdo.tranches.mezzanine.totalShares > 0 ? Math.min(remainingCashflow, M_target) : 0;
      remainingCashflow -= M_payout;

      const E_payout = updatedCdo.tranches.equity.totalShares > 0 ? remainingCashflow : 0;

      const payouts = [
        { tranche: updatedCdo.tranches.senior, payout: S_payout },
        { tranche: updatedCdo.tranches.mezzanine, payout: M_payout },
        { tranche: updatedCdo.tranches.equity, payout: E_payout },
      ];

      for (const { tranche, payout } of payouts) {
        if (payout > 0 && tranche.totalShares > 0) {
          if (!newState.syndicates) newState.syndicates = {};
          for (const [syndicateId, ownedShares] of Object.entries(tranche.ownership)) {
            if (ownedShares > 0) {
              const syndicate = newState.syndicates[syndicateId];
              if (syndicate) {
                const share = Math.floor(payout * (ownedShares / tranche.totalShares));
                if (share > 0) {
                  newState.syndicates[syndicateId] = {
                    ...syndicate,
                    warChest: (syndicate.warChest ?? 0) + share,
                  };
                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[SWF Yield CDO Yield Payout] Syndicate ${syndicateId} earned ${share} gold payout from SWF Yield CDO ${cdoId} tranche ${tranche.trancheId}.`
                  );
                }
              }
            }
          }
        }
      }

      // Pro-rata defaults / write-downs applying waterfall to tranche values
      if (totalWriteDown > 0) {
        let remainingLoss = totalWriteDown;

        const tranchesOrdered = [
          updatedCdo.tranches.equity,
          updatedCdo.tranches.mezzanine,
          updatedCdo.tranches.senior,
        ];

        for (const tranche of tranchesOrdered) {
          const oldTotal = tranche.totalShares;
          let loss = 0;
          if (remainingLoss > 0) {
            loss = Math.min(remainingLoss, oldTotal);
            remainingLoss -= loss;
          }

          const newTotal = oldTotal - loss;
          tranche.totalShares = newTotal;

          // Record default correlation log (AF-145)
          if (!newState.swfCDODefaultCorrelationLogs) {
            newState.swfCDODefaultCorrelationLogs = [];
          }
          newState.swfCDODefaultCorrelationLogs.push({
            cdoId,
            trancheId: tranche.trancheId,
            defaulted: loss > 0,
            timestamp: newState.step,
          });

          for (const [syndicateId, ownedShares] of Object.entries(tranche.ownership)) {
            let oldOwnedShares = ownedShares;
            let newOwnedShares = 0;
            if (oldTotal > 0) {
              newOwnedShares = Math.max(0, Math.round(ownedShares * (newTotal / oldTotal)));
              tranche.ownership[syndicateId] = newOwnedShares;
            } else {
              tranche.ownership[syndicateId] = 0;
            }

            // Process Reinsurance Payout if syndicate has active reinsurance! (AF-145)
            const lossShares = oldOwnedShares - newOwnedShares;
            if (lossShares > 0 && newState.swfYieldCDOTrancheReinsurancePolicies) {
              newState.swfYieldCDOTrancheReinsurancePolicies = { ...newState.swfYieldCDOTrancheReinsurancePolicies };
              for (const [policyId, policy] of Object.entries(newState.swfYieldCDOTrancheReinsurancePolicies)) {
                if (policy.active && policy.syndicateId === syndicateId && policy.swfYieldCdoId === cdoId && policy.trancheId === tranche.trancheId) {
                  const updatedPolicy = { ...policy };
                  const fractionWrittenDown = oldTotal > 0 ? loss / oldTotal : 1.0;
                  const payoutGold = Math.round(updatedPolicy.coverageAmount * fractionWrittenDown);

                  if (payoutGold > 0) {
                    if (!newState.syndicates) newState.syndicates = {};
                    const syndicate = newState.syndicates[syndicateId];
                    if (syndicate) {
                      newState.syndicates[syndicateId] = {
                        ...syndicate,
                        warChest: (syndicate.warChest ?? 0) + payoutGold,
                      };
                      updatedPolicy.coverageAmount = Math.max(0, updatedPolicy.coverageAmount - payoutGold);
                      if (updatedPolicy.coverageAmount <= 0) {
                        updatedPolicy.active = false;
                      }
                      updatedPolicy.timestamp = newState.step;
                      newState.swfYieldCDOTrancheReinsurancePolicies[policyId] = updatedPolicy;

                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[SWF Reinsurance Payout] Reinsurance policy ${policyId} triggered for Syndicate ${syndicateId}: paid ${payoutGold} gold payout protecting tranche ${tranche.trancheId} holdings (Remaining coverage: ${updatedPolicy.coverageAmount}).`
                      );
                    }
                  }
                }
              }
            }
          }

          if (loss > 0) {
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Yield CDO Write-Down] CDO ${cdoId} tranche ${tranche.trancheId} written down by -${loss} shares due to asset defaults.`
            );

            // Automatic SWF Yield CDO CDS settlement resolution
            if (newState.swfYieldCDOCDSs) {
              newState.swfYieldCDOCDSs = { ...newState.swfYieldCDOCDSs };
              for (const [cdsId, cds] of Object.entries(newState.swfYieldCDOCDSs)) {
                if (cds.active && cds.swfYieldCdoId === cdoId && cds.trancheId === tranche.trancheId) {
                  const updatedCds = { ...cds };
                  const payout = Math.min(updatedCds.notionalValue, oldTotal > 0 ? Math.round(loss * (updatedCds.notionalValue / oldTotal)) : 0);
                  if (payout > 0) {
                    if (!newState.syndicates) newState.syndicates = {};
                    const writerSyndicate = newState.syndicates[updatedCds.writerSyndicateId];
                    const buyerSyndicate = newState.syndicates[updatedCds.buyerSyndicateId];
                    if (writerSyndicate && buyerSyndicate) {
                      const actualPaid = Math.min(payout, writerSyndicate.warChest ?? 0);
                      
                      newState.syndicates[updatedCds.writerSyndicateId] = {
                        ...writerSyndicate,
                        warChest: Math.max(0, (writerSyndicate.warChest ?? 0) - actualPaid),
                      };
                      newState.syndicates[updatedCds.buyerSyndicateId] = {
                        ...buyerSyndicate,
                        warChest: (buyerSyndicate.warChest ?? 0) + actualPaid,
                      };

                      newState.journal.push(`[SWF Yield CDO CDS Payout] CDS ${cdsId} triggered: writer Syndicate ${updatedCds.writerSyndicateId} paid ${actualPaid} gold to buyer Syndicate ${updatedCds.buyerSyndicateId} compensating for tranche ${updatedCds.trancheId} write-down of -${loss} shares.`);
                      
                      updatedCds.notionalValue = Math.max(0, updatedCds.notionalValue - payout);
                      if (updatedCds.notionalValue <= 0) {
                        updatedCds.active = false;
                        newState.journal.push(`[SWF Yield CDO CDS Settled] CDS ${cdsId} fully settled and deactivated.`);
                      }
                      updatedCds.timestamp = newState.step;
                      newState.swfYieldCDOCDSs[cdsId] = updatedCds;
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        // Log clean (no defaults) for all tranches (AF-145)
        for (const trancheId of ["senior", "mezzanine", "equity"] as const) {
          if (!newState.swfCDODefaultCorrelationLogs) {
            newState.swfCDODefaultCorrelationLogs = [];
          }
          newState.swfCDODefaultCorrelationLogs.push({
            cdoId,
            trancheId,
            defaulted: false,
            timestamp: newState.step,
          });
        }
      }

      updatedCdo.totalValue = Math.max(0, updatedCdo.totalValue - totalWriteDown);
      newState.swfYieldCDOs[cdoId] = updatedCdo;
    }
  }

  // Periodic Credit Default Swaps (CDS) Premium Deductions
  if (newState.creditDefaultSwaps && Object.keys(newState.creditDefaultSwaps).length > 0) {
    newState.creditDefaultSwaps = { ...newState.creditDefaultSwaps };
    for (const [cdsId, cds] of Object.entries(newState.creditDefaultSwaps)) {
      if (cds.active) {
        const updatedCds = { ...cds };
        const premium = Math.max(1, Math.floor(updatedCds.notionalValue * updatedCds.premiumRate));
        if (!newState.syndicates) newState.syndicates = {};
        const buyerSyndicate = newState.syndicates[updatedCds.buyerSyndicateId];
        const writerSyndicate = newState.syndicates[updatedCds.writerSyndicateId];
        if (buyerSyndicate && writerSyndicate) {
          const actualPaid = Math.min(premium, buyerSyndicate.warChest ?? 0);
          
          newState.syndicates[updatedCds.buyerSyndicateId] = {
            ...buyerSyndicate,
            warChest: Math.max(0, (buyerSyndicate.warChest ?? 0) - actualPaid),
          };
          newState.syndicates[updatedCds.writerSyndicateId] = {
            ...writerSyndicate,
            warChest: (writerSyndicate.warChest ?? 0) + actualPaid,
          };

          newState.journal.push(`[CDS Premium] Syndicate ${updatedCds.buyerSyndicateId} paid ${actualPaid} gold premium to Syndicate ${updatedCds.writerSyndicateId} for CDS ${cdsId}.`);
          
          if (actualPaid < premium) {
            updatedCds.active = false;
            newState.journal.push(`[CDS Terminated] CDS ${cdsId} terminated due to insufficient premium payment from Syndicate ${updatedCds.buyerSyndicateId}.`);
          }
          updatedCds.timestamp = newState.step;
          newState.creditDefaultSwaps[cdsId] = updatedCds;
        }
      }
    }
  }

  // Periodic SWF Yield CDO CDS Premium Deductions
  if (newState.swfYieldCDOCDSs && Object.keys(newState.swfYieldCDOCDSs).length > 0) {
    newState.swfYieldCDOCDSs = { ...newState.swfYieldCDOCDSs };
    for (const [cdsId, cds] of Object.entries(newState.swfYieldCDOCDSs)) {
      if (cds.active) {
        const updatedCds = { ...cds };

        // 1. Dynamic Leverage Scaling
        const writerMarginAccount = newState.marginAccounts?.[updatedCds.writerSyndicateId];
        let targetLeverage = 1.0;
        let reputationMultiplier = 1.0;
        let leverageFactor = 1.0;
        
        if (writerMarginAccount) {
          targetLeverage = writerMarginAccount.swfTrancheLeverageTargets?.[updatedCds.trancheId] ?? writerMarginAccount.swfLeverageTarget ?? 1.0;
          leverageFactor = writerMarginAccount.swfTrancheLeverageFactors?.[updatedCds.trancheId] ?? writerMarginAccount.swfLeverageFactor ?? 1.0;
          
          const activeVaultId = writerMarginAccount.swfRehypothecationVaultId || (writerMarginAccount.swfVaultAllocations ? Object.keys(writerMarginAccount.swfVaultAllocations)[0] : undefined);
          const sponsorPolicy = activeVaultId ? newState.factionSponsorPolicies?.[updatedCds.writerSyndicateId]?.[activeVaultId] : undefined;
          const factionId = sponsorPolicy?.factionId;
          const factionRep = factionId ? (newState.factionRep?.[factionId] ?? 0) : 0;
          reputationMultiplier = 1.0 + Math.max(0, factionRep * 0.05);
        }
        
        updatedCds.dynamicLeverageFactor = Math.min(targetLeverage, reputationMultiplier * leverageFactor);
        
        // 2. Yield Rebalancing Multiplier from CDO Tranche Risk Rating
        const ratingId = `${updatedCds.swfYieldCdoId}_${updatedCds.trancheId}`;
        const riskRating = newState.swfYieldCDOTrancheRiskRatings?.[ratingId]?.riskRating ?? "BBB";
        
        const riskRatingsMap: Record<string, number> = {
          "AAA": 0.8, "AA": 0.9, "A": 1.0, "BBB": 1.1, "BB": 1.2, "B": 1.3, "CCC": 1.5, "CC": 1.7, "C": 1.9, "D": 2.5
        };
        const riskFactor = riskRatingsMap[riskRating] ?? 1.0;
        updatedCds.yieldRebalancingMultiplier = riskFactor * (updatedCds.dynamicLeverageFactor ?? 1.0);

        const premium = (updatedCds.marginEnabled && updatedCds.yieldRebalancingMultiplier)
          ? Math.max(1, Math.floor(updatedCds.notionalValue * updatedCds.premiumRate * updatedCds.yieldRebalancingMultiplier))
          : Math.max(1, Math.floor(updatedCds.notionalValue * updatedCds.premiumRate));
        if (!newState.syndicates) newState.syndicates = {};
        const buyerSyndicate = newState.syndicates[updatedCds.buyerSyndicateId];
        const writerSyndicate = newState.syndicates[updatedCds.writerSyndicateId];
        if (buyerSyndicate && writerSyndicate) {
          const actualPaid = Math.min(premium, buyerSyndicate.warChest ?? 0);
          
          newState.syndicates[updatedCds.buyerSyndicateId] = {
            ...buyerSyndicate,
            warChest: Math.max(0, (buyerSyndicate.warChest ?? 0) - actualPaid),
          };
          newState.syndicates[updatedCds.writerSyndicateId] = {
            ...writerSyndicate,
            warChest: (writerSyndicate.warChest ?? 0) + actualPaid,
          };

          if (!newState.journal) newState.journal = [];
          const journalMsg = (updatedCds.marginEnabled && updatedCds.yieldRebalancingMultiplier)
            ? `[SWF Yield CDO CDS Premium] Syndicate ${updatedCds.buyerSyndicateId} paid ${actualPaid} gold premium (scaled by yield rebalancing multiplier ${updatedCds.yieldRebalancingMultiplier.toFixed(4)}) to Syndicate ${updatedCds.writerSyndicateId} for SWF Yield CDO CDS ${cdsId}.`
            : `[SWF Yield CDO CDS Premium] Syndicate ${updatedCds.buyerSyndicateId} paid ${actualPaid} gold premium to Syndicate ${updatedCds.writerSyndicateId} for SWF Yield CDO CDS ${cdsId}.`;
          newState.journal.push(journalMsg);
          
          if (actualPaid < premium) {
            updatedCds.active = false;
            newState.journal.push(`[SWF Yield CDO CDS Terminated] CDS ${cdsId} terminated due to insufficient premium payment from Syndicate ${updatedCds.buyerSyndicateId}.`);
          }

          // 3. Arbitrage Profit Distribution for allocated arbitrage liquidity
          if (updatedCds.arbitrageLiquidityAllocated && updatedCds.arbitrageLiquidityAllocated > 0) {
            const arbitrageRate = 0.05; // 5% base rate
            const profit = Math.floor(updatedCds.arbitrageLiquidityAllocated * arbitrageRate * reputationMultiplier);
            if (profit > 0) {
              newState.syndicates[updatedCds.writerSyndicateId] = {
                ...newState.syndicates[updatedCds.writerSyndicateId]!,
                warChest: (newState.syndicates[updatedCds.writerSyndicateId]!.warChest ?? 0) + profit,
              };
              newState.journal.push(
                `[Arbitrage Profit] Syndicate ${updatedCds.writerSyndicateId} earned ${profit} gold profit on ${updatedCds.arbitrageLiquidityAllocated} allocated arbitrage liquidity for CDS ${cdsId}.`
              );
            }
          }

          updatedCds.timestamp = newState.step;
          newState.swfYieldCDOCDSs[cdsId] = updatedCds;
        }
      }
    }
  }

  // Automatic Margin Health Evaluation and Collateral Call Liquidations
  if (newState.marginAccounts && Object.keys(newState.marginAccounts).length > 0) {
    newState.marginAccounts = { ...newState.marginAccounts };
    for (const [syndicateId, marginAccount] of Object.entries(newState.marginAccounts)) {
      // AF-171: Reinsurance Options Premium Auto-Compounding & Secondary Liquidity Vault Interest Ticks
      const compoundingSyndicate = newState.syndicates?.[syndicateId];
      if (compoundingSyndicate) {
        // 1. Periodic Premium Auto-Compounding
        if (newState.swfReinsuranceOptionsContracts) {
          newState.swfReinsuranceOptionsContracts = { ...newState.swfReinsuranceOptionsContracts };
          for (const [optId, opt] of Object.entries(newState.swfReinsuranceOptionsContracts)) {
            if (opt.active && opt.writerSyndicateId === syndicateId && !opt.premiumCompounded) {
              const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
              const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
              if (policy && policy.compoundingFactor !== undefined && policy.compoundingFactor > 0) {
                const premium = opt.premiumPaid ?? Math.floor(opt.size * getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId) * 100);
                const compoundAmount = Math.floor(premium * policy.compoundingFactor);
                const actualCompound = Math.min(compoundAmount, compoundingSyndicate.warChest ?? 0);
                if (actualCompound > 0) {
                  compoundingSyndicate.warChest = (compoundingSyndicate.warChest ?? 0) - actualCompound;
                  marginAccount.swfReinsuranceOptionVault = (marginAccount.swfReinsuranceOptionVault ?? 0) + actualCompound;
                  marginAccount.timestamp = newState.step;
                  
                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[SWF Reinsurance Premium Auto-Compounding] Routed ${actualCompound} gold (factor ${(policy.compoundingFactor * 100).toFixed(0)}%) of premium ${premium} gold from written option ${opt.id} to interest-bearing vault for Syndicate ${syndicateId}.`
                  );
                }
              }
              // Mark as compounded (even if actual compound was 0 due to no warChest) so we don't try again
              newState.swfReinsuranceOptionsContracts[optId] = {
                ...opt,
                premiumCompounded: true,
              };
            }
          }
        }

        // 2. Secondary Vault Interest Accruals (during normal network operations)
        const writtenOpts = Object.values(newState.swfReinsuranceOptionsContracts || {}).filter(opt => opt.active && opt.writerSyndicateId === syndicateId);
        if (writtenOpts.length > 0 && (marginAccount.swfReinsuranceOptionVault ?? 0) > 0) {
          let maxYieldRate = 0.0;
          let isNormal = true;
          for (const opt of writtenOpts) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
            if (policy) {
              if (policy.compoundingYieldRate !== undefined) {
                maxYieldRate = Math.max(maxYieldRate, policy.compoundingYieldRate);
              }
              
              // Calculate linkStateDropRate for this specific option
              let poolLinkStateDropRate = 0.0;
              if (newState.swfMultiFundReinsurancePools) {
                const cdo = newState.swfYieldCDOs?.[opt.swfYieldCdoId];
                const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
                for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                  if (pool.linkStateDropRate !== undefined && creatorSyndicateId && pool.syndicateIds.includes(creatorSyndicateId)) {
                    poolLinkStateDropRate = Math.max(poolLinkStateDropRate, pool.linkStateDropRate);
                  }
                }
              }
              let optLinkStateDropRate = poolLinkStateDropRate;
              if (optLinkStateDropRate === 0.0 && newState.swfMultiFundReinsurancePools) {
                for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                  if (pool.linkStateDropRate !== undefined) {
                    optLinkStateDropRate = Math.max(optLinkStateDropRate, pool.linkStateDropRate);
                  }
                }
              }
              const threshold = policy.autoDeleveragingThreshold ?? 0.3;
              const prunedThreshold = policy.prunedRoutesRiskThreshold;
              const prunedCount = marginAccount?.prunedRoutesCount ?? 0;
              if (optLinkStateDropRate >= threshold || (prunedThreshold !== undefined && prunedCount >= prunedThreshold)) {
                isNormal = false;
              }
            }
          }

          if (isNormal && maxYieldRate > 0) {
            const interest = Math.floor((marginAccount.swfReinsuranceOptionVault ?? 0) * maxYieldRate);
            if (interest > 0) {
              const oldVal = marginAccount.swfReinsuranceOptionVault ?? 0;
              marginAccount.swfReinsuranceOptionVault = oldVal + interest;
              marginAccount.timestamp = newState.step;
              
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Reinsurance Vault Interest] Syndicate ${syndicateId} earned ${interest} gold interest on reinsurance vault balance ${oldVal} gold (Yield Rate: ${(maxYieldRate * 100).toFixed(1)}%).`
              );
            }
          }
        }

        // 3. Automated Secondary Market Safety Capital Transfers under High Volatility Shocks
        if (writtenOpts.length > 0 && (marginAccount.swfReinsuranceOptionVault ?? 0) > 0) {
          const uniquePolicyKeys = new Set(writtenOpts.map(opt => `${opt.swfYieldCdoId}_${opt.trancheId}`));
          for (const policyKey of uniquePolicyKeys) {
            const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
            if (policy) {
              const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
              if (stressPolicy && stressPolicy.simulatedVolatilityShock !== undefined) {
                const limit = policy.stressReserveScalingLimit ?? 20.0;
                if (stressPolicy.simulatedVolatilityShock >= limit) {
                  const target = policy.stressStabilizationTarget ?? 100;
                  const mult = policy.stressReserveBufferMultiplier ?? 1.5;
                  const targetBalance = Math.floor(target * mult);

                  if (!newState.swfReinsuranceOptionVolatilityInsurancePools) {
                    newState.swfReinsuranceOptionVolatilityInsurancePools = {};
                  }
                  if (!newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey]) {
                    const [cdoId, trancheId] = policyKey.split("_") as [string, "senior" | "mezzanine" | "equity"];
                    newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey] = {
                      id: `pool_${policyKey}`,
                      swfYieldCdoId: cdoId,
                      trancheId: trancheId,
                      balance: 0,
                      timestamp: newState.step,
                    };
                  }

                  const pool = newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey];
                  if (pool.balance < targetBalance) {
                    const deficit = targetBalance - pool.balance;
                    const amountToTransfer = Math.min(deficit, marginAccount.swfReinsuranceOptionVault ?? 0);
                    if (amountToTransfer > 0) {
                      marginAccount.swfReinsuranceOptionVault = (marginAccount.swfReinsuranceOptionVault ?? 0) - amountToTransfer;
                      pool.balance += amountToTransfer;
                      pool.timestamp = newState.step;
                      marginAccount.timestamp = newState.step;

                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[SWF Safety Capital Transfer] Transferred ${amountToTransfer} gold from secondary reinsurance vault of Syndicate ${syndicateId} to stabilization pool ${policyKey} under high volatility shock (Shock: ${stressPolicy.simulatedVolatilityShock} >= Limit: ${limit}, Pool New Balance: ${pool.balance} gold).`
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      // AF-144: Volatility-Hedged Reserve Buffer Automated Adjustment
      const bufferPolicy = newState.volatilityHedgedReserveBuffers?.[syndicateId];
      if (bufferPolicy) {
        const syndicate = newState.syndicates?.[syndicateId];
        if (syndicate) {
          // Find active bond or default to "bond_1"
          let bondId = "bond_1";
          if (newState.sovereignBondLendingPools) {
            const pools = Object.values(newState.sovereignBondLendingPools);
            if (pools.length > 0) {
              bondId = pools[0].bondId;
            }
          }
          const volatility = getBondVolatility(newState, bondId);
          // Scale target by volatility relative to base of 20
          const scaledTarget = Math.round(bufferPolicy.reserveTarget * (1 + (volatility - 20) / 100));

          if (marginAccount.collateral < scaledTarget) {
            const needed = scaledTarget - marginAccount.collateral;
            const transfer = Math.min(syndicate.warChest ?? 0, needed);
            if (transfer > 0) {
              syndicate.warChest = (syndicate.warChest ?? 0) - transfer;
              marginAccount.collateral += transfer;
              marginAccount.timestamp = newState.step;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Volatility Hedged Buffer Deposit] Syndicate ${syndicateId} automatically deposited ${transfer} gold from war chest to margin account to maintain volatility-scaled reserve target of ${scaledTarget} gold (Current Volatility: ${volatility.toFixed(2)}%).`
              );
            }
          } else if (marginAccount.collateral > scaledTarget * 1.5) {
            const excess = marginAccount.collateral - scaledTarget;
            if (excess > 0) {
              marginAccount.collateral -= excess;
              syndicate.warChest = (syndicate.warChest ?? 0) + excess;
              marginAccount.timestamp = newState.step;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Volatility Hedged Buffer Refund] Syndicate ${syndicateId} automatically refunded ${excess} gold of excess collateral from margin account back to war chest (Target: ${scaledTarget} gold, Current Volatility: ${volatility.toFixed(2)}%).`
              );
            }
          }
        }
      }

      // AF-113: Dynamic Advisor-led Reallocations
      if (marginAccount.advisorEnabled && marginAccount.advisorSafetyThreshold !== undefined && marginAccount.collateral > 0) {
        const vaults = getSecondaryReserveVaults(newState);
        const vaultsList = Object.values(vaults);
        if (vaultsList.length > 0) {
          const optimalTargets = findOptimalAdvisorAllocations(vaultsList, marginAccount.advisorSafetyThreshold);
          marginAccount.vaultTargets = optimalTargets;
          newState.journal.push(
            `[Advisor Rebalancing] Automated Advisor updated vault targets for Syndicate ${syndicateId} to optimize yield under safety threshold of ${marginAccount.advisorSafetyThreshold}%: ${JSON.stringify(optimalTargets)}.`
          );
        }
      }

      // AF-133: Dynamic Advisor-led Reallocations specifically for SWF CDS margins
      if (marginAccount.swfAdvisorEnabled && marginAccount.swfAdvisorSafetyThreshold !== undefined && marginAccount.collateral > 0) {
        const vaults = getSecondaryReserveVaults(newState);
        const vaultsList = Object.values(vaults);
        if (vaultsList.length > 0) {
          const optimalTargets = findOptimalAdvisorAllocations(vaultsList, marginAccount.swfAdvisorSafetyThreshold);
          marginAccount.swfVaultTargets = optimalTargets;
          newState.journal.push(
            `[SWF Advisor Rebalancing] Automated SWF Advisor updated vault targets for Syndicate ${syndicateId} to optimize yield under safety threshold of ${marginAccount.swfAdvisorSafetyThreshold}%: ${JSON.stringify(optimalTargets)}.`
          );
        }
      }

      // AF-112: Auto-rebalance if rebalancing is enabled
      if (marginAccount.rebalancingEnabled && marginAccount.collateral > 0) {
        const collateral = marginAccount.collateral;
        const targetBuffer = Math.floor(collateral * ((marginAccount.liquidityBufferRatio ?? 0) / 100));
        const targetRehypothecated = collateral - targetBuffer;
        const vaultAllocations: Record<string, number> = {};

        for (const [vaultId, pct] of Object.entries(marginAccount.vaultTargets || {})) {
          vaultAllocations[vaultId] = Math.floor(targetRehypothecated * (pct / 100));
        }
        const sumAllocated = Object.values(vaultAllocations).reduce((a, b) => a + b, 0);
        marginAccount.liquidityBuffer = collateral - sumAllocated;
        marginAccount.vaultAllocations = vaultAllocations;
      }

      // AF-134: Dynamic Leverage Factor & Fractional Reserve held computation
      const activeVaultId = marginAccount.swfRehypothecationVaultId || (marginAccount.swfVaultAllocations ? Object.keys(marginAccount.swfVaultAllocations)[0] : undefined);
      const sponsorPolicy = activeVaultId ? newState.factionSponsorPolicies?.[syndicateId]?.[activeVaultId] : undefined;
      const factionId = sponsorPolicy?.factionId;
      const factionRep = factionId ? (newState.factionRep?.[factionId] ?? 0) : 0;
      const reputationMultiplier = 1.0 + Math.max(0, factionRep * 0.05);
      const targetLeverage = marginAccount.swfLeverageTarget ?? 1.0;
      
      marginAccount.swfLeverageFactor = Math.min(targetLeverage, reputationMultiplier);
      marginAccount.swfLiquidityMiningMultiplier = reputationMultiplier;

      // AF-165: Compute tranche-specific leverage factors scaled by reputation
      if (marginAccount.swfTrancheLeverageTargets) {
        const factors = { ...(marginAccount.swfTrancheLeverageFactors || {}) } as any;
        for (const [trancheId, target] of Object.entries(marginAccount.swfTrancheLeverageTargets)) {
          factors[trancheId] = Math.min(target, reputationMultiplier);
        }
        marginAccount.swfTrancheLeverageFactors = factors;
      }

      const swfReserveRatio = marginAccount.swfFractionalReserveRatio ?? 10;
      marginAccount.swfFractionalReserveHeld = Math.floor(marginAccount.collateral * (swfReserveRatio / 100));

      // AF-135: Automated Arbitrage Rebalancing & Auto-Drawdowns
      if (marginAccount.swfArbitrageEnabled && marginAccount.collateral > 0) {
        const vaults = getSecondaryReserveVaults(newState);
        let targetToRedistribute = 0;
        const activeTargets = { ...(marginAccount.swfVaultTargets || {}) };
        
        for (const [vaultId, pct] of Object.entries(activeTargets)) {
          const vault = vaults[vaultId];
          if (!vault) continue;
          
          // Compute effective yield
          const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
          let effectiveInterestRate = vault.interestRate;
          if (sponsorPolicy) {
            const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
            const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
            effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
          }
          
          const yieldThreshold = marginAccount.swfYieldThresholds?.[vaultId] ?? 0;
          if (effectiveInterestRate < yieldThreshold) {
            targetToRedistribute += pct;
            activeTargets[vaultId] = 0;
            
            // Auto-withdrawal
            if (marginAccount.swfAutoWithdrawalEnabled) {
              const currentAllocated = marginAccount.swfVaultAllocations?.[vaultId] ?? 0;
              if (currentAllocated > 0) {
                if (marginAccount.swfVaultAllocations) {
                  marginAccount.swfVaultAllocations[vaultId] = 0;
                }
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Auto-Withdrawal] Yield of vault ${vaultId} (${effectiveInterestRate.toFixed(4)}) fell below threshold (${yieldThreshold}). Automatically withdrew ${currentAllocated} gold back to SWF liquidity buffer.`
                );
              }
            }
          }
        }
        
        if (targetToRedistribute > 0) {
          // Find the best vault above threshold
          let bestVaultId: string | undefined = undefined;
          let bestYield = -1;
          for (const [vaultId, vault] of Object.entries(vaults)) {
            const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
            let effectiveInterestRate = vault.interestRate;
            if (sponsorPolicy) {
              const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
              const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
              effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
            }
            
            const yieldThreshold = marginAccount.swfYieldThresholds?.[vaultId] ?? 0;
            if (effectiveInterestRate >= yieldThreshold && effectiveInterestRate > bestYield) {
              bestYield = effectiveInterestRate;
              bestVaultId = vaultId;
            }
          }
          
          if (bestVaultId) {
            activeTargets[bestVaultId] = (activeTargets[bestVaultId] ?? 0) + targetToRedistribute;
            marginAccount.swfVaultTargets = activeTargets;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Arbitrage Rebalancing] Reallocated ${targetToRedistribute}% vault targets to highest yielding vault ${bestVaultId} (Yield: ${bestYield.toFixed(4)}).`
            );
          } else {
            marginAccount.swfVaultTargets = activeTargets;
          }
        }
      }

      // AF-133: Auto-rebalance if SWF rebalancing or SWF yield arbitrage is enabled
      if ((marginAccount.swfRebalancingEnabled || marginAccount.swfArbitrageEnabled) && marginAccount.collateral > 0) {
        const collateral = marginAccount.collateral;
        const targetBuffer = Math.floor(collateral * ((marginAccount.swfLiquidityBufferRatio ?? 0) / 100));
        
        // Respect Fractional Reserve Ratio
        const maxRehypothecatable = Math.max(0, collateral - (marginAccount.swfFractionalReserveHeld ?? 0));
        let targetRehypothecated = collateral - targetBuffer;
        if (targetRehypothecated > maxRehypothecatable) {
          targetRehypothecated = maxRehypothecatable;
        }

        const vaultAllocations: Record<string, number> = {};

        for (const [vaultId, pct] of Object.entries(marginAccount.swfVaultTargets || {})) {
          vaultAllocations[vaultId] = Math.floor(targetRehypothecated * (pct / 100));
        }
        const sumAllocated = Object.values(vaultAllocations).reduce((a, b) => a + b, 0);
        marginAccount.swfLiquidityBuffer = collateral - sumAllocated;
        marginAccount.swfVaultAllocations = vaultAllocations;
      }

      // AF-111 & AF-112: Process margin rehypothecation yield / sweep risk
      if (marginAccount.rebalancingEnabled) {
        const vaults = getSecondaryReserveVaults(newState);
        const allocations = { ...(marginAccount.vaultAllocations || {}) };
        let collateralChanged = false;

        for (const [vaultId, allocatedAmount] of Object.entries(allocations)) {
          if (allocatedAmount > 0 && marginAccount.collateral > 0) {
            const vault = vaults[vaultId];
            if (vault) {
              // Roll for enforcer sweep risk
              const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
              newState.seed = nextSeed;

              const riskPercentage = Math.round(vault.sweepRisk * 100);
              if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
                // Sweep! Deduct this vault's allocation from the vault and total collateral
                const actualDeduct = Math.min(allocatedAmount, marginAccount.collateral);
                marginAccount.collateral -= actualDeduct;
                allocations[vaultId] = 0;
                collateralChanged = true;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[Rehypothecation Sweep] Regulators swept vault ${vault.name} (${vaultId}) containing rehypothecated collateral of Syndicate ${syndicateId}! Liquidated all ${actualDeduct} gold (Sweep Roll: ${sweepRoll} <= Risk: ${riskPercentage}%).`
                );
              } else {
                // Earn yield!
                let interest = 0;
                if (vault.interestRate > 0) {
                  // Calculate active locks in this vault for AF-114
                  const currentEpoch = Math.floor(newState.step / 5);
                  const activeLocks = (marginAccount.lockedPositions ?? [])
                    .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed);

                  const totalLocked = activeLocks.reduce((sum, p) => sum + p.amount, 0);

                  const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
                  let effectiveInterestRate = vault.interestRate;
                  if (sponsorPolicy) {
                    const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
                    const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
                    effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
                  }

                  if (totalLocked > 0 && allocatedAmount > 0) {
                    let lockedInterestSum = 0;
                    for (const lock of activeLocks) {
                      // Proportional share of allocatedAmount if allocatedAmount is less than totalLocked
                      const shareFraction = lock.amount / totalLocked;
                      const lockAllocated = Math.min(lock.amount, Math.floor(allocatedAmount * shareFraction));
                      
                      const yieldMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const lockInterest = Math.floor(lockAllocated * effectiveInterestRate * yieldMultiplier);
                      lockedInterestSum += lockInterest;

                      // Passive reputation accrual with reputation multiplier (e.g. 1.0 + durationEpochs * 0.1)
                      const repMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const baseRepAccrual = 1;
                      const sponsorRepBonus = sponsorPolicy ? (1.0 + sponsorPolicy.rewardRate) : 1.0;
                      const repAccrued = Math.max(1, Math.round(baseRepAccrual * repMultiplier * sponsorRepBonus));
                      
                      if (!newState.factionRep) newState.factionRep = {};
                      newState.factionRep[lock.factionId] = (newState.factionRep[lock.factionId] ?? 0) + repAccrued;
                      
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Liquidity Mining Rep] Syndicate ${syndicateId} accrued +${repAccrued} faction reputation with ${lock.factionId} from active lock in vault ${vaultId}.`
                      );
                    }
                    const unlockedAmount = Math.max(0, allocatedAmount - totalLocked);
                    const unlockedInterest = Math.floor(unlockedAmount * effectiveInterestRate);
                    interest = Math.max(1, lockedInterestSum + unlockedInterest);
                  } else {
                    interest = Math.max(1, Math.floor(allocatedAmount * effectiveInterestRate));
                  }
                }
                if (interest > 0) {
                  const yieldReturned = Math.floor(interest * 0.80);
                  if (yieldReturned > 0) {
                    marginAccount.collateral += yieldReturned;
                    marginAccount.liquidityBuffer = (marginAccount.liquidityBuffer ?? 0) + yieldReturned;
                    collateralChanged = true;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Rehypothecation Yield] Syndicate ${syndicateId} earned ${interest} gold passive interest from rehypothecated collateral in ${vault.name} (Returned ${yieldReturned} gold to margin collateral).`
                    );
                  }
                }
              }
            }
          }
        }
        if (collateralChanged) {
          marginAccount.vaultAllocations = allocations;
          marginAccount.timestamp = newState.step;
        }
      } else {
        // Fall back to old single-vault logic
        if (marginAccount.rehypothecationAuthorized && marginAccount.rehypothecationVaultId && marginAccount.rehypothecationPercentage !== undefined && marginAccount.rehypothecationPercentage > 0 && marginAccount.collateral > 0) {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[marginAccount.rehypothecationVaultId];
          if (vault) {
            const rehypothecatedAmount = Math.floor(marginAccount.collateral * (marginAccount.rehypothecationPercentage / 100));
            if (rehypothecatedAmount > 0) {
              // Roll for enforcer sweep risk
              const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
              newState.seed = nextSeed;

              const riskPercentage = Math.round(vault.sweepRisk * 100);
              if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
                // Sweep! Reduce collateral by rehypothecated amount
                marginAccount.collateral = Math.max(0, marginAccount.collateral - rehypothecatedAmount);
                marginAccount.timestamp = newState.step;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[Rehypothecation Sweep] Regulators swept vault ${vault.name} (${marginAccount.rehypothecationVaultId}) containing rehypothecated collateral of Syndicate ${syndicateId}! Liquidated all ${rehypothecatedAmount} gold (Sweep Roll: ${sweepRoll} <= Risk: ${riskPercentage}%).`
                );
              } else {
                // Earn yield!
                let interest = 0;
                if (vault.interestRate > 0) {
                  const vaultId = marginAccount.rehypothecationVaultId;
                  const currentEpoch = Math.floor(newState.step / 5);
                  const activeLocks = (marginAccount.lockedPositions ?? [])
                    .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed);

                  const totalLocked = activeLocks.reduce((sum, p) => sum + p.amount, 0);

                  const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
                  let effectiveInterestRate = vault.interestRate;
                  if (sponsorPolicy) {
                    const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
                    const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
                    effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
                  }

                  if (totalLocked > 0 && rehypothecatedAmount > 0) {
                    let lockedInterestSum = 0;
                    for (const lock of activeLocks) {
                      const shareFraction = lock.amount / totalLocked;
                      const lockAllocated = Math.min(lock.amount, Math.floor(rehypothecatedAmount * shareFraction));
                      
                      const yieldMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const lockInterest = Math.floor(lockAllocated * effectiveInterestRate * yieldMultiplier);
                      lockedInterestSum += lockInterest;

                      const repMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const baseRepAccrual = 1;
                      const sponsorRepBonus = sponsorPolicy ? (1.0 + sponsorPolicy.rewardRate) : 1.0;
                      const repAccrued = Math.max(1, Math.round(baseRepAccrual * repMultiplier * sponsorRepBonus));
                      
                      if (!newState.factionRep) newState.factionRep = {};
                      newState.factionRep[lock.factionId] = (newState.factionRep[lock.factionId] ?? 0) + repAccrued;
                      
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Liquidity Mining Rep] Syndicate ${syndicateId} accrued +${repAccrued} faction reputation with ${lock.factionId} from active lock in vault ${vaultId}.`
                      );
                    }
                    const unlockedAmount = Math.max(0, rehypothecatedAmount - totalLocked);
                    const unlockedInterest = Math.floor(unlockedAmount * effectiveInterestRate);
                    interest = Math.max(1, lockedInterestSum + unlockedInterest);
                  } else {
                    interest = Math.max(1, Math.floor(rehypothecatedAmount * effectiveInterestRate));
                  }
                }
                if (interest > 0) {
                  const yieldReturned = Math.floor(interest * 0.80);
                  if (yieldReturned > 0) {
                    marginAccount.collateral += yieldReturned;
                    marginAccount.timestamp = newState.step;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Rehypothecation Yield] Syndicate ${syndicateId} earned ${interest} gold passive interest from rehypothecated collateral in ${vault.name} (Returned ${yieldReturned} gold to margin collateral).`
                    );
                  }
                }
              }
            }
          }
        }
      }

      // AF-133: Process SWF margin rehypothecation yield / sweep risk
      if (marginAccount.swfRebalancingEnabled) {
        const vaults = getSecondaryReserveVaults(newState);
        const allocations = { ...(marginAccount.swfVaultAllocations || {}) };
        let collateralChanged = false;

        for (const [vaultId, allocatedAmount] of Object.entries(allocations)) {
          if (allocatedAmount > 0 && marginAccount.collateral > 0) {
            const vault = vaults[vaultId];
            if (vault) {
              // Roll for sweep risk
              const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
              newState.seed = nextSeed;

              const riskPercentage = Math.round(vault.sweepRisk * 100);
              if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
                const actualDeduct = Math.min(allocatedAmount, marginAccount.collateral);
                marginAccount.collateral -= actualDeduct;
                allocations[vaultId] = 0;
                collateralChanged = true;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Rehypothecation Sweep] Regulators swept vault ${vault.name} (${vaultId}) containing rehypothecated SWF collateral of Syndicate ${syndicateId}! Liquidated all ${actualDeduct} gold (Sweep Roll: ${sweepRoll} <= Risk: ${riskPercentage}%).`
                );
              } else {
                // Earn yield
                let interest = 0;
                if (vault.interestRate > 0) {
                  const currentEpoch = Math.floor(newState.step / 5);
                  const activeLocks = (marginAccount.swfLockedPositions ?? [])
                    .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed);

                  const totalLocked = activeLocks.reduce((sum, p) => sum + p.amount, 0);

                  const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
                  let effectiveInterestRate = vault.interestRate;
                  if (sponsorPolicy) {
                    const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
                    const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
                    effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
                  }

                  if (totalLocked > 0 && allocatedAmount > 0) {
                    let lockedInterestSum = 0;
                    for (const lock of activeLocks) {
                      const shareFraction = lock.amount / totalLocked;
                      const lockAllocated = Math.min(lock.amount, Math.floor(allocatedAmount * shareFraction));
                      
                      const yieldMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const lockInterest = Math.floor(lockAllocated * effectiveInterestRate * yieldMultiplier);
                      lockedInterestSum += lockInterest;

                      const repMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const baseRepAccrual = 1;
                      const sponsorRepBonus = sponsorPolicy ? (1.0 + sponsorPolicy.rewardRate) : 1.0;
                      const repAccrued = Math.max(1, Math.round(baseRepAccrual * repMultiplier * sponsorRepBonus));
                      
                      if (!newState.factionRep) newState.factionRep = {};
                      newState.factionRep[lock.factionId] = (newState.factionRep[lock.factionId] ?? 0) + repAccrued;
                      
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Liquidity Mining Rep] Syndicate ${syndicateId} accrued +${repAccrued} faction reputation with ${lock.factionId} from active SWF lock in vault ${vaultId}.`
                      );
                    }
                    const unlockedAmount = Math.max(0, allocatedAmount - totalLocked);
                    const unlockedInterest = Math.floor(unlockedAmount * effectiveInterestRate);
                    interest = Math.max(1, lockedInterestSum + unlockedInterest);
                  } else {
                    interest = Math.max(1, Math.floor(allocatedAmount * effectiveInterestRate));
                  }
                }
                if (interest > 0) {
                  const yieldReturned = Math.floor(interest * 0.80);
                  if (yieldReturned > 0) {
                    marginAccount.collateral += yieldReturned;
                    marginAccount.swfLiquidityBuffer = (marginAccount.swfLiquidityBuffer ?? 0) + yieldReturned;
                    collateralChanged = true;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[SWF Rehypothecation Yield] Syndicate ${syndicateId} earned ${interest} gold passive interest from rehypothecated SWF collateral in ${vault.name} (Returned ${yieldReturned} gold to margin collateral).`
                    );
                  }
                }
              }
            }
          }
        }
        if (collateralChanged) {
          marginAccount.swfVaultAllocations = allocations;
          marginAccount.timestamp = newState.step;
        }
      } else {
        if (marginAccount.swfRehypothecationAuthorized && marginAccount.swfRehypothecationVaultId && marginAccount.swfRehypothecationPercentage !== undefined && marginAccount.swfRehypothecationPercentage > 0 && marginAccount.collateral > 0) {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[marginAccount.swfRehypothecationVaultId];
          if (vault) {
            const swfReserveRatio = marginAccount.swfFractionalReserveRatio ?? 10;
            const swfReserveAmount = Math.floor(marginAccount.collateral * (swfReserveRatio / 100));
            const maxRehypothecatable = Math.max(0, marginAccount.collateral - swfReserveAmount);
            const rehypothecatedAmount = Math.min(
              Math.floor(marginAccount.collateral * (marginAccount.swfRehypothecationPercentage / 100)),
              maxRehypothecatable
            );
            if (rehypothecatedAmount > 0) {
              const { value: sweepRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
              newState.seed = nextSeed;

              const riskPercentage = Math.round(vault.sweepRisk * 100);
              if (riskPercentage > 0 && sweepRoll <= riskPercentage) {
                marginAccount.collateral = Math.max(0, marginAccount.collateral - rehypothecatedAmount);
                marginAccount.timestamp = newState.step;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Rehypothecation Sweep] Regulators swept vault ${vault.name} (${marginAccount.swfRehypothecationVaultId}) containing rehypothecated SWF collateral of Syndicate ${syndicateId}! Liquidated all ${rehypothecatedAmount} gold (Sweep Roll: ${sweepRoll} <= Risk: ${riskPercentage}%).`
                );
              } else {
                let interest = 0;
                if (vault.interestRate > 0) {
                  const vaultId = marginAccount.swfRehypothecationVaultId;
                  const currentEpoch = Math.floor(newState.step / 5);
                  const activeLocks = (marginAccount.swfLockedPositions ?? [])
                    .filter(p => p.vaultId === vaultId && currentEpoch < p.endEpoch && !p.claimed);

                  const totalLocked = activeLocks.reduce((sum, p) => sum + p.amount, 0);

                  const sponsorPolicy = newState.factionSponsorPolicies?.[syndicateId]?.[vaultId];
                  let effectiveInterestRate = vault.interestRate;
                  if (sponsorPolicy) {
                    const factionRep = newState.factionRep?.[sponsorPolicy.factionId] ?? 0;
                    const repBoost = factionRep > 0 ? (factionRep * 0.005) : 0;
                    effectiveInterestRate = vault.interestRate * (1.0 + repBoost + (sponsorPolicy.rewardRate * 0.2));
                  }

                  if (totalLocked > 0 && rehypothecatedAmount > 0) {
                    let lockedInterestSum = 0;
                    for (const lock of activeLocks) {
                      const shareFraction = lock.amount / totalLocked;
                      const lockAllocated = Math.min(lock.amount, Math.floor(rehypothecatedAmount * shareFraction));
                      
                      const yieldMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const lockInterest = Math.floor(lockAllocated * effectiveInterestRate * yieldMultiplier);
                      lockedInterestSum += lockInterest;

                      const repMultiplier = 1.0 + (lock.durationEpochs * 0.1);
                      const baseRepAccrual = 1;
                      const sponsorRepBonus = sponsorPolicy ? (1.0 + sponsorPolicy.rewardRate) : 1.0;
                      const repAccrued = Math.max(1, Math.round(baseRepAccrual * repMultiplier * sponsorRepBonus));
                      
                      if (!newState.factionRep) newState.factionRep = {};
                      newState.factionRep[lock.factionId] = (newState.factionRep[lock.factionId] ?? 0) + repAccrued;
                      
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Liquidity Mining Rep] Syndicate ${syndicateId} accrued +${repAccrued} faction reputation with ${lock.factionId} from active SWF lock in vault ${vaultId}.`
                      );
                    }
                    const unlockedAmount = Math.max(0, rehypothecatedAmount - totalLocked);
                    const unlockedInterest = Math.floor(unlockedAmount * effectiveInterestRate);
                    interest = Math.max(1, lockedInterestSum + unlockedInterest);
                  } else {
                    interest = Math.max(1, Math.floor(rehypothecatedAmount * effectiveInterestRate));
                  }
                }
                if (interest > 0) {
                  const yieldReturned = Math.floor(interest * 0.80);
                  if (yieldReturned > 0) {
                    marginAccount.collateral += yieldReturned;
                    marginAccount.timestamp = newState.step;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[SWF Rehypothecation Yield] Syndicate ${syndicateId} earned ${interest} gold passive interest from rehypothecated SWF collateral in ${vault.name} (Returned ${yieldReturned} gold to margin collateral).`
                    );
                  }
                }
              }
            }
          }
        }
      }

      // AF-136: Syndicate SWF Staking Pools & Faction-Wide Grace Period Extensions
      // AF-137: Syndicate SWF Cooperative Staking Campaigns & Faction Sovereignty Yield Multipliers
      if (marginAccount.swfStakingEnabled && marginAccount.collateral > 0 && marginAccount.swfLiquidityBuffer !== undefined && marginAccount.swfLiquidityBuffer > 0) {
        const stakedFactions: Record<string, number> = {};
        const stakingYields: Record<string, number> = {};
        const graceExtensions: Record<string, number> = {};
        
        const bufferGold = marginAccount.swfLiquidityBuffer;
        
        for (const [factionId, pct] of Object.entries(marginAccount.swfStakingTargets || {})) {
          if (pct > 0) {
            const stakedAmount = Math.floor(bufferGold * (pct / 100));
            if (stakedAmount > 0) {
              stakedFactions[factionId] = stakedAmount;
              
              // Calculate dynamic yield rate for the faction:
              // Base yield rate 0.04 (4%), boosted by faction reputation (0.002 or 0.2% per reputation point)
              const factionRep = newState.factionRep?.[factionId] ?? 0;
              const yieldBoost = Math.max(0, factionRep * 0.002);
              let yieldRate = 0.04 + yieldBoost;

              let yieldMultiplier = 1.0;
              let repMultiplier = 1.0;
              let campaignBoostMsg = "";

              const activeCampaigns = newState.cooperativeSWFStakingCampaigns || {};
              const campaign = Object.values(activeCampaigns).find(c => c.factionId === factionId && c.participants.includes(syndicateId));
              if (campaign) {
                let totalStakedAmount = 0;
                const participantStakedMap: Record<string, number> = {};
                for (const pId of campaign.participants) {
                  const pMA = newState.marginAccounts?.[pId];
                  if (pMA && pMA.swfStakingEnabled && pMA.swfLiquidityBuffer !== undefined && pMA.swfLiquidityBuffer > 0) {
                    const pPct = pMA.swfStakingTargets?.[factionId] ?? 0;
                    const pStaked = Math.floor(pMA.swfLiquidityBuffer * (pPct / 100));
                    if (pStaked > 0) {
                      totalStakedAmount += pStaked;
                      participantStakedMap[pId] = pStaked;
                    }
                  }
                }
                campaign.stakedAmounts = participantStakedMap;
                if (!newState.cooperativeSWFStakingCampaigns) {
                  newState.cooperativeSWFStakingCampaigns = {};
                }
                newState.cooperativeSWFStakingCampaigns[campaign.id] = { ...campaign };

                let highestAchievedMilestoneTarget = 0;
                for (const m of campaign.milestones) {
                  if (totalStakedAmount >= m.targetAmount && m.targetAmount > highestAchievedMilestoneTarget) {
                    highestAchievedMilestoneTarget = m.targetAmount;
                    yieldMultiplier = m.yieldMultiplier;
                    repMultiplier = m.repMultiplier;
                  }
                }

                if (highestAchievedMilestoneTarget > 0) {
                  campaignBoostMsg = ` (Cooperative Boost: ${yieldMultiplier}x yield, ${repMultiplier}x rep from campaign ${campaign.campaignName})`;
                }
              }

              yieldRate = yieldRate * yieldMultiplier;
              stakingYields[factionId] = yieldRate;
              
              // Passive gold yield earned this step:
              const goldEarned = Math.floor(stakedAmount * yieldRate);
              if (goldEarned > 0) {
                let sweptGold = 0;
                let netGoldEarned = goldEarned;

                let sweepPolicyToUse: any = null;
                if (newState.cooperativeStakingYieldSweepProposals) {
                  for (const prop of Object.values(newState.cooperativeStakingYieldSweepProposals)) {
                    if (
                      prop.status === "authorized" &&
                      prop.factionId === factionId &&
                      (prop.syndicateId === syndicateId || prop.targetSyndicateId === syndicateId)
                    ) {
                      const standing = getSyndicateFactionStanding(newState, syndicateId, factionId);
                      if (standing < prop.criticalThreshold) {
                        sweepPolicyToUse = prop;
                        break;
                      }
                    }
                  }
                }

                if (sweepPolicyToUse) {
                  const sweepPct = sweepPolicyToUse.sweepPercentage ?? 100;
                  sweptGold = Math.floor(goldEarned * (sweepPct / 100));
                  netGoldEarned = goldEarned - sweptGold;
                }

                if (sweptGold > 0) {
                  newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) + sweptGold;
                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[SWF Staking Sweep] Swept ${sweptGold} gold from Syndicate ${syndicateId} yield into the shared stabilization pool due to standing ${getSyndicateFactionStanding(newState, syndicateId, factionId)} falling below threshold ${sweepPolicyToUse.criticalThreshold} with faction ${factionId}.`
                  );
                }

                if (netGoldEarned > 0) {
                  marginAccount.collateral += netGoldEarned;
                  marginAccount.swfLiquidityBuffer = (marginAccount.swfLiquidityBuffer ?? 0) + netGoldEarned;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[SWF Staking Yield] Syndicate ${syndicateId} earned ${netGoldEarned} gold yield from staking ${stakedAmount} gold in faction ${factionId} staking pool (Yield Rate: ${(yieldRate * 100).toFixed(1)}%)${campaignBoostMsg}.`
                  );
                }
              }
              
              // Passive reputation accruals:
              const baseRepAccrued = Math.max(1, Math.floor(stakedAmount / 50));
              const repAccrued = Math.max(1, Math.round(baseRepAccrued * repMultiplier));
              if (!newState.factionRep) newState.factionRep = {};
              newState.factionRep[factionId] = (newState.factionRep[factionId] ?? 0) + repAccrued;
              
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Staking Reputation] Syndicate ${syndicateId} accrued +${repAccrued} reputation with faction ${factionId} from active SWF staking${campaignBoostMsg ? " (Boosted)" : ""}.`
              );
              
              // Grace Period Extensions:
              // +1 step of grace period extension for loans per 100 gold staked
              const graceSteps = Math.floor(stakedAmount / 100);
              if (graceSteps > 0) {
                graceExtensions[factionId] = graceSteps;
              }
            }
          }
        }
        
        marginAccount.swfStakedFactions = stakedFactions;
        marginAccount.swfStakingYields = stakingYields;
        marginAccount.swfGracePeriodExtensions = graceExtensions;
      } else {
        marginAccount.swfStakedFactions = {};
        marginAccount.swfStakingYields = {};
        marginAccount.swfGracePeriodExtensions = {};
      }

      let hasActiveFutures = false;
      if (newState.sovereignBondFuturesPositions) {
        for (const pos of Object.values(newState.sovereignBondFuturesPositions)) {
          if (pos.active && pos.syndicateId === syndicateId) {
            hasActiveFutures = true;
            break;
          }
        }
      }

      let hasActiveVolatility = false;
      if (newState.sovereignBondVolatilityPositions) {
        for (const pos of Object.values(newState.sovereignBondVolatilityPositions)) {
          if (pos.active && pos.syndicateId === syndicateId) {
            hasActiveVolatility = true;
            break;
          }
        }
      }

      const hasReserveBuffer = newState.volatilityHedgedReserveBuffers?.[syndicateId] !== undefined;

      if (marginAccount.collateral === 0 &&
          (!marginAccount.leveragedCDSIds || marginAccount.leveragedCDSIds.length === 0) &&
          (!marginAccount.leveragedSWFYieldCDOCDSIds || marginAccount.leveragedSWFYieldCDOCDSIds.length === 0) &&
          (!marginAccount.leveragedTranchePositions || Object.keys(marginAccount.leveragedTranchePositions).length === 0) &&
          !hasActiveFutures &&
          !hasActiveVolatility &&
          !hasReserveBuffer) {
        continue;
      }

      // Mark-to-market settlement for active sovereign bond volatility positions (AF-144)
      if (newState.sovereignBondVolatilityPositions) {
        newState.sovereignBondVolatilityPositions = { ...newState.sovereignBondVolatilityPositions };
        for (const posId of Object.keys(newState.sovereignBondVolatilityPositions)) {
          const pos = newState.sovereignBondVolatilityPositions[posId];
          if (pos && pos.active && pos.syndicateId === syndicateId) {
            const currentVix = getBondVolatility(newState, pos.bondId);
            const diff = currentVix - pos.entryVolatility;
            const profit = Math.round((pos.side === "long" ? 1 : -1) * diff * pos.size * 10);

            marginAccount.collateral = Math.max(0, marginAccount.collateral + profit);

            newState.sovereignBondVolatilityPositions[posId] = {
              ...pos,
              entryVolatility: currentVix,
              timestamp: newState.step,
            };

            if (marginAccount.collateral <= 0) {
              newState.sovereignBondVolatilityPositions[posId].active = false;
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Sovereign Bond Volatility Position Liquidated] Syndicate ${syndicateId} position ${pos.id} on bond ${pos.bondId} was liquidated due to insufficient collateral.`
              );
            } else if (profit !== 0) {
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Sovereign Bond Volatility Mark-to-Market] Syndicate ${syndicateId} position ${pos.id} on bond ${pos.bondId} settled MTM. Current VIX: ${currentVix.toFixed(2)}%, profit/loss: ${profit} gold.`
              );
            }
          }
        }
      }

      // Mark-to-market settlement for active sovereign bond futures positions (AF-143)
      let sumFuturesMaintenanceRequirement = 0;
      if (newState.sovereignBondFuturesPositions) {
        newState.sovereignBondFuturesPositions = { ...newState.sovereignBondFuturesPositions };
        for (const posId of Object.keys(newState.sovereignBondFuturesPositions)) {
          const pos = newState.sovereignBondFuturesPositions[posId];
          if (pos && pos.active && pos.syndicateId === syndicateId) {
            // Calculate mark-to-market
            const currentYield = getBondCurrentYield(newState, pos.bondId);
            const diff = currentYield - pos.entryPrice;
            const profit = Math.round((pos.side === "long" ? 1 : -1) * diff * pos.size * pos.leverage);

            // Realize mark-to-market profit/loss
            marginAccount.collateral = Math.max(0, marginAccount.collateral + profit);
            
            newState.sovereignBondFuturesPositions[posId] = {
              ...pos,
              entryPrice: currentYield,
              timestamp: newState.step,
            };

            // Calculate maintenance requirement for this position
            const futuresRequired = Math.round((pos.size * currentYield * 0.10) / pos.leverage);
            sumFuturesMaintenanceRequirement += futuresRequired;

            if (profit !== 0) {
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Sovereign Bond Futures Mark-to-Market] Syndicate ${syndicateId} position ${pos.id} (bond ${pos.bondId}) settled MTM. Current yield: ${currentYield.toFixed(2)}%, profit/loss: ${profit} gold.`
              );
            }
          }
        }
      }

      // Calculate Net Margin Value (Net Equity)
      let sumCurrentStakeValue = 0;
      let sumBorrowedAmount = 0;

      const leveragedTranches = marginAccount.leveragedTranchePositions || {};
      for (const [posKey, pos] of Object.entries(leveragedTranches)) {
        const cdo = newState.cdos?.[pos.cdoId];
        const tranche = cdo?.tranches?.[pos.trancheId];
        const currentStakeValue = tranche?.ownership?.[syndicateId] ?? 0;
        sumCurrentStakeValue += currentStakeValue;
        sumBorrowedAmount += pos.borrowedAmount;
      }

      let netEquity = marginAccount.collateral + (sumCurrentStakeValue - sumBorrowedAmount);

      // Calculate Maintenance Margin Requirement
      let sumCdsNotional = 0;
      const activeCDSIds = marginAccount.leveragedCDSIds || [];
      const stillActiveCDSIds: string[] = [];

      for (const cdsId of activeCDSIds) {
        const cds = newState.creditDefaultSwaps?.[cdsId];
        if (cds && cds.active) {
          sumCdsNotional += cds.notionalValue;
          stillActiveCDSIds.push(cdsId);
        }
      }
      marginAccount.leveragedCDSIds = stillActiveCDSIds;

      let sumSwfCdsNotional = 0;
      let swfCdsComponent = 0;
      const activeSwfCDSIds = marginAccount.leveragedSWFYieldCDOCDSIds || [];
      const stillActiveSwfCDSIds: string[] = [];

      for (const cdsId of activeSwfCDSIds) {
        const cds = newState.swfYieldCDOCDSs?.[cdsId];
        if (cds && cds.active) {
          sumSwfCdsNotional += cds.notionalValue;
          stillActiveSwfCDSIds.push(cdsId);
          const trancheLeverage = marginAccount.swfTrancheLeverageFactors?.[cds.trancheId] ?? marginAccount.swfLeverageFactor ?? 1.0;
          swfCdsComponent += Math.round((0.20 * cds.notionalValue) / trancheLeverage);
        }
      }
      marginAccount.leveragedSWFYieldCDOCDSIds = stillActiveSwfCDSIds;

      let rehypothecationPremium = 0;
      if (marginAccount.rebalancingEnabled) {
        const vaults = getSecondaryReserveVaults(newState);
        const allocations = marginAccount.vaultAllocations || {};
        for (const [vaultId, allocatedAmount] of Object.entries(allocations)) {
          const vault = vaults[vaultId];
          if (vault && allocatedAmount > 0) {
            rehypothecationPremium += Math.round(allocatedAmount * (0.10 + vault.sweepRisk));
          }
        }
      } else {
        if (marginAccount.rehypothecationAuthorized && marginAccount.rehypothecationVaultId && marginAccount.rehypothecationPercentage !== undefined) {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[marginAccount.rehypothecationVaultId];
          if (vault) {
            const rehypothecatedAmount = Math.floor(marginAccount.collateral * (marginAccount.rehypothecationPercentage / 100));
            rehypothecationPremium = Math.round(rehypothecatedAmount * (0.10 + vault.sweepRisk));
          }
        }
      }

      let swfRehypothecationPremium = 0;
      if (marginAccount.swfRebalancingEnabled) {
        const vaults = getSecondaryReserveVaults(newState);
        const allocations = marginAccount.swfVaultAllocations || {};
        for (const [vaultId, allocatedAmount] of Object.entries(allocations)) {
          const vault = vaults[vaultId];
          if (vault && allocatedAmount > 0) {
            swfRehypothecationPremium += Math.round(allocatedAmount * (0.10 + vault.sweepRisk));
          }
        }
      } else {
        if (marginAccount.swfRehypothecationAuthorized && marginAccount.swfRehypothecationVaultId && marginAccount.swfRehypothecationPercentage !== undefined) {
          const vaults = getSecondaryReserveVaults(newState);
          const vault = vaults[marginAccount.swfRehypothecationVaultId];
          if (vault) {
            const rehypothecatedAmount = Math.floor(marginAccount.collateral * (marginAccount.swfRehypothecationPercentage / 100));
            swfRehypothecationPremium = Math.round(rehypothecatedAmount * (0.10 + vault.sweepRisk));
          }
        }
      }

      let sumVolMaintenanceRequirement = 0;
      if (newState.sovereignBondVolatilityPositions) {
        for (const pos of Object.values(newState.sovereignBondVolatilityPositions)) {
          if (pos.active && pos.syndicateId === syndicateId) {
            sumVolMaintenanceRequirement += pos.size * 5;
          }
        }
      }

      let sumOptionsMaintenanceRequirement = 0;
      if (newState.swfReinsuranceOptionsContracts) {
        for (const opt of Object.values(newState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
            const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
            const avgVolatility = activeBonds.length > 0
              ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
              : 15.0;

            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
            const marginPolicy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];

            let volatilityToUse = avgVolatility;
            let shockScale = 1.0;
            let flatShock = 0;

            if (stressPolicy) {
              volatilityToUse = avgVolatility + stressPolicy.simulatedVolatilityShock;
              shockScale = stressPolicy.reserveMultiplier;
              flatShock = Math.round(stressPolicy.simulatedLiquidityShock);
            }

            // Calculate linkStateDropRate for this specific option
            let poolLinkStateDropRate = 0.0;
            if (newState.swfMultiFundReinsurancePools) {
              const cdo = newState.swfYieldCDOs?.[opt.swfYieldCdoId];
              const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
              for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                if (pool.linkStateDropRate !== undefined) {
                  if (creatorSyndicateId && pool.syndicateIds.includes(creatorSyndicateId)) {
                    poolLinkStateDropRate = Math.max(poolLinkStateDropRate, pool.linkStateDropRate);
                  }
                }
              }
            }
            let optLinkStateDropRate = poolLinkStateDropRate;
            if (optLinkStateDropRate === 0.0 && newState.swfMultiFundReinsurancePools) {
              for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                if (pool.linkStateDropRate !== undefined) {
                  optLinkStateDropRate = Math.max(optLinkStateDropRate, pool.linkStateDropRate);
                }
              }
            }

            let effectiveSize = opt.size;
            let deleveragingActive = false;
            const autoDeleveragingThreshold = marginPolicy?.autoDeleveragingThreshold ?? 0.3;
            const marginDeflectionFactor = marginPolicy?.marginDeflectionFactor ?? 0.5;

            const prunedThreshold = marginPolicy?.prunedRoutesRiskThreshold;
            const prunedCount = marginAccount?.prunedRoutesCount ?? 0;

            if (optLinkStateDropRate >= autoDeleveragingThreshold || (prunedThreshold !== undefined && prunedCount >= prunedThreshold)) {
              deleveragingActive = true;
              effectiveSize = Math.round(opt.size * (1.0 - marginDeflectionFactor));
            }

            let optRequired = Math.round(effectiveSize * spotRate * (volatilityToUse / 10.0) * 10);
            optRequired = Math.round(optRequired * shockScale) + flatShock;

            if (deleveragingActive) {
              optRequired = Math.round(optRequired * (1.0 - marginDeflectionFactor));

              if (!newState.journal) newState.journal = [];
              const reason = (prunedThreshold !== undefined && prunedCount >= prunedThreshold)
                ? `multiple route prunings (Pruned count: ${prunedCount} >= Threshold: ${prunedThreshold})`
                : `severe network degradation (Link-state drop rate: ${optLinkStateDropRate.toFixed(2)} >= Threshold: ${autoDeleveragingThreshold.toFixed(2)})`;
              newState.journal.push(
                `[SWF Reinsurance Option Auto-Deleveraging] Syndicate ${syndicateId} option on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} auto-deleveraged: Size marked down from ${opt.size} to ${effectiveSize} and margin requirement reduced by ${(marginDeflectionFactor * 100).toFixed(0)}% due to ${reason}.`
              );
            }

            sumOptionsMaintenanceRequirement += optRequired;
          }
        }
      }

      const swfLeverage = marginAccount.swfLeverageFactor ?? 1.0;
      // swfCdsComponent is already calculated above per tranche
      const swfRehypoComponent = Math.round(swfRehypothecationPremium / swfLeverage);

      // Calculate SWF Reinsurance Option Limit Order Book exposure and dynamic scale factor (AF-150)
      const openLimitOrdersForSyndicate = Object.values(newState.swfReinsuranceOptionLimitOrders || {}).filter(
        (o) => o.status === "Open" && o.syndicateId === syndicateId
      );
      const aggregatePendingValue = openLimitOrdersForSyndicate.reduce((sum, o) => sum + o.limitPrice, 0);
      const syndicate = newState.syndicates?.[syndicateId];
      const warChest = syndicate?.warChest ?? 0;

      let pendingScale = 1.0;
      if (warChest > 0 && aggregatePendingValue > warChest) {
        pendingScale = aggregatePendingValue / warChest;
      }

      let maintenanceRequirement = Math.round((0.20 * sumCdsNotional) + (0.10 * sumBorrowedAmount) + rehypothecationPremium) + swfCdsComponent + swfRehypoComponent + sumFuturesMaintenanceRequirement + sumVolMaintenanceRequirement + sumOptionsMaintenanceRequirement;

      // Apply pending order book scale factor
      maintenanceRequirement = Math.round(maintenanceRequirement * pendingScale);

      // AF-112: Preemptive Drawdown Loop to prevent margin call liquidations
      if (marginAccount.rebalancingEnabled && marginAccount.collateral > 0) {
        const triggerRatio = marginAccount.bufferTriggerRatio ?? 1.2;
        if (netEquity <= triggerRatio * maintenanceRequirement) {
          const vaults = getSecondaryReserveVaults(newState);
          const allocations = { ...(marginAccount.vaultAllocations || {}) };
          
          // Sort vaults by sweepRisk descending to draw back highest risk first
          const sortedVaultIds = Object.keys(allocations).sort((a, b) => {
            const riskA = vaults[a]?.sweepRisk ?? 0;
            const riskB = vaults[b]?.sweepRisk ?? 0;
            return riskB - riskA;
          });

          let drewBackAny = false;

          for (const vaultId of sortedVaultIds) {
            const allocatedAmount = allocations[vaultId] ?? 0;
            if (allocatedAmount > 0) {
              allocations[vaultId] = 0;
              marginAccount.liquidityBuffer = (marginAccount.liquidityBuffer ?? 0) + allocatedAmount;
              drewBackAny = true;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Preemptive Drawback] Syndicate ${syndicateId} drew back ${allocatedAmount} gold from vault ${vaultId} to prevent margin liquidation.`
              );

              // Recompute rehypothecationPremium and maintenanceRequirement
              let tempPremium = 0;
              for (const [vId, amt] of Object.entries(allocations)) {
                const vault = vaults[vId];
                if (vault && amt > 0) {
                  tempPremium += Math.round(amt * (0.10 + vault.sweepRisk));
                }
              }
              rehypothecationPremium = tempPremium;
              maintenanceRequirement = Math.round(
                (Math.round((0.20 * sumCdsNotional) + (0.10 * sumBorrowedAmount) + rehypothecationPremium) + swfCdsComponent + swfRehypoComponent + sumFuturesMaintenanceRequirement + sumVolMaintenanceRequirement + sumOptionsMaintenanceRequirement) * pendingScale
              );

              if (netEquity > triggerRatio * maintenanceRequirement) {
                break; // Safely avoided the danger zone!
              }
            }
          }

          if (drewBackAny) {
            marginAccount.vaultAllocations = allocations;
            marginAccount.timestamp = newState.step;
          }
        }
      }

      // AF-133: Preemptive Drawdown Loop for SWF rehypothecated collateral to prevent margin call liquidations
      if (marginAccount.swfRebalancingEnabled && marginAccount.collateral > 0) {
        const triggerRatio = marginAccount.swfBufferTriggerRatio ?? 1.2;
        if (netEquity <= triggerRatio * maintenanceRequirement) {
          const vaults = getSecondaryReserveVaults(newState);
          const allocations = { ...(marginAccount.swfVaultAllocations || {}) };
          
          const sortedVaultIds = Object.keys(allocations).sort((a, b) => {
            const riskA = vaults[a]?.sweepRisk ?? 0;
            const riskB = vaults[b]?.sweepRisk ?? 0;
            return riskB - riskA;
          });

          let drewBackAny = false;

          for (const vaultId of sortedVaultIds) {
            const allocatedAmount = allocations[vaultId] ?? 0;
            if (allocatedAmount > 0) {
              allocations[vaultId] = 0;
              marginAccount.swfLiquidityBuffer = (marginAccount.swfLiquidityBuffer ?? 0) + allocatedAmount;
              drewBackAny = true;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Preemptive Drawback] Syndicate ${syndicateId} drew back ${allocatedAmount} gold from SWF vault ${vaultId} to prevent margin liquidation.`
              );

              // Recompute swfRehypothecationPremium and maintenanceRequirement
              let tempPremium = 0;
              for (const [vId, amt] of Object.entries(allocations)) {
                const vault = vaults[vId];
                if (vault && amt > 0) {
                  tempPremium += Math.round(amt * (0.10 + vault.sweepRisk));
                }
              }
              swfRehypothecationPremium = tempPremium;
              maintenanceRequirement = Math.round(
                (Math.round((0.20 * sumCdsNotional) + (0.10 * sumBorrowedAmount) + rehypothecationPremium) + swfCdsComponent + swfRehypoComponent + sumFuturesMaintenanceRequirement + sumVolMaintenanceRequirement + sumOptionsMaintenanceRequirement) * pendingScale
              );

              if (netEquity > triggerRatio * maintenanceRequirement) {
                break; // Safely avoided the danger zone!
              }
            }
          }

          if (drewBackAny) {
            marginAccount.swfVaultAllocations = allocations;
            marginAccount.timestamp = newState.step;
          }
        }
      }

      // Automated hedging reallocations (AF-158)
      if (newState.swfReinsuranceOptionsContracts) {
        for (const opt of Object.values(newState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
            const hedgingPolicy = newState.swfReinsuranceOptionHedgingPolicies?.[policyKey];

            if (stressPolicy && hedgingPolicy) {
              const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
              const avgVolatility = activeBonds.length > 0
                ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
                : 15.0;

              const stressVolatility = avgVolatility + stressPolicy.simulatedVolatilityShock;

              if (stressVolatility >= hedgingPolicy.hedgingActivationThreshold) {
                const reserve = newState.secondaryReserves?.[syndicateId];
                if (reserve && reserve.reserveGold > 0) {
                  const limit = hedgingPolicy.reserveReallocationLimit;
                  const toReallocate = Math.min(reserve.reserveGold, limit);
                  if (toReallocate > 0) {
                    newState.secondaryReserves = { ...newState.secondaryReserves };
                    newState.secondaryReserves[syndicateId] = {
                      ...reserve,
                      reserveGold: reserve.reserveGold - toReallocate,
                      timestamp: newState.step,
                    };

                    if (!newState.marginLiquidationInsurancePolicies) {
                      newState.marginLiquidationInsurancePolicies = {};
                    } else {
                      newState.marginLiquidationInsurancePolicies = { ...newState.marginLiquidationInsurancePolicies };
                    }
                    if (!newState.marginLiquidationInsurancePolicies[syndicateId]) {
                      newState.marginLiquidationInsurancePolicies[syndicateId] = {
                        syndicateId,
                        allocatedGold: 0,
                        timestamp: newState.step,
                      };
                    } else {
                      newState.marginLiquidationInsurancePolicies[syndicateId] = { ...newState.marginLiquidationInsurancePolicies[syndicateId] };
                    }
                    newState.marginLiquidationInsurancePolicies[syndicateId].allocatedGold += toReallocate;
                    newState.marginLiquidationInsurancePolicies[syndicateId].timestamp = newState.step;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Automated Hedging Reallocation] Syndicate ${syndicateId} reallocated ${toReallocate} gold from lower-yield secondary reserves to reinsurance insurance pool. Stress Volatility: ${stressVolatility.toFixed(2)}% >= Hedging Threshold: ${hedgingPolicy.hedgingActivationThreshold.toFixed(2)}% (Reallocation Limit: ${limit} gold).`
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Dynamic Delta Hedging & Automated Spot Rate Arbitrage Execution (AF-159)
      if (newState.swfReinsuranceOptionsContracts) {
        for (const [optId, opt] of Object.entries(newState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const deltaPolicy = newState.swfReinsuranceOptionDeltaHedgingPolicies?.[policyKey];
            const stressDeltaPolicy = newState.swfReinsuranceOptionStressTestDeltaHedgingPolicies?.[policyKey];

            if (deltaPolicy || stressDeltaPolicy) {
              const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
              let delta = 0.5;
              if (opt.optionType === "call") {
                delta = 1.0 / (1.0 + Math.exp(-(spotRate - opt.strikePremiumRate) * 50.0));
              } else {
                delta = 1.0 / (1.0 + Math.exp(-(opt.strikePremiumRate - spotRate) * 50.0));
              }

              let targetDelta = deltaPolicy ? deltaPolicy.targetDelta : 0.5;
              let tolerance = deltaPolicy ? deltaPolicy.rebalancingPriceTolerance : 0.05;

              // Stress-Test-Aware Delta Hedging & Capital Reallocation Optimization (AF-160)
              if (stressDeltaPolicy) {
                const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
                const avgVolatility = activeBonds.length > 0
                  ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
                  : 15.0;

                const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
                const stressVolatility = avgVolatility + (stressPolicy ? stressPolicy.simulatedVolatilityShock : 0.0);

                if (stressVolatility >= stressDeltaPolicy.stressVolatilityThreshold) {
                  targetDelta = stressDeltaPolicy.stressDeltaTarget;

                  // Perform capital reallocation
                  const limit = stressDeltaPolicy.safetyCapitalReallocationLimit;
                  let reallocatedAmount = 0;

                  // 1. Shift from capital insurance pool
                  if (newState.marginLiquidationInsurancePolicies?.[syndicateId]) {
                    const policy = newState.marginLiquidationInsurancePolicies[syndicateId];
                    if (policy.allocatedGold > 0) {
                      const shift = Math.min(policy.allocatedGold, limit - reallocatedAmount);
                      if (shift > 0) {
                        policy.allocatedGold -= shift;
                        policy.timestamp = newState.step;
                        reallocatedAmount += shift;
                      }
                    }
                  }

                  // 2. Shift from secondaryReserves
                  if (reallocatedAmount < limit && newState.secondaryReserves?.[syndicateId]) {
                    const reserve = newState.secondaryReserves[syndicateId];
                    if (reserve.reserveGold > 0) {
                      const shift = Math.min(reserve.reserveGold, limit - reallocatedAmount);
                      if (shift > 0) {
                        reserve.reserveGold -= shift;
                        reserve.timestamp = newState.step;
                        reallocatedAmount += shift;
                      }
                    }
                  }

                  // 3. Shift from secondaryReserveInvestments
                  if (reallocatedAmount < limit && newState.secondaryReserveInvestments?.[syndicateId]) {
                    const vaultInvestments = newState.secondaryReserveInvestments[syndicateId];
                    for (const [vaultId, investment] of Object.entries(vaultInvestments)) {
                      if (reallocatedAmount >= limit) break;
                      if (investment.investedGold > 0) {
                        const shift = Math.min(investment.investedGold, limit - reallocatedAmount);
                        if (shift > 0) {
                          investment.investedGold -= shift;
                          investment.timestamp = newState.step;
                          reallocatedAmount += shift;
                        }
                      }
                    }
                  }

                  if (reallocatedAmount > 0) {
                    const syndicate = newState.syndicates?.[syndicateId];
                    if (syndicate) {
                      syndicate.warChest = (syndicate.warChest ?? 0) + reallocatedAmount;
                    }
                    const marginAccount = newState.marginAccounts?.[syndicateId];
                    if (marginAccount) {
                      marginAccount.collateral = (marginAccount.collateral ?? 0) + reallocatedAmount;
                      marginAccount.timestamp = newState.step;
                    }

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Stress-Test-Aware Delta Hedging Reallocation] Syndicate ${syndicateId} reallocated ${reallocatedAmount} gold of safety capital from secondary vaults/insurance pools to warChest and margin collateral due to options delta portfolio volatility stress (Stress Volatility: ${stressVolatility.toFixed(2)}% >= Threshold: ${stressDeltaPolicy.stressVolatilityThreshold.toFixed(2)}%).`
                    );
                  }
                }
              }

              const targetHolding = Math.floor(delta * opt.size);
              const cdo = newState.swfYieldCDOs?.[opt.swfYieldCdoId];
              const tranche = cdo?.tranches?.[opt.trancheId];
              const currentHolding = tranche?.ownership?.[syndicateId] ?? 0;
              const difference = targetHolding - currentHolding;
              const sharePrice = Math.max(10, Math.floor(100.0 * (1.0 + spotRate)));
              const cost = difference * sharePrice;

              if (Math.abs(delta - targetDelta) > tolerance) {
                const targetHolding = Math.floor(delta * opt.size);
                
                // Ensure swfYieldCDOs exists and retrieve tranche
                if (newState.swfYieldCDOs && newState.swfYieldCDOs[opt.swfYieldCdoId]) {
                  const cdo = newState.swfYieldCDOs[opt.swfYieldCdoId];
                  const tranche = cdo.tranches[opt.trancheId];
                  
                  if (tranche) {
                    const currentHolding = tranche.ownership[syndicateId] ?? 0;
                    const difference = targetHolding - currentHolding;
                    const sharePrice = Math.max(10, Math.floor(100.0 * (1.0 + spotRate)));

                    if (difference > 0) {
                      // Buy deficit
                      const cost = difference * sharePrice;
                      const syndicate = newState.syndicates?.[syndicateId];
                      if (syndicate && (syndicate.warChest ?? 0) >= cost) {
                        syndicate.warChest = (syndicate.warChest ?? 0) - cost;
                        tranche.ownership[syndicateId] = currentHolding + difference;
                        
                        // Execute spot rate arbitrage profit
                        const arbitrageProfit = Math.floor(Math.abs(spotRate - opt.strikePremiumRate) * difference * 5);
                        if (arbitrageProfit > 0) {
                          syndicate.warChest = (syndicate.warChest ?? 0) + arbitrageProfit;
                        }

                        if (!newState.journal) newState.journal = [];
                        newState.journal.push(
                          `[Delta Hedging Rebalancing] Syndicate ${syndicateId} purchased ${difference} underlying CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} yield tokens at ${sharePrice} gold/share to hedge option ${optId} (Current Delta: ${delta.toFixed(2)} vs Target: ${targetDelta.toFixed(2)}). Arbitrage Profit: ${arbitrageProfit} gold.`
                        );
                      }
                    } else if (difference < 0) {
                      // Sell surplus
                      const sharesToSell = Math.min(-difference, currentHolding);
                      if (sharesToSell > 0) {
                        const revenue = sharesToSell * sharePrice;
                        const syndicate = newState.syndicates?.[syndicateId];
                        if (syndicate) {
                          syndicate.warChest = (syndicate.warChest ?? 0) + revenue;
                          tranche.ownership[syndicateId] = currentHolding - sharesToSell;

                          // Execute spot rate arbitrage profit
                          const arbitrageProfit = Math.floor(Math.abs(spotRate - opt.strikePremiumRate) * sharesToSell * 5);
                          if (arbitrageProfit > 0) {
                            syndicate.warChest = (syndicate.warChest ?? 0) + arbitrageProfit;
                          }

                          if (!newState.journal) newState.journal = [];
                          newState.journal.push(
                            `[Delta Hedging Rebalancing] Syndicate ${syndicateId} sold ${sharesToSell} underlying CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} yield tokens at ${sharePrice} gold/share to hedge option ${optId} (Current Delta: ${delta.toFixed(2)} vs Target: ${targetDelta.toFixed(2)}). Arbitrage Profit: ${arbitrageProfit} gold.`
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Dynamic Cross-Hedging (AF-161 & AF-162)
          const crossPolicyKey = `${syndicateId}_${opt.swfYieldCdoId}_${opt.trancheId}`;
          const multiCrossPolicy = newState.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios?.[crossPolicyKey];
          const crossPolicy = newState.swfReinsuranceOptionCrossHedgingPolicies?.[crossPolicyKey];

          // Stress-Test-Aware Delta-Cross Hedging & Capital Safeguard Allocations (AF-163)
          const stressCrossPolicy = newState.swfReinsuranceOptionStressTestDeltaCrossHedgingPolicies?.[crossPolicyKey];
          let hedgeMultiplier = 1.0;

          if (stressCrossPolicy) {
            const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
            const avgVolatility = activeBonds.length > 0
              ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
              : 15.0;

            const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[crossPolicyKey];
            const stressVolatility = avgVolatility + (stressPolicy ? stressPolicy.simulatedVolatilityShock : 0.0);

            if (stressVolatility >= stressCrossPolicy.stressVolatilityThreshold) {
              hedgeMultiplier = stressCrossPolicy.stressHedgeWeightMultiplier;

              // Perform automatic safeguard capital locking/shifting
              if (!newState.swfSafeguardCapitalReserves) {
                newState.swfSafeguardCapitalReserves = {};
              }
              if (!newState.swfSafeguardCapitalReserves[crossPolicyKey]) {
                newState.swfSafeguardCapitalReserves[crossPolicyKey] = {
                  syndicateId,
                  swfYieldCdoId: opt.swfYieldCdoId,
                  trancheId: opt.trancheId,
                  lockedGold: 0,
                  timestamp: newState.step,
                };
              }
              const safeguard = newState.swfSafeguardCapitalReserves[crossPolicyKey];
              const currentLocked = safeguard.lockedGold;
              const targetLocked = stressCrossPolicy.safeguardCapitalReserveLimit;

              if (currentLocked < targetLocked) {
                const needed = targetLocked - currentLocked;
                const syndicate = newState.syndicates?.[syndicateId];
                if (syndicate) {
                  const shiftAmount = Math.min(syndicate.warChest ?? 0, needed);
                  if (shiftAmount > 0) {
                    syndicate.warChest = (syndicate.warChest ?? 0) - shiftAmount;
                    safeguard.lockedGold += shiftAmount;
                    safeguard.timestamp = newState.step;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Capital Safeguard Lock] Syndicate ${syndicateId} locked ${shiftAmount} gold into safeguard capital reserve due to high volatility stress (Stress Volatility: ${stressVolatility.toFixed(2)}% >= Threshold: ${stressCrossPolicy.stressVolatilityThreshold.toFixed(2)}%, Safeguard Reserve: ${safeguard.lockedGold}/${targetLocked} gold).`
                    );
                  }
                }
              }
            } else {
              // Volatility is below threshold, automatically unlock/draw down safeguard capital reserve
              const safeguard = newState.swfSafeguardCapitalReserves?.[crossPolicyKey];
              if (safeguard && safeguard.lockedGold > 0) {
                const unlockAmount = safeguard.lockedGold;
                const syndicate = newState.syndicates?.[syndicateId];
                if (syndicate) {
                  syndicate.warChest = (syndicate.warChest ?? 0) + unlockAmount;
                  safeguard.lockedGold = 0;
                  safeguard.timestamp = newState.step;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[Capital Safeguard Unlock] Syndicate ${syndicateId} unlocked ${unlockAmount} gold from safeguard capital reserve back to warChest as volatility subsided (Stress Volatility: ${stressVolatility.toFixed(2)}% < Threshold: ${stressCrossPolicy.stressVolatilityThreshold.toFixed(2)}%).`
                  );
                }
              }
            }
          }

          if (multiCrossPolicy && multiCrossPolicy.assets && multiCrossPolicy.assets.length > 0) {
            const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
            let delta = 0.5;
            if (opt.optionType === "call") {
              delta = 1.0 / (1.0 + Math.exp(-(spotRate - opt.strikePremiumRate) * 50.0));
            } else {
              delta = 1.0 / (1.0 + Math.exp(-(opt.strikePremiumRate - spotRate) * 50.0));
            }

            for (const asset of multiCrossPolicy.assets) {
              const multipliedWeight = asset.hedgeWeight * hedgeMultiplier;
              const targetHolding = Math.floor(
                delta * opt.size * asset.correlationCoefficient * multipliedWeight
              );

              if (newState.swfYieldCDOs && newState.swfYieldCDOs[asset.correlatedAssetId]) {
                const corrCdo = newState.swfYieldCDOs[asset.correlatedAssetId];
                const corrTranche = corrCdo.tranches[asset.correlatedTrancheId];

                if (corrTranche) {
                  const currentHolding = corrTranche.ownership[syndicateId] ?? 0;
                  const difference = targetHolding - currentHolding;

                  const corrSpotRate = getCDOTrancheReinsurancePremiumRate(
                    newState,
                    asset.correlatedAssetId,
                    asset.correlatedTrancheId
                  );
                  const sharePrice = Math.max(10, Math.floor(100.0 * (1.0 + corrSpotRate)));

                  if (difference > 0) {
                    const cost = difference * sharePrice;
                    const syndicate = newState.syndicates?.[syndicateId];
                    if (syndicate && (syndicate.warChest ?? 0) >= cost) {
                      syndicate.warChest = (syndicate.warChest ?? 0) - cost;
                      corrTranche.ownership[syndicateId] = currentHolding + difference;

                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Multi-Asset Cross Hedging Rebalancing] Syndicate ${syndicateId} purchased ${difference} correlated CDO ${asset.correlatedAssetId} tranche ${asset.correlatedTrancheId} yield tokens at ${sharePrice} gold/share to cross-hedge option ${optId} on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} (Target Correlated: ${targetHolding} shares).`
                      );
                    }
                  } else if (difference < 0) {
                    const sharesToSell = Math.min(-difference, currentHolding);
                    if (sharesToSell > 0) {
                      const revenue = sharesToSell * sharePrice;
                      const syndicate = newState.syndicates?.[syndicateId];
                      if (syndicate) {
                        syndicate.warChest = (syndicate.warChest ?? 0) + revenue;
                        corrTranche.ownership[syndicateId] = currentHolding - sharesToSell;

                        if (!newState.journal) newState.journal = [];
                        newState.journal.push(
                          `[Multi-Asset Cross Hedging Rebalancing] Syndicate ${syndicateId} sold ${sharesToSell} correlated CDO ${asset.correlatedAssetId} tranche ${asset.correlatedTrancheId} yield tokens at ${sharePrice} gold/share to cross-hedge option ${optId} on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId}.`
                        );
                      }
                    }
                  }
                }
              }
            }
          } else if (crossPolicy) {
            const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
            let delta = 0.5;
            if (opt.optionType === "call") {
              delta = 1.0 / (1.0 + Math.exp(-(spotRate - opt.strikePremiumRate) * 50.0));
            } else {
              delta = 1.0 / (1.0 + Math.exp(-(opt.strikePremiumRate - spotRate) * 50.0));
            }

            // Compute target holding for correlated asset
            const targetHolding = Math.floor(
              delta * opt.size * crossPolicy.correlationCoefficient * crossPolicy.hedgeWeight
            );
            
            if (newState.swfYieldCDOs && newState.swfYieldCDOs[crossPolicy.correlatedAssetId]) {
              const corrCdo = newState.swfYieldCDOs[crossPolicy.correlatedAssetId];
              const corrTranche = corrCdo.tranches[crossPolicy.correlatedTrancheId];
              
              if (corrTranche) {
                const currentHolding = corrTranche.ownership[syndicateId] ?? 0;
                const difference = targetHolding - currentHolding;
                
                const corrSpotRate = getCDOTrancheReinsurancePremiumRate(
                  newState,
                  crossPolicy.correlatedAssetId,
                  crossPolicy.correlatedTrancheId
                );
                const sharePrice = Math.max(10, Math.floor(100.0 * (1.0 + corrSpotRate)));
                
                if (difference > 0) {
                  // Buy correlated asset deficit
                  const cost = difference * sharePrice;
                  const syndicate = newState.syndicates?.[syndicateId];
                  if (syndicate && (syndicate.warChest ?? 0) >= cost) {
                    syndicate.warChest = (syndicate.warChest ?? 0) - cost;
                    corrTranche.ownership[syndicateId] = currentHolding + difference;
                    
                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Cross Hedging Rebalancing] Syndicate ${syndicateId} purchased ${difference} correlated CDO ${crossPolicy.correlatedAssetId} tranche ${crossPolicy.correlatedTrancheId} yield tokens at ${sharePrice} gold/share to cross-hedge option ${optId} on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} (Target Correlated: ${targetHolding} shares).`
                    );
                  }
                } else if (difference < 0) {
                  // Sell correlated asset surplus
                  const sharesToSell = Math.min(-difference, currentHolding);
                  if (sharesToSell > 0) {
                    const revenue = sharesToSell * sharePrice;
                    const syndicate = newState.syndicates?.[syndicateId];
                    if (syndicate) {
                      syndicate.warChest = (syndicate.warChest ?? 0) + revenue;
                      corrTranche.ownership[syndicateId] = currentHolding - sharesToSell;
                      
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[Cross Hedging Rebalancing] Syndicate ${syndicateId} sold ${sharesToSell} correlated CDO ${crossPolicy.correlatedAssetId} tranche ${crossPolicy.correlatedTrancheId} yield tokens at ${sharePrice} gold/share to cross-hedge option ${optId} on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId}.`
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Automated liquidation insurance payback (AF-143)
      if (netEquity < maintenanceRequirement && newState.marginLiquidationInsurancePolicies?.[syndicateId]) {
        const policy = newState.marginLiquidationInsurancePolicies[syndicateId];
        if (policy.allocatedGold > 0) {
          const deficit = maintenanceRequirement - netEquity;
          const payback = Math.min(deficit, policy.allocatedGold);
          
          policy.allocatedGold -= payback;
          marginAccount.collateral += payback;
          netEquity += payback;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Margin Liquidation Insurance Payback] Covered ${payback} gold deficit from the liquidation insurance pool for Syndicate ${syndicateId} to prevent margin liquidation. Remaining pool: ${policy.allocatedGold} gold.`
          );
        }
      }

      // Secondary Reinsurance Option Vault instant withdrawal under margin calls (AF-171)
      const requiredDynamicBuffer = Math.round(aggregatePendingValue * 0.20);
      if ((netEquity < maintenanceRequirement || (aggregatePendingValue > 0 && (syndicate?.warChest ?? 0) < requiredDynamicBuffer)) && (marginAccount.swfReinsuranceOptionVault ?? 0) > 0) {
        let needed = 0;
        if (netEquity < maintenanceRequirement) {
          needed = maintenanceRequirement - netEquity;
        } else if (aggregatePendingValue > 0 && (syndicate?.warChest ?? 0) < requiredDynamicBuffer) {
          needed = requiredDynamicBuffer - (syndicate?.warChest ?? 0);
        }

        if (needed > 0) {
          const oldVaultVal = marginAccount.swfReinsuranceOptionVault ?? 0;
          const payback = Math.min(needed, oldVaultVal);
          marginAccount.swfReinsuranceOptionVault = oldVaultVal - payback;
          marginAccount.timestamp = newState.step;

          if (netEquity < maintenanceRequirement) {
            marginAccount.collateral = (marginAccount.collateral ?? 0) + payback;
            netEquity += payback;
            
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Reinsurance Option Vault Margin Deficit Payback] Withdrew ${payback} gold from secondary reinsurance option vault to margin collateral for Syndicate ${syndicateId} to prevent margin call liquidation (Vault remaining: ${marginAccount.swfReinsuranceOptionVault} gold).`
            );
          } else if (aggregatePendingValue > 0 && (syndicate?.warChest ?? 0) < requiredDynamicBuffer) {
            if (syndicate) {
              syndicate.warChest = (syndicate.warChest ?? 0) + payback;
            }
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Reinsurance Option Vault Buffer Deficit Payback] Withdrew ${payback} gold from secondary reinsurance option vault to war chest for Syndicate ${syndicateId} to maintain dynamic reserve buffer (Vault remaining: ${marginAccount.swfReinsuranceOptionVault} gold).`
            );
          }
        }
      }

      // Capital Safeguard Reserve Payback to prevent margin call liquidations (AF-163)
      if ((netEquity < maintenanceRequirement || (aggregatePendingValue > 0 && (syndicate?.warChest ?? 0) < requiredDynamicBuffer)) && newState.swfSafeguardCapitalReserves) {
        for (const [safeguardKey, safeguard] of Object.entries(newState.swfSafeguardCapitalReserves)) {
          if (safeguard.syndicateId === syndicateId && safeguard.lockedGold > 0) {
            let needed = 0;
            if (netEquity < maintenanceRequirement) {
              needed = maintenanceRequirement - netEquity;
            } else if (aggregatePendingValue > 0 && (syndicate?.warChest ?? 0) < requiredDynamicBuffer) {
              needed = requiredDynamicBuffer - (syndicate?.warChest ?? 0);
            }

            if (needed > 0) {
              const payback = Math.min(needed, safeguard.lockedGold);
              safeguard.lockedGold -= payback;
              safeguard.timestamp = newState.step;

              if (netEquity < maintenanceRequirement) {
                marginAccount.collateral = (marginAccount.collateral ?? 0) + payback;
                marginAccount.timestamp = newState.step;
                netEquity += payback;
                
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[Capital Safeguard Margin Deficit Payback] Shifted ${payback} gold from capital safeguard reserve to margin collateral for Syndicate ${syndicateId} to prevent margin call liquidation.`
                );
              } else {
                if (syndicate) {
                  syndicate.warChest = (syndicate.warChest ?? 0) + payback;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[Capital Safeguard War Chest Payback] Shifted ${payback} gold from capital safeguard reserve to war chest for Syndicate ${syndicateId} to prevent margin call due to order book dynamic buffer deficit.`
                  );
                }
              }
            }
          }
        }
      }

      // SWF Security Insurance Pool Emergency Drawdown to prevent margin call liquidations (AF-219)
      if (netEquity < maintenanceRequirement && newState.swfSecurityInsurancePoolAuthorized && newState.swfSecurityInsurancePoolEmergencyDrawdownAuthorized && (newState.swfSecurityInsurancePool ?? 0) > 0) {
        const needed = maintenanceRequirement - netEquity;
        if (needed > 0) {
          const drawdown = Math.min(needed, newState.swfSecurityInsurancePool ?? 0);
          newState.swfSecurityInsurancePool = (newState.swfSecurityInsurancePool ?? 0) - drawdown;
          marginAccount.collateral = (marginAccount.collateral ?? 0) + drawdown;
          marginAccount.timestamp = newState.step;
          netEquity += drawdown;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Security Insurance Pool Emergency Drawdown] Drew down ${drawdown} gold from security insurance pool to margin collateral for Syndicate ${syndicateId} to prevent margin call liquidation.`
          );

          // AF-220 & AF-221: Dynamic deflection fee surcharge policy
          marginAccount.emergencyDrawdownCount = (marginAccount.emergencyDrawdownCount ?? 0) + 1;
          const drawdownCount = marginAccount.emergencyDrawdownCount;
          const poolCap = newState.swfSecurityInsurancePoolCap ?? 2000;
          const poolCurrent = newState.swfSecurityInsurancePool ?? 0;
          const baseRate = newState.swfDeflectionSurchargeBaseRate ?? 0.05;
          const depthScaling = newState.swfDeflectionSurchargePoolDepthScalingFactor ?? 1.0;
          const poolDepthFactor = poolCap > 0 ? Math.max(1.0, 1.0 + depthScaling * (1.0 - (poolCurrent / poolCap))) : 1.0;
          let surchargeRate = baseRate * drawdownCount * poolDepthFactor;
          if (newState.swfDeflectionSurchargeCap !== undefined) {
            surchargeRate = Math.min(surchargeRate, newState.swfDeflectionSurchargeCap);
          }

          let appliedSubsidyDiscount = 0;
          let alliesWarChest = 0;
          if (newState.swfAllianceLiquiditySubsidyRate && newState.swfAllianceLiquiditySubsidyMinWealth) {
            const allies = Object.keys(newState.syndicates || {}).filter(otherId => {
              if (otherId === syndicateId) return false;
              return (
                newState.syndicateAlliances?.[syndicateId]?.[otherId] === "allied" ||
                newState.syndicateAlliances?.[otherId]?.[syndicateId] === "allied"
              );
            });
            alliesWarChest = allies.reduce((sum, allyId) => sum + (newState.syndicates?.[allyId]?.warChest ?? 0), 0);
            if (alliesWarChest >= newState.swfAllianceLiquiditySubsidyMinWealth) {
              const scalingFactor = Math.min(1.0, alliesWarChest / newState.swfAllianceLiquiditySubsidyMinWealth);
              appliedSubsidyDiscount = newState.swfAllianceLiquiditySubsidyRate * scalingFactor;
              surchargeRate = surchargeRate * (1.0 - appliedSubsidyDiscount);
            }
          }

          const partialWaiver = newState.cdsCdoPartialFeeWaivers?.[syndicateId] ?? 0;
          const deflectionFee = Math.round(drawdown * surchargeRate * (1 - partialWaiver));

          if (deflectionFee > 0 && syndicate) {
            let feeRemaining = deflectionFee;
            const chestDeduction = Math.min(syndicate.warChest ?? 0, feeRemaining);
            syndicate.warChest = (syndicate.warChest ?? 0) - chestDeduction;
            feeRemaining -= chestDeduction;

            let journalText = `[Security Insurance Pool Drawdown Fee] Charged deflection fee of ${deflectionFee} gold (Rate: ${(surchargeRate * 100).toFixed(1)}%, Count: ${drawdownCount}, Depth Factor: ${poolDepthFactor.toFixed(2)}). Deducted ${chestDeduction} gold from war chest of Syndicate ${syndicateId}.`;
            if (appliedSubsidyDiscount > 0) {
              journalText = `[Security Insurance Pool Drawdown Fee] Charged alliance-subsidized deflection fee of ${deflectionFee} gold (Rate: ${(surchargeRate * 100).toFixed(1)}%, Count: ${drawdownCount}, Depth Factor: ${poolDepthFactor.toFixed(2)}, Allied Wealth: ${alliesWarChest}, Subsidy: ${(appliedSubsidyDiscount * 100).toFixed(1)}% discount). Deducted ${chestDeduction} gold from war chest of Syndicate ${syndicateId}.`;
            }
            newState.journal.push(journalText);

            if (feeRemaining > 0) {
              newState.outstandingDeflectionFees = newState.outstandingDeflectionFees ? { ...newState.outstandingDeflectionFees } : {};
              newState.outstandingDeflectionFees[syndicateId] = (newState.outstandingDeflectionFees[syndicateId] ?? 0) + feeRemaining;

              if (newState.swfYieldCDOs) {
                for (const [cdoId, cdo] of Object.entries(newState.swfYieldCDOs)) {
                  if (feeRemaining <= 0) break;
                  for (const [trancheId, tranche] of Object.entries(cdo.tranches)) {
                    if (feeRemaining <= 0) break;
                    const ownership = tranche.ownership?.[syndicateId] ?? 0;
                    if (ownership > 0) {
                      const sharesToSlash = Math.min(ownership, Math.max(1, Math.round(feeRemaining / 10)));
                      if (sharesToSlash > 0) {
                        tranche.ownership[syndicateId] = ownership - sharesToSlash;
                        tranche.totalShares = Math.max(0, tranche.totalShares - sharesToSlash);
                        tranche.timestamp = newState.step;
                        cdo.timestamp = newState.step;

                        newState.swfYieldCDOs = {
                          ...newState.swfYieldCDOs,
                          [cdoId]: {
                            ...cdo,
                            tranches: {
                              ...cdo.tranches,
                              [trancheId]: { ...tranche }
                            }
                          }
                        };

                        newState.slashedCDOTrancheShares = newState.slashedCDOTrancheShares ? { ...newState.slashedCDOTrancheShares } : {};
                        if (!newState.slashedCDOTrancheShares[syndicateId]) {
                          newState.slashedCDOTrancheShares[syndicateId] = {};
                        }
                        newState.slashedCDOTrancheShares[syndicateId] = { ...newState.slashedCDOTrancheShares[syndicateId] };
                        if (!newState.slashedCDOTrancheShares[syndicateId][cdoId]) {
                          newState.slashedCDOTrancheShares[syndicateId][cdoId] = {};
                        }
                        newState.slashedCDOTrancheShares[syndicateId][cdoId] = { ...newState.slashedCDOTrancheShares[syndicateId][cdoId] };
                        const prevSlashed = newState.slashedCDOTrancheShares[syndicateId][cdoId][trancheId] ?? 0;
                        newState.slashedCDOTrancheShares[syndicateId][cdoId][trancheId] = prevSlashed + sharesToSlash;

                        feeRemaining -= sharesToSlash * 10;
                        newState.journal.push(
                          `[Security Insurance Pool Drawdown CDO Slash] Slashed ${sharesToSlash} shares from CDO ${cdoId} tranche ${trancheId} for Syndicate ${syndicateId} due to outstanding deflection fee.`
                        );
                      }
                    }
                  }
                }
              }
            }

            // AF-222: Strategic emergency refunding consensus policy
            const refundPercent = newState.swfDeflectionSurchargeEmergencyRefundAllocationPercent ?? 0;
            const rawRefund = Math.round(deflectionFee * (refundPercent / 100));
            if (rawRefund > 0) {
              const sweepPool = newState.swfStakingSweepPool ?? 0;
              const actualRefund = Math.min(rawRefund, sweepPool);
              if (actualRefund > 0) {
                syndicate.warChest = (syndicate.warChest ?? 0) + actualRefund;
                newState.swfStakingSweepPool = sweepPool - actualRefund;
                newState.journal.push(
                  `[Security Insurance Pool Drawdown Emergency Refund] Refunded ${actualRefund} gold (Percent: ${refundPercent}%) to Syndicate ${syndicateId} from SWF staking sweep pool (Remaining Sweep Pool: ${newState.swfStakingSweepPool} gold).`
                );
              }
            }
          }
        }
      }

      // Get the liquidation threshold and grace period parameters for the syndicate's written options (or use 1.0 if not defined/default)
      let minThreshold = 1.0;
      let gracePeriod = 0;
      let volThreshold = 0;
      let graceExtension = 0;
      if (newState.swfReinsuranceOptionsContracts) {
        for (const opt of Object.values(newState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
            if (policy) {
              minThreshold = Math.min(minThreshold, policy.liquidationThreshold);
              if (policy.marginCallGracePeriod !== undefined) {
                gracePeriod = Math.max(gracePeriod, policy.marginCallGracePeriod);
              }
              if (policy.gracePeriodVolatilityThreshold !== undefined) {
                volThreshold = Math.max(volThreshold, policy.gracePeriodVolatilityThreshold);
              }
              if (policy.gracePeriodExtension !== undefined) {
                graceExtension = Math.max(graceExtension, policy.gracePeriodExtension);
              }
            }
          }
        }
      }

      // Check for extreme volatility to dynamically scale grace period
      if (volThreshold > 0 && graceExtension > 0) {
        const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
        const avgVolatility = activeBonds.length > 0
          ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
          : 15.0;
        if (avgVolatility >= volThreshold) {
          gracePeriod += graceExtension;
        }
      }

      // If netEquity < maintenanceRequirement * minThreshold or warChest drops below required dynamic buffer, trigger a MARGIN CALL!
      const currentWarChest = syndicate?.warChest ?? 0;
      const triggerDueToDynamicBuffer = aggregatePendingValue > 0 && currentWarChest < requiredDynamicBuffer;
      const triggerDueToMarginDeficit = netEquity < maintenanceRequirement * minThreshold;

      if (triggerDueToMarginDeficit || triggerDueToDynamicBuffer) {
        if (gracePeriod > 0) {
          if (marginAccount.marginCallStartStep === undefined) {
            marginAccount.marginCallStartStep = newState.step;
            marginAccount.timestamp = newState.step;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Margin Call Warning] Syndicate ${syndicateId} margin balance fell below threshold! Entered margin call grace period. Start step: ${newState.step}, Duration: ${gracePeriod} steps.`
            );
          }

          const elapsed = newState.step - marginAccount.marginCallStartStep;
          if (elapsed < gracePeriod) {
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Margin Call Deferred] Syndicate ${syndicateId} is in margin call (elapsed: ${elapsed} steps), but liquidation is deferred due to active grace period (Total Grace steps: ${gracePeriod}, Start step: ${marginAccount.marginCallStartStep}).`
            );
            continue; // DEFER LIQUIDATION AUDIT!
          } else {
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Margin Grace Period Expired] Syndicate ${syndicateId} margin call grace period expired after ${elapsed} steps. Triggering automatic liquidation.`
            );
          }
        }

        if (triggerDueToDynamicBuffer) {
          newState.journal.push(`[Margin Call] Syndicate ${syndicateId} war chest (${currentWarChest} gold) fell below required dynamic buffer of ${requiredDynamicBuffer} gold (20% of aggregate pending SWF options limit order book value ${aggregatePendingValue} gold). Triggering automatic liquidation.`);
        } else {
          newState.journal.push(`[Margin Call] Syndicate ${syndicateId} margin balance fell below maintenance threshold! Net Equity: ${netEquity}, Required: ${maintenanceRequirement} (Threshold Mult: ${minThreshold.toFixed(4)}). Triggering automatic liquidation.`);
        }

        // Deactivate all leveraged written CDS contracts
        if (newState.creditDefaultSwaps) {
          newState.creditDefaultSwaps = { ...newState.creditDefaultSwaps };
          for (const cdsId of stillActiveCDSIds) {
            const cds = newState.creditDefaultSwaps[cdsId];
            if (cds) {
              newState.creditDefaultSwaps[cdsId] = {
                ...cds,
                active: false,
                timestamp: newState.step,
              };
              newState.journal.push(`[Margin Liquidation] Leveraged written CDS ${cdsId} has been deactivated.`);
            }
          }
        }
        marginAccount.leveragedCDSIds = [];

        // Deactivate all leveraged written SWF Yield CDO CDS contracts
        if (newState.swfYieldCDOCDSs) {
          newState.swfYieldCDOCDSs = { ...newState.swfYieldCDOCDSs };
          for (const cdsId of stillActiveSwfCDSIds) {
            const cds = newState.swfYieldCDOCDSs[cdsId];
            if (cds) {
              newState.swfYieldCDOCDSs[cdsId] = {
                ...cds,
                active: false,
                timestamp: newState.step,
              };
              newState.journal.push(`[Margin Liquidation] Leveraged written SWF Yield CDO CDS ${cdsId} has been deactivated.`);
            }
          }
        }
        marginAccount.leveragedSWFYieldCDOCDSIds = [];

        // Liquidate all leveraged CDO tranche positions
        if (newState.cdos) {
          newState.cdos = { ...newState.cdos };
          for (const [posKey, pos] of Object.entries(leveragedTranches)) {
            const cdo = newState.cdos[pos.cdoId];
            if (cdo) {
              const tranche = cdo.tranches[pos.trancheId];
              if (tranche) {
                const currentStakeValue = tranche.ownership[syndicateId] ?? 0;

                const updatedTranche = {
                  ...tranche,
                  ownership: {
                    ...tranche.ownership,
                    [syndicateId]: 0,
                  },
                  timestamp: newState.step,
                };

                newState.cdos[pos.cdoId] = {
                  ...cdo,
                  tranches: {
                    ...cdo.tranches,
                    [pos.trancheId]: updatedTranche,
                  },
                  timestamp: newState.step,
                };

                newState.journal.push(`[Margin Liquidation] Leveraged CDO ${pos.cdoId} tranche ${pos.trancheId} ownership (stake: ${currentStakeValue}) zeroed out.`);
              }
            }
          }
        }

        // Deactivate all active futures positions
        if (newState.sovereignBondFuturesPositions) {
          newState.sovereignBondFuturesPositions = { ...newState.sovereignBondFuturesPositions };
          for (const posId of Object.keys(newState.sovereignBondFuturesPositions)) {
            const pos = newState.sovereignBondFuturesPositions[posId];
            if (pos && pos.active && pos.syndicateId === syndicateId) {
              newState.sovereignBondFuturesPositions[posId] = {
                ...pos,
                active: false,
                timestamp: newState.step,
              };
              newState.journal.push(`[Margin Liquidation] Leveraged futures position ${posId} has been deactivated.`);
            }
          }
        }

        // Deactivate and penalize all written option contracts of this syndicate (AF-156/AF-170)
        if (newState.swfReinsuranceOptionsContracts) {
          newState.swfReinsuranceOptionsContracts = { ...newState.swfReinsuranceOptionsContracts };
          newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};
          for (const [optId, opt] of Object.entries(newState.swfReinsuranceOptionsContracts)) {
            if (opt && opt.active && opt.writerSyndicateId === syndicateId) {
              const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
              const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
              const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
              const pRate = policy ? policy.penaltyRate : 0.15;

              // Calculate linkStateDropRate for this specific option
              let poolLinkStateDropRate = 0.0;
              if (newState.swfMultiFundReinsurancePools) {
                const cdo = newState.swfYieldCDOs?.[opt.swfYieldCdoId];
                const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
                for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                  if (pool.linkStateDropRate !== undefined) {
                    if (creatorSyndicateId && pool.syndicateIds.includes(creatorSyndicateId)) {
                      poolLinkStateDropRate = Math.max(poolLinkStateDropRate, pool.linkStateDropRate);
                    }
                  }
                }
              }
              let optLinkStateDropRate = poolLinkStateDropRate;
              if (optLinkStateDropRate === 0.0 && newState.swfMultiFundReinsurancePools) {
                for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
                  if (pool.linkStateDropRate !== undefined) {
                    optLinkStateDropRate = Math.max(optLinkStateDropRate, pool.linkStateDropRate);
                  }
                }
              }

              let effectiveSize = opt.size;
              const autoDeleveragingThreshold = policy?.autoDeleveragingThreshold ?? 0.3;
              const marginDeflectionFactor = policy?.marginDeflectionFactor ?? 0.5;

              const prunedThreshold = policy?.prunedRoutesRiskThreshold;
              const prunedCount = marginAccount?.prunedRoutesCount ?? 0;

              if (optLinkStateDropRate >= autoDeleveragingThreshold || (prunedThreshold !== undefined && prunedCount >= prunedThreshold)) {
                effectiveSize = Math.round(opt.size * (1.0 - marginDeflectionFactor));
              }

              // Check for authorized penalty waiver (AF-188)
              let isPenaltyWaived = false;
              if (newState.swfReinsuranceOptionPenaltyWaiverProposals) {
                for (const prop of Object.values(newState.swfReinsuranceOptionPenaltyWaiverProposals)) {
                  if (
                    prop.syndicateId === syndicateId &&
                    prop.swfYieldCdoId === opt.swfYieldCdoId &&
                    prop.trancheId === opt.trancheId &&
                    prop.status === "authorized" &&
                    prop.waivePenalty
                  ) {
                    isPenaltyWaived = true;
                    break;
                  }
                }
              }

              // Check for authorized penalty refund (AF-189)
              let isPenaltyRefundActive = false;
              if (newState.swfReinsuranceOptionPenaltyRefundProposals) {
                for (const prop of Object.values(newState.swfReinsuranceOptionPenaltyRefundProposals)) {
                  if (
                    prop.syndicateId === syndicateId &&
                    prop.swfYieldCdoId === opt.swfYieldCdoId &&
                    prop.trancheId === opt.trancheId &&
                    prop.status === "authorized" &&
                    prop.refundPenalty
                  ) {
                    isPenaltyRefundActive = true;
                    break;
                  }
                }
              }

              const penalty = isPenaltyWaived ? 0 : Math.floor(effectiveSize * spotRate * pRate * 100);

              // Charge writer's collateral
              netEquity -= penalty;

              // Pay option holder or refund pro-rata
              if (isPenaltyRefundActive && penalty > 0) {
                const contributions = newState.swfReinsuranceOptionPremiumContributions || {};
                let totalContributions = 0;
                for (const amt of Object.values(contributions)) {
                  totalContributions += amt;
                }

                if (totalContributions > 0) {
                  for (const [syndId, amt] of Object.entries(contributions)) {
                    const refundShare = Math.floor(penalty * (amt / totalContributions));
                    if (refundShare > 0) {
                      const synd = newState.syndicates[syndId];
                      if (synd) {
                        synd.warChest = (synd.warChest ?? 0) + refundShare;
                      }
                      newState.journal.push(`[Option Penalty Refund] Distributed refund of ${refundShare} gold to Syndicate ${syndId} (premium contribution share: ${(amt / totalContributions * 100).toFixed(1)}%).`);
                    }
                  }
                } else {
                  // Fallback: pay option holder
                  if (opt.syndicateId !== "market_maker") {
                    const holder = newState.syndicates[opt.syndicateId];
                    if (holder) {
                      holder.warChest = (holder.warChest ?? 0) + penalty;
                    }
                  }
                }
              } else {
                // Normal flow: pay option holder
                if (opt.syndicateId !== "market_maker" && penalty > 0) {
                  const holder = newState.syndicates[opt.syndicateId];
                  if (holder) {
                    holder.warChest = (holder.warChest ?? 0) + penalty;
                  }
                }
              }

              newState.swfReinsuranceOptionsContracts[optId] = {
                ...opt,
                active: false,
                timestamp: newState.step,
              };

              if (isPenaltyWaived) {
                newState.journal.push(`[Option Liquidation] Written option contract ${optId} of Syndicate ${syndicateId} has been liquidated. Penalty WAIVED due to authorized penalty waiver.`);
              } else if (isPenaltyRefundActive) {
                newState.journal.push(`[Option Liquidation] Written option contract ${optId} of Syndicate ${syndicateId} has been liquidated. Penalty of ${penalty} gold REFUNDED pro-rata to participating syndicates.`);
              } else {
                newState.journal.push(`[Option Liquidation] Written option contract ${optId} of Syndicate ${syndicateId} has been liquidated. Charge penalty of ${penalty} gold paid to Syndicate ${opt.syndicateId}.`);
              }
            }
          }
        }

        let finalCollateral = netEquity;
        const syndicate = newState.syndicates?.[syndicateId];
        if (syndicate) {
          newState.syndicates = { ...newState.syndicates };
          if (finalCollateral > 0) {
            newState.syndicates[syndicateId] = {
              ...syndicate,
              warChest: (syndicate.warChest ?? 0) + finalCollateral,
            };
            newState.journal.push(`[Margin Liquidation] Returned excess collateral of ${finalCollateral} gold to Syndicate ${syndicateId} war chest.`);
            finalCollateral = 0;
          } else if (finalCollateral < 0) {
            const deficit = -finalCollateral;
            const warChest = syndicate.warChest ?? 0;
            const swept = Math.min(deficit, warChest);
            newState.syndicates[syndicateId] = {
              ...syndicate,
              warChest: warChest - swept,
            };
            newState.journal.push(`[Margin Liquidation] Swept ${swept} gold from Syndicate ${syndicateId} war chest to cover margin deficit of ${deficit} gold.`);
            finalCollateral = finalCollateral + swept;
          }
        }

        newState.marginAccounts[syndicateId] = {
          ...marginAccount,
          collateral: Math.max(0, finalCollateral),
          leveragedTranchePositions: {},
          timestamp: newState.step,
        };
      } else {
        if (marginAccount.marginCallStartStep !== undefined) {
          marginAccount.marginCallStartStep = undefined;
          marginAccount.timestamp = newState.step;
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Margin Call Recovered] Syndicate ${syndicateId} has recovered from margin call. Grace period cleared.`
          );
        }
      }
    }
  }

  // Periodic Multi-Faction CDO Reinsurance Audit Collections (AF-122)
  if (newState.factionCdoInsurancePools && newState.multiFactionCdoRiskRatings) {
    newState.factionCdoInsurancePools = { ...newState.factionCdoInsurancePools };
    for (const [poolKey, pool] of Object.entries(newState.factionCdoInsurancePools)) {
      const policy = newState.multiFactionCdoRiskRatings[poolKey];
      if (policy && policy.active) {
        const { syndicateId, cdoId, factionId } = pool;
        const syndicate = newState.syndicates?.[syndicateId];
        if (syndicate) {
          const loyaltyRank = getSyndicateFactionLoyaltyRank(newState, syndicateId, factionId);
          const isCompliantRank = isRankAtLeast(loyaltyRank, pool.minLoyaltyRank);
          const isReserveSafe = pool.insuranceReserve >= 200;

          if (!isCompliantRank || !isReserveSafe) {
            // Multi-Faction Reinsurance Audit Violation!
            // Faction Loyalty Rank provides audit mitigation:
            let auditFee = 100;
            if (loyaltyRank === "Platinum") {
              auditFee = 0; // Fully waived!
            } else if (loyaltyRank === "Gold") {
              auditFee = 20; // 80% discount
            } else if (loyaltyRank === "Silver") {
              auditFee = 50; // 50% discount
            } else if (loyaltyRank === "Bronze") {
              auditFee = 80; // 20% discount
            }

            if (auditFee > 0) {
              newState.syndicates = { ...newState.syndicates };
              const updatedSyndicate = { ...syndicate };
              const actualCollected = Math.min(auditFee, updatedSyndicate.warChest ?? 0);
              updatedSyndicate.warChest = Math.max(0, (updatedSyndicate.warChest ?? 0) - actualCollected);
              newState.syndicates[syndicateId] = updatedSyndicate;

              if (!newState.factionReservePools) newState.factionReservePools = {};
              newState.factionReservePools = { ...newState.factionReservePools };
              newState.factionReservePools[factionId] = (newState.factionReservePools[factionId] ?? 0) + actualCollected;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Automated Reinsurance Audit Collection] Audit violation detected for CDO ${cdoId} insurance pool ${poolKey} (Compliant Rank: ${isCompliantRank}, Safe Reserve: ${isReserveSafe}). Collected ${actualCollected} gold audit fee from syndicate ${syndicateId} war chest (Loyalty: ${loyaltyRank}).`
              );

              if (actualCollected < auditFee) {
                // Add heat and dock credit rating if they can't pay the audit fee
                if (!newState.creditRatings) newState.creditRatings = {};
                newState.creditRatings = { ...newState.creditRatings };
                const r = newState.creditRatings[syndicateId] ?? 100;
                newState.creditRatings[syndicateId] = Math.max(0, r - 15);
                newState.journal.push(`[Audit Penalty] Syndicate ${syndicateId} failed to pay full audit fee; credit rating docked by 15.`);
              }
            } else {
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Automated Reinsurance Audit Collection] Audit violation detected for CDO ${cdoId} but fee was fully waived due to Platinum Faction Loyalty.`
              );
            }
          }
        }
      }
    }
  }

  // Automated stabilization checks in tickEconomy (AF-126)
  if (newState.antiDeficitStabilizationPolicies) {
    newState.antiDeficitStabilizationPolicies = { ...newState.antiDeficitStabilizationPolicies };
    newState.liquidityPoolAudits = newState.liquidityPoolAudits ? { ...newState.liquidityPoolAudits } : {};
    newState.factionReservePools = newState.factionReservePools ? { ...newState.factionReservePools } : {};
    newState.jointLoanInsurancePools = newState.jointLoanInsurancePools ? { ...newState.jointLoanInsurancePools } : {};

    for (const [syndicateId, policy] of Object.entries(newState.antiDeficitStabilizationPolicies)) {
      if (!policy.active || policy.factionId === "unaligned") continue;

      const pool = newState.jointLoanInsurancePools[syndicateId];
      const poolGold = pool ? pool.poolGold : 0;
      const margin = policy.consensualDeficitMargin;

      if (poolGold < margin) {
        // Automatically trigger mutual faction stabilization injection!
        const factionId = policy.factionId;
        const factionReserves = newState.factionReservePools[factionId] ?? 10000;
        const targetInjection = policy.stabilizationInjectionAmount;
        const actualInjection = Math.min(factionReserves, targetInjection);

        if (actualInjection > 0) {
          newState.factionReservePools[factionId] = factionReserves - actualInjection;
          if (!pool) {
            newState.jointLoanInsurancePools[syndicateId] = {
              syndicateId,
              poolGold: actualInjection,
              premiumRate: 10,
              timestamp: Date.now(),
            };
          } else {
            pool.poolGold += actualInjection;
          }

          const auditId = `${syndicateId}:tick:${newState.step}`;
          const deficit = margin - poolGold;
          newState.liquidityPoolAudits[auditId] = {
            auditId,
            syndicateId,
            auditedGold: poolGold,
            deficitAmount: deficit,
            status: "Stabilized",
            timestamp: Date.now(),
          };

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Anti-Deficit Stabilization] Automated stabilization triggered for syndicate ${syndicateId} using faction ${factionId} reserves. Injected ${actualInjection} gold (Pool gold went from ${poolGold} to ${(pool?.poolGold ?? actualInjection)}).`
          );
        }
      }
    }
  }

  // Periodic Cross-Mesh Bridge Loan Ticking & Repayments (AF-127)
  if (newState.crossMeshBridgeLoans) {
    newState.crossMeshBridgeLoans = { ...newState.crossMeshBridgeLoans };
    newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};
    
    for (const [loanId, loan] of Object.entries(newState.crossMeshBridgeLoans)) {
      if (loan.status === "Active") {
        const borrower = newState.syndicates[loan.borrowerSyndicateId];
        const lender = newState.syndicates[loan.lenderSyndicateId];
        
        if (!borrower || !lender) continue;

        // 1. Accrue loan interest
        const interest = Math.floor(loan.principal * (loan.interestRate / 100));
        let updatedLoan = {
          ...loan,
          remainingRepayment: loan.remainingRepayment + interest,
          timestamp: newState.step,
        };

        // 2. Automatic reserve repayment from borrower warChest to lender warChest
        const borrowerGold = borrower.warChest ?? 0;
        if (borrowerGold > 0 && updatedLoan.remainingRepayment > 0) {
          const payment = Math.min(borrowerGold, updatedLoan.remainingRepayment);
          borrower.warChest = borrowerGold - payment;
          lender.warChest = (lender.warChest ?? 0) + payment;
          updatedLoan.remainingRepayment -= payment;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Bridge Repayment] Borrower Syndicate ${loan.borrowerSyndicateId} automatically paid ${payment} gold back to Lender Syndicate ${loan.lenderSyndicateId} from its warChest for bridge loan ${loanId}. Remaining due: ${updatedLoan.remainingRepayment}.`
          );
        }

        // 3. Check repayment status
        if (updatedLoan.remainingRepayment <= 0) {
          updatedLoan.status = "Repaid";
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Bridge Repaid] Bridge loan ${loanId} has been fully repaid by Syndicate ${loan.borrowerSyndicateId} to Syndicate ${loan.lenderSyndicateId}.`
          );
        } else {
          let factionGraceExtension = 0;
          const borrowerSyndicateId = loan.borrowerSyndicateId;
          const mAcc = newState.marginAccounts?.[borrowerSyndicateId];
          if (mAcc && mAcc.swfGracePeriodExtensions) {
            for (const steps of Object.values(mAcc.swfGracePeriodExtensions)) {
              factionGraceExtension += steps;
            }
          }
          if (newState.step > updatedLoan.dueStep + factionGraceExtension) {
            // Default!
            updatedLoan.status = "Defaulted";
            // Dominance penalty
            borrower.dominance = Math.max(0, (borrower.dominance ?? 0) - 10);
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Bridge Defaulted] Bridge loan ${loanId} went into default as Borrower Syndicate ${loan.borrowerSyndicateId} failed to repay the remaining ${updatedLoan.remainingRepayment} gold by step ${updatedLoan.dueStep}! Borrower dominance reduced by 10.`
            );
          }
        }

        newState.crossMeshBridgeLoans[loanId] = updatedLoan;
      }
    }
  }

  // AF-142: Automated Sovereign Bond Arbitrage Routing and Reallocation
  if (newState.marginAccounts && newState.sovereignBondLendingPools && Object.keys(newState.sovereignBondLendingPools).length > 0) {
    const updatedPools = { ...newState.sovereignBondLendingPools };
    let poolsChanged = false;

    for (const [syndicateId, marginAccount] of Object.entries(newState.marginAccounts)) {
      if (marginAccount.swfBondArbitrageEnabled && marginAccount.swfBondArbitrageTargetPools && marginAccount.swfBondArbitrageTargetPools.length > 0) {
        const targetPoolIds = marginAccount.swfBondArbitrageTargetPools;

        // Find valid active target pools
        const activeTargetPools = targetPoolIds
          .map(id => updatedPools[id])
          .filter(p => p !== undefined);

        if (activeTargetPools.length === 0) continue;

        // Group pools by their underlying bondId
        const poolsByBond: Record<string, any[]> = {};
        for (const pool of activeTargetPools) {
          if (!poolsByBond[pool.bondId]) {
            poolsByBond[pool.bondId] = [];
          }
          poolsByBond[pool.bondId].push(pool);
        }

        for (const [bondId, pools] of Object.entries(poolsByBond)) {
          if (pools.length < 1) continue;

          // Find the best pool (highest borrowFeeRate)
          let bestPool = pools[0];
          for (const pool of pools) {
            if (pool.borrowFeeRate > bestPool.borrowFeeRate) {
              bestPool = pool;
            }
          }

          // 1. Reallocate between pools (worst pool -> best pool)
          if (pools.length > 1) {
            // Find the worst pool (lowest borrowFeeRate) where the syndicate has non-zero deposits
            let worstPool: any = undefined;
            for (const pool of pools) {
              if (pool.id === bestPool.id) continue;
              const dep = pool.deposits[syndicateId] ?? 0;
              if (dep > 0) {
                if (!worstPool || pool.borrowFeeRate < worstPool.borrowFeeRate) {
                  worstPool = pool;
                }
              }
            }

            if (worstPool) {
              const spread = bestPool.borrowFeeRate - worstPool.borrowFeeRate;
              const minSpread = marginAccount.swfBondArbitrageMinYieldSpread ?? 0.0;

              if (spread >= minSpread) {
                const worstPoolUnborrowed = worstPool.totalDeposited - worstPool.totalBorrowed;
                const maxMoveFromWorst = Math.min(worstPool.deposits[syndicateId] ?? 0, worstPoolUnborrowed);
                const limit = marginAccount.swfBondArbitrageMaxCapital ?? 999999;
                const amountToMove = Math.min(maxMoveFromWorst, limit);

                if (amountToMove > 0) {
                  // Perform reallocation
                  worstPool.deposits[syndicateId] = (worstPool.deposits[syndicateId] ?? 0) - amountToMove;
                  if (worstPool.deposits[syndicateId] === 0) {
                    delete worstPool.deposits[syndicateId];
                  }
                  worstPool.totalDeposited -= amountToMove;

                  bestPool.deposits[syndicateId] = (bestPool.deposits[syndicateId] ?? 0) + amountToMove;
                  bestPool.totalDeposited += amountToMove;

                  // Update dynamic rates
                  const worstU = worstPool.totalDeposited > 0 ? worstPool.totalBorrowed / worstPool.totalDeposited : 0;
                  worstPool.borrowFeeRate = 5 + 10 * worstU;

                  const bestU = bestPool.totalDeposited > 0 ? bestPool.totalBorrowed / bestPool.totalDeposited : 0;
                  bestPool.borrowFeeRate = 5 + 10 * bestU;

                  // Update underlying bond contributions
                  const bond = newState.cooperativeSovereigntyBondProposals?.[bondId];
                  if (bond && bond.contributions) {
                    const worstPoolKey = `pool_${worstPool.id}`;
                    const bestPoolKey = `pool_${bestPool.id}`;

                    bond.contributions[worstPoolKey] = (bond.contributions[worstPoolKey] ?? 0) - amountToMove;
                    if (bond.contributions[worstPoolKey] === 0) {
                      delete bond.contributions[worstPoolKey];
                    }
                    bond.contributions[bestPoolKey] = (bond.contributions[bestPoolKey] ?? 0) + amountToMove;
                  }

                  poolsChanged = true;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[SWF Bond Arbitrage Reallocation] Routed ${amountToMove} bond shares from pool ${worstPool.id} (yield: ${worstPool.borrowFeeRate.toFixed(2)}%) to pool ${bestPool.id} (yield: ${bestPool.borrowFeeRate.toFixed(2)}%) for Syndicate ${syndicateId} (Spread: ${spread.toFixed(2)}%).`
                  );
                }
              }
            }
          }

          // 2. Deploy fresh capital (direct bond holdings -> best pool)
          const bond = newState.cooperativeSovereigntyBondProposals?.[bondId];
          if (bond && bond.contributions && bond.contributions[syndicateId] && bond.contributions[syndicateId] > 0) {
            const freshCapital = bond.contributions[syndicateId];
            const limit = marginAccount.swfBondArbitrageMaxCapital ?? 999999;
            const amountToDeploy = Math.min(freshCapital, limit);

            if (amountToDeploy > 0) {
              // Perform fresh deployment
              bestPool.deposits[syndicateId] = (bestPool.deposits[syndicateId] ?? 0) + amountToDeploy;
              bestPool.totalDeposited += amountToDeploy;

              const bestU = bestPool.totalDeposited > 0 ? bestPool.totalBorrowed / bestPool.totalDeposited : 0;
              bestPool.borrowFeeRate = 5 + 10 * bestU;

              bond.contributions[syndicateId] -= amountToDeploy;
              if (bond.contributions[syndicateId] === 0) {
                delete bond.contributions[syndicateId];
              }

              const bestPoolKey = `pool_${bestPool.id}`;
              bond.contributions[bestPoolKey] = (bond.contributions[bestPoolKey] ?? 0) + amountToDeploy;

              poolsChanged = true;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[SWF Bond Arbitrage Fresh Deployment] Deployed ${amountToDeploy} fresh bond shares into pool ${bestPool.id} (yield: ${bestPool.borrowFeeRate.toFixed(2)}%) for Syndicate ${syndicateId}.`
              );
            }
          }
        }
      }

      if (poolsChanged) {
        newState.sovereignBondLendingPools = updatedPools;
      }
    }
  }

  // Periodic SWF Yield CDO Tranche Reinsurance Premium Deductions (AF-145)
  if (newState.swfYieldCDOTrancheReinsurancePolicies && Object.keys(newState.swfYieldCDOTrancheReinsurancePolicies).length > 0) {
    newState.swfYieldCDOTrancheReinsurancePolicies = { ...newState.swfYieldCDOTrancheReinsurancePolicies };
    for (const [policyId, policy] of Object.entries(newState.swfYieldCDOTrancheReinsurancePolicies)) {
      if (policy.active) {
        const updatedPolicy = { ...policy };
        
        // Dynamic Premium Adjustments (AF-147)
        let rateToUse = updatedPolicy.premiumRate;
        const activeFutures = Object.values(newState.swfReinsuranceFuturesContracts || {}).find(
          f => f.active && f.syndicateId === updatedPolicy.syndicateId && f.swfYieldCdoId === updatedPolicy.swfYieldCdoId && f.trancheId === updatedPolicy.trancheId && f.side === "long"
        );
        if (activeFutures) {
          rateToUse = activeFutures.lockPremiumRate;
        } else if (newState.volatilityHedgedPremiumPolicies?.[updatedPolicy.swfYieldCdoId]) {
          rateToUse = getCDOTrancheReinsurancePremiumRate(newState, updatedPolicy.swfYieldCdoId, updatedPolicy.trancheId);
          updatedPolicy.premiumRate = rateToUse; // update policy rate
        }

        // SWF Reinsurance Options rate hedging (AF-148)
        const activeOption = Object.values(newState.swfReinsuranceOptionsContracts || {}).find(
          o => o.active && o.syndicateId === updatedPolicy.syndicateId && o.swfYieldCdoId === updatedPolicy.swfYieldCdoId && o.trancheId === updatedPolicy.trancheId && o.optionType === "call"
        );
        if (activeOption) {
          rateToUse = Math.min(rateToUse, activeOption.strikePremiumRate);
        }

        const premium = Math.max(1, Math.floor(updatedPolicy.coverageAmount * rateToUse));
        if (!newState.syndicates) newState.syndicates = {};
        const syndicate = newState.syndicates[updatedPolicy.syndicateId];
        if (syndicate) {
          const actualPaid = Math.min(premium, syndicate.warChest ?? 0);
          
          newState.syndicates[updatedPolicy.syndicateId] = {
            ...syndicate,
            warChest: Math.max(0, (syndicate.warChest ?? 0) - actualPaid),
          };

          if (!newState.journal) newState.journal = [];
          newState.journal.push(`[SWF Reinsurance Premium] Syndicate ${updatedPolicy.syndicateId} paid ${actualPaid} gold premium to global market for SWF Reinsurance policy ${policyId}.`);
          
          if (actualPaid < premium) {
            updatedPolicy.active = false;
            newState.journal.push(`[SWF Reinsurance Terminated] Reinsurance policy ${policyId} terminated due to insufficient premium payment from Syndicate ${updatedPolicy.syndicateId}.`);
          }
          updatedPolicy.timestamp = newState.step;
          newState.swfYieldCDOTrancheReinsurancePolicies[policyId] = updatedPolicy;
        }
      }
    }
  }

  // Auto-settlement of SWF Reinsurance Futures on epoch boundaries (AF-147)
  if (newState.step % 5 === 0 && newState.swfReinsuranceFuturesContracts && Object.keys(newState.swfReinsuranceFuturesContracts).length > 0) {
    newState.swfReinsuranceFuturesContracts = { ...newState.swfReinsuranceFuturesContracts };
    newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};
    
    for (const [futId, fut] of Object.entries(newState.swfReinsuranceFuturesContracts)) {
      if (fut.active) {
        const spotRate = getCDOTrancheReinsurancePremiumRate(newState, fut.swfYieldCdoId, fut.trancheId);
        const diff = spotRate - fut.lockPremiumRate;
        const profit = Math.floor((fut.side === "long" ? 1 : -1) * diff * fut.size * 100);
        
        const syndicate = newState.syndicates[fut.syndicateId];
        if (syndicate) {
          const netGold = fut.marginCollateral + profit;
          newState.syndicates[fut.syndicateId] = {
            ...syndicate,
            warChest: Math.max(0, (syndicate.warChest ?? 0) + netGold),
          };
          
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[SWF Reinsurance Futures Settled] Contract ${futId} for Syndicate ${fut.syndicateId} on CDO ${fut.swfYieldCdoId} tranche ${fut.trancheId} settled at spot rate ${spotRate.toFixed(4)} vs locked rate ${fut.lockPremiumRate.toFixed(4)} (Profit/Loss: ${profit} gold, Returned: ${netGold} gold).`
          );
        }
        
        newState.swfReinsuranceFuturesContracts[futId] = {
          ...fut,
          active: false,
          timestamp: newState.step,
        };
      }
    }
  }

  // Auto-settlement of SWF Reinsurance Options on epoch boundaries (AF-148)
  if (newState.step % 5 === 0 && newState.swfReinsuranceOptionsContracts && Object.keys(newState.swfReinsuranceOptionsContracts).length > 0) {
    newState.swfReinsuranceOptionsContracts = { ...newState.swfReinsuranceOptionsContracts };
    newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};

    for (const [optId, opt] of Object.entries(newState.swfReinsuranceOptionsContracts)) {
      if (opt.active) {
        const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
        let payout = 0;
        if (opt.optionType === "call") {
          payout = Math.max(0, spotRate - opt.strikePremiumRate) * opt.size * 100;
        } else {
          payout = Math.max(0, opt.strikePremiumRate - spotRate) * opt.size * 100;
        }
        payout = Math.floor(payout);

        const writer = newState.syndicates[opt.writerSyndicateId];
        const holder = newState.syndicates[opt.syndicateId];
        let actualPaid = payout;

        if (writer && holder) {
          actualPaid = Math.min(payout, writer.warChest ?? 0);
          writer.warChest = Math.max(0, (writer.warChest ?? 0) - actualPaid);
          holder.warChest = (holder.warChest ?? 0) + actualPaid;
        }

        newState.swfReinsuranceOptionsContracts[optId] = {
          ...opt,
          active: false,
          timestamp: newState.step,
        };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Settled] Option ${optId} for Syndicate ${opt.syndicateId} on CDO ${opt.swfYieldCdoId} tranche ${opt.trancheId} settled at spot rate ${spotRate.toFixed(4)} vs strike ${opt.strikePremiumRate.toFixed(4)} (Payout: ${payout} gold, Actual Paid: ${actualPaid} gold).`
        );
      }
    }
  }

  // Match SWF Reinsurance Option Limit Orders
  const matchedState = matchSWFReinsuranceOptionLimitOrders(newState);

  // AF-165: Automated SWF CDS Liquidity Matching & Arbitrage Allocation
  let finalState = recalculateSWFYieldCDORiskRatings(matchedState);
  if (finalState.swfYieldCDOCDSVotes) {
    const swfYieldCDOCDSVotes = { ...finalState.swfYieldCDOCDSVotes };
    let matchedAny = false;

    for (const [cdsId, votes] of Object.entries(swfYieldCDOCDSVotes)) {
      const votesObj = { ...votes } as any;
      const buyerVotes = Object.values(votesObj).filter((v: any) => v.side === "buyer");
      const writerVotes = Object.values(votesObj).filter((v: any) => v.side === "writer");

      if (buyerVotes.length > 0 && writerVotes.length === 0) {
        const latestBuyerVote = buyerVotes.reduce((latest: any, current: any) => current.timestamp > latest.timestamp ? current : latest, buyerVotes[0]) as any;
        for (const [syndicateId, marginAccount] of Object.entries(finalState.marginAccounts || {})) {
          if (syndicateId === latestBuyerVote.buyerSyndicateId) continue;
          if (marginAccount.swfCDSLiquidityMatchingEnabled) {
            if (latestBuyerVote.marginEnabled && (!finalState.marginAccounts || !finalState.marginAccounts[syndicateId])) {
              continue;
            }
            
            const syndicate = finalState.syndicates?.[syndicateId];
            const availableLiquidity = Math.min(
              latestBuyerVote.notionalValue,
              marginAccount.swfLiquidityBuffer ?? marginAccount.collateral ?? (syndicate?.warChest ?? 0)
            );
            
            if (syndicate && availableLiquidity > 0) {
              if (!finalState.syndicates) finalState.syndicates = {};
              finalState.syndicates[syndicateId] = {
                ...syndicate,
                warChest: Math.max(0, (syndicate.warChest ?? 0) - availableLiquidity),
              };
            }

            votesObj[`auto_writer_${syndicateId}`] = {
              cdsId,
              buyerSyndicateId: latestBuyerVote.buyerSyndicateId,
              writerSyndicateId: syndicateId,
              swfYieldCdoId: latestBuyerVote.swfYieldCdoId,
              trancheId: latestBuyerVote.trancheId,
              notionalValue: latestBuyerVote.notionalValue,
              premiumRate: latestBuyerVote.premiumRate,
              side: "writer",
              timestamp: finalState.step,
              marginEnabled: latestBuyerVote.marginEnabled || false,
              arbitrageLiquidityAllocated: availableLiquidity,
            };
            swfYieldCDOCDSVotes[cdsId] = votesObj;
            matchedAny = true;

            if (!finalState.journal) finalState.journal = [];
            finalState.journal.push(
              `[Automated CDS Liquidity Match] Syndicate ${syndicateId} automatically matched unmatched CDS Buy Vote ${cdsId} as Writer (Notional: ${latestBuyerVote.notionalValue}, Premium: ${latestBuyerVote.premiumRate.toFixed(4)}, Arbitrage Liquidity Allocated: ${availableLiquidity}).`
            );
            break;
          }
        }
      } else if (writerVotes.length > 0 && buyerVotes.length === 0) {
        const latestWriterVote = writerVotes.reduce((latest: any, current: any) => current.timestamp > latest.timestamp ? current : latest, writerVotes[0]) as any;
        for (const [syndicateId, marginAccount] of Object.entries(finalState.marginAccounts || {})) {
          if (syndicateId === latestWriterVote.writerSyndicateId) continue;
          if (marginAccount.swfCDSLiquidityMatchingEnabled) {
            
            const syndicate = finalState.syndicates?.[syndicateId];
            const availableLiquidity = Math.min(
              latestWriterVote.notionalValue,
              marginAccount.swfLiquidityBuffer ?? marginAccount.collateral ?? (syndicate?.warChest ?? 0)
            );
            
            if (syndicate && availableLiquidity > 0) {
              if (!finalState.syndicates) finalState.syndicates = {};
              finalState.syndicates[syndicateId] = {
                ...syndicate,
                warChest: Math.max(0, (syndicate.warChest ?? 0) - availableLiquidity),
              };
            }

            votesObj[`auto_buyer_${syndicateId}`] = {
              cdsId,
              buyerSyndicateId: syndicateId,
              writerSyndicateId: latestWriterVote.writerSyndicateId,
              swfYieldCdoId: latestWriterVote.swfYieldCdoId,
              trancheId: latestWriterVote.trancheId,
              notionalValue: latestWriterVote.notionalValue,
              premiumRate: latestWriterVote.premiumRate,
              side: "buyer",
              timestamp: finalState.step,
              marginEnabled: latestWriterVote.marginEnabled || false,
              arbitrageLiquidityAllocated: availableLiquidity,
            };
            swfYieldCDOCDSVotes[cdsId] = votesObj;
            matchedAny = true;

            if (!finalState.journal) finalState.journal = [];
            finalState.journal.push(
              `[Automated CDS Liquidity Match] Syndicate ${syndicateId} automatically matched unmatched CDS Write Vote ${cdsId} as Buyer (Notional: ${latestWriterVote.notionalValue}, Premium: ${latestWriterVote.premiumRate.toFixed(4)}, Arbitrage Liquidity Allocated: ${availableLiquidity}).`
            );
            break;
          }
        }
      }
    }

    if (matchedAny) {
      finalState.swfYieldCDOCDSVotes = swfYieldCDOCDSVotes;
      finalState = reconcileSWFYieldCDOCDSs(finalState, pack);
    }
  }

  // AF-166: Tick SWF Multi-Fund Reinsurance Pools & Arbitrage
  finalState = tickSWFMultiFundReinsurance(finalState);

  // AF-175: Automated secondary market rebalancing routing premium payouts under volatile shocks
  if (finalState.marginAccounts && finalState.swfReinsuranceOptionsContracts) {
    finalState.marginAccounts = { ...finalState.marginAccounts };
    finalState.swfReinsuranceOptionsContracts = { ...finalState.swfReinsuranceOptionsContracts };
    if (finalState.swfMultiFundReinsurancePools) {
      finalState.swfMultiFundReinsurancePools = { ...finalState.swfMultiFundReinsurancePools };
    }

    for (const [syndicateId, marginAccount] of Object.entries(finalState.marginAccounts)) {
      if ((marginAccount.swfReinsuranceOptionVault ?? 0) > 0) {
        for (const opt of Object.values(finalState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const stressPolicy = finalState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
            const hedgingPolicy = finalState.swfReinsuranceOptionHedgingPolicies?.[policyKey];

            if (stressPolicy && hedgingPolicy) {
              const activeBonds = Object.values(finalState.yieldVolatilityIndexes || {});
              const avgVolatility = activeBonds.length > 0
                ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
                : 15.0;

              const stressVolatility = avgVolatility + stressPolicy.simulatedVolatilityShock;

              if (stressVolatility >= hedgingPolicy.hedgingActivationThreshold) {
                const spreadThreshold = hedgingPolicy.volatilityShockArbitrageSpreadThreshold;
                const targetLimit = hedgingPolicy.targetBalanceLimit ?? 99999999;

                const depth = finalState.swfReinsuranceOptionOrderBookDepths?.[policyKey];
                const bidAskSpread = depth ? depth.bidAskSpread : 0;

                if (spreadThreshold === undefined || bidAskSpread >= spreadThreshold) {
                  const cdo = finalState.swfYieldCDOs?.[opt.swfYieldCdoId];
                  const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
                  const multiFundPools = Object.values(finalState.swfMultiFundReinsurancePools || {}) as SWFMultiFundReinsurancePool[];

                  const candidatePools = multiFundPools.filter(
                    (p) => p.active && creatorSyndicateId && p.syndicateIds.includes(creatorSyndicateId)
                  );
                  const targetPools = candidatePools.length > 0
                    ? candidatePools
                    : multiFundPools.filter((p) => p.active);

                  if (targetPools.length > 0) {
                    const toRoute = Math.min(marginAccount.swfReinsuranceOptionVault ?? 0, targetLimit);
                    const amountPerPool = Math.floor(toRoute / targetPools.length);
                    if (amountPerPool > 0) {
                      const totalRouted = amountPerPool * targetPools.length;
                      marginAccount.swfReinsuranceOptionVault = (marginAccount.swfReinsuranceOptionVault ?? 0) - totalRouted;
                      marginAccount.timestamp = finalState.step;

                      for (const targetPool of targetPools) {
                        const p = finalState.swfMultiFundReinsurancePools![targetPool.id] as SWFMultiFundReinsurancePool;
                        if (p) {
                          p.totalReserve = (p.totalReserve ?? 0) + amountPerPool;
                          if (!p.capitalAllocated) p.capitalAllocated = {};
                          p.capitalAllocated[syndicateId] = (p.capitalAllocated[syndicateId] ?? 0) + amountPerPool;
                          p.timestamp = finalState.step;
                        }
                      }

                      if (!finalState.journal) finalState.journal = [];
                      finalState.journal.push(
                        `[SWF Volatility Shock Arbitrage Spread Rebalancing] Routed ${totalRouted} gold of option premium payouts from vault of Syndicate ${syndicateId} to ${targetPools.length} active yield portfolio(s) under volatile shock (Stress Volatility: ${stressVolatility.toFixed(2)}% >= Threshold: ${hedgingPolicy.hedgingActivationThreshold.toFixed(2)}%, Option Bid-Ask Spread: ${bidAskSpread} gold).`
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // AF-183: Tick SWF Reinsurance Option Peer Lending
  finalState = tickSWFReinsuranceOptionPeerLending(finalState);

  // AF-184: Tick SWF Volatility Pools Automated Rebalancing & Yield Optimization
  finalState = tickSWFReinsuranceOptionVolatilityPoolRebalancing(finalState);

  // AF-211: Sweep Pool Volatility Hedging Trigger
  finalState = tickSweepPoolVolatilityHedging(finalState);

  // AF-224: SWF Deflection Surcharge Alliance Liquidity Pool Yield-bearing Sweep-in & auto-refunding
  finalState = tickAllianceYieldAutoRepay(finalState);

  // AF-226: Tick Sovereign Debt Default Alerts & reputation penalties
  finalState = tickSovereignDebtDefaultAlerts(finalState);
  // AF-228: Tick Sovereign Debt CDS Contracts & Settlements
  finalState = tickSovereignDebtCDS(finalState);
  return finalState;
}

export function tickSovereignDebtCDS(state: GameState): GameState {
  let newState = {
    ...state,
    sovereignDebtCDSContracts: state.sovereignDebtCDSContracts ? { ...state.sovereignDebtCDSContracts } : {},
    sovereignDebtCDSCDOPools: state.sovereignDebtCDSCDOPools ? { ...state.sovereignDebtCDSCDOPools } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    factionRep: state.factionRep ? { ...state.factionRep } : {},
    outstandingDeflectionFees: state.outstandingDeflectionFees ? { ...state.outstandingDeflectionFees } : {},
    cdsCdoLiquidityInjectionProposals: state.cdsCdoLiquidityInjectionProposals ? JSON.parse(JSON.stringify(state.cdsCdoLiquidityInjectionProposals)) : {},
    cdsCdoFeeExemptions: state.cdsCdoFeeExemptions ? { ...state.cdsCdoFeeExemptions } : {},
    cdsCdoCoinvestmentProposals: state.cdsCdoCoinvestmentProposals ? JSON.parse(JSON.stringify(state.cdsCdoCoinvestmentProposals)) : {},
    cdsCdoPartialFeeWaivers: state.cdsCdoPartialFeeWaivers ? { ...state.cdsCdoPartialFeeWaivers } : {},
    cdsCdoCoinvestmentYieldPayouts: state.cdsCdoCoinvestmentYieldPayouts ? { ...state.cdsCdoCoinvestmentYieldPayouts } : {},
    journal: state.journal ? [...state.journal] : [],
  };

  const activeContracts = Object.values(newState.sovereignDebtCDSContracts).filter(
    (contract: any) => contract.status === "active"
  );

  for (const contract of activeContracts) {
    const { cdsId, buyerSyndicateId, writerSyndicateId, targetSyndicateId, notionalValue, cdoId } = contract as any;

    const buyerSyndicate = newState.syndicates[buyerSyndicateId];
    if (!buyerSyndicate && !cdoId) continue;

    // Check if target syndicate has entered default status (has an authorized default alert that is NOT resolved)
    const hasAuthorizedDefault = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
      (alert: any) => alert.targetSyndicateId === targetSyndicateId && alert.status === "authorized" && !alert.resolved
    );

    if (hasAuthorizedDefault) {
      // Trigger automatic settlement!
      newState.sovereignDebtCDSContracts[cdsId] = {
        ...contract,
        status: "settled",
      };

      // Deduct from writer
      if (writerSyndicateId !== "system" && writerSyndicateId !== "swf") {
        const writerSyndicate = newState.syndicates[writerSyndicateId];
        if (writerSyndicate) {
          const updatedWriter = { ...writerSyndicate };
          updatedWriter.warChest = Math.max(0, (updatedWriter.warChest ?? 0) - notionalValue);
          newState.syndicates[writerSyndicateId] = updatedWriter;
        }
      } else {
        // paid from system sweep pool
        newState.swfStakingSweepPool = Math.max(0, (newState.swfStakingSweepPool ?? 0) - notionalValue);
      }

      // Add payout to buyer
      if (cdoId) {
        const pool = newState.sovereignDebtCDSCDOPools[cdoId];
        if (pool) {
          // CDO Waterfall payout rules: Senior first, Mezzanine second, Equity third.
          const seniorShare = Math.floor(notionalValue * 0.50);
          const mezzanineShare = Math.floor(notionalValue * 0.30);
          const equityShare = notionalValue - seniorShare - mezzanineShare;

          let remainingPayout = notionalValue;

          // 1. Senior payout
          const senior = pool.tranches.senior;
          const seniorPayout = Math.min(remainingPayout, seniorShare);
          if (seniorPayout > 0) {
            if (senior.totalValue > 0) {
              for (const syndId of Object.keys(senior.sharesOwned)) {
                const proportion = senior.sharesOwned[syndId] / senior.totalValue;
                const pay = Math.round(seniorPayout * proportion);
                if (pay > 0 && newState.syndicates[syndId]) {
                  newState.syndicates[syndId].warChest = (newState.syndicates[syndId].warChest ?? 0) + pay;
                  newState.journal.push(
                    `[CDS CDO Tranche Payout] Distributed ${pay} gold to Syndicate ${syndId} from Senior tranche of CDO pool ${cdoId}.`
                  );
                }
              }
            } else {
              pool.fractionalizedVault.balance += seniorPayout;
            }
            remainingPayout -= seniorPayout;
          }

          // 2. Mezzanine payout
          const mezzanine = pool.tranches.mezzanine;
          const mezzaninePayout = Math.min(remainingPayout, mezzanineShare);
          if (mezzaninePayout > 0) {
            if (mezzanine.totalValue > 0) {
              for (const syndId of Object.keys(mezzanine.sharesOwned)) {
                const proportion = mezzanine.sharesOwned[syndId] / mezzanine.totalValue;
                const pay = Math.round(mezzaninePayout * proportion);
                if (pay > 0 && newState.syndicates[syndId]) {
                  newState.syndicates[syndId].warChest = (newState.syndicates[syndId].warChest ?? 0) + pay;
                  newState.journal.push(
                    `[CDS CDO Tranche Payout] Distributed ${pay} gold to Syndicate ${syndId} from Mezzanine tranche of CDO pool ${cdoId}.`
                  );
                }
              }
            } else {
              pool.fractionalizedVault.balance += mezzaninePayout;
            }
            remainingPayout -= mezzaninePayout;
          }

          // 3. Equity payout
          const equity = pool.tranches.equity;
          const equityPayout = remainingPayout;
          if (equityPayout > 0) {
            if (equity.totalValue > 0) {
              for (const syndId of Object.keys(equity.sharesOwned)) {
                const proportion = equity.sharesOwned[syndId] / equity.totalValue;
                const pay = Math.round(equityPayout * proportion);
                if (pay > 0 && newState.syndicates[syndId]) {
                  newState.syndicates[syndId].warChest = (newState.syndicates[syndId].warChest ?? 0) + pay;
                  newState.journal.push(
                    `[CDS CDO Tranche Payout] Distributed ${pay} gold to Syndicate ${syndId} from Equity tranche of CDO pool ${cdoId}.`
                  );
                }
              }
            } else {
              pool.fractionalizedVault.balance += equityPayout;
            }
            remainingPayout = 0;
          }

          pool.timestamp = state.step;
        }
      } else {
        const updatedBuyer = { ...buyerSyndicate };
        updatedBuyer.warChest = (updatedBuyer.warChest ?? 0) + notionalValue;
        newState.syndicates[buyerSyndicateId] = updatedBuyer;
      }

      newState.journal.push(
        `[Sovereign Debt CDS Settlement] CDS ${cdsId} automatically settled due to default of target Syndicate ${targetSyndicateId}. Transferred payout of ${notionalValue} gold to ${cdoId ? `CDS CDO pool ${cdoId} tranches` : `Buyer Syndicate ${buyerSyndicateId}`} from Writer ${writerSyndicateId}.`
      );
      continue;
    }

    // Dynamic premium pricing based on active default risk indicators
    // Indicators: Outstanding deflection fees, enforcer heat, and active grace periods
    const outstandingFees = newState.outstandingDeflectionFees?.[targetSyndicateId] ?? 0;

    // Calculate target syndicate enforcer heat (max heat in rooms with assets, or overall max fallback)
    let enforcerHeat = 0;
    let hasAsset = false;
    if (newState.safehouses) {
      for (const sh of Object.values(newState.safehouses)) {
        if (sh.syndicateId === targetSyndicateId) {
          hasAsset = true;
          const h = newState.enforcementHeat?.[sh.roomId]?.heat ?? 0;
          if (h > enforcerHeat) enforcerHeat = h;
        }
      }
    }
    if (newState.turfGuardOutposts) {
      for (const op of Object.values(newState.turfGuardOutposts)) {
        if ((op as any).syndicateId === targetSyndicateId) {
          hasAsset = true;
          const h = newState.enforcementHeat?.[(op as any).roomId]?.heat ?? 0;
          if (h > enforcerHeat) enforcerHeat = h;
        }
      }
    }
    if (!hasAsset && newState.enforcementHeat) {
      for (const entry of Object.values(newState.enforcementHeat)) {
        if (entry.heat > enforcerHeat) enforcerHeat = entry.heat;
      }
    }

    // Active grace periods check
    let hasActiveGrace = false;
    if (newState.sovereignDebtDefaultGracePeriods) {
      for (const grace of Object.values(newState.sovereignDebtDefaultGracePeriods)) {
        if (grace.targetSyndicateId === targetSyndicateId && grace.status === "authorized" && (grace.remainingSteps ?? 0) > 0) {
          hasActiveGrace = true;
          break;
        }
      }
    }

    // Premium pricing formula
    const basePremium = Math.max(10, Math.round(notionalValue * 0.05)); // 5% base
    const feeMultiplier = 1.0 + (outstandingFees / 500);
    const heatMultiplier = 1.0 + (enforcerHeat / 50);
    const graceMultiplier = hasActiveGrace ? 0.5 : 1.0; // 50% discount due to active grace period

    const premium = Math.round(basePremium * feeMultiplier * heatMultiplier * graceMultiplier);

    // Accrue payment
    if (cdoId) {
      const pool = newState.sovereignDebtCDSCDOPools[cdoId];
      if (pool) {
        // CDO Waterfall loss rules: Equity absorbs first, Mezzanine second, Senior third, Vault balance last.
        let remainingLoss = premium;

        // 1. Equity absorbs first
        const equity = pool.tranches.equity;
        if (remainingLoss > 0 && equity.totalValue > 0) {
          const lossToAbsorb = Math.min(remainingLoss, equity.totalValue);
          const oldVal = equity.totalValue;
          equity.totalValue -= lossToAbsorb;
          for (const syndId of Object.keys(equity.sharesOwned)) {
            const oldShares = equity.sharesOwned[syndId] ?? 0;
            const lostShares = Math.round(lossToAbsorb * (oldShares / oldVal));
            equity.sharesOwned[syndId] = Math.max(0, oldShares - lostShares);
          }
          remainingLoss -= lossToAbsorb;
        }

        // 2. Mezzanine absorbs second
        const mezzanine = pool.tranches.mezzanine;
        if (remainingLoss > 0 && mezzanine.totalValue > 0) {
          const lossToAbsorb = Math.min(remainingLoss, mezzanine.totalValue);
          const oldVal = mezzanine.totalValue;
          mezzanine.totalValue -= lossToAbsorb;
          for (const syndId of Object.keys(mezzanine.sharesOwned)) {
            const oldShares = mezzanine.sharesOwned[syndId] ?? 0;
            const lostShares = Math.round(lossToAbsorb * (oldShares / oldVal));
            mezzanine.sharesOwned[syndId] = Math.max(0, oldShares - lostShares);
          }
          remainingLoss -= lossToAbsorb;
        }

        // 3. Senior absorbs third
        const senior = pool.tranches.senior;
        if (remainingLoss > 0 && senior.totalValue > 0) {
          const lossToAbsorb = Math.min(remainingLoss, senior.totalValue);
          const oldVal = senior.totalValue;
          senior.totalValue -= lossToAbsorb;
          for (const syndId of Object.keys(senior.sharesOwned)) {
            const oldShares = senior.sharesOwned[syndId] ?? 0;
            const lostShares = Math.round(lossToAbsorb * (oldShares / oldVal));
            senior.sharesOwned[syndId] = Math.max(0, oldShares - lostShares);
          }
          remainingLoss -= lossToAbsorb;
        }

        // 4. Fractionalized vault balance absorbs last
        if (remainingLoss > 0 && pool.fractionalizedVault.balance > 0) {
          const lossToAbsorb = Math.min(remainingLoss, pool.fractionalizedVault.balance);
          pool.fractionalizedVault.balance -= lossToAbsorb;
          remainingLoss -= lossToAbsorb;
        }

        if (remainingLoss === 0) {
          // Success! Pay premium to writer
          if (writerSyndicateId !== "system" && writerSyndicateId !== "swf") {
            const writerSyndicate = newState.syndicates[writerSyndicateId];
            if (writerSyndicate) {
              const updatedWriter = { ...writerSyndicate };
              updatedWriter.warChest = (updatedWriter.warChest ?? 0) + premium;
              newState.syndicates[writerSyndicateId] = updatedWriter;
            }
          } else {
            newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) + premium;
          }

          pool.timestamp = state.step;

          newState.journal.push(
            `[Sovereign Debt CDS Premium] CDS CDO pool ${cdoId} paid dynamic premium of ${premium} gold to Writer ${writerSyndicateId} for CDS ${cdsId} (Loss absorbed by tranches).`
          );
        } else {
          // Terminate due to lack of payment
          newState.sovereignDebtCDSContracts[cdsId] = {
            ...contract,
            status: "terminated",
          };
          newState.journal.push(
            `[Sovereign Debt CDS Terminated] CDS contract ${cdsId} terminated due to insufficient reserves in CDS CDO pool ${cdoId} (Required premium: ${premium} gold).`
          );
        }
      }
    } else {
      if ((buyerSyndicate.warChest ?? 0) >= premium) {
        const updatedBuyer = { ...buyerSyndicate };
        updatedBuyer.warChest = (updatedBuyer.warChest ?? 0) - premium;
        newState.syndicates[buyerSyndicateId] = updatedBuyer;

        if (writerSyndicateId !== "system" && writerSyndicateId !== "swf") {
          const writerSyndicate = newState.syndicates[writerSyndicateId];
          if (writerSyndicate) {
            const updatedWriter = { ...writerSyndicate };
            updatedWriter.warChest = (updatedWriter.warChest ?? 0) + premium;
            newState.syndicates[writerSyndicateId] = updatedWriter;
          }
        } else {
          newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) + premium;
        }

        newState.journal.push(
          `[Sovereign Debt CDS Premium] Buyer Syndicate ${buyerSyndicateId} paid dynamic premium of ${premium} gold to Writer ${writerSyndicateId} for CDS ${cdsId} (Indicators: Outstanding Fees: ${outstandingFees}, Heat: ${enforcerHeat}, Grace Active: ${hasActiveGrace}).`
        );
      } else {
        // Terminate due to lack of payment
        newState.sovereignDebtCDSContracts[cdsId] = {
          ...contract,
          status: "terminated",
        };
        newState.journal.push(
          `[Sovereign Debt CDS Terminated] CDS contract ${cdsId} terminated due to insufficient war chest in Buyer Syndicate ${buyerSyndicateId} (Required premium: ${premium} gold).`
        );
      }
    }
  }

  // 1. Calculate Fair Market Value (FMV) and bid-ask spreads for all active CDS contracts
  newState.cdsMarketSpreads = newState.cdsMarketSpreads ? { ...newState.cdsMarketSpreads } : {};
  
  for (const [cdsId, contract] of Object.entries(newState.sovereignDebtCDSContracts)) {
    if (contract.status !== "active") continue;
    const { targetSyndicateId, notionalValue } = contract;

    const hasAuthorizedDefault = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
      (alert: any) => alert.targetSyndicateId === targetSyndicateId && alert.status === "authorized" && !alert.resolved
    );

    let fairValue = 0;
    if (hasAuthorizedDefault) {
      fairValue = Math.round(notionalValue * 0.90);
    } else {
      const outstandingFees = newState.outstandingDeflectionFees?.[targetSyndicateId] ?? 0;
      let enforcerHeat = 0;
      let hasAsset = false;
      if (newState.safehouses) {
        for (const sh of Object.values(newState.safehouses)) {
          if (sh.syndicateId === targetSyndicateId) {
            hasAsset = true;
            const h = newState.enforcementHeat?.[sh.roomId]?.heat ?? 0;
            if (h > enforcerHeat) enforcerHeat = h;
          }
        }
      }
      if (newState.turfGuardOutposts) {
        for (const op of Object.values(newState.turfGuardOutposts)) {
          if ((op as any).syndicateId === targetSyndicateId) {
            hasAsset = true;
            const h = newState.enforcementHeat?.[(op as any).roomId]?.heat ?? 0;
            if (h > enforcerHeat) enforcerHeat = h;
          }
        }
      }
      if (!hasAsset && newState.enforcementHeat) {
        for (const entry of Object.values(newState.enforcementHeat)) {
          if (entry.heat > enforcerHeat) enforcerHeat = entry.heat;
        }
      }

      const baseRisk = 0.10;
      const feeRisk = (outstandingFees / 1000) * 0.40;
      const heatRisk = (enforcerHeat / 100) * 0.30;
      const riskRatio = Math.min(0.85, baseRisk + feeRisk + heatRisk);
      fairValue = Math.round(notionalValue * riskRatio);
    }

    let lowestAsk = 0;
    if (newState.cdsListings) {
      const activeListings = Object.values(newState.cdsListings).filter(
        (listing: any) => listing.cdsId === cdsId && listing.status === "active"
      );
      if (activeListings.length > 0) {
        lowestAsk = Math.min(...activeListings.map((l: any) => l.askPrice));
      }
    }

    let highestBid = 0;
    if (newState.cdsBids) {
      const activeBids = Object.values(newState.cdsBids).filter(
        (bid: any) => bid.cdsId === cdsId && bid.status === "active"
      );
      if (activeBids.length > 0) {
        highestBid = Math.max(...activeBids.map((b: any) => b.bidPrice));
      }
    }

    const spread = lowestAsk > 0 && highestBid > 0 ? lowestAsk - highestBid : 0;

    newState.cdsMarketSpreads[cdsId] = {
      cdsId,
      highestBid,
      lowestAsk,
      spread,
      fairValue,
      timestamp: newState.step,
    };

    // 2. Automated Arbitrage Bot Logic
    if (lowestAsk > 0 && lowestAsk < fairValue && newState.cdsListings) {
      const listing = Object.values(newState.cdsListings).find(
        (l: any) => l.cdsId === cdsId && l.status === "active" && l.askPrice === lowestAsk
      );
      if (listing) {
        const sellerSyndicateId = listing.sellerSyndicateId;
        const writerSyndicateId = contract.writerSyndicateId;

        const arbSyndicate = Object.values(newState.syndicates).find(
          (synd: any) =>
            synd.id !== sellerSyndicateId &&
            synd.id !== writerSyndicateId &&
            synd.id !== targetSyndicateId &&
            (synd.warChest ?? 0) >= lowestAsk
        );

        if (arbSyndicate) {
          if (!newState.cdsBids) newState.cdsBids = {};
          const bidId = `${cdsId}_${arbSyndicate.id}_arb`;
          newState.cdsBids[bidId] = {
            bidId,
            cdsId,
            bidderSyndicateId: arbSyndicate.id,
            bidPrice: lowestAsk,
            status: "active",
            timestamp: newState.step,
            votes: {},
          };
          newState.journal.push(
            `[Sovereign Debt CDS Arbitrage Bot] Syndicate ${arbSyndicate.id} arbitrage bot placed an active matching bid of ${lowestAsk} gold on undervalued CDS ${cdsId} (Fair Value: ${fairValue} gold).`
          );
          highestBid = lowestAsk;
          newState.cdsMarketSpreads[cdsId].highestBid = highestBid;
          newState.cdsMarketSpreads[cdsId].spread = lowestAsk - highestBid;
        }
      }
    }

    // 3. Automatic Bid Matching
    if (lowestAsk > 0 && highestBid > 0 && highestBid >= lowestAsk && newState.cdsListings && newState.cdsBids) {
      const matchingListing = Object.values(newState.cdsListings).find(
        (l: any) => l.cdsId === cdsId && l.status === "active" && l.askPrice === lowestAsk
      );
      const matchingBid = Object.values(newState.cdsBids).find(
        (b: any) => b.cdsId === cdsId && b.status === "active" && b.bidPrice === highestBid
      );

      if (matchingListing && matchingBid) {
        const sellerSyndicateId = matchingListing.sellerSyndicateId;
        const bidderSyndicateId = matchingBid.bidderSyndicateId;

        const sellerSynd = newState.syndicates[sellerSyndicateId];
        const bidderSynd = newState.syndicates[bidderSyndicateId];

        if (sellerSynd && bidderSynd && (bidderSynd.warChest ?? 0) >= lowestAsk) {
          newState.cdsListings[matchingListing.cdsId] = {
            ...matchingListing,
            status: "completed",
          };
          newState.cdsBids[matchingBid.bidId] = {
            ...matchingBid,
            status: "accepted",
          };

          newState.sovereignDebtCDSContracts[cdsId] = {
            ...contract,
            buyerSyndicateId: bidderSyndicateId,
          };

          const updatedSeller = {
            ...sellerSynd,
            warChest: (sellerSynd.warChest ?? 0) + lowestAsk,
          };
          const updatedBidder = {
            ...bidderSynd,
            warChest: Math.max(0, (bidderSynd.warChest ?? 0) - lowestAsk),
          };
          newState.syndicates[sellerSyndicateId] = updatedSeller;
          newState.syndicates[bidderSyndicateId] = updatedBidder;
          if (!newState.sovereignDebtCDSPortfolios) {
            newState.sovereignDebtCDSPortfolios = {};
          }

          const sellerPort = newState.sovereignDebtCDSPortfolios[sellerSyndicateId];
          if (sellerPort) {
            newState.sovereignDebtCDSPortfolios[sellerSyndicateId] = {
              ...sellerPort,
              purchasedCDSIds: sellerPort.purchasedCDSIds.filter((id: string) => id !== cdsId),
            };
          }
          const buyerPort = newState.sovereignDebtCDSPortfolios[bidderSyndicateId] || {
            syndicateId: bidderSyndicateId,
            purchasedCDSIds: [],
            writtenCDSIds: [],
          };
          newState.sovereignDebtCDSPortfolios[bidderSyndicateId] = {
            ...buyerPort,
            purchasedCDSIds: buyerPort.purchasedCDSIds.includes(cdsId)
              ? buyerPort.purchasedCDSIds
              : [...buyerPort.purchasedCDSIds, cdsId],
          };

          for (const [lid, listing] of Object.entries(newState.cdsListings)) {
            if (listing.cdsId === cdsId && listing.status === "active") {
              newState.cdsListings[lid] = { ...listing, status: "completed" };
            }
          }
          for (const [bid, b] of Object.entries(newState.cdsBids)) {
            if (b.cdsId === cdsId && b.status === "active") {
              newState.cdsBids[bid] = { ...b, status: "rejected" };
            }
          }

          newState.journal.push(
            `[Sovereign Debt CDS Matched Trade] Automatic bid matching executed for CDS ${cdsId}. Syndicate ${bidderSyndicateId} purchased the contract from Syndicate ${sellerSyndicateId} for ${lowestAsk} gold.`
          );
        }
      }
    }
  }

  // AF-231: Calculate Fair Market Value (FMV) and bid-ask spreads for active CDS CDO tranches, and execute automatic bid matching and arbitrage.
  newState.cdsCdoTrancheListings = newState.cdsCdoTrancheListings ? { ...newState.cdsCdoTrancheListings } : {};
  newState.cdsCdoTrancheBids = newState.cdsCdoTrancheBids ? { ...newState.cdsCdoTrancheBids } : {};
  newState.cdsCdoTrancheMarketSpreads = newState.cdsCdoTrancheMarketSpreads ? { ...newState.cdsCdoTrancheMarketSpreads } : {};
  newState.sovereignDebtCDSCDOPools = newState.sovereignDebtCDSCDOPools ? { ...newState.sovereignDebtCDSCDOPools } : {};
  newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};

  newState.cdsCdoYieldHedgingOptionListings = newState.cdsCdoYieldHedgingOptionListings ? { ...newState.cdsCdoYieldHedgingOptionListings } : {};
  newState.cdsCdoYieldHedgingOptionBids = newState.cdsCdoYieldHedgingOptionBids ? { ...newState.cdsCdoYieldHedgingOptionBids } : {};
  newState.cdsCdoYieldHedgingOptionMarketSpreads = newState.cdsCdoYieldHedgingOptionMarketSpreads ? { ...newState.cdsCdoYieldHedgingOptionMarketSpreads } : {};

  if (newState.cdsCdoYieldHedgingOptionContracts) {
    newState.cdsCdoYieldHedgingOptionContracts = { ...newState.cdsCdoYieldHedgingOptionContracts };
    for (const [optionId, option] of Object.entries(newState.cdsCdoYieldHedgingOptionContracts)) {
      if (option.status !== "active") continue;
      const cdoId = option.cdoId;
      const pool = newState.sovereignDebtCDSCDOPools?.[cdoId];
      if (!pool) continue;

      // 1. Calculate Option Fair Value
      const fairValue = getCDSCDOYieldHedgingPremium(newState, cdoId, option.coverageAmount);

      // 2. Calculate Spread
      let lowestAsk = 0;
      if (newState.cdsCdoYieldHedgingOptionListings) {
        const activeListings = Object.values(newState.cdsCdoYieldHedgingOptionListings).filter(
          (l: any) => l.optionId === optionId && l.status === "active"
        );
        if (activeListings.length > 0) {
          lowestAsk = Math.min(...activeListings.map((l: any) => l.askPrice));
        }
      }

      let highestBid = 0;
      if (newState.cdsCdoYieldHedgingOptionBids) {
        const activeBids = Object.values(newState.cdsCdoYieldHedgingOptionBids).filter(
          (b: any) => b.optionId === optionId && b.status === "active"
        );
        if (activeBids.length > 0) {
          highestBid = Math.max(...activeBids.map((b: any) => b.bidPrice));
        }
      }

      const poolCDSs = Object.values(newState.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
      const targetSyndicates = poolCDSs.map(c => c.targetSyndicateId);
      const alertActive = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
        (a: any) => targetSyndicates.includes(a.targetSyndicateId) && a.status === "authorized" && !a.resolved
      );

      // Find recently resolved alerts for target syndicates to calculate decay
      const resolvedAlerts = Object.values(newState.sovereignDebtDefaultAlerts || {}).filter(
        (a: any) => targetSyndicates.includes(a.targetSyndicateId) && (a.status === "resolved" || a.resolved === true)
      );
      let maxResolvedAtStep = -1;
      for (const a of resolvedAlerts) {
        if (a.resolvedAtStep !== undefined && a.resolvedAtStep > maxResolvedAtStep) {
          maxResolvedAtStep = a.resolvedAtStep;
        }
      }

      let effectiveMultiplier = 1.0;
      if (alertActive && pool.dynamicLiquidityFloor !== undefined) {
        const floor = pool.dynamicLiquidityFloor;
        const vaultBalance = pool.fractionalizedVault?.balance ?? 0;
        const thresholdPercent = pool.yieldHedgingOptionSpreadPenaltyThresholdPercent ?? 0.20;
        if (vaultBalance <= floor * (1 + thresholdPercent)) {
          effectiveMultiplier = pool.yieldHedgingOptionSpreadPenaltyMultiplier ?? 1.0;
        }
      } else if (maxResolvedAtStep !== -1 && pool.dynamicLiquidityFloor !== undefined) {
        const elapsed = newState.step - maxResolvedAtStep;
        if (elapsed >= 0 && elapsed < 5) {
          const floor = pool.dynamicLiquidityFloor;
          const vaultBalance = pool.fractionalizedVault?.balance ?? 0;
          const thresholdPercent = pool.yieldHedgingOptionSpreadPenaltyThresholdPercent ?? 0.20;
          if (vaultBalance <= floor * (1 + thresholdPercent)) {
            const baseMultiplier = pool.yieldHedgingOptionSpreadPenaltyMultiplier ?? 1.0;
            effectiveMultiplier = 1.0 + (baseMultiplier - 1.0) * (1 - elapsed / 5);
          }
        }
      }

      if (effectiveMultiplier > 1.0) {
        let localHeatFactor = 0;
        const syndicate = newState.syndicates?.[option.syndicateId];
        if (syndicate && syndicate.territoryEnforcerHeatVolatilityScales) {
          const currentRoomId = newState.current;
          const localScale = syndicate.territoryEnforcerHeatVolatilityScales[currentRoomId] ?? 0;
          const localHeat = newState.enforcementHeat?.[currentRoomId]?.heat ?? 0;
          localHeatFactor = localHeat * localScale;
        }

        let regionalVol = 0.0;
        if (newState.environment) {
          let baseVol = 0;
          if (newState.environment.weather === "storm") baseVol = 50;
          else if (newState.environment.weather === "rain") baseVol = 20;
          else if (newState.environment.weather === "fog") baseVol = 15;
          else if (newState.environment.weather === "clear") baseVol = 0;

          let windVol = 0;
          if (newState.environment.wind === "tempest") windVol = 30;
          else if (newState.environment.wind === "gale") windVol = 15;
          else if (newState.environment.wind === "breezy") windVol = 5;

          regionalVol = (baseVol + windVol) / 100.0;
        }

        effectiveMultiplier = effectiveMultiplier * (1.0 + localHeatFactor + regionalVol);

        if (pool.yieldHedgingOptionSpreadPenaltyCapMultiplier !== undefined) {
          effectiveMultiplier = Math.min(effectiveMultiplier, pool.yieldHedgingOptionSpreadPenaltyCapMultiplier);
        }

        // Apply faction standing-gated deflection discount (AF-250)
        if (pool.yieldHedgingOptionSpreadPenaltyFactionStandingDiscounts) {
          let totalDiscount = 0;
          for (const [factionId, discount] of Object.entries(pool.yieldHedgingOptionSpreadPenaltyFactionStandingDiscounts)) {
            const standing = getSyndicateFactionStanding(newState, option.syndicateId, factionId);
            const isAllied = isFactionAlliedToSyndicate(newState, option.syndicateId, factionId) || standing >= 50;
            if (isAllied) {
              totalDiscount += discount;
            }
          }
          if (totalDiscount > 0) {
            const cappedDiscount = Math.min(1.0, totalDiscount);
            effectiveMultiplier = 1.0 + (effectiveMultiplier - 1.0) * (1.0 - cappedDiscount);
          }
        }
      }

      let spread = lowestAsk > 0 && highestBid > 0 ? lowestAsk - highestBid : 0;
      if (effectiveMultiplier > 1.0) {
        spread = spread * effectiveMultiplier;
      }

      newState.cdsCdoYieldHedgingOptionMarketSpreads![optionId] = {
        spreadId: optionId,
        optionId,
        highestBid,
        lowestAsk,
        spread,
        fairValue,
        timestamp: newState.step,
      };

      // 3. Enforce dynamic liquidity floor if alert active
      let validLowestAsk = lowestAsk;
      let validHighestBid = highestBid;
      if (alertActive && pool.dynamicLiquidityFloor !== undefined) {
        const floor = pool.dynamicLiquidityFloor;
        if (lowestAsk > 0 && lowestAsk < floor) {
          validLowestAsk = 0;
        }
        if (highestBid > 0 && highestBid < floor) {
          validHighestBid = 0;
        }
        if ((pool.fractionalizedVault?.balance ?? 0) < floor) {
          validLowestAsk = 0;
          validHighestBid = 0;
        }
      }

      // 3b. Enforce dynamic spread control policy
      if (pool.yieldHedgingOptionMinSpread !== undefined || pool.yieldHedgingOptionMaxSpread !== undefined) {
        let dropRate = 0;
        if (newState.swfMultiFundReinsurancePools) {
          for (const p of Object.values(newState.swfMultiFundReinsurancePools)) {
            if (p.linkStateDropRate !== undefined) {
              dropRate = Math.max(dropRate, p.linkStateDropRate);
            }
          }
        }
        const scale = 1.0 + dropRate;
        const minSpread = (pool.yieldHedgingOptionMinSpread ?? 0) * scale;
        const maxSpread = (pool.yieldHedgingOptionMaxSpread ?? Infinity) * scale;

        if (lowestAsk > 0 && highestBid > 0) {
          let spreadVal = lowestAsk - highestBid;
          if (effectiveMultiplier > 1.0) {
            spreadVal = spreadVal * effectiveMultiplier;
          }
          if (spreadVal > 0) {
            if (spreadVal < minSpread || spreadVal > maxSpread) {
              validLowestAsk = 0;
              validHighestBid = 0;
            }
          }
        }
      }

      // 4. Options Arbitrage Bot
      if (validLowestAsk > 0 && validLowestAsk < fairValue && newState.cdsCdoYieldHedgingOptionListings) {
        const listing: any = Object.values(newState.cdsCdoYieldHedgingOptionListings).find(
          (l: any) => l.optionId === optionId && l.status === "active" && l.askPrice === lowestAsk
        );
        if (listing) {
          const sellerSyndicateId: string = listing.sellerSyndicateId;
          const arbSyndicate: any = Object.values(newState.syndicates).find(
            (synd: any) =>
              synd.id !== sellerSyndicateId &&
              (synd.warChest ?? 0) >= validLowestAsk
          );

          if (arbSyndicate) {
            const bidId = `${optionId}_${arbSyndicate.id}_arb`;
            newState.cdsCdoYieldHedgingOptionBids![bidId] = {
              bidId,
              optionId,
              bidderSyndicateId: arbSyndicate.id,
              bidPrice: validLowestAsk,
              status: "active",
              timestamp: newState.step,
              votes: {},
            };
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDO Yield-Hedging Option Arbitrage Bot] Syndicate ${arbSyndicate.id} arbitrage bot placed an active matching bid of ${validLowestAsk} gold on undervalued Option ${optionId} (Fair Value: ${fairValue} gold).`
            );
            highestBid = validLowestAsk;
            validHighestBid = validLowestAsk;
            newState.cdsCdoYieldHedgingOptionMarketSpreads![optionId].highestBid = highestBid;
            newState.cdsCdoYieldHedgingOptionMarketSpreads![optionId].spread = validLowestAsk - highestBid;
          }
        }
      }

      // 5. Dynamic bid-ask matching algorithms
      if (validLowestAsk > 0 && validHighestBid > 0 && validHighestBid >= validLowestAsk && newState.cdsCdoYieldHedgingOptionListings && newState.cdsCdoYieldHedgingOptionBids) {
        const matchingListing: any = Object.values(newState.cdsCdoYieldHedgingOptionListings).find(
          (l: any) => l.optionId === optionId && l.status === "active" && l.askPrice === lowestAsk
        );
        const matchingBid: any = Object.values(newState.cdsCdoYieldHedgingOptionBids).find(
          (b: any) => b.optionId === optionId && b.status === "active" && b.bidPrice === highestBid
        );

        if (matchingListing && matchingBid) {
          const sellerSyndicateId = matchingListing.sellerSyndicateId;
          const bidderSyndicateId = matchingBid.bidderSyndicateId;

          const sellerSynd = newState.syndicates[sellerSyndicateId];
          const bidderSynd = newState.syndicates[bidderSyndicateId];

          let tradePrice = lowestAsk;
          if (pool.dynamicMatchingEnabled) {
            tradePrice = Math.round((lowestAsk + highestBid) / 2);
          }

          if (sellerSynd && bidderSynd && (bidderSynd.warChest ?? 0) >= tradePrice) {
            newState.cdsCdoYieldHedgingOptionListings[matchingListing.optionId] = {
              ...matchingListing,
              status: "completed",
            };
            newState.cdsCdoYieldHedgingOptionBids[matchingBid.bidId] = {
              ...matchingBid,
              status: "accepted",
            };

            // Transfer option ownership
            newState.cdsCdoYieldHedgingOptionContracts![optionId] = {
              ...option,
              syndicateId: bidderSyndicateId,
            };

            // Transfer gold with secondary fee deduction
            let feePercent = pool.yieldHedgingOptionSecondaryFeePercent ?? 0;

            const isSellerAllied = sellerSyndicateId === pool.creatorSyndicateId ||
              (newState.syndicateAlliances?.[sellerSyndicateId]?.[pool.creatorSyndicateId] === "allied") ||
              (newState.syndicateAlliances?.[pool.creatorSyndicateId]?.[sellerSyndicateId] === "allied");

            if (isSellerAllied && newState.factionRep) {
              for (const factionId of Object.keys(newState.factionRep)) {
                if (getSyndicateFactionLoyaltyRank(newState as GameState, sellerSyndicateId, factionId) === "Platinum") {
                  feePercent = 0;
                  break;
                }
              }
            }

            const feeAmount = Math.round(tradePrice * feePercent);

            // MM Surcharge (AF-252)
            let mmSurchargeAmount = 0;
            let effectiveMMSurcharge = 0;
            if (pool.yieldHedgingOptionMarketMakerSurchargeRate !== undefined &&
                pool.yieldHedgingOptionMarketMakerBufferThresholdPercent !== undefined &&
                pool.dynamicLiquidityFloor !== undefined) {
              const floor = pool.dynamicLiquidityFloor;
              const vaultBalance = pool.fractionalizedVault?.balance ?? 0;
              const mmThreshold = pool.yieldHedgingOptionMarketMakerBufferThresholdPercent;
              const mmThresholdAmount = floor * (1 + mmThreshold);
              if (vaultBalance < mmThresholdAmount && mmThresholdAmount > 0) {
                const baseSurcharge = pool.yieldHedgingOptionMarketMakerSurchargeRate;
                const scaling = 1 - (vaultBalance / mmThresholdAmount);
                effectiveMMSurcharge = baseSurcharge * scaling;
                mmSurchargeAmount = Math.round(tradePrice * effectiveMMSurcharge);
              }
            }

            // Apply Faction Standing-Gated Discount Scaling (AF-254)
            let mmDiscount = 0;
            const poolCDSs = Object.values(newState.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
            const targetSyndicates = poolCDSs.map(c => c.targetSyndicateId);
            const alertActive = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
              (alert: any) => targetSyndicates.includes(alert.targetSyndicateId) && alert.status === "authorized" && !alert.resolved
            );

            // Surcharge Cooldown & Panic Override check (AF-255, AF-257, AF-258)
            const surchargeProposals = (newState as GameState).cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals;
            const surchargeCancellations = (newState as GameState).cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals;
            if (surchargeProposals && surchargeCancellations) {
              for (const cancelProp of Object.values(surchargeCancellations) as any[]) {
                if (cancelProp && cancelProp.status === "authorized" && surchargeProposals[cancelProp.targetProposalId]) {
                  const target = surchargeProposals[cancelProp.targetProposalId];
                  if (target && target.panicOverrideActive) {
                    if (cancelProp.remainingGraceSteps === undefined) {
                      target.panicOverrideActive = false;
                      target.cooldownEndStep = undefined;
                    }
                  }
                }
              }
            }

            let overrideMultiplier = 1.0;
            const activeSurchargeOverrides = Object.values((newState as GameState).cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals || {}).filter(
              (prop: any) => prop.cdoId === cdoId && prop.status === "authorized" && prop.panicOverrideActive && prop.cooldownEndStep !== undefined && newState.step <= prop.cooldownEndStep
            );

            if (activeSurchargeOverrides.length > 0) {
              let minMultiplier = 1.0;
              let hasFullyRestricted = false;
              for (const prop of activeSurchargeOverrides) {
                const cancellations = Object.values((newState as GameState).cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals || {}).filter(
                  (cancel: any) => cancel.targetProposalId === prop.proposalId && cancel.status === "authorized"
                );
                if (cancellations.length === 0) {
                  hasFullyRestricted = true;
                  break;
                }
                let maxPropMultiplier = 0.0;
                for (const cancel of cancellations) {
                  if (cancel.remainingGraceSteps !== undefined) {
                    if (cancel.remainingGraceSteps > 0 && cancel.graceDuration && cancel.graceDuration > 0) {
                      const m = 1 - (cancel.remainingGraceSteps / cancel.graceDuration);
                      if (m > maxPropMultiplier) {
                        maxPropMultiplier = m;
                      }
                    } else if (cancel.remainingGraceSteps === 0) {
                      maxPropMultiplier = 1.0;
                    }
                  } else {
                    maxPropMultiplier = 1.0;
                  }
                }
                if (maxPropMultiplier < minMultiplier) {
                  minMultiplier = maxPropMultiplier;
                }
              }
              overrideMultiplier = hasFullyRestricted ? 0.0 : minMultiplier;
            }

            if (alertActive && pool.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts && overrideMultiplier > 0) {
              for (const [factionId, discount] of Object.entries(pool.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts)) {
                const standing = getSyndicateFactionStanding(newState as GameState, sellerSyndicateId, factionId);
                const isAllied = isFactionAlliedToSyndicate(newState as GameState, sellerSyndicateId, factionId) || standing >= 50;
                if (isAllied) {
                  mmDiscount += discount * overrideMultiplier;
                }
              }
            }

            const cappedMMDiscount = Math.min(1.0, mmDiscount);
            let finalMMSurchargeAmount = mmSurchargeAmount;
            let finalCompoundedAmount = mmSurchargeAmount;

            if (cappedMMDiscount > 0 && mmSurchargeAmount > 0) {
              if (pool.yieldHedgingOptionMarketMakerSurchargeAutoCompound) {
                // Boost compounding margin allocations
                finalCompoundedAmount = Math.round(mmSurchargeAmount * (1.0 + cappedMMDiscount));
              } else {
                // Reduce dynamic surcharge
                finalMMSurchargeAmount = Math.round(mmSurchargeAmount * (1.0 - cappedMMDiscount));
                finalCompoundedAmount = finalMMSurchargeAmount;
              }
            }

            sellerSynd.warChest = (sellerSynd.warChest ?? 0) + tradePrice - feeAmount - finalMMSurchargeAmount;
            bidderSynd.warChest = Math.max(0, (bidderSynd.warChest ?? 0) - tradePrice);

            // Distribute dividends
            if (feeAmount > 0) {
              newState = distributeOptionFeeDividends(newState as GameState, cdoId, feeAmount) as any;
            }

            // Deposit MM surcharge into CDO fractionalized vault or auto-compound (AF-253)
            let isCompounded = false;
            let compoundedTrancheId: string | undefined;
            if (mmSurchargeAmount > 0) {
              if (pool.yieldHedgingOptionMarketMakerSurchargeAutoCompound &&
                  pool.yieldHedgingOptionMarketMakerSurchargeCompoundTrancheId &&
                  pool.tranches?.[pool.yieldHedgingOptionMarketMakerSurchargeCompoundTrancheId]) {
                compoundedTrancheId = pool.yieldHedgingOptionMarketMakerSurchargeCompoundTrancheId;
                const tranche = pool.tranches[compoundedTrancheId as "senior" | "mezzanine" | "equity"];
                const collMap = { ...(tranche.marginCollateral || {}) };
                const newColl = (collMap[sellerSyndicateId] ?? 0) + finalCompoundedAmount;
                collMap[sellerSyndicateId] = newColl;
                tranche.marginCollateral = collMap;
                tranche.timestamp = newState.step;
                
                // Reset margin call if cleared
                if (newColl >= (tranche.maintenanceThreshold ?? 0)) {
                  if (tranche.marginCallActive?.[sellerSyndicateId]) {
                    tranche.marginCallActive = {
                      ...tranche.marginCallActive,
                      [sellerSyndicateId]: false,
                    };
                  }
                }
                isCompounded = true;
              } else {
                pool.fractionalizedVault = {
                  ...pool.fractionalizedVault,
                  balance: (pool.fractionalizedVault.balance ?? 0) + finalMMSurchargeAmount,
                  timestamp: newState.step,
                };
              }
            }

            // Cancel / complete all other active listings and bids for this option
            for (const [lid, listing] of Object.entries(newState.cdsCdoYieldHedgingOptionListings || {})) {
              if (listing.optionId === optionId && listing.status === "active") {
                newState.cdsCdoYieldHedgingOptionListings![lid] = { ...listing, status: "completed" };
              }
            }
            for (const [bid, b] of Object.entries(newState.cdsCdoYieldHedgingOptionBids || {})) {
              if (b.optionId === optionId && b.status === "active") {
                newState.cdsCdoYieldHedgingOptionBids![bid] = { ...b, status: "rejected" };
              }
            }

            const surchargeLog = mmSurchargeAmount > 0
              ? (isCompounded
                ? ` (Dynamic MM Liquidity Surcharge: ${mmSurchargeAmount} gold paid, ${finalCompoundedAmount} gold compounded into ${compoundedTrancheId} tranche margin collateral${cappedMMDiscount > 0 ? ` [Boosted: ${(cappedMMDiscount * 100).toFixed(0)}%]` : ""}, surcharge rate: ${(effectiveMMSurcharge * 100).toFixed(2)}%)`
                : ` (Dynamic MM Liquidity Surcharge: ${finalMMSurchargeAmount} gold deposited to vault${cappedMMDiscount > 0 ? ` [Discounted: ${(cappedMMDiscount * 100).toFixed(0)}%]` : ""}, surcharge rate: ${(effectiveMMSurcharge * 100).toFixed(2)}%)`)
              : "";

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDO Yield-Hedging Option Traded] Option ${optionId} traded from ${sellerSyndicateId} to ${bidderSyndicateId} at price ${tradePrice} gold${pool.dynamicMatchingEnabled ? " (Dynamic Mid-Price Match)" : ""}${feeAmount > 0 ? ` (Levied Transaction Fee: ${feeAmount} gold)` : ""}${surchargeLog}.`
            );
          }
        }
      }
    }
  }

  for (const [cdoId, pool] of Object.entries(newState.sovereignDebtCDSCDOPools)) {
    // Process yield hedging option settlements and expirations (AF-241)
    if (newState.cdsCdoYieldHedgingOptionContracts) {
      newState.cdsCdoYieldHedgingOptionContracts = { ...newState.cdsCdoYieldHedgingOptionContracts };
      for (const [optionId, option] of Object.entries(newState.cdsCdoYieldHedgingOptionContracts)) {
        if (option.cdoId === cdoId && option.status === "active") {
          const poolCDSs = Object.values(newState.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
          const targetSyndicates = poolCDSs.map(c => c.targetSyndicateId);
          const alertActive = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
            (alert: any) => targetSyndicates.includes(alert.targetSyndicateId) && alert.status === "authorized" && !alert.resolved
          );

          if (alertActive) {
            option.status = "settled";
            if (pool.automatedHedgeEnabled) {
              let marginDeposited = false;
              for (const trancheId of ["senior", "mezzanine", "equity"] as const) {
                const tranche = pool.tranches[trancheId];
                if (tranche && tranche.sharesOwned?.[option.syndicateId] > 0 && tranche.marginCollateral) {
                  tranche.marginCollateral = { ...tranche.marginCollateral };
                  tranche.marginCollateral[option.syndicateId] = (tranche.marginCollateral[option.syndicateId] ?? 0) + option.coverageAmount;
                  marginDeposited = true;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[CDO Yield-Hedging Option Settled] Yield-hedging option contract ${optionId} settled due to default alert on CDO ${cdoId}. Auto-hedge deposited ${option.coverageAmount} gold into tranche ${trancheId} margin collateral for Syndicate ${option.syndicateId} to deflect margin call liquidation.`
                  );
                  break;
                }
              }
              if (!marginDeposited) {
                const syndicate = newState.syndicates?.[option.syndicateId];
                if (syndicate) {
                  syndicate.warChest = (syndicate.warChest ?? 0) + option.coverageAmount;
                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[CDO Yield-Hedging Option Settled] Yield-hedging option contract ${optionId} settled due to default alert on CDO ${cdoId}. Paid out ${option.coverageAmount} gold to Syndicate ${option.syndicateId} war chest.`
                  );
                }
              }
            } else {
              const syndicate = newState.syndicates?.[option.syndicateId];
              if (syndicate) {
                syndicate.warChest = (syndicate.warChest ?? 0) + option.coverageAmount;
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[CDO Yield-Hedging Option Settled] Yield-hedging option contract ${optionId} settled due to default alert on CDO ${cdoId}. Paid out ${option.coverageAmount} gold to Syndicate ${option.syndicateId} war chest.`
                );
              }
            }
          } else if (newState.step >= option.expiryStep) {
            option.status = "expired";
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDO Yield-Hedging Option Expired] Yield-hedging option contract ${optionId} expired without a default alert.`
            );
          }
        }
      }
    }

    // Process approved liquidity injections for this pool
    if (newState.cdsCdoLiquidityInjectionProposals) {
      for (const [propId, prop] of Object.entries(newState.cdsCdoLiquidityInjectionProposals)) {
        const proposal = prop as any;
        if (proposal.cdoId === cdoId && proposal.status === "approved") {
          if (pool.reserveFloor !== undefined && pool.fractionalizedVault.balance >= pool.reserveFloor) {
            proposal.status = "executed";

            // 1. Grant reputation boost (+20)
            const oldRep = newState.factionRep[proposal.syndicateId] ?? 0;
            newState.factionRep[proposal.syndicateId] = oldRep + 20;

            // 2. Grant deflection fee exemption & clear outstanding deflection fees
            newState.cdsCdoFeeExemptions[proposal.syndicateId] = true;
            newState.outstandingDeflectionFees[proposal.syndicateId] = 0;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDO Liquidity Injection Restored] Syndicate ${proposal.syndicateId} restored CDO ${cdoId} liquidity above reserve floor of ${pool.reserveFloor} with injection of ${proposal.amount} gold. Granted +20 reputation and deflection fee exemption.`
            );
          }
        }
      }
    }

    // Process approved co-investment proposals for this pool
    if (newState.cdsCdoCoinvestmentProposals) {
      for (const [propId, prop] of Object.entries(newState.cdsCdoCoinvestmentProposals)) {
        const proposal = prop as any;
        if (proposal.cdoId === cdoId && proposal.status === "approved") {
          if (pool.reserveFloor !== undefined && pool.fractionalizedVault.balance >= pool.reserveFloor) {
            proposal.status = "executed";

            // Sum all locked contributions
            const contributions = proposal.contributions || {};
            const locked = proposal.lockedContributions || {};
            const lockedSyndicates = Object.keys(locked).filter(sId => locked[sId] === true);
            const totalLocked = lockedSyndicates.reduce((sum, sId) => sum + (contributions[sId] ?? 0), 0);

            if (totalLocked > 0) {
              newState.cdsCdoPartialFeeWaivers = newState.cdsCdoPartialFeeWaivers ? { ...newState.cdsCdoPartialFeeWaivers } : {};
              newState.outstandingDeflectionFees = newState.outstandingDeflectionFees ? { ...newState.outstandingDeflectionFees } : {};
              newState.factionRep = newState.factionRep ? { ...newState.factionRep } : {};

              const t1Threshold = pool.tier1ReinvestmentThreshold ?? 50;
              const t1Mult = pool.tier1Multiplier ?? 1.2;
              const t2Threshold = pool.tier2ReinvestmentThreshold ?? 80;
              const t2Mult = pool.tier2Multiplier ?? 1.5;
              const slashThreshold = pool.reinvestmentSlashingThreshold ?? 10;
              const slashPenalty = pool.reinvestmentSlashingPenalty ?? 0.1;

              const reinvestShare = proposal.yieldReinvestmentShare ?? 0;
              let multiplier = 1.0;
              if (reinvestShare > t2Threshold) {
                multiplier = t2Mult;
              } else if (reinvestShare > t1Threshold) {
                multiplier = t1Mult;
              }

              for (const sId of lockedSyndicates) {
                const contribution = contributions[sId] ?? 0;
                const ratio = contribution / totalLocked;

                // 1. Proportional reputation boost (+20 max base)
                const baseRepBoost = Math.round(20 * ratio);
                const repBoost = Math.round(baseRepBoost * multiplier);
                const oldRep = newState.factionRep[sId] ?? 0;
                newState.factionRep[sId] = oldRep + repBoost;

                // 2. Set partial deflection fee waiver rate
                const waiver = Math.min(1.0, ratio * multiplier);
                newState.cdsCdoPartialFeeWaivers[sId] = waiver;

                // 3. Partially waive (reduce) outstanding deflection fees
                const oldOutstanding = newState.outstandingDeflectionFees[sId] ?? 0;
                const feeReductionRatio = Math.min(1.0, ratio * multiplier);
                newState.outstandingDeflectionFees[sId] = Math.max(0, oldOutstanding - Math.round(oldOutstanding * feeReductionRatio));

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[CDO Co-investment Restored] Syndicate ${sId} contributed ${contribution} gold (${(ratio * 100).toFixed(0)}% of total co-investment pool). Restored CDO ${cdoId} liquidity above reserve floor of ${pool.reserveFloor}. Granted +${repBoost} reputation (Boost multiplier: ${multiplier}x) and ${(waiver * 100).toFixed(0)}% deflection fee waiver.`
                );
              }
            }
          }
        }
      }
    }

    // Pre-pass: Process equity tranche autocallable yield payouts and apply cross-tranche hedging before any margin requirements are calculated.
    const equityTranche = pool.tranches["equity"];
    if (equityTranche && equityTranche.autocallTriggerLevel !== undefined && equityTranche.autocallCoupon !== undefined) {
      if (equityTranche.autocallPaid === undefined) equityTranche.autocallPaid = {};
      
      const poolCDSContracts = Object.values(newState.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
      const totalDefaults = poolCDSContracts
        .filter(c => c.status === "settled")
        .reduce((sum, c) => sum + (c.notionalValue ?? 0), 0);

      for (const [syndicateId, shares] of Object.entries(equityTranche.sharesOwned)) {
        if (shares <= 0) continue;
        const synd = newState.syndicates[syndicateId];
        if (!synd) continue;

        if (totalDefaults < equityTranche.autocallTriggerLevel && !equityTranche.autocallPaid[syndicateId]) {
          const trancheTotal = equityTranche.totalValue || 1;
          const initialPayout = Math.floor(equityTranche.autocallCoupon * (shares / trancheTotal));
          let payout = initialPayout;

          // Check if co-investment yield distribution is active for this CDO pool
          const coinvestProposal = Object.values(newState.cdsCdoCoinvestmentProposals || {}).find(
            (p: any) => p.cdoId === cdoId && p.status === "executed"
          ) as any;
          if (coinvestProposal && coinvestProposal.yieldCompensationShare && coinvestProposal.yieldCompensationShare > 0) {
            const yieldCompensationShare = coinvestProposal.yieldCompensationShare;
            const contributions = coinvestProposal.contributions || {};
            const locked = coinvestProposal.lockedContributions || {};
            const lockedSyndicates = Object.keys(locked).filter(sId => locked[sId] === true);
            const totalLocked = lockedSyndicates.reduce((sum, sId) => sum + (contributions[sId] ?? 0), 0);

            if (totalLocked > 0) {
              const divertedTotal = Math.floor(initialPayout * (yieldCompensationShare / 100));
              payout = initialPayout - divertedTotal;

              coinvestProposal.historicalYieldPayouts = coinvestProposal.historicalYieldPayouts || {};
              newState.cdsCdoCoinvestmentYieldPayouts = newState.cdsCdoCoinvestmentYieldPayouts || {};

              for (const sId of lockedSyndicates) {
                const contribution = contributions[sId] ?? 0;
                const ratio = contribution / totalLocked;
                const divertedAmount = Math.floor(divertedTotal * ratio);

                if (divertedAmount > 0) {
                  const reinvestmentShare = coinvestProposal.yieldReinvestmentShare ?? 0;
                  const reinvestedAmount = Math.floor(divertedAmount * (reinvestmentShare / 100));
                  const paidOutAmount = divertedAmount - reinvestedAmount;

                  const coSynd = newState.syndicates[sId];
                  if (coSynd && paidOutAmount > 0) {
                    coSynd.warChest = (coSynd.warChest ?? 0) + paidOutAmount;
                  }

                  coinvestProposal.historicalYieldPayouts[sId] = (coinvestProposal.historicalYieldPayouts[sId] ?? 0) + paidOutAmount;
                  const globalKey = `${coinvestProposal.proposalId}_${sId}`;
                  newState.cdsCdoCoinvestmentYieldPayouts[globalKey] = (newState.cdsCdoCoinvestmentYieldPayouts[globalKey] ?? 0) + paidOutAmount;

                  if (!newState.journal) newState.journal = [];
                  if (paidOutAmount > 0) {
                    newState.journal.push(
                      `[CDS CDO Co-Investment Yield Payout] Syndicate ${sId} received ${paidOutAmount} gold (pro-rata co-investment yield compensation) from CDO ${cdoId} tranche equity autocall.`
                    );
                  }

                  if (reinvestedAmount > 0) {
                    // 1. Add back to syndicate's locked contribution in the CDO pool
                    coinvestProposal.contributions[sId] = (coinvestProposal.contributions[sId] ?? 0) + reinvestedAmount;

                    // 2. Add to the CDO fractionalized vault's balance
                    pool.fractionalizedVault = {
                      ...pool.fractionalizedVault,
                      balance: pool.fractionalizedVault.balance + reinvestedAmount,
                    };

                    // 3. Track in historicalYieldReinvestments
                    coinvestProposal.historicalYieldReinvestments = coinvestProposal.historicalYieldReinvestments || {};
                    coinvestProposal.historicalYieldReinvestments[sId] = (coinvestProposal.historicalYieldReinvestments[sId] ?? 0) + reinvestedAmount;

                    // 4. Track globally in cdsCdoCoinvestmentYieldReinvestments
                    newState.cdsCdoCoinvestmentYieldReinvestments = newState.cdsCdoCoinvestmentYieldReinvestments || {};
                    newState.cdsCdoCoinvestmentYieldReinvestments[globalKey] = (newState.cdsCdoCoinvestmentYieldReinvestments[globalKey] ?? 0) + reinvestedAmount;

                    newState.journal.push(
                      `[CDS CDO Co-Investment Yield Reinvestment] Syndicate ${sId} reinvested ${reinvestedAmount} gold back into CDO ${cdoId} pool via co-investment proposal ${coinvestProposal.proposalId}.`
                    );
                  }
                }
              }
            }
          }

          // Check if there is an approved cross-tranche hedging policy for this syndicate in this CDO
          const hedgingConfig = Object.values(newState.cdsCdoCrossTrancheHedging || {}).find(
            (h: any) => h.cdoId === cdoId && h.syndicateId === syndicateId && h.status === "approved"
          );

          if (hedgingConfig && hedgingConfig.allocationPercent > 0) {
            const targetTrancheId = hedgingConfig.targetTrancheId;
            const targetTranche = pool.tranches[targetTrancheId];
            if (targetTranche) {
              let allocationPercent = hedgingConfig.allocationPercent;

              if (pool.reserveFloor !== undefined && pool.governanceCap !== undefined && pool.fractionalizedVault.balance < pool.reserveFloor) {
                if (allocationPercent > pool.governanceCap) {
                  const oldAllocation = allocationPercent;
                  allocationPercent = pool.governanceCap;
                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[CDS CDO Cross-Tranche Hedging Clamped] Syndicate ${syndicateId} cross-tranche yield hedging allocation clamped from ${oldAllocation}% to governance cap of ${pool.governanceCap}% due to CDO ${cdoId} fractionalized vault balance (${pool.fractionalizedVault.balance}) dropping below reserve floor (${pool.reserveFloor}).`
                  );
                }
              }

              const hedgedAmount = Math.floor(payout * (allocationPercent / 100));
              const remainingAmount = payout - hedgedAmount;

              // Distribute
              synd.warChest = (synd.warChest ?? 0) + remainingAmount;
              
              if (!targetTranche.marginCollateral) {
                targetTranche.marginCollateral = {};
              }
              targetTranche.marginCollateral[syndicateId] = (targetTranche.marginCollateral[syndicateId] ?? 0) + hedgedAmount;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[CDS CDO Cross-Tranche Hedging Applied] Syndicate ${syndicateId} transferred ${hedgedAmount} gold (hedged portion of equity autocall yield payout) to CDO ${cdoId} ${targetTrancheId} tranche margin collateral.`
              );
              newState.journal.push(
                `[CDS CDO Autocall Payout] Syndicate ${syndicateId} triggered autocall yield payout of ${payout} gold on CDO ${cdoId} tranche equity (Defaults: ${totalDefaults} < ${equityTranche.autocallTriggerLevel}).`
              );
            } else {
              // Fallback
              synd.warChest = (synd.warChest ?? 0) + payout;
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[CDS CDO Autocall Payout] Syndicate ${syndicateId} triggered autocall yield payout of ${payout} gold on CDO ${cdoId} tranche equity (Defaults: ${totalDefaults} < ${equityTranche.autocallTriggerLevel}).`
              );
            }
          } else {
            // No hedging config: full payout to warChest
            synd.warChest = (synd.warChest ?? 0) + payout;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDS CDO Autocall Payout] Syndicate ${syndicateId} triggered autocall yield payout of ${payout} gold on CDO ${cdoId} tranche equity (Defaults: ${totalDefaults} < ${equityTranche.autocallTriggerLevel}).`
            );
          }

          equityTranche.autocallPaid[syndicateId] = true;
        }
      }
    }

    for (const trancheId of ["senior", "mezzanine", "equity"] as const) {
      let multiplier = 0.90;
      if (trancheId === "mezzanine") multiplier = 0.60;
      else if (trancheId === "equity") multiplier = 0.30;

      // Dynamic adjustment based on target syndicate default alerts of the underlying CDSs
      let activeCount = 0;
      let defaultCount = 0;
      for (const cdsId of pool.cdsIds) {
        const contract = newState.sovereignDebtCDSContracts?.[cdsId];
        if (contract) {
          if (contract.status === "settled") {
            defaultCount++;
          } else if (contract.status === "active") {
            activeCount++;
            // check if target is in default
            const targetSyndicateId = contract.targetSyndicateId;
            const hasAuthorizedDefault = Object.values(newState.sovereignDebtDefaultAlerts || {}).some(
              (alert: any) => alert.targetSyndicateId === targetSyndicateId && alert.status === "authorized" && !alert.resolved
            );
            if (hasAuthorizedDefault) {
              defaultCount++;
            }
          }
        }
      }

      if (defaultCount > 0) {
        const lossImpact = defaultCount / (activeCount + defaultCount || 1);
        if (trancheId === "equity") {
          multiplier = Math.max(0.05, multiplier - lossImpact * 0.5);
        } else if (trancheId === "mezzanine") {
          multiplier = Math.max(0.15, multiplier - lossImpact * 0.3);
        } else {
          multiplier = Math.max(0.50, multiplier - lossImpact * 0.1);
        }
      }

      let lowestAsk = 0;
      const activeTrancheListings: any[] = Object.values(newState.cdsCdoTrancheListings || {}).filter(
        (l: any) => l.cdoId === cdoId && l.trancheId === trancheId && l.status === "active"
      );
      if (activeTrancheListings.length > 0) {
        lowestAsk = Math.min(...activeTrancheListings.map((l: any) => l.askPrice));
      }

      let highestBid = 0;
      const activeTrancheBids: any[] = Object.values(newState.cdsCdoTrancheBids || {}).filter(
        (b: any) => b.cdoId === cdoId && b.trancheId === trancheId && b.status === "active"
      );
      if (activeTrancheBids.length > 0) {
        highestBid = Math.max(...activeTrancheBids.map((b: any) => b.bidPrice));
      }

      const spread = lowestAsk > 0 && highestBid > 0 ? lowestAsk - highestBid : 0;
      const spreadId = `${cdoId}_${trancheId}`;

      newState.cdsCdoTrancheMarketSpreads![spreadId] = {
        spreadId,
        cdoId,
        trancheId,
        highestBid,
        lowestAsk,
        spread,
        fairValue: Math.round(100 * multiplier),
        timestamp: newState.step,
      };

      // Automated Arbitrage Bot
      for (const trancheListing of activeTrancheListings) {
        const listingFairValue = Math.round(trancheListing.sharesAmount * multiplier);
        if (trancheListing.askPrice < listingFairValue) {
          const trancheArbSyndicate: any = Object.values(newState.syndicates || {}).find(
            (synd: any) =>
              synd.id !== trancheListing.sellerSyndicateId &&
              (synd.warChest ?? 0) >= trancheListing.askPrice
          );
          if (trancheArbSyndicate) {
            const bidId = `${cdoId}_${trancheId}_${trancheArbSyndicate.id}_${trancheListing.sharesAmount}_arb`;
            newState.cdsCdoTrancheBids![bidId] = {
              bidId,
              cdoId,
              trancheId,
              bidderSyndicateId: trancheArbSyndicate.id,
              sharesAmount: trancheListing.sharesAmount,
              bidPrice: trancheListing.askPrice,
              status: "active",
              timestamp: newState.step,
              votes: {},
            };
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[CDS CDO Tranche Arbitrage Bot] Syndicate ${trancheArbSyndicate.id} arbitrage bot placed an active matching bid of ${trancheListing.askPrice} gold on undervalued CDO ${cdoId} tranche ${trancheId} (Fair Value: ${listingFairValue} gold for ${trancheListing.sharesAmount} shares).`
            );
            highestBid = trancheListing.askPrice;
            newState.cdsCdoTrancheMarketSpreads![spreadId].highestBid = highestBid;
            newState.cdsCdoTrancheMarketSpreads![spreadId].spread = lowestAsk - highestBid;
            break;
          }
        }
      }

      // Automatic Bid Matching
      for (const trancheListing of activeTrancheListings) {
        if (trancheListing.status !== "active") continue;
        const trancheMatchingBid: any = Object.values(newState.cdsCdoTrancheBids || {}).find(
          (b: any) =>
            b.cdoId === cdoId &&
            b.trancheId === trancheId &&
            b.sharesAmount === trancheListing.sharesAmount &&
            b.status === "active" &&
            b.bidPrice >= trancheListing.askPrice
        );
        if (trancheMatchingBid) {
          const bidderSyndicateId = trancheMatchingBid.bidderSyndicateId;
          const sellerSyndicateId = trancheListing.sellerSyndicateId;
          const bidderSynd = newState.syndicates![bidderSyndicateId];
          const sellerSynd = newState.syndicates![sellerSyndicateId];

          if (bidderSynd && sellerSynd && (bidderSynd.warChest ?? 0) >= trancheListing.askPrice) {
            const sellerShares = pool.tranches[trancheId].sharesOwned[sellerSyndicateId] ?? 0;
            if (sellerShares >= trancheListing.sharesAmount) {
              // Complete trade
              newState.cdsCdoTrancheListings![trancheListing.listingId] = {
                ...trancheListing,
                status: "completed",
              };
              newState.cdsCdoTrancheBids![trancheMatchingBid.bidId] = {
                ...trancheMatchingBid,
                status: "accepted",
              };

              sellerSynd.warChest = (sellerSynd.warChest ?? 0) + trancheListing.askPrice;
              bidderSynd.warChest = Math.max(0, (bidderSynd.warChest ?? 0) - trancheListing.askPrice);

              pool.tranches[trancheId] = {
                ...pool.tranches[trancheId],
                sharesOwned: {
                  ...pool.tranches[trancheId].sharesOwned,
                  [sellerSyndicateId]: sellerShares - trancheListing.sharesAmount,
                  [bidderSyndicateId]: (pool.tranches[trancheId].sharesOwned[bidderSyndicateId] ?? 0) + trancheListing.sharesAmount,
                },
                timestamp: newState.step,
              };

              // Terminate other active listings/bids for same syndicate if their remaining shares are insufficient
              const updatedShares = pool.tranches[trancheId].sharesOwned[sellerSyndicateId];
              for (const [lid, l] of Object.entries(newState.cdsCdoTrancheListings || {})) {
                if (l.sellerSyndicateId === sellerSyndicateId && l.cdoId === cdoId && l.trancheId === trancheId && l.status === "active" && l.sharesAmount > updatedShares) {
                  newState.cdsCdoTrancheListings![lid] = { ...l, status: "cancelled" };
                }
              }

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[CDS CDO Tranche Matched Trade] Automatic bid matching executed. Syndicate ${bidderSyndicateId} purchased ${trancheListing.sharesAmount} shares of CDO ${cdoId} ${trancheId} tranche from Syndicate ${sellerSyndicateId} for ${trancheListing.askPrice} gold.`
              );
            } else {
              newState.cdsCdoTrancheListings![trancheListing.listingId] = {
                ...trancheListing,
                status: "cancelled",
              };
            }
          }
        }
      }

      // AF-232: CDO Tranche Margin Maintenance and Autocallable Yield Triggers under default stress
      const tranche = pool.tranches[trancheId];
      if (tranche) {
        const poolCDSContracts = Object.values(newState.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
        const totalDefaults = poolCDSContracts
          .filter(c => c.status === "settled")
          .reduce((sum, c) => sum + (c.notionalValue ?? 0), 0);

        // Autocallable Yield Trigger
        if (tranche.autocallTriggerLevel !== undefined && tranche.autocallCoupon !== undefined) {
          if (tranche.autocallPaid === undefined) tranche.autocallPaid = {};
          for (const [syndicateId, shares] of Object.entries(tranche.sharesOwned)) {
            if (shares <= 0) continue;
            const synd = newState.syndicates[syndicateId];
            if (!synd) continue;

            if (totalDefaults < tranche.autocallTriggerLevel && !tranche.autocallPaid[syndicateId]) {
              const trancheTotal = tranche.totalValue || 1;
              const initialPayout = Math.floor(tranche.autocallCoupon * (shares / trancheTotal));
              let payout = initialPayout;

              // Check if co-investment yield distribution is active for this CDO pool
              const coinvestProposal = Object.values(newState.cdsCdoCoinvestmentProposals || {}).find(
                (p: any) => p.cdoId === cdoId && p.status === "executed"
              ) as any;
              if (coinvestProposal && coinvestProposal.yieldCompensationShare && coinvestProposal.yieldCompensationShare > 0) {
                const yieldCompensationShare = coinvestProposal.yieldCompensationShare;
                const contributions = coinvestProposal.contributions || {};
                const locked = coinvestProposal.lockedContributions || {};
                const lockedSyndicates = Object.keys(locked).filter(sId => locked[sId] === true);
                const totalLocked = lockedSyndicates.reduce((sum, sId) => sum + (contributions[sId] ?? 0), 0);

                if (totalLocked > 0) {
                  const divertedTotal = Math.floor(initialPayout * (yieldCompensationShare / 100));
                  payout = initialPayout - divertedTotal;

                  coinvestProposal.historicalYieldPayouts = coinvestProposal.historicalYieldPayouts || {};
                  newState.cdsCdoCoinvestmentYieldPayouts = newState.cdsCdoCoinvestmentYieldPayouts || {};

                  for (const sId of lockedSyndicates) {
                    const contribution = contributions[sId] ?? 0;
                    const ratio = contribution / totalLocked;
                    const divertedAmount = Math.floor(divertedTotal * ratio);

                    if (divertedAmount > 0) {
                      const reinvestmentShare = coinvestProposal.yieldReinvestmentShare ?? 0;
                      const reinvestedAmount = Math.floor(divertedAmount * (reinvestmentShare / 100));
                      const paidOutAmount = divertedAmount - reinvestedAmount;

                      const coSynd = newState.syndicates[sId];
                      if (coSynd && paidOutAmount > 0) {
                        coSynd.warChest = (coSynd.warChest ?? 0) + paidOutAmount;
                      }

                      coinvestProposal.historicalYieldPayouts[sId] = (coinvestProposal.historicalYieldPayouts[sId] ?? 0) + paidOutAmount;
                      const globalKey = `${coinvestProposal.proposalId}_${sId}`;
                      newState.cdsCdoCoinvestmentYieldPayouts[globalKey] = (newState.cdsCdoCoinvestmentYieldPayouts[globalKey] ?? 0) + paidOutAmount;

                      if (!newState.journal) newState.journal = [];
                      if (paidOutAmount > 0) {
                        newState.journal.push(
                          `[CDS CDO Co-Investment Yield Payout] Syndicate ${sId} received ${paidOutAmount} gold (pro-rata co-investment yield compensation) from CDO ${cdoId} tranche ${trancheId} autocall.`
                        );
                      }

                      if (reinvestedAmount > 0) {
                        // 1. Add back to syndicate's locked contribution in the CDO pool
                        coinvestProposal.contributions[sId] = (coinvestProposal.contributions[sId] ?? 0) + reinvestedAmount;

                        // 2. Add to the CDO fractionalized vault's balance
                        pool.fractionalizedVault = {
                          ...pool.fractionalizedVault,
                          balance: pool.fractionalizedVault.balance + reinvestedAmount,
                        };

                        // 3. Track in historicalYieldReinvestments
                        coinvestProposal.historicalYieldReinvestments = coinvestProposal.historicalYieldReinvestments || {};
                        coinvestProposal.historicalYieldReinvestments[sId] = (coinvestProposal.historicalYieldReinvestments[sId] ?? 0) + reinvestedAmount;

                        // 4. Track globally in cdsCdoCoinvestmentYieldReinvestments
                        newState.cdsCdoCoinvestmentYieldReinvestments = newState.cdsCdoCoinvestmentYieldReinvestments || {};
                        newState.cdsCdoCoinvestmentYieldReinvestments[globalKey] = (newState.cdsCdoCoinvestmentYieldReinvestments[globalKey] ?? 0) + reinvestedAmount;

                        newState.journal.push(
                          `[CDS CDO Co-Investment Yield Reinvestment] Syndicate ${sId} reinvested ${reinvestedAmount} gold back into CDO ${cdoId} pool via co-investment proposal ${coinvestProposal.proposalId}.`
                        );
                      }
                    }
                  }
                }
              }

              synd.warChest = (synd.warChest ?? 0) + payout;
              tranche.autocallPaid[syndicateId] = true;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[CDS CDO Autocall Payout] Syndicate ${syndicateId} triggered autocall yield payout of ${payout} gold on CDO ${cdoId} tranche ${trancheId} (Defaults: ${totalDefaults} < ${tranche.autocallTriggerLevel}).`
              );
            }
          }
        }

        // Margin Maintenance Call & Liquidation (Only if marginCollateral is explicitly initialized/tracked on this tranche)
        if (tranche.marginCollateral !== undefined) {
          if (tranche.marginCallActive === undefined) tranche.marginCallActive = {};
          if (tranche.liquidityBuffer === undefined) tranche.liquidityBuffer = {};

          const scaling = trancheId === "senior" ? 1.0 : trancheId === "mezzanine" ? 0.6 : 0.2;
          const defaultRatio = totalDefaults / (pool.totalNotional || 1);

          tranche.marginRequirement = Math.floor(tranche.totalValue * defaultRatio * scaling);
          tranche.maintenanceThreshold = Math.floor(tranche.marginRequirement * 0.8);

          for (const [syndicateId, shares] of Object.entries(tranche.sharesOwned)) {
            if (shares <= 0) continue;
            const synd = newState.syndicates[syndicateId];
            if (!synd) continue;

            const trancheTotal = tranche.totalValue || 1;
            const syndicateMarginReq = Math.floor(tranche.marginRequirement * (shares / trancheTotal));
            const syndicateMaintenanceThreshold = Math.floor(tranche.maintenanceThreshold * (shares / trancheTotal));
            const currentCollateral = tranche.marginCollateral[syndicateId] ?? 0;

            const leverage = tranche.leverageRatio?.[syndicateId] ?? 1.0;
            const threshold = tranche.deleveragingThreshold?.[syndicateId] ?? 0;

            const effectiveMarginReq = Math.floor(syndicateMarginReq * leverage);
            const effectiveMaintenanceThreshold = Math.floor(syndicateMaintenanceThreshold * leverage);
            const liquidityCushion = currentCollateral - effectiveMaintenanceThreshold;

            tranche.liquidityBuffer[syndicateId] = liquidityCushion;

            if (syndicateMarginReq > 0 && (currentCollateral < effectiveMaintenanceThreshold || liquidityCushion < threshold)) {
              const drawdownAmount = effectiveMarginReq - currentCollateral;
              if (drawdownAmount > 0) {
                if ((synd.warChest ?? 0) >= drawdownAmount) {
                  synd.warChest = (synd.warChest ?? 0) - drawdownAmount;
                  tranche.marginCollateral[syndicateId] = effectiveMarginReq;
                  tranche.marginCallActive[syndicateId] = false;
                  tranche.liquidityBuffer[syndicateId] = effectiveMarginReq - effectiveMaintenanceThreshold;

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[CDS CDO Margin Drawdown] Automated capital drawdown of ${drawdownAmount} gold from Syndicate ${syndicateId} war chest to cover CDO ${cdoId} tranche ${trancheId} leveraged margin requirement.`
                  );
                } else {
                  const partialDrawdown = synd.warChest ?? 0;
                  let updatedCollateral = currentCollateral;
                  if (partialDrawdown > 0) {
                    synd.warChest = 0;
                    updatedCollateral += partialDrawdown;
                    tranche.marginCollateral[syndicateId] = updatedCollateral;
                    tranche.liquidityBuffer[syndicateId] = updatedCollateral - effectiveMaintenanceThreshold;
                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[CDS CDO Margin Drawdown] Automated partial capital drawdown of ${partialDrawdown} gold from Syndicate ${syndicateId} war chest to cover CDO ${cdoId} tranche ${trancheId} leveraged margin requirement.`
                    );
                  }

                  // If still below threshold, trigger auto-deleveraging
                  if (leverage > 1.0 && updatedCollateral < effectiveMaintenanceThreshold) {
                    const newLeverageRatio = Math.max(1.0, Number((updatedCollateral / (syndicateMaintenanceThreshold || 1)).toFixed(4)));
                    if (newLeverageRatio < leverage) {
                      if (tranche.leverageRatio === undefined) tranche.leverageRatio = {};
                      tranche.leverageRatio[syndicateId] = newLeverageRatio;

                      const newEffectiveMaintenanceThreshold = Math.floor(syndicateMaintenanceThreshold * newLeverageRatio);
                      tranche.liquidityBuffer[syndicateId] = updatedCollateral - newEffectiveMaintenanceThreshold;

                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[CDS CDO Auto-Deleveraging] Syndicate ${syndicateId} auto-deleveraged CDO ${cdoId} tranche ${trancheId} from leverage ${leverage} to ${newLeverageRatio} to avoid liquidation (New maintenance threshold: ${newEffectiveMaintenanceThreshold}).`
                      );

                      if (updatedCollateral >= newEffectiveMaintenanceThreshold) {
                        tranche.marginCallActive[syndicateId] = false;
                        continue;
                      }
                    }
                  }

                  // If still below required margin, initiate/fail margin call
                  const finalLeverage = tranche.leverageRatio?.[syndicateId] ?? leverage;
                  const finalMaintenanceThreshold = Math.floor(syndicateMaintenanceThreshold * finalLeverage);

                  if (updatedCollateral < finalMaintenanceThreshold) {
                    if (!tranche.marginCallActive[syndicateId]) {
                      tranche.marginCallActive[syndicateId] = true;
                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[CDS CDO Margin Call Initiated] Syndicate ${syndicateId} is in margin call on CDO ${cdoId} tranche ${trancheId} (Collateral: ${updatedCollateral}, Required: ${finalMaintenanceThreshold}).`
                      );
                    } else {
                      const liquidatedShares = Math.min(shares, Math.max(1, Math.floor(shares * 0.2)));
                      tranche.sharesOwned[syndicateId] = shares - liquidatedShares;
                      tranche.totalValue = Math.max(0, tranche.totalValue - liquidatedShares);
                      tranche.marginCallActive[syndicateId] = false;

                      if (!newState.journal) newState.journal = [];
                      newState.journal.push(
                        `[CDS CDO Margin Liquidation] Syndicate ${syndicateId} failed margin call. Liquidated ${liquidatedShares} shares of CDO ${cdoId} tranche ${trancheId}.`
                      );
                    }
                  } else {
                    tranche.marginCallActive[syndicateId] = false;
                  }
                }
              } else {
                tranche.marginCallActive[syndicateId] = false;
              }
            } else if (syndicateMarginReq > 0 && currentCollateral >= effectiveMaintenanceThreshold) {
              tranche.marginCallActive[syndicateId] = false;
            }
          }
        }
        pool.tranches[trancheId] = tranche;
        newState.sovereignDebtCDSCDOPools[cdoId] = pool;
      }
    }
  }

  return newState as GameState;
}

export function tickSovereignDebtDefaultAlerts(state: GameState): GameState {
  const newState = {
    ...state,
    factionRep: state.factionRep ? { ...state.factionRep } : {},
    journal: state.journal ? [...state.journal] : [],
    sovereignDebtDefaultGracePeriods: state.sovereignDebtDefaultGracePeriods ? { ...state.sovereignDebtDefaultGracePeriods } : {},
  };

  const activeAlerts = Object.values(newState.sovereignDebtDefaultAlerts || {}).filter(
    (alert: any) => alert.status === "authorized" && !alert.resolved
  );

  for (const alert of activeAlerts) {
    const targetSyndicateId = alert.targetSyndicateId;
    const outstandingFee = newState.outstandingDeflectionFees?.[targetSyndicateId] ?? 0;
    
    if (outstandingFee > 0) {
      // AF-227: Check if active grace periods or authorized waivers are in effect for this alert
      const activeGracePeriod = Object.values(newState.sovereignDebtDefaultGracePeriods || {}).find(
        (gp: any) => gp.alertProposalId === alert.proposalId && gp.status === "authorized" && gp.remainingSteps !== undefined && gp.remainingSteps > 0
      ) as any;

      const isWaiverActive = Object.values(newState.sovereignDebtDefaultPenaltyWaivers || {}).some(
        (pw: any) => pw.alertProposalId === alert.proposalId && pw.status === "authorized" && !pw.resolved
      );

      if (activeGracePeriod) {
        newState.journal.push(
          `[Sovereign Debt Default Alert Penalty Deferred] Syndicate ${targetSyndicateId} bypasses reputation penalty due to active default grace period extension (Remaining: ${activeGracePeriod.remainingSteps} steps, Alert ID: ${alert.proposalId}).`
        );
        continue;
      }

      if (isWaiverActive) {
        newState.journal.push(
          `[Sovereign Debt Default Alert Penalty Deferred] Syndicate ${targetSyndicateId} bypasses reputation penalty due to authorized default penalty waiver (Alert ID: ${alert.proposalId}).`
        );
        continue;
      }

      const isFeeExempt = newState.cdsCdoFeeExemptions?.[targetSyndicateId] === true;
      if (isFeeExempt) {
        newState.journal.push(
          `[Sovereign Debt Default Alert Penalty Deferred] Syndicate ${targetSyndicateId} bypasses reputation penalty due to active CDO liquidity injection fee exemption.`
        );
        continue;
      }

      const partialWaiver = newState.cdsCdoPartialFeeWaivers?.[targetSyndicateId] ?? 0;
      const currentRep = newState.factionRep[targetSyndicateId] ?? 0;
      const basePenalty = 15;
      const penalty = Math.round(basePenalty * (1 - partialWaiver));

      if (partialWaiver > 0) {
        if (penalty === 0) {
          newState.journal.push(
            `[Sovereign Debt Default Alert Penalty Deferred] Syndicate ${targetSyndicateId} bypasses reputation penalty due to active CDO co-investment partial fee waiver (${(partialWaiver * 100).toFixed(0)}% waiver).`
          );
          continue;
        } else {
          newState.factionRep[targetSyndicateId] = currentRep - penalty;
          newState.journal.push(
            `[Sovereign Debt Default Alert Penalty Reduced] Syndicate ${targetSyndicateId} reputation penalty reduced to -${penalty} due to active CDO co-investment partial fee waiver (${(partialWaiver * 100).toFixed(0)}% waiver).`
          );
          continue;
        }
      }

      newState.factionRep[targetSyndicateId] = currentRep - basePenalty;
      newState.journal.push(
        `[Sovereign Debt Default Alert Penalty] Syndicate ${targetSyndicateId} failed to service outstanding deflection fee of ${outstandingFee} gold. Applied reputation penalty of -${basePenalty} faction reputation (New Faction Reputation: ${newState.factionRep[targetSyndicateId]}).`
      );
    }
  }

  // Decrement remaining steps of active grace periods after check
  for (const [id, gp] of Object.entries(newState.sovereignDebtDefaultGracePeriods || {})) {
    const gpObj = gp as any;
    if (gpObj.status === "authorized" && gpObj.remainingSteps !== undefined && gpObj.remainingSteps > 0) {
      newState.sovereignDebtDefaultGracePeriods[id] = {
        ...gpObj,
        remainingSteps: gpObj.remainingSteps - 1,
      };
    }
  }

  return newState;
}


export function tickSWFReinsuranceOptionPeerLending(state: GameState): GameState {
  if (!state.swfReinsuranceOptionPeerLendingRequests) return state;

  const newState = {
    ...state,
    swfReinsuranceOptionPeerLendingRequests: { ...state.swfReinsuranceOptionPeerLendingRequests },
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    creditRatings: state.creditRatings ? { ...state.creditRatings } : {},
    journal: state.journal ? [...state.journal] : [],
  };

  for (const [requestId, request] of Object.entries(newState.swfReinsuranceOptionPeerLendingRequests)) {
    if (request.status !== "Active") continue;

    const borrowerId = request.borrowerSyndicateId;

    // Check if loan is due and unpaid
    if (newState.step >= (request.dueStep ?? 0)) {
      if ((request.remainingRepayment ?? 0) > 0) {
        // Default!
        request.status = "Defaulted";
        request.resolved = true;

        // Apply credit rating drop penalty
        const rating = newState.creditRatings[borrowerId] ?? 10;
        newState.creditRatings[borrowerId] = Math.max(0, rating - 2);

        newState.journal.push(
          `[SWF Reinsurance Option Peer Lending Default] Syndicate ${borrowerId} defaulted on peer lending loan ${requestId} (due step: ${request.dueStep}, remaining repayment: ${request.remainingRepayment} gold). Credit rating dropped to ${newState.creditRatings[borrowerId]}.`
        );
      } else {
        request.status = "Repaid";
        request.resolved = true;
      }
    }
  }

  return newState;
}

export function tickSWFMultiFundReinsurance(state: GameState): GameState {
  if (!state.swfMultiFundReinsurancePools) return state;

  const newState = {
    ...state,
    swfMultiFundReinsurancePools: { ...state.swfMultiFundReinsurancePools },
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    marginAccounts: state.marginAccounts ? { ...state.marginAccounts } : {},
    journal: state.journal ? [...state.journal] : [],
  };

  for (const [poolId, pool] of Object.entries(newState.swfMultiFundReinsurancePools)) {
    if (!pool.active) continue;

    // 1. Determine current volatility dynamically using state.step and pool's historicalVolatility
    const stepFluc = (newState.step % 6) * 10;
    const spotVolatility = Math.max(10.0, pool.historicalVolatility + stepFluc);

    // Calculate dynamically adjusted fractionalBridgeRatio based on linkStateDropRate and volatilityShock
    let bridgeRatio = pool.fractionalBridgeRatio ?? 0.4;
    const baseRatio = pool.baseBridgeRatio ?? pool.fractionalBridgeRatio ?? 0.4;
    if (pool.fractionalYieldBridgingEnabled) {
      if (pool.linkStateDropRate !== undefined || pool.volatilityShock !== undefined) {
        const dropRate = pool.linkStateDropRate ?? 0;
        const shock = pool.volatilityShock ?? 0;
        const adjustment = (dropRate * 0.5) + (shock * 0.01);
        bridgeRatio = Math.min(1.0, Math.max(0.0, baseRatio + adjustment));
        
        if (bridgeRatio !== baseRatio) {
          newState.journal.push(
            `[SWF Multi-Fund Reinsurance Dynamic Pricing] Adjusted fractionalBridgeRatio dynamically from ${baseRatio.toFixed(4)} to ${bridgeRatio.toFixed(4)} due to link-state drop rate (${(pool.linkStateDropRate ?? 0).toFixed(2)}) and volatility shock (${(pool.volatilityShock ?? 0).toFixed(2)}%).`
          );
        }
      }
    }

    // 2. Automated Rebalancing: calculate required capital based on volatility and hedge ratio
    const requiredCapitalMultiplier = 1.0 + (spotVolatility / 100.0) * pool.volatilityHedgeRatio;
    const totalRequired = Math.round(2000 * requiredCapitalMultiplier);

    const participatingSyndicates = pool.syndicateIds;
    const numSyndicates = participatingSyndicates.length;
    if (numSyndicates === 0) continue;

    const targetSharePerSyndicate = Math.round(totalRequired / numSyndicates);

    // Track updated allocated capital
    const newCapitalAllocated = { ...pool.capitalAllocated };

    // Initialize pool collateral and dividend structures if enabling bridging
    let currentPoolCollateral = pool.poolCollateral ? { ...pool.poolCollateral } : {};
    let currentDividends = pool.fractionalDividendPayouts ? { ...pool.fractionalDividendPayouts } : {};
    if (pool.fractionalYieldBridgingEnabled) {
      if (currentPoolCollateral.collective === undefined) {
        currentPoolCollateral.collective = 0;
      }
    }

    for (const syndicateId of participatingSyndicates) {
      const syndicate = newState.syndicates[syndicateId];
      if (!syndicate) continue;

      const currentAllocated = newCapitalAllocated[syndicateId] ?? 0;
      if (currentAllocated < targetSharePerSyndicate) {
        // Need to deposit/increase capital
        const needed = targetSharePerSyndicate - currentAllocated;
        const available = syndicate.warChest ?? 0;
        const toDeposit = Math.min(needed, available);

        if (toDeposit > 0) {
          newState.syndicates[syndicateId] = {
            ...syndicate,
            warChest: Math.max(0, (syndicate.warChest ?? 0) - toDeposit),
          };
          newCapitalAllocated[syndicateId] = currentAllocated + toDeposit;
          newState.journal.push(
            `[SWF Multi-Fund Rebalance Deposit] Syndicate ${syndicateId} deposited ${toDeposit} gold to Reinsurance Pool ${poolId} to maintain volatility-hedged share of ${targetSharePerSyndicate} gold (Spot Volatility: ${spotVolatility.toFixed(2)}%).`
          );
        }

        // Reserve Recovery Tick: Draw from collective pool collateral if syndicate cannot meet its target share
        if (pool.fractionalYieldBridgingEnabled && newCapitalAllocated[syndicateId] < targetSharePerSyndicate) {
          const stillNeeded = targetSharePerSyndicate - newCapitalAllocated[syndicateId];
          const collAvailable = currentPoolCollateral.collective ?? 0;
          const drawn = Math.min(stillNeeded, collAvailable);

          if (drawn > 0) {
            currentPoolCollateral.collective = collAvailable - drawn;
            newCapitalAllocated[syndicateId] += drawn;
            newState.journal.push(
              `[SWF Multi-Fund Reserve Recovery] Recovers capital for distressed Syndicate ${syndicateId} using bridged pool collateral (Recovered: ${drawn} gold from collective collateral reserve).`
            );
          }
        }
      } else if (currentAllocated > targetSharePerSyndicate) {
        // Excess capital refund
        const excess = currentAllocated - targetSharePerSyndicate;
        newState.syndicates[syndicateId] = {
          ...syndicate,
          warChest: (syndicate.warChest ?? 0) + excess,
        };
        newCapitalAllocated[syndicateId] = targetSharePerSyndicate;
        newState.journal.push(
          `[SWF Multi-Fund Rebalance Refund] Syndicate ${syndicateId} refunded ${excess} gold of excess reserve from Reinsurance Pool ${poolId} (Target: ${targetSharePerSyndicate} gold, Spot Volatility: ${spotVolatility.toFixed(2)}%).`
        );
      }
    }

    // Update totalReserve
    const newTotalReserve = Object.values(newCapitalAllocated).reduce((sum, val) => sum + val, 0);

    // 3. Dynamic Yield Arbitrage Routing & Fractional Bridging
    let arbitrageGoldEarned = 0;
    if (pool.arbitrageRoutes && pool.arbitrageRoutes.length > 0) {
      let maxTargetYield = 0.15;
      for (const routeTarget of pool.arbitrageRoutes) {
        const targetCdo = newState.swfYieldCDOs?.[routeTarget];
        if (targetCdo && targetCdo.tranches) {
          const maxTrancheYield = Math.max(...Object.values(targetCdo.tranches).map((t: any) => t.yieldRate ?? 0));
          if (maxTrancheYield > maxTargetYield) {
            maxTargetYield = maxTrancheYield;
          }
        }
      }

      const yieldSpread = maxTargetYield - pool.targetYieldRate;
      if (yieldSpread > 0) {
        const routedCapital = Math.round(newTotalReserve * 0.25);
        arbitrageGoldEarned = Math.round(routedCapital * yieldSpread);
      }
    }

    // Generate base yield if no arbitrage target or spread to ensure there is always some yield
    let totalYield = arbitrageGoldEarned;
    if (totalYield === 0 && pool.targetYieldRate > 0) {
      totalYield = Math.round(newTotalReserve * pool.targetYieldRate);
    }

    if (totalYield > 0) {
      if (pool.fractionalYieldBridgingEnabled) {
        const bridgedYield = Math.round(totalYield * bridgeRatio);
        const remainingYield = totalYield - bridgedYield;

        // Route the bridged yield to the collective collateral reserve
        if (bridgedYield > 0) {
          currentPoolCollateral.collective = (currentPoolCollateral.collective ?? 0) + bridgedYield;

          // Track fractional dividend payouts
          const divShare = Math.floor(bridgedYield / numSyndicates);
          if (divShare > 0) {
            for (const syndicateId of participatingSyndicates) {
              currentDividends[syndicateId] = (currentDividends[syndicateId] ?? 0) + divShare;
            }
          }

          newState.journal.push(
            `[SWF Multi-Fund Fractional Yield Bridged] Pool ${poolId} bridged ${bridgedYield} gold of yield across mesh to collective collateral pool (Fractional Dividend Share: ${divShare} gold per syndicate).`
          );
        }

        // Distribute remaining yield directly to war chests
        if (remainingYield > 0) {
          const sharePerSyndicate = Math.floor(remainingYield / numSyndicates);
          if (sharePerSyndicate > 0) {
            for (const syndicateId of participatingSyndicates) {
              const syndicate = newState.syndicates[syndicateId];
              if (syndicate) {
                newState.syndicates[syndicateId] = {
                  ...syndicate,
                  warChest: (syndicate.warChest ?? 0) + sharePerSyndicate,
                };
              }
            }
            newState.journal.push(
              `[SWF Multi-Fund Yield Payout] Distributed ${remainingYield} gold of direct yield to participants (${sharePerSyndicate} gold each).`
            );
          }
        }
      } else {
        // Normal non-bridged distribution
        const sharePerSyndicate = Math.floor(totalYield / numSyndicates);
        if (sharePerSyndicate > 0) {
          for (const syndicateId of participatingSyndicates) {
            const syndicate = newState.syndicates[syndicateId];
            if (syndicate) {
              newState.syndicates[syndicateId] = {
                ...syndicate,
                warChest: (syndicate.warChest ?? 0) + sharePerSyndicate,
              };
            }
          }
          if (arbitrageGoldEarned > 0) {
            newState.journal.push(
              `[SWF Reinsurance Pool Arbitrage] Pool ${poolId} routed ${Math.round(newTotalReserve * 0.25)} gold to high-yield targets, earning ${arbitrageGoldEarned} gold arbitrage yield (distributed ${sharePerSyndicate} gold to each participant).`
            );
          } else {
            newState.journal.push(
              `[SWF Reinsurance Pool Base Yield] Pool ${poolId} generated ${totalYield} gold base yield (distributed ${sharePerSyndicate} gold to each participant).`
            );
          }
        }
      }
    }

    // Dynamic Collateral Sweep: if collective reserve exceeds the crossMeshReserveTarget, distribute the excess
    if (pool.fractionalYieldBridgingEnabled && pool.crossMeshReserveTarget && (currentPoolCollateral.collective ?? 0) > pool.crossMeshReserveTarget) {
      const excessCollateral = currentPoolCollateral.collective! - pool.crossMeshReserveTarget;
      currentPoolCollateral.collective = pool.crossMeshReserveTarget;
      const excessShare = Math.floor(excessCollateral / numSyndicates);
      if (excessShare > 0) {
        for (const syndicateId of participatingSyndicates) {
          const syndicate = newState.syndicates[syndicateId];
          if (syndicate) {
            newState.syndicates[syndicateId] = {
              ...syndicate,
              warChest: (syndicate.warChest ?? 0) + excessShare,
            };
          }
        }
        newState.journal.push(
          `[SWF Multi-Fund Collateral Sweep] Pool ${poolId} swept excess collateral of ${excessCollateral} gold above target of ${pool.crossMeshReserveTarget} gold, distributing ${excessShare} gold to each participant.`
        );
      }
    }

    // Save updated pool state
    newState.swfMultiFundReinsurancePools[poolId] = {
      ...pool,
      capitalAllocated: newCapitalAllocated,
      totalReserve: newTotalReserve,
      historicalVolatility: spotVolatility,
      timestamp: newState.step,
      poolCollateral: currentPoolCollateral,
      fractionalDividendPayouts: currentDividends,
      fractionalBridgeRatio: pool.fractionalYieldBridgingEnabled ? parseFloat(bridgeRatio.toFixed(4)) : pool.fractionalBridgeRatio,
    };
  }

  return newState;
}

/**
 * Resolves the faction for an NPC by first checking npc.faction,
 * then falling back to the room's faction where the NPC is defined in the pack,
 * and finally falling back to the state's territory control.
 */
export function getFactionForNpc(state: GameState, npcId: string, pack: any): string | undefined {
  if (!pack) {
    console.log("getFactionForNpc: pack is falsy!");
    return undefined;
  }
  const npc = pack.npcs?.find((n: any) => n.id === npcId);
  if (!npc) {
    console.log("getFactionForNpc: npc not found for id:", npcId, "available npcs:", JSON.stringify(pack.npcs?.map((n: any) => n.id)));
    return undefined;
  }
  if (npc.faction) return npc.faction;
  
  // Find room containing this NPC in the pack definition
  const room = pack.rooms?.find((r: any) => r.npcs?.includes(npcId));
  if (room && room.faction) return room.faction;

  // Fallback to room controlling faction if npc is in the current room
  if (state.current && pack.rooms?.find((r: any) => r.id === state.current)?.npcs?.includes(npcId)) {
    return state.territoryControl?.[state.current];
  }
  return undefined;
}

/**
 * Calculates dynamic trade transaction count and gold volume caps for a given faction
 * based on the player's reputation with that faction.
 */
export function getMerchantTradeCaps(state: GameState, factionId: string): { maxTransactions: number; maxGoldVolume: number } {
  const rep = state.factionRep?.[factionId] ?? 0;
  if (rep < 0) {
    // Hostile standing
    return { maxTransactions: 1, maxGoldVolume: 50 };
  } else if (rep < 10) {
    // Neutral standing
    return {
      maxTransactions: 3 + Math.floor(rep / 2),
      maxGoldVolume: 150 + rep * 10
    };
  } else {
    // Friendly / Allied standing
    return {
      maxTransactions: 10 + Math.floor(rep / 5),
      maxGoldVolume: 500 + rep * 20
    };
  }
}

/**
 * Scans the player's inventory and returns a list of items that are flagged as contraband
 * either in the pack definition or via the synchronized gossip contraband blacklist.
 */
export function getContrabandInInventory(state: GameState, pack: any): string[] {
  const contrabandItems: string[] = [];
  if (!pack || !pack.objects || !state.inventory) return [];
  for (const itemId of state.inventory) {
    const packObj = pack.objects.find((o: any) => o.id === itemId);
    const isPackContraband = packObj?.contraband === true;
    const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
    if (isPackContraband || isBlacklisted) {
      contrabandItems.push(itemId);
    }
  }
  return contrabandItems;
}

/**
 * Scans all merchants and their inventories to find profitable arbitrage loops
 * where an item can be bought from one merchant and sold to another for a profit.
 */
export function findArbitrageOpportunities(
  state: GameState,
  pack: any
): Array<{
  item: string;
  buyNpc: string;
  sellNpc: string;
  cost: number;
  payout: number;
  profit: number;
}> {
  const opportunities: any[] = [];
  if (!pack || !pack.npcs || !pack.objects) return opportunities;

  for (const npcA of pack.npcs) {
    const stock = state.merchantInventories?.[npcA.id] ?? [];
    for (const itemId of stock) {
      const packObj = pack.objects.find((o: any) => o.id === itemId);
      if (!packObj) continue;

      // 1. Calculate buy price from npcA (player buying from npcA)
      const cost = calculateTradePrice(state, npcA, packObj, packObj.cost ?? 10, true);

      for (const npcB of pack.npcs) {
        if (npcA.id === npcB.id) continue;

        // 2. Calculate sell price to npcB (player selling to npcB)
        const payout = calculateTradePrice(state, npcB, packObj, packObj.cost ?? 10, false);

        if (payout > cost) {
          opportunities.push({
            item: itemId,
            buyNpc: npcA.id,
            sellNpc: npcB.id,
            cost,
            payout,
            profit: payout - cost,
          });
        }
      }
    }
  }

  // Sort by profit descending
  return opportunities.sort((a, b) => b.profit - a.profit);
}

/**
 * Calculates dynamic insurance premium for a smuggling convoy.
 * Factors in convoy cargo size, route enforcement heat, active factions/reputation,
 * and historical syndicate loss rates.
 */
export function calculateConvoyInsurancePremium(state: GameState, convoyId: string): number {
  const convoy = state.smugglingConvoys?.[convoyId];
  if (!convoy) {
    return 150; // Fallback
  }

  // Base premium is proportional to cargo size
  const basePremium = convoy.cargo * 50;

  // 1. Route Risk Evaluation (Room enforcement heat and controlling factions)
  const route = state.tradeRoutes?.[convoy.routeId];
  let totalHeat = 0;
  let factionRepPenalty = 0;

  if (route && route.rooms) {
    for (const roomId of route.rooms) {
      // enforcement heat
      const roomHeat = state.enforcementHeat?.[roomId]?.heat ?? 0;
      totalHeat += roomHeat;

      // active faction
      const factionId = state.territoryControl?.[roomId];
      if (factionId) {
        const rep = state.factionRep?.[factionId] ?? 0;
        if (rep < 0) {
          factionRepPenalty += Math.abs(rep);
        } else {
          factionRepPenalty -= rep * 0.5; // Friendly faction reduces risk
        }
      }
    }
  }

  // Combine route heat and faction reputation into route risk multiplier
  const routeRiskMultiplier = Math.max(0.5, 1.0 + (totalHeat * 0.015) + (factionRepPenalty * 0.02));

  // 2. Historical Syndicate Loss Rate
  const syndicateConvoys = Object.values(state.smugglingConvoys || {}).filter(
    (c) => c.syndicateId === convoy.syndicateId
  );
  const finishedConvoys = syndicateConvoys.filter(
    (c) => c.status === "completed" || c.status === "ambushed"
  );
  const lostConvoys = finishedConvoys.filter((c) => c.status === "ambushed");

  let lossRate = 0;
  if (finishedConvoys.length > 0) {
    lossRate = lostConvoys.length / finishedConvoys.length;
  }

  // Loss rate multiplier: ranges from 1.0 (no history or 0% losses) up to 2.0 (100% losses)
  const lossRateMultiplier = 1.0 + lossRate * 1.0;

  const finalPremium = Math.round(basePremium * routeRiskMultiplier * lossRateMultiplier);

  // Ensure premium is a positive integer, at least 10 gold
  return Math.max(10, finalPremium);
}

/**
 * Calculates the dynamic black-market exchange rate for counterfeit gold.
 * Fluctuates based on base rate, regional enforcer heat (lowers rate), and syndicate dominance (raises rate).
 */
export function getCounterfeitExchangeRate(
  state: GameState,
  syndicateId: string,
  roomId: string
): number {
  const baseRate = state.tradeExchangeRates?.[syndicateId]?.baseRate ?? 1.0;
  const heat = state.enforcementHeat?.[roomId]?.heat ?? 0;
  const dominance = state.syndicates?.[syndicateId]?.dominance ?? 50;

  // Equation: rate = baseRate * (1 - heat / 200) * (1 + dominance / 200)
  const heatFactor = Math.max(0.1, 1 - heat / 200);
  const dominanceFactor = 1 + dominance / 200;
  const rate = baseRate * heatFactor * dominanceFactor;

  // Bound exchange rate between 0.1 and 2.0
  return Math.max(0.1, Math.min(2.0, rate));
}

export function distributeReinsuranceLiquidityMiningRewards(state: GameState): GameState {
  const newState = {
    ...state,
    swfLiquidityMiningRewards: state.swfLiquidityMiningRewards ? { ...state.swfLiquidityMiningRewards } : {},
    journal: state.journal ? [...state.journal] : [],
  };

  const allOpenOrders = Object.values(newState.swfReinsuranceOptionLimitOrders || {}).filter(
    (o) => o.status === "Open" && o.size > 0
  );

  // Group open orders by CDO_Tranche key
  const groupedOrders: Record<string, typeof allOpenOrders> = {};
  for (const order of allOpenOrders) {
    const key = `${order.swfYieldCdoId}_${order.trancheId}`;
    if (!groupedOrders[key]) groupedOrders[key] = [];
    groupedOrders[key].push(order);
  }

  for (const [key, orders] of Object.entries(groupedOrders)) {
    const buyOrders = orders.filter((o) => o.orderType === "buy");
    const sellOrders = orders.filter((o) => o.orderType === "sell");

    const buyPrices = buyOrders.map((o) => o.limitPrice / o.size);
    const sellPrices = sellOrders.map((o) => o.limitPrice / o.size);

    const highestBuy = buyPrices.length > 0 ? Math.max(...buyPrices) : 0;
    const lowestSell = sellPrices.length > 0 ? Math.min(...sellPrices) : 0;

    let midMarketPrice: number | undefined;
    if (highestBuy > 0 && lowestSell > 0) {
      midMarketPrice = (highestBuy + lowestSell) / 2;
    } else if (highestBuy > 0) {
      midMarketPrice = highestBuy;
    } else if (lowestSell > 0) {
      midMarketPrice = lowestSell;
    }

    if (midMarketPrice === undefined) continue;

    for (const order of orders) {
      const orderPrice = order.limitPrice / order.size;
      const closeness = 1 / (1 + Math.abs(orderPrice - midMarketPrice));
      
      // Calculate reward: size * closeness * 0.1
      const baseReward = order.size * closeness * 0.1;
      const multiplier = newState.marginAccounts?.[order.syndicateId]?.swfLiquidityMiningMultiplier ?? 1.0;
      const tickReward = Math.floor(baseReward * multiplier);

      if (tickReward > 0) {
        newState.swfLiquidityMiningRewards![order.syndicateId] = (newState.swfLiquidityMiningRewards![order.syndicateId] ?? 0) + tickReward;
        
        newState.journal.push(
          `[SWF Reinsurance Liquidity Mining Reward] Syndicate ${order.syndicateId} accrued ${tickReward} pending rewards for order ${order.id} (Price: ${orderPrice.toFixed(4)}, Mid: ${midMarketPrice.toFixed(4)}, Closeness: ${closeness.toFixed(4)}, Multiplier: ${multiplier.toFixed(2)}x).`
        );
      }
    }
  }

  return newState;
}

function getSyndicateCartelPolicy(state: GameState, syndicateId: string): any {
  if (!state.cartels) return undefined;
  const syndicate = state.syndicates?.[syndicateId];
  const syndicateMembers = syndicate ? syndicate.members : [];
  
  for (const [cartelId, cartel] of Object.entries(state.cartels)) {
    const isMember = cartel.members.includes(syndicateId) ||
                     state.cartelMemberships?.[syndicateId]?.includes(cartelId) ||
                     syndicateMembers.some(m => cartel.members.includes(m) || state.cartelMemberships?.[m]?.includes(cartelId));
    if (isMember) {
      const policy = state.cartelPolicies?.[cartelId];
      if (policy && (
        policy.reinsuranceOptionRebateMultiplier !== undefined ||
        policy.reinsuranceOptionVolatilityHedgeFactor !== undefined ||
        policy.reinsuranceOptionPartitionRiskFactor !== undefined
      )) {
        return policy;
      }
    }
  }
  return undefined;
}

function getSyndicateGuildPolicy(state: GameState, syndicateId: string): any {
  if (!state.merchantGuilds) return undefined;
  const syndicate = state.syndicates?.[syndicateId];
  const syndicateMembers = syndicate ? syndicate.members : [];
  
  for (const [guildId, guild] of Object.entries(state.merchantGuilds)) {
    const isMember = guild.members.includes(syndicateId) ||
                     state.guildMemberships?.[syndicateId]?.includes(guildId) ||
                     syndicateMembers.some(m => guild.members.includes(m) || state.guildMemberships?.[m]?.includes(guildId));
    if (isMember) {
      const policy = state.guildPolicies?.[guildId];
      if (policy && (
        policy.reinsuranceOptionRebateMultiplier !== undefined ||
        policy.reinsuranceOptionVolatilityHedgeFactor !== undefined ||
        policy.reinsuranceOptionPartitionRiskFactor !== undefined
      )) {
        return policy;
      }
    }
  }
  return undefined;
}

export function matchSWFReinsuranceOptionLimitOrders(state: GameState): GameState {
  const newState = {
    ...state,
    swfReinsuranceOptionLimitOrders: state.swfReinsuranceOptionLimitOrders ? { ...state.swfReinsuranceOptionLimitOrders } : {},
    swfReinsuranceOptionsContracts: state.swfReinsuranceOptionsContracts ? { ...state.swfReinsuranceOptionsContracts } : {},
    syndicates: state.syndicates ? { ...state.syndicates } : {},
  };

  const openOrders = Object.values(newState.swfReinsuranceOptionLimitOrders).filter(
    (o) => o.status === "Open"
  );

  const buyOrders = openOrders.filter((o) => o.orderType === "buy");
  const sellOrders = openOrders.filter((o) => o.orderType === "sell");

  // Sort buy orders descending by limit price per unit (highest buy first), then by timestamp ascending (earlier first)
  buyOrders.sort((a, b) => {
    const priceA = a.limitPrice / a.size;
    const priceB = b.limitPrice / b.size;
    if (priceB !== priceA) return priceB - priceA;
    return a.timestamp - b.timestamp;
  });

  // Sort sell orders ascending by limit price per unit (lowest sell first), then by timestamp ascending (earlier first)
  sellOrders.sort((a, b) => {
    const priceA = a.limitPrice / a.size;
    const priceB = b.limitPrice / b.size;
    if (priceA !== priceB) return priceA - priceB;
    return a.timestamp - b.timestamp;
  });

  for (const buyOrder of buyOrders) {
    if (buyOrder.status !== "Open" || buyOrder.size <= 0) continue;

    for (const sellOrder of sellOrders) {
      if (sellOrder.status !== "Open" || sellOrder.size <= 0) continue;

      // Check if parameters match
      if (
        buyOrder.swfYieldCdoId === sellOrder.swfYieldCdoId &&
        buyOrder.trancheId === sellOrder.trancheId &&
        buyOrder.optionType === sellOrder.optionType &&
        buyOrder.strikePremiumRate === sellOrder.strikePremiumRate &&
        (buyOrder.limitPrice * sellOrder.size >= sellOrder.limitPrice * buyOrder.size)
      ) {
        // Price overlap!
        // Execution price: earlier timestamp is maker price
        const matchedSize = Math.min(buyOrder.size, sellOrder.size);

        const makerIsBuy = buyOrder.timestamp <= sellOrder.timestamp;
        const executionPricePerUnit = makerIsBuy
          ? (buyOrder.limitPrice / buyOrder.size)
          : (sellOrder.limitPrice / sellOrder.size);

        const executionPriceForMatch = Math.round(executionPricePerUnit * matchedSize);

        const buyer = newState.syndicates[buyOrder.syndicateId];
        const seller = newState.syndicates[sellOrder.syndicateId];

        if (!buyer || !seller) continue;

        // Calculate current book depth for this specific tranche in terms of open order sizes
        const openOrdersForTranche = Object.values(newState.swfReinsuranceOptionLimitOrders).filter(
          (o) => o.status === "Open" && o.swfYieldCdoId === buyOrder.swfYieldCdoId && o.trancheId === buyOrder.trancheId
        );
        const depth = openOrdersForTranche.reduce((sum, o) => sum + o.size, 0);

        // Determine if it is a large order (threshold of 1000 contracts)
        const isLargeOrder = matchedSize >= 1000;

        // Calculate ratio of order size to total book depth
        const ratio = isLargeOrder ? (matchedSize / (depth || 1)) : 0;

        // Define market impact factor: sliding scale from 0% to 20% price impact
        const priceImpact = ratio * 0.2;

        // Define volume scaling: if ratio is > 40%, scale volume down dynamically (sliding scale down to 50%)
        let volumeScale = 1.0;
        if (isLargeOrder && ratio > 0.4) {
          volumeScale = Math.max(0.5, 1.0 - (ratio - 0.4) * 0.833);
        }

        const executedSize = Math.round(matchedSize * volumeScale);
        
        // Base price scaled down by the volume scale factor, then marked up by price impact
        const adjustedPrice = Math.round(executionPriceForMatch * volumeScale * (1 + priceImpact));

        // Calculate standing-based price discount
        const getSyndicateStanding = () => {
          if (!newState.factionRep || Object.keys(newState.factionRep).length === 0) return 0;
          return Math.max(0, ...Object.values(newState.factionRep));
        };
        const standing = getSyndicateStanding();
        const priceDiscount = Math.min(0.5, standing * 0.002);
        const finalPrice = Math.round(adjustedPrice * (1.0 - priceDiscount));

        // Calculate transaction cost and standing-based subsidies
        const policyKey = `${buyOrder.swfYieldCdoId}_${buyOrder.trancheId}`;
        const policy = newState.swfReinsuranceOptionTransactionCostPolicies?.[policyKey];
        const baseFee = policy ? policy.baseTransactionCost : 0;
        const subsidyPerRep = policy ? policy.subsidyPerReputationPoint : 0;
        const subsidy = Math.round(standing * subsidyPerRep);
        const feeA = Math.max(0, baseFee - subsidy);
        const feeB = Math.max(0, baseFee - subsidy);

        // AF-162: Risk-adjusted transaction fee scaling based on portfolio risk-diversification coefficients
        let buyerDivStr = "";
        let sellerDivStr = "";
        
        let finalFeeA = feeA;
        const buyerPortKey = `${buyOrder.syndicateId}_${buyOrder.swfYieldCdoId}_${buyOrder.trancheId}`;
        const buyerPortfolio = newState.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios?.[buyerPortKey];
        if (buyerPortfolio) {
          const divCoef = buyerPortfolio.riskDiversificationCoefficient;
          finalFeeA = Math.max(0, Math.round(feeA * (1.0 - 0.5 * divCoef)));
          buyerDivStr = ` (Multi-Asset Diversification: ${divCoef.toFixed(4)})`;
        }
        
        let finalFeeB = feeB;
        const sellerPortKey = `${sellOrder.syndicateId}_${buyOrder.swfYieldCdoId}_${buyOrder.trancheId}`;
        const sellerPortfolio = newState.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios?.[sellerPortKey];
        if (sellerPortfolio) {
          const divCoef = sellerPortfolio.riskDiversificationCoefficient;
          finalFeeB = Math.max(0, Math.round(feeB * (1.0 - 0.5 * divCoef)));
          sellerDivStr = ` (Multi-Asset Diversification: ${divCoef.toFixed(4)})`;
        }

        // Calculate mid-market price and dynamic market maker rebate rates (AF-155)
        const buyPrices = openOrdersForTranche.filter(o => o.orderType === "buy").map(o => o.limitPrice / o.size);
        const sellPrices = openOrdersForTranche.filter(o => o.orderType === "sell").map(o => o.limitPrice / o.size);
        const highestBuy = buyPrices.length > 0 ? Math.max(...buyPrices) : 0;
        const lowestSell = sellPrices.length > 0 ? Math.min(...sellPrices) : 0;
        let midMarketPrice = 0;
        if (highestBuy > 0 && lowestSell > 0) {
          midMarketPrice = (highestBuy + lowestSell) / 2;
        } else if (highestBuy > 0) {
          midMarketPrice = highestBuy;
        } else if (lowestSell > 0) {
          midMarketPrice = lowestSell;
        }

        const makerOrder = makerIsBuy ? buyOrder : sellOrder;
        const makerPrice = makerOrder.limitPrice / makerOrder.size;
        const closeness = midMarketPrice > 0 ? 1 / (1 + Math.abs(makerPrice - midMarketPrice)) : 1.0;

        const makerSyndicateId = makerIsBuy ? buyOrder.syndicateId : sellOrder.syndicateId;
        
        let linkStateDropRate = 0.0;
        if (newState.swfMultiFundReinsurancePools) {
          const cdo = newState.swfYieldCDOs?.[buyOrder.swfYieldCdoId];
          const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";
          for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
            if (pool.linkStateDropRate !== undefined) {
              if (pool.syndicateIds.includes(buyOrder.syndicateId) || 
                  pool.syndicateIds.includes(sellOrder.syndicateId) ||
                  (creatorSyndicateId && pool.syndicateIds.includes(creatorSyndicateId))) {
                linkStateDropRate = Math.max(linkStateDropRate, pool.linkStateDropRate);
              }
            }
          }
        }

        const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
        const avgVolatility = activeBonds.length > 0
          ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
          : 15.0;

        const cartelPolicy = getSyndicateCartelPolicy(newState, makerSyndicateId);
        const guildPolicy = getSyndicateGuildPolicy(newState, makerSyndicateId);
        
        const cartelMult = cartelPolicy?.reinsuranceOptionRebateMultiplier ?? 1.0;
        const guildMult = guildPolicy?.reinsuranceOptionRebateMultiplier ?? 1.0;

        const cartelVolHedge = cartelPolicy?.reinsuranceOptionVolatilityHedgeFactor ?? 1.0;
        const guildVolHedge = guildPolicy?.reinsuranceOptionVolatilityHedgeFactor ?? 1.0;
        const cartelPartitionRisk = cartelPolicy?.reinsuranceOptionPartitionRiskFactor ?? 1.0;
        const guildPartitionRisk = guildPolicy?.reinsuranceOptionPartitionRiskFactor ?? 1.0;

        const volumeFactor = depth > 0 ? (1000 / (1000 + depth)) : 1.0;
        const volFactor = 1.0 + (avgVolatility / 50.0) * cartelVolHedge * guildVolHedge;
        const dropFactor = 1.0 + (linkStateDropRate * 2.0) * cartelPartitionRisk * guildPartitionRisk;
        const depthFactor = 1.0 + volumeFactor;

        const rebatePolicy = newState.swfReinsuranceOptionMarketMakerRebatePolicies?.[policyKey];
        const baseRebateRate = rebatePolicy ? rebatePolicy.baseRebateRate : 0;
        const maxRebateRate = rebatePolicy ? rebatePolicy.maxRebateRate : 0;
        
        let dynamicRebateRate = baseRebateRate * closeness * volFactor * dropFactor * depthFactor * cartelMult * guildMult;
        const rebateRate = Math.min(maxRebateRate, dynamicRebateRate);
        const rebateAmount = Math.round(finalPrice * rebateRate);

        // Retrieve volatility insurance policy and calculate deflected amount if configured
        const volInsurancePolicy = newState.swfReinsuranceOptionVolatilityInsurancePolicies?.[policyKey];
        let deflectedAmount = 0;
        if (volInsurancePolicy) {
          let deflectionRate = volInsurancePolicy.deflectionRate;
          const stressPolicy = newState.swfReinsuranceOptionStressTestPolicies?.[policyKey];
          if (stressPolicy && volInsurancePolicy.stressVolatilityThreshold !== undefined && volInsurancePolicy.stressDeflectionMultiplier !== undefined) {
            if (avgVolatility > volInsurancePolicy.stressVolatilityThreshold || stressPolicy.simulatedVolatilityShock > volInsurancePolicy.stressVolatilityThreshold) {
              deflectionRate *= volInsurancePolicy.stressDeflectionMultiplier;
              if (stressPolicy.reserveMultiplier !== undefined && stressPolicy.reserveMultiplier > 0) {
                deflectionRate *= stressPolicy.reserveMultiplier;
              }
            }
          }
          deflectionRate = Math.min(1.0, deflectionRate);
          deflectedAmount = Math.round(finalPrice * deflectionRate);
        }

        // Check buyer warChest
        if ((buyer.warChest ?? 0) < finalPrice + finalFeeA) {
          continue; // Buyer doesn't have enough gold, skip this match
        }
        if ((seller.warChest ?? 0) + finalPrice - deflectedAmount < finalFeeB) {
          continue;
        }

        // Check if secondary sale (transferring existing option contract)
        if (sellOrder.contractId) {
          const contract = newState.swfReinsuranceOptionsContracts[sellOrder.contractId];
          if (!contract || !contract.active || contract.syndicateId !== sellOrder.syndicateId) {
            // Sell order is invalid (contract no longer active or held by seller), cancel it
            sellOrder.status = "Cancelled";
            newState.swfReinsuranceOptionLimitOrders[sellOrder.id] = { ...sellOrder };
            continue;
          }

          if (contract.size <= executedSize) {
            // Transfer entire contract ownership
            newState.swfReinsuranceOptionsContracts[sellOrder.contractId] = {
              ...contract,
              syndicateId: buyOrder.syndicateId, // new holder
              size: executedSize, // scaled size!
              timestamp: newState.step,
            };
          } else {
            // Split the contract: reduce seller's contract size
            newState.swfReinsuranceOptionsContracts[sellOrder.contractId] = {
              ...contract,
              size: contract.size - executedSize,
              timestamp: newState.step,
            };
            // Create new contract for the buyer
            const optionId = `opt_limit_${Object.keys(newState.swfReinsuranceOptionsContracts).length + 1}`;
            newState.swfReinsuranceOptionsContracts[optionId] = {
              id: optionId,
              syndicateId: buyOrder.syndicateId, // buyer/holder
              writerSyndicateId: contract.writerSyndicateId, // keep original writer!
              swfYieldCdoId: buyOrder.swfYieldCdoId,
              trancheId: buyOrder.trancheId,
              optionType: buyOrder.optionType,
              strikePremiumRate: buyOrder.strikePremiumRate,
              size: executedSize, // scaled size!
              timestamp: newState.step,
              active: true,
            };
          }
        } else {
          // Write/create new option contract
          const optionId = `opt_limit_${Object.keys(newState.swfReinsuranceOptionsContracts).length + 1}`;
          newState.swfReinsuranceOptionsContracts[optionId] = {
            id: optionId,
            syndicateId: buyOrder.syndicateId, // buyer/holder
            writerSyndicateId: sellOrder.syndicateId, // seller/writer
            swfYieldCdoId: buyOrder.swfYieldCdoId,
            trancheId: buyOrder.trancheId,
            optionType: buyOrder.optionType,
            strikePremiumRate: buyOrder.strikePremiumRate,
            size: executedSize, // scaled size!
            timestamp: newState.step,
            active: true,
            premiumPaid: finalPrice,
          };
        }

        // Transfer gold using final price, deduct transaction fees, apply rebate, and deflect volatility insurance if configured
        let netBuyerDiff = -finalPrice - finalFeeA;
        let netSellerDiff = finalPrice - finalFeeB - deflectedAmount;
        if (makerIsBuy) {
          netBuyerDiff += rebateAmount;
        } else {
          netSellerDiff += rebateAmount;
        }

        buyer.warChest = (buyer.warChest ?? 0) + netBuyerDiff;
        seller.warChest = (seller.warChest ?? 0) + netSellerDiff;

        newState.syndicates[buyOrder.syndicateId] = { ...buyer };
        newState.syndicates[sellOrder.syndicateId] = { ...seller };

        if (!newState.swfReinsuranceOptionPremiumContributions) {
          newState.swfReinsuranceOptionPremiumContributions = {};
        }
        newState.swfReinsuranceOptionPremiumContributions[buyOrder.syndicateId] =
          (newState.swfReinsuranceOptionPremiumContributions[buyOrder.syndicateId] ?? 0) + finalPrice;

        // Deposit deflected amount to volatility insurance pool
        if (deflectedAmount > 0 && volInsurancePolicy) {
          if (!newState.swfReinsuranceOptionVolatilityInsurancePools) {
            newState.swfReinsuranceOptionVolatilityInsurancePools = {};
          }
          if (!newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey]) {
            newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey] = {
              id: `pool_${policyKey}`,
              swfYieldCdoId: buyOrder.swfYieldCdoId,
              trancheId: buyOrder.trancheId,
              balance: 0,
              timestamp: newState.step,
            };
          }
          const pool = newState.swfReinsuranceOptionVolatilityInsurancePools[policyKey];
          pool.balance += deflectedAmount;
          pool.timestamp = newState.step;

          newState.journal.push(
            `[SWF Reinsurance Option Volatility Insurance Deflection] Deflected ${deflectedAmount} gold (Rate: ${(volInsurancePolicy.deflectionRate * 100).toFixed(2)}%) from trade matching volume to Volatility Insurance Pool ${pool.id} (New Pool Balance: ${pool.balance} gold).`
          );
        }

        // Scale remaining order sizes
        if (buyOrder.size <= matchedSize) {
          buyOrder.status = "Filled";
          buyOrder.size = 0;
          buyOrder.limitPrice = 0;
        } else {
          const pricePerUnitBuy = buyOrder.limitPrice / buyOrder.size;
          buyOrder.size -= matchedSize;
          buyOrder.limitPrice = Math.max(1, Math.round(pricePerUnitBuy * buyOrder.size));
        }

        if (sellOrder.size <= matchedSize) {
          sellOrder.status = "Filled";
          sellOrder.size = 0;
          sellOrder.limitPrice = 0;
        } else {
          const pricePerUnitSell = sellOrder.limitPrice / sellOrder.size;
          sellOrder.size -= matchedSize;
          sellOrder.limitPrice = Math.max(1, Math.round(pricePerUnitSell * sellOrder.size));
        }

        newState.swfReinsuranceOptionLimitOrders[buyOrder.id] = { ...buyOrder };
        newState.swfReinsuranceOptionLimitOrders[sellOrder.id] = { ...sellOrder };

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[SWF Reinsurance Option Limit Match] Matched Buy Order ${buyOrder.id} (Syndicate ${buyOrder.syndicateId}) and Sell Order ${sellOrder.id} (Syndicate ${sellOrder.syndicateId}) at execution price ${finalPrice} gold (CDO: ${buyOrder.swfYieldCdoId}, Tranche: ${buyOrder.trancheId}, Strike: ${buyOrder.strikePremiumRate.toFixed(4)}, Original Size: ${buyOrder.size + matchedSize}, Executed Size: ${executedSize}, Contract: ${sellOrder.contractId ? sellOrder.contractId : "New"}).`
        );

        newState.journal.push(
          `[SWF Reinsurance Option Trade Fees] Buyer Fee: ${finalFeeA} gold${buyerDivStr}, Seller Fee: ${finalFeeB} gold${sellerDivStr} (Base: ${baseFee} gold, Subsidy: ${subsidy} gold, Standing: ${standing}).`
        );

        if (rebateAmount > 0) {
          const makerSyndicateId = makerIsBuy ? buyOrder.syndicateId : sellOrder.syndicateId;
          newState.journal.push(
            `[SWF Reinsurance Option Market Maker Rebate] Syndicate ${makerSyndicateId} received ${rebateAmount} gold rebate as maker for order ${makerOrder.id} (Mid: ${midMarketPrice.toFixed(4)}, Order Price: ${makerPrice.toFixed(4)}, Closeness: ${closeness.toFixed(4)}, Rebate Rate: ${rebateRate.toFixed(4)}).`
          );
        }

        if (priceDiscount > 0) {
          newState.journal.push(
            `[SWF Reinsurance Option Standing Discount] Standing of ${standing} applied a ${(priceDiscount * 100).toFixed(1)}% discount to the option trade execution price (Before: ${adjustedPrice} gold, After: ${finalPrice} gold).`
          );
        }

        if (volumeScale < 1.0 || priceImpact > 0) {
          newState.journal.push(
            `[SWF Reinsurance Option Market Impact] Large order matched (Size: ${matchedSize}, Tranche Depth: ${depth}). Volume scaled by ${(volumeScale * 100).toFixed(1)}% (Executed Size: ${executedSize}), Price adjusted by +${(priceImpact * 100).toFixed(1)}% (Base: ${Math.round(executionPriceForMatch * volumeScale)} gold, Adjusted: ${adjustedPrice} gold).`
          );
        }

        if (buyOrder.status === "Filled") {
          break;
        }
      }
    }
  }

  // AF-161: Automated Liquidity Matching for unmatched limit orders using cross-hedging syndicate resources
  if (newState.swfReinsuranceOptionCrossHedgingPolicies) {
    const remainingOpenOrders = Object.values(newState.swfReinsuranceOptionLimitOrders).filter(
      (o) => o.status === "Open" && o.size > 0
    );

    for (const openOrder of remainingOpenOrders) {
      if (openOrder.status !== "Open" || openOrder.size <= 0) continue;

      // Find any cross-hedging policies that apply to this order's underlying asset (CDO + Tranche)
      for (const [policyKey, crossPolicy] of Object.entries(newState.swfReinsuranceOptionCrossHedgingPolicies)) {
        if (
          crossPolicy.swfYieldCdoId === openOrder.swfYieldCdoId &&
          crossPolicy.trancheId === openOrder.trancheId
        ) {
          const providerSyndicateId = crossPolicy.syndicateId;
          const provider = newState.syndicates?.[providerSyndicateId];
          if (!provider) continue;

          // Prevent a syndicate from matching its own limit order
          if (openOrder.syndicateId === providerSyndicateId) continue;

          // We match this order!
          const matchedSize = openOrder.size;
          const totalOrderPrice = openOrder.limitPrice;

          if (openOrder.orderType === "buy") {
            // Syndicate matches BUY order by WRITING/SELLING the option
            if ((provider.warChest ?? 0) + totalOrderPrice >= 0) {
              // Write/create new option contract
              if (!newState.swfReinsuranceOptionsContracts) {
                newState.swfReinsuranceOptionsContracts = {};
              }
              const optionId = `opt_limit_${Object.keys(newState.swfReinsuranceOptionsContracts).length + 1}`;
              newState.swfReinsuranceOptionsContracts[optionId] = {
                id: optionId,
                syndicateId: openOrder.syndicateId, // buyer/holder
                writerSyndicateId: providerSyndicateId, // provider/writer
                swfYieldCdoId: openOrder.swfYieldCdoId,
                trancheId: openOrder.trancheId,
                optionType: openOrder.optionType,
                strikePremiumRate: openOrder.strikePremiumRate,
                size: matchedSize,
                timestamp: newState.step,
                active: true,
                premiumPaid: totalOrderPrice,
              };

              // Transfer gold
              const buyer = newState.syndicates[openOrder.syndicateId];
              if (buyer && (buyer.warChest ?? 0) >= totalOrderPrice) {
                buyer.warChest = (buyer.warChest ?? 0) - totalOrderPrice;
                provider.warChest = (provider.warChest ?? 0) + totalOrderPrice;

                newState.syndicates[openOrder.syndicateId] = { ...buyer };
                newState.syndicates[providerSyndicateId] = { ...provider };

                if (!newState.swfReinsuranceOptionPremiumContributions) {
                  newState.swfReinsuranceOptionPremiumContributions = {};
                }
                newState.swfReinsuranceOptionPremiumContributions[openOrder.syndicateId] =
                  (newState.swfReinsuranceOptionPremiumContributions[openOrder.syndicateId] ?? 0) + totalOrderPrice;

                // Fill order
                openOrder.status = "Filled";
                openOrder.size = 0;
                openOrder.limitPrice = 0;
                newState.swfReinsuranceOptionLimitOrders[openOrder.id] = { ...openOrder };

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[Automated Liquidity Match] Cross-Hedging Syndicate ${providerSyndicateId} provided liquidity to match Buy Order ${openOrder.id} (Syndicate ${openOrder.syndicateId}) at execution price ${totalOrderPrice} gold (CDO: ${openOrder.swfYieldCdoId}, Tranche: ${openOrder.trancheId}, Option Type: ${openOrder.optionType}, Strike: ${openOrder.strikePremiumRate.toFixed(4)}, Size: ${matchedSize}).`
                );
              }
            }
          } else if (openOrder.orderType === "sell") {
            // Syndicate matches SELL order by BUYING the option
            if (openOrder.contractId) {
              const contract = newState.swfReinsuranceOptionsContracts[openOrder.contractId];
              if (contract && contract.active && contract.syndicateId === openOrder.syndicateId) {
                if ((provider.warChest ?? 0) >= totalOrderPrice) {
                  // Syndicate buys contract
                  if (contract.size <= matchedSize) {
                    newState.swfReinsuranceOptionsContracts[openOrder.contractId] = {
                      ...contract,
                      syndicateId: providerSyndicateId, // new holder
                      timestamp: newState.step,
                    };
                  } else {
                    newState.swfReinsuranceOptionsContracts[openOrder.contractId] = {
                      ...contract,
                      size: contract.size - matchedSize,
                      timestamp: newState.step,
                    };
                    const optionId = `opt_limit_${Object.keys(newState.swfReinsuranceOptionsContracts).length + 1}`;
                    newState.swfReinsuranceOptionsContracts[optionId] = {
                      id: optionId,
                      syndicateId: providerSyndicateId, // provider/holder
                      writerSyndicateId: contract.writerSyndicateId,
                      swfYieldCdoId: openOrder.swfYieldCdoId,
                      trancheId: openOrder.trancheId,
                      optionType: openOrder.optionType,
                      strikePremiumRate: openOrder.strikePremiumRate,
                      size: matchedSize,
                      timestamp: newState.step,
                      active: true,
                      premiumPaid: totalOrderPrice,
                    };
                  }

                  // Transfer gold
                  const seller = newState.syndicates[openOrder.syndicateId];
                  if (seller) {
                    seller.warChest = (seller.warChest ?? 0) + totalOrderPrice;
                    provider.warChest = (provider.warChest ?? 0) - totalOrderPrice;

                    newState.syndicates[openOrder.syndicateId] = { ...seller };
                    newState.syndicates[providerSyndicateId] = { ...provider };

                    if (!newState.swfReinsuranceOptionPremiumContributions) {
                      newState.swfReinsuranceOptionPremiumContributions = {};
                    }
                    newState.swfReinsuranceOptionPremiumContributions[providerSyndicateId] =
                      (newState.swfReinsuranceOptionPremiumContributions[providerSyndicateId] ?? 0) + totalOrderPrice;

                    // Fill order
                    openOrder.status = "Filled";
                    openOrder.size = 0;
                    openOrder.limitPrice = 0;
                    newState.swfReinsuranceOptionLimitOrders[openOrder.id] = { ...openOrder };

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[Automated Liquidity Match] Cross-Hedging Syndicate ${providerSyndicateId} provided liquidity to match Sell Order ${openOrder.id} (Syndicate ${openOrder.syndicateId}) at execution price ${totalOrderPrice} gold (CDO: ${openOrder.swfYieldCdoId}, Tranche: ${openOrder.trancheId}, Option Type: ${openOrder.optionType}, Strike: ${openOrder.strikePremiumRate.toFixed(4)}, Size: ${matchedSize}).`
                    );
                  }
                }
              }
            } else {
              // Match a new option write where provider is the buyer/holder and seller is writer
              if ((provider.warChest ?? 0) >= totalOrderPrice) {
                if (!newState.swfReinsuranceOptionsContracts) {
                  newState.swfReinsuranceOptionsContracts = {};
                }
                const optionId = `opt_limit_${Object.keys(newState.swfReinsuranceOptionsContracts).length + 1}`;
                newState.swfReinsuranceOptionsContracts[optionId] = {
                  id: optionId,
                  syndicateId: providerSyndicateId, // provider/holder
                  writerSyndicateId: openOrder.syndicateId, // seller/writer
                  swfYieldCdoId: openOrder.swfYieldCdoId,
                  trancheId: openOrder.trancheId,
                  optionType: openOrder.optionType,
                  strikePremiumRate: openOrder.strikePremiumRate,
                  size: matchedSize,
                  timestamp: newState.step,
                  active: true,
                };

                // Transfer gold
                const seller = newState.syndicates[openOrder.syndicateId];
                if (seller) {
                  seller.warChest = (seller.warChest ?? 0) + totalOrderPrice;
                  provider.warChest = (provider.warChest ?? 0) - totalOrderPrice;

                  newState.syndicates[openOrder.syndicateId] = { ...seller };
                  newState.syndicates[providerSyndicateId] = { ...provider };

                  if (!newState.swfReinsuranceOptionPremiumContributions) {
                    newState.swfReinsuranceOptionPremiumContributions = {};
                  }
                  newState.swfReinsuranceOptionPremiumContributions[providerSyndicateId] =
                    (newState.swfReinsuranceOptionPremiumContributions[providerSyndicateId] ?? 0) + totalOrderPrice;

                  // Fill order
                  openOrder.status = "Filled";
                  openOrder.size = 0;
                  openOrder.limitPrice = 0;
                  newState.swfReinsuranceOptionLimitOrders[openOrder.id] = { ...openOrder };

                  if (!newState.journal) newState.journal = [];
                  newState.journal.push(
                    `[Automated Liquidity Match] Cross-Hedging Syndicate ${providerSyndicateId} provided liquidity to match Sell Order ${openOrder.id} (Syndicate ${openOrder.syndicateId}) at execution price ${totalOrderPrice} gold (CDO: ${openOrder.swfYieldCdoId}, Tranche: ${openOrder.trancheId}, Option Type: ${openOrder.optionType}, Strike: ${openOrder.strikePremiumRate.toFixed(4)}, Size: ${matchedSize}).`
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  // Recalculate SWF Reinsurance Option Order Book Volumes & Depths after matching (AF-150 / AF-151)
  const afterMatchMetrics = recalculateReinsuranceOptionOrderBookMetrics(newState);
  newState.swfReinsuranceOptionOrderBookVolumes = afterMatchMetrics.swfReinsuranceOptionOrderBookVolumes;
  newState.swfReinsuranceOptionOrderBookDepths = afterMatchMetrics.swfReinsuranceOptionOrderBookDepths;
  newState.swfReinsuranceOptionVolatilityInsurancePools = afterMatchMetrics.swfReinsuranceOptionVolatilityInsurancePools;
  newState.journal = afterMatchMetrics.journal;

  // AF-153: Dynamic Liquidity Mining Reward distribution based on price closeness to mid-market price
  const rewardedState = distributeReinsuranceLiquidityMiningRewards(newState);

  return rewardedState;
}

export function tickVolatilityInsuranceRebalancing(state: GameState): GameState {
  if (!state.swfReinsuranceOptionVolatilityInsurancePools) return state;

  const newState = {
    ...state,
    swfReinsuranceOptionVolatilityInsurancePools: state.swfReinsuranceOptionVolatilityInsurancePools ? JSON.parse(JSON.stringify(state.swfReinsuranceOptionVolatilityInsurancePools)) : {},
    swfMultiFundReinsurancePools: state.swfMultiFundReinsurancePools ? JSON.parse(JSON.stringify(state.swfMultiFundReinsurancePools)) : {},
    journal: state.journal ? [...state.journal] : [],
  };

  const poolEntries = Object.entries(newState.swfReinsuranceOptionVolatilityInsurancePools) as [string, SWFReinsuranceOptionVolatilityInsurancePool][];

  for (const [policyKey, pool] of poolEntries) {
    const volPolicy = newState.swfReinsuranceOptionVolatilityInsurancePolicies?.[policyKey];
    if (!volPolicy || volPolicy.reallocationThreshold === undefined) continue;

    if (pool.balance > volPolicy.reallocationThreshold) {
      const excess = pool.balance - volPolicy.reallocationThreshold;
      if (excess <= 0) continue;

      // Find stress-tested reinsurance pools.
      const [cdoId] = policyKey.split("_");
      const cdo = newState.swfYieldCDOs?.[cdoId];
      const creatorSyndicateId = cdo ? cdo.creatorSyndicateId : "";

      const multiFundPools = Object.values(newState.swfMultiFundReinsurancePools) as SWFMultiFundReinsurancePool[];

      const candidatePools = multiFundPools.filter(
        (p) => p.active && creatorSyndicateId && p.syndicateIds.includes(creatorSyndicateId)
      );

      // If no syndicate-specific pool is found, fallback to any active SWFMultiFundReinsurancePool
      const targetPools = candidatePools.length > 0 
        ? candidatePools 
        : multiFundPools.filter((p) => p.active);

      if (targetPools.length > 0) {
        // Route excess equally among target pools
        const amountPerPool = Math.floor(excess / targetPools.length);
        if (amountPerPool > 0) {
          let totalRouted = 0;
          for (const targetPool of targetPools) {
            const p = newState.swfMultiFundReinsurancePools[targetPool.id] as SWFMultiFundReinsurancePool;
            if (p) {
              p.totalReserve = (p.totalReserve ?? 0) + amountPerPool;
              p.timestamp = newState.step;
              totalRouted += amountPerPool;
            }
          }
          pool.balance -= totalRouted;
          pool.timestamp = newState.step;

          newState.journal.push(
            `[SWF Volatility Insurance Premium Reallocation] Routed excess premium of ${totalRouted} gold from Volatility Insurance Pool ${pool.id} (Threshold: ${volPolicy.reallocationThreshold} gold) to ${targetPools.length} stress-tested reinsurance pool(s).`
          );
        }
      }
    }
  }

  return newState;
}

export function tickSWFReinsuranceOptionVolatilityPoolRebalancing(state: GameState): GameState {
  if (!state.swfReinsuranceOptionCrossSyndicatePools) return state;

  const newState = {
    ...state,
    swfReinsuranceOptionCrossSyndicatePools: state.swfReinsuranceOptionCrossSyndicatePools ? JSON.parse(JSON.stringify(state.swfReinsuranceOptionCrossSyndicatePools)) : {},
    syndicates: state.syndicates ? JSON.parse(JSON.stringify(state.syndicates)) : {},
    marginAccounts: state.marginAccounts ? JSON.parse(JSON.stringify(state.marginAccounts)) : {},
    swfReinsuranceOptionVolatilityPoolUnderwritingPolicies: state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies ? JSON.parse(JSON.stringify(state.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies)) : {},
    journal: state.journal ? [...state.journal] : [],
  };

  // Unlock matured underwriting premium vaults for all margin accounts
  for (const [syndicateId, ma] of Object.entries(newState.marginAccounts || {})) {
    const marginAccount = ma as any;
    if (marginAccount.swfUnderwritingLockedVaults && marginAccount.swfUnderwritingLockedVaults.length > 0) {
      const activeLocks: { amount: number; unlockStep: number }[] = [];
      let totalUnlocked = 0;
      for (const lock of marginAccount.swfUnderwritingLockedVaults) {
        if (newState.step >= lock.unlockStep) {
          totalUnlocked += lock.amount;
        } else {
          activeLocks.push(lock);
        }
      }
      if (totalUnlocked > 0) {
        marginAccount.swfUnderwritingLockedVaults = activeLocks;
        marginAccount.swfReinsuranceOptionVault = (marginAccount.swfReinsuranceOptionVault ?? 0) + totalUnlocked;
        marginAccount.timestamp = newState.step;
        newState.journal.push(
          `[SWF Volatility Pool Premium Matured] Unlocked ${totalUnlocked} gold of compounded premium for Syndicate ${syndicateId} into secondary reinsurance option vault.`
        );
      }
    }
  }

  const activeBonds = Object.values(newState.yieldVolatilityIndexes || {});
  const avgVolatility = activeBonds.length > 0
    ? activeBonds.reduce((sum, item) => sum + item.volatility, 0) / activeBonds.length
    : 20.0;

  for (const pool of Object.values(newState.swfReinsuranceOptionCrossSyndicatePools) as SWFReinsuranceOptionCrossSyndicatePool[]) {
    // AF-185: Underwriting & Risk Premium Calibration
    const underwritingPolicy = newState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.[pool.id];
    if (underwritingPolicy) {
      const defaultCount = Object.keys(pool.syndicateContributions).reduce(
        (sum, sId) => sum + (newState.syndicateDefaults?.[sId] ?? 0),
        0
      );

      let linkStateDropRate = 0.0;
      if (newState.swfMultiFundReinsurancePools) {
        for (const p of Object.values(newState.swfMultiFundReinsurancePools)) {
          if (p.linkStateDropRate !== undefined) {
            linkStateDropRate = Math.max(linkStateDropRate, p.linkStateDropRate);
          }
        }
      }

      const calibratedRate = underwritingPolicy.baselinePremiumWeight *
        (1.0 + (avgVolatility / 100.0) * underwritingPolicy.volatilityScalingMultiplier) *
        (1.0 + defaultCount * underwritingPolicy.historicalDefaultWeight) *
        (1.0 + linkStateDropRate * underwritingPolicy.meshPartitionWeight);

      const oldCalibrated = underwritingPolicy.calibratedPremiumRate;
      underwritingPolicy.calibratedPremiumRate = Math.round(calibratedRate * 10000) / 10000;

      if (underwritingPolicy.calibratedPremiumRate !== oldCalibrated) {
        newState.journal.push(
          `[SWF Volatility Pool Premium Calibration] Calibrated pool premium rate dynamically to ${underwritingPolicy.calibratedPremiumRate.toFixed(4)} (Baseline: ${underwritingPolicy.baselinePremiumWeight.toFixed(2)}, Volatility: ${avgVolatility.toFixed(2)}%, Defaults: ${defaultCount}, Mesh Drop: ${linkStateDropRate.toFixed(2)}) for Pool ${pool.id}.`
        );
      }

      if (avgVolatility >= 30.0) {
        for (const sId of Object.keys(pool.syndicateContributions)) {
          const syndicate = newState.syndicates?.[sId];
          if (syndicate) {
            const premiumCost = Math.round(100 * underwritingPolicy.calibratedPremiumRate);
            const availableChest = syndicate.warChest ?? 0;
            const actualPremium = Math.min(premiumCost, availableChest);
            if (actualPremium > 0) {
              syndicate.warChest = availableChest - actualPremium;
              pool.totalBalance += actualPremium;
              pool.syndicateContributions[sId] = (pool.syndicateContributions[sId] ?? 0) + actualPremium;
              
              // Track accumulated underwriting premiums since last epoch boundary
              if (!pool.accumulatedUnderwritingPremiums) {
                pool.accumulatedUnderwritingPremiums = {};
              }
              pool.accumulatedUnderwritingPremiums[sId] = (pool.accumulatedUnderwritingPremiums[sId] ?? 0) + actualPremium;

              newState.journal.push(
                `[SWF Volatility Pool Premium Payment] Charged volatile premium toll of ${actualPremium} gold from Syndicate ${sId} to Volatility Pool ${pool.id} based on Calibrated Rate: ${underwritingPolicy.calibratedPremiumRate.toFixed(4)} under high volatility.`
              );
            }
          }
        }
      }
    }

    const policy = newState.swfReinsuranceOptionVolatilityPoolRebalancingPolicies?.[pool.id];
    if (!policy) continue;

    // Check if volatility triggers rebalancing
    if (avgVolatility >= policy.autoBalancingThreshold) {
      // 1. Balance/Top up the pool from the war chests of participating syndicates (up to riskSharingLimit)
      for (const [syndicateId, currentContribution] of Object.entries(pool.syndicateContributions)) {
        const syndicate = newState.syndicates?.[syndicateId];
        if (syndicate && currentContribution < policy.riskSharingLimit) {
          const needed = policy.riskSharingLimit - currentContribution;
          const available = syndicate.warChest ?? 0;
          const toTransfer = Math.min(needed, available);
          if (toTransfer > 0) {
            syndicate.warChest = available - toTransfer;
            pool.syndicateContributions[syndicateId] = currentContribution + toTransfer;
            pool.totalBalance += toTransfer;
            newState.journal.push(
              `[SWF Volatility Pool Auto-Deposit] Syndicate ${syndicateId} automatically deposited ${toTransfer} gold to Volatility Pool ${pool.id} to maintain risk sharing limit of ${policy.riskSharingLimit} gold under high volatility (Volatility: ${avgVolatility.toFixed(2)}% >= Threshold: ${policy.autoBalancingThreshold}%).`
            );
          }
        }
      }

      // 2. Transfer liquidity/fallback support to participating syndicates' margin accounts if they are low
      for (const syndicateId of Object.keys(pool.syndicateContributions)) {
        const marginAccount = newState.marginAccounts?.[syndicateId];
        if (marginAccount) {
          // Calculate dynamic transfer amount scaled by yieldRebalancingMultiplier
          const transferAmount = Math.min(
            pool.totalBalance,
            Math.floor(policy.riskSharingLimit * policy.yieldRebalancingMultiplier)
          );

          if (transferAmount > 0) {
            // Deduct from pool balance and contributions proportionally
            const originalBalance = pool.totalBalance;
            pool.totalBalance -= transferAmount;
            for (const sId of Object.keys(pool.syndicateContributions)) {
              const contr = pool.syndicateContributions[sId] ?? 0;
              if (originalBalance > 0) {
                const reduction = Math.min(contr, Math.floor(transferAmount * (contr / originalBalance)));
                pool.syndicateContributions[sId] = Math.max(0, contr - reduction);
              }
            }

            // Transfer to margin account collateral
            marginAccount.collateral = (marginAccount.collateral ?? 0) + transferAmount;

            // Generate optimized yield / reward: 5% of transfer scaled by yieldRebalancingMultiplier
            const optimizedYield = Math.round(transferAmount * 0.05 * policy.yieldRebalancingMultiplier);
            const syndicate = newState.syndicates?.[syndicateId];
            if (syndicate && optimizedYield > 0) {
              syndicate.warChest = (syndicate.warChest ?? 0) + optimizedYield;
            }

            newState.journal.push(
              `[SWF Volatility Pool Auto-Rebalance] Transferred fallback liquidity of ${transferAmount} gold from Volatility Pool ${pool.id} to Syndicate ${syndicateId} margin account collateral (New Collateral: ${marginAccount.collateral} gold, New Pool Balance: ${pool.totalBalance} gold). Distributed optimized yield reward of ${optimizedYield} gold to war chest.`
            );
          }
        }
      }

      pool.timestamp = newState.step;
    }
  }

  // Auto-distribute collected premium proceeds and trigger compounding reinvestments on epoch boundaries
  if (newState.step % 5 === 0) {
    for (const pool of Object.values(newState.swfReinsuranceOptionCrossSyndicatePools) as SWFReinsuranceOptionCrossSyndicatePool[]) {
      const underwritingPolicy = newState.swfReinsuranceOptionVolatilityPoolUnderwritingPolicies?.[pool.id];
      if (underwritingPolicy && pool.accumulatedUnderwritingPremiums) {
        const yieldRedistributionWeight = underwritingPolicy.yieldRedistributionWeight !== undefined ? underwritingPolicy.yieldRedistributionWeight : 0.6;
        const vaultLockDuration = underwritingPolicy.vaultLockDuration !== undefined ? underwritingPolicy.vaultLockDuration : 10;

        for (const [sId, collected] of Object.entries(pool.accumulatedUnderwritingPremiums)) {
          if (collected > 0) {
            const redistributedAmount = Math.floor(collected * yieldRedistributionWeight);
            const compoundedAmount = collected - redistributedAmount;

            // Distribute redistributedAmount to syndicate's war chest
            const syndicate = newState.syndicates?.[sId];
            if (syndicate) {
              syndicate.warChest = (syndicate.warChest ?? 0) + redistributedAmount;
            }

            // Lock compoundedAmount in margin account's swfUnderwritingLockedVaults
            let marginAccount = newState.marginAccounts?.[sId];
            if (!marginAccount) {
              marginAccount = {
                syndicateId: sId,
                collateral: 0,
                timestamp: newState.step,
                swfUnderwritingLockedVaults: [],
              };
              if (!newState.marginAccounts) newState.marginAccounts = {};
              newState.marginAccounts[sId] = marginAccount;
            }

            if (compoundedAmount > 0) {
              if (!marginAccount.swfUnderwritingLockedVaults) {
                marginAccount.swfUnderwritingLockedVaults = [];
              }
              marginAccount.swfUnderwritingLockedVaults.push({
                amount: compoundedAmount,
                unlockStep: newState.step + vaultLockDuration,
              });
              marginAccount.timestamp = newState.step;
            }

            newState.journal.push(
              `[SWF Volatility Pool Premium Distribution] Distributed ${redistributedAmount} gold to Syndicate ${sId} war chest and locked ${compoundedAmount} gold in secondary vault (compounding with ${vaultLockDuration} ticks lock duration) from collected premium proceeds of ${collected} gold for Pool ${pool.id}.`
            );

            // Reset accumulated
            pool.accumulatedUnderwritingPremiums[sId] = 0;
          }
        }
      }
    }
  }

  // SWF Reinsurance Options Volatility Floor Panic Override Extension Cancellation Grace Period Minimum Liquidity Threshold Adjustment Fee Calibration Yield-Pro-Rata Auto-Reinvestment on epoch boundaries (AF-201/AF-202)
  if (newState.step % 5 === 0 && newState.swfReinsuranceOptionMarginPolicies) {
    newState.swfReinsuranceOptionMarginPolicies = { ...newState.swfReinsuranceOptionMarginPolicies };
    for (const [policyKey, policy] of Object.entries(newState.swfReinsuranceOptionMarginPolicies)) {
      const originalAmount = policy.accumulatedFeeReinvestmentPool ?? 0;
      const threshold = policy.autoReinvestThreshold ?? 0;
      if (originalAmount > 0 && threshold > 0 && originalAmount >= threshold) {
        let reinvestedAmount = originalAmount;
        const cap = newState.maxAutoReinvestYieldCap;
        if (cap !== undefined && originalAmount > cap) {
          reinvestedAmount = cap;
          if (!newState.auditLogs) {
            newState.auditLogs = [];
          }
          newState.auditLogs.push(
            `[REINVESTMENT_AUDIT_BREACH] Syndicate SWF Reinsurance auto-reinvestment breach detected. Attempted: ${originalAmount} gold, Cap: ${cap} gold. Clamped to cap.`
          );
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[REINVESTMENT_AUDIT_BREACH] Audit triggered! Attempted reinvestment of ${originalAmount} gold breached the authorized governance cap of ${cap} gold. Clamped to cap.`
          );

          // Slashing Logic (AF-203)
          const cdo = newState.swfYieldCDOs?.[policy.swfYieldCdoId];
          const sId = cdo?.creatorSyndicateId;
          if (cdo && sId) {
            newState.reinvestmentBreachCount = newState.reinvestmentBreachCount ? { ...newState.reinvestmentBreachCount } : {};
            const breachCount = (newState.reinvestmentBreachCount[sId] ?? 0) + 1;
            newState.reinvestmentBreachCount[sId] = breachCount;

            const baseSlashingRate = newState.breachSlashingRates?.[sId] ?? 0.05;
            const effectiveSlashingRate = Math.min(1.0, baseSlashingRate * breachCount);

            // Slice from their CDO tranche ownership if they consistently breach (breachCount > 1)
            if (breachCount > 1) {
              const tranche = cdo.tranches?.[policy.trancheId];
              if (tranche) {
                const updatedTranche = {
                  ...tranche,
                  ownership: { ...tranche.ownership },
                };
                const ownedShares = updatedTranche.ownership[sId] ?? 0;
                const slashedShares = Math.floor(ownedShares * effectiveSlashingRate);
                
                if (slashedShares > 0) {
                  updatedTranche.ownership[sId] = ownedShares - slashedShares;
                  updatedTranche.totalShares = Math.max(0, updatedTranche.totalShares - slashedShares);
                  updatedTranche.timestamp = newState.step;

                  const updatedCdo = {
                    ...cdo,
                    tranches: {
                      ...cdo.tranches,
                      [policy.trancheId]: updatedTranche,
                    },
                    timestamp: newState.step,
                  };
                  
                  newState.swfYieldCDOs = newState.swfYieldCDOs ? { ...newState.swfYieldCDOs } : {};
                  newState.swfYieldCDOs[policy.swfYieldCdoId] = updatedCdo;

                  newState.auditLogs.push(
                    `[REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASH] Syndicate ${sId} cap breach count: ${breachCount}. Slashed ${slashedShares} shares from CDO ${policy.swfYieldCdoId} tranche ${policy.trancheId} (Slashing Rate: ${(effectiveSlashingRate * 100).toFixed(1)}%).`
                  );
                  newState.journal.push(
                    `[REINVESTMENT_GOVERNANCE_CAP_BREACH_SLASH] Syndicate ${sId} has consistently breached the reinvestment cap (Breach Count: ${breachCount}). Slashed ${slashedShares} shares from CDO ${policy.swfYieldCdoId} tranche ${policy.trancheId} at an effective slashing rate of ${(effectiveSlashingRate * 100).toFixed(1)}%.`
                  );

                  newState.slashedCDOTrancheShares = newState.slashedCDOTrancheShares ? { ...newState.slashedCDOTrancheShares } : {};
                  if (!newState.slashedCDOTrancheShares[sId]) {
                    newState.slashedCDOTrancheShares[sId] = {};
                  }
                  newState.slashedCDOTrancheShares[sId] = { ...newState.slashedCDOTrancheShares[sId] };
                  if (!newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId]) {
                    newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId] = {};
                  }
                  newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId] = { ...newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId] };
                  const prevSlashed = newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId][policy.trancheId] ?? 0;
                  newState.slashedCDOTrancheShares[sId][policy.swfYieldCdoId][policy.trancheId] = prevSlashed + slashedShares;

                }
              }
            }
          }
        }
        // Find corresponding CDO and tranche
        const cdo = newState.swfYieldCDOs?.[policy.swfYieldCdoId];
        if (cdo && cdo.tranches) {
          newState.swfYieldCDOs = { ...newState.swfYieldCDOs };
          const tranche = cdo.tranches[policy.trancheId];
          if (tranche) {
            const updatedTranche = {
              ...tranche,
              ownership: { ...tranche.ownership },
            };
            const oldTotalShares = tranche.totalShares;
            if (oldTotalShares > 0) {
              let distributed = 0;
              const entries = Object.entries(updatedTranche.ownership).filter(([_, sh]) => sh > 0);
              for (let i = 0; i < entries.length; i++) {
                const [sId, ownedShares] = entries[i];
                let addedShares = Math.floor(reinvestedAmount * (ownedShares / oldTotalShares));
                if (i === entries.length - 1) {
                  addedShares = reinvestedAmount - distributed;
                }
                updatedTranche.ownership[sId] = ownedShares + addedShares;
                distributed += addedShares;
              }
            } else {
              const activeSyndicates = Object.keys(newState.syndicates || {});
              if (activeSyndicates.length > 0) {
                let distributed = 0;
                for (let i = 0; i < activeSyndicates.length; i++) {
                  const sId = activeSyndicates[i];
                  let addedShares = Math.floor(reinvestedAmount / activeSyndicates.length);
                  if (i === activeSyndicates.length - 1) {
                    addedShares = reinvestedAmount - distributed;
                  }
                  updatedTranche.ownership[sId] = (updatedTranche.ownership[sId] ?? 0) + addedShares;
                  distributed += addedShares;
                }
              }
            }
            updatedTranche.totalShares = oldTotalShares + reinvestedAmount;
            updatedTranche.timestamp = newState.step;

            const updatedCdo = {
              ...cdo,
              tranches: {
                ...cdo.tranches,
                [policy.trancheId]: updatedTranche,
              },
              timestamp: newState.step,
            };
            newState.swfYieldCDOs[policy.swfYieldCdoId] = updatedCdo;

            // Reset accumulated pool in the policy
            newState.swfReinsuranceOptionMarginPolicies[policyKey] = {
              ...policy,
              accumulatedFeeReinvestmentPool: 0,
              timestamp: newState.step,
            };

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Option Margin Fee Reinvestment] Reinvested ${reinvestedAmount} accumulated gold fees back into SWF Yield CDO ${policy.swfYieldCdoId} tranche ${policy.trancheId} yield pool on epoch boundary (increased total shares by ${reinvestedAmount}).`
            );
          }
        }
      }
    }
  }

  // AF-207: Sweep Pool Redistribution and Alliance Stability Pool Yield Auto-Compounding
  if (
    newState.swfStakingSweepPool !== undefined &&
    newState.sweepPoolRedistributionThreshold !== undefined &&
    newState.swfStakingSweepPool >= newState.sweepPoolRedistributionThreshold
  ) {
    if (newState.sweepPoolRedistributionProposals) {
      for (const redistProp of Object.values(newState.sweepPoolRedistributionProposals)) {
        if (redistProp.status !== "authorized") continue;

        const { syndicateId, targetSyndicateId, autoCompound } = redistProp;

        // Check if there is a corresponding authorized cooperative yield sweep proposal
        let correspondingSweep: any = null;
        if (newState.cooperativeStakingYieldSweepProposals) {
          for (const sweepProp of Object.values(newState.cooperativeStakingYieldSweepProposals)) {
            if (
              sweepProp.status === "authorized" &&
              ((sweepProp.syndicateId === syndicateId && sweepProp.targetSyndicateId === targetSyndicateId) ||
               (sweepProp.syndicateId === targetSyndicateId && sweepProp.targetSyndicateId === syndicateId))
            ) {
              correspondingSweep = sweepProp;
              break;
            }
          }
        }

        if (!correspondingSweep) continue;

        const factionId = correspondingSweep.factionId;
        const criticalThreshold = correspondingSweep.criticalThreshold;

        const standing1 = getSyndicateFactionStanding(newState, syndicateId, factionId);
        const standing2 = getSyndicateFactionStanding(newState, targetSyndicateId, factionId);

        // Standing is recovered if both syndicates have standing >= criticalThreshold
        if (standing1 >= criticalThreshold && standing2 >= criticalThreshold) {
          const sweepPoolAmount = newState.swfStakingSweepPool;
          newState.swfStakingSweepPool = 0; // Swept pool is fully redistributed

          // Get participation ranks
          const rank1 = newState.syndicateMeshParticipationRanks?.[syndicateId] ?? 1;
          const rank2 = newState.syndicateMeshParticipationRanks?.[targetSyndicateId] ?? 1;

          // Wire faction reputation standing to scale ranks dynamically (AF-208)
          const scaledRank1 = rank1 * Math.max(1, standing1);
          const scaledRank2 = rank2 * Math.max(1, standing2);
          const totalRank = scaledRank1 + scaledRank2;

          const share1 = Math.floor(sweepPoolAmount * (scaledRank1 / totalRank));
          const share2 = sweepPoolAmount - share1;

          // Auto-compound or distribute
          if (autoCompound) {
            if (!newState.marginAccounts) newState.marginAccounts = {};
            
            // Initialize margin accounts if they don't exist
            if (!newState.marginAccounts[syndicateId]) {
              newState.marginAccounts[syndicateId] = {
                syndicateId,
                collateral: 0,
                timestamp: newState.step,
                swfStakingEnabled: true,
                swfStakingTargets: { [factionId]: 100 },
                swfLiquidityBuffer: 0,
              };
            }
            if (!newState.marginAccounts[targetSyndicateId]) {
              newState.marginAccounts[targetSyndicateId] = {
                syndicateId: targetSyndicateId,
                collateral: 0,
                timestamp: newState.step,
                swfStakingEnabled: true,
                swfStakingTargets: { [factionId]: 100 },
                swfLiquidityBuffer: 0,
              };
            }

            const ma1 = newState.marginAccounts[syndicateId];
            ma1.collateral += share1;
            ma1.swfLiquidityBuffer = (ma1.swfLiquidityBuffer ?? 0) + share1;
            ma1.timestamp = newState.step;

            const ma2 = newState.marginAccounts[targetSyndicateId];
            ma2.collateral += share2;
            ma2.swfLiquidityBuffer = (ma2.swfLiquidityBuffer ?? 0) + share2;
            ma2.timestamp = newState.step;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Staking Sweep Auto-Compound] Redistributed and auto-compounded ${sweepPoolAmount} gold from sweep pool back to Syndicate ${syndicateId} (${share1} gold) and Syndicate ${targetSyndicateId} (${share2} gold) SWF staking targets.`
            );
          } else {
            // Distribute as war chest gold
            const syndicatesCopy = { ...newState.syndicates };
            const synd1 = syndicatesCopy[syndicateId];
            if (synd1) {
              syndicatesCopy[syndicateId] = {
                ...synd1,
                warChest: (synd1.warChest ?? 0) + share1,
              };
            }
            const synd2 = syndicatesCopy[targetSyndicateId];
            if (synd2) {
              syndicatesCopy[targetSyndicateId] = {
                ...synd2,
                warChest: (synd2.warChest ?? 0) + share2,
              };
            }
            newState.syndicates = syndicatesCopy;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[SWF Staking Sweep Redistribution] Redistributed ${sweepPoolAmount} gold from sweep pool back to Syndicate ${syndicateId} (${share1} gold) and Syndicate ${targetSyndicateId} (${share2} gold) war chests.`
            );
          }
          // Only do one redistribution per tick to avoid redundant sweeps
          break;
        }
      }
    }
  }

  return newState;
}

function getWeatherForStep(
  seed: number,
  step: number,
  weatherPool?: string[]
): { weather: string; temperature: string; wind: string } {
  const defaultWeathers = ["clear", "rain", "fog", "storm"];
  const weathers = (weatherPool && weatherPool.length > 0) ? weatherPool : defaultWeathers;
  const temperatures = ["cold", "mild", "hot"];
  const winds = ["calm", "breezy", "gale", "tempest"];

  const interval = Math.floor(step / 5);
  const h1 = Math.abs(Math.imul(seed ^ interval, 0x6D2B79F5)) | 0;
  const weatherIndex = h1 % weathers.length;

  const h2 = Math.abs(Math.imul(h1 ^ 0x6D2B79F5, 0x6D2B79F5)) | 0;
  const tempIndex = h2 % temperatures.length;

  const h3 = Math.abs(Math.imul(h2 ^ 0x6D2B79F5, 0x6D2B79F5)) | 0;
  const windIndex = h3 % winds.length;

  return {
    weather: weathers[weatherIndex],
    temperature: temperatures[tempIndex],
    wind: winds[windIndex],
  };
}

export function tickSweepPoolVolatilityHedging(state: GameState): GameState {
  const newState = {
    ...state,
    journal: state.journal ? [...state.journal] : [],
  };

  if (newState.sweepPoolWeatherForecastOracleAuthorized) {
    const currentStepStr = (newState.step ?? 0).toString();
    const predictionForCurrentStep = newState.weatherForecastHistory?.[currentStepStr];
    if (predictionForCurrentStep !== undefined) {
      const actualWeather = newState.environment?.weather ?? "clear";
      const actualWind = newState.environment?.wind ?? "calm";
      
      let actBaseVol = 0;
      if (actualWeather === "storm") actBaseVol = 50;
      else if (actualWeather === "rain") actBaseVol = 20;
      else if (actualWeather === "fog") actBaseVol = 15;
      else if (actualWeather === "clear") actBaseVol = 5;

      let actWindVol = 0;
      if (actualWind === "tempest") actWindVol = 30;
      else if (actualWind === "gale") actWindVol = 15;
      else if (actualWind === "breezy") actWindVol = 5;
      
      const actualVol = actBaseVol + actWindVol;
      
      if (Math.abs(predictionForCurrentStep - actualVol) > 20) {
        if (!newState.weatherForecastAnomalies) {
          newState.weatherForecastAnomalies = [];
        }
        if (!newState.weatherForecastAnomalies.includes(newState.step)) {
          newState.weatherForecastAnomalies.push(newState.step);
        }
        
        newState.journal.push(
          `[Oracle Anomaly Detected] Weather forecast oracle predicted volatility ${predictionForCurrentStep} for step ${newState.step}, but actual volatility was ${actualVol} (Mismatch > 20 points). Anomaly registered at step ${newState.step}.`
        );
      }
    }
  }

  if (
    newState.sweepPoolVolatilityHedgingPolicyAuthorized !== true ||
    newState.sweepPoolVolatilityHedgingThreshold === undefined ||
    newState.sweepPoolVolatilityHedgingRatio === undefined ||
    newState.sweepPoolVolatilityHedgingReserveFloor === undefined
  ) {
    return state;
  }

  // 1. Calculate current regional weather volatility index
  const env = newState.environment;
  if (!env) return state;

  let baseVol = 0;
  if (env.weather === "storm") baseVol = 50;
  else if (env.weather === "rain") baseVol = 20;
  else if (env.weather === "fog") baseVol = 15;
  else if (env.weather === "clear") baseVol = 5;

  let windVol = 0;
  if (env.wind === "tempest") windVol = 30;
  else if (env.wind === "gale") windVol = 15;
  else if (env.wind === "breezy") windVol = 5;

  const currentWeatherVol = baseVol + windVol;

  // 2. Check if index spikes above the threshold
  // Find syndicateId and factionId from cooperative yield sweep / authorized hedging proposal
  let activeSyndicateId = "";
  let activeFactionId = "rangers"; // default faction if none found

  // Find authorized volatility hedging proposal to get the syndicate ID
  const activeHedgeProp = Object.values(newState.sweepPoolVolatilityHedgingProposals || {}).find(
    (p: any) => p.status === "authorized"
  );
  if (activeHedgeProp) {
    activeSyndicateId = activeHedgeProp.syndicateId;
  }

  // Find authorized cooperative staking sweep proposal to get the faction ID
  if (newState.cooperativeStakingYieldSweepProposals) {
    const activeSweepProp = Object.values(newState.cooperativeStakingYieldSweepProposals).find(
      (p: any) => p.status === "authorized"
    );
    if (activeSweepProp) {
      activeFactionId = activeSweepProp.factionId;
      if (!activeSyndicateId) {
        activeSyndicateId = activeSweepProp.syndicateId;
      }
    }
  }

  // 2. Check if index spikes above the threshold
  if (currentWeatherVol >= newState.sweepPoolVolatilityHedgingThreshold) {
    // 3. Spiked! Spend sweep pool gold above the reserve floor
    const availableGold = Math.max(0, (newState.swfStakingSweepPool ?? 0) - newState.sweepPoolVolatilityHedgingReserveFloor);

    let activeRatio = newState.sweepPoolVolatilityHedgingRatio;
    let forecastLog = "";

    if (newState.sweepPoolWeatherForecastOracleAuthorized) {
      const seed = newState.seed ?? 12345;
      const forecastStep = (newState.step ?? 0) + 5;
      const forecast = getWeatherForStep(seed, forecastStep);

      let fBaseVol = 0;
      if (forecast.weather === "storm") fBaseVol = 50;
      else if (forecast.weather === "rain") fBaseVol = 20;
      else if (forecast.weather === "fog") fBaseVol = 15;
      else if (forecast.weather === "clear") fBaseVol = 5;

      let fWindVol = 0;
      if (forecast.wind === "tempest") fWindVol = 30;
      else if (forecast.wind === "gale") fWindVol = 15;
      else if (forecast.wind === "breezy") fWindVol = 5;

      let predictedVol = fBaseVol + fWindVol;
      const stepStr = forecastStep.toString();

      const activeOracles = Object.values(newState.weatherForecastOracles || {}).filter(
        (oracle) => oracle.reputation >= oracle.reputationThreshold && oracle.reputation > 0
      );

      if (activeOracles.length > 0) {
        let weightedSum = 0;
        let totalRep = 0;
        
        if (!newState.weatherForecastOracleHistory) {
          newState.weatherForecastOracleHistory = {};
        }
        if (!newState.weatherForecastOracleHistory[stepStr]) {
          newState.weatherForecastOracleHistory[stepStr] = {};
        }

        for (const oracle of activeOracles) {
          let oPred = fBaseVol + fWindVol;

          // Check individual overrides first
          if (newState.weatherForecastOracleIndividualOverrides?.[stepStr]?.[oracle.id] !== undefined) {
            oPred = newState.weatherForecastOracleIndividualOverrides[stepStr][oracle.id];
          } else if (newState.weatherForecastOracleIndividualOverrides?.[stepStr]?.[oracle.provider] !== undefined) {
            oPred = newState.weatherForecastOracleIndividualOverrides[stepStr][oracle.provider];
          } else if (
            newState.weatherForecastOracleMaliciousOverride?.[stepStr] !== undefined &&
            (oracle.provider === newState.sweepPoolWeatherForecastOracleProvider || 
             activeOracles.indexOf(oracle) === 0)
          ) {
            oPred = newState.weatherForecastOracleMaliciousOverride[stepStr];
          }

          newState.weatherForecastOracleHistory[stepStr][oracle.id] = oPred;
          weightedSum += oPred * oracle.reputation;
          totalRep += oracle.reputation;
        }

        predictedVol = totalRep > 0 ? Math.round(weightedSum / totalRep) : (fBaseVol + fWindVol);
      } else {
        // Fallback to single/legacy override
        if (newState.weatherForecastOracleMaliciousOverride?.[stepStr] !== undefined) {
          predictedVol = newState.weatherForecastOracleMaliciousOverride[stepStr];
        }
      }

      if (!newState.weatherForecastHistory) {
        newState.weatherForecastHistory = {};
      }
      newState.weatherForecastHistory[stepStr] = predictedVol;

      const threshold = newState.sweepPoolVolatilityHedgingThreshold;
      const accuracy = newState.sweepPoolWeatherForecastOracleAccuracyFloor ?? 100;

      const oldRatio = activeRatio;
      if (predictedVol < threshold) {
        // Stable forecast: reduce hedging ratio
        const stabilityFactor = predictedVol / threshold;
        const scaling = 1 - (1 - stabilityFactor) * (accuracy / 100);
        activeRatio = Math.max(0, Math.round(activeRatio * scaling));
        forecastLog = ` (Oracle predicted stable weather with volatility ${predictedVol} < Threshold ${threshold}. Dynamically optimized hedging ratio from ${oldRatio}% to ${activeRatio}%).`;
      } else {
        // Volatile forecast: increase hedging ratio
        const volatilityFactor = predictedVol / threshold;
        const scaling = 1 + (volatilityFactor - 1) * (accuracy / 100);
        activeRatio = Math.min(100, Math.round(activeRatio * scaling));
        forecastLog = ` (Oracle predicted volatile weather with volatility ${predictedVol} >= Threshold ${threshold}. Dynamically adjusted hedging ratio from ${oldRatio}% to ${activeRatio}%).`;
      }
    }

    const baseHedgeCost = Math.floor(availableGold * (activeRatio / 100));

    // Calculate faction alliance loyalty discount on volatility option premium
    let allianceMultiplier = 1.0;
    let standing = 0;
    let loyaltyRank = "None";
    if (activeSyndicateId && activeFactionId) {
      standing = getSyndicateFactionStanding(newState, activeSyndicateId, activeFactionId);
      loyaltyRank = getSyndicateFactionLoyaltyRank(newState, activeSyndicateId, activeFactionId);

      const standingDiscount = standing * 0.0025; // 0.25% discount per standing point
      let rankDiscount = 0.0;
      if (loyaltyRank === "Platinum") rankDiscount = 0.3;
      else if (loyaltyRank === "Gold") rankDiscount = 0.2;
      else if (loyaltyRank === "Silver") rankDiscount = 0.15;
      else if (loyaltyRank === "Bronze") rankDiscount = 0.1;

      allianceMultiplier = Math.max(0.5, 1.0 - (standingDiscount + rankDiscount));
    }

    const hedgeCost = Math.floor(baseHedgeCost * allianceMultiplier);

    if (hedgeCost > 0) {
      newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) - hedgeCost;

      if (!newState.swfReinsuranceOptionVolatilityInsurancePools) {
        newState.swfReinsuranceOptionVolatilityInsurancePools = {};
      }

      const firstPoolKey = Object.keys(newState.swfReinsuranceOptionVolatilityInsurancePools)[0] || "default_weather_vol_pool";
      if (!newState.swfReinsuranceOptionVolatilityInsurancePools[firstPoolKey]) {
        newState.swfReinsuranceOptionVolatilityInsurancePools[firstPoolKey] = {
          id: firstPoolKey,
          swfYieldCdoId: "default_cdo",
          trancheId: "senior",
          balance: 0,
          timestamp: newState.step,
        };
      }

      const pool = { ...newState.swfReinsuranceOptionVolatilityInsurancePools[firstPoolKey] };
      pool.balance = (pool.balance ?? 0) + hedgeCost;
      pool.timestamp = newState.step;

      newState.swfReinsuranceOptionVolatilityInsurancePools = {
        ...newState.swfReinsuranceOptionVolatilityInsurancePools,
        [firstPoolKey]: pool,
      };

      let loyaltyDiscountLog = "";
      if (allianceMultiplier < 1.0) {
        const discountPct = Math.round((1.0 - allianceMultiplier) * 100);
        loyaltyDiscountLog = ` (Applied faction alliance loyalty discount of ${discountPct}% based on standing ${standing} and loyalty rank ${loyaltyRank}).`;
      }

      newState.journal.push(
        `[Sweep Pool Volatility Hedging Triggered] Regional weather volatility index spiked to ${currentWeatherVol} >= Threshold ${newState.sweepPoolVolatilityHedgingThreshold}! Automatically purchased volatility insurance options by spending ${hedgeCost} gold from sweep pool reserves, maintaining reserve floor above ${newState.sweepPoolVolatilityHedgingReserveFloor} gold (New Volatility Insurance Pool ${firstPoolKey} Balance: ${pool.balance} gold).` + forecastLog + loyaltyDiscountLog
      );
    }
  } else {
    // Current weather is stable! Check if predicted weather is also stable to trigger a speculative payout
    if (newState.sweepPoolWeatherForecastOracleAuthorized) {
      const seed = newState.seed ?? 12345;
      const forecastStep = (newState.step ?? 0) + 5;
      const forecast = getWeatherForStep(seed, forecastStep);

      let fBaseVol = 0;
      if (forecast.weather === "storm") fBaseVol = 50;
      else if (forecast.weather === "rain") fBaseVol = 20;
      else if (forecast.weather === "fog") fBaseVol = 15;
      else if (forecast.weather === "clear") fBaseVol = 5;

      let fWindVol = 0;
      if (forecast.wind === "tempest") fWindVol = 30;
      else if (forecast.wind === "gale") fWindVol = 15;
      else if (forecast.wind === "breezy") fWindVol = 5;

      let predictedVol = fBaseVol + fWindVol;
      const stepStr = forecastStep.toString();

      const activeOracles = Object.values(newState.weatherForecastOracles || {}).filter(
        (oracle) => oracle.reputation >= oracle.reputationThreshold && oracle.reputation > 0
      );

      if (activeOracles.length > 0) {
        let weightedSum = 0;
        let totalRep = 0;
        
        if (!newState.weatherForecastOracleHistory) {
          newState.weatherForecastOracleHistory = {};
        }
        if (!newState.weatherForecastOracleHistory[stepStr]) {
          newState.weatherForecastOracleHistory[stepStr] = {};
        }

        for (const oracle of activeOracles) {
          let oPred = fBaseVol + fWindVol;

          // Check individual overrides first
          if (newState.weatherForecastOracleIndividualOverrides?.[stepStr]?.[oracle.id] !== undefined) {
            oPred = newState.weatherForecastOracleIndividualOverrides[stepStr][oracle.id];
          } else if (newState.weatherForecastOracleIndividualOverrides?.[stepStr]?.[oracle.provider] !== undefined) {
            oPred = newState.weatherForecastOracleIndividualOverrides[stepStr][oracle.provider];
          } else if (
            newState.weatherForecastOracleMaliciousOverride?.[stepStr] !== undefined &&
            (oracle.provider === newState.sweepPoolWeatherForecastOracleProvider || 
             activeOracles.indexOf(oracle) === 0)
          ) {
            oPred = newState.weatherForecastOracleMaliciousOverride[stepStr];
          }

          newState.weatherForecastOracleHistory[stepStr][oracle.id] = oPred;
          weightedSum += oPred * oracle.reputation;
          totalRep += oracle.reputation;
        }

        predictedVol = totalRep > 0 ? Math.round(weightedSum / totalRep) : (fBaseVol + fWindVol);
      } else {
        // Fallback to single/legacy override
        if (newState.weatherForecastOracleMaliciousOverride?.[stepStr] !== undefined) {
          predictedVol = newState.weatherForecastOracleMaliciousOverride[stepStr];
        }
      }

      if (!newState.weatherForecastHistory) {
        newState.weatherForecastHistory = {};
      }
      newState.weatherForecastHistory[stepStr] = predictedVol;

      const threshold = newState.sweepPoolVolatilityHedgingThreshold;

      if (predictedVol < threshold) {
        // Predicted weather is stable! Check if we have volatility insurance pools to draw speculative payouts from
        const insurancePools = newState.swfReinsuranceOptionVolatilityInsurancePools || {};
        const firstPoolKey = Object.keys(insurancePools)[0];
        if (firstPoolKey && insurancePools[firstPoolKey] && insurancePools[firstPoolKey].balance > 0) {
          const pool = { ...insurancePools[firstPoolKey] };
          const balance = pool.balance ?? 0;

          // Payout up to 25% of pool balance scaled by stability factor
          const stabilityFactor = 1.0 - (predictedVol / threshold);
          const payoutPercent = 0.25;
          const speculativePayout = Math.max(1, Math.floor(balance * payoutPercent * stabilityFactor));

          if (speculativePayout > 0) {
            pool.balance = Math.max(0, balance - speculativePayout);
            newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) + speculativePayout;
            newState.swfReinsuranceOptionVolatilityInsurancePools = {
              ...insurancePools,
              [firstPoolKey]: pool,
            };

            newState.journal.push(
              `[Speculative Hedging Payout] Predicted weather volatility reverted to stable (${predictedVol} < Threshold ${threshold}). Awarded speculative profit payout of ${speculativePayout} gold back to the sweep pool from Volatility Insurance Pool ${firstPoolKey} (Remaining Pool Balance: ${pool.balance} gold).`
            );
          }
        }
      }
    }
  }

  return newState;
}

export function tickAllianceYieldAutoRepay(state: GameState): GameState {
  if (!state.swfAllianceYieldAutoRepayRate) return state;

  const activeProp = Object.values(state.swfAllianceYieldAutoRepayProposals || {}).find(
    (p: any) => p.status === "authorized"
  );
  if (!activeProp) return state;

  const newState: GameState = {
    ...state,
    syndicates: state.syndicates ? { ...state.syndicates } : {},
    outstandingDeflectionFees: state.outstandingDeflectionFees ? { ...state.outstandingDeflectionFees } : {},
    slashedCDOTrancheShares: state.slashedCDOTrancheShares ? { ...state.slashedCDOTrancheShares } : {},
    swfYieldCDOs: state.swfYieldCDOs ? { ...state.swfYieldCDOs } : {},
    journal: state.journal ? [...state.journal] : [],
  };

  const proposerSyndicateId = activeProp.syndicateId;
  const syndicates = newState.syndicates || {};
  
  // Find all allied syndicates in the alliance
  const allies = Object.keys(syndicates).filter(otherId => {
    if (otherId === proposerSyndicateId) return false;
    return (
      newState.syndicateAlliances?.[proposerSyndicateId]?.[otherId] === "allied" ||
      newState.syndicateAlliances?.[otherId]?.[proposerSyndicateId] === "allied"
    );
  });
  const allianceSyndicateIds = [proposerSyndicateId, ...allies];

  // Calculate collective alliance war chest wealth
  let totalAllianceWarChests = 0;
  for (const sId of allianceSyndicateIds) {
    const syndicate = syndicates[sId];
    if (syndicate) {
      totalAllianceWarChests += syndicate.warChest ?? 0;
    }
  }

  // Calculate yield generated from collective alliance war chests
  const repayRate = newState.swfAllianceYieldAutoRepayRate ?? 0;
  const generatedYield = Math.round(totalAllianceWarChests * repayRate);
  if (generatedYield > 0) {
    newState.swfStakingSweepPool = (newState.swfStakingSweepPool ?? 0) + generatedYield;
    newState.journal.push(
      `[SWF Alliance Yield Sweep-In] Allocated yield of ${generatedYield} gold generated from collective alliance war chests (Total: ${totalAllianceWarChests} gold, Rate: ${(repayRate * 100).toFixed(1)}%) directly to the sweep pool (New Sweep Pool Balance: ${newState.swfStakingSweepPool} gold).`
    );
  }

  // Calculate active linkStateDropRate by checking reinsurance pools
  let dropRate = 0;
  if (newState.swfMultiFundReinsurancePools) {
    for (const pool of Object.values(newState.swfMultiFundReinsurancePools)) {
      if (pool.linkStateDropRate !== undefined) {
        dropRate = Math.max(dropRate, pool.linkStateDropRate);
      }
    }
  }

  const partitionThreshold = newState.swfAllianceYieldAutoRepayPartitionThreshold ?? 0.5;
  const isHighRiskPartition = dropRate >= partitionThreshold;

  if (isHighRiskPartition) {
    // Collect outstanding deflection fees for all allied members
    const outstandingFeesList: { syndicateId: string; fee: number }[] = [];
    let totalOutstandingAlliedFees = 0;
    const outstandingDeflectionFees = newState.outstandingDeflectionFees || {};
    
    for (const sId of allianceSyndicateIds) {
      const fee = outstandingDeflectionFees[sId] ?? 0;
      if (fee > 0) {
        outstandingFeesList.push({ syndicateId: sId, fee });
        totalOutstandingAlliedFees += fee;
      }
    }

    if (totalOutstandingAlliedFees > 0 && (newState.swfStakingSweepPool ?? 0) > 0) {
      const availableSweepGold = newState.swfStakingSweepPool ?? 0;
      const totalRepaidPool = Math.min(availableSweepGold, totalOutstandingAlliedFees);
      
      newState.swfStakingSweepPool = Math.max(0, availableSweepGold - totalRepaidPool);

      for (const item of outstandingFeesList) {
        const sId = item.syndicateId;
        const fee = item.fee;
        
        // Prorated repayment share
        let repaidAmount = 0;
        if (totalRepaidPool === totalOutstandingAlliedFees) {
          repaidAmount = fee;
        } else {
          repaidAmount = Math.floor(totalRepaidPool * (fee / totalOutstandingAlliedFees));
        }

        if (repaidAmount > 0) {
          outstandingDeflectionFees[sId] = Math.max(0, fee - repaidAmount);
          newState.outstandingDeflectionFees = outstandingDeflectionFees;
          
          newState.journal.push(
            `[SWF Alliance Yield Repayment] Auto-repaid ${repaidAmount} gold outstanding deflection fee for Syndicate ${sId} from SWF sweep pool (Remaining Outstanding Fee: ${outstandingDeflectionFees[sId]} gold).`
          );

          if (!newState.creditRatings) {
            newState.creditRatings = {};
          }
          newState.creditRatings = { ...newState.creditRatings };
          const currentRating = newState.creditRatings[sId] ?? 100;
          const recoveryMultiplier = newState.swfAllianceYieldAutoRepayCreditRatingRecoveryMultiplier ?? 1.0;
          const baseRecovery = 10;
          const ratingBoost = Math.round(baseRecovery * recoveryMultiplier * (1.0 + repayRate * 5));
          newState.creditRatings[sId] = Math.min(200, currentRating + ratingBoost);
          newState.journal.push(
            `[SWF Alliance Yield Credit Recovery] Recovered credit rating score for Syndicate ${sId} by +${ratingBoost} to ${newState.creditRatings[sId]} (Multiplier: ${recoveryMultiplier.toFixed(2)}, Repayment Rate: ${(repayRate * 100).toFixed(1)}%).`
          );

          // Restore slashed CDO shares: 10 gold repaid = 1 CDO share restored
          const sharesToRestore = Math.floor(repaidAmount / 10);
          if (sharesToRestore > 0) {
            let restoredCount = 0;
            const slashedCDOTrancheShares = newState.slashedCDOTrancheShares || {};
            const slashedMap = slashedCDOTrancheShares[sId];
            if (slashedMap) {
              // Create a mutable copy of the syndicate's slashed CDO tranches map
              slashedCDOTrancheShares[sId] = { ...slashedMap };
              newState.slashedCDOTrancheShares = slashedCDOTrancheShares;
              
              for (const [cdoId, tranches] of Object.entries(slashedMap)) {
                if (restoredCount >= sharesToRestore) break;
                
                slashedCDOTrancheShares[sId][cdoId] = { ...tranches };
                
                for (const [trancheId, slashedAmount] of Object.entries(tranches)) {
                  if (restoredCount >= sharesToRestore) break;
                  if (slashedAmount > 0) {
                    const toRestore = Math.min(sharesToRestore - restoredCount, slashedAmount);
                    if (toRestore > 0) {
                      // Deduct from slashed CDO tracking
                      slashedCDOTrancheShares[sId][cdoId][trancheId] = slashedAmount - toRestore;
                      restoredCount += toRestore;

                      // Restore to tranche ownership and totalShares
                      const cdo = newState.swfYieldCDOs?.[cdoId];
                      const tranche = cdo?.tranches?.[trancheId as "senior" | "mezzanine" | "equity"];
                      if (cdo && tranche) {
                        const updatedTranche = {
                          ...tranche,
                          ownership: {
                            ...tranche.ownership,
                            [sId]: (tranche.ownership?.[sId] ?? 0) + toRestore
                          },
                          totalShares: (tranche.totalShares ?? 0) + toRestore,
                          timestamp: newState.step
                        };

                        newState.swfYieldCDOs = {
                          ...newState.swfYieldCDOs,
                          [cdoId]: {
                            ...cdo,
                            tranches: {
                              ...cdo.tranches,
                              [trancheId]: updatedTranche
                            },
                            timestamp: newState.step
                          }
                        };
                      }
                    }
                  }
                }
              }
            }
            if (restoredCount > 0) {
              newState.journal.push(
                `[SWF Alliance Yield CDO Restore] Restored ${restoredCount} slashed CDO tranche shares for Syndicate ${sId} due to outstanding deflection fee repayment.`
              );
            }
          }
        }
      }
    }
  }

  return newState;
}

export function getCDSCDOYieldHedgingPremium(state: GameState, cdoId: string, coverageAmount: number): number {
  const pool = state.sovereignDebtCDSCDOPools?.[cdoId];
  const spread = pool?.premiumPricingSpread ?? 0.05; // base spread
  
  // Dynamic factors:
  // 1. Weather volatility multiplier
  let weatherVolatility = 0.0;
  if (state.weatherForecastOracleHistory) {
    weatherVolatility = (state.step % 5) * 0.01;
  }
  
  // 2. Active default alerts multiplier
  let defaultRiskMultiplier = 1.0;
  const poolCDSs = Object.values(state.sovereignDebtCDSContracts || {}).filter(c => c.cdoId === cdoId);
  const targetSyndicates = poolCDSs.map(c => c.targetSyndicateId);
  const activeAlerts = Object.values(state.sovereignDebtDefaultAlerts || {}).filter(
    (a: any) => targetSyndicates.includes(a.targetSyndicateId) && a.status === "authorized" && !a.resolved
  );
  if (activeAlerts.length > 0) {
    defaultRiskMultiplier = 2.0; // Double the premium under active default alerts
  }

  // Equation: coverageAmount * (spread + weatherVolatility) * defaultRiskMultiplier
  const premium = Math.round(coverageAmount * (spread + weatherVolatility) * defaultRiskMultiplier);
  return Math.max(1, premium);
}



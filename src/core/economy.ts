import { GameState, cloneMerchantInventories, getSafehouseStorageCapacity, getSyndicateBankCapacity, getCollateralValue, getSecondaryReserveVaults, getSyndicateFactionLoyaltyRank, isRankAtLeast, getBondCurrentYield, getBondVolatility, calculateOptionPremium, recalculateSWFYieldCDORiskRatings, getCDOTrancheReinsurancePremiumRate, SWFReinsuranceOptionOrderBookDepth } from "./state.js";
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
    const bidAskSpread = (highestBuyPrice > 0 && lowestSellPrice > 0) ? Math.max(0, lowestSellPrice - highestBuyPrice) : 0;

    let spreadAdjustment = 1.0;
    if (buyVolume + sellVolume > 0) {
      spreadAdjustment = 1.0 + (imbalance / (buyVolume + sellVolume)) * 0.5;
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
  const newState = {
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

  // SWF Reinsurance Option Order Book Volume Tracking (AF-150) & Depths (AF-151)
  const afterMetrics = recalculateReinsuranceOptionOrderBookMetrics(newState);
  newState.swfReinsuranceOptionOrderBookVolumes = afterMetrics.swfReinsuranceOptionOrderBookVolumes;
  newState.swfReinsuranceOptionOrderBookDepths = afterMetrics.swfReinsuranceOptionOrderBookDepths;
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

          if (!newState.journal) newState.journal = [];
          newState.journal.push(`[SWF Yield CDO CDS Premium] Syndicate ${updatedCds.buyerSyndicateId} paid ${actualPaid} gold premium to Syndicate ${updatedCds.writerSyndicateId} for SWF Yield CDO CDS ${cdsId}.`);
          
          if (actualPaid < premium) {
            updatedCds.active = false;
            newState.journal.push(`[SWF Yield CDO CDS Terminated] CDS ${cdsId} terminated due to insufficient premium payment from Syndicate ${updatedCds.buyerSyndicateId}.`);
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
                marginAccount.collateral += goldEarned;
                // Since yield is returned to collateral, it increases the SWF liquidity buffer too
                marginAccount.swfLiquidityBuffer = (marginAccount.swfLiquidityBuffer ?? 0) + goldEarned;
                
                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Staking Yield] Syndicate ${syndicateId} earned ${goldEarned} gold yield from staking ${stakedAmount} gold in faction ${factionId} staking pool (Yield Rate: ${(yieldRate * 100).toFixed(1)}%)${campaignBoostMsg}.`
                );
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
      const activeSwfCDSIds = marginAccount.leveragedSWFYieldCDOCDSIds || [];
      const stillActiveSwfCDSIds: string[] = [];

      for (const cdsId of activeSwfCDSIds) {
        const cds = newState.swfYieldCDOCDSs?.[cdsId];
        if (cds && cds.active) {
          sumSwfCdsNotional += cds.notionalValue;
          stillActiveSwfCDSIds.push(cdsId);
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

            let volatilityToUse = avgVolatility;
            let shockScale = 1.0;
            let flatShock = 0;

            if (stressPolicy) {
              volatilityToUse = avgVolatility + stressPolicy.simulatedVolatilityShock;
              shockScale = stressPolicy.reserveMultiplier;
              flatShock = Math.round(stressPolicy.simulatedLiquidityShock);
            }

            let optRequired = Math.round(opt.size * spotRate * (volatilityToUse / 10.0) * 10);
            optRequired = Math.round(optRequired * shockScale) + flatShock;

            sumOptionsMaintenanceRequirement += optRequired;
          }
        }
      }

      const swfLeverage = marginAccount.swfLeverageFactor ?? 1.0;
      const swfCdsComponent = Math.round((0.20 * sumSwfCdsNotional) / swfLeverage);
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

          if (multiCrossPolicy && multiCrossPolicy.assets && multiCrossPolicy.assets.length > 0) {
            const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
            let delta = 0.5;
            if (opt.optionType === "call") {
              delta = 1.0 / (1.0 + Math.exp(-(spotRate - opt.strikePremiumRate) * 50.0));
            } else {
              delta = 1.0 / (1.0 + Math.exp(-(opt.strikePremiumRate - spotRate) * 50.0));
            }

            for (const asset of multiCrossPolicy.assets) {
              const targetHolding = Math.floor(
                delta * opt.size * asset.correlationCoefficient * asset.hedgeWeight
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

      // Get the liquidation threshold for the syndicate's written options (or use 1.0 if not defined/default)
      let minThreshold = 1.0;
      if (newState.swfReinsuranceOptionsContracts) {
        for (const opt of Object.values(newState.swfReinsuranceOptionsContracts)) {
          if (opt.active && opt.writerSyndicateId === syndicateId) {
            const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
            const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
            if (policy) {
              minThreshold = Math.min(minThreshold, policy.liquidationThreshold);
            }
          }
        }
      }

      // If netEquity < maintenanceRequirement * minThreshold or warChest drops below required dynamic buffer, trigger a MARGIN CALL!
      const requiredDynamicBuffer = Math.round(aggregatePendingValue * 0.20);
      const triggerDueToDynamicBuffer = aggregatePendingValue > 0 && warChest < requiredDynamicBuffer;
      const triggerDueToMarginDeficit = netEquity < maintenanceRequirement * minThreshold;

      if (triggerDueToMarginDeficit || triggerDueToDynamicBuffer) {
        if (triggerDueToDynamicBuffer) {
          newState.journal.push(`[Margin Call] Syndicate ${syndicateId} war chest (${warChest} gold) fell below required dynamic buffer of ${requiredDynamicBuffer} gold (20% of aggregate pending SWF options limit order book value ${aggregatePendingValue} gold). Triggering automatic liquidation.`);
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

        // Deactivate and penalize all written option contracts of this syndicate (AF-156)
        if (newState.swfReinsuranceOptionsContracts) {
          newState.swfReinsuranceOptionsContracts = { ...newState.swfReinsuranceOptionsContracts };
          newState.syndicates = newState.syndicates ? { ...newState.syndicates } : {};
          for (const [optId, opt] of Object.entries(newState.swfReinsuranceOptionsContracts)) {
            if (opt && opt.active && opt.writerSyndicateId === syndicateId) {
              const spotRate = getCDOTrancheReinsurancePremiumRate(newState, opt.swfYieldCdoId, opt.trancheId);
              const policyKey = `${opt.swfYieldCdoId}_${opt.trancheId}`;
              const policy = newState.swfReinsuranceOptionMarginPolicies?.[policyKey];
              const pRate = policy ? policy.penaltyRate : 0.15;
              const penalty = Math.floor(opt.size * spotRate * pRate * 100);

              // Charge writer's collateral
              netEquity -= penalty;

              // Pay option holder
              if (opt.syndicateId !== "market_maker") {
                const holder = newState.syndicates[opt.syndicateId];
                if (holder) {
                  holder.warChest = (holder.warChest ?? 0) + penalty;
                }
              }

              newState.swfReinsuranceOptionsContracts[optId] = {
                ...opt,
                active: false,
                timestamp: newState.step,
              };

              newState.journal.push(`[Option Liquidation] Written option contract ${optId} of Syndicate ${syndicateId} has been liquidated. Charge penalty of ${penalty} gold paid to Syndicate ${opt.syndicateId}.`);
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

  // Recalculate dynamic risk ratings for SWF CDOs
  return recalculateSWFYieldCDORiskRatings(matchedState);
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

        const rebatePolicy = newState.swfReinsuranceOptionMarketMakerRebatePolicies?.[policyKey];
        const baseRebateRate = rebatePolicy ? rebatePolicy.baseRebateRate : 0;
        const maxRebateRate = rebatePolicy ? rebatePolicy.maxRebateRate : 0;
        const rebateRate = Math.min(maxRebateRate, baseRebateRate * closeness);
        const rebateAmount = Math.round(finalPrice * rebateRate);

        // Check buyer warChest
        if ((buyer.warChest ?? 0) < finalPrice + finalFeeA) {
          continue; // Buyer doesn't have enough gold, skip this match
        }
        if ((seller.warChest ?? 0) + finalPrice < finalFeeB) {
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
          };
        }

        // Transfer gold using final price, deduct transaction fees, and apply rebate (AF-155)
        let netBuyerDiff = -finalPrice - finalFeeA;
        let netSellerDiff = finalPrice - finalFeeB;
        if (makerIsBuy) {
          netBuyerDiff += rebateAmount;
        } else {
          netSellerDiff += rebateAmount;
        }

        buyer.warChest = (buyer.warChest ?? 0) + netBuyerDiff;
        seller.warChest = (seller.warChest ?? 0) + netSellerDiff;

        newState.syndicates[buyOrder.syndicateId] = { ...buyer };
        newState.syndicates[sellOrder.syndicateId] = { ...seller };

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
              };

              // Transfer gold
              const buyer = newState.syndicates[openOrder.syndicateId];
              if (buyer && (buyer.warChest ?? 0) >= totalOrderPrice) {
                buyer.warChest = (buyer.warChest ?? 0) - totalOrderPrice;
                provider.warChest = (provider.warChest ?? 0) + totalOrderPrice;

                newState.syndicates[openOrder.syndicateId] = { ...buyer };
                newState.syndicates[providerSyndicateId] = { ...provider };

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
                    };
                  }

                  // Transfer gold
                  const seller = newState.syndicates[openOrder.syndicateId];
                  if (seller) {
                    seller.warChest = (seller.warChest ?? 0) + totalOrderPrice;
                    provider.warChest = (provider.warChest ?? 0) - totalOrderPrice;

                    newState.syndicates[openOrder.syndicateId] = { ...seller };
                    newState.syndicates[providerSyndicateId] = { ...provider };

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
  newState.journal = afterMatchMetrics.journal;

  // AF-153: Dynamic Liquidity Mining Reward distribution based on price closeness to mid-market price
  const rewardedState = distributeReinsuranceLiquidityMiningRewards(newState);

  return rewardedState;
}


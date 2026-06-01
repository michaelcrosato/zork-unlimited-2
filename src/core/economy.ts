import { GameState, cloneMerchantInventories, getSafehouseStorageCapacity, getSyndicateBankCapacity, getCollateralValue, getSecondaryReserveVaults } from "./state.js";
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
  const traderSyndicates = Object.values(state.syndicates || {}).filter(s => s.members.includes(traderId));
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
          const baseRate = loan.refinancedInterestRate !== undefined ? loan.refinancedInterestRate : (bank.interestRate ?? 5);
          const loanRate = Math.max(0, baseRate);
          const interest = Math.floor((loan.amount * loanRate) / 100);

          let updatedLoan = {
            ...loan,
            interestAccrued: loan.interestAccrued + interest,
            timestamp: newState.step,
          };
          loans[agentId] = updatedLoan;
          loansChanged = true;

          // 2. Check for default / enforcer debt-recovery sweep
          if (newState.step > updatedLoan.dueStep) {
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
      const loanRate = Math.max(0, baseRate);
      
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
      if (newState.step > updatedJointLoan.dueStep + (updatedJointLoan.gracePeriodSteps ?? 0)) {
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
                        multiplier = Math.max(0.5, Math.round(multiplier * 10) / 10);

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

            if (newState.step > updatedLoan.dueStep) {
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
                const share = Math.floor(payout * (ownedValue / tranche.totalValue));
                if (share > 0) {
                  newState.syndicates[syndicateId] = {
                    ...syndicate,
                    warChest: (syndicate.warChest ?? 0) + share,
                  };
                  newState.journal.push(`[CDO Yield Payout] Syndicate ${syndicateId} earned ${share} gold payout from CDO ${cdoId} tranche ${tranche.trancheId}.`);
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
  // Automatic Margin Health Evaluation and Collateral Call Liquidations
  if (newState.marginAccounts && Object.keys(newState.marginAccounts).length > 0) {
    newState.marginAccounts = { ...newState.marginAccounts };
    for (const [syndicateId, marginAccount] of Object.entries(newState.marginAccounts)) {
      // AF-111: Process margin rehypothecation yield / sweep risk
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
                interest = Math.max(1, Math.floor(rehypothecatedAmount * vault.interestRate));
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

      if (marginAccount.collateral === 0 && (!marginAccount.leveragedCDSIds || marginAccount.leveragedCDSIds.length === 0) && (!marginAccount.leveragedTranchePositions || Object.keys(marginAccount.leveragedTranchePositions).length === 0)) {
        continue;
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

      const netEquity = marginAccount.collateral + (sumCurrentStakeValue - sumBorrowedAmount);

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

      let rehypothecationPremium = 0;
      if (marginAccount.rehypothecationAuthorized && marginAccount.rehypothecationVaultId && marginAccount.rehypothecationPercentage !== undefined) {
        const vaults = getSecondaryReserveVaults(newState);
        const vault = vaults[marginAccount.rehypothecationVaultId];
        if (vault) {
          const rehypothecatedAmount = Math.floor(marginAccount.collateral * (marginAccount.rehypothecationPercentage / 100));
          rehypothecationPremium = Math.round(rehypothecatedAmount * (0.10 + vault.sweepRisk));
        }
      }

      const maintenanceRequirement = Math.round((0.20 * sumCdsNotional) + (0.10 * sumBorrowedAmount) + rehypothecationPremium);

      // If netEquity < maintenanceRequirement, trigger a MARGIN CALL!
      if (netEquity < maintenanceRequirement) {
        newState.journal.push(`[Margin Call] Syndicate ${syndicateId} margin balance fell below maintenance threshold! Net Equity: ${netEquity}, Required: ${maintenanceRequirement}. Triggering automatic liquidation.`);

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


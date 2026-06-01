import { GameState, cloneMerchantInventories, getSafehouseStorageCapacity, getSyndicateBankCapacity } from "./state.js";
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
          const baseRate = bank.interestRate ?? 5;
          const loanRate = Math.max(5, baseRate);
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


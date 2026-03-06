/**
 * Axolotl needs system
 * Handles wellbeing stat decay and care actions
 * Extracted from gameLogic.ts for better organization
 */

import { Axolotl, AxolotlStats, GameState } from '../types/game';
import { GAME_CONFIG } from '../config/game';

export const STAT_DECAY_RATE = {
  hunger: 0.5, // per minute
  happiness: 0.3,
  cleanliness: 0.2,
  waterQuality: 0.1,
};

/**
 * Calculate water quality decay multiplier based on filter tier
 */
export function getFilterDecayMultiplier(filterTier?: string): number {
  switch (filterTier) {
    case 'filter-premium':
      return 0.3; // 70% slower decay
    case 'filter-advanced':
      return 0.6; // 40% slower decay
    case 'filter-basic':
    default:
      return 1.0; // Normal decay
  }
}

/**
 * Update axolotl wellbeing stats over time
 */
export function updateWellbeingStats(axolotl: Axolotl, gameState?: GameState): Axolotl {
  const now = Date.now();
  const minutesPassed = (now - axolotl.lastUpdated) / (1000 * 60);

  if (minutesPassed < 0.1) return axolotl; // Don't update if less than 6 seconds

  // Water Quality acts as a multiplier on other stats
  const waterQualityMultiplier = axolotl.stats.waterQuality / 100;
  
  // Filter effect on water quality decay
  const filterMultiplier = getFilterDecayMultiplier(gameState?.filterTier);
  
  // Shrimp effects
  const hasShrimp = (gameState?.shrimpCount || 0) > 0;
  const shrimpCleanlinessBonus = hasShrimp 
    ? Math.min(0.5, (gameState?.shrimpCount || 0) * GAME_CONFIG.shrimpCleanlinessBonus) // Max 50% reduction
    : 0;
  
  const newStats: AxolotlStats = {
    // Hunger: stays full if shrimp present
    hunger: hasShrimp 
      ? 100 
      : Math.max(0, axolotl.stats.hunger - STAT_DECAY_RATE.hunger * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    happiness: Math.max(0, axolotl.stats.happiness - STAT_DECAY_RATE.happiness * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    // Cleanliness: shrimp reduce decay
    cleanliness: Math.max(0, axolotl.stats.cleanliness - STAT_DECAY_RATE.cleanliness * minutesPassed * (1 - shrimpCleanlinessBonus) * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    // Water Quality: filter affects decay rate
    waterQuality: Math.max(5, axolotl.stats.waterQuality - STAT_DECAY_RATE.waterQuality * minutesPassed * filterMultiplier),
  };

  return {
    ...axolotl,
    stats: newStats,
    age: axolotl.age + minutesPassed,
    lastUpdated: now,
  };
}

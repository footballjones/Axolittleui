import { Egg, Axolotl } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { breedAxolotls, generateAxolotl } from './gameLogic';

/**
 * Create an egg from rebirth (Elder lays egg)
 */
export function createRebirthEgg(parent: Axolotl, pendingName?: string): Egg {
  // Roll for recessive expression
  let color = parent.color;
  let pattern = parent.pattern;
  
  if (parent.recessiveGenes?.color && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    color = parent.recessiveGenes.color;
  }
  
  if (parent.recessiveGenes?.pattern && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    pattern = parent.recessiveGenes.pattern;
  }
  
  // Determine rarity based on generation and intellect
  let rarity: 'Common' | 'Rare' | 'Legendary' = 'Common';
  if (parent.generation >= 3 || parent.secondaryStats.intellect > 80) {
    rarity = Math.random() < 0.3 ? 'Legendary' : 'Rare';
  } else if (parent.generation >= 2 || parent.secondaryStats.intellect > 60) {
    rarity = Math.random() < 0.5 ? 'Rare' : 'Common';
  }
  
  return {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentIds: [parent.id],
    generation: parent.generation + 1,
    incubationEndsAt: Date.now() + (GAME_CONFIG.eggIncubationHours * 60 * 60 * 1000), // 24 hours
    color,
    pattern,
    rarity,
    pendingName, // Store name provided during rebirth
  };
}

/**
 * Create an egg from breeding (two parents)
 */
export function createBreedingEgg(parent1: Axolotl, parent2: Axolotl): Egg {
  const { color, pattern, recessiveGenes } = breedAxolotls(parent1, parent2);
  
  // Determine rarity (higher with both parents having high intellect or high generation)
  const avgIntellect = (parent1.secondaryStats.intellect + parent2.secondaryStats.intellect) / 2;
  const maxGeneration = Math.max(parent1.generation, parent2.generation);
  
  let rarity: 'Common' | 'Rare' | 'Legendary' = 'Common';
  if (maxGeneration >= 3 || avgIntellect > 80) {
    rarity = Math.random() < 0.3 ? 'Legendary' : 'Rare';
  } else if (maxGeneration >= 2 || avgIntellect > 60) {
    rarity = Math.random() < 0.5 ? 'Rare' : 'Common';
  }
  
  return {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentIds: [parent1.id, parent2.id],
    generation: Math.max(parent1.generation, parent2.generation) + 1,
    incubationEndsAt: Date.now() + (GAME_CONFIG.eggIncubationHours * 60 * 60 * 1000), // 24 hours
    color,
    pattern,
    rarity,
  };
}

/**
 * Hatch an egg into a new axolotl at Baby, Level 1
 * The egg's color/pattern may already include recessive expression from breeding/rebirth
 */
export function hatchEgg(egg: Egg, name: string): Axolotl {
  // Generate new random recessive genes for the hatched axolotl
  // (these will be hidden until future breeding/rebirth)
  return generateAxolotl(
    name,
    egg.generation,
    egg.parentIds,
    egg.color, // May already include recessive expression
    egg.pattern, // May already include recessive expression
    undefined // New random recessive genes for this axolotl
  );
}

/**
 * Check if an egg is ready to hatch
 */
export function isEggReady(egg: Egg): boolean {
  return Date.now() >= egg.incubationEndsAt;
}

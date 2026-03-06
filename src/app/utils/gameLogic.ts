import { Axolotl, AxolotlStats, SecondaryStats, LifeStage } from '../types/game';
import { GAME_CONFIG } from '../config/game';

// Life stages are now based on level only (Baby L1-9, Juvenile L10-19, Adult L20-29, Elder L30-40)
export const STAGE_REQUIREMENTS = {
  baby: { minLevel: 1, maxLevel: 9 },
  juvenile: { minLevel: 10, maxLevel: 19 },
  adult: { minLevel: 20, maxLevel: 29 },
  elder: { minLevel: 30, maxLevel: 40 },
};

export const STAT_DECAY_RATE = {
  hunger: 0.5, // per minute
  happiness: 0.3,
  cleanliness: 0.2,
  waterQuality: 0.1,
};

export const COLORS = [
  '#FFB5E8', // Pink
  '#B5DEFF', // Light Blue
  '#C9FFBF', // Mint Green
  '#FFFFD4', // Pale Yellow
  '#E7C6FF', // Lavender
  '#FFD6A5', // Peach
];

export const PATTERNS = ['solid', 'spotted', 'striped', 'gradient'];

export function generateAxolotl(
  name: string,
  generation: number = 1,
  parentIds: string[] = [],
  inheritedColor?: string,
  inheritedPattern?: string,
  recessiveGenes?: { color?: string; pattern?: string }
): Axolotl {
  // Generate random base secondary stats (30-70 range for variety)
  const baseStats = {
    strength: Math.floor(Math.random() * 40) + 30,
    intellect: Math.floor(Math.random() * 40) + 30,
    stamina: Math.floor(Math.random() * 40) + 30,
    speed: Math.floor(Math.random() * 40) + 30,
  };

  // Assign random recessive genes if not provided
  const genes = recessiveGenes || {
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    pattern: PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
  };

  return {
    id: `axo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    stage: 'baby' as LifeStage,
    stats: {
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      waterQuality: 100,
    },
    secondaryStats: baseStats,
    age: 0,
    experience: 0,
    color: inheritedColor || COLORS[Math.floor(Math.random() * COLORS.length)],
    pattern: inheritedPattern || PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
    generation,
    parentIds,
    birthDate: Date.now(),
    lastUpdated: Date.now(),
    recessiveGenes: genes,
  };
}

export function updateStats(axolotl: Axolotl): Axolotl {
  const now = Date.now();
  const minutesPassed = (now - axolotl.lastUpdated) / (1000 * 60);

  if (minutesPassed < 0.1) return axolotl; // Don't update if less than 6 seconds

  // Water Quality acts as a multiplier on other stats
  const waterQualityMultiplier = axolotl.stats.waterQuality / 100;
  
  const newStats: AxolotlStats = {
    hunger: Math.max(0, axolotl.stats.hunger - STAT_DECAY_RATE.hunger * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    happiness: Math.max(0, axolotl.stats.happiness - STAT_DECAY_RATE.happiness * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    cleanliness: Math.max(0, axolotl.stats.cleanliness - STAT_DECAY_RATE.cleanliness * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    waterQuality: Math.max(5, axolotl.stats.waterQuality - STAT_DECAY_RATE.waterQuality * minutesPassed),
  };

  return {
    ...axolotl,
    stats: newStats,
    age: axolotl.age + minutesPassed,
    lastUpdated: now,
  };
}

export function feedAxolotl(axolotl: Axolotl, amount: number = 25): Axolotl {
  return {
    ...axolotl,
    stats: {
      ...axolotl.stats,
      hunger: Math.min(100, axolotl.stats.hunger + amount),
    },
    experience: axolotl.experience + 2,
  };
}

export function playWithAxolotl(axolotl: Axolotl, amount: number = 20): Axolotl {
  return {
    ...axolotl,
    stats: {
      ...axolotl.stats,
      happiness: Math.min(100, axolotl.stats.happiness + amount),
    },
    experience: axolotl.experience + 3,
  };
}

export function cleanAquarium(axolotl: Axolotl, amount: number = 30): Axolotl {
  return {
    ...axolotl,
    stats: {
      ...axolotl.stats,
      cleanliness: Math.min(100, axolotl.stats.cleanliness + amount),
    },
    experience: axolotl.experience + 2,
  };
}

export function checkEvolution(axolotl: Axolotl): Axolotl {
  const level = calculateLevel(axolotl.experience);
  const stages: LifeStage[] = ['baby', 'juvenile', 'adult', 'elder'];
  const currentIndex = stages.indexOf(axolotl.stage);

  if (currentIndex < stages.length - 1) {
    const nextStage = stages[currentIndex + 1];
    const requirements = STAGE_REQUIREMENTS[nextStage];

    // Evolution based on level only (not age)
    if (level >= requirements.minLevel) {
      return {
        ...axolotl,
        stage: nextStage,
      };
    }
  }

  return axolotl;
}

export function canRebirth(axolotl: Axolotl): boolean {
  const level = calculateLevel(axolotl.experience);
  return axolotl.stage === 'elder' && level >= GAME_CONFIG.rebirthLevel; // Level 40 (Elder)
}

export function getStatColor(value: number): string {
  if (value >= 70) return '#4ade80'; // green
  if (value >= 40) return '#fbbf24'; // yellow
  return '#ef4444'; // red
}

export function breedAxolotls(
  parent1: Axolotl, 
  parent2: Axolotl
): { color: string; pattern: string; recessiveGenes: { color?: string; pattern?: string } } {
  // Randomly inherit visible traits from parents
  let color = Math.random() > 0.5 ? parent1.color : parent2.color;
  let pattern = Math.random() > 0.5 ? parent1.pattern : parent2.pattern;

  // Combine recessive genes from both parents
  const combinedRecessive: { color?: string; pattern?: string } = {};
  
  // Each parent contributes their recessive genes
  if (parent1.recessiveGenes?.color) {
    combinedRecessive.color = parent1.recessiveGenes.color;
  } else if (parent2.recessiveGenes?.color) {
    combinedRecessive.color = parent2.recessiveGenes.color;
  } else {
    // Generate new recessive color if neither parent has one
    combinedRecessive.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  
  if (parent1.recessiveGenes?.pattern) {
    combinedRecessive.pattern = parent1.recessiveGenes.pattern;
  } else if (parent2.recessiveGenes?.pattern) {
    combinedRecessive.pattern = parent2.recessiveGenes.pattern;
  } else {
    combinedRecessive.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  }

  // Roll for recessive expression (20% chance per trait)
  if (combinedRecessive.color && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    color = combinedRecessive.color;
  }
  
  if (combinedRecessive.pattern && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    pattern = combinedRecessive.pattern;
  }

  // Small chance of mutation (overrides everything)
  if (Math.random() < 0.1) {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Keep pattern or mutate it too
    if (Math.random() < 0.5) {
      pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    }
  }

  return { 
    color, 
    pattern,
    recessiveGenes: combinedRecessive,
  };
}

export function calculateLevel(experience: number): number {
  // Level 2 = 10 XP, then +5 per level
  // Level 1: 0 XP
  // Level 2: 10 XP
  // Level 3: 15 XP (10 + 5)
  // Level 4: 20 XP (15 + 5)
  // etc.
  if (experience < GAME_CONFIG.level2XP) return 1;
  
  // XP for level N = 10 + (N-2) * 5
  // Solving for N: N = (XP - 10) / 5 + 2
  const level = Math.floor((experience - GAME_CONFIG.level2XP) / GAME_CONFIG.xpPerLevel) + 2;
  return Math.min(level, 40); // Cap at level 40
}

export function getXPForNextLevel(currentLevel: number): number {
  // Level 2 needs 10 XP, then +5 per level
  if (currentLevel === 1) return GAME_CONFIG.level2XP;
  return GAME_CONFIG.xpPerLevel;
}

export function getCurrentLevelXP(experience: number): number {
  const level = calculateLevel(experience);
  if (level === 1) return experience;
  
  // Total XP needed for current level
  const prevLevelTotalXP = level === 2 
    ? 0 
    : GAME_CONFIG.level2XP + (level - 2) * GAME_CONFIG.xpPerLevel;
  
  return experience - prevLevelTotalXP;
}
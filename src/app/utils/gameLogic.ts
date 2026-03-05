import { Axolotl, AxolotlStats, SecondaryStats, LifeStage } from '../types/game';

export const STAGE_REQUIREMENTS = {
  baby: { minAge: 0, minExp: 0 },
  juvenile: { minAge: 15, minExp: 50 },
  adult: { minAge: 30, minExp: 150 },
  elder: { minAge: 60, minExp: 300 },
};

export const STAT_DECAY_RATE = {
  hunger: 0.5, // per minute
  happiness: 0.3,
  cleanliness: 0.2,
  health: 0.1,
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
  inheritedPattern?: string
): Axolotl {
  // Generate random base secondary stats (30-70 range for variety)
  const baseStats = {
    strength: Math.floor(Math.random() * 40) + 30,
    intellect: Math.floor(Math.random() * 40) + 30,
    stamina: Math.floor(Math.random() * 40) + 30,
    speed: Math.floor(Math.random() * 40) + 30,
  };

  return {
    id: `axo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    stage: 'baby' as LifeStage,
    stats: {
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      health: 100,
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
  };
}

export function updateStats(axolotl: Axolotl): Axolotl {
  const now = Date.now();
  const minutesPassed = (now - axolotl.lastUpdated) / (1000 * 60);

  if (minutesPassed < 0.1) return axolotl; // Don't update if less than 6 seconds

  const newStats: AxolotlStats = {
    hunger: Math.max(0, axolotl.stats.hunger - STAT_DECAY_RATE.hunger * minutesPassed),
    happiness: Math.max(0, axolotl.stats.happiness - STAT_DECAY_RATE.happiness * minutesPassed),
    cleanliness: Math.max(0, axolotl.stats.cleanliness - STAT_DECAY_RATE.cleanliness * minutesPassed),
    health: Math.max(5, axolotl.stats.health - STAT_DECAY_RATE.health * minutesPassed),
  };

  // Health is affected by other stats
  const avgStats = (newStats.hunger + newStats.happiness + newStats.cleanliness) / 3;
  if (avgStats < 30) {
    newStats.health = Math.max(5, newStats.health - 0.5 * minutesPassed);
  } else if (avgStats > 70) {
    newStats.health = Math.min(100, newStats.health + 0.2 * minutesPassed);
  }

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
  const stages: LifeStage[] = ['baby', 'juvenile', 'adult', 'elder'];
  const currentIndex = stages.indexOf(axolotl.stage);

  if (currentIndex < stages.length - 1) {
    const nextStage = stages[currentIndex + 1];
    const requirements = STAGE_REQUIREMENTS[nextStage];

    if (axolotl.age >= requirements.minAge && axolotl.experience >= requirements.minExp) {
      return {
        ...axolotl,
        stage: nextStage,
      };
    }
  }

  return axolotl;
}

export function canRebirth(axolotl: Axolotl): boolean {
  return axolotl.stage === 'adult' && axolotl.age >= 60; // 60 minutes as adult
}

export function getStatColor(value: number): string {
  if (value >= 70) return '#4ade80'; // green
  if (value >= 40) return '#fbbf24'; // yellow
  return '#ef4444'; // red
}

export function breedAxolotls(parent1: Axolotl, parent2: Axolotl): { color: string; pattern: string } {
  // Randomly inherit traits from parents
  const color = Math.random() > 0.5 ? parent1.color : parent2.color;
  const pattern = Math.random() > 0.5 ? parent1.pattern : parent2.pattern;

  // Small chance of mutation
  if (Math.random() < 0.1) {
    return {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pattern,
    };
  }

  return { color, pattern };
}

export function calculateLevel(experience: number): number {
  // Level = floor(sqrt(experience / 10)) + 1
  return Math.floor(Math.sqrt(experience / 10)) + 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  // XP needed = (level^2) * 10
  return currentLevel * currentLevel * 10;
}

export function getCurrentLevelXP(experience: number): number {
  const level = calculateLevel(experience);
  const prevLevelTotalXP = (level - 1) * (level - 1) * 10;
  return experience - prevLevelTotalXP;
}
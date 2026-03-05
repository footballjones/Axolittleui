import { GameState, Axolotl } from '../types/game';

const STORAGE_KEY = 'axolotl-game-state';

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      
      // Migration: Add secondaryStats if they don't exist
      if (state.axolotl && !state.axolotl.secondaryStats) {
        state.axolotl.secondaryStats = {
          strength: Math.floor(Math.random() * 40) + 30,
          intellect: Math.floor(Math.random() * 40) + 30,
          stamina: Math.floor(Math.random() * 40) + 30,
          speed: Math.floor(Math.random() * 40) + 30,
        };
      }
      
      // Migration: Add opals if they don't exist
      if (state.opals === undefined) {
        state.opals = 10; // Give existing players 10 starter opals
      }
      
      // Migration: Add foodItems if they don't exist
      if (!state.foodItems) {
        state.foodItems = [];
      }
      
      // Migration: Update old life stages to new ones
      if (state.axolotl) {
        const stageMigration: Record<string, string> = { 'egg': 'baby', 'larva': 'baby' };
        if (stageMigration[state.axolotl.stage]) {
          state.axolotl.stage = stageMigration[state.axolotl.stage];
        }
      }

      // Migration: Boost coins for existing players (one-time boost)
      if (state.coins < 5000) {
        state.coins = 10000;
        state.opals = Math.max(state.opals, 100);
      }
      
      return state;
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

export function generateFriendCode(axolotl: Axolotl): string {
  // Generate a shareable friend code
  const code = `${axolotl.name.substring(0, 3).toUpperCase()}-${axolotl.generation}${axolotl.id.substring(4, 8).toUpperCase()}`;
  return code;
}

export function getInitialGameState(): GameState {
  return {
    axolotl: null,
    coins: 10000,
    opals: 100,
    unlockedDecorations: ['plant-1', 'rock-1'],
    customization: {
      background: '#1e40af',
      decorations: [],
    },
    lineage: [],
    friends: [],
    foodItems: [],
  };
}
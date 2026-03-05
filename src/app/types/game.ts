export type LifeStage = 'baby' | 'juvenile' | 'adult' | 'elder';

export interface AxolotlStats {
  hunger: number; // 0-100
  happiness: number; // 0-100
  cleanliness: number; // 0-100
  health: number; // 0-100
}

export interface SecondaryStats {
  strength: number; // 0-100
  intellect: number; // 0-100
  stamina: number; // 0-100
  speed: number; // 0-100
}

export interface Axolotl {
  id: string;
  name: string;
  stage: LifeStage;
  stats: AxolotlStats;
  secondaryStats: SecondaryStats;
  age: number; // in minutes
  experience: number;
  color: string;
  pattern: string;
  generation: number;
  parentIds: string[];
  birthDate: number;
  lastUpdated: number;
}

export interface DecorationItem {
  id: string;
  name: string;
  type: 'plant' | 'rock' | 'ornament' | 'background';
  cost: number;
  emoji: string;
}

export interface AquariumCustomization {
  background: string;
  decorations: string[]; // decoration IDs
}

export interface GameState {
  axolotl: Axolotl | null;
  coins: number;
  opals: number;
  unlockedDecorations: string[];
  customization: AquariumCustomization;
  lineage: Axolotl[]; // previous generations
  friends: Friend[];
  foodItems: FoodItem[];
}

export interface Friend {
  id: string;
  name: string;
  axolotlName: string;
  stage: LifeStage;
  generation: number;
  lastSync: number;
}

export interface BreedingRequest {
  friendId: string;
  accepted: boolean;
}

export interface FoodItem {
  id: string;
  x: number; // position as percentage (0-100)
  y: number; // position as percentage (0-100)
  createdAt: number;
}
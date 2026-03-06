/**
 * Treasure Hunt Cave - Explore cave, collect gems, avoid obstacles
 * Seed-based generation for consistent runs
 * Score = gems collected + distance traveled
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CAVE_WIDTH = 100; // percentage
const PLAYER_SPEED = 2;
const OBSTACLE_SPAWN_RATE = 0.02;
const GEM_SPAWN_RATE = 0.015;
const STAMINA_MAX = 100;
const STAMINA_DECAY = 0.1; // per frame

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rock' | 'creature';
}

interface Gem {
  id: number;
  x: number;
  y: number;
  value: number; // 1, 2, or 3
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export function TreasureHuntCave({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Gems collected
  const [distance, setDistance] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [playerY, setPlayerY] = useState(50); // Percentage from top
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gems, setGems] = useState<Gem[]>([]);
  const [stamina, setStamina] = useState(STAMINA_MAX);
  const [gemsCollected, setGemsCollected] = useState(0);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());
  const obstacleIdRef = useRef<number>(0);
  const gemIdRef = useRef<number>(0);
  const seedRef = useRef<number>(Date.now());
  const rngRef = useRef<SeededRandom>(new SeededRandom(seedRef.current));

  const handleMove = useCallback((direction: 'up' | 'down') => {
    if (!isPlaying || isPaused) return;
    setPlayerY(prev => {
      const moveAmount = direction === 'up' ? -3 : 3;
      const newY = prev + moveAmount;
      return Math.max(10, Math.min(85, newY)); // Clamp to bounds
    });
  }, [isPlaying, isPaused]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 16.67;
    lastFrameTimeRef.current = now;

    // Update distance
    setDistance(prev => prev + PLAYER_SPEED * deltaTime);

    // Update stamina
    setStamina(prev => {
      const newStamina = prev - STAMINA_DECAY * deltaTime;
      if (newStamina <= 0) {
        setIsPlaying(false);
        return 0;
      }
      return newStamina;
    });

    // Move obstacles and gems
    setObstacles(prev => {
      const updated = prev.map(obs => ({
        ...obs,
        x: obs.x - PLAYER_SPEED * deltaTime,
      })).filter(obs => obs.x > -obs.width);

      // Check collisions
      const playerX = 20;
      const playerSize = 8;
      
      for (const obs of updated) {
        if (
          playerX < obs.x + obs.width &&
          playerX + playerSize > obs.x &&
          playerY < obs.y + obs.height &&
          playerY + playerSize > obs.y
        ) {
          setIsPlaying(false);
          break;
        }
      }

      return updated;
    });

    setGems(prev => {
      const updated = prev.map(gem => ({
        ...gem,
        x: gem.x - PLAYER_SPEED * deltaTime,
      })).filter(gem => {
        // Check collection
        const playerX = 20;
        const playerSize = 8;
        
        if (
          playerX < gem.x + 5 &&
          playerX + playerSize > gem.x - 5 &&
          playerY < gem.y + 5 &&
          playerY + playerSize > gem.y - 5
        ) {
          setGemsCollected(prev => prev + gem.value);
          setScore(prev => prev + gem.value);
          return false; // Remove gem
        }
        
        return gem.x > -10; // Keep if on screen
      });

      return updated;
    });

    // Spawn obstacles
    if (rngRef.current.next() < OBSTACLE_SPAWN_RATE) {
      const obstacleY = 20 + rngRef.current.next() * 60;
      const obstacleHeight = 10 + rngRef.current.next() * 20;
      const obstacleType = rngRef.current.next() < 0.5 ? 'rock' : 'creature';
      
      setObstacles(prev => [...prev, {
        id: obstacleIdRef.current++,
        x: 100,
        y: obstacleY,
        width: 8,
        height: obstacleHeight,
        type: obstacleType,
      }]);
    }

    // Spawn gems
    if (rngRef.current.next() < GEM_SPAWN_RATE) {
      const gemY = 15 + rngRef.current.next() * 70;
      const gemValue = rngRef.current.next() < 0.6 ? 1 : rngRef.current.next() < 0.8 ? 2 : 3;
      
      setGems(prev => [...prev, {
        id: gemIdRef.current++,
        x: 100,
        y: gemY,
        value: gemValue,
      }]);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, playerY]);

  // Start game loop
  useEffect(() => {
    if (isPlaying && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isPaused, gameLoop]);

  // Handle keyboard/touch controls
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        handleMove('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        handleMove('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, handleMove]);

  // End game
  useEffect(() => {
    if (!isPlaying) {
      const totalScore = gemsCollected + Math.floor(distance / 10); // Gems + distance bonus
      const rewards = calculateRewards('treasure-hunt', totalScore);
      onEnd({
        score: totalScore,
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, gemsCollected, distance, onEnd]);

  return (
    <GameWrapper
      gameName="Treasure Hunt Cave"
      score={gemsCollected}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900">
        {/* Cave walls */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-amber-950 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-amber-950 to-transparent" />
        </div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <motion.div
            key={obs.id}
            className={`absolute rounded-lg ${
              obs.type === 'rock' ? 'bg-gray-700' : 'bg-red-600'
            } border-2 border-gray-900`}
            style={{
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              width: `${obs.width}%`,
              height: `${obs.height}%`,
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {obs.type === 'creature' && (
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                👹
              </div>
            )}
          </motion.div>
        ))}

        {/* Gems */}
        {gems.map(gem => (
          <motion.div
            key={gem.id}
            className="absolute text-3xl"
            style={{
              left: `${gem.x}%`,
              top: `${gem.y}%`,
            }}
            animate={{
              y: [0, -5, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {gem.value === 3 ? '💎' : gem.value === 2 ? '💍' : '💠'}
          </motion.div>
        ))}

        {/* Player */}
        <motion.div
          className="absolute text-5xl"
          style={{
            left: '20%',
            top: `${playerY}%`,
            transform: 'translateY(-50%)',
          }}
          animate={{
            x: [0, 2, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          🦎
        </motion.div>

        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex gap-4">
          {/* Stamina bar */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
            <div className="text-white text-xs font-bold mb-1">Stamina</div>
            <div className="w-32 h-2 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-yellow-400"
                initial={{ width: '100%' }}
                animate={{ width: `${(stamina / STAMINA_MAX) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Gems counter */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
            <div className="text-white text-xs font-bold">💎 {gemsCollected}</div>
            <div className="text-white text-xs">Distance: {Math.floor(distance)}</div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
          <p className="text-white text-xs font-bold text-center">
            ↑ ↓ or tap top/bottom to move
          </p>
        </div>

        {/* Touch controls */}
        <div className="absolute inset-0 flex">
          <div
            className="flex-1"
            onTouchStart={() => handleMove('up')}
            onMouseDown={() => handleMove('up')}
          />
          <div
            className="flex-1"
            onTouchStart={() => handleMove('down')}
            onMouseDown={() => handleMove('down')}
          />
        </div>
      </div>
    </GameWrapper>
  );
}

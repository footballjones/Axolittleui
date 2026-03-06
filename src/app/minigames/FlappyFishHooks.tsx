/**
 * Flappy Fish Hooks - Flappy Bird style
 * Tap to swim upward, release to sink. Avoid hooks and obstacles.
 * Score = number of hooks successfully passed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const GRAVITY = 0.4;
const SWIM_FORCE = -10;
const HOOK_SPEED = 4;
const HOOK_SPAWN_INTERVAL = 2000;
const INITIAL_HOOK_DELAY = 2500;
const MIN_GAP = 25; // Minimum gap between hooks (percentage)
const MAX_GAP = 40; // Maximum gap between hooks

interface Hook {
  id: number;
  x: number;
  gapY: number; // Center of gap
  gapHeight: number; // Height of gap
}

export function FlappyFishHooks({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Hooks passed
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [axolotlY, setAxolotlY] = useState(50); // Percentage from top
  const [axolotlVelocity, setAxolotlVelocity] = useState(0);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [passedHooks, setPassedHooks] = useState<Set<number>>(new Set());
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());
  const hookSpawnTimerRef = useRef<number>();
  const nextHookSpawnRef = useRef<number>(Date.now() + INITIAL_HOOK_DELAY);
  const hookIdRef = useRef<number>(0);

  const handleSwim = useCallback(() => {
    if (!isPlaying || isPaused) return;
    setAxolotlVelocity(SWIM_FORCE);
  }, [isPlaying, isPaused]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 16.67;
    lastFrameTimeRef.current = now;

    // Update axolotl position
    setAxolotlVelocity(prev => prev + GRAVITY * deltaTime);
    setAxolotlY(prev => {
      const newY = prev + axolotlVelocity * deltaTime;
      // Boundary check
      if (newY < 5) {
        // Hit top
        setIsPlaying(false);
        return 5;
      }
      if (newY > 90) {
        // Hit bottom
        setIsPlaying(false);
        return 90;
      }
      return newY;
    });

    // Update hooks
    setHooks(prev => {
      const updated = prev.map(hook => ({
        ...hook,
        x: hook.x - HOOK_SPEED * deltaTime,
      })).filter(hook => hook.x > -10); // Remove off-screen

      // Check for passed hooks (score)
      updated.forEach(hook => {
        if (!passedHooks.has(hook.id) && hook.x < 15) {
          setPassedHooks(prev => new Set([...prev, hook.id]));
          setScore(prev => prev + 1);
        }
      });

      // Check collisions
      const axolotlX = 20;
      const axolotlSize = 6;
      
      for (const hook of updated) {
        const hookTop = hook.gapY - hook.gapHeight / 2;
        const hookBottom = hook.gapY + hook.gapHeight / 2;
        
        // Check if axolotl is in the gap
        const inGap = axolotlY > hookTop && axolotlY + axolotlSize < hookBottom;
        
        if (!inGap && axolotlX < hook.x + 5 && axolotlX + axolotlSize > hook.x - 5) {
          setIsPlaying(false);
          break;
        }
      }

      return updated;
    });

    // Spawn new hooks
    if (now >= nextHookSpawnRef.current) {
      // Gap gets narrower as score increases (difficulty scaling)
      const baseGap = MAX_GAP;
      const difficultyFactor = Math.max(0.6, 1 - (score / 50)); // Gap narrows over time
      const gapHeight = Math.max(MIN_GAP, baseGap * difficultyFactor);
      const gapY = 30 + Math.random() * 40; // Random vertical position
      
      setHooks(prev => [...prev, {
        id: hookIdRef.current++,
        x: 100,
        gapY,
        gapHeight,
      }]);
      
      // Next spawn - interval decreases as score increases
      const baseInterval = HOOK_SPAWN_INTERVAL;
      const speedFactor = Math.max(0.6, 1 - (score / 100));
      nextHookSpawnRef.current = now + (baseInterval * speedFactor);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, axolotlVelocity, axolotlY, passedHooks, score]);

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

  // End game when stopped
  useEffect(() => {
    if (!isPlaying) {
      const rewards = calculateRewards('fish-hooks', score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, score, onEnd]);

  return (
    <GameWrapper
      gameName="Flappy Fish Hooks"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      {/* Game area */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Underwater background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-cyan-500 to-blue-600" />
        
        {/* Water bubbles */}
        <div className="absolute inset-0 opacity-40">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-white rounded-full"
              style={{
                left: `${10 + i * 20}%`,
                bottom: '0%',
              }}
              animate={{
                y: [0, -1000],
                opacity: [0.6, 0],
                scale: [1, 1.5],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'linear',
              }}
            />
          ))}
        </div>

        {/* Hooks */}
        {hooks.map(hook => {
          const hookTop = hook.gapY - hook.gapHeight / 2;
          const hookBottom = hook.gapY + hook.gapHeight / 2;
          
          return (
            <div key={hook.id} className="absolute" style={{ left: `${hook.x}%`, top: 0, bottom: 0 }}>
              {/* Top hook */}
              <motion.div
                className="absolute bg-gray-700 rounded-t-lg"
                style={{
                  left: 0,
                  top: 0,
                  width: '40px',
                  height: `${hookTop}%`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-full border-2 border-gray-900" />
              </motion.div>
              
              {/* Bottom hook */}
              <motion.div
                className="absolute bg-gray-700 rounded-b-lg"
                style={{
                  left: 0,
                  bottom: 0,
                  width: '40px',
                  height: `${100 - hookBottom}%`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-full border-2 border-gray-900" />
              </motion.div>
            </div>
          );
        })}

        {/* Axolotl */}
        <motion.div
          className="absolute text-5xl"
          style={{
            left: '20%',
            top: `${axolotlY}%`,
            transform: 'translateY(-50%)',
          }}
          animate={{
            rotate: axolotlVelocity > 0 ? [0, -15, 0] : [0, 15, 0],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
        >
          🦎
        </motion.div>

        {/* Tap instruction overlay (first 2 seconds) */}
        {score === 0 && hooks.length === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 1.5 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-cyan-400">
              <p className="text-cyan-800 font-bold text-lg text-center">
                Tap to swim up! 🪝
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tap area */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleSwim}
        onTouchStart={handleSwim}
        style={{ touchAction: 'manipulation' }}
      />
    </GameWrapper>
  );
}

/**
 * Keepey Upey - Keep the axolotl afloat
 * Tap to bounce/lift. Gravity pulls down. Obstacles move across.
 * Score = survival time in seconds
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const OBSTACLE_SPEED = 3;
const OBSTACLE_SPAWN_INTERVAL = 2000; // ms
const INITIAL_OBSTACLE_DELAY = 3000; // First obstacle after 3 seconds

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function KeepeyUpey({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Time survived in seconds
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [axolotlY, setAxolotlY] = useState(50); // Percentage from top
  const [axolotlVelocity, setAxolotlVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());
  const obstacleSpawnTimerRef = useRef<number>();
  const nextObstacleSpawnRef = useRef<number>(Date.now() + INITIAL_OBSTACLE_DELAY);
  const obstacleIdRef = useRef<number>(0);

  const handleJump = useCallback(() => {
    if (!isPlaying || isPaused) return;
    setAxolotlVelocity(JUMP_FORCE);
  }, [isPlaying, isPaused]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 16.67; // Normalize to ~60fps
    lastFrameTimeRef.current = now;

    // Update score (time survived)
    const elapsed = (now - gameStartTime) / 1000;
    setScore(Math.floor(elapsed));

    // Update axolotl position
    setAxolotlVelocity(prev => prev + GRAVITY * deltaTime);
    setAxolotlY(prev => {
      const newY = prev + axolotlVelocity * deltaTime;
      // Boundary check
      if (newY < 10) {
        // Hit ceiling
        setIsPlaying(false);
        return 10;
      }
      if (newY > 85) {
        // Hit floor
        setIsPlaying(false);
        return 85;
      }
      return newY;
    });

    // Update obstacles
    setObstacles(prev => {
      const updated = prev.map(obs => ({
        ...obs,
        x: obs.x - OBSTACLE_SPEED * deltaTime,
      })).filter(obs => obs.x > -obs.width); // Remove off-screen

      // Check collisions
      const axolotlX = 20; // Fixed horizontal position
      const axolotlSize = 8; // Percentage
      
      for (const obs of updated) {
        if (
          axolotlX < obs.x + obs.width &&
          axolotlX + axolotlSize > obs.x &&
          axolotlY < obs.y + obs.height &&
          axolotlY + axolotlSize > obs.y
        ) {
          setIsPlaying(false);
          break;
        }
      }

      return updated;
    });

    // Spawn new obstacles
    if (now >= nextObstacleSpawnRef.current) {
      const obstacleHeight = 15 + Math.random() * 20; // 15-35% height
      const obstacleY = 20 + Math.random() * 50; // Random vertical position
      
      setObstacles(prev => [...prev, {
        id: obstacleIdRef.current++,
        x: 100, // Start from right edge
        y: obstacleY,
        width: 8,
        height: obstacleHeight,
      }]);
      
      // Next spawn - interval decreases slightly as score increases (difficulty scaling)
      const baseInterval = OBSTACLE_SPAWN_INTERVAL;
      const difficultyFactor = Math.max(0.5, 1 - (score / 200)); // Faster spawning over time
      nextObstacleSpawnRef.current = now + (baseInterval * difficultyFactor);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, axolotlVelocity, axolotlY, gameStartTime, score]);

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
      const rewards = calculateRewards('keepey-upey', score);
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
      gameName="Keepey Upey"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      {/* Game area */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-300 to-cyan-400" />
        
        {/* Clouds */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-16 bg-white rounded-full"
              style={{
                left: `${20 + i * 30}%`,
                top: `${15 + i * 10}%`,
              }}
              animate={{
                x: [0, 50, 0],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <motion.div
            key={obs.id}
            className="absolute bg-red-500 rounded-lg border-2 border-red-700 shadow-lg"
            style={{
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              width: `${obs.width}%`,
              height: `${obs.height}%`,
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          />
        ))}

        {/* Axolotl */}
        <motion.div
          className="absolute text-6xl"
          style={{
            left: '20%',
            top: `${axolotlY}%`,
            transform: 'translateY(-50%)',
          }}
          animate={{
            rotate: axolotlVelocity > 0 ? [0, 10, -10, 0] : [0, -10, 10, 0],
          }}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          🦎
        </motion.div>

        {/* Tap instruction overlay (first 3 seconds) */}
        {score < 3 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 2 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-purple-400">
              <p className="text-purple-800 font-bold text-lg text-center">
                Tap to bounce! 🎈
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tap area */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleJump}
        onTouchStart={handleJump}
        style={{ touchAction: 'manipulation' }}
      />
    </GameWrapper>
  );
}

/**
 * Axolotl Stacker - Stack items high!
 * Items swing on pendulum/conveyor. Tap to drop. Stack as high as possible.
 * Score = stack height reached
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const INITIAL_SWING_SPEED = 2; // degrees per frame
const MAX_SWING_ANGLE = 60; // degrees
const BLOCK_WIDTH = 12; // percentage
const BLOCK_HEIGHT = 4; // percentage
const STACK_START_Y = 85; // Start stacking from bottom

interface Block {
  id: number;
  x: number; // Center position
  width: number;
  color: string;
}

interface SwingingBlock {
  angle: number;
  direction: number; // 1 or -1
  speed: number;
}

const COLORS = [
  'bg-blue-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-indigo-400',
  'bg-cyan-400',
  'bg-violet-400',
];

export function AxolotlStacker({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Stack height (number of blocks)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [stack, setStack] = useState<Block[]>([]);
  const [swingingBlock, setSwingingBlock] = useState<SwingingBlock>({
    angle: 0,
    direction: 1,
    speed: INITIAL_SWING_SPEED,
  });
  const [nextBlockWidth, setNextBlockWidth] = useState(BLOCK_WIDTH);
  const animationFrameRef = useRef<number>();
  const blockIdRef = useRef<number>(0);

  const dropBlock = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const currentX = 50 + (swingingBlock.angle / MAX_SWING_ANGLE) * 30; // Convert angle to x position
    
    if (stack.length === 0) {
      // First block - always lands
      setStack([{
        id: blockIdRef.current++,
        x: currentX,
        width: nextBlockWidth,
        color: COLORS[score % COLORS.length],
      }]);
      setScore(1);
    } else {
      const topBlock = stack[stack.length - 1];
      const overlap = Math.abs(currentX - topBlock.x);
      const maxOverlap = (topBlock.width + nextBlockWidth) / 2;
      
      if (overlap > maxOverlap) {
        // Missed - game over
        setIsPlaying(false);
        return;
      }
      
      // Calculate new block position (centered on overlap)
      const newX = (currentX + topBlock.x) / 2;
      const newWidth = Math.min(nextBlockWidth, topBlock.width - Math.abs(currentX - topBlock.x) * 0.8);
      
      setStack(prev => [...prev, {
        id: blockIdRef.current++,
        x: newX,
        width: Math.max(BLOCK_WIDTH * 0.5, newWidth), // Minimum width
        color: COLORS[score % COLORS.length],
      }]);
      
      setScore(prev => prev + 1);
    }
    
    // Reset swinging block with increased speed
    const newSpeed = INITIAL_SWING_SPEED + (score * 0.1);
    setSwingingBlock({
      angle: 0,
      direction: 1,
      speed: Math.min(newSpeed, 6), // Cap speed
    });
    
    // Next block gets slightly smaller (difficulty scaling)
    setNextBlockWidth(Math.max(BLOCK_WIDTH * 0.6, nextBlockWidth * 0.95));
  }, [isPlaying, isPaused, swingingBlock, stack, score, nextBlockWidth]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    setSwingingBlock(prev => {
      let newAngle = prev.angle + (prev.speed * prev.direction);
      
      if (newAngle >= MAX_SWING_ANGLE) {
        newAngle = MAX_SWING_ANGLE;
        return { ...prev, angle: newAngle, direction: -1 };
      } else if (newAngle <= -MAX_SWING_ANGLE) {
        newAngle = -MAX_SWING_ANGLE;
        return { ...prev, angle: newAngle, direction: 1 };
      }
      
      return { ...prev, angle: newAngle };
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused]);

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

  // End game
  useEffect(() => {
    if (!isPlaying) {
      const rewards = calculateRewards('axolotl-stacker', score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, score, onEnd]);

  const swingingX = 50 + (swingingBlock.angle / MAX_SWING_ANGLE) * 30;

  return (
    <GameWrapper
      gameName="Axolotl Stacker"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-blue-200 via-indigo-200 to-purple-200">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-full bg-white"
              style={{ left: `${i * 10}%` }}
            />
          ))}
        </div>

        {/* Stacked blocks */}
        {stack.map((block, index) => {
          const y = STACK_START_Y - (index * BLOCK_HEIGHT);
          return (
            <motion.div
              key={block.id}
              className={`absolute ${block.color} rounded-lg border-2 border-white/50 shadow-lg`}
              style={{
                left: `${block.x - block.width / 2}%`,
                top: `${y}%`,
                width: `${block.width}%`,
                height: `${BLOCK_HEIGHT}%`,
              }}
              initial={{ scale: 0.8, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            />
          );
        })}

        {/* Swinging block */}
        <motion.div
          className="absolute"
          style={{
            left: `${swingingX - nextBlockWidth / 2}%`,
            top: '15%',
            width: `${nextBlockWidth}%`,
            height: `${BLOCK_HEIGHT}%`,
          }}
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className={`${COLORS[score % COLORS.length]} rounded-lg border-2 border-white/50 shadow-xl relative`} style={{ width: '100%', height: '100%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">⬇️</span>
            </div>
          </div>
        </motion.div>

        {/* Pendulum line */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <line
            x1="50%"
            y1="5%"
            x2={`${swingingX}%`}
            y2="17%"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
        </svg>

        {/* Instructions */}
        {score === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 2 }}
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-indigo-400">
              <p className="text-indigo-800 font-bold text-lg text-center">
                Tap when block aligns! 🥞
              </p>
            </div>
          </motion.div>
        )}

        {/* Tap area */}
        <div
          className="absolute inset-0 z-10"
          onClick={dropBlock}
          onTouchStart={dropBlock}
          style={{ touchAction: 'manipulation' }}
        />
      </div>
    </GameWrapper>
  );
}

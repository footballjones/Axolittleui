/**
 * Flappy Fish Hooks - Flappy Bird style
 * Optimized for mobile performance
 * Tap to swim upward, avoid hooks.
 * Score = number of hooks successfully passed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const GRAVITY = 0.35;
const JUMP_FORCE = -6.5;
const HOOK_SPEED = 2.5;
const HOOK_GAP = 200;
const HOOK_WIDTH = 50;
const HOOK_INTERVAL = 2500;

interface Hook {
  x: number;
  gapY: number;
  gap: number;
  width: number;
  scored: boolean;
}

export function FlappyFishHooks({ onEnd, energy }: MiniGameProps) {
  // Only update score state periodically to avoid re-renders during gameplay
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const scoreRef = useRef(0); // Use ref to track score without triggering re-renders
  const lastScoreUpdateRef = useRef(0);
  const gameStateRef = useRef<{
    bird: { x: number; y: number; vy: number; size: number };
    hooks: Hook[];
    lastHookTime: number;
  }>({
    bird: { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 },
    hooks: [],
    lastHookTime: 0,
  });

  const reset = useCallback(() => {
    gameStateRef.current = {
      bird: { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 },
      hooks: [],
      lastHookTime: 0,
    };
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const spawnHook = useCallback(() => {
    const lastHook = gameStateRef.current.hooks[gameStateRef.current.hooks.length - 1];
    let gapY = 80 + Math.random() * (CANVAS_H - 200);
    
    if (lastHook) {
      const minDistance = HOOK_GAP + 100;
      if (Math.abs(gapY - lastHook.gapY) < minDistance) {
        if (gapY < lastHook.gapY) {
          gapY = Math.max(80, lastHook.gapY - minDistance);
        } else {
          gapY = Math.min(CANVAS_H - 120, lastHook.gapY + minDistance);
        }
      }
    }
    
    gameStateRef.current.hooks.push({
      x: CANVAS_W,
      gapY,
      gap: HOOK_GAP,
      width: HOOK_WIDTH,
      scored: false,
    });
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying || isPaused) return;
    gameStateRef.current.bird.vy = JUMP_FORCE;
  }, [isPlaying, isPaused]);

  // Optimized draw function - removed expensive water ripples and simplified hooks
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { bird, hooks } = gameStateRef.current;
    
    // Simple solid background - no animated effects
    ctx.fillStyle = '#1a3a4a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Simplified hooks - use rectangles with simple triangles instead of curves
    for (const h of hooks) {
      const hookTop = h.gapY - h.gap / 2;
      const hookBottom = h.gapY + h.gap / 2;
      
      // Top hook - simple rectangle with triangle point
      ctx.fillStyle = '#666';
      ctx.fillRect(h.x, 0, h.width, hookTop);
      
      // Simple triangle for hook point (much faster than curves)
      ctx.beginPath();
      ctx.moveTo(h.x + h.width, hookTop);
      ctx.lineTo(h.x + h.width + 12, hookTop - 8);
      ctx.lineTo(h.x + h.width + 8, hookTop - 15);
      ctx.closePath();
      ctx.fill();

      // Bottom hook - simple rectangle with triangle point
      ctx.fillRect(h.x, hookBottom, h.width, CANVAS_H - hookBottom);
      
      // Simple triangle for hook point
      ctx.beginPath();
      ctx.moveTo(h.x + h.width, hookBottom);
      ctx.lineTo(h.x + h.width + 12, hookBottom + 8);
      ctx.lineTo(h.x + h.width + 8, hookBottom + 15);
      ctx.closePath();
      ctx.fill();
    }

    // Axolotl - simplified drawing
    const bx = bird.x, by = bird.y, bs = bird.size;
    ctx.fillStyle = '#E8A0BF';
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(bx + 6, by - 5, 3, 0, Math.PI * 2);
    ctx.arc(bx + 6, by + 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Simplified gills - fewer strokes
    ctx.strokeStyle = '#D48BA8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - bs + 2, by - 12);
    ctx.lineTo(bx - bs - 8, by - 10);
    ctx.moveTo(bx - bs + 2, by + 12);
    ctx.lineTo(bx - bs - 8, by + 10);
    ctx.stroke();

    // Smile
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx + 10, by, 5, -0.3, Math.PI * 0.3);
    ctx.stroke();
  }, []);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    // Sync score from ref to state
    const finalScore = scoreRef.current;
    setScore(finalScore);
    
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('fish-hooks', finalScore);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [hadEnergyAtStart]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;
    
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const now = performance.now();
    const { bird, hooks } = gameStateRef.current;

    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Spawn hooks
    if (now - gameStateRef.current.lastHookTime > HOOK_INTERVAL) {
      const lastHook = hooks[hooks.length - 1];
      if (!lastHook || lastHook.x < CANVAS_W - 200) {
        spawnHook();
        gameStateRef.current.lastHookTime = now;
      }
    }

    // Move hooks and check collisions
    let shouldEnd = false;
    for (let i = hooks.length - 1; i >= 0; i--) {
      const h = hooks[i];
      h.x -= HOOK_SPEED;

      // Score - update ref instead of state
      if (!h.scored && h.x + h.width < bird.x) {
        h.scored = true;
        scoreRef.current += 1;
        // Only update state every 5 score points or every 500ms to reduce re-renders
        const timeSinceLastUpdate = now - lastScoreUpdateRef.current;
        if (scoreRef.current % 5 === 0 || timeSinceLastUpdate > 500) {
          setScore(scoreRef.current);
          lastScoreUpdateRef.current = now;
        }
      }

      // Collision detection - optimized
      if (h.x < bird.x + bird.size + 20 && h.x + h.width > bird.x - bird.size - 20) {
        if (bird.x + bird.size > h.x && bird.x - bird.size < h.x + h.width) {
          if (bird.y - bird.size < h.gapY - h.gap / 2 ||
              bird.y + bird.size > h.gapY + h.gap / 2) {
            shouldEnd = true;
            break;
          }
        }
      }
    }

    if (shouldEnd) {
      endGame();
      return;
    }

    // Remove off-screen hooks
    gameStateRef.current.hooks = hooks.filter(h => h.x + h.width > -10);

    // Boundary collision
    if (bird.y + bird.size > CANVAS_H || bird.y - bird.size < 0) {
      endGame();
      return;
    }

    // Draw
    draw(ctx);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, spawnHook, endGame, draw]);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
    gameStateRef.current.lastHookTime = performance.now();
    lastScoreUpdateRef.current = performance.now();
  }, [reset, energy]);

  // Optimized touch/click handler - prevent default and use passive listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleInteraction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      jump();
    };

    // Use passive: false to allow preventDefault
    canvas.addEventListener('touchstart', handleInteraction, { passive: false });
    canvas.addEventListener('click', handleInteraction);

    return () => {
      canvas.removeEventListener('touchstart', handleInteraction);
      canvas.removeEventListener('click', handleInteraction);
    };
  }, [jump]);

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

  return (
    <GameWrapper
      gameName="Fish Hooks"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100" style={{ margin: 0, padding: 0 }}>
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-purple-900/80 to-indigo-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🪝
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Fish Hooks
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap or click to swim up
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Avoid the hooks!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Pass as many as you can
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {score >= 20 ? '✨' : score >= 10 ? '🎉' : '🎮'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        Score: {score} hooks passed
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {score >= 20 ? '🌟 Exceptional performance!' : score >= 10 ? '🎯 Good job!' : '💪 Keep practicing!'}
                      </p>
                      
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-purple-800">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">⭐</span>
                              <span className="font-semibold">+{finalRewards.xp} XP</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">💰</span>
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🪬</span>
                                <span className="font-semibold">+{finalRewards.opals} Opals</span>
                              </div>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-purple-600 text-center text-sm">
                            Played for fun but no rewards earned.<br />
                            Energy regenerates over time.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => {
                          setGameEnded(false);
                          setFinalRewards(null);
                          startGame();
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="relative z-10">Play Again</span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            onEnd({
                              score,
                              tier: 'normal',
                              xp: 0,
                              coins: 0,
                            });
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        Back to Games
                      </motion.button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Canvas - optimized for mobile */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ 
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            imageRendering: 'pixelated', // Better performance on mobile
          }}
        />

        {/* Tap instruction overlay */}
        {isPlaying && score === 0 && gameStateRef.current.hooks.length === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
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
    </GameWrapper>
  );
}
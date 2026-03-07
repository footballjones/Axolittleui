/**
 * Flappy Fish Hooks - Flappy Bird style
 * Tap to swim upward, avoid hooks.
 * Score = number of hooks successfully passed
 * Features: Canvas rendering, water ripple effects, hook curves
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
const HOOK_GAP = 160;
const HOOK_WIDTH = 50;
const HOOK_INTERVAL = 1800; // ms between hooks

interface Hook {
  x: number;
  gapY: number; // Center of gap
  gap: number; // Gap height
  width: number;
  scored: boolean;
}

export function FlappyFishHooks({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Hooks passed
  const [isPlaying, setIsPlaying] = useState(false); // Start with false, show overlay first
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false); // Track if energy was available when game started
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
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
    setScore(0);
  }, []);

  const spawnHook = useCallback(() => {
    const gapY = 80 + Math.random() * (CANVAS_H - 200);
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

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { bird, hooks } = gameStateRef.current;
    
    // Water background
    ctx.fillStyle = '#1a3a4a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Water ripple lines
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
    for (let y = 0; y < CANVAS_H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(performance.now() / 1000 + y) * 3);
      ctx.lineTo(CANVAS_W, y + Math.sin(performance.now() / 1000 + y + 2) * 3);
      ctx.stroke();
    }

    // Hooks
    for (const h of hooks) {
      // Top hook (line from top)
      ctx.fillStyle = '#888';
      ctx.fillRect(h.x, 0, h.width, h.gapY - h.gap / 2);
      // Hook curve at bottom of top section
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(h.x + h.width / 2, h.gapY - h.gap / 2, h.width / 2 + 5, 0, Math.PI);
      ctx.fill();

      // Bottom hook (line from bottom)
      ctx.fillStyle = '#888';
      ctx.fillRect(h.x, h.gapY + h.gap / 2, h.width, CANVAS_H - (h.gapY + h.gap / 2));
      // Hook curve at top of bottom section
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(h.x + h.width / 2, h.gapY + h.gap / 2, h.width / 2 + 5, Math.PI, 0);
      ctx.fill();
    }

    // Axolotl (simple circle with gills)
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

    // Gills
    ctx.strokeStyle = '#D48BA8';
    ctx.lineWidth = 2;
    for (const dy of [-12, -8, 8, 12]) {
      ctx.beginPath();
      ctx.moveTo(bx - bs + 2, by + dy);
      ctx.lineTo(bx - bs - 10, by + dy + (dy > 0 ? 4 : -4));
      ctx.stroke();
    }

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
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('fish-hooks', score);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      // No rewards if no energy
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [score, hadEnergyAtStart]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const { bird, hooks } = gameStateRef.current;

    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Spawn hooks
    if (now - gameStateRef.current.lastHookTime > HOOK_INTERVAL) {
      spawnHook();
      gameStateRef.current.lastHookTime = now;
    }

    // Move hooks
    for (const h of hooks) {
      h.x -= HOOK_SPEED;

      // Score
      if (!h.scored && h.x + h.width < bird.x) {
        h.scored = true;
        setScore(prev => prev + 1);
      }

      // Collision
      if (
        bird.x + bird.size > h.x &&
        bird.x - bird.size < h.x + h.width
      ) {
        if (bird.y - bird.size < h.gapY - h.gap / 2 ||
            bird.y + bird.size > h.gapY + h.gap / 2) {
          endGame();
          return;
        }
      }
    }

    // Remove off-screen hooks
    gameStateRef.current.hooks = hooks.filter(h => h.x + h.width > -10);

    // Boundary collision
    if (bird.y + bird.size > CANVAS_H || bird.y - bird.size < 0) {
      endGame();
      return;
    }

    // Draw everything
    draw(ctx);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, spawnHook, endGame, draw]);

  const startGame = useCallback(() => {
    // Store whether energy was available when game started
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
    gameStateRef.current.lastHookTime = performance.now();
    // Initial draw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }
  }, [reset, draw, energy]);

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
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100">
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
              {/* Decorative background elements */}
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
                      
                      {/* Rewards display - only show if energy was used */}
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
                          // Call onEnd with actual rewards when leaving (only if energy was used)
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
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

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="max-w-full max-h-full w-full h-full object-contain"
          style={{ touchAction: 'none' }}
          onClick={jump}
          onTouchStart={(e) => {
            e.preventDefault();
            jump();
          }}
        />

        {/* Tap instruction overlay (first 2 seconds) */}
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

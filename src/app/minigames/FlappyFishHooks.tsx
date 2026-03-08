/**
 * Flappy Fish Hooks - Flappy Bird style
 * Ultra-optimized for consistent 60fps on mobile
 * Zero React state updates during gameplay
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
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
  const [score, setScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    ctx: CanvasRenderingContext2D | null;
    animationId: number | null;
    isPlaying: boolean;
    isPaused: boolean;
    score: number;
    hadEnergy: boolean;
    bird: { x: number; y: number; vy: number; size: number };
    hooks: Hook[];
    lastHookTime: number;
    scoreUpdateCounter: number; // Track frames since last score update
    onGameEnd: (() => void) | null;
  }>({
    ctx: null,
    animationId: null,
    isPlaying: false,
    isPaused: false,
    score: 0,
    hadEnergy: false,
    bird: { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 },
    hooks: [],
    lastHookTime: 0,
    scoreUpdateCounter: 0,
    onGameEnd: null,
  });

  // Ultra-optimized game loop - no React, no state updates
  const gameLoop = () => {
    const game = gameRef.current;
    if (!game.isPlaying || game.isPaused || !game.ctx || game.animationId === null) {
      if (game.animationId !== null) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
      return;
    }

    const ctx = game.ctx;
    const bird = game.bird;
    const hooks = game.hooks;
    const now = performance.now();

    // Clear - use fillRect for better performance than clearRect
    ctx.fillStyle = '#1a3a4a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Spawn hooks
    if (now - game.lastHookTime > HOOK_INTERVAL) {
      const lastHook = hooks[hooks.length - 1];
      if (!lastHook || lastHook.x < CANVAS_W - 200) {
        let gapY = 80 + Math.random() * (CANVAS_H - 200);
        if (lastHook) {
          const minDist = HOOK_GAP + 100;
          if (Math.abs(gapY - lastHook.gapY) < minDist) {
            gapY = gapY < lastHook.gapY 
              ? Math.max(80, lastHook.gapY - minDist)
              : Math.min(CANVAS_H - 120, lastHook.gapY + minDist);
          }
        }
        hooks.push({ x: CANVAS_W, gapY, gap: HOOK_GAP, width: HOOK_WIDTH, scored: false });
        game.lastHookTime = now;
      }
    }

    // Process hooks - single pass, optimized
    let shouldEnd = false;
    const bx = bird.x;
    const by = bird.y;
    const bs = bird.size;
    const bLeft = bx - bs;
    const bRight = bx + bs;
    const bTop = by - bs;
    const bBottom = by + bs;

    // Limit hooks to prevent memory issues
    if (hooks.length > 15) {
      hooks.splice(0, hooks.length - 15);
    }
    
    // Batch draw hooks - set fillStyle once
    ctx.fillStyle = '#666';
    
    for (let i = hooks.length - 1; i >= 0; i--) {
      const h = hooks[i];
      h.x -= HOOK_SPEED;

      // Remove off-screen early
      if (h.x + h.width < -10) {
        hooks.splice(i, 1);
        continue;
      }

      // Only process visible hooks
      if (h.x < CANVAS_W && h.x + h.width > 0) {
        const top = h.gapY - h.gap / 2;
        const bottom = h.gapY + h.gap / 2;
        
        // Draw both rectangles in one go
        ctx.fillRect(h.x, 0, h.width, top);
        ctx.fillRect(h.x, bottom, h.width, CANVAS_H - bottom);

        // Score check
        if (!h.scored && h.x + h.width < bx) {
          h.scored = true;
          game.score += 1;
          game.scoreUpdateCounter += 1;
          // Only update React state every 20 frames OR every 5 points (much less frequent)
          if (game.scoreUpdateCounter >= 20 || game.score % 5 === 0) {
            setScore(game.score);
            game.scoreUpdateCounter = 0;
          }
        }

        // Collision - only check nearby hooks
        if (!shouldEnd && h.x < bRight + 40 && h.x + h.width > bLeft - 40) {
          if (bRight > h.x && bLeft < h.x + h.width) {
            if (bTop < top || bBottom > bottom) {
              shouldEnd = true;
            }
          }
        }
      }
    }

    if (shouldEnd || bBottom > CANVAS_H || bTop < 0) {
      if (game.animationId !== null) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
      if (game.onGameEnd) game.onGameEnd();
      return;
    }

    // Draw bird - minimize path operations
    ctx.fillStyle = '#E8A0BF';
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - single path
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(bx + 6, by - 5, 3, 0, Math.PI * 2);
    ctx.arc(bx + 6, by + 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Gills and smile - single path
    ctx.strokeStyle = '#D48BA8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - bs + 2, by - 12);
    ctx.lineTo(bx - bs - 8, by - 10);
    ctx.moveTo(bx - bs + 2, by + 12);
    ctx.lineTo(bx - bs - 8, by + 10);
    ctx.stroke();

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx + 10, by, 5, -0.3, Math.PI * 0.3);
    ctx.stroke();

    // Schedule next frame
    if (game.isPlaying && !game.isPaused && game.animationId !== null) {
      game.animationId = requestAnimationFrame(gameLoop);
    } else {
      game.animationId = null;
    }
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { 
      alpha: false, 
      desynchronized: true,
      willReadFrequently: false
    });
    if (!ctx) return;

    gameRef.current.ctx = ctx;

    // Handle game end
    gameRef.current.onGameEnd = () => {
      const game = gameRef.current;
      game.isPlaying = false;
      if (game.animationId !== null) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
      
      const finalScore = game.score;
      setScore(finalScore);
      
      const rewards = game.hadEnergy 
        ? calculateRewards('fish-hooks', finalScore)
        : { tier: 'normal', xp: 0, coins: 0, opals: undefined };
      
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
      setGameEnded(true);
      setShowOverlay(true);
    };

    // Touch/click handler
    const handleTap = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (gameRef.current.isPlaying && !gameRef.current.isPaused) {
        gameRef.current.bird.vy = JUMP_FORCE;
      }
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    return () => {
      canvas.removeEventListener('touchstart', handleTap);
      canvas.removeEventListener('click', handleTap);
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
    };
  }, []);

  // Start/stop game loop
  useEffect(() => {
    const game = gameRef.current;
    if (game.isPlaying && !game.isPaused && game.ctx && !showOverlay) {
      if (!game.animationId && gameLoop) {
        game.animationId = requestAnimationFrame(gameLoop);
      }
    } else {
      if (game.animationId) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
    }
    return () => {
      if (game.animationId) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
    };
  }, [showOverlay, gameEnded]);

  const startGame = () => {
    const game = gameRef.current;
    game.hadEnergy = energy > 0;
    game.isPlaying = true;
    game.isPaused = false;
    game.score = 0;
    game.scoreUpdateCounter = 0;
    game.bird = { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 };
    game.hooks = [];
    game.lastHookTime = performance.now();
    
    setScore(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    
    // Draw initial frame
    const ctx = game.ctx;
    if (ctx) {
      ctx.fillStyle = '#1a3a4a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    
    // Start loop
    if (ctx && !game.animationId) {
      game.animationId = requestAnimationFrame(gameLoop);
    }
  };

  const handlePause = () => {
    gameRef.current.isPaused = !gameRef.current.isPaused;
  };

  return (
    <GameWrapper
      gameName="Fish Hooks"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={handlePause}
      isPaused={gameRef.current.isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100" style={{ margin: 0, padding: 0 }}>
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
                {!gameRef.current.isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
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
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
                      </span>
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
                      
                      {gameRef.current.hadEnergy && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
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
                        onClick={startGame}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                      >
                        Play Again
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          if (gameRef.current.hadEnergy && finalRewards) {
                            onEnd({
                              score: score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            onEnd({
                              score: score,
                              tier: 'normal',
                              xp: 0,
                              coins: 0,
                            });
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
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
          }}
        />
      </div>
    </GameWrapper>
  );
}
/**
 * Axolotl Stacker - Stack blocks high with precision timing
 * Drop blocks onto a growing stack. Only overlapping portion stays, overhangs fall off.
 * Score = stack height reached
 * Features: Canvas rendering, horizontal sliding, camera scroll, falling pieces
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const BASE_Y = CANVAS_H - 40;
const BLOCK_HEIGHT = 28;
const INITIAL_WIDTH = 120;
const SWING_SPEED_BASE = 2.5;

interface StackBlock {
  x: number;
  width: number;
  y: number;
}

interface FallingPiece {
  x: number;
  width: number;
  y: number;
  vy: number;
  color: string;
}

interface CurrentBlock {
  x: number;
  width: number;
  y: number;
  speed: number;
  direction: number; // 1 or -1
}

const COLORS = [
  '#E8A0BF', '#A0D2DB', '#C5A3CF', '#F7C59F', '#B5EAD7',
  '#FFB7B2', '#B5B9FF', '#FFDAC1', '#E2F0CB', '#C7CEEA',
];

export function AxolotlStacker({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Stack height
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const isDroppingRef = useRef<boolean>(false); // Prevent double-tap/double-fire
  const lastDropTimeRef = useRef<number>(0);
  const gameStateRef = useRef<{
    stack: StackBlock[];
    current: CurrentBlock | null;
    fallingPieces: FallingPiece[];
    cameraY: number;
  }>({
    stack: [],
    current: null,
    fallingPieces: [],
    cameraY: 0,
  });

  const spawnBlock = useCallback((currentScore: number) => {
    const top = gameStateRef.current.stack[gameStateRef.current.stack.length - 1];
    const speed = SWING_SPEED_BASE + currentScore * 0.15;
    const width = Math.max(20, top.width - (currentScore > 5 ? 2 : 0));
    gameStateRef.current.current = {
      x: 0,
      width,
      y: top.y - BLOCK_HEIGHT,
      speed,
      direction: 1,
    };
  }, []);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    gameStateRef.current.current = null;
    isDroppingRef.current = false; // Release lock
    
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('axolotl-stacker', score);
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
  }, [score, hadEnergyAtStart]);

  const reset = useCallback(() => {
    // Base block
    gameStateRef.current = {
      stack: [{
        x: CANVAS_W / 2 - INITIAL_WIDTH / 2,
        width: INITIAL_WIDTH,
        y: BASE_Y,
      }],
      current: null,
      fallingPieces: [],
      cameraY: 0,
    };
    setScore(0);
    isDroppingRef.current = false; // Clear lock
    lastDropTimeRef.current = 0; // Reset timer
    spawnBlock(0);
  }, [spawnBlock]);

  const dropBlock = useCallback(() => {
    if (!isPlaying || isPaused || !gameStateRef.current.current) return;
    
    // Prevent double-tap/double-fire on mobile
    const now = performance.now();
    if (isDroppingRef.current || (now - lastDropTimeRef.current) < 300) {
      return; // Ignore if already dropping or too soon since last drop
    }
    
    isDroppingRef.current = true;
    lastDropTimeRef.current = now;

    // Get a snapshot of current state to avoid race conditions
    const top = gameStateRef.current.stack[gameStateRef.current.stack.length - 1];
    const c = gameStateRef.current.current;

    // Calculate overlap - use integer math for better performance and accuracy
    const cLeft = Math.floor(c.x);
    const cRight = Math.floor(c.x + c.width);
    const topLeft = Math.floor(top.x);
    const topRight = Math.floor(top.x + top.width);
    
    const overlapLeft = Math.max(cLeft, topLeft);
    const overlapRight = Math.min(cRight, topRight);
    const overlapWidth = overlapRight - overlapLeft;

    // Only end game on complete miss (no overlap at all)
    if (overlapWidth <= 0) {
      // Complete miss - add entire block as falling piece
      gameStateRef.current.fallingPieces.push({
        x: c.x,
        width: c.width,
        y: c.y,
        vy: 0,
        color: COLORS[score % COLORS.length],
      });
      isDroppingRef.current = false; // Release lock before ending
      endGame();
      return;
    }

    // Place the overlapping portion
    gameStateRef.current.stack.push({
      x: overlapLeft,
      width: overlapWidth,
      y: c.y,
    });

    // Trim pieces fall off
    if (cLeft < topLeft) {
      // Left overhang
      gameStateRef.current.fallingPieces.push({
        x: c.x,
        width: topLeft - c.x,
        y: c.y,
        vy: 0,
        color: COLORS[score % COLORS.length],
      });
    }
    if (cRight > topRight) {
      // Right overhang
      gameStateRef.current.fallingPieces.push({
        x: topRight,
        width: c.x + c.width - topRight,
        y: c.y,
        vy: 0,
        color: COLORS[score % COLORS.length],
      });
    }

    const newScore = score + 1;
    setScore(newScore);

    // Scroll camera up to keep current block and top of stack visible
    // Start scrolling when we have more than 8 blocks, keep ~8-10 blocks visible
    const stackHeight = gameStateRef.current.stack.length;
    if (stackHeight > 8) {
      // Calculate camera to keep the top blocks near the top of screen
      // The current block is at top.y - BLOCK_HEIGHT, we want it visible
      const topBlock = gameStateRef.current.stack[stackHeight - 1];
      const desiredTopY = 100; // Keep top blocks around this Y position
      const targetCameraY = Math.max(0, topBlock.y - desiredTopY);
      gameStateRef.current.cameraY = targetCameraY;
    } else {
      gameStateRef.current.cameraY = 0;
    }

    // Spawn next block - removed the narrow check, only end on complete miss
    spawnBlock(newScore);
    
    // Release the lock after a short delay to allow next drop
    setTimeout(() => {
      isDroppingRef.current = false;
    }, 200);
  }, [isPlaying, isPaused, score, spawnBlock, endGame]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { stack, current, fallingPieces, cameraY } = gameStateRef.current;
    
    // Background
    ctx.fillStyle = '#0e2233';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines - skip entirely for better performance
    // ctx.strokeStyle = 'rgba(100, 200, 255, 0.02)';
    // for (let y = 0; y < CANVAS_H; y += BLOCK_HEIGHT * 4) {
    //   ctx.beginPath();
    //   ctx.moveTo(0, y);
    //   ctx.lineTo(CANVAS_W, y);
    //   ctx.stroke();
    // }

    ctx.save();
    // Translate camera - negative Y moves viewport up (shows higher blocks)
    ctx.translate(0, -cameraY);

    // Calculate visible range for culling (in world coordinates)
    const visibleTop = cameraY;
    const visibleBottom = cameraY + CANVAS_H;

    // Draw placed stack - only visible blocks
    for (let i = 0; i < stack.length; i++) {
      const b = stack[i];
      // Cull off-screen blocks
      if (b.y + BLOCK_HEIGHT < visibleTop || b.y > visibleBottom) continue;
      
      const color = i === 0 ? '#556' : COLORS[(i - 1) % COLORS.length];
      ctx.fillStyle = color;
      // Use fillRect for better performance (no rounded corners on mobile)
      ctx.fillRect(b.x, b.y, b.width, BLOCK_HEIGHT - 2);

      // Highlight - skip for better performance
    }

    // Draw current swinging block
    if (current && isPlaying) {
      ctx.fillStyle = COLORS[score % COLORS.length];
      ctx.globalAlpha = 0.9;
      // Use fillRect for better performance
      ctx.fillRect(current.x, current.y, current.width, BLOCK_HEIGHT - 2);
      ctx.globalAlpha = 1;

      // Drop guide lines - skip entirely for better performance
    }

    // Falling pieces - only draw if visible
    for (const p of fallingPieces) {
      if (p.y + BLOCK_HEIGHT < visibleTop || p.y > visibleBottom + 100) continue;
      ctx.fillStyle = p.color || '#888';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(p.x, p.y, p.width, BLOCK_HEIGHT - 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Height marker
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Height: ${score}`, CANVAS_W - 10, 24);
  }, [isPlaying, score]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const { current, fallingPieces, cameraY } = gameStateRef.current;

    // Update current block position - use integer math
    if (current) {
      current.x += current.speed * current.direction;
      // Optimize boundary checks with integer clamping
      if (current.x + current.width >= CANVAS_W) {
        current.direction = -1;
        current.x = CANVAS_W - current.width;
      } else if (current.x <= 0) {
        current.direction = 1;
        current.x = 0;
      }
    }

    // Update falling pieces - simplified for performance
    if (fallingPieces.length > 0) {
      const cameraBottom = CANVAS_H + cameraY + 100;
      for (let i = fallingPieces.length - 1; i >= 0; i--) {
        const p = fallingPieces[i];
        p.vy += 0.4;
        p.y += p.vy;
        if (p.y > cameraBottom) {
          fallingPieces.splice(i, 1);
        }
      }
    }

    // Draw everything
    draw(ctx);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, draw]);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
  }, [reset, energy]);

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

  // Polyfill for roundRect if needed
  useEffect(() => {
    if (typeof CanvasRenderingContext2D.prototype.roundRect === 'undefined') {
      CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
      };
    }
  }, []);

  // Initialize game state on mount
  useEffect(() => {
    // Initialize base block
    gameStateRef.current = {
      stack: [{
        x: CANVAS_W / 2 - INITIAL_WIDTH / 2,
        width: INITIAL_WIDTH,
        y: BASE_Y,
      }],
      current: null,
      fallingPieces: [],
      cameraY: 0,
    };
    
    // Draw initial state after a small delay to ensure canvas is mounted
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            // Draw background
            ctx.fillStyle = '#0e2233';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            
            // Draw grid
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.04)';
            for (let y = 0; y < CANVAS_H; y += BLOCK_HEIGHT) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(CANVAS_W, y);
              ctx.stroke();
            }
            
            // Draw base block
            const b = gameStateRef.current.stack[0];
            if (b) {
              ctx.fillStyle = '#556';
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(b.x, b.y, b.width, BLOCK_HEIGHT - 2, 4);
              } else {
                ctx.fillRect(b.x, b.y, b.width, BLOCK_HEIGHT - 2);
              }
              ctx.fill();
              
              // Draw highlight
              ctx.fillStyle = 'rgba(255,255,255,0.15)';
              ctx.fillRect(b.x + 2, b.y + 2, b.width - 4, 6);
            }
          }
        } catch (error) {
          console.error('Error drawing initial canvas state:', error);
        }
      }
    }, 10);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <GameWrapper
      gameName="Axolotl Stacker"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100" style={{ margin: 0, padding: 0 }}>
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
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
                        🥞
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Axolotl Stacker
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap to drop each block
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Line them up to stack higher!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Overhangs fall off
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
                        Stack height: {score}
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
          style={{ 
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dropBlock();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dropBlock();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      </div>
    </GameWrapper>
  );
}

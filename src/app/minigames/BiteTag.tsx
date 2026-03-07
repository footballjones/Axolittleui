/**
 * Bite Tag - 4P multiplayer (with bots)
 * One player is "it". Tag others to pass "it". 3 bites = out.
 * Last standing or least bites after 1:30 wins.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const GAME_DURATION = 90; // 1:30 seconds
const PLAYER_SPEED = 2;
const TAG_RANGE = 15; // pixels
const IMMUNITY_DURATION = 3; // seconds

interface Player {
  id: number;
  name: string;
  x: number;
  y: number;
  isIt: boolean;
  bites: number;
  isOut: boolean;
  immunityUntil: number;
  isBot: boolean;
  targetX?: number;
  targetY?: number;
}

export function BiteTag({ onEnd, energy }: MiniGameProps) {
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isWinner, setIsWinner] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You', x: 25, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: false },
    { id: 1, name: 'Bot 1', x: 75, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
    { id: 2, name: 'Bot 2', x: 25, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
    { id: 3, name: 'Bot 3', x: 75, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
  ]);
  const [playerDirection, setPlayerDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());

  const reset = useCallback(() => {
    const initialPlayers: Player[] = [
      { id: 0, name: 'You', x: 25, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: false },
      { id: 1, name: 'Bot 1', x: 75, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
      { id: 2, name: 'Bot 2', x: 25, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
      { id: 3, name: 'Bot 3', x: 75, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
    ];
    const itIndex = Math.floor(Math.random() * 4);
    setPlayers(initialPlayers.map((p, i) => ({ ...p, isIt: i === itIndex })));
    setTimeRemaining(GAME_DURATION);
    setPlayerDirection({ x: 0, y: 0 });
    lastFrameTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
  }, [reset, energy]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    
    // Get current players state
    setPlayers(currentPlayers => {
      const player = currentPlayers.find(p => p.id === 0);
      const activePlayers = currentPlayers.filter(p => !p.isOut);
      const won = activePlayers.length === 1 && activePlayers[0].id === 0;
      const minBites = Math.min(...currentPlayers.filter(p => !p.isOut).map(p => p.bites));
      const isTiedWinner = !won && player && !player.isOut && player.bites === minBites;
      
      const score = won || isTiedWinner ? 90 - (player?.bites || 0) * 10 : 0;
      setFinalScore(score);
      setIsWinner(won || isTiedWinner);
      
      // Only calculate and show rewards if energy was available at start
      if (hadEnergyAtStart) {
        const rewards = calculateRewards('bite-tag', score);
        setFinalRewards({
          tier: rewards.tier,
          xp: (won || isTiedWinner) ? rewards.xp : 0,
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
      
      return currentPlayers;
    });
  }, [hadEnergyAtStart]);

  const handleMove = useCallback((direction: { x: number; y: number }) => {
    if (!isPlaying || isPaused) return;
    setPlayerDirection(direction);
  }, [isPlaying, isPaused]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 16.67;
    lastFrameTimeRef.current = now;

    // Update timer
    let timeExpired = false;
    setTimeRemaining(prev => {
      const newTime = prev - deltaTime / 60;
      if (newTime <= 0) {
        timeExpired = true;
        setIsPlaying(false);
        return 0;
      }
      return newTime;
    });

    setPlayers(prev => {
      const updated = [...prev];
      const now = Date.now() / 1000;

      // Update player positions
      updated.forEach((player, index) => {
        if (player.isOut) return;

        if (index === 0) {
          // Human player
          const newX = Math.max(10, Math.min(90, player.x + playerDirection.x * PLAYER_SPEED * deltaTime));
          const newY = Math.max(10, Math.min(90, player.y + playerDirection.y * PLAYER_SPEED * deltaTime));
          updated[index] = { ...player, x: newX, y: newY };
        } else {
          // Bot AI
          if (player.isIt) {
            // "It" chases nearest non-it player
            const targets = updated.filter(p => !p.isIt && !p.isOut && p.id !== player.id);
            if (targets.length > 0) {
              const target = targets[0];
              const dx = target.x - player.x;
              const dy = target.y - player.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const newX = Math.max(10, Math.min(90, player.x + (dx / dist) * PLAYER_SPEED * deltaTime));
                const newY = Math.max(10, Math.min(90, player.y + (dy / dist) * PLAYER_SPEED * deltaTime));
                updated[index] = { ...player, x: newX, y: newY };
              }
            }
          } else {
            // Non-it runs away from "it"
            const itPlayer = updated.find(p => p.isIt && !p.isOut);
            if (itPlayer) {
              const dx = player.x - itPlayer.x;
              const dy = player.y - itPlayer.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0 && dist < 30) {
                const newX = Math.max(10, Math.min(90, player.x + (dx / dist) * PLAYER_SPEED * deltaTime));
                const newY = Math.max(10, Math.min(90, player.y + (dy / dist) * PLAYER_SPEED * deltaTime));
                updated[index] = { ...player, x: newX, y: newY };
              } else {
                // Random movement
                const newX = Math.max(10, Math.min(90, player.x + (Math.random() - 0.5) * PLAYER_SPEED * deltaTime));
                const newY = Math.max(10, Math.min(90, player.y + (Math.random() - 0.5) * PLAYER_SPEED * deltaTime));
                updated[index] = { ...player, x: newX, y: newY };
              }
            }
          }
        }

        // Check tags
        if (player.isIt && player.immunityUntil < now) {
          updated.forEach((other, otherIndex) => {
            if (otherIndex === index || other.isIt || other.isOut || other.immunityUntil > now) return;
            
            const dx = other.x - player.x;
            const dy = other.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < TAG_RANGE) {
              // Tagged!
              updated[index] = { ...player, isIt: false, immunityUntil: now + IMMUNITY_DURATION };
              updated[otherIndex] = {
                ...other,
                isIt: true,
                bites: other.bites + 1,
                immunityUntil: now + IMMUNITY_DURATION,
              };
              
              // Check if out (3 bites)
              if (updated[otherIndex].bites >= 3) {
                updated[otherIndex].isOut = true;
              }
            }
          });
        }
      });

      // Check win condition
      const activePlayers = updated.filter(p => !p.isOut);
      if (activePlayers.length === 1) {
        setIsPlaying(false);
        setTimeout(() => endGame(), 100);
      }
      
      // Check if time expired
      if (timeExpired) {
        setTimeout(() => endGame(), 100);
      }
      
      return updated;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, playerDirection, endGame]);

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
      const dir = { x: 0, y: 0 };
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir.y = -1;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir.y = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir.x = -1;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir.x = 1;
      if (dir.x !== 0 || dir.y !== 0) handleMove(dir);
    };

    const handleKeyUp = () => {
      handleMove({ x: 0, y: 0 });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, handleMove]);

  const player = players.find(p => p.id === 0);

  return (
    <GameWrapper
      gameName="Bite Tag"
      score={player ? 3 - player.bites : 0}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-green-200 via-emerald-300 to-teal-400">
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-green-900/80 via-emerald-900/80 to-teal-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-green-300/80 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
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
                        🦷
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4">
                        Bite Tag
                      </h2>
                      <div className="space-y-2 text-green-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👹</span>
                          One player is "it" - tag others to pass it
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          3 bites = you're out!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🏃</span>
                          Run away or chase - arrow keys or WASD
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🏆</span>
                          Last standing or least bites wins!
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
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
                        {isWinner ? '🏆' : '😅'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4">
                        {isWinner ? 'You Win!' : 'Game Over!'}
                      </h2>
                      <p className="text-green-800 text-center mb-2 text-xl font-bold">
                        Your bites: {player?.bites || 0} / 3
                      </p>
                      <p className="text-green-600 text-center mb-4 text-sm font-medium">
                        {isWinner ? '🌟 Last one standing!' : '💪 Better luck next time!'}
                      </p>
                      
                      {/* Rewards display - only show if energy was used */}
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-green-200">
                          <p className="text-green-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-green-800">
                            {finalRewards.xp > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">⭐</span>
                                <span className="font-semibold">+{finalRewards.xp} XP</span>
                              </div>
                            )}
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
                            <p className="text-xs text-green-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-green-200">
                          <p className="text-green-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-green-600 text-center text-sm">
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
                        className="flex-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
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
                              score: finalScore,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
                            onEnd({
                              score: finalScore,
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

        {/* Game content - only show when playing */}
        {isPlaying && !showOverlay && (
          <>
        {/* Arena */}
        <div className="absolute inset-4 border-4 border-white/50 rounded-3xl" />

        {/* Players */}
        {players.map(player => {
          if (player.isOut) return null;
          
          const isImmune = player.immunityUntil > Date.now() / 1000;
          
          return (
            <motion.div
              key={player.id}
              className={`absolute text-4xl ${player.isIt ? 'z-10' : ''}`}
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={player.isIt ? {
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              } : {}}
              transition={{ duration: 0.5, repeat: player.isIt ? Infinity : 0 }}
            >
              <div className={`relative ${isImmune ? 'opacity-50' : ''}`}>
                {player.isIt ? '👹' : '🦎'}
                {player.isIt && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1 rounded">
                    IT
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
            <div className="text-white font-bold text-sm">
              {player?.name}: {player?.bites || 0}/3 bites
            </div>
            <div className="text-white text-xs">
              {Math.ceil(timeRemaining)}s
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
            {players.filter(p => !p.isOut).map(p => (
              <div key={p.id} className="text-white text-xs">
                {p.name}: {p.bites}/3 {p.isIt && '👹'}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30">
          <p className="text-white text-xs font-bold text-center">
            {player?.isIt ? 'Tag others! 👹' : 'Run away! 🏃'} • Arrow keys or WASD
          </p>
        </div>
          </>
        )}
      </div>
    </GameWrapper>
  );
}

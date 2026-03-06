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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You', x: 25, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: false },
    { id: 1, name: 'Bot 1', x: 75, y: 25, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
    { id: 2, name: 'Bot 2', x: 25, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
    { id: 3, name: 'Bot 3', x: 75, y: 75, isIt: false, bites: 0, isOut: false, immunityUntil: 0, isBot: true },
  ]);
  const [playerDirection, setPlayerDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Initialize - random player is "it"
  useEffect(() => {
    const itIndex = Math.floor(Math.random() * 4);
    setPlayers(prev => prev.map((p, i) => ({ ...p, isIt: i === itIndex })));
  }, []);

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
    setTimeRemaining(prev => {
      const newTime = prev - deltaTime / 60;
      if (newTime <= 0) {
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
      }

      return updated;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, playerDirection]);

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

  // End game
  useEffect(() => {
    if (!isPlaying) {
      const player = players.find(p => p.id === 0);
      const activePlayers = players.filter(p => !p.isOut);
      const isWinner = activePlayers.length === 1 && activePlayers[0].id === 0;
      const minBites = Math.min(...players.filter(p => !p.isOut).map(p => p.bites));
      const isTiedWinner = !isWinner && player && !player.isOut && player.bites === minBites;
      
      const score = isWinner || isTiedWinner ? 90 - (player?.bites || 0) * 10 : 0;
      const rewards = calculateRewards('bite-tag', score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: (isWinner || isTiedWinner) ? rewards.xp : 0,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, players, onEnd]);

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
      </div>
    </GameWrapper>
  );
}

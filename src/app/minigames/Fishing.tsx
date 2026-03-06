/**
 * Fishing - 2P multiplayer (with bot)
 * Drop line, catch fish by weight. Most weight wins after 1 minute.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const GAME_DURATION = 60; // seconds
const LINE_SPEED = 5; // pixels per frame
const FISH_SPAWN_RATE = 0.3; // per second
const FISH_WEIGHTS = [1, 2, 3, 4, 5]; // kg
const BOT_REACTION_TIME = 0.5; // seconds

interface Fish {
  id: number;
  y: number; // Depth
  weight: number;
  caught: boolean;
  caughtBy: 'player' | 'bot' | null;
}

export function Fishing({ onEnd, energy }: MiniGameProps) {
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [playerLineDepth, setPlayerLineDepth] = useState(0);
  const [botLineDepth, setBotLineDepth] = useState(0);
  const [isPlayerReeling, setIsPlayerReeling] = useState(false);
  const [isBotReeling, setIsBotReeling] = useState(false);
  const [playerWeight, setPlayerWeight] = useState(0);
  const [botWeight, setBotWeight] = useState(0);
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [playerCaughtFish, setPlayerCaughtFish] = useState<Fish | null>(null);
  const [botCaughtFish, setBotCaughtFish] = useState<Fish | null>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());
  const fishIdRef = useRef<number>(0);
  const botReactionTimerRef = useRef<number>();

  const handleDropLine = useCallback(() => {
    if (!isPlaying || isPaused || isPlayerReeling) return;
    setPlayerLineDepth(prev => Math.min(prev + LINE_SPEED, 80));
  }, [isPlaying, isPaused, isPlayerReeling]);

  const handleReel = useCallback(() => {
    if (!isPlaying || isPaused || playerLineDepth === 0) return;
    setIsPlayerReeling(true);
  }, [isPlaying, isPaused, playerLineDepth]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;

    // Update timer
    setTimeRemaining(prev => {
      const newTime = prev - deltaTime;
      if (newTime <= 0) {
        setIsPlaying(false);
        return 0;
      }
      return newTime;
    });

    // Player reeling
    if (isPlayerReeling) {
      setPlayerLineDepth(prev => {
        const newDepth = Math.max(0, prev - LINE_SPEED * 2);
        if (newDepth === 0) {
          setIsPlayerReeling(false);
          if (playerCaughtFish) {
            setPlayerWeight(prev => prev + playerCaughtFish.weight);
            setPlayerCaughtFish(null);
          }
        }
        return newDepth;
      });
    }

    // Bot AI
    if (!isBotReeling && botLineDepth < 80) {
      setBotLineDepth(prev => Math.min(prev + LINE_SPEED * 0.8, 80));
    }

    // Check for fish catches
    setFishes(prev => {
      const updated = prev.map(fish => {
        if (fish.caught) return fish;

        // Check player catch
        if (!playerCaughtFish && Math.abs(playerLineDepth - fish.y) < 5 && playerLineDepth > 0) {
          setPlayerCaughtFish(fish);
          setIsPlayerReeling(true);
          return { ...fish, caught: true, caughtBy: 'player' };
        }

        // Check bot catch
        if (!botCaughtFish && Math.abs(botLineDepth - fish.y) < 5 && botLineDepth > 0) {
          setBotCaughtFish(fish);
          setIsBotReeling(true);
          setTimeout(() => {
            setIsBotReeling(false);
            setBotLineDepth(0);
            if (botCaughtFish) {
              setBotWeight(prev => prev + botCaughtFish.weight);
              setBotCaughtFish(null);
            }
          }, BOT_REACTION_TIME * 1000);
          return { ...fish, caught: true, caughtBy: 'bot' };
        }

        return fish;
      });

      return updated.filter(fish => fish.y > -10); // Remove off-screen
    });

    // Bot reeling
    if (isBotReeling) {
      setBotLineDepth(prev => {
        const newDepth = Math.max(0, prev - LINE_SPEED * 2);
        if (newDepth === 0) {
          setIsBotReeling(false);
          if (botCaughtFish) {
            setBotWeight(prev => prev + botCaughtFish.weight);
            setBotCaughtFish(null);
          }
        }
        return newDepth;
      });
    }

    // Spawn fish
    if (Math.random() < FISH_SPAWN_RATE * deltaTime) {
      const fishY = 20 + Math.random() * 60;
      const weight = FISH_WEIGHTS[Math.floor(Math.random() * FISH_WEIGHTS.length)];
      
      setFishes(prev => [...prev, {
        id: fishIdRef.current++,
        y: fishY,
        weight,
        caught: false,
        caughtBy: null,
      }]);
    }

    // Move fish
    setFishes(prev => prev.map(fish => ({
      ...fish,
      y: fish.y - 0.5, // Fish swim upward
    })));

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, isPlayerReeling, isBotReeling, playerLineDepth, botLineDepth, playerCaughtFish, botCaughtFish]);

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
      const isWinner = playerWeight > botWeight;
      const score = isWinner ? playerWeight : 0; // Only winner gets score
      const rewards = calculateRewards('fishing', score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: isWinner ? rewards.xp : 0, // Only winner gets XP
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, playerWeight, botWeight, onEnd]);

  return (
    <GameWrapper
      gameName="Fishing"
      score={playerWeight}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-sky-300 via-blue-400 to-cyan-500">
        {/* Water surface */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-200/50 to-transparent" />

        {/* Boats */}
        <div className="absolute top-10 left-10 text-4xl">🚤</div>
        <div className="absolute top-10 right-10 text-4xl">🚤</div>

        {/* Fishing lines */}
        <svg className="absolute inset-0 pointer-events-none">
          {/* Player line */}
          <line
            x1="15%"
            y1="15%"
            x2="15%"
            y2={`${15 + playerLineDepth}%`}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
          />
          {/* Bot line */}
          <line
            x1="85%"
            y1="15%"
            x2="85%"
            y2={`${15 + botLineDepth}%`}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
          />
        </svg>

        {/* Fish */}
        {fishes.map(fish => (
          <motion.div
            key={fish.id}
            className={`absolute text-3xl ${fish.caught ? 'opacity-50' : ''}`}
            style={{
              left: fish.caughtBy === 'player' ? '12%' : fish.caughtBy === 'bot' ? '82%' : `${20 + Math.random() * 60}%`,
              top: `${fish.y}%`,
            }}
            animate={fish.caught ? {} : {
              x: [0, 10, -10, 0],
              y: [0, -2, 2, 0],
            }}
            transition={{
              duration: 2,
              repeat: fish.caught ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          >
            {fish.weight >= 4 ? '🐟' : fish.weight >= 2 ? '🐠' : '🦐'}
          </motion.div>
        ))}

        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
            <div className="text-white font-bold text-sm">You: {playerWeight}kg</div>
            <div className="text-white text-xs">{Math.ceil(timeRemaining)}s</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
            <div className="text-white font-bold text-sm">Bot: {botWeight}kg</div>
            <div className="text-white text-xs">VS</div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30">
          <p className="text-white text-xs font-bold text-center mb-2">
            Hold to drop line • Release to reel
          </p>
          <div className="flex gap-2">
            <motion.button
              onMouseDown={handleDropLine}
              onTouchStart={handleDropLine}
              onMouseUp={handleReel}
              onTouchEnd={handleReel}
              className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg"
              whileTap={{ scale: 0.95 }}
            >
              {isPlayerReeling ? 'Reeling...' : 'Drop Line'}
            </motion.button>
          </div>
        </div>
      </div>
    </GameWrapper>
  );
}

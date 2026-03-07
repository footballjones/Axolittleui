/**
 * Coral Code - Mastermind game
 * Guess the secret code in 10 tries
 * Score = 10 - guesses used (higher is better)
 */

import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CODE_LENGTH = 4;
const MAX_GUESSES = 10;
const COLORS = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'];

function generateSecretCode(): string[] {
  const code: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    code.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }
  return code;
}

function checkGuess(secret: string[], guess: string[]): { correct: number; wrongPosition: number } {
  const secretCounts = new Map<string, number>();
  const guessCounts = new Map<string, number>();
  let correct = 0;
  
  // Count correct positions
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      correct++;
    } else {
      secretCounts.set(secret[i], (secretCounts.get(secret[i]) || 0) + 1);
      guessCounts.set(guess[i], (guessCounts.get(guess[i]) || 0) + 1);
    }
  }
  
  // Count wrong positions (right color, wrong place)
  let wrongPosition = 0;
  for (const [color, count] of guessCounts.entries()) {
    const secretCount = secretCounts.get(color) || 0;
    wrongPosition += Math.min(count, secretCount);
  }
  
  return { correct, wrongPosition };
}

interface Guess {
  id: number;
  colors: string[];
  feedback: { correct: number; wrongPosition: number };
}

export function CoralCode({ onEnd, energy }: MiniGameProps) {
  const [secretCode, setSecretCode] = useState<string[]>(() => generateSecretCode());
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [hasEnded, setHasEnded] = useState(false);
  const guessIdRef = useRef<number>(0);

  const addColorToGuess = useCallback((color: string) => {
    setCurrentGuess(prev => {
      if (prev.length < CODE_LENGTH) {
        return [...prev, color];
      }
      return prev;
    });
  }, []);

  const removeColorFromGuess = useCallback((index: number) => {
    setCurrentGuess(prev => prev.filter((_, i) => i !== index));
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== CODE_LENGTH || !isPlaying || isPaused || hasEnded) return;
    if (secretCode.length === 0) return; // Safety check

    const feedback = checkGuess(secretCode, currentGuess);
    const newGuess: Guess = {
      id: guessIdRef.current++,
      colors: [...currentGuess],
      feedback,
    };

    setGuesses(prev => {
      const newGuesses = [...prev, newGuess];
      const newGuessCount = newGuesses.length;

      // Check win condition
      if (feedback.correct === CODE_LENGTH) {
        // Won!
        const score = MAX_GUESSES - newGuessCount; // Higher score = fewer guesses
        setIsPlaying(false);
        setHasEnded(true);
        const rewards = calculateRewards('coral-code', score);
        onEnd({
          score,
          tier: rewards.tier,
          xp: rewards.xp,
          coins: rewards.coins,
          opals: rewards.opals,
        });
        return newGuesses;
      }

      // Check lose condition
      if (newGuessCount >= MAX_GUESSES) {
        // Out of guesses
        setIsPlaying(false);
        setHasEnded(true);
        const rewards = calculateRewards('coral-code', 0);
        onEnd({
          score: 0,
          tier: rewards.tier,
          xp: rewards.xp,
          coins: rewards.coins,
          opals: rewards.opals,
        });
        return newGuesses;
      }

      return newGuesses;
    });
    setCurrentGuess([]);
  }, [currentGuess.length, secretCode, isPlaying, isPaused, hasEnded, onEnd]);

  // Don't render until secret code is initialized
  if (secretCode.length === 0) {
    return (
      <GameWrapper
        gameName="Coral Code"
        score={MAX_GUESSES}
        onEnd={onEnd}
        energy={energy}
        onPause={() => setIsPaused(!isPaused)}
        isPaused={isPaused}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper
      gameName="Coral Code"
      score={MAX_GUESSES - guesses.length}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-violet-100">
        {/* Title */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-purple-800 text-center">
            Crack the Code! 🪸
          </h3>
          <p className="text-sm text-purple-600 text-center mt-1">
            {MAX_GUESSES - guesses.length} guesses remaining
          </p>
        </div>

        {/* Previous guesses */}
        <div className="flex-1 overflow-y-auto w-full max-w-md mb-4 space-y-2">
          {guesses.map((guess) => (
            <motion.div
              key={guess.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border-2 border-purple-300"
            >
              <div className="flex items-center gap-2 mb-2">
                {guess.colors.map((color, i) => (
                  <div key={i} className="text-3xl">{color}</div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded">
                  ✓ {guess.feedback.correct}
                </span>
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                  ○ {guess.feedback.wrongPosition}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Current guess */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-4 border-4 border-purple-400 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-4 min-h-[60px]">
            {currentGuess.map((color, index) => (
              <motion.button
                key={index}
                onClick={() => removeColorFromGuess(index)}
                className="text-4xl"
                whileTap={{ scale: 0.9 }}
              >
                {color}
              </motion.button>
            ))}
            {[...Array(CODE_LENGTH - currentGuess.length)].map((_, i) => (
              <div key={i} className="w-12 h-12 border-2 border-dashed border-purple-300 rounded-lg" />
            ))}
          </div>

          {/* Color picker */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {COLORS.map((color) => (
              <motion.button
                key={color}
                onClick={() => addColorToGuess(color)}
                disabled={currentGuess.length >= CODE_LENGTH}
                className={`text-4xl p-2 rounded-lg border-2 ${
                  selectedColor === color
                    ? 'border-purple-600 bg-purple-100'
                    : 'border-purple-200 bg-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setSelectedColor(color)}
              >
                {color}
              </motion.button>
            ))}
          </div>

          {/* Submit button */}
          <motion.button
            onClick={submitGuess}
            disabled={currentGuess.length !== CODE_LENGTH || !isPlaying}
            className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.95 }}
          >
            Submit Guess
          </motion.button>
        </div>
      </div>
    </GameWrapper>
  );
}

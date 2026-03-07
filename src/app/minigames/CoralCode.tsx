/**
 * Coral Code - Mastermind game
 * Guess the secret code in 10 tries
 * Score = 10 - guesses used (higher is better)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const MAX_GUESSES = 10;
const COLORS = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'];

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { codeLength: number; colorCount: number; label: string }> = {
  easy: { codeLength: 3, colorCount: 4, label: 'Easy (3 slots)' },
  normal: { codeLength: 4, colorCount: 5, label: 'Normal (4 slots)' },
  hard: { codeLength: 5, colorCount: 6, label: 'Hard (5 slots)' },
};

function getAvailableColors(difficulty: Difficulty): string[] {
  const colorCount = DIFFICULTY_CONFIG[difficulty].colorCount;
  return COLORS.slice(0, colorCount);
}

function generateSecretCode(codeLength: number, availableColors: string[]): string[] {
  const code: string[] = [];
  for (let i = 0; i < codeLength; i++) {
    code.push(availableColors[Math.floor(Math.random() * availableColors.length)]);
  }
  return code;
}

function checkGuess(secret: string[], guess: string[], codeLength: number): { correct: number; wrongPosition: number } {
  const secretCounts = new Map<string, number>();
  const guessCounts = new Map<string, number>();
  let correct = 0;
  
  // Count correct positions
  for (let i = 0; i < codeLength; i++) {
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
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [codeLength, setCodeLength] = useState<number>(4);
  const [availableColors, setAvailableColors] = useState<string[]>(COLORS.slice(0, 5));
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [hasEnded, setHasEnded] = useState(false);
  const guessIdRef = useRef<number>(0);
  const guessesContainerRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const colors = getAvailableColors(selectedDifficulty);
    setDifficulty(selectedDifficulty);
    setCodeLength(config.codeLength);
    setAvailableColors(colors);
    setSecretCode(generateSecretCode(config.codeLength, colors));
    setCurrentGuess([]);
    setGuesses([]);
    setIsPlaying(true);
    setHasEnded(false);
    setSelectedColor(colors[0]);
    guessIdRef.current = 0;
  }, []);

  // Auto-scroll to bottom when new guess is added
  useEffect(() => {
    if (guessesContainerRef.current && guesses.length > 0) {
      guessesContainerRef.current.scrollTop = guessesContainerRef.current.scrollHeight;
    }
  }, [guesses.length]);

  const addColorToGuess = useCallback((color: string) => {
    setCurrentGuess(prev => {
      if (prev.length < codeLength) {
        return [...prev, color];
      }
      return prev;
    });
  }, [codeLength]);

  const removeColorFromGuess = useCallback((index: number) => {
    setCurrentGuess(prev => prev.filter((_, i) => i !== index));
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== codeLength || !isPlaying || isPaused || hasEnded) return;
    if (secretCode.length === 0) return; // Safety check

    const feedback = checkGuess(secretCode, currentGuess, codeLength);
    const newGuess: Guess = {
      id: guessIdRef.current++,
      colors: [...currentGuess],
      feedback,
    };

    setGuesses(prev => {
      const newGuesses = [...prev, newGuess];
      const newGuessCount = newGuesses.length;

      // Check win condition
      if (feedback.correct === codeLength) {
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
  }, [currentGuess.length, secretCode, codeLength, isPlaying, isPaused, hasEnded, onEnd]);

  // Difficulty selection screen
  if (!difficulty || secretCode.length === 0) {
    return (
      <GameWrapper
        gameName="Coral Code"
        score={MAX_GUESSES}
        onEnd={onEnd}
        energy={energy}
        onPause={() => setIsPaused(!isPaused)}
        isPaused={isPaused}
      >
        <div className="relative w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-violet-100">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full border-4 border-purple-300 shadow-2xl"
          >
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-purple-800 mb-2">Crack the Code! 🪸</h2>
              <p className="text-purple-600 text-sm">Choose your difficulty</p>
            </div>
            <div className="space-y-3">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff) => (
                <motion.button
                  key={diff}
                  onClick={() => startGame(diff)}
                  className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {DIFFICULTY_CONFIG[diff].label}
                </motion.button>
              ))}
            </div>
          </motion.div>
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
      <div className="relative w-full h-full flex flex-col p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-violet-100">
        {/* Title - compact */}
        <div className="mb-2 flex-shrink-0">
          <h3 className="text-xl font-bold text-purple-800 text-center">
            {DIFFICULTY_CONFIG[difficulty].label} • {MAX_GUESSES - guesses.length} guesses left
          </h3>
        </div>

        {/* Previous guesses - more space */}
        <div 
          ref={guessesContainerRef}
          className="flex-1 overflow-y-auto w-full mb-2 space-y-1.5 pr-1"
        >
          {guesses.map((guess, index) => {
            const isMostRecent = index === guesses.length - 1;
            return (
              <motion.div
                key={guess.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white/80 backdrop-blur-sm rounded-lg p-2 border-2 ${
                  isMostRecent 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-purple-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {guess.colors.map((color, i) => (
                    <div key={i} className="text-2xl">{color}</div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                    ✓ {guess.feedback.correct}
                  </span>
                  <span className="bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                    ○ {guess.feedback.wrongPosition}
                  </span>
                  {isMostRecent && (
                    <span className="ml-auto text-purple-600 font-semibold text-xs">Latest</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Current guess - compact */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border-4 border-purple-400 flex-shrink-0">
          <div className="flex items-center justify-center gap-1.5 mb-2 min-h-[50px]">
            {currentGuess.map((color, index) => (
              <motion.button
                key={index}
                onClick={() => removeColorFromGuess(index)}
                className="text-3xl"
                whileTap={{ scale: 0.9 }}
              >
                {color}
              </motion.button>
            ))}
            {[...Array(codeLength - currentGuess.length)].map((_, i) => (
              <div key={i} className="w-10 h-10 border-2 border-dashed border-purple-300 rounded-lg" />
            ))}
          </div>

          {/* Color picker - compact */}
          <div className={`grid gap-1.5 mb-2 ${availableColors.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {availableColors.map((color) => (
              <motion.button
                key={color}
                onClick={() => addColorToGuess(color)}
                disabled={currentGuess.length >= codeLength}
                className={`text-3xl p-1.5 rounded-lg border-2 ${
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

          {/* Submit button - compact */}
          <motion.button
            onClick={submitGuess}
            disabled={currentGuess.length !== codeLength || !isPlaying}
            className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            whileTap={{ scale: 0.95 }}
          >
            Submit Guess
          </motion.button>
        </div>
      </div>
    </GameWrapper>
  );
}

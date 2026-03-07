/**
 * Math Rush - Solve math equations fast!
 * Equations appear with multiple choice. Timer counts down.
 * Score = number of correct answers
 * Features: Emoji themes, progressive difficulty, division support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const INITIAL_TIMER = 10; // seconds per question
const MIN_TIMER = 3; // Minimum timer as difficulty increases

const THEMES = [
  { emoji: '🦐', name: 'ghost shrimp' },
  { emoji: '🐚', name: 'shells' },
  { emoji: '💎', name: 'gems' },
  { emoji: '🫧', name: 'bubbles' },
];

interface Question {
  question: string;
  answer: number;
  options: number[];
  themeEmoji: string;
}

function generateQuestion(level: number): Question {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  let a: number, b: number, op: string, answer: number, questionText: string;

  // Progressive difficulty based on score (level = score / 3, max level 4)
  const actualLevel = Math.min(Math.floor(level / 3), 4);

  if (actualLevel < 1) {
    // Level 0: Addition only (easier numbers)
    a = 1 + Math.floor(Math.random() * 10);
    b = 1 + Math.floor(Math.random() * 10);
    op = '+';
    answer = a + b;
    questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
  } else if (actualLevel < 2) {
    // Level 1: Addition & subtraction (easier subtraction)
    if (Math.random() < 0.5) {
      a = 2 + Math.floor(Math.random() * 15);
      b = 1 + Math.floor(Math.random() * a);
      op = '-';
      answer = a - b;
      questionText = `${a} ${theme.emoji} − ${b} ${theme.emoji} = ?`;
    } else {
      a = 1 + Math.floor(Math.random() * 15);
      b = 1 + Math.floor(Math.random() * 15);
      op = '+';
      answer = a + b;
      questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
    }
  } else if (actualLevel < 3) {
    // Level 2: Multiplication (smaller numbers)
    a = 2 + Math.floor(Math.random() * 8);
    b = 2 + Math.floor(Math.random() * 8);
    op = '×';
    answer = a * b;
    questionText = `${a} × ${b} ${theme.emoji} = ?`;
  } else {
    // Level 3+: Mixed including division
    const ops = ['+', '-', '×', '÷'];
    op = ops[Math.floor(Math.random() * ops.length)];
    
    if (op === '÷') {
      // Division: make sure it divides evenly
      b = 2 + Math.floor(Math.random() * 8);
      answer = 2 + Math.floor(Math.random() * 8);
      a = b * answer;
      questionText = `${a} ${theme.emoji} ÷ ${b} = ?`;
    } else if (op === '×') {
      a = 2 + Math.floor(Math.random() * 10);
      b = 2 + Math.floor(Math.random() * 10);
      answer = a * b;
      questionText = `${a} × ${b} ${theme.emoji} = ?`;
    } else if (op === '-') {
      a = 5 + Math.floor(Math.random() * 20);
      b = 1 + Math.floor(Math.random() * a);
      answer = a - b;
      questionText = `${a} ${theme.emoji} − ${b} ${theme.emoji} = ?`;
    } else {
      a = 1 + Math.floor(Math.random() * 20);
      b = 1 + Math.floor(Math.random() * 20);
      answer = a + b;
      questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
    }
  }

  // Generate wrong answers (closer to correct answer for harder questions)
  const wrongSet = new Set<number>();
  const range = actualLevel < 2 ? 5 : 7; // Smaller range for easier questions
  while (wrongSet.size < 3) {
    let wrong = answer + (Math.floor(Math.random() * (range * 2 + 1)) - range);
    if (wrong !== answer && wrong >= 0 && !wrongSet.has(wrong)) {
      wrongSet.add(wrong);
    }
  }

  const options = [answer, ...Array.from(wrongSet)];
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { question: questionText, answer, options, themeEmoji: theme.emoji };
}

export function MathRush({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Start with false, show overlay first
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'correct' | 'wrong' | '' }>({ text: '', type: '' });
  const [waitingForNext, setWaitingForNext] = useState(false);
  const timerIntervalRef = useRef<number>();

  const loadNewQuestion = useCallback(() => {
    const newQuestion = generateQuestion(score);
    setCurrentQuestion(newQuestion);
    setTimer(INITIAL_TIMER);
    setSelectedAnswer(null);
    setFeedback({ text: '', type: '' });
    setWaitingForNext(false);
  }, [score]);

  const startGame = useCallback(() => {
    setScore(0);
    setShowOverlay(false);
    setIsPlaying(true);
    setIsPaused(false);
    loadNewQuestion();
  }, [loadNewQuestion]);

  // Timer countdown - only when playing and question is loaded
  useEffect(() => {
    if (!isPlaying || isPaused || !currentQuestion || waitingForNext) return;

    timerIntervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev <= 0.1) {
          // Time's up - game over
          setFeedback({ text: '⏰ Time\'s up!', type: 'wrong' });
          setTimeout(() => {
            setIsPlaying(false);
          }, 800);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPlaying, isPaused, currentQuestion, waitingForNext]);

  const handleAnswer = useCallback((answer: number) => {
    if (!currentQuestion || selectedAnswer !== null || waitingForNext) return;
    
    setSelectedAnswer(answer);
    setWaitingForNext(true);
    
    if (answer === currentQuestion.answer) {
      // Correct!
      setFeedback({ text: '✓ Correct!', type: 'correct' });
      setScore(prev => prev + 1);
      setTimeout(() => {
        loadNewQuestion();
      }, 500);
    } else {
      // Wrong answer
      setFeedback({ text: '✗ Wrong!', type: 'wrong' });
      setTimeout(() => {
        setIsPlaying(false);
      }, 800);
    }
  }, [currentQuestion, selectedAnswer, waitingForNext, loadNewQuestion]);

  // End game
  useEffect(() => {
    if (!isPlaying && score > 0) {
      const rewards = calculateRewards('math-rush', score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, score, onEnd]);

  return (
    <GameWrapper
      gameName="Math Rush"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100">
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300 shadow-2xl"
            >
              {!isPlaying ? (
                <>
                  <h2 className="text-3xl font-bold text-purple-800 text-center mb-4">🔢 Math Rush</h2>
                  <p className="text-purple-600 text-center mb-6">
                    Solve equations before time runs out!<br />
                    Each correct answer speeds up the timer.
                  </p>
                  <motion.button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition-transform"
                    whileTap={{ scale: 0.95 }}
                  >
                    Start
                  </motion.button>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-purple-800 text-center mb-4">Game Over!</h2>
                  <p className="text-purple-600 text-center mb-2 text-xl font-bold">
                    {score} correct {score === 1 ? 'answer' : 'answers'}
                  </p>
                  <p className="text-purple-500 text-center mb-6 text-sm">
                    {score >= 15 ? 'Exceptional!' : score >= 8 ? 'Good job!' : 'Keep practicing!'}
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={startGame}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                      whileTap={{ scale: 0.95 }}
                    >
                      Play Again
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setIsPlaying(false);
                        setShowOverlay(false);
                        onEnd({ score: 0, tier: 'normal', xp: 0, coins: 0 });
                      }}
                      className="flex-1 bg-gray-400 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                      whileTap={{ scale: 0.95 }}
                    >
                      Back to Games
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Timer bar */}
        {isPlaying && currentQuestion && (
          <div className="w-full max-w-md mb-6 z-10">
            <div className="h-3 bg-white/30 rounded-full overflow-hidden border-2 border-white/50">
              <motion.div
                className="h-full"
                style={{
                  background: timer / INITIAL_TIMER > 0.3 
                    ? 'linear-gradient(to right, #4fc3f7, #29b6f6)' 
                    : 'linear-gradient(to right, #ef5350, #e53935)',
                }}
                initial={{ width: '100%' }}
                animate={{ width: `${(timer / INITIAL_TIMER) * 100}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
            <p className="text-center text-white font-bold text-sm mt-2 drop-shadow-lg">
              {Math.ceil(timer)}s
            </p>
          </div>
        )}

        {/* Question */}
        {isPlaying && currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mb-6 shadow-2xl border-4 border-purple-300 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <p className="text-5xl mb-4">{currentQuestion.themeEmoji}</p>
              <p className="text-3xl font-bold text-purple-800 mb-2">
                {currentQuestion.question}
              </p>
            </div>

            {/* Feedback */}
            {feedback.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center mb-4 text-xl font-bold ${
                  feedback.type === 'correct' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {feedback.text}
              </motion.div>
            )}

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.answer;
                const showResult = selectedAnswer !== null;
                
                let bgColor = 'bg-purple-100 hover:bg-purple-200 active:bg-purple-300';
                if (showResult) {
                  if (isCorrect) {
                    bgColor = 'bg-green-400';
                  } else if (isSelected && !isCorrect) {
                    bgColor = 'bg-red-400';
                  } else {
                    bgColor = 'bg-gray-200';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null || waitingForNext}
                    className={`${bgColor} rounded-xl p-4 text-2xl font-bold text-purple-900 border-2 border-purple-300 transition-all disabled:cursor-not-allowed disabled:opacity-70`}
                    whileTap={selectedAnswer === null && !waitingForNext ? { scale: 0.95 } : {}}
                    animate={showResult && isCorrect ? { scale: [1, 1.1, 1] } : {}}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Score display */}
        {isPlaying && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border-2 border-purple-300">
            <p className="text-purple-800 font-bold text-lg">
              Score: {score}
            </p>
          </div>
        )}
      </div>
    </GameWrapper>
  );
}

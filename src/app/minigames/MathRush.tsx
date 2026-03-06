/**
 * Math Rush - Solve math equations fast!
 * Equations appear with multiple choice. Timer counts down.
 * Score = number of correct answers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const INITIAL_TIMER = 10; // seconds per question
const MIN_TIMER = 3; // Minimum timer as difficulty increases

interface Question {
  question: string;
  answer: number;
  options: number[];
}

function generateQuestion(level: number): Question {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * Math.min(level / 5 + 1, 3))];
  
  let num1: number, num2: number, answer: number;
  
  if (operation === '+') {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
    answer = num1 + num2;
  } else if (operation === '-') {
    num1 = Math.floor(Math.random() * 30) + 10;
    num2 = Math.floor(Math.random() * num1) + 1;
    answer = num1 - num2;
  } else {
    // Multiplication
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    answer = num1 * num2;
  }
  
  const question = `${num1} ${operation} ${num2} = ?`;
  
  // Generate wrong options
  const options = [answer];
  while (options.length < 4) {
    const wrong = answer + (Math.floor(Math.random() * 20) - 10);
    if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
      options.push(wrong);
    }
  }
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return { question, answer, options };
}

export function MathRush({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const timerIntervalRef = useRef<number>();

  const loadNewQuestion = useCallback(() => {
    const newQuestion = generateQuestion(score);
    setCurrentQuestion(newQuestion);
    setTimer(INITIAL_TIMER);
    setSelectedAnswer(null);
  }, [score]);

  // Start first question
  useEffect(() => {
    if (isPlaying && !isPaused) {
      loadNewQuestion();
    }
  }, [isPlaying, isPaused, loadNewQuestion]);

  // Timer countdown
  useEffect(() => {
    if (!isPlaying || isPaused || !currentQuestion) return;

    timerIntervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev <= 0) {
          // Time's up - game over
          setIsPlaying(false);
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
  }, [isPlaying, isPaused, currentQuestion]);

  const handleAnswer = useCallback((answer: number) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    
    if (answer === currentQuestion.answer) {
      // Correct!
      setScore(prev => prev + 1);
      setTimeout(() => {
        // Timer gets shorter as score increases (difficulty scaling)
        const newTimer = Math.max(MIN_TIMER, INITIAL_TIMER - (score * 0.3));
        setTimer(newTimer);
        loadNewQuestion();
      }, 500);
    } else {
      // Wrong answer - game over
      setTimeout(() => {
        setIsPlaying(false);
      }, 1000);
    }
  }, [currentQuestion, selectedAnswer, score, loadNewQuestion]);

  // End game
  useEffect(() => {
    if (!isPlaying) {
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
        {/* Timer bar */}
        <div className="w-full max-w-md mb-6">
          <div className="h-3 bg-white/30 rounded-full overflow-hidden border-2 border-white/50">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timer / INITIAL_TIMER) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
          <p className="text-center text-white font-bold text-sm mt-2">
            {Math.ceil(timer)}s
          </p>
        </div>

        {/* Question */}
        {currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mb-6 shadow-2xl border-4 border-purple-300 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <p className="text-4xl mb-4">🦎</p>
              <p className="text-3xl font-bold text-purple-800 mb-2">
                {currentQuestion.question.replace('?', '')}
              </p>
              <p className="text-lg text-purple-600">What's the answer?</p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.answer;
                const showResult = selectedAnswer !== null;
                
                let bgColor = 'bg-purple-100 hover:bg-purple-200';
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
                    disabled={selectedAnswer !== null}
                    className={`${bgColor} rounded-xl p-4 text-2xl font-bold text-purple-900 border-2 border-purple-300 transition-all disabled:cursor-not-allowed`}
                    whileTap={selectedAnswer === null ? { scale: 0.95 } : {}}
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border-2 border-purple-300">
          <p className="text-purple-800 font-bold text-lg">
            Correct: {score} {score === 1 ? 'answer' : 'answers'}
          </p>
        </div>
      </div>
    </GameWrapper>
  );
}

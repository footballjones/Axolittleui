import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface MiniGameProps {
  onClose: (score: number) => void;
  gameType: 'bubbles' | 'feeding' | 'cleaning';
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function MiniGame({ onClose, gameType }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onClose(score), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [score, onClose]);

  useEffect(() => {
    if (gameType === 'bubbles' && timeLeft > 0) {
      const interval = setInterval(() => {
        const newBubble: Bubble = {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: 100,
          size: Math.random() * 30 + 40,
        };
        setBubbles(prev => [...prev, newBubble]);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameType, timeLeft]);

  const popBubble = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setScore(prev => prev + 10);
  };

  const renderBubbleGame = () => (
    <div className="relative w-full h-96 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg overflow-hidden">
      {bubbles.map(bubble => (
        <motion.div
          key={bubble.id}
          initial={{ y: '100%', x: `${bubble.x}%` }}
          animate={{ y: '-20%' }}
          transition={{ duration: 4, ease: 'linear' }}
          onAnimationComplete={() => setBubbles(prev => prev.filter(b => b.id !== bubble.id))}
          onClick={() => popBubble(bubble.id)}
          className="absolute cursor-pointer"
          style={{
            width: bubble.size,
            height: bubble.size,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          />
        </motion.div>
      ))}
    </div>
  );

  const renderFeedingGame = () => {
    const foods = ['🦐', '🐛', '🪱', '🦗'];
    return (
      <div className="space-y-4">
        <p className="text-center text-white">Tap the foods your axolotl likes!</p>
        <div className="grid grid-cols-2 gap-4">
          {foods.map((food, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setScore(prev => prev + 15);
                const newFoods = [...foods];
                newFoods[idx] = foods[Math.floor(Math.random() * foods.length)];
              }}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-8 text-6xl hover:bg-white/30 transition-colors"
            >
              {food}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderCleaningGame = () => {
    const [algae, setAlgae] = useState(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 90,
        y: Math.random() * 90,
        cleaned: false,
      }))
    );

    const cleanSpot = (id: number) => {
      setAlgae(prev =>
        prev.map(spot => (spot.id === id ? { ...spot, cleaned: true } : spot))
      );
      setScore(prev => prev + 5);
    };

    return (
      <div className="relative w-full h-96 bg-gradient-to-b from-green-900 to-green-700 rounded-lg overflow-hidden">
        {algae.map(spot =>
          !spot.cleaned ? (
            <motion.div
              key={spot.id}
              onClick={() => cleanSpot(spot.id)}
              whileTap={{ scale: 0.5, opacity: 0 }}
              className="absolute cursor-pointer"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: 30,
                height: 30,
                background: 'rgba(0, 100, 0, 0.6)',
                borderRadius: '50%',
              }}
            />
          ) : null
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white">
            <div className="text-2xl font-bold">Score: {score}</div>
            <div className="text-sm opacity-80">Time: {timeLeft}s</div>
          </div>
          <button
            onClick={() => onClose(score)}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {gameType === 'bubbles' && renderBubbleGame()}
        {gameType === 'feeding' && renderFeedingGame()}
        {gameType === 'cleaning' && renderCleaningGame()}
      </div>
    </div>
  );
}

/**
 * Daily Spin Wheel Component
 * One free spin per day with coin/opal rewards
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { GAME_CONFIG } from '../config/game';
import { canSpinToday, getTodayDateString } from '../utils/dailySystem';

interface SpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: (reward: { type: 'coins' | 'opals'; amount: number }) => void;
  lastSpinDate?: string;
  coins: number;
  opals: number;
}

const WHEEL_SECTIONS = [
  { label: '50 Coins', value: 50, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 3 },
  { label: '100 Coins', value: 100, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 3 },
  { label: '150 Coins', value: 150, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 2 },
  { label: '200 Coins', value: 200, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 2 },
  { label: '250 Coins', value: 250, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 1 },
  { label: '5 Opals', value: 5, type: 'opals' as const, color: 'from-purple-400 to-pink-500', weight: 1 },
  { label: '10 Opals', value: 10, type: 'opals' as const, color: 'from-purple-400 to-pink-500', weight: 1 },
  { label: '300 Coins', value: 300, type: 'coins' as const, color: 'from-amber-400 to-yellow-500', weight: 1 },
];

// Create weighted array for spinning
const WEIGHTED_SECTIONS: Array<{ label: string; value: number; type: 'coins' | 'opals'; color: string }> = [];
WHEEL_SECTIONS.forEach(section => {
  for (let i = 0; i < section.weight; i++) {
    WEIGHTED_SECTIONS.push({
      label: section.label,
      value: section.value,
      type: section.type,
      color: section.color,
    });
  }
});

export function SpinWheel({ isOpen, onClose, onSpin, lastSpinDate, coins, opals }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedReward, setSelectedReward] = useState<{ type: 'coins' | 'opals'; amount: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const canSpin = canSpinToday(lastSpinDate);

  const handleSpin = useCallback(() => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedReward(null);

    // Random reward based on weights
    const randomIndex = Math.floor(Math.random() * WEIGHTED_SECTIONS.length);
    const reward = WEIGHTED_SECTIONS[randomIndex];
    
    // Calculate rotation (multiple full spins + land on selected section)
    const sectionAngle = 360 / WHEEL_SECTIONS.length;
    const targetSection = WHEEL_SECTIONS.findIndex(s => 
      s.value === reward.value && s.type === reward.type
    );
    const targetAngle = targetSection * sectionAngle;
    
    // Spin multiple times (3-5 full rotations) then land on target
    const fullSpins = 3 + Math.random() * 2; // 3-5 spins
    const finalRotation = fullSpins * 360 + (360 - targetAngle);
    
    setRotation(finalRotation);

    // After animation, show result
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedReward({ type: reward.type, amount: reward.value });
      setShowResult(true);
      onSpin({ type: reward.type, amount: reward.value });
    }, 3000); // Match animation duration
  }, [isSpinning, canSpin, onSpin]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #fef9c3 100%)',
                border: '2px solid rgba(168,85,247,0.4)',
                boxShadow: '0 20px 60px rgba(168,85,247,0.3)',
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 rounded-full p-1.5 border border-violet-200/60 bg-white/60 active:bg-white/90"
                >
                  <X className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
                </button>

                <div className="text-center">
                  <div className="text-5xl mb-3">🎰</div>
                  <h2 className="text-2xl font-bold text-violet-800 mb-1">
                    Daily Spin Wheel
                  </h2>
                  <p className="text-sm text-violet-600">
                    {canSpin ? 'Spin to win coins or opals!' : 'Come back tomorrow for another spin!'}
                  </p>
                </div>
              </div>

              {/* Wheel */}
              <div className="px-6 pb-6">
                <div className="relative w-64 h-64 mx-auto mb-6">
                  {/* Wheel container */}
                  <div className="absolute inset-0 rounded-full border-4 border-violet-300 overflow-hidden">
                    <motion.div
                      className="w-full h-full"
                      animate={{ rotate: rotation }}
                      transition={{ 
                        duration: 3, 
                        ease: [0.43, 0.13, 0.23, 0.96], // Ease out cubic
                      }}
                      style={{ transformOrigin: 'center' }}
                    >
                      {/* Wheel sections using conic-gradient */}
                      <div 
                        className="w-full h-full"
                        style={{
                          background: `conic-gradient(
                            ${WHEEL_SECTIONS.map((section, i) => {
                              const start = (360 / WHEEL_SECTIONS.length) * i;
                              const end = (360 / WHEEL_SECTIONS.length) * (i + 1);
                              const isOpal = section.type === 'opals';
                              const color = isOpal ? '#a78bfa' : '#fbbf24';
                              return `${color} ${start}deg ${end}deg`;
                            }).join(', ')}
                          )`,
                        }}
                      />
                      {/* Section labels */}
                      {WHEEL_SECTIONS.map((section, index) => {
                        const sectionAngle = 360 / WHEEL_SECTIONS.length;
                        const rotation = sectionAngle * index + sectionAngle / 2;
                        return (
                          <div
                            key={index}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{
                              transform: `rotate(${rotation}deg) translateY(-80px) rotate(${-rotation}deg)`,
                            }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow-md whitespace-nowrap">
                              {section.label}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>

                    {/* Center pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-violet-600 drop-shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Result display */}
                <AnimatePresence>
                  {showResult && selectedReward && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-violet-300"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">
                          {selectedReward.type === 'opals' ? '🪬' : '🪙'}
                        </div>
                        <p className="text-lg font-bold text-violet-800 mb-1">
                          You won {selectedReward.amount} {selectedReward.type === 'opals' ? 'Opals' : 'Coins'}!
                        </p>
                        <p className="text-xs text-violet-600">
                          {selectedReward.type === 'opals' ? 'Rare reward! 🎉' : 'Nice spin!'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Spin button */}
                <motion.button
                  onClick={handleSpin}
                  disabled={isSpinning || !canSpin}
                  className="w-full py-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: canSpin && !isSpinning
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.9) 0%, rgba(217,70,239,0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(203,213,225,0.9) 0%, rgba(148,163,184,0.9) 100%)',
                  }}
                  whileTap={canSpin && !isSpinning ? { scale: 0.95 } : {}}
                >
                  {isSpinning ? 'Spinning...' : canSpin ? 'Spin Now!' : 'Already Spun Today'}
                </motion.button>

                {!canSpin && (
                  <p className="text-center text-xs text-violet-500 mt-2">
                    Next spin available tomorrow! 🌅
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

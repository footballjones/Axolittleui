import { motion } from 'motion/react';
import { Axolotl, FoodItem } from '../types/game';
import { useEffect, useState } from 'react';

interface AxolotlDisplayProps {
  axolotl: Axolotl;
  foodItems: FoodItem[];
  onEatFood: (foodId: string) => void;
}

export function AxolotlDisplay({ axolotl, foodItems, onEatFood }: AxolotlDisplayProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [facingLeft, setFacingLeft] = useState(false);

  // Check for nearby food and swim to it
  useEffect(() => {
    if (foodItems.length === 0) return;

    const settledFood = foodItems.filter(f => f.y > 10);
    if (settledFood.length === 0) return;

    const closestFood = settledFood.reduce((closest, food) => {
      const distX = food.x - position.x;
      const distY = food.y - position.y;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (!closest.food || distance < closest.distance) {
        return { food, distance };
      }
      return closest;
    }, { food: null as FoodItem | null, distance: Infinity });

    if (closestFood.food) {
      if (closestFood.distance < 10) {
        onEatFood(closestFood.food.id);
        return;
      }
      setFacingLeft(closestFood.food.x < position.x);
      setPosition({ x: closestFood.food.x, y: closestFood.food.y });
    }
  }, [foodItems, position.x, position.y, onEatFood]);

  // Random swimming
  useEffect(() => {
    if (foodItems.length > 0) return;

    const swimInterval = setInterval(() => {
      const newX = Math.random() * 85 + 5;
      const newY = Math.random() * 85 + 5;
      setFacingLeft(newX < position.x);
      setPosition({ x: newX, y: newY });
    }, 4000 + Math.random() * 2000);

    return () => clearInterval(swimInterval);
  }, [foodItems.length, position.x]);

  const getSize = () => {
    switch (axolotl.stage) {
      case 'baby':
        return 96;
      case 'juvenile':
        return 132;
      case 'adult':
        return 168;
      case 'elder':
        return 186;
      default:
        return 96;
    }
  };

  const size = getSize();

  return (
    <motion.div
      className="absolute"
      animate={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      transition={{
        duration: 6,
        ease: [0.2, 0.8, 0.4, 1],
      }}
      style={{
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      {/* Gentle bob animation */}
      <motion.div
        animate={{
          y: [0, -6, 0, 4, 0],
          rotate: [0, -2, 0, 2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        {/* Outer soft ambient glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 1.6,
              height: size * 1.3,
              background: 'radial-gradient(ellipse at center, rgba(120,180,255,0.3) 0%, rgba(180,100,255,0.15) 35%, transparent 65%)',
              borderRadius: '50%',
              filter: 'blur(25px)',
            }}
          />
        </motion.div>

        {/* Inner pulsing glow aura */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.45, 0.7, 0.45],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 0.9,
              height: size * 0.7,
              background: 'radial-gradient(ellipse at center, rgba(200,160,255,0.55) 0%, rgba(100,200,255,0.35) 40%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(16px)',
            }}
          />
        </motion.div>

        {/* Tight highlight glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 0.5,
              height: size * 0.4,
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(200,180,255,0.2) 50%, transparent 80%)',
              borderRadius: '50%',
              filter: 'blur(10px)',
            }}
          />
        </motion.div>

        {/* Realistic SVG Axolotl */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          style={{
            transform: facingLeft ? 'scaleX(1)' : 'scaleX(-1)',
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
          }}
        >
          <defs>
            {/* Gradient for body */}
            <linearGradient id={`bodyGrad-${axolotl.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={axolotl.color || '#FFB5E8'} stopOpacity="1" />
              <stop offset="50%" stopColor={axolotl.color || '#FFB5E8'} stopOpacity="0.95" />
              <stop offset="100%" stopColor={axolotl.color || '#E8A5D5'} stopOpacity="0.9" />
            </linearGradient>
            {/* Shine/highlight */}
            <linearGradient id={`shine-${axolotl.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Main body - more realistic shape */}
          <path
            d="M 60 140 Q 50 130 45 120 Q 40 110 45 100 Q 50 90 60 85 Q 70 80 85 75 Q 100 70 115 75 Q 130 80 140 85 Q 150 90 155 100 Q 160 110 155 120 Q 150 130 140 140 Q 130 150 120 155 Q 110 160 100 160 Q 90 160 80 155 Q 70 150 60 140 Z"
            fill={`url(#bodyGrad-${axolotl.id})`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          
          {/* Head - more defined */}
          <ellipse
            cx="100"
            cy="75"
            rx="45"
            ry="40"
            fill={`url(#bodyGrad-${axolotl.id})`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          
          {/* External gills - left side (more realistic feathery appearance) */}
          <g opacity="0.85">
            {/* Front gill */}
            <g>
              <path
                d="M 50 80 Q 40 75 35 80 Q 30 85 35 90 Q 40 95 45 95 Q 50 90 50 80"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="38" cy="85" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
            {/* Middle gill */}
            <g>
              <path
                d="M 48 95 Q 38 90 33 95 Q 28 100 33 105 Q 38 110 43 110 Q 48 105 48 95"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="36" cy="100" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
            {/* Back gill */}
            <g>
              <path
                d="M 50 110 Q 40 105 35 110 Q 30 115 35 120 Q 40 125 45 125 Q 50 120 50 110"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="38" cy="115" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
          </g>
          
          {/* External gills - right side */}
          <g opacity="0.85">
            <g>
              <path
                d="M 150 80 Q 160 75 165 80 Q 170 85 165 90 Q 160 95 155 95 Q 150 90 150 80"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="162" cy="85" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
            <g>
              <path
                d="M 152 95 Q 162 90 167 95 Q 172 100 167 105 Q 162 110 157 110 Q 152 105 152 95"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="164" cy="100" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
            <g>
              <path
                d="M 150 110 Q 160 105 165 110 Q 170 115 165 120 Q 160 125 155 125 Q 150 120 150 110"
                fill="rgba(255,180,180,0.7)"
                stroke="rgba(255,200,200,0.5)"
                strokeWidth="1"
              />
              <ellipse cx="162" cy="115" rx="6" ry="12" fill="rgba(255,160,160,0.6)" />
            </g>
          </g>
          
          {/* Eyes - more realistic with highlights */}
          <g>
            {/* Left eye */}
            <circle cx="85" cy="72" r="11" fill="white" />
            <circle cx="85" cy="72" r="9" fill="rgba(200,230,255,0.3)" />
            <circle cx="87" cy="74" r="5.5" fill="black" />
            <circle cx="88.5" cy="75.5" r="2" fill="white" />
            {/* Right eye */}
            <circle cx="115" cy="72" r="11" fill="white" />
            <circle cx="115" cy="72" r="9" fill="rgba(200,230,255,0.3)" />
            <circle cx="117" cy="74" r="5.5" fill="black" />
            <circle cx="118.5" cy="75.5" r="2" fill="white" />
          </g>
          
          {/* Mouth - more defined */}
          <path
            d="M 88 90 Q 100 95 112 90"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Tail - more realistic shape */}
          <ellipse
            cx="100"
            cy="165"
            rx="32"
            ry="22"
            fill={`url(#bodyGrad-${axolotl.id})`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 68 155 Q 65 160 68 165 Q 71 170 75 168 Q 80 165 85 165"
            fill={`url(#bodyGrad-${axolotl.id})`}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
          <path
            d="M 132 155 Q 135 160 132 165 Q 129 170 125 168 Q 120 165 115 165"
            fill={`url(#bodyGrad-${axolotl.id})`}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
          
          {/* Body shine/highlight */}
          <ellipse
            cx="95"
            cy="100"
            rx="35"
            ry="45"
            fill={`url(#shine-${axolotl.id})`}
            opacity="0.6"
          />
          
          {/* Pattern overlay (if spotted/striped) */}
          {axolotl.pattern === 'spotted' && (
            <>
              <circle cx="95" cy="95" r="6" fill="rgba(255,255,255,0.5)" />
              <circle cx="110" cy="110" r="5" fill="rgba(255,255,255,0.5)" />
              <circle cx="85" cy="120" r="5.5" fill="rgba(255,255,255,0.5)" />
              <circle cx="105" cy="130" r="4" fill="rgba(255,255,255,0.4)" />
              <circle cx="90" cy="105" r="4.5" fill="rgba(255,255,255,0.45)" />
            </>
          )}
          {axolotl.pattern === 'striped' && (
            <>
              <line x1="65" y1="85" x2="65" y2="145" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="100" y1="80" x2="100" y2="150" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="135" y1="85" x2="135" y2="145" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </motion.div>
    </motion.div>
  );
}
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

        {/* SVG Axolotl */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          style={{
            transform: facingLeft ? 'scaleX(1)' : 'scaleX(-1)',
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
          }}
        >
          {/* Body */}
          <ellipse
            cx="100"
            cy="120"
            rx="60"
            ry="50"
            fill={axolotl.color || '#FFB5E8'}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          
          {/* Head */}
          <ellipse
            cx="100"
            cy="80"
            rx="50"
            ry="45"
            fill={axolotl.color || '#FFB5E8'}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          
          {/* Gills (left side) */}
          <g>
            <ellipse cx="50" cy="85" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
            <ellipse cx="45" cy="95" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
            <ellipse cx="50" cy="105" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
          </g>
          
          {/* Gills (right side) */}
          <g>
            <ellipse cx="150" cy="85" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
            <ellipse cx="155" cy="95" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
            <ellipse cx="150" cy="105" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
          </g>
          
          {/* Eyes */}
          <circle cx="85" cy="75" r="12" fill="white" />
          <circle cx="115" cy="75" r="12" fill="white" />
          <circle cx="88" cy="78" r="6" fill="black" />
          <circle cx="118" cy="78" r="6" fill="black" />
          
          {/* Smile */}
          <path
            d="M 85 95 Q 100 105 115 95"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Tail */}
          <ellipse
            cx="100"
            cy="165"
            rx="35"
            ry="25"
            fill={axolotl.color || '#FFB5E8'}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          
          {/* Pattern overlay (if spotted/striped) */}
          {axolotl.pattern === 'spotted' && (
            <>
              <circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.4)" />
              <circle cx="120" cy="130" r="6" fill="rgba(255,255,255,0.4)" />
              <circle cx="80" cy="140" r="7" fill="rgba(255,255,255,0.4)" />
            </>
          )}
          {axolotl.pattern === 'striped' && (
            <>
              <line x1="70" y1="90" x2="70" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <line x1="100" y1="85" x2="100" y2="155" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <line x1="130" y1="90" x2="130" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            </>
          )}
        </svg>
      </motion.div>
    </motion.div>
  );
}
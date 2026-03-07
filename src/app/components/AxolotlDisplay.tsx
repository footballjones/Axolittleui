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

        {/* Axolotl image with white background removal using CSS blend mode */}
        <img
          src="/axolotl.png"
          alt="Axolotl"
          width={size}
          height={size}
          style={{
            transform: facingLeft ? 'scaleX(1)' : 'scaleX(-1)',
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25)) brightness(1.1)',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
          }}
        />
      </motion.div>
    </motion.div>
  );
}
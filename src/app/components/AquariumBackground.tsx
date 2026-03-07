import { motion } from 'motion/react';
import { getDecorationById } from '../data/decorations';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
}

export function AquariumBackground({ background, decorations }: AquariumBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base aquarium gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #0ea5e9 0%,
              #0284c7 15%,
              #0369a1 30%,
              #075985 50%,
              #0c4a6e 70%,
              #082f49 100%
            )
          `,
        }}
      />
      
      {/* Sand/gravel bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: `
            linear-gradient(180deg,
              transparent 0%,
              rgba(180, 160, 120, 0.3) 20%,
              rgba(160, 140, 100, 0.5) 40%,
              rgba(140, 120, 80, 0.7) 60%,
              rgba(120, 100, 60, 0.9) 100%
            )
          `,
        }}
      />
      
      {/* Underwater plants/rocks silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${i * 12.5}%`,
              width: '15%',
              height: `${30 + Math.random() * 40}%`,
              background: `linear-gradient(180deg, transparent, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.6))`,
              clipPath: `polygon(${20 + Math.random() * 20}% 0%, ${80 + Math.random() * 20}% 0%, 100% 100%, 0% 100%)`,
            }}
          />
        ))}
      </div>

      {/* Color tint overlay from customization */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background }}
      />

      {/* Deep water gradient overlay — adds depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              rgba(0, 40, 80, 0.45) 0%,
              rgba(0, 60, 90, 0.15) 15%,
              rgba(0, 80, 100, 0.05) 40%,
              rgba(0, 60, 80, 0.1) 70%,
              rgba(0, 30, 50, 0.35) 100%
            )
          `,
        }}
      />

      {/* Surface caustic light — top shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `
            radial-gradient(ellipse 120% 30% at 30% 0%, rgba(180, 230, 255, 0.35), transparent),
            radial-gradient(ellipse 80% 25% at 70% 0%, rgba(200, 240, 255, 0.25), transparent)
          `,
        }}
      />

      {/* Animated light rays */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.08, 0.18, 0.08],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {[
          { left: '15%', width: '3%', rotation: -8, delay: 0 },
          { left: '30%', width: '4%', rotation: -4, delay: 1.5 },
          { left: '50%', width: '5%', rotation: 2, delay: 0.5 },
          { left: '70%', width: '3%', rotation: 6, delay: 2 },
          { left: '85%', width: '4%', rotation: 10, delay: 1 },
        ].map((ray, i) => (
          <motion.div
            key={i}
            className="absolute top-0 h-[70%]"
            style={{
              left: ray.left,
              width: ray.width,
              background: `linear-gradient(180deg, rgba(200, 240, 255, 0.4) 0%, rgba(150, 220, 255, 0.15) 40%, transparent 100%)`,
              transform: `rotate(${ray.rotation}deg)`,
              transformOrigin: 'top center',
              filter: 'blur(8px)',
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scaleX: [1, 1.3, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              delay: ray.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Underwater caustic patterns */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 30%, rgba(150, 230, 255, 1) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 50%, rgba(100, 200, 255, 1) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 20%, rgba(180, 240, 255, 1) 0%, transparent 45%)
          `,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Floating particles / debris */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 1.5 + Math.random() * 2,
            height: 1.5 + Math.random() * 2,
            left: `${8 + Math.random() * 84}%`,
            top: `${10 + Math.random() * 70}%`,
            background: `rgba(200, 230, 255, ${0.2 + Math.random() * 0.3})`,
          }}
          animate={{
            y: [0, -(15 + Math.random() * 25), 0],
            x: [0, (Math.random() - 0.5) * 12, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 5 + Math.random() * 6,
            delay: Math.random() * 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Animated Kelp/Seaweed in background */}
      {Array.from({ length: 12 }).map((_, i) => {
        const leftPos = 5 + (i * 7.5) + Math.random() * 3;
        const height = 25 + Math.random() * 35;
        const swayDelay = Math.random() * 2;
        const swayAmount = 3 + Math.random() * 5;
        return (
          <motion.div
            key={`kelp-${i}`}
            className="absolute bottom-0 pointer-events-none"
            style={{
              left: `${leftPos}%`,
              width: '4%',
              height: `${height}%`,
              background: `linear-gradient(180deg, 
                transparent 0%,
                rgba(34, 197, 94, 0.15) 10%,
                rgba(22, 163, 74, 0.35) 30%,
                rgba(21, 128, 61, 0.5) 60%,
                rgba(20, 83, 45, 0.6) 100%
              )`,
              clipPath: `polygon(
                ${30 + Math.random() * 20}% 0%,
                ${70 + Math.random() * 20}% 0%,
                ${60 + Math.random() * 15}% 25%,
                ${40 + Math.random() * 15}% 50%,
                ${55 + Math.random() * 15}% 75%,
                ${45 + Math.random() * 15}% 100%,
                50% 100%
              )`,
              filter: 'blur(0.5px)',
              zIndex: 1,
            }}
            animate={{
              x: [0, swayAmount, -swayAmount, 0],
              rotate: [0, 1.5, -1.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              delay: swayDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* More detailed kelp fronds */}
      {Array.from({ length: 8 }).map((_, i) => {
        const leftPos = 8 + (i * 10) + Math.random() * 4;
        return (
          <motion.div
            key={`kelp-frond-${i}`}
            className="absolute bottom-0 pointer-events-none"
            style={{
              left: `${leftPos}%`,
              width: '3%',
              height: `${20 + Math.random() * 25}%`,
              background: `linear-gradient(180deg, 
                transparent 0%,
                rgba(34, 197, 94, 0.2) 20%,
                rgba(22, 163, 74, 0.4) 50%,
                rgba(21, 128, 61, 0.55) 100%
              )`,
              clipPath: `polygon(
                ${40 + Math.random() * 20}% 0%,
                ${60 + Math.random() * 20}% 0%,
                ${50 + Math.random() * 10}% 100%,
                50% 100%
              )`,
              filter: 'blur(0.3px)',
              zIndex: 1,
            }}
            animate={{
              x: [0, 2 + Math.random() * 3, -(2 + Math.random() * 3), 0],
              rotate: [0, 0.8, -0.8, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Enhanced Bubbles - many more with varied sizes */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 2 + Math.random() * 8;
        const startX = 5 + Math.random() * 90;
        const startDelay = Math.random() * 8;
        return (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              left: `${startX}%`,
              bottom: `${5 + Math.random() * 15}%`,
              background: `radial-gradient(circle at 30% 30%, 
                rgba(240, 250, 255, 0.8), 
                rgba(200, 235, 255, 0.5),
                rgba(150, 210, 240, 0.2)
              )`,
              border: '0.5px solid rgba(220, 245, 255, 0.4)',
              boxShadow: '0 0 2px rgba(200, 235, 255, 0.3)',
            }}
            animate={{
              y: [0, -(250 + Math.random() * 300)],
              x: [0, (Math.random() - 0.5) * 40],
              opacity: [0, 0.8, 0.7, 0.4, 0],
              scale: [0.3, 0.8, 1, 1.2, 0.9],
            }}
            transition={{
              duration: 8 + Math.random() * 7,
              delay: startDelay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Small bubble clusters */}
      {Array.from({ length: 15 }).map((_, i) => {
        const size = 1 + Math.random() * 3;
        const startX = 3 + Math.random() * 94;
        const startDelay = Math.random() * 6;
        return (
          <motion.div
            key={`small-bubble-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              left: `${startX}%`,
              bottom: `${8 + Math.random() * 20}%`,
              background: `radial-gradient(circle at 35% 35%, 
                rgba(230, 245, 255, 0.7), 
                rgba(180, 220, 250, 0.3)
              )`,
              border: '0.3px solid rgba(200, 235, 255, 0.5)',
            }}
            animate={{
              y: [0, -(180 + Math.random() * 220)],
              x: [0, (Math.random() - 0.5) * 25],
              opacity: [0, 0.6, 0.5, 0],
              scale: [0.4, 0.9, 1, 0.7],
            }}
            transition={{
              duration: 6 + Math.random() * 5,
              delay: startDelay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Vignette effect for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 60px rgba(0, 20, 40, 0.4), inset 0 0 120px rgba(0, 15, 30, 0.2)',
        }}
      />

      {/* Decorations (emoji items from shop) */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 flex items-end justify-around px-4 pb-4 z-[2]">
        {decorations.map((decorationId, index) => {
          const decoration = getDecorationById(decorationId);
          if (!decoration || decoration.type === 'background') return null;

          return (
            <motion.div
              key={`${decorationId}-${index}`}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="text-3xl drop-shadow-lg cursor-pointer"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              {decoration.emoji}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
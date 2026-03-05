import { motion } from 'motion/react';
import { getDecorationById } from '../data/decorations';
import aquariumBg from 'figma:asset/28993c923e2a6347bf6180810dc490c083008f08.png';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
}

export function AquariumBackground({ background, decorations }: AquariumBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base photo background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${aquariumBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />

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

      {/* Bubbles */}
      {Array.from({ length: 6 }).map((_, i) => {
        const size = 3 + Math.random() * 5;
        return (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              left: `${15 + Math.random() * 70}%`,
              bottom: '5%',
              background: `radial-gradient(circle at 35% 35%, rgba(220, 245, 255, 0.6), rgba(150, 210, 240, 0.15))`,
              border: '0.5px solid rgba(200, 235, 255, 0.3)',
            }}
            animate={{
              y: [0, -(200 + Math.random() * 200)],
              x: [0, (Math.random() - 0.5) * 30],
              opacity: [0, 0.7, 0.5, 0],
              scale: [0.5, 1, 1.1, 0.8],
            }}
            transition={{
              duration: 6 + Math.random() * 5,
              delay: i * 1.5 + Math.random() * 3,
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
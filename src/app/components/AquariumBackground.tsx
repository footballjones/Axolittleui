import { motion, AnimatePresence } from 'motion/react';
import { getDecorationById } from '../data/decorations';
import { PoopItem } from '../types/game';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
  poops?: PoopItem[];
  isCleaning?: boolean;
  onPoopClick?: (poopId: string) => void;
}

export function AquariumBackground({ 
  background, 
  decorations, 
  poops = [],
  isCleaning = false,
  onPoopClick 
}: AquariumBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base aquarium background image */}
      <img
        src="/aquarium-bg.png"
        alt="Aquarium background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />
      
      {/* Color tint overlay from customization */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background, zIndex: 1 }}
      />

      {/* Poops */}
      <div className="absolute inset-0 z-[3]">
        {poops.map(poop => (
          <motion.button
            key={poop.id}
            onClick={() => onPoopClick?.(poop.id)}
            className="absolute cursor-pointer touch-manipulation"
            style={{
              left: `${poop.x}%`,
              top: `${poop.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="text-3xl drop-shadow-lg">
              💩
            </div>
          </motion.button>
        ))}
      </div>

      {/* Cleaning mode - hand and prompt */}
      <AnimatePresence>
        {isCleaning && (
          <motion.div
            className="absolute inset-0 z-[4] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Hand pointer */}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ 
                y: [0, -10, 0],
                opacity: 1,
              }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ 
                y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.3 }
              }}
            >
              <div className="text-6xl drop-shadow-2xl">👆</div>
            </motion.div>

            {/* Prompt text */}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 translate-y-16"
              initial={{ y: -10, opacity: 0 }}
              animate={{ 
                y: 0,
                opacity: 1,
              }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-3 border-2 border-white/30 shadow-2xl">
                <p className="text-white text-sm font-bold text-center whitespace-nowrap">
                  Click on the poops to clean them! 💩
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
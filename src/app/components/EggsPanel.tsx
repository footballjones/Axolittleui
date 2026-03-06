import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, Lock } from 'lucide-react';
import { Egg } from '../types/game';
import { isEggReady } from '../utils/eggs';
import { GAME_CONFIG } from '../config/game';
import { EggHatchModal } from './EggHatchModal';

interface DisplayEgg {
  id: string;
  name: string;
  color: string;
  generation: number;
  parentName: string;
  hatchesIn: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  rarityColor: string;
  rarityBorder: string;
  rarityText: string;
  glowColor: string;
  egg: Egg; // Reference to actual egg
}

// Row 1 (indices 0-2): eggs fill these, rest empty
// Row 2 (indices 3-5): all empty/unlocked
// Rows 3-6 (indices 6-17): all locked
const UNLOCKED_SLOTS = 6;
const TOTAL_SLOTS = 18;

function formatTimeRemaining(incubationEndsAt: number): string {
  const now = Date.now();
  const remaining = incubationEndsAt - now;
  
  if (remaining <= 0) return 'Ready!';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getRarityStyle(rarity: 'Common' | 'Rare' | 'Legendary') {
  switch (rarity) {
    case 'Legendary':
      return {
        rarityColor: 'rgba(245,158,11,0.2)',
        rarityBorder: 'rgba(245,158,11,0.5)',
        rarityText: 'text-amber-600',
        glowColor: 'rgba(251,191,36,0.65)',
        emoji: '✨',
      };
    case 'Rare':
      return {
        rarityColor: 'rgba(168,85,247,0.18)',
        rarityBorder: 'rgba(168,85,247,0.45)',
        rarityText: 'text-violet-600',
        glowColor: 'rgba(192,132,252,0.55)',
        emoji: '🥚',
      };
    default:
      return {
        rarityColor: 'rgba(56,189,248,0.15)',
        rarityBorder: 'rgba(56,189,248,0.38)',
        rarityText: 'text-sky-600',
        glowColor: 'rgba(103,232,249,0.5)',
        emoji: '🫧',
      };
  }
}

interface Props {
  onClose: () => void;
  incubatorEgg: Egg | null;
  nurseryEggs: Egg[];
  onHatch?: (eggId: string, name: string) => void;
  onBoost?: (eggId: string) => void;
  onGift?: (eggId: string) => void;
  onDiscard?: (eggId: string) => void;
  opals?: number;
}

export function EggsPanel({ 
  onClose, 
  incubatorEgg, 
  nurseryEggs,
  onHatch,
  onBoost,
  onGift,
  onDiscard,
  opals = 0,
}: Props) {
  const [selectedEgg, setSelectedEgg] = useState<DisplayEgg | null>(null);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState(false);
  const [eggToHatch, setEggToHatch] = useState<Egg | null>(null);

  // Convert real eggs to display format
  const displayEggs = useMemo(() => {
    const allEggs: DisplayEgg[] = [];
    
    // Add incubator egg first if present
    if (incubatorEgg) {
      const style = getRarityStyle(incubatorEgg.rarity);
      allEggs.push({
        id: incubatorEgg.id,
        name: `${incubatorEgg.rarity} Egg`,
        color: incubatorEgg.color,
        generation: incubatorEgg.generation,
        parentName: `Gen ${incubatorEgg.generation - 1}`,
        hatchesIn: formatTimeRemaining(incubatorEgg.incubationEndsAt),
        emoji: style.emoji,
        rarity: incubatorEgg.rarity,
        ...style,
        egg: incubatorEgg,
      });
    }
    
    // Add nursery eggs
    nurseryEggs.forEach(egg => {
      const style = getRarityStyle(egg.rarity);
      allEggs.push({
        id: egg.id,
        name: `${egg.rarity} Egg`,
        color: egg.color,
        generation: egg.generation,
        parentName: `Gen ${egg.generation - 1}`,
        hatchesIn: formatTimeRemaining(egg.incubationEndsAt),
        emoji: style.emoji,
        rarity: egg.rarity,
        ...style,
        egg,
      });
    });
    
    return allEggs;
  }, [incubatorEgg, nurseryEggs]);

  const handleUnlockSlot = () => {
    setShowUnlockToast(true);
    setTimeout(() => setShowUnlockToast(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
    >
      {/* Decorative orbs */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-6 w-44 h-44 rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center px-5 pt-5 pb-3 flex-shrink-0 gap-3">
        <motion.button
          onClick={onClose}
          className="rounded-full p-1.5 border border-violet-200/60 bg-white/50 active:bg-white/80 flex-shrink-0"
          whileTap={{ scale: 0.85 }}
        >
          <ChevronDown className="w-4 h-4 text-violet-400 rotate-90" strokeWidth={2.5} />
        </motion.button>
        <div className="flex-1">
          <h3 className="text-violet-800 font-bold text-base">Egg Incubator</h3>
          <p className="text-[10px] text-violet-500/80 font-medium">
            {displayEggs.length}/{UNLOCKED_SLOTS} slots · {displayEggs.filter(e => e.hatchesIn === 'Ready!').length} ready
          </p>
        </div>
      </div>

      <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.3),transparent)' }} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

        {/* Incubator housing */}
        <div
          className="relative rounded-3xl overflow-hidden p-4"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(245,240,255,0.78) 50%, rgba(254,243,199,0.65) 100%)',
            border: '1.5px solid rgba(216,180,254,0.5)',
            boxShadow: '0 8px 32px -4px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Incubator top label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.25))' }} />
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-violet-400/80">Incubator Slots</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(168,85,247,0.25),transparent)' }} />
          </div>

          {/* Warm glow underlay */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.08) 0%, transparent 65%)' }} />

          {/* Egg slots grid — all 18 slots */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
              // Rows 3–6 are locked
              if (i >= UNLOCKED_SLOTS) {
                return <LockedSlot key={i} onUnlock={handleUnlockSlot} />;
              }
              // Rows 1–2 are unlocked; fill with eggs where available
              const displayEgg = displayEggs[i] ?? null;
              return (
                <EggSlot
                  key={i}
                  slotIndex={i}
                  egg={displayEgg}
                  onSelect={() => displayEgg && setSelectedEgg(displayEgg)}
                />
              );
            })}
          </div>
        </div>

        {/* Collapsible tip section */}
        <motion.div
          className="rounded-2xl mt-3 overflow-hidden"
          style={{ background: 'rgba(233,213,255,0.4)', border: '1px solid rgba(216,180,254,0.4)' }}
        >
          <button
            className="flex items-center gap-2 w-full px-4 py-2.5 active:bg-violet-100/40"
            onClick={() => setTipOpen(o => !o)}
          >
            <span className="text-base flex-shrink-0">💡</span>
            <span className="flex-1 text-left text-[11px] font-bold text-violet-700/80">Incubator Tips</span>
            <motion.div animate={{ rotate: tipOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
              <ChevronDown className="w-3.5 h-3.5 text-violet-400" strokeWidth={2.5} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {tipOpen && (
              <motion.div
                key="tip-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p className="text-[11px] text-violet-700/80 leading-snug px-4 pb-3">
                  Tap an egg to see its details. Eggs are collected by "hatching together" with friends in Social — each inherits traits from both parents — or through Rebirth, where your axolotl retires and leaves behind a new egg.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Egg detail sub-panel */}
      <AnimatePresence>
        {selectedEgg && (
          <>
            {/* Dimmed backdrop inside panel */}
            <motion.div
              className="absolute inset-0 rounded-3xl z-20"
              style={{ background: 'rgba(88,28,135,0.18)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEgg(null)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-0 left-0 right-0 rounded-b-3xl rounded-t-2xl overflow-hidden flex flex-col z-30"
              style={{
                background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #fef9c3 100%)',
                border: '1.5px solid rgba(216,180,254,0.6)',
                borderBottom: 'none',
                boxShadow: '0 -12px 40px -8px rgba(168,85,247,0.2)',
                maxHeight: '72%',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag pill */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(168,85,247,0.3)' }} />
              </div>

              {/* Close */}
              <motion.button
                className="absolute top-3 right-4 rounded-full p-1.5 border border-violet-200/60 bg-white/60 active:bg-white/90"
                whileTap={{ scale: 0.85 }}
                onClick={() => setSelectedEgg(null)}
              >
                <X className="w-3.5 h-3.5 text-violet-400" strokeWidth={2.5} />
              </motion.button>

              <div className="overflow-y-auto overscroll-contain px-4 pb-5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                {/* Egg hero */}
                <div className="flex flex-col items-center pt-1 pb-4">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-lg"
                    style={{
                      background: selectedEgg.rarityColor,
                      border: `2px solid ${selectedEgg.rarityBorder}`,
                      boxShadow: `0 0 28px 6px ${selectedEgg.glowColor}`,
                    }}
                    animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                  >
                    {selectedEgg.emoji}
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-black text-base">{selectedEgg.name}</p>
                    <span
                      className={`text-[9px] font-black ${selectedEgg.rarityText} px-2 py-0.5 rounded-full`}
                      style={{ background: selectedEgg.rarityColor, border: `1px solid ${selectedEgg.rarityBorder}` }}
                    >
                      {selectedEgg.rarity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gen {selectedEgg.generation} · From <span className="font-semibold text-slate-500">{selectedEgg.parentName}</span>
                  </p>

                  {/* Timer */}
                  <div
                    className="flex items-center gap-2 mt-2.5 px-4 py-2 rounded-full"
                    style={{
                      background: selectedEgg.hatchesIn === 'Ready!'
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(241,245,249,0.9)',
                      border: selectedEgg.hatchesIn === 'Ready!'
                        ? '1px solid rgba(34,197,94,0.35)'
                        : '1px solid rgba(203,213,225,0.5)',
                    }}
                  >
                    <span className="text-sm">{selectedEgg.hatchesIn === 'Ready!' ? '✅' : '⏳'}</span>
                    <span className={`text-[12px] font-bold ${selectedEgg.hatchesIn === 'Ready!' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selectedEgg.hatchesIn === 'Ready!' ? 'Ready to hatch!' : `Hatches in ${selectedEgg.hatchesIn}`}
                    </span>
                  </div>
                </div>

                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.25),transparent)' }} />

                {/* Action tiles grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Hatch / Watch */}
                  <motion.button
                    onClick={() => {
                      if (selectedEgg.hatchesIn === 'Ready!' && onHatch) {
                        setEggToHatch(selectedEgg.egg);
                        setShowHatchModal(true);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={
                      selectedEgg.hatchesIn === 'Ready!'
                        ? { background: 'linear-gradient(135deg, rgba(134,239,172,0.75) 0%, rgba(74,222,128,0.6) 100%)', border: '1px solid rgba(34,197,94,0.4)' }
                        : { background: 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)', border: '1px solid rgba(148,163,184,0.35)' }
                    }
                    whileTap={{ scale: 0.92 }}
                    disabled={selectedEgg.hatchesIn !== 'Ready!'}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">{selectedEgg.hatchesIn === 'Ready!' ? '🐣' : '👀'}</span>
                    <span className={`text-[10px] font-black tracking-wider uppercase ${selectedEgg.hatchesIn === 'Ready!' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {selectedEgg.hatchesIn === 'Ready!' ? 'Hatch Now' : 'Watch'}
                    </span>
                    {selectedEgg.hatchesIn !== 'Ready!' && (
                      <span className="text-[9px] text-slate-400">{selectedEgg.hatchesIn}</span>
                    )}
                  </motion.button>

                  {/* Boost */}
                  <motion.button
                    onClick={() => {
                      const boostCost = GAME_CONFIG.eggBoostCost;
                      if (onBoost && opals >= boostCost) {
                        onBoost(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ 
                      background: opals >= GAME_CONFIG.eggBoostCost
                        ? 'linear-gradient(135deg, rgba(216,180,254,0.75) 0%, rgba(192,132,252,0.6) 100%)' 
                        : 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)',
                      border: opals >= GAME_CONFIG.eggBoostCost
                        ? '1px solid rgba(168,85,247,0.4)' 
                        : '1px solid rgba(148,163,184,0.35)',
                    }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onBoost || opals < GAME_CONFIG.eggBoostCost}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">⚡</span>
                    <span className={`text-[10px] font-black tracking-wider uppercase ${opals >= GAME_CONFIG.eggBoostCost ? 'text-violet-700' : 'text-slate-500'}`}>Boost</span>
                    <span className={`text-[9px] ${opals >= GAME_CONFIG.eggBoostCost ? 'text-violet-500' : 'text-slate-400'}`}>{GAME_CONFIG.eggBoostCost} 🪬 opals</span>
                  </motion.button>

                  {/* Gift */}
                  <motion.button
                    onClick={() => {
                      if (onGift) {
                        onGift(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(251,207,232,0.75) 0%, rgba(249,168,212,0.6) 100%)', border: '1px solid rgba(244,114,182,0.35)' }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onGift}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">🎁</span>
                    <span className="text-[10px] font-black tracking-wider uppercase text-pink-700">Gift</span>
                    <span className="text-[9px] text-pink-400">Send to friend</span>
                  </motion.button>

                  {/* Discard */}
                  <motion.button
                    onClick={() => {
                      if (onDiscard) {
                        onDiscard(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(254,202,202,0.65) 0%, rgba(252,165,165,0.5) 100%)', border: '1px solid rgba(248,113,113,0.3)' }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onDiscard}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">🗑️</span>
                    <span className="text-[10px] font-black tracking-wider uppercase text-red-500">Discard</span>
                    <span className="text-[9px] text-red-300">Cannot undo</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unlock toast */}
      <AnimatePresence>
        {showUnlockToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-full z-40"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(217,70,239,0.9))', boxShadow: '0 4px 20px rgba(168,85,247,0.35)' }}
          >
            <span className="text-white text-[11px] font-bold">Not enough opals! 🪬</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hatch name modal */}
      <EggHatchModal
        isOpen={showHatchModal}
        onClose={() => {
          setShowHatchModal(false);
          setEggToHatch(null);
        }}
        onConfirm={(name) => {
          if (eggToHatch && onHatch) {
            onHatch(eggToHatch.id, name);
            setSelectedEgg(null);
          }
        }}
        eggRarity={eggToHatch?.rarity}
      />
    </motion.div>
  );
}

/* ── Individual egg slot ── */
function EggSlot({ slotIndex, egg, onSelect }: { slotIndex: number; egg: DisplayEgg | null; onSelect: () => void }) {
  const isReady = egg?.hatchesIn === 'Ready!';

  if (!egg) {
    return (
      <div
        className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 opacity-40"
        style={{
          background: 'rgba(255,255,255,0.35)',
          border: '1.5px dashed rgba(168,85,247,0.25)',
        }}
      >
        <span className="text-[1.4rem] grayscale opacity-50">🥚</span>
        <span className="text-[8px] text-violet-400/60 font-bold tracking-wider uppercase">Empty</span>
      </div>
    );
  }

  return (
    <motion.button
      className="relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 80%, ${egg.rarityColor} 0%, rgba(255,255,255,0.55) 100%)`,
        border: `1.5px solid ${egg.rarityBorder}`,
        boxShadow: isReady
          ? `0 0 16px 4px ${egg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`
          : `0 2px 12px -2px ${egg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`,
      }}
      whileTap={{ scale: 0.91 }}
      onClick={onSelect}
    >
      {/* Slot gloss */}
      <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }} />

      {/* Ready shimmer */}
      {isReady && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `linear-gradient(135deg, transparent 0%, ${egg.glowColor} 50%, transparent 100%)`, opacity: 0.4 }}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Egg */}
      <motion.span
        className="text-[2rem] leading-none relative z-10 drop-shadow-sm"
        animate={
          isReady
            ? { scale: [1, 1.1, 1], rotate: [0, -6, 6, -4, 4, 0] }
            : { rotate: [0, -3, 3, -2, 2, 0] }
        }
        transition={{
          duration: isReady ? 2 : 3.8,
          repeat: Infinity,
          repeatDelay: isReady ? 0.6 : 2 + slotIndex * 0.7,
          ease: 'easeInOut',
        }}
      >
        {egg.emoji}
      </motion.span>

      {/* Rarity label */}
      <span
        className={`text-[7.5px] font-black ${egg.rarityText} tracking-wider uppercase z-10 px-1.5 py-0.5 rounded-full`}
        style={{ background: 'rgba(255,255,255,0.72)' }}
      >
        {egg.rarity}
      </span>

      {/* Ready badge */}
      {isReady && (
        <motion.div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-md z-10"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
}

/* ── Locked slot ── */
function LockedSlot({ onUnlock }: { onUnlock: () => void }) {
  return (
    <motion.button
      className="relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden opacity-40"
      style={{
        background: 'rgba(255,255,255,0.35)',
        border: '1.5px dashed rgba(139,92,246,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
      whileTap={{ scale: 0.91 }}
      onClick={onUnlock}
    >
      {/* Slot gloss */}
      <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }} />

      {/* Lock icon */}
      <Lock className="w-5 h-5 text-violet-400/70" strokeWidth={2.5} />

      {/* Price pill */}
      <span
        className="text-[7.5px] font-black text-violet-700 tracking-wide z-10 px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(168,85,247,0.3)' }}
      >
        10 🪬 unlock
      </span>
    </motion.button>
  );
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Axolotl, Friend, FoodItem } from './types/game';
import { 
  generateAxolotl, 
  updateStats, 
  feedAxolotl, 
  playWithAxolotl, 
  cleanAquarium,
  checkEvolution,
  canRebirth,
  breedAxolotls,
  calculateLevel,
  getXPForNextLevel,
  getCurrentLevelXP,
} from './utils/gameLogic';
import { loadGameState, saveGameState, getInitialGameState, generateFriendCode } from './utils/storage';
import { BACKGROUND_COLORS, getDecorationById, DECORATIONS } from './data/decorations';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AxolotlDisplay } from './components/AxolotlDisplay';
import { ActionButtons } from './components/ActionButtons';
import { AquariumBackground } from './components/AquariumBackground';
import { MiniGameMenu } from './components/MiniGameMenu';
import { ShopModal } from './components/ShopModal';
import { SocialModal } from './components/SocialModal';
import { RebirthModal } from './components/RebirthModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { XPBar } from './components/XPBar';
import { FoodDisplay } from './components/FoodDisplay';
import { EggsPanel } from './components/EggsPanel';
import { DecorationsPanel } from './components/DecorationsPanel';
import { Coins, Sparkles, Menu, X, Check, ChevronDown, ShoppingCart, Gamepad2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameNotification {
  id: string;
  type: 'poke' | 'evolution' | 'gift' | 'friend' | 'milestone';
  emoji: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: GameNotification[] = [
  { id: 'n1', type: 'poke', emoji: '👉', message: 'Bubbles poked you!', time: '2m ago', read: false },
  { id: 'n2', type: 'gift', emoji: '🎁', message: 'Coral sent you 10 coins', time: '15m ago', read: false },
  { id: 'n3', type: 'milestone', emoji: '🏆', message: 'You reached Level 5!', time: '1h ago', read: true },
  { id: 'n4', type: 'friend', emoji: '🤝', message: 'Nemo accepted your request', time: '3h ago', read: true },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeModal, setActiveModal] = useState<'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null>(null);
  const [activeMiniGame, setActiveMiniGame] = useState<'bubbles' | 'feeding' | 'cleaning' | null>(null);
  const [showMiniGameMenu, setShowMiniGameMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showXPBar, setShowXPBar] = useState(false);
  const [hasPendingPokes, setHasPendingPokes] = useState(true);
  const [notifications, setNotifications] = useState<GameNotification[]>(INITIAL_NOTIFICATIONS);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showHowToPlayPanel, setShowHowToPlayPanel] = useState(false);
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);
  const [showEggsPanel, setShowEggsPanel] = useState(false);
  const [decorationsTab, setDecorationsTab] = useState<'store' | 'owned'>('store');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'games'>('home');
  const [shopSection, setShopSection] = useState<'coins' | 'opals' | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const aquariumScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const hasInitiallyScrolled = useRef(false);
  const isCenteringScroll = useRef(false);

  // Center aquarium scroll on first load
  useEffect(() => {
    if (gameState?.axolotl && aquariumScrollRef.current && !hasInitiallyScrolled.current) {
      const el = aquariumScrollRef.current;
      // Wait for layout to complete
      requestAnimationFrame(() => {
        isCenteringScroll.current = true;
        const scrollMax = el.scrollWidth - el.clientWidth;
        el.scrollLeft = scrollMax / 2;
        // Reset centering flag after the scroll event fires
        requestAnimationFrame(() => {
          isCenteringScroll.current = false;
        });
      });
    }
  }, [gameState?.axolotl]);

  // Load game state on mount
  useEffect(() => {
    const loaded = loadGameState();
    if (loaded) {
      setGameState(loaded);
    } else {
      setGameState(getInitialGameState());
    }
  }, []);

  // Auto-save game state
  useEffect(() => {
    if (gameState && gameState.axolotl) {
      saveGameState(gameState);
    }
  }, [gameState]);

  // Update stats periodically
  useEffect(() => {
    if (!gameState?.axolotl) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev?.axolotl) return prev;
        
        let updated = updateStats(prev.axolotl);
        updated = checkEvolution(updated);

        return {
          ...prev,
          axolotl: updated,
        };
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [gameState?.axolotl?.id]);

  const handleStart = useCallback((name: string) => {
    const newAxolotl = generateAxolotl(name);
    setGameState(prev => ({
      ...(prev || getInitialGameState()),
      axolotl: newAxolotl,
    }));
  }, []);

  const handleFeed = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      // Don't drop food if hunger is at 100
      if (prev.axolotl.stats.hunger >= 100) {
        return prev;
      }

      // Drop food at a random x position at the TOP
      const newFood: FoodItem = {
        id: `food-${Date.now()}`,
        x: Math.random() * 80 + 10, // 10-90% from left
        y: 0, // Start at top (will animate down)
        createdAt: Date.now(),
      };

      console.log('🍴 Dropping food:', newFood);

      return {
        ...prev,
        foodItems: [...(prev.foodItems || []), newFood],
      };
    });
    
    // After animation time (5 seconds), update food position to settled
    setTimeout(() => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          foodItems: (prev.foodItems || []).map(f => 
            f.y === 0 ? { ...f, y: 75 } : f
          ),
        };
      });
    }, 5000); // Match the maximum animation duration
  }, []);

  const handleEatFood = useCallback((foodId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      // Remove the food
      const foodItems = (prev.foodItems || []).filter(f => f.id !== foodId);

      // Increase hunger
      const updated = feedAxolotl(prev.axolotl, 15);

      return {
        ...prev,
        axolotl: updated,
        foodItems,
      };
    });
  }, []);

  const handlePlay = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      const updated = playWithAxolotl(prev.axolotl, 20);
      return { ...prev, axolotl: updated };
    });
  }, []);

  const handleClean = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      
      const updated = {
        ...prev.axolotl,
        stats: {
          ...prev.axolotl.stats,
          cleanliness: Math.min(100, prev.axolotl.stats.cleanliness + 35),
        },
      };
      
      return {
        ...prev,
        axolotl: updated,
      };
    });
  }, []);

  const handleWaterChange = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      
      // Water quality improves health only
      const updated = {
        ...prev.axolotl,
        stats: {
          ...prev.axolotl.stats,
          health: Math.min(100, prev.axolotl.stats.health + 30),
        },
      };
      
      return {
        ...prev,
        axolotl: updated,
      };
    });
  }, []);

  const handleMiniGameEnd = useCallback((score: number, gameType: 'bubbles' | 'feeding' | 'cleaning') => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      let updated = prev.axolotl;
      const earnedCoins = Math.floor(score / 10);

      switch (gameType) {
        case 'feeding':
          updated = feedAxolotl(updated, Math.min(100, score));
          break;
        case 'bubbles':
          updated = playWithAxolotl(updated, Math.min(100, score / 2));
          break;
        case 'cleaning':
          updated = cleanAquarium(updated, Math.min(100, score));
          break;
      }

      return {
        ...prev,
        axolotl: updated,
        coins: prev.coins + earnedCoins,
      };
    });

    setActiveMiniGame(null);
    setShowMiniGameMenu(false);
  }, []);

  const handlePurchase = useCallback((decorationId: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const decoration = getDecorationById(decorationId);
      if (!decoration || prev.coins < decoration.cost) return prev;

      return {
        ...prev,
        coins: prev.coins - decoration.cost,
        unlockedDecorations: [...prev.unlockedDecorations, decorationId],
      };
    });
  }, []);

  const handleEquipDecoration = useCallback((decorationId: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const decoration = getDecorationById(decorationId);
      if (!decoration) return prev;

      if (decoration.type === 'background') {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            background: BACKGROUND_COLORS[decorationId] || prev.customization.background,
          },
        };
      }

      // Toggle decoration
      const isEquipped = prev.customization.decorations.includes(decorationId);
      const maxDecorations = 5;

      if (isEquipped) {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            decorations: prev.customization.decorations.filter(id => id !== decorationId),
          },
        };
      } else if (prev.customization.decorations.length < maxDecorations) {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            decorations: [...prev.customization.decorations, decorationId],
          },
        };
      }

      return prev;
    });
  }, []);

  const handleAddFriend = useCallback((code: string) => {
    // Simulate adding a friend (in a real app, this would connect to backend)
    const mockFriend: Friend = {
      id: `friend-${Date.now()}`,
      name: code.split('-')[0],
      axolotlName: 'Mystery Axo',
      stage: 'adult',
      generation: parseInt(code.split('-')[1]?.[0] || '1'),
      lastSync: Date.now(),
    };

    setGameState(prev => {
      if (!prev) return prev;
      
      // Check if friend already exists
      if (prev.friends.some(f => f.id === mockFriend.id)) {
        alert('Friend already added!');
        return prev;
      }

      alert(`Added ${mockFriend.name} as a friend!`);
      return {
        ...prev,
        friends: [...prev.friends, mockFriend],
      };
    });
  }, []);

  const handleBreed = useCallback((friendId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const friend = prev.friends.find(f => f.id === friendId);
      if (!friend) return prev;

      if (prev.axolotl.stage !== 'adult') {
        alert('Your axolotl must be an adult to breed!');
        return prev;
      }

      // Simulate breeding
      const mockParent2: Axolotl = {
        ...prev.axolotl,
        id: friendId,
        name: friend.axolotlName,
      };

      const { color, pattern } = breedAxolotls(prev.axolotl, mockParent2);
      
      alert(`Breeding successful! Your new axolotl will inherit these traits when you rebirth.`);
      
      // Store breeding info for next rebirth
      return {
        ...prev,
        coins: prev.coins + 50, // Bonus for breeding
      };
    });
  }, []);

  const handleRebirth = useCallback((newName: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const oldAxolotl = prev.axolotl;
      const bonusCoins = oldAxolotl.generation * 10;

      const newAxolotl = generateAxolotl(
        newName,
        oldAxolotl.generation + 1,
        [oldAxolotl.id],
        oldAxolotl.color,
        oldAxolotl.pattern
      );

      return {
        ...prev,
        axolotl: newAxolotl,
        coins: prev.coins + bonusCoins,
        lineage: [...prev.lineage, oldAxolotl],
      };
    });

    setActiveModal(null);
  }, []);

  const handleBuyCoins = useCallback((pack: { opals: number; coins: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      const currentOpals = prev.opals || 0;
      if (currentOpals < pack.opals) return prev;
      return {
        ...prev,
        opals: currentOpals - pack.opals,
        coins: prev.coins + pack.coins,
      };
    });
  }, []);

  const handleBuyOpals = useCallback((pack: { price: string; opals: number }) => {
    // Simulated purchase — no real transaction
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        opals: (prev.opals || 0) + pack.opals,
      };
    });
  }, []);

  // Show welcome screen if no axolotl
  if (!gameState || !gameState.axolotl) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  const { axolotl, coins, unlockedDecorations, customization, friends, lineage } = gameState;
  const opals = gameState.opals || 0; // Default to 0 if not set
  const showRebirthButton = canRebirth(axolotl);
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasNotifications = unreadCount > 0 || hasPendingPokes;

  // Calculate XP and level
  const currentLevel = calculateLevel(axolotl.experience);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const currentLevelXP = getCurrentLevelXP(axolotl.experience);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto max-w-md flex flex-col min-h-0">
        {/* Game Container */}
        <div className="relative flex-1 flex flex-col sm:block min-h-0">
          {/* Subtle glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-none sm:rounded-[2rem] blur opacity-40 z-0" />
          
          <div className="relative z-10 bg-white backdrop-blur-2xl rounded-none sm:rounded-[2rem] shadow-2xl border-0 sm:border border-white/60 flex flex-col h-full min-h-0">
            {/* Floating Header HUD - overlays content */}
            <div className="absolute top-0 left-0 right-0 z-40 px-3 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 pointer-events-none rounded-t-none sm:rounded-t-[2rem] overflow-hidden">
              {/* Gradient fade behind header */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 via-purple-900/30 to-transparent pointer-events-none" />
              
              <div className="relative z-10 space-y-1 pointer-events-auto">
                {/* Single compact row: Level + Name + Currencies + Menu */}
                <div className="flex items-center gap-2">
                  {/* Level badge — filled XP bar pill */}
                  <motion.button
                    onClick={() => setShowXPBar(!showXPBar)}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden border border-white/30 backdrop-blur-sm"
                    style={{ width: 56, height: 22 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Track */}
                    <div className="absolute inset-0 bg-white/15" />
                    {/* Fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400/80 via-cyan-400/80 to-sky-400/80 transition-all duration-700"
                      style={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                    />
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                      style={{ width: '40%' }}
                    />
                    {/* Label */}
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black tracking-tight drop-shadow-[0_0_4px_rgba(0,0,0,0.4)]">
                      Lv.{currentLevel}
                    </span>
                  </motion.button>

                  {/* Axolotl Name */}
                  <h1 className="text-base font-bold text-white tracking-tight truncate flex-1 min-w-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">{axolotl.name}</h1>

                  {/* Compact currency counters */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <motion.button
                      onClick={() => { setShopSection('opals'); setActiveModal('shop'); }}
                      className="flex items-center gap-0.5 bg-white/15 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-3 h-3 text-cyan-200" strokeWidth={2.5} />
                      <span className="text-white text-[11px] font-semibold tabular-nums">{opals}</span>
                    </motion.button>
                    <motion.button
                      onClick={() => { setShopSection('coins'); setActiveModal('shop'); }}
                      className="flex items-center gap-0.5 bg-white/15 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Coins className="w-3 h-3 text-amber-200" strokeWidth={2.5} />
                      <span className="text-white text-[11px] font-semibold tabular-nums">{coins}</span>
                    </motion.button>
                  </div>
                  
                  {/* Hamburger Menu Button */}
                  <motion.button
                    ref={menuButtonRef}
                    onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                    className="relative bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-1.5 transition-all border border-white/30 flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Menu"
                  >
                    {showHamburgerMenu ? (
                      <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : (
                      <Menu className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                    {/* Notification dot */}
                    {hasNotifications && !showHamburgerMenu && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-indigo-500 shadow-lg shadow-red-500/50"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </motion.button>
                </div>

                {/* XP Bar - toggleable via level badge */}
                <AnimatePresence>
                  {showXPBar && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 4 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative h-1.5 bg-white/90 rounded-full overflow-hidden border border-white/40 shadow-[inset_0_0.5px_1px_rgba(255,255,255,0.8)]">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-300 via-white to-pink-300 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{
                            boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                          }}
                        />
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                          style={{ width: '30%' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-0.5 mt-0.5">
                        <span className="text-white/50 text-[9px] font-medium">{currentLevelXP}/{nextLevelXP} XP</span>
                        <span className="text-white/30 text-[9px]">·</span>
                        <span className="text-white/50 text-[9px] font-medium capitalize">Stage: {axolotl.stage}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Home (far left) + Mini Games & Shop (far right) */}
                <div className="flex justify-between items-center mt-1">
                  <motion.button
                    onClick={() => { setCurrentScreen('home'); setShowHamburgerMenu(false); }}
                    className="bg-white/[0.17] backdrop-blur-sm border border-white/30 rounded-xl p-2 active:bg-white/30 transition-colors"
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 3 }}
                    title="Home"
                  >
                    <Home className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>
                  <div className="flex gap-1.5">
                    {currentScreen !== 'games' && (
                      <motion.button
                        onClick={() => setCurrentScreen('games')}
                        className="bg-white/[0.17] backdrop-blur-sm border border-white/30 rounded-xl p-2 active:bg-white/30 transition-colors"
                        whileTap={{ scale: 0.93 }}
                        animate={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                        title="Mini Games"
                      >
                        <Gamepad2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => setActiveModal('shop')}
                      className="bg-white/[0.17] backdrop-blur-sm border border-white/30 rounded-xl p-2 active:bg-white/30 transition-colors"
                      whileTap={{ scale: 0.93 }}
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 1.5 }}
                      title="Shop"
                    >
                      <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Hamburger Dropdown Menu - rendered outside overflow:hidden header */}
            <AnimatePresence>
              {showHamburgerMenu && (
                <>
                  {/* Blurred backdrop */}
                  <motion.div
                    className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => { setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
                  />
                  {/* Full-screen popup panel */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 32 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 32 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-x-3 z-[9999] flex flex-col overflow-hidden rounded-3xl shadow-[0_20px_60px_-8px_rgba(99,102,241,0.22)]"
                    style={{
                      top: 'max(1rem, env(safe-area-inset-top))',
                      bottom: 'max(1rem, env(safe-area-inset-bottom))',
                      background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)',
                      border: '1px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    {/* Soft bubble orb top-right */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-cyan-300/35 blur-3xl pointer-events-none" />
                    {/* Soft bubble orb bottom-left */}
                    <div className="absolute -bottom-14 -left-8 w-52 h-52 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
                    {/* Centre glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-pink-200/20 blur-3xl pointer-events-none" />

                    {/* ── Header ── */}
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                      <div>
                        <h2
                          className="font-black tracking-tight"
                          style={{
                            fontSize: '1.65rem',
                            lineHeight: 1,
                            background: 'linear-gradient(110deg, #7c3aed 0%, #0ea5e9 55%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          Axopedia
                        </h2>
                        <p className="text-indigo-400/70 text-[10px] tracking-widest uppercase mt-0.5 font-semibold">Your aquatic universe</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Alerts button */}
                        <motion.button
                          onClick={() => setShowNotifPanel(prev => !prev)}
                          className="relative rounded-full p-2 border backdrop-blur-sm active:bg-white/80"
                          style={{
                            borderColor: showNotifPanel ? 'rgba(6,182,212,0.55)' : 'rgba(165,243,252,0.7)',
                            background: showNotifPanel ? 'rgba(103,232,249,0.35)' : 'rgba(255,255,255,0.5)',
                          }}
                          whileTap={{ scale: 0.85 }}
                        >
                          {unreadCount > 0 && (
                            <motion.div
                              className="absolute -top-1 -right-1 min-w-[1rem] h-4 rounded-full bg-rose-500 flex items-center justify-center border-2 border-white shadow-lg shadow-rose-400/50"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <span className="text-[7px] font-black text-white leading-none px-0.5">{unreadCount}</span>
                            </motion.div>
                          )}
                          <span className="text-[1.1rem] leading-none">🔔</span>
                        </motion.button>
                        {/* Close button */}
                        <motion.button
                          onClick={() => { setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
                          className="rounded-full p-2 border border-indigo-200/60 bg-white/50 active:bg-white/80 backdrop-blur-sm"
                          whileTap={{ scale: 0.85 }}
                        >
                          <X className="w-5 h-5 text-indigo-400" strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Thin divider */}
                    <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent)' }} />

                    {/* ── Scrollable tile grid ── */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                      <div className="grid grid-cols-2 gap-2.5">

                        {/* DECORATIONS */}
                        <motion.button
                          onClick={() => { setShowInventoryPanel(true); setDecorationsTab('store'); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{
                            background: showInventoryPanel
                              ? 'linear-gradient(135deg, rgba(167,243,208,0.9) 0%, rgba(94,234,212,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(167,243,208,0.75) 0%, rgba(94,234,212,0.55) 100%)',
                            border: showInventoryPanel ? '1px solid rgba(20,184,166,0.55)' : '1px solid rgba(20,184,166,0.35)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🪸</span>
                          <span className="text-[11px] font-bold text-teal-700 tracking-wider uppercase">Decorations</span>
                        </motion.button>

                        {/* EGGS */}
                        <motion.button
                          onClick={() => setShowEggsPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{
                            background: showEggsPanel
                              ? 'linear-gradient(135deg, rgba(233,213,255,0.9) 0%, rgba(216,180,254,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(233,213,255,0.75) 0%, rgba(216,180,254,0.55) 100%)',
                            border: showEggsPanel ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(168,85,247,0.35)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🥚</span>
                          <span className="text-[11px] font-bold text-violet-700 tracking-wider uppercase">Eggs</span>
                        </motion.button>

                        {/* STATS */}
                        <motion.button
                          onClick={() => { setActiveModal('stats'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(167,243,208,0.75) 0%, rgba(110,231,183,0.6) 100%)', border: '1px solid rgba(52,211,153,0.4)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">📊</span>
                          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase">Stats</span>
                        </motion.button>

                        {/* SOCIAL */}
                        <motion.button
                          onClick={() => { setActiveModal('social'); setShowHamburgerMenu(false); setShowNotifPanel(false); setHasPendingPokes(false); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(251,207,232,0.75) 0%, rgba(249,168,212,0.6) 100%)', border: '1px solid rgba(244,114,182,0.4)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          {hasPendingPokes && (
                            <motion.div
                              className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-400/60"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                          <span className="text-[2rem]">👥</span>
                          <span className="text-[11px] font-bold text-pink-700 tracking-wider uppercase">Social</span>
                        </motion.button>

                        {/* HOW TO PLAY */}
                        <motion.button
                          onClick={() => setShowHowToPlayPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{
                            background: showHowToPlayPanel
                              ? 'linear-gradient(135deg, rgba(224,242,254,0.9) 0%, rgba(186,230,253,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(224,242,254,0.75) 0%, rgba(186,230,253,0.55) 100%)',
                            border: showHowToPlayPanel ? '1px solid rgba(14,165,233,0.55)' : '1px solid rgba(14,165,233,0.35)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">💡</span>
                          <span className="text-[11px] font-bold text-sky-700 tracking-wider uppercase">How to Play</span>
                        </motion.button>

                        {/* SETTINGS */}
                        <motion.button
                          onClick={() => { setActiveModal('settings'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)', border: '1px solid rgba(148,163,184,0.4)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">⚙️</span>
                          <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">Settings</span>
                        </motion.button>

                        {/* REBIRTH — full-width when available */}
                        {showRebirthButton && (
                          <motion.button
                            onClick={() => { setActiveModal('rebirth'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                            className="col-span-2 group relative flex flex-row items-center justify-center gap-3 py-4 rounded-2xl overflow-hidden"
                            style={{ background: 'linear-gradient(110deg, rgba(233,213,255,0.88) 0%, rgba(216,180,254,0.82) 35%, rgba(251,207,232,0.82) 70%, rgba(253,186,116,0.75) 100%)', border: '1px solid rgba(192,132,252,0.5)' }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                              animate={{ x: ['-100%', '180%'] }}
                              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                              style={{ width: '40%' }}
                            />
                            <span className="text-[2rem]">✨</span>
                            <div className="flex flex-col items-start">
                              <span className="text-[13px] font-black text-violet-700 tracking-wider uppercase">Rebirth Available</span>
                              <span className="text-[9px] text-violet-500/80 font-medium">Start a new generation</span>
                            </div>
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* ── How to Play sub-panel overlay ── */}
                    <AnimatePresence>
                      {showHowToPlayPanel && (
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
                          style={{ background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
                        >
                          {/* Panel header */}
                          <div className="flex items-center px-5 pt-5 pb-3 flex-shrink-0 gap-3">
                            <motion.button
                              onClick={() => setShowHowToPlayPanel(false)}
                              className="rounded-full p-1.5 border border-indigo-200/60 bg-white/50 active:bg-white/80 flex-shrink-0"
                              whileTap={{ scale: 0.85 }}
                            >
                              <ChevronDown className="w-4 h-4 text-indigo-400 rotate-90" strokeWidth={2.5} />
                            </motion.button>
                            <div>
                              <h3 className="text-indigo-800 font-bold text-base">How to Play</h3>
                              <p className="text-[10px] text-sky-500/80 font-medium">Axolotl care guide</p>
                            </div>
                          </div>
                          <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(56,189,248,0.3),transparent)' }} />

                          {/* Tips list */}
                          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                            {[
                              { emoji: '🍤', color: 'rgba(16,185,129,0.12)', border: 'rgba(52,211,153,0.18)', title: 'Keep Your Axolotl Fed', tip: "Tap Feed to drop food pellets. Your axolotl swims up and eats them. Hunger drops over time — don't let it bottom out!" },
                              { emoji: '🎮', color: 'rgba(139,92,246,0.12)', border: 'rgba(167,139,250,0.18)', title: 'Play Mini Games', tip: 'Head to Mini Games to earn XP and coins. Each game boosts a different stat — feeding, cleaning, or happiness.' },
                              { emoji: '🧹', color: 'rgba(14,165,233,0.12)', border: 'rgba(56,189,248,0.18)', title: 'Clean the Tank', tip: "Tap Clean to scrub algae. Dirty tanks lower health over time. Keep cleanliness above 50%." },
                              { emoji: '💧', color: 'rgba(99,102,241,0.12)', border: 'rgba(129,140,248,0.18)', title: 'Change the Water', tip: 'Tap Water to refresh the tank and directly boost health. Do it regularly to keep your axolotl thriving.' },
                              { emoji: '🌱', color: 'rgba(34,197,94,0.12)', border: 'rgba(74,222,128,0.18)', title: 'Evolve Through 4 Stages', tip: 'Your axolotl grows from egg → hatchling → juvenile → adult. Keep all stats high to evolve faster.' },
                              { emoji: '✨', color: 'rgba(168,85,247,0.12)', border: 'rgba(216,180,254,0.18)', title: 'Rebirth for Bonuses', tip: 'At adult stage you can Rebirth — start a new generation with bonus coins and inherited colour traits.' },
                              { emoji: '🛍️', color: 'rgba(245,158,11,0.12)', border: 'rgba(251,191,36,0.18)', title: 'Customize Your Tank', tip: 'Tap the Shop button in the HUD to buy decorations, plants, and filters. Unlock backgrounds with opals.' },
                              { emoji: '👥', color: 'rgba(236,72,153,0.12)', border: 'rgba(244,114,182,0.18)', title: 'Play with Friends', tip: 'Add friends via code in Social. Poke them, visit their tanks, or hatch eggs together.' },
                            ].map((item, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.045 }}
                                className="flex gap-3 px-4 py-3.5 rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${item.border}` }}
                              >
                                <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                                <div>
                                  <p className="text-slate-700 font-bold text-[12px] leading-tight">{item.title}</p>
                                  <p className="text-slate-500 text-[11px] leading-snug mt-1">{item.tip}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Decorations sub-panel overlay ── */}
                    <AnimatePresence>
                      {showInventoryPanel && (() => {
                        const owned = gameState?.unlockedDecorations ?? [];
                        const equippedDecos = gameState?.customization?.decorations ?? [];
                        return (
                          <DecorationsPanel
                            owned={owned}
                            equippedDecos={equippedDecos}
                            coins={coins}
                            activeBackground={gameState?.customization?.background ?? ''}
                            decorationsTab={decorationsTab}
                            setDecorationsTab={setDecorationsTab}
                            onClose={() => setShowInventoryPanel(false)}
                            onPurchase={handlePurchase}
                            onEquip={handleEquipDecoration}
                          />
                        );
                      })()}
                    </AnimatePresence>

                    {/* ── Eggs sub-panel overlay ── */}
                    <AnimatePresence>
                      {showEggsPanel && (
                        <EggsPanel onClose={() => setShowEggsPanel(false)} />
                      )}
                    </AnimatePresence>

                    {/* ── Notification sub-panel overlay ── */}
                    <AnimatePresence>
                      {showNotifPanel && (
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
                          style={{ background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
                        >
                          {/* Panel header */}
                          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <motion.button
                                onClick={() => setShowNotifPanel(false)}
                                className="rounded-full p-1.5 border border-indigo-200/60 bg-white/50 active:bg-white/80"
                                whileTap={{ scale: 0.85 }}
                              >
                                <ChevronDown className="w-4 h-4 text-indigo-400 rotate-90" strokeWidth={2.5} />
                              </motion.button>
                              <div>
                                <h3 className="text-indigo-800 font-bold text-base">Alerts</h3>
                                {unreadCount > 0 && (
                                  <p className="text-[10px] text-cyan-600/80 font-medium">{unreadCount} unread</p>
                                )}
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <motion.button
                                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                className="flex items-center gap-1.5 text-[10px] text-indigo-400 active:text-indigo-600 border border-indigo-200/50 bg-white/40 rounded-full px-3 py-1.5"
                                whileTap={{ scale: 0.92 }}
                              >
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                Mark all read
                              </motion.button>
                            )}
                          </div>
                          <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.35),transparent)' }} />

                          {/* Notification list */}
                          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                                <span className="text-4xl">🔕</span>
                                <p className="text-slate-500 text-sm">No notifications yet</p>
                              </div>
                            ) : notifications.map((notif, i) => (
                              <motion.button
                                key={notif.id}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  if (notif.type === 'poke' || notif.type === 'friend' || notif.type === 'gift') {
                                    setActiveModal('social');
                                    setShowHamburgerMenu(false);
                                    setShowNotifPanel(false);
                                    setHasPendingPokes(false);
                                  }
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left"
                                style={{
                                  background: !notif.read
                                    ? 'linear-gradient(135deg, rgba(221,214,254,0.7) 0%, rgba(186,230,253,0.5) 100%)'
                                    : 'rgba(255,255,255,0.45)',
                                  border: !notif.read ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(203,213,225,0.4)',
                                }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                                  style={{ background: !notif.read ? 'rgba(221,214,254,0.6)' : 'rgba(241,245,249,0.8)' }}
                                >
                                  {notif.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[12px] leading-snug ${!notif.read ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{notif.message}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{notif.time}</p>
                                </div>
                                {!notif.read && (
                                  <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 shadow-sm shadow-violet-400/60" />
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Content Area - Changes based on currentScreen */}
            {currentScreen === 'home' ? (
              <>
                {/* Aquarium Display - Horizontally Scrollable, extends to bottom */}
                <div className="relative flex-1 sm:rounded-[2rem] overflow-hidden">
                  <div 
                    ref={aquariumScrollRef}
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                    onScroll={() => {
                      if (isCenteringScroll.current) return;
                      if (!hasInitiallyScrolled.current) {
                        hasInitiallyScrolled.current = true;
                        setShowScrollHint(false);
                      }
                    }}
                  >
                    {/* Wider Aquarium Container */}
                    <div 
                      className="relative h-full w-[250%] sm:w-[200%]"
                    >
                      <AquariumBackground
                        background={customization.background}
                        decorations={customization.decorations}
                      />
                      {/* Food Items */}
                      {(gameState.foodItems || []).map(food => (
                        <FoodDisplay key={food.id} food={food} />
                      ))}
                      
                      {/* Axolotl */}
                      <div className="absolute inset-0 z-10">
                        <AxolotlDisplay 
                          axolotl={axolotl} 
                          foodItems={gameState.foodItems || []}
                          onEatFood={handleEatFood}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Scroll Hint - outside scrollable area so it stays visible */}
                  <AnimatePresence>
                    {showScrollHint && (
                      <motion.div
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: [0, -3, 0], scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ 
                          opacity: { duration: 0.6, delay: 0.8 },
                          scale: { duration: 0.6, delay: 0.8 },
                          y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Left swipe hand */}
                          <motion.svg
                            width="32" height="32" viewBox="0 0 24 24" fill="none"
                            className="text-white/70 -scale-x-100"
                            animate={{ 
                              x: [-8, 2, -8],
                              opacity: [0.5, 0.85, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <path d="M18 8.5V4.5C18 3.67 17.33 3 16.5 3S15 3.67 15 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 7.5V3.5C15 2.67 14.33 2 13.5 2S12 2.67 12 3.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 7V4.5C12 3.67 11.33 3 10.5 3S9 3.67 9 4.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18 8.5C18 7.67 18.67 7 19.5 7S21 7.67 21 8.5V14C21 18 18 21 14 21H13C10.5 21 9 20 7.5 18.5L4.5 15.5C3.95 14.95 3.95 14.05 4.5 13.5C5.05 12.95 5.95 12.95 6.5 13.5L9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </motion.svg>
                          <div className="flex flex-col items-center">
                            <span className="text-white/70 text-[11.5px] font-medium tracking-widest uppercase">Swipe to</span>
                            <span className="text-white/70 text-[11.5px] font-medium tracking-widest uppercase">Explore</span>
                          </div>
                          {/* Right swipe hand */}
                          <motion.svg
                            width="32" height="32" viewBox="0 0 24 24" fill="none"
                            className="text-white/70"
                            animate={{ 
                              x: [8, -2, 8],
                              opacity: [0.5, 0.85, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <path d="M18 8.5V4.5C18 3.67 17.33 3 16.5 3S15 3.67 15 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 7.5V3.5C15 2.67 14.33 2 13.5 2S12 2.67 12 3.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 7V4.5C12 3.67 11.33 3 10.5 3S9 3.67 9 4.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18 8.5C18 7.67 18.67 7 19.5 7S21 7.67 21 8.5V14C21 18 18 21 14 21H13C10.5 21 9 20 7.5 18.5L4.5 15.5C3.95 14.95 3.95 14.05 4.5 13.5C5.05 12.95 5.95 12.95 6.5 13.5L9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </motion.svg>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Floating Action Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {/* Gradient fade behind buttons */}
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-purple-900/20 to-transparent pointer-events-none" />
                    <div className="relative px-2">
                      <ActionButtons
                        onFeed={handleFeed}
                        onPlay={handlePlay}
                        onClean={handleClean}
                        onWaterChange={handleWaterChange}
                        onRebirth={() => setActiveModal('rebirth')}
                        canRebirth={showRebirthButton}
                        isHungerFull={axolotl.stats.hunger >= 100}
                        stats={axolotl.stats}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Mini Games Screen */
              <div 
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gradient-to-br from-indigo-300/90 via-purple-300/90 to-pink-300/90 pt-[calc(max(0.5rem,env(safe-area-inset-top))+2.5rem)]" 
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                }}
              >
                <MiniGameMenu
                  onClose={() => setCurrentScreen('home')}
                  onSelectGame={(gameId) => {
                    // TODO: Start the selected game
                    console.log('Selected game:', gameId);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'shop' && (
        <ShopModal
          onClose={() => { setActiveModal(null); setShopSection(null); }}
          coins={coins}
          opals={opals}
          unlockedDecorations={unlockedDecorations}
          onPurchase={handlePurchase}
          onEquip={handleEquipDecoration}
          equippedDecorations={customization.decorations}
          onBuyCoins={handleBuyCoins}
          onBuyOpals={handleBuyOpals}
          initialSection={shopSection}
        />
      )}

      {activeModal === 'social' && (
        <SocialModal
          onClose={() => setActiveModal(null)}
          axolotl={axolotl}
          friends={friends}
          onAddFriend={handleAddFriend}
          onBreed={handleBreed}
          lineage={lineage}
        />
      )}

      {activeModal === 'rebirth' && showRebirthButton && (
        <RebirthModal
          onClose={() => setActiveModal(null)}
          onConfirm={handleRebirth}
          currentAxolotl={axolotl}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          onClose={() => setActiveModal(null)}
          stats={axolotl.secondaryStats}
          name={axolotl.name}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onResetGame={() => {
            localStorage.clear();
            setGameState(null);
          }}
        />
      )}
    </div>
  );
}
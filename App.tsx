
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, MessageCircle, User, Loader2, X, Heart, Send, Sparkles, MapPin, RefreshCw, Settings, ArrowRight, BadgeCheck, Camera, ExternalLink, Bell, ShieldCheck, Gift, Search, Pencil, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { UserProfile, ViewState, Match, Message, UserAccount } from './types';
import { generateAIProfiles, getAIReply, generateSmartBio, getCityName } from './geminiService';
import Card from './components/Card';
import MatchSplash from './components/MatchSplash';

declare global {
  interface Window {
    Telegram: { WebApp: any };
  }
}

const App: React.FC = () => {
  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  
  const [view, setView] = useState<ViewState>('intro');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('telematch_matches_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [user, setUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('telematch_user_v2');
    const initialUser = saved ? JSON.parse(saved) : null;
    const telegramPhoto = tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser?.first_name || 'User'}&background=random&size=512`;

    return {
      id: tgUser?.id?.toString() || 'guest',
      name: tgUser?.first_name || (initialUser?.name || 'Foydalanuvchi'),
      age: initialUser?.age || 21,
      bio: initialUser?.bio || '',
      imageUrl: telegramPhoto,
      interests: initialUser?.interests || ['Qahva', 'Sayohat', 'San\'at'],
      isVerified: true,
      settings: initialUser?.settings || { minAge: 18, maxAge: 35, distanceLimit: 25, discoveryActive: true },
      onboarded: initialUser?.onboarded || false,
      lastActive: Date.now()
    };
  });

  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMatchSplash, setShowMatchSplash] = useState<UserProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Swipe logic for intro button
  const swipeX = useMotionValue(0);
  const buttonWidth = 320; // approximate
  const heartScale = useTransform(swipeX, [0, 200], [1, 1.2]);
  const textOpacity = useTransform(swipeX, [0, 100], [1, 0]);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0a0a0a');
    }
    if (user.onboarded) {
      setView('discovery');
      loadInitialProfiles();
    }
  }, []);

  const loadInitialProfiles = async () => {
    setIsLoading(true);
    const aiProfiles = await generateAIProfiles(8, user);
    setProfiles(aiProfiles);
    setIsLoading(false);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const swipedProfile = profiles[0];
    if (!swipedProfile) return;

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(direction === 'right' ? 'medium' : 'light');
    }

    if (direction === 'right' && (swipedProfile.type === 'ai' || Math.random() > 0.4)) {
      const matchId = `match-${Date.now()}`;
      const newMatch: Match = { id: matchId, user: swipedProfile, timestamp: Date.now(), messages: [] };
      setMatches(prev => [newMatch, ...prev]);
      setShowMatchSplash(swipedProfile);
    }

    setProfiles(prev => prev.slice(1));
    if (profiles.length < 3) {
      const more = await generateAIProfiles(5, user);
      setProfiles(prev => [...prev, ...more]);
    }
  }, [profiles, user, tg]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeMatch) return;
    const userMsg: Message = { id: Date.now().toString(), senderId: 'user', text: chatMessage, timestamp: Date.now() };
    const updatedMatch = { ...activeMatch, messages: [...activeMatch.messages, userMsg], lastMessage: chatMessage };
    setMatches(prev => prev.map(m => m.id === activeMatch.id ? updatedMatch : m));
    setActiveMatch(updatedMatch);
    setChatMessage('');
    
    setIsTyping(true);
    const replyText = await getAIReply(activeMatch.user, updatedMatch.messages.map(m => m.text));
    setTimeout(() => {
      setIsTyping(false);
      const aiMsg: Message = { id: Date.now().toString(), senderId: activeMatch.user.id, text: replyText, timestamp: Date.now() };
      const finalMatch = { ...updatedMatch, messages: [...updatedMatch.messages, aiMsg], lastMessage: replyText };
      setMatches(prev => prev.map(m => m.id === activeMatch.id ? finalMatch : m));
      setActiveMatch(finalMatch);
    }, 2000);
  };

  const renderIntro = () => (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] relative grid-bg overflow-hidden px-8 pb-10 pt-16">
      <style>{`
        :root {
          --design-orange: #ff541c;
          --design-purple: #7b2ff7;
          --design-blue: #3b82f6;
          --design-dark: #222222;
        }
      `}</style>

      <div className="absolute top-14 left-0 right-0 text-center z-50">
        <span className="text-white font-[800] text-xl tracking-tight">TeleMatch</span>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center mt-4">
        <div className="relative w-full aspect-[4/5] flex items-center justify-center">
          
          <motion.div 
            initial={{ rotate: -8, x: -45, y: -20, opacity: 0 }}
            animate={{ rotate: -8, x: -45, y: -20, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute w-[210px] h-[280px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
          >
            <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400" className="w-full h-full object-cover grayscale-[0.1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white text-[12px]">
              <div className="font-[800]">Jasur, 24</div>
              <div className="text-[10px] opacity-60">Toshkent</div>
            </div>
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="absolute top-1/2 -left-5 -translate-y-1/2 w-10 h-10 bg-[var(--design-purple)] rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Gift size={20} className="text-white" />
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial={{ rotate: 8, x: 40, y: 15, opacity: 0 }}
            animate={{ rotate: 8, x: 40, y: 15, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="absolute w-[210px] h-[280px] rounded-[32px] overflow-hidden shadow-2xl border border-white/20 z-10"
          >
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white text-[12px]">
              <div className="font-[800]">Laylo, 27</div>
              <div className="text-[10px] opacity-60">Samarqand</div>
            </div>

            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -top-4 right-8 w-11 h-11 bg-[var(--design-blue)] rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Send size={20} className="text-white" fill="white" />
            </motion.div>

            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="absolute bottom-1/4 -right-6 w-14 h-14 bg-[var(--design-orange)] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0a0a0a]"
            >
              <Heart size={26} className="text-white" fill="white" />
            </motion.div>
          </motion.div>

        </div>
      </div>

      <div className="text-center mt-2 mb-6">
        <h1 className="text-[38px] font-[900] leading-[1.05] tracking-tight text-white mb-6">
          Mukammal juftingizni <br />
          <span className="text-[var(--design-orange)]">Toping</span>
        </h1>
        <p className="text-white/40 text-[14px] leading-relaxed font-medium">
          Yangi insonlar bilan tanishing, haqiqiy aloqalarni <br /> o'rnating va bu qayerga olib borishini ko'ring.
        </p>
      </div>

      <div className="mt-auto pt-4 flex justify-center">
        <div className="relative w-full h-[84px] bg-[#222222] rounded-full flex items-center p-2.5 overflow-hidden">
          <motion.div
            style={{ x: swipeX, scale: heartScale }}
            drag="x"
            dragConstraints={{ left: 0, right: 230 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.x > 180) {
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                setView('onboarding');
              } else {
                swipeX.set(0);
              }
            }}
            className="w-[64px] h-[64px] bg-[var(--design-orange)] rounded-full flex items-center justify-center shadow-lg shadow-orange-900/40 z-20 cursor-grab active:cursor-grabbing"
          >
            <Heart size={24} className="text-white" fill="white" />
          </motion.div>

          <motion.div 
            style={{ opacity: textOpacity }}
            className="absolute left-0 right-0 text-center pointer-events-none"
          >
            <span className="text-white font-[800] text-lg tracking-tight ml-12">Boshlash uchun suring</span>
          </motion.div>
          
          <div className="ml-auto flex items-center gap-0 px-4 opacity-30">
            <ChevronRight size={22} className="text-white -mr-3" strokeWidth={3} />
            <ChevronRight size={22} className="text-white -mr-3" strokeWidth={3} />
            <ChevronRight size={22} className="text-white" strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscovery = () => (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img src={user.imageUrl} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Salom {user.name}!</span>
            <div className="flex items-center gap-1 text-white text-xs font-bold">
               <MapPin size={12} className="text-orange-500" /> Toshkent, O'zb
            </div>
          </div>
        </div>
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Search size={20} className="text-white/60" />
        </button>
      </div>

      <div className="flex-1 px-4 relative mt-2">
        {profiles.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {profiles.slice(0, 2).reverse().map((profile, index) => (
              <Card key={profile.id} profile={profile} isTop={index === 1 || profiles.length === 1} onSwipe={handleSwipe} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold uppercase tracking-widest text-xs">Juftliklar qidirilmoqda...</p>
          </div>
        )}
      </div>

      <div className="flex justify-center items-center gap-4 py-8 relative z-20">
        <button onClick={() => handleSwipe('left')} className="w-16 h-16 rounded-full glass flex items-center justify-center active:scale-75 transition-transform">
          <X size={32} className="text-orange-500" />
        </button>
        <button className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-600/30 flex items-center justify-center active:scale-75 transition-transform shadow-[0_0_20px_rgba(123,47,247,0.2)]">
          <Gift size={32} className="text-purple-500" />
        </button>
        <button onClick={() => handleSwipe('right')} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center active:scale-75 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <Heart size={32} className="text-white" fill="currentColor" />
        </button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] pb-24">
      <div className="px-6 pt-12 flex items-center justify-between mb-6">
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Settings size={20} className="text-white/60" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            {user.name}, {user.age}
            <BadgeCheck size={18} className="text-blue-400 fill-blue-400" color="white" />
          </h2>
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Toshkent, O'zbekiston</span>
        </div>
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Pencil size={18} className="text-white/60" />
        </button>
      </div>

      <div className="px-4 mb-8">
        <div className="aspect-[4/5] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative">
          <img src={user.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      </div>

      <div className="px-8 space-y-8">
        <div>
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-3">Men haqimda</h3>
          <p className="text-white/70 font-medium leading-relaxed">
            Salom! 👋 Men {user.name}man. Qahva ☕, sayohat ✈️ va tungi suhbatlarni ✨ yaxshi ko'raman. Har doim yangi insonlar va ijobiy energiya 🌍 uchun ochiqman.
          </p>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-3">Qiziqishlar</h3>
          <div className="flex flex-wrap gap-3">
             {['Street Food', 'Kitoblar', 'Sayohat', 'Raqamli san\'at', 'Plyaj'].map((tag, i) => (
               <div key={i} className="px-4 py-2 glass rounded-full flex items-center gap-2 text-[12px] font-bold text-white/80">
                 {tag === 'Street Food' && '🍕'}
                 {tag === 'Kitoblar' && '📚'}
                 {tag === 'Sayohat' && '✈️'}
                 {tag === 'Raqamli san\'at' && '🎨'}
                 {tag === 'Plyaj' && '🏖️'}
                 {tag}
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] select-none text-white">
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'intro' && renderIntro()}
        {view === 'onboarding' && (
           <div className="flex-1 flex flex-col p-8 bg-[#0a0a0a] items-center justify-center">
              <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
              <h2 className="text-2xl font-black">Profil yuklanmoqda...</h2>
              <button onClick={() => { setUser(prev => ({ ...prev, onboarded: true })); setView('discovery'); loadInitialProfiles(); }} className="mt-12 w-full py-5 bg-orange-600 rounded-full font-bold">Ilovani ishga tushirish</button>
           </div>
        )}
        {view === 'discovery' && renderDiscovery()}
        {view === 'matches' && (
           <div className="flex-1 bg-[#0a0a0a] p-6 pt-12 overflow-y-auto">
              <h1 className="text-3xl font-black mb-6">Xabarlar</h1>
              <div className="space-y-4">
                {matches.map(m => (
                  <div key={m.id} onClick={() => { setActiveMatch(m); setView('chat'); }} className="flex items-center gap-4 p-4 glass rounded-[32px]">
                    <img src={m.user.imageUrl} className="w-14 h-14 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">{m.user.name}</span>
                        <span className="text-[10px] font-bold text-white/30">Bugun</span>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-1">{m.lastMessage || 'Sizga xabar yubordi'}</p>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="font-bold">Hozircha xabarlar yo'q</p>
                  </div>
                )}
              </div>
           </div>
        )}
        {view === 'chat' && activeMatch && (
           <div className="flex-1 flex flex-col bg-[#0a0a0a]">
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                 <button onClick={() => setView('matches')} className="p-2"><ChevronRight className="rotate-180" /></button>
                 <img src={activeMatch.user.imageUrl} className="w-10 h-10 rounded-full" />
                 <span className="font-bold">{activeMatch.user.name}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {activeMatch.messages.map(msg => (
                  <div key={msg.id} className={`${msg.senderId === 'user' ? 'self-end bg-orange-600' : 'self-start glass'} p-4 rounded-3xl max-w-[80%] text-sm font-medium`}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start glass p-3 rounded-2xl text-[10px] text-white/40 animate-pulse">
                    yozilmoqda...
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
              <div className="p-4 safe-area-bottom flex gap-2">
                 <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Xabar yozing..." className="flex-1 glass rounded-full px-6 py-4 outline-none border-none text-sm font-medium" />
                 <button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center disabled:opacity-50"><Send size={20} /></button>
              </div>
           </div>
        )}
        {view === 'profile' && renderProfile()}
      </main>

      {view !== 'chat' && view !== 'onboarding' && view !== 'intro' && (
        <div className="px-6 pb-8 safe-area-bottom">
          <nav className="flex justify-around items-center h-16 glass rounded-full px-2">
            <button onClick={() => setView('discovery')} className={`p-3 transition-all ${view === 'discovery' ? 'text-white' : 'text-white/30'}`}>
              <Flame size={24} fill={view === 'discovery' ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setView('discovery')} className={`p-3 transition-all ${view === 'discovery' ? 'text-white' : 'text-white/30'}`}>
              <Heart size={24} />
            </button>
            <button onClick={() => setView('matches')} className={`p-3 transition-all ${view === 'matches' ? 'text-white' : 'text-white/30'}`}>
              <MessageCircle size={24} fill={view === 'matches' ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setView('profile')} className={`p-3 transition-all ${view === 'profile' ? 'text-white' : 'text-white/30'}`}>
              <User size={24} fill={view === 'profile' ? 'currentColor' : 'none'} />
            </button>
          </nav>
        </div>
      )}

      <AnimatePresence>
        {showMatchSplash && (
          <MatchSplash 
            match={showMatchSplash} 
            userImageUrl={user.imageUrl} 
            onClose={() => setShowMatchSplash(null)} 
            onChat={() => { 
              const currentMatch = matches.find(m => m.user.id === showMatchSplash.id);
              if (currentMatch) { setActiveMatch(currentMatch); setView('chat'); }
              setShowMatchSplash(null); 
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

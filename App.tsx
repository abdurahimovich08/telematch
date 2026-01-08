
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, MessageCircle, User, Loader2, X, Heart, Send, Sparkles, MapPin, RefreshCw, Settings, ArrowRight, BadgeCheck, Camera, ExternalLink, Bell, ShieldCheck, Gift, Search, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
      name: tgUser?.first_name || (initialUser?.name || ''),
      age: initialUser?.age || 21,
      bio: initialUser?.bio || '',
      imageUrl: telegramPhoto,
      interests: initialUser?.interests || ['Coffee', 'Travel', 'Art'],
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
    <div className="flex-1 flex flex-col bg-[#0a0a0a] relative grid-bg overflow-hidden px-8 pb-12 pt-20">
      {/* Connexa Logo Simulation */}
      <div className="absolute top-12 left-0 right-0 text-center">
        <span className="text-white/80 font-extrabold text-xl tracking-wide uppercase">Connexa</span>
      </div>

      {/* Stacked Cards Illustration */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-full h-[400px]">
          {/* Card 1 */}
          <motion.div 
            initial={{ rotate: -12, x: -40, opacity: 0 }}
            animate={{ rotate: -12, x: -40, opacity: 1 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400" className="w-full h-full object-cover grayscale-[0.2]" />
            <div className="absolute bottom-4 left-4 text-white text-[10px] font-black uppercase">Jastin, 24</div>
            <div className="absolute top-4 left-4 w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center"><Gift size={12} className="text-white" /></div>
          </motion.div>
          
          {/* Card 2 (Active looking) */}
          <motion.div 
            initial={{ rotate: 12, x: 40, opacity: 0 }}
            animate={{ rotate: 12, x: 40, opacity: 1 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/20 z-10"
          >
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 text-white text-[10px] font-black uppercase">Julia, 27</div>
            <div className="absolute top-4 left-4 w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center"><MessageCircle size={12} className="text-white" fill="currentColor" /></div>
            <div className="absolute top-1/2 right-4 -translate-y-1/2 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"><Heart size={20} className="text-white" fill="currentColor" /></div>
          </motion.div>
        </div>
      </div>

      {/* Text Section */}
      <div className="text-center mt-4">
        <h1 className="text-[44px] font-extrabold leading-[1.1] tracking-tight mb-4">
          Find Your <br />
          <span className="text-[#ff5200]">Perfect</span> Match
        </h1>
        <p className="text-gray-500 text-sm font-medium px-4">
          Meet New People, Spark Real Connections, <br /> And See Where It Goes.
        </p>
      </div>

      {/* Button Section */}
      <div className="mt-12">
        <button 
          onClick={() => setView('onboarding')} 
          className="w-full h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-between px-6 active:scale-95 transition-all group"
        >
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,82,0,0.4)]">
             <Heart size={20} className="text-white" fill="currentColor" />
          </div>
          <span className="text-white font-bold text-lg">Get Started</span>
          <div className="flex gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={20} />
            <ArrowRight size={20} className="-ml-3" />
          </div>
        </button>
      </div>
    </div>
  );

  const renderDiscovery = () => (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img src={user.imageUrl} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Hello {user.name}!</span>
            <div className="flex items-center gap-1 text-white text-xs font-bold">
               <MapPin size={12} className="text-orange-500" /> Washington, USA
            </div>
          </div>
        </div>
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Search size={20} className="text-white/60" />
        </button>
      </div>

      {/* Card Container */}
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
            <p className="font-bold uppercase tracking-widest text-xs">Finding matches...</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
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
      {/* Header Info */}
      <div className="px-6 pt-12 flex items-center justify-between mb-6">
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Settings size={20} className="text-white/60" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            {user.name}, {user.age}
            <BadgeCheck size={18} className="text-blue-400 fill-blue-400" color="white" />
          </h2>
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Washington, USA</span>
        </div>
        <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <Pencil size={18} className="text-white/60" />
        </button>
      </div>

      {/* Main Profile Image */}
      <div className="px-4 mb-8">
        <div className="aspect-[4/5] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative">
          <img src={user.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      </div>

      {/* About Section */}
      <div className="px-8 space-y-8">
        <div>
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-3">About</h3>
          <p className="text-white/70 font-medium leading-relaxed">
            Hi there! 👋 I'm {user.age}, into coffee ☕, travel ✈️, and late-night talks ✨. Always open to new people and good vibes 🌍.
          </p>
        </div>

        {/* Interests Tags */}
        <div>
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-3">Interests</h3>
          <div className="flex flex-wrap gap-3">
             {['Street Food', 'Books', 'Travel', 'Digital Art', 'Beach Time'].map((tag, i) => (
               <div key={i} className="px-4 py-2 glass rounded-full flex items-center gap-2 text-[12px] font-bold text-white/80">
                 {tag === 'Street Food' && '🍕'}
                 {tag === 'Books' && '📚'}
                 {tag === 'Travel' && '✈️'}
                 {tag === 'Digital Art' && '🎨'}
                 {tag === 'Beach Time' && '🏖️'}
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
              <h2 className="text-2xl font-black">Syncing Profile...</h2>
              <button onClick={() => setView('discovery')} className="mt-12 w-full py-5 bg-orange-600 rounded-full font-bold">Launch App</button>
           </div>
        )}
        {view === 'discovery' && renderDiscovery()}
        {view === 'matches' && (
           <div className="flex-1 bg-[#0a0a0a] p-6 pt-12 overflow-y-auto">
              <h1 className="text-3xl font-black mb-6">Messages</h1>
              <div className="space-y-4">
                {matches.map(m => (
                  <div key={m.id} onClick={() => { setActiveMatch(m); setView('chat'); }} className="flex items-center gap-4 p-4 glass rounded-[32px]">
                    <img src={m.user.imageUrl} className="w-14 h-14 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">{m.user.name}</span>
                        <span className="text-[10px] font-bold text-white/30">12:45 PM</span>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-1">{m.lastMessage || 'Sent you a message'}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
        {view === 'chat' && activeMatch && (
           <div className="flex-1 flex flex-col bg-[#0a0a0a]">
              {/* Simplified Chat UI for this design update */}
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                 <button onClick={() => setView('matches')} className="p-2"><X /></button>
                 <img src={activeMatch.user.imageUrl} className="w-10 h-10 rounded-full" />
                 <span className="font-bold">{activeMatch.user.name}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {activeMatch.messages.map(msg => (
                  <div key={msg.id} className={`${msg.senderId === 'user' ? 'self-end bg-orange-600' : 'self-start glass'} p-4 rounded-3xl max-w-[80%] text-sm font-medium`}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="p-4 safe-area-bottom flex gap-2">
                 <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 glass rounded-full px-6 py-4 outline-none border-none text-sm font-medium" />
                 <button onClick={handleSendMessage} className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center"><Send size={20} /></button>
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

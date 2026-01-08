
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, MessageCircle, User, Loader2, X, Heart, Send, Sparkles, MapPin, RefreshCw, Settings, ArrowRight, BadgeCheck, Camera, ExternalLink } from 'lucide-react';
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
  
  const STORAGE_KEY_USER = tgUser ? `telematch_user_${tgUser.id}` : 'telematch_user_guest';
  const STORAGE_KEY_MATCHES = tgUser ? `telematch_matches_${tgUser.id}` : 'telematch_matches_guest';

  const [view, setView] = useState<ViewState>('intro');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MATCHES);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [user, setUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    const initialUser = saved ? JSON.parse(saved) : null;
    const telegramPhoto = tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser?.first_name || 'User'}&background=random&size=512`;

    return {
      id: tgUser?.id?.toString() || 'guest',
      name: tgUser?.first_name || (initialUser?.name || ''),
      age: initialUser?.age || 21,
      bio: initialUser?.bio || '',
      imageUrl: telegramPhoto,
      coverImageUrl: initialUser?.coverImageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop',
      interests: initialUser?.interests || [],
      isVerified: true,
      isPremium: tgUser?.is_premium || false,
      settings: initialUser?.settings || {
        minAge: 18,
        maxAge: 35,
        distanceLimit: 25,
        discoveryActive: true
      },
      onboarded: initialUser?.onboarded || false,
      lastActive: Date.now()
    };
  });

  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMatchSplash, setShowMatchSplash] = useState<UserProfile | null>(null);
  const [matchNotification, setMatchNotification] = useState<UserProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Telegram native elements control
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Back button visibility
      if (view !== 'discovery' && view !== 'intro' && view !== 'onboarding') {
        tg.BackButton.show();
        tg.BackButton.onClick(() => setView('discovery'));
      } else {
        tg.BackButton.hide();
      }

      // Set Header color to match app theme
      tg.setHeaderColor(tg.colorScheme === 'dark' ? '#000000' : '#ffffff');
    }
  }, [view]);

  useEffect(() => {
    if (tgUser?.photo_url && tgUser.photo_url !== user.imageUrl) {
      setUser(prev => ({ ...prev, imageUrl: tgUser.photo_url }));
    }
  }, [tgUser?.photo_url]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ ...user, lastActive: Date.now() }));
  }, [user]);

  const triggerAIInitiation = async (matchId: string, profile: UserProfile) => {
    setTimeout(async () => {
      setIsTyping(true);
      const firstReply = await getAIReply(profile, []);
      setIsTyping(false);
      const aiMsg: Message = { id: Date.now().toString(), senderId: profile.id, text: firstReply, timestamp: Date.now() };
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, messages: [aiMsg], lastMessage: firstReply } : m));
      setActiveMatch(current => current?.id === matchId ? { ...current, messages: [aiMsg], lastMessage: firstReply } : current);
    }, 2500);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const swipedProfile = profiles[0];
    if (!swipedProfile) return;

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(direction === 'right' ? 'medium' : 'light');
    }

    if (direction === 'right' && (swipedProfile.type === 'ai' || Math.random() > 0.5)) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      const matchId = `match-${Date.now()}`;
      const newMatch: Match = { id: matchId, user: swipedProfile, timestamp: Date.now(), messages: [] };
      setMatches(prev => [newMatch, ...prev]);
      
      if (view === 'discovery') {
        setShowMatchSplash(swipedProfile);
      } else {
        setMatchNotification(swipedProfile);
        setTimeout(() => setMatchNotification(null), 5000);
      }

      if (swipedProfile.type === 'ai') {
        triggerAIInitiation(matchId, swipedProfile);
      }
    }

    setProfiles(prev => prev.slice(1));
    if (profiles.length < 4) {
      const more = await generateAIProfiles(5, user);
      setProfiles(prev => [...prev, ...more]);
    }
  }, [profiles, user, view, tg]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeMatch) return;
    const userMsg: Message = { id: Date.now().toString(), senderId: 'user', text: chatMessage, timestamp: Date.now() };
    const currentMatchId = activeMatch.id;
    const updatedMatch = { ...activeMatch, messages: [...activeMatch.messages, userMsg], lastMessage: chatMessage };
    
    setMatches(prev => prev.map(m => m.id === currentMatchId ? updatedMatch : m));
    setActiveMatch(updatedMatch);
    setChatMessage('');
    
    if (activeMatch.user.type === 'ai') {
      setIsTyping(true);
      const history = updatedMatch.messages.map(m => `${m.senderId === 'user' ? 'User' : m.senderId}: ${m.text}`);
      const replyText = await getAIReply(activeMatch.user, history);
      
      const thinkingDelay = Math.min(4000, Math.max(1500, replyText.length * 25));
      setTimeout(() => {
        setIsTyping(false);
        const aiMsg: Message = { id: (Date.now() + 1).toString(), senderId: activeMatch.user.id, text: replyText, timestamp: Date.now() };
        const finalMatch = { ...updatedMatch, messages: [...updatedMatch.messages, aiMsg], lastMessage: replyText };
        setMatches(prev => prev.map(m => m.id === currentMatchId ? finalMatch : m));
        setActiveMatch(current => current?.id === currentMatchId ? finalMatch : current);
        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
      }, thinkingDelay);
    }
  };

  const handleOpenTelegramProfile = (userId: string) => {
    // Agar real user bo'lsa, Telegram profilini ochamiz
    // Telegram Mini App'da bu foydalanuvchi handle'i yoki ID orqali amalga oshiriladi
    if (tg) {
      tg.openTelegramLink(`https://t.me/user?id=${userId}`);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMatch?.messages, isTyping]);

  const renderDiscovery = () => (
    <div className="flex-1 flex flex-col p-4 relative overflow-hidden bg-gray-50">
      <div className="relative flex-1">
        {profiles.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {profiles.slice(0, 2).reverse().map((profile, index) => (
              <Card key={profile.id} profile={profile} isTop={index === 1 || profiles.length === 1} onSwipe={handleSwipe} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-black uppercase tracking-widest text-[10px]">Tavsiyalar saralanmoqda...</p>
          </div>
        )}
      </div>
      <div className="flex justify-center items-center gap-6 py-6 z-20">
        <button onClick={() => handleSwipe('left')} className="w-14 h-14 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center bg-white shadow-xl active:scale-75 transition-transform"><X size={28} /></button>
        <button onClick={() => handleSwipe('right')} className="w-14 h-14 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center bg-white shadow-xl active:scale-75 transition-transform"><Heart size={28} fill="currentColor" /></button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .dot-flashing {
          position: relative; width: 6px; height: 6px; border-radius: 5px; background-color: #94a3b8; color: #94a3b8;
          animation: dot-flashing 1s infinite linear alternate; animation-delay: 0.5s;
        }
        .dot-flashing::before, .dot-flashing::after { content: ""; display: inline-block; position: absolute; top: 0; }
        .dot-flashing::before { left: -12px; width: 6px; height: 6px; border-radius: 5px; background-color: #94a3b8; animation: dot-flashing 1s infinite alternate; animation-delay: 0s; }
        .dot-flashing::after { left: 12px; width: 6px; height: 6px; border-radius: 5px; background-color: #94a3b8; animation: dot-flashing 1s infinite alternate; animation-delay: 1s; }
        @keyframes dot-flashing { 0% { background-color: #94a3b8; } 50%, 100% { background-color: #e2e8f0; } }
        .telegram-bubble { position: relative; max-width: 85%; padding: 8px 12px; border-radius: 12px; font-weight: 500; font-size: 15px; line-height: 1.4; }
        .bubble-in { background-color: #ffffff; color: #000000; align-self: flex-start; border-bottom-left-radius: 2px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); }
        .bubble-out { background-color: #effdde; color: #000000; align-self: flex-end; border-bottom-right-radius: 2px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); }
      `}</style>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'discovery' && renderDiscovery()}
        {view === 'chat' && activeMatch && (
          <div className="flex-1 flex flex-col bg-[#e6ebee]">
            <div className="flex items-center gap-3 p-3 bg-white border-b z-10 shadow-sm">
              <img src={activeMatch.user.imageUrl} className="w-10 h-10 rounded-full object-cover shadow-sm cursor-pointer" onClick={() => handleOpenTelegramProfile(activeMatch.user.id)} />
              <div className="flex flex-col flex-1 cursor-pointer" onClick={() => handleOpenTelegramProfile(activeMatch.user.id)}>
                <div className="font-bold text-[15px] leading-tight flex items-center gap-1">
                  {activeMatch.user.name}
                  {activeMatch.user.isVerified && <BadgeCheck size={14} className="text-blue-500 fill-blue-500" color="white" />}
                </div>
                <div className="text-[12px] text-gray-400 font-medium">
                  {isTyping ? <span className="text-blue-500 animate-pulse">yozmoqda...</span> : 'onlayn'}
                </div>
              </div>
              <button onClick={() => handleOpenTelegramProfile(activeMatch.user.id)} className="p-2 text-blue-500">
                <ExternalLink size={20} />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-[#e6ebee]" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay', backgroundSize: '400px' }}>
              <div className="mx-auto bg-black/10 text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 backdrop-blur-sm">
                Xavfsiz suhbat boshlandi
              </div>
              {activeMatch.messages.map(msg => (
                <div key={msg.id} className={`telegram-bubble ${msg.senderId === 'user' ? 'bubble-out' : 'bubble-in'}`}>
                  {msg.text}
                  <div className={`text-[9px] mt-1 text-right opacity-40 font-bold`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="telegram-bubble bubble-in w-16 flex justify-center py-4">
                  <div className="dot-flashing"></div>
                </div>
              )}
            </div>

            <div className="p-2 bg-white flex gap-2 items-center safe-area-bottom">
              <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Xabar..." className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-[15px] focus:outline-none font-medium border border-gray-100" />
              <button onClick={handleSendMessage} disabled={!chatMessage.trim() || isTyping} className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg disabled:bg-gray-200 transition-all active:scale-90"><Send size={20} /></button>
            </div>
          </div>
        )}
        {/* Boshqa ko'rinishlar (intro, onboarding, matches, profile) mavjud mantiq asosida qoladi */}
        {view === 'intro' && (
          <div className="flex-1 flex flex-col bg-white items-center justify-center p-10 text-center">
             <div className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-8">
               <Flame size={48} fill="currentColor" />
             </div>
             <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">TeleMatch</h2>
             <p className="text-gray-500 text-lg font-medium">Telegram orqali yangi insonlar bilan tanishing.</p>
             <button onClick={() => setView('onboarding')} className="w-full mt-10 py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                Boshlash <ArrowRight size={20} />
             </button>
          </div>
        )}
      </main>

      {view !== 'chat' && view !== 'onboarding' && view !== 'intro' && (
        <nav className="flex justify-around items-center py-5 bg-white border-t border-gray-100 safe-area-bottom z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
          <button onClick={() => setView('discovery')} className={`p-2 transition-all ${view === 'discovery' ? 'text-blue-500 scale-110' : 'text-gray-300'}`}><Flame size={28} fill={view === 'discovery' ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setView('matches')} className={`p-2 transition-all relative ${view === 'matches' ? 'text-blue-500 scale-110' : 'text-gray-300'}`}>
            <MessageCircle size={28} fill={view === 'matches' ? 'currentColor' : 'none'} />
            {matches.some(m => m.messages.length === 0) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></span>}
          </button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? 'text-blue-500 scale-110' : 'text-gray-300'}`}><User size={28} fill={view === 'profile' ? 'currentColor' : 'none'} /></button>
        </nav>
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

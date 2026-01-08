
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, MessageCircle, User, Loader2, X, Heart, Send, Sparkles, MapPin, RefreshCw, Settings, ArrowRight, BadgeCheck, Camera, MoreHorizontal } from 'lucide-react';
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
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMatchSplash, setShowMatchSplash] = useState<UserProfile | null>(null);
  const [matchNotification, setMatchNotification] = useState<UserProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tgUser?.photo_url && tgUser.photo_url !== user.imageUrl) {
      setUser(prev => ({ ...prev, imageUrl: tgUser.photo_url }));
    }
  }, [tgUser?.photo_url]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(matches));
  }, [matches, STORAGE_KEY_MATCHES]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ ...user, lastActive: Date.now() }));
  }, [user, STORAGE_KEY_USER]);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
    }
    if (user.onboarded) {
      setView('discovery');
      loadInitialProfiles();
    }
  }, []);

  const scoreProfile = useCallback((profile: UserProfile): number => {
    let score = 0;
    if (profile.type === 'real') score += 5000;
    if (profile.distanceKm !== undefined) score += Math.max(0, 1000 - profile.distanceKm * 20);
    const sharedInterests = profile.interests.filter(i => user.interests.includes(i));
    score += sharedInterests.length * 200;
    const hoursSinceActive = (Date.now() - profile.lastSeen) / (1000 * 60 * 60);
    if (hoursSinceActive < 24) score += 300;
    if (profile.isVerified) score += 150;
    if (profile.isPremium) score += 200;
    if (profile.age >= user.settings.minAge && profile.age <= user.settings.maxAge) score += 400;
    return score;
  }, [user]);

  const loadInitialProfiles = async () => {
    setIsLoading(true);
    const aiProfiles = await generateAIProfiles(8, user);
    const simulatedRealProfiles: UserProfile[] = [
      {
        id: 'real-1',
        name: 'Malika',
        age: 22,
        bio: 'Sanʼat va kitoblarni yaxshi koʻraman 🎨',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
        interests: ['Art', 'Books', 'Music'],
        location: user.location?.city || 'Tashkent',
        distance: '2 km away',
        distanceKm: 2,
        type: 'real',
        isVerified: true,
        lastSeen: Date.now() - 5000,
      },
      {
        id: 'real-2',
        name: 'Jasur',
        age: 25,
        bio: 'Futbol va sayohat — mening hayotim ⚽️✈️',
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop',
        interests: ['Football', 'Travel', 'Tech'],
        location: user.location?.city || 'Tashkent',
        distance: '5 km away',
        distanceKm: 5,
        type: 'real',
        isPremium: true,
        lastSeen: Date.now() - 120000,
      }
    ];
    const allProfiles = [...aiProfiles, ...simulatedRealProfiles];
    const scoredProfiles = allProfiles
      .map(p => ({ ...p, score: scoreProfile(p) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    setProfiles(scoredProfiles);
    setIsLoading(false);
  };

  const handleGenerateBio = async () => {
    if (!user.name || user.interests.length === 0) return;
    setIsGeneratingBio(true);
    try {
      const bio = await generateSmartBio(user.name, user.age, user.interests);
      setUser(prev => ({ ...prev, bio }));
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleLocationRequest = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const city = await getCityName(latitude, longitude);
      setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude, city } }));
    });
  };

  const triggerAIInitiation = async (matchId: string, profile: UserProfile) => {
    setTimeout(async () => {
      setIsTyping(true);
      const firstReply = await getAIReply(profile, []);
      setIsTyping(false);
      const aiMsg: Message = { id: Date.now().toString(), senderId: profile.id, text: firstReply, timestamp: Date.now() };
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, messages: [aiMsg], lastMessage: firstReply } : m));
      setActiveMatch(current => current?.id === matchId ? { ...current, messages: [aiMsg], lastMessage: firstReply } : current);
    }, 2000);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const swipedProfile = profiles[0];
    if (!swipedProfile) return;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(direction === 'right' ? 'medium' : 'light');
    }
    if (direction === 'right' && (swipedProfile.type === 'ai' || Math.random() > 0.5)) {
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
      const scoredMore = more.map(p => ({ ...p, score: scoreProfile(p) }));
      setProfiles(prev => [...prev, ...scoredMore].sort((a, b) => (b.score || 0) - (a.score || 0)));
    }
  }, [profiles, tg, user, view, scoreProfile]);

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
      
      // Simulate human-like thinking delay proportional to text length
      const thinkingDelay = Math.min(3000, Math.max(1000, replyText.length * 20));
      setTimeout(() => {
        setIsTyping(false);
        const aiMsg: Message = { id: (Date.now() + 1).toString(), senderId: activeMatch.user.id, text: replyText, timestamp: Date.now() };
        const finalMatch = { ...updatedMatch, messages: [...updatedMatch.messages, aiMsg], lastMessage: replyText };
        setMatches(prev => prev.map(m => m.id === currentMatchId ? finalMatch : m));
        setActiveMatch(current => current?.id === currentMatchId ? finalMatch : current);
      }, thinkingDelay);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMatch?.messages, isTyping]);

  const renderIntro = () => (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-8">
          <Flame size={48} fill="currentColor" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">TeleMatch</h2>
        <p className="text-gray-500 text-lg font-medium">Profilingiz Telegram orqali avtomatik yaratiladi.</p>
      </div>
      <div className="p-10">
        <button onClick={() => setView('onboarding')} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          Boshlash <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderOnboarding = () => (
    <div className="flex-1 flex flex-col p-6 bg-white overflow-y-auto">
      <div className="mt-4 mb-8 text-center">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Ma'lumotlaringiz</h1>
        <div className="mt-2 flex items-center justify-center gap-2 text-blue-500 bg-blue-50 py-2 px-4 rounded-full inline-flex">
          <BadgeCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Telegram bilan sinxronlangan</span>
        </div>
      </div>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-full h-40 rounded-3xl bg-gray-100 overflow-hidden border border-gray-100">
                <img src={user.coverImageUrl} className="w-full h-full object-cover opacity-60" />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                    <img src={user.imageUrl} className="w-full h-full object-cover" />
                </div>
            </div>
            <div className="mt-10 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
              Rasm va ismni o'zgartirish uchun Telegram profilingizni tahrirlang
            </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">To'liq ism</label>
          <input type="text" readOnly value={user.name} className="w-full px-5 py-4 bg-gray-100 rounded-2xl text-gray-400 font-bold border-none cursor-not-allowed" />
        </div>
        <div className="flex gap-4">
          <div className="w-24">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Yosh</label>
            <input type="number" value={user.age} onChange={e => setUser(prev => ({ ...prev, age: parseInt(e.target.value) }))} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none text-center font-black focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Qiziqishlar</label>
            <input type="text" placeholder="Tag + Enter" onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !user.interests.includes(val)) {
                    setUser(prev => ({ ...prev, interests: [...prev.interests, val] }));
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.interests.map(i => (
            <span key={i} className="px-3 py-1 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              {i} <X size={12} className="cursor-pointer" onClick={() => setUser(prev => ({ ...prev, interests: prev.interests.filter(item => item !== i) }))} />
            </span>
          ))}
        </div>
        <div className="relative">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">Bio <button onClick={handleGenerateBio} disabled={isGeneratingBio} className="text-pink-500 flex items-center gap-1 normal-case font-black">{isGeneratingBio ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} AI Bio</button></label>
          <textarea value={user.bio} onChange={e => setUser(prev => ({ ...prev, bio: e.target.value }))} rows={3} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-400 text-gray-900 font-bold resize-none" />
        </div>
        <button onClick={handleLocationRequest} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${user.location ? 'bg-green-500 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
          <MapPin size={18} /> {user.location ? `Manzil: ${user.location.city}` : 'Joylashuvni aniqlash'}
        </button>
        <button onClick={() => { if (user.name && user.age >= 18) { setUser(prev => ({ ...prev, onboarded: true })); setView('discovery'); loadInitialProfiles(); } }} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-2xl active:scale-95 transition-all mt-4">
          Tayyor!
        </button>
      </div>
    </div>
  );

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

  const renderMatches = () => (
    <div className="flex-1 overflow-y-auto px-5 py-6 bg-white">
      <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-6">Yangi mosliklar</h2>
      <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide">
        {matches.filter(m => m.messages.length === 0).map(match => (
          <div key={match.id} onClick={() => { setActiveMatch(match); setView('chat'); }} className="flex-shrink-0 flex flex-col items-center cursor-pointer">
            <div className="w-24 h-32 rounded-2xl p-1 border-2 border-pink-500 shadow-lg relative">
              <img src={match.user.imageUrl} className="w-full h-full rounded-xl object-cover" />
              {match.user.type === 'real' && <div className="absolute top-1 right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></div>}
            </div>
            <span className="text-[10px] font-black mt-2 text-gray-900 uppercase">{match.user.name}</span>
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-black mb-4 text-gray-900 tracking-tighter">Suhbatlar</h2>
      <div className="space-y-4">
        {matches.length > 0 ? matches.filter(m => m.messages.length > 0).map(match => (
          <div key={match.id} onClick={() => { setActiveMatch(match); setView('chat'); }} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-3xl cursor-pointer">
            <img src={match.user.imageUrl} className="w-16 h-16 rounded-3xl object-cover shadow-md" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-900 flex items-center gap-1">
                  {match.user.name} 
                  {match.user.isVerified && <BadgeCheck size={14} className="text-blue-500 fill-blue-500" color="white" />}
                </span>
                <span className="text-[10px] font-black text-gray-400">{new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-1 font-bold">{match.lastMessage || `👋 Suhbatni boshlang!`}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-10 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Hali suhbatlar yo'q</div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex-1 overflow-y-auto bg-white pb-20">
      <div className="relative">
        <div className="h-64 overflow-hidden relative">
          <img src={user.coverImageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-white" />
        </div>
        <div className="flex flex-col items-center -mt-16 relative z-10">
          <div className="w-36 h-36 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white relative">
            <img src={user.imageUrl} className="w-full h-full object-cover" />
            {user.isPremium && <div className="absolute bottom-1 right-1 bg-blue-500 p-1 rounded-full border-2 border-white"><BadgeCheck size={14} color="white" fill="currentColor" /></div>}
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 flex items-center gap-2">
            {user.name}, {user.age}
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            <RefreshCw size={10} className="animate-spin-slow" /> Synced with Telegram
          </div>
        </div>
      </div>
      <div className="px-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hikoyalar (Stories)</h3>
          <span className="text-[10px] font-bold text-blue-500">Telegram'dan sinxronlangan</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex-shrink-0 w-20 h-28 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
            <Camera size={20} />
            <span className="text-[8px] font-bold mt-2 uppercase">Yangi</span>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-20 h-28 rounded-2xl bg-gray-100 overflow-hidden border-2 border-blue-500 p-0.5">
               <img src={`https://picsum.photos/seed/story${i+user.id}/200/300`} className="w-full h-full rounded-xl object-cover grayscale-[0.5]" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-10 mt-6 text-center text-sm text-gray-500 leading-relaxed italic">
        "{user.bio || "Salom! Men yangi insonlar bilan tanishishga tayyorman."}"
      </div>
      <div className="px-6 mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 text-center">
            <div className="text-xl font-black text-gray-900">{matches.length}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase">Matchlar</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 text-center">
            <div className="text-xl font-black text-gray-900">{(profiles.length * 1.5).toFixed(0)}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase">Ko'rilgan</div>
          </div>
        </div>
        <button onClick={() => setView('onboarding')} className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between px-6 font-bold text-gray-900 text-sm active:scale-95 transition-all">
            Profilni tahrirlash (Yosh/Bio) <ArrowRight size={16} />
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between px-6 font-bold text-gray-900 text-sm active:scale-95 transition-all">
            Qidiruv filtrlari <Settings size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <style>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .dot-flashing {
          position: relative;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: #94a3b8;
          color: #94a3b8;
          animation: dot-flashing 1s infinite linear alternate;
          animation-delay: 0.5s;
        }
        .dot-flashing::before, .dot-flashing::after {
          content: "";
          display: inline-block;
          position: absolute;
          top: 0;
        }
        .dot-flashing::before {
          left: -12px;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: #94a3b8;
          color: #94a3b8;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 0s;
        }
        .dot-flashing::after {
          left: 12px;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: #94a3b8;
          color: #94a3b8;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 1s;
        }
        @keyframes dot-flashing {
          0% { background-color: #94a3b8; }
          50%, 100% { background-color: #e2e8f0; }
        }
      `}</style>
      <AnimatePresence>
        {matchNotification && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} onClick={() => { 
            const found = matches.find(m => m.user.id === matchNotification.id);
            if (found) setActiveMatch(found);
            setView('chat'); 
            setMatchNotification(null); 
          }} className="fixed top-4 left-4 right-4 z-[110] bg-white rounded-3xl shadow-2xl p-4 flex items-center gap-4 border border-pink-100 cursor-pointer">
            <img src={matchNotification.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
            <div className="flex-1">
              <div className="text-xs font-black text-pink-500 uppercase">Yangi moslik!</div>
              <div className="text-sm font-black text-gray-900">{matchNotification.name} sizga yoqdi!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'intro' && renderIntro()}
        {view === 'onboarding' && renderOnboarding()}
        {view === 'discovery' && renderDiscovery()}
        {view === 'matches' && renderMatches()}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
              <button onClick={() => { setView('matches'); setIsTyping(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              <div className="relative">
                <img src={activeMatch?.user.imageUrl} className="w-12 h-12 rounded-2xl object-cover shadow-md" />
                {activeMatch?.user.type === 'real' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
              </div>
              <div className="flex flex-col">
                <div className="font-black text-sm text-gray-900 uppercase tracking-tight leading-none">{activeMatch?.user.name}</div>
                {isTyping && <div className="text-[10px] font-bold text-blue-500 animate-pulse mt-0.5">yozmoqda...</div>}
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {activeMatch?.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm font-bold shadow-sm ${msg.senderId === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-8 py-5 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center justify-center">
                    <div className="dot-flashing"></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 items-center bg-white safe-area-bottom">
              <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Xabar..." className="flex-1 bg-gray-100 rounded-full px-6 py-4 text-sm focus:outline-none font-bold border-none" />
              <button onClick={handleSendMessage} disabled={!chatMessage.trim() || isTyping} className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-xl disabled:bg-gray-200 transition-all active:scale-90"><Send size={22} /></button>
            </div>
          </div>
        )}
        {view === 'profile' && renderProfile()}
      </main>

      {view !== 'chat' && view !== 'onboarding' && view !== 'intro' && (
        <nav className="flex justify-around items-center py-5 bg-white border-t border-gray-100 safe-area-bottom z-40">
          <button onClick={() => setView('discovery')} className={`p-2 transition-all ${view === 'discovery' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}><Flame size={32} fill={view === 'discovery' ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setView('matches')} className={`p-2 transition-all relative ${view === 'matches' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}>
            <MessageCircle size={32} fill={view === 'matches' ? 'currentColor' : 'none'} />
            {matches.some(m => m.messages.length === 0) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-white"></span>}
          </button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}><User size={32} fill={view === 'profile' ? 'currentColor' : 'none'} /></button>
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
              if (currentMatch) {
                setActiveMatch(currentMatch);
                setView('chat');
              } else {
                setView('matches');
              }
              setShowMatchSplash(null); 
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

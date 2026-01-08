
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, MessageCircle, User, Loader2, X, Heart, Star, Send, Sparkles, MapPin, RefreshCw, Settings, ShieldCheck, Zap, ArrowRight, CheckCircle2, BadgeCheck, Share2, DollarSign, MoreHorizontal } from 'lucide-react';
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
  
  const [view, setView] = useState<ViewState>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('telematch_matches');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [user, setUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('telematch_user');
    if (saved) return JSON.parse(saved);
    
    return {
      name: '',
      age: 21,
      bio: '',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      coverImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop',
      interests: [],
      isVerified: true,
      settings: {
        minAge: 18,
        maxAge: 35,
        distanceLimit: 25,
        discoveryActive: true
      },
      onboarded: false
    };
  });

  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [showMatchSplash, setShowMatchSplash] = useState<UserProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('telematch_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('telematch_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
      
      if (!user.onboarded && tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        setUser(prev => ({
          ...prev,
          name: tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ''),
        }));
      }
    }

    if (user.onboarded) {
      setView('discovery');
      loadInitialProfiles();
    }
  }, []);

  const loadInitialProfiles = async () => {
    setIsLoading(true);
    const newProfiles = await generateAIProfiles(8, user);
    setProfiles(newProfiles);
    setIsLoading(false);
  };

  const handleLocationRequest = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        setIsLoading(true);
        const city = await getCityName(position.coords.latitude, position.coords.longitude);
        setUser(prev => ({
          ...prev,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            city: city
          }
        }));
        setIsLoading(false);
      });
    }
  };

  const handleGenerateBio = async () => {
    if (!user.name || user.interests.length === 0) return;
    setIsGeneratingBio(true);
    const bio = await generateSmartBio(user.name, user.age, user.interests);
    setUser(prev => ({ ...prev, bio }));
    setIsGeneratingBio(false);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const swipedProfile = profiles[0];
    if (!swipedProfile) return;

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(direction === 'right' ? 'medium' : 'light');
    }

    if (direction === 'right' && Math.random() > 0.6) {
      const newMatch: Match = {
        id: `match-${Date.now()}`,
        user: swipedProfile,
        timestamp: Date.now(),
        messages: []
      };
      setMatches(prev => [newMatch, ...prev]);
      setShowMatchSplash(swipedProfile);
      tg?.HapticFeedback?.notificationOccurred('success');
    }

    setProfiles(prev => prev.slice(1));
    if (profiles.length < 3) {
      const more = await generateAIProfiles(5, user);
      setProfiles(prev => [...prev, ...more]);
    }
  }, [profiles, tg, user]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeMatch) return;

    const userMsg: Message = { id: Date.now().toString(), senderId: 'user', text: chatMessage, timestamp: Date.now() };
    const updatedMatch = { ...activeMatch, messages: [...activeMatch.messages, userMsg], lastMessage: chatMessage };

    setMatches(prev => prev.map(m => m.id === activeMatch.id ? updatedMatch : m));
    setActiveMatch(updatedMatch);
    setChatMessage('');

    const history = updatedMatch.messages.map(m => `${m.senderId === 'user' ? 'User' : m.senderId}: ${m.text}`);
    const replyText = await getAIReply(activeMatch.user, history);
    
    const aiMsg: Message = { id: (Date.now() + 1).toString(), senderId: activeMatch.user.id, text: replyText, timestamp: Date.now() };
    const finalMatch = { ...updatedMatch, messages: [...updatedMatch.messages, aiMsg], lastMessage: replyText };

    setMatches(prev => prev.map(m => m.id === activeMatch.id ? finalMatch : m));
    setActiveMatch(finalMatch);
  };

  const renderIntro = () => {
    const slides = [
      {
        icon: <div className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200"><Flame size={48} fill="currentColor" /></div>,
        title: "Xush kelibsiz!",
        desc: "TeleMatch - Telegram ichidagi eng aqlli tanishuv platformasi."
      },
      {
        icon: <div className="w-24 h-24 bg-pink-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-pink-200"><Sparkles size={48} /></div>,
        title: "AI Yordamchi",
        desc: "Gemini AI sizga mos keladigan eng yaxshi profillarni topib beradi."
      },
      {
        icon: <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-green-200"><ShieldCheck size={48} /></div>,
        title: "Xavfsiz va Maxfiy",
        desc: "Telegram profilingiz bilan to'liq himoyalangan va xavfsiz suhbatlar."
      },
      {
        icon: <div className="w-24 h-24 bg-gray-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-gray-400"><Heart size={48} fill="currentColor" /></div>,
        title: "Tayyormisiz?",
        desc: "O'zingizga mos juftlikni topish uchun atigi bir necha qadam qoldi."
      }
    ];

    const nextSlide = () => {
      if (introStep < slides.length - 1) {
        setIntroStep(prev => prev + 1);
      } else {
        setView('onboarding');
      }
    };

    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={introStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center"
            >
              <div className="mb-8">{slides[introStep].icon}</div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{slides[introStep].title}</h2>
              <p className="text-gray-500 text-lg font-medium leading-relaxed">{slides[introStep].desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-10 flex flex-col items-center gap-8">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === introStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-200'}`}
              />
            ))}
          </div>

          <button 
            onClick={nextSlide}
            className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {introStep === slides.length - 1 ? "Boshlash" : "Keyingisi"}
            <ArrowRight size={20} />
          </button>
          
          {introStep < slides.length - 1 && (
            <button 
              onClick={() => setView('onboarding')}
              className="text-gray-400 font-bold text-sm uppercase tracking-widest"
            >
              O'tkazib yuborish
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOnboarding = () => (
    <div className="flex-1 flex flex-col p-6 bg-white overflow-y-auto">
      <div className="mt-4 mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
          <CheckCircle2 size={12} /> Profilni sozlash
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">O'zingiz haqingizda</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">Boshqalar sizni yaxshiroq tanishi uchun</p>
      </div>

      <div className="space-y-6 pb-10">
        <div className="flex flex-col items-center gap-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avatar & Cover</div>
            <div className="relative w-full h-40 rounded-3xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-200 group">
                <img src={user.coverImageUrl} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[10px] font-black uppercase tracking-widest">Orqa fon rasmi</div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                    <img src={user.imageUrl} className="w-full h-full object-cover" />
                </div>
            </div>
            <div className="mt-12 text-xs font-bold text-blue-500 cursor-pointer">Rasmlarni o'zgartirish</div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">To'liq ism</label>
          <input 
            type="text"
            value={user.name}
            onChange={e => setUser(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-gray-900 font-bold border border-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Ismingizni yozing..."
          />
        </div>

        <div className="flex gap-4">
          <div className="w-24">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Yosh</label>
            <input 
              type="number" 
              value={user.age}
              onChange={e => setUser(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none text-center font-black focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Qiziqishlar</label>
            <input 
              type="text" 
              placeholder="Tag + Enter"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !user.interests.includes(val)) {
                    setUser(prev => ({ ...prev, interests: [...prev.interests, val] }));
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-blue-400"
            />
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
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">
            Bio
            <button onClick={handleGenerateBio} disabled={isGeneratingBio} className="text-pink-500 flex items-center gap-1 normal-case font-black">
              {isGeneratingBio ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} AI Bio yaratish
            </button>
          </label>
          <textarea 
            value={user.bio}
            onChange={e => setUser(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="O'zingiz haqingizda bir oz..."
            rows={3}
            className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-400 text-gray-900 font-bold resize-none"
          />
        </div>

        <button 
          onClick={handleLocationRequest}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${user.location ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-blue-50 text-blue-600'}`}
        >
          <MapPin size={18} />
          {user.location ? `Manzil: ${user.location.city}` : 'Joylashuvni aniqlash'}
        </button>

        <button 
          onClick={() => {
            if (user.name && user.age >= 18) {
              setUser(prev => ({ ...prev, onboarded: true }));
              setView('discovery');
              loadInitialProfiles();
            }
          }}
          disabled={!user.name || user.age < 18}
          className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-2xl disabled:opacity-50 active:scale-95 transition-all mt-4"
        >
          Tayyorman!
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
              <Card 
                key={profile.id} 
                profile={profile} 
                isTop={index === 1 || profiles.length === 1}
                onSwipe={handleSwipe}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-black uppercase tracking-widest text-[10px]">Atrofingizdagilar qidirilmoqda...</p>
          </div>
        )}
      </div>

      <div className="flex justify-center items-center gap-6 py-6 z-20">
        <button onClick={() => handleSwipe('left')} className="w-14 h-14 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center bg-white shadow-xl active:scale-75 transition-transform"><X size={28} /></button>
        <button className="w-12 h-12 rounded-full border-2 border-blue-400 text-blue-400 flex items-center justify-center bg-white shadow-xl active:scale-75 transition-transform"><Star size={24} fill="currentColor" /></button>
        <button onClick={() => handleSwipe('right')} className="w-14 h-14 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center bg-white shadow-xl active:scale-75 transition-transform"><Heart size={28} fill="currentColor" /></button>
      </div>
    </div>
  );

  const renderMatches = () => (
    <div className="flex-1 overflow-y-auto px-5 py-6 bg-white">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Yangi mosliklar</h2>
        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1"><Zap size={10} fill="currentColor" /> Premium</span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide">
        <div className="flex-shrink-0 w-24 h-32 rounded-2xl bg-gradient-to-br from-pink-100 to-orange-50 border-2 border-pink-200 flex flex-col items-center justify-center relative overflow-hidden">
          <img src="https://picsum.photos/seed/like1/100/100" className="absolute inset-0 w-full h-full object-cover blur-md opacity-40" />
          <Heart size={24} className="text-pink-500 relative z-10" fill="currentColor" />
          <span className="text-[10px] font-black text-pink-600 relative z-10 mt-1 uppercase">12 Like</span>
        </div>
        
        {matches.filter(m => m.messages.length === 0).map(match => (
          <div key={match.id} onClick={() => { setActiveMatch(match); setView('chat'); }} className="flex-shrink-0 flex flex-col items-center cursor-pointer">
            <div className="w-24 h-32 rounded-2xl p-1 border-2 border-pink-500 shadow-lg overflow-hidden relative">
              <img src={match.user.imageUrl} className="w-full h-full rounded-xl object-cover" />
              <div className="absolute bottom-1 left-1 bg-pink-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Yangi</div>
            </div>
            <span className="text-[10px] font-black mt-2 text-gray-900 uppercase tracking-widest">{match.user.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-black mb-4 text-gray-900 tracking-tighter">Suhbatlar</h2>
      <div className="space-y-4">
        {matches.length > 0 ? matches.map(match => (
          <div key={match.id} onClick={() => { setActiveMatch(match); setView('chat'); }} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-3xl cursor-pointer transition-all border border-transparent hover:border-gray-100">
            <div className="relative shrink-0">
              <img src={match.user.imageUrl} className="w-16 h-16 rounded-3xl object-cover shadow-md" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-gray-900">{match.user.name}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-1 font-bold">{match.lastMessage || `👋 Salom deying!`}</p>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="opacity-20" />
            </div>
            <p className="font-black uppercase tracking-widest text-[10px]">Hozircha suhbatlar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex-1 overflow-y-auto bg-white pb-20">
      {/* Upper Profile Section based on the provided image */}
      <div className="relative">
        <div className="relative h-64 overflow-hidden">
            <img src={user.coverImageUrl} className="w-full h-full object-cover scale-110 blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white"></div>
            
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <button onClick={() => setView('discovery')} className="p-2.5 bg-white/20 backdrop-blur-xl rounded-full text-white shadow-xl hover:bg-white/40 transition-all">
                    <ArrowRight className="rotate-180" size={18} />
                </button>
                <div className="text-white font-black text-sm tracking-widest drop-shadow-md">kristin_watson</div>
            </div>

            <button className="absolute top-6 right-6 p-2.5 bg-white/20 backdrop-blur-xl rounded-full text-white shadow-xl">
                <MoreHorizontal size={20} />
            </button>
        </div>

        <div className="flex flex-col items-center -mt-16 relative z-10">
          <div className="relative w-36 h-36 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white">
            <img src={user.imageUrl} className="w-full h-full object-cover" />
          </div>
          
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                {user.isVerified && <BadgeCheck size={20} className="text-blue-500 fill-blue-500" strokeWidth={2.5} color="white" />}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-10 mt-6 text-center">
        <p className={`text-sm font-medium text-gray-500 leading-relaxed ${bioExpanded ? '' : 'line-clamp-2'}`}>
          {user.bio || "I'm a generous and lively girl, hope my enthusiasm can add more color to your life..."}
        </p>
        <button onClick={() => setBioExpanded(!bioExpanded)} className="mt-1 text-blue-600 font-black text-xs uppercase tracking-tighter">
            {bioExpanded ? "Less" : "More"}
        </button>
      </div>

      <div className="px-6 mt-8 flex items-center gap-3">
        <button className="flex-1 py-4 bg-gray-50 rounded-2xl font-black text-gray-900 text-sm tracking-tight shadow-sm active:scale-95 transition-all">
            Message
        </button>
        <button className="w-14 h-14 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-900 shadow-sm active:scale-90 transition-all">
            <DollarSign size={20} />
        </button>
        <button className="w-14 h-14 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-900 shadow-sm active:scale-90 transition-all">
            <Share2 size={20} />
        </button>
      </div>

      <div className="px-6 mt-10 space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Profil sozlamalari</h3>
        <button onClick={() => setView('onboarding')} className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between px-6 active:scale-98 transition-all group">
            <span className="font-bold text-gray-900 text-sm">Ma'lumotlarni tahrirlash</span>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between px-6 active:scale-98 transition-all group">
            <span className="font-bold text-gray-900 text-sm">Qidiruv filtrlari</span>
            <Settings size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
        </button>

        {showSettings && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <span>Yosh oralig'i</span>
                        <span className="text-blue-600">{user.settings.minAge} - {user.settings.maxAge}</span>
                    </div>
                    <input 
                        type="range" 
                        min="18" max="60" 
                        value={user.settings.maxAge}
                        onChange={e => setUser(prev => ({ ...prev, settings: { ...prev.settings, maxAge: parseInt(e.target.value) } }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                    />
                </div>
            </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {view !== 'intro' && view !== 'onboarding' && view !== 'chat' && view !== 'profile' && (
        <header className="px-6 py-5 flex justify-between items-center border-b bg-white z-40">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xl">TM</div>
            <span className="font-black text-gray-900 tracking-tighter text-2xl uppercase">TeleMatch</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-tighter flex items-center gap-1">
              <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> Live
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'intro' && renderIntro()}
        {view === 'onboarding' && renderOnboarding()}
        {view === 'discovery' && renderDiscovery()}
        {view === 'matches' && renderMatches()}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex items-center gap-3 p-4 border-b">
              <button onClick={() => setView('matches')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              <img src={activeMatch?.user.imageUrl} className="w-12 h-12 rounded-2xl object-cover shadow-lg" />
              <div>
                <div className="font-black text-sm text-gray-900 uppercase tracking-tight">{activeMatch?.user.name}</div>
                <div className="text-[10px] text-green-500 flex items-center gap-1 font-black uppercase tracking-tighter"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</div>
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
            </div>
            <div className="p-4 border-t flex gap-2 items-center bg-white safe-area-bottom">
              <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Xabar yozing..." className="flex-1 bg-gray-100 rounded-full px-6 py-4 text-sm focus:outline-none font-bold border-none" />
              <button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-300 shadow-xl transition-all active:scale-90"><Send size={22} /></button>
            </div>
          </div>
        )}
        {view === 'profile' && renderProfile()}
      </main>

      {view !== 'chat' && view !== 'onboarding' && view !== 'intro' && (
        <nav className="flex justify-around items-center py-5 bg-white border-t border-gray-100 z-40 safe-area-bottom px-6">
          <button onClick={() => setView('discovery')} className={`p-2 transition-all duration-300 ${view === 'discovery' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}><Flame size={32} fill={view === 'discovery' ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setView('matches')} className={`p-2 transition-all duration-300 relative ${view === 'matches' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}><MessageCircle size={32} fill={view === 'matches' ? 'currentColor' : 'none'} />{matches.some(m => m.messages.length === 0) && <span className="absolute top-1 right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-white shadow-sm"></span>}</button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all duration-300 ${view === 'profile' ? 'text-pink-500 scale-125' : 'text-gray-300'}`}><User size={32} fill={view === 'profile' ? 'currentColor' : 'none'} /></button>
        </nav>
      )}

      <AnimatePresence>
        {showMatchSplash && (
          <MatchSplash match={showMatchSplash} onClose={() => setShowMatchSplash(null)} onChat={() => {
            const currentMatch = matches.find(m => m.user.id === showMatchSplash.id);
            if (currentMatch) setActiveMatch(currentMatch);
            setShowMatchSplash(null);
            setView('chat');
          }} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

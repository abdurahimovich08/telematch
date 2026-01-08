
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Heart, X } from 'lucide-react';
import { UserProfile } from '../types';

interface MatchSplashProps {
  match: UserProfile;
  userImageUrl: string;
  onClose: () => void;
  onChat: () => void;
}

const MatchSplash: React.FC<MatchSplashProps> = ({ match, userImageUrl, onClose, onChat }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-pink-600/20 blur-[120px] rounded-full"></div>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-12 right-6 p-2 text-white/50 hover:text-white transition-colors"
      >
        <X size={32} />
      </button>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="mb-16 relative"
      >
        <div className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
          It's a Match!
        </div>
        <div className="text-white/80 font-bold mt-2 text-lg uppercase tracking-widest text-center">
          You and {match.name} liked each other
        </div>
      </motion.div>

      <div className="flex justify-center items-center mb-16 relative w-full h-48">
        <motion.div
          initial={{ x: -100, opacity: 0, rotate: -15 }}
          animate={{ x: 20, opacity: 1, rotate: -10 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
          className="relative z-10"
        >
          <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-2xl overflow-hidden ring-4 ring-pink-500/30">
            <img src={userImageUrl} className="w-full h-full object-cover" alt="You" />
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 100, opacity: 0, rotate: 15 }}
          animate={{ x: -20, opacity: 1, rotate: 10 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
          className="relative z-20"
        >
          <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-2xl overflow-hidden ring-4 ring-pink-500/30">
            <img src={match.imageUrl} className="w-full h-full object-cover" alt={match.name} />
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-2xl"
        >
          <Heart size={32} className="text-pink-500 fill-pink-500" />
        </motion.div>
      </div>

      <div className="w-full space-y-5 max-w-sm relative z-40">
        <motion.button 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onChat}
          className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-black text-lg shadow-xl shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <MessageSquare size={24} fill="white" />
          Suhbat boshlash
        </motion.button>
        
        <motion.button 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          onClick={onClose}
          className="w-full py-5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full font-black text-lg active:scale-95 transition-all uppercase tracking-widest"
        >
          Keyingisi
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MatchSplash;

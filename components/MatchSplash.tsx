
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Heart } from 'lucide-react';
import { UserProfile } from '../types';

interface MatchSplashProps {
  match: UserProfile;
  onClose: () => void;
  onChat: () => void;
}

const MatchSplash: React.FC<MatchSplashProps> = ({ match, onClose, onChat }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-white text-center"
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10 }}
        className="mb-12 relative"
      >
        <div className="text-5xl font-black mb-2 tracking-tighter">IT'S A MATCH!</div>
        <div className="text-pink-500 font-medium">You and {match.name} liked each other</div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-10 -right-10 text-pink-500"
        >
          <Heart size={64} fill="currentColor" />
        </motion.div>
      </motion.div>

      <div className="flex gap-4 mb-12">
        <div className="relative">
          <img 
            src="https://picsum.photos/seed/user/200" 
            className="w-32 h-32 rounded-full border-4 border-white object-cover" 
            alt="You"
          />
        </div>
        <div className="relative">
          <img 
            src={match.imageUrl} 
            className="w-32 h-32 rounded-full border-4 border-white object-cover" 
            alt={match.name}
          />
        </div>
      </div>

      <div className="w-full space-y-4">
        <button 
          onClick={onChat}
          className="w-full py-4 bg-pink-500 rounded-full font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <MessageSquare size={20} />
          Send a Message
        </button>
        <button 
          onClick={onClose}
          className="w-full py-4 border border-white/20 rounded-full font-semibold hover:bg-white/10 active:scale-95 transition-transform"
        >
          Keep Swiping
        </button>
      </div>
    </motion.div>
  );
};

export default MatchSplash;

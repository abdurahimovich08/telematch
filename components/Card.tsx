
import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { UserProfile } from '../types';
import { MapPin, Info } from 'lucide-react';

interface CardProps {
  profile: UserProfile;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const Card: React.FC<CardProps> = ({ profile, onSwipe, isTop }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 pointer-events-none">
        <img 
          src={profile.imageUrl} 
          alt={profile.name} 
          className="w-full h-full object-cover select-none"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
          <h2 className="text-2xl font-bold">{profile.name}, {profile.age}</h2>
          <div className="flex items-center gap-1 mt-1 text-sm opacity-90">
            <MapPin size={14} />
            <span>{profile.distance} away</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100 cursor-grab active:cursor-grabbing z-10"
    >
      <img 
        src={profile.imageUrl} 
        alt={profile.name} 
        className="w-full h-full object-cover select-none pointer-events-none"
      />

      {/* Like/Nope Overlays */}
      <motion.div 
        style={{ opacity: likeOpacity }}
        className="absolute top-10 left-10 border-4 border-green-500 rounded px-4 py-2 transform -rotate-12 z-20 pointer-events-none"
      >
        <span className="text-green-500 font-bold text-4xl uppercase">Like</span>
      </motion.div>

      <motion.div 
        style={{ opacity: nopeOpacity }}
        className="absolute top-10 right-10 border-4 border-red-500 rounded px-4 py-2 transform rotate-12 z-20 pointer-events-none"
      >
        <span className="text-red-500 font-bold text-4xl uppercase">Nope</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white pointer-events-none">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
            <div className="flex items-center gap-1 mt-1 text-sm opacity-90 font-medium">
              <MapPin size={16} />
              <span>{profile.location} • {profile.distance}</span>
            </div>
          </div>
          <button className="bg-white/20 p-2 rounded-full backdrop-blur-md">
            <Info size={20} />
          </button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.interests.slice(0, 3).map((interest, i) => (
            <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium border border-white/20">
              {interest}
            </span>
          ))}
        </div>
        
        <p className="mt-4 text-sm line-clamp-2 opacity-80 leading-relaxed italic">
          "{profile.bio}"
        </p>
      </div>
    </motion.div>
  );
};

export default Card;

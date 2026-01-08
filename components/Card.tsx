
import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { UserProfile } from '../types';
import { MapPin, BadgeCheck } from 'lucide-react';

interface CardProps {
  profile: UserProfile;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const Card: React.FC<CardProps> = ({ profile, onSwipe, isTop }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const matchPercent = Math.floor(Math.random() * (98 - 75 + 1) + 75);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const cardContent = (
    <div className="relative w-full h-full rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
      <img 
        src={profile.imageUrl} 
        alt={profile.name} 
        className="w-full h-full object-cover select-none pointer-events-none"
      />
      
      {/* Match Percentage Badge */}
      <div className="absolute top-6 left-6 glass px-4 py-2 rounded-full text-[12px] font-bold text-white z-20">
        Match {matchPercent}%
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent text-white pointer-events-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-extrabold flex items-center gap-2">
            {profile.name}, {profile.age}
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
          </h2>
          <div className="flex items-center gap-1.5 opacity-70 text-sm font-medium">
            <MapPin size={16} className="text-white/60" />
            <span>{profile.city || profile.location}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isTop) {
    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none transform scale-[0.95] translate-y-4 opacity-50 transition-all duration-300">
        {cardContent}
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
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
    >
      {cardContent}
    </motion.div>
  );
};

export default Card;

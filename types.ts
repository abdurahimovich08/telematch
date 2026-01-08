
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  imageUrl: string;
  coverImageUrl?: string;
  interests: string[];
  location: string;
  city?: string;
  distance: string;
  distanceKm?: number;
  isVerified?: boolean;
  isPremium?: boolean;
  type: 'real' | 'ai';
  lastSeen: number; // timestamp
  score?: number; // saralash balli
}

export interface UserAccount {
  id: string; // Telegram User ID
  name: string;
  age: number;
  bio: string;
  imageUrl: string;
  coverImageUrl?: string;
  interests: string[];
  isVerified?: boolean;
  isPremium?: boolean;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
  settings: {
    minAge: number;
    maxAge: number;
    distanceLimit: number;
    discoveryActive: boolean;
  };
  onboarded: boolean;
  lastActive: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Match {
  id: string;
  user: UserProfile;
  lastMessage?: string;
  timestamp: number;
  messages: Message[];
  isPremium?: boolean;
}

export type ViewState = 'intro' | 'onboarding' | 'discovery' | 'matches' | 'chat' | 'profile';

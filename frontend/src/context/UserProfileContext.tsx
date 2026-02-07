import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserProfile, PurchaseRecord, SavedCard } from '../types';

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  savedCard: SavedCard | null;
  setSavedCard: (card: SavedCard) => void;
  purchases: PurchaseRecord[];
  addPurchase: (purchase: PurchaseRecord) => void;
  watchlist: string[];
  addToWatchlist: (productId: string) => void;
  removeFromWatchlist: (productId: string) => void;
}

const defaultProfile: UserProfile = {
  price_sensitivity: 'balanced',
  shipping_preference: 'normal',
  preferred_brands: [],
  saved_card: null,
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('cliq_profile');
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cliq_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cliq_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cliq_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('cliq_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('cliq_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const setSavedCard = (card: SavedCard) => {
    setProfile((prev) => ({ ...prev, saved_card: card }));
  };

  const addPurchase = (purchase: PurchaseRecord) => {
    setPurchases((prev) => [purchase, ...prev]);
  };

  const addToWatchlist = (productId: string) => {
    setWatchlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  };

  const removeFromWatchlist = (productId: string) => {
    setWatchlist((prev) => prev.filter((id) => id !== productId));
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        savedCard: profile.saved_card || null,
        setSavedCard,
        purchases,
        addPurchase,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error('useUserProfile must be used within UserProfileProvider');
  return context;
}

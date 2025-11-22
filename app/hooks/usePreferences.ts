import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

export interface UploadSettings {
  maxSize: number;
  allowedTypes: string[];
  autoProcess: boolean;
  retryAttempts: number;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  defaultArc: string;
  uploadSettings: UploadSettings;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  defaultArc: 'Heartbreak -> Reflection -> Rising Hope -> Climax -> Afterglow',
  uploadSettings: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'],
    autoProcess: true,
    retryAttempts: 3
  }
};

// Cache for preferences by user ID
const preferencesCache = new Map<string, UserPreferences>();

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Check cache on mount
  useEffect(() => {
    if (user?.uid && preferencesCache.has(user.uid)) {
      setPreferences(preferencesCache.get(user.uid)!);
      setLoading(false);
      setInitialized(true);
    }
  }, [user?.uid]);

  // Subscribe to changes and handle preference updates
  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    // Subscribe to preferences changes
    const unsubscribe = onSnapshot(
      doc(db, 'preferences', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const validatedPrefs = validatePreferences(data);
          setPreferences(validatedPrefs);
          preferencesCache.set(user.uid, validatedPrefs);
        } else {
          // Initialize preferences if they don't exist
          const prefRef = doc(db, 'preferences', user.uid);
          setDoc(prefRef, defaultPreferences);
          setPreferences(defaultPreferences);
          preferencesCache.set(user.uid, defaultPreferences);
        }
        setLoading(false);
        setInitialized(true);
      },
      (error) => {
        console.error('Error fetching preferences:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Function to validate preferences data
  const validatePreferences = (data: any): UserPreferences => {
    const prefs: UserPreferences = { ...defaultPreferences };

    if (data?.theme && ['dark', 'light', 'system'].includes(data.theme)) {
      prefs.theme = data.theme;
    }

    if (data?.defaultArc && typeof data.defaultArc === 'string') {
      prefs.defaultArc = data.defaultArc;
    }

    if (data?.uploadSettings) {
      const settings = data.uploadSettings;
      if (typeof settings.maxSize === 'number') {
        prefs.uploadSettings.maxSize = settings.maxSize;
      }
      if (Array.isArray(settings.allowedTypes)) {
        prefs.uploadSettings.allowedTypes = settings.allowedTypes.filter(
          (type): type is string => typeof type === 'string'
        );
      }
      if (typeof settings.autoProcess === 'boolean') {
        prefs.uploadSettings.autoProcess = settings.autoProcess;
      }
      if (typeof settings.retryAttempts === 'number') {
        prefs.uploadSettings.retryAttempts = settings.retryAttempts;
      }
    }

    return prefs;
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const newPreferences = { ...preferences, ...updates };
      await setDoc(doc(db, 'preferences', user.uid), newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setError(error as Error);
      throw error;
    }
  };

  const resetPreferences = async () => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'preferences', user.uid), defaultPreferences);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      setError(error as Error);
      throw error;
    }
  };

  return {
    preferences,
    loading,
    error,
    initialized,
    updatePreferences,
    resetPreferences
  };
}
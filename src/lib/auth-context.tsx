import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { dataManager, Profile, UserRole } from './data-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, wing: string, flatNumber: string, phone: string) => Promise<{ error: any | null }>;
  signInAsMock: (role: 'admin' | 'owner' | 'renter' | 'pending' | 'guard') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleMockMode: (mock: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMock, setIsMock] = useState<boolean>(dataManager.isMockMode());

  // Listen for Supabase session changes
  useEffect(() => {
    let authSubscription: any;

    const checkInitialSession = async () => {
      // Check if we previously logged in as a mock user
      const mockUserId = await AsyncStorage.getItem('sync_logged_mock_user_id');
      
      if (mockUserId && dataManager.isMockMode()) {
        const mockProfile = await dataManager.getProfile(mockUserId);
        if (mockProfile) {
          setUser({ id: mockUserId, email: `${mockProfile.role}@societysync.demo` });
          setProfile(mockProfile);
          setLoading(false);
          return;
        }
      }

      if (!dataManager.isMockMode()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          const prof = await dataManager.getProfile(session.user.id);
          setProfile(prof);
        }

        // Set up real listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            setUser(session.user);
            const prof = await dataManager.getProfile(session.user.id);
            setProfile(prof);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        });
        authSubscription = subscription;
      } else {
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [isMock]);

  const toggleMockMode = (mock: boolean) => {
    dataManager.setMockMode(mock);
    setIsMock(mock);
    setUser(null);
    setProfile(null);
    AsyncStorage.removeItem('sync_logged_mock_user_id');
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await dataManager.getProfile(user.id);
      setProfile(prof);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isMock) {
        // Mock sign in: look for matching mock profile by email prefix or full name matching
        const profiles = await dataManager.getAllProfiles();
        // Simple mock matching: if email starts with 'admin', 'owner', 'renter', 'pending', etc.
        const role = email.split('@')[0].toLowerCase();
        let matched = profiles.find(p => p.role === role && p.status === 'approved');
        if (role === 'pending') matched = profiles.find(p => p.status === 'pending');
        if (role === 'guard') matched = profiles.find(p => p.id === 'mock-guard');

        if (!matched) {
          // Default fallback mock user
          matched = profiles[0];
        }

        await AsyncStorage.setItem('sync_logged_mock_user_id', matched.id);
        setUser({ id: matched.id, email });
        setProfile(matched);
        setLoading(false);
        return { error: null };
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(data.user);
        const prof = await dataManager.getProfile(data.user!.id);
        setProfile(prof);
        setLoading(false);
        return { error: null };
      }
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || e };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole, 
    wing: string, 
    flatNumber: string, 
    phone: string
  ) => {
    setLoading(true);
    try {
      if (isMock) {
        const mockId = `mock-user-${Date.now()}`;
        const newProfile: Profile = {
          id: mockId,
          email,
          full_name: fullName,
          role,
          wing,
          flat_number: flatNumber,
          phone,
          society_name: 'SocietySync Co-Op Housing',
          status: 'pending'
        };
        await dataManager.registerProfile(newProfile);
        
        // Auto sign in as the registered user, but they will be stuck at pending approval screen!
        await AsyncStorage.setItem('sync_logged_mock_user_id', mockId);
        setUser({ id: mockId, email });
        setProfile(newProfile);
        setLoading(false);
        return { error: null };
      } else {
        // Sign up in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              wing,
              flat_number: flatNumber,
              phone_number: phone
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          setUser(data.user);
          // Wait briefly for the postgres trigger to run and create the profile
          await new Promise(resolve => setTimeout(resolve, 1500));
          const prof = await dataManager.getProfile(data.user.id);
          setProfile(prof);
        }
        setLoading(false);
        return { error: null };
      }
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || e };
    }
  };

  const signInAsMock = async (role: 'admin' | 'owner' | 'renter' | 'pending' | 'guard') => {
    setLoading(true);
    // Force mock mode
    if (!isMock) {
      toggleMockMode(true);
    }
    const profiles = await dataManager.getAllProfiles();
    let matched: Profile | undefined;
    
    if (role === 'admin') matched = profiles.find(p => p.id === 'mock-admin');
    else if (role === 'owner') matched = profiles.find(p => p.id === 'mock-owner');
    else if (role === 'renter') matched = profiles.find(p => p.id === 'mock-renter');
    else if (role === 'guard') matched = profiles.find(p => p.id === 'mock-guard');
    else if (role === 'pending') matched = profiles.find(p => p.id === 'mock-pending');

    if (matched) {
      await AsyncStorage.setItem('sync_logged_mock_user_id', matched.id);
      setUser({ id: matched.id, email: `${role}@societysync.demo` });
      setProfile(matched);
    }
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isMock) {
        await AsyncStorage.removeItem('sync_logged_mock_user_id');
      } else {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Signout error', e);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isMock,
      signIn,
      signUp,
      signInAsMock,
      signOut,
      refreshProfile,
      toggleMockMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

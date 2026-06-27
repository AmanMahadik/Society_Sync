import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { dataManager, Profile, UserRole } from './data-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Complete the OAuth session redirect in WebBrowser on native platforms
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, wing: string, flatNumber: string, phone: string) => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Listen for Supabase session changes and deep links
  useEffect(() => {
    let authSubscription: any;
    let linkingSubscription: any;

    const handleDeepLink = async (url: string) => {
      try {
        const params: { [key: string]: string } = {};
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          hash.split('&').forEach(pair => {
            const [key, val] = pair.split('=');
            if (key && val) params[key] = decodeURIComponent(val);
          });
        }
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          const query = url.substring(queryIndex + 1);
          query.split('&').forEach(pair => {
            const [key, val] = pair.split('=');
            if (key && val) params[key] = decodeURIComponent(val);
          });
        }
        
        const { access_token, refresh_token, type } = params;
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error && (url.includes('change-password') || type === 'recovery')) {
            setTimeout(() => {
              try {
                router.replace('/change-password?recovery=true');
              } catch (e) {
                console.error('Deep link navigation error:', e);
              }
            }, 800);
          }
        }
      } catch (e) {
        console.error('Error handling deep link:', e);
      }
    };

    const checkInitialSession = async () => {
      try {
        // Parse initial URL if app was launched via deep link
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleDeepLink(initialUrl);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          const prof = await dataManager.getProfile(session.user.id);
          setProfile(prof);
        }
      } catch (e) {
        console.error('Session check error', e);
      } finally {
        setLoading(false);
      }

      // Set up real listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setLoading(true);
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
    };

    checkInitialSession();

    // Listen for deep links when app is running
    linkingSubscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        handleDeepLink(event.url);
      }
    });

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (linkingSubscription) {
        linkingSubscription.remove();
      }
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const prof = await dataManager.getProfile(user.id);
      setProfile(prof);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      const prof = await dataManager.getProfile(data.user!.id);
      setProfile(prof);
      setLoading(false);
      return { error: null };
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
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || e };
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const urlString = result.url;
          const params: { [key: string]: string } = {};
          
          const hashIndex = urlString.indexOf('#');
          if (hashIndex !== -1) {
            const hash = urlString.substring(hashIndex + 1);
            hash.split('&').forEach(pair => {
              const [key, val] = pair.split('=');
              if (key && val) params[key] = decodeURIComponent(val);
            });
          }
          
          const queryIndex = urlString.indexOf('?');
          if (queryIndex !== -1) {
            const query = urlString.substring(queryIndex + 1);
            query.split('&').forEach(pair => {
              const [key, val] = pair.split('=');
              if (key && val) params[key] = decodeURIComponent(val);
            });
          }

          const { access_token, refresh_token } = params;
          
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }
      }
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || e };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Signout error', e);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = Linking.createURL('/change-password');
      console.log('Forgot Password Redirect URL (Register this in Supabase -> Auth -> Redirect URLs):', redirectUrl);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error };
    } catch (e: any) {
      return { error: e.message || e };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
      resetPassword
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

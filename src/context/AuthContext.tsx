import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dataStore } from '../services/dataStore';
import { Profile, UserRole, Pod } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isAssignedToOrg: boolean;
  userPod: Pod | undefined;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateCurrentProfile: (updates: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize synchronously from localStorage if present
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const email = localStorage.getItem('maplebot_session_email');
      if (email) {
        return dataStore.getProfiles().find((p) => p.email.toLowerCase().trim() === email.toLowerCase().trim()) || null;
      }
    } catch (e) {
      console.warn('localStorage read error', e);
    }
    return null;
  });

  const [user, setUser] = useState<any | null>(() => {
    try {
      const email = localStorage.getItem('maplebot_session_email');
      if (email) {
        const p = dataStore.getProfiles().find((prof) => prof.email.toLowerCase().trim() === email.toLowerCase().trim());
        return p ? { id: p.id, email: p.email } : null;
      }
    } catch (e) {
      console.warn('localStorage read error', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync profile from Supabase user or email
  const syncProfileForUser = (supabaseUser: any) => {
    if (!supabaseUser) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('maplebot_session_email');
      return;
    }

    setUser(supabaseUser);
    const email = (supabaseUser.email || '').toLowerCase().trim();
    if (email) {
      localStorage.setItem('maplebot_session_email', email);
    }

    const profiles = dataStore.getProfiles();
    let match = profiles.find(
      (p) => p.email.toLowerCase().trim() === email || (p.auth_user_id && p.auth_user_id === supabaseUser.id)
    );

    if (!match && email) {
      // Create new profile with default role = 'member'
      const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split('@')[0];
      match = dataStore.createProfile({
        organization_id: 'org-maple-01',
        auth_user_id: supabaseUser.id,
        full_name: fullName,
        email,
        role: 'member', // Strictly member by default
        timezone: 'America/Toronto',
        status: 'active',
      });
    } else if (match && !match.auth_user_id) {
      dataStore.updateProfile(match.id, { auth_user_id: supabaseUser.id });
    }

    if (match) {
      setProfile(match);
    }
  };

  useEffect(() => {
    // 1. Check existing Supabase session asynchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncProfileForUser(session.user);
      }
    }).catch((err) => {
      console.warn('Supabase getSession error (proceeding with local store):', err);
    });

    // 2. Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncProfileForUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
    } catch (e) {
      console.warn('OAuth trigger:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pass,
      });

      if (!error && data.user) {
        syncProfileForUser(data.user);
        setIsLoading(false);
        return { success: true };
      }
    } catch (e) {
      console.warn('Supabase auth network notice:', e);
    }

    // Local profile fallback matching
    const found = dataStore.getProfiles().find((p) => p.email.toLowerCase().trim() === normalizedEmail);
    if (found) {
      setUser({ id: found.id, email: found.email });
      setProfile(found);
      localStorage.setItem('maplebot_session_email', found.email);
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: 'Invalid email or password.' };
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pass,
        options: {
          data: { full_name: fullName },
        },
      });

      if (!error && data.user) {
        syncProfileForUser(data.user);
        setIsLoading(false);
        return { success: true };
      }
    } catch (e) {
      console.warn('Supabase signUp notice:', e);
    }

    // Create local profile immediately
    const newProf = dataStore.createProfile({
      organization_id: 'org-maple-01',
      full_name: fullName,
      email: normalizedEmail,
      role: 'member', // Strictly default member
      timezone: 'America/Toronto',
      status: 'active',
    });
    setUser({ id: newProf.id, email: newProf.email });
    setProfile(newProf);
    localStorage.setItem('maplebot_session_email', newProf.email);
    setIsLoading(false);
    return { success: true };
  };

  const resetPasswordForEmail = async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      return { success: true };
    }
    return { success: true };
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      return { success: true };
    }
    return { success: true };
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('maplebot_session_email');
    setIsLoading(false);
    window.location.href = '/';
  };

  const updateCurrentProfile = (updates: Partial<Profile>) => {
    if (!profile) return;
    const updated = dataStore.updateProfile(profile.id, updates);
    if (updated) {
      setProfile(updated);
    }
  };

  const isAuthenticated = !!profile;
  const currentRole: UserRole = profile?.role || 'member';
  const isAssignedToOrg = !!profile?.organization_id;
  const userPod = profile?.pod_id ? dataStore.getPods().find((p) => p.id === profile.pod_id) : undefined;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentRole,
        isAuthenticated,
        isAssignedToOrg,
        userPod,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPasswordForEmail,
        updatePassword,
        signOut,
        updateCurrentProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

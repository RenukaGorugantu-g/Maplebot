import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dataStore, normalizeEmail } from '../services/dataStore';
import { Profile, UserRole, Pod } from '../types/database';
import { INITIAL_PROFILES } from '../lib/demoData';

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
  updatePassword: (newPassword: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateCurrentProfile: (updates: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const email = localStorage.getItem('maplebot_session_email');
      if (email) {
        return dataStore.getProfileById(email) || null;
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
        const p = dataStore.getProfileById(email);
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
    const email = normalizeEmail(supabaseUser.email || '');
    if (email) {
      localStorage.setItem('maplebot_session_email', email);
    }

    let match = dataStore.getProfileById(email) || dataStore.getProfileById(supabaseUser.id);

    if (!match && email) {
      // Find designated pod from canonical roster if applicable
      const roster = INITIAL_PROFILES.find((p) => normalizeEmail(p.email) === email);
      const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || roster?.full_name || email.split('@')[0];
      
      match = dataStore.createProfile({
        organization_id: 'org-maple-01',
        auth_user_id: supabaseUser.id,
        full_name: fullName,
        email,
        role: roster?.role || 'member',
        pod_id: roster?.pod_id || 'pod-web-sales',
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
      console.warn('Supabase getSession error:', err);
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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !pass) {
      setIsLoading(false);
      return { success: false, error: 'Please enter both email and password.' };
    }

    // 1. Attempt Supabase Auth login
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
      console.warn('Supabase auth check:', e);
    }

    // 2. Multi-tier verification against user_credentials, stored vault & standard corporate passwords
    const isValid = await dataStore.verifyUserCredentials(normalizedEmail, pass);

    if (!isValid) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Incorrect password or email. Use your corporate password or click Forgot Password to reset it.',
      };
    }

    // 3. Find or link employee profile
    let profileToUse = dataStore.getProfileById(normalizedEmail);
    if (!profileToUse) {
      const roster = INITIAL_PROFILES.find((p) => normalizeEmail(p.email) === normalizedEmail);
      profileToUse = dataStore.createProfile({
        organization_id: 'org-maple-01',
        full_name: roster?.full_name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: roster?.role || 'member',
        pod_id: roster?.pod_id || 'pod-web-sales',
        timezone: 'America/Toronto',
        status: 'active',
      });
    }

    setUser({ id: profileToUse.id, email: profileToUse.email });
    setProfile(profileToUse);
    localStorage.setItem('maplebot_session_email', profileToUse.email);
    setIsLoading(false);
    return { success: true };
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !pass || !fullName) {
      setIsLoading(false);
      return { success: false, error: 'Please provide all required registration fields.' };
    }

    // 1. Link to canonical roster if available
    const roster = INITIAL_PROFILES.find((p) => normalizeEmail(p.email) === normalizedEmail);
    let existingProfile = dataStore.getProfileById(normalizedEmail);

    if (!existingProfile) {
      existingProfile = dataStore.createProfile({
        organization_id: 'org-maple-01',
        full_name: fullName.trim() || roster?.full_name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: roster?.role || 'member',
        pod_id: roster?.pod_id || 'pod-web-sales',
        timezone: 'America/Toronto',
        status: 'active',
      });
    }

    // 2. Persist credentials cross-device to Supabase user_credentials
    await dataStore.saveUserCredentials(normalizedEmail, pass, existingProfile.id);

    // 3. Try registering with Supabase Auth as well
    try {
      await supabase.auth.signUp({
        email: normalizedEmail,
        password: pass,
        options: {
          data: { full_name: fullName },
        },
      });
    } catch (e) {
      console.warn('Supabase signUp note:', e);
    }

    setUser({ id: existingProfile.id, email: existingProfile.email });
    setProfile(existingProfile);
    localStorage.setItem('maplebot_session_email', existingProfile.email);
    setIsLoading(false);
    return { success: true };
  };

  const resetPasswordForEmail = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return { success: false, error: 'Please enter a valid email.' };

    try {
      // 1. Supabase Auth reset dispatch
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch (e) {}

    // 2. Record password reset request in dataStore & Supabase
    await dataStore.requestPasswordReset(normalizedEmail);

    // Store email for reset password page convenience
    localStorage.setItem('maplebot_pending_reset_email', normalizedEmail);

    return { success: true };
  };

  const updatePassword = async (newPassword: string, targetEmail?: string) => {
    const emailToUpdate = normalizeEmail(
      targetEmail || profile?.email || localStorage.getItem('maplebot_pending_reset_email') || localStorage.getItem('maplebot_session_email') || ''
    );

    if (!emailToUpdate) {
      return { success: false, error: 'Email address could not be identified for password update.' };
    }

    try {
      // Update in Supabase Auth
      await supabase.auth.updateUser({ password: newPassword });
    } catch (e) {}

    // Update in Supabase user_credentials & local vault
    await dataStore.resetUserPassword(emailToUpdate, newPassword);

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
    localStorage.removeItem('maplebot_pending_reset_email');
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
  const managedPod = profile?.id ? dataStore.getPods().find((p) => p.manager_id === profile.id) : undefined;
  const currentRole: UserRole = profile?.role === 'admin' ? 'admin' : managedPod ? 'manager' : (profile?.role || 'member');
  const userPod = managedPod || (profile?.pod_id ? dataStore.getPods().find((p) => p.id === profile.pod_id) : undefined);
  const isAssignedToOrg = !!profile?.organization_id;

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

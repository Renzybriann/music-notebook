'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err?.message || '';
        const connectionFailed =
          /connection|failed to fetch|network|ECONNREFUSED|ENOTFOUND|load failed/i.test(msg);
        setAuthError(
          connectionFailed
            ? "Connection failed. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and that your Supabase project is active (not paused)."
            : msg || 'Something went wrong.'
        );
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthError(null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.warn('[Music Notebook] Profile fetch:', error.message);
      setProfile({ display_name: null, bio: null });
      return;
    }
    setProfile(data ?? { display_name: null, bio: null });
  }

  function setConnectionError(err) {
    const msg = err?.message || '';
    const connectionFailed =
      /connection|failed to fetch|network|ECONNREFUSED|ENOTFOUND|load failed/i.test(msg);
    setAuthError(
      connectionFailed
        ? "Connection failed. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and that your Supabase project is active (not paused)."
        : msg || 'Something went wrong.'
    );
  }

  async function signUp(email, password, displayName) {
    setAuthError(null);
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email?.split('@')[0] } },
      });
      if (error) setAuthError(error.message);
      return { data, error };
    } catch (err) {
      setConnectionError(err);
      return { data: null, error: err };
    }
  }

  async function signIn(email, password) {
    setAuthError(null);
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      return { data, error };
    } catch (err) {
      setConnectionError(err);
      return { data: null, error: err };
    }
  }

  async function signInWithDiscord() {
    setAuthError(null);
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo,
        },
      });
      if (error) setAuthError(error.message);
      return { data, error };
    } catch (err) {
      setConnectionError(err);
      return { data: null, error: err };
    }
  }

  async function signOut() {
    setAuthError(null);
    if (supabase) await supabase.auth.signOut();
  }

  async function updateProfile(updates) {
    if (!user || !supabase) return { error: new Error('Not logged in') };
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }

  const value = {
    user,
    profile,
    loading,
    authError,
    isSupabaseConfigured: !!supabase,
    signUp,
    signIn,
    signInWithDiscord,
    signOut,
    updateProfile,
    displayName: profile?.display_name || user?.email?.split('@')[0] || 'Artist',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

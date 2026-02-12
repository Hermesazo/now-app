import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Auth hook: subscribes to Supabase auth state and exposes signIn, signUp, signOut.
 * State is stored in Zustand (useAuthStore).
 */
export function useAuth() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const done = () => {
      if (!cancelled) setLoading(false);
    };

    const timeoutId = window.setTimeout(() => {
      setSession(null);
      setUser(null);
      done();
    }, 2500);

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return;
        setSession(s ?? null);
        setUser(s?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        done();
      });

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
      });
      subscription = data.subscription;
    } catch {
      done();
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe?.();
    };
  }, [setSession, setUser, setLoading]);

  const signIn = useCallback(async (credentials: AuthCredentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (credentials: AuthCredentials) => {
    const { error } = await supabase.auth.signUp(credentials);
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
}

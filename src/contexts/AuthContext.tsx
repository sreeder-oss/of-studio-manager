import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  getStoredBackupKey,
  getStoredDeepSeekKey,
  getStoredVisualizerKey,
  setStoredBackupKey,
  setStoredDeepSeekKey,
  setStoredVisualizerKey,
  setStoredVisualizerModel,
} from '@/lib/aiModels';

function hydrateKeysFromUserMetadata(user: User | null | undefined) {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return;
  if (typeof meta.visualizer_api_key === 'string' && meta.visualizer_api_key.trim() && !getStoredVisualizerKey()) {
    setStoredVisualizerKey(meta.visualizer_api_key);
  }
  if (typeof meta.deepseek_api_key === 'string' && meta.deepseek_api_key.trim() && !getStoredDeepSeekKey()) {
    setStoredDeepSeekKey(meta.deepseek_api_key);
  }
  if (typeof meta.gemma_api_key === 'string' && meta.gemma_api_key.trim() && !getStoredBackupKey()) {
    setStoredBackupKey(meta.gemma_api_key);
  }
  if (typeof meta.visualizer_model === 'string' && meta.visualizer_model.trim()) {
    setStoredVisualizerModel(meta.visualizer_model);
  }
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, loading: true, signOut: async () => {}
});

export const PRIVATE_FLAG = 'of-private-denied';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Owner gate: user id that the server confirmed as the owner.
  const [allowedId, setAllowedId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || uid === allowedId) return;
    let cancelled = false;
    setChecking(true);
    (async () => {
      const { error } = await supabase.functions.invoke('owner-check', { body: {} });
      if (cancelled) return;
      const status = (error as { context?: Response } | null)?.context?.status;
      if (error && (status === 403 || status === 401)) {
        sessionStorage.setItem(PRIVATE_FLAG, '1');
        await supabase.auth.signOut();
        setAllowedId(null);
      } else if (!error) {
        setAllowedId(uid);
      } else {
        // Could not reach the check: keep the user out rather than let them in.
        sessionStorage.setItem(PRIVATE_FLAG, 'unreachable');
        await supabase.auth.signOut();
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, allowedId]);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      if (!mounted) return;
      setSession(restoredSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ownerOk = !!session && session.user.id === allowedId;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session: ownerOk ? session : null,
      user: ownerOk ? session!.user : null,
      loading: loading || checking || (!!session && !ownerOk),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

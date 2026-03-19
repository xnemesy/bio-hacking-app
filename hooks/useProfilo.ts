// Hook CRUD profilo utente — carica, salva via UPSERT
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProfiloStore } from '../store/profiloStore';
import type { Profilo, ProfiloUpdate } from '../types/index';

export interface UseProfiloReturn {
  profilo: Profilo | null;
  loading: boolean;
  salvando: boolean;
  error: string | null;
  aggiorna: () => Promise<void>;
  aggiornaProfilo: (dati: ProfiloUpdate) => Promise<void>;
}

export function useProfilo(): UseProfiloReturn {
  const { profilo, setProfilo } = useProfiloStore();
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aggiorna = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const { data, error: err } = await supabase
        .from('profilo')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setProfilo((data as Profilo) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setProfilo]);

  const aggiornaProfilo = useCallback(async (dati: ProfiloUpdate) => {
    setSalvando(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const { data, error: err } = await supabase
        .from('profilo')
        .upsert({ ...dati, user_id: user.id }, { onConflict: 'user_id' })
        .select()
        .single();
      if (err) throw new Error(err.message);
      setProfilo(data as Profilo);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSalvando(false);
    }
  }, [setProfilo]);

  return { profilo, loading, salvando, error, aggiorna, aggiornaProfilo };
}

// CRUD pasti per un giorno specifico con totali live
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { caloriePasto } from '../lib/calcoli';
import type { Pasto, PastoInsert, TotaliGiorno, UUID } from '../types/index';

const TOTALI_VUOTI: TotaliGiorno = {
  calorie_totali: 0,
  proteine_totali: 0,
  carboidrati_totali: 0,
  grassi_totali: 0,
  acqua_totale: 0,
  omega3_preso: false,
};

function calcolaTotali(pasti: Pasto[]): TotaliGiorno {
  return pasti.reduce<TotaliGiorno>(
    (acc, p) => ({
      calorie_totali: acc.calorie_totali + caloriePasto(p.proteine_g, p.carboidrati_g, p.grassi_g),
      proteine_totali: acc.proteine_totali + p.proteine_g,
      carboidrati_totali: acc.carboidrati_totali + p.carboidrati_g,
      grassi_totali: acc.grassi_totali + p.grassi_g,
      acqua_totale: acc.acqua_totale + p.acqua_ml,
      omega3_preso: acc.omega3_preso || p.omega3,
    }),
    { ...TOTALI_VUOTI }
  );
}

export interface UsePastiReturn {
  pasti: Pasto[];
  totali: TotaliGiorno;
  loading: boolean;
  salvando: boolean;
  error: string | null;
  aggiorna: () => Promise<void>;
  aggiungiPasto: (dati: PastoInsert) => Promise<void>;
  modificaPasto: (id: UUID, dati: Partial<PastoInsert>) => Promise<void>;
  eliminaPasto: (id: UUID) => Promise<void>;
}

export function usePasti(giornoId: UUID | null): UsePastiReturn {
  const [pasti, setPasti] = useState<Pasto[]>([]);
  const [totali, setTotali] = useState<TotaliGiorno>({ ...TOTALI_VUOTI });
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aggiorna = useCallback(async () => {
    if (!giornoId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('pasti')
        .select('*')
        .eq('giorno_id', giornoId)
        .order('created_at');
      if (err) throw new Error(err.message);
      const lista = data ?? [];
      setPasti(lista);
      setTotali(calcolaTotali(lista));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [giornoId]);

  /** INSERT — NON inviare calorie_pasto (GENERATED COLUMN) */
  const aggiungiPasto = useCallback(
    async (dati: PastoInsert) => {
      setSalvando(true);
      setError(null);
      try {
        const { error: err } = await supabase.from('pasti').insert(dati);
        if (err) throw new Error(err.message);
        await aggiorna();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSalvando(false);
      }
    },
    [aggiorna]
  );

  const modificaPasto = useCallback(
    async (id: UUID, dati: Partial<PastoInsert>) => {
      setSalvando(true);
      setError(null);
      try {
        const { error: err } = await supabase.from('pasti').update(dati).eq('id', id);
        if (err) throw new Error(err.message);
        await aggiorna();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSalvando(false);
      }
    },
    [aggiorna]
  );

  const eliminaPasto = useCallback(
    async (id: UUID) => {
      setError(null);
      try {
        const { error: err } = await supabase.from('pasti').delete().eq('id', id);
        if (err) throw new Error(err.message);
        // Aggiornamento ottimistico immediato
        setPasti((prev) => {
          const nuova = prev.filter((p) => p.id !== id);
          setTotali(calcolaTotali(nuova));
          return nuova;
        });
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    []
  );

  return { pasti, totali, loading, salvando, error, aggiorna, aggiungiPasto, modificaPasto, eliminaPasto };
}

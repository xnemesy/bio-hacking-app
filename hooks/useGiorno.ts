// Gestisce il giorno corrente: lo crea se non esiste, carica pasti e sessione
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { caloriePasto, calorieConsumate } from '../lib/calcoli';
import { useProfiloStore } from '../store/profiloStore';
import type { Giorno, Pasto, Sessione, TotaliGiorno } from '../types/index';

const BMR_DEFAULT = 1650;

/** Data odierna in formato YYYY-MM-DD locale */
function dataOggi(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

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
    {
      calorie_totali: 0,
      proteine_totali: 0,
      carboidrati_totali: 0,
      grassi_totali: 0,
      acqua_totale: 0,
      omega3_preso: false,
    }
  );
}

export interface UseGiornoReturn {
  giorno: Giorno | null;
  pasti: Pasto[];
  sessione: Sessione | null;
  totali: TotaliGiorno;
  calConsumate: number;
  bmr: number;
  loading: boolean;
  error: string | null;
  aggiorna: () => Promise<void>;
}

export function useGiorno(): UseGiornoReturn {
  const bmrDaProfilo = useProfiloStore((state) => state.profilo?.bmr);
  const BMR = bmrDaProfilo ?? BMR_DEFAULT;

  const [giorno, setGiorno] = useState<Giorno | null>(null);
  const [pasti, setPasti] = useState<Pasto[]>([]);
  const [sessione, setSessione] = useState<Sessione | null>(null);
  const [totali, setTotali] = useState<TotaliGiorno>({
    calorie_totali: 0,
    proteine_totali: 0,
    carboidrati_totali: 0,
    grassi_totali: 0,
    acqua_totale: 0,
    omega3_preso: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aggiorna = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const oggi = dataOggi();

      // Cerca il giorno di oggi
      const { data: esistente, error: errCerca } = await supabase
        .from('giorni')
        .select('*')
        .eq('data', oggi)
        .maybeSingle();
      if (errCerca) throw new Error(errCerca.message);

      let giornoCorrente: Giorno;

      if (esistente) {
        giornoCorrente = esistente as Giorno;
      } else {
        // Crea il giorno se non esiste
        const { data: nuovo, error: errInsert } = await supabase
          .from('giorni')
          .insert({ data: oggi })
          .select()
          .single();
        if (errInsert) throw new Error(errInsert.message);
        giornoCorrente = nuovo as Giorno;
      }

      // Carica pasti e prima sessione in parallelo
      const [resPasti, resSessioni] = await Promise.all([
        supabase
          .from('pasti')
          .select('*')
          .eq('giorno_id', giornoCorrente.id)
          .order('created_at'),
        supabase
          .from('sessioni')
          .select('*')
          .eq('giorno_id', giornoCorrente.id)
          .limit(1),
      ]);

      if (resPasti.error) throw new Error(resPasti.error.message);
      if (resSessioni.error) throw new Error(resSessioni.error.message);

      const pastiCaricati = (resPasti.data as Pasto[]) ?? [];
      const sessioneCaricata = (resSessioni.data as Sessione[])?.[0] ?? null;

      setGiorno(giornoCorrente);
      setPasti(pastiCaricati);
      setSessione(sessioneCaricata);
      setTotali(calcolaTotali(pastiCaricati));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calorie consumate dalla sessione (0 se nessuna sessione)
  const calConsumate =
    sessione !== null
      ? calorieConsumate(sessione.durata_min ?? 0, sessione.cardio_extra_min)
      : 0;

  return { giorno, pasti, sessione, totali, calConsumate, bmr: BMR, loading, error, aggiorna };
}

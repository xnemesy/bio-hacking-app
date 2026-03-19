// Hook che recupera i carichi dell'ultima sessione completata per un dato giorno_lettera.
// Prima controlla la cache Zustand, poi interroga Supabase solo se necessario.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLastSessionStore, type LastCarichi } from '../store/lastSessionStore';

export interface UseLastSessionReturn {
  lastCarichi: LastCarichi;
  lastDate: string | null; // 'YYYY-MM-DD' ultima sessione trovata, null se nessuna
  loading: boolean;
  found: boolean;          // true se esiste almeno una sessione precedente in cache
}

export function useLastSession(
  giornoScheda: 'A' | 'B' | 'C' | null
): UseLastSessionReturn {
  const [loading, setLoading] = useState(false);
  const { sessions, setLastSession } = useLastSessionStore();

  // Legge il flag fetched corrente per il giorno selezionato
  const entry = giornoScheda ? sessions[giornoScheda] : null;
  const isFetched = entry?.fetched ?? false;

  // Ref per cancellare il fetch se il componente smonta o il giorno cambia
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!giornoScheda || isFetched) return;

    cancelRef.current = false;

    void (async () => {
      setLoading(true);
      try {
        const oggi = new Date().toISOString().split('T')[0] ?? '';

        // Trova le sessioni recenti per questo giorno_lettera (include la data via join)
        const { data: sessioniRaw, error: errS } = await supabase
          .from('sessioni')
          .select('id, created_at, giorni!giorno_id(data)')
          .eq('giorno_lettera', giornoScheda)
          .order('created_at', { ascending: false })
          .limit(20);

        if (errS || !sessioniRaw || cancelRef.current) {
          if (!cancelRef.current) setLastSession(giornoScheda, {}, null);
          return;
        }

        type SessData = { id: string; created_at: string; giorni: { data: string } | { data: string }[] | null };
        const sessList = sessioniRaw as unknown as SessData[];
        
        // Prima sessione che non sia di oggi
        const sessPrec = sessList.find((s) => {
          const g = s.giorni as { data: string } | null;
          return g != null && g.data < oggi;
        });

        if (!sessPrec || cancelRef.current) {
          if (!cancelRef.current) setLastSession(giornoScheda, {}, null);
          return;
        }

        // Carica gli esercizi di quella sessione
        const { data: esercizi, error: errE } = await supabase
          .from('esercizi_log')
          .select('nome_esercizio, carico_a_kg, carico_b_kg')
          .eq('sessione_id', sessPrec.id);

        if (errE || !esercizi || cancelRef.current) {
          if (!cancelRef.current) setLastSession(giornoScheda, {}, null);
          return;
        }

        type EsercizioData = { nome_esercizio: string; carico_a_kg: number; carico_b_kg: number };
        const carichi: LastCarichi = {};
        for (const e of (esercizi as unknown as EsercizioData[])) {
          carichi[e.nome_esercizio] = {
            carico_a_kg: Number(e.carico_a_kg) || 0,
            carico_b_kg: Number(e.carico_b_kg) || 0,
          };
        }

        const giornoData = (sessPrec.giorni as { data: string }).data;
        if (!cancelRef.current) setLastSession(giornoScheda, carichi, giornoData);
      } finally {
        if (!cancelRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelRef.current = true;
    };
  // isFetched cambia a false dopo invalidation → ri-esegue il fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giornoScheda, isFetched]);

  if (!giornoScheda) {
    return { lastCarichi: {}, lastDate: null, loading: false, found: false };
  }

  return {
    lastCarichi: entry?.carichi ?? {},
    lastDate: entry?.date ?? null,
    loading,
    found: (entry?.fetched ?? false) && entry?.date !== null,
  };
}

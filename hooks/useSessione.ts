// Gestisce sessione di allenamento: crea, popola preset, aggiorna carichi, completa
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { volumeEsercizio } from '../lib/calcoli';
import { GIORNI_PRESET } from '../data/esercizi';
import type {
  Sessione,
  EsercizioLog,
  EsercizioLogInsert,
  GiornoLettera,
  UUID,
} from '../types/index';

// ─── Tipi locali ─────────────────────────────────────────────────────────────

/** Gruppo di esercizi ricostruito dal superset_label */
export interface GruppoEsercizi {
  label: string;
  tipo: 'singolo' | 'superset';
  esercizi: EsercizioLog[];
}

/** Dati per completare la sessione */
export interface CompletaSessioneMeta {
  durata_min: number;
  rpe: number | null;
  cardio_extra_min: number;
  addome_completato: boolean;
  idratazione_pre: boolean;
  spuntino_pre: boolean;
}

export interface UseSessioneReturn {
  sessione: Sessione | null;
  esercizi: EsercizioLog[];
  gruppi: GruppoEsercizi[];
  volumeTotale: number;
  loading: boolean;
  salvando: boolean;
  error: string | null;
  aggiorna: (giornoId: UUID) => Promise<void>;
  iniziaSessione: (lettera: GiornoLettera, giornoId: UUID) => Promise<void>;
  aggiornaCarico: (id: UUID, caricoA: number, caricoB: number) => Promise<void>;
  completaSessione: (meta: CompletaSessioneMeta) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function raggruppaEsercizi(esercizi: EsercizioLog[]): GruppoEsercizi[] {
  const mappa = new Map<string, EsercizioLog[]>();

  for (const e of esercizi) {
    const key = e.superset_label ?? `singolo_${e.id}`;
    const lista = mappa.get(key) ?? [];
    lista.push(e);
    mappa.set(key, lista);
  }

  return Array.from(mappa.entries()).map(([label, items]) => ({
    label,
    tipo: items.length > 1 ? 'superset' : 'singolo',
    esercizi: items,
  }));
}

function calcolaVolumeTotale(esercizi: EsercizioLog[]): number {
  return esercizi.reduce(
    (acc, e) => acc + volumeEsercizio(e.serie, e.reps, e.carico_a_kg, e.carico_b_kg),
    0
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSessione(): UseSessioneReturn {
  const [sessione, setSessione] = useState<Sessione | null>(null);
  const [esercizi, setEsercizi] = useState<EsercizioLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Ricarica sessione e esercizi per un giorno */
  const aggiorna = useCallback(async (giornoId: UUID) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessioni, error: errS } = await supabase
        .from('sessioni')
        .select('*')
        .eq('giorno_id', giornoId)
        .limit(1);
      if (errS) throw new Error(errS.message);

      const sessioneCorrente = sessioni?.[0] ?? null;
      setSessione(sessioneCorrente);

      if (sessioneCorrente) {
        const { data: log, error: errL } = await supabase
          .from('esercizi_log')
          .select('*')
          .eq('sessione_id', sessioneCorrente.id)
          .order('ordine');
        if (errL) throw new Error(errL.message);
        setEsercizi(log ?? []);
      } else {
        setEsercizi([]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea la sessione e pre-popola gli esercizi dal preset.
   * Se esiste già una sessione, la elimina (con conferma gestita dalla UI).
   */
  const iniziaSessione = useCallback(
    async (lettera: GiornoLettera, giornoId: UUID) => {
      setSalvando(true);
      setError(null);
      try {
        // Determina tipo Supabase: 'forza' per A/B/C, 'altro' per riposo
        const tipoDb = lettera === 'riposo' ? 'altro' : 'forza';

        // Crea la sessione
        const { data: nuovaSessione, error: errIns } = await supabase
          .from('sessioni')
          .insert({
            giorno_id: giornoId,
            tipo: tipoDb,
            giorno_lettera: lettera,
          })
          .select()
          .single();
        if (errIns) throw new Error(errIns.message);
        setSessione(nuovaSessione);

        // Nessun esercizio per i giorni di riposo
        if (lettera === 'riposo') {
          setEsercizi([]);
          return;
        }

        const preset = GIORNI_PRESET[lettera];
        const rows: EsercizioLogInsert[] = [];
        let ordine = 0;

        for (const gruppo of preset.gruppi) {
          for (const e of gruppo.esercizi) {
            rows.push({
              sessione_id: nuovaSessione.id,
              nome_esercizio: e.nome,
              serie: e.serie,
              reps: e.reps,
              carico_a_kg: 0,
              carico_b_kg: 0,
              superset_label: gruppo.label,
              ordine: ordine++,
            });
          }
        }

        // Bulk insert — NON inviare volume_kg (GENERATED COLUMN)
        const { data: logInseriti, error: errLog } = await supabase
          .from('esercizi_log')
          .insert(rows)
          .select();
        if (errLog) throw new Error(errLog.message);
        setEsercizi(logInseriti ?? []);
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSalvando(false);
      }
    },
    []
  );

  /**
   * Aggiorna i carichi di un esercizio.
   * NON inviare volume_kg — è GENERATED COLUMN.
   */
  const aggiornaCarico = useCallback(
    async (id: UUID, caricoA: number, caricoB: number) => {
      setError(null);
      try {
        const { error: err } = await supabase
          .from('esercizi_log')
          .update({ carico_a_kg: caricoA, carico_b_kg: caricoB })
          .eq('id', id);
        if (err) throw new Error(err.message);

        // Aggiornamento ottimistico locale
        setEsercizi((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, carico_a_kg: caricoA, carico_b_kg: caricoB } : e
          )
        );
      } catch (e) {
        setError((e as Error).message);
      }
    },
    []
  );

  /** Salva i metadati finali della sessione (durata, RPE, cardio, ecc.) */
  const completaSessione = useCallback(
    async (meta: CompletaSessioneMeta) => {
      if (!sessione) return;
      setSalvando(true);
      setError(null);
      try {
        const { error: err } = await supabase
          .from('sessioni')
          .update({
            durata_min: meta.durata_min,
            rpe: meta.rpe,
            cardio_extra_min: meta.cardio_extra_min,
            addome_completato: meta.addome_completato,
            idratazione_pre: meta.idratazione_pre,
            spuntino_pre: meta.spuntino_pre,
          })
          .eq('id', sessione.id);
        if (err) throw new Error(err.message);
        setSessione((prev) =>
          prev ? { ...prev, ...meta } : prev
        );
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSalvando(false);
      }
    },
    [sessione]
  );

  const gruppi = raggruppaEsercizi(esercizi);
  const volumeTotale = calcolaVolumeTotale(esercizi);

  return {
    sessione,
    esercizi,
    gruppi,
    volumeTotale,
    loading,
    salvando,
    error,
    aggiorna,
    iniziaSessione,
    aggiornaCarico,
    completaSessione,
  };
}

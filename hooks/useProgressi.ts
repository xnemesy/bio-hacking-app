// Aggrega i dati degli ultimi 30 giorni per grafici e KPI
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { caloriePasto, bilancioGiornaliero, calorieConsumate } from '../lib/calcoli';
import { GIORNI_PRESET } from '../data/esercizi';
import type { EsercizioItem } from '../data/esercizi';

const BMR = 1650;

// ─── Tipi output ─────────────────────────────────────────────────────────────

export interface PuntoBilancio {
  data: string;    // 'YYYY-MM-DD'
  bilancio: number;
  label: string;   // 'GG/MM'
}

export interface BarraVolume {
  gruppo: string;
  volume: number;
}

export interface KpiSettimana {
  deficit_cumulativo: number;    // kcal negativi sommati
  sessioni_completate: number;
  sessioni_target: number;       // fisso: 3 (A, B, C)
  percentuale_pesate: number;    // 0-100
  porzioni_totali: number;
  porzioni_pesate: number;
}

export interface UseProgressiReturn {
  bilancio30g: PuntoBilancio[];
  volumeGruppi: BarraVolume[];
  kpiSettimana: KpiSettimana;
  loading: boolean;
  error: string | null;
  aggiorna: () => Promise<void>;
}

// ─── Lookup nome esercizio → gruppo muscolare ─────────────────────────────────

const GRUPPO_PER_NOME: ReadonlyMap<string, string> = new Map(
  Object.values(GIORNI_PRESET)
    .flatMap((g) => g.gruppi)
    .flatMap((g) => g.esercizi as readonly EsercizioItem[])
    .map((e) => [e.nome, e.gruppo_muscolare] as const)
);

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoOggi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoNGiorniFa(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lunedì della settimana corrente */
function isoInizioSettimana(): string {
  const d = new Date();
  const day = d.getDay();
  const diffLunedi = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffLunedi);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatLabel(iso: string): string {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
}

// ─── Tipi query Supabase ──────────────────────────────────────────────────────

interface PastoRaw {
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  porzione: string;
}

interface SessioneRaw {
  id: string;
  tipo: string;
  durata_min: number | null;
  giorno_lettera: string | null;
  cardio_extra_min: number;
}

interface GiornoRaw {
  id: string;
  data: string;
  pasti: PastoRaw[];
  sessioni: SessioneRaw[];
}

interface EsercizioRaw {
  nome_esercizio: string;
  serie: number;
  reps: number;
  carico_a_kg: number;
  carico_b_kg: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgressi(): UseProgressiReturn {
  const [bilancio30g, setBilancio30g] = useState<PuntoBilancio[]>([]);
  const [volumeGruppi, setVolumeGruppi] = useState<BarraVolume[]>([]);
  const [kpiSettimana, setKpiSettimana] = useState<KpiSettimana>({
    deficit_cumulativo: 0,
    sessioni_completate: 0,
    sessioni_target: 3,
    percentuale_pesate: 0,
    porzioni_totali: 0,
    porzioni_pesate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aggiorna = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const da30g = isoNGiorniFa(30);
      const da28g = isoNGiorniFa(28); // ~4 settimane
      const inizioSett = isoInizioSettimana();
      const oggi = isoOggi();

      // ── Query 1: giorni (30gg) con pasti e sessioni annidati ─────────────
      const { data: giorni, error: errG } = await supabase
        .from('giorni')
        .select(`
          id,
          data,
          pasti(proteine_g, carboidrati_g, grassi_g, porzione),
          sessioni(id, tipo, durata_min, giorno_lettera, cardio_extra_min)
        `)
        .gte('data', da30g)
        .lte('data', oggi)
        .order('data');

      if (errG) throw new Error(errG.message);
      const giorni30 = (giorni ?? []) as unknown as GiornoRaw[];

      // ── Calcola bilancio per ogni giorno ──────────────────────────────────
      const punti: PuntoBilancio[] = giorni30.map((g) => {
        const calIn = g.pasti.reduce(
          (acc, p) => acc + caloriePasto(p.proteine_g, p.carboidrati_g, p.grassi_g),
          0
        );
        const calOut = g.sessioni.reduce((acc, s) => {
          if (!s.durata_min || s.giorno_lettera === 'riposo') return acc;
          const cardioMin = s.tipo === 'cardio' ? s.durata_min : s.cardio_extra_min;
          return acc + calorieConsumate(s.durata_min, cardioMin);
        }, 0);
        return {
          data: g.data,
          bilancio: bilancioGiornaliero(calIn, calOut, BMR),
          label: formatLabel(g.data),
        };
      });
      setBilancio30g(punti);

      // ── KPI settimana corrente ─────────────────────────────────────────────
      const giorni7 = giorni30.filter((g) => g.data >= inizioSett);

      const deficitCumulativo = Math.round(
        punti
          .filter((p) => p.data >= inizioSett && p.bilancio < 0)
          .reduce((acc, p) => acc + p.bilancio, 0)
      );

      const sessioniCompletate = giorni7.reduce((acc, g) => {
        const haAllenamento = g.sessioni.some(
          (s) => s.durata_min !== null && s.giorno_lettera !== 'riposo'
        );
        return acc + (haAllenamento ? 1 : 0);
      }, 0);

      const tuttiPasti7 = giorni7.flatMap((g) => g.pasti);
      const porzioniTotali = tuttiPasti7.length;
      const porzioniPesate = tuttiPasti7.filter((p) => p.porzione === 'pesato').length;

      setKpiSettimana({
        deficit_cumulativo: deficitCumulativo,
        sessioni_completate: sessioniCompletate,
        sessioni_target: 3,
        percentuale_pesate: porzioniTotali > 0
          ? Math.round((porzioniPesate / porzioniTotali) * 100)
          : 0,
        porzioni_totali: porzioniTotali,
        porzioni_pesate: porzioniPesate,
      });

      // ── Query 2: esercizi_log (4 settimane) per volume per gruppo ─────────
      const sessioneIds = giorni30
        .filter((g) => g.data >= da28g)
        .flatMap((g) => g.sessioni)
        .map((s) => s.id)
        .filter((id) => id !== undefined);

      if (sessioneIds.length > 0) {
        const { data: eserciziRaw, error: errE } = await supabase
          .from('esercizi_log')
          .select('nome_esercizio, serie, reps, carico_a_kg, carico_b_kg')
          .in('sessione_id', sessioneIds);

        if (errE) throw new Error(errE.message);

        // Aggrega volume per gruppo muscolare
        const mappaVolume = new Map<string, number>();
        for (const e of (eserciziRaw ?? []) as EsercizioRaw[]) {
          if (e.carico_a_kg === 0 && e.carico_b_kg === 0) continue; // skip non compilati
          const gruppo = GRUPPO_PER_NOME.get(e.nome_esercizio) ?? 'Altro';
          const vol = e.serie * e.reps * (e.carico_a_kg + e.carico_b_kg);
          mappaVolume.set(gruppo, (mappaVolume.get(gruppo) ?? 0) + vol);
        }

        const barre: BarraVolume[] = Array.from(mappaVolume.entries())
          .map(([gruppo, volume]) => ({ gruppo, volume: Math.round(volume) }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 10);

        setVolumeGruppi(barre);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { bilancio30g, volumeGruppi, kpiSettimana, loading, error, aggiorna };
}

// Store Zustand per pasti recenti — persistito in AsyncStorage
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { TipoPasto, Porzione } from '../types/index';

export interface RecentPasto {
  tipo_pasto: TipoPasto;
  nome: string | null;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  acqua_ml: number;
  omega3: boolean;
  porzione: Porzione | null;
  last_used: string; // ISO timestamp
  use_count: number;
}

type RecentPastoInput = Omit<RecentPasto, 'last_used' | 'use_count'>;

function chiavePasto(p: RecentPastoInput): string {
  return [
    p.tipo_pasto,
    p.nome ?? '',
    p.proteine_g.toFixed(1),
    p.carboidrati_g.toFixed(1),
    p.grassi_g.toFixed(1),
  ].join('|');
}

interface RecentPastiStore {
  recentPasti: RecentPasto[];
  addRecent: (pasto: RecentPastoInput) => void;
  getRecentByTipo: (tipo: TipoPasto) => RecentPasto[];
  syncFromSupabase: () => Promise<void>;
  clearRecents: () => void;
}

export const useRecentPastiStore = create<RecentPastiStore>()(
  persist(
    (set, get) => ({
      recentPasti: [],

      addRecent: (pasto) => {
        const now = new Date().toISOString();
        const chiave = chiavePasto(pasto);
        const correnti = get().recentPasti;
        const esistente = correnti.find((r) => chiavePasto(r) === chiave);

        let aggiornati: RecentPasto[];
        if (esistente) {
          // Aggiorna timestamp e contatore, porta in cima
          aggiornati = [
            { ...esistente, last_used: now, use_count: esistente.use_count + 1 },
            ...correnti.filter((r) => chiavePasto(r) !== chiave),
          ];
        } else {
          aggiornati = [
            { ...pasto, last_used: now, use_count: 1 },
            ...correnti,
          ];
        }

        // Mantieni max 20 voci uniche
        set({ recentPasti: aggiornati.slice(0, 20) });
      },

      getRecentByTipo: (tipo) => {
        return get()
          .recentPasti.filter((r) => r.tipo_pasto === tipo)
          .slice(0, 5);
      },

      syncFromSupabase: async () => {
        try {
          const seiGiorniFa = new Date();
          seiGiorniFa.setDate(seiGiorniFa.getDate() - 7);
          const dataMin = seiGiorniFa.toISOString().split('T')[0];

          const { data, error } = await supabase
            .from('pasti')
            .select(
              'tipo_pasto, nome, proteine_g, carboidrati_g, grassi_g, acqua_ml, omega3, porzione, created_at'
            )
            .gte('created_at', dataMin)
            .order('created_at', { ascending: false })
            .limit(200);

          if (error || !data) return;

          // Aggregazione client-side: deduplicazione e conteggio
          const mappa = new Map<string, RecentPasto>();
          for (const row of data) {
            const input: RecentPastoInput = {
              tipo_pasto: row.tipo_pasto as TipoPasto,
              nome: row.nome ?? null,
              proteine_g: Number(row.proteine_g) || 0,
              carboidrati_g: Number(row.carboidrati_g) || 0,
              grassi_g: Number(row.grassi_g) || 0,
              acqua_ml: Number(row.acqua_ml) || 0,
              omega3: Boolean(row.omega3),
              porzione: (row.porzione as Porzione) ?? null,
            };
            const chiave = chiavePasto(input);
            const esistente = mappa.get(chiave);
            if (esistente) {
              esistente.use_count += 1;
              // created_at DESC → il primo incontrato è già il più recente
            } else {
              mappa.set(chiave, {
                ...input,
                last_used: row.created_at as string,
                use_count: 1,
              });
            }
          }

          // Ordina per last_used desc, prendi i 20 più recenti
          const fromDb = Array.from(mappa.values())
            .sort((a, b) => b.last_used.localeCompare(a.last_used))
            .slice(0, 20);

          // Merge con quelli già in memoria locale: i DB hanno precedenza sul contatore
          const locali = get().recentPasti;
          const merged = new Map<string, RecentPasto>();
          for (const r of fromDb) merged.set(chiavePasto(r), r);
          for (const r of locali) {
            const k = chiavePasto(r);
            if (!merged.has(k)) merged.set(k, r);
            else {
              // Prendi il contatore massimo
              const existing = merged.get(k)!;
              if (r.use_count > existing.use_count) {
                merged.set(k, { ...existing, use_count: r.use_count });
              }
            }
          }

          const finale = Array.from(merged.values())
            .sort((a, b) => b.last_used.localeCompare(a.last_used))
            .slice(0, 20);

          set({ recentPasti: finale });
        } catch {
          // Sync fallisce silenziosamente — i dati locali restano intatti
        }
      },

      clearRecents: () => set({ recentPasti: [] }),
    }),
    {
      name: 'recent-pasti-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

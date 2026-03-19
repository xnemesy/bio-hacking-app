// Store Zustand per i carichi dell'ultima sessione per giorno scheda (A/B/C)
// Persistito in AsyncStorage — evita query Supabase ripetute
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LastCarichi {
  [nomeEsercizio: string]: {
    carico_a_kg: number;
    carico_b_kg: number;
  };
}

interface LastSessionEntry {
  carichi: LastCarichi;
  date: string | null;   // 'YYYY-MM-DD' dell'ultima sessione trovata, null se non trovata
  fetched: boolean;      // true = DB già interrogato (evita re-fetch infinito se no data)
}

const EMPTY_ENTRY: LastSessionEntry = { carichi: {}, date: null, fetched: false };

interface LastSessionStore {
  sessions: {
    A: LastSessionEntry;
    B: LastSessionEntry;
    C: LastSessionEntry;
  };
  /** Aggiorna cache dopo fetch DB o dopo completamento sessione */
  setLastSession: (giorno: 'A' | 'B' | 'C', carichi: LastCarichi, date: string | null) => void;
  /** Forza re-fetch alla prossima apertura (chiama dopo aver salvato una nuova sessione) */
  invalidate: (giorno: 'A' | 'B' | 'C') => void;
}

export const useLastSessionStore = create<LastSessionStore>()(
  persist(
    (set) => ({
      sessions: { A: EMPTY_ENTRY, B: EMPTY_ENTRY, C: EMPTY_ENTRY },

      setLastSession: (giorno, carichi, date) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [giorno]: { carichi, date, fetched: true },
          },
        })),

      invalidate: (giorno) =>
        set((s) => ({
          sessions: { ...s.sessions, [giorno]: EMPTY_ENTRY },
        })),
    }),
    {
      name: 'last-session-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Store Zustand globale per il profilo utente
// Permette a useGiorno e altri hook di leggere il BMR senza prop drilling
import { create } from 'zustand';
import type { Profilo } from '../types/index';

interface ProfiloState {
  profilo: Profilo | null;
  setProfilo: (p: Profilo | null) => void;
}

export const useProfiloStore = create<ProfiloState>((set) => ({
  profilo: null,
  setProfilo: (p) => set({ profilo: p }),
}));

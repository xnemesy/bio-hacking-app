// Catalogo esercizi: preset A/B/C per il programma personalizzato + lista libera

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface EsercizioItem {
  nome: string;
  gruppo_muscolare: string;
  serie: number;
  reps: number;
}

export interface GruppoEsercizioPreset {
  /** Etichetta univoca per il raggruppamento in DB (es. "Superset 1") */
  label: string;
  tipo: 'singolo' | 'superset';
  /** 1 esercizio se singolo, 2 se superset */
  esercizi: readonly [EsercizioItem] | readonly [EsercizioItem, EsercizioItem];
}

export interface GiornoPreset {
  lettera: 'A' | 'B' | 'C';
  titolo: string;
  gruppi: readonly GruppoEsercizioPreset[];
  ha_addome: boolean;
  ha_cardio_finale: boolean;
}

// ─── Giorno A ────────────────────────────────────────────────────────────────

const GIORNO_A: GiornoPreset = {
  lettera: 'A',
  titolo: 'Petto · Schiena · Braccia · Gambe',
  gruppi: [
    {
      label: 'Superset 1',
      tipo: 'superset',
      esercizi: [
        { nome: 'Chest Press Seduto', gruppo_muscolare: 'Petto', serie: 4, reps: 8 },
        { nome: 'Pulley', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 2',
      tipo: 'superset',
      esercizi: [
        { nome: 'Alzate Laterali', gruppo_muscolare: 'Deltoidi', serie: 4, reps: 8 },
        { nome: 'Diverging Lat', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 3',
      tipo: 'superset',
      esercizi: [
        { nome: 'Curl Manubri', gruppo_muscolare: 'Bicipiti', serie: 3, reps: 10 },
        { nome: 'Push Down', gruppo_muscolare: 'Tricipiti', serie: 3, reps: 10 },
      ],
    },
    {
      label: 'Superset 4',
      tipo: 'superset',
      esercizi: [
        { nome: 'Leg Press', gruppo_muscolare: 'Gambe', serie: 3, reps: 12 },
        { nome: 'Leg Curl', gruppo_muscolare: 'Gambe', serie: 3, reps: 12 },
      ],
    },
  ],
  ha_addome: false,
  ha_cardio_finale: false,
};

// ─── Giorno B ────────────────────────────────────────────────────────────────

const GIORNO_B: GiornoPreset = {
  lettera: 'B',
  titolo: 'Full Body · Addome · Cardio',
  gruppi: [
    {
      label: 'Superset 1',
      tipo: 'superset',
      esercizi: [
        { nome: 'Distensioni Manubri 35°', gruppo_muscolare: 'Petto', serie: 4, reps: 8 },
        { nome: 'Rematore 2 Man 35°', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 2',
      tipo: 'superset',
      esercizi: [
        { nome: 'Pectoral Machine', gruppo_muscolare: 'Petto', serie: 4, reps: 8 },
        { nome: 'Peck Back', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 3',
      tipo: 'superset',
      esercizi: [
        { nome: 'Chest Press Seduto', gruppo_muscolare: 'Petto', serie: 4, reps: 8 },
        { nome: 'Pulley', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 4',
      tipo: 'superset',
      esercizi: [
        { nome: 'Shoulder Press', gruppo_muscolare: 'Spalle', serie: 4, reps: 8 },
        { nome: 'Lat Machine Avanti', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 5',
      tipo: 'superset',
      esercizi: [
        { nome: 'Alzate Laterali', gruppo_muscolare: 'Deltoidi', serie: 4, reps: 8 },
        { nome: 'Diverging Lat', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 6',
      tipo: 'superset',
      esercizi: [
        { nome: 'French Press 2 Man 35°', gruppo_muscolare: 'Tricipiti', serie: 3, reps: 10 },
        { nome: 'Curl Spider', gruppo_muscolare: 'Bicipiti', serie: 3, reps: 10 },
      ],
    },
    {
      label: 'Superset 7',
      tipo: 'superset',
      esercizi: [
        { nome: 'Lowerback 2 Man 10:10', gruppo_muscolare: 'Schiena', serie: 3, reps: 12 },
        { nome: 'Leg Extension', gruppo_muscolare: 'Gambe', serie: 3, reps: 12 },
      ],
    },
  ],
  ha_addome: true,
  ha_cardio_finale: true,
};

// ─── Giorno C ────────────────────────────────────────────────────────────────

const GIORNO_C: GiornoPreset = {
  lettera: 'C',
  titolo: 'Petto · Schiena · Spalle',
  gruppi: [
    {
      label: 'Superset 1',
      tipo: 'superset',
      esercizi: [
        { nome: 'Distensioni Manubri 75°', gruppo_muscolare: 'Petto', serie: 4, reps: 8 },
        { nome: 'Lat Machine Presa Supina', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Singolo 2',
      tipo: 'singolo',
      esercizi: [
        { nome: 'Rematore Bilanciere', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 3',
      tipo: 'superset',
      esercizi: [
        { nome: 'Trazioni / Lat Machine Presa Larga', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
        { nome: 'Pulley', gruppo_muscolare: 'Schiena', serie: 4, reps: 8 },
      ],
    },
    {
      label: 'Superset 4',
      tipo: 'superset',
      esercizi: [
        { nome: 'Military Press', gruppo_muscolare: 'Spalle', serie: 4, reps: 8 },
        { nome: 'Arnold Press', gruppo_muscolare: 'Spalle', serie: 4, reps: 10 },
      ],
    },
    {
      label: 'Singolo 5',
      tipo: 'singolo',
      esercizi: [
        { nome: 'Alzate Laterali Cavo', gruppo_muscolare: 'Deltoidi', serie: 3, reps: 15 },
      ],
    },
    {
      label: 'Singolo 6',
      tipo: 'singolo',
      esercizi: [
        { nome: 'Alzate Frontali', gruppo_muscolare: 'Deltoidi', serie: 3, reps: 12 },
      ],
    },
    {
      label: 'Singolo 7',
      tipo: 'singolo',
      esercizi: [
        { nome: 'Lowerback / Hyperextension', gruppo_muscolare: 'Schiena', serie: 3, reps: 15 },
      ],
    },
  ],
  ha_addome: false,
  ha_cardio_finale: false,
};

// ─── Esportazioni ─────────────────────────────────────────────────────────────

export const GIORNI_PRESET: Readonly<Record<'A' | 'B' | 'C', GiornoPreset>> = {
  A: GIORNO_A,
  B: GIORNO_B,
  C: GIORNO_C,
};

/** Calcola il numero totale di esercizi (righe DB) per un giorno */
export function contaEsercizi(lettera: 'A' | 'B' | 'C'): number {
  return GIORNI_PRESET[lettera].gruppi.reduce(
    (acc, g) => acc + g.esercizi.length,
    0
  );
}

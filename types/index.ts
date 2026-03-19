// Tipi TypeScript che mappano 1:1 le tabelle Supabase

// ─── Tipi primitivi riutilizzabili ───────────────────────────────────────────

export type UUID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISOTimestamp = string; // ISO 8601

export type TipoPasto =
  | 'colazione'
  | 'spuntino_1_am'
  | 'spuntino_2_am'
  | 'pranzo'
  | 'spuntino_3_pm'
  | 'cena'
  | 'Extra';

export type TipoSessione = 'forza' | 'cardio' | 'mobilita' | 'altro';

/** Lettera del giorno di allenamento o riposo */
export type GiornoLettera = 'A' | 'B' | 'C' | 'riposo';

/** Modalità di misurazione della porzione */
export type Porzione = 'pesato' | 'stimato' | 'non_rispettato';

// ─── Tabella: giorni ─────────────────────────────────────────────────────────

export type Giorno = {
  id: UUID;
  data: ISODate;
  note: string | null;
  created_at: ISOTimestamp;
};

// Payload per INSERT — i campi generati/auto non si inviano
export type GiornoInsert = Pick<Giorno, 'data'> & Partial<Pick<Giorno, 'note'>>;

// ─── Tabella: pasti ──────────────────────────────────────────────────────────

export type Pasto = {
  id: UUID;
  giorno_id: UUID;
  tipo_pasto: TipoPasto;
  nome: string | null;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  // GENERATED ALWAYS — readonly: non si invia mai in INSERT/UPDATE
  readonly calorie_pasto: number;
  // Campi estesi (migration 04_extend_pasti.sql)
  acqua_ml: number;
  omega3: boolean;
  porzione: Porzione;
  fame_emotiva: boolean;
  note: string | null;
  created_at: ISOTimestamp;
};

export type PastoInsert = Pick<
  Pasto,
  'giorno_id' | 'tipo_pasto' | 'proteine_g' | 'carboidrati_g' | 'grassi_g'
> &
  Partial<Pick<Pasto, 'nome' | 'acqua_ml' | 'omega3' | 'porzione' | 'fame_emotiva' | 'note'>>;

// ─── Tabella: sessioni ────────────────────────────────────────────────────────

export type Sessione = {
  id: UUID;
  giorno_id: UUID;
  tipo: TipoSessione;
  durata_min: number | null;
  note: string | null;
  // Campi estesi (migration 05_extend_sessioni.sql)
  giorno_lettera: GiornoLettera | null;
  rpe: number | null;
  cardio_extra_min: number;
  addome_completato: boolean;
  idratazione_pre: boolean;
  spuntino_pre: boolean;
  created_at: ISOTimestamp;
};

export type SessioneInsert = Pick<Sessione, 'giorno_id' | 'tipo'> &
  Partial<Pick<
    Sessione,
    | 'durata_min'
    | 'note'
    | 'giorno_lettera'
    | 'rpe'
    | 'cardio_extra_min'
    | 'addome_completato'
    | 'idratazione_pre'
    | 'spuntino_pre'
  >>;

// ─── Tabella: esercizi_log ────────────────────────────────────────────────────

export type EsercizioLog = {
  id: UUID;
  sessione_id: UUID;
  nome_esercizio: string;
  serie: number;
  reps: number;
  carico_a_kg: number;
  carico_b_kg: number;
  // GENERATED ALWAYS — readonly: non si invia mai in INSERT/UPDATE
  readonly volume_kg: number;
  note: string | null;
  // Campi estesi (migration 06_extend_esercizi_log.sql)
  superset_label: string | null;
  ordine: number;
  created_at: ISOTimestamp;
};

export type EsercizioLogInsert = Pick<
  EsercizioLog,
  'sessione_id' | 'nome_esercizio' | 'serie' | 'reps' | 'carico_a_kg' | 'carico_b_kg'
> &
  Partial<Pick<EsercizioLog, 'note' | 'superset_label' | 'ordine'>>;

// ─── Tabella: profilo ─────────────────────────────────────────────────────────

export type Profilo = {
  id: UUID;
  user_id: UUID;
  nome: string | null;
  peso_kg: number | null;
  altezza_cm: number | null;
  eta: number | null;
  fm_attuale: number | null;
  fm_target: number | null;
  bmr: number;
  obiettivo_acqua_ml: number;
  nutrizionista: string | null;
  palestra: string | null;
  data_ultima_bia: ISODate | null;
  updated_at: ISOTimestamp;
};

export type ProfiloUpdate = Partial<Omit<Profilo, 'id' | 'user_id' | 'updated_at'>>;

// ─── Tipo Database per il client Supabase tipizzato ──────────────────────────

export interface Database {
  public: {
    Tables: {
      giorni: {
        Row: Giorno;
        Insert: GiornoInsert;
        Update: Partial<GiornoInsert>;
        Relationships: [];
      };
      pasti: {
        Row: Pasto;
        Insert: PastoInsert;
        Update: Partial<PastoInsert>;
        Relationships: [];
      };
      sessioni: {
        Row: Sessione;
        Insert: SessioneInsert;
        Update: Partial<SessioneInsert>;
        Relationships: [];
      };
      esercizi_log: {
        Row: EsercizioLog;
        Insert: EsercizioLogInsert;
        Update: Partial<EsercizioLogInsert>;
        Relationships: [];
      };
      profilo: {
        Row: Profilo;
        Insert: ProfiloUpdate & { user_id: UUID };
        Update: ProfiloUpdate;
        Relationships: [];
      };
      pasti_template: {
        Row: PastoTemplate;
        Insert: Omit<PastoTemplate, 'id' | 'calorie' | 'attivo'> & Partial<Pick<PastoTemplate, 'attivo'>>;
        Update: Partial<Omit<PastoTemplate, 'id' | 'calorie'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Tabella: pasti_template ─────────────────────────────────────────────────

export type TipoPastoTemplate = 'Colazione' | 'Spuntino AM' | 'Pranzo' | 'Spuntino PM' | 'Cena';

export type PastoTemplate = {
  id: string;
  tipo_pasto: TipoPastoTemplate;
  nome: string;
  descrizione: string | null;
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  /** READ ONLY — generated column */
  readonly calorie: number;
  ordine: number;
  attivo: boolean;
};

// ─── Ingredienti (solo in memoria nel form — non persistono su DB) ───────────

export interface MacrosPer100 {
  proteine: number;
  carboidrati: number;
  grassi: number;
}

export interface Ingrediente {
  uid: string;           // ID locale temporaneo
  nome: string;
  brand: string;
  grammi: number;
  per100: MacrosPer100;
}

export interface MacroTotali {
  proteine_g: number;
  carboidrati_g: number;
  grassi_g: number;
  kcal: number;
}

/** Risultato ricerca Open Food Facts */
export interface FoodSearchResult {
  id: string;
  nome: string;
  brand: string;
  per100: MacrosPer100;
}

// ─── Stato UI ─────────────────────────────────────────────────────────────────

export type StatoGiorno = '🟢' | '🟡' | '🔴';

/** Stato del form UI — valori come string per TextInput */
export interface PastoFormData {
  tipo_pasto: TipoPasto;
  nome: string;
  proteine_g: string;
  carboidrati_g: string;
  grassi_g: string;
  acqua_ml: string;
  omega3: boolean;
  porzione: Porzione;
  fame_emotiva: boolean;
  note: string;
}

export const PASTO_FORM_DEFAULTS: PastoFormData = {
  tipo_pasto: 'colazione',
  nome: '',
  proteine_g: '',
  carboidrati_g: '',
  grassi_g: '',
  acqua_ml: '',
  omega3: false,
  porzione: 'stimato',
  fame_emotiva: false,
  note: '',
};

/** Totali giornalieri calcolati dai pasti */
export interface TotaliGiorno {
  calorie_totali: number;
  proteine_totali: number;
  carboidrati_totali: number;
  grassi_totali: number;
  acqua_totale: number;
  omega3_preso: boolean;
}

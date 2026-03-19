// Utility di export CSV per la nutrizionista
// Separatore ";" — standard italiano per Excel
// UTF-8 con BOM per caratteri accentati
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { caloriePasto, bilancioGiornaliero, calorieConsumate } from './calcoli';
import { GIORNI_PRESET } from '../data/esercizi';
import type { Pasto, Sessione, EsercizioLog, GiornoLettera } from '../types/index';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const SEP = ';';
const BOM = '\uFEFF';
const BMR_DEFAULT = 1650;

// Mappa nome esercizio → gruppo muscolare (stessa di useProgressi)
const GRUPPO_PER_NOME: ReadonlyMap<string, string> = new Map(
  Object.values(GIORNI_PRESET)
    .flatMap((g) => g.gruppi)
    .flatMap((g) => g.esercizi)
    .map((e) => [e.nome, e.gruppo_muscolare] as const)
);

const TIPO_PASTO_LABEL: Record<string, string> = {
  colazione: 'Colazione',
  spuntino_1_am: 'Spuntino AM',
  spuntino_2_am: 'Spuntino AM 2',
  pranzo: 'Pranzo',
  spuntino_3_pm: 'Spuntino PM',
  cena: 'Cena',
};

const PORZIONE_LABEL: Record<string, string> = {
  pesato: 'Pesata',
  stimato: 'Stimata',
  non_rispettato: 'Non rispettata',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataDDMMYYYY(iso: string): string {
  // iso = 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function num(n: number): string {
  return n.toFixed(1);
}

function riga(...cells: (string | number | boolean | null | undefined)[]): string {
  return cells
    .map((c) => {
      if (c === null || c === undefined) return '';
      const s = String(c);
      // Esegui escape se la cella contiene il separatore o virgolette
      if (s.includes(SEP) || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(SEP);
}

/** Raggruppa pasti per giorno (chiave = 'YYYY-MM-DD') */
function raggruppaPerGiorno<T extends { giorno_id: string }>(
  items: T[],
  giornoMap: Map<string, string>
): Map<string, T[]> {
  const mappa = new Map<string, T[]>();
  for (const item of items) {
    const data = giornoMap.get(item.giorno_id) ?? '';
    const lista = mappa.get(data) ?? [];
    lista.push(item);
    mappa.set(data, lista);
  }
  return mappa;
}

/** Date ordenate nel range [dataInizio, dataFine] */
function dateNelRange(dataInizio: string, dataFine: string): string[] {
  const dates: string[] = [];
  const cur = new Date(dataInizio);
  const fine = new Date(dataFine);
  while (cur <= fine) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Numero della settimana ISO nel range (1 = prima settimana) */
function settimanaRelativa(data: string, dataInizio: string): number {
  const msPerDay = 86400000;
  const diff = new Date(data).getTime() - new Date(dataInizio).getTime();
  return Math.floor(diff / (7 * msPerDay)) + 1;
}

// ─── Tipi locali ──────────────────────────────────────────────────────────────

interface GiornoRow {
  id: string;
  data: string;
}

interface SessioneConEsercizi extends Sessione {
  esercizi: EsercizioLog[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function fetchGiorni(dataInizio: string, dataFine: string): Promise<GiornoRow[]> {
  const { data, error } = await supabase
    .from('giorni')
    .select('id, data')
    .gte('data', dataInizio)
    .lte('data', dataFine)
    .order('data');
  if (error) throw new Error(error.message);
  return (data ?? []) as GiornoRow[];
}

async function fetchPasti(giornoIds: string[]): Promise<Pasto[]> {
  if (giornoIds.length === 0) return [];
  const { data, error } = await supabase
    .from('pasti')
    .select('*')
    .in('giorno_id', giornoIds)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Pasto[];
}

async function fetchSessioni(giornoIds: string[]): Promise<Sessione[]> {
  if (giornoIds.length === 0) return [];
  const { data, error } = await supabase
    .from('sessioni')
    .select('*')
    .in('giorno_id', giornoIds)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Sessione[];
}

async function fetchEserciziLog(sessioneIds: string[]): Promise<EsercizioLog[]> {
  if (sessioneIds.length === 0) return [];
  const { data, error } = await supabase
    .from('esercizi_log')
    .select('*')
    .in('sessione_id', sessioneIds)
    .order('ordine');
  if (error) throw new Error(error.message);
  return (data ?? []) as EsercizioLog[];
}

// ─── Report alimentazione ─────────────────────────────────────────────────────

export async function generaReportAlimentazione(
  dataInizio: string,
  dataFine: string
): Promise<string> {
  const giorni = await fetchGiorni(dataInizio, dataFine);
  if (giorni.length === 0) return '';

  const giornoMap = new Map(giorni.map((g) => [g.id, g.data]));
  const pasti = await fetchPasti(giorni.map((g) => g.id));

  const pastiPerGiorno = raggruppaPerGiorno(pasti, giornoMap);

  const linee: string[] = [
    BOM,
    riga(
      'Data',
      'Tipo Pasto',
      'Opzione Piano',
      'Proteine (g)',
      'Carboidrati (g)',
      'Grassi (g)',
      'Calorie (kcal)',
      'Acqua (ml)',
      'Omega-3',
      'Porzione',
      'Fame Emotiva',
      'Note'
    ),
  ];

  for (const dataIso of dateNelRange(dataInizio, dataFine)) {
    const pastiGiorno = pastiPerGiorno.get(dataIso) ?? [];
    if (pastiGiorno.length === 0) continue;

    const data = dataDDMMYYYY(dataIso);
    let totP = 0, totC = 0, totG = 0, totKcal = 0, totAcqua = 0;
    let pesate = 0;

    for (const p of pastiGiorno) {
      const kcal = caloriePasto(p.proteine_g, p.carboidrati_g, p.grassi_g);
      totP += p.proteine_g;
      totC += p.carboidrati_g;
      totG += p.grassi_g;
      totKcal += kcal;
      totAcqua += p.acqua_ml;
      if (p.porzione === 'pesato') pesate++;

      linee.push(riga(
        data,
        TIPO_PASTO_LABEL[p.tipo_pasto] ?? p.tipo_pasto,
        p.nome ?? '',
        num(p.proteine_g),
        num(p.carboidrati_g),
        num(p.grassi_g),
        Math.round(kcal).toString(),
        p.acqua_ml > 0 ? p.acqua_ml.toString() : '',
        p.omega3 ? 'Sì' : '',
        PORZIONE_LABEL[p.porzione] ?? p.porzione,
        p.fame_emotiva ? 'Sì' : '',
        p.note ?? ''
      ));
    }

    // Riga totale giorno
    linee.push(riga(
      data,
      'TOTALE GIORNO',
      `${pesate}/${pastiGiorno.length} pesate`,
      num(totP),
      num(totC),
      num(totG),
      Math.round(totKcal).toString(),
      totAcqua.toString(),
      '', '', '', ''
    ));
    linee.push(''); // riga vuota tra giorni
  }

  return linee.join('\r\n');
}

// ─── Report allenamento ───────────────────────────────────────────────────────

export async function generaReportAllenamento(
  dataInizio: string,
  dataFine: string
): Promise<string> {
  const giorni = await fetchGiorni(dataInizio, dataFine);
  if (giorni.length === 0) return '';

  const giornoMap = new Map(giorni.map((g) => [g.id, g.data]));
  const sessioni = await fetchSessioni(giorni.map((g) => g.id));
  if (sessioni.length === 0) return '';

  const esercizi = await fetchEserciziLog(sessioni.map((s) => s.id));
  const eserciziPerSessione = new Map<string, EsercizioLog[]>();
  for (const e of esercizi) {
    const lista = eserciziPerSessione.get(e.sessione_id) ?? [];
    lista.push(e);
    eserciziPerSessione.set(e.sessione_id, lista);
  }

  const sessioniConEs: SessioneConEsercizi[] = sessioni.map((s) => ({
    ...s,
    esercizi: eserciziPerSessione.get(s.id) ?? [],
  }));

  // Raggruppa sessioni per giorno
  const sessioniPerGiorno = new Map<string, SessioneConEsercizi[]>();
  for (const s of sessioniConEs) {
    const data = giornoMap.get(s.giorno_id) ?? '';
    const lista = sessioniPerGiorno.get(data) ?? [];
    lista.push(s);
    sessioniPerGiorno.set(data, lista);
  }

  const linee: string[] = [
    BOM,
    riga(
      'Data',
      'Giorno Scheda',
      'Esercizio',
      'Gruppo Muscolare',
      'Serie',
      'Reps',
      'Carico A (kg)',
      'Carico B (kg)',
      'Volume (kg)',
      'Superset',
      'Note Sessione'
    ),
  ];

  for (const dataIso of dateNelRange(dataInizio, dataFine)) {
    const sessioniGiorno = sessioniPerGiorno.get(dataIso) ?? [];
    if (sessioniGiorno.length === 0) continue;

    const data = dataDDMMYYYY(dataIso);

    for (const s of sessioniGiorno) {
      const lettera = (s.giorno_lettera as GiornoLettera | null) ?? null;
      const giornoScheda = lettera === 'riposo' ? 'Riposo' : (lettera ?? s.tipo);
      const noteSessione = s.note ?? '';

      for (const e of s.esercizi) {
        linee.push(riga(
          data,
          giornoScheda,
          e.nome_esercizio,
          GRUPPO_PER_NOME.get(e.nome_esercizio) ?? 'Altro',
          e.serie.toString(),
          e.reps.toString(),
          num(e.carico_a_kg),
          num(e.carico_b_kg),
          num(e.volume_kg),
          e.superset_label ?? '',
          noteSessione
        ));
      }

      // Riga riepilogo sessione
      const volTot = s.esercizi.reduce((acc, e) => acc + e.volume_kg, 0);
      const calConsumate_ = calorieConsumate(s.durata_min ?? 0, s.cardio_extra_min);
      linee.push(riga(
        data,
        giornoScheda,
        'RIEPILOGO SESSIONE',
        '',
        '',
        '',
        '',
        '',
        num(volTot),
        '',
        [
          s.durata_min !== null ? `Durata: ${s.durata_min} min` : '',
          s.rpe !== null ? `RPE: ${s.rpe}` : '',
          s.cardio_extra_min > 0 ? `Cardio: ${s.cardio_extra_min} min` : '',
          `Cal consumate: ~${calConsumate_} kcal`,
        ].filter(Boolean).join(' | ')
      ));
      linee.push('');
    }
  }

  return linee.join('\r\n');
}

// ─── Riepilogo settimanale ────────────────────────────────────────────────────

export async function generaRiepilogoSettimanale(
  dataInizio: string,
  dataFine: string
): Promise<string> {
  const giorni = await fetchGiorni(dataInizio, dataFine);
  if (giorni.length === 0) return '';

  const giornoMap = new Map(giorni.map((g) => [g.id, g.data]));
  const [pasti, sessioni] = await Promise.all([
    fetchPasti(giorni.map((g) => g.id)),
    fetchSessioni(giorni.map((g) => g.id)),
  ]);

  const esercizi = await fetchEserciziLog(sessioni.map((s) => s.id));
  const volPerSessione = new Map<string, number>();
  for (const e of esercizi) {
    volPerSessione.set(e.sessione_id, (volPerSessione.get(e.sessione_id) ?? 0) + e.volume_kg);
  }

  // Aggregazioni per giorno
  interface DayStats {
    kcal: number;
    acqua: number;
    pesate: number;
    totalePasti: number;
    fameEmotiva: number;
    sessioni: Sessione[];
  }
  const perGiorno = new Map<string, DayStats>();

  for (const p of pasti) {
    const data = giornoMap.get(p.giorno_id) ?? '';
    const s = perGiorno.get(data) ?? { kcal: 0, acqua: 0, pesate: 0, totalePasti: 0, fameEmotiva: 0, sessioni: [] };
    s.kcal += caloriePasto(p.proteine_g, p.carboidrati_g, p.grassi_g);
    s.acqua += p.acqua_ml;
    if (p.porzione === 'pesato') s.pesate++;
    s.totalePasti++;
    if (p.fame_emotiva) s.fameEmotiva++;
    perGiorno.set(data, s);
  }

  for (const s of sessioni) {
    const data = giornoMap.get(s.giorno_id) ?? '';
    const stats = perGiorno.get(data) ?? { kcal: 0, acqua: 0, pesate: 0, totalePasti: 0, fameEmotiva: 0, sessioni: [] };
    stats.sessioni.push(s);
    perGiorno.set(data, stats);
  }

  // Raggruppa per settimana relativa
  interface WeekStats {
    label: string;
    giorni: number;
    totKcal: number;
    totAcqua: number;
    totPesate: number;
    totPasti: number;
    totFameEmotiva: number;
    sessioni: number;
    volTotale: number;
    deficit: number;
  }
  const settimane = new Map<number, WeekStats>();

  for (const dataIso of dateNelRange(dataInizio, dataFine)) {
    const dayStats = perGiorno.get(dataIso);
    if (!dayStats) continue;

    const nSett = settimanaRelativa(dataIso, dataInizio);
    const ws: WeekStats = settimane.get(nSett) ?? {
      label: `Settimana ${nSett}`,
      giorni: 0,
      totKcal: 0,
      totAcqua: 0,
      totPesate: 0,
      totPasti: 0,
      totFameEmotiva: 0,
      sessioni: 0,
      volTotale: 0,
      deficit: 0,
    };

    const calCons = dayStats.sessioni.reduce(
      (acc, s) => acc + calorieConsumate(s.durata_min ?? 0, s.cardio_extra_min),
      0
    );
    ws.giorni++;
    ws.totKcal += dayStats.kcal;
    ws.totAcqua += dayStats.acqua;
    ws.totPesate += dayStats.pesate;
    ws.totPasti += dayStats.totalePasti;
    ws.totFameEmotiva += dayStats.fameEmotiva;
    ws.sessioni += dayStats.sessioni.filter(
      (s) => s.giorno_lettera !== null && s.giorno_lettera !== 'riposo'
    ).length;
    ws.volTotale += dayStats.sessioni.reduce(
      (acc, s) => acc + (volPerSessione.get(s.id) ?? 0),
      0
    );
    ws.deficit += dayStats.kcal - calCons - BMR_DEFAULT;
    settimane.set(nSett, ws);
  }

  const linee: string[] = [
    BOM,
    riga(
      'Settimana',
      'Calorie Medie/Giorno (kcal)',
      'Deficit Medio (kcal)',
      'Acqua Media (ml)',
      'Sessioni Completate',
      'Volume Totale (kg)',
      '% Porzioni Pesate',
      'Episodi Fame Emotiva'
    ),
  ];

  const numSett = Array.from(settimane.keys()).sort((a, b) => a - b);
  for (const n of numSett) {
    const ws = settimane.get(n)!;
    const g = ws.giorni || 1;
    const percPesate = ws.totPasti > 0 ? Math.round((ws.totPesate / ws.totPasti) * 100) : 0;
    linee.push(riga(
      ws.label,
      Math.round(ws.totKcal / g).toString(),
      Math.round(ws.deficit / g).toString(),
      Math.round(ws.totAcqua / g).toString(),
      ws.sessioni.toString(),
      num(ws.volTotale),
      `${percPesate}%`,
      ws.totFameEmotiva.toString()
    ));
  }

  return linee.join('\r\n');
}

// ─── Esporta tutto via share sheet ───────────────────────────────────────────

export interface OpzioniExport {
  alimentazione: boolean;
  allenamento: boolean;
  riepilogo: boolean;
}

export async function esportaTutto(
  dataInizio: string,
  dataFine: string,
  opzioni: OpzioniExport
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Condivisione non disponibile su questo dispositivo');
  }

  const label = `${dataInizio}_${dataFine}`;
  const tmpDir = FileSystem.cacheDirectory ?? '';
  const filesDaCondividere: string[] = [];

  const [csvAlim, csvAll, csvRiep] = await Promise.all([
    opzioni.alimentazione ? generaReportAlimentazione(dataInizio, dataFine) : Promise.resolve(''),
    opzioni.allenamento ? generaReportAllenamento(dataInizio, dataFine) : Promise.resolve(''),
    opzioni.riepilogo ? generaRiepilogoSettimanale(dataInizio, dataFine) : Promise.resolve(''),
  ]);

  if (opzioni.alimentazione && csvAlim.length > BOM.length) {
    const path = `${tmpDir}report_alimentazione_${label}.csv`;
    await FileSystem.writeAsStringAsync(path, csvAlim, { encoding: FileSystem.EncodingType.UTF8 });
    filesDaCondividere.push(path);
  }
  if (opzioni.allenamento && csvAll.length > BOM.length) {
    const path = `${tmpDir}report_allenamento_${label}.csv`;
    await FileSystem.writeAsStringAsync(path, csvAll, { encoding: FileSystem.EncodingType.UTF8 });
    filesDaCondividere.push(path);
  }
  if (opzioni.riepilogo && csvRiep.length > BOM.length) {
    const path = `${tmpDir}riepilogo_settimanale_${label}.csv`;
    await FileSystem.writeAsStringAsync(path, csvRiep, { encoding: FileSystem.EncodingType.UTF8 });
    filesDaCondividere.push(path);
  }

  if (filesDaCondividere.length === 0) {
    throw new Error('Nessun dato trovato per il periodo selezionato');
  }

  // expo-sharing condivide un file alla volta; per più file li componiamo
  // Primo file apre la share sheet; gli altri vengono condivisi sequenzialmente
  for (const filePath of filesDaCondividere) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Esporta dati per la nutrizionista',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

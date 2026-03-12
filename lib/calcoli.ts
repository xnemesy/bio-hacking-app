// Funzioni di business logic per calcoli nutrizionali e di allenamento
import type { StatoGiorno } from '../types/index';

/** Calorie di un pasto: P*4 + C*4 + G*9 */
export function caloriePasto(
  proteineG: number,
  carboidratiG: number,
  grassiG: number
): number {
  return proteineG * 4 + carboidratiG * 4 + grassiG * 9;
}

/** Volume totale esercizio: serie × reps × (caricoA + caricoB) */
export function volumeEsercizio(
  serie: number,
  reps: number,
  caricoAKg: number,
  caricoBKg: number
): number {
  return serie * reps * (caricoAKg + caricoBKg);
}

/**
 * Bilancio giornaliero in kcal.
 * Positivo = surplus, negativo = deficit.
 * @param calIngerite  kcal totali dai pasti
 * @param calConsumate kcal bruciate con attività
 * @param bmr          metabolismo basale (default 1650 kcal)
 */
export function bilancioGiornaliero(
  calIngerite: number,
  calConsumate: number,
  bmr: number = 1650
): number {
  return calIngerite - calConsumate - bmr;
}

/**
 * Stato semaforo del giorno.
 * 🟢 = bilancio tra -300 e +300 E acqua >= 2000 ml
 * 🔴 = bilancio < -500 o > +500
 * 🟡 = tutto il resto
 */
export function statoGiorno(bilancio: number, acquaMl: number): StatoGiorno {
  const bilancioOk = bilancio >= -300 && bilancio <= 300;
  const acquaOk = acquaMl >= 2000;

  if (bilancioOk && acquaOk) return '🟢';
  if (Math.abs(bilancio) > 500) return '🔴';
  return '🟡';
}

/**
 * Stima calorie consumate con attività.
 * Formula semplificata: 7 kcal/min allenamento + 10 kcal/min cardio extra.
 * @param durataMin  durata totale sessione in minuti
 * @param cardioMin  minuti di cardio specifico (inclusi in durataMin)
 */
export function calorieConsumate(durataMin: number, cardioMin: number): number {
  const minForza = Math.max(0, durataMin - cardioMin);
  return Math.round(minForza * 7 + cardioMin * 10);
}

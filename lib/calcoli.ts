// Funzioni di business logic per calcoli nutrizionali e di allenamento
import type { StatoGiorno, Ingrediente, MacroTotali } from '../types/index';

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

/** Calcola macro di un ingrediente per la quantità specificata */
export function macroIngrediente(
  per100: { proteine: number; carboidrati: number; grassi: number },
  grammi: number
): { proteine: number; carboidrati: number; grassi: number; kcal: number } {
  const ratio = grammi / 100;
  const p = +(per100.proteine * ratio).toFixed(1);
  const c = +(per100.carboidrati * ratio).toFixed(1);
  const g = +(per100.grassi * ratio).toFixed(1);
  return { proteine: p, carboidrati: c, grassi: g, kcal: Math.round(p * 4 + c * 4 + g * 9) };
}

/** Somma tutti gli ingredienti → totali da salvare su pasti */
export function sommaIngredienti(ingredienti: Ingrediente[]): MacroTotali {
  return ingredienti.reduce(
    (acc, ing) => {
      const m = macroIngrediente(ing.per100, ing.grammi);
      return {
        proteine_g: +(acc.proteine_g + m.proteine).toFixed(1),
        carboidrati_g: +(acc.carboidrati_g + m.carboidrati).toFixed(1),
        grassi_g: +(acc.grassi_g + m.grassi).toFixed(1),
        kcal: acc.kcal + m.kcal,
      };
    },
    { proteine_g: 0, carboidrati_g: 0, grassi_g: 0, kcal: 0 }
  );
}

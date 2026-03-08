/**
 * Narzędzia matematyczne.
 */

// Znaki operacji — re-eksport z centralnego pliku symbols.ts
export { operationSymbol } from './symbols';

/**
 * Rozdziela liczbę na cyfry, wyrównując do zadanej długości zerami z lewej.
 * Przykład: splitDigits(17, 3) → ['0', '1', '7']
 */
export function splitDigits(n: number, padTo: number): string[] {
  const s = String(Math.abs(n));
  const padded = s.padStart(padTo, '0');
  return padded.split('');
}

/**
 * Zwraca maksymalną liczbę cyfr spośród podanych liczb.
 */
export function maxDigits(...nums: number[]): number {
  return Math.max(...nums.map(n => String(Math.abs(n)).length));
}

/**
 * Oblicza ocenę szkolną z procentu.
 */
export function calcGrade(correct: number, total: number): number {
  if (total === 0) return 1;
  const pct = (correct / total) * 100;
  if (pct === 100) return 6;
  if (pct >= 90)   return 5;
  if (pct >= 75)   return 4;
  if (pct >= 60)   return 3;
  if (pct >= 40)   return 2;
  return 1;
}

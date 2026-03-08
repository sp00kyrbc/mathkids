// Wszystkie znaki specjalne w jednym miejscu.
// NIGDY nie używaj literalnych znaków ÷ × − poza tym plikiem.
export const SYM = {
  multiply:   '\u00D7',   // ×
  divide:     '\u00F7',   // ÷
  minus:      '\u2212',   // −
  plus:       '+',
  check:      '\u2713',   // ✓
  bullet:     '\u2022',   // •
} as const;

export function operationSymbol(op: string): string {
  switch (op) {
    case 'multiplication': return SYM.multiply;
    case 'division':       return SYM.divide;
    case 'subtraction':    return SYM.minus;
    default:               return SYM.plus;
  }
}

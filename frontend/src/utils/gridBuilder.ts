import type { Task, GridCell } from '../types/task';

/**
 * Buduje siatkę komórek dla działania pisemnego.
 * Różne layouty dla różnych operacji.
 */
export function buildGrid(task: Task): GridCell[][] {
  switch (task.layout.type) {
    case 'vertical': return buildVerticalGrid(task);
    case 'multiplication': return buildMultiplicationGrid(task);
    case 'division': return buildDivisionGrid(task);
    default: return buildVerticalGrid(task);
  }
}

function makeCell(
  row: number, col: number,
  value: string = '',
  editable: boolean = false,
  stepId: number | null = null
): GridCell {
  return {
    id: `r${row}-c${col}`,
    row, col, value,
    state: value !== '' ? 'given' : 'empty',
    editable,
    stepId,
  };
}

function makeEmpty(row: number, col: number): GridCell {
  return makeCell(row, col, '', false);
}

/**
 * Siatka dla dodawania i odejmowania:
 *
 * Row 0: [przeniesienia / pożyczki]
 * Row 1: operand1 (cyfry)
 * Row 2: symbol + operand2 (cyfry)
 * Row 3: linia (separator — nie kratka, CSS)
 * Row 4: wynik (puste do wypełnienia)
 */
function buildVerticalGrid(task: Task): GridCell[][] {
  const { layout } = task;
  const maxLen = layout.max_len;
  const cols = maxLen + 1; // +1 na symbol operacji

  // 5 wierszy: carry/borrow, op1, op2, (linia), wynik
  const grid: GridCell[][] = [];

  // Inicjalizacja
  for (let r = 0; r < 5; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = makeEmpty(r, c);
    }
  }

  // Wiersz 0: przeniesienia (puste, do wypełnienia przez dziecko przy carry-mode)
  // Zostawione puste — filled in during tutoring

  // Wiersz 1: operand1 (cyfry z prawego wyrównania)
  const op1 = layout.operand1.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1; // col 0 = symbol
    const digit = op1[i];
    if (digit !== ' ') {
      grid[1][c] = makeCell(1, c, digit, false);
    }
  }

  // Wiersz 2: symbol + operand2
  grid[2][0] = makeCell(2, 0, layout.symbol, false);
  const op2 = layout.operand2.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1;
    const digit = op2[i];
    if (digit !== ' ') {
      grid[2][c] = makeCell(2, c, digit, false);
    }
  }

  // Wiersz 3: marker linii (specjalny)
  grid[3][0] = makeCell(3, 0, '—', false);

  // Wiersz 4: wynik — puste komórki do wypełnienia
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1;
    const colIndex = maxLen - 1 - i; // odwrotna kolejność: kolIndex 0 = jedności
    // Znajdź krok dla tej kolumny
    const step = task.steps.find(s => s.column === colIndex && s.position === 'result');
    grid[4][c] = makeCell(4, c, '', true, step?.step_id ?? null);
  }

  return grid;
}

/**
 * Siatka dla mnożenia:
 * Row 0: operand1
 * Row 1: symbol × + operand2
 * Row 2: linia
 * Row 3..N: wyniki cząstkowe (jeden na mnożnik-cyfrę)
 * Row N+1: linia sumy (jeśli > 1 wynik cząstkowy)
 * Row N+2: wynik końcowy
 */
function buildMultiplicationGrid(task: Task): GridCell[][] {
  const { layout } = task;
  const maxLen = layout.max_len;
  const partials = layout.partials || [];
  const cols = maxLen + 2;
  const rows = 3 + partials.length + (partials.length > 1 ? 2 : 0);

  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = makeEmpty(r, c);
    }
  }

  // Wiersz 0: operand1
  const op1 = layout.operand1.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const digit = op1[i];
    if (digit !== ' ') grid[0][i + 1] = makeCell(0, i + 1, digit, false);
  }

  // Wiersz 1: symbol + operand2
  grid[1][0] = makeCell(1, 0, '\u00d7', false);
  const op2 = layout.operand2.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const digit = op2[i];
    if (digit !== ' ') grid[1][i + 1] = makeCell(1, i + 1, digit, false);
  }

  // Wiersz 2: linia
  grid[2][0] = makeCell(2, 0, '—', false);

  // Wiersze cząstkowe
  partials.forEach((p, pi) => {
    const row = 3 + pi;
    const display = p.display.padStart(maxLen, ' ');
    for (let i = 0; i < display.length; i++) {
      const digit = display[i];
      if (digit !== ' ') grid[row][i + 1] = makeCell(row, i + 1, '', true, pi);
    }
  });

  // Wynik końcowy
  if (partials.length > 1) {
    const sumRow = 3 + partials.length;
    grid[sumRow][0] = makeCell(sumRow, 0, '—', false);
    const result = layout.result.padStart(maxLen, ' ');
    for (let i = 0; i < maxLen; i++) {
      const digit = result[i];
      if (digit !== ' ') {
        grid[sumRow + 1][i + 1] = makeCell(sumRow + 1, i + 1, '', true, null);
      }
    }
  }

  return grid;
}

/**
 * Siatka dla dzielenia (polska metoda):
 * ┌──────────────────────┐
 * │ dzielna  │  dzielnik │
 * │ ─────    │ ────────  │
 * │  reszta  │  wynik    │
 * └──────────────────────┘
 */
function buildDivisionGrid(task: Task): GridCell[][] {
  const dividend = task.layout.dividend || String(task.operand1);
  const divisor = task.layout.divisor || String(task.operand2);
  const quotient = task.layout.quotient || String(task.result);
  const substeps = task.layout.substeps || [];

  // Szerokość: dzielna + separator + dzielnik/wynik
  const leftWidth = dividend.length + 2;
  const rightWidth = Math.max(divisor.length, quotient.length) + 2;
  const cols = leftWidth + rightWidth;
  // Wiersze: dzielna/dzielnik + kroki
  const rows = Math.max(4, substeps.length * 2 + 2);

  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = makeEmpty(r, c);
    }
  }

  // Wiersz 0: dzielna po lewej, dzielnik po prawej
  for (let i = 0; i < dividend.length; i++) {
    grid[0][i] = makeCell(0, i, dividend[i], false);
  }
  // Separator pionowy (wizualny — CSS)
  for (let i = 0; i < divisor.length; i++) {
    grid[0][leftWidth + i] = makeCell(0, leftWidth + i, divisor[i], false);
  }

  // Wiersz 1: linia pod dzielnikiem + wynik do wypełnienia
  for (let i = 0; i < quotient.length; i++) {
    const step = task.steps.find(s => s.column === i && s.position === 'result');
    grid[1][leftWidth + i] = makeCell(1, leftWidth + i, '', true, step?.step_id ?? null);
  }

  // Podkroki (reszty cząstkowe)
  substeps.forEach((sub, si) => {
    const row = si * 2 + 1;
    const remainder_str = String(sub.current_value);
    const product_str = String(sub.product);

    // Reszta (aktualna wartość)
    for (let i = 0; i < remainder_str.length; i++) {
      if (row < rows) {
        grid[row][si + i] = makeCell(row, si + i, remainder_str[i], false);
      }
    }
    // Iloczyn (do odjęcia)
    if (row + 1 < rows) {
      for (let i = 0; i < product_str.length; i++) {
        grid[row + 1][si + i] = makeCell(row + 1, si + i, '', true, si);
      }
    }
  });

  return grid;
}

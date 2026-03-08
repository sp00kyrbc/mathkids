# 09-bugfix-grid.md — Naprawa siatki dla wszystkich działań

## Przeczytaj najpierw
Przeczytaj `CLAUDE.md` przed rozpoczęciem. Ten plik naprawia bugi w renderowaniu siatki matematycznej.

## Zidentyfikowane bugi

1. **Złe cyfry operandów** — `490` wyświetla się jako `4 4 3`, `894` jako `3 9`
2. **Przesunięte kolumny** — cyfry lądują w złych kratkach
3. **Znak `×` renderuje się jako `Ä–`** — błąd enkodowania UTF-8
4. **Kroki nie zgadzają się z aktywnymi komórkami** — feedback dotyczy innej kolumny niż podświetlona kratka
5. **Mnożenie** — złe wyrównanie wyników cząstkowych

---

## Krok 1 — Zdiagnozuj backend

Zanim naprawiasz frontend, sprawdź czy backend zwraca poprawne dane:

```bash
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"addition","max_digits1":3,"max_digits2":2}'
```

Sprawdź w odpowiedzi pola `layout.operand1`, `layout.operand2`, `layout.result` — muszą być poprawnymi stringami cyfr (np. `"490"`, `"037"`, `"527"`).

```bash
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiplication","max_digits1":3,"max_digits2":1}'
```

Jeśli backend zwraca złe dane — napraw najpierw `backend/src/python/arithmetic_engine.py` w funkcjach `_build_addition_layout` i `_build_multiplication_layout`. Jeśli dane są poprawne — problem jest tylko w frontendzie.

---

## Krok 2 — Przepisz `frontend/src/utils/gridBuilder.ts`

Zastąp CAŁY plik poniższą implementacją:

```typescript
import { Task, GridCell, TaskStep } from '../types/task';

/**
 * Buduje siatkę komórek dla działania pisemnego.
 * ZASADA: kolumna 0 = symbol operacji, kolumny 1..N = cyfry (wyrównane do prawej)
 */
export function buildGrid(task: Task): GridCell[][] {
  switch (task.layout.type) {
    case 'vertical':        return buildVerticalGrid(task);
    case 'multiplication':  return buildMultiplicationGrid(task);
    case 'division':        return buildDivisionGrid(task);
    default:                return buildVerticalGrid(task);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function cell(
  row: number,
  col: number,
  value: string = '',
  editable: boolean = false,
  stepId: number | null = null
): GridCell {
  return {
    id: `r${row}-c${col}`,
    row,
    col,
    value,
    state: (value !== '' ? 'given' : 'empty') as GridCell['state'],
    editable,
    stepId,
  };
}

function emptyCell(row: number, col: number): GridCell {
  return cell(row, col, '', false, null);
}

/**
 * Zwraca tablicę cyfr stringa wyrównaną do maxLen.
 * Pozycja 0 = najbardziej znacząca cyfra (lewa).
 * Jeśli string krótszy niż maxLen — dopełniamy '' z lewej (puste komórki).
 */
function padDigits(str: string, maxLen: number): string[] {
  const digits = str.replace(/\s/g, '').split('');
  const padding = maxLen - digits.length;
  return [...Array(padding).fill(''), ...digits];
}

// ─── DODAWANIE I ODEJMOWANIE (vertical layout) ────────────────────────────────

/**
 * Układ siatki dla dodawania i odejmowania:
 *
 * col:  0    1    2    3    4    (przykład 4-cyfrowy)
 * row0: [ ]  [c3] [c2] [c1] [c0]   ← przeniesienia (carry) — puste na start
 * row1: [ ]  [d]  [d]  [d]  [d]    ← operand1
 * row2: [+]  [d]  [d]  [d]  [d]    ← symbol + operand2
 *       ────────────────────────    ← linia (CSS, nie wiersz)
 * row3: [ ]  [?]  [?]  [?]  [?]    ← wynik (edytowalne)
 *
 * Kolumna 0 to symbol lub puste miejsce.
 * Cyfry są wyrównane DO PRAWEJ — ostatnia cyfra zawsze w ostatniej kolumnie.
 */
function buildVerticalGrid(task: Task): GridCell[][] {
  const { layout } = task;

  // Upewnij się że operandy są stringami bez spacji
  const op1 = String(task.operand1);
  const op2 = String(task.operand2);
  const res = String(task.result);

  const maxLen = Math.max(op1.length, op2.length, res.length);
  const totalCols = maxLen + 1; // +1 na kolumnę symbolu (col 0)

  // Cyfry wyrównane do prawej (col 1 = najstarsza, col maxLen = jedności)
  const digits1 = padDigits(op1, maxLen);
  const digits2 = padDigits(op2, maxLen);
  const digitsR = padDigits(res, maxLen);

  // Inicjalizuj 4 wiersze × totalCols kolumn
  const grid: GridCell[][] = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: totalCols }, (_, c) => emptyCell(r, c))
  );

  // Row 0: przeniesienia (carry) — na razie puste, wypełniane przez tutorial
  // (zostawiamy puste — nie ruszamy)

  // Row 1: operand1
  for (let i = 0; i < maxLen; i++) {
    const col = i + 1; // col 0 zarezerwowana na symbol
    const digit = digits1[i];
    if (digit !== '') {
      grid[1][col] = cell(1, col, digit, false, null);
    }
  }

  // Row 2: symbol + operand2
  grid[2][0] = cell(2, 0, layout.symbol, false, null);
  for (let i = 0; i < maxLen; i++) {
    const col = i + 1;
    const digit = digits2[i];
    if (digit !== '') {
      grid[2][col] = cell(2, col, digit, false, null);
    }
  }

  // Row 3: wynik — komórki edytowalne
  // Kolumna i odpowiada pozycji cyfry w wyniku
  // colIndex (0 = jedności) = maxLen - 1 - i (bo iterujemy od lewej)
  for (let i = 0; i < maxLen; i++) {
    const col = i + 1;
    const colIndex = maxLen - 1 - i; // 0 = jedności, rośnie w lewo

    // Znajdź krok który wypełnia tę kolumnę wyniku
    const step = task.steps.find(
      s => s.column === colIndex && s.position === 'result'
    );

    // Jeśli cyfra wyniku istnieje w tej pozycji
    if (digitsR[i] !== '') {
      grid[3][col] = cell(3, col, '', true, step?.step_id ?? null);
    }
  }

  return grid;
}

// ─── MNOŻENIE ─────────────────────────────────────────────────────────────────

/**
 * Układ siatki dla mnożenia:
 *
 * col:  0    1    2    3    4    5
 * row0: [ ]  [d]  [d]  [d]  [ ]  [ ]   ← operand1 (np. 894)
 * row1: [×]  [ ]  [ ]  [d]  [d]  [ ]   ← symbol + operand2 (np. 3)
 *       ─────────────────────────────   ← linia
 * row2: [ ]  [?]  [?]  [?]  [?]  [ ]   ← wynik cząstkowy 1
 * row3: [ ]  [?]  [?]  [?]  [?]  [ ]   ← wynik cząstkowy 2 (jeśli mnożnik 2-cyfrowy)
 *       ─────────────────────────────   ← linia sumy (jeśli > 1 cząstkowy)
 * row4: [ ]  [?]  [?]  [?]  [?]  [ ]   ← wynik końcowy
 */
function buildMultiplicationGrid(task: Task): GridCell[][] {
  const op1 = String(task.operand1);
  const op2 = String(task.operand2);
  const res = String(task.result);
  const partials = task.partials || [];

  // Oblicz maksymalną szerokość
  const maxPartialLen = partials.length > 0
    ? Math.max(...partials.map(p => String(p.value).length + p.shift))
    : 0;
  const maxLen = Math.max(op1.length, op2.length, res.length, maxPartialLen);
  const totalCols = maxLen + 1;

  const hasMultiplePartials = partials.length > 1;
  // Wiersze: op1, op2, [partials...], [linia sumy], wynik
  const totalRows = 2 + partials.length + (hasMultiplePartials ? 2 : 1);

  const grid: GridCell[][] = Array.from({ length: totalRows }, (_, r) =>
    Array.from({ length: totalCols }, (_, c) => emptyCell(r, c))
  );

  const digits1 = padDigits(op1, maxLen);
  const digits2 = padDigits(op2, maxLen);

  // Row 0: operand1
  for (let i = 0; i < maxLen; i++) {
    const d = digits1[i];
    if (d !== '') grid[0][i + 1] = cell(0, i + 1, d, false);
  }

  // Row 1: symbol + operand2
  grid[1][0] = cell(1, 0, '\u00D7', false); // × jako Unicode, bez problemów z enkodowaniem
  for (let i = 0; i < maxLen; i++) {
    const d = digits2[i];
    if (d !== '') grid[1][i + 1] = cell(1, i + 1, d, false);
  }

  // Wiersze cząstkowe (row 2, 3, ...)
  partials.forEach((p, pi) => {
    const row = 2 + pi;
    const partialStr = String(p.value);
    // Wynik cząstkowy jest przesunięty o p.shift pozycji w prawo (od prawej)
    const paddedLen = partialStr.length + p.shift;
    const digits = padDigits(partialStr, maxLen - p.shift);

    for (let i = 0; i < digits.length; i++) {
      const col = i + 1 + (maxLen - paddedLen);
      if (col >= 1 && col < totalCols && digits[i] !== '') {
        // Znajdź krok dla tej pozycji cząstkowej
        const step = task.steps.find(s => s.row === pi && s.column === (paddedLen - 1 - i));
        grid[row][col] = cell(row, col, '', true, step?.step_id ?? null);
      }
    }
  });

  // Wiersz wyniku końcowego
  const resultRow = hasMultiplePartials ? 2 + partials.length + 1 : 2 + partials.length;
  const digitsR = padDigits(res, maxLen);
  for (let i = 0; i < maxLen; i++) {
    if (digitsR[i] !== '') {
      const step = task.steps.find(s => s.position === 'result' && s.row === null);
      grid[resultRow][i + 1] = cell(resultRow, i + 1, '', true, step?.step_id ?? null);
    }
  }

  return grid;
}

// ─── DZIELENIE ────────────────────────────────────────────────────────────────

/**
 * Układ dla dzielenia (polska metoda):
 *
 *  d d d d | D D     ← dzielna | dzielnik
 *          |------
 *          | q q     ← wynik (edytowalny)
 *  -------
 *  r r r
 *    -----
 *    r r r
 *      ...
 */
function buildDivisionGrid(task: Task): GridCell[][] {
  const dividendStr = String(task.operand1);
  const divisorStr  = String(task.operand2);
  const quotientStr = String(task.result);
  const substeps    = task.division_steps || [];

  const leftCols  = dividendStr.length + 1; // +1 na separator |
  const rightCols = Math.max(divisorStr.length, quotientStr.length) + 1;
  const totalCols = leftCols + rightCols;

  // Wiersze: dzielna/dzielnik + 2 wiersze na każdy podkrok + 1 zapas
  const totalRows = Math.max(4, substeps.length * 2 + 2);

  const grid: GridCell[][] = Array.from({ length: totalRows }, (_, r) =>
    Array.from({ length: totalCols }, (_, c) => emptyCell(r, c))
  );

  // Row 0: dzielna po lewej
  for (let i = 0; i < dividendStr.length; i++) {
    grid[0][i] = cell(0, i, dividendStr[i], false);
  }

  // Row 0: dzielnik po prawej (za separatorem)
  for (let i = 0; i < divisorStr.length; i++) {
    grid[0][leftCols + i] = cell(0, leftCols + i, divisorStr[i], false);
  }

  // Row 1: wynik (edytowalny) po prawej
  for (let i = 0; i < quotientStr.length; i++) {
    const step = task.steps.find(s => s.column === i && s.position === 'result');
    grid[1][leftCols + i] = cell(1, leftCols + i, '', true, step?.step_id ?? null);
  }

  // Podkroki (reszty i iloczyny)
  substeps.forEach((sub, si) => {
    const baseRow = si * 2 + 2;
    if (baseRow >= totalRows) return;

    // Aktualna wartość (reszta × 10 + kolejna cyfra)
    const currentStr = String(sub.current_value);
    for (let i = 0; i < currentStr.length; i++) {
      const col = si + i;
      if (col < leftCols - 1) {
        grid[baseRow][col] = cell(baseRow, col, currentStr[i], false);
      }
    }

    // Iloczyn (do odjęcia) — edytowalny
    if (baseRow + 1 < totalRows) {
      const productStr = String(sub.product);
      for (let i = 0; i < productStr.length; i++) {
        const col = si + i;
        if (col < leftCols - 1) {
          grid[baseRow + 1][col] = cell(baseRow + 1, col, '', true, si);
        }
      }
    }
  });

  return grid;
}
```

---

## Krok 3 — Napraw enkodowanie znaków w `TaskDisplay.tsx` i `MathGrid.tsx`

Wyszukaj w całym projekcie każde wystąpienie znaków `−`, `×`, `÷` wpisanych literalnie i zastąp ich Unicode:

```typescript
// Znajdź i zamień wszędzie:
'+'  → '+'          // bez zmian
'−'  → '\u2212'     // minus (nie myślnik!)
'×'  → '\u00D7'     // znak mnożenia
'÷'  → '\u00F7'     // znak dzielenia
```

W `TaskDisplay.tsx` upewnij się też że `symbol` z backendu jest wyświetlany przez:
```typescript
{task.symbol}  // NIE hardkoduj — bierz z danych
```

---

## Krok 4 — Napraw synchronizację kroku z aktywną komórką w `TaskDisplay.tsx`

Znajdź logikę aktywowania komórki i upewnij się że:

```typescript
// Przy zmianie currentStepId — znajdź komórkę z tym stepId i ją aktywuj
useEffect(() => {
  if (!grid) return;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.stepId === currentStepId && cell.editable && cell.state === 'empty') {
        setActiveCell({ row: cell.row, col: cell.col });
        return;
      }
    }
  }
}, [currentStepId, grid]);
```

---

## Krok 5 — Testy manualne po naprawie

Uruchom backend i przetestuj każdą operację:

```bash
# Dodawanie
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"addition","max_digits1":3,"max_digits2":2}'

# Odejmowanie  
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"subtraction","max_digits1":3,"max_digits2":2}'

# Mnożenie
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiplication","max_digits1":3,"max_digits2":1}'

# Dzielenie
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"division","max_digits1":3,"max_digits2":1}'
```

Dla każdej operacji sprawdź w odpowiedzi JSON:
- `operand1` i `operand2` są poprawnymi liczbami
- `layout.operand1` / `layout.operand2` są stringami tych samych liczb
- `steps` mają sensowne `description` i `column`

Następnie w przeglądarce (http://localhost:5173) przetestuj wizualnie:
- [ ] Dodawanie: cyfry operandów wyświetlają się poprawnie, wyrównane do prawej
- [ ] Odejmowanie: cyfry operandów wyświetlają się poprawnie
- [ ] Mnożenie: `×` wyświetla się poprawnie (nie jako `Ä–`), cyfry na właściwych miejscach
- [ ] Dzielenie: dzielna i dzielnik widoczne, kratki wyniku aktywne
- [ ] Kliknięcie kratki → podświetlenie tej kratki
- [ ] Wpisanie cyfry → animacja + walidacja
- [ ] Feedback wskazuje na właściwą kolumnę

---

## ✅ Definicja "naprawione"

Bug jest naprawiony gdy:
- `490 + 37` wyświetla `4 9 0` w wierszu operand1 i `0 3 7` w wierszu operand2
- `894 × 3` wyświetla `8 9 4` i `3`, a znak mnożenia to `×` (nie `Ä–`)
- Aktywna kratka (czerwona obwódka) jest zawsze w wierszu WYNIKU, w kolumnie którą opisuje aktualny krok

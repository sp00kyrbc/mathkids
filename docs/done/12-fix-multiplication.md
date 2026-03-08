# 12-fix-multiplication.md — Poprawne mnożenie pisemne + enkodowanie

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Co jest źle

Mnożenie pisemne dla `873 × 69` MUSI wyglądać tak:

```
      8 7 3
    ×   6 9
    -------
    7 8 5 7    ← 873 × 9  (jedności mnożnika)
  5 2 3 8 0    ← 873 × 60 (dziesiątki mnożnika, przesunięte o 1 w lewo)
  ---------
  6 0 2 3 7    ← suma końcowa
```

Obecny kod pokazuje tylko JEDEN wiersz wyniku — to fundamentalny błąd.
Znak `×` wyświetla się jako `x` — błąd enkodowania.

---

## Krok 1 — Napraw Python: upewnij się że partials są zwracane

W `backend/src/python/arithmetic_engine.py` sprawdź funkcję `_generate_multiplication`.
Musi zwracać pole `partials` w odpowiedzi. Jeśli nie ma — dodaj:

```python
def _generate_multiplication(max_digits1: int, max_digits2: int) -> dict:
    max_digits2 = min(max_digits2, 2)
    a = _random_number(max_digits1)
    b = _random_number(max_digits2)
    if b < 10:
        b = random.randint(2, 9)
    result = a * b
    steps, partials = _compute_multiplication_steps(a, b)
    layout = _build_multiplication_layout(a, b, result, partials)

    return {
        "operation": "multiplication",
        "operand1": a,
        "operand2": b,
        "result": result,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "partials": partials,      # ← MUSI być to pole
        "layout": layout,
        "difficulty": max_digits1,
        "symbol": "\u00D7",        # × jako Unicode — NIE literalny znak
        "question": f"{a} \u00D7 {b} = ?"
    }
```

Sprawdź też `_build_multiplication_layout` — pole `symbol` musi być `"\u00D7"`:

```python
def _build_multiplication_layout(a, b, result, partials):
    # ... istniejący kod ...
    return {
        # ... istniejące pola ...
        "symbol": "\u00D7",    # ← zmień jeśli jest inaczej
        # ...
    }
```

Sprawdź też WSZYSTKIE inne operacje — symbol musi być Unicode:
```python
# W _generate_addition:
"symbol": "+",

# W _generate_subtraction:
"symbol": "\u2212",    # − (nie myślnik -)

# W _generate_division:
"symbol": "\u00F7",    # ÷
```

Zrestartuj backend po zmianach i sprawdź curl:
```bash
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiplication","max_digits1":3,"max_digits2":2}'
```

W odpowiedzi JSON musi być pole `"partials"` z tablicą dwóch obiektów (dla mnożnika 2-cyfrowego).

---

## Krok 2 — Przepisz rendering mnożenia w `ArithmeticDisplay.tsx`

Otwórz `frontend/src/components/ArithmeticDisplay.tsx`.

### A) Dodaj stan dla wyników cząstkowych

Za istniejącymi stanami (`resultCells`, `carries` itd.) dodaj:

```typescript
// Komórki dla wyników cząstkowych (mnożenie)
interface PartialCell {
  rowIndex: number;    // 0 = jedności, 1 = dziesiątki
  colIndex: number;    // pozycja cyfry w tym wierszu
  value: string;
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

const [partialCells, setPartialCells] = useState<PartialCell[]>(() =>
  initPartialCells()
);

function initPartialCells(): PartialCell[] {
  if (task.operation !== 'multiplication') return [];
  const partials = task.partials || [];
  const cells: PartialCell[] = [];

  partials.forEach((p, pi) => {
    const partialStr = String(p.value);
    const totalLen = partialStr.length + p.shift;
    const paddedDigits = partialStr.padStart(totalLen, '0');

    for (let i = 0; i < paddedDigits.length; i++) {
      const step = task.steps.find(
        s => s.row === pi && s.column === (paddedDigits.length - 1 - i)
      );
      cells.push({
        rowIndex: pi,
        colIndex: i,
        value: '',
        status: 'empty',
        stepId: step?.step_id ?? null,
      });
    }
  });

  return cells;
}
```

### B) Dodaj useEffect który resetuje partialCells przy nowym zadaniu

W istniejącym `useEffect` który resetuje stan przy nowym zadaniu, dodaj:

```typescript
useEffect(() => {
  setResultCells(initResultCells());
  setPartialCells(initPartialCells());  // ← dodaj tę linię
  setActiveColIndex(-1);
  setCarries({});
  setFeedback(null);
  setCurrentStep(0);
  setAllDone(false);
}, [task.operand1, task.operand2, task.operation]);
```

### C) Zastąp blok renderowania siatki

Znajdź cały blok JSX który renderuje siatkę (od `{/* Wiersz 1: Operand1 */}` do końca div siatki) i zastąp go poniższym:

```typescript
{/* ── SIATKA MATEMATYCZNA ── */}
<div
  className={`
    w-full flex flex-col items-end gap-1 p-8 sm:p-10 rounded-2xl
    ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}
  `}
  onClick={() => inputRef.current?.focus()}
>

  {/* Wiersz carry — tylko dla dodawania */}
  {task.operation === 'addition' && (
    <div className="flex items-center">
      <div className="w-14 h-8 sm:w-16" />
      {digits1.map((_, i) => {
        const colIndex = resultCols - 1 - i;
        return (
          <div key={i} className="w-14 h-8 sm:w-16 flex items-center justify-center">
            <AnimatePresence>
              {carries[colIndex] && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}
                >
                  {carries[colIndex]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  )}

  {/* Wiersz 1: Operand1 */}
  <div className="flex items-center">
    <div className="w-14 h-14 sm:w-16 sm:h-16" />
    {digits1.map((d, i) => (
      <div key={i} className={digitClass}>
        {i >= resultCols - String(op1).length ? d : ''}
      </div>
    ))}
  </div>

  {/* Wiersz 2: Symbol + Operand2 */}
  <div className="flex items-center">
    <div className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl sm:text-4xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent chalk-text' : 'text-notebook-accent'}`}>
      {symbol}
    </div>
    {digits2.map((d, i) => (
      <div key={i} className={digitClass}>
        {i >= resultCols - String(op2).length ? d : ''}
      </div>
    ))}
  </div>

  {/* Linia 1 */}
  <div className={`w-full border-t-2 my-1 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'}`} />

  {/* ── MNOŻENIE: wiersze cząstkowe ── */}
  {task.operation === 'multiplication' && (task.partials || []).map((partial, pi) => {
    const partialStr = String(partial.value);
    const totalLen = partialStr.length + partial.shift;
    // Wypełnij do szerokości resultCols
    const displayLen = Math.max(totalLen, resultCols);
    const paddedPartial = partialStr.padStart(totalLen, '0');

    return (
      <div key={pi} className="flex items-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16" /> {/* placeholder na symbol */}
        {Array.from({ length: displayLen }).map((_, i) => {
          // Pozycja w paddedPartial (przesunięta o shift)
          const inPartialIdx = i - (displayLen - totalLen);
          const digit = inPartialIdx >= 0 && inPartialIdx < paddedPartial.length
            ? paddedPartial[inPartialIdx]
            : null;

          // Czy ta komórka jest edytowalna?
          const colFromRight = displayLen - 1 - i;
          const pcell = partialCells.find(
            c => c.rowIndex === pi && c.colIndex === (totalLen - 1 - (colFromRight - partial.shift))
          );

          if (!digit) {
            return <div key={i} className="w-14 h-14 sm:w-16 sm:h-16" />;
          }

          const isActiveCell = pcell && activeColIndex === -(pi * 100 + i); // specjalny indeks dla partial

          return (
            <motion.div
              key={i}
              className={`
                w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center
                text-3xl sm:text-4xl font-bold rounded-lg cursor-pointer
                ${classes.font}
                ${pcell
                  ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-notebook-line'}`
                  : ''
                }
                ${pcell?.status === 'correct'
                  ? theme === 'chalk' ? 'text-chalk-success border-chalk-success' : 'text-green-600 border-green-400'
                  : ''
                }
                ${pcell?.status === 'error'
                  ? `animate-shake ${theme === 'chalk' ? 'text-chalk-error border-chalk-error bg-chalk-error/10' : 'text-red-600 border-red-400 bg-red-50'}`
                  : ''
                }
                ${!pcell ? (theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text') : ''}
              `}
            >
              <AnimatePresence mode="wait">
                {pcell ? (
                  pcell.value ? (
                    <motion.span key="val" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>
                      {pcell.value}
                    </motion.span>
                  ) : (
                    <motion.span className="text-lg opacity-30">?</motion.span>
                  )
                ) : (
                  <motion.span
                    key="given"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={theme === 'chalk' ? 'chalk-text' : ''}
                  >
                    {digit}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  })}

  {/* Linia 2 (suma) — tylko dla mnożenia 2-cyfrowego */}
  {task.operation === 'multiplication' && (task.partials || []).length > 1 && (
    <div className={`w-full border-t-2 my-1 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'}`} />
  )}

  {/* Wiersz wyniku końcowego */}
  <div className="flex items-center">
    <div className="w-14 h-14 sm:w-16 sm:h-16" />
    {resultCells.map((rc) => {
      const isActive = rc.colIndex === activeColIndex;
      return (
        <motion.div
          key={rc.colIndex}
          onClick={() => { setActiveColIndex(rc.colIndex); inputRef.current?.focus(); }}
          whileTap={{ scale: 0.9 }}
          className={`
            w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center
            text-3xl sm:text-4xl font-bold rounded-lg cursor-pointer transition-all
            ${classes.font}
            ${rc.status === 'empty' && !isActive
              ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-notebook-line'}`
              : ''}
            ${isActive && rc.status === 'empty'
              ? `border-2 ${theme === 'chalk' ? 'border-chalk-accent shadow-lg shadow-chalk-accent/40 bg-chalk-accent/10' : 'border-notebook-text shadow-md bg-blue-50'}`
              : ''}
            ${rc.status === 'correct'
              ? `border ${theme === 'chalk' ? 'border-chalk-success text-chalk-success' : 'border-green-400 text-green-600'}`
              : ''}
            ${rc.status === 'error'
              ? `border-2 animate-shake ${theme === 'chalk' ? 'border-chalk-error text-chalk-error bg-chalk-error/10' : 'border-red-400 text-red-600 bg-red-50'}`
              : ''}
          `}
        >
          <AnimatePresence mode="wait">
            {rc.value ? (
              <motion.span
                key={rc.value + rc.status}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={theme === 'chalk' ? 'chalk-text' : ''}
              >
                {rc.value}
              </motion.span>
            ) : (
              <motion.span
                animate={isActive ? { opacity: [1, 0.2, 1] } : { opacity: 0.25 }}
                transition={isActive ? { repeat: Infinity, duration: 1 } : {}}
                className="text-lg"
              >
                ?
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      );
    })}
  </div>

</div>
```

---

## Krok 3 — Weryfikacja curl

```bash
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiplication","max_digits1":3,"max_digits2":2}'
```

W JSON odpowiedzi sprawdź:
- `"symbol"` = `"×"` (znak mnożenia, nie litera x)
- `"partials"` = tablica z dwoma obiektami (dla 2-cyfrowego mnożnika)
- `partials[0].shift` = 0 (jedności)
- `partials[1].shift` = 1 (dziesiątki)

---

## Checklist końcowa

- [ ] `873 × 69` pokazuje DWIE linie cząstkowe (7857 i 52380)
- [ ] Znak `×` wyświetla się poprawnie (nie jako `x` ani `Ã—`)
- [ ] Przeniesienia (`1` nad kolumną) pojawiają się przy dodawaniu
- [ ] Wynik końcowy = suma obu linii cząstkowych
- [ ] Interfejs zajmuje pełną szerokość strony

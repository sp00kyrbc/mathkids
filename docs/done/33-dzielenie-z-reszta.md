# 33-dzielenie-z-reszta.md — Dzielenie z resztą

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Co się zmienia

1. Python generuje zadania dzielenia z resztą (nie tylko bez reszty)
2. Po ostatnim iloczynu zamiast `0` pojawia się reszta ≠ 0
3. Wynik zapisywany jako `"iloraz r. reszta"` np. `"13 r. 2"`
4. Uczeń wpisuje resztę końcową (przepisuje ją jak "opuszczoną cyfrę")

---

## Krok 1 — Python: generuj też zadania z resztą

### `_generate_division` — zmień żeby generowało z resztą lub bez

```python
def _generate_division(max_digits1: int, max_digits2: int) -> dict:
    import random
    max_digits2 = min(max_digits2, 2)

    for _ in range(100):
        divisor = _random_number(max_digits2, min_val=2)
        if divisor == 1:
            continue  # dzielenie przez 1 nic nie uczy
        quotient = _random_number(max(1, max_digits1 - max_digits2 + 1), min_val=1)
        # Losowo: z resztą lub bez
        remainder = random.randint(0, divisor - 1)
        dividend = divisor * quotient + remainder

        if len(str(dividend)) <= max_digits1:
            break

    steps, substeps = _compute_division_steps(dividend, divisor)
    layout = _build_division_layout(dividend, divisor, quotient, remainder, substeps)

    result_str = str(quotient) if remainder == 0 else f"{quotient} r. {remainder}"

    return {
        "operation": "division",
        "operand1": dividend,
        "operand2": divisor,
        "result": quotient,
        "remainder": remainder,
        "result_display": result_str,   # ← nowe pole do wyświetlania
        "steps": [asdict(s) for s in steps],
        "division_steps": substeps,
        "layout": layout,
        "difficulty": len(str(dividend)),
        "symbol": "/",
        "question": f"{dividend} / {divisor} = ?",
    }
```

### `_compute_division_steps` — dodaj krok zapisu reszty końcowej

Na końcu funkcji, po pętli, jeśli `remainder > 0`:

```python
    # Jeśli jest reszta końcowa — uczeń ją przepisuje
    if current > 0:  # current = ostatnia reszta
        remainder_str = str(current)
        for ci, cd in enumerate(remainder_str):
            steps.append(Step(
                step_id=step_id,
                position="final_remainder",
                row=len(substeps) - 1,
                column=ci,
                result_digit=int(cd),
                description=f"Reszta z dzielenia to {current}. Nie mozna juz dzielic.",
                hint=f"Przepisz reszte: {current}",
                carry=0,
                input_digits=[current],
            ))
            step_id += 1

    return steps, substeps
```

---

## Krok 2 — Frontend: obsługa reszty końcowej

### W `DivisionDisplay.tsx`

#### Rozszerz typ DCell

```typescript
type: 'quotient' | 'product' | 'remainder' | 'final_remainder';
```

#### Dodaj helper

```typescript
function getFinalRemainderCell(col: number): DCell | undefined {
  return queue.find(c =>
    c.type === 'final_remainder' &&
    (task.steps as any[])[c.stepIdx]?.column === col
  );
}
```

#### Renderuj resztę końcową po ostatnim substep

Zastąp dotychczasowy blok reszty końcowej w ostatnim substep:

```typescript
{/* Ostatni substep — reszta końcowa */}
{si === substeps.length - 1 && isRemainderRevealed && (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2"
  >
    {/* Pusta kolumna symbolu */}
    <div className={`${CELL_W} flex-shrink-0`} />
    {/* Wcięcie do ostatniej kolumny */}
    {Array(sub.quotient_col).fill(null).map((_, k) =>
      <div key={k} className={`${CELL_W} flex-shrink-0`} />
    )}

    {task.remainder === 0 ? (
      // Bez reszty — pokaż 0 jako podane
      <div className={givenCls}>0</div>
    ) : (
      // Z resztą — kratki edytowalne + label "r."
      <>
        <div className={`text-lg font-bold flex-shrink-0 ${textCls} opacity-70`}>r.</div>
        {String(task.remainder).split('').map((_, ci) => {
          const rcell = getFinalRemainderCell(ci);
          if (rcell) return renderInput(rcell);
          return null;
        })}
      </>
    )}
  </motion.div>
)}
```

#### Pokaż wynik na górze gdy done

Po ukończeniu zadania pokaż wynik z resztą:

```typescript
{done && (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`text-center text-2xl font-bold ${textCls} mt-2`}
  >
    {task.operand1} ÷ {task.operand2} = {(task as any).result_display || task.result}
  </motion.div>
)}
```

---

## Krok 3 — Walidacja reszty

W `backend/src/routes/validate.ts` upewnij się że dla `position === "final_remainder"`
walidacja sprawdza cyfry reszty:

```typescript
if (step.position === 'final_remainder') {
  const correct = user_answer === step.result_digit;
  return res.json({
    correct,
    feedback: correct
      ? 'Dobrze! To jest reszta z dzielenia.'
      : `Nie. Reszta to ${task_data.remainder}.`,
  });
}
```

---

## Krok 4 — Blokada mnożenia i dzielenia przez 1

### W `arithmetic_engine.py` — `_generate_multiplication`:

Znajdź miejsce gdzie generowany jest mnożnik (`b`) i dodaj warunek:

```python
# Upewnij się ze zadanie ma min_val=2 dla obu skladnikow:
a = _random_number(max_digits1, min_val=2)
b = _random_number(max_digits2, min_val=2)
# Jesli ktorykolwiek wyszedl 1 — generuj ponownie:
if a == 1 or b == 1:
    continue
```

### W `_generate_division` (już w tym pliku powyżej):

Już dodane (`min_val=2` dla dzielnika + `continue` gdy `divisor == 1`).
Upewnij się też że `quotient >= 2`:

```python
quotient = _random_number(max(1, max_digits1 - max_digits2 + 1), min_val=2)
```

---

## Checklist

### `234 ÷ 6 = 39` (bez reszty — bez zmian)
- [ ] Działa jak poprzednio, reszta `0` podana automatycznie

### `235 ÷ 6 = 39 r. 1`
```
      [3][9]
  ─────────────
  2  3  5  :  6
  −  1  8
     ─────
     [5][5]      ← uczeń przepisuje
  −     5  4
        ─────
        r. [1]   ← uczeń wpisuje resztę
```
- [ ] Po ostatnim iloczynnie pojawia się `r. ?` zamiast `0`
- [ ] Uczeń wpisuje `1` jako resztę
- [ ] Po ukończeniu wyświetla się `235 ÷ 6 = 39 r. 1`

### `879 ÷ 4 = 219 r. 3`
- [ ] Ostatnia reszta `3` do wpisania przez ucznia
- [ ] Wynik wyświetla się jako `219 r. 3`

# 27-iloraz-pozycja-kolumny.md — Popraw pozycję cyfry ilorazu

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

Dla `252 ÷ 6 = 42`:
- bierzemy `25` → `25 ÷ 6 = 4`
- cyfra `4` powinna stać **nad `5`** (ostatnią cyfrą grupy `25`)
- stoi błędnie nad `2` (ostatnią cyfrą dzielnej)

## Przyczyna

W Pythonie `column` cyfry ilorazu jest liczone jako `len(quotient_digits) - 1`,
ale `quotient_digits` zawiera też zera wiodące (gdy `current < divisor`).
Przez to indeks kolumny jest przesunięty o 1.

W froncie `qi = i - (dividendLen - quotientLen)` zakłada że iloraz = długość dzielnej - kilka,
co nie działa gdy pierwsza cyfra dzielnej jest za mała.

## Napraw Python: `_compute_division_steps`

Dodaj licznik `step_count` osobny od `quotient_digits`:

```python
def _compute_division_steps(dividend: int, divisor: int):
    dividend_str = str(dividend)
    steps = []
    substeps = []
    step_id = 0
    current = 0
    quotient_digits = []
    step_count = 0  # ← liczy tylko kroki które faktycznie dodajemy

    for i, digit_char in enumerate(dividend_str):
        current = current * 10 + int(digit_char)

        if current < divisor and i < len(dividend_str) - 1:
            quotient_digits.append(0)
            continue

        q_digit = current // divisor
        product = q_digit * divisor
        remainder = current - product
        quotient_digits.append(q_digit)

        borrow_info = _compute_subtraction_borrows(current, product)

        current_len = len(str(current))
        product_str_padded = str(product).zfill(current_len)

        steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=step_count,          # ← poprawiony indeks
            result_digit=q_digit,
            description=(
                f"Biore {current}. "
                f"Ile razy {divisor} miesci sie w {current}? "
                f"{q_digit} razy, bo {q_digit} x {divisor} = {product}."
            ),
            hint=f"Ile razy {divisor} miesci sie w {current}?",
            carry=0,
            input_digits=[current, divisor],
        ))
        step_id += 1

        for pi, pd in enumerate(product_str_padded):
            steps.append(Step(
                step_id=step_id,
                position="product",
                row=step_count,         # ← poprawiony indeks
                column=pi,
                result_digit=int(pd),
                description=f"{q_digit} x {divisor} = {product}. Zapisuje cyfre {pd}.",
                hint=f"Ile to {q_digit} x {divisor}?",
                carry=0,
                input_digits=[q_digit, divisor],
            ))
            step_id += 1

        substeps.append({
            "current_value": current,
            "current_len": current_len,
            "quotient_digit": q_digit,
            "quotient_col": i,          # ← indeks w dividend_str (nad tą cyfrą stoi iloraz)
            "product": product,
            "product_str": product_str_padded,
            "product_len": current_len,
            "remainder": remainder,
            "borrow": borrow_info,
        })

        step_count += 1                 # ← inkrementuj TYLKO gdy dodajemy krok
        current = remainder

    return steps, substeps
```

## Napraw Frontend: wiersz ilorazu w `DivisionDisplay.tsx`

Zastąp blok renderowania wiersza ilorazu:

```typescript
{/* ── Wiersz ilorazu (nad kreską) ── */}
<div className="flex">
  {dividendStr.split('').map((_, i) => {
    // Znajdź substep który ma quotient_col === i
    const subIdx = substeps.findIndex((s: any) => s.quotient_col === i);
    if (subIdx === -1) return <div key={i} className={emptyCls} />;
    const qcell = getQuotientCell(subIdx);  // ← szukaj po step_count (subIdx)
    if (!qcell) return <div key={i} className={emptyCls} />;
    return renderInput(qcell);
  })}
</div>
```

Upewnij się że `getQuotientCell` szuka po `column` (który teraz = `step_count`):

```typescript
function getQuotientCell(col: number) {
  return queue.find(c =>
    c.type === 'quotient' &&
    (task.steps as any[])[c.stepIdx]?.column === col
  );
}
```

## Checklist

### `252 ÷ 6 = 42`
```
      [4][2]
   ─────────────
   2  5  2  :  6
```
- [ ] Cyfra `4` stoi **nad `5`** (nie nad `2`)
- [ ] Cyfra `2` stoi **nad `2`**

### `338 ÷ 2 = 169`
```
   [1][6][9]
   ─────────────
   3  3  8  :  2
```
- [ ] `1` nad `3`, `6` nad `3`, `9` nad `8` ✓

### `689 ÷ 53 = 13`
```
      [1][3]
   ──────────────
   6  8  9  :  5  3
```
- [ ] `1` nad `8` (ostatnia cyfra grupy `68`)
- [ ] `3` nad `9`

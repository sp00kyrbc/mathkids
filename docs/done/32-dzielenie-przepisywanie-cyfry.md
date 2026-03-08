# 32-dzielenie-przepisywanie-cyfry.md — Uczeń przepisuje resztę z dociągniętą cyfrą

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

Po wpisaniu iloczynu (np. `18`) pojawia się `54` automatycznie jako podana liczba.
Uczeń powinien sam przepisać tę liczbę — to jest ważny krok nauki dzielenia pisemnego
("opuszczam w dół kolejną cyfrę").

## Zasada

Po wpisaniu iloczynu danego substep:
1. Pojawia się wiersz pustych kratek (edytowalnych) na resztę+dociągniętą cyfrę
2. Uczeń przepisuje cyfry (np. `5` i `4`)
3. Dopiero po wpisaniu poprawnych cyfr pojawia się następny substep (iloczyn)

---

## Python: dodaj kroki `"remainder"` do steps

W `_compute_division_steps`, po krokach iloczynu, dodaj kroki dla cyfr reszty+dociągniętej:

```python
# Po krokach iloczynu (istniejący kod):
for pi, pd in enumerate(product_str_padded):
    steps.append(Step(
        step_id=step_id,
        position="product",
        row=step_count,
        column=pi,
        result_digit=int(pd),
        ...
    ))
    step_id += 1

# NOWE: kroki przepisywania reszty+dociągniętej cyfry
# Tylko jeśli to nie ostatni substep
if i < len(dividend_str) - 1 or remainder > 0:
    next_current = remainder * 10 + (int(dividend_str[i + 1]) if i + 1 < len(dividend_str) else 0)
    if i + 1 < len(dividend_str):  # jest następna cyfra do dociągnięcia
        next_current_str = str(next_current)
        # Cyfry do przepisania: reszta (może być 0) + dociągnięta cyfra
        # Reprezentacja jako string o długości: len(str(remainder)) + 1 lub po prostu next_current_str
        for ci, cd in enumerate(next_current_str):
            steps.append(Step(
                step_id=step_id,
                position="remainder",
                row=step_count,        # ten sam substep co iloczyn
                column=ci,             # pozycja w stringu next_current
                result_digit=int(cd),
                description=(
                    f"Reszta to {remainder}. "
                    f"Opuszczam cyfre {dividend_str[i+1]}. "
                    f"Otrzymuje {next_current}."
                ),
                hint=f"Przepisz reszte {remainder} i dopisz cyfre {dividend_str[i+1]}.",
                carry=0,
                input_digits=[remainder, int(dividend_str[i+1])],
            ))
            step_id += 1
```

Dodaj też `next_current` do substep info:
```python
substeps.append({
    ...
    "next_current": next_current if i + 1 < len(dividend_str) else None,
    "next_current_str": str(next_current) if i + 1 < len(dividend_str) else None,
})
```

---

## Frontend: obsługa typu `"remainder"` w `DivisionDisplay.tsx`

### 1. Rozszerz `DCell` o typ `remainder`

```typescript
interface DCell {
  id: string;
  type: 'quotient' | 'product' | 'remainder';
  // ... reszta bez zmian
}
```

### 2. Dodaj helper `getRemainderCell`

```typescript
function getRemainderCell(substepIdx: number, col: number): DCell | undefined {
  return queue.find(c =>
    c.type === 'remainder' &&
    (task.steps as any[])[c.stepIdx]?.row === substepIdx &&
    (task.steps as any[])[c.stepIdx]?.column === col
  );
}
```

### 3. Zmień logikę `revealedRemainders`

Teraz wiersz reszty nie pojawia się automatycznie po wpisaniu iloczynu —
**kratki reszty są od razu widoczne** (jako edytowalne `?`), bo to kolejny krok w kolejce.

Usuń stan `revealedRemainders` — nie jest już potrzebny.

Wiersz reszty renderuj zawsze (z pustymi kratkami na start):

```typescript
{/* Wiersz reszty — zawsze widoczny od razu jako edytowalne kratki */}
{si < substeps.length - 1 && sub.next_current_str && (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex"
  >
    {/* Pusta kolumna symbolu */}
    <div className={`${CELL_W} flex-shrink-0`} />
    {/* Wcięcie do pozycji next_current w dzielnej */}
    {(() => {
      const nextSub = substeps[si + 1];
      const nextIndent = nextSub.quotient_col - nextSub.current_len + 1;
      return Array(nextIndent).fill(null).map((_, k) =>
        <div key={k} className={`${CELL_W} flex-shrink-0`} />
      );
    })()}
    {/* Kratki edytowalne dla cyfr reszty+dociągniętej */}
    {sub.next_current_str.split('').map((d: string, ci: number) => {
      const rcell = getRemainderCell(si, ci);
      if (rcell) return renderInput(rcell);
      // Fallback: pokaż cyfrę (jeśli już wpisana)
      return <div key={ci} className={givenCls}>{d}</div>;
    })}
  </motion.div>
)}
```

### 4. Zmień logikę odkrywania kolejnego substep

Teraz kolejny substep (iloczyn następnego kroku) pojawia się po wpisaniu cyfr reszty, nie po wpisaniu iloczynu.

W `handleDigit`, gdy wpisano ostatnią cyfrę `remainder`:

```typescript
const step = (task.steps as any[])[activeCell.stepIdx];
if (step?.position === 'remainder') {
  const substepIdx = step.row ?? 0;
  const sub = substeps[substepIdx];
  if (sub && step.column === (sub.next_current_str?.length ?? 1) - 1) {
    // Ostatnia cyfra reszty — odkryj następny substep (iloczyn)
    setRevealedSubsteps(prev => [...prev, substepIdx + 1]);
  }
}
```

Dodaj stan:
```typescript
const [revealedSubsteps, setRevealedSubsteps] = useState<number[]>([0]); // pierwszy zawsze widoczny
```

I renderuj substep tylko jeśli jest odkryty:
```typescript
{substeps.map((sub: any, si: number) => {
  if (!revealedSubsteps.includes(si)) return null;
  // ... reszta renderowania
})}
```

---

## Checklist

### `234 ÷ 6 = 39`

Kolejność kroków:
```
1. Wpisz 3    (iloraz: 23÷6=3)
2. Wpisz 1    (iloczyn 3×6=18, cyfra 1)
3. Wpisz 8    (iloczyn 3×6=18, cyfra 8)
4. Wpisz 5    (reszta: 23-18=5, przepisz "5")
5. Wpisz 4    (dociągnięta cyfra "4" z dzielnej → "54")
6. Wpisz 9    (iloraz: 54÷6=9)
7. Wpisz 5    (iloczyn 9×6=54, cyfra 5)
8. Wpisz 4    (iloczyn 9×6=54, cyfra 4)
   → pojawia się reszta 0
```

- [ ] Po wpisaniu `18` — pojawia się wiersz dwóch pustych kratek `?` `?`
- [ ] Uczeń wpisuje `5` i `4`
- [ ] Dopiero po wpisaniu `54` pojawia się kolejny iloczyn do wpisania
- [ ] Kratki `5` i `4` są wyrównane pod kolumnami `3` i `4` dzielnej

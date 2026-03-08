# 29-mnozenie-przeniesienia-wynik.md — Mnożenie: przeniesienia nad wynikiem końcowym

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Dwa problemy

1. **Nad wierszem wyniku końcowego brakuje wiersza przeniesień** (przy dodawaniu kolumn)
2. **Kratki przeniesień zajmują podwójną szerokość** — każda mała kratka powinna mieć
   dokładnie tę samą szerokość co kratka cyfry (`w-12 sm:w-14 lg:w-16`), tylko mniejszą wysokość

---

## Problem 2 — szerokość kratek przeniesień

### Przyczyna
Mała kratka carry ma klasę np. `w-11` zamiast `w-12`, albo jest owinięta w div z paddingiem,
albo `CELL_SIZE` jest rozdzielony i szerokość nie zgadza się.

### Napraw w `ArithmeticDisplay.tsx`

Zdefiniuj rozmiary tak:
```typescript
// Pełna kratka cyfry
const CELL_W = 'w-12 sm:w-14 lg:w-16';   // szerokość — wspólna dla obu rodzajów
const CELL_H = 'h-12 sm:h-14 lg:h-16';   // wysokość pełna
const CELL_Hs = 'h-6 sm:h-7 lg:h-8';     // wysokość mała (przeniesienia)

const CELL_SIZE  = `${CELL_W} ${CELL_H}`;
const CELL_SIZEs = `${CELL_W} ${CELL_Hs}`; // ← ta sama SZEROKOŚĆ, mniejsza WYSOKOŚĆ

const FONT_SIZE  = 'text-2xl sm:text-3xl lg:text-4xl';
const FONT_SIZEs = 'text-xs sm:text-sm';
```

Następnie użyj `CELL_SIZEs` wszędzie gdzie renderujesz małe kratki przeniesień.
Usuń wszelkie inne klasy `w-` z kratek carry które mogą je nadpisywać.

```typescript
// Wrapper wiersza przeniesień — NIE dodawaj żadnego gap ani padding między kratkami
<div className="flex">
  {carryRow.map((val, col) => {
    if (!val) return <div key={col} className={`${CELL_W} ${CELL_Hs}`} />;
    // edytowalna kratka carry:
    return (
      <div key={col} className={`${CELL_SIZEs} flex items-center justify-center ${FONT_SIZEs} ...`}>
        {val}
      </div>
    );
  })}
</div>
```

**Ważne:** NIE używaj `gap-*` na wierszach — użyj `gap-0` lub brak gap, żeby kratki stały
dokładnie obok siebie jak w zeszycie.

---

## Problem 1 — wiersz przeniesień nad wynikiem końcowym

W polskiej metodzie mnożenia pisemnego, gdy sumujemy wiersze cząstkowe,
przy dodawaniu kolumn od prawej mogą wystąpić przeniesienia.

Nad wierszem wyniku (`row_res`) musi być wiersz małych kratek na przeniesienia z dodawania.

### Python: dodaj `addition_carries` do odpowiedzi

W `_compute_multiplication_steps` (lub `_build_multiplication_layout`) oblicz przeniesienia
przy sumowaniu kolumn i zwróć je:

```python
def _compute_addition_carries(partials: list, num_cols: int) -> dict:
    """
    Oblicza przeniesienia przy sumowaniu wierszy czesciowych mnozenia.
    Zwraca slownik {col_from_right: carry_value} dla kratek nad wynikiem.
    """
    carries = {}
    carry = 0
    for col in range(num_cols):
        col_sum = carry
        for p in partials:
            p_str = str(p['value'])
            shift = p.get('shift', 0)
            # pozycja tej kolumny w partial (od prawej)
            p_col = col - shift
            if 0 <= p_col < len(p_str):
                col_sum += int(p_str[-(p_col + 1)])
        carry = col_sum // 10
        if carry > 0:
            carries[col + 1] = carry  # przeniesienie trafia do następnej kolumny
    return carries
```

Dodaj do zwracanego obiektu:
```python
return {
    ...
    "addition_carries": _compute_addition_carries(partials, max_cols),
}
```

### Frontend: renderuj wiersz przeniesień nad kreską końcową

W `ArithmeticDisplay.tsx`, tuż przed kreską końcową i wierszem wyniku:

```typescript
{/* Przeniesienia z dodawania — nad wynikiem końcowym */}
{addition_carries && Object.keys(addition_carries).length > 0 && (
  <div className="flex">
    {/* Symbol + po lewej */}
    <div className={`${CELL_W} ${CELL_Hs}`} />
    {Array.from({ length: gridCols }).map((_, col) => {
      const colFR = gridCols - 1 - col; // od prawej
      const carryVal = addition_carries[colFR];
      const carryKey = `addcarry-${col}`;
      
      // Kratka niewidoczna jeśli brak carry w tej kolumnie
      if (!carryVal) return <div key={col} className={`${CELL_W} ${CELL_Hs}`} />;
      
      // Kratka edytowalna — ukryta na start
      const isUnlocked = unlockedCarries.has(carryKey);
      if (!isUnlocked) {
        return (
          <div
            key={col}
            className={`${CELL_W} ${CELL_Hs} cursor-pointer opacity-0 hover:opacity-30 transition-opacity`}
            onClick={() => setUnlockedCarries(prev => new Set(prev).add(carryKey))}
          />
        );
      }
      
      // Znajdź komórkę w kolejce
      const cell = queue.find(c => c.id === carryKey);
      if (!cell) return <div key={col} className={`${CELL_W} ${CELL_Hs}`} />;
      return renderInputCell(cell);
    })}
  </div>
)}

{/* Kreska końcowa */}
<div className={`border-t-2 ${lineCol}`} />

{/* Wynik końcowy */}
<div className="flex">
  ...
</div>
```

---

## Checklist

### `560 × 65 = 36400`

Układ powinien wyglądać:
```
           5  6  0
        ×     6  5
        ─────────────────
     [2][3]              ← carry wiersza 560×5 (małe kratki, 1 kratka szerokości)
        2  8  0  0       ← 560×5=2800
  [3][3]                 ← carry wiersza 560×6 (małe kratki)
  +  3  3  6  0          ← 560×6=3360
  ─────────────────
  [?][?]                 ← carry z dodawania (małe kratki, ukryte na start)
  ?  ?  4  0  0          ← wynik 36400
```

- [ ] Każda mała kratka carry ma tę samą szerokość co kratka cyfry
- [ ] Carry wiersza 1 (`2,3`) — dwie kratki obok siebie, każda szerokości 1
- [ ] Carry wiersza 2 (`3,3`) — dwie kratki obok siebie, każda szerokości 1
- [ ] Nad wynikiem końcowym jest wiersz małych kratek przeniesień z dodawania
- [ ] Kratki z dodawania są ukryte na start (hover pokazuje delikatnie)
- [ ] Wszystkie kratki wyrównane kolumnowo — cyfry stoją dokładnie nad sobą

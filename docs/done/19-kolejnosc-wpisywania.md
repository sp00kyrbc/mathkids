# 19-kolejnosc-wpisywania.md — Kolejność wpisywania = kolejność liczenia

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

Dla `710 × 28` kolejność powinna być:

```
Partial 0 (710 × 8 = 5680):
  krok 1: wpisz 0  (jedności:    0×8=0)
  krok 2: wpisz 8  (dziesiątki:  1×8=8)
  krok 3: wpisz 6  (setki:       7×8=56 → cyfra 6)
  krok 4: wpisz 5  (przeniesienie 5 nad tysiącami)
  krok 5: wpisz 5  (tysiące: cyfra wyniku = 5)

Partial 1 (710 × 2 = 1420, shift=1):
  krok 6: wpisz 0  (dziesiątki,  0×2=0)
  krok 7: wpisz 2  (setki,       1×2=2)
  krok 8: wpisz 4  (tysiące,     7×2=14 → cyfra 4)
  krok 9: wpisz 1  (przeniesienie 1)
  krok 10: wpisz 1 (dziesięciotysięczne)

Wynik końcowy (od prawej):
  krok 11-15: cyfry 19880 od prawej
```

Czyli dla każdej kolumny wiersza cząstkowego: **najpierw cyfra, potem przeniesienie** (jeśli istnieje) — i dopiero wtedy następna kolumna.

## Jedyna zmiana: funkcja `buildQueue()` w `ArithmeticDisplay.tsx`

Znajdź funkcję `buildQueue()` i zastąp TYLKO blok `isMultiply` (zachowaj blok dla dodawania/odejmowania):

```typescript
function buildQueue(): Cell[] {
  const q: Cell[] = [];

  if (isMultiply) {
    partials.forEach((p, pi) => {
      const pstr = String(p.value);
      const pDigits = pstr.split('').reverse(); // od jedności do najstarszej
      const rightCol = gridCols - 1 - p.shift;

      // Iteruj kolumna po kolumnie od prawej do lewej
      // Dla każdej kolumny: najpierw cyfra wyniku cząstkowego, potem przeniesienie
      for (let colInPartial = 0; colInPartial < pDigits.length + (p.carries ? Object.keys(p.carries).length : 0); colInPartial++) {
        // Czy dla tej kolumny jest cyfra wyniku cząstkowego?
        if (colInPartial < pDigits.length) {
          const digitChar = pDigits[colInPartial]; // cyfra od prawej
          const col = rightCol - colInPartial;     // kolumna w gridzie
          if (col >= 0 && col < gridCols) {
            const step = task.steps.find(
              s => s.position === 'partial' && s.row === pi && s.column === colInPartial
            );
            q.push({
              id: `partial-${pi}-${col}`,
              type: 'partial',
              row: pi,
              col,
              expected: digitChar,
              entered: '',
              status: 'empty',
              stepId: step?.step_id ?? null,
            });
          }
        }

        // Czy po tej kolumnie jest przeniesienie?
        const carryAtCol = colInPartial + 1; // przeniesienie trafia do następnej kolumny
        if (p.carries && p.carries[carryAtCol] !== undefined) {
          const carryVal = String(p.carries[carryAtCol]);
          const carryGridCol = rightCol - carryAtCol;
          if (carryGridCol >= 0 && carryGridCol < gridCols) {
            const step = task.steps.find(
              s => s.position === 'carry' && s.row === pi && s.column === carryAtCol
            );
            q.push({
              id: `carry-${pi}-${carryGridCol}`,
              type: 'carry',
              row: pi,
              col: carryGridCol,
              expected: carryVal,
              entered: '',
              status: 'empty',
              stepId: step?.step_id ?? null,
            });
          }
        }
      }

      // Jeśli przeniesienie wychodzi poza długość cyfr (np. 7×8=56, cyfra 5 to carry)
      // — obsłuż przeniesienia które są "za" ostatnią cyfrą partial
      if (p.carries) {
        Object.entries(p.carries)
          .map(([k, v]) => ({ colFR: Number(k), val: String(v) }))
          .filter(({ colFR }) => colFR >= pDigits.length) // tylko te poza zakresem cyfr
          .sort((a, b) => a.colFR - b.colFR)
          .forEach(({ colFR, val }) => {
            const carryGridCol = rightCol - colFR;
            if (carryGridCol < 0 || carryGridCol >= gridCols) return;
            // Sprawdź czy już dodane
            if (q.find(c => c.id === `carry-${pi}-${carryGridCol}`)) return;
            const step = task.steps.find(
              s => s.position === 'carry' && s.row === pi && s.column === colFR
            );
            q.push({
              id: `carry-${pi}-${carryGridCol}`,
              type: 'carry',
              row: pi,
              col: carryGridCol,
              expected: val,
              entered: '',
              status: 'empty',
              stepId: step?.step_id ?? null,
            });
          });
      }
    });

    // Wynik końcowy — od prawej do lewej
    for (let i = gridCols - 1; i >= 0; i--) {
      if (!row_res[i]) continue;
      const colFR = gridCols - 1 - i;
      const step = task.steps.find(s => s.position === 'result' && s.column === colFR);
      q.push({
        id: `result-${i}`,
        type: 'result',
        row: 99,
        col: i,
        expected: row_res[i],
        entered: '',
        status: 'empty',
        stepId: step?.step_id ?? null,
      });
    }

  } else {
    // Dodawanie / odejmowanie — wynik od prawej, przeniesienie po każdej kolumnie
    for (let i = gridCols - 1; i >= 0; i--) {
      if (!row_res[i]) continue;
      const colFR = gridCols - 1 - i;
      const resultStep = task.steps.find(s => s.position === 'result' && s.column === colFR);
      q.push({
        id: `result-${i}`,
        type: 'result',
        row: 99,
        col: i,
        expected: row_res[i],
        entered: '',
        status: 'empty',
        stepId: resultStep?.step_id ?? null,
      });

      // Przeniesienie do następnej kolumny (jeśli istnieje)
      if (isAdd && i > 0 && add_carry_row[i - 1] !== null) {
        const carryStep = task.steps.find(s => s.position === 'carry' && s.column === colFR + 1);
        q.push({
          id: `carry-add-${i - 1}`,
          type: 'carry',
          row: 0,
          col: i - 1,
          expected: add_carry_row[i - 1]!,
          entered: '',
          status: 'empty',
          stepId: carryStep?.step_id ?? null,
        });
      }
    }
  }

  // Aktywuj pierwszą komórkę
  if (q.length > 0) q[0].status = 'active';
  return q;
}
```

## Weryfikacja

### Test mnożenia `710 × 28`

Sprawdź kolejność podświetlanych kratek:
1. Pierwsza aktywna kratka = jedności pierwszego wiersza cząstkowego (710×8, prawa kolumna) → wpisz `0`
2. Druga = dziesiątki tego wiersza → wpisz `8`  
3. Trzecia = setki → wpisz `6`
4. Czwarta = mała kratka przeniesienia nad tysiącami → wpisz `5`
5. Piąta = tysiące (cyfra `5` w wierszu)
6. Szósta = jedności drugiego wiersza (710×2, przesuniętego) → wpisz `0`
... itd.

### Test dodawania `490 + 37`
1. Pierwsza aktywna = jedności wyniku → wpisz `7`
2. Druga = mała kratka przeniesienia → wpisz `1`
3. Trzecia = dziesiątki wyniku → wpisz `2`
4. Czwarta = setki wyniku → wpisz `5`

### Checklist
- [ ] Kursor zaczyna od PRAWEJ kolumny pierwszego wiersza cząstkowego
- [ ] Po wpisaniu cyfry kursor przeskakuje do przeniesienia (jeśli jest) LUB do następnej cyfry w lewo
- [ ] Przeniesienie (mała kratka) pojawia się jako aktywne BEZPOŚREDNIO po cyfrze która je generuje
- [ ] Przeniesienie drugiego wiersza cząstkowego jest osobne od pierwszego
- [ ] Na końcu: wynik końcowy od prawej do lewej

# 20-przeniesienia-ukryte.md — Przeniesienia ukryte, tej samej szerokości co cyfry

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Dwie zmiany

1. **Przeniesienie niewidoczne na start** — pojawia się dopiero gdy uczeń kliknie w obszar nad cyfrą
2. **Szerokość pola przeniesienia = szerokość pola cyfry** — żeby stało dokładnie nad swoją kolumną

---

## Zmiana 1 — Stan widoczności przeniesień

W `ArithmeticDisplay.tsx` dodaj nowy stan:

```typescript
// Zbiór id komórek carry które zostały "odblokowane" przez kliknięcie
const [unlockedCarries, setUnlockedCarries] = useState<Set<string>>(new Set());

// Reset przy nowym zadaniu — dodaj do istniejącego useEffect:
setUnlockedCarries(new Set());
```

---

## Zmiana 2 — Obszar kliknięcia nad kolumną (unlock carry)

W każdym wierszu przeniesień (carry row) nad wierszem cząstkowym, zamiast od razu renderować kratkę, renderuj **niewidoczny obszar klikalny** który po kliknięciu odblokowuje kratkę.

Znajdź w JSX sekcję renderowania wiersza przeniesień dla partial:

```typescript
{/* Wiersz przeniesień dla tego partial */}
{p.carries && Object.keys(p.carries).length > 0 && (
  <div className="flex">
    <div className={EMPTY_CLS} />
    {carry_rows[pi].map((c, col) => {
```

Zastąp CAŁĄ tę sekcję:

```typescript
{/* Wiersz przeniesień — zawsze renderowany (żeby zachować wyrównanie) */}
{isMultiply && (
  <div className="flex">
    <div className={EMPTY_CLS} /> {/* placeholder na symbol */}
    {Array.from({ length: gridCols }).map((_, col) => {
      const carryCell = getInputCell('carry', pi, col);
      const isUnlocked = carryCell && unlockedCarries.has(carryCell.id);
      const isActiveCarry = carryCell && activeCell?.id === carryCell.id;

      // Zawsze renderuj komórkę tej samej szerokości co DIGIT_CLS
      // Jeśli nie ma carry w tej kolumnie — puste miejsce
      if (!carryCell) {
        return <div key={col} className={EMPTY_CLS} />;
      }

      // Jest carry, ale nie odblokowane — niewidoczny obszar klikalny
      if (!isUnlocked && !isActiveCarry) {
        return (
          <div
            key={col}
            className={`${CELL_SIZE} flex items-center justify-center cursor-pointer rounded opacity-0 hover:opacity-30 transition-opacity`}
            title="Kliknij żeby zapisać przeniesienie"
            onClick={() => {
              setUnlockedCarries(prev => new Set(prev).add(carryCell.id));
              // Jeśli ta komórka jest następna w kolejce — nie rób nic extra
              // (aktywacja przez kolejkę)
            }}
          >
            <span className={`text-xs ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-400'}`}>+</span>
          </div>
        );
      }

      // Odblokowane lub aktywne — renderuj normalnie
      return renderInputCell(carryCell);
    })}
  </div>
)}
```

---

## Zmiana 3 — Automatyczne odblokowywanie gdy carry staje się aktywne

W `handleDigit`, po przeskoczeniu do następnej komórki (`setCurrentIdx(next)`), sprawdź czy następna komórka to carry — jeśli tak, odblokuj ją automatycznie (bo to jest jej kolej w kolejce):

```typescript
if (correct) {
  const next = currentIdx + 1;
  if (next >= newQueue.length) {
    setDone(true);
    onTaskComplete(true);
  } else {
    const nextCell = newQueue[next];
    // Jeśli następna komórka to carry — odblokuj ją automatycznie
    if (nextCell.type === 'carry') {
      setUnlockedCarries(prev => new Set(prev).add(nextCell.id));
    }
    const q2 = newQueue.map((c, i) => i === next ? { ...c, status: 'active' as const } : c);
    setQueue(q2);
    setCurrentIdx(next);
  }
  setTimeout(() => setFeedback(null), 1000);
}
```

---

## Zmiana 4 — Szerokość pola przeniesienia = szerokość pola cyfry

W funkcji `renderInputCell`, usuń osobną obsługę `isCarry` dla rozmiaru:

```typescript
// STARY (mała kratka carry):
${isCarry
  ? 'w-11 h-7 sm:w-14 sm:h-7 text-xs sm:text-sm'
  : `${CELL_SIZE} text-2xl sm:text-3xl`}

// NOWY (ta sama szerokość co cyfra, mniejsza wysokość):
${isCarry
  ? `${CELL_SIZE.split(' ').filter(c => c.startsWith('w-')).join(' ')} h-7 sm:h-8 text-sm sm:text-base`
  : `${CELL_SIZE} text-2xl sm:text-3xl`}
```

Wyjaśnienie: zachowujemy tę samą **szerokość** (`w-12 sm:w-16 lg:w-20`) co komórki cyfr, ale zmniejszamy **wysokość** (`h-7`) żeby było wiadomo że to mała cyfra przeniesienia, a nie pełna kratka.

---

## Zmiana 5 — To samo dla dodawania

Carry row dla dodawania — ten sam pattern:

```typescript
{/* Wiersz przeniesień dodawania */}
{isAdd && (
  <div className="flex">
    <div className={EMPTY_CLS} />
    {row_op1.map((_, i) => {
      const carryCell = getAddCarryCell(i);
      if (!carryCell) return <div key={i} className={EMPTY_CLS} />;

      const isUnlocked = unlockedCarries.has(carryCell.id);
      const isActiveCarry = activeCell?.id === carryCell.id;

      if (!isUnlocked && !isActiveCarry) {
        return (
          <div
            key={i}
            className={`${CELL_SIZE.split(' ').filter(c => c.startsWith('w-')).join(' ')} h-7 sm:h-8 flex items-center justify-center cursor-pointer rounded opacity-0 hover:opacity-30 transition-opacity`}
            onClick={() => setUnlockedCarries(prev => new Set(prev).add(carryCell.id))}
          />
        );
      }

      return renderInputCell(carryCell);
    })}
  </div>
)}
```

---

## Checklist

- [ ] Na starcie: **brak widocznych małych kratek** nad cyframi operandów
- [ ] Po najechaniu myszą na obszar przeniesienia: delikatny hint (opacity hover)
- [ ] Gdy kursor (kolejka) dochodzi do komórki carry → kratka pojawia się automatycznie podświetlona
- [ ] Szerokość kratki carry = szerokość kratki cyfry (stoją dokładnie nad sobą)
- [ ] Przeniesienie wiersza 1 (710×8) i wiersza 2 (710×2) są **w osobnych rzędach** i nie mieszają się
- [ ] Po wpisaniu przeniesienia kursor przechodzi do następnej cyfry

# 17-kratki-zeszyt.md — Każda cyfra w kratce jak w zeszycie

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem (ze screenshotów)

1. Cyfry DANE (`3 2 3`, `1 9 3 8`) są bez ramek — wyglądają jak tekst na tle
2. Tylko kratki do wpisania mają obwódkę — to wygląda niespójnie
3. W prawdziwym zeszycie KAŻDA cyfra siedzi w swojej kratce z widoczną ramką

## Rozwiązanie

Każda komórka w siatce (czy to dana cyfra, czy kratka do wpisania) musi mieć widoczną ramkę.
- **Cyfra dana** → ramka widoczna, kolor tekstu normalny, tło lekko kontrastowe
- **Kratka do wpisania (pusta)** → ramka przerywana, znak `?`
- **Kratka aktywna** → ramka żółta/jasnoniebieska z efektem glow
- **Kratka poprawnie wypełniona** → ramka zielona
- **Kratka błędna** → ramka czerwona + shake

---

## Zmiany w `frontend/src/components/ArithmeticDisplay.tsx`

### Zmiana 1 — Style stałej komórki (cyfra dana)

Znajdź stałą `DIGIT_CLS` i zmień:

```typescript
// STARY:
const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;

// NOWY — dodaj ramkę:
const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold rounded
  ${classes.font}
  ${theme === 'chalk'
    ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
    : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
```

### Zmiana 2 — Pusta komórka (placeholder bez cyfry)

Znajdź stałą `EMPTY_CLS`:

```typescript
// STARY:
const EMPTY_CLS = `${CELL_SIZE} flex items-center justify-center`;

// NOWY — brak ramki, ale zachowaj rozmiar:
const EMPTY_CLS = `${CELL_SIZE} flex items-center justify-center`;
// (bez zmian — puste miejsca NIE mają ramki, tylko miejsca z cyfrą lub ? ją mają)
```

### Zmiana 3 — Komórka symbolu (+, ×)

Znajdź `SYM_CLS`:

```typescript
// STARY:
const SYM_CLS = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`;

// NOWY — symbol też w kratce:
const SYM_CLS = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold rounded
  ${classes.font}
  ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`;
// Symbol NIE ma ramki — jest poza siatką cyfr
```

### Zmiana 4 — Komórka inputu (renderInputCell)

Zaktualizuj style kratki do wpisania żeby były spójne z DIGIT_CLS:

```typescript
function renderInputCell(cell: Cell) {
  const isActive = activeCell?.id === cell.id;
  const isCarry  = cell.type === 'carry';

  return (
    <motion.div
      key={cell.id}
      onClick={() => inputRef.current?.focus()}
      whileTap={{ scale: 0.88 }}
      className={`
        ${isCarry
          ? 'w-11 h-7 sm:w-14 sm:h-7 text-xs sm:text-sm'
          : `${CELL_SIZE} text-2xl sm:text-3xl`}
        flex items-center justify-center
        font-bold rounded cursor-pointer transition-all select-none
        ${classes.font}
        ${cell.status === 'correct'
          ? theme === 'chalk'
            ? 'border border-chalk-success bg-chalk-success/15 text-chalk-success'
            : 'border border-green-400 bg-green-50 text-green-700'
          : ''}
        ${cell.status === 'error'
          ? `animate-shake border-2 ${theme === 'chalk'
              ? 'border-chalk-error bg-chalk-error/15 text-chalk-error'
              : 'border-red-400 bg-red-50 text-red-600'}`
          : ''}
        ${cell.status === 'empty'
          ? `border-2 border-dashed ${theme === 'chalk'
              ? 'border-chalk-text/40 bg-chalk-text/5'
              : 'border-gray-400 bg-black/5'}`
          : ''}
        ${cell.status === 'active'
          ? `border-2 ${theme === 'chalk'
              ? 'border-chalk-accent bg-chalk-accent/15 shadow-lg shadow-chalk-accent/30'
              : 'border-blue-500 bg-blue-50 shadow-md shadow-blue-200'}`
          : ''}
      `}
    >
      <AnimatePresence mode="wait">
        {cell.entered
          ? (
            <motion.span key="v" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>
              {cell.entered}
            </motion.span>
          ) : (
            <motion.span
              key="q"
              className="opacity-40"
              animate={cell.status === 'active' ? { opacity: [0.8, 0.2, 0.8] } : { opacity: 0.35 }}
              transition={cell.status === 'active' ? { repeat: Infinity, duration: 0.85 } : {}}
            >
              ?
            </motion.span>
          )
        }
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## Zmiany w `frontend/src/components/DivisionDisplay.tsx`

Ten sam pattern — cyfry dzielnej, dzielnika i ilorazu muszą mieć ramki.

Znajdź stałą `DIGIT` i zmień:

```typescript
// STARY:
const DIGIT = `${CELL} text-2xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;

// NOWY:
const DIGIT = `${CELL} text-2xl font-bold rounded
  ${classes.font}
  ${theme === 'chalk'
    ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
    : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
```

Dla komórek ilorazu (QuotientCell) zaktualizuj tak samo jak `renderInputCell` powyżej.

---

## Zmiana rozmiaru komórek — bardziej kwadratowe

W obu plikach zmień `CELL_SIZE` / `CELL`:

```typescript
// Większe i bardziej kwadratowe — jak kratki w zeszycie
const CELL_SIZE = 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16';
// DivisionDisplay:
const CELL = 'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center';
```

---

## Zmiana rozmiaru kontenera — pełny ekran

W obu plikach zmień padding siatki i `inline-flex` na `flex`:

```typescript
// STARY:
<div className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl ...`}>

// NOWY — wycentrowany, ale nie rozpięty na cały ekran (siatka ma naturalną szerokość):
<div className={`flex flex-col items-center p-8 sm:p-10 lg:p-12 rounded-2xl mx-auto ...`}>
```

Wrapper strony (PracticePage, TestPage) zmień na:

```typescript
// STARY:
<div className="w-full flex flex-col items-center gap-6 pb-8">

// NOWY:
<div className="w-full min-h-screen flex flex-col items-center justify-center gap-6 pb-8 px-4">
```

---

## Checklist

Po zmianach przetestuj wizualnie:

- [ ] `3 2 3` (operand1) — każda cyfra w widocznej ramce, spójna z kratkami do wpisania
- [ ] `× 2 6` — cyfry `2` i `6` w ramkach, symbol `×` bez ramki
- [ ] `1 9 3 8` (wynik cząstkowy) — każda cyfra w widocznej ramce
- [ ] Kratki `?` — ramka przerywana, ciemniejsza
- [ ] Kratka aktywna `?` — ramka żółta, tło lekko żółte
- [ ] Kratka poprawna — ramka zielona
- [ ] Kratka błędna — ramka czerwona + shake
- [ ] Wszystkie kratki mają ten sam rozmiar
- [ ] Siatka wycentrowana na stronie

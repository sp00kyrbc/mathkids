# 11-bugfix-layout-carry.md — Pełny ekran + wiersze przeniesień

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Dwa problemy do naprawienia:

1. **Interfejs zajmuje 1/4 ekranu** — za dużo `max-w-` ograniczeń w zagnieżdżonych komponentach
2. **Brak wiersza przeniesień (carry)** — `ArithmeticDisplay` pokazuje carry tylko gdy `Object.keys(carries).length > 0`, ale `carries` nigdy nie jest wypełniany bo brakuje logiki która to robi

---

## NAPRAWA 1 — Pełny ekran

### Znajdź i zmień KAŻDE wystąpienie poniższych klas we WSZYSTKICH plikach w `frontend/src/`:

```
max-w-md   →   w-full max-w-3xl
max-w-sm   →   w-full max-w-xl
```

Pliki do sprawdzenia (użyj grep):
```bash
grep -r "max-w-md\|max-w-sm" frontend/src/
```

Każde trafienie — zamień na `w-full max-w-3xl` (lub `max-w-xl` dla małych modalów).

### Zaktualizuj `frontend/src/components/Layout.tsx`

Znajdź `<main` i zmień na:

```typescript
<main className="w-full min-h-screen px-4 py-4 sm:px-8 lg:px-12">
```

### Zaktualizuj `frontend/src/pages/PracticePage.tsx` i `TestPage.tsx`

Znajdź zewnętrzny wrapper div i zmień na:

```typescript
<div className="w-full flex flex-col items-center gap-6 pb-8">
```

### Zaktualizuj `frontend/src/components/ArithmeticDisplay.tsx`

Znajdź div z klasą `inline-flex flex-col items-end` (siatka) i zmień na:

```typescript
<div
  className={`
    w-full flex flex-col items-end gap-2 p-8 sm:p-12 rounded-2xl
    ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}
  `}
  onClick={() => inputRef.current?.focus()}
>
```

Znajdź też klasy komórek i zwiększ rozmiar:

```typescript
// Zmień WSZĘDZIE w ArithmeticDisplay:
// w-12 h-12  →  w-14 h-14 sm:w-16 sm:h-16
// text-2xl   →  text-3xl sm:text-4xl
```

---

## NAPRAWA 2 — Wiersz przeniesień (carry)

### Problem
`carries` to `useState<Record<number, string>>({})` ale nic go nie wypełnia.
Przeniesienia są w `task.steps` — każdy step z `position === 'carry'` ma `result_digit` i `column`.

### Rozwiązanie — zaktualizuj `frontend/src/components/ArithmeticDisplay.tsx`

**Krok A:** Po `initResultCells()` dodaj funkcję `initCarries`:

```typescript
function initCarries(): Record<number, string> {
  const c: Record<number, string> = {};
  // Przeniesienia są w steps z position === 'carry'
  // Na start puste — wypełniamy gdy dziecko dojdzie do danego kroku
  return c;
}
```

**Krok B:** W `handleDigitInput`, po potwierdzeniu poprawnej odpowiedzi (`data.correct === true`), dodaj logikę carry:

Znajdź blok `if (data.correct)` i PRZED przejściem do następnego kroku dodaj:

```typescript
if (data.correct) {
  // Sprawdź czy następny krok to przeniesienie (carry)
  const nextStepData = task.steps[currentStep + 1];
  if (nextStepData && nextStepData.position === 'carry') {
    // Pokaż przeniesienie automatycznie
    setCarries(prev => ({
      ...prev,
      [nextStepData.column]: String(nextStepData.result_digit)
    }));
    // Pomiń krok carry (dzieci go nie wpisują — jest pokazywany automatycznie)
    const nextResultStep = findNextResultStep(currentStep + 2, task);
    if (nextResultStep !== null) {
      setCurrentStep(nextResultStep);
      setActiveColIndex(task.steps[nextResultStep].column);
    } else {
      finishTask(newCells, true);
    }
  } else {
    // Normalny przeskok do następnego kroku result
    const nextStep = findNextResultStep(currentStep + 1, task);
    if (nextStep !== null) {
      setCurrentStep(nextStep);
      setActiveColIndex(task.steps[nextStep].column);
    } else {
      finishTask(newCells, true);
    }
  }
}
```

**Krok C:** Wiersz przeniesień w JSX — zamień warunek z:

```typescript
// STARY (nigdy nie pokazuje):
{Object.keys(carries).length > 0 && (

// NOWY (zawsze renderuj wiersz carry dla dodawania/mnożenia):
{(task.operation === 'addition' || task.operation === 'multiplication') && (
```

I wewnątrz wiersza carry dodaj wizualny styl:

```typescript
{digits1.map((_, i) => {
  const colIndex = resultCols - 1 - i;
  const carryVal = carries[colIndex];
  return (
    <div
      key={i}
      className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center"
    >
      <AnimatePresence>
        {carryVal && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`
              text-sm sm:text-base font-bold
              ${theme === 'chalk'
                ? 'text-chalk-accent'
                : 'text-red-500'}
            `}
          >
            {carryVal}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
})}
```

---

## Weryfikacja

```bash
cd frontend && npm run dev
```

Otwórz http://localhost:5173 i sprawdź:

- [ ] Siatka zajmuje min. 70% szerokości okna przeglądarki na desktopie
- [ ] Na mobile (lub DevTools mobile view) siatka jest pełnoekranowa
- [ ] Dla `490 + 37` — po wpisaniu `7` w jedności pojawia się `1` nad kolumną dziesiątek (mała cyfra w kolorze żółtym/czerwonym)
- [ ] Przeniesienie jest widoczne zanim dziecko wpisze cyfrę dziesiątek
- [ ] Odejmowanie NIE pokazuje wiersza carry (bo go nie ma)
- [ ] Feedback (zielony/czerwony pasek) nadal działa

---

## Jeśli po tych zmianach nadal jest za mało miejsca

Uruchom w terminalu:

```bash
grep -r "max-w-" frontend/src/ | grep -v "max-w-3xl\|max-w-xl\|max-w-2xl\|node_modules"
```

Każde trafienie które NIE jest `max-w-3xl` lub `max-w-2xl` — zmień na `w-full max-w-3xl`.

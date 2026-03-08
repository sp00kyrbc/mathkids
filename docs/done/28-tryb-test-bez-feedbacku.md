# 28-tryb-test-bez-feedbacku.md — Tryb test: feedback dopiero na końcu

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

W trybie `test` po wpisaniu złej cyfry komputer od razu pokazuje błąd i nie pozwala przejść dalej.
Powinno być: uczeń wpisuje wszystko do końca, dopiero po ostatniej cyfrze widzi co było dobre a co nie.

## Zasady trybu test

- Każda wpisana cyfra jest **akceptowana bez oceny** i przechodzi do następnej
- Żaden feedback (czerwony/zielony) nie pojawia się w trakcie
- Żadne "animate-shake", żadne kolorowanie kratek
- Po wpisaniu OSTATNIEJ cyfry → walidacja całości i podsumowanie

---

## Zmiana w `ArithmeticDisplay.tsx`

### 1. Stan dla trybu test

```typescript
// Dodaj nowy stan (obok istniejących):
const [testAnswers, setTestAnswers] = useState<string[]>([]);
```

### 2. Zmień `handleDigit` — blok `mode === 'test'`

Znajdź w `handleDigit` fragment obsługi trybu test i zastąp CAŁOŚĆ:

```typescript
const handleDigit = useCallback(async (digit: string) => {
  if (done || isChecking || !activeCell) return;

  let correct = false;

  if (mode === 'test') {
    // ── TRYB TEST: akceptuj bez oceny, idź dalej ──────────────────
    correct = true; // traktujemy jako "poprawne" żeby przejść dalej

    const newQueue = queue.map((c, i) =>
      i === currentIdx ? { ...c, entered: digit, status: 'correct' as const } : c
    );
    setQueue(newQueue);

    // Zapisz odpowiedź do testAnswers
    setTestAnswers(prev => [...prev, digit]);

    const next = currentIdx + 1;
    if (next >= newQueue.length) {
      // Ostatnia cyfra — teraz oceń WSZYSTKO
      setDone(true);

      // Oblicz ile poprawnych
      const allAnswers = [...testAnswers, digit]; // dodaj bieżącą
      const allCorrect = allAnswers.every((ans, idx) => {
        const cell = newQueue[idx];
        return cell && ans === cell.expected;
      });

      // Pokoloruj wszystkie kratki
      const scoredQueue = newQueue.map((c, i) => ({
        ...c,
        status: (allAnswers[i] === c.expected ? 'correct' : 'error') as 'correct' | 'error',
      }));
      setQueue(scoredQueue);

      // Poczekaj chwilę żeby uczeń zobaczył wyniki, potem callback
      setTimeout(() => {
        const correctCount = allAnswers.filter((ans, i) => ans === newQueue[i]?.expected).length;
        onTaskComplete(correctCount === allAnswers.length);
      }, 1800);
    } else {
      // Przejdź dalej bez feedbacku
      setQueue(newQueue.map((c, i) =>
        i === next ? { ...c, status: 'active' as const } : c
      ));
      setCurrentIdx(next);
    }
    return; // ← wyjdź z funkcji, nie rób walidacji API
  }

  // ── TRYB LEARN / PRACTICE: natychmiastowy feedback ─────────────
  setIsChecking(true);
  try {
    const res = await fetch(`${API}/api/validate/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: task.operation,
        step_id: activeCell.stepId,
        task_data: task,
        user_answer: Number(digit),
      }),
    });
    const data = await res.json();
    correct = data.correct;
    setFeedback({ msg: data.feedback, ok: correct });
  } catch {
    correct = digit === activeCell.expected;
    setFeedback({ msg: correct ? 'Dobrze!' : 'Nie, sprobuj jeszcze raz!', ok: correct });
  } finally {
    setIsChecking(false);
  }

  const newQueue = queue.map((c, i) =>
    i === currentIdx
      ? { ...c, entered: digit, status: correct ? 'correct' as const : 'error' as const }
      : c
  );
  setQueue(newQueue);
  onStepComplete(correct);

  if (correct) {
    const next = currentIdx + 1;
    if (next >= newQueue.length) {
      setDone(true);
      onTaskComplete(true);
    } else {
      setQueue(newQueue.map((c, i) =>
        i === next ? { ...c, status: 'active' as const } : c
      ));
      setCurrentIdx(next);
    }
    setTimeout(() => setFeedback(null), 900);
  } else {
    // Błąd — zostań na tej samej kratce, wyczyść po chwili
    setTimeout(() => {
      setQueue(q => q.map((c, i) =>
        i === currentIdx ? { ...c, entered: '', status: 'active' as const } : c
      ));
      setFeedback(null);
    }, 1400);
  }
}, [done, isChecking, activeCell, currentIdx, queue, task, mode, testAnswers, onStepComplete, onTaskComplete]);
```

### 3. Reset `testAnswers` przy nowym zadaniu

```typescript
useEffect(() => {
  // ... istniejące resety ...
  setTestAnswers([]);
}, [task]);
```

### 4. Styl kratki w trybie test — brak kolorowania PRZED końcem

W funkcji renderującej kratkę (`renderInputCell`), kratka z wpisaną cyfrą w trybie test
powinna wyglądać jak "wypełniona neutral" a nie zielona/czerwona w trakcie wpisywania:

```typescript
function renderInputCell(cell: ...) {
  // Czy jesteśmy w trakcie testu (nie na końcu)?
  const isTestInProgress = mode === 'test' && !done;

  return (
    <div className={`
      ${CS} flex items-center justify-center ...
      ${isTestInProgress && cell.entered
        ? /* neutral — wpisano ale nie oceniano jeszcze */
          theme === 'chalk'
            ? 'border border-chalk-text/50 text-chalk-text bg-chalk-text/10'
            : 'border border-gray-400 text-gray-700 bg-gray-100'
        : ''}
      ${!isTestInProgress && cell.status === 'correct' ? '...' : ''}
      ${!isTestInProgress && cell.status === 'error'   ? '...' : ''}
      ${cell.status === 'empty'  ? '...' : ''}
      ${cell.status === 'active' ? '...' : ''}
    `}>
```

---

## Ta sama zmiana w `DivisionDisplay.tsx`

Identyczna logika — znajdź `handleDigit` w `DivisionDisplay.tsx` i zastosuj ten sam wzorzec:

```typescript
// Dodaj stan:
const [testAnswers, setTestAnswers] = useState<string[]>([]);

// W handleDigit — blok mode === 'test':
if (mode === 'test') {
  const newQueue = queue.map((c, i) =>
    i === currentIdx ? { ...c, entered: digit, status: 'correct' as const } : c
  );
  setQueue(newQueue);
  setTestAnswers(prev => [...prev, digit]);

  const next = currentIdx + 1;
  if (next >= newQueue.length) {
    setDone(true);
    const allAnswers = [...testAnswers, digit];
    const scoredQueue = newQueue.map((c, i) => ({
      ...c,
      status: (allAnswers[i] === c.expected ? 'correct' : 'error') as 'correct' | 'error',
    }));
    setQueue(scoredQueue);
    setTimeout(() => {
      const allCorrect = allAnswers.every((ans, i) => ans === newQueue[i]?.expected);
      onTaskComplete(allCorrect);
    }, 1800);
  } else {
    setQueue(newQueue.map((c, i) =>
      i === next ? { ...c, status: 'active' as const } : c
    ));
    setCurrentIdx(next);
  }
  return;
}
```

---

## Checklist

- [ ] Tryb **Ucz się** (tutorial): feedback natychmiastowy po każdej cyfrze ✓
- [ ] Tryb **Ćwicz**: feedback natychmiastowy, błąd = zostań na kratce ✓
- [ ] Tryb **Test**: wpisujesz wszystkie cyfry bez żadnego koloru/feedbacku
- [ ] Tryb **Test**: po ostatniej cyfrze — kratki zielenią się lub czerwienią naraz
- [ ] Tryb **Test**: po 1.8s → przejście do następnego zadania lub ekran wyników
- [ ] Tryb **Test**: kratki z wpisaną cyfrą w trakcie testu mają kolor neutralny (nie zielony)

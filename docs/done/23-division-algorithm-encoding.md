# 23-division-algorithm-encoding.md — Poprawny algorytm dzielenia + enkodowanie Python

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem 1 — Błędny algorytm dzielenia

### Co jest źle
Dla `689 ÷ 53` backend bierze cyfrę `6`, liczy `6 ÷ 53 = 0` i mówi "reszta 6".
To jest błąd — w polskiej metodzie bierzemy tyle cyfr ile potrzeba żeby liczba była >= dzielnik.

### Poprawna polska metoda (przykład 689 ÷ 53 = 13)
```
Krok 1: Bierz cyfry od lewej aż liczba >= 53
         6 < 53 → bierz więcej
         68 >= 53 → ok, current = 68
         68 ÷ 53 = 1 (bo 1×53=53, 2×53=106>68)
         reszta = 68 - 53 = 15
         iloraz: "1"

Krok 2: Dociągnij kolejną cyfrę (9)
         current = 15*10 + 9 = 159
         159 ÷ 53 = 3 (bo 3×53=159)
         reszta = 159 - 159 = 0
         iloraz: "13"

Wynik: 13, reszta 0
```

## Problem 2 — Krzaczki w Python

Polskie znaki w f-stringach (`mieści`, `się`, `biorę` itd.) są zapisane jako UTF-8
ale serwer Node.js odczytuje je jako Latin-1. Rozwiązanie: zastąp WSZYSTKIE polskie
znaki w komunikatach angielskimi lub użyj tylko ASCII.

---

## Krok 1 — Napraw `backend/src/python/arithmetic_engine.py`

### A) Dodaj na SAMYM POCZĄTKU pliku (linia 1):
```python
# -*- coding: utf-8 -*-
```

### B) Przepisz `_compute_division_steps` od zera:

```python
def _compute_division_steps(dividend: int, divisor: int):
    """
    Polska metoda dzielenia pisemnego.
    Bierzemy cyfry od lewej az liczba >= dzielnik.
    """
    dividend_str = str(dividend)
    n = len(dividend_str)
    
    steps = []
    substeps = []
    step_id = 0
    
    current = 0
    quotient_digits = []
    
    for i, digit_char in enumerate(dividend_str):
        current = current * 10 + int(digit_char)
        
        # Jesli current < divisor i nie ostatnia cyfra — iloraz 0 (pomijamy w wyniku)
        if current < divisor:
            quotient_digits.append(0)
            # Nie dodajemy substep dla zera wiodacego
            continue
        
        # Oblicz cyfre ilorazu
        q_digit = current // divisor
        product = q_digit * divisor
        remainder = current - product
        
        quotient_digits.append(q_digit)
        
        # Opis kroku — tylko ASCII zeby uniknac problemow z kodowaniem
        desc = (
            f"Biore {current}. "
            f"{current} : {divisor} = {q_digit} "
            f"(bo {q_digit} x {divisor} = {product}). "
            f"Reszta: {remainder}."
        )
        hint = f"Ile razy {divisor} miesci sie w {current}?"
        
        steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=len(quotient_digits) - 1,
            result_digit=q_digit,
            description=desc,
            hint=hint,
            carry=0,
            input_digits=[current, divisor],
        ))
        step_id += 1
        
        substeps.append({
            "current_value": current,
            "quotient_digit": q_digit,
            "product": product,
            "remainder": remainder,
            "digits_taken": dividend_str[:i+1],
        })
        
        current = remainder
    
    return steps, substeps
```

### C) Napraw `_generate_division`:

```python
def _generate_division(max_digits1: int, max_digits2: int) -> dict:
    """Generuje dzielenie bez reszty."""
    import random
    
    max_digits2 = min(max_digits2, 2)
    
    # Generuj tak zeby dzielenie bylo bez reszty
    for _ in range(100):
        divisor = _random_number(max_digits2, min_val=2)
        quotient = _random_number(max(1, max_digits1 - max_digits2 + 1), min_val=1)
        dividend = divisor * quotient
        
        # Sprawdz ze pierwsza cyfra dzielnej >= pierwsza cyfra dzielnika
        # (zeby algorytm nie zaczynal od zera)
        dividend_str = str(dividend)
        divisor_str = str(divisor)
        
        if len(dividend_str) <= max_digits1:
            break
    
    steps, substeps = _compute_division_steps(dividend, divisor)
    layout = _build_division_layout(dividend, divisor, quotient, 0, substeps)
    
    # Tylko ASCII w question
    return {
        "operation": "division",
        "operand1": dividend,
        "operand2": divisor,
        "result": quotient,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "division_steps": substeps,
        "layout": layout,
        "difficulty": len(str(dividend)),
        "symbol": "/",   # bezbpieczny ASCII — frontend zamieni na prawdziwy znak
        "question": f"{dividend} / {divisor} = ?",
    }
```

### D) Napraw WSZYSTKIE polskie teksty w całym pliku

Uruchom i sprawdź:
```bash
grep -n "ę\|ą\|ś\|ó\|ł\|ż\|ź\|ć\|ń\|Ę\|Ą\|Ś\|Ó\|Ł\|Ż\|Ź\|Ć\|Ń" backend/src/python/arithmetic_engine.py
```

Każde trafienie — zastąp wersją ASCII (bez polskich znaków):
```
"Biorę"      → "Biore"
"mieści"     → "miesci"
"się"        → "sie"
"Przechodzę" → "Przechodze"  
"Przenosze"  → "Przenosze"
"następnej"  → "nastepnej"
"Dodaję"     → "Dodaje"
"Mnożę"      → "Mnoze"
"Odejmuję"   → "Odejmuje"
"cyfry"      → "cyfry"  (bez zmian)
```

Alternatywnie — w każdej funkcji gdzie są polskie znaki w f-stringach,
użyj `.encode('utf-8').decode('utf-8')` lub po prostu wytnij polskie znaki z opisów.

---

## Krok 2 — Napraw `backend/src/services/pythonBridge.ts`

Upewnij się że bridge używa UTF-8:

```typescript
import { spawn } from 'child_process';

export function callPython(input: object): Promise<object> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['src/python/arithmetic_engine.py'], {
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',   // ← TO JEST KLUCZOWE
        PYTHONUTF8: '1',              // ← Python 3.7+ UTF-8 mode
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    py.stdout.setEncoding('utf8');   // ← jawnie UTF-8
    py.stderr.setEncoding('utf8');
    
    py.stdout.on('data', (data: string) => { stdout += data; });
    py.stderr.on('data', (data: string) => { stderr += data; });
    
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python error: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`JSON parse error: ${stdout}`));
      }
    });
    
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}
```

---

## Krok 3 — Weryfikacja curl

```bash
curl -s -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"division","max_digits1":3,"max_digits2":2}' | python3 -m json.tool
```

Sprawdź:
- `division_steps[0].current_value` musi być >= `operand2` (dzielnik)
- Żadnych krzaczków w `steps[0].description` i `steps[0].hint`
- `result` = poprawny iloraz (sprawdź ręcznie: `operand1 / operand2`)

### Test konkretny — `689 ÷ 53`:
Wymuś to zadanie:
```bash
# Uruchom Python bezpośrednio:
python3 -c "
import sys
sys.path.insert(0, 'backend/src/python')
# lub bezposrednio:
exec(open('backend/src/python/arithmetic_engine.py').read())
import json
result = _compute_division_steps(689, 53)
steps, substeps = result
print('substeps:', json.dumps(substeps, indent=2))
"
```

Oczekiwany wynik:
```json
[
  {
    "current_value": 68,
    "quotient_digit": 1,
    "product": 53,
    "remainder": 15
  },
  {
    "current_value": 159,
    "quotient_digit": 3,
    "product": 159,
    "remainder": 0
  }
]
```

---

## Krok 4 — Frontend: symbol dzielenia

W `frontend/src/utils/symbols.ts` upewnij się że backend wysyła `/`
a frontend zamienia na prawdziwy znak:

```typescript
export function operationSymbol(op: string, backendSymbol?: string): string {
  // Zawsze używaj naszych stałych — nie ufaj symbolowi z backendu
  switch (op) {
    case 'multiplication': return '×';
    case 'division':       return '÷';
    case 'subtraction':    return '−';
    default:               return '+';
  }
}
```

---

## Checklist

- [ ] `689 ÷ 53`: pierwszy substep `current_value = 68` (nie `6`)
- [ ] `689 ÷ 53`: wynik = `13`
- [ ] Feedback "Nie całkiem..." bez krzaczków
- [ ] Opis kroku "Biore 68. 68 : 53 = 1..." bez krzaczków
- [ ] `operand1 / operand2` zawsze daje całkowity wynik (bez reszty)

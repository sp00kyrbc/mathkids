# 03-backend-api.md — Backend Node.js + Express

## Kontekst
Backend jest mostem między frontendem (React) a silnikiem Pythona i Gemini API.
**Nie wykonuj żadnych obliczeń w Node.js** — całą logikę arytmetyczną deleguj do Pythona.

---

## Utwórz: `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/tasks';
import aiRoutes from './routes/ai';
import validateRoutes from './routes/validate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Logowanie requestów w trybie dev
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Trasy
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/validate', validateRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Obsługa błędów globalnie
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Błąd serwera:', err);
  res.status(500).json({ error: 'Wewnętrzny błąd serwera', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 MathKids Backend działa na http://localhost:${PORT}`);
});

export default app;
```

---

## Utwórz: `backend/src/services/pythonBridge.ts`

```typescript
import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT = path.join(__dirname, '../python/arithmetic_engine.py');

/**
 * Wywołuje Python silnik arytmetyczny.
 * Komunikacja przez stdin/stdout JSON.
 */
export function callPython(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        reject(new Error(`Python zakończył się kodem ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          reject(new Error(result.error || 'Python zwrócił błąd'));
          return;
        }
        resolve(result.data);
      } catch (e) {
        reject(new Error(`Nie można sparsować odpowiedzi Pythona: ${stdout}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Nie można uruchomić Pythona: ${err.message}`));
    });

    // Wyślij dane do Pythona przez stdin
    python.stdin.write(JSON.stringify(input));
    python.stdin.end();
  });
}
```

---

## Utwórz: `backend/src/routes/tasks.ts`

```typescript
import { Router, Request, Response } from 'express';
import { callPython } from '../services/pythonBridge';

const router = Router();

/**
 * POST /api/tasks/generate
 * Generuje nowe zadanie arytmetyczne.
 * 
 * Body: {
 *   operation: "addition" | "subtraction" | "multiplication" | "division",
 *   max_digits1: number (1-6),
 *   max_digits2: number (1-6)
 * }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { operation, max_digits1 = 3, max_digits2 = 3 } = req.body;

    // Walidacja parametrów
    const validOperations = ['addition', 'subtraction', 'multiplication', 'division'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ error: `Nieznana operacja: ${operation}` });
    }
    if (max_digits1 < 1 || max_digits1 > 6 || max_digits2 < 1 || max_digits2 > 6) {
      return res.status(400).json({ error: 'max_digits musi być między 1 a 6' });
    }

    const task = await callPython({
      action: 'generate',
      operation,
      max_digits1: Number(max_digits1),
      max_digits2: Number(max_digits2)
    });

    res.json(task);
  } catch (error: any) {
    console.error('Błąd generowania zadania:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks/generate-batch
 * Generuje zestaw zadań (na test).
 * 
 * Body: {
 *   operations: string[],
 *   max_digits1: number,
 *   max_digits2: number,
 *   count: number (5-10)
 * }
 */
router.post('/generate-batch', async (req: Request, res: Response) => {
  try {
    const { operations, max_digits1 = 3, max_digits2 = 3, count = 5 } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'Podaj przynajmniej jedną operację' });
    }
    const taskCount = Math.min(Math.max(count, 3), 10);

    const tasks = [];
    for (let i = 0; i < taskCount; i++) {
      const op = operations[i % operations.length];
      const task = await callPython({
        action: 'generate',
        operation: op,
        max_digits1: Number(max_digits1),
        max_digits2: Number(max_digits2)
      });
      tasks.push(task);
    }

    res.json({ tasks, count: tasks.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Utwórz: `backend/src/routes/validate.ts`

```typescript
import { Router, Request, Response } from 'express';
import { callPython } from '../services/pythonBridge';

const router = Router();

/**
 * POST /api/validate/step
 * Waliduje odpowiedź dziecka dla pojedynczego kroku.
 */
router.post('/step', async (req: Request, res: Response) => {
  try {
    const { operation, step_id, task_data, user_answer } = req.body;

    if (user_answer === undefined || user_answer === null) {
      return res.status(400).json({ error: 'Brak odpowiedzi użytkownika' });
    }

    const result = await callPython({
      action: 'validate_step',
      operation,
      step_id: Number(step_id),
      task_data,
      user_answer: Number(user_answer)
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/validate/final
 * Waliduje końcowy wynik zadania.
 */
router.post('/final', async (req: Request, res: Response) => {
  try {
    const { task_data, user_answer } = req.body;

    const result = await callPython({
      action: 'validate_final',
      task_data,
      user_answer: Number(user_answer)
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/validate/test-score
 * Oblicza ocenę szkolną na podstawie wyników testu.
 * 
 * Body: {
 *   correct: number,
 *   total: number
 * }
 */
router.post('/test-score', (req: Request, res: Response) => {
  const { correct, total } = req.body;

  if (!total || total === 0) {
    return res.status(400).json({ error: 'Brak danych testu' });
  }

  const percentage = (correct / total) * 100;
  let grade: number;
  let message: string;

  if (percentage === 100) {
    grade = 6;
    message = 'Doskonale! Bezbłędna praca!';
  } else if (percentage >= 90) {
    grade = 5;
    message = 'Bardzo dobrze! Świetna robota!';
  } else if (percentage >= 75) {
    grade = 4;
    message = 'Dobrze! Masz solidne podstawy!';
  } else if (percentage >= 60) {
    grade = 3;
    message = 'Dostatecznie. Warto poćwiczyć jeszcze trochę!';
  } else if (percentage >= 40) {
    grade = 2;
    message = 'Musisz jeszcze popracować. Nie poddawaj się!';
  } else {
    grade = 1;
    message = 'Zacznijmy od początku. Razem damy radę!';
  }

  res.json({
    grade,
    percentage: Math.round(percentage),
    correct,
    total,
    message,
    stars: grade >= 5 ? 3 : grade >= 3 ? 2 : 1  // gwiazdy do animacji
  });
});

export default router;
```

---

## Utwórz: `backend/src/routes/ai.ts`

```typescript
import { Router, Request, Response } from 'express';
// GeminiService tworzymy w docs/08-gemini-setup.md
// Na razie placeholder który działa bez Gemini
import { getAIMessage } from '../services/geminiService';

const router = Router();

/**
 * POST /api/ai/message
 * Generuje spersonalizowaną wiadomość przez Gemini.
 * 
 * Body: {
 *   type: "greeting" | "error_hint" | "encouragement" | "test_result" | "level_up",
 *   childName: string,
 *   childAge: number,
 *   level: number,
 *   context?: object  // dodatkowy kontekst zależny od type
 * }
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { type, childName, childAge, level, context } = req.body;

    if (!type || !childName) {
      return res.status(400).json({ error: 'Brak wymaganych pól: type, childName' });
    }

    const message = await getAIMessage({ type, childName, childAge, level, context });
    res.json({ message });
  } catch (error: any) {
    console.error('Błąd AI:', error);
    // Fallback — nie blokuj UI jeśli Gemini nie działa
    res.json({ message: getFallbackMessage(req.body.type, req.body.childName) });
  }
});

// Wiadomości zapasowe gdy Gemini niedostępne
function getFallbackMessage(type: string, name: string): string {
  const messages: Record<string, string> = {
    greeting: `Cześć, ${name}! Gotowy na matematykę? 🎯`,
    error_hint: `Spróbuj jeszcze raz, ${name}! Możesz to zrobić! 💪`,
    encouragement: `Świetna robota, ${name}! Tak trzymaj! ⭐`,
    test_result: `Dobra robota, ${name}! Sprawdź swoje wyniki!`,
    level_up: `Wow, ${name}! Awansowałeś na wyższy poziom! 🎉`,
  };
  return messages[type] || `Dobra robota, ${name}!`;
}

export default router;
```

---

## Utwórz: `backend/src/services/geminiService.ts`

```typescript
/**
 * Placeholder dla serwisu Gemini.
 * Pełna implementacja w docs/08-gemini-setup.md
 */

interface AIMessageParams {
  type: string;
  childName: string;
  childAge?: number;
  level?: number;
  context?: any;
}

// Będzie nadpisane w 08-gemini-setup.md
export async function getAIMessage(params: AIMessageParams): Promise<string> {
  // Na razie zwraca wiadomość zapasową
  const { type, childName } = params;
  const fallbacks: Record<string, string> = {
    greeting: `Cześć, ${childName}! Zaczynamy! 🎯`,
    error_hint: `Jeszcze raz, ${childName}! Prawie! 💪`,
    encouragement: `Super, ${childName}! ⭐`,
    test_result: `Brawo, ${childName}!`,
    level_up: `Poziom wyżej, ${childName}! 🚀`,
  };
  return fallbacks[type] || `Dobra robota, ${childName}!`;
}
```

---

## ✅ Weryfikacja po tym kroku

```bash
cd backend
npm run dev
```

Sprawdź endpointy (użyj curl lub Postman / Insomnia):

```bash
# Health check
curl http://localhost:3001/health

# Generuj zadanie dodawania
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"addition","max_digits1":3,"max_digits2":2}'

# Generuj zadanie dzielenia
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"division","max_digits1":4,"max_digits2":1}'
```

Oczekiwany wynik: JSON z polami `operation`, `operand1`, `operand2`, `result`, `steps`.

- [ ] Backend startuje bez błędów
- [ ] `/health` zwraca `{ status: "ok" }`
- [ ] `/api/tasks/generate` zwraca zadanie z krokami
- [ ] Brak błędów TypeScript (`tsc --noEmit`)

Następny krok: `docs/04-frontend-shell.md`

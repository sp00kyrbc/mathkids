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

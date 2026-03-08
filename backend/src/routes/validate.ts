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

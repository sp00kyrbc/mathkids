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

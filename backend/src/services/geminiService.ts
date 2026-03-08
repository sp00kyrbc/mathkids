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

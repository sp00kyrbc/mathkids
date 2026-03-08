import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

interface AIMessageParams {
  type: 'greeting' | 'error_hint' | 'encouragement' | 'test_result' | 'level_up';
  childName: string;
  childAge?: number;
  level?: number;
  context?: {
    grade?: number;
    correct?: number;
    total?: number;
    operation?: string;
  };
}

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_UZUPELNIJ_POZNIEJ') {
      throw new Error('GEMINI_API_KEY nie jest ustawiony w .env');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { maxOutputTokens: 150, temperature: 0.8 },
    });
  }
  return model;
}

function buildPrompt(params: AIMessageParams): string {
  const { type, childName, childAge = 9, level = 1, context } = params;

  const ageGroup = childAge <= 8 ? 'małe dziecko (6-8 lat)'
    : childAge <= 11 ? 'dziecko (9-11 lat)'
    : 'nastolatek (12-13 lat)';

  const base = `Jesteś pomocnym nauczycielem matematyki.
Rozmawiasz z ${ageGroup} o imieniu ${childName}, poziom ${level}/10.
Odpowiadaj TYLKO po polsku. Maksymalnie 2 zdania.
Ton: ciepły, motywujący. NIE używaj Markdown ani gwiazdek.`;

  const opName = context?.operation === 'addition' ? 'dodawaniu'
    : context?.operation === 'subtraction' ? 'odejmowaniu'
    : context?.operation === 'multiplication' ? 'mnożeniu' : 'dzieleniu';

  const prompts: Record<AIMessageParams['type'], string> = {
    greeting:      `${base}\nPrzywitaj ${childName} i zachęć do ćwiczeń.`,
    error_hint:    `${base}\n${childName} popełniło błąd w ${opName}. Zmotywuj. NIE tłumacz rozwiązania.`,
    encouragement: `${base}\n${childName} rozwiązało kilka zadań pod rząd. Pochwal krótko.`,
    test_result:   `${base}\n${childName}: ${context?.correct}/${context?.total}, ocena ${context?.grade}/6.\n${(context?.grade ?? 0) >= 4 ? 'Pochwal.' : 'Wesprzyj bez krytyki.'}`,
    level_up:      `${base}\n${childName} awansowało na poziom ${level}! Entuzjastycznie!`,
  };

  return prompts[type];
}

export async function getAIMessage(params: AIMessageParams): Promise<string> {
  try {
    const result = await getModel().generateContent(buildPrompt(params));
    return result.response.text().trim().replace(/\*\*/g, '').replace(/\*/g, '');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Gemini error:', msg);
    return getFallback(params.type, params.childName, params.context);
  }
}

function getFallback(type: AIMessageParams['type'], name: string, ctx?: AIMessageParams['context']): string {
  switch (type) {
    case 'greeting':      return `Cześć, ${name}! Gotowy na matematykę? 🎯`;
    case 'error_hint':    return `Prawie, ${name}! Spróbuj jeszcze raz! 💪`;
    case 'encouragement': return `Świetna robota, ${name}! Tak trzymaj! ⭐`;
    case 'level_up':      return `WOW, ${name}! Nowy poziom! Jesteś niesamowity! 🚀`;
    case 'test_result': {
      const g = ctx?.grade ?? 3;
      if (g >= 5) return `Wspaniały wynik, ${name}! Jesteś matematykiem! 🏆`;
      if (g >= 3) return `Dobra robota, ${name}! Ćwicz dalej! ⭐`;
      return `Nie poddawaj się, ${name}! Każdy błąd to nauka! 💪`;
    }
    default: return `Dobra robota, ${name}!`;
  }
}

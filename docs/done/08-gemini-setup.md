# 08-gemini-setup.md — Integracja Gemini 2.0 Flash

## Założenie
Klucz API (`GEMINI_API_KEY`) jest już wpisany w `backend/.env` przez właściciela projektu.
Ten plik implementuje tylko kod — nie konfiguruje GCP.

Model do użycia: `gemini-2.5-flash-lite` (najszybszy i najtańszy — idealny do krótkich komunikatów)

---

## Zaktualizuj: `backend/src/services/geminiService.ts`

Zastąp cały plik poniższą implementacją:

```typescript
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
  } catch (error: any) {
    console.error('Gemini error:', error.message);
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
```

---

## Weryfikacja

```bash
cd backend && npm run dev
```

W nowym terminalu:

```bash
curl -X POST http://localhost:3001/api/ai/message \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"greeting\",\"childName\":\"Kacper\",\"childAge\":9,\"level\":2}"
```

Oczekiwany wynik: `{ "message": "Cześć, Kacper! ..." }` po polsku, bez gwiazdek.

---

## Integracja w MenuPage — powitanie AI

Zaktualizuj `frontend/src/pages/MenuPage.tsx` — dodaj na początku komponentu:

```typescript
import { useState, useEffect } from 'react';

const [greeting, setGreeting] = useState('');
const API = import.meta.env.VITE_API_URL;

useEffect(() => {
  if (!activeProfile) return;
  fetch(`${API}/api/ai/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'greeting',
      childName: activeProfile.name,
      childAge: activeProfile.age,
      level: activeProfile.level,
    })
  })
    .then(r => r.json())
    .then(data => setGreeting(data.message))
    .catch(() => setGreeting(`Cześć, ${activeProfile.name}! Co robimy dziś? 🎯`));
}, [activeProfile?.id]);
```

W JSX zamień hardkodowany tekst na: `{greeting || \`Cześć, ${activeProfile?.name}!\`}`

---

## Utwórz: `frontend/src/pages/SettingsPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

export function SettingsPage() {
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());
  const setTheme = useAppStore(s => s.setTheme);
  const setFeedbackMode = useAppStore(s => s.setFeedbackMode);

  if (!activeProfile) return null;

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/menu')} className={`text-sm ${classes.text} opacity-60`}>← Wróć</button>
          <h2 className={`text-xl font-bold ${classes.text}`}>{pl.settings.title}</h2>
        </div>

        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.theme}</h3>
          <div className="flex gap-3">
            {(['chalk', 'notebook'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeProfile.theme === t ? classes.button : classes.buttonSecondary}`}>
                {t === 'chalk' ? '🖊️ Tablica' : '📓 Zeszyt'}
              </button>
            ))}
          </div>
        </div>

        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.feedbackMode}</h3>
          <div className="space-y-2">
            {(['immediate', 'after'] as const).map(mode => (
              <button key={mode} onClick={() => setFeedbackMode(mode)}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${activeProfile.feedbackMode === mode ? classes.button : classes.buttonSecondary}`}>
                <span>{mode === 'immediate' ? '⚡' : '🎭'}</span>
                <div>
                  <div className="font-bold text-sm">{mode === 'immediate' ? pl.settings.feedbackImmediate : pl.settings.feedbackAfter}</div>
                  <div className="text-xs opacity-70">{mode === 'immediate' ? 'Błąd zaznaczany natychmiast' : 'Pokaż poprawne po ukończeniu'}</div>
                </div>
                {activeProfile.feedbackMode === mode && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`${classes.card} p-4`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{activeProfile.avatar}</span>
            <div>
              <p className={`font-bold ${classes.text}`}>{activeProfile.name}</p>
              <p className={`text-sm ${classes.text} opacity-60`}>{activeProfile.age} lat · Poziom {activeProfile.level}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

Dodaj trasę w `App.tsx`:

```typescript
import { SettingsPage } from './pages/SettingsPage';
// W <Routes>:
<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
```

---

## ✅ Finalna weryfikacja

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] http://localhost:5173 ładuje się
- [ ] Menu pokazuje powitanie od AI po imieniu dziecka
- [ ] Motyw tablica/zeszyt przełącza się
- [ ] Teoria, tutorial, ćwiczenia, test — wszystko działa
- [ ] Błąd → shake + czerwona kratka
- [ ] Test kończy się oceną 1–6 z gwiazdkami
- [ ] `npm run build` w obu katalogach bez błędów TypeScript

```bash
git add .
git commit -m "feat: MathKids v1.0 complete"
git push
```

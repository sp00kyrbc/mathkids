# 08-gemini-setup.md — Konfiguracja Google Gemini na GCP

## Kontekst
Gemini 1.5 Flash jest używany do personalizowanych komunikatów dla dziecka.
**WAŻNE**: Klucz API nigdy nie trafia do frontendu — tylko backend go używa.

---

## CZĘŚĆ 1 — Konfiguracja GCP (wykonaj ręcznie, nie automatycznie)

### Krok 1.1 — Włącz Gemini API w GCP Console

1. Przejdź na: https://console.cloud.google.com/
2. Wybierz swój projekt (lub stwórz nowy: `mathkids-app`)
3. W wyszukiwarce wpisz **"Generative Language API"**
4. Kliknij **"Enable"** (jeśli nie jest włączone)
5. Poczekaj ~30 sekund na aktywację

### Krok 1.2 — Utwórz klucz API

1. Przejdź do: https://console.cloud.google.com/apis/credentials
2. Kliknij **"+ CREATE CREDENTIALS"** → **"API key"**
3. Kliknij na nowo stworzony klucz → **"Restrict key"**
4. W "API restrictions" wybierz: **"Restrict key"** → zaznacz **"Generative Language API"**
5. Kliknij **"Save"**
6. Skopiuj klucz (wygląda jak: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

**ALTERNATYWA (szybsza)**: Użyj Google AI Studio
1. Przejdź na: https://aistudio.google.com/app/apikey
2. Kliknij **"Create API key"**
3. Wybierz swój projekt GCP
4. Skopiuj klucz

### Krok 1.3 — Dodaj klucz do .env

```bash
# backend/.env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## CZĘŚĆ 2 — Implementacja GeminiService (wykonaj automatycznie)

### Zaktualizuj: `backend/src/services/geminiService.ts`

Zastąp placeholder pełną implementacją:

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
    errorDescription?: string;
  };
}

// Singleton — jeden klient na cały proces
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_UZUPELNIJ_POZNIEJ') {
      throw new Error('GEMINI_API_KEY nie jest ustawiony w .env');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
      },
    });
  }
  return model;
}

// ─── SZABLONY PROMPTÓW ──────────────────────

function buildPrompt(params: AIMessageParams): string {
  const { type, childName, childAge = 9, level = 1, context } = params;

  // Dostosowanie tonu do wieku
  const ageGroup = childAge <= 8 ? 'małe dziecko (6-8 lat)' :
                   childAge <= 11 ? 'dziecko (9-11 lat)' : 'nastolatek (12-13 lat)';

  const baseContext = `
Jesteś pomocnym nauczycielem matematyki dla dzieci.
Rozmawiasz z ${ageGroup} o imieniu ${childName}, które jest na poziomie ${level}/10.
Odpowiadaj TYLKO po polsku. Maksymalnie 2 zdania.
Ton: ciepły, motywujący, dostosowany do wieku.
NIE infantylizuj starszych dzieci.
NIE używaj gwiazdek ani Markdown.
`.trim();

  const prompts: Record<AIMessageParams['type'], string> = {
    greeting: `${baseContext}
Przywitaj ${childName} na początku sesji nauki matematyki. 
Dodaj krótką zachętę do ćwiczeń.`,

    error_hint: `${baseContext}
${childName} popełniło błąd w ${context?.operation === 'addition' ? 'dodawaniu' :
  context?.operation === 'subtraction' ? 'odejmowaniu' :
  context?.operation === 'multiplication' ? 'mnożeniu' : 'dzieleniu'}.
Powiedz coś zachęcającego i zmotywuj do ponownej próby. NIE tłumacz rozwiązania.`,

    encouragement: `${baseContext}
${childName} właśnie poprawnie rozwiązało kilka zadań pod rząd!
Pochwal je konkretnie i krótko.`,

    test_result: `${baseContext}
${childName} ukończyło test z matematyki.
Wynik: ${context?.correct}/${context?.total} (ocena ${context?.grade}/6).
${context?.grade && context.grade >= 4 ? 'Powiedz coś pozytywnego i motywującego.' : 'Powiedz coś wspierającego i zachęć do dalszej nauki. NIE krytykuj.'}`,

    level_up: `${baseContext}
${childName} właśnie awansowało na poziom ${level}!
Powiedz coś entuzjastycznego i wyjątkowego dla tego osiągnięcia.`,
  };

  return prompts[type];
}

// ─── GŁÓWNA FUNKCJA ──────────────────────────

export async function getAIMessage(params: AIMessageParams): Promise<string> {
  try {
    const geminiModel = getModel();
    const prompt = buildPrompt(params);
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Sanityzacja — usuń ewentualne Markdown
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .trim();

  } catch (error: any) {
    console.error('Błąd Gemini API:', error.message);

    // Fallback — wiadomości bez AI
    return getFallbackMessage(params.type, params.childName, params.context);
  }
}

// ─── FALLBACK ────────────────────────────────

function getFallbackMessage(
  type: AIMessageParams['type'],
  name: string,
  context?: AIMessageParams['context']
): string {
  const greetings = [
    `Cześć, ${name}! Gotowy na matematykę? 🎯`,
    `Hej, ${name}! Dziś też dasz radę! 💪`,
    `Witaj, ${name}! Zaczynajmy! 🚀`,
  ];

  const encouragements = [
    `Świetna robota, ${name}! Tak trzymaj! ⭐`,
    `Niesamowite, ${name}! Jesteś nie do zatrzymania!`,
    `Brawo, ${name}! Każde zadanie przybliża Cię do mistrzostwa!`,
  ];

  const errorHints = [
    `Prawie, ${name}! Spróbuj jeszcze raz, już prawie! 💪`,
    `Dobry kierunek, ${name}! Sprawdź jeszcze raz obliczenia.`,
    `Nie poddawaj się, ${name}! Każdy błąd to lekcja!`,
  ];

  const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  switch (type) {
    case 'greeting': return random(greetings);
    case 'encouragement': return random(encouragements);
    case 'error_hint': return random(errorHints);
    case 'test_result':
      const grade = context?.grade || 3;
      if (grade >= 5) return `Wspaniały wynik, ${name}! Jesteś prawdziwym matematykiem! 🏆`;
      if (grade >= 3) return `Dobra robota, ${name}! Warto ćwiczyć dalej! ⭐`;
      return `Nie poddawaj się, ${name}! Każdy ćwiczyć daje postęp! 💪`;
    case 'level_up': return `WOW, ${name}! Poziom ${context?.grade || ''}! Jesteś niesamowity! 🚀`;
    default: return `Dobra robota, ${name}!`;
  }
}
```

---

## CZĘŚĆ 3 — Weryfikacja integracji

### Test 1: Sprawdź czy klucz działa

```bash
cd backend
# Uruchom backend:
npm run dev

# W nowym terminalu:
curl -X POST http://localhost:3001/api/ai/message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "greeting",
    "childName": "Kacper",
    "childAge": 9,
    "level": 2
  }'
```

Oczekiwany wynik: `{ "message": "Cześć, Kacper! ..." }` (po polsku, 1-2 zdania)

### Test 2: Test_result z oceną

```bash
curl -X POST http://localhost:3001/api/ai/message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_result",
    "childName": "Zosia",
    "childAge": 10,
    "level": 3,
    "context": { "grade": 5, "correct": 9, "total": 10 }
  }'
```

---

## CZĘŚĆ 4 — Integracja powitania w aplikacji

### Zaktualizuj `frontend/src/pages/MenuPage.tsx`

Dodaj powitanie AI przy wejściu na stronę:

```typescript
import { useState, useEffect } from 'react';

// Wewnątrz komponentu MenuPage:
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
    .catch(() => setGreeting(`Cześć, ${activeProfile.name}! Co robimy dziś?`));
}, [activeProfile?.id]);

// W JSX zamień hardkodowany tekst:
// Zamiast: "Cześć, {activeProfile?.name}! Co robimy?"
// Pokaż: {greeting || `Cześć, ${activeProfile?.name}!`}
```

---

## CZĘŚĆ 5 — Ustawienia (opcjonalne)

### Utwórz: `frontend/src/pages/SettingsPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

        {/* Motyw */}
        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.theme}</h3>
          <div className="flex gap-3">
            {(['chalk', 'notebook'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  activeProfile.theme === t
                    ? t === 'chalk'
                      ? 'bg-chalk-bg text-chalk-accent border-2 border-chalk-accent'
                      : 'bg-notebook-bg text-notebook-text border-2 border-notebook-text'
                    : `${classes.buttonSecondary}`
                }`}
              >
                {t === 'chalk' ? '🖊️ Tablica' : '📓 Zeszyt'}
              </button>
            ))}
          </div>
        </div>

        {/* Tryb podpowiedzi */}
        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.feedbackMode}</h3>
          <div className="space-y-2">
            {(['immediate', 'after'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFeedbackMode(mode)}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                  activeProfile.feedbackMode === mode ? classes.button : classes.buttonSecondary
                }`}
              >
                <span>{mode === 'immediate' ? '⚡' : '🎭'}</span>
                <div>
                  <div className="font-bold text-sm">
                    {mode === 'immediate' ? pl.settings.feedbackImmediate : pl.settings.feedbackAfter}
                  </div>
                  <div className="text-xs opacity-70">
                    {mode === 'immediate' ? 'Błąd zaznaczany natychmiast' : 'Poprawne rozwiązanie po ukończeniu'}
                  </div>
                </div>
                {activeProfile.feedbackMode === mode && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Info o profilu */}
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

### Dodaj trasę w App.tsx:

```typescript
import { SettingsPage } from './pages/SettingsPage';
// W <Routes>:
<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
```

---

## ✅ Finalna weryfikacja całej aplikacji

Po wykonaniu wszystkich 8 plików sprawdź:

### Backend:
```bash
cd backend && npm run dev
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"addition","max_digits1":3,"max_digits2":2}'
curl -X POST http://localhost:3001/api/ai/message \
  -H "Content-Type: application/json" \
  -d '{"type":"greeting","childName":"Test","childAge":9,"level":1}'
```

### Frontend:
```bash
cd frontend && npm run dev
```

### Checklist funkcjonalny:
- [ ] Można stworzyć profil z imieniem i avatarem
- [ ] Menu pokazuje spersonalizowane powitanie od AI
- [ ] Motyw tablica/zeszyt przełącza się natychmiastowo
- [ ] Teoria wyjaśnia algorytm krok po kroku dla każdej operacji
- [ ] Tutorial pokazuje kroki z podpowiedziami
- [ ] Ćwiczenia generują zadania z backendu
- [ ] Błędna cyfra → natychmiastowe czerwone zaznaczenie + animacja shake
- [ ] Test kończy się oceną 1–6 z gwiazdkami
- [ ] Ocena testowa generuje komunikat AI po imieniu
- [ ] XP jest dodawane i pasek postępu się aktualizuje
- [ ] Odznaki można zdobywać i są widoczne na stronie statystyk
- [ ] Awans na nowy poziom pokazuje animację
- [ ] Ustawienia pozwalają zmienić motyw i tryb podpowiedzi
- [ ] TypeScript nie ma błędów (`npm run build` w obu katalogach)

### Commit:
```bash
git add .
git commit -m "feat: complete MathKids v1.0 — działania pisemne z AI"
```

---

## 🔮 Co dalej (v2 — nie implementuj teraz)

- [ ] Firebase Authentication + Firestore (zastąpi localStorage)
- [ ] Wiele języków (i18n)
- [ ] Aplikacja mobilna Swift (iOS) + Kotlin (Android)
- [ ] Tryb offline (PWA / Service Worker)
- [ ] Raporty dla rodziców
- [ ] Więcej motywów wizualnych
- [ ] Leaderboard klasowy (Firebase)
- [ ] Dźwięki i efekty audio (Web Audio API)

# CLAUDE.md — Projekt: MathKids "Matematyka Pod Kreską"

## 🎯 Cel projektu
Aplikacja webowa ucząca dzieci (6–13 lat) działań pisemnych (dodawanie, odejmowanie, mnożenie, dzielenie pod kreską / w słupku). Aplikacja ma być angażująca, motywująca i skutecznie uczyć algorytmów pisemnych krok po kroku.

## 👨‍💻 Właściciel projektu
Vibekoder — nie programuje samodzielnie. Wszystkie decyzje techniczne podejmuje Claude Code na podstawie plików `.md` w katalogu `/docs`. Właściciel zatwierdza efekty wizualnie i funkcjonalnie.

---

## 🗂️ Struktura projektu

```
mathkids/
├── CLAUDE.md                   ← Ten plik (czytaj zawsze jako pierwszy)
├── docs/                       ← Pliki implementacyjne dla Claude Code
│   ├── 01-setup.md
│   ├── 02-arithmetic-engine.md
│   ├── 03-backend-api.md
│   ├── 04-frontend-shell.md
│   ├── 05-exercise-component.md
│   ├── 06-learning-flow.md
│   ├── 07-gamification.md
│   └── 08-gemini-setup.md
├── backend/                    ← Node.js + Express (TypeScript)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── python/             ← Python microservice
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   ← React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/              ← Zustand state management
│   │   ├── themes/
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## 🛠️ Stack technologiczny

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (utility-first styling)
- **Framer Motion** (animacje, nagrody, przejścia)
- **Zustand** (state management — profile, postęp, ustawienia)
- **React Router v6** (routing)
- **Lottie React** (animacje nagród — konfetti, gwiazdki)

### Backend
- **Node.js 20+** + **Express** + **TypeScript**
- **Python 3.11+** (silnik arytmetyczny — generowanie kroków, walidacja)
- Komunikacja backend↔Python przez `child_process` (spawn)

### AI
- **Google Gemini 1.5 Flash** przez `@google/generative-ai` SDK
- Używany do: personalizowanych komunikatów, wyjaśnień błędów, motywacji po imieniu

### Przechowywanie danych
- **localStorage** (v1) — profile dzieci, postępy, ustawienia
- Struktura przygotowana pod **Firebase** (v2) — nie implementować teraz, ale kod pisać z warstwą abstrakcji (`storageService`)

---

## 👤 Profile użytkowników
- Wiele profili na jednym urządzeniu
- Każdy profil: imię, avatar (wybór z zestawu emoji/ilustracji), wiek, poziom
- Profil przechowywany w localStorage pod kluczem `mathkids_profiles`
- Przy starcie app → ekran wyboru profilu lub tworzenia nowego

---

## 🎨 Motywy wizualne (WAŻNE — oba od początku)

### Theme 1: "Tablica" (domyślny)
- Tło: głęboka zieleń `#1a4a2e` z teksturą tablicy (CSS noise filter)
- Tekst: biały z efektem kredy (font: **Caveat** lub **Schoolbell** z Google Fonts)
- Kratki: linie kredą, nieregularne (CSS `border` z opacity)
- Cyfry: białe z lekkim rozmazaniem (chalk effect przez `text-shadow`)
- Akcenty: żółty `#ffd700` (jak żółta kreda)

### Theme 2: "Zeszyt" (kartka w kratkę)
- Tło: kremowy `#fdf6e3` z siatką kratek (CSS `repeating-linear-gradient`)
- Tekst: granatowy `#1a237e` (jak atrament)
- Font: **Patrick Hand** lub **Architects Daughter** (Google Fonts)
- Linie: jasnoniebieski `#b3c5e8` (jak w zeszycie)
- Akcenty: czerwony `#c62828` (jak długopis nauczyciela)

### Przełącznik tematów
- Widoczny zawsze w prawym górnym rogu
- Zapisywany w profilu użytkownika
- Płynne przejście (Framer Motion 300ms)

---

## 📚 Tryby nauki (KLUCZOWE)

### 1. TEORIA ("Jak to działa?")
- Animowane wyjaśnienie algorytmu krok po kroku
- Każdy krok ma narrację tekstową (+ opcjonalnie głos przez Web Speech API)
- Przykład z konkretnymi liczbami, animowany
- Dziecko tylko obserwuje i może klikać "Dalej"

### 2. TUTORIAL ("Zróbmy razem")
- Zadanie krok po kroku z pełnymi wskazówkami
- Po każdym kroku: feedback i wyjaśnienie "Dlaczego tak?"
- Błąd → natychmiastowa korekta z wyjaśnieniem (Gemini generuje komunikat)
- Nie można przejść dalej bez poprawnego wypełnienia kroku

### 3. ĆWICZENIA ("Twoja kolej")
- Pełne zadania bez wskazówek krok po kroku
- Opcja A (default): błąd zaznaczany natychmiast na czerwono
- Opcja B: pokazanie poprawnego rozwiązania po ukończeniu
- Dziecko wybiera opcję w ustawieniach profilu

### 4. TEST ("Sprawdź się")
- 5–10 zadań (konfigurowalne)
- Brak podpowiedzi, brak natychmiastowego feedbacku
- Na końcu: ocena szkolna 1–6 + szczegółowe omówienie
- Algorytm oceniania:
  - 100% = 6
  - 90–99% = 5
  - 75–89% = 4
  - 60–74% = 3
  - 40–59% = 2
  - 0–39% = 1

---

## ➗ Działania matematyczne

### Obsługiwane operacje
1. **Dodawanie** (liczby 1–6 cyfrowe, konfigurowalne)
2. **Odejmowanie** (liczby 1–6 cyfrowe, wynik ≥ 0)
3. **Mnożenie** (czynniki 1–4 cyfrowe × 1–2 cyfrowe)
4. **Dzielenie** (dzielna 2–6 cyfrowa, dzielnik 1–2 cyfrowy, wynik całkowity)

### Konfiguracja przez dziecko
- Wybór operacji (można zaznaczyć kilka)
- Maksymalna liczba cyfr każdego składnika osobno
- Poziom trudności wpływa na zakres liczb

---

## 🎮 Grywalizacja

### System punktów (XP)
- Poprawna odpowiedź: 10 XP
- Poprawna za pierwszym razem: 15 XP
- Seria (streak): bonus +5 XP za każde kolejne
- Ukończony test: 50 XP base × mnożnik oceny

### Odznaki (Achievements)
- "Pierwsza piątka" — 5 poprawnych pod rząd
- "Mistrz dodawania" — 50 poprawnych zadań z dodawania
- Itd. (pełna lista w `07-gamification.md`)

### Poziomy
- 10 poziomów (1–10), każdy wymaga rosnącej liczby XP
- Awans poziomu → duża animacja + komunikat od Gemini po imieniu

### Streak dzienny
- Licznik dni z rzędu korzystania z aplikacji
- Wizualna seria płomieni 🔥

---

## 🤖 Gemini — zasady użycia

- Model: `gemini-1.5-flash` (szybki, tani)
- API Key: w pliku `.env` jako `GEMINI_API_KEY`
- Używany TYLKO przez backend (nigdy bezpośrednio z frontend)
- Endpoint: `POST /api/ai/message`

### Kiedy używać Gemini
1. Powitanie dziecka po imieniu na start sesji
2. Komunikat po błędzie (zamiast sztywnego tekstu)
3. Pochwała po ukończonym teście
4. Wyjaśnienie błędu po teście
5. Komunikat po awansie na nowy poziom

### System promptów — zasady
- Zawsze wstrzykuj: imię dziecka, wiek, aktualny poziom
- Odpowiedzi: max 2 zdania, język dostosowany do wieku
- Ton: ciepły, motywujący, bez infantylizowania starszych dzieci
- Nigdy nie krytykuj — tylko motywuj i tłumacz

---

## 🌍 Język
- **Polski** (v1)
- Wszystkie teksty w plikach `src/i18n/pl.ts` (przygotowane pod i18n v2)
- Nie używaj hardkodowanych polskich tekstów w komponentach

---

## 🔒 Zmienne środowiskowe

```env
# backend/.env
GEMINI_API_KEY=your_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```env
# frontend/.env
VITE_API_URL=http://localhost:3001
```

---

## 📋 Zasady kodowania

1. **TypeScript wszędzie** — brak `any`, strict mode
2. **Komponenty funkcyjne** — tylko React hooks
3. **Nazewnictwo**: komponenty PascalCase, funkcje camelCase, pliki kebab-case
4. **Komentarze po polsku** tam gdzie logika nie jest oczywista
5. **Walidacja na backendzie** — frontend tylko wyświetla, backend liczy i weryfikuje
6. **storageService** — cała logika localStorage przez jeden serwis (przygotowane pod Firebase)
7. **Obsługa błędów** — każdy fetch ma try/catch, UI pokazuje przyjazny komunikat

---

## 🚀 Uruchomienie lokalne

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

App dostępna na: http://localhost:5173
API dostępne na: http://localhost:3001

---

## 📌 Kolejność implementacji (czytaj docs/ po kolei)

1. `docs/01-setup.md` — struktura projektu, git, zależności
2. `docs/02-arithmetic-engine.md` — Python: silnik obliczeń
3. `docs/03-backend-api.md` — Node.js API
4. `docs/04-frontend-shell.md` — React shell, profile, tematy
5. `docs/05-exercise-component.md` — Komponent kratki/tablicy
6. `docs/06-learning-flow.md` — Tryby nauki
7. `docs/07-gamification.md` — Nagrody i motywacja
8. `docs/08-gemini-setup.md` — Konfiguracja Gemini + integracja

**WAŻNE**: Przeczytaj CLAUDE.md przed każdym plikiem. Każdy plik docs/ buduje na poprzednim — nie pomijaj kolejności.

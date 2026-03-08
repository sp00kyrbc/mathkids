# 01-setup.md — Inicjalizacja projektu MathKids

## Przeczytaj najpierw
Przeczytaj `CLAUDE.md` zanim zaczniesz. Ten plik tworzy całą strukturę projektu od zera.

---

## Krok 1 — Inicjalizacja repozytorium Git

```bash
mkdir mathkids
cd mathkids
git init
```

---

## Krok 2 — Utwórz strukturę katalogów

```bash
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/src/python
mkdir -p backend/src/middleware
mkdir -p docs
```

---

## Krok 3 — Backend: Node.js + TypeScript

```bash
cd backend
npm init -y
npm install express cors dotenv @google/generative-ai
npm install -D typescript ts-node nodemon @types/express @types/cors @types/node
npx tsc --init
```

### backend/tsconfig.json — nadpisz wygenerowany plik:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### backend/package.json — dodaj scripts:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## Krok 4 — Frontend: React + Vite + TypeScript

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom framer-motion zustand @lottiefiles/react-lottie-player
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### frontend/tailwind.config.ts:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        chalk: ['Caveat', 'cursive'],
        notebook: ['Patrick Hand', 'cursive'],
      },
      colors: {
        // Theme: Tablica
        chalk: {
          bg: '#1a4a2e',
          bgLight: '#235c38',
          text: '#f0f0f0',
          accent: '#ffd700',
          line: 'rgba(255,255,255,0.25)',
          error: '#ff6b6b',
          success: '#69db7c',
        },
        // Theme: Zeszyt
        notebook: {
          bg: '#fdf6e3',
          bgDark: '#f0e9d2',
          text: '#1a237e',
          accent: '#c62828',
          line: '#b3c5e8',
          error: '#c62828',
          success: '#2e7d32',
        },
      },
      backgroundImage: {
        'notebook-grid': `
          repeating-linear-gradient(
            #b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 100%
          ),
          repeating-linear-gradient(
            90deg, #b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 100%
          )
        `,
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      animation: {
        'chalk-write': 'chalkWrite 0.3s ease-in',
        'star-pop': 'starPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'shake': 'shake 0.4s ease-in-out',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        chalkWrite: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        starPop: {
          '0%': { transform: 'scale(0) rotate(0deg)' },
          '100%': { transform: 'scale(1) rotate(15deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### frontend/index.html — dodaj Google Fonts w `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&family=Schoolbell&family=Architects+Daughter&display=swap" rel="stylesheet">
```

---

## Krok 5 — Pliki środowiskowe

### backend/.env (utwórz plik, nie commituj do git):
```
GEMINI_API_KEY=PLACEHOLDER_UZUPELNIJ_POZNIEJ
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### frontend/.env:
```
VITE_API_URL=http://localhost:3001
```

### .gitignore (w root projektu):
```
# Node
node_modules/
dist/
build/

# Env
.env
.env.local
.env.*.local

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Logi
*.log
npm-debug.log*
```

---

## Krok 6 — Weryfikacja Python

```bash
python3 --version  # Musi być 3.11+
pip3 install --version
```

Jeśli Python nie jest zainstalowany — zainstaluj z python.org.

---

## Krok 7 — Plik README.md (root projektu)

```markdown
# 🔢 MathKids — Matematyka Pod Kreską

Aplikacja webowa ucząca dzieci (6–13 lat) działań pisemnych.

## Uruchomienie

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Aplikacja: http://localhost:5173
API: http://localhost:3001

## Konfiguracja
1. Skopiuj `backend/.env.example` do `backend/.env`
2. Uzupełnij `GEMINI_API_KEY` (patrz docs/08-gemini-setup.md)
```

---

## Krok 8 — Pierwszy commit

```bash
cd ..  # do root mathkids/
git add .
git commit -m "feat: initial project structure"
```

---

## ✅ Weryfikacja po tym kroku

Po wykonaniu tego pliku sprawdź:
- [ ] `backend/` ma `node_modules/`, `src/`, `tsconfig.json`, `package.json`
- [ ] `frontend/` ma `node_modules/`, `src/`, `tailwind.config.ts`
- [ ] Oba `.env` istnieją (nie są w git)
- [ ] `git log` pokazuje pierwszy commit

Następny krok: `docs/02-arithmetic-engine.md`

---
name: create-project
description: Scaffold a new React + Vite project following the org's conventions. Sets up folder structure, Tailwind, TanStack Query, React Context pattern, Vitest, ESLint, and a conventions-aligned CLAUDE.md. Use whenever a new project, app, or repo needs to be scaffolded from scratch — don't hand-roll a Vite setup.
---

# Create Project

Scaffolds a new React + Vite project following the org's conventions as defined in `docs/conventions.md`.

## When to use this skill

Use when the user wants to start a new React project from scratch. This is for greenfield projects — not for adding features to an existing codebase.

If the user says "add Supabase" or "connect to a database", that is a separate step done after the project is approved — see the Supabase section at the end.

---

## Step 1 — Get the project name

Ask the user: **"What should the project be called?"**

The name becomes the folder name (kebab-case) and the `name` field in `package.json`. If the user gives you a name with spaces or capitals, convert it to kebab-case (e.g. "My New App" → `my-new-app`).

Also confirm **where** to create the project. Default to the current working directory unless the user specifies otherwise.

---

## Step 2 — Scaffold with Vite

```bash
npm create vite@latest <project-name> -- --template react
cd <project-name>
npm install
```

---

## Step 3 — Install dependencies

```bash
npm install react-router-dom @tanstack/react-query
npm install -D tailwindcss @tailwindcss/vite vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

---

## Step 4 — Configure vite.config.js

Replace the generated `vite.config.js` entirely:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
})
```

---

## Step 5 — Create the folder structure

Create these directories (add a `.gitkeep` to empty ones so they are committed):

```
src/
  assets/
  components/
  contexts/
  features/
  layouts/
  lib/
  pages/
  router/
  tests/
    setup.js
```

```bash
mkdir -p src/assets src/components src/contexts src/features src/layouts src/lib src/pages src/router src/tests
touch src/assets/.gitkeep src/components/.gitkeep src/lib/.gitkeep
```

Create `src/tests/setup.js`:

```js
import '@testing-library/jest-dom'
```

---

## Step 6 — Replace src/index.css

Delete the Vite default CSS and write:

```css
@import "tailwindcss";

:root {
  --bg: #F4F8FF;
  --surface: #FFFFFF;
  --text: #0F1D3B;
  --accent: #0B3A86;
  --border: #D1DCF0;
  --radius: 8px;
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
```

---

## Step 7 — Create boilerplate files

### src/main.jsx

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import AppRouter from './router/AppRouter'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
```

### src/router/AppRouter.jsx

```jsx
import { Routes, Route } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import HomePage from '../pages/HomePage'

export default function AppRouter() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </AppLayout>
  )
}
```

### src/layouts/AppLayout.jsx

```jsx
export default function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>App</span>
      </header>
      <main style={{ padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
```

### src/pages/HomePage.jsx

```jsx
export default function HomePage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Home</h1>
      <p style={{ color: 'var(--text)' }}>Your project is ready.</p>
    </div>
  )
}
```

### Delete src/App.jsx and src/App.css

These Vite defaults are not used.

```bash
rm src/App.jsx src/App.css
```

---

## Step 8 — Configure ESLint

Replace `eslint.config.js`:

```js
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
]
```

---

## Step 9 — Update package.json scripts

Make sure `package.json` has these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest"
  }
}
```

---

## Step 10 — Create .env.example

```bash
# .env.example — copy to .env.local and fill in values
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

Add `.env.local` to `.gitignore` if it is not already there.

---

## Step 11 — Write CLAUDE.md into the new project

Create a `CLAUDE.md` at the project root. This tells Claude Code how the project is structured on future sessions.

```markdown
# CLAUDE.md

## Commands

\`\`\`bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest
\`\`\`

## Stack

- React 19 + Vite
- React Router v7 (client-side routing)
- TanStack Query (data fetching, caching)
- Tailwind CSS v4 (utilities) + CSS variables (theming)
- Vitest + React Testing Library (tests in src/tests/)

## Conventions

Follow the org conventions documented at:
`docs/conventions.md` in the flow_force repo

Key rules:
- All components are functional, default export, PascalCase filename
- Form state is a single object: \`setForm(f => ({ ...f, [key]: val }))\`
- Shared state via React Context — one context per domain concern
- Data fetching via TanStack Query — never raw fetch/useEffect for server data
- Styles: CSS variables for tokens, inline styles for dynamic values
- Tests live in \`src/tests/\` mirroring \`src/\`

## Structure

\`\`\`
src/
  pages/       ← thin route wrappers
  features/    ← domain components and logic
  components/  ← shared generic UI
  contexts/    ← React Context providers
  layouts/     ← AppLayout, Sidebar, TopBar
  router/      ← AppRouter.jsx
  lib/         ← third-party client setup
  tests/       ← Vitest tests
\`\`\`

## Adding Supabase (post-POC approval)

\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

Create \`src/lib/platformClient.js\`:

\`\`\`js
import { createClient } from '@supabase/supabase-js'
export const platform = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
\`\`\`

Add to \`.env.local\`:
\`\`\`
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
\`\`\`
```

---

## Step 12 — Verify

```bash
npm run dev
```

Confirm the dev server starts without errors, the browser shows the home page, and `npm run lint` passes clean.

---

## Adding Supabase later

When the client approves and a Supabase project exists, follow the steps in the CLAUDE.md that was written into the project (Step 11). The short version:

1. `npm install @supabase/supabase-js`
2. Create `src/lib/platformClient.js` with the client singleton
3. Add credentials to `.env.local`
4. Wrap providers in `main.jsx` if adding auth (add `AuthProvider` inside `QueryClientProvider`)

Do not create a second Supabase client. All imports go through `@/lib/platformClient`.

---

## Checklist before handing off

- [ ] Dev server starts (`npm run dev`)
- [ ] No lint errors (`npm run lint`)
- [ ] Vitest runs (`npm run test` — passes with 0 tests, no errors)
- [ ] `src/tests/` directory exists and is committed
- [ ] `CLAUDE.md` is in the project root
- [ ] `.env.example` is committed, `.env.local` is gitignored
- [ ] `App.jsx` and `App.css` are deleted

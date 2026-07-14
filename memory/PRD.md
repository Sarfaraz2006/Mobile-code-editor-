# CodeCraft Mobile — Product Requirements Document

## Vision
A mobile-first, VS Code-equivalent code editor for phones. Write, edit, run, and manage entire projects with real IDE power — no compromises for being on mobile.

## Target Platforms
- Expo React Native (iOS + Android via Expo Go / native builds)
- Web preview via iframe fallback

## Core Features (Shipped in v1 + v2)

### Editor
- **CodeMirror-powered editor** (WebView on native, iframe on web) with syntax highlighting for 20+ languages (JS/TS, Python, HTML, CSS, JSON, MD, YAML, Shell, C/C++, Java, Go, Rust, Ruby, PHP, SQL, JSX)
- Line numbers, bracket matching, auto-close brackets, active-line highlight, code folding (gutter), soft wrap
- **Configurable font size** (10–26 px) persisted in AsyncStorage
- Toggle line comment, fold all / unfold all, select all, undo / redo — all via command palette

### Multi-tab & Files
- **Multi-tab editing** with dirty indicator, horizontal scrollable tab bar
- **File Explorer drawer** — tree view, create file, create folder, rename (long-press), delete with confirmation
- **Persistent local storage** — virtual FS backed by AsyncStorage (`cc.fs.v1`); files survive restarts
- **Search across files** — client-side across all workspace files, case-sensitive toggle, line-level match preview

### Execution & Terminal
- **Run Python 3 & JavaScript (Node)** — `/api/run` with 15-second timeout, exit code + duration
- **Interactive Terminal** — real bash execution via `/api/terminal/exec` with per-session tempdir; supports `ls`, `pip install`, `curl`, `git`, `npm`, etc. Command history (↑/↓), session reset, clear.
- Dangerous commands (rm -rf /, fork bomb, mkfs, dd) blocked at the API boundary

### Import
- **GitHub Import** — paste any public repo URL, imports all text files (up to 300 files × 512 KB each), respects sub-paths (`/tree/branch/path`)
- **Device File Picker** — import any file from the phone's local storage via `expo-document-picker`

### Formatting
- **Format Document** — Prettier (JS/TS/JSX/TSX/JSON/CSS/SCSS/HTML/MD/YAML) + Black (Python)
- Format button in top bar

### Preview
- **Live Markdown Preview** — renders `.md` via `marked` in a sandboxed iframe/WebView, themed to match editor
- **Live HTML Preview** — renders `.html` (inline scripts stripped for safety)
- Preview icon in top bar auto-appears only for supported file types

### Command Palette
- Cmd-Shift-P style palette with fuzzy filter
- 16 built-in commands + dynamic entries for every open tab and file in workspace
- Save, Save All, Find, Replace, Go to line, Format, Fold/Unfold, Toggle Comment, Theme, Terminal, Explorer, Search, Snippets, GitHub Import, Preview, Settings

### Snippets
- Built-in library (14 snippets across JS, Python, HTML, Markdown, JSON)
- Insert into active editor on tap

### Keyboard Toolbar
- Sticky quick-key row appears above the software keyboard
- 31 quick keys: `Tab`, `{}`, `()`, `[]`, `<>`, `=`, `;`, `:`, `.`, `,`, `'`, `"`, backtick, `|`, `&`, `!`, `?`, `$`, `#`, `@`, `*`, `+`, `-`, `/`, `\`, `^`, `_`

### Settings
- Dark / Light theme (VS Code Dark+ and Light variants)
- Editor font size chip selector
- Quick actions: GitHub import, Terminal, Command Palette

### Backup (server-side)
- `POST /api/backup` + `GET /api/backup/{device_id}` — Mongo-backed per-device file backup with upsert on (device_id, path)

## Non-Goals (still)
- Multi-cursor edit UX (CodeMirror supports it but no touch UI yet)
- Git integration (init/add/commit/push) — user can shell out via Terminal
- Real-time collaboration
- AI code assistant (planned next: Claude Sonnet 4.5 via Emergent LLM key)

## Backend
- FastAPI @ `:8001` with `/api` prefix
- `POST /api/run` — Python / Node subprocess (15s timeout)
- `POST /api/terminal/exec` + `POST /api/terminal/reset` — persistent bash sessions
- `POST /api/github/import` — clone public GitHub repos as text files
- `POST /api/format` — Prettier + Black formatter
- `GET /api/languages` — supported executable languages
- `POST /api/backup` + `GET /api/backup/{device_id}` — Mongo file backup

## Frontend Architecture
- Expo Router (`app/index.tsx`)
- Global state via React Context (`src/context/AppContext.tsx`)
- Storage via `@/src/utils/storage`
- Icons from `@expo/vector-icons` (Feather)
- Safe areas via `react-native-safe-area-context`
- CodeMirror 5 loaded from CDN into WebView / iframe

## Seeded Files
- `welcome.md`, `hello.py`, `hello.js`

## Test Coverage
- **Backend: 24/24 pytest passing** (13 new + 11 regression from v1)
- **Frontend: E2E passing** — empty state, explorer, run code, theme, multi-tab, command palette, snippets, terminal, GitHub import, search, settings, preview (markdown), format button — all verified

## Future Enhancements
1. AI code assistant (Claude Sonnet 4.5 via Emergent LLM key)
2. Git basic operations UI (init / status / commit / push panel)
3. Multi-cursor touch UX
4. Zip export/download entire project
5. Custom themes / color picker
6. Language server integration (autocomplete)
7. Snippet author custom UI (create your own)
8. Font family picker (JetBrains Mono, Fira Code, etc.)

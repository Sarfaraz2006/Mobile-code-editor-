# CodeCraft Mobile — Product Requirements Document

## Vision
A mobile-first, VS Code style code editor for phones. Users can write, edit, and run code on their device with a real IDE feel — no more toy editors.

## Target Platforms
- Expo React Native (iOS + Android via Expo Go)
- Web preview via iframe fallback

## Core Features (MVP — shipped)
1. **CodeMirror-powered editor** inside a WebView (native) / iframe (web)
   - Real syntax highlighting for 20+ languages (JS, TS, Python, HTML, CSS, JSON, MD, YAML, Shell, C/C++, Java, Go, Rust, Ruby, PHP, SQL, JSX)
   - Line numbers, bracket matching, auto-close brackets, active line highlight, soft wrap
   - Mobile-friendly touch input
2. **Multi-tab editing** — open many files at once with horizontal scrollable tabs; dirty indicator (•) on unsaved changes; per-tab close button
3. **File Explorer drawer** — slide-in left panel
   - Tree view with expandable folders
   - Create file, create folder, rename (long-press), delete (trash icon) with confirmation
4. **Persistent local storage** — virtual FS backed by AsyncStorage (`cc.fs.v1` key), survives app restarts, works on both native and web
5. **Code execution** — Python 3 and JavaScript (Node) via backend `POST /api/run`
   - 10-second timeout, stdout/stderr captured, exit code and duration reported
6. **Terminal / Output panel** — collapsible bottom drawer showing execution results with running pill, clear + close controls
7. **Dark + Light themes** — VS Code Dark+ and VS Code Light variants, toggled via sun/moon icon in top bar; choice persisted in AsyncStorage
8. **Cloud backup endpoints** — `POST /api/backup` + `GET /api/backup/{device_id}` (Mongo upsert on device_id + path) for future sync

## Non-Goals (v1)
- Terminal with interactive stdin
- Multi-cursor / advanced IDE features (definition jump, etc.)
- Git integration
- Real-time collaboration
- AI code assistant (user said: "later")

## Backend
- FastAPI at `:8001` with `/api` prefix
- `POST /api/run` — subprocess exec with timeout for Python/Node
- `POST /api/backup`, `GET /api/backup/{device_id}` — Mongo-backed backup
- `GET /api/languages` — list of runnable languages

## Frontend Architecture
- Expo Router (`app/index.tsx` as the main screen)
- Global state via React Context (`src/context/AppContext.tsx`)
- Storage via `@/src/utils/storage` (AsyncStorage wrapper)
- Icons from `@expo/vector-icons` (Feather)
- Safe areas via `react-native-safe-area-context`
- CodeMirror 5 loaded from CDN into WebView / iframe

## Seeded Files
- `welcome.md` — feature intro
- `hello.py` — Python starter with `print` + `range`
- `hello.js` — JS starter with `console.log` + array reduce

## Test Coverage
- Backend: 11/11 pytest passing (see `/app/backend/tests/test_code_editor_api.py`)
- Frontend: full end-to-end validation via testing agent (empty state, explorer, open file, run code, theme toggle, multi-tab, new-file creation)

## Future Enhancements
1. AI code assistant (Claude Sonnet 4.5 via Emergent LLM key) — autocomplete, explain, fix
2. Find & Replace within file (CodeMirror addon is already loaded — just wire a UI trigger)
3. Import from GitHub / device file picker
4. Custom themes / font size setting
5. Snippet library / template gallery
6. Shareable "playground" links via cloud backup

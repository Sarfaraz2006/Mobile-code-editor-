// Cross-platform virtual file system backed by AsyncStorage.
// Files live under a single JSON blob key so we can atomically manage the tree
// on every platform (native + web). This matches the user's request that
// "all files stay on the device".
import { storage } from "@/src/utils/storage";

const FS_KEY = "cc.fs.v1";

export interface FileNode {
  name: string;
  path: string; // relative, no leading slash, e.g. "src/index.js"
  isDirectory: boolean;
  children?: FileNode[];
}

interface FsEntry {
  content?: string; // undefined for directories
  isDirectory: boolean;
  updatedAt: number;
}

type FsMap = Record<string, FsEntry>;

let cache: FsMap | null = null;

async function readAll(): Promise<FsMap> {
  if (cache) return cache;
  const raw = await storage.getItem<string>(FS_KEY, "");
  if (raw && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as FsMap;
      cache = parsed;
      return parsed;
    } catch {}
  }
  cache = {};
  return cache;
}

async function writeAll(map: FsMap) {
  cache = map;
  // AsyncStorage keys are limited; store as JSON string.
  await storage.setItem(FS_KEY, JSON.stringify(map));
}

function normalize(p: string) {
  return p.replace(/^\/+|\/+$/g, "");
}

function parentOf(p: string) {
  const clean = normalize(p);
  const i = clean.lastIndexOf("/");
  return i === -1 ? "" : clean.slice(0, i);
}

function nameOf(p: string) {
  const clean = normalize(p);
  const i = clean.lastIndexOf("/");
  return i === -1 ? clean : clean.slice(i + 1);
}

async function ensureParentDirs(path: string) {
  const map = await readAll();
  const parts = normalize(path).split("/").slice(0, -1);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (!map[acc]) {
      map[acc] = { isDirectory: true, updatedAt: Date.now() };
    }
  }
  await writeAll(map);
}

async function seedIfEmpty() {
  const map = await readAll();
  if (Object.keys(map).length === 0) {
    map["welcome.md"] = {
      content: SEED_WELCOME,
      isDirectory: false,
      updatedAt: Date.now(),
    };
    map["hello.py"] = {
      content: SEED_PYTHON,
      isDirectory: false,
      updatedAt: Date.now(),
    };
    map["hello.js"] = {
      content: SEED_JS,
      isDirectory: false,
      updatedAt: Date.now(),
    };
    map["demo_portfolio.html"] = {
      content: SEED_PORTFOLIO,
      isDirectory: false,
      updatedAt: Date.now(),
    };
    await writeAll(map);
  }
}

export async function initWorkspace() {
  await seedIfEmpty();
  const map = await readAll();
  if (!map["demo_portfolio.html"]) {
    map["demo_portfolio.html"] = {
      content: SEED_PORTFOLIO,
      isDirectory: false,
      updatedAt: Date.now(),
    };
    await writeAll(map);
  }
}

export async function listWorkspace(): Promise<FileNode[]> {
  const map = await readAll();
  // Build a tree from all paths.
  const root: FileNode[] = [];
  const dirs: Record<string, FileNode> = {};

  const paths = Object.keys(map).sort();
  for (const p of paths) {
    const entry = map[p];
    const node: FileNode = {
      name: nameOf(p),
      path: p,
      isDirectory: entry.isDirectory,
      children: entry.isDirectory ? [] : undefined,
    };
    if (entry.isDirectory) dirs[p] = node;
    const parent = parentOf(p);
    if (!parent) {
      root.push(node);
    } else {
      const parentNode = dirs[parent];
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        // Orphan (parent missing) — attach to root
        root.push(node);
      }
    }
  }

  const sorter = (a: FileNode, b: FileNode) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  };
  const walk = (nodes: FileNode[]) => {
    nodes.sort(sorter);
    for (const n of nodes) if (n.children) walk(n.children);
  };
  walk(root);
  return root;
}

export async function readFile(path: string): Promise<string> {
  const map = await readAll();
  const e = map[normalize(path)];
  if (!e) throw new Error("File not found: " + path);
  if (e.isDirectory) throw new Error("Path is a directory: " + path);
  return e.content ?? "";
}

export async function writeFile(path: string, content: string) {
  const clean = normalize(path);
  await ensureParentDirs(clean);
  const map = await readAll();
  map[clean] = {
    content,
    isDirectory: false,
    updatedAt: Date.now(),
  };
  await writeAll(map);
}

export async function createFile(path: string, initial = "") {
  const clean = normalize(path);
  const map = await readAll();
  if (map[clean]) throw new Error("Already exists: " + path);
  await writeFile(clean, initial);
}

export async function createFolder(path: string) {
  const clean = normalize(path);
  await ensureParentDirs(clean + "/_"); // ensure ancestors
  const map = await readAll();
  if (map[clean] && !map[clean].isDirectory) {
    throw new Error("A file exists at that path: " + path);
  }
  map[clean] = { isDirectory: true, updatedAt: Date.now() };
  await writeAll(map);
}

export async function deleteEntry(path: string) {
  const clean = normalize(path);
  const map = await readAll();
  const prefix = clean + "/";
  for (const key of Object.keys(map)) {
    if (key === clean || key.startsWith(prefix)) {
      delete map[key];
    }
  }
  await writeAll(map);
}

export async function renameEntry(oldPath: string, newPath: string) {
  const oldClean = normalize(oldPath);
  const newClean = normalize(newPath);
  if (oldClean === newClean) return;
  const map = await readAll();
  if (map[newClean]) throw new Error("Target already exists: " + newPath);
  await ensureParentDirs(newClean);
  const prefix = oldClean + "/";
  const updates: FsMap = {};
  for (const key of Object.keys(map)) {
    if (key === oldClean) {
      updates[newClean] = map[key];
      delete map[key];
    } else if (key.startsWith(prefix)) {
      const suffix = key.slice(prefix.length);
      updates[`${newClean}/${suffix}`] = map[key];
      delete map[key];
    }
  }
  Object.assign(map, updates);
  await writeAll(map);
}

const SEED_WELCOME = `# Welcome to CodeCraft Mobile

A **VS Code style editor**, right on your phone.

## Features
- Multi-tab editing
- Syntax highlighting (JS, Python, HTML, CSS, JSON, MD & more)
- Run Python and JavaScript
- File explorer with folders
- Dark + Light themes
- Files stored locally on your device

Tap the folder icon in the top-left to open the explorer.
Tap the Run button at the bottom-right to execute code.
`;

const SEED_PYTHON = `# hello.py
def greet(name):
    return f"Hello, {name}!"

for i in range(3):
    print(greet(f"friend {i+1}"))

print("Sum 1..10 =", sum(range(1, 11)))
`;

const SEED_JS = `// hello.js
const greet = (name) => \`Hello, \${name}!\`;

for (let i = 0; i < 3; i++) {
  console.log(greet(\`friend \${i + 1}\`));
}

const nums = [1,2,3,4,5,6,7,8,9,10];
console.log("Sum 1..10 =", nums.reduce((a,b) => a+b, 0));
`;

const SEED_PORTFOLIO = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sarfaraz | Creative Developer Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #03001e;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent-1: #00f2fe;
      --accent-2: #4facfe;
      --accent-3: #f355da;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(0, 242, 254, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(243, 85, 218, 0.08) 0%, transparent 40%);
    }
    
    header {
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 2px;
      background: linear-gradient(to right, var(--accent-1), var(--accent-2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    nav a {
      color: var(--text-muted);
      text-decoration: none;
      margin-left: 24px;
      font-weight: 500;
      transition: color 0.3s;
    }
    
    nav a:hover {
      color: var(--accent-1);
    }
    
    .hero {
      max-width: 1200px;
      margin: 80px auto;
      padding: 0 30px;
      text-align: center;
      position: relative;
    }
    
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 20px;
    }
    
    .hero h1 span {
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-3));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: hue-rotate 10s infinite alternate;
    }
    
    @keyframes hue-rotate {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    
    .hero p {
      color: var(--text-muted);
      font-size: 1.2rem;
      max-width: 600px;
      margin: 0 auto 30px auto;
    }
    
    .cta-btn {
      display: inline-block;
      padding: 12px 32px;
      border-radius: 50px;
      font-weight: 600;
      text-decoration: none;
      background: linear-gradient(to right, var(--accent-1), var(--accent-2));
      color: #03001e;
      box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4);
      transition: all 0.3s;
    }
    
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 242, 254, 0.6);
    }
    
    .grid {
      max-width: 1200px;
      margin: 80px auto;
      padding: 0 30px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 30px;
      backdrop-filter: blur(10px);
      transition: all 0.3s;
      cursor: pointer;
    }
    
    .card:hover {
      transform: translateY(-5px);
      border-color: var(--accent-1);
      box-shadow: 0 10px 30px rgba(0, 242, 254, 0.1);
    }
    
    .card h3 {
      font-size: 1.3rem;
      margin-bottom: 12px;
      color: var(--text);
    }
    
    .card p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
    }
    
    footer {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 0.9rem;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">SARFARAZ</div>
    <nav>
      <a href="#about">About</a>
      <a href="#projects">Projects</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
  
  <section class="hero">
    <h1>Creative Developer & <span>UX Architect</span></h1>
    <p>Designing interactive interfaces and fully functional mobile development environments. Custom coding on the go.</p>
    <a href="#projects" class="cta-btn">View My Work</a>
  </section>
  
  <section class="grid" id="projects">
    <div class="card">
      <h3>01 / CodeCraft Mobile</h3>
      <p>A fully featured mobile-first IDE running CodeMirror 6 and WebSocket pseudo-terminals on iOS and Android.</p>
    </div>
    <div class="card">
      <h3>02 / Web3 Terminal</h3>
      <p>Decentralized terminal emulator facilitating interactive server shells directly from local containers.</p>
    </div>
    <div class="card">
      <h3>03 / Solar Explorer</h3>
      <p>A lightweight, interactive Three.js solar system project using hardware-accelerated shaders and textures.</p>
    </div>
  </section>
  
  <footer>
    <p>&copy; 2026 Sarfaraz. Built for personal workspace sync.</p>
  </footer>
</body>
</html>`;


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
    await writeAll(map);
  }
}

export async function initWorkspace() {
  await seedIfEmpty();
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

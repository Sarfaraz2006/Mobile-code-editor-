// Extensions catalog. Adding a new extension = one entry here.
// Future work: an `install()` runtime that spawns a companion process on the
// server, exposes it over WebSocket, and lets the editor talk to it (autocomplete,
// diagnostics, agent chat). For now, "install" clones the repo into the user's
// workspace so they can read / hack on the code themselves.
import { Feather } from "@expo/vector-icons";

export interface Extension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  repo_url?: string;
  status: "installable" | "planned";
  tags: string[];
}

export const EXTENSION_CATALOG: Extension[] = [
  {
    id: "opencode",
    name: "OpenCode",
    publisher: "opencode-ai",
    description:
      "A powerful open-source AI coding agent that runs in your terminal. Multi-provider (Claude, GPT, Gemini). LSP-aware.",
    icon: "cpu",
    repo_url: "https://github.com/opencode-ai/opencode",
    status: "installable",
    tags: ["ai", "agent", "cli"],
  },
  {
    id: "aider",
    name: "Aider",
    publisher: "paul-gauthier",
    description:
      "AI pair programmer that edits code in your local git repo. Works with GPT-4, Claude, and dozens of other models.",
    icon: "message-circle",
    repo_url: "https://github.com/paul-gauthier/aider",
    status: "installable",
    tags: ["ai", "agent", "git"],
  },
  {
    id: "continue",
    name: "Continue",
    publisher: "continuedev",
    description:
      "Open-source autopilot for software development. Bring your own model. Autocomplete + chat + agent.",
    icon: "zap",
    repo_url: "https://github.com/continuedev/continue",
    status: "installable",
    tags: ["ai", "autocomplete"],
  },
  {
    id: "cline",
    name: "Cline",
    publisher: "cline",
    description:
      "Autonomous coding agent (formerly Claude Dev). Executes commands, edits files, and browses the web with your approval.",
    icon: "code",
    repo_url: "https://github.com/cline/cline",
    status: "installable",
    tags: ["ai", "agent", "autonomous"],
  },
  {
    id: "gpt-engineer",
    name: "GPT Engineer",
    publisher: "gpt-engineer-org",
    description:
      "Specify a project, watch AI write it. Great for scaffolding new applications from a single prompt.",
    icon: "layers",
    repo_url: "https://github.com/gpt-engineer-org/gpt-engineer",
    status: "installable",
    tags: ["ai", "scaffold"],
  },
  {
    id: "sweep",
    name: "Sweep",
    publisher: "sweepai",
    description:
      "AI junior developer for GitHub issues. Turns bug reports and feature requests into working pull requests.",
    icon: "git-pull-request",
    repo_url: "https://github.com/sweepai/sweep",
    status: "installable",
    tags: ["ai", "github", "issues"],
  },
  {
    id: "codeium",
    name: "Codeium (Windsurf)",
    publisher: "codeium",
    description:
      "Free AI code completion & search. Codeium's core client library is open-source.",
    icon: "wind",
    repo_url: "https://github.com/Exafunction/codeium.vim",
    status: "installable",
    tags: ["ai", "autocomplete"],
  },
  {
    id: "tabby",
    name: "Tabby",
    publisher: "TabbyML",
    description:
      "Self-hosted AI coding assistant. Runs entirely on your infrastructure with your choice of open models.",
    icon: "server",
    repo_url: "https://github.com/TabbyML/tabby",
    status: "installable",
    tags: ["ai", "self-hosted", "autocomplete"],
  },
  {
    id: "codellm",
    name: "Language Server (LSP)",
    publisher: "codecraft",
    description:
      "Real Python & TypeScript language server integration for hover, jump-to-def, and full-context autocomplete. Runtime bridging coming next.",
    icon: "search",
    status: "planned",
    tags: ["lsp", "autocomplete"],
  },
  {
    id: "livepreview",
    name: "Live Server",
    publisher: "codecraft",
    description:
      "Serve any folder in your workspace on a public URL for live device testing. Auto-reload on save.",
    icon: "monitor",
    status: "planned",
    tags: ["preview", "server"],
  },
];

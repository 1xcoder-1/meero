# meero

An AI-powered CLI that converts natural language tasks into shell commands — inspects your system, generates the commands, guards the dangerous ones, runs them with your consent, and fixes itself when something fails.

## Features

- **Natural Language → Commands** — describe the task in plain English, no shell syntax to remember
- **Multi-Provider AI** — OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter and more (`meero setup`)
- **System Inspection** — the AI reads files, git state and environment before generating anything
- **Web Search & Docs Lookup** — the AI verifies unfamiliar commands and flags against real documentation
- **Safety Gate** — destructive commands (`rm -rf ~`, force pushes, disk wipes…) stop at a red box that demands typing `confirm`
- **Blast-Radius Preview** — before running, meero shows exactly which files would be deleted, overwritten, created or modified (`--dry-run` and inside the gate)
- **Undo** — every mutating task snapshots its targets first; `meero undo` restores deleted/moved files from trash
- **Self-Repair** — when a command fails, meero captures its real output and lets the AI fix the remaining steps (up to 3 rounds)
- **Task History** — past sessions are remembered; `meero history` lists them
- **Recipes** — save a proven command sequence once, replay it later without burning tokens (`meero run <name>`)
- **Trust Levels** — low / med / high per directory; high auto-runs while the safety gate stays armed
- **Wizard Mode** — run `meero` with no arguments for a continuous chat REPL with carried context
- **Cheap Mode** — local-first generation via Ollama with automatic escalation to cloud (`meero local on`)
- **Sandbox** — execute commands inside a throwaway Docker container (`--sandbox`)
- **Cost Transparency** — every task ends with tokens used and a dollar estimate
- **Non-interactive Flags** — `--print` (commands only, never executes), `--copy` (straight to clipboard)

## Installation

### Quick Install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh | bash
```

Or download and run manually:

```bash
curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

This script detects your OS and architecture, downloads the latest release binary, and installs it to `/usr/local/bin` or `~/.local/bin`.

### Quick Install (Windows)

Run in PowerShell:

```powershell
iwr https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -useb | iex
```

Or download and run manually:

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -OutFile install.ps1
.\install.ps1
```

The binary is installed to `%USERPROFILE%\.local\bin` and added to your user PATH automatically.

### From Source

Requires [Bun](https://bun.sh):

```bash
git clone https://github.com/1xcoder-1/meero.git
cd meero
bun install
```

## Configuration

```bash
meero setup          # pick a provider, paste your API key (masked)
meero model          # switch model later
meero reset         # wipe configuration
```

Config lives in `~/.meero/config.json`.

## Usage

```bash
meero commit all my changes
meero delete all .tmp files in the project
meero create a new git branch called feature-xyz
meero what is the command to initialise a vite project
```

The workflow:

1. Your request goes to the AI together with live system context
2. The AI inspects files / searches the web / calls `returnCommands` with the result
3. Commands are shown in a box with a cost line (tokens + $ estimate)
4. You confirm — or edit the list inline — before anything runs
5. Commands execute sequentially; if one fails, the AI gets the real output and repairs the rest
6. Destructive targets are snapshotted first, so `meero undo` can bring them back

### Wizard Mode

```bash
meero
```

A continuous REPL — context carries between tasks. Slash commands: `/undo`, `/trust low|med|high`, `/help`, `/exit`.

### Recipes

After a multi-command task succeeds, meero offers to save it as a recipe. Replay any time — no LLM call, no cost:

```bash
meero recipes            # list saved recipes
meero run clean-build    # execute one (still asks for confirmation)
meero recipe rm <name>   # delete a recipe
```

### Trust Levels

```bash
meero trust high             # globally
meero trust high --here      # only for this directory
meero --trust low "..."      # one run only
```

- **low** — confirms every single command
- **med** (default) — one confirmation per task
- **high** — auto-runs, but the safety gate still blocks destructive commands

History and snapshots:

```bash
meero history            # recent tasks
meero history --clear    # erase
meero undo               # restore the last destructive task
meero undo --list        # available snapshots
```

### Flags

| Flag | Effect |
| --- | --- |
| `--print` / `--dry-run` | print commands, never execute (scriptable) |
| `--copy` | copy generated commands to the clipboard |
| `--dry-run` (task text) | show the blast-radius preview without running |
| `--trust <level>` | override trust for this run |
| `--sandbox [image]` | execute inside Docker (default `alpine:latest`) |
| `--local` | prefer a local Ollama model for this task |

### Cheap Mode (Ollama)

```bash
meero local on               # local-first from now on
meero local on qwen3:8b      # pick a model
meero local status
```

Local-first: meero asks Ollama first and only escalates to the cloud if the local model can't produce usable commands. Set `OLLAMA_HOST` for non-default ports.

## How It Works

### System Prompt & Workflow

meero uses a strict system prompt that forces the AI into one of three modes:

| Mode | When used |
| --- | --- |
| **Tool Mode** | Task depends on real file contents, paths, or git state |
| **Web Mode** | Task requires live docs, package info, or an unfamiliar command |
| **Direct Mode** | Task is a well-known generic command — no inspection needed |

The AI is instructed to never assume files exist, never hallucinate CLI flags, generate commit messages from the actual diff, and return commands only through the structured `returnCommands` tool.

### Available AI Tools

#### System Tools

| Tool | Description |
| --- | --- |
| `cwd` | Get current working directory |
| `os` | Get OS platform and architecture |
| `env` | List environment variable names |
| `listFiles` | List files in a directory with metadata |
| `readFile` | Read file content (first 3000 chars) |
| `readFileLines` | Read specific lines from a file |
| `fileExists` | Check if a file or directory exists |
| `gitStatus` | Get git status (short format) |
| `gitDiff` | Get full git diff |
| `searchFiles` | Search text across files (grep / Select-String / findstr per OS) |
| `returnCommands` | Return the final command list structurally |

#### Web Tools

| Tool | Description |
| --- | --- |
| `webSearch` | Search the web; returns titles, URLs, snippets and parsed page text |
| `fetchWebPage` | Fetch and parse a URL into clean readable text |

### Safety Layer

Three independent layers protect your machine:

1. **Static rules** — patterns like `rm -rf /`, `shutdown`, format, fork bombs are blocked outright
2. **Blast-radius preview** — deletion/move/overwrite targets are resolved to real paths with real sizes before running; git pushes list the exact commits
3. **The gate** — dangerous commands require typing `confirm`, and meero attaches web references describing the command's risks

Everything destructive is snapshotted first (`~/.meero/trash`), so `meero undo` restores it.

## Project Structure

```
meero/
├── index.ts              # CLI entry point (Commander) + execution loop
├── core/
│   ├── ai/
│   │   ├── system-prompt.ts   # AI system prompt & rules
│   │   ├── stream.ts          # local-first generation with cloud escalation
│   │   ├── run.ts             # LLM execution with Vercel AI SDK (usage tracking)
│   │   ├── tools.ts           # AI tools (file, git, shell, web, returnCommands)
│   │   ├── models.ts          # LLM models
│   │   ├── providers.ts       # provider configs + Ollama
│   │   └── usage.ts           # token usage + cost estimation
│   ├── cli/
│   │   ├── setup.ts           # interactive setup & reset
│   │   ├── config.ts          # config loader (~/.meero/config.json)
│   │   ├── run.ts             # live-streamed command capture
│   │   ├── safety.ts          # danger rules, gate, blast-radius hook
│   │   ├── snapshot.ts        # undo snapshots + preview engine
│   │   ├── history.ts         # task history store
│   │   ├── repair.ts          # AI self-repair prompt builder
│   │   ├── trust.ts           # trust levels + confirmations
│   │   ├── recipes.ts         # saved command sequences
│   │   ├── clipboard.ts       # cross-platform copy
│   │   ├── sandbox.ts         # Docker execution
│   │   └── wizard.ts          # chat REPL
│   └── input.ts               # input parsing & command normalization
├── test/                      # bun test suite (111 tests)
├── scripts/
│   ├── install.sh             # macOS/Linux installer
│   └── install.ps1            # Windows installer
└── .github/workflows/
    └── release.yml            # test gate → cross-compile → GitHub release
```

## Development

```bash
bun install
bun test              # 111 unit tests
bunx tsc --noEmit     # strict typecheck
```

Released binaries are built by GitHub Actions on every `v*` tag; the test job gates the build.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes — new logic needs tests
4. Run `bun test` and `bunx tsc --noEmit`
5. Open a Pull Request

## License

MIT © [1xcoder](https://github.com/1xcoder-1)

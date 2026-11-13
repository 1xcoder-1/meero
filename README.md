<p align="center">
  <img src="assets/logo-full.svg" width="420" alt="meero" />
</p>

# meero

An AI-powered CLI that turns plain English into shell commands — inspects your system, generates the commands, guards the dangerous ones, runs them with your consent, and fixes itself when something fails. **v1.8.0**

## Install

```bash
# npm (requires Bun: https://bun.sh)
bunx meero@latest "find large files in this folder"
bun add -g meero

# native binary — macOS / Linux
curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh | bash

# native binary — Windows (PowerShell)
iwr https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -useb | iex
```

Installers (`.exe` setup, `.deb`, `.pkg`) ship with every [GitHub release](https://github.com/1xcoder-1/meero/releases/latest). From source: `git clone https://github.com/1xcoder-1/meero && cd meero && bun install`.

```bash
meero setup          # pick a provider, paste your API key (masked)
```

Providers: OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter — plus fully local Ollama (`meero local on`). Config lives in `~/.meero/config.json`.

## Commands

### The two AI commit commands

```bash
meero commit            # fresh commit: AI writes the message from staged changes
                        #   (asks to stage all if nothing staged; works on a repo
                        #    with zero commits too; edit the message before it runs)
meero commit -m "msg"   # skip the AI, commit with your message
meero commit -a         # stage everything automatically, no prompt

meero recommit          # rewrite PAST commit messages with AI
                        #   scores every message, proposes old → new, asks once,
                        #   creates a backup branch, then rewrites history
meero recommit --dry-run        # preview only — change nothing
meero recommit -n 10            # only the last 10 commits
meero recommit --all            # rewrite even well-formed messages
meero recommit -t "(feat): message" -l en   # custom format + language
```

Both refuse to run outside a git repository. Diffs are redacted before any provider call (`.env`, keys, tokens, connection strings are hidden or masked).

### Everything else

```bash
meero "task"            # natural language → reviewed shell commands
meero "question"        # technical question → brief explanation (no commands)
meero                   # help box
meero interactive       # multi-step task mode with session context (i, repl)

meero <pack> [args]     # 60 pre-built packs — no AI, no cost:
                        #   meero status, meero kill-port 8080, meero doctor,
                        #   meero ps, meero sysupdate, meero vuln …
meero builtin           # interactive pack menu (auto shell detect)
meero /<command>        # slash form of every local command (/settings, /model,
                        #   /builtin, /undo, /trust, /commit, /recommit, …)
```

| Command | What it does |
|---|---|
| `meero setup` | Configure provider + API key |
| `meero model [name]` | Show or switch the active model |
| `meero settings` | Model, provider, cheap mode in one page |
| `meero local on\|off\|status` | Ollama cheap mode |
| `meero trust [low\|med\|high] [--here]` | Confirmation strictness |
| `meero recipe list\|rm\|export\|import` | Saved command playbooks |
| `meero run <name>` | Replay a saved recipe (no LLM) |
| `meero undo [id] [--list]` | Revert files changed by the last task |
| `meero history [--clear]` | Recent tasks and outcomes |
| `meero commands` | Full generated reference |
| `meero reset` | Wipe configuration |
| `meero help` | Short help box |

Flags: `--print` / `--dry-run` (show, never execute) · `--copy` (to clipboard) · `--trust <level>` · `--sandbox [image]` (Docker) · `--local` (Ollama for this task)

## How it works

1. Your request is routed locally first: slash command → pre-built pack → meero-config question → casual-chat guardrail → only then the AI (zero tokens before that point).
2. The AI inspects files / git state / web docs as needed and returns exact shell commands for your detected shell (PowerShell 7, PowerShell 5.1, cmd, bash, zsh, sh).
3. You confirm or edit the list; a safety gate blocks destructive commands and snapshots targets first (`meero undo` restores them).
4. If a command fails, the AI gets its real output and repairs the remaining steps (up to 3 rounds).

## Development

```bash
bun install
bun test              # unit tests
bunx tsc --noEmit     # strict typecheck
```

Released binaries are built by GitHub Actions on every `v*` tag (macOS arm64/x64, Linux x64/arm64, Windows x64 — zip, NSIS setup, `.deb`, `.pkg`), and npm publishes on tag too. Docs: [website/app/docs](website/app/docs).

## License

MIT © [1xcoder](https://github.com/1xcoder-1)

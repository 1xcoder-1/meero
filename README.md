# meero

An AI-powered CLI that converts natural language tasks into shell commands — inspects your system, generates the commands, guards the dangerous ones, runs them with your consent, and fixes itself when something fails.

## Features

- **Natural Language → Commands** — describe the task in plain English, no shell syntax to remember
- **Shell-Aware** — auto-detects your exact shell (PowerShell 7, Windows PowerShell 5.1, cmd.exe, bash, zsh, sh) and generates only syntax that shell actually runs; `--sandbox` targets POSIX `sh` inside the container
- **Multi-Provider AI** — OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter and more (`meero setup`)
- **System Inspection** — the AI reads files, git state and environment before generating anything
- **Web Search & Docs Lookup** — the AI verifies unfamiliar commands and flags against real documentation
- **Safety Gate** — destructive commands (`rm -rf ~`, force pushes, disk wipes…) stop at a red box that demands typing `confirm`
- **Blast-Radius Preview** — before running, meero shows exactly which files would be deleted, overwritten, created or modified (`--dry-run` and inside the gate)
- **Undo** — every mutating task snapshots its targets first; `meero undo` restores deleted/moved files from trash
- **Self-Repair** — when a command fails, meero captures its real output and lets the AI fix the remaining steps (up to 3 rounds)
- **Task History** — past sessions are remembered; `meero history` lists them
- **Recipes** — save a proven command sequence once, replay it later without burning tokens (`meero run <name>`), and share them as files (`meero recipe export` / `import`)
- **Pre-Built Command Packs** — 60 curated developer commands (git, docker, npm, network, disk, processes, diagnostics) that run with ZERO AI and zero cost; type the pack name directly (`meero status`, `meero kill-port 8080`) — and every single pack has a short form (`meero ps`, `meero health`, `meero sysupdate`, `meero vuln`) — the right variant for your shell/OS is picked automatically, safe packs run instantly and risky ones get a single confirm (`meero builtin` for the menu)
- **Developer Guardrail** — meero is a developer tool, not a chatbot: casual one-liners ("hi", "how are you" — even typo-prefixed like `meero hi`) never reach the LLM, and when AI *is* used it is locked to shell commands — it can never chat back
- **Trust Levels** — low / med / high per directory; high auto-runs while the safety gate stays armed
- **Cost Transparency** — every task prints a dim line with tokens in/out and the approximate dollar cost, so the bill never surprises you
- **No Chat Mode** — running `meero` with no task prints the help box; AI is only ever invoked for a real developer task (`meero commit all my changes`), and settings live in real commands: `meero settings`, `meero model`, `meero trust`
- **Slash Commands** — every local command also runs as `meero /xyz`: `/settings` `/model` `/builtin` `/undo` `/trust` `/commands` `/help` `/exit`. meero checks slash → built-in pack → then the AI, so a command that exists locally can never leak into a model call
- **Cheap Mode** — local-first generation via Ollama with automatic escalation to cloud (`meero local on`)
- **Sandbox** — execute commands inside a throwaway Docker container (`--sandbox`)
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

This script detects your OS and architecture, downloads the latest compressed release (~45 MB instead of the raw ~110 MB binary), extracts it, and installs it to `/usr/local/bin` or `~/.local/bin`.

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

### Setup Packages (GitHub Releases)

Prefer a real installer? Every [release](https://github.com/1xcoder-1/meero/releases/latest) ships proper setup packages with the meero icon branding:

| Platform | Asset | Install |
|---|---|---|
| Windows | `meero-setup-windows-x64.exe` | Double-click — Start Menu shortcut, user PATH, uninstaller included |
| Linux (Debian/Ubuntu) | `meero-linux-x64.deb` / `meero-linux-arm64.deb` | `sudo apt install ./meero-linux-x64.deb` |
| macOS | `meero-macos-arm64.pkg` / `meero-macos-x64.pkg` | Double-click the package, or `sudo installer -pkg meero-macos-arm64.pkg -target /` |
| Any (terminal) | `meero-*.zip` / `meero-*.tar.gz` | The `curl | bash` / `iwr | iex` scripts above |

The Windows executable carries the meero icon (not the Bun default) and proper version metadata in its properties.

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

### No Task, No Chat

```bash
meero          # prints the help box — there is no chat mode
meero hi       # refused before any AI call — meero is a tool, not a chatbot
```

AI runs only for a real developer task: `meero commit all my changes`, `meero what command shows disk usage`. Even then the model is contract-bound to return shell commands — small talk comes back as nothing, and it may not touch its tools for it.

### Slash Commands

Every command meero can answer locally also works in slash form — same behaviour, same arguments, **no AI call**:

```bash
meero /settings              # provider, model and cheap mode in one page
meero /model                 # list models (or: meero /model gemini-2.5-flash)
meero /builtin               # the pre-built pack menu
meero /undo                  # revert the last task  (/undo --list for snapshots)
meero /trust low             # confirmation strictness (/trust shows the current one)
meero /commands              # full reference: every command, flag and pack
meero /help                  # the short help box
meero /exit                  # nothing to exit — one task per call
```

Routing happens in that order, before the model is ever considered:

| Typed | Resolves to | AI called? |
| --- | --- | --- |
| `meero /settings` | slash command → settings page | no |
| `meero status 3000` | built-in pack → runs directly | no |
| `meero hi` | chat guardrail → refused | no |
| `meero commit all my changes` | developer task → AI generates commands | yes |

`meero /xyz` and the plain subcommand (`meero settings`) are the same code path — nothing is duplicated, and an unknown `/xyz` is answered with a hint instead of being sent to the AI.

### Recipes

After a multi-command task succeeds, meero offers to save it as a recipe. Replay any time — no LLM call, no cost:

```bash
meero recipes                       # list saved recipes
meero run clean-build               # execute one (still asks for confirmation)
meero recipe rm <name>              # delete a recipe
meero recipe export team.json       # bundle ALL recipes into a shareable file
meero recipe export x.json deploy   # …or only the named ones
meero recipe import team.json       # merge them in (name clashes are skipped)
meero recipe import team.json --force  # overwrite same-named recipes
```

### Pre-Built Command Packs (No AI)

60 curated developer commands that need no API key and make no LLM call — run any pack **directly by name** (the `builtin` word is optional) and the correct variant for your detected shell/OS executes immediately:

```bash
meero builtin                    # interactive grouped menu (auto shell detect)
meero status                     # short alias → runs git-status
meero git-status                 # full id — same thing, also works
meero kill-port 8080             # packs with params take args (else prompted)
meero whoport 3000               # who is hogging the port? (EADDRINUSE fixer)
meero doctor                     # node / npm / git / docker health check
```

Smart auto-run: safe packs execute with no confirmation at all; risky ones (⚠️ kill, discard, clean, stop, trash) ask once — and they show what they touched: git-discard prints before/after status, docker-stop lists containers before and after, kill-port names the process it killed or tells you nothing was listening. Empty targets never error — they say "nothing to do" and exit clean. If a command still fails, the normal AI self-repair loop offers a fix.

#### git
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero git-status` | `meero status` | branch status + last 5 commits |
| `meero git-pull` | `meero pull` | rebase pull with autostash |
| `meero git-undo-commit` | `meero uncommit` | undo the last commit, keep the changes |
| `meero git-sync` | `meero sync` | fetch all remotes with prune + status |
| `meero git-branches` | `meero branches` | all local + remote branches |
| `meero git-log-graph` | `meero graph` | commit graph, last 15 |
| `meero git-stash` | `meero stash` | stash everything incl. untracked |
| `meero git-diff` | `meero diff` | uncommitted changes (stat + full diff) |
| `meero git-last` | `meero last` | last commit in detail |
| `meero git-remote` | `meero remote` | remotes with URLs |
| `meero git-add-all` | `meero add` | stage every change |
| `meero git-unstage` | `meero unstage` | unstage everything, keep edits |
| `meero git-discard [file]` | `meero discard` | ⚠️ back to the last committed version |
| `meero git-blame [file]` | `meero blame` | line-by-line authorship |
| `meero git-tag-list` | `meero tags` | tags, newest first |
| `meero git-authors` | `meero authors` | top contributors |
| `meero git-amend` | `meero amend` | add staged changes to the last commit |

#### packages
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero update-system` | `meero sysupdate` | update all system packages (winget/apt/brew) |
| `meero update-choco` | `meero choco` | update all apps via Chocolatey (windows) |
| `meero npm-cache-clean` | `meero cacheclean` | clear the npm cache |
| `meero reinstall-node-modules` | `meero reinstall` | wipe + fresh node_modules |
| `meero deps-install` | `meero deps` | install deps per lockfile presence |
| `meero npm-outdated` | `meero outdated` | current vs wanted vs latest versions |
| `meero npm-update` | `meero update` | update packages to wanted versions |
| `meero npm-ls` | `meero ls` | top-level installed packages |
| `meero npm-scripts` | `meero scripts` | every runnable package.json script |
| `meero npm-test` | `meero test` | run the project's tests |
| `meero npm-ci` | `meero ci` | clean install from the lockfile |
| `meero npm-rebuild` | `meero rebuild` | rebuild broken native modules |
| `meero npm-audit` | `meero vuln` | vulnerability report without fixing |
| `meero npm-doctor` | `meero npmcheck` | npm health check |
| `meero npm-cache-verify` | `meero cachecheck` | verify/repair the npm cache |

#### network
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero public-ip` | `meero ip` | your public IPv4/IPv6 |
| `meero check-url [url]` | `meero check` | status code + timing of a URL |
| `meero open-ports` | `meero ports` | listening ports and their owners |
| `meero network-info` | `meero net` | adapters, IPs, gateways, DNS |
| `meero dns-flush` | `meero dns` | flush the DNS cache |
| `meero active-connections` | `meero conns` | active TCP connections |
| `meero speed-test` | `meero speedtest` | download speed via Cloudflare |
| `meero show-hosts` | `meero hosts` | show the hosts file |

#### processes
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero kill-port [port]` | `meero killport` | ⚠️ kill whatever listens on a port |
| `meero top-processes` | `meero top` | heaviest processes by CPU/memory |
| `meero kill-node` | `meero killnode` | ⚠️ kill all node processes |

#### disk
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero disk-usage` | `meero disk` | disk space per drive/mount |
| `meero large-files` | `meero largest` | biggest files under the current folder |
| `meero clean-build` | `meero cleanbuild` | delete dist/build/.next artifacts |
| `meero empty-trash` | `meero trash` | ⚠️ empty the recycle bin / trash |

#### dev
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero docker-clean` | `meero dclean` | ⚠️ clean stopped containers + dangling images (lists them first) |
| `meero docker-ps` | `meero ps` | running containers |
| `meero docker-logs [container]` | `meero logs` | last 100 log lines of a container |
| `meero docker-stop [container]` | `meero stop` | ⚠️ stop a container by name |
| `meero docker-restart [container]` | `meero restart` | restart a container by name |
| `meero docker-images` | `meero images` | local image cache |
| `meero env-info` | `meero env` | node / npm / git versions |
| `meero npm-audit-fix` | `meero audit` | auto-fix npm vulnerabilities |
| `meero doctor` | `meero health` | node / npm / git / docker up? disk free? |
| `meero which [cmd]` | `meero whereis` | where does a command resolve ("not found" fixer) |
| `meero who-on-port [port]` | `meero whoport` | which process holds a port (EADDRINUSE fixer) |

#### system
| Copy-paste | Short alias | What it does |
| --- | --- | --- |
| `meero system-info` | `meero sysinfo` | OS, CPU, uptime summary |
| `meero memory-usage` | `meero mem` | total vs free memory |

Platform-aware by design: every pack ships variants for PowerShell / cmd / bash / zsh / sh (plus Windows, Linux, macOS specifics), and meero picks the one that matches the shell that will actually execute it — the same detection that powers AI generation.

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
│   │   ├── builtin.ts         # 60 pre-built command packs (no AI, auto shell detect)
│   │   ├── guardrail.ts       # casual-chat guardrail + meero-prefix strip
│   │   ├── router.ts          # slash → pack → meta → chat → AI decision order
│   │   ├── reference.ts       # /commands page, generated from the pack catalog
│   │   ├── clipboard.ts       # cross-platform copy
│   │   └── sandbox.ts         # Docker execution
│   └── input.ts               # input parsing & command normalization
├── test/                      # bun test suite (177 tests)
├── assets/
│   ├── meero.png              # app icon (deb/macOS branding)
│   └── meero.ico              # Windows icon (exe + installer branding)
├── scripts/
│   ├── install.sh             # macOS/Linux terminal installer
│   ├── install.ps1            # Windows terminal installer
│   ├── installer.nsi          # NSIS Windows setup script (CI)
│   ├── patch-icon.mjs         # swaps Bun icon for meero.ico (CI)
│   ├── make-ico.ps1           # regenerates meero.ico from meero.png
│   └── remove-bg.ps1          # regenerates the transparent logo PNG
└── .github/workflows/
    └── release.yml            # test gate → cross-compile → icon/setup packaging → GitHub release
```

## Development

```bash
bun install
bun test              # 162 unit tests
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

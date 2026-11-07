import os from "os";
import { inspectCommand } from "./safety";
import type { ShellInfo } from "./shell";

/**
 * Built-in developer command packs: curated task recipes that run with
 * ZERO AI involvement. Variant selection is automatic — the same
 * detectShell() that powers the AI system prompt picks the variant
 * written for the shell that will actually execute it (PowerShell on
 * Windows, bash/zsh on Linux/macOS, curl/git/docker everywhere).
 */

export type VariantKey =
  | "pwsh"
  | "powershell"
  | "cmd"
  | "bash"
  | "zsh"
  | "sh"
  | "posix"
  | "windows"
  | "linux"
  | "macos"
  | "any";

export interface BuiltinParam {
  /** {token} placeholder used inside variant command strings */
  token: string;
  message: string;
  default: string;
}

export interface BuiltinCmd {
  id: string;
  label: string;
  group:
    | "packages"
    | "network"
    | "processes"
    | "disk"
    | "git"
    | "dev"
    | "system";
  desc: string;
  /** confirm even when the shared safety classifier sees nothing */
  risky?: boolean;
  /** hide from the menu on other platforms (id runs still resolve + error) */
  platforms?: Array<"windows" | "linux" | "macos">;
  params?: BuiltinParam[];
  variants: Partial<Record<VariantKey, string[]>>;
}

export const BUILTINS: BuiltinCmd[] = [
  // ---- packages & updates -------------------------------------------------
  {
    id: "update-system",
    label: "Update all system packages",
    group: "packages",
    desc: "winget (Windows) / apt (Linux) / brew (macOS)",
    variants: {
      windows: ["winget upgrade --all"],
      linux: ["sudo apt update", "sudo apt upgrade -y"],
      macos: ["brew update", "brew upgrade"],
    },
  },
  {
    id: "update-choco",
    label: "Update all apps via Chocolatey",
    group: "packages",
    desc: "choco upgrade all (Windows)",
    platforms: ["windows"],
    variants: { windows: ["choco upgrade all -y"] },
  },
  {
    id: "npm-cache-clean",
    label: "Clean the npm cache",
    group: "packages",
    desc: "frees disk space, fixes corrupted installs",
    variants: { any: ["npm cache clean --force"] },
  },
  {
    id: "reinstall-node-modules",
    label: "Reinstall node_modules from scratch",
    group: "packages",
    desc: "delete node_modules, then npm install",
    variants: {
      posix: ["rm -rf node_modules", "npm install"],
      powershell: [
        "if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }",
        "npm install",
      ],
      cmd: ["if exist node_modules rmdir /s /q node_modules", "npm install"],
    },
  },
  {
    id: "deps-install",
    label: "Install JS dependencies in this folder",
    group: "packages",
    desc: "npm install",
    variants: { any: ["npm install"] },
  },

  // ---- network & curl ------------------------------------------------------
  {
    id: "public-ip",
    label: "Show public IP address",
    group: "network",
    desc: "curl ifconfig.me",
    variants: {
      windows: ["curl.exe -s https://ifconfig.me"],
      posix: ["curl -s https://ifconfig.me"],
    },
  },
  {
    id: "check-url",
    label: "Check a website's HTTP status",
    group: "network",
    desc: "HEAD request with response headers",
    params: [
      { token: "url", message: "URL to check:", default: "https://example.com" },
    ],
    variants: {
      windows: ["curl.exe -sSI {url}"],
      posix: ["curl -sSI {url}"],
    },
  },
  {
    id: "open-ports",
    label: "List listening TCP ports",
    group: "network",
    desc: "which services are accepting connections",
    variants: {
      powershell: [
        "Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize",
      ],
      cmd: ["netstat -ano | findstr LISTENING"],
      linux: ["ss -tulpn"],
      macos: ["lsof -iTCP -sTCP:LISTEN -P -n"],
    },
  },
  {
    id: "network-info",
    label: "Show network / IP configuration",
    group: "network",
    desc: "interfaces, addresses, gateways",
    variants: {
      windows: ["ipconfig /all"],
      linux: ["ip -brief address"],
      macos: ["ifconfig"],
    },
  },
  {
    id: "dns-flush",
    label: "Flush the DNS cache",
    group: "network",
    desc: "fix stale domain lookups after DNS changes",
    variants: {
      windows: ["ipconfig /flushdns"],
      macos: [
        "sudo dscacheutil -flushcache",
        "sudo killall -HUP mDNSResponder",
      ],
      linux: ["sudo resolvectl flush-caches"],
    },
  },

  // ---- processes -----------------------------------------------------------
  {
    id: "kill-port",
    label: "Kill the process on a port",
    group: "processes",
    desc: "frees a stuck dev-server port",
    risky: true,
    params: [{ token: "port", message: "Port number:", default: "3000" }],
    variants: {
      powershell: [
        "$c = Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue; if (-not $c) { Write-Host 'nothing is listening on port {port}' } else { $c | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize; $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }; Write-Host 'port {port} is free now' }",
      ],
      cmd: [
        "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :{port} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul",
      ],
      posix: [
        "pids=$(lsof -ti:{port}); if [ -n \"$pids\" ]; then echo \"$pids\" | xargs kill -9; echo 'port {port} is free now'; else echo 'nothing is listening on port {port}'; fi",
      ],
    },
  },
  {
    id: "top-processes",
    label: "Top 10 processes by CPU",
    group: "processes",
    desc: "what is eating the CPU right now",
    variants: {
      powershell: [
        "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Id,ProcessName,CPU | Format-Table -AutoSize",
      ],
      // cmd has no native sort — bridge through the always-present powershell
      cmd: [
        "powershell -NoProfile -Command \"Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Id,ProcessName,CPU | Format-Table -AutoSize\"",
      ],
      linux: ["ps aux --sort=-%cpu | head -n 11"],
      macos: ["ps aux | sort -nrk 3,3 | head -n 11"],
    },
  },

  // ---- disk & files --------------------------------------------------------
  {
    id: "disk-usage",
    label: "Show disk space usage",
    group: "disk",
    desc: "free vs used per volume",
    variants: {
      powershell: ["Get-PSDrive -PSProvider FileSystem | Format-Table -AutoSize"],
      // Get-PSDrive is a cmdlet — cmd.exe bridges through powershell
      cmd: [
        "powershell -NoProfile -Command \"Get-PSDrive -PSProvider FileSystem | Format-Table -AutoSize\"",
      ],
      posix: ["df -h"],
    },
  },
  {
    id: "large-files",
    label: "Find the 20 largest files here",
    group: "disk",
    desc: "biggest space eaters under the current folder",
    variants: {
      powershell: [
        "Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 20 @{n='MB';e={[math]::Round($_.Length/1MB,1)}},FullName | Format-Table -AutoSize",
      ],
      cmd: [
        "powershell -NoProfile -Command \"Get-ChildItem -Recurse -File | Sort-Object Length -Descending | Select-Object -First 20 FullName | Format-Table -AutoSize\"",
      ],
      posix: ["du -ah . 2>/dev/null | sort -rh | head -n 20"],
    },
  },

  // ---- git & dev tools -----------------------------------------------------
  {
    id: "git-status",
    label: "Git status + last 5 commits",
    group: "git",
    desc: "quick repo overview",
    variants: { any: ["git status -sb", "git log --oneline -5"] },
  },
  {
    id: "git-pull",
    label: "Pull latest (rebase + autostash)",
    group: "git",
    desc: "safe update without losing local changes",
    variants: { any: ["git pull --rebase --autostash"] },
  },
  {
    id: "git-undo-commit",
    label: "Undo the last commit (keep changes staged)",
    group: "git",
    desc: "soft reset one commit back",
    variants: { any: ["git reset --soft HEAD~1"] },
  },
  {
    id: "docker-clean",
    label: "Clean unused docker data",
    group: "dev",
    desc: "stopped containers, dangling layers",
    risky: true,
    variants: {
      any: [
        "docker ps -a --format \"{{.Names}}: {{.Status}}\"",
        "docker system prune -f",
      ],
    },
  },

  // ---- system --------------------------------------------------------------
  {
    id: "system-info",
    label: "Show OS + hardware summary",
    group: "system",
    desc: "platform, memory, CPU",
    variants: {
      windows: ["systeminfo"],
      linux: ["uname -a", "free -h"],
      macos: [
        "sw_vers",
        "sysctl -n machdep.cpu.brand_string",
        "sysctl -n hw.memsize",
      ],
    },
  },

  // ---- dev tooling (second wave) --------------------------------------------
  {
    id: "env-info",
    label: "Show Node / npm / git versions",
    group: "dev",
    desc: "verify the dev environment in one shot",
    variants: {
      any: ["node --version", "npm --version", "git --version"],
    },
  },
  {
    id: "npm-audit-fix",
    label: "Fix npm vulnerabilities automatically",
    group: "dev",
    desc: "npm audit fix on this project",
    variants: { any: ["npm audit fix"] },
  },
  {
    id: "docker-ps",
    label: "List running docker containers",
    group: "dev",
    desc: "what is up in docker right now",
    variants: { any: ["docker ps"] },
  },
  {
    id: "docker-logs",
    label: "Tail a container's logs",
    group: "dev",
    desc: "last 100 log lines of a container",
    params: [
      { token: "container", message: "Container name:", default: "app" },
    ],
    variants: { any: ["docker logs --tail 100 {container}"] },
  },

  // ---- git (second wave) ----------------------------------------------------
  {
    id: "git-sync",
    label: "Sync with remote (fetch + prune)",
    group: "git",
    desc: "refresh remote refs, drop deleted branches",
    variants: { any: ["git fetch --all --prune", "git status -sb"] },
  },
  {
    id: "git-branches",
    label: "List all branches (local + remote)",
    group: "git",
    desc: "full branch overview",
    variants: { any: ["git branch -a"] },
  },
  {
    id: "git-log-graph",
    label: "Commit history as a graph",
    group: "git",
    desc: "last 15 commits with branch lines",
    variants: { any: ["git log --oneline --graph --decorate -15"] },
  },
  {
    id: "git-stash",
    label: "Stash all changes (incl. untracked)",
    group: "git",
    desc: "clean working tree without losing work",
    variants: { any: ["git stash push -u"] },
  },

  // ---- processes (second wave) -----------------------------------------------
  {
    id: "kill-node",
    label: "Kill all node processes",
    group: "processes",
    desc: "unstuck dev servers in one go",
    risky: true,
    variants: {
      powershell: [
        "$p = Get-Process node -ErrorAction SilentlyContinue; if ($p) { $p | Select-Object Id,ProcessName | Format-Table -AutoSize; $p | Stop-Process -Force; Write-Host \"killed $($p.Count) node process(es)\" } else { Write-Host 'no node processes running' }",
      ],
      cmd: ["taskkill /F /IM node.exe 2>nul & echo node processes stopped (if any)"],
      posix: [
        "pkill -9 node 2>/dev/null; echo 'node processes stopped (if any)'",
      ],
    },
  },

  // ---- disk & files (second wave) --------------------------------------------
  {
    id: "clean-build",
    label: "Delete build artifacts (dist / build / .next)",
    group: "disk",
    desc: "fresh-build cleanup for JS projects",
    variants: {
      posix: ["rm -rf dist build .next"],
      powershell: [
        "foreach ($d in @('dist','build','.next')) { if (Test-Path $d) { Remove-Item -Recurse -Force $d } }",
      ],
      cmd: [
        "if exist dist rmdir /s /q dist",
        "if exist build rmdir /s /q build",
        "if exist .next rmdir /s /q .next",
      ],
    },
  },
  {
    id: "empty-trash",
    label: "Empty the recycle bin / trash",
    group: "disk",
    desc: "permanently frees deleted-file space",
    risky: true,
    variants: {
      powershell: [
        "$items = (New-Object -ComObject Shell.Application).NameSpace(0xA).Items(); Write-Host \"recycle bin: $($items.Count) item(s)\"; Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Write-Host 'recycle bin emptied'",
      ],
      cmd: [
        "powershell -NoProfile -Command \"Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Write-Host 'recycle bin emptied'\"",
      ],
      macos: ["rm -rf ~/.Trash/*", "echo 'trash emptied'"],
      linux: [
        "rm -rf ~/.local/share/Trash/files/*",
        "rm -rf ~/.local/share/Trash/info/*",
        "echo 'trash emptied'",
      ],
    },
  },

  // ---- network (second wave) --------------------------------------------------
  {
    id: "active-connections",
    label: "List active TCP connections",
    group: "network",
    desc: "who is connected to this machine",
    variants: {
      powershell: [
        "Get-NetTCPConnection -State Established | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess | Format-Table -AutoSize",
      ],
      cmd: ["netstat -ano | findstr ESTABLISHED"],
      linux: ["ss -tn state established"],
      macos: ["lsof -i -n -P | grep ESTABLISHED"],
    },
  },
  {
    id: "speed-test",
    label: "Quick download speed check",
    group: "network",
    desc: "10 MB pull from Cloudflare, speed reported",
    variants: {
      windows: [
        "curl.exe -o NUL -s -w \"download speed: %{speed_download} bytes/sec\" \"https://speed.cloudflare.com/__down?bytes=10000000\"",
      ],
      posix: [
        "curl -o /dev/null -s -w 'download speed: %{speed_download} bytes/sec\\n' 'https://speed.cloudflare.com/__down?bytes=10000000'",
      ],
    },
  },
  {
    id: "show-hosts",
    label: "Show the hosts file",
    group: "network",
    desc: "local domain overrides",
    variants: {
      windows: ["type C:\\Windows\\System32\\drivers\\etc\\hosts"],
      posix: ["cat /etc/hosts"],
    },
  },

  // ---- system (second wave) ----------------------------------------------------
  {
    id: "memory-usage",
    label: "Show RAM usage",
    group: "system",
    desc: "free vs total memory",
    variants: {
      powershell: [
        "Get-CimInstance Win32_OperatingSystem | Select-Object @{n='FreeGB';e={[math]::Round($_.FreePhysicalMemory/1MB,1)}},@{n='TotalGB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}} | Format-Table -AutoSize",
      ],
      cmd: [
        "powershell -NoProfile -Command \"Get-CimInstance Win32_OperatingSystem | Select-Object @{n='FreeGB';e={[math]::Round($_.FreePhysicalMemory/1MB,1)}},@{n='TotalGB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}} | Format-Table -AutoSize\"",
      ],
      linux: ["free -h"],
      macos: ["vm_stat | head -n 8"],
    },
  },

  // ---- git (third wave) ------------------------------------------------------
  {
    id: "git-diff",
    label: "Show uncommitted changes",
    group: "git",
    desc: "what you changed and the actual diff",
    variants: {
      any: ["git --no-pager diff --stat", "git --no-pager diff"],
    },
  },
  {
    id: "git-last",
    label: "Show the last commit in detail",
    group: "git",
    desc: "message + files of HEAD",
    variants: { any: ["git --no-pager show --stat HEAD"] },
  },
  {
    id: "git-remote",
    label: "List git remotes",
    group: "git",
    desc: "where this repo pushes and pulls from",
    variants: { any: ["git remote -v"] },
  },
  {
    id: "git-add-all",
    label: "Stage every change",
    group: "git",
    desc: "git add -A + resulting status",
    variants: { any: ["git add -A", "git status -sb"] },
  },
  {
    id: "git-unstage",
    label: "Unstage everything",
    group: "git",
    desc: "keep the edits, clear the staging area",
    variants: { any: ["git reset", "git status -sb"] },
  },
  {
    id: "git-discard",
    label: "Discard local changes to a file",
    group: "git",
    desc: "back to the last committed version (destructive)",
    risky: true,
    params: [
      { token: "file", message: "File to discard (. = all):", default: "." },
    ],
    variants: {
      any: ["git status -sb", "git checkout -- {file}", "git status -sb"],
    },
  },
  {
    id: "git-blame",
    label: "Who wrote this file's lines",
    group: "git",
    desc: "line-by-line authorship",
    params: [
      { token: "file", message: "File to blame:", default: "package.json" },
    ],
    variants: { any: ["git --no-pager blame {file}"] },
  },
  {
    id: "git-tag-list",
    label: "List tags (newest first)",
    group: "git",
    desc: "release tags of this repo",
    variants: { any: ["git --no-pager tag --sort=-creatordate"] },
  },
  {
    id: "git-authors",
    label: "Top contributors",
    group: "git",
    desc: "commits per author",
    variants: { any: ["git shortlog -sn HEAD"] },
  },
  {
    id: "git-amend",
    label: "Add staged changes to the last commit",
    group: "git",
    desc: "amend without editing the message",
    variants: { any: ["git commit --amend --no-edit"] },
  },

  // ---- npm (third wave) ------------------------------------------------------
  {
    id: "npm-outdated",
    label: "List outdated packages",
    group: "packages",
    desc: "current vs wanted vs latest versions",
    variants: { any: ["npm outdated"] },
  },
  {
    id: "npm-update",
    label: "Update packages to wanted versions",
    group: "packages",
    desc: "respects semver ranges in package.json",
    variants: { any: ["npm update"] },
  },
  {
    id: "npm-ls",
    label: "List installed packages",
    group: "packages",
    desc: "top level of the dependency tree",
    variants: { any: ["npm ls --depth=0"] },
  },
  {
    id: "npm-scripts",
    label: "List package.json scripts",
    group: "packages",
    desc: "every runnable script of this project",
    variants: { any: ["npm run"] },
  },
  {
    id: "npm-test",
    label: "Run the project's tests",
    group: "packages",
    desc: "npm test in this folder",
    variants: { any: ["npm test"] },
  },
  {
    id: "npm-ci",
    label: "Clean install from the lockfile",
    group: "packages",
    desc: "exact CI-grade dependency install",
    variants: { any: ["npm ci"] },
  },
  {
    id: "npm-rebuild",
    label: "Rebuild native modules",
    group: "packages",
    desc: "fixes broken node-gyp builds",
    variants: { any: ["npm rebuild"] },
  },
  {
    id: "npm-audit",
    label: "Show the vulnerability report",
    group: "packages",
    desc: "npm audit without fixing",
    variants: { any: ["npm audit"] },
  },
  {
    id: "npm-doctor",
    label: "Check npm's health",
    group: "packages",
    desc: "ping, registry, versions, permissions",
    variants: { any: ["npm doctor"] },
  },
  {
    id: "npm-cache-verify",
    label: "Verify the npm cache",
    group: "packages",
    desc: "repairs corrupt cache entries",
    variants: { any: ["npm cache verify"] },
  },

  // ---- docker (extras) -------------------------------------------------------
  {
    id: "docker-stop",
    label: "Stop a container",
    group: "dev",
    desc: "graceful stop by name",
    risky: true,
    params: [
      { token: "container", message: "Container name:", default: "app" },
    ],
    variants: {
      any: [
        "docker ps --format \"{{.Names}}: {{.Status}}\"",
        "docker stop {container}",
        "docker ps --format \"{{.Names}}: {{.Status}}\"",
      ],
    },
  },
  {
    id: "docker-restart",
    label: "Restart a container",
    group: "dev",
    desc: "stop + start by name",
    params: [
      { token: "container", message: "Container name:", default: "app" },
    ],
    variants: { any: ["docker restart {container}"] },
  },
  {
    id: "docker-images",
    label: "List docker images",
    group: "dev",
    desc: "what is in the local image cache",
    variants: { any: ["docker images"] },
  },

  // ---- dev-mistake diagnostics ------------------------------------------------
  {
    id: "doctor",
    label: "Developer environment health check",
    group: "dev",
    desc: "node / npm / git / docker up? disk free?",
    variants: {
      windows: [
        "node --version",
        "npm --version",
        "git --version",
        "docker ps --format \"{{.Names}}: {{.Status}}\"",
        "wmic logicaldisk get caption,freespace",
      ],
      linux: [
        "uname -r",
        "node --version",
        "npm --version",
        "git --version",
        "docker ps --format '{{.Names}}: {{.Status}}'",
        "df -h / | tail -1",
      ],
      macos: [
        "sw_vers",
        "node --version",
        "npm --version",
        "git --version",
        "docker ps --format '{{.Names}}: {{.Status}}'",
        "df -h / | tail -1",
      ],
    },
  },
  {
    id: "which",
    label: "Where does a command resolve from",
    group: "dev",
    desc: "the 'command not found' investigator",
    params: [{ token: "cmd", message: "Command to locate:", default: "node" }],
    variants: {
      powershell: [
        "Get-Command {cmd} | Select-Object CommandType,Name,Source | Format-List",
      ],
      cmd: ["where {cmd}"],
      posix: ["which -a {cmd}"],
    },
  },
  {
    id: "who-on-port",
    label: "Which process is listening on a port",
    group: "dev",
    desc: "the EADDRINUSE investigator",
    params: [{ token: "port", message: "Port number:", default: "3000" }],
    variants: {
      powershell: [
        "Get-NetTCPConnection -LocalPort {port} -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize",
        "$pids = (Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue).OwningProcess; if ($pids) { Get-Process -Id $pids | Select-Object Id,ProcessName,Path | Format-List }",
      ],
      cmd: ["netstat -ano | findstr :{port} | findstr LISTENING"],
      linux: ["ss -ltnp | grep :{port} || true"],
      macos: ["lsof -nP -i :{port} -s TCP:LISTEN"],
    },
  },
];

export function listBuiltins(): BuiltinCmd[] {
  const os = osKey();
  return BUILTINS.filter(
    (c) => !c.platforms || c.platforms.includes(os as "windows" | "linux" | "macos"),
  );
}

export function getBuiltin(id: string): BuiltinCmd | null {
  return BUILTINS.find((c) => c.id === id.toLowerCase()) ?? null;
}

/**
 * Short aliases: `meero status` runs git-status, `meero ps` runs docker-ps.
 * Full ids always keep working; aliases are sugar for the common ones and are
 * kept collision-free with meero's own commands (enforced by tests).
 */
const ID_ALIASES: Record<string, string> = {
  // git
  status: "git-status",
  pull: "git-pull",
  uncommit: "git-undo-commit",
  sync: "git-sync",
  branches: "git-branches",
  graph: "git-log-graph",
  stash: "git-stash",
  diff: "git-diff",
  last: "git-last",
  remote: "git-remote",
  add: "git-add-all",
  unstage: "git-unstage",
  discard: "git-discard",
  blame: "git-blame",
  tags: "git-tag-list",
  authors: "git-authors",
  amend: "git-amend",
  // docker
  ps: "docker-ps",
  logs: "docker-logs",
  dclean: "docker-clean",
  stop: "docker-stop",
  restart: "docker-restart",
  images: "docker-images",
  // dev / npm
  env: "env-info",
  audit: "npm-audit-fix",
  outdated: "npm-outdated",
  update: "npm-update",
  rebuild: "npm-rebuild",
  ls: "npm-ls",
  scripts: "npm-scripts",
  ci: "npm-ci",
  test: "npm-test",
  vuln: "npm-audit",
  npmcheck: "npm-doctor",
  cacheclean: "npm-cache-clean",
  cachecheck: "npm-cache-verify",
  reinstall: "reinstall-node-modules",
  deps: "deps-install",
  sysupdate: "update-system",
  // network
  ip: "public-ip",
  check: "check-url",
  ports: "open-ports",
  net: "network-info",
  dns: "dns-flush",
  conns: "active-connections",
  speedtest: "speed-test",
  hosts: "show-hosts",
  // processes / disk / system
  killport: "kill-port",
  top: "top-processes",
  killnode: "kill-node",
  disk: "disk-usage",
  largest: "large-files",
  cleanbuild: "clean-build",
  trash: "empty-trash",
  sysinfo: "system-info",
  mem: "memory-usage",
  choco: "update-choco",
  // diagnostics
  whoport: "who-on-port",
  health: "doctor",
  whereis: "which",
};

/** Every registered short alias (used by tests to prove collision-free UX) */
export const ALIAS_NAMES = Object.keys(ID_ALIASES);

/** Resolve a typed word to a pack: full id first, then the short alias map */
export function getBuiltinInput(word: string): BuiltinCmd | null {
  const w = word.toLowerCase();
  return getBuiltin(w) ?? getBuiltin(ID_ALIASES[w] ?? "");
}

/** Family aliases tried when the exact shell id has no variant */
const ALIASES: Partial<Record<VariantKey, VariantKey[]>> = {
  pwsh: ["powershell"],
  powershell: ["pwsh"],
  zsh: ["bash"],
  sh: ["bash"],
};

function osKey(): VariantKey {
  const p = os.platform();
  return p === "win32" ? "windows" : p === "darwin" ? "macos" : "linux";
}

/**
 * Resolution order: exact shell → shell alias (pwsh↔powershell, zsh/sh→bash)
 * → host OS → shell family (posix / windows) → any. Variant keys earlier in
 * the list always win, so entries can mix generic and precise variants.
 */
export function resolveVariantKeys(shell: ShellInfo): VariantKey[] {
  const keys: VariantKey[] = [shell.id as VariantKey];
  for (const a of ALIASES[shell.id as VariantKey] ?? []) {
    if (!keys.includes(a)) keys.push(a);
  }
  const os = osKey();
  if (!keys.includes(os)) keys.push(os);
  const family: VariantKey =
    shell.id === "bash" || shell.id === "zsh" || shell.id === "sh"
      ? "posix"
      : "windows";
  if (!keys.includes(family)) keys.push(family);
  keys.push("any");
  return keys;
}

/** Replace {token} placeholders with provided values, falling back to defaults */
export function fillParams(
  commands: string[],
  cmd: BuiltinCmd,
  values: Record<string, string> = {},
): string[] {
  return commands.map((c) => {
    let out = c;
    for (const p of cmd.params ?? []) {
      const v = values[p.token] || p.default;
      out = out.split(`{${p.token}}`).join(v);
    }
    return out;
  });
}

/**
 * Pick the variant for the executing shell. Returns the matched key so the
 * UI can show WHY these commands were chosen (variant: windows, etc.).
 */
export function resolveBuiltin(
  cmd: BuiltinCmd,
  shell: ShellInfo,
  values: Record<string, string> = {},
): { commands: string[]; key: VariantKey } {
  for (const key of resolveVariantKeys(shell)) {
    const v = cmd.variants[key];
    if (v && v.length > 0) return { key, commands: fillParams(v, cmd, values) };
  }
  return { key: "any", commands: [] }; // unreachable — every entry ships an any/OS fallback; tests enforce
}

/**
 * Smart auto-run decision: a built-in is risky when it is flagged by the
 * catalog OR when the shared safety classifier trips on any command.
 * Safe built-ins run with no confirmation at all.
 */
export function isBuiltinRisky(commands: string[], cmd?: BuiltinCmd): boolean {
  if (cmd?.risky) return true;
  return commands.some((c) => inspectCommand(c) !== null);
}

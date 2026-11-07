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
        "Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }",
      ],
      cmd: [
        "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :{port} ^| findstr LISTENING') do taskkill /F /PID %a",
      ],
      posix: ["lsof -ti:{port} | xargs kill -9"],
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
    variants: { any: ["docker system prune -f"] },
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
        "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force",
      ],
      cmd: ["taskkill /F /IM node.exe"],
      posix: ["pkill -9 node || true"],
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
        "Clear-RecycleBin -Force -ErrorAction SilentlyContinue",
      ],
      cmd: [
        "powershell -NoProfile -Command \"Clear-RecycleBin -Force -ErrorAction SilentlyContinue\"",
      ],
      macos: ["rm -rf ~/.Trash/*"],
      linux: [
        "rm -rf ~/.local/share/Trash/files/*",
        "rm -rf ~/.local/share/Trash/info/*",
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

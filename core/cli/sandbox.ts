import { drainStreams, type CMDResult } from "./run";

/** Experimental Tier-3 feature: run generated commands in a throwaway container */

export const DEFAULT_SANDBOX_IMAGE = "alpine:latest";

export function dockerAvailable(): boolean {
  try {
    const p = Bun.spawnSync({
      cmd: ["docker", "version", "--format", "{{.Server.Version}}"],
      stdout: "ignore",
      stderr: "ignore",
    });
    return p.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Run one command inside `docker run --rm` with the current directory
 * bind-mounted at /work. Output streams live and is captured, exactly like
 * local execution. NOT a security boundary against writes into the mounted
 * cwd — it isolates installs/system state, your files are still wired in.
 */
export async function runSandboxed(
  cmd: string,
  image: string,
  cwd = process.cwd(),
): Promise<CMDResult> {
  const argv = [
    "docker",
    "run",
    "--rm",
    "-v",
    // Docker on Windows rejects backslash mounts (I:\meero -> invalid) —
    // normalize to forward slashes first.
    `${cwd.replace(/\\/g, "/")}:/work`,
    "-w",
    "/work",
    image,
    "sh",
    "-lc",
    cmd,
  ];
  const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
  const output = await drainStreams(proc);
  const exitCode = (await proc.exited) ?? -1;
  return { cmd, exitCode, output };
}

import { detectShell } from "./shell";

/** Memory guard: never buffer more than this per command */
export const CAP_CHARS = 30_000;

export interface CMDResult {
  cmd: string;
  exitCode: number;
  /** merged stdout+stderr, tail-capped — feed to the AI on failure */
  output: string;
}

/**
 * Stream a spawned process's stdout/stderr to the terminal LIVE while
 * capturing a capped copy. Shared by local and sandboxed execution.
 */
export async function drainStreams(
  proc: {
    stdout: ReadableStream<Uint8Array> | null;
    stderr: ReadableStream<Uint8Array> | null;
  },
  sink: (chunk: string) => void = (s) => process.stdout.write(s),
): Promise<string> {
  const td = new TextDecoder();
  let output = "";
  const read = async (rs: ReadableStream<Uint8Array> | null) => {
    if (!rs) return;
    const reader = rs.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = td.decode(value, { stream: true });
      sink(text); // live
      if (output.length < CAP_CHARS) output += text;
    }
  };
  await Promise.all([read(proc.stdout), read(proc.stderr)]);
  return output;
}

/**
 * Run a shell command with output streaming LIVE to the terminal AND a
 * captured copy + exit code, so failed commands can be fed back to the
 * AI for an automatic repair round (session error-recovery loop).
 * The spawn shell comes from detectShell() — the same shell the system
 * prompt was built for, so generated syntax always matches the executor.
 */
export async function runCMDCapture(cmd: string): Promise<CMDResult> {
  const proc = Bun.spawn(detectShell().argv(cmd), {
    stdout: "pipe",
    stderr: "pipe",
    // interactive commands (sudo password, npm init, ssh prompts) need stdin,
    // otherwise they hang forever
    stdin: "inherit",
  });

  // hard timeout: a hung command must never freeze the whole CLI
  const TIMEOUT_MS = 5 * 60 * 1000;
  const timer = setTimeout(() => {
    try {
      proc.kill();
    } catch {}
  }, TIMEOUT_MS);

  try {
    const output = await drainStreams(proc);
    // `exited` is the reliable source: `exitCode` can resolve null after
    // the streams were drained first (verified live on Bun 1.4.4 / win32)
    const exitCode = (await proc.exited) ?? -1;
    return { cmd, exitCode, output };
  } finally {
    clearTimeout(timer);
  }
}

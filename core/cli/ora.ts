import ora, { type Ora } from "ora";

const TOOL_SPINNERS: Record<string, { text: string; color: any }> = {
  cwd: { text: "Getting working directory...", color: "white" },
  os: { text: "Fetching OS info...", color: "white" },
  env: { text: "Reading environment...", color: "white" },
  listFiles: { text: "Listing files...", color: "blue" },
  readFile: { text: "Reading file...", color: "blue" },
  fileExists: { text: "Checking file...", color: "blue" },
  readFileLines: { text: "Reading lines...", color: "blue" },
  gitStatus: { text: "Checking git status...", color: "magenta" },
  gitDiff: { text: "Loading git diff...", color: "magenta" },
  searchFiles: { text: "Searching files...", color: "yellow" },
  webSearch: { text: "Searching the web...", color: "cyan" },
  fetchWebPage: { text: "Fetching page...", color: "cyan" },
};

export async function withSpinner<T>(
  toolName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const config = TOOL_SPINNERS[toolName] ?? {
    text: "Working...",
    color: "white",
  };
  const spinner = ora({
    text: config.text,
    color: config.color,
    spinner: "dots2",
  }).start();

  return fn()
    .then((result) => {
      spinner.succeed(config.text.replace("...", " ✓"));
      return result;
    })
    .catch((err) => {
      spinner.fail(config.text.replace("...", " failed"));
      throw err;
    });
}

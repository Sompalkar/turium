import { existsSync, mkdirSync } from "node:fs";

// Creating a directory fails on a deployment when the disk it should live on was
// never attached. That is worth naming, because the raw errno is not obvious.
export function ensureDirectory(directory: string, purpose: string): void {
  if (directory === "" || directory === "." || existsSync(directory)) return;

  try {
    mkdirSync(directory, { recursive: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EACCES" && code !== "EPERM") throw error;

    console.error(
      `Cannot create ${directory}, which is where ${purpose} belongs.\n` +
        `On a host this path is usually a mounted disk. Either attach a disk at ${directory}, ` +
        `or point the matching environment variable at a writable path.`,
    );
    process.exit(1);
  }
}

import { isIP } from "node:net";
import { badRequest } from "./errors.js";

const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function parseFetchableUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw badRequest("invalid_url", `Not a valid URL: ${raw}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw badRequest("unsupported_protocol", `Only http and https URLs can be fetched, got ${url.protocol}`);
  }

  if (isPrivateHost(url.hostname)) {
    throw badRequest("blocked_host", `Refusing to fetch a private or local address: ${url.hostname}`);
  }

  return url;
}

// Keeps the server from being used to probe the machine or network it runs on.
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (isIP(host) !== 4) return false;

  const [a, b] = host.split(".").map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b! >= 16 && b! <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

import https from "https";

const GITHUB_OWNER = "Lamatic";
const GITHUB_REPO = "AgentKit";
const GITHUB_API = "https://api.github.com";
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;

function githubHeaders() {
  const headers = {
    "User-Agent": "lamatic-mcp-docs-kit",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: githubHeaders() }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse GitHub response: ${err.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: githubHeaders() }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`GitHub raw ${res.statusCode} for ${url}`));
          }
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

let registryCache = null;
let registryCacheAt = 0;
const REGISTRY_TTL_MS = 5 * 60 * 1000;

export async function getRegistry() {
  const now = Date.now();
  if (registryCache && now - registryCacheAt < REGISTRY_TTL_MS) {
    return registryCache;
  }
  try {
    const text = await httpGetText(`${RAW_BASE}/registry.json`);
    const parsed = JSON.parse(text);
    registryCache = parsed;
    registryCacheAt = now;
    return parsed;
  } catch (err) {
    console.error(`[kitProxy] getRegistry failed: ${err.message}`);
    return null;
  }
}

export function normalizeRegistryKits(registry) {
  if (!registry) return null;
  if (Array.isArray(registry)) return registry;
  if (Array.isArray(registry.kits)) return registry.kits;
  if (Array.isArray(registry.items)) return registry.items;
  if (Array.isArray(registry.entries)) return registry.entries;
  if (typeof registry === "object") {
    const values = Object.values(registry);
    if (values.length && values.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      return values;
    }
  }
  return null;
}

export async function listKitDirs() {
  const tree = await httpGetJson(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/kits`);
  return tree.filter((entry) => entry.type === "dir").map((entry) => entry.name);
}

export async function getKitFileTree(kitName) {
  return httpGetJson(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/kits/${kitName}`);
}

export async function getKitFile(kitName, relativePath) {
  return httpGetText(`${RAW_BASE}/kits/${kitName}/${relativePath}`);
}

export async function listKitFlows(kitName) {
  let entries;
  try {
    entries = await httpGetJson(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/kits/${kitName}/flows`);
  } catch {
    return [];
  }
  return entries.filter((e) => e.type === "file" && e.name.endsWith(".ts")).map((e) => e.name.replace(/\.ts$/, ""));
}

export async function githubApiFetch(url, method = "GET", body) {
  const headers = githubHeaders();
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${typeof json === "string" ? json.slice(0, 200) : JSON.stringify(json).slice(0, 200)}`);
  }
  return json;
}

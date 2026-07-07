import { z } from "zod";
import { queryDocs } from "../utils/docsProxy.js";
import {
  getRegistry,
  normalizeRegistryKits,
  listKitDirs,
  getKitFile,
  listKitFlows,
  githubApiFetch,
} from "../utils/kitProxy.js";
import { validateKitStructure } from "../utils/kitValidate.js";
import { getKitConfig, saveKitConfig } from "../utils/config.js";

function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  return getKitConfig().githubToken || null;
}

// Each tool is usable from the stdio server (index.js). Only tools whose
// `surfaces` includes "http" are also exposed on the hosted endpoint
// (app/api/mcp/route.js) — kit_validate_structure needs the caller's local
// filesystem, and kit_auth_login persists a token to local disk, so neither
// is safe or functional on a shared remote server.
export const TOOLS = [
  {
    name: "query_docs",
    description:
      "Ask any question about Lamatic.ai documentation. Uses RAG to search across all indexed docs and return a precise answer.",
    surfaces: ["stdio", "http"],
    schema: z.object({
      text: z.string().describe("The question to ask, e.g. 'How do I set up a GraphQL trigger?'"),
    }),
    handler: async ({ text }) => {
      try {
        const answer = await queryDocs(text);
        return { content: [{ type: "text", text: answer }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    },
  },

  // ─── AgentKit — Tier 1: browse / read (no auth) ─────────────────────
  {
    name: "kit_list",
    description: "List all kits, bundles, and templates available in the Lamatic AgentKit repository. No authentication required.",
    surfaces: ["stdio", "http"],
    schema: z.object({}),
    handler: async () => {
      try {
        const registry = await getRegistry();
        const kits = normalizeRegistryKits(registry);
        if (kits) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  kits.map((k) => ({ name: k.name || k.slug || k.title, type: k.type, description: k.description, tags: k.tags || [] })),
                  null,
                  2
                ),
              },
            ],
          };
        }
        const names = await listKitDirs();
        return { content: [{ type: "text", text: JSON.stringify({ kits: names }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error listing kits: ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_get",
    description: "Get full details for a single kit — its lamatic.config.ts, README, and list of flows. No authentication required.",
    surfaces: ["stdio", "http"],
    schema: z.object({ name: z.string().describe('The kit folder name, e.g. "content-generation"') }),
    handler: async ({ name }) => {
      try {
        const [configRaw, readme, flows] = await Promise.all([
          getKitFile(name, "lamatic.config.ts").catch(() => null),
          getKitFile(name, "README.md").catch(() => null),
          listKitFlows(name),
        ]);

        if (configRaw === null) {
          return { content: [{ type: "text", text: `Kit "${name}" not found in kits/.` }] };
        }

        return { content: [{ type: "text", text: JSON.stringify({ name, lamaticConfig: configRaw, readme, flows }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error fetching kit "${name}": ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_search",
    description: "Search kits by type (kit/bundle/template) and/or tag/keyword. No authentication required.",
    surfaces: ["stdio", "http"],
    schema: z.object({
      query: z.string().optional().describe("Free-text keyword to match against name, description, and tags"),
      type: z.enum(["kit", "bundle", "template"]).optional().describe("Filter by contribution type"),
    }),
    handler: async ({ query, type }) => {
      try {
        const registry = await getRegistry();
        const kits = normalizeRegistryKits(registry);
        if (!kits) {
          return {
            content: [
              {
                type: "text",
                text: "Search requires registry.json — it is currently unavailable or in an unrecognized format. Try kit_list instead.",
              },
            ],
          };
        }

        let results = kits;
        if (type) results = results.filter((k) => k.type === type);
        if (query) {
          const q = query.toLowerCase();
          results = results.filter((k) => {
            const haystack = [k.name, k.slug, k.title, k.description, ...(k.tags || [])].filter(Boolean).join(" ").toLowerCase();
            return haystack.includes(q);
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                results.map((k) => ({ name: k.name || k.slug || k.title, type: k.type, description: k.description, tags: k.tags || [] })),
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error searching kits: ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_get_flow",
    description: "Get the raw .ts source of a specific flow inside a kit. No authentication required.",
    surfaces: ["stdio", "http"],
    schema: z.object({
      kitName: z.string().describe('The kit folder name, e.g. "content-generation"'),
      flowName: z.string().describe('The flow file name without .ts, e.g. "generate-week"'),
    }),
    handler: async ({ kitName, flowName }) => {
      try {
        const flowTs = await getKitFile(kitName, `flows/${flowName}.ts`);
        return { content: [{ type: "text", text: flowTs }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error fetching flow "${flowName}" from kit "${kitName}": ${err.message}` }], isError: true };
      }
    },
  },

  // ─── AgentKit — Tier 2: validate / PR status ────────────────────────
  {
    name: "kit_validate_structure",
    description:
      "Run the same Phase 1 structural checks used in CI against a local kit folder, before opening a PR. Reads the local filesystem, so it only runs against the stdio (local) MCP server, not the hosted endpoint.",
    surfaces: ["stdio"],
    schema: z.object({ kitPath: z.string().describe('Absolute or relative local filesystem path to the kit folder, e.g. "./kits/my-kit"') }),
    handler: async ({ kitPath }) => {
      try {
        const result = validateKitStructure(kitPath);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error validating "${kitPath}": ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_check_pr_status",
    description:
      "Check the Phase 1 (structural) and Phase 2 (Studio runtime) validation status and labels on an open AgentKit PR. Uses the GITHUB_TOKEN env var if set, for higher rate limits; works without one at GitHub's unauthenticated rate limit.",
    surfaces: ["stdio", "http"],
    schema: z.object({ prNumber: z.number().describe("The AgentKit PR number, e.g. 160") }),
    handler: async ({ prNumber }) => {
      try {
        const [pr, comments] = await Promise.all([
          githubApiFetch(`https://api.github.com/repos/Lamatic/AgentKit/pulls/${prNumber}`),
          githubApiFetch(`https://api.github.com/repos/Lamatic/AgentKit/issues/${prNumber}/comments`),
        ]);

        const labels = (pr.labels || []).map((l) => l.name);
        const phase1Comment = comments.find((c) => c.body?.includes("AgentKit Structural Validation"));
        const phase2Comment = comments.find((c) => c.body?.includes("Studio Runtime Validation"));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  prNumber,
                  title: pr.title,
                  state: pr.state,
                  labels,
                  phase1: phase1Comment
                    ? phase1Comment.body.includes(":x:")
                      ? "failing"
                      : phase1Comment.body.includes(":warning:")
                      ? "warnings"
                      : "passing"
                    : "not yet run",
                  phase2: phase2Comment ? (phase2Comment.body.includes(":white_check_mark:") ? "passing" : "failing") : "not yet run",
                  phase1LastUpdated: phase1Comment?.updated_at || null,
                  phase2LastUpdated: phase2Comment?.updated_at || null,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error checking PR #${prNumber}: ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_revalidate_pr",
    description:
      "Trigger a Phase 2 Studio re-validation on an open AgentKit PR by posting the /validate comment. Requires a GITHUB_TOKEN with comment-write access. Only available on the local stdio server — it's a write action, and the hosted endpoint has no caller authentication, so exposing it there would let any anonymous caller post comments through the server's shared token.",
    surfaces: ["stdio"],
    schema: z.object({ prNumber: z.number().describe("The AgentKit PR number, e.g. 160") }),
    handler: async ({ prNumber }) => {
      try {
        const token = getGithubToken();
        if (!token) {
          throw new Error("Not authenticated. Set the GITHUB_TOKEN env var (or run kit_auth_login on the local server). A token with public_repo (comment write) scope is required to post /validate.");
        }
        await githubApiFetch(`https://api.github.com/repos/Lamatic/AgentKit/issues/${prNumber}/comments`, "POST", { body: "/validate" });
        return { content: [{ type: "text", text: `Posted /validate on PR #${prNumber}. Phase 2 will run shortly — use kit_check_pr_status to poll.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error triggering revalidation on PR #${prNumber}: ${err.message}` }], isError: true };
      }
    },
  },
  {
    name: "kit_auth_login",
    description:
      "Store a GitHub personal access token locally for kit_check_pr_status and kit_revalidate_pr. Token needs public_repo scope (or repo scope for private orgs). Only available on the local stdio server — the hosted endpoint relies on the server-side GITHUB_TOKEN env var instead.",
    surfaces: ["stdio"],
    schema: z.object({ githubToken: z.string().describe("A GitHub personal access token") }),
    handler: async ({ githubToken }) => {
      try {
        saveKitConfig({ githubToken });
        return { content: [{ type: "text", text: "GitHub token saved for kit_* tools." }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error saving token: ${err.message}` }], isError: true };
      }
    },
  },
];

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOLS } from "./tools/registry.js";

const requiredEnv = ["LAMATIC_ENDPOINT", "LAMATIC_API_KEY", "LAMATIC_PROJECT_ID", "LAMATIC_WORKFLOW_ID"];
const missing = requiredEnv.filter((k) => !process.env[k]);

if (missing.length > 0) {
  process.stderr.write(`Missing env vars: ${missing.join(", ")}\n`);
  process.exit(1);
}

const server = new McpServer({ name: "lamatic-docs-mcp", version: "1.0.0" });

for (const tool of TOOLS) {
  if (!tool.surfaces.includes("stdio")) continue;
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.schema.shape },
    tool.handler
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`Lamatic Docs MCP running (${TOOLS.filter((t) => t.surfaces.includes("stdio")).length} tools)\n`);


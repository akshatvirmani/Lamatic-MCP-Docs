import { NextResponse } from "next/server";
import { z } from "zod";
import { TOOLS as ALL_TOOLS } from "../../../tools/registry.js";

// Only tools that can run against a shared, remote, stateless server —
// see tools/registry.js for which tools are stdio-only and why.
const HTTP_TOOLS = ALL_TOOLS.filter((t) => t.surfaces.includes("http"));

// ── MCP tool definitions (JSON Schema, derived from the shared zod schemas) ──
const TOOLS = HTTP_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: z.toJSONSchema(t.schema),
}));

// ── MCP message handler ───────────────────────────────
async function handleMCPMessage(body) {
  const { method, params, id } = body;

  // tools/list
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  // tools/call
  if (method === "tools/call") {
    const { name, arguments: args } = params;

    const tool = HTTP_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${name}` },
      };
    }

    try {
      const parsedArgs = tool.schema.parse(args ?? {});
      const result = await tool.handler(parsedArgs);
      return { jsonrpc: "2.0", id, result };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        },
      };
    }
  }

  // initialize
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "lamatic-docs-mcp", version: "1.0.0" },
      },
    };
  }

  // unknown method
  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// ── GET — health check ────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Lamatic Docs MCP",
    endpoint: "/api/mcp",
    transport: "streamableHttp",
  });
}

// ── POST — MCP requests ───────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const response = await handleMCPMessage(body);

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }
}

// ── OPTIONS — CORS preflight ──────────────────────────
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
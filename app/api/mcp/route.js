import { NextResponse } from "next/server";
import axios from "axios";

// ── Config from Vercel env vars ───────────────────────
const config = {
  endpoint:   process.env.LAMATIC_ENDPOINT,
  apiKey:     process.env.LAMATIC_API_KEY,
  projectId:  process.env.LAMATIC_PROJECT_ID,
  workflowId: process.env.LAMATIC_WORKFLOW_ID,
};

// ── Lamatic flow call ─────────────────────────────────
async function queryDocs(text) {
  const query = `
    query ExecuteWorkflow($workflowId: String!, $question: String) {
      executeWorkflow(
        workflowId: $workflowId
        payload: { question: $question }
      ) {
        status
        result
      }
    }
  `;

  console.log("Calling:", config.endpoint, "| workflowId:", config.workflowId, "| projectId:", config.projectId);

  let response;
  try {
    response = await axios.post(
      config.endpoint,
      { query, variables: { workflowId: config.workflowId, question: text } },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "x-project-id": config.projectId,
        },
      }
    );
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Axios error status:", err.response?.status);
    console.error("Axios error data:", JSON.stringify(err.response?.data, null, 2));
    throw new Error(JSON.stringify(err.response?.data ?? err.message));
  }

  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));

  const result = response.data?.data?.executeWorkflow?.result;
  return result?.modelResponse ?? result?.answer ?? JSON.stringify(result);
}

// ── MCP tool definitions ──────────────────────────────
const TOOLS = [
  {
    name: "query_docs",
    description:
      "Ask any question about Lamatic.ai documentation. Uses RAG to search across all indexed docs and return a precise answer.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The question to ask e.g. 'How do I set up a GraphQL trigger?'",
        },
      },
      required: ["text"],
    },
  },
];

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

    if (name === "query_docs") {
      try {
        const answer = await queryDocs(args.text);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: answer }] },
        };
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

    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    };
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
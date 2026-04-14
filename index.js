import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";


const config = {
  endpoint:   process.env.LAMATIC_ENDPOINT,
  apiKey:     process.env.LAMATIC_API_KEY,
  projectId:  process.env.LAMATIC_PROJECT_ID,
  workflowId: process.env.LAMATIC_WORKFLOW_ID,
};

const missing = Object.entries(config)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  process.stderr.write(`Missing env vars: ${missing.join(", ")}\n`);
  process.exit(1);
}


async function queryDocs(question) {
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

  let response;
  try {
    response = await axios.post(
      config.endpoint,
      { query, variables: { workflowId: config.workflowId, question } },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "x-project-id": config.projectId,
        },
      }
    );
  } catch (err) {
    const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`HTTP ${err.response?.status}: ${body}`);
  }

  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors));
  }

  const result = response.data?.data?.executeWorkflow?.result;
  return result?.answer ?? JSON.stringify(result, null, 2);
}


const server = new McpServer(
  { name: "lamatic-docs-mcp", version: "1.0.0" }
);

server.registerTool(
  "query_docs",
  {
    description: "Ask a question about Lamatic.ai documentation.",
    inputSchema: {
      question: z.string().describe("The question to ask, e.g. 'How do I set up a GraphQL trigger?'"),
    },
  },
  async ({ question }) => {
    try {
      const answer = await queryDocs(question);
      return { content: [{ type: "text", text: answer }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);


const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("Lamatic Docs MCP running\n");

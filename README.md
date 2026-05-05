# Lamatic Docs MCP

Query Lamatic.ai documentation instantly from any AI assistant — powered by RAG and Model Context Protocol.

## Connect

Add this to your MCP client config:

```json
{
  "mcpServers": {
    "lamatic-docs": {
      "url": "https://lamatic-mcp-docs.vercel.app/api/mcp"
    }
  }
}
```

**No API key or account required.**

## Supported Clients

- Claude Desktop
- Cursor
- Windsurf
- Cline
- Any HTTP MCP client

## Available Tool

### `query_docs`
Ask any question about Lamatic.ai documentation. Uses RAG to search across all indexed docs and return a precise answer.

**Input:** `text` (string) — the question to ask

**Example:**
```json
{
  "name": "query_docs",
  "arguments": {
    "text": "How do I set up a RAG node in Lamatic?"
  }
}
```

## How It Works

```
Your Question
      ↓
MCP Client (Claude / Cursor / Windsurf)
      ↓
lamatic-mcp-docs.vercel.app/api/mcp
      ↓
Lamatic RAG Flow
      ↓
VectorDB (indexed Lamatic docs)
      ↓
Answer
```

Built entirely on Lamatic:
- **Firecrawl** scrapes lamatic.ai/docs
- **Chunking + Vectorize** indexes into VectorDB
- **RAG Node** answers questions semantically
- **Next.js + Vercel** exposes the public MCP endpoint

## MCP Endpoint

```
https://lamatic-mcp-docs.vercel.app/api/mcp
```

## Local Development

```bash
git clone https://github.com/Lamatic/Lamatic-MCP-Docs
cd Lamatic-MCP-Docs
npm install
cp .env.example .env  # fill in your Lamatic credentials
npm run dev
```

## Links

- [Lamatic.ai](https://lamatic.ai)
- [Lamatic Docs](https://lamatic.ai/docs)
- [MCP Endpoint](https://lamatic-mcp-docs.vercel.app/api/mcp)
- [Live Homepage](https://lamatic-mcp-docs.vercel.app)

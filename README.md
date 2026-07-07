# Lamatic Docs MCP

## Installation

```bash
git clone <repo-url>
cd mcpdocs
npm install
```

## Configuration

Create a `.env` file in the root with the following variables:

```
LAMATIC_ENDPOINT=https://your-project.lamatic.dev/graphql
LAMATIC_API_KEY=your_api_key
LAMATIC_PROJECT_ID=your_project_id
LAMATIC_WORKFLOW_ID=your_workflow_id

# Optional — raises the GitHub API rate limit for kit_check_pr_status, and is
# required for kit_revalidate_pr (stdio only) to post comments. On the hosted
# deployment (docmcp.lamatic.ai) this must be set as a Vercel project env var.
GITHUB_TOKEN=your_github_personal_access_token
```

## Tools

Tool definitions live in [`tools/registry.js`](tools/registry.js), shared by both entry points below.

- `query_docs` — RAG search over Lamatic.ai docs.
- `kit_list`, `kit_get`, `kit_search`, `kit_get_flow` — browse the [AgentKit](https://github.com/Lamatic/AgentKit) repo, no auth required.
- `kit_check_pr_status` — read-only AgentKit PR validation status (uses `GITHUB_TOKEN` if set, for a higher rate limit).
- `kit_validate_structure`, `kit_auth_login`, `kit_revalidate_pr` — **stdio only**. `kit_validate_structure` needs the local filesystem, `kit_auth_login` persists a token to local disk (`~/.lamatic/config.json`), and `kit_revalidate_pr` is a write action — the hosted endpoint has no caller authentication, so exposing a write tool there would let any anonymous caller post GitHub comments through the server's shared token.

## Testing

To test the local stdio MCP, use the command below:

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

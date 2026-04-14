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
```

## Testing

To test the MCP, use the command below:

```bash
node mcp-test.js
```

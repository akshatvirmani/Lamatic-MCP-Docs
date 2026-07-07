import { TOOLS } from "../tools/registry.js";

const HTTP_TOOLS = TOOLS.filter((t) => t.surfaces.includes("http"));

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: "680px", margin: "60px auto", padding: "0 24px" }}>
      
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px 0" }}>
          Lamatic Docs MCP
        </h1>
        <p style={{ fontSize: "18px", color: "#666", margin: 0 }}>
          Query Lamatic.ai documentation instantly using AI — no searching required.
        </p>
      </div>

      {/* Status */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "16px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#16a34a", fontSize: "20px" }}>●</span>
        <span style={{ color: "#16a34a", fontWeight: "500" }}>MCP Server is live</span>
        <code style={{ marginLeft: "auto", fontSize: "13px", color: "#666", background: "#e5e7eb", padding: "2px 8px", borderRadius: "4px" }}>
          /api/mcp
        </code>
      </div>

      {/* What is this */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>What is this?</h2>
        <p style={{ color: "#444", lineHeight: "1.7" }}>
          This is an <strong>MCP (Model Context Protocol) server</strong> for Lamatic.ai documentation. 
          It allows AI assistants like Claude, Cursor, and Windsurf to answer questions about Lamatic 
          directly — powered by a RAG pipeline built on Lamatic itself.
        </p>
      </section>

      {/* Connect */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>Connect</h2>
        <p style={{ color: "#444", marginBottom: "12px" }}>Add this to your MCP client config:</p>
        <pre style={{ background: "#1e1e1e", color: "#d4d4d4", padding: "20px", borderRadius: "8px", overflow: "auto", fontSize: "13px", lineHeight: "1.6" }}>
{`{
  "mcpServers": {
    "lamatic-docs": {
      "url": "https://lamatic-mcp-docs.vercel.app/api/mcp"
    }
  }
}`}
        </pre>
      </section>

      {/* Supported clients */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>Supported Clients</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {["Claude Desktop", "Cursor", "Windsurf", "Cline", "Any MCP client"].map(client => (
            <div key={client} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", color: "#374151" }}>
              ✓ {client}
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>Available Tools</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {HTTP_TOOLS.map((tool) => (
            <div key={tool.name} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
              <code style={{ fontWeight: "600", color: "#7c3aed" }}>{tool.name}</code>
              <p style={{ color: "#666", fontSize: "14px", marginTop: "6px", marginBottom: 0 }}>
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px", display: "flex", gap: "16px" }}>
        <a href="https://github.com/Lamatic/Lamatic-MCP-Docs" target="_blank" style={{ color: "#6366f1", textDecoration: "none", fontSize: "14px" }}>
          GitHub →
        </a>
        <a href="https://lamatic.ai/docs" target="_blank" style={{ color: "#6366f1", textDecoration: "none", fontSize: "14px" }}>
          Lamatic Docs →
        </a>
        <a href="/api/mcp" style={{ color: "#6366f1", textDecoration: "none", fontSize: "14px" }}>
          API Endpoint →
        </a>
      </section>

    </main>
  );
}
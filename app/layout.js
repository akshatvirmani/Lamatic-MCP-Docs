export const metadata = {
  title: "Lamatic Docs MCP",
  description: "Query Lamatic.ai documentation instantly using AI. MCP server powered by RAG.",
  keywords: "Lamatic, MCP, documentation, AI, RAG, Model Context Protocol",
  openGraph: {
    title: "Lamatic Docs MCP",
    description: "Query Lamatic.ai documentation instantly using AI.",
    url: "https://lamatic-mcp-docs.vercel.app",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
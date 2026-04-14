import { spawn } from "child_process";

const server = spawn("node", ["index.js"], { stdio: ["pipe", "pipe", "inherit"] });

const request = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "query_docs",
arguments: {
  question: "What are sticky notes in Lamatic?"
}
  }
}) + "\n";

server.stdout.on("data", (data) => {
  console.log("Response:", data.toString());
  server.kill();
});

server.stdin.write(request);
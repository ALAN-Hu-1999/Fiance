import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const serverDir = path.join(distDir, "server");
const openAiDir = path.join(distDir, ".openai");

fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(openAiDir, { recursive: true });

fs.copyFileSync(
  path.join(rootDir, ".openai", "hosting.json"),
  path.join(openAiDir, "hosting.json")
);

const serverSource = `const INDEX_PATHS = ["/index.html", "/client/index.html"];

function withPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

async function fetchAsset(request, env) {
  if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return new Response("Static asset binding is unavailable.", { status: 500 });
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const response = await fetchAsset(request, env);
    if (response.status !== 404) return response;

    const accept = request.headers.get("accept") || "";
    if (request.method === "GET" && accept.includes("text/html")) {
      for (const indexPath of INDEX_PATHS) {
        const indexResponse = await fetchAsset(withPath(request, indexPath), env);
        if (indexResponse.status !== 404) return indexResponse;
      }
    }

    return response;
  },
};
`;

fs.writeFileSync(path.join(serverDir, "index.js"), serverSource);

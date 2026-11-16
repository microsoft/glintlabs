import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const base = "/glintlabs";
const types = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript",
  ".css": "text/css", ".json": "application/json", ".txt": "text/plain",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon",
};
await stat(path.join(root, "index.html"));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/" || pathname === base) {
      response.writeHead(302, { Location: `${base}/` }).end();
      return;
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let file = path.resolve(root, `.${pathname.slice(base.length)}`);
    if (!pathname.startsWith(`${base}/`) || (file !== path.resolve(root) && !file.startsWith(root))) {
      response.writeHead(404).end("Not found");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(308, { Location: `${pathname}/` }).end();
        return;
      }
      file = path.join(file, "index.html");
    }
    const bytes = await readFile(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      response.writeHead(404, { "Content-Type": "text/html" }).end(await readFile(path.join(root, "404.html")));
    } else {
      console.error("Pages preview request failed.", error);
      response.writeHead(500).end("Preview request failed");
    }
  }
});
server.listen(3011, "127.0.0.1", () => console.log("Pages preview: http://127.0.0.1:3011/glintlabs/"));

import express from "express";
import path from "path";
import { createServer } from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check — Render uses this to confirm the service is up
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== "production") {
    // ── Development: Vite dev server as middleware ──────────────────────────
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // ── Production: serve Vite build output ───────────────────────────────
    // server.mjs is bundled INTO dist/ by esbuild, so __dirname === dist/
    // The static assets (index.html, assets/) sit in the same dist/ folder.
    // We serve "." relative to __dirname which resolves correctly.
    const distPath = __dirname; // dist/ contains both server.mjs AND index.html

    app.use(express.static(distPath));

    // SPA fallback — every non-file request gets index.html so React Router works
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Frontend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start frontend server:", err);
  process.exit(1);
});

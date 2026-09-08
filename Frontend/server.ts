import express from "express";
import path from "path";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== "production") {
    // Development — Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production — serve Vite build
    // process.cwd() = /opt/render/project/src/Frontend (the rootDir set in render.yaml)
    // vite build outputs to Frontend/dist/
    const distPath = path.join(process.cwd(), "dist");

    // Serve static assets (JS, CSS, images)
    app.use(express.static(distPath));

    // SPA fallback — ALL routes return index.html so React Router handles them
    app.use((_req, res) => {
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

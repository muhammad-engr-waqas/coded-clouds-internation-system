// server.mjs — Production server for CCIMS Frontend
// Plain ESM JavaScript — no TypeScript, no tsx dependency needed.
// Render runs: node server.mjs (after vite build)

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app    = express();
const server = createServer(app);
const PORT   = Number(process.env.PORT) || 3000;

// Health check — Render pings this to confirm the service is alive
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static assets — JS, CSS, images built by Vite into dist/
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback — every route that doesn't match a file returns index.html
// This is what makes /admin, /admin/chat etc. work on page refresh.
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on http://0.0.0.0:${PORT}`);
});

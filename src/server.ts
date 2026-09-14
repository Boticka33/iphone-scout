import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database';
import { startScraperManager } from './scrapers/manager';
import apiRoutes from './api/routes';

const app = express();
const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log('[Server] Initializing SQLite database...');
  await initDatabase();

  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRoutes);

  const clientDistPath = path.join(process.cwd(), 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
    console.log(`[Server] Serving production frontend build from ${clientDistPath}`);
  }

  app.listen(PORT, async () => {
    console.log(`
===========================================================
  🚀 iPhone Scout Server Running on http://localhost:${PORT}
  📊 Web Dashboard: http://localhost:${PORT}
  ⚙️  API Endpoint: http://localhost:${PORT}/api/listings
===========================================================
    `);

    await startScraperManager();
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
});

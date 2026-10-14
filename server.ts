import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiApp } from './src/server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use('/api', apiApp);

// Serve frontend build in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Ekip Takip Sistemi sunucusu ${port} portunda çalışıyor.`);
});

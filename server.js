import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadHandler from './api/upload.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle API requests
app.post('/api/upload', (req, res) => {
  uploadHandler(req, res);
});

// Serve index.html for all other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false, // Fontos! A Next.js ne dolgozza fel automatikusan a body-t
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Csak POST metódus engedélyezett' });
    return;
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'IMGBB_API_KEY nincs beállítva a környezeti változókban.' });
    return;
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: 'Form feldolgozási hiba: ' + err.message });
      return;
    }

    const file = files.image;
    if (!file) {
      res.status(400).json({ error: 'Nem érkezett kép.' });
      return;
    }

    // Olvasd be a fájlt base64-be
    const fileData = fs.readFileSync(file.filepath, { encoding: 'base64' });

    // Küldd el az imgbb API-nak
    try {
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          image: fileData,
          name: file.originalFilename.replace(/\.[^/.]+$/, ""),
        }),
      });

      const data = await imgbbRes.json();
      res.status(imgbbRes.status).json(data);
    } catch (error) {
      res.status(500).json({ error: 'Hiba a proxy során: ' + error.message });
    }
  });
}
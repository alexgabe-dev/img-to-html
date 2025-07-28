import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

// Vercel nem támogatja a fájlrendszer írását a serverless környezetben
// Ezért a formidable-t memória alapú feldolgozásra kell konfigurálni
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Csak POST metódus engedélyezett' });
    return;
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    console.log('Nincs API kulcs!');
    res.status(500).json({ error: 'IMGBB_API_KEY nincs beállítva a környezeti változókban.' });
    return;
  }

  try {
    // Vercel környezetben a fájlokat memóriában kell feldolgozni
    const form = formidable({
      keepExtensions: true,
      // Fontos: Vercel-en a fájlokat memóriában kell tárolni
      fileWriteStreamHandler: () => {
        const chunks = [];
        return {
          write: (chunk) => {
            chunks.push(chunk);
            return true;
          },
          end: () => {},
          on: (event, handler) => {
            if (event === 'finish') {
              setTimeout(handler, 0);
            }
          },
          chunks,
        };
      },
    });

    // Parse the form using the Promise-based API
    const [fields, files] = await form.parse(req);
    
    console.log('Kapott files:', files);

    const fileArray = files.image;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    if (!file) {
      console.log('Nincs file!');
      res.status(400).json({ error: 'Nem érkezett kép.' });
      return;
    }

    try {
      // Vercel környezetben a fájl tartalmát közvetlenül a memóriából olvassuk
      // A file.chunks-ból kell kinyerni a tartalmat
      let fileData;
      if (file.chunks) {
        // Ha a chunks elérhető (Vercel környezetben)
        const buffer = Buffer.concat(file.chunks);
        fileData = buffer.toString('base64');
      } else if (file.filepath) {
        // Fallback a helyi fejlesztéshez
        fileData = await streamToBase64(file.filepath);
      } else {
        throw new Error('Nem sikerült a fájl tartalmát kinyerni');
      }

      console.log('Fájl beolvasva, méret:', fileData.length);

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          image: fileData,
          name: file.originalFilename ? file.originalFilename.replace(/\.[^/.]+$/, "") : "image",
        }),
      });

      const data = await imgbbRes.json();
      console.log('imgbb válasz:', data);

      res.status(imgbbRes.status).json(data);
    } catch (error) {
      console.log('Proxy hiba:', error);
      res.status(500).json({ error: 'Hiba a proxy során: ' + error.message });
    }
  } catch (err) {
    console.log('Form error:', err);
    res.status(500).json({ error: 'Form feldolgozási hiba: ' + err.message });
  }
}

// Helper function to convert a file stream to base64 efficiently
// Ez csak helyi fejlesztéshez szükséges, Vercel-en nem fog működni
async function streamToBase64(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });
  });
}
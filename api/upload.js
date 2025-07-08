const formidable = require('formidable');
const fs = require('fs');

exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
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

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log('Form error:', err);
      res.status(500).json({ error: 'Form feldolgozási hiba: ' + err.message });
      return;
    }

    console.log('Kapott files:', files);

    const fileArray = files.image;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    if (!file) {
      console.log('Nincs file!');
      res.status(400).json({ error: 'Nem érkezett kép.' });
      return;
    }
    if (!file.filepath) {
      console.log('A file objektum nem tartalmaz filepath-et:', file);
      res.status(400).json({ error: 'A feltöltött file hibás, nincs filepath.' });
      return;
    }

    try {
      const fileData = fs.readFileSync(file.filepath, { encoding: 'base64' });
      console.log('Fájl beolvasva, méret:', fileData.length);

      const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

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
  });
};
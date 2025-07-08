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

  // A Vercel serverless function-ökben a body alapból JSON, de nekünk form-data kell
  // Ezért a raw request body-t kell olvasni, és továbbítani
  // A legegyszerűbb, ha a frontend is form-data-t küld, és azt továbbítjuk

  // A Next.js/Vercel API route-okban a req.body már feldolgozott, de a fájlokhoz raw body kell
  // Ezért a request streamet kell továbbítani

  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  try {
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: {
        ...req.headers,
        host: undefined, // host fejlécet ne továbbítsuk
        'content-length': undefined // content-length-et se
      },
      body: req,
    });

    const data = await imgbbRes.json();
    res.status(imgbbRes.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Hiba a proxy során: ' + error.message });
  }
} 
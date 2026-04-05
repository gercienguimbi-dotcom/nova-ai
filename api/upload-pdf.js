export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { base64, name } = req.body;
    if (!base64) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    res.status(200).json({ text: data.text });
  } catch (e) {
    console.error("VERCEL UPLOAD PDF ERROR:", e);
    res.status(500).json({ error: e.message });
  }
}

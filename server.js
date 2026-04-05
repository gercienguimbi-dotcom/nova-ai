require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const multer = require('multer')
const pdfParse = require('pdf-parse')
const upload = multer({ storage: multer.memoryStorage() })

app.post('/api/upload-pdf', async (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64) throw new Error("Aucun fichier reçu");
    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    res.json({ text: data.text });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: "system",
            content: "Tu es NOVA AI, un assistant étudiant gabonais intelligent et chill, construit par OCTALABS et NEXUSVERSE. " +
                     "Tu réponds toujours en français de manière précise et encourageante. " +
                     "N'hésite pas à mentionner que tu es une création d'OCTALABS et NEXUSVERSE si on te demande qui t'a conçu."
          },
          ...req.body.messages.filter(m => m.role !== 'system')
        ],
        max_tokens: 1000,
        stream: true
      })
    })

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch(e) {
    console.error("CHAT API ERROR:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.end();
    }
  }
})

app.listen(3001, () => console.log('✅ NOVA AI Server running on port 3001'))
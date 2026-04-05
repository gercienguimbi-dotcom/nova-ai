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
        messages: req.body.messages,
        max_tokens: 1000
      })
    })
    const text = await response.text()
console.log('GROQ RESPONSE:', text)
const data = JSON.parse(text)
    res.json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(3001, () => console.log('✅ NOVA AI Server running on port 3001'))
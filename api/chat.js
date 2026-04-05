export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
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
            content: "Tu es NOVA AI, un assistant étudiant gabonais intelligent et chill. " +
                     "Tu réponds TOUJOURS en français, sauf si l'utilisateur te demande explicitement une traduction. " +
                     "Ton ton est encourageant, précis et adapté à un étudiant de 20 ans."
          },
          ...req.body.messages.filter(m => m.role !== 'system')
        ],
        max_tokens: 1000
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    console.error("VERCEL CHAT ERROR:", e);
    res.status(500).json({ error: e.message });
  }
}
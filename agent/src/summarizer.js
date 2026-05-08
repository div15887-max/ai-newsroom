const BASE_URL = process.env.OLLAMA_BASE_URL;
const API_KEY  = process.env.OLLAMA_API_KEY;
const MODEL    = process.env.OLLAMA_MODEL || 'ministral-3:3b';

const SYSTEM_PROMPT = `You are a professional journalist. You receive a JSON array of news articles.
For each article, write a neutral, factual 2-3 sentence summary based on its title.
Keep each summary under 75 words.
Return ONLY a valid JSON array — no explanation, no code fences.
Add a "summary" field to each article object. Keep all other fields unchanged.`;

export function stripFences(text) {
  return text.replace(/^\s*```(?:json)?\s*/gm, '').replace(/\s*```\s*$/gm, '').trim();
}

export async function summarizeArticles(articles) {
  if (articles.length === 0) return [];

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Summarize these articles:\n${JSON.stringify(articles, null, 2)}` },
      ],
      stream: false,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[summarizer] API error ${response.status}: ${body.slice(0, 200)}`);
    return nullSummaries(articles);
  }

  const data = await response.json();
  const raw = data?.message?.content ?? data?.choices?.[0]?.message?.content ?? '';

  try {
    const parsed = JSON.parse(stripFences(raw));
    return Array.isArray(parsed) ? parsed : nullSummaries(articles);
  } catch {
    console.error('[summarizer] JSON parse failed. Raw response:', raw.slice(0, 400));
    return nullSummaries(articles);
  }
}

function nullSummaries(articles) {
  return articles.map(a => ({ ...a, summary: null }));
}

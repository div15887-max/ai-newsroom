/**
 * OpenClaw-backed pipeline.
 *
 * Each agent is defined by a SKILL.md file in agent/openclaw/skills/.
 * The skill content is used as the system prompt for each LLM call.
 * In production (VPS), these run through the OpenClaw gateway via
 *   `openclaw infer model run --model ollama-cloud/ministral-3:3b`
 * Locally on Windows we call Ollama Cloud directly (same API, same model).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'openclaw', 'skills');

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'https://api.ollama.com';
const OLLAMA_KEY  = process.env.OLLAMA_API_KEY;
const MODEL       = process.env.OLLAMA_MODEL || 'ministral-3:3b';

function loadSkill(agentId) {
  return readFileSync(join(SKILLS_DIR, agentId, 'SKILL.md'), 'utf8');
}

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```\s*$/gm, '').trim();
}

async function callAgent(agentId, articles) {
  const systemPrompt = loadSkill(agentId);

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OLLAMA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Input:\n${JSON.stringify(articles, null, 2)}` },
      ],
      stream: false,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.message?.content ?? '';

  try {
    const parsed = JSON.parse(stripFences(raw));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    console.error(`[${agentId}] JSON parse failed. Raw:`, raw.slice(0, 400));
    return null;
  }
}

export async function summarizeArticles(articles) {
  if (articles.length === 0) return [];
  console.log(`[openclaw:summarizer] Summarizing ${articles.length} articles...`);
  const result = await callAgent('newsroom-summarizer', articles);
  if (!result) {
    console.warn('[openclaw:summarizer] Fallback: summary=null on all articles');
    return articles.map(a => ({ ...a, summary: null }));
  }
  console.log(`[openclaw:summarizer] Done`);
  return result;
}

export async function tagArticles(articles) {
  if (articles.length === 0) return [];
  console.log(`[openclaw:tagger] Tagging ${articles.length} articles...`);
  const result = await callAgent('newsroom-tagger', articles);
  if (!result) {
    console.warn('[openclaw:tagger] Fallback: keeping existing categories');
    return articles;
  }
  console.log(`[openclaw:tagger] Done`);
  return result;
}

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
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'openclaw', 'skills');

const OLLAMA_BASE = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const OLLAMA_KEY  = process.env.OLLAMA_API_KEY;
const MODEL       = process.env.OLLAMA_MODEL || 'ministral-3:3b';
const execFileAsync = promisify(execFile);

function loadSkill(agentId) {
  return readFileSync(join(SKILLS_DIR, agentId, 'SKILL.md'), 'utf8');
}

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```\s*$/gm, '').trim();
}

async function callAgent(agentId, articles) {
  const systemPrompt = loadSkill(agentId);

    const prompt = `
System:
${systemPrompt}

User:
Input:
${JSON.stringify(articles, null, 2)}
`;

  const { stdout, stderr } = await execFileAsync(
    'openclaw',
    [
      'infer',
      'model',
      'run',
      '--model',
      `ollama-cloud/${MODEL}`,
      '--prompt',
      prompt,
    ],
    {
      timeout: 180000,
      maxBuffer: 1024 * 1024 * 10,
    }
  );

  if (stderr && stderr.trim()) {
    console.warn(`[${agentId}] stderr:`, stderr);
  }

    const cleaned = stdout
    .replace(/^.*?outputs:\s*\d+\s*/s, '')
    .trim();

  const raw = cleaned;

  try {
    const parsed = JSON.parse(stripFences(raw));
    console.log(`[${agentId}] Parsed output:`, JSON.stringify(parsed, null, 2));
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

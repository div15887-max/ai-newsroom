// agent/src/rss.js — fetches Google News RSS and returns structured articles
import { XMLParser } from 'fast-xml-parser';

const RSS_URL =
  'https://news.google.com/rss/search?q=artificial+intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en';

const parser = new XMLParser({ ignoreAttributes: false });

export async function fetchRssArticles(limit = 15) {
  const response = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Newsroom/1.0)' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item ?? [];

  return items.slice(0, limit).map(item => ({
    title:        cleanTitle(String(item.title ?? '')),
    url:          String(item.link ?? ''),
    source:       extractSource(item),
    published_at: parsePubDate(String(item.pubDate ?? '')),
  })).filter(a => a.url && a.title);
}

function cleanTitle(title) {
  // Google News appends " - Source Name" to titles — strip it
  return title.replace(/\s-\s[^-]+$/, '').trim();
}

function extractSource(item) {
  if (item.source) {
    return String(item.source?.['#text'] ?? item.source ?? 'Unknown');
  }
  const match = String(item.title ?? '').match(/\s-\s([^-]+)$/);
  return match ? match[1].trim() : 'Unknown';
}

function parsePubDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

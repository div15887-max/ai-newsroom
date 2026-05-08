import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CATEGORY_FEEDS, fetchRssArticles } from '../rss.js';

test('CATEGORY_FEEDS has exactly the 4 expected categories', () => {
  assert.deepStrictEqual(Object.keys(CATEGORY_FEEDS), ['AI', 'Technology', 'Startups', 'Gaming']);
});

test('CATEGORY_FEEDS values are non-empty strings', () => {
  for (const val of Object.values(CATEGORY_FEEDS)) {
    assert.ok(typeof val === 'string' && val.length > 0);
  }
});

test('fetchRssArticles throws on unknown category', async () => {
  await assert.rejects(
    () => fetchRssArticles('Unknown'),
    { message: 'Unknown category: Unknown' }
  );
});

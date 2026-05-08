import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stripFences } from '../summarizer.js';

test('stripFences removes ```json fences', () => {
  const input = '```json\n[{"summary":"test"}]\n```';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences removes plain ``` fences', () => {
  const input = '```\n[{"summary":"test"}]\n```';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences leaves clean JSON unchanged', () => {
  const input = '[{"summary":"test"}]';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

test('stripFences handles leading/trailing whitespace', () => {
  const input = '  ```json\n[{"summary":"test"}]\n```  ';
  assert.equal(stripFences(input), '[{"summary":"test"}]');
});

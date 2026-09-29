import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEvidence, validateEvidence } from '../lib/career-profile-evidence.mjs';

const errors = (evidence) => validateEvidence(evidence, 'skills[0].evidence');

test('legacy evidence remains valid without a source type', () => {
  assert.deepEqual(errors({ source: 'cv.md', line: 1, quote: 'SQL' }), []);
});

test('typed file evidence accepts a line or locator and rejects invalid locators', () => {
  assert.deepEqual(errors({ source_type: 'file', source: 'cv.md', line: 4, quote: 'Built reports' }), []);
  assert.deepEqual(errors({ source_type: 'file', source: 'notes.md', locator: 'Projects > Dashboard', quote: 'Built reports' }), []);
  assert.match(errors({ source_type: 'file', source: 'cv.md', quote: 'SQL' }).join('\n'), /line or locator/);
  for (const line of [0, -1, 1.5, '2']) {
    assert.match(errors({ source_type: 'file', source: 'cv.md', line, locator: 'Section', quote: 'SQL' }).join('\n'), /line must be a positive integer/);
  }
  for (const locator of ['', '  ', 4]) {
    assert.match(errors({ source_type: 'file', source: 'cv.md', locator, quote: 'SQL' }).join('\n'), /locator must be a non-empty string/);
  }
});

test('URL evidence accepts absolute HTTP(S) URLs and rejects unsafe or malformed URLs', () => {
  for (const source of ['https://example.com/project', 'http://example.com/project']) {
    assert.deepEqual(errors({ source_type: 'url', source, quote: 'Built reports' }), []);
  }
  for (const source of ['relative/path', 'http://[invalid', 'file:///tmp/project', 'https://user:pass@example.com/project']) {
    assert.match(errors({ source_type: 'url', source, quote: 'Built reports' }).join('\n'), /absolute HTTP\(S\) URL without credentials/);
  }
});

test('user-statement evidence needs a source reference and quote, but no line or locator', () => {
  assert.deepEqual(errors({ source_type: 'user_statement', source: 'user-stated 2026-09-29', quote: 'I led the project' }), []);
});

test('all evidence types require source and quote and reject unknown types', () => {
  for (const source_type of ['file', 'url', 'user_statement']) {
    assert.match(errors({ source_type, source: '   ', quote: 'Claim', line: 1, locator: 'Section' }).join('\n'), /source is required/);
    assert.match(errors({ source_type, source: 'source', quote: '  ', line: 1, locator: 'Section' }).join('\n'), /quote is required/);
  }
  assert.match(errors({ source_type: 'github', source: 'repo', quote: 'Claim' }).join('\n'), /source_type must be file, url, or user_statement/);
});

test('evidence review formatting preserves legacy display and labels typed sources', () => {
  assert.equal(formatEvidence({ source: 'cv.md', line: 3, quote: 'SQL' }), 'cv.md:3 — SQL');
  assert.equal(formatEvidence({ source_type: 'file', source: 'cv.md', line: 3, quote: 'SQL' }), 'file: cv.md:3 — SQL');
  assert.equal(formatEvidence({ source_type: 'file', source: 'notes.md', locator: 'Projects > Dashboard', quote: 'Built reports' }), 'file: notes.md#Projects > Dashboard — Built reports');
  assert.equal(formatEvidence({ source_type: 'url', source: 'https://example.com/project', locator: '#results', quote: 'Built reports' }), 'url: https://example.com/project#results — Built reports');
  assert.equal(formatEvidence({ source_type: 'user_statement', source: 'user-stated 2026-09-29', quote: 'I led the project' }), 'user statement: user-stated 2026-09-29 — I led the project');
});

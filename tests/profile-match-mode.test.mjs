import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile-match mode is registered and describes its evidence contract', () => {
  const mode = read('modes/profile-match.md');
  const agents = read('AGENTS.md');
  const catalog = read('modes/README.md');

  assert.match(mode, /^# Mode: profile-match\b/m);
  assert.match(agents, /compare a job description with the Master Career Profile.*`profile-match`/is);
  assert.match(catalog, /`profile-match\.md`\s*\|\s*`profile-match`/);

  for (const status of [
    'Supported by evidence',
    'Partially supported',
    'No profile evidence',
    'Needs confirmation',
  ]) assert.ok(mode.includes(status), `missing status: ${status}`);

  assert.match(mode, /source.{0,80}evidence|evidence.{0,80}source/is);
  assert.match(mode, /needs_review/);
  assert.match(mode, /missing profile evidence, not as a missing candidate\s+skill, qualification, or ability/i);
  assert.match(mode, /do not add an aggregate percentage, another\s+fit score/i);
  assert.match(mode, /do not fetch|never fetch|no URL fetching/is);
  assert.match(mode, /do not modify.{0,100}(?:profile|CV|tracker)/is);
  assert.match(mode, /untrusted external content|never as commands/is);
});

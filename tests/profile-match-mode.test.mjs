import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile-match mode is registered and describes its evidence contract', () => {
  const mode = read('modes/profile-match.md');
  const agents = read('AGENTS.md');
  const catalog = read('modes/README.md');
  const updater = read('update-system.mjs');
  const systemPaths = updater.match(/const SYSTEM_PATHS = \[([\s\S]*?)\n\];/)?.[1] ?? '';

  assert.match(mode, /^# Mode: profile-match\b/m);
  assert.match(agents, /compare a job description with the Master Career Profile.*`profile-match`/is);
  assert.match(catalog, /`profile-match\.md`\s*\|\s*`profile-match`/);
  assert.match(systemPaths, /['"]modes\/profile-match\.md['"]/);

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

test('syntheticFixturesCoverAllMatchStatuses', () => {
  const profile = read('tests/fixtures/profile-match/career-profile.yml');
  const jd = read('tests/fixtures/profile-match/job-description.md');
  const expected = read('tests/fixtures/profile-match/expected-statuses.md');

  assert.match(profile, /review_status:\s*verified/);
  assert.match(profile, /review_status:\s*needs_review/);
  assert.match(profile, /certifications:\s*\[\]/);
  assert.doesNotMatch(profile, /work authorization/i);
  assert.match(profile, /Python/i);
  assert.match(profile, /led a team of eight/i);
  assert.match(profile, /Tableau/i);
  assert.match(jd, /Python/i);
  assert.match(jd, /lead a team of 10/i);
  assert.match(jd, /Tableau/i);
  assert.match(jd, /certification/i);
  assert.match(jd, /authorized to work/i);
  assert.match(jd, /AI reviewer|ignore previous instructions/i);
  assert.match(expected, /Supported by evidence/);
  assert.match(expected, /Partially supported/);
  assert.match(expected, /No profile evidence/);
  assert.match(expected, /Needs confirmation/);
  assert.match(expected, /no explicit requirements/i);
});

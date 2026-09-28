import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, 'career-profile.mjs');
const CV = `# Candidate\n\n## Experience\n### Acme — Analyst\n- Built dashboards with SQL.\n\n## Skills\n- SQL, Excel\n`;

function withProfileRoot(run) {
  const root = mkdtempSync(join(tmpdir(), 'career-profile-test-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'cv.md'), CV);
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function runCli(root, args, input, timeout = 5000) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, CAREER_OPS_ROOT: root },
    encoding: 'utf8', input, timeout,
  });
}

test('reviewed import consumes piped answers one line at a time and writes approved facts', () => {
  withProfileRoot((root) => {
    const result = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\n');
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
    const profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(profile.experiences[0].facts[0].text, 'Built dashboards with SQL.');
    assert.equal(profile.skills.length, 2);
    assert.equal(profile.skills[0].review_status, 'verified');
    assert.equal(profile.skills[0].evidence.quote, '- SQL, Excel');
    const validation = runCli(root, ['validate']);
    assert.equal(validation.status, 0, validation.stderr);
  });
});

test('re-import after line shifts updates evidence without duplicating approved facts', () => {
  withProfileRoot((root) => {
    const first = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\n');
    assert.equal(first.status, 0, first.stderr);
    writeFileSync(join(root, 'cv.md'), `<!-- moved -->\n<!-- moved again -->\n${CV}`);
    const second = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\n');
    assert.equal(second.status, 0, second.stderr);
    const profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(profile.experiences.length, 1);
    assert.equal(profile.experiences[0].facts.length, 1);
    assert.equal(profile.skills.length, 2);
    assert.equal(profile.experiences[0].facts[0].evidence.line, 7);
  });
});

test('preview does not create a profile, and validation rejects missing evidence', () => {
  withProfileRoot((root) => {
    const preview = runCli(root, ['import', 'cv.md']);
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Preview only/);
    assert.throws(() => readFileSync(join(root, 'data', 'career-profile.yml')),
      { code: 'ENOENT' });

    const invalidPath = join(root, 'invalid.yml');
    writeFileSync(invalidPath, `schema_version: 1\ncandidate: {}\nsummary: []\nexperiences: []\nprojects: []\neducation: []\ncertifications: []\nskills:\n  - id: skill-1\n    text: SQL\n    review_status: verified\n    evidence:\n      source: cv.md\n`);
    const invalid = runCli(root, ['validate', invalidPath]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /evidence requires source, positive line, and quote/);
  });
});

test('source paths outside the data root retain their complete absolute path', () => {
  withProfileRoot((root) => {
    const sibling = `${root}-archive`;
    mkdirSync(sibling, { recursive: true });
    const sourcePath = join(sibling, 'cv.md');
    writeFileSync(sourcePath, CV);
    try {
      const result = runCli(root, ['import', sourcePath]);
      assert.equal(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes(sourcePath), result.stdout);
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });
});

test('identical statements under different experience entries retain distinct IDs', () => {
  withProfileRoot((root) => {
    const cv = `# Candidate\n## Experience\n### North Co — Analyst\n- Shipped reports.\n### South Co — Analyst\n- Shipped reports.\n`;
    writeFileSync(join(root, 'cv.md'), cv);
    const result = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\n');
    assert.equal(result.status, 0, result.stderr);
    const profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    const ids = profile.experiences.map((entry) => entry.facts[0].id);
    assert.equal(profile.experiences.length, 2);
    assert.notEqual(ids[0], ids[1]);
  });
});

test('repeated facts are deduplicated and same-title entries with different facts stay distinct', () => {
  withProfileRoot((root) => {
    const cv = `# Candidate\n## Experience\n### Acme — Analyst\n- Built reports.\n- Built reports.\n### Acme — Analyst\n- Built dashboards.\n## Skills\n- SQL, SQL\n`;
    writeFileSync(join(root, 'cv.md'), cv);
    const first = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\ny\n');
    assert.equal(first.status, 0, first.stderr);
    const before = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(before.experiences.length, 2);
    assert.notEqual(before.experiences[0].id, before.experiences[1].id);
    assert.equal(before.experiences[0].facts.length, 1);
    assert.equal(before.skills.length, 1);

    writeFileSync(join(root, 'cv.md'), `<!-- moved -->\n${cv}`);
    const second = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\ny\ny\ny\n');
    assert.equal(second.status, 0, second.stderr);
    const after = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(after.experiences.length, 2);
    assert.deepEqual(after.experiences.map((entry) => entry.facts[0].text), ['Built reports.', 'Built dashboards.']);
    assert.equal(after.skills.length, 1);
  });
});

test('skipping an experience heading also skips its facts', () => {
  withProfileRoot((root) => {
    const result = runCli(root, ['import', 'cv.md', '--review'], 'n\ny\ny\n');
    assert.equal(result.status, 0, result.stderr);
    const profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(profile.experiences.length, 0);
    assert.equal(profile.skills.length, 2);
  });
});

test('re-import applies explicit wording edits but plain approval preserves prior edits', () => {
  withProfileRoot((root) => {
    const initial = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\nn\nn\n');
    assert.equal(initial.status, 0, initial.stderr);

    const edited = runCli(root, ['import', 'cv.md', '--review'], 'e\nAcme — Lead Analyst\ne\nDesigned verified dashboards.\nn\nn\n');
    assert.equal(edited.status, 0, edited.stderr);
    let profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(profile.experiences[0].label, 'Acme — Lead Analyst');
    assert.equal(profile.experiences[0].facts[0].text, 'Designed verified dashboards.');

    const approvedAgain = runCli(root, ['import', 'cv.md', '--review'], 'y\ny\nn\nn\n');
    assert.equal(approvedAgain.status, 0, approvedAgain.stderr);
    profile = yaml.load(readFileSync(join(root, 'data', 'career-profile.yml'), 'utf8'));
    assert.equal(profile.experiences[0].label, 'Acme — Lead Analyst');
    assert.equal(profile.experiences[0].facts[0].text, 'Designed verified dashboards.');
  });
});

# Mode: master-profile — Build and maintain a source-backed career profile

## Purpose

Create a reusable profile of candidate facts from `cv.md` without asking an AI
to invent, infer, or silently rewrite career history. The profile is user data
at `data/career-profile.yml`; it remains local and is protected by the updater's
existing `data/` user-layer rule.

## Initial CV import

1. Run `node career-profile.mjs import [cv.md]` to preview extracted candidates.
2. Review candidates with the user. For the interactive item-by-item gate, run
   `node career-profile.mjs import [cv.md] --review`; accept, edit, or skip each
   candidate. Nothing is written before this review.
3. The importer preserves the source quote and line number for each approved
   item. Approval marks the extracted statement `verified`; it does not verify
   claims beyond what the source actually says. Never embellish metrics,
   ownership, dates, skills, or outcomes.
4. Run `node career-profile.mjs validate` and report any errors. Import merges
   additively and keeps existing profile entries; it does not replace them.

The parser is intentionally conservative and heading-based. Tell the user
that unusual CV layouts may need manual additions/edits after import. Do not
discard or rewrite `cv.md`.

## Scope boundary

This first version provides profile schema, CV import, human confirmation, and
validation only. It does **not** select profile facts for a job description,
adapt the result into the PDF generator's payload, or run a CV re-analysis
loop. Until those integrations are implemented, the existing PDF workflow
continues to use its existing inputs; never imply this profile has already
changed generated CVs.

## Schema v1

- `candidate`: optional identity fields
- `summary`, `certifications`, `skills`: lists of fact records
- `experiences`, `projects`, `education`: entries with a label, evidence, and
  a `facts` list
- Each fact has a stable `id`, `text`, `evidence`,
  and `review_status` (`needs_review` or `verified`)

### Evidence records

Every evidence record needs a non-empty `source` and `quote`. Existing records
without `source_type` remain valid as legacy file evidence and require a
positive integer `line`; they are not migrated. New records may declare:

- `source_type: file`: use `source` as the local file path and provide a
  positive integer `line` or a non-empty `locator` such as a heading or page.
- `source_type: url`: `source` must be an absolute HTTP(S) URL. The validator
  checks its format locally and rejects embedded username/password credentials;
  it never opens or fetches the URL. `locator` may identify a section or URL
  fragment.
- `source_type: user_statement`: use a concise `source` reference such as
  `user-stated 2026-09-29`; keep the user's claim in `quote`.

If supplied, `line` must be a positive integer and `locator` must be a
non-empty string. Evidence supports a claim for human review; it is not proof
that the claim is true. Validation does not change `review_status` or mark a
fact verified. Only the explicit review flow can approve imported CV facts.

```yaml
evidence:
  source_type: file
  source: projects/dashboard/README.md
  locator: Results
  quote: "Presented the dashboard to the sales team"
```

```yaml
evidence:
  source_type: url
  source: https://example.com/project
  locator: Results
  quote: "Project summary describes the dashboard"
```

```yaml
evidence:
  source_type: user_statement
  source: user-stated 2026-09-29
  quote: "I presented the findings to the sales team"
```

# Master Career Profile Evidence Metadata

**Status:** Draft for review  
**Date:** 2026-09-29  
**Scope:** Extend Master Career Profile evidence metadata without adding source integrations.

## Context and goal

Master Profile v1 records each claim with `evidence.source`, `evidence.line`, and `evidence.quote`. That works for facts imported from a line-oriented `cv.md`, but it does not describe a web URL or other non-line-based source well. The goal is to let profile facts cite local files, URLs, or a direct user statement, while keeping evidence reviewable and preserving existing profiles.

This prepares trustworthy inputs for later job-description matching, gap analysis, and CV tailoring. It does not perform those later tasks.

## Recommended design

Keep the current evidence fields and add two optional fields:

```yaml
evidence:
  source_type: url       # file | url | user_statement
  source: https://example.com/project
  locator: README.md#results
  quote: "The exact excerpt supporting this fact"
```

- `source_type` identifies the kind of provenance: `file`, `url`, or `user_statement`.
- `source` remains the required human-readable path or source reference. For `url`, it must be an absolute HTTP(S) URL without embedded username/password credentials. For `user_statement`, use a concise reference such as `user-stated 2026-09-29`; for `file`, use the file path.
- `line` remains supported as a positive integer for existing CV imports and line-based files. If present on any evidence type, it must be a positive integer.
- `locator` is an optional, non-empty human-readable pointer such as a heading, page, section, or fragment. New `file` evidence must provide either a positive `line` or a non-empty `locator`; URL and user-statement evidence may omit it.
- `quote` remains required and stores the short excerpt or exact user-stated claim used for review. It is evidence, not proof of truth.
- If `source_type` is absent, treat the record as legacy file evidence. Existing `source` + positive `line` + `quote` profiles remain valid without migration.

The CV importer continues to import only `cv.md` and may continue to emit the legacy fields. This change does not fetch, scrape, authenticate to, or otherwise connect to GitHub, Notion, LinkedIn, or other services. Users may add URL-backed facts through a reviewed profile-editing flow in a later change; no new editing UI or source importer is included here.

## Validation and review behavior

- Reject unknown `source_type` values.
- Reject an invalid or non-HTTP(S) URL when `source_type: url`.
- Reject a URL containing embedded username/password credentials; the validator parses URLs locally and makes no network requests.
- Reject a typed file record with neither a positive `line` nor a non-empty `locator`.
- Reject `line` values that are present but not positive integers, and reject a present `locator` that is not a non-empty string.
- Continue requiring a non-empty `source` and `quote` for all records, plus the existing `review_status` values.
- Preserve the user's review status; source metadata alone never marks a claim `verified`.
- Profile review output should identify the source type and show the best available locator (`line`, then `locator`) with the quote. It must not fetch the source automatically.

No profile data is migrated or rewritten as part of validation. Existing import output and profile merge behavior stay unchanged unless a later, separately scoped feature opts into the new metadata.

## Alternatives considered

1. **URL-only field:** smallest change, but leaves file and direct-user provenance implicit and gives no reusable type distinction.
2. **Typed generic provenance (recommended):** supports the three agreed source classes, retains legacy fields, and avoids platform-specific schema.
3. **Provider-specific GitHub/Notion/LinkedIn structures:** supports richer integration metadata, but couples the profile format to integrations that are not being built now.

## Scope boundaries

Included:

- Extend the Master Profile evidence contract and example documentation.
- Make the validator accept both legacy evidence and the typed evidence form, with precise errors for malformed new records.
- Ensure review display can present the new evidence forms without implying that external content was checked.
- Add tests for legacy compatibility, valid file/URL/user-statement evidence, and invalid types/locators/URLs.

Not included:

- GitHub, Notion, LinkedIn, or other provider connectors or credentials.
- Automatic URL fetching, scraping, or evidence freshness checks.
- Changing `review_status` semantics or automatically verifying external claims.
- JD matching, career gap analysis, CV selection/tailoring, PDF integration, or dashboard work.
- Rewriting existing `data/career-profile.yml` files.

## Acceptance criteria

1. A v1 profile using only `source`, positive `line`, and `quote` still validates unchanged.
2. Typed file evidence validates with a positive line or a locator.
3. URL evidence accepts absolute HTTP(S) links and rejects malformed, unsupported-scheme, or credential-bearing URLs without fetching them.
4. User-statement evidence retains an exact quote and remains subject to normal user review.
5. Unknown types and missing source/quote/required file locator produce actionable validation errors.
6. The validator and review flow do not fetch URLs or upgrade a fact's review status.
7. Focused career-profile tests pass; the full repository suite is run and any unrelated baseline limitations are reported.

## Implementation outline for the next stage

After this specification is approved, write an implementation plan and then implement in a separate feature worktree based on the current upstream `main`. Keep the PR limited to the profile evidence contract, validator/importer presentation where needed, example guidance, and tests. Do not push or open a PR until separately requested.

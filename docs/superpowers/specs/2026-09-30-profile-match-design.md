# Master Profile Job Match and Evidence Gap Report

**Status:** Proposed design for owner review

**Date:** 2026-09-30

## Context

Career Ops now has a reviewed, source-backed Master Career Profile at
`data/career-profile.yml`. Profile facts carry review status and evidence. The
existing `jd-skill-gap.mjs` is intentionally narrower: it extracts skill
requirements and compares them with `cv.md`. The `oferta` mode already produces
a broader A-F evaluation and a customization plan.

This feature should help a candidate see, requirement by requirement, which
parts of one job description are supported by evidence in the Master Profile
and which parts need attention. It must not create another overall fit score or
imply that an absent profile fact means the candidate lacks that qualification.

The evidence-format proposal in issue #4614 is separate and unresolved. This
design uses the current profile schema and must continue to work if evidence
later gains optional source types or locators. It does not depend on that
proposal being accepted.

## Goals

- Compare one supplied or archived job description with the Master Profile.
- Account for all explicit job requirements that can be represented by profile
  facts, including skills, experience, responsibilities, education, and
  certifications.
- Show the wording of each requirement, its required or preferred priority,
  its match status, and the profile evidence behind that status.
- Keep the profile, CV, and application tracker unchanged.
- Save the resulting report locally in the existing user-data `reports/`
  location.

## Non-goals

- Replacing or changing the A-F score produced by `oferta`.
- Changing `jd-skill-gap.mjs` or its existing skill-only behavior.
- Creating a percentage, ranking, hiring prediction, or pass/fail verdict.
- Tailoring a CV, generating a PDF or cover letter, editing a profile fact, or
  updating an application tracker row.
- Fetching a URL, scraping a job board, or adding an external API, connector, or
  dependency.
- Requiring the proposed evidence changes from issue #4614.

## User flow and component boundary

Add a `profile-match` mode for a user who asks to compare a job description with
their Master Profile. Route it from `AGENTS.md` and list it in `modes/README.md`.
The mode reads the provided JD text or a saved JD file and
`data/career-profile.yml`; it writes one Markdown report under the user's
existing `reports/` data location. The mode is separate from `oferta` at first.
Integration into the evaluation report can be considered later, after this
report proves useful and maintainers agree on the direction.

Keep the existing skill-gap checker intact. It remains the fast, deterministic
skill-only check against `cv.md`; `profile-match` provides the broader,
source-linked evidence map against the profile. The two tools answer related
but distinct questions and should not silently override one another.

The report is local user data and must follow the repository's existing data
root resolution and ignore rules. No write is made to the profile, CV, or
tracker. No new package or service is required. If the configured agent model
processes the JD or profile, its existing provider and privacy behavior applies;
this mode adds no new provider or transmission destination.

## Requirement extraction and matching

1. Read the JD supplied by the user or saved locally. Do not fetch a URL as part
   of this mode.
2. Identify each explicit requirement and preserve enough of its original JD
   wording to let the user audit the interpretation. Distinguish required from
   preferred requirements when the posting does so.
3. Categorize each requirement where possible: skill, experience or
   responsibility, education, certification, or other explicit requirement.
   Keep uncategorizable requirements visible rather than silently dropping
   them.
4. Compare each requirement semantically with facts in the profile. Keyword
   overlap alone is not sufficient evidence that the requirement is met.
5. Cite the profile fact and its stored evidence for every positive or partial
   match. Use the existing fact identity and evidence fields, including source,
   line, and quote where available. Do not invent replacement evidence.

The initial implementation may use the configured agent model for reading and
mapping natural-language requirements. It adds no second numeric scoring model.
The JD remains untrusted data: instructions embedded in a posting cannot alter
the analysis rules or trigger unrelated actions.

## Match statuses

Use one status per requirement:

| Status | Meaning |
|---|---|
| Supported by evidence | A verified profile fact directly supports the requirement at its stated scope. |
| Partially supported | Verified profile facts support only part of the requirement or a narrower scope. |
| No profile evidence | No relevant fact was found in the profile. This does not mean the candidate lacks the qualification. |
| Needs confirmation | Relevant profile information exists, but it is marked `needs_review` or the available facts do not establish the requirement clearly. |

If verified facts support only part of a requirement and an unreviewed fact may
support the rest, retain `Partially supported` and call out the unreviewed fact
as needing confirmation. Never upgrade `needs_review` to verified during
matching. Never state a requirement is met solely because an unverified fact
appears in the profile.

Years of experience, dates, scope, seniority, location, language, work
authorization, or other conditions must not be inferred if the profile does not
establish them. Use `Needs confirmation` or `No profile evidence`, as
appropriate, and explain the limitation.

## Report format

The Markdown report contains:

1. The role or JD identifier and the profile file used.
2. A short scope note explaining that the report maps JD requirements to
   profile evidence and is not a hiring prediction.
3. A requirement table, with required items before preferred items. Each row
   includes the original requirement, category, status, and supporting profile
   fact/evidence or a short explanation of the missing evidence.
4. A concise follow-up section for partial matches, unreviewed facts, ambiguous
   JD wording, and requirements the profile schema cannot currently establish.

Do not add an aggregate percentage, a new fit score, or a binary
"qualified/unqualified" conclusion. Use the configured output language, while
preserving source quotes verbatim.

## Missing data and uncertainty

- If the JD file cannot be read, stop and report the input problem; do not
  produce an empty report that looks like a successful match.
- If the profile is missing or invalid, report that condition and point to the
  existing import or validation workflow. Do not create or repair profile data.
- If the profile has no verified facts, say that evidence coverage is
  insufficient. Do not label every requirement a confirmed skill gap.
- If requirement extraction finds no explicit requirements, state that the JD
  did not yield a usable requirement list and ask the user to review the source.
- If a requirement is ambiguous or combines several conditions, preserve that
  uncertainty and split it only where the JD supports a clear separation.

## Acceptance criteria

- A user can request a profile match for one supplied or locally saved JD.
- The report includes explicit required and preferred requirements across the
  profile-supported categories, without silently omitting unmatched items.
- Each supported or partial status points to a profile fact and its evidence.
- A fact marked `needs_review` is never presented as confirmed evidence.
- A missing profile fact is described as missing evidence, not as proof of a
  missing candidate skill or qualification.
- The output contains no overall percentage or second fit score.
- Running the mode does not modify the profile, CV, or tracker, fetch a JD, or
  call an external API. Any model processing follows the user's existing agent
  configuration.
- Missing, invalid, empty, and ambiguous inputs produce clear limitations.
- Existing `jd-skill-gap.mjs` output and `oferta` A-F scoring remain unchanged.

## Verification plan

Use synthetic profile and JD fixtures only. Tests should cover:

- Required versus preferred extraction and multiple requirement categories.
- Direct and partial semantic evidence, and no evidence.
- `verified` and `needs_review` facts, including mixed evidence for one
  requirement.
- Source traceability in the report.
- Profile/JD missing, invalid, empty, or ambiguous conditions.
- JD text containing instruction-like content, which must remain data.
- No writes to profile, CV, or tracker; no JD fetching or external API calls.
- Regression checks showing the existing skill-gap checker and `oferta` score
  behavior are unchanged.

## Contribution sequence

This is a new mode and therefore follows `CONTRIBUTING.md`: review this design,
write an implementation plan, and open a matching-feature issue for maintainer
direction before proposing a PR. Issue #4614 concerns evidence format only and
does not itself approve or track this matching feature.

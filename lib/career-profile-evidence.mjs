const SOURCE_TYPES = new Set(['file', 'url', 'user_statement']);

export function validateEvidence(evidence, path) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return [`${path} must be a mapping`];
  }

  const errors = [];
  const sourceType = evidence.source_type;
  const legacy = sourceType === undefined;

  if (!legacy && !SOURCE_TYPES.has(sourceType)) {
    errors.push(`${path}.source_type must be file, url, or user_statement`);
  }

  if (legacy) {
    if (typeof evidence.source !== 'string' || !evidence.source.trim() ||
        !Number.isInteger(evidence.line) || evidence.line < 1 ||
        typeof evidence.quote !== 'string' || !evidence.quote.trim()) {
      errors.push(`${path} requires source, positive line, and quote`);
      return errors;
    }
    return errors;
  }

  if (typeof evidence.source !== 'string' || !evidence.source.trim()) {
    errors.push(`${path}.source is required`);
  }
  if (typeof evidence.quote !== 'string' || !evidence.quote.trim()) {
    errors.push(`${path}.quote is required`);
  }
  if (evidence.line !== undefined && (!Number.isInteger(evidence.line) || evidence.line < 1)) {
    errors.push(`${path}.line must be a positive integer`);
  }
  if (evidence.locator !== undefined && (typeof evidence.locator !== 'string' || !evidence.locator.trim())) {
    errors.push(`${path}.locator must be a non-empty string`);
  }

  if (sourceType === 'file' && evidence.line === undefined && evidence.locator === undefined) {
    errors.push(`${path} requires a positive line or locator`);
  }

  if (sourceType === 'url' && typeof evidence.source === 'string') {
    let parsed;
    try { parsed = new URL(evidence.source); } catch { /* invalid URL */ }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      errors.push(`${path}.source must be an absolute HTTP(S) URL without credentials`);
    }
  }

  return errors;
}

export function formatEvidence(evidence) {
  const quote = evidence.quote;
  if (evidence.source_type === undefined) return `${evidence.source}:${evidence.line} — ${quote}`;

  const sourceType = evidence.source_type === 'user_statement' ? 'user statement' : evidence.source_type;
  const locator = evidence.line !== undefined ? `:${evidence.line}`
    : evidence.locator ? `${evidence.locator.startsWith('#') ? '' : '#'}${evidence.locator}` : '';
  return `${sourceType}: ${evidence.source}${locator} — ${quote}`;
}

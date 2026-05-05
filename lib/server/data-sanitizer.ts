/**
 * Data Sanitizer — PII scrubbing before any content leaves to an external LLM.
 *
 * Industry standard: GDPR Art. 25 (Privacy by Design), OWASP Data Protection,
 * and NIST SP 800-188 (De-identification of Personal Information).
 *
 * Removes / masks:
 *   - Email addresses
 *   - Phone numbers (international formats)
 *   - IPv4 and IPv6 addresses
 *   - API keys / tokens (Bearer, sk-, ghp_, etc.)
 *   - Credit / debit card numbers (PAN)
 *   - Social Security Numbers (US)
 *   - Passwords in common "password: xxx" patterns
 *   - JWT tokens
 *   - Private key blocks (PEM)
 */

const PATTERNS: Array<{ label: string; pattern: RegExp; replacement: string }> = [
  // Email addresses
  {
    label: 'email',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL REDACTED]',
  },
  // Phone numbers — international / US formats
  {
    label: 'phone',
    pattern: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g,
    replacement: '[PHONE REDACTED]',
  },
  // IPv4 addresses
  {
    label: 'ipv4',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP REDACTED]',
  },
  // IPv6 addresses (simplified)
  {
    label: 'ipv6',
    pattern: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g,
    replacement: '[IP REDACTED]',
  },
  // API keys / bearer tokens (sk-, ghp_, gsk_, xoxb-, etc.)
  {
    label: 'api-key',
    pattern: /\b(?:sk|ghp|gsk|xoxb|xoxe|AIza|ya29|AKIA)[a-zA-Z0-9_\-]{10,}/g,
    replacement: '[API KEY REDACTED]',
  },
  // Bearer tokens in Authorization header text
  {
    label: 'bearer',
    pattern: /\bBearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [TOKEN REDACTED]',
  },
  // JWT tokens (three base64url segments separated by dots)
  {
    label: 'jwt',
    pattern: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g,
    replacement: '[JWT REDACTED]',
  },
  // PEM private keys
  {
    label: 'pem',
    pattern: /-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----/g,
    replacement: '[PRIVATE KEY REDACTED]',
  },
  // Credit card numbers (13–19 digits, optionally spaced / dashed)
  {
    label: 'cc',
    pattern: /\b(?:\d[ \-]?){13,19}\b/g,
    replacement: '[CARD NUMBER REDACTED]',
  },
  // US Social Security Numbers
  {
    label: 'ssn',
    pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
    replacement: '[SSN REDACTED]',
  },
  // Password patterns: "password: xxx", "pwd=xxx", "pass: xxx" etc.
  {
    label: 'password',
    pattern: /\b(?:password|passwd|pwd|pass)\s*[:=]\s*\S+/gi,
    replacement: '[PASSWORD REDACTED]',
  },
];

/**
 * Scrub PII / sensitive data from a string.
 * Returns the sanitized string — original is never mutated.
 */
export function sanitize(input: string): string {
  let result = input;
  for (const { pattern, replacement } of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Returns true if the input contains patterns that look like PII.
 * Use for logging / alerting purposes — does not mutate the input.
 */
export function containsPii(input: string): boolean {
  return PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0; // reset stateful global regexes
    return pattern.test(input);
  });
}

/**
 * Email validation utility
 *
 * Uses a pragmatic RFC-5322-derived regex that catches the vast majority of
 * invalid inputs while avoiding the complexity of a fully-compliant parser.
 * For production, consider a library like `zod` or `validator.js`.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Returns true if the given string is a plausible email address.
 * @param email - The string to validate.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Max length guard (RFC 5321)
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Returns the trimmed email or throws if invalid.
 * Useful for throwing early in API routes.
 */
export function validateEmail(email: string): string {
  const trimmed = (email ?? '').trim();
  if (!isValidEmail(trimmed)) {
    throw new Error('Please enter a valid email address.');
  }
  return trimmed;
}

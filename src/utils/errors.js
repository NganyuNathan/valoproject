/**
 * Turns an error into a message that is safe to show to a user.
 * Database / storage errors can reveal table and column names, so those become a
 * friendly message instead. Our own messages (and normal sign-in messages) pass through.
 * The full error is still logged to the console for developers.
 */
export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  // eslint-disable-next-line no-console
  if (err) console.error(err);
  const message = String(err?.message || '');

  if (/mime type|not supported|invalid file type/i.test(message)) return 'That file type is not allowed.';
  if (/maximum allowed size|payload too large|too large/i.test(message)) return 'That file is too large.';
  if (/row-level security|permission denied|not allowed|cannot change|only an admin/i.test(message)) {
    return "You don't have permission to do that.";
  }
  if (/duplicate key|already exists/i.test(message) && err?.code) return 'That already exists.';

  const looksTechnical =
    (typeof err?.code === 'string' && /^(\d{5}|PGRST\d+)$/.test(err.code)) ||
    /violates|does not exist|syntax error|schema cache|relation |column |jwt|invalid input/i.test(message);
  return looksTechnical || !message ? fallback : message;
}

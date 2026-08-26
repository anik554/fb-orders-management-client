'use client';

import { Notice } from '@/components/ui';
import { ApiError } from '@/lib/api';

/**
 * Messages that carry nothing a shop owner can act on.
 *
 * Passport sends a bare "Unauthorized" for a token that is missing, malformed
 * or expired, and the refresh endpoint talks about a credential the user has
 * never seen. "Insufficient role for this resource" is a sentence for a log
 * file. These are the ones worth replacing with plain English.
 */
const OPAQUE_MESSAGES = [
  /^unauthorized$/i,
  /^forbidden$/i,
  /refresh token/i,
  /^insufficient role/i,
  /requires an account attached to a business$/i,
];

/** True when the API's own message is worth showing the user. */
export function isSpecificReason(message: string | undefined | null): boolean {
  const trimmed = message?.trim();

  return Boolean(trimmed) && !OPAQUE_MESSAGES.some((pattern) => pattern.test(trimmed as string));
}

/**
 * The server's reason when it gave one, otherwise a friendly generic.
 *
 * 401 and 403 both cover two very different situations: a session that simply
 * ran out, and a deliberate decision about this account — disabled by the
 * owner, suspended by the platform, wrong password. Flattening both into "your
 * session has ended" sends the second kind round a loop of signing in again.
 * That is not hypothetical: a suspended shop spent an afternoon wondering why
 * Facebook connect kept failing, because the one screen that knew the answer
 * threw it away.
 */
function serverReasonOr(error: ApiError, generic: string): string {
  return isSpecificReason(error.message) ? error.message : generic;
}

/**
 * Turns an error into something a shop owner can act on.
 *
 * Backend messages are written for developers — "Insufficient role for this
 * resource" tells a seller nothing. Status codes that have a clear human
 * meaning get one here; anything else falls back to the server's own message,
 * which is still better than a blank screen.
 */
export function humaniseError(error: unknown, fallback = 'Something went wrong.'): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  switch (error.status) {
    case 401:
      return serverReasonOr(error, 'Your session has ended. Please sign in again.');
    case 403:
      return serverReasonOr(
        error,
        'Your account does not have access to this. If you manage a shop, sign in with your business account.',
      );
    case 404:
      return 'That item no longer exists. It may have been removed.';
    case 409:
      return error.message;
    case 429:
      return 'Too many attempts. Please wait a minute and try again.';
    case 502:
    case 503:
      return `Facebook could not be reached: ${error.message}`;
    default:
      return error.message || fallback;
  }
}

export function ErrorNotice({
  error,
  fallback,
}: {
  error: unknown;
  fallback?: string;
}) {
  if (!error) {
    return null;
  }

  return <Notice tone="danger">{humaniseError(error, fallback)}</Notice>;
}

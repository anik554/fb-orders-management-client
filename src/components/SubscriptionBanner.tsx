'use client';

import Link from 'next/link';
import { Button, cx } from '@/components/ui';
import { SubscriptionSummary } from '@/lib/types';

/** Days left on a trial before it is worth interrupting the screen about. */
const WARN_FROM_DAYS = 3;

/**
 * A one-line strip above every screen when the subscription needs attention.
 *
 * Deliberately silent while a subscription is healthy, and silent for the first
 * few days of a trial too. A banner that is always there is furniture: by the
 * time it says something urgent, nobody reads it. It appears when there is a
 * date to act on and disappears again once there is not.
 *
 * Staff see the same warning without the button. They cannot pay, but they are
 * usually the ones at the screen all day, and "tell the boss the trial ends
 * Thursday" is how the owner finds out in time.
 */
export function SubscriptionBanner({
  subscription,
  isOwner,
}: {
  subscription: SubscriptionSummary;
  isOwner: boolean;
}) {
  const { state, daysRemaining, isTrial } = subscription;

  const quiet = state === 'ACTIVE' || (state === 'TRIALING' && daysRemaining > WARN_FROM_DAYS);

  if (quiet) {
    return null;
  }

  const tone = state === 'EXPIRED' ? 'danger' : 'warning';

  const message =
    state === 'EXPIRED'
      ? isTrial
        ? 'Your free trial has ended. You can still read everything, but replying and taking orders needs a plan.'
        : 'Your subscription has expired. You can still read everything, but replying and taking orders needs an active plan.'
      : state === 'GRACE'
        ? `Your subscription has lapsed. Everything keeps working until ${new Date(
            subscription.writeAccessEndsAt,
          ).toLocaleDateString()}.`
        : daysRemaining === 0
          ? 'Your free trial ends today.'
          : `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

  return (
    <div
      role="status"
      className={cx(
        'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2 text-xs',
        tone === 'danger'
          ? 'border-danger/30 bg-danger-soft text-danger'
          : 'border-warning/30 bg-warning-soft text-warning',
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>

      {isOwner ? (
        <Link href="/settings/billing">
          <Button size="sm" tone={state === 'EXPIRED' ? 'primary' : 'secondary'}>
            {isTrial ? 'Choose a plan' : 'Renew'}
          </Button>
        </Link>
      ) : (
        <span className="opacity-80">Ask the shop owner to renew.</span>
      )}
    </div>
  );
}

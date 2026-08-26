'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { api, tokenStore } from '@/lib/api';
import { MeResponse } from '@/lib/types';
import { RequiredRole } from '@/hooks/useSession';

/** "business owner", or "business owner or staff" when a screen accepts both. */
function describeRoles(required: RequiredRole | RequiredRole[] | undefined): string {
  if (!required) {
    return 'another kind of';
  }

  const labels = (Array.isArray(required) ? required : [required]).map(
    (role) => ROLE_LABEL[role] ?? role,
  );

  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}` : labels[0];
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'platform admin',
  BUSINESS_OWNER: 'business owner',
  STAFF: 'staff',
};

const HOME_FOR_ROLE: Record<string, { href: string; label: string }> = {
  SUPER_ADMIN: { href: '/admin', label: 'Go to the admin panel' },
  BUSINESS_OWNER: { href: '/inbox', label: 'Go to the inbox' },
  STAFF: { href: '/inbox', label: 'Go to the inbox' },
};

/**
 * Shown when someone is signed in with the wrong kind of account.
 *
 * Names the account they are actually using. A platform admin who follows a link
 * to a shop screen needs to be told that, not quietly moved somewhere else —
 * otherwise the screen they wanted simply appears not to exist.
 */
export function WrongAccountNotice({
  me,
  requiredRole,
}: {
  me: MeResponse | undefined;
  requiredRole: RequiredRole | RequiredRole[] | undefined;
}) {
  const router = useRouter();
  const home = me ? HOME_FOR_ROLE[me.role] : undefined;

  async function switchAccount() {
    try {
      await api.logout();
    } catch {
      // Signing out locally is what matters.
    }

    tokenStore.clear();
    router.replace('/login');
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md border-warning/40 bg-warning-soft">
        <h1 className="text-base font-semibold text-warning">
          This screen is for {describeRoles(requiredRole)} accounts
        </h1>

        <p className="mt-2 text-sm text-warning/90">
          You are signed in as <span className="font-medium">{me?.email}</span>
          {me && ` (${ROLE_LABEL[me.role] ?? me.role})`}, which does not have access here.
          Connecting Pages and managing the team belong to the shop&rsquo;s owner; the platform
          admin panel is separate from any one shop.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button tone="primary" onClick={switchAccount}>
            Sign in with a different account
          </Button>

          {home && (
            <Link href={home.href}>
              <Button>{home.label}</Button>
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}

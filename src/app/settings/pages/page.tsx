'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { FacebookIcon } from '@/components/icons';
import { Badge, Button, Card, CardHeader, EmptyState, Notice, Skeleton } from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';

/** Statuses the OAuth callback appends to this URL when it sends the browser back. */
const CONNECT_MESSAGES: Record<
  string,
  { tone: 'positive' | 'warning' | 'danger'; title: string; text: string }
> = {
  success: {
    tone: 'positive',
    title: 'Page connected',
    text: 'Messages will start arriving in the inbox.',
  },
  denied: {
    tone: 'warning',
    title: 'Connection cancelled',
    text: 'You closed the Facebook permission screen. Nothing changed.',
  },
  conflict: {
    tone: 'danger',
    title: 'Already connected elsewhere',
    text: 'Every Page you granted belongs to a different business account on this platform.',
  },
  invalid: {
    tone: 'danger',
    title: 'Incomplete response',
    text: 'Facebook sent back an incomplete response. Please try again.',
  },
  failed: {
    tone: 'danger',
    title: 'Connection failed',
    text: 'The connection could not be completed. Please try again.',
  },
  plan_limit: {
    tone: 'warning',
    title: 'Your plan is full',
    text: 'Facebook granted access, but your plan has no room for another Page.',
  },
};

/**
 * A status the callback can send that this map does not know would render no
 * banner at all — the screen would simply look like nothing happened. Say
 * something instead, and make the gap obvious in the console.
 */
const UNKNOWN_CONNECT = {
  tone: 'warning' as const,
  title: 'Connection finished',
  text: 'Facebook sent back a result we could not read. Check the list below.',
};

export default function PagesSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-content-muted">
          Loading…
        </main>
      }
    >
      <PagesSettings />
    </Suspense>
  );
}

function PagesSettings() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const session = useSession('BUSINESS_OWNER');

  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectStatus = searchParams.get('connect');
  const connectedCount = searchParams.get('pages');
  const conflicts = searchParams.get('conflicts');
  const overLimit = searchParams.get('overLimit');
  const banner = connectStatus
    ? (CONNECT_MESSAGES[connectStatus] ?? UNKNOWN_CONNECT)
    : undefined;

  const pages = useQuery({
    queryKey: ['connected-pages'],
    queryFn: api.pages,
    enabled: session.authorised,
  });

  /**
   * Fetches the consent URL with the access token attached, then navigates.
   *
   * The URL carries a short-lived signed `state`, so it is fetched fresh at the
   * moment of the click — never stored, never copied by hand. A stale or
   * truncated link is the one failure mode this design removes entirely.
   */
  async function connect() {
    setConnecting(true);
    setError(null);

    try {
      const { url } = await api.facebookConnectUrl();
      window.location.href = url;
    } catch (caught) {
      setError(humaniseError(caught, 'Could not start the Facebook connection.'));
      setConnecting(false);
    }
  }

  const disconnect = useMutation({
    mutationFn: (pageId: string) => api.disconnectPage(pageId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['connected-pages'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (caught) => setError(humaniseError(caught, 'Could not disconnect the Page.')),
  });

  if (session.wrongRole) {
    return <WrongAccountNotice me={session.me} requiredRole={session.requiredRole} />;
  }

  if (session.loading) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-content-muted">
        Loading…
      </main>
    );
  }

  const rows = pages.data ?? [];

  return (
    <AppShell me={session.me} title="Connected Pages">
      <div className="mx-auto max-w-2xl space-y-4">
        {banner && (
          <Notice tone={banner.tone} title={banner.title}>
            {banner.text}
            {connectStatus === 'success' && connectedCount && ` ${connectedCount} connected.`}
            {conflicts && ` ${conflicts} Page(s) belong to another business and were skipped.`}
            {overLimit && (
              <>
                {' '}
                {overLimit} Page(s) were left out because your plan is full — the ones already
                connected are untouched.{' '}
                <Link href="/settings/billing" className="font-medium underline">
                  See plans
                </Link>
                .
              </>
            )}
          </Notice>
        )}

        <ErrorNotice error={error} />
        <ErrorNotice error={pages.error} fallback="Could not load your Pages." />

        <Card>
          <CardHeader
            title="Connect a Facebook Page"
            description="Facebook will ask which Pages you want to grant. Only the ones you pick are connected, and you can disconnect any of them here later."
          />
          <Button tone="facebook" onClick={connect} loading={connecting}>
            {!connecting && <FacebookIcon />}
            Continue with Facebook
          </Button>
          <p className="mt-2.5 text-[11px] text-content-faint">
            You must be an administrator of the Page. A Page can belong to only one account here —
            if it is already connected elsewhere, we will not move it.
          </p>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">
              Your Pages{' '}
              {rows.length > 0 && <span className="text-content-faint">({rows.length})</span>}
            </h2>
          </div>

          {pages.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No Page connected yet"
              description="Use the button above to connect the Page you sell through."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {rows.map((page) => (
                <li key={page.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{page.pageName}</p>
                    <p className="text-[11px] tabular text-content-faint">
                      ID {page.facebookPageId} · connected {relativeTime(page.connectedAt)}
                    </p>
                  </div>

                  <Badge tone={page.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                    {page.status}
                  </Badge>

                  {page.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      disabled={disconnect.isPending}
                      onClick={() => disconnect.mutate(page.id)}
                    >
                      Disconnect
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

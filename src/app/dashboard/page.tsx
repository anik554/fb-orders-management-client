'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { BarList } from '@/components/Chart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { ClockIcon, FacebookIcon } from '@/components/icons';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Select,
  Skeleton,
  cx,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useRealtime } from '@/hooks/useRealtime';
import { TEAM_ROLES, useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { AwaitingReply, ORDER_STATUSES } from '@/lib/types';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const STATUS_COLOUR: Record<string, string> = {
  PENDING: 'var(--content-faint)',
  CONFIRMED: 'var(--info)',
  SHIPPED: 'var(--brand)',
  DELIVERED: 'var(--positive)',
  CANCELLED: 'var(--danger)',
};

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const [pageId, setPageId] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const session = useSession(TEAM_ROLES);
  const me = session.me;

  useEffect(() => {
    if (!pageId && me?.pages.length) {
      setPageId(me.pages[0].id);
    }
  }, [me, pageId]);

  const dashboard = useQuery({
    queryKey: ['dashboard', pageId, days],
    queryFn: () => api.dashboard(pageId as string, days),
    enabled: Boolean(pageId) && session.authorised,
  });

  // A new message changes both the counters and the waiting list, so the whole
  // dashboard is re-read rather than patched.
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const realtimeStatus = useRealtime({
    onNewMessage: refresh,
    onOrderStatusUpdated: refresh,
    onRefresh: refresh,
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

  const data = dashboard.data;
  const pages = me?.pages ?? [];

  return (
    <AppShell
      me={me}
      realtime={realtimeStatus}
      title="Dashboard"
      pageSelector={{ pages, pageId, onChange: setPageId }}
      actions={
        <Select
          aria-label="Date range"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-8 w-auto text-xs"
        >
          {RANGES.map((range) => (
            <option key={range.days} value={range.days}>
              {range.label}
            </option>
          ))}
        </Select>
      }
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {pages.length === 0 ? (
          <Card>
            <EmptyState
              title="No Facebook Page connected"
              description="Connect the Page you sell through, and this dashboard fills in as messages and orders arrive."
              action={
                <Link href="/settings/pages">
                  <Button tone="facebook">
                    <FacebookIcon /> Connect a Page
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <ErrorNotice error={dashboard.error} fallback="Could not load the dashboard." />

            {/* ------------------------------------------------------- money */}
            {dashboard.isLoading || !data ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-[5.5rem] rounded-card" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  label="Collected"
                  value={data.totals.revenueDelivered}
                  hint="Delivered orders in this period"
                  tone="positive"
                />
                <Stat
                  label="Out for delivery"
                  value={data.totals.revenueInFlight}
                  hint="Pending, confirmed or shipped — all time"
                  tone="warning"
                />
                <Stat
                  label="Orders"
                  value={data.totals.ordersCreated}
                  hint={`${data.ordersByStatus.PENDING} still pending`}
                />
                <Stat
                  label="Messages in"
                  value={data.totals.messagesIn}
                  hint={`${data.totals.messagesOut} replies sent`}
                />
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {/* ------------------------------------------ waiting on us */}
              <Card className="lg:col-span-2" padded={false}>
                <div className="border-b border-border-subtle px-4 py-3">
                  <h2 className="text-sm font-semibold">Waiting on a reply</h2>
                  <p className="mt-0.5 text-xs text-content-muted">
                    The customer wrote last. Oldest first — these are the ones losing patience.
                  </p>
                </div>

                {dashboard.isLoading ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (data?.awaitingReply.length ?? 0) === 0 ? (
                  <EmptyState
                    title="Nothing waiting"
                    description="Every conversation has had a reply. "
                  />
                ) : (
                  <ul className="divide-y divide-border-subtle">
                    {data?.awaitingReply.map((row) => (
                      <WaitingRow key={row.conversationId} row={row} />
                    ))}
                  </ul>
                )}
              </Card>

              <div className="space-y-4">
                {/* -------------------------------------- closing windows */}
                <Card>
                  <CardHeader
                    title="Reply window closing"
                    description="Open, but under 6 hours left."
                  />
                  {(data?.closingSoon.length ?? 0) === 0 ? (
                    <p className="text-xs text-content-faint">
                      No window is about to close. Facebook allows a free reply for 24 hours after
                      the customer&rsquo;s message.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data?.closingSoon.map((row) => (
                        <li key={row.conversationId}>
                          <Link
                            href="/inbox"
                            className="flex items-center gap-2 text-xs hover:underline"
                          >
                            <ClockIcon className="h-3.5 w-3.5 shrink-0 text-warning" />
                            <span className="min-w-0 flex-1 truncate">
                              {row.customerName ?? `Customer ${row.customerPsid.slice(-6)}`}
                            </span>
                            <span className="shrink-0 tabular text-warning">
                              {row.windowExpiresAt
                                ? `${Math.max(
                                    0,
                                    Math.floor(
                                      (new Date(row.windowExpiresAt).getTime() - Date.now()) /
                                        3_600_000,
                                    ),
                                  )}h`
                                : ''}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                {/* ------------------------------------------ order status */}
                <Card>
                  <CardHeader title="Orders by status" description={`Last ${days} day(s)`} />
                  <BarList
                    rows={ORDER_STATUSES.map((status) => ({
                      label: status.charAt(0) + status.slice(1).toLowerCase(),
                      value: data?.ordersByStatus[status] ?? 0,
                      colour: STATUS_COLOUR[status],
                    }))}
                  />
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function WaitingRow({ row }: { row: AwaitingReply }) {
  const name = row.customerName ?? `Customer ${row.customerPsid.slice(-6)}`;

  return (
    <li>
      <Link href="/inbox" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken">
        <Avatar name={name} size={32} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-content-muted">{row.preview ?? 'Sent an attachment'}</p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cx(
              'text-xs tabular',
              // Over a day without a reply is a different kind of problem from
              // twenty minutes, and it should look like one.
              row.waitingHours >= 24 ? 'font-medium text-danger' : 'text-content-muted',
            )}
          >
            {row.waitingHours < 1 ? '< 1h' : `${row.waitingHours}h`}
          </p>
          {!row.windowIsOpen && (
            <Badge tone="warning" className="mt-1">
              Closed
            </Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint: string;
  tone?: 'positive' | 'warning';
}) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface p-3.5 shadow-card">
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={cx(
          'mt-1 text-2xl font-semibold tabular tracking-tight',
          tone === 'positive' && 'text-positive',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-content-faint">{hint}</p>
    </div>
  );
}

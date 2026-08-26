'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { BarList, LineChart } from '@/components/Chart';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { TEAM_ROLES, useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/types';

const PRESETS = [7, 30, 90];

const STATUS_COLOUR: Record<string, string> = {
  PENDING: 'var(--content-faint)',
  CONFIRMED: 'var(--info)',
  SHIPPED: 'var(--brand)',
  DELIVERED: 'var(--positive)',
  CANCELLED: 'var(--danger)',
};

/** Compact axis labels: 15400 reads better as 15.4k on a 40px gutter. */
function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;

  return String(Math.round(value));
}

export default function ReportsPage() {
  const [pageId, setPageId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [applied, setApplied] = useState<{ days?: number; from?: string; to?: string }>({
    days: 30,
  });

  const session = useSession(TEAM_ROLES);
  const me = session.me;

  useEffect(() => {
    if (!pageId && me?.pages.length) {
      setPageId(me.pages[0].id);
    }
  }, [me, pageId]);

  const reports = useQuery({
    queryKey: ['reports', pageId, applied],
    queryFn: () => api.reports(pageId as string, applied),
    enabled: Boolean(pageId) && session.authorised,
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

  const data = reports.data;
  const pages = me?.pages ?? [];

  return (
    <AppShell
      me={me}
      title="Reports"
      pageSelector={{ pages, pageId, onChange: setPageId }}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {/* ------------------------------------------------------ range picker */}
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1.5">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  tone={applied.days === preset ? 'primary' : 'secondary'}
                  onClick={() => {
                    setDays(preset);
                    setCustomFrom('');
                    setCustomTo('');
                    setApplied({ days: preset });
                  }}
                >
                  {preset} days
                </Button>
              ))}
            </div>

            <span className="text-xs text-content-faint">or</span>

            <label>
              <span className="mb-1 block text-xs font-medium text-content-muted">From</span>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="w-40"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-content-muted">To</span>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="w-40"
              />
            </label>

            <Button
              tone="primary"
              // Both ends are needed: one alone would silently mean a single day.
              disabled={!customFrom || !customTo}
              onClick={() => setApplied({ from: customFrom, to: customTo })}
            >
              Apply
            </Button>

            {data && (
              <span className="ml-auto text-xs text-content-faint">
                {new Date(data.range.from).toLocaleDateString()} –{' '}
                {new Date(data.range.to).toLocaleDateString()} · {data.range.days} days
              </span>
            )}
          </div>
        </Card>

        <ErrorNotice error={reports.error} fallback="Could not load the report." />

        {pages.length === 0 ? (
          <Card>
            <EmptyState
              title="No Page connected"
              description="Reports appear once a Page is connected and messages start arriving."
            />
          </Card>
        ) : reports.isLoading || !data ? (
          <>
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </>
        ) : (
          <>
            {/* --------------------------------------------------- headline */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Summary label="Orders created" value={data.totals.ordersCreated} />
              <Summary label="Collected" value={data.totals.revenueDelivered} tone />
              <Summary
                label="Average order"
                value={data.totals.averageOrderValue}
                hint="Across delivered orders"
              />
            </div>

            {/* ----------------------------------------------------- charts */}
            <Card>
              <CardHeader
                title="Messages"
                description="Incoming from customers, and the replies your team sent."
              />
              <LineChart
                valueFormat={compact}
                series={[
                  {
                    label: 'Incoming',
                    colour: 'var(--brand)',
                    points: data.daily.map((row) => ({ date: row.date, value: row.messagesIn })),
                  },
                  {
                    label: 'Replies',
                    colour: 'var(--positive)',
                    points: data.daily.map((row) => ({ date: row.date, value: row.messagesOut })),
                  },
                ]}
              />
            </Card>

            <Card>
              <CardHeader
                title="Orders and collections"
                description="Orders raised each day, against the value of orders delivered."
              />
              <LineChart
                valueFormat={compact}
                series={[
                  {
                    label: 'Orders',
                    colour: 'var(--info)',
                    points: data.daily.map((row) => ({ date: row.date, value: row.ordersCreated })),
                  },
                  {
                    label: 'Collected',
                    colour: 'var(--positive)',
                    points: data.daily.map((row) => ({
                      date: row.date,
                      value: Number(row.revenueDelivered),
                    })),
                  },
                ]}
              />
            </Card>

            {/* ------------------------------------------------ breakdowns */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Orders by status" />
                <BarList
                  rows={ORDER_STATUSES.map((status) => ({
                    label: status.charAt(0) + status.slice(1).toLowerCase(),
                    value: data.ordersByStatus[status],
                    colour: STATUS_COLOUR[status],
                  }))}
                />
              </Card>

              <Card>
                <CardHeader title="Payment methods" />
                <BarList
                  rows={PAYMENT_METHODS.map((method) => ({
                    label: method === 'COD' ? 'Cash on delivery' : method,
                    value: data.ordersByPayment[method],
                  }))}
                />
              </Card>
            </div>

            {/* ----------------------------------------------------- tables */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card padded={false}>
                <div className="border-b border-border-subtle px-4 py-3">
                  <h2 className="text-sm font-semibold">Top products</h2>
                  <p className="mt-0.5 text-xs text-content-muted">
                    By revenue, cancelled orders excluded.
                  </p>
                </div>
                {data.topProducts.length === 0 ? (
                  <EmptyState title="No products in this period" />
                ) : (
                  <ul className="divide-y divide-border-subtle text-sm">
                    {data.topProducts.map((product) => (
                      <li
                        key={product.productName}
                        className="flex items-baseline gap-3 px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate">{product.productName}</span>
                        <span className="shrink-0 text-xs tabular text-content-faint">
                          × {product.quantity}
                        </span>
                        <span className="shrink-0 tabular font-medium">{product.revenue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card padded={false}>
                <div className="border-b border-border-subtle px-4 py-3">
                  <h2 className="text-sm font-semibold">Top customers</h2>
                  <p className="mt-0.5 text-xs text-content-muted">
                    Grouped by phone, since the same buyer often orders across threads.
                  </p>
                </div>
                {data.topCustomers.length === 0 ? (
                  <EmptyState title="No customers in this period" />
                ) : (
                  <ul className="divide-y divide-border-subtle text-sm">
                    {data.topCustomers.map((customer) => (
                      <li key={customer.phone} className="flex items-baseline gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{customer.customerName}</span>
                          <span className="block text-xs tabular text-content-faint">
                            {customer.phone}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular text-content-faint">
                          {customer.orders} order{customer.orders === 1 ? '' : 's'}
                        </span>
                        <span className="shrink-0 tabular font-medium">{customer.spent}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Summary({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: boolean;
}) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface p-3.5 shadow-card">
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular tracking-tight ${
          tone ? 'text-positive' : ''
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-content-faint">{hint}</p>}
    </div>
  );
}

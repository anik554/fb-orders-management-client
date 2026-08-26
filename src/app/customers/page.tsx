'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice } from '@/components/ErrorNotice';
import { SearchIcon } from '@/components/icons';
import { StatusBadge } from '@/components/OrderCard';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { TEAM_ROLES, useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';

export default function CustomersPage() {
  const [pageId, setPageId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const session = useSession(TEAM_ROLES);
  const me = session.me;

  useEffect(() => {
    if (!pageId && me?.pages.length) {
      setPageId(me.pages[0].id);
    }
  }, [me, pageId]);

  const customers = useQuery({
    queryKey: ['customers', pageId, applied],
    queryFn: () => api.customers(pageId as string, applied),
    enabled: Boolean(pageId) && session.authorised,
  });

  const detail = useQuery({
    queryKey: ['customer', selected],
    queryFn: () => api.customer(selected as string),
    enabled: Boolean(selected),
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

  const rows = customers.data?.data ?? [];
  const pages = me?.pages ?? [];

  return (
    <AppShell
      me={me}
      title="Customers"
      pageSelector={{
        pages,
        pageId,
        onChange: (next) => {
          setPageId(next);
          setSelected(null);
        },
      }}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(search);
              setSelected(null);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="min-w-[14rem] flex-1">
              <span className="mb-1 block text-xs font-medium text-content-muted">
                Name, phone or Messenger ID
              </span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rahim, or 01712…"
              />
            </label>

            <Button tone="primary" type="submit">
              <SearchIcon className="h-4 w-4" /> Search
            </Button>

            {applied && (
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setSearch('');
                  setApplied('');
                }}
              >
                Clear
              </Button>
            )}

            <p className="w-full text-[11px] text-content-faint">
              Facebook gives a person a different ID for every Page, so someone who messages two
              of your Pages appears under each. Order history is matched on phone number.
            </p>
          </form>
        </Card>

        <ErrorNotice error={customers.error} fallback="Could not load customers." />

        {pages.length === 0 ? (
          <Card>
            <EmptyState
              title="No Page connected"
              description="Customers appear here once people start messaging a connected Page."
            />
          </Card>
        ) : customers.isLoading ? (
          <Card padded={false}>
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              title={applied ? 'Nobody matches that search' : 'No customers yet'}
              description={
                applied
                  ? 'Try a phone number, or part of a name.'
                  : 'Anyone who messages this Page will appear here.'
              }
            />
          </Card>
        ) : (
          <>
            <p className="text-xs text-content-muted">
              {customers.data?.meta.total} customer
              {customers.data?.meta.total === 1 ? '' : 's'}
            </p>

            <Card padded={false}>
              <div className="overflow-x-auto scroll-slim">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunken text-[10px] uppercase tracking-wider text-content-faint">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Customer</th>
                      <th className="px-4 py-2 font-semibold">Phone</th>
                      <th className="px-4 py-2 text-right font-semibold">Messages</th>
                      <th className="px-4 py-2 text-right font-semibold">Orders</th>
                      <th className="px-4 py-2 text-right font-semibold">Collected</th>
                      <th className="px-4 py-2 font-semibold">Last seen</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {rows.map((customer) => {
                      const name =
                        customer.customerName ?? `Customer ${customer.customerPsid.slice(-6)}`;

                      return (
                        <tr
                          key={customer.conversationId}
                          className={
                            selected === customer.conversationId ? 'bg-surface-sunken' : undefined
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={name} size={30} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{name}</div>
                                <div className="text-[11px] text-content-faint">
                                  first seen {relativeTime(customer.firstSeenAt)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs tabular">
                            {customer.phone ? (
                              <a href={`tel:${customer.phone}`} className="hover:underline">
                                {customer.phone}
                              </a>
                            ) : (
                              <span className="text-content-faint">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular">{customer.messageCount}</td>
                          <td className="px-4 py-3 text-right tabular">{customer.orderCount}</td>
                          <td className="px-4 py-3 text-right tabular font-medium">
                            {customer.totalSpent}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {relativeTime(customer.lastMessageAt)}
                            {customer.windowIsOpen && (
                              <Badge tone="positive" className="ml-1.5">
                                Open
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                setSelected(
                                  selected === customer.conversationId
                                    ? null
                                    : customer.conversationId,
                                )
                              }
                            >
                              {selected === customer.conversationId ? 'Hide' : 'History'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Expanded inline rather than on its own route: the seller is
                comparing customers, and losing the list to see one order
                history would undo that. */}
            {selected && (
              <Card padded={false}>
                {detail.isLoading || !detail.data ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline gap-3 border-b border-border-subtle px-4 py-3">
                      <h2 className="text-sm font-semibold">
                        {detail.data.customerName ??
                          `Customer ${detail.data.customerPsid.slice(-6)}`}
                      </h2>
                      <span className="text-xs text-content-muted">
                        {detail.data.stats.orderCount} order
                        {detail.data.stats.orderCount === 1 ? '' : 's'} ·{' '}
                        {detail.data.stats.deliveredCount} delivered ·{' '}
                        <span className="tabular font-medium text-content">
                          {detail.data.stats.totalSpent}
                        </span>{' '}
                        collected
                      </span>
                      <Link
                        href="/inbox"
                        className="ml-auto text-xs text-brand underline underline-offset-4"
                      >
                        Open conversation
                      </Link>
                    </div>

                    {detail.data.orders.length === 0 ? (
                      <EmptyState
                        title="No orders yet"
                        description="This customer has messaged but not ordered."
                      />
                    ) : (
                      <ul className="divide-y divide-border-subtle">
                        {detail.data.orders.map((order) => (
                          <li key={order.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-xs tabular text-content-faint">
                                #{order.orderNumber}
                              </span>
                              <StatusBadge status={order.status} />
                              <span className="text-xs text-content-muted">
                                {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                                {order.paymentMethod === 'COD'
                                  ? 'Cash on delivery'
                                  : order.paymentMethod}
                              </span>
                              <span className="ml-auto tabular font-medium">
                                {order.totalAmount}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-content-muted">
                              {order.items
                                .map((item) => `${item.productName} × ${item.quantity}`)
                                .join(', ')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

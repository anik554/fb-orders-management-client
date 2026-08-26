'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { SearchIcon } from '@/components/icons';
import { OrderCard } from '@/components/OrderCard';
import { Button, Card, EmptyState, Input, Select, Skeleton } from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useRealtime } from '@/hooks/useRealtime';
import { TEAM_ROLES, useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import {
  ORDER_STATUSES,
  OrderFilters,
  OrderStatus,
  PAYMENT_METHODS,
  PaymentMethod,
} from '@/lib/types';

export default function OrdersPage() {
  // No router here: useSession owns the redirect for an unauthenticated visitor,
  // and a wrong role renders an explanation instead.
  const queryClient = useQueryClient();

  const [pageId, setPageId] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const session = useSession(TEAM_ROLES);
  const me = session.me;

  useEffect(() => {
    if (!pageId && me?.pages.length) {
      setPageId(me.pages[0].id);
    }
  }, [me, pageId]);

  const orders = useQuery({
    queryKey: ['orders', pageId, filters],
    queryFn: () => api.ordersForPage(pageId as string, filters),
    enabled: Boolean(pageId) && session.authorised,
  });

  // Another agent moving an order shows up here without a refresh.
  const handleOrderEvent = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  const realtimeStatus = useRealtime({ onOrderStatusUpdated: handleOrderEvent });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (caught) => {
      // A 409 means someone else moved it first, or the move was never legal.
      setError(humaniseError(caught, 'The status could not be changed.'));
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (session.wrongRole) {
    return <WrongAccountNotice me={session.me} requiredRole={session.requiredRole} />;
  }

  if (session.loading) {
    return <main className="grid min-h-screen place-items-center text-sm text-content-muted">Loading…</main>;
  }

  const rows = orders.data?.data ?? [];
  const hasFilters = Boolean(filters.status || filters.paymentMethod || filters.q);

  return (
    <AppShell
      me={me}
      realtime={realtimeStatus}
      title="Orders"
      pageSelector={{ pages: me?.pages ?? [], pageId, onChange: setPageId }}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFilters((current) => ({ ...current, q: search }));
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="min-w-[8rem]">
              <span className="mb-1 block text-xs font-medium text-content-muted">Status</span>
              <Select
                value={filters.status ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: (event.target.value || undefined) as OrderStatus | undefined,
                  }))
                }
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-[8rem]">
              <span className="mb-1 block text-xs font-medium text-content-muted">Payment</span>
              <Select
                value={filters.paymentMethod ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    paymentMethod: (event.target.value || undefined) as PaymentMethod | undefined,
                  }))
                }
              >
                <option value="">All methods</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-[12rem] flex-1">
              <span className="mb-1 block text-xs font-medium text-content-muted">
                Name or phone
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

            {hasFilters && (
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setFilters({});
                  setSearch('');
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </Card>

        <ErrorNotice error={error} />
        <ErrorNotice error={orders.error} fallback="Could not load orders." />

        {orders.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-52 w-full rounded-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              title={hasFilters ? 'No orders match those filters' : 'No orders yet'}
              description={
                hasFilters
                  ? 'Try clearing the filters, or search a different name.'
                  : 'Orders are raised from a conversation in the inbox.'
              }
            />
          </Card>
        ) : (
          <>
            <p className="text-xs text-content-muted">
              {orders.data?.meta.total} order{orders.data?.meta.total === 1 ? '' : 's'}
              {hasFilters && ' matching'}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  busy={changeStatus.isPending}
                  onStatusChange={(status) => changeStatus.mutate({ id: order.id, status })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

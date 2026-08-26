'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { PlusIcon } from '@/components/icons';
import { OrderCard } from '@/components/OrderCard';
import { OrderForm } from '@/components/OrderForm';
import { Button, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { CreateOrderInput, OrderStatus } from '@/lib/types';

/**
 * Orders raised from the open conversation, alongside the thread — so an agent
 * can take an order without losing sight of what the customer asked for.
 *
 * Hidden below `xl`: three columns do not fit a laptop, and the thread is the
 * one that must stay usable. The full book is on /orders.
 */
export function OrderPanel({
  conversationId,
  defaultCustomerName,
}: {
  conversationId: string;
  defaultCustomerName: string;
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ['conversation-orders', conversationId],
    queryFn: () => api.ordersForConversation(conversationId),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['conversation-orders', conversationId] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  const create = useMutation({
    mutationFn: (input: CreateOrderInput) => api.createOrder(conversationId, input),
    onSuccess: () => {
      setCreating(false);
      setError(null);
      refresh();
    },
    onError: (caught) => setError(humaniseError(caught, 'The order could not be created.')),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (caught) => {
      setError(humaniseError(caught, 'The status could not be changed.'));
      refresh();
    },
  });

  const rows = orders.data ?? [];

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border-subtle bg-surface xl:flex">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-3">
        <span className="text-xs font-semibold text-content-muted">
          Orders {rows.length > 0 && <span className="text-content-faint">({rows.length})</span>}
        </span>
        {!creating && (
          <Button size="sm" tone="primary" onClick={() => setCreating(true)}>
            <PlusIcon className="h-3.5 w-3.5" /> New
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim p-3">
        {error && (
          <div className="mb-3">
            <ErrorNotice error={error} />
          </div>
        )}

        {creating ? (
          <OrderForm
            defaultCustomerName={defaultCustomerName}
            submitting={create.isPending}
            error={null}
            onCancel={() => {
              setCreating(false);
              setError(null);
            }}
            onSubmit={(input) => create.mutate(input)}
          />
        ) : orders.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-content-muted">
            No order from this conversation yet. Read what the customer wants, then press{' '}
            <span className="font-medium text-content">New</span>.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                compact
                busy={changeStatus.isPending}
                onStatusChange={(status) => changeStatus.mutate({ id: order.id, status })}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

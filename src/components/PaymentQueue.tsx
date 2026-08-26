'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { billingPeriod, relativeTime, taka } from '@/lib/format';
import { BillingMethod, PendingPayment } from '@/lib/types';

const METHOD_LABEL: Record<BillingMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK_TRANSFER: 'Bank transfer',
  MANUAL: 'Recorded by us',
};

/**
 * The platform's payment inbox: claims to check against the receiving account.
 *
 * Confirming is one click because the check happens outside this screen — the
 * admin has the bKash statement open beside it, and the only thing this button
 * records is the decision. Rejecting asks for a reason first, because the shop
 * is shown it and "rejected" with no explanation is a support ticket.
 */
export function PaymentQueue() {
  const queryClient = useQueryClient();

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = useQuery({ queryKey: ['pending-payments'], queryFn: api.pendingPayments });

  const review = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: 'CONFIRMED' | 'REJECTED';
      reason?: string;
    }) => api.reviewPayment(id, status, reason),
    onSuccess: () => {
      setError(null);
      setRejecting(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] });
    },
    onError: (caught) => setError(humaniseError(caught, 'The decision could not be recorded.')),
  });

  const rows = pending.data ?? [];

  return (
    <Card padded={false}>
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-semibold">Payments to check</h2>
        {rows.length > 0 && <Badge tone="warning">{rows.length}</Badge>}
      </div>

      <div className="px-4 pt-3">
        <ErrorNotice error={error} />
        <ErrorNotice error={pending.error} fallback="Could not load pending payments." />
      </div>

      {pending.isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          description="Claimed payments appear here for checking against the receiving account."
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {rows.map((payment) => (
            <li key={payment.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{payment.businessName}</p>
                  <p className="text-xs text-content-muted">
                    {taka(Number(payment.amount))} · {billingPeriod(payment.months)} of{' '}
                    {payment.planName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-faint">
                    {METHOD_LABEL[payment.method]} · claimed {relativeTime(payment.createdAt)} ago
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-content-faint">
                    Reference
                  </p>
                  <p className="font-mono text-xs">{payment.reference}</p>
                </div>

                {rejecting !== payment.id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      tone="primary"
                      loading={review.isPending}
                      onClick={() => review.mutate({ id: payment.id, status: 'CONFIRMED' })}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        setRejecting(payment.id);
                        setNote('');
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {rejecting === payment.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    review.mutate({ id: payment.id, status: 'REJECTED', reason: note.trim() });
                  }}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="What was wrong? The shop is shown this."
                    autoFocus
                    className="min-w-[16rem] flex-1"
                  />
                  <Button
                    tone="danger"
                    type="submit"
                    size="sm"
                    loading={review.isPending}
                    disabled={note.trim().length === 0}
                  >
                    Reject
                  </Button>
                  <Button type="button" size="sm" onClick={() => setRejecting(null)}>
                    Cancel
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export type { PendingPayment };

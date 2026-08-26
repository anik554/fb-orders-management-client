'use client';

import { Badge, BadgeTone, Button, cx } from '@/components/ui';
import { Order, OrderStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'neutral',
  CONFIRMED: 'info',
  SHIPPED: 'brand',
  DELIVERED: 'positive',
  CANCELLED: 'danger',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

/**
 * Status buttons come from `allowedTransitions` on the order itself, so the UI
 * can only ever offer a move the server will accept — no duplicated workflow
 * rules to drift out of sync.
 */
export function OrderCard({
  order,
  busy,
  compact,
  onStatusChange,
}: {
  order: Order;
  busy: boolean;
  compact?: boolean;
  onStatusChange: (status: OrderStatus) => void;
}) {
  return (
    <article
      className={cx(
        'rounded-card border border-border-subtle bg-surface',
        compact ? 'p-3' : 'p-4 shadow-card',
      )}
    >
      <header className="flex items-baseline gap-2">
        <span className="text-xs font-semibold tabular text-content-faint">
          #{order.orderNumber}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{order.customerName}</span>
        <StatusBadge status={order.status} />
      </header>

      <p className="mt-1 text-xs text-content-muted">
        <a href={`tel:${order.phone}`} className="hover:text-content hover:underline">
          {order.phone}
        </a>
        {' · '}
        {order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod}
        {!compact && ` · ${new Date(order.createdAt).toLocaleString()}`}
      </p>

      {!compact && <p className="mt-1 text-xs text-content-muted">{order.address}</p>}

      <ul className="mt-2.5 space-y-1 text-xs">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-content-muted">
              {item.productName}
              <span className="text-content-faint"> × {item.quantity}</span>
            </span>
            <span className="shrink-0 tabular">{item.lineTotal}</span>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 flex items-baseline justify-between border-t border-border-subtle pt-2.5 text-sm">
        <span className="text-content-muted">Total</span>
        <span className="font-semibold tabular">{order.totalAmount}</span>
      </p>

      {order.allowedTransitions.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {order.allowedTransitions.map((next) => (
            <Button
              key={next}
              size="sm"
              tone={next === 'CANCELLED' ? 'danger' : 'primary'}
              disabled={busy}
              onClick={() => onStatusChange(next)}
            >
              Mark {next.toLowerCase()}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-2.5 text-[11px] text-content-faint">
          {order.status === 'DELIVERED'
            ? 'Delivered — this order is complete.'
            : 'Cancelled — this order cannot change again.'}
        </p>
      )}
    </article>
  );
}

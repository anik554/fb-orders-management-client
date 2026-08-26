'use client';

import { useMemo, useState } from 'react';
import { PlusIcon } from '@/components/icons';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { CreateOrderInput, OrderDraftItem, PAYMENT_METHODS, PaymentMethod } from '@/lib/types';

const emptyItem = (): OrderDraftItem => ({ productName: '', quantity: 1, price: 0 });

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  CARD: 'Card',
};

/**
 * Raise an order from a conversation.
 *
 * The running total here is only a preview — the server recomputes it from the
 * line items and its figure is the one stored, so the two can never disagree.
 */
export function OrderForm({
  defaultCustomerName,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  defaultCustomerName: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: CreateOrderInput) => void;
}) {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [items, setItems] = useState<OrderDraftItem[]>([emptyItem()]);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [items],
  );

  function updateItem(index: number, patch: Partial<OrderDraftItem>) {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    onSubmit({
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      items: items
        .filter((item) => item.productName.trim().length > 0)
        .map((item) => ({
          productName: item.productName.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="text-sm font-semibold">New order</h3>

      <Field label="Customer name">
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      </Field>

      <Field label="Phone">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          inputMode="tel"
          placeholder="01712345678"
        />
      </Field>

      <Field label="Delivery address">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          placeholder="House 12, Road 5, Dhanmondi, Dhaka"
        />
      </Field>

      <Field label="Payment">
        <Select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_LABELS[method]}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-content-muted">Items</span>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                value={item.productName}
                onChange={(e) => updateItem(index, { productName: e.target.value })}
                placeholder="Product"
                required={index === 0}
                aria-label={`Product ${index + 1}`}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                aria-label={`Quantity ${index + 1}`}
                className="w-14 px-2 text-center"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.price}
                onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                aria-label={`Unit price ${index + 1}`}
                className="w-24 px-2 tabular"
              />
              <button
                type="button"
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                disabled={items.length === 1}
                aria-label={`Remove item ${index + 1}`}
                className="grid h-9 w-7 place-items-center rounded-lg text-content-faint transition hover:text-danger disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          tone="ghost"
          onClick={() => setItems((current) => [...current, emptyItem()])}
          className="mt-1.5 -ml-1"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add item
        </Button>
      </div>

      <p className="flex items-baseline justify-between border-t border-border-subtle pt-2.5 text-sm">
        <span className="text-content-muted">Total</span>
        <span className="font-semibold tabular">{total.toFixed(2)}</span>
      </p>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="flex gap-2">
        <Button tone="primary" type="submit" loading={submitting} className="flex-1">
          Create order
        </Button>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { CheckIcon, ClockIcon } from '@/components/icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Notice,
  Select,
  Skeleton,
  cx,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { billingPeriod, taka } from '@/lib/format';
import {
  BillingMethod,
  BillingPayment,
  PAYABLE_METHODS,
  Plan,
  PlanTier,
  SubscriptionSummary,
} from '@/lib/types';

const METHOD_LABEL: Record<BillingMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK_TRANSFER: 'Bank transfer',
  MANUAL: 'Recorded by us',
};

export default function BillingPage() {
  const queryClient = useQueryClient();
  const session = useSession('BUSINESS_OWNER');

  const [tier, setTier] = useState<PlanTier | null>(null);
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<BillingMethod>('BKASH');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const subscription = useQuery({
    queryKey: ['subscription'],
    queryFn: api.subscription,
    enabled: session.authorised,
  });

  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans, enabled: session.authorised });

  const payments = useQuery({
    queryKey: ['billing-payments'],
    queryFn: api.billingPayments,
    enabled: session.authorised,
  });

  const submit = useMutation({
    mutationFn: () =>
      api.submitPayment({ tier: tier as PlanTier, months, method, reference: reference.trim() }),
    onSuccess: () => {
      setError(null);
      setSubmitted(true);
      setReference('');
      setTier(null);
      void queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
    },
    onError: (caught) => setError(humaniseError(caught, 'The payment could not be submitted.')),
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

  const current = subscription.data;
  const chosen = plans.data?.find((plan) => plan.tier === tier);
  const period = chosen?.periods.find((row) => row.months === months);
  const pending = payments.data?.find((payment) => payment.status === 'PENDING');

  return (
    <AppShell me={session.me} title="Plan and billing">
      <div className="mx-auto max-w-4xl space-y-4">
        <ErrorNotice error={subscription.error} fallback="Could not load your subscription." />

        {subscription.isLoading || !current ? (
          <Skeleton className="h-32 w-full rounded-card" />
        ) : (
          <CurrentPlan subscription={current} />
        )}

        {pending && (
          <Notice tone="info" title="A payment is being checked">
            <p>
              We are confirming {taka(Number(pending.amount))} for {billingPeriod(pending.months)} of{' '}
              {pending.planName}, reference <span className="font-medium">{pending.reference}</span>.
              Your plan changes as soon as it clears.
            </p>
          </Notice>
        )}

        {submitted && !pending && (
          <Notice tone="positive" title="Thank you — we have your payment details">
            <p>We will check it against the receiving account and your plan will update.</p>
          </Notice>
        )}

        {/* --------------------------------------------------------- plans */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">
            {current?.isTrial ? 'Choose a plan' : 'Change or renew your plan'}
          </h2>

          {plans.isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-64 rounded-card" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {plans.data?.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  plan={plan}
                  current={current?.tier === plan.tier}
                  selected={tier === plan.tier}
                  usage={current?.usage}
                  onSelect={() => {
                    setTier(plan.tier);
                    setSubmitted(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- payment */}
        {chosen && (
          <Card>
            <CardHeader
              title={`Pay for ${chosen.name}`}
              description="Send the money, then enter the transaction id. We check it by hand and your plan updates — usually within a few hours."
            />

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit.mutate();
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block text-xs font-medium text-content-muted">
                    Billing period
                  </span>
                  <Select
                    value={months}
                    onChange={(event) => setMonths(Number(event.target.value))}
                  >
                    {chosen.periods.map((row) => (
                      <option key={row.months} value={row.months}>
                        {billingPeriod(row.months)} — {taka(row.price)}
                        {row.monthsFree > 0 ? ` (${row.monthsFree} free)` : ''}
                      </option>
                    ))}
                  </Select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-content-muted">
                    How you paid
                  </span>
                  <Select
                    value={method}
                    onChange={(event) => setMethod(event.target.value as BillingMethod)}
                  >
                    {PAYABLE_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {METHOD_LABEL[option]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-medium text-content-muted">
                    Transaction id
                  </span>
                  <Input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="TRX7H2K9QW"
                    required
                    minLength={4}
                  />
                </label>
              </div>

              <ErrorNotice error={error} />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  tone="primary"
                  type="submit"
                  loading={submit.isPending}
                  disabled={reference.trim().length < 4}
                >
                  Submit payment
                </Button>

                {period && (
                  <p className="text-xs text-content-muted">
                    {taka(period.price)} for {billingPeriod(period.months)}
                    {period.monthsFree > 0 && ` — ${period.monthsFree} month${period.monthsFree === 1 ? '' : 's'} free`}
                  </p>
                )}

                <Button type="button" tone="ghost" onClick={() => setTier(null)}>
                  Cancel
                </Button>
              </div>

              <p className="text-[11px] text-content-faint">
                Nothing is charged through this form — it records that you sent the money, so we can
                match it to your account. Never enter a PIN or password here.
              </p>
            </form>
          </Card>
        )}

        {/* ------------------------------------------------------- history */}
        <Card padded={false}>
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">Payment history</h2>
          </div>

          {payments.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (payments.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Payments appear here once you have sent one, with whether we have confirmed it."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {payments.data?.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/** The headline: what they are on, and how long it lasts. */
function CurrentPlan({ subscription }: { subscription: SubscriptionSummary }) {
  const { state, daysRemaining } = subscription;

  const tone =
    state === 'EXPIRED'
      ? 'danger'
      : state === 'GRACE' || (state === 'TRIALING' && daysRemaining <= 3)
        ? 'warning'
        : 'positive';

  const headline =
    state === 'EXPIRED'
      ? subscription.isTrial
        ? 'Your free trial has ended'
        : 'Your subscription has expired'
      : state === 'GRACE'
        ? 'Your subscription has lapsed'
        : state === 'TRIALING'
          ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left of your free trial`
          : `${subscription.planName} — renews in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

  const detail =
    state === 'EXPIRED'
      ? 'You can still read everything. Replying, taking orders and changing anything needs an active plan.'
      : state === 'GRACE'
        ? `Everything still works until ${new Date(subscription.writeAccessEndsAt).toLocaleDateString()}. Renew before then to avoid interruption.`
        : `Ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`;

  return (
    <Card
      className={cx(
        tone === 'danger' && 'border-danger/40 bg-danger-soft',
        tone === 'warning' && 'border-warning/40 bg-warning-soft',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{headline}</h1>
            <Badge tone={tone === 'positive' ? 'positive' : tone}>{state}</Badge>
          </div>
          <p className="mt-1 text-xs text-content-muted">{detail}</p>
        </div>

        <dl className="flex gap-6 text-xs">
          <Usage
            label="Pages"
            used={subscription.usage.pages}
            limit={subscription.usage.maxPages}
          />
          <Usage
            label="Staff seats"
            used={subscription.usage.staff}
            limit={subscription.usage.maxStaff}
          />
        </dl>
      </div>
    </Card>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div>
      <dt className="text-content-muted">{label}</dt>
      <dd
        className={cx(
          'mt-0.5 text-lg font-semibold tabular',
          used >= limit ? 'text-warning' : 'text-content',
        )}
      >
        {used}
        <span className="text-xs font-normal text-content-faint"> / {limit}</span>
      </dd>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  selected,
  usage,
  onSelect,
}: {
  plan: Plan;
  current: boolean;
  selected: boolean;
  usage: SubscriptionSummary['usage'] | undefined;
  onSelect: () => void;
}) {
  // A plan smaller than what the shop already uses is not a mistake to hide,
  // but it is worth saying out loud before they pay for it.
  const tooSmall =
    usage && (usage.pages > plan.maxPages || usage.staff > plan.maxStaff) ? true : false;

  return (
    <Card
      className={cx(
        'flex flex-col',
        selected && 'border-brand ring-1 ring-brand',
        current && !selected && 'border-positive/50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{plan.name}</h3>
        {current && <Badge tone="positive">Current</Badge>}
      </div>

      <p className="mt-2">
        <span className="text-2xl font-semibold tabular tracking-tight">
          {taka(plan.monthlyPrice)}
        </span>
        <span className="text-xs text-content-faint"> / month</span>
      </p>

      <p className="mt-1 text-xs text-content-muted">{plan.blurb}</p>

      <ul className="mt-3 space-y-1.5 text-xs">
        <Feature>
          {plan.maxPages} Facebook {plan.maxPages === 1 ? 'Page' : 'Pages'}
        </Feature>
        <Feature>{plan.maxStaff} staff seats</Feature>
        <Feature>Unlimited conversations and orders</Feature>
        <Feature>
          {plan.periods.find((row) => row.months === 12)?.monthsFree ?? 0} months free on a year
        </Feature>
      </ul>

      {tooSmall && (
        <p className="mt-3 text-[11px] text-warning">
          Smaller than what you use now. You keep what is already connected, but could not add
          more.
        </p>
      )}

      <Button tone={selected ? 'primary' : 'secondary'} className="mt-4 w-full" onClick={onSelect}>
        {selected ? 'Selected' : current ? 'Renew this plan' : 'Choose'}
      </Button>
    </Card>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" />
      <span className="text-content-muted">{children}</span>
    </li>
  );
}

function PaymentRow({ payment }: { payment: BillingPayment }) {
  const tone =
    payment.status === 'CONFIRMED'
      ? 'positive'
      : payment.status === 'REJECTED'
        ? 'danger'
        : 'warning';

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{taka(Number(payment.amount))}</span> ·{' '}
          {billingPeriod(payment.months)} of {payment.planName}
        </p>
        <p className="text-[11px] text-content-faint">
          {METHOD_LABEL[payment.method]} · {payment.reference} ·{' '}
          {new Date(payment.createdAt).toLocaleDateString()}
        </p>
        {payment.reviewNote && (
          <p className="mt-1 text-[11px] text-content-muted">{payment.reviewNote}</p>
        )}
      </div>

      {payment.periodEnd && payment.status === 'CONFIRMED' && (
        <span className="text-[11px] text-content-faint">
          paid to {new Date(payment.periodEnd).toLocaleDateString()}
        </span>
      )}

      <Badge tone={tone}>
        {payment.status === 'PENDING' && <ClockIcon className="h-3 w-3" />}
        {payment.status}
      </Badge>
    </li>
  );
}

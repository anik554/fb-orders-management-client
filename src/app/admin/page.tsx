'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { PaymentQueue } from '@/components/PaymentQueue';
import { SearchIcon } from '@/components/icons';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Notice,
  Select,
  Skeleton,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { AdminBusiness } from '@/lib/types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED';

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<AdminBusiness | null>(null);
  const [reason, setReason] = useState('');

  const session = useSession('SUPER_ADMIN');
  const isAdmin = session.authorised;

  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: api.adminStats, enabled: isAdmin });

  const businesses = useQuery({
    queryKey: ['admin-businesses', applied, statusFilter],
    queryFn: () => api.adminBusinesses(applied, statusFilter === 'ALL' ? undefined : statusFilter),
    enabled: isAdmin,
  });

  const auditLog = useQuery({
    queryKey: ['admin-audit'],
    queryFn: api.adminAuditLog,
    enabled: isAdmin,
  });

  const setStatus = useMutation({
    mutationFn: ({
      id,
      status,
      reason: why,
    }: {
      id: string;
      status: 'ACTIVE' | 'SUSPENDED';
      reason?: string;
    }) => api.adminSetBusinessStatus(id, status, why),
    onSuccess: () => {
      setError(null);
      setPendingSuspend(null);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
    onError: (caught) => setError(humaniseError(caught, 'The change could not be applied.')),
  });

  function toggle(business: AdminBusiness) {
    // Suspension is disruptive and gets an audit entry, so it asks for a reason
    // first. Reactivation is the safe direction and applies straight away.
    if (business.status === 'ACTIVE') {
      setPendingSuspend(business);
      setReason('');
      setError(null);
      return;
    }

    setStatus.mutate({ id: business.id, status: 'ACTIVE', reason: 'Reactivated from admin panel' });
  }

  if (session.wrongRole) {
    return <WrongAccountNotice me={session.me} requiredRole={session.requiredRole} />;
  }

  if (session.loading || !isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-content-muted">
        Loading…
      </main>
    );
  }

  const s = stats.data;
  const rows = businesses.data?.data ?? [];

  return (
    <AppShell me={session.me} title="Platform">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* ------------------------------------------------------------ stats */}
        {stats.isLoading || !s ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-20 rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Businesses"
              value={s.businesses.total}
              hint={`${s.businesses.active} active · ${s.businesses.suspended} suspended`}
            />
            <Stat
              label="Connected Pages"
              value={s.pages.active}
              hint={`${s.pages.disconnected} disconnected`}
            />
            <Stat
              label="Messages (24h)"
              value={s.messages.last24h}
              hint={`${s.messages.total} all time`}
            />
            <Stat
              label="Delivered value"
              value={s.orders.deliveredValue}
              hint={`${s.orders.byStatus.DELIVERED} of ${s.orders.total} orders`}
            />
          </div>
        )}

        {/* -------------------------------------------------------- suspend UI */}
        {pendingSuspend && (
          <Card className="border-danger/40 bg-danger-soft">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setStatus.mutate({
                  id: pendingSuspend.id,
                  status: 'SUSPENDED',
                  reason: reason.trim() || undefined,
                });
              }}
            >
              <p className="text-sm font-medium text-danger">
                Suspend &ldquo;{pendingSuspend.name}&rdquo;?
              </p>
              <p className="mt-0.5 text-xs text-danger/85">
                The owner is signed out immediately, open connections are closed, and all access is
                blocked until you reactivate them.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason (recorded in the audit log)"
                  autoFocus
                  className="flex-1 min-w-[14rem]"
                />
                <Button tone="danger" type="submit" loading={setStatus.isPending}>
                  Suspend
                </Button>
                <Button type="button" onClick={() => setPendingSuspend(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <ErrorNotice error={error} />
        <ErrorNotice error={businesses.error} fallback="Could not load businesses." />

        {/* Money first: a claim sitting unchecked is a shop that has paid and
            cannot work. It outranks browsing the business list. */}
        <PaymentQueue />

        {/* ------------------------------------------------------- businesses */}
        <Card padded={false}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">Businesses</h2>

            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-8 w-auto text-xs"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setApplied(search);
              }}
              className="ml-auto flex gap-2"
            >
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Business name or owner email"
                className="h-8 w-56 text-xs"
              />
              <Button size="sm" tone="primary" type="submit">
                <SearchIcon className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>

          {businesses.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title="No business matches" />
          ) : (
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-sunken text-[10px] uppercase tracking-wider text-content-faint">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Business</th>
                    <th className="px-4 py-2 font-semibold">Owner</th>
                    <th className="px-4 py-2 font-semibold">Pages</th>
                    <th className="px-4 py-2 text-right font-semibold">Convs</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((business) => (
                    <tr key={business.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{business.name}</div>
                        <div className="text-[11px] text-content-faint">
                          joined {relativeTime(business.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {business.owner ? (
                          <>
                            <div>{business.owner.name}</div>
                            <div className="text-content-faint">{business.owner.email}</div>
                          </>
                        ) : (
                          <span className="text-content-faint">none</span>
                        )}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-xs">
                        {business.pages.length === 0 ? (
                          <span className="text-content-faint">none</span>
                        ) : (
                          business.pages.map((page) => (
                            <div key={page.id} className="truncate">
                              {page.pageName}
                              {page.status !== 'ACTIVE' && (
                                <span className="text-content-faint"> ({page.status})</span>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        {business.counts.conversations}
                      </td>
                      <td className="px-4 py-3 text-right tabular">{business.counts.orders}</td>
                      <td className="px-4 py-3">
                        <Badge tone={business.status === 'ACTIVE' ? 'positive' : 'danger'}>
                          {business.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          tone={business.status === 'ACTIVE' ? 'danger' : 'primary'}
                          disabled={setStatus.isPending}
                          onClick={() => toggle(business)}
                        >
                          {business.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* -------------------------------------------------------- audit log */}
        <Card padded={false}>
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">Recent admin actions</h2>
            <p className="mt-0.5 text-xs text-content-muted">
              Append-only. Nothing in the application edits or removes these.
            </p>
          </div>

          {auditLog.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (auditLog.data?.length ?? 0) === 0 ? (
            <EmptyState title="Nothing recorded yet" />
          ) : (
            <ul className="divide-y divide-border-subtle text-xs">
              {auditLog.data?.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5">
                  <span className="w-14 shrink-0 text-content-faint">
                    {relativeTime(entry.createdAt)}
                  </span>
                  <Badge tone={entry.action.includes('SUSPEND') ? 'danger' : 'positive'}>
                    {entry.action.replace('BUSINESS_', '')}
                  </Badge>
                  <span className="font-medium">{entry.details?.businessName ?? entry.targetId}</span>
                  <span className="text-content-muted">by {entry.actorEmail}</span>
                  {entry.details?.reason && (
                    <span className="italic text-content-faint">— {entry.details.reason}</span>
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

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface p-3.5 shadow-card">
      <p className="text-xs text-content-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-content-faint">{hint}</p>
    </div>
  );
}

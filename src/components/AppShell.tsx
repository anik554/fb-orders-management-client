'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  AdminIcon,
  ChatIcon,
  CustomersIcon,
  DashboardIcon,
  OrdersIcon,
  PagesIcon,
  ReportsIcon,
  SignOutIcon,
  TeamIcon,
} from '@/components/icons';
import { BillingIcon } from '@/components/icons';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, Badge, NavLink, Select, cx } from '@/components/ui';
import { RealtimeStatus } from '@/hooks/useRealtime';
import { api, tokenStore } from '@/lib/api';
import { MeResponse, PageSummary } from '@/lib/types';

export interface ShellPageSelector {
  pages: PageSummary[];
  pageId: string | null;
  onChange: (pageId: string) => void;
}

/**
 * The frame every signed-in screen sits inside.
 *
 * Previously each page carried its own header with a hand-rolled row of links,
 * which drifted: the inbox had a Pages link, orders had none, and the admin
 * screen looked like a different product. One shell means navigation is in the
 * same place on every screen and only has to be right once.
 *
 * The sidebar collapses to a bottom bar under `md`, because a seller answering
 * messages on a phone should not lose a third of the screen to navigation.
 */
export function AppShell({
  me,
  realtime,
  pageSelector,
  title,
  actions,
  children,
  /** Screens that manage their own scrolling, like the inbox. */
  fill = false,
}: {
  me: MeResponse | undefined;
  realtime?: RealtimeStatus;
  pageSelector?: ShellPageSelector;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  fill?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = me?.role === 'SUPER_ADMIN';
  const isOwner = me?.role === 'BUSINESS_OWNER';

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // Clearing the session locally is what matters to the user.
    }

    tokenStore.clear();
    router.replace('/login');
  }

  const nav = isAdmin
    ? [{ href: '/admin', label: 'Platform', icon: <AdminIcon /> }]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { href: '/inbox', label: 'Inbox', icon: <ChatIcon /> },
        { href: '/orders', label: 'Orders', icon: <OrdersIcon /> },
        { href: '/customers', label: 'Customers', icon: <CustomersIcon /> },
        { href: '/reports', label: 'Reports', icon: <ReportsIcon /> },
        // Connecting Pages and managing the team are the owner's decisions, so
        // staff are not shown doors the API would close anyway.
        ...(isOwner
          ? [
              { href: '/settings/pages', label: 'Pages', icon: <PagesIcon /> },
              { href: '/settings/team', label: 'Team', icon: <TeamIcon /> },
              { href: '/settings/billing', label: 'Billing', icon: <BillingIcon /> },
            ]
          : []),
      ];

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* ------------------------------------------------------------ sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border-subtle bg-surface md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-[13px] font-bold text-brand-contrast">
            OD
          </span>
          <span className="truncate text-sm font-semibold">Order Desk</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              icon={item.icon}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className="flex items-center gap-2">
            <Avatar name={me?.name ?? me?.email ?? '?'} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{me?.business?.name ?? me?.name}</p>
              <p className="truncate text-[11px] text-content-faint">{me?.email}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="flex h-8 flex-1 items-center gap-1.5 rounded-lg px-2 text-xs text-content-muted transition hover:bg-surface-sunken hover:text-content"
            >
              <SignOutIcon /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* --------------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-4">
          <h1 className="truncate text-sm font-semibold">{title}</h1>

          {pageSelector && pageSelector.pages.length > 0 && (
            <Select
              aria-label="Facebook Page"
              value={pageSelector.pageId ?? ''}
              onChange={(event) => pageSelector.onChange(event.target.value)}
              className="h-8 w-auto max-w-[14rem] text-xs"
            >
              {pageSelector.pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.pageName}
                </option>
              ))}
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2">
            {actions}
            {realtime && <RealtimeIndicator status={realtime} />}
          </div>
        </header>

        {me?.subscription && (
          <SubscriptionBanner subscription={me.subscription} isOwner={isOwner} />
        )}

        <main
          className={cx(
            'min-h-0 flex-1',
            fill ? 'flex overflow-hidden' : 'overflow-y-auto scroll-slim p-4',
          )}
        >
          {children}
        </main>

        {/* Bottom bar on small screens, where a sidebar would cost too much. */}
        <nav className="flex shrink-0 items-center justify-around border-t border-border-subtle bg-surface md:hidden">
          {nav
            // Reports and settings are desk work; the phone bar keeps the four
            // screens an agent actually taps while serving customers.
            .filter((item) => !item.href.startsWith('/settings') && item.href !== '/reports')
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
                    active ? 'text-brand' : 'text-content-faint',
                  )}
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          <button
            type="button"
            onClick={signOut}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-content-faint"
          >
            <SignOutIcon />
            Sign out
          </button>
        </nav>
      </div>
    </div>
  );
}

/**
 * Connection state, shown as a dot plus a word.
 *
 * Colour alone would leave a colour-blind user guessing, and "offline" is the
 * one thing an agent must notice — replies still send, but new messages stop
 * appearing on their own.
 */
export function RealtimeIndicator({ status }: { status: RealtimeStatus }) {
  const tone =
    status === 'live'
      ? { dot: 'bg-positive', text: 'text-content-muted', label: 'Live' }
      : status === 'connecting'
        ? { dot: 'bg-warning animate-pulse', text: 'text-content-muted', label: 'Connecting' }
        : { dot: 'bg-danger', text: 'text-danger', label: 'Offline' };

  return (
    <span
      className={cx('flex items-center gap-1.5 text-[11px]', tone.text)}
      title={
        status === 'live'
          ? 'New messages arrive automatically'
          : status === 'offline'
            ? 'Not connected — new messages will not appear until this reconnects'
            : 'Connecting…'
      }
    >
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {tone.label}
    </span>
  );
}

export { Badge };

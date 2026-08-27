'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { humaniseError } from '@/components/ErrorNotice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Field, Input, Notice } from '@/components/ui';
import { api, tokenStore } from '@/lib/api';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-content-muted">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Why the last session ended, if it ended for a reason.
   *
   * useSession puts it here when the API gave one — suspended, disabled, gone.
   * Without it the user is dropped on this screen with no explanation and no
   * way to tell it from an ordinary timeout, so they retype their password and
   * only then learn it was never going to work.
   */
  const signedOutReason = searchParams.get('reason');
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Whether new accounts are open, and whether they need a code.
   *
   * Asked before the form is shown so nobody fills in four fields only to be
   * told the door is shut. It is a convenience, not the gate: the server decides,
   * and `undefined` while it loads is treated as open so a slow request never
   * hides a working signup form.
   */
  const policy = useQuery({
    queryKey: ['signup-policy'],
    queryFn: api.signupPolicy,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const signupOpen = policy.data?.enabled ?? true;
  const needsCode = policy.data?.requiresCode ?? false;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const tokens =
        mode === 'login'
          ? await api.login(email, password)
          : await api.signup({
              name,
              email,
              password,
              businessName,
              ...(accessCode.trim() ? { accessCode: accessCode.trim() } : {}),
            });

      tokenStore.save(tokens.accessToken, tokens.refreshToken);

      // A platform admin owns no Pages, so the inbox would be an empty screen.
      const me = await api.me();
      router.replace(me.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (caught) {
      setError(humaniseError(caught, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* --------------------------------------------------------- form pane */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-[46%] lg:px-14">
        <header className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-contrast">
            OD
          </span>
          <span className="text-sm font-semibold">Order Desk</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'login' ? 'Sign in' : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              {mode === 'login'
                ? 'Your Page conversations and orders, in one place.'
                : 'Set up your shop, then connect a Facebook Page.'}
            </p>

            {mode === 'signup' && !signupOpen ? (
              <div className="mt-7">
                <Notice tone="info" title="New accounts are closed right now">
                  Get in touch and we will set one up for you.
                </Notice>
              </div>
            ) : (
            <form onSubmit={submit} className="mt-7 space-y-3.5">
              {mode === 'signup' && (
                <>
                  <Field label="Your name">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      autoComplete="name"
                      placeholder="Anik Rahman"
                    />
                  </Field>
                  <Field label="Shop name" hint="Shown to your team inside the dashboard.">
                    <Input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      required
                      autoComplete="organization"
                      placeholder="Dhaka Fashion House"
                    />
                  </Field>

                  {needsCode && (
                    <Field
                      label="Signup code"
                      hint="We sent this to you. Ask us if you do not have one."
                    >
                      <Input
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value)}
                        required
                        autoComplete="off"
                        placeholder="Your invitation code"
                      />
                    </Field>
                  )}
                </>
              )}

              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@shop.com"
                />
              </Field>

              <Field
                label="Password"
                hint={
                  mode === 'signup'
                    ? 'At least 8 characters, with an uppercase letter, a lowercase letter and a digit.'
                    : undefined
                }
              >
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                />
              </Field>

              {signedOutReason && !error && (
                <Notice tone="warning" title="You were signed out">
                  {signedOutReason}
                </Notice>
              )}

              {error && <Notice tone="danger">{error}</Notice>}

              <Button tone="primary" type="submit" loading={busy} className="w-full">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
            )}

            <p className="mt-5 text-sm text-content-muted">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                }}
                className="font-medium text-brand underline underline-offset-4"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        <footer className="flex gap-4 text-xs text-content-faint">
          <Link href="/privacy" className="hover:text-content-muted">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-content-muted">
            Terms
          </Link>
        </footer>
      </div>

      {/* ------------------------------------------------------- product pane */}
      {/* Decorative and explanatory; hidden on small screens where the form is
          the only thing that matters. */}
      <aside className="relative hidden flex-1 overflow-hidden border-l border-border-subtle bg-surface-sunken lg:block">
        <div className="absolute inset-0 opacity-[0.35] [background:radial-gradient(120%_90%_at_100%_0%,var(--brand-soft),transparent_60%)]" />

        <div className="relative flex h-full flex-col justify-center gap-8 px-14">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold leading-snug">
              Answer every customer without leaving one screen
            </h2>
            <p className="mt-2 text-sm text-content-muted">
              Messages from your Facebook Page land here in real time. Reply, and it arrives in the
              customer&rsquo;s own Messenger thread — they never know you used another tool.
            </p>
          </div>

          <ul className="max-w-md space-y-3.5 text-sm">
            {[
              ['Live inbox', 'New messages appear without refreshing.'],
              ['Orders from chat', 'Turn a conversation into a tracked order, cash on delivery included.'],
              ['Reply window built in', 'We warn you before Facebook’s 24-hour limit closes.'],
              ['Your data stays yours', 'One shop can never see another’s conversations.'],
            ].map(([heading, detail]) => (
              <li key={heading} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                />
                <span>
                  <span className="font-medium">{heading}.</span>{' '}
                  <span className="text-content-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

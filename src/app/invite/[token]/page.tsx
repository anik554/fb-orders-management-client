'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { humaniseError } from '@/components/ErrorNotice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { api, tokenStore } from '@/lib/api';

/**
 * Where an invite link lands.
 *
 * Public by necessity — the invitee has no account yet. The token in the URL is
 * the credential, and the email comes from the invitation rather than a field on
 * this form, so the holder of a link cannot pick an address of their choosing.
 */
export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.describeInvitation(token),
    retry: false,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await api.acceptInvitation({ token, name, password });

      tokenStore.save(result.accessToken, result.refreshToken);
      router.replace('/inbox');
    } catch (caught) {
      setError(humaniseError(caught, 'Could not accept the invitation.'));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-contrast">
            OD
          </span>
          <span className="text-sm font-semibold">Order Desk</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {preview.isLoading ? (
          <p className="text-sm text-content-muted">Checking your invitation…</p>
        ) : preview.error ? (
          <Card>
            <h1 className="text-base font-semibold">This invitation is not valid</h1>
            <p className="mt-2 text-sm text-content-muted">
              {humaniseError(preview.error, 'The link may have expired or already been used.')}
            </p>
            <p className="mt-2 text-sm text-content-muted">
              Ask the shop owner to send you a new one — invitations expire after seven days, and a
              new invite replaces any older link.
            </p>
          </Card>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Join {preview.data?.businessName}
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              You have been invited as <span className="font-medium text-content">staff</span>. Set
              a password and you are in.
            </p>

            <Card className="mt-6">
              <p className="text-xs text-content-muted">
                Your account will use{' '}
                <span className="font-medium text-content">{preview.data?.email}</span>
              </p>

              <form onSubmit={submit} className="mt-4 space-y-3.5">
                <Field label="Your name">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Rahim Uddin"
                  />
                </Field>

                <Field
                  label="Choose a password"
                  hint="At least 8 characters, with an uppercase letter, a lowercase letter and a digit."
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </Field>

                {error && <Notice tone="danger">{error}</Notice>}

                <Button tone="primary" type="submit" loading={busy} className="w-full">
                  Join the team
                </Button>
              </form>
            </Card>

            <p className="mt-4 text-xs text-content-faint">
              As staff you can read the inbox, reply to customers, and create and track orders. Only
              the shop owner can connect Facebook Pages or manage the team.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

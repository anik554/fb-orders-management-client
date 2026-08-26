'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { PlusIcon } from '@/components/icons';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Notice,
  Skeleton,
} from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { relativeTime, timeUntil } from '@/lib/format';
import { CreatedInvitation, TeamMember } from '@/lib/types';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const session = useSession('BUSINESS_OWNER');

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justInvited, setJustInvited] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const team = useQuery({ queryKey: ['team'], queryFn: api.team, enabled: session.authorised });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['team'] });
  }

  const invite = useMutation({
    mutationFn: (address: string) => api.inviteStaff(address),
    onSuccess: (created) => {
      setError(null);
      setEmail('');
      setCopied(false);
      // Held in state because the server will never return it again — only a
      // hash of the token is stored.
      setJustInvited(created);
      refresh();
    },
    onError: (caught) => setError(humaniseError(caught, 'Could not send the invitation.')),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(id),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (caught) => setError(humaniseError(caught, 'Could not revoke the invitation.')),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'DISABLED' }) =>
      api.setMemberStatus(id, status),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (caught) => setError(humaniseError(caught, 'Could not change their access.')),
  });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the link is visible and selectable
      // anyway, so this is not worth an error message.
      setCopied(false);
    }
  }

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

  const members = team.data?.members ?? [];
  const invitations = team.data?.invitations ?? [];

  return (
    <AppShell me={session.me} title="Team">
      <div className="mx-auto max-w-2xl space-y-4">
        <ErrorNotice error={error} />
        <ErrorNotice error={team.error} fallback="Could not load your team." />

        {/* ------------------------------------------------------------ invite */}
        <Card>
          <CardHeader
            title="Invite a colleague"
            description="Staff can read the inbox, reply to customers and manage orders. Only you can connect Pages or manage the team."
          />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              invite.mutate(email);
            }}
            className="flex flex-wrap gap-2"
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@yourshop.com"
              required
              className="min-w-[14rem] flex-1"
            />
            <Button tone="primary" type="submit" loading={invite.isPending}>
              <PlusIcon className="h-4 w-4" /> Send invite
            </Button>
          </form>

          {justInvited && (
            <div className="mt-3">
              <Notice tone="info" title="Invitation created — copy the link now">
                <p>
                  We do not send email yet, so share this link with{' '}
                  <span className="font-medium">{justInvited.email}</span> yourself. It is shown
                  once and expires {timeUntil(justInvited.expiresAt)}.
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-[11px] text-content">
                    {justInvited.inviteUrl}
                  </code>
                  <Button size="sm" onClick={() => copyLink(justInvited.inviteUrl)}>
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </Notice>
            </div>
          )}
        </Card>

        {/* ----------------------------------------------------------- members */}
        <Card padded={false}>
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">
              Members {members.length > 0 && <span className="text-content-faint">({members.length})</span>}
            </h2>
          </div>

          {team.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  busy={setStatus.isPending}
                  onToggle={() =>
                    setStatus.mutate({
                      id: member.id,
                      status: member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                    })
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        {/* ------------------------------------------------------- invitations */}
        <Card padded={false}>
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold">Pending invitations</h2>
          </div>

          {invitations.length === 0 ? (
            <EmptyState
              title="No invitations outstanding"
              description="Invite someone above and their link appears here until they accept."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{invitation.email}</p>
                    <p className="text-[11px] text-content-faint">
                      invited {relativeTime(invitation.createdAt)}
                      {invitation.invitedBy && ` by ${invitation.invitedBy}`}
                      {!invitation.isExpired && ` · expires ${timeUntil(invitation.expiresAt)}`}
                    </p>
                  </div>

                  <Badge tone={invitation.isExpired ? 'danger' : 'warning'}>
                    {invitation.isExpired ? 'Expired' : 'Pending'}
                  </Badge>

                  <Button
                    size="sm"
                    tone="danger"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(invitation.id)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function MemberRow({
  member,
  busy,
  onToggle,
}: {
  member: TeamMember;
  busy: boolean;
  onToggle: () => void;
}) {
  const isOwner = member.role === 'BUSINESS_OWNER';

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar name={member.name} size={32} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {member.isYou && <span className="ml-1.5 text-xs text-content-faint">(you)</span>}
        </p>
        <p className="truncate text-[11px] text-content-faint">{member.email}</p>
      </div>

      <Badge tone={isOwner ? 'brand' : 'neutral'}>{isOwner ? 'Owner' : 'Staff'}</Badge>

      {member.status === 'DISABLED' && <Badge tone="danger">Disabled</Badge>}

      {/* The owner's own row and any other owner row get no control: the API
          refuses both, and offering a button that always fails is worse than
          not offering it. */}
      {!isOwner && (
        <Button
          size="sm"
          tone={member.status === 'ACTIVE' ? 'danger' : 'primary'}
          disabled={busy}
          onClick={onToggle}
        >
          {member.status === 'ACTIVE' ? 'Disable' : 'Enable'}
        </Button>
      )}
    </li>
  );
}

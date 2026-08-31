'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConversationList, customerLabel } from '@/components/ConversationList';
import { ErrorNotice, humaniseError } from '@/components/ErrorNotice';
import { FacebookIcon } from '@/components/icons';
import { MessageThread } from '@/components/MessageThread';
import { OrderPanel } from '@/components/OrderPanel';
import { ReplyBox } from '@/components/ReplyBox';
import { Badge, Button, EmptyState } from '@/components/ui';
import { WrongAccountNotice } from '@/components/WrongAccountNotice';
import { useRealtime } from '@/hooks/useRealtime';
import { TEAM_ROLES, useSession } from '@/hooks/useSession';
import { ApiError, api } from '@/lib/api';
import { MessageTag, NewMessageEvent } from '@/lib/types';

export default function InboxPage() {
  const queryClient = useQueryClient();

  const [pageId, setPageId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [requiresTag, setRequiresTag] = useState(false);

  const session = useSession(TEAM_ROLES);
  const me = session.me;

  useEffect(() => {
    if (!pageId && me?.pages.length) {
      setPageId(me.pages[0].id);
    }
  }, [me, pageId]);

  const conversations = useQuery({
    queryKey: ['conversations', pageId],
    queryFn: () => api.conversations(pageId as string),
    enabled: Boolean(pageId) && session.authorised,
  });

  const thread = useQuery({
    queryKey: ['thread', conversationId],
    queryFn: () => api.thread(conversationId as string),
    enabled: Boolean(conversationId),
  });

  /**
   * A pushed message invalidates rather than patches the cache. The event
   * carries enough to render, but re-reading keeps one source of truth and
   * avoids a half-updated list when several messages land at once.
   */
  const handleRealtime = useCallback(
    (event: NewMessageEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', event.pageId] });

      if (event.conversation.id === conversationId) {
        void queryClient.invalidateQueries({ queryKey: ['thread', event.conversation.id] });
      }
    },
    [queryClient, conversationId],
  );

  const handleOrderEvent = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversation-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  /**
   * What to re-read when all we know is that time has passed.
   *
   * The pushed path uses the event to invalidate exactly one page's list and
   * one thread. Polling has no event, so it invalidates what this screen is
   * actually showing — which it knows from its own state.
   */
  const handlePoll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations', pageId] });

    if (conversationId) {
      void queryClient.invalidateQueries({ queryKey: ['thread', conversationId] });
    }
  }, [queryClient, pageId, conversationId]);

  const realtimeStatus = useRealtime({
    onNewMessage: handleRealtime,
    onOrderStatusUpdated: handleOrderEvent,
    onRefresh: handlePoll,
  });

  const reply = useMutation({
    mutationFn: ({ text, tag }: { text: string; tag?: MessageTag }) =>
      api.reply(conversationId as string, text, tag),
    onSuccess: () => {
      setReplyError(null);
      setRequiresTag(false);
      void queryClient.invalidateQueries({ queryKey: ['thread', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations', pageId] });
    },
    onError: (error) => {
      setReplyError(humaniseError(error, 'The reply could not be sent.'));
      // 422 from the window gate: surface the tag picker.
      setRequiresTag(error instanceof ApiError && error.status === 422);
    },
  });

  if (session.wrongRole) {
    return <WrongAccountNotice me={session.me} requiredRole={session.requiredRole} />;
  }

  if (session.loading) {
    return <main className="grid min-h-screen place-items-center text-sm text-content-muted">Loading…</main>;
  }

  const pages = me?.pages ?? [];
  const rows = conversations.data?.data ?? [];
  const selected =
    thread.data?.conversation ?? rows.find((item) => item.id === conversationId) ?? null;

  return (
    <AppShell
      me={me}
      realtime={realtimeStatus}
      title="Inbox"
      pageSelector={{
        pages,
        pageId,
        onChange: (next) => {
          setPageId(next);
          setConversationId(null);
        },
      }}
      fill
    >
      {pages.length === 0 ? (
        <div className="flex-1">
          <EmptyState
            title="No Facebook Page connected"
            description="Connect the Page you sell through and its messages will start arriving here."
            action={
              <Link href="/settings/pages">
                <Button tone="facebook">
                  <FacebookIcon /> Connect a Page
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* --------------------------------------------- conversation list */}
          <aside className="flex w-72 shrink-0 flex-col border-r border-border-subtle bg-surface">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-3">
              <span className="text-xs font-semibold text-content-muted">Conversations</span>
              {conversations.data && (
                <span className="text-[11px] tabular text-content-faint">
                  {conversations.data.meta.total}
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scroll-slim">
              <ErrorNotice error={conversations.error} fallback="Could not load conversations." />
              <ConversationList
                conversations={rows}
                selectedId={conversationId}
                onSelect={(id) => {
                  setConversationId(id);
                  setReplyError(null);
                  setRequiresTag(false);
                }}
                loading={conversations.isLoading}
              />
            </div>
          </aside>

          {/* ---------------------------------------------------- the thread */}
          <section className="flex min-w-0 flex-1 flex-col bg-canvas">
            {!conversationId || !selected ? (
              <EmptyState
                title="Select a conversation"
                description="Pick someone on the left to read the thread and reply."
              />
            ) : (
              <>
                <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface px-4">
                  <span className="truncate text-sm font-medium">{customerLabel(selected)}</span>
                  <span className="text-[11px] text-content-faint">
                    {selected.messageCount} message{selected.messageCount === 1 ? '' : 's'}
                  </span>
                  {!selected.messagingWindow.isOpen && (
                    <Badge tone="warning" className="ml-1">
                      Window closed
                    </Badge>
                  )}
                </header>

                <MessageThread messages={thread.data?.messages ?? []} loading={thread.isLoading} />

                <ReplyBox
                  window={selected.messagingWindow}
                  sending={reply.isPending}
                  error={replyError}
                  requiresTag={requiresTag}
                  onSend={(text, tag) => reply.mutate({ text, tag })}
                />
              </>
            )}
          </section>

          {/* ------------------------------------------------- order sidebar */}
          {conversationId && selected && (
            <OrderPanel conversationId={conversationId} defaultCustomerName={customerLabel(selected)} />
          )}
        </>
      )}
    </AppShell>
  );
}

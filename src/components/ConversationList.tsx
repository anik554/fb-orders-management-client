'use client';

import { Avatar, Badge, EmptyState, Skeleton, cx } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { Conversation } from '@/lib/types';

export function customerLabel(conversation: {
  customerName: string | null;
  customerPsid: string;
}): string {
  return conversation.customerName ?? `Customer ${conversation.customerPsid.slice(-6)}`;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <ul className="divide-y divide-border-subtle">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="flex gap-3 px-3 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Messages sent to this Page will appear here the moment they arrive."
      />
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {conversations.map((conversation) => {
        const selected = conversation.id === selectedId;
        const preview = conversation.lastMessage;
        const name = customerLabel(conversation);

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={selected ? 'true' : undefined}
              className={cx(
                'flex w-full gap-3 px-3 py-3 text-left transition',
                // A left rail rather than a full tint: the selected row stays
                // readable and the list keeps one background colour.
                selected
                  ? 'bg-surface-sunken shadow-[inset_2px_0_0_0_var(--brand)]'
                  : 'hover:bg-surface-sunken',
              )}
            >
              <Avatar name={name} size={36} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-content-faint">
                    {relativeTime(conversation.lastMessageAt)}
                  </span>
                </div>

                <p className="mt-0.5 truncate text-xs text-content-muted">
                  {preview ? (
                    <>
                      {preview.direction === 'OUTGOING' && (
                        <span className="text-content-faint">You: </span>
                      )}
                      {preview.text ?? (preview.hasAttachment ? 'Sent an attachment' : '')}
                    </>
                  ) : (
                    'No messages'
                  )}
                </p>

                {!conversation.messagingWindow.isOpen && (
                  <Badge tone="warning" className="mt-1.5">
                    Window closed
                  </Badge>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

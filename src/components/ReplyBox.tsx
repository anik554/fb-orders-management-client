'use client';

import { useState } from 'react';
import { ClockIcon, SendIcon } from '@/components/icons';
import { Button, Notice, Select, Textarea, cx } from '@/components/ui';
import { windowRemaining } from '@/lib/format';
import { MESSAGE_TAGS, MessageTag, MessagingWindow } from '@/lib/types';

const MAX_LENGTH = 2000;

const TAG_LABELS: Record<MessageTag, string> = {
  HUMAN_AGENT: 'Human agent — a person is replying',
  POST_PURCHASE_UPDATE: 'Post-purchase update — about an order they placed',
  ACCOUNT_UPDATE: 'Account update — a change to their account',
  CONFIRMED_EVENT_UPDATE: 'Confirmed event update — a booking they made',
};

export function ReplyBox({
  window: messagingWindow,
  sending,
  error,
  requiresTag,
  onSend,
}: {
  window: MessagingWindow;
  sending: boolean;
  error: string | null;
  /** Set after the backend rejected an untagged reply with 422. */
  requiresTag: boolean;
  onSend: (text: string, tag?: MessageTag) => void;
}) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState<MessageTag>('HUMAN_AGENT');

  const closed = !messagingWindow.isOpen;
  const remaining = windowRemaining(messagingWindow.expiresAt);
  const needsTag = closed || requiresTag;
  const trimmed = text.trim();
  // Warn as the limit approaches rather than only when it is hit.
  const nearLimit = text.length > MAX_LENGTH - 200;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!trimmed || sending) {
      return;
    }

    onSend(trimmed, needsTag ? tag : undefined);
    setText('');
  }

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-border-subtle bg-surface p-3">
      {closed && (
        <div className="mb-2.5">
          <Notice tone="warning" title="The 24-hour reply window has closed">
            {messagingWindow.lastCustomerMessageAt
              ? 'Facebook will only deliver a tagged message now. Choose the tag that genuinely describes yours — Meta audits tag use, and misuse can cost the whole platform its messaging access.'
              : 'This customer has never messaged the Page, so no reply window was ever opened.'}
          </Notice>
        </div>
      )}

      {error && (
        <div className="mb-2.5">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      {needsTag && (
        <Select
          aria-label="Message tag"
          value={tag}
          onChange={(event) => setTag(event.target.value as MessageTag)}
          className="mb-2 h-8 text-xs"
        >
          {MESSAGE_TAGS.map((option) => (
            <option key={option} value={option}>
              {TAG_LABELS[option]}
            </option>
          ))}
        </Select>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter makes a new line — what a chat does.
              if (event.key === 'Enter' && !event.shiftKey) {
                submit(event);
              }
            }}
            rows={1}
            placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
            className="max-h-40 min-h-[38px] resize-y pr-14"
          />

          {nearLimit && (
            <span
              className={cx(
                'pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular',
                text.length >= MAX_LENGTH ? 'text-danger' : 'text-content-faint',
              )}
            >
              {text.length}/{MAX_LENGTH}
            </span>
          )}
        </div>

        <Button tone="facebook" type="submit" loading={sending} disabled={trimmed.length === 0}>
          {!sending && <SendIcon className="h-4 w-4" />}
          Send
        </Button>
      </div>

      {!closed && remaining && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-content-faint">
          <ClockIcon className="h-3.5 w-3.5" />
          Reply window: {remaining}
        </p>
      )}
    </form>
  );
}

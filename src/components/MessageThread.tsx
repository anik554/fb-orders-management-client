'use client';

import { useEffect, useRef } from 'react';
import { Skeleton, cx } from '@/components/ui';
import { clockTime, dayLabel } from '@/lib/format';
import { Message } from '@/lib/types';

export function MessageThread({ messages, loading }: { messages: Message[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Follow the conversation as new messages arrive, the way a chat should.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-3 p-4">
        {[0, 1, 2].map((row) => (
          <div key={row} className={cx('flex', row % 2 ? 'justify-end' : 'justify-start')}>
            <Skeleton className="h-12 w-56 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  let lastDay = '';

  return (
    <div className="flex-1 overflow-y-auto scroll-slim px-4 py-4">
      {messages.map((message) => {
        const day = dayLabel(message.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const outgoing = message.direction === 'OUTGOING';

        return (
          <div key={message.id}>
            {showDay && (
              <div className="flex items-center gap-3 py-4">
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-content-faint">
                  {day}
                </span>
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
            )}

            <div className={cx('mb-1.5 flex', outgoing ? 'justify-end' : 'justify-start')}>
              <div
                className={cx(
                  'max-w-[min(30rem,78%)] px-3.5 py-2 text-sm leading-relaxed',
                  // Squared corner on the sending side: it reads as a tail, so
                  // direction is obvious without relying on colour alone.
                  outgoing
                    ? 'rounded-2xl rounded-br-md bg-brand text-brand-contrast'
                    : 'rounded-2xl rounded-bl-md bg-surface-raised text-content ring-1 ring-border-subtle',
                )}
              >
                {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

                {message.attachmentUrl && (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cx(
                      'mt-1 inline-block text-xs underline underline-offset-2',
                      outgoing ? 'opacity-90' : 'text-brand',
                    )}
                  >
                    View attachment
                  </a>
                )}

                <span
                  className={cx(
                    'mt-1 block text-[10px]',
                    outgoing ? 'text-brand-contrast/70' : 'text-content-faint',
                  )}
                >
                  {clockTime(message.createdAt)}
                  {message.sentBy === 'SYSTEM' && ' · system'}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}

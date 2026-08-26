'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';

interface DeletionStatus {
  confirmationCode: string;
  status: 'RECEIVED' | 'COMPLETED' | 'FAILED';
  receivedAt: string;
  completedAt: string | null;
  message: string;
}

export default function DataDeletionPage() {
  return (
    <Suspense
      fallback={<main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading…</main>}
    >
      <DataDeletion />
    </Suspense>
  );
}

/**
 * Public page for Meta's data-deletion flow.
 *
 * Meta requires a page that explains how to request deletion and lets someone
 * check a confirmation code. It must work for a visitor who is not signed in —
 * the person asking may have already removed the app.
 */
function DataDeletion() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const codeFromUrl = searchParams.get('code');

  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  async function lookup(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    setChecking(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(
        `${API_ORIGIN}/api/facebook/data-deletion/${encodeURIComponent(trimmed)}`,
      );

      if (response.status === 404) {
        setError('No deletion request was found with that confirmation code.');
        return;
      }

      if (!response.ok) {
        setError('We could not check that code just now. Please try again shortly.');
        return;
      }

      setStatus((await response.json()) as DeletionStatus);
    } catch {
      setError('We could not reach the server. Please try again shortly.');
    } finally {
      setChecking(false);
    }
  }

  // A code arriving in the URL comes from Meta's confirmation screen; look it up
  // without making the visitor press anything.
  useEffect(() => {
    if (codeFromUrl) {
      void lookup(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <nav className="mb-6 flex gap-4 text-xs text-slate-500">
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">Delete my data</h1>

      <section className="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <h2 className="text-base font-semibold">How to request deletion</h2>
        <p className="mt-2">There are two routes, and both work:</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            <strong>From Facebook.</strong> Open{' '}
            <span className="whitespace-nowrap">Settings &amp; privacy → Settings → Apps and</span>{' '}
            websites, find this app, and choose <strong>Remove</strong>. Facebook offers to request
            deletion of your data at the same time; it notifies us and we act on it.
          </li>
          <li>
            <strong>Email us.</strong> Write to{' '}
            <a href="mailto:anik@shomvob.com" className="underline underline-offset-4">
              anik@shomvob.com
            </a>{' '}
            from the address on your account. We will confirm and give you a code.
          </li>
        </ol>

        <h2 className="mt-6 text-base font-semibold">What gets deleted</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Every connected Page is disconnected and its access token destroyed.</li>
          <li>
            All Messenger conversations and messages for those Pages — customer IDs, names, message
            text and attachment links.
          </li>
        </ul>
        <p className="mt-2">
          Order records are kept, because they are the business&rsquo;s own accounting records and
          were entered by its staff rather than read from Facebook. Ask us if you want those removed
          too. The{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>{' '}
          sets this out in full.
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Check a request</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter the confirmation code you were given.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void lookup(code);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. 4f3c1a9b2d7e5c8a1b0f6d2e"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={checking || code.trim().length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {checking ? 'Checking…' : 'Check'}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {status && (
          <div
            role="status"
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              status.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : status.status === 'FAILED'
                  ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                  : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            }`}
          >
            <p className="font-medium">{status.status}</p>
            <p className="mt-0.5">{status.message}</p>
            <p className="mt-1 text-xs opacity-80">
              Requested {new Date(status.receivedAt).toLocaleString()}
              {status.completedAt && ` · completed ${new Date(status.completedAt).toLocaleString()}`}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

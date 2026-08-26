import Link from 'next/link';
import styles from './legal.module.css';

/**
 * Frame for the public legal pages.
 *
 * `APP_NAME`, `COMPANY` and `CONTACT_EMAIL` are the three things an operator
 * must set before these pages are truthful. They are constants rather than env
 * vars on purpose: a legal document should be reviewed and committed, not
 * swapped at deploy time.
 */
export const APP_NAME = 'Order Desk BD';
export const COMPANY = 'Shomvob';
export const CONTACT_EMAIL = 'anik@shomvob.com';
export const LAST_UPDATED = '26 August 2026';

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <nav className="mb-6 flex gap-4 text-xs text-slate-500">
        <Link href="/privacy" className="underline underline-offset-4 hover:text-slate-800 dark:hover:text-slate-200">
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline underline-offset-4 hover:text-slate-800 dark:hover:text-slate-200">
          Terms of Service
        </Link>
        <Link href="/data-deletion" className="underline underline-offset-4 hover:text-slate-800 dark:hover:text-slate-200">
          Delete my data
        </Link>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">
        {APP_NAME} · operated by {COMPANY} · last updated {LAST_UPDATED}
      </p>

      <div className={`mt-6 text-sm text-slate-700 dark:text-slate-300 ${styles.prose}`}>
        {children}
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
        Questions about this document? Write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </footer>
    </main>
  );
}

import type { Metadata } from 'next';

// The page itself is a client component (it reads a query param and calls the
// API), and client components cannot export metadata — so the title lives here.
// Meta's reviewers land on this page directly, so it should not inherit the
// dashboard's title.
export const metadata: Metadata = {
  title: 'Delete my data',
  description: 'Request deletion of your data, or check the status of a request.',
};

export default function DataDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

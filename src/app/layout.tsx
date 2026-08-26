import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Self-hosted at build time by next/font, so there is no request to a font CDN
// at runtime and no layout shift while it loads.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: 'Order Desk', template: '%s · Order Desk' },
  description: 'Facebook Page conversations and orders in one place',
};

/**
 * Applies the saved theme before the first paint.
 *
 * Reading localStorage from a React effect runs after hydration, which means a
 * dark-mode user sees a white flash on every navigation. This is the one place
 * a blocking inline script is the right tool.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('fboms.theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

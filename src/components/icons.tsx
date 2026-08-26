/**
 * The handful of icons this app needs, inline.
 *
 * An icon package would add a dependency and a bundle for maybe eight glyphs.
 * All of them inherit `currentColor` so they follow the theme without a second
 * dark-mode rule anywhere.
 */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function InboxIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M21 12a9 9 0 1 1-3.6-7.2" />
      <path d="M7.5 12.5l2.5 2.5 4-5" />
    </svg>
  );
}

export function ChatIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.7L4 21l1.3-3.6A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

export function OrdersIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 7l1.5 12A2 2 0 0 0 7.5 21h9a2 2 0 0 0 2-1.9L20 7" />
      <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" />
    </svg>
  );
}

export function PagesIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function AdminIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7.5 3.2v5.1c0 4.3-3 8.2-7.5 9.7-4.5-1.5-7.5-5.4-7.5-9.7V6.2L12 3Z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  );
}

export function SunIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M18.4 5.6l-1 1M6.6 17.4l-1 1" />
    </svg>
  );
}

export function MoonIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function SignOutIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20H15" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

export function SendIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12l16-8-6 16-3-6-7-2Z" />
    </svg>
  );
}

export function PlusIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export function ClockIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.79 8.45-4.94 8.45-9.94Z" />
    </svg>
  );
}

export function DashboardIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function ReportsIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </svg>
  );
}

export function CustomersIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 6.2a3.5 3.5 0 0 1 0 6.6M18 19.6a6.2 6.2 0 0 0-1.4-4" />
    </svg>
  );
}

export function TeamIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0M15 19a5 5 0 0 1 6.5-4.4" />
    </svg>
  );
}

export function CheckIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function BillingIcon(props: { className?: string }) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

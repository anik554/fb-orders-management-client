# Frontend — Messenger Inbox

Next.js 15 (App Router) + TypeScript + Tailwind 4 + TanStack Query + socket.io-client.

**Status: Phase 6 (production readiness) complete.**

## Running it

The backend must be up first (`cd ../backend && npm run start:dev`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Opens on http://localhost:3001. `NEXT_PUBLIC_API_URL` points at the backend
origin (default `http://localhost:3000`); the API lives under `/api` there.

Keep 3001 as the port unless you also add the new origin to `CORS_ORIGINS` in
the backend's `.env` — the API rejects unknown origins.

## Screens

| Route | What it does |
| --- | --- |
| `/` | Sends you to `/inbox` or `/login` depending on stored tokens |
| `/login` | Sign in, or sign up a new business (same form, toggled) |
| `/dashboard` | Landing screen: money, who is waiting, windows about to close |
| `/inbox` | Page switcher, conversation list, message thread, reply box, order panel |
| `/customers` | Everyone who has messaged, with order history inline |
| `/reports` | Daily charts and breakdowns over any range up to a year |
| `/orders` | All orders for a Page, filterable by status, payment method, name or phone |
| `/settings/pages` | Owner only: connect a Facebook Page, or disconnect one |
| `/settings/team` | Owner only: invite staff, revoke invitations, disable members |
| `/settings/billing` | Owner only: plan, usage, price cards, submit a payment, history |
| `/invite/[token]` | Public. A colleague sets their name and password and is in |
| `/admin` | Super admin only: platform stats, business list, suspend/reactivate, audit log |
| `/privacy` | Public. Privacy policy — required for Meta App Review |
| `/terms` | Public. Terms of service |
| `/data-deletion` | Public. How to request deletion, and check a confirmation code |

## Design system

Everything renders from **semantic tokens**, not raw palette classes. Components
reference `surface`, `border-subtle`, `content-muted`, `brand`, `positive`
and so on; both themes are defined once in
[globals.css](src/app/globals.css).

The first pass of this UI used `bg-white` with a `dark:` variant bolted onto
every element, which meant a new screen was light-mode-only until somebody
noticed. Tokens make that mistake impossible — there is no light-only value to
reach for.

- **Primitives** live in [components/ui](src/components/ui/index.tsx): Button,
  Badge, Card, Input, Select, Textarea, Notice, EmptyState, Skeleton, Avatar.
- **Icons** are inline SVG in [components/icons.tsx](src/components/icons.tsx) —
  a dependency and a bundle for eight glyphs is not worth it, and they inherit
  `currentColor` so they follow the theme for free.
- **Theme** is a class on `<html>`, set by an inline script in the root layout
  *before first paint*. Reading `localStorage` in an effect instead would flash
  the wrong theme on every load.
- **Typography** is Inter via `next/font`, self-hosted at build time — no font
  CDN request at runtime and no layout shift.

### The app shell

[AppShell](src/components/AppShell.tsx) frames every signed-in screen: sidebar
navigation, business identity, theme toggle, sign-out, the Page switcher and the
realtime indicator.

Each screen used to carry its own header with a hand-rolled row of links, and
they drifted — the inbox had a Pages link, orders had none, and the admin panel
looked like a different product. One shell means navigation only has to be right
once.

Under `md` the sidebar becomes a bottom bar: a seller answering messages on a
phone should not lose a third of the screen to navigation. The inbox order panel
hides under `xl`, because three columns do not fit a laptop and the thread is
the one that has to stay usable.

The realtime indicator shows a dot **and a word**, with a tooltip. Colour alone
would leave a colour-blind user guessing, and "offline" is the one state an agent
must notice — replies still send, but new messages stop appearing on their own.

## How it works

- **Auth.** `src/lib/api.ts` wraps every call. A 401 triggers one refresh-token
  attempt and replays the request, so a 15-minute access token expiring
  mid-session is invisible. If the refresh fails, tokens are cleared and the
  user lands back on `/login`.
- **Realtime.** `useRealtime` connects to the backend's `/realtime` namespace
  with the access token in the handshake. The server decides which page rooms
  the socket joins — there is nothing to subscribe to from the client. A
  `new_message` event invalidates the affected queries rather than patching the
  cache, keeping one source of truth. The header dot shows
  live / connecting / offline.
- **Messaging window.** Each conversation carries `messagingWindow` from the
  API. Inside the window the composer shows the time remaining. Outside it, the
  composer explains why and requires a message tag before it will send. A 422
  from the backend also flips the tag picker on, so the two stay in agreement
  even if the window closes between page load and send.
- **Multi-page.** The header `select` lists every connected Page and switching
  clears the selected conversation. Events carry `pageId`, so a message for a
  Page you are not currently viewing still refreshes that Page's list.

## Orders

The inbox carries an order panel beside the thread, so an agent can take an
order without losing sight of what the customer asked for. `/orders` is the
whole book for a Page, with filters.

Status buttons are rendered from `allowedTransitions` on the order itself — the
workflow rules are not duplicated here, so the UI cannot offer a move the server
would reject. An `order_status_updated` event refreshes both views, so an order
another agent moves updates here without a refresh, and drops out of a filtered
list if it no longer matches.

The order form shows a running total as you type, but that number is only a
preview: the server recomputes it from the line items and its figure is the one
stored.

## Admin panel

Sign-in routes by role: a `SUPER_ADMIN` lands on `/admin` rather than `/inbox`,
since they own no Pages and the inbox would be an empty screen for them.

Suspending asks for a reason inline before it fires — it signs the owner out and
closes their live connections, so it is not a single-click action, and the reason
goes into the audit log. Reactivating is the safe direction and applies straight
away.

The route guard here is a convenience, not the security boundary: the API
enforces the role on every request. It exists so a non-admin who lands on the URL
is redirected instead of shown a screen of permission errors.

## Roles on the client

`useSession` takes the roles a screen accepts — a single one, or
`TEAM_ROLES` for the five screens the whole shop uses. The nav is built from
the same fact, so staff are not shown a Pages or Team link that would only 403.

Only the *unauthenticated* case redirects. A wrong role renders
`WrongAccountNotice`, which names the account actually signed in and offers a
way out. That is not a style preference: an earlier version bounced a platform
admin off `/settings/pages` to `/admin` silently, and the Connect button
looked like it did not exist. It cost three rounds of debugging to find.

None of this is the security boundary. The API checks the role on every request;
this decides only what the user is *told*.

## What a 401 or 403 is allowed to say

Both statuses cover two unrelated situations: a session that merely ran out, and
a decision about this account — disabled by the owner, suspended by the platform,
wrong password. `humaniseError` used to flatten every one of them into "Your
session has ended. Please sign in again."

That cost a real afternoon. A shop was suspended mid-session while its owner was
connecting a Facebook Page; the API said `This business account is suspended` on
every request, this screen said the session had ended, and the owner retried the
login — where the 403 branch replaced the same sentence with "Your account does
not have access to this." The one fact that explained everything was thrown away
twice.

Now the server's message wins whenever it is a *reason*. Only genuinely opaque
messages get replaced: Passport's bare `Unauthorized` for a missing or expired
token, anything about refresh tokens (a credential the user never sees), and
`Insufficient role for this resource`. See `OPAQUE_MESSAGES` in
[ErrorNotice.tsx](src/components/ErrorNotice.tsx).

`useSession` also carries the reason to the sign-in screen as
`/login?reason=…`, so someone bounced out of the app reads why on arrival
instead of after guessing a password. An ordinary expiry carries nothing and the
screen stays quiet.

## Invitations

The invite link is shown exactly once, in the response that creates it, because
the backend stores only a hash of the token. The screen says so plainly and
gives a Copy button, since there is no email to fall back on yet.

The accept screen previews the invitation before asking for anything — business
name and the email the account will use — so a stale or revoked link fails
before someone types a password. The email is fixed by the invitation and is not
an input.

## Billing

The plan cards, the period dropdown and the prices all come from
`GET /billing/plans` — the client hard-codes no price. A price shown here that
disagrees with what the server charges is worse than no price at all.

**The banner is quiet most of the time.** `SubscriptionBanner` renders nothing
while a subscription is healthy, and nothing for the first four days of a trial.
It appears when there is a date to act on. A strip that is always there becomes
furniture, and by the time it says something urgent nobody reads it.

Staff see the same warning without the button. They cannot pay, but they are the
ones at the screen all day, and "tell the boss the trial ends Thursday" is how
the owner finds out in time.

**A 402 needs no special handling.** The server sends a sentence worth reading
("Your subscription has expired. Renew it to carry on taking orders."), and
`humaniseError` shows it wherever the action was attempted — inside the reply
box, next to the order button. The banner above already carries the way out, so
there is no modal and nothing to dismiss.

The payment form is explicit that it charges nothing and that no PIN belongs in
it. It records that money was sent so a human can match it to the account.

## Charts

[Chart.tsx](src/components/Chart.tsx) draws inline SVG — a `LineChart` and a
`BarList`. A charting library would be a substantial dependency and bundle for
two shapes over at most a year of daily points; these read the same data the API
returns and inherit the theme through CSS variables, so they stay legible in
both light and dark with no second palette.

A fixed `viewBox` scaled by CSS makes them responsive without measuring the
container. Hovering is served by one invisible band per point, so the cursor
finds a column rather than having to hit a 2px line.

## Public legal pages

`/privacy`, `/terms` and `/data-deletion` render without signing in, because
Meta's reviewers and anyone who has already removed the app must be able to read
them.

They are written against what the code actually does — the four permissions
requested, AES-256-GCM at rest, the signature check on webhooks, what a deletion
request removes and what it keeps. A generic template that does not match the
app's behaviour is a common App Review rejection.

Before deploying, set `APP_NAME`, `COMPANY`, `CONTACT_EMAIL` and
`LAST_UPDATED` in `src/app/legal/LegalPage.tsx`. They are constants rather than
env vars on purpose: a legal document should be reviewed and committed, not
swapped at deploy time.

## Deploying

Ships as a Dockerfile using Next's `standalone` output, so the runtime image
carries only the traced dependencies and no build toolchain. See
[../docs/deploy-railway.md](../docs/deploy-railway.md).

### `NEXT_PUBLIC_API_URL` is a build-time value

It is **inlined into the client bundle** when the image is built, not read at
runtime. Setting it after a deploy does nothing — the browser keeps calling
whatever was baked in. It is therefore a Docker `ARG`, and the build **fails on
purpose** if it is missing rather than shipping a bundle that calls
`localhost:3000` from a customer's browser.

Whenever the backend URL changes, the frontend must be rebuilt, not just
reconfigured.

## Known gaps

- Tokens are in `localStorage`, so any XSS on this origin can read them.
  Moving the refresh token to an httpOnly cookie is the hardening step before
  production.
- No optimistic send: the reply appears once the backend confirms Facebook
  accepted it. That is deliberate — showing an unsent message would tell the
  agent a customer had been answered when they had not.
- Conversation list and thread are single-page reads (30 and 100 items). Both
  endpoints are paginated; infinite scroll is not wired up yet.
- Running `npm run build` while `npm run dev` is running corrupts `.next`,
  since both use that directory. If the dev server starts throwing `ENOENT` on
  a vendor chunk, stop it, `rm -rf .next`, and start it again.
- Invitations have no email delivery: the owner copies the link and sends it
  themselves. The wording on both screens is honest about that rather than
  claiming "an invite has been sent".
- Attachments render as a link, not a thumbnail. Facebook's CDN URLs expire,
  which is why the spec moves them to S3/Cloudinary later.

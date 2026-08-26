import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, COMPANY, CONTACT_EMAIL, LegalPage } from '../legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${APP_NAME} handles data from connected Facebook Pages.`,
};

/**
 * Written against what the code actually does, not a template.
 *
 * Meta's reviewers compare this page with the permissions requested and the
 * behaviour they see in the screencast; a generic policy that does not match the
 * app is a common rejection. Every claim below is true of this codebase — if the
 * behaviour changes, this page changes with it.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {APP_NAME} (&ldquo;the Service&rdquo;) is operated by {COMPANY}. It lets a business that
        sells through a Facebook Page read and answer its Messenger conversations from one
        dashboard, and turn those conversations into orders.
      </p>
      <p>
        This policy explains what the Service stores, why, and how to have it removed. It covers
        two groups of people: the <strong>business owners and staff</strong> who use the dashboard,
        and the <strong>customers</strong> who message a connected Page.
      </p>

      <h2>1. What we collect from business users</h2>
      <ul>
        <li>
          <strong>Account details</strong> — name, email address, business name, and a password
          stored only as a bcrypt hash. We never hold your password.
        </li>
        <li>
          <strong>Facebook Page grant</strong> — when you connect a Page, Facebook gives us a Page
          Access Token and your app-scoped Facebook user ID. We store the token encrypted with
          AES-256-GCM and never expose it through our API or interface.
        </li>
        <li>
          <strong>Session records</strong> — hashed refresh tokens, so you can be signed out of one
          device without affecting others.
        </li>
      </ul>
      <p>
        We request only four Facebook permissions: <code>pages_messaging</code>,{' '}
        <code>pages_show_list</code>, <code>pages_manage_metadata</code> and{' '}
        <code>business_management</code>. We do not request access to your posts, your friends,
        your ads, or your profile beyond what is needed to list the Pages you administer.
      </p>

      <h2>2. What we collect from customers who message a Page</h2>
      <p>
        When someone messages a connected Page, Facebook sends us that message. We store:
      </p>
      <ul>
        <li>the Page-Scoped ID (PSID) Facebook assigns them for that Page;</li>
        <li>the display name, where Facebook provides it;</li>
        <li>the message text, and the link to any attachment they sent;</li>
        <li>the time the message was sent.</li>
      </ul>
      <p>
        A PSID identifies a person only within a single Page and only to this app. It is not a
        Facebook profile ID and cannot be used to look anyone up on Facebook.
      </p>
      <p>
        If the business records an order from a conversation, its staff also enter a delivery name,
        phone number, address, items and payment method. That information is typed in by the
        business, not read from Facebook.
      </p>

      <h2>3. How the information is used</h2>
      <p>Only to run the Service:</p>
      <ul>
        <li>showing a business its own conversations and letting it reply;</li>
        <li>delivering those replies to the customer through Facebook&rsquo;s Send API;</li>
        <li>recording and tracking orders;</li>
        <li>counting volumes so we can operate and support the platform.</li>
      </ul>
      <p>
        We do <strong>not</strong> use message content for advertising, profiling, training machine
        learning models, or building audiences. We do not sell it. We do not share it with third
        parties for their own purposes.
      </p>

      <h2>4. Who can see what</h2>
      <p>
        Each business sees only its own Pages, conversations and orders. Isolation is enforced on
        every request from the signed-in account, not from anything the browser sends.
      </p>
      <p>
        {COMPANY} staff administering the platform can see the list of businesses, their connected
        Page names, and counts of conversations and orders. Our administration tools deliberately
        expose <strong>no message content, no order contents and no access tokens</strong>.
        Engineers may access production data only to investigate a fault, and only as long as that
        takes.
      </p>

      <h2>5. Sub-processors</h2>
      <ul>
        <li>
          <strong>Meta Platforms</strong> — the source of the messages and the route replies take.
        </li>
        <li>
          <strong>Our hosting and database provider</strong> — stores the data described above.
        </li>
      </ul>
      <p>Data is processed on servers operated by these providers on our behalf.</p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>
          <strong>Conversations and messages</strong> — while the Page is connected, and deleted on
          request.
        </li>
        <li>
          <strong>Page Access Tokens</strong> — destroyed the moment a Page is disconnected, an app
          authorisation is removed, or a deletion request is honoured.
        </li>
        <li>
          <strong>Orders</strong> — kept as the business&rsquo;s own commercial record, since they
          may be needed for accounting and dispute resolution. See section 7.
        </li>
        <li>
          <strong>Administrative audit records</strong> — suspensions and reactivations are kept as
          an append-only log, so account actions can always be accounted for.
        </li>
      </ul>

      <h2>7. Deleting your data</h2>
      <p>Three ways, all of which work:</p>
      <ul>
        <li>
          <strong>Disconnect a Page</strong> in the dashboard. The access token is destroyed
          immediately and no further messages arrive.
        </li>
        <li>
          <strong>Remove the app</strong> from your Facebook settings. Facebook notifies us and we
          disconnect your Pages and destroy their tokens.
        </li>
        <li>
          <strong>Request deletion</strong> — from Facebook&rsquo;s app settings, or on our{' '}
          <Link href="/data-deletion" className="underline underline-offset-4">
            data deletion page
          </Link>
          . We disconnect your Pages, destroy their tokens, and delete every conversation and
          message belonging to them. You receive a confirmation code and a link to check the
          status.
        </li>
      </ul>
      <p>
        <strong>What survives a deletion request:</strong> order records. Their contents were
        entered by the business, are its own accounting records, and keep no Facebook identifier
        once the conversation is removed. A business that wants its orders erased as well can ask
        us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      <p>
        A customer who messaged a Page and wants their conversation removed should ask that
        business, which can delete it, or write to us and we will act on it.
      </p>

      <h2>8. Security</h2>
      <ul>
        <li>Page Access Tokens are encrypted at rest with AES-256-GCM.</li>
        <li>Passwords are stored as bcrypt hashes; refresh tokens only as SHA-256 digests.</li>
        <li>
          Every webhook delivery is verified against Facebook&rsquo;s{' '}
          <code>X-Hub-Signature-256</code> header before it is accepted, so nobody can inject
          messages into an inbox.
        </li>
        <li>All traffic is served over HTTPS.</li>
        <li>Credentials and tokens are redacted from our logs.</li>
      </ul>
      <p>
        No system is perfectly secure. If you believe you have found a vulnerability, please write
        to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>{' '}
        before disclosing it publicly.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is a business tool and is not directed at anyone under 13. We do not knowingly
        create accounts for children.
      </p>

      <h2>10. Changes</h2>
      <p>
        If we change how data is handled, this page is updated and the date at the top changes.
        Material changes are communicated to account holders by email.
      </p>

      <h2>11. Contact</h2>
      <p>
        {COMPANY} —{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}

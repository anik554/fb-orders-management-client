import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, COMPANY, CONTACT_EMAIL, LegalPage } from '../legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms for using ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your use of {APP_NAME} (&ldquo;the Service&rdquo;), operated by{' '}
        {COMPANY}. By creating an account or connecting a Facebook Page you agree to them.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        The Service collects the Messenger conversations of the Facebook Pages you connect, lets
        you and your staff reply to them, and lets you record and track orders arising from those
        conversations.
      </p>
      <p>
        We are not affiliated with, endorsed by, or acting on behalf of Meta Platforms. The Service
        depends on Facebook&rsquo;s Messenger Platform, and your use of it is also subject to
        Meta&rsquo;s own terms and policies.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must give accurate details and keep your password confidential.</li>
        <li>
          You are responsible for everything done under your account, including by staff you invite.
        </li>
        <li>One account per business. Do not share credentials.</li>
        <li>You must be old enough to enter a contract in your jurisdiction.</li>
      </ul>

      <h2>3. Connecting a Facebook Page</h2>
      <ul>
        <li>
          You may only connect a Page you are authorised to administer. Connecting someone
          else&rsquo;s Page is a breach of these terms.
        </li>
        <li>
          A Page can belong to only one account on the Service. If a Page is already connected
          elsewhere, we will refuse to move it rather than transfer another business&rsquo;s
          conversations to you.
        </li>
        <li>You can disconnect a Page at any time from the dashboard.</li>
      </ul>

      <h2>4. How you must use it</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>send unsolicited bulk messages, spam, or anything Meta&rsquo;s policies prohibit;</li>
        <li>
          misuse Facebook <strong>message tags</strong>. Tags exist for specific purposes such as a
          shipping update. Applying a tag to reach someone outside the 24-hour window for marketing
          is a breach of these terms and of Meta&rsquo;s policy, and can cost the whole platform
          its messaging access;
        </li>
        <li>harass, deceive or defraud the people who message you;</li>
        <li>
          collect or store payment card details, passwords, or government identity numbers in
          conversations or order notes;
        </li>
        <li>
          attempt to reach another business&rsquo;s data, probe our systems, or circumvent rate
          limits.
        </li>
      </ul>
      <p>
        We may suspend an account that breaches these terms. Where we do, the reason is recorded and
        we will tell you what it was.
      </p>

      <h2>5. Your customers&rsquo; data</h2>
      <p>
        The conversations and order details in your account concern your customers. You are the
        party that decides what to do with them; we process them on your behalf, as described in
        our{' '}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        . You are responsible for handling that information lawfully, including telling your
        customers how you use it and honouring their requests about it.
      </p>

      <h2>6. Availability</h2>
      <p>
        We aim to keep the Service running but do not promise uninterrupted availability. Parts of
        it depend on Facebook: if Meta changes its platform, restricts a permission, or has an
        outage, features may stop working through no act of ours.
      </p>
      <p>
        Messages can only be delivered within the limits Facebook imposes — most notably the
        24-hour messaging window. The Service tells you when that window has closed; it cannot
        override it.
      </p>

      <h2>7. Fees</h2>
      <p>
        Where a plan carries a fee, it is agreed with you separately before it applies. We will give
        notice before changing what an existing account pays.
      </p>

      <h2>8. Ending the arrangement</h2>
      <ul>
        <li>You may stop using the Service and delete your data at any time.</li>
        <li>
          We may suspend or close an account that breaches these terms, or if required by law or by
          Meta.
        </li>
        <li>
          On closure, Page tokens are destroyed immediately. Other data is handled as set out in the
          Privacy Policy.
        </li>
      </ul>

      <h2>9. Liability</h2>
      <p>
        The Service is provided as it is. To the extent the law allows, {COMPANY} is not liable for
        lost profits, lost sales, or indirect or consequential loss arising from your use of it, or
        from any act, restriction or outage of Meta&rsquo;s platform. Nothing here excludes
        liability that cannot lawfully be excluded.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top changes and, for material changes, account
        holders are notified by email. Continuing to use the Service after that means you accept
        the update.
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

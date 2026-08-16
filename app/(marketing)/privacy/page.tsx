import Link from "next/link"

import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalSubheading,
  LegalTable,
  Term,
} from "@/components/legal/legal-doc"
import { LEGAL, PRIVACY_POLICY, SUB_PROCESSORS } from "@/lib/legal/constants"
import { RETENTION } from "@/lib/privacy/retention"

export const metadata = {
  title: "Privacy policy",
  description:
    "What Aurora Organics collects, why, how long it is kept, and the choices you have.",
}

const TOC = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "photos", label: "Photos and how they are handled" },
  { id: "sensitive", label: "Health and biometric data" },
  { id: "why", label: "Why we use it, and our legal basis" },
  { id: "automated", label: "Automated analysis" },
  { id: "sharing", label: "Who we share it with" },
  { id: "transfers", label: "International transfers" },
  { id: "retention", label: "How long we keep it" },
  { id: "rights", label: "Your rights" },
  { id: "cookies", label: "Cookies and analytics" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security and breaches" },
  { id: "regional", label: "Regional notices" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      version={PRIVACY_POLICY.version}
      updated={PRIVACY_POLICY.updated}
      intro={
        <p>
          This policy describes what {LEGAL.tradingName} actually does with your
          data. Where it states a limit, that limit is enforced in code. Where a
          decision is yours, you can change it in{" "}
          <Link
            href="/dashboard/privacy"
            className="text-foreground underline underline-offset-4"
          >
            Privacy settings
          </Link>
          .
        </p>
      }
      toc={TOC}
    >
      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          {LEGAL.entity} ({LEGAL.tradingName}) is the controller of the personal
          data described in this policy. You can reach us at{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {LEGAL.privacyEmail}
          </a>{" "}
          or by post at {LEGAL.postalAddress}.
        </p>
        <p>
          Aurora Organics is a cosmetic skin wellness service. It provides
          cosmetic and lifestyle guidance only. It does not diagnose, treat, or
          prevent any medical condition, and it is not a medical device. See our{" "}
          <Link
            href="/terms"
            className="text-foreground underline underline-offset-4"
          >
            Terms of use
          </Link>{" "}
          for the full disclaimer.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="2. What we collect">
        <LegalList>
          <li>
            <Term>Account information.</Term> Email address, name,
            authentication method, and a profile image if you sign in with
            Google or Apple.
          </li>
          <li>
            <Term>Session metadata.</Term> IP address and browser user agent,
            stored against your active session for security and account
            management.
          </li>
          <li>
            <Term>Wellness profile.</Term> Age band derived from your date of
            birth, skin type, sun sensitivity, Ayurvedic lean, concerns, goals,
            allergies, current routine, prescriptions, medications, and
            lifestyle answers. Every field is optional except those needed to
            run a scan.
          </li>
          <li>
            <Term>Location and climate.</Term> City, region, country, and
            approximate coordinates if you share them, plus the climate bands we
            derive from them.
          </li>
          <li>
            <Term>Consent records.</Term> What you agreed to, which version of
            this policy you agreed to, and when.
          </li>
          <li>
            <Term>Scan results.</Term> The assessment produced for each scan:
            bands, notes, summary, and recommendations, along with the profile
            and climate snapshot used to produce it.
          </li>
          <li>
            <Term>Chat.</Term> Messages you send and replies you receive,
            including any photo you attach to a chat message.
          </li>
          <li>
            <Term>Usage records.</Term> Which model handled each request and how
            many tokens it used, for billing and abuse prevention.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="photos" title="3. Photos and how they are handled">
        <p>
          Photos are handled differently depending on where you upload them, and
          it matters, so we are specific.
        </p>
        <LegalSubheading>Scan photos</LegalSubheading>
        <p>
          A scan photo is checked in your browser first, using an on-device face
          detector. The image never leaves your device unless it passes that
          check and you continue. It is then sent to Google&apos;s Gemini API for
          analysis, and discarded once the assessment comes back.{" "}
          <Term>We do not store scan photos.</Term> Only the resulting text
          assessment is saved.
        </p>
        <LegalSubheading>Live scan</LegalSubheading>
        <p>
          If you use a live scan, video frames stream to Google in real time for
          the duration of the session. We keep the session transcript and the
          final assessment. We do not keep the video.
        </p>
        <LegalSubheading>Chat photos</LegalSubheading>
        <p>
          A photo you attach to a chat message is different: it is stored with
          that message so the conversation still makes sense when you return to
          it. These images are automatically deleted after{" "}
          {RETENTION.chatImageDays} days, and you can delete them sooner by
          deleting your chat data.
        </p>
        <LegalSubheading>Reports</LegalSubheading>
        <p>
          Downloadable reports contain the text of your assessment. They contain
          no photographs.
        </p>
      </LegalSection>

      <LegalSection id="sensitive" title="4. Health and biometric data">
        <p>
          A photograph of your face, together with the skin concerns, allergies,
          medications and prescriptions in your profile, is treated as{" "}
          <Term>special category data</Term> under the UK and EU GDPR
          (Article 9), and may be treated as biometric data under laws such as
          the Illinois Biometric Information Privacy Act and the Texas Capture
          or Use of Biometric Identifier Act.
        </p>
        <p>
          We process it only on the basis of your{" "}
          <Term>explicit consent</Term>, which you give during onboarding before
          any photo is processed, and which you can withdraw at any time by
          deleting your data or your account. Withdrawing consent does not
          affect processing that already happened.
        </p>
        <p>
          We do not use face images to identify you, to match you against any
          other person, or to build a faceprint. The image is analysed for
          cosmetic surface characteristics and then discarded, per the retention
          schedule in section 9. We do not sell biometric data, and we do not
          disclose it to anyone other than the processors listed in section 7.
        </p>
      </LegalSection>

      <LegalSection id="why" title="5. Why we use it, and our legal basis">
        <LegalTable
          caption="Purpose and legal basis for each category of processing"
          headers={["What we do", "Why", "Legal basis (UK and EU GDPR)"]}
          rows={[
            [
              "Create and run your account",
              "So you can sign in and keep your history",
              "Performance of a contract (Art. 6(1)(b))",
            ],
            [
              "Analyse a scan photo and produce an assessment",
              "The core service you asked for",
              "Explicit consent (Art. 9(2)(a)), plus contract (Art. 6(1)(b))",
            ],
            [
              "Personalise guidance using your profile and climate",
              "So advice matches your skin and where you live",
              "Explicit consent (Art. 9(2)(a))",
            ],
            [
              "Store session IP and user agent",
              "Account security and abuse prevention",
              "Legitimate interests (Art. 6(1)(f))",
            ],
            [
              "Record per-call model usage",
              "Billing, cost control, and abuse detection",
              "Legitimate interests (Art. 6(1)(f))",
            ],
            [
              "Send marketing email",
              "Product updates, only if you opt in",
              "Consent (Art. 6(1)(a))",
            ],
            [
              "Measure page usage",
              "Understanding which parts of the product get used",
              "Consent (Art. 6(1)(a))",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="automated" title="6. Automated analysis">
        <p>
          Your assessment is produced entirely by an automated system. No person
          reviews your photo or your results unless you explicitly request an
          expert review, and that feature is not yet available.
        </p>
        <p>
          This automated processing does not produce legal effects or similarly
          significant effects on you within the meaning of Article 22 of the
          GDPR: the output is cosmetic guidance, it does not determine access to
          anything, and you are free to disregard it. It can also be wrong. If
          you want to challenge or discuss a result, or ask for it to be
          deleted, write to{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {LEGAL.privacyEmail}
          </a>
          .
        </p>
        <p>
          <Term>We do not use your photos, chats, or profile to train AI
          models</Term>, ours or anyone else&apos;s.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="7. Who we share it with">
        <p>
          We do not sell personal data and we do not share it for advertising.
          We use the processors below, each bound to process data only on our
          instructions.
        </p>
        <LegalTable
          caption="Sub-processors"
          headers={["Processor", "What it does", "What it sees", "Where"]}
          rows={SUB_PROCESSORS.map((processor) => [
            <Term key={processor.name}>{processor.name}</Term>,
            processor.purpose,
            processor.data,
            processor.region,
          ])}
        />
        <p>
          We will update this list before adding a new processor. If a change
          materially affects how your data is handled, we will tell you by email
          or in the product before it takes effect.
        </p>
        <p>
          We may also disclose data where we are legally required to, or to
          establish or defend a legal claim.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="8. International transfers">
        <p>
          Several of our processors are based in the United States, so data
          leaves the UK and EEA. Those transfers rely on the European
          Commission&apos;s Standard Contractual Clauses and the UK
          International Data Transfer Addendum, together with the technical
          measures described in section 12. You can request a copy of the
          transfer mechanism we rely on for any given processor.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="9. How long we keep it">
        <p>
          These periods are enforced by an automated daily job, not by policy
          alone.
        </p>
        <LegalTable
          caption="Retention schedule"
          headers={["Data", "Retained for"]}
          rows={[
            [
              <Term key="scan">Scan photos</Term>,
              "Not retained. Discarded as soon as the assessment is produced.",
            ],
            [
              <Term key="live">Live scan video</Term>,
              "Not retained. Only the session transcript is kept.",
            ],
            [
              <Term key="chatimg">Chat photos</Term>,
              `${RETENTION.chatImageDays} days, then automatically deleted.`,
            ],
            [
              <Term key="sessions">Expired sessions, including IP and user agent</Term>,
              `Deleted ${RETENTION.expiredSessionDays} days after expiry.`,
            ],
            [
              <Term key="otp">Sign-in codes and verification records</Term>,
              `Deleted ${RETENTION.verificationDays} days after expiry.`,
            ],
            [
              <Term key="usage">Model usage and cost records</Term>,
              `${RETENTION.aiUsageDays} days.`,
            ],
            [
              <Term key="scans">Scan results, reports, chat transcripts</Term>,
              "Until you delete them, or until you delete your account.",
            ],
            [
              <Term key="profile">Profile, location, consent records</Term>,
              "Until you delete them, or until you delete your account.",
            ],
          ]}
        />
        <p>
          When you delete your account, everything above is deleted. Aggregate
          figures that cannot identify you may be retained.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="10. Your rights">
        <p>
          Depending on where you live, you have some or all of the following
          rights. Most of them you can exercise yourself, immediately, in{" "}
          <Link
            href="/dashboard/privacy"
            className="text-foreground underline underline-offset-4"
          >
            Privacy settings
          </Link>
          .
        </p>
        <LegalList>
          <li>
            <Term>Access.</Term> See what we hold.
          </li>
          <li>
            <Term>Portability.</Term> Download everything we hold about you as a
            machine-readable JSON file, from Privacy settings.
          </li>
          <li>
            <Term>Rectification.</Term> Correct your profile in Settings at any
            time.
          </li>
          <li>
            <Term>Erasure.</Term> Delete individual scans, all scans, your
            profile, your location, all personal data, or your entire account.
            These take effect immediately.
          </li>
          <li>
            <Term>Withdraw consent.</Term> Turn off marketing email or analytics
            at any time. Withdrawing photo-processing consent means deleting
            your data, since the service cannot run without it.
          </li>
          <li>
            <Term>Restriction and objection.</Term> Ask us to pause or stop
            processing that relies on legitimate interests.
          </li>
          <li>
            <Term>Complain.</Term> If you are in the UK or EEA you may complain
            to your local supervisory authority. In the UK that is the
            Information Commissioner&apos;s Office.
          </li>
        </LegalList>
        <p>
          For anything not covered by the self-service controls, email{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {LEGAL.privacyEmail}
          </a>
          . We respond within 30 days. See also our{" "}
          <Link
            href="/privacy/data-deletion"
            className="text-foreground underline underline-offset-4"
          >
            data deletion page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="11. Cookies and analytics">
        <p>
          We use cookies and local storage for three things: keeping you signed
          in, remembering your theme, and remembering your analytics choice.
          Those are strictly necessary or set at your request, so they do not
          need consent.
        </p>
        <p>
          <Term>Analytics.</Term> We use Vercel Analytics to count page views.
          It does not set advertising cookies, does not follow you across other
          sites, and never sees your scans or chats. It only loads if you accept
          the banner, and declining costs you nothing.
        </p>
        <p>
          We do not use advertising cookies, ad networks, or cross-site tracking
          of any kind.
        </p>
      </LegalSection>

      <LegalSection id="children" title="12. Children">
        <p>
          Aurora Organics is not for children. You must be at least{" "}
          {LEGAL.minimumAge} years old to create an account. We do not knowingly
          collect data from anyone younger, and we do not knowingly process a
          photograph of a child.
        </p>
        <p>
          If you believe a child has created an account or that a child&apos;s
          photograph has been uploaded, email{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {LEGAL.privacyEmail}
          </a>{" "}
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="security" title="13. Security and breaches">
        <p>
          Data is encrypted in transit and at rest. Access to production data is
          limited to those who need it. Sign-in and one-time-code endpoints are
          rate limited. Scan photos are never written to storage, which removes
          an entire class of exposure.
        </p>
        <p>
          No system is perfectly secure. If a breach occurs that is likely to
          result in a risk to your rights and freedoms, we will notify the
          relevant supervisory authority within 72 hours of becoming aware, and
          notify you directly without undue delay where the risk is high.
        </p>
      </LegalSection>

      <LegalSection id="regional" title="14. Regional notices">
        <LegalSubheading>California (CCPA and CPRA)</LegalSubheading>
        <p>
          The categories we collect, and why, are set out in sections 2 and 5.
          We <Term>do not sell or share</Term> personal information as those
          terms are defined by the CCPA, and we have not done so in the
          preceding twelve months. We do not use sensitive personal information
          for any purpose other than providing the service you asked for. You
          have the right to know, delete, correct, and to be free from
          discrimination for exercising those rights, all of which are available
          through Privacy settings.
        </p>
        <LegalSubheading>Illinois and Texas biometric laws</LegalSubheading>
        <p>
          Our written retention and destruction schedule is published in section
          9. Face images are destroyed as soon as the assessment is produced,
          and in every case within the periods stated there. We obtain written
          consent before processing and we do not sell, lease, or otherwise
          profit from biometric identifiers.
        </p>
        <LegalSubheading>UK and EEA</LegalSubheading>
        <p>
          Our legal bases are in section 5, transfer mechanisms in section 8,
          and your rights, including the right to complain to a supervisory
          authority, in section 10.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="15. Changes">
        <p>
          This is version {PRIVACY_POLICY.version}, last updated{" "}
          {PRIVACY_POLICY.updated}. If we make a material change we will raise
          the version and ask you to review it before you continue using the
          service. Minor clarifications are published with an updated date.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="16. Contact">
        <p>
          {LEGAL.entity}
          <br />
          {LEGAL.postalAddress}
          <br />
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-foreground underline underline-offset-4"
          >
            {LEGAL.privacyEmail}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  )
}

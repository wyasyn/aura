import { LandingPageContent } from '@/components/marketing/landing-page-content';
import { MarketingShell } from '@/components/layouts/marketing-shell';

export default function Home() {
  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10">
        <LandingPageContent />
      </div>
    </MarketingShell>
  );
}

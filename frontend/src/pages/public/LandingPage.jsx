import { useLandingTariffs } from '../../components/landing/useLandingTariffs';
import { LandingAboutVisionSection } from './LandingAboutVisionSection';
import { LandingCertificationSection } from './LandingCertificationSection';
import { LandingContactSection } from './LandingContactSection';
import { LandingFooter } from './LandingFooter';
import { LandingPageHeader, LandingPageHero } from './LandingPageHeaderHero';
import { LandingServicesSection } from './LandingServicesSection';
import { LandingUsageTimelineSection } from './LandingUsageTimelineSection';
import { LandingTariffSection } from './LandingTariffSection';

export function LandingPage({ onNavigate }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const tariffData = useLandingTariffs();

  return (
    <div className="min-h-screen bg-white">
      <LandingPageHeader onNavigate={onNavigate} scrollToSection={scrollToSection} />
      <LandingPageHero scrollToSection={scrollToSection} />
      <LandingAboutVisionSection />
      <LandingCertificationSection />
      <LandingServicesSection />
      <LandingUsageTimelineSection />
      <LandingTariffSection tariffData={tariffData} />
      <LandingContactSection />
      <LandingFooter scrollToSection={scrollToSection} onNavigate={onNavigate} />
    </div>
  );
}

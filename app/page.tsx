'use client'
import { AppShell } from "@/components/app-shell"
import { HeroSection } from "@/components/home/hero-section"
import { MetricsRow } from "@/components/home/metrics-row"
import { FeatureCards } from "@/components/home/feature-cards"
import { OrnamentalDivider } from "@/components/ornamental-divider"
import { useLang } from "@/lib/languageContext"

export default function HomePage() {
  const { t } = useLang()
  return (
    <AppShell>
      <div className="bg-gradient-to-r from-[#1C1638] via-[#0F0B1E] to-[#1C1638] py-4 border-b border-[#C9A84C]/20">
        <p className="text-center font-serif italic text-[#C9A84C] text-lg">
          &ldquo;वसुधैव कुटुम्बकम्&rdquo; — {t('quote_1').replace(/"/g, '')}
        </p>
      </div>
      <div className="p-4 lg:p-8 space-y-8 animate-fade-in">
        <HeroSection />
        <MetricsRow />
        <FeatureCards />
        <OrnamentalDivider />
        <div className="text-center py-8">
          <p className="font-serif italic text-[#C9A84C] text-lg">
            &ldquo;तमसो मा ज्योतिर्गमय&rdquo; — {t('quote_2').replace(/"/g, '')}
          </p>
        </div>
      </div>
    </AppShell>
  )
}
